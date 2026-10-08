// Variantes du PREMIER ÉCRAN ajoutées le 2026-10-07 (demande de Paul : « un style de héros différent avec photo plein écran
// en arrière-plan / diaporama de photos avec transitions super cool », puis veille des tendances 2026 : héros typographique,
// dégradé maillé et photo masquée, bento) et leurs sous-ingrédients (transition du diaporama, transitions entre sections).
// Constantes seules (aucun import) : modeles.ts les reprend dans VARIANTES_SECTIONS sans dépendance circulaire. Rendu :
// heros-photo.ts (balisage et feuille partagés par le site Astro et l'aperçu de l'admin).

/**
 * Lot 2 des premiers écrans « couleurs / formes organiques » (retour de Paul du 2026-10-08) : AVEC photo (photo découpée en
 * papier, duo de taches, arche, courbe de la voûte) et SANS photo (couleurs et formes seules, pour le style illustrations).
 * Ingrédients « à valider » (INGREDIENTS_A_VALIDER) : disponibles dans le Studio avec un badge, jamais tirés pour un praticien
 * tant que Paul ne les a pas validés.
 */
export const PREMIERS_ECRANS_LOT2_PHOTO = ['decoupe-photo', 'duo-taches', 'arche-photo', 'voute-photo'] as const;
export const PREMIERS_ECRANS_LOT2_LIBRES = ['papier-decoupe', 'tache-morph', 'maille-anime', 'forme-respire', 'bandes-ondulantes', 'voute-aplat'] as const;
export const PREMIERS_ECRANS_LOT2: readonly string[] = [...PREMIERS_ECRANS_LOT2_LIBRES, ...PREMIERS_ECRANS_LOT2_PHOTO];

/** Premiers écrans qui demandent des photos (style « Photos » de la recette, ou photos importées par le praticien) */
export const PREMIERS_ECRANS_PHOTO = [
  // Retour de Paul (2026-10-07) : « davantage un effet FONDU, des FORMATS DYNAMIQUES qui rappellent la vitesse, le sport, ou des
  // formes organiques » : en tête
  'fondu', 'fondu-double', 'voile-degrade', 'oblique', 'parallelogramme', 'organique', 'organique-fondu',
  'photo-gauche', 'photo-centre', 'photo-bas', 'diaporama', 'scinde-photo',
  // Lot 2 (2026-10-08, « j'adore les nouveaux styles de hero couleurs / formes organiques, il faut continuer ») : à valider
  ...PREMIERS_ECRANS_LOT2_PHOTO,
] as const;
/** Premiers écrans sans photo obligatoire (la photo est prise si elle existe, sinon l'illustration du sujet) */
export const PREMIERS_ECRANS_LIBRES = ['typographique', 'maille', 'bento', ...PREMIERS_ECRANS_LOT2_LIBRES] as const;
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
  'decoupe-photo': 'Photo en papier découpé, aplats superposés (à valider)',
  'duo-taches': 'Duo de taches : couleur et photo (à valider)',
  'arche-photo': 'Photo dans une arche, disque de couleur (à valider)',
  'voute-photo': 'Photo épousant la courbe de la voûte (à valider)',
  'papier-decoupe': 'Aplats de couleur en papier découpé, sans photo (à valider)',
  'tache-morph': 'Tache qui se déforme lentement, sans photo (à valider)',
  'maille-anime': 'Dégradé maillé animé de la gamme, sans photo (à valider)',
  'forme-respire': 'Grande forme qui respire derrière le texte (à valider)',
  'bandes-ondulantes': 'Bandes de couleur ondulantes, sans photo (à valider)',
  'voute-aplat': 'Aplat en courbe de voûte et points de pression (à valider)',
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
  'decoupe-photo': { famille: 'organique', energie: 0.5, rondeur: 0.5, expressif: true },
  'duo-taches': { famille: 'organique', energie: 0.45, rondeur: 0.95, expressif: true },
  'arche-photo': { famille: 'organique', energie: 0.3, rondeur: 0.7, expressif: true },
  'voute-photo': { famille: 'organique', energie: 0.35, rondeur: 0.6, expressif: true },
  'papier-decoupe': { famille: 'organique', energie: 0.5, rondeur: 0.6, expressif: true },
  'tache-morph': { famille: 'organique', energie: 0.45, rondeur: 0.95, expressif: true },
  'maille-anime': { famille: 'organique', energie: 0.4, rondeur: 0.85, expressif: true },
  'forme-respire': { famille: 'organique', energie: 0.35, rondeur: 0.95, expressif: true },
  'bandes-ondulantes': { famille: 'organique', energie: 0.6, rondeur: 0.8, expressif: true },
  'voute-aplat': { famille: 'organique', energie: 0.3, rondeur: 0.7, expressif: true },
};

// ---------------------------------------------------------------------------------------------------------------
// Animations d'en-tête (retour de Paul du 2026-10-08 : « d'autres animations stylisées minimalistes et très dynamiques qu'on
// peut intégrer au header ») : formes abstraites seules, SVG / CSS pur, rendues par entete-anim.ts dans le premier écran
// (bande au-dessus du titre, emblème à côté du titre, ou fond). « aucune » par défaut ; toutes « à valider ».
// ---------------------------------------------------------------------------------------------------------------

export const ANIMATIONS_ENTETE = [
  'aucune', 'voute-trace', 'points-pression', 'foulee', 'onde', 'taches', 'mots', 'empreintes', 'rubans', 'geometrie', 'lueur',
  // Famille « empreintes en lignes de niveau » (entete-empreintes.ts, retour de Paul du 2026-10-08 : « j'adore le style des
  // empreintes comme ça ») : contour de la semelle et courbes de niveau du relief, géométries validées, rien de redessiné
  'em-respire', 'em-trace', 'em-deroule', 'em-marche', 'em-petits-pas', 'em-sensibilite', 'em-particules', 'em-topographie', 'em-defilement', 'em-encre',
  // Animations d'ILLUSTRATIONS existantes (animations-lecture.ts : mêmes tracés que l'illustration du sujet), en visuel du héros
  // seulement, et seulement quand leurs images de base sont validées (animations-sources.ts, règle de Paul du 2026-10-07)
  'il-semelle', 'il-trajectoire', 'il-premiers-pas',
] as const;
export type AnimationEntete = (typeof ANIMATIONS_ENTETE)[number];
export const estAnimationEntete = (v: unknown): v is AnimationEntete => (ANIMATIONS_ENTETE as readonly unknown[]).includes(v);
export const LIBELLES_ANIMATIONS_ENTETE: Record<AnimationEntete, string> = {
  aucune: 'Aucune',
  'voute-trace': 'Trait qui trace la voûte puis s’efface (à valider)',
  'points-pression': 'Points de pression en séquence (à valider)',
  foulee: 'Lignes de foulée rythmées (à valider)',
  onde: 'Onde au sol (à valider)',
  taches: 'Taches qui se rejoignent (à valider)',
  mots: 'Mots des soins en typographie cinétique (à valider)',
  empreintes: 'Pas abstraits qui avancent (à valider)',
  rubans: 'Rubans de couleur (à valider)',
  geometrie: 'Formes géométriques en rotation lente (à valider)',
  lueur: 'Lueur qui suit le pointeur (à valider)',
  'em-respire': 'Empreintes : zones d’appui qui s’allument et respirent (à valider)',
  'em-trace': 'Empreintes : contour qui se dessine, puis les zones (à valider)',
  'em-deroule': 'Empreintes : point lumineux qui suit le déroulé du pas (à valider)',
  'em-marche': 'Empreintes : marche, gauche puis droite (à valider)',
  'em-petits-pas': 'Empreintes : petits pas d’enfant en zigzag (à valider)',
  'em-sensibilite': 'Empreintes : points de la plante qui s’allument un à un (à valider)',
  'em-particules': 'Empreintes : particules qui dessinent les contours (à valider)',
  'em-topographie': 'Empreintes : lignes de niveau en carte de relief (à valider)',
  'em-defilement': 'Empreintes : zones qui s’allument au défilement (à valider)',
  'em-encre': 'Empreintes à l’encre sur fond clair (à valider)',
  'il-semelle': 'Semelle : courbes de relief qui se dessinent (à valider)',
  'il-trajectoire': 'Équilibre : centre de pression qui se déplace (à valider)',
  'il-premiers-pas': 'Premiers pas de l’enfant (à valider)',
};
/**
 * Emplacement : bande au-dessus du titre, emblème à côté du titre, fond du premier écran ; « scene » (empreintes) : en grand dans
 * la carte visuelle du bento, à côté du titre (premier écran « bento ») — ailleurs, en emblème à côté du sur-titre.
 */
export const PLACEMENT_ANIMATIONS_ENTETE: Record<Exclude<AnimationEntete, 'aucune'>, 'bande' | 'embleme' | 'fond' | 'scene'> = {
  'voute-trace': 'embleme', 'points-pression': 'embleme', foulee: 'bande', onde: 'embleme', taches: 'embleme', mots: 'bande', empreintes: 'bande',
  rubans: 'bande', geometrie: 'embleme', lueur: 'fond',
  'em-respire': 'scene', 'em-trace': 'scene', 'em-deroule': 'scene', 'em-marche': 'scene', 'em-petits-pas': 'scene', 'em-sensibilite': 'scene',
  'em-particules': 'scene', 'em-topographie': 'scene', 'em-defilement': 'scene', 'em-encre': 'scene',
  'il-semelle': 'scene', 'il-trajectoire': 'scene', 'il-premiers-pas': 'scene',
};
/** Premiers écrans qui posent une animation « scène » en grand (carte visuelle) ; ailleurs elle passe en emblème */
export const HOTES_SCENE_ENTETE: readonly string[] = ['bento'];
export const METADONNEES_ANIMATIONS_ENTETE: Record<AnimationEntete, { famille: FamillePremierEcran; energie: number; rondeur: number; expressif: boolean }> = {
  aucune: { famille: 'sobre', energie: 0, rondeur: 0.5, expressif: false },
  'voute-trace': { famille: 'sobre', energie: 0.45, rondeur: 0.6, expressif: false },
  'points-pression': { famille: 'sobre', energie: 0.55, rondeur: 0.5, expressif: false },
  foulee: { famille: 'vitesse', energie: 0.9, rondeur: 0.05, expressif: true },
  onde: { famille: 'organique', energie: 0.5, rondeur: 0.9, expressif: false },
  taches: { famille: 'organique', energie: 0.6, rondeur: 1, expressif: true },
  mots: { famille: 'vitesse', energie: 0.85, rondeur: 0.2, expressif: true },
  empreintes: { famille: 'vitesse', energie: 0.7, rondeur: 0.5, expressif: false },
  rubans: { famille: 'organique', energie: 0.8, rondeur: 0.8, expressif: true },
  geometrie: { famille: 'sobre', energie: 0.5, rondeur: 0.3, expressif: false },
  lueur: { famille: 'fondu', energie: 0.35, rondeur: 0.7, expressif: false },
  // Empreintes en lignes de niveau : en grand, ce sont l'élément expressif de l'écran (premier écran calme : bento)
  'em-respire': { famille: 'organique', energie: 0.45, rondeur: 0.8, expressif: true },
  'em-trace': { famille: 'sobre', energie: 0.45, rondeur: 0.7, expressif: true },
  'em-deroule': { famille: 'sobre', energie: 0.5, rondeur: 0.6, expressif: true },
  'em-marche': { famille: 'vitesse', energie: 0.55, rondeur: 0.6, expressif: true },
  'em-petits-pas': { famille: 'organique', energie: 0.7, rondeur: 0.9, expressif: true },
  'em-sensibilite': { famille: 'sobre', energie: 0.25, rondeur: 0.7, expressif: true },
  'em-particules': { famille: 'vitesse', energie: 0.75, rondeur: 0.5, expressif: true },
  'em-topographie': { famille: 'organique', energie: 0.5, rondeur: 0.85, expressif: true },
  'em-defilement': { famille: 'sobre', energie: 0.3, rondeur: 0.7, expressif: true },
  'em-encre': { famille: 'fondu', energie: 0.3, rondeur: 0.7, expressif: true },
  'il-semelle': { famille: 'sobre', energie: 0.4, rondeur: 0.6, expressif: true },
  'il-trajectoire': { famille: 'sobre', energie: 0.45, rondeur: 0.5, expressif: true },
  'il-premiers-pas': { famille: 'organique', energie: 0.5, rondeur: 0.8, expressif: true },
};

/**
 * Animations qui tiennent EN GRAND, à la place de l'illustration ou de la photo du premier écran (visuel-heros = animation) :
 * empreintes en lignes de niveau, formes abstraites qui s'adaptent à leur cadre (taches, onde, formes géométriques) et animations
 * d'illustrations existantes (il-*). Les autres (bandes, emblèmes, lueur) restent des animations d'en-tête.
 */
export const ANIMATIONS_HEROS: readonly AnimationEntete[] = ANIMATIONS_ENTETE.filter((a) => a.startsWith('em-') || a.startsWith('il-') || a === 'taches' || a === 'onde' || a === 'geometrie');
export const estAnimationHeros = (a: unknown): a is AnimationEntete => (ANIMATIONS_HEROS as readonly unknown[]).includes(a);
/** Animations d'illustration et leur animation source (animations-sources.ts : images de base à valider d'abord) */
export const SOURCE_ANIMATION_HEROS: Partial<Record<AnimationEntete, 'semelle' | 'trajectoire' | 'premiers-pas'>> = {
  'il-semelle': 'semelle', 'il-trajectoire': 'trajectoire', 'il-premiers-pas': 'premiers-pas',
};

/**
 * Premiers écrans dont le visuel principal (illustration ou photo) peut être une animation (même cadre, même masque) : gabarits
 * tableau, village, revue (carte, notice, figure) et nouveaux premiers écrans à visuel ; jamais les photos plein écran, le
 * typographique ni les compositions de formes du lot 2.
 */
export const HOTES_VISUEL_ANIME: readonly string[] = ['carte', 'notice', 'figure', 'bento', 'maille', 'scinde-photo', 'fondu', 'fondu-double', 'oblique', 'parallelogramme', 'organique', 'organique-fondu', 'decoupe-photo', 'duo-taches', 'arche-photo', 'voute-photo'];

/** Visuel principal du premier écran : auto (photo si le style est « Photos », sinon illustration), photo, illustration, animation */
export const VISUELS_HEROS = ['auto', 'photo', 'illustration', 'animation'] as const;
export type VisuelHeros = (typeof VISUELS_HEROS)[number];
export const LIBELLES_VISUELS_HEROS: Record<VisuelHeros, string> = {
  auto: 'Selon le style (photo ou illustration)', photo: 'Photo', illustration: 'Illustration', animation: 'Animation (à valider)',
};

/**
 * Ingrédients « à valider » (lot 2 des premiers écrans, animations d'en-tête) : disponibles dans le Studio (libellé « à
 * valider »), dans « Donner mon avis » et les duels ; jamais tirés ni proposés à un praticien tant que Paul ne les a pas validés
 * (ContexteRecette.praticien, recettesPourScenario(…, { praticien })). Une clé validée par Paul passe par `valides` ; une fois
 * validée pour de bon, la retirer de cette liste (et « (à valider) » de son libellé).
 */
import { PORTRAITS_A_VALIDER } from './portraits-variantes';
export const INGREDIENTS_A_VALIDER: ReadonlySet<string> = new Set([
  ...PORTRAITS_A_VALIDER,
  ...PREMIERS_ECRANS_LOT2.map((v) => `composant:accueil:${v}`),
  ...ANIMATIONS_ENTETE.filter((a) => a !== 'aucune').map((a) => `composant:entete-anim:${a}`),
  'composant:visuel-heros:animation',
]);
export const estAValider = (cle: string, valides?: ReadonlySet<string> | null) => INGREDIENTS_A_VALIDER.has(cle) && !valides?.has(cle);

