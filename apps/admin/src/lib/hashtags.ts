import 'server-only';
import { hashtagsDepuisLignes, type HashtagsAssets } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Hashtags des visuels (migration 0029, packages/core/src/hashtags.ts) : état courant lu par assets_hashtags_effectifs()
// (dernière action par clé et hashtag, sans auteur). Sans la migration : {} et migrationManquante (l'interface reste utilisable).

export const MIGRATION_HASHTAGS = 'Migration 0029 à exécuter (supabase/migrations/0029_assets_hashtags.sql) : hashtags non enregistrés.';

export async function getHashtagsAssets(): Promise<{ hashtags: HashtagsAssets; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('assets_hashtags_effectifs');
    if (error || !Array.isArray(data)) return { hashtags: {}, migrationManquante: true };
    return {
      hashtags: hashtagsDepuisLignes((data as { cle_asset: string; hashtag: string; action: string }[]).map((l) => ({ cle: l.cle_asset, hashtag: l.hashtag, action: l.action }))),
      migrationManquante: false,
    };
  } catch {
    return { hashtags: {}, migrationManquante: true };
  }
}
