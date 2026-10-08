import 'server-only';
import { cache as memoRequete } from 'react';
import {
  API_PEXELS, API_PIXABAY, CACHE_RECHERCHE_MS, candidatsDepuisReponse, cheminPhotoLibre, construireTracabilite, largeursAProduire, LICENCES_SOURCES, motsClesDuSujet,
  peutAppeler, SOURCES_PHOTOS_LIBRES, urlImageAutorisee, urlPhotoPexels, urlPhotoPixabay, urlRecherchePexels, urlRecherchePixabay, type CandidatPhoto, type SourcePhotoLibre,
  type TracabilitePhoto,
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
async function getMotsClesEnBaseSansMemo(): Promise<{ motsCles: Record<string, string[]>; migrationManquante: boolean }> {
  const supabase = await createClient();
  const [{ data, error }, { data: parProfession }] = await Promise.all([
    supabase.from('photos_libres_mots_cles').select('sujet, mots_cles'),
    // Autres professions (migration 0049) : clé « profession/thème » (recherche-photos-professions.ts, cleMotsCles) ; absente : ignorée
    supabase.from('photos_libres_mots_cles_professions').select('profession, theme, mots_cles'),
  ]);
  if (error) return { motsCles: {}, migrationManquante: true };
  return {
    motsCles: Object.fromEntries([
      ...(data ?? []).map((l: { sujet: string; mots_cles: string[] | null }) => [l.sujet, l.mots_cles ?? []] as const),
      ...((parProfession ?? []) as { profession: string; theme: string; mots_cles: string[] | null }[]).map((l) => [`${l.profession}/${l.theme}`, l.mots_cles ?? []] as const),
    ]),
    migrationManquante: false,
  };
}
export const getMotsClesEnBase = memoRequete(getMotsClesEnBaseSansMemo);

/**
 * Photo libre gardée. Candidate NON importée (migration 0031) : chemin / url vides, aperçu servi par la source (apercuUrl)
 * pendant l'évaluation seulement. Importée : fichiers WebP hébergés chez nous (url), date d'import.
 */
export type PhotoLibre = {
  /** « ia » : image générée par IA importée par Paul (migration 0040, images-generees.ts) */
  id: string; source: SourcePhotoLibre | 'ia'; idSource: string; auteur: string; auteurUrl: string | null; pageUrl: string | null; licence: string; licenceVersion: string;
  licenceUrl: string | null; telechargeLe: string | null; motsCles: string[]; requete: string; sujet: string; chemin: string | null; url: string | null; largeurs: number[];
  largeurOriginale: number; hauteurOriginale: number; etiquettes: string[]; apercuUrl: string | null; importeLe: string | null; statut: 'a_valider' | 'validee' | 'retiree';
  /** Image générée : outil, prompt, conditions de l'outil, date de génération (null pour Pexels / Pixabay ou sans 0040) */
  iaOutil?: string | null; iaPrompt?: string | null; iaConditions?: string | null; iaGenereLe?: string | null;
};

const COLONNES_0028 = 'id, source, id_source, auteur_nom, auteur_url, page_url, licence, licence_version, licence_url, telecharge_le, mots_cles, requete, sujet, chemin, url, largeurs, largeur_originale, hauteur_originale, etiquettes, statut';
export const COLONNES_PHOTOS_LIBRES = `${COLONNES_0028}, apercu_url, importe_le`;
/** Colonnes des images générées (migration 0040) */
export const COLONNES_0040 = `${COLONNES_PHOTOS_LIBRES}, ia_outil, ia_prompt, ia_conditions, ia_genere_le`;

type LignePhotoLibre = {
  id: string; source: SourcePhotoLibre | 'ia'; id_source: string; auteur_nom: string; auteur_url: string | null; page_url: string | null; licence: string; licence_version: string;
  licence_url: string | null; telecharge_le: string | null;
  ia_outil?: string | null; ia_prompt?: string | null; ia_conditions?: string | null; ia_genere_le?: string | null; mots_cles: string[] | null; requete?: string | null; sujet: string; chemin: string | null; url: string | null; largeurs: number[] | null;
  largeur_originale?: number | null; hauteur_originale?: number | null; etiquettes?: string[] | null; apercu_url?: string | null; importe_le?: string | null; statut: PhotoLibre['statut'];
};

export const photoLibreDepuisLigne = (l: LignePhotoLibre): PhotoLibre => ({
  id: l.id, source: l.source, idSource: l.id_source, auteur: l.auteur_nom, auteurUrl: l.auteur_url, pageUrl: l.page_url, licence: l.licence, licenceVersion: l.licence_version,
  licenceUrl: l.licence_url, telechargeLe: l.telecharge_le, motsCles: l.mots_cles ?? [], requete: l.requete ?? '', sujet: l.sujet, chemin: l.chemin, url: l.url, largeurs: l.largeurs ?? [],
  largeurOriginale: l.largeur_originale ?? 0, hauteurOriginale: l.hauteur_originale ?? 0, etiquettes: l.etiquettes ?? [], apercuUrl: l.apercu_url ?? null,
  // Avant 0031, toute photo gardée était importée : date d'import = date de téléchargement
  importeLe: l.importe_le ?? (l.chemin ? l.telecharge_le : null), statut: l.statut,
  iaOutil: l.ia_outil ?? null, iaPrompt: l.ia_prompt ?? null, iaConditions: l.ia_conditions ?? null, iaGenereLe: l.ia_genere_le ?? null,
});

/**
 * Photos gardées (traçabilité). migrationManquante : table 0028 absente ; migration0031 : colonnes de l'import différé
 * absentes (lecture sans elles, « Garder » demande d'exécuter 0031).
 */
async function getPhotosLibresSansMemo(): Promise<{ photos: PhotoLibre[]; migrationManquante: boolean; migration0031: boolean; migration0040: boolean }> {
  const supabase = await createClient();
  const lire = (colonnes: string) => supabase.from('photos_libres').select(colonnes).order('created_at', { ascending: false }).limit(2000);
  // Colonnes des images générées (0040), sinon celles de l'import différé (0031), sinon celles de 0028
  let { data, error } = await lire(COLONNES_0040);
  let migration0040 = false, migration0031 = false;
  if (error) { migration0040 = true; ({ data, error } = await lire(COLONNES_PHOTOS_LIBRES)); }
  if (error) { migration0031 = true; ({ data, error } = await lire(COLONNES_0028)); }
  if (error) return { photos: [], migrationManquante: true, migration0031, migration0040 };
  return { photos: ((data ?? []) as unknown as LignePhotoLibre[]).map(photoLibreDepuisLigne), migrationManquante: false, migration0031, migration0040 };
}
export const getPhotosLibres = memoRequete(getPhotosLibresSansMemo);

export const MIGRATION_0031 = 'Migration 0031 à exécuter (supabase/migrations/0031_photos_libres_import_differe.sql).';
export const MIGRATION_0040 = 'Migration à exécuter (supabase/migrations/0040_images_generees.sql) : les images générées ne peuvent pas encore être importées.';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * IMPORT d'une photo validée (« Valider et importer », /admin/photos) : relue à la source côté serveur (les informations
 * enregistrées ne font pas foi pour le fichier), téléchargée, convertie en WebP 640 / 1280 / 1920 px au plus sans EXIF,
 * envoyée dans photos/banque/libres/<sujet>/. Renvoie la traçabilité complète (date d'import = date de téléchargement).
 * `introuvable` : la photo n'existe plus à la source.
 */
export async function importerDepuisSource(supabase: Supabase, e: { source: SourcePhotoLibre; idSource: string; sujet: string; requete: string; etiquettes: string[] }):
  Promise<{ ok: true; ligne: TracabilitePhoto; candidat: CandidatPhoto } | { ok: false; message: string; introuvable?: boolean }> {
  let candidat: CandidatPhoto | null;
  try {
    candidat = await detailPhoto(e.source, e.idSource);
  } catch (err) {
    return { ok: false, message: err instanceof ErreurSource ? err.message : 'Source injoignable. Réessayez.' };
  }
  if (!candidat) return { ok: false, introuvable: true, message: `Photo introuvable chez ${LICENCES_SOURCES[e.source].libelle} (retirée par son auteur ?) : elle est marquée « retirée », rien n'a été importé.` };
  let original: Buffer;
  try {
    original = await telechargerImage(candidat);
  } catch (err) {
    return { ok: false, message: err instanceof ErreurSource ? err.message : 'Téléchargement impossible. Réessayez.' };
  }
  let largeurs: number[];
  let fichiers: { largeur: number; donnees: Buffer }[];
  try {
    largeurs = largeursAProduire(await largeurImage(original));
    fichiers = await convertirWebp(original, largeurs);
  } catch (err) {
    console.error('Photos libres : conversion WebP impossible', err);
    return { ok: false, message: 'Conversion WebP impossible sur le serveur (sharp). Réessayez ; si cela persiste, prévenez Claude.' };
  }
  const stockage = supabase.storage.from('photos');
  for (const f of fichiers) {
    // Sans « upsert » : le remplacement exigerait en plus un droit de lecture sur storage.objects. Un fichier déjà présent
    // (même photo, même largeur) est identique : on le garde.
    const { error } = await stockage.upload(cheminPhotoLibre(e.sujet, e.source, e.idSource, f.largeur), f.donnees, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    if (error && !/exist|duplicate/i.test(error.message)) {
      console.error('Photos libres : envoi dans le stockage', error);
      return { ok: false, message: `Envoi dans le stockage impossible : ${error.message}. Vérifiez que la migration 0030 (droits du dossier banque/) est exécutée.` };
    }
  }
  const url = stockage.getPublicUrl(cheminPhotoLibre(e.sujet, e.source, e.idSource, Math.max(...largeurs))).data.publicUrl;
  const { motsCles } = await getMotsClesEnBase();
  const { ligne, erreurs } = construireTracabilite({
    candidat, sujet: e.sujet, motsCles: motsClesDuSujet(e.sujet, motsCles), requete: e.requete, telechargeLe: new Date(), largeurs, urlPrincipale: url, etiquettes: e.etiquettes,
  });
  if (!ligne) return { ok: false, message: `Traçabilité incomplète : ${erreurs.join(' ')}` };
  return { ok: true, ligne, candidat };
}
