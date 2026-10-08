import 'server-only';
import { cache } from 'react';
import {
  modeleIntegre, normaliserComposition, notationDepuisLigne, sujetsDuScenario, type NotationRecette, type ScenarioRecette,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { lireAssetsNotesApprentissage } from '@/lib/assets-notes';

// Notation des recettes complètes (migration 0038, packages/core/src/notation-recettes.ts) :
// - getNotationsApprentissage : recettes_notation_apprentissage() (ni auteur ni texte libre), pour l'apprentissage EN DIRECT
//   (getPoidsAtelier, palmarès) ; [] sans la migration ;
// - getNotationsAdmin : journal complet (textes Pour / Contre compris), super admin, tuile /admin/retours/recettes ;
// - getLignesAssetsApprentissage : notes et statuts des assets (assets_notes_apprentissage) pour les ingrédients refusés
//   (retirés, à retravailler, ≤ 2 ★) et « à valider » (statut à revoir) du générateur.

export const MIGRATION_NOTATION = 'Migration 0038 à exécuter (supabase/migrations/0038_recettes_notation.sql) : les notes de recettes complètes restent dans ce navigateur.';

const normaliser = (brut: unknown, s: ScenarioRecette) => {
  const sujets = sujetsDuScenario(s);
  return normaliserComposition(brut, { sujets, principaux: s.principaux.length, couleursPreferees: s.couleurs, modele: modeleIntegre });
};

export const getNotationsApprentissage = cache(async (): Promise<NotationRecette[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('recettes_notation_apprentissage', { p_limite: 5000 });
    if (error || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map((l) => notationDepuisLigne(l, normaliser)).filter((n): n is NotationRecette => n !== null);
  } catch {
    return [];
  }
});

export type NotationAdmin = NotationRecette & { pourTexte: string | null; contreTexte: string | null; sourceId: string | null };

async function getNotationsAdminSansMemo(): Promise<{ notations: NotationAdmin[]; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('recettes_notation')
      .select('cle, source, source_id, scenario, composition, note, garder, etiquettes_pour, etiquettes_contre, pour, contre, appareil, recette, created_at')
      .order('created_at', { ascending: false }).limit(2000);
    if (error) return { notations: [], migrationManquante: true };
    const notations = ((data ?? []) as Record<string, unknown>[]).flatMap((l) => {
      const n = notationDepuisLigne(l, normaliser);
      return n ? [{ ...n, pourTexte: typeof l.pour === 'string' ? l.pour : null, contreTexte: typeof l.contre === 'string' ? l.contre : null, sourceId: typeof l.source_id === 'string' ? l.source_id : null }] : [];
    });
    return { notations, migrationManquante: false };
  } catch {
    return { notations: [], migrationManquante: true };
  }
}
export const getNotationsAdmin = cache(getNotationsAdminSansMemo);

async function getLignesAssetsApprentissageSansMemo(): Promise<{ cle: string; note: number | null; statut: string | null }[]> {
  try {
    const { data, error } = await lireAssetsNotesApprentissage();
    if (error || !Array.isArray(data)) return [];
    return (data as { cle_asset: string; note: number | null; statut: string | null }[]).map((l) => ({ cle: l.cle_asset, note: l.note, statut: l.statut }));
  } catch {
    return [];
  }
}
export const getLignesAssetsApprentissage = cache(getLignesAssetsApprentissageSansMemo);
