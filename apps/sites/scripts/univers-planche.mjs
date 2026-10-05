// Planche du catalogue des univers : construit la démo avec chaque univers, capture l'accueil sur ordinateur
// (1440 × 900) et sur mobile (390 × 844) dans Chromium, puis assemble une planche (planche.html et planche.png),
// comme le praticien verra le catalogue. Les univers « differe » (plus tard) et « retire » sont exclus.
// Usage : npm run univers:planche [-- --sortie <dossier>] [--gros-plans id1,id2] [id…]
//   --gros-plans : captures pleine page (ordinateur et mobile) des univers indiqués, en plus de la planche.
// Prérequis (une fois) : npx playwright install chromium
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { catalogue, construire, servir } from './univers-commun.mjs';

const args = process.argv.slice(2);
const option = (nom) => { const i = args.indexOf(nom); return i >= 0 ? args[i + 1] : undefined; };
const valeurs = new Set([option('--sortie'), option('--gros-plans')].filter(Boolean));
const ids = args.filter((a) => !a.startsWith('--') && !valeurs.has(a));
const sortie = resolve(option('--sortie') ?? join(tmpdir(), 'plateforme-univers', 'planche'));
const grosPlans = (option('--gros-plans') ?? '').split(',').filter(Boolean);
mkdirSync(sortie, { recursive: true });

const { CATALOGUE_UNIVERS, LIBELLES_STATUTS_UNIVERS } = await catalogue();
const liste = CATALOGUE_UNIVERS.filter((u) => (ids.length ? ids.includes(u.id) : !['differe', 'retire'].includes(u.statut)));
const ECRANS = { ordinateur: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };

const nav = await chromium.launch();
async function capturer(url, ecran, fichier, pleinePage = false) {
  const { width, height, ...reste } = ECRANS[ecran];
  // Mouvement réduit : les animations d'accueil montrent leur image complète (vignette stable).
  const ctx = await nav.newContext({ viewport: { width, height }, reducedMotion: 'reduce', ...reste });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (pleinePage) {
    // Fait défiler pour déclencher les apparitions au défilement, puis revient en haut.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(sortie, fichier), fullPage: pleinePage });
  await ctx.close();
}

const resultats = [];
for (const u of liste) {
  console.log(`→ ${u.nom} : construction…`);
  const dossier = construire(u.id, { silencieux: true });
  const { url, fermer } = await servir(dossier);
  await capturer(url, 'ordinateur', `${u.id}-ordinateur.png`);
  await capturer(url, 'mobile', `${u.id}-mobile.png`);
  if (grosPlans.includes(u.id)) {
    await capturer(url, 'ordinateur', `${u.id}-ordinateur-page.png`, true);
    await capturer(url, 'mobile', `${u.id}-mobile-page.png`, true);
  }
  fermer();
  resultats.push(u);
}

const echap = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Catalogue des univers</title><style>
body{margin:0;padding:40px;background:#f3f4f2;font:15px/1.45 system-ui,sans-serif;color:#0b1c24}
h1{margin:0 0 4px;font-size:26px}p.intro{margin:0 0 28px;color:#555}
.grille{display:grid;grid-template-columns:repeat(2,1fr);gap:28px}
.carte{background:#fff;border-radius:14px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.vues{display:grid;grid-template-columns:1fr 150px;gap:12px;align-items:start}
.vues img{width:100%;border-radius:8px;border:1px solid #ddd;display:block}
h2{margin:14px 0 2px;font-size:18px}.pour{margin:0;color:#333}.statut{font-size:12px;color:#7a5c00;background:#fff4d6;border-radius:99px;padding:2px 8px;margin-left:6px;vertical-align:middle}
.regl{margin:8px 0 0;font:12px/1.4 ui-monospace,monospace;color:#666}
</style></head><body><h1>Catalogue des univers</h1><p class="intro">Accueil sur ordinateur et sur mobile, démo fictive de Lyon. ${resultats.length} univers.</p><div class="grille">
${resultats.map((u) => { const p = u.preReglage; return `<div class="carte"><div class="vues"><img src="${u.id}-ordinateur.png" alt=""><img src="${u.id}-mobile.png" alt=""></div>
<h2>${echap(u.nom)}<span class="statut">${echap(LIBELLES_STATUTS_UNIVERS[u.statut])}</span></h2><p class="pour">${echap(u.pourQui)}</p>
<p class="regl">${echap(`${p.modele} · ${p.gamme} · ${p.specialite}${p.specialiteSecondaire ? ` + ${p.specialiteSecondaire}` : ''} · ${p.registre} · ${p.modeVisuel} · animation ${p.animation ? 'oui' : 'non'} · logo ${p.logo.marque}`)}<br>${echap(p.soinsEnAvant.join(' › '))}</p></div>`; }).join('\n')}
</div></body></html>`;
writeFileSync(join(sortie, 'planche.html'), html);
const ctx = await nav.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto(pathToFileURL(join(sortie, 'planche.html')).href, { waitUntil: 'load' });
await page.screenshot({ path: join(sortie, 'planche.png'), fullPage: true });
await nav.close();
console.log(`\n✓ Planche : ${join(sortie, 'planche.png')} (et planche.html, captures par univers)`);
