// Contrôle de la découvrabilité par les assistants IA (grille de docs/decouvrabilite-agents.md).
// Construit le site de démo comme un site en ligne (CONTROLE_INDEXABLE=1) dans un dossier temporaire, puis
// vérifie robots.txt, llms.txt, llms-full.txt, versions Markdown, AGENTS.md, sitemap, données structurées,
// en-têtes Cloudflare et négociation de contenu ; affiche un score sur 100.
// Usage : node scripts/controle-agents.mjs [dossier-dist-existant]
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { cheminWindows } from '../../../packages/core/scripts/chemins.mjs';

const racineSites = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
let dist = cheminWindows(process.argv[2]);
if (!dist) {
  dist = join(tmpdir(), 'controle-agents-dist');
  rmSync(dist, { recursive: true, force: true });
  console.log(`→ Construction du site de démo (comme en ligne) dans ${dist}…`);
  execSync(`npx astro build --outDir "${dist}"`, {
    cwd: racineSites,
    stdio: 'ignore',
    env: { ...process.env, SITE_ID: process.env.SITE_ID ?? 'demo-podologue-lyon', CONTROLE_INDEXABLE: '1' },
  });
}

// ---------- Outils ----------
const lire = (f) => (existsSync(join(dist, f)) ? readFileSync(join(dist, f), 'utf8') : null);
const fichiers = (d = dist) =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? fichiers(join(d, f)) : [relative(dist, join(d, f)).replaceAll('\\', '/')]));
const tous = fichiers();
const resultats = [];
/** Un critère de la grille : identifiant, libellé, liste des problèmes (vide = réussi). */
const critere = (id, libelle, problemes) => resultats.push({ id, libelle, problemes: problemes.filter(Boolean) });
const chemin = (url) => new URL(url).pathname;
/** Fichier servi pour une adresse (/soins/x → soins/x.html, / → index.html). */
const fichierDe = (p) => {
  if (p === '/') return 'index.html';
  const s = p.replace(/^\//, '');
  return tous.includes(s) ? s : tous.includes(`${s}.html`) ? `${s}.html` : null;
};

// ---------- Robots ----------
const robots = lire('robots.txt') ?? '';
const groupes = [];
for (const ligne of robots.split('\n').map((l) => l.replace(/#.*/, '').trim())) {
  const [cle, ...reste] = ligne.split(':');
  const val = reste.join(':').trim();
  if (/^user-agent$/i.test(cle)) {
    const dernier = groupes.at(-1);
    if (dernier && !dernier.regles.length) dernier.agents.push(val.toLowerCase());
    else groupes.push({ agents: [val.toLowerCase()], regles: [] });
  } else if (cle && groupes.length) groupes.at(-1).regles.push([cle.toLowerCase(), val]);
}
const groupeDe = (ua) => groupes.find((g) => g.agents.includes(ua.toLowerCase())) ?? groupes.find((g) => g.agents.includes('*'));
const bloque = (ua, p) => {
  const g = groupeDe(ua);
  if (!g) return false;
  const regles = g.regles.filter(([k, v]) => (k === 'allow' || k === 'disallow') && v && p.startsWith(v));
  regles.sort((a, b) => b[1].length - a[1].length || (a[0] === 'allow' ? -1 : 1));
  return regles[0]?.[0] === 'disallow';
};
const signal = robots.match(/^Content-Signal:\s*(.+)$/im)?.[1] ?? '';
const entrainementRefuse = /ai-train=no/.test(signal);
const BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Bingbot', 'Googlebot', 'DuckAssistBot', 'MistralAI-User'];
const BOTS_ENTRAINEMENT = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'];

critere('R1', 'robots.txt présent, accueil et pages ouverts à tous', [
  !robots && 'robots.txt absent',
  bloque('*', '/') && 'User-agent * bloque /',
  bloque('*', '/soins') && 'User-agent * bloque /soins',
]);
critere('R2', 'Robots de recherche et de réponse IA nommés et autorisés', BOTS.flatMap((b) => [
  !groupes.some((g) => g.agents.includes(b.toLowerCase())) && `${b} non nommé`,
  bloque(b, '/') && `${b} bloqué`,
]));
critere('R3', `Robots d'entraînement conformes au signal ai-train (${entrainementRefuse ? 'refusé' : 'autorisé'})`, BOTS_ENTRAINEMENT.flatMap((b) => [
  !groupes.some((g) => g.agents.includes(b.toLowerCase())) && `${b} non nommé`,
  bloque(b, '/') !== entrainementRefuse && `${b} ${entrainementRefuse ? 'non bloqué' : 'bloqué'}`,
]));
critere('R4', 'Content-Signal (search, ai-input, ai-train) dans chaque groupe', [
  !/search=(yes|no)/.test(signal) && 'search absent',
  !/ai-input=(yes|no)/.test(signal) && 'ai-input absent',
  !/ai-train=(yes|no)/.test(signal) && 'ai-train absent',
  groupes.some((g) => !g.regles.some(([k]) => k === 'content-signal') && !g.regles.some(([k, v]) => k === 'disallow' && v === '/')) &&
    'un groupe sans Content-Signal',
]);
const sitemapRobots = robots.match(/^Sitemap:\s*(\S+)/im)?.[1];
critere('R5', 'Sitemap déclaré (URL absolue) ; llms.txt et versions Markdown non bloqués', [
  !sitemapRobots?.startsWith('https://') && 'ligne Sitemap absente ou relative',
  ['*', 'GPTBot', 'OAI-SearchBot', 'ClaudeBot'].some((b) => bloque(b, '/llms.txt')) && '/llms.txt bloqué',
  bloque('OAI-SearchBot', '/index.md') && '/index.md bloqué',
]);

// ---------- Sitemap ----------
const sitemap = lire('sitemap.xml') ?? '';
const entrees = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map((m) => ({ loc: m[1], lastmod: m[2] }));
const origine = entrees[0] ? new URL(entrees[0].loc).origin : '';
const pagesHtml = tous.filter((f) => f.endsWith('.html') && !f.startsWith('modeles/'));
const indexable = (f) => !/<meta name="robots" content="[^"]*noindex/.test(lire(f));
critere('S1', 'sitemap.xml valide : toutes les pages indexables, lastmod partout', [
  !entrees.length && 'sitemap vide ou illisible',
  ...entrees.filter((e) => !/^\d{4}-\d{2}-\d{2}$/.test(e.lastmod ?? '')).map((e) => `lastmod manquant : ${e.loc}`),
  ...entrees.filter((e) => !fichierDe(chemin(e.loc))).map((e) => `page inexistante : ${e.loc}`),
  ...pagesHtml
    .filter((f) => f !== '404.html' && indexable(f))
    .filter((f) => !entrees.some((e) => fichierDe(chemin(e.loc)) === f))
    .map((f) => `page indexable absente du sitemap : ${f}`),
  ...entrees.filter((e) => fichierDe(chemin(e.loc)) && !indexable(fichierDe(chemin(e.loc)))).map((e) => `page noindex dans le sitemap : ${e.loc}`),
]);

// ---------- llms.txt / llms-full.txt ----------
const llms = lire('llms.txt') ?? '';
const lignesLlms = llms.split('\n');
const liensLlms = [...llms.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/gm)];
const resout = (url) => {
  const p = chemin(url);
  return tous.includes(p.slice(1)) || Boolean(fichierDe(p));
};
critere('L1', 'llms.txt au format llmstxt.org (H1, résumé en citation, sections H2, liens décrits)', [
  !llms && 'llms.txt absent',
  !/^# \S/.test(lignesLlms[0] ?? '') && 'première ligne sans titre H1',
  (llms.match(/^# /gm) ?? []).length !== 1 && 'un seul titre H1 attendu',
  !lignesLlms.slice(1, 4).some((l) => l.startsWith('> ')) && 'résumé en citation absent sous le titre',
  (llms.match(/^## /gm) ?? []).length < 2 && 'moins de deux sections H2',
  liensLlms.length < 5 && 'moins de cinq liens',
  ...liensLlms.filter((m) => !m[3]).map((m) => `lien sans description : ${m[1]}`),
  /^- *$/m.test(llms) && 'ligne de liste vide',
  llms.length > 50_000 && 'llms.txt trop long (plus de 50 000 caractères)',
]);
critere('L2', 'Liens de llms.txt valides (versions Markdown existantes, même domaine)', [
  ...liensLlms.filter((m) => !m[2].startsWith(origine)).map((m) => `autre domaine : ${m[2]}`),
  ...liensLlms.filter((m) => m[2].startsWith(origine) && !resout(m[2])).map((m) => `lien cassé : ${m[2]}`),
  !liensLlms.some((m) => m[2].endsWith('.md')) && 'aucun lien vers une version Markdown',
]);
const full = lire('llms-full.txt') ?? '';
const htmlAccueil = lire('index.html') ?? '';
const blocsLd = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
const ldAccueil = blocsLd(htmlAccueil).filter(Boolean);
const cabinet = ldAccueil.find((n) => [n['@type']].flat().includes('MedicalBusiness')) ?? {};
const personnes = ldAccueil.filter((n) => n['@type'] === 'Person');
const soinsLd = cabinet.availableService ?? [];
critere('L3', 'llms-full.txt complet (cabinet, praticiens et identifiants, horaires, adresse, soins, FAQ)', [
  !full && 'llms-full.txt absent',
  !/^# \S/.test(full) && 'titre H1 absent',
  /^---\ntitle:/m.test(full) && 'en-têtes YAML recopiés dans le fichier',
  cabinet.address && !full.includes(cabinet.address.postalCode) && 'adresse absente',
  !/Horaires/.test(full) && 'horaires absents',
  ...personnes.map((p) => !full.includes(p.name) && `praticien absent : ${p.name}`),
  ...personnes.flatMap((p) => (p.identifier ?? []).map((i) => !full.includes(i.value) && `identifiant absent : ${i.value}`)),
  ...soinsLd.map((s) => !full.includes(s.name) && `soin absent : ${s.name}`),
  ...(ldAccueil.find((n) => n['@type'] === 'FAQPage')?.mainEntity ?? []).map((q) => !full.includes(q.name) && `question absente : ${q.name}`),
]);

// ---------- Versions Markdown ----------
const pagesMd = entrees.map((e) => chemin(e.loc)).filter((p) => p !== '/mentions-legales');
const versionMd = (p) => (p === '/' ? 'index.md' : `${p.slice(1)}.md`);
critere('M1', 'Version Markdown de chaque page de contenu (/index.md, /soins/x.md…)', pagesMd.map((p) => !tous.includes(versionMd(p)) && `absente : ${versionMd(p)}`));
critere('M2', 'Markdown : en-tête YAML (title, description, last_updated, canonical_url = page HTML), H1, section Sitemap', pagesMd.flatMap((p) => {
  const md = lire(versionMd(p));
  if (!md) return [];
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
  const canonique = lire(fichierDe(p))?.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  return [
    !fm && `${versionMd(p)} : en-tête YAML absent`,
    ...['title', 'description', 'last_updated', 'canonical_url'].map((k) => !new RegExp(`^${k}: \\S`, 'm').test(fm) && `${versionMd(p)} : ${k} absent`),
    fm && canonique && !fm.includes(`canonical_url: ${canonique}`) && `${versionMd(p)} : canonical_url ≠ ${canonique}`,
    !/^# \S/m.test(md.replace(/^---[\s\S]*?---\n/, '')) && `${versionMd(p)} : titre H1 absent`,
    !/^## Sitemap\n\n.*\/sitemap\.md/m.test(md) && `${versionMd(p)} : section Sitemap absente`,
  ];
}));
critere('M3', 'Pages HTML : <link rel="alternate" type="text/markdown"> et rel="describedby" vers llms.txt', pagesMd.flatMap((p) => {
  const h = lire(fichierDe(p)) ?? '';
  const alt = h.match(/<link rel="alternate" type="text\/markdown" href="([^"]+)"/)?.[1];
  return [
    !alt && `${p} : lien Markdown absent`,
    alt && !tous.includes(alt.replace(/^\//, '')) && `${p} : lien Markdown cassé (${alt})`,
    !/<link rel="describedby"[^>]*href="\/llms\.txt"/.test(h) && `${p} : describedby absent`,
  ];
}));
const planMd = lire('sitemap.md') ?? '';
const agentsMd = lire('AGENTS.md') ?? '';
critere('M4', 'sitemap.md (titres et liens) et AGENTS.md (présentation, utilisation, règles)', [
  !planMd && 'sitemap.md absent',
  planMd && (!/^# /m.test(planMd) || !/^## /m.test(planMd) || (planMd.match(/\]\(https?:/g) ?? []).length < pagesMd.length) && 'sitemap.md incomplet',
  !agentsMd && 'AGENTS.md absent',
  agentsMd && !/^## .*Overview/m.test(agentsMd) && 'AGENTS.md : section Overview absente',
  agentsMd && !/^## .*Usage/m.test(agentsMd) && 'AGENTS.md : section Usage absente',
  agentsMd && !/15 \(SAMU\)|112/.test(agentsMd) && 'AGENTS.md : consigne d’urgence absente',
]);

// ---------- En-têtes Cloudflare et négociation ----------
const enTetes = lire('_headers') ?? '';
const regles = {};
let courante = null;
for (const l of enTetes.split(/\r?\n/)) {
  if (/^\//.test(l)) regles[(courante = l.trim())] = {};
  else if (/^\s+\S/.test(l) && courante) {
    const [k, ...v] = l.trim().split(':');
    regles[courante][k.toLowerCase()] = [regles[courante][k.toLowerCase()], v.join(':').trim()].filter(Boolean).join(', ');
  } else if (!l.trim()) courante = null;
}
const nbRegles = Object.keys(regles).length;
critere('H1', '_headers : types MIME, noindex et canonical des versions Markdown, Link describedby, CSP conservée', [
  nbRegles > 100 && `${nbRegles} règles (100 au plus)`,
  !regles['/*']?.['content-security-policy'] && 'CSP absente de la règle /*',
  !/rel="describedby"/.test(regles['/*']?.link ?? '') && 'Link describedby absent de /*',
  !/text\/plain/.test(regles['/llms.txt']?.['content-type'] ?? '') && 'llms.txt : text/plain absent',
  !/text\/plain/.test(regles['/llms-full.txt']?.['content-type'] ?? '') && 'llms-full.txt : text/plain absent',
  ...['/sitemap.md', '/AGENTS.md'].map((f) => !/text\/markdown/.test(regles[f]?.['content-type'] ?? '') && `${f} : text/markdown absent`),
  ...pagesMd.map((p) => `/${versionMd(p)}`).flatMap((f) => {
    const r = regles[f];
    if (!r) return [`${f} : aucune règle`];
    return [
      !/text\/markdown; charset=utf-8/.test(r['content-type'] ?? '') && `${f} : type`,
      !/noindex/.test(r['x-robots-tag'] ?? '') && `${f} : noindex`,
      !/rel="canonical"/.test(r.link ?? '') && `${f} : canonical`,
    ];
  }),
]);
const routes = (() => { try { return JSON.parse(lire('_routes.json')); } catch { return null; } })();
const middleware = existsSync(join(racineSites, 'functions/_middleware.js')) ? readFileSync(join(racineSites, 'functions/_middleware.js'), 'utf8') : '';
const communs = (() => { try { return JSON.parse(lire('en-tetes.json')); } catch { return null; } })();
critere('H2', 'Négociation « Accept: text/markdown » (Function) limitée aux pages, en-têtes de sécurité préservés', [
  !middleware && 'functions/_middleware.js absent',
  middleware && !/text\\\/markdown/.test(middleware) && 'middleware sans négociation text/markdown',
  middleware && !/Vary', 'Accept'/.test(middleware) && 'Vary: Accept absent',
  !routes && '_routes.json absent ou invalide',
  routes && ['/', '/rdv', '/soins/*', '/le-cabinet'].some((r) => !routes.include?.includes(r)) && '_routes.json : pages ou /rdv manquantes',
  routes && routes.include?.some((r) => r === '/*' || r.startsWith('/_astro') || r.startsWith('/photos')) && '_routes.json : les fichiers statiques passeraient par la Function',
  routes && pagesMd.some((p) => !routes.include.some((r) => r === p || (r.endsWith('/*') && p.startsWith(r.slice(0, -1))))) && '_routes.json : une page de contenu sans négociation',
  !communs?.['Content-Security-Policy'] && 'en-tetes.json sans CSP (repli du middleware)',
]);

// ---------- Données structurées ----------
const NOEUDS_PAGE = ['WebPage', 'MedicalWebPage', 'FAQPage', 'Article'];
const problemesLd = [];
const problemesPage = [];
for (const f of pagesHtml.filter(indexable).filter((f) => f !== '404.html')) {
  const blocs = blocsLd(lire(f));
  if (blocs.some((b) => b === null)) problemesLd.push(`${f} : JSON-LD illisible`);
  const noeuds = blocs.filter(Boolean);
  const ids = new Set(noeuds.map((n) => n['@id']).filter(Boolean));
  const refs = JSON.stringify(noeuds).match(/\{"@id":"[^"]+"\}/g) ?? [];
  for (const r of refs) if (!ids.has(JSON.parse(r)['@id'])) problemesLd.push(`${f} : référence ${JSON.parse(r)['@id']} sans nœud`);
  const page = noeuds.find((n) => NOEUDS_PAGE.includes(n['@type']));
  if (!page) problemesPage.push(`${f} : nœud de page absent`);
  else {
    for (const k of ['description', 'url']) if (!page[k]) problemesPage.push(`${f} : ${page['@type']}.${k} absent`);
    if (!page.name && !page.headline) problemesPage.push(`${f} : ${page['@type']}.name absent`);
    if (!page.dateModified) problemesPage.push(`${f} : dateModified absent`);
  }
  if (!noeuds.some((n) => n['@type'] === 'BreadcrumbList')) problemesPage.push(`${f} : BreadcrumbList absent`);
}
critere('J1', 'JSON-LD lisible et références @id résolues sur chaque page', problemesLd);
critere('J2', 'Chaque page : nœud de page (nom, description, url, dateModified) et fil d’Ariane', problemesPage);
const heure = /^\d{2}:\d{2}$/;
critere('J3', 'Cabinet : MedicalBusiness complet (adresse, géo, horaires, spécialité, zone, soins, réservation)', [
  !cabinet['@type'] && 'nœud MedicalBusiness absent',
  ...['name', 'url', 'telephone', 'image', 'medicalSpecialty', 'address', 'openingHoursSpecification', 'areaServed', 'availableService', 'potentialAction'].map((k) => !cabinet[k] && `${k} absent`),
  cabinet.telephone && !/^\+\d{8,15}$/.test(cabinet.telephone) && 'téléphone hors format international',
  cabinet.address && ['streetAddress', 'postalCode', 'addressLocality', 'addressCountry'].some((k) => !cabinet.address[k]) && 'adresse incomplète',
  !cabinet.geo && 'coordonnées géographiques absentes',
  ...(cabinet.openingHoursSpecification ?? []).filter((o) => !heure.test(o.opens) || !heure.test(o.closes)).map((o) => `horaire invalide : ${o.opens}–${o.closes}`),
  soinsLd.length && soinsLd.some((s) => !s.name || !s.url) && 'soin sans nom ou sans adresse',
  soinsLd.length !== (lire('llms.txt')?.match(/\/soins\/[^)]+\.md\)/g) ?? []).length && 'nombre de soins différent du site',
  cabinet.potentialAction && !['ReserveAction', 'CommunicateAction'].includes(cabinet.potentialAction['@type']) && 'action de réservation absente',
  cabinet.potentialAction?.['@type'] === 'ReserveAction' && !cabinet.potentialAction.target?.urlTemplate && 'ReserveAction sans urlTemplate',
]);
critere('J4', 'Praticiens : un Person par praticien, identifiants publics (PropertyValue), rattachement au cabinet', [
  !personnes.length && 'aucun Person',
  ...personnes.flatMap((p) => [
    !(p.identifier ?? []).length && `${p.name} : identifiant absent`,
    (p.identifier ?? []).some((i) => i['@type'] !== 'PropertyValue' || !i.propertyID || !i.value) && `${p.name} : identifiant mal formé`,
    p.worksFor?.['@id'] !== cabinet['@id'] && `${p.name} : worksFor`,
  ]),
  (cabinet.employee ?? []).length !== personnes.length && 'employee ne liste pas tous les praticiens',
]);
const soinsFichiers = pagesHtml.filter((f) => f.startsWith('soins/'));
critere('J5', 'WebSite (accueil), MedicalWebPage et FAQPage sur les pages de soin, FAQPage sur l’accueil', [
  !ldAccueil.some((n) => n['@type'] === 'WebSite') && 'WebSite absent de l’accueil',
  !ldAccueil.some((n) => n['@type'] === 'FAQPage') && 'FAQPage absent de l’accueil',
  ...soinsFichiers.flatMap((f) => {
    const n = blocsLd(lire(f)).filter(Boolean);
    return [!n.some((x) => x['@type'] === 'MedicalWebPage') && `${f} : MedicalWebPage absent`, /class="faq/.test(lire(f)) && !n.some((x) => x['@type'] === 'FAQPage') && `${f} : FAQPage absent`];
  }),
]);

// ---------- HTML lisible sans JavaScript ----------
const problemesHtml = [];
for (const f of pagesHtml.filter(indexable).filter((f) => f !== '404.html')) {
  const h = lire(f);
  if (!/<html lang="fr/.test(h)) problemesHtml.push(`${f} : lang absent`);
  if (!/<main[\s>]/.test(h)) problemesHtml.push(`${f} : <main> absent`);
  if ((h.match(/<h1[\s>]/g) ?? []).length !== 1) problemesHtml.push(`${f} : un seul H1 attendu`);
  if (!/<title>[^<]{10,}<\/title>/.test(h)) problemesHtml.push(`${f} : titre absent`);
  if (!/<meta name="description" content="[^"]{50,}"/.test(h)) problemesHtml.push(`${f} : description absente ou courte`);
  if (!/<link rel="canonical" href="https:\/\//.test(h)) problemesHtml.push(`${f} : canonical absent`);
  if (!/<meta name="robots" content="[^"]*max-snippet:-1[^"]*max-image-preview:large/.test(h)) problemesHtml.push(`${f} : max-snippet / max-image-preview absents`);
  const texte = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  if (texte.replace(/\s+/g, ' ').length < 500) problemesHtml.push(`${f} : moins de 500 caractères de texte sans JavaScript`);
}
// Contenus clés présents dans le HTML initial (pas injectés par script) : FAQ et horaires.
const texteAccueil = htmlAccueil.replace(/<script[\s\S]*?<\/script>/g, ' ');
for (const q of ldAccueil.find((n) => n['@type'] === 'FAQPage')?.mainEntity ?? []) {
  const debut = q.name.slice(0, 20).replace(/[’']/g, '');
  if (!texteAccueil.replace(/&#39;|&rsquo;|[’']/g, '').includes(debut)) problemesHtml.push(`accueil : question « ${q.name} » absente du HTML`);
}
critere('P1', 'HTML lisible sans JavaScript : langue, <main>, H1 unique, métadonnées, directives d’extrait, FAQ', problemesHtml);

// ---------- Résultat ----------
const reussis = resultats.filter((r) => !r.problemes.length).length;
const score = Math.round((100 * reussis) / resultats.length);
console.log('');
for (const r of resultats) {
  console.log(`${r.problemes.length ? '✗' : '✓'} ${r.id}  ${r.libelle}`);
  for (const p of r.problemes.slice(0, 8)) console.log(`      · ${p}`);
  if (r.problemes.length > 8) console.log(`      · … et ${r.problemes.length - 8} autre(s)`);
}
// Indicateurs (hors score) : poids des pages et économie de jetons des versions Markdown.
const poids = (f) => Buffer.byteLength(lire(f) ?? '');
const accueilMd = poids('index.md');
const ratio = (texteAccueil.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').length / poids('index.html')) * 100;
console.log(`\nIndicateurs (hors score) : accueil ${Math.round(poids('index.html') / 1024)} Ko en HTML, ${Math.round(accueilMd / 1024)} Ko en Markdown ; texte/HTML ${ratio.toFixed(1)} % ; ${nbRegles} règles _headers.`);
console.log(`\nScore découvrabilité agents : ${score}/100 (${reussis}/${resultats.length} critères).`);
process.exit(score === 100 ? 0 : 1);
