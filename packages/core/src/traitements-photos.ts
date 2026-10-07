// Traitement des photos d'une recette (demande de Paul du 2026-10-07 : « une sorte d'overlay / filtre similaire sur l'ensemble des
// photos choisies d'un thème pour obtenir une unité graphique »). Une dimension de recette (dé « t » du studio), appliquée
// UNIFORMÉMENT à toutes les photos du site (premier écran, cabinet, galerie, pages sujet, photos de soins) et à l'aperçu de l'admin.
//
// Les traitements des modèles (jetons.images : naturel, chaud, doux, contrasté — Gabarit.astro, « Photos à découvrir ») restent la
// valeur par défaut (« modele ») ; les jeux ci-dessous en sont l'extension, DÉRIVÉS DE LA GAMME :
//   voile       : voile de la couleur principale (multiplication douce, opacité 0,28) sur une photo un peu désaturée ;
//   duotone     : ombres = encre de la gamme, lumières = fond doux de la gamme ;
//   nb-accent   : noir et blanc, voile accent léger (0,14) ;
//   chaud-doux  : légère chaleur (sépia 0,2), contraste doux ;
//   mat         : désaturé (0,6), noirs relevés, blancs adoucis (éditorial) ;
//   + grain fin optionnel (bruit fractal à 6 %).
// Technique (contraintes de Paul) : UNE matrice de couleur (SVG feColorMatrix, calculée ici) par traitement, dans un <svg> en ligne
// de quelques centaines d'octets réutilisé par `filter:url(#tp-photos)` — CSS seul, aucun fichier retraité, aucun poids d'image,
// aucun script ; le filtre s'applique à la peinture (la photo du premier écran s'affiche aussi vite : pas d'effet sur le LCP).
// color-interpolation-filters="sRGB" : même calcul sous WebKit (iPhone) et Chromium (pas de mix-blend-mode, dont le rendu diffère).
// AA : les sorties restent dans [0, 1] ; l'éclaircissement maximal d'un traitement (voileTraitement) est AJOUTÉ au voile du premier
// écran (texte blanc posé sur photo), si bien que le contraste du titre n'est jamais moindre qu'avec la photo d'origine.
// Module pur.

import { gamme as gammeParId } from './gammes';
import { luminance, melanger, rvb } from './couleurs';

export const TRAITEMENTS_PHOTOS = [
  { id: 'modele', nom: 'Traitement du modèle', detail: 'naturel, chaud, doux ou contrasté selon le modèle' },
  { id: 'voile', nom: 'Voile de couleur', detail: 'voile léger de la couleur du cabinet' },
  { id: 'duotone', nom: 'Duotone', detail: 'ombres encre, lumières claires de la gamme' },
  { id: 'nb-accent', nom: 'Noir et blanc + accent', detail: 'noir et blanc, voile accent léger' },
  { id: 'chaud-doux', nom: 'Chaud doux', detail: 'légère chaleur, contraste doux' },
  { id: 'mat', nom: 'Mat éditorial', detail: 'désaturé, noirs relevés' },
] as const;
export type IdTraitementPhotos = (typeof TRAITEMENTS_PHOTOS)[number]['id'];
export type TraitementPhotos = { id: IdTraitementPhotos; grain: boolean };
export const TRAITEMENT_PHOTOS_DEFAUT: TraitementPhotos = { id: 'modele', grain: false };
export const traitementPhotos = (id: unknown) => TRAITEMENTS_PHOTOS.find((t) => t.id === id);

/** Traitement lu (recette, thème du site) : inconnu → traitement du modèle, sans grain */
export function normaliserTraitementPhotos(brut: unknown): TraitementPhotos {
  const o = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>;
  const id = traitementPhotos(o.id)?.id ?? 'modele';
  return { id, grain: o.grain === true };
}
/** Traitement neutre : rien à poser sur le site (le modèle garde son traitement) */
export const traitementNeutre = (t: TraitementPhotos | null | undefined) => !t || (t.id === 'modele' && !t.grain);
/** Clé notable (assets_notes, type effets) : `effets:photos-<id>[-grain]` */
export const cleTraitementPhotos = (t: TraitementPhotos) => `effets:photos-${t.id}${t.grain ? '-grain' : ''}`;
/** Clé notable lue → traitement ; null si ce n'est pas une clé de traitement */
export function lireCleTraitementPhotos(cle: string): TraitementPhotos | null {
  const m = /^effets:photos-([a-z-]+?)(-grain)?$/.exec(cle);
  const t = m && traitementPhotos(m[1]);
  return t ? { id: t.id, grain: Boolean(m![2]) } : null;
}
export const libelleTraitementPhotos = (t: TraitementPhotos) => `${traitementPhotos(t.id)?.nom ?? t.id}${t.grain ? ' + grain' : ''}`;

// ---------------------------------------------------------------------------------------------------------------
// Couleurs de la gamme et matrices
// ---------------------------------------------------------------------------------------------------------------

export type CouleursTraitement = { accent: string; ombre: string; lumiere: string };

/** Couleurs du traitement : gamme (accent vif ou accent, encre ou plan, fond doux) ; couleur libre : dérivées de la couleur */
export function couleursTraitement(gamme: string | null | undefined, couleur: string): CouleursTraitement {
  const g = gammeParId(gamme ?? '');
  // Ombre : encre de la gamme, sinon son plan assombri (un plan moyen, comme celui de Cobalt, délaverait le duotone)
  if (g) return { accent: g.vif ?? g.accent, ombre: g.encre ?? (luminance(g.plan) > 0.03 ? melanger(g.plan, '#05070a', 0.5) : g.plan), lumiere: melanger(g.fondDoux, '#ffffff', 0.35) };
  const c = /^#[0-9a-f]{6}$/i.test(couleur) ? couleur : '#3d4f63';
  return { accent: c, ombre: melanger(c, '#0b0f14', 0.78), lumiere: melanger(c, '#ffffff', 0.9) };
}

/** Matrice 3 × 4 (lignes r, v, b : coefficients r, v, b puis décalage), valeurs entre 0 et 1 */
export type Matrice = number[][];
const I: Matrice = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
const LW = [0.2126, 0.7152, 0.0722];
const c01 = (h: string) => rvb(h).map((x) => x / 255);
/** Composition : applique `b` puis `a` */
export function composer(a: Matrice, b: Matrice): Matrice {
  return a.map((ligne) => [0, 1, 2, 3].map((j) => ligne[0] * b[0][j] + ligne[1] * b[1][j] + ligne[2] * b[2][j] + (j === 3 ? ligne[3] : 0)));
}
const saturation = (s: number): Matrice => I.map((l) => [0, 1, 2].map((j) => s * l[j] + (1 - s) * LW[j]).concat(0));
const contrasteM = (c: number): Matrice => I.map((l) => [...l.slice(0, 3).map((x) => x * c), (1 - c) / 2]);
const SEPIA = [[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]];
const sepia = (a: number): Matrice => I.map((l, i) => [0, 1, 2].map((j) => (1 - a) * l[j] + a * SEPIA[i][j]).concat(0));
/** Matrice identité (grain seul) */
export const MATRICE_IDENTITE: Matrice = I;
const teinte = (couleur: string, a: number): Matrice => { const c = c01(couleur); return I.map((l, i) => [...l.slice(0, 3).map((x) => x * (1 - a + a * c[i])), 0]); };
const plage = (noir: number, blanc: number): Matrice => I.map((l) => [...l.slice(0, 3).map((x) => x * (blanc - noir)), noir]);
const duotone = (ombre: string, lumiere: string): Matrice => { const o = c01(ombre), l = c01(lumiere); return [0, 1, 2].map((i) => [...LW.map((w) => w * (l[i] - o[i])), o[i]]); };

/** Matrice d'un traitement (null : traitement du modèle, aucune matrice) */
export function matriceTraitement(id: IdTraitementPhotos, c: CouleursTraitement): Matrice | null {
  switch (id) {
    case 'modele': return null;
    case 'voile': return composer(teinte(c.accent, 0.28), saturation(0.85));
    case 'duotone': return duotone(c.ombre, c.lumiere);
    case 'nb-accent': return composer(teinte(c.accent, 0.14), composer(contrasteM(1.06), saturation(0)));
    case 'chaud-doux': return composer(contrasteM(0.94), composer(sepia(0.2), saturation(1.04)));
    case 'mat': return composer(plage(0.07, 0.95), composer(saturation(0.6), contrasteM(0.92)));
  }
}

/** Couleur (0..1) après la matrice, bornée */
export const appliquerMatrice = (m: Matrice, x: readonly number[]) => m.map((l) => Math.max(0, Math.min(1, l[0] * x[0] + l[1] * x[1] + l[2] * x[2] + l[3])));

/**
 * Éclaircissement maximal d'un traitement (gris d'entrée de 0 à 1 et couleurs primaires, luminance relative WCAG) : ajouté au voile
 * du premier écran (texte blanc sur photo), plafonné à 0,25. 0 pour un traitement qui n'éclaircit jamais.
 */
export function voileTraitement(t: TraitementPhotos | null | undefined, c: CouleursTraitement): number {
  if (!t) return 0;
  const m = matriceTraitement(t.id, c);
  if (!m) return 0;
  const lin = (s: number) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
  const lum = (x: readonly number[]) => LW[0] * lin(x[0]) + LW[1] * lin(x[1]) + LW[2] * lin(x[2]);
  const entrees: number[][] = [];
  for (let k = 0; k <= 20; k++) entrees.push([k / 20, k / 20, k / 20]);
  entrees.push([1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [0, 1, 1], [1, 0, 1]);
  const d = Math.max(0, ...entrees.map((x) => lum(appliquerMatrice(m, x)) - lum(x)));
  return Math.round(Math.min(0.25, d) * 100) / 100;
}

// ---------------------------------------------------------------------------------------------------------------
// SVG et CSS (site publié : Gabarit.astro ; aperçu de l'admin : ApercuTheme)
// ---------------------------------------------------------------------------------------------------------------

export const ID_FILTRE_PHOTOS = 'tp-photos';
const n = (x: number) => String(Math.round(x * 10000) / 10000);

/** <svg> en ligne du filtre (vide pour un traitement neutre) ; `id` : identifiant du filtre (aperçus multiples : unique) */
export function svgTraitementPhotos(t: TraitementPhotos | null | undefined, c: CouleursTraitement, id = ID_FILTRE_PHOTOS): string {
  if (traitementNeutre(t)) return '';
  const m = matriceTraitement(t!.id, c) ?? I;
  const valeurs = [...m.map((l) => [l[0], l[1], l[2], 0, l[3]]), [0, 0, 0, 1, 0]].flat().map(n).join(' ');
  const grain = t!.grain
    ? `<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="b"/><feColorMatrix in="b" type="saturate" values="0" result="g"/><feComposite in="m" in2="g" operator="arithmetic" k1="0" k2="1" k3="0.06" k4="-0.03" result="r"/><feComposite in="r" in2="SourceGraphic" operator="in"/>`
    : '';
  return `<svg aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden"><filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${valeurs}" result="m"/>${grain}</filter></svg>`;
}

/**
 * Feuille CSS du traitement : toutes les photos de `racine` (sauf portraits et images SVG) passent par le filtre. `important` :
 * aperçu de l'admin (les photos y portent un filtre en ligne, celui du modèle).
 */
export function cssTraitementPhotos(t: TraitementPhotos | null | undefined, racine = 'main', opts: { id?: string; important?: boolean; document?: string } = {}): string {
  if (traitementNeutre(t)) return '';
  return `${racine} img:not(.praticien__photo):not([src$=".svg"]){filter:${refFiltre(opts.id, opts.document)}${opts.important ? ' !important' : ''}}`;
}

/**
 * Référence CSS du filtre. `document` : adresse du document qui porte le <svg> (aperçu de l'admin dans une iframe srcdoc : un
 * « url(#id) » relatif s'y résoudrait contre l'adresse de la page parente, référence externe ignorée → image invisible).
 */
export const refFiltre = (id = ID_FILTRE_PHOTOS, document?: string) => `url(${document ? JSON.stringify(`${document.split('#')[0]}#${id}`) : `#${id}`})`;
