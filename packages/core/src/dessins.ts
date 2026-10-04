// Dessins techniques de la marque, en chaîne SVG : source unique du site (components/dessins/Dessin.astro,
// simple enveloppe), des animations d'accueil (components/animations/*) et de l'aperçu de l'admin.
// Trait anatomique fin, contours en pointillés (relevé de podoscope), trame hexagonale de points colorés par
// la pression, courbes de niveau. Même géométrie de pied partout (pied.ts), même trame (trame.ts).
// Couleurs (surchargeables par le parent) : --dessin-trait, --dessin-accent, --dessin-fond ; le reste vient
// de la charte. Les styles sont dans dessins.css (importé une fois par le site et par l'admin).
// Les traits marqués « trace » se dessinent quand le bloc parent apparaît (.pret.vu).
//
// Deux registres pour chaque dessin :
// - « releve » (par défaut) : langage du relevé de podoscope — trame de points colorés par la pression,
//   légendes graduées, lectures en mono ;
// - « pedagogique » : schéma de manuel d'anatomie — trait monochrome (--dessin-trait), un seul accent doux
//   (--dessin-accent), aplat clair (--dessin-fond), étiquettes simples ; ni trame, ni lecture, ni légende.
//
// svgAnimationFixe : image fixe et fidèle de chaque animation d'accueil, pour les aperçus (fond transparent,
// l'appelant pose le fond sombre « plan ») ; en registre pédagogique, le schéma calme du même sujet.
import { CONTOUR_PIED, EMPREINTE, ORTEILS, PLANTE, PLANTE_ENFANT, ORTEILS_ENFANT, TRAJET, TRAJET_POINTS, SEMELLE, SEMELLE_POINTS, SEMELLE_ELEMENTS, SEMELLE_PROFIL, EMPREINTES, largeurA, piedCroissance, piedDeProfil, dansPolygone, dansPulpe, lisser, type P, type Voute } from './pied';
import { trame, pointsTrame, grouperTrame, isolignes, dansPlante, pression, type Appui, type Champ } from './trame';
import { PRESSION, ARRETS_PRESSION, couleurPression, type NomDessin } from './univers';
import { TRAIT, TRAME, NEUTRES, PLAN, POINTILLE, POLICE_MONO, TYPO, CYCLES, transparence } from './charte';
import { pressionPas, PHASE_FIXE } from './pas';
import { poseCoureur, reculParCycle, APPUI } from './foulee';
import { svgForme } from './bibliotheque/rendu';
import type { Animation } from './packs';

/** Registre graphique d'un dessin : relevé de podoscope (données) ou schéma pédagogique (trait seul) */
export type Registre = 'releve' | 'pedagogique';
export const REGISTRES: readonly Registre[] = ['releve', 'pedagogique'];

const r1 = (v: number) => +v.toFixed(1);
const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ———————————————————————————————————————————————————— Géométrie

/** Transformation affine [a, b, c, d, e, f] : x' = a·x + c·y + e, y' = b·x + d·y + f */
type Affine = [number, number, number, number, number, number];
const appliquer = (m: Affine, x: number, y: number): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/**
 * Pied posé dans un dessin : centre de la plante (46, 111) en (cx, cy), orteils orientés selon `angle`
 * (degrés, 0 = vers le haut), échelle `e`, pied gauche par symétrie, `etirement` de la largeur (pied d'enfant).
 */
const poser = (cx: number, cy: number, angle: number, e: number, gauche = false, etirement = 1): Affine => {
  const t = (angle * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t);
  const sx = e * etirement * (gauche ? -1 : 1), sy = e;
  const a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy;
  return [a, b, c, d, cx - a * 46 - c * 111, cy - b * 46 - d * 111];
};
/** Même pose, le point d'appui du talon (48, 205) placé en (hx, hy) */
const poserTalon = (hx: number, hy: number, angle: number, e: number, gauche = false): Affine => {
  const m = poser(0, 0, angle, e, gauche);
  const [x, y] = appliquer(m, 48, 205);
  return [m[0], m[1], m[2], m[3], m[4] + hx - x, m[5] + hy - y];
};
/** Applique une transformation à un tracé en coordonnées absolues (commandes M, C, L, Z) : le trait garde sa graisse */
const transformer = (d: string, m: Affine) =>
  d.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g, (_, x, y) => appliquer(m, +x, +y).map(r1).join(' '));

/** Pulpes des orteils de l'empreinte en tracés fermés (ellipses échantillonnées), transformables comme le contour */
const ellipseTrace = ([cx, cy, rx, ry]: readonly number[], r = 0) => {
  const t = (r * Math.PI) / 180;
  return lisser(Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * 2 * Math.PI;
    return [r1(cx + rx * Math.cos(a) * Math.cos(t) - ry * Math.sin(a) * Math.sin(t)), r1(cy + rx * Math.cos(a) * Math.sin(t) + ry * Math.sin(a) * Math.cos(t))] as P;
  }));
};
const PULPES_TRACE = EMPREINTE.pulpes.map((p) => ellipseTrace(p)).join(' ');
/** Empreinte (trace d'appui + pulpes) en un seul tracé : registre relevé, jamais la peau */
const EMPREINTE_TRACE = `${EMPREINTE.contour} ${PULPES_TRACE}`;
/** Contour du pied réel (plante et orteils), trait seul : contour en pointillés d'un relevé */
const PIED_TRACE = CONTOUR_PIED.plantaire.trait;

/**
 * Pied réel posé par `m` (CONTOUR_PIED, atome ÉcranZen) : aplat (peau-seule) puis contour (trait), détails au trait fin. `vue` :
 * plantaire (plis, coussinet) ou dorsale (ongles, malléoles). Repère du pied droit vu de dessus ; la vue de dessous du pied droit est
 * son miroir (hallux à droite).
 */
function piedReel(m: Affine, vue: 'plantaire' | 'dorsal' = 'plantaire', o: { classe?: string; details?: boolean } = {}): string {
  const v = CONTOUR_PIED[vue];
  const t = (d: string) => transformer(d, m);
  const details = o.details === false ? '' : vue === 'dorsal'
    ? `<path class="fin" d="${t(CONTOUR_PIED.dorsal.plis)}"></path><path class="ongle-dessus ongle-dessus--fin" d="${t(CONTOUR_PIED.dorsal.ongles)}"></path>`
    : `<path class="fin fin--leger" d="${t(CONTOUR_PIED.plantaire.plis)}"></path>`;
  return `${v.peaux.map((p) => `<path class="peau-seule" d="${t(p)}"></path>`).join('')}${details}<path class="trait${o.classe ? ` ${o.classe}` : ''}" d="${t(v.trait)}"></path>`;
}

type Orteils = [number, number, number, number, number][];
/** Le point est-il dans un orteil (ellipse prolongée vers la plante, pour le rattacher au pied) ? */
function dansOrteil(x: number, y: number, [cx, cy, rx, ry, r]: Orteils[number]): boolean {
  const t = (-r * Math.PI) / 180;
  const u = (x - cx) * Math.cos(t) - (y - cy) * Math.sin(t), v = (x - cx) * Math.sin(t) + (y - cy) * Math.cos(t);
  return (u / rx) ** 2 + (v / ry) ** 2 <= 1 || (v > 0 && v < ry + 10 && Math.abs(u) < rx * 0.78);
}
void dansOrteil;
const memoSilhouette = new Map<string, string>();
/**
 * Silhouette simplifiée d'un pied (pied d'enfant, croissance) : le bord de la plante (bord médial, talon, bord latéral) puis, à
 * l'avant, l'arrondi de chaque orteil (ellipses) du 5e à l'hallux, séparés par un petit pli, lissés en un seul tracé fermé. Même
 * structure de points que PLANTE (indice à indice).
 */
function silhouette(plante: P[] = PLANTE, orteils: Orteils = ORTEILS, douce = false): string {
  const cle = JSON.stringify([plante, orteils, douce]);
  const deja = memoSilhouette.get(cle);
  if (deja) return deja;
  const sur = ([cx, cy, rx, ry, r]: Orteils[number], a: number): P => {
    const t = (r * Math.PI) / 180, u = (a * Math.PI) / 180;
    return [r1(cx + rx * Math.cos(u) * Math.cos(t) - ry * Math.sin(u) * Math.sin(t)), r1(cy + rx * Math.cos(u) * Math.sin(t) + ry * Math.sin(u) * Math.cos(t))];
  };
  // Bord de la plante : du haut du bord médial au haut du bord latéral (avant le bord distal par les commissures)
  const finBord = plante.findIndex((p, i) => i > plante.length / 3 && p[1] < 60);
  const points: P[] = plante.slice(0, finBord + 1).filter((_, i) => i % 2 === 0);
  [...orteils].reverse().forEach((o, j) => {
    const i = orteils.length - 1 - j;
    const angles = douce ? (i === 0 ? [340, 300, 250, 200] : [300, 235]) : i === 0 ? [4, 316, 270, 224, 176] : [354, 300, 240, 186];
    points.push(...angles.map((a) => sur(o, a)));
    const suivant = orteils[i - 1];
    if (suivant && !douce) {
      const [x1] = sur(o, 180), [x2] = sur(suivant, 0);
      points.push([r1((x1 + x2) / 2), r1((o[1] + suivant[1]) / 2 + 0.3 * (o[3] + suivant[3]) / 2)]);
    }
  });
  const d = lisser(points);
  memoSilhouette.set(cle, d);
  return d;
}
/** Empreinte du pied de l'enfant (plante comblée ; orteils ronds, détachés comme sur un relevé) */
const dansEnfant = (x: number, y: number) =>
  dansPolygone(PLANTE_ENFANT, x, y) || ORTEILS_ENFANT.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);

/** Courbe ouverte passant par les points (Catmull-Rom) */
function courbe(points: P[]): string {
  const n = points.length;
  const pt = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

/** Enveloppe convexe (polygone d'appui de deux pieds) */
function enveloppe(points: P[]): P[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const bas: P[] = [], haut: P[] = [];
  for (const q of p) { while (bas.length > 1 && x(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
  for (const q of [...p].reverse()) { while (haut.length > 1 && x(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
  return [...bas.slice(0, -1), ...haut.slice(0, -1)];
}
/** Points de la zone de contact (empreinte et pulpes) : polygone de sustentation */
const POINTS_CONTACT: P[] = [...EMPREINTE.polygone, ...EMPREINTE.pulpes.flatMap(([cx, cy, rx, ry]) => [[cx - rx, cy], [cx + rx, cy], [cx, cy - ry]] as P[])];
/** Points du contour d'un pied (plante et pointe des orteils), pour une enveloppe */
const POINTS_PIED: P[] = [...PLANTE, ...CONTOUR_PIED.bouts.map(([x, y]) => [x, y] as P)];

/** Pseudo-aléatoire déterministe (rendu serveur = rendu navigateur) */
const hasard = (graine: number) => () => ((graine = (graine * 16807) % 2147483647) - 1) / 2147483646;

/** Statokinésigramme illustratif : oscillations du centre de pression autour de (cx, cy) */
function oscillations(cx: number, cy: number, ax: number, ay: number, n = 34, graine = 7): string {
  const h = hasard(graine);
  let x = 0, y = 0;
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    x = x * 0.72 + (h() - 0.5) * 0.9; y = y * 0.72 + (h() - 0.5) * 0.9;
    pts.push([cx + x * ax, cy + y * ay]);
  }
  return courbe(pts);
}

// ———————————————————————————————————————————————————— Champs illustratifs (sans valeur de mesure)

const g2 = (x: number, y: number, cx: number, cy: number, sx: number, sy = sx) => Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((y - cy) ** 2) / (2 * sy * sy));
/** Têtes métatarsiennes (repère du pied droit, MTP de l'atome), du 1er au 5e rayon */
const TETES: P[] = CONTOUR_PIED.mtp.map(([x, y]) => [x, y + 6] as P);

/** Distance d'un point au contour d'un polygone */
function distanceBord(poly: P[], x: number, y: number): number {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}
/** Distance d'un point à une polyligne */
function distanceLigne(pts: P[], x: number, y: number): number {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}

/**
 * CARTE DE RELIEF de la semelle thermoformée (hauteur illustrative, sans valeur de mesure ; jamais une carte de pression) : paroi de
 * la cuvette du talon, soutien de voûte (haut au bord médial, en pente vers le 4e rayon), barre rétrocapitale arquée DERRIÈRE les
 * têtes métatarsiennes (POD-AT-0004). Nul hors de la semelle.
 */
export function champRelief(x: number, y: number): number {
  if (!dansPolygone(SEMELLE_POINTS, x, y)) return 0;
  const bord = distanceBord(SEMELLE_POINTS, x, y);
  const cuvette = y > 160 ? 0.85 * Math.exp(-((bord / 6) ** 2)) * Math.min(1, (y - 160) / 22) : 0;
  const paroiMediale = x < 40 && y > 95 && y < 175 ? 0.45 * Math.exp(-((bord / 5) ** 2)) : 0;
  const voute = 1.0 * g2(x, y, 17, 128, 7, 20) + 0.4 * g2(x, y, 38, 136, 11, 16);
  const barre = 0.62 * Math.exp(-((distanceLigne(BARRE_AXE, x, y) / 4.2) ** 2));
  return Math.min(1, 0.06 + cuvette + paroiMediale + voute + barre);
}
/** Axe de la barre rétrocapitale (POD-AT-0004), en arrière des têtes M2–M4 */
const BARRE_AXE: P[] = [[33, 80.5], [44.5, 78.4], [57, 81], [71, 86.5], [78.5, 90.5]];
/** Seuils des courbes de relief, du plus bas au plus haut */
const SEUILS_RELIEF = [0.16, 0.32, 0.48, 0.64, 0.8] as const;
let memoRelief: ReturnType<typeof isolignes> | null = null;
/** Courbes de niveau du relief de la semelle (repère du pied droit) : un groupe de boucles par seuil */
export const courbesRelief = () => (memoRelief ??= isolignes(champRelief, SEUILS_RELIEF, 2, 6, 3));

/** Pied d'enfant qui marche : appui marqué au talon et sous l'avant-pied, voûte encore peu creusée */
const champEnfant = (x: number, y: number) =>
  pression('enfant', x, y) > 0 ? Math.min(1, 0.3 + 0.7 * g2(x, y, 47, 192, 14, 17) + 0.55 * g2(x, y, 42, 60, 17, 12) + 0.5 * g2(x, y, 27, 17, 8) + 0.12 * g2(x, y, 68, 130, 10, 26)) : 0;

// ———————————————————————————————————————————————————— Briques des dessins (repère 240 × 180)

// Échelle d'un pied (repère 92 × 222) dans le dessin.
const E = 0.68;
const piedDroit = (x: number, y: number, e = E) => `translate(${x} ${y}) scale(${e})`;
const piedGauche = (x: number, y: number, e = E) => `translate(${r1(x + 92 * e)} ${y}) scale(${-e} ${e})`;
// Test au monofilament 10 g : 3 sites par pied (IWGDF 2019, HAS) — pulpe de l'hallux, têtes de M1 et de M5 (repère du pied).
export const SITES_MONOFILAMENT: [number, number][] = [[EMPREINTE.pulpes[0][0], EMPREINTE.pulpes[0][1]], TETES[0], TETES[4]];
const SITES = SITES_MONOFILAMENT;

/** Trame de points d'un pied (un tracé par niveau de pression) */
const traceTrame = (appui: Appui, pas?: number) =>
  `<g class="trame">${trame(appui, pas).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" style="--k:${n.k}"></path>`).join('')}</g>`;
/** Trame d'un champ quelconque (repère du pied) */
const traceChamp = (champ: Champ, pas?: number) =>
  `<g class="trame">${grouperTrame(pointsTrame(champ, pas), pas).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" style="--k:${n.k}"></path>`).join('')}</g>`;

/** Trame hexagonale dans un disque (repère du dessin) : valeur maximale au centre, décroissante au bord */
function trameDisque(cx: number, cy: number, r: number, pas: number, garder: (x: number, y: number) => boolean = () => true): string {
  const pts = [];
  for (let rang = 0, y = cy - r; y <= cy + r; rang++, y += pas * 0.866) {
    for (let x = cx - r + (rang % 2 ? pas / 2 : 0); x <= cx + r; x += pas) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d <= 1 && garder(x, y)) pts.push({ x: r1(x), y: r1(y), v: Math.min(1, 1.08 - d * 0.85) });
    }
  }
  return `<g class="trame">${grouperTrame(pts, pas).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" style="--k:${n.k}"></path>`).join('')}</g>`;
}

const mono = (x: number, y: number, t: string, classe = '', ancre = 'start') =>
  `<text class="mono${classe ? ` ${classe}` : ''}" x="${r1(x)}" y="${r1(y)}"${ancre === 'start' ? '' : ` text-anchor="${ancre}"`}>${t}</text>`;
/** Étiquette du registre pédagogique, reliée au point désigné par un renvoi fin */
const etiquette = (x: number, y: number, t: string, ancre: 'start' | 'end' | 'middle' = 'start') =>
  `<text class="etiquette" x="${r1(x)}" y="${r1(y)}"${ancre === 'start' ? '' : ` text-anchor="${ancre}"`}>${t}</text>`;
/** Étiquette sur deux lignes (règle : toujours hors des formes, au bout d'un renvoi, jamais sur un trait) */
const etiquette2 = (x: number, y: number, l1: string, l2: string, ancre: 'start' | 'end' | 'middle' = 'start') =>
  `${etiquette(x, y, l1, ancre)}${etiquette(x, y + 9, l2, ancre)}`;
const renvoi = (x1: number, y1: number, x2: number, y2: number) =>
  `<path class="renvoi" d="M${r1(x1)} ${r1(y1)} L${r1(x2)} ${r1(y2)}"></path><circle class="ancre" cx="${r1(x1)}" cy="${r1(y1)}" r="1.2"></circle>`;
/** Légende graduée verticale de la pression (registre relevé) */
const legende = (degrade: string, x = 218, y = 30, h = 116) =>
  `<g class="legende"><rect x="${x}" y="${y}" width="5" height="${h}" fill="url(#${degrade})"></rect>${[0, 0.25, 0.5, 0.75, 1]
    .map((t) => `<line class="cote" x1="${x - 4}" x2="${x - 1}" y1="${r1(y + h * t)}" y2="${r1(y + h * t)}"></line>`)
    .join('')}${mono(x + 2.5, y - 6, '+', '', 'middle')}${mono(x + 2.5, y + h + 12, '−', '', 'middle')}</g>`;

/** Tangentes extérieures communes à deux cercles (point repéré et médaillon) : le cône de liaison, sans anneau sur la peau */
function tangentes(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  const t = Math.atan2(dy, dx), k = Math.acos((a.r - b.r) / d);
  return [t + k, t - k].map((n) => `<line class="trace liaison" pathLength="1" x1="${r1(a.x + a.r * Math.cos(n))}" y1="${r1(a.y + a.r * Math.sin(n))}" x2="${r1(b.x + b.r * Math.cos(n))}" y2="${r1(b.y + b.r * Math.sin(n))}"></line>`).join('');
}

/**
 * Élément de la bibliothèque (forme ÉcranZen) posé dans un dessin : SVG imbriqué en (x, y), largeur `l` (unités du dessin), traits
 * ramenés aux graisses de la charte. `couleur` : rendu pédagogique en couleur (peau, ongle) ; par défaut, monochrome au trait
 * (registre « relevé » de la bibliothèque : aplats du fond, contours --dessin-trait), comme les autres dessins.
 */
function element(cle: string, x: number, y: number, l: number, largeurVue = 400, couleur = false): string {
  const svg = svgForme(cle, { registre: couleur ? 'pedagogique' : 'releve', echelleTrait: largeurVue / l });
  return svg.replace('<svg ', `<svg x="${r1(x)}" y="${r1(y)}" width="${r1(l)}" height="${r1(l)}" stroke="none" `);
}
/** Médaillon de l'hallux (POD-AT-0009, état repos ou incarné) : centre (cx, cy), rayon r du cercle du médaillon */
const MED = { centre: 256, rayon: 190, vue: 400, origine: 56 };
const medaillonHallux = (cx: number, cy: number, r: number, etat: 'repos' | 'incarne', couleur = false) => {
  const l = (r * MED.vue) / MED.rayon;
  return element(etat === 'incarne' ? 'hallux-dorsal-incarne' : 'hallux-dorsal', cx - l / 2, cy - l / 2, l, MED.vue, couleur);
};
/** Point du médaillon de l'hallux (repère de l'atome 512) → repère du dessin */
const surMedaillon = (cx: number, cy: number, r: number, X: number, Y: number): P => [cx + ((X - MED.centre) * r) / MED.rayon, cy + ((Y - MED.centre) * r) / MED.rayon];

// Sport : chaussure de course de profil (talon à gauche), hauteurs de semelle au talon et à l'avant-pied.
const SOL = 150;
const LACETS = [[118, 82], [129, 88], [140, 94], [151, 99], [162, 104]];

/**
 * Pied et bas de jambe de profil (pied.ts : piedDeProfil, profil médial ÉcranZen, orteils à droite) posés dans un dessin : orteils
 * latéraux en arrière-plan, aplat de peau, os (au trait ; aplat teinté en registre pédagogique ; fibula en arrière-plan), aponévrose,
 * contour de la peau (ouvert : la jambe sort du cadre), hallux et son ongle, malléole médiale et, en registre relevé, appuis colorés
 * posés SUR LE SOL sous la plante (jamais sur la peau). `releve` : le pied posé sur une semelle est relevé de son épaisseur.
 */
function profilPose(voute: Voute, m: Affine, R: boolean, o: { os?: boolean; aponevrose?: boolean; appuis?: boolean; releve?: number } = {}): string {
  const p = piedDeProfil(voute);
  // Os de la jambe en fondu au-dessus des malléoles (comme l'atome POD-AT-0008) : ni double trait « attelle », ni os coupé net
  const fondu = `fondu-os-${voute}-${m.map((v) => Math.round(v * 10)).join('_').replace(/-/g, 'm')}`; // déterministe (rendu serveur = admin)
  const [, yHaut] = appliquer(m, 0, -12), [, yBas] = appliquer(m, 0, 24);
  const masque = `<mask id="${fondu}" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1200" height="1200"><linearGradient id="${fondu}-g" gradientUnits="userSpaceOnUse" x1="0" y1="${r1(yBas)}" x2="0" y2="${r1(yHaut)}"><stop offset="0" stop-color="white"></stop><stop offset="1" stop-color="black"></stop></linearGradient><rect x="-400" y="-400" width="1200" height="1200" fill="url(#${fondu}-g)"></rect></mask>`;
  const mp: Affine = o.releve ? [m[0], m[1], m[2], m[3], m[4], m[5] - o.releve * m[3]] : m;
  const t = (d: string) => transformer(d, mp);
  const e = Math.abs(m[0]);
  // Os fermé : un seul tracé (aplat teinté en pédagogique + contour) ; tibia et fibula : aplat fermé + contour ouvert
  // Sur fond sombre, seuls calcanéum, M1 et phalanges de l'hallux restent (variable --dessin-os-secondaires : jamais un pied entier « radio »)
  const SECONDAIRES = ['tibia', 'fibula', 'talus', 'naviculaire', 'cuneiforme1', 'metatarsien2'];
  const cl = (x: (typeof p.os)[number]) => `${x.ton ? ' os--arriere' : ''}${SECONDAIRES.includes(x.nom) || x.nom.startsWith('orteil2') ? ' os--secondaire' : ''}`;
  const unOs = (x: (typeof p.os)[number]) => (x.trait === x.d
    ? `<path class="os${cl(x)}${R ? '' : ' os--plein'}" d="${t(x.d)}"></path>`
    : `${R ? '' : `<path class="os-aplat${x.ton ? ' os-aplat--arriere' : ''}${cl(x)}" d="${t(x.d)}"></path>`}<path class="os${cl(x)}" d="${t(x.trait)}"></path>`);
  const jambe = p.os.filter((x) => x.nom === 'tibia' || x.nom === 'fibula');
  const os = o.os === false ? '' : `<g class="squelette"><defs>${masque}</defs><g mask="url(#${fondu})">${jambe.map(unOs).join('')}</g>${p.os.filter((x) => !jambe.includes(x)).map(unOs).join('')}</g>`;
  let appuis = '';
  if (R && o.appuis) {
    // Deux rangées de points sur le sol, sous la plante, colorées par la pression (talon, bord externe, têtes, pulpe de l'hallux)
    const pas = TRAME.pas * 0.8;
    const pts = [];
    for (let rang = 0; rang < 2; rang++) {
      for (let x = (rang ? pas / 2 : 0); x <= 122; x += pas) {
        const v = p.appui(x);
        if (v > 0.1) pts.push({ x: r1(x), y: r1(p.sol + 2.6 + rang * pas * 0.866), v });
      }
    }
    appuis = `<g class="trame">${grouperTrame(pts, pas).map((n) => `<path d="${poserTrame(n.d, m)}" stroke="${n.couleur}" stroke-width="${r1(n.epaisseur * e)}"></path>`).join('')}</g>`;
  }
  return `<g class="profil">${p.orteils.map((d) => `<path class="peau-seule" d="${t(d)}"></path><path class="trait trait--orteil" d="${t(d)}"></path>`).join('')}<path class="peau-seule" d="${t(p.peau)}"></path><path class="peau-seule" d="${t(p.hallux)}"></path>${os}${o.aponevrose ? `<path class="aponevrose" d="${t(p.aponevrose)}"></path>` : ''}<path class="trait" d="${t(p.contour)}"></path><path class="trait" d="${t(p.halluxContour)}"></path><path class="ongle-dessus ongle-dessus--fin" d="${t(p.ongle)}"></path>${o.os === false ? `<path class="fin" d="${t(p.malleole)}"></path>` : ''}</g>${appuis}`;
}
/** Sol sous un pied de profil posé par `m` */
const solProfil = (m: Affine, x1: number, x2: number, decalage = 0) => {
  const y = r1(appliquer(m, 0, piedDeProfil().sol + decalage)[1]);
  return `<line class="sol" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"></line>`;
};

/** Empreinte seule (registre pédagogique) : la trace d'appui sur le sol ou la vitre, jamais posée sur la peau ; formes DÉRIVÉES de
 *  EMPREINTE (pied.ts : EMPREINTES), zones fortes en ellipses (jamais d'iso-lignes « Paint ») */
function empreinteZones(appui: Appui): string {
  const e = EMPREINTES[appui as keyof typeof EMPREINTES] ?? EMPREINTES.normal;
  return `<path class="empreinte" d="${e.contour} ${PULPES_TRACE}"></path>${e.fort.map(([cx, cy, rx, ry]) => `<ellipse class="zone zone--forte" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"></ellipse>`).join('')}`;
}

/** Contexte d'un dessin : identifiants internes et registre */
type Contexte = { pied: string; degrade: string; loupe: string; R: boolean; variante?: VarianteDessin };
/**
 * Variantes de style soumises à l'arbitrage de Paul (planche « refonte ») ; sans variante, le choix par défaut. `ongle-couleur` :
 * médaillons de l'hallux en couleur (peau, ongle) ; `ongle-coupe` : incarné vu de dessus + coupe transversale (POD-AT-0010) ;
 * `sites-anneaux` : sites du monofilament en anneaux fins ; `contour-empreinte` / `sans-contour` : contour des relevés.
 */
export type VarianteDessin = 'ongle-couleur' | 'ongle-coupe' | 'sites-anneaux' | 'contour-empreinte' | 'sans-contour';

/** Corps de chaque dessin (repère 240 × 180) */
function corps(nom: NomDessin, c: Contexte): string {
  const { pied, degrade, loupe, R, variante } = c;
  // Contour du pied réel en pointillés : registre relevé seulement (le relevé n'est pas la peau)
  const pointilles = (leger = false) => (variante === 'sans-contour' ? '' : `<use href="#${pied}" class="${leger ? 'pointille pointille--leger' : 'pointille'}"></use>`);
  const grille = (ys: number[]) => (R ? `<g class="grille">${ys.map((y) => `<line x1="16" x2="200" y1="${y}" y2="${y}"></line>`).join('')}</g>` : '');

  switch (nom) {
    case 'analyse': {
      // Relevé : les deux pieds (gauche à gauche, vus de dessus) en trame de pression ; pédagogique : les deux empreintes seules
      const td = appliquer([0.68, 0, 0, 0.68, 126, 12], 0, 0);
      const sur = (x: number, y: number): P => [td[0] + x * 0.68, td[1] + y * 0.68];
      const [ax, ay] = sur(54, 76), [vx, vy] = sur(22, 140), [tx, ty] = sur(56, 205);
      return `<g>${grille([40, 80, 120, 160])}${[piedGauche(52, 12), piedDroit(126, 12)]
        .map((t) => `<g transform="${t}">${R ? `${pointilles(true)}${traceTrame('normal')}` : empreinteZones('normal')}</g>`)
        .join('')}${R ? legende(degrade) : `${renvoi(ax, ay, 198, 46)}${etiquette(200, 48, 'Avant-pied')}${renvoi(vx, vy, 198, 100)}${etiquette(200, 103, 'Voûte')}${renvoi(tx, ty, 198, 156)}${etiquette(200, 159, 'Talon')}`}</g>`;
    }

    case 'appuis': {
      const [hx, hy] = TETES[0];
      const k = 0.74, [ax, ay] = [30 + hx * k, 8 + hy * k];
      return `<g>${grille([30, 60, 90, 120, 150])}<g transform="${piedDroit(30, 8, k)}">${R ? `${pointilles(true)}${traceTrame('avant')}<circle class="anneau-chaud" cx="${hx}" cy="${hy}" r="14"></circle><circle class="anneau-chaud pulse" cx="${hx}" cy="${hy}" r="14"></circle>` : empreinteZones('avant')}</g>${
        R
          ? `<line class="trace fin" pathLength="1" x1="${r1(ax + 11)}" y1="${r1(ay - 6)}" x2="150" y2="38"></line>${mono(152, 40, 'zone d’appui')}<g class="barres">${mono(128, 122, 'pic')}<rect class="piste" x="148" y="117" width="56" height="5"></rect><rect class="barre" x="148" y="117" width="49" height="5" fill="var(--d-chaud)"></rect>${mono(128, 136, 'moy.')}<rect class="piste" x="148" y="131" width="56" height="5"></rect><rect class="barre" x="148" y="131" width="25" height="5" fill="var(--d-froid)"></rect></g><g class="legende"><rect x="218" y="30" width="5" height="116" fill="url(#${degrade})"></rect><path class="curseur" d="M213 44 l-6 -3.5 v7 z"></path></g>`
          : `${renvoi(ax + 4, ay, 120, 40)}${etiquette(124, 43, 'Zone d’appui')}`
      }</g>`;
    }

    case 'semelle': {
      // Carte des ÉLÉMENTS de la semelle orthopédique (POD-AT-0004), jamais une carte de pression : à gauche, la semelle vue de dessus
      // (talonnette, soutien de voûte, barre rétrocapitale derrière les têtes métatarsiennes) ; à droite, le pied de profil posé sur
      // la semelle de profil (POD-AT-0005 : la coque épouse la voûte, le pied est relevé de l'épaisseur de la semelle).
      const k = 0.64, ox = 12, oy = 24;
      const sur = (x: number, y: number): P => [ox + x * k, oy + y * k];
      const dessus = `<g transform="translate(${ox} ${oy}) scale(${k})"><path class="trait peau" d="${SEMELLE}"></path><path class="piece" d="${SEMELLE_ELEMENTS.talonnette}"></path><path class="piece piece--forte" d="${SEMELLE_ELEMENTS.voute}"></path><path class="piece piece--forte" d="${SEMELLE_ELEMENTS.barre}"></path></g>`;
      const vue: Affine = [0.84, 0, 0, 0.84, 104, 150 - 62 * 0.84];
      const t = (d: string) => transformer(d, vue);
      const profilSemelle = `<path class="piece-coque" d="${t(SEMELLE_PROFIL.coque)}"></path><path class="piece piece--forte" d="${t(SEMELLE_PROFIL.voute)}"></path><path class="peau-seule" d="${t(SEMELLE_PROFIL.recouvrement)}"></path><path class="fin" d="${t(SEMELLE_PROFIL.recouvrement)}"></path><path class="trait trait--moyen" d="${t(SEMELLE_PROFIL.contour)}"></path>`;
      const reperes: [number, number, string][] = [[6, 58.5, 'Talonnette'], [50, 59, 'Soutien de voûte'], [92, 61, 'Avant-pied']];
      const [bx, by] = sur(52, 82);
      return `<g>${dessus}${solProfil(vue, 100, 236)}${profilPose('normale', vue, R, { releve: SEMELLE_PROFIL.releve })}${profilSemelle}${reperes
        .map(([x, y, txt], i) => {
          const [ax, ay] = appliquer(vue, x, y);
          const [lx, ly, ancre] = ([[108, 172, 'start'], [168, 179, 'middle'], [236, 172, 'end']] as const)[i];
          return `${renvoi(ax, ay, lx, ly - 8)}${R ? mono(lx, ly, txt.toLowerCase(), i === 1 ? 'mono--accent' : '', ancre) : etiquette(lx, ly, txt, ancre)}`;
        })
        .join('')}${renvoi(bx, by, 26, 15)}${R ? mono(4, 12, 'barre rétrocapitale', 'mono--accent') : etiquette(4, 12, 'Barre rétrocapitale')}</g>`;
    }

    case 'soin': {
      // Soins des pieds et des ongles : le pied droit vu de dessus (POD-AT-0001) et le médaillon de l'hallux avec ses voisins
      // (POD-AT-0009), reliés par un cône ; aucun anneau ni couleur posés sur la peau.
      const k = 0.74, ox = 10, oy = 26;
      const med = { x: 172, y: 92, r: 54 };
      const repere = { x: ox + 28.6 * k, y: oy + 31.1 * k, r: 7 };
      return `<g><g transform="translate(${ox} ${oy}) scale(${k})">${piedReel([1, 0, 0, 1, 0, 0], 'dorsal')}</g>${tangentes(repere, med)}${medaillonHallux(med.x, med.y, med.r, 'repos')}${
        R ? `${mono(med.x + med.r + 2, med.y + med.r + 10, '× 3', '', 'end')}${mono(med.x, 24, 'ongle · replis · sillons', '', 'middle')}` : etiquette(med.x, med.y + med.r + 14, 'Ongle, replis et sillons', 'middle')
      }</g>`;
    }

    case 'diabete': {
      // Test au monofilament 10 g : la plante du pied droit (vue de dessous, hallux à droite), les 3 sites testés (pulpe de l'hallux,
      // têtes de M1 et de M5), numérotés au bout d'un renvoi ; médaillon : le filament perpendiculaire à la peau, plié en C au contact.
      const k = 0.68, ox = 28, oy = 14;
      const m: Affine = [-k, 0, 0, k, ox + 92 * k, oy];
      const sites = SITES.map(([x, y]) => appliquer(m, x, y));
      const etiquettes: [number, number, string][] = [[118, 22, '1'], [118, 64, '2'], [12, 76, '3']];
      const z = ZOOM.diabete;
      const peau = `M${z.x - 60} ${z.y + 26} C${z.x - 30} ${z.y + 20} ${z.x + 30} ${z.y + 20} ${z.x + 60} ${z.y + 26} L${z.x + 60} ${z.y + 70} L${z.x - 60} ${z.y + 70} Z`;
      const surface = `M${z.x - 60} ${z.y + 26} C${z.x - 30} ${z.y + 20} ${z.x + 30} ${z.y + 20} ${z.x + 60} ${z.y + 26}`;
      const yContact = z.y + 21.6;
      const filament = `M${z.x} ${z.y - 22} C${z.x - 17} ${z.y - 12} ${z.x - 17} ${r1(yContact - 6)} ${z.x} ${r1(yContact)}`; // un seul arc en C
      const reperes = variante === 'sites-anneaux'
        ? sites.map(([x, y]) => `<circle class="anneau-site" cx="${r1(x)}" cy="${r1(y)}" r="4.2"></circle>`).join('')
        : `${sites.map(([x, y], i) => renvoi(x, y, etiquettes[i][0] + (i < 2 ? -3 : 7), etiquettes[i][1] - 3)).join('')}${etiquettes.map(([x, y, n]) => (R ? mono(x, y, n, 'mono--accent', 'middle') : etiquette(x, y, n, 'middle'))).join('')}`;
      return `<g>${piedReel(m, 'plantaire')}${reperes}<circle class="fond-loupe" cx="${z.x}" cy="${z.y}" r="${z.r}"></circle><g clip-path="url(#${loupe})"><path class="peau-seule" d="${peau}"></path><path class="trait" d="${surface}"></path><rect class="trait peau" x="${z.x - 6}" y="${z.y - 62}" width="12" height="40" rx="5"></rect><path class="filament" d="${filament}"></path></g><circle class="trace loupe" cx="${z.x}" cy="${z.y}" r="${z.r}" pathLength="1"></circle>${
        R ? `${mono(z.x, 160, '10 g · 3 sites', '', 'middle')}${mono(z.x, 170, 'plié en C · environ 2 s', 'mono--accent', 'middle')}` : `${etiquette(z.x, 160, 'Monofilament 10 g', 'middle')}${etiquette(z.x, 170, '3 sites testés par pied', 'middle')}`
      }</g>`;
    }

    case 'sport':
      // Courbe de force verticale pendant l'appui (double bosse : impact puis propulsion), sol, semelle
      // crantée (plus épaisse au talon : drop), tige, cotes des hauteurs de semelle, force de réaction du sol.
      return `<g>${
        R
          ? `<g class="courbe"><line class="cote" x1="172" y1="44" x2="230" y2="44"></line><line class="cote" x1="172" y1="44" x2="172" y2="10"></line><path class="trace force-courbe" pathLength="1" d="M172 44 C176 44 177 22 181 20 C184 19 185 29 189 29 C195 29 197 12 204 12 C212 12 214 44 222 44"></path>${mono(174, 9, 'F(t)')}</g>`
          : ''
      }<line class="sol" x1="12" y1="${SOL}" x2="232" y2="${SOL}"></line><g class="hachures">${Array.from(
        { length: 22 },
        (_, k) => `<line x1="${16 + k * 10}" y1="${SOL + 2}" x2="${10 + k * 10}" y2="${SOL + 8}"></line>`,
      ).join(
        '',
      )}</g><path class="trace semelle${R ? '' : ' peau'}" pathLength="1" d="M44 126 C37 129 35 138 36 143 C37 147 41 150 47 150 L150 150 C172 150 196 147 213 138 C218 135 218 131 212 131 C200 132 186 133 172 133 C140 132 90 128 44 126 Z"></path><path class="trace fin" pathLength="1" d="M38 144.5 C40 145 43 145 47 145 L150 145 C171 145 193 142.5 209 135"></path><path class="crampons" d="M49 147.6 L150 147.6 C171 147.6 192 145 208 137"></path><path class="trace fin" pathLength="1" d="M44 136 C80 138 130 140 170 141 C186 141 200 139 210 136"></path><path class="trace" pathLength="1" d="M44 126 C38 112 38 98 44 88 C48 82 55 81 60 85 C66 90 75 91 83 87 C89 83 93 77 99 73 C103 70 108 71 110 75 C123 89 150 102 180 112 C196 117 208 123 212 131"></path><path class="trace fin" pathLength="1" d="M49 121 C46 110 47 99 53 92"></path><path class="trace fin" pathLength="1" d="M180 133 C186 123 200 122 210 127"></path><path class="trace fin" pathLength="1" d="M66 122 C92 116 128 112 166 111"></path><path class="trace fin" pathLength="1" d="M45 89 C41 86 41 81 45 80 C48 79 51 81 52 84"></path>${LACETS.map(
        ([x, y], k) => `<g><circle class="oeillet" cx="${x}" cy="${y}" r="1.5"></circle><line class="lacet" x1="${x + 2.4}" y1="${y - 4.6}" x2="${x - 2.4}" y2="${y + 4.6}" style="--k:${k}"></line></g>`,
      ).join('')}${
        R
          ? `<line class="guide" x1="20" y1="126" x2="44" y2="126"></line><line class="cote" x1="24" y1="126" x2="24" y2="${SOL}"></line><line class="cote" x1="21" y1="126" x2="27" y2="126"></line>${mono(20, 141, '32', '', 'end')}<line class="guide" x1="172" y1="133" x2="230" y2="133"></line><line class="cote" x1="226" y1="133" x2="226" y2="${SOL}"></line><line class="cote" x1="223" y1="133" x2="229" y2="133"></line>${mono(231, 145, '24')}${mono(124, 172, 'drop 8 mm', 'mono--accent', 'middle')}<line class="trace force" pathLength="1" x1="62" y1="${SOL}" x2="55" y2="104"></line><path class="force-fleche" d="M51.2 112.8 L55 103.2 L60.6 111.8"></path><circle class="point" cx="62" cy="${SOL}" r="3" fill="var(--d-chaud)" style="--k:2"></circle>${mono(62, 112, 'FRS', 'mono--chaud')}`
          : `<path class="zone zone--forte" d="M40 140 C40 146 43 148 48 148 L110 148 C110 144 108 141 104 140 Z"></path>${renvoi(80, 146, 96, 166)}${etiquette(100, 170, 'Semelle et amorti')}${renvoi(120, 92, 150, 62)}${etiquette(152, 60, 'Tige')}`
      }</g>`;

    case 'enfant': {
      // Croissance du pied : le même pied à 1, 3, 6 et 10 ans, alignés au talon, pointure en regard. Le pied
      // du tout-petit paraît plat : le coussinet graisseux comble encore la voûte (physiologique).
      // Longueurs proportionnelles à la pointure (1 an ≈ 0,59 × 10 ans), mesurées sur la silhouette réelle de chaque âge
      const AGES = [{ age: '1 an', p: 20, t: 0 }, { age: '3 ans', p: 25, t: 0.3 }, { age: '6 ans', p: 30, t: 0.62 }, { age: '10 ans', p: 34, t: 0.9 }];
      const X0 = 104, Y0 = 170, REGLE = 176;
      const pieds = AGES.map((a, k) => {
        // Le pied du tout-petit est proportionnellement plus large : la largeur s'affine avec l'âge
        const { plante, orteils } = piedCroissance(a.t);
        const haut = Math.min(...orteils.map(([, cy, , ry]) => cy - ry));
        const e = (0.7 * 216.5 * (a.p / 34)) / (219 - haut), large = 1 + 0.22 * (1 - a.t);
        const m: Affine = [e * large, 0, 0, e, X0 - 48 * e * large, Y0 - 219 * e];
        return { ...a, k, e, m, plante, orteils, y: r1(Y0 - (219 - haut) * e), x: r1(X0 + (27 - 48) * e * large) };
      });
      const petit = pieds[0];
      const trameBebe = R
        ? grouperTrame(pointsTrame((x, y) => Math.min(1, 0.32 + 0.6 * g2(x, y, 47, 192, 15, 18) + 0.42 * g2(x, y, 44, 62, 18, 13) + 0.38 * g2(x, y, 27, 20, 8)), TRAME.pasEnfant, dansEnfant), TRAME.pasEnfant)
            .map((n) => `<path d="${poserTrame(n.d, petit.m)}" stroke="${n.couleur}" stroke-width="${r1(n.epaisseur * petit.e)}"></path>`)
            .join('')
        : '';
      const contours = [...pieds]
        .reverse()
        .map((q) => {
          const d = transformer(silhouette(q.plante, q.orteils), q.m);
          if (R) return `<path class="pointille ${q.k ? 'pointille--leger' : ''}" d="${d}"></path>`;
          return `<path class="${q.k ? 'trait croissance' : 'trait peau'}" d="${d}" style="--age:${q.k}"></path>`;
        })
        .join('');
      // Renvoi vers le bord médial, droit chez le tout-petit (aucune tache sur la peau)
      const yv = 140, [cx, cy] = appliquer(petit.m, (largeurA(PLANTE_ENFANT, yv)?.[0] ?? 14) + 0.5, yv);
      return `<g>${contours}${R ? `<g class="trame">${trameBebe}</g>` : ''}<line class="trace" pathLength="1" x1="${REGLE}" y1="${Y0}" x2="${REGLE}" y2="${r1(pieds[3].y - 6)}"></line><line class="cote" x1="${REGLE - 4}" y1="${Y0}" x2="${REGLE + 4}" y2="${Y0}"></line>${pieds
        .map((q) => `<line class="guide" x1="${q.x}" y1="${q.y}" x2="${REGLE}" y2="${q.y}"></line><line class="cote" x1="${REGLE - 4}" y1="${q.y}" x2="${REGLE + 4}" y2="${q.y}"></line>${R ? mono(REGLE + 8, q.y + 2.5, `${q.age} · ${q.p}`) : etiquette(REGLE + 8, q.y + 2.5, `${q.age} · ${q.p}`)}`)
        .join('')}${R ? mono(REGLE - 6, Y0 + 9, 'âge · pointure', 'mono--accent', 'end') : `${etiquette(REGLE - 6, Y0 + 9, 'âge · pointure', 'end')}${renvoi(cx, cy, 40, 112)}${etiquette(8, 100, 'Voûte comblée')}${etiquette(8, 109, 'par un coussinet')}`}</g>`;
    }

    case 'equilibre': {
      // Stabilométrie (norme AFP 85) : talons écartés de 2 cm, pieds ouverts de 30° ; polygone de sustentation, oscillations du
      // centre de pression. Pieds vus de dessus : en relevé, trame de pression ; en pédagogique, empreintes seules.
      const e = 0.5, cm = (216 * e) / 25;
      const demiTalon = 26 * e, ecart = 2 * cm;
      const tg = poserTalon(120 - ecart / 2 - demiTalon, 156, -15, e, true), td = poserTalon(120 + ecart / 2 + demiTalon, 156, 15, e);
      const poly = enveloppe([...POINTS_CONTACT.map(([x, y]) => appliquer(tg, x, y)), ...POINTS_CONTACT.map(([x, y]) => appliquer(td, x, y))]);
      const polygone = `M${poly.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z`;
      const piedPose = (m: Affine) =>
        R
          ? `<path class="pointille pointille--leger" d="${transformer(PIED_TRACE, m)}"></path>${grouperTrame(pointsTrame('reparti'), TRAME.pas)
              .map((n) => `<path d="${poserTrame(n.d, m)}" stroke="${n.couleur}" stroke-width="${r1(n.epaisseur * e)}"></path>`)
              .join('')}`
          : `<path class="empreinte" d="${transformer(EMPREINTE_TRACE, m)}"></path>`;
      return `<g>${R ? '' : `<path class="zone" d="${polygone}"></path>`}<path class="trace polygone" pathLength="1" d="${polygone}"></path>${piedPose(tg)}${piedPose(td)}<path class="trace oscillation" pathLength="1" d="${oscillations(120, 118, 6, 9, 22)}"></path><circle class="point" cx="120" cy="118" r="3" fill="${R ? 'var(--d-chaud)' : 'var(--d-accent)'}" style="--k:2"></circle>${
        R ? `${mono(16, 22, 'STABILOMÉTRIE')}${mono(16, 32, 'talons 2 cm · ouverture 30°', 'mono--accent')}${mono(224, 172, 'polygone d’appui', '', 'end')}` : `${etiquette(16, 24, 'Polygone d’appui')}${etiquette(16, 33, 'talons à 2 cm, pieds ouverts de 30°')}${renvoi(120, 124, 120, 166)}${etiquette(120, 176, 'Oscillations du corps', 'middle')}`
      }</g>`;
    }

    case 'talon': {
      // Douleur au talon : pied et bas de jambe de profil (POD-AT-0003 + squelette POD-AT-0008), aponévrose plantaire de la
      // tubérosité du calcanéum à la base de P1, enroulée sous la tête de M1. Appuis sur le sol en relevé.
      const m: Affine = [1.28, 0, 0, 1.28, 40, 78];
      const p = piedDeProfil();
      const [ix, iy] = appliquer(m, ...p.insertion);
      const [ax, ay] = appliquer(m, 58, 56.4);
      return `<g>${solProfil(m, 12, 232)}${profilPose('normale', m, R, { aponevrose: true, appuis: true })}${
        R
          ? `${renvoi(ix, iy, 22, 168)}${mono(24, 178, 'insertion calcanéenne')}${mono(232, 22, 'APONÉVROSE PLANTAIRE', '', 'end')}${mono(232, 32, 'mise en tension · appui talon', 'mono--accent', 'end')}`
          : `${renvoi(...appliquer(m, 24, 44), 34, 168)}${etiquette(10, 177, 'Calcanéum')}${renvoi(ax, ay, 150, 168)}${etiquette(150, 177, 'Aponévrose plantaire')}`
      }</g>`;
    }

    case 'ongle': {
      // Ongle incarné : l'hallux et ses voisins vus de dessus (POD-AT-0009), normal puis incarné — repli latéral épaissi qui couvre
      // le bord de la lame, spicule relié à la lame ; aucune couleur sur la peau.
      const r = 52, g = { x: 62, y: 100 }, d = { x: 178, y: 100 };
      const [sx, sy] = surMedaillon(d.x, d.y, r, 284, 146);
      // Repli latéral épaissi (contre-revue N8) : le contour latéral de l'hallux bombe de ≈ 10 % de la largeur de la lame sur le tiers
      // distal, et le repli recouvre le bord de la lame et la pointe du spicule (qui prolonge la lame, sans encoche ni pointe visible).
      const repli = (() => {
        const xH = (y: number) => (y >= 166 ? 283 : 217 + Math.sqrt(Math.max(0, 66 ** 2 - (166 - y) ** 2)));
        const bosse = (y: number) => (y <= 124 || y >= 194 ? 0 : 8 * Math.sin(Math.PI * (y < 146 ? (y - 124) / 44 : 0.5 + (y - 146) / 140)) ** 1.4);
        const ys = Array.from({ length: 15 }, (_, k) => 124 + k * 5);
        const ext: P[] = ys.map((y) => [xH(y) + bosse(y), y]);
        const int: P[] = [...ys].reverse().filter((y) => y > 128 && y < 190).map((y) => [253 + 3 * Math.sin((Math.PI * (y - 128)) / 62), y]);
        const sur = (pts: P[]) => pts.map(([X, Y]) => surMedaillon(d.x, d.y, r, X, Y));
        return `<path class="peau-seule" d="${courbe(sur([...ext, ...int, ext[0]]))} Z"></path><path class="trait trait--moyen" d="${courbe(sur(ext))}"></path><path class="fin" d="${courbe(sur(int))}"></path>`;
      })();
      const couleur = variante === 'ongle-couleur';
      const gauche = variante === 'ongle-coupe' ? medaillonHallux(g.x, g.y, r, 'incarne') : medaillonHallux(g.x, g.y, r, 'repos', couleur);
      const droite = variante === 'ongle-coupe' ? element('ongle-coupe-incarne', d.x - 56, d.y - 56, 112, 354) : medaillonHallux(d.x, d.y, r, 'incarne', couleur);
      if (variante === 'ongle-coupe') return `<g>${gauche}${droite}${R ? `${mono(g.x, 34, 'INCARNÉ', 'mono--chaud', 'middle')}${mono(d.x, 34, 'COUPE', '', 'middle')}` : `${etiquette(g.x, 34, 'Ongle incarné', 'middle')}${etiquette(d.x, 34, 'Vu en coupe', 'middle')}`}</g>`;
      return `<g>${gauche}${droite}${variante === 'ongle-couleur' ? '' : repli}${
        R
          ? `${mono(g.x, 34, 'NORMAL', '', 'middle')}${mono(d.x, 34, 'INCARNÉ', 'mono--chaud', 'middle')}<line class="trace fin" pathLength="1" x1="${r1(sx)}" y1="${r1(sy)}" x2="222" y2="166"></line>${mono(236, 176, 'repli latéral', '', 'end')}`
          : `${etiquette(g.x, 34, 'Ongle normal', 'middle')}${etiquette(d.x, 34, 'Ongle incarné', 'middle')}${renvoi(sx, sy, 222, 166)}${etiquette(236, 177, 'Repli latéral épaissi', 'end')}`
      }</g>`;
    }

    case 'laser': {
      // Laser : pièce à main sous la plante (vue de dessous, hallux à droite), faisceau étroit sur une zone précise (sous la 2e tête) ;
      // rien n'est peint sur la peau : le faisceau s'arrête à la surface.
      const k = 0.72;
      const m: Affine = [-k, 0, 0, k, 34 + 92 * k, 16];
      const [sx, sy] = appliquer(m, TETES[1][0], TETES[1][1]);
      const tip: P = [150, 40];
      const dx = sx - tip[0], dy = sy - tip[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
      const corpsPiece = (() => {
        const a = (Math.atan2(-uy, -ux) * 180) / Math.PI;
        return `<g transform="translate(${tip[0]} ${tip[1]}) rotate(${r1(a)})"><path class="trait peau" d="M6 -4 L22 -6.5 L72 -6.5 C76 -6.5 78 -4 78 0 C78 4 76 6.5 72 6.5 L22 6.5 L6 4 C3 3.6 2 2 2 0 C2 -2 3 -3.6 6 -4 Z"></path><path class="fin" d="M22 -6.5 L22 6.5 M30 -6.5 L30 6.5 M58 -6.5 L58 6.5"></path><path class="fin" d="M78 0 C88 0 92 8 98 16"></path></g>`;
      })();
      const faisceau = `M${r1(tip[0] - uy * 1.6)} ${r1(tip[1] + ux * 1.6)} L${r1(sx - uy * 3)} ${r1(sy + ux * 3)} L${r1(sx + uy * 3)} ${r1(sy - ux * 3)} L${r1(tip[0] + uy * 1.6)} ${r1(tip[1] - ux * 1.6)} Z`;
      return `<g>${piedReel(m, 'plantaire')}<path class="faisceau" d="${faisceau}"></path><line class="faisceau-axe" x1="${tip[0]}" y1="${tip[1]}" x2="${r1(sx)}" y2="${r1(sy)}"></line>${corpsPiece}${
        R
          ? `${mono(232, 162, 'IMPULSION · Ø 4 mm', '', 'end')}${mono(232, 172, '2e tête métatarsienne', 'mono--accent', 'end')}`
          : `${renvoi(sx - 2, sy + 4, 30, 150)}${etiquette(16, 160, 'Zone traitée')}${etiquette(144, 32, 'Pièce à main', 'end')}`
      }</g>`;
    }

    case 'senior': {
      // Prévention des chutes : à gauche, vus de dessus, le polygone d'appui des deux pieds élargi par l'embout de la canne (≈ 15 cm en
      // dehors et ≈ 12 cm en avant du 5e orteil) ; à droite, le pied de profil et la canne presque verticale, tenue du côté opposé au
      // membre douloureux : l'embout posé un peu en avant des orteils, la tige qui sort du cadre (poignée au grand trochanter).
      const e = 0.28, cm = (216 * e) / 25;
      const tg = poserTalon(22, 156, -7, e, true), td = poserTalon(54, 156, 7, e);
      const [ox, oy] = appliquer(td, ...CONTOUR_PIED.bouts[4]);
      const canne: P = [r1(ox + 15 * cm), r1(oy - 12 * cm)];
      const pointsPieds = [...POINTS_CONTACT.map(([x, y]) => appliquer(tg, x, y)), ...POINTS_CONTACT.map(([x, y]) => appliquer(td, x, y))];
      const poly = enveloppe(pointsPieds), polyCanne = enveloppe([...pointsPieds, canne]);
      const trace = (q: P[]) => `M${q.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z`;
      const pied = (m: Affine) => `<path class="empreinte" d="${transformer(EMPREINTE_TRACE, m)}"></path>`;
      // Profil : pied gauche vu côté interne ; la canne, tenue de l'autre côté, est dessinée derrière le pied
      const k = 0.48, m: Affine = [k, 0, 0, k, 136, 156 - 62 * k];
      const sol = 156;
      const embout: P = [r1(appliquer(m, 112 + 12 * 5, 0)[0]), sol];
      const tige = `M${embout[0]} ${sol - 3} L${r1(embout[0] - 5)} -2`;
      return `<g>${R ? '' : `<path class="zone" d="${trace(polyCanne)}"></path>`}<path class="guide" d="${trace(poly)}"></path><path class="trace polygone" pathLength="1" d="${trace(polyCanne)}"></path>${pied(tg)}${pied(td)}<circle class="point" cx="${canne[0]}" cy="${canne[1]}" r="3.4" fill="${R ? 'var(--d-chaud)' : 'var(--d-accent)'}"></circle><path class="trace oscillation" pathLength="1" d="${oscillations(38, 128, 4, 7, 20, 11)}"></path>${solProfil(m, 130, 238)}${profilPose('normale', m, R, { os: false, appuis: true })}<path class="canne canne--avant" d="${tige}"></path><path class="canne-embout" d="M${r1(embout[0] - 1.8)} ${sol - 4.5} H${r1(embout[0] + 1.8)} V${sol} H${r1(embout[0] - 1.8)} Z"></path>${
        R ? `${mono(8, 18, 'POLYGONE D’APPUI')}${mono(8, 28, '+ embout de canne', 'mono--accent')}${mono(8, 176, 'oscillations · 30 s')}` : `${etiquette(8, 18, 'Polygone d’appui')}${etiquette(8, 28, 'élargi par la canne')}${etiquette(8, 176, 'Oscillations')}${renvoi(embout[0] - 2.5, sol - 30, 236, sol - 44)}${etiquette(236, sol - 48, 'Canne', 'end')}`
      }</g>`;
    }

    case 'taping': {
      // K-taping : bandes à largeur constante sur la peau du pied de profil — l'une sous le talon et le long du tendon d'Achille,
      // l'autre sous la voûte, du talon vers l'avant-pied (tracés posés juste à l'intérieur du contour de la peau).
      const m: Affine = [1.28, 0, 0, 1.28, 40, 78];
      // Bandes posées SUR la peau, à l'intérieur du contour (le contour de la peau reste le bord extérieur) ; extrémités arrondies ;
      // bande du tendon d'Achille fendue en Y sur le mollet (signature du K-taping) ; pas de chevauchement sous le talon.
      const bande = (pts: P[], largeur: number) => `<path class="bande" d="${courbe(pts.map(([x, y]) => appliquer(m, x, y)))}" style="stroke-width:${largeur}"></path>`;
      const achille: P[] = [[17, 58.6], [10, 58.2], [4.8, 55.6], [2.6, 50], [3.8, 44], [7, 36], [10.6, 26], [13, 15], [12.6, 4]];
      const queues: P[][] = [[[12.6, 4], [11, -12], [9.4, -28]], [[12.6, 4], [15.6, -12], [19.2, -27]]];
      const voute: P[] = [[23, 58.6], [32, 53.6], [44, 52.6], [56, 52.4], [67, 55.6], [75, 57.8], [83, 58.8]];
      const [bx, by] = appliquer(m, 12, 8), [vx, vy] = appliquer(m, 56, 52.4);
      return `<g>${solProfil(m, 12, 232)}${profilPose('normale', m, R, { os: true })}${bande(achille, 8)}${queues.map((q) => bande(q, 5)).join('')}${bande(voute, 6.5)}${
        R
          ? `${mono(232, 22, 'K-TAPING', '', 'end')}${mono(232, 32, 'tendon d’Achille · voûte', 'mono--accent', 'end')}${mono(232, 42, 'tension 25 %', '', 'end')}`
          : `${renvoi(bx - 3, by, 36, by - 18)}${etiquette2(34, by - 30, 'Bande', 'adhésive', 'end')}${renvoi(vx, vy + 3, 150, 172)}${etiquette(154, 175, 'Soutien de la voûte')}`
      }</g>`;
    }

    case 'voutes': {
      // Pied normal, pied creux, pied plat : le même pied de profil (squelette, arche, aponévrose ; pied creux : pente du calcanéum
      // et inclinaison des métatarsiens plus fortes ; pied plat : arche au sol) et son empreinte (pied gauche vu de dessus).
      const TYPES: [Voute, Appui, string][] = [['normale', 'normal', 'Pied normal'], ['creuse', 'creux', 'Pied creux'], ['plate', 'plat', 'Pied plat']];
      return `<g>${TYPES.map(([v, a, nom], i) => {
        const x0 = 6 + i * 78;
        const k = 0.52;
        const m: Affine = [k, 0, 0, k, x0 + 4, 38];
        const [, sy] = appliquer(m, 0, 62);
        const e = 0.33;
        return `<line class="sol" x1="${x0}" y1="${r1(sy)}" x2="${x0 + 72}" y2="${r1(sy)}"></line>${profilPose(v, m, R, { aponevrose: true, appuis: true })}<g transform="translate(${r1(x0 + 36 + 46 * e)} ${r1(sy + 7)}) scale(${-e} ${e})">${R ? `${pointilles(true)}${traceTrame(a)}` : empreinteZones(a)}</g>${R ? mono(x0 + 36, 176, nom.replace('Pied ', '').toUpperCase(), '', 'middle') : etiquette(x0 + 36, 176, nom, 'middle')}`;
      }).join('')}</g>`;
    }

    case 'arriere-pied': {
      // Arrière-pied vu de dos (bilan) : jambe, malléoles, talus et calcanéum ; axe de la jambe et axe du talon. Contour CONTINU de la
      // jambe au talon (pas de marche à la cheville). Normal : 0 à 5° de valgus physiologique ; valgus (pied plat) ; varus (pied creux).
      const TYPES: [number, string, string][] = [[-3, 'Normal', '0 à 5° (valgus physiologique)'], [-12, 'Valgus', '12° valgus'], [10, 'Varus', '10° varus']];
      return `<g>${TYPES.map(([angle, nom, mesure], i) => {
        const x0 = 20 + i * 78;
        const a = (angle * Math.PI) / 180, c = { x: x0 + 20, y: 108 };
        const rot = (x: number, y: number) => `${r1(c.x + (x0 + x - c.x) * Math.cos(a) - (y - c.y) * Math.sin(a))} ${r1(c.y + (x0 + x - c.x) * Math.sin(a) + (y - c.y) * Math.cos(a))}`;
        const peau = `M${x0 + 7} 20 C${x0 + 6} 50 ${x0 + 9} 78 ${x0 + 10} 94 C${x0 + 10.4} 100 ${rot(8, 102)} ${rot(8, 110)} C${rot(6, 120)} ${rot(5, 132)} ${rot(8, 140)} C${rot(11, 147)} ${rot(29, 147)} ${rot(32, 140)} C${rot(35, 132)} ${rot(34, 120)} ${rot(32, 110)} C${rot(32, 102)} ${x0 + 29.6} 100 ${x0 + 30} 94 C${x0 + 31} 78 ${x0 + 34} 50 ${x0 + 33} 20`;
        const os = `M${x0 + 13} 20 V92 C${x0 + 13} 98 ${x0 + 10} 104 ${x0 + 11.5} 108 C${x0 + 14} 104 ${x0 + 16} 101 ${x0 + 20} 101 C${x0 + 24} 101 ${x0 + 25} 103 ${x0 + 26} 104 V20 M${x0 + 27.5} 20 C${x0 + 28} 60 ${x0 + 27} 90 ${x0 + 27.5} 100 C${x0 + 28} 106 ${x0 + 30} 110 ${x0 + 29} 113 C${x0 + 27} 112 ${x0 + 26} 108 ${x0 + 26} 104 M${x0 + 13} 106 C${x0 + 15} 103 ${x0 + 25} 103 ${x0 + 27} 106 C${x0 + 28} 110 ${x0 + 26} 113 ${x0 + 20} 113 C${x0 + 14} 113 ${x0 + 12} 110 ${x0 + 13} 106 Z`;
        const calcaneum = `M${x0 + 12} 116 C${x0 + 12} 113 ${x0 + 28} 113 ${x0 + 28} 116 C${x0 + 30} 124 ${x0 + 30} 134 ${x0 + 26} 138 C${x0 + 22} 141 ${x0 + 18} 141 ${x0 + 14} 138 C${x0 + 10} 134 ${x0 + 10} 124 ${x0 + 12} 116 Z`;
        const tourne = `rotate(${angle} ${c.x} ${c.y})`;
        const xa = x0 + 20 - Math.sin(a) * 34;
        const appuis = R ? trameDisque(xa, 151, 6.5, 2.8) : `<ellipse class="zone zone--forte" cx="${r1(xa)}" cy="151" rx="7" ry="2.4"></ellipse>`;
        return `<line class="sol" x1="${x0 - 2}" y1="148" x2="${x0 + 42}" y2="148"></line><path class="peau-seule" d="${peau} Z"></path><g class="squelette"><path class="os${R ? '' : ' os--teinte'}" d="${os}"></path></g><g transform="${tourne}"><g class="squelette"><path class="os${R ? '' : ' os--teinte'}" d="${calcaneum}"></path></g><path class="axe axe--plein" d="M${c.x} ${c.y} V150"></path></g><path class="trait" d="${peau}"></path><path class="axe axe--plein" d="M${c.x} 22 V${c.y}"></path>${appuis}${R ? `${mono(c.x, 12, nom.toUpperCase(), '', 'middle')}${mono(c.x, 166, mesure.replace(' (valgus physiologique)', ''), angle !== -3 ? 'mono--accent' : '', 'middle')}` : `${etiquette(c.x, 12, nom, 'middle')}${etiquette(c.x, 166, mesure.replace(' (valgus physiologique)', ''), 'middle')}`}`;
      }).join('')}</g>`;
    }

    case 'verrue': {
      // Verrue plantaire : point d'appui précis sous la 2e tête métatarsienne ; médaillon : la verrue interrompt les lignes de la
      // peau, petits points noirâtres (capillaires) dans un anneau de corne. Relevé : l'empreinte en trame (le relevé n'est pas la
      // peau) ; pédagogique : la plante du pied droit vue de dessous, un cône vers le médaillon (aucun anneau sur la peau).
      const t = { x: 20, y: 10, e: 0.72 };
      const champ = (x: number, y: number) => Math.min(1, 0.72 * pression('normal', x, y) + (dansPlante(x, y) ? 1.1 * g2(x, y, TETES[1][0], TETES[1][1], 4.5) : 0));
      const mP: Affine = [-t.e, 0, 0, t.e, t.x + 92 * t.e, t.y];
      const [vx, vy] = R ? [t.x + TETES[1][0] * t.e, t.y + TETES[1][1] * t.e] : appliquer(mP, TETES[1][0], TETES[1][1]);
      const v = { x: vx, y: vy, r: R ? 8 : 2.5 };
      const z = ZOOM.verrue;
      const rv = 17;
      // Lignes de la peau : horizontales légèrement courbées, coupées autour de la verrue
      const lignes = Array.from({ length: 13 }, (_, i) => {
        const y = z.y - 48 + i * 8;
        const dy = Math.abs(y - z.y);
        if (dy >= rv + 3) return `M${z.x - 60} ${y} Q${z.x} ${y + 5} ${z.x + 60} ${y}`;
        const w = Math.sqrt((rv + 3) ** 2 - dy ** 2);
        return `M${z.x - 60} ${y} L${r1(z.x - w)} ${y + 3} M${r1(z.x + w)} ${y + 3} L${z.x + 60} ${y}`;
      }).join(' ');
      const h = hasard(3);
      const papilles = Array.from({ length: 16 }, () => {
        const a = h() * 2 * Math.PI, d = Math.sqrt(h()) * (rv - 5);
        return [r1(z.x + d * Math.cos(a)), r1(z.y + d * Math.sin(a)), r1(1 + h() * 1.1)] as const;
      });
      const verrue = `M${z.x - rv} ${z.y} C${z.x - rv} ${z.y - 11} ${z.x - 10} ${z.y - rv} ${z.x + 1} ${z.y - rv + 0.5} C${z.x + 12} ${z.y - rv + 1} ${z.x + rv + 0.5} ${z.y - 9} ${z.x + rv} ${z.y + 1} C${z.x + rv - 1} ${z.y + 11} ${z.x + 9} ${z.y + rv} ${z.x - 1} ${z.y + rv - 0.5} C${z.x - 11} ${z.y + rv - 1} ${z.x - rv} ${z.y + 10} ${z.x - rv} ${z.y} Z`;
      return `<g>${R ? `<g transform="${piedDroit(t.x, t.y, t.e)}">${pointilles(true)}${traceChamp(champ)}</g><circle class="trace mire" cx="${r1(v.x)}" cy="${r1(v.y)}" r="${v.r}" pathLength="1"></circle>` : piedReel(mP, 'plantaire')}${tangentes(v, z)}<circle class="fond-loupe" cx="${z.x}" cy="${z.y}" r="${z.r}"></circle><g clip-path="url(#${loupe})"><path class="dermato" d="${lignes}"></path><path class="corne" d="${verrue}"></path><path class="trait" d="${verrue}"></path>${papilles
        .map(([x, y, r]) => `<circle class="papille" cx="${x}" cy="${y}" r="${r}"></circle>`)
        .join('')}</g><circle class="trace loupe" cx="${z.x}" cy="${z.y}" r="${z.r}" pathLength="1"></circle>${
        R ? `${mono(z.x + z.r + 2, z.y + z.r + 10, '× 8', '', 'end')}${mono(z.x, 24, 'Ø 6 mm · zone d’appui', '', 'middle')}` : `${etiquette(z.x, z.y + z.r + 14, 'Lignes de la peau interrompues', 'middle')}${renvoi(z.x - 4, z.y - 12, z.x - 30, 30)}${etiquette(z.x - 30, 24, 'Verrue', 'middle')}`
      }</g>`;
    }
  }
  return '';
}

/** Médaillons de zoom (centre, rayon) des dessins qui en ont un */
const ZOOM: Record<string, { x: number; y: number; r: number }> = { verrue: { x: 168, y: 92, r: 54 }, diabete: { x: 180, y: 84, r: 52 } };

/**
 * Dessin technique complet (<svg>…</svg>), décoratif (aria-hidden). `id` préfixe les identifiants internes
 * (symbole du pied, dégradé, découpe) : il doit être unique dans la page. Par défaut, déterministe
 * (`d-${nom}`) pour que le rendu serveur et le rendu navigateur de l'admin coïncident.
 * `registre` : « releve » (par défaut, relevé de podoscope) ou « pedagogique » (schéma au trait).
 */
export function svgDessin(nom: NomDessin, opts: { id?: string; classe?: string; registre?: Registre; variante?: VarianteDessin } = {}): string {
  const id = opts.id ?? `d-${nom}`;
  const registre = opts.registre ?? 'releve';
  const pied = `${id}-pied`, degrade = `${id}-degrade`, loupe = `${id}-loupe`;
  const classes = ['dessin', `dessin--${nom}`, `dessin--${registre}`, opts.classe].filter(Boolean).join(' ');
  const R = registre === 'releve';
  const zoom = ZOOM[nom];
  // Défs utiles seulement : contour du pied en pointillés (relevés), dégradé de la légende, découpe du médaillon
  const defs =
    `<defs>${R ? `<symbol id="${pied}" viewBox="0 0 92 222" width="92" height="222" overflow="visible"><path d="${opts.variante === 'contour-empreinte' ? EMPREINTE_TRACE : PIED_TRACE}"></path></symbol><linearGradient id="${degrade}" x1="0" y1="1" x2="0" y2="0">${PRESSION.map((c, k) => `<stop offset="${ARRETS_PRESSION[k]}" stop-color="${c}"></stop>`).join('')}</linearGradient>` : ''}` +
    `${zoom ? `<clipPath id="${loupe}"><circle cx="${zoom.x}" cy="${zoom.y}" r="${zoom.r - 1}"></circle></clipPath>` : ''}</defs>`;
  return `<svg class="${echapper(classes)}" viewBox="0 0 240 180" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${corps(nom, { pied, degrade, loupe, R, variante: opts.variante })}</svg>`;
}

/**
 * Dessin en symbole autonome, pour un fichier SVG statique (site : /dessins/<nom>.svg, servi une fois et mis
 * en cache) que la page référence par <use href="…#d">. Les styles (dessins.css) sont posés dans le fichier
 * par l'appelant ; les couleurs (--dessin-*, --pression-*, accent de la gamme) sont héritées de la page à
 * travers <use>, le dessin suit donc le site et la surface où il est posé. Identifiant du symbole : « d ».
 */
export function symboleDessin(nom: NomDessin, opts: { registre?: Registre } = {}): string {
  const svg = svgDessin(nom, { id: 'f', registre: opts.registre });
  const classe = svg.match(/class="([^"]*)"/)?.[1] ?? 'dessin';
  const interieur = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return `<symbol id="d" viewBox="0 0 240 180" overflow="visible"><g class="${classe}" fill="none" stroke-linecap="round" stroke-linejoin="round">${interieur}</g></symbol>`;
}

/**
 * Paire d'empreintes en trame de points (repère 210 × 236, pied gauche à gauche), en symbole « d » pour un
 * fichier statique : contours en pointillés (couleur courante de la page) et trame colorée par la pression.
 */
export function symboleEmpreintes(appui: Appui): string {
  const pied = (t: string) =>
    `<g transform="${t}"><path class="empreintes__contour" d="${PIED_TRACE}"></path>${trame(appui)
      .map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}"></path>`)
      .join('')}</g>`;
  return `<symbol id="d" viewBox="0 0 210 236" overflow="visible"><g fill="none" stroke-linecap="round">${pied('translate(10 7) scale(-1 1) translate(-92 0)')}${pied('translate(108 7)')}</g></symbol>`;
}

// ———————————————————————————————————————————————————— Animations d'accueil (repère 400 × 300)
// Contenus partagés par les composants animés du site (components/animations/*) et par les images fixes :
// même tracé, mêmes couleurs ; les composants n'ajoutent que le mouvement (classes et variables --i, --b…).

const F = 'viewBox="0 0 400 300" aria-hidden="true" preserveAspectRatio="xMidYMid meet" fill="none" stroke-linecap="round" stroke-linejoin="round"';
/** Couleur d'accent des animations sur fond sombre (même cascade que les composants du site) */
const ACCENT = `var(--accent-pale, var(--signal, ${PLAN.signal}))`;
/** Trait et texte des animations : papier sur fond sombre (par défaut), encre si le composant est sur fond clair */
const TRAIT_ANIM = `var(--anim-trait, ${NEUTRES.papier})`;
/** Taille des lectures mono dans le repère 400 × 300 (même taille apparente que dans les dessins 240 × 180) */
const TAILLE_MONO = r1((TYPO.donneesDessin * 400) / 240);
const lecture = (x: number, y: number, t: string, opts: { gras?: boolean; ancre?: string; couleur?: string; opacite?: number } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" fill="${opts.couleur ?? TRAIT_ANIM}" fill-opacity="${opts.opacite ?? 0.72}" font-size="${TAILLE_MONO}" font-family="${echapper(POLICE_MONO)}"${opts.gras ? ' font-weight="600"' : ''}${opts.ancre ? ` text-anchor="${opts.ancre}"` : ''} letter-spacing="0.4" stroke="none">${t}</text>`;
const contourPointille = (d: string, leger = false, opacite?: number) => {
  const p = leger ? POINTILLE.leger : POINTILLE.contour;
  return `<path d="${d}" stroke="${TRAIT_ANIM}" stroke-width="${p.point}" stroke-dasharray="0 ${p.ecart}" stroke-opacity="${opacite ?? p.opacite}"></path>`;
};
/** Points d'une trame posés dans le repère de l'animation (graisse mise à l'échelle) */
/** Matrice SVG d'une transformation affine */
const matrice = (m: Affine) => `matrix(${m.map((v) => +v.toFixed(4)).join(' ')})`;
const poserTrame = (d: string, m: Affine) => d.replace(/M(-?[\d.]+) (-?[\d.]+)h0/g, (_, x, y) => `M${appliquer(m, +x, +y).map(r1).join(' ')}h0`);

/** Podoscope : deux empreintes en trame de points, pression à l'instant où le pied gauche est sur le talon */
function podoscopeFixe(): string {
  // Même modèle que l'animation (pas.ts) : pied gauche à l'attaque du talon, pied droit en fin de poussée (phase décalée d'un
  // demi-cycle) ; un pied en oscillation n'aurait aucun point.
  return [true, false]
    .map((gauche) => {
      const ox = 200 + (gauche ? -92 * 1.2 : 92 * 0.2);
      const oy = (300 - 222) / 2 + (gauche ? 222 * 0.04 : -222 * 0.04);
      const phase = PHASE_FIXE + (gauche ? 0 : 0.5);
      const pts = pointsTrame('normal')
        .map((p) => ({ x: r1(ox + (gauche ? 92 - p.x : p.x)), y: r1(oy + p.y), v: pressionPas(p.x, p.y, p.v, phase, TRAJET_POINTS) }))
        .filter((p) => p.v > 0.02);
      return grouperTrame(pts).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}" stroke-opacity="${r1(0.35 + 0.65 * ((n.k + 0.5) / TRAME.niveaux))}"></path>`).join('');
    })
    .join('');
}

/**
 * Coureur : squelette de profil (même cinématique que Coureur.astro : foulee.ts, d'après Novacheck 1998), pied d'appui au sol, bras
 * opposés aux jambes, marqueurs, traces et lectures. Image prise en milieu d'appui de la jambe droite.
 */
function coureurFixe(): string {
  type Pt = { x: number; y: number };
  const l = 400, h = 300, p = 0.17;
  const L = h * 0.72 * 0.5;
  const sol = h * 0.88;
  const X = (q: Pt): Pt => ({ x: l * 0.5 + q.x, y: sol + q.y });
  const pose = poseCoureur(p, L);
  const [bassin, epaule, tete] = [X(pose.bassin), X(pose.epaule), X(pose.tete)];
  const d = { g: X(pose.droite.genou), c: X(pose.droite.cheville), t: X(pose.droite.talon), o: X(pose.droite.orteil) };
  const g = { g: X(pose.gauche.genou), c: X(pose.gauche.cheville), t: X(pose.gauche.talon), o: X(pose.gauche.orteil) };
  const bd = { coude: X(pose.brasDroit.coude), main: X(pose.brasDroit.main) }, bg = { coude: X(pose.brasGauche.coude), main: X(pose.brasGauche.main) };
  const COULEURS = { cheville: PRESSION[2], genou: PRESSION[4], orteil: PRESSION[1] };
  const trait = (a: number) => transparence(NEUTRES.blanc, a);
  const seg = (a: Pt, b: Pt, w: number, c: string) => `<line x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}" stroke="${c}" stroke-width="${w}"></line>`;
  /** Volume d'un segment du corps : gélule effilée (rayon ra à l'origine, rb à l'extrémité), aplat léger et contour fin */
  const volume = (a: Pt, b: Pt, ra: number, rb: number, c: string, opacite: number) => {
    const ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang);
    const q = (o: Pt, r: number, s: number) => `${r1(o.x + nx * r * s)} ${r1(o.y + ny * r * s)}`;
    const dd = `M${q(a, ra, 1)} L${q(b, rb, 1)} A${r1(rb)} ${r1(rb)} 0 0 0 ${q(b, rb, -1)} L${q(a, ra, -1)} A${r1(ra)} ${r1(ra)} 0 0 0 ${q(a, ra, 1)} Z`;
    return `<path d="${dd}" fill="${c}" fill-opacity="${opacite}" stroke="${c}" stroke-width="${TRAIT.fin}" stroke-opacity="${Math.min(1, opacite * 4)}"></path>`;
  };
  /** Pied : triangle cheville → talon → orteils (chaussure de course) */
  const pied = (j: typeof d, c: string, opacite: number) => `<path d="M${r1(j.c.x)} ${r1(j.c.y)} L${r1(j.t.x)} ${r1(j.t.y)} L${r1(j.o.x)} ${r1(j.o.y)} Z" fill="${c}" fill-opacity="${opacite}" stroke="${c}" stroke-width="${TRAIT.fin}" stroke-linejoin="round" stroke-opacity="${Math.min(1, opacite * 4)}"></path>`;
  // Marqueur réfléchissant : point plein et halo (le halo lumineux du canvas)
  const marq = (m: Pt, r: number, c: string = NEUTRES.blanc) => `<circle cx="${r1(m.x)}" cy="${r1(m.y)}" r="${r1(r * 2.2)}" fill="${c}" fill-opacity="0.18"></circle><circle cx="${r1(m.x)}" cy="${r1(m.y)}" r="${r}" fill="${c}"></circle>`;
  const pale = trait(0.33);
  // Grille du laboratoire et sol du tapis en pointillés ronds
  const pas = Math.max(24, L / 4);
  const grille: string[] = [];
  for (let x = (l / 2) % pas; x < l; x += pas) grille.push(`M${r1(x)} 0V${h}`);
  for (let y = sol % pas; y < h; y += pas) grille.push(`M0 ${r1(y)}H${l}`);
  // Traces des marqueurs sur deux foulées : les positions passées reculent avec le tapis (comme dans le canvas)
  const recul = reculParCycle(L) * L;
  const traces = (['cheville', 'genou', 'orteil'] as const).map((cle) => {
    const pts: P[] = [];
    for (let i = 0; i <= 48; i++) {
      const age = (48 - i) / 32;
      const j = poseCoureur(p - age, L).droite;
      const m = cle === 'cheville' ? j.cheville : cle === 'genou' ? j.genou : j.orteil;
      const x = l * 0.5 + m.x - age * recul;
      if (x > l * 0.04) pts.push([x, sol + m.y]);
    }
    return `<path d="${courbe(pts)}" stroke="${COULEURS[cle]}" stroke-width="${TRAIT.normal}" stroke-opacity="0.6"></path>`;
  });
  const a1 = Math.atan2(bassin.y - d.g.y, bassin.x - d.g.x), a2 = Math.atan2(d.c.y - d.g.y, d.c.x - d.g.x);
  let ecart = a2 - a1;
  if (ecart > Math.PI) ecart -= 2 * Math.PI;
  if (ecart < -Math.PI) ecart += 2 * Math.PI;
  const ra = L * 0.12;
  const arc = `<path d="M${r1(d.g.x + ra * Math.cos(a1))} ${r1(d.g.y + ra * Math.sin(a1))} A${r1(ra)} ${r1(ra)} 0 0 ${ecart < 0 ? 0 : 1} ${r1(d.g.x + ra * Math.cos(a1 + ecart))} ${r1(d.g.y + ra * Math.sin(a1 + ecart))}" stroke="${COULEURS.genou}" stroke-width="${TRAIT.normal}"></path>`;
  const police = Math.max(11, L / 11);
  const mono = `font-family="${echapper(POLICE_MONO)}"`;
  return (
    `<path d="${grille.join('')}" stroke="${trait(0.06)}" stroke-width="${TRAIT.fin}"></path>` +
    `<line x1="0" y1="${r1(sol + 2)}" x2="${l}" y2="${r1(sol + 2)}" stroke="${trait(0.35)}" stroke-width="${TRAIT.fort}" stroke-dasharray="0 ${POINTILLE.contour.ecart * 2.5}"></line>` +
    traces.join('') +
    // Côté gauche en retrait (volumes pâles), puis tronc, tête et côté droit (accent), squelette fin par-dessus
    volume(epaule, bg.coude, L * 0.06, L * 0.045, pale, 0.14) + volume(bg.coude, bg.main, L * 0.045, L * 0.034, pale, 0.14) +
    volume(bassin, g.g, L * 0.115, L * 0.075, pale, 0.14) + volume(g.g, g.c, L * 0.075, L * 0.045, pale, 0.14) + pied(g, pale, 0.14) +
    volume(bassin, epaule, L * 0.15, L * 0.17, ACCENT, 0.16) +
    volume(epaule, tete, L * 0.05, L * 0.05, ACCENT, 0.16) +
    `<ellipse cx="${r1(tete.x + L * 0.01)}" cy="${r1(tete.y - L * 0.03)}" rx="${r1(L * 0.085)}" ry="${r1(L * 0.1)}" fill="${ACCENT}" fill-opacity="0.18" stroke="${ACCENT}" stroke-width="${TRAIT.fin}" stroke-opacity="0.5"></ellipse>` +
    volume(bassin, d.g, L * 0.12, L * 0.078, ACCENT, 0.22) + volume(d.g, d.c, L * 0.078, L * 0.045, ACCENT, 0.22) + pied(d, ACCENT, 0.26) +
    volume(epaule, bd.coude, L * 0.06, L * 0.045, ACCENT, 0.22) + volume(bd.coude, bd.main, L * 0.045, L * 0.034, ACCENT, 0.22) +
    seg(epaule, bg.coude, TRAIT.fin, pale) + seg(bg.coude, bg.main, TRAIT.fin, pale) + seg(bassin, g.g, TRAIT.fin, pale) + seg(g.g, g.c, TRAIT.fin, pale) +
    seg(bassin, epaule, TRAIT.fin, ACCENT) + seg(bassin, d.g, TRAIT.fin, ACCENT) + seg(d.g, d.c, TRAIT.fin, ACCENT) + seg(epaule, bd.coude, TRAIT.fin, ACCENT) + seg(bd.coude, bd.main, TRAIT.fin, ACCENT) +
    [g.g, g.c, g.o, bg.coude].map((m) => `<circle cx="${r1(m.x)}" cy="${r1(m.y)}" r="3" fill="${pale}"></circle>`).join('') +
    marq(bassin, 4.5) + marq(epaule, 4.5) +
    marq(d.g, 4.5, COULEURS.genou) + marq(d.c, 4.5, COULEURS.cheville) + marq(d.o, 4, COULEURS.orteil) + marq(bd.coude, 4) +
    arc +
    `<text x="${r1(d.g.x + L * 0.16)}" y="${r1(d.g.y + 4)}" fill="${COULEURS.genou}" font-weight="600" font-size="${r1(police)}" ${mono}>${Math.round(180 - pose.droite.angleGenou)}°</text>` +
    `<g fill="${NEUTRES.papier}" opacity="0.75" font-size="${r1(police * 0.85)}" ${mono}><text x="${l * 0.05}" y="${h * 0.09}" font-weight="600">ANALYSE DE LA FOULÉE</text><text x="${l * 0.05}" y="${r1(h * 0.09 + police * 1.4)}">Cadence ${Math.round(120 / (CYCLES.foulee / 1000))} pas/min · appui ${Math.round(APPUI * 100)} %</text></g>`
  );
}

/** Pieds gauche et droit des animations en 400 × 300 */
const PIEDS_ANIM = [
  { transform: 'translate(178 40) scale(-1 1)', m: [-1, 0, 0, 1, 178, 40] as Affine },
  { transform: 'translate(222 40)', m: [1, 0, 0, 1, 222, 40] as Affine },
];

/**
 * Trajectoire : contours en pointillés, trame de pression par zone (talon, bord externe, avant-pied,
 * orteils) qui s'allume au passage du centre de pression, tracé du centre de pression. Classes : tj-pied
 * (--j : pied), tj-zone (--z : zone), tj-trajet, tj-point.
 */
export function contenuTrajectoire(prefixe = 'tj'): string {
  const zone = (q: { x: number; y: number }) => (dansPulpe(q.x, q.y) ? 3 : q.y > 165 ? 0 : q.y > 95 ? 1 : 2);
  // Trame de chaque zone, définie une fois dans le repère du pied et posée sur les deux pieds par <use>
  const defs = `<defs>${[0, 1, 2, 3]
    .map((z) => `<g id="${prefixe}-z${z}">${grouperTrame(pointsTrame('normal').filter((q) => zone(q) === z)).map((n) => `<path d="${n.d}" stroke="${n.couleur}" stroke-width="${n.epaisseur}"></path>`).join('')}</g>`)
    .join('')}</defs>`;
  return (
    defs +
    PIEDS_ANIM.map(
      (p, j) =>
        `<g class="tj-pied" style="--j:${j}">${contourPointille(transformer(PIED_TRACE, p.m), true)}` +
        [0, 1, 2, 3].map((z) => `<use class="tj-zone" style="--z:${z}" href="#${prefixe}-z${z}" transform="${matrice(p.m)}"></use>`).join('') +
        `<path class="tj-trajet" d="${transformer(TRAJET, p.m)}" pathLength="1" stroke="${ACCENT}" stroke-width="${TRAIT.fort}"></path>` +
        `<circle class="tj-point" r="4.5" fill="${NEUTRES.blanc}" cx="0" cy="0" style="offset-path: path('${transformer(TRAJET, p.m)}')"></circle></g>`,
    ).join('') +
    lecture(24, 32, 'CENTRE DE PRESSION', { gras: true }) +
    lecture(24, 50, 'talon → bord externe → hallux', { couleur: ACCENT, opacite: 1 }) +
    lecture(140, 284, 'G', { ancre: 'middle' }) +
    lecture(260, 284, 'D', { ancre: 'middle' })
  );
}

/**
 * Premiers pas : petites empreintes d'enfant (pied plus court et plus large, voûte encore peu creusée)
 * en trame de points colorés par la pression, contour en pointillés, le long d'une ligne de marche en tirets.
 * Classes : pp-pas (--i : rang du pas) et pp-bande (--b : bande, du talon 0 aux orteils 4), pour faire
 * apparaître chaque empreinte du talon vers les orteils.
 */
export function contenuPremiersPas(prefixe = 'pp'): string {
  // Ligne de marche de l'enfant (bas gauche → haut droite) ; l'adulte marche à côté, à pas longs. Échelles (revue du 2026-10-04) :
  // pied d'un enfant de 1 an ≈ 0,5 × pied adulte ; pas de l'enfant ≈ 1,9 longueur de son pied, pas de l'adulte ≈ 2,75 longueurs du sien.
  const ligne = (t: number): P => [70 + t * 232 + Math.sin(t * Math.PI) * 14, 264 - t * 232];
  const echantillons = Array.from({ length: 201 }, (_, k) => ligne(k / 200));
  const cumul = echantillons.reduce<number[]>((acc, p, k) => [...acc, k ? acc[k - 1] + Math.hypot(p[0] - echantillons[k - 1][0], p[1] - echantillons[k - 1][1]) : 0], []);
  /** Paramètre t de la ligne à la distance d (abscisse curviligne) */
  const aDistance = (d: number) => { const k = cumul.findIndex((c) => c >= d); return (k < 0 ? 200 : k) / 200; };
  const dir = (t: number) => { const [a, b] = ligne(t), [c, d] = ligne(t + 0.01), n = Math.hypot(c - a, d - b); return [(c - a) / n, (d - b) / n]; };
  const LONGUEUR_PIED = 216.5; // longueur du pied dans son repère (talon → pulpe de l'hallux)
  const eAdulte = 0.5, eEnfant = eAdulte * 0.5;
  const pasEnfant = 1.9 * LONGUEUR_PIED * eEnfant, pasAdulte = 2.75 * LONGUEUR_PIED * eAdulte;
  // Pas du tout-petit : base large, pointe des pieds tournée vers l'extérieur
  const PAS = [0, 1, 2].map((i) => [aDistance(30 + i * pasEnfant), [6, 9, 4][i]]);
  const ecart = 10, PAS_ENFANT = TRAME.pasEnfant * 1.4;
  const bande = (y: number) => (y > 162 ? 0 : y > 112 ? 1 : y > 64 ? 2 : y > 34 ? 3 : 4);
  const enfant = silhouette(PLANTE_ENFANT, ORTEILS_ENFANT);
  const champ = (x: number, y: number) => Math.min(1, 0.32 + 0.62 * g2(x, y, 48, 196, 15, 18) + 0.45 * g2(x, y, 44, 72, 18, 13) + 0.4 * g2(x, y, 22, 22, 8));
  // Plante en trame (sans la zone des orteils), puis un petit amas de points par orteil : on lit un pied
  const coussinets = ORTEILS_ENFANT.flatMap(([cx, cy, rx], i) =>
    (i === 0 ? [[-0.38, 0.2], [0.38, 0.2], [0, -0.42]] : [[0, 0]]).map(([u, w]) => ({ x: r1(cx + u * rx), y: r1(cy + w * rx), v: i === 0 ? 0.9 : 0.7 })),
  );
  const plante = pointsTrame(champ, PAS_ENFANT, dansEnfant).filter((q) => q.y > 40);
  const niveaux = grouperTrame([...plante, ...coussinets], PAS_ENFANT, (q) => bande(q.y));
  const empreintes = PAS.map(([t, ecartAngle], i) => {
    const [x, y] = ligne(t);
    const [dx, dy] = dir(t);
    const gauche = i % 2 === 0;
    const s = gauche ? 1 : -1;
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI - s * ecartAngle;
    const m = poserTalon(x + s * dy * ecart, y - s * dx * ecart, angle, eEnfant, gauche);
    return `<g class="pp-pas" style="--i:${i}">${contourPointille(transformer(enfant, m), true, POINTILLE.contour.opacite)}${[0, 1, 2, 3, 4].map((b) => `<use class="pp-bande" style="--b:${b}" href="#${prefixe}-b${b}" transform="${matrice(m)}"></use>`).join('')}</g>`;
  });
  // Pas de l'adulte, plus longs, en contour seul (pied réel) : on marche à côté de l'enfant
  const adulte = [0, 1].map((i) => {
    const t = aDistance(26 + i * pasAdulte);
    const [x, y] = ligne(t);
    const [dx, dy] = dir(t);
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const d = 50 + (i % 2 ? 7 : -7);
    const m = poserTalon(x - dy * d, y + dx * d, angle, eAdulte, i % 2 === 0);
    return `<path d="${transformer(CONTOUR_PIED.plantaire.trait, m)}" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.fin}" stroke-opacity="0.32"></path>`;
  });
  // Bandes de trame du pied d'enfant (talon → orteils), définies une fois dans le repère du pied
  const defs = `<defs>${[0, 1, 2, 3, 4].map((b) => `<g id="${prefixe}-b${b}">${niveaux.filter((q) => q.g === b).map((q) => `<path d="${q.d}" stroke="${q.couleur}" stroke-width="${q.epaisseur}"></path>`).join('')}</g>`).join('')}</defs>`;
  return (
    defs +
    `<path d="${courbe(Array.from({ length: 21 }, (_, k) => ligne(k / 20)))}" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.fin}" stroke-dasharray="${POINTILLE.tiret}" stroke-opacity="0.3"></path>` +
    adulte.join('') +
    empreintes.join('') +
    lecture(24, 68, 'pas de l’enfant ≈ 2 longueurs de pied', { couleur: ACCENT, opacite: 1 }) +
    lecture(24, 84, 'pas de l’adulte ≈ 2,75 longueurs de pied', { opacite: 0.55 }) +
    lecture(24, 32, 'PREMIERS PAS', { gras: true }) +
    lecture(24, 50, 'à côté des pas de l’adulte', { opacite: 0.55 })
  );
}

/**
 * Semelle : deux semelles thermoformées en courbes d'appui (cuvette du talon, soutien de voûte, barre
 * des têtes métatarsiennes, hallux), contour de la semelle, empreinte des orteils en pointillés.
 * Classes : sm-pied (--j : pied), sm-courbe (--k : niveau).
 */
export function contenuSemelle(prefixe = 'sm', teinte: 'accent' | 'palette' = 'accent'): string {
  // CARTE DE RELIEF (courbes de niveau de la semelle thermoformée), jamais une carte de pression : en un seul accent, de plus en plus
  // opaque vers le haut (variante « palette » : niveaux colorés, légende « relief »). Cuvette du talon, soutien de voûte, barre
  // rétrocapitale derrière les têtes métatarsiennes (POD-AT-0004).
  const courbes = courbesRelief();
  const couleur = (k: number) => (teinte === 'palette' ? PRESSION[k] : ACCENT);
  const opacite = (k: number) => (teinte === 'palette' ? 1 : r1(0.35 + (0.65 * k) / (courbes.length - 1)));
  // Courbes définies une fois (repère du pied droit) et posées sur les deux semelles par <use>
  const defs = `<defs>${courbes.map(({ boucles }, k) => boucles.map((d, i) => `<path id="${prefixe}-${k}-${i}" d="${d}" pathLength="1"></path>`).join('')).join('')}</defs>`;
  const pieds = PIEDS_ANIM.map((p, j) => {
    const m: Affine = [p.m[0], 0, 0, 1, p.m[0] < 0 ? 222 : 250, 38];
    return (
      `<g class="sm-pied" style="--j:${j}">` +
      `<path d="${transformer(SEMELLE, m)}" stroke="${TRAIT_ANIM}" stroke-width="${TRAIT.normal}" stroke-opacity="0.55"></path>` +
      courbes.map(({ boucles }, k) => boucles.map((_, i) => `<use class="sm-courbe" style="--k:${k}" href="#${prefixe}-${k}-${i}" transform="${matrice(m)}" stroke="${couleur(k)}" stroke-opacity="${opacite(k)}" stroke-width="${TRAIT.fort}"></use>`).join('')).join('') +
      `</g>`
    );
  }).join('');
  const nuancier = courbes.map((_, k) => `<rect x="${24 + k * 14}" y="268" width="12" height="4" fill="${couleur(k)}" fill-opacity="${opacite(k)}"></rect>`).join('');
  return defs + pieds + lecture(24, 32, 'COURBES DE NIVEAU', { gras: true }) + lecture(24, 50, 'relief de la semelle') + lecture(24, 66, 'thermoformée') + nuancier + lecture(24, 288, 'relief : bas → haut', { opacite: 0.5 });
}

/** Schéma pédagogique associé à chaque animation (image fixe calme du registre pédagogique) */
const SCHEMA_ANIMATION: Record<Animation, NomDessin> = { podoscope: 'analyse', coureur: 'sport', trajectoire: 'equilibre', 'premiers-pas': 'enfant', semelle: 'semelle' };

/**
 * Image fixe d'une animation d'accueil (<svg>…</svg>, repère 400 × 300), fidèle à l'animation du site :
 * même géométrie de pied, même trame, même palette. Fond transparent : l'appelant pose le fond sombre.
 * En registre pédagogique : le schéma au trait du même sujet, centré (styles de dessins.css).
 */
export function svgAnimationFixe(animation: Animation, opts: { id?: string; registre?: Registre } = {}): string {
  const id = opts.id ?? `a-${animation}`;
  if (opts.registre === 'pedagogique') {
    const schema = svgDessin(SCHEMA_ANIMATION[animation], { id: `${id}-schema`, registre: 'pedagogique' }).replace('<svg ', '<svg x="30" y="22.5" width="340" height="255" ');
    return `<svg id="${echapper(id)}" class="animation-fixe animation-fixe--${animation} animation-fixe--pedagogique" ${F}>${schema}</svg>`;
  }
  const contenu =
    animation === 'podoscope' ? podoscopeFixe()
    : animation === 'coureur' ? coureurFixe()
    : animation === 'trajectoire' ? contenuTrajectoire(id)
    : animation === 'premiers-pas' ? contenuPremiersPas(id)
    : contenuSemelle(id);
  return `<svg id="${echapper(id)}" class="animation-fixe animation-fixe--${animation}" ${F}>${contenu}</svg>`;
}

// ———————————————————————————————————————————————————— Matériel du cabinet (repère 120 × 90)
// Une famille de dessins d'équipements, même trait et mêmes classes que les dessins de soins (dessins.css) :
// contour au trait fort sur aplat clair, détails au trait fin, accent pour l'eau, la lumière, le flux ;
// en registre « relevé », les écrans et empreintes portent la trame et la palette de pression. Pensés pour
// être lus en petit (liste du matériel) : peu de détails, silhouettes franches, aucune annotation.

/** Équipements du catalogue (equipements.ts) qui ont leur dessin */
export const EQUIPEMENTS_DESSINES = [
  'tapis-de-course', 'iontophorese', 'podoscope', 'plateforme-pression', 'autoclave-classe-b',
  'fauteuil-soins', 'aspiration', 'scanner-3d', 'fraiseuse-numerique', 'monofilament-diapason',
] as const;
export type EquipementDessine = (typeof EQUIPEMENTS_DESSINES)[number];
export const equipementDessine = (id: string): id is EquipementDessine => (EQUIPEMENTS_DESSINES as readonly string[]).includes(id);

/** Trame d'un pied posée par une transformation (graisse des points mise à l'échelle) */
const trameposee = (champ: Champ, pas: number, m: Affine, e: number) =>
  `<g class="trame">${grouperTrame(pointsTrame(champ, pas), pas)
    .map((n) => `<path d="${poserTrame(n.d, m)}" stroke="${n.couleur}" stroke-width="${r1(n.epaisseur * e)}"></path>`)
    .join('')}</g>`;
/** Pied vu de dessus, posé à plat sur un plateau vu en léger surplomb (raccourci en profondeur, cisaillé) */
const surPlateau = (x: number, y: number, a: number, d: number, cisaille: number, gauche = false): Affine =>
  gauche ? [-a, 0, cisaille * d, d, x + a * 92, y] : [a, 0, cisaille * d, d, x, y];

function corpsEquipement(id: EquipementDessine, R: boolean, ident: string): string {
  // Empreinte : trame (relevé) ou silhouette avec zones d'appui (pédagogique)
  const empreinte = (m: Affine, e: number, appui: Appui = 'normal') =>
    R ? trameposee(appui, TRAME.pas * 1.6, m, e) : `<g transform="${matrice(m)}">${empreinteZones(appui)}</g>`;
  const sol = (y = 84) => `<line class="cote" x1="4" y1="${y}" x2="116" y2="${y}"></line>`;
  switch (id) {
    case 'tapis-de-course':
      // Tapis d'analyse de la marche : tapis, console, caméra sur trépied visant la foulée
      return `${sol()}<path class="trait peau" d="M30 70 H104 Q109 70 109 75 Q109 80 104 80 H34 Q29 80 29 75 Q29 70 34 70 Z"></path><path class="fin" d="M34 72.6 H104"></path><circle class="fin" cx="35" cy="75" r="2.6"></circle><circle class="fin" cx="103" cy="75" r="2.6"></circle><path class="trait" d="M36 80 V84 M100 80 V84"></path><path class="trait" d="M104 70 L110 32"></path><path class="trait" d="M108 44 L86 46"></path><path class="trait peau" d="M100 22 L117 19 L118.6 30 L101.6 33 Z"></path>${
        R
          ? PRESSION.map((c, k) => `<path d="M${r1(103.5 + k * 2.8)} ${r1(29.4 - k * 0.5)} v-${2 + k * 1.1}" stroke="${c}" stroke-width="${TRAIT.fort}"></path>`).join('')
          : '<path class="zone zone--forte" d="M102.6 23.6 L115.6 21.4 L116.6 28.6 L103.6 30.8 Z"></path>'
      }<path class="trait" d="M8 84 L15 58 L22 84 M15 58 V84"></path><path class="trait peau" d="M8 50 H20 Q22 50 22 52 V56 Q22 58 20 58 H8 Q6 58 6 56 V52 Q6 50 8 50 Z"></path><path class="trait" d="M22 52 H25 V56 H22"></path><path class="guide" d="M26 54 L58 70 M26 54 L82 70"></path>${
        R ? '<path class="faisceau" d="M26 54 L58 70 L82 70 Z"></path>' : ''
      }`;

    case 'iontophorese': {
      // Iontophorèse (hydrophorèse) : deux bacs d'eau avec électrodes, reliés au générateur de faible courant
      const bac = (x: number) =>
        `<path class="trait peau" d="M${x} 58 L${x + 3} 77 Q${x + 3.4} 80 ${x + 6} 80 H${x + 38} Q${x + 40.6} 80 ${x + 41} 77 L${x + 44} 58"></path><path class="trait" d="M${x - 1} 58 H${x + 45}"></path><path class="eau" d="M${x + 4} 64 q4 -2 8 0 t8 0 t8 0 t8 0 t8 0"></path>${
          R ? `<path class="eau eau--fine" d="M${x + 6} 69 q4 -1.6 8 0 t8 0 t8 0 t8 0"></path>` : `<path class="zone" d="M${x + 4} 64 q4 -2 8 0 t8 0 t8 0 t8 0 t8 0 L${x + 38} 77 Q${x + 38} 79 ${x + 36} 79 H${x + 8} Q${x + 6} 79 ${x + 6} 77 Z"></path>`
        }<path class="fin" d="M${x + 9} 75 H${x + 35}"></path>`;
      return `${sol()}${bac(6)}${bac(64)}<path class="trait" d="M28 58 C28 42 46 40 52 30 M86 58 C86 42 70 40 66 30"></path><path class="trait peau" d="M46 10 H74 Q77 10 77 13 V27 Q77 30 74 30 H46 Q43 30 43 27 V13 Q43 10 46 10 Z"></path><circle class="fin" cx="52" cy="20" r="4"></circle><path class="fin" d="M52 20 L54.6 17.4"></path>${
        R ? PRESSION.slice(0, 4).map((c, k) => `<path d="M${61 + k * 3.4} 24 v-${3 + k * 1.6}" stroke="${c}" stroke-width="${TRAIT.fort}"></path>`).join('') : '<path class="zone zone--forte" d="M60 15 H72 V25 H60 Z"></path>'
      }`;
    }

    case 'podoscope': {
      // Podoscope en vue de 3/4 : caisson bas à dessus de verre, le patient debout dessus (bas des jambes) ;
      // en façade, le miroir incliné à 45° renvoie l'image de la plante des pieds, où se lisent les appuis.
      const pose = (x: number, gauche: boolean): Affine => (gauche ? [-0.13, 0, -0.05, -0.055, x + 12, 60] : [0.13, 0, -0.05, -0.055, x, 60]);
      const pieds = [pose(38, true), pose(64, false)];
      const jambes = pieds
        .map((m) => {
          const [hx, hy] = appliquer(m, 47, 190);
          return `<path class="trait peau trait--moyen" d="M${r1(hx - 5)} ${r1(hy + 1)} C${r1(hx - 6.5)} ${r1(hy - 14)} ${r1(hx - 8)} 20 ${r1(hx - 8)} 2 M${r1(hx + 5)} ${r1(hy + 1)} C${r1(hx + 6.5)} ${r1(hy - 14)} ${r1(hx + 8)} 20 ${r1(hx + 8)} 2"></path>`;
        })
        .join('');
      // Reflet dans le miroir incliné : l'avant de la vitre (orteils, le patient fait face) apparaît en BAS, la gauche et la droite
      // sont conservées → même image que la vue de dessus (pied droit à gauche, hallux vers le centre, orteils vers le bas)
      const reflet = (x: number, gauche: boolean): Affine => (gauche ? [-0.1, 0, 0, -0.1, x + 9.2, 84.4] : [0.1, 0, 0, -0.1, x, 84.4]);
      return `${sol(88)}<path class="trait peau" d="M14 46 H92 L106 58 H28 Z"></path><path class="fin" d="M22 49 H90 L99 56"></path><path class="trait peau" d="M14 46 L28 58 V86 L14 74 Z"></path><path class="trait peau" d="M28 58 H106 V86 H28 Z"></path><path class="miroir" d="M33 61.5 H101 V83 H33 Z"></path>${pieds
        .map((m) => piedReel(m, 'plantaire', { classe: 'trait--moyen', details: false }))
        .join('')}${jambes}${empreinte(reflet(50, true), 0.1)}${empreinte(reflet(74, false), 0.1)}<path class="trait" d="M31 86 V88 M103 86 V88"></path>`;
    }

    case 'plateforme-pression': {
      // Plateforme de baropodométrie : tapis à capteurs, empreintes en pression, écran de lecture
      const d = 15 / 222, a = 0.12;
      const grille = R
        ? `<path class="grille-capteurs" d="${Array.from({ length: 6 }, (_, j) => Array.from({ length: 14 }, (_, i) => `M${r1(18 + i * 5.6 + j * 2.9)} ${r1(52 + j * 2.6)}h0`).join('')).join('')}"></path>`
        : '';
      return `${sol(84)}<path class="trait peau" d="M12 50 H86 L102 66 H28 Z"></path><path class="trait peau" d="M28 66 H102 V70 H28 Z"></path>${grille}${empreinte(surPlateau(40, 50.4, a, d, 1, true), 0.12)}${empreinte(surPlateau(57, 50.4, a, d, 1), 0.12)}<path class="trait" d="M102 68 C110 68 112 60 106 52"></path><path class="trait peau" d="M88 14 H114 V36 H88 Z"></path><path class="trait" d="M84 40 H118 L114 36 H88 Z"></path>${
        R
          ? `${trameposee('normal', TRAME.pas * 2.2, [-0.075, 0, 0, 0.075, 99, 17], 0.075)}${trameposee('normal', TRAME.pas * 2.2, [0.075, 0, 0, 0.075, 102, 17], 0.075)}`
          : `<path class="empreinte" d="${transformer(EMPREINTE_TRACE, [-0.075, 0, 0, 0.075, 99, 17])}"></path><path class="empreinte" d="${transformer(EMPREINTE_TRACE, [0.075, 0, 0, 0.075, 102, 17])}"></path>`
      }`;
    }

    case 'autoclave-classe-b':
      // Autoclave : cuve à hublot (plateaux d'instruments visibles), afficheur du cycle, impression de traçabilité
      return `${sol(84)}<path class="trait peau" d="M18 18 H102 Q106 18 106 22 V74 Q106 78 102 78 H18 Q14 78 14 74 V22 Q14 18 18 18 Z"></path><circle class="trait peau" cx="44" cy="48" r="20"></circle><path class="fin" d="M30 44 H58 M28 52 H60"></path><path class="trait" d="M66 42 V54"></path><path class="trait peau" d="M76 26 H100 V38 H76 Z"></path>${
        R ? PRESSION.map((c, k) => `<path d="M${79 + k * 4} 32 h2.6" stroke="${c}" stroke-width="${TRAIT.marque}"></path>`).join('') : '<path class="zone zone--forte" d="M78 28 H98 V36 H78 Z"></path>'
      }<path class="fin" d="M78 46 H84 M88 46 H94"></path><path class="trait" d="M80 62 H96"></path><path class="trait peau" d="M83 62 V54 H93 V62"></path><path class="fin" d="M85.5 57 H90.5 M85.5 59.5 H89"></path><path class="trait" d="M22 78 V83 M98 78 V83"></path>`;

    case 'fauteuil-soins':
      // Fauteuil de soins : dossier incliné, assise, repose-jambes, colonne de réglage en hauteur
      return `${sol(84)}<path class="trait peau" d="M14 14 Q13 10 17 9.5 L24 9 Q27 9 27 12 V13 Q27 16 24 16.2 L17 16.6 Q14 16.8 14 14 Z"></path><path class="trait peau" d="M17 24 Q15 19.5 20 18.5 L24 17.8 Q28 17.2 29.6 21.2 L42 55 Q43.5 59.4 39 60.4 L35 61.3 Q31 62.2 29.5 58.4 Z"></path><path class="trait peau" d="M38 57 H78 Q82 57 82 61 V62 Q82 66 78 66 H40 Q36 66 36 62 V61 Q36 57 38 57 Z"></path><path class="trait peau" d="M80 58 L104 65.4 Q108 66.6 107 70.4 Q106 74.2 102 73 L78 65.6 Z"></path><path class="trait" d="M104 73.4 L110 79 M44 48 H70 M62 48 V57 M55 66 V80 M65 66 V80 M38 84 H84"></path><path class="fin" d="M86 80 H94 V84"></path>${
        R ? '<path class="guide" d="M30 10 A30 30 0 0 1 52 26"></path><path class="guide" d="M70 76 V64"></path>' : ''
      }`;

    case 'aspiration':
      // Micromoteur avec aspiration : boîtier, pièce à main et fraise, buse d'aspiration au plus près de l'outil
      return `${sol(84)}<path class="trait peau" d="M10 52 H42 Q45 52 45 55 V80 Q45 83 42 83 H10 Q7 83 7 80 V55 Q7 52 10 52 Z"></path><circle class="fin" cx="18" cy="64" r="4.4"></circle><path class="fin" d="M18 64 L20.8 61.2"></path><path class="fin" d="M28 60 H40 M28 66 H40 M28 72 H36"></path><path class="trait" d="M42 56 C58 54 60 46 68 42"></path><path class="tuyau" d="M42 62 C62 62 70 52 82 46"></path><path class="trait peau" d="M66 44 L96 22 Q99 20 100.6 22.2 Q102.2 24.4 99.4 26.6 L70 48 Q67 50 65.4 47.8 Q63.8 45.6 66 44 Z"></path><path class="trait" d="M100 24 L106 19.6"></path><circle class="trait" cx="107.6" cy="18.4" r="1.8"></circle><path class="trait peau" d="M82 46 L98 34 Q101 32 102.4 34.2 Q103.6 36.4 100.8 38.2 L86 49 Z"></path>${
        R ? '<path class="faisceau-axe" d="M108 24 Q106 30 102 36"></path><path class="poussieres" d="M110 22h0 M111 27h0 M108 30h0 M105 33h0"></path>' : ''
      }`;

    case 'scanner-3d': {
      // Scanner 3D : pied posé sur la vitre, barre de balayage ; la partie déjà relevée en maillage
      const m: Affine = [0, 0.34, -0.34, 0, 98, 32.4]; // pied à l'horizontale, talon à gauche
      const peaux = CONTOUR_PIED.plantaire.peaux.map((p) => transformer(p, m));
      const maillage = `${Array.from({ length: 16 }, (_, k) => `M${r1(12 + k * 3.4)} 30 V66`).join(' ')} ${Array.from({ length: 11 }, (_, k) => `M10 ${r1(30 + k * 3.4)} H64`).join(' ')}`;
      return `<defs><clipPath id="${ident}-pied">${peaux.map((p) => `<path d="${p}"></path>`).join('')}</clipPath></defs><path class="trait peau" d="M10 22 H110 Q114 22 114 26 V70 Q114 74 110 74 H10 Q6 74 6 70 V26 Q6 22 10 22 Z"></path><path class="fin" d="M10 78 H110"></path>${peaux.map((p) => `<path class="peau-seule" d="${p}"></path>`).join('')}<path class="trait" d="${transformer(CONTOUR_PIED.plantaire.trait, m)}"></path><path class="maillage" clip-path="url(#${ident}-pied)" d="${maillage}"></path><path class="faisceau" d="M60 24 H68 V72 H60 Z"></path><path class="faisceau-axe" d="M64 24 V72"></path>${
        R ? `<g clip-path="url(#${ident}-pied)">${trameposee('normal', TRAME.pas * 1.6, m, 0.34).replace('<g class="trame">', '<g class="trame trame--legere">')}</g>` : ''
      }`;
    }

    case 'fraiseuse-numerique':
      // Fraiseuse numérique (CFAO) : portique, broche et fraise usinant le dessus d'une semelle dans un bloc
      return `${sol(84)}<path class="trait peau" d="M10 70 H110 V80 H10 Z"></path><path class="trait" d="M18 70 V18 M102 70 V18"></path><path class="trait peau" d="M14 14 H106 V22 H14 Z"></path><path class="trait peau" d="M54 22 H70 V38 H54 Z"></path><path class="trait peau" d="M58 38 H66 V50 H58 Z"></path><path class="trait" d="M62 50 V57"></path><path class="guide" d="M28 52 H92"></path><path class="trait peau" d="M28 70 V56 C34 54 38 60 46 61 C56 62 60 57 66 57 C74 57 80 62 92 63 V70 Z"></path>${
        R ? '<path class="faisceau-axe" d="M30 56 C36 54 40 60 46 61 C56 62 60 57 62 57"></path>' : '<path class="zone" d="M28 52 H92 V63 C80 62 74 57 66 57 C60 57 56 62 46 61 C38 60 34 54 28 56 Z"></path>'
      }<path class="trait" d="M14 80 V84 M106 80 V84"></path>`;

    case 'monofilament-diapason':
      // Monofilament 10 g : manche, filament PERPENDICULAIRE à la peau et plié en C au contact (on appuie jusqu'à la flexion) ;
      // diapason gradué (sensibilité vibratoire), à poser sur l'articulation interphalangienne dorsale de l'hallux.
      return `<path class="peau-seule" d="M8 74 C24 70 46 70 64 74 V86 H8 Z"></path><path class="trait" d="M8 74 C24 70 46 70 64 74"></path><path class="trait peau" d="M31 8 Q31 5 34 5 H38 Q41 5 41 8 V40 Q41 43 38 43 H34 Q31 43 31 40 Z"></path><path class="filament" d="M36 43 C36 53 29 57 29.6 63 C30 68 36 68.4 36 71.2"></path><path class="trait" d="M78 8 V46 Q78 56 87 56 Q96 56 96 46 V8 M87 56 V80"></path><circle class="trait peau" cx="87" cy="82" r="3"></circle><path class="trait peau" d="M75 14 H81 V22 H75 Z M93 14 H99 V22 H93 Z"></path>${
        R ? '<path class="vibration" d="M72 30 Q70 34 72 38 M68 28 Q65 34 68 40 M102 30 Q104 34 102 38 M106 28 Q109 34 106 40"></path>' : ''
      }`;
  }
  return '';
}

/**
 * Dessin d'un équipement du cabinet (<svg>…</svg>, repère 120 × 90), décoratif, dans le registre demandé ;
 * chaîne vide si l'équipement n'a pas de dessin (l'appelant garde alors son icône au trait).
 */
export function svgEquipement(id: string, opts: { id?: string; classe?: string; registre?: Registre } = {}): string {
  if (!equipementDessine(id)) return '';
  const registre = opts.registre ?? 'releve';
  const ident = opts.id ?? `m-${id}`;
  const classes = ['dessin', 'dessin--materiel', `dessin--${registre}`, opts.classe].filter(Boolean).join(' ');
  return `<svg class="${echapper(classes)}" viewBox="0 0 120 90" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${corpsEquipement(id, registre === 'releve', ident)}</svg>`;
}

/** Équipement en symbole « d » pour un fichier statique (/dessins/materiel-<id>.svg), comme symboleDessin */
export function symboleEquipement(id: EquipementDessine, opts: { registre?: Registre } = {}): string {
  const svg = svgEquipement(id, { id: 'f', registre: opts.registre });
  const classe = svg.match(/class="([^"]*)"/)?.[1] ?? 'dessin';
  const interieur = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return `<symbol id="d" viewBox="0 0 120 90" overflow="visible"><g class="${classe}" fill="none" stroke-linecap="round" stroke-linejoin="round">${interieur}</g></symbol>`;
}
