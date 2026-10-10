// CHAÎNE DE PRODUCTION DES MODÈLES (décision de Paul du 2026-10-09 : « limiter au max l'humain, juste pour donner son goût / avis
// sur les modèles créés »). Une seule chaîne, une FICHE MODÈLE versionnée par modèle, des statuts qui avancent TOUT SEULS dès que
// la condition est remplie (automate), l'humain ne fait que choisir, voter, commenter et valider. Ordre (précision de Paul) :
//   1. présélection « mode illimité » (humain : touche ce qui lui plaît, pages de 6 sites du même profil)      → candidat
//   2. tournoi A/B entre les candidats d'un profil (humains, multi-votants, arrêt automatique)                  → finaliste
//   3. check par l'AGENT (testeur automatique + vérification visuelle) : tickets techniques, corrections auto   → check-agent
//   4. avis de l'HUMAIN page par page (zones, éléments, verrous, relance, commentaires)                         → avis-humain
//   5. retouche par CLAUDE : nouvelle version, journal « corrigé : ticket #12 — … »                             → retouche
//   6. nouveau check par l'agent                                                                                → recheck-agent
//   7. revalidation humaine de ce qui a changé seulement (1 clic)                                              → revalidation
//   8. validation pour la production client (Paul, verrous au vert) puis publication                           → pret-validation → publie
// Le testeur n'intervient PAS avant la présélection ni pendant le tournoi : la génération garde seulement son filtre léger
// (harmonie, éléments exclus, rendus identiques : filtreLeger).
// Format des tickets et des résultats de test : chaine-modeles-format.ts. Docs : docs/chaine-modeles.md. Module pur.

import { ajusterBT, type MatchBT } from './duels';
import { jeuxDuModele } from './chaine-design';
import { etatTournoiGrilles, type EtatTournoiGrilles, type GrilleTournoi, type SignauxCandidat } from './tournoi-grilles';
import {
  APPAREILS_MODELE, libellePageModele, PAGES_MODELE, normaliserResultatTest, type AppareilModele, type PageModele, type ResultatTestModele, type TicketModele,
} from './chaine-modeles-format';

// ---------------------------------------------------------------------------------------------------------------
// Réglages (documentés dans docs/chaine-modeles.md)
// ---------------------------------------------------------------------------------------------------------------

export const CHAINE = {
  /** Objectif de candidats par profession (modèles = designs sans profil ; 30 depuis le tournoi en grilles, retour de Paul du 2026-10-09) */
  objectifCandidats: 30,
  /** Le tournoi s'ouvre à partir de ce nombre de candidats (20 → 12 le 2026-10-10, accord de Paul : chaîne guidée, chaine-guidage.ts ;
   *  le top 10 reste recherché, un candidat ajouté pendant le tournoi y entre) */
  ouvertureTournoi: 12,
  /** Nombre de finalistes par profil */
  finalistes: 10,
  /** Modèles simultanément dans la boucle de révision (check agent → revalidation) */
  maxRevision: 10,
  /** Arrêt du tournoi : chaque candidat a au moins ce nombre de duels */
  minDuels: 5,
  /** Arrêt du tournoi : les 10 premiers (ensemble) n'ont pas changé sur cette fenêtre de votes, regardée tous les `pasStabilite` votes */
  fenetreStabilite: 30,
  pasStabilite: 10,
  /** Arrêt forcé : budget de votes = plafondParCandidat × nombre de candidats */
  plafondParCandidat: 10,
  /** Poids d'un vote du validateur (Paul) dans le classement agrégé */
  poidsValidateur: 2,
  /** Taille d'une page de présélection */
  tailleGrille: 6,
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Rôles
// ---------------------------------------------------------------------------------------------------------------

/** Rôles de l'équipe (colonne profiles.role_equipe, migration 0050) ; le super admin (role = admin) est validateur d'office */
export const ROLES_EQUIPE = ['contributeur', 'validateur'] as const;
export type RoleEquipe = (typeof ROLES_EQUIPE)[number];
export const estRoleEquipe = (x: unknown): x is RoleEquipe => (ROLES_EQUIPE as readonly unknown[]).includes(x);
export const LIBELLES_ROLES: Record<RoleEquipe, string> = { contributeur: 'Contributeur (équipe TBCOM)', validateur: 'Validateur (Paul)' };

export const ACTIONS_CHAINE = ['voir', 'preselectionner', 'voter', 'reviser', 'commenter', 'relancer', 'revalider', 'valider', 'publier', 'gerer-roles'] as const;
export type ActionChaine = (typeof ACTIONS_CHAINE)[number];
const ACTIONS_CONTRIBUTEUR: readonly ActionChaine[] = ['voir', 'preselectionner', 'voter', 'reviser', 'commenter', 'relancer', 'revalider'];

/** Ce qu'un rôle a le droit de faire : le contributeur ne valide ni ne publie jamais ; le validateur peut tout */
export function peut(role: RoleEquipe | null | undefined, action: ActionChaine): boolean {
  if (role === 'validateur') return true;
  if (role === 'contributeur') return ACTIONS_CONTRIBUTEUR.includes(action);
  return false;
}

/** Rôle effectif : super admin → validateur ; sinon la colonne role_equipe */
export const roleEffectif = (role: string | null | undefined, roleEquipe: string | null | undefined): RoleEquipe | null =>
  role === 'admin' ? 'validateur' : estRoleEquipe(roleEquipe) ? roleEquipe : null;

/** Poids d'un vote selon le rôle du votant (validateur ×2, documenté) */
export const poidsVote = (role: RoleEquipe | null | undefined) => (role === 'validateur' ? CHAINE.poidsValidateur : 1);

// ---------------------------------------------------------------------------------------------------------------
// Statuts et transitions
// ---------------------------------------------------------------------------------------------------------------

/** Qui a la main à une étape */
export type Main = 'humain' | 'agent' | 'claude' | 'paul' | 'auto' | 'personne';

export const STATUTS_MODELE = [
  { id: 'candidat', etape: 1, libelle: 'Candidat', main: 'humain' as Main, fini: 'Le tournoi du profil est stable : il est finaliste ou écarté.' },
  { id: 'finaliste', etape: 2, libelle: 'Finaliste', main: 'auto' as Main, fini: 'Une place se libère dans la boucle de révision (10 au plus).' },
  { id: 'check-agent', etape: 3, libelle: 'Check agent', main: 'agent' as Main, fini: 'Le testeur a passé la version courante (verdict et tickets techniques enregistrés).' },
  { id: 'avis-humain', etape: 4, libelle: 'Avis humain', main: 'humain' as Main, fini: 'Les 8 pages × 2 appareils ont chacune un avis (ticket ou « Rien à signaler »).' },
  { id: 'retouche', etape: 5, libelle: 'Retouche Claude', main: 'claude' as Main, fini: 'Une nouvelle version corrige les tickets ouverts.' },
  { id: 'recheck-agent', etape: 6, libelle: 'Re-check agent', main: 'agent' as Main, fini: 'Le testeur a passé la nouvelle version.' },
  { id: 'revalidation', etape: 7, libelle: 'Revalidation', main: 'humain' as Main, fini: 'Un humain a revalidé ce qui a changé (1 clic) ou rouvert des tickets.' },
  { id: 'pret-validation', etape: 8, libelle: 'Prêt pour validation', main: 'paul' as Main, fini: 'Paul publie (verrous au vert).' },
  { id: 'publie', etape: 9, libelle: 'Publié', main: 'personne' as Main, fini: 'En ligne pour les praticiens ; un ticket rouvre une retouche sans dépublier.' },
  { id: 'ecarte', etape: 0, libelle: 'Écarté', main: 'personne' as Main, fini: 'Hors des 10 premiers du tournoi.' },
] as const;
export type StatutModele = (typeof STATUTS_MODELE)[number]['id'];
export const estStatutModele = (x: unknown): x is StatutModele => STATUTS_MODELE.some((s) => s.id === x);
export const statutModele = (id: string) => STATUTS_MODELE.find((s) => s.id === id) ?? STATUTS_MODELE[0];
/** Statuts de la boucle de révision (limite de CHAINE.maxRevision modèles simultanés) */
export const STATUTS_BOUCLE: readonly StatutModele[] = ['check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation'];

export type Acteur = 'auto' | RoleEquipe;

/** Transitions permises et qui peut les faire */
export const TRANSITIONS: readonly { de: StatutModele; vers: StatutModele; par: readonly Acteur[] }[] = [
  { de: 'candidat', vers: 'finaliste', par: ['auto'] },
  { de: 'candidat', vers: 'ecarte', par: ['auto', 'validateur'] },
  { de: 'ecarte', vers: 'candidat', par: ['validateur'] },
  { de: 'finaliste', vers: 'check-agent', par: ['auto'] },
  { de: 'check-agent', vers: 'avis-humain', par: ['auto'] },
  { de: 'avis-humain', vers: 'retouche', par: ['auto'] },
  { de: 'avis-humain', vers: 'pret-validation', par: ['auto'] },
  { de: 'avis-humain', vers: 'recheck-agent', par: ['auto'] },
  { de: 'retouche', vers: 'recheck-agent', par: ['auto'] },
  { de: 'recheck-agent', vers: 'revalidation', par: ['auto'] },
  { de: 'recheck-agent', vers: 'retouche', par: ['auto'] },
  { de: 'recheck-agent', vers: 'pret-validation', par: ['auto'] },
  { de: 'revalidation', vers: 'retouche', par: ['auto'] },
  { de: 'revalidation', vers: 'pret-validation', par: ['auto'] },
  { de: 'revalidation', vers: 'recheck-agent', par: ['auto'] },
  { de: 'pret-validation', vers: 'publie', par: ['validateur'] },
  { de: 'pret-validation', vers: 'retouche', par: ['auto', 'validateur'] },
  { de: 'pret-validation', vers: 'recheck-agent', par: ['auto'] },
  { de: 'publie', vers: 'retouche', par: ['auto'] },
  { de: 'publie', vers: 'recheck-agent', par: ['auto'] },
];

export function transitionPermise(de: StatutModele, vers: StatutModele, par: Acteur): boolean {
  return TRANSITIONS.some((t) => t.de === de && t.vers === vers && t.par.includes(par));
}

// ---------------------------------------------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------------------------------------------

export type TagsModele = { profession: string; profils: string[]; couleurs: string[] };

export type FicheModele = {
  id: string;
  nom: string;
  profession: string;
  /** Profil du tournoi (anciens modèles) ; null = DESIGN de la profession, rendu avec le kit de chaque profil (chaine-design.ts) */
  profil: string | null;
  statut: StatutModele;
  versionCourante: number;
  /** Version en ligne pour les praticiens (null = jamais publiée) ; reste en place pendant une retouche */
  versionPubliee: number | null;
  tags: TagsModele;
  tagsValides: boolean;
  /** Recette liée (publication par profil, recettes_publications) */
  recette: string | null;
  origine: 'preselection' | 'recette' | 'claude';
  /** Clé de composition de la version 1 (doublons) */
  cle: string;
  /** Rang au tournoi (finalistes) */
  rang: number | null;
  /** Version courante au moment où la retouche a été demandée (la retouche est faite quand une version plus récente existe) */
  versionRetouche?: number | null;
  /** Justification écrite de Paul pour valider malgré un test orange (regleValidationModele, ≥ 15 caractères) et sa version */
  justificationTest?: string | null;
  justificationVersion?: number | null;
  /** Scénario du client simulé (principaux, secondaires, couleurs) */
  scenario: { principaux: string[]; secondaires: string[]; couleurs: string[] };
  creeLe: string;
};

export type TypeJournal = 'creation' | 'correction' | 'technique' | 'relance' | 'publication';
export type LigneJournal = { type: TypeJournal; texte: string; ticket?: number | null };

export type VersionModele = {
  modele: string;
  version: number;
  composition: Record<string, unknown>;
  cle: string;
  journal: LigneJournal[];
  /** Auteur : identifiant de compte, « claude » ou « testeur » */
  auteur: string;
  /** Résultat du testeur sur cette version (null = pas encore passé) */
  test: ResultatTestModele | null;
  creeLe: string;
};

export type ResultatVote = 'a' | 'b' | 'egalite';
export type VoteModele = { profil: string | null; a: string; b: string; resultat: ResultatVote; votant: string; poids: number; le: string };

/** Avis d'un humain sur une cellule (page × appareil) d'une version ; page null = revalidation de toute la version (1 clic) */
export type RevueModele = { modele: string; version: number; page: PageModele | null; appareil: AppareilModele | null; auteur: string; verdict: 'rien' | 'tickets' | 'revalide'; le: string };

// ---------------------------------------------------------------------------------------------------------------
// Présélection : filtre léger (pas le testeur), points, doublons
// ---------------------------------------------------------------------------------------------------------------

/**
 * Filtre LÉGER de la génération (précision de Paul : pas de testeur ni de juge à ce stade) : règles dures d'harmonie, éléments
 * exclus (refusés ≤ 2 ★, retirés), composition déjà vue (déjà candidate ou déjà montrée), rendu identique à une voisine.
 */
export function filtreLeger(p: { cle: string; violationsDures: number; elements: readonly string[]; exclus: ReadonlySet<string>; dejaVues: ReadonlySet<string>; empreinteRendu?: string | null; empreintesVoisines?: readonly (string | null)[] }): { garde: boolean; raisons: string[] } {
  const raisons: string[] = [];
  if (p.violationsDures > 0) raisons.push('harmonie');
  if (p.elements.some((k) => p.exclus.has(k))) raisons.push('element-exclu');
  if (p.dejaVues.has(p.cle)) raisons.push('deja-vue');
  if (p.empreinteRendu && (p.empreintesVoisines ?? []).includes(p.empreinteRendu)) raisons.push('rendu-identique');
  return { garde: raisons.length === 0, raisons };
}

/**
 * Choix de présélection → ligne du journal de la Dégustation (même moteur de points : degustation_choix, format « directions »).
 * Multi-sélection : les deux premières touchées font les « meilleures » (contrainte du journal : 1 ou 2) ; aucune → pas de ligne.
 */
export function choixDePreselection(p: {
  propositions: readonly { cle: string; ingredients: Record<string, unknown> }[]; selection: readonly number[]; profil: string; profession: string;
  scenario: { sujets: string[] }; appareil: 'ordinateur' | 'mobile'; dureeMs?: number | null; session?: string | null;
}): Record<string, unknown> | null {
  const sel = [...new Set(p.selection)].filter((i) => Number.isInteger(i) && i >= 0 && i < p.propositions.length);
  if (!sel.length || p.propositions.length < 2) return null;
  return {
    format: 'directions', type: 'theme', dimension: 'directions', scenario: { sujets: p.scenario.sujets.slice(0, 6) },
    propositions: p.propositions.map((x) => ({ cle: x.cle, ingredients: x.ingredients })), meilleures: sel.slice(0, 2), pire: null, pari: null,
    appareil: p.appareil, session: p.session ?? null, dureeMs: p.dureeMs ?? null, profession: p.profession, profil: p.profil,
  };
}

/** Compteur de la réserve de candidats d'un profil */
export function reserveCandidats(fiches: readonly Pick<FicheModele, 'profil' | 'statut'>[], profil: string | null = null): { n: number; objectif: number; part: number; texte: string } {
  const n = fiches.filter((f) => (f.profil ?? null) === profil && f.statut === 'candidat').length;
  return { n, objectif: CHAINE.objectifCandidats, part: Math.min(1, n / CHAINE.objectifCandidats), texte: `${n} / ${CHAINE.objectifCandidats} candidats` };
}

// ---------------------------------------------------------------------------------------------------------------
// Tournoi : Bradley-Terry agrégé, appariement suisse, arrêt automatique
// ---------------------------------------------------------------------------------------------------------------

export type LigneClassementTournoi = { id: string; theta: number; sigma: number; n: number; rang: number };

const matchsDesVotes = (votes: readonly VoteModele[]): MatchBT[] =>
  votes.map((v) => ({ a: v.a, b: v.b, s: v.resultat === 'a' ? 1 : v.resultat === 'b' ? 0 : 0.5, w: v.poids > 0 ? v.poids : 1 }));

/** Classement agrégé de tous les votants (votes pondérés : validateur ×2) ; candidats sans vote à θ = 0, σ = 1 */
export function classementTournoi(candidats: readonly string[], votes: readonly VoteModele[]): LigneClassementTournoi[] {
  const set = new Set(candidats);
  const forces = ajusterBT(matchsDesVotes(votes.filter((v) => set.has(v.a) && set.has(v.b))));
  return candidats
    .map((id) => { const f = forces.get(id); return { id, theta: f?.theta ?? 0, sigma: f?.sigma ?? 1, n: f ? f.victoires + f.defaites + f.egalites : 0 }; })
    .sort((x, y) => y.theta - x.theta || x.sigma - y.sigma || (x.id < y.id ? -1 : 1))
    .map((l, i) => ({ ...l, rang: i + 1 }));
}

const nbDuels = (votes: readonly VoteModele[]) => {
  const m = new Map<string, number>();
  for (const v of votes) { m.set(v.a, (m.get(v.a) ?? 0) + 1); m.set(v.b, (m.get(v.b) ?? 0) + 1); }
  return m;
};
const clePaire = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Prochain duel « suisse » : le candidat le moins joué (puis le plus incertain) affronte l'adversaire de niveau le plus proche,
 * en préférant l'incertitude et en évitant les paires déjà jouées (surtout par ce votant). Déterministe pour une graine.
 */
export function prochainDuel(candidats: readonly string[], votes: readonly VoteModele[], opts: { votant?: string | null; graine?: number } = {}): [string, string] | null {
  if (candidats.length < 2) return null;
  const cl = classementTournoi(candidats, votes);
  const n = nbDuels(votes);
  const jouees = new Map<string, number>();
  const parMoi = new Set<string>();
  for (const v of votes) {
    const k = clePaire(v.a, v.b);
    jouees.set(k, (jouees.get(k) ?? 0) + 1);
    if (opts.votant && v.votant === opts.votant) parMoi.add(k);
  }
  let s = (opts.graine ?? 1) >>> 0;
  const r = () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 2 ** 32; };
  const premier = [...cl].sort((x, y) => (n.get(x.id) ?? 0) - (n.get(y.id) ?? 0) || y.sigma - x.sigma || r() - 0.5)[0];
  let best: { id: string; v: number } | null = null;
  for (const o of cl) {
    if (o.id === premier.id) continue;
    const k = clePaire(premier.id, o.id);
    const v = Math.abs(o.theta - premier.theta) - 0.5 * o.sigma + 1.5 * (jouees.get(k) ?? 0) + (parMoi.has(k) ? 5 : 0) + 0.01 * r();
    if (!best || v < best.v) best = { id: o.id, v };
  }
  if (!best) return null;
  return r() < 0.5 ? [premier.id, best.id] : [best.id, premier.id];
}

const topK = (cl: readonly LigneClassementTournoi[], k: number) => new Set(cl.slice(0, k).map((l) => l.id));
/** Deux ensembles de finalistes « identiques » à un échange près à la frontière (10e / 11e) */
const memesFinalistes = (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x)).length <= 1;

export type EtatTournoi = {
  ouvert: boolean;
  arrete: boolean;
  raison: 'pas-assez-de-candidats' | 'en-cours' | 'stable' | 'budget' | 'tout-finaliste';
  votes: number;
  minDuels: number;
  budget: number;
  classement: LigneClassementTournoi[];
  finalistes: string[];
  texte: string;
};

/**
 * Arrêt AUTOMATIQUE (documenté) : le tournoi d'un profil s'ouvre à CHAINE.ouvertureTournoi candidats. Il s'arrête quand
 * (a) chaque candidat a au moins CHAINE.minDuels duels ET (b) l'ensemble des 10 premiers est le même (à un échange près à la
 * frontière 10e / 11e) dans les classements recalculés tous les CHAINE.pasStabilite votes sur les CHAINE.fenetreStabilite derniers votes ; ou (c) quand le budget
 * CHAINE.plafondParCandidat × candidats votes est atteint. Les 10 premiers deviennent finalistes.
 */
export function etatTournoi(candidats: readonly string[], votes: readonly VoteModele[]): EtatTournoi {
  const set = new Set(candidats);
  const vs = votes.filter((v) => set.has(v.a) && set.has(v.b)).sort((x, y) => (x.le < y.le ? -1 : x.le > y.le ? 1 : 0));
  const classement = classementTournoi(candidats, vs);
  const budget = CHAINE.plafondParCandidat * candidats.length;
  const n = nbDuels(vs);
  const minDuels = candidats.length ? Math.min(...candidats.map((c) => n.get(c) ?? 0)) : 0;
  const base = { votes: vs.length, minDuels, budget, classement };
  const finalistes = classement.slice(0, CHAINE.finalistes).map((l) => l.id);
  if (candidats.length < CHAINE.ouvertureTournoi) {
    return { ...base, ouvert: false, arrete: false, raison: 'pas-assez-de-candidats', finalistes: [], texte: `${candidats.length} / ${CHAINE.ouvertureTournoi} candidats pour ouvrir le tournoi` };
  }
  if (vs.length >= budget) return { ...base, ouvert: true, arrete: true, raison: 'budget', finalistes, texte: `Arrêté : budget de ${budget} votes atteint` };
  let stable = minDuels >= CHAINE.minDuels && vs.length >= CHAINE.fenetreStabilite;
  if (stable) {
    const ref = topK(classement, CHAINE.finalistes);
    for (let k = CHAINE.pasStabilite; k <= CHAINE.fenetreStabilite && stable; k += CHAINE.pasStabilite) {
      if (!memesFinalistes(ref, topK(classementTournoi(candidats, vs.slice(0, vs.length - k)), CHAINE.finalistes))) stable = false;
    }
  }
  if (stable) return { ...base, ouvert: true, arrete: true, raison: 'stable', finalistes, texte: `Classement stable sur les ${CHAINE.fenetreStabilite} derniers votes` };
  const manque = Math.max(0, CHAINE.minDuels * Math.ceil(candidats.length / 2) - vs.length);
  return { ...base, ouvert: true, arrete: false, raison: 'en-cours', finalistes: [], texte: `${vs.length} votes · au moins ${manque || 'quelques'} encore (chaque candidat ≥ ${CHAINE.minDuels} duels, puis classement stable)` };
}

// ---------------------------------------------------------------------------------------------------------------
// Tickets et versions
// ---------------------------------------------------------------------------------------------------------------

export const CELLULES_REVISION: readonly { page: PageModele; appareil: AppareilModele }[] = PAGES_MODELE.flatMap((p) => APPAREILS_MODELE.map((a) => ({ page: p.id, appareil: a })));

export const numeroSuivant = (tickets: readonly Pick<TicketModele, 'numero'>[]) => tickets.reduce((m, t) => Math.max(m, t.numero), 0) + 1;
export const ticketsOuverts = <T extends Pick<TicketModele, 'statut'>>(tickets: readonly T[]) => tickets.filter((t) => t.statut === 'ouvert');

const pct = (x: number) => `${Math.round(x * 100)} %`;
/** Ligne de journal d'une correction : « corrigé : ticket #12 — zone (10 %, 40 %) page Contact et accès (mobile) » */
export function ligneCorrection(t: Pick<TicketModele, 'numero' | 'page' | 'appareil' | 'zone' | 'element' | 'etiquette'>): string {
  const ou = t.zone ? `zone (${pct(t.zone.x)}, ${pct(t.zone.y)})` : t.element ? `élément ${t.element}` : 'page entière';
  return `corrigé : ticket #${t.numero} — ${ou} page ${libellePageModele(t.page)} (${t.appareil}) [${t.etiquette}]`;
}

/**
 * Résultat du testeur appliqué aux tickets d'un modèle : nouveaux tickets techniques (numérotés, dédoublonnés par contrôle ×
 * page × appareil encore ouverts), tickets techniques dont le contrôle repasse au VERT fermés seuls (sans humain).
 */
export function appliquerResultatTest(tickets: readonly TicketModele[], r: ResultatTestModele): { nouveaux: TicketModele[]; fermes: number[] } {
  const cle = (t: Pick<TicketModele, 'controle' | 'page' | 'appareil' | 'etiquette'>) => `${t.controle ?? t.etiquette}|${t.page}|${t.appareil}`;
  const ouvertsTesteur = tickets.filter((t) => t.origine === 'testeur' && (t.statut === 'ouvert' || t.statut === 'corrige'));
  // Déjà connus : tickets du testeur encore ouverts, et tout ticket du testeur ouvert sur CETTE version (même fermé « sans objet » : jamais recréé)
  const deja = new Set([...ouvertsTesteur, ...tickets.filter((t) => t.origine === 'testeur' && t.versionOuverture === r.version)].map(cle));
  const rouges = new Set(r.controles.filter((c) => c.verdict !== 'vert').map((c) => c.id));
  let n = numeroSuivant(tickets);
  const nouveaux: TicketModele[] = [];
  for (const t of r.tickets) {
    if (deja.has(cle(t))) continue;
    deja.add(cle(t));
    nouveaux.push({ ...t, modele: r.modele, numero: n++, origine: 'testeur', auteur: 'testeur', statut: 'ouvert', versionOuverture: r.version, versionCorrection: null });
  }
  const signales = new Set(r.tickets.map(cle));
  const fermes = ouvertsTesteur.filter((t) => !signales.has(cle(t)) && !(t.controle && rouges.has(t.controle) && r.controles.some((c) => c.id === t.controle && c.verdict !== 'vert' && (c.page ?? t.page) === t.page && (c.appareil ?? t.appareil) === t.appareil))).map((t) => t.numero);
  return { nouveaux, fermes };
}

export type RetoucheModele = {
  modele: string;
  /** Version corrigée (la nouvelle version vaut versionBase + 1) */
  versionBase: number;
  composition: Record<string, unknown>;
  corrections: { ticket: number; texte?: string }[];
  /** Corrections purement techniques (testeur) : pas de revalidation humaine si le testeur repasse au vert */
  auteur?: 'claude' | 'testeur';
  note?: string;
};

/** Lecture tolérante d'une liste de retouches (retours/retouches-modeles.json) */
export function lireRetouches(brut: unknown): RetoucheModele[] {
  const l = Array.isArray(brut) ? brut : brut && typeof brut === 'object' && Array.isArray((brut as { retouches?: unknown }).retouches) ? (brut as { retouches: unknown[] }).retouches : [];
  return l.flatMap((x) => {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    if (typeof o.modele !== 'string' || !Number.isInteger(o.versionBase) || !o.composition || typeof o.composition !== 'object') return [];
    const corrections = (Array.isArray(o.corrections) ? o.corrections : []).flatMap((c) => {
      const t = Number((c as { ticket?: unknown })?.ticket);
      return Number.isInteger(t) && t > 0 ? [{ ticket: t, texte: typeof (c as { texte?: unknown }).texte === 'string' ? String((c as { texte: string }).texte).slice(0, 300) : undefined }] : [];
    });
    return [{ modele: o.modele, versionBase: o.versionBase as number, composition: o.composition as Record<string, unknown>, corrections, auteur: o.auteur === 'testeur' ? 'testeur' as const : 'claude' as const, note: typeof o.note === 'string' ? o.note.slice(0, 500) : undefined }];
  });
}

/** Lecture tolérante des résultats du testeur (retours/tests-modeles.json : liste, ou { resultats: [...] }) */
export function lireResultatsTests(brut: unknown): ResultatTestModele[] {
  const l = Array.isArray(brut) ? brut : brut && typeof brut === 'object' && Array.isArray((brut as { resultats?: unknown }).resultats) ? (brut as { resultats: unknown[] }).resultats : [];
  return l.map(normaliserResultatTest).filter((r): r is ResultatTestModele => r !== null);
}

/**
 * Nouvelle version d'un modèle (retouche de Claude, correction technique, relance 🎲 d'un humain) : numéro suivant, journal
 * « corrigé : ticket #12 — … » pour chaque ticket corrigé (statut → corrige, versionCorrection), test à repasser.
 */
export function nouvelleVersion(p: {
  fiche: Pick<FicheModele, 'id' | 'versionCourante'>; composition: Record<string, unknown>; cle: string; tickets: readonly TicketModele[];
  corrections: readonly { ticket: number; texte?: string }[]; auteur: string; type: TypeJournal; note?: string; le?: string;
}): { version: VersionModele; corriges: TicketModele[] } {
  const v = p.fiche.versionCourante + 1;
  const parNum = new Map(p.tickets.map((t) => [t.numero, t]));
  const corriges: TicketModele[] = [];
  const journal: LigneJournal[] = [];
  for (const c of p.corrections) {
    const t = parNum.get(c.ticket);
    if (!t || t.statut !== 'ouvert') continue;
    corriges.push({ ...t, statut: 'corrige', versionCorrection: v });
    journal.push({ type: t.origine === 'testeur' ? 'technique' : 'correction', ticket: t.numero, texte: `${ligneCorrection(t)}${c.texte ? ` · ${c.texte}` : ''}` });
  }
  if (p.note) journal.push({ type: p.type, texte: p.note });
  if (!journal.length) journal.push({ type: p.type, texte: p.type === 'relance' ? 'relance 🎲 par un humain' : 'nouvelle version' });
  return { version: { modele: p.fiche.id, version: v, composition: p.composition, cle: p.cle, journal, auteur: p.auteur, test: null, creeLe: p.le ?? new Date().toISOString() }, corriges };
}

/** Retouches du dépôt encore à appliquer : celles qui partent de la version COURANTE d'un modèle en retouche (ou publié avec tickets) */
export function retouchesAAppliquer(retouches: readonly RetoucheModele[], fiches: readonly Pick<FicheModele, 'id' | 'statut' | 'versionCourante'>[]): RetoucheModele[] {
  const vues = new Set<string>();
  return retouches.filter((r) => {
    const f = fiches.find((x) => x.id === r.modele);
    const k = `${r.modele}@${r.versionBase}`;
    if (!f || vues.has(k) || f.versionCourante !== r.versionBase) return false;
    if (!['retouche', 'check-agent', 'recheck-agent', 'publie'].includes(f.statut)) return false;
    vues.add(k);
    return true;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Ce qui a changé entre deux versions (pages à montrer en avant / après)
// ---------------------------------------------------------------------------------------------------------------

/** Sections → pages (recettes.ts, PAGES_STRUCTURE) */
const PAGES_DES_SECTIONS: Record<string, readonly PageModele[]> = {
  accueil: ['accueil'], sujets: ['accueil'], soins: ['soins', 'accueil'], 'soins-forme': ['soins'], infos: ['acces'], horaires: ['acces'], contact: ['acces'],
  praticiens: ['cabinet'], galerie: ['cabinet'], faq: ['questions'], fiche: ['fiche'], theme: ['theme'], article: ['article'], actualites: ['article'],
};
const TOUTES: readonly PageModele[] = PAGES_MODELE.map((p) => p.id);

const json = (v: unknown) => JSON.stringify(v ?? null);

/** Pages dont le rendu change d'une composition à l'autre (dimension globale → toutes les pages) */
export function pagesChangees(avant: Record<string, unknown> | null | undefined, apres: Record<string, unknown> | null | undefined): PageModele[] {
  if (!avant || !apres) return [...TOUTES];
  const pages = new Set<PageModele>();
  const globales = ['structure', 'gamme', 'couleur', 'police', 'effets', 'traitement', 'typo', 'details', 'menu'];
  if (globales.some((k) => json(avant[k]) !== json(apres[k]))) return [...TOUTES];
  const va = (avant.visuels ?? {}) as Record<string, unknown>, vb = (apres.visuels ?? {}) as Record<string, unknown>;
  if (json(va.style) !== json(vb.style)) return [...TOUTES];
  if (json(va.herosSujet) !== json(vb.herosSujet) || json(va.animation) !== json(vb.animation)) pages.add('accueil');
  if (json(avant.photos) !== json(apres.photos)) for (const p of ['accueil', 'theme', 'cabinet', 'article'] as const) pages.add(p);
  const sa = (avant.sections ?? {}) as Record<string, unknown>, sb = (apres.sections ?? {}) as Record<string, unknown>;
  if (json(sa.ordre) !== json(sb.ordre)) pages.add('accueil');
  const xa = (sa.variantes ?? {}) as Record<string, unknown>, xb = (sb.variantes ?? {}) as Record<string, unknown>;
  for (const k of new Set([...Object.keys(xa), ...Object.keys(xb)])) {
    if (json(xa[k]) !== json(xb[k])) for (const p of PAGES_DES_SECTIONS[k] ?? TOUTES) pages.add(p);
  }
  return TOUTES.filter((p) => pages.has(p));
}

// ---------------------------------------------------------------------------------------------------------------
// Avis humain et revalidation
// ---------------------------------------------------------------------------------------------------------------

export type EtatCellule = { page: PageModele; appareil: AppareilModele; etat: 'a-voir' | 'ok' | 'tickets'; tickets: number };
export type EtatRevision = { cellules: EtatCellule[]; faites: number; total: number; terminee: boolean; revalidee: boolean };

/**
 * Avis humain d'une version : chaque cellule (8 pages × 2 appareils) a un avis dès qu'un ticket humain y est ouvert sur cette version
 * ou qu'un humain a dit « Rien à signaler ». Revalidation : une revue « revalide » (page nulle) sur la version suffit (1 clic).
 */
export function etatRevision(version: number, revues: readonly RevueModele[], tickets: readonly TicketModele[], herite?: { precedente: number; changees: readonly PageModele[] }): EtatRevision {
  const rv = revues.filter((r) => r.version === version);
  // Relance 🎲 pendant l'avis : les avis de la version précédente valent pour les pages que la relance n'a pas changées
  const versionsDe = (page: PageModele) => (herite && !herite.changees.includes(page) ? [version, herite.precedente] : [version]);
  const cellules = CELLULES_REVISION.map(({ page, appareil }) => {
    const vs = versionsDe(page);
    const n = tickets.filter((t) => t.origine === 'humain' && vs.includes(t.versionOuverture) && t.page === page && t.appareil === appareil).length;
    const rien = revues.some((r) => vs.includes(r.version) && r.page === page && r.appareil === appareil && r.verdict === 'rien');
    return { page, appareil, etat: n ? 'tickets' as const : rien ? 'ok' as const : 'a-voir' as const, tickets: n };
  });
  const faites = cellules.filter((c) => c.etat !== 'a-voir').length;
  return { cellules, faites, total: cellules.length, terminee: faites === cellules.length, revalidee: rv.some((r) => r.page === null && r.verdict === 'revalide') };
}

/** La version courante contient-elle un changement à faire revoir par un humain (correction d'un ticket humain ou relance) ? */
export const aChangementHumain = (v: Pick<VersionModele, 'journal'> | null | undefined) => Boolean(v?.journal.some((l) => l.type === 'correction' || l.type === 'relance'));

// ---------------------------------------------------------------------------------------------------------------
// Automate : tout ce qui avance sans humain
// ---------------------------------------------------------------------------------------------------------------

export type EtatChaine = {
  fiches: readonly FicheModele[];
  /** Toutes les versions connues (au moins la courante de chaque fiche) */
  versions: readonly VersionModele[];
  tickets: readonly TicketModele[];
  /** Duels A/B (ancien tournoi, et duels de départage du tournoi en grilles) */
  votes: readonly VoteModele[];
  revues: readonly RevueModele[];
  /** Grilles répondues du tournoi (tournoi-grilles.ts, migration 0052) */
  grilles?: readonly GrilleTournoi[];
  /** Signaux a priori par candidat (J'aime de la présélection, juge, jauge) */
  signaux?: Readonly<Record<string, SignauxCandidat>>;
};

/** Groupe de tournoi d'une fiche : la profession (designs) ou la profession et le profil (anciens modèles) */
export const groupeTournoi = (f: Pick<FicheModele, 'profession' | 'profil'>) => `${f.profession}|${f.profil ?? '*'}`;

/** Délai avant de réparer une fiche candidate sans version (sa version peut être en train de s'écrire) */
export const DELAI_FICHE_SANS_VERSION_MS = 10 * 60_000;

/**
 * Fiches candidates sans leur version courante (version jamais enregistrée : 2026-10-10, bug « grille 49 », design vide dans une
 * grille), créées depuis plus de `delaiMs`. L'automate réécrit la version si le design est connu, sinon écarte la fiche.
 */
export function fichesSansVersion(e: Pick<EtatChaine, 'fiches' | 'versions'>, maintenant: number, delaiMs = DELAI_FICHE_SANS_VERSION_MS): FicheModele[] {
  const avec = new Set(e.versions.map((v) => `${v.modele}#${v.version}`));
  return e.fiches.filter((f) => {
    if (f.statut !== 'candidat' || avec.has(`${f.id}#${f.versionCourante}`)) return false;
    const cree = Date.parse(f.creeLe);
    return Number.isFinite(cree) ? maintenant - cree >= delaiMs : true;
  });
}

// Tournois déjà calculés (2026-10-10, perf de la chaîne : l'ajustement des forces sur toutes les grilles coûtait ~100-200 ms au volume
// ×10 du banc, refait par l'automate, la page, le guidage et « ce qui attend un humain » à CHAQUE chargement). Calcul pur et
// déterministe : résultat gardé par EMPREINTE DU CONTENU (candidats, grilles, duels, a priori des candidats) ; une grille, un duel
// ou un signal de plus change l'empreinte. L'empreinte d'une liste (grilles, duels : listes en lecture seule) est calculée une fois
// par liste (mémoire de la chaîne de l'admin : mêmes listes d'une requête à l'autre). Résultat partagé : à lire, jamais à modifier.
const memoTournois = new Map<string, EtatTournoiGrilles>();
const empreintesListes = new WeakMap<object, string>();
const empreinteListe = <T,>(l: readonly T[], texte: (x: T) => string): string => {
  let e = empreintesListes.get(l);
  if (e === undefined) { e = `${l.length}:${empreinte(l.map(texte).join('|'))}`; empreintesListes.set(l, e); }
  return e;
};
/** Empreinte 53 bits d'un texte (cyrb53) */
function empreinte(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
}

/** Tournoi d'un groupe (grilles + duels de départage + a priori) : tournoi-grilles.ts */
export function tournoiDuProfil(e: Pick<EtatChaine, 'votes' | 'grilles' | 'signaux'>, candidats: readonly string[]): EtatTournoiGrilles {
  const signaux = e.signaux ?? {};
  // Toutes les grilles et tous les duels (avant filtre sur les candidats) : même empreinte → mêmes grilles et duels retenus
  const toutes = e.grilles ?? [];
  const cand = candidats.join(',');
  const sig = JSON.stringify(candidats.map((id) => signaux[id] ?? null));
  const cle = [
    `${candidats.length}:${cand.length}:${empreinte(cand)}`,
    empreinteListe(toutes, (g) => `${g.profil ?? ''};${g.propositions.join(',')};${g.meilleures.join(',')};${g.pire ?? ''};${g.votant};${g.poids};${g.le}`),
    empreinteListe(e.votes, (v) => `${v.profil ?? ''};${v.a};${v.b};${v.resultat};${v.votant};${v.poids};${v.le}`),
    `${sig.length}:${empreinte(sig)}`,
  ].join('§');
  const deja = memoTournois.get(cle);
  if (deja) return deja;
  const set = new Set(candidats);
  const grilles = toutes.filter((g) => g.propositions.filter((p) => set.has(p)).length >= 2);
  const votes = e.votes.filter((v) => set.has(v.a) && set.has(v.b));
  const t = etatTournoiGrilles(candidats, grilles, votes, signaux, { ouverture: CHAINE.ouvertureTournoi });
  memoTournois.set(cle, t);
  if (memoTournois.size > 32) memoTournois.delete(memoTournois.keys().next().value!);
  return t;
}

export type ActionAuto =
  | { kind: 'statut'; modele: string; de: StatutModele; vers: StatutModele; raison: string; rang?: number | null; versionRetouche?: number }
  | { kind: 'fermer-ticket'; modele: string; numero: number; version: number; raison: string };

// Index des versions par liste (lecture seule) : une recherche par fiche dans l'automate et le guidage, au lieu d'un parcours de
// toutes les versions à chaque fois (2026-10-10, perf de la chaîne). Première version trouvée, comme find.
const indexVersions = new WeakMap<readonly VersionModele[], Map<string, VersionModele>>();
export const versionDe = (e: Pick<EtatChaine, 'versions'>, modele: string, version: number): VersionModele | null => {
  let ix = indexVersions.get(e.versions);
  if (!ix) {
    ix = new Map();
    for (const v of e.versions) { const k = `${v.modele}#${v.version}`; if (!ix.has(k)) ix.set(k, v); }
    indexVersions.set(e.versions, ix);
  }
  return ix.get(`${modele}#${version}`) ?? null;
};

/**
 * Transitions automatiques à appliquer (une passe ; à rappeler jusqu'à ce qu'il n'y en ait plus) : fin de tournoi, entrée dans la
 * boucle de révision (10 au plus, meilleur rang d'abord), check agent fait, avis complet, nouvelle version, revalidation, ticket
 * sur un modèle publié ou prêt. Fermeture des tickets techniques quand le testeur repasse au vert.
 */
export function automate(e: EtatChaine): ActionAuto[] {
  const actions: ActionAuto[] = [];
  const statut = new Map(e.fiches.map((f) => [f.id, f.statut]));
  const passer = (f: FicheModele, vers: StatutModele, raison: string, rang?: number | null) => {
    if (statut.get(f.id) === vers || !transitionPermise(statut.get(f.id)!, vers, 'auto')) return;
    actions.push({ kind: 'statut', modele: f.id, de: statut.get(f.id)!, vers, raison, ...(rang !== undefined ? { rang } : {}), ...(vers === 'retouche' ? { versionRetouche: f.versionCourante } : {}) });
    statut.set(f.id, vers);
  };
  // 1. Fin des tournois (par profil)
  // Un tournoi par profession pour les designs (profil nul) ; par profil pour les anciens modèles
  const profils = [...new Set(e.fiches.filter((f) => f.statut === 'candidat').map(groupeTournoi))];
  for (const pp of profils) {
    const cand = e.fiches.filter((f) => f.statut === 'candidat' && groupeTournoi(f) === pp);
    const t = tournoiDuProfil(e, cand.map((f) => f.id));
    if (!t.arrete) continue;
    const rangs = new Map(t.classement.map((l) => [l.id, l.rang]));
    for (const f of cand) {
      if (t.top.includes(f.id)) passer(f, 'finaliste', `tournoi ${t.raison === 'budget' ? 'au budget' : `sûr à ${Math.round(t.certitude * 100)} %`} : rang ${rangs.get(f.id)}`, rangs.get(f.id) ?? null);
      else passer(f, 'ecarte', `tournoi terminé : rang ${rangs.get(f.id)}`, rangs.get(f.id) ?? null);
    }
  }
  // 2. Tickets techniques refermés par le testeur (contrôle repassé au vert sur la version courante)
  const ticketsDe = (id: string) => e.tickets.filter((t) => t.modele === id);
  // Avis et tickets DU modèle seulement (jamais ceux d'un autre modèle à la même version)
  const revuesDe = (id: string) => e.revues.filter((r) => r.modele === id);
  const fermes = new Set<string>();
  for (const f of e.fiches) {
    const v = versionDe(e, f.id, f.versionCourante);
    if (!v?.test) continue;
    for (const n of appliquerResultatTest(ticketsDe(f.id), v.test).fermes) {
      const t = ticketsDe(f.id).find((x) => x.numero === n)!;
      if (t.statut === 'ferme') continue;
      actions.push({ kind: 'fermer-ticket', modele: f.id, numero: n, version: f.versionCourante, raison: 'contrôle repassé au vert' });
      fermes.add(`${f.id}#${n}`);
    }
  }
  const ouverts = (id: string) => ticketsDe(id).filter((t) => t.statut === 'ouvert' && !fermes.has(`${id}#${t.numero}`));
  // 3. Statuts de la boucle
  for (const f of e.fiches) {
    const v = versionDe(e, f.id, f.versionCourante);
    const teste = Boolean(v?.test && v.test.version === f.versionCourante);
    // Rouge : jamais prêt. Orange : peut aller jusqu'à la validation, où Paul justifie par écrit (regleValidationModele)
    const vert = teste && v!.test!.verdict !== 'rouge';
    const s = statut.get(f.id)!;
    if (s === 'check-agent' && teste) passer(f, 'avis-humain', 'le testeur a passé la version');
    else if (s === 'avis-humain') {
      const prec = versionDe(e, f.id, f.versionCourante - 1);
      const rev = etatRevision(f.versionCourante, revuesDe(f.id), ticketsDe(f.id), prec ? { precedente: prec.version, changees: pagesChangees(prec.composition, v?.composition) } : undefined);
      if (rev.terminee) {
        if (ouverts(f.id).length) passer(f, 'retouche', `${ouverts(f.id).length} ticket(s) ouvert(s) à corriger`);
        else if (vert) passer(f, 'pret-validation', 'avis complet, aucun ticket, testeur au vert');
      }
    } else if (s === 'retouche' && f.versionCourante > (f.versionRetouche ?? f.versionCourante)) passer(f, 'recheck-agent', 'nouvelle version à tester');
    else if (s === 'recheck-agent' && teste) {
      if (aChangementHumain(v)) passer(f, 'revalidation', 'changements à revalider');
      else if (ouverts(f.id).length) passer(f, 'retouche', 'le testeur signale encore des tickets');
      else if (vert) passer(f, 'pret-validation', 'corrections techniques au vert, sans humain');
    } else if (s === 'revalidation') {
      if (ouverts(f.id).length) passer(f, 'retouche', 'tickets rouverts ou nouveaux');
      else if (vert && etatRevision(f.versionCourante, revuesDe(f.id), ticketsDe(f.id)).revalidee) passer(f, 'pret-validation', 'revalidé, testeur au vert');
    } else if (s === 'pret-validation' || s === 'publie') {
      if (ouverts(f.id).length) passer(f, 'retouche', s === 'publie' ? 'zone signalée sur un modèle publié (reste en ligne)' : 'nouveau ticket');
      else if (v && !teste && v.version > (f.versionPubliee ?? 0)) passer(f, 'recheck-agent', 'nouvelle version à tester');
    }
  }
  // 4. Entrée dans la boucle de révision : 10 au plus, meilleur rang du tournoi d'abord
  let places = CHAINE.maxRevision - e.fiches.filter((f) => STATUTS_BOUCLE.includes(statut.get(f.id)!)).length;
  const attente = e.fiches.filter((f) => statut.get(f.id) === 'finaliste').sort((a, b) => (a.rang ?? 99) - (b.rang ?? 99) || (a.creeLe < b.creeLe ? -1 : 1));
  for (const f of attente) {
    if (places <= 0) break;
    passer(f, 'check-agent', 'place libre dans la boucle de révision');
    places--;
  }
  return actions;
}

/** Applique des actions automatiques à un état (en mémoire : tests, faux Supabase, tableau) */
export function appliquerActions(e: EtatChaine, actions: readonly ActionAuto[]): EtatChaine {
  const fiches = e.fiches.map((f) => {
    const l = actions.filter((x): x is Extract<ActionAuto, { kind: 'statut' }> => x.kind === 'statut' && x.modele === f.id);
    if (!l.length) return f;
    const rang = l.filter((a) => a.rang !== undefined).at(-1)?.rang;
    const vr = l.filter((a) => a.versionRetouche !== undefined).at(-1)?.versionRetouche;
    return { ...f, statut: l.at(-1)!.vers, ...(rang !== undefined ? { rang } : {}), ...(vr !== undefined ? { versionRetouche: vr } : {}) };
  });
  const tickets = e.tickets.map((t) => (actions.some((a) => a.kind === 'fermer-ticket' && a.modele === t.modele && a.numero === t.numero) ? { ...t, statut: 'ferme' as const, versionCorrection: t.versionCorrection ?? null } : t));
  return { ...e, fiches, tickets };
}

/** Fait tourner l'automate jusqu'au point fixe (au plus 10 passes) */
export function fairetournerChaine(e: EtatChaine): { etat: EtatChaine; actions: ActionAuto[] } {
  let etat = e;
  const toutes: ActionAuto[] = [];
  for (let i = 0; i < 10; i++) {
    const a = automate(etat);
    if (!a.length) break;
    toutes.push(...a);
    etat = appliquerActions(etat, a);
  }
  return { etat, actions: toutes };
}

// ---------------------------------------------------------------------------------------------------------------
// Validation finale (Paul) et tags
// ---------------------------------------------------------------------------------------------------------------

/**
 * « Avis humain et revalidation faits », calculé UNIQUEMENT depuis les avis (modeles_revues), les tickets et les versions — jamais
 * depuis le statut de la fiche : (a) une version de base dont les 16 cellules page × appareil sont couvertes (« rien à signaler » ou
 * ticket humain ; une relance hérite des avis de la version précédente pour les pages qu'elle ne change pas), puis (b) si une version
 * postérieure contient une correction de goût ou une relance, une revalidation (« revalide ») sur la version courante.
 */
export function avisFaits(versionCourante: number, versions: readonly Pick<VersionModele, 'version' | 'journal' | 'composition'>[], revues: readonly RevueModele[], tickets: readonly TicketModele[]): { ok: boolean; detail: string; base: number | null } {
  let base: number | null = null;
  for (let v = versionCourante; v >= 1 && base === null; v--) {
    const cur = versions.find((x) => x.version === v), prec = versions.find((x) => x.version === v - 1);
    if (etatRevision(v, revues, tickets, cur && prec ? { precedente: prec.version, changees: pagesChangees(prec.composition, cur.composition) } : undefined).terminee) base = v;
  }
  if (base === null) return { ok: false, detail: 'avis page par page incomplet', base };
  const apres = versions.filter((x) => x.version > base! && x.version <= versionCourante && aChangementHumain(x));
  if (!apres.length) return { ok: true, detail: `avis complet sur la v${base}`, base };
  const revalide = revues.some((r) => r.version === versionCourante && r.page === null && r.verdict === 'revalide');
  return { ok: revalide, detail: revalide ? `avis v${base}, revalidé v${versionCourante}` : `v${versionCourante} à revalider`, base };
}

export type VerrouValidation = { id: 'testeur' | 'jauge' | 'elements' | 'tickets' | 'avis' | 'tags'; libelle: string; ok: boolean; detail: string };

/** Verrous automatiques de la validation finale : TOUS au vert pour que « Publier pour les praticiens » soit possible */
export function verrousValidation(p: {
  fiche: Pick<FicheModele, 'versionCourante' | 'tags' | 'tagsValides'>; version: Pick<VersionModele, 'version' | 'test'> | null;
  tickets: readonly TicketModele[]; jauge: { part: number; total: number } | null; elements: { ok: boolean; bloquants: number } | null;
  /** avisFaits(…) : depuis modeles_revues et les tickets, jamais depuis le statut */
  avis: { ok: boolean; detail: string };
  /** Verrou testeur calculé par verrouTesteur (testeur-modeles.ts : vert, ou orange justifié par Paul) ; défaut : vert strict */
  testeur?: { libelle: string; ok: boolean; detail: string };
}): VerrouValidation[] {
  const t = p.version?.test;
  const ouverts = ticketsOuverts(p.tickets).length;
  const enAttente = p.tickets.filter((x) => x.statut === 'corrige').length;
  const tagsOk = Boolean(p.fiche.tags.profession && p.fiche.tags.profils.length && p.fiche.tags.couleurs.length);
  return [
    p.testeur ? { id: 'testeur', ...p.testeur } : { id: 'testeur', libelle: 'Testeur au vert sur la version', ok: Boolean(t && t.version === p.fiche.versionCourante && t.verdict === 'vert'), detail: t ? `v${t.version} : ${t.verdict}` : 'pas encore passé' },
    { id: 'jauge', libelle: 'Jauge 100 % 4-5 ★', ok: Boolean(p.jauge && p.jauge.total > 0 && p.jauge.part >= 1), detail: p.jauge ? `${Math.round(p.jauge.part * 100)} % de ${p.jauge.total} éléments` : 'inconnue' },
    { id: 'elements', libelle: 'Éléments validés (aucun à valider ni exclu)', ok: Boolean(p.elements?.ok), detail: p.elements ? (p.elements.ok ? 'tous validés' : `${p.elements.bloquants} à valider ou remplacer`) : 'inconnu' },
    { id: 'tickets', libelle: '0 ticket ouvert', ok: ouverts === 0 && enAttente === 0, detail: ouverts || enAttente ? `${ouverts} ouvert(s), ${enAttente} corrigé(s) à revalider` : 'aucun' },
    { id: 'avis', libelle: 'Avis humain et revalidation faits', ok: p.avis.ok, detail: p.avis.detail },
    { id: 'tags', libelle: 'Tags vérifiés (profession, profils, couleurs)', ok: tagsOk && p.fiche.tagsValides, detail: tagsOk ? (p.fiche.tagsValides ? 'vérifiés' : 'pré-remplis, à vérifier') : 'incomplets' },
  ];
}
export const peutPublier = (verrous: readonly VerrouValidation[]) => verrous.every((v) => v.ok);

/** Nom de teinte d'une couleur (#rrggbb) pour les tags */
export function nomTeinte(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return 'neutre';
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d < 0.08) return l > 0.85 ? 'blanc' : l < 0.15 ? 'noir' : 'gris';
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 340) return 'rouge';
  if (h < 45) return l < 0.35 ? 'brun' : 'orange';
  if (h < 70) return 'jaune';
  if (h < 160) return 'vert';
  if (h < 200) return 'canard';
  if (h < 255) return 'bleu';
  if (h < 290) return 'violet';
  return 'rose';
}

/** Tags pré-remplis automatiquement : profession, profils (profil du tournoi et/ou profils compatibles calculés), couleurs (gamme + teinte) */
export function tagsAutomatiques(composition: Record<string, unknown>, p: { profession: string; profil?: string | null; profilsCibles?: readonly string[] }): TagsModele {
  const couleurs = [typeof composition.gamme === 'string' && composition.gamme ? `gamme:${composition.gamme}` : null, typeof composition.couleur === 'string' ? nomTeinte(composition.couleur) : null].filter((x): x is string => Boolean(x));
  return { profession: p.profession, profils: [...new Set([...(p.profil ? [p.profil] : []), ...(p.profilsCibles ?? [])])].slice(0, 30), couleurs };
}

// ---------------------------------------------------------------------------------------------------------------
// Tableau de bord : qui a la main
// ---------------------------------------------------------------------------------------------------------------

export type Attente = { modele: string | null; nom: string; statut: StatutModele | null; texte: string; href: string };

/** Relecture d'une fiche (avis de la version précédente hérités pour les pages qu'une relance n'a pas changées) */
export function revisionDeFiche(e: Pick<EtatChaine, 'versions' | 'revues' | 'tickets'>, f: Pick<FicheModele, 'id' | 'versionCourante'>): EtatRevision {
  const v = versionDe(e, f.id, f.versionCourante), prec = versionDe(e, f.id, f.versionCourante - 1);
  return etatRevision(f.versionCourante, e.revues.filter((r) => r.modele === f.id), e.tickets.filter((t) => t.modele === f.id), prec ? { precedente: prec.version, changees: pagesChangees(prec.composition, v?.composition) } : undefined);
}

/**
 * PROXIMITÉ DE LA PUBLICATION (décision de Paul du 2026-10-10 : « tout doit être fait pour accélérer la création de modèles ; on
 * priorise un modèle quasi fini à un autre modèle en cours »). Rang de chaque statut, du plus proche des clients au plus loin :
 * publier > revalider > faire retoucher > tester la version retouchée > relire > tester un finaliste > file des finalistes > tournoi.
 */
export const PROXIMITE_PUBLICATION: Readonly<Record<StatutModele, number>> = {
  'pret-validation': 0, revalidation: 1, retouche: 2, 'recheck-agent': 3, 'avis-humain': 4, 'check-agent': 5, finaliste: 6, candidat: 7, publie: 8, ecarte: 9,
};

/**
 * Ordre STRICT par proximité de la publication : étape la plus proche d'abord ; à étape égale, relecture déjà entamée d'abord (jamais
 * deux modèles entamés en parallèle quand un seul peut être terminé), puis moins de pages restantes, moins de tickets ouverts,
 * meilleur rang du tournoi, puis le plus ancien. Comparateur pour Array.sort (mémorise ses calculs par fiche).
 */
export function comparerProximite(e: Pick<EtatChaine, 'versions' | 'revues' | 'tickets'>): (a: FicheModele, b: FicheModele) => number {
  const cles = new Map<string, number[]>();
  const cle = (f: FicheModele) => {
    let k = cles.get(f.id);
    if (!k) {
      const r = f.statut === 'avis-humain' ? revisionDeFiche(e, f) : null;
      k = [PROXIMITE_PUBLICATION[f.statut] ?? 99, r && r.faites > 0 && !r.terminee ? 0 : 1, r ? r.total - r.faites : 0, ticketsOuverts(e.tickets.filter((t) => t.modele === f.id)).length, f.rang ?? 999];
      cles.set(f.id, k);
    }
    return k;
  };
  return (a, b) => {
    const x = cle(a), y = cle(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return a.creeLe < b.creeLe ? -1 : a.creeLe > b.creeLe ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

/** Relectures entamées (au moins une page vue, pas terminées) : tant qu'il y en a, aucune nouvelle relecture n'est proposée */
export const relecturesEntamees = (e: Pick<EtatChaine, 'fiches' | 'versions' | 'revues' | 'tickets'>) =>
  e.fiches.filter((f) => f.statut === 'avis-humain').filter((f) => { const r = revisionDeFiche(e, f); return r.faites > 0 && !r.terminee; });

/**
 * Ce qui attend un humain, pour UNE personne : avis de page (cellules pas encore vues), revalidations, pour le validateur les
 * modèles prêts pour validation ; puis votes des tournois ouverts ; puis la présélection des 3 profils les moins remplis.
 */
export function attentesHumain(e: EtatChaine, personne: { id: string; role: RoleEquipe }, profils: readonly { id: string; nom: string; profession: string }[]): Attente[] {
  const l: Attente[] = [];
  const tournois: Attente[] = [];
  const reserves: (Attente & { n: number })[] = [];
  // Designs : présélection et tournoi par PROFESSION ; anciens modèles par profil (s'il en reste des candidats)
  const groupes = [...new Set([...profils.map((p) => `${p.profession}|*`), ...e.fiches.filter((f) => f.statut === 'candidat').map(groupeTournoi)])];
  for (const g of groupes) {
    const profil = g.split('|')[1];
    const nom = profil === '*' ? 'Tous profils' : profils.find((p) => p.id === profil)?.nom ?? profil;
    const cand = e.fiches.filter((f) => f.statut === 'candidat' && groupeTournoi(f) === g);
    if (profil === '*' && cand.length < CHAINE.objectifCandidats) reserves.push({ modele: null, nom, statut: null, texte: cand.length < CHAINE.ouvertureTournoi ? `Présélection : ${cand.length} / ${CHAINE.ouvertureTournoi} candidats pour ouvrir le tournoi` : `Présélection : ${cand.length} / ${CHAINE.objectifCandidats} candidats`, href: '/chaine/preselection', n: cand.length });
    const t = tournoiDuProfil(e, cand.map((f) => f.id));
    if (t.ouvert && !t.arrete) tournois.push({ modele: null, nom, statut: 'candidat', texte: `Tournoi : ${t.texte}`, href: `/chaine/tournoi${profil === '*' ? '' : `?profil=${encodeURIComponent(profil)}`}` });
  }
  // Modèles du plus proche de la publication au plus loin ; une relecture entamée passe avant toute nouvelle relecture (2026-10-10)
  const entamees = new Set(relecturesEntamees(e).map((f) => f.id));
  for (const f of [...e.fiches].sort(comparerProximite(e))) {
    if (f.statut === 'avis-humain') {
      if (entamees.size && !entamees.has(f.id)) continue;
      const r = revisionDeFiche(e, f);
      const miennes = e.revues.filter((x) => x.modele === f.id && x.version === f.versionCourante && x.auteur === personne.id).length;
      if (!r.terminee) l.push({ modele: f.id, nom: f.nom, statut: f.statut, texte: `Avis : ${r.faites} / ${r.total} pages vues${miennes ? ` (dont ${miennes} par vous)` : ''}`, href: `/chaine/revision/${f.id}` });
    } else if (f.statut === 'revalidation') {
      l.push({ modele: f.id, nom: f.nom, statut: f.statut, texte: `Revalider la v${f.versionCourante} (ce qui a changé seulement)`, href: `/chaine/revision/${f.id}` });
    } else if (f.statut === 'pret-validation' && personne.role === 'validateur') {
      l.push({ modele: f.id, nom: f.nom, statut: f.statut, texte: 'Validation finale et publication', href: `/chaine/modele/${f.id}` });
    }
  }
  // Ordre : modèles (validation, revalidations, avis : du plus proche de la publication au plus loin), puis tournois ouverts, puis la
  // présélection
  return [...l, ...tournois, ...reserves.sort((a, b) => a.n - b.n).slice(0, 3).map(({ n: _n, ...x }) => x)];
}

/** Ce qui tourne tout seul : agent, Claude, automate (avec un mot de ce qui est attendu) */
export function attentesMachines(e: EtatChaine): Attente[] {
  return [...e.fiches].sort(comparerProximite(e)).flatMap((f): Attente[] => {
    if (f.statut === 'check-agent' || f.statut === 'recheck-agent') return [{ modele: f.id, nom: f.nom, statut: f.statut, texte: `Testeur : passage de la v${f.versionCourante} attendu`, href: `/chaine/modele/${f.id}` }];
    if (f.statut === 'retouche') return [{ modele: f.id, nom: f.nom, statut: f.statut, texte: `Claude : ${ticketsOuverts(e.tickets.filter((t) => t.modele === f.id)).length} ticket(s) à corriger (retours/tickets-modeles.json)`, href: `/chaine/modele/${f.id}` }];
    if (f.statut === 'finaliste') return [{ modele: f.id, nom: f.nom, statut: f.statut, texte: 'En file : entre dans la boucle dès qu’une place se libère', href: `/chaine/modele/${f.id}` }];
    return [];
  });
}

/** Compteurs par colonne du tableau */
export function compteursChaine(fiches: readonly Pick<FicheModele, 'statut'>[]): Record<StatutModele, number> {
  const c = Object.fromEntries(STATUTS_MODELE.map((s) => [s.id, 0])) as Record<StatutModele, number>;
  for (const f of fiches) c[f.statut]++;
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Export pour Claude (retours/tickets-modeles.json + section de SYNTHESE.md) : finalistes d'abord
// ---------------------------------------------------------------------------------------------------------------

const PRIORITE_STATUT: Partial<Record<StatutModele, number>> = { retouche: 0, publie: 1, 'pret-validation': 2, revalidation: 3, 'recheck-agent': 4, 'avis-humain': 5, 'check-agent': 6 };

/**
 * Tickets ouverts priorisés pour la retouche : modèles en retouche d'abord (puis publiés avec ticket), meilleur rang du tournoi,
 * tickets bloquants puis humains. Jamais d'auteur (dépôt public) : origine seulement.
 */
export function exportTicketsModeles(fiches: readonly FicheModele[], versions: readonly VersionModele[], tickets: readonly TicketModele[]) {
  const actifs = fiches.filter((f) => PRIORITE_STATUT[f.statut] !== undefined)
    .sort((a, b) => PRIORITE_STATUT[a.statut]! - PRIORITE_STATUT[b.statut]! || (a.rang ?? 99) - (b.rang ?? 99) || (a.id < b.id ? -1 : 1));
  const grav = (t: TicketModele) => (t.gravite === 'bloquant' ? 0 : t.origine === 'humain' ? 1 : t.gravite === 'majeur' ? 2 : 3);
  return actifs.map((f) => {
    const v = versions.find((x) => x.modele === f.id && x.version === f.versionCourante) ?? null;
    const ouverts = ticketsOuverts(tickets.filter((t) => t.modele === f.id)).sort((a, b) => grav(a) - grav(b) || a.numero - b.numero);
    return {
      modele: f.id, nom: f.nom, profession: f.profession, profil: f.profil, statut: f.statut, rang: f.rang, version: f.versionCourante, scenario: f.scenario,
      composition: v?.composition ?? null, test: v?.test ? { verdict: v.test.verdict, controles: v.test.controles.filter((c) => c.verdict !== 'vert') } : null,
      tickets: ouverts.map(({ auteur: _a, ...t }) => t),
    };
  }).filter((m) => m.tickets.length || m.statut === 'retouche');
}

export function markdownTicketsModeles(l: ReturnType<typeof exportTicketsModeles>): string {
  const lignes = ['## Chaîne des modèles : tickets à corriger (priorité)', ''];
  if (!l.length) return [...lignes, 'Aucun ticket ouvert.'].join('\n');
  lignes.push('Écrire la correction dans `retours/retouches-modeles.json` ({ modele, versionBase, composition, corrections: [{ ticket, texte }] }) : la chaîne crée la nouvelle version.', '');
  for (const m of l) {
    lignes.push(`### ${m.nom} (${m.modele}) · v${m.version} · ${statutModele(m.statut).libelle}${m.rang ? ` · rang ${m.rang}` : ''}`);
    for (const t of m.tickets) lignes.push(`- #${t.numero} [${t.origine}${t.gravite ? `, ${t.gravite}` : ''}] ${libellePageModele(t.page)} (${t.appareil})${t.zone ? ` zone (${pct(t.zone.x)}, ${pct(t.zone.y)}, ${pct(t.zone.l)} × ${pct(t.zone.h)})` : ''}${t.element ? ` élément ${t.element}` : ''} · ${t.etiquette}${t.commentaire ? ` : ${t.commentaire}` : ''}`);
    lignes.push('');
  }
  return lignes.join('\n').replace(/\n+$/, '');
}

/**
 * Demande AUTONOME à Claude pour la retouche d'un modèle (décision de Paul du 2026-10-10, « mobile seul » : envoyée depuis le
 * téléphone par la feuille de partage vers l'app Claude, session Code). Elle se suffit : modèle, version de base, tickets ouverts
 * (page, appareil, zone, élément, commentaire) et la livraison attendue par l'automate (retours/retouches-modeles.json).
 * Jamais d'auteur (dépôt public) : origine seulement.
 */
export function demandeCorrectionsModele(
  f: Pick<FicheModele, 'id' | 'nom' | 'versionCourante' | 'profession' | 'profil'>,
  tickets: readonly Pick<TicketModele, 'numero' | 'page' | 'appareil' | 'zone' | 'element' | 'etiquette' | 'commentaire' | 'origine' | 'gravite' | 'statut'>[],
): string {
  const ouverts = ticketsOuverts(tickets).sort((a, b) => a.numero - b.numero);
  const l = [
    `Corrige le modèle « ${f.nom} » de la chaîne des modèles (dépôt plateforme-sante) : modele ${f.id}, version de base v${f.versionCourante}, profession ${f.profession}${f.profil ? `, profil ${f.profil}` : ' (design, tous profils compatibles)'}.`,
    '',
    `Tickets ouverts (${ouverts.length}) :`,
    ...ouverts.map((t) => `- #${t.numero} [${t.origine}${t.gravite ? `, ${t.gravite}` : ''}] page ${libellePageModele(t.page)} (${t.appareil === 'mobile' ? 'téléphone' : 'ordinateur'})${t.zone ? ` · zone (${pct(t.zone.x)}, ${pct(t.zone.y)}, ${pct(t.zone.l)} × ${pct(t.zone.h)})` : ' · page entière'}${t.element ? ` · élément ${t.element}` : ''} · ${t.etiquette}${t.commentaire ? ` : ${t.commentaire}` : ''}`),
    ...(ouverts.length ? [] : ['- (aucun ticket ouvert : voir retours/tickets-modeles.json)']),
    '',
    `Composition de départ : retours/tickets-modeles.json (export de la chaîne, modele ${f.id}).`,
    `Livraison : écrire la correction dans retours/retouches-modeles.json ({ modele: "${f.id}", versionBase: ${f.versionCourante}, composition, corrections: [{ ticket, texte }] }), un texte par ticket, puis pousser sur main. La chaîne crée la v${f.versionCourante + 1}, qui repasse au testeur puis revient en revalidation.`,
  ];
  return l.join('\n');
}

/** Versions à faire passer au testeur (retours/modeles-a-tester.json) */
export function modelesATester(fiches: readonly FicheModele[], versions: readonly VersionModele[]) {
  // Du plus proche de la publication au plus loin (version retouchée avant un finaliste, meilleur rang d'abord)
  return [...fiches].sort(comparerProximite({ versions, revues: [], tickets: [] })).filter((f) => STATUTS_BOUCLE.includes(f.statut) || f.statut === 'pret-validation' || f.statut === 'publie').flatMap((f) => {
    const v = versions.find((x) => x.modele === f.id && x.version === f.versionCourante);
    // Design : un jeu de démonstration par famille de thèmes compatibles (chaine-design.ts, jeuxDuModele)
    return v && !v.test ? [{ modele: f.id, version: v.version, profession: f.profession, profil: f.profil, scenario: f.scenario, composition: v.composition, jeux: f.profil ? [f.profil] : jeuxDuModele(f.profession, f.tags.profils) }] : [];
  });
}

