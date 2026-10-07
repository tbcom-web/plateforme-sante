// Modèles de présentation des sites.
//
// Un modèle ne contient AUCUN code : c'est une fiche (JSON) qui combine des sections déjà développées
// et testées, et règle polices, arrondis et couleurs. Tout ce qui compte pour le référencement
// (adresses des pages, title, description, H1, données structurées, sitemap, llms.txt, liens internes)
// est produit par le moteur et ne dépend jamais du modèle : changer de modèle ne change pas le SEO.
// Couche 5 de la charte graphique (voir charte.ts et docs/charte-graphique.md) : le modèle règle la mise
// en page ; les invariants (traits, trame, mouvement…) viennent de la charte, les couleurs de la gamme.

import { GAMMES } from './gammes';
import type { Registre } from './dessins';

/**
 * Sections possibles de l'accueil. « etapes » : premier rendez-vous en trois étapes (rendez-vous, venue,
 * consultation), composé à partir des informations déjà saisies, sans intertitre (aucun titre SEO ajouté).
 */
export const SECTIONS_ACCUEIL = ['faits', 'etapes', 'competences', 'panorama', 'praticiens', 'galerie', 'actualites', 'acces', 'faq'] as const;
export type SectionAccueil = (typeof SECTIONS_ACCUEIL)[number];

/** Types d'accueil : diaporama plein écran, photo plein écran, titre + photo côte à côte, grande photo du lieu + carte de contact */
export const HEROS = ['diaporama', 'plein', 'scinde', 'lieu'] as const;
export type Hero = (typeof HEROS)[number];

/**
 * Registre des illustrations du site (voir docs/charte-graphique.md, « Deux registres ») :
 * « releve » = trame de pression, lectures en mono, fonds plan sombres ; « pedagogique » = schémas de manuel au
 * trait, fonds clairs, sans trame, sans lecture de données, sans ligne de scan, sans sur-titres numérotés ; « ligne » = dessins au
 * trait continu (one-line art, ligne.ts), le tracé se dessine à l'apparition (registre proposé pour l'univers Zen : REGISTRE_PROPOSE).
 */
export const REGISTRES_MODELE: readonly Registre[] = ['releve', 'pedagogique', 'ligne'];
/**
 * Registre PROPOSÉ par modèle (non appliqué : les fiches gardent leur jeton `registre`, rien ne change pour les sites en ligne).
 * Zen : le trait continu, doux et épuré, s'accorde à sa typographie légère et à ses formes arrondies. À arbitrer par Paul
 * (variantes de trait et de boucles : docs/charte-graphique.md, « Registre ligne »).
 * TODO(univers) : à reprendre dans le préréglage de l'univers Zen du catalogue d'univers (catalogue-univers.ts) quand il sera stabilisé.
 */
export const REGISTRE_PROPOSE: Readonly<Record<string, Registre>> = { zen: 'ligne' };

/**
 * Gabarit de mise en page (structure des pages, pas seulement des jetons) :
 * - « classique » : en-tête éditorial, accueil selon `accueil.hero`, sections du gabarit commun (les 6 premiers modèles) ;
 * - « tableau » : cartes arrondies (bento), bulles de navigation, très mobile ;
 * - « village » : une colonne, très gros texte, accès d'abord (plan, trois gros boutons) ;
 * - « revue » : éditorial sobre, papier blanc cassé, colonnes de journal (folio et titre à gauche, contenu à droite), filets fins.
 * Hors « classique », chaque section est rendue par une VARIANTE choisie par la fiche (`variantes`), avec le même contenu et
 * les mêmes titres (SEO identique). Un nouveau gabarit = une entrée ici, ses variantes par défaut (VARIANTES_PAR_DEFAUT) et sa
 * coquille (apps/sites/src/components/gabarits/Coquille.astro) ; les variantes de sections sont partagées entre gabarits.
 */
export const GABARITS = ['classique', 'tableau', 'village', 'revue'] as const;
export type Gabarit = (typeof GABARITS)[number];
/** Sections dont la présentation change selon la variante (gabarits autres que « classique »). */
export const VARIANTES_SECTIONS = {
  /** Premier écran (qui, où, soin principal, Rendez-vous / Appeler) : dans une carte à aplat de couleur avec une illustration, ou en notice (lignes à picto) */
  /** … ou en « figure » (revue) : une colonne de texte sur l'aplat pastel et un seul dessin au trait légendé, masqué sur téléphone */
  accueil: ['carte', 'notice', 'figure'],
  /** Soins : trois rangées (Soins, Pour qui, Infos pratiques) en bulles à picto, ou en grille de boutons */
  /** … ou en « filets » (revue) : bulles à filet fin, texte encre, picto de la couleur de la rangée */
  soins: ['bulles', 'grille', 'filets'],
  /** Praticiens : cartes courtes (détails repliés) ou fiches en une colonne */
  /** … ou en « liste » (revue) : une ligne par praticien, séparées par un filet, sans carte */
  praticiens: ['cartes', 'fiches', 'liste'],
  /** Venir au cabinet : horaires et accès côte à côte puis volets repliés, ou notice en une colonne avec plan schématique */
  /** … ou en « colonnes » : horaires à gauche, adresse et plan d'accès à droite (plan SVG statique, jamais de tuiles) */
  infos: ['volets', 'notice', 'colonnes'],
  /** Questions fréquentes : accordéon ; deux colonnes d'accordéon (ordinateur) ; liste ouverte (réponses dépliées) */
  faq: ['accordeon', 'colonnes', 'ouverte'],
  /** Actualités : liste de titres datés, cartes, ou « une » (le dernier article en grand avec son visuel, les autres en liste) */
  actualites: ['liste', 'cartes', 'une'],
  /**
   * Pied de page : « simple » (trois colonnes : coordonnées, praticiens, pages) ; « centre » (une colonne centrée, liens en
   * ligne) ; « large » (nom du cabinet en grand en tête, puis les colonnes). Même contenu, mêmes liens (studio de recettes).
   */
  pied: ['simple', 'centre', 'large'],
  /**
   * Fiche d'un soin (FicheSoin.astro, gabarits tableau et village) : « encadre » (texte et encadré « En pratique » à côté,
   * historique) ; « colonne » (une colonne de lecture, l'encadré en bandeau sous le texte) ; « pratique-haut » (l'encadré en
   * bandeau avant le texte). Même balisage, mêmes titres : seule la mise en page change.
   */
  fiche: ['encadre', 'colonne', 'pratique-haut'],
  /**
   * Sujets du cabinet sous le premier écran (SujetsAccueil, studio de recettes 2026-10-07) : « une » = présentation propre au
   * gabarit (le premier sujet en grand) ; « rangees » = grandes rangées illustrées alternées ; « cartes » = cartes égales ;
   * « liste » = liste éditoriale (petit visuel, titre, une ligne, filets) ; « colonnes » = deux colonnes égales. Même contenu.
   */
  sujets: ['une', 'rangees', 'cartes', 'liste', 'colonnes'],
  /** Bloc horaires de « Venir au cabinet » : tableau jour / heures, bandeau (jours côte à côte), ou carte encadrée */
  horaires: ['tableau', 'bandeau', 'carte', 'liste'],
  /** Galerie du cabinet (photos du praticien) : mosaïque ; défilement horizontal au doigt ; grande photo et vignettes ; bande de 4 */
  galerie: ['mosaique', 'defilement', 'grande', 'bande'],
  /**
   * Rendez-vous et contact (coquille des gabarits tableau, village, revue ; studio de recettes, lot 1) : « barre » = barre
   * d'actions en bas de l'écran sur téléphone (historique) ; « bandeau » = bandeau d'actions à la couleur du cabinet avant le pied
   * de page (Appeler, Écrire au cabinet, Rendez-vous, Itinéraire) ; « carte » = carte « Écrire au cabinet » encadrée (e-mail et
   * téléphone en grand) ; « flottant » = bouton rond flottant sur téléphone au lieu de la barre. Aucun formulaire (stockage, RGPD,
   * anti-spam à décider par Paul) : « Écrire au cabinet » reste un lien e-mail. Aucun intertitre (SEO identique).
   */
  contact: ['barre', 'bandeau', 'carte', 'flottant'],
  /** Forme des cartes de soins et de sujets (formes.ts), indépendante de leur disposition ; « gabarit » : celle du modèle */
  'soins-forme': ['gabarit', 'bulles', 'carres', 'arrondies', 'mosaique', 'pilules', 'organiques', 'tuiles', 'sans-cadre'],
  /**
   * Page d'un sujet (/themes/<id>, tous gabarits ; demande de Paul du 2026-10-07) : « liste » (historique : titre et visuel côte
   * à côte, soins en liste à filets) ; « rangees » (intro, puis grandes rangées de soins au picto agrandi) ; « heros »
   * (illustration du sujet pleine largeur sous le titre, puis la liste) ; « colonnes » (soins à gauche, conseils et rendez-vous
   * à côté). MÊME balisage et mêmes titres (H1, H2) : seule la feuille de style change (SEO identique).
   */
  theme: ['liste', 'rangees', 'heros', 'colonnes'],
  /**
   * Page d'un article (/actualites/<slug>, tous gabarits) : « standard » (historique) ; « lecture » (colonne de lecture centrée,
   * illustration en tête) ; « laterale » (illustration à côté du texte sur grand écran) ; « chapo » (chapô en grand et sommaire
   * des intertitres). Mesure de lecture 60 à 75 caractères et interligne 1,7 dans toutes les présentations. Mêmes titres.
   */
  article: ['standard', 'lecture', 'laterale', 'chapo'],
} as const;
export type SectionVariable = keyof typeof VARIANTES_SECTIONS;
export type Variantes = { [S in SectionVariable]: (typeof VARIANTES_SECTIONS)[S][number] };
/** Variantes par défaut de chaque gabarit (la fiche peut en changer une partie). */
export const VARIANTES_PAR_DEFAUT: Record<Exclude<Gabarit, 'classique'>, Variantes> = {
  tableau: { accueil: 'carte', soins: 'bulles', praticiens: 'cartes', infos: 'volets', faq: 'accordeon', actualites: 'liste', pied: 'simple', sujets: 'une', horaires: 'tableau', galerie: 'mosaique', 'soins-forme': 'gabarit', contact: 'barre', fiche: 'encadre', theme: 'liste', article: 'standard' },
  village: { accueil: 'notice', soins: 'grille', praticiens: 'fiches', infos: 'notice', faq: 'accordeon', actualites: 'liste', pied: 'simple', sujets: 'une', horaires: 'tableau', galerie: 'mosaique', 'soins-forme': 'gabarit', contact: 'barre', fiche: 'encadre', theme: 'liste', article: 'standard' },
  revue: { accueil: 'figure', soins: 'filets', praticiens: 'liste', infos: 'volets', faq: 'accordeon', actualites: 'liste', pied: 'simple', sujets: 'une', horaires: 'tableau', galerie: 'mosaique', 'soins-forme': 'gabarit', contact: 'barre', fiche: 'encadre', theme: 'liste', article: 'standard' },
};
/** Gabarit d'un modèle (défaut : classique, pour les fiches antérieures au champ). */
export const gabaritModele = (m: Pick<ModeleManifeste, 'gabarit'>): Gabarit => m.gabarit ?? 'classique';
/** Variantes de sections effectives d'un modèle ; null pour le gabarit classique (rendu historique, inchangé). */
export function variantesModele(m: Pick<ModeleManifeste, 'gabarit' | 'variantes'>): Variantes | null {
  const g = gabaritModele(m);
  return g === 'classique' ? null : { ...VARIANTES_PAR_DEFAUT[g], ...(m.variantes ?? {}) };
}
/** Sections dont la variante s'applique aussi au gabarit classique (présentation des sujets seulement) */
export const VARIANTES_CLASSIQUE: readonly SectionVariable[] = ['sujets', 'soins-forme', 'theme', 'article'];
/** Forme des cartes (tous gabarits) ; défaut : celle du modèle */
export const formeDesCartes = (m: Pick<ModeleManifeste, 'variantes'>): Variantes['soins-forme'] =>
  (VARIANTES_SECTIONS['soins-forme'] as readonly string[]).includes(m.variantes?.['soins-forme'] as string) ? m.variantes!['soins-forme']! : 'gabarit';
/** Variante de présentation des sujets (tous gabarits, classique compris) ; défaut : « une » */
export const varianteSujets = (m: Pick<ModeleManifeste, 'variantes'>): Variantes['sujets'] =>
  (VARIANTES_SECTIONS.sujets as readonly string[]).includes(m.variantes?.sujets as string) ? m.variantes!.sujets! : 'une';
/** Présentation de la page d'un sujet (tous gabarits, classique compris) ; défaut : « liste » */
export const varianteTheme = (m: Pick<ModeleManifeste, 'variantes'>): Variantes['theme'] =>
  (VARIANTES_SECTIONS.theme as readonly string[]).includes(m.variantes?.theme as string) ? m.variantes!.theme! : 'liste';
/** Présentation de la page d'un article (tous gabarits) ; défaut : « standard » */
export const varianteArticle = (m: Pick<ModeleManifeste, 'variantes'>): Variantes['article'] =>
  (VARIANTES_SECTIONS.article as readonly string[]).includes(m.variantes?.article as string) ? m.variantes!.article! : 'standard';
/** Variantes reçues (brouillon, recette) : sections et valeurs connues seulement ; classique : `sujets` seulement */
export function variantesValides(v: unknown, gabarit: Gabarit = 'tableau'): Partial<Variantes> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const r: Record<string, string> = {};
  for (const [s, x] of Object.entries(v as Record<string, unknown>)) {
    const possibles = (VARIANTES_SECTIONS as Record<string, readonly string[]>)[s];
    if (!possibles || typeof x !== 'string' || !possibles.includes(x)) continue;
    if (gabarit === 'classique' && !VARIANTES_CLASSIQUE.includes(s as SectionVariable)) continue;
    r[s] = x;
  }
  return r as Partial<Variantes>;
}

export const POLICES_TITRES = ['inter', 'manrope', 'fraunces', 'instrument', 'schibsted', 'nunito', 'geist', 'publicsans', 'bodoni'] as const;
export type PoliceTitres = (typeof POLICES_TITRES)[number];
export const POLICES_TEXTE = ['inter', 'manrope', 'nunito', 'geist', 'publicsans', 'newsreader'] as const;
export type PoliceTexte = (typeof POLICES_TEXTE)[number];
/**
 * Paires de polices du studio de recettes (titre / texte), toutes déjà auto-hébergées (@fontsource, sous-ensemble latin, une
 * police variable par famille) : 2 familles au plus par site (une seule pour les paires « mono-famille »), plus la mono du
 * registre relevé seulement (lectures de données). Appliquées par les jetons policeTitres / policeTexte / graisseTitres
 * (variables CSS --police-titres, --police-texte, --graisse-titres : gabarits Astro et aperçu de l'admin). Sobres et pro :
 * aucune police fantaisie. Ajouter une paire = deux polices déjà installées (POLICES_TITRES / POLICES_TEXTE).
 */
export const PAIRES_POLICES = [
  { id: 'grotesque', nom: 'Grotesque affirmée', titres: 'schibsted', texte: 'inter', graisse: 750, description: 'Schibsted Grotesk / Inter : net, technique' },
  { id: 'geometrique', nom: 'Géométrique nette', titres: 'geist', texte: 'geist', graisse: 650, description: 'Geist seule : moderne, très lisible sur téléphone' },
  { id: 'publique', nom: 'Publique lisible', titres: 'publicsans', texte: 'publicsans', graisse: 750, description: 'Public Sans seule : institutionnelle, gros caractères' },
  { id: 'revue', nom: 'Revue à empattements', titres: 'bodoni', texte: 'newsreader', graisse: 500, description: 'Bodoni Moda / Newsreader : éditorial élégant' },
  { id: 'editoriale', nom: 'Éditoriale chaleureuse', titres: 'fraunces', texte: 'inter', graisse: 420, description: 'Fraunces / Inter : serif douce, texte neutre' },
  { id: 'douce', nom: 'Douce arrondie', titres: 'manrope', texte: 'manrope', graisse: 600, description: 'Manrope seule : arrondie, apaisante' },
  { id: 'serif-fine', nom: 'Serif fine', titres: 'instrument', texte: 'inter', graisse: 400, description: 'Instrument Serif / Inter : grands titres fins' },
  { id: 'ronde', nom: 'Ronde pédagogique', titres: 'nunito', texte: 'nunito', graisse: 750, description: 'Nunito seule : ronde, rassurante' },
  { id: 'clinique', nom: 'Clinique sobre', titres: 'inter', texte: 'inter', graisse: 560, description: 'Inter seule : clinique, neutre' },
] as const satisfies readonly { id: string; nom: string; titres: PoliceTitres; texte: PoliceTexte; graisse: number; description: string }[];
export type PairePolices = (typeof PAIRES_POLICES)[number];
export type IdPairePolices = PairePolices['id'];
export const pairePolices = (id: unknown): PairePolices | undefined => PAIRES_POLICES.find((p) => p.id === id);
/** Paire de polices d'un modèle (celle dont titres et texte correspondent), sinon undefined */
export const paireDuModele = (m: Pick<ModeleManifeste, 'jetons'>): PairePolices | undefined =>
  PAIRES_POLICES.find((p) => p.titres === m.jetons.policeTitres && p.texte === m.jetons.policeTexte);
/** Modèle avec une paire de polices (jetons de police et graisse des titres) ; paire inconnue : inchangé */
export function avecPolices<M extends Pick<ModeleManifeste, 'jetons'>>(m: M, id: unknown): M {
  const p = pairePolices(id);
  return p ? { ...m, jetons: { ...m.jetons, policeTitres: p.titres, policeTexte: p.texte, graisseTitres: p.graisse } } : m;
}

/** Traitement appliqué aux photos pour l'unité graphique du style */
export const TRAITEMENTS_IMAGES = ['naturel', 'chaud', 'doux', 'contraste'] as const;
export type TraitementImages = (typeof TRAITEMENTS_IMAGES)[number];
/**
 * Texture discrète des sections alternées et des surfaces « plan » : quadrillage de plan d'architecte,
 * trame hexagonale de points (relevé de baropodométrie), courbes de niveau (semelle thermoformée), ou rien.
 */
export const MOTIFS = ['plan', 'trame', 'courbes', 'aucun'] as const;
export type Motif = (typeof MOTIFS)[number];
/**
 * Traitement de la marque du logo (logos.ts) : « plein » = marque claire sur une tuile à la couleur du
 * cabinet ; « trait » = marque à la couleur du cabinet, sans tuile ; « plan » = marque sur tuile « plan
 * d'architecte », points de pression en couleurs de données.
 */
export const TRAITEMENTS_MARQUE = ['plein', 'trait', 'plan'] as const;
export type TraitementMarque = (typeof TRAITEMENTS_MARQUE)[number];

export type ModeleManifeste = {
  /** Identifiant stable (minuscules, chiffres, tirets) */
  id: string;
  nom: string;
  description: string;
  /**
   * Effet recherché, en quelques mots (« Moderne et technique », « Simple et rassurant ») : c'est par lui que le
   * praticien choisit son modèle dans le formulaire. Facultatif (sinon le nom). 40 caractères maximum.
   */
  effet?: string;
  version: number;
  /** Gabarit de mise en page (défaut : classique). Hors classique, `accueil.hero`, `competences` et `entete` sont ignorés. */
  gabarit?: Gabarit;
  /** Variantes des sections (gabarits autres que classique) ; absentes : celles du gabarit (VARIANTES_PAR_DEFAUT) */
  variantes?: Partial<Variantes>;
  /** En-tête : opaque, ou transparent sur l'image d'accueil puis opaque au défilement */
  entete: 'opaque' | 'transparent';
  accueil: {
    /** diaporama plein écran, photo unique plein écran, titre + photo côte à côte, ou grande photo du lieu */
    hero: Hero;
    /** Assombrissement de l'image d'accueil pour la lisibilité du titre (0 à 90 %) */
    voile: number;
    /** Ordre des sections sous l'en-tête d'accueil */
    sections: SectionAccueil[];
    /**
     * « Venir au cabinet » (horaires, adresse) juste sous le premier écran, avant les sujets (studio de recettes) ; facultatif.
     * Même contenu et mêmes intertitres (H2 au même niveau) : seul l'ordre change.
     */
    infosEnTete?: boolean;
  };
  competences: 'liste' | 'cartes';
  /** Pied de page : sombre (encre), à la couleur du cabinet, ou clair */
  pied: 'sombre' | 'accent' | 'clair';
  /** Apparition des sections au défilement */
  animations: 'douces' | 'aucune';
  /** Couleur proposée au praticien quand il choisit ce modèle (#rrggbb), facultatif */
  couleurConseillee?: string;
  /** Gammes de couleurs recommandées avec ce modèle (identifiants de GAMMES), facultatif */
  gammes?: string[];
  jetons: {
    policeTitres: PoliceTitres;
    policeTexte: PoliceTexte;
    /** Graisse des titres (300 à 800) */
    graisseTitres: number;
    /** Arrondi des cartes et images, en px (0 à 40) */
    rayon: number;
    /** Forme des boutons */
    boutons: 'pilule' | 'arrondi' | 'carre';
    /** « couleur » : boutons à la couleur du cabinet ; « encre » : boutons bleu nuit */
    accent: 'couleur' | 'encre';
    /** Fond des pages (#rrggbb) */
    fond: string;
    /** Traitement des photos : naturel, chaud (beige, terracotta), doux (pastel), contraste (profond) */
    images: TraitementImages;
    /** Fond des sections alternées (#rrggbb), facultatif (sinon teinte de la couleur du cabinet) */
    fondDoux?: string;
    /** Texture des sections (défaut : plan) */
    motif?: Motif;
    /** Fond des surfaces sombres « plan d'architecte » (#rrggbb), facultatif (sinon couleur du cabinet assombrie) */
    plan?: string;
    /** Couleur des lectures de données sur fond sombre : légendes, lignes de scan (#rrggbb), facultatif */
    signal?: string;
    /**
     * « gamme » : surfaces sombres (plan, nuit, pied de page), signal, quadrillage et palette de pression TOUS dérivés de la
     * gamme du cabinet (ou de sa couleur libre) — aucune couleur fixe de la charte (signal menthe, palette bleu → rouge) ne
     * s'y mêle. Voir teinteSombre (gammes.ts). Facultatif (défaut : couleurs fixes de la charte).
     */
    teinte?: 'gamme';
    /** Traitement de la marque du logo, facultatif (sinon déduit des autres jetons : voir traitementLogo) */
    logo?: TraitementMarque;
    /** Registre des illustrations, animations, matériel et bibliothèque (défaut : releve) */
    registre?: Registre;
  };
};

const TOUTES = [...SECTIONS_ACCUEIL];

export const MODELES_INTEGRES: ModeleManifeste[] = [
  {
    id: 'proximite',
    nom: 'Proximité',
    effet: 'Clair et factuel',
    description: 'Clair et factuel, aux couleurs du cabinet. Titre et photo côte à côte, typographie grotesque affirmée.',
    version: 2,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: TOUTES },
    competences: 'liste',
    pied: 'sombre',
    animations: 'douces',
    gammes: ['canard', 'cobalt', 'ardoise', 'sauge'],
    jetons: { policeTitres: 'schibsted', policeTexte: 'inter', graisseTitres: 750, rayon: 18, boutons: 'pilule', accent: 'couleur', fond: '#ffffff', images: 'naturel', fondDoux: '#eef1f4', motif: 'trame', signal: '#6ff2c2', logo: 'plein' },
  },
  {
    id: 'premium',
    nom: 'Médical premium',
    effet: 'Moderne et technique',
    description: 'Bleu nuit et typographie fine, esprit clinique haut de gamme.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: TOUTES },
    competences: 'liste',
    pied: 'sombre',
    animations: 'douces',
    gammes: ['encre', 'cobalt', 'ardoise'],
    jetons: { policeTitres: 'inter', policeTexte: 'inter', graisseTitres: 500, rayon: 14, boutons: 'arrondi', accent: 'encre', fond: '#ffffff', images: 'naturel', fondDoux: '#f4f5f4', motif: 'plan', plan: '#123c8c', signal: '#6ff2c2', logo: 'trait' },
  },
  {
    id: 'prestige',
    nom: 'Prestige',
    effet: 'Élégant et immersif',
    description: 'Diaporama plein écran, en-tête transparent, grands titres élégants.',
    version: 1,
    entete: 'transparent',
    accueil: { hero: 'diaporama', voile: 55, sections: ['faits', 'competences', 'praticiens', 'panorama', 'galerie', 'actualites', 'acces', 'faq'] },
    competences: 'cartes',
    pied: 'sombre',
    animations: 'douces',
    gammes: ['canard', 'prune', 'encre', 'sable'],
    jetons: { policeTitres: 'fraunces', policeTexte: 'inter', graisseTitres: 420, rayon: 6, boutons: 'pilule', accent: 'couleur', fond: '#ffffff', images: 'contraste', fondDoux: '#f6f3ee', motif: 'courbes', signal: '#e9c98f', logo: 'trait' },
  },
  {
    id: 'zen',
    nom: 'Zen',
    effet: 'Doux et apaisant',
    description: 'Tons pastel et grande photo apaisante, typographie légère, formes très arrondies.',
    version: 1,
    entete: 'transparent',
    accueil: { hero: 'plein', voile: 35, sections: ['competences', 'faits', 'praticiens', 'panorama', 'acces', 'galerie', 'actualites', 'faq'] },
    competences: 'cartes',
    pied: 'accent',
    animations: 'douces',
    couleurConseillee: '#2f6f6a',
    gammes: ['sauge', 'canard', 'sable'],
    jetons: { policeTitres: 'manrope', policeTexte: 'manrope', graisseTitres: 300, rayon: 30, boutons: 'pilule', accent: 'couleur', fond: '#fbfcfb', images: 'doux', fondDoux: '#eef4f1', motif: 'courbes', signal: '#bdf0da', logo: 'plein' },
  },
  {
    id: 'atelier',
    nom: 'Atelier',
    effet: 'Chaleureux et éditorial',
    description: 'Beige chaud et terracotta, esprit maison de design : serif éditoriale, angles nets.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: ['faits', 'competences', 'panorama', 'praticiens', 'galerie', 'acces', 'actualites', 'faq'] },
    competences: 'liste',
    pied: 'clair',
    animations: 'douces',
    couleurConseillee: '#b0583a',
    gammes: ['terracotta', 'sable', 'prune'],
    jetons: { policeTitres: 'instrument', policeTexte: 'inter', graisseTitres: 400, rayon: 2, boutons: 'carre', accent: 'couleur', fond: '#f7f2ec', images: 'chaud', fondDoux: '#efe6dc', motif: 'plan', plan: '#3a1f17', signal: '#f2b880', logo: 'plan' },
  },
  {
    // Registre pédagogique : pour les cabinets qui veulent un site simple, lisible et rassurant (patientèle âgée,
    // cabinet de village). L'accueil est la photo du lieu ; les sections sont courtes ; aucune lecture de données.
    // Toutes les sections porteuses d'un intertitre sont présentes (SEO identique aux autres modèles).
    id: 'simple',
    nom: 'Simple et pédagogique',
    effet: 'Simple et rassurant',
    description: 'Grande photo du lieu, téléphone bien visible, textes courts en gros caractères, schémas explicatifs calmes.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'lieu', voile: 0, sections: ['competences', 'etapes', 'faq', 'praticiens', 'panorama', 'galerie', 'acces', 'actualites'] },
    competences: 'liste',
    pied: 'clair',
    animations: 'aucune',
    couleurConseillee: '#3f6b4f',
    gammes: ['sauge', 'canard', 'sable', 'ardoise'],
    jetons: { policeTitres: 'nunito', policeTexte: 'nunito', graisseTitres: 750, rayon: 16, boutons: 'arrondi', accent: 'couleur', fond: '#fcfcfa', images: 'naturel', fondDoux: '#f1f4ef', motif: 'aucun', logo: 'plein', registre: 'pedagogique' },
  },
  {
    // Gabarit « tableau » : cartes arrondies sur un fond teinté de la couleur du cabinet, premier écran en aplat de couleur,
    // bulles de navigation (Soins, Pour qui, Infos pratiques), une idée par carte (docs/directions : règles de clarté v2).
    // Toutes les sections porteuses d'un intertitre sont présentes (SEO identique).
    id: 'tableau',
    nom: 'Tableau',
    effet: 'Clair et pratique',
    description: 'Cartes arrondies et bulles : toutes les infos utiles en un coup d’œil, pensé pour le téléphone.',
    version: 1,
    gabarit: 'tableau',
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: ['competences', 'acces', 'praticiens', 'panorama', 'galerie', 'faq', 'actualites'] },
    competences: 'cartes',
    pied: 'clair',
    animations: 'aucune',
    couleurConseillee: '#2d5bff',
    // Gammes vitaminées (2026) d'abord : un aplat vif court, bulles en duo ; éviter les grands aplats rose-rouge (pastèque, corail).
    gammes: ['cobalt-abricot', 'lavande', 'menthe', 'mangue', 'cobalt', 'canard'],
    jetons: { policeTitres: 'geist', policeTexte: 'geist', graisseTitres: 650, rayon: 24, boutons: 'pilule', accent: 'couleur', fond: '#ffffff', images: 'naturel', motif: 'aucun', logo: 'plein', registre: 'ligne' },
  },
  {
    // Gabarit « village » : une colonne, texte à 20 px, premier écran en notice (qui, où, soins) et deux gros boutons ;
    // « Venir au cabinet » avec le plan tiré des vraies rues (jamais inventé). Schémas pédagogiques calmes, aucune animation.
    id: 'village',
    nom: 'Village',
    effet: 'Simple et proche',
    description: 'Une colonne en gros caractères, le téléphone et l’accès bien visibles : pour une patientèle de quartier ou de bourg.',
    version: 1,
    gabarit: 'village',
    entete: 'opaque',
    accueil: { hero: 'lieu', voile: 0, sections: ['competences', 'acces', 'praticiens', 'panorama', 'galerie', 'faq', 'actualites'] },
    competences: 'liste',
    pied: 'clair',
    animations: 'aucune',
    couleurConseillee: '#3e5568',
    gammes: ['tournesol', 'menthe', 'cobalt-abricot', 'pistache', 'ardoise', 'sauge'],
    jetons: { policeTitres: 'publicsans', policeTexte: 'publicsans', graisseTitres: 750, rayon: 14, boutons: 'arrondi', accent: 'couleur', fond: '#ffffff', images: 'naturel', motif: 'aucun', logo: 'plein', registre: 'pedagogique' },
  },
  {
    // Gabarit « revue » : éditorial élégant et humble. Deux familles (Bodoni Moda pour les titres, Newsreader pour le texte),
    // papier blanc cassé, colonnes de journal (chiffre romain et titre à gauche, contenu à droite ; une colonne sur téléphone),
    // bulles à filet fin, un seul dessin au trait sur l'aplat pastel du premier écran, aucune animation (règles de clarté v2).
    id: 'revue',
    nom: 'Revue',
    effet: 'Élégant et sobre',
    description: 'Une mise en page de revue : grands titres à empattements, beaucoup d’air, filets fins et un dessin au trait.',
    version: 1,
    gabarit: 'revue',
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: ['competences', 'acces', 'praticiens', 'panorama', 'galerie', 'faq', 'actualites'] },
    competences: 'liste',
    pied: 'clair',
    animations: 'aucune',
    couleurConseillee: '#a8472a',
    // Gammes vitaminées (2026) : aplat pastel au premier écran, bouton dans la couleur du duo la plus contrastée.
    gammes: ['mangue', 'corail-nuit', 'menthe', 'tournesol'],
    jetons: { policeTitres: 'bodoni', policeTexte: 'newsreader', graisseTitres: 500, rayon: 4, boutons: 'pilule', accent: 'couleur', fond: '#fcfaf6', images: 'naturel', motif: 'aucun', logo: 'plein', registre: 'ligne' },
  },
  {
    // « Technique et précis » (2026-10-06, demande de Paul) : l'ADN « laboratoire d'analyse » de la marque dans le gabarit
    // classique — premier écran plein écran sombre (plan d'architecte) avec l'animation de points de pression du sujet n° 1
    // (podoscope, coureur, semelle, premiers pas), trame hexagonale de points en motif, grotesque grasse et serrée, relevés
    // sobres ; sujets en grands blocs, menu transparent sur le premier écran.
    id: 'technique',
    nom: 'Technique',
    effet: 'Technique et précis',
    description: 'Plein écran sombre façon laboratoire d’analyse : trame de points de pression, animation du sujet principal, grotesque grasse.',
    version: 1,
    entete: 'transparent',
    // Pas de bande « En bref » (retour de l'atelier du 2026-10-07, deux fois : « pas fan de la section En bref ») : à la place,
    // le premier rendez-vous en trois étapes (prendre rendez-vous, venir, la consultation), utile au patient.
    accueil: { hero: 'diaporama', voile: 55, sections: ['competences', 'etapes', 'praticiens', 'panorama', 'galerie', 'actualites', 'acces', 'faq'] },
    competences: 'cartes',
    pied: 'sombre',
    animations: 'douces',
    couleurConseillee: '#1f4fbf',
    gammes: ['cobalt', 'encre', 'canard', 'ardoise', 'cobalt-abricot', 'menthe', 'pasteque'],
    // Teinte « gamme » (retour de Paul, 2026-10-06 : « du bleu et du vert mélangés ») : fonds sombres, signal, quadrillage et
    // points de pression tirés de la gamme du cabinet, plus de signal menthe fixe.
    jetons: { policeTitres: 'schibsted', policeTexte: 'inter', graisseTitres: 750, rayon: 10, boutons: 'pilule', accent: 'couleur', fond: '#ffffff', images: 'naturel', fondDoux: '#eef1f4', motif: 'trame', teinte: 'gamme', logo: 'plein', registre: 'releve' },
  },
];

/** Effet recherché d'un modèle (choix dans le formulaire du praticien) : celui de la fiche, sinon son nom. */
export const effetModele = (m: Pick<ModeleManifeste, 'nom' | 'effet'>) => m.effet || m.nom;
/** Registre des illustrations d'un modèle (défaut : relevé, pour les fiches antérieures au jeton). */
export const registreModele = (m: Pick<ModeleManifeste, 'jetons'>): Registre => m.jetons.registre ?? 'releve';

const HEX = /^#[0-9a-f]{6}$/i;
const parmi = (v: unknown, valeurs: readonly string[]) => valeurs.includes(v as string);

/**
 * Vérifie une fiche de modèle importée. Retourne la liste des erreurs (vide si valide) et,
 * si elle est valide, la fiche complétée (valeurs par défaut) et réduite aux champs connus.
 */
export function validerManifeste(brut: unknown): { erreurs: string[]; modele?: ModeleManifeste } {
  const e: string[] = [];
  const m = brut as Partial<ModeleManifeste> | null;
  if (!m || typeof m !== 'object') return { erreurs: ['La fiche doit être un objet JSON.'] };
  if (typeof m.id !== 'string' || !/^[a-z0-9-]{3,40}$/.test(m.id)) e.push('« id » : 3 à 40 caractères (minuscules, chiffres, tirets).');
  if (typeof m.nom !== 'string' || !m.nom.trim() || m.nom.length > 60) e.push('« nom » : obligatoire, 60 caractères maximum.');
  if (typeof m.description !== 'string' || m.description.length > 200) e.push('« description » : 200 caractères maximum.');
  if (m.effet !== undefined && (typeof m.effet !== 'string' || m.effet.length > 40)) e.push('« effet » : 40 caractères maximum.');
  if (!Number.isInteger(m.version) || (m.version as number) < 1) e.push('« version » : entier positif.');
  if (!parmi(m.entete, ['opaque', 'transparent'])) e.push('« entete » : « opaque » ou « transparent ».');
  const gabarit = m.gabarit ?? 'classique';
  if (!parmi(gabarit, GABARITS)) e.push(`« gabarit » : ${GABARITS.join(', ')}.`);
  if (m.variantes !== undefined) {
    if (!m.variantes || typeof m.variantes !== 'object' || Array.isArray(m.variantes)) e.push('« variantes » : objet { section: variante }.');
    else if (gabarit === 'classique' && Object.keys(m.variantes).some((s) => !VARIANTES_CLASSIQUE.includes(s as SectionVariable))) e.push('« variantes » : réservées aux gabarits autres que « classique » (sauf « sujets »).');
    else {
      for (const [s, v] of Object.entries(m.variantes)) {
        const possibles = (VARIANTES_SECTIONS as Record<string, readonly string[]>)[s];
        if (!possibles) e.push(`Variante pour une section inconnue : ${s}. Possibles : ${Object.keys(VARIANTES_SECTIONS).join(', ')}.`);
        else if (!parmi(v, possibles)) e.push(`« variantes.${s} » : ${possibles.join(', ')}.`);
      }
    }
  }
  if (!m.accueil || !parmi(m.accueil.hero, HEROS)) e.push(`« accueil.hero » : ${HEROS.join(', ')}.`);
  const voile = m.accueil?.voile ?? 50;
  if (!Number.isInteger(voile) || voile < 0 || voile > 90) e.push('« accueil.voile » : entre 0 et 90.');
  const sections = m.accueil?.sections;
  if (!Array.isArray(sections) || sections.length === 0) e.push('« accueil.sections » : liste non vide.');
  else {
    const inconnues = sections.filter((s) => !parmi(s, SECTIONS_ACCUEIL));
    if (inconnues.length) e.push(`Sections inconnues : ${inconnues.join(', ')}. Possibles : ${SECTIONS_ACCUEIL.join(', ')}.`);
    if (new Set(sections).size !== sections.length) e.push('Une section ne peut apparaître qu’une fois.');
    for (const requise of ['competences', 'acces'] as const) {
      if (!sections.includes(requise)) e.push(`La section « ${requise} » est obligatoire (contenu utile au référencement local).`);
    }
  }
  if (!parmi(m.competences, ['liste', 'cartes'])) e.push('« competences » : « liste » ou « cartes ».');
  const pied = m.pied ?? 'sombre';
  if (!parmi(pied, ['sombre', 'accent', 'clair'])) e.push('« pied » : « sombre », « accent » ou « clair ».');
  const animations = m.animations ?? 'douces';
  if (!parmi(animations, ['douces', 'aucune'])) e.push('« animations » : « douces » ou « aucune ».');
  if (m.couleurConseillee !== undefined && !HEX.test(m.couleurConseillee)) e.push('« couleurConseillee » : couleur au format #rrggbb.');
  if (m.gammes !== undefined && (!Array.isArray(m.gammes) || m.gammes.some((g) => !GAMMES.some((x) => x.id === g)))) {
    e.push(`« gammes » : liste parmi ${GAMMES.map((g) => g.id).join(', ')}.`);
  }
  const j = m.jetons;
  if (!j) e.push('« jetons » : obligatoire.');
  else {
    if (!parmi(j.policeTitres, POLICES_TITRES)) e.push(`« jetons.policeTitres » : ${POLICES_TITRES.join(', ')}.`);
    if (j.policeTexte !== undefined && !parmi(j.policeTexte, POLICES_TEXTE)) e.push(`« jetons.policeTexte » : ${POLICES_TEXTE.join(' ou ')}.`);
    if (!Number.isInteger(j.graisseTitres) || j.graisseTitres < 300 || j.graisseTitres > 800) e.push('« jetons.graisseTitres » : entre 300 et 800.');
    if (!Number.isInteger(j.rayon) || j.rayon < 0 || j.rayon > 40) e.push('« jetons.rayon » : entre 0 et 40.');
    if (j.boutons !== undefined && !parmi(j.boutons, ['pilule', 'arrondi', 'carre'])) e.push('« jetons.boutons » : « pilule », « arrondi » ou « carre ».');
    if (!parmi(j.accent, ['couleur', 'encre'])) e.push('« jetons.accent » : « couleur » ou « encre ».');
    if (j.fond !== undefined && !HEX.test(j.fond)) e.push('« jetons.fond » : couleur au format #rrggbb.');
    if (j.images !== undefined && !parmi(j.images, TRAITEMENTS_IMAGES)) e.push(`« jetons.images » : ${TRAITEMENTS_IMAGES.join(', ')}.`);
    if (j.fondDoux !== undefined && !HEX.test(j.fondDoux)) e.push('« jetons.fondDoux » : couleur au format #rrggbb.');
    if (j.motif !== undefined && !parmi(j.motif, MOTIFS)) e.push(`« jetons.motif » : ${MOTIFS.join(', ')}.`);
    if (j.plan !== undefined && !HEX.test(j.plan)) e.push('« jetons.plan » : couleur au format #rrggbb.');
    if (j.signal !== undefined && !HEX.test(j.signal)) e.push('« jetons.signal » : couleur au format #rrggbb.');
    if (j.teinte !== undefined && j.teinte !== 'gamme') e.push('« jetons.teinte » : « gamme » (ou absent).');
    if (j.logo !== undefined && !parmi(j.logo, TRAITEMENTS_MARQUE)) e.push(`« jetons.logo » : ${TRAITEMENTS_MARQUE.join(', ')}.`);
    if (j.registre !== undefined && !parmi(j.registre, REGISTRES_MODELE)) e.push(`« jetons.registre » : ${REGISTRES_MODELE.join(' ou ')}.`);
  }
  if (e.length) return { erreurs: e };

  // Valeurs par défaut pour les champs facultatifs ; aucun champ inconnu n'est conservé.
  const v = m as ModeleManifeste;
  return {
    erreurs: [],
    modele: {
      id: v.id,
      nom: v.nom.trim(),
      description: v.description,
      ...(v.effet?.trim() ? { effet: v.effet.trim() } : {}),
      version: v.version,
      ...(gabarit !== 'classique' ? { gabarit } : {}),
      ...(v.variantes && Object.keys(v.variantes).length ? { variantes: { ...v.variantes } } : {}),
      entete: v.entete,
      accueil: { hero: v.accueil.hero, voile, sections: v.accueil.sections, ...(v.accueil.infosEnTete === true ? { infosEnTete: true } : {}) },
      competences: v.competences,
      pied,
      animations,
      ...(v.couleurConseillee ? { couleurConseillee: v.couleurConseillee } : {}),
      ...(v.gammes?.length ? { gammes: v.gammes } : {}),
      jetons: {
        policeTitres: v.jetons.policeTitres,
        policeTexte: v.jetons.policeTexte ?? 'inter',
        graisseTitres: v.jetons.graisseTitres,
        rayon: v.jetons.rayon,
        boutons: v.jetons.boutons ?? 'pilule',
        accent: v.jetons.accent,
        fond: v.jetons.fond ?? '#ffffff',
        images: v.jetons.images ?? 'naturel',
        ...(v.jetons.fondDoux ? { fondDoux: v.jetons.fondDoux } : {}),
        motif: v.jetons.motif ?? 'plan',
        ...(v.jetons.plan ? { plan: v.jetons.plan } : {}),
        ...(v.jetons.signal ? { signal: v.jetons.signal } : {}),
        ...(v.jetons.teinte === 'gamme' ? { teinte: 'gamme' as const } : {}),
        ...(v.jetons.logo ? { logo: v.jetons.logo } : {}),
        registre: v.jetons.registre ?? 'releve',
      },
    },
  };
}

export const modeleIntegre = (id: string) => MODELES_INTEGRES.find((m) => m.id === id) ?? MODELES_INTEGRES[0];
