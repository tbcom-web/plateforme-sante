// SYNCHRO RPPS → PROSPECTION (migration 0055, docs/prospection-rpps.md). Lancé chaque nuit par .github/workflows/synchro-rpps.yml.
// 1. Télécharge l'extraction publique PS_LibreAcces de l'Annuaire Santé (ANS, Licence Ouverte v2.0, zip d'environ 230 Mo mis à
//    jour chaque jour) et lit en flux le fichier PS_LibreAcces_Personne_activite, sans dépendance (zip lu à la main, zlib).
// 2. Garde les professions demandées (PROFESSIONS, codes TRE_G15 : 80 = pédicure-podologue), une ligne par situation d'exercice.
//    Nouvelle ligne → apparu_le = aujourd'hui (sauf à l'import initial) ; ligne absente du fichier → disparu_le.
// 3. Date l'installation : date de création de l'établissement (SIRET) à l'INSEE, via l'API Recherche d'entreprises
//    (recherche-entreprises.api.gouv.fr, gratuite, sans clé, 7 appels par seconde). Sans SIRET au RPPS : recherche par nom, code
//    postal et code NAF, gardée seulement si le nom correspond.
// Les adresses MSSanté ne sont jamais gardées (messagerie réservée aux échanges de santé, pas à la prospection).
//
// Certificat : le serveur de l'ANS présente l'autorité racine IGC-Santé, absente des magasins usuels → la lancer avec
//   NODE_EXTRA_CA_CERTS=scripts/certificats/igc-sante-racine.pem (vérification TLS conservée).
// Variables : SUPABASE_URL, SUPABASE_SECRET_KEY ; PROFESSIONS (défaut « 80 ») ; VERIF_MAX (défaut 20000 vérifications SIRET).
// Usage : node scripts/synchro-rpps.mjs [--fichier=chemin.zip] [--essai] [--sans-verif]
//   --essai : lit le fichier et affiche des comptes, sans rien écrire (pas besoin de Supabase).

import { createWriteStream, createReadStream, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';
import zlib from 'node:zlib';

const URL_EXTRACTION = 'https://service.annuaire.sante.fr/annuaire-sante-webservices/V300/services/extraction/PS_LibreAcces';
const JEU_DATA_GOUV = 'annuaire-sante-extractions-des-donnees-en-libre-acces-des-professionnels-intervenant-dans-le-systeme-de-sante-rpps';
const URL_ENTREPRISES ='https://recherche-entreprises.api.gouv.fr/search';
/** Code NAF attendu par profession (recherche par nom seulement) */
const NAF_PAR_PROFESSION = { 80: '86.90E', 70: '86.90E', 60: '86.90D', 50: '86.90D' };

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ESSAI = Boolean(args.essai);
const PROFESSIONS = new Set(String(process.env.PROFESSIONS || '80').split(',').map((s) => s.trim()).filter(Boolean));
const VERIF_MAX = Number(process.env.VERIF_MAX || 20000);
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CLE = process.env.SUPABASE_SECRET_KEY || '';
if (!ESSAI && (!SUPABASE_URL || !CLE)) {
  console.error('SUPABASE_URL et SUPABASE_SECRET_KEY sont nécessaires (ou --essai pour une lecture sans écriture).');
  process.exit(1);
}

const aujourdhui = new Date().toISOString().slice(0, 10);
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const propre = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------------------------------------------------
// 1. Téléchargement et lecture du zip
// ---------------------------------------------------------------------------------------------------------------------

async function telecharger(dossier) {
  const chemin = join(dossier, 'PS_LibreAcces.zip');
  for (let essai = 1; ; essai++) {
    const r = await fetch(URL_EXTRACTION);
    if (r.ok && r.body) {
      await pipeline(Readable.fromWeb(r.body), createWriteStream(chemin));
      const nom = /filename=([^;]+)/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'PS_LibreAcces.zip';
      return { chemin, nom };
    }
    // 429 : le serveur de l'ANS limite les téléchargements rapprochés → attentes croissantes (1, 2, 4, 8 minutes)
    if (essai >= 5 || ![429, 502, 503, 504].includes(r.status)) throw new Error(`Téléchargement de l'extraction : HTTP ${r.status}`);
    console.log(`Extraction : HTTP ${r.status}, nouvel essai dans ${2 ** (essai - 1)} min`);
    await attendre(60_000 * 2 ** (essai - 1));
  }
}

/** Entrée du zip dont le nom contient `motif` : position et taille des données compressées (zip classique, sans zip64) */
async function entreeZip(chemin, motif) {
  const f = await open(chemin, 'r');
  try {
    const { size } = await f.stat();
    const fin = Buffer.alloc(Math.min(size, 65_557));
    await f.read(fin, 0, fin.length, size - fin.length);
    const eocd = fin.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) throw new Error('Zip illisible (fin de répertoire introuvable)');
    const nb = fin.readUInt16LE(eocd + 10), tailleRep = fin.readUInt32LE(eocd + 12), debutRep = fin.readUInt32LE(eocd + 16);
    const rep = Buffer.alloc(tailleRep);
    await f.read(rep, 0, tailleRep, debutRep);
    const noms = [];
    for (let p = 0, i = 0; i < nb; i++) {
      const methode = rep.readUInt16LE(p + 10), compresse = rep.readUInt32LE(p + 20);
      const ln = rep.readUInt16LE(p + 28), le = rep.readUInt16LE(p + 30), lc = rep.readUInt16LE(p + 32), local = rep.readUInt32LE(p + 42);
      const nom = rep.toString('utf8', p + 46, p + 46 + ln);
      noms.push(nom);
      if (nom.includes(motif)) {
        if (compresse === 0xffffffff || local === 0xffffffff) throw new Error('Zip64 non pris en charge');
        const entete = Buffer.alloc(30);
        await f.read(entete, 0, 30, local);
        const debut = local + 30 + entete.readUInt16LE(26) + entete.readUInt16LE(28);
        return { nom, methode, debut, fin: debut + compresse - 1 };
      }
      p += 46 + ln + le + lc;
    }
    throw new Error(`Aucun fichier « ${motif} » dans le zip (contenu : ${noms.join(', ')})`);
  } finally {
    await f.close();
  }
}

/** Lignes du fichier, en flux. Encodage : UTF-8, sinon Windows-1252 (détecté sur le début du fichier). */
async function* lignes(chemin, entree) {
  const flux = () => {
    const brut = createReadStream(chemin, { start: entree.debut, end: entree.fin });
    return entree.methode === 8 ? brut.pipe(zlib.createInflateRaw()) : brut;
  };
  let debut = Buffer.alloc(0);
  for await (const morceau of flux()) { debut = Buffer.concat([debut, morceau]); if (debut.length > 200_000) break; }
  const coupe = debut.subarray(0, debut.lastIndexOf(0x0a) + 1);
  let encodage = 'utf8';
  try { new TextDecoder('utf-8', { fatal: true }).decode(coupe); } catch { encodage = 'latin1'; }
  const texte = flux();
  texte.setEncoding(encodage);
  for await (const l of createInterface({ input: texte, crlfDelay: Infinity })) yield l;
}

/** Copie data.gouv.fr du même fichier (déposée chaque jour par l'ANS, non compressée, environ 830 Mo, lue en flux) */
async function sourceDataGouv() {
  const r = await fetch(`https://www.data.gouv.fr/api/1/datasets/${JEU_DATA_GOUV}/`);
  if (!r.ok) throw new Error(`data.gouv.fr : HTTP ${r.status}`);
  const res = (await r.json()).resources?.find((x) => /personne-activite/i.test(`${x.title} ${x.url}`));
  if (!res) throw new Error('data.gouv.fr : fichier personne-activite introuvable');
  const f = await fetch(res.url);
  if (!f.ok || !f.body) throw new Error(`data.gouv.fr : HTTP ${f.status}`);
  const flux = Readable.fromWeb(f.body);
  flux.setEncoding('utf8');
  return { nom: `data.gouv.fr ${res.title} (${String(res.last_modified ?? '').slice(0, 10)})`, lignes: createInterface({ input: flux, crlfDelay: Infinity }) };
}

/** Source : --fichier=zip local, sinon data.gouv.fr, sinon le zip de l'ANS (limité en débit : HTTP 429 fréquents) */
async function ouvrirSource(dossier) {
  if (args.fichier && existsSync(String(args.fichier))) {
    const chemin = String(args.fichier);
    return { nom: chemin, lignes: lignes(chemin, await entreeZip(chemin, 'Personne_activite')) };
  }
  try {
    return await sourceDataGouv();
  } catch (e) {
    console.log(`${e.message} → extraction de l'ANS`);
  }
  const { chemin, nom } = await telecharger(dossier);
  return { nom, lignes: lignes(chemin, await entreeZip(chemin, 'Personne_activite')) };
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. Colonnes de PS_LibreAcces_Personne_activite (repérées par leur nom, l'ordre peut changer d'une version à l'autre)
// ---------------------------------------------------------------------------------------------------------------------

function colonnes(entete) {
  const noms = entete.split('|').map(normal);
  const col = (...debuts) => { for (const d of debuts) { const i = noms.findIndex((n) => n.startsWith(normal(d))); if (i >= 0) return i; } return -1; };
  const c = {
    rpps: col('Identifiant PP'),
    civilite: col("Libellé civilité d'exercice"),
    civilite2: col('Libellé civilité'),
    nom: col("Nom d'exercice"),
    prenom: col("Prénom d'exercice"),
    profCode: col('Code profession'),
    prof: col('Libellé profession'),
    mode: col('Libellé mode exercice'),
    siret: col('Numéro SIRET site'),
    siren: col('Numéro SIREN site'),
    raison: col('Raison sociale site'),
    enseigne: col('Enseigne commerciale site'),
    idStructure: col('Identifiant technique de la structure'),
    complement: col('Complément point géographique'),
    numero: col('Numéro Voie'),
    indice: col('Indice répétition voie'),
    typeVoie: col('Libellé type de voie'),
    voie: col('Libellé Voie'),
    cp: col('Code postal'),
    codeCommune: col('Code commune'),
    dep: col('Code Département'),
    commune: col('Libellé commune'),
    telephone: col('Téléphone'),
    email: col('Adresse e-mail'),
  };
  const manquantes = ['rpps', 'nom', 'profCode', 'cp'].filter((k) => c[k] < 0);
  if (manquantes.length) throw new Error(`Colonnes introuvables (${manquantes.join(', ')}). En-tête lu : ${entete}`);
  return c;
}

function departement(codeCommune, cp) {
  const cc = propre(codeCommune).toUpperCase();
  if (/^(97|98)/.test(cc)) return cc.slice(0, 3);
  if (/^2[AB]/.test(cc) || /^\d{2}/.test(cc)) return cc.slice(0, 2);
  const p = propre(cp);
  if (/^(97|98)/.test(p)) return p.slice(0, 3);
  if (/^20/.test(p)) return Number(p) < 20200 ? '2A' : '2B';
  return /^\d{2}/.test(p) ? p.slice(0, 2) : null;
}

function ligneVersPraticien(v, c) {
  const val = (i) => (i >= 0 ? propre(v[i]) : '');
  const rpps = val(c.rpps);
  if (!/^\d{11}$/.test(rpps)) return null;
  const siret = val(c.siret).replace(/\s/g, '');
  const adresse = propre([val(c.numero), val(c.indice), val(c.typeVoie), val(c.voie)].join(' '));
  const cp = val(c.cp);
  const lieu = siret || val(c.idStructure) || normal(`${cp}${adresse}`);
  const email = val(c.email).toLowerCase();
  return {
    cle: `${rpps}|${lieu}`.slice(0, 200),
    rpps,
    civilite: val(c.civilite) || val(c.civilite2) || null,
    nom: val(c.nom) || null,
    prenom: val(c.prenom) || null,
    profession_code: val(c.profCode) || null,
    profession: val(c.prof) || null,
    mode_exercice: val(c.mode) || null,
    siret: /^\d{14}$/.test(siret) ? siret : null,
    siren: /^\d{9}$/.test(val(c.siren)) ? val(c.siren) : null,
    raison_sociale: val(c.raison) || null,
    enseigne: val(c.enseigne) || null,
    adresse: propre([adresse, val(c.complement)].filter(Boolean).join(', ')) || null,
    code_postal: cp || null,
    commune: val(c.commune) || null,
    code_commune: val(c.codeCommune) || null,
    departement: /^(\d{2}|2[AB]|97\d)$/.test(val(c.dep)) ? val(c.dep) : departement(val(c.codeCommune), cp),
    telephone: val(c.telephone) || null,
    email: email && !/mssante\.fr$/.test(email) && email.includes('@') ? email : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. Supabase (REST, clé secrète)
// ---------------------------------------------------------------------------------------------------------------------

async function sb(chemin, { method = 'GET', body, prefer } = {}) {
  for (let essai = 1; ; essai++) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
      method,
      headers: { apikey: CLE, Authorization: `Bearer ${CLE}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.ok) return method === 'GET' ? r.json() : null;
    const texte = await r.text();
    if (essai < 3 && r.status >= 500) { await attendre(3000 * essai); continue; }
    throw new Error(`Supabase ${method} ${chemin.split('?')[0]} : HTTP ${r.status} ${texte.slice(0, 300)}`);
  }
}

async function lireTout(chemin) {
  const tout = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await sb(`${chemin}&order=cle&limit=1000&offset=${offset}`);
    tout.push(...page);
    if (page.length < 1000) return tout;
  }
}

async function ecrireParLots(lignesAEcrire, taille = 1000) {
  for (let i = 0; i < lignesAEcrire.length; i += taille) {
    await sb('prospection_praticiens?on_conflict=cle', { method: 'POST', body: lignesAEcrire.slice(i, i + taille), prefer: 'resolution=merge-duplicates,return=minimal' });
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. Date d'installation (API Recherche d'entreprises)
// ---------------------------------------------------------------------------------------------------------------------

let dernierAppel = 0;
async function entreprises(params) {
  const url = `${URL_ENTREPRISES}?${new URLSearchParams(params)}`;
  for (let essai = 1; essai <= 5; essai++) {
    const pause = dernierAppel + 160 - Date.now(); // ≈ 6 appels par seconde (limite : 7)
    if (pause > 0) await attendre(pause);
    dernierAppel = Date.now();
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await attendre(2000 * essai); continue; }
    return null;
  }
  return null;
}

const versResultat = (e, source, nomEntreprise) => ({
  siret_cree_le: e.date_creation || null,
  siret_source: source,
  siret_ferme: e.etat_administratif ? e.etat_administratif !== 'A' : null,
  entreprise_nom: nomEntreprise || null,
  latitude: e.latitude ? Number(e.latitude) : null,
  longitude: e.longitude ? Number(e.longitude) : null,
});

async function parSiret(siret) {
  const d = await entreprises({ q: siret, per_page: '1' });
  const r = d?.results?.[0];
  if (!r) return null;
  const e = (r.matching_etablissements ?? []).find((x) => x.siret === siret) ?? (r.siege?.siret === siret ? r.siege : null);
  return e ? versResultat(e, 'siret', r.nom_complet) : null;
}

async function parNom(p) {
  if (!p.nom || !p.code_postal) return null;
  const params = { q: `${p.prenom ?? ''} ${p.nom}`.trim(), code_postal: p.code_postal, per_page: '5' };
  const naf = NAF_PAR_PROFESSION[p.profession_code];
  if (naf) params.activite_principale = naf;
  const d = await entreprises(params);
  const nom = normal(p.nom), prenom = normal(String(p.prenom ?? '').split(/[\s-]/)[0]);
  // Une même personne peut avoir plusieurs entreprises (ancienne entreprise individuelle, nouvelle) : l'établissement ACTIF le plus
  // récent, toutes entreprises confondues, au code postal du RPPS
  const candidats = [];
  for (const r of d?.results ?? []) {
    const n = normal(`${r.nom_complet} ${(r.dirigeants ?? []).map((x) => `${x.nom ?? ''} ${x.prenoms ?? ''}`).join(' ')}`);
    if (!n.includes(nom) || (prenom && !n.includes(prenom))) continue;
    for (const e of [...(r.matching_etablissements ?? []), r.siege]) if (e && e.code_postal === p.code_postal) candidats.push({ e, nom: r.nom_complet });
  }
  const actif = (x) => (x.e.etat_administratif === 'A' ? 0 : 1);
  const c = candidats.sort((a, b) => actif(a) - actif(b) || String(b.e.date_creation).localeCompare(String(a.e.date_creation)))[0];
  return c ? versResultat(c.e, 'nom', c.nom) : null;
}

async function verifierInstallations() {
  // Supabase renvoie 1 000 lignes au plus par requête (réglage « Max rows ») : on relit la file par paquets. Une fiche traitée en
  // sort d'elle-même (verifie_le posé à maintenant), la boucle s'arrête donc quand la file est vide ou VERIF_MAX atteint.
  const ilYa30j = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const memo = new Map();
  let faites = 0, trouves = 0;
  while (faites < VERIF_MAX) {
    const paquet = await sb(
      `prospection_praticiens?select=cle,rpps,nom,prenom,siret,code_postal,profession_code&disparu_le=is.null`
      + `&or=(verifie_le.is.null,and(siret_cree_le.is.null,verifie_le.lt.${ilYa30j}))&order=apparu_le.desc.nullslast,cle&limit=${Math.min(1000, VERIF_MAX - faites)}`,
    );
    if (!paquet.length) break;
    trouves += await verifierPaquet(paquet, memo, faites);
    faites += paquet.length;
    console.log(`  ${faites} vérifiées, ${trouves} datées`);
  }
  console.log(`Dates d'installation : ${faites} fiche(s) vérifiée(s), ${trouves} datée(s)`);
  return faites;
}

async function verifierPaquet(aVerifier, memo, dejaFaites) {
  let lot = [], trouves = 0;
  for (const [i, p] of aVerifier.entries()) {
    let res = null;
    try {
      if (p.siret) {
        if (!memo.has(p.siret)) memo.set(p.siret, await parSiret(p.siret));
        res = memo.get(p.siret);
      } else res = await parNom(p);
    } catch (e) {
      console.log(`  vérification ${dejaFaites + i + 1} : ${e.message}`); // jamais de nom ni de RPPS dans les journaux (dépôt public)
    }
    if (res) trouves++;
    lot.push({ cle: p.cle, rpps: p.rpps, ...(res ?? { siret_cree_le: null, siret_source: null, siret_ferme: null, entreprise_nom: null, latitude: null, longitude: null }), verifie_le: new Date().toISOString() });
    if (lot.length >= 200 || i === aVerifier.length - 1) {
      await ecrireParLots(lot, 200);
      lot = [];
    }
  }
  return trouves;
}

// ---------------------------------------------------------------------------------------------------------------------
// Programme
// ---------------------------------------------------------------------------------------------------------------------

const dossier = mkdtempSync(join(tmpdir(), 'rpps-'));
try {
  const { lignes: source, nom: fichier } = await ouvrirSource(dossier);
  console.log(`Extraction : ${fichier}`);

  const praticiens = new Map();
  let c = null, total = 0;
  for await (const l of source) {
    if (!c) { c = colonnes(l); continue; }
    total++;
    const v = l.split('|');
    if (!PROFESSIONS.has(propre(v[c.profCode]))) continue;
    const p = ligneVersPraticien(v, c);
    if (p && !praticiens.has(p.cle)) praticiens.set(p.cle, p);
  }
  const liste = [...praticiens.values()];
  const parDep = {};
  for (const p of liste) parDep[p.departement ?? '?'] = (parDep[p.departement ?? '?'] ?? 0) + 1;
  console.log(`${total} lignes lues ; ${liste.length} situation(s) d'exercice gardée(s) (professions ${[...PROFESSIONS].join(', ')}), ${new Set(liste.map((p) => p.rpps)).size} praticien(s), ${liste.filter((p) => p.siret).length} avec SIRET`);

  if (ESSAI) {
    console.log('Départements les plus fournis :', Object.entries(parDep).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([d, n]) => `${d}:${n}`).join(' '));
    const lib = liste.filter((p) => /^lib/i.test(p.mode_exercice ?? ''));
    console.log(`Libéraux : ${lib.length} ; avec téléphone : ${lib.filter((p) => p.telephone).length} ; avec e-mail : ${lib.filter((p) => p.email).length} ; avec SIRET : ${lib.filter((p) => p.siret).length}`);
    console.log('Exemple :', liste[0]);
  } else {
    await enregistrer(liste, praticiens, fichier);
  }
} finally {
  rmSync(dossier, { recursive: true, force: true });
}

async function enregistrer(liste, praticiens, fichier) {
  const existants = await lireTout(`prospection_praticiens?select=cle,apparu_le,disparu_le,profession_code`);
  const deja = new Map(existants.map((e) => [e.cle, e]));
  const importInitial = existants.length === 0;
  let nouveaux = 0;
  const aEcrire = liste.map((p) => {
    const e = deja.get(p.cle);
    if (!e && !importInitial) nouveaux++;
    return { ...p, apparu_le: e ? e.apparu_le : importInitial ? null : aujourdhui, vu_le: aujourdhui, disparu_le: null };
  });
  await ecrireParLots(aEcrire);
  const disparus = existants.filter((e) => !praticiens.has(e.cle) && !e.disparu_le && PROFESSIONS.has(String(e.profession_code))).map((e) => e.cle);
  for (let i = 0; i < disparus.length; i += 100) {
    const liste100 = disparus.slice(i, i + 100).map((k) => `"${k.replace(/"/g, '')}"`).join(',');
    await sb(`prospection_praticiens?cle=in.(${encodeURIComponent(liste100)})`, { method: 'PATCH', body: { disparu_le: aujourdhui }, prefer: 'return=minimal' });
  }
  console.log(`${importInitial ? 'Import initial' : `${nouveaux} nouvelle(s) situation(s)`}, ${disparus.length} disparue(s)`);

  const verifies = args['sans-verif'] ? 0 : await verifierInstallations();
  await sb('prospection_synchros', {
    method: 'POST', prefer: 'return=minimal',
    body: { fichier, lignes: liste.length, nouveaux, disparus: disparus.length, verifies, message: importInitial ? 'import initial' : null },
  });
  console.log('Terminé.');
}
