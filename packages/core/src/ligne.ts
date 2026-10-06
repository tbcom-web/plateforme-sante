// Registre « ligne » : dessins au TRAIT CONTINU (one-line art) — un seul trait régulier, fluide, sans aplat ni remplissage, avec
// des raccords en boucles. Troisième registre d'illustration, à côté de « releve » (relevé de podoscope) et « pedagogique »
// (schéma de manuel) : svgDessin(nom, { registre: 'ligne' }), svgEquipement, svgAnimationFixe, svgElement.
//
// RÈGLE : aucun dessin n'est tracé « à l'œil ». Chaque trait est un PARCOURS des géométries validées, échantillonnées puis
// enchaînées : contours ÉcranZen du pied (pied.ts : CONTOUR_PIED dorsal et plantaire, EMPREINTE, piedDeProfil, SEMELLE,
// CHAUSSURE, silhouette du pied d'enfant), dessins du matériel (svgEquipement, revus « justes » le 2026-10-04). Les orteils restent
// des boucles CONTINUES du contour (formule égyptienne, tailles décroissantes), jamais des ronds détachés (sauf les pulpes d'une
// EMPREINTE, réelles sur un relevé). Seuls les instruments (pince à ongles, gouge) n'ont pas de géométrie validée : ils sont
// construits ici à partir de proportions réelles (cotes en mm commentées), À VALIDER.
//
// Méthode : échantillonnage des tracés (sousChemins) → enchaînement des morceaux dans l'ordre du parcours (Trait), ponts lissés
// (Hermite) et boucles aux raccords (boucle) → ré-échantillonnage régulier, lissage léger, simplification (Ramer–Douglas–Peucker)
// → courbes de Bézier par Catmull-Rom centripète (pas de dépassement aux angles). Un `path` par dessin quand c'est possible,
// 3 au plus ; épaisseur unique de la charte (LIGNE.epaisseur, en unités LOCALES : jamais vector-effect, cf. piège WebKit) ;
// couleur --dessin-ligne (sinon --dessin-trait), ou l'accent ; fill="none" partout.
//
// Animation « le trait se dessine » : chaque chemin porte pathLength="1" et ses parts du tracé (--ligne-debut, --ligne-part, en
// fraction de LIGNE.duree). Sur le site, ChargeurDessins pose .ligne-attente puis .ligne-trace à l'apparition (dessins.css) ; un
// dessin en ligne (aperçu, contenus) peut demander `trace: true` (.ligne-auto, animation CSS). prefers-reduced-motion : trait complet.
import { CONTOUR_PIED, EMPREINTE, SEMELLE, SEMELLE_ELEMENTS, CHAUSSURE, PLANTE_ENFANT, ORTEILS_ENFANT, piedDeProfil, echantillonner, lisser, dansPolygone, type P } from './pied';
import { LIGNE, type EpaisseurLigne, type BouclesLigne } from './charte';
import { MEDIAL, LATERAL_NORMAL, VOISINS, LAME } from './bibliotheque/hallux-gros-plan';
import { AGRAFE_Y, LAME_MYCOSE, FRONT_MYCOSE, PLAQUE_DURILLON, MANCHON_ORTHO, contourFraise } from './bibliotheque/soins-ongles';
import { FORMES } from './bibliotheque/formes';

export type { EpaisseurLigne, BouclesLigne } from './charte';

/** Dessins du registre « ligne » (repère 240 × 180) */
export const DESSINS_LIGNE = [
  'pied-dessous', 'pied-dessus', 'pieds-dessus', 'empreintes', 'pied-profil', 'marche', 'ongle', 'semelle', 'chaussure-course',
  'premiers-pas', 'senior-canne', 'fauteuil', 'instruments', 'autoclave', 'podoscope', 'monofilament',
  // Fiches de soins de la migration 0020 (2026-10-05)
  'orthonyxie', 'onychoplastie', 'mycose', 'ongle-epais', 'cor', 'orthoplastie', 'domicile',
  // Soins qui n'avaient qu'un trait générique (2026-10-06, brouillons)
  'talon', 'taping', 'verrue', 'laser',
] as const;
export type NomLigne = (typeof DESSINS_LIGNE)[number];

/** Options d'un dessin au trait continu (variantes soumises à l'arbitrage : épaisseur fine / moyenne, boucles marquées / discrètes) */
export interface OptionsLigne {
  epaisseur?: EpaisseurLigne;
  boucles?: BouclesLigne;
  /** Couleur du trait : celle des dessins (--dessin-ligne, sinon --dessin-trait) ou l'accent du cabinet */
  couleur?: 'trait' | 'accent';
  /** Animation CSS autonome « le trait se dessine » (aperçus, contenus) ; sur le site, ChargeurDessins la déclenche à l'apparition */
  trace?: boolean;
  /** Graisse multipliée (dessin posé plus petit, ex. matériel 120 × 90) */
  echelleTrait?: number;
}

const r1 = (v: number) => +v.toFixed(1);
const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ———————————————————————————————————————————————————— Géométrie élémentaire

type Affine = [number, number, number, number, number, number];
const appliquer = (m: Affine, [x, y]: P): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** Rotation (degrés), échelle `e` (miroir si `miroir`), puis translation en (tx, ty) du point (ox, oy) */
const pose = (ox: number, oy: number, tx: number, ty: number, e: number, angle = 0, miroir = false): Affine => {
  const t = (angle * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), sx = miroir ? -e : e;
  const a = c * sx, b = s * sx, cc = -s * e, d = c * e;
  return [a, b, cc, d, tx - a * ox - cc * oy, ty - b * ox - d * oy];
};
const transf = (pts: P[], m: Affine) => pts.map((p) => appliquer(m, p));
const dist = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const norme = (v: P): P => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const inverse = (pts: P[]) => [...pts].reverse();
/** Direction en sortie (fin) et en entrée (début) d'une polyligne, moyennée sur quelques unités */
function tangenteFin(pts: P[], l = 3): P {
  const b = pts[pts.length - 1];
  for (let i = pts.length - 2; i >= 0; i--) if (dist(pts[i], b) >= l || i === 0) return norme([b[0] - pts[i][0], b[1] - pts[i][1]]);
  return [1, 0];
}
const tangenteDebut = (pts: P[], l = 3): P => { const t = tangenteFin(inverse(pts), l); return [-t[0], -t[1]]; };
const longueur = (pts: P[]) => pts.reduce((s, p, i) => (i ? s + dist(pts[i - 1], p) : 0), 0);

/** Ellipse échantillonnée [cx, cy, rx, ry] à partir de l'angle a0 (degrés), `sens` ±1, un tour complet (+ `plus` degrés) */
function ellipse(cx: number, cy: number, rx: number, ry: number, a0: number, sens = 1, plus = 0, n = 40): P[] {
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = ((a0 + sens * (k / n) * (360 + plus)) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P;
  });
}

// ———————————————————————————————————————————————————— Lecture des tracés SVG (M L H V C S Q T A Z, absolus et relatifs)

/** Sous-chemins d'un tracé SVG en polylignes (un point toutes les `pas` unités environ) */
export function sousChemins(d: string, pas = 0.8): { pts: P[]; ferme: boolean }[] {
  const t = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out: { pts: P[]; ferme: boolean }[] = [];
  let i = 0, cmd = '', cur: P = [0, 0], debut: P = [0, 0], ctrl: P | null = null, ctrlQ: P | null = null;
  const num = () => +t[i++];
  const ajouter = (q: P) => out[out.length - 1]?.pts.push(q);
  const n = (l: number) => Math.max(2, Math.ceil(l / pas));
  const cubique = (a: P, b: P, c: P, e: P) => {
    const k = n(dist(a, b) + dist(b, c) + dist(c, e));
    for (let j = 1; j <= k; j++) {
      const s = j / k, u = 1 - s;
      ajouter([0, 1].map((m) => u * u * u * a[m] + 3 * u * u * s * b[m] + 3 * u * s * s * c[m] + s * s * s * e[m]) as P);
    }
  };
  const quadratique = (a: P, b: P, e: P) => cubique(a, [a[0] + (2 / 3) * (b[0] - a[0]), a[1] + (2 / 3) * (b[1] - a[1])], [e[0] + (2 / 3) * (b[0] - e[0]), e[1] + (2 / 3) * (b[1] - e[1])], e);
  const arc = (a: P, rx: number, ry: number, phi: number, grand: number, balayage: number, e: P) => {
    // Paramétrisation centrale (SVG 1.1, annexe F.6.5)
    const f = (phi * Math.PI) / 180, cf = Math.cos(f), sf = Math.sin(f);
    const dx = (a[0] - e[0]) / 2, dy = (a[1] - e[1]) / 2, x1 = cf * dx + sf * dy, y1 = -sf * dx + cf * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const sg = grand === balayage ? -1 : 1;
    const num2 = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
    const co = sg * Math.sqrt(Math.max(0, num2 / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
    const cx1 = (co * rx * y1) / ry, cy1 = (-co * ry * x1) / rx;
    const cx = cf * cx1 - sf * cy1 + (a[0] + e[0]) / 2, cy = sf * cx1 + cf * cy1 + (a[1] + e[1]) / 2;
    const ang = (u: P, v: P) => Math.sign(u[0] * v[1] - u[1] * v[0] || 1) * Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)))));
    const t1 = ang([1, 0], [(x1 - cx1) / rx, (y1 - cy1) / ry]);
    let dt = ang([(x1 - cx1) / rx, (y1 - cy1) / ry], [(-x1 - cx1) / rx, (-y1 - cy1) / ry]);
    if (!balayage && dt > 0) dt -= 2 * Math.PI;
    if (balayage && dt < 0) dt += 2 * Math.PI;
    const k = n(Math.abs(dt) * Math.max(rx, ry));
    for (let j = 1; j <= k; j++) {
      const th = t1 + (dt * j) / k;
      ajouter([cx + rx * Math.cos(th) * cf - ry * Math.sin(th) * sf, cy + rx * Math.cos(th) * sf + ry * Math.sin(th) * cf]);
    }
  };
  while (i < t.length) {
    if (/[a-z]/i.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const pt = (): P => { const x = num(), y = num(); return rel ? [cur[0] + x, cur[1] + y] : [x, y]; };
    if (C === 'Z') { if (out.length) { out[out.length - 1].ferme = true; ajouter(debut); } cur = debut; cmd = ''; ctrl = ctrlQ = null; continue; }
    if (!cmd || i >= t.length) { i++; continue; }
    if (C === 'M') { cur = pt(); debut = cur; out.push({ pts: [cur], ferme: false }); cmd = rel ? 'l' : 'L'; ctrl = ctrlQ = null; continue; }
    if (!out.length) out.push({ pts: [cur], ferme: false });
    if (C === 'L') { const e = pt(); for (const q of [e]) { const k = n(dist(cur, q)); for (let j = 1; j <= k; j++) ajouter([cur[0] + ((q[0] - cur[0]) * j) / k, cur[1] + ((q[1] - cur[1]) * j) / k]); } cur = e; ctrl = ctrlQ = null; continue; }
    if (C === 'H' || C === 'V') {
      const v = num(), e: P = C === 'H' ? [rel ? cur[0] + v : v, cur[1]] : [cur[0], rel ? cur[1] + v : v];
      const k = n(dist(cur, e)); for (let j = 1; j <= k; j++) ajouter([cur[0] + ((e[0] - cur[0]) * j) / k, cur[1] + ((e[1] - cur[1]) * j) / k]);
      cur = e; ctrl = ctrlQ = null; continue;
    }
    if (C === 'C') { const b = pt(), c = pt(), e = pt(); cubique(cur, b, c, e); ctrl = c; ctrlQ = null; cur = e; continue; }
    if (C === 'S') { const b: P = ctrl ? [2 * cur[0] - ctrl[0], 2 * cur[1] - ctrl[1]] : cur; const c = pt(), e = pt(); cubique(cur, b, c, e); ctrl = c; ctrlQ = null; cur = e; continue; }
    if (C === 'Q') { const b = pt(), e = pt(); quadratique(cur, b, e); ctrlQ = b; ctrl = null; cur = e; continue; }
    if (C === 'T') { const b: P = ctrlQ ? [2 * cur[0] - ctrlQ[0], 2 * cur[1] - ctrlQ[1]] : cur; const e = pt(); quadratique(cur, b, e); ctrlQ = b; ctrl = null; cur = e; continue; }
    if (C === 'A') { const rx = num(), ry = num(), phi = num(), grand = num(), bal = num(), e = pt(); arc(cur, rx, ry, phi, grand, bal, e); cur = e; ctrl = ctrlQ = null; continue; }
    i++;
  }
  return out.filter((s) => s.pts.length > 1);
}
const morceaux = (d: string, pas = 0.8) => sousChemins(d, pas).map((s) => s.pts);

// ———————————————————————————————————————————————————— Le trait : enchaînement, ponts, boucles

/** Rayon des boucles de raccord et longueur des queues, selon la variante */
const reglage = (b: BouclesLigne) => LIGNE.boucles[b];

/**
 * Trait en construction : une polyligne unique à laquelle on ajoute des morceaux ; entre deux morceaux, un pont lissé (courbe
 * d'Hermite tangente aux deux bouts) et, si demandé, une boucle (raccord « cursif » qui se recroise).
 */
class Trait {
  pts: P[] = [];
  constructor(private b: BouclesLigne) {}
  get fin(): P { return this.pts[this.pts.length - 1]; }
  /** Ajoute un morceau ; `boucle` : ±1 (côté de la boucle, à gauche ou à droite de la marche) avant le pont ; `tension` du pont */
  ajouter(m: P[], o: { boucle?: number; rayon?: number; tension?: number } = {}): this {
    if (!m.length) return this;
    if (!this.pts.length) { this.pts.push(...m); return this; }
    if (o.boucle) this.boucle(o.boucle, o.rayon);
    const a = this.fin, b = m[0], d = dist(a, b);
    if (d > 0.6 && d <= 2.5) this.pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    else if (d > 2.5) {
      const ta = tangenteFin(this.pts), tb = tangenteDebut(m), k = (o.tension ?? 0.45) * d;
      const n = Math.max(4, Math.ceil(d / 0.8));
      for (let j = 1; j < n; j++) {
        const s = j / n, h1 = 2 * s ** 3 - 3 * s ** 2 + 1, h2 = s ** 3 - 2 * s ** 2 + s, h3 = -2 * s ** 3 + 3 * s ** 2, h4 = s ** 3 - s ** 2;
        this.pts.push([h1 * a[0] + h2 * k * ta[0] + h3 * b[0] + h4 * k * tb[0], h1 * a[1] + h2 * k * ta[1] + h3 * b[1] + h4 * k * tb[1]]);
      }
    }
    this.pts.push(...(d > 0.6 ? m : m.slice(1)));
    return this;
  }
  /**
   * Boucle au bout du trait : le trait poursuit sa marche, s'enroule d'un tour complet sur un cercle de rayon r posé du côté
   * `sens` (+1 : à gauche de la marche dans le repère SVG, y vers le bas), et repart dans la même direction en se recroisant.
   */
  boucle(sens: number, rayon?: number): this {
    const r = rayon ?? reglage(this.b).rayon;
    if (r <= 0 || !this.pts.length) return this;
    const p = this.fin, t = tangenteFin(this.pts), nrm: P = [t[1] * sens, -t[0] * sens];
    const c: P = [p[0] + nrm[0] * r, p[1] + nrm[1] * r], avance = r * 0.9, n = 36;
    for (let j = 1; j <= n; j++) {
      const u = j / n, a = -sens * 2 * Math.PI * u, v: P = [p[0] - c[0], p[1] - c[1]];
      const ca = Math.cos(a), sa = Math.sin(a);
      this.pts.push([c[0] + v[0] * ca - v[1] * sa + t[0] * avance * u, c[1] + v[0] * sa + v[1] * ca + t[1] * avance * u]);
    }
    return this;
  }
  /** Queue de départ : le trait arrive sur le premier point, tangent, d'une longueur `l` légèrement incurvée (`courbe` ±) */
  entree(l?: number, courbe = 0.25): this {
    const L = l ?? reglage(this.b).queue;
    if (!this.pts.length || L <= 0) return this;
    const p = this.pts[0], t = tangenteDebut(this.pts), nrm: P = [-t[1], t[0]], q: P[] = [];
    for (let j = 12; j >= 1; j--) { const s = j / 12; q.push([p[0] - t[0] * L * s + nrm[0] * courbe * L * s * s, p[1] - t[1] * L * s + nrm[1] * courbe * L * s * s]); }
    this.pts.unshift(...q);
    return this;
  }
  /** Queue de sortie (même principe que l'entrée) */
  sortie(l?: number, courbe = 0.25): this {
    const L = l ?? reglage(this.b).queue;
    if (!this.pts.length || L <= 0) return this;
    const p = this.fin, t = tangenteFin(this.pts), nrm: P = [-t[1], t[0]];
    for (let j = 1; j <= 12; j++) { const s = j / 12; this.pts.push([p[0] + t[0] * L * s + nrm[0] * courbe * L * s * s, p[1] + t[1] * L * s + nrm[1] * courbe * L * s * s]); }
    return this;
  }
}

/** Polyligne fermée réordonnée pour partir du point le plus proche de `depart`, puis refermée en dépassant le départ de `rab` unités */
function partirDe(ferme: P[], depart: P, rab = 0): P[] {
  const pts = dist(ferme[0], ferme[ferme.length - 1]) < 0.5 ? ferme.slice(0, -1) : ferme;
  let k = 0;
  pts.forEach((p, i) => { if (dist(p, depart) < dist(pts[k], depart)) k = i; });
  const tour = [...pts.slice(k), ...pts.slice(0, k), pts[k]];
  if (rab > 0) { let l = 0; for (let i = 1; i < tour.length && l < rab; i++) { l += dist(tour[i - 1], tour[i]); tour.push(tour[i]); } }
  return tour;
}

// ———————————————————————————————————————————————————— Lissage et écriture du tracé

function reechantillonner(pts: P[], pas: number): P[] {
  const out: P[] = [pts[0]];
  let reste = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = dist(a, b);
    let s = pas - reste;
    while (s <= l) { out.push([a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l]); s += pas; }
    reste = l - (s - pas);
  }
  const z = pts[pts.length - 1];
  if (dist(out[out.length - 1], z) > pas * 0.3) out.push(z);
  return out;
}
/** Ramer–Douglas–Peucker (itératif) */
function simplifier(pts: P[], tol: number): P[] {
  const garde = new Uint8Array(pts.length); garde[0] = garde[pts.length - 1] = 1;
  const pile: [number, number][] = [[0, pts.length - 1]];
  while (pile.length) {
    const [a, b] = pile.pop()!;
    let dmax = 0, k = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy);
    // Bouts confondus (tracé fermé) : distance au point, pas à la droite
    for (let i = a + 1; i < b; i++) { const d = l < 1e-6 ? dist(pts[i], pts[a]) : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / l; if (d > dmax) { dmax = d; k = i; } }
    if (dmax > tol && k > 0) { garde[k] = 1; pile.push([a, k], [k, b]); }
  }
  return pts.filter((_, i) => garde[i]);
}
/** Catmull-Rom centripète (α = 0,5) en courbes de Bézier : passe par les points, sans boucle parasite ni dépassement aux angles */
function bezier(pts: P[]): string {
  const n = pts.length;
  if (n < 2) return '';
  const q = (i: number): P => (i < 0 ? [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]] : i >= n ? [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]] : pts[i]);
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = q(i - 1), p1 = q(i), p2 = q(i + 1), p3 = q(i + 2);
    const d1 = Math.max(1e-4, Math.sqrt(dist(p0, p1))), d2 = Math.max(1e-4, Math.sqrt(dist(p1, p2))), d3 = Math.max(1e-4, Math.sqrt(dist(p2, p3)));
    const b1 = [0, 1].map((k) => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2)));
    const b2 = [0, 1].map((k) => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2)));
    d += ` C${r1(b1[0])} ${r1(b1[1])} ${r1(b2[0])} ${r1(b2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}
/** Morceaux d'une polyligne compris dans le cadre (le trait s'arrête au bord : une jambe sort du cadre, jamais de débord) */
function rogner(pts: P[], l = 240, h = 180, marge = 0.5): P[][] {
  const dedans = ([x, y]: P) => x >= -marge && x <= l + marge && y >= -marge && y <= h + marge;
  const bord = (a: P, b: P): P => {
    // Point de sortie sur le cadre entre a (dedans) et b (dehors), par dichotomie
    let u = 0, v = 1;
    for (let k = 0; k < 24; k++) { const m = (u + v) / 2; if (dedans([a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m])) u = m; else v = m; }
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  };
  const runs: P[][] = [];
  let cur: P[] = [];
  pts.forEach((p, i) => {
    const d = dedans(p);
    if (d && !cur.length && i > 0) cur.push(bord(p, pts[i - 1]));
    if (d) cur.push(p);
    else if (cur.length) { cur.push(bord(pts[i - 1], p)); runs.push(cur); cur = []; }
  });
  if (cur.length) runs.push(cur);
  return runs.filter((r) => longueur(r) > 4);
}

/** Polyligne finale → tracé : ré-échantillonnage régulier, lissage léger (noyau 1-2-1), simplification, Bézier */
function ecrire(pts: P[]): { d: string; longueur: number } {
  let p = reechantillonner(pts, 0.7);
  for (let passe = 0; passe < 2; passe++) p = p.map((q, i) => (i === 0 || i === p.length - 1 ? q : [(p[i - 1][0] + 2 * q[0] + p[i + 1][0]) / 4, (p[i - 1][1] + 2 * q[1] + p[i + 1][1]) / 4] as P));
  return { d: bezier(simplifier(p, 0.14)), longueur: longueur(p) };
}

// ———————————————————————————————————————————————————— Parcours des géométries validées

/** Repère du pied (92 × 222, pied droit vu de dessus, hallux à gauche) : morceaux exacts du contour (pied.ts, CONTOUR_PIED) */
const PIECES_PLANTE = () => morceaux(CONTOUR_PIED.plantaire.trait, 0.6);
const PIECES_DOS = () => morceaux(CONTOUR_PIED.dorsal.trait, 0.6);

/**
 * Contour FERMÉ du pied (plante, talon et les cinq orteils en boucles continues), repère du pied : bord médial → talon → bord
 * latéral, puis les orteils du 5e à l'hallux (chaque orteil : côté latéral, pulpe, côté médial ; les commissures sont les creux du
 * même trait). Morceaux de CONTOUR_PIED.plantaire.trait, dans l'ordre.
 */
function contourPied(): P[] {
  const m = PIECES_PLANTE();
  const pts: P[] = [...m[0]];
  for (let o = 4; o >= 0; o--) for (let k = 3; k >= 1; k--) pts.push(...inverse(m[1 + 3 * o + k - 1]));
  return pts;
}
/** Contour OUVERT du pied vu de dessus avec la jambe (vue « je regarde mon pied ») : jambe médiale ↑, orteils, jambe latérale ↓ */
function contourDos(o: { ongles?: boolean } = {}): P[] {
  const m = PIECES_DOS();
  const pts: P[] = [...inverse(m[0])];
  const ongles = o.ongles ? ONGLES() : [];
  for (let n = 0; n < 5; n++) for (let k = 0; k < 3; k++) {
    const piece = m[2 + 3 * n + k];
    if (k !== 1 || !ongles[n]) { pts.push(...piece); continue; }
    // Ongle en boucle du même trait : au bout de l'orteil, le trait descend sur le bord libre de la lame, fait le tour de l'ongle
    // et revient au bout de l'orteil (la lame est reliée à la pulpe par son bord libre, comme dans la réalité)
    const ongle = ongles[n], haut = ongle.reduce((a, q) => (q[1] < a[1] ? q : a), ongle[0]);
    let i = 0; piece.forEach((q, j) => { if (dist(q, haut) < dist(piece[i], haut)) i = j; });
    pts.push(...piece.slice(0, i + 1), ...partirDe(ongle, haut, 0.6), ...piece.slice(i));
  }
  pts.push(...inverse(m[1]));
  return pts;
}
/** Ongles des orteils (vue de dessus), un tracé fermé par ongle, du 1er au 5e */
const ONGLES = () => morceaux(CONTOUR_PIED.dorsal.ongles, 0.4);

/**
 * Pied de profil médial (pied gauche vu côté interne, orteils à droite ; pied.ts : piedDeProfil, atomes POD-AT-0003/0008) en un
 * parcours ouvert : arrière de la jambe (sort du cadre) → tendon d'Achille → talon → plante (arche décollée du sol) → hallux →
 * dos du pied → avant de la jambe (sort du cadre). Malléole médiale à part (petit arc).
 */
function contourProfil(voute: 'normale' | 'creuse' | 'plate' = 'normale'): { trait: P[]; malleole: P[]; mtp: P; sol: number } {
  const p = piedDeProfil(voute);
  const c = morceaux(p.contour, 0.6), h = morceaux(p.halluxContour, 0.5)[0];
  // c[0] : jambe arrière → plante ; c[1] : dos du pied → jambe avant ; c[2], c[3] : prolongements de la jambe (hors cadre)
  const trait = [...inverse(c[2]), ...c[0], ...inverse(h), ...c[1], ...c[3]];
  return { trait, malleole: morceaux(p.malleole, 0.4)[0], mtp: p.mtp, sol: p.sol };
}
/**
 * Talon levé (fin d'appui) : la partie du pied et de la jambe en arrière de la métatarso-phalangienne tourne autour d'elle de
 * `angle` degrés, les orteils restent à plat au sol (raccord progressif sur ±6 u autour de la MTP).
 */
function leverTalon(pts: P[], mtp: P, angle: number): P[] {
  return pts.map(([x, y]) => {
    const w = Math.max(0, Math.min(1, (mtp[0] + 5 - x) / 11)), w2 = w * w * (3 - 2 * w);
    const a = (angle * w2 * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), dx = x - mtp[0], dy = y - mtp[1];
    return [mtp[0] + dx * c - dy * s, mtp[1] + dx * s + dy * c] as P;
  });
}

/**
 * Pliure : les points situés au-delà de `pivot` le long de la direction `axe` (vers le haut de la jambe) tournent de `angle` degrés
 * autour du pivot (positif = le haut part vers l'avant, à droite), avec un raccord progressif sur `largeur` unités (articulation).
 */
function plier(pts: P[], pivot: P, axe: P, angle: number, largeur = 14): P[] {
  return pts.map(([x, y]) => {
    const sAxe = (x - pivot[0]) * axe[0] + (y - pivot[1]) * axe[1];
    const w = Math.max(0, Math.min(1, (sAxe + largeur / 2) / largeur)), w2 = w * w * (3 - 2 * w);
    const a = (angle * w2 * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), dx = x - pivot[0], dy = y - pivot[1];
    return [pivot[0] + dx * c - dy * sn, pivot[1] + dx * sn + dy * c] as P;
  });
}
const tourner = (v: P, angle: number): P => { const a = (angle * Math.PI) / 180; return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]; };
/** Angle (degrés, positif vers l'avant) d'un segment qui monte de a vers b */
const angleMontant = (a: P, b: P) => (Math.atan2(b[0] - a[0], a[1] - b[1]) * 180) / Math.PI;

/**
 * Empreinte (zone de contact : EMPREINTE, POD-SC-0007 corrigée) en un trait : la trace d'appui fermée, puis les cinq pulpes en
 * boucles enchaînées du 5e orteil à l'hallux. Repère du pied (trace d'un pied droit vue de dessus, hallux à gauche).
 */
function traitEmpreinte(t: Trait, m: Affine, b: BouclesLigne) {
  const contour = transf(morceaux(EMPREINTE.contour, 0.6)[0], m);
  const pulpes = EMPREINTE.pulpes.map(([cx, cy, rx, ry]) => ({ c: appliquer(m, [cx, cy]), rx: rx * Math.hypot(m[0], m[1]), ry: ry * Math.hypot(m[2], m[3]) }));
  // Départ sous la pulpe de l'hallux (bord médial de l'avant-pied) : le tour de la trace d'appui finit là où commencent les orteils
  const p1 = pulpes[0].c, depart: P = [p1[0], p1[1] + 14 * Math.hypot(m[2], m[3])];
  const tour = partirDe(contour, depart, 0);
  // Sens du tour : on finit en remontant vers l'hallux (le tour passe d'abord par le talon)
  const versTalon = tour[Math.min(8, tour.length - 1)][1] > tour[0][1];
  t.ajouter(versTalon ? tour : inverse(tour)).entree(undefined, versTalon ? 0.3 : -0.3);
  // Pulpes de l'hallux au 5e orteil, en boucles « cursives » posées sur une ligne de base (sous les pulpes) : chaque pulpe est
  // parcourue d'un tour complet depuis son point le plus bas, dans le sens de la marche du trait (vers le 5e orteil)
  const miroir = m[0] * m[3] - m[1] * m[2] < 0;
  const sens = miroir ? 1 : -1;
  pulpes.forEach((q, i) => {
    const a0 = (Math.atan2(1, 0) * 180) / Math.PI;
    t.ajouter(ellipse(q.c[0], q.c[1], q.rx, q.ry, a0, sens, 0, 32), { tension: i ? 0.9 : 0.6 });
  });
  if (reglage(b).final) t.sortie(reglage(b).queue * 0.4, 0.3);
}

// ———————————————————————————————————————————————————— Instruments (pas de géométrie validée : construits, À VALIDER)

/**
 * Pince à ongles de pédicurie (vue de face, repère local en mm, axe vertical, mors en haut) : longueur 125 mm ; mors fermés de
 * 22 mm, effilés vers un bout ARRONDI de 4 mm (aucune lame visible) ; articulation à boîte de 19 mm de large ; branches de 7 mm
 * presque parallèles (écart extérieur 34 mm au bout) ; double ressort à lames entre les branches, croisé au milieu. Un contour en
 * un trait : branche gauche ↑, boîte, mors, boîte, branche droite ↓, bout, bord intérieur droit ↑, ressort (boucle centrale), bord
 * intérieur gauche ↓.
 */
function pinceOngles(): P[] {
  return sousChemins(
    'M-16 122 C-18.4 110 -16.6 90 -13.2 70 C-11.4 58 -8.6 46 -7.2 38 ' + // bord extérieur de la branche gauche
    'C-9.4 36.6 -11.2 34 -11.2 30 C-11.2 25.6 -9.2 22.6 -6.2 21.6 ' + // boîte d'articulation (plus large que mors et branches)
    'C-5.6 15 -4 8 -2.2 2.6 C-1.4 0.4 1.4 0.4 2.2 2.6 C4 8 5.6 15 6.2 21.6 ' + // mors fermés, bout arrondi
    'C9.2 22.6 11.2 25.6 11.2 30 C11.2 34 9.4 36.6 7.2 38 ' + // boîte
    'C8.6 46 11.4 58 13.2 70 C16.6 90 18.4 110 16 122 C15.2 126.4 10 126.4 9.4 122 ' + // branche droite et son bout
    'C8.8 108 7.6 94 6.2 84 C5.6 79 5 74 4.2 70 ' + // bord intérieur droit
    'C2.4 74 0.6 78 -1.4 80.4 C-5 84.6 -6 76.6 -2 75.4 C2 74.4 5 82.6 1.4 84 C-1.2 85 -3.4 78 -4.2 70 ' + // double ressort croisé
    'C-5 74 -5.6 79 -6.2 84 C-7.6 94 -8.8 108 -9.4 122 C-10 126.4 -15.2 126.4 -16 122 Z', 0.4)[0].pts;
}
/**
 * Gouge de pédicurie (repère local en mm, axe vertical, cuillère en haut) : manche de 92 × 8 mm avec deux bagues de prise, col
 * conique, tige de 24 mm, cuillère ovale de 3,5 × 6 mm légèrement coudée, bords ARRONDIS (aucune pointe). Contour fermé en un trait.
 */
function gouge(): P[] {
  return sousChemins(
    'M-0.6 0.4 C1.6 -0.6 3.8 0.8 3.6 3.6 C3.4 6 1.8 7.4 1 9.6 L0.9 33 C1 35.6 3.4 37.4 4 40.6 L4 46 C4.6 46.6 4.6 48 4 48.6 ' +
    'L4 54 C4.6 54.6 4.6 56 4 56.6 L4 124 C4 128.4 -4 128.4 -4 124 L-4 56.6 C-4.6 56 -4.6 54.6 -4 54 L-4 48.6 C-4.6 48 -4.6 46.6 -4 46 ' +
    'L-4 40.6 C-3.4 37.4 -1 35.6 -0.9 33 L-0.9 10.4 C-1.6 8.2 -3 6.2 -2.8 3.6 C-2.6 1.8 -1.8 0.9 -0.6 0.4 Z', 0.4)[0].pts;
}

// ———————————————————————————————————————————————————— Dessins (repère 240 × 180)

const SOL = 166;

/** Chemins (polylignes) de chaque dessin, avant lissage. `b` : variante des boucles */
function parcours(nom: NomLigne, b: BouclesLigne, equipement: (id: string) => string): P[][] {
  const R = reglage(b);
  switch (nom) {
    case 'pied-dessous': {
      // Plante du pied droit (vue de dessous = miroir de la vue de dessus : hallux à DROITE), légèrement inclinée
      const m = pose(46, 111, 122, 92, 0.7, 6, true);
      const c = transf(contourPied(), m);
      const t = new Trait(b).ajouter(partirDe(c, appliquer(m, [76, 196]), 12));
      if (R.final) t.entree(R.queue, 0.35).boucle(1);
      return [t.pts];
    }
    case 'pied-dessus': {
      // « Je regarde mon pied » : pied droit vu de dessus, la jambe sort du cadre en bas (elle cache le talon)
      const m = pose(46, 111, 120, 98, 0.78, 0);
      return [new Trait(b).ajouter(transf(contourDos(), m)).pts];
    }
    case 'pieds-dessus': {
      // Les deux pieds vus d'en haut (debout, pointes légèrement ouvertes), jambes qui sortent du cadre
      const e = 0.66;
      return [pose(46, 111, 86, 104, e, -6, true), pose(46, 111, 154, 104, e, 6)].map((m) => new Trait(b).ajouter(transf(contourDos(), m)).pts);
    }
    case 'empreintes': {
      // Paire d'empreintes en station debout : côte à côte, pointes ouvertes de ≈ 7° vers l'extérieur (pied gauche à gauche)
      const e = 0.58;
      return [pose(46, 111, 92, 92, e, -7, true), pose(46, 111, 150, 92, e, 7)].map((m) => { const t = new Trait(b); traitEmpreinte(t, m, b); return t.pts; });
    }
    case 'pied-profil': {
      // Pied gauche vu côté interne, orteils à droite ; la jambe sort du cadre en haut
      const p = contourProfil(), k = 1.12, m: Affine = [k, 0, 0, k, 52, SOL - p.sol * k];
      const t = new Trait(b).ajouter(transf(p.trait, m));
      return [t.pts, transf(p.malleole, m)];
    }
    case 'marche': {
      // Marche, double appui (revue du 2026-10-05) : les deux jambes vont à UNE MÊME HANCHE (≈ 3,5 L au-dessus du sol, ≈ 0,35 L en
      // arrière de la cheville avant). Jambe avant : pied à plat, jambe inclinée de 6° (haut vers l'arrière), genou presque tendu.
      // Jambe arrière : talon levé de 24° (orteils au sol), jambe à ≈ 32°, genou fléchi (en avant de la droite cheville-hanche).
      // Pas ≈ 2,5 longueurs de pied, talon à talon. Calcul dans le repère du profil (L = 125,4 u, sol y = 62), puis mise à l'échelle.
      const p = contourProfil(), k = 0.47, Lp = 125.4, L = Lp * k;
      const cheville: P = [20, 27], haut: P = [0, -1], hJambe = 203; // pivot de la cheville (malléole), longueur cheville → genou (≈ 1,9 L du sol)
      const hanche: P = [cheville[0] - 0.35 * Lp, p.sol - 3.5 * Lp];
      // Jambe avant
      let av = plier(p.trait, cheville, haut, -6);
      const genouAv: P = [cheville[0] + tourner(haut, -6)[0] * hJambe, cheville[1] + tourner(haut, -6)[1] * hJambe];
      av = plier(av, genouAv, tourner(haut, -6), angleMontant(genouAv, hanche) + 6, 18);
      // Jambe arrière (repère décalé de 2,5 L : la hanche y est 2,5 L plus en avant)
      const hancheAr: P = [hanche[0] + 2.5 * Lp, hanche[1]];
      let ar = leverTalon(p.trait, p.mtp, 24);
      const chevAr = leverTalon([cheville], p.mtp, 24)[0];
      ar = plier(ar, chevAr, tourner(haut, 24), 8);
      const genouAr: P = [chevAr[0] + tourner(haut, 32)[0] * hJambe, chevAr[1] + tourner(haut, 32)[1] * hJambe];
      ar = plier(ar, genouAr, tourner(haut, 32), angleMontant(genouAr, hancheAr) - 32, 18);
      const xAvant = 166;
      return [transf(ar, [k, 0, 0, k, xAvant - 2.5 * L, SOL - p.sol * k]), transf(av, [k, 0, 0, k, xAvant, SOL - p.sol * k])];
    }
    case 'ongle': {
      // Gros orteil et ses voisins vus de dessus (POD-AT-0001 agrandi, avant-pied dans le cadre) : un seul trait pour le contour et
      // les ongles (chaque lame est une boucle du trait, reliée au bout de l'orteil par son bord libre) ; la lunule de l'hallux à
      // part. Le 4e orteil sort du cadre à droite ; les bords du pied sortent en bas.
      const m = pose(30, 44, 92, 98, 2.15, 0);
      const c = contourDos({ ongles: true }).filter(([, y]) => y < 130);
      const lunule = sousChemins(CONTOUR_PIED.dorsal.lunule, 0.4).map((x) => transf(x.pts, m));
      // Pli de l'interphalangienne de l'hallux (2 phalanges) : un trait court, comme sur l'atome
      const pli = morceaux(CONTOUR_PIED.dorsal.plis, 0.4).filter((q) => q[0][1] < 40 && q[0][0] < 20).map((q) => transf(q, m));
      return [new Trait(b).ajouter(transf(c, m)).pts, ...lunule.slice(0, 1), ...pli.slice(0, 1)];
    }
    case 'semelle': {
      // Semelle orthopédique vue de dessus (POD-AT-0004, L/l ≈ 2,6) : contour, puis soutien de voûte et barre rétrocapitale
      // (DERRIÈRE les têtes métatarsiennes), chacun d'un trait
      const m = pose(46, 111, 116, 90, 0.66, -8);
      const s = transf(morceaux(SEMELLE, 0.6)[0], m);
      const t = new Trait(b).ajouter(partirDe(s, appliquer(m, [60, 214]), 10));
      if (R.final) t.entree(R.queue, -0.3);
      const voute = transf(morceaux(SEMELLE_ELEMENTS.voute, 0.5)[0], m), barre = transf(morceaux(SEMELLE_ELEMENTS.barre, 0.5)[0], m);
      return [t.pts, new Trait(b).ajouter(voute).pts, new Trait(b).ajouter(barre).pts];
    }
    case 'chaussure-course': {
      // Chaussure de course de profil (pied.ts : CHAUSSURE), à plat : tige (talon, col, laçage en boucles, pointe), puis la semelle
      // (pointe, dessous, talon) et la ligne de la semelle intermédiaire ; les lacets sont les boucles du trait le long du laçage
      const k = 2.2, m: Affine = [k, 0, 0, k, 10, 34];
      const tige = morceaux(CHAUSSURE.tige, 0.4)[0], semelle = morceaux(CHAUSSURE.semelle, 0.4)[0];
      const iPointe = tige.findIndex((q) => q[0] > 95);
      const dessus = tige.slice(0, iPointe + 1);
      const t = new Trait(b);
      // Laçage : de l'ouverture (x 38) vers la pointe, une boucle à chaque barrette
      const lacets = CHAUSSURE.lacets.map(([x1, , x2]) => (x1 + x2) / 2);
      let i0 = 0;
      for (const xl of lacets) {
        const i = dessus.findIndex((q, j) => j > i0 && q[0] >= xl);
        t.ajouter(transf(dessus.slice(i0, i + 1), m), {});
        t.boucle(-1, R.rayon * 0.9);
        i0 = i;
      }
      t.ajouter(transf(dessus.slice(i0), m));
      const iSem = semelle.findIndex((q) => q[0] > 95);
      t.ajouter(transf([...semelle.slice(iSem), ...semelle.slice(1, iSem + 1)], m), { tension: 0.3 });
      return [t.entree(R.queue * 0.8, 0.2).pts];
    }
    case 'premiers-pas': {
      // Premiers pas : une empreinte d'adulte et, à côté, celle du tout-petit (≈ 0,5 × la longueur adulte ; pied large, voûte comblée
      // par le coussinet graisseux), orteils en boucles du contour (silhouette du pied d'enfant de pied.ts)
      const ea = 0.62, ee = ea * 0.5;
      const adulte = pose(46, 111, 92, 100, ea, -5, true);
      const enfant = pose(46, 111, 168, 118, ee, 6);
      const cEnfant = transf(sousChemins(silhouetteEnfant(), 0.4)[0].pts, enfant);
      const ta = new Trait(b).ajouter(partirDe(transf(contourPied(), adulte), appliquer(adulte, [70, 205]), 12)).entree(R.queue, 0.3);
      const te = new Trait(b).ajouter(partirDe(cEnfant, appliquer(enfant, [30, 200]), 8)).entree(R.queue * 0.7, -0.3);
      return [ta.pts, te.pts];
    }
    case 'senior-canne': {
      // Pied de profil (gauche, côté interne) et canne tenue de l'autre côté (derrière le pied) : tige presque verticale en DOUBLE trait
      // (Ø ≈ 2 cm) qui sort du cadre (poignée au grand trochanter), embout en cloche (≈ 3,5 cm) posé ≈ 12 cm en avant du 5e orteil ;
      // le sol mène à l'embout. Le trait de la canne monte d'un côté et redescend de l'autre (deux morceaux une fois rogné au cadre).
      const p = contourProfil(), k = 0.86, m: Affine = [k, 0, 0, k, 40, SOL - p.sol * k];
      const cm = (125.4 * k) / 25;
      const xe = appliquer(m, [112, 0])[0] + 12 * cm, r = cm, cloche = 1.8 * cm, hc = 3.6 * cm, pente = -5.4 / (SOL + 6);
      const x = (y: number, cote: number) => xe + (SOL - y) * pente + cote;
      // Embout en cloche FERMÉ par sa propre base (aucun trait de sol qui s'y raccorde : sinon « poteau planté ») ; le trait part du
      // haut de la tige (hors cadre), descend le bord gauche, fait la base et remonte le bord droit (deux morceaux une fois rogné)
      const canne = new Trait(b).ajouter([[x(-30, -r), -30], [x(90, -r), 90], [x(SOL - hc, -r), SOL - hc], [xe - cloche * 0.8, SOL - hc * 0.6], [xe - cloche, SOL]]);
      canne.ajouter([[xe - cloche + 0.5, SOL], [xe + cloche - 0.5, SOL]]);
      canne.ajouter([[xe + cloche, SOL], [xe + cloche * 0.8, SOL - hc * 0.6], [x(SOL - hc, r), SOL - hc], [x(90, r), 90], [x(-30, r), -30]], { tension: 0.3 });
      return [transf(p.trait, m), canne.pts];
    }
    case 'instruments': {
      // Pince à ongles (mors fermés) et gouge, posées côte à côte, légèrement inclinées ; 1 mm ≈ 1,05 u
      const e = 1.18;
      const pince = transf(pinceOngles(), pose(0, 62, 96, 92, e, -10));
      const g = transf(gouge(), pose(0, 64, 156, 92, e, 12));
      return [new Trait(b).ajouter(partirDe(pince, pince[0], 6)).pts, new Trait(b).ajouter(partirDe(g, g[Math.floor(g.length / 2)], 5)).pts];
    }
    case 'monofilament': {
      // Monofilament 10 g (IWGDF 2019, HAS ; revue du 2026-10-05, reprise du 2026-10-05) : le pied de profil couché, plante tournée
      // vers la droite (patient allongé), orteils en haut ; le manche arrive de la droite. Lisible à 240 px : manche COURT et FIN
      // (≈ 40 × 7 u), filament long (corde ≈ 0,6 × le manche) posé PERPENDICULAIRE à la plante sous la tête de M1, plié en UN SEUL
      // C franc (flèche ≈ 0,42 × la corde, bombé vers les orteils), extrémités sur l'axe : on voit le fil qui plie, pas un manche
      // contre la plante. Sans boucle au contact.
      const p = contourProfil(), k = 0.95, xs = 118, ym = 88;
      const m: Affine = [0, -k, k, 0, xs - p.sol * k, ym + 83 * k]; // (x, y) du profil → (xs + (y − sol)·k, ym − (x − 83)·k)
      const pied = transf(p.trait, m);
      const lm = 40, h = 3.5, r = 3, corde = 26, fleche = 0.42 * corde;
      const contact: P = [xs + 0.8, ym], bout: P = [contact[0] + corde, ym], x0 = bout[0], x1 = bout[0] + lm;
      // Manche : du point d'attache du filament, tour du manche (coins arrondis) et retour au point d'attache
      const manche = new Trait(b).ajouter(sousChemins(`M${x0} ${ym} L${x0} ${ym - h + r} Q${x0} ${ym - h} ${x0 + r} ${ym - h} L${x1 - r} ${ym - h} Q${x1} ${ym - h} ${x1} ${ym - h + r} L${x1} ${ym + h - r} Q${x1} ${ym + h} ${x1 - r} ${ym + h} L${x0 + r} ${ym + h} Q${x0} ${ym + h} ${x0} ${ym + h - r} L${x0} ${ym}`, 0.4)[0].pts);
      // Filament : flambage d'Euler (demi-sinusoïde) : une seule courbure, extrémités sur l'axe manche → peau
      const filament: P[] = Array.from({ length: 33 }, (_, j) => { const t = j / 32; return [x0 + (contact[0] - x0) * t, ym - fleche * Math.sin(Math.PI * t)] as P; });
      manche.ajouter(filament.slice(1));
      return [pied, manche.pts, transf(p.malleole, m)];
    }
    // ——— Soins sans trait continu dédié jusqu'ici (2026-10-06, brouillons) : mêmes géométries que les dessins relevé / pédagogique
    case 'talon': {
      // Douleur au talon : le pied de profil (comme « pied-profil ») et l'aponévrose plantaire (POD-AT-0008), bande fermée de la
      // tubérosité du calcanéum à la base de P1, DANS le contour de la peau
      const p = contourProfil(), k = 1.12, m: Affine = [k, 0, 0, k, 52, SOL - p.sol * k];
      const apo = sousChemins(piedDeProfil().aponevrose, 0.4)[0].pts;
      return [new Trait(b).ajouter(transf(p.trait, m)).pts, transf(p.malleole, m), transf(apo, m)];
    }
    case 'taping': {
      // K-taping : le pied de profil, la bande du tendon d'Achille (du dessous du talon au mollet, queue en Y) et la bande de la
      // voûte, chacune en contour fermé à largeur constante, DANS le contour de la peau (mêmes axes que le dessin « taping »)
      const p = contourProfil(), k = 1.12, m: Affine = [k, 0, 0, k, 52, SOL - p.sol * k];
      const achille: P[] = [[17, 58.6], [10, 58.2], [4.8, 55.6], [2.6, 50], [3.8, 44], [7, 36], [10.6, 26], [13, 15], [12.6, 4]];
      const queues: P[][] = [[[12.6, 4], [11, -12], [9.4, -28]], [[12.6, 4], [15.6, -12], [19.2, -27]]];
      const voute: P[] = [[23, 58.6], [32, 53.6], [44, 52.6], [56, 52.4], [67, 55.6], [75, 57.8], [83, 58.8]];
      const tA = new Trait(b).ajouter(transf(bandeFermee(achille, 3), m));
      for (const q of queues) tA.ajouter(transf(bandeFermee(q, 1.9), m), { tension: 0.3 });
      return [transf(p.trait, m), tA.pts, transf(bandeFermee(voute, 2.5), m)];
    }
    case 'verrue': {
      // Verrue plantaire : la plante du pied droit (vue de dessous) à gauche et, à droite, le médaillon : les lignes de la peau
      // s'arrêtent au bord de la verrue (le trait contourne la lésion), puis la verrue elle-même. Un repère fin relie la 2e tête
      // métatarsienne au médaillon (aucun anneau ni point posé sur la peau).
      const mp = pose(46, 111, 66, 92, 0.7, 4, true);
      const pied = new Trait(b).ajouter(partirDe(transf(contourPied(), mp), appliquer(mp, [76, 196]), 12)).pts;
      const z = { x: 176, y: 86, r: 46 }, rv = 13;
      const t = new Trait(b).ajouter(ellipse(z.x, z.y, z.r, z.r, 180, 1, 0, 64));
      // Lignes de la peau en serpentin : chaque ligne horizontale va d'un bord du médaillon à l'autre ; celles qui croisent la
      // verrue la contournent en suivant son bord (les lignes ne la traversent jamais)
      // Ligne légèrement bombée (dermatoglyphes), échantillonnée de xa à xb
      const ligneDe = (xa: number, xb: number, y: number): P[] => Array.from({ length: 13 }, (_, j) => { const x = xa + ((xb - xa) * j) / 12; return [x, y + 2.4 * (1 - ((x - z.x) / z.r) ** 2)] as P; });
      for (let i = 0; i < 9; i++) {
        const y = z.y - 36 + i * 8.6, w = Math.sqrt(Math.max(0, z.r ** 2 - (y - z.y) ** 2)) - 3, sens = i % 2 ? -1 : 1;
        const x0 = z.x - sens * w, x1 = z.x + sens * w, dy = y - z.y;
        if (Math.abs(dy) < rv + 2) {
          const wv = Math.sqrt((rv + 2) ** 2 - dy ** 2), aG = Math.atan2(dy, -wv), aD = Math.atan2(dy, wv);
          const [a0, a1] = sens > 0 ? [aG, aD] : [aD, aG];
          const arc = Array.from({ length: 17 }, (_, j) => { const a = a0 + (j / 16) * (a1 - a0); return [z.x + (rv + 2) * Math.cos(a), z.y + (rv + 2) * Math.sin(a)] as P; });
          t.ajouter(ligneDe(x0, z.x - sens * wv, y), { tension: 0.3 }).ajouter(arc).ajouter(ligneDe(z.x + sens * wv, x1, y));
        } else t.ajouter(ligneDe(x0, x1, y), { tension: 0.3 });
      }
      const verrue = new Trait(b).ajouter(ellipse(z.x, z.y, rv, rv - 0.6, 200, 1, 0, 40)).ajouter(ellipse(z.x + 1, z.y + 1, 4, 3.4, 20, 1, 0, 20), { tension: 0.4 });
      return [pied, t.pts, verrue.pts];
    }
    case 'laser': {
      // Laser : la plante du pied droit (vue de dessous), la pièce à main (même gabarit que le dessin « laser ») et le faisceau
      // étroit qui s'arrête à la surface, sous la 2e tête métatarsienne
      const k = 0.72, mp: Affine = [-k, 0, 0, k, 34 + 92 * k, 16];
      const pied = new Trait(b).ajouter(partirDe(transf(contourPied(), mp), appliquer(mp, [76, 196]), 12)).pts;
      const [mx, my] = CONTOUR_PIED.mtp[1], s = appliquer(mp, [mx, my + 6]), tip: P = [150, 40];
      const u = norme([s[0] - tip[0], s[1] - tip[1]]), ang = (Math.atan2(-u[1], -u[0]) * 180) / Math.PI;
      const corps = sousChemins('M6 -4 L22 -6.5 L72 -6.5 C76 -6.5 78 -4 78 0 C78 4 76 6.5 72 6.5 L22 6.5 L6 4 C3 3.6 2 2 2 0 C2 -2 3 -3.6 6 -4 Z', 0.4)[0].pts;
      const cable = sousChemins('M78 0 C88 0 92 8 98 16', 0.4)[0].pts;
      const piece = new Trait(b).ajouter(transf(partirDe(corps, [78, 0], 1), pose(0, 0, tip[0], tip[1], 1, ang))).ajouter(transf(cable, pose(0, 0, tip[0], tip[1], 1, ang)));
      const n: P = [-u[1], u[0]];
      const faisceau: P[] = [[tip[0] + n[0] * 1.6, tip[1] + n[1] * 1.6], [s[0] + n[0] * 3, s[1] + n[1] * 3], [s[0] - n[0] * 3, s[1] - n[1] * 3], [tip[0] - n[0] * 1.6, tip[1] - n[1] * 1.6]];
      return [pied, piece.pts, echantillon(faisceau)];
    }
    case 'orthonyxie': case 'onychoplastie': case 'mycose': case 'ongle-epais': case 'cor': case 'orthoplastie': case 'domicile':
      return parcoursSoin(nom, b);
    case 'fauteuil': case 'autoclave': case 'podoscope':
      return parcoursEquipement(nom, b, equipement);
  }
  return [];
}

/** Bande de largeur constante (2 × demi) autour d'un axe (points de passage) : contour fermé, bouts arrondis */
function bandeFermee(axe: P[], demi: number): P[] {
  const c = echantillon(axe, false, 0.5);
  const nrm = (i: number): P => { const a = c[Math.max(0, i - 1)], z = c[Math.min(c.length - 1, i + 1)]; const t = norme([z[0] - a[0], z[1] - a[1]]); return [-t[1], t[0]]; };
  const gauche = c.map((p, i) => [p[0] + nrm(i)[0] * demi, p[1] + nrm(i)[1] * demi] as P), droite = c.map((p, i) => [p[0] - nrm(i)[0] * demi, p[1] - nrm(i)[1] * demi] as P);
  const bout = (p: P, n: P, sens: number): P[] => Array.from({ length: 9 }, (_, j) => { const a = (j / 8) * Math.PI * sens; const ca = Math.cos(a), sa = Math.sin(a); return [p[0] + (n[0] * ca - n[1] * sa) * demi, p[1] + (n[0] * sa + n[1] * ca) * demi] as P; });
  const nf = nrm(c.length - 1), nd = nrm(0);
  return [...gauche, ...bout(c[c.length - 1], nf, -1).slice(1, -1), ...inverse(droite), ...bout(c[0], [-nd[0], -nd[1]], -1).slice(1, -1), gauche[0]];
}

/** Courbe lisse (Catmull-Rom → Bézier) passant par des points, en tracé SVG (unités du repère des points) */
function lisse(pts: P[], ferme = false): string {
  const n = pts.length, Q = (i: number) => (ferme ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < (ferme ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [Q(i - 1), Q(i), Q(i + 1), Q(i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return ferme ? `${d} Z` : d;
}
const echantillon = (pts: P[], ferme = false, pas = 0.4) => sousChemins(lisse(pts, ferme), pas)[0].pts;

/**
 * Fiches de soins de la migration 0020 (2026-10-05), au trait continu, parcours des formes de bibliotheque/soins-ongles.ts (mêmes
 * points, jamais redessinés) : 1 à 3 traits par dessin. Revue « trait continu » (pieges-illustration.md) : la lame est un trait à part
 * (jamais reliée au bout de l'orteil : « entaille »), aucune boucle posée sur le contour de la peau (« bouton »), les seules boucles
 * sont dans l'objet (boucle d'activation de l'agrafe).
 */
function parcoursSoin(nom: 'orthonyxie' | 'onychoplastie' | 'mycose' | 'ongle-epais' | 'cor' | 'orthoplastie' | 'domicile', b: BouclesLigne): P[][] {
  const R = reglage(b);
  // Gros plan de l'hallux (fenêtre 112 × 158 de hallux-gros-plan.ts) agrandi ×1,45, l'avant-pied sort du cadre en bas
  const mH: Affine = [1.45, 0, 0, 1.45, 65.5, -4];
  const peauHallux = () => {
    const t = new Trait(b).ajouter(transf(echantillon([...MEDIAL, ...LATERAL_NORMAL, ...VOISINS.slice(0, -2)]), mH));
    return R.final ? t.entree(R.queue * 0.6, 0.2).pts : t.pts;
  };
  const lame = (pts: P[]) => partirDe(transf(echantillon(pts, true), mH), appliquer(mH, [22.4, 50]), 1.2);
  switch (nom) {
    case 'orthonyxie': {
      // Contour, lame, puis l'agrafe : crochet sous le bord médial, fil, boucle d'activation (un tour), fil, crochet sous le bord latéral
      const y = AGRAFE_Y, cx = 37.6, rb = 3.4;
      const fil = new Trait(b).ajouter(transf(echantillon([[20.2, 44.2], [20.5, 41.6], [22.8, y], [30, y], [cx, y]]), mH));
      fil.ajouter(transf(Array.from({ length: 41 }, (_, k) => { const a = Math.PI / 2 + (k / 40) * 2 * Math.PI; return [cx + rb * Math.cos(a), y - rb + rb * Math.sin(a)] as P; }), mH));
      fil.ajouter(transf(echantillon([[cx, y], [45, y], [52.4, y], [54.8, 41.6], [55, 44.2]]), mH));
      return [peauHallux(), lame(LAME), fil.pts];
    }
    case 'onychoplastie': {
      // Contour, lame, puis la plaque de résine : front de repousse, bords et bord libre de la partie distale, en retrait de la lame
      const plaque: P[] = [[24.4, 46.6], [28, 45.2], [37.6, 44.4], [47.2, 45.2], [50.8, 46.6], [51.2, 36], [50.4, 28.4], [48.8, 26.8], [37.6, 26.2], [26.4, 26.8], [24.8, 28.4], [24, 36]];
      return [peauHallux(), lame(LAME), partirDe(transf(echantillon(plaque, true), mH), appliquer(mH, [24.4, 46.6]), 1)];
    }
    case 'mycose': {
      // Contour, lame au bord libre effrité (prolongée par la ligne des couches du bord épaissi), puis le front de la zone atteinte
      const l = lame(LAME_MYCOSE);
      const t = new Trait(b).ajouter(l).ajouter(transf(echantillon([[23.6, 30.4], [37.6, 29.4], [51.6, 30.4]]), mH), { tension: 0.4 });
      return [peauHallux(), t.pts, transf(echantillon(FRONT_MYCOSE.slice(1, -1)), mH)];
    }
    case 'ongle-epais': {
      // L'hallux de profil (POD-AT-0003, état « ongle-epais ») recadré ×1,6 : dos du pied → hallux → plante (hors cadre) ; l'ongle
      // épaissi ; la pièce à main et sa fraise posée sur le dos de l'ongle
      const corps = FORMES['pied-profil-ongle-epais'].corps;
      const chemin = (debut: string) => { const i = corps.lastIndexOf(`d="${debut}`); return corps.slice(i + 3, corps.indexOf('"', i + 3)); };
      const m: Affine = [1.6, 0, 0, 1.6, -342 * 1.6, -334 * 1.6];
      const contour = sousChemins(chemin('M48,-160 C52,-60 62,30 76,120 C86,190 95,244 95,288 C95,326 82,352 68,372 C59,385'), 0.5);
      const dos = inverse(contour[1].pts), plante = inverse(contour[0].pts);
      const hallux = sousChemins(chemin('M358,377 C372,382'), 0.5)[0].pts;
      // Le contour de l'hallux passe SOUS l'ongle : le trait quitte la peau à l'entrée de l'ongle, suit le dessus et le bord libre de
      // la lame, et reprend la peau à la sortie ; le dessous de la lame (contact avec le lit) est le 2e trait
      const ongle = sousChemins(chemin('M421,391.5'), 0.4)[0].pts;
      const dedans = hallux.map(([x, y]) => dansPolygone(ongle, x, y));
      const i = dedans.indexOf(true), j = dedans.lastIndexOf(true);
      const proche = (q: P) => ongle.reduce((k, o, n) => (dist(o, q) < dist(ongle[k], q) ? n : k), 0);
      const kE = proche(hallux[Math.max(0, i - 1)]), kX = proche(hallux[Math.min(hallux.length - 1, j + 1)]);
      const dessus = kE <= kX ? ongle.slice(kE, kX + 1) : [...ongle.slice(kE), ...ongle.slice(0, kX + 1)];
      const dessous = kE <= kX ? [...ongle.slice(kX), ...ongle.slice(0, kE + 1)] : ongle.slice(kX, kE + 1);
      const peau = new Trait(b).ajouter(transf([...dos, ...hallux.slice(0, i), ...dessus, ...hallux.slice(j + 1), ...plante], m)).pts;
      return [peau, transf(dessous, m), transf(contourFraise(), m)];
    }
    case 'cor': {
      // Schéma classique (v3, 2026-10-06) : la plante du pied droit vue de dessous (même pose que « pied-dessous »), puis le contour
      // de la plaque du durillon sous les têtes des 2e et 3e métatarsiens (bibliotheque/soins-ongles.ts : PLAQUE_DURILLON)
      const m = pose(46, 111, 122, 92, 0.7, 6, true);
      const pied = new Trait(b).ajouter(partirDe(transf(contourPied(), m), appliquer(m, [76, 196]), 12));
      if (R.final) pied.entree(R.queue, 0.35);
      return [pied.pts, partirDe(transf(echantillon(PLAQUE_DURILLON, true), m), appliquer(m, PLAQUE_DURILLON[0]), 1.5)];
    }
    case 'orthoplastie': {
      // Schéma classique (v3, 2026-10-06) : l'avant-pied vu de dessus (contour et ongles d'un seul trait, comme « ongle »), les bords
      // du pied sortent en bas ; puis le manchon en silicone qui coiffe le 2e orteil sur l'IPP (MANCHON_ORTHO)
      const m = pose(49.3, 50, 120, 104, 1.9, 0);
      const c = contourDos({ ongles: true }).filter(([, y]) => y < 110);
      return [new Trait(b).ajouter(transf(c, m)).pts, partirDe(transf(echantillon(MANCHON_ORTHO, true), m), appliquer(m, MANCHON_ORTHO[0]), 1)];
    }
    case 'domicile': {
      // Maison (sol, porte, murs, toit), puis la mallette posée au sol avec sa poignée, puis le micromoteur et sa pièce à main
      const sol = 150;
      const maison = morceaux(`M4 ${sol} H60 V118 C60 115.8 61.8 114 64 114 H74 C76.2 114 78 115.8 78 118 V${sol} H112 V92.5 L120 100 L69 52 L18 100 L26 92.5 V${sol}`, 0.5)[0];
      const mallette = morceaux(`M112 ${sol} H136 C134.9 ${sol} 134 149.1 134 148 V118 C134 115.8 135.8 114 138 114 H154 V108 C154 105.8 155.8 104 158 104 H172 C174.2 104 176 105.8 176 108 V114 H192 C194.2 114 196 115.8 196 118 V148 C196 149.1 195.1 ${sol} 194 ${sol} H204 V132 C204 130.9 204.9 130 206 130 H230 C231.1 130 232 130.9 232 132 V${sol} H236`, 0.5)[0];
      const piece = morceaux('M209 126.4 L227.4 112.6 C228.6 111.7 230.2 112 231 113.2 C231.8 114.4 231.5 116 230.3 116.8 L211.8 130.4 Z', 0.4)[0];
      return [new Trait(b).ajouter(maison).pts, new Trait(b).ajouter(mallette).pts, piece];
    }
  }
}

/** Silhouette du pied du tout-petit (pied.ts : PLANTE_ENFANT, ORTEILS_ENFANT ; même construction que le dessin « enfant ») */
function silhouetteEnfant(): string {
  // Bord de la plante jusqu'aux commissures, puis l'arrondi de chaque orteil (du 5e à l'hallux) : orteils intégrés au contour
  const plante = PLANTE_ENFANT, orteils = ORTEILS_ENFANT;
  const sur = ([cx, cy, rx, ry, r]: (typeof orteils)[number], a: number): P => {
    const t = (r * Math.PI) / 180, u = (a * Math.PI) / 180;
    return [cx + rx * Math.cos(u) * Math.cos(t) - ry * Math.sin(u) * Math.sin(t), cy + rx * Math.cos(u) * Math.sin(t) + ry * Math.sin(u) * Math.cos(t)];
  };
  const finBord = plante.findIndex((p, i) => i > plante.length / 3 && p[1] < 60);
  const points: P[] = plante.slice(0, finBord + 1).filter((_, i) => i % 2 === 0);
  [...orteils].reverse().forEach((o, j) => {
    const i = orteils.length - 1 - j;
    points.push(...(i === 0 ? [4, 316, 270, 224, 176] : [354, 300, 240, 186]).map((a) => sur(o, a)));
    const suivant = orteils[i - 1];
    if (suivant) { const [x1] = sur(o, 180), [x2] = sur(suivant, 0); points.push([(x1 + x2) / 2, (o[1] + suivant[1]) / 2 + (0.3 * (o[3] + suivant[3])) / 2]); }
  });
  return lisser(points);
}

// ———————————————————————————————————————————————————— Matériel : parcours des dessins revus (svgEquipement, repère 120 × 90)

/** Tracés d'un dessin de matériel (registre pédagogique) : chemins et cercles au trait, dans l'ordre du dessin, en morceaux */
function piecesEquipement(svg: string): P[][] {
  const pieces: P[][] = [];
  for (const m of svg.matchAll(/<(path|circle)\b([^>]*)>/g)) {
    const a = m[2], cl = a.match(/class="([^"]*)"/)?.[1] ?? '';
    if (/\b(zone|guide|eau|peau-seule|miroir|empreinte|cote|faisceau|maillage|vibration|poussieres|tuyau|sol)\b/.test(cl) || !/\b(trait|fin|filament)\b/.test(cl)) continue;
    if (m[1] === 'circle') {
      const [cx, cy, r] = ['cx', 'cy', 'r'].map((k) => +(a.match(new RegExp(`\\s${k}="([^"]*)"`))?.[1] ?? 0));
      pieces.push(ellipse(cx, cy, r, r, -90, 1, 0, 28));
    } else pieces.push(...morceaux(a.match(/\sd="([^"]*)"/)?.[1] ?? '', 0.4));
  }
  return pieces;
}
/**
 * Ordre de parcours du matériel : groupes de morceaux (indices de piecesEquipement), un groupe = un trait ; « ~i » = morceau
 * parcouru à l'envers, « o » après un indice = boucle de raccord. Établi sur les dessins revus « justes » (2026-10-04).
 */
const ORDRE_EQUIPEMENT: Record<'fauteuil' | 'autoclave' | 'podoscope', { id: string; groupes: string[][] }> = {
  // 0 têtière, 1 dossier, 2 assise, 3 repose-jambes, 4 appui des pieds, 5-6 accoudoir, 7-8 colonne, 9 socle, 10 pédale
  fauteuil: { id: 'fauteuil-soins', groupes: [['0', '1', '2', '3'], ['~7', '9', '8']] },
  // 0 cuve, 1 hublot, 2-3 plateaux d'instruments (parcourus en aller-retour), 4 poignée, 5 afficheur du cycle ; détails omis
  autoclave: { id: 'autoclave-classe-b', groupes: [['0'], ['1', '3', '~2'], ['5']] },
  // 0 dessus, 1 rebord de la vitre, 2 côté, 3 façade (miroir), 36-39 jambes : voir parcoursPodoscope
  podoscope: { id: 'podoscope', groupes: [['0', '2', '3']] },
};
const ferme = (p: P[]) => p.length > 3 && dist(p[0], p[p.length - 1]) < 0.8;

function parcoursEquipement(nom: 'fauteuil' | 'autoclave' | 'podoscope', b: BouclesLigne, equipement: (id: string) => string): P[][] {
  const o = ORDRE_EQUIPEMENT[nom];
  const pieces = piecesEquipement(equipement(o.id)).map((p) => p.map(([x, y]) => [x * 2, y * 2] as P));
  const traits = o.groupes.map((g) => {
    const t = new Trait(b);
    g.forEach((cle, j) => {
      const inv = cle.startsWith('~'), boucle = cle.endsWith('o'), i = parseInt(cle.replace(/[~o]/g, ''), 10);
      let p = pieces[i];
      if (!p) return;
      // Forme fermée : parcourue depuis son point le plus proche du trait (pont le plus court) ; si un morceau suit, le trait
      // continue sur le bord déjà tracé jusqu'au point le plus proche de ce morceau (retracé invisible, pont court)
      if (ferme(p) && t.pts.length) p = partirDe(p, t.fin, 3);
      const suivant = g[j + 1] !== undefined ? pieces[parseInt(g[j + 1].replace(/[~o]/g, ''), 10)] : undefined;
      if (ferme(p) && suivant) {
        const cible = (q: P) => Math.min(...suivant.map((x) => dist(x, q)));
        let k = 0; p.forEach((q, n) => { if (cible(q) < cible(p[k])) k = n; });
        p = [...p, ...p.slice(1, k + 1)];
      }
      t.ajouter(inv ? inverse(p) : p, { tension: 0.5 });
      if (boucle) t.boucle(-1);
    });
    return t.pts;
  }).filter((p) => p.length > 1);
  if (nom === 'podoscope') {
    // Façade : le miroir incliné (où se lisent les appuis), dans le même trait que le caisson
    const miroir = equipement(o.id).match(/class="miroir" d="([^"]*)"/)?.[1];
    if (miroir && traits[0]) { const t = new Trait(b); t.pts = traits[0]; const p = morceaux(miroir, 0.4)[0].map(([x, y]) => [x * 2, y * 2] as P); t.ajouter(partirDe(p, t.fin, 3), { tension: 0.4 });
      // Reflet des plantes (mêmes poses que le dessin du matériel revu : renversées dans le miroir incliné)
      for (const r of [[-0.1, 0, 0, -0.1, 59.2, 84.4], [0.1, 0, 0, -0.1, 74, 84.4]] as Affine[]) t.ajouter(partirDe(transf(contourPied(), r.map((v) => v * 2) as Affine), t.fin, 2), { tension: 0.4 });
    }
    // Les deux jambes debout sur la vitre : chaque jambe descend (bord extérieur), fait le tour du pied, remonte (bord intérieur).
    // Pieds : contour du pied réel (CONTOUR_PIED) posé comme dans le dessin du matériel (vue de 3/4, raccourci en profondeur).
    const poses: Affine[] = [[-0.13, 0, -0.05, -0.055, 50, 60], [0.13, 0, -0.05, -0.055, 64, 60]].map((m) => m.map((v) => v * 2) as Affine);
    const jambes = [[36, 37], [38, 39]];
    poses.forEach((m, k) => {
      const [a, c] = jambes[k].map((i) => pieces[i]).map((p) => (p[0][1] < p[p.length - 1][1] ? p : inverse(p)));
      const pied = transf(contourPied(), m);
      const t = new Trait(b).ajouter(a);
      t.ajouter(partirDe(pied, t.fin, 2), { tension: 0.4 }).ajouter(inverse(c), { tension: 0.4 });
      traits.push(t.pts);
    });
  }
  return traits;
}

// ———————————————————————————————————————————————————— API

let equipementSvg: (id: string) => string = () => '';
/** Branche le dessin du matériel (dessins.ts) sans import circulaire */
export const brancherEquipements = (f: (id: string) => string) => { equipementSvg = f; };

const memo = new Map<string, { d: string; longueur: number }[]>();
/**
 * Chemins d'un dessin au trait continu (repère 240 × 180) : tracés `d` et longueurs relatives, pour le site, l'admin et le moteur
 * de contenus (qui anime le tracé image par image : stroke-dashoffset = 1 − progression, sur pathLength 1).
 */
export function cheminsLigne(nom: NomLigne, o: Pick<OptionsLigne, 'boucles'> = {}): { vue: readonly [number, number, number, number]; chemins: { d: string; longueur: number; debut: number; part: number }[] } {
  const b = o.boucles ?? LIGNE.defaut.boucles;
  const cle = `${nom}|${b}`;
  let c = memo.get(cle);
  if (!c) { c = parcours(nom, b, equipementSvg).flatMap((p) => rogner(p)).map(ecrire).filter((x) => x.d); memo.set(cle, c); }
  const total = c.reduce((s, x) => s + x.longueur, 0) || 1;
  let cumul = 0;
  return {
    vue: [0, 0, 240, 180],
    chemins: c.map((x) => { const debut = cumul / total; cumul += x.longueur; return { ...x, debut: +debut.toFixed(3), part: +(x.longueur / total).toFixed(3) }; }),
  };
}

/** Contenu SVG (chemins) d'un dessin en ligne : un <path> par trait, styles en attributs (fichiers externes : WebKit) */
export function contenuLigne(nom: NomLigne, o: OptionsLigne = {}): string {
  const ep = LIGNE.epaisseur[o.epaisseur ?? LIGNE.defaut.epaisseur] * (o.echelleTrait ?? 1);
  const couleur = o.couleur === 'accent' ? 'var(--dessin-accent, var(--accent))' : 'var(--dessin-ligne, var(--dessin-trait, currentColor))';
  return cheminsLigne(nom, o).chemins
    .map((c) => `<path class="ligne" pathLength="1" d="${c.d}" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:${couleur};stroke-width:${r1(ep * 100) / 100};--ligne-debut:${c.debut};--ligne-part:${c.part}"></path>`)
    .join('');
}

/** Dessin au trait continu complet (<svg>…</svg>, repère 240 × 180), décoratif */
export function svgLigne(nom: NomLigne, o: OptionsLigne & { classe?: string; nomClasse?: string } = {}): string {
  const classes = ['dessin', `dessin--${o.nomClasse ?? nom}`, 'dessin--ligne', o.trace ? 'ligne-auto' : '', o.classe].filter(Boolean).join(' ');
  return `<svg class="${echapper(classes)}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${contenuLigne(nom, o)}</svg>`;
}

/** Chaque dessin du registre relevé / pédagogique et son équivalent au trait continu */
export const LIGNE_DESSIN: Record<string, NomLigne> = {
  analyse: 'empreintes', appuis: 'pied-dessous', semelle: 'semelle', soin: 'pieds-dessus', diabete: 'monofilament', sport: 'chaussure-course',
  enfant: 'premiers-pas', equilibre: 'empreintes', talon: 'talon', ongle: 'ongle', laser: 'laser', senior: 'senior-canne',
  taping: 'taping', verrue: 'verrue', voutes: 'pied-profil', 'arriere-pied': 'pieds-dessus',
  orthonyxie: 'orthonyxie', onychoplastie: 'onychoplastie', orthoplastie: 'orthoplastie', mycose: 'mycose', 'cors-durillons': 'cor',
  'ongles-epais': 'ongle-epais', domicile: 'domicile',
};
/** Matériel : dessin au trait continu dédié (les autres équipements sont parcourus automatiquement, en 3 traits au plus) */
export const LIGNE_EQUIPEMENT: Record<string, NomLigne> = {
  'fauteuil-soins': 'fauteuil', 'autoclave-classe-b': 'autoclave', podoscope: 'podoscope', 'monofilament-diapason': 'monofilament',
};
/** Animations d'accueil : dessin au trait continu du même sujet */
export const LIGNE_ANIMATION: Record<string, NomLigne> = { podoscope: 'empreintes', coureur: 'marche', trajectoire: 'pied-dessous', 'premiers-pas': 'premiers-pas', semelle: 'semelle' };
/** Formes de la bibliothèque (bibliotheque/formes.ts) et leur équivalent au trait continu ; les autres gardent le rendu pédagogique */
export const LIGNE_FORME: Record<string, NomLigne> = {
  'pied-dorsal': 'pied-dessus', 'pied-plantaire': 'pied-dessous', empreinte: 'empreintes', 'pied-profil-medial': 'pied-profil',
  'pied-profil-ongle-epais': 'pied-profil', 'pied-profil-anatomie': 'pied-profil', 'pied-profil-anatomie-epine': 'pied-profil', 'aponevrose-plantaire': 'pied-profil',
  'hallux-dorsal': 'ongle', 'hallux-dorsal-incarne': 'ongle', 'hallux-dorsal-incarne-sites': 'ongle', 'hallux-gros-plan': 'ongle', 'hallux-gros-plan-incarne': 'ongle',
  'semelle-dorsal': 'semelle', 'semelle-dessous': 'semelle', 'semelle-ortho-dessus': 'semelle', 'semelle-ortho-dessous': 'semelle',
  'chaussure-running-profil': 'chaussure-course', 'chaussure-running-trois-quarts': 'chaussure-course',
  'hallux-gros-plan-orthonyxie': 'orthonyxie', 'ongle-coupe-orthonyxie': 'orthonyxie', 'hallux-gros-plan-onychoplastie': 'onychoplastie',
  'hallux-gros-plan-mycose': 'mycose', 'pied-profil-ongle-epais-meulage': 'ongle-epais', 'orteil-griffe-cor': 'cor', 'orteil-griffe-orthoplastie': 'orthoplastie',
};

/**
 * Matériel dessiné le 2026-10-06 : ordre de parcours au trait continu (indices des morceaux de piecesEquipement du dessin
 * pédagogique, 120 × 90) ; un groupe = un trait (3 au plus) ; « ~i » = morceau parcouru à l'envers, « a-b » = morceaux a à b dans
 * l'ordre. Les détails fins (lignes de texte, graduations) sont omis : le trait garde la silhouette qui fait reconnaître l'objet.
 */
export const ORDRE_MATERIEL: Record<string, string[][]> = {
  'sachets-individuels': [['4', '6'], ['7'], ['0', '2', '3']],
  'tracabilite-sterilisation': [['0'], ['1'], ['6', '8', '12']],
  'bac-ultrasons': [['1', '0', '2', '3'], ['5', '~6', '7'], ['8', '10']],
  stabilometrie: [['0', '1', '2', '4', '3'], ['5-20'], ['21-36']],
  'empreinte-mousse': [['0', '2', '4', '3'], ['6-21'], ['22-37']],
  thermoformage: [['0', '1', '2'], ['7', '8']],
  'touret-poncage': [['15', '7', '5', '1', '6', '8', '16'], ['0']],
  laser: [['0', '6', '7'], ['1'], ['13', '9']],
  'lampe-loupe': [['0', '1', '4', '9', '7'], ['8']],
};

/** Dessin au trait continu d'un équipement selon son ordre de parcours (ORDRE_MATERIEL), repère 120 × 90 */
export function contenuLigneGroupes(svgPedagogique: string, groupes: string[][], o: OptionsLigne = {}): string {
  const b = o.boucles ?? LIGNE.defaut.boucles;
  const pieces = piecesEquipement(svgPedagogique);
  const indices = (cle: string): { i: number; inv: boolean }[] => {
    const inv = cle.startsWith('~'), c = cle.replace('~', '');
    const [a, z] = c.includes('-') ? c.split('-').map(Number) : [Number(c), Number(c)];
    return Array.from({ length: z - a + 1 }, (_, k) => ({ i: a + k, inv }));
  };
  const traits = groupes.map((g) => {
    const t = new Trait(b);
    for (const { i, inv } of g.flatMap(indices)) {
      let p = pieces[i];
      if (!p) continue;
      if (ferme(p) && t.pts.length) p = partirDe(p, t.fin, 2);
      t.ajouter(inv ? inverse(p) : p, { tension: 0.5 });
    }
    return t.pts;
  }).filter((p) => p.length > 1);
  return ecrireTraits(traits, o);
}

/** Chemins SVG (registre ligne) de polylignes déjà enchaînées : épaisseur, couleur et parts du tracé en attributs */
function ecrireTraits(traits: P[][], o: OptionsLigne): string {
  const ecrits = traits.map(ecrire);
  const total = ecrits.reduce((s, x) => s + x.longueur, 0) || 1;
  const ep = LIGNE.epaisseur[o.epaisseur ?? LIGNE.defaut.epaisseur] * (o.echelleTrait ?? 1);
  const couleur = o.couleur === 'accent' ? 'var(--dessin-accent, var(--accent))' : 'var(--dessin-ligne, var(--dessin-trait, currentColor))';
  let cumul = 0;
  return ecrits.map((c) => { const debut = cumul / total; cumul += c.longueur; return `<path class="ligne" pathLength="1" d="${c.d}" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:${couleur};stroke-width:${r1(ep * 100) / 100};--ligne-debut:${+debut.toFixed(3)};--ligne-part:${+(c.longueur / total).toFixed(3)}"></path>`; }).join('');
}

/**
 * Matériel sans dessin dédié : les traits du dessin revu (registre pédagogique) enchaînés automatiquement, du plus proche au plus
 * proche, en 3 traits au plus (un nouveau trait quand le saut dépasse `saut` unités). Repère 120 × 90.
 */
export function contenuLigneAuto(svgPedagogique: string, o: OptionsLigne = {}, saut = 26): string {
  const b = o.boucles ?? LIGNE.defaut.boucles;
  const restes = piecesEquipement(svgPedagogique);
  const traits: P[][] = [];
  let t = new Trait(b);
  while (restes.length) {
    if (!t.pts.length) { t.ajouter(restes.shift()!); continue; }
    let k = 0, inv = false, dm = Infinity;
    restes.forEach((p, i) => { for (const [q, v] of [[p[0], false], [p[p.length - 1], true]] as const) { const d = dist(t.fin, q); if (d < dm) { dm = d; k = i; inv = v; } } });
    const p = restes.splice(k, 1)[0];
    if (dm > saut && traits.length < 2) { traits.push(t.pts); t = new Trait(b).ajouter(inv ? inverse(p) : p); }
    else t.ajouter(inv ? inverse(p) : p, { tension: 0.5 });
  }
  if (t.pts.length) traits.push(t.pts);
  const ecrits = traits.map(ecrire);
  const total = ecrits.reduce((s, x) => s + x.longueur, 0) || 1;
  const ep = LIGNE.epaisseur[o.epaisseur ?? LIGNE.defaut.epaisseur] * (o.echelleTrait ?? 1);
  const couleur = o.couleur === 'accent' ? 'var(--dessin-accent, var(--accent))' : 'var(--dessin-ligne, var(--dessin-trait, currentColor))';
  let cumul = 0;
  return ecrits.map((c) => { const debut = cumul / total; cumul += c.longueur; return `<path class="ligne" pathLength="1" d="${c.d}" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:${couleur};stroke-width:${r1(ep * 100) / 100};--ligne-debut:${+debut.toFixed(3)};--ligne-part:${+(c.longueur / total).toFixed(3)}"></path>`; }).join('');
}
