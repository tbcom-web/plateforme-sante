// Notation des RECETTES COMPLÈTES et apprentissage automatique (demande de Paul du 2026-10-08 : « on note une recette complète, on
// donne un avis pour / contre et on peut dire “garder cette recette” […] tout cela ajoute des éléments de pondération aux éléments
// associés à la recette, qui permettent de suggérer des recettes de plus en plus belles […] sans repasser par Claude »).
// Tuile /admin/retours/recettes ; journal `recettes_notation` (migration 0038) ; documentation : docs/ingredients-recettes.md.
//
// 1. SOURCE SANS CLAUDE : genererCandidates fabrique des recettes candidates pour un scénario : tirage harmonieux (harmonie.ts, règles
//    dures jamais violées, garde-fous du core toujours actifs), puis RECHERCHE LOCALE (une dimension re-tirée à la fois, on garde si
//    le score prédit monte) ; environ 1 candidate sur 5 est une EXPLORATION (score + bonus d'incertitude : ingrédients peu notés).
//    Jamais d'ingrédient refusé (retiré, à retravailler, noté ≤ 2 ★) ; ingrédients « à valider » seulement en exploration, signalés.
// 2. APPRENTISSAGE : chaque note se répercute sur les INGRÉDIENTS (`<dim>:<valeur>` des dimensions d'harmonie, héros, photos) et
//    sur les PAIRES d'ingrédients (PAIRES_HARMONIE), globalement et pour le sujet n° 1, avec lissage bayésien et plafonds :
//      signal d'une note : d = (note − μ) + 0,5 si « Garder » (sans étoiles : note = 5), poids w = appareil (mobile 1,25) × 1,5 si gardée
//      effet(k) = Σ w·d / (K + Σ w)      K = 4 (ingrédient), 6 (paire), 6 (famille) ; μ = 3
//      plafonds : ±0,75 ★ (ingrédient, famille), ±0,5 ★ (paire) ; incertitude σ(k) = 1,2 / √(K + Σ w)
//    Pour / Contre CIBLÉS : une étiquette qui désigne une dimension (« police » en contre) ajoute un signal −1,5 (pour : +1) aux
//    seuls ingrédients de cette dimension, et la part négative (resp. positive) de la note n'atteint les AUTRES ingrédients qu'à
//    moitié ; les paires ne reçoivent que la note.
//    Les mêmes notes renforcent les clés du générateur (atelier, assets : renfortsNotations, facteur 0,6, plafond ±0,75 ★), cumulées
//    aux notes isolées et aux duels dans la limite de ±1 ★ par clé (fusionnerRenforts, lib/atelier.ts).
// 3. SCORE PRÉDIT (étoiles) : 3 + (harmonie − 80) / 20 + 1,2 · tanh(A / 1,2) + 0,6 si la gamme suit les couleurs choisies, borné à
//    [1 ; 5], avec A = 0,35 · Σ effets d'ingrédients + 0,35 · Σ effets de paires + effet de famille + 0,15 · Σ effets de l'atelier.
// Module pur (pas d'accès réseau), déterministe pour une graine.

import {
  DIMENSIONS_HARMONIE, PAIRES_HARMONIE, NOMS_DIMENSIONS_HARMONIE, clePaireHarmonie, effetApprisHarmonie, familleDominante, familleStyle, lireDimension,
  nomValeurHarmonie, scoreHarmonie, violationsDures, type ApprisHarmonie, type ContexteHarmonie, type DimensionHarmonie, type PoidsHarmonie,
} from './harmonie';
import {
  alea, clesRecette, compositionInitiale, controlerComposition, serialiserComposition, sujetsActifs, tirerDimension, tirerPage, toutChanger,
  type CompositionRecette, type ContexteRecette, type DimensionRecette,
} from './recettes';
import { clePhoto } from './assets-poids';
import { cleComposition } from './duels';
import { normaliserScenario, sujetsDuScenario, type ScenarioRecette } from './simulateur';
import { themeParId } from './themes';
import { gammesPreferees } from './suivi-scenario';
import { MODE_TIRAGE_DEFAUT, reglageMode } from './favoris';

// ---------------------------------------------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------------------------------------------

export const APPRENTISSAGE_NOTATION = {
  mu: 3,
  bonusGarder: 0.5,
  poidsGarder: 1.5,
  lissage: { ingredient: 4, paire: 6, famille: 6 },
  plafond: { ingredient: 0.75, paire: 0.5, famille: 0.75 },
  sigma0: 1.2,
  cible: { contre: -1.5, pour: 1, attenuation: 0.5 },
  /** Renforts des clés du générateur (atelier, assets) */
  renfort: { facteur: 0.6, lissage: { atelier: 10, assets: 4 }, plafond: 0.75 },
} as const;

export const SCORE_PREDIT = { ingredient: 0.35, paire: 0.35, famille: 1, atelier: 0.15, couleurs: 0.6, plafondAppris: 1.2, harmonieRef: 80, harmonieEchelle: 20, min: 1, max: 5 } as const;

/**
 * Étiquettes rapides Pour / Contre. `dims` : dimensions d'harmonie visées (préfixe si terminé par « . ») ; `atelier` / `assets` :
 * préfixes des clés du générateur visées. Sans dimension : avis d'ensemble (seule la note compte).
 */
export const ETIQUETTES_POUR_CONTRE: readonly { id: string; libelle: string; dims: readonly string[]; atelier: readonly string[]; assets: readonly string[] }[] = [
  { id: 'couleurs', libelle: 'Couleurs', dims: ['gamme'], atelier: ['gamme='], assets: ['gamme:'] },
  { id: 'polices', libelle: 'Polices', dims: ['police'], atelier: ['police='], assets: ['typo:police:'] },
  { id: 'typo', libelle: 'Typographie', dims: ['typo.'], atelier: ['typo='], assets: ['typo:'] },
  { id: 'illustrations', libelle: 'Illustrations', dims: ['style', 'heros'], atelier: ['style='], assets: ['heros:', 'dessin:', 'ligne:'] },
  { id: 'photos', libelle: 'Photos', dims: ['photo', 'traitement'], atelier: [], assets: ['photo:', 'effets:photos-'] },
  { id: 'premier-ecran', libelle: 'Premier écran', dims: ['v.accueil', 'v.transition'], atelier: ['variante=accueil:', 'variante=transition:'], assets: ['composant:accueil:', 'composant:transition:', 'structure:accueil:'] },
  { id: 'mise-en-page', libelle: 'Mise en page', dims: ['structure', 'v.sujets', 'v.soins', 'v.soins-forme', 'v.horaires', 'v.infos', 'v.praticiens', 'v.faq', 'v.galerie', 'v.contact', 'v.pied', 'v.fiche', 'v.actualites', 'v.theme', 'v.article'], atelier: ['structure=', 'ordre=', 'variante='], assets: ['modele:', 'structure:', 'composant:'] },
  { id: 'details', libelle: 'Détails', dims: ['details.'], atelier: ['details='], assets: ['details:'] },
  { id: 'menu', libelle: 'Menu', dims: ['menu.'], atelier: ['menu='], assets: ['menu:'] },
  { id: 'effets', libelle: 'Effets', dims: ['effets', 'v.sections'], atelier: ['effets=', 'variante=sections:'], assets: ['effets:', 'composant:sections:', 'animation:'] },
  { id: 'ensemble', libelle: 'Harmonie d’ensemble', dims: [], atelier: [], assets: [] },
  { id: 'pro', libelle: 'Fait pro', dims: [], atelier: [], assets: [] },
  { id: 'mobile', libelle: 'Rendu mobile', dims: [], atelier: [], assets: [] },
  { id: 'trop-charge', libelle: 'Trop chargé', dims: [], atelier: [], assets: [] },
  { id: 'fade', libelle: 'Fade', dims: [], atelier: [], assets: [] },
];
export const estEtiquettePourContre = (x: unknown): x is string => ETIQUETTES_POUR_CONTRE.some((e) => e.id === x);
const etiquette = (id: string) => ETIQUETTES_POUR_CONTRE.find((e) => e.id === id);
const visee = (motifs: readonly string[], dim: string) => motifs.some((m) => (m.endsWith('.') ? dim.startsWith(m) : dim === m));
const prefixee = (motifs: readonly string[], cle: string) => motifs.some((m) => cle.startsWith(m));

/** Sources des recettes à noter */
export const SOURCES_NOTATION = ['generateur', 'claude', 'recette'] as const;
export type SourceNotation = (typeof SOURCES_NOTATION)[number];
export const LIBELLES_SOURCES_NOTATION: Record<SourceNotation, string> = { generateur: 'générée par le système', claude: 'proposée par Claude', recette: 'recette enregistrée' };

/**
 * Scénarios types (les plus fréquents : sujet n° 1 × couleurs) pour lesquels le générateur fabrique des recettes à noter.
 * Données de démonstration, rien de personnel.
 */
export const SCENARIOS_TYPES: readonly { id: string; libelle: string; scenario: ScenarioRecette }[] = [
  { id: 'sport-bleu', libelle: 'Sport, bleu', scenario: { principaux: ['sport', 'semelles'], secondaires: [], couleurs: ['bleu'], soins: [] } },
  { id: 'diabete-vert', libelle: 'Diabète, vert', scenario: { principaux: ['diabete', 'pedicurie'], secondaires: [], couleurs: ['vert'], soins: [] } },
  { id: 'enfant-turquoise', libelle: 'Enfant, turquoise', scenario: { principaux: ['enfant'], secondaires: ['semelles'], couleurs: ['turquoise'], soins: [] } },
  { id: 'senior-terracotta', libelle: 'Senior, terracotta', scenario: { principaux: ['senior', 'pedicurie'], secondaires: [], couleurs: ['terracotta'], soins: [] } },
  { id: 'ongles-violet', libelle: 'Ongles, violet', scenario: { principaux: ['ongles'], secondaires: ['pedicurie'], couleurs: ['violet'], soins: [] } },
  { id: 'semelles-orange', libelle: 'Semelles, orange', scenario: { principaux: ['semelles', 'sport'], secondaires: [], couleurs: ['orange'], soins: [] } },
  { id: 'pedicurie-sans-couleur', libelle: 'Pédicurie, sans couleur choisie', scenario: { principaux: ['pedicurie'], secondaires: ['diabete'], couleurs: [], soins: [] } },
];

// ---------------------------------------------------------------------------------------------------------------
// Ingrédients et paires d'une composition
// ---------------------------------------------------------------------------------------------------------------

/** Ingrédients d'une composition : `<dimension>:<valeur>` (dimensions d'harmonie), héros (`heros:<sujet>`), photos (`photo:<clé>`) */
export function ingredientsNotation(x: CompositionRecette): { dim: string; valeur: string; cle: string }[] {
  const l: { dim: string; valeur: string; cle: string }[] = [];
  for (const d of DIMENSIONS_HARMONIE) {
    const v = lireDimension(x, d);
    if (v) l.push({ dim: d, valeur: v, cle: `${d}:${v}` });
  }
  if (x.visuels.herosSujet && x.visuels.style !== 'photos') l.push({ dim: 'heros', valeur: x.visuels.herosSujet, cle: `heros:${x.visuels.herosSujet}` });
  for (const u of x.photos) { const k = clePhoto(u); if (k) l.push({ dim: 'photo', valeur: k.slice(6), cle: `photo:${k.slice(6)}` }); }
  return l;
}

/** Paires d'ingrédients d'une composition (PAIRES_HARMONIE) */
export function pairesNotation(x: CompositionRecette): string[] {
  const r: string[] = [];
  for (const [a, b] of PAIRES_HARMONIE) { const va = lireDimension(x, a), vb = lireDimension(x, b); if (va && vb) r.push(clePaireHarmonie(a, va, b, vb)); }
  return r;
}

/** Sujet n° 1 d'un scénario (« cabinet » sans sujet actif) */
export const sujetUnScenario = (s: ScenarioRecette) => sujetsActifs(sujetsDuScenario(s))[0] ?? 'cabinet';

/** Clé stable d'une composition (même forme que les duels : compo:<16 hex>) */
export const cleRecetteNotee = (x: CompositionRecette) => cleComposition(JSON.parse(serialiserComposition(x)));

// ---------------------------------------------------------------------------------------------------------------
// Notes (journal recettes_notation, lecture d'apprentissage : ni auteur ni texte libre)
// ---------------------------------------------------------------------------------------------------------------

export type NotationRecette = {
  cle?: string;
  source?: SourceNotation;
  scenario: ScenarioRecette;
  composition: CompositionRecette;
  /** 1 à 5 ; null : seulement « Garder » ou seulement des étiquettes */
  note: number | null;
  garder?: boolean;
  pour?: readonly string[];
  contre?: readonly string[];
  appareil?: string | null;
  /** Recette enregistrée par « Garder » (pour ne pas la compter deux fois avec sourcesRecettes) */
  recette?: string | null;
  le?: string | null;
};

/** Valeur et poids du signal d'ensemble d'une note ; null si la note n'en porte pas */
export function signalNotation(n: Pick<NotationRecette, 'note' | 'garder' | 'appareil'>): { d: number; w: number } | null {
  const A = APPRENTISSAGE_NOTATION;
  const note = Number.isInteger(n.note) && (n.note as number) >= 1 && (n.note as number) <= 5 ? (n.note as number) : n.garder ? 5 : null;
  if (note === null) return null;
  const w = (n.appareil === 'mobile' ? 1.25 : 1) * (n.garder ? A.poidsGarder : 1);
  return { d: note - A.mu + (n.garder ? A.bonusGarder : 0), w };
}

type Acc = { s: number; w: number; n: number };
export type StatApprise = { cle: string; effet: number; sigma: number; n: number; poids: number };
export type TableApprise = { ingredients: Record<string, StatApprise>; paires: Record<string, StatApprise>; familles: Record<string, StatApprise> };
export type StatsNotation = { n: number; global: TableApprise; sujets: Record<string, TableApprise> };

const arrondi = (x: number) => { const r = Math.round(x * 1000) / 1000; return Object.is(r, -0) ? 0 : r; };

/** Statistiques apprises (déterministes quel que soit l'ordre des notes) */
export function statsNotation(notes: readonly NotationRecette[]): StatsNotation {
  const A = APPRENTISSAGE_NOTATION;
  const acc = new Map<string, Map<'ingredients' | 'paires' | 'familles', Map<string, Acc>>>();
  const ajouter = (portee: string, t: 'ingredients' | 'paires' | 'familles', k: string, d: number, w: number, compte = true) => {
    let p = acc.get(portee);
    if (!p) { p = new Map([['ingredients', new Map()], ['paires', new Map()], ['familles', new Map()]]); acc.set(portee, p); }
    const m = p.get(t)!;
    const a = m.get(k) ?? { s: 0, w: 0, n: 0 };
    a.s += w * d; a.w += w; if (compte) a.n += 1;
    m.set(k, a);
  };
  let n = 0;
  for (const x of notes) {
    if (!x?.composition) continue;
    const sig = signalNotation(x);
    const pour = (x.pour ?? []).map(etiquette).filter((e) => e && e.dims.length) as { dims: readonly string[] }[];
    const contre = (x.contre ?? []).map(etiquette).filter((e) => e && e.dims.length) as { dims: readonly string[] }[];
    if (!sig && !pour.length && !contre.length) continue;
    n++;
    const portees = ['*', sujetUnScenario(x.scenario)];
    const ings = ingredientsNotation(x.composition);
    for (const p of portees) {
      for (const i of ings) {
        const enContre = contre.some((e) => visee(e.dims, i.dim));
        const enPour = pour.some((e) => visee(e.dims, i.dim));
        if (sig) {
          // Note d'ensemble : sa part négative (resp. positive) n'atteint qu'à moitié les ingrédients NON désignés en contre (resp. pour)
          const att = (sig.d < 0 && contre.length && !enContre) || (sig.d > 0 && pour.length && !enPour) ? A.cible.attenuation : 1;
          ajouter(p, 'ingredients', i.cle, sig.d * att, sig.w);
        }
        if (enContre) ajouter(p, 'ingredients', i.cle, A.cible.contre, 1, !sig);
        if (enPour) ajouter(p, 'ingredients', i.cle, A.cible.pour, 1, !sig);
      }
      if (sig) {
        for (const k of pairesNotation(x.composition)) ajouter(p, 'paires', k, sig.d, sig.w);
        ajouter(p, 'familles', familleDominante(x.composition)[0].id, sig.d, sig.w);
      }
    }
  }
  const table = (m: Map<'ingredients' | 'paires' | 'familles', Map<string, Acc>> | undefined): TableApprise => {
    const r: TableApprise = { ingredients: {}, paires: {}, familles: {} };
    if (!m) return r;
    for (const t of ['ingredients', 'paires', 'familles'] as const) {
      const type = t === 'ingredients' ? 'ingredient' : t === 'paires' ? 'paire' : 'famille';
      const K = A.lissage[type], P = A.plafond[type];
      for (const k of [...m.get(t)!.keys()].sort()) {
        const a = m.get(t)!.get(k)!;
        r[t][k] = { cle: k, effet: arrondi(Math.max(-P, Math.min(P, a.s / (K + a.w)))), sigma: arrondi(A.sigma0 / Math.sqrt(K + a.w)), n: a.n, poids: arrondi(a.w) };
      }
    }
    return r;
  };
  const sujets: Record<string, TableApprise> = {};
  for (const k of [...acc.keys()].filter((k) => k !== '*').sort()) sujets[k] = table(acc.get(k));
  return { n, global: table(acc.get('*')), sujets };
}

/** Forme compacte transmise aux tirages (harmonie.ts : PoidsAtelier.harmonie) : effets non nuls seulement */
export function apprisHarmonie(stats: StatsNotation): ApprisHarmonie | null {
  if (!stats.n) return null;
  const compacte = (t: TableApprise): PoidsHarmonie => {
    const f = (o: Record<string, StatApprise>) => Object.fromEntries(Object.values(o).filter((s) => s.effet).map((s) => [s.cle, s.effet]));
    return { familles: f(t.familles), ingredients: f(t.ingredients), paires: f(t.paires) };
  };
  return { global: compacte(stats.global), sujets: Object.fromEntries(Object.entries(stats.sujets).map(([k, t]) => [k, compacte(t)])) };
}

/**
 * Renforts des clés du générateur (atelier, assets ; mêmes formes que renfortsPoids de recettes.ts) par les notes de recettes
 * complètes : Δ(k) = Σ f·w·d / (K + Σ f·w), f = 0,6, K = 10 (atelier) ou 4 (assets), plafond ±0,75 ★. Étiquettes ciblées : signal
 * −1,5 / +1 sur les clés de leurs préfixes, atténuation ½ de la note sur les autres (comme les ingrédients).
 */
export function renfortsNotations(notes: readonly NotationRecette[]): { atelier: Record<string, number>; assets: Record<string, number> } {
  const R = APPRENTISSAGE_NOTATION.renfort, C = APPRENTISSAGE_NOTATION.cible;
  const acc = { atelier: new Map<string, { s: number; w: number }>(), assets: new Map<string, { s: number; w: number }>() };
  for (const x of notes) {
    if (!x?.composition) continue;
    const sig = signalNotation(x);
    const pour = (x.pour ?? []).map(etiquette).filter((e) => e && e.dims.length) as (typeof ETIQUETTES_POUR_CONTRE)[number][];
    const contre = (x.contre ?? []).map(etiquette).filter((e) => e && e.dims.length) as (typeof ETIQUETTES_POUR_CONTRE)[number][];
    const cles = clesRecette(x.composition, sujetsDuScenario(x.scenario));
    for (const esp of ['atelier', 'assets'] as const) {
      for (const k of cles[esp]) {
        const enContre = contre.some((e) => prefixee(e[esp], k)), enPour = pour.some((e) => prefixee(e[esp], k));
        const add = (d: number, w: number) => { const a = acc[esp].get(k) ?? { s: 0, w: 0 }; a.s += R.facteur * w * d; a.w += R.facteur * w; acc[esp].set(k, a); };
        if (sig) add(sig.d * ((sig.d < 0 && contre.length && !enContre) || (sig.d > 0 && pour.length && !enPour) ? C.attenuation : 1), sig.w);
        if (enContre) add(C.contre, 1);
        if (enPour) add(C.pour, 1);
      }
    }
  }
  const fin = (esp: 'atelier' | 'assets') => {
    const r: Record<string, number> = {};
    for (const k of [...acc[esp].keys()].sort()) {
      const { s, w } = acc[esp].get(k)!;
      const v = arrondi(Math.max(-R.plafond, Math.min(R.plafond, s / (R.lissage[esp] + w))));
      if (v) r[k] = v;
    }
    return r;
  };
  return { atelier: fin('atelier'), assets: fin('assets') };
}

// ---------------------------------------------------------------------------------------------------------------
// Ingrédients refusés, à valider
// ---------------------------------------------------------------------------------------------------------------

/**
 * Clés refusées : assets « retiré » ou « à retravailler », assets notés en moyenne ≤ 2 ★ (au moins une note), ingrédients de recettes
 * complètes dont la moyenne des signaux est ≤ 2 ★ (au moins deux signaux) ou visés deux fois par un « Contre ».
 */
export function clesRefusees(opts: { assets?: readonly { cle: string; note?: number | null; statut?: string | null }[]; stats?: StatsNotation | null }): Set<string> {
  const r = new Set<string>();
  const notes = new Map<string, { s: number; n: number }>();
  for (const l of opts.assets ?? []) {
    if (l.statut === 'retire' || l.statut === 'a_retravailler') r.add(l.cle);
    if (Number.isInteger(l.note) && (l.note as number) >= 1 && (l.note as number) <= 5) { const a = notes.get(l.cle) ?? { s: 0, n: 0 }; a.s += l.note as number; a.n++; notes.set(l.cle, a); }
  }
  for (const [k, a] of notes) if (a.s / a.n <= 2) r.add(k);
  for (const s of Object.values(opts.stats?.global.ingredients ?? {})) {
    // moyenne brute ≈ μ + Σ w·d / Σ w
    const brute = APPRENTISSAGE_NOTATION.mu + (s.effet * (APPRENTISSAGE_NOTATION.lissage.ingredient + s.poids)) / Math.max(s.poids, 1e-9);
    if (s.n >= 2 && brute <= 2) r.add(s.cle);
  }
  return r;
}

/** Toutes les clés qu'une composition engage (ingrédients, clés du générateur), pour les contrôles refusé / à valider */
export function clesEngagees(x: CompositionRecette, sujets: readonly string[]): string[] {
  const c = clesRecette(x, sujets);
  return [...new Set([...ingredientsNotation(x).map((i) => i.cle), ...c.atelier, ...c.assets])];
}

// ---------------------------------------------------------------------------------------------------------------
// Score prédit
// ---------------------------------------------------------------------------------------------------------------

export type ScorePredit = { score: number; /** Avant les bornes 1-5 (objectif de la recherche locale : départage au-delà de 5) */ brut: number; harmonie: number; appris: number; incertitude: number; violations: number; famille: string };

/** Score prédit (étoiles) d'une composition pour un scénario, d'après l'harmonie et tout ce qui a été appris */
export function scorePredit(x: CompositionRecette, c: ContexteRecette, stats?: StatsNotation | null): ScorePredit {
  const ch: ContexteHarmonie = c as ContexteHarmonie;
  const h = scoreHarmonie(x, ch);
  const s1 = sujetsActifs(c.sujets)[0] ?? 'cabinet';
  const tg = stats?.global, ts = stats?.sujets[s1];
  const S = APPRENTISSAGE_NOTATION;
  const e = (t: 'ingredients' | 'paires' | 'familles', k: string) => (tg?.[t][k]?.effet ?? 0) + (ts?.[t][k]?.effet ?? 0);
  const sig = (k: string) => Math.min(tg?.ingredients[k]?.sigma ?? S.sigma0 / Math.sqrt(S.lissage.ingredient), ts?.ingredients[k]?.sigma ?? S.sigma0 / Math.sqrt(S.lissage.ingredient));
  const ings = ingredientsNotation(x);
  let appris = 0;
  for (const i of ings) appris += SCORE_PREDIT.ingredient * e('ingredients', i.cle);
  for (const k of pairesNotation(x)) appris += SCORE_PREDIT.paire * e('paires', k);
  appris += SCORE_PREDIT.famille * e('familles', h.famille);
  for (const i of ings) if (i.dim !== 'heros' && i.dim !== 'photo') appris += SCORE_PREDIT.atelier * effetApprisHarmonie(ch, i.dim as DimensionHarmonie, i.valeur);
  const incertitude = ings.length ? ings.reduce((s, i) => s + sig(i.cle), 0) / ings.length : S.sigma0 / 2;
  // Somme apprise comprimée (beaucoup d'ingrédients : jamais plus de ±1,2 ★), couleurs choisies par le client respectées
  appris = SCORE_PREDIT.plafondAppris * Math.tanh(appris / SCORE_PREDIT.plafondAppris);
  const couleurs = c.couleursPreferees?.length && x.gamme && gammesPreferees(c).includes(x.gamme) ? SCORE_PREDIT.couleurs : 0;
  const brut = 3 + (h.score - SCORE_PREDIT.harmonieRef) / SCORE_PREDIT.harmonieEchelle + appris + couleurs;
  const score = Math.max(SCORE_PREDIT.min, Math.min(SCORE_PREDIT.max, brut));
  return { score: arrondi(score), brut: arrondi(brut), harmonie: h.score, appris: arrondi(appris), incertitude: arrondi(incertitude), violations: h.violations.length, famille: h.famille };
}

// ---------------------------------------------------------------------------------------------------------------
// Générateur de recettes candidates (sans Claude)
// ---------------------------------------------------------------------------------------------------------------

export type CandidateRecette = {
  cle: string;
  source: SourceNotation;
  scenario: ScenarioRecette;
  composition: CompositionRecette;
  predit: ScorePredit;
  exploration: boolean;
  /** Ingrédients « à valider » présents (exploration seulement) */
  aValider: string[];
  nom?: string;
};

/** Dés de la recherche locale : une dimension du studio ou la structure d'une page à la fois */
const DES_LOCAUX: readonly (DimensionRecette | `page:${string}`)[] = ['couleurs', 'polices', 'visuels', 'structure', 'effets', 'typo', 'details', 'menu', 'traitement', 'photos', 'page:accueil', 'page:soins', 'page:acces', 'page:cabinet'];

export type OptionsGeneration = {
  n: number;
  graine: number;
  /** Part d'exploration (défaut : celle du mode de tirage du contexte, ≈ 10 % en « Favoris d'abord ») */
  exploration?: number;
  /** Essais de la recherche locale par candidate */
  iterations?: number;
  refusees?: ReadonlySet<string>;
  estAValider?: (cle: string) => boolean;
  /** Clés de compositions déjà notées ou déjà en file (jamais reproposées) */
  deja?: ReadonlySet<string>;
  stats?: StatsNotation | null;
  /** Poids du bonus d'incertitude en exploration */
  kappa?: number;
};

/** Composition admissible : garde-fous du core, aucune règle dure, aucun ingrédient refusé ; à valider seulement si permis */
export function admissible(x: CompositionRecette, c: ContexteRecette, o: Pick<OptionsGeneration, 'refusees' | 'estAValider'>, aValiderPermis: boolean): { ok: boolean; aValider: string[] } {
  if (controlerComposition(x, c).length || violationsDures(x, c as ContexteHarmonie).length) return { ok: false, aValider: [] };
  const cles = clesEngagees(x, c.sujets);
  if (o.refusees?.size && cles.some((k) => o.refusees!.has(k))) return { ok: false, aValider: [] };
  const aValider = o.estAValider ? cles.filter((k) => o.estAValider!(k)) : [];
  return { ok: aValiderPermis || !aValider.length, aValider };
}

const hache = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * Recettes candidates pour un scénario : départ harmonieux (« Tout changer », poids appris compris), réparation des ingrédients
 * refusés, puis recherche locale (un dé à la fois, gardé si l'objectif monte) ; objectif = score prédit (+ κ · incertitude en
 * exploration). Les candidates d'exploration sont les n° 10, 20… en « Favoris d'abord » (≈ 10 % ; 20 % en Équilibré, 35 % en
 * Découverte ; part réglable), tirées en mode Découverte. Déterministe pour une graine.
 */
export function genererCandidates(scenario: ScenarioRecette, c0: ContexteRecette, o: OptionsGeneration): CandidateRecette[] {
  const c = c0;
  const part = o.exploration ?? reglageMode(c.modeTirage ?? MODE_TIRAGE_DEFAUT).exploration;
  const iterations = o.iterations ?? 16;
  const kappa = o.kappa ?? 2.5;
  const vues = new Set(o.deja ?? []);
  const res: CandidateRecette[] = [];
  const pas = part > 0 ? Math.max(1, Math.round(1 / part)) : 0;
  for (let essais = 0; res.length < o.n && essais < o.n * 4; essais++) {
    const exploration = pas > 0 && (res.length + 1) % pas === 0;
    const g = hache(`${o.graine}|${essais}`);
    const r = alea(g, 'locale');
    // Exploration : tirages en mode « Découverte » (ingrédients jamais notés permis), candidate badgée
    const c = exploration ? { ...c0, modeTirage: 'decouverte' as const } : c0;
    const objectif = (x: CompositionRecette) => { const p = scorePredit(x, c, o.stats); return { p, v: p.brut + (exploration ? kappa * p.incertitude : 0) }; };
    let x = toutChanger(compositionInitiale(c, g), [], c, g);
    // Réparation : quelques dés tant que la composition n'est pas admissible
    for (let k = 0; k < 12 && !admissible(x, c, o, exploration).ok; k++) {
      const de = DES_LOCAUX[Math.floor(r() * DES_LOCAUX.length)];
      x = de.startsWith('page:') ? tirerPage(x, { page: de.slice(5) as never }, c, hache(`${g}|rep|${k}`)) : tirerDimension(x, de as DimensionRecette, c, hache(`${g}|rep|${k}`));
    }
    if (!admissible(x, c, o, exploration).ok) continue;
    let cur = objectif(x);
    for (let k = 0; k < iterations; k++) {
      const de = DES_LOCAUX[Math.floor(r() * DES_LOCAUX.length)];
      const gg = hache(`${g}|${k}|${de}`);
      const y = de.startsWith('page:') ? tirerPage(x, { page: de.slice(5) as never }, c, gg) : tirerDimension(x, de as DimensionRecette, c, gg);
      if (y === x || !admissible(y, c, o, exploration).ok) continue;
      const oy = objectif(y);
      if (oy.v > cur.v) { x = y; cur = oy; }
    }
    const cle = cleRecetteNotee(x);
    if (vues.has(cle)) continue;
    vues.add(cle);
    const a = admissible(x, c, o, exploration);
    res.push({ cle, source: 'generateur', scenario: normaliserScenario(scenario), composition: x, predit: cur.p, exploration, aValider: a.aValider });
  }
  return res;
}

/** Contexte de tirage d'un scénario (sujets, couleurs, poids appris, photos) */
export function contexteScenario(s: ScenarioRecette, base: Omit<ContexteRecette, 'sujets' | 'principaux' | 'couleursPreferees'>): ContexteRecette {
  const sc = normaliserScenario(s);
  return { ...base, sujets: sujetsDuScenario(sc), principaux: sc.principaux.length, couleursPreferees: sc.couleurs };
}

// ---------------------------------------------------------------------------------------------------------------
// File de notation et palmarès
// ---------------------------------------------------------------------------------------------------------------

/**
 * File : alterne les sources (générateur, Claude…) en sautant ce qui est déjà noté (clé de composition). Ordre stable.
 */
export function fileNotation<T extends { cle: string; source: SourceNotation }>(sources: readonly (readonly T[])[], dejaNotees: ReadonlySet<string>): T[] {
  const restes = sources.map((l) => l.filter((x) => !dejaNotees.has(x.cle)));
  const vues = new Set<string>();
  const r: T[] = [];
  for (let i = 0; restes.some((l) => i < l.length); i++) for (const l of restes) { const x = l[i]; if (x && !vues.has(x.cle)) { vues.add(x.cle); r.push(x); } }
  return r;
}

/** Libellé lisible d'un ingrédient (`police:didone` → « Polices : … ») ou d'une paire */
export function libelleIngredientNotation(cle: string): string {
  if (cle.includes('&')) return cle.split('&').map(libelleIngredientNotation).join(' + ');
  const i = cle.indexOf(':');
  const dim = cle.slice(0, i), v = cle.slice(i + 1);
  if (dim === 'heros') return `Héros : ${themeParId(v)?.court ?? v}`;
  if (dim === 'photo') return `Photo : ${v.split('/').pop()}`;
  if (familleStyle(cle)) return familleStyle(cle)!.nom;
  return `${NOMS_DIMENSIONS_HARMONIE[dim] ?? dim} : ${nomValeurHarmonie(dim, v)}`;
}

export type LignePalmares = StatApprise & { libelle: string };
export type Palmares = { sujet: string; n: number; ingredients: LignePalmares[]; paires: LignePalmares[]; familles: LignePalmares[]; aEviter: LignePalmares[] };

/**
 * Palmarès auto-noté (onglet « Ce que le système a appris ») : pour chaque portée (« * » = tous les sujets, puis chaque sujet n° 1),
 * meilleurs ingrédients et meilleures combinaisons (effet décroissant, puis incertitude croissante), et ce qu'il vaut mieux éviter.
 */
export function palmaresNotation(stats: StatsNotation, max = 8): Palmares[] {
  const ligne = (s: StatApprise): LignePalmares => ({ ...s, libelle: familleStyle(s.cle) ? familleStyle(s.cle)!.nom : libelleIngredientNotation(s.cle) });
  const trier = (o: Record<string, StatApprise>) => Object.values(o).sort((a, b) => b.effet - a.effet || a.sigma - b.sigma || (a.cle < b.cle ? -1 : 1));
  const p = (sujet: string, t: TableApprise): Palmares => {
    const ings = trier(t.ingredients);
    const total = Math.max(0, ...Object.values(t.ingredients).map((x) => x.n));
    return {
      sujet, n: total,
      ingredients: ings.filter((s) => s.effet > 0).slice(0, max).map(ligne),
      paires: trier(t.paires).filter((s) => s.effet > 0).slice(0, max).map(ligne),
      familles: trier(t.familles).slice(0, 3).map(ligne),
      aEviter: [...ings].reverse().filter((s) => s.effet < 0).slice(0, Math.ceil(max / 2)).map(ligne),
    };
  };
  return [p('*', stats.global), ...Object.entries(stats.sujets).map(([s, t]) => p(s, t))];
}

/** Ligne du journal (ou de la fonction d'apprentissage) → notation ; invalide → null */
export function notationDepuisLigne(l: Record<string, unknown>, normaliser: (brut: unknown, s: ScenarioRecette) => CompositionRecette | null): NotationRecette | null {
  const scenario = normaliserScenario(l.scenario);
  const composition = normaliser(l.composition, scenario);
  if (!composition) return null;
  const note = Number.isInteger(l.note) && (l.note as number) >= 1 && (l.note as number) <= 5 ? (l.note as number) : null;
  const liste = (v: unknown) => (Array.isArray(v) ? v.filter(estEtiquettePourContre).slice(0, 12) : []);
  return {
    cle: typeof l.cle === 'string' ? l.cle : undefined, source: SOURCES_NOTATION.includes(l.source as SourceNotation) ? (l.source as SourceNotation) : 'generateur',
    scenario, composition, note, garder: l.garder === true, pour: liste(l.etiquettes_pour), contre: liste(l.etiquettes_contre),
    appareil: typeof l.appareil === 'string' ? l.appareil : null, recette: typeof l.recette === 'string' ? l.recette : null, le: typeof l.created_at === 'string' ? l.created_at : null,
  };
}
