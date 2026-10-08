// Contrôle des pictogrammes métier (packages/core/src/pictos.ts), appelé par controle-charte.mjs (npm run controle:charte).
// Pour chaque picto, dans les 4 variantes (trait normal / fort, avec / sans accent) :
//  - grille : viewBox « 0 0 48 48 », tracés dans le cadre (marge du demi-trait) ;
//  - un seul trait : une seule déclaration stroke-width, sur la racine, égale à PICTO.trait ou PICTO.traitFort ;
//  - aucune couleur littérale (#…, rgb(), hsl()), aucun <style> (WebKit), aucun identifiant (plusieurs pictos par page) ;
//  - accent : une seule couleur (la variable de la charte), absente de la variante sans accent ;
//  - poids : ≤ 3 ko ;
// et quelques règles anatomiques sur les formes dérivées de pied.ts (proportions de la plante, semelle L/l, latéralité).
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const racine = fileURLToPath(new URL('..', import.meta.url));
const sortie = join(tmpdir(), `controle-pictos-${process.pid}.mjs`);
const r = await build({
  stdin: { contents: "export { PICTOS, svgPicto, PICTO, PICTO_ACCENT, PICTOS_SOINS, PICTOS_EQUIPEMENTS, pictoExiste, EQUIPEMENTS, DIRECTIONS_PICTOS, ECHANTILLON_DIRECTIONS, FICHES_DIRECTIONS, svgPictoDirection, traitDirection, couleursPictoSur, FONDS_PICTO, CONTRASTE_PICTO, gamme, contraste } from '@plateforme/core';", resolveDir: racine, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
writeFileSync(sortie, r.outputFiles[0].text);
const c = await import(pathToFileURL(sortie).href);
rmSync(sortie, { force: true });

export const defauts = [];
const G = c.PICTO.grille;
const nombres = (d) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
for (const { id } of c.PICTOS) {
  for (const trait of ['normal', 'fort']) {
    for (const accent of [true, false]) {
      const svg = c.svgPicto(id, { trait, accent, taille: 24 });
      const v = `${id} (${trait}${accent ? ', accent' : ''})`;
      if (!svg.includes(`viewBox="0 0 ${G} ${G}"`)) defauts.push(`${v} : viewBox différente de 0 0 ${G} ${G}`);
      const epaisseurs = [...svg.matchAll(/stroke-width[=:]"?\s*([\d.]+)/g)].map((m) => +m[1]);
      const attendu = trait === 'fort' ? c.PICTO.traitFort : c.PICTO.trait;
      if (epaisseurs.length !== 1 || epaisseurs[0] !== attendu) defauts.push(`${v} : épaisseur non unique ou hors charte (${epaisseurs.join(', ')})`);
      if (/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(\s*\d/i.test(svg)) defauts.push(`${v} : couleur littérale`);
      if (/<style/i.test(svg)) defauts.push(`${v} : <style> (ignoré par WebKit dans un SVG externe)`);
      if (/\sid=/.test(svg)) defauts.push(`${v} : identifiant (collision possible entre pictos d'une même page)`);
      if (/vector-effect|pathLength/.test(svg)) defauts.push(`${v} : vector-effect / pathLength (piège WebKit)`);
      const couleurs = new Set([...svg.matchAll(/style="(?:fill|stroke):([^"]+)"/g)].map((m) => m[1]));
      if (accent && [...couleurs].some((k) => k !== c.PICTO_ACCENT)) defauts.push(`${v} : accent hors de la variable de la charte`);
      if (!accent && couleurs.size) defauts.push(`${v} : couleur d'accent dans la variante sans accent`);
      if (svg.length > 3072) defauts.push(`${v} : ${svg.length} octets (> 3 ko)`);
      for (const [, d] of svg.matchAll(/ d="([^"]+)"/g)) {
        // Coordonnées absolues seulement (les arcs relatifs « a » des cercles portent des rayons, bornés par leur centre)
        const abs = d.replace(/a[^A-Za-z]*/g, '');
        if (nombres(abs).some((n) => n < -0.5 || n > G + 0.5)) { defauts.push(`${v} : tracé hors de la grille`); break; }
      }
    }
  }
}
// Correspondances : chaque picto cité existe ; chaque équipement cité existe au catalogue
for (const [slug, p] of Object.entries(c.PICTOS_SOINS)) if (!c.pictoExiste(p)) defauts.push(`soin ${slug} → picto inconnu ${p}`);
const ids = new Set(c.EQUIPEMENTS.map((e) => e.id));
for (const [e, p] of Object.entries(c.PICTOS_EQUIPEMENTS)) {
  if (!c.pictoExiste(p)) defauts.push(`équipement ${e} → picto inconnu ${p}`);
  if (!ids.has(e)) defauts.push(`équipement inconnu au catalogue : ${e}`);
}
// Anatomie (formes dérivées) : plante adulte (avant-pied 0,35–0,42 × L, talon 0,58–0,68 × avant-pied), semelle L/l 2,4–2,8
const boite = (svg, indice = 0) => {
  const d = [...svg.matchAll(/<path d="([^"]+)"(?! fill)/g)][indice]?.[1] ?? '';
  const n = nombres(d.replace(/[a-z][^A-Z]*/g, ''));
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  return { xs, ys, l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
{
  const p = boite(c.svgPicto('plante'));
  const pts = p.xs.map((x, i) => [x, p.ys[i]]);
  // L : du bout de l'hallux (pastille, rayon compris) au talon ; largeurs mesurées sur le contour de la plante
  const orteils = nombres(([...c.svgPicto('plante').matchAll(/<path d="([^"]+)" fill/g)][0]?.[1] ?? '').replace(/a[^A-Za-z]*/g, '')).filter((_, i) => i % 2 === 1);
  const y0 = Math.min(...orteils) - 2.4, L = Math.max(...p.ys) - y0;
  const largeur = (a, b) => { const q = pts.filter(([, y]) => y >= y0 + a * L && y <= y0 + b * L).map(([x]) => x); return Math.max(...q) - Math.min(...q); };
  const avant = largeur(0, 0.4), talon = largeur(0.8, 0.95);
  if (process.env.DETAIL) console.log('plante', (avant / L).toFixed(3), (talon / avant).toFixed(3));
  if (avant / L < 0.33 || avant / L > 0.44) defauts.push(`plante : avant-pied ${(avant / L).toFixed(2)} × L (attendu 0,35–0,42)`);
  if (talon / avant < 0.55 || talon / avant > 0.72) defauts.push(`plante : talon ${(talon / avant).toFixed(2)} × avant-pied (attendu ≈ 0,60–0,65)`);
  const s = boite(c.svgPicto('semelle-orthopedique'));
  if (s.h / s.l < 2.3 || s.h / s.l > 2.9) defauts.push(`semelle : L/l = ${(s.h / s.l).toFixed(2)} (attendu ≈ 2,6)`);
}

// Directions de style à l'essai (pictos-directions.ts, 2026-10-08) : CHAQUE direction a sa grille (A, B : 24 ; C : 64) et son
// épaisseur optique (une seule déclaration de trait sur la racine pour A et B) ; mêmes interdits ; accent ≥ 3:1 sur blanc, teinté,
// sombre de 4 gammes. Les pictos actuels gardent leur contrôle (grille 48) ci-dessus, inchangé.
let nDirections = 0;
for (const d of c.DIRECTIONS_PICTOS) {
  const Gd = c.FICHES_DIRECTIONS[d].grille;
  for (const id of c.ECHANTILLON_DIRECTIONS) {
    for (const taille of [20, 24, 32, 48, 64]) {
      const svg = c.svgPictoDirection(id, d, { taille });
      const v = `direction ${d} ${id} (${taille} px)`;
      nDirections++;
      if (!svg.includes(`viewBox="0 0 ${Gd} ${Gd}"`)) defauts.push(`${v} : viewBox différente de 0 0 ${Gd} ${Gd}`);
      const ep = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => +m[1]);
      if (ep[0] !== c.traitDirection(d, taille) || (d !== 'c' && ep.length !== 1)) defauts.push(`${v} : épaisseur hors règle (${ep.join(', ')})`);
      if (/#[0-9a-f]{3,8}|(?:rgba?|hsla?)\(\s*\d/i.test(svg)) defauts.push(`${v} : couleur littérale`);
      if (/<style|<text|\sid=|vector-effect|pathLength/i.test(svg)) defauts.push(`${v} : <style>, texte, identifiant ou piège WebKit`);
      for (const [, dd] of svg.matchAll(/ d="([^"]+)"/g)) if (nombres(dd.replace(/a[^A-Za-z]*/g, '')).some((n) => n < -0.6 || n > Gd + 0.6)) { defauts.push(`${v} : tracé hors de la grille`); break; }
    }
  }
}
for (const g of ['canard', 'menthe', 'sable', 'pasteque']) for (const f of c.FONDS_PICTO) {
  const k = c.couleursPictoSur(c.gamme(g), f);
  if (c.contraste(k.accent, k.fond) < c.CONTRASTE_PICTO) defauts.push(`accent des pictos sous 3:1 : ${g}, fond ${f}`);
}
if (!defauts.some((x) => x.startsWith('direction'))) console.log(`✓ directions de style à l'essai : ${nDirections} rendus (3 directions × 12 pictos × 5 tailles), accent ≥ 3:1 sur 4 gammes × 3 fonds`);
export const resume = `${c.PICTOS.length} pictos (grille ${G}, un seul trait ${c.PICTO.trait}/${c.PICTO.traitFort}, sans couleur littérale ni <style>)`;
