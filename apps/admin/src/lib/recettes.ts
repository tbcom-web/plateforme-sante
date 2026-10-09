import 'server-only';
import { cache } from 'react';
import {
  apercuAutorise, appareilDe, banquePhotos, cleCandidatePhoto, estPageStructure, estPhotoImportee, estSourcePhotoLibre, modeleIntegre, normaliserComposition, photosIntegreesBanque,
  recetteDepuisLigne, retourMobileDepuisLigne, sujetsDeSpecialite, SUJETS_VISUELS,
  type EntreeBanquePhotos, type ModeleManifeste, type NoteRecette, type PhotoBanque, type Recette, type RetourMobile,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { colonneAbsente } from '@/lib/erreurs-supabase';
import { getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';

// Recettes du studio côté serveur (migration 0032) :
// - getRecettes : toutes les recettes (super admin, /admin/atelier/studio), avec remarques ;
// - getRecettesLecture : recettes actives notées (fonction recettes_lecture : sans auteur ni remarques), pour le parcours /creer
//   et l'apprentissage (renforts des ingrédients) ;
// - getPhotosBanque : photos utilisables par les tirages (jeux de photos partagés, photos libres validées et importées, photos
//   intégrées), avec leurs sujets effectifs ; studio : aussi les photos gardées non importées (marquées).

export const COLONNES_RECETTE = 'id, nom, sujets, couleurs_preferees, composition, note, etiquettes, positif, negatif, statut, created_at, updated_at';

/** Recettes (plus récentes d'abord) ; `migrationManquante` : table absente (0032 pas encore exécutée) */
async function getRecettesSansMemo(modele?: (id: string) => ModeleManifeste): Promise<{ recettes: Recette[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('recettes').select(COLONNES_RECETTE).order('updated_at', { ascending: false }).limit(1000);
  if (error) return { recettes: [], migrationManquante: true };
  return { recettes: (data ?? []).map((l) => recetteDepuisLigne(l as Record<string, unknown>, modele ?? modeleIntegre)).filter((r): r is Recette => Boolean(r)), migrationManquante: false };
}
export const getRecettes = cache(getRecettesSansMemo);

/** Recettes actives notées au moins `noteMin` (parcours, apprentissage) ; [] sans la migration */
async function getRecettesLectureSansMemo(noteMin = 4): Promise<Recette[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('recettes_lecture', { p_note_min: noteMin });
    if (error || !Array.isArray(data)) return [];
    return data.map((l) => recetteDepuisLigne(l as Record<string, unknown>)).filter((r): r is Recette => Boolean(r));
  } catch {
    return [];
  }
}
export const getRecettesLecture = cache(getRecettesLectureSansMemo);

/** Notes PAR PAGE des recettes actives (fonction recettes_notes_apprentissage, 0034 : ni auteur ni remarques) ; [] sans la migration */
async function getNotesPagesLectureSansMemo(): Promise<NoteRecette[]> {
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
export const getNotesPagesLecture = cache(getNotesPagesLectureSansMemo);

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
async function getRetoursMobileSansMemo(): Promise<{ retours: RetourMobile[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('defauts_mobile').select('id, cle, page, verdict, note, etiquettes, remarque, zones, empreinte, statut, created_at').order('created_at', { ascending: false }).limit(2000);
  if (error) return { retours: [], migrationManquante: true };
  return { retours: (data ?? []).map((l) => retourMobileDepuisLigne(l as Record<string, unknown>)).filter((r): r is RetourMobile => Boolean(r)), migrationManquante: false };
}
export const getRetoursMobile = cache(getRetoursMobileSansMemo);

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

type LigneLibre = { id: string; source: string; id_source: string; sujet: string; statut: string; chemin: string | null; url: string | null; apercu_url?: string | null; requete?: string | null };
/** Photos libres non retirées ; sans les colonnes de 0031 (aperçu), lecture sans elles ; table absente (0028) : aucune */
async function lirePhotosLibres(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ data: LigneLibre[] | null }> {
  const lire = (colonnes: string) => supabase.from('photos_libres').select(colonnes).neq('statut', 'retiree').order('created_at', { ascending: false }).limit(2000);
  try {
    // Requête d'origine (0028) : indice d'activité des photos (une photo de tennis taguée seulement « sport »)
    let { data, error } = await lire('id, source, id_source, sujet, statut, chemin, url, apercu_url, requete');
    if (colonneAbsente(error)) ({ data, error } = await lire('id, source, id_source, sujet, statut, chemin, url, apercu_url'));
    if (colonneAbsente(error)) ({ data, error } = await lire('id, source, id_source, sujet, statut, chemin, url'));
    return { data: error ? null : (data as unknown as LigneLibre[]) };
  } catch {
    return { data: null };
  }
}

/**
 * Photos de la banque pour les tirages (retour de Paul du 2026-10-07 : « il manque l'inclusion des photos sélectionnées dans la
 * bibliothèque ») : jeux de photos partagés, photos libres VALIDÉES ET IMPORTÉES (statut « validée », fichier hébergé), photos
 * intégrées ; sujets EFFECTIFS (défauts ± sujets ajoutés / retirés par Paul, assets_sujets_effectifs, + hashtags qui nomment un
 * sujet, assets_hashtags_effectifs) ; les notes pondèrent ensuite les tirages (photosCompatibles).
 * `nonImportees` (studio seulement) : aussi les photos libres GARDÉES pas encore importées (statut « à valider »), servies par
 * leur aperçu Pexels / Pixabay et marquées `importee: false` ; jamais pour l'atelier, le parcours ni les sites.
 */
export function getPhotosBanque(opts: { nonImportees?: boolean } = {}): Promise<PhotoBanque[]> {
  // Une lecture par requête et par option (cache React : la clé est un booléen, pas l'objet d'options)
  return photosBanque(Boolean(opts.nonImportees));
}
const photosBanque = cache(async (nonImportees: boolean): Promise<PhotoBanque[]> => {
  const opts = { nonImportees };
  const supabase = await createClient();
  const [jeux, { data: libres }, surcharges, { hashtags }] = await Promise.all([
    getPhotosDesJeux().catch(() => []),
    lirePhotosLibres(supabase),
    getSurchargesSujets(),
    getHashtagsAssets(),
  ]);
  const sujetsJeu = (specialite: string) => (specialite === 'generale' ? ['general'] : sujetsDeSpecialite(specialite));
  const entrees: EntreeBanquePhotos[] = [
    // Jeux de photos partagés (les photos libres sont lues à part, avec leur statut)
    ...jeux.filter((p) => !p.jeu.startsWith('Banque libre')).map((p) => ({ url: p.url, origine: 'jeu' as const, sujets: sujetsJeu(p.specialite) })),
    ...((libres ?? []) as LigneLibre[]).flatMap((l): EntreeBanquePhotos[] => {
      const sujets = SUJETS_VISUELS.some((x) => x.id === l.sujet) ? [l.sujet] : ['general'];
      // Image générée par IA (0040) : comme une photo libre importée, une fois validée (jamais d'aperçu externe)
      if (l.source === 'ia') return estPhotoImportee(l) ? [{ url: l.url!, origine: 'libre', sujets, idLibre: l.id }] : [];
      if (!estSourcePhotoLibre(l.source)) return [];
      if (estPhotoImportee(l)) return [{ url: l.url!, origine: 'libre', sujets, idLibre: l.id, source: l.source, ...(l.requete ? { requete: l.requete } : {}) }];
      // Gardée, pas encore importée : aperçu de la source, clé de la candidate (sujets et hashtags saisis au « Garder »)
      if (!opts.nonImportees || l.statut !== 'a_valider' || l.url || !l.apercu_url || !apercuAutorise(l.source, l.apercu_url)) return [];
      return [{ url: l.apercu_url, origine: 'libre', sujets, importee: false, cle: cleCandidatePhoto(l.source, l.id_source), idLibre: l.id, source: l.source }];
    }),
    ...photosIntegreesBanque().map((p) => ({ url: p.url, origine: 'integree' as const, sujets: p.sujets })),
  ];
  return banquePhotos(entrees, { surcharges, hashtags });
});
