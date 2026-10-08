// Contexte d'images partagé (demande de Paul du 2026-10-08 : « je ne veux pas qu'il me présente dans des thèmes complets des photos
// que j'ai notées 1 étoile […] des kits d'images par thème »). Registre, rempli UNE fois par l'application (admin : layouts
// /admin, /creer, /edition, /mon-site via ContexteImages ; sites : chargement Supabase du site), lu par TOUS les chemins qui posent
// une photo : fusionnerPack (packs.ts : pack de spécialité, personnalisation, jeu de photos), jeuVisuel / completerJeuVisuel (jeux.ts :
// premier écran, panorama, galerie, photo de chaque soin, couvertures), persoDuJeuPhotos, appliquerRecette (photos de la recette),
// tirerPhotos (studio, atelier, duels, recettes à noter), kits (kits-images.ts).
// - EXCLUES : clés `photo:…` (et `heros:…`, `dessin:…`) notées en moyenne ≤ 2 ★, dont la dernière note est ≤ 2 ★, retirées ou « à
//   retravailler » (clesImagesExclues). Une photo exclue n'est JAMAIS posée : la suivante non exclue la remplace, sinon l'illustration.
// - KITS : par spécialité (sport, diabete, enfant, soins → pédicurie, generale → général ; sites : le sujet n° 1 du site), photo de
//   premier écran, panorama, galerie, photo par soin : ils passent avant les photos par défaut de la spécialité, après une
//   personnalisation explicite de l'admin ou du praticien.
// Registre vide (tests, scripts) : comportement d'avant. Module sans dépendance (importé par packs.ts et jeux.ts).

/** Kit compact transmis aux rendus (kits-images.ts, kitCompact) */
export type KitCompact = {
  sujet?: string; accueil?: string; panorama?: string; galerie?: string[]; soins?: Record<string, string>;
  /** Kit illustré (kits-visuels.ts) : dessin par soin (nom de dessin), animation d'en-tête ; jamais d'élément exclu */
  dessins?: Record<string, string>; animation?: string; registre?: string; heros?: string;
};

/**
 * `vivier` : par sujet, URLs des photos du VIVIER CURÉ (kits-images.ts : retenues, étiquetées par Paul, importées) notées ≥ 4 ★,
 * meilleures d'abord. Posé (même vide) : les tirages de photos (recettes.ts) n'utilisent QUE ces photos, et le style « Photos » est
 * tiré plus souvent quand le sujet n° 1 en a assez (VIVIER_PHOTOS). Absent (null) : comportement d'avant.
 */
type Etat = { exclues: ReadonlySet<string>; kits: Readonly<Record<string, KitCompact>>; vivier: Readonly<Record<string, readonly string[]>> | null };
let ETAT: Etat = { exclues: new Set(), kits: {}, vivier: null };

/** Remplit le registre (une fois par requête, rendu ou construction) ; champs absents : inchangés */
export function definirContexteImages(c: { exclues?: Iterable<string> | null; kits?: Record<string, KitCompact> | null; vivier?: Record<string, readonly string[]> | null }): void {
  ETAT = { exclues: c.exclues ? new Set(c.exclues) : ETAT.exclues, kits: c.kits ? { ...c.kits } : ETAT.kits, vivier: c.vivier !== undefined ? (c.vivier ? { ...c.vivier } : null) : ETAT.vivier };
}
export const contexteImages = (): Readonly<Etat> => ETAT;
/** Remet le registre à vide (tests) */
export const viderContexteImages = () => { ETAT = { exclues: new Set(), kits: {}, vivier: null }; };

/**
 * Style « Photos » et vivier (demande de Paul du 2026-10-08 : « voir aussi des photos de ma banque retenues et notées 4 ou 5 étoiles ») :
 * le sujet n° 1 a assez de photos 4-5 ★ curées (`seuil`) → part visée de combinaisons en style photo (`part`, atelier, Studio, recettes à
 * noter, duels de thèmes) ; sinon le style photo n'est pas tiré.
 */
export const VIVIER_PHOTOS = { seuil: 3, part: 0.5 } as const;
/** Photos 4-5 ★ du vivier d'un sujet (null : registre inactif) */
export const vivierDuSujet = (sujet: string | null | undefined): readonly string[] | null => (ETAT.vivier ? ETAT.vivier[sujet ?? ''] ?? [] : null);

/** Clé d'une image à partir de son URL (même règle que clePhoto d'assets-poids.ts, sans en dépendre) */
export function cleImage(u: string): string | null {
  if (!u) return null;
  if (/^[a-z]+:[^\s/][^\s]*$/.test(u) && !u.startsWith('http')) return u;
  const integree = /^\/photos\/([a-z0-9-]{1,120})\.(webp|jpe?g|png|avif)$/.exec(u);
  if (integree) return `photo:${integree[1]}`;
  const i = u.indexOf('/storage/v1/object/public/photos/');
  if (i < 0) return null;
  const chemin = u.slice(i + '/storage/v1/object/public/photos/'.length).split('?')[0];
  return chemin && !chemin.includes('..') ? `photo:${chemin}` : null;
}

/** Image exclue (URL ou clé) */
export function imageExclue(u: string | null | undefined, exclues: ReadonlySet<string> = ETAT.exclues): boolean {
  if (!u || !exclues.size) return false;
  const k = cleImage(u);
  return exclues.has(u) || Boolean(k && exclues.has(k));
}
/** Liste sans images exclues (ordre gardé) */
export const sansImagesExclues = (l: readonly string[], exclues: ReadonlySet<string> = ETAT.exclues): string[] => l.filter((u) => !imageExclue(u, exclues));
/** Première image non exclue d'une liste de remplaçantes (chaîne vide si aucune) */
export const premiereNonExclue = (l: readonly (string | null | undefined)[], exclues: ReadonlySet<string> = ETAT.exclues): string => (l.find((u) => u && !imageExclue(u, exclues)) as string | undefined) ?? '';

/** Sujet des kits d'une spécialité du pack */
export const SUJET_DE_SPECIALITE: Readonly<Record<string, string>> = { sport: 'sport', diabete: 'diabete', enfant: 'enfant', soins: 'pedicurie', generale: 'general' };
/** Kit enregistré pour une spécialité (clé directe, sinon sujet de la spécialité) */
export const kitDeSpecialite = (specialite: string): KitCompact | undefined => ETAT.kits[specialite] ?? ETAT.kits[SUJET_DE_SPECIALITE[specialite] ?? ''];

/**
 * Clés exclues d'après les lignes d'apprentissage des assets (assets_notes_apprentissage : notes, PLUS RÉCENTES D'ABORD, puis
 * statuts) : moyenne ≤ 2 ★, dernière note ≤ 2 ★, statut « retiré » ou « à retravailler ». Photos et illustrations (photo:, heros:,
 * dessin:, ligne:, picto:, materiel:).
 */
export function clesImagesExclues(lignes: readonly { cle: string; note?: number | null; statut?: string | null }[]): Set<string> {
  const r = new Set<string>();
  const notes = new Map<string, { s: number; n: number; derniere: number }>();
  for (const l of lignes) {
    if (!l?.cle || !/^(photo|heros|dessin|ligne|picto|materiel):/.test(l.cle)) continue;
    if (l.statut === 'retire' || l.statut === 'a_retravailler') r.add(l.cle);
    const n = l.note;
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5) {
      const a = notes.get(l.cle);
      if (a) { a.s += n; a.n++; } else notes.set(l.cle, { s: n, n: 1, derniere: n });
    }
  }
  for (const [k, a] of notes) if (a.s / a.n <= 2 || a.derniere <= 2) r.add(k);
  return r;
}
