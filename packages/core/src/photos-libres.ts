// Flux de photos libres de droits (demande de Paul, 2026-10-07) : PEXELS et PIXABAY, jamais Unsplash (qui impose le
// lien direct vers ses serveurs). Le super admin évalue une photo candidate à la fois (/admin/retours, « Photos à
// découvrir ») : GARDER → la photo est téléchargée côté serveur, convertie en WebP (plusieurs largeurs, sans EXIF), hébergée
// chez nous (stockage « photos », dossier banque/libres/<sujet>/) et sa TRAÇABILITÉ est enregistrée (table photos_libres,
// migration 0028). Les sites n'utilisent que les photos hébergées chez nous, jamais un lien vers Pexels ou Pixabay.
//
// Ce module est pur (aucun appel réseau) : sujets et mots-clés par défaut, licences, lecture des réponses des API, filtres
// des candidates, limites de débit, construction de la traçabilité, chemins de stockage, CSV de conformité. Les appels
// aux API (clés PEXELS_API_KEY / PIXABAY_API_KEY, serveur seulement) sont dans apps/admin/src/lib/photos-libres.ts.
// Voir docs/photos-libres.md.

import { THEMES } from './themes';
import type { TraitementImages } from './modeles';

// ---------------------------------------------------------------------------------------------------------------
// Sujets et mots-clés
// ---------------------------------------------------------------------------------------------------------------

/** Sujets des visuels : thèmes actifs du cabinet (themes.ts) + « général » */
export const SUJETS_VISUELS: readonly { id: string; libelle: string; specialite: string }[] = [
  ...THEMES.filter((t) => t.statut === 'actif').map((t) => ({ id: t.id, libelle: t.court, specialite: t.specialite })),
  { id: 'general', libelle: 'Général', specialite: 'generale' },
];

export const estSujetVisuel = (id: unknown): id is string => typeof id === 'string' && SUJETS_VISUELS.some((s) => s.id === id);
export const libelleSujet = (id: string | null | undefined) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? '—';

/** Mots-clés de recherche par défaut (en anglais : langue des deux banques), modifiables dans l'admin (table photos_libres_mots_cles) */
export const MOTS_CLES_DEFAUT: Readonly<Record<string, readonly string[]>> = {
  sport: ['trail running', 'running shoes', 'hiking boots', 'runner feet', 'marathon'],
  enfant: ['child feet', 'baby first steps', 'kids shoes', 'toddler walking'],
  senior: ['elderly walking', 'walking cane', 'senior feet'],
  diabete: ['foot care', 'foot examination', 'healthy feet'],
  ongles: ['toenail care', 'pedicure tools', 'foot care'],
  semelles: ['orthotic insoles', 'footprint', 'shoe insole'],
  pedicurie: ['podiatrist', 'chiropodist', 'foot clinic', 'sterilized instruments'],
  general: ['barefoot', 'feet on grass', 'walking path'],
};

export const MOTS_CLES_MAX = 12;
const MOT_CLE = /^[a-z0-9][a-z0-9 '-]{1,39}$/;

/** Liste de mots-clés nettoyée : minuscules, espaces réduits, doublons retirés, 12 au plus, caractères simples seulement */
export function normaliserMotsCles(brut: unknown): string[] {
  const l = Array.isArray(brut) ? brut : typeof brut === 'string' ? brut.split(/[\n,;]/) : [];
  const propres = l.map((m) => String(m ?? '').toLowerCase().replace(/\s+/g, ' ').trim()).filter((m) => MOT_CLE.test(m));
  return [...new Set(propres)].slice(0, MOTS_CLES_MAX);
}

/** Mots-clés effectifs d'un sujet : ceux enregistrés en base s'il y en a, sinon ceux par défaut */
export function motsClesDuSujet(sujet: string, enBase: Readonly<Record<string, readonly string[]>> = {}): string[] {
  const b = normaliserMotsCles(enBase[sujet] ?? []);
  return b.length ? b : [...(MOTS_CLES_DEFAUT[sujet] ?? MOTS_CLES_DEFAUT.general)];
}

/**
 * Mots-clés d'EXPLORATION par sujet (demande de Paul, 2026-10-08 : « si on a déjà beaucoup d'images de tennis, passer à
 * d'autres : randonnée, etc. ») : activités et situations variées, ajoutées aux mots-clés du sujet pour élargir la banque.
 * Toujours des pieds, des chaussures ou la marche : jamais un sujet hors métier.
 */
export const MOTS_CLES_EXPLORATION: Readonly<Record<string, readonly string[]>> = {
  sport: [
    'hiking trail', 'mountain hiking boots', 'tennis court shoes', 'basketball sneakers', 'football cleats', 'rugby boots',
    'cycling shoes', 'dance shoes', 'yoga barefoot', 'swimming pool feet', 'climbing shoes', 'track spikes', 'nordic walking',
    'gym sneakers', 'beach running', 'ski boots',
  ],
  enfant: ['kids playing barefoot', 'child sneakers', 'kids running park', 'child sport shoes', 'family walk', 'kids dance class'],
  senior: ['senior hiking', 'elderly couple walking', 'senior garden', 'senior dance', 'comfortable shoes', 'senior stairs'],
  diabete: ['diabetic socks', 'blood sugar test', 'healthy walking', 'foot moisturizer', 'comfortable walking shoes'],
  ongles: ['nail clipper', 'foot spa', 'pedicure clinic', 'healthy toenails'],
  semelles: ['custom insoles', 'shoe fitting', 'arch support', 'gait analysis', 'shoe store'],
  pedicurie: ['medical clinic interior', 'foot massage', 'clinic hands gloves', 'foot treatment'],
  general: ['sand footprints', 'city walking', 'forest path walking', 'morning walk', 'feet relaxing'],
};

/** Toutes les requêtes possibles d'un sujet : ses mots-clés (base ou défaut), puis ceux d'exploration, sans doublon */
export function requetesDuSujet(sujet: string, enBase: Readonly<Record<string, readonly string[]>> = {}): string[] {
  return [...new Set([...motsClesDuSujet(sujet, enBase), ...(MOTS_CLES_EXPLORATION[sujet] ?? [])])];
}

/**
 * Requête suivante, pondérée par la COUVERTURE : plus une requête a déjà donné de photos gardées ou importées
 * (`dejaGardees[requete]`), moins elle est tirée (poids 1 / (1 + n)², une requête sans photo pèse 1, une à 3 photos 1/16).
 * Les requêtes trop souvent rejetées (`rejets[requete]` ≥ 8 sans aucune photo gardée) sont mises de côté tant qu'il en
 * reste d'autres. `r` : tirage dans [0, 1).
 */
export function choisirRequete(
  requetes: readonly string[],
  dejaGardees: Readonly<Record<string, number>> = {},
  r: number = Math.random(),
  rejets: Readonly<Record<string, number>> = {},
): string {
  if (!requetes.length) return '';
  const utiles = requetes.filter((q) => !((rejets[q] ?? 0) >= 8 && !(dejaGardees[q] ?? 0)));
  const l = utiles.length ? utiles : [...requetes];
  const poids = l.map((q) => 1 / (1 + (dejaGardees[q] ?? 0)) ** 2);
  const total = poids.reduce((a, b) => a + b, 0);
  let x = Math.min(Math.max(r, 0), 0.999999) * total;
  for (let i = 0; i < l.length; i++) { x -= poids[i]; if (x < 0) return l[i]; }
  return l[l.length - 1];
}

// ---------------------------------------------------------------------------------------------------------------
// Sources et licences
// ---------------------------------------------------------------------------------------------------------------

export const SOURCES_PHOTOS_LIBRES = ['pexels', 'pixabay'] as const;
export type SourcePhotoLibre = (typeof SOURCES_PHOTOS_LIBRES)[number];
export const estSourcePhotoLibre = (s: unknown): s is SourcePhotoLibre => (SOURCES_PHOTOS_LIBRES as readonly unknown[]).includes(s);

export type LicenceSource = {
  nom: string;
  /** Page officielle de la licence (lien enregistré avec chaque photo) */
  url: string;
  /** Variable d'environnement de la clé API (Vercel, serveur seulement) */
  variable: 'PEXELS_API_KEY' | 'PIXABAY_API_KEY';
  libelle: string;
  /** Limite de débit de l'API (requêtes par fenêtre) */
  limite: { requetes: number; fenetreMs: number };
};

export const LICENCES_SOURCES: Record<SourcePhotoLibre, LicenceSource> = {
  pexels: {
    nom: 'Licence Pexels', url: 'https://www.pexels.com/license/', variable: 'PEXELS_API_KEY', libelle: 'Pexels',
    // 200 requêtes par heure (limite par défaut de l'API) ; on garde une marge
    limite: { requetes: 180, fenetreMs: 3_600_000 },
  },
  pixabay: {
    nom: 'Pixabay Content License', url: 'https://pixabay.com/service/license-summary/', variable: 'PIXABAY_API_KEY', libelle: 'Pixabay',
    // 100 requêtes par minute ; on garde une marge
    limite: { requetes: 90, fenetreMs: 60_000 },
  },
};

/** Durée du cache des résultats de recherche (Pixabay l'exige : 24 h ; appliquée aussi à Pexels) */
export const CACHE_RECHERCHE_MS = 24 * 3_600_000;

/**
 * Version de la licence enregistrée avec la photo : les deux banques ne numérotent pas leurs licences ; on trace donc le
 * texte « en vigueur » au jour du téléchargement (la page officielle est enregistrée à côté).
 */
export const versionLicence = (telechargeLe: Date) => `texte en vigueur au ${telechargeLe.toISOString().slice(0, 10)}`;

/** Hôtes d'où une image peut être téléchargée côté serveur (garde contre les adresses arbitraires) */
export const HOTES_IMAGES: Record<SourcePhotoLibre, readonly string[]> = {
  pexels: ['images.pexels.com'],
  pixabay: ['pixabay.com', 'cdn.pixabay.com'],
};
/** Hôtes des pages des photos (traçabilité) */
const HOTES_PAGES: Record<SourcePhotoLibre, readonly string[]> = {
  pexels: ['www.pexels.com', 'pexels.com'],
  pixabay: ['pixabay.com'],
};

function hoteDe(url: string): string | null {
  try { const u = new URL(url); return u.protocol === 'https:' ? u.hostname : null; } catch { return null; }
}
export const urlImageAutorisee = (source: SourcePhotoLibre, url: string) => { const h = hoteDe(url); return Boolean(h && HOTES_IMAGES[source].includes(h)); };
export const urlPageAutorisee = (source: SourcePhotoLibre, url: string) => { const h = hoteDe(url); return Boolean(h && HOTES_PAGES[source].includes(h)); };

// ---------------------------------------------------------------------------------------------------------------
// Requêtes et réponses des API
// ---------------------------------------------------------------------------------------------------------------

export const PAR_PAGE = 30;
export const API_PEXELS = 'https://api.pexels.com/v1';
export const API_PIXABAY = 'https://pixabay.com/api/';

/** Recherche Pexels (la clé passe dans l'en-tête Authorization, jamais dans l'adresse) */
export function urlRecherchePexels(requete: string, page = 1, base = API_PEXELS): string {
  const q = new URLSearchParams({ query: requete, orientation: 'landscape', size: 'large', per_page: String(PAR_PAGE), page: String(Math.max(1, Math.floor(page))) });
  return `${base}/search?${q}`;
}
export const urlPhotoPexels = (id: string, base = API_PEXELS) => `${base}/photos/${encodeURIComponent(id)}`;

/** Recherche Pixabay (la clé est un paramètre de l'adresse : appel côté serveur seulement, adresse jamais renvoyée au navigateur) */
export function urlRecherchePixabay(cle: string, requete: string, page = 1, base = API_PIXABAY): string {
  const q = new URLSearchParams({
    key: cle, q: requete, image_type: 'photo', orientation: 'horizontal', min_width: '1600', safesearch: 'true',
    per_page: String(PAR_PAGE), page: String(Math.max(1, Math.floor(page))), lang: 'en',
  });
  return `${base}?${q}`;
}
export const urlPhotoPixabay = (cle: string, id: string, base = API_PIXABAY) => `${base}?${new URLSearchParams({ key: cle, id })}`;

/** Photo candidate, quelle que soit la source */
export type CandidatPhoto = {
  source: SourcePhotoLibre;
  idSource: string;
  largeur: number;
  hauteur: number;
  /** Vignette servie par la source, pour l'évaluation seulement (jamais utilisée sur un site) */
  apercu: string;
  /** Grande taille à télécharger si la photo est gardée */
  telechargement: string;
  auteur: string;
  auteurUrl: string | null;
  pageUrl: string;
  description: string;
  tags: string[];
};

export const cleCandidat = (c: Pick<CandidatPhoto, 'source' | 'idSource'>) => `${c.source}:${c.idSource}`;

const ID = /^[0-9]{1,20}$/;
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);
const s = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

type PexelsPhoto = { id?: unknown; width?: unknown; height?: unknown; url?: unknown; photographer?: unknown; photographer_url?: unknown; alt?: unknown; src?: Record<string, unknown> };

/** Une photo de l'API Pexels → candidate (null si incomplète ou hors des hôtes attendus) */
export function candidatPexels(p: PexelsPhoto): CandidatPhoto | null {
  const id = String(p?.id ?? '');
  const src = p?.src ?? {};
  // Grande taille : l'originale, bornée à 2400 px de large par le service d'images de Pexels
  const original = s(src.original, 500);
  const telechargement = original ? `${original}${original.includes('?') ? '&' : '?'}auto=compress&cs=tinysrgb&w=2400` : '';
  const c: CandidatPhoto = {
    source: 'pexels', idSource: id, largeur: n(p?.width), hauteur: n(p?.height),
    apercu: s(src.large, 500) || s(src.medium, 500), telechargement,
    auteur: s(p?.photographer, 120), auteurUrl: s(p?.photographer_url, 300) || null, pageUrl: s(p?.url, 300),
    description: s(p?.alt, 300), tags: [],
  };
  return ID.test(id) && c.apercu && urlImageAutorisee('pexels', c.apercu) && urlImageAutorisee('pexels', c.telechargement) && urlPageAutorisee('pexels', c.pageUrl) ? c : null;
}

type PixabayHit = { id?: unknown; imageWidth?: unknown; imageHeight?: unknown; pageURL?: unknown; user?: unknown; user_id?: unknown; tags?: unknown; webformatURL?: unknown; largeImageURL?: unknown };

/** Une photo de l'API Pixabay → candidate */
export function candidatPixabay(h: PixabayHit): CandidatPhoto | null {
  const id = String(h?.id ?? '');
  const user = s(h?.user, 120);
  const userId = String(h?.user_id ?? '');
  const c: CandidatPhoto = {
    source: 'pixabay', idSource: id, largeur: n(h?.imageWidth), hauteur: n(h?.imageHeight),
    apercu: s(h?.webformatURL, 500), telechargement: s(h?.largeImageURL, 500),
    auteur: user, auteurUrl: user && ID.test(userId) ? `https://pixabay.com/users/${encodeURIComponent(user)}-${userId}/` : null,
    pageUrl: s(h?.pageURL, 300), description: '',
    tags: s(h?.tags, 300).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12),
  };
  return ID.test(id) && urlImageAutorisee('pixabay', c.apercu) && urlImageAutorisee('pixabay', c.telechargement) && urlPageAutorisee('pixabay', c.pageUrl) ? c : null;
}

/** Réponse de recherche (ou d'une photo) → candidates valides */
export function candidatsDepuisReponse(source: SourcePhotoLibre, json: unknown): CandidatPhoto[] {
  const j = (json ?? {}) as { photos?: unknown; hits?: unknown; id?: unknown };
  if (source === 'pexels') {
    const l = Array.isArray(j.photos) ? j.photos : j.id !== undefined ? [j] : [];
    return l.map((p) => candidatPexels(p as PexelsPhoto)).filter((c): c is CandidatPhoto => c !== null);
  }
  const l = Array.isArray(j.hits) ? j.hits : [];
  return l.map((h) => candidatPixabay(h as PixabayHit)).filter((c): c is CandidatPhoto => c !== null);
}

// ---------------------------------------------------------------------------------------------------------------
// Filtre automatique des candidates
// ---------------------------------------------------------------------------------------------------------------

export const LARGEUR_MIN = 1600;
export const HAUTEUR_MIN = 900;

/** Orientation : paysage (≥ 1,2), carrée, portrait (≤ 0,85) */
export const orientation = (c: Pick<CandidatPhoto, 'largeur' | 'hauteur'>): 'paysage' | 'carree' | 'portrait' => {
  const r = c.hauteur ? c.largeur / c.hauteur : 0;
  return r >= 1.2 ? 'paysage' : r > 0.85 ? 'carree' : 'portrait';
};

/**
 * Candidates à montrer : trop petites écartées (grand côté < 1600 px ou petit côté < 900 px), doublons écartés (dans la
 * liste et déjà vues, gardées ou rejetées), paysage d'abord, puis carrées, puis portrait (ordre de la source conservé sinon).
 */
export function filtrerCandidats(liste: readonly CandidatPhoto[], dejaVues: ReadonlySet<string> = new Set()): CandidatPhoto[] {
  const vues = new Set(dejaVues);
  const ok: CandidatPhoto[] = [];
  for (const c of liste) {
    const cle = cleCandidat(c);
    if (vues.has(cle)) continue;
    vues.add(cle);
    if (Math.max(c.largeur, c.hauteur) < LARGEUR_MIN || Math.min(c.largeur, c.hauteur) < HAUTEUR_MIN) continue;
    ok.push(c);
  }
  const rang = { paysage: 0, carree: 1, portrait: 2 } as const;
  return ok.map((c, i) => ({ c, i })).sort((a, b) => rang[orientation(a.c)] - rang[orientation(b.c)] || a.i - b.i).map((x) => x.c);
}

// ---------------------------------------------------------------------------------------------------------------
// Limites de débit
// ---------------------------------------------------------------------------------------------------------------

/**
 * Peut-on appeler l'API ? `horodatages` : instants (ms) des appels récents. Renvoie la liste nettoyée (fenêtre glissante)
 * et la réponse ; l'appelant ajoute `maintenant` à la liste s'il appelle.
 */
export function peutAppeler(horodatages: readonly number[], source: SourcePhotoLibre, maintenant: number): { ok: boolean; recents: number[]; attenteMs: number } {
  const { requetes, fenetreMs } = LICENCES_SOURCES[source].limite;
  const recents = horodatages.filter((t) => maintenant - t < fenetreMs);
  const ok = recents.length < requetes;
  return { ok, recents, attenteMs: ok ? 0 : Math.max(0, fenetreMs - (maintenant - Math.min(...recents))) };
}

// ---------------------------------------------------------------------------------------------------------------
// Évaluation : garder / rejeter
// ---------------------------------------------------------------------------------------------------------------

export type EtiquetteDecouverte = { id: string; libelle: string; positive: boolean };

export const ETIQUETTES_DECOUVERTE: readonly EtiquetteDecouverte[] = [
  { id: 'parfaite', libelle: 'Parfaite', positive: true },
  { id: 'belle-lumiere', libelle: 'Belle lumière', positive: true },
  { id: 'bien-dans-le-sujet', libelle: 'Bien dans le sujet', positive: true },
  { id: 'trop-banque-images', libelle: 'Trop banque d’images', positive: false },
  { id: 'visage-visible', libelle: 'Visage visible', positive: false },
  { id: 'mal-cadree', libelle: 'Mal cadrée', positive: false },
  { id: 'hors-sujet', libelle: 'Hors sujet', positive: false },
  { id: 'laisse-croire-patient', libelle: 'Laisse croire à un patient', positive: false },
];

/** Étiquettes qui interdisent de garder la photo (charte : pas de visage reconnaissable, rien qui suggère un patient réel) */
export const ETIQUETTES_BLOQUANTES = ['visage-visible', 'laisse-croire-patient'] as const;

export const DECISIONS_PHOTO = ['garder', 'rejeter'] as const;
export type DecisionPhoto = (typeof DECISIONS_PHOTO)[number];

export const etiquettesDecouverteValides = (l: unknown): string[] =>
  [...new Set((Array.isArray(l) ? l : []).filter((e): e is string => ETIQUETTES_DECOUVERTE.some((x) => x.id === e)))].slice(0, 8);

/** Motif de refus d'une décision (null si elle est acceptable) */
export function refusDecision(decision: DecisionPhoto, etiquettes: readonly string[]): string | null {
  if (decision !== 'garder') return null;
  const bloquantes = etiquettes.filter((e) => (ETIQUETTES_BLOQUANTES as readonly string[]).includes(e));
  if (bloquantes.length) {
    return 'Charte : une photo avec un visage reconnaissable, ou qui laisse croire à un patient réel, ne peut pas être gardée. Rejetez-la.';
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Conversion, stockage et traçabilité
// ---------------------------------------------------------------------------------------------------------------

/** Largeurs WebP produites (jamais d'agrandissement) */
export const LARGEURS_WEBP = [640, 1280, 1920] as const;

export function largeursAProduire(largeurSource: number): number[] {
  const l = LARGEURS_WEBP.filter((w) => w <= largeurSource);
  return l.length ? [...l] : [Math.max(1, Math.round(largeurSource))];
}

/** Dossier du stockage « photos » (dossier banque/ réservé à l'admin, migration 0011) */
export const dossierPhotosLibres = (sujet: string) => `banque/libres/${sujet}`;
export const cheminPhotoLibre = (sujet: string, source: SourcePhotoLibre, idSource: string, largeur: number) =>
  `${dossierPhotosLibres(sujet)}/${source}-${idSource}-${largeur}.webp`;

/** Ligne de la table photos_libres (migration 0028) */
export type TracabilitePhoto = {
  source: SourcePhotoLibre;
  id_source: string;
  auteur_nom: string;
  auteur_url: string | null;
  page_url: string;
  licence: string;
  licence_version: string;
  licence_url: string;
  telecharge_le: string;
  mots_cles: string[];
  requete: string;
  sujet: string;
  chemin: string;
  url: string;
  largeurs: number[];
  largeur_originale: number;
  hauteur_originale: number;
  etiquettes: string[];
  statut: 'a_valider';
};

/**
 * Traçabilité obligatoire d'une photo gardée : source, identifiant, auteur, page, licence (nom, version, lien), date de
 * téléchargement, mots-clés, sujet, fichiers produits. Renvoie les erreurs si une information manque.
 */
export function construireTracabilite(e: {
  candidat: CandidatPhoto;
  sujet: string;
  motsCles: readonly string[];
  requete: string;
  telechargeLe: Date;
  largeurs: readonly number[];
  urlPrincipale: string;
  etiquettes?: readonly string[];
}): { ligne: TracabilitePhoto | null; erreurs: string[] } {
  const c = e.candidat;
  const erreurs: string[] = [];
  if (!estSourcePhotoLibre(c.source)) erreurs.push('Source inconnue.');
  if (!ID.test(c.idSource)) erreurs.push('Identifiant de la source invalide.');
  if (!estSujetVisuel(e.sujet)) erreurs.push('Sujet inconnu.');
  if (!c.auteur.trim()) erreurs.push('Auteur manquant.');
  if (estSourcePhotoLibre(c.source) && !urlPageAutorisee(c.source, c.pageUrl)) erreurs.push('Page de la photo invalide.');
  if (!e.largeurs.length) erreurs.push('Aucun fichier produit.');
  if (Number.isNaN(e.telechargeLe.getTime())) erreurs.push('Date de téléchargement invalide.');
  if (!/^https?:\/\//.test(e.urlPrincipale)) erreurs.push('Adresse du fichier hébergé invalide.');
  if (erreurs.length) return { ligne: null, erreurs };
  const lic = LICENCES_SOURCES[c.source];
  const grande = Math.max(...e.largeurs);
  return {
    erreurs,
    ligne: {
      source: c.source,
      id_source: c.idSource,
      auteur_nom: c.auteur.trim().slice(0, 120),
      auteur_url: c.auteurUrl,
      page_url: c.pageUrl,
      licence: lic.nom,
      licence_version: versionLicence(e.telechargeLe),
      licence_url: lic.url,
      telecharge_le: e.telechargeLe.toISOString(),
      mots_cles: normaliserMotsCles(e.motsCles),
      requete: normaliserMotsCles([e.requete])[0] ?? '',
      sujet: e.sujet,
      chemin: cheminPhotoLibre(e.sujet, c.source, c.idSource, grande),
      url: e.urlPrincipale,
      largeurs: [...e.largeurs].sort((a, b) => a - b),
      largeur_originale: c.largeur,
      hauteur_originale: c.hauteur,
      etiquettes: etiquettesDecouverteValides(e.etiquettes ?? []),
      statut: 'a_valider',
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Candidates gardées SANS import (demande de Paul, 2026-10-07 : « on utilise juste le lien, et une fois validée on peut
// importer ») : « Garder » n'enregistre que la traçabilité et l'aperçu fourni par la source (migration 0031) ; « Valider et
// importer » (/admin/photos) télécharge, convertit et héberge la photo. Seule une photo importée est utilisable.
// ---------------------------------------------------------------------------------------------------------------

/** Clé d'asset d'une candidate non importée : thèmes et hashtags saisis à « Garder », recopiés sur la photo importée */
export const cleCandidatePhoto = (source: SourcePhotoLibre, idSource: string) => `photo:libre:${source}-${idSource}`;

/** Aperçu de la source (vignette ou taille moyenne), affiché pendant l'évaluation seulement : https, hôtes de la source */
export const apercuAutorise = (source: SourcePhotoLibre, url: string | null | undefined): url is string => Boolean(url) && urlImageAutorisee(source, String(url));

/** Ligne d'une candidate gardée, non importée (migration 0031 : chemin, url, largeurs, telecharge_le vides) */
export type CandidateGardee = Omit<TracabilitePhoto, 'chemin' | 'url' | 'largeurs' | 'telecharge_le'> & {
  chemin: null; url: null; largeurs: number[]; telecharge_le: null; importe_le: null; apercu_url: string;
};

/**
 * Traçabilité d'une candidate gardée sans téléchargement : source, identifiant, auteur, page, licence (version datée du
 * jour où elle est gardée ; redatée à l'import), mots-clés, requête, sujet, dimensions d'origine et aperçu de la source.
 */
export function construireCandidate(e: {
  candidat: CandidatPhoto;
  sujet: string;
  motsCles: readonly string[];
  requete: string;
  gardeLe: Date;
  etiquettes?: readonly string[];
}): { ligne: CandidateGardee | null; erreurs: string[] } {
  const c = e.candidat;
  const erreurs: string[] = [];
  if (!estSourcePhotoLibre(c.source)) erreurs.push('Source inconnue.');
  if (!ID.test(c.idSource)) erreurs.push('Identifiant de la source invalide.');
  if (!estSujetVisuel(e.sujet)) erreurs.push('Sujet inconnu.');
  if (!c.auteur.trim()) erreurs.push('Auteur manquant.');
  if (estSourcePhotoLibre(c.source) && !urlPageAutorisee(c.source, c.pageUrl)) erreurs.push('Page de la photo invalide.');
  if (estSourcePhotoLibre(c.source) && !apercuAutorise(c.source, c.apercu)) erreurs.push('Aperçu de la source invalide.');
  if (!(c.largeur > 0 && c.hauteur > 0)) erreurs.push('Dimensions d’origine inconnues.');
  if (Number.isNaN(e.gardeLe.getTime())) erreurs.push('Date invalide.');
  if (erreurs.length) return { ligne: null, erreurs };
  const lic = LICENCES_SOURCES[c.source];
  return {
    erreurs,
    ligne: {
      source: c.source,
      id_source: c.idSource,
      auteur_nom: c.auteur.trim().slice(0, 120),
      auteur_url: c.auteurUrl,
      page_url: c.pageUrl,
      licence: lic.nom,
      licence_version: versionLicence(e.gardeLe),
      licence_url: lic.url,
      telecharge_le: null,
      importe_le: null,
      mots_cles: normaliserMotsCles(e.motsCles),
      requete: normaliserMotsCles([e.requete])[0] ?? '',
      sujet: e.sujet,
      chemin: null,
      url: null,
      largeurs: [],
      largeur_originale: c.largeur,
      hauteur_originale: c.hauteur,
      etiquettes: etiquettesDecouverteValides(e.etiquettes ?? []),
      apercu_url: c.apercu,
      statut: 'a_valider',
    },
  };
}

/**
 * Image GÉNÉRÉE PAR IA (images-generees.ts, dossier banque/ia/ ; adresse du stockage, chemin ou clé d'inventaire photo:banque/ia/…) :
 * étiquette « Image générée » dans l'admin, jamais dans la galerie du cabinet (kits-images.ts, jeux-photos.ts).
 */
export const estImageGeneree = (urlOuCle: string | null | undefined) => /(^|\/|photo:)banque\/ia\//.test(String(urlOuCle ?? ''));

/**
 * Image de DÉMONSTRATION (kit-demo.ts, demande de Paul du 2026-10-08) : image générée d'un cabinet ou d'un praticien FICTIF,
 * rangée dans banque/ia/demo-<profession>/. Elle sert UNIQUEMENT aux aperçus (Studio, atelier, recettes, dégustation, kits,
 * parcours) ; jamais dans la banque des sites, jamais dans un brouillon enregistré ni dans un site publié (kit-demo.ts).
 */
export const estImageDemo = (urlOuCle: string | null | undefined) => /(^|\/|photo:)banque\/ia\/demo-[a-z0-9-]+\//.test(String(urlOuCle ?? ''));

/** Photo importée chez nous (fichier hébergé) : la seule forme utilisable par les jeux, le générateur et les sites */
export const estPhotoImportee = (p: { statut: string; chemin?: string | null; url?: string | null }) => p.statut === 'validee' && Boolean(p.chemin) && Boolean(p.url);

export const STATUTS_PHOTO_LIBRE = ['a_valider', 'validee', 'retiree'] as const;
export type StatutPhotoLibre = (typeof STATUTS_PHOTO_LIBRE)[number];
export const LIBELLES_STATUTS_PHOTO_LIBRE: Record<StatutPhotoLibre, string> = { a_valider: 'À valider', validee: 'Validée', retiree: 'Retirée' };

// ---------------------------------------------------------------------------------------------------------------
// Export CSV des licences (conformité)
// ---------------------------------------------------------------------------------------------------------------

export type LigneLicenceCsv = {
  fournisseur: string;
  identifiant: string;
  auteur: string;
  page: string;
  licence: string;
  version: string;
  lienLicence: string;
  date: string;
  sujet: string;
  fichier: string;
  statut: string;
  /** Date d'import chez nous (vide : candidate non importée, aperçu de la source seulement) */
  importe?: string;
};

const COLONNES_CSV: [keyof LigneLicenceCsv, string][] = [
  ['fournisseur', 'Fournisseur'], ['identifiant', 'Identifiant'], ['auteur', 'Auteur'], ['page', 'Page de la photo'], ['licence', 'Licence'],
  ['version', 'Version'], ['lienLicence', 'Lien de la licence'], ['date', 'Date'], ['sujet', 'Sujet / site'], ['fichier', 'Fichier hébergé'], ['statut', 'Statut'],
  ['importe', 'Importée le'],
];

const cellule = (v: string) => {
  // Neutralise les formules des tableurs (cellule commençant par = + - @)
  const t = String(v ?? '').replace(/\r?\n/g, ' ');
  const sur = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return /[";\n]/.test(sur) ? `"${sur.replace(/"/g, '""')}"` : sur;
};

/** CSV (séparateur point-virgule, BOM UTF-8 pour les tableurs français) */
export function csvLicences(lignes: readonly LigneLicenceCsv[]): string {
  const entete = COLONNES_CSV.map(([, t]) => cellule(t)).join(';');
  const corps = lignes.map((l) => COLONNES_CSV.map(([k]) => cellule(l[k] ?? '')).join(';'));
  return `﻿${[entete, ...corps].join('\r\n')}\r\n`;
}

// ---------------------------------------------------------------------------------------------------------------
// Traitements de teinte (aperçu)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Traitements d'image appliqués par les modèles de site (apps/sites/src/layouts/Gabarit.astro, data-images) : la photo
 * hébergée reste neutre, le site applique le traitement de sa gamme / de son modèle comme pour les autres photos.
 */
export const APERCUS_TRAITEMENTS_IMAGES: readonly { id: TraitementImages; libelle: string; filtre: string }[] = [
  { id: 'naturel', libelle: 'Naturel', filtre: 'none' },
  { id: 'chaud', libelle: 'Chaud', filtre: 'sepia(0.22) saturate(1.1) hue-rotate(-8deg) contrast(1.02)' },
  { id: 'doux', libelle: 'Doux', filtre: 'saturate(0.72) brightness(1.06) contrast(0.92)' },
  { id: 'contraste', libelle: 'Contrasté', filtre: 'contrast(1.12) saturate(0.88) brightness(0.96)' },
];
