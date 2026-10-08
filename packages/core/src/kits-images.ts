// KITS D'IMAGES automatiques par sujet (niveau 2 de docs/ingredients-recettes.md ; demande de Paul du 2026-10-08 : « quand je choisis
// un thème Enfant, voir un set de photos vraiment sympas »). Composé EN DIRECT à partir des photos de la banque (sujets effectifs :
// assets_sujets + hashtags qui nomment un sujet), de leurs notes, statuts, duels et poids appris, et des HASHTAGS qui nomment un
// emplacement (#accueil, #cabinet, #<slug du soin>, #fiche-soin…). Rien n'est dessiné ni stocké : le kit est recalculé à chaque lecture.
//
// COUCHE 2 (assemblage) : uniquement le VIVIER CURÉ du sujet (estCuree : photo retenue, étiquetée avec le sujet par Paul, non exclue).
// Emplacements : premier écran, page sujet, une photo par soin du sujet, galerie du cabinet (4). Pour chacun :
//   score = 3 · (4 − palier) + 3 · effet appris + (note moyenne ou 3) + 2,5 · étiquette de l'emplacement (#<slug> : 3, #fiche-soin : 1)
//   palier (favoris.ts) : 1 = ≥ 4 ★, 2 = ≥ 3,5 ★, 3 = jamais notée, 4 = autre sujet / « général » (complément, signalé)
// Jamais : photo exclue (contexte-images.ts : moyenne ou dernière note ≤ 2 ★, retirée, à retravailler), photo non importée, deux fois
// la même photo, deux photos « quasi identiques » (même série : même nom au numéro près, même photo source). Soin sans photo étiquetée
// #<slug> ou #fiche-soin du sujet : TROU signalé, l'illustration du soin reste (jamais une photo ≤ 2 ★ pour boucher un trou).
// Cohérence : un seul traitement photo pour tout le kit (le mieux noté), le héros illustré le mieux noté du sujet.
// Rotation : rang 0 = le meilleur kit (ou le kit GARDÉ par Paul s'il reste valide) ; rang k : premier écran = k-ième des 4 meilleures,
// autres emplacements légèrement brassés (graine) parmi les bonnes. Pur, déterministe.

import { classerPhotos, type NotesPhotos, type PhotoClassee } from './favoris';
import { imageExclue, type KitCompact } from './contexte-images';
import { clePhoto, scoreAsset, type PoidsAssets } from './assets-poids';
import { cleTraitementPhotos, TRAITEMENTS_PHOTOS } from './traitements-photos';
import { themeParId } from './themes';
import { banquePhotos, photosIntegreesBanque, type EntreeBanquePhotos, type PhotoBanque } from './recettes';
import { clesImagesExclues, type KitCompact as KitC } from './contexte-images';
import { notesPhotos } from './favoris';
import { poidsAssets, type SurchargesSujets } from './assets-poids';
import { hashtagsDepuisLignes } from './hashtags';
import { HASHTAGS_PAR_DEFAUT } from './kits';
import { photosDuJeu, type PhotosJeu } from './jeux-photos';
import { SUJETS_VISUELS } from './photos-libres';

export const SUJETS_KITS = ['enfant', 'sport', 'senior', 'diabete', 'ongles', 'semelles', 'pedicurie', 'general'] as const;
export type SujetKit = (typeof SUJETS_KITS)[number];
export const libelleSujetKit = (s: string) => (s === 'general' ? 'Général' : themeParId(s)?.court ?? s);

export type EmplacementKit = 'accueil' | 'page-sujet' | 'cabinet' | `soin:${string}`;
export const LIBELLES_EMPLACEMENTS: Record<string, string> = { accueil: 'Premier écran', 'page-sujet': 'Page sujet', cabinet: 'Cabinet (galerie)' };
export const libelleEmplacement = (e: string) => LIBELLES_EMPLACEMENTS[e] ?? (e.startsWith('soin:') ? `Soin : ${e.slice(5).replace(/-/g, ' ')}` : e);

/** Hashtags qui désignent un emplacement */
const ETIQUETTES_EMPLACEMENT: Record<string, readonly string[]> = {
  accueil: ['accueil', 'hero', 'heros', 'premier-ecran', 'couverture'],
  'page-sujet': ['page-sujet'],
  cabinet: ['cabinet', 'galerie', 'salle', 'local', 'lieu'],
};

export type PhotoKit = { emplacement: EmplacementKit; url: string; cle: string | null; note: number | null; complement: boolean; etiquetee: boolean };
export type KitImages = {
  sujet: string;
  rang: number;
  photos: PhotoKit[];
  /** Héros illustré le mieux noté du sujet (clé heros:<sujet>:<registre>), null si aucun */
  heros: string | null;
  /** Traitement photo commun à tout le kit (cohérence) */
  traitement: string;
  noteMoyenne: number | null;
  trous: string[];
  /** Le kit a dû être complété avec des photos d'autres sujets ou « général » */
  complement: boolean;
  /** Kit gardé par Paul (rang 0) */
  garde: boolean;
  cle: string;
};
export type KitGarde = { sujet: string; photos: readonly { emplacement: string; url: string }[] };

export type DonneesKits = {
  banque: readonly PhotoBanque[];
  assets?: PoidsAssets | null;
  notes?: NotesPhotos | null;
  hashtags?: Readonly<Record<string, readonly string[]>> | null;
  /** Soins du sujet (slugs), un emplacement chacun */
  soins?: Readonly<Record<string, readonly string[]>>;
  gardes?: readonly KitGarde[];
  exclues?: ReadonlySet<string>;
  /** Sujets ajoutés / retirés par Paul (assets_sujets) : l'étiquette qui fait entrer une photo dans le VIVIER CURÉ d'un sujet */
  surcharges?: SurchargesSujets | null;
};

// ---------------------------------------------------------------------------------------------------------------
// COUCHE 1 → 2 : le vivier curé (demande de Paul du 2026-10-08 : « d'abord on curate les bonnes images, ensuite à partir des images
// curated on assemble »)
// ---------------------------------------------------------------------------------------------------------------

export type PhotoVivier = { p: PhotoBanque; cle: string; note: number | null; effet: number; importee: boolean; tags: string[] };

/**
 * Photo du VIVIER CURÉ d'un sujet : retenue par Paul (dans la banque : jeu de photos, photo libre gardée ou importée, photo intégrée),
 * ÉTIQUETÉE avec ce sujet par Paul (assets_sujets : sujet ajouté, ou hashtag #<sujet>) et toujours de ce sujet (pas retirée du
 * sujet), jamais exclue (moyenne ou dernière note ≤ 2 ★, retirée, à retravailler), jamais « posture ».
 */
export function estCuree(p: PhotoBanque, sujet: string, d: Pick<DonneesKits, 'surcharges' | 'hashtags' | 'exclues' | 'assets' | 'notes'>): boolean {
  const cle = p.cle ?? clePhoto(p.url);
  if (!cle || !p.sujets.includes(sujet) || /posture/.test(p.url) || p.sujets.includes('posture')) return false;
  if (imageExclue(p.url, d.exclues) || imageExclue(cle, d.exclues) || d.assets?.statuts[cle]) return false;
  const note = d.notes?.[cle]?.m;
  if (typeof note === 'number' && note <= 2) return false;
  const s = d.surcharges?.[cle];
  const tags = (d.hashtags?.[cle] ?? []).map((t) => t.replace(/^#/, ''));
  return Boolean((s?.ajouts.includes(sujet) && !s.retraits.includes(sujet)) || tags.includes(sujet));
}

/** Vivier curé d'un sujet (photos importées et gardées non importées), notées d'abord */
export function vivierCure(sujet: string, d: DonneesKits): PhotoVivier[] {
  return d.banque.filter((p) => estCuree(p, sujet, d)).map((p) => {
    const cle = (p.cle ?? clePhoto(p.url))!;
    return { p, cle, note: d.notes?.[cle]?.m ?? null, effet: scoreAsset(cle, d.assets), importee: p.importee !== false, tags: (d.hashtags?.[cle] ?? []).map((t) => t.replace(/^#/, '')) };
  }).sort((a, b) => (b.note ?? 0) - (a.note ?? 0) || b.effet - a.effet || (a.p.url < b.p.url ? -1 : 1));
}

const hache = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const bruit = (rang: number, k: string) => (rang ? (hache(`${rang}|${k}`) / 4294967296) * 2.2 : 0);

/** Série d'une photo (deux photos d'une même série sont « quasi identiques ») : nom sans numéro, taille ni extension */
export function seriePhoto(url: string, cle?: string | null): string {
  const k = (cle ?? clePhoto(url) ?? url).replace(/\?.*$/, '');
  const nom = k.split('/').pop() ?? k;
  return `${k.slice(0, k.length - nom.length)}${nom.replace(/\.(webp|jpe?g|png|avif)$/, '').replace(/(-\d+)+$/, '').replace(/-(\d{2,4}w?)$/, '')}`;
}

/** Kit d'un sujet ; `rang` : rotation (0 = meilleur, ou kit gardé) */
export function composerKit(sujet: string, d: DonneesKits, rang = 0, soins?: readonly string[]): KitImages {
  const exclues = d.exclues;
  // Couche 2 : le kit n'assemble QUE le vivier curé du sujet (photos importées) ; sinon trou, l'illustration reste
  const pool = d.banque.filter((p) => p.importee !== false && !imageExclue(p.url, exclues) && !(p.cle && imageExclue(p.cle, exclues)) && estCuree(p, sujet, d));
  const sujets = sujet === 'general' ? ['general'] : [sujet];
  const permis = pool;
  const classees = classerPhotos(permis, sujets, d.assets, d.notes);
  const tags = (x: PhotoClassee<PhotoBanque>) => (x.cle ? d.hashtags?.[x.cle] ?? [] : []).map((t) => t.replace(/^#/, ''));
  const etiquette = (x: PhotoClassee<PhotoBanque>, e: EmplacementKit) => {
    const t = tags(x);
    if (e.startsWith('soin:')) return t.includes(e.slice(5)) ? 3 : t.includes('fiche-soin') || t.includes('soin') ? 1 : 0;
    return ETIQUETTES_EMPLACEMENT[e]?.some((y) => t.includes(y)) ? 1 : 0;
  };
  const score = (x: PhotoClassee<PhotoBanque>, e: EmplacementKit, brasser = true) => 3 * (4 - x.palier) + 3 * x.effet + (x.note ?? 3) + 2.5 * etiquette(x, e) + (brasser ? bruit(rang, `${e}|${x.p.url}`) : 0);
  const prises = new Set<string>(), series = new Set<string>();
  const libre = (x: PhotoClassee<PhotoBanque>) => !prises.has(x.p.url) && !series.has(seriePhoto(x.p.url, x.cle));
  const res: PhotoKit[] = [];
  const poser = (e: EmplacementKit, x: PhotoClassee<PhotoBanque>) => {
    prises.add(x.p.url); series.add(seriePhoto(x.p.url, x.cle));
    res.push({ emplacement: e, url: x.p.url, cle: x.cle, note: x.note, complement: x.palier === 4, etiquetee: etiquette(x, e) > 0 });
  };
  const trous: string[] = [];
  const nomSujet = libelleSujetKit(sujet);

  // Kit gardé par Paul : repris tel quel (photos encore valides), le reste complété
  const garde = rang === 0 ? d.gardes?.find((g) => g.sujet === sujet) : undefined;
  if (garde) for (const g of garde.photos) { const x = classees.find((c) => c.p.url === g.url); if (x && libre(x) && !res.some((r) => r.emplacement === g.emplacement && g.emplacement !== 'cabinet')) poser(g.emplacement as EmplacementKit, x); }

  // Premier écran : rotation parmi les 4 meilleures
  if (!res.some((r) => r.emplacement === 'accueil')) {
    const l = classees.filter(libre).sort((a, b) => score(b, 'accueil', false) - score(a, 'accueil', false) || (a.p.url < b.p.url ? -1 : 1));
    const tete = l.slice(0, 4);
    if (tete.length) poser('accueil', tete[rang % tete.length]);
    else trous.push(`${nomSujet} : aucune photo pour le premier écran (l’illustration du sujet le porte).`);
  }
  const meilleure = (e: EmplacementKit, filtre: (x: PhotoClassee<PhotoBanque>) => boolean = () => true) =>
    classees.filter((x) => libre(x) && filtre(x)).sort((a, b) => score(b, e) - score(a, e) || (a.p.url < b.p.url ? -1 : 1))[0];
  // Soins : seulement une photo ÉTIQUETÉE pour ce soin (ou #fiche-soin) et du sujet ; sinon trou (l'illustration du soin reste)
  for (const slug of soins ?? d.soins?.[sujet] ?? []) {
    const e = `soin:${slug}` as const;
    if (res.some((r) => r.emplacement === e)) continue;
    const x = meilleure(e, (c) => etiquette(c, e) > 0 && c.palier <= 3);
    if (x) poser(e, x);
    else trous.push(`${nomSujet} : aucune photo #${slug} (fiche soin) ; l’illustration du soin est utilisée.`);
  }
  if (!res.some((r) => r.emplacement === 'page-sujet')) { const x = meilleure('page-sujet'); if (x) poser('page-sujet', x); }
  // Galerie du cabinet : 4 photos
  for (let i = res.filter((r) => r.emplacement === 'cabinet').length; i < 4; i++) { const x = meilleure('cabinet'); if (x) poser('cabinet', x); }
  if (res.filter((r) => r.emplacement === 'cabinet').length < 4) trous.push(`${nomSujet} : moins de 4 photos pour la galerie du cabinet.`);

  const complement = res.some((r) => r.complement);
  if (complement) trous.unshift(`${nomSujet} : pas assez de bonnes photos du sujet, complété avec ${res.filter((r) => r.complement).length} photo(s) d’autres sujets ou « général ».`);
  const notes = res.map((r) => r.note).filter((n): n is number => n !== null);
  const traitement = [...TRAITEMENTS_PHOTOS].map((t) => ({ id: t.id, s: scoreAsset(cleTraitementPhotos({ id: t.id, grain: false }), d.assets) })).sort((a, b) => b.s - a.s || (a.id === 'modele' ? -1 : 1))[0]?.id ?? 'modele';
  const heros = sujet === 'general' ? null : (['releve', 'pedagogique', 'ligne'] as const).map((r) => `heros:${sujet}:${r}`)
    .filter((k) => !imageExclue(k, exclues) && !d.assets?.statuts[k]).sort((a, b) => scoreAsset(b, d.assets) - scoreAsset(a, d.assets))[0] ?? null;
  return {
    sujet, rang, photos: res, heros, traitement, trous, complement, garde: Boolean(garde),
    noteMoyenne: notes.length ? Math.round((notes.reduce((s, n) => s + n, 0) / notes.length) * 10) / 10 : null,
    cle: `kit:${sujet}:${(hache(res.map((r) => `${r.emplacement}=${r.url}`).join('|')) >>> 0).toString(16).padStart(8, '0')}`,
  };
}

/** Photos d'un kit pour une composition (premier écran d'abord, page sujet, galerie, soins), sans doublon */
export const photosDuKit = (k: Pick<KitImages, 'photos'>): string[] => {
  const ordre = (e: string) => (e === 'accueil' ? 0 : e === 'page-sujet' ? 1 : e === 'cabinet' ? 2 : 3);
  return [...new Set([...k.photos].sort((a, b) => ordre(a.emplacement) - ordre(b.emplacement)).map((p) => p.url))];
};

/** Forme compacte transmise au registre (contexte-images.ts) et aux rendus */
export function kitCompact(k: KitImages): KitCompact {
  const de = (e: string) => k.photos.filter((p) => p.emplacement === e).map((p) => p.url);
  const galerie = [...de('cabinet'), ...de('page-sujet')];
  return {
    sujet: k.sujet,
    ...(de('accueil')[0] ? { accueil: de('accueil')[0] } : {}),
    ...(de('page-sujet')[0] ? { panorama: de('page-sujet')[0] } : {}),
    ...(galerie.length ? { galerie } : {}),
    soins: Object.fromEntries(k.photos.filter((p) => p.emplacement.startsWith('soin:')).map((p) => [p.emplacement.slice(5), p.url])),
  };
}

/** Kits compacts de tous les sujets, rangés par spécialité du pack et par sujet (registre contexte-images.ts) */
export function kitsCompacts(d: DonneesKits, sujets: readonly string[] = SUJETS_KITS): Record<string, KitCompact> {
  const r: Record<string, KitCompact> = {};
  for (const s of sujets) { const k = composerKit(s, d); if (k.photos.length) r[s] = kitCompact(k); }
  return r;
}

// ---------------------------------------------------------------------------------------------------------------
// Notes de kits (« Noter ce kit », migration 0039) → apprentissage des photos
// ---------------------------------------------------------------------------------------------------------------

export type NoteKit = { sujet: string; note: number | null; garder: boolean; photos: readonly { emplacement: string; url: string }[]; appareil?: string | null };

/**
 * Renforts des photos par les notes de kits (mêmes formes que renfortsPoids) : chaque photo du kit reçoit
 * Δ = Σ 0,5 · w · (note − 3 + 0,5 si gardé) / (4 + Σ 0,5 · w), plafond ±0,5 ★ (assets seulement) ; « Garder » sans étoiles = 5★.
 */
export function renfortsKits(notes: readonly NoteKit[]): { atelier: Record<string, number>; assets: Record<string, number> } {
  const acc = new Map<string, { s: number; w: number }>();
  for (const n of notes) {
    const note = Number.isInteger(n.note) && (n.note as number) >= 1 && (n.note as number) <= 5 ? (n.note as number) : n.garder ? 5 : null;
    if (note === null) continue;
    const d = note - 3 + (n.garder ? 0.5 : 0);
    const w = 0.5 * (n.appareil === 'mobile' ? 1.25 : 1);
    for (const k of new Set(n.photos.map((p) => clePhoto(p.url)).filter((x): x is string => Boolean(x)))) { const a = acc.get(k) ?? { s: 0, w: 0 }; a.s += w * d; a.w += w; acc.set(k, a); }
  }
  const assets: Record<string, number> = {};
  for (const k of [...acc.keys()].sort()) { const { s, w } = acc.get(k)!; const v = Math.round(Math.max(-0.5, Math.min(0.5, s / (4 + w))) * 1000) / 1000; if (v) assets[k] = v; }
  return { atelier: {}, assets };
}

/** Kits gardés (le plus récent par sujet) */
export const kitsGardes = (notes: readonly (NoteKit & { le?: string | null })[]): KitGarde[] => {
  const m = new Map<string, KitGarde>();
  for (const n of [...notes].filter((x) => x.garder).sort((a, b) => ((a.le ?? '') < (b.le ?? '') ? -1 : 1))) m.set(n.sujet, { sujet: n.sujet, photos: n.photos });
  return [...m.values()];
};

// ---------------------------------------------------------------------------------------------------------------
// Sites générés (apps/sites, construction) : contexte d'images d'un site à partir des lignes brutes de Supabase
// ---------------------------------------------------------------------------------------------------------------

/**
 * Contexte d'images d'un site praticien : clés exclues et kit de son sujet n° 1, à partir des lignes lues dans Supabase (notes et
 * statuts des assets, sujets et hashtags effectifs, photos libres VALIDÉES et importées, jeux de photos partagés, photos intégrées,
 * notes de kits). Jamais de photo « à valider ».
 */
export function contexteImagesSite(e: {
  sujet: string;
  soins: readonly string[];
  lignesAssets: readonly { cle_asset: string; note: number | null; statut: string | null; etiquettes?: string[] | null }[];
  surcharges?: SurchargesSujets | null;
  lignesHashtags?: readonly { cle_asset: string; hashtag: string; action: string }[];
  libres?: readonly { url: string | null; sujet: string; statut: string; source?: string; id?: string }[];
  jeux?: readonly { photos: PhotosJeu; specialite: string; sujets: readonly string[] }[];
  notesKits?: readonly NoteKit[];
}): { exclues: Set<string>; kit: KitC | null } {
  const lignes = e.lignesAssets.map((l) => ({ cle: l.cle_asset, note: l.note, statut: l.statut, etiquettes: l.etiquettes ?? null }));
  const exclues = clesImagesExclues(lignes);
  const hashtags = hashtagsDepuisLignes((e.lignesHashtags ?? []).map((l) => ({ cle: l.cle_asset, hashtag: l.hashtag, action: l.action as 'ajout' | 'retrait' })), HASHTAGS_PAR_DEFAUT);
  const entrees: EntreeBanquePhotos[] = [
    ...(e.jeux ?? []).flatMap((j) => photosDuJeu(j.photos).filter((u) => !u.startsWith('/photos/')).map((url) => ({ url, origine: 'jeu' as const, sujets: j.sujets }))),
    ...(e.libres ?? []).filter((l) => l.statut === 'validee' && l.url).map((l) => ({ url: l.url!, origine: 'libre' as const, sujets: SUJETS_VISUELS.some((x) => x.id === l.sujet) ? [l.sujet] : ['general'] })),
    ...photosIntegreesBanque().map((p) => ({ url: p.url, origine: 'integree' as const, sujets: p.sujets })),
  ];
  const banque = banquePhotos(entrees, { surcharges: e.surcharges ?? null, hashtags });
  const k = composerKit(e.sujet, { banque, assets: poidsAssets(lignes), notes: notesPhotos(lignes), hashtags, gardes: kitsGardes(e.notesKits ?? []), exclues, surcharges: e.surcharges ?? null }, 0, e.soins);
  return { exclues, kit: k.photos.length ? kitCompact(k) : null };
}
