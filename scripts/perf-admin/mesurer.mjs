// npm run perf:admin : mesure des performances de l'admin (retour de Paul du 2026-10-08 : « le tool commence un peu à ramer »).
// 1. Copie de l'admin (état courant du dossier) et du core dans un dossier temporaire (aucune jonction : modules résolus dans le
//    node_modules du dépôt), construction `next build --webpack`, `next start`.
// 2. Faux Supabase local (faux-supabase.mjs) avec un volume réaliste (donnees.mjs : 2 000 notes d'assets, 500 notes d'atelier,
//    1 500 duels, 300 recettes notées, 200 photos, 50 kits) et une latence simulée (25 ms par aller-retour).
// 3. Serveur : temps de rendu de chaque page (fin du flux HTML), nombre et volume des requêtes Supabase.
//    Navigateur (Playwright, processeur ralenti ×4, graine et horloge figées) : JS téléchargé, iframes d'aperçu, tâches longues,
//    temps jusqu'à interactif (hors images d'animation : tâches ≥ 120 ms), mémoire, « Tout changer » (Studio), duel suivant.
// Aucun secret lu (.env ignoré : variables factices), aucun appel au vrai Supabase, aucune écriture hors du dossier temporaire.
// Options : --tours=5 (serveur) --tours-client=2 --latence=25 --sans-client --garder (garde le dossier temporaire) --json=<fichier>
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
const PORT_SUPA = 54490 + Math.floor(Math.random() * 300), PORT_APP = 3390 + Math.floor(Math.random() * 300);
const SUPA = `http://127.0.0.1:${PORT_SUPA}`, BASE = `http://localhost:${PORT_APP}`;
const PAGES = ['/admin/atelier/studio', '/admin/atelier', '/admin/retours', '/admin/retours/duel?type=theme', '/admin/retours/recettes', '/admin/retours/kits', '/admin/retours/tri', '/admin/photos'];

// ---- Copie ----
const tmp = mkdtempSync(join(tmpdir(), 'perf-admin-'));
const app = join(tmp, 'apps', 'admin');
console.log(`▶ Copie dans ${tmp}`);
for (const f of ['src', 'public', 'package.json', 'tsconfig.json', 'postcss.config.mjs']) cpSync(join(RACINE, 'apps', 'admin', f), join(app, f), { recursive: true });
cpSync(join(RACINE, 'packages', 'core'), join(tmp, 'node_modules', '@plateforme', 'core'), { recursive: true, filter: (s) => !s.includes('node_modules') });
cpSync(join(RACINE, 'retours'), join(tmp, 'retours'), { recursive: true });
mkdirSync(join(app, 'public', 'photos'), { recursive: true });
cpSync(join(RACINE, 'apps', 'sites', 'public', 'photos'), join(app, 'public', 'photos'), { recursive: true, filter: (f) => !f.endsWith('.md') });
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
const env = { ...process.env, NODE_PATH: MODULES, NEXT_TELEMETRY_DISABLED: '1' };
delete env.GITHUB_TOKEN; delete env.SUPABASE_SECRET_KEY;
const next = join(MODULES, 'next', 'dist', 'bin', 'next');

// ---- Données, faux Supabase, construction, serveur ----
const donnees = join(tmp, 'donnees.json');
spawnSync(process.execPath, [join(RACINE, 'scripts', 'perf-admin', 'donnees.mjs'), donnees, SUPA], { stdio: 'ignore' });
const enfants = [];
const lancer = (args, opts) => { const c = spawn(process.execPath, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] }); enfants.push(c); return c; };
const finir = () => { for (const c of enfants) if (c.exitCode === null) c.kill(); };
process.on('exit', finir);
const attendre = async (url, ms = 60000) => { const t = Date.now(); for (;;) { try { await fetch(url); return; } catch { if (Date.now() - t > ms) throw new Error(`${url} injoignable`); await new Promise((r) => setTimeout(r, 300)); } } };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const resultats = { date: new Date().toISOString(), latenceMs: LATENCE, serveur: {}, client: {}, bundles: {} };
try {
  lancer([join(RACINE, 'scripts', 'perf-admin', 'faux-supabase.mjs')], { env: { ...env, PORT: String(PORT_SUPA), LATENCE_MS: String(LATENCE), DONNEES: donnees } });
  console.log('▶ Construction (next build --webpack)…');
  const t = Date.now();
  const b = spawnSync(process.execPath, [next, 'build', '--webpack'], { cwd: app, env, encoding: 'utf8' });
  if (b.status !== 0) { console.error(b.stdout.slice(-3000), b.stderr.slice(-3000)); throw new Error('construction en échec'); }
  console.log(`  construite en ${((Date.now() - t) / 1000).toFixed(0)} s`);
  // Taille des morceaux JS (gzip) : le plus gros est le core, chargé par toutes les pages
  const { gzipSync } = await import('node:zlib');
  const dossier = join(app, '.next', 'static', 'chunks');
  const { readdirSync, statSync } = await import('node:fs');
  resultats.bundles = Object.fromEntries(readdirSync(dossier, { recursive: true }).map(String).filter((f) => f.endsWith('.js')).map((f) => [f.replaceAll('\\', '/'), Math.round(gzipSync(readFileSync(join(dossier, f))).length / 1024)]).sort((a, c) => c[1] - a[1]).slice(0, 8));
  lancer([next, 'start', '-p', String(PORT_APP)], { cwd: app, env });
  await attendre(SUPA + '/__stats'); await attendre(BASE + '/connexion');

  // ---- Session factice de l'admin (jeton lu par le faux Supabase seulement) ----
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const ADMIN = '00000000-0000-4000-8000-0000000000ad';
  const exp = Math.floor(Date.now() / 1000) + 36000;
  const tok = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: ADMIN, aud: 'authenticated', role: 'authenticated', exp, is_anonymous: false })}.c2ln`;
  const session = { access_token: tok, refresh_token: `r-${ADMIN}-1`, token_type: 'bearer', expires_in: 36000, expires_at: exp, user: { id: ADMIN, email: 'admin@exemple-test.fr', aud: 'authenticated', role: 'authenticated' } };
  const valeurCookie = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  const cookie = `sb-127-auth-token=${valeurCookie}`;

  // ---- Serveur ----
  console.log(`▶ Serveur (${TOURS} tours par page, latence ${LATENCE} ms)`);
  for (const p of PAGES) {
    const m = [];
    for (let i = 0; i <= TOURS; i++) {
      await fetch(SUPA + '/__reset');
      const t0 = performance.now();
      const r = await fetch(BASE + p, { headers: { cookie }, redirect: 'manual' });
      const html = await r.text();
      const total = performance.now() - t0;
      const st = await (await fetch(SUPA + '/__stats')).json();
      if (i) m.push({ statut: r.status, total, html: html.length, st });
    }
    const d = m.at(-1);
    resultats.serveur[p] = { statut: d.statut, ms: Math.round(med(m.map((x) => x.total))), htmlKo: Math.round(d.html / 1024), requetes: d.st.total, supabaseKo: Math.round(d.st.octets / 1024), parRequete: Object.fromEntries(Object.entries(d.st.par).map(([k, v]) => [k, v.n])) };
    console.log(`  ${p.padEnd(32)} ${String(resultats.serveur[p].ms).padStart(5)} ms  ${String(d.st.total).padStart(3)} requêtes  ${String(Math.round(d.st.octets / 1024)).padStart(5)} Ko Supabase  HTML ${Math.round(d.html / 1024)} Ko`);
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
        const action = async (nom, faire) => { const d = []; for (let i = 0; i < 5; i++) { const avant = await p.evaluate(() => performance.now()); await faire(); const x = await calme(p, avant, 1000, 120, 20000); d.push({ ms: x.fin - avant, bloque: x.l.reduce((s, [, y]) => s + y, 0) }); } m[nom] = { ms: Math.round(med(d.map((x) => x.ms))), bloqueMs: Math.round(med(d.map((x) => x.bloque))) }; };
        if (page.startsWith('/admin/atelier/studio')) await action('toutChanger', () => p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Tout changer/.test(b.textContent ?? ''))?.click()));
        if (page.startsWith('/admin/retours/duel')) await action('duelSuivant', async () => { await p.mouse.click(5, 5); await p.keyboard.press('ArrowLeft'); });
        tours.push(m);
        await ctx.close();
      }
      const fin = { ...tours.at(-1) };
      for (const k of Object.keys(fin)) if (typeof fin[k] === 'number') fin[k] = med(tours.map((x) => x[k]));
      resultats.client[page] = fin;
      console.log(`  ${page.padEnd(32)} interactif ${String(fin.interactifMs).padStart(6)} ms  TBT ${String(fin.tbtMs).padStart(5)} ms  JS ${fin.jsKo} Ko  iframes ${fin.iframes}${fin.toutChanger ? `  « Tout changer » ${fin.toutChanger.ms} ms` : ''}${fin.duelSuivant ? `  duel suivant ${fin.duelSuivant.ms} ms` : ''}`);
    }
    await navigateur.close();
  }
  if (opt.json) writeFileSync(opt.json, JSON.stringify(resultats, null, 2));
  console.log(`▶ Plus gros morceaux JS (gzip, Ko) : ${Object.entries(resultats.bundles).map(([k, v]) => `${k.split('/').pop()} ${v}`).join(' · ')}`);
} finally {
  finir();
  if (!opt.garder) { await new Promise((r) => setTimeout(r, 1500)); rmSync(tmp, { recursive: true, force: true, maxRetries: 5 }); }
}
