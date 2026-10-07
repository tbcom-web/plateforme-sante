// Kit « Sports » (demande de Paul, 2026-10-07 : « commencer un kit de thèmes d'icônes etc. sur les sports ») : pour chaque sport,
// une scène unique centrée sur ce que le pédicure-podologue regarde (réception de saut au basket, appuis sur l'avant-pied au tennis,
// crampons du pied d'appui au football…), en deux registres — trait continu (« ligne », style validé « trait fin, élégant ») et
// pédagogique (aplats doux de la gamme) — et un picto (pictos.ts, famille « Sports »). Ingrédients de niveau 1, tous BROUILLONS
// (« À revoir » dans /admin/illustrations) ; le kit qui les regroupe est déclaré dans kits.ts (niveau 2).
//
// RÈGLES (graphiste-sante, illustrateur-medical, docs/referentiels/pieges-illustration.md) :
//  - aucun pied dessiné à l'œil : la peau est le profil médial validé (pied.ts : piedDeProfil, POD-AT-0003/0008 ; pied GAUCHE vu
//    côté interne, orteils à droite, la jambe sort du cadre) ou la plante validée (SEMELLE, CONTOUR_PIED) ; les poses viennent des
//    outils du trait continu (ligne.ts : leverTalon, plier) et, pour la course, de la cinématique validée du coureur (foulee.ts) ;
//  - une chaussure est l'ENVELOPPE du pied validé sous son col (comme une forme de cordonnier, même méthode que le héros senior),
//    élargie de l'épaisseur de la tige, posée sur sa semelle : le pied est toujours dans la chaussure, jamais l'inverse ;
//  - matériel juste (docs/referentiels/revue-anatomique-2026-10-07-sports.md) : crampons moulés courts et nombreux au football,
//    crampons vissés longs et peu nombreux au rugby, crampons de trail (dents basses), semelle de randonnée crantée, tige montante
//    au basket, cale sous la tête du 1er métatarsien en cyclisme, coque et fixation (butée, talonnière) au ski, chausson à semelle
//    fendue en danse, picots courts au golf ; AUCUNE marque, aucun logo, aucune bande décorative reconnaissable ;
//  - aucun texte, aucun visage, une seule scène lisible ; jamais de couleur posée sur la peau (l'accent va sur l'objet ou le sol).
//
// Repère des scènes : 240 × 180 (comme les dessins), sol vers y ≈ 158.
import { piedDeProfil, SEMELLE_POINTS, CONTOUR_PIED, chaikin, type P } from './pied';
import { sousChemins, leverTalon, plier, contenuLigneMorceaux, type OptionsLigne } from './ligne';
import { poseCoureur } from './foulee';

// ———————————————————————————————————————————————————— Liste des sports

export const SPORTS = [
  'course', 'trail', 'randonnee', 'football', 'rugby', 'basket', 'tennis', 'handball', 'danse', 'cyclisme', 'ski', 'golf',
] as const;
export type Sport = (typeof SPORTS)[number];

/**
 * Fiche d'un sport : libellé, ce que montre la scène (ce que le pédicure-podologue regarde) et hashtags par défaut (filtres de
 * l'admin, hashtags.ts). Les hashtags suivent FORME_HASHTAG (minuscules, sans accents, tirets).
 */
export const FICHES_SPORTS: Record<Sport, { libelle: string; regard: string; hashtags: readonly string[] }> = {
  course: { libelle: 'Course à pied', regard: 'La foulée : fin d’appui, talon qui se lève, chaussure de course', hashtags: ['course-a-pied', 'running', 'foulee', 'chaussure'] },
  trail: { libelle: 'Trail', regard: 'La chaussure à crampons sur un terrain en pente', hashtags: ['trail', 'course-a-pied', 'crampons', 'terrain', 'chaussure'] },
  randonnee: { libelle: 'Randonnée', regard: 'La chaussure montante, la cheville maintenue, la semelle crantée', hashtags: ['randonnee', 'marche', 'chaussure-montante', 'cheville'] },
  football: { libelle: 'Football', regard: 'Le pied d’appui et ses crampons moulés, à côté du ballon', hashtags: ['football', 'crampons', 'pied-d-appui', 'ballon'] },
  rugby: { libelle: 'Rugby', regard: 'Les appuis et les crampons vissés, ballon ovale', hashtags: ['rugby', 'crampons', 'appuis', 'ballon'] },
  basket: { libelle: 'Basket', regard: 'La réception de saut sur l’avant-pied, la cheville dans la tige montante', hashtags: ['basket', 'cheville', 'saut', 'reception', 'chaussure-montante'] },
  tennis: { libelle: 'Tennis et padel', regard: 'Les appuis sur l’avant-pied et les déplacements latéraux', hashtags: ['tennis', 'padel', 'appuis', 'avant-pied', 'raquette'] },
  handball: { libelle: 'Handball', regard: 'Le pivot sur l’avant-pied, vu sous la semelle', hashtags: ['handball', 'pivot', 'appuis', 'sport-en-salle'] },
  danse: { libelle: 'Danse', regard: 'La demi-pointe : appui sur les têtes métatarsiennes, talon haut', hashtags: ['danse', 'demi-pointe', 'avant-pied', 'chausson'] },
  cyclisme: { libelle: 'Cyclisme', regard: 'Le pied sur la pédale : cale sous l’avant-pied, manivelle', hashtags: ['cyclisme', 'velo', 'pedale', 'cale'] },
  ski: { libelle: 'Ski', regard: 'La chaussure de ski dans sa fixation, la jambe en appui avant', hashtags: ['ski', 'chaussure-de-ski', 'fixation', 'montagne'] },
  golf: { libelle: 'Golf', regard: 'Les appuis du swing : chaussure à picots posée près de la balle', hashtags: ['golf', 'appuis', 'swing', 'chaussure'] },
};

// ———————————————————————————————————————————————————— Outils

type Poly = P[];
type Affine = [number, number, number, number, number, number];
const r1 = (v: number) => +v.toFixed(1);
const dist = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const inverse = (p: Poly) => [...p].reverse();
const morceaux = (d: string, pas = 0.6) => sousChemins(d, pas).map((s) => s.pts);
const appliquer = (m: Affine, [x, y]: P): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const transf = (pts: Poly, m: Affine) => pts.map((p) => appliquer(m, p));
/** Rotation (degrés, sens horaire à l'écran), échelle `e`, le point `o` envoyé en `t` */
const poser = (o: P, t: P, e: number, angle = 0): Affine => {
  const a = (angle * Math.PI) / 180, c = Math.cos(a) * e, s = Math.sin(a) * e;
  return [c, s, -s, c, t[0] - c * o[0] + s * o[1], t[1] - s * o[0] - c * o[1]];
};
const tourner = (v: P, angle: number): P => { const a = (angle * Math.PI) / 180; return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]; };
const lisseT = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

/** Ellipse échantillonnée (fermée), angle de départ a0 (degrés), rotation `rot` */
function ellipse(cx: number, cy: number, rx: number, ry: number, a0 = 0, n = 48, rot = 0): Poly {
  const c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180);
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = ((a0 + (360 * k) / n) * Math.PI) / 180, u = rx * Math.cos(a), v = ry * Math.sin(a);
    return [cx + u * c - v * s, cy + u * s + v * c] as P;
  });
}
/** Arc de cercle de a1 à a2 (degrés, 0 = droite, sens horaire à l'écran) */
const arc = (cx: number, cy: number, r: number, a1: number, a2: number, n = 24): Poly =>
  Array.from({ length: n + 1 }, (_, k) => { const a = ((a1 + ((a2 - a1) * k) / n) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as P; });
/** Courbe de Bézier quadratique échantillonnée */
const quad = (a: P, b: P, c: P, n = 12): Poly => Array.from({ length: n + 1 }, (_, k) => { const t = k / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]] as P; });
const segment = (a: P, b: P): Poly => [a, b];

/** Ramer–Douglas–Peucker */
function rdp(pts: Poly, tol: number): Poly {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
  let max = 0, k = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = l > 1e-6 ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / l : dist(pts[i], a);
    if (d > max) { max = d; k = i; }
  }
  return max > tol ? [...rdp(pts.slice(0, k + 1), tol).slice(0, -1), ...rdp(pts.slice(k), tol)] : [a, b];
}
/** Tracé SVG lissé (Catmull-Rom → Bézier) d'une polyligne, simplifiée à `tol` près */
export function cheminLisse(pts: Poly, ferme = false, tol = 0.12): string {
  let q = rdp(pts, tol);
  if (ferme && q.length > 2 && dist(q[0], q[q.length - 1]) < 0.5) q = q.slice(0, -1);
  const n = q.length;
  if (n < 2) return '';
  // Catmull-Rom centripète (α = 0,5) : passe par les points, sans dépassement aux angles (crampons, coins de semelle)
  const pt = (i: number): P => (ferme ? q[(i + n) % n] : i < 0 ? [2 * q[0][0] - q[1][0], 2 * q[0][1] - q[1][1]] : i >= n ? [2 * q[n - 1][0] - q[n - 2][0], 2 * q[n - 1][1] - q[n - 2][1]] : q[i]);
  let d = `M${r1(q[0][0])} ${r1(q[0][1])}`;
  for (let i = 0; i < (ferme ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    const d1 = Math.max(1e-4, Math.sqrt(dist(p0, p1))), d2 = Math.max(1e-4, Math.sqrt(dist(p1, p2))), d3 = Math.max(1e-4, Math.sqrt(dist(p2, p3)));
    const b1 = [0, 1].map((k) => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2)));
    const b2 = [0, 1].map((k) => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2)));
    d += `C${r1(b1[0])} ${r1(b1[1])} ${r1(b2[0])} ${r1(b2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return ferme ? `${d}Z` : d;
}

/** Enveloppe convexe */
function enveloppe(points: Poly): Poly {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const bas: Poly = [], haut: Poly = [];
  for (const q of p) { while (bas.length > 1 && x(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
  for (const q of [...p].reverse()) { while (haut.length > 1 && x(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
  return [...bas.slice(0, -1), ...haut.slice(0, -1)];
}
/** Points régulièrement espacés (pas `pas`) le long d'une polyligne fermée */
function reechantillonner(pts: Poly, pas: number, ferme = true): Poly {
  const src = ferme ? [...pts, pts[0]] : pts;
  const out: Poly = [src[0]];
  let reste = 0;
  for (let i = 1; i < src.length; i++) {
    const a = src[i - 1], b = src[i], l = dist(a, b);
    let s = pas - reste;
    while (s <= l) { out.push([a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l]); s += pas; }
    reste = l - (s - pas);
  }
  if (!ferme && dist(out[out.length - 1], src[src.length - 1]) > pas * 0.3) out.push(src[src.length - 1]);
  return out;
}
/** Décalage d'un polygone fermé vers l'extérieur, d'une épaisseur qui peut varier selon le point */
function decaler(pts: Poly, e: (p: P) => number): Poly {
  const aire = pts.reduce((s, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return s + x * v - u * y; }, 0);
  const sens = aire > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, d = e(p);
    return [p[0] + ((sens * ty) / l) * d, p[1] - ((sens * tx) / l) * d] as P;
  });
}
/** Morceaux d'une polyligne où `dedans` est vrai (bords trouvés par dichotomie) */
function garder(pts: Poly, dedans: (p: P) => boolean): Poly[] {
  const bord = (a: P, b: P): P => {
    let u = 0, v = 1;
    for (let k = 0; k < 20; k++) { const m = (u + v) / 2; if (dedans([a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m])) u = m; else v = m; }
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  };
  const runs: Poly[] = [];
  let cur: Poly = [];
  pts.forEach((p, i) => {
    const d = dedans(p);
    if (d && !cur.length && i > 0) cur.push(bord(p, pts[i - 1]));
    if (d) cur.push(p);
    else if (cur.length) { cur.push(bord(pts[i - 1], p)); runs.push(cur); cur = []; }
  });
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length > 1);
}
/** Interpolation linéaire par morceaux de points [x, y] triés par x ; hors de l'intervalle : valeur du bout */
const interpoler = (pts: readonly P[]) => (x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, b] = [pts[i - 1], pts[i]]; return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]); }
  return pts[pts.length - 1][1];
};

// ———————————————————————————————————————————————————— Pied validé (profil médial, pied.ts)

/**
 * Profil médial validé (piedDeProfil, voûte normale) : `peau` = contour ouvert (arrière de la jambe → talon → plante → hallux → dos
 * du pied → avant de la jambe ; la jambe monte à y ≈ −327, hors de tout cadre) ; `points` = tous les points de la peau, de l'hallux
 * et des orteils latéraux (enveloppe de la chaussure) ; sol à y = 62 ; malléole médiale ; MTP de l'hallux.
 */
const PROFIL = (() => {
  const p = piedDeProfil();
  const c = morceaux(p.contour), h = morceaux(p.halluxContour, 0.5)[0];
  const peau = [...inverse(c[2]), ...c[0], ...inverse(h), ...c[1], ...c[3]];
  const points = [p.contour, p.halluxContour, ...p.orteils].flatMap((d) => morceaux(d, 1.5).flat());
  return { peau, points, malleole: morceaux(p.malleole, 0.4)[0], mtp: p.mtp as P, cheville: p.malleoleMediale as P, sol: p.sol };
})();

// ———————————————————————————————————————————————————— Chaussures (enveloppe du pied validé)

type Crampon = { x: number; h: number; l: number; forme: 'cone' | 'vis' | 'dent' | 'picot' };
export interface ModeleChaussure {
  /** Ligne du col (repère du profil, x croissant) : la tige couvre la peau SOUS cette ligne */
  col: readonly P[];
  /** Épaisseur de la tige (u ; 1 cm ≈ 4,85 u), jeu supplémentaire au bout (boîte des orteils) */
  tige?: number;
  bout?: number;
  /** Semelle : épaisseur au talon et à l'avant (u), relevé de la pointe (u), débord au talon et au bout (u) */
  talon: number;
  avant: number;
  releve?: number;
  debord?: [number, number];
  /** Semelle fendue (chausson de danse) : deux patins, talon et avant-pied, au lieu d'une semelle continue */
  fendue?: boolean;
  crampons?: readonly Crampon[];
  /** Laçage le long du cou-de-pied, de x0 à x1 (repère du profil) ; nombre de passants */
  lacage?: { x0: number; x1: number; n: number };
}

export interface Chaussure {
  /** Tige fermée (aplat) */
  tige: Poly;
  /** Bords extérieurs de la tige, du col arrière au talon, puis de la pointe au col avant (trait) */
  arriere: Poly;
  avant: Poly;
  /** Col (de l'arrière vers l'avant) */
  col: Poly;
  /** Semelle(s) fermée(s), crampons compris ; bord extérieur (du talon à la pointe, par-dessous) */
  semelles: Poly[];
  bordSemelle: Poly[];
  /** Ligne de jonction tige / semelle (trait fin) */
  jonction: Poly;
  crampons: Poly[];
  /** Laçage : bord du laçage et lacets (zigzag) */
  lacage: Poly;
  /** Peau visible au-dessus du col : arrière et avant de la jambe */
  jambe: Poly[];
  /** Sol : y du point le plus bas (repère du profil) */
  sol: number;
  /** Bouts de la semelle (x) */
  x0: number;
  x1: number;
}

/** Profil d'un crampon (de gauche à droite, posé sous la semelle en y0) */
function profilCrampon(c: Crampon, y0: number): Poly {
  const { x, h, l } = c;
  if (c.forme === 'picot') return arc(x, y0, l / 2, 180, 0, 10).map(([u, v]) => [u, y0 + (y0 - v) * (h / (l / 2))] as P);
  const bout = c.forme === 'cone' ? 0.45 : c.forme === 'vis' ? 0.78 : 0.62;
  const a: P = [x - l / 2, y0], b: P = [x - (l * bout) / 2, y0 + h], e: P = [x + (l * bout) / 2, y0 + h], f: P = [x + l / 2, y0];
  // Bout arrondi (crampon vissé : bout bombé ; crampon moulé : bout presque plat)
  const bombe = c.forme === 'vis' ? l * 0.18 : l * 0.06;
  return [a, b, ...quad(b, [x, y0 + h + bombe], e, 6).slice(1, -1), e, f];
}

/**
 * Chaussure posée sur le profil validé : enveloppe convexe des points de la peau sous le col, lissée (Chaikin) et élargie de
 * l'épaisseur de la tige (plus au bout : boîte des orteils), coupée au-dessus de la semelle ; semelle(s) dessous, crampons sous la
 * semelle. Tout est dans le repère du profil (sol de la peau à y = 62).
 */
export function chaussure(m: ModeleChaussure): Chaussure {
  const col = interpoler(m.col);
  const sousCol = (p: P) => p[1] >= col(p[0]);
  const ep = m.tige ?? 2.6, bout = m.bout ?? 2.2;
  // Points de la peau sous le col, et intersections du contour avec le col (la tige s'arrête exactement au col)
  const bords = garder(PROFIL.peau, sousCol);
  const pts = [...PROFIL.points.filter(sousCol), ...bords.flat()];
  const env = reechantillonner(chaikin(enveloppe(pts), 3), 1.2);
  const exterieur = decaler(env, ([x, y]) => (y < col(x) + 3 ? ep * 0.8 : ep) + bout * lisseT((x - 98) / 22));
  const DESSUS = 62.6; // dessus de la semelle (le pied repose sur la première de propreté)
  // Tige = enveloppe élargie, coupée au col (au-dessus) et au dessus de la semelle (en dessous) — découpe de Sutherland–Hodgman
  const decoupe = (poly: Poly, dedans: (p: P) => boolean): Poly => {
    const bord = (a: P, b: P): P => {
      let u = 0, v = 1;
      for (let k = 0; k < 24; k++) { const mm = (u + v) / 2; if (dedans([a[0] + (b[0] - a[0]) * mm, a[1] + (b[1] - a[1]) * mm])) u = mm; else v = mm; }
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    };
    const out: Poly = [];
    poly.forEach((q, i) => {
      const pr = poly[(i - 1 + poly.length) % poly.length];
      if (dedans(q)) { if (!dedans(pr)) out.push(bord(q, pr)); out.push(q); } else if (dedans(pr)) out.push(bord(pr, q));
    });
    return out;
  };
  const BAS = DESSUS + (m.fendue ? m.talon : 0); // chausson : la tige souple descend jusqu'au sol entre les patins
  let tige = decoupe(exterieur, (p) => p[1] <= BAS);
  tige = decoupe(tige, (p) => p[1] >= col(p[0]) - 0.02);
  // Le col suit sa ligne (le découpage relie ses bords par une droite) : points intermédiaires sur la ligne du col
  tige = tige.flatMap((a, i) => {
    const b = tige[(i + 1) % tige.length];
    if (Math.abs(a[1] - col(a[0])) > 0.08 || Math.abs(b[1] - col(b[0])) > 0.08 || Math.abs(b[0] - a[0]) < 2) return [a];
    const k = Math.ceil(Math.abs(b[0] - a[0]) / 1.5);
    return Array.from({ length: k }, (_, j) => { const x = a[0] + ((b[0] - a[0]) * j) / k; return [x, col(x)] as P; });
  });
  // Arêtes du col et du bas ; les autres forment les deux bords extérieurs (arrière, avant)
  const surCol = (p: P) => Math.abs(p[1] - col(p[0])) < 0.08, surBas = (p: P) => Math.abs(p[1] - BAS) < 0.08;
  const n = tige.length;
  const special = (i: number) => { const a = tige[i], b = tige[(i + 1) % n]; return (surCol(a) && surCol(b)) || (surBas(a) && surBas(b)); };
  const i0 = Array.from({ length: n }, (_, i) => i).find(special) ?? 0;
  const runs: Poly[] = [];
  let cur: Poly = [];
  const colPts: Poly = [];
  for (let k = 1; k <= n; k++) {
    const i = (i0 + k) % n;
    if (special(i)) { if (cur.length > 1) runs.push(cur); cur = []; const a = tige[i], b = tige[(i + 1) % n]; if (surCol(a) && surCol(b)) colPts.push(a, b); continue; }
    if (!cur.length) cur.push(tige[i]);
    cur.push(tige[(i + 1) % n]);
  }
  if (cur.length > 1) runs.push(cur);
  const moyX = (q: Poly) => q.reduce((s0, p) => s0 + p[0], 0) / q.length;
  runs.sort((u, v) => moyX(u) - moyX(v));
  const haut = (q: Poly) => (q[0][1] < q[q.length - 1][1] ? q : inverse(q));
  const arriere = haut(runs[0] ?? []), avant = inverse(haut(runs[runs.length - 1] ?? []));
  const colPoly = [...colPts].sort((u, v) => u[0] - v[0]);
  const x0 = Math.min(...arriere.map((p) => p[0])) - (m.debord?.[0] ?? 0.6), x1 = Math.max(...avant.map((p) => p[0])) + (m.debord?.[1] ?? 0.8);
  // Semelle(s) : dessus plat, dessous à l'épaisseur talon → avant, pointe relevée, bouts arrondis ; crampons dessous
  const ep2 = interpoler([[x0 + 18, m.talon], [x0 + 0.6 * (x1 - x0), m.avant]]);
  const releve = m.releve ?? 0;
  const dessous = (x: number) => DESSUS + ep2(x) - releve * lisseT((x - (x1 - 26)) / 26) ** 1.5;
  const patins: [number, number][] = m.fendue ? [[x0, x0 + 0.24 * (x1 - x0)], [x0 + 0.64 * (x1 - x0), x1]] : [[x0, x1]];
  const crampons: Poly[] = [];
  const semelles: Poly[] = [], bordSemelle: Poly[] = [];
  for (const [a, b] of patins) {
    const ra = Math.min(ep2(a), 4) * 0.9, rb = Math.min(dessous(b) - DESSUS, 4) * 0.9;
    const bas: Poly = [];
    for (let x = a + ra; x <= b - rb + 0.01; x += 0.8) bas.push([x, dessous(x)]);
    // Crampons : chaque crampon remplace le bas de la semelle sur sa largeur
    const avecCrampons: Poly = [];
    const cr = (m.crampons ?? []).filter((c) => c.x - c.l / 2 > a + ra && c.x + c.l / 2 < b - rb).sort((u, v) => u.x - v.x);
    let k = 0;
    for (const q of bas) {
      while (k < cr.length && q[0] > cr[k].x + cr[k].l / 2) k++;
      const c = cr[k];
      if (c && q[0] >= c.x - c.l / 2 && q[0] <= c.x + c.l / 2) {
        if (!avecCrampons.some((p) => p[0] === c.x - c.l / 2)) {
          const prof = profilCrampon(c, dessous(c.x));
          avecCrampons.push(...prof);
          crampons.push([...prof, prof[0]]);
        }
        continue;
      }
      avecCrampons.push(q);
    }
    const yA = dessous(a + ra), yB = dessous(b - rb);
    const talon = quad([a, DESSUS], [a - ra * 0.35, yA], [a + ra, yA], 8);
    const pointe = quad([b - rb, yB], [b + rb * 0.45, yB], [b, DESSUS], 8);
    const bord = [...talon, ...avecCrampons, ...pointe];
    bordSemelle.push(bord);
    semelles.push([...bord, [a, DESSUS]]);
  }
  const sol = Math.max(...semelles.flat().map((p) => p[1]));
  // Laçage : bord du laçage parallèle au cou-de-pied (4 u sous le haut de la tige), lacets en zigzag vers le bord
  let lacage: Poly = [];
  if (m.lacage) {
    const { x0: la, x1: lb, n } = m.lacage;
    const dos = avant.filter(([x]) => x >= la && x <= lb).sort((u, v) => u[0] - v[0]);
    if (dos.length > 2) {
      const yDos = interpoler(dos);
      const pas = (lb - la) / n;
      for (let i = 0; i <= n; i++) {
        const x = la + i * pas;
        lacage.push([x + 1.2, yDos(x + 1.2) + 1.2], [x + pas * 0.35, yDos(x + pas * 0.35) + 4.6]);
      }
      lacage = lacage.filter(([x]) => x <= lb);
    }
  }
  const jambe = garder(PROFIL.peau, (p) => !sousCol(p));
  return { tige: [...tige, tige[0]], arriere, avant, col: colPoly, semelles, bordSemelle, jonction: m.fendue ? [] : reechantillonner(segment([x0 + 1, DESSUS], [x1 - 1, DESSUS]), 2, false), crampons, lacage, jambe, sol, x0, x1 };
}

// ———————————————————————————————————————————————————— Modèles de chaussures (repère du profil : sol 62, cheville ≈ (33 ; 26))

/** Col sous la malléole (chaussure basse) : il descend sous la malléole médiale et remonte vers la languette */
const COL_BAS: P[] = [[-12, 33], [8, 33.5], [20, 36], [32, 35.5], [42, 28], [48, 21], [54, 17], [60, 14]];
/** Col montant (basket, randonnée) : au-dessus des malléoles */
const COL_MONTANT: P[] = [[-14, 8], [10, 8.5], [30, 9], [44, 5], [56, -2]];
export const CHAUSSURES = {
  /** Course : semelle intermédiaire épaisse au talon (drop ≈ 8 mm), pointe relevée, laçage */
  course: { col: COL_BAS, talon: 8.5, avant: 5, releve: 2.2, lacage: { x0: 54, x1: 84, n: 4 } },
  /** Trail : même base, crampons de trail (dents basses, ≈ 5 mm), semelle un peu plus ferme */
  trail: {
    col: COL_BAS, talon: 8, avant: 5.5, releve: 2, lacage: { x0: 54, x1: 84, n: 4 },
    crampons: [6, 15, 24, 33, 42, 51, 60, 69, 78, 87, 96, 105, 114].map((x) => ({ x, h: 2.4, l: 5.4, forme: 'dent' as const })),
  },
  /** Randonnée : tige montante au-dessus des malléoles, semelle épaisse crantée, talon marqué */
  randonnee: {
    col: COL_MONTANT, tige: 3.2, talon: 7, avant: 5.5, releve: 2.6, lacage: { x0: 44, x1: 84, n: 6 },
    crampons: [4, 14, 24, 52, 63, 74, 85, 96, 107].map((x) => ({ x, h: 2.8, l: 6.5, forme: 'dent' as const })),
  },
  /**
   * Football (terrain sec, crampons moulés) : semelle-plaque fine ; crampons coniques ≈ 11 mm, nombreux : 2 visibles au talon, 4 à
   * l'avant-pied le long du bord interne (le profil médial n'en montre qu'une rangée).
   */
  football: {
    col: COL_BAS, talon: 3, avant: 2.2, releve: 1.2, lacage: { x0: 52, x1: 82, n: 4 },
    crampons: [[6, 5], [22, 5], [72, 5.2], [87, 5.2], [101, 5], [114, 4.6]].map(([x, h]) => ({ x, h, l: 5.4, forme: 'cone' as const })),
  },
  /**
   * Rugby (crampons vissés, 6 ou 8) : crampons longs (≈ 18 mm) à bout bombé, peu nombreux — 1 visible au talon, 2 à l'avant-pied ;
   * tige un peu plus haute et renforcée.
   */
  rugby: {
    col: [[-12, 29], [8, 29.5], [20, 32], [32, 31.5], [42, 25], [50, 17], [58, 12]] as P[], tige: 3, talon: 3.4, avant: 2.6, releve: 1.2, lacage: { x0: 50, x1: 84, n: 5 },
    crampons: [[12, 8.5], [78, 8.5], [104, 8]].map(([x, h]) => ({ x, h, l: 7.5, forme: 'vis' as const })),
  },
  /** Basket : tige montante (maintien de la cheville), semelle « cuvette » épaisse et plate, faible drop */
  basket: { col: COL_MONTANT, tige: 3.4, talon: 7, avant: 6, releve: 1.6, lacage: { x0: 44, x1: 84, n: 6 } },
  /** Tennis, padel : chaussure basse de court, semelle plate et large, renfort de pointe (frottement) */
  tennis: { col: COL_BAS, tige: 2.8, talon: 6, avant: 4.8, releve: 1.4, lacage: { x0: 54, x1: 84, n: 4 } },
  /** Golf : chaussure basse, semelle plate à picots courts */
  golf: {
    col: COL_BAS, tige: 2.8, talon: 5.4, avant: 4.4, releve: 1.2, lacage: { x0: 54, x1: 84, n: 4 },
    crampons: [8, 22, 66, 80, 94, 108].map((x) => ({ x, h: 1.6, l: 4.2, forme: 'picot' as const })),
  },
  /** Cyclisme (route) : chaussure basse rigide, semelle fine et plate, sans relevé ; serrage par brides */
  cyclisme: { col: COL_BAS, tige: 2.6, talon: 3.4, avant: 3, releve: 0.4 },
  /** Ski : coque rigide montant à mi-jambe, semelle plate avec débords (butée, talonnière) */
  ski: { col: [[-14, -42], [20, -42], [50, -44]] as P[], tige: 5.2, bout: 3.6, talon: 6.5, avant: 6.5, releve: 0, debord: [5, 6] as [number, number] },
  /** Danse : chausson souple (tige fine, col bas qui découvre le cou-de-pied), semelle fendue (patins talon et avant-pied) */
  danse: { col: [[-12, 45], [10, 45], [30, 41], [50, 38], [66, 36.5], [78, 35.5], [88, 35]] as P[], tige: 1.3, bout: 0.6, talon: 1.2, avant: 1.2, releve: 0, fendue: true, debord: [0.2, 0.3] as [number, number] },
} satisfies Record<string, ModeleChaussure>;

// ———————————————————————————————————————————————————— Poses (toutes les pièces subissent la même déformation)

type Piece = Poly[];
const transformer = (pieces: Record<string, Piece>, f: (p: Poly) => Poly): Record<string, Piece> =>
  Object.fromEntries(Object.entries(pieces).map(([k, v]) => [k, v.map(f)]));

/** Pied chaussé (ou nu) prêt à poser : pièces dans le repère du profil */
function piedChausse(m: ModeleChaussure | null): { pieces: Record<string, Piece>; sol: number; x0: number; x1: number } {
  if (!m) return { pieces: { peau: [PROFIL.peau], malleole: [PROFIL.malleole] }, sol: PROFIL.sol, x0: -2.3, x1: 124.3 };
  const c = chaussure(m);
  return {
    pieces: {
      peau: [PROFIL.peau], jambe: c.jambe, tige: [c.tige], arriere: [c.arriere], avant: [c.avant], col: [c.col], semelles: c.semelles,
      bordSemelle: c.bordSemelle, jonction: [c.jonction], crampons: c.crampons, lacage: c.lacage.length ? [c.lacage] : [],
    },
    sol: c.sol, x0: c.x0, x1: c.x1,
  };
}

const HAUT: P = [0, -1];
/** Longueur cheville → genou (repère du profil : ≈ 1,65 × la longueur du pied, proportions de Winter) */
const JAMBE_L = 205;

/**
 * Pose « talon levé » : rotation de tout ce qui est en arrière de la MTP autour du point d'appui de l'avant-pied (sous la semelle),
 * puis cheville (pliée de `cheville` degrés, positif = jambe vers l'avant) et genou (`genou` degrés).
 */
function poseTalonLeve(pieces: Record<string, Piece>, sol: number, talon: number, cheville: number, genou = 0): Record<string, Piece> {
  // Ordre : la jambe se plie d'abord sur le pied à plat (axe vertical : l'avant-pied, sous la cheville, n'est jamais emporté), puis
  // tout ce qui est en arrière de la MTP tourne autour de l'appui de l'avant-pied (les orteils restent à plat au sol)
  let q = pieces;
  const ch = PROFIL.cheville;
  if (cheville) q = transformer(q, (p) => plier(p, ch, HAUT, cheville));
  if (genou) {
    const axe2 = tourner(HAUT, cheville);
    const g: P = [ch[0] + axe2[0] * JAMBE_L, ch[1] + axe2[1] * JAMBE_L];
    q = transformer(q, (p) => plier(p, g, axe2, genou, 20));
  }
  const pivot: P = [PROFIL.mtp[0], sol];
  return transformer(q, (p) => leverTalon(p, pivot, talon));
}

/** Placement dans le cadre 240 × 180 : échelle `k`, le talon (x0, sol) posé en `en`, rotation `angle` autour de ce point */
function placer(pieces: Record<string, Piece>, k: number, origine: P, en: P, angle = 0): Record<string, Piece> {
  const m = poser(origine, en, k, angle);
  return transformer(pieces, (p) => transf(p, m));
}

// ———————————————————————————————————————————————————— Accessoires (repère du cadre)

/** Ballon de football : cercle, pentagone central et coutures vers le bord */
function ballonFoot(cx: number, cy: number, r: number, rot = -8): { contour: Poly; coutures: Poly[] } {
  const pent = Array.from({ length: 6 }, (_, k) => { const a = ((rot - 90 + k * 72) * Math.PI) / 180; return [cx + r * 0.36 * Math.cos(a), cy + r * 0.36 * Math.sin(a)] as P; });
  const rayons = pent.slice(0, 5).map((p) => { const u: P = [(p[0] - cx) / (r * 0.36), (p[1] - cy) / (r * 0.36)]; return segment(p, [cx + u[0] * r * 0.72, cy + u[1] * r * 0.72]); });
  // Arcs des hexagones voisins, au bord (entre deux rayons)
  const arcs = Array.from({ length: 5 }, (_, k) => {
    const a = rot - 90 + 36 + k * 72;
    return arc(cx, cy, r * 0.86, a - 20, a + 20, 6);
  });
  return { contour: ellipse(cx, cy, r, r, 0, 64), coutures: [pent, ...rayons, ...arcs] };
}
/** Ballon de rugby : ellipse (≈ 28 × 18 cm), couture le long du grand axe et lacets */
function ballonRugby(cx: number, cy: number, l: number, rot = -10): { contour: Poly; coutures: Poly[] } {
  const rx = l / 2, ry = rx * 0.64;
  const m = poser([0, 0], [cx, cy], 1, rot);
  const couture = transf(Array.from({ length: 21 }, (_, k) => { const t = -0.8 + (1.6 * k) / 20; return [rx * t, -ry * 0.18 * (1 - t * t) - ry * 0.25 * Math.sqrt(Math.max(0, 1 - t * t)) * 0.0] as P; }), m);
  const lacets = [-0.2, -0.07, 0.06, 0.19].map((t) => transf(segment([rx * t - 1.2, -ry * 0.32], [rx * t + 1.2, -ry * 0.04]), m));
  return { contour: transf(ellipse(0, 0, rx, ry, 0, 64), m), coutures: [couture, ...lacets] };
}
/** Ballon de basket : cercle, deux grands méridiens et deux arcs latéraux */
function ballonBasket(cx: number, cy: number, r: number): { contour: Poly; coutures: Poly[] } {
  // Coutures dans l'ordre du trait continu (chaque couture part près de la fin de la précédente) : méridien (du bas vers le haut),
  // arc gauche (du haut vers le bas), équateur (de gauche à droite), arc droit (du bas vers le haut)
  const m = poser([0, 0], [cx, cy], 1, 0);
  const vertical = transf(quad([0, r], [r * 0.14, 0], [0, -r], 16), m);
  const g = transf(quad([-r * 0.62, -r * 0.78], [-r * 0.08, 0], [-r * 0.62, r * 0.78], 16), m);
  const horizontal = transf(quad([-r, 0], [0, r * 0.2], [r, 0], 16), m);
  const d = transf(quad([r * 0.62, r * 0.78], [r * 0.08, 0], [r * 0.62, -r * 0.78], 16), m);
  return { contour: ellipse(cx, cy, r, r, 0, 64), coutures: [vertical, g, horizontal, d] };
}
/** Balle de tennis : cercle et couture en S (deux arcs opposés) */
function balleTennis(cx: number, cy: number, r: number, rot = -25): { contour: Poly; coutures: Poly[] } {
  const m = poser([0, 0], [cx, cy], 1, rot);
  const s = transf([...arc(-r * 1.05, 0, r * 0.62, -62, 62, 12), ...arc(r * 1.05, 0, r * 0.62, 242, 118, 12)], m);
  return { contour: ellipse(cx, cy, r, r, 0, 48), coutures: [s] };
}
/** Balle de golf sur son tee : cercle, quelques alvéoles (petits arcs), tee (coupelle et tige effilée plantée dans le sol) */
function balleGolf(cx: number, sol: number, r: number): { contour: Poly; coutures: Poly[]; tee: Poly } {
  const cy = sol - 9 - r;
  // Pas d'alvéoles dessinées : quelques petits arcs dans un rond se lisent comme un visage (piège « pas de visage »)
  const alv: Poly[] = [];
  const tee: Poly = [[cx - r * 0.55, cy + r * 0.92], [cx - 1.1, sol - 7], [cx - 0.9, sol + 3], [cx, sol + 5.5], [cx + 0.9, sol + 3], [cx + 1.1, sol - 7], [cx + r * 0.55, cy + r * 0.92]];
  return { contour: ellipse(cx, cy, r, r, 90, 48), coutures: alv, tee };
}
/** Crampons en traits courts (picto : un crampon de 1 mm à 24 px ne se verrait pas) : du dessous de la semelle vers le sol */
const tiretsCrampons = (crampons: Poly[], l = 7): Poly[] =>
  crampons.map((c) => { const x = c.reduce((s0, p) => s0 + p[0], 0) / c.length, y = Math.min(...c.map((p) => p[1])); return segment([x, y + 1], [x, y + l]); });
/** Lignes de mouvement (traits courts parallèles) */
const vitesse = (x: number, y: number, l: number, ecart: number, n = 2, angle = 0): Poly[] =>
  Array.from({ length: n }, (_, k) => { const o = tourner([0, k * ecart], angle), d = tourner([l * (1 - k * 0.3), 0], angle); return segment([x + o[0], y + o[1]], [x + o[0] + d[0], y + o[1] + d[1]]); });

// ———————————————————————————————————————————————————— Scènes

/** Une scène : pièces posées dans le cadre ; rôle de chaque pièce pour les deux registres */
interface Scene {
  /** Peau (jambe, pied nu) : aplat de peau + contour */
  peau: Poly[];
  /** Contour de peau visible (registre pédagogique) */
  peauTrait: Poly[];
  /** Objets (tige, ballon…) : aplat clair + contour */
  objets: Poly[];
  /** Objets d'appui (semelle, coque) : aplat plus soutenu */
  coques: Poly[];
  /** Zone d'intérêt sur l'objet ou le sol (jamais sur la peau) : aplat d'accent */
  accent: Poly[];
  /** Détails fins (coutures, lacets, jonction) */
  details: Poly[];
  /** Sol */
  sol: Poly[];
  /** Registre « ligne » : 3 traits au plus, chacun = morceaux enchaînés dans l'ordre */
  traits: Poly[][];
  /** Picto (pictos.ts) : région carrée du cadre [x, y, côté] recadrée sur la grille 48, traits en plus du pied chaussé, détail à l'accent */
  picto?: { region: [number, number, number]; accent: Poly[]; plus?: Poly[]; sansPied?: boolean; sansSol?: boolean;
    /** Objet à l'accent agrandi (ballon : à 24 px, un ballon à l'échelle n'est qu'un point), depuis son coin bas-gauche ; cadrage sur la chaussure seule */
    loupe?: number; cadreChaussure?: boolean };
}

const SOL_Y = 156;

/** Contour fermé repris depuis son point le plus bas (le trait du sol y entre et en fait le tour) */
const depuisLeBas = (c: Poly): Poly => {
  const q = dist(c[0], c[c.length - 1]) < 0.5 ? c.slice(0, -1) : c;
  const k = q.reduce((b, p, i) => (p[1] > q[b][1] ? i : b), 0);
  return [...q.slice(k), ...q.slice(0, k + 1)];
};
const sol = (x0: number, x1: number, y = SOL_Y): Poly => segment([x0, y], [x1, y]);
const plat = (y: number) => () => y;
/**
 * Sol au trait continu, de x0 vers x1 (hauteur y(x)) : une pierre est une bosse du même trait ; un ballon (le dernier objet) est
 * parcouru d'un tour depuis son point de contact, puis ses coutures — le trait finit dans le ballon (aucun aller-retour).
 */
function solLigne(y: (x: number) => number, x0: number, x1: number, o: { bosses?: Poly[]; ballon?: { contour: Poly; coutures: Poly[] } } = {}): Poly[] {
  const morceaux: Poly[] = [];
  let x = x0;
  const bout = (a: number, b: number): Poly => { const n = Math.max(2, Math.ceil(Math.abs(b - a) / 6)); return Array.from({ length: n + 1 }, (_, k) => { const u = a + ((b - a) * k) / n; return [u, y(u)] as P; }); };
  for (const b of [...(o.bosses ?? [])].sort((u, v) => u[0][0] - v[0][0])) {
    const g = b[0][0] < b[b.length - 1][0] ? b : inverse(b);
    morceaux.push(bout(x, g[0][0]), g);
    x = g[g.length - 1][0];
  }
  if (o.ballon) {
    const c = depuisLeBas(o.ballon.contour);
    morceaux.push(bout(x, c[0][0]), c, ...o.ballon.coutures);
  } else morceaux.push(bout(x, x1));
  return morceaux;
}

/** Bord visible d'une pierre posée (moitié haute d'une ellipse), de gauche à droite */
const pierre = (cx: number, y: (x: number) => number, rx: number, ry: number, rot = 0): Poly =>
  ellipse(cx, y(cx) - ry * 0.55, rx, ry, 180, 32, rot).slice(0, 17).filter(([u, v]) => v <= y(u) + 0.3);

/**
 * Pied chaussé posé → scène de base. Trait continu, en deux traits pour le pied : (1) arrière de la jambe → bord arrière de la tige →
 * semelle (crampons compris) → bord avant de la tige → col (de l'avant vers l'arrière) ; (2) avant de la jambe → laçage. La peau
 * visible est la jambe au-dessus du col ; le reste du pied est dans la chaussure.
 */
function sceneChaussee(p: Record<string, Piece>, accent: Poly[]): Scene {
  const [jArr, jAv] = [p.jambe?.[0] ?? [], p.jambe?.[1] ?? []];
  const col = p.col?.[0] ?? [];
  return {
    peau: p.peau, peauTrait: p.jambe ?? [], objets: p.tige, coques: p.semelles, accent, details: [...(p.lacage ?? []), ...(p.jonction ?? [])], sol: [],
    traits: [
      [jArr, ...(p.arriere ?? []), ...(p.bordSemelle ?? []), ...(p.avant ?? []), inverse(col)].filter((q) => q.length > 1),
      [inverse(jAv), ...(p.lacage ?? [])].filter((q) => q.length > 1),
    ],
  };
}

/** Scène de chaque sport (repère 240 × 180) */
function scene(sport: Sport): Scene {
  switch (sport) {
    case 'course': {
      // Fin d'appui (décollement des orteils) d'après la cinématique validée du coureur (foulee.ts, Novacheck 1998, p = 0,33) :
      // pied à ≈ 32° du sol, jambe à ≈ 36° vers l'avant, genou fléchi ≈ 21° ; lignes de vitesse derrière le talon (pédagogique)
      const c = piedChausse(CHAUSSURES.course);
      const j = poseCoureur(0.33, 100).droite;
      const deg = (a: number) => (a * 180) / Math.PI;
      const pied = deg(Math.atan2(j.mtp.y - j.talon.y, j.mtp.x - j.talon.x));
      const tibia = deg(Math.atan2(j.genou.x - j.cheville.x, j.cheville.y - j.genou.y));
      const cuisse = deg(Math.atan2(j.hanche.x - j.genou.x, j.genou.y - j.hanche.y));
      const q = placer(poseTalonLeve(c.pieces, c.sol, pied, tibia - pied, cuisse - tibia), 0.62, [PROFIL.mtp[0], c.sol], [150, SOL_Y]);
      const s = sceneChaussee(q, q.semelles);
      s.sol = [sol(16, 226)];
      s.details.push(...vitesse(30, 112, 26, 9, 3));
      s.traits.push(solLigne(plat(SOL_Y), 16, 226));
      s.picto = { region: [0, 0, 0], accent: vitesse(90, 104, 16, 9, 3) };
      return s;
    }
    case 'trail': {
      // Descente : chaussure posée à plat sur une pente de 12°, la jambe reste verticale (la cheville s'adapte) ; pierres sur le sentier
      const c = piedChausse(CHAUSSURES.trail);
      const pente = 12, k = 0.6;
      const plie = transformer(c.pieces, (p) => plier(p, PROFIL.cheville, HAUT, -pente));
      const q = placer(plie, k, [40, c.sol], [100, 112], pente);
      const t = Math.tan((pente * Math.PI) / 180);
      const y = (x: number) => 112 + (x - 100) * t + 0.3;
      const pierres = [pierre(34, y, 8, 4.2, pente), pierre(204, y, 6, 3.2, pente)];
      const s = sceneChaussee(q, q.crampons);
      s.sol = [segment([-4, y(-4)], [244, y(244)])];
      s.objets.push(...pierres.map((p) => [...p, p[0]]));
      s.traits.push(solLigne(y, -4, 244, { bosses: pierres }));
      s.picto = { region: [0, 0, 0], accent: tiretsCrampons(q.crampons, 5) };
      return s;
    }
    case 'randonnee': {
      // Chaussure montante posée à plat sur un sentier ; tige au-dessus des malléoles (accent : le maintien de la cheville)
      const c = piedChausse(CHAUSSURES.randonnee);
      const k = 0.66, m = poser([c.x0, c.sol], [58, SOL_Y], k);
      const q = placer(c.pieces, k, [c.x0, c.sol], [58, SOL_Y]);
      const yMall = appliquer(m, [0, 34])[1];
      const s = sceneChaussee(q, [q.tige[0].filter(([, v]) => v < yMall)]);
      const pierres = [pierre(200, plat(SOL_Y), 10, 5)];
      s.sol = [sol(14, 228)];
      s.objets.push(...pierres.map((p) => [...p, p[0]]));
      s.traits.push(solLigne(plat(SOL_Y), 14, 228, { bosses: pierres }));
      s.picto = { region: [0, 0, 0], accent: tiretsCrampons(q.crampons, 6) };
      return s;
    }
    case 'football': {
      // Pied d'appui planté à plat, crampons moulés ; le ballon posé à côté, devant la pointe
      const c = piedChausse(CHAUSSURES.football);
      const k = 0.68, m = poser([c.x0, c.sol], [30, SOL_Y], k);
      const q = placer(c.pieces, k, [c.x0, c.sol], [30, SOL_Y]);
      const b = ballonFoot(appliquer(m, [c.x1, 0])[0] + 34, SOL_Y - 27, 27);
      const s = sceneChaussee(q, q.crampons);
      s.sol = [sol(10, 232)];
      s.objets.push(b.contour);
      s.details.push(...b.coutures);
      s.traits.push(solLigne(plat(SOL_Y), 10, 232, { ballon: b }));
      s.picto = { region: [0, 0, 0], accent: [b.contour, b.coutures[0]], plus: tiretsCrampons(q.crampons, 9), loupe: 1.3 };
      return s;
    }
    case 'rugby': {
      // Appui à plat, crampons vissés (longs, peu nombreux) ; ballon ovale couché devant
      const c = piedChausse(CHAUSSURES.rugby);
      const k = 0.66, m = poser([c.x0, c.sol], [26, SOL_Y], k);
      const q = placer(c.pieces, k, [c.x0, c.sol], [26, SOL_Y]);
      const b = ballonRugby(appliquer(m, [c.x1, 0])[0] + 40, SOL_Y - 20, 64, -4);
      const s = sceneChaussee(q, q.crampons);
      s.sol = [sol(10, 232)];
      s.objets.push(b.contour);
      s.details.push(...b.coutures);
      s.traits.push(solLigne(plat(SOL_Y), 10, 232, { ballon: b }));
      s.picto = { region: [0, 0, 0], accent: [b.contour], plus: tiretsCrampons(q.crampons, 12), loupe: 1.2 };
      return s;
    }
    case 'basket': {
      // Réception de saut : l'avant-pied touche le sol en premier, talon encore levé (≈ 16°), jambe presque verticale ; tige
      // montante (accent : le maintien de la cheville) ; lignes de mouvement verticales derrière le talon (pédagogique) ; ballon au sol
      const c = piedChausse(CHAUSSURES.basket);
      const q = placer(poseTalonLeve(c.pieces, c.sol, 16, -10, 0), 0.6, [PROFIL.mtp[0], c.sol], [112, SOL_Y]);
      const b = ballonBasket(194, SOL_Y - 31, 31);
      const yHaut = Math.min(...q.tige[0].map(([, y]) => y)) + 24;
      const s = sceneChaussee(q, [q.tige[0].filter(([, y]) => y < yHaut)]);
      s.sol = [sol(12, 230)];
      s.objets.push(b.contour);
      s.details.push(...b.coutures, ...vitesse(30, 70, 22, 8, 3, 90));
      s.traits.push(solLigne(plat(SOL_Y), 12, 230, { ballon: b }));
      s.picto = { region: [0, 0, 0], accent: [b.contour, ...b.coutures] };
      return s;
    }
    case 'tennis': {
      // Appui sur l'avant-pied (talon levé ≈ 26°, jambe inclinée), lignes de déplacement derrière (pédagogique) ; balle au sol.
      // Accent : le dessous de l'avant-pied (zone d'appui et de frottement de la semelle)
      const c = piedChausse(CHAUSSURES.tennis);
      const k = 0.62;
      const q = placer(poseTalonLeve(c.pieces, c.sol, 26, 2, -6), k, [PROFIL.mtp[0], c.sol], [140, SOL_Y]);
      const b = balleTennis(208, SOL_Y - 10, 10);
      const xMtp = appliquer(poser([PROFIL.mtp[0], c.sol], [140, SOL_Y], k), [PROFIL.mtp[0] - 16, 0])[0];
      const s = sceneChaussee(q, q.semelles.map((p) => p.filter(([x]) => x >= xMtp)));
      s.sol = [sol(12, 230)];
      s.objets.push(b.contour);
      s.details.push(...b.coutures, ...vitesse(24, 124, 24, 8, 3));
      s.traits.push(solLigne(plat(SOL_Y), 12, 230, { ballon: b }));
      s.picto = { region: [0, 0, 0], accent: [b.contour, ...b.coutures], loupe: 1.8 };
      return s;
    }
    case 'handball': {
      // Pivot vu sous la semelle (pied droit vu de dessous, hallux à droite) : semelle extérieure = semelle validée élargie ;
      // pastille de pivot sous la 1re tête métatarsienne ; arc de rotation autour d'elle, côté talon ; rainures au talon
      const k = 0.62, rot = -64;
      const m: Affine = (() => { const a = poser([48, 111], [118, 92], k, rot); return [-a[0], -a[1], a[2], a[3], a[4] + 2 * a[0] * 48, a[5] + 2 * a[1] * 48] as Affine; })();
      const semelle = transf(reechantillonner(decaler(reechantillonner(SEMELLE_POINTS, 2), () => 6), 1.5), m);
      const pivot = appliquer(m, [CONTOUR_PIED.mtp[0][0] + 2, CONTOUR_PIED.mtp[0][1] + 4]);
      const anneau = ellipse(pivot[0], pivot[1], 9, 9, 0, 40), coeur = ellipse(pivot[0], pivot[1], 4, 4, 0, 24);
      const talon = appliquer(m, [48, 214]);
      const rr = dist(pivot, talon) + 12, a0 = (Math.atan2(talon[1] - pivot[1], talon[0] - pivot[0]) * 180) / Math.PI;
      const fleche = arc(pivot[0], pivot[1], rr, a0 - 16, a0 + 22, 20);
      const fin = fleche[fleche.length - 1], av = fleche[fleche.length - 3];
      const t = Math.atan2(fin[1] - av[1], fin[0] - av[0]);
      const pointe: Poly = [[fin[0] + 7 * Math.cos(t + 2.6), fin[1] + 7 * Math.sin(t + 2.6)], fin, [fin[0] + 7 * Math.cos(t - 2.6), fin[1] + 7 * Math.sin(t - 2.6)]];
      const rainures = [178, 192, 204].map((y) => transf(quad([30, y + 3], [48, y - 3], [66, y + 3], 8), m));
      const ferme = [...semelle, semelle[0]];
      return {
        peau: [], peauTrait: [], objets: [], coques: [ferme], accent: [anneau], details: [coeur, ...rainures, fleche, pointe], sol: [],
        traits: [[depuisLeBas(ferme)], [anneau, coeur], [fleche, pointe]],
        picto: { region: [0, 0, 0], accent: [anneau, fleche, pointe], plus: [ferme], sansPied: true },
      };
    }
    case 'danse': {
      // Demi-pointe (relevé) : appui sur les têtes métatarsiennes, orteils à plat, talon haut (pied ≈ 52°), jambe verticale (la
      // cheville est en flexion plantaire) ; chausson souple à semelle fendue (patin de l'avant-pied au sol : accent)
      const c = piedChausse(CHAUSSURES.danse);
      const q = placer(poseTalonLeve(c.pieces, c.sol, 42, -42, 0), 0.72, [PROFIL.mtp[0], c.sol], [128, SOL_Y]);
      const s = sceneChaussee(q, [q.semelles[1] ?? []]);
      s.sol = [sol(30, 210)];
      s.traits.push(solLigne(plat(SOL_Y), 30, 210));
      s.picto = { region: [0, 0, 0], accent: [q.bordSemelle[1] ?? []] };
      return s;
    }
    case 'cyclisme': {
      // Pied sur la pédale, manivelle vers l'avant (≈ 3 h) : cale sous l'avant-pied (axe de la pédale sous la 1re tête
      // métatarsienne), manivelle (≈ 17 cm) jusqu'à l'axe du pédalier, plateau (≈ 10 cm de rayon) caché en partie par la chaussure ;
      // jambe presque verticale. La manivelle est du côté latéral : en vue médiale, elle passe derrière la pédale.
      const c = piedChausse(CHAUSSURES.cyclisme);
      const k = 0.58, xAxe = PROFIL.mtp[0] - 4, yP = 120;
      const q = placer(poseTalonLeve(c.pieces, c.sol, -4, 8, 0), k, [xAxe, c.sol], [158, yP]);
      const axe: P = [158, yP + 6.5];
      const cale: Poly = [[axe[0] - 9, yP - 0.4], [axe[0] - 7, axe[1] - 3.2], [axe[0] + 7, axe[1] - 3.2], [axe[0] + 9.5, yP - 0.4], [axe[0] - 9, yP - 0.4]];
      const pedale: Poly = [[axe[0] - 13, axe[1] - 3], [axe[0] + 13, axe[1] - 3], ...quad([axe[0] + 13, axe[1] - 3], [axe[0] + 16, axe[1]], [axe[0] + 13, axe[1] + 3], 6).slice(1), [axe[0] - 13, axe[1] + 3], ...quad([axe[0] - 13, axe[1] + 3], [axe[0] - 16, axe[1]], [axe[0] - 13, axe[1] - 3], 6).slice(1)];
      const centre: P = [axe[0] - 82 * k, axe[1] + 1];
      const manivelle: Poly = [[axe[0] - 13, axe[1] - 2.2], [centre[0] + 1, centre[1] - 4.2], ...arc(centre[0], centre[1], 4.6, -66, 246, 18), [centre[0] + 1, centre[1] + 4.2], [axe[0] - 13, axe[1] + 2.2]];
      // Plateau : cercle (les dents se devinent par un second cercle) ; on ne garde que la partie qui n'est pas derrière la chaussure
      const dessousSemelle = Math.max(...q.semelles.flat().map(([, y]) => y)), xTalon = Math.min(...q.semelles.flat().map(([x]) => x));
      const visible = (p: P) => !(p[1] < dessousSemelle + 1 && p[0] > xTalon - 2);
      const plateaux = [51, 46].map((r) => garder(ellipse(centre[0], centre[1], r * k, r * k, 0, 96), visible).sort((u, v) => v.length - u.length)[0] ?? []);
      const s = sceneChaussee(q, [cale]);
      s.objets.unshift(...plateaux.length ? [] : []);
      s.details.unshift(...plateaux);
      s.objets.push(manivelle, pedale);
      s.coques.push(cale);
      s.traits.push([plateaux[0], manivelle, pedale]);
      s.picto = { region: [0, 0, 0], accent: [pedale], plus: [plateaux[0], manivelle] };
      return s;
    }
    case 'ski': {
      // Chaussure de ski (coque montant à mi-jambe, jambe en appui avant ≈ 14°) serrée dans sa fixation : talonnière à l'arrière,
      // butée à l'avant ; le ski sort du cadre à gauche, sa spatule se relève à droite ; accent : la semelle intérieure dans la coque
      const c = piedChausse(CHAUSSURES.ski);
      const k = 0.5, en: P = [70, 140], m = poser([c.x0, c.sol], en, k);
      const q = placer(transformer(c.pieces, (p) => plier(p, PROFIL.cheville, HAUT, 14)), k, [c.x0, c.sol], en);
      const [xa, xb] = [c.x0, c.x1].map((x) => appliquer(m, [x, 0])[0]);
      const yB = en[1], yS = yB + 4;
      const talonniere: Poly = [[xa - 18, yS], [xa - 18, yB - 2], ...quad([xa - 16, yB - 6], [xa - 6, yB - 10], [xa + 3, yB - 6.5], 6)];
      const butee: Poly = [...quad([xb - 3, yB - 6], [xb + 6, yB - 9], [xb + 12, yB - 3], 6), [xb + 13, yS]];
      const spatule = (y0: number, dy: number) => quad([206, y0], [228, y0], [234 - dy, yS - 15 + dy], 12).slice(1);
      const dessusSki: Poly = [[-8, yS], [206, yS], ...spatule(yS, 0)];
      const dessousSki: Poly = [[-8, yS + 3.4], [204, yS + 3.4], ...spatule(yS + 3.4, 2.5)];
      const premiere = transf([[6, 61], [30, 61.5], [60, 61.5], [90, 61.6], [112, 61]], m);
      const s = sceneChaussee(q, [[...premiere, ...inverse(premiere).map(([x, y]) => [x, y - 2.4] as P)]]);
      s.objets.push([...dessusSki, ...inverse(dessousSki)], [...talonniere, [xa + 3, yS], talonniere[0]], [[xb - 3, yS], ...butee, [xb - 3, yS]]);
      s.sol = [segment([-4, yS + 6], [244, yS + 6])];
      // Jonction du collier et de la coque basse (la coque s'ouvre à la cheville), trait fin
      const plieDetail = (pts: Poly) => transf(plier(pts, PROFIL.cheville, HAUT, 14), m);
      s.details.push(plieDetail(quad([-6, 20], [34, 34], [58, 6], 16)));
      // Ski au trait continu : le dessus du ski depuis la gauche, qui monte sur la talonnière, passe sous la chaussure, monte sur la
      // butée, puis la spatule
      s.traits.push([[[-8, yS], [xa - 18, yS], ...talonniere, [xa + 4, yS], [xb - 4, yS], ...butee, [206, yS], ...spatule(yS, 0)]]);
      s.picto = { region: [0, 0, 0], accent: [[[-8, yS], [xa - 18, yS], ...talonniere, [xa + 4, yS], [xb - 4, yS], ...butee, [206, yS], ...spatule(yS, 0)]], sansSol: true, cadreChaussure: true };
      return s;
    }
    case 'golf': {
      // Appui à plat à l'adresse, chaussure à picots courts ; la balle sur son tee, devant la pointe
      const c = piedChausse(CHAUSSURES.golf);
      const k = 0.68, m = poser([c.x0, c.sol], [30, SOL_Y], k);
      const q = placer(c.pieces, k, [c.x0, c.sol], [30, SOL_Y]);
      const b = balleGolf(appliquer(m, [c.x1, 0])[0] + 40, SOL_Y, 8.5);
      const s = sceneChaussee(q, q.crampons);
      s.sol = [sol(10, 232)];
      s.objets.push(b.contour, b.tee);
      s.details.push(...b.coutures);
      // Trait du sol : il monte le long du tee, fait le tour de la balle, redescend et continue
      const g = b.tee.slice(0, 3), d = b.tee.slice(4);
      s.traits.push([sol(10, g[2][0]), inverse(g), depuisLeBas(b.contour), d, sol(d[d.length - 1][0] + 2, 232)]);
      s.picto = { region: [0, 0, 0], accent: [b.contour, b.tee], plus: tiretsCrampons(q.crampons, 5), loupe: 1.7 };
      return s;
    }
  }
}

// ———————————————————————————————————————————————————— Rendus

const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const memoScenes = new Map<Sport, Scene>();
const sceneDe = (s: Sport) => { let x = memoScenes.get(s); if (!x) { x = scene(s); memoScenes.set(s, x); } return x; };
const chemins = (l: Poly[], ferme: boolean) => l.filter((p) => p.length > 1).map((p) => cheminLisse(p, ferme)).join(' ');

/**
 * Registre pédagogique : jambe en aplat de peau (gamme : --peau-clair) et contour, chaussure et objets en aplats doux de l'accent
 * (classes `piece`, `piece-coque` de dessins.css), zone d'intérêt en `piece piece--forte` — toujours sur l'objet, jamais sur la peau.
 */
function contenuPedagogique(s: Scene): string {
  const f = (cls: string, l: Poly[], ferme = true) => l.filter((p) => p.length > 2).map((p) => `<path class="${cls}" d="${cheminLisse(p, ferme)}"></path>`).join('');
  const peau = s.peau.length ? `<g class="peau-douce">${s.peau.map((p) => `<path class="peau-seule" d="${cheminLisse([...p, [p[p.length - 1][0], -400], [p[0][0], -400]], true)}"></path>`).join('')}</g>` : '';
  return (
    `${s.sol.length ? `<path class="sol" d="${chemins(s.sol, false)}"></path>` : ''}` +
    peau +
    (s.peauTrait.length ? `<path class="trait" d="${chemins(s.peauTrait, false)}"></path>` : '') +
    f('piece', s.objets) + f('piece-coque', s.coques) + f('piece piece--forte', s.accent) +
    // Contours de la chaussure (tige, semelles) et des objets, par-dessus les aplats
    f('trait trait--moyen', [...s.objets, ...s.coques]) +
    (s.details.length ? `<path class="fin" d="${chemins(s.details, false)}"></path>` : '')
  );
}

/** Dessin pédagogique d'un sport (<svg>, repère 240 × 180), décoratif */
export function svgSportPedagogique(sport: Sport, o: { classe?: string } = {}): string {
  const classes = ['dessin', `dessin--sport-${sport}`, 'dessin--pedagogique', o.classe].filter(Boolean).join(' ');
  return `<svg class="${echapper(classes)}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${contenuPedagogique(sceneDe(sport))}</svg>`;
}

/** Dessin au trait continu d'un sport (<svg>, repère 240 × 180) : 1 à 3 traits, aucun aplat */
export function svgSportLigne(sport: Sport, o: OptionsLigne & { classe?: string } = {}): string {
  const classes = ['dessin', `dessin--sport-${sport}`, 'dessin--ligne', o.trace ? 'ligne-auto' : '', o.classe].filter(Boolean).join(' ');
  return `<svg class="${echapper(classes)}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${contenuLigneMorceaux(sceneDe(sport).traits, o)}</svg>`;
}

/** Rendu d'un sport selon le registre */
export const svgSport = (sport: Sport, registre: 'ligne' | 'pedagogique', o: OptionsLigne & { classe?: string } = {}) =>
  registre === 'ligne' ? svgSportLigne(sport, o) : svgSportPedagogique(sport, o);

/** Identifiant du picto d'un sport (« sport-course » existe déjà : picto du thème Sport) */
export const idPictoSport = (s: Sport) => (s === 'course' ? 'sport-course-a-pied' : `sport-${s}`);

export const estSport = (s: unknown): s is Sport => typeof s === 'string' && (SPORTS as readonly string[]).includes(s);

/**
 * Géométrie du picto d'un sport (pictos.ts) : la MÊME scène, recadrée sur une région carrée (repère 240 × 180) — traits du pied
 * chaussé (jambe, tige, semelle, col), sol et objets ; détail à l'accent (ballon, crampons, lignes de vitesse…).
 */
export function pictoSport(sport: Sport): { region: [number, number, number]; traits: Poly[]; accents: Poly[] } {
  const s = sceneDe(sport);
  const p = s.picto ?? { region: [0, 0, 240] as [number, number, number], accent: [] };
  const [jArr, ...chaussee] = p.sansPied ? [[]] : (s.traits[0] ?? []);
  const pied = p.sansPied ? [] : [jArr, ...chaussee, s.traits[1]?.[0] ?? []];
  let accents = p.accent.filter((q) => q.length > 1);
  if (p.loupe && accents.length) {
    const pts = accents.flat(), ox = Math.min(...pts.map((q) => q[0])), oy = Math.max(...pts.map((q) => q[1])), f = p.loupe;
    accents = accents.map((q) => q.map(([x, y]) => [ox + (x - ox) * f, oy + (y - oy) * f] as P));
  }
  // Région : la chaussure et les objets remplissent le carré (la jambe et le sol en sortent), sauf région imposée (côté > 0)
  let region = p.region;
  const boite = (p.cadreChaussure ? chaussee : [...chaussee, ...accents, ...(p.plus ?? [])]).flat();
  if (boite.length && p.region[2] <= 0) {
    const xs = boite.map((q) => q[0]), ys = boite.map((q) => q[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const c = Math.max(x1 - x0, y1 - y0) * 1.06 + 4;
    region = [(x0 + x1) / 2 - c / 2, y1 + 2 + c * 0.04 - c, c];
  }
  return { region, traits: [...pied, ...(p.sansSol ? [] : s.sol), ...(p.plus ?? [])].filter((q) => q.length > 1), accents };
}
