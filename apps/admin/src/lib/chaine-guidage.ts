import 'server-only';
import {
  cleComposition, designDe, prochaineActionChaine, serialiserComposition, profilsCompatibles, tagsAutomatiques, type ProchaineAction,
} from '@plateforme/core';
import { enregistrerVersionInitiale, getEquipier, lireChaine, VERSION_NON_ENREGISTREE, type Chaine, type Equipier } from '@/lib/chaine-modeles';
import { getPropositionsClaude, getPropositionsClaudeFraiches } from '@/lib/directeur';
import { getRecettes } from '@/lib/recettes';
import { createClient } from '@/lib/supabase/server';
import { compositionDe } from '@/app/chaine/validation';
import { profilsChaine } from '@/app/chaine/donnees';

// CHAÎNE GUIDÉE côté serveur (packages/core/src/chaine-guidage.ts, demande de Paul du 2026-10-10) : la prochaine action de la
// personne connectée, calculée sur la chaîne DÉJÀ lue par la page (aucune lecture Supabase de plus). Chaîne en 3 étapes (2026-10-11) :
// les designs proposés par Claude (retours/recettes-proposees.json, ids canon-*, cache de 10 min) ne sont importés QUE par le bouton
// « Importer les propositions de Claude » (un design importé est gardé, donc vérifié : c'est un choix de goût).

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

/**
 * Prochaine action de la personne pour la profession (chaîne déjà lue par la page, automate et vérification automatique compris).
 * Chaîne en 3 étapes (2026-10-11) : plus d'import AUTOMATIQUE des designs de Claude (un design importé est gardé, donc vérifié :
 * c'est un choix de goût, fait par le bouton « Importer les propositions de Claude ») ; le tournoi n'entre plus dans le guidage.
 */
export async function guidageChaine(p: { moi: Equipier; profession: string; chaine: Chaine }): Promise<{ action: ProchaineAction; chaine: Chaine; importes: number }> {
  // Jamais d'exception (2026-10-10, bug « grille 49 ») : en dernier recours, guidage sur une chaîne vide (le bandeau reste affiché)
  try {
    let claude = 0;
    if (!p.chaine.migrationManquante && !p.chaine.erreurLecture) {
      const cles = new Set(p.chaine.fiches.filter((f) => f.profession === p.profession).map((f) => f.cle));
      const { designs } = await designsClaude().catch(() => ({ le: null, designs: [] as DesignsClaude['designs'] }));
      claude = designs.filter((d) => !cles.has(d.cle)).length;
    }
    const fiches = p.chaine.fiches.filter((f) => f.profession === p.profession);
    const l = p.chaine.lancements;
    const action = prochaineActionChaine({ role: p.moi.role, etat: { ...p.chaine, fiches }, migrationManquante: p.chaine.migrationManquante, propositionsClaude: claude, lances: l?.lances ?? [], lancementAuto: l ? l.configure : undefined });
    return { action, chaine: p.chaine, importes: 0 };
  } catch (e) {
    console.warn(`[chaine] guidage en erreur : ${(e as Error)?.message ?? e}`);
    return { action: prochaineActionChaine({ role: p.moi.role, etat: { fiches: [], versions: [], tickets: [], votes: [], revues: [] } }), chaine: p.chaine, importes: 0 };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// « Presque fini » (décision de Paul du 2026-10-10 : « tout doit être fait pour accélérer la création de modèles ; on priorise un
// modèle quasi fini ») : carte en tête de /admin et de « À valider » (/admin/sujets) quand une action proche de la publication attend
// la personne connectée. Léger : chaîne mémorisée par signature (lireChaine), sans automate ni tournoi (inutiles à ces étapes).
// ---------------------------------------------------------------------------------------------------------------

export type ActionPrioritaire = { modele: string; nom: string; action: string; titre: string; href: string; etape: number };
/** Actions « proches du catalogue » : ajouter au catalogue, pages modifiées, remarques, relecture finale, corrections techniques, test */
const ACTIONS_PROCHES = new Set<ProchaineAction['id']>(['valider', 'revalider', 'retouche', 'relire', 'corrections', 'tester']);

/** Action de chaîne la plus proche de la publication qui attend la personne connectée (null : rien de proche, hors équipe, erreur) */
export async function actionChainePrioritaire(profession: string): Promise<ActionPrioritaire | null> {
  try {
    const moi = await getEquipier();
    if (!moi) return null;
    const chaine = await lireChaine(profession, { versions: 'utiles' });
    if (chaine.erreurLecture || chaine.migrationManquante) return null;
    const fiches = chaine.fiches.filter((f) => f.profession === profession);
    const a = prochaineActionChaine({ role: moi.role, etat: { ...chaine, fiches } });
    if (!ACTIONS_PROCHES.has(a.id) || !a.bouton || !('href' in a.bouton)) return null;
    const id = a.bouton.href.split('#')[0].split('/').pop() ?? '';
    const f = fiches.find((x) => x.id === id);
    return f ? { modele: f.id, nom: f.nom, action: a.bouton.libelle, titre: a.titre, href: a.bouton.href, etape: a.etape } : null;
  } catch {
    return null;
  }
}
