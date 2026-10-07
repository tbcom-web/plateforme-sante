// Rendus réels de recettes du Studio, pour le directeur artistique (.claude/agents/directeur-artistique.md) : chaque composition
// (forme de serialiserComposition, recettes.ts) est injectée dans le site de démo (RECETTE=…, apps/sites/src/data/sites/
// demo-podologue-lyon.ts), construite HORS de apps/sites/dist (astro build --outDir), puis capturée (Playwright) : accueil, page
// sujet et page d'accès, en 1440 et 375 px, images paresseuses chargées ; une planche par essai assemble accueil 1440, accueil
// 375, page sujet 375 et accès 375.
//
// Usage : node scripts/rendre-recettes.mjs --sortie <dossier du scratchpad> <a.json> [b.json…]
//   chaque <x>.json a un voisin <x>.sujets (sujets séparés par des virgules, le n° 1 d'abord ; SECONDAIRES vide).
// Sortie : <dossier>/builds/<id>/, <dossier>/captures/<id>-<page>-<largeur>.png, <dossier>/fiches/<id>.png.
// Un build déjà présent est réutilisé (supprimer son dossier pour reconstruire). Aucun réseau hors photos déjà hébergées.
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const racineDepot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITES = join(racineDepot, 'apps', 'sites');
const args = process.argv.slice(2);
const i = args.indexOf('--sortie');
if (i < 0 || !args[i + 1]) throw new Error('Usage : node scripts/rendre-recettes.mjs --sortie <dossier> <composition.json>…');
const sortie = resolve(args[i + 1]);
const fichiers = args.filter((_, k) => k !== i && k !== i + 1).map((f) => resolve(f));
if (!fichiers.length) throw new Error('Aucune composition à rendre.');
if (resolve(sortie).startsWith(resolve(SITES))) throw new Error('Sortie interdite dans apps/sites (choisir un dossier du scratchpad).');
for (const d of ['builds', 'captures', 'fiches']) mkdirSync(join(sortie, d), { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
let racine = '';
const serveur = createServer((req, res) => {
  let f = join(racine, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  if (!f.startsWith(racine)) { res.writeHead(403); res.end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f) && existsSync(`${f}.html`)) f = `${f}.html`;
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => serveur.listen(0, '127.0.0.1', () => r(undefined)));
const port = /** @type {import('node:net').AddressInfo} */ (serveur.address()).port;
const nav = await chromium.launch();

try {
  for (const fichier of fichiers) {
    const id = basename(fichier, '.json');
    const sujets = readFileSync(fichier.replace(/\.json$/, '.sujets'), 'utf8').trim();
    const out = join(sortie, 'builds', id);
    if (!existsSync(join(out, 'index.html'))) {
      const t = Date.now();
      execSync(`npx astro build --outDir "${out}"`, { cwd: SITES, stdio: 'ignore', env: { ...process.env, RECETTE: fichier, PRINCIPAUX: sujets, SECONDAIRES: '', PLAN_OSM: 'non' } });
      console.log(`${id} : construit en ${Math.round((Date.now() - t) / 1000)} s`);
    }
    racine = out;
    const pages = { accueil: '/', theme: `/themes/${sujets.split(',')[0]}`, acces: '/acces' };
    for (const [nom, url] of Object.entries(pages)) {
      for (const largeur of [1440, 375]) {
        const ctx = await nav.newContext({ viewport: { width: largeur, height: largeur === 375 ? 812 : 900 }, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
          document.querySelectorAll('img[loading=lazy]').forEach((im) => im.setAttribute('loading', 'eager'));
          for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(500);
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.screenshot({ fullPage: true, path: join(sortie, 'captures', `${id}-${nom}-${largeur}.png`), clip: { x: 0, y: 0, width: largeur, height: Math.min(h, largeur === 375 ? 2600 : 2200) } });
        await ctx.close();
      }
    }
    const ctx = await nav.newContext({ viewport: { width: 1700, height: 1000 } });
    const page = await ctx.newPage();
    const img = (n) => `data:image/png;base64,${readFileSync(join(sortie, 'captures', `${id}-${n}.png`)).toString('base64')}`;
    await page.setContent(`<body style="margin:0;background:#ddd;font:14px sans-serif"><div style="padding:6px 10px;background:#222;color:#fff">${id}</div><div style="display:flex;gap:10px;align-items:flex-start;padding:10px"><img src="${img('accueil-1440')}" style="width:720px"><img src="${img('accueil-375')}" style="width:300px"><img src="${img('theme-375')}" style="width:300px"><img src="${img('acces-375')}" style="width:300px"></div></body>`);
    await page.screenshot({ path: join(sortie, 'fiches', `${id}.png`), fullPage: true });
    await ctx.close();
    console.log(`${id} : rendu`);
  }
} finally {
  await nav.close();
  serveur.close();
}
