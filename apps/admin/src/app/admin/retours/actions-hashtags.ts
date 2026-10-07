'use server';

import { revalidatePath } from 'next/cache';
import { estCleAsset, normaliserHashtag, type HashtagsAssets } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getHashtagsAssets, MIGRATION_HASHTAGS } from '@/lib/hashtags';
import { createClient, getUser } from '@/lib/supabase/server';

/**
 * Ajoute (+) ou retire (×) un hashtag d'un visuel (migration 0029, journal en ajout seul ; état courant = dernière action).
 * Le hashtag est normalisé côté serveur (« #Trail » → « trail »).
 */
export async function basculerHashtagAsset(cle: string, hashtag: string, action: 'ajout' | 'retrait'): Promise<{ ok: boolean; message: string; hashtag?: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  const h = normaliserHashtag(hashtag);
  if (!estCleAsset(cle) || !h || (action !== 'ajout' && action !== 'retrait')) return { ok: false, message: 'Hashtag invalide : 2 à 30 caractères, lettres, chiffres et tirets.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('assets_hashtags').insert({ cle_asset: cle, hashtag: h, action, auteur: user?.id ?? null });
  if (error) return { ok: false, message: MIGRATION_HASHTAGS, migrationManquante: true };
  revalidatePath('/admin/illustrations');
  revalidatePath('/admin/photos');
  return { ok: true, message: action === 'ajout' ? `#${h} ajouté.` : `#${h} retiré.`, hashtag: h };
}

/** État courant des hashtags (bibliothèque : chargé après l'affichage) ; migrationManquante sans la migration 0029 */
export async function lireHashtagsAssets(): Promise<{ hashtags: HashtagsAssets; migrationManquante: boolean }> {
  await exigerAdmin();
  return getHashtagsAssets();
}
