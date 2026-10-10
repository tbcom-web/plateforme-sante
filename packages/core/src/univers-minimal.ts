// UNIVERS MINIMAL (demande de Paul du 2026-10-10 : « faire des représentations illustratives minimales stylées pour représenter
// l'univers Diabète / Basket / Tennis / Golf / Cyclisme »). Direction : celle que Paul a trouvée « WOW » (animations du pied,
// 5f9b9ca ; empreintes en lignes de niveau) — minimalisme stylé, aplats organiques + traits fins, lignes de niveau, trajectoires,
// formes géométriques franches, couleurs de la gamme ; image FIXE belle d'abord, lecture légère ensuite.
//
// Planche des propositions (3-4 par univers) dans le scratchpad (univers-minimal/planche.png) ; seules les deux meilleures par
// univers sont gardées ici (UNIVERS_MINIMAUX). Toutes « à valider » : seul Paul valide.
//
// AUCUNE ANATOMIE INVENTÉE : les pieds sont les silhouettes validées (entete-pied-geo.ts : plante adulte et isothermes — courbes
// d'égale distance au bord), les sites de sensibilité SITES_MONOFILAMENT (dessins.ts, même repère que la plante), le miroir
// penché celui du héros diabète (univers-diabete.ts : heros:diabete-miroir), les coutures du ballon et de la balle celles du kit
// Sports (sports.ts). Le reste est fait d'objets et de formes franches : cercle et filet, rebond, lignes du court, green, drapeau (sans
// texte), roue et rayons, profil d’étape. Aucun logo, aucune marque, aucun texte, aucun chiffre.
//
// Deux sorties pour chaque visuel gardé (même géométrie, rôles des tracés communs) :
//  - visuel animé du premier écran (clé composant:entete-anim:un-<id>) : panneau de la gamme (sombre par défaut, clair « encre »,
//    `nu` = sans fond : surface claire ou sombre de la page), variables --hp-* ; < 5 Ko balisage + feuille ; seuls transform,
//    opacity et stroke-dashoffset animés, UNE fois sous `.ea-joue` ; réduction des animations → l'image fixe (= la dernière image) ;
//  - illustration fixe (clé dessin:un-<id>:pedagogique) : mêmes tracés dans les classes de dessins.css (registre pédagogique),
//    pour les kits (famille « illustration »), le fond « illustration » et le héros illustré du profil.
// Diabète : univers DOUX — bleus froids de la charte seulement (jamais la couleur vive de la gamme, jamais de rouge), aucune
// plaie, aucun chiffre, aucune promesse, lecture lente sans rebond. Basket et tennis (vifs) : jamais pour le diabète ni les seniors.
import { GEO_PIED as G } from './entete-pied-geo';
import { poserChemin } from './images-fixes-pied';
import { cheminLisse } from './sports';
import { SITES_MONOFILAMENT } from './dessins';
import type { P } from './pied';
import { PRESSION } from './univers';

// ———————————————————————————————————————————————————— Fiches

export const UNIVERS_MINIMAUX = [
  'un-basket-arc', 'un-basket-terrain',
  'un-tennis-rebond', 'un-tennis-court',
  'un-golf-green', 'un-golf-alveoles',
  'un-cyclisme-roue', 'un-cyclisme-profil',
  'un-diabete-sensibilite', 'un-diabete-miroir',
] as const;
export type UniversMinimal = (typeof UNIVERS_MINIMAUX)[number];
export const estUniversMinimal = (a: unknown): a is UniversMinimal => (UNIVERS_MINIMAUX as readonly unknown[]).includes(a);

export type DomaineUniversMinimal = 'basket' | 'tennis' | 'golf' | 'cyclisme' | 'diabete';

export interface FicheUniversMinimal {
  univers: DomaineUniversMinimal;
  libelle: string;
  /** Ce que montre le visuel (le regard du pédicure-podologue) */
  regard: string;
  /** Sujets des visuels (thèmes) où il est proposé ; basket et tennis (vifs) jamais pour le diabète ni les seniors */
  sujets: readonly string[];
  /** Hashtags par défaut (FORME_HASHTAG) : sujet, activité (#basket…), détails */
  hashtags: readonly string[];
  /** Énergie (0-1) : ≥ 0,7 = vif */
  energie: number;
}

const SPORT = (a: string, ...h: string[]) => ['sport', a, ...h];

export const FICHES_UNIVERS_MINIMAUX: Readonly<Record<UniversMinimal, FicheUniversMinimal>> = {
  'un-basket-arc': {
    univers: 'basket', libelle: 'Basket : arc de tir vers le cercle', energie: 0.7, sujets: ['sport'],
    regard: 'Le ballon et ses coutures en arcs, la trajectoire du tir en pointillé jusqu’au cercle et son filet : le saut et la réception, sans joueur',
    hashtags: SPORT('basket', 'basketball', 'ballon', 'saut'),
  },
  'un-basket-terrain': {
    univers: 'basket', libelle: 'Basket : terrain en lignes de niveau', energie: 0.5, sujets: ['sport'],
    regard: 'La raquette, le cercle des lancers francs et la ligne à trois points reprise en lignes de niveau : le terrain comme une carte',
    hashtags: SPORT('basket', 'basketball', 'terrain'),
  },
  'un-tennis-rebond': {
    univers: 'tennis', libelle: 'Tennis : la balle et son rebond', energie: 0.7, sujets: ['sport'],
    regard: 'La trajectoire de la balle en pointillé, la trace du rebond sur le court, la balle et sa couture : les appuis qui suivent chaque frappe',
    hashtags: SPORT('tennis', 'padel', 'balle', 'appuis'),
  },
  'un-tennis-court': {
    univers: 'tennis', libelle: 'Tennis : le court en perspective douce', energie: 0.55, sujets: ['sport'],
    regard: 'Les lignes du court en perspective, le filet en trame fine, la balle qui passe et tombe dans le carré de service',
    hashtags: SPORT('tennis', 'padel', 'court'),
  },
  'un-golf-green': {
    univers: 'golf', libelle: 'Golf : green en lignes de niveau', energie: 0.4, sujets: ['sport', 'senior'],
    regard: 'Le green en lignes de niveau, le trou et son drapeau (sans texte), la trajectoire de la balle qui s’y pose : la marche du parcours',
    hashtags: SPORT('golf', 'green', 'parcours'),
  },
  'un-golf-alveoles': {
    univers: 'golf', libelle: 'Golf : la balle alvéolée sur son tee', energie: 0.35, sujets: ['sport', 'senior'],
    regard: 'La balle en trame d’alvéoles serrée, posée sur son tee : l’objet du golf, en formes franches',
    hashtags: SPORT('golf', 'balle'),
  },
  'un-cyclisme-roue': {
    univers: 'cyclisme', libelle: 'Cyclisme : la roue et ses rayons', energie: 0.55, sujets: ['sport'],
    regard: 'Une roue de vélo en traits fins (pneu, jante, rayons croisés, moyeu) sur un disque doux, traits de vitesse : la roue tourne une fois puis s’arrête',
    hashtags: SPORT('cyclisme', 'velo', 'roue'),
  },
  'un-cyclisme-profil': {
    univers: 'cyclisme', libelle: 'Cyclisme : profil d’étape en lignes de niveau', energie: 0.4, sujets: ['sport'],
    regard: 'Le profil d’une étape en aplat, ses lignes de niveau et la route qui se dessine jusqu’au sommet : la montée, sans aucune valeur',
    hashtags: SPORT('cyclisme', 'velo', 'montagne'),
  },
  'un-diabete-sensibilite': {
    univers: 'diabete', libelle: 'Diabète : la plante et ses points de sensibilité', energie: 0.2, sujets: ['diabete'],
    regard: 'La plante du pied en aplat doux et en lignes de niveau froides, trois points de sensibilité qui s’allument doucement (pulpe du gros orteil, têtes du 1er et du 5e métatarsien), sans instrument',
    hashtags: ['diabete', 'sensibilite', 'prevention', 'plante-du-pied'],
  },
  'un-diabete-miroir': {
    univers: 'diabete', libelle: 'Diabète : inspection au miroir', energie: 0.2, sujets: ['diabete'],
    regard: 'Un miroir posé au sol, penché, où se reflète la plante du pied en traits bleus : regarder sous ses pieds chaque jour (ameli.fr), sans instrument',
    hashtags: ['diabete', 'auto-examen', 'miroir', 'prevention', 'soin-quotidien'],
  },
};

/** Visuels vifs : jamais pour le diabète ni les seniors */
export const UNIVERS_MINIMAUX_VIFS: readonly UniversMinimal[] = UNIVERS_MINIMAUX.filter((a) => FICHES_UNIVERS_MINIMAUX[a].energie >= 0.7);
/** Sujets de chaque visuel (heros-anime.ts) */
export const SUJETS_UNIVERS_MINIMAUX: Readonly<Record<UniversMinimal, readonly string[]>> = Object.fromEntries(UNIVERS_MINIMAUX.map((a) => [a, FICHES_UNIVERS_MINIMAUX[a].sujets])) as Record<UniversMinimal, readonly string[]>;

/** Clés d'inventaire : animation (composant:entete-anim:un-<id>) et illustration fixe (dessin:un-<id>:pedagogique) */
export const cleAnimationUnivers = (a: UniversMinimal) => `composant:entete-anim:${a}`;
export const cleDessinUnivers = (a: UniversMinimal) => `dessin:${a}:pedagogique`;
export const CLES_UNIVERS_MINIMAUX: readonly string[] = UNIVERS_MINIMAUX.flatMap((a) => [cleAnimationUnivers(a), cleDessinUnivers(a)]);
/** Hashtags par défaut (kits.ts, HASHTAGS_PAR_DEFAUT) : #<activité> rattache au kit du profil (Sport · basket…) */
export const HASHTAGS_UNIVERS_MINIMAUX: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  UNIVERS_MINIMAUX.flatMap((a) => [cleAnimationUnivers(a), cleDessinUnivers(a)].map((c) => [c, [...new Set(FICHES_UNIVERS_MINIMAUX[a].hashtags)].sort()] as const)),
);

// ———————————————————————————————————————————————————— Outils (scène 300 × 240)

const r1 = (v: number) => Math.round(v * 10) / 10;
const pts = (l: readonly P[], ferme = false) => `M${l.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}${ferme ? 'Z' : ''}`;
const quad = (a: P, b: P, c: P, t: number): P => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]; };
const rot = ([x, y]: P, deg: number, [cx, cy]: P = [0, 0]): P => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
const cercle = (cx: number, cy: number, r: number) => `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${r1(cx - rx)} ${r1(cy)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0`;
/**
 * Un tracé avec son rôle. Rôles (classes u-*, traduits pour dessins.css par DESSIN) : t trait principal, f trait fin, a trait
 * d'accent, p aplat d'accent, q aplat doux, o point plein (trait), x point plein d'accent, d pointillé. Lecture : w tracé qui se
 * dessine (pathLength 1), e fondu, s apparition avec rebond ; `i` ordre de lecture.
 */
const T = (role: string, d: string, i = 0, lecture = '', attrs = '') =>
  `<path class="u-${role}${lecture ? ` u-${lecture}` : ''}" d="${d}"${i ? ` style="--i:${i}"` : ''}${lecture === 'w' ? ' pathLength="1"' : ''}${attrs}/>`;
/** Points le long d'une quadratique (trajectoire pointillée faite de points ronds qui s'allument un à un) */
const trajectoire = (a: P, b: P, c: P, n: number, i0: number, r = 2.6, role = 'x', deb = 1, fin = n - 1) =>
  Array.from({ length: fin - deb + 1 }, (_, k) => { const [x, y] = quad(a, b, c, (k + deb) / n); return T(role, cercle(x, y, r), i0 + k, 'e'); }).join('');

/** Silhouette validée du pied adulte (× 4, 368 × 888) posée : échelle `e`, coin (x, y), miroir */
const plante = (e: number, x: number, y: number, miroir = false) => poserChemin(G.adulte, miroir ? -e : e, e, miroir ? x + 368 * e : x, y);
const poser = (d: string, e: number, x: number, y: number, miroir = false) => poserChemin(d, miroir ? -e : e, e, miroir ? x + 368 * e : x, y);

// ———————————————————————————————————————————————————— Basket

/** Ballon (coutures de sports.ts : ballonBasket, méridien, deux arcs latéraux, équateur) */
function ballon(cx: number, cy: number, r: number, i: number): string {
  const q = (a: P, b: P, c: P) => `M${r1(cx + a[0] * r)} ${r1(cy + a[1] * r)}Q${r1(cx + b[0] * r)} ${r1(cy + b[1] * r)} ${r1(cx + c[0] * r)} ${r1(cy + c[1] * r)}`;
  const coutures = q([0, 1], [0.14, 0], [0, -1]) + q([-0.62, -0.78], [-0.08, 0], [-0.62, 0.78]) + q([-1, 0], [0, 0.2], [1, 0]) + q([0.62, 0.78], [0.08, 0], [0.62, -0.78]);
  return `<g class="u-s" style="--i:${i}">${T('p', cercle(cx, cy, r))}${T('t', cercle(cx, cy, r))}${T('f', coutures)}</g>`;
}

function corpsBasketArc(): string {
  const net = 'M220 81L227 108M230 84L233 110M246 84L243 110M256 81L249 108M227 108H249M222 92Q238 99 254 92';
  return T('q', cercle(224, 88, 66), 0, 'e') + T('q', ellipse(70, 214, 44, 6), 0, 'e') + T('f', 'M24 214H276') + ballon(70, 176, 35, 1) +
    trajectoire([98, 146], [166, -26], [236, 74], 18, 2, 2.8) +
    T('t', 'M262 30V98', 2, 'e') + T('t', 'M257 80H262', 2, 'e') + T('a', ellipse(238, 80, 19, 4.6), 19, 'w') + T('f', net, 20, 'e');
}

/** Terrain vu de dessus : ligne de fond, panneau, cercle, raquette, cercle des lancers francs, ligne à 3 points et ses échos */
function corpsBasketTerrain(): string {
  const [cx, cy] = [150, 196];
  const arc3 = (r: number) => { const a = Math.acos(Math.min(1, 132 / r)); const x0 = cx - r * Math.cos(Math.PI - a), y0 = cy - r * Math.sin(a);
    // Arc au-dessus du panier (de gauche à droite), puis les bouts droits jusqu'à la ligne de fond
    return r <= 132 ? `M${r1(cx - r)} 224V${cy}A${r} ${r} 0 0 1 ${r1(cx + r)} ${cy}V224` : `M${r1(2 * cx - x0)} ${r1(y0)}A${r} ${r} 0 0 1 ${r1(x0)} ${r1(y0)}`; };
  const echos = [1, 2, 3, 4].map((k) => T('n', arc3(118 + k * 15), 0, 'w', ` style="--i:${4 + k};--k:${k}"`)).join('');
  return T('q', `M${cx - 118} 224V${cy}A118 118 0 0 1 ${cx + 118} ${cy}V224Z`) + T('p', 'M120 224V128H180V224Z', 1, 'e') +
    T('t', 'M14 224H286', 0, 'w') + T('t', 'M120 224V128H180V224', 1, 'w') + T('t', 'M118 128A32 32 0 0 1 182 128', 2, 'w') + T('d', 'M118 128A32 32 0 0 0 182 128', 3, 'e') +
    T('a', arc3(118), 3, 'w') + echos + T('t', 'M136 210H164', 2, 'e') + T('a', cercle(150, 198, 6), 3, 's') + ballon(226, 92, 14, 9);
}

// ———————————————————————————————————————————————————— Tennis

/** Balle (couture en S de sports.ts : balleTennis) */
function balle(cx: number, cy: number, r: number, i: number): string {
  const arcS = (ox: number, a1: number, a2: number) => Array.from({ length: 9 }, (_, k) => { const a = ((a1 + ((a2 - a1) * k) / 8) * Math.PI) / 180; return rot([ox + r * 0.62 * Math.cos(a), r * 0.62 * Math.sin(a)], -25); });
  const s = [...arcS(-r * 1.05, -62, 62), ...arcS(r * 1.05, 242, 118)].map(([x, y]) => [x + cx, y + cy] as P);
  return `<g class="u-s" style="--i:${i}">${T('p', cercle(cx, cy, r))}${T('t', cercle(cx, cy, r))}${T('f', cheminLisse(s, false, 0.3))}</g>`;
}

function corpsTennisRebond(): string {
  return T('q', 'M52 172H248L292 232H8Z') + T('f', 'M52 172H248M150 172V232M30 202H270') + T('p', ellipse(166, 202, 30, 6), 1, 'e') +
    trajectoire([30, 30], [104, 34], [166, 198], 12, 1, 2.8, 'x', 1, 11) + T('a', ellipse(166, 202, 16, 3.6), 12, 's') +
    trajectoire([166, 198], [214, 92], [250, 100], 8, 13, 2.8, 'x', 1, 6) + balle(264, 102, 19, 20);
}

/** Court en perspective douce : demi-largeur 64 au fond, 140 devant ; profondeur adoucie */
function corpsTennisCourt(): string {
  const y = (d: number) => 30 + 196 * d ** 1.12, X = (u: number, d: number) => 150 + u * (64 + 76 * ((y(d) - 30) / 196));
  const L = (u0: number, d0: number, u1: number, d1: number) => `M${r1(X(u0, d0))} ${r1(y(d0))}L${r1(X(u1, d1))} ${r1(y(d1))}`;
  const sf = 0.2307, sn = 0.7693, ny = y(0.5);
  const lignes = L(-1, 0, 1, 0) + L(-1, 1, 1, 1) + L(-1, 0, -1, 1) + L(1, 0, 1, 1) + L(-0.75, 0, -0.75, 1) + L(0.75, 0, 0.75, 1) + L(-0.75, sf, 0.75, sf) + L(-0.75, sn, 0.75, sn) + L(0, sf, 0, sn);
  const filet = Array.from({ length: 23 }, (_, k) => { const x = X(-1.1 + k * 0.1, 0.5); return `M${r1(x)} ${r1(ny - 13)}V${r1(ny)}`; }).join('');
  const carre = `M${r1(X(0, sf))} ${r1(y(sf))}L${r1(X(0.75, sf))} ${r1(y(sf))}L${r1(X(0.75, 0.5))} ${r1(ny)}L${r1(X(0, 0.5))} ${r1(ny)}Z`;
  const [bx, by] = [X(0.4, 0.33), y(0.33)];
  const surface = `M${r1(X(-1.08, 0))} ${r1(y(0) - 4)}L${r1(X(1.08, 0))} ${r1(y(0) - 4)}L${r1(X(1.08, 1))} ${r1(y(1) + 6)}L${r1(X(-1.08, 1))} ${r1(y(1) + 6)}Z`;
  return T('q', surface) + T('p', carre, 3, 'e') + T('t', lignes, 0, 'w') + `<g class="u-e" style="--i:2">${T('f', filet)}${T('t', `M${r1(X(-1.1, 0.5))} ${r1(ny - 13)}H${r1(X(1.1, 0.5))}`)}</g>` +
    trajectoire([X(-0.5, 0.95), y(0.95) - 6], [X(0, 0.5), ny - 120], [bx, by - 3], 10, 4, 3, 'x', 1, 9) + T('a', ellipse(bx, by, 10, 2.8), 13, 's') + balle(X(-0.62, 0.98), y(0.98) - 16, 14, 4);
}

// ———————————————————————————————————————————————————— Golf

/** Contour organique du green (formes franches, aucune anatomie) */
const GREEN = 'M0-60C34-60 70-44 78-14S60 44 18 54-50 56-74 26-78-36-42-54-20-60 0-60Z';
const blob = (cx: number, cy: number, e: number) => GREEN.replace(/-?\d+(\.\d+)?/g, (v, _d, o: number, s: string) => {
  // Coordonnées alternées x / y (commandes absolues M C S Z seulement)
  const avant = s.slice(0, o).match(/-?\d+(\.\d+)?/g)?.length ?? 0;
  return ` ${r1(Number(v) * e + (avant % 2 ? cy : cx))}`;
});

function corpsGolfGreen(): string {
  const [hx, hy] = [196, 136];
  const niveaux = [1, 0.8, 0.6, 0.42, 0.26].map((e, k) => {
    const cx = 156 + (hx - 156) * (1 - e), cy = 154 + (hy - 154) * (1 - e);
    return T(k ? 'n' : 'q', blob(cx, cy, e * 1.45), 0, k ? 'w' : 'e', k ? ` style="--i:${k};--k:${k}"` : '');
  }).join('');
  return niveaux + T('t', blob(156, 154, 1.45), 0, 'w') + T('o', ellipse(hx, hy, 5.5, 2.6), 5, 's') +
    T('t', `M${hx} ${hy}V44`, 6, 'w') + T('x', `M${hx} 44L${hx + 34} 54L${hx} 64Z`, 8, 's') +
    trajectoire([6, 156], [70, -46], [hx - 14, hy - 2], 14, 9, 2.6, 'x', 1, 13) + T('o', cercle(hx - 14, hy - 2, 4.4), 25, 's');
}

function corpsGolfAlveoles(id: string): string {
  const [cx, cy, r] = [150, 104, 66];
  // Trame serrée d'alvéoles (motif hexagonal) : jamais quelques arcs isolés qui se liraient comme un visage (sports.ts : balleGolf)
  const motif = `<defs><pattern id="${id}-a" width="11" height="19" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><circle class="u-o" cx="2.75" cy="4.75" r="2.4"/><circle class="u-o" cx="8.25" cy="14.25" r="2.4"/></pattern><clipPath id="${id}-c"><path d="${cercle(cx, cy, r - 3)}"/></clipPath></defs>`;
  const tee = pts([[cx - 30, cy + r - 4], [cx - 4, cy + r + 18], [cx - 3.4, 222], [cx, 230], [cx + 3.4, 222], [cx + 4, cy + r + 18], [cx + 30, cy + r - 4]]);
  return motif + T('q', ellipse(cx, 224, 70, 7), 0, 'e') + T('f', 'M30 224H270') + `<g class="u-y" style="--i:1">${T('p', tee)}${T('t', tee)}</g>` +
    `<g class="u-y" style="--i:2">${T('q', cercle(cx, cy, r))}<g class="u-e" style="--i:6" clip-path="url(#${id}-c)"><path class="u-m" d="${cercle(cx, cy, r)}" fill="url(#${id}-a)"/></g>${T('p', `M${cx + r * 0.2} ${cy + r * 0.98}A${r} ${r} 0 0 0 ${cx + r * 0.98} ${cy + r * 0.2}A${r * 0.9} ${r * 0.9} 0 0 1 ${cx + r * 0.2} ${cy + r * 0.98}Z`)}${T('t', cercle(cx, cy, r))}</g>`;
}

// ———————————————————————————————————————————————————— Cyclisme

/** Roue de vélo : pneu, jante, 28 rayons croisés en traits fins, moyeu ; elle fait un tour puis s'arrête */
function corpsCyclismeRoue(): string {
  const [cx, cy] = [158, 116];
  const rayons = Array.from({ length: 28 }, (_, k) => { const a = (k * 360) / 28, b = a + (k % 2 ? 16 : -16); const p = rot([0, -9], a), q = rot([0, -84], b); return `M${r1(cx + p[0])} ${r1(cy + p[1])}L${r1(cx + q[0])} ${r1(cy + q[1])}`; }).join('');
  return T('q', cercle(cx - 22, cy + 6, 100), 0, 'e') + T('f', 'M10 210H290') + T('a', 'M16 92H48M8 116H50M20 140H46', 3, 'e') +
    `<g class="u-r">${T('t', cercle(cx, cy, 92), 0, '', ' stroke-width="7"')}${T('f', cercle(cx, cy, 84))}${T('f', rayons, 1, 'e')}${T('x', cercle(cx, cy, 10))}</g>`;
}

/** Profil d'étape : relief en aplat, lignes de niveau horizontales dans le relief, route qui se dessine, sommet (aucune valeur) */
function corpsCyclismeProfil(id: string): string {
  const prof: P[] = [[10, 196], [40, 182], [70, 186], [104, 140], [130, 150], [168, 84], [196, 104], [224, 64], [252, 110], [290, 168]];
  const d = cheminLisse(prof, false, 0.2), zone = `${d}L290 214L10 214Z`;
  const niv = Array.from({ length: 8 }, (_, k) => T('n', `M10 ${200 - k * 18}H290`, 0, 'e', ` style="--i:${k};--k:${Math.min(4, k >> 1)}"`)).join('');
  return `<defs><clipPath id="${id}-p"><path d="${zone}"/></clipPath></defs>` + T('q', zone) + `<g clip-path="url(#${id}-p)">${niv}</g>` + T('f', 'M10 214H290') + T('a', d, 3, 'w') + T('x', cercle(224, 64, 5.5), 12, 's');
}

// ———————————————————————————————————————————————————— Diabète (bleus froids, lecture lente, aucun rebond)

/** Plante du pied droit (silhouette validée × 4), isothermes (égale distance au bord) et sites SITES_MONOFILAMENT (même repère) */
function corpsDiabeteSensibilite(id: string): string {
  const [e, x, y] = [0.235, 106.8, 16];
  // Isothermes dans leur repère (× 4) sous une transformation (trait non mis à l'échelle) : balisage < 5 Ko
  const iso = `<g transform="translate(${x} ${y})scale(${e})">${G.isothermes.map((n) => T('n', n.d, 0, 'e', ` style="--i:${n.k + 1};--k:${n.k}" vector-effect="non-scaling-stroke"`)).join('')}</g>`;
  const sites = SITES_MONOFILAMENT.map(([u, v], k) => { const [sx, sy] = [x + u * 4 * e, y + v * 4 * e];
    return `<g class="u-e" style="--i:${6 + k * 2}">${T('p', cercle(sx, sy, 15), 0, '', ' opacity=".55"')}${T('x', cercle(sx, sy, 5.2))}</g>`; }).join('');
  // Silhouette définie une fois (aplat et contour qui se dessine : <use>)
  return `<defs><path id="${id}-p" d="${plante(e, x, y)}" pathLength="1"/></defs><use href="#${id}-p" class="u-q"/>` + iso + `<use href="#${id}-p" class="u-t u-w"/>` + sites;
}

/** Inspection quotidienne : miroir posé au sol, penché, la plante validée s'y reflète ; reflets en traits fins */
function corpsDiabeteMiroir(): string {
  const R = 'rotate(-14 150 108)';
  return T('q', ellipse(156, 222, 72, 7), 0, 'e') + T('f', 'M30 222H270') + T('f', 'M176 196L196 222', 1, 'e') +
    `<g transform="${R}">${T('q', ellipse(150, 108, 64, 92))}${T('t', ellipse(150, 108, 64, 92), 0, '', ' stroke-width="4"')}${T('f', ellipse(150, 108, 56, 84))}` +
    `${T('p', plante(0.17, 119, 33, true), 2, 'e')}${T('a', plante(0.17, 119, 33, true), 2, 'w')}${T('f', 'M108 60L120 46M110 76L132 52', 5, 'e')}</g>`;
}

// ———————————————————————————————————————————————————— Rendu

const CORPS: Record<UniversMinimal, (id: string) => string> = {
  'un-basket-arc': corpsBasketArc, 'un-basket-terrain': corpsBasketTerrain,
  'un-tennis-rebond': corpsTennisRebond, 'un-tennis-court': corpsTennisCourt,
  'un-golf-green': corpsGolfGreen, 'un-golf-alveoles': corpsGolfAlveoles,
  'un-cyclisme-roue': corpsCyclismeRoue, 'un-cyclisme-profil': corpsCyclismeProfil,
  'un-diabete-sensibilite': corpsDiabeteSensibilite, 'un-diabete-miroir': corpsDiabeteMiroir,
};
const memo = new Map<string, string>();
/** Contenu du <svg> (scène 300 × 240), identifiants préfixés par `id` */
export function corpsUniversMinimal(a: UniversMinimal, id: string = a): string {
  const k = `${a}|${id}`;
  let v = memo.get(k);
  if (!v) { v = CORPS[a](id); memo.set(k, v); }
  return v;
}
const svgScene = (c: string) => `<svg viewBox="0 0 300 240" fill="none" stroke-linecap="round" stroke-linejoin="round">${c}</svg>`;

/** Balisage du visuel animé (contenu d'une boîte .ea) : `scene` (premier écran, carte) ou `embleme` */
export function htmlUniversMinimal(a: UniversMinimal, o: { placement?: 'scene' | 'embleme' } = {}): string {
  return `<span class="ea ea--un ea--${o.placement ?? 'scene'} ea--${a}" aria-hidden="true">${svgScene(corpsUniversMinimal(a))}</span>`;
}

const J = '.ea-joue';
/** Bleus froids de la charte (diabète : jamais la couleur vive de la gamme) */
const FROID = `color-mix(in oklab,${PRESSION[0]} 62%,var(--ea-t))`, FROID_DOUX = `color-mix(in oklab,${PRESSION[0]} 26%,var(--ea-f))`, VERT_DOUX = `color-mix(in oklab,${PRESSION[1]} 20%,var(--ea-f))`;

/**
 * Feuille commune : panneau (sombre par défaut, clair « encre »), rôles des tracés, lecture une fois sous .ea-joue, réduction des
 * animations. Accent : couleur vive de la gamme mêlée au trait du panneau (≥ 3:1, testé sur les 17 gammes).
 */
const COMMUN = `.ea--un{--ea-f:var(--hp-sombre);--ea-t:var(--hp-sombre-texte);--u-a:color-mix(in oklab,var(--hp-vif) 56%,var(--ea-t));--u-p:color-mix(in oklab,var(--hp-vif) 36%,var(--ea-f));--u-q:color-mix(in oklab,var(--hp-aplat) 26%,var(--ea-f));--u-pas:110ms;position:relative;display:block;flex:none;pointer-events:none;background:var(--ea-f);border-radius:var(--hp-r,20px);overflow:hidden}
.ea--un.ea--clair{--ea-f:var(--hp-doux);--ea-t:var(--hp-encre)}.ea--un svg{position:absolute;inset:5%;width:90%;height:90%;overflow:visible;stroke:var(--ea-t);stroke-width:2.4}
.ea--un [class*=u-]{transform-box:fill-box;transform-origin:50% 50%}.u-f{stroke-width:1.3;opacity:.6}.u-a{stroke:var(--u-a);stroke-width:3}.u-n{stroke:var(--u-a);stroke-width:1.6;opacity:calc(.9 - var(--k,0) * .15)}
.u-p{fill:var(--u-p);stroke:none}.u-q{fill:var(--u-q);stroke:none}.u-o{fill:var(--ea-t);stroke:none}.u-x{fill:var(--u-a);stroke:none}.u-d{stroke-width:2.6;stroke-dasharray:0 8;opacity:.75}.u-m{fill-opacity:.5;stroke:none}
.ea--embleme.ea--un{width:84px;height:68px;margin:0 0 -4px;background:none}.ea--embleme svg{inset:0;width:100%;height:100%}
${J} .ea--un .u-w{stroke-dasharray:1;animation:ea-un-w 1.2s cubic-bezier(.5,0,.3,1) both}${J} .ea--un .u-e{animation:ea-un-e .8s ease-out both}${J} .ea--un .u-s{animation:ea-un-s .7s cubic-bezier(.3,1.5,.5,1) both}${J} .ea--un .u-y{animation:ea-un-y .9s cubic-bezier(.3,1.25,.5,1) both}
${J} .ea--un :is(.u-w,.u-e,.u-s,.u-y){animation-delay:calc(.2s + var(--i,0) * var(--u-pas))}
@keyframes ea-un-w{from{stroke-dashoffset:1}}@keyframes ea-un-e{from{opacity:0}}@keyframes ea-un-s{from{opacity:0;transform:scale(.4)}}@keyframes ea-un-y{from{opacity:0;transform:translateY(-30%)}}
@media (prefers-reduced-motion:reduce){.ea *{animation:none!important}}`;

/** Feuille propre (pas de lecture, rotations, teintes froides du diabète) */
const CSS: Record<UniversMinimal, string> = {
  'un-basket-arc': '.ea--un-basket-arc{--u-pas:90ms}',
  'un-basket-terrain': '.ea--un-basket-terrain{--u-pas:200ms}',
  'un-tennis-rebond': '.ea--un-tennis-rebond{--u-pas:85ms}',
  'un-tennis-court': '.ea--un-tennis-court{--u-pas:150ms}',
  'un-golf-green': '.ea--un-golf-green{--u-pas:120ms}',
  'un-golf-alveoles': '.ea--un-golf-alveoles{--u-pas:180ms}',
  // La roue fait un tour puis s'arrête (rotation autour du moyeu)
  'un-cyclisme-roue': `.ea--un-cyclisme-roue{--u-pas:120ms}.ea--un-cyclisme-roue .u-r{transform-box:view-box;transform-origin:158px 116px}${J} .ea--un-cyclisme-roue .u-r{animation:ea-un-r 2.4s cubic-bezier(.2,.6,.3,1) both .2s}@keyframes ea-un-r{from{transform:rotate(-360deg)}}`,
  'un-cyclisme-profil': '.ea--un-cyclisme-profil{--u-pas:140ms}',
  'un-diabete-sensibilite': `.ea--un-diabete-sensibilite{--u-a:${FROID};--u-p:${FROID_DOUX};--u-q:${VERT_DOUX};--u-pas:260ms}.ea--un-diabete-sensibilite .u-n{stroke-width:1.2;opacity:calc(.35 + var(--k) * .12)}`,
  'un-diabete-miroir': `.ea--un-diabete-miroir{--u-a:${FROID};--u-p:${FROID_DOUX};--u-q:${VERT_DOUX};--u-pas:300ms}.ea--un-diabete-miroir .u-p{opacity:.7}.ea--un-diabete-miroir .u-a{stroke-width:2}`,
};

/** Feuille du visuel (commune + propre) */
export const cssUniversMinimal = (a: UniversMinimal) => (COMMUN + CSS[a]).replace(/\n\s*/g, '');

// ———————————————————————————————————————————————————— Illustration fixe (dessins.css, registre pédagogique)

/** Rôles → classes de dessins.css (image fixe : aucune lecture) */
const DESSIN: Record<string, string> = {
  t: 'trait trait--moyen', f: 'fin', a: 'filament', p: 'zone zone--forte', q: 'zone', o: 'pas-trace pas-trace--pedago', x: 'sommet', d: 'pointille', n: 'niveau-montagne', m: 'fin--leger',
};

/** Illustration fixe (<svg> décoratif, repère 300 × 240) : mêmes tracés, classes de dessins.css ; diabète : bleus de la palette */
export function svgUniversMinimal(a: UniversMinimal, o: { id?: string; classe?: string } = {}): string {
  const id = o.id ?? `rv-${a}`;
  const diabete = FICHES_UNIVERS_MINIMAUX[a].univers === 'diabete';
  const corps = corpsUniversMinimal(a, id)
    // Groupes de lecture seule (u-e, u-s, u-y, u-r) : classe retirée ; tracés : classe de leur rôle
    .replace(/ class="u-([a-z])(?: u-[a-z])?"/g, (_m, r: string) => {
      const c = DESSIN[r];
      if (!c) return '';
      return ` class="${c}"`;
    })
    .replace(/ style="--i:\d+"/g, '').replace(/--i:\d+;/g, '').replace(/ pathLength="1"/g, '');
  const classes = ['dessin', `dessin--${a}`, 'dessin--pedagogique', o.classe].filter(Boolean).join(' ');
  // Diabète : l'accent du dessin devient le bleu de la palette (--pression-1 = --d-bas), jamais la couleur de la gamme
  return `<svg class="${classes}" viewBox="0 0 300 240" aria-hidden="true"${diabete ? ' style="--dessin-accent:var(--pression-1)"' : ''} fill="none" stroke-linecap="round" stroke-linejoin="round">${corps}</svg>`;
}
