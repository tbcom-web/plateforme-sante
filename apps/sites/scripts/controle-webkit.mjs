// Contrôle du rendu iPhone (WebKit) face au rendu ordinateur (Chromium), même fenêtre iPhone 15.
// À placer dans apps/sites/scripts/controle-webkit.mjs ; script npm : "controle:webkit": "node scripts/controle-webkit.mjs".
//
// Prérequis (une fois) : npm i -D playwright pngjs pixelmatch && npx playwright install webkit chromium
// Usage :
//   node scripts/controle-webkit.mjs                      → sert dist/ sur un port libre, contrôle les pages clés
//   node scripts/controle-webkit.mjs --dist ../chemin/dist
//   node scripts/controle-webkit.mjs --url https://podologue-truchot-toulon.pages.dev --pages /,/soins
//   options : --seuil 4 (% de pixels différents tolérés par zone de 300 px), --sortie controle-webkit/
//
// Deux contrôles :
// 1. Statique : aucun fichier dist/dessins/*.svg ne doit contenir de <style>. WebKit (Safari, tous les navigateurs
//    iPhone) ignore les feuilles d'un document SVG externe référencé par <use href="/dessins/x.svg#d"> : les traits,
//    pointillés, étiquettes et couleurs d'accent disparaissent. Les styles doivent être en attributs style="".
// 2. Visuel : chaque page est capturée en WebKit et en Chromium (descripteur iPhone 15, 393 px), sections révélées,
//    animations figées (apparitions au défilement des jeux d'effets ramenées à leur état final : WebKit ne les joue pas), texte HTML rendu transparent (seuls les visuels comptent ; le texte SVG des dessins reste visible) (le WebKit de Playwright sous Windows
//    n'applique pas les axes des polices variables : sans cela, tout texte gras ressortirait). Différence de pixels
//    par zone de 300 px CSS ; une zone au-dessus du seuil fait échouer le contrôle. Planches WebKit | Chromium | diff
//    écrites dans le dossier de sortie.
import { webkit, chromium, devices } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { createServer } from 'node:http';
import { readFile, stat, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resoudre, sortieAutorisee } from '../../../packages/core/scripts/chemins.mjs';

// Arguments « --cle valeur » lus jeton par jeton : un chemin peut contenir « -- » (ex. C--Users…).
const args = {};
for (let i = 2, v = process.argv; i < v.length; i++) {
  if (!v[i].startsWith('--')) continue;
  const suivant = v[i + 1];
  args[v[i].slice(2)] = suivant !== undefined && !suivant.startsWith('--') ? (i++, suivant) : true;
}
const racine = fileURLToPath(new URL('..', import.meta.url));
const dist = resoudre(args.dist || join(racine, 'dist'));
const SEUIL = +(args.seuil || 4);
const SORTIE = sortieAutorisee(args.sortie || join(racine, 'controle-webkit')); // jamais C:c… (chemin MSYS), jamais hors du dépôt / du temporaire
const PAGES = (args.pages || '/,/soins,/le-cabinet,/acces,/modeles/dessins,/modeles/animations,/modeles/bibliotheque').split(',');
const BANDE = 300;
const defauts = [];

// 1. Contrôle statique des fichiers de dessins
if (!args.url) {
  const dossier = join(dist, 'dessins');
  for (const f of (await readdir(dossier).catch(() => [])).filter((f) => f.endsWith('.svg'))) {
    if (/<style[\s>]/.test(await readFile(join(dossier, f), 'utf8'))) defauts.push(`dessins/${f} : <style> dans un fichier référencé par <use> (ignoré par WebKit)`);
  }
}

// Serveur statique (format « file » d'Astro : /soins → soins.html)
let serveur, base = args.url;
if (!base) {
  const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.json': 'application/json' };
  const fichier = async (p) => { for (const c of [p, p + '.html', join(p, 'index.html')]) { try { if ((await stat(c)).isFile()) return c; } catch {} } return null; };
  serveur = createServer(async (req, res) => {
    const f = await fichier(join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': T[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  });
  await new Promise((r) => serveur.listen(0, r));
  base = `http://localhost:${serveur.address().port}`;
}

const FIGER = `*{-webkit-text-fill-color:transparent!important;text-shadow:none!important;font-family:Arial,Helvetica,sans-serif!important;font-variation-settings:normal!important;content-visibility:visible!important;animation-play-state:paused!important;animation-delay:-1s!important;animation-timeline:auto!important;transition:none!important;caret-color:transparent!important}canvas,video,.empreintes__scan{visibility:hidden!important}.barre-mobile,.consentement,[data-consent]{display:none!important}`;

async function capturer(type, chemin) {
  const nav = await type.launch();
  // DPR 1 : la réduction 3→1 diffère d'un moteur à l'autre et brouille la comparaison
  const ctx = await nav.newContext({ ...devices['iPhone 15'], deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(base + chemin, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    document.querySelectorAll('.apparait').forEach((e) => e.classList.add('pret', 'vu'));
    document.querySelectorAll('.anime-visible').forEach((e) => e.classList.add('en-vue'));
    document.querySelectorAll('use[data-dessin]').forEach((u) => u.getAttribute('href') || u.setAttribute('href', u.dataset.dessin));
    // Images différées : chargées et décodées avant la capture (sinon un moteur capture un cadre vide)
    document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
    await Promise.all([...document.images].map((i) => (i.complete ? i.decode() : new Promise((r) => { i.onload = i.onerror = r; })).catch(() => {})));
    scrollTo(0, 0);
  });
  await page.waitForTimeout(2500); // fin des transitions d'apparition et chargement des dessins
  await page.addStyleTag({ content: FIGER });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  // Capture pleine page, bornée à 32 000 px (limite des moteurs : la planche /modeles/dessins dépasse sur mobile)
  const [largeur, hauteur] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
  const png = PNG.sync.read(await page.screenshot(hauteur > 32000 ? { fullPage: true, scale: 'css', clip: { x: 0, y: 0, width: largeur, height: 32000 } } : { fullPage: true, scale: 'css' }));
  await nav.close();
  return png;
}

await mkdir(SORTIE, { recursive: true });
const bilan = [];
for (const chemin of PAGES) {
  const nom = chemin === '/' ? 'accueil' : chemin.slice(1).replaceAll('/', '_');
  const [a, b] = [await capturer(webkit, chemin), await capturer(chromium, chemin)];
  const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
  const cadre = (img) => { const o = new PNG({ width: w, height: h }); o.data.fill(255); PNG.bitblt(img, o, 0, 0, img.width, img.height, 0, 0); return o; };
  const A = cadre(a), B = cadre(b), D = new PNG({ width: w, height: h });
  pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.15, includeAA: false, alpha: 0.2 });
  const zones = [];
  for (let y0 = 0; y0 < h; y0 += BANDE) {
    let n = 0, t = 0;
    for (let y = y0; y < Math.min(y0 + BANDE, h); y++) for (let x = 0; x < w; x++) { t++; const i = (y * w + x) * 4; if (D.data[i] === 255 && D.data[i + 1] === 0 && D.data[i + 2] === 0) n++; }
    zones.push(+(100 * n / t).toFixed(2));
  }
  const P = new PNG({ width: w * 3 + 24, height: h }); P.data.fill(60);
  [A, B, D].forEach((img, k) => PNG.bitblt(img, P, 0, 0, w, h, k * (w + 12), 0));
  await writeFile(join(SORTIE, `${nom}.png`), PNG.sync.write(P));
  const hors = zones.map((v, i) => [i * BANDE, v]).filter(([, v]) => v > SEUIL);
  if (Math.abs(a.height - b.height) > 4) defauts.push(`${chemin} : hauteur WebKit ${a.height} px ≠ Chromium ${b.height} px`);
  hors.forEach(([y, v]) => defauts.push(`${chemin} : zone ${y}-${y + BANDE} px, ${v} % de pixels différents (seuil ${SEUIL} %) → ${nom}.png`));
  bilan.push({ chemin, hauteurs: [a.height, b.height], max: Math.max(...zones), zones });
  console.log(`${hors.length ? '✗' : '✓'} ${chemin}  max ${Math.max(...zones)} %`);
}
serveur?.close();
await writeFile(join(SORTIE, 'bilan.json'), JSON.stringify(bilan, null, 1));
if (defauts.length) {
  console.error(`\n${defauts.length} écart(s) WebKit/Chromium :\n- ${defauts.join('\n- ')}\nPlanches : ${SORTIE}`);
  process.exit(1);
}
console.log(`Rendu WebKit (iPhone) conforme au rendu Chromium sur ${PAGES.length} pages. Planches : ${SORTIE}`);
