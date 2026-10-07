// Rendus PNG des éléments de l'inventaire (icônes, dessins, héros, matériel, bibliothèque, photos, structures, gammes), pour que
// le juge (.claude/agents/juge-gout-paul.md) et les agents voient réellement ce que Paul voit dans « Donner mon avis ».
//
// Usage :
//   node scripts/rendre-assets.mjs --sortie <dossier> [clés…]          clés données (ex. picto:ongle dessin:verrue:releve)
//   node scripts/rendre-assets.mjs --sortie <dossier> --liste <f.json>   clés d'un fichier (["clé", …] ou [{ cle }, …])
//   node scripts/rendre-assets.mjs --sortie <dossier> --nouveaux         jamais notés + modifiés depuis la note (retours/assets-notes.json)
//   node scripts/rendre-assets.mjs --sortie <dossier> --echantillon 40   échantillon tiré au hasard (graine fixe, --graine n)
// Options :
//   --commit <réf>        rend le code de ce commit (git worktree temporaire, jamais l'arbre de travail) ; défaut : arbre de travail
//   --worktree <dossier>  où créer ce worktree (défaut : dossier temporaire)
//   --version-notee       si l'élément a changé depuis la note de Paul, rend la version NOTÉE (archives apps/admin/public/archives,
//                         cherchée par clé + empreinte notée), comme l'« Avant » de l'admin
//   --notes <f.json>      notes à comparer (défaut : retours/assets-notes.json de l'arbre de travail)
//   --gamme <id>          gamme des aperçus (défaut : canard, comme « Donner mon avis »)
//   --types picto,dessin  limite aux types donnés
//   --zones               ajoute <clé>.zones.png : le rendu avec les ZONES signalées par Paul (dernière note qui en porte, dans
//                         --notes) dessinées en surimpression numérotée (zones.ts, svgSurimpression), pour voir exactement où
//                         corriger ; seules, les clés qui ont des zones sont rendues si aucune autre clé n'est demandée
// Sortie : <dossier>/<clé>.png (icône : 24/48/96 px côte à côte ; illustration : 640 px ; photo : vignette 640 px ; structure :
// 300 px ; gamme : pastilles + mini-site), chaque fois sur fond clair ET fond sombre (plan), et <dossier>/manifeste.json
// (clé, type, titre, empreinte rendue, version, fichier). Aucun réseau sauf photos distantes des jeux de photos (non incluses
// par défaut : l'inventaire du code seulement). Aucun secret.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const drapeau = (n) => args.includes(n);
const AVEC_VALEUR = new Set(['--sortie', '--liste', '--echantillon', '--graine', '--commit', '--worktree', '--notes', '--gamme', '--types']);
const libres = args.filter((a, i) => !a.startsWith('--') && !AVEC_VALEUR.has(args[i - 1]));

const sortie = opt('--sortie');
if (!sortie) throw new Error('Usage : node scripts/rendre-assets.mjs --sortie <dossier> [clés… | --liste f.json | --nouveaux | --echantillon n]');
mkdirSync(sortie, { recursive: true });
const git = (...a) => execFileSync('git', a, { cwd: racine, encoding: 'utf8' }).trim();

// 1. Code à rendre : arbre de travail ou worktree d'un commit
const tmp = mkdtempSync(join(tmpdir(), 'rendre-assets-'));
let arbre = racine;
const commit = opt('--commit');
if (commit) {
  arbre = opt('--worktree') ?? join(tmp, 'arbre');
  if (existsSync(arbre)) throw new Error(`Le dossier ${arbre} existe déjà.`);
  git('worktree', 'add', '--detach', arbre, git('rev-parse', '--verify', `${commit}^{commit}`));
}

try {
  const src = join(arbre, 'packages', 'core', 'src');
  const bundle = join(tmp, 'core.mjs');
  await build({
    bundle: true, platform: 'node', format: 'esm', logLevel: 'warning', loader: { '.svg': 'text', '.css': 'empty' },
    nodePaths: [join(racine, 'node_modules')], outfile: bundle,
    stdin: {
      contents: "export { inventaireAssets } from './assets'; export { empreinteAsset } from './avant-apres'; export { GAMMES, gamme as gammeParId, variablesGamme, variantesGamme } from './gammes'; export { SURFACES_CSS, variablesCharte } from './charte'; export { svgSurimpression, normaliserZones, lignesZones } from './zones';",
      resolveDir: src, loader: 'ts',
    },
  });
  const core = await import(pathToFileURL(bundle).href);
  const dessinsCss = readFileSync(join(src, 'dessins.css'), 'utf8');
  const inventaire = core.inventaireAssets();
  const parCle = new Map(inventaire.map((a) => [a.cle, a]));

  // 2. Notes de Paul (pour --nouveaux et --version-notee)
  const cheminNotes = opt('--notes') ?? join(racine, 'retours', 'assets-notes.json');
  const notes = existsSync(cheminNotes) ? JSON.parse(readFileSync(cheminNotes, 'utf8')) : [];
  const derniereNote = new Map();
  for (const n of notes) { const p = derniereNote.get(n.cle); if (!p || String(n.jour ?? '') >= String(p.jour ?? '')) derniereNote.set(n.cle, n); }
  // Zones signalées (0034) : celles de la dernière note qui en porte, par clé
  const zonesParCle = new Map();
  if (drapeau('--zones')) for (const n of notes) { const z = core.normaliserZones(n.zones); if (z) zonesParCle.set(n.cle, z); }

  const empreinteActuelle = (a) => {
    if (a.rendu.kind === 'image') return `img:${a.rendu.src.split('?')[0]}`;
    return core.empreinteAsset(a) ?? '';
  };

  // 3. Clés demandées
  let cles = [...libres];
  const liste = opt('--liste');
  if (liste) cles.push(...JSON.parse(readFileSync(liste, 'utf8')).map((x) => (typeof x === 'string' ? x : x.cle)));
  if (drapeau('--nouveaux')) {
    for (const a of inventaire) {
      const n = derniereNote.get(a.cle);
      if (!n) cles.push(a.cle);
      else if (a.rendu.kind !== 'image' && n.empreinte && n.empreinte !== empreinteActuelle(a)) cles.push(a.cle);
    }
  }
  const nEch = Number(opt('--echantillon') ?? 0);
  if (nEch > 0) {
    let s = Number(opt('--graine') ?? 20261007);
    const alea = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    cles.push(...inventaire.map((a) => ({ a, r: alea() })).sort((x, y) => x.r - y.r).slice(0, nEch).map((x) => x.a.cle));
  }
  if (drapeau('--zones') && !cles.length) cles.push(...zonesParCle.keys());
  const types = opt('--types')?.split(',');
  cles = [...new Set(cles)].filter((c) => !types || types.includes(parCle.get(c)?.type ?? c.split(':')[0]));
  if (!cles.length) throw new Error('Aucune clé à rendre.');

  // 4. Archives des versions notées
  const archives = [];
  if (drapeau('--version-notee')) {
    const dossierArch = join(racine, 'apps', 'admin', 'public', 'archives');
    const index = existsSync(join(dossierArch, 'index.json')) ? JSON.parse(readFileSync(join(dossierArch, 'index.json'), 'utf8')) : { archives: [] };
    for (const a of index.archives) archives.push(JSON.parse(gunzipSync(readFileSync(join(dossierArch, a.fichier))).toString('utf8')));
  }

  // 5. Pages HTML
  const gamme = core.gammeParId(opt('--gamme') ?? 'canard') ?? core.GAMMES[0];
  const vars = { ...core.variablesCharte(), ...core.variablesGamme(gamme) };
  const styleVars = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const cadre = (titre, corps) => `<!doctype html><html><head><meta charset="utf-8"><style>
    ${dessinsCss}
    ${core.SURFACES_CSS}
    *{box-sizing:border-box} body{margin:0;font:13px/1.4 system-ui,sans-serif;background:#fff;color:#222}
    #planche{display:inline-grid;gap:10px;padding:14px;background:#fff;${styleVars}}
    .titre{font-weight:600;font-size:13px;max-width:1300px}
    .rangee{display:flex;gap:12px;align-items:stretch}
    .panneau{display:grid;place-items:center;border-radius:12px;outline:1px solid rgba(0,0,0,.1);overflow:hidden;position:relative}
    .panneau small{position:absolute;left:8px;top:6px;font-size:11px;opacity:.6}
    .clair{background:var(--fond);color:var(--encre)} .doux{background:var(--doux);color:var(--encre)}
    .rt-svg svg{width:100%;height:100%;display:block}
  </style></head><body><div id="planche"><div class="titre">${esc(titre)}</div>${corps}</div></body></html>`;

  const pageSvg = (a, svg) => {
    if (a.type === 'picto' || a.rendu.petit) {
      const tailles = (cl, st) => `<div class="panneau ${cl}" style="padding:26px 22px 18px;${st}"><div style="display:flex;gap:26px;align-items:flex-end">${[24, 48, 96].map((px) => `<div class="rt-svg" style="width:${px}px;height:${px}px">${svg}</div>`).join('')}</div></div>`;
      return `<div class="rangee">${tailles('clair', '')}${tailles('', 'background:var(--accent);color:#fff')}${tailles('surface-plan', '')}</div>`;
    }
    const clair = a.rendu.fond === 'grille' ? 'surface-grille' : a.rendu.fond === 'doux' ? 'doux' : 'clair';
    const p = (cl, t) => `<div class="panneau ${cl}" style="width:640px;height:480px"><small>${t}</small><div class="rt-svg" style="width:88%;height:88%">${svg}</div></div>`;
    return `<div class="rangee">${p(clair, 'Fond clair')}${p('surface-plan', 'Fond sombre (plan)')}</div>`;
  };
  const pageImage = (a, url) => {
    if (a.type === 'modele') return `<div class="panneau" style="width:300px;height:533px;border-radius:22px;outline:4px solid #262626"><img src="${esc(url)}" style="width:100%;height:100%;object-fit:cover;object-position:top"></div>`;
    return `<div class="rangee"><div class="panneau" style="width:640px;height:427px"><img src="${esc(url)}" style="width:100%;height:100%;object-fit:cover"></div><div class="panneau" style="width:200px;height:200px"><img src="${esc(url)}" style="width:100%;height:100%;object-fit:cover"></div></div>`;
  };
  const pageGamme = (id) => {
    const g = core.gammeParId(id) ?? core.GAMMES[0];
    const v = core.variantesGamme(g);
    const pastilles = [['Accent', g.accent], ['Foncé', g.accentFonce], ['Fond', g.fond], ['Doux', g.fondDoux], ['Plan', g.plan], ['Signal', g.signal], ['Vif', v.vif], ['Duo', v.duo]];
    return `<div class="rangee"><div style="display:grid;grid-template-columns:repeat(4,80px);gap:8px">${pastilles.map(([n, h]) => `<div style="text-align:center;font-size:11px"><div style="height:80px;border-radius:12px;outline:1px solid rgba(0,0,0,.1);background:${h}"></div>${n} ${h}</div>`).join('')}</div>
      <div style="width:320px;border-radius:16px;overflow:hidden;outline:1px solid rgba(0,0,0,.1);background:${g.fond};color:${v.encre ?? '#222'};padding:18px;display:grid;gap:10px">
        <div style="font-weight:800;font-size:22px;color:${g.accentFonce}">Cabinet de pédicurie-podologie</div>
        <div style="font-size:13px">Soins des pieds, semelles orthopédiques, bilan postural.</div>
        <div style="background:${g.fondDoux};border-radius:10px;padding:10px;font-size:12px">Horaires · Accès · Tarifs</div>
        <span style="display:inline-block;width:fit-content;border-radius:8px;padding:8px 12px;font-weight:600;background:${v.vif};color:${v.vifTexte ?? '#fff'}">Prendre rendez-vous</span>
      </div></div>`;
  };

  // 6. Capture (Playwright, déjà installé) : pages servies sous http://rendu.local/ ; images lues dans apps/admin/public puis apps/sites/public
  const { chromium } = await import('playwright');
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.avif': 'image/avif' };
  let html = '';
  await page.route('http://rendu.local/**', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    for (const base of [join(arbre, 'apps', 'admin', 'public'), join(arbre, 'apps', 'sites', 'public'), join(racine, 'apps', 'admin', 'public'), join(racine, 'apps', 'sites', 'public')]) {
      const f = resolve(base, rel);
      if (f.startsWith(resolve(base)) && existsSync(f)) return route.fulfill({ status: 200, contentType: TYPES[extname(f).toLowerCase()] ?? 'application/octet-stream', body: readFileSync(f) });
    }
    return route.fulfill({ status: 404, body: '' });
  });

  const manifeste = [];
  const nomFichier = (cle) => `${cle.replace(/[^\w.-]+/g, '_')}.png`;
  for (const cle of cles) {
    const a = parCle.get(cle);
    if (!a) { manifeste.push({ cle, erreur: 'absente de l’inventaire' }); continue; }
    let version = 'actuelle';
    let empreinte = empreinteActuelle(a);
    let svg = a.rendu.kind === 'svg' ? a.rendu.svg() : null;
    const n = derniereNote.get(cle);
    if (archives.length && n?.empreinte && a.rendu.kind === 'svg' && n.empreinte !== empreinte) {
      const trouve = archives.map((x) => x.assets[cle]).find((x) => x && x.e === n.empreinte && x.a.startsWith('<svg'));
      if (trouve) { svg = trouve.a; empreinte = trouve.e; version = 'notee (archive)'; } else version = 'actuelle (version notée introuvable)';
    }
    let corps;
    if (a.rendu.kind === 'svg') corps = pageSvg(a, svg);
    else if (a.rendu.kind === 'image') corps = pageImage(a, /^https?:/.test(a.rendu.src) ? a.rendu.src : `http://rendu.local${a.rendu.src}`);
    else corps = pageGamme(a.rendu.gamme);
    html = cadre(`${a.titre} — ${cle} (${a.type})`, corps);
    await page.goto('http://rendu.local/', { waitUntil: 'networkidle' });
    const fichier = nomFichier(cle);
    await page.locator('#planche').screenshot({ path: join(sortie, fichier) });
    const zones = zonesParCle.get(cle);
    let fichierZones;
    if (zones) {
      // Surimpression sur la surface notée (rangée des rendus ordinateur) ; les zones du rendu mobile sont listées à part
      const ordi = zones.zones.filter((z) => z.appareil !== 'mobile');
      const selecteur = (await page.locator('#planche .rangee').count()) ? '#planche .rangee' : '#planche .panneau';
      const boite = await page.locator(selecteur).first().boundingBox();
      if (boite) {
        // Surimpression aux dimensions réelles de la surface (pastilles rondes, traits non déformés)
        await page.evaluate(({ sel, svg }) => {
          const cible = document.querySelector(sel);
          if (!cible) return;
          cible.style.position = 'relative';
          const calque = document.createElement('div');
          calque.style.cssText = 'position:absolute;inset:0;pointer-events:none';
          calque.innerHTML = svg;
          cible.appendChild(calque);
        }, { sel: selecteur, svg: core.svgSurimpression(ordi, Math.round(boite.width), Math.round(boite.height)) });
      }
      fichierZones = fichier.replace(/\.png$/, '.zones.png');
      await page.locator('#planche').screenshot({ path: join(sortie, fichierZones) });
    }
    manifeste.push({ cle, type: a.type, titre: a.titre, empreinte, version, fichier, ...(zones ? { fichierZones, zones: core.lignesZones(zones), empreinteZones: zones.empreinte } : {}) });
  }
  await navigateur.close();
  writeFileSync(join(sortie, 'manifeste.json'), `${JSON.stringify(manifeste, null, 2)}\n`);
  const ok = manifeste.filter((m) => m.fichier).length;
  console.log(`${ok} rendus dans ${sortie}${manifeste.length > ok ? ` (${manifeste.length - ok} clés introuvables)` : ''}.`);
} finally {
  if (commit) git('worktree', 'remove', '--force', arbre);
  rmSync(tmp, { recursive: true, force: true });
}
