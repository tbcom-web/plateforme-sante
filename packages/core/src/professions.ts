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
// - `statut` : « active » = proposée dans le sélecteur ; « prevue » = annoncée, pas encore sélectionnable.
// Une seule profession active aujourd'hui. Ajouter une profession : une entrée ici, son univers dans univers.ts, sa ligne dans
// la table `professions` (docs/charte-graphique.md, « Ajouter une profession »).
// Pur, sans dépendance (importable partout : admin, sites, scripts).

export type Profession = {
  id: string;
  /** « Pédicure-podologue » (libellé officiel, singulier) */
  libelle: string;
  /** « Pédicures-podologues » */
  pluriel: string;
  /** Libellé court pour le sélecteur sur téléphone (« Podologie ») */
  court: string;
  /** Univers métier (univers.ts) */
  univers: string;
  /** Spécialités de la profession (packs.ts, SPECIALITES[].value) */
  specialites: readonly string[];
  statut: 'active' | 'prevue';
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
];

/** Profession par défaut (sites et ingrédients existants, sans profession enregistrée) */
export const PROFESSION_PAR_DEFAUT = 'podologue';

/** Nom du cookie qui mémorise la profession choisie dans l'admin */
export const COOKIE_PROFESSION = 'admin-profession';

export const professionsActives = (liste: readonly Profession[] = PROFESSIONS) => liste.filter((p) => p.statut === 'active');

export const estProfession = (id: unknown, liste: readonly Profession[] = PROFESSIONS): id is string =>
  typeof id === 'string' && liste.some((p) => p.id === id && p.statut === 'active');

/** Profession d'un identifiant (cookie, paramètre) ; inconnue ou non active → profession par défaut */
export const professionDe = (id: string | null | undefined, liste: readonly Profession[] = PROFESSIONS): Profession =>
  liste.find((p) => p.id === id && p.statut === 'active') ?? liste.find((p) => p.id === PROFESSION_PAR_DEFAUT) ?? liste[0];

/**
 * Profession d'un élément (site, ingrédient, photo) : sa profession enregistrée, sinon la profession par défaut (tout ce qui
 * existe avant le multi-professions est de la podologie).
 */
export const professionDeLElement = (e: { profession?: string | null } | null | undefined) => e?.profession || PROFESSION_PAR_DEFAUT;

/** L'élément appartient-il à la profession choisie ? */
export const estDeLaProfession = (e: { profession?: string | null } | null | undefined, profession: string) => professionDeLElement(e) === profession;

/** Sujet de visuel rattaché à la profession (sa spécialité est l'une des siennes ; « général » : commun) */
export const sujetDeLaProfession = (s: { id: string; specialite: string }, p: Profession) => s.id === 'general' || p.specialites.includes(s.specialite);
