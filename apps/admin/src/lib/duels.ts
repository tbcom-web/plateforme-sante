import 'server-only';
import { cache } from 'react';
import { duelDepuisLigne, duelsPourApprentissage, type Duel } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
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

async function getDuelsApprentissageSansMemo(): Promise<Duel[]> {
  try {
    const supabase = await createClient();
    const [{ data, error }, grilles, p] = await Promise.all([supabase.rpc('duels_apprentissage', { p_limite: 20000 }), getDuelsDegustation(), professionDegustation()]);
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
