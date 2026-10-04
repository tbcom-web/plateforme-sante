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

/**
 * Pied droit de PROFIL (vue externe, pointe à droite), squelette articulé : repère x 0–112, y −16–58,
 * sol en y = 58. Os en contours fermés séparés par un jour d'articulation assez large pour rester ouvert
 * sous le trait ; tibia et fibula coupés en haut (tracé ouvert). Trois découpages : `masses` (favicon,
 * trois volumes), `principaux` (en-tête), `os` (version détaillée, petits os du tarse en ellipses
 * [cx, cy, rx, ry, rotation°]) ; rayons en capsules [x1, y1, x2, y2, rayon] ; `reflets` (petits arcs) ;
 * `epure` (fragments d'os et contour ouvert).
 */
export const PROFIL = {
  largeur: 120,
  haut: -14,
  hauteur: 72,
  sol: 58,
  /** Favicon : jambe, arrière-pied (talus + calcanéum), avant-pied (tarse antérieur, métatarsiens, orteils) */
  masses: [
    'M15 -14 L15.5 13 C16 20 20 23 26 23 L36 23 C41 23 43 20 42.5 14 L42 -14 Z',
    'M2 46 C2 37.5 7 33.5 14 34 C19 34.5 21 30 28 30 L45 30 C52 30 55.5 34.5 54.5 40 C53.5 46 47 51 39 54 C30 57.5 21 58.5 12.5 58.5 C5.5 58.5 2 54 2 46 Z',
    'M64 31 C74 32.5 93 42 106 49 C116 54 117 58.5 111 58.5 L66 58.5 C61.5 58.5 60 55.5 60.5 51 L61 36 C61.3 32.5 62.5 31 64 31 Z',
  ],
  /** Os longs et grands os du tarse (contours ; tibia et fibula ouverts en haut) */
  os: [
    'M25 -14 L25.5 13 C25.5 18.5 28.5 21 33.5 21 L38 21 C41.5 21 43 18.5 42.5 14 L41.5 -14', // tibia
    'M14 -14 L14.5 16 C14.8 23 18.5 26.5 21.5 24 C22.8 22.8 22.5 19.5 22 16 L21.2 -14', // fibula
    'M24 33 C24 28.5 28.5 26 34 26 L42 26 C48 26 52 28.5 53.5 32 C54.5 35 52.8 37.5 49.5 37.5 L28.5 38 C25.8 38 24 36 24 33 Z', // talus
    'M2 47 C2 39.5 6.5 35.5 12.5 35.5 C18 35.5 21.5 39 25.5 41 C29.5 43 33 44 38 43.5 L43 43 C47 43 49.5 45.5 48.5 49.5 C47.5 53.5 43 56 38 56.5 C30 57.5 21 58.5 12.5 58.5 C6 58.5 2 54 2 47 Z', // calcanéum
  ],
  /** En-tête : le tarse antérieur d'un seul bloc */
  bloc: 'M65 28.5 C72 29 78.5 33.5 79 40 C79.5 45.5 75.5 50 69 50 L62.5 50 C59 50 57.5 47.5 58 44 L59.5 34.5 C60.2 30.5 62 28.5 65 28.5 Z',
  /** Version détaillée : naviculaire, cunéiformes, cuboïde [cx, cy, rx, ry, rotation°] */
  tarse: [
    [62.5, 33.5, 4.2, 5.8, 8],
    [74, 39, 3.8, 5.8, 25],
    [58.5, 50, 4.6, 4.2, 0],
  ] as [number, number, number, number, number][],
  /** Rayons en capsules [x1, y1, x2, y2, rayon] : 1er et 5e métatarsiens, puis orteils */
  rayons: {
    principaux: [
      [86, 45, 101, 51, 3.2], [77, 55.3, 96, 56.4, 2.3], [110, 54.4, 116, 56.2, 2.4],
    ] as [number, number, number, number, number][],
    os: [
      [84.5, 44.5, 101, 51, 3.2], [69.5, 54.6, 96, 56.4, 2.4], [110, 54.4, 116, 56.2, 2.4], [102.5, 57.3, 104.5, 57.4, 1.6],
    ] as [number, number, number, number, number][],
  },
  /** Reflets discrets (version détaillée) : petits arcs dans le calcanéum, le talus et le tibia */
  reflets: 'M8.5 43 C10 40.5 12.5 39.6 15.5 39.9 M31 29.5 C34 29.2 37.5 29.5 40.5 30.6 M37 -6 L37.3 11',
  /**
   * Épure : contour de peau ouvert (arrière du talon, dos du pied), ligne d'appui plantaire,
   * os réduits à cinq fragments [x1, y1, x2, y2, épaisseur relative] posés à plat.
   */
  epure: {
    talon: 'M10 -14 C10 2 12 17 8 26 C3 34 0 43 1.5 51 C3 56 7.5 58.5 13 58.5',
    dos: 'M47 -14 C47 2 48 17 55 25 C66 34 90 43 106 49.5 C112 52.5 116 54.5 117 57',
    /** Appuis plantaires sous le pied : [x, niveau de pression 0–1] (talon, voûte, avant-pied) */
    appuis: [[16, 1], [30, 0.8], [46, 0.3], [60, 0.1], [74, 0.45], [88, 0.8], [102, 0.6]] as [number, number][],
    sol: 58.5,
    fragments: [
      [32, -8, 32.5, 13, 1], [10, 47, 38, 45, 1.6], [58, 36, 70, 38, 1.25], [80, 44.5, 100, 51.5, 1], [107, 54.3, 113, 56, 0.8],
    ] as [number, number, number, number, number][],
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
 * Jambe de profil, du genou au pied (repère 100 × 100, pointe à droite) : appui à plat, tibia incliné vers
 * l'avant (milieu d'appui, avant la propulsion). Silhouette pleine, sol, et zones d'appui
 * marquées en bandes sur le sol, sous la plante.
 */
export const JAMBE = {
  silhouette: 'M54 10 C59 6 67 6 71.5 9.5 C70 14 66 30 61 46 C58.5 54 56.5 59 56 63 C60 68 70 72 80 75 C86.5 77 90.5 79 90 81.8 C89.5 83.8 86.5 84.3 82.5 84.3 L47.5 84.3 C41.5 84.3 38.5 80.5 39.5 75.5 C40.5 71 43 66.5 43.5 61 C44 54 39 44 39.5 33 C40 23 47 15 54 10 Z',
  /** Disque de fond, en retrait vers le haut et l'arrière : la jambe en sort par l'avant */
  disque: [42, 42, 32] as [number, number, number],
  sol: { y: 90, x1: 8, x2: 96 },
  /** Zones d'appui en bandes sous la plante [x1, x2, niveau] : talon, médio-pied (bord externe), avant-pied */
  appuis: [[43, 53, 1], [59, 66, 0.3], [72, 86, 0.8]] as [number, number, number][],
};
