// Apprentissage du générateur de propositions à partir des notes de l'atelier (/admin/atelier, demande de Paul du 2026-10-07).
//
// Paul note des combinaisons (1 à 5 étoiles) ; chaque note porte les INGRÉDIENTS de la combinaison (structure, gamme, style
// d'illustration, animation, sujet n° 1…). poidsAtelier agrège ces notes par ingrédient, par paire d'ingrédients et par
// combinaison exacte, avec un LISSAGE BAYÉSIEN : la moyenne d'une clé est tirée vers la moyenne générale tant qu'elle a peu de
// notes, donc une note isolée n'a qu'un effet faible.
//
//   μ        = moyenne brute de toutes les notes
//   m(k)     = (somme des notes de k + K · μ) / (n(k) + K)      K = 10 (ingrédient), 12 (paire), 6 (combinaison exacte)
//   effet(k) = m(k) − μ                                         (en étoiles, arrondi au millième ; 0 n'est pas stocké)
//
// Bonus d'une proposition (bonusAtelier, en étoiles) :
//   B = Σ effets des ingrédients / 3 + Σ effets des paires / 3,5 + effet de la combinaison, borné à [−3 ; +2]
// propositions.ts ajoute 2,5 · B à la pertinence (réordonne) et écarte les combinaisons franchement mal notées (B ≤ −1,25)
// tant qu'il reste de quoi composer des lots variés. Les garde-fous (exclusions par sujet, diabète, posture, contrastes AA,
// diversité des lots) sont appliqués AVANT et PENDANT, jamais levés par les poids : les poids ne font que réordonner ou
// retirer des combinaisons déjà autorisées.
//
// Toutes les notes égales (ou aucune note) : tous les effets sont nuls, les propositions sont exactement celles d'avant.
// Les notes des ASSETS (assets-poids.ts, /admin/illustrations) voyagent avec ces poids (champ `assets`) : un seul objet
// transmis au parcours et à l'atelier ; propositions.ts ajoute leur bonus à celui de l'atelier.
// APPAREIL (migration 0034) : une note donnée sur le rendu téléphone pèse 1,25 dans ces sommes (mobile d'abord ; ordinateur et
// « les-deux » : 1). Notes antérieures sans appareil = « les-deux » : poids inchangés.
// Module pur, sans dépendance d'exécution (importé par propositions.ts : il ne doit rien importer de lui).

import { normaliserPoidsAssets, type PoidsAssets } from './assets-poids';
import type { ApprisHarmonie, PoidsHarmonie } from './harmonie';

/** Ingrédients d'une combinaison notée (enregistrés tels quels dans atelier_notes.ingredients) */
export type IngredientsAtelier = {
  /** Structure (univers du parcours) */
  structure: string;
  gamme: string;
  /** Style d'illustration (relevé, illustrations douces, trait fin, photos) */
  style: string;
  /** Registre des dessins et style visuel effectifs (déduits du style et de la structure) */
  registre: string;
  modeVisuel: string;
  animation: string | null;
  /** Héros de l'accueil (sujet n° 1 illustré), null sans sujet */
  heros: string | null;
  /** Sujet n° 1 pris en compte (« cabinet » sans sujet) */
  theme1: string;
  /** Sujets pris en compte, dans l'ordre (principaux puis secondaires) */
  themes: string[];
  /** Couleurs préférées du scénario, dans l'ordre */
  couleurs: string[];
  /** Identifiant de la proposition (sujet~structure~gamme~style~animation) */
  proposition: string;
  /**
   * Photos montrées par l'aperçu (style « photos » : clés `photo:…` de la banque, accueil d'abord), pour que la note porte aussi
   * sur elles (recettes.ts, sourcesCombinaisons). Absent ou vide : clé de combinaison inchangée (notes antérieures).
   */
  photos?: string[];
  /**
   * Réglages complets de la combinaison (2026-10-08, atelier-compositions.ts) : clés atelier `police=…`, `variante=accueil:…`,
   * `variante=entete-anim:…`, `typo=…`, `details=…`, `menu=…`, `effets=…`, `traitement=…` — les nouveaux ingrédients (premiers
   * écrans, animations d'en-tête, portraits, habillage) sont ainsi notés avec la combinaison. Absent : clé inchangée (notes antérieures).
   */
  reglages?: string[];
};

/** Une note de l'atelier (ce que lit l'apprentissage : ni commentaire ni auteur) */
export type NoteAtelier = { ingredients: Partial<IngredientsAtelier>; note: number; etiquettes?: readonly string[] | null; appareil?: string | null };
const poidsNote = (a: unknown) => (a === 'mobile' ? 1.25 : 1);

/** Ingrédients agrégés un par un (le héros est le sujet n° 1 illustré : compté avec theme1) */
export const DIMENSIONS_ATELIER = ['structure', 'gamme', 'style', 'animation', 'theme1'] as const;
export type DimensionAtelier = (typeof DIMENSIONS_ATELIER)[number];

/** Paires agrégées (interactions qui font une combinaison réussie ou ratée) */
export const PAIRES_ATELIER: readonly (readonly [DimensionAtelier, DimensionAtelier])[] = [
  ['structure', 'gamme'],
  ['structure', 'style'],
  ['gamme', 'style'],
  ['theme1', 'structure'],
  ['theme1', 'gamme'],
  ['theme1', 'style'],
  ['structure', 'animation'],
];

/** Force du lissage (nombre de notes « fictives » à la moyenne générale) */
export const LISSAGE_ATELIER = { ingredient: 10, paire: 12, combinaison: 6 } as const;
export type TypeCleAtelier = keyof typeof LISSAGE_ATELIER;

/** Poids appris, compacts (transmis au navigateur du praticien) : effets non nuls seulement */
export type PoidsAtelier = {
  n: number; moyenne: number; effets: Record<string, number>; /** Notes et statuts des assets (0027) */ assets?: PoidsAssets | null;
  /** Recettes complètes notées (notation-recettes.ts, migration 0038) : ingrédients, paires et familles, globaux et par sujet */
  harmonie?: ApprisHarmonie | null;
  /** Effets propres au mobile (duels joués sur téléphone, duels-appareils.ts) : ajoutés selon la portée de la clé (porteeMobile) */
  mobile?: Record<string, number> | null;
};

const val = (v: unknown) => (v === null || v === undefined || v === '' ? 'aucune' : String(v));

/** Clés d'agrégation d'une combinaison : `structure=…`, `structure=…&gamme=…`, `combinaison=…` */
export function clesAtelier(i: Partial<IngredientsAtelier>): { cle: string; type: TypeCleAtelier }[] {
  const r: { cle: string; type: TypeCleAtelier }[] = [];
  const has = (d: DimensionAtelier) => d === 'animation' || Boolean(i[d]);
  for (const d of DIMENSIONS_ATELIER) if (has(d)) r.push({ cle: `${d}=${val(i[d])}`, type: 'ingredient' });
  for (const [a, b] of PAIRES_ATELIER) if (has(a) && has(b)) r.push({ cle: `${a}=${val(i[a])}&${b}=${val(i[b])}`, type: 'paire' });
  // Réglages complets (premiers écrans, animations d'en-tête, portraits, habillage…) : chacun est un ingrédient noté
  for (const k of Array.isArray(i.reglages) ? new Set(i.reglages) : []) if (typeof k === 'string' && k) r.push({ cle: k, type: 'ingredient' });
  if (i.proposition) r.push({ cle: `combinaison=${i.proposition}`, type: 'combinaison' });
  return r;
}

export type StatCleAtelier = { cle: string; type: TypeCleAtelier; n: number; poids: number; somme: number; moyenne: number; lissee: number; effet: number; etiquettes: Record<string, number> };

const arrondi = (x: number, p = 1000) => Math.round(x * p) / p;
const noteValide = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;

/** Statistiques détaillées par clé (synthèse de l'atelier et poids) */
export function statsAtelier(notes: readonly NoteAtelier[]): { n: number; moyenne: number; cles: Map<string, StatCleAtelier> } {
  const ok = notes.filter((x) => noteValide(x.note) && x.ingredients && typeof x.ingredients === 'object');
  const n = ok.length;
  const poidsTotal = ok.reduce((s, x) => s + poidsNote(x.appareil), 0);
  const moyenne = n ? ok.reduce((s, x) => s + poidsNote(x.appareil) * x.note, 0) / poidsTotal : 0;
  const cles = new Map<string, StatCleAtelier>();
  for (const x of ok) {
    const w = poidsNote(x.appareil);
    for (const { cle, type } of clesAtelier(x.ingredients)) {
      let s = cles.get(cle);
      if (!s) { s = { cle, type, n: 0, poids: 0, somme: 0, moyenne: 0, lissee: 0, effet: 0, etiquettes: {} }; cles.set(cle, s); }
      s.n++;
      s.poids += w;
      s.somme += w * x.note;
      for (const e of new Set(x.etiquettes ?? [])) s.etiquettes[e] = (s.etiquettes[e] ?? 0) + 1;
    }
  }
  for (const s of cles.values()) {
    const k = LISSAGE_ATELIER[s.type];
    s.moyenne = s.somme / s.poids;
    s.lissee = (s.somme + k * moyenne) / (s.poids + k);
    s.effet = arrondi(s.lissee - moyenne);
    if (Object.is(s.effet, -0)) s.effet = 0;
  }
  return { n, moyenne, cles };
}

/** Poids agrégés (effets lissés non nuls), déterministes quel que soit l'ordre des notes */
export function poidsAtelier(notes: readonly NoteAtelier[]): PoidsAtelier {
  const { n, moyenne, cles } = statsAtelier(notes);
  const effets: Record<string, number> = {};
  for (const k of [...cles.keys()].sort()) {
    const e = cles.get(k)!.effet;
    if (e !== 0) effets[k] = e;
  }
  return { n, moyenne: arrondi(moyenne), effets };
}

/** Coefficients du bonus et bornes */
export const BONUS_ATELIER = { ingredient: 1 / 3, paire: 1 / 3.5, combinaison: 1, min: -3, max: 2, facteurScore: 2.5, seuilEcart: -1.25 } as const;

/** Bonus d'une combinaison (en étoiles, borné) selon les poids appris ; 0 sans poids */
export function bonusAtelier(i: Partial<IngredientsAtelier>, poids: PoidsAtelier | null | undefined): number {
  if (!poids || !poids.n) return 0;
  let b = 0;
  for (const { cle, type } of clesAtelier(i)) {
    const e = poids.effets[cle];
    if (e) b += e * BONUS_ATELIER[type];
  }
  return arrondi(Math.min(BONUS_ATELIER.max, Math.max(BONUS_ATELIER.min, b)));
}

/** Poids reçus de l'extérieur (route, props) : forme vérifiée, valeurs bornées ; invalide → null */
export function normaliserPoidsAtelier(v: unknown): PoidsAtelier | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.n !== 'number' || !o.effets || typeof o.effets !== 'object') return null;
  const effets: Record<string, number> = {};
  for (const [k, e] of Object.entries(o.effets as Record<string, unknown>)) {
    if (typeof e === 'number' && Number.isFinite(e) && k.length <= 300) effets[k] = Math.max(-4, Math.min(4, e));
  }
  const assets = normaliserPoidsAssets(o.assets);
  const harmonie = normaliserApprisHarmonie(o.harmonie);
  return { n: Math.max(0, Math.floor(o.n)), moyenne: typeof o.moyenne === 'number' ? o.moyenne : 0, effets, ...(assets ? { assets } : {}), ...(harmonie ? { harmonie } : {}) };
}

/** Apprentissage des recettes complètes reçu de l'extérieur : valeurs numériques bornées à ±1, clés courtes ; invalide → null */
export function normaliserApprisHarmonie(v: unknown): ApprisHarmonie | null {
  if (!v || typeof v !== 'object') return null;
  const table = (t: unknown) => {
    const r: Record<string, number> = {};
    if (t && typeof t === 'object') for (const [k, e] of Object.entries(t as Record<string, unknown>)) if (typeof e === 'number' && Number.isFinite(e) && k.length <= 300) r[k] = Math.max(-1, Math.min(1, e));
    return r;
  };
  const ph = (x: unknown): PoidsHarmonie | null => (x && typeof x === 'object' ? { familles: table((x as Record<string, unknown>).familles), ingredients: table((x as Record<string, unknown>).ingredients), paires: table((x as Record<string, unknown>).paires) } : null);
  const o = v as Record<string, unknown>;
  const global = ph(o.global);
  if (!global) return null;
  const sujets: Record<string, PoidsHarmonie> = {};
  if (o.sujets && typeof o.sujets === 'object') for (const [k, x] of Object.entries(o.sujets as Record<string, unknown>)) { const p = ph(x); if (p && /^[a-z-]{2,30}$/.test(k)) sujets[k] = p; }
  return { global, ...(Object.keys(sujets).length ? { sujets } : {}) };
}

/** Hachage FNV-1a 32 bits (hexadécimal, 8 caractères) */
function fnv(s: string, graine: number): string {
  let h = graine >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Forme canonique des ingrédients (clés triées, listes gardées dans l'ordre) */
export function ingredientsCanoniques(i: Partial<IngredientsAtelier>): IngredientsAtelier {
  const liste = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 12) : []);
  const txt = (v: unknown) => (typeof v === 'string' ? v.slice(0, 120) : '');
  return {
    structure: txt(i.structure),
    gamme: txt(i.gamme),
    style: txt(i.style),
    registre: txt(i.registre),
    modeVisuel: txt(i.modeVisuel),
    animation: typeof i.animation === 'string' && i.animation ? i.animation.slice(0, 60) : null,
    heros: typeof i.heros === 'string' && i.heros ? i.heros.slice(0, 60) : null,
    theme1: txt(i.theme1) || 'cabinet',
    themes: liste(i.themes),
    couleurs: liste(i.couleurs),
    proposition: txt(i.proposition).slice(0, 200),
    // Photos : seulement si présentes (la clé des combinaisons notées sans photo ne change pas)
    ...(Array.isArray(i.photos) && i.photos.some((x) => typeof x === 'string' && /^photo:[^\s]{1,200}$/.test(x))
      ? { photos: [...new Set(i.photos.filter((x): x is string => typeof x === 'string' && /^photo:[^\s]{1,200}$/.test(x)))].slice(0, 8) } : {}),
    // Réglages : seulement si présents (clés atelier bien formées, triées)
    ...(Array.isArray(i.reglages) && i.reglages.some(estCleReglage) ? { reglages: [...new Set(i.reglages.filter(estCleReglage))].sort().slice(0, 60) } : {}),
  };
}

function estCleReglage(x: unknown): x is string {
  return typeof x === 'string' && x.length <= 120 && /^(police|ordre|effets|variante|typo|details|menu|traitement)=[^\s&]{1,110}$/.test(x);
}

/** Clé stable d'une combinaison (16 caractères hexadécimaux) : hachage des ingrédients canoniques */
export function cleCombinaison(i: Partial<IngredientsAtelier>): string {
  const c = ingredientsCanoniques(i);
  const s = JSON.stringify(Object.keys(c).sort().map((k) => [k, c[k as keyof IngredientsAtelier]]));
  return fnv(s, 2166136261) + fnv(s, 0x9747b28c);
}
