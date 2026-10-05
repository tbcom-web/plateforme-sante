// Visuels et coordonnées : photos par défaut (sans visage, pour ne jamais faire passer une personne
// pour le praticien), géolocalisation du cabinet pour le plan d'accès (lien OpenStreetMap, sans cookie).
import { site } from './site';
import { lieu } from './textes';
import { jeu, visuelSoin } from './visuels-soins';
import { rendreCase, registreModele, type ModeVisuel, type NomDessin, type Registre } from '@plateforme/core';

/** Photo d'un soin (source unique : jeu visuel, lib/visuels-soins.ts) */
export const photoSoin = (slug: string) => visuelSoin(slug).photo;

// Photos du praticien d'abord, puis celles du jeu visuel de sa spécialité (packages/core/src/jeux.ts).
export const photoAccueil = site.photos.accueil || jeu.accueil.photo;
export const photoPanorama = site.photos.panorama || site.photos.cabinet[0] || jeu.panorama.photo;
export const diaporama = [...new Set([site.photos.accueil, site.photos.panorama, ...site.photos.cabinet, ...jeu.galerie.map((g) => g.photo)].filter(Boolean))].slice(0, 4);
/** Fond sombre des accueils animés, teinté de la couleur du cabinet (variable de la charte) */
export const fondAnime = 'var(--fond-anime)';
export const photoFinale = site.photos.cabinet[1] || '/photos/chaussage.webp';

// ---- Style visuel choisi par le praticien : illustrations seules, photos seules ou mélange ----
// Règles (rendreCase, packages/core/src/jeux.ts) : les photos du praticien s'affichent toujours (c'est son
// choix, même en mode illustrations) ; sa case « animation d'accueil » décochée n'est jamais contournée ;
// en mode photos, aucune animation.
// Par défaut : illustrations (style des nouveaux sites, draft.ts).
export const modeVisuel: ModeVisuel = site.theme.modeVisuel ?? 'illustrations';
export const enIllustrations = modeVisuel === 'illustrations';
export const enPhotos = modeVisuel === 'photos';

// ---- Registre des illustrations, fixé par le modèle (jetons.registre) ----
// « releve » : trame de pression, lectures en mono, fonds plan sombres ; « pedagogique » : schémas au trait sur fond
// clair, sans trame, sans lecture, sans ligne de scan. Valeur par défaut de Dessin, Animation, Materiel, Planche…
export const registre: Registre = registreModele(site.modele);
export const pedagogique = registre === 'pedagogique';

/**
 * Accueil « lieu » (modèle Simple et pédagogique) : grande photo du lieu d'exercice — photo d'accueil ou panorama du
 * praticien (façade, village, rue, cabinet), sinon la photo d'accueil du jeu de photos de la spécialité, quel que soit
 * le style visuel (l'accueil de ce modèle est une photo) ; chaîne vide = illustration pédagogique calme.
 */
export const photoLieuAccueil = site.photos.accueil || site.photos.panorama || site.photos.cabinet[0] || (process.env.SANS_PHOTO === '1' ? '' : jeu.accueil.photo) || '';
/** Cadrage de la photo du lieu : celui du jeu de photos pour une photo de banque, centré pour une photo du praticien. */
export const cadrageLieuAccueil = photoLieuAccueil && photoLieuAccueil === jeu.accueil.photo && !site.photos.accueil ? jeu.accueil.cadrage : '50% 50%';

/** Dessin signature de la spécialité (accueil et panorama sans photo) */
export const dessinSpecialite: NomDessin = jeu.accueil.dessin;

const renduAccueil = rendreCase(jeu.accueil, modeVisuel, 'accueil', { photoPraticien: site.photos.accueil || undefined, animationActive: Boolean(site.visuels.animation) });
/** Animation affichée à l'accueil : celle de la spécialité si la case est cochée, jamais en mode photos */
export const animationAccueil = renduAccueil.type === 'animation' ? renduAccueil.animation : null;
/** Photo d'accueil affichée : en mode illustrations, seulement celle du praticien */
export const photoAccueilAffichee = enIllustrations ? site.photos.accueil : photoAccueil;
/** Diaporama affiché : en mode illustrations, seulement les photos du praticien */
export const diaporamaAffiche = enIllustrations
  ? [...new Set([site.photos.accueil, site.photos.panorama, ...site.photos.cabinet].filter(Boolean))].slice(0, 4)
  : diaporama;
const renduPanorama = rendreCase(jeu.panorama, modeVisuel, 'accueil', { photoPraticien: site.photos.panorama || site.photos.cabinet[0] || undefined, animationActive: false });
/** Photo du panorama affichée : en mode illustrations, seulement celle du praticien (sinon composition sur fond plan) */
export const photoPanoramaAffichee = renduPanorama.type === 'photo' ? renduPanorama.src : '';
/** Visuel principal de l'accueil, par ordre de priorité */
export const visuelAccueil = (photos: string[]): 'animation' | 'photo' | 'illustration' =>
  animationAccueil ? 'animation' : photos.filter(Boolean).length ? 'photo' : 'illustration';
/** Photo du cabinet pour un praticien sans portrait, en mode photos (lieu, jamais une personne) */
export const photoLieu = site.photos.cabinet[0] || site.photos.accueil || jeu.accueil.photo;

/** Coordonnées du cabinet : saisies, sinon géocodées au build via Nominatim (OpenStreetMap). */
async function geocoder(): Promise<{ lat: number; lng: number } | null> {
  if (site.cabinet.geo) return site.cabinet.geo;
  // Adresse incomplète (vidée au chargement, voir assemblerSite) : aucune position inventée.
  if (!lieu.adresse || !lieu.codePostal || !lieu.ville) return null;
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

/** Carte OpenStreetMap complète (ouverte à la demande, jamais intégrée au chargement de la page). */
export const lienCarte = geo
  ? `https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lng}#map=17/${geo.lat}/${geo.lng}`
  : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${lieu.adresse}, ${lieu.codePostal} ${lieu.ville}`)}`;

/**
 * Variantes allégées d'une photo d'illustration (480 et 960 px, produites au build par astro.config.mjs) :
 * attributs srcset et sizes à poser sur <img>. Photos du praticien (URL externes) : inchangées.
 */
export const photoResponsive = (src: string, sizes: string): { srcset?: string; sizes?: string } => {
  if (process.env.PHOTOS_VARIANTES !== '1' || !import.meta.env.PROD || !/^\/photos\/[^/]+\.webp$/.test(src)) return {};
  const base = src.slice(0, -'.webp'.length);
  return { srcset: `${base}-480.webp 480w, ${base}-960.webp 960w, ${src} 1600w`, sizes };
};
