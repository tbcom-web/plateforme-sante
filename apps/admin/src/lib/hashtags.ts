import 'server-only';
import { cache } from 'react';
import { HASHTAGS_PAR_DEFAUT, hashtagsDepuisLignes, type HashtagsAssets } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Hashtags des visuels (migration 0029, packages/core/src/hashtags.ts) : état courant lu par assets_hashtags_effectifs()
// (dernière action par clé et hashtag, sans auteur), par-dessus les hashtags par défaut du code (kits.ts : kit Sports…).
// Sans la migration : les défauts seuls et migrationManquante (l'interface reste utilisable).

export const MIGRATION_HASHTAGS = 'Migration 0029 à exécuter (supabase/migrations/0029_assets_hashtags.sql) : hashtags non enregistrés.';

async function getHashtagsAssetsSansMemo(): Promise<{ hashtags: HashtagsAssets; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('assets_hashtags_effectifs');
    if (error || !Array.isArray(data)) return { hashtags: hashtagsDepuisLignes([], HASHTAGS_PAR_DEFAUT), migrationManquante: true };
    return {
      hashtags: hashtagsDepuisLignes((data as { cle_asset: string; hashtag: string; action: string }[]).map((l) => ({ cle: l.cle_asset, hashtag: l.hashtag, action: l.action })), HASHTAGS_PAR_DEFAUT),
      migrationManquante: false,
    };
  } catch {
    return { hashtags: hashtagsDepuisLignes([], HASHTAGS_PAR_DEFAUT), migrationManquante: true };
  }
}
export const getHashtagsAssets = cache(getHashtagsAssetsSansMemo);
