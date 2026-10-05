// GÉNÉRATEUR des publications d'un mois (réseaux sociaux + fiche Google) pour une identité de cabinet.
//
//   node packages/contenus/scripts/generer.mjs [--sortie <dossier>] [--verifier]
//
// 1. construit les paquets (construire.mjs) ;
// 2. garde-fous du catalogue (16 sujets) et du mois type : un contenu qui casse une règle n'est PAS généré (liste des ✗) ;
// 3. écrit l'aperçu instantané (apercu.html : identité, style, couleurs changés en direct, sans serveur) ;
// 4. export : Playwright (Chromium) ouvre la MÊME page et photographie chaque diapositive en PNG, pour les trois styles ;
//    une diapositive qui ne passe pas le contrôle de lecture (débordement, taille < 34 px, contraste < AA, zone utile)
//    n'est pas exportée ;
// 5. planches récapitulatives (une par style), planche « 3 identités » avec temps de rendu mesurés dans le navigateur,
//    planche « noms difficiles » (nom long, 2 praticiens, caractères spéciaux) ;
// 6. mois-type.json : légendes, hashtags, textes alternatifs, liens, sources, fichiers.
// Rien n'est publié : la publication (Meta, Google) est la phase 2.
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { construire, RACINE } from './construire.mjs';
import { sortieAutorisee } from '../../core/scripts/chemins.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const DEPOT = join(RACINE, '../..');
const SORTIE = sortieAutorisee(opt('sortie', join(RACINE, 'dist/social')));
const AUJOURDHUI = opt('date', new Date().toISOString().slice(0, 10));
const STYLES = ['releve', 'pedagogique', 'simple'];
const LIBELLES = { releve: 'Relevé', pedagogique: 'Pédagogique', simple: 'Simple' };

const paquets = await construire();
const C = await import(pathToFileURL(paquets.node).href);

// ———————————————————————————————— 2. garde-fous
let refus = 0;
console.log(`Catalogue : ${C.SUJETS.length} sujets`);
for (const s of C.SUJETS) {
  const r = C.verifierSujet(s, AUJOURDHUI);
  console.log(`  ${r.erreurs.length ? '✗' : '✓'} ${s.id} (${s.specialite}, ${s.mention}, ${s.sources.length} source(s))`);
  for (const e of r.erreurs) console.log(`      ✗ ${e}`);
  refus += r.erreurs.length;
}
// Garde-fou « faible niveau de preuve » : un sujet de posturologie (exemple fictif) est bloqué tant qu'il n'est pas activé
const essaiFaible = C.verifierSujet({ ...C.SUJETS[0], id: 'essai-posturologie', specialite: 'posture', niveauPreuve: 'faible' }, AUJOURDHUI);
console.log(essaiFaible.erreurs.some((e) => /faible niveau de preuve/.test(e)) ? '  ✓ garde-fou « faible niveau de preuve » : un sujet de posturologie est bloqué' : '  ✗ garde-fou « faible niveau de preuve » inactif');
const enchainements = C.verifierEnchainements(C.MOIS_TYPE_OCTOBRE);
for (const e of enchainements) console.log(`  ✗ enchaînement : ${e}`);
const demo = C.identiteDepuisSite(C.SITE_DEMO);
const kitDemo = C.composerKit(C.MOIS_TYPE_OCTOBRE, demo);
console.log(`Mois type (octobre 2026) pour « ${demo.nom} » :`);
for (const e of kitDemo) {
  console.log(`  ${e.publication ? '✓' : '✗'} ${e.programmation.date} ${e.programmation.format.padEnd(9)} ${e.programmation.sujet}`);
  for (const x of e.controle.erreurs) console.log(`      ✗ ${x}`);
}
if (args.includes('--verifier')) process.exit(refus || enchainements.length ? 1 : 0);

// ———————————————————————————————— 3. page d'aperçu (la même pour l'aperçu et l'export)
mkdirSync(SORTIE, { recursive: true });
copyFileSync(paquets.navigateur, join(SORTIE, 'contenus.js'));
const exiger = createRequire(join(DEPOT, 'package.json'));
const polices = C.policesCss((f) => `data:font/woff2;base64,${readFileSync(exiger.resolve(f)).toString('base64')}`);
writeFileSync(join(SORTIE, 'polices.css'), polices);

// Identités : le cabinet de démo (site Astro) et trois cabinets fictifs (modèles et gammes différents), plus des noms difficiles
const IDENTITES = {
  demo,
  'premium-canard': C.identiteRapide({ nom: 'Cabinet de podologie du Parc', praticiens: ['Julien Moreau'], ville: 'Nantes', quartier: 'Nantes, Île de Nantes', domaine: 'podologue-ile-de-nantes.fr', modele: 'premium', gamme: 'canard', marque: 'trame' }),
  'simple-sable': C.identiteRapide({ nom: 'Pédicure-podologue Anne Lefèvre', praticiens: ['Anne Lefèvre'], ville: 'Saint-Flour', domaine: 'lefevre-podologue.fr', modele: 'simple', gamme: 'sable', marque: 'voute' }),
  'prestige-encre': C.identiteRapide({ nom: 'Cabinet Marceau', praticiens: ['Sophie Marceau', 'Karim Benali'], ville: 'Bordeaux', quartier: 'Bordeaux, Chartrons', domaine: 'cabinet-marceau-podologie.fr', modele: 'prestige', gamme: 'encre', marque: 'courbes' }),
  'nom-long': C.identiteRapide({ nom: 'Cabinet de pédicurie-podologie des Coteaux de Saint-Germain-en-Laye et du Pecq', praticiens: ['Marie-Hélène de La Tour-d’Auvergne'], ville: 'Saint-Germain-en-Laye', domaine: 'podologie-coteaux-saint-germain-en-laye.fr', modele: 'proximite', gamme: 'cobalt' }),
  'deux-praticiens': C.identiteRapide({ nom: 'Podologie Lys & Œillet', praticiens: ['Zoé Lys', 'Grégoire Œillet-N’Diaye'], ville: 'Nîmes', domaine: 'lys-oeillet.fr', modele: 'zen', gamme: 'sauge' }),
  'caracteres-speciaux': C.identiteRapide({ nom: 'L’Atelier du Pied — Côte-d’Or « Beaune »', praticiens: ['Élodie Ægerter'], ville: 'Beaune', domaine: 'atelier-du-pied-beaune.fr', modele: 'atelier', gamme: 'terracotta' }),
};
writeFileSync(join(SORTIE, 'apercu.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aperçu du mois — moteur de contenus</title>
<link rel="stylesheet" href="polices.css">
<style>
  body{margin:0;font:16px/1.4 system-ui,sans-serif;background:Canvas;color:CanvasText}
  .barre{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 16px;background:Canvas;border-bottom:1px solid GrayText}
  .barre[hidden]{display:none}.barre button[aria-pressed=true]{font-weight:700;text-decoration:underline}
  #mesure{margin-left:auto;font-variant-numeric:tabular-nums}
  .apercu .cz-kit{display:flex;flex-wrap:wrap;gap:28px;padding:16px}
  .apercu .cz-publication{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
  .apercu .cz-publication>section{transform:scale(var(--echelle,0.26));transform-origin:0 0;margin:0 calc(var(--l) * (var(--echelle,0.26) - 1)) calc(var(--h) * (var(--echelle,0.26) - 1)) 0}
  .export .cz-kit{display:block}.export section.cz{margin:0 0 20px}
</style></head>
<body>
<div class="barre" id="barre" hidden>
  <label>Cabinet <select id="identite"></select></label>
  <span>Style : ${STYLES.map((s) => `<button data-style="${s}">${LIBELLES[s]}</button>`).join(' ')} <button data-style="">Celui du site</button></span>
  <label>Couleurs <select id="gamme"><option value="">Celles du cabinet</option></select></label>
  <span id="mesure"></span>
</div>
<main id="kit"></main>
<script src="contenus.js"></script>
<script>
const IDENTITES = ${JSON.stringify(IDENTITES)};
const P = new URLSearchParams(location.search);
const exporter = P.has('export');
document.body.className = exporter ? 'export' : 'apercu';
let id = P.get('identite') || 'demo', style = P.get('style') || '', gamme = P.get('gamme') || '';
Contenus.poserFeuille();
const ident = () => { const i = structuredClone(IDENTITES[id]); if (gamme) i.theme = { couleur: i.theme.couleur, gamme }; return i; };
async function afficher() {
  const r = await Contenus.monter(document.getElementById('kit'), ident(), { style: style || undefined });
  for (const s of document.querySelectorAll('section.cz')) { s.style.setProperty('--l', s.style.width); s.style.setProperty('--h', s.style.height); }
  window.resultat = { ms: r.ms, msParPublication: r.msParPublication, defauts: r.defauts, publications: r.kit.map((e) => ({ id: e.programmation.sujet + '.' + e.programmation.format, ok: !!e.publication, erreurs: e.controle.erreurs })) };
  document.getElementById('mesure').textContent = r.kit.filter((e) => e.publication).length + ' publications rendues en ' + r.ms.toFixed(0) + ' ms' + (r.defauts.length ? ' — ' + r.defauts.length + ' défaut(s) de lecture' : '');
}
if (!exporter) {
  const b = document.getElementById('barre'); b.hidden = false;
  const sel = document.getElementById('identite');
  for (const [k, i] of Object.entries(IDENTITES)) sel.add(new Option(i.nom + ' (' + i.modele.nom + ')', k, false, k === id));
  const g = document.getElementById('gamme');
  for (const x of ['canard','cobalt','sauge','terracotta','prune','sable','encre','ardoise','corail']) g.add(new Option(x, x, false, x === gamme));
  sel.onchange = () => { id = sel.value; afficher(); };
  g.onchange = () => { gamme = g.value; afficher(); };
  for (const x of b.querySelectorAll('button')) x.onclick = () => { style = x.dataset.style; for (const y of b.querySelectorAll('button')) y.setAttribute('aria-pressed', String(y === x)); afficher(); };
}
window.pret = afficher();
</script></body></html>`);
console.log(`✓ aperçu instantané : ${join(SORTIE, 'apercu.html')}`);

// ———————————————————————————————— 4. export PNG (Playwright, même page)
const pw = await import(pathToFileURL(createRequire(join(DEPOT, 'apps/sites/package.json')).resolve('playwright')).href);
const chromium = pw.chromium ?? pw.default.chromium;
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 1 });
const urlApercu = (q) => `${pathToFileURL(join(SORTIE, 'apercu.html')).href}?${new URLSearchParams(q)}`;
const sortiesJson = {};
const fichiersParStyle = {};
for (const style of STYLES) {
  const dossier = join(SORTIE, style);
  rmSync(dossier, { recursive: true, force: true });
  mkdirSync(dossier, { recursive: true });
  await page.goto(urlApercu({ export: '1', identite: 'demo', style }));
  await page.evaluate(() => window.pret);
  const res = await page.evaluate(() => window.resultat);
  const refusees = new Set(res.defauts.map((d) => d.publication));
  fichiersParStyle[style] = { ms: res.ms, defauts: res.defauts, publications: {} };
  for (const d of res.defauts) console.log(`  ✗ [${style}] ${d.publication} diapositive ${d.index + 1} (${d.role}) : ${d.message}`);
  for (const e of kitDemo.filter((x) => x.publication)) {
    const p = e.publication;
    if (refusees.has(p.id)) { console.log(`  ✗ [${style}] ${p.id} NON exporté (contrôle de lecture)`); continue; }
    const fichiers = [];
    const sections = await page.$$(`section.cz[data-publication="${p.id}"]`);
    for (const [k, s] of sections.entries()) {
      const f = `${e.programmation.date}-${p.sujet}.${p.format}${sections.length > 1 ? `-${String(k + 1).padStart(2, '0')}` : ''}.png`;
      await s.screenshot({ path: join(dossier, f) });
      fichiers.push(`${style}/${f}`);
    }
    fichiersParStyle[style].publications[p.id] = fichiers;
  }
  console.log(`✓ ${LIBELLES[style]} : ${Object.values(fichiersParStyle[style].publications).flat().length} images, rendu du mois ${res.ms.toFixed(0)} ms`);
}

// ———————————————————————————————— 5. planches
async function planche(html, fichier, largeur = 2400) {
  const tmp = join(SORTIE, `_planche.html`);
  writeFileSync(tmp, `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="polices.css"><style>
    body{margin:0;padding:40px;background:Canvas;color:CanvasText;font:22px/1.35 'Inter Variable',system-ui,sans-serif;width:${largeur - 80}px}
    h1{font-size:40px;margin:0 0 6px}h2{font-size:26px;margin:34px 0 10px}.note{color:GrayText;margin:0 0 20px}
    .rangee{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}.rangee img{display:block;height:var(--h,340px);border:1px solid GrayText}
    .lib{font-size:20px;color:GrayText;margin:6px 0 0}
  </style></head><body>${html}</body></html>`);
  await page.setViewportSize({ width: largeur, height: 1000 });
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(SORTIE, fichier), fullPage: true });
  rmSync(tmp);
}
const NOMS_FORMATS = { carrousel: 'Carrousel 4:5', post: 'Post 1:1', story: 'Story 9:16', google: 'Fiche Google 4:3' };
for (const style of STYLES) {
  const blocs = kitDemo.filter((x) => x.publication && fichiersParStyle[style].publications[x.publication.id]).map((e) => {
    const p = e.publication, s = C.sujet(p.sujet);
    return `<h2>${e.programmation.date} · ${NOMS_FORMATS[p.format]} · ${s.titre}</h2><div class="rangee">${fichiersParStyle[style].publications[p.id].map((f) => `<img src="${f}" alt="">`).join('')}</div>`;
  }).join('');
  await planche(`<h1>Mois type — octobre 2026 — style ${LIBELLES[style]}</h1><p class="note">${demo.nom} (cabinet de démo, données fictives) · reel : voir reel/ · rendu du mois dans le navigateur : ${fichiersParStyle[style].ms.toFixed(0)} ms</p>${blocs}`, `planche-${style}.png`);
  console.log(`✓ planche-${style}.png`);
}

// Planche « 3 identités » : le même mois, rendu en direct pour trois cabinets, temps mesurés dans le navigateur
await page.setViewportSize({ width: 1300, height: 1000 });
const mesures = {};
const trois = ['premium-canard', 'simple-sable', 'prestige-encre'];
for (const id of [...trois, 'nom-long', 'deux-praticiens', 'caracteres-speciaux']) {
  const essais = [];
  for (let k = 0; k < 3; k++) { // 1er rendu (polices froides) puis rendus suivants
    await page.goto(urlApercu({ export: '1', identite: id }));
    await page.evaluate(() => window.pret);
    essais.push(await page.evaluate(() => window.resultat));
  }
  const r = essais[essais.length - 1];
  mesures[id] = { msMois: essais.map((e) => +e.ms.toFixed(1)), msParPublication: r.msParPublication.map((x) => +x.toFixed(1)), defauts: r.defauts };
  const dossier = join(SORTIE, 'identites', id);
  rmSync(dossier, { recursive: true, force: true }); mkdirSync(dossier, { recursive: true });
  const choix = trois.includes(id) ? null : ['couverture', 'signature', 'affiche'];
  const sections = await page.$$('section.cz');
  let n = 0;
  for (const s of sections) {
    const role = await s.getAttribute('data-role'), pub = await s.getAttribute('data-publication'), idx = await s.getAttribute('data-index');
    if (choix && !choix.includes(role)) continue;
    if (choix && n >= 6) continue;
    await s.screenshot({ path: join(dossier, `${pub}-${idx}.png`) }); n++;
  }
  for (const d of r.defauts) console.log(`  ✗ [${id}] ${d.publication} diapositive ${d.index + 1} : ${d.message}`);
}
const { readdirSync } = await import('node:fs');
const vignettes = (id, filtre = () => true) => readdirSync(join(SORTIE, 'identites', id)).filter(filtre).map((f) => `<img src="identites/${id}/${f}" alt="">`).join('');
await planche(
  `<h1>Le même mois, trois cabinets</h1><p class="note">Contenu identique, identité différente : nom, praticiens, modèle, gamme, logo. Temps de rendu du mois complet dans le navigateur (composition + HTML + ajustement du texte), 3 essais.</p>` +
  trois.map((id) => { const i = IDENTITES[id]; return `<h2>${i.nom} — modèle ${i.modele.nom}, gamme ${i.theme.gamme} — ${mesures[id].msMois.join(' / ')} ms pour le mois</h2><div class="rangee" style="--h:300px">${vignettes(id, (f) => /\.(carrousel-0|post|story|google)/.test(f) || /carrousel-[06]\.png$/.test(f))}</div>`; }).join(''),
  'planche-trois-identites.png', 2800);
await planche(
  `<h1>Noms difficiles</h1><p class="note">Nom très long, deux praticiens, caractères spéciaux (’ « » — Œ Æ &) : couverture, signature et image unique.</p>` +
  ['nom-long', 'deux-praticiens', 'caracteres-speciaux'].map((id) => `<h2>${IDENTITES[id].nom} — ${IDENTITES[id].praticiens.join(', ')} — ${mesures[id].defauts.length} défaut(s)</h2><div class="rangee" style="--h:300px">${vignettes(id)}</div>`).join(''),
  'planche-noms-difficiles.png', 2800);
console.log('✓ planche-trois-identites.png, planche-noms-difficiles.png');
await navigateur.close();

// ———————————————————————————————— 6. JSON du mois
const json = {
  genere_le: AUJOURDHUI,
  cabinet: { nom: demo.nom, domaine: demo.domaine, modele: demo.modele.id, style_du_site: C.styleIdentite(demo) },
  avertissement: 'Contenus à valider par le praticien avant publication (phase 2). Rien n’a été publié.',
  publications: kitDemo.map((e) => {
    const p = e.publication, s = C.sujet(e.programmation.sujet);
    if (!p) return { date: e.programmation.date, sujet: e.programmation.sujet, format: e.programmation.format, genere: false, refus: e.controle.erreurs };
    return {
      date: e.programmation.date, format: p.format, sujet: s.id, titre: s.titre, specialite: s.specialite, mention: p.mention,
      lien: p.lien, legende: p.legendeComplete, longueur_legende: p.legendeComplete.length, hashtags: p.hashtags.map((h) => `#${h}`),
      textes_alternatifs: p.alts, texte_google: p.texteGoogle,
      images: Object.fromEntries(STYLES.map((st) => [st, fichiersParStyle[st].publications[p.id] ?? []])),
      sources: s.sources.map((x) => ({ titre: x.titre, url: x.url, mise_a_jour: x.majPage, consultee_le: x.consulteLe })),
      avertissements: e.controle.avertissements,
    };
  }).concat(C.MOIS_TYPE_OCTOBRE.filter((p) => p.format === 'reel').map((p) => ({ date: p.date, format: 'reel', sujet: p.sujet, fichier: 'reel/' + p.sujet + '.mp4', note: 'node packages/contenus/scripts/reel.mjs' }))),
  temps_de_rendu_navigateur_ms: { demo: Object.fromEntries(STYLES.map((s) => [s, +fichiersParStyle[s].ms.toFixed(1)])), ...Object.fromEntries(Object.entries(mesures).map(([k, v]) => [k, v])) },
  calendrier: C.calendrier(),
};
writeFileSync(join(SORTIE, 'mois-type.json'), JSON.stringify(json, null, 2));
console.log(`✓ ${join(SORTIE, 'mois-type.json')}`);
