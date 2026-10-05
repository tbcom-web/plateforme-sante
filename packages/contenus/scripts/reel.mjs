// REEL 9:16 personnalisé au cabinet, avec le moteur de reels d'ÉcranZen (copie : packages/contenus/reels/ecranzen/).
//
//   node packages/contenus/scripts/reel.mjs [<id du reel>] [--sortie <dossier>] [--style releve] [--identite demo] [--sans-mp4]
//
// 1. garde-fous d'ÉcranZen (garde-fous.js : lecture ≥ 2 s + 0,5 s/mot, ≤ 7 mots par carton, ≤ 12 mots à l'écran, mention M1–M5
//    en dernier, pas de CTA ni de mot commercial, profil éthique du sujet) + lexique de la plateforme : sinon, rien n'est généré ;
// 2. page de lecture : moteur ÉcranZen, mention tirée de mentions.ts (référentiel, mot pour mot), couleurs et police du
//    cabinet (gamme, modèle), nom du cabinet dans l'en-tête (effacé pendant la mention) ;
// 3. couverture PNG, planche des images clés, puis MP4 1080 × 1920 (H.264, 30 i/s) image par image (window.ezAller(t)).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import vm from 'node:vm';
import { construire, RACINE } from './construire.mjs';
import { sortieAutorisee } from '../../core/scripts/chemins.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const DEPOT = join(RACINE, '../..');
const id = args.find((a, k) => !a.startsWith('--') && !args[k - 1]?.startsWith('--')) ?? 'semelles-neuves-progressivement';
const SORTIE = join(sortieAutorisee(opt('sortie', join(RACINE, 'dist/social'))), 'reel');
const EZ = join(RACINE, 'reels/ecranzen');
const FFMPEG = [process.env.FFMPEG, 'C:/Users/pault/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe'].find((f) => f && existsSync(f)) ?? 'ffmpeg';
const stop = (m) => { console.error(`✗ ${m}`); process.exit(1); };

const C = await import(pathToFileURL((await construire()).node).href);
const reel = JSON.parse(readFileSync(join(RACINE, 'reels', `${id}.json`), 'utf8'));
const identite = opt('identite', 'demo') === 'demo' ? C.identiteDepuisSite(C.SITE_DEMO) : stop('identité inconnue');
const style = opt('style', C.styleIdentite(identite));

// ———————————————————————————————— 1. garde-fous (code ÉcranZen, exécuté tel quel) + lexique
const bac = { console }; bac.window = bac; vm.createContext(bac);
for (const f of ['garde-fous.js', 'visuels/_commun.js', ...readdirSync(join(EZ, 'visuels')).filter((f) => f.endsWith('.js') && f !== '_commun.js').map((f) => `visuels/${f}`)])
  vm.runInContext(readFileSync(join(EZ, f), 'utf8'), bac, { filename: f });
// Variantes de conclusion (référentiel éthique ÉcranZen, décision de Paul du 2026-10-02) : « chaque variante a la fonction,
// l’usage et les interdits de sa mention mère ». Le profil d’un sujet qui exige M3 admet donc M3-a/b/c. Nécessaire en 9:16 : la ligne
// « à votre pédicure-podologue. » de M3 (forme du 2026-10-02) mesure ≈ 1020 px à 72 px en Sora, plus que la zone utile de 936 px.
const VARIANTES = 'for (const p of new Set(Object.values(EZR_GF.PROFILS))) if (p.mentions) p.mentions = [...new Set(p.mentions.flatMap((x) => (/-[abc]$/.test(x) ? [x] : [x, x + "-a", x + "-b", x + "-c"])))];';
vm.runInContext(VARIANTES, bac);
const mentions = Object.fromEntries(Object.entries(C.MENTIONS).map(([k, m]) => [k, { lignes: m.lignes }]));
const res = bac.EZR_GF.verifier(reel, { visuels: bac.EZR.visuels, mentions, format: reel.format });
const erreurs = [...res.erreurs];
for (const [k, s] of reel.scenes.entries()) for (const t of [s.titre, s.kicker, s.reponse].filter(Boolean)) erreurs.push(...C.controlerTexte(`scène ${k + 1}`, t).erreurs);
const sujet = C.sujet(id);
if (sujet && C.MENTIONS[reel.scenes.at(-1).mention]?.famille !== C.MENTIONS[sujet.mention]?.famille) erreurs.push(`mention ${reel.scenes.at(-1).mention} : famille ≠ mention du sujet (${sujet.mention})`);
console.log(`Reel ${id} — ${reel.titre} (${reel.sujet}), ${reel.scenes.length} scènes, ${(res.chrono.images / 30).toFixed(1)} s`);
for (const a of res.avertissements) console.log(`  ! ${a}`);
if (erreurs.length) { for (const e of erreurs) console.error(`  ✗ ${e}`); stop(`${erreurs.length} garde-fou(s) cassé(s) : reel NON généré`); }
console.log('  ✓ garde-fous ÉcranZen et lexique : 0 erreur');

// ———————————————————————————————— 2. page de lecture personnalisée
mkdirSync(SORTIE, { recursive: true });
const m = C.modeleDuStyle(identite, style);
const couleurs = C.couleursMarque(m, identite.theme); // plan, signal et palette de données : gamme ou couleur du cabinet, charte
// Police : Sora et JetBrains Mono d’ÉcranZen (copiées avec leur licence OFL dans reels/polices) : les zones de texte des reels
// sont calibrées pour elles. La personnalisation porte sur les couleurs (gamme du cabinet) et le nom du cabinet.
const papier = C.NEUTRES.papier;
const ttf = (f) => `data:font/ttf;base64,${readFileSync(join(RACINE, 'reels/polices', f)).toString('base64')}`;
const policesReel = `@font-face{font-family:"Sora";font-weight:100 800;font-display:block;src:url("${ttf('Sora-VF.ttf')}")}@font-face{font-family:"JetBrains Mono";font-weight:100 800;font-display:block;src:url("${ttf('JetBrainsMono-VF.ttf')}")}`;
const palette = `:root,:root[data-palette="plan"]{--fond:${couleurs.plan};--fond-alt:color-mix(in srgb,${couleurs.plan},${C.NEUTRES.nuit} 45%);--halo:color-mix(in srgb,${couleurs.plan},${C.NEUTRES.blanc} 12%);--texte:${papier};--ligne:${papier};--accent:${couleurs.signal};--signal:${C.PRESSION[3]};${C.PRESSION.map((c, k) => `--p${k + 1}:${c}`).join(';')};--typo:"Sora"}`;
const src = (f) => pathToFileURL(join(EZ, f)).href;
const donnees = { ...reel, scenes: reel.scenes.map((s) => (s.mention ? { ...s, lignes_mention: C.MENTIONS[s.mention].lignes } : s)) };
const page = join(SORTIE, `${id}.html`);
writeFileSync(page, `<!doctype html><html lang="fr" data-reel="${id}" data-palette="plan"><head><meta charset="utf-8"><title>Reel · ${C.echapper(identite.nom)}</title>
<link rel="stylesheet" href="${src('reel.css')}"><style>${policesReel}${palette}</style>
<script>window.EZ_REEL=${JSON.stringify(donnees)};window.EZ_IDENTITE=${JSON.stringify({ nom: identite.nom })};</script>
${['lib/moteur.js', 'lib/cartons.js', 'garde-fous.js', 'visuels/_commun.js', 'visuels/_formes.js', ...['silhouette', 'chaine', 'capteurs', 'plateforme', 'carte-pression', 'foulee', 'pictos', 'chiffre-cle'].map((v) => `visuels/${v}.js`)].map((f) => `<script src="${src(f)}"></script>${f === 'garde-fous.js' ? `<script>${VARIANTES}</script>` : ''}`).join('\n')}
</head><body><div id="ez-scene" role="img"></div><script src="${src('moteur-reel.js')}"></script></body></html>`);

// ———————————————————————————————— 3. couverture, planche, MP4
const pw = await import(pathToFileURL(createRequire(join(DEPOT, 'apps/sites/package.json')).resolve('playwright')).href);
const navigateur = await (pw.chromium ?? pw.default.chromium).launch();
const onglet = await navigateur.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const journal = [];
// Erreurs de la page (garde-fous et règle de lecture d’ÉcranZen) ; la police Sora absente de la copie (remplacée par celle du cabinet) est ignorée
onglet.on('console', (x) => { if (x.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(x.text())) journal.push(x.text()); });
onglet.on('pageerror', (e) => journal.push(e.message));
await onglet.goto(`${pathToFileURL(page).href}?reel=${id}&ratio=9x16&export=1`);
await onglet.waitForFunction(() => window.ezPret, null, { timeout: 30000 });
await onglet.evaluate(() => window.ezPret);
const lecture = []; // window.ezLecture : mesures de lecture de chaque carton (les écarts sont signalés en console.error)
if (journal.length || lecture.length) { for (const e of [...journal, ...lecture.map((x) => JSON.stringify(x))]) console.error(`  ✗ ${e}`); await navigateur.close(); stop('la page du reel signale des erreurs : NON exporté'); }
const images = res.chrono.images;
const cles = res.chrono.scenes.map((c) => c.fin - res.chrono.T.scan - 2);
const aller = (f) => onglet.evaluate((t) => window.ezAller(t), f / 30);
await aller(cles[0]);
await onglet.screenshot({ path: join(SORTIE, `${id}.couverture.png`) });
for (const [k, f] of cles.entries()) { await aller(f); await onglet.screenshot({ path: join(SORTIE, `${id}.cle-${k + 1}.png`) }); }
// planche des images clés (fin de chaque geste), à regarder avant toute diffusion
const planche = join(SORTIE, '_planche.html');
writeFileSync(planche, `<body style="margin:0;padding:24px;display:flex;gap:16px;background:Canvas">${cles.map((_, k) => `<img src="${id}.cle-${k + 1}.png" style="height:900px">`).join('')}</body>`);
const vue = await navigateur.newPage({ viewport: { width: cles.length * (506 + 16) + 48, height: 948 } });
await vue.goto(pathToFileURL(planche).href);
await vue.screenshot({ path: join(SORTIE, `planche-reel.png`) });
await vue.close(); rmSync(planche);
console.log(`  ✓ couverture, ${cles.length} images clés et planche-reel.png : ${SORTIE}`);
if (!args.includes('--sans-mp4')) {
  const mp4 = join(SORTIE, `${id}.mp4`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fin = new Promise((ok, ko) => ff.on('close', (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg : code ${c}`)))));
  const t0 = Date.now();
  for (let f = 0; f < images; f++) {
    await aller(f);
    const jpg = await onglet.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(jpg)) await new Promise((ok) => ff.stdin.once('drain', ok));
    if (f % 150 === 0) process.stdout.write(`  … image ${f}/${images}\r`);
  }
  ff.stdin.end();
  await fin;
  console.log(`  ✓ ${mp4} (${images} images, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
await navigateur.close();
rmSync(join(SORTIE, '_tmp'), { recursive: true, force: true });
