import 'server-only';
import { duelDepuisLigne, type Duel } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Duels « A ou B ? » (migration 0037, packages/core/src/duels.ts) :
// - getDuels : journal complet (remarques comprises), lu par le super admin (/admin/retours/duel) ;
// - getDuelsApprentissage : duels_apprentissage() (ni auteur ni remarque) pour les poids du générateur (getPoidsAtelier), tout
//   compte connecté ; [] sans la migration.

export const MIGRATION_DUELS = 'Migration 0037 à exécuter (supabase/migrations/0037_duels.sql) : les duels ne peuvent pas encore être enregistrés en base.';

export type DuelAdmin = Duel & { remarque: string | null };

const COLONNES = 'type, scenario, a_cle, b_cle, a_ingredients, b_ingredients, dimension_differente, resultat, etiquettes, remarque, appareil, prediction, created_at';

export async function getDuels(): Promise<{ duels: DuelAdmin[]; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('duels').select(COLONNES).order('created_at', { ascending: false }).limit(5000);
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

export async function getDuelsApprentissage(): Promise<Duel[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('duels_apprentissage', { p_limite: 20000 });
    if (error || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map(duelDepuisLigne).filter((d): d is Duel => d !== null);
  } catch {
    return [];
  }
}
