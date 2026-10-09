import 'server-only';
import { cache } from 'react';
import { baseDeCle, clesRecentes, clesUnitairesInventaire, jourParis, SUJETS_VISUELS, type CleRecente } from '@plateforme/core';
import { clesExcluesArrivages, etatPhotoLibre, nouveautesEnAttente } from '@plateforme/core/arrivages';
import { estDeLaProfession, sujetDeLaProfession, type Profession } from '@plateforme/core/professions';
import { lireAssetsNotesApprentissage } from '@/lib/assets-notes';
import { contenusEnAttente, getPacksRevue } from '@/lib/packs-contenus';
import { getPhotosLibres, type PhotoLibre } from '@/lib/photos-libres';
import { getSeriesEnAttente } from '@/lib/sourcing-photos';

// Arrivages (/admin/arrivages, packages/core/src/arrivages.ts) : nouveautés du code (registre inventaire-connu.json, nouveautes.ts)
// encore en attente, photos gardées ou images générées « à valider ». Lectures : dernières notes
// et statuts courants des revues (0021 / 0044), par la lecture d'apprentissage déjà partagée par la page.
// En cas d'erreur (migration absente, hors ligne) : rien en attente, rien d'exclu (comportement d'avant).

let connues: Set<string> | null = null;
const clesConnues = () => (connues ??= new Set(clesUnitairesInventaire()));

export type EtatsNouveautes = {
  recentes: CleRecente[];
  statuts: Record<string, string>;
  dernieresNotes: Record<string, number>;
};

/**
 * Nouveautés récentes de l'inventaire chargé, avec statuts et dernières notes. Lecture par assets_notes_apprentissage() (0027,
 * notes les plus récentes d'abord puis statuts courants) : ouverte aux comptes des praticiens et de l'essai, pour qui l'exclusion
 * vaut aussi (/creer, /edition, /mon-site). Erreur : rien en attente, rien d'exclu.
 */
export const getEtatsNouveautes = cache(async (): Promise<EtatsNouveautes> => {
  const recentes = clesRecentes(jourParis(new Date())).filter((r) => clesConnues().has(r.cle));
  if (!recentes.length) return { recentes, statuts: {}, dernieresNotes: {} };
  try {
    const { data, error } = await lireAssetsNotesApprentissage();
    if (error || !Array.isArray(data)) return { recentes: [], statuts: {}, dernieresNotes: {} };
    const dernieresNotes: Record<string, number> = {};
    const statuts: Record<string, string> = {};
    for (const l of data as { cle_asset: string; note: number | null; statut: string | null }[]) {
      if (typeof l.note === 'number') { if (!(l.cle_asset in dernieresNotes)) dernieresNotes[l.cle_asset] = l.note; } else if (l.statut) statuts[l.cle_asset] = l.statut;
    }
    return { recentes, statuts, dernieresNotes };
  } catch {
    return { recentes: [], statuts: {}, dernieresNotes: {} };
  }
});

/** Photo libre (Pexels, Pixabay) ou image générée rattachée à la profession (par son sujet) */
const photoDeLaProfession = (p: Pick<PhotoLibre, 'sujet'>, profession: Profession) => {
  const s = SUJETS_VISUELS.find((x) => x.id === p.sujet);
  return s ? sujetDeLaProfession(s, profession) : estDeLaProfession({}, profession.id);
};

export type ArrivagesEnAttente = {
  nouveautes: CleRecente[];
  photos: PhotoLibre[];
  statuts: Record<string, string>;
  migrationPhotos: boolean;
};

/** Ce qui attend une décision, pour la profession choisie (les éléments du code sans profession sont de la profession par défaut) */
export const getArrivagesEnAttente = cache(async (profession: Profession): Promise<ArrivagesEnAttente> => {
  const [etats, libres] = await Promise.all([getEtatsNouveautes(), getPhotosLibres()]);
  const nouveautes = estDeLaProfession({}, profession.id) ? nouveautesEnAttente(etats.recentes, etats) : [];
  const photos = libres.photos.filter((p) => etatPhotoLibre(p.statut) === 'en_attente' && photoDeLaProfession(p, profession));
  return { nouveautes, photos, statuts: etats.statuts, migrationPhotos: libres.migrationManquante };
});

/** Compteur du menu : nouveautés, photos, séries de l'agent (0053) et contenus des packs en attente */
export const getNombreArrivages = cache(async (profession: Profession): Promise<number> => {
  try {
    const [a, packs, series] = await Promise.all([getArrivagesEnAttente(profession), getPacksRevue(profession.id), getSeriesEnAttente(profession.id)]);
    return a.nouveautes.length + a.photos.length + series.series.length + packs.reduce((s, p) => s + contenusEnAttente(p).length, 0);
  } catch {
    return 0;
  }
});

/** Clés que le générateur ne doit pas utiliser : nouveautés en attente ou refusées (registre d'exclusion, ContexteImages) */
export const getExclusionsArrivages = cache(async (): Promise<string[]> => {
  try {
    const e = await getEtatsNouveautes();
    return clesExcluesArrivages(e.recentes, e);
  } catch {
    return [];
  }
});

/** Compteur « Tuiles à noter » du menu : nouveautés jamais notées (ni elles ni leur illustration de base), hors « Retiré » */
export const getNombreNouveautesANoter = cache(async (profession: Profession): Promise<number> => {
  if (!estDeLaProfession({}, profession.id)) return 0;
  const e = await getEtatsNouveautes();
  return e.recentes.filter((r) => {
    const b = baseDeCle(r.cle);
    return e.statuts[r.cle] !== 'retire' && !(r.cle in e.dernieresNotes) && !(b && b in e.dernieresNotes);
  }).length;
});
