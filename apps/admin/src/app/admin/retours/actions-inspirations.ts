'use server';

import { revalidatePath } from 'next/cache';
import { validerInspiration, type InspirationSaisie } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { BUCKET_INSPIRATIONS, type Inspiration } from '@/lib/inspirations';
import { createClient, getUser } from '@/lib/supabase/server';

export type ResultatInspiration = { ok: boolean; message: string; inspiration?: Inspiration; migrationManquante?: boolean };

const CHEMIN = /^[0-9a-f-]{36}\.webp$/;

/**
 * Enregistre une inspiration : l'image a été envoyée par le navigateur dans le bucket PRIVÉ « inspirations » (WebP réduit,
 * palette extraite) ; ici, les métadonnées sont contrôlées puis ajoutées à la table (migration 0028). Admin seulement.
 */
export async function enregistrerInspiration(chemin: string, saisie: Partial<InspirationSaisie>, dimensions: { largeur: number; hauteur: number }): Promise<ResultatInspiration> {
  await exigerAdmin();
  if (typeof chemin !== 'string' || !CHEMIN.test(chemin)) return { ok: false, message: 'Image invalide.' };
  const { inspiration, erreurs } = validerInspiration(saisie ?? {});
  if (!inspiration) return { ok: false, message: erreurs.join(' ') };
  const dim = (v: unknown) => (Number.isInteger(v) && Number(v) > 0 && Number(v) <= 10000 ? Number(v) : null);
  const user = await getUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inspirations')
    .insert({
      chemin, lien: inspiration.lien, etiquettes: inspiration.etiquettes, objectif: inspiration.objectif, sujet: inspiration.sujet,
      type_element: inspiration.typeElement, palette: inspiration.palette, largeur: dim(dimensions?.largeur), hauteur: dim(dimensions?.hauteur), auteur: user?.id ?? null,
    })
    .select('id, created_at')
    .maybeSingle();
  if (error || !data) {
    // Image orpheline (envoyée à l'instant par cette même saisie) : retirée du bucket privé
    await supabase.storage.from(BUCKET_INSPIRATIONS).remove([chemin]).catch(() => null);
    return { ok: false, message: 'Enregistrement impossible : migration 0028 à exécuter (supabase/migrations/0028_inspirations_photos_libres.sql).', migrationManquante: true };
  }
  const { data: s } = await supabase.storage.from(BUCKET_INSPIRATIONS).createSignedUrl(chemin, 3600);
  revalidatePath('/admin/retours');
  return {
    ok: true,
    message: 'Inspiration enregistrée.',
    inspiration: { id: data.id, chemin, image: s?.signedUrl ?? null, lien: inspiration.lien, etiquettes: inspiration.etiquettes, objectif: inspiration.objectif, sujet: inspiration.sujet, typeElement: inspiration.typeElement, palette: inspiration.palette, le: data.created_at },
  };
}
