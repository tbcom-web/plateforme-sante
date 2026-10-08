// 🍽 DÉGUSTATION (décision de Paul du 2026-10-08 : « la manière la plus efficace et la plus ludique de donner du goût au
// générateur ») : /admin/degustation. Le duel A/B apprend 1 comparaison par clic ; la GRILLE « Choisis tes 2 préférées parmi 6 »
// en apprend 9 à 12 pour 3 ou 4 clics. Documentation : docs/degustation.md. Module PUR, déterministe pour une graine, sans
// dépendance vers recettes.ts (les propositions sont fabriquées par des fonctions passées en paramètre : degustation-grilles.ts).
//
// 1. GRILLE (genererGrille) : 6 propositions du MÊME scénario, chacune = la base (favoris 4-5 ★, qualite.ts) avec UN SEUL élément
//    qui change, toujours dans la même dimension (6 palettes, 6 premiers écrans…) : entre deux propositions, la seule différence est
//    leur élément nouveau, l'effet lui est donc attribué sans ambiguïté. Jamais un élément refusé (1 ★, ≤ 2 ★) ni déjà tranché
//    (5 ★ : plus redemandé) comme nouveau ; jamais deux fois le même nouveau ; priorité aux éléments incertains (jamais jugés).
// 2. MODÈLE DE CHOIX (duelsDepuisChoix) : Paul touche ses 2 préférées (la première touchée = n° 1) et, s'il veut, « celle qui ne va
//    pas ». Modèle de Plackett-Luce (choix successifs) sur le classement partiel : P(i n° 1) = e^θi / Σ e^θ, puis n° 2 parmi les
//    restantes, puis « la pire » parmi les autres (meilleur-pire). Décomposition exacte en comparaisons par paires (rank-breaking
//    complet, estimateur convergent de Plackett-Luce, Azari Soufiani et al. 2013) : n° 1 bat les 5 autres, n° 2 bat les 4 restantes
//    (5 + 4 = 9 comparaisons BT), et les 3 du milieu battent la pire (+ 3). Chaque comparaison est un duel à une dimension (poids 1)
//    versé dans le MÊME moteur que les duels (renfortsDuels → getPoidsAtelier : Δ(k) = clamp(0,5 · θk, ±0,5 ★), cumul ±1 ★, mêmes
//    clés d'ingrédients et de combinaisons). Paires écrites dans un ordre canonique : résultat indépendant de l'ordre d'affichage.
// 3. SESSION (planifierSession) : ~20 cartes de 5 minutes, mélange selon ce qui apprend le plus maintenant : grilles surtout
//    (dimensions incertaines ou non couvertes, profils en retard), quelques duels de départage du haut du classement, quelques
//    notes rapides d'ingrédients jamais notés (nouveautés acceptées d'abord).
// 4. BATS CLAUDE (pariGrille, scoreBatsClaude) : avant chaque choix, le juge parie (prédiction cachée : note prédite de l'élément
//    nouveau, retours/predictions.json, sinon effet appris) ; après : « Claude avait parié sur la n° 3 ». Accord = pari dans les
//    2 préférées (hasard : 2/6 = 33 %) ; tendance sur la semaine.
// 5. JEU (xpCarte, niveauPalais, missionsProfil, defiDuJour, medailles, apprentissagesSession) : XP, niveaux de palais, série de
//    jours, défi du jour, missions par profil, médailles, écran de fin. Le jeu ne pilote JAMAIS le mélange (efficacité d'abord).

import { ajusterBT, cleDePaire, hasard, jsonStable, normaliserIngredientsDuel, normaliserScenarioDuel, renfortsDuels, serieDuels, TYPES_DUEL, type Duel, type IngredientsDuel, type MatchBT, type ScenarioDuel, type TypeDuel } from './duels';
import type { Tranches } from './tranches';

// ---------------------------------------------------------------------------------------------------------------
// Formats de grille
// ---------------------------------------------------------------------------------------------------------------

export const FORMATS_GRILLE = [
  // Refonte du 2026-10-09 : la grille par défaut montre des DIRECTIONS radicalement différentes (degustation-directions.ts) ;
  // les autres formats sont des grilles « Détail » montrées en bloc focalisé, écart minimal garanti entre options
  { id: 'directions', nom: 'Directions', type: 'theme', appareil: 'bureau', detail: 'Des sites radicalement différents pour le même client : une famille de style chacun.' },
  { id: 'compositions', nom: 'Compositions complètes', type: 'theme', appareil: 'bureau', detail: 'Six sites pour le même client : une seule chose change de l’un à l’autre (palette, polices, effets, détails…).' },
  { id: 'palettes-polices', nom: 'Palettes et polices', type: 'theme', appareil: 'bureau', detail: 'Spécimens : six palettes avec la même paire de polices, ou six paires de polices sur la même palette.' },
  { id: 'premiers-ecrans', nom: 'Premiers écrans', type: 'element', appareil: 'mobile', detail: 'Le haut de la page d’accueil sur téléphone, six présentations.' },
  { id: 'kits', nom: 'Kits d’images', type: 'photo', appareil: 'bureau', detail: 'Le kit d’images du sujet, seule la photo du premier écran change.' },
  { id: 'icones', nom: 'Icônes', type: 'illustration', appareil: 'bureau', detail: 'La même icône dans chaque style à l’essai.' },
  { id: 'pages', nom: 'Mises en page', type: 'element', appareil: 'bureau', detail: 'La même page (fiche soin, contact…) en six structures.' },
] as const satisfies readonly { id: string; nom: string; type: TypeDuel; appareil: 'bureau' | 'mobile'; detail: string }[];
export type FormatGrille = (typeof FORMATS_GRILLE)[number]['id'];
export const estFormatGrille = (x: unknown): x is FormatGrille => FORMATS_GRILLE.some((f) => f.id === x);
export const formatGrille = (id: unknown) => FORMATS_GRILLE.find((f) => f.id === id) ?? null;

/**
 * Dimensions (même vocabulaire que les duels) que chaque format sait faire varier. Mesuré le 2026-10-08 sur les scénarios types :
 * palettes, polices, premiers écrans, structures des pages soins / accès / cabinet donnent 6 propositions ; effets, illustrations,
 * coins, graisse, pages sujet et article 3 à 5 (le moteur d'harmonie permet peu de valeurs) ; un dé à 2 valeurs reste au duel.
 */
export const DIMENSIONS_FORMAT: Readonly<Record<FormatGrille, readonly string[]>> = {
  directions: ['directions'],
  // Détail : effets écartés (invisibles en vignette, retour du 2026-10-09) ; palettes et polices : format « palettes-polices »
  compositions: ['visuels', 'details:coins', 'typo:graisse'],
  'palettes-polices': ['couleurs', 'polices'],
  'premiers-ecrans': ['composant:accueil'],
  kits: ['photo'],
  icones: ['variante:style'],
  pages: ['page:soins', 'page:acces', 'page:cabinet', 'page:theme', 'page:article'],
};

export const TAILLE_GRILLE = 6;

// ---------------------------------------------------------------------------------------------------------------
// 1. Génération d'une grille
// ---------------------------------------------------------------------------------------------------------------

export type PropositionGrille<C> = { x: C; cle: string; nouveau: string };
export type Grille<C> = { base: C; dimension: string; propositions: PropositionGrille<C>[] };

/**
 * Grille de `n` propositions : variantes de `base` pour UNE dimension, chacune avec exactement un élément absent de la base (son
 * « nouveau »). Rejets : plusieurs éléments changés, nouveau refusé ou déjà tranché, une clé refusée dans la composition, doublon
 * (même composition ou même nouveau), `controle` faux. Parmi les candidates admissibles, les plus utiles à apprendre (`interet`,
 * défaut 1) avec un peu de hasard ; ordre d'affichage tiré au hasard. null s'il y en a moins de `min` (3).
 */
export function genererGrille<C>(p: {
  base: C; dimension: string; graine: number; n?: number; min?: number; essais?: number;
  varier: (x: C, dimension: string, graine: number) => C;
  elements: (x: C) => readonly string[];
  cle: (x: C) => string;
  controle?: (base: C, y: C) => boolean;
  tranches?: Pick<Tranches, 'refuses' | 'favoris'> | null;
  interet?: (nouveau: string) => number;
  /** Deux propositions nettement différentes ? (écart minimal garanti ; sinon la grille est plus courte) */
  distinct?: (a: C, b: C) => boolean;
}): Grille<C> | null {
  const n = p.n ?? TAILLE_GRILLE, r = hasard(p.graine);
  const base = new Set(p.elements(p.base));
  const refuses = p.tranches?.refuses ?? new Set<string>(), favoris = p.tranches?.favoris ?? new Set<string>();
  const cleBase = p.cle(p.base);
  const vus = new Map<string, { x: C; cle: string; nouveau: string; score: number }>();
  const cles = new Set<string>([cleBase]);
  const essais = (p.essais ?? 6) * n;
  for (let t = 0; t < essais && vus.size < 4 * n; t++) {
    const y = p.varier(p.base, p.dimension, (Math.imul(p.graine >>> 0, 2654435761) + 97 * t + 13) >>> 0);
    const els = p.elements(y);
    const nouveaux = els.filter((k) => !base.has(k));
    if (nouveaux.length !== 1) continue;
    const k = nouveaux[0], c = p.cle(y);
    if (refuses.has(k) || favoris.has(k) || refuses.has(c) || els.some((e) => refuses.has(e)) || cles.has(c) || vus.has(k)) continue;
    if (p.controle && !p.controle(p.base, y)) continue;
    cles.add(c);
    vus.set(k, { x: y, cle: c, nouveau: k, score: (p.interet?.(k) ?? 1) + 0.35 * r() });
  }
  const l: { x: C; cle: string; nouveau: string; score: number }[] = [];
  for (const v of [...vus.values()].sort((a, b) => b.score - a.score || a.nouveau.localeCompare(b.nouveau))) {
    if (l.length >= n) break;
    if (p.distinct && !l.every((y) => p.distinct!(v.x, y.x))) continue;
    l.push(v);
  }
  if (l.length < (p.min ?? 3)) return null;
  const melange = l.map((x) => ({ x, k: r() })).sort((a, b) => a.k - b.k).map((o) => ({ x: o.x.x, cle: o.x.cle, nouveau: o.x.nouveau }));
  return { base: p.base, dimension: p.dimension, propositions: melange };
}

/** Intérêt d'apprendre un élément : jamais noté ni joué 1, incertain (σ du classement) entre les deux, noté 3 ★ 0,4 */
export function interetElement(cle: string, opts: { notes?: Readonly<Record<string, { m: number; n: number }>> | null; sigma?: Readonly<Record<string, number>> | null; nouveautes?: ReadonlySet<string> | null } = {}): number {
  const nn = opts.notes?.[cle];
  const s = opts.sigma?.[cle];
  let v = nn ? (nn.m >= 4 ? 0.3 : 0.4) / Math.sqrt(nn.n) : typeof s === 'number' ? Math.min(1, s) : 1;
  if (opts.nouveautes?.has(cle)) v += 0.5;
  return Math.round(v * 1000) / 1000;
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Choix enregistré et modèle de choix (Plackett-Luce → comparaisons par paires)
// ---------------------------------------------------------------------------------------------------------------

export type PropositionChoix = { cle: string; ingredients: IngredientsDuel };

export type ChoixGrille = {
  format: FormatGrille;
  type: TypeDuel;
  dimension: string;
  scenario: ScenarioDuel;
  propositions: PropositionChoix[];
  /** Indices des préférées, dans l'ordre où Paul les a touchées (n° 1 puis n° 2) */
  meilleures: number[];
  /** « Celle qui ne va pas » (facultatif) */
  pire: number | null;
  /** Pari caché du juge (indice) */
  pari: number | null;
  appareil: 'ordinateur' | 'mobile' | 'les-deux';
  session: string | null;
  dureeMs: number | null;
  /** Profession dégustée (registre professions.ts) ; null = profession par défaut (tout ce qui précède le multi-professions) */
  profession: string | null;
  /** Profil dégusté (profil de pratique « sport-basket », sinon scénario type) : missions et jauges par profil */
  profil: string | null;
  le?: string | null;
};

const CLE = /^[a-z]+:[^\s]{1,200}$/;
const SLUG_PROFESSION = /^[a-z0-9-]{2,40}$/;
const DIM = /^[a-z0-9:_-]{1,60}$/;
const estIndice = (x: unknown, n: number): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) < n;

/** Choix reçu du navigateur → forme valide, ou un message */
export function validerChoixGrille(b: Record<string, unknown>): { ok: true; choix: ChoixGrille } | { ok: false; message: string } {
  if (!estFormatGrille(b.format)) return { ok: false, message: 'Format de grille inconnu.' };
  const type = (TYPES_DUEL as readonly unknown[]).includes(b.type) ? (b.type as TypeDuel) : formatGrille(b.format)!.type;
  if (typeof b.dimension !== 'string' || !DIM.test(b.dimension)) return { ok: false, message: 'Dimension invalide.' };
  if (!Array.isArray(b.propositions) || b.propositions.length < 2 || b.propositions.length > TAILLE_GRILLE) return { ok: false, message: 'Il faut de 2 à 6 propositions.' };
  const propositions: PropositionChoix[] = [];
  for (const x of b.propositions) {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    if (typeof o.cle !== 'string' || !CLE.test(o.cle)) return { ok: false, message: 'Proposition invalide.' };
    propositions.push({ cle: o.cle, ingredients: normaliserIngredientsDuel(o.ingredients) });
  }
  if (new Set(propositions.map((x) => x.cle)).size !== propositions.length) return { ok: false, message: 'Propositions en double.' };
  const n = propositions.length;
  const meilleures = Array.isArray(b.meilleures) ? [...new Set(b.meilleures.filter((i) => estIndice(i, n)))] as number[] : [];
  if (!meilleures.length || meilleures.length > 2 || meilleures.length !== (b.meilleures as unknown[]).length) return { ok: false, message: 'Choisissez une ou deux préférées.' };
  const pire = estIndice(b.pire, n) && !meilleures.includes(b.pire) ? b.pire : null;
  if (b.pire !== null && b.pire !== undefined && pire === null) return { ok: false, message: '« Celle qui ne va pas » ne peut pas être une préférée.' };
  const pari = estIndice(b.pari, n) ? b.pari : null;
  const appareil = b.appareil === 'mobile' || b.appareil === 'ordinateur' ? b.appareil : 'les-deux';
  const session = typeof b.session === 'string' && /^[a-z0-9-]{4,40}$/.test(b.session) ? b.session : null;
  const dureeMs = Number.isInteger(b.dureeMs) && (b.dureeMs as number) >= 0 && (b.dureeMs as number) <= 3_600_000 ? (b.dureeMs as number) : null;
  const profession = typeof b.profession === 'string' && SLUG_PROFESSION.test(b.profession) ? b.profession : null;
  const profil = typeof b.profil === 'string' && /^[a-z0-9~.+_-]{2,80}$/.test(b.profil) ? b.profil : null;
  return { ok: true, choix: { format: b.format, type, dimension: b.dimension, scenario: normaliserScenarioDuel(b.scenario), propositions, meilleures, pire, pari, appareil, session, dureeMs, profession, profil } };
}

/** Ligne de degustation_choix (ou de degustation_apprentissage) → choix ; invalide → null */
export function choixDepuisLigne(l: Record<string, unknown>): ChoixGrille | null {
  const v = validerChoixGrille({
    format: l.format, type: l.type, dimension: l.dimension, scenario: l.scenario, propositions: l.propositions, meilleures: l.meilleures,
    pire: l.pire ?? null, pari: l.pari ?? null, appareil: l.appareil, session: l.session ?? null, dureeMs: l.duree_ms ?? null, profession: l.profession ?? null, profil: l.profil ?? null,
  });
  return v.ok ? { ...v.choix, le: typeof l.created_at === 'string' ? l.created_at : null } : null;
}

/**
 * Comparaisons par paires impliquées par un choix (rank-breaking complet du classement partiel de Plackett-Luce) :
 * n° 1 > toutes les autres ; n° 2 > toutes sauf n° 1 ; les « milieu » > la pire. Indices (gagnant, perdant).
 */
export function comparaisonsDuChoix(c: Pick<ChoixGrille, 'propositions' | 'meilleures' | 'pire'>): [number, number][] {
  const n = c.propositions.length;
  const res: [number, number][] = [];
  const pris = new Set<number>();
  for (const m of c.meilleures) {
    pris.add(m);
    for (let j = 0; j < n; j++) if (!pris.has(j)) res.push([m, j]);
  }
  if (c.pire !== null && !pris.has(c.pire)) for (let j = 0; j < n; j++) if (!pris.has(j) && j !== c.pire) res.push([j, c.pire]);
  return res;
}

/**
 * Duels équivalents (même moteur que les duels A/B : renfortsDuels, pairesDuels, renfortsDuelsMobiles). Écrits dans un ordre
 * canonique (a = la plus petite clé) : le résultat ne dépend ni de l'ordre d'affichage ni de l'ordre des comparaisons. Pas de
 * « prédiction » (le pari de la grille est mesuré à part) et jamais « les deux sont mauvais » (la pire n'est pas un refus).
 */
export function duelsDepuisChoix(c: ChoixGrille): Duel[] {
  return comparaisonsDuChoix(c).map(([g, p]) => {
    const G = c.propositions[g], P = c.propositions[p];
    const [a, b, resultat] = G.cle < P.cle ? [G, P, 'a' as const] : [P, G, 'b' as const];
    // Directions : duels LIBRES (poids 0,5 réparti sur toutes les clés qui diffèrent, mêmes plafonds) ; la famille est l'élément classé
    return { type: c.type, scenario: c.scenario, aCle: a.cle, bCle: b.cle, aIngredients: a.ingredients, bIngredients: b.ingredients, dimension: c.format === 'directions' ? null : c.dimension, resultat, etiquettes: [], appareil: c.appareil, prediction: null, le: c.le ?? null };
  }).sort((x, y) => cleDePaire(x.aCle, x.bCle).localeCompare(cleDePaire(y.aCle, y.bCle)));
}

/** Tous les duels équivalents d'une liste de choix */
export const duelsDesChoix = (l: readonly ChoixGrille[]): Duel[] => l.flatMap(duelsDepuisChoix);

// ---------------------------------------------------------------------------------------------------------------
// Professions (consigne de Paul du 2026-10-08 : ostéopathes, kinés… arriveront ; registre professions.ts)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Dimensions TRANSVERSALES : ingrédients communs à toutes les professions (palettes, polices, typographie, détails, menus, effets,
 * mises en page, premiers écrans, combinaisons police × palette). Les autres (photos, illustrations, icônes, kits) sont propres
 * à la profession.
 */
export const DIMENSIONS_TRANSVERSALES: readonly string[] = ['couleurs', 'polices', 'police-couleurs', 'typo', 'details', 'menu', 'effets', 'surfaces', 'composant:accueil'];
export const estDimensionTransversale = (d: string | null | undefined) => Boolean(d) && (DIMENSIONS_TRANSVERSALES.includes(d!) || /^(typo|details|page|page-libre|composant):/.test(d!));

/** Profession effective d'un choix (null → profession par défaut, fournie par l'appelant : jamais codée ici) */
export const professionDuChoix = (c: Pick<ChoixGrille, 'profession'>, parDefaut: string) => c.profession || parDefaut;

/** Choix d'une profession (sessions, missions, médailles, « Mon palais ») */
export const choixDeLaProfession = <T extends Pick<ChoixGrille, 'profession'>>(l: readonly T[], profession: string, parDefaut: string): T[] => l.filter((c) => professionDuChoix(c, parDefaut) === profession);

/**
 * Choix qui nourrissent le goût d'une profession : TOUS les siens, plus ceux des autres professions sur les dimensions
 * transversales (goût commun). Sans profession (null) : tout (goût transversal global).
 */
export function choixPourApprentissage<T extends Pick<ChoixGrille, 'profession' | 'dimension'>>(l: readonly T[], profession: string | null, parDefaut: string): T[] {
  if (!profession) return [...l];
  return l.filter((c) => professionDuChoix(c, parDefaut) === profession || estDimensionTransversale(c.dimension));
}

/** Probabilité Plackett-Luce du classement partiel observé (tests, simulation) */
export function vraisemblancePL(theta: readonly number[], meilleures: readonly number[], pire: number | null = null): number {
  let restant = theta.map((_, i) => i);
  let p = 1;
  for (const m of meilleures) {
    const z = restant.reduce((s, i) => s + Math.exp(theta[i]), 0);
    p *= Math.exp(theta[m]) / z;
    restant = restant.filter((i) => i !== m);
  }
  if (pire !== null) {
    // Meilleur-pire : la pire est choisie parmi les restantes avec des forces opposées
    const z = restant.reduce((s, i) => s + Math.exp(-theta[i]), 0);
    p *= Math.exp(-theta[pire]) / z;
  }
  return p;
}

/** Tirage d'un choix « Paul synthétique » : Plackett-Luce (Gumbel-max), n° 1, n° 2, et la pire */
export function tirerChoixPL(theta: readonly number[], r: () => number, opts: { k?: number; pire?: boolean } = {}): { meilleures: number[]; pire: number | null } {
  const gumbel = () => -Math.log(-Math.log(Math.min(1 - 1e-12, Math.max(1e-12, r()))));
  const ordre = theta.map((t, i) => ({ i, v: t + gumbel() })).sort((a, b) => b.v - a.v).map((x) => x.i);
  const meilleures = ordre.slice(0, opts.k ?? 2);
  if (!opts.pire) return { meilleures, pire: null };
  const reste = theta.map((t, i) => ({ i, v: -t + gumbel() })).filter((x) => !meilleures.includes(x.i)).sort((a, b) => b.v - a.v);
  return { meilleures, pire: reste[0]?.i ?? null };
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Bats Claude : pari caché du juge
// ---------------------------------------------------------------------------------------------------------------

/**
 * Pari du juge : la proposition dont l'élément nouveau a la meilleure note prédite (`noteDe` : prédiction du juge, sinon effet
 * appris) ; ex æquo départagés par la clé (déterministe) ; null si aucune n'a de prédiction (Claude « passe »).
 */
export function pariGrille(propositions: readonly { cle: string; nouveau?: string | null; juge?: readonly string[] }[], noteDe: (k: string) => number | null): number | null {
  let best: { i: number; v: number; k: string } | null = null;
  propositions.forEach((p, i) => {
    const cles = [...(p.juge ?? []), ...(p.nouveau ? [p.nouveau] : [])];
    const notes = cles.map(noteDe).filter((x): x is number => typeof x === 'number');
    if (!notes.length) return;
    const v = notes.reduce((s, x) => s + x, 0) / notes.length;
    if (!best || v > best.v + 1e-9 || (Math.abs(v - best.v) <= 1e-9 && p.cle < best.k)) best = { i, v, k: p.cle };
  });
  return best === null ? null : (best as { i: number }).i;
}

export type PariJoue = { le: string; accord: boolean; hasard: number };

/** Paris d'une liste de choix de grille (pari connu) : accord = pari parmi les préférées */
export const parisDesChoix = (l: readonly ChoixGrille[]): PariJoue[] =>
  l.filter((c) => c.pari !== null).map((c) => ({ le: c.le ?? '', accord: c.meilleures.includes(c.pari!), hasard: c.meilleures.length / c.propositions.length }));

export type ScoreBatsClaude = { n: number; accords: number; taux: number | null; hasard: number | null; paul: number; claude: number; tendance: number | null; texte: string };

/**
 * Score « Bats Claude » : Claude marque quand son pari est parmi tes préférées, toi quand tu le surprends. `taux` d'accord et
 * niveau du hasard ; tendance = taux des 7 derniers jours − taux des 7 jours d'avant (points), si les deux ont ≥ 3 paris.
 */
export function scoreBatsClaude(paris: readonly PariJoue[], aujourdhui?: string | null): ScoreBatsClaude {
  const n = paris.length, accords = paris.filter((p) => p.accord).length;
  const taux = n ? Math.round((100 * accords) / n) : null;
  const hasardMoy = n ? Math.round((100 * paris.reduce((s, p) => s + p.hasard, 0)) / n) : null;
  let tendance: number | null = null;
  if (aujourdhui) {
    const t0 = new Date(`${aujourdhui.slice(0, 10)}T12:00:00Z`).getTime();
    const age = (p: PariJoue) => (t0 - new Date(`${p.le.slice(0, 10)}T12:00:00Z`).getTime()) / 86400000;
    const rec = paris.filter((p) => p.le && age(p) >= 0 && age(p) < 7), avant = paris.filter((p) => p.le && age(p) >= 7 && age(p) < 14);
    const tx = (l: readonly PariJoue[]) => (100 * l.filter((p) => p.accord).length) / l.length;
    if (rec.length >= 3 && avant.length >= 3) tendance = Math.round(tx(rec) - tx(avant));
  }
  const texte = !n ? 'Claude n’a pas encore parié.' : `Claude te suit à ${taux} % (${accords}/${n} ; hasard ${hasardMoy} %)${tendance !== null ? ` · ${tendance >= 0 ? '+' : ''}${tendance} points sur 7 jours` : ''}`;
  return { n, accords, taux, hasard: hasardMoy, paul: n - accords, claude: accords, tendance, texte };
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Session « Dégustation du jour »
// ---------------------------------------------------------------------------------------------------------------

export type CarteSession =
  | { id: string; kind: 'grille'; format: FormatGrille; dimension: string; profil: string; valeur: number }
  | { id: string; kind: 'duel'; dimension: string; profil: string; a: string; b: string; valeur: number }
  | { id: string; kind: 'note'; cle: string; profil: string | null; valeur: number };

export type EtatApprentissage = {
  /** Profils (de pratique, sinon scénarios par sujet) et leur part « prête » (0-1) */
  profils: readonly { id: string; pret: number }[];
  /** Pistes de grille : format × dimension × profil, incertitude (0-1 : élevé = beaucoup à apprendre), couverte (≥ 2 éléments 4-5 ★), jouées (grilles déjà faites) */
  pistes: readonly { format: FormatGrille; dimension: string; profil: string; incertitude: number; couverte: boolean; jouees: number }[];
  /** Haut du classement : paires proches à départager (|Δθ| faible, σ élevé) */
  departages: readonly { dimension: string; profil: string; a: string; b: string; ecart: number; sigma: number }[];
  /** Ingrédients jamais notés (nouveautés acceptées d'abord) */
  aNoter: readonly { cle: string; profil: string | null; nouveaute: boolean }[];
};

/** Durées moyennes estimées (secondes) : une grille se lit d'un coup d'œil (6 vignettes, 2 touches + Valider) */
export const DUREES_CARTES = { grille: 16, duel: 8, note: 5 } as const;
export const SESSION = { cartes: 20, partDuels: 0.15, partNotes: 0.15 } as const;

/** Valeur d'apprentissage d'une piste de grille (bits attendus approximatifs, décroissants à chaque répétition) */
export function valeurPiste(p: EtatApprentissage['pistes'][number], pret: number): number {
  const v = 0.5 + 1.5 * p.incertitude + (p.couverte ? 0 : 1) + 1.2 * (1 - pret);
  return Math.round((v / (1 + 0.25 * p.jouees)) * 1000) / 1000;
}

/**
 * Plan de session : `n` cartes (≈ 20, 5 minutes). Quotas adaptatifs : notes rapides (au plus 15 %, s'il y a des ingrédients jamais
 * notés), duels de départage (au plus 15 %, s'il y a des paires proches en tête), grilles pour le reste ; dans chaque famille, choix
 * glouton par valeur d'apprentissage avec rendement décroissant (la même piste vaut 0,6× après chaque passage). Ordre : grilles
 * réparties, duels intercalés, notes regroupées en rafale à la fin du premier tiers et du dernier tiers.
 */
export function planifierSession(e: EtatApprentissage, opts: { n?: number; graine?: number; directions?: number } = {}): CarteSession[] {
  const n = opts.n ?? SESSION.cartes, r = hasard(opts.graine ?? 1);
  const pret = new Map(e.profils.map((p) => [p.id, p.pret]));
  const nNotes = Math.min(Math.round(n * SESSION.partNotes), e.aNoter.length);
  const nDuels = Math.min(Math.round(n * SESSION.partDuels), e.departages.length);
  // ENTONNOIR (2026-10-09) : 3-4 grilles « Directions » d'abord (profils les moins prêts), puis les détails de ces profils (dans
  // leurs familles préférées : la page construit la base), quelques duels de départage
  const avecDirections = e.pistes.some((p) => p.format === 'directions');
  const profilsTete = [...e.profils].sort((a, b) => a.pret - b.pret || a.id.localeCompare(b.id)).slice(0, opts.directions ?? (e.profils.length >= 4 ? 4 : 3));
  const directions: CarteSession[] = avecDirections ? profilsTete.map((p, i) => ({ id: `r${i}`, kind: 'grille', format: 'directions', dimension: 'directions', profil: p.id, valeur: Math.round((2 + 2 * (1 - p.pret)) * 1000) / 1000 })) : [];
  const tete = new Set(profilsTete.map((p) => p.id));
  const pistes = e.pistes.filter((p) => p.format !== 'directions');
  const nGrilles = pistes.length ? n - nNotes - nDuels - directions.length : 0;
  const grilles: CarteSession[] = [];
  const passages = new Map<string, number>();
  for (let i = 0; i < nGrilles; i++) {
    let best: { p: EtatApprentissage['pistes'][number]; v: number } | null = null;
    for (const p of pistes) {
      const k = `${p.format}|${p.dimension}|${p.profil}`;
      const v = valeurPiste(p, pret.get(p.profil) ?? 0.5) * (directions.length && tete.has(p.profil) ? 1.5 : 1) * 0.6 ** (passages.get(k) ?? 0) + 0.05 * r();
      if (!best || v > best.v) best = { p, v };
    }
    if (!best) break;
    const k = `${best.p.format}|${best.p.dimension}|${best.p.profil}`;
    passages.set(k, (passages.get(k) ?? 0) + 1);
    grilles.push({ id: `g${i}`, kind: 'grille', format: best.p.format, dimension: best.p.dimension, profil: best.p.profil, valeur: Math.round(best.v * 1000) / 1000 });
  }
  const duels: CarteSession[] = [...e.departages].sort((a, b) => (a.ecart - a.sigma) - (b.ecart - b.sigma) || cleDePaire(a.a, a.b).localeCompare(cleDePaire(b.a, b.b))).slice(0, nDuels)
    .map((d, i) => ({ id: `d${i}`, kind: 'duel', dimension: d.dimension, profil: d.profil, a: d.a, b: d.b, valeur: Math.round((1 + d.sigma - d.ecart) * 1000) / 1000 }));
  const notes: CarteSession[] = [...e.aNoter].sort((a, b) => Number(b.nouveaute) - Number(a.nouveaute) || a.cle.localeCompare(b.cle)).slice(0, nNotes)
    .map((x, i) => ({ id: `n${i}`, kind: 'note', cle: x.cle, profil: x.profil, valeur: x.nouveaute ? 1.5 : 1 }));
  // Ordre : grilles en tête de chaque bloc ; deux rafales de notes ; duels intercalés régulièrement
  const res: CarteSession[] = [...grilles];
  const rafale1 = notes.slice(0, Math.ceil(notes.length / 2)), rafale2 = notes.slice(rafale1.length);
  res.splice(Math.min(res.length, Math.max(2, Math.round(n / 3) - rafale1.length)), 0, ...rafale1);
  duels.forEach((d, i) => res.splice(Math.min(res.length, Math.round(((i + 1) * res.length) / (duels.length + 1))), 0, d));
  res.splice(Math.max(0, res.length - 2), 0, ...rafale2);
  return [...directions, ...res].slice(0, n);
}

/** Temps restant estimé (secondes) des cartes non jouées */
export const tempsEstime = (cartes: readonly Pick<CarteSession, 'kind'>[]) => cartes.reduce((s, c) => s + DUREES_CARTES[c.kind], 0);
export const texteDuree = (s: number) => (s < 60 ? `${Math.max(5, Math.round(s / 5) * 5)} s` : `${Math.round(s / 60)} min`);

/** Session interrompue reprenable : moins de 12 h et au moins une carte restante */
export function sessionReprenable(s: { debut: string; position: number; cartes: readonly unknown[] } | null | undefined, maintenant: string): boolean {
  if (!s || !Array.isArray(s.cartes) || s.position >= s.cartes.length || s.position < 0) return false;
  const age = new Date(maintenant).getTime() - new Date(s.debut).getTime();
  return age >= 0 && age < 12 * 3600 * 1000;
}

// ---------------------------------------------------------------------------------------------------------------
// 5. Jeu : XP, niveaux de palais, série, défi du jour, missions, médailles
// ---------------------------------------------------------------------------------------------------------------

export const XP = { grille: 10, pire: 2, duel: 5, note: 3, tranche: 5, dimensionCouverte: 25, mission: 50, defi: 40, accordClaude: 1 } as const;

/** XP d'une carte : base + bonus (élément tranché, dimension couverte), × bonus de série (+10 % par jour, +50 % au plus) */
export function xpCarte(kind: CarteSession['kind'], opts: { pire?: boolean; tranche?: boolean; couverture?: boolean; serie?: number } = {}): number {
  const base = XP[kind] + (opts.pire ? XP.pire : 0) + (opts.tranche ? XP.tranche : 0) + (opts.couverture ? XP.dimensionCouverte : 0);
  return Math.round(base * (1 + Math.min(0.5, 0.1 * Math.max(0, (opts.serie ?? 1) - 1))));
}

export const NIVEAUX_PALAIS: readonly { seuil: number; nom: string }[] = [
  { seuil: 0, nom: 'Palais curieux' }, { seuil: 100, nom: 'Palais attentif' }, { seuil: 250, nom: 'Palais exercé' }, { seuil: 500, nom: 'Palais affûté' },
  { seuil: 900, nom: 'Fin palais' }, { seuil: 1500, nom: 'Palais de chef' }, { seuil: 2500, nom: 'Grand palais' }, { seuil: 4000, nom: 'Palais étoilé' },
  { seuil: 6000, nom: 'Palais de référence' },
];

export function niveauPalais(xp: number): { niveau: number; nom: string; xp: number; debut: number; suivant: number | null; part: number } {
  let i = 0;
  while (i + 1 < NIVEAUX_PALAIS.length && xp >= NIVEAUX_PALAIS[i + 1].seuil) i++;
  const debut = NIVEAUX_PALAIS[i].seuil, suivant = NIVEAUX_PALAIS[i + 1]?.seuil ?? null;
  return { niveau: i + 1, nom: NIVEAUX_PALAIS[i].nom, xp, debut, suivant, part: suivant === null ? 1 : Math.max(0, Math.min(1, (xp - debut) / (suivant - debut))) };
}

/** Série de jours (dégustations, duels et notes comptent) */
export const serieDegustation = (jours: readonly string[]) => serieDuels(jours);

function hachage(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export type DefiDuJour = { id: string; texte: string; format: FormatGrille | null; profil: string | null; cible: number; secondes: number | null; xp: number };

/**
 * Défi du jour (déterministe pour la date) : sur le profil le plus en retard (sinon tiré), « N grilles <profil> en moins de M min »,
 * « 3 grilles où Claude se trompe » ou « une série de 5 notes en rafale ».
 */
export function defiDuJour(jour: string, profils: readonly { id: string; nom: string; pret: number }[]): DefiDuJour {
  const h = hachage(jour.slice(0, 10));
  const tries = [...profils].sort((a, b) => a.pret - b.pret || a.id.localeCompare(b.id));
  const p = tries.length ? tries[h % Math.min(3, tries.length)] : null;
  const k = (h >>> 8) % 3;
  if (k === 0 && p) return { id: `grilles-${p.id}`, texte: `10 grilles ${p.nom} en moins de 3 min`, format: null, profil: p.id, cible: 10, secondes: 180, xp: XP.defi };
  if (k === 1) return { id: 'surprendre', texte: '3 grilles où tu surprends Claude', format: null, profil: null, cible: 3, secondes: null, xp: XP.defi };
  return { id: 'rafale', texte: '5 notes rapides d’affilée en rafale', format: null, profil: null, cible: 5, secondes: null, xp: XP.defi };
}

/** Avancement du défi d'après les cartes jouées aujourd'hui */
export function avancementDefi(d: DefiDuJour, jouees: readonly { kind: CarteSession['kind']; profil?: string | null; accordClaude?: boolean | null; dureeMs?: number | null }[]): { fait: number; reussi: boolean } {
  let fait = 0;
  if (d.id.startsWith('grilles-')) {
    const l = jouees.filter((c) => c.kind === 'grille' && c.profil === d.profil);
    const temps = l.reduce((s, c) => s + (c.dureeMs ?? 0), 0) / 1000;
    fait = l.length;
    return { fait, reussi: fait >= d.cible && (d.secondes === null || temps <= d.secondes) };
  }
  if (d.id === 'surprendre') fait = jouees.filter((c) => c.kind === 'grille' && c.accordClaude === false).length;
  else {
    let serie = 0;
    for (const c of jouees) { serie = c.kind === 'note' ? serie + 1 : 0; fait = Math.max(fait, serie); }
  }
  return { fait: Math.min(fait, d.cible), reussi: fait >= d.cible };
}

export const OBJECTIFS_MISSION = { grilles: 3, kits: 1, recettesGardees: 2 } as const;

export type MissionProfil = { profil: string; nom: string; etapes: { id: 'grilles' | 'kits' | 'recettesGardees'; texte: string; fait: number; cible: number }[]; part: number; terminee: boolean; texte: string };

/** Mission « Rendre le profil <nom> prêt : 3 grilles, 1 kit, 2 recettes gardées » */
export function missionProfil(p: { id: string; nom: string }, faits: { grilles: number; kits: number; recettesGardees: number }): MissionProfil {
  const etapes = ([
    ['grilles', `${OBJECTIFS_MISSION.grilles} grilles`], ['kits', `${OBJECTIFS_MISSION.kits} kit d’images`], ['recettesGardees', `${OBJECTIFS_MISSION.recettesGardees} recettes gardées`],
  ] as const).map(([id, texte]) => ({ id, texte, fait: Math.min(faits[id], OBJECTIFS_MISSION[id]), cible: OBJECTIFS_MISSION[id] }));
  const part = etapes.reduce((s, e) => s + e.fait / e.cible, 0) / etapes.length;
  return { profil: p.id, nom: p.nom, etapes, part, terminee: part >= 1, texte: `Rendre le profil ${p.nom} prêt : ${etapes.map((e) => e.texte).join(', ')}` };
}

export type Medaille = { id: string; nom: string; detail: string };

/** Médailles gagnées (état complet) ; comparer deux appels (avant / après la session) donne les nouvelles */
export function medailles(e: { grilles: number; serie: number; dimensionsCouvertes: readonly { id: string; nom: string }[]; profilsPrets: readonly { id: string; nom: string }[]; missions: readonly MissionProfil[]; accord?: ScoreBatsClaude | null }): Medaille[] {
  const l: Medaille[] = [];
  if (e.grilles >= 1) l.push({ id: 'premiere-grille', nom: 'Première grille', detail: 'Ta première dégustation.' });
  for (const [s, nom] of [[50, 'Cinquante grilles'], [200, 'Deux cents grilles'], [1000, 'Mille grilles']] as const) if (e.grilles >= s) l.push({ id: `grilles-${s}`, nom, detail: `${s} grilles dégustées.` });
  for (const s of [3, 7, 30]) if (e.serie >= s) l.push({ id: `serie-${s}`, nom: `Série de ${s} jours`, detail: `${s} jours d’affilée.` });
  for (const d of e.dimensionsCouvertes) l.push({ id: `dimension:${d.id}`, nom: `${d.nom} : 100 % 4-5 ★ possible`, detail: 'Au moins deux choix 4-5 ★ dans cette dimension.' });
  for (const p of e.profilsPrets) l.push({ id: `profil:${p.id}`, nom: `Profil ${p.nom} prêt`, detail: 'Toutes ses dimensions ont des choix 4-5 ★.' });
  for (const m of e.missions) if (m.terminee) l.push({ id: `mission:${m.profil}`, nom: `Mission ${m.nom} accomplie`, detail: m.texte });
  if (e.accord && e.accord.n >= 20 && (e.accord.taux ?? 0) >= 60) l.push({ id: 'claude-60', nom: 'Claude a compris', detail: 'Accord de 60 % ou plus sur 20 paris.' });
  return l;
}

export const nouvellesMedailles = (avant: readonly Medaille[], apres: readonly Medaille[]) => { const v = new Set(avant.map((m) => m.id)); return apres.filter((m) => !v.has(m.id)); };

// ---------------------------------------------------------------------------------------------------------------
// 6. Écran de fin : ce que la session a appris
// ---------------------------------------------------------------------------------------------------------------

/**
 * Trois lignes concrètes : pour chaque dimension la plus nettement tranchée par la session (BT des seuls choix et duels de la
 * session, mêmes clés que le générateur), « Tu préfères <élément> pour <profil> » (et ce qui recule). `libelle` : clé → nom lisible.
 */
export function apprentissagesSession(duels: readonly Duel[], opts: { libelle?: (cle: string) => string; profil?: (sujet: string) => string; max?: number } = {}): string[] {
  const lib = opts.libelle ?? ((k: string) => k), prof = opts.profil ?? ((s: string) => s);
  const groupes = new Map<string, Duel[]>();
  for (const d of duels) { const k = `${d.dimension ?? 'libre'}|${d.scenario.sujets[0] ?? 'cabinet'}`; (groupes.get(k) ?? groupes.set(k, []).get(k)!).push(d); }
  const lignes: { v: number; t: string }[] = [];
  for (const [k, l] of groupes) {
    const sujet = k.split('|')[1];
    const matchs: MatchBT[] = [];
    for (const d of l) {
      const a = d.aIngredients.element ?? d.aCle, b = d.bIngredients.element ?? d.bCle;
      if (a !== b && d.resultat !== 'mauvais') matchs.push({ a, b, s: d.resultat === 'a' ? 1 : d.resultat === 'b' ? 0 : 0.5, w: 1 });
    }
    const f = [...ajusterBT(matchs).entries()].sort((x, y) => y[1].theta - x[1].theta || x[0].localeCompare(y[0]));
    if (f.length < 2) continue;
    const [haut, bas] = [f[0], f[f.length - 1]];
    const ecart = haut[1].theta - bas[1].theta;
    if (ecart < 0.3) continue;
    lignes.push({ v: ecart * Math.sqrt(l.length), t: `Tu préfères ${lib(haut[0])} pour ${prof(sujet)}${ecart >= 0.6 ? `, loin devant ${lib(bas[0])}` : ''}.` });
  }
  return lignes.sort((a, b) => b.v - a.v || a.t.localeCompare(b.t)).slice(0, opts.max ?? 3).map((x) => x.t);
}

/** Effet estimé de la session sur les poids (clés d'assets) : renforts des seuls duels de la session (±0,5 ★ au plus) */
export const effetSession = (duels: readonly Duel[]) => renfortsDuels(duels).assets;

/**
 * Part « prête » d'un profil : dimensions couvertes (≥ 2 choix 4-5 ★) parmi celles qui le concernent. Un élément compte « 4-5 ★ »
 * s'il est noté ≥ 4, ou (jamais noté) si sa note estimée par les choix et duels (moyenne + effet appris) atteint 4.
 */
export function pretProfil(elements: readonly { cle: string; dimension: string }[], note: (cle: string) => number | null, estime: (cle: string) => number | null, seuil = 2): { pret: number; dimensions: { id: string; bons: number; total: number; couverte: boolean }[] } {
  const m = new Map<string, { id: string; bons: number; total: number; couverte: boolean }>();
  for (const e of elements) {
    const d = m.get(e.dimension) ?? { id: e.dimension, bons: 0, total: 0, couverte: false };
    d.total++;
    const n = note(e.cle) ?? estime(e.cle);
    if (n !== null && n >= 4) d.bons++;
    m.set(e.dimension, d);
  }
  const dimensions = [...m.values()].map((d) => ({ ...d, couverte: d.bons >= Math.min(seuil, d.total) })).sort((a, b) => a.id.localeCompare(b.id));
  return { pret: dimensions.length ? dimensions.filter((d) => d.couverte).length / dimensions.length : 0, dimensions };
}

/** Empreinte stable d'une grille (pour ne pas reposer la même) */
export const cleGrille = (g: { dimension: string; propositions: readonly { cle: string }[] }) => `grille:${hachage(jsonStable([g.dimension, g.propositions.map((p) => p.cle).sort()])).toString(16)}`;
