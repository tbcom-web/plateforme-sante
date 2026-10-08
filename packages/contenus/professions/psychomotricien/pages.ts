// Pages du site d'un cabinet de psychomotricité et FAQ. Ton : sobre, factuel, accessible aux parents et aux aidants ; aucune
// promesse. Champs du cabinet entre accolades ({ville}, {cabinet}, {duree_seance}…) remplis depuis l'onboarding (onboarding.ts).
// Sections conditionnelles (`si`) : affichées seulement si la réponse d'onboarding correspondante est « oui ».
// Toute section qui parle de prescription, d'actes, de remboursement, de PCO ou de MDPH porte ses `sources` (sources.ts).

import type { FaqSourcee, PagePack } from './types';

/** Texte de prise en charge validé par les sources (docs/professions/psychomotricien.md §4.6) */
export const PRISE_EN_CHARGE = {
  liberal: 'Les séances en cabinet libéral ne sont pas remboursées par l’Assurance maladie, même avec une prescription médicale. Certaines complémentaires santé en prennent une partie en charge, selon le contrat : renseignez-vous auprès de la vôtre.',
  etablissements: 'Les séances réalisées en CAMSP, CMP, CMPP, à l’hôpital ou en Ehpad sont prises en charge par l’Assurance maladie.',
  pco: 'Pour un enfant orienté par une plateforme de coordination et d’orientation (PCO) pour les troubles du neurodéveloppement, le bilan et les séances du parcours sont pris en charge par l’Assurance maladie, sans paiement par la famille, quand le psychomotricien a signé un contrat avec la plateforme. La prescription initiale doit intervenir avant le douzième anniversaire de l’enfant ; le parcours dure un an, renouvelable une fois.',
  mdph: 'Pour un enfant ou un adulte en situation de handicap, les frais de psychomotricité restés à la charge de la famille peuvent être pris en compte par la MDPH : complément de l’allocation d’éducation de l’enfant handicapé (AEEH) ou prestation de compensation du handicap (PCH). Renseignez-vous auprès de la MDPH de votre département.',
} as const;

export const PAGES_PSYCHOMOT: readonly PagePack[] = [
  {
    id: 'accueil', titreMenu: 'Accueil', titre: '{cabinet}, psychomotricité à {ville}',
    description: 'Psychomotricité à {ville} : bilan psychomoteur et séances, du tout-petit à la personne âgée, sur prescription médicale.',
    sections: [
      { titre: 'Psychomotricité à {ville}', corps: '{praticien}, {titre_praticien}, reçoit les bébés, les enfants, les adolescents, les adultes et les personnes âgées pour un bilan psychomoteur et un suivi en séances, sur prescription médicale.', sources: ['csp-r4332-1', 'csp-l4332'] },
      { titre: 'Pour quelles difficultés ?', corps: 'Développement du tout-petit, maladresse et coordination, écriture, repères dans l’espace et le temps, agitation ou inhibition, tonus et émotions, équilibre et marche des personnes âgées.', sources: ['csp-r4332-1'] },
      { titre: 'Comment se déroule un suivi ?', corps: 'Un bilan psychomoteur d’abord, puis, si un suivi est utile, des séances autour d’objectifs fixés ensemble et revus régulièrement.' },
      { titre: 'Prise en charge', corps: 'Les séances en cabinet libéral ne sont pas remboursées par l’Assurance maladie. Les cas particuliers (parcours PCO, MDPH, complémentaires santé) sont détaillés sur la page Tarifs et prise en charge.', sources: ['mph-remboursement'] },
    ],
  },
  {
    id: 'la-psychomotricite', titreMenu: 'La psychomotricité', titre: 'La psychomotricité : le corps, le mouvement et la relation',
    description: 'Ce que fait un psychomotricien diplômé d’État : bilan psychomoteur, éducation précoce, rééducation psychomotrice, sur prescription médicale.',
    sections: [
      { titre: 'Une profession de santé', corps: 'Le psychomotricien est un auxiliaire médical, titulaire du diplôme d’État de psychomotricien. Il intervient sur prescription médicale. Ses actes sont définis par le Code de la santé publique.', sources: ['csp-l4332', 'csp-r4332-1'] },
      { titre: 'Ce que prévoient les textes', corps: `Le psychomotricien réalise :

- le **bilan psychomoteur** ;
- l’**éducation précoce et la stimulation psychomotrice** des tout-petits ;
- la **rééducation** des troubles du développement psychomoteur : retards du développement, tonus, schéma corporel, latéralité, repères dans l’espace et le temps, maladresses et dyspraxies, inhibition, instabilité, graphomotricité ;
- une **contribution**, par des techniques d’approche corporelle, à la prise en charge de troubles des émotions, de la relation ou de l’image du corps.`, sources: ['csp-r4332-1'] },
      { titre: 'Les outils des séances', corps: 'Jeux, parcours de motricité, activités d’équilibre et de coordination, rythme, expression corporelle ou plastique, graphisme, relaxation. Le choix dépend de l’âge et des objectifs de chacun.', sources: ['csp-r4332-1'] },
      { titre: 'Ce que la psychomotricité ne fait pas', corps: 'Le psychomotricien ne pose pas de diagnostic médical : le diagnostic relève du médecin. La lecture et l’orthographe relèvent de l’orthophoniste ; le psychomotricien travaille le geste d’écrire.', sources: ['csp-r4332-1'] },
    ],
  },
  {
    id: 'bilan-et-suivi', titreMenu: 'Bilan et suivi', titre: 'Le bilan psychomoteur et le suivi en séances',
    description: 'Déroulement du bilan psychomoteur et des séances de psychomotricité à {ville} : entretien, épreuves adaptées à l’âge, compte rendu, objectifs.',
    sections: [
      { titre: 'Avant le premier rendez-vous', corps: 'Une prescription médicale est nécessaire. Apportez l’ordonnance, le carnet de santé pour un enfant et les comptes rendus déjà réalisés.', sources: ['csp-r4332-1'] },
      { titre: 'Le bilan psychomoteur', corps: `1. **Entretien** : histoire du développement, vie quotidienne, école ou travail, demande du médecin.
2. **Épreuves et observations** sous forme de jeux, de tracés, d’exercices d’équilibre et de coordination, adaptés à l’âge.
3. **Compte rendu écrit**, remis à la famille et transmis au médecin prescripteur.

Durée indiquée par le cabinet : {duree_bilan}.` },
      { titre: 'Le suivi en séances', corps: 'Si un suivi est utile, des objectifs sont fixés ensemble. Les séances, individuelles ou en petit groupe, durent {duree_seance}. Des points d’étape sont faits régulièrement avec la famille et, si besoin, avec le médecin, l’école ou les autres professionnels.' },
      { titre: 'Travailler ensemble', corps: 'Avec l’accord de la personne ou de ses parents, le psychomotricien échange avec le médecin, l’équipe éducative et les autres professionnels : orthophoniste, ergothérapeute, psychologue, kinésithérapeute.' },
    ],
  },
  {
    id: 'pour-qui', titreMenu: 'Pour qui ?', titre: 'Pour qui ? Du tout-petit à la personne âgée',
    description: 'La psychomotricité s’adresse aux bébés, aux enfants, aux adolescents, aux adultes et aux personnes âgées, sur prescription médicale.',
    sections: [
      { titre: 'Bébés et tout-petits', corps: 'Retard dans les acquisitions motrices, tonus inhabituel, difficultés à s’apaiser ou à explorer. Les séances se font avec les parents.', sources: ['csp-r4332-1'] },
      { titre: 'Enfants', corps: 'Maladresse, coordination, écriture, repères dans l’espace et le temps, agitation ou inhibition. Le suivi peut s’inscrire dans un parcours pour les troubles du neurodéveloppement.', sources: ['csp-r4332-1'] },
      { titre: 'Adolescents et adultes', corps: 'Tensions corporelles, émotions difficiles à réguler, image du corps, écriture : un travail par le corps, en lien avec les autres soignants.', sources: ['csp-r4332-1'] },
      { titre: 'Personnes âgées', corps: 'Équilibre, marche, coordination, repères dans l’espace et le temps, confiance dans les déplacements, au cabinet, à domicile ou en établissement.', sources: ['csp-r4332-1'] },
      { titre: 'Parents et aidants', corps: 'Les proches sont associés au suivi : échanges réguliers, conseils pour la vie quotidienne.' },
    ],
  },
  {
    id: 'tarifs-et-prise-en-charge', titreMenu: 'Tarifs et prise en charge', titre: 'Tarifs et prise en charge',
    description: 'Tarifs du bilan psychomoteur et des séances à {ville}, prise en charge (complémentaires santé, parcours PCO, MDPH).',
    sections: [
      { titre: 'Tarifs du cabinet', corps: `- Bilan psychomoteur : {tarif_bilan}
- Séance : {tarif_seance}

Les tarifs sont également affichés au cabinet.`, sources: ['arrete-2018-05-30'] },
      { titre: 'Assurance maladie', corps: `${PRISE_EN_CHARGE.liberal}

${PRISE_EN_CHARGE.etablissements}`, sources: ['mph-remboursement'] },
      { titre: 'Parcours pour les troubles du neurodéveloppement (PCO)', corps: PRISE_EN_CHARGE.pco, sources: ['decret-2025-770', 'handicap-fiche-forfait-2025', 'ameli-tnd-medecin'], si: 'contrat-pco' },
      { titre: 'MDPH', corps: PRISE_EN_CHARGE.mdph, sources: ['mph-remboursement', 'sp-aeeh'] },
      { titre: 'Factures', corps: 'Une facture est remise après chaque séance, pour votre complémentaire santé ou la MDPH.', sources: ['mph-remboursement'] },
    ],
  },
  {
    id: 'cabinet-et-acces', titreMenu: 'Cabinet et accès', titre: 'Le cabinet et l’accès',
    description: 'Adresse, horaires, accès et salle de psychomotricité du cabinet {cabinet} à {ville}.',
    sections: [
      { titre: 'Adresse et horaires', corps: '{adresse}\n\n{horaires}' },
      { titre: 'La salle de psychomotricité', corps: 'Une salle avec tapis, modules de motricité, matériel de jeu, de construction et de graphisme, et un espace calme pour la relaxation.' },
      { titre: 'Accès', corps: '{acces}' },
      { titre: 'À domicile et en établissement', corps: '{domicile}', si: 'interventions-exterieures' },
    ],
  },
];

/** Questions fréquentes (page « Questions fréquentes » et FAQ par défaut du pack) */
export const FAQ_PSYCHOMOT: readonly FaqSourcee[] = [
  { q: 'Faut-il une prescription médicale ?', r: 'Oui. Le psychomotricien intervient sur prescription médicale, après un examen par le médecin.', sources: ['csp-r4332-1', 'csp-l4332'] },
  { q: 'Les séances sont-elles remboursées ?', r: `${PRISE_EN_CHARGE.liberal} Pour un enfant orienté par une plateforme de coordination et d’orientation (PCO), voir la page Tarifs et prise en charge.`, sources: ['mph-remboursement', 'decret-2025-770'] },
  { q: 'Qu’est-ce que la plateforme de coordination et d’orientation (PCO) ?', r: 'Une structure désignée par l’agence régionale de santé, qui organise un parcours de bilan et d’intervention précoce pour un enfant chez qui un médecin repère un écart inhabituel de développement. Le parcours est prescrit par le médecin de la plateforme avant le douzième anniversaire de l’enfant.', sources: ['decret-2025-770'] },
  { q: 'Combien de temps dure une séance ?', r: 'Au cabinet, une séance dure {duree_seance}. Dans le parcours PCO, les textes prévoient des séances de 45 minutes.', sources: ['handicap-fiche-forfait-2025'] },
  { q: 'À quel âge peut-on consulter ?', r: 'À tout âge : les textes ne fixent pas de limite. Le psychomotricien reçoit des bébés dès les premiers mois comme des personnes âgées.', sources: ['csp-r4332-1'] },
  { q: 'Le bilan psychomoteur est-il un diagnostic ?', r: 'Non. Il décrit le développement et les fonctions psychomotrices. Le diagnostic est posé par le médecin, qui s’appuie sur les bilans des différents professionnels.', sources: ['csp-r4332-1'] },
  { q: 'Quelle différence avec l’orthophoniste ou l’ergothérapeute ?', r: 'Le psychomotricien travaille le corps, le mouvement, le tonus et leur lien avec les émotions et les apprentissages. L’orthophoniste prend en charge le langage oral et écrit. L’ergothérapeute travaille l’autonomie dans les activités du quotidien et les aménagements. Les suivis peuvent se compléter.', sources: ['csp-r4332-1'] },
  { q: 'Combien de temps dure un suivi ?', r: 'Il n’y a pas de durée fixée à l’avance : elle dépend des objectifs fixés après le bilan et est revue régulièrement.' },
  { q: 'Comment se préparer au premier rendez-vous ?', r: 'Apportez l’ordonnance, le carnet de santé pour un enfant, les comptes rendus déjà réalisés et une tenue souple.' },
];
