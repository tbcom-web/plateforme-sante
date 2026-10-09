// Dérivation de la géométrie des animations d'en-tête « empreintes en lignes de niveau » (entete-empreintes.ts) à partir des
// géométries VALIDÉES, sans rien redessiner : contour de la semelle (pied.ts, SEMELLE = EZ_SEMELLE.contour, héros « semelles »
// relevé validé par Paul), courbes de niveau du relief de la semelle (dessins.ts, courbesRelief : la capture que Paul adore) et
// trajet du déroulé (pied.ts, TRAJET). Seule la précision change (poids < 5 Ko par animation) : chaque tracé est rééchantillonné,
// allégé (Ramer-Douglas-Peucker, écart ≤ TOLERANCE) et réécrit en B-spline quadratique relative (« q » puis « t », un couple de
// nombres par point), dans un repère ×4 (entiers) ramené à l'échelle par la transformation de la scène.
//
// Utilisé seulement par le test (entete-empreintes.test.ts vérifie que les constantes d'entete-empreintes-geo.ts en sont
// exactement la sortie) et par le script de régénération : le site et l'admin n'embarquent pas dessins.ts pour autant.

import { SEMELLE, TRAJET, echantillonner, type P } from './pied';
import { courbesRelief } from './dessins';

/** Écart maximal (unités du pied 92 × 222) entre le tracé validé et le tracé allégé */
export const TOLERANCE = 0.7;
/** Repère des constantes : unités du pied × 4, arrondies (points de contrôle pairs : milieux entiers) */
export const ECHELLE_GEO = 4;

/** Ramer-Douglas-Peucker sur une polyligne ouverte */
export function rdp(pts: P[], tol: number): P[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
  let max = -1, k = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - a[0]) * dy - (pts[i][1] - a[1]) * dx) / n;
    if (d > max) { max = d; k = i; }
  }
  return max <= tol ? [a, b] : [...rdp(pts.slice(0, k + 1), tol).slice(0, -1), ...rdp(pts.slice(k), tol)];
}

const pair = (v: number) => 2 * Math.round((v * ECHELLE_GEO) / 2);
/** Points de contrôle allégés d'une polyligne (repère ×4, entiers pairs, sans doublon) */
export function arrondir(pts: P[]): P[] {
  const res: P[] = [];
  for (const [x, y] of pts) {
    const q: P = [pair(x), pair(y)];
    if (!res.length || res[res.length - 1][0] !== q[0] || res[res.length - 1][1] !== q[1]) res.push(q);
  }
  return res;
}
/** Boucle fermée → points de contrôle allégés */
export function controles(pts: P[], tol = TOLERANCE): P[] {
  // Coupée en deux au point le plus éloigné du premier : RDP sur deux arcs ouverts
  const d0 = (p: P) => Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]);
  const loin = pts.reduce((k, p, i) => (d0(p) > d0(pts[k]) ? i : k), 0);
  return arrondir([...rdp(pts.slice(0, loin + 1), tol).slice(0, -1), ...rdp([...pts.slice(loin), pts[0]], tol).slice(0, -1)]);
}

const nb = (...v: number[]) => v.map((x, i) => (i && x >= 0 ? ` ${x}` : `${x}`)).join('');
/** B-spline quadratique fermée : « M m0 q p1 m1 t m2 … t m0 z » (milieux entiers, relatifs) */
export function bspline(c: P[]): string {
  const n = c.length;
  const m = (i: number): P => [(c[i % n][0] + c[(i + 1) % n][0]) / 2, (c[i % n][1] + c[(i + 1) % n][1]) / 2];
  const m0 = m(0), p1 = c[1 % n], m1 = m(1);
  let d = `M${nb(m0[0], m0[1])}q${nb(p1[0] - m0[0], p1[1] - m0[1], m1[0] - m0[0], m1[1] - m0[1])}`;
  for (let i = 2; i <= n; i++) { const a = m(i - 1), b = m(i); d += `t${nb(b[0] - a[0], b[1] - a[1])}`; }
  return `${d}z`;
}
/** B-spline quadratique ouverte, du premier au dernier point : « M p0 q p1 m1 t m2 … t p(n-1) » */
export function bsplineOuverte(c: P[]): string {
  const n = c.length;
  if (n < 3) return `M${nb(...c[0])}l${nb(c[n - 1][0] - c[0][0], c[n - 1][1] - c[0][1])}`;
  const m = (i: number): P => [(c[i][0] + c[i + 1][0]) / 2, (c[i][1] + c[i + 1][1]) / 2];
  const p0 = c[0], m1 = n === 3 ? c[2] : m(1);
  let d = `M${nb(p0[0], p0[1])}q${nb(c[1][0] - p0[0], c[1][1] - p0[1], m1[0] - p0[0], m1[1] - p0[1])}`;
  let prec = m1;
  for (let i = 2; i < n - 1; i++) { const b = i === n - 2 ? c[n - 1] : m(i); d += `t${nb(b[0] - prec[0], b[1] - prec[1])}`; prec = b; }
  return d;
}

/**
 * Zone d'un point du relief : 0 talon (cuvette, y > 168), 1 arche (soutien de voûte), 2 avant-pied (barre rétrocapitale, y ≤ 98).
 * Les boucles du relief enjambent le talon et l'arche (la paroi de la cuvette remonte jusqu'à la voûte) : chaque boucle est coupée
 * en arcs, un par zone, pour que les zones s'allument l'une après l'autre.
 */
export const zoneDe = ([, y]: P) => (y > 168 ? 0 : y > 98 ? 1 : 2);

/** Boucle fermée → arcs ouverts par zone (un point de recouvrement à chaque coupure : aucun trou) ; boucle d'une seule zone : fermée */
function arcsParZone(pts: P[]): { z: number; d: string }[] {
  const zs = pts.map(zoneDe);
  if (zs.every((z) => z === zs[0])) return [{ z: zs[0], d: bspline(controles(pts)) }];
  // Départ sur une coupure, puis séquences de même zone
  const debut = zs.findIndex((z, i) => z !== zs[(i - 1 + zs.length) % zs.length]);
  const n = pts.length, arcs: { z: number; pts: P[] }[] = [];
  for (let k = 0; k < n; k++) {
    const i = (debut + k) % n;
    if (!arcs.length || arcs[arcs.length - 1].z !== zs[i]) {
      if (arcs.length) arcs[arcs.length - 1].pts.push(pts[i]);
      arcs.push({ z: zs[i], pts: [pts[i]] });
    } else arcs[arcs.length - 1].pts.push(pts[i]);
  }
  arcs[arcs.length - 1].pts.push(pts[debut]);
  return arcs.filter((a) => a.pts.length > 2).map((a) => ({ z: a.z, d: bsplineOuverte(arrondir(rdp(a.pts, TOLERANCE))) }));
}

export type GeometrieEmpreintes = {
  /** Contour de la semelle (pied droit, repère ×4) */
  contour: string;
  /** Boucles du relief groupées par zone (z) et par niveau (k, du plus bas au plus haut) */
  groupes: { z: number; k: number; d: string }[];
  /** Trajet du déroulé (pied droit, repère ×4), ouvert, du talon vers l'hallux */
  trajet: string;
};

/** Géométrie complète (déterministe) */
export function deriverGeometrie(): GeometrieEmpreintes {
  const contour = bspline(controles(echantillonner(SEMELLE, 6)[0].pts.slice(0, -1)));
  const groupes = new Map<string, { z: number; k: number; d: string }>();
  courbesRelief().forEach(({ boucles }, k) => {
    for (const b of boucles) {
      for (const { z, d } of arcsParZone(echantillonner(b, 4)[0].pts.slice(0, -1))) {
        const g = groupes.get(`${z}-${k}`) ?? { z, k, d: '' };
        g.d += d;
        groupes.set(`${z}-${k}`, g);
      }
    }
  });
  const t = echantillonner(TRAJET, 8)[0].pts;
  const tc = rdp(t, TOLERANCE / 2).map(([x, y]) => [Math.round(x * ECHELLE_GEO), Math.round(y * ECHELLE_GEO)] as P);
  const trajet = `M${tc[0][0]} ${tc[0][1]}l${tc.slice(1).map((p, i) => `${p[0] - tc[i][0]} ${p[1] - tc[i][1]}`).join(' ').replace(/ -/g, '-')}`;
  return { contour, groupes: [...groupes.values()].sort((a, b) => a.z - b.z || a.k - b.k), trajet };
}

/** Source TypeScript d'entete-empreintes-geo.ts (régénération : node scripts de la planche, ou le test qui la compare) */
export function sourceGeometrie(g = deriverGeometrie()): string {
  return `// FICHIER GÉNÉRÉ par sourceGeometrie() (entete-empreintes-derive.ts) — ne pas retoucher à la main : dérivé du contour de la
// semelle (pied.ts, SEMELLE), des courbes de niveau du relief (dessins.ts, courbesRelief) et du trajet du déroulé (pied.ts,
// TRAJET). Repère du pied droit × ${ECHELLE_GEO} (92 × 222 → ${92 * ECHELLE_GEO} × ${222 * ECHELLE_GEO}). entete-empreintes.test.ts vérifie l'égalité.
/* eslint-disable */
export const GEO_EMPREINTES = ${JSON.stringify(g, null, 1).replace(/\n\s*/g, ' ')} as const;
`;
}
