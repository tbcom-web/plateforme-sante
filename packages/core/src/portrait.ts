// Studio portrait : fonctions pures partagées par l'admin (studio de retouche, contrôle des données enregistrées) et les
// sites (srcset des portraits). Aucun traitement d'image ici : cadrage, tailles de rendu, couleurs des fonds, réglages de
// la retouche automatique, score du détourage et nettoyage des données du brouillon (praticiens[].portrait).
//
// Principe : tout le traitement se fait dans le navigateur de l'admin au moment de l'envoi de la photo ; le site public ne
// reçoit que des images finales (WebP, plusieurs largeurs) et n'exécute aucun script. La photo retouchée et la photo
// détourée (avec transparence) sont gardées avec les réglages, pour recomposer le portrait (nouvelles couleurs du site,
// autre style, autre cadrage) sans refaire le détourage.
//
// Déontologie : portrait fidèle. La retouche corrige la lumière et les couleurs d'une photo de téléphone (niveaux,
// balance des blancs, exposition, contraste doux) ; jamais de lissage de peau ni de modification des traits.

import { gamme, variantesGamme } from './gammes';
import { luminance, melanger } from './couleurs';
import { NEUTRES } from './charte';

// ———————————————————————————————————————————————————— Styles de fond

export type StylePortrait = 'aplat' | 'degrade' | 'forme' | 'duotone' | 'flou' | 'original';

export type DefinitionStyle = {
  id: StylePortrait;
  nom: string;
  description: string;
  /** Le style remplace le fond : il faut un détourage réussi */
  detourage: boolean;
  /** Le style utilise les couleurs du site : à recomposer si elles changent */
  couleurs: boolean;
};

export const STYLES_PORTRAIT: DefinitionStyle[] = [
  { id: 'aplat', nom: 'Aplat', description: 'Fond uni, dans la couleur douce du site.', detourage: true, couleurs: true },
  { id: 'degrade', nom: 'Dégradé doux', description: 'Fond clair qui s’assombrit légèrement vers les bords.', detourage: true, couleurs: true },
  { id: 'forme', nom: 'Cercle', description: 'Un cercle de couleur derrière vous, sur fond clair.', detourage: true, couleurs: true },
  { id: 'duotone', nom: 'Duotone discret', description: 'Le fond d’origine flouté et teinté aux couleurs du site.', detourage: true, couleurs: true },
  { id: 'flou', nom: 'Fond flouté', description: 'Le cabinet reste visible, flouté derrière vous.', detourage: false, couleurs: false },
  { id: 'original', nom: 'Original amélioré', description: 'Votre photo telle quelle, lumière et couleurs corrigées.', detourage: false, couleurs: false },
];

export const styleDetoure = (s: StylePortrait) => STYLES_PORTRAIT.find((x) => x.id === s)?.detourage ?? false;

// ———————————————————————————————————————————————————— Formats et tailles de rendu

export type FormatPortrait = 'portrait' | 'carre';

/**
 * Formats produits, d'après les tailles d'affichage réelles des gabarits :
 * - « portrait » 4:5 : fiche praticien des modèles éditoriaux (apps/sites/src/components/gabarit/Praticiens.astro) — carte
 *   pleine largeur au téléphone (≈ 330 px, écrans 2x et 3x), colonne de ≈ 440 px sur grand écran, recadrée en 4:3 ou en
 *   colonne haute par object-fit ;
 * - « carre » : pastille ronde de 64 px des gabarits tableau, village et revue (components/gabarits/Praticiens.astro),
 *   écrans 2x et 3x.
 */
export const FORMATS_PORTRAIT: Record<FormatPortrait, { ratio: number; largeurs: number[] }> = {
  portrait: { ratio: 4 / 5, largeurs: [400, 640, 960] },
  carre: { ratio: 1, largeurs: [128, 192] },
};

/** Largeur « téléphone » du format portrait : celle qui doit rester sous POIDS_CIBLE_MOBILE */
export const LARGEUR_MOBILE = 640;
/** Poids cible de l'image servie au téléphone (octets) */
export const POIDS_CIBLE_MOBILE = 60 * 1024;
/** Plus grand côté de la photo de travail (retouchée, gardée pour recomposer) */
export const COTE_SOURCE = 1600;

/** Position verticale (object-position) du portrait 4:5 quand le site l'affiche en 4:3 : la tête reste visible. */
export const POSITION_PORTRAIT = '50% 22%';

/** Largeurs utiles pour un cadre de `largeurCadre` pixels de source : jamais d'agrandissement au-delà de 15 %. */
export function largeursRendu(format: FormatPortrait, largeurCadre: number): number[] {
  const toutes = FORMATS_PORTRAIT[format].largeurs;
  const utiles = toutes.filter((l) => l <= largeurCadre * 1.15);
  return utiles.length ? utiles : [Math.max(32, Math.round(Math.min(largeurCadre, toutes[0])))];
}

/** Hauteur d'un rendu au format (arrondie au pixel) */
export const hauteurRendu = (format: FormatPortrait, largeur: number) => Math.round(largeur / FORMATS_PORTRAIT[format].ratio);

// ———————————————————————————————————————————————————— Cadrage tête-épaules

/** Rectangle en pixels de la source */
export type Rect = { x: number; y: number; l: number; h: number };
/** Repère du visage, normalisé : centre (cx, cy en fraction de la largeur et de la hauteur) et hauteur du visage (t, fraction de la hauteur) */
export type Ancre = { cx: number; cy: number; t: number };
/** Réglage manuel : zoom (1 = cadrage automatique) et décalage en fraction du cadre */
export type Reglage = { zoom: number; dx: number; dy: number };

export const REGLAGE_NEUTRE: Reglage = { zoom: 1, dx: 0, dy: 0 };
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;

const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const fini = (v: unknown, defaut: number) => (typeof v === 'number' && Number.isFinite(v) ? v : defaut);

/** Ancre depuis la boîte du détecteur de visages (pixels) : la boîte couvre des sourcils au menton. */
export function ancreDepuisVisage(b: Rect, l: number, h: number): Ancre {
  return { cx: borne((b.x + b.l / 2) / l, 0, 1), cy: borne((b.y + b.h / 2) / h, 0, 1), t: borne(b.h / h, 0.02, 1) };
}

/**
 * Ancre approchée depuis la silhouette détourée, quand aucun visage n'est détecté : `haut` = première ligne de la
 * silhouette, `cxTete` et `largeurTete` = centre et largeur de la silhouette un peu sous le haut (la tête).
 */
export function ancreDepuisSilhouette(haut: number, cxTete: number, largeurTete: number, l: number, h: number): Ancre {
  const visage = largeurTete * 0.95;
  return { cx: borne(cxTete / l, 0, 1), cy: borne((haut + visage * 0.85) / h, 0, 1), t: borne(visage / h, 0.04, 1) };
}

/** Ancre par défaut (aucun repère) : visage supposé centré dans le tiers haut */
export const ancreParDefaut = (): Ancre => ({ cx: 0.5, cy: 0.36, t: 0.2 });

/** Part de la hauteur du cadre occupée par le visage, et position verticale de son centre dans le cadre */
const COMPOSITION: Record<FormatPortrait, { part: number; centre: number }> = {
  // 4:5 : visage ≈ 28 % de la hauteur, centré à 40 % : le haut des cheveux tombe vers 10 %, les épaules sont dans le cadre.
  portrait: { part: 0.28, centre: 0.4 },
  // Carré (pastille ronde) : plus serré, visage centré un peu au-dessus du milieu.
  carre: { part: 0.38, centre: 0.47 },
};

/**
 * Cadre de rendu (pixels de la source) pour un format, le repère du visage et le réglage manuel. Le cadre reste toujours
 * dans l'image (réduit si nécessaire, ratio conservé) : jamais de bande vide.
 */
export function cadrer(format: FormatPortrait, ancre: Ancre, reglage: Reglage, l: number, h: number): Rect {
  const { ratio } = FORMATS_PORTRAIT[format];
  const { part, centre } = COMPOSITION[format];
  const zoom = borne(fini(reglage.zoom, 1), ZOOM_MIN, ZOOM_MAX);
  let H = (ancre.t * h) / part / zoom;
  let W = H * ratio;
  const k = Math.min(1, l / W, h / H);
  W *= k; H *= k;
  const x = ancre.cx * l - W / 2 + fini(reglage.dx, 0) * W;
  const y = ancre.cy * h - centre * H + fini(reglage.dy, 0) * H;
  return { x: borne(x, 0, l - W), y: borne(y, 0, h - H), l: W, h: H };
}

/**
 * Réglage correspondant à un cadre effectivement affiché (après butée sur les bords) : évite qu'un déplacement au-delà du
 * bord « s'accumule » sans effet visible.
 */
export function reglageDepuisCadre(format: FormatPortrait, ancre: Ancre, zoom: number, cadre: Rect, l: number, h: number): Reglage {
  const brut = cadrer(format, ancre, { zoom, dx: 0, dy: 0 }, l, h);
  // cadrer() sans décalage, avant butée : position théorique
  const { centre } = COMPOSITION[format];
  const x0 = ancre.cx * l - brut.l / 2;
  const y0 = ancre.cy * h - centre * brut.h;
  return { zoom: borne(zoom, ZOOM_MIN, ZOOM_MAX), dx: (cadre.x - x0) / brut.l, dy: (cadre.y - y0) / brut.h };
}

/** Déplacement manuel (glisser) : `px`, `py` en pixels de l'aperçu de `largeurApercu` pixels (le contenu suit le doigt). */
export function deplacer(format: FormatPortrait, ancre: Ancre, r: Reglage, px: number, py: number, largeurApercu: number, l: number, h: number): Reglage {
  const cadre = cadrer(format, ancre, r, l, h);
  const echelle = cadre.l / largeurApercu;
  const bouge = { x: cadre.x - px * echelle, y: cadre.y - py * echelle, l: cadre.l, h: cadre.h };
  const borne2 = { ...bouge, x: borne(bouge.x, 0, l - cadre.l), y: borne(bouge.y, 0, h - cadre.h) };
  return reglageDepuisCadre(format, ancre, r.zoom, borne2, l, h);
}

/** Zoom manuel, borné */
export const zoomer = (r: Reglage, facteur: number): Reglage => ({ ...r, zoom: borne(r.zoom * facteur, ZOOM_MIN, ZOOM_MAX) });

// ———————————————————————————————————————————————————— Couleurs des fonds

export type PalettePortrait = {
  /** Clé des couleurs (gamme ou couleur libre) : le portrait est à recomposer si elle change */
  cle: string;
  fond: string;
  doux: string;
  aplat: string;
  pale: string;
  vif: string;
  duo: string;
  encre: string;
  /** Teinte sombre et teinte claire du duotone */
  duotoneSombre: string;
  duotoneClair: string;
};

/** Couleurs des fonds de portrait pour un site : gamme choisie, sinon couleur libre (mêmes dérivés que les gabarits). */
export function palettePortrait(theme: { couleur: string; gamme?: string | null }): PalettePortrait {
  const g = gamme(theme.gamme);
  const v = g ? variantesGamme(g) : null;
  const blanc = NEUTRES.blanc;
  const libre = /^#[0-9a-f]{6}$/i.test(theme.couleur ?? '') ? theme.couleur.toLowerCase() : (gamme('ardoise')?.accent ?? NEUTRES.encreNuit);
  const vif = v?.vif ?? libre;
  const duo = v?.duo ?? vif;
  // Couleur assez soutenue pour teinter (un jaune pâle donnerait un fond identique au blanc)
  const base = luminance(vif) > 0.4 ? melanger(vif, NEUTRES.encre, 0.25) : vif;
  const encre = v?.encre ?? NEUTRES.encre;
  const aplat = v && g?.famille === 'vitaminee' ? v.aplat : melanger(blanc, base, 0.2);
  const doux = g?.fondDoux ?? melanger(blanc, base, 0.09);
  const fond = g?.fond ?? blanc;
  const pale = v?.vifPale ?? melanger(blanc, base, 0.12);
  return {
    cle: g ? `gamme:${g.id}` : `couleur:${libre}`,
    fond, doux, aplat, pale, vif, duo, encre,
    duotoneSombre: melanger(duo, encre, 0.45),
    duotoneClair: melanger(aplat, blanc, 0.35),
  };
}

// ———————————————————————————————————————————————————— Retouche automatique (« belle photo de téléphone »)

/** Statistiques de la photo, calculées par l'admin en un passage sur les pixels */
export type StatsPhoto = {
  /** Histogramme de luminance (256 cases) */
  luminance: ArrayLike<number>;
  /** Moyennes r, v, b de toute l'image (0 à 255) */
  moyenne: [number, number, number];
  /** Sommes r, v, b et nombre des pixels les plus clairs non brûlés (mur, fenêtre, blouse ; hors visage) : « point blanc » */
  clairs: [number, number, number, number];
  /** Luminance moyenne du sujet (visage, sinon silhouette), 0 à 255 ; absent = médiane de l'image */
  sujet?: number;
};

export type Retouche = {
  /** Gains de balance des blancs (r, v, b), chaleur comprise */
  gains: [number, number, number];
  /** Point noir et point blanc (0 à 255) des niveaux, communs aux trois canaux (pas de dérive de couleur) */
  noir: number;
  blanc: number;
  /** Gamma d'exposition (< 1 éclaircit) */
  gamma: number;
  /** Contraste doux (courbe en S, 0 = aucun) */
  contraste: number;
  /** Saturation (1 = inchangée) : très légère, jamais un effet */
  saturation: number;
};

export const RETOUCHE_NEUTRE: Retouche = { gains: [1, 1, 1], noir: 0, blanc: 255, gamma: 1, contraste: 0, saturation: 1 };

function centile(histo: ArrayLike<number>, p: number): number {
  let total = 0;
  for (let i = 0; i < histo.length; i++) total += histo[i];
  if (!total) return p < 0.5 ? 0 : 255;
  const cible = total * p;
  let cumul = 0;
  for (let i = 0; i < histo.length; i++) { cumul += histo[i]; if (cumul >= cible) return i; }
  return 255;
}

/**
 * Réglages de la retouche, sobres et naturels : balance des blancs (monde gris et point blanc, atténués),
 * légère chaleur, niveaux (sans écraser les noirs ni brûler les blancs), exposition visée sur le visage, contraste doux.
 */
export function calculerRetouche(s: StatsPhoto): Retouche {
  // Balance des blancs : moitié « monde gris » (moyenne de l'image), moitié « point blanc » (zones les plus claires),
  // corrigée aux deux tiers et bornée ; puis une pointe de chaleur.
  const [cr, cv, cb, cn] = s.clairs;
  const blancRef: [number, number, number] = cn > 20 ? [cr / cn, cv / cn, cb / cn] : s.moyenne;
  const ref = s.moyenne.map((m, i) => {
    const grisM = (s.moyenne[0] + s.moyenne[1] + s.moyenne[2]) / 3 || 1;
    const grisB = (blancRef[0] + blancRef[1] + blancRef[2]) / 3 || 1;
    return ((m / grisM) + (blancRef[i] / grisB)) / 2;
  });
  const force = 0.65;
  const chaleur = 0.02;
  const gains = ref.map((c, i) => {
    const g = 1 + (1 / Math.max(c, 0.01) - 1) * force;
    const chaud = i === 0 ? 1 + chaleur : i === 2 ? 1 - chaleur : 1;
    return borne(g, 0.82, 1.2) * chaud;
  }) as [number, number, number];

  // Niveaux : 0,4 % et 99,6 %, appliqués à 80 % (on garde un peu de matière dans les ombres)
  const n0 = centile(s.luminance, 0.004);
  const b0 = centile(s.luminance, 0.996);
  const noir = Math.round(borne(n0, 0, 40) * 0.8);
  const blanc = Math.round(255 - (255 - borne(b0, 190, 255)) * 0.8);

  // Exposition : sujet ramené vers 56 % de luminance (sRGB), sans excès
  const sujetBrut = s.sujet ?? centile(s.luminance, 0.5);
  const sujet = borne((sujetBrut - noir) / Math.max(1, blanc - noir), 0.02, 0.98);
  const cible = 0.56;
  const gammaPlein = Math.log(cible) / Math.log(sujet);
  const gamma = borne(1 + (gammaPlein - 1) * 0.75, 0.72, 1.3);

  return { gains, noir, blanc, gamma: Math.round(gamma * 1000) / 1000, contraste: 0.14, saturation: 1.04 };
}

/** Courbe de la retouche pour un canal (0 à 255 → 0 à 255) : gain, niveaux, gamma, courbe en S douce. */
export function courbeRetouche(r: Retouche, canal: 0 | 1 | 2): Uint8Array {
  const lut = new Uint8Array(256);
  const plage = Math.max(1, r.blanc - r.noir);
  for (let i = 0; i < 256; i++) {
    let x = (i * r.gains[canal] - r.noir) / plage;
    x = borne(x, 0, 1);
    x = x ** r.gamma;
    const s = x * x * (3 - 2 * x);
    x = x + (s - x) * r.contraste;
    lut[i] = Math.round(borne(x, 0, 1) * 255);
  }
  return lut;
}

// ———————————————————————————————————————————————————— Qualité du détourage

/** Mesures du masque de détourage (0 à 1 par pixel), calculées par l'admin */
export type MesuresMasque = {
  /** Part de l'image occupée par la personne (masque > 0,5) */
  surface: number;
  /** Part des pixels incertains (0,15 à 0,85) rapportée à la surface de la personne */
  incertain: number;
  /** Valeur moyenne du masque sur la boîte du visage ; null si aucun visage détecté */
  visage: number | null;
  /** Le masque touche-t-il le bord bas (buste coupé par le cadre : normal pour un portrait) */
  basTouche: boolean;
};

/** Score de confiance du détourage (0 à 1) ; sous SEUIL_DETOURAGE, le studio propose le fond flouté ou l'original amélioré. */
export function scoreDetourage(m: MesuresMasque): number {
  if (!Number.isFinite(m.surface) || m.surface < 0.03 || m.surface > 0.95) return 0;
  let s = 1;
  // Personne trop petite ou trop grande dans l'image
  if (m.surface < 0.08) s -= 0.35;
  if (m.surface > 0.85) s -= 0.3;
  // Bords flous ou masque « nuageux »
  s -= borne((m.incertain - 0.08) * 2.2, 0, 0.6);
  // Le visage détecté doit être bien dans la silhouette
  if (m.visage !== null) s -= borne((0.85 - m.visage) * 2, 0, 0.7);
  // Un portrait sans buste coupé en bas est inhabituel (personne flottante, objet détouré)
  if (!m.basTouche) s -= 0.15;
  return Math.round(borne(s, 0, 1) * 100) / 100;
}
export const SEUIL_DETOURAGE = 0.55;

// ———————————————————————————————————————————————————— Données enregistrées (brouillon) et rendu sur les sites

export type RenduImage = { l: number; h: number; url: string };
export type RendusPortrait = {
  portrait: RenduImage[];
  carre: RenduImage[];
  /** Fond remplacé par le studio (aplat, dégradé, cercle, duotone) : le portrait se fond dans un aplat (présentation « detoure ») */
  detoure?: boolean;
};

/** Portrait composé par le studio (praticiens[].portrait du brouillon) */
export type PortraitStudio = {
  v: 1;
  /** Photo d'origine orientée et réduite, sans métadonnées (base des recompositions) */
  source: string;
  /** Photo détourée avec transparence (couleurs du bord nettoyées) ; '' si pas de détourage */
  detouree: string;
  style: StylePortrait;
  ombre: boolean;
  /** Réglages de la retouche automatique (appliqués à la source et à la photo détourée) ; null = sans retouche */
  retouche: Retouche | null;
  ancre: Ancre;
  reglage: Reglage;
  /** Clé des couleurs au moment du rendu (palettePortrait().cle) */
  couleurs: string;
  rendus: RendusPortrait;
};

/** Le portrait doit-il être recomposé (couleurs du site changées et style qui les utilise) ? */
export function portraitARecomposer(p: PortraitStudio | undefined | null, theme: { couleur: string; gamme?: string | null }): boolean {
  if (!p) return false;
  const def = STYLES_PORTRAIT.find((s) => s.id === p.style);
  return Boolean(def?.couleurs) && p.couleurs !== palettePortrait(theme).cle;
}

const STYLES_IDS = STYLES_PORTRAIT.map((s) => s.id);

function nettoyerRendus(v: unknown, urlValide: (u: string) => boolean): RenduImage[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 6)
    .map((r) => ({ l: Math.round(fini(r?.l, 0)), h: Math.round(fini(r?.h, 0)), url: typeof r?.url === 'string' ? r.url.slice(0, 400) : '' }))
    .filter((r) => r.l >= 16 && r.l <= 4000 && r.h >= 16 && r.h <= 5000 && urlValide(r.url))
    .sort((a, b) => a.l - b.l);
}

/**
 * Nettoyage côté serveur de praticiens[].portrait : URLs du stockage seulement (`urlValide`), nombres bornés, style connu.
 * Le portrait n'est gardé que si la photo du praticien est l'un de ses rendus (sinon la photo a été remplacée ou retirée
 * par un autre chemin : le portrait est périmé).
 */
export function nettoyerPortrait(v: unknown, photo: string, urlValide: (u: string) => boolean): PortraitStudio | undefined {
  if (!v || typeof v !== 'object' || !photo) return undefined;
  const p = v as Record<string, any>;
  const rendus = { portrait: nettoyerRendus(p.rendus?.portrait, urlValide), carre: nettoyerRendus(p.rendus?.carre, urlValide) };
  if (![...rendus.portrait, ...rendus.carre].some((r) => r.url === photo)) return undefined;
  const source = typeof p.source === 'string' && urlValide(p.source) ? p.source : '';
  const detouree = typeof p.detouree === 'string' && urlValide(p.detouree) ? p.detouree : '';
  const style: StylePortrait = STYLES_IDS.includes(p.style) ? p.style : 'original';
  return {
    v: 1,
    source,
    detouree,
    style: styleDetoure(style) && !detouree ? 'original' : style,
    ombre: p.ombre === true,
    retouche: nettoyerRetouche(p.retouche),
    ancre: { cx: borne(fini(p.ancre?.cx, 0.5), 0, 1), cy: borne(fini(p.ancre?.cy, 0.36), 0, 1), t: borne(fini(p.ancre?.t, 0.2), 0.02, 1) },
    reglage: { zoom: borne(fini(p.reglage?.zoom, 1), ZOOM_MIN, ZOOM_MAX), dx: borne(fini(p.reglage?.dx, 0), -2, 2), dy: borne(fini(p.reglage?.dy, 0), -2, 2) },
    couleurs: typeof p.couleurs === 'string' ? p.couleurs.slice(0, 40) : '',
    rendus,
  };
}

function nettoyerRetouche(v: any): Retouche | null {
  if (!v || typeof v !== 'object') return null;
  const gains = Array.isArray(v.gains) && v.gains.length === 3 ? v.gains.map((g: unknown) => borne(fini(g, 1), 0.7, 1.4)) : [1, 1, 1];
  const noir = Math.round(borne(fini(v.noir, 0), 0, 80));
  return {
    gains: gains as [number, number, number],
    noir,
    blanc: Math.round(borne(fini(v.blanc, 255), noir + 32, 255)),
    gamma: borne(fini(v.gamma, 1), 0.5, 2),
    contraste: borne(fini(v.contraste, 0), 0, 0.5),
    saturation: borne(fini(v.saturation, 1), 0.8, 1.2),
  };
}

/** Rendus à afficher sur le site, seulement s'ils correspondent à la photo du praticien (sinon : photo simple). */
export function rendusPortrait(p: { photo: string; portrait?: PortraitStudio | null }): RendusPortrait | null {
  const r = p.portrait?.rendus;
  if (!p.photo || !r || !Array.isArray(r.portrait) || !Array.isArray(r.carre)) return null;
  if (![...r.portrait, ...r.carre].some((x) => x?.url === p.photo)) return null;
  return r.portrait.length || r.carre.length ? { portrait: r.portrait, carre: r.carre, ...(styleDetoure(p.portrait!.style) ? { detoure: true } : {}) } : null;
}

/** Attribut srcset (largeurs croissantes) */
export const srcsetPortrait = (rendus: RenduImage[]) => [...rendus].sort((a, b) => a.l - b.l).map((r) => `${r.url} ${r.l}w`).join(', ');

/** Rendu de secours (src) : le plus petit d'au moins `largeur` pixels, sinon le plus grand */
export function renduPour(rendus: RenduImage[], largeur: number): RenduImage | undefined {
  const tries = [...rendus].sort((a, b) => a.l - b.l);
  return tries.find((r) => r.l >= largeur) ?? tries[tries.length - 1];
}

/** Texte alternatif d'un portrait : « Portrait de Camille Rousseau, pédicure-podologue » */
export const altPortrait = (prenom: string, nom: string, titre: string) =>
  `Portrait de ${[prenom, nom].map((x) => x.trim()).filter(Boolean).join(' ')}${titre ? `, ${titre.trim().toLowerCase()}` : ''}`;
