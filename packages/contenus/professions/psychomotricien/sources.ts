// Sources officielles du pack Psychomotricien (recherche complète : docs/professions/psychomotricien.md).
// Chaque affirmation réglementaire du pack (prescription, actes, prise en charge, PCO, MDPH, RPPS) porte `sources: [...]` vers
// l'un de ces identifiants ; le contrôle (controle.ts) refuse un identifiant inconnu et un texte réglementaire sans source.
// `verifie` : true = extrait relu sur la page officielle ; false = trouvé seulement par une source secondaire ou un résultat
// indexé : à revérifier avant publication (listé dans les points de relecture).

export type OrganismePack =
  | 'Légifrance' | 'Journal officiel' | 'Ameli' | 'handicap.gouv.fr' | 'monparcourshandicap.gouv.fr' | 'Service-public'
  | 'pour-les-personnes-agees.gouv.fr' | 'ANS' | 'Assemblée nationale' | 'Sénat';

export type SourcePack = {
  id: string;
  organisme: OrganismePack;
  titre: string;
  url: string;
  /** Date affichée par la page ou date du texte */
  majPage?: string;
  consulteLe: string;
  /** Extrait littéral court (≤ 30 mots) qui porte l'affirmation */
  extrait: string;
  verifie: boolean;
};

const LE = '2026-10-09';

export const SOURCES_PSYCHOMOT = [
  {
    id: 'csp-l4332', organisme: 'Légifrance', titre: 'Code de la santé publique, articles L4332-1 à L4332-7 (Psychomotricien)',
    url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072665/LEGISCTA000006171316/', majPage: 'L4332-1 : version du 22/06/2000',
    consulteLe: LE, verifie: true,
    extrait: 'toute personne qui, non médecin, exécute habituellement des actes professionnels de rééducation psychomotrice […] sur prescription médicale',
  },
  {
    id: 'csp-r4332', organisme: 'Légifrance', titre: 'Code de la santé publique, chapitre II : Psychomotricien (R4332-1 à R4332-15)',
    url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072665/LEGISCTA000006178635/', consulteLe: LE, verifie: true,
    extrait: 'Section 1 : Actes professionnels ; Section 2 : Personnes autorisées à exercer (diplôme d’État, ressortissants UE/EEE)',
  },
  {
    id: 'csp-r4332-1', organisme: 'Légifrance', titre: 'Code de la santé publique, article R4332-1 (actes professionnels)',
    url: 'https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006190628', majPage: 'version en vigueur depuis le 08/08/2004', consulteLe: LE, verifie: true,
    extrait: 'sur prescription médicale et après examen neuropsychologique du patient par le médecin […] 1° Bilan psychomoteur ; 2° Education précoce et stimulation psychomotrices',
  },
  {
    id: 'csp-l2135-1', organisme: 'Légifrance', titre: 'Code de la santé publique, article L2135-1 (parcours de bilan et intervention précoce)',
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037857970/', majPage: 'version en vigueur du 31/12/2025', consulteLe: LE, verifie: false,
    extrait: 'parcours de bilan et intervention précoce […] pris en charge par l’assurance maladie […] subordonnée à prescription médicale (résumé indexé, à relire)',
  },
  {
    id: 'decret-2025-770', organisme: 'Journal officiel', titre: 'Décret n° 2025-770 du 5 août 2025 relatif à l’organisation des parcours mentionnés aux articles L. 2134-1, L. 2135-1 et L. 2136-1 du CSP (NOR TSSA2514724D)',
    url: 'https://afpa.org/content/uploads/2025/08/JO_parcours-de-soins_05-08-2025.pdf', majPage: 'JO du 06/08/2025, texte 13', consulteLe: LE, verifie: true,
    extrait: 'la prise en charge est limitée à une période d’un an, renouvelable une fois […] avant […] le douzième anniversaire de l’enfant ; ne peuvent demander aux patients un paiement direct',
  },
  {
    id: 'arrete-2026-05-26', organisme: 'Légifrance', titre: 'Arrêté du 26 mai 2026 relatif à la rémunération forfaitaire des professionnels (R. 2134-3)',
    url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054144268', majPage: 'JO du 28/05/2026', consulteLe: LE, verifie: false,
    extrait: 'bilan 140 € ; 35 séances de 45 minutes sur 12 mois (résumé de la page, montants à relire sur le texte)',
  },
  {
    id: 'arrete-contrat-type', organisme: 'Légifrance', titre: 'Arrêté du 13 décembre 2024 modifiant l’arrêté du 16 avril 2019 relatif au contrat type (L. 4331-1, L. 4332-1, psychologues)',
    url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000050774597', consulteLe: LE, verifie: false,
    extrait: 'contrat type pour les professionnels de santé mentionnés aux articles L. 4331-1 et L. 4332-1',
  },
  {
    id: 'handicap-fiche-forfait-2025', organisme: 'handicap.gouv.fr', titre: 'Fiche technique « Forfait d’intervention précoce »',
    url: 'https://handicap.gouv.fr/sites/handicap/files/2025-04/TND-fiche-technique-forfait-intervention-2025.pdf', majPage: 'mars 2025', consulteLe: LE, verifie: true,
    extrait: 'Le forfait ne peut être versé qu’aux professionnels qui ont signé un contrat de collaboration avec la plateforme (PCO)',
  },
  {
    id: 'ameli-tnd-medecin', organisme: 'Ameli', titre: 'Prise en charge des troubles du neurodéveloppement (espace médecin)',
    url: 'https://www.ameli.fr/medecin/exercice-liberal/prise-charge-situation-type-soin/prise-en-charge-selon-la-pathologie/troubles-neurodeveloppement-autisme',
    majPage: '02/09/2026', consulteLe: LE, verifie: true,
    extrait: 'permettre à l’enfant de bénéficier, gratuitement et sans délai, d’un parcours de soins',
  },
  {
    id: 'mph-remboursement', organisme: 'monparcourshandicap.gouv.fr', titre: 'Journée européenne de la psychomotricité : remboursement des séances',
    url: 'https://www.monparcourshandicap.gouv.fr/actualite/journee-europeenne-de-la-psychomotricite', majPage: '17/09/2024, mise à jour 25/09/2025', consulteLe: LE, verifie: true,
    extrait: 'vous ne percevrez pas de remboursement de l’Assurance Maladie […] si les consultations ont lieu chez un psychomotricien libéral',
  },
  {
    id: 'sp-aeeh', organisme: 'Service-public', titre: 'Allocation d’éducation de l’enfant handicapé (AEEH)',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F14809', majPage: 'vérifiée le 01/06/2026', consulteLe: LE, verifie: true,
    extrait: 'Être âgé de moins de 20 ans',
  },
  {
    id: 'ppa-esa', organisme: 'pour-les-personnes-agees.gouv.fr', titre: 'Les équipes spécialisées Alzheimer (ESA)',
    url: 'https://www.pour-les-personnes-agees.gouv.fr/preserver-son-autonomie/a-qui-s-adresser/les-equipes-specialisees-alzheimer-esa', consulteLe: LE, verifie: false,
    extrait: 'ergothérapeutes, psychomotriciens […] prescription médicale […] 12 à 15 séances […] sur 3 mois (résumé indexé, à relire)',
  },
  {
    id: 'ans-tre-g15', organisme: 'ANS', titre: 'Nomenclature TRE_G15-ProfessionSante',
    url: 'https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante/', majPage: 'version du 28/03/2025', consulteLe: LE, verifie: true,
    extrait: '96 Psychomotricien (statut active)',
  },
  {
    id: 'ans-bascule-adeli', organisme: 'ANS', titre: 'Bascule des professionnels ADELI dans le RPPS',
    url: 'https://esante.gouv.fr/offres-services/annuaire-sante/bascule-des-professionnels-adeli-dans-le-rpps', consulteLe: LE, verifie: false,
    extrait: '13 mars 2024 (lot 2) : diététiciens, ergothérapeutes, manipulateurs ERM, psychomotriciens, techniciens de laboratoire (résultat indexé, page non lue)',
  },
  {
    id: 'arrete-2018-05-30', organisme: 'Légifrance', titre: 'Arrêté du 30 mai 2018 relatif à l’information des personnes destinataires d’activités de prévention, de diagnostic et/ou de soins',
    url: 'https://www.legifrance.gouv.fr/jorf/id/JORFSCTA000037032501', majPage: 'en vigueur le 01/07/2018', consulteLe: LE, verifie: false,
    extrait: 'afficher de manière visible et lisible dans la salle d’attente […] les tarifs des honoraires ou fourchettes de tarifs (résumé, à relire)',
  },
  {
    id: 'an-qe-17236', organisme: 'Assemblée nationale', titre: 'Question écrite n° 17236 (prise en charge de la rééducation psychomotrice)',
    url: 'https://www.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE17236', majPage: 'publiée le 28/07/2026, sans réponse', consulteLe: LE, verifie: true,
    extrait: 'insuffisance de la prise en charge des psychomotriciens […] exerçant en libéral',
  },
] as const satisfies readonly SourcePack[];

export type IdSource = (typeof SOURCES_PSYCHOMOT)[number]['id'];

export const sourcePsychomot = (id: string): SourcePack | undefined => SOURCES_PSYCHOMOT.find((s) => s.id === id);
