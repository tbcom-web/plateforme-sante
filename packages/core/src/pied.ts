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
