// Géométrie d'un pied droit vu de dessous, en SVG (repère 92 × 222, talon en bas, gros orteil à gauche).
// Le pied gauche s'obtient par symétrie (scale(-1, 1)). Contour relevé point par point (talon, voûte
// interne creusée, bosse du 1er métatarsien, bord externe) puis lissé, pour une forme anatomique.
// Source unique de la géométrie du pied : dessins et animations du site (apps/sites, via
// components/animations/pied.ts) et marques du logo (logos.ts).

export type P = [number, number];

/** Courbe fermée passant par les points (Catmull-Rom convertie en courbes de Bézier). */
export function lisser(points: P[]): string {
  const n = points.length;
  const pt = (i: number) => points[(i + n) % n];
  let d = `M${pt(0)[0]} ${pt(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return `${d} Z`;
}

/** Points relevés du contour de la plante (avant lissage) */
export const PLANTE: P[] = [
  [48, 219], [33, 214], [23, 202], [19, 186], [20, 168], [25, 152], // talon, bord interne
  [32, 138], [35, 124], [33, 110], [27, 98], // voûte interne (creusée)
  [19, 86], [14, 72], [13, 58], [17, 46], [24, 38], // bosse du 1er métatarsien
  [34, 35], [45, 35], [56, 38], [65, 42], [73, 48], [79, 56], // sous les orteils
  [82, 68], [81, 82], [78, 98], [74, 116], [72, 134], [73, 152], [75, 170], [75, 188], [71, 204], [61, 215], // bord externe
];

/** Contour de la plante (sans les orteils) */
export const CONTOUR = lisser(PLANTE);

/** Orteils : [cx, cy, rx, ry, rotation°], du gros orteil au petit */
export const ORTEILS: [number, number, number, number, number][] = [
  [27, 16, 10, 13, -8],
  [45, 15, 5.8, 7.5, 4],
  [56, 19, 5.2, 6.8, 10],
  [66, 25, 4.8, 6, 16],
  [75, 34, 4.2, 5.2, 24],
];

/** Trajet du centre de pression pendant le pas : talon → bord externe → avant-pied → gros orteil */
export const TRAJET = 'M47 202 C52 176 62 156 62 132 C62 106 52 82 40 62 C33 48 29 34 27 18';

/** Le point est-il dans le polygone (points relevés, avant lissage) ? */
export function dansPolygone(poly: P[], x: number, y: number): boolean {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Bords gauche et droit du polygone sur une horizontale (premier et dernier croisement) */
export function largeurA(poly: P[], y: number): [number, number] | null {
  const xs: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
  }
  return xs.length < 2 ? null : [Math.min(...xs), Math.max(...xs)];
}

/**
 * Semelle de course vue de dessous (même repère que la plante) : le contour du pied élargi d'une marge,
 * avec l'avant arrondi qui couvre les orteils et une taille moins creusée.
 */
export const SEMELLE_POINTS: P[] = [
  [48, 220], [32, 215], [22, 203], [18, 186], [19, 168], [24, 152], // talon, bord interne
  [29, 138], [31, 124], [29, 110], [24, 98], // cambrure
  [17, 86], [12, 72], [11, 56], [13, 40], [18, 24], [26, 11], [37, 4], [50, 3], // avant-pied, bout
  [62, 7], [72, 15], [80, 27], [84, 42], [85, 58], [84, 76], [81, 96], [77, 116], // bord externe
  [75, 134], [75, 152], [77, 170], [77, 188], [73, 205], [62, 216],
];
export const SEMELLE = lisser(SEMELLE_POINTS);

/**
 * Squelette stylisé du pied droit (vue plantaire, même repère) : os du tarse en ellipses
 * [cx, cy, rx, ry, rotation°], rayons métatarsiens et phalanges en segments [x1, y1, x2, y2],
 * du 1er au 5e rayon. Têtes métatarsiennes = extrémité avant des métatarsiens.
 */
export const OS = {
  calcaneum: [49, 189, 14, 21, -6] as [number, number, number, number, number],
  tarse: [
    [42, 158, 10, 8.5, -10], // talus
    [39, 140, 6, 4.5, -15], // naviculaire
    [64, 147, 6.5, 9, 4], // cuboïde
    [36, 125, 4, 5, -6], // cunéiformes
    [45, 124, 3.6, 5, 0],
    [53, 126, 3.4, 5, 6],
  ] as [number, number, number, number, number][],
  metatarsiens: [
    [37, 115, 30, 65],
    [45, 115, 44, 56],
    [52, 117, 54, 58],
    [59, 121, 63, 63],
    [66, 128, 72, 70],
  ] as [number, number, number, number][],
  /** Phalange proximale puis distale de chaque orteil */
  phalanges: [
    [[30, 58, 28, 35], [28, 30, 27, 9]],
    [[44, 50, 45, 30], [45, 25, 45, 11]],
    [[54, 52, 56, 33], [56, 28, 56, 15]],
    [[63, 57, 66, 38], [66, 33, 66, 22]],
    [[72, 64, 75, 46], [75, 41, 75, 32]],
  ] as [number, number, number, number][][],
};
