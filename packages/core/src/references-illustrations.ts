// Références d'illustration (demande de Paul, 2026-10-07) : depuis la vue agrandie d'une illustration, d'une icône ou d'un
// héros (/admin/illustrations), « Chercher des références » interroge des moteurs d'images LIBRES (Wikimedia Commons,
// Openverse, Pexels, Pixabay ; Google Programmable Search seulement si GOOGLE_CSE_KEY et GOOGLE_CSE_ID sont configurées —
// jamais de lecture de pages Google Images). Paul coche les images qui l'inspirent (+ « ce qui m'inspire » et un texte
// court) : elles deviennent des INSPIRATIONS liées à l'élément (table inspirations, colonnes de la migration 0033 ;
// vignette ≤ 400 px WebP dans le bucket PRIVÉ « inspirations »). RÉFÉRENCE D'INSPIRATION UNIQUEMENT : jamais copiée ni
// décalquée ; on crée notre propre illustration (agent graphiste-sante, retours/references-illustrations.json).
//
// Ce module est pur : sources et limites, adresses des API, lecture des réponses (une fonction par API, testée sur des
// réponses enregistrées en fixtures), filtrage, relance par lots de 5 (pagination, rotation des sources, variantes de
// requête, mémoire des images vues ou écartées), validation d'un choix, export public. Les appels réseau sont dans
// apps/admin/src/lib/references-illustrations.ts. Voir docs/references-illustrations.md.

import { variantesRequete } from './dictionnaire-metier';
import { hashtagsValides } from './hashtags';
import { estSujetVisuel } from './photos-libres';

export const REGLE_REFERENCES = 'Référence d’inspiration uniquement : jamais copiée ni décalquée ; on crée notre propre illustration.';

// ---------------------------------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------------------------------

export const SOURCES_REFERENCES = ['wikimedia', 'openverse', 'pexels', 'pixabay', 'google'] as const;
export type SourceReference = (typeof SOURCES_REFERENCES)[number];
export const estSourceReference = (s: unknown): s is SourceReference => (SOURCES_REFERENCES as readonly unknown[]).includes(s);

export type Limite = { requetes: number; fenetreMs: number };

export type InfoSourceReference = {
  libelle: string;
  /** Variables d'environnement requises (Vercel, serveur seulement) ; [] = sans clé */
  variables: readonly string[];
  /** Limites de débit appliquées par l'admin (marges sous celles des services) */
  limites: readonly Limite[];
  /** Images par page demandée */
  parPage: number;
  /** Dernière page autorisée (au-delà : source épuisée pour la requête) */
  pageMax: number;
  /** Hôtes des vignettes (téléchargées côté serveur pour la copie réduite) ; « .x.com » = sous-domaines */
  hotesVignettes: readonly string[];
  /** Hôtes des pages d'origine ; null = toute adresse https (Openverse, Google : pages de sites tiers) */
  hotesPages: readonly string[] | null;
  /** Licence affichée quand la source n'en donne pas par image */
  licenceParDefaut: { nom: string; url: string | null } | null;
};

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

export const INFOS_SOURCES_REFERENCES: Record<SourceReference, InfoSourceReference> = {
  wikimedia: {
    libelle: 'Wikimedia Commons', variables: [], limites: [{ requetes: 30, fenetreMs: MINUTE }, { requetes: 1000, fenetreMs: JOUR }],
    parPage: 20, pageMax: 10, hotesVignettes: ['upload.wikimedia.org'], hotesPages: ['commons.wikimedia.org'], licenceParDefaut: null,
  },
  openverse: {
    // Accès anonyme : quelques requêtes par minute et environ 200 par jour ; on reste en dessous
    libelle: 'Openverse', variables: [], limites: [{ requetes: 4, fenetreMs: MINUTE }, { requetes: 150, fenetreMs: JOUR }],
    parPage: 20, pageMax: 10, hotesVignettes: ['api.openverse.org'], hotesPages: null, licenceParDefaut: null,
  },
  pexels: {
    libelle: 'Pexels', variables: ['PEXELS_API_KEY'], limites: [{ requetes: 40, fenetreMs: HEURE }],
    parPage: 20, pageMax: 10, hotesVignettes: ['images.pexels.com'], hotesPages: ['www.pexels.com', 'pexels.com'],
    licenceParDefaut: { nom: 'Licence Pexels', url: 'https://www.pexels.com/license/' },
  },
  pixabay: {
    libelle: 'Pixabay', variables: ['PIXABAY_API_KEY'], limites: [{ requetes: 30, fenetreMs: MINUTE }],
    parPage: 20, pageMax: 10, hotesVignettes: ['pixabay.com', 'cdn.pixabay.com'], hotesPages: ['pixabay.com'],
    licenceParDefaut: { nom: 'Pixabay Content License', url: 'https://pixabay.com/service/license-summary/' },
  },
  google: {
    // Programmable Search (Custom Search JSON API) : 100 requêtes gratuites par jour ; on en garde 10 de marge
    libelle: 'Google (Programmable Search)', variables: ['GOOGLE_CSE_KEY', 'GOOGLE_CSE_ID'], limites: [{ requetes: 5, fenetreMs: MINUTE }, { requetes: 90, fenetreMs: JOUR }],
    parPage: 10, pageMax: 5, hotesVignettes: ['.gstatic.com'], hotesPages: null,
    licenceParDefaut: { nom: 'À vérifier sur la page (filtre Creative Commons de Google)', url: null },
  },
};

/** Quota quotidien gratuit de Google (affiché avec le reste estimé) */
export const QUOTA_GOOGLE_JOUR = 100;

/** Durée du cache des recherches (même requête = aucun nouvel appel) */
export const CACHE_REFERENCES_MS = 24 * HEURE;

/** Identifiant d'application envoyé à Wikimedia (User-Agent policy : nom, version, contact public) */
export const USER_AGENT_REFERENCES = 'PlateformeSanteAdmin/1.0 (https://github.com/tbcom-web/plateforme-sante; internal illustration references)';

function hote(url: unknown): string | null {
  if (typeof url !== 'string' || url.length > 2000) return null;
  try { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password ? u.hostname : null; } catch { return null; }
}
const hoteDans = (h: string, liste: readonly string[]) => liste.some((x) => (x.startsWith('.') ? h.endsWith(x) && h.length > x.length : h === x));

export const vignetteAutorisee = (source: SourceReference, url: unknown) => { const h = hote(url); return Boolean(h && hoteDans(h, INFOS_SOURCES_REFERENCES[source].hotesVignettes)); };
export const pageAutorisee = (source: SourceReference, url: unknown) => {
  const h = hote(url);
  const l = INFOS_SOURCES_REFERENCES[source].hotesPages;
  return Boolean(h && (l === null || hoteDans(h, l)));
};

/**
 * Fenêtres glissantes : peut-on appeler ? `horodatages` : instants (ms) des appels récents ; renvoie la liste nettoyée (plus
 * longue fenêtre) et l'attente avant le prochain appel possible. L'appelant ajoute `maintenant` s'il appelle.
 */
export function fenetresLibres(horodatages: readonly number[], limites: readonly Limite[], maintenant: number): { ok: boolean; recents: number[]; attenteMs: number } {
  const plusLongue = Math.max(0, ...limites.map((l) => l.fenetreMs));
  const recents = horodatages.filter((t) => maintenant - t < plusLongue).sort((a, b) => a - b);
  let attenteMs = 0;
  for (const l of limites) {
    const dans = recents.filter((t) => maintenant - t < l.fenetreMs);
    if (dans.length >= l.requetes) attenteMs = Math.max(attenteMs, l.fenetreMs - (maintenant - dans[dans.length - l.requetes]));
  }
  return { ok: attenteMs === 0, recents, attenteMs };
}

/** Quota Google restant estimé (appels faits aujourd'hui, heure du Pacifique ignorée : estimation prudente sur 24 h glissantes) */
export const quotaGoogleRestant = (horodatages: readonly number[], maintenant: number) =>
  Math.max(0, QUOTA_GOOGLE_JOUR - horodatages.filter((t) => maintenant - t < JOUR).length);

// ---------------------------------------------------------------------------------------------------------------
// Adresses des API (les clés passent en en-tête quand c'est possible ; sinon l'adresse ne quitte jamais le serveur)
// ---------------------------------------------------------------------------------------------------------------

export const API_WIKIMEDIA = 'https://commons.wikimedia.org/w/api.php';
export const API_OPENVERSE = 'https://api.openverse.org/v1/images/';
export const API_PEXELS_REFERENCES = 'https://api.pexels.com/v1/search';
export const API_PIXABAY_REFERENCES = 'https://pixabay.com/api/';
export const API_GOOGLE_CSE = 'https://www.googleapis.com/customsearch/v1';

const pageValide = (p: number) => Math.max(1, Math.floor(Number.isFinite(p) ? p : 1));

export function urlRechercheWikimedia(requete: string, page = 1, base = API_WIKIMEDIA): string {
  const n = INFOS_SOURCES_REFERENCES.wikimedia.parPage;
  const q = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: requete, gsrnamespace: '6',
    gsrlimit: String(n), gsroffset: String((pageValide(page) - 1) * n), prop: 'imageinfo|categories', clshow: '!hidden', cllimit: 'max',
    iiprop: 'url|size|mime|extmetadata', iiurlwidth: '400', iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|ImageDescription|ObjectName',
  });
  return `${base}?${q}`;
}

export function urlRechercheOpenverse(requete: string, page = 1, base = API_OPENVERSE): string {
  const q = new URLSearchParams({ q: requete, page: String(pageValide(page)), page_size: String(INFOS_SOURCES_REFERENCES.openverse.parPage), mature: 'false' });
  return `${base}?${q}`;
}

/** Pexels : la clé passe dans l'en-tête Authorization */
export function urlReferencesPexels(requete: string, page = 1, base = API_PEXELS_REFERENCES): string {
  return `${base}?${new URLSearchParams({ query: requete, per_page: String(INFOS_SOURCES_REFERENCES.pexels.parPage), page: String(pageValide(page)) })}`;
}

/** Pixabay : photos ET illustrations / vecteurs (image_type=all) ; la clé est dans l'adresse (serveur seulement) */
export function urlReferencesPixabay(cle: string, requete: string, page = 1, base = API_PIXABAY_REFERENCES): string {
  return `${base}?${new URLSearchParams({ key: cle, q: requete, image_type: 'all', safesearch: 'true', lang: 'en', per_page: String(INFOS_SOURCES_REFERENCES.pixabay.parPage), page: String(pageValide(page)) })}`;
}

/** Google Programmable Search, images sous licences Creative Commons seulement (la clé est dans l'adresse : serveur seulement) */
export function urlRechercheGoogle(cle: string, cx: string, requete: string, page = 1, base = API_GOOGLE_CSE): string {
  const n = INFOS_SOURCES_REFERENCES.google.parPage;
  return `${base}?${new URLSearchParams({
    key: cle, cx, q: requete, searchType: 'image', num: String(n), start: String(1 + (pageValide(page) - 1) * n), safe: 'active', rights: 'cc_publicdomain|cc_attribute|cc_sharealike',
  })}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Lecture des réponses
// ---------------------------------------------------------------------------------------------------------------

export type ReferenceImage = {
  source: SourceReference;
  idSource: string;
  /** Vignette servie par la source (affichage dans l'admin ; copie réduite à l'enregistrement) */
  vignette: string;
  /** Page d'origine PUBLIQUE (crédit, export) */
  pageUrl: string;
  /** Image d'origine (quand la source la donne) */
  imageUrl: string | null;
  titre: string;
  auteur: string;
  licence: string;
  licenceUrl: string | null;
  largeur: number;
  hauteur: number;
  /** Tags, catégories ou mots-clés fournis par la source (suggestions de classement) */
  tags: string[];
  description: string;
  /** Requête qui a trouvé l'image (affichée pour chaque lot) */
  requete?: string;
};

export const cleReference = (r: Pick<ReferenceImage, 'source' | 'idSource'>) => `${r.source}:${r.idSource}`;

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
const s = (v: unknown, max = 300) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
/** Texte HTML (métadonnées Wikimedia) → texte brut */
export const texteBrut = (v: unknown, max = 300) =>
  s(typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '', max);
const ID = /^[A-Za-z0-9._~-]{1,120}$/;

/** Petite empreinte (FNV-1a 32 bits, hexadécimal) : identifiant stable d'une image Google (qui n'en fournit pas) */
export function empreinteCourte(t: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const complete = (r: ReferenceImage): ReferenceImage | null =>
  ID.test(r.idSource) && vignetteAutorisee(r.source, r.vignette) && pageAutorisee(r.source, r.pageUrl) && (r.imageUrl === null || hote(r.imageUrl) !== null) ? r : null;

type PageWikimedia = { pageid?: unknown; title?: unknown; index?: unknown; categories?: { title?: unknown }[]; imageinfo?: Record<string, unknown>[] };

/** Wikimedia Commons (generator=search, prop=imageinfo|categories) → références, dans l'ordre de pertinence */
export function referencesWikimedia(json: unknown): ReferenceImage[] {
  const pages = ((json as { query?: { pages?: unknown } })?.query?.pages ?? []) as PageWikimedia[] | Record<string, PageWikimedia>;
  const liste = (Array.isArray(pages) ? pages : Object.values(pages)).slice().sort((a, b) => n(a?.index) - n(b?.index));
  const res: ReferenceImage[] = [];
  for (const p of liste) {
    const ii = (p?.imageinfo ?? [])[0] ?? {};
    const meta = (ii.extmetadata ?? {}) as Record<string, { value?: unknown }>;
    if (!/^image\/(jpeg|png|gif|webp|svg\+xml|tiff)$/.test(s(ii.mime))) continue;
    const titre = texteBrut(meta.ObjectName?.value, 200) || s(p?.title, 200).replace(/^File:/, '').replace(/\.[a-z0-9]{2,4}$/i, '');
    const r = complete({
      source: 'wikimedia', idSource: String(p?.pageid ?? ''), vignette: s(ii.thumburl, 600), pageUrl: s(ii.descriptionurl, 600), imageUrl: s(ii.url, 600) || null,
      titre, auteur: texteBrut(meta.Artist?.value, 120), licence: texteBrut(meta.LicenseShortName?.value, 80) || 'Licence à vérifier sur la page', licenceUrl: s(meta.LicenseUrl?.value, 300).replace(/^\/\//, 'https://') || null,
      largeur: n(ii.width), hauteur: n(ii.height),
      tags: (p?.categories ?? []).map((c) => s(c?.title, 120).replace(/^Category:/, '')).filter(Boolean).slice(0, 12),
      description: texteBrut(meta.ImageDescription?.value, 300),
    });
    if (r) res.push(r);
  }
  return res;
}

type ResultatOpenverse = {
  id?: unknown; title?: unknown; foreign_landing_url?: unknown; url?: unknown; creator?: unknown; license?: unknown; license_version?: unknown; license_url?: unknown;
  thumbnail?: unknown; width?: unknown; height?: unknown; tags?: { name?: unknown }[]; mature?: unknown;
};

/** Openverse (/v1/images/) → références */
export function referencesOpenverse(json: unknown): ReferenceImage[] {
  const l = ((json as { results?: unknown })?.results ?? []) as ResultatOpenverse[];
  if (!Array.isArray(l)) return [];
  const res: ReferenceImage[] = [];
  for (const x of l) {
    if (x?.mature === true) continue;
    const id = s(x?.id, 64);
    const licence = s(x?.license, 20);
    const r = complete({
      source: 'openverse', idSource: id, vignette: s(x?.thumbnail, 600) || (id ? `https://api.openverse.org/v1/images/${id}/thumb/` : ''), pageUrl: s(x?.foreign_landing_url, 600), imageUrl: s(x?.url, 600) || null,
      titre: s(x?.title, 200), auteur: s(x?.creator, 120),
      licence: licence ? (licence === 'cc0' || licence === 'pdm' ? licence.toUpperCase() : `CC ${licence.toUpperCase()}${x?.license_version ? ` ${s(x.license_version, 10)}` : ''}`) : 'Licence à vérifier sur la page',
      licenceUrl: s(x?.license_url, 300) || null, largeur: n(x?.width), hauteur: n(x?.height),
      tags: (Array.isArray(x?.tags) ? x.tags : []).map((t) => s(t?.name, 60)).filter(Boolean).slice(0, 12), description: '',
    });
    if (r) res.push(r);
  }
  return res;
}

type PhotoPexels = { id?: unknown; width?: unknown; height?: unknown; url?: unknown; photographer?: unknown; alt?: unknown; src?: Record<string, unknown> };

/** Pexels (/v1/search) → références (vignette « medium ») */
export function referencesPexels(json: unknown): ReferenceImage[] {
  const l = ((json as { photos?: unknown })?.photos ?? []) as PhotoPexels[];
  if (!Array.isArray(l)) return [];
  const lic = INFOS_SOURCES_REFERENCES.pexels.licenceParDefaut!;
  return l.map((p) => complete({
    source: 'pexels', idSource: String(p?.id ?? ''), vignette: s(p?.src?.medium, 600) || s(p?.src?.small, 600), pageUrl: s(p?.url, 600), imageUrl: s(p?.src?.original, 600) || null,
    titre: s(p?.alt, 200), auteur: s(p?.photographer, 120), licence: lic.nom, licenceUrl: lic.url, largeur: n(p?.width), hauteur: n(p?.height), tags: [], description: s(p?.alt, 300),
  })).filter((r): r is ReferenceImage => r !== null);
}

type HitPixabay = { id?: unknown; pageURL?: unknown; type?: unknown; tags?: unknown; webformatURL?: unknown; largeImageURL?: unknown; user?: unknown; imageWidth?: unknown; imageHeight?: unknown };

/** Pixabay (photos, illustrations, vecteurs) → références */
export function referencesPixabay(json: unknown): ReferenceImage[] {
  const l = ((json as { hits?: unknown })?.hits ?? []) as HitPixabay[];
  if (!Array.isArray(l)) return [];
  const lic = INFOS_SOURCES_REFERENCES.pixabay.licenceParDefaut!;
  return l.map((h) => {
    const tags = s(h?.tags, 300).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12);
    return complete({
      source: 'pixabay', idSource: String(h?.id ?? ''), vignette: s(h?.webformatURL, 600), pageUrl: s(h?.pageURL, 600), imageUrl: s(h?.largeImageURL, 600) || null,
      titre: tags.slice(0, 3).join(', '), auteur: s(h?.user, 120), licence: lic.nom, licenceUrl: lic.url, largeur: n(h?.imageWidth), hauteur: n(h?.imageHeight), tags,
      description: s(h?.type, 40),
    });
  }).filter((r): r is ReferenceImage => r !== null);
}

type ItemGoogle = { title?: unknown; link?: unknown; displayLink?: unknown; mime?: unknown; image?: { contextLink?: unknown; width?: unknown; height?: unknown; thumbnailLink?: unknown } };

/** Google Programmable Search (searchType=image) → références (vignette gstatic ; page = page qui contient l'image) */
export function referencesGoogle(json: unknown): ReferenceImage[] {
  const l = ((json as { items?: unknown })?.items ?? []) as ItemGoogle[];
  if (!Array.isArray(l)) return [];
  const lic = INFOS_SOURCES_REFERENCES.google.licenceParDefaut!;
  return l.map((x) => {
    const lien = s(x?.link, 600);
    return complete({
      source: 'google', idSource: lien ? `g${empreinteCourte(lien)}` : '', vignette: s(x?.image?.thumbnailLink, 600), pageUrl: s(x?.image?.contextLink, 600), imageUrl: lien || null,
      titre: s(x?.title, 200), auteur: s(x?.displayLink, 120), licence: lic.nom, licenceUrl: lic.url, largeur: n(x?.image?.width), hauteur: n(x?.image?.height), tags: [], description: '',
    });
  }).filter((r): r is ReferenceImage => r !== null);
}

/** Réponse d'une source → références valides */
export function referencesDepuisReponse(source: SourceReference, json: unknown): ReferenceImage[] {
  switch (source) {
    case 'wikimedia': return referencesWikimedia(json);
    case 'openverse': return referencesOpenverse(json);
    case 'pexels': return referencesPexels(json);
    case 'pixabay': return referencesPixabay(json);
    case 'google': return referencesGoogle(json);
  }
}

/** Nombre de résultats BRUTS d'une réponse (avant filtrage) : sert à savoir si la source est épuisée pour la requête */
export function nombreBrut(source: SourceReference, json: unknown): number {
  const j = (json ?? {}) as Record<string, unknown>;
  const l = source === 'wikimedia' ? (j.query as { pages?: unknown } | undefined)?.pages : source === 'openverse' ? j.results : source === 'pexels' ? j.photos : source === 'pixabay' ? j.hits : j.items;
  return Array.isArray(l) ? l.length : l && typeof l === 'object' ? Object.keys(l).length : 0;
}

export const COTE_MIN_REFERENCE = 150;

/**
 * Filtrage : doublons écartés (même image ou même page d'origine), images vues ou écartées pour l'élément écartées, images
 * trop petites (plus petit côté connu < 150 px) écartées. Ordre de la source conservé.
 */
export function filtrerReferences(liste: readonly ReferenceImage[], exclues: ReadonlySet<string> = new Set()): ReferenceImage[] {
  const cles = new Set(exclues);
  const pages = new Set<string>();
  const res: ReferenceImage[] = [];
  for (const r of liste) {
    const k = cleReference(r);
    if (cles.has(k) || pages.has(r.pageUrl)) continue;
    cles.add(k);
    pages.add(r.pageUrl);
    if (r.largeur && r.hauteur && Math.min(r.largeur, r.hauteur) < COTE_MIN_REFERENCE) continue;
    res.push(r);
  }
  return res;
}

// ---------------------------------------------------------------------------------------------------------------
// Relance par lots de 5 (« Relancer (5 autres) »)
// ---------------------------------------------------------------------------------------------------------------

export const TAILLE_LOT = 5;

export type CurseurSource = { requete: number; page: number; epuisee: boolean };

/**
 * État de la relance pour UN élément : requêtes à essayer (variantes), tour (rotation des sources), curseur par source
 * (variante et page en cours), réserve d'images reçues mais pas encore montrées, clés déjà montrées ou écartées.
 */
export type EtatRelance = {
  requetes: string[];
  tour: number;
  curseurs: Partial<Record<SourceReference, CurseurSource>>;
  reserves: Partial<Record<SourceReference, ReferenceImage[]>>;
  vues: string[];
};

/** Nouvel état ; `vues` : images déjà montrées ou écartées pour cet élément (mémoire par élément) */
export function initialiserRelance(requete: string, vues: readonly string[] = []): EtatRelance {
  return { requetes: variantesRequete(requete), tour: 0, curseurs: {}, reserves: {}, vues: [...new Set(vues)] };
}

/** Rotation : sources disponibles en commençant par celle du tour */
export function ordreDuTour(sources: readonly SourceReference[], tour: number): SourceReference[] {
  if (!sources.length) return [];
  const i = ((tour % sources.length) + sources.length) % sources.length;
  return [...sources.slice(i), ...sources.slice(0, i)];
}

/**
 * Sources à utiliser : Google n'est utilisé que si Paul le demande explicitement, ou en DERNIER RECOURS (toutes les autres
 * sources disponibles épuisées), et seulement s'il est configuré.
 */
export function sourcesActives(etat: EtatRelance, disponibles: readonly SourceReference[], googleExplicite = false): SourceReference[] {
  const autres = disponibles.filter((x) => x !== 'google');
  const google = disponibles.includes('google');
  if (!google) return autres;
  if (googleExplicite) return [...autres, 'google'];
  return autres.every((x) => etat.curseurs[x]?.epuisee) ? [...autres, 'google'] : autres;
}

export type AppelPrevu = { source: SourceReference; requete: string; page: number };

/**
 * Compose le prochain lot : sources dans l'ordre du tour ; la première prend dans sa réserve, et si sa réserve ne suffit pas
 * alors qu'elle n'est pas épuisée, renvoie l'appel à faire (`aCharger`, lot vide, état inchangé). Une source épuisée donne
 * ce qui lui reste et la suivante complète. `forcer` : ne charge plus rien (dernier passage, lot éventuellement incomplet).
 */
export function prendreLot(etat: EtatRelance, sources: readonly SourceReference[], opts: { taille?: number; forcer?: boolean } = {}): { lot: ReferenceImage[]; etat: EtatRelance; aCharger: AppelPrevu | null } {
  const taille = opts.taille ?? TAILLE_LOT;
  const vues = new Set(etat.vues);
  const reserves = { ...etat.reserves };
  const lot: ReferenceImage[] = [];
  for (const source of ordreDuTour(sources, etat.tour)) {
    const reserve = (reserves[source] ?? []).filter((r) => !vues.has(cleReference(r)) && !lot.some((x) => x.pageUrl === r.pageUrl));
    const c = etat.curseurs[source] ?? { requete: 0, page: 1, epuisee: false };
    const epuisee = c.epuisee || c.requete >= etat.requetes.length;
    if (!opts.forcer && !epuisee && reserve.length < taille - lot.length) {
      return { lot: [], etat, aCharger: { source, requete: etat.requetes[c.requete], page: c.page } };
    }
    const pris = reserve.slice(0, taille - lot.length);
    lot.push(...pris);
    reserves[source] = reserve.slice(pris.length);
    if (lot.length >= taille) break;
  }
  if (!lot.length) return { lot, etat: { ...etat, reserves }, aCharger: null };
  return { lot, etat: { ...etat, reserves, tour: etat.tour + 1, vues: [...etat.vues, ...lot.map(cleReference)] }, aCharger: null };
}

/**
 * Intègre une page reçue : nouvelles images (filtrées, sans les vues) ajoutées à la réserve de la source, avec la requête
 * qui les a trouvées ; curseur avancé : page suivante, ou variante suivante si la page était la dernière (moins d'images
 * que demandé, ou page maximale) ; plus de variante → source épuisée.
 */
export function integrerPage(etat: EtatRelance, source: SourceReference, page: { requete: string; references: readonly ReferenceImage[]; brut: number }): EtatRelance {
  const info = INFOS_SOURCES_REFERENCES[source];
  const c = etat.curseurs[source] ?? { requete: 0, page: 1, epuisee: false };
  const deja = new Set([...etat.vues, ...(etat.reserves[source] ?? []).map(cleReference)]);
  const nouvelles = filtrerReferences(page.references, deja).map((r) => ({ ...r, requete: page.requete }));
  const derniere = page.brut < info.parPage || c.page >= info.pageMax;
  const suivant: CurseurSource = derniere ? { requete: c.requete + 1, page: 1, epuisee: c.requete + 1 >= etat.requetes.length } : { requete: c.requete, page: c.page + 1, epuisee: false };
  return { ...etat, curseurs: { ...etat.curseurs, [source]: suivant }, reserves: { ...etat.reserves, [source]: [...(etat.reserves[source] ?? []), ...nouvelles] } };
}

/** Source qui ne répond pas ou n'est pas configurée : marquée épuisée (la rotation passe à la suivante) */
export const marquerEpuisee = (etat: EtatRelance, source: SourceReference): EtatRelance => ({
  ...etat, curseurs: { ...etat.curseurs, [source]: { ...(etat.curseurs[source] ?? { requete: 0, page: 1 }), epuisee: true } },
});

/** Requêtes réellement utilisées par un lot (affichées au-dessus du lot) */
export const requetesDuLot = (lot: readonly ReferenceImage[]) => [...new Set(lot.map((r) => r.requete).filter((x): x is string => Boolean(x)))];

// ---------------------------------------------------------------------------------------------------------------
// Choix de Paul : validation, export public
// ---------------------------------------------------------------------------------------------------------------

/** « Ce qui m'inspire » */
export const ETIQUETTES_REFERENCE: readonly { id: string; libelle: string }[] = [
  { id: 'composition', libelle: 'Composition' },
  { id: 'trait', libelle: 'Trait' },
  { id: 'anatomie', libelle: 'Anatomie' },
  { id: 'couleurs', libelle: 'Couleurs' },
  { id: 'cadrage', libelle: 'Cadrage' },
];

export const TEXTE_REFERENCE_MAX = 300;

export type ChoixReference = {
  reference: ReferenceImage;
  etiquettes: string[];
  texte: string;
  sujets: string[];
  hashtags: string[];
};

/** Choix reçu du navigateur → choix valide (les adresses sont recontrôlées : hôtes attendus, https) */
export function validerChoixReference(brut: unknown): { choix: ChoixReference | null; erreurs: string[] } {
  const b = (brut ?? {}) as Record<string, unknown>;
  const r = (b.reference ?? {}) as Record<string, unknown>;
  const erreurs: string[] = [];
  if (!estSourceReference(r.source)) return { choix: null, erreurs: ['Source inconnue.'] };
  const ref = complete({
    source: r.source, idSource: s(r.idSource, 120), vignette: s(r.vignette, 600), pageUrl: s(r.pageUrl, 600), imageUrl: s(r.imageUrl, 600) || null,
    titre: s(r.titre, 200), auteur: s(r.auteur, 120), licence: s(r.licence, 80), licenceUrl: hote(r.licenceUrl) ? s(r.licenceUrl, 300) : null,
    largeur: n(r.largeur), hauteur: n(r.hauteur), tags: (Array.isArray(r.tags) ? r.tags : []).map((t) => s(t, 60)).filter(Boolean).slice(0, 12), description: s(r.description, 300),
    requete: s(r.requete, 100) || undefined,
  });
  if (!ref) erreurs.push('Image invalide (adresse inattendue).');
  const etiquettes = [...new Set((Array.isArray(b.etiquettes) ? b.etiquettes : []).filter((e): e is string => ETIQUETTES_REFERENCE.some((x) => x.id === e)))];
  const texte = s(b.texte, TEXTE_REFERENCE_MAX);
  const sujets = [...new Set((Array.isArray(b.sujets) ? b.sujets : []).filter((x): x is string => estSujetVisuel(x) && x !== 'posture'))];
  const hashtags = hashtagsValides(b.hashtags).filter((h) => !/^postur/.test(h));
  return erreurs.length || !ref ? { choix: null, erreurs } : { choix: { reference: ref, etiquettes, texte, sujets, hashtags }, erreurs };
}

/** Ligne de la table inspirations (colonnes de la migration 0033) lue par l'export */
export type LigneReferenceExport = {
  cle_asset?: unknown; origine?: unknown; page_origine?: unknown; licence_origine?: unknown; licence_url_origine?: unknown;
  etiquettes?: unknown; objectif?: unknown; sujets?: unknown; hashtags?: unknown; requete?: unknown; created_at?: unknown;
};

export type ReferenceExportee = { source: SourceReference; page: string; licence: string | null; licenceUrl: string | null; etiquettes: string[]; texte: string | null; sujets: string[]; hashtags: string[]; requete: string | null; jour: string | null };
export type ElementReferences = { cle: string; titre: string | null; references: ReferenceExportee[] };

/** Adresse publique nettoyée : https, sans identifiants, sans fragment, sans paramètres de type jeton / clé / signature */
export function adressePublique(url: unknown): string | null {
  if (!hote(url)) return null;
  const u = new URL(String(url));
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (/(token|key|sig|signature|session|auth|expires|utm_)/i.test(k)) u.searchParams.delete(k);
  return u.toString();
}

/**
 * Export PUBLIC (retours/references-illustrations.json) : par élément, les références cochées avec la page d'origine publique,
 * la licence, les étiquettes et le texte de Paul. JAMAIS de vignette, de chemin du stockage privé, d'URL signée, d'auteur
 * du compte ni d'identifiant. Éléments triés par clé, références par date.
 */
export function referencesPourExport(lignes: readonly LigneReferenceExport[], titres: Readonly<Record<string, string>> = {}): ElementReferences[] {
  const parCle = new Map<string, ReferenceExportee[]>();
  for (const l of lignes) {
    const cle = typeof l.cle_asset === 'string' && /^[a-z]+:[^\s]{1,200}$/.test(l.cle_asset) ? l.cle_asset : null;
    const page = adressePublique(l.page_origine);
    if (!cle || !estSourceReference(l.origine) || !page) continue;
    const liste = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    const r: ReferenceExportee = {
      source: l.origine, page, licence: s(l.licence_origine, 80) || null, licenceUrl: adressePublique(l.licence_url_origine),
      etiquettes: liste(l.etiquettes).filter((e) => ETIQUETTES_REFERENCE.some((x) => x.id === e)), texte: s(l.objectif, TEXTE_REFERENCE_MAX) || null,
      sujets: liste(l.sujets).filter((x) => estSujetVisuel(x) && x !== 'posture'), hashtags: hashtagsValides(l.hashtags), requete: s(l.requete, 100) || null,
      jour: typeof l.created_at === 'string' ? l.created_at.slice(0, 10) : null,
    };
    parCle.set(cle, [...(parCle.get(cle) ?? []), r]);
  }
  return [...parCle.keys()].sort().map((cle) => ({
    cle, titre: titres[cle] ?? null,
    references: parCle.get(cle)!.sort((a, b) => String(a.jour ?? '').localeCompare(String(b.jour ?? '')) || a.page.localeCompare(b.page)),
  }));
}
