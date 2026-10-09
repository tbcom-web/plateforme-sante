// Rendus HORS LIGNE (constructions de démonstration, testeur de modèles, rendre-recettes : sans base de données) — manque M15 du
// 2026-10-09. Deux choses que l'admin et les sites reçoivent de Supabase et que ces rendus n'avaient pas :
// 1. les EXCLUSIONS (photos et illustrations notées ≤ 2 ★, dernière note ≤ 2 ★, retirées, à retravailler, à revoir), tirées des
//    exports du dépôt (retours/assets-notes.json, retours/illustrations-statuts.json) ;
// 2. les MEILLEURES PHOTOS IMPORTÉES (photos libres validées, hébergées dans le stockage public « photos », moyenne ≥ 4 ★), qui
//    n'existaient qu'en base : manifeste retours/photos-validees.json écrit par l'export nocturne (scripts/exporter-retours.mjs,
//    clé service en secret GitHub, jamais affichée) : URL publique, clé, sujets, note, source. Aucune donnée personnelle (ni
//    auteur, ni identifiant de compte).
// contexteImagesHorsLigne → { exclues, vivier, banque } : passé à definirContexteImages (registre de contexte-images.ts) par la démo
// et le testeur ; le vivier ne contient QUE des photos 4-5 ★ non exclues (photos du manifeste + photos intégrées bien notées), donc
// un design en style « Photos » tire ses photos là et nulle part ailleurs (tirerPhotos, recettes.ts). Pur.

import { clesImagesExclues } from './contexte-images';
import { notesPhotos } from './favoris';
import { SUJETS_KITS } from './kits-images';
import { banquePhotos, photosIntegreesBanque, type PhotoBanque } from './recettes';
import { clePhoto } from './assets-poids';

/** Une photo du manifeste retours/photos-validees.json */
export type PhotoValidee = {
  url: string;
  cle: string;
  sujets: string[];
  /** Moyenne des notes de Paul (1-5) et nombre de notes */
  note: number;
  notes: number;
  /** Banque d'origine (pexels, pixabay, ia…), crédit sans auteur */
  source: string | null;
};

/** Note minimale d'une photo du manifeste et du vivier hors ligne */
export const NOTE_MIN_PHOTO_VALIDEE = 4;

type OptionsBanque = NonNullable<Parameters<typeof banquePhotos>[1]>;
type LigneNote = { cle: string; note?: number | null; statut?: string | null; jour?: string | null };
type LigneStatut = { cle: string; statut?: string | null };

/** Statuts de revue qui écartent un élément de tout rendu hors ligne (strict : « à revoir » compris) */
const STATUTS_EXCLUS = new Set(['retire', 'a_retravailler', 'a_revoir']);

/**
 * Clés exclues hors ligne : règle commune (clesImagesExclues : moyenne ou dernière note ≤ 2 ★, retirées, à retravailler, tranchées
 * 1 ★), lignes de notes remises PLUS RÉCENTES D'ABORD (les exports sont chronologiques), plus le statut « à revoir ».
 */
export function clesExcluesHorsLigne(notes: readonly LigneNote[], statuts: readonly LigneStatut[] = []): Set<string> {
  const recentes = notes.map((l, i) => ({ l, i })).sort((a, b) => String(b.l.jour ?? '').localeCompare(String(a.l.jour ?? '')) || b.i - a.i).map((x) => x.l);
  const r = clesImagesExclues([...recentes, ...statuts.map((s) => ({ cle: s.cle, statut: s.statut ?? null }))]);
  for (const s of statuts) if (s?.cle && s.statut && STATUTS_EXCLUS.has(s.statut) && /^(photo|heros|dessin|ligne|picto|materiel|animation):/.test(s.cle)) r.add(s.cle);
  return r;
}

/** Ligne de la table photos_libres (colonnes publiques seulement) */
export type LignePhotoLibre = { url?: string | null; chemin?: string | null; statut: string; sujet?: string | null; source?: string | null };

/**
 * Manifeste des photos validées (export) : photos libres validées ET hébergées (statut « validee », fichier dans le stockage public),
 * sujets effectifs (sujet de la photo + sujets ajoutés / retirés par Paul + hashtags de sujet), jamais exclues, moyenne ≥ `noteMin`.
 * Meilleures d'abord, puis URL (ordre stable : un export sans nouveau retour ne change rien).
 */
export function manifestePhotosValidees(
  libres: readonly LignePhotoLibre[], notes: readonly LigneNote[], opts: { statuts?: readonly LigneStatut[]; surcharges?: OptionsBanque['surcharges']; hashtags?: OptionsBanque['hashtags']; noteMin?: number } = {},
): PhotoValidee[] {
  const exclues = clesExcluesHorsLigne(notes, opts.statuts ?? []);
  const moyennes = notesPhotos(notes);
  const sources = new Map<string, string | null>();
  const entrees = libres.filter((l) => l.statut === 'validee' && l.chemin && l.url && clePhoto(l.url)).map((l) => {
    sources.set(l.url!, typeof l.source === 'string' ? l.source : null);
    return { url: l.url!, origine: 'libre' as const, sujets: [l.sujet && l.sujet !== 'general' ? l.sujet : 'general'] };
  });
  const min = opts.noteMin ?? NOTE_MIN_PHOTO_VALIDEE;
  return banquePhotos(entrees, { surcharges: opts.surcharges, hashtags: opts.hashtags })
    .flatMap((p): PhotoValidee[] => {
      const cle = p.cle ?? clePhoto(p.url);
      const m = cle ? moyennes[cle] : undefined;
      if (!cle || !m || m.m < min || exclues.has(cle) || exclues.has(p.url) || p.sujets.includes('posture')) return [];
      return [{ url: p.url, cle, sujets: [...p.sujets], note: m.m, notes: m.n, source: sources.get(p.url) ?? null }];
    })
    .sort((a, b) => b.note - a.note || b.notes - a.notes || (a.url < b.url ? -1 : 1));
}

/** Lecture tolérante d'un manifeste (fichier JSON du dépôt) : lignes valides seulement */
export function lireManifestePhotos(brut: unknown): PhotoValidee[] {
  const l = Array.isArray(brut) ? brut : Array.isArray((brut as { photos?: unknown })?.photos) ? (brut as { photos: unknown[] }).photos : [];
  return l.flatMap((x): PhotoValidee[] => {
    const p = x as Partial<PhotoValidee>;
    if (!p || typeof p.url !== 'string' || !/^https:\/\//.test(p.url) || !clePhoto(p.url) || typeof p.note !== 'number' || !Array.isArray(p.sujets)) return [];
    return [{ url: p.url, cle: clePhoto(p.url)!, sujets: p.sujets.filter((s): s is string => typeof s === 'string'), note: p.note, notes: typeof p.notes === 'number' ? p.notes : 1, source: typeof p.source === 'string' ? p.source : null }];
  });
}

/**
 * Contexte d'images d'un rendu hors ligne : exclusions strictes, vivier 4-5 ★ par sujet (photos du manifeste, puis photos intégrées
 * notées ≥ 4 ★ ; jamais une exclue) et banque correspondante (pour photosDuKitProfil et les tirages). `vivier` couvre tous les sujets
 * des kits (même vides) : le registre est « actif », un sujet sans photo 4-5 ★ ne reçoit AUCUNE photo (l'illustration reste).
 */
export function contexteImagesHorsLigne(notes: readonly LigneNote[], statuts: readonly LigneStatut[] = [], manifeste: readonly PhotoValidee[] = []): { exclues: Set<string>; vivier: Record<string, string[]>; banque: PhotoBanque[] } {
  const exclues = clesExcluesHorsLigne(notes, statuts);
  const moyennes = notesPhotos(notes);
  const libres: PhotoBanque[] = manifeste.filter((p) => !exclues.has(p.cle) && p.note >= NOTE_MIN_PHOTO_VALIDEE).map((p) => ({ url: p.url, sujets: p.sujets, origine: 'libre', cle: p.cle }));
  const integrees = photosIntegreesBanque().filter((p) => { const k = clePhoto(p.url); return k && !exclues.has(k) && (moyennes[k]?.m ?? 0) >= NOTE_MIN_PHOTO_VALIDEE; });
  const banque = [...libres, ...integrees];
  const vivier = Object.fromEntries(SUJETS_KITS.map((s) => [s, banque.filter((p) => p.sujets.includes(s)).map((p) => p.url)]));
  return { exclues, vivier, banque };
}
