import { cleCandidatePhoto, clePhoto, etiquetteKit, hashtagsDe, type HashtagsAssets } from '@plateforme/core';
import type { PhotoLibre } from '@/lib/photos-libres';

// Ordre de la liste des photos libres (Frigo › Jeux de photos), partagé par le serveur et le navigateur (perf vague 2, 2026-10-10) :
// la page n'envoie plus que la première page (photos gardées pour un kit d'abord, puis l'ordre de la base), la liste complète
// arrive après l'affichage ; le serveur et le navigateur calculent la même première page avec ces fonctions.
export const PAR_PAGE_PHOTOS = 60;

/** Clé d'asset : photo importée → clé de l'inventaire ; candidate → photo:libre:<source>-<id> (reportée à l'import) */
export const clePhotoLibre = (p: PhotoLibre) => (p.url ? clePhoto(p.url) : p.source === 'ia' ? null : cleCandidatePhoto(p.source, p.idSource));
/** Photo gardée pour un kit d'images (#kit-<sujet>, suggestions-kits.ts) et pas encore importée : étiquette, sinon null */
export const kitDePhoto = (hashtags: HashtagsAssets, cle: string | null, p: PhotoLibre) => (cle && !p.url && p.statut !== 'retiree' ? etiquetteKit(hashtagsDe(hashtags, cle)) : null);
/** Tri stable : photos gardées pour un kit en tête */
export const trierParKit = <L extends { p: PhotoLibre; cle: string | null }>(l: L[], hashtags: HashtagsAssets) =>
  l.sort((a, b) => Number(Boolean(kitDePhoto(hashtags, b.cle, b.p))) - Number(Boolean(kitDePhoto(hashtags, a.cle, a.p))));

/** Première page sans filtre ni recherche (même ordre que la liste complète), total et nombre à importer */
export function premierePagePhotosLibres(photos: PhotoLibre[], hashtags: HashtagsAssets) {
  const l = trierParKit(photos.map((p) => ({ p, cle: clePhotoLibre(p) })), hashtags);
  return { photos: l.slice(0, PAR_PAGE_PHOTOS).map((x) => x.p), total: photos.length, aImporter: photos.filter((p) => !p.url && p.statut !== 'retiree').length };
}
