import 'server-only';
import { cache } from 'react';
import { COLONNES_INGREDIENTS_LEGERS, duelDepuisLigne, duelsPourApprentissage, ligneDuelLegere, type Duel } from '@plateforme/core';
import { createClient, getUser } from '@/lib/supabase/server';
import { memoParSignature } from '@/lib/memo-journal';
import { getDuelsDegustation, professionDegustation } from '@/lib/degustation';
import { getExclusionsProfession } from '@/lib/professions-ingredients';

// Duels « A ou B ? » (migration 0037, packages/core/src/duels.ts) :
// - getDuels : journal complet (remarques comprises), lu par le super admin (/admin/retours/duel) ;
// - getDuelsApprentissage : duels_apprentissage() (ni auteur ni remarque) pour les poids du générateur (getPoidsAtelier), tout
//   compte connecté ; [] sans la migration. + duels équivalents des grilles de la Dégustation (0042, degustation.ts : même
//   moteur, même plafond, mêmes clés ; profession choisie + goût transversal).
// - Profession (migration 0051, colonne duels.profession) : chaque duel enregistre la profession de l'en-tête ; l'apprentissage
//   garde les duels de la profession choisie, plus ceux des autres sur les dimensions transversales et les éléments communs
//   (duelsPourApprentissage, comme la Dégustation). Sans la migration : lecture et écriture sans la colonne (tout est de la
//   profession par défaut, comportement d'avant).

export const MIGRATION_DUELS = 'Migration 0037 à exécuter (supabase/migrations/0037_duels.sql) : les duels ne peuvent pas encore être enregistrés en base.';

export type DuelAdmin = Duel & { remarque: string | null };

const COLONNES = 'type, scenario, a_cle, b_cle, a_ingredients, b_ingredients, dimension_differente, resultat, etiquettes, remarque, appareil, prediction, created_at';
/** Colonne absente (migration 0051 pas encore exécutée) : PostgREST 42703 / PGRST204 */
export const colonneProfessionAbsente = (e: { code?: string; message?: string } | null) => Boolean(e && (e.code === '42703' || e.code === 'PGRST204' || /profession/.test(e.message ?? '')));

async function getDuelsSansMemo(): Promise<{ duels: DuelAdmin[]; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const lire = (colonnes: string) => supabase.from('duels').select(colonnes).order('created_at', { ascending: false }).limit(5000) as unknown as Promise<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>;
    let { data, error } = await lire(`${COLONNES}, profession`);
    if (colonneProfessionAbsente(error)) ({ data, error } = await lire(COLONNES));
    if (error) return { duels: [], migrationManquante: true };
    const duels = ((data ?? []) as Record<string, unknown>[]).map((l) => {
      const d = duelDepuisLigne(l);
      return d ? { ...d, remarque: typeof l.remarque === 'string' ? l.remarque : null } : null;
    }).filter((d): d is DuelAdmin => d !== null);
    return { duels, migrationManquante: false };
  } catch {
    return { duels: [], migrationManquante: true };
  }
}
export const getDuels = cache(getDuelsSansMemo);

/**
 * Journal ALLÉGÉ (perf, 2026-10-09) : même résultat que historiqueDuelsAllege(getDuels().duels) — composition lue seulement pour
 * les duels de combinaisons d'éléments (dimension `paire:…`, matchsPaires) ; ailleurs, ingrédients sans composition
 * (COLONNES_INGREDIENTS_LEGERS, duels-historique.ts). Pour la Dégustation, le duel A/B et les éléments tranchés.
 */
async function getDuelsAllegesSansMemo(): Promise<{ duels: DuelAdmin[]; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const base = COLONNES.replace('a_ingredients, b_ingredients, ', '');
    type Reponse = Promise<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>;
    const lire = (avecProfession: boolean) => {
      const p = avecProfession ? ', profession' : '';
      return Promise.all([
        supabase.from('duels').select(`${base}, ${COLONNES_INGREDIENTS_LEGERS}${p}`).or('dimension_differente.is.null,dimension_differente.not.like.paire:*').order('created_at', { ascending: false }).limit(5000) as unknown as Reponse,
        supabase.from('duels').select(`${COLONNES}${p}`).like('dimension_differente', 'paire:*').order('created_at', { ascending: false }).limit(5000) as unknown as Reponse,
      ]);
    };
    let [a, b] = await lire(true);
    if (colonneProfessionAbsente(a.error) || colonneProfessionAbsente(b.error)) [a, b] = await lire(false);
    if (a.error || b.error) return { duels: [], migrationManquante: true };
    const lignes = [...((a.data ?? []) as Record<string, unknown>[]).map(ligneDuelLegere), ...((b.data ?? []) as Record<string, unknown>[])]
      .sort((x, y) => String(y.created_at ?? '').localeCompare(String(x.created_at ?? ''))).slice(0, 5000);
    const duels = lignes.map((l) => {
      const d = duelDepuisLigne(l);
      return d ? { ...d, remarque: typeof l.remarque === 'string' ? l.remarque : null } : null;
    }).filter((d): d is DuelAdmin => d !== null);
    return { duels, migrationManquante: false };
  } catch {
    return { duels: [], migrationManquante: true };
  }
}
// Mémorisé entre requêtes tant que la table `duels` ne change pas (memo-journal.ts, 2026-10-09)
export const getDuelsAlleges = cache(async () => memoParSignature('duels-alleges', (await getUser().catch(() => null))?.id, ['duels'], getDuelsAllegesSansMemo));

async function getDuelsApprentissageSansMemo(): Promise<Duel[]> {
  try {
    const supabase = await createClient();
    // Lecture d'apprentissage (≈ 6 Mo) mémorisée entre requêtes tant que la table `duels` ne change pas (memo-journal.ts)
    const lireRpc = async () => { const r = await supabase.rpc('duels_apprentissage', { p_limite: 20000 }); if (r.error) throw r.error; return r.data as unknown; };
    const utilisateur = (await getUser().catch(() => null))?.id;
    const [rpc, grilles, p] = await Promise.all([memoParSignature('duels-apprentissage', utilisateur, ['duels'], lireRpc).then((data) => ({ data, error: null }), (error) => ({ data: null, error })), getDuelsDegustation(), professionDegustation()]);
    const { data, error } = rpc;
    const tous = error || !Array.isArray(data) ? [] : (data as Record<string, unknown>[]).map(duelDepuisLigne).filter((d): d is Duel => d !== null);
    // Goût de la profession choisie + transversal (éléments d'une autre profession : seulement s'ils sont aussi pour elle)
    const horsProfession = tous.some((d) => (d.profession || p.parDefaut) !== p.id) ? new Set(await getExclusionsProfession(p.id).catch(() => [] as string[])) : new Set<string>();
    const duels = duelsPourApprentissage(tous, p.id, p.parDefaut, (cle) => !horsProfession.has(cle));
    return grilles.length ? [...duels, ...grilles] : duels;
  } catch {
    return [];
  }
}
export const getDuelsApprentissage = cache(getDuelsApprentissageSansMemo);
