// Registres EXPÉRIMENTAUX d'illustration (demande de Paul du 2026-10-07 : « une nouvelle planche dans un style RADICALEMENT
// différent… des ingrédients suffisamment différents pour avoir une impression radicalement différente d'un thème à l'autre en
// utilisant les mêmes ingrédients »). Statut : BROUILLON, à noter dans /admin/retours (tuile Illustrations, hashtag #style-<id>).
// NON branchés sur le générateur, les sites ni le sélecteur de style du Studio : Paul choisit d'abord la ou les directions.
//
// Principe : « mêmes ingrédients, autre cuisine ». Chaque sujet est une COMPOSITION de pièces tirées des géométries VALIDÉES
// (jamais redessinées à l'œil) :
//   - pied de profil      piedDeProfil() (POD-AT-0003, pied.ts)
//   - ongle de l'hallux   gros plan de l'hallux (bibliotheque/hallux-gros-plan.ts, ongle sain coupé droit)
//   - semelle             SEMELLE + SEMELLE_ELEMENTS (POD-AT-0004 : talonnette, soutien de voûte, barre rétrocapitale)
//   - coureur             poseCoureur() (foulee.ts, Novacheck 1998), mêmes tubes de jambe que le héros « sport »
//   - enfant              CONTOUR_PIED dorsal (POD-AT-0001) face à PLANTE_ENFANT + ORTEILS_ENFANT (composition aimée du héros)
// Chaque pièce porte un RÔLE (peau, peau-2, objet, détail d'objet, tissu, ongle, reflet) ; un STYLE ne fait que traduire ces rôles en
// matières : papier découpé, risographie, volume doux, géométrique graphique. Changer de style = changer de cuisine, pas de recette.
//
// Règles communes : aucun texte, aucun visage ; couleurs uniquement par variables CSS (gamme du cabinet : --vif, --duo, --aplat,
// --encre-gamme… ; teintes anatomiques de la charte : --peau, --peau-clair, --peau-ombre, --ongle), avec replis sur l'accent pour
// les gammes sobres ; pas de <style> (styles en ligne, compatible WebKit) ; ids préfixés (plusieurs SVG en ligne sur une page) ;
// filtres légers (un flou, un grain) ; formats vignette 4:3 (400 × 300) et portrait 3:4 (360 × 480) ; ≤ 25 ko compressé.
import { piedDeProfil, CONTOUR_PIED, PLANTE_ENFANT, ORTEILS_ENFANT, SEMELLE, SEMELLE_ELEMENTS, deformerChemin, lisser, type P } from './pied';
import { silhouette as silhouetteEnfant } from './dessins';
import { poseCoureur } from './foulee';
import { silhouette as silhouetteHallux, courbe as courbeHallux, LATERAL_NORMAL, MEDIAL, VOISINS, LAME, LUNULE, LAME_2, LAME_3, CUTICULE, REPLI_PROXIMAL, SILLON_MEDIAL, SILLON_LATERAL, PLIS_IP, HALLUX_GROS_PLAN } from './bibliotheque/hallux-gros-plan';

// ———————————————————————————————————————————————————— Catalogue

export const STYLES_EXPERIMENTAUX = ['decoupe', 'riso', 'volume', 'geometrique'] as const;
export type StyleExperimental = (typeof STYLES_EXPERIMENTAUX)[number];

export const SUJETS_STYLES = ['pied-profil', 'ongle-hallux', 'semelle-paire', 'coureur', 'enfant-adulte'] as const;
export type SujetStyle = (typeof SUJETS_STYLES)[number];

export type FormatStyle = 'vignette' | 'portrait';

export interface FicheStyle {
  id: StyleExperimental;
  nom: string;
  /** Ressenti recherché et cabinets visés */
  intention: string;
  /** Règles de construction (doc, revue) */
  regles: readonly string[];
}

export const FICHES_STYLES: Record<StyleExperimental, FicheStyle> = {
  decoupe: {
    id: 'decoupe', nom: 'Papier découpé',
    intention: 'Chaleureux, artisanal, rassurant : cabinet de quartier, enfants et familles, podologie du sport amateur.',
    regles: [
      'Pièces de papier à plat aux bords francs, sans aucun contour dessiné : une forme = une pièce (pied, chaque orteil, ongle, objet).',
      'Ombre portée courte et douce sous chaque pièce (lumière en haut à gauche) ; en vue de dessus sans sol, un simple liseré.',
      'Fond : une grande forme organique (aplat de la gamme), une petite pièce loin du sujet et, s’il y a un sol, une bande de papier au bord ondulé.',
      'Peau en tons de la charte (peau claire, peau), objets en couleur vive, détails d’objet dans le duo.',
      'Plis réduits à de courtes incisions (pli d’orteil, cheville) ; grain de papier léger sur le fond seulement (jamais sur la peau).',
    ],
  },
  riso: {
    id: 'riso', nom: 'Risographie',
    intention: 'Graphique, éditorial, un peu atelier d’imprimeur : cabinets jeunes, sport, posturologie ; vitaminé avant tout.',
    regles: [
      'Deux encres de la gamme : couleur vive (fond, sol, objets) et duo foncé (contours, short), la seconde passe en produit.',
      'Peau en trame de demi-teintes de TEINTE PEAU (points ronds à 15°), jamais dans une couleur de gamme ; même trame pour l’adulte et l’enfant, second plan un peu plus serré.',
      'Contours et détails sur la seconde passe, volontairement décalés de 1,5 % (mauvais repérage assumé).',
      'Papier qui transparaît : reflets et pièces de semelle laissés en réserve (une seule densité par pièce), ongle en teinte d’ongle, mouchetures de papier sur toute l’image.',
      'Gamme sobre : les deux encres prennent la même teinte (monochrome en deux valeurs).',
    ],
  },
  volume: {
    id: 'volume', nom: 'Volume doux',
    intention: 'Tactile, apaisant, contemporain (esprit pâte à modeler) : cabinets « bien-être », seniors, soins des ongles.',
    regles: [
      'Chaque pièce modelée par un dégradé radial (lumière en haut à gauche : clair → teinte → ombre), sans contour dur.',
      'Un liseré très léger dans l’ombre de la teinte sépare les pièces qui se chevauchent (orteils).',
      'Ombre de contact floue sous un sujet posé (aucune en vue de dessus) ; lumière de fond dans un coin, jamais un halo centré sur le pied.',
      'Couleurs pastel de la gamme pour les objets ; peau dans les tons de la charte ; aucune brillance « plastique ».',
      'Plis en creux doux (trait d’ombre fin, semi-transparent).',
    ],
  },
  geometrique: {
    id: 'geometrique', nom: 'Géométrique graphique',
    intention: 'Affiche suisse / Bauhaus : moderne, net, affirmé ; cabinets urbains, technique, sport de performance.',
    regles: [
      'Fond construit avec des formes simples seulement : un grand disque (couleur vive) qui s’arrête au-dessus du sol, un rectangle de sol ou un quart de disque (duo).',
      'Sujet en silhouette pleine d’un seul ton : peau foncée et chaude pour le corps (jamais l’encre noire), encre de la gamme pour les objets ; ni dégradé ni ombre.',
      'Détails par un seul ton plus clair (ongle en teinte d’ongle, pièces de semelle en pâle de la gamme, séparations et plis en ton peau) : jamais de cerne blanc.',
      'Trois couleurs au plus plus le fond ; alignements sur une grille simple (centre, tiers).',
      'Le sujet reste entier et d’une seule couleur : aucune couleur partielle sur la peau.',
    ],
  },
};

export const LIBELLES_SUJETS_STYLES: Record<SujetStyle, string> = {
  'pied-profil': 'Pied de profil',
  'ongle-hallux': 'Ongle de l’hallux',
  'semelle-paire': 'Semelles orthopédiques',
  coureur: 'Coureur (foulée)',
  'enfant-adulte': 'Pieds d’enfant face aux pieds d’adulte',
};

/** Sujet de « Donner mon avis » (sujets-visuels.ts) de chaque sujet dessiné */
export const SUJET_VISUEL_STYLES: Record<SujetStyle, string> = {
  'pied-profil': 'general', 'ongle-hallux': 'ongles', 'semelle-paire': 'semelles', coureur: 'sport', 'enfant-adulte': 'enfant',
};

/** Clé stable d'inventaire : dessin:<sujet>:<style> */
export const cleStyleExperimental = (sujet: SujetStyle, style: StyleExperimental) => `dessin:${sujet}:${style}`;

/** Hashtags par défaut d'un élément (filtre « #style-decoupe »… dans /admin/retours) */
export const hashtagsStyleExperimental = (sujet: SujetStyle, style: StyleExperimental) =>
  [`style-${style}`, 'style-experimental', SUJET_VISUEL_STYLES[sujet]].sort();

// ———————————————————————————————————————————————————— Composition (ingrédients communs)

/** peau : sujet principal ; peau-2 : second plan du même corps (orteils latéraux, jambe éloignée) ; peau-autre : une autre personne
 * (l'adulte face à l'enfant) ; objet / objet-detail : chaussure, semelle et leurs pièces ; tissu : short ; ongle ; reflet : bande
 * blanche du bord libre, lunule */
type Role = 'peau' | 'peau-2' | 'peau-autre' | 'objet' | 'objet-detail' | 'tissu' | 'ongle' | 'reflet';
type Piece = { d: string; role: Role };
/** `sous` : indice de la pièce qui cache ce trait (orteils latéraux derrière l'hallux) : masqué dans les styles qui tracent les contours */
type Ligne = { d: string; role: 'contour' | 'detail'; sous?: number };
interface Composition {
  W: number; H: number;
  /** Pièces dans l'ordre de peinture */
  pieces: Piece[];
  lignes: Ligne[];
  /** Ordonnée du sol (sujets posés) */
  sol?: number;
  /** Centre et rayon du fond (disque, halo, forme organique) */
  foyer: [number, number, number];
  /** Vue de dessus d'un corps sans sol (hallux, pieds de l'adulte et de l'enfant) : pas d'ombre portée (« pied qui flotte ») */
  dessus?: boolean;
  /** Ombres de contact au sol [cx, cy, rx, ry] */
  contacts: [number, number, number, number][];
}

const r1 = (v: number) => +v.toFixed(1);
type Affine = [number, number, number, number, number, number];
const appliquer = (m: Affine, x: number, y: number): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** Rotation `angle` (degrés, sens horaire), échelle `e` (miroir horizontal si `miroir`), le point (ox, oy) envoyé en (tx, ty) */
const pose = (ox: number, oy: number, tx: number, ty: number, e: number, angle = 0, miroir = false): Affine => {
  const t = (angle * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), sx = miroir ? -e : e;
  const a = c * sx, b = s * sx, cc = -s * e, d = c * e;
  return [a, b, cc, d, tx - a * ox - cc * oy, ty - b * ox - d * oy];
};
/** Chemin transformé, coordonnées arrondies au dixième (poids) */
const tr = (d: string, m: Affine) => deformerChemin(d, (x, y) => appliquer(m, x, y).map(r1) as P);
const DIM: Record<FormatStyle, [number, number]> = { vignette: [400, 300], portrait: [360, 480] };

/** 1. Pied de profil (vue médiale du pied gauche, orteils à droite) : la jambe sort du cadre par le haut */
function compoProfil(f: FormatStyle): Composition {
  const [W, H] = DIM[f];
  const p = piedDeProfil('normale');
  // Pied : x de -12,5 (talon) à 124,3 (pulpe de l'hallux), sol en y = 62
  const k = f === 'vignette' ? 2.05 : 2.2;
  const sol = f === 'vignette' ? H * 0.8 : H * 0.76;
  const m = pose(56, 62, W / 2 + (f === 'vignette' ? 4 : 0), sol, k);
  const t = (d: string) => tr(d, m);
  return {
    W, H, sol, foyer: [W / 2 + 10, sol - 70, f === 'vignette' ? 118 : 128],
    contacts: [[W / 2 - 92, sol, 40, 6], [W / 2 + 80, sol, 70, 6]],
    pieces: [
      { d: t(p.peau), role: 'peau' },
      ...p.orteils.map((d) => ({ d: t(d), role: 'peau-2' as Role })),
      { d: t(p.hallux), role: 'peau' },
      { d: t(p.ongle), role: 'ongle' },
    ],
    lignes: [
      { d: p.orteils.map(t).join(' '), role: 'contour', sous: 1 + p.orteils.length },
      { d: `${t(p.contour)} ${t(p.halluxContour)}`, role: 'contour' },
      { d: t(p.malleole), role: 'detail' },
    ],
  };
}

/** 2. Ongle de l'hallux (pied droit vu de dessus, gros plan, ongle sain coupé droit) : l'avant-pied sort du cadre par le bas */
function compoOngle(f: FormatStyle): Composition {
  const [W, H] = DIM[f];
  const E = HALLUX_GROS_PLAN.echelle;
  // Unités de la forme = 4 × unités du dessin ; pointe de l'hallux en y ≈ 12, groupe des 3 orteils de x = 6 à 128
  const k = f === 'vignette' ? (H * 1.12) / (158 * E) : (H * 0.95) / (158 * E);
  const m = pose(64 * E, 12 * E, W / 2 - (f === 'vignette' ? 4 : 2), H * (f === 'vignette' ? 0.07 : 0.1), k);
  const t = (d: string) => tr(d, m);
  const c = (pts: P[], ferme = false) => t(courbeHallux(pts, ferme));
  const bande = c([[22.4, 27.4], [24.6, 24.6], [37.6, 23.9], [50.6, 24.6], [52.8, 27.4], [51.8, 29.6], [37.6, 28.6], [23.4, 29.6]], true);
  const lunule = t(`${courbeHallux(LUNULE)} ${courbeHallux([[48.6, 61], [48.4, 63.4], [37.6, 65.6], [26.8, 63.4], [26.6, 61]]).replace('M', 'L')} Z`);
  return {
    W, H, dessus: true, foyer: [W / 2 - 30, H * 0.42, f === 'vignette' ? 120 : 130], contacts: [],
    pieces: [
      { d: t(silhouetteHallux(LATERAL_NORMAL)), role: 'peau' },
      { d: c(LAME, true), role: 'ongle' },
      { d: bande, role: 'reflet' },
      { d: lunule, role: 'reflet' },
      { d: c(LAME_2, true), role: 'ongle' },
      { d: c(LAME_3, true), role: 'ongle' },
    ],
    lignes: [
      { d: c([...MEDIAL, ...LATERAL_NORMAL, ...VOISINS.slice(0, -2)]), role: 'contour' },
      { d: [c(LAME, true), c(LAME_2, true)].join(' '), role: 'contour' },
      { d: [CUTICULE, REPLI_PROXIMAL, SILLON_MEDIAL, SILLON_LATERAL, ...PLIS_IP].map((q) => c(q)).join(' '), role: 'detail' },
    ],
  };
}

/** 3. La paire de semelles orthopédiques vue de dessus (pied gauche à gauche, pointes légèrement ouvertes) */
function compoSemelles(f: FormatStyle): Composition {
  const [W, H] = DIM[f];
  const k = f === 'vignette' ? 1.14 : 1.5;
  const ecart = f === 'vignette' ? 56 : 66;
  const cy = H / 2 + 2;
  const pieces: Piece[] = [], lignes: Ligne[] = [];
  for (const gauche of [true, false]) {
    const m = pose(46, 111, W / 2 + (gauche ? -ecart : ecart), cy, k, gauche ? -6 : 6, gauche);
    const t = (d: string) => tr(d, m);
    pieces.push({ d: t(SEMELLE), role: 'objet' }, { d: t(SEMELLE_ELEMENTS.talonnette), role: 'objet-detail' }, { d: t(SEMELLE_ELEMENTS.voute), role: 'objet-detail' }, { d: t(SEMELLE_ELEMENTS.barre), role: 'objet-detail' });
    lignes.push({ d: t(SEMELLE), role: 'contour' }, { d: [SEMELLE_ELEMENTS.talonnette, SEMELLE_ELEMENTS.voute, SEMELLE_ELEMENTS.barre].map(t).join(' '), role: 'detail' });
  }
  return { W, H, foyer: [W / 2, cy, f === 'vignette' ? 128 : 150], contacts: [], pieces, lignes };
}

/** Courbe ouverte (Catmull-Rom) */
function courbe(points: P[]): string {
  const n = points.length, pt = (i: number) => points[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pt(i - 1), pt(i), pt(i + 1), pt(i + 2)];
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}
const lisse = (pts: P[]) => lisser(pts.map(([x, y]) => [r1(x), r1(y)] as P));

/**
 * 4. Coureur : les jambes en pleine foulée (fin d'appui droit, jambe gauche lancée), cinématique foulee.ts, mêmes tubes de jambe
 * que le héros « sport » (heros-scenes.ts) ; short, bassin hors cadre par le haut ; chaussures de course.
 */
function compoCoureur(f: FormatStyle): Composition {
  const [W, H] = DIM[f];
  const sol = H - (f === 'vignette' ? 26 : 40);
  const L = f === 'vignette' ? 236 : 300;
  const po = poseCoureur(0.36, L);
  const x0 = W / 2 + 6;
  const X = (q: { x: number; y: number }): P => [x0 + q.x, sol + q.y];
  const mi = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const jambe = (j: (typeof po)['droite']) => {
    const H_ = X(j.hanche), K = X(j.genou), A = X(j.cheville);
    const axe: P[] = [H_, mi(H_, K, 0.5), K, mi(K, A, 0.3), mi(K, A, 0.62), A];
    const avant = [0.07, 0.058, 0.04, 0.036, 0.028, 0.022], arriere = [0.075, 0.06, 0.042, 0.062, 0.04, 0.024];
    const g: P[] = [], d: P[] = [];
    axe.forEach((q, i) => {
      const a = axe[Math.max(0, i - 1)], b = axe[Math.min(axe.length - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
      g.push([q[0] + nx * arriere[i] * L, q[1] + ny * arriere[i] * L]); d.push([q[0] - nx * avant[i] * L, q[1] - ny * avant[i] * L]);
    });
    return { g, d, chaussure: j.chaussure.map(X) };
  };
  const short = (j: ReturnType<typeof jambe>): P[] => {
    const e = 0.012 * L;
    const g = [j.g[0], mi(j.g[0], j.g[1], 0.95)], d = [j.d[0], mi(j.d[0], j.d[1], 0.95)];
    return [...g.map(([x, y]) => [x - e, y] as P), ...d.map(([x, y]) => [x + e, y] as P).reverse()];
  };
  const Hh = X(po.droite.hanche);
  const bassin: P[] = [[Hh[0] - 0.13 * L, -12], [Hh[0] - 0.135 * L, Hh[1] - 0.02 * L], [Hh[0] - 0.09 * L, Hh[1] + 0.09 * L], [Hh[0] + 0.07 * L, Hh[1] + 0.09 * L], [Hh[0] + 0.1 * L, Hh[1] - 0.03 * L], [Hh[0] + 0.09 * L, -12]];
  const pieces: Piece[] = [], lignes: Ligne[] = [];
  const dessiner = (j: ReturnType<typeof jambe>, loin: boolean) => {
    const c = j.chaussure;
    const semelle = courbe([mi(c[2], c[0], 0.25), mi(c[3], c[2], 0.5), mi(c[4], c[0], 0.18), mi(c[5], c[12], 0.22), mi(c[6], c[11], 0.2), mi(c[7], c[10], 0.3), c[8]]);
    // Semelle intermédiaire (bande sous la ligne de semelle) : pièce de détail de la chaussure
    const bas = lisse([mi(c[2], c[0], 0.25), mi(c[3], c[2], 0.5), mi(c[4], c[0], 0.18), mi(c[5], c[12], 0.22), mi(c[6], c[11], 0.2), mi(c[7], c[10], 0.3), c[8], c[7], c[6], c[5], c[4], c[3], c[2]]);
    pieces.push({ d: lisse([...j.g, ...[...j.d].reverse()]), role: loin ? 'peau-2' : 'peau' });
    pieces.push({ d: lisse(c), role: 'objet' }, { d: bas, role: 'objet-detail' });
    const s = short(j);
    pieces.push({ d: lisse(s), role: 'tissu' });
    lignes.push({ d: `${courbe(j.g)} ${courbe(j.d)} ${lisse(c)}`, role: 'contour' }, { d: semelle, role: 'detail' });
  };
  dessiner(jambe(po.gauche), true);
  pieces.push({ d: `${lisse(bassin)}`, role: 'tissu' });
  dessiner(jambe(po.droite), false);
  const xs = po.droite.chaussure.map((q) => X(q)[0]);
  const xa = (Math.min(...xs) + Math.max(...xs)) / 2;
  return { W, H, sol, foyer: [W / 2 + 4, sol - (f === 'vignette' ? 118 : 160), f === 'vignette' ? 112 : 130], contacts: [[xa, sol, (Math.max(...xs) - Math.min(...xs)) * 0.6, 5]], pieces, lignes };
}

// Enfant : géométrie et pose identiques au héros « enfant » (heros-scenes.ts, composition aimée de Paul : « J'adore »)
const PROLONGEMENT = 380;
const ouvrir = (ouverture: number) => {
  const t = (ouverture * Math.PI) / 180;
  return (x: number, y: number): P => {
    const w = y <= 160 ? 1 : y >= 190 ? 0 : 1 - (y - 160) / 30, a = t * w, c = Math.cos(a), s = Math.sin(a);
    return [49 + (x - 49) * c - (y - 165) * s, 165 + (x - 49) * s + (y - 165) * c];
  };
};

/** 5. Les deux petits pieds de l'enfant (vers 1 an) face aux deux pieds d'un adulte, vus de dessus */
function compoEnfant(f: FormatStyle): Composition {
  const [W, H] = DIM[f];
  // Repère du héros (paysage 384 × 216, portrait 240 × 320), agrandi au format
  const R = f === 'vignette' ? { l: 384, h: 216, cx: 192, ea: 0.54, ya: 4, da: 36, ee: 0.3, ye: 172, de: 22 } : { l: 240, h: 320, cx: 120, ea: 0.6, ya: 66, da: 40, ee: 0.33, ye: 246, de: 24 };
  const s = W / R.l, oy = (H - R.h * s) / 2 + (f === 'vignette' ? -12 : 0);
  const CHEVILLE = 165;
  const vers = (m: Affine): Affine => [m[0] * s, m[1] * s, m[2] * s, m[3] * s, m[4] * s, m[5] * s + oy];
  const pieces: Piece[] = [], lignes: Ligne[] = [];
  const adulte = (m: Affine) => {
    const t = (d: string) => tr(deformerChemin(d, ouvrir(8)), vers(m));
    const [x1, x2] = [19.92, 77.16], ev = (x2 - x1) * 0.18;
    const jambe = `M${x1},219 L${x1 - ev},${PROLONGEMENT} L${x2 + ev},${PROLONGEMENT} L${x2},219 Z`;
    const [dos, jambeEz, ...orteils] = CONTOUR_PIED.dorsal.peaux;
    pieces.push({ d: `${t(jambeEz)} ${t(jambe)}`, role: 'peau-autre' }, { d: t(dos), role: 'peau-autre' }, ...orteils.map((d) => ({ d: t(d), role: 'peau-autre' as Role })));
    pieces.push({ d: t(CONTOUR_PIED.dorsal.ongles), role: 'ongle' });
    lignes.push({ d: t(`${CONTOUR_PIED.dorsal.trait} M${x1},218 L${x1 - ev},${PROLONGEMENT} M${x2},218 L${x2 + ev},${PROLONGEMENT}`), role: 'contour' });
  };
  const enfant = (m: Affine) => {
    const t = (d: string) => tr(deformerChemin(d, ouvrir(9)), vers(m));
    const pied = silhouetteEnfant(PLANTE_ENFANT, ORTEILS_ENFANT);
    const ongles = ORTEILS_ENFANT.map(([cx, cy, rx, ry, r]) => {
      const a0 = (r * Math.PI) / 180, d = -ry * 0.42, ex = rx * (cx < 25 ? 0.5 : 0.46), ey = ry * 0.36;
      return lisser(Array.from({ length: 10 }, (_, k) => {
        const a = (k / 10) * 2 * Math.PI, X = ex * Math.cos(a), Y = ey * Math.sin(a);
        return [r1(cx - Math.sin(a0) * d + X * Math.cos(a0) - Y * Math.sin(a0)), r1(cy + Math.cos(a0) * d + X * Math.sin(a0) + Y * Math.cos(a0))] as P;
      }));
    }).join(' ');
    const [x1, x2] = [16, 81], ev = (x2 - x1) * 0.3;
    const jambe = `M${x1},162 C${x1},144 ${x2},144 ${x2},162 L${x2 + ev},${PROLONGEMENT} L${x1 - ev},${PROLONGEMENT} Z`;
    pieces.push({ d: t(pied), role: 'peau' }, { d: t(jambe), role: 'peau' }, { d: t(ongles), role: 'ongle' });
    lignes.push({ d: `${t(pied)} ${t(`M${x1},162 L${x1 - ev},${PROLONGEMENT} M${x2},162 L${x2 + ev},${PROLONGEMENT}`)}`, role: 'contour' });
  };
  adulte(pose(49, CHEVILLE, R.cx - R.da, R.ya, R.ea, 180));
  adulte(pose(49, CHEVILLE, R.cx + R.da, R.ya, R.ea, 180, true));
  enfant(pose(49, CHEVILLE, R.cx - R.de, R.ye, R.ee, 0, true));
  enfant(pose(49, CHEVILLE, R.cx + R.de, R.ye, R.ee, 0));
  return { W, H, dessus: true, foyer: [W / 2, H / 2 + (f === 'vignette' ? -8 : 0), f === 'vignette' ? 124 : 140], contacts: [], pieces, lignes };
}

const COMPOSITIONS: Record<SujetStyle, (f: FormatStyle) => Composition> = {
  'pied-profil': compoProfil, 'ongle-hallux': compoOngle, 'semelle-paire': compoSemelles, coureur: compoCoureur, 'enfant-adulte': compoEnfant,
};

// ———————————————————————————————————————————————————— Couleurs (variables de la gamme et de la charte, replis pour les gammes sobres)

const C = {
  fond: 'var(--fond, var(--blanc))',
  aplat: 'var(--aplat, var(--doux, var(--accent-pale)))',
  vif: 'var(--vif, var(--accent))',
  vifPale: 'var(--vif-pale, var(--accent-pale))',
  vifFonce: 'var(--vif-fonce, var(--accent-fonce))',
  duo: 'var(--duo, var(--accent))',
  duoPale: 'var(--duo-pale, var(--accent-pale))',
  duoFonce: 'var(--duo-fonce, var(--accent-fonce))',
  encre: 'var(--encre-gamme, var(--encre))',
  peau: 'var(--peau)',
  peauClair: 'var(--peau-clair)',
  peauOmbre: 'var(--peau-ombre)',
  ongle: 'var(--ongle)',
  blanc: 'var(--blanc)',
};

/** Forme organique (fond du papier découpé) : cercle déformé par deux harmoniques, déterministe */
function tache(cx: number, cy: number, r: number, graine = 1): string {
  const pts: P[] = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 2 * Math.PI, k = 1 + 0.08 * Math.sin(2 * a + graine) + 0.05 * Math.cos(3 * a + 2 * graine);
    return [r1(cx + r * 1.12 * k * Math.cos(a)), r1(cy + r * 0.92 * k * Math.sin(a))];
  });
  return lisser(pts);
}

/** Grain (bruit fractal teinté) : filtre léger, une fois par image */
const filtreGrain = (id: string, couleur: string, freq: number, a: number, b: number) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="7" stitchTiles="stitch" result="b"/>` +
  `<feColorMatrix in="b" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${a} ${b}" result="m"/><feFlood style="flood-color:${couleur}" result="c"/><feComposite in="c" in2="m" operator="in"/></filter>`;

// ———————————————————————————————————————————————————— Styles

function defsPieces(c: Composition, id: string): string {
  return c.pieces.map((p, i) => `<path id="${id}-p${i}" d="${p.d}"/>`).join('');
}
const use = (id: string, i: number, style: string, extra = '') => `<use href="#${id}-p${i}" style="${style}"${extra}/>`;

/** a. Papier découpé */
function styleDecoupe(c: Composition, id: string): string {
  const u = Math.min(c.W / 400, c.H / 300);
  const couleur: Record<Role, string> = { peau: C.peauClair, 'peau-2': C.peau, 'peau-autre': C.peau, objet: C.vif, 'objet-detail': C.duoPale, tissu: C.duoFonce, ongle: C.ongle, reflet: C.blanc };
  const [fx, fy, fr] = c.foyer;
  // Vue de dessus sans sol : ombre réduite à un liseré (sépare les pièces sans faire « flotter » le pied)
  const dx = r1((c.dessus ? 0.6 : 2.2) * u), dy = r1((c.dessus ? 0.9 : 3) * u);
  let fond = `<path d="${tache(fx, fy, fr, 1.3)}" style="fill:${C.aplat}"/>`;
  // Seconde pièce de fond loin du sujet, jamais rose près de la peau (lue « rougeur »)
  fond += `<path d="${tache(fx - fr * 1.05, fy + fr * 0.5, fr * 0.34, 2.1)}" style="fill:${C.duoPale}"/>`;
  if (c.sol !== undefined) {
    const s = c.sol, n = 8, pts = Array.from({ length: n + 1 }, (_, i) => `${r1((i / n) * c.W)} ${r1(s + 6 * u + 3 * u * Math.sin(i * 1.7))}`);
    fond += `<path d="M-2 ${r1(s + 4 * u)} L${pts.join(' L')} L${c.W + 2} ${r1(s + 6 * u)} L${c.W + 2} ${c.H + 2} L-2 ${c.H + 2} Z" style="fill:${C.duoPale}"/>`;
  }
  const corps = c.pieces.map((p, i) => (p.role === 'reflet' ? use(id, i, `fill:${couleur[p.role]};opacity:0.45`)
    : use(id, i, `fill:${C.encre};opacity:0.2`, ` transform="translate(${dx} ${dy})" filter="url(#${id}-om)"`) + use(id, i, `fill:${couleur[p.role]}`))).join('');
  const incisions = c.lignes.filter((l) => l.role === 'detail').map((l) => `<path d="${l.d}" style="fill:none;stroke:${C.peauOmbre};stroke-width:${r1(1.3 * u)};stroke-linecap:round;opacity:0.8"/>`).join('');
  return `<defs>${defsPieces(c, id)}<filter id="${id}-om" x="-10%" y="-10%" width="125%" height="125%"><feGaussianBlur stdDeviation="${r1(1.1 * u)}"/></filter>${filtreGrain(`${id}-gr`, C.encre, 0.85, 1.6, -0.62)}</defs>` +
    `<rect width="${c.W}" height="${c.H}" style="fill:${C.fond}"/>${fond}` +
    // Grain sur le papier du fond seulement (sur la peau, il se lit « marbrures »)
    `<rect width="${c.W}" height="${c.H}" filter="url(#${id}-gr)" style="opacity:0.2"/>${corps}${incisions}`;
}

/** b. Risographie */
function styleRiso(c: Composition, id: string): string {
  const u = Math.min(c.W / 400, c.H / 300);
  const pas = r1(4.6 * u);
  const trame = (nom: string, couleur: string, r: number, angle: number) =>
    `<pattern id="${id}-${nom}" width="${pas}" height="${pas}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${pas / 2}" cy="${pas / 2}" r="${r1(pas * r * 100) / 100}" style="fill:${couleur}"/></pattern>`;
  const [fx, fy, fr] = c.foyer;
  // Passe 1 (couleur vive) : trame claire de la peau, aplats des objets, disque de fond en trame très claire
  // Revue 2026-10-07 : la peau n'est JAMAIS tramée dans une couleur de gamme (lue « gangrène / rougeur ») : trame de teinte peau,
  // la même pour l'adulte et l'enfant ; les encres de la gamme vont au fond, au sol, aux objets et aux contours
  const p1: Record<Role, string> = { peau: `url(#${id}-t1)`, 'peau-2': `url(#${id}-t2)`, 'peau-autre': `url(#${id}-t1)`, objet: C.vif, 'objet-detail': C.fond, tissu: `url(#${id}-t4)`, ongle: C.ongle, reflet: C.fond };
  // Passe 2 (duo foncé, décalée) : contours seulement
  const p2: Record<Role, string> = { peau: 'none', 'peau-2': 'none', 'peau-autre': 'none', objet: 'none', 'objet-detail': 'none', tissu: 'none', ongle: 'none', reflet: 'none' };
  // Passe 1 : chaque pièce sur une réserve de papier (une trame est ajourée : la pièce de devant cache celle de derrière)
  const passe1 = c.pieces.map((p, i) => (p1[p.role].startsWith('url') ? use(id, i, `fill:${C.fond}`) : '') + use(id, i, `fill:${p1[p.role]}`)).join('');
  const masques = c.lignes.map((l, k) => (l.sous === undefined ? '' : `<mask id="${id}-m${k}"><rect x="-50" y="-50" width="${c.W + 100}" height="${c.H + 100}" style="fill:${C.blanc}"/>${use(id, l.sous, `fill:${C.encre}`)}</mask>`)).join('');
  const passe2 = c.pieces.map((p, i) => (p2[p.role] === 'none' ? '' : use(id, i, `fill:${p2[p.role]}`))).join('');
  const traits = c.lignes.map((l, k) => `<path d="${l.d}"${l.sous === undefined ? '' : ` mask="url(#${id}-m${k})"`} style="fill:none;stroke:${C.duoFonce};stroke-width:${r1((l.role === 'contour' ? 1.7 : 1.1) * u)};stroke-linecap:round;stroke-linejoin:round"/>`).join('');
  const sol = c.sol !== undefined ? `<rect x="0" y="${r1(c.sol + 1)}" width="${c.W}" height="${r1(c.H - c.sol)}" style="fill:url(#${id}-t5)"/>` : '';
  const d = r1(1.6 * u), e = r1(-1.2 * u);
  return `<defs>${defsPieces(c, id)}${trame('t1', C.peauOmbre, 0.4, 15)}${trame('t2', C.peauOmbre, 0.5, 15)}${trame('t4', C.duoFonce, 0.42, 75)}${trame('t5', C.vif, 0.42, 15)}${trame('t3', C.duoFonce, 0.36, 75)}${trame('t0', C.vif, 0.17, 15)}${masques}` +
    `${filtreGrain(`${id}-mo`, C.fond, 1.1, 9, -6.1)}</defs>` +
    `<rect width="${c.W}" height="${c.H}" style="fill:${C.fond}"/>` +
    `<g><circle cx="${r1(fx)}" cy="${r1(fy)}" r="${r1(fr)}" style="fill:url(#${id}-t0)"/>${sol}${passe1}</g>` +
    `<g transform="translate(${d} ${e})" style="mix-blend-mode:multiply">${passe2}${traits}</g>` +
    `<rect width="${c.W}" height="${c.H}" filter="url(#${id}-mo)"/>`;
}

/** c. Volume doux */
function styleVolume(c: Composition, id: string): string {
  const u = Math.min(c.W / 400, c.H / 300);
  const grad = (nom: string, stops: [number, string][]) =>
    `<radialGradient id="${id}-${nom}" cx="0.4" cy="0.34" r="0.78" fx="0.32" fy="0.24">${stops.map(([o, s]) => `<stop offset="${o}" style="stop-color:${s}"/>`).join('')}</radialGradient>`;
  const remplissage: Record<Role, string> = {
    peau: `url(#${id}-gp)`, 'peau-2': `url(#${id}-gp2)`, 'peau-autre': `url(#${id}-gp2)`, objet: `url(#${id}-go)`, 'objet-detail': `url(#${id}-gd)`, tissu: `url(#${id}-gt)`, ongle: `url(#${id}-gn)`, reflet: C.blanc,
  };
  const lisere: Record<Role, string> = { peau: C.peauOmbre, 'peau-2': C.peauOmbre, 'peau-autre': C.peauOmbre, objet: C.vifFonce, 'objet-detail': C.duoFonce, tissu: C.duoFonce, ongle: C.peauOmbre, reflet: 'none' };
  const ombreSous = c.pieces.map((p, i) => (p.role === 'reflet' || p.role === 'ongle' ? '' : use(id, i, `fill:${C.encre}`))).join('');
  const contacts = c.contacts.map(([x, y, rx, ry]) => `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ry * 1.6)}" style="fill:url(#${id}-gc)"/>`).join('');
  const corps = c.pieces.map((p, i) => use(id, i, `fill:${remplissage[p.role]};${p.role === 'reflet' ? 'opacity:0.55' : `stroke:${lisere[p.role]};stroke-width:${r1(0.9 * u)};stroke-opacity:0.45`}`)).join('');
  const plis = c.lignes.filter((l) => l.role === 'detail').map((l) => `<path d="${l.d}" style="fill:none;stroke:${C.peauOmbre};stroke-width:${r1(1.6 * u)};stroke-linecap:round;opacity:0.55"/>`).join('');
  const sol = c.sol !== undefined ? `<rect x="0" y="${r1(c.sol)}" width="${c.W}" height="${r1(c.H - c.sol)}" style="fill:url(#${id}-gs)"/>` : '';
  return `<defs>${defsPieces(c, id)}` +
    grad('gp', [[0, C.peauClair], [0.55, C.peau], [1, C.peauOmbre]]) + grad('gp2', [[0, C.peau], [1, C.peauOmbre]]) +
    grad('go', [[0, C.vifPale], [0.6, C.vif], [1, C.vif]]) + grad('gd', [[0, C.duoPale], [1, C.duo]]) +
    grad('gt', [[0, C.duo], [1, C.duoFonce]]) + grad('gn', [[0, C.blanc], [0.6, C.ongle], [1, C.peauClair]]) +
    `<radialGradient id="${id}-gf"><stop offset="0" style="stop-color:${C.aplat}"/><stop offset="0.7" style="stop-color:${C.aplat};stop-opacity:0.7"/><stop offset="1" style="stop-color:${C.aplat};stop-opacity:0"/></radialGradient>` +
    `<radialGradient id="${id}-gc"><stop offset="0" style="stop-color:${C.encre};stop-opacity:0.28"/><stop offset="1" style="stop-color:${C.encre};stop-opacity:0"/></radialGradient>` +
    `<linearGradient id="${id}-gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${C.aplat}"/><stop offset="1" style="stop-color:${C.aplat};stop-opacity:0.2"/></linearGradient>` +
    `<filter id="${id}-fl" x="-15%" y="-15%" width="130%" height="140%"><feGaussianBlur stdDeviation="${r1(5 * u)}"/></filter></defs>` +
    // Lumière de fond dans un coin (jamais un halo centré sur le pied : « pied mouillé / froid ») ; ombre portée floue seulement si
    // le sujet est posé (vue de dessus sans sol : aucune ombre)
    `<rect width="${c.W}" height="${c.H}" style="fill:${C.fond}"/><circle cx="${r1(c.W * 0.9)}" cy="${r1(c.H * 0.08)}" r="${r1(Math.max(c.W, c.H) * 0.75)}" style="fill:url(#${id}-gf)"/>${sol}${contacts}` +
    `${c.dessus ? '' : `<g filter="url(#${id}-fl)" transform="translate(${r1(2 * u)} ${r1(7 * u)})" style="opacity:0.16">${ombreSous}</g>`}${corps}${plis}`;
}

/** d. Géométrique graphique */
function styleGeometrique(c: Composition, id: string): string {
  const u = Math.min(c.W / 400, c.H / 300);
  const [fx, fy, fr] = c.foyer;
  // Revue 2026-10-07 : la peau en silhouette d'un ton peau foncé et chaud (jamais l'encre noire : « pied nécrosé »), l'encre pour les
  // objets ; ongle en teinte d'ongle ; pièces de semelle en ton pâle de la gamme ; séparations en ton peau (jamais un cerne blanc)
  const remplissage: Record<Role, string> = { peau: C.peauOmbre, 'peau-2': C.peauOmbre, 'peau-autre': C.peauOmbre, objet: C.encre, 'objet-detail': C.duoPale, tissu: C.encre, ongle: C.ongle, reflet: 'none' };
  const separation: Record<Role, string> = { peau: C.peau, 'peau-2': C.peau, 'peau-autre': C.peau, objet: C.encre, 'objet-detail': 'none', tissu: C.encre, ongle: 'none', reflet: 'none' };
  // Fond construit : grand disque (vif) qui s'arrête au-dessus du sol (jamais visible sous la voûte), rectangle de sol ou quart de disque (duo)
  const disque = `<circle cx="${r1(fx + fr * 0.22)}" cy="${r1(fy - fr * 0.08)}" r="${r1(fr * 1.06)}" style="fill:${C.vif}"/>`;
  let fond: string, defs = '';
  if (c.sol !== undefined) {
    defs = `<clipPath id="${id}-cd"><rect width="${c.W}" height="${r1(c.sol - 30 * u)}"/></clipPath>`;
    fond = `<g clip-path="url(#${id}-cd)">${disque}</g><rect x="0" y="${r1(c.sol)}" width="${c.W}" height="${r1(c.H - c.sol)}" style="fill:${C.duo}"/>`;
  } else fond = `${disque}<path d="M0 ${c.H} L0 ${r1(c.H - fr * 0.9)} A${r1(fr * 0.9)} ${r1(fr * 0.9)} 0 0 1 ${r1(fr * 0.9)} ${c.H} Z" style="fill:${C.duo}"/>`;
  const corps = c.pieces.map((p, i) => (p.role === 'reflet' ? '' : use(id, i, `fill:${remplissage[p.role]};${separation[p.role] === 'none' ? '' : `stroke:${separation[p.role]};stroke-width:${r1(0.8 * u)};stroke-linejoin:round`}`))).join('');
  const gravure = c.lignes.filter((l) => l.role === 'detail').map((l) => `<path d="${l.d}" style="fill:none;stroke:${C.peau};stroke-width:${r1(1.1 * u)};stroke-linecap:round"/>`).join('');
  return `<defs>${defsPieces(c, id)}${defs}</defs><rect width="${c.W}" height="${c.H}" style="fill:${C.fond}"/>${fond}${corps}${gravure}`;
}

const RENDUS: Record<StyleExperimental, (c: Composition, id: string) => string> = { decoupe: styleDecoupe, riso: styleRiso, volume: styleVolume, geometrique: styleGeometrique };

/**
 * SVG d'un sujet dans un style expérimental. `id` : préfixe des identifiants internes (unique sur la page) ; `format` : vignette
 * 4:3 (cartes, vignettes, premier écran ordinateur) ou portrait 3:4 (premier écran téléphone). Couleurs : variables CSS du parent.
 */
export function svgStyleExperimental(sujet: SujetStyle, style: StyleExperimental, o: { id?: string; format?: FormatStyle } = {}): string {
  const f = o.format ?? 'vignette';
  const id = (o.id ?? `se-${sujet}-${style}-${f}`).replace(/[^a-zA-Z0-9_-]/g, '-');
  const c = COMPOSITIONS[sujet](f);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.W} ${c.H}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">${RENDUS[style](c, id)}</svg>`;
}
