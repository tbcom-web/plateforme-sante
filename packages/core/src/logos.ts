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

import { LOGO, NEUTRES, PLAN, POINTILLE, POLICES, TRAIT, TRAME } from './charte';
import { CONTOUR, ORTEILS, TRAJET } from './pied';
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
  /** Hauteur d'une marque en forme de pied (unités) */
  hPied: number;
  /** Côté utile (unités) */
  zone: number;
  /** Trait principal, secondaire (opacité), repère (signal), donnée de niveau v */
  p: string;
  r: string;
  d: (v: number) => string;
  os: number;
  ep: number;
  epais: boolean;
  initiales: string;
  police: string;
  graisse: number;
};

const C = LOGO.cadre / 2;
const n = (x: number) => +x.toFixed(2);

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
const pointille = (k: number, point: number, couleur: string, opacite = 1) =>
  `<path d="${CONTOUR}" fill="none" stroke="${couleur}" stroke-opacity="${opacite}" stroke-width="${n(point / k)}" stroke-linecap="round" stroke-dasharray="0 ${n(POINTILLE.contour.ecart / k)}"/>`;

const trait = (k: number, w: number, couleur: string, opacite = 1) =>
  `<path d="${CONTOUR}" fill="none" stroke="${couleur}" stroke-opacity="${opacite}" stroke-width="${n(w / k)}" stroke-linejoin="round"/>`;

const MARQUES: Record<string, (c: Ctx) => string> = {
  /** Relevé au podoscope : contour en pointillés, orteils, deux points d'appui */
  empreinte(c) {
    const { k, t } = placer(c.hPied, C, C);
    if (c.compact) return `<g transform="${t}">${trait(k, TRAIT.marque, c.p)}${orteils(c.p)}</g>`;
    return `<g transform="${t}">${pointille(k, c.moyen ? TRAIT.marque : c.epais ? POINTILLE.contour.point : POINTILLE.leger.point, c.p)}${orteils(c.p)}`
      + `<circle cx="47" cy="194" r="${n((c.moyen ? TRAIT.marque : TRAIT.fort) / k)}" fill="${c.d(1)}"/><circle cx="31" cy="62" r="${n(TRAIT.normal / k)}" fill="${c.d(0.8)}"/></g>`;
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
    const w = c.compact ? TRAIT.marque : c.ep;
    return `<g transform="${t}">${niveaux.map((e, i) =>
      `<path d="${CONTOUR}" transform="translate(${n(47 * (1 - e))} ${n(124 * (1 - e))}) scale(${e})" fill="none" stroke="${c.d(0.2 + (0.75 * i) / (niveaux.length - 1))}" stroke-width="${n(w / k / e)}" stroke-linejoin="round"/>`,
    ).join('')}</g>`;
  },

  /** Analyse du pas : trajet du centre de pression sur le contour */
  trajet(c) {
    const { k, t } = placer(c.hPied, C, C);
    const contour = c.compact ? trait(k, TRAIT.fort, c.p, c.os) : c.moyen ? trait(k, TRAIT.normal, c.p, c.os) : pointille(k, POINTILLE.leger.point, c.p, c.os);
    const w = c.compact || c.moyen ? TRAIT.marque : TRAIT.fort;
    const points = c.compact
      ? `<circle cx="27" cy="18" r="${n(TRAIT.marque / k)}" fill="${c.p}"/>`
      : `<circle cx="47" cy="202" r="${n(TRAIT.marque / k)}" fill="${c.d(1)}"/><circle cx="62" cy="132" r="${n(TRAIT.normal / k)}" fill="${c.d(0.45)}"/><circle cx="27" cy="18" r="${n(TRAIT.fort / k)}" fill="${c.d(0.8)}"/>`;
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
    const coins = [g.pt(47, 212), d.pt(47, 212), d.pt(76, 60), g.pt(76, 60)];
    const poly = `<path d="M${coins.map((p) => p.join(' ')).join(' L')} Z" fill="none" stroke="${c.r}" stroke-opacity="${c.os}" stroke-width="${TRAIT.fin}" stroke-dasharray="${POINTILLE.tiretCourt}"/>`;
    // Centre de gravité : un simple point de donnée (aucune croix ni mire : motif exclu de la charte)
    const centre = `<circle cx="${n(C)}" cy="${n(C + c.zone * 0.08)}" r="${TRAIT.fort}" fill="${c.d(1)}"/>`;
    return pied(g) + pied(d) + (c.moyen ? '' : poly) + centre;
  },

  /** Examen statique : l'arche interne de profil, cotée */
  voute(c) {
    const z = c.zone;
    const x0 = C - z / 2;
    const sol = C + z * 0.2;
    const h = z * 0.28;
    const [xa, xm, xb, xc] = [x0 + z * 0.08, x0 + z * 0.36, x0 + z * 0.8, x0 + z * 0.96];
    const w = c.compact ? TRAIT.marque : c.ep;
    const arche = `<path d="M${n(xa)} ${n(sol)} C${n(xa + z * 0.1)} ${n(sol)} ${n(xm - z * 0.14)} ${n(sol - h)} ${n(xm)} ${n(sol - h)} C${n(xm + z * 0.24)} ${n(sol - h)} ${n(xb - z * 0.16)} ${n(sol)} ${n(xb)} ${n(sol)} L${n(xc)} ${n(sol)}" fill="none" stroke="${c.p}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const solTrait = `<path d="M${n(x0)} ${n(sol + w)}H${n(x0 + z)}" stroke="${c.p}" stroke-opacity="${c.compact ? 1 : c.os}" stroke-width="${c.compact ? TRAIT.fort : TRAIT.fin}"/>`;
    if (c.compact) return arche + solTrait;
    const cote = c.moyen ? '' : `<path d="M${n(xm)} ${n(sol - h + w)}V${n(sol)}" stroke="${c.r}" stroke-width="${TRAIT.fin}" stroke-dasharray="${POINTILLE.tiretCourt}"/><path d="M${n(xm - 2.5)} ${n(sol)}H${n(xm + 2.5)}" stroke="${c.r}" stroke-width="${TRAIT.fin}"/>`;
    const appuis = `<circle cx="${n(xa)}" cy="${n(sol)}" r="${TRAIT.marque * 0.8}" fill="${c.d(1)}"/><circle cx="${n(xb)}" cy="${n(sol)}" r="${TRAIT.marque * 0.7}" fill="${c.d(0.8)}"/>`;
    return solTrait + cote + arche + appuis;
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
  const ctx: Ctx = {
    compact,
    moyen: !compact && o.taille !== undefined && o.taille <= LOGO.moyen,
    zone: LOGO.cadre - 2 * marge,
    hPied: LOGO.cadre - 2 * (tuile ? LOGO.marge.pied : LOGO.marge.trait),
    p,
    r,
    d: donnees ? niveau : () => r,
    os: LOGO.opaciteSecondaire,
    ep: o.epais ? TRAIT.fort : TRAIT.normal,
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
