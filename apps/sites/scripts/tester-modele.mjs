// TESTEUR DE MODÈLES (décision de Paul du 2026-10-09 : « Ajouter un agent de test sur le modèle final pour vérifier que tout marche.
// Limiter au max l'humain. »). Docs : docs/testeur-modeles.md. Parties pures : packages/core/src/testeur-modeles.ts.
//
// Passe sur un FINALISTE de la chaîne des modèles (après le tournoi) : construit le site du modèle pour 3 jeux de données de
// démonstration (Sport · basket à 3 praticiens, données maximales ; Diabète · senior, cabinet seul, noms et villes longs ; Enfant,
// données minimales), dans un dossier temporaire, puis contrôle TOUTES les pages à 360, 375, 768, 1024 et 1440 px. Rend un
// ResultatTestModele (format commun de la chaîne, chaine-modeles-format.ts) + tickets, écrit dans retours/tests-modeles/<modele>-v<n>.json
// (sans donnée personnelle : jeux de démonstration fictifs), vignettes des zones à côté, captures dans le dossier de sortie.
//
// Usage (racine du dépôt) :
//   npm run tester:modele -- --modele <id> [--version n] [--profession podologue] [--profil sport-basket|diabete-senior|enfant-minimal]
//   npm run tester:modele -- --composition chemin.json [--version n]     (sans base : composition de recette, ou { id, version, composition, surcharges })
//   --mode check|recheck   (recheck : compare à la version précédente, --precedente <json> sinon retours/tests-modeles/<id>-v<n-1>.json)
//   --sortie <dossier>     (captures ; défaut : dossier temporaire du système)   --resultats <dossier> (défaut : retours/tests-modeles)
//   --sans-perf --sans-webkit --sans-agents --sans-charte   (étapes sautées : contrôle « non mesuré », jamais vert)
//   --echec-si-rouge       (code de sortie 1 si le verdict est rouge ; par défaut 0 : le résultat est toujours écrit)
// <id> : modèle intégré (proximite, tableau…), recette du studio (retours/recettes.json, ou table recettes avec SUPABASE_URL et
// SUPABASE_SECRET_KEY, CI seulement : la clé n'est jamais affichée).
// Une seule construction Astro à la fois (cache .astro partagé) : constructions en série, dossiers de sortie dédiés, nouvel essai en cas de collision.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { build as esbuild } from 'esbuild';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { DEPOT, resoudre, sortieAutorisee, sousDossier } from '../../../packages/core/scripts/chemins.mjs';

const debut = Date.now();
const racineSites = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------------------------------------------
const args = {};
for (let i = 2, v = process.argv; i < v.length; i++) {
  if (!v[i].startsWith('--')) continue;
  const s = v[i + 1];
  args[v[i].slice(2)] = s !== undefined && !s.startsWith('--') ? (i++, s) : true;
}
const journal = (m) => console.log(`[${((Date.now() - debut) / 1000).toFixed(0).padStart(3)} s] ${m}`);

// ---------------------------------------------------------------------------------------------------------------
// Core (TypeScript) assemblé par esbuild
// ---------------------------------------------------------------------------------------------------------------
async function chargerCore() {
  const sortie = join(tmpdir(), `testeur-core-${process.pid}.mjs`);
  await esbuild({
    stdin: {
      contents: `export * from '../../packages/core/src/testeur-modeles.ts';
export { clesImagesExclues, cleImage, estImageDemo, verifierPublicationRecette, normaliserComposition, MODELES_INTEGRES, photosIntegreesBanque, contexteScenario, habillerPourProfil, designDe, serialiserComposition, modeleIntegre } from '@plateforme/core';`,
      resolveDir: racineSites, loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'node', outfile: sortie, logLevel: 'silent', loader: { '.svg': 'text' },
  });
  const core = await import(pathToFileURL(sortie).href);
  rmSync(sortie, { force: true });
  return core;
}
const core = await chargerCore();
const S = core.SEUILS_TEST_MODELE;

// Fusion de la vérification visuelle de l'agent Claude (testeur-modeles) dans le résultat du script :
//   node apps/sites/scripts/tester-modele.mjs --fusionner <visuel.json> --resultat retours/tests-modeles/<id>-v<n>.json
// visuel.json : { controles: [...], tickets: [...] } (format de .claude/agents/testeur-modeles.md)
if (args.fusionner) {
  const cible = resoudre(String(args.resultat ?? ''));
  const script = core.lireResultatTesteur(JSON.parse(readFileSync(cible, 'utf8')));
  if (!script) throw new Error(`Résultat illisible : ${cible}`);
  const brut = JSON.parse(readFileSync(resoudre(String(args.fusionner)), 'utf8'));
  const visuel = core.lireResultatTesteur({ modele: script.modele, version: script.version, controles: brut.controles ?? [], tickets: brut.tickets ?? [] });
  const fusion = core.fusionnerResultats(script, visuel);
  writeFileSync(sortieAutorisee(cible), `${JSON.stringify(fusion, null, 1)}\n`);
  console.log(`Fusion : ${visuel.tickets.length} ticket(s) visuel(s) ; verdict ${fusion.verdict} (${cible})`);
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------------------------
// Modèle à tester
// ---------------------------------------------------------------------------------------------------------------
const lireJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
async function resoudreModele() {
  if (args.composition) {
    const brut = lireJson(resoudre(String(args.composition)));
    const enveloppe = brut && typeof brut === 'object' && brut.composition ? brut : { composition: brut };
    const id = String(args.modele && args.modele !== true ? args.modele : enveloppe.id ?? String(args.composition).split(/[\\/]/).pop().replace(/\.json$/, ''));
    return { id, nom: enveloppe.nom ?? id, type: 'recette', composition: enveloppe.composition, surcharges: enveloppe.surcharges ?? null, cssDeTest: typeof enveloppe.cssDeTest === 'string' ? enveloppe.cssDeTest.slice(0, 2000) : null, version: Number(args.version ?? enveloppe.version ?? 1), sujets: enveloppe.sujets ?? null };
  }
  const id = String(args.modele ?? '');
  if (!id || id === 'true') throw new Error('Préciser --modele <id> ou --composition <fichier.json>.');
  const version = Number(args.version ?? 1);
  const integres = Array.isArray(core.MODELES_INTEGRES) ? core.MODELES_INTEGRES.map((m) => m.id ?? m) : [];
  if (integres.includes(id)) return { id, nom: id, type: 'integre', version };
  const locales = existsSync(join(DEPOT, 'retours/recettes.json')) ? lireJson(join(DEPOT, 'retours/recettes.json')) : [];
  const locale = locales.find((r) => r.id === id);
  if (locale) return { id, nom: locale.nom, type: 'recette', composition: locale.composition, sujets: locale.sujets, version };
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (SUPABASE_URL && SUPABASE_SECRET_KEY && /^[0-9a-f-]{36}$/.test(id)) {
    // Fiche de la chaîne des modèles (0050) : composition de la version demandée, sujets du scénario de la fiche
    const lire = async (chemin) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, { headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` } });
      return r.ok ? r.json() : [];
    };
    const [fiche] = await lire(`modeles_fiches?id=eq.${id}&select=nom,profession,scenario,version_courante`);
    if (fiche) {
      const v = Number(args.version ?? fiche.version_courante ?? 1);
      const [ligne] = await lire(`modeles_versions?modele=eq.${id}&version=eq.${v}&select=composition`);
      if (!ligne) throw new Error(`Version ${v} introuvable pour le modèle ${id}.`);
      const sc = fiche.scenario ?? {};
      return { id, nom: fiche.nom, type: 'recette', composition: ligne.composition, sujets: [...(sc.principaux ?? []), ...(sc.secondaires ?? [])], version: v };
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/recettes?id=eq.${id}&select=id,nom,sujets,composition`, { headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` } });
    if (!r.ok) throw new Error(`Lecture de la recette impossible (Supabase ${r.status}).`);
    const [l] = await r.json();
    if (l) return { id, nom: l.nom, type: 'recette', composition: l.composition, sujets: l.sujets, version };
  }
  throw new Error(`Modèle introuvable : ${id} (ni modèle intégré, ni recette de retours/recettes.json${SUPABASE_URL ? ', ni table recettes' : ''}).`);
}
const modele = await resoudreModele();
if (!Number.isInteger(modele.version) || modele.version < 1) throw new Error('Version invalide (--version n, n ≥ 1).');
const profession = String(args.profession && args.profession !== true ? args.profession : 'podologue');
const mode = args.mode === 'recheck' ? 'recheck' : 'check';

// ---------------------------------------------------------------------------------------------------------------
// Jeux de données de démonstration (apps/sites/src/data/sites/demo-podologue-lyon.ts : données FICTIVES)
// ---------------------------------------------------------------------------------------------------------------
// 1. Jeux de la CHAÎNE (modèle = design sans images) : --jeux a,b ou champ « jeux » de retours/modeles-a-tester.json pour ce
//    modèle et cette version : un profil de démonstration par famille de thèmes compatibles (jeuxDuModele, chaine-design.ts) ; le
//    design est habillé des images du KIT de chaque profil (habillerPourProfil : photos du thème ou de l'activité du profil, jamais
//    d'une autre activité) ; forme des données tournante (maximales, noms longs, minimales : jeuxTesteurDeProfils).
// 2. Sinon, les 3 jeux historiques ci-dessous (recette avec ses propres photos, modèle intégré).
const aTester = (() => {
  const p = join(DEPOT, 'retours', 'modeles-a-tester.json');
  if (!existsSync(p)) return null;
  const l = lireJson(p);
  return (Array.isArray(l) ? l : []).find((x) => x.modele === modele.id && Number(x.version) === modele.version) ?? null;
})();
const idsJeux = args.jeux && args.jeux !== true ? String(args.jeux).split(',').map((x) => x.trim()).filter(Boolean) : Array.isArray(aTester?.jeux) ? aTester.jeux : null;
if (aTester?.composition && modele.type !== 'recette') Object.assign(modele, { type: 'recette', composition: aTester.composition });
const JEUX_PROFILS = idsJeux ? core.jeuxTesteurDeProfils(idsJeux, profession).map((j, i) => ({ ...j, profil: true, captures: i === 0 ? [375, 1440] : [375], axe: i === 0 ? [375, 1440] : [375] })) : [];
if (idsJeux && !JEUX_PROFILS.length) throw new Error('Aucun profil connu parmi les jeux : ' + idsJeux.join(', '));
const JEUX = JEUX_PROFILS.length ? JEUX_PROFILS : [
  { id: 'sport-basket', libelle: 'Sport · basket, 3 praticiens, données maximales', activites: ['basket'], env: { PRINCIPAUX: 'sport,ongles', SECONDAIRES: 'enfant,senior', ACTIVITE: 'basket', PRATICIENS: '3' }, captures: [375, 1440], axe: [375, 1440] },
  { id: 'diabete-senior', libelle: 'Diabète · senior, cabinet seul, noms et villes longs', env: { PRINCIPAUX: 'diabete,senior', SECONDAIRES: 'ongles', CAS: 'solo,noms-longs' }, captures: [375], axe: [375] },
  { id: 'enfant-minimal', libelle: 'Enfant, cabinet seul, données minimales', env: { PRINCIPAUX: 'enfant', SECONDAIRES: '', CAS: 'solo,minimal' }, captures: [375], axe: [375] },
].filter((j) => !args.profil || args.profil === true || j.id === args.profil || j.id.startsWith(String(args.profil)));
if (!JEUX.length) throw new Error(`Profil inconnu : ${args.profil} (sport-basket, diabete-senior, enfant-minimal).`);

const LARGEURS = [...S.largeurs];
/** Onglets en parallèle (--parallele n, défaut 6) */
const PARALLELE = Math.max(1, Math.min(12, Number(args.parallele) || 6));
const sortie = sortieAutorisee(args.sortie && args.sortie !== true ? String(args.sortie) : join(tmpdir(), 'testeur-modeles', `${modele.id}-v${modele.version}`));
const dossierResultats = sortieAutorisee(args.resultats && args.resultats !== true ? String(args.resultats) : join(DEPOT, 'retours', 'tests-modeles'));
const cheminJson = join(dossierResultats, core.cheminResultatTest(modele.id, modele.version).split('/').pop());
const baseVignettes = core.cheminResultatTest(modele.id, modele.version).split('/').pop().replace(/\.json$/, '');
mkdirSync(sortie, { recursive: true });
journal(`Modèle « ${modele.nom} » (${modele.type}, ${modele.id}) v${modele.version}, mode ${mode} ; ${JEUX.length} jeu(x) de données ; sortie ${sortie}`);

// Composition et surcharges écrites dans le dossier de sortie (lues par la démo : RECETTE, SURCHARGES)
const envModele = {};
if (modele.type === 'recette') {
  writeFileSync(join(sortie, 'composition.json'), JSON.stringify(modele.composition));
  envModele.RECETTE = join(sortie, 'composition.json');
} else envModele.MODELE = modele.id;
// Design habillé pour chaque profil : composition propre au jeu (RECETTE du jeu)
if (modele.type === 'recette') {
  const banque = core.photosIntegreesBanque();
  for (const j of JEUX.filter((x) => x.profil)) {
    const scenario = { principaux: j.principal ? [j.principal] : [], secondaires: j.secondaires, couleurs: [], soins: [] };
    const photos = core.photosDuKitProfil(banque, j, profession);
    const ctx = core.contexteScenario(scenario, { poids: null, photos, modele: core.modeleIntegre, modeTirage: 'favoris' });
    const design = core.normaliserComposition(core.designDe(modele.composition), ctx);
    const habille = design ? JSON.parse(core.serialiserComposition(core.habillerPourProfil(design, ctx, 1))) : { ...modele.composition };
    // Cas de test (surcharges d'une composition de test) : les photos explicitement posées restent
    if (modele.surcharges && Array.isArray(modele.composition.photos)) habille.photos = [...new Set([...(habille.photos ?? []), ...modele.composition.photos])];
    const fichier = join(sortie, `composition-${j.id}.json`);
    writeFileSync(fichier, JSON.stringify(habille));
    j.env = { ...j.env, RECETTE: fichier };
    j.photosKit = habille.photos ?? [];
  }
}
if (modele.surcharges) {
  writeFileSync(join(sortie, 'surcharges.json'), JSON.stringify(modele.surcharges));
  envModele.SURCHARGES = join(sortie, 'surcharges.json');
}

// ---------------------------------------------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------------------------------------------
const tickets = [];
const occurrences = new Map();
const mesures = {}; // mesures agrégées par contrôle
const nonMesures = new Set();
const ajouter = (controle, o) => {
  const t = core.creerTicket({ modele: modele.id, version: modele.version, controle, creeLe: new Date().toISOString(), ...o });
  const n = (occurrences.get(t.empreinte) ?? 0) + 1;
  occurrences.set(t.empreinte, n);
  if (o.jeu) { parJeu.push({ jeu: o.jeu, gravite: t.gravite }); jeuxDe.set(t.empreinte, new Set([...(jeuxDe.get(t.empreinte) ?? []), o.jeu])); }
  if (n === 1) tickets.push(t);
};
const parJeu = []; // { jeu, gravite } de chaque occurrence : verdict par jeu (le pire l'emporte)
const jeuxDe = new Map(); // empreinte → jeux où le défaut apparaît
const compter = (controle, cle, n = 1) => { mesures[controle] ??= {}; mesures[controle][cle] = (mesures[controle][cle] ?? 0) + n; };

// ---------------------------------------------------------------------------------------------------------------
// Construction (une à la fois)
// ---------------------------------------------------------------------------------------------------------------
/** Chemin passé en argument : entre guillemets sous Windows (spawn par le shell), tel quel ailleurs */
const q = (p) => (process.platform === 'win32' ? `"${p}"` : p);
const executer = (cmd, argv, o = {}) => new Promise((ok) => {
  const p = spawn(cmd, argv, { cwd: o.cwd ?? racineSites, env: { ...process.env, ...o.env }, shell: process.platform === 'win32' });
  let texte = '';
  p.stdout.on('data', (d) => { texte += d; });
  p.stderr.on('data', (d) => { texte += d; });
  p.on('close', (code) => ok({ code, texte }));
});

async function construire(jeu) {
  const dist = sousDossier(sortie, 'jeux', jeu.id, 'dist');
  rmSync(dist, { recursive: true, force: true });
  const env = { SITE_ID: 'demo-podologue-lyon', CONTROLE_INDEXABLE: '1', PLAN_OSM: 'non', ...envModele, ...jeu.env };
  for (let essai = 1; essai <= 3; essai++) {
    const t = Date.now();
    const r = await executer('npx', ['astro', 'build', '--outDir', q(dist)], { env });
    if (r.code === 0 && existsSync(join(dist, 'index.html'))) {
      journal(`Construction ${jeu.id} : ${((Date.now() - t) / 1000).toFixed(0)} s`);
      dureesJeux[jeu.id] = (dureesJeux[jeu.id] ?? 0) + (Date.now() - t);
      return dist;
    }
    journal(`Construction ${jeu.id} : échec (essai ${essai})`);
    if (essai === 3) {
      writeFileSync(join(sortie, `construction-${jeu.id}.log`), r.texte);
      const ligne = r.texte.split(/\r?\n/).reverse().find((l) => /error|erreur/i.test(l)) ?? 'voir le journal';
      ajouter('construction', { chemin: '/', jeu: jeu.id, gravite: 'bloquant', commentaire: `La construction du site échoue (${jeu.libelle}) : ${ligne.trim().slice(0, 200)}`, suggestion: `Lire ${join(sortie, `construction-${jeu.id}.log`)} et corriger la composition.` });
      return null;
    }
    await new Promise((ok) => setTimeout(ok, 4000 * essai)); // collision du cache .astro partagé
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Serveur statique (compression gzip comme en ligne)
// ---------------------------------------------------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const COMPRESSES = /\.(html|css|js|mjs|svg|json|xml|txt|md|webmanifest)$/;
function servir(dossier) {
  const cache = new Map();
  const serveur = createServer(async (req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const base = normalize(join(dossier, chemin));
    if (!base.startsWith(normalize(dossier))) { res.writeHead(403).end(); return; }
    const candidats = chemin.endsWith('/') ? [join(base, 'index.html')] : [base, `${base}.html`, join(base, 'index.html')];
    for (const c of candidats) {
      if ((await stat(c).catch(() => null))?.isFile()) {
        let corps = await readFile(c);
        const enTetes = { 'content-type': TYPES[extname(c)] ?? 'application/octet-stream', 'cache-control': 'no-store' };
        if (COMPRESSES.test(c) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
          if (!cache.has(c)) cache.set(c, gzipSync(corps));
          corps = cache.get(c);
          enTetes['content-encoding'] = 'gzip';
        }
        res.writeHead(200, enTetes).end(corps);
        return;
      }
    }
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(await readFile(join(dossier, '404.html')).catch(() => 'Introuvable'));
  });
  return new Promise((ok) => serveur.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${serveur.address().port}`, fermer: () => serveur.close() })));
}

// ---------------------------------------------------------------------------------------------------------------
// Fichiers du site
// ---------------------------------------------------------------------------------------------------------------
const fichiersDe = (d, base = d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiersDe(join(d, e.name), base) : [relative(base, join(d, e.name)).replaceAll('\\', '/')]));
const pagesDu = (fichiers) =>
  // rdv.html : repli local de la redirection /rdv (fonction Cloudflare en ligne), jamais une page du site
  fichiers.filter((f) => f.endsWith('.html') && !/^(modeles|dessins)\//.test(f) && !['ambiances.html', 'rdv.html'].includes(f))
    .map((f) => (f === 'index.html' ? '/' : `/${f.replace(/\.html$/, '').replace(/\/index$/, '')}`))
    .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
const fichierDePage = (dist, chemin) => [join(dist, chemin === '/' ? 'index.html' : `${chemin.slice(1)}.html`), join(dist, chemin.slice(1), 'index.html')].find((f) => existsSync(f));

// Retours de Paul (exportés de Supabase) : éléments ≤ 2 ★, retirés, à retravailler ; statuts de revue
const lignesRetours = [];
for (const f of ['assets-notes.json', 'illustrations-statuts.json']) {
  const p = join(DEPOT, 'retours', f);
  if (existsSync(p)) lignesRetours.push(...lireJson(p));
}
const exclues = core.clesImagesExclues(lignesRetours);
const statuts = Object.fromEntries(lignesRetours.filter((l) => l.statut && l.cle).map((l) => [l.cle, l.statut]));
// Image refusée : BLOQUANTE si elle vient du modèle (photos de la composition, image posée par les surcharges du cas de test) ;
// MAJEURE si elle vient du contenu du jeu de démonstration ou d'une banque partagée (défaut de la plateforme, signalé sans
// imputer le modèle).
const imagesDuModele = new Set([...(modele.composition?.photos ?? []), ...Object.values(modele.surcharges ?? {}).filter((v) => typeof v === 'string' && v.startsWith('/'))].map((u) => core.cleImage(u)).filter(Boolean));
const imageRefusee = (cle, o) => imagesDuModele.has(cle)
  ? { ...o, gravite: 'bloquant', cle: `images|exclue|${cle}`, commentaire: `Image refusée (notée ≤ 2 ★, retirée ou à retravailler) : ${cle}`, suggestion: 'Remplacer par une image validée (4-5 ★).' }
  : { ...o, gravite: 'majeur', cle: `images|exclue|${cle}`, commentaire: `Image refusée (≤ 2 ★, retirée ou à retravailler) venue du contenu de démonstration ou d’une banque partagée, hors modèle : ${cle}`, suggestion: 'Retirer l’image de la banque ou du contenu partagé (défaut de la plateforme, pas du modèle).' };
const cleRendu = (src) => {
  try {
    const u = new URL(src, 'http://local').pathname.replace(/-(\d{3,4})\.(webp|jpe?g|png|avif)$/, '.$2');
    return core.cleImage(u);
  } catch { return null; }
};

// ---------------------------------------------------------------------------------------------------------------
// Contrôles statiques (dist) : liens et ancres, SEO, poids et provenance des images
// ---------------------------------------------------------------------------------------------------------------
const extraire = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const decodeHtml = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function controlesStatiques(jeu, dist) {
  const fichiers = fichiersDe(dist);
  // Pages de redirection (meta refresh, ex. /a-propos → /le-cabinet) : ni contrôlées ni comptées ; un lien vers elles reste valide
  const pages = pagesDu(fichiers).filter((c) => !/http-equiv="refresh"/i.test(readFileSync(fichierDePage(dist, c), 'utf8').slice(0, 3000)));
  const ensemble = new Set(fichiers);
  const lus = pages.map((chemin) => ({ chemin, html: readFileSync(fichierDePage(dist, chemin), 'utf8') }));
  // Liens et ancres
  const casses = core.liensCasses(lus.map(({ chemin, html }) => ({ chemin, liens: extraire(html, /<a\b[^>]*?\shref="([^"]*)"/g).map(decodeHtml), ids: extraire(html, /\sid="([^"]+)"/g) })), ensemble);
  compter('liens', 'liens', lus.reduce((n, p) => n + extraire(p.html, /<a\b[^>]*?\shref="([^"]*)"/g).length, 0));
  for (const c of casses) {
    compter('liens', c.raison);
    ajouter('liens', {
      chemin: c.page, jeu: jeu.id, gravite: c.raison === 'page' ? 'bloquant' : 'majeur', element: `a[href="${c.href}"]`, cle: `liens|${c.href}|${c.raison}`,
      commentaire: c.raison === 'page' ? `Lien vers une page qui n’existe pas : ${c.href}` : `Ancre introuvable : ${c.href}`,
      suggestion: c.raison === 'page' ? 'Corriger l’adresse du lien ou retirer le lien.' : 'Donner l’identifiant visé à la section, ou corriger l’ancre.',
    });
  }
  // SEO
  const titres = new Map();
  for (const { chemin, html } of lus) {
    const un = (re) => decodeHtml((html.match(re)?.[1] ?? '').trim());
    const meta = {
      title: un(/<title>([^<]*)<\/title>/), description: un(/<meta name="description" content="([^"]*)"/), canonical: un(/<link rel="canonical" href="([^"]*)"/),
      robots: un(/<meta name="robots" content="([^"]*)"/), lang: un(/<html[^>]*\slang="([^"]*)"/), h1: (html.match(/<h1[\s>]/g) ?? []).length,
      jsonld: extraire(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    };
    compter('seo', 'pages');
    for (const d of core.defautsSeo(meta, { erreur404: chemin === '/404' })) {
      ajouter('seo', { chemin, jeu: jeu.id, gravite: d.gravite, commentaire: d.texte, suggestion: d.suggestion, element: 'head', cle: `seo|${chemin}|${d.texte.replace(/\d+/g, 'n')}` });
    }
    if (meta.title && chemin !== '/404') titres.set(meta.title, [...(titres.get(meta.title) ?? []), chemin]);
  }
  for (const [titre, chemins] of titres) if (chemins.length > 1) ajouter('seo', { chemin: chemins[1], jeu: jeu.id, gravite: 'majeur', commentaire: `Title identique sur ${chemins.length} pages : « ${titre} » (${chemins.join(', ')})`, suggestion: 'Chaque page a son propre titre.', cle: `seo|doublon|${titre}` });
  // Images : poids des fichiers référencés, images démo, images refusées
  const vues = new Set();
  for (const { chemin, html } of lus) {
    const srcs = [...extraire(html, /<img\b[^>]*?\ssrc="([^"]+)"/g), ...extraire(html, /\ssrcset="([^"]+)"/g).flatMap((s) => s.split(',').map((x) => x.trim().split(/\s+/)[0]))];
    for (const src of srcs) {
      if (vues.has(`${chemin}|${src}`)) continue;
      vues.add(`${chemin}|${src}`);
      if (core.estImageDemo(src)) ajouter('images', { chemin, jeu: jeu.id, gravite: 'bloquant', element: `img[src="${src}"]`, cle: `images|demo|${src}`, commentaire: `Image de démonstration (cabinet ou praticien fictif) sur le site : ${src}`, suggestion: 'Retirer l’image démo : jamais sur un site praticien (kit-demo.ts).' });
      const cle = cleRendu(src);
      if (cle && (exclues.has(cle) || exclues.has(src))) ajouter('images', imageRefusee(cle, { chemin, jeu: jeu.id, element: `img[src="${src}"]` }));
      if (src.startsWith('/') && !src.startsWith('//')) {
        const f = join(dist, decodeURIComponent(src.split('?')[0]));
        const taille = existsSync(f) ? statSync(f).size : null;
        if (taille == null) continue; // image absente : contrôle du rendu (non chargée)
        compter('images', 'fichiers');
        if (taille > S.poidsImage) ajouter('images', { chemin, jeu: jeu.id, gravite: 'majeur', element: `img[src="${src}"]`, cle: `images|poids|${src}`, mesure: `${Math.round(taille / 1024)} Ko`, seuil: `≤ ${Math.round(S.poidsImage / 1024)} Ko`, commentaire: `Image lourde : ${src} (${Math.round(taille / 1024)} Ko)`, suggestion: 'Recompresser (WebP qualité 70) ou fournir des variantes plus petites (srcset).' });
      }
    }
  }
  // Aucun visuel d'une autre activité dans un jeu d'activité (photos, dessins rendus ; photos de la composition du jeu)
  if (jeu.activites?.length) {
    const visuels = [];
    for (const { chemin, html } of lus) {
      for (const u of [...extraire(html, /<img\b[^>]*?\ssrc="([^"]+)"/g), ...extraire(html, /\shref="(\/dessins\/[^"#]+)/g), ...extraire(html, /url\((\/photos\/[^)]+)\)/g)]) visuels.push({ chemin, u });
    }
    for (const u of jeu.photosKit ?? []) visuels.push({ chemin: '/', u });
    compter('activites', 'visuels', visuels.length);
    // Image d'un ARTICLE (contenu, ex. « Préparer ses pieds avant une course ») : elle suit le sujet de l'article, pas le kit du profil
    // → majeur, signalé hors modèle ; tout autre visuel (kit, composition, pages du site) → bloquant
    const kit = new Set(jeu.photosKit ?? []);
    const imagesArticles = new Set(lus.filter((p) => /^\/actualites\/./.test(p.chemin)).flatMap((p) => extraire(p.html.replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/g, ''), /<img\b[^>]*?\ssrc="([^"]+)"/g)));
    const vus = new Set();
    for (const { chemin, u } of visuels) {
      if (vus.has(u)) continue;
      vus.add(u);
      const [autre] = core.visuelsAutreActivite([u], jeu.activites, profession);
      if (autre && imagesArticles.has(u) && !kit.has(u)) ajouter('activites', { chemin, jeu: jeu.id, gravite: 'majeur', element: u, cle: `activites|${jeu.id}|${u}`, commentaire: `Image d’article d’une autre activité (${autre.activites.join(', ')}) dans le jeu « ${jeu.libelle} » : ${u} (contenu de l’article, hors modèle)`, suggestion: 'Contenu de démonstration : choisir des articles de l’activité du profil, ou accepter (l’image suit le sujet de l’article).' });
      else if (autre) ajouter('activites', { chemin, jeu: jeu.id, gravite: 'bloquant', element: u, cle: `activites|${jeu.id}|${u}`, commentaire: `Visuel d’une autre activité (${autre.activites.join(', ')}) dans le jeu « ${jeu.libelle} » : ${u}`, suggestion: `Ne montrer que les visuels de l’activité du profil (${jeu.activites.join(', ')}) ou du thème sans activité (kitDuProfil).` });
    }
  }
  return { pages, fichiers };
}

// Composition : éléments à valider, refusés, photos non importées (publication-recettes.ts)
if (modele.type === 'recette') {
  const v = core.verifierPublicationRecette({ composition: core.normaliserComposition(modele.composition, { sujets: modele.sujets ?? ['sport'], principaux: 1 }) ?? modele.composition, sujets: modele.sujets ?? [] }, { statuts, exclues, valides: new Set() });
  for (const b of v.bloquants) {
    ajouter('images', { chemin: '/', gravite: 'bloquant', element: b.cle, cle: `composition|${b.cle}`, commentaire: `Élément de la composition : ${b.texte} (${b.cle})`, suggestion: b.raison === 'a-valider' ? 'Faire valider l’élément par Paul, ou le remplacer.' : 'Remplacer l’élément par un élément validé.' });
  }
  compter('images', 'elements-composition', v.verifies);
}

// ---------------------------------------------------------------------------------------------------------------
// Contrôles dans le navigateur (fonction exécutée dans la page)
// ---------------------------------------------------------------------------------------------------------------
function analyserPage({ contraste, cibles, images }) {
  const largeur = document.documentElement.clientWidth;
  const sy = window.scrollY;
  const masque = (e) => e.closest('script, style, noscript, template, [aria-hidden="true"], [hidden], dialog:not([open]), svg') !== null || (e.closest('details:not([open])') !== null && !e.closest('summary'));
  const visible = (e) => {
    // checkVisibility : contenu d'un <details> fermé (content-visibility: hidden), display, visibility
    if (e.checkVisibility && !e.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) return false;
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || s.display === 'none') return false;
    let op = 1;
    for (let x = e; x && x !== document.documentElement; x = x.parentElement) op *= Number(getComputedStyle(x).opacity);
    return op > 0.05;
  };
  const fixe = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
  const selecteur = (e) => {
    const sec = e.closest('[data-section], section[id], header, footer, nav, main');
    const local = `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${[...e.classList].slice(0, 2).map((c) => `.${c}`).join('')}`;
    const tete = sec && sec !== e ? (sec.dataset?.section ? `[data-section=${sec.dataset.section}]` : sec.id ? `${sec.tagName.toLowerCase()}#${sec.id}` : sec.tagName.toLowerCase()) : '';
    return `${tete ? `${tete} ` : ''}${local}`.slice(0, 160);
  };
  const extrait = (e) => (e.textContent || e.getAttribute('aria-label') || e.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const boite = (r) => ({ x: r.left, y: r.top + sy, l: r.width, h: r.height });
  // 1. Débordement horizontal
  const deborde = document.documentElement.scrollWidth > largeur + 1;
  const fautifs = [];
  if (deborde) {
    for (const e of document.querySelectorAll('body *')) {
      const b = e.getBoundingClientRect();
      if (b.width && b.right > largeur + 1 && !fixe(e) && !masque(e) && ![...e.children].some((c) => c.getBoundingClientRect().right > largeur + 1)) fautifs.push({ selecteur: selecteur(e), texte: extrait(e), boite: boite(b), droite: Math.round(b.right) });
      if (fautifs.length > 5) break;
    }
  }
  // 2. Mots coupés : mots composés, métiers, noms et villes longs rendus sur deux lignes
  const coupes = [];
  const marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && !masque(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const textes = [];
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    if (!n.data.trim()) continue;
    textes.push(n);
    for (const m of n.data.matchAll(/[\p{L}][\p{L}’'‑-]{9,}|\p{L}+(?:[-‑]\p{L}+)+/gu)) {
      const plage = document.createRange();
      plage.setStart(n, m.index);
      plage.setEnd(n, m.index + m[0].length);
      const lignes = [...plage.getClientRects()].filter((b) => b.width > 0 && b.height > 0);
      if (lignes.length < 2) continue;
      const hauts = lignes.map((b) => b.top);
      if (Math.max(...hauts) - Math.min(...hauts) > Math.min(...lignes.map((b) => b.height)) / 2) {
        const r = plage.getBoundingClientRect();
        coupes.push({ mot: m[0], selecteur: selecteur(n.parentElement), boite: boite(r) });
      }
    }
  }
  // 3. Blocs de texte et interactifs (chevauchements) ; 4. textes (contraste) ; 5. cibles tactiles
  const INTERACTIFS = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]';
  const candidats = [];
  const index = new Map();
  for (const e of document.querySelectorAll('body *')) {
    if (masque(e) || fixe(e)) continue;
    { const r0 = e.getBoundingClientRect(); if (r0.bottom + sy <= 0 || r0.right <= 0) continue; } // hors page (lien d'évitement)
    const interactif = e.matches(INTERACTIFS);
    const propre = [...e.childNodes].some((c) => c.nodeType === 3 && c.data.trim().length > 1);
    if (!interactif && !propre) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || !visible(e)) continue;
    index.set(e, candidats.length);
    candidats.push({ e, r, interactif, propre });
    if (candidats.length > 2500) break;
  }
  const boites = candidats.map(({ e, r, interactif }, id) => {
    const ancetres = [];
    for (let x = e.parentElement; x; x = x.parentElement) if (index.has(x)) ancetres.push(index.get(x));
    let rr = r;
    let lignes = null;
    if (!interactif) {
      // boîte serrée du texte propre (un bloc pleine largeur ne recouvre pas son voisin flottant)
      const rects = [...e.childNodes].filter((c) => c.nodeType === 3 && c.data.trim()).flatMap((c) => { const p = document.createRange(); p.selectNodeContents(c); return [...p.getClientRects()]; }).filter((b) => b.width > 0);
      if (rects.length) { const g = Math.min(...rects.map((b) => b.left)), h = Math.min(...rects.map((b) => b.top)); rr = { left: g, top: h, width: Math.max(...rects.map((b) => b.right)) - g, height: Math.max(...rects.map((b) => b.bottom)) - h }; }
      // Boîtes ligne par ligne (un texte en ligne sur deux lignes ne « recouvre » pas son voisin), sans l'interlignage interne des glyphes
      if (rects.length) lignes = rects.slice(0, 40).map((b) => ({ x: b.left, y: b.top + sy + b.height * 0.15, l: b.width, h: b.height * 0.7 }));
    }
    // Lien ou bouton en ligne sur plusieurs lignes : ses boîtes ligne par ligne
    if (interactif && getComputedStyle(e).display === 'inline') { const rs = [...e.getClientRects()].filter((b) => b.width > 0); if (rs.length > 1) lignes = rs.slice(0, 20).map((b) => ({ x: b.left, y: b.top + sy + b.height * 0.15, l: b.width, h: b.height * 0.7 })); }
    return { id, ...boite(rr), ...(lignes ? { lignes } : {}), type: interactif ? 'interactif' : 'texte', ancetres, libelle: `${selecteur(e)} « ${extrait(e).slice(0, 30)} »` };
  });
  const elementsTexte = [];
  if (contraste) {
    for (const { e, r, propre } of candidats) {
      if (!propre) continue;
      const s = getComputedStyle(e);
      if (s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text') continue;
      const m = s.color.match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?/);
      if (!m) continue;
      let op = 1;
      for (let x = e; x && x !== document.documentElement; x = x.parentElement) op *= Number(getComputedStyle(x).opacity);
      const rects = [...e.childNodes].filter((c) => c.nodeType === 3 && c.data.trim()).flatMap((c) => { const p = document.createRange(); p.selectNodeContents(c); return [...p.getClientRects()]; }).filter((b) => b.width > 0);
      const b = rects.length ? (() => { const g = Math.min(...rects.map((q) => q.left)), h = Math.min(...rects.map((q) => q.top)); return { left: g, top: h, width: Math.max(...rects.map((q) => q.right)) - g, height: Math.max(...rects.map((q) => q.bottom)) - h }; })() : r;
      elementsTexte.push({ selecteur: selecteur(e), texte: extrait(e), boite: boite(b), couleur: [+m[1], +m[2], +m[3]], alpha: (m[4] === undefined ? 1 : +m[4]) * op, taille: parseFloat(s.fontSize), graisse: Number(s.fontWeight) || 400 });
      if (elementsTexte.length > 700) break;
    }
  }
  const zonesFixes = [...document.querySelectorAll('body *')].filter((e) => { const p = getComputedStyle(e).position; return (p === 'fixed' || p === 'sticky') && e.getBoundingClientRect().height > 0; }).map((e) => boite(e.getBoundingClientRect()));
  const ciblesTactiles = [];
  if (cibles) {
    for (const e of document.querySelectorAll(INTERACTIFS)) {
      if (masque(e) || !visible(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom + sy <= 0 || r.right <= 0) continue;
      const parent = e.parentElement;
      const enLigne = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && parent && /^(P|LI|SPAN|EM|STRONG|SMALL|TD|DD|FIGCAPTION|BLOCKQUOTE)$/.test(parent.tagName) && (parent.textContent || '').trim().length > (e.textContent || '').trim().length + 10;
      ciblesTactiles.push({ selecteur: selecteur(e), texte: extrait(e), boite: boite(r), l: r.width, h: r.height, enLigne });
    }
  }
  const imgs = images ? [...document.images].map((i) => ({
    src: i.currentSrc || i.src, complete: i.complete, naturelle: i.naturalWidth, alt: i.getAttribute('alt'), decorative: i.closest('[aria-hidden="true"]') !== null || i.getAttribute('role') === 'presentation',
    dimensions: i.hasAttribute('width') && i.hasAttribute('height') || getComputedStyle(i).aspectRatio !== 'auto', lazy: i.loading === 'lazy',
    boite: boite(i.getBoundingClientRect()), selecteur: selecteur(i), visible: visible(i) && i.getBoundingClientRect().width > 0,
  })) : [];
  // Formulaires
  const formulaires = [...document.forms].map((f) => ({
    selecteur: selecteur(f), boite: boite(f.getBoundingClientRect()),
    envoi: Boolean(f.querySelector('button:not([type=button]):not([type=reset]), input[type=submit]')),
    sansEtiquette: [...f.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')].filter((c) => !(c.labels?.length || c.getAttribute('aria-label') || c.getAttribute('aria-labelledby') || c.getAttribute('title'))).map((c) => selecteur(c)),
  }));
  // Polices
  const familles = new Set([...document.querySelectorAll('h1, h2, p, a, button')].slice(0, 200).map((e) => getComputedStyle(e).fontFamily.split(',')[0].trim().replace(/["']/g, '')));
  const polices = [...familles].map((f) => ({ famille: f, chargee: [...document.fonts].some((ff) => ff.family.replace(/["']/g, '') === f && ff.status === 'loaded'), declaree: [...document.fonts].some((ff) => ff.family.replace(/["']/g, '') === f) }));
  return {
    surface: { l: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }, deborde, fautifs, coupes: coupes.slice(0, 20), boites, elementsTexte, zonesFixes, ciblesTactiles, images: imgs, formulaires, polices,
    erreurs404: [],
  };
}

async function defiler(page) {
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((ok) => setTimeout(ok, 40)); }
    window.scrollTo(0, 0);
    await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((ok) => { i.onload = i.onerror = ok; setTimeout(ok, 3000); })));
    await document.fonts.ready;
  });
  await page.waitForTimeout(120);
}

const avecDelai = (p, ms, siDepasse) => {
  let minuteur;
  return Promise.race([p.finally(() => clearTimeout(minuteur)), new Promise((ok) => { minuteur = setTimeout(() => { siDepasse(); ok(); }, ms); })]);
};
const capturesFaites = [];
const fichiersCaptures = new Map();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function controlerPage(ctx, jeu, url, chemin, largeur) {
  const page = await ctx.newPage();
  const erreurs = [];
  const tiers = new Set();
  const manquants = [];
  // « Failed to load resource » : ressource 404 (contrôle des ressources manquantes) ou requête tierce bloquée (contrôle « tiers »)
  page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) erreurs.push({ type: 'console', texte: m.text() }); });
  page.on('pageerror', (e) => erreurs.push({ type: 'exception', texte: String(e.message ?? e) }));
  page.on('request', (r) => { const h = new URL(r.url()).host; if (!/^127\.0\.0\.1(:\d+)?$/.test(h) && !r.url().startsWith('data:')) tiers.add(`${r.resourceType()} ${h}`); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(url) && r.request().resourceType() !== 'document') manquants.push({ url: r.url().slice(url.length), type: r.request().resourceType() }); });
  const mobile = largeur <= 600;
  const avecCapture = jeu.captures.includes(largeur);
  try {
    await page.goto(url + chemin, { waitUntil: 'load', timeout: 45000 });
    // Autotest du testeur seulement : défaut simulé (« cssDeTest » d'une composition de test, ex. couleur claire non corrigée)
    if (modele.cssDeTest) await page.addStyleTag({ content: String(modele.cssDeTest) });
    await defiler(page);
    const r = await page.evaluate(analyserPage, { contraste: avecCapture, cibles: mobile, images: avecCapture });
    const lieu = { chemin, jeu: jeu.id, largeur, surface: r.surface };
    compter('debordement', 'pages-largeurs');
    if (r.deborde) {
      const f = r.fautifs[0];
      ajouter('debordement', { ...lieu, gravite: 'bloquant', element: f?.selecteur, zonePx: f?.boite, mesure: `${r.surface.l} px de large`, seuil: `${largeur} px`, cle: `debordement|${chemin}|${f?.selecteur}|${largeur}`, commentaire: `La page déborde horizontalement à ${largeur} px${f ? ` : ${f.selecteur} « ${f.texte} » va jusqu’à ${f.droite} px` : ''}`, suggestion: 'Autoriser le retour à la ligne (min-width: 0, flex-wrap), réduire la taille ou rendre le mot insécable plus court.' });
    }
    for (const c of r.coupes) {
      compter('mots-coupes', 'mots');
      ajouter('mots-coupes', { ...lieu, gravite: /p[ée]dicur|-/.test(c.mot) ? 'bloquant' : 'majeur', element: c.selecteur, zonePx: c.boite, cle: `mots|${c.mot}|${c.selecteur}|${largeur}`, commentaire: `Mot coupé en fin de ligne à ${largeur} px : « ${c.mot} »`, suggestion: 'Rendre le mot insécable (lib/typo.mjs, <mot-lie>), réduire le corps du titre sur téléphone ou laisser le mot passer entier à la ligne (hyphens: manual).' });
    }
    for (const c of core.chevauchements(r.boites)) {
      compter('chevauchements', 'paires');
      const z = { x: Math.min(c.a.x, c.b.x), y: Math.min(c.a.y, c.b.y), l: Math.max(c.a.x + c.a.l, c.b.x + c.b.l) - Math.min(c.a.x, c.b.x), h: Math.max(c.a.y + c.a.h, c.b.y + c.b.h) - Math.min(c.a.y, c.b.y) };
      ajouter('chevauchements', { ...lieu, gravite: 'majeur', element: c.a.libelle.split(' « ')[0], zonePx: z, mesure: `${Math.round(c.part * 100)} % recouverts`, seuil: `< ${Math.round(S.chevauchement * 100)} %`, cle: `chev|${c.a.libelle}|${c.b.libelle}|${largeur}`, commentaire: `Éléments qui se recouvrent à ${largeur} px : ${c.a.libelle} et ${c.b.libelle}`, suggestion: 'Revoir le positionnement (position absolute, marges négatives, hauteur fixe) pour que les deux blocs ne se superposent pas.' });
    }
    if (mobile) {
      for (const c of r.ciblesTactiles) {
        compter('cibles-tactiles', 'cibles');
        const g = core.graviteCibleTactile(c);
        if (g) ajouter('cibles-tactiles', { ...lieu, gravite: g, element: c.selecteur, zonePx: c.boite, mesure: `${Math.round(c.l)} × ${Math.round(c.h)} px`, seuil: `≥ ${S.cibleTactile} px`, cle: `cible|${c.selecteur}|${largeur}`, commentaire: `Cible tactile trop petite : ${c.selecteur} « ${c.texte} » (${Math.round(c.l)} × ${Math.round(c.h)} px)`, suggestion: 'Agrandir la zone cliquable (padding, min-height: 44px) sans changer le dessin.' });
      }
    }
    for (const f of r.formulaires) {
      compter('formulaires', 'formulaires');
      for (const s of f.sansEtiquette) ajouter('formulaires', { ...lieu, gravite: 'majeur', element: s, zonePx: f.boite, cle: `form|${s}`, commentaire: `Champ de formulaire sans étiquette : ${s}`, suggestion: 'Associer un <label for> (ou aria-label) au champ.' });
      if (!f.envoi) ajouter('formulaires', { ...lieu, gravite: 'majeur', element: f.selecteur, zonePx: f.boite, cle: `form|envoi|${f.selecteur}`, commentaire: 'Formulaire sans bouton d’envoi', suggestion: 'Ajouter un bouton type="submit".' });
    }
    for (const p of r.polices) {
      compter('polices', 'familles');
      if (!p.chargee && p.declaree) ajouter('polices', { ...lieu, gravite: 'majeur', cle: `police|${p.famille}`, commentaire: `Police « ${p.famille} » déclarée mais non chargée`, suggestion: 'Vérifier le fichier woff2 dans /_astro et la règle @font-face (sous-ensemble de caractères).' });
    }
    for (const i of r.images) {
      compter('images', 'rendues');
      if (i.visible && (!i.complete || !i.naturelle)) ajouter('images', { ...lieu, gravite: 'bloquant', element: i.selecteur, zonePx: i.boite, cle: `img|cassee|${i.src}`, commentaire: `Image non chargée : ${i.src.replace(url, '')}`, suggestion: 'Vérifier le chemin de l’image (fichier présent dans public/ ou la banque).' });
      if (i.alt === null && !i.decorative) ajouter('images', { ...lieu, gravite: 'majeur', element: i.selecteur, zonePx: i.boite, cle: `img|alt|${i.selecteur}`, commentaire: `Image sans attribut alt : ${i.src.replace(url, '')}`, suggestion: 'Ajouter un alt descriptif (ou alt="" si décorative).' });
      if (!i.dimensions) ajouter('images', { ...lieu, gravite: 'mineur', element: i.selecteur, zonePx: i.boite, cle: `img|dim|${i.selecteur}`, commentaire: `Image sans dimensions (width/height) : risque de décalage à l’affichage`, suggestion: 'Poser width et height (ou aspect-ratio) sur l’image.' });
      if (core.estImageDemo(i.src)) ajouter('images', { ...lieu, gravite: 'bloquant', element: i.selecteur, zonePx: i.boite, cle: `images|demo|${i.src}`, commentaire: `Image de démonstration affichée : ${i.src.replace(url, '')}`, suggestion: 'Jamais d’image démo sur un site praticien.' });
      const cle = cleRendu(i.src);
      if (cle && exclues.has(cle)) ajouter('images', imageRefusee(cle, { ...lieu, element: i.selecteur, zonePx: i.boite }));
    }
    // Contraste réel : capture pleine page, pixels sous chaque texte
    if (avecCapture) {
      const fichier = join(sortie, 'captures', jeu.id, String(largeur), `${chemin === '/' ? 'accueil' : chemin.slice(1).replaceAll('/', '__')}.png`);
      mkdirSync(dirname(fichier), { recursive: true });
      const png = await page.screenshot({ path: fichier, fullPage: true, animations: 'disabled' });
      fichiersCaptures.set(`${jeu.id}|${largeur}|${chemin}`, fichier);
      capturesFaites.push({ chemin, page: core.pageModeleDeChemin(chemin), appareil: core.appareilDeLargeur(largeur), largeur, jeu: jeu.id, fichier: relative(sortie, fichier).replaceAll('\\', '/') });
      const img = PNG.sync.read(png);
      for (const t of r.elementsTexte) {
        // Texte recouvert par un élément fixe (en-tête collant, barre mobile) sur la capture : non mesurable
        if (r.zonesFixes.some((z) => !(t.boite.x + t.boite.l < z.x || t.boite.x > z.x + z.l || t.boite.y + t.boite.h < z.y || t.boite.y > z.y + z.h))) continue;
        const a = core.analyserFondTexte(img.data, img.width, img.height, t.boite, t.couleur, t.alpha);
        if (!a) continue;
        compter('contraste', 'textes');
        const seuil = core.seuilContraste(t.taille, t.graisse);
        if (a.retenu >= seuil) continue;
        const ratio = a.retenu.toFixed(2).replace('.', ',');
        compter('contraste', 'sous-AA');
        ajouter('contraste', {
          ...lieu, gravite: a.retenu < 3 && seuil > 3 || a.retenu < 2 ? 'bloquant' : 'majeur', element: t.selecteur, zonePx: t.boite, mesure: `${ratio}:1${a.uni ? '' : ' (fond varié)'}`, seuil: `≥ ${String(seuil).replace('.', ',')}:1`,
          cle: `contraste|${t.selecteur}|${t.couleur.join(',')}|${a.fond.map((x) => x >> 4).join(',')}|${largeur}`,
          commentaire: `Contraste insuffisant à ${largeur} px : « ${t.texte} » (${t.selecteur}) ${ratio}:1 sur ${a.uni ? 'fond uni' : 'fond varié (image)'}`,
          suggestion: a.uni ? 'Foncer le texte ou éclaircir le fond (couleurs de la gamme ajustées AA, ajusterContraste).' : 'Ajouter un voile sous le texte ou déplacer le texte hors de l’image.',
        });
      }
    }
    // Accessibilité (axe-core ; contraste exclu : mesuré sur le rendu ci-dessus)
    if (jeu.axe.includes(largeur)) {
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } }, resultTypes: ['violations'] });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, aide: v.help, noeuds: v.nodes.slice(0, 4).map((n) => ({ cible: String(n.target[0] ?? ''), boite: (() => { try { const e = document.querySelector(String(n.target[0])); const b = e?.getBoundingClientRect(); return b ? { x: b.left, y: b.top + window.scrollY, l: b.width, h: b.height } : null; } catch { return null; } })() })) }));
      });
      compter('accessibilite', 'pages');
      for (const v of res) {
        for (const n of v.noeuds) {
          compter('accessibilite', v.impact ?? 'autre');
          ajouter('accessibilite', { ...lieu, gravite: v.impact === 'critical' ? 'bloquant' : v.impact === 'serious' ? 'majeur' : 'mineur', element: n.cible, zonePx: n.boite, cle: `axe|${v.id}|${n.cible}`, mesure: `axe ${v.id} (${v.impact})`, seuil: 'aucune violation WCAG 2.2 AA', commentaire: `${v.aide} — ${n.cible}`, suggestion: `Corriger selon la règle axe « ${v.id} » (https://dequeuniversity.com/rules/axe/4.14/${v.id}).` });
        }
      }
    }
    for (const e of erreurs) {
      compter('console', e.type);
      ajouter('console', { ...lieu, gravite: e.type === 'exception' ? 'bloquant' : 'majeur', cle: `console|${e.texte.slice(0, 80)}`, commentaire: `${e.type === 'exception' ? 'Exception JavaScript' : 'Erreur console'} : ${e.texte.slice(0, 200)}`, suggestion: 'Corriger le script en cause (aucune erreur JS tolérée).' });
    }
    for (const m of manquants) {
      ajouter(m.type === 'image' ? 'images' : m.type === 'font' ? 'polices' : 'liens', { ...lieu, gravite: m.type === 'image' || m.type === 'font' ? 'bloquant' : 'majeur', cle: `manquant|${m.url}`, commentaire: `Ressource introuvable (404) : ${m.url}`, suggestion: 'Vérifier le chemin de la ressource.' });
    }
    for (const t of tiers) {
      const police = /^font /.test(t) || /fonts\.(googleapis|gstatic)/.test(t);
      ajouter(police ? 'polices' : 'tiers', { ...lieu, gravite: police ? 'bloquant' : 'majeur', cle: `tiers|${t}`, commentaire: police ? `Police chargée depuis un service tiers : ${t}` : `Requête vers un service tiers : ${t}`, suggestion: police ? 'Auto-héberger la police (@fontsource, /_astro).' : 'Aucune ressource tierce au chargement (RGPD, CSP) : héberger la ressource ou la charger après consentement.' });
    }
  } catch (e) {
    ajouter('construction', { chemin, jeu: jeu.id, largeur, gravite: 'majeur', cle: `chargement|${chemin}|${largeur}`, commentaire: `Page non contrôlée (${String(e.message ?? e).split('\n')[0].slice(0, 150)})`, suggestion: 'Relancer le test ; si l’erreur persiste, ouvrir la page à cette largeur.' });
  } finally {
    await page.close();
  }
}

// Menu mobile, barre d'actions, animations (accueil, par jeu)
async function controlesInteractifs(navigateur, jeu, url) {
  for (const largeur of [360, 375]) {
    const ctx = await navigateur.newContext({ viewport: { width: largeur, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`${url}/`, { waitUntil: 'load' });
    const lieu = { chemin: '/', jeu: jeu.id, largeur };
    compter('menu-mobile', 'essais');
    const bouton = page.locator('button[aria-expanded][aria-controls]').filter({ visible: true }).first();
    if (!(await bouton.count())) {
      const liens = await page.evaluate(() => [...document.querySelectorAll('header a[href], nav a[href]')].filter((a) => a.getBoundingClientRect().width > 0).length);
      if (liens < 3) ajouter('menu-mobile', { ...lieu, gravite: 'bloquant', cle: `menu|absent|${largeur}`, commentaire: `Aucun menu mobile (bouton aria-expanded) ni navigation visible à ${largeur} px`, suggestion: 'Ajouter le bouton « Menu » du gabarit (aria-expanded, aria-controls).' });
    } else {
      const zone = await bouton.boundingBox();
      const zonePx = zone ? { x: zone.x, y: zone.y, l: zone.width, h: zone.height } : null;
      await bouton.click();
      await page.waitForTimeout(350);
      const ouvert = await page.evaluate(() => {
        const b = document.querySelector('button[aria-expanded="true"][aria-controls]');
        const cible = b && document.getElementById(b.getAttribute('aria-controls'));
        const visible = cible ? (cible.tagName === 'DIALOG' ? cible.open : cible.getBoundingClientRect().height > 0 && getComputedStyle(cible).visibility !== 'hidden') : false;
        return { etendu: Boolean(b), visible, focusDedans: Boolean(cible && cible.contains(document.activeElement)), liens: cible ? cible.querySelectorAll('a[href]').length : 0 };
      });
      if (!ouvert.etendu || !ouvert.visible) ajouter('menu-mobile', { ...lieu, gravite: 'bloquant', zonePx, element: 'button[aria-expanded]', cle: `menu|ouvrir|${largeur}`, commentaire: `Le menu ne s’ouvre pas au toucher à ${largeur} px`, suggestion: 'Vérifier le script du tiroir (showModal, aria-expanded="true").' });
      else {
        if (!ouvert.focusDedans) ajouter('menu-mobile', { ...lieu, gravite: 'majeur', zonePx, element: 'button[aria-expanded]', cle: `menu|focus|${largeur}`, commentaire: 'À l’ouverture du menu, le focus reste hors du menu', suggestion: 'Placer le focus sur le premier lien ou le bouton « Fermer » du tiroir.' });
        if (ouvert.liens < 3) ajouter('menu-mobile', { ...lieu, gravite: 'majeur', zonePx, cle: `menu|liens|${largeur}`, commentaire: `Menu ouvert avec ${ouvert.liens} lien(s) seulement`, suggestion: 'Le tiroir doit reprendre les pages du site.' });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(350);
        const ferme = await page.evaluate(() => {
          const b = document.querySelector('button[aria-expanded][aria-controls]');
          const cible = b && document.getElementById(b.getAttribute('aria-controls'));
          const visible = cible ? (cible.tagName === 'DIALOG' ? cible.open : cible.getBoundingClientRect().height > 0 && getComputedStyle(cible).visibility !== 'hidden') : false;
          return { etendu: b?.getAttribute('aria-expanded') === 'true', visible, focusBouton: document.activeElement === b };
        });
        if (ferme.visible || ferme.etendu) ajouter('menu-mobile', { ...lieu, gravite: 'majeur', zonePx, cle: `menu|echap|${largeur}`, commentaire: 'La touche Échap ne ferme pas le menu', suggestion: 'Fermer le tiroir sur Échap (dialog natif ou écouteur keydown).' });
        else if (!ferme.focusBouton) ajouter('menu-mobile', { ...lieu, gravite: 'mineur', zonePx, cle: `menu|retour|${largeur}`, commentaire: 'Après fermeture, le focus ne revient pas sur le bouton « Menu »', suggestion: 'Rendre le focus au bouton à la fermeture.' });
      }
    }
    if (largeur === 375) {
      // Barre d'actions mobile : appel, itinéraire, RDV, sans masquer la fin de page
      compter('barre-actions', 'essais');
      const barre = await page.evaluate(() => {
        const fixes = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed' && e.querySelector('a[href]') && e.getBoundingClientRect().bottom > innerHeight - 100 && e.getBoundingClientRect().height > 20);
        const b = fixes[0];
        if (!b) return null;
        const r = b.getBoundingClientRect();
        const liens = [...b.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), texte: a.textContent.trim(), h: a.getBoundingClientRect().height }));
        return { boite: { x: r.left, y: r.top, l: r.width, h: r.height }, liens };
      });
      if (!barre) ajouter('barre-actions', { ...lieu, gravite: 'majeur', cle: 'barre|absente', commentaire: 'Aucune barre d’actions fixe en bas de l’écran sur téléphone', suggestion: 'Garder la barre « Appeler · Rendez-vous · Itinéraire » du gabarit.' });
      else {
        const a = (re) => barre.liens.some((l) => re.test(`${l.href} ${l.texte}`));
        if (!a(/^tel:|appeler/i)) ajouter('barre-actions', { ...lieu, gravite: 'majeur', zonePx: barre.boite, cle: 'barre|tel', commentaire: 'Barre d’actions sans lien d’appel (tel:) alors que le cabinet a un téléphone', suggestion: 'Ajouter « Appeler » (lien tel:).' });
        if (!a(/maps|itin[ée]raire|geo:|openstreetmap/i)) ajouter('barre-actions', { ...lieu, gravite: 'majeur', zonePx: barre.boite, cle: 'barre|itineraire', commentaire: 'Barre d’actions sans itinéraire', suggestion: 'Ajouter « Itinéraire » (lien carte).' });
        if (!a(/\/rdv|doctolib|rendez-vous|rdv/i)) ajouter('barre-actions', { ...lieu, gravite: 'majeur', zonePx: barre.boite, cle: 'barre|rdv', commentaire: 'Barre d’actions sans prise de rendez-vous', suggestion: 'Ajouter « Rendez-vous ».' });
        for (const l of barre.liens) if (l.h < S.cibleTactile) ajouter('barre-actions', { ...lieu, gravite: 'majeur', zonePx: barre.boite, cle: `barre|cible|${l.texte}`, commentaire: `Bouton « ${l.texte} » de la barre trop bas (${Math.round(l.h)} px)`, suggestion: 'min-height: 48px.' });
        const recouvre = await page.evaluate((hBarre) => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          const pied = document.querySelector('footer');
          const textes = pied ? [...pied.querySelectorAll('a, p, span, li')].filter((e) => e.getBoundingClientRect().height > 0) : [];
          const dernier = textes[textes.length - 1];
          return dernier ? dernier.getBoundingClientRect().bottom > innerHeight - hBarre - 4 : false;
        }, barre.boite.h + 12);
        if (recouvre) ajouter('barre-actions', { ...lieu, gravite: 'majeur', zonePx: barre.boite, cle: 'barre|recouvre', commentaire: 'En bas de page, la barre d’actions masque la fin du pied de page', suggestion: 'Ajouter une marge basse au pied de page de la hauteur de la barre.' });
      }
    }
    await ctx.close();
  }
  // Animations : jouées sans mouvement réduit, arrêtées et remplacées par une image fixe correcte avec
  for (const largeur of [375, 1440]) {
    const lieu = { chemin: '/', jeu: jeu.id, largeur };
    const normal = await navigateur.newContext({ viewport: { width: largeur, height: 800 }, deviceScaleFactor: 1 });
    const p1 = await normal.newPage();
    await p1.goto(`${url}/`, { waitUntil: 'load' });
    await p1.waitForTimeout(1200);
    const animees = await p1.evaluate(() => [...new Set(document.getAnimations().filter((a) => a.playState === 'running').map((a) => a.effect?.target).filter((t) => t instanceof Element).map((t) => { const s = t.closest('[id]'); return t.id ? `#${CSS.escape(t.id)}` : s ? `#${CSS.escape(s.id)} ${t.tagName.toLowerCase()}${t.classList[0] ? `.${CSS.escape(t.classList[0])}` : ''}` : `${t.tagName.toLowerCase()}${t.classList[0] ? `.${CSS.escape(t.classList[0])}` : ''}`; }))].slice(0, 40));
    await normal.close();
    const reduit = await navigateur.newContext({ viewport: { width: largeur, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const p2 = await reduit.newPage();
    await p2.goto(`${url}/`, { waitUntil: 'load' });
    await p2.waitForTimeout(1200);
    const etat = await p2.evaluate((cibles) => ({
      jouees: document.getAnimations().filter((a) => a.playState === 'running').filter((a) => { const t = a.effect?.getComputedTiming?.(); return t && (t.iterations === Infinity || Number(t.duration) > 150); }).map((a) => (a.effect?.target instanceof Element ? `${a.effect.target.tagName.toLowerCase()}${a.effect.target.classList[0] ? `.${a.effect.target.classList[0]}` : ''}` : 'animation')).slice(0, 10),
      invisibles: cibles.filter((c) => { try { const e = document.querySelector(c); if (!e) return false; const r = e.getBoundingClientRect(); let op = 1; for (let x = e; x && x !== document.documentElement; x = x.parentElement) op *= Number(getComputedStyle(x).opacity); return r.top < innerHeight && (r.width < 2 || r.height < 2 || op < 0.1 || getComputedStyle(e).visibility === 'hidden'); } catch { return false; } }),
    }), animees);
    compter('animations', 'animees', animees.length);
    for (const j of [...new Set(etat.jouees)]) ajouter('animations', { ...lieu, gravite: 'majeur', element: j, cle: `anim|jouee|${j}|${largeur}`, commentaire: `Animation jouée malgré « mouvement réduit » : ${j}`, suggestion: 'Arrêter l’animation sous @media (prefers-reduced-motion: reduce).' });
    for (const c of etat.invisibles) ajouter('animations', { ...lieu, gravite: 'majeur', element: c, cle: `anim|fixe|${c}|${largeur}`, commentaire: `Mouvement réduit : l’élément animé ${c} n’a pas d’image fixe visible`, suggestion: 'Afficher l’état final (ou une image fixe) de l’animation quand le mouvement est réduit.' });
    const fichier = join(sortie, 'captures', jeu.id, String(largeur), 'accueil--image-fixe.png');
    mkdirSync(dirname(fichier), { recursive: true });
    await p2.screenshot({ path: fichier });
    capturesFaites.push({ chemin: '/', page: 'accueil', appareil: core.appareilDeLargeur(largeur), largeur, jeu: jeu.id, fichier: relative(sortie, fichier).replaceAll('\\', '/') });
    await reduit.close();
  }
}

// Performance mobile (4G lente simulée, processeur ×4, comme Lighthouse « mobile »)
async function performance(navigateur, jeu, url, chemin) {
  const ctx = await navigateur.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, lt: [] };
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.renderTime || e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let poids = 0;
  cdp.on('Network.loadingFinished', (e) => { poids += e.encodedDataLength; });
  await page.goto(url + chemin, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3000);
  const m = await page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    return { lcpMs: window.__perf.lcp || null, cls: window.__perf.cls, tbtMs: window.__perf.lt.filter(([s]) => s >= fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0), fcpMs: fcp };
  });
  await ctx.close();
  return { ...m, poids };
}

/** Deux passages, meilleure valeur de chaque mesure (la machine peut être occupée par d'autres constructions) ; tickets sur ce meilleur */
async function performanceStable(navigateur, jeu, url, chemin) {
  const a = await performance(navigateur, jeu, url, chemin);
  const b = await performance(navigateur, jeu, url, chemin);
  const min = (x, y) => (x == null ? y : y == null ? x : Math.min(x, y));
  const mesure = { lcpMs: min(a.lcpMs, b.lcpMs), cls: min(a.cls, b.cls), tbtMs: min(a.tbtMs, b.tbtMs), poids: min(a.poids, b.poids), fcpMs: min(a.fcpMs, b.fcpMs) };
  for (const d of core.defautsPerformance(mesure)) {
    ajouter('performance', { chemin, jeu: jeu.id, largeur: 412, gravite: d.gravite, mesure: d.texte, seuil: d.seuil, cle: `perf|${chemin}|${d.mesure}`, commentaire: `${d.texte} sur téléphone (4G lente simulée) — ${chemin}`, suggestion: d.mesure === 'poids' ? 'Alléger la page : images plus petites, moins de polices, pas de script inutile.' : d.mesure === 'cls' ? 'Réserver la place des images et des polices (width/height, font-display, aspect-ratio).' : d.mesure === 'tbtMs' ? 'Réduire le JavaScript exécuté au chargement (animations, scripts différés).' : 'Alléger l’image du premier écran (priorité fetchpriority="high", taille adaptée), réduire les CSS en ligne.' });
  }
  return mesure;
}

// Contrôles du dépôt (scripts existants)
async function controleExterne(id, script, argv, analyse) {
  const t = Date.now();
  const r = await executer('node', [script, ...argv], {});
  const res = analyse(r);
  mesures[id] = { ...(mesures[id] ?? {}), resume: res.resume };
  for (const d of res.defauts) ajouter(id, { chemin: d.chemin ?? '/', jeu: 'sport-basket', largeur: d.largeur ?? null, gravite: d.gravite, cle: `${id}|${d.texte}`, commentaire: d.texte, suggestion: d.suggestion });
  journal(`${id} : ${res.resume} (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  return Date.now() - t;
}

// ---------------------------------------------------------------------------------------------------------------
// Passage
// ---------------------------------------------------------------------------------------------------------------
const durees = {};
const dureesJeux = {}; // construction + contrôles de chaque jeu
const navigateurBrut = await chromium.launch();
// Toute requête hors du serveur local est notée (contrôle « tiers ») puis bloquée : aucun appel sortant, aucune attente réseau
const navigateur = {
  newContext: async (o) => {
    const c = await navigateurBrut.newContext(o);
    await c.route((u) => !/^http:\/\/127\.0\.0\.1[:/]/.test(u.href) && !u.href.startsWith('data:'), (r) => r.abort());
    return c;
  },
  close: () => navigateurBrut.close(),
};
const pagesTestees = new Set();
const extern = [];
let constructionSuivante = construire(JEUX[0]);
const perfs = [];
for (let k = 0; k < JEUX.length; k++) {
  const jeu = JEUX[k];
  const dist = await constructionSuivante;
  constructionSuivante = k + 1 < JEUX.length ? construire(JEUX[k + 1]) : null; // la suivante se construit pendant les contrôles
  if (!dist) continue;
  const { pages } = controlesStatiques(jeu, dist);
  pages.forEach((p) => pagesTestees.add(p));
  if (k === 0) {
    const fiche = pages.find((p) => p.startsWith('/soins/')) ?? '/soins';
    if (!args['sans-agents']) extern.push(controleExterne('agents', 'scripts/controle-agents.mjs', [q(dist)], (r) => {
      const score = Number(r.texte.match(/Score découvrabilité agents : (\d+)\/100/)?.[1] ?? NaN);
      const defauts = [...r.texte.matchAll(/^✗ (\S+)\s+(.+)$/gm)].map((m) => ({ gravite: score < S.scoreAgents ? 'majeur' : 'mineur', texte: `Agents IA : ${m[1]} ${m[2]}`, suggestion: 'Voir docs/decouvrabilite-agents.md (npm run controle:agents).' }));
      if (!Number.isFinite(score)) return { resume: 'non mesuré', defauts: [], nonMesure: nonMesures.add('agents') };
      return { resume: `score ${score}/100`, defauts };
    }).then((d) => { durees.agents = d; }));
    else nonMesures.add('agents');
    if (!args['sans-charte']) extern.push(controleExterne('charte', 'scripts/controle-charte.mjs', [], (r) => ({
      resume: r.code === 0 ? 'conforme' : `${(r.texte.match(/^✗/gm) ?? []).length} écart(s)`,
      defauts: [...r.texte.matchAll(/^✗ (.+)$/gm)].slice(0, 20).map((m) => ({ gravite: 'majeur', texte: `Charte : ${m[1].slice(0, 250)}`, suggestion: 'npm run controle:charte -w apps/sites (docs/charte-graphique.md).' })),
    })).then((d) => { durees.charte = d; }));
    else nonMesures.add('charte');
    if (!args['sans-webkit']) extern.push(controleExterne('webkit', 'scripts/controle-webkit.mjs', ['--dist', q(dist), '--pages', `/,/soins,/le-cabinet,/acces,${fiche}`, '--sortie', q(join(sortie, 'webkit'))], (r) => {
      const lignes = [...r.texte.matchAll(/^([✓✗]) (\S+)\s+max ([\d.]+) %/gm)];
      if (!lignes.length) { nonMesures.add('webkit'); return { resume: `non mesuré (${r.texte.split('\n').find((l) => /error|erreur|Executable/i.test(l))?.trim().slice(0, 120) ?? 'WebKit indisponible'})`, defauts: [] }; }
      return { resume: `${lignes.filter((l) => l[1] === '✓').length}/${lignes.length} pages conformes`, defauts: [...lignes.filter((l) => l[1] === '✗').map((l) => ({ chemin: l[2], largeur: 393, gravite: 'majeur', texte: `Rendu iPhone (WebKit) différent de Chromium sur ${l[2]} : ${l[3]} % de pixels d’une zone`, suggestion: `Comparer les planches ${join(sortie, 'webkit')} (styles SVG en attributs, backdrop-filter préfixé).` })), ...(r.texte.match(/<style>|contient <style>/) ? [{ gravite: 'majeur', texte: 'Dessin SVG externe avec <style> (ignoré par WebKit)', suggestion: 'Styles en attributs style="".' }] : [])] };
    }).then((d) => { durees.webkit = d; }));
    else nonMesures.add('webkit');
  }
  const { url, fermer } = await servir(dist);
  const t = Date.now();
  // Toutes les pages × toutes les largeurs : une seule file, PARALLELE onglets (largeurs avec captures d'abord : les plus longues)
  const contextes = new Map();
  for (const largeur of LARGEURS) contextes.set(largeur, await navigateur.newContext({ viewport: { width: largeur, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce', ...(largeur <= 600 ? { isMobile: true, hasTouch: true } : {}) }));
  const ordre = [...LARGEURS].sort((a, b) => Number(jeu.captures.includes(b)) - Number(jeu.captures.includes(a)));
  const file = ordre.flatMap((largeur) => pages.map((c) => [largeur, c]));
  await Promise.all(Array.from({ length: PARALLELE }, async () => {
    for (let x = file.shift(); x; x = file.shift()) {
      const [largeur, c] = x;
      await avecDelai(controlerPage(contextes.get(largeur), jeu, url, c, largeur), 90000, () => ajouter('construction', { chemin: c, jeu: jeu.id, largeur, gravite: 'majeur', cle: `delai|${c}|${largeur}`, commentaire: `Page non contrôlée en 90 s à ${largeur} px`, suggestion: 'Ouvrir la page : chargement bloqué (script, redirection, image) ?' }));
    }
  }));
  for (const c of contextes.values()) await c.close();
  await controlesInteractifs(navigateur, jeu, url);
  durees[`pages-${jeu.id}`] = Date.now() - t;
  journal(`Contrôles ${jeu.id} : ${pages.length} pages × ${LARGEURS.length} largeurs (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  dureesJeux[jeu.id] = (dureesJeux[jeu.id] ?? 0) + (Date.now() - t);
  if (!args['sans-perf'] && (k === 0 || jeu.id === 'enfant-minimal' || jeu.forme === 'minimal')) {
    const tp = Date.now();
    const cibles = k === 0 ? ['/', pages.find((p) => p.startsWith('/soins/')) ?? '/soins'] : ['/'];
    for (const c of cibles) perfs.push({ jeu: jeu.id, chemin: c, ...(await performanceStable(navigateur, jeu, url, c)) });
    durees.performance = (durees.performance ?? 0) + Date.now() - tp;
  }
  fermer();
}
if (args['sans-perf']) nonMesures.add('performance');
await Promise.all(extern);
await navigateur.close();

// ---------------------------------------------------------------------------------------------------------------
// Vignettes des zones (retours/tests-modeles/<modele>-v<n>/t-XXXX.jpg)
// ---------------------------------------------------------------------------------------------------------------
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { sharp = null; }
const dossierVignettes = sousDossier(dossierResultats, baseVignettes);
const RANG = { bloquant: 0, majeur: 1, mineur: 2 };
async function vignette(fichierPng, zonePx, nom) {
  if (!sharp || !fichierPng || !zonePx) return null;
  const meta = await sharp(fichierPng).metadata();
  const marge = 40;
  const left = Math.max(0, Math.floor(zonePx.x - marge)), top = Math.max(0, Math.floor(zonePx.y - marge));
  const width = Math.min(meta.width - left, Math.ceil(zonePx.l + 2 * marge)), height = Math.min(meta.height - top, Math.ceil(Math.min(zonePx.h, 900) + 2 * marge));
  if (width < 4 || height < 4) return null;
  const cadre = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="${zonePx.x - left}" y="${zonePx.y - top}" width="${Math.max(2, zonePx.l)}" height="${Math.max(2, Math.min(zonePx.h, 900))}" fill="none" stroke="#d0021b" stroke-width="3"/></svg>`);
  mkdirSync(dossierVignettes, { recursive: true });
  await sharp(fichierPng).extract({ left, top, width, height }).composite([{ input: cadre, top: 0, left: 0 }]).resize({ width: Math.min(480, width), withoutEnlargement: true }).jpeg({ quality: 68 }).toFile(join(dossierVignettes, nom));
  return `tests-modeles/${baseVignettes}/${nom}`;
}
// Captures de la même page à une largeur proche (vignette d'un défaut vu à 360 px : capture 375 px)
const captureProche = (t) => {
  const larg = [t.largeur, ...(t.largeur && t.largeur <= 600 ? [375] : [1440])];
  for (const l of larg) { const f = fichiersCaptures.get(`${t.jeu}|${l}|${t.chemin}`); if (f) return { f, exacte: l === t.largeur }; }
  return null;
};
rmSync(dossierVignettes, { recursive: true, force: true }); // vignettes de CE modèle-version seulement (sorties du testeur)
const occ = (t) => occurrences.get(t.empreinte) ?? 1;
for (const t of tickets) {
  const j = [...(jeuxDe.get(t.empreinte) ?? [])];
  if (occ(t) > 1) t.commentaire = `${t.commentaire} (×${occ(t)}${j.length > 1 ? `, jeux : ${j.join(', ')}` : ''})`.slice(0, 500);
}
const verdictsJeux = core.verdictsParJeu(parJeu, JEUX.map((j) => j.id));
const tries = core.dedoublonner(tickets).sort((a, b) => RANG[a.gravite] - RANG[b.gravite] || a.controle.localeCompare(b.controle));
let nV = 0;
for (const t of tries) {
  if (nV >= 60 || !t.zonePx) continue;
  const c = captureProche(t);
  if (!c?.exacte) continue;
  t.vignette = await vignette(c.f, t.zonePx, `t-${String(++nV).padStart(4, '0')}.jpg`).catch(() => null);
}

// ---------------------------------------------------------------------------------------------------------------
// Résultat
// ---------------------------------------------------------------------------------------------------------------
const f = (n) => new Intl.NumberFormat('fr-FR').format(n);
const resumes = {
  construction: () => `${JEUX.length} jeu(x) construit(s)`,
  debordement: () => `${f(mesures.debordement?.['pages-largeurs'] ?? 0)} rendus page × largeur`,
  'mots-coupes': () => `${f(mesures['mots-coupes']?.mots ?? 0)} mot(s) coupé(s)`,
  chevauchements: () => `${f(mesures.chevauchements?.paires ?? 0)} recouvrement(s)`,
  contraste: () => `${f(mesures.contraste?.textes ?? 0)} textes mesurés sur le rendu, ${f(mesures.contraste?.['sous-AA'] ?? 0)} sous AA`,
  'cibles-tactiles': () => `${f(mesures['cibles-tactiles']?.cibles ?? 0)} cibles mesurées (360 et 375 px)`,
  liens: () => `${f(mesures.liens?.liens ?? 0)} liens, ${f(mesures.liens?.page ?? 0)} page(s) introuvable(s), ${f(mesures.liens?.ancre ?? 0)} ancre(s) absente(s)`,
  'menu-mobile': () => `${f(mesures['menu-mobile']?.essais ?? 0)} essai(s) (360, 375 px)`,
  'barre-actions': () => `${f(mesures['barre-actions']?.essais ?? 0)} essai(s) (375 px)`,
  formulaires: () => `${f(mesures.formulaires?.formulaires ?? 0)} formulaire(s)`,
  images: () => `${f(mesures.images?.rendues ?? 0)} images rendues, ${f(mesures.images?.fichiers ?? 0)} fichiers pesés, ${f(mesures.images?.['elements-composition'] ?? 0)} éléments de composition vérifiés`,
  polices: () => `${f(mesures.polices?.familles ?? 0)} familles vérifiées`,
  accessibilite: () => `${f(mesures.accessibilite?.pages ?? 0)} pages passées à axe-core`,
  seo: () => `${f(mesures.seo?.pages ?? 0)} pages`,
  agents: () => mesures.agents?.resume ?? 'non mesuré',
  charte: () => mesures.charte?.resume ?? 'non mesuré',
  webkit: () => mesures.webkit?.resume ?? 'non mesuré',
  performance: () => (perfs.length ? perfs.map((p) => `${p.chemin} (${p.jeu}) LCP ${((p.lcpMs ?? 0) / 1000).toFixed(2)} s · CLS ${(p.cls ?? 0).toFixed(3)} · TBT ${Math.round(p.tbtMs ?? 0)} ms · ${Math.round((p.poids ?? 0) / 1024)} Ko`).join(' ; ') : 'non mesuré'),
  console: () => `${f((mesures.console?.console ?? 0) + (mesures.console?.exception ?? 0))} erreur(s)`,
  animations: () => `${f(mesures.animations?.animees ?? 0)} animation(s) repérée(s) à l’accueil`,
  tiers: () => 'requêtes réseau de toutes les pages',
  activites: () => (JEUX.some((j) => j.activites?.length) ? `${f(mesures.activites?.visuels ?? 0)} visuels vérifiés dans les jeux d’activité` : 'aucun jeu d’activité'),
};
const SEUILS_LISIBLES = {
  construction: 'construction réussie', debordement: `aucun débordement (${LARGEURS.join(', ')} px)`, 'mots-coupes': 'aucun mot composé ni mot ≥ 10 lettres coupé', chevauchements: `< ${S.chevauchement * 100} % de recouvrement`,
  contraste: `≥ ${String(S.contrasteTexte).replace('.', ',')}:1 (grand texte ≥ 3:1)`, 'cibles-tactiles': `≥ ${S.cibleTactile} px (échec < ${S.cibleTactileMin} px)`, liens: 'aucun lien interne cassé', 'menu-mobile': 'ouvre, Échap ferme, focus géré',
  'barre-actions': 'appel, itinéraire, RDV, ≥ 44 px', formulaires: 'étiquettes et envoi', images: `chargées, alt, dimensions, ≤ ${Math.round(S.poidsImage / 1024)} Ko, ni démo ni refusée`, polices: 'chargées, auto-hébergées',
  accessibilite: 'aucune violation axe WCAG 2.2 AA (critique = bloquant)', seo: 'title, description, canonical, 1 H1, JSON-LD valide', agents: `score ≥ ${S.scoreAgents}/100`, charte: 'controle:charte sans écart', webkit: '≤ 4 % de pixels par zone',
  performance: `LCP ≤ ${S.lcpMs / 1000} s, CLS ≤ ${S.cls}, TBT ≤ ${S.tbtMs} ms, ≤ ${Math.round(S.poidsPage / 1024)} Ko`, console: 'aucune erreur', animations: 'reduced-motion respecté, image fixe visible', tiers: 'aucune requête tierce', activites: 'aucun visuel d’une autre activité (bloquant)',
};
const controles = core.CONTROLES_TESTEUR.filter((c) => c.id !== 'visuel').map((c) =>
  core.bilanControle(c.id, tries, { mesure: resumes[c.id]?.() ?? '', seuil: SEUILS_LISIBLES[c.id] ?? '', nonMesure: nonMesures.has(c.id), dureeMs: durees[c.id] }),
);
// Vérification visuelle : faite par l'agent Claude (.claude/agents/testeur-modeles.md, contrôle « visuel » ajouté par --fusionner),
// jamais par le script. Sans elle, la règle de validation refuse (regleValidationModele).
const dureeMs = Date.now() - debut;
let resultat = {
  format: 'testeur-modeles/1', mode, source: 'script', modele: modele.id, version: modele.version,
  verdict: core.verdictTest(controles, tries), controles, tickets: tries, le: new Date().toISOString(), dureeMs, outil: 'tester-modele.mjs 1',
  jeux: JEUX.map((j) => ({ id: j.id, libelle: j.libelle, verdict: verdictsJeux[j.id], dureeMs: dureesJeux[j.id] ?? null, ...(j.activites?.length ? { activites: j.activites } : {}) })), pages: [...pagesTestees], largeurs: LARGEURS, captures: capturesFaites,
  run: process.env.RUN_URL ?? null,
};

// Re-check : comparaison à la version précédente (tickets corrigés / toujours ouverts / nouveaux, avant / après des zones)
if (mode === 'recheck') {
  const prec = args.precedente && args.precedente !== true ? resoudre(String(args.precedente)) : join(dossierResultats, core.cheminResultatTest(modele.id, modele.version - 1).split('/').pop());
  const precedent = existsSync(prec) ? core.lireResultatTesteur(lireJson(prec)) : null;
  if (!precedent) journal(`Re-check sans version précédente lisible (${prec}) : rapport complet seulement.`);
  else {
    const cmp = core.comparerVersions(precedent, resultat);
    for (const t of cmp.corriges) {
      t.vignetteAvant = t.vignette ?? null;
      const c = t.zonePx ? captureProche(t) : null;
      t.vignette = c?.exacte ? await vignette(c.f, t.zonePx, `apres-${t.empreinte}.jpg`).catch(() => null) : null;
    }
    for (const t of cmp.toujoursOuverts) t.vignetteAvant = precedent.tickets.find((p) => p.empreinte === t.empreinte)?.vignette ?? null;
    resultat = { ...resultat, comparaison: cmp };
    journal(`Re-check : ${cmp.corriges.length} corrigé(s), ${cmp.toujoursOuverts.length} toujours ouvert(s), ${cmp.nouveaux.length} nouveau(x)`);
  }
}

mkdirSync(dossierResultats, { recursive: true });
writeFileSync(cheminJson, `${JSON.stringify(resultat, null, 1)}\n`);
writeFileSync(join(sortie, 'resultat.json'), JSON.stringify(resultat, null, 1));
// Fichier lu par la chaîne (lireResultatsTests, faireTournerChaine de l'admin) : retours/tests-modeles.json, un résultat par
// modèle × version (les 3 dernières versions de chaque modèle). Seulement avec le dossier de résultats par défaut.
if (!args.resultats || args.resultats === true) {
  const agrege = join(DEPOT, 'retours', 'tests-modeles.json');
  const brut = existsSync(agrege) ? lireJson(agrege) : [];
  const liste = (Array.isArray(brut) ? brut : brut?.resultats ?? []).filter((r) => !(r.modele === resultat.modele && r.version === resultat.version));
  liste.push(resultat);
  const garde = liste.filter((r) => liste.filter((x) => x.modele === r.modele && x.version > r.version).length < 3);
  writeFileSync(agrege, `${JSON.stringify(Array.isArray(brut) ? garde : { ...brut, resultats: garde }, null, 1)}\n`);
}

const pastille = { vert: '🟢', orange: '🟠', rouge: '🔴' };
console.log(`\n${pastille[resultat.verdict]} Verdict ${resultat.verdict.toUpperCase()} — ${modele.nom} v${modele.version} (${(dureeMs / 60000).toFixed(1).replace('.', ',')} min)`);
for (const j of resultat.jeux) console.log(`  jeu ${j.id} : ${j.verdict} (${((j.dureeMs ?? 0) / 1000).toFixed(0)} s de construction et de contrôles)`);
for (const c of controles) console.log(`  ${pastille[c.verdict]} ${c.libelle} : ${c.mesure}${c.tickets ? ` — ${c.tickets} ticket(s)` : ''}`);
const parGravite = (g) => tries.filter((t) => t.gravite === g).length;
console.log(`\n${tries.length} ticket(s) : ${parGravite('bloquant')} bloquant(s), ${parGravite('majeur')} majeur(s), ${parGravite('mineur')} mineur(s)`);
for (const t of tries.filter((x) => x.gravite !== 'mineur').slice(0, 25)) console.log(`  [${t.gravite}] ${t.controle} ${t.jeu ?? ''} ${t.chemin} ${t.largeur ?? ''} — ${t.commentaire}`);
console.log(`\nRésultat : ${relative(DEPOT, cheminJson).replaceAll('\\', '/')}\nCaptures : ${join(sortie, 'captures')}`);
if (dureeMs > S.dureeMaxMs) console.log(`⚠ Durée ${(dureeMs / 60000).toFixed(1)} min > objectif ${S.dureeMaxMs / 60000} min.`);
process.exit(args['echec-si-rouge'] && resultat.verdict === 'rouge' ? 1 : 0);
