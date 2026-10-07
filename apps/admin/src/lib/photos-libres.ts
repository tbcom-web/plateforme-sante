import 'server-only';
import {
  API_PEXELS, API_PIXABAY, CACHE_RECHERCHE_MS, candidatsDepuisReponse, LICENCES_SOURCES, peutAppeler, SOURCES_PHOTOS_LIBRES, urlImageAutorisee,
  urlPhotoPexels, urlPhotoPixabay, urlRecherchePexels, urlRecherchePixabay, type CandidatPhoto, type SourcePhotoLibre,
} from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Appels aux API Pexels et Pixabay (serveur seulement). Clés : variables d'environnement Vercel PEXELS_API_KEY et
// PIXABAY_API_KEY, jamais exposées au navigateur (pas de préfixe NEXT_PUBLIC_, aucune adresse contenant la clé renvoyée).
// Clé absente : la source est simplement indisponible (« Clé API à configurer »), le reste de l'admin fonctionne.
// Débit : fenêtre glissante par instance (peutAppeler) + cache des recherches 24 h (exigence Pixabay) : cache mémoire de
// l'instance et cache de données de Next (fetch revalidate), partagé entre instances sur Vercel. Voir docs/photos-libres.md.

const cle = (s: SourcePhotoLibre) => (process.env[LICENCES_SOURCES[s].variable] ?? '').trim();

/** Sources dont la clé est configurée (booléens seulement : la clé ne sort jamais du serveur) */
export function sourcesConfigurees(): Record<SourcePhotoLibre, boolean> {
  return Object.fromEntries(SOURCES_PHOTOS_LIBRES.map((s) => [s, Boolean(cle(s))])) as Record<SourcePhotoLibre, boolean>;
}

const appels: Record<SourcePhotoLibre, number[]> = { pexels: [], pixabay: [] };
const cache = new Map<string, { expire: number; candidats: CandidatPhoto[] }>();

export class ErreurSource extends Error {}

async function appeler(source: SourcePhotoLibre, url: string, cleCache: string): Promise<CandidatPhoto[]> {
  const enCache = cache.get(cleCache);
  if (enCache && enCache.expire > Date.now()) return enCache.candidats;
  const k = cle(source);
  if (!k) throw new ErreurSource('Clé API à configurer');
  const d = peutAppeler(appels[source], source, Date.now());
  appels[source] = d.recents;
  if (!d.ok) throw new ErreurSource(`Limite de ${LICENCES_SOURCES[source].libelle} atteinte : réessayez dans ${Math.ceil(d.attenteMs / 60_000)} min.`);
  appels[source].push(Date.now());
  const r = await fetch(url, {
    headers: source === 'pexels' ? { Authorization: k } : {},
    // Cache de données de Next : 24 h (même requête = même réponse, sans nouvel appel à l'API)
    next: { revalidate: CACHE_RECHERCHE_MS / 1000 },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!r) throw new ErreurSource(`${LICENCES_SOURCES[source].libelle} ne répond pas. Réessayez plus tard.`);
  if (r.status === 401 || r.status === 403) throw new ErreurSource(`Clé ${LICENCES_SOURCES[source].libelle} refusée : vérifiez ${LICENCES_SOURCES[source].variable} dans Vercel.`);
  if (r.status === 429) throw new ErreurSource(`Limite de ${LICENCES_SOURCES[source].libelle} atteinte : réessayez plus tard.`);
  if (!r.ok) throw new ErreurSource(`${LICENCES_SOURCES[source].libelle} : erreur ${r.status}.`);
  const candidats = candidatsDepuisReponse(source, await r.json().catch(() => null));
  cache.set(cleCache, { expire: Date.now() + CACHE_RECHERCHE_MS, candidats });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return candidats;
}

/** Recherche (page de 30 candidates, non filtrées) */
export function rechercher(source: SourcePhotoLibre, requete: string, page: number): Promise<CandidatPhoto[]> {
  const url = source === 'pexels' ? urlRecherchePexels(requete, page, API_PEXELS) : urlRecherchePixabay(cle(source), requete, page, API_PIXABAY);
  return appeler(source, url, `r:${source}:${requete}:${page}`);
}

/** Détail d'une photo, relu à la source (les informations envoyées par le navigateur ne font jamais foi) */
export async function detailPhoto(source: SourcePhotoLibre, id: string): Promise<CandidatPhoto | null> {
  if (!/^[0-9]{1,20}$/.test(id)) return null;
  const url = source === 'pexels' ? urlPhotoPexels(id, API_PEXELS) : urlPhotoPixabay(cle(source), id, API_PIXABAY);
  const l = await appeler(source, url, `d:${source}:${id}`);
  return l.find((c) => c.idSource === id) ?? null;
}

const TAILLE_MAX = 30 * 1024 * 1024;

/** Téléchargement de la grande taille (hôtes de la source seulement, 30 Mo au plus) */
export async function telechargerImage(c: CandidatPhoto): Promise<Buffer> {
  // Redirections suivies à la main : chaque adresse doit rester sur un hôte d'images de la source
  let url = c.telechargement;
  let r: Response | null = null;
  for (let i = 0; i < 4; i++) {
    if (!urlImageAutorisee(c.source, url)) throw new ErreurSource('Adresse d’image inattendue.');
    r = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(30_000) }).catch(() => null);
    const suite = r && r.status >= 300 && r.status < 400 ? r.headers.get('location') : null;
    if (!suite) break;
    url = new URL(suite, url).toString();
    r = null;
  }
  if (!r || !r.ok) throw new ErreurSource('Téléchargement impossible. Réessayez.');
  if (!String(r.headers.get('content-type') ?? '').startsWith('image/')) throw new ErreurSource('Le fichier reçu n’est pas une image.');
  const taille = Number(r.headers.get('content-length') ?? 0);
  if (taille > TAILLE_MAX) throw new ErreurSource('Image trop lourde.');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > TAILLE_MAX) throw new ErreurSource('Image trop lourde.');
  return buf;
}

/** sharp, chargé à la demande (module CommonJS : export par défaut selon l'empaquetage) */
async function chargerSharp() {
  const m = (await import('sharp')) as unknown as { default?: typeof import('sharp') } & typeof import('sharp');
  return typeof m.default === 'function' ? m.default : m;
}

/**
 * Conversion WebP en plusieurs largeurs avec sharp (dépendance de Next, déjà installée avec lui) : orientation EXIF
 * appliquée puis TOUTES les métadonnées retirées (sharp n'en recopie aucune par défaut), jamais d'agrandissement.
 */
export async function convertirWebp(source: Buffer, largeurs: readonly number[]): Promise<{ largeur: number; donnees: Buffer }[]> {
  const sharp = await chargerSharp();
  const sorties: { largeur: number; donnees: Buffer }[] = [];
  for (const l of largeurs) {
    const donnees = await sharp(source, { failOn: 'error', limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: l, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toBuffer();
    sorties.push({ largeur: l, donnees });
  }
  return sorties;
}

export async function largeurImage(source: Buffer): Promise<number> {
  const sharp = await chargerSharp();
  const m = await sharp(source).metadata();
  // Orientation EXIF 5 à 8 : largeur et hauteur échangées après rotation
  return (m.orientation ?? 1) >= 5 ? m.height ?? 0 : m.width ?? 0;
}

/** Mots-clés enregistrés par sujet (migration 0028) ; {} si la table manque */
export async function getMotsClesEnBase(): Promise<{ motsCles: Record<string, string[]>; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('photos_libres_mots_cles').select('sujet, mots_cles');
  if (error) return { motsCles: {}, migrationManquante: true };
  return { motsCles: Object.fromEntries((data ?? []).map((l: { sujet: string; mots_cles: string[] | null }) => [l.sujet, l.mots_cles ?? []])), migrationManquante: false };
}

export type PhotoLibre = {
  id: string; source: SourcePhotoLibre; idSource: string; auteur: string; auteurUrl: string | null; pageUrl: string; licence: string; licenceVersion: string;
  licenceUrl: string; telechargeLe: string; motsCles: string[]; sujet: string; chemin: string; url: string; largeurs: number[]; statut: 'a_valider' | 'validee' | 'retiree';
};

export const COLONNES_PHOTOS_LIBRES = 'id, source, id_source, auteur_nom, auteur_url, page_url, licence, licence_version, licence_url, telecharge_le, mots_cles, sujet, chemin, url, largeurs, statut';

type LignePhotoLibre = {
  id: string; source: SourcePhotoLibre; id_source: string; auteur_nom: string; auteur_url: string | null; page_url: string; licence: string; licence_version: string;
  licence_url: string; telecharge_le: string; mots_cles: string[] | null; sujet: string; chemin: string; url: string; largeurs: number[] | null; statut: PhotoLibre['statut'];
};

export const photoLibreDepuisLigne = (l: LignePhotoLibre): PhotoLibre => ({
  id: l.id, source: l.source, idSource: l.id_source, auteur: l.auteur_nom, auteurUrl: l.auteur_url, pageUrl: l.page_url, licence: l.licence, licenceVersion: l.licence_version,
  licenceUrl: l.licence_url, telechargeLe: l.telecharge_le, motsCles: l.mots_cles ?? [], sujet: l.sujet, chemin: l.chemin, url: l.url, largeurs: l.largeurs ?? [], statut: l.statut,
});

/** Photos gardées (traçabilité) ; migrationManquante si la table 0028 n'existe pas encore */
export async function getPhotosLibres(): Promise<{ photos: PhotoLibre[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('photos_libres').select(COLONNES_PHOTOS_LIBRES).order('created_at', { ascending: false }).limit(2000);
  if (error) return { photos: [], migrationManquante: true };
  return { photos: ((data ?? []) as LignePhotoLibre[]).map(photoLibreDepuisLigne), migrationManquante: false };
}
