// Registre des PROFESSIONS (consigne de Paul du 2026-10-08 : « l'admin devra gérer un grand nombre de professions : podologues
// d'abord, puis ostéopathes, kinés, etc. »). Source unique des libellés d'une profession pour l'admin (sélecteur global de
// l'en-tête, tableau de bord, espaces Arrivages / Frigo / Dégustation / Cuisine / Clients) : aucun libellé de métier codé en dur
// dans la navigation, tout vient d'ici.
//
// - `id` = slug de la table `professions` (migration 0001 : 'podologue', « Pédicure-podologue ») et de
//   `soins_catalogue.profession_slug` ;
// - `univers` = univers métier (univers.ts : motif signature, palette de données, dessins, spécialités) ;
// - `specialites` = spécialités de l'univers (packs.ts, couche 3) ; `sujets` = sujets des visuels rattachés (photos-libres.ts,
//   SUJETS_VISUELS : chaque sujet porte sa spécialité) ;
// - `statut` : « active » = sélecteur de l'admin ET onboarding public ; « preparation » = visible dans l'admin (sélecteur,
//   Frigo, Clients), jamais dans l'onboarding public ; « prevue » = annoncée, pas encore sélectionnable.
// Une profession active (podologue) et une en préparation (psychomotricien, décision de Paul du 2026-10-08). Ajouter une
// profession : docs/architecture-professions.md (« Ajouter une profession ») ; textes des sites dans son pack
// (packs-professions.ts), rattachement des ingrédients dans professions-ingredients.ts.
// Pur, sans dépendance (importable partout : admin, sites, scripts).

export type Profession = {
  id: string;
  /** « Pédicure-podologue » (libellé officiel, singulier) */
  libelle: string;
  /** « Pédicures-podologues » */
  pluriel: string;
  /** Libellé court pour le sélecteur sur téléphone (« Podologie ») */
  court: string;
  /** Univers métier (univers.ts ; une profession en préparation peut en attendre un : repli sur son pack) */
  univers: string;
  /** Spécialités de la profession (packs.ts, SPECIALITES[].value) */
  specialites: readonly string[];
  statut: 'active' | 'preparation' | 'prevue';
};

export const PROFESSIONS: readonly Profession[] = [
  {
    id: 'podologue',
    libelle: 'Pédicure-podologue',
    pluriel: 'Pédicures-podologues',
    court: 'Podologie',
    univers: 'podologie',
    specialites: ['generale', 'sport', 'posture', 'enfant', 'soins', 'diabete'],
    statut: 'active',
  },
  {
    // Décision de Paul du 2026-10-08 : première profession ajoutée. En préparation : visible dans l'admin, pas dans l'onboarding
    // public ; contenus dans son pack (packs-professions.ts, textes « [à rédiger] » non publiables tant qu'ils ne sont pas relus).
    id: 'psychomotricien',
    libelle: 'Psychomotricien',
    pluriel: 'Psychomotriciens',
    court: 'Psychomotricité',
    univers: 'psychomotricite',
    // Spécialités provisoires (le pack Psychomotricien les précisera) ; les sujets « enfant » et « général » sont partagés
    specialites: ['generale', 'enfant'],
    statut: 'preparation',
  },
];

/**
 * Alias historiques → identifiant du registre : les essais et prospects (migrations 0023, 0024) et le parcours d'essai
 * enregistrent « pedicure-podologue ».
 */
export const ALIAS_PROFESSIONS: Readonly<Record<string, string>> = { 'pedicure-podologue': 'podologue', podologie: 'podologue', psychomotricite: 'psychomotricien', psychomotricienne: 'psychomotricien' };

/** Identifiant du registre d'une valeur enregistrée (alias ramenés ; vide → profession par défaut) */
export const idProfession = (id: string | null | undefined): string => {
  const x = (id ?? '').trim().toLowerCase();
  return ALIAS_PROFESSIONS[x] ?? (x || 'podologue');
};

/** Profession par défaut (sites et ingrédients existants, sans profession enregistrée) */
export const PROFESSION_PAR_DEFAUT = 'podologue';

/** Nom du cookie qui mémorise la profession choisie dans l'admin */
export const COOKIE_PROFESSION = 'admin-profession';

/** Professions ouvertes au public (onboarding, parcours d'essai) */
export const professionsActives = (liste: readonly Profession[] = PROFESSIONS) => liste.filter((p) => p.statut === 'active');

/** Professions du sélecteur de l'admin : actives et en préparation */
export const professionsAdmin = (liste: readonly Profession[] = PROFESSIONS) => liste.filter((p) => p.statut === 'active' || p.statut === 'preparation');

const visibleAdmin = (p: Profession) => p.statut === 'active' || p.statut === 'preparation';

/** Profession connue de l'admin (active ou en préparation) */
export const estProfession = (id: unknown, liste: readonly Profession[] = PROFESSIONS): id is string =>
  typeof id === 'string' && liste.some((p) => p.id === id && visibleAdmin(p));

/** Profession proposée au public (onboarding) : active seulement */
export const estProfessionPublique = (id: unknown, liste: readonly Profession[] = PROFESSIONS): id is string =>
  typeof id === 'string' && liste.some((p) => p.id === id && p.statut === 'active');

/** Profession d'un identifiant (cookie, paramètre, alias) ; inconnue ou prévue → profession par défaut */
export const professionDe = (id: string | null | undefined, liste: readonly Profession[] = PROFESSIONS): Profession => {
  const x = id ? ALIAS_PROFESSIONS[id] ?? id : id;
  return liste.find((p) => p.id === x && visibleAdmin(p)) ?? liste.find((p) => p.id === PROFESSION_PAR_DEFAUT) ?? liste[0];
};

/**
 * Profession d'un élément (site, lead, photo) : sa profession enregistrée (alias ramenés), sinon la profession par défaut (tout ce
 * qui existe avant le multi-professions est de la podologie). Ingrédients : professions-ingredients.ts (plusieurs professions).
 */
export const professionDeLElement = (e: { profession?: string | null } | null | undefined) => (e?.profession ? idProfession(e.profession) : PROFESSION_PAR_DEFAUT);

/** L'élément appartient-il à la profession choisie ? */
export const estDeLaProfession = (e: { profession?: string | null } | null | undefined, profession: string) => professionDeLElement(e) === profession;

/** Sujet de visuel rattaché à la profession (sa spécialité est l'une des siennes ; « général » : commun) */
export const sujetDeLaProfession = (s: { id: string; specialite: string }, p: Profession) => s.id === 'general' || p.specialites.includes(s.specialite);
