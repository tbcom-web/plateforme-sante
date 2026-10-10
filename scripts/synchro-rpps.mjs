// SYNCHRO RPPS → PROSPECTION (migration 0055, docs/prospection-rpps.md). Lancé chaque nuit par .github/workflows/synchro-rpps.yml.
// 1. Télécharge l'extraction publique PS_LibreAcces de l'Annuaire Santé (ANS, Licence Ouverte v2.0, zip d'environ 230 Mo mis à
//    jour chaque jour) et lit en flux le fichier PS_LibreAcces_Personne_activite, sans dépendance (zip lu à la main, zlib).
// 2. Garde les professions demandées (PROFESSIONS, codes TRE_G15 : 80 = pédicure-podologue), une ligne par situation d'exercice.
//    Nouvelle ligne → apparu_le = aujourd'hui (sauf à l'import initial) ; ligne absente du fichier → disparu_le.
// 3. Date l'installation : date de création de l'établissement (SIRET) à l'INSEE, via l'API Recherche d'entreprises
//    (recherche-entreprises.api.gouv.fr, gratuite, sans clé, 7 appels par seconde). Sans SIRET au RPPS : recherche par nom, code
//    postal et code NAF, gardée seulement si le nom correspond.
// 4. Liens et scores (migration 0057) : rôle, secteur, clés de structure et d'adresse, autres professions à la même adresse,
//    diplômes complémentaires (fichier PS_LibreAcces_Dipl_AutExerc) et spécialités ; puis scores d'installation et de prospection
//    (packages/core/src/prospection-score.ts, importé tel quel : Node efface les types).
// 5. Actualités des cabinets (migration 0058) : arrivées, départs, nouveaux cabinets, reprises, déménagements, constatés d'une nuit
//    à l'autre (packages/core/src/prospection-evenements.ts) ; les reprises (collaborateur devenu titulaire) entrent dans le score.
// Les adresses MSSanté ne sont jamais gardées (messagerie réservée aux échanges de santé, pas à la prospection).
//
// Certificat : le serveur de l'ANS présente l'autorité racine IGC-Santé, absente des magasins usuels → la lancer avec
//   NODE_EXTRA_CA_CERTS=scripts/certificats/igc-sante-racine.pem (vérification TLS conservée).
// Variables : SUPABASE_URL, SUPABASE_SECRET_KEY ; PROFESSIONS (défaut « 80 ») ; VERIF_MAX (défaut 20000 vérifications SIRET).
// Facultatif : ANNUAIRE_SANTE_API_KEY (ou ESANTE_API_KEY) → date de modification des situations d'exercice (API FHIR, 0056).
// Usage : node scripts/synchro-rpps.mjs [--fichier=chemin.zip] [--essai [--ans]] [--sans-verif]
//   --essai : lit le fichier et affiche des comptes, sans rien écrire (pas besoin de Supabase) ; --ans : interroge aussi l'API ANS.

import { createWriteStream, createReadStream, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';
import zlib from 'node:zlib';
import { estEnseignement, scorerProspection, specialitesDepuisDiplomes } from '../packages/core/src/prospection-score.ts';
import { evenementsDuJour } from '../packages/core/src/prospection-evenements.ts';
import { calculerZones } from '../packages/core/src/prospection-zone.ts';

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

/** Fichiers lus : motif dans les ressources data.gouv.fr, motif dans le zip de l'ANS */
const FICHIERS = { activite: [/personne-activite/i, 'Personne_activite'], diplomes: [/dipl-autexerc/i, 'Dipl_AutExerc'] };

/** Copies data.gouv.fr des fichiers (déposées chaque jour par l'ANS, non compressées, lues en flux ; adresses changeantes) */
async function sourceDataGouv() {
  const r = await fetch(`https://www.data.gouv.fr/api/1/datasets/${JEU_DATA_GOUV}/`);
  if (!r.ok) throw new Error(`data.gouv.fr : HTTP ${r.status}`);
  const ressources = (await r.json()).resources ?? [];
  const trouver = (type) => ressources.find((x) => FICHIERS[type][0].test(`${x.title} ${x.url}`));
  const act = trouver('activite');
  if (!act) throw new Error('data.gouv.fr : fichier personne-activite introuvable');
  return {
    nom: `data.gouv.fr ${act.title} (${String(act.last_modified ?? '').slice(0, 10)})`,
    async lignes(type) {
      const res = trouver(type);
      if (!res) throw new Error(`data.gouv.fr : fichier ${type} introuvable`);
      const f = await fetch(res.url);
      if (!f.ok || !f.body) throw new Error(`data.gouv.fr : HTTP ${f.status}`);
      const flux = Readable.fromWeb(f.body);
      flux.setEncoding('utf8');
      return createInterface({ input: flux, crlfDelay: Infinity });
    },
  };
}

const sourceZip = (chemin, nom) => ({ nom, lignes: async (type) => lignes(chemin, await entreeZip(chemin, FICHIERS[type][1])) });

/** Source : --fichier=zip local, sinon data.gouv.fr, sinon le zip de l'ANS (limité en débit : HTTP 429 fréquents) */
async function ouvrirSource(dossier) {
  if (args.fichier && existsSync(String(args.fichier))) return sourceZip(String(args.fichier), String(args.fichier));
  try {
    return await sourceDataGouv();
  } catch (e) {
    console.log(`${e.message} → extraction de l'ANS`);
  }
  const { chemin, nom } = await telecharger(dossier);
  return sourceZip(chemin, nom);
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
    role: col('Libellé rôle'),
    secteur: col("Libellé secteur d'activité"),
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

/** Clé d'adresse : code postal + numéro + indice + voie, normalisés ; null sans voie */
function cleAdresse(v, c) {
  const val = (i) => (i >= 0 ? propre(v[i]) : '');
  return val(c.cp) && val(c.voie) ? normal(`${val(c.cp)} ${val(c.numero)} ${val(c.indice)} ${val(c.typeVoie)} ${val(c.voie)}`).slice(0, 160) : null;
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
    role: val(c.role) || null,
    secteur: val(c.secteur) || null,
    adresse_cle: cleAdresse(v, c),
    structure_cle: val(c.idStructure) || (/^\d{14}$/.test(siret) ? siret : null) || cleAdresse(v, c),
  };
}

/** Diplômes et titres par RPPS (PS_LibreAcces_Dipl_AutExerc, section « Diplômes et titres » d'annuaire.sante.fr), DE compris */
async function lireDiplomes(source, rppsVoulus) {
  const parRpps = new Map();
  let c = null;
  for await (const l of await source.lignes('diplomes')) {
    const v = l.split('|');
    if (!c) {
      const noms = v.map(normal);
      const col = (d) => noms.findIndex((n) => n.startsWith(normal(d)));
      c = { rpps: col('Identifiant PP'), type: col('Code type diplôme obtenu'), code: col('Code diplôme obtenu'), lib: col('Libellé diplôme obtenu'), aut: col('Libellé type autorisation'), disc: col('Libellé discipline autorisation') };
      if (c.rpps < 0 || c.lib < 0) throw new Error(`Diplômes : colonnes introuvables. En-tête lu : ${l}`);
      continue;
    }
    const rpps = propre(v[c.rpps]);
    if (!rppsVoulus.has(rpps)) continue;
    const type = propre(v[c.type]);
    // « Autorisation de plein exercice » : mention administrative, sans intérêt commercial
    const libelles = [propre(v[c.lib]), c.aut >= 0 ? propre(v[c.aut]) : '', c.disc >= 0 ? propre(v[c.disc]) : '']
      .filter((x) => x && !/plein exercice/i.test(x));
    const liste = parRpps.get(rpps) ?? [];
    for (const lib of libelles) if (!liste.some((d) => d.l === lib) && liste.length < 12) liste.push({ t: type, c: c.code >= 0 ? propre(v[c.code]) : '', l: lib });
    if (liste.length) parRpps.set(rpps, liste);
  }
  return parRpps;
}

const COLONNES_0057 = ['role', 'secteur', 'adresse_cle', 'structure_cle', 'autres_professions', 'diplomes', 'specialites'];
/** La migration 0057 est-elle passée ? Sinon on n'écrit pas ses colonnes et la synchro continue comme avant. */
async function avec0057() {
  try { await sb('prospection_praticiens?select=score_prospect&limit=1'); return true; } catch { return false; }
}
const sans0057 = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => !COLONNES_0057.includes(k)));

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

// Date du SIREN (création de l'entreprise : début de l'activité libérale) écrite si la migration 0059 est passée
let AVEC_SIREN = false;
const versResultat = (e, source, nomEntreprise, dateEntreprise) => ({
  siret_cree_le: e.date_creation || null,
  ...(AVEC_SIREN ? { siren_cree_le: dateEntreprise || null, ancien_cabinet: null, etablissements_ouverts: null } : {}),
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
  return e ? versResultat(e, 'siret', r.nom_complet, r.date_creation) : null;
}

/** Établissement d'ancrage (SIRET du RPPS, sinon établissement actif au code postal du RPPS) et historique de son entreprise */
function historiqueEntreprise(resultats, p) {
  const nom = normal(p.nom), prenom = normal(String(p.prenom ?? '').split(/[\s-]/)[0]);
  // Entreprises de la personne : nom et prénom (dirigeant ou nom de l'entreprise individuelle), ou SIRET du RPPS
  const siennes = [];
  for (const r of resultats ?? []) {
    const n = normal(`${r.nom_complet} ${(r.dirigeants ?? []).map((x) => `${x.nom ?? ''} ${x.prenoms ?? ''}`).join(' ')}`);
    const etabs = [...new Map([...(r.matching_etablissements ?? []), r.siege].filter(Boolean).map((e) => [e.siret, e])).values()];
    const parSiret = p.siret ? etabs.find((e) => e.siret === p.siret) : null;
    if (parSiret || (n.includes(nom) && (!prenom || n.includes(prenom)))) siennes.push({ r, etabs, parSiret });
  }
  // Ancrage : SIRET du RPPS, sinon l'établissement actif le plus récent au code postal du RPPS
  let ancre = null;
  for (const x of siennes) {
    const ici = x.parSiret ?? x.etabs.filter((e) => e.code_postal === p.code_postal && e.etat_administratif === 'A').sort((a, b) => String(b.date_creation).localeCompare(String(a.date_creation)))[0];
    if (ici && (!ancre || (x.parSiret && !ancre.parSiret) || String(ici.date_creation) > String(ancre.e.date_creation))) ancre = { e: ici, r: x.r, parSiret: Boolean(x.parSiret) };
  }
  if (!ancre) return null;
  // Même personne : entreprises ayant un établissement dans le même département que l'ancrage (homonymes d'autres régions écartés)
  const dep = (cp) => String(cp ?? '').slice(0, String(cp ?? '').startsWith('97') ? 3 : 2);
  const memePersonne = siennes.filter((x) => x.r === ancre.r || x.etabs.some((e) => dep(e.code_postal) === dep(ancre.e.code_postal)));
  const tous = memePersonne.flatMap((x) => x.etabs);
  const debut = memePersonne.map((x) => x.r.date_creation).filter(Boolean).sort()[0] ?? ancre.r.date_creation;
  const fermes = tous.filter((e) => e.etat_administratif !== 'A' && e.date_fermeture && e.siret !== ancre.e.siret).sort((a, b) => String(b.date_fermeture).localeCompare(String(a.date_fermeture)));
  const ancien = fermes[0];
  return {
    ...versResultat(ancre.e, ancre.parSiret ? 'siret' : 'nom', ancre.r.nom_complet, debut),
    ...(AVEC_SIREN ? {
      ancien_cabinet: ancien ? { adresse: ancien.adresse ?? null, code_postal: ancien.code_postal ?? null, commune: ancien.libelle_commune ?? null, ouvert: ancien.date_creation ?? null, ferme: ancien.date_fermeture } : null,
      etablissements_ouverts: new Set(tous.filter((e) => e.etat_administratif === 'A').map((e) => e.siret)).size || null,
    } : {}),
  };
}

/** Recherche par nom SANS filtre de ville : rend aussi les anciens cabinets fermés ailleurs (déménagements) */
async function parNomLarge(p) {
  if (!p.nom) return null;
  const params = { q: `${p.prenom ?? ''} ${p.nom}`.trim(), per_page: '10' };
  const naf = NAF_PAR_PROFESSION[p.profession_code];
  if (naf) params.activite_principale = naf;
  return historiqueEntreprise((await entreprises(params))?.results, p);
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
    for (const e of [...(r.matching_etablissements ?? []), r.siege]) if (e && e.code_postal === p.code_postal) candidats.push({ e, nom: r.nom_complet, date: r.date_creation });
  }
  const actif = (x) => (x.e.etat_administratif === 'A' ? 0 : 1);
  const c = candidats.sort((a, b) => actif(a) - actif(b) || String(b.e.date_creation).localeCompare(String(a.e.date_creation)))[0];
  return c ? versResultat(c.e, 'nom', c.nom, c.date) : null;
}

async function verifierInstallations() {
  // Supabase renvoie 1 000 lignes au plus par requête (réglage « Max rows ») : on relit la file par paquets. Une fiche traitée en
  // sort d'elle-même (verifie_le posé à maintenant), la boucle s'arrête donc quand la file est vide ou VERIF_MAX atteint.
  const ilYa30j = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const debutVerif = new Date().toISOString(); // une fiche re-vérifiée pendant ce passage ne revient pas dans la file
  const memo = new Map();
  let faites = 0, trouves = 0;
  while (faites < VERIF_MAX) {
    // File : jamais vérifiées, non datées depuis 30 jours, et (0059) datées avant la reprise de la date du SIREN
    const rattrapage = AVEC_SIREN ? ',and(siret_cree_le.not.is.null,siren_cree_le.is.null,verifie_le.lt.' + debutVerif + ')' : '';
    const paquet = await sb(
      `prospection_praticiens?select=cle,rpps,nom,prenom,siret,code_postal,profession_code&disparu_le=is.null`
      + `&or=(verifie_le.is.null,and(siret_cree_le.is.null,verifie_le.lt.${ilYa30j})${rattrapage})&order=apparu_le.desc.nullslast,cle&limit=${Math.min(1000, VERIF_MAX - faites)}`,
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
      // D'abord par nom sans ville (historique et déménagements), puis par SIRET ou par nom au code postal (homonymes nombreux)
      res = await parNomLarge(p);
      if (!res && p.siret) {
        if (!memo.has(p.siret)) memo.set(p.siret, await parSiret(p.siret));
        res = memo.get(p.siret);
      } else if (!res) res = await parNom(p);
    } catch (e) {
      console.log(`  vérification ${dejaFaites + i + 1} : ${e.message}`); // jamais de nom ni de RPPS dans les journaux (dépôt public)
    }
    if (res) trouves++;
    lot.push({ cle: p.cle, rpps: p.rpps, ...(res ?? { siret_cree_le: null, ...(AVEC_SIREN ? { siren_cree_le: null, ancien_cabinet: null, etablissements_ouverts: null } : {}), siret_source: null, siret_ferme: null, entreprise_nom: null, latitude: null, longitude: null }), verifie_le: new Date().toISOString() });
    if (lot.length >= 200 || i === aVerifier.length - 1) {
      await ecrireParLots(lot, 200);
      lot = [];
    }
  }
  return trouves;
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. Date de modification des situations d'exercice (API FHIR Annuaire Santé de l'ANS, migration 0056)
// ---------------------------------------------------------------------------------------------------------------------
// Practitioner?qualification-code=<profession>&_revinclude=PractitionerRole:practitioner : tous les praticiens de la profession
// avec leurs situations d'exercice, page par page (lien « next »). Pas de filtre _lastUpdated : il porterait sur la fiche du
// praticien, pas sur ses situations. 17 appels par seconde au plus par application.

const URL_FHIR = (process.env.ANNUAIRE_SANTE_URL || 'https://gateway.api.esante.gouv.fr/fhir/v2').replace(/\/$/, '');
const CLE_ANS = process.env.ANNUAIRE_SANTE_API_KEY || process.env.ESANTE_API_KEY || '';
const SYSTEME_G15 = 'https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante';

/** RPPS (11 chiffres) d'une ressource Practitioner : identifiant RPPS, ou IDNPS « 8 » + RPPS */
function rppsFhir(praticien) {
  const ids = (praticien.identifier ?? []).map((i) => String(i.value ?? ''));
  return ids.find((v) => /^\d{11}$/.test(v)) ?? ids.find((v) => /^8\d{11}$/.test(v))?.slice(1) ?? null;
}

async function fhir(url) {
  for (let essai = 1; essai <= 5; essai++) {
    const pause = dernierAppelAns + 80 - Date.now(); // ≈ 12 appels par seconde (limite : 17)
    if (pause > 0) await attendre(pause);
    dernierAppelAns = Date.now();
    const r = await fetch(url, { headers: { 'ESANTE-API-KEY': CLE_ANS, accept: 'application/fhir+json' } });
    if (r.ok) return r.json();
    if (r.status === 401 || r.status === 403) throw new Error(`API ANS : HTTP ${r.status} (clé refusée ou abonnement manquant)`);
    if (r.status === 429 || r.status >= 500) { await attendre(2000 * essai); continue; }
    throw new Error(`API ANS : HTTP ${r.status}`);
  }
  throw new Error('API ANS : trop d’échecs');
}
let dernierAppelAns = 0;

async function synchroAns() {
  if (!CLE_ANS) { console.log('API ANS : pas de clé (ANNUAIRE_SANTE_API_KEY), étape sautée'); return 0; }
  const parRpps = new Map(); // rpps → { praticien, situation, situations }
  const idVersRpps = new Map();
  const roles = [];
  for (const code of PROFESSIONS) {
    let url = `${URL_FHIR}/Practitioner?${new URLSearchParams({ 'qualification-code': `${SYSTEME_G15}|${code}`, _revinclude: 'PractitionerRole:practitioner', _count: '100' })}`;
    for (let page = 1; url; page++) {
      const b = await fhir(url);
      for (const { resource: r } of b.entry ?? []) {
        if (r?.resourceType === 'Practitioner') {
          const rpps = rppsFhir(r);
          if (!rpps) continue;
          idVersRpps.set(r.id, rpps);
          const e = parRpps.get(rpps) ?? { praticien: null, situation: null, situations: 0 };
          e.praticien = r.meta?.lastUpdated?.slice(0, 10) ?? e.praticien;
          parRpps.set(rpps, e);
        } else if (r?.resourceType === 'PractitionerRole' && r.active !== false) roles.push(r);
      }
      url = (b.link ?? []).find((l) => l.relation === 'next')?.url ?? null;
      if (page % 50 === 0) console.log(`  API ANS : ${page} pages, ${parRpps.size} praticiens`);
    }
  }
  for (const r of roles) {
    const rpps = idVersRpps.get(String(r.practitioner?.reference ?? '').split('/').pop());
    const e = rpps && parRpps.get(rpps);
    const d = r.meta?.lastUpdated?.slice(0, 10);
    if (!e || !d) continue;
    e.situations++;
    if (!e.situation || d > e.situation) e.situation = d;
  }
  // Mises à jour en masse (reprise de données par l'ANS) : un même jour pour plus de 10 % des praticiens → pas un signal
  const parJour = {};
  for (const e of parRpps.values()) if (e.situation) parJour[e.situation] = (parJour[e.situation] ?? 0) + 1;
  const masse = new Set(Object.entries(parJour).filter(([, n]) => n > parRpps.size * 0.1).map(([j]) => j));
  if (masse.size) console.log(`  API ANS : dates de mise à jour en masse écartées : ${[...masse].join(', ')}`);
  const lignesAns = [...parRpps].map(([rpps, e]) => ({
    rpps, situation_maj_le: e.situation && !masse.has(e.situation) ? e.situation : null, praticien_maj_le: e.praticien, situations: e.situations, vu_le: aujourdhui,
  }));
  console.log(`API ANS : ${parRpps.size} praticiens, ${roles.length} situations, ${lignesAns.filter((l) => l.situation_maj_le).length} datées`);
  if (ESSAI) {
    const recents = Object.entries(parJour).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 15);
    console.log('  Jours de modification les plus récents (jour : praticiens) :', recents.map(([j, n]) => `${j}:${n}`).join(' '));
    return parRpps.size;
  }
  for (let i = 0; i < lignesAns.length; i += 1000) {
    await sb('prospection_ans?on_conflict=rpps', { method: 'POST', body: lignesAns.slice(i, i + 1000), prefer: 'resolution=merge-duplicates,return=minimal' });
  }
  return parRpps.size;
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. Scores d'installation et de prospection (migration 0057, packages/core/src/prospection-score.ts)
// ---------------------------------------------------------------------------------------------------------------------

/** Centres et populations des communes et des arrondissements (API Géo de l'État, geo.api.gouv.fr) ; vide en cas d'échec */
async function lireCommunes() {
  const communes = new Map();
  for (const url of ['https://geo.api.gouv.fr/communes?fields=code,centre,population&format=json',
    'https://geo.api.gouv.fr/communes?type=arrondissement-municipal&fields=code,centre,population&format=json']) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      for (const c of await r.json()) {
        const [lon, lat] = c.centre?.coordinates ?? [];
        if (typeof lat === 'number') communes.set(c.code, { lat, lon, population: c.population ?? 0 });
      }
    } catch (e) {
      console.log(`API Géo : ${e.message} (argument de zone sauté)`);
      return new Map();
    }
  }
  return communes;
}

async function calculerScores(v0058) {
  const champs = (AVEC_SIREN ? 'siren_cree_le,ancien_cabinet,etablissements_ouverts,' : '') + 'cle,rpps,profession_code,apparu_le,disparu_le,siret_cree_le,siret_source,siret_ferme,situation_maj_le,role,secteur,mode_exercice,adresse_cle,code_postal,structure_cle,raison_sociale,enseigne,commune,code_commune,departement,nom,prenom,autres_professions,statut,telephone,email,specialites';
  const toutes = await lireTout(`prospection_liste?select=${champs}`);
  const ilYa2ans = new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10);
  const evenements = v0058 ? await sb(`prospection_evenements?select=type,cle,le,details&type=eq.role&le=gte.${ilYa2ans}&limit=1000`) : [];
  const communes = await lireCommunes();
  const parProfession = new Map();
  for (const l of toutes) parProfession.set(l.profession_code, [...(parProfession.get(l.profession_code) ?? []), l]);
  const aEcrire = [];
  for (const groupe of parProfession.values()) {
    const rppsDe = new Map(groupe.map((l) => [l.cle, l.rpps]));
    const zones = communes.size ? calculerZones(groupe, communes, aujourdhui) : undefined;
    for (const [cle, s] of scorerProspection(groupe, aujourdhui, evenements, zones)) {
      aEcrire.push({ cle, rpps: rppsDe.get(cle), score_installation: s.installation, score_prospect: s.prospect, raisons: s.raisons, score_le: aujourdhui });
    }
  }
  await ecrireParLots(aEcrire);
  console.log(`Scores : ${aEcrire.length} situations, ${aEcrire.filter((x) => x.score_installation >= 50).length} avec une installation probable (score ≥ 50)`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Programme
// ---------------------------------------------------------------------------------------------------------------------

const dossier = mkdtempSync(join(tmpdir(), 'rpps-'));
try {
  const source = await ouvrirSource(dossier);
  const fichier = source.nom;
  console.log(`Extraction : ${fichier}`);

  const praticiens = new Map();
  // Autres professions présentes à chaque adresse : adresse → { libellé de la profession → nombre de situations }
  const autresParAdresse = new Map();
  let c = null, total = 0;
  for await (const l of await source.lignes('activite')) {
    if (!c) { c = colonnes(l); continue; }
    total++;
    const v = l.split('|');
    const code = propre(v[c.profCode]);
    if (!PROFESSIONS.has(code)) {
      const a = cleAdresse(v, c);
      if (a) {
        const compte = autresParAdresse.get(a) ?? {};
        const lib = propre(v[c.prof]) || code;
        compte[lib] = (compte[lib] ?? 0) + 1;
        autresParAdresse.set(a, compte);
      }
      continue;
    }
    const p = ligneVersPraticien(v, c);
    if (p && !praticiens.has(p.cle)) praticiens.set(p.cle, p);
  }
  const diplomes = await lireDiplomes(source, new Set([...praticiens.values()].map((p) => p.rpps)));
  for (const p of praticiens.values()) {
    p.autres_professions = (p.adresse_cle && autresParAdresse.get(p.adresse_cle)) || null;
    p.diplomes = diplomes.get(p.rpps) ?? null;
    p.specialites = specialitesDepuisDiplomes((p.diplomes ?? []).filter((d) => d.t !== 'DE').map((d) => d.l));
  }
  autresParAdresse.clear();
  // Enseignants (institut de formation, CHU) : badge « enseignant » sur toutes les situations du praticien
  const enseignants = new Set([...praticiens.values()].filter(estEnseignement).map((p) => p.rpps));
  for (const p of praticiens.values()) if (enseignants.has(p.rpps)) p.specialites = [...p.specialites, 'enseignant'];
  const liste = [...praticiens.values()];
  const parDep = {};
  for (const p of liste) parDep[p.departement ?? '?'] = (parDep[p.departement ?? '?'] ?? 0) + 1;
  console.log(`${total} lignes lues ; ${liste.length} situation(s) d'exercice gardée(s) (professions ${[...PROFESSIONS].join(', ')}), ${new Set(liste.map((p) => p.rpps)).size} praticien(s), ${liste.filter((p) => p.siret).length} avec SIRET`);

  if (ESSAI) {
    console.log('Départements les plus fournis :', Object.entries(parDep).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([d, n]) => `${d}:${n}`).join(' '));
    const lib = liste.filter((p) => /^lib/i.test(p.mode_exercice ?? ''));
    console.log(`Libéraux : ${lib.length} ; avec téléphone : ${lib.filter((p) => p.telephone).length} ; avec e-mail : ${lib.filter((p) => p.email).length} ; avec SIRET : ${lib.filter((p) => p.siret).length}`);
    const parSpec = {}, roles = {}, structures = {};
    for (const p of lib) {
      for (const sp of p.specialites) parSpec[sp] = (parSpec[sp] ?? 0) + 1;
      roles[p.role ?? '?'] = (roles[p.role ?? '?'] ?? 0) + 1;
      if (p.structure_cle) structures[p.structure_cle] = (structures[p.structure_cle] ?? 0) + 1;
    }
    console.log(`Diplômes et titres : ${diplomes.size} praticiens, dont ${[...diplomes.values()].filter((l) => l.some((d) => d.t !== 'DE')).length} avec un titre en plus du DE ; spécialités (situations libérales) :`, parSpec);
    console.log('Rôles :', roles);
    console.log(`Adresse partagée avec une autre profession : ${lib.filter((p) => p.autres_professions).length} situations libérales`);
    console.log(`Structures avec plusieurs podologues : ${Object.values(structures).filter((n) => n > 1).length}`);
    console.log('Exemple :', lib.find((p) => p.diplomes && p.autres_professions) ?? liste[0]);
    if (args.ans) await synchroAns();
  } else {
    await enregistrer(liste, praticiens, fichier);
  }
} finally {
  rmSync(dossier, { recursive: true, force: true });
}

async function enregistrer(listeComplete, praticiens, fichier) {
  const v0057 = await avec0057();
  if (!v0057) console.log('Migration 0057 absente : rôles, liens, diplômes et scores non écrits');
  const v0058 = v0057 && (await sb('prospection_evenements?select=id&limit=1').then(() => true, () => false));
  AVEC_SIREN = v0057 && (await sb('prospection_praticiens?select=siren_cree_le&limit=1').then(() => true, () => false));
  if (v0057 && !AVEC_SIREN) console.log('Migration 0059 absente : date du SIREN non relevée');
  if (v0057 && !v0058) console.log('Migration 0058 absente : actualités des cabinets non calculées');
  const liste = v0057 ? listeComplete : listeComplete.map(sans0057);
  const existants = await lireTout(`prospection_praticiens?select=cle,apparu_le,disparu_le,profession_code${v0057 ? ',rpps,structure_cle,role,nom,prenom,commune,departement,enseigne,raison_sociale' : ''}`);
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

  // Actualités : seulement si la veille connaissait déjà les structures (pas au premier passage après 0057)
  if (v0058 && !importInitial && existants.some((e) => e.structure_cle)) {
    const etat = (p) => ({ cle: p.cle, rpps: p.rpps, structure_cle: p.structure_cle, role: p.role, nom: p.nom, prenom: p.prenom, commune: p.commune, departement: p.departement, cabinet: p.enseigne || p.raison_sociale || null });
    const avant = existants.filter((e) => !e.disparu_le && PROFESSIONS.has(String(e.profession_code))).map(etat);
    const evenements = evenementsDuJour(avant, listeComplete.map(etat), aujourdhui);
    for (let i = 0; i < evenements.length; i += 500) {
      await sb('prospection_evenements?on_conflict=le,type,cle', { method: 'POST', body: evenements.slice(i, i + 500), prefer: 'resolution=ignore-duplicates,return=minimal' });
    }
    const parType = evenements.reduce((o, e) => ({ ...o, [e.type]: (o[e.type] ?? 0) + 1 }), {});
    console.log(`Actualités : ${evenements.length} événement(s)`, parType);
  }

  // Étape facultative : sans clé ou sans la migration 0056, la synchro continue
  try { await synchroAns(); } catch (e) { console.log(`API ANS : ${e.message.slice(0, 200)} (étape sautée)`); }
  const verifies = args['sans-verif'] ? 0 : await verifierInstallations();
  if (v0057) await calculerScores(v0058);
  await sb('prospection_synchros', {
    method: 'POST', prefer: 'return=minimal',
    body: { fichier, lignes: liste.length, nouveaux, disparus: disparus.length, verifies, message: importInitial ? 'import initial' : null },
  });
  console.log('Terminé.');
}
