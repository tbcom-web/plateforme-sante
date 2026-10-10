// AUDIT DE SITE — collecte des mesures brutes (demande de Paul du 2026-10-10 : « outil d'audit de site de praticien facile à
// générer pour ma commerciale […] analyse super complète incluant l'optimisation ChatGPT, responsive, contraste »).
// Aucune note ici : uniquement des faits mesurés. La notation est dans noter.mjs, le rendu dans rapport.mjs.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE = require('node:fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const UA_BUREAU = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const UA_CHATGPT = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot';

/** Robots d'IA et de moteurs contrôlés dans robots.txt */
export const ROBOTS_IA = [
  // citation : le robot qui permet d'apparaître dans les réponses (bloqué = invisible) ; entrainement : choix légitime de refus
  { ua: 'OAI-SearchBot', nom: 'ChatGPT (recherche)', role: 'citation' },
  { ua: 'ChatGPT-User', nom: 'ChatGPT (lecture à la demande)', role: 'citation' },
  { ua: 'PerplexityBot', nom: 'Perplexity', role: 'citation' },
  { ua: 'Claude-SearchBot', nom: 'Claude (recherche)', role: 'citation' },
  { ua: 'Googlebot', nom: 'Google (et Gemini)', role: 'citation' },
  { ua: 'Bingbot', nom: 'Bing (et Copilot)', role: 'citation' },
  { ua: 'GPTBot', nom: 'OpenAI (entraînement)', role: 'entrainement' },
  { ua: 'ClaudeBot', nom: 'Anthropic (entraînement)', role: 'entrainement' },
  { ua: 'Google-Extended', nom: 'Google (entraînement)', role: 'entrainement' },
];

const TRACEURS = [
  [/google-analytics\.com|googletagmanager\.com|\/gtag\/js/, 'Google Analytics'],
  [/connect\.facebook\.net|facebook\.com\/tr/, 'Meta (Facebook)'],
  [/hotjar\.com/, 'Hotjar'],
  [/doubleclick\.net|googleadservices\.com/, 'Google Ads'],
  [/clarity\.ms/, 'Microsoft Clarity'],
  [/linkedin\.com\/px|snap\.licdn\.com/, 'LinkedIn'],
  [/tiktok\.com\/i18n\/pixel|analytics\.tiktok\.com/, 'TikTok'],
];
const COOKIES_TRACEURS = /^(_ga|_gid|_gat|_fbp|_fbc|_hj|_gcl|_clck|_clsk|_uetsid|_uetvid|IDE|fr)($|_)/;

async function recuperer(url, { ua = UA_BUREAU, redirect = 'follow', delai = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), delai);
  try {
    const r = await fetch(url, { headers: { 'user-agent': ua, 'accept-language': 'fr-FR,fr;q=0.9' }, redirect, signal: ctrl.signal });
    const texte = redirect === 'manual' ? '' : await r.text();
    return { ok: r.ok, statut: r.status, url: r.url, entetes: Object.fromEntries(r.headers), texte };
  } catch (e) {
    return { ok: false, statut: 0, erreur: String(e.cause?.code || e.name || e) };
  } finally { clearTimeout(t); }
}

/** Groupes du robots.txt → bloqué ou non pour un user-agent (règle « Disallow: / » du groupe le plus précis) */
export function lireRobots(texte) {
  const groupes = []; let courant = null; const sitemaps = [];
  for (const brute of texte.split(/\r?\n/)) {
    const ligne = brute.replace(/#.*/, '').trim(); if (!ligne) continue;
    const [cle, ...reste] = ligne.split(':'); const val = reste.join(':').trim(); const c = cle.trim().toLowerCase();
    if (c === 'sitemap') { sitemaps.push(val); continue; }
    if (c === 'user-agent') { if (!courant || courant.regles.length) { courant = { agents: [], regles: [] }; groupes.push(courant); } courant.agents.push(val.toLowerCase()); }
    else if ((c === 'disallow' || c === 'allow') && courant) courant.regles.push({ type: c, chemin: val });
  }
  const bloque = (ua) => {
    const u = ua.toLowerCase();
    const g = groupes.find((g) => g.agents.some((a) => a !== '*' && u.includes(a))) || groupes.find((g) => g.agents.includes('*'));
    if (!g) return false;
    return g.regles.some((r) => r.type === 'disallow' && r.chemin === '/') && !g.regles.some((r) => r.type === 'allow' && r.chemin === '/');
  };
  return { sitemaps, bloque };
}

const motsDe = (html) => html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter((m) => /\p{L}{2,}/u.test(m)).length;

/** PageSpeed Insights (Google) — clé facultative PAGESPEED_KEY (sans clé, quota partagé, parfois refusé) */
async function pagespeed(url, strategie) {
  const p = new URLSearchParams({ url, strategy: strategie, locale: 'fr' });
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) p.append('category', c);
  if (process.env.PAGESPEED_KEY) p.set('key', process.env.PAGESPEED_KEY);
  const r = await recuperer(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${p}`, { delai: 120000 });
  if (!r.ok) return { erreur: r.statut ? `HTTP ${r.statut}` : r.erreur };
  try {
    const j = JSON.parse(r.texte); const lh = j.lighthouseResult; const a = lh.audits;
    const num = (id) => a[id]?.numericValue ?? null;
    return {
      scores: Object.fromEntries(Object.entries(lh.categories).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)])),
      lcp: num('largest-contentful-paint'), fcp: num('first-contentful-paint'), cls: num('cumulative-layout-shift'),
      tbt: num('total-blocking-time'), si: num('speed-index'), poids: num('total-byte-weight'),
      terrain: j.loadingExperience?.metrics ? Object.fromEntries(Object.entries(j.loadingExperience.metrics).map(([k, v]) => [k, { p75: v.percentile, cat: v.category }])) : null,
    };
  } catch (e) { return { erreur: 'réponse illisible' }; }
}

/** Mesures dans la page rendue (exécuté dans le navigateur) */
function mesurerDansPage() {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const meta = (n) => document.querySelector(`meta[name="${n}" i],meta[property="${n}" i]`)?.getAttribute('content')?.trim() || null;
  // texte trop petit
  let car = 0, petits = 0;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode.textContent.trim(); const p = w.currentNode.parentElement;
    if (!t || !p || !visible(p)) continue;
    car += t.length; if (parseFloat(getComputedStyle(p).fontSize) < 12) petits += t.length;
  }
  // zones de clic trop petites (hors liens dans un paragraphe)
  const cibles = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,[role=button]')].filter(visible);
  const petitesCibles = cibles.filter((el) => {
    const r = el.getBoundingClientRect(); if (r.width >= 24 && r.height >= 24) return false;
    const parent = el.parentElement; return !(parent && parent.textContent.trim().length > el.textContent.trim().length + 20);
  }).map((el) => (el.textContent.trim() || el.getAttribute('aria-label') || el.tagName).slice(0, 40));
  const liens = [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.href, texte: (a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80) }));
  const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch { return { invalide: true }; } });
  const imgs = [...document.images];
  const texte = document.body.innerText || '';
  return {
    titre: document.title?.trim() || null,
    description: meta('description'), robotsMeta: meta('robots'), viewport: meta('viewport'), generateur: meta('generator'),
    og: { titre: meta('og:title'), image: meta('og:image'), description: meta('og:description') },
    langue: document.documentElement.lang || null,
    canonique: document.querySelector('link[rel=canonical]')?.href || null,
    favicon: !!document.querySelector('link[rel~=icon]'),
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean),
    titres: [...document.querySelectorAll('h1,h2,h3')].slice(0, 40).map((h) => ({ n: +h.tagName[1], t: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 90) })),
    debordement: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    hauteur: document.documentElement.scrollHeight,
    texteTotal: car, textePetit: petits, petitesCibles: petitesCibles.slice(0, 12), nbPetitesCibles: petitesCibles.length,
    liens, jsonld,
    images: { total: imgs.length, sansAlt: imgs.filter((i) => !i.hasAttribute('alt')).length },
    iframes: [...document.querySelectorAll('iframe')].map((f) => f.src).filter(Boolean),
    mots: texte.split(/\s+/).filter((m) => /\p{L}{2,}/u.test(m)).length,
    texte: texte.slice(0, 30000),
    lcp: window.__lcp ?? null, cls: window.__cls ?? null,
    nav: (() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, ttfb: n.responseStart } : null; })(),
  };
}

const ESPION_PERF = `window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true})}catch(e){}`;

async function visiter(navigateur, url, mobile, journal) {
  const ctx = await navigateur.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_MOBILE, locale: 'fr-FR' }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: UA_BUREAU, locale: 'fr-FR' });
  await ctx.addInitScript(ESPION_PERF);
  const page = await ctx.newPage();
  const requetes = []; const erreursConsole = [];
  page.on('response', async (r) => {
    const req = r.request(); let taille = Number(r.headers()['content-length'] || 0);
    if (!taille) { try { taille = (await r.body()).length; } catch {} }
    requetes.push({ url: r.url(), type: req.resourceType(), statut: r.status(), taille });
  });
  page.on('console', (m) => { if (m.type() === 'error') erreursConsole.push(m.text().slice(0, 160)); });
  // téléphone : réseau « 4G lente » et processeur ralenti ×4, comme Lighthouse (mesure de secours si PageSpeed ne répond pas)
  const cdp = mobile ? await ctx.newCDPSession(page) : null;
  if (cdp) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const t0 = Date.now();
  let reponse;
  try { reponse = await page.goto(url, { waitUntil: 'load', timeout: 90000 }); } catch (e) { journal(`  chargement incomplet (${mobile ? 'mobile' : 'bureau'}) : ${e.message.split('\n')[0]}`); }
  try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
  const dureeChargement = Date.now() - t0;
  await page.waitForTimeout(1200);
  if (cdp) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  const capture = await page.screenshot({ type: 'jpeg', quality: 72 });
  const mesures = await page.evaluate(mesurerDansPage);
  let axe = null;
  if (mobile) {
    await page.addScriptTag({ content: AXE });
    axe = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, resultTypes: ['violations'] });
      return r.violations.map((v) => ({
        id: v.id, impact: v.impact, aide: v.help, noeuds: v.nodes.length,
        exemples: v.nodes.slice(0, 6).map((n) => ({ html: n.html.slice(0, 140), cible: n.target.join(' '), data: n.any?.[0]?.data && typeof n.any[0].data === 'object' ? n.any[0].data : null })),
      }));
    });
  }
  const cookies = await ctx.cookies();
  await ctx.close();
  return { statut: reponse?.status() ?? 0, urlFinale: reponse?.url() ?? url, dureeChargement, capture, mesures, axe, requetes, erreursConsole, cookies: cookies.map((c) => ({ nom: c.name, domaine: c.domain })) };
}

export async function collecter(domaineOuUrl, { journal = console.log, sansPagespeed = false } = {}) {
  const brut = domaineOuUrl.trim();
  const depart = /^https?:\/\//i.test(brut) ? brut : `https://${brut.replace(/\/+$/, '')}`;
  const hote = new URL(depart).hostname;
  journal(`Audit de ${hote}`);

  // 1. Accès, redirections, HTTPS
  const [accueil, http, gpt] = await Promise.all([
    recuperer(depart), recuperer(`http://${hote}/`, { redirect: 'manual' }), recuperer(depart, { ua: UA_CHATGPT }),
  ]);
  let base = accueil.ok ? accueil.url : depart;
  if (!accueil.ok && !/^https?:\/\/www\./.test(depart)) {
    const www = await recuperer(`https://www.${hote}/`); if (www.ok) { Object.assign(accueil, www); base = www.url; }
  }
  if (!accueil.ok && !accueil.statut) throw new Error(`Site injoignable : ${hote} (${accueil.erreur}). Vérifier l’adresse, ou le certificat HTTPS du site.`);
  const origine = new URL(base).origin;
  const httpVersHttps = http.statut >= 300 && http.statut < 400 && /^https:/i.test(http.entetes?.location || '');

  // 2. Fichiers techniques
  const [robotsR, llms, sitemapDefaut] = await Promise.all([
    recuperer(`${origine}/robots.txt`), recuperer(`${origine}/llms.txt`), recuperer(`${origine}/sitemap.xml`),
  ]);
  const robots = robotsR.ok && !/<html/i.test(robotsR.texte) ? lireRobots(robotsR.texte) : null;
  let sitemap = sitemapDefaut.ok && /<(urlset|sitemapindex)/i.test(sitemapDefaut.texte) ? sitemapDefaut : null;
  if (!sitemap && robots?.sitemaps?.length) { const s = await recuperer(robots.sitemaps[0]); if (s.ok && /<(urlset|sitemapindex)/i.test(s.texte)) sitemap = s; }
  const lastmods = sitemap ? [...sitemap.texte.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]).sort() : [];

  // 3. Navigateur (mobile + bureau) et PageSpeed en parallèle
  journal('Navigateur : mobile et ordinateur…');
  const navigateur = await chromium.launch();
  const psi = sansPagespeed ? Promise.resolve({ mobile: { erreur: 'désactivé' }, bureau: { erreur: 'désactivé' } })
    : Promise.all([pagespeed(base, 'mobile'), pagespeed(base, 'desktop')]).then(([mobile, bureau]) => ({ mobile, bureau }));
  let mobile, bureau;
  try {
    mobile = await visiter(navigateur, base, true, journal);
    bureau = await visiter(navigateur, base, false, journal);
  } finally { await navigateur.close(); }

  // 4. Pages internes : liens cassés, mentions légales
  const internes = [...new Set(mobile.mesures.liens.map((l) => l.href.split('#')[0]).filter((h) => { try { return new URL(h).hostname.replace(/^www\./, '') === hote.replace(/^www\./, ''); } catch { return false; } }))];
  journal(`Liens internes : ${internes.length} (contrôle de ${Math.min(internes.length, 20)})`);
  const controles = await Promise.all(internes.slice(0, 20).map(async (u) => ({ url: u, statut: (await recuperer(u, { redirect: 'follow', delai: 10000 })).statut })));
  const lienMentions = mobile.mesures.liens.find((l) => /mentions?\s*l[ée]gales|informations?\s*l[ée]gales/i.test(l.texte) || /mentions-?legales/i.test(l.href));
  const lienConfidentialite = mobile.mesures.liens.find((l) => /confidentialit|donn[ée]es\s*personnelles|rgpd|vie\s*priv/i.test(l.texte + l.href));
  const mentions = lienMentions ? await recuperer(lienMentions.href) : null;

  journal('PageSpeed Insights (Google)…');
  const pagespeedRes = await psi;

  return {
    version: 1, date: new Date().toISOString(), demande: brut, hote, base, origine,
    acces: { statut: accueil.statut, erreur: accueil.erreur ?? null, https: base.startsWith('https:'), httpVersHttps, entetes: accueil.entetes ?? {} },
    brut: { mots: accueil.ok ? motsDe(accueil.texte) : 0, taille: accueil.texte?.length ?? 0, htmlDebut: (accueil.texte || '').slice(0, 4000) },
    robotChatgpt: { statut: gpt.statut },
    robots: robots ? { present: true, bloques: Object.fromEntries(ROBOTS_IA.map((b) => [b.ua, robots.bloque(b.ua)])), sitemaps: robots.sitemaps } : { present: false },
    llms: { present: llms.ok && !/<html/i.test(llms.texte) && llms.texte.trim().length > 20 },
    sitemap: sitemap ? { url: sitemap.url, urls: (sitemap.texte.match(/<loc>/g) || []).length, dernierLastmod: lastmods.at(-1) ?? null } : null,
    mobile, bureau,
    liensInternes: { total: internes.length, casses: controles.filter((c) => c.statut >= 400 || c.statut === 0) },
    mentions: lienMentions ? { url: lienMentions.href, statut: mentions?.statut, texte: mentions?.ok ? mentions.texte.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 20000) : '' } : null,
    confidentialite: lienConfidentialite ? { url: lienConfidentialite.href } : null,
    traceurs: [...new Set(mobile.requetes.flatMap((r) => TRACEURS.filter(([re]) => re.test(r.url)).map(([, n]) => n)))],
    cookiesTraceurs: mobile.cookies.filter((c) => COOKIES_TRACEURS.test(c.nom)).map((c) => c.nom),
    pagespeed: pagespeedRes,
  };
}
