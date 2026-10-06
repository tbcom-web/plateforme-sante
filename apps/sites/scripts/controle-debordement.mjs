// Contrôle des petits écrans : aucune page ne doit déborder horizontalement à 360, 375 et 390 px (mots composés insécables,
// noms et villes longs : lib/typo.mjs), et aucun titre ne doit couper un mot composé (« pédicurie-podologie ») en fin de ligne.
// Usage : node scripts/controle-debordement.mjs [--dist chemin] [--pages /,/soins]   (npm run controle:debordement)
// Sans --pages : l'accueil, les pages de premier niveau, les pages de thème et les deux premières fiches de soin.
import { chromium } from 'playwright';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resoudre } from '../../../packages/core/scripts/chemins.mjs';
import { servir } from './univers-commun.mjs';

const args = {};
for (let i = 2, v = process.argv; i < v.length; i++) if (v[i].startsWith('--')) args[v[i].slice(2)] = v[i + 1] && !v[i + 1].startsWith('--') ? v[++i] : true;
const racine = fileURLToPath(new URL('..', import.meta.url));
const dist = resoudre(args.dist || join(racine, 'dist'));
const LARGEURS = [360, 375, 390];

const html = async (sous) => (await readdir(join(dist, sous)).catch(() => [])).filter((f) => f.endsWith('.html')).map((f) => `/${sous ? `${sous}/` : ''}${f.replace(/\.html$/, '')}`);
const pages = args.pages
  ? String(args.pages).split(',')
  : ['/', '/soins', '/le-cabinet', '/acces', ...(await html('themes')), ...(await html('soins')).slice(0, 2)];

const { url, fermer } = await servir(dist, 0);
const navigateur = await chromium.launch();
const defauts = [];
for (const l of LARGEURS) {
  const ctx = await navigateur.newContext({ viewport: { width: l, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  for (const page of pages) {
    await p.goto(url + page.replace(/^\//, ''), { waitUntil: 'load' });
    const r = await p.evaluate(() => {
      const largeur = document.documentElement.clientWidth;
      const deborde = document.documentElement.scrollWidth > largeur + 1;
      const fautifs = [];
      if (deborde) {
        for (const e of document.querySelectorAll('body *')) {
          const b = e.getBoundingClientRect();
          if (b.width && b.right > largeur + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('[aria-hidden="true"], svg, dialog:not([open])')) fautifs.push(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')} (${Math.round(b.right)} px) « ${(e.textContent || '').trim().slice(0, 40)} »`);
          if (fautifs.length > 4) break;
        }
      }
      // Mot composé coupé en fin de ligne (titres, menu, en-tête, pied de page) : un <mot-lie> rendu sur deux lignes
      const coupes = [...document.querySelectorAll(':is(h1, h2, h3, nav, header, footer) mot-lie')]
        .filter((s) => s.getClientRects().length > 1)
        .map((s) => s.textContent);
      return { deborde, fautifs, coupes };
    });
    if (r.deborde) defauts.push(`${l} px ${page} : débordement horizontal — ${r.fautifs.join(' ; ')}`);
    if (r.coupes.length) defauts.push(`${l} px ${page} : mot coupé — ${r.coupes.join(', ')}`);
  }
  await ctx.close();
}
await navigateur.close();
fermer();
if (defauts.length) {
  console.log(`✗ ${defauts.length} défaut(s) sur petit écran :\n${defauts.map((d) => `  ${d}`).join('\n')}`);
  process.exit(1);
}
console.log(`✓ Aucun débordement ni mot composé coupé à ${LARGEURS.join(', ')} px (${pages.length} pages)`);
