// Dérivation de la géométrie des « animations du pied » (entete-pied.ts, demande de Paul du 2026-10-09) à partir des géométries
// VALIDÉES, sans rien redessiner — même méthode que les empreintes en lignes de niveau (entete-empreintes-derive.ts : tracé
// rééchantillonné, allégé à TOLERANCE près, réécrit en B-spline quadratique relative, repère du pied droit × 4) :
//  - silhouettes du pied : adulte (PLANTE + ORTEILS), enfant (piedCroissance(0,5)) et tout-petit (PLANTE_ENFANT + ORTEILS_ENFANT),
//    construites par `silhouette` (dessins.ts), la même que le héros « enfant » (« J'adore ») et l'animation « premiers pas » ;
//  - carte de pression : courbes d'égale pression du champ de baropodométrie illustratif du relevé (trame.ts, pression('normal'),
//    le champ de la trame de points validée), par zone : talon, têtes métatarsiennes, hallux ;
//  - isothermes : courbes d'égale distance au bord de la silhouette adulte (elles épousent la forme du pied, sans aucune valeur) ;
//  - semelle thermoformée : contour et éléments de la semelle POD-AT-0004 (pied.ts, SEMELLE, SEMELLE_ELEMENTS).
// Utilisé seulement par le test (entete-pied.test.ts vérifie que entete-pied-geo.ts en est exactement la sortie) et pour la
// régénération : le site et l'admin n'embarquent ni dessins.ts ni trame.ts pour autant.

import { PLANTE, ORTEILS, PLANTE_ENFANT, ORTEILS_ENFANT, SEMELLE, SEMELLE_ELEMENTS, piedCroissance, echantillonner, dansPolygone, type P } from './pied';
import { silhouette } from './dessins';
import { isolignes, pression } from './trame';
import { ECHELLE_GEO, TOLERANCE, bspline, bsplineOuverte, controles } from './entete-empreintes-derive';

/** Boucle fermée (chemin SVG) → B-spline allégée du repère × 4 */
const boucle = (d: string, tol = TOLERANCE) => bspline(controles(echantillonner(d, 6)[0].pts.slice(0, -1), tol));
/** Toutes les boucles d'un chemin à plusieurs sous-chemins */
const boucles = (d: string, tol = TOLERANCE) => echantillonner(d, 6).filter((s) => s.pts.length > 4).map((s) => bspline(controles(s.pts.slice(0, -1), tol))).join('');

/** Seuils de la carte de pression (du plus bas au plus haut : les anneaux « montent » vers le pic) */
export const SEUILS_PRESSION = [0.34, 0.5, 0.66, 0.82] as const;
/** Distances au bord des isothermes (unités du pied), de l'extérieur vers le cœur */
export const DISTANCES_ISOTHERMES = [3.5, 8, 13, 18, 23] as const;

/** Zone d'un point de la carte de pression : 0 talon, 1 têtes métatarsiennes, 2 hallux */
export const zonePression = ([, y]: P) => (y > 140 ? 0 : y > 48 ? 1 : 2);

/** Distance d'un point au bord d'un polygone */
function distanceBord(poly: P[], x: number, y: number): number {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}

export type GeometriePied = {
  /** Silhouettes (pied droit vu de dessus, hallux à gauche, repère × 4) : adulte, enfant (vers 6 ans), tout-petit (vers 1 an) */
  adulte: string; enfant: string; bebe: string;
  /** Courbes d'égale pression par zone (z) et par seuil (k, du plus bas au plus haut) */
  pression: { z: number; k: number; d: string }[];
  /** Isothermes (k = 0 : la plus extérieure) */
  isothermes: { k: number; d: string }[];
  /** Semelle thermoformée : contour, coque, talonnette, soutien de voûte, barre rétrocapitale */
  semelle: { contour: string; coque: string; talonnette: string; voute: string; barre: string };
  /** Carte de montagne (scène 300 × 240, × 4) : courbes de niveau (k du bas vers le sommet), ligne de crête, sentier en lacets */
  montagne: { niveaux: { k: number; d: string }[]; crete: string; sentier: string; pas: [number, number, number][] };
};

// ———————————————————————————————————————————— Carte de montagne (trek, trail, randonnée) : aucune anatomie, aucun personnage
// Relief illustratif (sans valeur de mesure) : deux sommets reliés par une crête, versant qui descend vers le bas de la scène.
const SOMMETS: [number, number, number, number, number][] = [[176, 66, 1, 62, 46], [92, 104, 0.72, 44, 36], [236, 128, 0.42, 40, 34]];
/** Hauteur (0 hors relief) au point (x, y) de la scène 300 × 240 */
export function champMontagne(x: number, y: number): number {
  const h = SOMMETS.reduce((s, [cx, cy, a, sx, sy]) => s + a * Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2)), 0)
    + 0.16 * Math.exp(-(((y - 150) / 70) ** 2)) * (1 + 0.25 * Math.sin(x / 23));
  const bord = Math.min(x, 300 - x, y, 240 - y);
  return Math.max(0, h * Math.min(1, Math.max(0, bord - 4) / 26));
}
/** Niveaux des courbes (du bas vers le sommet) */
export const NIVEAUX_MONTAGNE = [0.17, 0.34, 0.51, 0.68, 0.85] as const;
/** Sentier en lacets : du bas de la scène au col puis au sommet (points de passage) */
const SENTIER: P[] = [[58, 236], [74, 206], [128, 196], [86, 174], [150, 164], [118, 140], [168, 128], [140, 104], [178, 92], [176, 70]];
/** Ligne de crête : du sommet secondaire au sommet principal, puis vers l'est */
const CRETE: P[] = [[60, 112], [92, 104], [128, 92], [176, 66], [214, 92], [236, 128], [270, 150]];
const X = 300 / 96, Y = 240 / 226;


/** Géométrie complète (déterministe) */
export function deriverGeometriePied(): GeometriePied {
  const sAdulte = silhouette(PLANTE, ORTEILS);
  const c = piedCroissance(0.5);
  const pression_: GeometriePied['pression'] = [];
  isolignes((x, y) => pression('normal', x, y), SEUILS_PRESSION, 1.5, 6, 2).forEach(({ boucles: bs }, k) => {
    for (const b of bs) {
      const pts = echantillonner(b, 4)[0].pts.slice(0, -1);
      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const z = zonePression([0, cy]);
      const g = pression_.find((x) => x.z === z && x.k === k) ?? (pression_.push({ z, k, d: '' }), pression_[pression_.length - 1]);
      g.d += bspline(controles(pts));
    }
  });
  pression_.sort((a, b) => a.z - b.z || a.k - b.k);
  const poly = echantillonner(sAdulte, 6)[0].pts.slice(0, -1);
  const iso = isolignes((x, y) => (dansPolygone(poly, x, y) ? distanceBord(poly, x, y) : 0), DISTANCES_ISOTHERMES, 1.5, 6, 2)
    .map(({ boucles: bs }, k) => ({ k, d: bs.map((b) => bspline(controles(echantillonner(b, 4)[0].pts.slice(0, -1)))).join('') }));
  // Montagne : courbes calculées sur la grille des isolignes (repère 96 × 226), ramenées à la scène 300 × 240
  const niveaux = isolignes((x, y) => champMontagne((x + 2) * X, (y + 2) * Y), NIVEAUX_MONTAGNE, 1.5, 6, 2).map(({ boucles: bs }, k) => ({
    k, d: bs.map((b) => bspline(controles(echantillonner(b, 4)[0].pts.slice(0, -1).map(([x, y]) => [(x + 2) * X, (y + 2) * Y] as P), 1.3))).join(''),
  }));
  const ouverte = (pts: P[]) => bsplineOuverte(pts.map(([x, y]) => [x * ECHELLE_GEO, y * ECHELLE_GEO] as P));
  // Sentier : courbe de Catmull-Rom (C), pour y poser les pas exactement ; un pas tous les ~13 unités, alternés de part et d'autre
  const n = SENTIER.length, q = (i: number) => SENTIER[Math.max(0, Math.min(n - 1, i))];
  let sentier = `M${SENTIER[0].join(' ')}`;
  for (let i = 0; i < n - 1; i++) {
    const [a, b, c, d] = [q(i - 1), q(i), q(i + 1), q(i + 2)];
    sentier += `C${[b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6, c[0], c[1]].map((v) => Math.round(v * 10) / 10).join(' ')}`;
  }
  const ech = echantillonner(sentier, 24)[0].pts;
  const pas: [number, number, number][] = [];
  let parcouru = 6;
  for (let i = 1; i < ech.length; i++) {
    const [ax, ay] = ech[i - 1], [bx, by] = ech[i], l = Math.hypot(bx - ax, by - ay);
    while (parcouru <= l && l > 0) {
      const t = parcouru / l, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, ux = (bx - ax) / l, uy = (by - ay) / l, c = pas.length % 2 ? 1 : -1;
      pas.push([Math.round((x - uy * c * 3.2) * 10) / 10, Math.round((y + ux * c * 3.2) * 10) / 10, Math.round((Math.atan2(ux, -uy) * 180) / Math.PI)]);
      parcouru += 15;
    }
    parcouru -= l;
  }
  return {
    adulte: boucle(sAdulte), enfant: boucle(silhouette(c.plante, c.orteils)), bebe: boucle(silhouette(PLANTE_ENFANT, ORTEILS_ENFANT)),
    pression: pression_, isothermes: iso,
    semelle: { contour: boucle(SEMELLE), coque: boucles(SEMELLE_ELEMENTS.coque), talonnette: boucles(SEMELLE_ELEMENTS.talonnette), voute: boucles(SEMELLE_ELEMENTS.voute), barre: boucles(SEMELLE_ELEMENTS.barre) },
    montagne: { niveaux, crete: ouverte(CRETE), sentier, pas },
  };
}

/** Source TypeScript d'entete-pied-geo.ts */
export function sourceGeometriePied(g = deriverGeometriePied()): string {
  return `// FICHIER GÉNÉRÉ par sourceGeometriePied() (entete-pied-derive.ts) — ne pas retoucher à la main : dérivé des silhouettes du
// pied (dessins.ts, silhouette : PLANTE + ORTEILS, piedCroissance, PLANTE_ENFANT + ORTEILS_ENFANT), du champ de pression du relevé
// (trame.ts), de la distance au bord de la silhouette et de la semelle POD-AT-0004 (pied.ts). Repère du pied droit × ${ECHELLE_GEO}.
// entete-pied.test.ts vérifie l'égalité.
/* eslint-disable */
export const GEO_PIED = ${JSON.stringify(g, null, 1).replace(/\n\s*/g, ' ')} as const;
`;
}
