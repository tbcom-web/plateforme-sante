// Variantes du PREMIER ÉCRAN ajoutées le 2026-10-07 (demande de Paul : « un style de héros différent avec photo plein écran
// en arrière-plan / diaporama de photos avec transitions super cool », puis veille des tendances 2026 : héros typographique,
// dégradé maillé et photo masquée, bento) et leurs sous-ingrédients (transition du diaporama, transitions entre sections).
// Constantes seules (aucun import) : modeles.ts les reprend dans VARIANTES_SECTIONS sans dépendance circulaire. Rendu :
// heros-photo.ts (balisage et feuille partagés par le site Astro et l'aperçu de l'admin).

/** Premiers écrans qui demandent des photos (style « Photos » de la recette, ou photos importées par le praticien) */
export const PREMIERS_ECRANS_PHOTO = [
  // Retour de Paul (2026-10-07) : « davantage un effet FONDU, des FORMATS DYNAMIQUES qui rappellent la vitesse, le sport, ou des
  // formes organiques » : en tête
  'fondu', 'fondu-double', 'voile-degrade', 'oblique', 'parallelogramme', 'organique', 'organique-fondu',
  'photo-gauche', 'photo-centre', 'photo-bas', 'diaporama', 'scinde-photo',
] as const;
/** Premiers écrans sans photo obligatoire (la photo est prise si elle existe, sinon l'illustration du sujet) */
export const PREMIERS_ECRANS_LIBRES = ['typographique', 'maille', 'bento'] as const;
/** Toutes les nouvelles variantes (rendues par heros-photo.ts, tous gabarits, classique compris) */
export const PREMIERS_ECRANS_NOUVEAUX = [...PREMIERS_ECRANS_LIBRES, ...PREMIERS_ECRANS_PHOTO] as const;
export type PremierEcranNouveau = (typeof PREMIERS_ECRANS_NOUVEAUX)[number];
export const estPremierEcranNouveau = (v: unknown): v is PremierEcranNouveau => (PREMIERS_ECRANS_NOUVEAUX as readonly unknown[]).includes(v);
export const estPremierEcranPhoto = (v: unknown): boolean => (PREMIERS_ECRANS_PHOTO as readonly unknown[]).includes(v);
/** Premiers écrans dont les photos défilent (sous-ingrédient « transition ») */
export const PREMIERS_ECRANS_ANIMES: readonly string[] = ['diaporama', 'scinde-photo', 'fondu', 'voile-degrade', 'oblique', 'organique'];
export const estPremierEcranAnime = (v: unknown): boolean => PREMIERS_ECRANS_ANIMES.includes(v as string);

/**
 * Transition du diaporama (CSS seulement : opacity, transform, clip-path, filter sur le cadre de la photo) : fondu enchaîné,
 * Ken Burns (zoom et translation lents), glissement, volet (clip-path), rideau (ouverture depuis le centre), fondu flou.
 */
export const TRANSITIONS_DIAPORAMA = ['fondu', 'ken-burns', 'glissement', 'volet', 'rideau', 'flou'] as const;
export type TransitionDiaporama = (typeof TRANSITIONS_DIAPORAMA)[number];

/**
 * Transitions entre les sections (toutes pages, CSS seulement, repli statique) : aucune ; vague (séparateur organique) ;
 * chevauchement (chaque section recouvre légèrement la précédente) ; révélation au défilement (animation-timeline: view()) ;
 * cartes des sujets empilées (position: sticky).
 */
export const TRANSITIONS_SECTIONS = ['aucune', 'vague', 'chevauchement', 'revelation', 'empilees'] as const;
export type TransitionSections = (typeof TRANSITIONS_SECTIONS)[number];

export const LIBELLES_PREMIERS_ECRANS: Record<PremierEcranNouveau, string> = {
  fondu: 'Photo fondue dans la page, côté texte',
  'fondu-double': 'Photo fondue des deux côtés, texte dessous',
  'voile-degrade': 'Photo sous un voile dégradé de la couleur du cabinet',
  oblique: 'Découpe oblique et bandes qui filent (vitesse)',
  parallelogramme: 'Photo en parallélogramme et lignes de vitesse',
  organique: 'Photo dans une forme organique, taches qui respirent',
  'organique-fondu': 'Forme organique qui se fond dans la page',
  typographique: 'Typographique, couleur forte',
  maille: 'Dégradé maillé et visuel masqué',
  bento: 'Bento (cartes en grappe)',
  'photo-gauche': 'Photo plein écran, texte à gauche',
  'photo-centre': 'Photo plein écran, texte centré',
  'photo-bas': 'Photo plein écran, texte en bas',
  diaporama: 'Diaporama plein écran',
  'scinde-photo': 'Photo d’un côté, texte de l’autre',
};
export const LIBELLES_TRANSITIONS_DIAPORAMA: Record<TransitionDiaporama, string> = {
  fondu: 'Fondu enchaîné', 'ken-burns': 'Ken Burns (zoom lent)', glissement: 'Glissement', volet: 'Volet', rideau: 'Rideau', flou: 'Fondu flou',
};
export const LIBELLES_TRANSITIONS_SECTIONS: Record<TransitionSections, string> = {
  aucune: 'Aucune', vague: 'Vague', chevauchement: 'Sections qui se recouvrent', revelation: 'Révélation au défilement', empilees: 'Cartes des sujets empilées',
};

/**
 * Photos de démonstration des tuiles de notation (« Éléments », « Structures de pages ») d'un premier écran à photos : banque
 * intégrée, les mieux notées par Paul (4 ★ : course nette, enfants), jamais de pieds nus en gros plan ni de visage.
 */
export const PHOTOS_DEMO_HEROS = ['/photos/sport-course.webp', '/photos/enfant-herbe.webp', '/photos/enfant-chaussures.webp', '/photos/enfant-chaussons.webp'] as const;

/**
 * Métadonnées des premiers écrans pour l'harmonie des recettes (harmonie.ts) : famille (« vitesse » ↔ Technique net, Graphique
 * pop, sujet sport ; « organique » ↔ Doux et rond, Nature, enfant, bien-être ; « fondu » ↔ Éditorial chic, Classique, Minimal),
 * énergie et rondeur de 0 à 1, expressif (effet marqué : à doser avec des polices et une gamme calmes).
 */
export type FamillePremierEcran = 'fondu' | 'vitesse' | 'organique' | 'sobre';
export const METADONNEES_PREMIERS_ECRANS: Record<PremierEcranNouveau, { famille: FamillePremierEcran; energie: number; rondeur: number; expressif: boolean }> = {
  fondu: { famille: 'fondu', energie: 0.3, rondeur: 0.5, expressif: true },
  'fondu-double': { famille: 'fondu', energie: 0.25, rondeur: 0.5, expressif: true },
  'voile-degrade': { famille: 'fondu', energie: 0.45, rondeur: 0.4, expressif: true },
  oblique: { famille: 'vitesse', energie: 0.9, rondeur: 0.05, expressif: true },
  parallelogramme: { famille: 'vitesse', energie: 0.8, rondeur: 0.1, expressif: true },
  organique: { famille: 'organique', energie: 0.45, rondeur: 0.95, expressif: true },
  'organique-fondu': { famille: 'organique', energie: 0.3, rondeur: 0.9, expressif: true },
  'photo-gauche': { famille: 'sobre', energie: 0.4, rondeur: 0.3, expressif: false },
  'photo-centre': { famille: 'sobre', energie: 0.4, rondeur: 0.3, expressif: false },
  'photo-bas': { famille: 'sobre', energie: 0.35, rondeur: 0.3, expressif: false },
  diaporama: { famille: 'fondu', energie: 0.55, rondeur: 0.3, expressif: true },
  'scinde-photo': { famille: 'sobre', energie: 0.35, rondeur: 0.2, expressif: false },
  typographique: { famille: 'vitesse', energie: 0.7, rondeur: 0.2, expressif: true },
  maille: { famille: 'organique', energie: 0.35, rondeur: 0.85, expressif: true },
  bento: { famille: 'sobre', energie: 0.5, rondeur: 0.6, expressif: false },
};
