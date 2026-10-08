import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { publicationDepuisLigne, recetteDepuisLigne, tableVisuelsActivites, type ContexteVerification, type PublicationRecette, type Recette, type VisuelsActivite } from '@plateforme/core';
import { COOKIE_PROFESSION, professionDe } from '@plateforme/core/professions';
import { createClient } from '@/lib/supabase/server';
import { getRevuesIllustrations } from '@/lib/illustrations';
import { getDonneesKits, getDonneesVisuels } from '@/lib/kits-images';

// Profils de pratique et publication des recettes côté serveur (migration 0043, packages/core/src/profils.ts,
// publication-recettes.ts) :
// - professionAdmin : profession choisie dans l'en-tête de l'admin (cookie du registre professions.ts), sinon celle par défaut ;
// - getPublications : toutes les publications (super admin) ; `migrationManquante` sans la table ;
// - getRecettesPubliees : recettes_publiees(p_profession) pour le parcours /creer (praticiens, sessions anonymes de l'essai) ;
// - getContexteVerification : statuts de revue, ingrédients validés, éléments exclus (vérification avant publication).

export const MIGRATION_PUBLICATIONS = 'Migration 0043 à exécuter (supabase/migrations/0043_recettes_publications.sql) : la publication des recettes n’est pas encore possible.';

export const professionAdmin = cache(async () => {
  let id: string | null = null;
  try { id = (await cookies()).get(COOKIE_PROFESSION)?.value ?? null; } catch { id = null; }
  return professionDe(id);
});

export const getPublications = cache(async (): Promise<{ publications: PublicationRecette[]; migrationManquante: boolean }> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('recettes_publications').select('recette, profession, profils, ordre, publiee, publiee_le').limit(2000);
    if (error) return { publications: [], migrationManquante: true };
    return { publications: (data ?? []).map((l) => publicationDepuisLigne(l as Record<string, unknown>)).filter((p): p is PublicationRecette => Boolean(p)), migrationManquante: false };
  } catch {
    return { publications: [], migrationManquante: true };
  }
});

/** Recettes publiées d'une profession et leurs publications (parcours) ; vides sans la migration */
export const getRecettesPubliees = cache(async (profession: string | null): Promise<{ recettes: Recette[]; publications: PublicationRecette[] }> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('recettes_publiees', { p_profession: profession });
    if (error || !Array.isArray(data)) return { recettes: [], publications: [] };
    const lignes = data as Record<string, unknown>[];
    return {
      recettes: lignes.map((l) => recetteDepuisLigne(l)).filter((r): r is Recette => Boolean(r)),
      publications: lignes.map((l) => publicationDepuisLigne({ ...l, recette: l.id, publiee: true })).filter((p): p is PublicationRecette => Boolean(p)),
    };
  } catch {
    return { recettes: [], publications: [] };
  }
});

/** Contexte de la vérification avant publication : statuts de revue, ingrédients « à valider » validés, éléments exclus */
export const getContexteVerification = cache(async (): Promise<ContexteVerification & { statuts: Record<string, string> }> => {
  const [revues, kits] = await Promise.all([getRevuesIllustrations().catch(() => ({ statuts: [] as { cle: string; statut: string }[] })), getDonneesKits().catch(() => null)]);
  const statuts = Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut]));
  return { statuts, valides: new Set(revues.statuts.filter((s) => s.statut === 'valide').map((s) => s.cle)), exclues: kits?.exclues ?? new Set() };
});

/**
 * Visuels VALIDÉS de chaque activité (« thème|activité » → photos, illustration, icône ; repli sur le thème) pour le parcours
 * /creer et l'enregistrement du site ; table vide si les données ne sont pas lisibles.
 */
export const getVisuelsActivites = cache(async (profession: string | null): Promise<Record<string, VisuelsActivite>> => {
  try {
    const [photos, visuels] = await Promise.all([getDonneesKits(), getDonneesVisuels()]);
    return tableVisuelsActivites(profession, { photos, visuels });
  } catch {
    return {};
  }
});
