import 'server-only';
import { cache } from 'react';
import { fusionnerRattachements, ingredientPourProfession, inventaireAssets, rattachementsDepuisHashtags, rattachementsDepuisLignes, type LigneProfessionIngredient, type Rattachements } from '@plateforme/core';
import { PROFESSION_PAR_DEFAUT } from '@plateforme/core/professions';
import { getPhotosDesJeux } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';
import { createClient } from '@/lib/supabase/server';

// Professions des ingrédients (migration 0046, packages/core/src/professions-ingredients.ts) : état courant lu par
// assets_professions_effectifs(), fusionné avec les hashtags « #profession-<id> » validés depuis les propositions de Claude.
// Sans la migration : défauts du code seuls (visuels → profession par défaut, palettes / polices / mises en page → commun) et
// migrationManquante (l'interface reste lisible, les boutons signalent la migration).

export const MIGRATION_PROFESSIONS = 'Migration 0046 à exécuter (supabase/migrations/0046_assets_professions.sql) : professions des ingrédients non enregistrées.';

async function getRattachementsSansMemo(): Promise<{ rattachements: Rattachements; migrationManquante: boolean }> {
  const { hashtags } = await getHashtagsAssets();
  const depuisHashtags = rattachementsDepuisHashtags(hashtags);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('assets_professions_effectifs');
    if (error || !Array.isArray(data)) return { rattachements: depuisHashtags, migrationManquante: true };
    return { rattachements: fusionnerRattachements(rattachementsDepuisLignes(data as LigneProfessionIngredient[]), depuisHashtags), migrationManquante: false };
  } catch {
    return { rattachements: depuisHashtags, migrationManquante: true };
  }
}
export const getRattachementsProfessions = cache(getRattachementsSansMemo);

/**
 * Générateur filtré par profession (kits, tirages, aperçus : registre ContexteImages) : clés des visuels qui ne sont PAS pour cette
 * profession (ni rattachés, ni communs), ajoutées aux exclusions. Profession par défaut : seuls les visuels rattachés ailleurs et
 * retirés de la podologie sont exclus (calcul léger, sans inventaire) ; autre profession : tout l'inventaire visuel est passé au
 * filtre (ingrédients de la profession + communs).
 */
export async function getExclusionsProfession(profession: string): Promise<string[]> {
  const { rattachements } = await getRattachementsProfessions();
  if (profession === PROFESSION_PAR_DEFAUT) return Object.keys(rattachements).filter((c) => !ingredientPourProfession(c, profession, rattachements));
  const photosJeux = await getPhotosDesJeux();
  return inventaireAssets({ photosJeux }).map((a) => a.cle).filter((c) => !ingredientPourProfession(c, profession, rattachements));
}
