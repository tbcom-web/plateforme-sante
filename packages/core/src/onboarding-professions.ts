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
};

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
  },
  { id: 'masseur-kinesitherapeute', libelle: 'Masseur-kinésithérapeute', codesRpps: ['70'], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [] },
  { id: 'osteopathe', libelle: 'Ostéopathe', codesRpps: [], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [] },
  { id: 'infirmier', libelle: 'Infirmier ou infirmière', codesRpps: ['60'], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [] },
  { id: 'orthophoniste', libelle: 'Orthophoniste', codesRpps: ['91'], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [] },
  { id: 'sage-femme', libelle: 'Sage-femme', codesRpps: ['50'], disponible: false, codesDiplomeEtat: [], diplomeEtat: '', angles: [] },
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
