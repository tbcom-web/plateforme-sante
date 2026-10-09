// KIT DÉMO par profession (demande de Paul du 2026-10-08 : « un set d'images de cabinet de podologie […] ainsi que des photos
// fictives de praticiens. Comment importer ça dans mon kit de base pour tous mes templates ? »). Module PUR.
//
// PRINCIPE DÉONTOLOGIQUE (non négociable) : une image générée d'un cabinet ou d'un praticien FICTIF n'est JAMAIS présentée sur le
// site publié d'un vrai praticien comme SON cabinet ou SA personne (tromperie du public, règles déontologiques, AI Act : transparence).
// - Les images « Démo uniquement » (images-generees.ts, dossier banque/ia/demo-<profession>/, estImageDemo) servent UNIQUEMENT aux
//   aperçus : Studio, atelier, recettes à noter, dégustation, kits, parcours d'inscription (/creer, /essai) avec le bandeau
//   « Photos d'exemple ». Elles sont posées AU RENDU (appliquerKitDemo, ApercuTheme) et jamais écrites dans un brouillon.
// - Garde-fous : normaliserDraft retire toute image démo d'un brouillon (sansImagesDemo : lecture, enregistrement, construction
//   Astro) ; banquePhotos les exclut de la banque des sites ; nettoyerPhotosJeu les refuse ; controlerPublication les signale en
//   BLOQUANT et lib/publication.ts refuse de publier tant qu'une image démo subsiste dans la configuration enregistrée.
//
// Composition (composerKitDemo) : images démo ACCEPTÉES (statut validée ou acceptée) ET NOTÉES (≥ 3 ★ ; ≤ 2 ★ ou retirées : jamais),
// 4-5 ★ d'abord. Cabinet : galerie de 4 + panorama, pris dans le MÊME LOT (série cohérente : même lumière, mêmes matières), complétés
// par les autres lots si besoin ; praticiens : 1 à 3 portraits fictifs. Rotation : `rang` change de lot et fait tourner les images.

import { estApercuSousLicence, estImageDemo, estImageNonPubliable } from './photos-libres';
import { cleImage, imageExclue, type KitCompact } from './contexte-images';
import { PROFESSION_PAR_DEFAUT } from './professions';
import type { SiteDraft } from './draft';

export const STATUTS_ACCEPTES_DEMO = ['validee', 'accepte', 'valide'] as const;
/** Note minimale d'une image du kit démo (≥ 4 ★ d'abord) */
export const NOTE_MIN_KIT_DEMO = 3;
export const GALERIE_KIT_DEMO = 4;
export const PORTRAITS_KIT_DEMO = 3;

export type ImageDemo = {
  url: string;
  /** Emplacement déclaré à l'import (images-generees.ts, EMPLACEMENTS_IA) */
  emplacement: string;
  /** Note moyenne (assets_notes) ; null : jamais notée (pas dans le kit) */
  note: number | null;
  statut: string;
  lot?: string | null;
  profession?: string | null;
};

export type KitDemo = {
  profession: string;
  rang: number;
  galerie: string[];
  panorama: string | null;
  portraits: string[];
  /** Lot (série) de la galerie */
  lot: string | null;
  /** La galerie a dû être complétée par d'autres lots */
  complete: boolean;
  noteMoyenne: number | null;
  cle: string;
};

/** Clé du kit démo d'une profession dans le registre des kits (contexte-images.ts) */
export const cleKitDemo = (profession: string = PROFESSION_PAR_DEFAUT) => `demo:${profession}`;

/** Emplacements qui alimentent la galerie démo (les détails « démo » d'hygiène, de matériel et d'ambiance la complètent) */
const GALERIE_PRINCIPALE = new Set(['demo-galerie']);
const GALERIE_COMPLEMENT = new Set(['hygiene', 'materiel', 'ambiance', 'demo-situation']);

const hache = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const tourner = <T,>(l: readonly T[], k: number) => (l.length ? [...l.slice(k % l.length), ...l.slice(0, k % l.length)] : []);

/** Image démo admissible : accueillie (acceptée / validée), notée ≥ 3 ★, non exclue, de la profession, dans le dossier démo */
export function imageDemoAdmissible(i: ImageDemo, profession: string, exclues?: ReadonlySet<string>): boolean {
  if (!estImageDemo(i.url) || !(STATUTS_ACCEPTES_DEMO as readonly string[]).includes(i.statut)) return false;
  if ((i.profession || PROFESSION_PAR_DEFAUT) !== profession) return false;
  if (typeof i.note !== 'number' || i.note < NOTE_MIN_KIT_DEMO) return false;
  return !imageExclue(i.url, exclues ?? new Set());
}

const parNote = (a: ImageDemo, b: ImageDemo) => Number((b.note ?? 0) >= 4) - Number((a.note ?? 0) >= 4) || (b.note ?? 0) - (a.note ?? 0) || (a.url < b.url ? -1 : 1);

/** Kit démo d'une profession (null : aucune image admissible ; les aperçus gardent alors les silhouettes et les illustrations) */
export function composerKitDemo(images: readonly ImageDemo[], o: { profession?: string; rang?: number; exclues?: ReadonlySet<string> } = {}): KitDemo | null {
  const profession = o.profession || PROFESSION_PAR_DEFAUT;
  const rang = Math.max(0, Math.floor(o.rang ?? 0));
  const ok = [...new Map(images.filter((i) => imageDemoAdmissible(i, profession, o.exclues)).map((i) => [i.url, i])).values()];
  const cabinet = ok.filter((i) => GALERIE_PRINCIPALE.has(i.emplacement) || i.emplacement === 'demo-panorama');
  // Lots (séries) classés : 2 points par image ≥ 4 ★, 1 par image ≥ 3 ★, puis la moyenne ; « sans lot » en dernier à égalité
  const lots = new Map<string, ImageDemo[]>();
  for (const i of cabinet) { const k = i.lot || ''; lots.set(k, [...(lots.get(k) ?? []), i]); }
  const score = (l: ImageDemo[]) => l.reduce((s, i) => s + ((i.note ?? 0) >= 4 ? 2 : 1), 0) + l.reduce((s, i) => s + (i.note ?? 0), 0) / l.length / 10;
  const classes = [...lots.entries()].sort((a, b) => score(b[1]) - score(a[1]) || Number(a[0] === '') - Number(b[0] === '') || (a[0] < b[0] ? -1 : 1));
  const utiles = classes.filter(([, l]) => l.length >= 2);
  const [lot, serie] = (utiles.length ? utiles[rang % utiles.length] : classes[0]) ?? ['', []];

  const galerieSerie = tourner(serie.filter((i) => GALERIE_PRINCIPALE.has(i.emplacement)).sort(parNote), rang);
  const autres = ok.filter((i) => !serie.includes(i) && (GALERIE_PRINCIPALE.has(i.emplacement) || GALERIE_COMPLEMENT.has(i.emplacement)))
    .sort((a, b) => Number((b.lot || '') === lot) - Number((a.lot || '') === lot) || Number(GALERIE_PRINCIPALE.has(b.emplacement)) - Number(GALERIE_PRINCIPALE.has(a.emplacement)) || parNote(a, b));
  const galerie = [...galerieSerie, ...autres].slice(0, GALERIE_KIT_DEMO).map((i) => i.url);
  const complete = galerie.length > galerieSerie.length;
  const panoramas = [...serie, ...ok.filter((i) => !serie.includes(i))].filter((i) => i.emplacement === 'demo-panorama');
  const panorama = (panoramas.filter((i) => (i.lot || '') === lot).sort(parNote)[0] ?? panoramas.sort(parNote)[0])?.url ?? null;
  const portraits = tourner(ok.filter((i) => i.emplacement === 'demo-portrait').sort(parNote), rang).slice(0, PORTRAITS_KIT_DEMO).map((i) => i.url);
  if (!galerie.length && !panorama && !portraits.length) return null;
  const pris = new Set([...galerie, panorama, ...portraits].filter(Boolean) as string[]);
  const notes = ok.filter((i) => pris.has(i.url)).map((i) => i.note as number);
  return {
    profession, rang, galerie, panorama, portraits, lot: lot || null, complete,
    noteMoyenne: notes.length ? Math.round((notes.reduce((s, n) => s + n, 0) / notes.length) * 10) / 10 : null,
    cle: `kit-demo:${profession}:${hache([...pris].join('|')).toString(16).padStart(8, '0')}`,
  };
}

/** Forme compacte posée dans le registre des kits (clé cleKitDemo) */
export const kitDemoCompact = (k: KitDemo): KitCompact => ({
  sujet: cleKitDemo(k.profession),
  ...(k.galerie.length ? { galerie: [...k.galerie] } : {}),
  ...(k.panorama ? { panorama: k.panorama } : {}),
  ...(k.portraits.length ? { portraits: [...k.portraits] } : {}),
});

// ---------------------------------------------------------------------------------------------------------------
// Aperçus : le kit démo posé AU RENDU (jamais enregistré)
// ---------------------------------------------------------------------------------------------------------------

export type KitDemoApplique = { cabinet: number; panorama: boolean; portraits: number };
export const RIEN_APPLIQUE: KitDemoApplique = { cabinet: 0, panorama: false, portraits: 0 };
export const kitDemoUtilise = (a: KitDemoApplique) => a.cabinet > 0 || a.panorama || a.portraits > 0;

/**
 * Brouillon d'APERÇU complété par le kit démo : galerie du cabinet vide → 4 images démo, panorama vide → panorama démo, praticien
 * nommé sans photo → portrait fictif (jamais deux fois le même visage). Les photos du praticien passent toujours avant. Le
 * brouillon d'origine n'est pas modifié (copie) ; le résultat ne doit JAMAIS être enregistré (normaliserDraft le nettoierait).
 */
export function appliquerKitDemo<D extends Pick<SiteDraft, 'photos' | 'praticiens'>>(d: D, kit: KitCompact | null | undefined): { draft: D; applique: KitDemoApplique } {
  if (!kit) return { draft: d, applique: RIEN_APPLIQUE };
  const galerie = (kit.galerie ?? []).filter(estImageDemo).slice(0, GALERIE_KIT_DEMO);
  const panorama = kit.panorama && estImageDemo(kit.panorama) ? kit.panorama : '';
  const portraits = (kit.portraits ?? []).filter(estImageDemo);
  const cabinet = d.photos.cabinet.filter(Boolean).length ? [] : galerie;
  const pano = !d.photos.panorama && panorama ? panorama : '';
  let k = 0;
  const praticiens = d.praticiens.map((p) => {
    if (p.photo || !(p.nom.trim() || p.prenom.trim()) || k >= portraits.length) return p;
    return { ...p, photo: portraits[k++] };
  });
  const applique: KitDemoApplique = { cabinet: cabinet.length, panorama: Boolean(pano), portraits: k };
  if (!kitDemoUtilise(applique)) return { draft: d, applique };
  return {
    draft: { ...d, photos: { ...d.photos, ...(cabinet.length ? { cabinet } : {}), ...(pano ? { panorama: pano } : {}) }, praticiens },
    applique,
  };
}

/** Bandeau de l'aperçu praticien (parcours d'inscription, mode test) */
export const BANDEAU_EXEMPLES = {
  titre: 'Photos d’exemple — remplacez-les par les vôtres',
  texte: 'Ce cabinet et ces praticiens sont fictifs : ces photos servent seulement à l’aperçu et ne seront jamais publiées. Ajoutez vos photos du cabinet et votre portrait ; sans photo, votre site garde ses illustrations.',
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Garde-fous de publication
// ---------------------------------------------------------------------------------------------------------------

/** Adresses d'images démo (et d'aperçus « comp » de banques payantes, photos-sous-licence.ts) trouvées n'importe où dans une valeur (brouillon, configuration, site assemblé), sans doublon */
export function imagesDemoDans(v: unknown, max = 50): string[] {
  const r = new Set<string>();
  const vus = new Set<unknown>();
  const parcourir = (x: unknown, profondeur: number) => {
    if (r.size >= max || profondeur > 12) return;
    if (typeof x === 'string') { if (estImageNonPubliable(x)) r.add(x); return; }
    if (!x || typeof x !== 'object' || vus.has(x)) return;
    vus.add(x);
    for (const y of Array.isArray(x) ? x : Object.values(x as Record<string, unknown>)) parcourir(y, profondeur + 1);
  };
  parcourir(v, 0);
  return [...r];
}

export const MESSAGE_IMAGES_DEMO = 'Photo d’exemple détectée : une image de démonstration (cabinet ou praticien fictif) ne peut jamais être publiée. Remplacez-la par votre propre photo (cabinet, portrait) ou retirez-la ; sans photo, le site garde ses illustrations.';

export const MESSAGE_APERCU_SOUS_LICENCE = 'Photo premium en aperçu : cette version (filigranée ou basse définition, licence « comp ») sert seulement aux démonstrations et ne peut jamais être publiée. Choisissez l’option Photos premium ou remplacez la photo par une photo du kit ou la vôtre.';
/** Message du contrôle : image démo d'abord, sinon aperçu d'une banque payante */
export const messageImagesNonPubliables = (images: readonly string[]) => (images.some((u) => estImageDemo(u)) || !images.some((u) => estApercuSousLicence(u)) ? MESSAGE_IMAGES_DEMO : MESSAGE_APERCU_SOUS_LICENCE);

/** Contrôle BLOQUANT : la configuration contient-elle encore une image démo (ou un aperçu « comp » d'une banque payante) ? */
export function controlerImagesDemo(config: unknown): { ok: true } | { ok: false; message: string; images: string[] } {
  const images = imagesDemoDans(config);
  return images.length ? { ok: false, message: messageImagesNonPubliables(images), images } : { ok: true };
}

/** Une chaîne démo devient vide ; dans une liste, l'élément démo (chaîne, ou rendu dont url / src est démo) est retiré */
function nettoyer(x: unknown): unknown {
  if (typeof x === 'string') return estImageNonPubliable(x) ? '' : x;
  if (Array.isArray(x)) return x.filter((y) => !(typeof y === 'string' && estImageNonPubliable(y)) && !(y && typeof y === 'object' && ['url', 'src'].some((k) => estImageNonPubliable((y as Record<string, unknown>)[k] as string)))).map(nettoyer);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, v]) => [k, nettoyer(v)]));
  return x;
}

/**
 * Brouillon SANS image démo (appelé par normaliserDraft : chaque lecture, enregistrement et construction de site) : les photos du
 * praticien restent, une image démo est retirée et le repli habituel reprend (illustrations, monogramme). Un praticien dont la
 * photo était démo perd aussi son portrait composé. Inchangé (même objet) s'il n'y en a aucune.
 */
export function sansImagesDemo<D extends object>(d: D): D {
  if (!imagesDemoDans(d, 1).length) return d;
  const r = nettoyer(d) as D & { praticiens?: { photo?: string; portrait?: unknown }[] };
  const avant = (d as { praticiens?: { photo?: string }[] }).praticiens;
  if (Array.isArray(r.praticiens) && Array.isArray(avant)) {
    r.praticiens = r.praticiens.map((p, i) => (estImageNonPubliable(avant[i]?.photo) ? (({ portrait: _p, ...reste }) => ({ ...reste, photo: '' }))(p) : p));
  }
  return r;
}

/** Clé d'inventaire d'une image démo (notation, exclusions) */
export const cleImageDemo = (url: string) => cleImage(url);
