// Studio de recettes (/admin/atelier/studio, super admin ; demande de Paul du 2026-10-07, niveau 3 de docs/ingredients-recettes.md).
//
// Une RECETTE = une composition complète de site, en identifiants seulement (rien n'est dessiné ni écrit ici) :
//   structure (4 modèles du parcours) × couleurs (gamme ou couleur libre dérivée, AA) × paire de polices (PAIRES_POLICES) ×
//   visuels (style d'illustration, sujet du héros, animation) × photos (banque : jeux de photos, photos libres importées,
//   photos intégrées) × composition des sections (ordre de l'accueil, variantes) × jeu d'effets (effets.ts).
// Le studio lance des « dés » dimension par dimension (avec verrous et retour en arrière) ; chaque tirage est DÉTERMINISTE
// (graine) et pondéré par les notes (atelier-poids.ts, assets-poids.ts). Les garde-fous passent toujours avant le hasard :
// contrastes AA (couleursGabarit, couleur libre vérifiée), diabète sans rouge vif (gammes exclues, couleur libre hors rouges,
// jamais de relevé ni de structure Technique), posture jamais (sujets différés ignorés, photos « posture » exclues), styles
// compatibles avec la structure, illustrations sans texte (héros composés sans <text>, heros-themes.ts).
// Le site publié reproduit la recette : appliquerRecette pose sur le thème du brouillon la paire de polices, l'ordre et les
// variantes des sections, le héros, les photos et les effets ; modeleDuSite (catalogue-univers.ts) les applique au rendu.
// Module pur.

import { animationPour, gammesDesCouleurs, LIBELLES_STRUCTURES, LIBELLES_STYLES, REGLES_THEMES, STRUCTURES, stylesCompatibles, reglageStyle, appliquerReglages, type Proposition, type StyleIllustration, type Structure } from './propositions';
import { GAMMES, gamme as gammeParId } from './gammes';
import { gabaritModele, modeleIntegre, PAIRES_POLICES, pairePolices, paireDuModele, VARIANTES_SECTIONS, variantesModele, varianteSujets, varianteTheme, varianteArticle, type IdPairePolices, type ModeleManifeste, type SectionAccueil, type Variantes, type Gabarit } from './modeles';
import { modeleDuSite, universCatalogue } from './catalogue-univers';
import { appliquerUniversParcours } from './parcours';
import { verifierCouleursGabarit, ajusterContraste } from './gabarits';
import { contraste, hex, rvb } from './couleurs';
import { NEUTRES } from './charte';
import { themeParId } from './themes';
import { themeIllustre } from './heros-themes';
import { estPremierEcranAnime, estPremierEcranPhoto, PREMIERS_ECRANS_NOUVEAUX, LIBELLES_PREMIERS_ECRANS, LIBELLES_TRANSITIONS_DIAPORAMA, LIBELLES_TRANSITIONS_SECTIONS, PHOTOS_DEMO_HEROS } from './heros-photo-variantes';
import { JEUX_EFFETS, jeuEffets, type IdJeuEffets } from './effets';
import { tirerDimensionHarmonieuse, toutChangerHarmonieux, type OutilsTirage, type PoidsHarmonie } from './harmonie';
import { FORMES_CARTES } from './formes';
import { PHOTOS_INTEGREES } from './jeux-photos';
import { clePhoto, retireDesSujets, scoreAsset, scoreAssetPourSujet, type PoidsAssets, type SurchargesSujets } from './assets-poids';
import { estSujetDeVisuel, sujetsEffectifs } from './sujets-visuels';
import { urlImageAutorisee, type SourcePhotoLibre } from './photos-libres';
import type { HashtagsAssets } from './hashtags';
import { clesAtelier, type PoidsAtelier } from './atelier-poids';
import { FACTEUR_DEFAUT_MOBILE, appareilDe, poidsAppareil, type AppareilRetour } from './rendu-mobile';
import type { Animation } from './packs';
import { estHabillageParDefaut, normaliserHabillage, tirerHabillage, clesAtelierHabillage, clesNotablesHabillage, libellesHabillage, verrouAxe, type AxeHabillage, type Habillage } from './habillage';
import { AXES_TYPO, policePermise, estCleTypo, libelleCleTypo, typoPourCle, type AxeTypo, type ReglagesTypo } from './typo';
import { estCleDetails, libelleCleDetails, detailsPourCle, type ReglagesDetails } from './details';
import { AXES_MENU, estCleMenu, libelleCleMenu, menuPourCle, type AxeMenu, type ReglagesMenu } from './menus';
import { cleTraitementPhotos, libelleTraitementPhotos, lireCleTraitementPhotos, normaliserTraitementPhotos, traitementNeutre, TRAITEMENTS_PHOTOS, TRAITEMENT_PHOTOS_DEFAUT, type TraitementPhotos } from './traitements-photos';
import { niveauProximite, normaliserScenario, proximiteScenarios, RANG_PROXIMITE, scenarioDeRecette, type ScenarioRecette } from './simulateur';
import type { SiteDraft } from './draft';
import type { Univers } from './catalogue-univers';

// ---------------------------------------------------------------------------------------------------------------
// Dimensions, ordres de l'accueil
// ---------------------------------------------------------------------------------------------------------------

/** Dimensions du studio, avec leur raccourci clavier (espace = tout changer) */
export const DIMENSIONS_RECETTE = [
  { id: 'couleurs', nom: 'Couleurs', touche: 'c' },
  { id: 'polices', nom: 'Polices', touche: 'p' },
  { id: 'visuels', nom: 'Style des illustrations', touche: 'v' },
  { id: 'photos', nom: 'Photos', touche: 'f' },
  { id: 'structure', nom: 'Structure', touche: 's' },
  { id: 'effets', nom: 'Effets', touche: 'e' },
  { id: 'traitement', nom: 'Traitement des photos', touche: 't' },
  // Habillage (habillage.ts) : panneau « Typographie & détails »
  { id: 'typo', nom: 'Typographie', touche: 'y' },
  { id: 'details', nom: 'Jeu de détails', touche: 'd' },
  { id: 'menu', nom: 'Menu', touche: 'm' },
] as const;
export type DimensionRecette = (typeof DIMENSIONS_RECETTE)[number]['id'];
export const estDimensionRecette = (x: unknown): x is DimensionRecette => DIMENSIONS_RECETTE.some((d) => d.id === x);

/**
 * Ordres de l'accueil (permutations des sections du modèle : même contenu, mêmes H2 au même niveau, SEO identique).
 * « infos-haut » : « Venir au cabinet » (horaires, adresse) juste sous le premier écran, avant même les sujets.
 */
export const ORDRES_ACCUEIL = [
  { id: 'modele', nom: 'Ordre du modèle' },
  { id: 'infos-haut', nom: 'Horaires et accès sous le premier écran' },
  { id: 'soins-puis-infos', nom: 'Soins puis horaires' },
  { id: 'equipe-haut', nom: 'Équipe en premier' },
  { id: 'questions-haut', nom: 'Questions juste après les soins' },
] as const;
export type OrdreAccueil = (typeof ORDRES_ACCUEIL)[number]['id'];
export const ordreAccueil = (id: unknown) => ORDRES_ACCUEIL.find((o) => o.id === id);

/** Sections de l'accueil selon un ordre (permutation de `base`) et « Venir au cabinet » en tête */
export function sectionsSelonOrdre(base: readonly SectionAccueil[], ordre: OrdreAccueil): { sections: SectionAccueil[]; infosEnTete: boolean } {
  const l = [...base];
  const deplacer = (s: SectionAccueil, i: number) => { const k = l.indexOf(s); if (k < 0) return; l.splice(k, 1); l.splice(Math.min(i, l.length), 0, s); };
  switch (ordre) {
    case 'infos-haut': deplacer('acces', 0); return { sections: l, infosEnTete: l.includes('acces') };
    case 'soins-puis-infos': deplacer('competences', 0); deplacer('acces', 1); break;
    case 'equipe-haut': deplacer('praticiens', 0); break;
    case 'questions-haut': deplacer('faq', l.indexOf('competences') + 1); break;
  }
  return { sections: l, infosEnTete: false };
}

/** Sections dont le studio tire la variante, selon le gabarit (classique : la présentation des sujets seulement) */
export const sectionsVariables = (g: Gabarit): (keyof Variantes)[] =>
  g === 'classique' ? ['accueil', 'transition', 'sujets', 'soins-forme', 'theme', 'article', 'sections'] : ['accueil', 'transition', 'soins', 'soins-forme', 'sujets', 'horaires', 'praticiens', 'infos', 'faq', 'galerie', 'contact', 'fiche', 'actualites', 'pied', 'theme', 'article', 'sections'];

/**
 * Valeurs qu'un dé peut tirer pour une section (premier écran : les variantes à photos seulement avec des photos, style
 * « Photos » ; classique : le premier écran du modèle, '' , ou l'un des nouveaux premiers écrans de heros-photo.ts).
 */
export function valeursTirables(s: keyof Variantes, g: Gabarit, avecPhotos: boolean): string[] {
  const toutes = VARIANTES_SECTIONS[s] as readonly string[];
  if (s !== 'accueil') return [...toutes];
  const base = g === 'classique' ? ['', ...PREMIERS_ECRANS_NOUVEAUX] : [...toutes];
  return base.filter((v) => avecPhotos || !estPremierEcranPhoto(v));
}

/**
 * Structures de PAGES (demande de Paul du 2026-10-07) : chaque type de page regroupe les sections et éléments qui le composent ;
 * le studio a un dé par type de page, et chaque structure est notable (clé `structure:<page>:<variantes>`). Les variantes sont
 * celles du site (partagées entre pages) : une page reprend la présentation de ses éléments, jamais un autre contenu.
 * Pages sujet (`theme`) et articles (`article`) : variantes propres depuis le 2026-10-07 (même balisage, feuille de style seule).
 */
export const PAGES_STRUCTURE = [
  { id: 'accueil', nom: 'Accueil', sections: ['accueil', 'sujets'] as (keyof Variantes)[], ordre: true },
  { id: 'soins', nom: 'Soins (accueil, liste et fiches)', sections: ['soins', 'soins-forme'] as (keyof Variantes)[], ordre: false },
  { id: 'acces', nom: 'Contact et accès', sections: ['infos', 'horaires', 'contact'] as (keyof Variantes)[], ordre: false },
  { id: 'cabinet', nom: 'Le cabinet', sections: ['praticiens', 'galerie'] as (keyof Variantes)[], ordre: false },
  { id: 'questions', nom: 'Questions fréquentes', sections: ['faq'] as (keyof Variantes)[], ordre: false },
  { id: 'fiche', nom: 'Fiche d’un soin', sections: ['fiche'] as (keyof Variantes)[], ordre: false },
  { id: 'actualites', nom: 'Actualités', sections: ['actualites'] as (keyof Variantes)[], ordre: false },
  { id: 'theme', nom: 'Page sujet', sections: ['theme'] as (keyof Variantes)[], ordre: false },
  { id: 'article', nom: 'Article de blog', sections: ['article'] as (keyof Variantes)[], ordre: false },
] as const;
export type PageStructure = (typeof PAGES_STRUCTURE)[number]['id'];
export const estPageStructure = (x: unknown): x is PageStructure => PAGES_STRUCTURE.some((p) => p.id === x);

/**
 * Onglets du studio (demande de Paul du 2026-10-07 : « le lock / la note PAR PAGE ») : chaque type de page a son aperçu, son dé
 * de structure, son verrou et sa note. `vue` : page montrée par l'aperçu (ApercuTheme).
 */
export type VuePage = 'accueil' | 'soin' | 'theme' | 'article' | 'actualites' | 'cabinet' | 'acces' | 'questions' | 'soins';
export const ONGLETS_PAGES: readonly { page: PageStructure; nom: string; vue: VuePage }[] = [
  { page: 'accueil', nom: 'Accueil', vue: 'accueil' },
  { page: 'theme', nom: 'Page sujet', vue: 'theme' },
  { page: 'fiche', nom: 'Fiche soin', vue: 'soin' },
  { page: 'article', nom: 'Article de blog', vue: 'article' },
  { page: 'actualites', nom: 'Actualités', vue: 'actualites' },
  { page: 'cabinet', nom: 'Cabinet', vue: 'cabinet' },
  { page: 'acces', nom: 'Contact et accès', vue: 'acces' },
  { page: 'questions', nom: 'Questions', vue: 'questions' },
  { page: 'soins', nom: 'Soins', vue: 'soins' },
];
export const vueDePage = (p: PageStructure): VuePage => ONGLETS_PAGES.find((o) => o.page === p)?.vue ?? 'accueil';

/** Familles d'éléments notables (composants) : présentation de chaque élément, clé `composant:<famille>:<variante>` */
export const FAMILLES_COMPOSANTS: (keyof Variantes)[] = ['horaires', 'infos', 'galerie', 'contact', 'soins-forme', 'praticiens', 'faq', 'soins', 'sujets', 'accueil', 'transition', 'sections', 'pied', 'actualites', 'theme', 'article'];

/** Libellés des variantes (studio) */
export const LIBELLES_VARIANTES: Record<string, Record<string, string>> = {
  accueil: { carte: 'Carte et disque', notice: 'Notice tramée', figure: 'Figure de revue', ...LIBELLES_PREMIERS_ECRANS },
  transition: { ...LIBELLES_TRANSITIONS_DIAPORAMA },
  sections: { ...LIBELLES_TRANSITIONS_SECTIONS },
  soins: { bulles: 'Cartes illustrées', grille: 'Rangées larges', filets: 'Bulles à filet' },
  sujets: { une: 'Le premier à la une', rangees: 'Grandes rangées illustrées', cartes: 'Cartes égales', liste: 'Liste éditoriale', colonnes: 'Deux colonnes' },
  horaires: { tableau: 'Tableau compact', bandeau: 'Bandeau', carte: 'Carte encadrée', liste: 'Liste, jour courant en évidence' },
  praticiens: { cartes: 'Cartes', fiches: 'Fiches', liste: 'Liste' },
  infos: { volets: 'Adresse et itinéraire', notice: 'Notice et plan', colonnes: 'Horaires | adresse et plan' },
  faq: { accordeon: 'Accordéon', colonnes: 'Deux colonnes', ouverte: 'Liste ouverte' },
  galerie: { mosaique: 'Mosaïque', defilement: 'Diaporama au doigt', grande: 'Grande photo et vignettes', bande: 'Bande de quatre photos' },
  pied: { simple: 'Trois colonnes', centre: 'Centré, liens en ligne', large: 'Nom du cabinet en grand' },
  fiche: { encadre: 'Texte et encadré « En pratique » à côté', colonne: 'Une colonne, encadré sous le texte', 'pratique-haut': 'Encadré « En pratique » en tête' },
  actualites: { liste: 'Liste de titres datés', cartes: 'Cartes illustrées', une: 'Le dernier à la une' },
  contact: { barre: 'Barre d’actions (téléphone)', bandeau: 'Bandeau « Écrire au cabinet »', carte: 'Carte de contact', flottant: 'Bouton flottant' },
  theme: { liste: 'Titre et visuel côte à côte, liste à filets', rangees: 'Intro et grandes rangées de soins', heros: 'Illustration pleine largeur et liste', colonnes: 'Deux colonnes, conseils à côté' },
  article: { standard: 'Titre, image puis texte', lecture: 'Colonne de lecture centrée, illustration en tête', laterale: 'Illustration à côté du texte', chapo: 'Chapô en grand et sommaire' },
  'soins-forme': Object.fromEntries(FORMES_CARTES.map((f) => [f.id, f.nom])),
};
export const NOMS_SECTIONS_VARIABLES: Record<string, string> = {
  accueil: 'Premier écran', transition: 'Transition du diaporama', sections: 'Transitions entre sections', soins: 'Soins', sujets: 'Sujets', horaires: 'Horaires', praticiens: 'Équipe', infos: 'Plan d’accès', faq: 'Questions', galerie: 'Galerie du cabinet', contact: 'Rendez-vous et contact', pied: 'Pied de page', fiche: 'Fiche d’un soin', actualites: 'Actualités', 'soins-forme': 'Forme des cartes', theme: 'Page sujet', article: 'Article de blog',
};

// ---------------------------------------------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------------------------------------------

export type CompositionRecette = {
  structure: Structure;
  /** Gamme (GAMMES) ; '' = couleur libre (`couleur`) */
  gamme: string;
  /** Couleur du cabinet (#rrggbb) : accent de la gamme, ou couleur libre */
  couleur: string;
  police: IdPairePolices;
  visuels: { style: StyleIllustration; herosSujet: string | null; animation: Animation | null };
  /** Photos tirées de la banque (URL, accueil d'abord) ; vide hors style « photos » */
  photos: string[];
  sections: { ordre: OrdreAccueil; variantes: Partial<Variantes> };
  effets: IdJeuEffets;
  /** Traitement uniforme de toutes les photos du site (traitements-photos.ts) ; absent des anciennes recettes = modèle */
  traitement: TraitementPhotos;
  /**
   * Habillage (2026-10-07, habillage.ts) : typographie (échelle, casse, graisse…), jeu de détails (séparateurs, coins, ombres,
   * boutons…) et menu (ordinateur, téléphone, rendez-vous). Facultatifs : absents des anciennes recettes = rendu du modèle ;
   * reparerComposition les remplit toujours.
   */
  typo?: ReglagesTypo;
  details?: ReglagesDetails;
  menu?: ReglagesMenu;
};

/** Scénario et données du studio (tirages) */
export type ContexteRecette = {
  /** Sujets pris en compte (principaux puis secondaires), dans l'ordre */
  sujets: readonly string[];
  /** Nombre de sujets principaux parmi `sujets` (héros possibles) ; défaut : 3 */
  principaux?: number;
  couleursPreferees?: readonly string[];
  /** Poids appris (atelier + assets), renforts des recettes compris */
  poids?: PoidsAtelier | null;
  /** Photos de la banque disponibles */
  photos?: readonly PhotoBanque[];
  /** Studio seulement : les photos gardées non importées (aperçus Pexels / Pixabay) peuvent être tirées */
  nonImportees?: boolean;
  /**
   * Simulateur du studio (« on RESTE dans ce thème ») : les photos viennent SEULEMENT des sujets du scénario (sujets effectifs et
   * hashtags qui nomment un sujet), jamais des photos « générales ».
   */
  sujetsSeulement?: boolean;
  /** Fiches des modèles (importées par l'admin), sinon intégrées */
  modele?: (id: string) => ModeleManifeste;
  /**
   * Clés dont l'adaptation mobile est à corriger (defauts_mobile, rendu-mobile.ts) : parcours des praticiens seulement. La
   * variante concernée passe après les autres (FACTEUR_DEFAUT_MOBILE), sans être exclue ; le studio de Paul ne la fournit pas.
   */
  defautsMobile?: ReadonlySet<string>;
  /**
   * Harmonie graphique (harmonie.ts) : par défaut, « Tout changer » et chaque dé tirent dans une famille de style et ne proposent
   * que des valeurs compatibles avec le reste. `horsRegles` (« Hors règles (explorer) » du studio) les désactive ; les garde-fous
   * ci-dessus restent toujours actifs. `poidsHarmonie` : poids appris des notes (apprendreHarmonie), sinon dérivés de `poids`.
   */
  horsRegles?: boolean;
  poidsHarmonie?: PoidsHarmonie | null;
};

/** Sujets actifs (posture et sujets différés jamais pris en compte) */
export const sujetsActifs = (l: readonly string[]) => [...new Set(l)].filter((id) => themeParId(id)?.statut === 'actif' && REGLES_THEMES[id]);
const sujetUn = (c: ContexteRecette) => sujetsActifs(c.sujets)[0] ?? 'cabinet';
const avecDiabete = (c: ContexteRecette) => sujetsActifs(c.sujets).includes('diabete');
const modeleDe = (c: ContexteRecette, s: Structure) => { const id = universCatalogue(s)?.preReglage.modele ?? 'tableau'; return c.modele?.(id) ?? modeleIntegre(id); };
const gabaritDe = (c: ContexteRecette, s: Structure) => gabaritModele(modeleDe(c, s));

/** Gammes exclues par l'un des sujets (diabète : ni rouge vif ni rose) */
const gammesExclues = (c: ContexteRecette) => new Set(sujetsActifs(c.sujets).flatMap((id) => REGLES_THEMES[id].exclues ?? []));
/** Structures permises par le sujet n° 1 (et jamais Technique avec le diabète) */
export const structuresPermises = (c: ContexteRecette): Structure[] =>
  STRUCTURES.filter((s) => REGLES_THEMES[sujetUn(c)].structures[s] !== undefined && !(avecDiabete(c) && s === 'technique-precis'));
/** Styles permis : compatibles avec la structure, non exclus par le sujet n° 1, jamais le relevé avec le diabète */
export const stylesPermis = (c: ContexteRecette, s: Structure): StyleIllustration[] =>
  stylesCompatibles(s).filter((x) => REGLES_THEMES[sujetUn(c)].styles[x] !== undefined && !(avecDiabete(c) && x === 'releve'));
/** Sujets dont le héros peut illustrer le premier écran : principaux illustrés */
export const herosPossibles = (c: ContexteRecette): string[] => sujetsActifs(c.sujets).slice(0, c.principaux ?? 3).filter((s) => themeIllustre(s));

// ---------------------------------------------------------------------------------------------------------------
// Hasard déterministe
// ---------------------------------------------------------------------------------------------------------------

function hache(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Générateur pseudo-aléatoire (mulberry32) d'une graine et d'un sel */
export function alea(graine: number, sel = ''): () => number {
  let a = (hache(`${graine}|${sel}`) + 0x6d2b79f5) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Choix pondéré ; `eviter` : la valeur actuelle (un dé change vraiment, s'il y a une autre possibilité) */
function choisir<T>(l: readonly { v: T; p: number }[], r: () => number, eviter?: (v: T) => boolean): T | undefined {
  const c = l.length > 1 && eviter ? l.filter((x) => !eviter(x.v)) : l;
  const total = c.reduce((s, x) => s + Math.max(0, x.p), 0);
  if (!c.length) return undefined;
  if (total <= 0) return c[Math.floor(r() * c.length)].v;
  let x = r() * total;
  for (const e of c) { x -= Math.max(0, e.p); if (x < 0) return e.v; }
  return c[c.length - 1].v;
}
/** Poids d'une clé apprise : 2^effet (atelier, renforts compris), plafonné */
const masse = (effet: number) => 2 ** Math.max(-3, Math.min(2, effet));
const effetAtelier = (c: ContexteRecette, cle: string) => c.poids?.effets[cle] ?? 0;
const effetAsset = (c: ContexteRecette, cle: string, sujet?: string | null) => scoreAssetPourSujet(cle, sujet, c.poids?.assets);

// ---------------------------------------------------------------------------------------------------------------
// Couleur libre
// ---------------------------------------------------------------------------------------------------------------

function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return hex([f(0), f(8), f(4)]);
}
/** Teinte (0-360) et saturation (0-1) d'une couleur */
function teinte(c: string): { h: number; s: number } {
  const [r, g, b] = rvb(c).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return { h: 0, s: 0 };
  const l = (max + min) / 2;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s };
}
/** Rouge vif ou rose saturé (interdits avec le diabète) */
export const estRougeVif = (c: string) => { const { h, s } = teinte(c); return s > 0.45 && (h < 22 || h > 330); };

/** Couleur libre utilisable : #rrggbb, AA garanti par le gabarit (ou ≥ 4,5:1 sur blanc en classique), pas de rouge vif avec le diabète */
export function couleurLibreValide(couleur: string, c: ContexteRecette, s: Structure): boolean {
  if (!/^#[0-9a-f]{6}$/i.test(couleur)) return false;
  if (avecDiabete(c) && estRougeVif(couleur)) return false;
  const m = modeleDe(c, s);
  if (gabaritModele(m) === 'classique') return contraste(couleur, NEUTRES.blanc) >= 4.5;
  return verifierCouleursGabarit(m, { couleur, gamme: null }).length === 0;
}

function tirerCouleurLibre(c: ContexteRecette, s: Structure, r: () => number): string | null {
  for (let i = 0; i < 24; i++) {
    let x = hsl(r() * 360, 0.45 + r() * 0.4, 0.28 + r() * 0.3);
    if (gabaritDe(c, s) === 'classique') x = ajusterContraste(x, [NEUTRES.blanc], 4.6);
    if (couleurLibreValide(x, c, s)) return x;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Photos de la banque
// ---------------------------------------------------------------------------------------------------------------

/**
 * Photo disponible pour les tirages : URL, sujets effectifs, origine (jeu de photos, photo libre, photo intégrée).
 * `importee: false` (studio seulement, retour de Paul du 2026-10-07) : photo libre GARDÉE mais pas encore importée (statut
 * « à valider », aperçu servi par Pexels / Pixabay) ; jamais tirée hors du studio (`nonImportees` du contexte), jamais posée
 * sur un site (appliquerRecette, photosImportees). `cle` : clé de l'inventaire (photo:… ; candidate : photo:libre:<source>-<id>) ;
 * `idLibre` : identifiant photos_libres (bouton « Valider et importer »).
 */
export type PhotoBanque = { url: string; sujets: readonly string[]; origine: 'jeu' | 'libre' | 'integree'; importee?: boolean; cle?: string | null; idLibre?: string; source?: SourcePhotoLibre };

/** Aperçu d'une photo libre non importée (https, hôtes d'images de Pexels / Pixabay) */
export const estApercuPhotoLibre = (url: string) => typeof url === 'string' && url.length <= 500 && (urlImageAutorisee('pexels', url) || urlImageAutorisee('pixabay', url));
/** Photo hébergée chez nous (photo intégrée ou stockage « photos ») : seule utilisable sur un site */
export const estPhotoHebergee = (url: string) => Boolean(clePhoto(url));
/** Photos d'une recette utilisables sur un site (importées) */
export const photosImportees = (photos: readonly string[]) => photos.filter(estPhotoHebergee);
/** Photos d'une recette encore à importer (aperçus Pexels / Pixabay) : avertissement du studio, import requis avant tout usage */
export const photosAImporter = (photos: readonly string[]) => photos.filter((u) => !estPhotoHebergee(u));

/** Entrée brute de la banque (jeux, photos libres, photos intégrées) avant sujets effectifs */
export type EntreeBanquePhotos = {
  url: string;
  origine: PhotoBanque['origine'];
  /** Sujets par défaut (sujet de la photo libre, spécialité du jeu, nom de la photo intégrée) */
  sujets: readonly string[];
  importee?: boolean;
  /** Clé de l'inventaire (sinon clePhoto(url)) */
  cle?: string | null;
  idLibre?: string;
  source?: SourcePhotoLibre;
};

/**
 * Banque de photos du studio et de l'atelier : sujets EFFECTIFS de chaque photo = défauts ± sujets ajoutés / retirés par Paul
 * (assets_sujets_effectifs) + hashtags qui nomment un sujet (#sport, #enfant… : assets_hashtags_effectifs). Une photo sans
 * aucun sujet effectif sort de la banque ; une URL présente deux fois n'est gardée qu'une fois (importée d'abord). Pur.
 */
export function banquePhotos(entrees: readonly EntreeBanquePhotos[], opts: { surcharges?: SurchargesSujets | null; hashtags?: HashtagsAssets | null } = {}): PhotoBanque[] {
  const vues = new Map<string, PhotoBanque>();
  for (const e of [...entrees].sort((a, b) => Number(a.importee === false) - Number(b.importee === false))) {
    if (!e.url || vues.has(e.url)) continue;
    const cle = e.cle ?? clePhoto(e.url);
    const tags = (cle ? opts.hashtags?.[cle] ?? [] : []).filter(estSujetDeVisuel);
    const sujets = sujetsEffectifs([...e.sujets, ...tags], cle ? opts.surcharges?.[cle] : null).sujets;
    if (!sujets.length) continue;
    vues.set(e.url, {
      url: e.url, sujets, origine: e.origine, ...(e.importee === false ? { importee: false } : {}), ...(cle ? { cle } : {}),
      ...(e.idLibre ? { idLibre: e.idLibre } : {}), ...(e.source ? { source: e.source } : {}),
    });
  }
  return [...vues.values()];
}

/** Sujets des photos intégrées (nom du fichier) ; « posture » : jamais (sujet différé) */
function sujetsPhotoIntegree(nom: string): string[] {
  if (nom.startsWith('posture')) return [];
  if (nom.startsWith('sport')) return ['sport'];
  if (nom.startsWith('enfant')) return ['enfant'];
  if (nom === 'analyse-plateforme') return ['semelles', 'sport'];
  if (nom === 'chaussage') return ['senior', 'semelles'];
  if (nom === 'examen-mains') return ['pedicurie', 'diabete'];
  if (nom.startsWith('soin')) return ['pedicurie', 'diabete', 'senior'];
  return ['general'];
}
/** Photos intégrées (apps/sites/public/photos), avec leurs sujets */
export const photosIntegreesBanque = (): PhotoBanque[] =>
  PHOTOS_INTEGREES.map((url) => ({ url, sujets: sujetsPhotoIntegree(url.slice(8, -5)), origine: 'integree' as const })).filter((p) => p.sujets.length);

/**
 * Photos compatibles avec les sujets : un sujet du scénario (ou « général »), jamais posture, jamais une photo « retirée »
 * ou retirée par Paul de tous les sujets du scénario ; masse = 2^score (notes), sujet n° 1 favorisé.
 */
export function photosCompatibles(pool: readonly PhotoBanque[], c: ContexteRecette): { p: PhotoBanque; masse: number }[] {
  const sujets = sujetsActifs(c.sujets);
  const a = c.poids?.assets;
  const cle = (p: PhotoBanque) => p.cle ?? clePhoto(p.url);
  return pool
    // Photos non importées : studio seulement (case « photos gardées non importées »)
    .filter((p) => p.importee !== false || c.nonImportees === true)
    .filter((p) => !p.sujets.includes('posture') && !/posture/.test(p.url) && p.sujets.some((s) => (s === 'general' && !c.sujetsSeulement) || sujets.includes(s)))
    .filter((p) => { const k = cle(p); return !k || !(a?.statuts[k] === 'retire' || retireDesSujets(k, sujets.length ? sujets : ['general'], a)); })
    .map((p) => { const k = cle(p); return { p, masse: masse(k ? scoreAssetPourSujet(k, sujets[0], a) : 0) * (sujets[0] && p.sujets.includes(sujets[0]) ? 2 : 1) }; });
}

/**
 * Photos disponibles pour le scénario (studio : compteur, message si zéro), meilleures d'abord : `importees` (tout ce qu'un
 * site peut recevoir, photos intégrées et « général » comprises), `bibliotheque` (photos importées de la banque — jeux, photos
 * libres — rattachées à l'un des sujets du scénario, hors « général » seul : zéro → « importez-en depuis /admin/photos »),
 * `nonImportees` (gardées, à valider et importer).
 */
export function photosDuScenario(c: ContexteRecette): { importees: PhotoBanque[]; bibliotheque: PhotoBanque[]; nonImportees: PhotoBanque[] } {
  const l = photosCompatibles(c.photos ?? photosIntegreesBanque(), { ...c, nonImportees: true }).sort((x, y) => y.masse - x.masse);
  const sujets = sujetsActifs(c.sujets);
  const importees = l.filter((x) => x.p.importee !== false).map((x) => x.p);
  return {
    importees,
    bibliotheque: importees.filter((p) => p.origine !== 'integree' && p.sujets.some((s) => sujets.includes(s))),
    nonImportees: l.filter((x) => x.p.importee === false).map((x) => x.p),
  };
}

/** Tirage de `n` photos sans remise (accueil d'abord), pondéré ; déterministe pour une graine */
export function tirerPhotos(c: ContexteRecette, r: () => number, n = 5, eviter: readonly string[] = []): string[] {
  const l = photosCompatibles(c.photos ?? photosIntegreesBanque(), c);
  const res: string[] = [];
  let reste = l.filter((x) => !eviter.includes(x.p.url) || l.length <= n);
  while (res.length < n && reste.length) {
    const v = choisir(reste.map((x) => ({ v: x.p.url, p: x.masse })), r)!;
    res.push(v);
    reste = reste.filter((x) => x.p.url !== v);
  }
  return res;
}

// ---------------------------------------------------------------------------------------------------------------
// Tirages
// ---------------------------------------------------------------------------------------------------------------

function tirerCouleurs(x: CompositionRecette, c: ContexteRecette, r: () => number): Pick<CompositionRecette, 'gamme' | 'couleur'> {
  const exclues = gammesExclues(c);
  const preferees = gammesDesCouleurs({ priorites: { principaux: sujetsActifs(c.sujets), secondaires: [] }, couleursPreferees: c.couleursPreferees ?? [] });
  const dusujet = REGLES_THEMES[sujetUn(c)].gammes;
  const options = GAMMES.filter((g) => !exclues.has(g.id) && !(avecDiabete(c) && estRougeVif(g.accent)))
    .map((g) => ({ v: g.id, p: (preferees.includes(g.id) ? 3 : dusujet.includes(g.id) ? 1.6 : 1) * masse(effetAsset(c, `gamme:${g.id}`) + effetAtelier(c, `gamme=${g.id}`)) }));
  // Une fois sur cinq environ : couleur libre dérivée (AA vérifié), sauf si une couleur préférée est choisie
  if (r() < (preferees.length ? 0.1 : 0.2)) {
    const libre = tirerCouleurLibre(c, x.structure, r);
    if (libre) return { gamme: '', couleur: libre };
  }
  const id = choisir(options, r, (v) => v === x.gamme) ?? x.gamme;
  return { gamme: id, couleur: gammeParId(id)?.accent ?? x.couleur };
}

function tirerPolices(x: CompositionRecette, c: ContexteRecette, r: () => number): IdPairePolices {
  // Budget polices : paires permises par le gabarit (revue : italique des titres compris, typo.ts policePermise)
  const g = gabaritDe(c, x.structure);
  return choisir(PAIRES_POLICES.filter((p) => policePermise(p.id, g)).map((p) => ({ v: p.id, p: masse(effetAtelier(c, `police=${p.id}`)) })), r, (v) => v === x.police) ?? x.police;
}

function tirerVisuels(x: CompositionRecette, c: ContexteRecette, r: () => number): CompositionRecette['visuels'] {
  const r1 = REGLES_THEMES[sujetUn(c)];
  const styles = stylesPermis(c, x.structure);
  const style = choisir(styles.map((s) => ({ v: s, p: (r1.styles[s] ?? 1) * masse(effetAtelier(c, `style=${s}`)) })), r, (v) => v === x.visuels.style) ?? styles[0];
  const { registre } = reglageStyle(style, x.structure);
  const heros = herosPossibles(c);
  const herosSujet = heros.length ? choisir(heros.map((h, i) => ({ v: h, p: (i === 0 ? 2.5 : 1) * masse(effetAsset(c, `heros:${h}:${registre}`, h)) })), r) ?? heros[0] : null;
  return { style, herosSujet, animation: animationDe(c, x.structure, style) };
}
const animationDe = (c: ContexteRecette, s: Structure, style: StyleIllustration) =>
  animationPour({ priorites: { principaux: sujetsActifs(c.sujets), secondaires: [] } }, s, style);

/**
 * Animations d'accueil permises (dé « Animation d'accueil » du studio) : structure Technique en relevé seulement ; celle du sujet n° 1,
 * celles des sujets principaux et leurs voisines (REGLES_THEMES), le podoscope ; jamais la trajectoire (posture).
 */
export function animationsPermises(c: ContexteRecette, s: Structure, style: StyleIllustration): Animation[] {
  if (s !== 'technique-precis' || style !== 'releve') return [];
  const ids = sujetsActifs(c.sujets).slice(0, c.principaux ?? 3);
  const l = [animationDe(c, s, style), ...ids.flatMap((id) => [REGLES_THEMES[id]?.animation ?? null, ...(REGLES_THEMES[id]?.animationsVoisines ?? [])]), 'podoscope' as Animation];
  return [...new Set(l.filter((a): a is Animation => Boolean(a)))].filter((a) => a !== 'trajectoire');
}

/** Dé de l'animation d'accueil : une autre animation permise (pondérée par les notes de sa clé), déterministe ; sinon inchangé */
export function tirerAnimation(x: CompositionRecette, c: ContexteRecette, graine: number): CompositionRecette {
  const l = animationsPermises(c, x.structure, x.visuels.style);
  if (l.length < 2) return x;
  const a = choisir(l.map((v) => ({ v, p: masse(effetAsset(c, `animation:${v}`)) })), alea(graine, 'animation'), (v) => v === x.visuels.animation) ?? x.visuels.animation;
  return { ...x, visuels: { ...x.visuels, animation: a } };
}
/**
 * Styles d'illustration du sélecteur du studio (retour de Paul du 2026-10-07 : « la possibilité de changer le style des
 * illustrations ») : un style vaut pour tout le site (héros, illustrations des soins, pages sujet, fiches, articles).
 */
export const STYLES_STUDIO: readonly { id: StyleIllustration; nom: string; detail: string }[] = [
  { id: 'releve', nom: 'Relevé', detail: 'points de pression' },
  { id: 'pedagogique', nom: 'Illustrations douces', detail: 'schémas pédagogiques' },
  { id: 'ligne', nom: 'Trait fin', detail: 'dessin au trait' },
  { id: 'photos', nom: 'Photos', detail: 'photos de la banque' },
];

/** Chaque style du sélecteur : permis ou non pour ce scénario et cette structure, avec la raison affichée quand il est grisé */
export function stylesDuStudio(c: ContexteRecette, structure: Structure): { id: StyleIllustration; nom: string; detail: string; permis: boolean; raison: string | null }[] {
  const s1 = sujetUn(c);
  const compatibles = stylesCompatibles(structure);
  const nom = (id: StyleIllustration) => STYLES_STUDIO.find((x) => x.id === id)?.nom ?? id;
  return STYLES_STUDIO.map((st) => {
    const raison = !compatibles.includes(st.id)
      ? `Structure « ${LIBELLES_STRUCTURES[structure]} » : ${compatibles.map(nom).join(' ou ')} seulement.`
      : avecDiabete(c) && st.id === 'releve'
        ? 'Diabète : jamais le relevé (points de pression).'
        : REGLES_THEMES[s1].styles[st.id] === undefined
          ? `Exclu pour le sujet « ${themeParId(s1)?.court ?? s1} ».`
          : null;
    return { ...st, permis: !raison, raison };
  });
}

/**
 * Style choisi directement (bouton du studio) : seulement s'il est permis (sinon la composition est rendue telle quelle),
 * animation qui en découle ; passage au style « Photos » : la recette reçoit aussitôt ses photos. Les verrous ne bloquent
 * pas un choix explicite (ils protègent des dés).
 */
export function choisirStyle(x: CompositionRecette, style: StyleIllustration, c: ContexteRecette, graine = 0): CompositionRecette {
  if (!stylesPermis(c, x.structure).includes(style)) return x;
  let y = reparerComposition({ ...x, visuels: { ...x.visuels, style } }, c);
  if (y.visuels.style === 'photos' && !y.photos.length) y = { ...y, photos: tirerPhotos(c, alea(graine, 'photos+')) };
  return y;
}

function tirerStructure(x: CompositionRecette, c: ContexteRecette, r: () => number, changerModele = true, garder: readonly string[] = []): Pick<CompositionRecette, 'structure' | 'sections'> {
  const permises = structuresPermises(c);
  const structure = changerModele ? choisir(permises.map((s) => ({ v: s, p: (REGLES_THEMES[sujetUn(c)].structures[s] ?? 1) * masse(effetAsset(c, `modele:${s}`) + effetAtelier(c, `structure=${s}`)) })), r, (v) => v === x.structure) ?? x.structure : x.structure;
  const g = gabaritDe(c, structure);
  const ordre = garder.includes('page:accueil') ? x.sections.ordre : choisir(ORDRES_ACCUEIL.map((o) => ({ v: o.id, p: (o.id === 'modele' ? 1.5 : 1) * masse(effetAtelier(c, `ordre=${o.id}`)) })), r) ?? 'modele';
  const variantes: Partial<Variantes> = {};
  // Éléments verrouillés (`composant:<famille>`) ou pages verrouillées (`page:<id>`) : variante gardée si le gabarit la permet
  const fige = (s: keyof Variantes) => garder.includes(`composant:${s}`) || PAGES_STRUCTURE.some((p) => garder.includes(`page:${p.id}`) && (p.sections as readonly string[]).includes(s));
  for (const s of sectionsVariables(g)) {
    const possibles = VARIANTES_SECTIONS[s] as readonly string[];
    const actuelle = x.sections.variantes[s] as string | undefined;
    if (fige(s)) { if (actuelle && possibles.includes(actuelle)) (variantes as Record<string, string>)[s] = actuelle; continue; }
    const mobile = (v: string) => (c.defautsMobile?.has(`composant:${s}:${v}`) ? FACTEUR_DEFAUT_MOBILE : 1);
    // Premier écran : variantes à photos seulement en style « Photos » ; classique : '' = premier écran du modèle
    const tirables = valeursTirables(s, g, x.visuels.style === 'photos');
    const v = choisir(tirables.map((v) => ({ v, p: (v === '' ? 2 : 1) * mobile(v) * masse(v === '' ? 0 : effetAtelier(c, `variante=${s}:${v}`) + effetAsset(c, `composant:${s}:${v}`)) })), r)!;
    if (v) (variantes as Record<string, string>)[s] = v;
  }
  return { structure, sections: { ordre, variantes } };
}

function tirerEffets(x: CompositionRecette, c: ContexteRecette, r: () => number): IdJeuEffets {
  return choisir(JEUX_EFFETS.map((j) => ({ v: j.id, p: masse(effetAtelier(c, `effets=${j.id}`)) })), r, (v) => v === x.effets) ?? x.effets;
}

/** Traitement des photos : un des jeux (pondéré par les notes de sa clé), grain une fois sur quatre environ */
function tirerTraitement(x: CompositionRecette, c: ContexteRecette, r: () => number): TraitementPhotos {
  const options = TRAITEMENTS_PHOTOS.map((t) => ({ v: t.id, p: masse(effetAsset(c, cleTraitementPhotos({ id: t.id, grain: false }))) }));
  const id = choisir(options, r, (v) => v === x.traitement.id) ?? x.traitement.id;
  return { id, grain: r() < 0.25 };
}
/**
 * Remet une composition dans les garde-fous (après un tirage ou à la relecture) : structure permise, style permis et animation
 * qui en découle, gamme non exclue (sinon la première gamme conseillée du sujet), couleur libre valide, variantes du gabarit,
 * héros parmi les sujets, photos seulement en style « photos ».
 */
export function reparerComposition(x: CompositionRecette, c: ContexteRecette): CompositionRecette {
  const permises = structuresPermises(c);
  const structure = permises.includes(x.structure) ? x.structure : permises[0];
  const styles = stylesPermis(c, structure);
  const style = styles.includes(x.visuels.style) ? x.visuels.style : styles[0];
  const exclues = gammesExclues(c);
  let { gamme, couleur } = x;
  if (gamme) {
    const g = gammeParId(gamme);
    if (!g || exclues.has(g.id) || (avecDiabete(c) && estRougeVif(g.accent))) {
      gamme = REGLES_THEMES[sujetUn(c)].gammes.find((id) => !exclues.has(id)) ?? 'ardoise';
    }
    couleur = gammeParId(gamme)!.accent;
  } else if (!couleurLibreValide(couleur, c, structure)) {
    gamme = REGLES_THEMES[sujetUn(c)].gammes.find((id) => !exclues.has(id)) ?? 'ardoise';
    couleur = gammeParId(gamme)!.accent;
  }
  const g = gabaritDe(c, structure);
  const permisesVar = sectionsVariables(g);
  const variantes = Object.fromEntries(Object.entries(x.sections.variantes).filter(([s, v]) => permisesVar.includes(s as keyof Variantes) && (VARIANTES_SECTIONS[s as keyof Variantes] as readonly string[]).includes(v as string))) as Partial<Variantes>;
  const heros = herosPossibles(c);
  // Premier écran (heros-photo.ts) : à photos seulement en style « Photos » ; classique : nouveaux premiers écrans seulement ;
  // transition du diaporama seulement quand les photos défilent
  if (variantes.accueil && (!valeursTirables('accueil', g, style === 'photos').includes(variantes.accueil))) delete variantes.accueil;
  if (!estPremierEcranAnime(variantes.accueil)) delete variantes.transition;
  else if (!variantes.transition) variantes.transition = 'fondu';
  const herosSujet = x.visuels.herosSujet && heros.includes(x.visuels.herosSujet) ? x.visuels.herosSujet : heros[0] ?? null;
  return {
    structure,
    gamme,
    couleur,
    police: pairePolices(x.police) && policePermise(x.police, g) ? x.police : (paireDuModele(modeleDe(c, structure))?.id ?? 'grotesque'),
    // Animation d'accueil : celle choisie (dé du studio) si elle reste permise, sinon celle du sujet
    visuels: { style, herosSujet, animation: x.visuels.animation && animationsPermises(c, structure, style).includes(x.visuels.animation) ? x.visuels.animation : animationDe(c, structure, style) },
    photos: style === 'photos' ? x.photos.slice(0, 8) : [],
    sections: { ordre: ordreAccueil(x.sections.ordre) ? x.sections.ordre : 'modele', variantes },
    effets: jeuEffets(x.effets) ? x.effets : 'sobre',
    traitement: normaliserTraitementPhotos(x.traitement),
    ...normaliserHabillage(x, g),
  };
}

/** Variantes du modèle (celles du gabarit), restreintes aux sections que le studio fait varier */
const variantesDeDepart = (m: ModeleManifeste): Partial<Variantes> => {
  const v = (variantesModele(m) ?? { sujets: varianteSujets(m), theme: varianteTheme(m), article: varianteArticle(m) }) as Record<string, string>;
  return Object.fromEntries(sectionsVariables(gabaritModele(m)).filter((s) => v[s]).map((s) => [s, v[s]])) as Partial<Variantes>;
};

/** Composition de départ (la plus conseillée pour le sujet n° 1), déterministe */
export function compositionInitiale(c: ContexteRecette, graine = 0): CompositionRecette {
  const r1 = REGLES_THEMES[sujetUn(c)];
  const structure = structuresPermises(c).sort((a, b) => (r1.structures[b] ?? 0) - (r1.structures[a] ?? 0))[0];
  const m = modeleDe(c, structure);
  const base: CompositionRecette = {
    structure, gamme: r1.gammes[0], couleur: gammeParId(r1.gammes[0])?.accent ?? '#2d5bff',
    police: (PAIRES_POLICES.find((p) => p.titres === m.jetons.policeTitres && p.texte === m.jetons.policeTexte)?.id ?? 'grotesque'),
    visuels: { style: stylesPermis(c, structure)[0], herosSujet: herosPossibles(c)[0] ?? null, animation: null },
    photos: [], sections: { ordre: 'modele', variantes: variantesDeDepart(m) }, effets: 'sobre', traitement: { ...TRAITEMENT_PHOTOS_DEFAUT },
  };
  const x = reparerComposition(base, c);
  return x.visuels.style === 'photos' ? { ...x, photos: tirerPhotos(c, alea(graine, 'photos')) } : x;
}

/**
 * Lance le dé d'une dimension (déterministe : même composition, même graine → même résultat). Toujours suivi de
 * reparerComposition : un tirage ne lève jamais un garde-fou.
 */
export function tirerDimension(x: CompositionRecette, dim: DimensionRecette, c: ContexteRecette, graine: number): CompositionRecette {
  // Harmonie (harmonie.ts) : seulement des valeurs compatibles avec le reste, sauf « Hors règles »
  if (!c.horsRegles) return tirerDimensionHarmonieuse(x, dim, c, graine, { ...outilsHarmonie(c), brut: (y, g) => tirerDimension(y, dim, { ...c, horsRegles: true }, g) });
  const r = alea(graine, dim);
  let y: CompositionRecette = x;
  switch (dim) {
    case 'couleurs': y = { ...x, ...tirerCouleurs(x, c, r) }; break;
    case 'polices': y = { ...x, police: tirerPolices(x, c, r) }; break;
    case 'visuels': y = { ...x, visuels: tirerVisuels(x, c, r) }; break;
    case 'photos': y = { ...x, photos: tirerPhotos(c, r, 5, x.photos) }; break;
    case 'structure': y = { ...x, ...tirerStructure(x, c, r) }; break;
    case 'effets': y = { ...x, effets: tirerEffets(x, c, r) }; break;
    case 'traitement': y = { ...x, traitement: tirerTraitement(x, c, r) }; break;
    case 'typo': case 'details': case 'menu': y = tirerHabillageRecette(x, dim, c, graine); break;
  }
  y = reparerComposition(y, c);
  // Passage au style « photos » : la recette reçoit aussitôt ses photos
  if (y.visuels.style === 'photos' && !y.photos.length) y = { ...y, photos: tirerPhotos(c, alea(graine, 'photos+')) };
  return y;
}

/**
 * Dé d'un type de page (accueil : ordre et premier écran, sujets ; accès : plan et horaires…) ou d'une famille d'éléments
 * (`composant` : horaires, galerie…) : le modèle ne change pas, seules ces variantes sont re-tirées.
 */
export function tirerPage(x: CompositionRecette, cible: { page: PageStructure } | { composant: keyof Variantes }, c: ContexteRecette, graine: number): CompositionRecette {
  if (!c.horsRegles) return tirerDimensionHarmonieuse(x, 'page' in cible ? `page:${cible.page}` : `composant:${cible.composant}`, c, graine, { ...outilsHarmonie(c), brut: (y, g) => tirerPage(y, cible, { ...c, horsRegles: true }, g) });
  const touchees: string[] = 'page' in cible ? [...(PAGES_STRUCTURE.find((p) => p.id === cible.page)?.sections ?? [])] : [cible.composant];
  const autres = Object.keys(VARIANTES_SECTIONS).filter((s) => !touchees.includes(s)).map((s) => `composant:${s}`);
  const garder = [...autres, ...('page' in cible && cible.page === 'accueil' ? [] : ['page:accueil'])];
  const r = alea(graine, 'page' in cible ? `page:${cible.page}` : `composant:${cible.composant}`);
  // Un dé change vraiment : quelques essais si le tirage retombe sur la même présentation
  for (let i = 0; i < 8; i++) {
    const y = reparerComposition({ ...x, ...tirerStructure(x, c, r, false, garder) }, c);
    if (JSON.stringify(y.sections) !== JSON.stringify(x.sections)) return y;
  }
  return x;
}

/** Clés notables d'une structure de page, d'un élément, d'un jeu d'effets (assets_notes, types structure / composant / effets) */
export function clesStructure(x: CompositionRecette): string[] {
  const v = x.sections.variantes as Record<string, string>;
  const pages = PAGES_STRUCTURE.map((p) => {
    const parts = [...(p.ordre ? [x.sections.ordre] : []), ...p.sections.map((s) => v[s]).filter(Boolean)];
    return parts.length ? `structure:${p.id}:${parts.join('-')}` : '';
  }).filter(Boolean);
  const composants = Object.entries(v).filter(([s]) => FAMILLES_COMPOSANTS.includes(s as keyof Variantes)).map(([s, k]) => `composant:${s}:${k}`);
  return [...pages, ...composants, `effets:${x.effets}`, cleTraitementPhotos(x.traitement ?? TRAITEMENT_PHOTOS_DEFAUT), ...clesNotablesHabillage(habillageDe(x), x.police)];
}

/** Valeurs d'une clé de structure de page, dans l'ordre de clesStructure (ordre de l'accueil, puis variantes) ; null si inconnue */
export function lireCleStructure(cle: string): { page: PageStructure; ordre: OrdreAccueil | null; variantes: Partial<Variantes> } | null {
  const [type, id, b] = cle.split(':');
  const p = PAGES_STRUCTURE.find((x) => x.id === id);
  if (type !== 'structure' || !p || !b || cle.split(':').length !== 3) return null;
  const axes = [...(p.ordre ? ['ordre'] : []), ...p.sections] as string[];
  const valeurs = (a: string) => [...(a === 'ordre' ? ORDRES_ACCUEIL.map((o) => o.id as string) : (VARIANTES_SECTIONS[a as keyof Variantes] as readonly string[]))].sort((x, y) => y.length - x.length);
  let reste = b;
  let ordre: OrdreAccueil | null = null;
  const variantes: Record<string, string> = {};
  for (const a of axes) {
    const v = valeurs(a).find((x) => reste === x || reste.startsWith(`${x}-`));
    if (!v) return null;
    if (a === 'ordre') ordre = v as OrdreAccueil; else variantes[a] = v;
    reste = reste.slice(v.length + 1);
  }
  return reste ? null : { page: p.id, ordre, variantes: variantes as Partial<Variantes> };
}

/**
 * Composition qui montre un élément noté du studio (Donner mon avis) : la variante de l'élément, la structure de page ou le jeu
 * d'effets de la clé posés sur `x` (le reste inchangé) ; clé inconnue : `x`.
 */
export function compositionPourCle(x: CompositionRecette, cle: string): CompositionRecette {
  const [type, a, b] = cle.split(':');
  const tp = lireCleTraitementPhotos(cle);
  if (tp) return { ...x, traitement: tp };
  if (type === 'effets' && jeuEffets(a)) return { ...x, effets: a as IdJeuEffets };
  // Habillage : la valeur de la clé posée sur l'habillage de `x` (paire de polices pour typo:police:<id>)
  if (estCleTypo(cle)) { const t = typoPourCle(habillageDe(x).typo, cle); return { ...x, typo: t.typo, ...(t.police ? { police: t.police as IdPairePolices } : {}) }; }
  if (estCleDetails(cle)) return { ...x, details: detailsPourCle(habillageDe(x).details, cle) };
  if (estCleMenu(cle)) return { ...x, menu: menuPourCle(habillageDe(x).menu, cle) };
  if (type === 'composant' && (VARIANTES_SECTIONS as Record<string, readonly string[]>)[a]?.includes(b)) {
    // Transition du diaporama : montrée sur le diaporama plein écran (sauf premier écran scindé déjà choisi)
    const accueil = a === 'transition' && !estPremierEcranAnime(x.sections.variantes.accueil) ? { accueil: 'diaporama' as const } : {};
    const y = { ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, ...accueil, [a]: b } } };
    return estPremierEcranPhoto(y.sections.variantes.accueil) ? avecPhotosDemo(y) : y;
  }
  const s = lireCleStructure(cle);
  if (!s) return x;
  const y = { ...x, sections: { ordre: s.ordre ?? x.sections.ordre, variantes: { ...x.sections.variantes, ...s.variantes } } };
  return estPremierEcranPhoto(y.sections.variantes.accueil) ? avecPhotosDemo(y) : y;
}

/** Premier écran à photos montré seul (tuiles de notation) : style « Photos » et photos de démonstration si la recette n'en a pas */
function avecPhotosDemo(x: CompositionRecette): CompositionRecette {
  return x.photos.length ? x : { ...x, visuels: { ...x.visuels, style: 'photos', animation: null }, photos: [...PHOTOS_DEMO_HEROS] };
}

/** Vue de l'aperçu qui montre une clé : la page de sa structure ou de sa variante (fiche d'un soin, page sujet, article), l'accueil sinon */
export function vuePourCle(cle: string): VuePage {
  const [type, a] = cle.split(':');
  if ((type === 'structure' || type === 'composant') && (a === 'fiche' || a === 'theme' || a === 'article')) return vueDePage(a);
  return 'accueil';
}

/** Blocs de l'aperçu qui montrent un élément (ApercuGabarit, `seul`) ; undefined = la page entière (accueil, effets) */
export function blocsPourCle(cle: string): string[] | undefined {
  const [type, a] = cle.split(':');
  if (type === 'composant') {
    const blocs: Record<string, string[]> = {
      accueil: ['premier'], transition: ['premier'], sujets: ['sujets'], soins: ['competences'], 'soins-forme': ['competences', 'sujets'], horaires: ['acces'], infos: ['acces'],
      galerie: ['galerie'], contact: ['contact'], praticiens: ['praticiens'], faq: ['faq'], pied: ['pied'], actualites: ['actualites'],
    };
    // Page sujet, article, fiche : la page entière (vuePourCle)
    return blocs[a];
  }
  if (type === 'structure') {
    const blocs: Record<string, string[] | undefined> = { accueil: undefined, soins: ['competences', 'sujets'], acces: ['acces', 'contact'], cabinet: ['praticiens', 'galerie'], questions: ['faq'], fiche: undefined, actualites: ['actualites'], theme: undefined, article: undefined };
    return blocs[a];
  }
  return undefined;
}

/** Habillage d'une composition (réglages par défaut pour les anciennes recettes) */
export const habillageDe = (x: Pick<CompositionRecette, 'typo' | 'details' | 'menu'>): Habillage => normaliserHabillage(x);
/** Axes d'une dimension d'habillage : toute la typographie, le jeu de détails, tout le menu */
const AXES_DIMENSION = {
  typo: (Object.keys(AXES_TYPO) as AxeTypo[]).map((axe) => ({ groupe: 'typo' as const, axe })),
  details: [{ groupe: 'details' as const, axe: 'jeu' as const }],
  menu: (Object.keys(AXES_MENU) as AxeMenu[]).map((axe) => ({ groupe: 'menu' as const, axe })),
} satisfies Record<'typo' | 'details' | 'menu', AxeHabillage[]>;
/**
 * Dé de l'habillage (panneau « Typographie & détails ») : une dimension entière (`typo`, `details` = jeu, `menu`) ou UN axe
 * (`{ groupe, axe }` : échelle, casse, séparateurs, menu téléphone…), axes verrouillés (`hab:<groupe>:<axe>`) jamais touchés ;
 * pondéré par les notes (clés atelier typo= / details= / menu=). Déterministe pour une graine.
 */
export function tirerHabillageRecette(x: CompositionRecette, cible: 'typo' | 'details' | 'menu' | AxeHabillage, c: ContexteRecette, graine: number, verrous: readonly string[] = []): CompositionRecette {
  const axes = typeof cible === 'string' ? AXES_DIMENSION[cible] : [cible];
  const sel = typeof cible === 'string' ? cible : verrouAxe(cible);
  const h = tirerHabillage(habillageDe(x), alea(graine, sel), { axes, verrous, effet: (k) => effetAtelier(c, k), gabarit: gabaritDe(c, x.structure) });
  return reparerComposition({ ...x, ...h }, c);
}

/** « Tout changer » : un dé sur chaque dimension non verrouillée (structure d'abord : elle conditionne styles et couleurs) */
export function toutChanger(x: CompositionRecette, verrous: readonly string[], c: ContexteRecette, graine: number): CompositionRecette {
  // Harmonie (harmonie.ts) : une famille de style d'abord (sujet n° 1, notes, verrous), puis chaque dimension dans la famille
  if (!c.horsRegles) return toutChangerHarmonieux(x, verrous, c, graine, { ...outilsHarmonie(c), brut: (y, g) => toutChanger(y, verrous, { ...c, horsRegles: true }, g) });
  let y = x;
  const sousVerrous = verrous.filter((v) => v.startsWith('page:') || v.startsWith('composant:'));
  for (const d of ['structure', 'couleurs', 'polices', 'visuels', 'photos', 'effets', 'traitement', 'typo', 'details', 'menu'] as const) {
    if (verrous.includes(d)) continue;
    y = d === 'typo' || d === 'details' || d === 'menu' ? tirerHabillageRecette(y, d, c, hache(`${graine}|${d}`), verrous)
      : d === 'structure' && sousVerrous.length
      ? reparerComposition({ ...y, ...tirerStructure(y, c, alea(hache(`${graine}|${d}`), d), true, sousVerrous) }, c)
      : tirerDimension(y, d, c, hache(`${graine}|${d}`));
  }
  // Structure verrouillée mais variantes à re-tirer ? Non : verrouiller la structure fige aussi sa composition.
  return y;
}

// ---------------------------------------------------------------------------------------------------------------
// Garde-fous
// ---------------------------------------------------------------------------------------------------------------

/**
 * Outils du moteur d'harmonie (harmonie.ts) pour un scénario : les garde-fous du core passent toujours avant les règles d'harmonie
 * (réparation, structures et styles permis, gammes non exclues, présentations permises par le gabarit). `brut` : tirage sans harmonie.
 */
export function outilsHarmonie(c: ContexteRecette): OutilsTirage<CompositionRecette> {
  const brut = { ...c, horsRegles: true };
  return {
    brut: (x, g) => toutChanger(x, [], brut, g),
    reparer: (x) => reparerComposition(x, c),
    permis: (dim, x) => {
      if (dim === 'structure') return structuresPermises(c);
      if (dim === 'style') return stylesPermis(c, x.structure);
      if (dim === 'gamme') { const ex = gammesExclues(c); return GAMMES.filter((g) => !ex.has(g.id) && !(avecDiabete(c) && estRougeVif(g.accent))).map((g) => g.id); }
      if (dim.startsWith('v.')) return sectionsVariables(gabaritDe(c, x.structure)).includes(dim.slice(2) as keyof Variantes) ? (VARIANTES_SECTIONS[dim.slice(2) as keyof Variantes] as readonly string[]) : [];
      return null;
    },
  };
}

/** Défauts d'une composition dans un scénario (liste vide si tout est permis) */
export function controlerComposition(x: CompositionRecette, c: ContexteRecette): string[] {
  const e: string[] = [];
  const d = avecDiabete(c);
  if (!structuresPermises(c).includes(x.structure)) e.push(`Structure « ${x.structure} » exclue pour ces sujets.`);
  if (!stylesPermis(c, x.structure).includes(x.visuels.style)) e.push(`Style « ${x.visuels.style} » exclu (structure ou sujet).`);
  if (x.gamme) {
    const g = gammeParId(x.gamme);
    if (!g) e.push(`Gamme inconnue : ${x.gamme}.`);
    else if (gammesExclues(c).has(g.id) || (d && estRougeVif(g.accent))) e.push(`Gamme « ${g.nom} » exclue pour ces sujets.`);
    else { const m = modeleDe(c, x.structure); e.push(...verifierCouleursGabarit(m, { couleur: g.accent, gamme: g.id })); }
  } else if (!couleurLibreValide(x.couleur, c, x.structure)) e.push(`Couleur libre ${x.couleur} refusée (contraste ou rouge vif avec le diabète).`);
  if (!pairePolices(x.police)) e.push(`Paire de polices inconnue : ${x.police}.`);
  if (x.visuels.herosSujet && !herosPossibles(c).includes(x.visuels.herosSujet)) e.push(`Héros hors des sujets : ${x.visuels.herosSujet}.`);
  if (x.visuels.animation === 'trajectoire') e.push('Animation « trajectoire » (posture) interdite.');
  if (x.photos.some((u) => /posture/.test(u))) e.push('Photo « posture » interdite.');
  if (x.visuels.style !== 'photos' && x.photos.length) e.push('Photos hors du style « photos ».');
  if (sujetsActifs(c.sujets).length !== new Set(c.sujets).size && c.sujets.includes('posture')) { /* posture ignorée : rien à signaler */ }
  const g = gabaritDe(c, x.structure);
  for (const s of Object.keys(x.sections.variantes)) if (!sectionsVariables(g).includes(s as keyof Variantes)) e.push(`Variante « ${s} » sans effet sur ce gabarit.`);
  return e;
}

// ---------------------------------------------------------------------------------------------------------------
// Nom, libellés, sérialisation
// ---------------------------------------------------------------------------------------------------------------

export const libelleCouleurRecette = (x: Pick<CompositionRecette, 'gamme' | 'couleur'>) => (x.gamme ? gammeParId(x.gamme)?.nom ?? x.gamme : `couleur libre ${x.couleur}`);

/** Nom proposé automatiquement : « Sport · Clair et pratique · Cobalt · Grotesque affirmée » */
export function nomRecette(x: CompositionRecette, sujets: readonly string[]): string {
  const s = sujetsActifs(sujets)[0];
  return [s ? themeParId(s)?.court : 'Cabinet', LIBELLES_STRUCTURES[x.structure], libelleCouleurRecette(x), pairePolices(x.police)?.nom].filter(Boolean).join(' · ').slice(0, 120);
}

/** Composition en lignes lisibles (studio, export) */
export function libellesComposition(x: CompositionRecette): { dimension: string; valeur: string }[] {
  const v = Object.entries(x.sections.variantes).map(([s, k]) => `${NOMS_SECTIONS_VARIABLES[s] ?? s} : ${LIBELLES_VARIANTES[s]?.[k as string] ?? k}`);
  return [
    { dimension: 'Structure', valeur: LIBELLES_STRUCTURES[x.structure] },
    { dimension: 'Couleurs', valeur: libelleCouleurRecette(x) },
    { dimension: 'Polices', valeur: `${pairePolices(x.police)?.nom ?? x.police} (${pairePolices(x.police)?.description ?? ''})` },
    { dimension: 'Visuels', valeur: `${LIBELLES_STYLES[x.visuels.style].nom}${x.visuels.herosSujet ? ` · héros ${themeParId(x.visuels.herosSujet)?.court}` : ''}${x.visuels.animation ? ` · animation ${x.visuels.animation}` : ''}` },
    { dimension: 'Photos', valeur: x.photos.length ? x.photos.map((u) => `${u.split('/').pop()?.split('?')[0]}${estPhotoHebergee(u) ? '' : ' (non importée)'}`).join(', ') : 'aucune' },
    { dimension: 'Sections', valeur: [ordreAccueil(x.sections.ordre)?.nom, ...v].filter(Boolean).join(' · ') },
    { dimension: 'Effets', valeur: jeuEffets(x.effets)?.nom ?? x.effets },
    { dimension: 'Traitement des photos', valeur: libelleTraitementPhotos(x.traitement ?? TRAITEMENT_PHOTOS_DEFAUT) },
    ...libellesHabillage(habillageDe(x)),
  ];
}

/** Composition reçue (base, formulaire) : forme vérifiée, puis remise dans les garde-fous du scénario ; invalide → null */
export function normaliserComposition(brut: unknown, c: ContexteRecette): CompositionRecette | null {
  if (!brut || typeof brut !== 'object') return null;
  const o = brut as Record<string, any>;
  if (!(STRUCTURES as readonly string[]).includes(o.structure)) return null;
  const txt = (v: unknown, max = 60) => (typeof v === 'string' ? v.slice(0, max) : '');
  const x: CompositionRecette = {
    structure: o.structure,
    gamme: gammeParId(txt(o.gamme)) ? txt(o.gamme) : '',
    couleur: /^#[0-9a-f]{6}$/i.test(txt(o.couleur)) ? txt(o.couleur).toLowerCase() : '#2d5bff',
    police: pairePolices(o.police) ? o.police : 'grotesque',
    visuels: {
      style: (['releve', 'pedagogique', 'ligne', 'photos'] as const).includes(o.visuels?.style) ? o.visuels.style : 'ligne',
      herosSujet: txt(o.visuels?.herosSujet, 30) || null,
      animation: null,
    },
    // Photos hébergées, ou aperçus de photos libres gardées non importées (studio : avertissement, import requis avant un site)
    photos: Array.isArray(o.photos) ? [...new Set(o.photos.filter((u: unknown): u is string => typeof u === 'string' && (Boolean(clePhoto(u)) || estApercuPhotoLibre(u))))].slice(0, 8) : [],
    sections: { ordre: ordreAccueil(o.sections?.ordre) ? o.sections.ordre : 'modele', variantes: o.sections?.variantes && typeof o.sections.variantes === 'object' ? { ...o.sections.variantes } : {} },
    effets: jeuEffets(o.effets) ? o.effets : 'sobre',
    // Anciennes recettes (sans traitement) : traitement du modèle
    traitement: normaliserTraitementPhotos(o.traitement),
    // Habillage (anciennes recettes : rendu du modèle) : normalisé par reparerComposition
    typo: o.typo, details: o.details, menu: o.menu,
  };
  if (!x.gamme && !/^#[0-9a-f]{6}$/i.test(txt(o.couleur))) return null;
  return reparerComposition(x, c);
}

/** Forme stockée (table recettes.composition) : clés dans un ordre stable, variantes triées */
export function serialiserComposition(x: CompositionRecette): string {
  const variantes = Object.fromEntries(Object.entries(x.sections.variantes).sort(([a], [b]) => (a < b ? -1 : 1)));
  return JSON.stringify({ structure: x.structure, gamme: x.gamme, couleur: x.couleur, police: x.police, visuels: x.visuels, photos: x.photos, sections: { ordre: x.sections.ordre, variantes }, effets: x.effets, traitement: normaliserTraitementPhotos(x.traitement), ...habillageDe(x) });
}

/**
 * Forme stockée AVEC le scénario du client simulé (clé `scenario` de la composition jsonb : aucune migration) ; relue par
 * recetteDepuisLigne (normaliserComposition ignore la clé).
 */
export function serialiserRecetteAvecScenario(x: CompositionRecette, s: ScenarioRecette | null | undefined): Record<string, unknown> {
  const o = JSON.parse(serialiserComposition(x)) as Record<string, unknown>;
  return s ? { ...o, scenario: normaliserScenario(s) } : o;
}
// « gardee » : recette gardée par Paul depuis la tuile « Recettes complètes » (notation-recettes.ts) ; conservée à chaque réenregistrement
export const ETIQUETTES_RECETTE = ['waouh', 'pro', 'harmonieux', 'lisible', 'bien-dans-le-sujet', 'fade', 'trop-charge', 'couleurs-jurent', 'pas-pro', 'illisible-mobile', 'gardee'] as const;
export const ETIQUETTE_GARDEE = 'gardee';
export const STATUTS_RECETTE = ['active', 'archivee'] as const;

/** Recette lue (studio : complète ; parcours : sans auteur ni remarques) */
export type Recette = {
  id: string;
  nom: string;
  sujets: string[];
  couleursPreferees: string[];
  /** Scénario du client simulé (studio, simulateur.ts) ; anciennes recettes : déduit des sujets et couleurs (scenarioDeRecette) */
  scenario?: ScenarioRecette;
  composition: CompositionRecette;
  note: number | null;
  etiquettes: string[];
  positif?: string | null;
  negatif?: string | null;
  statut: (typeof STATUTS_RECETTE)[number];
  creeLe?: string | null;
  modifieLe?: string | null;
};

/** Ligne de la table (ou de la fonction de lecture du parcours) → recette ; invalide → null */
export function recetteDepuisLigne(l: Record<string, any>, modele?: (id: string) => ModeleManifeste): Recette | null {
  const sujets = Array.isArray(l.sujets) ? l.sujets.filter((x: unknown): x is string => typeof x === 'string').slice(0, 6) : [];
  const couleurs = Array.isArray(l.couleurs_preferees) ? l.couleurs_preferees.filter((x: unknown): x is string => typeof x === 'string').slice(0, 3) : [];
  const composition = normaliserComposition(l.composition, { sujets, couleursPreferees: couleurs, modele });
  if (!composition || typeof l.id !== 'string') return null;
  // Scénario enregistré avec la recette (composition.scenario), sinon déduit des sujets et des couleurs (rétrocompatible)
  const brut = l.composition && typeof l.composition === 'object' ? (l.composition as Record<string, unknown>).scenario : undefined;
  const scenario = brut && typeof brut === 'object' ? normaliserScenario(brut) : scenarioDeRecette({ sujets, couleursPreferees: couleurs });
  return {
    id: l.id, nom: String(l.nom ?? '').slice(0, 120) || nomRecette(composition, sujets), sujets, couleursPreferees: couleurs, scenario, composition,
    note: Number.isInteger(l.note) && l.note >= 1 && l.note <= 5 ? l.note : null,
    etiquettes: Array.isArray(l.etiquettes) ? l.etiquettes.filter((x: unknown): x is string => typeof x === 'string').slice(0, 12) : [],
    ...(l.positif !== undefined ? { positif: l.positif ?? null } : {}), ...(l.negatif !== undefined ? { negatif: l.negatif ?? null } : {}),
    statut: l.statut === 'archivee' ? 'archivee' : 'active', creeLe: l.created_at ?? null, modifieLe: l.updated_at ?? null,
  };
}

/**
 * Recettes du parcours pour un client : actives, notées ≥ 4, qui visent son sujet n° 1 (ou sans sujet : génériques).
 * Ordre (simulateur.ts, niveauProximite / proximiteScenarios) : d'abord les recettes d'un scénario IDENTIQUE, puis PROCHE (même
 * sujet n° 1, proximité ≥ 0,6 : couleurs identiques ou voisines, sujets qui se recouvrent), puis celles qui visent le sujet n° 1,
 * puis les génériques ; à niveau égal, la meilleure note, puis la plus grande proximité.
 * `client` : scénario du client (ou, forme historique, la liste de ses sujets : 3 premiers principaux, sans couleur).
 * `defautsMobile` (praticiens) : une recette dont une page ou un élément a un défaut d'adaptation mobile ouvert passe après les
 * autres (sa note de choix n'est pas touchée), jusqu'à la correction.
 */
export function recettesPourScenario(recettes: readonly Recette[], client: readonly string[] | ScenarioRecette, min = 4, defautsMobile?: ReadonlySet<string>): Recette[] {
  const sc: ScenarioRecette = Array.isArray(client) ? normaliserScenario({ sujets: sujetsActifs(client as readonly string[]) }) : normaliserScenario(client);
  const s1 = sujetsActifs([...sc.principaux, ...sc.secondaires])[0] ?? null;
  const mobileARevoir = (r: Recette) => (defautsMobile?.size ? clesStructure(r.composition).some((k) => defautsMobile.has(k)) : false);
  const cle = new Map(recettes.map((r) => { const s = scenarioDeRecette(r); return [r.id, { rang: RANG_PROXIMITE[niveauProximite(sc, s)], prox: proximiteScenarios(sc, s) }]; }));
  return recettes
    .filter((r) => r.statut === 'active' && (r.note ?? 0) >= min && ((s1 && r.sujets.includes(s1)) || !sujetsActifs(r.sujets).length))
    .sort((a, b) => Number(mobileARevoir(a)) - Number(mobileARevoir(b)) || cle.get(a.id)!.rang - cle.get(b.id)!.rang || (b.note ?? 0) - (a.note ?? 0)
      || cle.get(b.id)!.prox - cle.get(a.id)!.prox || (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------------------------------------------------------
// Application au brouillon
// ---------------------------------------------------------------------------------------------------------------

/**
 * Applique une recette au brouillon (aperçu du studio et du parcours, enregistrement serveur) : structure (préréglage du
 * modèle, identité conservée), gamme ou couleur libre, style et animation, puis les réglages propres à la recette sur le
 * thème (police, ordre et variantes des sections, héros, photos, effets, identifiant). Remise dans les garde-fous d'abord.
 */
export function appliquerRecette(
  d: SiteDraft,
  brut: CompositionRecette,
  opts: { id?: string | null; proposes?: readonly Univers[]; modeles?: readonly ModeleManifeste[]; soinsConnus?: readonly string[]; themesActives?: readonly string[]; photosNonImportees?: boolean } = {},
): { draft: SiteDraft; modele: ModeleManifeste } | null {
  const modele = (id: string) => opts.modeles?.find((m) => m.id === id) ?? modeleIntegre(id);
  const c: ContexteRecette = { sujets: [...(d.priorites?.principaux ?? []), ...(d.priorites?.secondaires ?? [])], principaux: d.priorites?.principaux.length ?? 0, couleursPreferees: d.couleursPreferees, modele };
  const x = reparerComposition(brut, c);
  const u = opts.proposes?.find((v) => v.id === x.structure) ?? universCatalogue(x.structure);
  if (!u) return null;
  const r = appliquerUniversParcours(d, u, { modeles: opts.modeles ? [...opts.modeles] : undefined, soinsConnus: opts.soinsConnus, themesActives: opts.themesActives });
  let y = appliquerReglages(r.draft, { ...(x.gamme ? { gamme: x.gamme } : {}), style: x.visuels.style, animation: x.visuels.animation, proposition: null });
  const base = modele(y.theme.modele);
  const { sections, infosEnTete } = sectionsSelonOrdre(base.accueil.sections, x.sections.ordre);
  const theme: SiteDraft['theme'] = { ...y.theme, police: x.police, sections };
  if (!x.gamme) { theme.gamme = ''; theme.couleur = x.couleur; }
  if (Object.keys(x.sections.variantes).length) theme.variantes = { ...x.sections.variantes }; else delete theme.variantes;
  if (infosEnTete) theme.infosEnTete = true; else delete theme.infosEnTete;
  if (x.visuels.herosSujet) theme.herosSujet = x.visuels.herosSujet; else delete theme.herosSujet;
  // Sites (et parcours) : photos importées seulement ; l'aperçu du studio montre aussi les photos non importées
  const photos = opts.photosNonImportees ? x.photos : photosImportees(x.photos);
  if (photos.length) theme.photosRecette = [...photos]; else delete theme.photosRecette;
  theme.effets = x.effets;
  const tp = normaliserTraitementPhotos(x.traitement);
  if (traitementNeutre(tp)) delete theme.traitementPhotos; else theme.traitementPhotos = tp;
  // Habillage (typographie, détails, menu) : posé seulement s'il change quelque chose (sites antérieurs inchangés)
  const hab = habillageDe(x);
  if (estHabillageParDefaut(hab)) { delete theme.typo; delete theme.details; delete theme.menu; } else { theme.typo = hab.typo; theme.details = hab.details; theme.menu = hab.menu; }
  if (opts.id) theme.recette = opts.id; else delete theme.recette;
  y = { ...y, theme };
  return { draft: y, modele: modeleDuSite(base, theme) };
}

/** Recette proposée au parcours comme une proposition (cartes « Votre site ») */
export type PropositionRecette = Proposition & { recette: { id: string; composition: CompositionRecette } };
export function propositionDeRecette(r: Recette): PropositionRecette {
  const x = r.composition;
  const g = gammeParId(x.gamme);
  const { registre, modeVisuel } = reglageStyle(x.visuels.style, x.structure);
  return {
    id: `recette~${r.id}`, nom: r.nom.split(' · ')[0] === themeParId(sujetsActifs(r.sujets)[0])?.court ? (pairePolices(x.police)?.nom ?? r.nom) : r.nom.slice(0, 40),
    phrase: `${LIBELLES_STRUCTURES[x.structure]} : ${LIBELLES_STYLES[x.visuels.style].description.toLowerCase()}, ${(pairePolices(x.police)?.nom ?? '').toLowerCase()}.`,
    univers: x.structure, gamme: x.gamme || (g?.id ?? ''), famille: g?.famille === 'vitaminee' ? 'vitaminee' : 'sobre', style: x.visuels.style, registre, modeVisuel,
    animation: x.visuels.animation, photos: null, heros: x.visuels.herosSujet, couleurs: [], nuances: ['Composition validée par notre studio'], score: 100 + (r.note ?? 0),
    recette: { id: r.id, composition: x },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Apprentissage : une recette (ou une combinaison de l'atelier) bien notée renforce chacun de ses ingrédients
// ---------------------------------------------------------------------------------------------------------------

/** Clés apprises d'une recette : atelier (ingrédients, paires, police, variantes, ordre, effets) et assets (gamme, modèle, héros, photos) */
export function clesRecette(x: CompositionRecette, sujets: readonly string[]): { atelier: string[]; assets: string[] } {
  const s1 = sujetsActifs(sujets)[0] ?? 'cabinet';
  const { registre } = reglageStyle(x.visuels.style, x.structure);
  const gamme = x.gamme || 'libre';
  const atelier = [
    ...clesAtelier({ structure: x.structure, gamme, style: x.visuels.style, animation: x.visuels.animation, theme1: s1 }).filter((k) => k.type !== 'combinaison').map((k) => k.cle),
    `police=${x.police}`, `ordre=${x.sections.ordre}`, `effets=${x.effets}`, ...clesAtelierHabillage(habillageDe(x)),
    ...Object.entries(x.sections.variantes).map(([s, v]) => `variante=${s}:${v}`),
  ];
  const assets = [
    ...(x.gamme ? [`gamme:${x.gamme}`] : []), `modele:${x.structure}`,
    ...(x.visuels.herosSujet && x.visuels.style !== 'photos' ? [`heros:${x.visuels.herosSujet}:${registre}`] : []),
    ...x.photos.map(clePhoto).filter((k): k is string => Boolean(k)),
    ...clesStructure(x),
  ];
  return { atelier: [...new Set(atelier)], assets: [...new Set(assets)] };
}

/**
 * Renfort des ingrédients par les notes de recettes et de combinaisons (règle de Paul du 2026-10-07 : « quand un thème est
 * validé avec les photos, les polices…, ça doit pondérer chaque ingrédient un peu plus »). Pour chaque clé k :
 *   Δ(k) = Σ w · (note − μ) / (K + Σ w)      w = 0,4 (une note de recette pèse 0,4 note individuelle sur chaque ingrédient),
 *                                              K = lissage existant (10 atelier, 4 assets), μ = moyenne de référence (3 par défaut)
 *   plafonné à ±0,75 étoile, puis AJOUTÉ à l'effet appris de k (les notes individuelles ne sont jamais écrasées).
 * Une recette 5★ fait donc monter un peu chacun de ses ingrédients ; une 1★ les fait baisser un peu. Garde-fous inchangés :
 * les poids ne font que réordonner des choix déjà permis.
 */
export const RENFORT = { facteur: 0.4, lissage: { atelier: 10, assets: 4 }, plafond: 0.75 } as const;
/** `poids` : poids de l'appareil regardé (rendu-mobile.ts : mobile 1,25 ; défaut 1) */
export type SourceRenfort = { note: number; atelier: readonly string[]; assets: readonly string[]; poids?: number };

export function renfortsPoids(sources: readonly SourceRenfort[], mu = 3): { atelier: Record<string, number>; assets: Record<string, number> } {
  const calc = (cle: 'atelier' | 'assets') => {
    const acc = new Map<string, { s: number; w: number }>();
    for (const x of sources) {
      if (!Number.isInteger(x.note) || x.note < 1 || x.note > 5) continue;
      const f = RENFORT.facteur * (x.poids ?? 1);
      for (const k of new Set(x[cle])) { const a = acc.get(k) ?? { s: 0, w: 0 }; a.s += f * (x.note - mu); a.w += f; acc.set(k, a); }
    }
    const res: Record<string, number> = {};
    for (const k of [...acc.keys()].sort()) {
      const { s, w } = acc.get(k)!;
      const d = Math.round(Math.max(-RENFORT.plafond, Math.min(RENFORT.plafond, s / (RENFORT.lissage[cle] + w))) * 1000) / 1000;
      if (d) res[k] = d;
    }
    return res;
  };
  return { atelier: calc('atelier'), assets: calc('assets') };
}

/** Poids appris + renforts (effets ajoutés, bornés à ±4 comme normaliserPoidsAtelier) */
export function appliquerRenforts(poids: PoidsAtelier | null | undefined, r: { atelier: Record<string, number>; assets: Record<string, number> }): PoidsAtelier | null {
  if (!Object.keys(r.atelier).length && !Object.keys(r.assets).length) return poids ?? null;
  const borne = (x: number) => Math.round(Math.max(-4, Math.min(4, x)) * 1000) / 1000;
  const p: PoidsAtelier = poids ? { ...poids, effets: { ...poids.effets } } : { n: 0, moyenne: 3, effets: {} };
  for (const [k, d] of Object.entries(r.atelier)) p.effets[k] = borne((p.effets[k] ?? 0) + d);
  // n ≥ 1 : bonusAtelier ne lit les effets que s'il existe au moins une note
  if (!p.n && Object.keys(r.atelier).length) p.n = 1;
  if (Object.keys(r.assets).length) {
    const a: PoidsAssets = p.assets ? { ...p.assets, effets: { ...p.assets.effets } } : { n: 0, moyenne: 3, effets: {}, statuts: {} };
    for (const [k, d] of Object.entries(r.assets)) a.effets[k] = borne((a.effets[k] ?? 0) + d);
    p.assets = a;
  }
  return p;
}

/** Sources de renfort des recettes notées (actives) */
export const sourcesRecettes = (recettes: readonly Pick<Recette, 'note' | 'composition' | 'sujets' | 'statut'>[]): SourceRenfort[] =>
  recettes.filter((r) => r.note && r.statut === 'active').map((r) => ({ note: r.note!, ...clesRecette(r.composition, r.sujets) }));

/**
 * Clés apprises d'UNE PAGE d'une recette (note par page, demande de Paul du 2026-10-07) : la structure de cette page, les
 * éléments de ses sections et leurs variantes (et l'ordre de l'accueil pour l'accueil) — rien d'autre. Une structure aimée pour
 * la page Contact ne renforce donc que la page Contact ; couleurs, polices et visuels restent appris par la note de la recette.
 */
export function clesPage(x: CompositionRecette, page: PageStructure): { atelier: string[]; assets: string[] } {
  const p = PAGES_STRUCTURE.find((y) => y.id === page);
  if (!p) return { atelier: [], assets: [] };
  const v = x.sections.variantes as Record<string, string>;
  const sections = (p.sections as readonly string[]).filter((sec) => v[sec]);
  const atelier = [...(p.ordre ? [`ordre=${x.sections.ordre}`] : []), ...sections.map((sec) => `variante=${sec}:${v[sec]}`)];
  const assets = [
    ...clesStructure(x).filter((k) => k.startsWith(`structure:${page}:`)),
    ...sections.filter((sec) => FAMILLES_COMPOSANTS.includes(sec as keyof Variantes)).map((sec) => `composant:${sec}:${v[sec]}`),
  ];
  return { atelier: [...new Set(atelier)], assets: [...new Set(assets)] };
}

/** Une note du journal recettes_notes (lecture d'apprentissage : ni auteur ni remarques) ; page nulle = recette entière */
export type NoteRecette = { recette: string; note: number; etiquettes?: readonly string[]; page?: string | null; appareil?: AppareilRetour | string | null; composition: CompositionRecette; sujets: readonly string[] };

/**
 * Sources de renfort des notes PAR PAGE (journal recettes_notes, page non nulle) : chaque note ne renforce que les clés de sa page
 * (clesPage), au poids de son appareil. Les notes de recette entière restent lues sur la recette (sourcesRecettes) : pas de
 * double compte.
 */
export const sourcesNotesPages = (notes: readonly NoteRecette[]): SourceRenfort[] =>
  notes.filter((n) => n.page && estPageStructure(n.page) && Number.isInteger(n.note))
    .map((n) => ({ note: n.note, ...clesPage(n.composition, n.page as PageStructure), poids: poidsAppareil(n.appareil) }));

/** Section « Par page » de SYNTHESE.md : notes par type de page (moyenne, appareil, étiquettes), puis le détail */
export function markdownParPage(notes: readonly (Omit<NoteRecette, 'composition' | 'sujets'> & { nom?: string; positif?: string | null; negatif?: string | null; composition?: CompositionRecette; jour?: string | null; zones?: unknown })[], lignesZones?: (z: unknown) => string[]): string {
  const l = ['## Par page', ''];
  const parPage = notes.filter((n) => n.page && estPageStructure(n.page));
  if (!parPage.length) { l.push('Aucune note par page pour l’instant (studio de recettes, onglets des pages).'); return l.join('\n'); }
  for (const o of ONGLETS_PAGES) {
    const ns = parPage.filter((n) => n.page === o.page);
    if (!ns.length) continue;
    const moy = Math.round((ns.reduce((sx, n) => sx + n.note, 0) / ns.length) * 10) / 10;
    const mob = ns.filter((n) => appareilDe(n.appareil) === 'mobile').length;
    l.push(`### ${o.nom} — ${ns.length} note(s), moyenne ${moy}★${mob ? ` (${mob} sur mobile)` : ''}`, '');
    for (const n of ns) {
      const vs = (n.composition?.sections.variantes ?? {}) as Record<string, string>;
      const v = (PAGES_STRUCTURE.find((p) => p.id === n.page)!.sections as readonly string[]).filter((sec) => vs[sec]).map((sec) => LIBELLES_VARIANTES[sec]?.[vs[sec]] ?? vs[sec]);
      l.push(`- ${n.jour ? `${n.jour} · ` : ''}${n.nom ? `${n.nom} · ` : ''}${n.note}★ (${appareilDe(n.appareil)})${v.length ? ` · ${v.join(', ')}` : ''}${n.etiquettes?.length ? ` · ${n.etiquettes.join(', ')}` : ''}`);
      if (n.positif) l.push(`  - Ce qui va : ${n.positif}`);
      if (n.negatif) l.push(`  - Ce qui ne va pas : ${n.negatif}`);
      for (const z of lignesZones?.(n.zones) ?? []) l.push(`  - ${z}`);
    }
    l.push('');
  }
  return l.join('\n');
}

/** Libellé court d'une clé renforcée (« gamme Cobalt », « police Grotesque affirmée », « photo sport-course ») */
export function libelleCleRenfort(k: string): string {
  if (k.startsWith('gamme:')) return `gamme ${gammeParId(k.slice(6))?.nom ?? k.slice(6)}`;
  if (k.startsWith('modele:')) return `structure ${LIBELLES_STRUCTURES[k.slice(7) as Structure] ?? k.slice(7)}`;
  if (k.startsWith('heros:')) return `héros ${themeParId(k.split(':')[1])?.court ?? k.split(':')[1]}`;
  if (k.startsWith('photo:')) return `photo ${k.slice(6).split('/').pop()}`;
  if (k.startsWith('police=')) return `police ${pairePolices(k.slice(7))?.nom ?? k.slice(7)}`;
  if (k.startsWith('effets=')) return `effets ${jeuEffets(k.slice(7))?.nom ?? k.slice(7)}`;
  if (k.startsWith('ordre=')) return `ordre « ${ordreAccueil(k.slice(6))?.nom ?? k.slice(6)} »`;
  if (lireCleTraitementPhotos(k)) return `photos « ${libelleTraitementPhotos(lireCleTraitementPhotos(k)!)} »`;
  if (k.startsWith('effets:')) return `effets ${jeuEffets(k.slice(7))?.nom ?? k.slice(7)}`;
  if (estCleTypo(k)) return libelleCleTypo(k).toLowerCase();
  if (estCleDetails(k)) return libelleCleDetails(k).toLowerCase();
  if (estCleMenu(k)) return libelleCleMenu(k).toLowerCase();
  if (/^(typo|details|menu)=/.test(k)) { const [g, reste] = k.split('='); return (g === 'typo' ? libelleCleTypo : g === 'details' ? libelleCleDetails : libelleCleMenu)(`${g}:${reste}`).toLowerCase(); }
  if (k.startsWith('composant:')) { const [, f, v] = k.split(':'); return `${(NOMS_SECTIONS_VARIABLES[f] ?? f).toLowerCase()} « ${LIBELLES_VARIANTES[f]?.[v] ?? v} »`; }
  if (k.startsWith('structure:')) return `structure ${PAGES_STRUCTURE.find((p) => p.id === k.split(':')[1])?.nom ?? k.split(':')[1]}`;
  if (k.startsWith('variante=')) { const [s, v] = k.slice(9).split(':'); return `${(NOMS_SECTIONS_VARIABLES[s] ?? s).toLowerCase()} « ${LIBELLES_VARIANTES[s]?.[v] ?? v} »`; }
  if (k.startsWith('style=')) return `style ${LIBELLES_STYLES[k.slice(6) as StyleIllustration]?.nom ?? k.slice(6)}`;
  return k;
}

/** « Ce que vos avis ont changé » : « Recette X validée (5★) : renforce gamme Y, police Z, photo W » */
export function resumeRenforts(recettes: readonly Pick<Recette, 'nom' | 'note' | 'composition' | 'sujets' | 'statut'>[], nb = 6): string[] {
  return recettes
    .filter((r) => r.statut === 'active' && r.note && r.note !== 3)
    .sort((a, b) => Math.abs((b.note ?? 3) - 3) - Math.abs((a.note ?? 3) - 3))
    .slice(0, nb)
    .map((r) => {
      const k = clesRecette(r.composition, r.sujets);
      const cles = [...k.assets.filter((x) => /^(gamme|photo|heros):/.test(x)), `police=${r.composition.police}`, `effets=${r.composition.effets}`].slice(0, 5);
      return `Recette « ${r.nom} » ${r.note! >= 4 ? 'validée' : 'mal notée'} (${r.note}★) : ${r.note! >= 4 ? 'renforce' : 'affaiblit'} ${cles.map(libelleCleRenfort).join(', ')}`;
    });
}

/** Sources de renfort des combinaisons de l'atelier (assets seulement : leurs ingrédients atelier sont déjà appris) */
export function sourcesCombinaisons(notes: readonly { note: number; ingredients: { structure?: string; gamme?: string; heros?: string | null; registre?: string; modeVisuel?: string; photos?: readonly string[] } }[]): SourceRenfort[] {
  return notes.map((n) => {
    const i = n.ingredients;
    const assets = [
      ...(i.gamme ? [`gamme:${i.gamme}`] : []), ...(i.structure ? [`modele:${i.structure}`] : []),
      ...(i.heros && i.registre && i.modeVisuel !== 'photos' ? [`heros:${i.heros}:${i.registre}`] : []),
      ...(i.photos ?? []).filter((k) => typeof k === 'string' && k.startsWith('photo:')),
    ];
    return { note: n.note, atelier: [], assets };
  });
}

/** Score d'un asset (studio : pastille à côté des photos) */
export const scorePhoto = (url: string, poids?: PoidsAtelier | null) => { const k = clePhoto(url); return k ? scoreAsset(k, poids?.assets) : 0; };

/** Markdown des recettes (retours/SYNTHESE.md) */
export function markdownRecettes(recettes: readonly Recette[], opts: { titre?: string } = {}): string {
  const l = [opts.titre ?? '## Recettes du studio', ''];
  const actives = recettes.filter((r) => r.statut === 'active');
  if (!actives.length) { l.push('Aucune recette enregistrée.'); return l.join('\n'); }
  l.push(`${actives.length} recette(s) active(s), ${recettes.length - actives.length} archivée(s).`, '');
  for (const r of [...actives].sort((a, b) => (b.note ?? 0) - (a.note ?? 0))) {
    l.push(`### ${r.nom} — ${r.note ? `${r.note}★` : 'non notée'}`, '');
    l.push(`Sujets : ${r.sujets.map((s) => themeParId(s)?.court ?? s).join(', ') || 'aucun'}${r.etiquettes.length ? ` · étiquettes : ${r.etiquettes.join(', ')}` : ''}`);
    for (const x of libellesComposition(r.composition)) l.push(`- ${x.dimension} : ${x.valeur}`);
    if (r.positif) l.push(`- Ce qui va : ${r.positif}`);
    if (r.negatif) l.push(`- Ce qui ne va pas : ${r.negatif}`);
    l.push('');
  }
  return l.join('\n');
}

// ---------------------------------------------------------------------------------------------------------------
// Notation des structures de pages, éléments et jeux d'effets (assets_notes : types structure, composant, effets)
// ---------------------------------------------------------------------------------------------------------------

/** Étiquettes rapides des structures, éléments et effets (demande de Paul du 2026-10-07) */
export const ETIQUETTES_STUDIO = [
  { id: 'clair', libelle: 'Clair', positive: true },
  { id: 'hierarchie-claire', libelle: 'Hiérarchie claire', positive: true },
  { id: 'elegant', libelle: 'Élégant', positive: true },
  { id: 'lisible', libelle: 'Lisible', positive: true },
  { id: 'waouh', libelle: 'Waouh', positive: true },
  { id: 'trop-charge', libelle: 'Trop chargé', positive: false },
  { id: 'horaires-trop-bas', libelle: 'Horaires trop bas', positive: false },
  { id: 'effet-gadget', libelle: 'Effet gadget', positive: false },
  { id: 'trop-lent', libelle: 'Trop lent', positive: false },
  { id: 'illisible-mobile', libelle: 'Illisible sur mobile', positive: false },
] as const;
export const estEtiquetteStudio = (x: unknown): x is string => ETIQUETTES_STUDIO.some((e) => e.id === x);

/** Clé notable du studio bien formée et connue (structure de page, élément, jeu d'effets) */
export function estCleStudio(k: unknown): k is string {
  if (typeof k !== 'string' || k.length > 200) return false;
  const [type, a, b] = k.split(':');
  if (type === 'effets') return (Boolean(jeuEffets(a)) && b === undefined) || Boolean(lireCleTraitementPhotos(k));
  if (type === 'typo') return estCleTypo(k);
  if (type === 'details') return estCleDetails(k);
  if (type === 'menu') return estCleMenu(k);
  if (type === 'composant') return Boolean((VARIANTES_SECTIONS as Record<string, readonly string[]>)[a]?.includes(b)) && k.split(':').length === 3;
  if (type === 'structure') {
    const p = PAGES_STRUCTURE.find((x) => x.id === a);
    if (!p || !b || k.split(':').length !== 3) return false;
    // Morceaux (ordre de l'accueil, variantes des sections de la page) : chacun doit être une valeur connue de la page
    const permises = [...(p.ordre ? ORDRES_ACCUEIL.map((o) => o.id as string) : []), ...p.sections.flatMap((x) => [...VARIANTES_SECTIONS[x]] as string[])].sort((x, y) => y.length - x.length);
    let reste = b;
    for (let n = 0; reste && n < 6; n++) {
      const v = permises.find((x) => reste === x || reste.startsWith(`${x}-`));
      if (!v) return false;
      reste = reste.slice(v.length + 1);
    }
    return !reste;
  }
  return false;
}
