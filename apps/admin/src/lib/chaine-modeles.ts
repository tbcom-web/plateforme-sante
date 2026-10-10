import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { redirect } from 'next/navigation';
import {
  appliquerResultatTest, fairetournerChaine, lireResultatsTests, lireRetouches, nouvelleVersion, normaliserResultatTest, normaliserTicket, retouchesAAppliquer, roleEffectif,
  estStatutModele, fichesSansVersion, versionDe, STATUTS_BOUCLE, elementsComposition, modeleIntegre, normaliserComposition, qualiteComposition, type ActionAuto, type GrilleTournoi, type SignauxCandidat, type EtatChaine, type FicheModele, type RevueModele, type RoleEquipe, type TicketModele, type VersionModele, type VoteModele,
} from '@plateforme/core';
import { createClient, getUser } from '@/lib/supabase/server';
import { getRoles } from '@/lib/admin';
import { lireEnCache, TAGS_DONNEES } from '@/lib/cache-donnees';
import { predictionsParCle } from '@plateforme/core/juge';
import { getPoidsAtelier } from '@/lib/atelier';
import { getPredictions } from '@/lib/predictions';
import { signatureSources } from '@/lib/apprentissage-instantane';

// CHAÎNE DE PRODUCTION DES MODÈLES côté serveur (migration 0050, packages/core/src/chaine-modeles.ts, docs/chaine-modeles.md) :
// - rôles : getEquipier (rôle effectif : super admin = validateur), exigerContributeur, exigerValidateur ;
// - lecture de la chaîne (fiches, versions, tickets, votes, avis) avec la session de la personne (RLS équipe) ;
// - faireTournerChaine : ce qui tourne tout seul, à chaque ouverture du tableau ou après une action. Écritures « testeur » (résultat
//   de test, tickets techniques, fermeture au vert) : la base ne les accepte que du validateur ou du service (0050) ; ouvert par
//   un contributeur, ces écritures échouent sans bruit et attendent le passage du validateur ou l'écriture directe de la CI. Résultats du testeur
//   (retours/tests-modeles.json du dépôt ou colonne modeles_versions.test) → tickets techniques ; retouches de Claude
//   (retours/retouches-modeles.json) → nouvelles versions ; puis l'automate (fin des tournois, entrée dans la boucle, passages
//   d'étape). Aucune publication ici : publier reste un geste du validateur.

export const MIGRATION_CHAINE = 'Migration 0050 à exécuter (supabase/migrations/0050_chaine_modeles.sql) : la chaîne des modèles n’enregistre rien pour l’instant.';
/** Lecture impossible (délai de 20 s dépassé, réseau, droits) : PAS une migration manquante (2026-10-10) */
export const LECTURE_CHAINE = 'La base répond trop lentement : la chaîne n’a pas pu être lue. Rien n’est perdu ; rechargez la page dans un instant.';

/** Passages d'étape pas tous faits (refus de la base, délai) : repris seuls au prochain chargement (2026-10-10) */
export const AUTOMATE_INCOMPLET = 'Certains passages d’étape automatiques n’ont pas pu être faits (base lente ou refus) : rien n’est perdu, ils sont repris au prochain chargement.';

/** Table absente (migration pas encore exécutée) : 42P01 (Postgres) ou PGRST205 (cache du schéma) */
const tableAbsente = (e: { code?: string; message?: string } | null | undefined) =>
  Boolean(e && (e.code === '42P01' || e.code === 'PGRST205' || /relation .* does not exist|Could not find the table/i.test(e.message ?? '')));

export type Equipier = { id: string; email: string; role: RoleEquipe };

async function getEquipierSansMemo(): Promise<Equipier | null> {
  // Session et profil lus une fois par requête (getRoles, partagé avec le menu et la portée des instantanés)
  const r = await getRoles();
  if (!r) return null;
  const role = roleEffectif(r.role, r.roleEquipe);
  return role ? { id: r.id, email: r.email, role } : null;
}
export const getEquipier = cache(getEquipierSansMemo);

/** En tête de chaque page et action de la chaîne : contributeur ou validateur */
export async function exigerContributeur(): Promise<Equipier> {
  if (!(await getUser())) redirect('/connexion');
  const e = await getEquipier();
  if (!e) redirect('/tableau-de-bord');
  return e;
}

/** Validation finale, publication, rôles : validateur (Paul) seulement */
export async function exigerValidateur(): Promise<Equipier> {
  const e = await exigerContributeur();
  if (e.role !== 'validateur') redirect('/chaine');
  return e;
}

// ---------------------------------------------------------------------------------------------------------------
// Lignes → objets du core
// ---------------------------------------------------------------------------------------------------------------

const tableau = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function ficheDepuisLigne(l: Record<string, unknown>): FicheModele | null {
  if (typeof l.id !== 'string' || !estStatutModele(l.statut)) return null;
  const t = (l.tags ?? {}) as Record<string, unknown>;
  const sc = (l.scenario ?? {}) as Record<string, unknown>;
  return {
    id: l.id, nom: String(l.nom ?? ''), profession: String(l.profession ?? 'podologue'), profil: typeof l.profil === 'string' && l.profil ? l.profil : null, statut: l.statut,
    versionCourante: Number(l.version_courante) || 1, versionPubliee: l.version_publiee == null ? null : Number(l.version_publiee),
    versionRetouche: l.version_retouche == null ? null : Number(l.version_retouche),
    justificationTest: typeof l.justification_test === 'string' ? l.justification_test : null,
    justificationVersion: l.justification_version == null ? null : Number(l.justification_version),
    tags: { profession: String(t.profession ?? l.profession ?? ''), profils: tableau(t.profils), couleurs: tableau(t.couleurs) }, tagsValides: Boolean(l.tags_valides),
    recette: typeof l.recette === 'string' ? l.recette : null, origine: l.origine === 'recette' || l.origine === 'claude' ? l.origine : 'preselection',
    cle: String(l.cle ?? ''), rang: l.rang == null ? null : Number(l.rang),
    scenario: { principaux: tableau(sc.principaux), secondaires: tableau(sc.secondaires), couleurs: tableau(sc.couleurs) }, creeLe: String(l.created_at ?? ''),
  };
}

export function versionDepuisLigne(l: Record<string, unknown>): VersionModele {
  return {
    modele: String(l.modele), version: Number(l.version), composition: (l.composition ?? {}) as Record<string, unknown>, cle: String(l.cle ?? ''),
    journal: Array.isArray(l.journal) ? (l.journal as VersionModele['journal']) : [], auteur: String(l.auteur ?? ''), test: normaliserResultatTest(l.test), creeLe: String(l.created_at ?? ''),
  };
}

export function ticketDepuisLigne(l: Record<string, unknown>): (TicketModele & { id: string }) | null {
  const t = normaliserTicket({
    numero: l.numero, modele: l.modele, page: l.page, appareil: l.appareil, zone: l.zone, element: l.element, etiquette: l.etiquette, commentaire: l.commentaire,
    origine: l.origine, gravite: l.gravite, auteur: l.auteur ?? (l.origine === 'testeur' ? 'testeur' : ''), statut: l.statut, versionOuverture: l.version_ouverture,
    versionCorrection: l.version_correction, controle: l.controle, creeLe: l.created_at,
  });
  return t ? { ...t, id: String(l.id) } : null;
}

const voteDepuisLigne = (l: Record<string, unknown>): VoteModele => ({
  profil: l.profil == null ? null : String(l.profil), a: String(l.a), b: String(l.b), resultat: l.resultat === 'a' || l.resultat === 'b' ? l.resultat : 'egalite', votant: String(l.votant ?? ''), poids: Number(l.poids) || 1, le: String(l.created_at ?? ''),
});
const revueDepuisLigne = (l: Record<string, unknown>): RevueModele => ({
  modele: String(l.modele), version: Number(l.version), page: (l.page ?? null) as RevueModele['page'], appareil: (l.appareil ?? null) as RevueModele['appareil'], auteur: String(l.auteur ?? ''),
  verdict: l.verdict === 'tickets' || l.verdict === 'revalide' ? l.verdict : 'rien', le: String(l.created_at ?? ''),
});

export const ligneTicket = (t: TicketModele) => ({
  modele: t.modele, numero: t.numero, page: t.page, appareil: t.appareil, zone: t.zone ?? null, element: t.element ?? null, etiquette: t.etiquette, commentaire: t.commentaire,
  origine: t.origine, gravite: t.gravite ?? null, controle: t.controle ?? null, statut: t.statut, version_ouverture: t.versionOuverture, version_correction: t.versionCorrection ?? null,
});

/** Réservation d'une grille servie et pas encore répondue (15 min) */
const RESERVATION_GRILLE_MS = 15 * 60 * 1000;
type GrilleEnCours = { id: string; profil: string | null; propositions: string[]; votant: string; servieLe: string };

/** Grilles du tournoi (0052) : répondues → GrilleTournoi ; en cours depuis moins de 15 min (à `maintenant`) → réservations */
function grillesDepuisLignes(lignes: Record<string, unknown>[], ids: ReadonlySet<string>, maintenant = Date.now()) {
  const grilles: GrilleTournoi[] = [], grillesEnCours: GrilleEnCours[] = [];
  const limite = maintenant - RESERVATION_GRILLE_MS;
  for (const l of lignes) {
    const propositions = Array.isArray(l.propositions) ? (l.propositions as string[]).map(String) : [];
    if (!propositions.length || !propositions.every((p) => ids.has(p))) continue;
    if (l.repondue_le && Array.isArray(l.meilleures)) {
      grilles.push({ profil: l.profil == null ? null : String(l.profil), propositions, meilleures: (l.meilleures as number[]).map(Number), pire: l.pire == null ? null : Number(l.pire), votant: String(l.votant), poids: Number(l.poids) || 1, le: String(l.repondue_le) });
    } else if (Date.parse(String(l.servie_le)) >= limite) {
      grillesEnCours.push({ id: String(l.id), profil: l.profil == null ? null : String(l.profil), propositions, votant: String(l.votant), servieLe: String(l.servie_le) });
    }
  }
  return { grilles, grillesEnCours };
}

export type Chaine = EtatChaine & {
  tickets: (TicketModele & { id: string })[];
  migrationManquante: boolean;
  /** Grilles servies et pas encore répondues (réservations, 15 min) */
  grillesEnCours: GrilleEnCours[];
  /** « J'aime » de la présélection par modèle (0052) */
  jaime: Record<string, number>;
  migrationGrilles: boolean;
  /** Lecture en échec (délai, réseau) : chaîne incomplète, l'automate n'écrit rien (LECTURE_CHAINE) */
  erreurLecture: boolean;
  /** Signature des tables de la chaîne au moment de la lecture (compteurs de 0059/0062), null si inconnue */
  signature?: string | null;
};

/** Max rows de Supabase (lignes par requête au plus, réglage du projet) */
const MAX_LIGNES = 1000;
type Paquet<T> = { data: T[] | null; error: { code?: string; message?: string } | null };
/**
 * Toutes les lignes d'une lecture triée, par paquets de MAX_LIGNES (jusqu'à `plafond`) ; erreur d'un paquet : erreur de la lecture.
 * Paquet suivant demandé SEULEMENT si le précédent est plein (une table de moins de 1 000 lignes : une requête).
 */
export async function toutesLesLignes<T = Record<string, unknown>>(faire: (de: number, a: number) => PromiseLike<{ data: unknown; error: unknown }>, plafond: number): Promise<Paquet<T>> {
  let lignes: T[] = [];
  for (let de = 0; de < plafond; de += MAX_LIGNES) {
    const r = await faire(de, de + MAX_LIGNES - 1);
    if (r.error) return { data: de ? lignes : null, error: r.error as Paquet<T>['error'] };
    const l = (Array.isArray(r.data) ? r.data : []) as T[];
    lignes = de ? lignes.concat(l) : l;
    if (l.length < MAX_LIGNES) break;
  }
  return { data: lignes, error: null };
}

// Colonnes lues (2026-10-10, « optimiser les requêtes ») : celles des objets du core, jamais select('*')
const COLONNES_FICHE = 'id, nom, profession, profil, statut, version_courante, version_publiee, version_retouche, justification_test, justification_version, tags, tags_valides, recette, origine, cle, rang, scenario, created_at';
const COLONNES_VERSION = 'modele, version, composition, cle, journal, auteur, test, created_at';
const COLONNES_TICKET = 'id, numero, modele, page, appareil, zone, element, etiquette, commentaire, origine, gravite, auteur, statut, version_ouverture, version_correction, controle, created_at';

type ErreurLecture = { code?: string; message?: string } | null;
type Ligne = Record<string, unknown>;
/** Lignes brutes de la chaîne (fonction chaine_etat de 0062, ou lectures table par table), avant conversion en objets du core */
type Brut = {
  fiches: Ligne[]; erreurFiches: ErreurLecture;
  versions: Ligne[]; tickets: Ligne[]; votes: Ligne[]; revues: Ligne[]; grilles: Ligne[]; jaime: { modele: string; n: number }[];
  erreurs: { versions: ErreurLecture; tickets: ErreurLecture; votes: ErreurLecture; revues: ErreurLecture; grilles: ErreurLecture };
};
type ClientLecture = Awaited<ReturnType<typeof createClient>>;

/** Fonction absente (migration 0062 pas encore exécutée) : PGRST202 (cache du schéma) ou 42883 (Postgres) */
const fonctionAbsente = (e: { code?: string; message?: string } | null | undefined) =>
  Boolean(e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|function .* does not exist/i.test(e.message ?? '')));
// Fonction chaine_etat absente : lectures table par table pendant 10 min sur l'instance (puis nouvel essai : migration exécutée)
let fonctionAbsenteLe = 0;

/**
 * UNE requête (2026-10-10, perf de la chaîne) : fonction chaine_etat(profession, versions) de 0062 → fiches, versions (utiles ou
 * toutes), tickets, duels, avis, grilles (répondues et réservations de moins de 15 min) et « J'aime » comptés, mêmes colonnes et
 * mêmes tris que les lectures table par table. null : fonction absente ou en erreur (les lectures d'avant prennent le relais).
 */
async function lireParFonction(supabase: ClientLecture, profession: string | null, utiles: boolean, s: AbortSignal): Promise<Brut | null> {
  if (Date.now() - fonctionAbsenteLe < 10 * 60_000) return null;
  try {
    const { data, error } = await supabase.rpc('chaine_etat', { p_profession: profession, p_versions: utiles ? 'utiles' : 'toutes' }).abortSignal(s);
    if (error) {
      if (fonctionAbsente(error)) fonctionAbsenteLe = Date.now();
      else console.warn(`[chaine] chaine_etat en erreur, lecture table par table : ${error.message ?? error.code}`);
      return null;
    }
    const d = data as Record<string, unknown> | null;
    if (!d || typeof d !== 'object' || !Array.isArray(d.fiches)) return null;
    const tab = (k: string) => (Array.isArray(d[k]) ? (d[k] as Ligne[]) : []);
    return {
      fiches: tab('fiches'), erreurFiches: null, versions: tab('versions'), tickets: tab('tickets'), votes: tab('votes'), revues: tab('revues'), grilles: tab('grilles'),
      jaime: tab('jaime').map((l) => ({ modele: String(l.modele), n: Number(l.n) || 0 })),
      erreurs: { versions: null, tickets: null, votes: null, revues: null, grilles: null },
    };
  } catch (e) {
    console.warn(`[chaine] chaine_etat en erreur, lecture table par table : ${(e as Error)?.message ?? e}`);
    return null;
  }
}

/** Lectures table par table (sans la migration 0062, ou fonction en erreur) : par paquets de 1 000, en parallèle */
async function lireParTables(supabase: ClientLecture, profession: string | null, utiles: boolean, s: AbortSignal): Promise<Brut> {
  // Supabase renvoie 1 000 lignes AU PLUS par requête (« Max rows », quel que soit .limit) : 2026-10-10, bug « grille 49 » — au-delà
  // de 1 000 versions, celles de candidats manquaient, leur design arrivait vide dans la grille et son rendu plantait la page. Lecture
  // par paquets de 1 000 (tri total : clé unique en dernier), jusqu'au plafond de chaque table.
  const fiches0 = () => { let q = supabase.from('modeles_fiches').select(COLONNES_FICHE); if (profession) q = q.eq('profession', profession); return q.order('created_at', { ascending: true }).order('id', { ascending: true }); };
  const lireVersions = async () => {
    if (utiles) {
      const r = await toutesLesLignes((de, a) => { let q = supabase.from('modeles_versions_utiles').select(COLONNES_VERSION); if (profession) q = q.eq('profession', profession); return q.order('version', { ascending: true }).order('modele', { ascending: true }).range(de, a).abortSignal(s); }, 20000);
      // Vue de 0059 absente OU en erreur (cache du schéma, droits, délai) : lecture complète d'avant, jamais une chaîne « illisible »
      if (!r.error) return r;
    }
    return toutesLesLignes((de, a) => supabase.from('modeles_versions').select(COLONNES_VERSION).order('version', { ascending: true }).order('modele', { ascending: true }).range(de, a).abortSignal(s), 50000);
  };
  const lireJaime = async (): Promise<{ data: { modele: string; n: number }[] | null; error: unknown }> => {
    if (utiles) {
      const r = await toutesLesLignes<{ modele: string; n: number }>((de, a) => supabase.from('modeles_jaime_compteurs').select('modele, n').order('modele', { ascending: true }).range(de, a).abortSignal(s), 50000);
      if (!r.error) return { data: r.data ?? [], error: null };
    }
    const r = await toutesLesLignes<{ modele: string }>((de, a) => supabase.from('modeles_jaime').select('modele').order('modele', { ascending: true }).order('votant', { ascending: true }).range(de, a).abortSignal(s), 50000);
    return { data: (r.data ?? []).map((l) => ({ modele: l.modele, n: 1 })), error: r.error };
  };
  // Fiches lues EN MÊME TEMPS que le reste (une attente de moins) ; le reste est filtré ensuite sur leurs identifiants
  const [fl, vl, tl, vol, rl, gl, jl] = await Promise.all([
    toutesLesLignes((de, a) => fiches0().range(de, a).abortSignal(s), 5000),
    lireVersions(),
    toutesLesLignes((de, a) => supabase.from('modeles_tickets').select(COLONNES_TICKET).order('numero', { ascending: true }).order('id', { ascending: true }).range(de, a).abortSignal(s), 20000),
    toutesLesLignes((de, a) => supabase.from('modeles_votes').select('profil, a, b, resultat, votant, poids, created_at').order('created_at', { ascending: true }).order('id', { ascending: true }).range(de, a).abortSignal(s), 20000),
    toutesLesLignes((de, a) => supabase.from('modeles_revues').select('modele, version, page, appareil, auteur, verdict, created_at').order('created_at', { ascending: true }).order('id', { ascending: true }).range(de, a).abortSignal(s), 20000),
    toutesLesLignes((de, a) => supabase.from('modeles_grilles').select('id, profil, propositions, votant, servie_le, meilleures, pire, poids, repondue_le').order('servie_le', { ascending: true }).order('id', { ascending: true }).range(de, a).abortSignal(s), 20000),
    lireJaime(),
  ]);
  return {
    fiches: (fl.data ?? []) as Ligne[], erreurFiches: fl.error,
    versions: (vl.data ?? []) as Ligne[], tickets: (tl.data ?? []) as Ligne[], votes: (vol.data ?? []) as Ligne[], revues: (rl.data ?? []) as Ligne[], grilles: (gl.data ?? []) as Ligne[],
    jaime: jl.data ?? [],
    erreurs: { versions: vl.error, tickets: tl.error, votes: vol.error, revues: rl.error, grilles: gl.error as ErreurLecture },
  };
}

/** Lignes brutes → chaîne (objets du core), filtrées sur les fiches lues */
function chaineDepuisBrut(b: Brut): Chaine {
  if (b.erreurFiches) return { fiches: [], versions: [], tickets: [], votes: [], revues: [], grilles: [], grillesEnCours: [], jaime: {}, migrationManquante: tableAbsente(b.erreurFiches), migrationGrilles: true, erreurLecture: !tableAbsente(b.erreurFiches) };
  const fiches = b.fiches.map(ficheDepuisLigne).filter((f): f is FicheModele => f !== null);
  const ids = new Set(fiches.map((f) => f.id));
  return {
    fiches,
    versions: b.versions.map(versionDepuisLigne).filter((v) => ids.has(v.modele)),
    tickets: b.tickets.map(ticketDepuisLigne).filter((t): t is TicketModele & { id: string } => t !== null && ids.has(t.modele)),
    votes: b.votes.map(voteDepuisLigne).filter((v) => ids.has(v.a) && ids.has(v.b)),
    revues: b.revues.map(revueDepuisLigne).filter((r) => ids.has(r.modele)),
    ...grillesDepuisLignes(b.grilles, ids),
    jaime: b.jaime.reduce<Record<string, number>>((m, l) => { m[l.modele] = (m[l.modele] ?? 0) + (Number(l.n) || 0); return m; }, {}),
    migrationGrilles: tableAbsente(b.erreurs.grilles),
    migrationManquante: false,
    // Versions, tickets, duels ou avis illisibles (délai) : l'automate ne doit rien décider sur une chaîne incomplète
    erreurLecture: [b.erreurs.versions, b.erreurs.tickets, b.erreurs.votes, b.erreurs.revues].some(Boolean) || Boolean(b.erreurs.grilles && !tableAbsente(b.erreurs.grilles)),
  };
}

// MÉMOIRE DE LA CHAÎNE PAR SIGNATURE (2026-10-10, perf de la chaîne) : la chaîne lue est gardée sur l'instance tant que les compteurs
// de ses tables (apprentissage_sources, déclencheurs de 0059 et 0062 : un compteur augmenté par la base à chaque ajout, modification
// ou suppression qui touche une ligne) n'ont pas changé. La signature est lue AVANT la chaîne (petite requête partagée par la page) :
// la chaîne gardée est donc toujours au moins aussi récente que sa signature ; un vote, une grille, un passage d'étape (même fait par
// une autre instance ou par la CI) change la signature → relecture. Sans les compteurs (0062 pas exécutée) : aucune mémoire.
// Toute l'équipe lit la même chaîne (règles de lecture « est_contributeur » de 0050) : mémoire commune aux comptes de l'équipe.
const TABLES_CHAINE = ['modeles_fiches', 'modeles_versions', 'modeles_tickets', 'modeles_votes', 'modeles_revues', 'modeles_grilles', 'modeles_jaime'] as const;
const memoChaine = new Map<string, { signature: string; chaine: Chaine }>();
const lecturesEnCours = new Map<string, Promise<Chaine>>();

/**
 * Copie servie : listes modifiables copiées (tickets, « J'aime »), réservations refiltrées à l'heure actuelle. Fiches, versions,
 * duels, avis et grilles sont des listes EN LECTURE SEULE (EtatChaine) : partagées telles quelles d'une requête à l'autre, ce qui
 * garde aussi les index et empreintes du core (versionDe, tournoiDuProfil) calculés une fois par chaîne lue.
 */
function copie(c: Chaine): Chaine {
  const limite = Date.now() - RESERVATION_GRILLE_MS;
  return { ...c, tickets: [...c.tickets], grillesEnCours: c.grillesEnCours.filter((g) => Date.parse(g.servieLe) >= limite), jaime: { ...c.jaime } };
}

/**
 * Toute la chaîne d'une profession (null = toutes). `versions: 'utiles'` (tableau, présélection, tournoi : 2026-10-10) : versions
 * courante et précédente de chaque fiche seulement (résultat du testeur sur la courante ; c'est tout ce que lisent l'automate, le
 * guidage et le tournoi), « J'aime » comptés par la base ; par défaut (fiche, révision, actions) : tout l'historique.
 * Lecture : mémoire de l'instance si la signature n'a pas changé, sinon fonction chaine_etat (0062, une requête), sinon lectures table
 * par table (0059 ou avant). `frais` : jamais la mémoire (relecture juste après une écriture de la même requête : la signature déjà
 * lue par la page date d'avant l'écriture).
 */
export async function lireChaine(profession: string | null, opts: { versions?: 'utiles' | 'toutes'; frais?: boolean } = {}): Promise<Chaine> {
  const utiles = opts.versions === 'utiles';
  const cle = `${profession ?? '*'}|${utiles ? 'utiles' : 'toutes'}`;
  if (opts.frais) memoChaine.delete(cle);
  const signature = opts.frais ? null : await signatureSources(TABLES_CHAINE).catch(() => null);
  if (signature) {
    const m = memoChaine.get(cle);
    if (m?.signature === signature) return copie(m.chaine);
    // Même lecture déjà en cours sur l'instance (pages ouvertes en même temps) : attendue au lieu d'être refaite
    const deja = lecturesEnCours.get(`${cle}|${signature}`);
    if (deja) return copie(await deja);
  }
  const lecture = (async () => {
    const supabase = await createClient();
    // Signal propre à chaque lecture : pas de mémorisation des fetch identiques pendant le rendu (relecture après écriture)
    const s = new AbortController().signal;
    const brut = (await lireParFonction(supabase, profession, utiles, s)) ?? (await lireParTables(supabase, profession, utiles, s));
    const chaine: Chaine = { ...chaineDepuisBrut(brut), signature };
    // Chaîne complète seulement (jamais une lecture en échec gardée) ; signature lue AVANT la chaîne
    if (signature && !chaine.erreurLecture && !chaine.migrationManquante) {
      memoChaine.delete(cle);
      memoChaine.set(cle, { signature, chaine });
      if (memoChaine.size > 8) memoChaine.delete(memoChaine.keys().next().value!);
    }
    return chaine;
  })();
  if (!signature) return lecture;
  const k = `${cle}|${signature}`;
  lecturesEnCours.set(k, lecture);
  try {
    return copie(await lecture);
  } finally {
    lecturesEnCours.delete(k);
  }
}

/** Mémoire de la chaîne vidée (geste d'une action serveur : la page suivante relit, même si la signature n'a pas encore bougé) */
export function oublierChaine() { memoChaine.clear(); }

// ---------------------------------------------------------------------------------------------------------------
// Version initiale d'une fiche (2026-10-10, suite du bug « grille 49 ») : jamais une fiche candidate sans version
// ---------------------------------------------------------------------------------------------------------------

type ClientSupabase = Awaited<ReturnType<typeof createClient>>;
export type LigneVersionInitiale = { modele: string; composition: Record<string, unknown>; cle: string; journal: VersionModele['journal']; auteur: string };
/** Message quand une fiche a dû être écartée faute de version */
export const VERSION_NON_ENREGISTREE = 'Un design n’a pas pu être enregistré complètement (version non enregistrée) : il a été écarté. Réessayez dans un instant.';

/**
 * Écrit la version 1 d'une fiche qui vient d'être créée ; une version déjà là (23505) compte comme écrite. Échec : un nouvel essai,
 * puis (si `ecarterSiEchec`) la fiche est écartée par la base (avancer_modele candidat → écarté, permis à l'équipe) pour qu'elle
 * n'arrive jamais vide dans une grille. Renvoie true si la fiche a sa version. Jamais d'exception.
 */
export async function enregistrerVersionInitiale(supabase: ClientSupabase, v: LigneVersionInitiale, opts: { ecarterSiEchec?: boolean } = {}): Promise<boolean> {
  for (let essai = 0; essai < 2; essai++) {
    try {
      const { error } = await supabase.from('modeles_versions').insert({ modele: v.modele, version: 1, composition: v.composition, cle: v.cle, journal: v.journal, auteur: v.auteur });
      if (!error || error.code === '23505') return true;
      console.warn(`[chaine] version initiale de ${v.modele} refusée (essai ${essai + 1}) : ${error.message ?? error.code}`);
    } catch (e) {
      console.warn(`[chaine] version initiale de ${v.modele} en erreur (essai ${essai + 1}) : ${(e as Error)?.message ?? e}`);
    }
    if (!essai) await new Promise((r) => setTimeout(r, 400));
  }
  if (opts.ecarterSiEchec !== false) {
    try {
      const { error } = await supabase.rpc('avancer_modele', { p_id: v.modele, p_vers: 'ecarte', p_rang: null });
      console.warn(`[chaine] fiche ${v.modele} écartée : version non enregistrée${error ? ` (écart refusé : ${error.message ?? error.code})` : ''}`);
    } catch { /* l'automate la répare ou l'écarte plus tard (reparerFichesSansVersion) */ }
  }
  return false;
}

/**
 * Réparation (automate) : fiches candidates sans version courante depuis plus de 10 min (fichesSansVersion, core). Design connu
 * (proposition de Claude de même clé, recette liée) → version réécrite ; sinon fiche écartée. Renvoie le nombre de fiches traitées.
 */
async function reparerFichesSansVersion(supabase: ClientSupabase, chaine: Chaine): Promise<number> {
  const orphelines = fichesSansVersion(chaine, Date.now());
  if (!orphelines.length) return 0;
  const designs = new Map<string, Record<string, unknown>>();
  try {
    const { designsConnusParCle } = await import('@/lib/chaine-guidage');
    for (const [cle, d] of await designsConnusParCle(orphelines)) designs.set(cle, d);
  } catch { /* designs inconnus : fiches écartées */ }
  let n = 0;
  for (const f of orphelines) {
    // Seule la version 1 se réécrit (design d'origine) ; une version courante plus récente perdue : fiche écartée
    const design = f.versionCourante === 1 ? designs.get(f.cle) : undefined;
    const ok = design
      ? await enregistrerVersionInitiale(supabase, { modele: f.id, composition: design, cle: f.cle, journal: [{ type: 'creation', texte: 'version réécrite par l’automate (version initiale non enregistrée)' }], auteur: 'automate' }, { ecarterSiEchec: false })
      : false;
    if (!ok) {
      try {
        const { error } = await supabase.rpc('avancer_modele', { p_id: f.id, p_vers: 'ecarte', p_rang: null });
        if (!error) console.warn(`[chaine] fiche ${f.id} « ${f.nom} » écartée : design non enregistré (version absente, design introuvable)`);
      } catch { /* prochain tour */ }
    }
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------------------------------------------
// Fichiers du dépôt écrits par les agents (testeur, Claude) : API GitHub, sinon dossier local
// ---------------------------------------------------------------------------------------------------------------

export async function lireFichierRetours(nom: string): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO;
  if (token && repo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/${nom}?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, next: { revalidate: 120 }, signal: AbortSignal.timeout(5000),
      });
      if (r.ok) return await r.json();
    } catch { /* repli local */ }
  }
  for (const racine of [process.env.RETOURS_DIR ?? '', process.cwd(), join(process.cwd(), '..', '..')].filter(Boolean)) {
    try { return JSON.parse(await readFile(join(racine, racine === process.env.RETOURS_DIR ? '' : 'retours', nom), 'utf8')); } catch { /* suivant */ }
  }
  return null;
}

/**
 * Noms des fichiers d'un dossier de retours/ (API GitHub, sinon dossier local), ou null si la liste est illisible. Sert à ne demander
 * que les résultats de test qui EXISTENT (2026-10-10 : un appel à l'API GitHub par fiche en révision auparavant, presque tous en 404).
 */
export async function listerDossierRetours(dossier: string): Promise<Set<string> | null> {
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO;
  if (token && repo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/${dossier}?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, next: { revalidate: 120 }, signal: AbortSignal.timeout(5000),
      });
      if (r.status === 404) return new Set();
      if (r.ok) { const l = (await r.json()) as { name?: string }[]; if (Array.isArray(l)) return new Set(l.map((x) => String(x.name ?? ''))); }
    } catch { /* repli local */ }
    return null;
  }
  const { readdir } = await import('node:fs/promises');
  for (const racine of [process.env.RETOURS_DIR ?? '', process.cwd(), join(process.cwd(), '..', '..')].filter(Boolean)) {
    try { return new Set(await readdir(join(racine, racine === process.env.RETOURS_DIR ? '' : 'retours', dossier))); } catch { /* suivant */ }
  }
  return new Set();
}

// ---------------------------------------------------------------------------------------------------------------
// Ce qui tourne tout seul
// ---------------------------------------------------------------------------------------------------------------

export type BilanAutomate = {
  tests: number; retouches: number; tickets: number; actions: ActionAuto[];
  /** Passages d'étape refusés ou pas faits faute de temps (repris au prochain chargement) : la page l'explique, sans planter */
  echecs: number;
  /** Étape de l'automate en erreur (exception attrapée) : la page affiche la chaîne lue et un message */
  erreur?: string;
};

// Lectures GitHub (résultats du testeur, retouches de Claude) au plus une fois toutes les AUTOMATE_MS par profession sur une instance
// (2026-10-09, « la chaîne met super longtemps à charger »). Les TRANSITIONS (fin du tournoi, entrée dans la boucle…), elles, sont
// recalculées à chaque chargement sur la chaîne fraîche (calcul pur, quelques ms ; aucune écriture s'il n'y a rien à faire) :
// 2026-10-10, bug « grille 49 » : oublierAutomate() appelé dans une action serveur ne vidait pas toujours la mémoire vue par la page
// (module chargé séparément) ; la fin du tournoi attendait alors 30 s et le guidage proposait autre chose que les finalistes.
const AUTOMATE_MS = 30_000;
const dernierTour = new Map<string, number>();
export function oublierAutomate() { dernierTour.clear(); oublierChaine(); }
/** Temps au plus pour les passages d'étape d'un chargement (le reste est fait au chargement suivant : la page ne dépasse jamais) */
const TRANSITIONS_MS = 8_000;

/**
 * Passages d'étape par la base (avancer_modele, 0050), en parallèle par fiche (2026-10-10 : fin d'un tournoi de 30 candidats = 40
 * appels qui se suivaient, plusieurs secondes de plus sur la page) : les étapes d'une même fiche restent dans l'ordre ; les entrées
 * dans la boucle de révision (plafond de 10 vérifié en base) passent après, une à une. Jamais d'exception : un refus est compté.
 */
async function appliquerTransitions(supabase: Awaited<ReturnType<typeof createClient>>, actions: readonly ActionAuto[]): Promise<{ faites: ActionAuto[]; echecs: number }> {
  const faites: ActionAuto[] = [];
  let echecs = 0;
  const fin = Date.now() + TRANSITIONS_MS;
  const une = async (a: ActionAuto): Promise<boolean> => {
    if (Date.now() > fin) { echecs++; return false; }
    try {
      const { error } = a.kind === 'statut'
        ? await supabase.rpc('avancer_modele', { p_id: a.modele, p_vers: a.vers, p_rang: a.rang ?? null })
        : await supabase.from('modeles_tickets').update({ statut: 'ferme', version_correction: a.version }).eq('modele', a.modele).eq('numero', a.numero).neq('statut', 'ferme');
      if (error) { echecs++; console.warn(`[chaine] passage refusé ${a.modele} → ${a.kind === 'statut' ? a.vers : `ticket ${a.numero}`} : ${error.message ?? error.code}`); return false; }
      faites.push(a);
      return true;
    } catch (e) {
      echecs++;
      console.warn(`[chaine] passage en erreur ${a.modele} : ${(e as Error)?.message ?? e}`);
      return false;
    }
  };
  const boucle = actions.filter((a) => a.kind === 'statut' && a.vers === 'check-agent');
  const autres = actions.filter((a) => !boucle.includes(a));
  const parFiche = new Map<string, ActionAuto[]>();
  for (const a of autres) parFiche.set(a.modele, [...(parFiche.get(a.modele) ?? []), a]);
  const files = [...parFiche.values()];
  // 8 fiches à la fois au plus ; une étape refusée arrête la suite de SA fiche seulement
  for (let i = 0; i < files.length; i += 8) {
    await Promise.all(files.slice(i, i + 8).map(async (l) => { for (const a of l) if (!(await une(a))) break; }));
  }
  for (const a of boucle) {
    // Pas d'entrée dans la boucle pour une fiche dont le passage précédent (finaliste) a été refusé
    if (autres.some((x) => x.modele === a.modele && !faites.includes(x))) { echecs++; continue; }
    await une(a);
  }
  return { faites, echecs };
}

/**
 * Applique tests du dépôt, retouches de Claude et transitions automatiques ; renvoie ce qui a été fait. Ne lève JAMAIS d'exception
 * (2026-10-10, bug « grille 49 ») : une étape en erreur laisse la chaîne lue telle quelle, avec `erreur` pour le message de la page.
 */
export async function faireTournerChaine(profession: string | null, opts: { versions?: 'utiles' | 'toutes' } = {}): Promise<BilanAutomate & { chaine: Chaine }> {
  let chaine: Chaine;
  try {
    chaine = await lireChaine(profession, opts);
  } catch (e) {
    console.warn(`[chaine] lecture en erreur : ${(e as Error)?.message ?? e}`);
    return { tests: 0, retouches: 0, tickets: 0, actions: [], echecs: 0, chaine: chaineVide(), erreur: 'lecture' };
  }
  const bilan: BilanAutomate = { tests: 0, retouches: 0, tickets: 0, actions: [], echecs: 0 };
  if (chaine.migrationManquante || chaine.erreurLecture || !chaine.fiches.length) return { ...bilan, chaine };
  try {
    return await tourAutomate(profession, opts, chaine, bilan);
  } catch (e) {
    console.warn(`[chaine] automate en erreur : ${(e as Error)?.message ?? e}`);
    const relue = await lireChaine(profession, { ...opts, frais: true }).catch(() => chaine);
    return { ...bilan, erreur: 'automate', chaine: { ...relue, signaux: await signauxCandidats(relue).catch(() => ({})) } };
  }
}

/** Chaîne vide marquée « lecture impossible » (la page affiche LECTURE_CHAINE) */
export const chaineVide = (): Chaine => ({ fiches: [], versions: [], tickets: [], votes: [], revues: [], grilles: [], grillesEnCours: [], jaime: {}, migrationManquante: false, migrationGrilles: false, erreurLecture: true });

async function tourAutomate(profession: string | null, opts: { versions?: 'utiles' | 'toutes' }, chaine0: Chaine, bilan: BilanAutomate): Promise<BilanAutomate & { chaine: Chaine }> {
  let chaine = chaine0;
  const k = profession ?? '*';
  const supabase = await createClient();
  if (Date.now() - (dernierTour.get(k) ?? 0) < AUTOMATE_MS) {
    // Entre deux tours complets : seulement les transitions (fin du tournoi juste après la dernière grille, entrée dans la boucle)
    chaine = { ...chaine, signaux: await signauxCandidats(chaine) };
    const { actions } = fairetournerChaine(chaine);
    if (!actions.length) return { ...bilan, chaine };
    const r = await appliquerTransitions(supabase, actions);
    bilan.actions.push(...r.faites); bilan.echecs += r.echecs;
    if (r.faites.length) chaine = { ...(await lireChaine(profession, { ...opts, frais: true })), signaux: chaine.signaux };
    return { ...bilan, chaine };
  }
  dernierTour.set(k, Date.now());
  const [testsBruts, retouchesBrutes] = await Promise.all([lireFichierRetours('tests-modeles.json'), lireFichierRetours('retouches-modeles.json')]);
  let change = false;
  // 1. Résultats du testeur (fichiers du dépôt) : liste commune `tests-modeles.json`, et un fichier par version écrit par l'agent
  //    testeur (`tests-modeles/<modele>-v<version>.json`, docs/testeur-modeles.md) pour les versions courantes encore sans test ;
  //    enregistrés sur la version testée s'ils sont plus récents que celui déjà en base
  const sansTest = chaine.fiches.filter((f) => STATUTS_BOUCLE.includes(f.statut) || f.statut === 'pret-validation' || f.statut === 'publie')
    .filter((f) => !chaine.versions.find((v) => v.modele === f.id && v.version === f.versionCourante)?.test);
  // Seulement les fichiers présents dans le dossier (liste illisible : chaque fichier demandé, comme avant)
  const presents = await listerDossierRetours('tests-modeles').catch(() => null);
  const nomTest = (f: FicheModele) => `${f.id.toLowerCase()}-v${f.versionCourante}.json`;
  const parVersion = await Promise.all(sansTest.filter((f) => !presents || presents.has(nomTest(f))).map((f) => lireFichierRetours(`tests-modeles/${nomTest(f)}`).then(normaliserResultatTest).catch(() => null)));
  for (const r of [...lireResultatsTests(testsBruts), ...parVersion.filter((x): x is NonNullable<typeof x> => x !== null)]) {
    const v = chaine.versions.find((x) => x.modele === r.modele && x.version === r.version);
    if (!v || (v.test && v.test.le >= r.le)) continue;
    const { error } = await supabase.from('modeles_versions').update({ test: r }).eq('modele', r.modele).eq('version', r.version);
    if (!error) { bilan.tests++; change = true; }
  }
  if (change) chaine = await lireChaine(profession, { ...opts, frais: true });
  if (chaine.erreurLecture) return { ...bilan, chaine };
  // 2. Tickets techniques des résultats enregistrés (version courante), dédoublonnés
  change = false;
  for (const f of chaine.fiches) {
    const v = chaine.versions.find((x) => x.modele === f.id && x.version === f.versionCourante);
    if (!v?.test) continue;
    const { nouveaux } = appliquerResultatTest(chaine.tickets.filter((t) => t.modele === f.id), v.test);
    if (!nouveaux.length) continue;
    const { error } = await supabase.from('modeles_tickets').insert(nouveaux.map(ligneTicket));
    if (!error) { bilan.tickets += nouveaux.length; change = true; }
  }
  // 3. Retouches de Claude (nouvelle version à partir de la version courante)
  for (const r of retouchesAAppliquer(lireRetouches(retouchesBrutes), chaine.fiches)) {
    const f = chaine.fiches.find((x) => x.id === r.modele)!;
    const nv = nouvelleVersion({
      fiche: f, composition: r.composition, cle: `compo:${r.modele.slice(0, 8)}-v${f.versionCourante + 1}`, tickets: chaine.tickets.filter((t) => t.modele === f.id), corrections: r.corrections,
      auteur: r.auteur ?? 'claude', type: r.auteur === 'testeur' ? 'technique' : 'correction', note: r.note,
    });
    const { error } = await supabase.from('modeles_versions').insert({ modele: f.id, version: nv.version.version, composition: nv.version.composition, cle: nv.version.cle, journal: nv.version.journal, auteur: nv.version.auteur });
    if (error) continue;
    await supabase.from('modeles_fiches').update({ version_courante: nv.version.version }).eq('id', f.id);
    for (const t of nv.corriges) await supabase.from('modeles_tickets').update({ statut: 'corrige', version_correction: t.versionCorrection }).eq('modele', f.id).eq('numero', t.numero);
    bilan.retouches++; change = true;
  }
  if (change) chaine = await lireChaine(profession, { ...opts, frais: true });
  if (chaine.erreurLecture) return { ...bilan, chaine };
  // 3 bis. Fiches candidates sans version depuis plus de 10 min : version réécrite si le design est connu, sinon écartée
  if (await reparerFichesSansVersion(supabase, chaine).catch(() => 0)) chaine = await lireChaine(profession, { ...opts, frais: true });
  if (chaine.erreurLecture) return { ...bilan, chaine };
  // 4. Automate : transitions jusqu'au point fixe (a priori du tournoi : J'aime, juge, jauge)
  chaine = { ...chaine, signaux: await signauxCandidats(chaine) };
  // Passage d'étape par la base (avancer_modele, 0050) : transition autorisée, rôle et conditions revérifiés côté serveur
  const { actions } = fairetournerChaine(chaine);
  const r = await appliquerTransitions(supabase, actions);
  bilan.actions.push(...r.faites); bilan.echecs += r.echecs;
  if (bilan.actions.length) chaine = { ...(await lireChaine(profession, { ...opts, frais: true })), signaux: chaine.signaux };
  return { ...bilan, chaine };
}

/**
 * Signaux a priori du tournoi (tournoi-grilles.ts, aPriori) pour les candidats : J'aime de la présélection (modeles_jaime), note
 * prédite par le juge (moyenne des prédictions des éléments du design), jauge 4-5 ★ (qualiteComposition).
 */
export async function signauxCandidats(chaine: Pick<Chaine, 'fiches' | 'versions' | 'jaime'>): Promise<Record<string, SignauxCandidat>> {
  const cand = chaine.fiches.filter((f) => f.statut === 'candidat');
  if (!cand.length) return {};
  const [poids, predictions] = await Promise.all([getPoidsAtelier().catch(() => null), getPredictions().catch(() => [])]);
  const parCle = predictionsParCle(predictions);
  const r: Record<string, SignauxCandidat> = {};
  for (const f of cand) {
    const v = versionDe(chaine, f.id, f.versionCourante);
    const sujets = [...f.scenario.principaux, ...f.scenario.secondaires];
    const x = v ? normaliserComposition(v.composition, { sujets, principaux: f.scenario.principaux.length, couleursPreferees: f.scenario.couleurs, modele: modeleIntegre }) : null;
    const elements = x ? elementsComposition(x, sujets) : [];
    const notes = elements.flatMap((k) => { const l = parCle[k]; return l?.length ? [[...l].sort((a, b) => (a.le < b.le ? 1 : -1))[0].note] : []; });
    r[f.id] = {
      jaime: chaine.jaime[f.id] ?? 0,
      juge: notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null,
      jauge: x ? qualiteComposition(x, sujets, poids?.notesElements ?? null).part : null,
    };
  }
  return r;
}

/** Équipe (tableau « par personne ») : fonction equipe_chaine() de 0050 */
export async function getEquipe(): Promise<{ id: string; email: string; role: RoleEquipe }[]> {
  // Gardée dans le cache de données (cache-donnees.ts, invalidée au changement de rôle : app/chaine/actions.ts)
  const data = await lireEnCache<unknown[]>('equipe', TAGS_DONNEES.equipe, [], async (supabase) => {
    const { data, error } = await supabase.rpc('equipe_chaine');
    return error || !Array.isArray(data) ? { ok: false, repli: [] } : { ok: true, valeur: data as unknown[] };
  });
  if (!data.length) return [];
  return (data as { id: string; email: string; role_equipe: string }[]).flatMap((l) => (l.role_equipe === 'contributeur' || l.role_equipe === 'validateur' ? [{ id: l.id, email: l.email, role: l.role_equipe }] : []));
}

export const getChaineMemo = cache(lireChaine);
