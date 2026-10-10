// Cadrages des dessins de la marque (retour de Paul du 2026-10-10 : « les images ne sont pas centrées dans leurs cases »).
// Mesure, dans Chromium, la boîte du tracé VISIBLE de chaque dessin dans son repère 240 × 180 (relevé, pédagogique, trait continu)
// et les côtés où il sort volontairement du repère (fond perdu : jambe qui entre par le haut, orteils coupés à droite…), puis écrit
// packages/core/src/cadrages-dessins-donnees.ts, lu par cadrageDessin (cadrages-dessins.ts) pour poser un viewBox centré sur le
// dessin réel dans les cases (cartes de soins, sujets, aperçu de l'admin).
// Même géométrie que le contrôle « cadrage » du testeur (testeur-modeles/mesures-visuels.mjs).
// Usage (racine du dépôt) : node apps/sites/scripts/mesurer-cadrages-dessins.mjs   [--verifier : code 1 si les données ont changé]
import { chromium } from 'playwright';
import { build as esbuild } from 'esbuild';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEPOT } from '../../../packages/core/scripts/chemins.mjs';
import { mesurerVisuels } from './testeur-modeles/mesures-visuels.mjs';

const racineSites = fileURLToPath(new URL('..', import.meta.url));
const sortieCore = join(tmpdir(), `cadrages-core-${process.pid}.mjs`);
await esbuild({
  stdin: { contents: `export { svgDessin, svgLigne, DESSINS_PODOLOGIE, DESSINS_LIGNE, DESSINS_FENETRE_OUVERTE } from '@plateforme/core';`, resolveDir: racineSites, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: sortieCore, logLevel: 'silent', loader: { '.svg': 'text' },
});
const core = await import(pathToFileURL(sortieCore).href);
rmSync(sortieCore, { force: true });

const css = readFileSync(join(DEPOT, 'packages/core/src/dessins.css'), 'utf8');
const items = [
  ...['releve', 'pedagogique'].flatMap((r) => core.DESSINS_PODOLOGIE.map((n) => [`${r}:${n}`, core.svgDessin(n, { registre: r, id: `c-${r}-${n}` })])),
  ...core.DESSINS_LIGNE.map((n) => [`ligne:${n}`, core.svgLigne(n)]),
];
const html = `<!doctype html><meta charset="utf-8"><style>${css}
body{margin:0;display:flex;flex-wrap:wrap;gap:300px;padding:300px;color:#000;--dessin-trait:#000;--dessin-ligne:#000;--dessin-accent:#c00}
[data-repere]{width:240px;height:180px;flex:none}[data-ouvert] svg svg{overflow:visible}[data-repere]>svg{display:block;width:240px;height:180px}</style>
${items.map(([cle, svg]) => `<div data-repere="${cle}"${core.DESSINS_FENETRE_OUVERTE.has(cle) ? ' data-ouvert' : ''}>${svg}</div>`).join('\n')}`;
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 3000, height: 2000 }, reducedMotion: 'reduce' });
await page.setContent(html, { waitUntil: 'load' });
const mesures = await page.evaluate(mesurerVisuels, { mode: 'repere' });
await navigateur.close();

const r1 = (v) => Math.round(v * 10) / 10;
const lignes = [];
for (const m of mesures) {
  if (!m.visible) { console.warn(`Aucun tracé visible : ${m.cle}`); continue; }
  const v = { x: Math.max(0, m.visible.x), y: Math.max(0, m.visible.y), d: Math.min(240, m.visible.d), b: Math.min(180, m.visible.b) };
  // Fond perdu : le tracé touche le bord du repère (il en sort, ou s'y arrête net : jambe tracée depuis le haut du repère), ou il
  // est COUPÉ de ce côté par une fenêtre interne (dessin de la bibliothèque recadré dans un <svg> imbriqué : orteil coupé net)
  const bord = 1.5, coupe = 1;
  const f = (v.x <= bord || m.tout.x < v.x - coupe ? 1 : 0) | (v.d >= 240 - bord || m.tout.d > v.d + coupe ? 2 : 0) | (v.y <= bord || m.tout.y < v.y - coupe ? 4 : 0) | (v.b >= 180 - bord || m.tout.b > v.b + coupe ? 8 : 0);
  lignes.push(`  '${m.cle}': [${[v.x, v.y, v.d, v.b].map(r1).join(', ')}, ${f}],`);
}
const contenu = `// FICHIER GÉNÉRÉ par apps/sites/scripts/mesurer-cadrages-dessins.mjs (ne pas modifier à la main ; relancer après avoir retouché un
// dessin). Boîte du tracé VISIBLE de chaque dessin dans son repère 240 × 180 : [gauche, haut, droite, bas, fond perdu], fond perdu
// en bits (1 gauche, 2 droite, 4 haut, 8 bas) : côtés où le dessin sort volontairement du repère. Lu par cadrageDessin.
export const BOITES_DESSINS: Readonly<Record<string, readonly [number, number, number, number, number]>> = {
${lignes.join('\n')}
};
`;
const cible = join(DEPOT, 'packages/core/src/cadrages-dessins-donnees.ts');
if (process.argv.includes('--verifier')) {
  const ok = existsSync(cible) && readFileSync(cible, 'utf8') === contenu;
  console.log(ok ? 'Cadrages des dessins à jour.' : 'Cadrages des dessins périmés : relancer node apps/sites/scripts/mesurer-cadrages-dessins.mjs');
  process.exit(ok ? 0 : 1);
}
writeFileSync(cible, contenu);
console.log(`${lignes.length} dessins mesurés → ${cible}`);
