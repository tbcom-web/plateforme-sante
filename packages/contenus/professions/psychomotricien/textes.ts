// Mentions déontologiques, champs du pack site (forme de PackProfession), questions d'onboarding propres au métier et
// vocabulaire. Pas d'Ordre ni de code de déontologie réglementaire pour cette profession ([csp-r4332] : le chapitre ne contient
// que les actes, le diplôme et les règles UE/EEE) : la mention « instance » renvoie à l'ARS, autorité d'enregistrement au RPPS
// depuis le 13/03/2024 ([ans-bascule-adeli], à revérifier).

import type { ChampsPackSite, QuestionOnboarding, TermeVocabulaire, TexteSource } from './types';

/** Champs à reporter dans PSYCHOMOTRICIEN (packages/core/src/packs-professions.ts) à la place des « [à rédiger] » (France) */
export const PACK_SITE_PSYCHOMOT: ChampsPackSite = {
  discipline: { FR: 'psychomotricité', BE: 'psychomotricité', CH: 'psychomotricité' },
  cabinetGenerique: 'Cabinet de psychomotricité',
  // Belgique et Suisse : NON recherchés (hors périmètre) ; à rédiger avant toute ouverture dans ces pays
  instance: { FR: 'Agence régionale de santé (enregistrement au RPPS)', BE: '[à rédiger]', CH: '[à rédiger]' },
  diplome: { FR: 'Diplôme d’État de psychomotricien', BE: '[à rédiger]', CH: '[à rédiger]' },
  regles: {
    FR: 'Profession d’auxiliaire médical régie par le Code de la santé publique, articles L4332-1 à L4332-7 et R4332-1 à R4332-15 (actes professionnels : article R4332-1), consultables sur legifrance.gouv.fr.',
    BE: '[à rédiger]',
    CH: '[à rédiger]',
  },
  // schema.org n'a pas de MedicalSpecialty pour la psychomotricité : aucune (comme prévu par le pack provisoire)
  specialiteSchema: '',
  accrocheTitre: 'Bilan psychomoteur et séances, du tout-petit à la personne âgée',
  univers: { id: 'psychomotricite', nom: 'Psychomotricité', motif: 'Trajectoires de mouvement', implemente: false },
  motsClesPartage: ['enfant', 'enfants', 'bebe', 'marche', 'marcher', 'premiers-pas', 'equilibre', 'motricite', 'coordination', 'jeu', 'jouer', 'saut', 'sauter', 'danse', 'senior', 'relaxation', 'ecriture', 'graphisme'],
};

/** Mentions déontologiques et légales propres au métier (pied de page, mentions légales, page tarifs) */
export const MENTIONS_PSYCHOMOT: readonly (TexteSource & { id: string; ou: string })[] = [
  { id: 'titre', ou: 'mentions légales', texte: '{praticien}, {titre_praticien}. Numéro RPPS : {rpps}.', sources: ['csp-l4332', 'ans-tre-g15'] },
  { id: 'prescription', ou: 'pied de page, pages des fiches', texte: 'Le psychomotricien intervient sur prescription médicale. Le diagnostic relève du médecin.', sources: ['csp-r4332-1'] },
  { id: 'remboursement', ou: 'page tarifs', texte: 'Les séances en cabinet libéral ne sont pas remboursées par l’Assurance maladie, même sur prescription médicale.', sources: ['mph-remboursement'] },
  { id: 'tarifs-affiches', ou: 'page tarifs', texte: 'Les tarifs sont affichés au cabinet.', sources: ['arrete-2018-05-30'] },
  { id: 'urgence', ou: 'pied de page', texte: 'En cas d’urgence, appelez le 15 ou le 112.', sources: [] },
  { id: 'informations', ou: 'pied de page', texte: 'Les informations de ce site sont générales et ne remplacent pas l’avis du médecin.', sources: [] },
  { id: 'images', ou: 'crédits', texte: 'Illustrations : scènes mises en scène, sans patient réel.', sources: [] },
];

/** Questions d'onboarding propres à la psychomotricité (en plus des questions communes : nom, adresse, horaires…) */
export const ONBOARDING_PSYCHOMOT: readonly QuestionOnboarding[] = [
  { id: 'titre-praticien', question: 'Comment voulez-vous être présenté(e) ?', type: 'choix',
    options: [{ valeur: 'psychomotricien diplômé d’État', libelle: 'Psychomotricien diplômé d’État' }, { valeur: 'psychomotricienne diplômée d’État', libelle: 'Psychomotricienne diplômée d’État' }],
    effet: 'Champ {titre_praticien} (accueil, mentions légales).', sources: ['csp-l4332'] },
  { id: 'publics', question: 'Quels publics recevez-vous ?', type: 'choix-multiples',
    options: [
      { valeur: 'bebes', libelle: 'Bébés et tout-petits' }, { valeur: 'enfants', libelle: 'Enfants' }, { valeur: 'adolescents', libelle: 'Adolescents' },
      { valeur: 'adultes', libelle: 'Adultes' }, { valeur: 'personnes-agees', libelle: 'Personnes âgées' },
    ],
    effet: 'Page « Pour qui ? », thèmes proposés, profil de référence.' },
  { id: 'themes', question: 'Quels sujets voulez-vous mettre en avant (3 au plus) ?', aide: 'Ils ouvrent le menu et ont leur page.', type: 'choix-multiples',
    options: [
      { valeur: 'petite-enfance', libelle: 'Bébés et petite enfance' }, { valeur: 'apprentissages', libelle: 'Enfants : motricité et apprentissages' },
      { valeur: 'graphomotricite', libelle: 'Écriture (graphomotricité)' }, { valeur: 'tnd', libelle: 'Troubles du neurodéveloppement' },
      { valeur: 'adolescents', libelle: 'Adolescents' }, { valeur: 'adultes', libelle: 'Adultes' },
      { valeur: 'seniors', libelle: 'Personnes âgées : équilibre et autonomie' }, { valeur: 'relaxation', libelle: 'Tonus, émotions et relaxation' },
    ],
    effet: 'Thèmes principaux du site (pratique.ts).' },
  { id: 'contrat-pco', question: 'Avez-vous signé un contrat avec une plateforme de coordination et d’orientation (PCO) ?',
    aide: 'Seuls les psychomotriciens sous contrat avec la plateforme peuvent être payés par l’Assurance maladie dans le parcours.', type: 'oui-non',
    effet: 'Affiche la section « Parcours PCO » de la page Tarifs et le texte {contrat_pco} ; sans contrat, aucune mention de prise en charge.',
    sources: ['decret-2025-770', 'handicap-fiche-forfait-2025'] },
  { id: 'territoire-pco', question: 'Quelle plateforme (territoire) ?', type: 'texte', effet: 'Champ {territoire_pco}, seulement si contrat PCO.' },
  { id: 'duree-bilan', question: 'Durée habituelle du bilan psychomoteur ?', aide: 'Par exemple : « deux rencontres d’une heure ».', type: 'texte', effet: 'Champ {duree_bilan}.' },
  { id: 'duree-seance', question: 'Durée habituelle d’une séance ?', aide: 'Par exemple : « 45 minutes ».', type: 'texte', effet: 'Champ {duree_seance}.' },
  { id: 'tarifs', question: 'Vos tarifs (bilan, séance) ?', aide: 'Affichés sur la page Tarifs, comme au cabinet.', type: 'texte', effet: 'Champs {tarif_bilan} et {tarif_seance}.', sources: ['arrete-2018-05-30'] },
  { id: 'groupes', question: 'Proposez-vous des séances en petit groupe ?', type: 'oui-non', effet: 'Mention « individuelles ou en petit groupe ».' },
  { id: 'interventions-exterieures', question: 'Intervenez-vous à domicile, à l’école, en crèche ou en établissement ?', type: 'choix-multiples',
    options: [
      { valeur: 'domicile', libelle: 'À domicile' }, { valeur: 'ecole', libelle: 'À l’école ou en crèche' }, { valeur: 'etablissement', libelle: 'En établissement (Ehpad, structure)' },
    ],
    effet: 'Section « À domicile et en établissement » et champ {domicile}.' },
  { id: 'salle', question: 'Votre salle dispose-t-elle de modules de motricité ou d’un espace de relaxation ?', type: 'oui-non', effet: 'Description de la salle (page Cabinet).' },
  { id: 'formations', question: 'Formations complémentaires réellement suivies (diplôme universitaire, formation continue) ?',
    aide: 'Affichées telles quelles, sans le mot « spécialiste ».', type: 'texte', effet: 'Bloc « Formations » ; un DU réel peut pré-cocher un thème (pratique.ts, angles).' },
  { id: 'rpps', question: 'Numéro RPPS', aide: 'Les psychomotriciens sont enregistrés au RPPS (code profession 96).', type: 'texte', effet: 'Mentions légales.', sources: ['ans-tre-g15', 'ans-bascule-adeli'] },
];

/** Vocabulaire du métier : termes à employer, à éviter */
export const VOCABULAIRE_PSYCHOMOT: readonly TermeVocabulaire[] = [
  { terme: 'psychomotricien, psychomotricienne diplômé(e) d’État', definition: 'Titre professionnel protégé (CSP L4332-2).', eviter: ['thérapeute en psychomotricité', 'psychomotricien spécialisé', 'spécialiste'] },
  { terme: 'bilan psychomoteur', definition: 'Évaluation du développement et des fonctions psychomotrices, sur prescription médicale ; donne lieu à un compte rendu.', eviter: ['diagnostic psychomoteur', 'test'] },
  { terme: 'séance', definition: 'Temps de suivi après le bilan, individuel ou en petit groupe.', eviter: ['cours', 'atelier bien-être'] },
  { terme: 'suivi', definition: 'Ensemble des séances autour d’objectifs revus régulièrement.', eviter: ['traitement garanti', 'cure'] },
  { terme: 'rééducation psychomotrice', definition: 'Terme du Code de la santé publique (R4332-1 3°).' },
  { terme: 'éducation précoce', definition: 'Accompagnement des tout-petits (R4332-1 2°).' },
  { terme: 'graphomotricité', definition: 'Le geste d’écrire (posture, tenue de l’outil, fluidité) ; pas la langue écrite.', eviter: ['rééducation de la dyslexie', 'orthographe'] },
  { terme: 'tonus', definition: 'État de tension des muscles, lié à la posture et aux émotions.' },
  { terme: 'schéma corporel', definition: 'Connaissance et représentation de son corps.' },
  { terme: 'troubles du neurodéveloppement (TND)', definition: 'Diagnostic posé par le médecin ; le psychomotricien intervient dans le parcours.', eviter: ['les dys se soignent', 'guérir'] },
  { terme: 'plateforme de coordination et d’orientation (PCO)', definition: 'Structure désignée par l’ARS qui organise le parcours de bilan et d’intervention précoce.' },
  { terme: 'prescription médicale', definition: 'Ordonnance du médecin, nécessaire au bilan et aux séances.', eviter: ['sans ordonnance', 'accès direct'] },
  { terme: 'relaxation', definition: 'Outil de soin du suivi (« relaxation dynamique », R4332-1 3°).', eviter: ['bien-être', 'gestion du stress', 'zen', 'détente'] },
];
