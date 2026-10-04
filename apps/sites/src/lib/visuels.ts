// Visuels et coordonnées : photos par défaut (sans visage, pour ne jamais faire passer une personne
// pour le praticien), géolocalisation du cabinet pour le plan d'accès (OpenStreetMap, sans cookie).
import { site } from './site';
import { lieu } from './textes';

const PHOTO_SOIN: Record<string, string> = {
  'bilan-podologique': '/photos/analyse-plateforme.webp',
  'semelles-orthopediques': '/photos/chaussage.webp',
  'soins-de-pedicurie': '/photos/examen-mains.webp',
  'pied-diabetique': '/photos/soin-talon.webp',
  'podologie-du-sport': '/photos/sport-course.webp',
  'podologie-enfant': '/photos/enfant-pied.webp',
  posturologie: '/photos/analyse-plateforme.webp',
  'podologie-du-senior': '/photos/examen-mains.webp',
  'verrues-plantaires': '/photos/soin-talon.webp',
  'ongle-incarne': '/photos/examen-mains.webp',
  'douleur-talon': '/photos/soin-talon.webp',
  laser: '/photos/soin-talon.webp',
  'k-taping': '/photos/sport-course.webp',
};

export const photoSoin = (slug: string) => PHOTO_SOIN[slug] ?? '/photos/examen-mains.webp';

// Photos du praticien d'abord, puis celles du pack visuel de sa spécialité.
const pack = site.visuels.photos;
export const photoAccueil = site.photos.accueil || pack.accueil;
export const photoPanorama = site.photos.panorama || site.photos.cabinet[0] || pack.panorama;
export const diaporama = [...new Set([site.photos.accueil, site.photos.panorama, ...site.photos.cabinet, ...pack.diaporama].filter(Boolean))].slice(0, 4);
/** Fond sombre des accueils animés, teinté de la couleur du cabinet (variable de la charte) */
export const fondAnime = 'var(--fond-anime)';
export const photoFinale = site.photos.cabinet[1] || '/photos/chaussage.webp';

/** Coordonnées du cabinet : saisies, sinon géocodées au build via Nominatim (OpenStreetMap). */
async function geocoder(): Promise<{ lat: number; lng: number } | null> {
  if (site.cabinet.geo) return site.cabinet.geo;
  const q = `${lieu.adresse}, ${lieu.codePostal} ${lieu.ville}`;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=${site.pays.toLowerCase()}&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'plateforme-sante/1.0 (contact@webpodologue.fr)', 'Accept-Language': 'fr' },
    });
    const [res] = (await r.json()) as { lat: string; lon: string }[];
    return res ? { lat: Number(res.lat), lng: Number(res.lon) } : null;
  } catch {
    return null;
  }
}

export const geo = await geocoder();

/** URL de la carte OpenStreetMap intégrable (marqueur sur le cabinet). */
export const carteUrl = geo
  ? `https://www.openstreetmap.org/export/embed.html?bbox=${geo.lng - 0.006}%2C${geo.lat - 0.0035}%2C${geo.lng + 0.006}%2C${geo.lat + 0.0035}&layer=mapnik&marker=${geo.lat}%2C${geo.lng}`
  : '';
