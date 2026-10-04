// Géométrie d'un pied droit vu de dessous, en SVG (repère 92 × 222, talon en bas, gros orteil à gauche).
// Le pied gauche s'obtient par symétrie (scale(-1, 1)).

/** Contour de la plante (sans les orteils) */
export const CONTOUR =
  'M48 218 C26 218 16 200 18 176 C20 150 32 132 30 110 C28 88 14 76 12 56 C10 38 20 26 34 28 ' +
  'C50 30 66 38 74 52 C82 66 80 90 74 110 C68 132 72 160 74 180 C76 204 66 218 48 218 Z';

/** Orteils : [cx, cy, rx, ry], du gros orteil au petit */
export const ORTEILS: [number, number, number, number][] = [
  [26, 10, 10, 12],
  [45, 12, 6, 7.5],
  [57, 18, 5.5, 6.5],
  [67, 26, 5, 6],
  [76, 36, 4.5, 5],
];

/** Trajet du centre de pression pendant le pas : talon → bord externe → avant-pied → gros orteil */
export const TRAJET = 'M46 200 C52 170 60 150 58 125 C56 100 48 80 40 62 C34 46 30 30 27 12';
