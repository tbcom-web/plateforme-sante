import 'server-only';
import { suiviTests, testsALancer, versionsATester, type EtatChaine, type SuiviTest, type TestLance } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getEquipier } from '@/lib/chaine-modeles';
import { dispatcherTestModele } from '@/lib/tests-modeles';

// VÉRIFICATION AUTOMATIQUE (décision de Paul du 2026-10-11 : « le test se lance automatiquement », autorisé pour le workflow
// tester-modele SEULEMENT, qui ne publie rien). Appelée par l'automate de la chaîne (faireTournerChaine) à chaque chargement et après
// « Garder » : les versions en vérification sans résultat sont lancées (core : testsALancer), 3 en parallèle au plus, jamais deux
// fois la même version. Verrou : ligne de modeles_tests_lances (0064, clé unique modele × version × essai) écrite AVANT le lancement ;
// un lancement refusé par GitHub y est noté (`echec`) et peut être refait (2 essais automatiques au plus, puis « bloqué » : relance
// à la main depuis la fiche). Sans 0064 : lancements gardés en mémoire de l'instance. Passages en cours sur GitHub (titre du run
// « tester-modele <modèle> v<version> … ») comptés aussi : un test lancé à la main ou par une autre instance n'est pas relancé.
// Aucun autre workflow n'est jamais lancé ici.

export type EtatLancements = {
  /** Lancements connus des versions à tester */
  lances: TestLance[];
  suivi: SuiviTest[];
  /** Lancement automatique possible (jeton et dépôt GitHub configurés) */
  configure: boolean;
  /** Table 0064 absente (lancements gardés en mémoire de l'instance) */
  migration: boolean;
  /** Lancés à l'instant */
  nouveaux: number;
};

const tableAbsente = (e: { code?: string; message?: string } | null | undefined) =>
  Boolean(e && (e.code === '42P01' || e.code === 'PGRST205' || /relation .* does not exist|Could not find the table/i.test(e.message ?? '')));

/** Lancements gardés en mémoire (sans la migration 0064, ou base injoignable) : par instance */
const memoire: TestLance[] = [];
/** Banc mobile seulement (scripts/perf-admin/mobile.mjs) : lancement SIMULÉ, aucun appel à GitHub ; jamais avec un vrai jeton */
const simule = () => process.env.CHAINE_TESTEUR_SIMULE === '1' && !process.env.GITHUB_TOKEN;
const configure = () => Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) || simule();

/** Passages du workflow en file ou en cours sur GitHub (titre « tester-modele <modèle> v<version> … »), gardés 30 s */
let memoRuns: { le: number; runs: { modele: string; version: number }[] } | null = null;
async function passagesEnCours(): Promise<{ modele: string; version: number }[]> {
  if (!configure() || simule()) return [];
  if (memoRuns && Date.now() - memoRuns.le < 30_000) return memoRuns.runs;
  const runs: { modele: string; version: number }[] = [];
  try {
    const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/actions/workflows/tester-modele.yml/runs?per_page=30`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store', signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const d = (await r.json()) as { workflow_runs?: { status?: string; display_title?: string; name?: string }[] };
      for (const x of d.workflow_runs ?? []) {
        if (!['queued', 'in_progress', 'waiting', 'requested', 'pending'].includes(String(x.status))) continue;
        const m = /tester-modele\s+([A-Za-z0-9_-]{1,80})\s+v(\d{1,4})/.exec(String(x.display_title ?? x.name ?? ''));
        if (m) runs.push({ modele: m[1], version: Number(m[2]) });
      }
    }
  } catch { /* liste illisible : seuls les lancements enregistrés comptent */ }
  memoRuns = { le: Date.now(), runs };
  return runs;
}

/** Lancements enregistrés des modèles donnés (0064), sinon ceux de la mémoire de l'instance */
async function lireLances(supabase: Awaited<ReturnType<typeof createClient>>, modeles: readonly string[]): Promise<{ lances: TestLance[]; migration: boolean }> {
  if (!modeles.length) return { lances: [], migration: false };
  try {
    const { data, error } = await supabase.from('modeles_tests_lances').select('modele, version, essai, echec, created_at').in('modele', [...modeles]).order('created_at', { ascending: true }).limit(500);
    if (error) return { lances: memoire.filter((l) => modeles.includes(l.modele)), migration: tableAbsente(error) };
    return { lances: (data ?? []).map((l) => ({ modele: String(l.modele), version: Number(l.version), essai: Number(l.essai), le: String(l.created_at), echec: l.echec == null ? null : String(l.echec) })), migration: false };
  } catch {
    return { lances: memoire.filter((l) => modeles.includes(l.modele)), migration: false };
  }
}

/** Suivi des tests (pastilles « vérification en cours / bloquée ») sans rien lancer */
export async function etatLancements(chaine: Pick<EtatChaine, 'fiches' | 'versions' | 'revues' | 'tickets'>): Promise<Omit<EtatLancements, 'nouveaux'>> {
  const ids = versionsATester(chaine).map((f) => f.id);
  if (!ids.length) return { lances: [], suivi: [], configure: configure(), migration: false };
  const supabase = await createClient();
  const [{ lances, migration }, externes] = await Promise.all([lireLances(supabase, ids), passagesEnCours()]);
  return { lances, suivi: suiviTests(chaine, lances, Date.now(), externes), configure: configure(), migration };
}

/**
 * Lance les tests des versions en vérification qui n'en ont pas (au plus CHAINE.testsParalleles en même temps). Jamais d'exception :
 * un refus (verrou déjà pris par une autre page, GitHub indisponible) laisse la version pour le chargement suivant.
 */
export async function lancerTestsAutomatiques(chaine: Pick<EtatChaine, 'fiches' | 'versions' | 'revues' | 'tickets'>): Promise<EtatLancements> {
  const vide: EtatLancements = { lances: [], suivi: [], configure: configure(), migration: false, nouveaux: 0 };
  try {
    const ids = versionsATester(chaine).map((f) => f.id);
    if (!ids.length) return vide;
    const supabase = await createClient();
    const [{ lances, migration }, externes] = await Promise.all([lireLances(supabase, ids), passagesEnCours()]);
    const etat = { lances, configure: configure(), migration };
    if (!etat.configure || !(await getEquipier())) return { ...etat, suivi: suiviTests(chaine, lances, Date.now(), externes), nouveaux: 0 };
    let nouveaux = 0;
    const tous = [...lances];
    for (const t of testsALancer(chaine, lances, Date.now(), externes)) {
      const le = new Date().toISOString();
      // Verrou AVANT le lancement : une autre page qui lance le même essai reçoit un refus (23505) et passe son tour
      let id: string | null = null;
      if (!migration) {
        const { data, error } = await supabase.from('modeles_tests_lances').insert({ modele: t.modele, version: t.version, essai: t.essai, mode: t.mode }).select('id').maybeSingle();
        if (error && !tableAbsente(error)) continue;
        id = (data?.id as string | undefined) ?? null;
      }
      if (migration || !id) {
        if (memoire.some((l) => l.modele === t.modele && l.version === t.version && l.essai === t.essai)) continue;
        memoire.push({ modele: t.modele, version: t.version, essai: t.essai, le });
        if (memoire.length > 200) memoire.splice(0, memoire.length - 200);
      }
      const r = simule() ? { ok: true, message: 'lancement simulé (banc)' } : await dispatcherTestModele(t.modele, t.version, t.mode, t.jeux);
      if (r.ok) nouveaux++;
      else {
        const echec = r.message.slice(0, 300);
        if (id) await supabase.from('modeles_tests_lances').update({ echec }).eq('id', id);
        const m = memoire.find((l) => l.modele === t.modele && l.version === t.version && l.essai === t.essai);
        if (m) m.echec = echec;
        console.warn(`[chaine] test automatique de ${t.modele} v${t.version} non lancé : ${echec}`);
      }
      tous.push({ modele: t.modele, version: t.version, essai: t.essai, le, echec: r.ok ? null : r.message.slice(0, 300) });
    }
    if (nouveaux) memoRuns = null;
    return { ...etat, lances: tous, suivi: suiviTests(chaine, tous, Date.now(), externes), nouveaux };
  } catch (e) {
    console.warn(`[chaine] lancement automatique des tests en erreur : ${(e as Error)?.message ?? e}`);
    return vide;
  }
}

/** Lancement à la main (bouton de la fiche) : noté comme un essai de plus, pour que l'automate ne le refasse pas */
export async function noterLancementManuel(modele: string, version: number, mode: 'check' | 'recheck'): Promise<void> {
  try {
    const supabase = await createClient();
    const { lances, migration } = await lireLances(supabase, [modele]);
    const essai = Math.min(9, lances.filter((l) => l.modele === modele && l.version === version).reduce((m, l) => Math.max(m, l.essai), 0) + 1);
    if (migration) { memoire.push({ modele, version, essai, le: new Date().toISOString() }); return; }
    await supabase.from('modeles_tests_lances').insert({ modele, version, essai, mode });
  } catch { /* simple note : le résultat du test fera foi */ }
}

