// npm run audit:mobile : PARCOURS « MOBILE SEUL » de la création d'un modèle (demande de Paul du 2026-10-10 : « je veux aussi qu'on
// puisse limite arriver à la création d'un modèle depuis mobile only »). Sur le banc de l'admin (copie, construction, faux Supabase
// local : mêmes principes que mesurer.mjs, aucun secret, aucun appel externe), le script JOUE chaque étape au doigt sur deux
// téléphones (Android Chrome 375 × 812 avec Chromium, iPhone 390 × 844 avec WebKit) et mesure à chaque écran :
//   - cibles tactiles < 44 px (liens dans un paragraphe exclus), débordement horizontal, éléments hors écran, textes qui débordent ;
//   - bouton d'action principal atteignable sans défiler (ou collant en bas), modales fermables ;
//   - clavier virtuel simulé (hauteur réduite de 320 px) : le champ reste visible et n'est pas masqué par une barre collante ;
//   - aperçus (iframes) : taille du texte rendu à l'écran, piège de double défilement (iframe défilante qui occupe presque l'écran) ;
//   - actions réservées au survol (classes hover:/group-hover: sans équivalent) ;
//   - temps de réponse d'un geste (du toucher à la première mise à jour de l'écran).
// Scénario (donnees.mjs + retouches) — chaîne en 3 étapes (2026-10-11) : designs gardés en file, modèle en vérification (test lancé,
// en cours), modèle en corrections techniques (demande à Claude), modèle en relecture finale, pages modifiées (avant / après), remarques
// chez Claude, modèle prêt pour le catalogue, modèle au catalogue ; « À valider » d'après les exports du dépôt. Lancement du testeur
// SIMULÉ (CHAINE_TESTEUR_SIMULE=1 : aucun appel à GitHub, lancement noté dans le faux Supabase).
// Sorties : captures de chaque étape et rapport.json dans --sortie (défaut : dossier temporaire), tableau des défauts à l'écran.
// Options : --sortie=<dossier> --appareils=android,iphone --garder --reutiliser=<dossier gardé> --reconstruire (avec --reutiliser :
//   recopie les sources et reconstruit) --etapes=admin,sujets,… --latence=15 --dossier=<parent du dossier du banc>
// Aucune écriture hors du dossier temporaire et de --sortie ; « Lancer le test » et « Publier » ne touchent que le faux Supabase
// (aucun jeton GitHub dans l'environnement du serveur : lancement automatique simulé, lancement à la main « non configuré »).
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODULES = join(RACINE, 'node_modules').replaceAll('\\', '/');
const opt = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const LATENCE = Number(opt.latence ?? 15);
const REUTIL = opt.reutiliser ? String(opt.reutiliser) : null;
const SORTIE = opt.sortie ? String(opt.sortie) : mkdtempSync(join(tmpdir(), 'audit-mobile-'));
mkdirSync(SORTIE, { recursive: true });
const APPAREILS = String(opt.appareils ?? 'android,iphone').split(',');
const ETAPES = opt.etapes ? new Set(String(opt.etapes).split(',')) : null;
// Banc réutilisé sans reconstruction : même port du faux Supabase que celui inscrit dans la construction (NEXT_PUBLIC_SUPABASE_URL)
const PORT_GARDE = REUTIL && !opt.reconstruire && existsSync(join(REUTIL, 'port.txt')) ? Number(readFileSync(join(REUTIL, 'port.txt'), 'utf8')) : null;
const PORT_SUPA = PORT_GARDE ?? 55490 + Math.floor(Math.random() * 300), PORT_APP = 3790 + Math.floor(Math.random() * 300);
const SUPA = `http://127.0.0.1:${PORT_SUPA}`, BASE = `http://localhost:${PORT_APP}`;

// ---- Copie et construction (comme mesurer.mjs) ----
const tmp = REUTIL ?? mkdtempSync(join(opt.dossier ? String(opt.dossier) : tmpdir(), 'audit-mobile-banc-'));
const app = join(tmp, 'apps', 'admin');
const copier = () => {
  writeFileSync(join(tmp, 'port.txt'), String(PORT_SUPA));
  for (const f of ['src', 'public', 'package.json', 'tsconfig.json', 'postcss.config.mjs']) { rmSync(join(app, f), { recursive: true, force: true }); cpSync(join(RACINE, 'apps', 'admin', f), join(app, f), { recursive: true }); }
  rmSync(join(tmp, 'node_modules', '@plateforme', 'core'), { recursive: true, force: true });
  cpSync(join(RACINE, 'packages', 'core'), join(tmp, 'node_modules', '@plateforme', 'core'), { recursive: true, filter: (s) => !s.includes('node_modules') });
  cpSync(join(RACINE, 'retours'), join(tmp, 'retours'), { recursive: true });
  cpSync(join(RACINE, 'packages', 'contenus'), join(tmp, 'packages', 'contenus'), { recursive: true, filter: (x) => !x.includes('node_modules') });
  mkdirSync(join(app, 'public', 'photos'), { recursive: true });
  cpSync(join(RACINE, 'apps', 'sites', 'public', 'photos'), join(app, 'public', 'photos'), { recursive: true, filter: (f) => !f.endsWith('.md') });
  writeFileSync(join(tmp, 'package.json'), JSON.stringify({ name: 'audit-mobile', private: true, workspaces: ['apps/*'] }));
  const pkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
  delete pkg.scripts.prebuild; delete pkg.scripts.predev;
  writeFileSync(join(app, 'package.json'), JSON.stringify(pkg, null, 2));
  writeFileSync(join(app, '.env.local'), `NEXT_PUBLIC_SUPABASE_URL=${SUPA}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=cle-publique-factice\n`);
  writeFileSync(join(app, 'next.config.ts'), `import type { NextConfig } from 'next';
import { resolve } from 'node:path';
const MODULES = ${JSON.stringify(MODULES)};
const nextConfig: NextConfig = {
  transpilePackages: ['@plateforme/core'],
  serverExternalPackages: ['sharp'],
  typescript: { ignoreBuildErrors: true },
  images: { remotePatterns: [{ protocol: 'http', hostname: '127.0.0.1', pathname: '/storage/v1/object/public/photos/**' }] },
  webpack: (config) => {
    config.resolve.modules = [...(config.resolve.modules ?? ['node_modules']), MODULES];
    config.resolve.alias = { ...(config.resolve.alias ?? {}), '@': resolve(process.cwd(), 'src') };
    config.resolveLoader = { ...(config.resolveLoader ?? {}), modules: [...(config.resolveLoader?.modules ?? ['node_modules']), MODULES] };
    return config;
  },
};
export default nextConfig;
`);
};
console.log(`▶ Banc : ${tmp}`);
// Reconstruction : cache de webpack vidé (un module du core resté en cache donnait « … is not a function »)
if (REUTIL && opt.reconstruire) rmSync(join(app, '.next'), { recursive: true, force: true });
if (!REUTIL || opt.reconstruire) copier();
// Environnement du serveur : liste blanche (aucun jeton, aucune clé : GITHUB_TOKEN, SUPABASE_SECRET_KEY… absents)
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|Path|PATHEXT|SystemRoot|SYSTEMROOT|windir|TEMP|TMP|USERPROFILE|HOME|APPDATA|LOCALAPPDATA|ComSpec|PROGRAMFILES|ProgramFiles|NUMBER_OF_PROCESSORS|OS)$/.test(k)));
Object.assign(env, { NODE_PATH: MODULES, NEXT_TELEMETRY_DISABLED: '1', PORT: '' });
// Vérification automatique SIMULÉE (lib/tests-auto.ts) : sans jeton GitHub, aucun appel externe, lancement noté dans le faux Supabase
Object.assign(env, { CHAINE_TESTEUR_SIMULE: '1' });
// Le serveur Next lit .env.local (adresse du faux Supabase) : NEXT_PUBLIC_* aussi passés pour la construction
Object.assign(env, { NEXT_PUBLIC_SUPABASE_URL: SUPA, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'cle-publique-factice' });
const next = join(MODULES, 'next', 'dist', 'bin', 'next');

// ---- Données du scénario ----
const donnees = join(tmp, 'donnees.json');
const scenario = join(tmp, 'scenario.json');
if (!existsSync(donnees)) spawnSync(process.execPath, [join(RACINE, 'scripts', 'perf-admin', 'donnees.mjs'), donnees, `http://127.0.0.1:PORT_SUPA`, '1'], { stdio: 'ignore' });
{
  // Adresse du faux Supabase propre à ce lancement (photos libres)
  const d = JSON.parse(readFileSync(donnees, 'utf8').replaceAll('http://127.0.0.1:PORT_SUPA', SUPA).replace(/http:\/\/127\.0\.0\.1:\d+\/storage/g, `${SUPA}/storage`));
  // Noms parlants par étape ; aucune relecture déjà faite sur le modèle à relire (16 pages à voir)
  const NOMS = { 'avis-humain': 'Relecture Azur', revalidation: 'Revalidation Sable', 'pret-validation': 'Prêt Lagune', retouche: 'Retouche Corail', finaliste: 'Finaliste Menthe', 'check-agent': 'Test Brume', publie: 'Publié Ivoire' };
  const vus = new Set();
  for (const f of d.modeles_fiches) if (NOMS[f.statut] && !vus.has(f.statut)) { vus.add(f.statut); f.nom = NOMS[f.statut]; }
  // Chaîne en 3 étapes : la 2e fiche en retouche devient des CORRECTIONS TECHNIQUES (relecture pas commencée : aucun avis ni remarque
  // humaine, défauts du testeur ouverts) ; « Test Brume » attend son test (lancé il y a 2 min : vérification en cours)
  const tech = d.modeles_fiches.filter((f) => f.statut === 'retouche')[1];
  if (tech) {
    tech.nom = 'Corrections Sauge';
    d.modeles_revues = d.modeles_revues.filter((r) => r.modele !== tech.id);
    d.modeles_tickets = d.modeles_tickets.filter((t) => t.modele !== tech.id || t.origine === 'testeur');
    const tt = d.modeles_tickets.filter((t) => t.modele === tech.id);
    for (const t of tt) { t.statut = 'ouvert'; t.etiquette = 'technique:debordement'; t.commentaire = 'Texte qui déborde de sa colonne sur téléphone.'; }
    if (!tt.length) d.modeles_tickets.push({ id: `00000000-0000-4000-8000-${'7'.repeat(12)}`, modele: tech.id, numero: 1, page: 'accueil', appareil: 'mobile', zone: null, element: null, etiquette: 'technique:debordement', commentaire: 'Texte qui déborde de sa colonne sur téléphone.', origine: 'testeur', gravite: 'majeur', controle: 'debordement', statut: 'ouvert', version_ouverture: tech.version_courante, version_correction: null, auteur: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    tech.version_retouche = tech.version_courante;
    // Sans résultat sur la version courante (sinon l’automate refermerait ces défauts, absents du résultat factice du banc)
    for (const v of d.modeles_versions) if (v.modele === tech.id && v.version === tech.version_courante) v.test = null;
  }
  const brume = d.modeles_fiches.find((f) => f.nom === 'Test Brume');
  if (brume) {
    for (const v of d.modeles_versions) if (v.modele === brume.id && v.version === brume.version_courante) v.test = null;
    d.modeles_revues = d.modeles_revues.filter((r) => r.modele !== brume.id);
    d.modeles_tickets = d.modeles_tickets.filter((t) => t.modele !== brume.id);
    d.modeles_tests_lances = [{ id: `00000000-0000-4000-8000-${'8'.repeat(12)}`, modele: brume.id, version: brume.version_courante, essai: 1, mode: 'check', echec: null, lance_par: null, created_at: new Date(Date.now() - 120_000).toISOString() }];
  }
  const relu = d.modeles_fiches.find((f) => f.nom === 'Relecture Azur');
  d.modeles_revues = d.modeles_revues.filter((r) => r.modele !== relu?.id);
  d.modeles_tickets = d.modeles_tickets.filter((t) => t.modele !== relu?.id);
  // Prêt à publier : tous les tickets fermés (verrous au vert, sauf ce que l'écran de publication vérifie lui-même)
  const pret = d.modeles_fiches.find((f) => f.nom === 'Prêt Lagune');
  for (const t of d.modeles_tickets) if (t.modele === pret?.id) t.statut = 'ferme';
  // En retouche : au moins deux tickets ouverts (la demande à Claude les cite)
  const ret = d.modeles_fiches.find((f) => f.nom === 'Retouche Corail');
  let k = 0; for (const t of d.modeles_tickets) if (t.modele === ret?.id && k++ < 2) t.statut = 'ouvert';
  // Revalidation : tickets « corrigés » dans la version courante (à revoir)
  const rev = d.modeles_fiches.find((f) => f.nom === 'Revalidation Sable');
  for (const t of d.modeles_tickets) if (t.modele === rev?.id) { t.statut = 'corrige'; t.version_correction = rev.version_courante; }
  writeFileSync(scenario, JSON.stringify(d));
  writeFileSync(join(SORTIE, 'scenario-ids.json'), JSON.stringify(Object.fromEntries(d.modeles_fiches.filter((f) => [...Object.values(NOMS), 'Corrections Sauge'].includes(f.nom)).map((f) => [f.nom, { id: f.id, statut: f.statut }])), null, 2));
}
const ids = JSON.parse(readFileSync(join(SORTIE, 'scenario-ids.json'), 'utf8'));

const enfants = [];
const lancer = (args, opts) => { const c = spawn(process.execPath, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] }); enfants.push(c); return c; };
const finir = () => { for (const c of enfants) if (c.exitCode === null) c.kill(); };
process.on('exit', finir);
const attendre = async (url, ms = 60000) => { const t = Date.now(); for (;;) { try { await fetch(url); return; } catch { if (Date.now() - t > ms) throw new Error(`${url} injoignable`); await new Promise((r) => setTimeout(r, 300)); } } };
const arreter = async (c) => { if (c && c.exitCode === null) { c.kill(); await new Promise((r) => c.once('exit', r)); } };

// ---- Session factice de l'admin (jeton lu par le faux Supabase seulement) ----
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const ADMIN = '00000000-0000-4000-8000-0000000000ad';
const exp = Math.floor(Date.now() / 1000) + 36000;
const tok = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: ADMIN, aud: 'authenticated', role: 'authenticated', exp, is_anonymous: false })}.c2ln`;
const session = { access_token: tok, refresh_token: `r-${ADMIN}-1`, token_type: 'bearer', expires_in: 36000, expires_at: exp, user: { id: ADMIN, email: 'admin@exemple-test.fr', aud: 'authenticated', role: 'authenticated' } };
const valeurCookie = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;

// ---- Mesures dans la page ----
// Défauts d'un écran (exécuté dans la page) : cibles, débordements, survol seul, iframes, modales
const MESURER = (opts) => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const visible = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const nom = (e) => { const t = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || e.getAttribute('name') || e.tagName).replace(/\s+/g, ' ').trim(); return `${e.tagName.toLowerCase()}${e.dataset.action ? `[data-action=${e.dataset.action}]` : ''} « ${t.slice(0, 50)} »`; };
  const cache = (e) => { for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return true; if (p.getAttribute('aria-hidden') === 'true') return true; if (p.tagName === 'DETAILS' && !p.open && p !== e && !e.closest('summary')) return true; } return false; };
  const defs = [];
  // 1. Débordement horizontal de la page
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) defs.push({ type: 'debordement-page', detail: `largeur ${sw} px pour un écran de ${vw} px` });
  // 2. Éléments hors écran (hors conteneurs à défilement horizontal volontaire)
  const dansDefileur = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
  const hors = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (e.closest('svg') && e.tagName !== 'svg') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if ((r.right > vw + 1 || r.left < -1) && visible(e) && !cache(e) && !dansDefileur(e) && getComputedStyle(e).position !== 'fixed') hors.push(e);
  }
  for (const e of hors.filter((e) => !hors.some((p) => p !== e && p.contains(e))).slice(0, 6)) { const r = e.getBoundingClientRect(); defs.push({ type: 'hors-ecran', detail: `${nom(e)} : ${Math.round(r.left)} → ${Math.round(r.right)} px` }); }
  // 3. Cibles tactiles < 44 px (liens dans un paragraphe exclus : exception WCAG 2.5.8 « en ligne »)
  const cibles = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=checkbox]')];
  const petites = [];
  for (const e of cibles) {
    if (!visible(e) || cache(e)) continue;
    let r = e.getBoundingClientRect();
    // Case à cocher dans un libellé : la cible est le libellé
    if ((e.type === 'checkbox' || e.type === 'radio') && e.closest('label')) r = e.closest('label').getBoundingClientRect();
    if (e.tagName === 'A' && getComputedStyle(e).display === 'inline') { const p = e.parentElement; const texte = [...p.childNodes].some((n) => n !== e && n.nodeType === 3 && n.textContent.trim().length > 2); if (texte) continue; }
    if (r.height < 43.5 || r.width < 43.5) petites.push(`${nom(e)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  if (petites.length) defs.push({ type: 'cible-petite', n: petites.length, detail: [...new Set(petites)].slice(0, 8).join(' ; ') });
  // 4. Textes qui débordent de leur boîte (sans troncature volontaire)
  const deb = [];
  for (const e of document.body.querySelectorAll('p, span, a, button, h1, h2, h3, li, label, strong, td, th, summary')) {
    if (!visible(e) || cache(e)) continue;
    const s = getComputedStyle(e);
    if (s.overflowX !== 'visible' || s.textOverflow === 'ellipsis') continue;
    if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && s.display !== 'inline') { const r = e.getBoundingClientRect(); if (r.left + e.scrollWidth > vw + 1) deb.push(`${nom(e)} (${e.scrollWidth} > ${e.clientWidth})`); }
  }
  if (deb.length) defs.push({ type: 'texte-deborde', detail: deb.slice(0, 5).join(' ; ') });
  // 5. Actions au survol seul : caché par défaut, montré par hover:/group-hover: sans équivalent focus / toucher
  const survol = [];
  for (const e of document.querySelectorAll('[class*="hover:"]')) {
    const c = typeof e.className === 'string' ? e.className : '';
    if (/(^|\s)(opacity-0|invisible|hidden)(\s|$)/.test(c) && /(group-)?hover:(opacity-100|visible|block|flex|grid|inline)/.test(c) && !/(focus|focus-within|focus-visible|\[@media\(hover:none\)\]|pointer-coarse|active):/.test(c)) survol.push(nom(e));
  }
  if (survol.length) defs.push({ type: 'survol-seul', detail: survol.slice(0, 5).join(' ; ') });
  // 6. Aperçus (iframes) : texte rendu, double défilement
  const ifr = [];
  for (const f of document.querySelectorAll('iframe')) {
    if (!visible(f)) continue;
    const r = f.getBoundingClientRect();
    const d = f.contentDocument;
    const inerte = getComputedStyle(f).pointerEvents === 'none';
    if (!d?.body) continue;
    const echelle = r.width / (f.contentWindow.innerWidth || r.width);
    const textes = [...d.body.querySelectorAll('p, li')].filter((x) => x.textContent.trim().length > 20).slice(0, 12);
    const tailles = textes.map((x) => parseFloat(f.contentWindow.getComputedStyle(x).fontSize) * echelle).sort((a, b) => a - b);
    const mediane = tailles.length ? tailles[Math.floor(tailles.length / 2)] : null;
    const se = d.scrollingElement;
    const defile = se && se.scrollHeight > se.clientHeight + 4 && f.contentWindow.getComputedStyle(d.body).overflow !== 'hidden' && f.contentWindow.getComputedStyle(d.documentElement).overflowY !== 'hidden';
    const info = { l: Math.round(r.width), h: Math.round(r.height), echelle: +echelle.toFixed(2), texte: mediane ? +mediane.toFixed(1) : null, defile: Boolean(defile), vignette: r.height < 420 };
    ifr.push(info);
    if (!info.vignette && mediane && mediane < 11) defs.push({ type: 'apercu-illisible', detail: `aperçu ${info.l}×${info.h} : texte courant rendu à ${info.texte} px (échelle ${info.echelle})` });
    if (defile && !inerte && r.height > 0.72 * vh) defs.push({ type: 'double-defilement', detail: `aperçu défilant de ${info.h} px pour un écran de ${vh} px : le doigt y reste piégé` });
  }
  // 7. Modales : un bouton de fermeture ≥ 44 px
  for (const m of document.querySelectorAll('[role=dialog], dialog[open], [aria-modal=true]')) {
    if (!visible(m)) continue;
    const fermer = [...m.querySelectorAll('button, a')].find((b) => /fermer|annuler|close|×|✕|retour/i.test(`${b.textContent} ${b.getAttribute('aria-label') ?? ''}`));
    if (!fermer) defs.push({ type: 'modale-sans-fermeture', detail: nom(m) });
    else { const r = fermer.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) defs.push({ type: 'modale-fermeture-petite', detail: `${nom(fermer)} ${Math.round(r.width)}×${Math.round(r.height)}` }); }
  }
  // 8. Action principale atteignable sans défiler
  // « sélecteur@haut » : contenu à regarder (carte), son haut doit être dans la moitié haute de l'écran
  for (const brut of opts.actions ?? []) {
    const haut = brut.endsWith('@haut'), sel = brut.replace(/@haut$/, '');
    const e = document.querySelector(sel);
    if (!e) { defs.push({ type: 'action-absente', detail: sel }); continue; }
    const r = e.getBoundingClientRect();
    const dedans = haut ? r.top >= -1 && r.top <= 0.5 * vh : r.top >= 0 && r.bottom <= vh + 1 && r.height > 0;
    if (!dedans) defs.push({ type: 'action-hors-ecran', detail: `${nom(e)} à ${Math.round(r.top)} px (écran ${vh} px) : il faut défiler` });
  }
  return { defauts: defs, iframes: ifr, hauteurPage: document.documentElement.scrollHeight };
};

// ---- Gestes ----
async function glisser(page, cdp, x0, y0, dx, dy, ms = 260) {
  const n = 10;
  if (cdp) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (dx * i) / n, y: y0 + (dy * i) / n }] }); await page.waitForTimeout(ms / n); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return;
  }
  // WebKit (pas de CDP) : événements pointeur « touch » synthétiques sur l'élément sous le doigt
  await page.evaluate(async ([x0, y0, dx, dy, ms, n]) => {
    const cible = document.elementFromPoint(Math.max(1, Math.min(innerWidth - 1, x0)), Math.max(1, Math.min(innerHeight - 1, y0)));
    if (!cible) return;
    const ev = (type, x, y) => cible.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', x0, y0);
    for (let i = 1; i <= n; i++) { ev('pointermove', x0 + (dx * i) / n, y0 + (dy * i) / n); await new Promise((r) => setTimeout(r, ms / n)); }
    ev('pointerup', x0 + dx, y0 + dy);
  }, [x0, y0, dx, dy, ms, n]);
}
async function appuiLong(page, cdp, x, y, ms = 650) {
  if (cdp) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return;
  }
  await page.evaluate(async ([x, y, ms]) => {
    const cible = document.elementFromPoint(x, y);
    if (!cible) return;
    const ev = (type) => cible.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown'); await new Promise((r) => setTimeout(r, ms)); ev('pointerup');
  }, [x, y, ms]);
}
/** Temps de réponse d'un geste : du geste à la première mutation du DOM suivie d'une image (rAF) */
async function chrono(page, faire) {
  await page.evaluate(() => { window.__rep = new Promise((ok) => { const t0 = performance.now(); const o = new MutationObserver(() => { o.disconnect(); requestAnimationFrame(() => ok(Math.round(performance.now() - t0))); }); o.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); setTimeout(() => { o.disconnect(); ok(null); }, 8000); }); });
  await faire();
  return page.evaluate(() => window.__rep);
}

// ---- Parcours ----
const rapport = { date: new Date().toISOString(), appareils: {} };
const APP = {
  android: { navigateur: 'chromium', viewport: { width: 375, height: 812 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
  iphone: { navigateur: 'webkit', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
};
const pw = createRequire(join(RACINE, 'package.json'))('playwright');

let supa = null, serveur = null;
const demarrerServeurs = async () => {
  await arreter(serveur); await arreter(supa);
  supa = lancer(['--max-old-space-size=4096', join(RACINE, 'scripts', 'perf-admin', 'faux-supabase.mjs')], { env: { ...env, PORT: String(PORT_SUPA), LATENCE_MS: String(LATENCE), DONNEES: scenario } });
  await attendre(SUPA + '/__stats', 120000);
  serveur = lancer([next, 'start', '-p', String(PORT_APP)], { cwd: app, env });
  const j = createWriteStream(join(tmp, 'serveur.log'), { flags: 'a' }); serveur.stdout.pipe(j); serveur.stderr.pipe(j);
  await attendre(BASE + '/connexion', 120000);
};

try {
  if (!REUTIL || opt.reconstruire) {
    console.log('▶ Construction (next build --webpack)…');
    const t = Date.now();
    const b = spawnSync(process.execPath, [next, 'build', '--webpack'], { cwd: app, env, encoding: 'utf8' });
    if (b.status !== 0) { console.error(b.stdout.slice(-3000), b.stderr.slice(-3000)); throw new Error('construction en échec'); }
    console.log(`  construite en ${((Date.now() - t) / 1000).toFixed(0)} s`);
  }
  for (const nomApp of APPAREILS) {
    const a = APP[nomApp];
    await demarrerServeurs();
    console.log(`▶ ${nomApp} (${a.navigateur}, ${a.viewport.width} × ${a.viewport.height})`);
    const navigateur = await pw[a.navigateur].launch();
    const ctx = await navigateur.newContext({ viewport: a.viewport, deviceScaleFactor: 2, isMobile: a.navigateur === 'chromium' ? true : undefined, hasTouch: true, userAgent: a.userAgent, locale: 'fr-FR' });
    if (a.navigateur === 'chromium') await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
    await ctx.addCookies([{ name: 'sb-127-auth-token', value: valeurCookie, domain: 'localhost', path: '/' }]);
    // Presse-papiers et partage observés (WebKit sans permission de presse-papiers ; partage absent des navigateurs sans écran)
    await ctx.addInitScript(() => {
      window.__copies = []; window.__partages = [];
      try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copies.push(t); } } }); } catch { /* ignoré */ }
      try { Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__partages.push(d); } }); Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true }); } catch { /* ignoré */ }
    });
    const page = await ctx.newPage();
    const cdp = a.navigateur === 'chromium' ? await ctx.newCDPSession(page) : null;
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(String(e).slice(0, 200)));
    const res = (rapport.appareils[nomApp] = { etapes: [] });
    let n = 0;
    const capture = async (nom, plein = false) => { const f = `${String(++n).padStart(2, '0')}-${nomApp}-${nom}.png`; await page.screenshot({ path: join(SORTIE, f), fullPage: plein }); return f; };
    const etape = async (nom, faire) => {
      if (ETAPES && !ETAPES.has(nom.split(':')[0])) return;
      const e = { nom, defauts: [], gestes: [], captures: [], notes: [] };
      res.etapes.push(e);
      const t0 = Date.now();
      try { await faire(e); } catch (err) { e.defauts.push({ type: 'bloquant', detail: String(err.message ?? err).split('\n')[0].slice(0, 300) }); try { e.captures.push(await capture(`${nom.replace(/[^a-z0-9-]/gi, '-')}-echec`)); } catch { /* ignoré */ } }
      e.ms = Date.now() - t0;
      console.log(`  ${nom.padEnd(34)} ${e.defauts.length ? e.defauts.map((d) => d.type).join(', ') : 'ok'}${e.gestes.length ? `  gestes : ${e.gestes.map((g) => `${g.nom} ${g.ms ?? '—'} ms`).join(' · ')}` : ''}`);
    };
    const mesurer = async (e, nom, actions = []) => { const m = await page.evaluate(MESURER, { actions }); for (const d of m.defauts) e.defauts.push({ ...d, ecran: nom }); e.iframes = [...(e.iframes ?? []), ...m.iframes.map((x) => ({ ...x, ecran: nom }))]; e.captures.push(await capture(nom)); return m; };
    const aller = async (url) => { await page.goto(BASE + url, { waitUntil: 'load', timeout: 120000 }); await page.waitForTimeout(800); };
    const toucher = async (e, nom, loc) => { await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => null); const ms = await chrono(page, () => loc.tap({ timeout: 10000 })); e.gestes.push({ nom, ms }); if (ms !== null && ms > 300) e.defauts.push({ type: 'geste-lent', detail: `${nom} : ${ms} ms avant la première mise à jour` }); return ms; };
    /** Clavier virtuel simulé : hauteur réduite, le champ doit rester visible et non masqué */
    const clavier = async (e, nom, loc) => {
      await loc.tap(); await page.waitForTimeout(200);
      const h = a.viewport.height;
      await page.setViewportSize({ width: a.viewport.width, height: h - 320 });
      await page.waitForTimeout(250);
      await loc.evaluate((el) => el.scrollIntoView?.({ block: 'nearest' }));
      await page.waitForTimeout(250);
      const r = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); const x = r.left + Math.min(20, r.width / 2), y = r.top + Math.min(16, r.height / 2); const dessus = document.elementFromPoint(x, y); return { haut: r.top, bas: r.bottom, vh: window.innerHeight, masque: dessus && dessus !== el && !el.contains(dessus) ? (dessus.closest('[class]')?.className ?? dessus.tagName).toString().slice(0, 80) : null }; });
      e.captures.push(await capture(`${nom}-clavier`));
      if (r.haut < 0 || r.haut > r.vh - 24) e.defauts.push({ type: 'clavier-masque-champ', detail: `${nom} : champ à ${Math.round(r.haut)} px, zone visible ${r.vh} px` });
      else if (r.masque) e.defauts.push({ type: 'clavier-champ-recouvert', detail: `${nom} : recouvert par ${r.masque}` });
      await page.setViewportSize(a.viewport);
      await page.waitForTimeout(200);
    };

    // 1. /admin : carte « Presque fini »
    await etape('admin', async (e) => {
      await aller('/admin');
      await page.locator('[data-presque-fini]').first().waitFor({ timeout: 30000 }).catch(() => e.notes.push('carte « Presque fini » absente'));
      await mesurer(e, 'admin', ['[data-presque-fini]']);
      const c = page.locator('[data-presque-fini]').first();
      if (await c.count()) { e.notes.push(`Presque fini → ${await c.getAttribute('href')}`); }
    });
    // 2. « À valider » : tuiles, puis un sujet (glisser OK / Pas OK, appui long pour commenter, saisie)
    await etape('sujets', async (e) => {
      await aller('/admin/sujets');
      await mesurer(e, 'sujets-tuiles');
      const tuile = page.locator('a[href^="/admin/sujets/"]').first();
      if (!(await tuile.count())) { e.notes.push('aucune tuile de sujet'); return; }
      await toucher(e, 'ouvrir un sujet', tuile);
      await page.waitForURL(/\/admin\/sujets\/[^/?]+/, { timeout: 30000 });
      await page.waitForTimeout(1500);
      const carte = page.locator('article[aria-label^="Carte"]').first();
      if (!(await carte.count())) { await mesurer(e, 'sujet-vide'); e.notes.push('sujet sans carte'); return; }
      await page.waitForTimeout(800);
      await mesurer(e, 'sujet-carte', ['article[aria-label^="Carte"]@haut']);
      const titre = async () => (await carte.getAttribute('aria-label')) ?? '';
      // Point du geste : dans le visuel de la carte, au-dessus de la barre des gestes (pas sur les commandes de l'aperçu)
      const yCarte = (b) => Math.max(b.y + 40, Math.min(b.y + b.height - 40, a.viewport.height - 230));
      // Glisser à droite = OK
      let avant = await titre();
      let b = await carte.boundingBox();
      const ms = await chrono(page, () => glisser(page, cdp, b.x + b.width / 2, yCarte(b), 170, 4));
      await page.waitForTimeout(600);
      e.gestes.push({ nom: 'glisser à droite (OK)', ms });
      if ((await titre()) === avant && !(await page.getByText(/OK|noté/i).first().count())) e.defauts.push({ type: 'geste-sans-effet', detail: 'glisser à droite : la carte ne change pas' });
      e.captures.push(await capture('sujet-apres-glisser'));
      // Appui long sur la carte : commentaire
      b = await carte.boundingBox();
      if (b) {
        await appuiLong(page, cdp, b.x + b.width / 2, yCarte(b));
        await page.waitForTimeout(400);
        const champ = page.locator('textarea').first();
        if (await champ.isVisible().catch(() => false)) { e.notes.push('appui long → commentaire ouvert'); await clavier(e, 'sujet-commentaire', champ); await champ.fill('Couleur trop pâle sur téléphone.'); }
        else { e.defauts.push({ type: 'geste-absent', detail: 'appui long sur la carte : aucun commentaire (bouton « 💬 Commenter » seulement)' }); const bt = page.getByRole('button', { name: /Commenter/ }); if (await bt.count()) { await bt.tap(); await page.waitForTimeout(300); const c2 = page.locator('textarea').first(); if (await c2.count()) { await clavier(e, 'sujet-commentaire', c2); await c2.fill('Couleur trop pâle sur téléphone.'); } } }
      }
      // Glisser à gauche = Pas OK (avec le commentaire)
      avant = await titre();
      b = await carte.boundingBox();
      if (b) { const ms2 = await chrono(page, () => glisser(page, cdp, b.x + b.width / 2, yCarte(b), -170, 3)); e.gestes.push({ nom: 'glisser à gauche (Pas OK)', ms: ms2 }); await page.waitForTimeout(600); }
      await mesurer(e, 'sujet-apres-pas-ok');
    });
    // 3. Présélection (pages de 6, garder)
    await etape('preselection', async (e) => {
      await aller('/chaine/preselection');
      await page.locator('[data-carte-preselection]').first().waitFor({ timeout: 60000 });
      await page.waitForTimeout(2500);
      await mesurer(e, 'preselection', ['[data-page-preselection="ouverte"] [data-action="garder"]']);
      const cartes = page.locator('[data-page-preselection="ouverte"] [data-carte-preselection] > button[aria-pressed]');
      await toucher(e, 'toucher une carte', cartes.nth(0));
      await toucher(e, 'toucher une 2e carte', cartes.nth(3));
      await mesurer(e, 'preselection-2-choisies', ['[data-page-preselection="ouverte"] [data-action="garder"]']);
      const garder = page.locator('[data-page-preselection="ouverte"] [data-action="garder"]').first();
      await toucher(e, 'Garder', garder);
      await page.waitForTimeout(1500);
      e.captures.push(await capture('preselection-gardee'));
    });
    // 4. Tournoi (grilles 2 parmi 6)
    await etape('tournoi', async (e) => {
      await aller('/chaine/tournoi');
      const grille = page.locator('[data-carte-tournoi]').first();
      const duel = page.locator('[data-duel]').first();
      const fini = page.locator('[data-etat-tournoi="fini"]').first();
      await Promise.race([grille.waitFor({ timeout: 60000 }), duel.waitFor({ timeout: 60000 }), fini.waitFor({ timeout: 60000 })]).catch(() => null);
      await page.waitForTimeout(2500);
      if (await grille.count()) {
        await mesurer(e, 'tournoi-grille', ['[data-action="valider-grille"]']);
        const c = page.locator('[data-carte-tournoi] > button');
        await toucher(e, 'n° 1', c.nth(1)); await toucher(e, 'n° 2', c.nth(4));
        await mesurer(e, 'tournoi-2-choisis', ['[data-action="valider-grille"]']);
        await toucher(e, 'Valider la grille', page.locator('[data-action="valider-grille"]'));
        await page.waitForTimeout(2500);
        e.captures.push(await capture('tournoi-grille-suivante'));
      } else if (await duel.count()) {
        await mesurer(e, 'tournoi-duel', ['[data-voter="a"]']);
        await toucher(e, 'Je préfère A', page.locator('[data-voter="a"]'));
      } else await mesurer(e, 'tournoi-fini');
    });
    // 5. Tableau de la chaîne (bandeau « Prochaine étape »)
    await etape('chaine', async (e) => {
      await aller('/chaine');
      await mesurer(e, 'chaine', ['[data-prochaine-action]@haut']);
      e.captures.push(await capture('chaine-pleine', true));
    });
    // 6. Vérification automatique : la fiche ne montre qu'une pastille (test lancé seul) ; « Lancer le test » seulement si bloqué
    await etape('verification', async (e) => {
      await aller(`/chaine/modele/${ids['Test Brume'].id}`);
      await mesurer(e, 'verification-fiche', ['[data-verification]@haut']);
      e.notes.push(`pastille : ${(await page.locator('[data-verification]').first().textContent().catch(() => '')) ?? ''}`);
      if (await page.locator('[data-action="tester-modele"]').first().isVisible().catch(() => false)) e.notes.push('bouton « Lancer le test » visible (vérification bloquée ou non configurée)');
      await aller(`/chaine/revision/${ids['Test Brume'].id}`);
      await page.locator('[data-ecran]').first().waitFor({ timeout: 60000 }).catch(() => null);
      await mesurer(e, 'verification-en-cours');
    });
    // 6 bis. Corrections techniques : une seule demande « Envoyer à Claude » (Paul)
    await etape('corrections', async (e) => {
      const id = ids['Corrections Sauge']?.id;
      if (!id) { e.notes.push('pas de fiche « Corrections Sauge » dans le scénario'); return; }
      await aller(`/chaine/revision/${id}`);
      await page.locator('[data-ecran]').first().waitFor({ timeout: 60000 }).catch(() => null);
      await mesurer(e, 'corrections-techniques', ['[data-action="partager-claude"]']);
      e.notes.push(`écran : ${await page.locator('[data-attente]').first().getAttribute('data-attente').catch(() => '?')}`);
    });
    // 7. Relecture guidée : ✓ / ✎, zone au doigt, images ‹ ›, récapitulatif, demande à Claude (copier, partager)
    await etape('relecture', async (e) => {
      const id = ids['Relecture Azur'].id;
      await aller(`/chaine/revision/${id}`);
      await page.locator('[data-action="page-ok"]').waitFor({ timeout: 60000 });
      await page.waitForTimeout(2500);
      await mesurer(e, 'relecture-page1', ['[data-action="page-ok"]', '[data-action="remarque"]']);
      // Défilement dans l'aperçu : la page suit-elle ?
      const f = page.locator('iframe').first();
      const bf = await f.boundingBox();
      if (bf) {
        const y0 = await page.evaluate(() => window.scrollY);
        await glisser(page, cdp, bf.x + bf.width / 2, Math.min(bf.y + bf.height - 40, a.viewport.height - 160), 0, -300, 300);
        await page.waitForTimeout(500);
        const y1 = await page.evaluate(() => window.scrollY);
        const yi = await f.evaluate((x) => x.contentWindow?.scrollY ?? 0).catch(() => 0);
        e.notes.push(`glisser dans l'aperçu : page ${y1 - y0} px, aperçu ${yi} px`);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await toucher(e, '✓ Page OK', page.locator('[data-action="page-ok"]'));
      await page.waitForTimeout(1500);
      e.notes.push(`après ✓ : ${await page.locator('[data-etape]').first().getAttribute('data-etape')}`);
      // Image en situation : toucher une photo / l'illustration de l'aperçu
      const fr = page.frameLocator('iframe').first();
      const img = fr.locator('[class*="heros-theme--"], img').first();
      if (await img.count().catch(() => 0)) {
        await img.tap({ timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(500);
        const suiv = page.locator('button[aria-label*="suivante" i], button:has-text("›")').first();
        if (await suiv.isVisible().catch(() => false)) { await toucher(e, 'image suivante ›', suiv); await mesurer(e, 'relecture-choix-image'); const ch = page.getByRole('button', { name: /^(Choisir|Garder)/ }).first(); if (await ch.count()) await toucher(e, 'Choisir l’image', ch); await page.waitForTimeout(800); }
        else e.notes.push('toucher l’image : pas de contrôle ‹ ›');
        const fermer = page.locator('button[aria-label*="Fermer" i]').first(); if (await fermer.isVisible().catch(() => false)) await fermer.tap();
      } else e.notes.push('aucune image touchable dans l’aperçu');
      // ✎ Il manque : note au clavier, zone entourée au doigt
      await toucher(e, '✎ Il manque', page.locator('[data-action="remarque"]'));
      await page.waitForTimeout(500);
      const note = page.locator('[data-remarque] textarea');
      await clavier(e, 'relecture-note', note);
      await note.fill('Le titre est coupé sur téléphone.');
      const zone = page.getByRole('button', { name: /Signaler une zone/ }).first();
      if (await zone.count()) {
        await toucher(e, 'Signaler une zone', zone);
        await page.waitForTimeout(300);
        const surf = page.locator('[data-remarque]').locator('xpath=preceding::iframe[1]');
        const bs = await page.locator('iframe').first().boundingBox();
        if (bs) { await page.evaluate(() => window.scrollTo(0, 0)); const b2 = await page.locator('iframe').first().boundingBox(); await glisser(page, cdp, b2.x + 60, Math.max(b2.y + 80, 120), 120, 90, 300); await page.waitForTimeout(400); }
        void surf;
        await mesurer(e, 'relecture-zone');
      } else e.notes.push('pas de bouton « Signaler une zone »');
      await mesurer(e, 'relecture-remarque', ['[data-action="enregistrer-remarque"]']);
      await toucher(e, 'Enregistrer et page suivante', page.locator('[data-action="enregistrer-remarque"]'));
      await page.waitForTimeout(1500);
      // Récapitulatif → envoi → demande à Claude
      const recap = page.getByRole('button', { name: 'Récapitulatif' }).first();
      if (await recap.count()) await toucher(e, 'Récapitulatif', recap);
      await page.waitForTimeout(800);
      await mesurer(e, 'relecture-recapitulatif');
      // Le reste des pages : « Page OK » enchaînés jusqu'au récapitulatif complet
      for (let k = 0; k < 20; k++) {
        const rep = page.locator('[data-action="reprendre"]');
        if (!(await rep.count())) break;
        await rep.tap(); await page.waitForTimeout(700);
        const ok = page.locator('[data-action="page-ok"]');
        if (!(await ok.count())) break;
        await ok.tap(); await page.waitForTimeout(900);
        if (await page.locator('[data-ecran="recapitulatif"]').count()) continue;
        const r2 = page.getByRole('button', { name: 'Récapitulatif' }).first(); if (await r2.count()) { await r2.tap(); await page.waitForTimeout(600); }
      }
      const env2 = page.locator('[data-action="envoyer-claude"]');
      if (await env2.count()) {
        await toucher(e, 'Envoyer les remarques à Claude', env2);
        await page.waitForTimeout(2000);
        await mesurer(e, 'relecture-demande-claude');
      } else e.notes.push('pas de bouton « Envoyer les remarques à Claude »');
      const copier = page.locator('[data-action="copier-claude"]').first();
      if (await copier.count()) {
        await toucher(e, 'Copier', copier);
        const copies = await page.evaluate(() => window.__copies);
        e.notes.push(`copié : ${copies.length ? copies.at(-1).split('\n')[0].slice(0, 100) : 'rien'} (${copies.length ? copies.at(-1).split('\n').length : 0} lignes)`);
        if (!copies.length) e.defauts.push({ type: 'copie-echec', detail: 'rien dans le presse-papiers' });
        else if (!/retouches-modeles\.json/.test(copies.at(-1)) || !/#\d+/.test(copies.at(-1))) e.defauts.push({ type: 'demande-incomplete', detail: 'la demande ne contient pas les tickets en clair ou la livraison' });
        const partager = page.locator('[data-action="partager-claude"]').first();
        if (await partager.count()) { await toucher(e, 'Envoyer à Claude', partager); await page.waitForTimeout(600); const p2 = await page.evaluate(() => window.__partages); e.notes.push(`partagé : ${p2.length ? JSON.stringify({ title: p2.at(-1).title, lignes: p2.at(-1).text.split('\n').length }) : 'rien'}`); if (!p2.length) e.defauts.push({ type: 'partage-echec', detail: 'navigator.share pas appelé' }); e.notes.push(`export : ${(await page.locator('[data-phrase-claude] [role=status]').first().textContent().catch(() => '')) ?? ''}`); }
        else e.defauts.push({ type: 'partage-absent', detail: 'pas de bouton « Envoyer à Claude » (navigator.share)' });
        await mesurer(e, 'relecture-demande-envoyee');
      }
    });
    // 8. Revalidation avant / après
    await etape('revalidation', async (e) => {
      await aller(`/chaine/revision/${ids['Revalidation Sable'].id}`);
      await page.locator('[data-action="page-ok"], [data-ecran]').first().waitFor({ timeout: 60000 });
      await page.waitForTimeout(2500);
      await mesurer(e, 'revalidation', ['[data-action="page-ok"]']);
      const av = page.getByRole('button', { name: /^Avant/ }).first();
      if (await av.isVisible().catch(() => false)) { await toucher(e, 'Avant', av); await page.waitForTimeout(800); e.captures.push(await capture('revalidation-avant')); await page.getByRole('button', { name: /^Après/ }).first().tap(); }
      else e.notes.push('pas de bascule avant / après visible');
      const ok = page.locator('[data-action="page-ok"]');
      if (await ok.count()) { await toucher(e, '✓ C’est bon', ok); await page.waitForTimeout(800); }
      await mesurer(e, 'revalidation-suite');
    });
    // 9. En retouche : demande à Claude
    await etape('retouche', async (e) => {
      await aller(`/chaine/revision/${ids['Retouche Corail'].id}`);
      await page.locator('[data-ecran]').first().waitFor({ timeout: 60000 }).catch(() => null);
      await mesurer(e, 'retouche-demande', ['[data-action="partager-claude"]']);
      const env3 = page.locator('[data-action="partager-claude"]').first();
      if (await env3.count()) { await toucher(e, 'Envoyer à Claude', env3); await page.waitForTimeout(500); const p3 = await page.evaluate(() => window.__partages); e.notes.push(`partage : ${p3.length ? p3.at(-1).title : 'rien'}`); e.captures.push(await capture('retouche-envoyee')); }
    });
    // 10. Écran « Ajouter au catalogue » (profils cochés)
    await etape('publication', async (e) => {
      await aller(`/chaine/revision/${ids['Prêt Lagune'].id}`);
      await page.locator('[data-ecran]').first().waitFor({ timeout: 60000 }).catch(() => null);
      const bloque = await page.locator('[data-ecran="publication"] .text-red-800').count();
      await mesurer(e, 'publication', bloque ? [] : ['[data-action="publier"]']);
      if (bloque) e.notes.push(`verrous du scénario non verts (jauge / éléments du faux Supabase) : ${await page.locator('[data-ecran="publication"] .text-red-800').first().textContent()}`);
      const cases = page.locator('[data-ecran="publication"] input[type=checkbox]');
      if (await cases.count()) await toucher(e, 'cocher un profil', cases.nth(0).locator('xpath=..'));
      const pub = page.locator('[data-action="publier"]');
      if (await pub.count() && await pub.isEnabled()) { await toucher(e, 'Ajouter au catalogue', pub); await page.waitForTimeout(400); await mesurer(e, 'publication-confirmer', ['[data-action="confirmer-publication"]']); }
      else e.notes.push((await page.locator('[data-ecran="publication"] .text-red-800').first().textContent().catch(() => '')) || 'bouton « Ajouter au catalogue » absent ou désactivé');
    });
    // 11. Catalogue : un modèle publié (et la colonne Catalogue du tableau)
    await etape('catalogue', async (e) => {
      await aller(`/chaine/revision/${ids['Publié Ivoire'].id}`);
      await page.locator('[data-ecran]').first().waitFor({ timeout: 60000 }).catch(() => null);
      await mesurer(e, 'catalogue-modele');
      await aller('/chaine');
      await page.locator('[data-colonne="catalogue"]').first().scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(400);
      e.captures.push(await capture('catalogue-colonne'));
    });
    res.erreursJs = erreurs;
    await navigateur.close();
  }
  writeFileSync(join(SORTIE, 'rapport.json'), JSON.stringify(rapport, null, 2));
  // Tableau des défauts
  console.log('\n▶ Défauts par étape');
  for (const [nomApp, r] of Object.entries(rapport.appareils)) {
    for (const e of r.etapes) for (const d of e.defauts) console.log(`  ${nomApp.padEnd(8)} ${e.nom.padEnd(14)} ${d.type.padEnd(24)} ${d.ecran ?? ''} ${d.n ? `(${d.n}) ` : ''}${d.detail}`);
    if (r.erreursJs.length) console.log(`  ${nomApp} erreurs JS : ${r.erreursJs.slice(0, 5).join(' | ')}`);
  }
  console.log(`\nCaptures et rapport : ${SORTIE}`);
} finally {
  finir();
  if (!opt.garder && !REUTIL) { await new Promise((r) => setTimeout(r, 1500)); rmSync(tmp, { recursive: true, force: true, maxRetries: 5 }); }
}
