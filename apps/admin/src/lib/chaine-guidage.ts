import 'server-only';
import {
  CHAINE, cleComposition, designDe, prochaineActionChaine, serialiserComposition, profilsCompatibles, tagsAutomatiques, tournoiDuProfil, type EtatTournoiGrilles, type ProchaineAction,
} from '@plateforme/core';
import { PROFESSION_PAR_DEFAUT } from '@plateforme/core/professions';
import { enregistrerVersionInitiale, lireChaine, VERSION_NON_ENREGISTREE, type Chaine, type Equipier } from '@/lib/chaine-modeles';
import { getPropositionsClaude, getPropositionsClaudeFraiches } from '@/lib/directeur';
import { getRecettes } from '@/lib/recettes';
import { createClient } from '@/lib/supabase/server';
import { compositionDe } from '@/app/chaine/validation';
import { profilsChaine } from '@/app/chaine/donnees';

// CHAÎNE GUIDÉE côté serveur (packages/core/src/chaine-guidage.ts, demande de Paul du 2026-10-10) : la prochaine action de la
// personne connectée, calculée sur la chaîne DÉJÀ lue par la page (aucune lecture Supabase de plus, sauf l'import automatique
// ci-dessous). Ce qui n'est pas du goût est fait seul : sans assez de candidats pour ouvrir le tournoi, les designs proposés par
// Claude (retours/recettes-proposees.json, ids canon-*, lus avec le cache de 10 min) deviennent candidats automatiquement.

export type RetourImport = { ok: boolean; message: string; ajoutes: number };

/** Designs de Claude (canon-*) : clé de composition de chacun (même clé que la fiche importée) ; calcul mémorisé par lot */
type DesignsClaude = { le: string | null; designs: { p: Awaited<ReturnType<typeof getPropositionsClaude>>['propositions'][number]; design: Record<string, unknown>; cle: string }[] };
let memoDesigns: { cle: string; r: DesignsClaude } | null = null;
async function designsClaude(frais = false): Promise<DesignsClaude> {
  const lot = await (frais ? getPropositionsClaudeFraiches() : getPropositionsClaude()).catch(() => null);
  // Clé du lot : date et identifiants (un nouvel envoi de Claude change la date) ; React.cache ne dure qu'une requête
  const cleLot = lot ? `${lot.le ?? ''}|${lot.propositions.map((p) => p.id).join(',')}` : '';
  if (lot && memoDesigns?.cle === cleLot) return memoDesigns.r;
  const r = { le: lot?.le ?? null, designs: (lot?.propositions ?? []).filter((p) => p.id.startsWith('canon-') && p.composition && typeof p.composition === 'object').map((p) => { const design = designDe(p.composition as Record<string, unknown>); return { p, design, cle: cleComposition(design) }; }) };
  if (lot) memoDesigns = { cle: cleLot, r };
  return r;
}

/**
 * Designs connus par clé de composition pour réparer des fiches sans version (automate, lib/chaine-modeles.ts) : propositions de
 * Claude (ids canon-*, même clé que la fiche importée), recettes liées (fiche.recette). Le design d'une présélection n'est pas gardé
 * ailleurs : inconnu (la fiche est alors écartée).
 */
export async function designsConnusParCle(fiches: readonly { cle: string; recette: string | null }[]): Promise<Map<string, Record<string, unknown>>> {
  const r = new Map<string, Record<string, unknown>>();
  const { designs } = await designsClaude().catch(() => ({ le: null, designs: [] as DesignsClaude['designs'] }));
  for (const d of designs) r.set(d.cle, d.design);
  if (fiches.some((f) => f.recette)) {
    const { recettes } = await getRecettes().catch(() => ({ recettes: [] as Awaited<ReturnType<typeof getRecettes>>['recettes'] }));
    for (const x of recettes) {
      if (!fiches.some((f) => f.recette === x.id)) continue;
      try { const design = designDe(JSON.parse(serialiserComposition(x.composition))); r.set(cleComposition(design), design); } catch { /* recette illisible */ }
    }
  }
  return new Map([...r].filter(([cle]) => fiches.some((f) => f.cle === cle)));
}

/** À appeler au début de la page (sans attendre) : la lecture des propositions de Claude part en même temps que celles de la page */
export function prechargerGuidage() { void designsClaude().catch(() => null); }

/**
 * Import des designs de Claude comme candidats (fiche SANS profil, origine « claude », version 1 = design, tags pré-calculés) ;
 * une proposition déjà dans la chaîne (même clé, quel que soit son statut) est ignorée. Sans revalidatePath : appelable pendant le
 * rendu (import automatique) comme depuis l'action du bouton (app/chaine/import-claude.ts, qui revalide).
 */
export async function importerDesignsClaude(moi: Equipier, opts: { frais?: boolean; dejaLa?: ReadonlySet<string> } = {}): Promise<RetourImport> {
  const { profession, profils } = await profilsChaine();
  const { le, designs } = await designsClaude(opts.frais);
  const nouveaux = designs.filter((d) => !opts.dejaLa?.has(d.cle));
  if (!nouveaux.length) return { ok: true, ajoutes: 0, message: designs.length ? 'Propositions de Claude déjà candidates.' : 'Aucune proposition de design de Claude à importer.' };
  const supabase = await createClient();
  let n = 0, echecs = 0;
  for (const { p, design, cle } of nouveaux) {
    const demo = profils.find((x) => x.sujets[0] === p.scenario.principaux[0]) ?? profils[0];
    const x = demo ? compositionDe({ scenario: demo.scenario }, design) : null;
    const cibles = x ? profilsCompatibles(x, profils).map((q) => q.id) : profils.map((q) => q.id);
    const { data, error } = await supabase.from('modeles_fiches').insert({
      nom: p.nom.slice(0, 120), profession: profession.id, profil: null, cle, origine: 'claude',
      scenario: demo ? { principaux: demo.scenario.principaux, secondaires: demo.scenario.secondaires, couleurs: demo.scenario.couleurs } : {},
      tags: tagsAutomatiques(design, { profession: profession.id, profilsCibles: cibles }),
    }).select('id').maybeSingle();
    if (error?.code === '42P01' || error?.code === 'PGRST205') return { ok: false, ajoutes: n, message: 'Migration 0050 à exécuter (supabase/migrations/0050_chaine_modeles.sql) : la chaîne des modèles n’enregistre rien pour l’instant.' };
    if (error || !data) continue; // déjà candidat (23505) ou refus : suivant
    if (!(await enregistrerVersionInitiale(supabase, { modele: data.id, composition: design, cle, journal: [{ type: 'creation', texte: `proposition de Claude « ${p.nom} » (${p.id}, ${le ?? 'sans date'})` }], auteur: moi.id }))) { echecs++; continue; }
    n++;
  }
  const msg = n ? `${n} design${n > 1 ? 's' : ''} de Claude ajouté${n > 1 ? 's' : ''} aux candidats.` : 'Propositions de Claude déjà candidates.';
  return { ok: !echecs || n > 0, ajoutes: n, message: echecs ? `${n ? `${msg} ` : ''}${VERSION_NON_ENREGISTREE}` : msg };
}

// Import automatique au plus une fois toutes les 10 min par profession et par instance (un refus ne se rejoue pas à chaque page)
const IMPORT_AUTO_MS = 10 * 60_000;
const dernierImport = new Map<string, number>();

/**
 * Prochaine action de la personne pour la profession (chaîne déjà lue par la page). `tournoi` : déjà calculé par la page (sinon
 * calculé ici, quelques millisecondes). Import automatique des designs de Claude quand il manque des candidats pour ouvrir le
 * tournoi (profession par défaut : les canons sont des designs de podologue) ; la chaîne est alors relue une fois.
 */
export async function guidageChaine(p: { moi: Equipier; profession: string; chaine: Chaine; tournoi?: EtatTournoiGrilles | null; autoImport?: boolean }): Promise<{ action: ProchaineAction; chaine: Chaine; importes: number }> {
  // Jamais d'exception (2026-10-10, bug « grille 49 ») : en cas d'erreur (import, lecture, calcul), guidage calculé sur la chaîne
  // déjà lue, sans import ; en dernier recours, sur une chaîne vide (le bandeau reste affiché, la page aussi)
  try {
    return await guidageSansGarde(p);
  } catch (e) {
    console.warn(`[chaine] guidage en erreur : ${(e as Error)?.message ?? e}`);
    try {
      const fiches = p.chaine.fiches.filter((f) => f.profession === p.profession);
      const etat = { ...p.chaine, fiches };
      const cand = fiches.filter((f) => f.profil === null && f.statut === 'candidat').map((f) => f.id);
      const tournoi = p.tournoi !== undefined ? p.tournoi : cand.length ? tournoiDuProfil(etat, cand) : null;
      return { action: prochaineActionChaine({ role: p.moi.role, etat, migrationManquante: p.chaine.migrationManquante, tournoi }), chaine: p.chaine, importes: 0 };
    } catch {
      return { action: prochaineActionChaine({ role: p.moi.role, etat: { fiches: [], versions: [], tickets: [], votes: [], revues: [] }, tournoi: null }), chaine: p.chaine, importes: 0 };
    }
  }
}

async function guidageSansGarde(p: { moi: Equipier; profession: string; chaine: Chaine; tournoi?: EtatTournoiGrilles | null; autoImport?: boolean }): Promise<{ action: ProchaineAction; chaine: Chaine; importes: number }> {
  let chaine = p.chaine;
  let importes = 0;
  const designsCandidats = (c: Chaine) => c.fiches.filter((f) => f.profession === p.profession && f.profil === null && f.statut === 'candidat');
  const ouverture = CHAINE.ouvertureTournoi;
  let claude = 0;
  if (!chaine.migrationManquante && !chaine.erreurLecture) {
    const cles = new Set(chaine.fiches.filter((f) => f.profession === p.profession).map((f) => f.cle));
    const { designs } = await designsClaude().catch(() => ({ le: null, designs: [] as DesignsClaude['designs'] }));
    claude = designs.filter((d) => !cles.has(d.cle)).length;
    const k = p.profession;
    if (p.autoImport !== false && claude > 0 && p.profession === PROFESSION_PAR_DEFAUT && designsCandidats(chaine).length < ouverture && Date.now() - (dernierImport.get(k) ?? 0) > IMPORT_AUTO_MS) {
      dernierImport.set(k, Date.now());
      const r = await importerDesignsClaude(p.moi, { dejaLa: cles }).catch(() => null);
      if (r?.ajoutes) {
        importes = r.ajoutes;
        const relue = await lireChaine(p.profession, { versions: 'utiles' }).catch(() => null);
        if (relue && !relue.erreurLecture) chaine = { ...relue, signaux: chaine.signaux };
        const apres = new Set(chaine.fiches.map((f) => f.cle));
        claude = designs.filter((d) => !apres.has(d.cle)).length;
      }
    }
  }
  const fiches = chaine.fiches.filter((f) => f.profession === p.profession);
  const etat = { ...chaine, fiches };
  const cand = designsCandidats(chaine).map((f) => f.id);
  const tournoi = importes || p.tournoi === undefined ? (cand.length ? tournoiDuProfil(etat, cand) : null) : p.tournoi;
  const action = prochaineActionChaine({ role: p.moi.role, etat, migrationManquante: chaine.migrationManquante, tournoi, propositionsClaude: claude });
  return { action, chaine, importes };
}
