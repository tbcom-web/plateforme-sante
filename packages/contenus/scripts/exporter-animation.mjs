// EXPORT d'une animation des sites en vidéo pour ÉcranZen (salle d'attente 16:9, Reels 9:16), image par image.
//
//   node packages/contenus/scripts/exporter-animation.mjs [meulage] [--format 16x9|9x16|tous] [--etiquettes] [--registre releve|pedagogique]
//        [--gamme <id>] [--sortie <dossier>] [--sans-video] [--images] [--planche]
//
// Source unique : packages/core/src/meulage.ts (svgMeulage + cssMeulage), la même que l'animation du site (Meulage.astro) ; seuls le
// cadrage (1920 × 1080 ou 1080 × 1920), le cycle (12 s : règle de lecture d'ÉcranZen) et les étiquettes facultatives changent.
// La page de lecture expose window.ezAller(t) / window.ezPret comme le moteur de Reels (scripts/reel.mjs) : chaque image est une
// fonction du temps seul (animations CSS en pause, positionnées à t), donc l'export et les planches montrent ce que joue l'écran.
// Sorties (par format) : <id>.<format>[.etiquettes].mp4 (H.264, yuv420p, 30 i/s, boucle parfaite : l'image 360 est l'image 0),
// .webm (VP9), .affiche.png (image figée) ; --images garde la séquence PNG ; --planche : planche des étapes (sites, 4:3).
// ffmpeg : variable FFMPEG, ffmpeg du dépôt winget, sinon « ffmpeg » du PATH ; s'il manque, la séquence PNG est écrite avec un
// script d'assemblage (assembler.cmd / assembler.sh) à lancer une fois ffmpeg installé.
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import { RACINE } from './construire.mjs';
import { sortieAutorisee, sousDossier } from '../../core/scripts/chemins.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const DEPOT = join(RACINE, '../..');
const id = args.find((a, k) => !a.startsWith('--') && !args[k - 1]?.startsWith('--')) ?? 'meulage';
if (id !== 'meulage') { console.error(`✗ animation « ${id} » : seule « meulage » a une version ÉcranZen pour l'instant`); process.exit(1); }
const FORMATS = { '16x9': [1920, 1080], '9x16': [1080, 1920] };
const formats = opt('format', 'tous') === 'tous' ? Object.keys(FORMATS) : [opt('format')];
if (formats.some((f) => !FORMATS[f])) { console.error('✗ --format : 16x9, 9x16 ou tous'); process.exit(1); }
const etiquettes = args.includes('--etiquettes');
const registre = opt('registre', 'releve');
const SORTIE = sortieAutorisee(opt('sortie', join(RACINE, 'dist/animations')));
const IPS = 30;
const FFMPEG = [process.env.FFMPEG, 'C:/Users/pault/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe']
  .find((f) => f && existsSync(f)) ?? (spawnSync('ffmpeg', ['-version']).status === 0 ? 'ffmpeg' : null);
const video = !args.includes('--sans-video');

// ———————————————————————————————— core (TypeScript) assemblé pour Node
const paquet = join(tmpdir(), `exporter-animation-${process.pid}.mjs`);
await build({
  stdin: { contents: "export { svgMeulage, CYCLE_ECRANZEN_MS, ETAPES_MEULAGE, ALT_MEULAGE, feuilleCharte, SURFACES_CSS, GAMMES, variablesGamme } from '@plateforme/core';", resolveDir: RACINE, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: paquet, logLevel: 'error', loader: { '.svg': 'text', '.css': 'text' },
});
const C = await import(pathToFileURL(paquet).href);
rmSync(paquet, { force: true });
const gamme = C.GAMMES.find((g) => g.id === opt('gamme')) ?? C.GAMMES[0];
const varsGamme = Object.entries(C.variablesGamme(gamme)).map(([k, v]) => `${k}:${v}`).join(';');
const DUREE = C.CYCLE_ECRANZEN_MS / 1000;
const IMAGES = Math.round(DUREE * IPS);
// Police des Reels (Sora, OFL, copiée d'ÉcranZen dans reels/polices) : zones de texte calibrées pour elle
const sora = `data:font/ttf;base64,${readFileSync(join(RACINE, 'reels/polices/Sora-VF.ttf')).toString('base64')}`;

/** Page de lecture : scène plein cadre, fond plan d'architecte (relevé) ou fond doux (pédagogique), animation pilotée par ezAller */
function page(contenu, l, h, extra = '') {
  return `<!doctype html><html lang="fr" style="${varsGamme}"><head><meta charset="utf-8"><title>${C.ALT_MEULAGE}</title><style>
@font-face{font-family:"Sora";font-weight:100 800;font-display:block;src:url("${sora}")}
${C.feuilleCharte()}${C.SURFACES_CSS}
html,body{margin:0;background:var(--plan)}
.scene{width:${l}px;height:${h}px;overflow:hidden;--mg-police:"Sora";--mg-texte:var(--papier);--mg-duree:${C.CYCLE_ECRANZEN_MS}ms}
.scene--pedagogique{background:var(--doux);--mg-texte:var(--encre)}
.scene>svg{display:block;width:100%;height:100%}${extra}
</style></head><body>${contenu}
<script>
const anims = () => document.getAnimations();
window.ezAller = (t) => { for (const a of anims()) { a.pause(); a.currentTime = t * 1000; } };
document.fonts.ready.then(() => { window.ezAller(0); window.ezPret = true; });
</script></body></html>`;
}
const scene = (format, opts = {}) => {
  const [l, h] = FORMATS[format] ?? [400, 300];
  const r = opts.registre ?? registre;
  return `<div class="scene ${r === 'releve' ? 'surface-plan' : 'scene--pedagogique'}" style="width:${l}px;height:${h}px">${C.svgMeulage({ format: FORMATS[format] ? format : 'site', registre: r, etiquettes: opts.etiquettes ?? etiquettes, anime: opts.anime ?? true, classe: (opts.anime ?? true) ? 'meulage--lecture' : '', titre: C.ALT_MEULAGE })}</div>`;
};

const pw = await import(pathToFileURL(createRequire(join(DEPOT, 'apps/sites/package.json')).resolve('playwright')).href);
const navigateur = await (pw.chromium ?? pw.default.chromium).launch();
mkdirSync(SORTIE, { recursive: true });
const journal = [];

async function ouvrir(html, l, h, nom) {
  const fichier = join(SORTIE, `_${nom}.html`);
  writeFileSync(fichier, html);
  const onglet = await navigateur.newPage({ viewport: { width: l, height: h }, deviceScaleFactor: 1 });
  onglet.on('pageerror', (e) => journal.push(e.message));
  await onglet.goto(pathToFileURL(fichier).href);
  await onglet.waitForFunction(() => window.ezPret, null, { timeout: 30000 });
  return { onglet, fichier };
}

// ———————————————————————————————— vidéos
for (const format of formats) {
  const [l, h] = FORMATS[format];
  const base = join(SORTIE, `${id}.${format}${etiquettes ? '.etiquettes' : ''}${registre === 'releve' ? '' : `.${registre}`}`);
  const { onglet, fichier } = await ouvrir(page(scene(format), l, h), l, h, `${id}-${format}`);
  const aller = (f) => onglet.evaluate((t) => window.ezAller(t), f / IPS);
  // Affiche : la pose de l'image figée du site (fraise posée, ongle encore épais)
  await aller(Math.round(3.9 * IPS)); await onglet.screenshot({ path: `${base}.affiche.png` });
  const garderImages = args.includes('--images') || !FFMPEG || !video;
  const dossierImages = garderImages ? sousDossier(SORTIE, `${id}.${format}.images`) : null;
  if (dossierImages) mkdirSync(dossierImages, { recursive: true });
  const encodeurs = FFMPEG && video ? [
    ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', `${base}.mp4`],
    ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', '33', '-row-mt', '1', `${base}.webm`],
  ].map((sortie) => {
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(IPS), '-c:v', 'png', '-i', '-', ...sortie], { stdio: ['pipe', 'inherit', 'inherit'] });
    return { ff, fin: new Promise((ok, ko) => ff.on('close', (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg : code ${c}`))))) };
  }) : [];
  const t0 = Date.now();
  for (let f = 0; f < IMAGES; f++) {
    await aller(f);
    const png = await onglet.screenshot({ type: 'png' });
    if (dossierImages) writeFileSync(join(dossierImages, `${String(f).padStart(4, '0')}.png`), png);
    for (const { ff } of encodeurs) if (!ff.stdin.write(png)) await new Promise((ok) => ff.stdin.once('drain', ok));
    if (f % 60 === 0) process.stdout.write(`  … ${format} image ${f}/${IMAGES}\r`);
  }
  for (const { ff } of encodeurs) ff.stdin.end();
  await Promise.all(encodeurs.map((e) => e.fin));
  await onglet.close(); rmSync(fichier, { force: true });
  if (encodeurs.length) console.log(`  ✓ ${base}.mp4 et .webm (${IMAGES} images, ${DUREE} s en boucle, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  if (dossierImages && !encodeurs.length) {
    const cmd = (ext, s) => `ffmpeg -y -framerate ${IPS} -i "${dossierImages}${s}%04d.png" ${ext}`;
    writeFileSync(join(dossierImages, 'assembler.cmd'), `${cmd(`-c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart "${base}.mp4"`, '\\')}\r\n${cmd(`-c:v libvpx-vp9 -pix_fmt yuv420p -b:v 0 -crf 33 "${base}.webm"`, '\\')}\r\n`);
    writeFileSync(join(dossierImages, 'assembler.sh'), `#!/bin/sh\n${cmd(`-c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart "${base}.mp4"`, '/')}\n${cmd(`-c:v libvpx-vp9 -pix_fmt yuv420p -b:v 0 -crf 33 "${base}.webm"`, '/')}\n`);
    console.log(`  ! ${FFMPEG ? 'vidéo non demandée' : 'ffmpeg introuvable'} : ${IMAGES} images PNG et scripts d'assemblage dans ${dossierImages}`);
  }
}

// ———————————————————————————————— planche des étapes (version site, 4:3, sans texte) : 4 étapes + image figée, deux registres
if (args.includes('--planche')) {
  const ETAPES = [['a · ongle épaissi', 1.5], ['b · la fraise se pose', 3.3], ['c · meulage par couches', 5.4], ['d · ongle affiné', 9.6]];
  const ligne = (r) => `<div class="ligne"><p class="reg">${r === 'releve' ? 'relevé (fond plan)' : 'pédagogique'}</p>${ETAPES.map(([n], k) => `<figure>${scene('site', { registre: r, etiquettes: false }).replace('class="scene', `data-t="${ETAPES[k][1]}" class="scene`)}<figcaption>${n}</figcaption></figure>`).join('')}<figure>${scene('site', { registre: r, anime: false })}<figcaption>image figée (mouvements réduits, aperçus)</figcaption></figure></div>`;
  const extra = `html,body{background:var(--blanc)}body{padding:24px;font:15px/1.3 var(--police-mono)}.ligne{display:flex;gap:16px;align-items:flex-start;margin-bottom:18px}.reg{width:110px;margin:8px 0}figure{margin:0}figure .scene{border-radius:12px}figcaption{margin-top:6px}h1{font:600 20px Sora;margin:0 0 16px}`;
  const html = page(`<h1>Animation « meulage » — étapes (site, sans texte ; cycle 10 s sur le site, 12 s en salle d'attente)</h1>${ligne('releve')}${ligne('pedagogique')}`, 2300, 820, extra)
    .replace(/class="scene ([^"]*)" style="width:400px;height:300px"/g, 'class="scene $1" style="width:400px;height:300px"');
  const { onglet, fichier } = await ouvrir(html, 2300, 820, 'planche');
  await onglet.evaluate(() => { for (const s of document.querySelectorAll('[data-t]')) for (const a of s.getAnimations({ subtree: true })) { a.pause(); a.currentTime = +s.dataset.t * 1000; } });
  await onglet.screenshot({ path: join(SORTIE, 'planche.png'), fullPage: true });
  await onglet.close(); rmSync(fichier, { force: true });
  console.log(`  ✓ ${join(SORTIE, 'planche.png')}`);
}
await navigateur.close();
if (journal.length) { for (const e of journal) console.error(`  ✗ ${e}`); process.exit(1); }
