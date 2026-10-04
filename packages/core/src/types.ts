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

export type Horaire = { jour: string; heures: string };

export type SiteConfig = {
  id: string;
  domaine: string;
  /** Site de démonstration : jamais indexé par les moteurs. */
  demo?: boolean;
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
    /** Style visuel : 'illustrations' | 'photos' | 'mixte' (par défaut) */
    modeVisuel?: import('./draft').ModeVisuel;
    mise_en_page: 'sobre' | 'chaleureux' | 'premium';
    style_images: 'organique' | 'lignes' | 'minimal';
  };
  accroche: { titre: string; texte: string };
  soins: Soin[];
  faqGenerale: Faq[];
  articles: Article[];
  tracking: { ga4?: string; clarity?: string };
  mentions: { hebergeur: string; editeur: string; mediateur?: string };

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
  domicile: { actif: boolean; creneaux: string; secteurs: string[] };
  /** Message temporaire (congés, déménagement), déjà filtré sur sa date de fin */
  message: string;
  communes: string[];
  /** URLs des photos ; vide = photo d'illustration par défaut */
  photos: { accueil: string; panorama: string; cabinet: string[] };
  /** Textes personnalisés par le praticien (clés de personnalisation.ts) ; absents = texte standard */
  textes?: Record<string, string>;
  /** Pack visuel de la spécialité (photos par défaut) et animation d'accueil retenue (null = aucune) */
  visuels: { specialite: string; animation: import('./packs').Animation | null; photos: import('./packs').PackVisuel['photos'] };
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
};

export type LieuPublic = {
  type: 'cabinet' | 'maison_sante' | 'pole_sante' | 'centre_medical';
  nom: string;
  adresse: string;
  complement: string;
  codePostal: string;
  ville: string;
  horaires: Horaire[];
};
