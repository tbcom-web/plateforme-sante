// Types du pack de contenus d'une profession (format documenté dans LISEZMOI.md).
// Les données propres aux sites (discipline, instance, diplôme, règles, FAQ par défaut, univers) suivent la forme de
// `PackProfession` (packages/core/src/packs-professions.ts, agent « couche profession ») ; les thèmes, activités, publics et
// profils de référence suivent `PratiqueProfession` (packages/core/src/pratiques.ts) ; les fiches suivent la table
// `soins_catalogue` (slug, titre_court, titre, resume, corps, faq).

import type { IdSource } from './sources';

/** Statut du pack : « en-preparation » = jamais publiable ; « relu » = relu par Paul et un professionnel ; « publiable » */
export type StatutPack = 'en-preparation' | 'relu' | 'publiable';

/** Texte qui porte une affirmation réglementaire (prescription, actes, prise en charge, enregistrement) : sources obligatoires */
export type TexteSource = { texte: string; sources: readonly IdSource[] };

/** Section d'une page : corps en Markdown ; `sources` obligatoire si la section contient une affirmation réglementaire */
export type SectionPage = {
  titre: string;
  corps: string;
  sources?: readonly IdSource[];
  /** Condition d'affichage liée à une réponse d'onboarding (ex. 'contrat-pco') */
  si?: string;
};

export type PagePack = {
  /** Identifiant stable (adresse de la page) */
  id: string;
  titreMenu: string;
  /** Titre H1 ; {ville} remplacé par la ville du cabinet */
  titre: string;
  /** Meta description (≤ 160 caractères) */
  description: string;
  sections: readonly SectionPage[];
};

export type FaqSourcee = { q: string; r: string; sources?: readonly IdSource[]; si?: string };

/** Fiche « pour quels troubles » : même forme que soins_catalogue (+ sources) */
export type FicheMotif = {
  slug: string;
  titreCourt: string;
  titre: string;
  resume: string;
  corps: string;
  faq: readonly FaqSourcee[];
  /** Picto à dessiner (visuels.ts, PICTOS_A_DESSINER) */
  picto: string;
  /** Thèmes de la pratique qui regroupent cette fiche */
  themes: readonly string[];
  sources: readonly IdSource[];
};

export type QuestionOnboarding = {
  id: string;
  question: string;
  aide?: string;
  type: 'oui-non' | 'choix' | 'choix-multiples' | 'texte' | 'nombre';
  options?: readonly { valeur: string; libelle: string }[];
  /** Ce que la réponse change dans le site */
  effet: string;
  sources?: readonly IdSource[];
};

export type TermeVocabulaire = { terme: string; definition: string; eviter?: readonly string[] };

/** Champs du pack site (forme de PackProfession, packs-professions.ts) */
export type ChampsPackSite = {
  discipline: { FR: string; BE: string; CH: string };
  cabinetGenerique: string;
  instance: { FR: string; BE: string; CH: string };
  diplome: { FR: string; BE: string; CH: string };
  regles: { FR: string; BE: string; CH: string };
  specialiteSchema: string;
  accrocheTitre: string;
  univers: { id: string; nom: string; motif: string; implemente: boolean };
  motsClesPartage: readonly string[];
};
