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

/**
 * Pied de tout-petit (vers 1 an), même repère et mêmes points que PLANTE (indice à indice, pour interpoler
 * la croissance) : plus large, bord interne presque droit — le coussinet graisseux comble encore la voûte,
 * ce qui est physiologique à cet âge — et orteils courts et ronds.
 */
export const PLANTE_ENFANT: P[] = [
  [48, 219], [33, 214], [24, 203], [21, 188], [21, 170], [21, 152], // talon, plus étroit que l'avant-pied
  [20, 138], [20, 124], [19, 110], [17, 98], // voûte comblée
  [14, 86], [11, 72], [11, 58], [15, 46], [22, 39], // avant-pied large
  [33, 36], [45, 36], [56, 38], [66, 42], [75, 48], [81, 56], // sous les orteils
  [84, 68], [84, 82], [83, 98], [81, 116], [80, 134], [78, 152], [76, 170], [75, 188], [71, 204], [62, 215], // bord externe
];
export const ORTEILS_ENFANT: [number, number, number, number, number][] = [
  [27, 21, 11, 12.5, -6],
  [45, 19, 6.6, 7.4, 4],
  [56, 22, 6, 6.8, 10],
  [66, 28, 5.6, 6, 16],
  [75, 36, 5, 5.2, 24],
];

/** Pied à un âge donné : interpolation entre le pied du tout-petit (t = 0) et le pied adulte (t = 1) */
export function piedCroissance(t: number): { plante: P[]; orteils: [number, number, number, number, number][] } {
  const m = (a: number, b: number) => +(a + (b - a) * t).toFixed(1);
  return {
    plante: PLANTE.map(([x, y], i) => [m(PLANTE_ENFANT[i][0], x), m(PLANTE_ENFANT[i][1], y)] as P),
    orteils: ORTEILS.map((o, i) => o.map((v, k) => m(ORTEILS_ENFANT[i][k], v)) as [number, number, number, number, number]),
  };
}

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

// ———————————————————————————————————————————————————— Squelette de profil (pied articulé)

/**
 * Tronçon de contour : chaîne de courbes de Bézier cubiques [x0, y0, (c1x, c1y, c2x, c2y, x, y)…].
 * Deux os voisins réutilisent le MÊME tronçon (l'un dans un sens, l'autre dans l'autre) : leurs bords
 * se touchent exactement et l'interligne articulaire est le trait lui-même, fin et continu.
 */
type Troncon = number[];

const fx = (v: number) => +v.toFixed(2);
/** Segment droit sous forme de cubique */
const droit = (a: P, b: P): Troncon => [a[0], a[1], a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3, a[0] + (2 * (b[0] - a[0])) / 3, a[1] + (2 * (b[1] - a[1])) / 3, b[0], b[1]];
/** Tronçon parcouru dans l'autre sens */
const inverse = (t: Troncon): Troncon => {
  const p: number[][] = [];
  for (let i = 0; i < t.length; i += 2) p.push([t[i], t[i + 1]]);
  return p.reverse().flat();
};
/** Arc de cercle (degrés, y vers le bas) en cubiques, par quarts de tour au plus */
function arc(c: P, r: number, a0: number, a1: number): Troncon {
  const nb = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90));
  const pas = ((a1 - a0) / nb) * (Math.PI / 180);
  const k = (4 / 3) * Math.tan(pas / 4) * r;
  let a = (a0 * Math.PI) / 180;
  const t: number[] = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  for (let i = 0; i < nb; i++) {
    const b = a + pas;
    t.push(c[0] + r * Math.cos(a) - k * Math.sin(a), c[1] + r * Math.sin(a) + k * Math.cos(a), c[0] + r * Math.cos(b) + k * Math.sin(b), c[1] + r * Math.sin(b) - k * Math.cos(b), c[0] + r * Math.cos(b), c[1] + r * Math.sin(b));
    a = b;
  }
  return t;
}
/** Contour d'un os à partir de tronçons qui s'enchaînent (fermé, ou ouvert pour un os coupé) */
function contourOs(troncons: Troncon[], ferme = true): string {
  let d = `M${fx(troncons[0][0])} ${fx(troncons[0][1])}`;
  for (const t of troncons) for (let i = 2; i < t.length; i += 6) d += `C${fx(t[i])} ${fx(t[i + 1])} ${fx(t[i + 2])} ${fx(t[i + 3])} ${fx(t[i + 4])} ${fx(t[i + 5])}`;
  return ferme ? `${d}Z` : d;
}
const debut = (t: Troncon): P => [t[0], t[1]];
const fin = (t: Troncon): P => [t[t.length - 2], t[t.length - 1]];

/**
 * Os long (métatarsien, phalange) : une base (tronçon partagé avec l'os précédent, du dessus vers le
 * dessous), une diaphyse effilée et une tête ronde de centre `tete` et de rayon `r`. Renvoie le contour et
 * le cercle de la tête, sur lequel l'os suivant pose sa base concave (l'emboîtement).
 */
function osLong(base: Troncon, tete: P, r: number, taille: number) {
  const [h, b] = [debut(base), fin(base)];
  const m: P = [(h[0] + b[0]) / 2, (h[1] + b[1]) / 2];
  const l = Math.hypot(tete[0] - m[0], tete[1] - m[1]);
  const u: P = [(tete[0] - m[0]) / l, (tete[1] - m[1]) / l];
  const v: P = [-u[1], u[0]]; // côté plantaire
  const axe = (f: number, s: number, w: number): number[] => [m[0] + u[0] * l * f + s * v[0] * w, m[1] + u[1] * l * f + s * v[1] * w];
  const a = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
  const tet = arc(tete, r, a + 90, a - 90);
  const dessous: Troncon = [...b, ...axe(0.4, 1, taille), ...axe(0.8, 1, taille), ...debut(tet)];
  const dessus: Troncon = [...fin(tet), ...axe(0.8, -1, taille), ...axe(0.4, -1, taille), ...h];
  return { d: contourOs([base, dessous, tet, dessus]), tete, r, a };
}
/** Base concave d'un os posé sur la tête du précédent, orientée vers le centre de sa propre tête */
function baseSur(prec: { tete: P; r: number }, vers: P, ouverture = 58): Troncon {
  const a = (Math.atan2(vers[1] - prec.tete[1], vers[0] - prec.tete[0]) * 180) / Math.PI;
  return arc(prec.tete, prec.r, a - ouverture, a + ouverture);
}
/** Rayon d'orteils : phalanges successives [centre de tête, rayon, demi-largeur de diaphyse] */
function orteil(meta: { tete: P; r: number }, phalanges: [P, number, number][]): string[] {
  let prec = meta;
  return phalanges.map(([t, r, w]) => {
    const o = osLong(baseSur(prec, t), t, r, w);
    prec = o;
    return o.d;
  });
}

// Points d'articulation (repère du profil : x 0–120, y −14–58, sol en y = 58, pointe à droite)
const A: P = [23, 21.5]; // arrière du dôme du talus
const B: P = [47.5, 19.5]; // avant du dôme
const N1: P = [53.5, 22.5]; // col du talus, dessus du naviculaire
const N2: P = [55, 34.5]; // carrefour de Chopart (talus, calcanéum, naviculaire, cuboïde)
const A0: P = [23.5, 30.5]; // arrière du talus sur le calcanéum
const K1: P = [55.5, 48.5]; // bas de l'interligne calcanéo-cuboïdien
const V1: P = [62.5, 21.8]; // dessus naviculaire / cunéiforme
const Vm: P = [66, 29.5];
const V2: P = [63.5, 37]; // bas du naviculaire
const V3: P = [69.5, 39.5]; // cunéiforme latéral / cuboïde / base des métatarsiens latéraux
const W1: P = [73, 23.5]; // base du 1er rayon
const Wm: P = [73, 31.5];
const K2: P = [67.5, 52]; // bas du cuboïde, base du 5e métatarsien

const T = {
  // Jambe (ouverte en haut)
  tibiaArriere: [27, -14, 27, 0, 27.6, 9, 24.8, 15.2, 23.8, 17.4, 23.2, 19.4, ...A],
  dome: [...A, 27, 16.4, 40, 14.4, ...B],
  tibiaAvant: [...B, 47.8, 16, 45.4, 13.4, 43.2, 9.6, 41.6, 6, 41.6, 0, 41.6, -14],
  fibula: [22.5, -14, 22.5, 0, 23.2, 8, 22.8, 13, 23.2, 18.5, 22.6, 24, 20.2, 27.6, 18.6, 29.6, 15.6, 29, 14.2, 25.4, 13, 21.5, 13.6, 15, 14.4, 9, 15, 2, 15, -14, 15, -14],
  // Pied
  col: [...B, 50.2, 20.8, 51.6, 21.8, ...N1],
  teteTalus: [...N1, 58.8, 23.4, 60, 31.4, ...N2],
  subtalaire: [...N2, 50, 35.2, 45, 32.2, 39, 32.6, 33, 33, 28, 34, ...A0],
  talusArriere: [...A0, 21.6, 28.6, 21.4, 24, ...A],
  calcaneumDessus: [...A0, 19, 31.8, 14.5, 28.4, 9, 28.4],
  talon: [9, 28.4, 3.4, 28.4, 0.6, 33.6, 0.8, 41, 1, 48.6, 3.4, 55, 8.4, 57.2, 12, 58.6, 17, 58.2, 21, 56.2],
  calcaneumDessous: [21, 56.2, 27, 53.8, 32, 52, 38, 51.2, 45, 50.4, 51, 50, ...K1],
  calcaneoCuboidien: [...K1, 57.6, 45, 57.6, 39, ...N2],
  naviculaireDessus: [...V1, 59.5, 21, 56, 21.6, ...N1],
  naviculaireDessous: [...N2, 58, 35.8, 61, 37, ...V2],
  naviculaireAvantBas: [...V2, 65.2, 35, 66.2, 32.4, ...Vm],
  naviculaireAvantHaut: [...Vm, 65.8, 26.6, 64.8, 23.8, ...V1],
  cuneiformeDessus: [...V1, 66.5, 21.6, 70, 22.4, ...W1],
  cuneiformes: [...Wm, 71, 30.8, 68.6, 30, ...Vm],
  baseM1: [...W1, 73.6, 26, 73.6, 28.8, ...Wm],
  baseM2: [...Wm, 72.6, 34, 71.4, 36.8, ...V3],
  cuboideDessus: [...V2, 65.4, 37.6, 67.6, 38.8, ...V3],
  baseM5: [...V3, 70, 43, 69.4, 48, ...K2],
  cuboideDessous: [...K2, 63.6, 53.4, 59.4, 51.8, ...K1],
} satisfies Record<string, Troncon>;

// Métatarsiens : 1er rayon (dessus), rayon médian, 5e (dessous, base large de la tubérosité)
const M1 = osLong(T.baseM1, [95, 39], 4.8, 3.6);
const M2 = osLong(T.baseM2, [89.5, 48], 4.4, 3);
const M5 = osLong(T.baseM5, [82, 54.2], 3.8, 3.1);
// En-tête : deux rayons seulement (cunéiformes d'un bloc), base du 1er sur toute la face des cunéiformes
const M1bloc = osLong([...T.baseM1, ...T.baseM2.slice(2)], [95, 39.5], 4.9, 3.6);

const OS_PROFIL = {
  tibia: contourOs([T.tibiaArriere, T.dome, T.tibiaAvant], false),
  fibula: contourOs([T.fibula], false),
  talus: contourOs([T.dome, T.col, T.teteTalus, T.subtalaire, T.talusArriere]),
  calcaneum: contourOs([T.calcaneumDessus, T.talon, T.calcaneumDessous, T.calcaneoCuboidien, T.subtalaire]),
  naviculaire: contourOs([T.naviculaireDessus, T.teteTalus, T.naviculaireDessous, T.naviculaireAvantBas, T.naviculaireAvantHaut]),
  cuneiformeMedial: contourOs([T.cuneiformeDessus, T.baseM1, T.cuneiformes, T.naviculaireAvantHaut]),
  cuneiformeLateral: contourOs([inverse(T.cuneiformes), T.baseM2, inverse(T.cuboideDessus), T.naviculaireAvantBas]),
  cuboide: contourOs([T.cuboideDessus, T.baseM5, T.cuboideDessous, T.calcaneoCuboidien, T.naviculaireDessous]),
  /** En-tête : naviculaire, cunéiformes et cuboïde d'un bloc */
  tarse: contourOs([T.naviculaireDessus, T.teteTalus, inverse(T.calcaneoCuboidien), inverse(T.cuboideDessous), inverse(T.baseM5), inverse(T.baseM2), inverse(T.baseM1), inverse(T.cuneiformeDessus)]),
  orteil1: orteil(M1, [[[107, 43.6], 3.8, 3], [[116.5, 48.2], 3.2, 2.4]]),
  orteil2: orteil(M2, [[[100, 50.8], 3.5, 2.6], [[108.5, 54.2], 2.9, 2.2]]),
  orteil5: orteil(M5, [[[92, 55.6], 3, 2.4]]),
  orteil1Bloc: orteil(M1bloc, [[[107, 43.8], 3.9, 3.1], [[116.5, 48.4], 3.2, 2.4]]),
  orteil5Bloc: orteil(M5, [[[92, 55.6], 3, 2.4]]),
};
const O = OS_PROFIL;
const ton = (t: number) => (d: string) => ({ d, ton: t });

/**
 * Pied droit de PROFIL (vue externe, pointe à droite), squelette articulé : repère x 0–120, y −14–58,
 * sol en y = 58. Les os sont des contours fermés qui partagent leurs bords (tronçons communs) : talus
 * emboîté sous le tibia et dans le naviculaire, calcanéum massif avec sa tubérosité, interligne de
 * Chopart en S, cunéiformes et cuboïde, métatarsiens effilés à tête ronde, phalanges à base concave
 * posées sur la tête précédente. Tibia et fibula coupés en haut (contour ouvert). Trois découpages :
 * `masses` (favicon, trois volumes), `principaux` (en-tête), `os` (version détaillée). Chaque os porte
 * un ton : 0 = aplat, 1 = ombre (os en arrière-plan). `reflets` : petits arcs (version détaillée).
 */
export const PROFIL = {
  largeur: 120,
  haut: -14,
  hauteur: 72,
  sol: 58,
  /** Favicon : jambe, arrière-pied (talus + calcanéum), avant-pied (tarse antérieur, rayons, orteils) */
  masses: [
    'M15 -14 H42 V6 C42 10 45.6 13 47.5 18.4 C40 14.6 30 14.6 22.5 18.6 C19 20.4 15.6 19.6 15.2 15 Z',
    'M1 42 C0.8 34 4 29 9.5 28.6 C15 28.2 18.5 27.6 22 25 C28 21 40 20.8 48.5 23.5 C53 25 55.5 29 55.5 34 L55.5 46.6 C54 50.2 49.5 50.8 44 51.4 C35 52.4 28 54 22 56.4 C16.5 58.6 9 59 5 56.2 C2.2 54 1 49 1 42 Z',
    'M65 22.5 C72.5 22.5 79 25.5 87 31 C95 36.5 105 42.5 113.5 47 C119.5 50.5 120 56 114 57.6 C105 59 92 59 80 58.6 C73.5 58.3 69 56.4 65.6 53.4 C63.6 51.4 62.6 48 62.6 44 L62.8 27 C62.9 24 63.6 22.5 65 22.5 Z',
  ],
  /** En-tête : jambe, talus, calcanéum, tarse antérieur d'un bloc, deux rayons et leurs orteils */
  principaux: [
    ...[O.tibia, O.talus, O.calcaneum, O.tarse, M1bloc.d, ...O.orteil1Bloc].map(ton(0)),
    ...[O.fibula, M5.d, ...O.orteil5Bloc].map(ton(1)),
  ],
  /** Version détaillée : tous les os (les os d'arrière-plan en ombre) */
  os: [
    ...[O.tibia, O.talus, O.calcaneum, O.naviculaire, O.cuneiformeMedial, M1.d, M5.d, ...O.orteil1, ...O.orteil5].map(ton(0)),
    ...[O.fibula, O.cuneiformeLateral, O.cuboide, M2.d, ...O.orteil2].map(ton(1)),
  ],
  /** Reflets discrets (version détaillée) : petits arcs dans le calcanéum, le talus et le tibia */
  reflets: 'M5.5 40 C6.4 36 9 33.6 12.6 33.2 M31 20.4 C34.5 19.4 38.5 19.4 42 20.4 M36.5 -6 L36.8 8',
  /**
   * Épure : contour de peau ouvert (arrière du talon, dos du pied), ligne d'appui plantaire, et la
   * colonne interne du même squelette au trait seul (sans aplat), réduite dans la peau (`reduction` :
   * décalage x, y et échelle). `os` : version détaillée ; `principaux` : en-tête ; `compact` : favicon.
   */
  epure: {
    talon: 'M13.5 -14 C13.5 2 14.5 14 12 22 C5.5 31 2 41 3 50 C4 55.5 8 58.5 13.5 58.5',
    dos: 'M50 -14 C50 2 51 11 55.5 15.5 C61 20 70 19 80 24.5 C91 30.5 103 37.5 111 42.5 C115.5 45.5 117.5 51 116.5 58.5',
    /** Appuis plantaires sous le pied : [x, niveau de pression 0–1] (talon, voûte, avant-pied, orteils) */
    appuis: [[14, 1], [27, 0.8], [41, 0.3], [55, 0.1], [69, 0.45], [83, 0.8], [97, 1], [109, 0.6]] as [number, number][],
    sol: 58.5,
    reduction: [9, 4.5, 0.84] as [number, number, number],
    os: [O.tibia, O.talus, O.calcaneum, O.naviculaire, O.cuneiformeMedial, M1.d, ...O.orteil1],
    principaux: [O.talus, O.calcaneum, M1bloc.d, ...O.orteil1Bloc],
    compact: [O.talus, O.calcaneum, O.tarse, M1bloc.d, ...O.orteil1Bloc],
  },
};

/**
 * Rubans : deux bords de la plante (interne avec la voûte, externe) et l'arc des orteils, tirés des points
 * relevés (PLANTE, ORTEILS). Chaque ruban : points de la ligne médiane et épaisseurs aux mêmes points
 * (pleins aux appuis, déliés à la voûte et aux extrémités).
 */
export const RUBANS: { points: P[]; epaisseurs: number[] }[] = [
  {
    // Bord interne : talon → voûte creusée → 1re tête métatarsienne → gros orteil
    points: [[56, 214], [36, 210], [24, 196], [21, 174], [27, 150], [34, 126], [29, 104], [18, 82], [15, 60], [21, 40], [27, 22], [30, 8]],
    epaisseurs: [1, 13, 20, 22, 14, 4, 3.5, 11, 18, 16, 9, 1],
  },
  {
    // Bord externe : du 5e métatarsien au talon, ruban plus fin
    points: [[66, 30], [77, 50], [82, 72], [78, 100], [73, 128], [74, 156], [74, 182], [66, 204], [52, 214]],
    epaisseurs: [1, 6, 10, 11, 8.5, 8.5, 7.5, 5, 1],
  },
  {
    // Arc des orteils, du 2e au 5e
    points: [[42, 6], [55, 10], [66, 17], [76, 28]],
    epaisseurs: [1, 9, 8, 1],
  },
];

/**
 * Ruban à épaisseur modulée : la ligne médiane (Catmull-Rom échantillonnée) décalée de part et d'autre
 * d'une demi-épaisseur interpolée, en un contour fermé (pleins et déliés, pointes aux extrémités).
 */
export function ruban(points: P[], epaisseurs: number[], facteur = 1, pas = 8): string {
  const n = points.length;
  const pt = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
  const gauche: P[] = [];
  const droite: P[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    for (let s = 0; s < pas || (i === n - 2 && s === pas); s++) {
      const t = s / pas;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const df = (a: number, b: number, c: number, d: number) => 0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t2);
      const x = f(p0[0], p1[0], p2[0], p3[0]);
      const y = f(p0[1], p1[1], p2[1], p3[1]);
      const dx = df(p0[0], p1[0], p2[0], p3[0]);
      const dy = df(p0[1], p1[1], p2[1], p3[1]);
      const l = Math.hypot(dx, dy) || 1;
      const e = (epaisseurs[i] + (epaisseurs[i + 1] - epaisseurs[i]) * (t * t * (3 - 2 * t))) * facteur / 2;
      gauche.push([x - (dy / l) * e, y + (dx / l) * e]);
      droite.push([x + (dy / l) * e, y - (dx / l) * e]);
    }
  }
  const f = (p: P) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M${gauche.map(f).join(' L')} L${droite.reverse().map(f).join(' L')} Z`;
}

/**
 * Chaussure de course de profil (repère 100 × 50, pointe à droite), dessinée à plat puis inclinée par la
 * marque (propulsion : talon levé, pointe vers le sol). Semelle intermédiaire épaisse au talon et cambrée
 * (drop, pointe relevée), fenêtre d'amorti au talon, tige à col ouvert, empeigne avant (zone de la trame).
 */
export const CHAUSSURE = {
  /** Centre de rotation et inclinaison (degrés, sens horaire) */
  centre: [52, 28] as P,
  inclinaison: 17,
  semelle: 'M10 32 C22 33.5 42 35.2 61 36 C75 36.6 87 35.8 95.5 33.4 C97.5 36.8 94 41 87 42 C70 44.2 46 44.8 23 44.8 C14.5 44.8 9.6 41.6 9.2 37 C9 34.6 9.2 33 10 32 Z',
  tige: 'M10.2 31.6 C8.4 24 9.6 16 14.2 11.6 C18.6 13.6 23.6 14.6 28.2 13 L31.6 7.6 C34.6 6.4 37.6 7.4 38.8 10 C48 15.2 62 22 76 26.2 C86 29 92.6 30.8 95.4 33.2 C86.6 35.6 74.6 36.4 61 35.8 C42 35 22 33.2 10.2 31.6 Z',
  /** Fenêtre d'amorti au talon (en creux dans la semelle) */
  fenetre: 'M16.5 38.4 C16.5 37.2 17.4 36.6 18.8 36.7 L28.6 37.4 C30 37.5 30.8 38.2 30.6 39.3 C30.4 40.4 29.4 40.9 28 40.8 L18.6 40.4 C17.3 40.3 16.5 39.6 16.5 38.4 Z',
  /** Renfort de talon : la découpe de la tige au-dessus de la semelle */
  renfort: 'M10.4 25 C15 25.5 19.5 27.6 21.5 31.4',
  /** Lacets : barrettes [x1, y1, x2, y2] le long de l'ouverture */
  lacets: [[40.5, 15.2, 44.2, 11.4], [47, 18.6, 50.7, 14.8], [53.5, 21.8, 57.2, 18], [60, 24.6, 63.6, 20.8]] as [number, number, number, number][],
  /** Empeigne avant : polygone où se pose la trame de points */
  empeigne: [[66, 27.2], [78, 30.4], [88, 32.6], [86, 34.6], [74, 35.4], [64, 34.6]] as P[],
  /** Crantage : encoches remontant du bord de la semelle, posées le long de ce bord (talon → pointe) */
  crantage: [[18, 44.6], [46, 44.8], [86, 42]] as P[],
  /** Ligne de semelle seule (favicon) */
  ligne: 'M11 41 C30 43.4 62 43.6 93 37.6',
  /** Lignes de vitesse derrière le talon */
  vitesse: 'M-1 20 H6.5 M1.5 27 H7',
};

/**
 * Jambe de profil, du genou au pied (repère 100 × 100, pointe à droite), en fin d'appui : talon levé,
 * appui sur l'avant-pied et les orteils, tibia incliné vers l'avant. Silhouette anatomique : crête
 * tibiale rectiligne à l'avant (rotule et tubérosité tibiale sous la coupe du genou), galbe du
 * gastrocnémien à l'arrière, tendon d'Achille, cheville fine, talon arrondi, voûte, avant-pied et orteils
 * à plat. Contour ouvert au genou (coupe). Sol, zones d'appui en bandes sur le sol, sous la plante.
 */
export const JAMBE = {
  silhouette: 'M55.8 7.7 C57.6 9.4 57.8 12.8 56.6 15 C56.1 16 56.2 17.4 55.8 18.8 L41.5 61 C43.5 64.5 47 68 51.5 72.5 C55 76 58 78.5 60.5 79.6 C62 80.3 63 80.6 64.5 80.6 C67 80.6 69.4 81.8 69.6 83.6 C69.8 85 69 85.6 67.4 85.6 L56 85.6 C52.5 85.6 50.5 84.6 48.8 83 C44 78.5 39.5 75.6 35.5 74.4 C31.5 73.2 27.6 71 27 66.6 C26.5 63 28 60.6 29.4 58.6 C31.2 55.4 33.6 51.5 34.6 47.5 C35.4 44 35.2 40.5 34.2 36.5 C32.6 30.5 32 23 33.8 16.5 C35.2 11.5 37.6 7 40.2 4.3',
  /** Détail (version détaillée) : la malléole externe, suggérée par un arc */
  details: 'M36.8 56.2 C39.2 55.4 41 57.4 40.4 60',
  /** Disque de fond, en retrait vers le haut et l'arrière : la jambe le traverse */
  disque: [34, 34, 26] as [number, number, number],
  sol: { y: 90, x1: 8, x2: 92 },
  /** Zones d'appui en bandes sous la plante [x1, x2, niveau] : trace du talon (déjà levé), avant-pied, orteils */
  appuis: [[27, 33, 0.15], [44, 52, 1], [58.5, 66, 0.6]] as [number, number, number][],
};

// ———————————————————————————————————————————————————— Pied et bas de jambe de profil (vue externe)

/**
 * Pied et bas de jambe de profil, talon à gauche, autour du squelette articulé (PROFIL.os, même repère :
 * x 0–123, sol en y = 62, jambe coupée en y = −52). Une seule géométrie, réutilisée par tous les dessins de
 * profil (talon, semelle, taping, voûtes, senior) : peau (mollet, tendon d'Achille, talon, plante, orteils,
 * dos du pied, cou-de-pied, tibia), os, malléole externe, aponévrose plantaire. `voute` : hauteur de l'arche
 * (normale, creuse, plate), qui déforme ensemble les os, la plante et l'aponévrose.
 */
export type Voute = 'normale' | 'creuse' | 'plate';
export const SOL_PROFIL = 62;
/** Contour de la peau (points relevés autour du squelette) ; `true` = point de la plante sous l'arche */
const PEAU_PROFIL: [number, number, boolean?][] = [
  [5, -52], [4, -38], [5.5, -22], [8.5, -6], [9.5, 8], [8, 18], [3.5, 28], [-0.5, 38], [-2, 48], [1, 56], [7, 60.6], [14, 62], // mollet, Achille, talon
  [26, 62, true], [38, 60.6, true], [50, 58.6, true], [62, 58.4, true], [74, 59.6, true], [86, 61.4, true], // plante sous l'arche
  [96, 62], [106, 62], [114, 61.8], [120, 60], [123.4, 55], [121.5, 50], [116.5, 46], [110, 42.5], // avant-pied, gros orteil
  [102, 37], [94, 32], [84, 26], [74, 21], [64, 18], [56, 15.5], [51, 11], [48.5, 0], [47.5, -20], [47, -52], // dos du pied, tibia
];

export function piedDeProfil(voute: Voute = 'normale') {
  const k = { normale: 0, creuse: -6, plate: 3.6 }[voute];
  const creux = { normale: 1, creuse: 3.4, plate: 0.05 }[voute];
  const bosse = (x: number) => Math.exp(-(((x - 58) / 20) ** 2));
  // Os : orteils abaissés jusqu'au sol (pulpe en appui), arche relevée ou affaissée selon la voûte
  const os = (x: number, y: number): P => [x, +(y + (x > 94 ? (x - 94) * 0.24 : 0) + (y < 60 ? k * bosse(x) : 0)).toFixed(2)];
  const deformer = (d: string) => d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (_, x, y) => os(+x, +y).join(' '));
  const peau = PEAU_PROFIL.map(([x, y, sous]) => [x, +(sous ? SOL_PROFIL - (SOL_PROFIL - y) * creux : y < 40 ? y + k * bosse(x) : y).toFixed(2)] as P);
  const n = peau.length;
  const pt = (i: number) => peau[Math.max(0, Math.min(n - 1, i))];
  let contour = `M${peau[0][0]} ${peau[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    contour += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return {
    voute,
    sol: SOL_PROFIL,
    /** Peau : tracé ouvert (coupe de la jambe en haut) et forme fermée pour l'aplat */
    contour,
    peau: `${contour} Z`,
    /** Os (ton 1 = os en arrière-plan) et fûts du tibia et de la fibula jusqu'à la coupe */
    os: PROFIL.os.map((o) => ({ d: deformer(o.d), ton: o.ton })),
    futs: 'M27 -52 L27 -14 M41.6 -52 L41.6 -14 M15 -52 L15 -14 M22.5 -52 L22.5 -14',
    /** Relief de la malléole externe sous la peau */
    malleole: 'M12.5 26 C12 19 23 18 24.5 24',
    /** Aponévrose plantaire : de la tubérosité du calcanéum aux têtes métatarsiennes, en trois faisceaux */
    aponevrose: [[92, 55], [97, 56.6], [102, 58]].map(([x, y]) => deformer(`M9 57 C24 58.4 44 56.6 58 55 C70 53.8 82 ${y - 1.4} ${x} ${y}`)).join(' '),
    /** Insertion de l'aponévrose sur le calcanéum */
    insertion: os(10, 56.5),
    /** Pression illustrative sous la plante, du talon (x ≈ 0) aux orteils (x ≈ 123) */
    appui: (x: number) => {
      const g = (c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));
      const milieu = { normale: 0.28, creuse: 0, plate: 0.62 }[voute];
      return Math.min(1, 0.95 * g(13, 9) + milieu * g(56, 22) * (x > 30 && x < 84 ? 1 : 0) + 0.9 * g(95, 9) + 0.55 * g(117, 5));
    },
  };
}
