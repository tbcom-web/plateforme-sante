import 'server-only';
import { estCleAsset, photosDuJeu, poidsAssets, jeuPhotosDepuisLigne, type LigneAppriseAsset, type PhotoDeJeu, type PoidsAssets } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Notes des assets (migration 0027) : journal lu par le super admin (/admin/retours, /admin/illustrations), poids appris
// (assets_notes_apprentissage : clé, note, étiquettes, statuts — ni commentaire ni auteur) pour tout compte connecté.

export type NoteAssetAdmin = { id: string; cle: string; note: number; etiquettes: string[]; commentaire: string | null; empreinte: string | null; le: string };

type Ligne = { id: string; cle_asset: string; note: number; etiquettes: string[] | null; commentaire: string | null; empreinte: string | null; created_at: string };

/** Journal des notes (plus récentes d'abord) ; `migrationManquante` : table absente (migration 0027 pas encore exécutée) */
export async function getNotesAssets(): Promise<{ notes: NoteAssetAdmin[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assets_notes')
    .select('id, cle_asset, note, etiquettes, commentaire, empreinte, created_at')
    .order('created_at', { ascending: false })
    .limit(20000);
  if (error) return { notes: [], migrationManquante: true };
  return {
    notes: ((data ?? []) as Ligne[]).map((l) => ({ id: l.id, cle: l.cle_asset, note: l.note, etiquettes: l.etiquettes ?? [], commentaire: l.commentaire, empreinte: l.empreinte, le: l.created_at })),
    migrationManquante: false,
  };
}

/** Poids appris des assets ; null sans notes ni statut, ou si la migration 0027 manque (aucune erreur) */
export async function getPoidsAssets(): Promise<PoidsAssets | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('assets_notes_apprentissage', { p_limite: 20000 });
    if (error || !Array.isArray(data)) return null;
    return poidsAssets((data as { cle_asset: string; note: number | null; etiquettes: string[] | null; statut: string | null }[])
      .map((l): LigneAppriseAsset => ({ cle: l.cle_asset, note: l.note, etiquettes: l.etiquettes, statut: l.statut })));
  } catch {
    return null;
  }
}

/** Photos des jeux de photos (stockage) à ajouter à l'inventaire : URL, nom du jeu, spécialité */
export async function getPhotosDesJeux(): Promise<PhotoDeJeu[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('jeux_photos').select('id, nom, specialite, photos, source, site_id, actif').order('nom');
  if (error || !data) return [];
  return data.map(jeuPhotosDepuisLigne).flatMap((j) => photosDuJeu(j.photos).filter((u) => !u.startsWith('/photos/')).map((url) => ({ url, jeu: j.nom, specialite: j.specialite })));
}

export const cleAssetValide = (cle: unknown): cle is string => estCleAsset(cle);
