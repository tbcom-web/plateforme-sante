// Moteur de contenus : modèle de données.
//
// Principe (décision de Paul, 2026-10-05 : « la clé est dans la personnalisation instantanée ») :
//   CONTENU  = Sujet (sourcé, rédigé et validé une fois, sans rien du cabinet) ;
//   IDENTITÉ = Identite (nom, praticiens, ville, couleurs, logo, modèle, spécialité, lien du site) ;
//   PUBLICATION = composer(sujet, format) × identité, rendue à la demande par des gabarits purs (gabarits.ts),
//   dans le navigateur (aperçu instantané) comme côté serveur (Playwright → PNG/MP4), sans aucun travail manuel.

import type { ModeleManifeste, ChoixLogo, NomDessin } from '@plateforme/core';

/** Saisons du calendrier éditorial (octobre → septembre) */
export type Saison = 'automne' | 'hiver' | 'printemps' | 'ete' | 'rentree';
/**
 * Spécialité éditoriale d'un sujet. « posture » existe pour les sites (packs.ts) mais ses sujets (posturologie, biomécanique
 * « posturale », réflexologie) sont à faible niveau de preuve : hors du catalogue de départ (décision de Paul, 2026-10-05).
 */
export type SpecialiteContenu = 'generale' | 'sport' | 'enfant' | 'soins' | 'senior' | 'posture';
/** Niveau de preuve du sujet : « faible » = bloqué à la génération sauf activation explicite après validation déontologique */
export type NiveauPreuve = 'etabli' | 'faible';
/** Mois de l'année (1 = janvier) */
export type Mois = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Organismes de 1er rang admis comme source d'une affirmation de santé (lignes rouges ÉcranZen §1, C8) */
export const ORGANISMES = ['Ameli', 'HAS', 'Ordre des pédicures-podologues', 'Légifrance', 'Société savante', 'NHS', 'Santé publique France'] as const;
export type Organisme = (typeof ORGANISMES)[number];

/** Une source consultée : URL exacte, titre de la page, date de mise à jour affichée, date de consultation (ISO). */
export type Source = {
  id: string;
  organisme: Organisme;
  titre: string;
  url: string;
  /** Date de mise à jour affichée par la page, telle quelle (facultative : toutes les pages n'en ont pas) */
  majPage?: string;
  /** Date de consultation (AAAA-MM-JJ) : la source est relue au plus tard 12 mois après */
  consulteLe: string;
};

/** Une affirmation de santé reprise dans le contenu, rattachée à sa source et à l'extrait qui la porte (relu). */
export type Affirmation = {
  /** Ce que dit le contenu (formulation à l'écran ou dans la légende) */
  texte: string;
  /** Identifiant de la source (Sujet.sources) */
  source: string;
  /** Extrait littéral court de la page (≤ 25 mots), relu sur la page le jour de la consultation */
  extrait: string;
};

/** Référence d'un visuel du core : dessin technique, élément de la bibliothèque ÉcranZen ou matériel */
export type VisuelRef =
  | { type: 'dessin'; nom: NomDessin }
  | { type: 'bibliotheque'; id: string; vue?: string; etat?: string }
  | { type: 'equipement'; id: string };

/** Codes des mentions d'orientation figées (référentiel éthique ÉcranZen, mentions.ts) */
export type CodeMention =
  | 'M1' | 'M1-a' | 'M1-b' | 'M1-c'
  | 'M2' | 'M2-a' | 'M2-b' | 'M2-c'
  | 'M3' | 'M3-a' | 'M3-b' | 'M3-c'
  | 'M4c' | 'M4c-a' | 'M4c-b' | 'M4c-c'
  | 'M5';

/** Un point du contenu : une idée = une diapositive (titre court + corps court + visuel) */
/** visuel facultatif : sans visuel, la diapositive est un carton de texte (quand aucun dessin juste n’existe, on n’en force pas un) */
export type Point = { titre: string; texte?: string; visuel?: VisuelRef; alt: string };

/**
 * Sujet éditorial : le CONTENU, indépendant du cabinet. Rédigé à partir des sources (jamais d'une citation non relue),
 * relu par la chaîne éthique, puis décliné automatiquement dans tous les formats et pour toutes les identités.
 */
export type Sujet = {
  /** Identifiant stable (minuscules et tirets) */
  id: string;
  /** Sujet du backlog ÉcranZen d'origine (POD-SUJ-…), quand il existe */
  ecranzen?: string;
  /** Titre éditorial (catalogue, admin) */
  titre: string;
  specialite: SpecialiteContenu;
  /** Niveau de preuve (défaut : établi). « faible » : posturologie, réflexologie, semelles « proprioceptives »… */
  niveauPreuve?: NiveauPreuve;
  saisons: Saison[];
  /** Mois conseillés dans le calendrier (octobre → septembre) */
  mois: Mois[];
  /** Soins liés : slugs du catalogue (jeux.ts VISUELS_SOINS) → lien vers la fiche du site du cabinet */
  soins: string[];
  /** Mention d'orientation (dernière diapositive de contenu, mot pour mot) */
  mention: CodeMention;
  /** M5 seulement : texte propre au sujet, qui finit par « … parlez-en à votre médecin. » */
  texteM5?: string;
  sources: Source[];
  affirmations: Affirmation[];
  /** Couverture : accroche factuelle (≤ 12 mots), sur-titre court facultatif */
  couverture: { surtitre: string; titre: string; visuel: VisuelRef; alt: string };
  /** Diapositives de contenu (2 à 4 points) */
  points: Point[];
  /** « En pratique » : 2 ou 3 gestes courts (≤ 12 mots au total) */
  pratique: string[];
  /** Message clé en une phrase (post 1:1, Story, fiche Google) : ≤ 12 mots */
  messageCle: string;
  /** Corps de la légende Instagram / Facebook (paragraphes ; la mention et le renvoi au site sont ajoutés) */
  legende: string[];
  /** Hashtags thématiques (3 à 6, sans #) */
  hashtags: string[];
  /** Texte de la fiche Google (sans la mention ni le lien, ajoutés à la composition) */
  google: string;
  /** Mots interdits propres au sujet (profil éthique ÉcranZen du sujet) */
  interdits?: string[];
  /** Statut de relecture */
  statut: 'brouillon' | 'a-valider' | 'valide';
  /** Note de relecture (conditions éthiques reprises d'ÉcranZen) */
  conditions?: string;
};

/** Formats de publication et leurs dimensions (px) */
export const FORMATS = {
  carrousel: { largeur: 1080, hauteur: 1350, libelle: 'Carrousel 4:5 (Instagram, Facebook)' },
  post: { largeur: 1080, hauteur: 1080, libelle: 'Post 1:1 (Instagram, Facebook)' },
  story: { largeur: 1080, hauteur: 1920, libelle: 'Story 9:16 (Instagram, Facebook)' },
  google: { largeur: 1200, hauteur: 900, libelle: 'Post de la fiche Google (image 4:3)' },
  reel: { largeur: 1080, hauteur: 1920, libelle: 'Reel 9:16 (MP4)' },
} as const;
export type Format = keyof typeof FORMATS;

/** Rôle d'une diapositive dans une publication */
export type RoleDiapositive = 'couverture' | 'point' | 'pratique' | 'mention' | 'signature' | 'affiche';

/**
 * Diapositive composée (contenu seul : aucune couleur, aucun nom de cabinet). La signature est remplie au rendu
 * à partir de l'identité.
 */
export type Diapositive = {
  role: RoleDiapositive;
  surtitre?: string;
  titre?: string;
  texte?: string;
  liste?: string[];
  /** Lignes de la mention (coupures d'écran du référentiel) */
  mention?: string[];
  visuel?: VisuelRef;
  /** Texte alternatif de l'image (le nom du cabinet y est ajouté au rendu pour la signature) */
  alt: string;
};

/** Publication composée pour un format (contenu seul) */
export type Publication = {
  id: string;
  sujet: string;
  format: Format;
  diapositives: Diapositive[];
  /** Légende sans l'identité (le renvoi au site est posé par personnaliser()) */
  legende: string;
  hashtags: string[];
  /** Slug du soin lié principal (lien vers la fiche) */
  soin?: string;
  /** Texte de la fiche Google (format google) */
  texteGoogle?: string;
  mention: CodeMention;
};

/** Styles de rendu : les trois styles des sites */
export const STYLES = ['releve', 'pedagogique', 'simple'] as const;
export type Style = (typeof STYLES)[number];

/**
 * IDENTITÉ du cabinet : tout ce qui personnalise un contenu. Construite depuis la configuration du site
 * (identiteDepuisSite) ou saisie dans l'admin / l'aperçu gratuit.
 */
export type Identite = {
  /** Nom du cabinet tel qu'affiché */
  nom: string;
  /** Praticiens (« Camille Rousseau ») : 1 ou plusieurs */
  praticiens: string[];
  /** Titre de la profession (« Pédicure-podologue ») */
  metier: string;
  ville: string;
  quartier?: string;
  /** Domaine du site (sans https://) */
  domaine: string;
  /** Lien de prise de rendez-vous : jamais affiché dans un contenu santé (C9), gardé pour la phase 2 */
  lienRdv?: string;
  modele: ModeleManifeste;
  theme: { couleur: string; gamme?: string | null };
  /** Logo : marque dessinée (svgMarque) ou logo existant du cabinet (logoPerso) */
  logo: ChoixLogo;
  logoPerso?: { url: string; complet: boolean };
  specialite: SpecialiteContenu;
  /** Style de rendu (défaut : déduit du modèle) */
  style?: Style;
  /** Soins présents sur le site (slugs) : seuls ceux-là reçoivent un lien vers leur fiche */
  soinsDuSite?: string[];
};

/** Publication personnalisée : prête à rendre et à publier (phase 2) */
export type PublicationPersonnalisee = Publication & {
  identite: { nom: string; domaine: string; style: Style };
  /** Légende complète (≤ 2200 caractères) */
  legendeComplete: string;
  /** Lien de la fiche du site (page d'information, jamais la page de rendez-vous) */
  lien: string;
  /** Textes alternatifs, un par image */
  alts: string[];
};

/** Résultat d'un contrôle : ✗ bloquants, ! avertissements */
export type Controle = { erreurs: string[]; avertissements: string[] };
