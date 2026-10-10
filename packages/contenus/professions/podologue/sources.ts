// Sources officielles du pack complémentaire « Pédicure-podologue » (articles et fiches conseils, demande de Paul du 2026-10-10).
// Chaque fiche et chaque article citent leurs sources (`sources: [...]`) ; le contrôle (controle.ts) refuse un identifiant inconnu
// et toute phrase réglementaire (norme, remboursement, prise en charge, Code du travail…) sans source.
// `verifie` : true = page ou document officiel lu le jour indiqué (extrait reformulé, jamais copié) ; false = page officielle
// trouvée mais pas relue directement (à revérifier avant publication ; affichée en avertissement dans les Arrivages).
//
// Notes de vérification (2026-10-10) :
// - INRS ED 6509 (2025) : catégories S1 à S7 de la NF EN ISO 20345 (S1 = exigences de base + talon fermé absorbeur d'énergie +
//   antistatique ; S2 = S1 + tige résistante à la pénétration de l'eau ; S3 = S2 + insert anti-perforation + semelle à crampons ;
//   S6 / S7 = S2 / S3 + chaussure entière étanche (WR) ; P / PL / PS = types d'insert anti-perforation) ; la notice du fabricant
//   indique « les éventuels accessoires utilisables » ; le médecin du travail peut aider à repérer une particularité du pied et
//   chercher une solution ; un podo-orthésiste peut adapter une chaussure de série ou en faire une sur mesure.
// - Semelles orthopédiques dans une chaussure de sécurité : aucune source officielle lue n'affirme qu'une semelle ajoutée « fait
//   perdre la certification ». Formulation retenue : la chaussure est certifiée avec ses composants d'origine ; sa notice dit quels
//   accessoires sont utilisables ; vérifier auprès du fabricant qu'un modèle est prévu (testé) avec des semelles orthopédiques.
//   La norme ISO 20345:2021 vise aussi les chaussures équipées de semelles intérieures sur mesure (résumé ISO, non relu : 403).
// - Ameli (hallux valgus) : talons hauts → poids reporté sur l'avant-pied ; petits talons (3 cm) ou chaussures plates conseillés.
// - Ameli (prendre soin de ses pieds) : talons bas (3 à 4 cm au plus), essayage en fin de journée, ongles coupés droits, cors
//   poncés sans instrument tranchant, chaussettes propres chaque jour, sandales dans les lieux humides collectifs.
// - Ameli (pied diabétique) : grades 0 à 3 ; forfaits annuels de séances de prévention (grade 2 : 5 ; grade 3 : 6, ou 8 avec plaie
//   en cours de cicatrisation) ; bilan de gradation annuel en grades 0-1 (page pédicure-podologue, 07/02/2025). La page « assuré »
//   (22/07/2025) parle encore de prescription médicale, la page professionnelle dit qu'elle n'est plus nécessaire : le texte ne
//   tranche pas et renvoie au cabinet et à ameli.fr.
// - Ameli (orthèses plantaires) : le pédicure-podologue peut prescrire des orthèses plantaires (sauf opposition du médecin
//   traitant) ; 1 paire par an pour un adulte, 2 pour un enfant (21/08/2024).

export type OrganismePackPodo = 'INRS' | 'Ameli' | 'Légifrance' | 'ISO';

export type SourcePackPodo = {
  id: string;
  organisme: OrganismePackPodo;
  titre: string;
  url: string;
  majPage?: string;
  consulteLe: string;
  /** Ce que la source établit, reformulé (aucune copie de texte protégé) */
  extrait: string;
  verifie: boolean;
};

const LE = '2026-10-10';

export const SOURCES_PODOLOGUE = [
  {
    id: 'inrs-ed6509', organisme: 'INRS', titre: 'Les équipements de protection individuelle du pied et du bas de la jambe (ED 6509)',
    url: 'https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-6509.pdf', majPage: '2025', consulteLe: LE, verifie: true,
    extrait: 'Chaussures de sécurité NF EN ISO 20345 (embout 200 J) ; catégories SB, S1 à S7 ; inserts P, PL, PS ; SR ; notice : accessoires utilisables ; rôle du médecin du travail ; podo-orthésiste.',
  },
  {
    id: 'iso-20345', organisme: 'ISO', titre: 'ISO 20345:2021, Équipement de protection individuelle, chaussures de sécurité',
    url: 'https://www.iso.org/standard/73222.html', consulteLe: LE, verifie: false,
    extrait: 'Norme en vigueur (EN ISO 20345:2022 en Europe) ; vise aussi les chaussures équipées de semelles intérieures sur mesure.',
  },
  {
    id: 'legifrance-r4323-95', organisme: 'Légifrance', titre: 'Code du travail, article R4323-95 (EPI fournis par l’employeur)',
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531306', consulteLe: LE, verifie: true,
    extrait: 'Les équipements de protection individuelle sont fournis gratuitement par l’employeur, qui en assure l’entretien et le remplacement.',
  },
  {
    id: 'legifrance-l4624-3', organisme: 'Légifrance', titre: 'Code du travail, article L4624-3 (propositions du médecin du travail)',
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052437117', majPage: 'version du 26/10/2025', consulteLe: LE, verifie: true,
    extrait: 'Le médecin du travail peut proposer par écrit des mesures individuelles d’aménagement ou d’adaptation du poste, justifiées par l’état de santé.',
  },
  {
    id: 'ameli-hallux-valgus', organisme: 'Ameli', titre: 'Hallux valgus : symptômes, causes et évolution',
    url: 'https://www.ameli.fr/assure/sante/themes/hallux-valgus/symptomes-causes-evolution', consulteLe: LE, verifie: true,
    extrait: 'Facteurs favorisants dont les talons hauts et les bouts étroits ; talons hauts : poids reporté sur l’avant-pied ; petits talons (3 cm) ou chaussures plates.',
  },
  {
    id: 'ameli-soin-pieds', organisme: 'Ameli', titre: 'Les bons gestes santé : prendre soin de ses pieds',
    url: 'https://www.ameli.fr/assure/sante/bons-gestes/quotidien/prendre-soin-pieds', consulteLe: LE, verifie: true,
    extrait: 'Lavage et séchage entre les orteils, crème hors des espaces entre orteils, ongles coupés droits, cors poncés, essayage en fin de journée, talons bas (3 à 4 cm), chaussettes propres, sandales en lieux humides, contrôle annuel.',
  },
  {
    id: 'ameli-cors', organisme: 'Ameli', titre: 'Cors, callosités et durillons aux pieds : que faire et quand consulter ?',
    url: 'https://www.ameli.fr/assure/sante/themes/cors-pieds/bons-reflexes', majPage: '12/08/2025', consulteLe: LE, verifie: true,
    extrait: 'Ponçage doux, crème, coricide seulement sur le cor selon la notice ; en cas de diabète ou d’artérite, ne pas soigner ses cors soi-même ; consulter si infection ou gêne.',
  },
  {
    id: 'ameli-ampoules', organisme: 'Ameli', titre: 'Ampoules : que faire pour les soigner et quand consulter ?',
    url: 'https://www.ameli.fr/assure/sante/themes/ampoules-cloques/que-faire-quand-consulter', consulteLe: LE, verifie: true,
    extrait: 'Pansement « seconde peau » sur une zone qui frotte ; petite ampoule : ne pas la percer, la protéger ; garder la peau qui la recouvre ; chaussure plus souple.',
  },
  {
    id: 'ameli-diabete-pieds', organisme: 'Ameli', titre: 'Suivi des pieds en cas de diabète',
    url: 'https://www.ameli.fr/assure/sante/themes/diabete-suivi/suivi-pieds', majPage: '22/07/2025', consulteLe: LE, verifie: true,
    extrait: 'Examen des pieds au moins une fois par an ; grades 0 à 3 ; signes à signaler sans attendre (plaie, ampoule, rougeur, changement de couleur…).',
  },
  {
    id: 'ameli-podo-diabete', organisme: 'Ameli', titre: 'Diabète : prévenir les complications du pied (espace pédicure-podologue)',
    url: 'https://www.ameli.fr/pedicure-podologue/exercice-professionnel/prescription-prise-charge/prise-charge-situation-type-soin/situation-patient-diabete',
    majPage: '07/02/2025', consulteLe: LE, verifie: true,
    extrait: 'Gradation par le pédicure-podologue ; grade 0 ou 1 : un bilan de gradation par an ; grade 2 : 5 séances ; grade 3 : 6 séances, 8 avec une plaie en cours de cicatrisation.',
  },
  {
    id: 'ameli-ortheses', organisme: 'Ameli', titre: 'La prescription d’orthèses plantaires et de chaussures thérapeutiques de série',
    url: 'https://www.ameli.fr/pedicure-podologue/exercice-professionnel/presciption-prise-charge/regles-prescription-formalites/renouvellement-ortheses-plantaires',
    majPage: '21/08/2024', consulteLe: LE, verifie: true,
    extrait: 'Le pédicure-podologue peut prescrire des orthèses plantaires, sauf opposition du médecin traitant ; 1 paire par an pour un adulte, 2 pour un enfant.',
  },
] as const satisfies readonly SourcePackPodo[];

export type IdSourcePodo = (typeof SOURCES_PODOLOGUE)[number]['id'];

export const sourcePodologue = (id: string): SourcePackPodo | undefined => SOURCES_PODOLOGUE.find((s) => s.id === id);
