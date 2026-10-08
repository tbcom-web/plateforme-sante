import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { redirect } from 'next/navigation';
import {
  appliquerResultatTest, fairetournerChaine, lireResultatsTests, lireRetouches, nouvelleVersion, normaliserResultatTest, normaliserTicket, retouchesAAppliquer, roleEffectif,
  estStatutModele, STATUTS_BOUCLE, type ActionAuto, type EtatChaine, type FicheModele, type RevueModele, type RoleEquipe, type TicketModele, type VersionModele, type VoteModele,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// CHAÎNE DE PRODUCTION DES MODÈLES côté serveur (migration 0050, packages/core/src/chaine-modeles.ts, docs/chaine-modeles.md) :
// - rôles : getEquipier (rôle effectif : super admin = validateur), exigerContributeur, exigerValidateur ;
// - lecture de la chaîne (fiches, versions, tickets, votes, avis) avec la session de la personne (RLS équipe) ;
// - faireTournerChaine : ce qui tourne tout seul, à chaque ouverture du tableau ou après une action : résultats du testeur
//   (retours/tests-modeles.json du dépôt ou colonne modeles_versions.test) → tickets techniques ; retouches de Claude
//   (retours/retouches-modeles.json) → nouvelles versions ; puis l'automate (fin des tournois, entrée dans la boucle, passages
//   d'étape). Aucune publication ici : publier reste un geste du validateur.

export const MIGRATION_CHAINE = 'Migration 0050 à exécuter (supabase/migrations/0050_chaine_modeles.sql) : la chaîne des modèles n’enregistre rien pour l’instant.';

export type Equipier = { id: string; email: string; role: RoleEquipe };

async function getEquipierSansMemo(): Promise<Equipier | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  let { data, error } = await supabase.from('profiles').select('role, role_equipe').eq('id', auth.user.id).maybeSingle();
  if (error) ({ data } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle());
  const role = roleEffectif((data as { role?: string } | null)?.role, (data as { role_equipe?: string } | null)?.role_equipe);
  return role ? { id: auth.user.id, email: auth.user.email ?? '', role } : null;
}
export const getEquipier = cache(getEquipierSansMemo);

/** En tête de chaque page et action de la chaîne : contributeur ou validateur */
export async function exigerContributeur(): Promise<Equipier> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/connexion');
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
    id: l.id, nom: String(l.nom ?? ''), profession: String(l.profession ?? 'podologue'), profil: String(l.profil ?? ''), statut: l.statut,
    versionCourante: Number(l.version_courante) || 1, versionPubliee: l.version_publiee == null ? null : Number(l.version_publiee),
    versionRetouche: l.version_retouche == null ? null : Number(l.version_retouche),
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
  profil: String(l.profil), a: String(l.a), b: String(l.b), resultat: l.resultat === 'a' || l.resultat === 'b' ? l.resultat : 'egalite', votant: String(l.votant ?? ''), poids: Number(l.poids) || 1, le: String(l.created_at ?? ''),
});
const revueDepuisLigne = (l: Record<string, unknown>): RevueModele => ({
  modele: String(l.modele), version: Number(l.version), page: (l.page ?? null) as RevueModele['page'], appareil: (l.appareil ?? null) as RevueModele['appareil'], auteur: String(l.auteur ?? ''),
  verdict: l.verdict === 'tickets' || l.verdict === 'revalide' ? l.verdict : 'rien', le: String(l.created_at ?? ''),
});

export const ligneTicket = (t: TicketModele) => ({
  modele: t.modele, numero: t.numero, page: t.page, appareil: t.appareil, zone: t.zone ?? null, element: t.element ?? null, etiquette: t.etiquette, commentaire: t.commentaire,
  origine: t.origine, gravite: t.gravite ?? null, controle: t.controle ?? null, statut: t.statut, version_ouverture: t.versionOuverture, version_correction: t.versionCorrection ?? null,
});

export type Chaine = EtatChaine & { tickets: (TicketModele & { id: string })[]; migrationManquante: boolean };

/** Toute la chaîne d'une profession (null = toutes) */
export async function lireChaine(profession: string | null): Promise<Chaine> {
  const supabase = await createClient();
  // Signal propre à chaque lecture : pas de mémorisation des fetch GET identiques pendant le rendu (relecture après écriture)
  const s = new AbortController().signal;
  let qf = supabase.from('modeles_fiches').select('*').order('created_at', { ascending: true }).limit(3000).abortSignal(s);
  if (profession) qf = qf.eq('profession', profession);
  const { data: fl, error } = await qf;
  if (error) return { fiches: [], versions: [], tickets: [], votes: [], revues: [], migrationManquante: true };
  const fiches = ((fl ?? []) as Record<string, unknown>[]).map(ficheDepuisLigne).filter((f): f is FicheModele => f !== null);
  const ids = new Set(fiches.map((f) => f.id));
  const [vl, tl, vol, rl] = await Promise.all([
    supabase.from('modeles_versions').select('*').order('version', { ascending: true }).limit(10000).abortSignal(s),
    supabase.from('modeles_tickets').select('*').order('numero', { ascending: true }).limit(10000).abortSignal(s),
    supabase.from('modeles_votes').select('profil, a, b, resultat, votant, poids, created_at').order('created_at', { ascending: true }).limit(20000).abortSignal(s),
    supabase.from('modeles_revues').select('modele, version, page, appareil, auteur, verdict, created_at').limit(20000).abortSignal(s),
  ]);
  return {
    fiches,
    versions: ((vl.data ?? []) as Record<string, unknown>[]).map(versionDepuisLigne).filter((v) => ids.has(v.modele)),
    tickets: ((tl.data ?? []) as Record<string, unknown>[]).map(ticketDepuisLigne).filter((t): t is TicketModele & { id: string } => t !== null && ids.has(t.modele)),
    votes: ((vol.data ?? []) as Record<string, unknown>[]).map(voteDepuisLigne).filter((v) => ids.has(v.a) && ids.has(v.b)),
    revues: ((rl.data ?? []) as Record<string, unknown>[]).map(revueDepuisLigne).filter((r) => ids.has(r.modele)),
    migrationManquante: false,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Fichiers du dépôt écrits par les agents (testeur, Claude) : API GitHub, sinon dossier local
// ---------------------------------------------------------------------------------------------------------------

export async function lireFichierRetours(nom: string): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO;
  if (token && repo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/retours/${nom}?ref=main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, next: { revalidate: 120 },
      });
      if (r.ok) return await r.json();
    } catch { /* repli local */ }
  }
  for (const racine of [process.env.RETOURS_DIR ?? '', process.cwd(), join(process.cwd(), '..', '..')].filter(Boolean)) {
    try { return JSON.parse(await readFile(join(racine, racine === process.env.RETOURS_DIR ? '' : 'retours', nom), 'utf8')); } catch { /* suivant */ }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Ce qui tourne tout seul
// ---------------------------------------------------------------------------------------------------------------

export type BilanAutomate = { tests: number; retouches: number; tickets: number; actions: ActionAuto[] };

/** Applique tests du dépôt, retouches de Claude et transitions automatiques ; renvoie ce qui a été fait */
export async function faireTournerChaine(profession: string | null): Promise<BilanAutomate & { chaine: Chaine }> {
  let chaine = await lireChaine(profession);
  const bilan: BilanAutomate = { tests: 0, retouches: 0, tickets: 0, actions: [] };
  if (chaine.migrationManquante || !chaine.fiches.length) return { ...bilan, chaine };
  const supabase = await createClient();
  const [testsBruts, retouchesBrutes] = await Promise.all([lireFichierRetours('tests-modeles.json'), lireFichierRetours('retouches-modeles.json')]);
  let change = false;
  // 1. Résultats du testeur (fichiers du dépôt) : liste commune `tests-modeles.json`, et un fichier par version écrit par l'agent
  //    testeur (`tests-modeles/<modele>-v<version>.json`, docs/testeur-modeles.md) pour les versions courantes encore sans test ;
  //    enregistrés sur la version testée s'ils sont plus récents que celui déjà en base
  const sansTest = chaine.fiches.filter((f) => STATUTS_BOUCLE.includes(f.statut) || f.statut === 'pret-validation' || f.statut === 'publie')
    .filter((f) => !chaine.versions.find((v) => v.modele === f.id && v.version === f.versionCourante)?.test);
  const parVersion = await Promise.all(sansTest.map((f) => lireFichierRetours(`tests-modeles/${f.id.toLowerCase()}-v${f.versionCourante}.json`).then(normaliserResultatTest).catch(() => null)));
  for (const r of [...lireResultatsTests(testsBruts), ...parVersion.filter((x): x is NonNullable<typeof x> => x !== null)]) {
    const v = chaine.versions.find((x) => x.modele === r.modele && x.version === r.version);
    if (!v || (v.test && v.test.le >= r.le)) continue;
    const { error } = await supabase.from('modeles_versions').update({ test: r }).eq('modele', r.modele).eq('version', r.version);
    if (!error) { bilan.tests++; change = true; }
  }
  if (change) chaine = await lireChaine(profession);
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
  if (change) chaine = await lireChaine(profession);
  // 4. Automate : transitions jusqu'au point fixe
  const { actions } = fairetournerChaine(chaine);
  for (const a of actions) {
    if (a.kind === 'statut') {
      const maj: Record<string, unknown> = { statut: a.vers };
      if (a.rang !== undefined) maj.rang = a.rang;
      if (a.versionRetouche !== undefined) maj.version_retouche = a.versionRetouche;
      const { error } = await supabase.from('modeles_fiches').update(maj).eq('id', a.modele).eq('statut', a.de);
      if (!error) bilan.actions.push(a);
    } else {
      const { error } = await supabase.from('modeles_tickets').update({ statut: 'ferme', version_correction: a.version }).eq('modele', a.modele).eq('numero', a.numero).neq('statut', 'ferme');
      if (!error) bilan.actions.push(a);
    }
  }
  if (bilan.actions.length) chaine = await lireChaine(profession);
  return { ...bilan, chaine };
}

/** Équipe (tableau « par personne ») : fonction equipe_chaine() de 0050 */
export async function getEquipe(): Promise<{ id: string; email: string; role: RoleEquipe }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('equipe_chaine');
  if (error || !Array.isArray(data)) return [];
  return (data as { id: string; email: string; role_equipe: string }[]).flatMap((l) => (l.role_equipe === 'contributeur' || l.role_equipe === 'validateur' ? [{ id: l.id, email: l.email, role: l.role_equipe }] : []));
}

export const getChaineMemo = cache(lireChaine);
