import 'server-only';
import {
  appareilDe, estPageStructure, modeleIntegre, normaliserComposition, photosIntegreesBanque, recetteDepuisLigne, retourMobileDepuisLigne, sujetsDeSpecialite, SUJETS_VISUELS,
  type ModeleManifeste, type NoteRecette, type PhotoBanque, type Recette, type RetourMobile,
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

/** Notes PAR PAGE des recettes actives (fonction recettes_notes_apprentissage, 0034 : ni auteur ni remarques) ; [] sans la migration */
export async function getNotesPagesLecture(): Promise<NoteRecette[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('recettes_notes_apprentissage', { p_limite: 5000 });
    if (error || !Array.isArray(data)) return [];
    return (data as { recette: string; page: string | null; appareil: string | null; note: number; etiquettes: string[] | null; composition: unknown; sujets: string[] | null }[]).flatMap((l) => {
      const sujets = (l.sujets ?? []).filter((x) => typeof x === 'string');
      const composition = normaliserComposition(l.composition, { sujets, principaux: Math.min(3, sujets.length) });
      return composition && estPageStructure(l.page) ? [{ recette: l.recette, page: l.page, appareil: appareilDe(l.appareil), note: l.note, etiquettes: l.etiquettes ?? [], composition, sujets }] : [];
    });
  } catch {
    return [];
  }
}

/** Notes par page d'une recette (studio : notes déjà données, onglets) ; [] sans la migration 0034 */
export async function getNotesPagesRecette(recette: string): Promise<{ page: string; note: number; appareil: string; le: string }[]> {
  if (!/^[0-9a-f-]{36}$/.test(recette)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('recettes_notes').select('page, note, appareil, created_at').eq('recette', recette).not('page', 'is', null).order('created_at', { ascending: false }).limit(200);
  if (error || !Array.isArray(data)) return [];
  return (data as { page: string; note: number; appareil: string; created_at: string }[]).map((l) => ({ page: l.page, note: l.note, appareil: l.appareil, le: l.created_at }));
}

/**
 * Retours « Rendu mobile » (table defauts_mobile, 0034), super admin : liste de corrections de /admin/retours ;
 * `migrationManquante` : table absente.
 */
export async function getRetoursMobile(): Promise<{ retours: RetourMobile[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('defauts_mobile').select('id, cle, page, verdict, note, etiquettes, remarque, zones, empreinte, statut, created_at').order('created_at', { ascending: false }).limit(2000);
  if (error) return { retours: [], migrationManquante: true };
  return { retours: (data ?? []).map((l) => retourMobileDepuisLigne(l as Record<string, unknown>)).filter((r): r is RetourMobile => Boolean(r)), migrationManquante: false };
}

/** Clés dont l'adaptation mobile est à corriger (defauts_mobile_ouverts, 0034) : parcours des praticiens ; [] sans la migration */
export async function getDefautsMobileOuverts(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('defauts_mobile_ouverts');
    if (error || !Array.isArray(data)) return [];
    return (data as { cle: string }[]).map((l) => l.cle).filter((k) => typeof k === 'string');
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
