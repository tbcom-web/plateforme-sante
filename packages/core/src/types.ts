export type Faq = { q: string; r: string };

export type Soin = {
  slug: string;
  titre: string;
  /** Libellé court pour les menus et cartes */
  titreCourt: string;
  resume: string;
  /** Markdown */
  corps: string;
  faq: Faq[];
  /** Icône "prefixe:nom" (voir JEUX_ICONES) ; défaut selon le slug */
  icone?: string;
};

export type Article = {
  slug: string;
  titre: string;
  resume: string;
  /** ISO YYYY-MM-DD */
  date: string;
  theme: string;
  /** Markdown */
  corps: string;
  /** Image 16:9 (WebP 1600 × 900), absolue ou relative au site */
  image?: string;
  /** Texte alternatif de l'image */
  imageAlt?: string;
};

/** Plage d'ouverture, heures « HH:MM » (pas de 15 minutes dans l'éditeur) */
export type Plage = { debut: string; fin: string };
/**
 * Horaires d'un jour. `plages` : modèle structuré (horaires.ts) ; `heures` : texte affiché, recalculé à partir des plages
 * (« 9h00–12h30, 14h00–19h00 » ou « Fermé »). Anciens horaires : `heures` seul, relu par plagesDe.
 */
export type Horaire = { jour: string; heures: string; plages?: Plage[] };

export type SiteConfig = {
  id: string;
  domaine: string;
  /** Site de démonstration : jamais indexé par les moteurs. */
  demo?: boolean;
  /** Date de dernière modification du contenu (ISO YYYY-MM-DD) : dateModified et lastmod ; facultative */
  majLe?: string;
  profession: {
    slug: string;
    libelle: string;
    /** Spécialité schema.org (https://schema.org/MedicalSpecialty) */
    specialiteSchema: string;
  };
  praticien: {
    prenom: string;
    nom: string;
    titre: string;
    rpps: string;
    ordre: string;
    conventionnement: string;
    photo?: string;
    parcours: string;
    formations: string[];
    langues: string[];
  };
  cabinet: {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    quartier: string;
    telephone: string;
    email?: string;
    acces: string[];
    pmr: boolean;
    horaires: Horaire[];
    tarifs: { acte: string; prix: string }[];
    geo?: { lat: number; lng: number };
  };
  rdv: { url: string; plateforme: string };
  theme: {
    couleur: string;
    /** Gamme de couleurs choisie (identifiant de GAMMES) ; prioritaire sur la couleur libre, facultative */
    gamme?: string;
    /** Logo : marque et disposition (logos.ts, validerChoixLogo) ; facultatif, valeur par défaut sinon */
    logo?: import('./logos').ChoixLogo;
    /** Logo existant du cabinet, à la place de la marque générée (complet = le fichier contient le nom) */
    logoPerso?: { url: string; complet: boolean };
    /** Style visuel : 'illustrations' | 'photos' | 'mixte' (par défaut) */
    modeVisuel?: import('./draft').ModeVisuel;
    /** Style d'illustration choisi par le praticien (propositions.ts) : le premier écran honore alors le registre du site */
    styleIllustration?: 'releve' | 'pedagogique' | 'ligne' | 'photos';
    /** Recette du studio : sujet dont le héros illustre le premier écran (sinon le sujet n° 1) et jeu d'effets (effets.ts) */
    herosSujet?: string;
    effets?: string;
    /** Traitement uniforme des photos d'une recette (traitements-photos.ts) ; absent = traitement du modèle */
    traitementPhotos?: { id: string; grain?: boolean };
    /** Habillage d'une recette (habillage.ts) : typographie, jeu de détails, menu ; absents = rendu du modèle */
    typo?: import('./typo').ReglagesTypo;
    details?: import('./details').ReglagesDetails;
    menu?: import('./menus').ReglagesMenu;
    mise_en_page: 'sobre' | 'chaleureux' | 'premium';
    style_images: 'organique' | 'lignes' | 'minimal';
  };
  accroche: { titre: string; texte: string };
  soins: Soin[];
  faqGenerale: Faq[];
  articles: Article[];
  tracking: { ga4?: string; clarity?: string };
  /** creditPhotos : mention des photos sous licence (ex. « Photos : Adobe Stock »), sans nom de fichier */
  mentions: { hebergeur: string; editeur: string; mediateur?: string; creditPhotos?: string };

  // ---- Modèle v2 (référentiel webpodologue) ----
  pays: 'FR' | 'BE' | 'CH';
  voix: 'je' | 'nous' | 'tiers';
  /** Fiche du modèle de présentation (n'influe jamais sur le SEO) */
  modele: import('./modeles').ModeleManifeste;
  /** Titre professionnel selon le pays : « Pédicure-podologue », « Podologue », « Podologue ES » */
  titreMetier: string;
  praticiens: PraticienPublic[];
  lieux: LieuPublic[];
  accesDetail: { pmr: boolean; parking: string; transports: string; autres: string[] };
  rdvMode: 'en_ligne' | 'telephone' | 'les_deux';
  paiements: string[];
  /** Matériel et hygiène : identifiants du catalogue EQUIPEMENTS ; absent = aucun (sites antérieurs) */
  equipements?: string[];
  /** Autre matériel, texte libre (une ligne par élément) */
  equipementsAutres?: string;
  /** jours : jours de visites à domicile (facultatif) ; creneaux en tient compte au chargement */
  domicile: { actif: boolean; creneaux: string; secteurs: string[]; jours?: string[] };
  /** Message temporaire (congés, déménagement), déjà filtré sur sa date de fin */
  message: string;
  communes: string[];
  /** URLs des photos ; vide = photo d'illustration par défaut */
  photos: { accueil: string; panorama: string; cabinet: string[]; /** Photos du praticien par soin (slug → URL), facultatif */ soins?: Record<string, string> };
  /** Marque de logo importée par l'admin, quand le praticien l'a choisie (nettoyée, voir marques-importees.ts) */
  marqueImportee?: import('./marques-importees').MarqueImportee;
  /**
   * Hiérarchie choisie par le praticien (themes.ts) : thèmes principaux (menu, cartes de l'accueil) et secondaires
   * (« Aussi au cabinet ») ; absente = navigation sans thème (Soins, Le cabinet, Infos pratiques).
   */
  priorites?: import('./themes').Priorites;
  /** Textes personnalisés par le praticien (clés de personnalisation.ts) ; absents = texte standard */
  textes?: Record<string, string>;
  /** Pack visuel de la spécialité (photos par défaut) et animation d'accueil retenue (null = aucune) */
  visuels: {
    specialite: string;
    animation: import('./packs').Animation | null;
    /** Animation d'accueil choisie (proposition) : prioritaire sur celle du sujet n° 1 et de la spécialité */
    animationAccueil?: import('./packs').Animation;
    photos: import('./packs').PackVisuel['photos'];
    /** Photos d'une recette du studio (style « photos ») : premier écran et blocs des sujets ; jeu et données structurées inchangés */
    photosRecette?: string[];
    /** Spécialité secondaire (facultative) : complète le jeu visuel (jeux.ts) */
    specialiteSecondaire?: string;
    /** Personnalisations de l'admin (table packs_visuels) de la principale et de la secondaire */
    perso?: import('./packs').PersonnalisationPack | null;
    persoSecondaire?: import('./packs').PersonnalisationPack | null;
  };
};

export type PraticienPublic = {
  prenom: string;
  nom: string;
  statut: 'titulaire' | 'collaborateur' | 'remplacant';
  titre: string;
  /** Lignes d'identification prêtes à afficher (n° d'Ordre, RPPS, INAMI, SSP…) */
  identifiants: string[];
  diplome: string;
  formations: string[];
  /** Libellés des compétences mises en avant */
  orientations: string[];
  sports: string[];
  rdvUrl: string;
  presence: string;
  bio: string;
  photo: string;
  /** Rendus du studio portrait (WebP, plusieurs largeurs, 4:5 et carré) ; absent = photo simple */
  portrait?: import('./portrait').RendusPortrait;
};

export type LieuPublic = {
  type: 'cabinet' | 'maison_sante' | 'pole_sante' | 'centre_medical';
  nom: string;
  adresse: string;
  complement: string;
  codePostal: string;
  ville: string;
  horaires: Horaire[];
  /** Mention « Sur rendez-vous uniquement » sous les horaires */
  surRendezVous?: boolean;
  /** Note courte sous les horaires (« Fermé en août »), facultative */
  noteHoraires?: string;
};
