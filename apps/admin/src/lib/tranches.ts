import 'server-only';
import { cache } from 'react';
import { fusionnerTranches, tranchesDepuisDuels, tranchesDepuisSignaux, type Reevaluation, type SignalTranche, type Tranches } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getNotesAssets } from '@/lib/assets-notes';
import { getNotesAtelier } from '@/lib/atelier';
import { getNotationsAdmin } from '@/lib/notation-recettes';
import { getDuels } from '@/lib/duels';

// Éléments tranchés (packages/core/src/tranches.ts, migration 0041) côté serveur, pour Paul :
// - getReevaluations : journal elements_reevalues (« Réévaluer ») ; [] sans la migration ;
// - getTranches : refusés (1 ★), favoris (5 ★ / « Garder ») et notés, réunis pour les éléments (assets_notes), les combinaisons de
//   l'atelier (clé de combinaison ET identifiant de proposition `prop:<id>`), les recettes complètes (compo:…) et les duels
//   « les deux sont mauvais » ; avec le détail (dernière note, date, type) pour la page « Éléments tranchés ».

export const MIGRATION_TRANCHES = 'Migration 0041 à exécuter (supabase/migrations/0041_elements_reevalues.sql) : « Réévaluer » ne peut pas encore être enregistré.';

export const getReevaluations = cache(async (): Promise<{ reevaluations: Reevaluation[]; migrationManquante: boolean }> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('elements_reevalues').select('cle, created_at').order('created_at', { ascending: false }).limit(5000);
    if (error) return { reevaluations: [], migrationManquante: true };
    return { reevaluations: ((data ?? []) as { cle: string; created_at: string }[]).map((l) => ({ cle: l.cle, le: l.created_at })), migrationManquante: false };
  } catch {
    return { reevaluations: [], migrationManquante: true };
  }
});

export type DetailTranche = { cle: string; etat: 'refuse' | 'favori'; famille: 'element' | 'combinaison' | 'recette' | 'duel'; note: number | null; le: string | null };

export const getTranches = cache(async (): Promise<{ tranches: Tranches; details: DetailTranche[]; signaux: SignalTranche[] }> => {
  const [{ reevaluations }, assets, atelier, recettes, duels] = await Promise.all([
    getReevaluations(), getNotesAssets().catch(() => ({ notes: [] })), getNotesAtelier().catch(() => ({ notes: [] })),
    getNotationsAdmin().catch(() => ({ notations: [] })), getDuels().catch(() => ({ duels: [] })),
  ]);
  const sAssets: SignalTranche[] = assets.notes.map((n) => ({ cle: n.cle, note: n.note, le: n.le ?? null }));
  const sAtelier: SignalTranche[] = atelier.notes.flatMap((n) => [
    { cle: n.cle, note: n.note, le: n.le ?? null },
    ...(n.ingredients?.proposition ? [{ cle: `prop:${n.ingredients.proposition}`, note: n.note, le: n.le ?? null }] : []),
  ]);
  const sRecettes: SignalTranche[] = recettes.notations.filter((n) => n.cle).map((n) => ({ cle: n.cle!, note: n.note, garder: n.garder, le: n.le ?? null }));
  const parts = {
    element: tranchesDepuisSignaux(sAssets, reevaluations),
    combinaison: tranchesDepuisSignaux(sAtelier, reevaluations),
    recette: tranchesDepuisSignaux(sRecettes, reevaluations),
    duel: tranchesDepuisDuels(duels.duels.map((d) => ({ aCle: d.aCle, bCle: d.bCle, resultat: d.resultat, le: d.le ?? null })), reevaluations),
  };
  const tranches = fusionnerTranches(...Object.values(parts));
  const tous = [...sAssets, ...sAtelier, ...sRecettes];
  const derniere = new Map<string, { note: number | null; le: string | null }>();
  for (const s of tous) { const d = derniere.get(s.cle); if (!d || (s.le ?? '') > (d.le ?? '')) derniere.set(s.cle, { note: s.note ?? null, le: s.le ?? null }); }
  const details: DetailTranche[] = [];
  for (const [famille, t] of Object.entries(parts) as [DetailTranche['famille'], Tranches][]) {
    for (const k of t.refuses) if (!details.some((x) => x.cle === k)) details.push({ cle: k, etat: 'refuse', famille, note: derniere.get(k)?.note ?? 1, le: derniere.get(k)?.le ?? null });
    for (const k of t.favoris) if (!tranches.refuses.has(k) && !details.some((x) => x.cle === k)) details.push({ cle: k, etat: 'favori', famille, note: derniere.get(k)?.note ?? 5, le: derniere.get(k)?.le ?? null });
  }
  details.sort((a, b) => ((b.le ?? '') < (a.le ?? '') ? -1 : 1));
  return { tranches, details, signaux: tous };
});

/** Forme sérialisable pour les composants clients */
export const tranchesEnListes = (t: Tranches) => ({ refuses: [...t.refuses], favoris: [...t.favoris], notes: [...t.notes] });
