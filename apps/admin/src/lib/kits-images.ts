import 'server-only';
import { cache } from 'react';
import {
  cleCandidatePhoto, clesImagesExclues, etiquetteKit, kitsCompacts, PREFIXE_REFUS_KIT, refusKitDepuisLignes, kitsGardes, notesPhotos, soinsParDefautScenario, SUJETS_KITS,
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

// ---------------------------------------------------------------------------------------------------------------
// Compléter un kit (suggestions-kits.ts)
// ---------------------------------------------------------------------------------------------------------------

/** Refus « Pas pour ici » (classement_suggestions, raison kit-pas-ici:<clé>) ; vide sans la migration 0033 */
export async function getRefusKits(): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('classement_suggestions').select('contexte, nature, valeur, decision, raison')
      .eq('contexte', 'photos').eq('nature', 'hashtag').eq('decision', 'refusee').like('raison', `${PREFIXE_REFUS_KIT}%`).limit(5000);
    return error || !data ? new Set() : refusKitDepuisLignes(data as { valeur: string; decision: string; raison: string | null }[]);
  } catch {
    return new Set();
  }
}

/** Requête d'origine des photos libres importées (mots qui décrivent la photo), par URL */
export async function getRequetesPhotos(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('photos_libres').select('url, requete').not('url', 'is', null).limit(5000);
    return Object.fromEntries(((data ?? []) as { url: string; requete: string | null }[]).filter((l) => l.url && l.requete).map((l) => [l.url, l.requete!]));
  } catch {
    return {};
  }
}

export type PhotoEnAttenteKit = { id: string; sujet: string; emplacement: string | null; apercu: string | null; libelle: string };

/** Photos gardées pour un kit (#kit-<sujet>) mais pas encore importées : « en attente d'import » dans l'emplacement */
export async function getEnAttenteKits(): Promise<PhotoEnAttenteKit[]> {
  try {
    const supabase = await createClient();
    const [{ data }, { hashtags }] = await Promise.all([
      supabase.from('photos_libres').select('id, source, id_source, apercu_url, statut, url').eq('statut', 'a_valider').is('url', null).limit(2000),
      getHashtagsAssets().catch(() => ({ hashtags: {} as Record<string, string[]> })),
    ]);
    return ((data ?? []) as { id: string; source: string; id_source: string; apercu_url: string | null }[]).flatMap((l) => {
      const e = etiquetteKit(hashtags[cleCandidatePhoto(l.source as 'pexels', l.id_source)] ?? []);
      return e ? [{ id: l.id, sujet: e.sujet, emplacement: e.emplacement, apercu: l.apercu_url, libelle: e.libelle }] : [];
    });
  } catch {
    return [];
  }
}
