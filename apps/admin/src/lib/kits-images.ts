import 'server-only';
import { cache } from 'react';
import {
  composerKitVisuel, familleDeCle, inventaireAssets, inventaireStudio, kitVisuelCompact, notesVisuels, type DonneesVisuels, type StatutIllustration,
  cleCandidatePhoto, clesImagesExclues, vivierCure, etiquetteKit, kitsCompacts, PREFIXE_REFUS_KIT, refusKitDepuisLignes, kitsGardes, notesPhotos, soinsParDefautScenario, SUJETS_KITS,
  type DonneesKits, type KitCompact, type NoteKit, cleKitDemo, composerKitDemo, kitDemoCompact,
} from '@plateforme/core';
import { professionsActives } from '@plateforme/core/professions';
import { getImagesDemo } from '@/lib/kit-demo';
import { createClient } from '@/lib/supabase/server';
import { getPhotosDesJeux, getPoidsAssets, getSurchargesSujets } from '@/lib/assets-notes';
import { getRevuesIllustrations } from '@/lib/illustrations';
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
  // Banque : photos importées et intégrées + photos GARDÉES non importées (« Importer et utiliser ») ; le kit n'assemble que les
  // importées du vivier curé (kits-images.ts, estCuree : étiquetées avec le sujet par Paul)
  const [banque, assets, { hashtags }, lignes, catalogue, notesKits, surcharges] = await Promise.all([
    getPhotosBanque({ nonImportees: true }).catch(() => []), getPoidsAssets(), getHashtagsAssets().catch(() => ({ hashtags: {} })), getLignesAssetsApprentissage(), getCatalogue().catch(() => []), getNotesKits(), getSurchargesSujets().catch(() => ({})),
  ]);
  const slugs = catalogue.map((c) => c.slug);
  const soins = Object.fromEntries(SUJETS_KITS.map((s) => [s, s === 'general' ? [] : soinsParDefautScenario({ principaux: [s], secondaires: [] }, slugs)]));
  return { banque, assets, notes: notesPhotos(lignes), hashtags, soins, gardes: kitsGardes(notesKits), exclues: clesImagesExclues(lignes), surcharges };
});

export const getContexteImages = cache(async (praticien = false): Promise<{ exclues: string[]; kits: Record<string, KitCompact>; vivier: Record<string, string[]> }> => {
  try {
    // Lectures en parallèle (2026-10-09) : le kit démo n'attend plus les kits et les visuels
    const [d, dv, demos] = await Promise.all([getDonneesKits(), getDonneesVisuels(), getImagesDemo()]);
    // Vivier curé 4-5 ★ par sujet (photos importées, meilleures d'abord) : tirages de photos et part du style « Photos »
    const vivier = Object.fromEntries(SUJETS_KITS.map((s) => [s, vivierCure(s, d).filter((v) => v.importee && (v.note ?? 0) >= 4).map((v) => v.p.url)]));
    // Kits multi-visuels (kits-visuels.ts) : dessin par soin et animation d'en-tête du sujet, ajoutés au kit photo ; praticiens
    // (/creer, /edition, /mon-site) : visuels validés seulement, animations aux ingrédients validés seulement
    const kits = kitsCompacts(d);
    for (const s of SUJETS_KITS) {
      const v = kitVisuelCompact(composerKitVisuel(s, dv, { praticien }));
      if (Object.keys(v).length) kits[s] = { sujet: s, ...(kits[s] ?? {}), ...v };
    }
    // Kit DÉMO de chaque profession (kit-demo.ts, clé demo:<profession>) : aperçus seulement (ApercuTheme, planches de portraits),
    // jamais lu par les packs, les jeux ni les recettes ; praticiens : parcours d'inscription avec le bandeau « Photos d'exemple »
    for (const p of professionsActives()) {
      const k = composerKitDemo(demos.images, { profession: p.id, exclues: demos.exclues });
      if (k) kits[cleKitDemo(p.id)] = kitDemoCompact(k);
    }
    return { exclues: [...d.exclues].sort(), kits, vivier };
  } catch {
    return { exclues: [], kits: {}, vivier: {} };
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

/**
 * Données des kits multi-visuels (kits-visuels.ts) : illustrations, icônes et animations de l'inventaire (aucune liste figée : un
 * nouveau visuel entre dès qu'il est rattaché), sujets et hashtags de Paul, notes (base → variantes), statuts de revue, exclusions.
 */
export const getDonneesVisuels = cache(async (): Promise<DonneesVisuels> => {
  const [d, lignes, revues, photosJeux] = await Promise.all([getDonneesKits(), getLignesAssetsApprentissage(), getRevuesIllustrations().catch(() => ({ statuts: [] as { cle: string; statut: StatutIllustration }[] })), getPhotosDesJeux().catch(() => [])]);
  // Animations d'en-tête (composant:entete-anim:*) : rattachables à un sujet comme les animations de l'inventaire
  const visuels = [...inventaireAssets({ photosJeux }), ...inventaireStudio().filter((a) => a.cle.startsWith('composant:entete-anim:'))].filter((a) => { const f = familleDeCle(a.cle); return f === 'illustration' || f === 'icone' || f === 'animation'; }).map((a) => ({ cle: a.cle, type: a.type, soins: a.soins, titre: a.titre }));
  return { visuels, surcharges: d.surcharges, hashtags: d.hashtags, notes: notesVisuels(lignes), exclues: d.exclues, statuts: Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut])), soins: d.soins };
});
