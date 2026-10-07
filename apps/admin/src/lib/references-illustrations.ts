import 'server-only';
import {
  CACHE_REFERENCES_MS, fenetresLibres, INFOS_SOURCES_REFERENCES, nombreBrut, quotaGoogleRestant, referencesDepuisReponse, SOURCES_REFERENCES, urlRechercheGoogle,
  urlRechercheOpenverse, urlRechercheWikimedia, urlReferencesPexels, urlReferencesPixabay, USER_AGENT_REFERENCES, vignetteAutorisee, type ReferenceImage, type SourceReference,
} from '@plateforme/core/references-illustrations';
import { quantifierPalette, type CouleurPalette } from '@plateforme/core';

// Moteurs d'images pour les références d'illustration (serveur seulement). Sans clé : Wikimedia Commons (User-Agent
// identifiant l'application, politique de Wikimedia) et Openverse (accès anonyme modéré). Avec clé (variables Vercel,
// jamais exposées au navigateur) : PEXELS_API_KEY, PIXABAY_API_KEY, et Google Programmable Search (GOOGLE_CSE_KEY +
// GOOGLE_CSE_ID ; jamais de lecture de pages Google Images). Source sans clé configurée : masquée (« non configurée »).
// Débit : fenêtres glissantes par instance + cache 24 h (mémoire de l'instance et cache de données de Next, partagé).
// Voir docs/references-illustrations.md.

const env = (v: string) => (process.env[v] ?? '').trim();

/** Sources configurées (booléens seulement : les clés ne sortent jamais du serveur) */
export function sourcesReferencesConfigurees(): Record<SourceReference, boolean> {
  return Object.fromEntries(SOURCES_REFERENCES.map((s) => [s, INFOS_SOURCES_REFERENCES[s].variables.every((v) => Boolean(env(v)))])) as Record<SourceReference, boolean>;
}

const appels: Record<SourceReference, number[]> = { wikimedia: [], openverse: [], pexels: [], pixabay: [], google: [] };
const cache = new Map<string, { expire: number; references: ReferenceImage[]; brut: number }>();

export class ErreurReference extends Error {}

/** Quota Google restant estimé (appels de cette instance sur 24 h glissantes ; le cache ne consomme rien) */
export const quotaGoogle = () => quotaGoogleRestant(appels.google, Date.now());

function adresse(source: SourceReference, requete: string, page: number): string {
  switch (source) {
    case 'wikimedia': return urlRechercheWikimedia(requete, page);
    case 'openverse': return urlRechercheOpenverse(requete, page);
    case 'pexels': return urlReferencesPexels(requete, page);
    case 'pixabay': return urlReferencesPixabay(env('PIXABAY_API_KEY'), requete, page);
    case 'google': return urlRechercheGoogle(env('GOOGLE_CSE_KEY'), env('GOOGLE_CSE_ID'), requete, page);
  }
}

/** Une page de résultats d'une source (références valides + nombre brut, pour savoir si la source est épuisée) */
export async function pageDeReferences(source: SourceReference, requete: string, page: number): Promise<{ references: ReferenceImage[]; brut: number; enCache: boolean }> {
  const info = INFOS_SOURCES_REFERENCES[source];
  if (!sourcesReferencesConfigurees()[source]) throw new ErreurReference(`${info.libelle} : non configurée.`);
  if (page > info.pageMax) return { references: [], brut: 0, enCache: true };
  const cleCache = `${source}:${requete}:${page}`;
  const enCache = cache.get(cleCache);
  if (enCache && enCache.expire > Date.now()) return { references: enCache.references, brut: enCache.brut, enCache: true };
  const d = fenetresLibres(appels[source], info.limites, Date.now());
  appels[source] = d.recents;
  if (!d.ok) throw new ErreurReference(`${info.libelle} : limite atteinte, réessayez dans ${Math.max(1, Math.ceil(d.attenteMs / 60_000))} min.`);
  appels[source].push(Date.now());
  const r = await fetch(adresse(source, requete, page), {
    headers: {
      'User-Agent': USER_AGENT_REFERENCES, Accept: 'application/json',
      ...(source === 'pexels' ? { Authorization: env('PEXELS_API_KEY') } : {}),
    },
    next: { revalidate: CACHE_REFERENCES_MS / 1000 },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!r) throw new ErreurReference(`${info.libelle} ne répond pas.`);
  if (r.status === 401 || r.status === 403) throw new ErreurReference(`${info.libelle} : accès refusé${info.variables.length ? ` (vérifiez ${info.variables.join(' et ')} dans Vercel)` : ''}.`);
  if (r.status === 429) throw new ErreurReference(`${info.libelle} : limite atteinte, réessayez plus tard.`);
  if (!r.ok) throw new ErreurReference(`${info.libelle} : erreur ${r.status}.`);
  const json = await r.json().catch(() => null);
  const res = { references: referencesDepuisReponse(source, json), brut: nombreBrut(source, json) };
  cache.set(cleCache, { ...res, expire: Date.now() + CACHE_REFERENCES_MS });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return { ...res, enCache: false };
}

const TAILLE_MAX = 5 * 1024 * 1024;

/** Vignette téléchargée côté serveur : hôtes de la source seulement (redirections recontrôlées), image, 5 Mo au plus */
export async function telechargerVignette(source: SourceReference, url: string): Promise<Buffer> {
  let u = url;
  let r: Response | null = null;
  for (let i = 0; i < 4; i++) {
    if (!vignetteAutorisee(source, u)) throw new ErreurReference('Adresse d’image inattendue.');
    r = await fetch(u, { cache: 'no-store', redirect: 'manual', headers: { 'User-Agent': USER_AGENT_REFERENCES }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    const suite = r && r.status >= 300 && r.status < 400 ? r.headers.get('location') : null;
    if (!suite) break;
    u = new URL(suite, u).toString();
    r = null;
  }
  if (!r || !r.ok) throw new ErreurReference('Image introuvable à la source.');
  if (!String(r.headers.get('content-type') ?? '').startsWith('image/')) throw new ErreurReference('Le fichier reçu n’est pas une image.');
  if (Number(r.headers.get('content-length') ?? 0) > TAILLE_MAX) throw new ErreurReference('Image trop lourde.');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > TAILLE_MAX) throw new ErreurReference('Image trop lourde.');
  return buf;
}

async function chargerSharp() {
  const m = (await import('sharp')) as unknown as { default?: typeof import('sharp') } & typeof import('sharp');
  return typeof m.default === 'function' ? m.default : m;
}

/** Copie de référence : 400 px au plus (grand côté), WebP, sans métadonnées ; palette dominante (core, quantifierPalette) */
export async function vignetteDeReference(source: Buffer): Promise<{ webp: Buffer; largeur: number; hauteur: number; palette: CouleurPalette[] }> {
  const sharp = await chargerSharp();
  const base = sharp(source, { failOn: 'error', limitInputPixels: 50_000_000 }).rotate().flatten({ background: '#ffffff' });
  const { data, info } = await base.clone().resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toBuffer({ resolveWithObject: true });
  const px = await base.clone().resize({ width: 64, height: 64, fit: 'inside' }).ensureAlpha().raw().toBuffer();
  return { webp: data, largeur: info.width, hauteur: info.height, palette: quantifierPalette(px, { n: 5 }) };
}
