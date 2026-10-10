// npm run perf:admin : mesure des performances de l'admin (retour de Paul du 2026-10-08 : « le tool commence un peu à ramer »).
// 1. Copie de l'admin (état courant du dossier) et du core dans un dossier temporaire (aucune jonction : modules résolus dans le
//    node_modules du dépôt), construction `next build --webpack`, `next start`.
// 2. Faux Supabase local (faux-supabase.mjs) avec un volume réaliste (donnees.mjs : 2 000 notes d'assets, 500 notes d'atelier,
//    1 500 duels, 300 recettes notées, 200 photos, 50 kits) et une latence simulée (25 ms par aller-retour).
// 3. Serveur : temps de rendu de chaque page (fin du flux HTML), nombre et volume des requêtes Supabase.
//    Navigateur (Playwright, processeur ralenti ×4, graine et horloge figées) : JS téléchargé, iframes d'aperçu, tâches longues,
//    temps jusqu'à interactif (hors images d'animation : tâches ≥ 120 ms), mémoire, occupation au repos (processeur ×4),
//    « Tout changer » (Studio), duel suivant.
// Aucun secret lu (.env ignoré : variables factices), aucun appel au vrai Supabase, aucune écriture hors du dossier temporaire.
// Options : --tours=5 (serveur) --tours-client=2 --latence=25 --sans-client --garder (garde le dossier temporaire) --json=<fichier>
//   --volume=10 (données ×10, donnees.mjs) --debit=20 (Ko/ms simulés) --ligne-us=0.5 (coût par ligne parcourue) --sans=<tables/fonctions
//   absentes, ex. la migration 0059 pas encore exécutée> --pages=/admin,/chaine (liste) --dossier=<dossier temporaire parent>
//   --froid : chaque page mesurée d'abord sur un serveur NEUF (instance Vercel froide : aucune mémoire entre requêtes), puis à chaud.
//   Sortie par page : temps du premier passage (froid si --froid) et médiane des passages suivants, requêtes, Ko lus.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODULES = join(RACINE, 'node_modules').replaceAll('\\', '/');
const opt = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const TOURS = Number(opt.tours ?? 5), TOURS_CLIENT = Number(opt['tours-client'] ?? 2), LATENCE = Number(opt.latence ?? 25);
const VOLUME = Number(opt.volume ?? 1), DEBIT = Number(opt.debit ?? 0), LIGNE_US = Number(opt['ligne-us'] ?? 0);
// --source=<dossier> : sources de l'admin, du core et des retours lues ailleurs (ex. extraction de la version d'avant, pour comparer)
const SRC = opt.source ? String(opt.source) : RACINE;
const REUTIL = opt.reutiliser ? String(opt.reutiliser) : null;
const PORT_SUPA = REUTIL ? Number(readFileSync(join(REUTIL, 'port.txt'), 'utf8')) : 54490 + Math.floor(Math.random() * 300), PORT_APP = 3390 + Math.floor(Math.random() * 300);
const SUPA = `http://127.0.0.1:${PORT_SUPA}`, BASE = `http://localhost:${PORT_APP}`;
const PAGES = opt.pages ? String(opt.pages).split(',') : ['/admin/atelier/studio', '/admin/atelier', '/admin/retours', '/admin/retours/duel?type=theme', '/admin/retours/recettes', '/admin/retours/kits', '/admin/retours/tri', '/admin/photos', '/admin/degustation', '/chaine/preselection'];

// ---- Copie ----
// --reutiliser=<dossier d'une mesure gardée (--garder)> : ni copie, ni données (si présentes), ni construction
const tmp = REUTIL ?? mkdtempSync(join(opt.dossier ? String(opt.dossier) : tmpdir(), 'perf-admin-'));
const app = join(tmp, 'apps', 'admin');
console.log(`▶ ${REUTIL ? 'Réutilisation de' : 'Copie dans'} ${tmp}`);
if (!REUTIL) {
writeFileSync(join(tmp, 'port.txt'), String(PORT_SUPA));
for (const f of ['src', 'public', 'package.json', 'tsconfig.json', 'postcss.config.mjs']) cpSync(join(SRC, 'apps', 'admin', f), join(app, f), { recursive: true });
cpSync(join(SRC, 'packages', 'core'), join(tmp, 'node_modules', '@plateforme', 'core'), { recursive: true, filter: (s) => !s.includes('node_modules') });
cpSync(join(SRC, 'retours'), join(tmp, 'retours'), { recursive: true });
// Contenus (packs par profession) : importés par chemin relatif depuis l'admin
cpSync(join(SRC, 'packages', 'contenus'), join(tmp, 'packages', 'contenus'), { recursive: true, filter: (x) => !x.includes('node_modules') });
mkdirSync(join(app, 'public', 'photos'), { recursive: true });
cpSync(join(SRC, 'apps', 'sites', 'public', 'photos'), join(app, 'public', 'photos'), { recursive: true, filter: (f) => !f.endsWith('.md') });
writeFileSync(join(tmp, 'package.json'), JSON.stringify({ name: 'perf-admin', private: true, workspaces: ['apps/*'] }));
const pkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
delete pkg.scripts.prebuild; delete pkg.scripts.predev;
writeFileSync(join(app, 'package.json'), JSON.stringify(pkg, null, 2));
writeFileSync(join(app, '.env.local'), `NEXT_PUBLIC_SUPABASE_URL=${SUPA}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=cle-publique-factice\n`);
writeFileSync(join(app, 'next.config.ts'), `import type { NextConfig } from 'next';
import { resolve } from 'node:path';
const MODULES = ${JSON.stringify(MODULES)};
const nextConfig: NextConfig = {
  transpilePackages: ['@plateforme/core'],
  serverExternalPackages: ['sharp'],
  typescript: { ignoreBuildErrors: true },
  images: { remotePatterns: [{ protocol: 'http', hostname: '127.0.0.1', pathname: '/storage/v1/object/public/photos/**' }] },
  webpack: (config) => {
    config.resolve.modules = [...(config.resolve.modules ?? ['node_modules']), MODULES];
    config.resolve.alias = { ...(config.resolve.alias ?? {}), '@': resolve(process.cwd(), 'src') };
    config.resolveLoader = { ...(config.resolveLoader ?? {}), modules: [...(config.resolveLoader?.modules ?? ['node_modules']), MODULES] };
    return config;
  },
};
export default nextConfig;
`);
}
const env = { ...process.env, NODE_PATH: MODULES, NEXT_TELEMETRY_DISABLED: '1' };
delete env.GITHUB_TOKEN; delete env.SUPABASE_SECRET_KEY;
const next = join(MODULES, 'next', 'dist', 'bin', 'next');

// ---- Données, faux Supabase, construction, serveur ----
const donnees = join(tmp, 'donnees.json');
const { existsSync } = await import('node:fs');
if (!existsSync(donnees)) spawnSync(process.execPath, [join(RACINE, 'scripts', 'perf-admin', 'donnees.mjs'), donnees, SUPA, String(VOLUME)], { stdio: 'ignore' });
const enfants = [];
const lancer = (args, opts) => { const c = spawn(process.execPath, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] }); enfants.push(c); return c; };
const finir = () => { for (const c of enfants) if (c.exitCode === null) c.kill(); };
process.on('exit', finir);
const attendre = async (url, ms = 60000) => { const t = Date.now(); for (;;) { try { await fetch(url); return; } catch { if (Date.now() - t > ms) throw new Error(`${url} injoignable`); await new Promise((r) => setTimeout(r, 300)); } } };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const resultats = { date: new Date().toISOString(), latenceMs: LATENCE, volume: VOLUME, debitKoMs: DEBIT, ligneUs: LIGNE_US, sans: opt.sans ?? null, serveur: {}, client: {}, bundles: {} };
try {
  lancer(['--max-old-space-size=8192', join(RACINE, 'scripts', 'perf-admin', 'faux-supabase.mjs')], { env: { ...env, PORT: String(PORT_SUPA), LATENCE_MS: String(LATENCE), DEBIT_KO_MS: String(DEBIT), LIGNE_US: String(LIGNE_US), SANS: String(opt.sans ?? ''), DONNEES: donnees, JOURNAL_ECRITURES: join(tmp, 'ecritures.log') } });
  if (!REUTIL) {
  console.log('▶ Construction (next build --webpack)…');
  const t = Date.now();
  const b = spawnSync(process.execPath, [next, 'build', '--webpack'], { cwd: app, env, encoding: 'utf8' });
  if (b.status !== 0) { console.error(b.stdout.slice(-3000), b.stderr.slice(-3000)); throw new Error('construction en échec'); }
  console.log(`  construite en ${((Date.now() - t) / 1000).toFixed(0)} s`);
  }
  // Taille des morceaux JS (gzip) : le plus gros est le core, chargé par toutes les pages
  const { gzipSync } = await import('node:zlib');
  const dossier = join(app, '.next', 'static', 'chunks');
  const { readdirSync, statSync } = await import('node:fs');
  resultats.bundles = Object.fromEntries(readdirSync(dossier, { recursive: true }).map(String).filter((f) => f.endsWith('.js')).map((f) => [f.replaceAll('\\', '/'), Math.round(gzipSync(readFileSync(join(dossier, f))).length / 1024)]).sort((a, c) => c[1] - a[1]).slice(0, 8));
  // Serveur Next (relancé avant chaque page avec --froid : instance neuve, sans mémoire entre requêtes)
  let serveur = null;
  const demarrer = async () => {
    if (serveur) { serveur.kill(); await new Promise((r) => serveur.once('exit', r)); }
    serveur = lancer([next, 'start', '-p', String(PORT_APP)], { cwd: app, env: { ...env, ...(opt.verifier ? { APPRENTISSAGE_VERIFIER: '1' } : {}) } });
    // Journal du serveur (Server-Timing, requêtes lentes, égalité des instantanés) : <dossier>/serveur.log
    const { createWriteStream } = await import('node:fs');
    const journal = createWriteStream(join(tmp, 'serveur.log'), { flags: 'a' });
    serveur.stdout.pipe(journal); serveur.stderr.pipe(journal);
    await attendre(BASE + '/connexion', 120000);
    // Instance neuve : la mémoire de l'instance est perdue ; les instantanés en base (0059) restent, comme sur Vercel
  };
  await attendre(SUPA + '/__stats', 300000); await demarrer();

  // ---- Session factice de l'admin (jeton lu par le faux Supabase seulement) ----
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const ADMIN = '00000000-0000-4000-8000-0000000000ad';
  const exp = Math.floor(Date.now() / 1000) + 36000;
  const tok = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: ADMIN, aud: 'authenticated', role: 'authenticated', exp, is_anonymous: false })}.c2ln`;
  const session = { access_token: tok, refresh_token: `r-${ADMIN}-1`, token_type: 'bearer', expires_in: 36000, expires_at: exp, user: { id: ADMIN, email: 'admin@exemple-test.fr', aud: 'authenticated', role: 'authenticated' } };
  const valeurCookie = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  const cookie = `sb-127-auth-token=${valeurCookie}`;

  // ---- Préchauffage (--prechauffer=/admin,/chaine) : premier calcul des instantanés d'apprentissage (0059), mesuré à part ----
  if (opt.prechauffer) {
    for (const p of String(opt.prechauffer).split(',')) {
      const t0 = performance.now();
      try { const r = await fetch(BASE + p, { headers: { cookie }, redirect: 'manual', signal: AbortSignal.timeout(Number(opt.delai ?? 120000)) }); await r.text(); } catch { /* délai */ }
      console.log(`  préchauffage ${p} : ${Math.round(performance.now() - t0)} ms (premier calcul)`);
      await new Promise((ok) => setTimeout(ok, Number(opt['attente-apres'] ?? 3000)));
    }
  }
  // ---- Serveur ----
  console.log(`▶ Serveur (${TOURS} tours par page, latence ${LATENCE} ms)`);
  for (const p of PAGES) {
    const m = [];
    if (opt.froid) await demarrer();
    let premier = null;
    for (let i = 0; i <= TOURS; i++) {
      await fetch(SUPA + '/__reset');
      const t0 = performance.now();
      let r, html;
      try { r = await fetch(BASE + p, { headers: { cookie }, redirect: 'manual', signal: AbortSignal.timeout(Number(opt.delai ?? 120000)) }); html = await r.text(); }
      catch { r = { status: 'délai' }; html = ''; }
      const total = performance.now() - t0;
      const st = await (await fetch(SUPA + '/__stats')).json();
      if (i) m.push({ statut: r.status, total, html: html.length, st }); else premier = { total, st };
      // Calculs lancés en arrière-plan par la requête (rafraîchissements de mémoire) : laissés finir avant la mesure suivante
      await new Promise((ok) => setTimeout(ok, 300));
    }
    const d = m.at(-1);
    resultats.serveur[p] = { statut: d.statut, premierMs: Math.round(premier.total), premierRequetes: premier.st.total, premierKo: Math.round(premier.st.octets / 1024), ms: Math.round(med(m.map((x) => x.total))), htmlKo: Math.round(d.html / 1024), requetes: d.st.total, supabaseKo: Math.round(d.st.octets / 1024), parRequete: Object.fromEntries(Object.entries(d.st.par).map(([k, v]) => [k, v.n])), premierParRequete: Object.fromEntries(Object.entries(premier.st.par).sort((x, y) => y[1].octets - x[1].octets).map(([k, v]) => [k, { n: v.n, ko: Math.round(v.octets / 1024), ms: Math.round(v.ms) }])) };
    console.log(`  ${p.padEnd(32)} ${opt.froid ? 'froid' : '1er'} ${String(Math.round(premier.total)).padStart(6)} ms ${String(premier.st.total).padStart(3)} req ${String(Math.round(premier.st.octets / 1024)).padStart(6)} Ko │ chaud ${String(resultats.serveur[p].ms).padStart(5)} ms  ${String(d.st.total).padStart(3)} requêtes  ${String(Math.round(d.st.octets / 1024)).padStart(5)} Ko Supabase  HTML ${Math.round(d.html / 1024)} Ko`);
  }

  // ---- Navigateur ----
  if (!opt['sans-client']) {
    console.log(`▶ Navigateur (Playwright, processeur ×4, ${TOURS_CLIENT} tours)`);
    const { chromium } = createRequire(join(RACINE, 'package.json'))('playwright');
    const navigateur = await chromium.launch();
    const INIT = `(() => { let s = 4242; Math.random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; let n = 0; Date.now = () => 1791460000000 + (n++); })();
      window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch {}`;
    // Calme : plus aucune tâche ≥ seuil depuis `calme` ms (les images d'animation des aperçus, ~50-80 ms à ×4, sont ignorées)
    const calme = async (p, depuis, ms, seuil = 120, max = 30000) => { const t = Date.now(); for (;;) { await p.waitForTimeout(250); const r = await p.evaluate(([d, c, s]) => { const l = window.__lt.filter(([x, y]) => x >= d && y >= s); const fin = l.length ? Math.max(...l.map(([x, y]) => x + y)) : d; return { ok: performance.now() - fin >= c, fin, l: window.__lt.filter(([x]) => x >= d) }; }, [depuis, ms, seuil]); if (r.ok || Date.now() - t > max) return r; } };
    for (const page of PAGES) {
      const tours = [];
      for (let t = 0; t < TOURS_CLIENT; t++) {
        const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 1000 } });
        await ctx.addCookies([{ name: 'sb-127-auth-token', value: valeurCookie, domain: 'localhost', path: '/' }]);
        await ctx.addInitScript(INIT);
        const p = await ctx.newPage();
        const cdp = await ctx.newCDPSession(p);
        await cdp.send('Network.enable'); await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const types = new Map(); const octets = { Script: 0, Font: 0, n: 0 };
        cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
        cdp.on('Network.loadingFinished', (e) => { const ty = types.get(e.requestId); if (ty === 'Script' || ty === 'Font') octets[ty] += e.encodedDataLength; if (ty === 'Font') octets.n++; });
        await p.goto(BASE + page, { waitUntil: 'load', timeout: 120000 });
        const r = await calme(p, 0, 2000);
        const lt = r.l;
        const met = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
        const m = {
          interactifMs: Math.round(r.fin), tbtMs: Math.round(lt.reduce((s, [, d]) => s + Math.max(0, d - 50), 0)), plusLongueMs: Math.round(Math.max(0, ...lt.map(([, d]) => d))),
          jsKo: Math.round(octets.Script / 1024), polices: octets.n, policesKo: Math.round(octets.Font / 1024), iframes: await p.evaluate(() => document.querySelectorAll('iframe').length), tasMo: +(met.JSHeapUsedSize / 1048576).toFixed(1),
        };
        // Occupation du fil principal au repos (premier tour) : 12 s après le chargement, sur 5 s, sans interaction
        // (animations des aperçus : pause après ~6 s, AnimationsBudget.tsx)
        if (t === 0) { await p.waitForTimeout(8000); const a = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value])); await p.waitForTimeout(5000); const z = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value])); m.reposPct = Math.round((100 * (z.TaskDuration - a.TaskDuration)) / 5); }
        const action = async (nom, faire) => { const d = []; for (let i = 0; i < 5; i++) { const avant = await p.evaluate(() => performance.now()); await faire(); const x = await calme(p, avant, 1000, 120, 20000); d.push({ ms: x.fin - avant, bloque: x.l.reduce((s, [, y]) => s + y, 0) }); } m[nom] = { ms: Math.round(med(d.map((x) => x.ms))), bloqueMs: Math.round(med(d.map((x) => x.bloque))) }; };
        if (page.startsWith('/admin/atelier/studio')) await action('toutChanger', () => p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Tout changer/.test(b.textContent ?? ''))?.click()));
        if (page.startsWith('/admin/retours/duel')) await action('duelSuivant', async () => { await p.mouse.click(5, 5); await p.keyboard.press('ArrowLeft'); });
        // Dégustation : « Commencer » → première carte prête (aperçus remplis, calme), puis cartes suivantes (2 choix ou une note)
        if (page.startsWith('/admin/degustation')) {
          const numero = () => p.evaluate(() => Number(/Carte (\d+) \//.exec(document.body.innerText)?.[1] ?? 0));
          const prete = async (avant, n0) => {
            const t = Date.now();
            while (Date.now() - t < 30000) {
              const ok = await p.evaluate((n) => { const m = /Carte (\d+) \//.exec(document.body.innerText); const c = document.querySelector('section[aria-label^="Grille"], section[aria-label*="uel"], section[aria-label*="ote"]'); return Boolean(c) && Number(m?.[1] ?? 0) > n && [...c.querySelectorAll('iframe')].every((f) => f.contentDocument?.body?.firstElementChild); }, n0);
              if (ok) break;
              await p.waitForTimeout(50);
            }
            const x = await calme(p, avant, 800, 120, 20000);
            return Math.round(Math.max(x.fin, (await p.evaluate(() => performance.now())) - 800) - avant);
          };
          let avant = await p.evaluate(() => performance.now());
          await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Commencer la dégustation/.test(x.textContent ?? ''))?.click());
          m.premiereCarteMs = await prete(avant, 0);
          const d = [];
          for (let i = 0; i < 4; i++) {
            const n0 = await numero();
            avant = await p.evaluate(() => performance.now());
            const grille = await p.evaluate(() => { const bt = [...document.querySelectorAll('section[aria-label^="Grille"] li[data-carte] > button[aria-pressed]')]; if (bt.length) { bt[0].click(); setTimeout(() => bt[1]?.click(), 30); } return bt.length > 0; });
            if (!grille) await p.keyboard.press('3');
            d.push(await prete(avant, n0));
          }
          m.carteSuivanteMs = med(d);
        }
        tours.push(m);
        await ctx.close();
      }
      const fin = { ...tours.at(-1), reposPct: tours[0].reposPct };
      for (const k of Object.keys(fin)) if (typeof fin[k] === 'number') fin[k] = med(tours.map((x) => x[k]).filter((v) => typeof v === 'number'));
      resultats.client[page] = fin;
      console.log(`  ${page.padEnd(32)} interactif ${String(fin.interactifMs).padStart(6)} ms  TBT ${String(fin.tbtMs).padStart(5)} ms  JS ${fin.jsKo} Ko  iframes ${fin.iframes}${fin.reposPct !== undefined ? `  repos ${fin.reposPct} %` : ''}${fin.toutChanger ? `  « Tout changer » ${fin.toutChanger.ms} ms` : ''}${fin.duelSuivant ? `  duel suivant ${fin.duelSuivant.ms} ms` : ''}${fin.premiereCarteMs !== undefined ? `  1re carte ${fin.premiereCarteMs} ms, suivante ${fin.carteSuivanteMs} ms (validation auto 450 ms comprise)` : ''}`);
    }
    await navigateur.close();
  }
  if (opt.json) writeFileSync(opt.json, JSON.stringify(resultats, null, 2));
  console.log(`▶ Plus gros morceaux JS (gzip, Ko) : ${Object.entries(resultats.bundles).map(([k, v]) => `${k.split('/').pop()} ${v}`).join(' · ')}`);
} finally {
  finir();
  if (!opt.garder && !REUTIL) { await new Promise((r) => setTimeout(r, 1500)); rmSync(tmp, { recursive: true, force: true, maxRetries: 5 }); }
}
