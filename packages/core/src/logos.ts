// Logos des sites praticiens : une MARQUE (icône) propre à l'univers métier, une DISPOSITION (horizontale,
// empilée, marque seule) et un TRAITEMENT qui découle du modèle et de la gamme (marque pleine sur tuile,
// au trait, ou sur tuile « plan d'architecte »). Le praticien choisit la marque et la disposition
// (ChoixLogo) ; le style suit automatiquement : une même marque rend juste en Proximité, Prestige,
// Atelier, Zen ou Premium.
//
// Les marques sont dessinées par du code dans la grammaire de la charte : géométrie du pied (pied.ts),
// trame de pression (trame.ts), pointillés du podoscope, traits et cotes (charte.ts). Aucune couleur en
// dur : elles viennent de `CouleursMarque` (accent, clair, plan, signal, palette de données), que l'on
// passe soit en valeurs (#rrggbb : favicon, aperçus React de l'éditeur), soit en variables CSS (site).
// Chaque marque a une version compacte, épaissie et simplifiée, lisible en 16 px (favicon).

import { LOGO, NEUTRES, PLAN, POINTILLE, POLICES, TRAME } from './charte';
import { CHAUSSURE, CONTOUR, JAMBE, ORTEILS, OS, PLANTE, PROFIL, RUBANS, dansPolygone, SEMELLE, SEMELLE_POINTS, TRAJET, largeurA, ruban } from './pied';
import { trame } from './trame';
import { ARRETS_PRESSION, PRESSION, universMetier, type MarqueLogo } from './univers';
import { gamme } from './gammes';
import { buildTheme } from './theme';
import { melanger } from './couleurs';
import type { ModeleManifeste, TraitementMarque } from './modeles';

// ———————————————————————————————————————————————————— Choix du praticien

export const DISPOSITIONS_LOGO = [
  { id: 'horizontale', nom: 'Horizontale', sens: 'La marque, le nom, puis le métier et la ville en petites capitales.' },
  { id: 'empilee', nom: 'Empilée', sens: 'La marque au-dessus du nom, centrée.' },
  { id: 'monogramme', nom: 'Marque seule', sens: 'La marque sans texte (le nom reste lu par les lecteurs d’écran).' },
] as const;
export type DispositionLogo = (typeof DISPOSITIONS_LOGO)[number]['id'];

/** Choix du logo, enregistré dans le thème du site (site.theme.logo, facultatif) */
export type ChoixLogo = { marque: string; disposition: DispositionLogo };

export const LOGO_PAR_DEFAUT: ChoixLogo = { marque: 'empreinte', disposition: 'horizontale' };

/** Marques proposées pour un univers (identifiant, libellé, idée métier) : liste de l'éditeur */
export const marquesLogo = (metier = 'podologie'): readonly MarqueLogo[] => universMetier(metier).marques;

/**
 * Choix de logo valide, quelle que soit l'entrée (rétrocompatible) : absent → valeur par défaut ;
 * chaîne seule → identifiant de marque ; marque ou disposition inconnue → valeur par défaut du champ.
 */
export function validerChoixLogo(brut: unknown, metier = 'podologie'): ChoixLogo {
  const u = universMetier(metier);
  const o = (typeof brut === 'string' ? { marque: brut } : brut && typeof brut === 'object' ? brut : {}) as Partial<ChoixLogo>;
  const marque = u.marques.some((m) => m.id === o.marque) ? (o.marque as string) : u.marqueParDefaut;
  const disposition = DISPOSITIONS_LOGO.some((d) => d.id === o.disposition) ? (o.disposition as DispositionLogo) : LOGO_PAR_DEFAUT.disposition;
  return { marque, disposition };
}

const MOTS_VIDES = new Set(['cabinet', 'centre', 'maison', 'pole', 'pôle', 'de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l', 'à', 'en', 'sante', 'santé', 'podologie', 'pedicurie', 'pédicurie', 'podologue', 'podologues', 'pedicure', 'pédicure']);

/** Initiales d'un nom (2 lettres au plus), sans les mots génériques : « Camille Rousseau » → « CR » */
export function initiales(nom: string): string {
  const mots = nom.split(/[\s'’\-–—·,]+/).filter(Boolean);
  const utiles = mots.filter((m) => !MOTS_VIDES.has(m.toLowerCase()));
  return (utiles.length ? utiles : mots).slice(0, 2).map((m) => m[0].toLocaleUpperCase('fr')).join('') || '·';
}

// ———————————————————————————————————————————————————— Traitement selon le modèle

export type TraitementLogo = {
  /** Rendu de la marque */
  marque: TraitementMarque;
  /** Arrondi de la tuile (unités du repère de la marque) */
  rayon: number;
  /** Traits épais (titres gras) ou fins */
  epais: boolean;
  /** Police (pile CSS) et graisse du nom : celles des titres du modèle */
  police: string;
  graisse: number;
  /** Police à empattements (taille du nom compensée) */
  serif: boolean;
  tailleNom: string;
};

/** Traitement du logo d'un modèle : jeton `logo` de la fiche, sinon déduit (encre → trait, sinon plein) */
export function traitementLogo(m: ModeleManifeste): TraitementLogo {
  const j = m.jetons;
  const serif = j.policeTitres === 'fraunces' || j.policeTitres === 'instrument';
  return {
    marque: j.logo ?? (j.accent === 'encre' ? 'trait' : 'plein'),
    rayon: Math.min(LOGO.rayonMax, +(j.rayon * LOGO.rayonTuile).toFixed(1)),
    epais: j.graisseTitres >= 600,
    police: POLICES[j.policeTitres],
    // Le nom reste lisible en petit : jamais plus fin que 400 ni plus gras que 750
    graisse: Math.min(750, Math.max(400, j.graisseTitres)),
    serif,
    tailleNom: serif ? LOGO.nom.tailleSerif : LOGO.nom.taille,
  };
}

// ———————————————————————————————————————————————————— Couleurs

/**
 * Couleurs d'une marque : valeurs #rrggbb ou variables CSS (« var(--accent) »).
 * accent = couleur du cabinet ; clair = trait clair sur tuile ; plan = tuile « plan » ; signal = repères
 * sur plan ; donnees = palette de données de l'univers (5 niveaux).
 */
export type CouleursMarque = { accent: string; clair?: string; plan?: string; signal?: string; donnees?: readonly string[] };

/** Couleurs résolues (#rrggbb) d'un site : gamme, sinon couleur libre ; mêmes règles que variablesTheme */
export function couleursMarque(m: ModeleManifeste, theme: { couleur: string; gamme?: string | null }): Required<CouleursMarque> {
  const g = gamme(theme.gamme);
  const t = buildTheme(g?.accent ?? theme.couleur);
  const encre = m.jetons.accent === 'encre';
  return {
    accent: encre ? NEUTRES.encreNuit : t['--brand-ink'],
    clair: NEUTRES.blanc,
    plan: g?.plan ?? m.jetons.plan ?? melanger(encre ? NEUTRES.encreNuitDouce : t['--brand-deep'], NEUTRES.nuit, 0.36),
    signal: g?.signal ?? m.jetons.signal ?? PLAN.signal,
    donnees: PRESSION,
  };
}

/** Variables CSS d'une marque sur le site (le style de la page, la version claire et l'en-tête les règlent) */
export const COULEURS_MARQUE_CSS: Required<CouleursMarque> = {
  accent: 'var(--logo-accent)',
  clair: 'var(--logo-clair)',
  plan: 'var(--logo-plan)',
  signal: 'var(--logo-signal)',
  donnees: PRESSION.map((_, k) => `var(--donnee-${k + 1})`),
};

// ———————————————————————————————————————————————————— Dessin des marques

export type OptionsMarque = {
  traitement?: TraitementMarque;
  /** Arrondi de la tuile (unités, 0 à 24) */
  rayon?: number;
  /** Taille d'affichage (px) : fixe width/height ; sous LOGO.compact, version compacte */
  taille?: number;
  /** Force la version compacte (favicon) */
  compact?: boolean;
  /** Traits épais */
  epais?: boolean;
  /**
   * Trait principal compact (LOGO.trait.compact) en gardant le niveau de détail de la taille : en-tête et
   * pied de page, où le trait moyen paraît trop fin autour de 42 px.
   */
  traitCompact?: boolean;
  /** Points en couleurs de données (par défaut : seulement sur tuile « plan ») */
  donnees?: boolean;
  /** Monogramme : initiales, police et graisse */
  initiales?: string;
  police?: string;
  graisse?: number;
  /** Titre accessible ; sans titre, la marque est décorative (aria-hidden) */
  titre?: string;
};

type Ctx = {
  /** Niveau de détail : favicon, en-tête, planche */
  compact: boolean;
  moyen: boolean;
  /** Marque sur tuile (plein ou plan) */
  tuile: boolean;
  /** Hauteur d'une marque en forme de pied (unités) */
  hPied: number;
  /** Côté utile (unités) */
  zone: number;
  /** Couleur de la tuile (détails « en creux ») ; « none » au trait */
  fond: string;
  /** Trait principal, secondaire (opacité), repère (signal), donnée de niveau v */
  p: string;
  r: string;
  d: (v: number) => string;
  /** Couleurs de données : true si la marque les affiche ; n = niveau de la palette, toujours en couleur */
  donnees: boolean;
  n: (v: number) => string;
  os: number;
  /** Trait principal du niveau de détail (LOGO.trait) */
  ep: number;
  epais: boolean;
  initiales: string;
  police: string;
  graisse: number;
};

const C = LOGO.cadre / 2;
const n = (x: number) => +x.toFixed(2);
const T = LOGO.trait;

/** Placement du pied (repère 92 × 222, boîte utile x 13–82, y 3–219) : centre, hauteur, symétrie */
function placer(hauteur: number, cx: number, cy: number, miroir = false) {
  const k = hauteur / 216;
  return {
    k,
    t: `translate(${n(cx)} ${n(cy)}) scale(${miroir ? -n(k) : n(k)} ${n(k)}) translate(-47.5 -111)`,
    /** Point du repère du pied → repère de la marque */
    pt: (x: number, y: number): [number, number] => [n(cx + (miroir ? -1 : 1) * (x - 47.5) * k), n(cy + (y - 111) * k)],
  };
}

const orteils = (fill: string) =>
  ORTEILS.map(([cx, cy, rx, ry, a]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${cx} ${cy})" fill="${fill}"/>`).join('');

/** Contour en pointillés ronds (relevé de podoscope), épaisseurs ramenées au repère du pied */
const pointille = (k: number, point: number, couleur: string, opacite = 1, d = CONTOUR) =>
  `<path d="${d}" fill="none" stroke="${couleur}" stroke-opacity="${opacite}" stroke-width="${n(point / k)}" stroke-linecap="round" stroke-dasharray="0 ${n(POINTILLE.contour.ecart / k)}"/>`;

const trait = (k: number, w: number, couleur: string, opacite = 1, d = CONTOUR) =>
  `<path d="${d}" fill="none" stroke="${couleur}" stroke-opacity="${opacite}" stroke-width="${n(w / k)}" stroke-linejoin="round"/>`;

/** Segments à bouts ronds, regroupés en un seul tracé : [x1, y1, x2, y2] */
const segments = (s: readonly (readonly number[])[], k: number, w: number, couleur: string, opacite = 1) =>
  `<path d="${s.map(([a, b, x, y]) => `M${n(a)} ${n(b)}L${n(x)} ${n(y)}`).join('')}" fill="none" stroke="${couleur}" stroke-opacity="${opacite}" stroke-width="${n(w / k)}" stroke-linecap="round"/>`;

const ellipse = ([cx, cy, rx, ry, a]: readonly number[], attributs: string) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${cx} ${cy})" ${attributs}/>`;

/** Pied de profil (PROFIL : profil médial ÉcranZen, orteils à droite) centré dans le cadre, sur la largeur d'une marque en forme de pied */
function profil(c: Ctx) {
  const s = c.hPied / PROFIL.largeur;
  return { s, tr: `translate(${n(C - (PROFIL.x0 + PROFIL.largeur / 2) * s)} ${n(C - (PROFIL.haut + PROFIL.hauteur / 2) * s)}) scale(${n(s)})` };
}

/** Enveloppe convexe de points étiquetés (pied 0 ou 1) */
function enveloppe<T extends { p: [number, number] }>(points: T[]): T[] {
  const p = [...points].sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);
  const x = (o: T, a: T, b: T) => (a.p[0] - o.p[0]) * (b.p[1] - o.p[1]) - (a.p[1] - o.p[1]) * (b.p[0] - o.p[0]);
  const bas: T[] = [], haut: T[] = [];
  for (const q of p) { while (bas.length > 1 && x(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
  for (const q of [...p].reverse()) { while (haut.length > 1 && x(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
  return [...bas.slice(0, -1), ...haut.slice(0, -1)];
}

/** Capsule (os long à bouts ronds) en contour fermé : [x1, y1, x2, y2, rayon] */
function capsule([a, b, x, y, r]: readonly number[]): string {
  const l = Math.hypot(x - a, y - b) || 1;
  const [nx, ny] = [(-(y - b) / l) * r, ((x - a) / l) * r];
  return `M${n(a + nx)} ${n(b + ny)}L${n(x + nx)} ${n(y + ny)}A${r} ${r} 0 0 0 ${n(x - nx)} ${n(y - ny)}L${n(a - nx)} ${n(b - ny)}A${r} ${r} 0 0 0 ${n(a + nx)} ${n(b + ny)}Z`;
}

const MARQUES: Record<string, (c: Ctx) => string> = {
  /** Relevé au podoscope : contour en pointillés, orteils, deux points d'appui */
  empreinte(c) {
    const { k, t } = placer(c.hPied, C, C);
    if (c.compact) return `<g transform="${t}">${trait(k, T.compact, c.p)}${orteils(c.p)}</g>`;
    const point = c.moyen ? LOGO.pointille.moyen : c.epais ? LOGO.pointille.epais : LOGO.pointille.normal;
    return `<g transform="${t}">${pointille(k, point, c.p)}${orteils(c.p)}`
      + `<circle cx="47" cy="194" r="${n((c.moyen ? LOGO.appui.grand : LOGO.appui.moyen) / k)}" fill="${c.d(1)}"/><circle cx="31" cy="62" r="${n(LOGO.appui.petit / k)}" fill="${c.d(0.8)}"/></g>`;
  },

  /** Baropodométrie : trame hexagonale, taille des points selon la pression */
  trame(c) {
    const { k, t } = placer(c.hPied, C, C);
    // En 16 px, une trame n'est plus lisible : la plante pleine, estompée, et ses deux zones d'appui
    if (c.compact) return `<g transform="${t}"><path d="${CONTOUR}" fill="${c.p}" fill-opacity="${c.os}"/>${orteils(c.p)}<ellipse cx="47" cy="190" rx="22" ry="26" fill="${c.p}"/><ellipse cx="42" cy="60" rx="26" ry="18" fill="${c.p}"/></g>`;
    const pas = TRAME.pas * (c.moyen ? LOGO.trame.facteurMoyen : LOGO.trame.facteur);
    const points = trame('normal', pas)
      .map((v) => `<path d="${v.d}" stroke="${c.d((v.k + 0.5) / TRAME.niveaux)}" stroke-width="${v.epaisseur}" stroke-linecap="round" fill="none"/>`)
      .join('');
    // En-tête : la silhouette estompée donne la forme du pied derrière une trame plus lâche
    const contour = c.moyen ? `<path d="${CONTOUR}" fill="${c.p}" fill-opacity="${n(c.os / 3)}"/>` : pointille(k, POINTILLE.leger.point, c.p, POINTILLE.leger.opacite);
    return `<g transform="${t}">${contour}${points}</g>`;
  },

  /** Semelle thermoformée : contours imbriqués (courbes de niveau) */
  courbes(c) {
    const { k, t } = placer(c.hPied, C, C);
    const niveaux = c.compact || c.moyen ? [1, 0.45] : [1, 0.68, 0.36];
    // Les courbes intérieures sont plus fines que le contour : le relief se lit sans masse blanche
    return `<g transform="${t}">${niveaux.map((e, i) => {
      const w = c.compact ? (i ? T.compactFin : T.compact) : i ? T.fin : c.moyen ? T.normal : c.ep;
      return `<path d="${CONTOUR}" transform="translate(${n(47 * (1 - e))} ${n(124 * (1 - e))}) scale(${e})" fill="none" stroke="${c.d(0.2 + (0.75 * i) / (niveaux.length - 1))}" stroke-width="${n(w / k / e)}" stroke-linejoin="round"/>`;
    }).join('')}</g>`;
  },

  /** Analyse du pas : trajet du centre de pression sur le contour */
  trajet(c) {
    const { k, t } = placer(c.hPied, C, C);
    const contour = c.compact ? trait(k, T.compactFin, c.p, c.os) : c.moyen ? trait(k, T.normal, c.p, c.os) : pointille(k, POINTILLE.leger.point, c.p, c.os);
    const w = c.compact ? T.compact : T.moyen;
    const points = c.compact
      ? `<circle cx="27" cy="18" r="${n(LOGO.appui.grand / k)}" fill="${c.p}"/>`
      : `<circle cx="47" cy="202" r="${n(LOGO.appui.grand / k)}" fill="${c.d(1)}"/><circle cx="62" cy="132" r="${n(LOGO.appui.petit / k)}" fill="${c.d(0.45)}"/><circle cx="27" cy="18" r="${n(LOGO.appui.moyen / k)}" fill="${c.d(0.8)}"/>`;
    return `<g transform="${t}">${contour}<path d="${TRAJET}" fill="none" stroke="${c.p}" stroke-width="${n(w / k)}" stroke-linecap="round"/>${points}</g>`;
  },

  /** Posturologie : les deux pieds, le polygone d'appui et le centre de gravité */
  appuis(c) {
    const h = c.zone * 0.92;
    const ecart = c.zone * 0.2;
    const d = placer(h, C + ecart, C);
    const g = placer(h, C - ecart, C, true);
    if (c.compact) {
      const plein = (pl: typeof d) => `<g transform="${pl.t}"><path d="${CONTOUR}" fill="${c.p}"/>${orteils(c.p)}</g>`;
      return plein(g) + plein(d);
    }
    const pied = (pl: typeof d) => `<g transform="${pl.t}"><path d="${CONTOUR}" fill="${c.p}" fill-opacity="${n(c.os / 3)}" stroke="${c.p}" stroke-width="${n(c.ep / pl.k)}" stroke-linejoin="round"/>${orteils(c.p)}</g>`;
    // Polygone de sustentation : enveloppe convexe des deux pieds ; on ne trace que les côtés qui relient un pied à l'autre (devant
    // et derrière) — jamais de tirets posés sur la plante.
    const pts = [...PLANTE.map(([x, y]) => ({ p: g.pt(x, y), k: 0 })), ...PLANTE.map(([x, y]) => ({ p: d.pt(x, y), k: 1 })),
      ...ORTEILS.map(([x, y, , ry]) => ({ p: g.pt(x, y - ry), k: 0 })), ...ORTEILS.map(([x, y, , ry]) => ({ p: d.pt(x, y - ry), k: 1 }))];
    const env = enveloppe(pts);
    const ponts = env.map((q, i) => [q, env[(i + 1) % env.length]] as const).filter(([u, v]) => u.k !== v.k).map(([u, v]) => `M${u.p.join(' ')} L${v.p.join(' ')}`).join(' ');
    const poly = `<path d="${ponts}" fill="none" stroke="${c.r}" stroke-opacity="${c.os}" stroke-width="${T.fin}"/>`; // trait continu fin, jamais de tirets
    // Centre de gravité : un simple point de donnée (aucune croix ni mire : motif exclu de la charte)
    const centre = `<circle cx="${n(C)}" cy="${n(C + c.zone * 0.08)}" r="${LOGO.appui.moyen}" fill="${c.d(1)}"/>`;
    return pied(g) + pied(d) + (c.moyen ? '' : poly) + centre;
  },

  /** Examen statique : l'arche interne de profil, cotée */
  voute(c) {
    const z = c.zone;
    const x0 = C - z / 2;
    const sol = C + z * 0.2;
    const h = z * 0.28;
    const [xa, xm, xb, xc] = [x0 + z * 0.08, x0 + z * 0.36, x0 + z * 0.8, x0 + z * 0.96];
    const w = c.compact ? T.compact : c.ep;
    const arche = `<path d="M${n(xa)} ${n(sol)} C${n(xa + z * 0.1)} ${n(sol)} ${n(xm - z * 0.14)} ${n(sol - h)} ${n(xm)} ${n(sol - h)} C${n(xm + z * 0.24)} ${n(sol - h)} ${n(xb - z * 0.16)} ${n(sol)} ${n(xb)} ${n(sol)} L${n(xc)} ${n(sol)}" fill="none" stroke="${c.p}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const solTrait = `<path d="M${n(x0)} ${n(sol + w)}H${n(x0 + z)}" stroke="${c.p}" stroke-opacity="${c.compact ? 1 : c.os}" stroke-width="${c.compact ? T.compactFin : T.fin}"/>`;
    if (c.compact) return arche + solTrait;
    const cote = c.moyen ? '' : `<path d="M${n(xm)} ${n(sol - h + w)}V${n(sol)}" stroke="${c.r}" stroke-width="${T.fin}" stroke-dasharray="${POINTILLE.tiretCourt}"/><path d="M${n(xm - 2.5)} ${n(sol)}H${n(xm + 2.5)}" stroke="${c.r}" stroke-width="${T.fin}"/>`;
    const appuis = `<circle cx="${n(xa)}" cy="${n(sol)}" r="${LOGO.appui.grand}" fill="${c.d(1)}"/><circle cx="${n(xb)}" cy="${n(sol)}" r="${LOGO.appui.moyen}" fill="${c.d(0.8)}"/>`;
    return solTrait + cote + arche + appuis;
  },

  /** Pied articulé : le squelette de profil, os emboîtés aux bords partagés, en deux tons */
  anatomie(c) {
    const { s, tr } = profil(c);
    // Favicon : trois masses pleines (jambe, arrière-pied, avant-pied) séparées par les interlignes articulaires
    if (c.compact) return `<g transform="${tr}"><path d="${PROFIL.masses.join(' ')}" fill="${c.p}"/></g>`;
    // Deux tons : aplat adouci (os d'arrière-plan en ombre) et contour franc ; les bords communs des os
    // se superposent, l'interligne articulaire est le trait lui-même
    const w = n((c.moyen ? T.normal : c.epais ? LOGO.profil.traitEpais : LOGO.profil.trait) / s);
    const os = (c.moyen ? PROFIL.principaux : PROFIL.os).map((o) =>
      `<path d="${o.d}" fill="${c.p}" fill-opacity="${o.ton ? LOGO.profil.ombre : LOGO.profil.aplat}"/><path d="${o.trait}" fill="none" stroke="${c.p}" stroke-opacity="${o.ton ? 0.55 : 1}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
    // Grand : quelques reflets discrets (repères en signal sur plan)
    const reflets = c.moyen ? '' : `<path d="${PROFIL.reflets}" fill="none" stroke="${c.r}" stroke-opacity="${c.os}" stroke-width="${n(T.fin / s)}" stroke-linecap="round"/>`;
    return `<g transform="${tr}">${os}${reflets}</g>`;
  },

  /** Épure du pied articulé : la colonne interne du squelette au trait, dans un contour de peau ouvert, appuis en points */
  'anatomie-epure'(c) {
    const { s, tr } = profil(c);
    const e = PROFIL.epure;
    const k = 1;
    const wc = (c.compact ? T.compactFin : c.moyen ? T.normal : T.fin) / s;
    const contour = `<path d="${e.contour}" fill="none" stroke="${c.compact ? c.p : c.r}" stroke-opacity="${c.compact ? 1 : c.os}" stroke-width="${n(wc)}" stroke-linecap="round"/>`;
    const reduit = (contenu: string) => contenu;
    // Favicon : le contour et la colonne interne en plein (talus, calcanéum, tarse, 1er rayon)
    if (c.compact) return `<g transform="${tr}">${contour}${reduit(`<path d="${e.compact.join(' ')}" fill="${c.p}"/>`)}</g>`;
    // Os au trait seul, sans aplat : la colonne interne (tibia, talus, calcanéum, tarse, 1er rayon)
    const w = n((c.moyen ? T.normal : c.epais ? LOGO.profil.traitEpais : LOGO.profil.trait) / s / k);
    const os = `<path d="${e.arriere.join(' ')}" fill="none" stroke="${c.p}" stroke-opacity="${c.os}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/><path d="${(c.moyen ? e.principaux : e.os).join(' ')}" fill="none" stroke="${c.p}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
    // Appuis plantaires : points du podoscope, colorés par la pression en version données
    const r = (c.moyen ? LOGO.pointille.moyen : LOGO.pointille.normal) / 2 / s;
    const appuis = (c.moyen ? e.appuis.filter((_, i) => i % 2 === 0) : e.appuis)
      .map(([x, v]) => `<circle cx="${x}" cy="${e.sol}" r="${n(r)}" fill="${c.d(v)}"/>`).join('');
    return `<g transform="${tr}">${contour}${appuis}${reduit(os)}</g>`;
  },

  /** Anatomie plantaire : le squelette vu de dessous, stylisé dans le contour (calcanéum, tarse, rayons métatarsiens, phalanges) */
  'anatomie-plantaire'(c) {
    const { k, t } = placer(c.hPied, C, C);
    const m = OS.metatarsiens;
    // Favicon : le contour et trois rayons métatarsiens (1er, 3e, 5e), rien d'autre
    if (c.compact) return `<g transform="${t}">${trait(k, T.compactFin, c.p)}${segments([m[0], m[2], m[4]], k, T.compactFin, c.p)}</g>`;
    // Os courts en volumes estompés, rayons et phalanges en traits fins : une lecture d'ensemble, pas une planche
    const volume = (o: readonly number[]) => ellipse(o, `fill="${c.p}" fill-opacity="${c.os}"`);
    if (c.moyen) {
      // En-tête : le contour, le calcanéum, les cinq rayons prolongés d'une phalange par orteil
      const orteil = OS.phalanges.map((p) => [p[0][0], p[0][1], p[p.length - 1][2], p[p.length - 1][3]]);
      return `<g transform="${t}">${trait(k, T.normal, c.p, c.os)}${volume(OS.calcaneum)}${segments(m, k, T.normal, c.p)}${segments(orteil, k, T.fin, c.p)}</g>`;
    }
    const contour = pointille(k, LOGO.pointille.normal, c.p, POINTILLE.contour.opacite);
    const doigts = ORTEILS.map((o) => ellipse(o, `fill="none" stroke="${c.p}" stroke-opacity="${c.os}" stroke-width="${n(T.fin / k)}"`)).join('');
    // Têtes du 1er et du 5e métatarsien : les deux appuis de l'avant-pied
    const tetes = [0, 4].map((i) => `<circle cx="${m[i][2]}" cy="${m[i][3]}" r="${n(LOGO.appui.petit / k)}" fill="${c.d(i ? 0.6 : 1)}"/>`).join('');
    return `<g transform="${t}">${contour}${doigts}${volume(OS.calcaneum)}${OS.tarse.map(volume).join('')}${segments(m, k, T.fin, c.p)}${segments(OS.phalanges.flat(), k, T.fin, c.p)}${tetes}</g>`;
  },

  /** Semelle de course vue de dessous : crantage de l'avant-pied en lignes, du talon en points, renfort talon */
  'semelle-sport'(c) {
    const { k, t } = placer(c.hPied, C, C);
    // Crantage de l'avant-pied : lignes transversales, en retrait du bord
    const pas = c.compact ? 30 : c.moyen ? 17 : 11;
    const retrait = c.compact ? 12 : 9;
    const lignes: number[][] = [];
    for (let y = c.compact ? 34 : 20; y <= 96; y += pas) {
      const l = largeurA(SEMELLE_POINTS, y);
      if (l) lignes.push([l[0] + retrait, y, l[1] - retrait, y - (c.compact ? 0 : 4)]);
    }
    const renfort = `M30 202 C36 211 44 213 49 213 C56 213 63 209 67 201`;
    if (c.compact) return `<g transform="${t}">${trait(k, T.compact, c.p, 1, SEMELLE)}${segments(lignes, k, T.compactFin, c.p)}</g>`;
    // Crantage du talon : trame de points (hexagonale) dans la zone d'attaque
    const pasT = TRAME.pas * (c.moyen ? LOGO.trame.facteurMoyen : LOGO.trame.crantage);
    let points = '';
    for (let r = 0, y = 158; y <= 200; r++, y += pasT * 0.866) {
      for (let x = 20 + (r % 2 ? pasT / 2 : 0); x <= 80; x += pasT) {
        const l = largeurA(SEMELLE_POINTS, y);
        if (l && x > l[0] + retrait && x < l[1] - retrait) points += `M${n(x)} ${n(y)}h0`;
      }
    }
    const talon = `<path d="${points}" stroke="${c.p}" stroke-width="${n((c.moyen ? LOGO.appui.moyen : LOGO.appui.petit) / k)}" stroke-linecap="round" fill="none"/>`;
    const r = `<path d="${renfort}" fill="none" stroke="${c.d(1)}" stroke-width="${n((c.moyen ? T.moyen : c.ep) / k)}" stroke-linecap="round"/>`;
    return `<g transform="${t}">${trait(k, c.ep, c.p, 1, SEMELLE)}${segments(lignes, k, c.moyen ? T.normal : T.fin, c.p)}${talon}${r}</g>`;
  },

  /** Relevé baropodométrique « données » : plante en points colorés par la pression, échelle graduée */
  'podoscope-data'(c) {
    // Sur tuile, la palette de pression ; au trait, monochrome (la pression se lit à l'opacité)
    const couleur = (v: number) => (c.tuile || c.donnees ? c.n(v) : c.p);
    const opacite = (v: number) => (c.tuile || c.donnees ? 1 : n(0.25 + 0.75 * v));
    const decal = c.compact ? 0 : c.zone * 0.12;
    const { k, t } = placer(c.hPied, C - decal, C);
    if (c.compact) {
      return `<g transform="${t}"><path d="${CONTOUR}" fill="${c.p}" fill-opacity="${c.os}"/>${orteils(c.p)}`
        + `<ellipse cx="47" cy="192" rx="20" ry="22" fill="${couleur(1)}"/><ellipse cx="40" cy="60" rx="24" ry="16" fill="${couleur(0.75)}"/></g>`;
    }
    // Points de taille égale : la couleur porte la donnée (la trame, elle, la porte par la taille)
    const pas = TRAME.pas * (c.moyen ? LOGO.trame.donneesMoyen : LOGO.trame.donnees);
    const points = trame('normal', pas)
      .map((v) => {
        const p = (v.k + 0.5) / TRAME.niveaux;
        return `<path d="${v.d}" stroke="${couleur(p)}" stroke-opacity="${opacite(p)}" stroke-width="${n(pas * TRAME.diametre.max)}" stroke-linecap="round" fill="none"/>`;
      })
      .join('');
    // Échelle graduée : cinq cases, de la plus faible (bas) à la plus forte (haut)
    const x = C + c.zone * 0.3;
    const hc = c.zone * (c.moyen ? 0.11 : 0.09);
    const lc = c.zone * 0.07;
    const y0 = C + 2.5 * hc;
    const echelle = [0.1, 0.35, 0.6, 0.8, 1].map((v, i) =>
      `<rect x="${n(x - lc / 2)}" y="${n(y0 - (i + 1) * hc + T.fin / 2)}" width="${n(lc)}" height="${n(hc - T.fin)}" rx="${n(T.fin)}" fill="${couleur(v)}" fill-opacity="${opacite(v)}"/>`).join('');
    const graduations = c.moyen ? '' : `<path d="${[0, 2.5, 5].map((i) => `M${n(x + lc / 2 + T.fin)} ${n(y0 - i * hc)}h${n(lc * 0.6)}`).join('')}" stroke="${c.r}" stroke-opacity="${c.os}" stroke-width="${T.fin}"/>`;
    // Contour du relevé : il garde la forme du pied lisible quand les points bleus se fondent dans la tuile
    return `<g transform="${t}">${pointille(k, LOGO.pointille.normal, c.p, c.os)}${points}</g>${echelle}${graduations}`;
  },

  /** Course à pied : chaussure de running inclinée en propulsion (talon levé), empeigne en trame de points */
  'chaussure-marathon'(c) {
    const K = CHAUSSURE;
    // Repère 100 × 50, pointe à droite, incliné autour de son centre ; largeur d'une marque en forme de pied
    const s = c.hPied / 100;
    const tr = `translate(${n(C - K.centre[0] * s)} ${n(C - K.centre[1] * s)}) scale(${n(s)}) rotate(${K.inclinaison} ${K.centre[0]} ${K.centre[1]})`;
    const u = (w: number) => n(w / s);
    // Favicon : la tige pleine et la ligne de semelle
    if (c.compact) {
      return `<g transform="${tr}"><path d="${K.tige}" fill="${c.p}"/><path d="${K.ligne}" fill="none" stroke="${c.p}" stroke-width="${u(T.compact)}" stroke-linecap="round"/></g>`;
    }
    // Tuile : silhouette claire, détails en creux (couleur de la tuile) ; au trait : contour monotrait arrondi
    const plein = c.tuile;
    const creux = plein ? c.fond : c.p;
    const w = c.moyen ? T.moyen : c.ep;
    const corps = plein
      ? `fill="${c.p}" stroke="${c.fond}" stroke-width="${u(T.fin)}" stroke-linejoin="round"`
      : `fill="${c.p}" fill-opacity="${n(LOGO.profil.aplat / 2)}" stroke="${c.p}" stroke-width="${u(w)}" stroke-linejoin="round"`;
    const detail = (d: string, ep: number) => `<path d="${d}" fill="none" stroke="${creux}" stroke-width="${u(ep)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const fenetre = plein ? `<path d="${K.fenetre}" fill="${creux}"/>` : detail(K.fenetre, T.fin);
    const lacets = (c.moyen ? K.lacets.slice(0, 3) : K.lacets).map(([a, b, x, y]) => `M${a} ${b}L${x} ${y}`).join('');
    // Empeigne avant : trame hexagonale de points ; en version données, colorée du talon vers la pointe
    const couleurX = (x: number) => (c.donnees ? c.n(Math.min(1, Math.max(0, (x - 10) / 86))) : creux);
    const pas = TRAME.pas * (c.moyen ? LOGO.trame.chaussureMoyen : LOGO.trame.chaussure);
    let trame = '';
    for (let r = 0, y = 28; y <= 35; r++, y += pas * 0.866) {
      for (let x = 62 + (r % 2 ? pas / 2 : 0); x <= 90; x += pas) {
        if (dansPolygone(K.empeigne, x, y)) trame += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(pas * TRAME.diametre.max * 0.42)}" fill="${couleurX(x)}"/>`;
      }
    }
    // Crantage : encoches qui remontent du bord de la semelle ; colorées du talon vers la pointe en version données
    const [p0, p1, p2] = K.crantage;
    const yC = (x: number) => (x < p1[0] ? p0[1] + ((p1[1] - p0[1]) * (x - p0[0])) / (p1[0] - p0[0]) : p1[1] + ((p2[1] - p1[1]) * (x - p1[0])) / (p2[0] - p1[0]));
    const pasC = c.moyen ? 11 : 7;
    let crantage = '';
    for (let x = p0[0] + pasC; x < p2[0]; x += pasC) {
      crantage += `<path d="M${n(x)} ${n(yC(x) + 0.4)}L${n(x + 1)} ${n(yC(x) - 2.8)}" stroke="${c.donnees ? couleurX(x) : creux}" stroke-width="${u(c.moyen ? T.normal : T.fin * 1.4)}" stroke-linecap="round"/>`;
    }
    // Deux lignes de vitesse derrière le talon (repère signal sur plan)
    const vitesse = `<path d="${K.vitesse}" stroke="${c.r}" stroke-opacity="${c.os}" stroke-width="${u(c.moyen ? T.normal : T.fin * 1.4)}" stroke-linecap="round"/>`;
    const renfort = c.moyen ? '' : detail(K.renfort, T.fin);
    return `<g transform="${tr}">${vitesse}<path d="${K.semelle}" ${corps}/><path d="${K.tige}" ${corps}/>${fenetre}${renfort}`
      + `${detail(lacets, c.moyen ? T.normal : T.fin * 1.4)}${trame}${crantage}</g>`;
  },

  /** Foulée : une jambe de profil, du genou au pied, en fin d'appui (talon levé) ; zones d'appui en bandes sur le sol */
  foulee(c) {
    const J = JAMBE;
    const s = c.zone / 100;
    const tr = `translate(${n(C - 50 * s)} ${n(C - 50 * s)}) scale(${n(s)})`;
    const u = (w: number) => n(w / s);
    const { y, x1, x2 } = J.sol;
    const [a0] = J.appuis[0];
    const b1 = J.appuis[J.appuis.length - 1][1];
    if (c.compact) {
      return `<g transform="${tr}"><path d="${J.silhouette}" fill="${c.p}"/><path d="M${a0} ${y - 2}H${b1}" stroke="${c.p}" stroke-width="${u(T.compactFin)}" stroke-linecap="round"/></g>`;
    }
    const [dx, dy, dr] = J.disque;
    const disque = `<circle cx="${dx}" cy="${dy}" r="${dr}" fill="${c.p}" fill-opacity="${n(c.os / 3)}"/>`;
    // Tuile : silhouette pleine, détails en creux ; au trait : contour ouvert au genou, aplat adouci
    const w = c.moyen ? T.moyen : c.ep;
    const jambe = c.tuile
      ? `<path d="${J.silhouette}" fill="${c.p}"/>`
      : `<path d="${J.silhouette}" fill="${c.p}" fill-opacity="${LOGO.profil.aplat}" stroke="${c.p}" stroke-width="${u(w)}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const details = ''; // pas d'arc de malléole (lu « crochet » : contre-revue N6)
    // Sol en points du podoscope de part et d'autre des appuis ; sous la plante, les zones d'appui en bandes
    // (palette de pression en version données, sinon couleur des repères)
    const pts = c.moyen ? LOGO.pointille.moyen : LOGO.pointille.normal;
    const sol = `<path d="M${x1} ${y}H${a0 - 6}M${b1 + 6} ${y}H${x2}" stroke="${c.r}" stroke-opacity="${POINTILLE.contour.opacite}" stroke-width="${u(pts)}" stroke-linecap="round" stroke-dasharray="0 ${u(POINTILLE.contour.ecart)}"/>`;
    const appuis = (c.moyen ? J.appuis.slice(1) : J.appuis).map(([xa, xb, v]) =>
      `<path d="M${xa} ${y}H${xb}" stroke="${c.d(v)}" stroke-width="${u(c.moyen ? T.moyen * 1.3 : LOGO.appui.petit * 1.4)}" stroke-linecap="round"/>`).join('');
    return `<g transform="${tr}">${disque}${sol}${jambe}${details}${appuis}</g>`;
  },

  /** Rubans : bords de la plante (voûte interne, bord externe) et arc des orteils, en pleins et déliés */
  rubans(c) {
    const { t } = placer(c.hPied * LOGO.rubans.echelle, C, C);
    const f = c.compact ? LOGO.rubans.compact : c.moyen ? LOGO.rubans.moyen : 1;
    const couleurs = [`fill="${c.p}"`, `fill="${c.p}" fill-opacity="${c.compact ? 1 : LOGO.rubans.adouci}"`, `fill="${c.d(0.8)}"`];
    const rubans = (c.compact ? RUBANS.slice(0, 2) : RUBANS).map((r, i) => `<path d="${ruban(r.points, r.epaisseurs, f)}" ${couleurs[i]}/>`).join('');
    return `<g transform="rotate(${LOGO.rubans.inclinaison} ${C} ${C})"><g transform="${t}">${rubans}</g></g>`;
  },

  /** Initiales dans la police des titres, soulignées d'une échelle de pression graduée */
  monogramme(c) {
    const ini = c.initiales.replace(/[<>&"]/g, '').slice(0, 2);
    const fs = c.zone * (c.compact ? (ini.length > 1 ? 0.62 : 0.86) : ini.length > 1 ? 0.5 : 0.64);
    const y = c.compact ? C + fs * 0.35 : C + fs * 0.12;
    const texte = `<text x="${C}" y="${n(y)}" text-anchor="middle" font-family="${c.police.replace(/"/g, "'")}" font-weight="${c.graisse}" font-size="${n(fs)}" letter-spacing="${n(-fs * 0.02)}" fill="${c.p}">${ini}</text>`;
    if (c.compact) return texte;
    const ligne = C + c.zone * 0.34;
    const pas = c.zone * 0.15;
    const echelle = [0.1, 0.35, 0.6, 0.8, 1].map((v, i) => {
      const diam = pas * 0.9 * (TRAME.diametre.min + (TRAME.diametre.max - TRAME.diametre.min) * v);
      return `<circle cx="${n(C + (i - 2) * pas)}" cy="${n(ligne)}" r="${n(diam / 2)}" fill="${c.d(v)}"/>`;
    }).join('');
    return texte + echelle;
  },
};

/** Identifiants des marques dessinées (doivent couvrir les marques déclarées dans univers.ts) */
export const MARQUES_DESSINEES = Object.keys(MARQUES);

/**
 * SVG d'une marque, en chaîne (site Astro, favicon, aperçus React avec dangerouslySetInnerHTML).
 * Repère carré de LOGO.cadre unités. Couleurs : valeurs ou variables CSS, jamais en dur.
 */
export function svgMarque(marque: string, couleurs: CouleursMarque, o: OptionsMarque = {}): string {
  const tr = o.traitement ?? 'plein';
  const compact = o.compact ?? (o.taille !== undefined && o.taille <= LOGO.compact);
  const tuile = tr !== 'trait';
  const marge = tuile ? LOGO.marge.tuile : LOGO.marge.trait;
  const clair = couleurs.clair ?? NEUTRES.blanc;
  const p = tuile ? clair : couleurs.accent;
  const r = tr === 'plan' ? couleurs.signal ?? PLAN.signal : p;
  const palette = couleurs.donnees ?? PRESSION;
  // Niveau discret de la palette (fonctionne aussi avec des variables CSS)
  const niveau = (v: number) => {
    let i = 0;
    while (i < ARRETS_PRESSION.length - 1 && v >= ARRETS_PRESSION[i + 1]) i++;
    return palette[i];
  };
  const donnees = o.donnees ?? tr === 'plan';
  const moyen = !compact && o.taille !== undefined && o.taille <= LOGO.moyen;
  const ctx: Ctx = {
    compact,
    tuile,
    moyen,
    zone: LOGO.cadre - 2 * marge,
    hPied: LOGO.cadre - 2 * (tuile ? LOGO.marge.pied : LOGO.marge.trait),
    fond: tuile ? (tr === 'plan' ? couleurs.plan ?? PLAN.fond : couleurs.accent) : 'none',
    p,
    r,
    d: donnees ? niveau : () => r,
    donnees,
    n: niveau,
    os: LOGO.opaciteSecondaire,
    ep: compact || (moyen && o.traitCompact) ? LOGO.trait.compact : moyen ? LOGO.trait.moyen : o.epais ? LOGO.trait.epais : LOGO.trait.normal,
    epais: !!o.epais,
    initiales: o.initiales ?? '',
    police: o.police ?? POLICES.inter,
    graisse: o.graisse ?? 600,
  };
  const dessin = (MARQUES[marque] ?? MARQUES[LOGO_PAR_DEFAUT.marque])(ctx);
  const fond = tuile ? `<rect width="${LOGO.cadre}" height="${LOGO.cadre}" rx="${Math.max(0, Math.min(LOGO.rayonMax, o.rayon ?? 10))}" fill="${tr === 'plan' ? couleurs.plan ?? PLAN.fond : couleurs.accent}"/>` : '';
  const dim = o.taille ? ` width="${o.taille}" height="${o.taille}"` : '';
  const a11y = o.titre ? ` role="img" aria-label="${o.titre.replace(/"/g, '&quot;')}"` : ' aria-hidden="true" focusable="false"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO.cadre} ${LOGO.cadre}"${dim}${a11y}>${fond}${dessin}</svg>`;
}

/**
 * Favicon (SVG autonome) d'un site : marque compacte, toujours sur tuile pour rester visible sur les
 * onglets clairs et sombres (plein, ou plan si c'est le traitement du modèle).
 */
export function svgFavicon(choix: ChoixLogo, m: ModeleManifeste, theme: { couleur: string; gamme?: string | null }, nom = ''): string {
  const t = traitementLogo(m);
  return svgMarque(choix.marque, couleursMarque(m, theme), {
    traitement: t.marque === 'plan' ? 'plan' : 'plein',
    rayon: t.rayon,
    compact: true,
    initiales: initiales(nom),
    police: t.police,
    graisse: Math.max(t.graisse, 600),
  });
}
