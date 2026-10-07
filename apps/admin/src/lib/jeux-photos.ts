import 'server-only';
import { choisirJeuPhotos, jeuPhotosDepuisLigne, type JeuPhotos } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getPoidsAssets } from '@/lib/assets-notes';

// Jeux de photos côté serveur (table jeux_photos, migration 0016) : lecture, tirage, affectation.

type Client = Awaited<ReturnType<typeof createClient>>;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const COLONNES_JEU = 'id, nom, specialite, photos, source, site_id, actif';

/** Préfixe des URLs publiques du stockage « photos » du projet */
export const PREFIXE_STOCKAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`;

/** Un jeu par son id (RLS : un praticien ne lit que les jeux partagés et ceux de ses sites) */
export async function lireJeuPhotos(id: string, supabase?: Client): Promise<JeuPhotos | null> {
  if (!UUID.test(id)) return null;
  const client = supabase ?? (await createClient());
  const { data } = await client.from('jeux_photos').select(COLONNES_JEU).eq('id', id).maybeSingle();
  return data ? jeuPhotosDepuisLigne(data) : null;
}

/** Tirage au hasard parmi les jeux partagés actifs de la spécialité ('' si aucun), pondéré par les notes des photos (0027) */
export async function tirerJeuPhotos(specialite: string, supabase?: Client): Promise<string> {
  const client = supabase ?? (await createClient());
  const { data } = await client
    .from('jeux_photos')
    .select(COLONNES_JEU)
    .is('site_id', null)
    .eq('actif', true)
    .eq('specialite', specialite);
  const jeux = (data ?? []).map(jeuPhotosDepuisLigne);
  return choisirJeuPhotos(jeux, specialite, Math.random, jeux.length > 1 ? await getPoidsAssets() : null);
}

/**
 * Jeu de photos à enregistrer dans le brouillon (enregistrerSite). La valeur envoyée par le formulaire est
 * toujours ignorée : le praticien ne choisit pas son jeu.
 * - spécialité principale inchangée : le jeu déjà affecté est conservé ;
 * - création du site ou nouvelle spécialité : nouveau tirage, sauf jeu exclusif du site (photos premium),
 *   qui reste affecté quelle que soit la spécialité.
 */
export async function jeuPhotosAEnregistrer(
  supabase: Client,
  siteId: string | null,
  ancien: { specialite: string; jeuPhotos: string } | null,
  specialite: string,
): Promise<string> {
  if (ancien && ancien.specialite === specialite) return ancien.jeuPhotos;
  if (ancien?.jeuPhotos && siteId && UUID.test(ancien.jeuPhotos)) {
    const { data } = await supabase.from('jeux_photos').select('site_id').eq('id', ancien.jeuPhotos).maybeSingle();
    if (data?.site_id === siteId) return ancien.jeuPhotos;
  }
  return tirerJeuPhotos(specialite, supabase);
}
