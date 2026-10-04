// EXTRACTION des éléments ÉcranZen validés vers la bibliothèque partagée des sites (packages/core/src/bibliotheque/formes.ts).
//
//   node packages/core/scripts/extraire-ecranzen.mjs [chemin du studio ÉcranZen]
//
// Le studio ÉcranZen est en LECTURE SEULE : ce script importe ses modules de géométrie (outils/lib/geometrie/*.mjs) et ses
// éléments HTML (html/elements/<objet>/<objet>.js) sans rien y écrire, et produit les MÊMES tracés (aucun redessin). Il écrit
// uniquement formes.ts, dans ce dépôt. À relancer quand une géométrie validée change côté ÉcranZen.
//
// Sortie : pour chaque élément, la viewBox et le corps SVG dont les couleurs sont des variables `--ez-<jeton>` (jetons ÉcranZen :
// peau-2, trait, os…) et les épaisseurs des variables `--ez-ep-<fin|normal|epais>`. Aucune couleur littérale : bibliotheque/rendu.ts
// relie ces variables à la charte des sites, selon le registre (relevé ou pédagogique).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ICI = dirname(fileURLToPath(import.meta.url));
const STUDIO = resolve(process.argv[2] || 'C:/Users/pault/Desktop/TBCOM CLAUDE/ecranzen/studio');
const SORTIE = join(ICI, '../src/bibliotheque/formes.ts');
const geo = async (f) => import(pathToFileURL(join(STUDIO, 'outils/lib/geometrie', f)).href);

const T = await geo('trace.mjs');
const PIED = await geo('pied.mjs');
const ETATS = await geo('etats.mjs');
const PROFIL = await geo('pied-profil.mjs');
const JAMBE = await geo('jambe-profil.mjs');
const SEMELLE = await geo('semelle.mjs');
const OBJETS = await geo('objets.mjs');
const ONGLE = await geo('ongle.mjs');
const PISCINE = await geo('piscine.mjs');

const DEC = 1; // décimales des tracés (0,1 u ≪ 1 px à l'affichage)
const n = (v) => String(Math.round(v * 10 ** DEC) / 10 ** DEC);

// ———————————————————————————————————————— 1. Modèle de calques ÉcranZen → SVG à variables (même logique que geometrie/svg.mjs)
function style(g) {
  const s = [];
  if (g.fl) { s.push(`fill:var(--ez-${g.fl.tok})`); if (g.fl.o !== 100) s.push(`fill-opacity:${g.fl.o / 100}`); }
  if (g.st) { s.push(`stroke:var(--ez-${g.st.tok})`, `stroke-width:var(--ez-ep-${g.st.ep})`); if (g.st.o !== 100) s.push(`stroke-opacity:${g.st.o / 100}`); }
  return s.length ? ` style="${s.join(';')}"` : '';
}
function forme(g, xf, retrait) {
  if (g.ellipse) { const c = T.appl(xf, g.ellipse.c); return `<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(g.ellipse.s[0] / 2)}" ry="${n(g.ellipse.s[1] / 2)}"${style(g)}/>`; }
  let tr = T.trace(g.d);
  if (g.retrait && retrait) tr = T.retracter(tr, retrait.polys, retrait.marge);
  return `<path d="${T.versSvg(tr, xf, DEC)}"${style(g)}/>`;
}
/** modele : { xf, sens, silhouette, marge, calques } ; etat : { rotations, canaux } (composerEtat). `attrs` d'un calque : ajouts SVG. */
function rendre(modele, etat = { rotations: {}, canaux: {} }) {
  const xf = modele.xf || null, sens = modele.sens || 1;
  const retrait = modele.silhouette ? { polys: PIED.silhouette(modele.silhouette), marge: modele.marge } : null;
  const rot = {};
  for (const c of modele.calques) if (c.pivot) { const p = T.appl(xf, c.pivot); const a = sens * (etat.rotations?.[c.orteil] || 0); if (a) rot[c.nm] = `rotate(${n(a)} ${n(p[0])} ${n(p[1])})`; }
  const rp = etat.rotations || {};
  return modele.calques.filter((c) => !c.pivot && !c.masque).map((c) => {
    let op = c.canal ? (etat.canaux?.[c.canal] ?? 0) : 1;
    if (c.oPose) op = Math.round(op * c.oPose(rp) * 1000) / 1000;
    if (!op) return '';
    const t = c.parent && rot[c.parent] ? ` transform="${rot[c.parent]}"` : '';
    const corps = c.groupes.map((g) => forme(g.dPose ? { ...g, d: g.dPose(rp) } : g, xf, retrait)).join('');
    return `<g${t}${op !== 1 ? ` opacity="${op}"` : ''}${c.attrs || ''}>${corps}</g>`;
  }).join('');
}
const etat = (atome, nom) => ETATS.composerEtat(atome, nom);
const canaux = (...noms) => ({ rotations: {}, canaux: Object.fromEntries(noms.map((k) => [k, 1])) });

// ———————————————————————————————————————— 2. Éléments HTML colorés (semelle orthopédique, chaussure de running, praticien)
// Chargés en mémoire (vm), sans écrire dans le studio. Leurs palettes reçoivent des variables `--ez-<préfixe>-<clé>` ; la fonction
// interne `mix()` (qui lit des #hex) est remplacée, en mémoire seulement, par un color-mix() CSS équivalent (même proportion).
function chargerElement(rel) {
  let src = readFileSync(join(STUDIO, 'html/elements', rel), 'utf8');
  src = src.replace(/function mix\((\w+), (\w+), (\w+)\) \{/, (m, a, b, u) => `function mix(${a}, ${b}, ${u}) { return mixCss(${a}, ${b}, ${u}); }\n  function mixOrigine(${a}, ${b}, ${u}) {`);
  const mixCss = (a, b, u) => { const k = Math.min(1, Math.max(0, u)); return k <= 0 ? a : k >= 1 ? b : `color-mix(in srgb, ${a} ${Math.round((1 - k) * 1000) / 10}%, ${b})`; };
  const module = { exports: {} };
  vm.runInNewContext(src, { module, globalThis: {}, mixCss, Math, String, Number, Object, Array, JSON, parseInt });
  return module.exports;
}
const varsPalette = (prefixe, palette) => Object.fromEntries(Object.keys(palette).map((k) => [k, typeof palette[k] === 'string' ? `var(--ez-${prefixe}-${k})` : palette[k]]));
// Couleurs littérales restées dans le code des éléments (reflets, ombres) → jetons de la charte (blanc, encre) : aucune couleur en dur.
const LITTERALES = { '#ffffff': 'var(--ez-blanc)', '#fff': 'var(--ez-blanc)', '#000000': 'var(--ez-noir)', '#000': 'var(--ez-noir)' };
function sansLitterales(svg, nom) {
  let s = svg.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/g, (m, a) => `rgb(var(--ez-blanc-rgb) / ${a})`)
    .replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/g, (m, a) => `rgb(var(--ez-noir-rgb) / ${a})`)
    .replace(/#[0-9a-f]{3,8}\b/gi, (h) => {
      const v = LITTERALES[h.toLowerCase()];
      if (v) return v;
      // teintes sombres d'encre (#1E1512, #1E2A3A, #120C0A…) : jeton « encre » ; claires : « blanc »
      const x = h.length === 4 ? h.slice(1).split('').map((c) => parseInt(c + c, 16)) : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const l = (0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]) / 255;
      if (l < 0.25) return 'var(--ez-encre)';
      if (l > 0.85) return 'var(--ez-blanc)';
      throw new Error(`${nom} : couleur littérale non reliée à un jeton : ${h}`);
    });
  // attributs de présentation contenant var()/color-mix()/rgb(var()) → style (les attributs n'acceptent pas var())
  s = s.replace(/<([a-zA-Z]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g, (m, tag, attrs, fin) => {
    const props = [], reste = [];
    for (const [, k, v] of attrs.matchAll(/\s+([\w:-]+)="([^"]*)"/g)) {
      if (['fill', 'stroke', 'stop-color', 'flood-color'].includes(k) && /var\(|color-mix\(/.test(v)) props.push(`${k}:${v}`);
      else if (k === 'style') props.unshift(v.replace(/;$/, ''));
      else reste.push(` ${k}="${v}"`);
    }
    return `<${tag}${reste.join('')}${props.length ? ` style="${props.join(';')}"` : ''}${fin ? '/' : ''}>`;
  });
  return s;
}
// Les identifiants internes (clipPath, dégradés) sont préfixés par « EZID- » : rendu.ts les rend uniques à chaque appel.
const idsUniques = (svg, id) => svg.split(id).join('EZID');

// ———————————————————————————————————————— 3. Les éléments
const EL = {};
// viewBox 'auto' : boîte des tracés (sommets et points de contrôle, légère surestimation) + marge de 10 u, arrondie à l'unité
function boite(corps, marge = 10) {
  const xs = [], ys = [];
  for (const [, d] of corps.matchAll(/ d="([^"]*)"/g)) for (const [, x, y] of d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) { xs.push(+x); ys.push(+y); }
  for (const [, cx, cy, rx, ry] of corps.matchAll(/cx="(-?[\d.]+)" cy="(-?[\d.]+)" rx="([\d.]+)" ry="([\d.]+)"/g)) { xs.push(+cx - +rx, +cx + +rx); ys.push(+cy - +ry, +cy + +ry); }
  const x0 = Math.floor(Math.min(...xs) - marge), y0 = Math.floor(Math.min(...ys) - marge);
  return [x0, y0, Math.ceil(Math.max(...xs) + marge) - x0, Math.ceil(Math.max(...ys) + marge) - y0];
}
const ajouter = (id, viewBox, corps, extra = {}) => { EL[id] = { viewBox: viewBox === 'auto' ? boite(corps) : viewBox, corps, ...extra }; };
// Détail agrandi (POD-AT-0009 tient dans le cercle r 190 du médaillon TRV-AT-0007) : découpé par le médaillon, anneau fin par-dessus
const dansMedaillon = (corps) => `<defs><clipPath id="EZID-med"><circle cx="${OBJETS.MED.c[0]}" cy="${OBJETS.MED.c[1]}" r="${OBJETS.MED.r}"/></clipPath></defs>`
  + `<circle cx="${OBJETS.MED.c[0]}" cy="${OBJETS.MED.c[1]}" r="${OBJETS.MED.r}" style="fill:var(--ez-fond)"/><g clip-path="url(#EZID-med)">${corps}</g>`
  + `<circle cx="${OBJETS.MED.c[0]}" cy="${OBJETS.MED.c[1]}" r="${OBJETS.MED.r}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-normal)"/>`;

// 3.1 Pied dorsal et plantaire v1 (POD-AT-0001, POD-AT-0002 v1.0.0, validés) — état `repos`
ajouter('pied-dorsal', 'auto', rendre(PIED.modelePiedDorsal(), etat('pied-dorsal', 'repos')));
ajouter('pied-plantaire', 'auto', rendre(PIED.modelePiedPlantaire(), etat('pied-plantaire', 'repos')));
// 3.2 Pied v2 (pied-v2.mjs, style D « aquarelle ») : NON repris — géométrie proposée, non promue en bibliothèque ÉcranZen (avis de l'illustrateur médical).
// 3.3 Empreinte (trace d'appui de POD-SC-0007, scène validée) sur la plante : contour de la plante + trace avec pulpes
{
  const m = SEMELLE.modeleTraceAppuis({ orteils: true, tok: 'accent', o: 80 });
  ajouter('empreinte', 'auto', rendre(m, canaux('trace')));
}
// 3.4 Pied de profil médial (POD-AT-0003 v1.0.0 validé, état repos) + sol
{
  const sol = `<path d="M-20,${PROFIL.SOL_PROFIL} L560,${PROFIL.SOL_PROFIL}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.5"/>`;
  ajouter('pied-profil-medial', [20, -180, 470, 640], rendre(PROFIL.modelePiedProfilMedial()) + sol);
  // État `ongle-epais` (POD-AT-0003 v1.2, ongle épais, malléole légère) : construction identique à html/outils/construire.mjs §3a
  const Y = -330, q = (v) => Math.round(v * 100) / 100, tg = (p, c) => [p[0] + (p[0] - c[0]) * ((Y - p[1]) / (p[1] - c[1])), Y];
  const [gx, gy] = tg([48, -160], [52, -60]), [dx, dy] = tg([206, -160], [208, -60]);
  const m = PROFIL.modelePiedProfilMedial({ ongle: 'epais', malleole: 'legere' });
  for (const c of m.calques) {
    if (c.nm === 'pied/peau') c.groupes[0].d = PROFIL.PROFIL_CORPS + ` M48,-160 L${q(gx)},${q(gy)} L${q(dx)},${q(dy)} L206,-160 Z`;
    if (c.nm === 'pied/contour' || c.nm === 'pied/contour-premier-plan') c.groupes[0].d = PROFIL.PROFIL_CONTOUR + ` M48,-160 L${q(gx)},${q(gy)} M206,-160 L${q(dx)},${q(dy)}`;
  }
  m.calques = m.calques.filter((c) => !c.canal && c.nm !== 'pied/contour');
  ajouter('pied-profil-ongle-epais', [300, 340, 190, 110], rendre(m));
}
// 3.5 Anatomie par transparence (POD-AT-0003 + squelette, tendon calcanéen, aponévrose plantaire schématisée ×2), avec et sans épine
//     calcanéenne — construction identique à html/outils/construire.mjs §3a bis (masques de fondu en jetons blanc → noir).
for (const epine of [false, true]) {
  const Y = -800, q = (v) => Math.round(v * 100) / 100, tg = (p, c) => [p[0] + (p[0] - c[0]) * ((Y - p[1]) / (p[1] - c[1])), Y];
  const [gx, gy] = tg([48, -160], [52, -60]), [dx, dy] = tg([206, -160], [208, -60]);
  const ext = `M48,-160 L${q(gx)},${q(gy)} L${q(dx)},${q(dy)} L206,-160 Z`, extTrait = `M48,-160 L${q(gx)},${q(gy)} M206,-160 L${q(dx)},${q(dy)}`;
  const m = JAMBE.modelePiedProfilMedialTendon({ epine });
  m.calques = m.calques.filter((c) => !/^(muscle|zone|appui)\//.test(c.nm) && !['tendon/calcaneen-tendu', 'peau/relief-tendon', 'pied/contour'].includes(c.nm));
  for (const c of m.calques) {
    if (c.nm === 'pied/peau' || c.nm === 'peau/voile') c.groupes[0].d = PROFIL.PROFIL_CORPS + ' ' + ext;
    if (c.nm === 'pied/contour-premier-plan') c.groupes[0].d = PROFIL.PROFIL_CONTOUR + ' ' + extTrait;
    for (const g of c.groupes || []) if (g.fl && g.fl.tok === 'fond' && /voile/.test(g.nm)) g.fl = { tok: 'blanc', o: 62 };
    if (c.nm === 'tendon/calcaneen') c.attrs = ' opacity="0.45" mask="url(#EZID-fondu-tendon)"';
    if (['peau/voile', 'os/tibia', 'os/fibula'].includes(c.nm)) c.attrs = ' mask="url(#EZID-fondu-jambe)"';
  }
  // l'aponévrose est un CANAL de la scène ÉcranZen : ici, toujours visible
  const apo = { nm: 'aponevrose/plantaire', groupes: [{ nm: 'aponevrose', d: JAMBE.aponevrosePlantaire({ epine, schema: 2 }), fl: { tok: 'tendon', o: 100 }, st: { tok: 'trait', ep: 'fin', o: 100 } }] };
  m.calques.splice(m.calques.findIndex((c) => c.nm === 'orteil/1/contour'), 0, apo);
  const fondu = (id, y0, y1, x, w) => `<mask id="EZID-${id}" maskUnits="userSpaceOnUse" x="${x}" y="-900" width="${w}" height="1500"><linearGradient id="EZID-${id}-g" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}"><stop offset="0" style="stop-color:var(--ez-masque-plein)"/><stop offset="1" style="stop-color:var(--ez-masque-vide)"/></linearGradient><rect x="${x}" y="-900" width="${w}" height="1500" fill="url(#EZID-${id}-g)"/></mask>`;
  const defs = `<defs>${fondu('fondu-tendon', 330, 170, -100, 700)}${fondu('fondu-jambe', 330, 235, -200, 900)}</defs>`;
  const sol = `<path d="M-20,${PROFIL.SOL_PROFIL} L560,${PROFIL.SOL_PROFIL}" style="stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin);stroke-opacity:0.5"/>`;
  ajouter(epine ? 'pied-profil-anatomie-epine' : 'pied-profil-anatomie', [20, 150, 470, 310], defs + rendre(m, canaux('anatomie')) + sol, { ids: true });
  if (!epine) {
    const a = (tension) => `<path d="${T.versSvg(T.trace(JAMBE.aponevrosePlantaire({ epine, schema: 2, ...(tension ? { tension: 1, orteils: -18 } : {}) })), null, DEC)}" style="fill:var(--ez-tendon);stroke:var(--ez-trait);stroke-width:var(--ez-ep-fin)"/>`;
    ajouter('aponevrose-plantaire', [90, 395, 300, 50], a(false));
  }
}
// 3.6 Ongle de l'hallux (fondations-2, proposé) : vue de dessus agrandie ×3 (états repos, incarne) et coupe transversale
ajouter('hallux-dorsal', [56, 56, 400, 400], dansMedaillon(rendre(ONGLE.modeleHalluxDorsal(), { rotations: {}, canaux: ONGLE.ETATS_HALLUX_DORSAL.repos })), { ids: true });
ajouter('hallux-dorsal-incarne', [56, 56, 400, 400], dansMedaillon(rendre(ONGLE.modeleHalluxDorsal(), { rotations: {}, canaux: ONGLE.ETATS_HALLUX_DORSAL.incarne })), { ids: true });
ajouter('ongle-coupe', 'auto', rendre(ONGLE.modeleOngleCoupe(), { rotations: {}, canaux: ONGLE.ETATS_COUPE.repos }));
ajouter('ongle-coupe-incarne', 'auto', rendre(ONGLE.modeleOngleCoupe(), { rotations: {}, canaux: ONGLE.ETATS_COUPE.incarne }));
// 3.7 Semelle orthopédique de la bibliothèque (POD-AT-0004, POD-AT-0005 v1.0.0, validés)
ajouter('semelle-dorsal', 'auto', rendre(SEMELLE.modeleSemelleDorsal(), canaux('base', 'recouvrement', 'talonnette', 'voute', 'avant-pied')));
ajouter('semelle-dessous', 'auto', rendre(SEMELLE.modeleSemelleDorsal(), canaux('dessous')));
ajouter('semelle-profil-medial', 'auto', rendre(SEMELLE.modeleSemelleProfil(), canaux('voute', 'recouvrement', 'galbee')));
// 3.8 Chaussure de profil médial (TRV-AT-0009 v1.0.0 validé, état ville)
ajouter('chaussure-profil-medial', 'auto', rendre(SEMELLE.modeleChaussureProfil()));
// 3.9 Sandale de piscine (POD-AT-0006 v1.0.0 validé) : claquette et tong posées
ajouter('sandale-claquette', 'auto', rendre(PISCINE.modeleSandale(), { rotations: {}, canaux: PISCINE.ETATS_SANDALE['claquette-posee'].canaux }));
ajouter('sandale-tong', 'auto', rendre(PISCINE.modeleSandale(), { rotations: {}, canaux: PISCINE.ETATS_SANDALE['tong-posee'].canaux }));
// 3.10 Médaillon de zoom et rond de repérage (TRV-AT-0007 v1.0.0 validé)
{ // médaillon seul (fond + anneau) comme l'élément html/elements/medaillon.svg : le cône de liaison dépend de la scène (rond ↔ médaillon)
  const m = OBJETS.modeleMedaillon();
  m.calques = m.calques.filter((c) => c.nm !== 'medaillon/cone');
  ajouter('medaillon', [56, 56, 400, 400], rendre(m, canaux('visible')));
}
ajouter('rond-reperage', [196, 196, 120, 120], rendre(OBJETS.modeleMedaillon(), canaux('reperage')));

// 3.11 Éléments HTML colorés (génériques, sans marque : JURIDIQUE.md de chaque dossier)
const SO = chargerElement('semelle-ortho/semelle-ortho.js');
const palSO = varsPalette('so', SO.PALETTES.sport.lagon);
for (const [vue, vb] of [['dessus', [-95, -235, 190, 470]], ['dessous', [-95, -235, 190, 470]], ['profil', [60, 340, 860, 130]]]) {
  const brut = SO.svg(vue, { modele: 'sport', palette: palSO, neuve: true, id: 'EZID' });
  ajouter(`semelle-ortho-${vue}`, vb, idsUniques(sansLitterales(brut, `semelle-ortho ${vue}`), 'EZID'), { ids: true });
}
const CH = chargerElement('chaussure-running/chaussure-running.js');
const palCH = varsPalette('ch', CH.PALETTES.glacier);
for (const [vue, vb] of [['profil', [-20, 50, 1040, 430]], ['trois-quarts', [-20, 30, 1060, 450]], ['dessous', [-140, -310, 280, 620]]]) {
  const brut = CH.svg(vue, { palette: palCH, id: 'EZID' });
  ajouter(`chaussure-running-${vue}`, vb, idsUniques(sansLitterales(brut, `chaussure-running ${vue}`), 'EZID'), { ids: true });
}
const PR = chargerElement('praticien/praticien.js');
{
  const pal = { ...varsPalette('pr', PR.PALETTES.glacier), sombre: false };
  const blouse = varsPalette('pr-blouse', PR.BLOUSES.blanche);
  const brut = PR.svg('neutre', { palette: pal, blouse, id: 'EZID' });
  ajouter('praticien', [0, 0, 600, 600], idsUniques(sansLitterales(brut, 'praticien'), 'EZID'), { ids: true });
}

// ———————————————————————————————————————— 4. Contrôles et écriture
const jetons = new Set();
for (const [id, e] of Object.entries(EL)) {
  if (/NaN|undefined|Infinity/.test(e.corps)) throw new Error(`${id} : valeur invalide`);
  if (/#[0-9a-f]{3,8}\b(?![\w-])/i.test(e.corps.replace(/url\(#[^)]*\)/g, ''))) throw new Error(`${id} : couleur littérale`);
  for (const m of e.corps.matchAll(/var\(--ez-([\w-]+)\)/g)) jetons.add(m[1]);
}
const lignes = Object.entries(EL).map(([id, e]) => `  ${JSON.stringify(id)}: { viewBox: ${JSON.stringify(e.viewBox)}, ids: ${!!e.ids}, corps: ${JSON.stringify(e.corps)} },`);
const ts = `// GÉNÉRÉ par packages/core/scripts/extraire-ecranzen.mjs depuis le studio ÉcranZen (outils/lib/geometrie/, html/elements/) — ne pas éditer.
// Tracés repris tels quels (aucun redessin). Couleurs : variables --ez-<jeton> ; épaisseurs : --ez-ep-<fin|normal|epais>. Le rendu
// (bibliotheque/rendu.ts) relie ces variables à la charte des sites. Identifiants internes « EZID » rendus uniques à chaque appel.
/* eslint-disable */
export interface FormeEcranZen { viewBox: readonly [number, number, number, number]; ids: boolean; corps: string }
/** Jetons utilisés par les formes (contrôlés par rendu.ts : chacun doit avoir sa correspondance dans la charte des sites). */
export const JETONS_FORMES = ${JSON.stringify([...jetons].sort())} as const;
export const FORMES: Record<string, FormeEcranZen> = {
${lignes.join('\n')}
};
`;
writeFileSync(SORTIE, ts);
for (const [id, e] of Object.entries(EL)) console.log(`  ${id.padEnd(30)} ${(Buffer.byteLength(e.corps) / 1024).toFixed(1).padStart(6)} ko`);
console.log(`✓ ${Object.keys(EL).length} éléments → ${SORTIE} (${(Buffer.byteLength(ts) / 1024).toFixed(0)} ko) ; jetons : ${[...jetons].sort().join(', ')}`);
