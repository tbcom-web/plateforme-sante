import 'server-only';
import {
  modeleIntegre, photosIntegreesBanque, recetteDepuisLigne, sujetsDeSpecialite, SUJETS_VISUELS,
  type ModeleManifeste, type PhotoBanque, type Recette,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getPhotosDesJeux } from '@/lib/assets-notes';

// Recettes du studio côté serveur (migration 0032) :
// - getRecettes : toutes les recettes (super admin, /admin/atelier/studio), avec remarques ;
// - getRecettesLecture : recettes actives notées (fonction recettes_lecture : sans auteur ni remarques), pour le parcours /creer
//   et l'apprentissage (renforts des ingrédients) ;
// - getPhotosBanque : photos utilisables par les tirages (jeux de photos partagés, photos libres importées et validées, photos
//   intégrées), avec leurs sujets.

export const COLONNES_RECETTE = 'id, nom, sujets, couleurs_preferees, composition, note, etiquettes, positif, negatif, statut, created_at, updated_at';

/** Recettes (plus récentes d'abord) ; `migrationManquante` : table absente (0032 pas encore exécutée) */
export async function getRecettes(modele?: (id: string) => ModeleManifeste): Promise<{ recettes: Recette[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('recettes').select(COLONNES_RECETTE).order('updated_at', { ascending: false }).limit(1000);
  if (error) return { recettes: [], migrationManquante: true };
  return { recettes: (data ?? []).map((l) => recetteDepuisLigne(l as Record<string, unknown>, modele ?? modeleIntegre)).filter((r): r is Recette => Boolean(r)), migrationManquante: false };
}

/** Recettes actives notées au moins `noteMin` (parcours, apprentissage) ; [] sans la migration */
export async function getRecettesLecture(noteMin = 4): Promise<Recette[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('recettes_lecture', { p_note_min: noteMin });
    if (error || !Array.isArray(data)) return [];
    return data.map((l) => recetteDepuisLigne(l as Record<string, unknown>)).filter((r): r is Recette => Boolean(r));
  } catch {
    return [];
  }
}

/** Photos de la banque pour les tirages : jeux partagés, photos libres importées et validées, photos intégrées */
export async function getPhotosBanque(): Promise<PhotoBanque[]> {
  const photos = await getPhotosDesJeux().catch(() => []);
  const banque: PhotoBanque[] = photos
    .filter((p) => !/à valider/.test(p.jeu))
    .map((p) => {
      const sujet = 'sujet' in p && typeof p.sujet === 'string' && SUJETS_VISUELS.some((s) => s.id === p.sujet) ? [p.sujet] : null;
      const sujets = sujet ?? (p.specialite === 'generale' ? ['general'] : sujetsDeSpecialite(p.specialite));
      return { url: p.url, sujets, origine: p.jeu.startsWith('Banque libre') ? 'libre' as const : 'jeu' as const };
    });
  return [...banque, ...photosIntegreesBanque()];
}
