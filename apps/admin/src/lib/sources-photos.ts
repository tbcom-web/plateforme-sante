import 'server-only';
import {
  jeuPhotosDepuisLigne, libelleSourceImage, photosDuJeu, recapSourcesImages, type LigneSourceImage, type ProvenancePhoto, type SourcePhotoManuelle,
} from '@plateforme/core';
import { COLONNES_JEU } from '@/lib/jeux-photos';
import { getPhotosLibres } from '@/lib/photos-libres';
import { createClient } from '@/lib/supabase/server';

// Sources et licences de toutes les images (packages/core/src/sources-photos.ts) : banque intégrée (crédits Unsplash), photos
// libres (photos_libres), photos envoyées à la main (photos_sources, migration 0031), Adobe Stock (licences_photos, 0016),
// photos des praticiens. Sans la migration 0031 : les photos envoyées apparaissent « Source à renseigner ».

type LigneSource = {
  chemin: string; provenance: ProvenancePhoto; reference_licence: string | null; auteur_nom: string | null; banque_nom: string | null;
  url_source: string | null; licence: string | null; licence_url: string | null; updated_at: string | null;
};

export async function getSourcesManuelles(): Promise<{ sources: Record<string, SourcePhotoManuelle & { le?: string | null }>; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('photos_sources').select('chemin, provenance, reference_licence, auteur_nom, banque_nom, url_source, licence, licence_url, updated_at').limit(5000);
  if (error) return { sources: {}, migrationManquante: true };
  return {
    sources: Object.fromEntries(((data ?? []) as LigneSource[]).map((l) => [l.chemin, {
      provenance: l.provenance, referenceLicence: l.reference_licence, auteur: l.auteur_nom, banque: l.banque_nom, urlSource: l.url_source, licence: l.licence,
      licenceUrl: l.licence_url, le: l.updated_at,
    }])),
    migrationManquante: false,
  };
}

/** Récapitulatif « Sources et licences » (une ligne par image) */
export async function getRecapSources(): Promise<{ lignes: LigneSourceImage[]; migration0031: boolean }> {
  const supabase = await createClient();
  const [libres, manuelles, { data: jeux }, { data: adobe }] = await Promise.all([
    getPhotosLibres(),
    getSourcesManuelles(),
    supabase.from('jeux_photos').select(COLONNES_JEU).order('nom'),
    supabase.from('licences_photos').select('site_id, photo_url, reference_licence, date_achat, transferee_au_client').order('created_at'),
  ]);
  const photosJeux = (jeux ?? []).map(jeuPhotosDepuisLigne).flatMap((j) => photosDuJeu(j.photos).map((url) => ({ url, jeu: j.nom, source: j.source })));
  const lignes = recapSourcesImages({
    libres: libres.photos,
    photosJeux,
    manuelles: manuelles.sources,
    adobe: ((adobe ?? []) as { site_id: string; photo_url: string; reference_licence: string; date_achat: string | null; transferee_au_client: boolean }[])
      .map((a) => ({ url: a.photo_url, reference: a.reference_licence, dateAchat: a.date_achat, transferee: a.transferee_au_client, site: a.site_id })),
  });
  return { lignes, migration0031: manuelles.migrationManquante || libres.migration0031 };
}

/** Libellé de source par adresse d'image (cartes de la bibliothèque et de « Donner mon avis ») */
export async function getCreditsImages(): Promise<Record<string, string>> {
  try {
    const { lignes } = await getRecapSources();
    return Object.fromEntries(lignes.map((l) => [l.url, libelleSourceImage(l)]));
  } catch {
    return {};
  }
}
