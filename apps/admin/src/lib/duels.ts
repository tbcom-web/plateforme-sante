import 'server-only';
import { cache } from 'react';
import { duelDepuisLigne, type Duel } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getDuelsDegustation } from '@/lib/degustation';

// Duels « A ou B ? » (migration 0037, packages/core/src/duels.ts) :
// - getDuels : journal complet (remarques comprises), lu par le super admin (/admin/retours/duel) ;
// - getDuelsApprentissage : duels_apprentissage() (ni auteur ni remarque) pour les poids du générateur (getPoidsAtelier), tout
//   compte connecté ; [] sans la migration. + duels équivalents des grilles de la Dégustation (0042, degustation.ts : même
//   moteur, même plafond, mêmes clés ; profession choisie + goût transversal).

export const MIGRATION_DUELS = 'Migration 0037 à exécuter (supabase/migrations/0037_duels.sql) : les duels ne peuvent pas encore être enregistrés en base.';

export type DuelAdmin = Duel & { remarque: string | null };

const COLONNES = 'type, scenario, a_cle, b_cle, a_ingredients, b_ingredients, dimension_differente, resultat, etiquettes, remarque, appareil, prediction, created_at';

async function getDuelsSansMemo(): Promise<{ duels: DuelAdmin[]; migrationManquante: boolean }> {
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
export const getDuels = cache(getDuelsSansMemo);

async function getDuelsApprentissageSansMemo(): Promise<Duel[]> {
  try {
    const supabase = await createClient();
    const [{ data, error }, grilles] = await Promise.all([supabase.rpc('duels_apprentissage', { p_limite: 20000 }), getDuelsDegustation()]);
    const duels = error || !Array.isArray(data) ? [] : (data as Record<string, unknown>[]).map(duelDepuisLigne).filter((d): d is Duel => d !== null);
    return grilles.length ? [...duels, ...grilles] : duels;
  } catch {
    return [];
  }
}
export const getDuelsApprentissage = cache(getDuelsApprentissageSansMemo);
