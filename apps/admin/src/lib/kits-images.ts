import 'server-only';
import { cache } from 'react';
import {
  clesImagesExclues, kitsCompacts, kitsGardes, notesPhotos, soinsParDefautScenario, SUJETS_KITS,
  type DonneesKits, type KitCompact, type NoteKit,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { getPoidsAssets } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getLignesAssetsApprentissage } from '@/lib/notation-recettes';
import { getPhotosBanque } from '@/lib/recettes';
import { getCatalogue } from '@/lib/sites';

// Kits d'images (packages/core/src/kits-images.ts, migration 0039) et contexte d'images (contexte-images.ts) côté serveur :
// - getNotesKits : kits_images_apprentissage() (ni auteur ni remarque) : apprentissage des photos et kits gardés ; [] sans 0039 ;
// - getDonneesKits : banque (photos importées et intégrées : jamais les « à valider »), notes, statuts, hashtags, soins par sujet ;
// - getContexteImages : clés exclues (≤ 2 ★, dernière note ≤ 2 ★, retirées, à retravailler) et kit compact de chaque sujet,
//   posés dans le registre par ContexteImages (layouts /admin, /creer, /edition, /mon-site).

export const MIGRATION_KITS = 'Migration 0039 à exécuter (supabase/migrations/0039_kits_images.sql) : les notes de kits restent dans ce navigateur.';

export const getNotesKits = cache(async (): Promise<(NoteKit & { rang: number; le: string | null })[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('kits_images_apprentissage', { p_limite: 2000 });
    if (error || !Array.isArray(data)) return [];
    return (data as { sujet: string; rang: number; note: number | null; garder: boolean; photos: unknown; appareil: string | null; created_at: string }[]).map((l) => ({
      sujet: l.sujet, rang: l.rang, note: l.note, garder: l.garder, appareil: l.appareil, le: l.created_at,
      photos: (Array.isArray(l.photos) ? l.photos : []).filter((p): p is { emplacement: string; url: string } => Boolean(p && typeof p.emplacement === 'string' && typeof p.url === 'string')),
    }));
  } catch {
    return [];
  }
});

export const getDonneesKits = cache(async (): Promise<DonneesKits & { exclues: Set<string> }> => {
  const [banque, assets, { hashtags }, lignes, catalogue, notesKits] = await Promise.all([
    getPhotosBanque().catch(() => []), getPoidsAssets(), getHashtagsAssets().catch(() => ({ hashtags: {} })), getLignesAssetsApprentissage(), getCatalogue().catch(() => []), getNotesKits(),
  ]);
  const slugs = catalogue.map((c) => c.slug);
  const soins = Object.fromEntries(SUJETS_KITS.map((s) => [s, s === 'general' ? [] : soinsParDefautScenario({ principaux: [s], secondaires: [] }, slugs)]));
  return { banque, assets, notes: notesPhotos(lignes), hashtags, soins, gardes: kitsGardes(notesKits), exclues: clesImagesExclues(lignes) };
});

export const getContexteImages = cache(async (): Promise<{ exclues: string[]; kits: Record<string, KitCompact> }> => {
  try {
    const d = await getDonneesKits();
    return { exclues: [...d.exclues].sort(), kits: kitsCompacts(d) };
  } catch {
    return { exclues: [], kits: {} };
  }
});
