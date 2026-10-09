import 'server-only';
import { cache } from 'react';
import { avecSujets, estCleAsset, photosDuJeu, SUJETS_VISUELS, surchargesDepuisLignes, type SurchargesSujets, poidsAssets, jeuPhotosDepuisLigne, type LigneAppriseAsset, type PhotoDeJeu, type PoidsAssets } from '@plateforme/core';
import { getCreditsImages } from '@/lib/sources-photos';
import { createClient } from '@/lib/supabase/server';
import { colonneAbsente } from '@/lib/erreurs-supabase';

// Notes des assets (migration 0027) : journal lu par le super admin (/admin/retours, /admin/illustrations), poids appris
// (assets_notes_apprentissage : clé, note, étiquettes, statuts — ni commentaire ni auteur) pour tout compte connecté.

export type NoteAssetAdmin = { id: string; cle: string; note: number; etiquettes: string[]; commentaire: string | null; positif: string | null; negatif: string | null; empreinte: string | null; le: string };

type Ligne = { id: string; cle_asset: string; note: number; etiquettes: string[] | null; commentaire: string | null; positif?: string | null; negatif?: string | null; empreinte: string | null; created_at: string };

/** Journal des notes (plus récentes d'abord) ; `migrationManquante` : table absente (migration 0027 pas encore exécutée) */
async function getNotesAssetsSansMemo(): Promise<{ notes: NoteAssetAdmin[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const lire = (colonnes: string) => supabase.from('assets_notes').select(colonnes).order('created_at', { ascending: false }).limit(20000);
  // Remarques distinctes (0028) ; sans la migration 0028, lecture sans ces colonnes (l'instantané « apercu » n'est lu qu'à la demande)
  let { data, error } = await lire('id, cle_asset, note, etiquettes, commentaire, positif, negatif, empreinte, created_at');
  if (colonneAbsente(error)) ({ data, error } = await lire('id, cle_asset, note, etiquettes, commentaire, empreinte, created_at'));
  if (error) return { notes: [], migrationManquante: true };
  return {
    notes: ((data ?? []) as unknown as Ligne[]).map((l) => ({
      id: l.id, cle: l.cle_asset, note: l.note, etiquettes: l.etiquettes ?? [], commentaire: l.commentaire, positif: l.positif ?? null, negatif: l.negatif ?? null,
      empreinte: l.empreinte, le: l.created_at,
    })),
    migrationManquante: false,
  };
}
export const getNotesAssets = cache(getNotesAssetsSansMemo);

/** Surcharges de sujets des visuels (assets_sujets_effectifs, 0028) ; {} si la migration manque */
async function getSurchargesSujetsSansMemo(): Promise<SurchargesSujets> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('assets_sujets_effectifs');
    if (error || !Array.isArray(data)) return {};
    return surchargesDepuisLignes((data as { cle_asset: string; sujet: string; action: string }[]).map((l) => ({ cle: l.cle_asset, sujet: l.sujet, action: l.action })));
  } catch {
    return {};
  }
}
export const getSurchargesSujets = cache(getSurchargesSujetsSansMemo);

/**
 * Lignes brutes de assets_notes_apprentissage (notes et statuts, 20 000 au plus), lues UNE fois par requête : partagées par
 * getPoidsAssets et getLignesAssetsApprentissage (notation-recettes.ts), appelées jusqu'à 5 fois par page auparavant.
 */
export const lireAssetsNotesApprentissage = cache(async () => {
  const supabase = await createClient();
  return await supabase.rpc('assets_notes_apprentissage', { p_limite: 20000 });
});

/** Poids appris des assets (+ sujets ajoutés / retirés par Paul) ; null sans notes, statut ni surcharge, ou si les migrations manquent */
async function getPoidsAssetsSansMemo(): Promise<PoidsAssets | null> {
  try {
    const [{ data, error }, sujets] = await Promise.all([lireAssetsNotesApprentissage(), getSurchargesSujets()]);
    if (error || !Array.isArray(data)) return avecSujets(null, sujets);
    // Appareil regardé (0034) : une note donnée sur le rendu mobile pèse un peu plus (rendu-mobile.ts) ; absent avant 0034
    return avecSujets(poidsAssets((data as { cle_asset: string; note: number | null; etiquettes: string[] | null; statut: string | null; appareil?: string | null }[])
      .map((l): LigneAppriseAsset => ({ cle: l.cle_asset, note: l.note, etiquettes: l.etiquettes, statut: l.statut, appareil: l.appareil ?? null }))), sujets);
  } catch {
    return null;
  }
}
export const getPoidsAssets = cache(getPoidsAssetsSansMemo);

/**
 * Photos des jeux de photos (stockage) à ajouter à l'inventaire : URL, nom du jeu, spécialité ; puis les photos libres de
 * droits gardées (Pexels / Pixabay, migration 0028), non retirées : candidates visibles dans la bibliothèque et notables.
 */
async function getPhotosDesJeuxSansMemo(): Promise<PhotoDeJeu[]> {
  const supabase = await createClient();
  const [{ data, error }, { data: libres }, credits] = await Promise.all([
    supabase.from('jeux_photos').select('id, nom, specialite, photos, source, site_id, actif').order('nom'),
    // Photos importées seulement (fichiers hébergés) : une candidate gardée sans import (0031) n'est pas un visuel utilisable
    supabase.from('photos_libres').select('url, source, sujet, statut').neq('statut', 'retiree').not('url', 'is', null).order('created_at'),
    // Source et licence de chaque image (affichées sur les cartes : bibliothèque, Donner mon avis)
    getCreditsImages(),
  ]);
  const desJeux = error || !data ? [] : data.map(jeuPhotosDepuisLigne).flatMap((j) => photosDuJeu(j.photos).filter((u) => !u.startsWith('/photos/')).map((url) => ({ url, jeu: j.nom, specialite: j.specialite })));
  // Table absente (migration 0028 pas encore exécutée) : `libres` vaut null, aucune erreur
  const desLibres = (libres ?? []).filter((l: { url: string | null }) => Boolean(l.url)).map((l: { url: string; source: string; sujet: string; statut: string }) => ({
    url: l.url,
    // « Banque libre … » : préfixe lu par getPhotosBanque (recettes.ts) ; image générée par IA (0040) étiquetée comme telle
    jeu: `Banque libre ${l.source === 'ia' ? '· Image générée' : l.source === 'pexels' ? 'Pexels' : 'Pixabay'}${l.statut === 'a_valider' ? ' (à valider)' : ''}`,
    sujet: l.sujet,
    specialite: SUJETS_VISUELS.find((s) => s.id === l.sujet)?.specialite ?? 'generale',
  }));
  return [...desJeux, ...desLibres].map((p) => ({ ...p, credit: credits[p.url] }));
}
export const getPhotosDesJeux = cache(getPhotosDesJeuxSansMemo);

export const cleAssetValide = (cle: unknown): cle is string => estCleAsset(cle);
