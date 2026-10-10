// CADRAGE DES DESSINS DANS LEURS CASES (retour de Paul du 2026-10-10 : cartes de soins « Podologie du sport », « Semelles
// orthopédiques », « Douleur au talon » : « Tu as mis vert alors que les images ne sont pas centrées dans leurs cases… »).
//
// Cause : les dessins de la marque sont tracés dans un repère 240 × 180 sans être centrés dedans (chaussure posée sur le sol en bas
// du repère, jambe qui entre par le haut et sort du repère, orteils coupés à droite). Les cases les posaient par ce repère, réduit
// (svg à 80 % × 88 % de la case) : le dessin restait bas, et la jambe s'arrêtait net à 6 % SOUS le haut de la case (coupée au milieu
// du fond, pas par le bord de la case).
// Correction : dans une case, le <svg> remplit la case et son viewBox est recadré sur la boîte du tracé RÉEL (mesurée dans Chromium,
// cadrages-dessins-donnees.ts), avec une marge intérieure régulière ; un côté où le dessin sort volontairement du repère (fond perdu)
// n'a pas de marge et est calé sur le bord de la case (preserveAspectRatio) : la jambe entre par le bord de la case.
// Contrôle : testeur de modèles, contrôle « cadrage » (defautCadrage, testeur-modeles.ts).
import { BOITES_DESSINS } from './cadrages-dessins-donnees';

export { BOITES_DESSINS } from './cadrages-dessins-donnees';

/** Marge intérieure d'un dessin dans sa case : part du plus grand côté de son tracé (+ 2 unités pour l'épaisseur du trait) */
export const MARGE_CADRAGE = 0.1;

/**
 * Dessins dont la pièce de la bibliothèque est recadrée dans un <svg> imbriqué SANS panneau autour (ongles épais : avant-pied et
 * fraise coupés net par la fenêtre de la pièce, au milieu de la case). Dans une case, la fenêtre est OUVERTE (overflow visible) :
 * le pied continue jusqu'au bord de la case, qui le coupe (fond perdu). Les pièces dans un panneau (ongle, mycose, orthonyxie,
 * onychoplastie : vignettes encadrées) gardent leur fenêtre.
 */
export const DESSINS_FENETRE_OUVERTE: ReadonlySet<string> = new Set(['releve:ongles-epais', 'pedagogique:ongles-epais']);

export type CadrageDessin = { viewBox: string; preserveAspectRatio: string; fondPerdu: { gauche: boolean; droite: boolean; haut: boolean; bas: boolean }; ouvert: boolean };

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Cadrage d'un dessin pour une case : viewBox centré sur son tracé visible, marge régulière, côtés en fond perdu calés au bord.
 * `cle` : « releve:<nom> », « pedagogique:<nom> » ou « ligne:<nom du trait continu> ». Null : dessin inconnu (repère d'origine).
 */
export function cadrageDessin(cle: string): CadrageDessin | null {
  const b = BOITES_DESSINS[cle];
  if (!b) return null;
  const [x, y, d, bas, f] = b;
  const g = (f & 1) !== 0, dr = (f & 2) !== 0, h = (f & 4) !== 0, ba = (f & 8) !== 0;
  const m = MARGE_CADRAGE * Math.max(d - x, bas - y) + 2;
  const vx = g ? x : x - m, vy = h ? y : y - m, vd = dr ? d : d + m, vb = ba ? bas : bas + m;
  const ax = g && !dr ? 'xMin' : dr && !g ? 'xMax' : 'xMid';
  const ay = h && !ba ? 'YMin' : ba && !h ? 'YMax' : 'YMid';
  return { viewBox: `${r1(vx)} ${r1(vy)} ${r1(vd - vx)} ${r1(vb - vy)}`, preserveAspectRatio: `${ax}${ay} meet`, fondPerdu: { gauche: g, droite: dr, haut: h, bas: ba }, ouvert: DESSINS_FENETRE_OUVERTE.has(cle) };
}

/** Recadre un <svg> de dessin (repère « 0 0 240 180 ») pour une case : viewBox et preserveAspectRatio du cadrage */
export function recadrerSvg(svg: string, c: CadrageDessin | null): string {
  if (!c) return svg;
  const r = svg.replace(/^<svg\b([^>]*?)\sviewBox="0 0 240 180"/, `<svg$1 viewBox="${c.viewBox}" preserveAspectRatio="${c.preserveAspectRatio}"`);
  // Fenêtre ouverte : les <svg> imbriqués (pièces de la bibliothèque) laissent dépasser leur tracé, la case le coupe
  return c.ouvert ? r.slice(0, 4) + r.slice(4).replace(/<svg /g, '<svg overflow="visible" ') : r;
}
