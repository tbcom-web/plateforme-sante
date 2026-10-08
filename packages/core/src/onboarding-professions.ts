// Professions du PARCOURS CLIENT (/essai/votre-site, onboarding) : ce que le parcours client ajoute au registre général
// (professions.ts : `id` = slug de la table `professions`) et aux pratiques (pratiques.ts : thèmes, activités, profils de
// référence de chaque métier) : disponibilité du parcours, codes profession de l'Annuaire Santé, diplôme d'État affiché,
// « angles » tirés d'un diplôme universitaire réel. Consigne de Paul (2026-10-08) : « il y aura ensuite les ostéopathes, les
// kinés, etc. » : ajouter un métier = une entrée ici + sa pratique (pratiques.ts) ; tant que `disponible` est faux, le parcours
// affiche « bientôt disponible » et propose la liste d'attente (aucun e-mail envoyé). Aucun métier codé en dur dans les écrans.
//
// Codes profession de l'Annuaire Santé : nomenclature TRE_G15-ProfessionSante de l'ANS, vérifiée le 2026-10-08
// (https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante/ ; table dans docs/rpps-annuaire.md).
// Une profession absente du RPPS (ostéopathe : répertoire ADELI) n'a pas de code : elle se choisit à la main.
// Module pur, sans import.

export type ProfessionParcours = {
  /** Identifiant du registre général (professions.ts), des pratiques (pratiques.ts) et du catalogue de soins */
  id: string;
  /** Libellé du métier (« Pédicure-podologue ») */
  libelle: string;
  /** Codes TRE_G15 de l'Annuaire Santé ; [] = profession absente du RPPS (choix manuel seulement) */
  codesRpps: readonly string[];
  /** Parcours ouvert (pratique, sites prêts, textes relus) ; faux = « bientôt disponible » + liste d'attente */
  disponible: boolean;
  /** Codes de diplôme d'État de l'annuaire reconnus pour ce métier (podologie : DE12 diplôme français, DE86 diplôme de l'EEE) */
  codesDiplomeEtat: readonly string[];
  /** Intitulé du diplôme d'État affiché sur le site quand le praticien le confirme ('' = aucun) */
  diplomeEtat: string;
  /**
   * Libellés de diplômes universitaires de l'annuaire qui donnent un ANGLE au site (thème pré-coché, à confirmer) : un
   * « DU Podologie du sport » propose le thème sport. Rien n'est coché sans donnée réelle.
   */
  angles: readonly { motif: RegExp; theme: string }[];
  /** Thèmes qui ouvrent l'écran « Les activités de vos patients » (ex. Sport) ; [] = jamais */
  themesActivites: readonly string[];
  /** Titre de l'écran des activités quand le métier parle d'autre chose que des activités des patients (séances, médiations) */
  ecranActivites?: { titre: string; consigne: string };
  /** Questions propres au métier, posées avec « Vos informations » (réponses gardées dans les choix du client) */
  questions?: readonly QuestionParcours[];
};

/** Question d'onboarding propre à un métier (forme réduite de QuestionOnboarding des packs de contenus) */
export type QuestionParcours = {
  id: string;
  question: string;
  aide?: string;
  type: 'oui-non' | 'choix' | 'choix-multiples' | 'texte';
  options?: readonly { valeur: string; libelle: string }[];
  /** Posée seulement si la question `si` a reçu « oui » */
  si?: string;
};

/** Réponses aux questions du métier (oui-non : booléen ; choix multiples : liste ; texte : chaîne bornée) */
export type ReponsesMetier = Record<string, boolean | string | string[]>;

/** Questions visibles avec ces réponses (une question conditionnelle n'apparaît qu'après « oui » à sa question) */
export const questionsVisibles = (p: Pick<ProfessionParcours, 'questions'> | undefined, r: ReponsesMetier): QuestionParcours[] =>
  (p?.questions ?? []).filter((q) => !q.si || r[q.si] === true);

/** Lecture prudente des réponses venues du navigateur : questions connues, valeurs bornées, conditions respectées */
export function normaliserReponsesMetier(p: Pick<ProfessionParcours, 'questions'> | undefined, v: unknown): ReponsesMetier {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const r: ReponsesMetier = {};
  for (const q of p?.questions ?? []) {
    const x = o[q.id];
    if (q.type === 'oui-non' && typeof x === 'boolean') r[q.id] = x;
    else if (q.type === 'choix' && typeof x === 'string' && q.options?.some((c) => c.valeur === x)) r[q.id] = x;
    else if (q.type === 'choix-multiples' && Array.isArray(x)) { const l = [...new Set(x.filter((y): y is string => typeof y === 'string' && Boolean(q.options?.some((c) => c.valeur === y))))]; if (l.length) r[q.id] = l; }
    else if (q.type === 'texte' && typeof x === 'string' && x.trim()) r[q.id] = x.replace(/\s+/g, ' ').trim().slice(0, 120);
  }
  for (const q of p?.questions ?? []) if (q.si && r[q.si] !== true) delete r[q.id];
  return r;
}

export const PROFESSIONS_PARCOURS: readonly ProfessionParcours[] = [
  {
    id: 'podologue',
    libelle: 'Pédicure-podologue',
    codesRpps: ['80'],
    disponible: true,
    codesDiplomeEtat: ['DE12', 'DE86'],
    diplomeEtat: 'Diplôme d’État de pédicure-podologue',
    angles: [
      { motif: /\bsport|activit[ée]s? phys/i, theme: 'sport' },
      { motif: /diab[eè]t/i, theme: 'diabete' },
    ],
    themesActivites: ['sport'],
  },
  {
    // Pack Psychomotricien (packages/contenus/professions/psychomotricien, 90966aa) : EN PRÉPARATION, jamais ouvert au public
    // (disponible faux, statut « preparation » dans professions.ts, pack non publiable). Code TRE_G15 96 vérifié ; code du
    // diplôme d'État de l'annuaire NON vérifié (vide). Questions : celles du pack (ONBOARDING_PSYCHOMOT), textes identiques
    // (contrôlés par controlerPackPsychomot). Testable par le super admin en mode test seulement.
    id: 'psychomotricien',
    libelle: 'Psychomotricien ou psychomotricienne',
    codesRpps: ['96'],
    disponible: false,
    codesDiplomeEtat: [],
    diplomeEtat: 'Diplôme d’État de psychomotricien',
    angles: [
      { motif: /g[ée]riatr|g[ée]ronto|personne[s]? [âa]g[ée]e/i, theme: 'seniors' },
      { motif: /p[ée]rinat|petite enfance|b[ée]b[ée]/i, theme: 'petite-enfance' },
      { motif: /autis|neurod[ée]velop|\bTND\b|\bTSA\b/i, theme: 'tnd' },
    ],
    themesActivites: ['petite-enfance', 'apprentissages', 'graphomotricite', 'tnd', 'adolescents', 'adultes', 'seniors', 'relaxation'],
    ecranActivites: { titre: 'Les activités de vos séances', consigne: 'Jusqu’à 3, dans l’ordre : celles que vous proposez le plus. Elles sont citées sur votre site et orientent ses illustrations.' },
    questions: [
      { id: 'contrat-pco', question: 'Avez-vous signé un contrat avec une plateforme de coordination et d’orientation (PCO) ?',
        aide: 'Seuls les psychomotriciens sous contrat avec la plateforme peuvent être payés par l’Assurance maladie dans le parcours.', type: 'oui-non' },
      { id: 'territoire-pco', question: 'Quelle plateforme (territoire) ?', type: 'texte', si: 'contrat-pco' },
      { id: 'groupes', question: 'Proposez-vous des séances en petit groupe ?', type: 'oui-non' },
      { id: 'interventions-exterieures', question: 'Intervenez-vous à domicile, à l’école, en crèche ou en établissement ?', type: 'choix-multiples',
        options: [
          { valeur: 'domicile', libelle: 'À domicile' }, { valeur: 'ecole', libelle: 'À l’école ou en crèche' }, { valeur: 'etablissement', libelle: 'En établissement (Ehpad, structure)' },
        ] },
    ],
  },
  { id: 'masseur-kinesitherapeute', libelle: 'Masseur-kinésithérapeute', codesRpps: ['70'], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [], themesActivites: [] },
  { id: 'osteopathe', libelle: 'Ostéopathe', codesRpps: [], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [], themesActivites: [] },
  { id: 'infirmier', libelle: 'Infirmier ou infirmière', codesRpps: ['60'], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [], themesActivites: [] },
  { id: 'orthophoniste', libelle: 'Orthophoniste', codesRpps: ['91'], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [], themesActivites: [] },
  { id: 'sage-femme', libelle: 'Sage-femme', codesRpps: ['50'], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [], themesActivites: [] },
];

export const professionParcours = (id: string | null | undefined, registre: readonly ProfessionParcours[] = PROFESSIONS_PARCOURS): ProfessionParcours | undefined =>
  registre.find((p) => p.id === id);

/** Profession déduite d'un code TRE_G15 de l'annuaire (undefined : code absent du registre) */
export const professionDuCodeRpps = (code: string | null | undefined, registre: readonly ProfessionParcours[] = PROFESSIONS_PARCOURS): ProfessionParcours | undefined =>
  code ? registre.find((p) => p.codesRpps.includes(String(code).trim())) : undefined;

/** Professions disponibles d'abord, puis « bientôt disponibles », ordre du registre conservé */
export const professionsProposees = (registre: readonly ProfessionParcours[] = PROFESSIONS_PARCOURS): ProfessionParcours[] =>
  [...registre.filter((p) => p.disponible), ...registre.filter((p) => !p.disponible)];

/** Thèmes suggérés par des diplômes universitaires RÉELS (annuaire), parmi ceux proposés : à pré-cocher, le praticien confirme */
export function anglesDesDiplomes(diplomes: readonly string[], p: Pick<ProfessionParcours, 'angles'> | undefined, themesProposes: readonly string[]): string[] {
  if (!p) return [];
  const s: string[] = [];
  for (const d of diplomes) for (const a of p.angles) if (a.motif.test(d) && themesProposes.includes(a.theme) && !s.includes(a.theme)) s.push(a.theme);
  return s;
}
