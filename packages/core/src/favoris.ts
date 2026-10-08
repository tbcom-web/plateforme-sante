// « Favoris d'abord » (demande de Paul du 2026-10-08 : « pousser plus de belles photos dans les thèmes à évaluer […] mettre en avant
// le plus possible, dans les évaluations / l'atelier / les combinaisons au hasard, les éléments ayant été notés le mieux »).
//
// MODE DE TIRAGE (réglage « Favoris d'abord · Équilibré · Découverte » du Studio et de la tuile Recettes complètes, défaut : Favoris) :
//   poids d'une valeur = 2^(g · clamp(effet appris, −3, 2))    g = gourmandise du mode (Favoris 3, Équilibré 1, Découverte 0,5)
//   valeur jamais notée : poids fixe (Favoris 0,15 : elle ne sort quasiment qu'en exploration ; Équilibré 1 ; Découverte 1,6)
//   valeur exclue (poids 0, tous modes) : statut « retiré » ou « à retravailler », ou note estimée (moyenne + effet) ≤ 2 ★
//   Équilibré = le comportement d'avant (2^effet), exclusions en plus.
// PHOTOS (classerPhotos / tirerPhotosFavorites) : photos du sujet n° 1 notées en moyenne ≥ 4 ★ d'abord, puis ≥ 3,5 ★, triées par effet
// appris, puis les meilleures des autres sujets du scénario et « général » ; jamais une photo retirée, à retravailler, ≤ 2 ★ ou retirée du
// sujet ; la première photo (premier écran) tourne parmi les 4 meilleures (graine) pour ne pas montrer toujours la même.
// EXPLORATION : seulement dans le générateur de recettes à noter (≈ 10 % en Favoris, candidates badgées « exploration ») et en mode
// Découverte ; les dés du Studio en Favoris n'explorent pas.
// Module pur, sans dépendance vers recettes.ts ni harmonie.ts (ils l'importent).

import { clePhoto, retireDesSujets, scoreAssetPourSujet, type PoidsAssets } from './assets-poids';
import { imageExclue } from './contexte-images';

export const MODES_TIRAGE = [
  { id: 'favoris', nom: 'Favoris d’abord', detail: 'Les éléments les mieux notés reviennent le plus souvent', gourmandise: 3, nonNotes: 0.15, exploration: 0.1 },
  { id: 'equilibre', nom: 'Équilibré', detail: 'Les notes pondèrent, sans insister', gourmandise: 1, nonNotes: 1, exploration: 0.2 },
  { id: 'decouverte', nom: 'Découverte', detail: 'Montre aussi ce qui n’a pas encore été noté', gourmandise: 0.5, nonNotes: 1.6, exploration: 0.35 },
] as const;
export type ModeTirage = (typeof MODES_TIRAGE)[number]['id'];
export const MODE_TIRAGE_DEFAUT: ModeTirage = 'favoris';
export const estModeTirage = (x: unknown): x is ModeTirage => MODES_TIRAGE.some((m) => m.id === x);
export const reglageMode = (m: unknown) => MODES_TIRAGE.find((x) => x.id === m) ?? MODES_TIRAGE[0];

/** Note estimée sous laquelle une valeur est exclue des tirages */
export const SEUIL_EXCLUSION = 2;

/**
 * Poids d'une valeur dans un tirage selon son effet appris (étoiles, relatif à la moyenne) ; `effet` undefined = jamais notée ;
 * `exclue` : statut retiré / à retravailler ; `moyenne` : moyenne de référence (note estimée = moyenne + effet).
 */
export function poidsFavori(effet: number | undefined, mode?: ModeTirage | null, opts: { moyenne?: number; exclue?: boolean; note?: number | null } = {}): number {
  if (opts.exclue) return 0;
  const r = reglageMode(mode ?? MODE_TIRAGE_DEFAUT);
  if (typeof opts.note === 'number' && opts.note <= SEUIL_EXCLUSION) return 0;
  if (effet === undefined) return r.nonNotes;
  if (opts.note === undefined && (opts.moyenne ?? 3) + effet <= SEUIL_EXCLUSION) return 0;
  return 2 ** (r.gourmandise * Math.max(-3, Math.min(2, effet)));
}

/** Notes brutes des photos (moyenne, nombre), transmises avec les poids appris (lib/atelier.ts) */
export type NotesPhotos = Record<string, { m: number; n: number }>;

/** Moyennes brutes par clé à partir des lignes d'apprentissage des assets (photos seulement) */
export function notesPhotos(lignes: readonly { cle: string; note?: number | null }[]): NotesPhotos {
  const acc = new Map<string, { s: number; n: number }>();
  for (const l of lignes) {
    if (!l.cle?.startsWith('photo:') || !Number.isInteger(l.note) || (l.note as number) < 1 || (l.note as number) > 5) continue;
    const a = acc.get(l.cle) ?? { s: 0, n: 0 };
    a.s += l.note as number; a.n++;
    acc.set(l.cle, a);
  }
  const r: NotesPhotos = {};
  for (const k of [...acc.keys()].sort()) { const a = acc.get(k)!; r[k] = { m: Math.round((a.s / a.n) * 100) / 100, n: a.n }; }
  return r;
}

export type PhotoClassable = { url: string; sujets: readonly string[]; cle?: string | null; importee?: boolean };
export type PhotoClassee<P> = { p: P; cle: string | null; note: number | null; effet: number; palier: 1 | 2 | 3 | 4; sujetUn: boolean };

/**
 * Photos classées pour un scénario : palier 1 = note moyenne ≥ 4 ★, 2 = ≥ 3,5 ★, 3 = jamais notée ou entre deux, 4 = photo d'un autre
 * sujet du scénario ou « général » (complément) ; exclues : retirées, à retravailler, ≤ 2 ★, retirées des sujets. Tri : sujet n° 1 et
 * palier d'abord, puis effet appris, puis note, puis URL (stable).
 */
export function classerPhotos<P extends PhotoClassable>(pool: readonly P[], sujets: readonly string[], assets: PoidsAssets | null | undefined, notes?: NotesPhotos | null): PhotoClassee<P>[] {
  const s1 = sujets[0];
  const l: PhotoClassee<P>[] = [];
  for (const p of pool) {
    const cle = p.cle ?? clePhoto(p.url);
    const note = cle ? notes?.[cle]?.m ?? null : null;
    const statut = cle ? assets?.statuts[cle] : undefined;
    if (statut || imageExclue(p.url) || (cle && imageExclue(cle)) || (note !== null && note <= SEUIL_EXCLUSION) || (cle && retireDesSujets(cle, sujets.length ? sujets : ['general'], assets))) continue;
    const effet = cle ? scoreAssetPourSujet(cle, s1, assets) : 0;
    if (note === null && cle && assets && (assets.moyenne || 3) + effet <= SEUIL_EXCLUSION && assets.effets[cle] !== undefined) continue;
    const sujetUn = Boolean(s1 && p.sujets.includes(s1));
    const palier: PhotoClassee<P>['palier'] = !sujetUn ? 4 : note !== null && note >= 4 ? 1 : note !== null && note >= 3.5 ? 2 : 3;
    l.push({ p, cle, note, effet, palier, sujetUn });
  }
  return l.sort((a, b) => a.palier - b.palier || b.effet - a.effet || (b.note ?? 0) - (a.note ?? 0) || (a.p.url < b.p.url ? -1 : 1));
}

/** Nombre de photos « bien notées » (≥ 3,5 ★) du sujet n° 1 sous lequel on le signale */
export const MIN_PHOTOS_NOTEES = 3;

/**
 * Tirage « Favoris d'abord » de `n` photos : la première (premier écran) tourne parmi les 4 meilleures (graine `r`), les suivantes
 * sont tirées dans les paliers 1-2, puis complétées dans l'ordre du classement (palier 3, puis autres sujets). `manque` : message
 * « Peu de photos notées pour <sujet> » quand le sujet n° 1 a moins de 3 photos ≥ 3,5 ★.
 */
export function tirerPhotosFavorites<P extends PhotoClassable>(classees: readonly PhotoClassee<P>[], r: () => number, n = 5, eviter: readonly string[] = []): { photos: string[]; manque: boolean } {
  const bonnes = classees.filter((x) => x.palier <= 2);
  const l = classees.filter((x) => !eviter.includes(x.p.url) || classees.length <= n);
  const res: string[] = [];
  const tete = l.slice(0, Math.min(4, Math.max(1, l.filter((x) => x.palier <= 2).length || Math.min(4, l.length))));
  if (tete.length) res.push(tete[Math.floor(r() * tete.length)].p.url);
  // Puis, palier par palier (≥ 3,5 ★, non notées, autres sujets), tirage pondéré 2^(3 · effet) sans remise
  const w = (x: PhotoClassee<P>) => 2 ** (3 * Math.max(-3, Math.min(2, x.effet)));
  for (const paliers of [[1, 2], [3], [4]]) {
    let reste = l.filter((x) => paliers.includes(x.palier) && !res.includes(x.p.url));
    while (res.length < n && reste.length) {
      let v = r() * reste.reduce((t, x) => t + w(x), 0);
      let choisi = reste[reste.length - 1];
      for (const x of reste) { v -= w(x); if (v < 0) { choisi = x; break; } }
      res.push(choisi.p.url);
      reste = reste.filter((x) => x !== choisi);
    }
  }
  return { photos: res, manque: bonnes.length < MIN_PHOTOS_NOTEES };
}

/**
 * Candidats d'un duel en « Favoris d'abord » (pour duels.ts / Duel.tsx : opposer surtout de bons éléments entre eux, quelques duels
 * de découverte) : avec la probabilité 1 − exploration, seulement les candidats notés au-dessus de la moyenne (s'il y en a au moins
 * deux), sinon tous les candidats non exclus. Les exclus (retirés, à retravailler, ≤ 2 ★) ne sont jamais renvoyés.
 */
export function candidatsDuelFavoris<T extends { cle: string }>(candidats: readonly T[], assets: PoidsAssets | null | undefined, mode: ModeTirage | null | undefined, r: () => number): { candidats: T[]; decouverte: boolean } {
  const reg = reglageMode(mode ?? MODE_TIRAGE_DEFAUT);
  const ok = candidats.filter((c) => poidsFavori(assets?.effets[c.cle], mode, { moyenne: assets?.moyenne || 3, exclue: Boolean(assets?.statuts[c.cle]) }) > 0);
  if (r() < reg.exploration) return { candidats: ok, decouverte: true };
  const bons = ok.filter((c) => (assets?.effets[c.cle] ?? 0) > 0);
  return bons.length >= 2 ? { candidats: bons, decouverte: false } : { candidats: ok, decouverte: false };
}
