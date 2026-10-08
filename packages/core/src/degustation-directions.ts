// Dégustation, refonte du 2026-10-09 (retour de Paul : « je ne comprends vraiment pas la différence entre les éléments […] j'ai 4
// images, on dirait les mêmes »). Le principe « un seul nouveau à la fois » rendait les vignettes quasi identiques. Deux niveaux :
//
// 1. GRILLES « DIRECTIONS » (grilleDirections) : jusqu'à 6 propositions RADICALEMENT différentes, une par famille de style d'harmonie
//    (Éditorial chic, Graphique pop, Doux et rond…), chacune cohérente (tirerDansFamille : règles dures jamais enfreintes) et tirée
//    avec les éléments 4-5 ★ favorisés (avecBonusQuatreCinq). Sélection par DIVERSITÉ MAXIMALE (point le plus éloigné d'abord) sous
//    deux contraintes vérifiées pour CHAQUE paire : distance d'attributs d'harmonie ≥ SEUILS_DIRECTIONS.distance (moyenne des écarts
//    sur contraste, rondeur, densité, énergie, température, formalité) et au moins SEUILS_DIRECTIONS.dimensions dimensions visibles
//    différentes (palette, polices, premier écran, style d'illustration ou photo, structure). Légende : famille + 3 mots.
//    Apprentissage : duels LIBRES (poids 0,5 réparti sur les clés qui diffèrent, plafonds des duels) + préférence de FAMILLE par
//    sujet (élément classé `famille:<id>`, famillesDesDuels → poids d'harmonie).
// 2. GRILLES « DÉTAIL » : une dimension à la fois, mais montrée en BLOC FOCALISÉ dans l'admin, avec écart minimal garanti entre
//    options (optionsDistinctes) ; sinon 3 ou 4 options seulement.
// 3. DIFFÉRENCE PERCEPTIBLE : variantes de sections qu'un gabarit ne REND pas écartées (cas du 2026-10-09 : « Mises en page · profil
//    Semelles », vignettes identiques au pixel : la structure Technique, gabarit classique, ne rend pas la forme des cartes sur la page
//    Soins) ; côté admin, empreinte du rendu de chaque vignette, grille refusée si deux empreintes sont identiques.
// Pur, déterministe pour une graine.

import { ajusterBT, APPRENTISSAGE_DUELS, cleComposition, hasard, REFERENCE, type Duel, type IngredientsDuel, type MatchBT } from './duels';
import { distance as distanceCouleurs } from './couleurs';
import { gamme as gammeParId } from './gammes';
import {
  ATTRIBUTS_HARMONIE, etiquetteIngredient, familleDominante, FAMILLES_STYLE, lireDimension, tirerDansFamille, violationsDures, DIMENSIONS_HARMONIE,
  type ApprisHarmonie, type AttributHarmonie, type ContexteHarmonie, type DimensionHarmonie, type IdFamilleStyle, type ProfilHarmonie,
} from './harmonie';
import { gabaritModele, modeleIntegre, pairePolices } from './modeles';
import { POLICES } from './charte';
import { avecBonusQuatreCinq, elementsComposition, type NotesElements } from './qualite';
import { clesRecette, compositionInitiale, LIBELLES_VARIANTES, tirerPage, outilsHarmonie, PAGES_STRUCTURE, sectionsVariables, serialiserComposition, type CompositionRecette, type ContexteRecette } from './recettes';
import { LIBELLES_STYLES } from './propositions';
import { universCatalogue } from './catalogue-univers';
import type { Tranches } from './tranches';

// ---------------------------------------------------------------------------------------------------------------
// Profil d'une composition et écart entre deux compositions
// ---------------------------------------------------------------------------------------------------------------

const ATTRS = Object.keys(ATTRIBUTS_HARMONIE) as AttributHarmonie[];

/** Profil d'harmonie d'une composition : moyenne, attribut par attribut, des profils de ses ingrédients étiquetés (0 sinon) */
export function profilComposition(x: CompositionRecette): Required<ProfilHarmonie> {
  const acc = Object.fromEntries(ATTRS.map((a) => [a, { s: 0, n: 0 }])) as Record<AttributHarmonie, { s: number; n: number }>;
  for (const d of DIMENSIONS_HARMONIE) {
    const e = etiquetteIngredient(d, lireDimension(x as never, d));
    if (!e || e.neutre) continue;
    // Ingrédients qui portent le style : poids double (comme coherenceFamille)
    const w = ['police', 'details.jeu', 'structure', 'v.accueil', 'effets', 'style', 'gamme'].includes(d) ? 2 : 1;
    for (const a of ATTRS) if (typeof e.p[a] === 'number') { acc[a].s += w * e.p[a]!; acc[a].n += w; }
  }
  return Object.fromEntries(ATTRS.map((a) => [a, acc[a].n ? Math.round((acc[a].s / acc[a].n) * 1000) / 1000 : 0])) as Required<ProfilHarmonie>;
}

/** Dimensions VISIBLES d'une direction : ce que l'œil voit d'abord sur une vignette d'accueil */
export const DIMENSIONS_VISIBLES = [
  { id: 'palette', nom: 'palette', lire: (x: CompositionRecette) => x.gamme || x.couleur },
  { id: 'police', nom: 'polices', lire: (x: CompositionRecette) => pairePolices(x.police)?.titres ?? x.police },
  { id: 'accueil', nom: 'premier écran', lire: (x: CompositionRecette) => x.sections.variantes.accueil ?? '' },
  { id: 'visuel', nom: 'style d’illustration ou photo', lire: (x: CompositionRecette) => x.visuels.style },
  { id: 'structure', nom: 'structure', lire: (x: CompositionRecette) => x.structure },
] as const;

export const SEUILS_DIRECTIONS = { distance: 0.22, dimensions: 4 } as const;

export type EcartCompositions = { distance: number; dimensions: string[] };

/** Écart entre deux compositions : distance moyenne des profils (0-2) et dimensions visibles différentes */
export function ecartCompositions(a: CompositionRecette, b: CompositionRecette): EcartCompositions {
  const pa = profilComposition(a), pb = profilComposition(b);
  const distance = Math.round((ATTRS.reduce((s, k) => s + Math.abs(pa[k] - pb[k]), 0) / ATTRS.length) * 1000) / 1000;
  return { distance, dimensions: DIMENSIONS_VISIBLES.filter((d) => d.lire(a) !== d.lire(b)).map((d) => d.id) };
}

/** Deux directions sont-elles nettement différentes ? */
export const directionsDistinctes = (a: CompositionRecette, b: CompositionRecette, s: { distance: number; dimensions: number } = SEUILS_DIRECTIONS) => {
  const e = ecartCompositions(a, b);
  return e.distance >= s.distance && e.dimensions.length >= s.dimensions;
};

// ---------------------------------------------------------------------------------------------------------------
// Légende
// ---------------------------------------------------------------------------------------------------------------

const MOTS_GENRE: Record<string, string> = {
  didone: 'didone', serif: 'à empattements', slab: 'empattements carrés', humaniste: 'humaniste', grotesque: 'grotesque',
  geometrique: 'géométrique', ronde: 'arrondie', mono: 'mono', condensee: 'condensée',
};

/** « Graphique pop » + 3 mots : ton (contraste, température, densité), typographie, premier écran ou visuel */
export function legendeDirection(x: CompositionRecette, famille?: IdFamilleStyle | null): { famille: string; mots: string[]; texte: string } {
  const f = FAMILLES_STYLE.find((y) => y.id === (famille ?? familleDominante(x as never)[0].id))!;
  const p = profilComposition(x);
  const g = x.gamme ? gammeParId(x.gamme) : null;
  const sombre = g ? luminanceHex(g.fond) < 0.25 : false;
  const ton = sombre ? 'sombre' : p.c >= 0.6 ? 'contrasté' : p.t >= 0.45 ? 'chaleureux' : p.t <= -0.45 ? 'froid' : p.d <= -0.5 ? 'aéré' : p.d >= 0.4 ? 'dense' : p.r >= 0.5 ? 'arrondi' : 'clair';
  const genre = etiquetteIngredient('police', x.police)?.genre;
  const typo = `typo ${MOTS_GENRE[genre ?? ''] ?? (pairePolices(x.police)?.nom ?? x.police).toLowerCase()}`;
  const acc = x.sections.variantes.accueil;
  const visuel = x.visuels.style === 'photos' ? 'photos' : (LIBELLES_STYLES[x.visuels.style]?.nom ?? x.visuels.style).toLowerCase();
  const premier = acc ? (LIBELLES_VARIANTES.accueil?.[acc] ?? acc).toLowerCase().replace(/\s*\([^)]*\)/g, '').split(/,| et /)[0].trim() : null;
  const mots = [ton, typo, premier ? `${visuel}, ${premier}` : visuel];
  return { famille: f.nom, mots, texte: `${f.nom} · ${mots.join(' · ')}` };
}

function luminanceHex(h: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(h ?? '');
  if (!m) return 1;
  const n = parseInt(m[1], 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// ---------------------------------------------------------------------------------------------------------------
// Grille « Directions »
// ---------------------------------------------------------------------------------------------------------------

export type PropositionDirection = { cle: string; famille: IdFamilleStyle; x: CompositionRecette; legende: ReturnType<typeof legendeDirection>; ingredients: IngredientsDuel };
export type GrilleDirections = { propositions: PropositionDirection[]; ecartMin: EcartCompositions | null };

/** Ingrédients d'une direction : clés du générateur (mêmes que les duels), élément classé = la famille */
export function ingredientsDirection(x: CompositionRecette, sujets: readonly string[], famille: IdFamilleStyle): IngredientsDuel {
  return { ...clesRecette(x, sujets), element: `famille:${famille}`, juge: [], composition: JSON.parse(serialiserComposition(x)) };
}

/**
 * Grille « Directions » : un candidat par famille (et un second essai si le premier est rejeté), puis sélection gloutonne par
 * diversité maximale ; chaque paire retenue respecte SEUILS_DIRECTIONS. `priorite` : familles à placer d'abord (préférées du profil,
 * ou peu explorées). null s'il y a moins de `min` (4) directions distinctes.
 */
export function grilleDirections(p: {
  contexte: ContexteRecette; notes?: NotesElements | null; tranches?: Pick<Tranches, 'refuses' | 'favoris'> | null; graine: number; n?: number; min?: number;
  priorite?: readonly IdFamilleStyle[];
}): GrilleDirections | null {
  const n = p.n ?? 6, r = hasard(p.graine);
  const c = avecBonusQuatreCinq(p.contexte, p.notes);
  const outils = outilsHarmonie(c);
  const base = compositionInitiale(c, p.graine);
  const refuses = p.tranches?.refuses ?? new Set<string>();
  const candidats: PropositionDirection[] = [];
  const admis = (y: CompositionRecette, f: IdFamilleStyle) => {
    if (violationsDures(y as never, c as unknown as ContexteHarmonie).length) return null;
    if (familleDominante(y as never, c as unknown as ContexteHarmonie)[0].id !== f) return null;
    const cle = cleComposition(JSON.parse(serialiserComposition(y)));
    if (refuses.has(cle) || elementsComposition(y, c.sujets).some((k) => refuses.has(k)) || refuses.has(`famille:${f}`)) return null;
    return { cle, famille: f, x: y, legende: legendeDirection(y, f), ingredients: ingredientsDirection(y, c.sujets, f) };
  };
  // Trois tirages par famille (graines différentes) : plus de choix pour la diversité
  for (const f of FAMILLES_STYLE) {
    for (let essai = 0; essai < 3; essai++) {
      const y = tirerDansFamille(f.id, base, [], c as unknown as ContexteHarmonie, (p.graine * 31 + essai * 7919 + f.id.length) >>> 0, outils as never) as CompositionRecette;
      const d = admis(y, f.id);
      if (d && !candidats.some((x) => x.cle === d.cle)) candidats.push(d);
    }
  }
  if (!candidats.length) return null;
  // Variante d'un candidat dont SEUL le premier écran change (dé harmonieux : reste dans la famille) : pour gagner une dimension visible
  const memoAccueil = new Map<string, PropositionDirection[]>();
  const variantesAccueil = (x: PropositionDirection): PropositionDirection[] => {
    const deja = memoAccueil.get(x.cle);
    if (deja) return deja;
    const l: PropositionDirection[] = [];
    memoAccueil.set(x.cle, l);
    for (let k = 0; k < 2; k++) {
      const y = tirerPage(x.x, { composant: 'accueil' }, c, (p.graine * 131 + k * 977 + x.cle.length) >>> 0);
      const d = y.sections.variantes.accueil !== x.x.sections.variantes.accueil ? admis(y, x.famille) : null;
      if (d && !l.some((z) => z.cle === d.cle)) l.push(d);
    }
    return l;
  };
  const prio = (p.priorite ?? []).filter((f) => candidats.some((x) => x.famille === f));
  const ecarts = new Map<string, EcartCompositions>();
  const ecart = (a: PropositionDirection, b: PropositionDirection) => { const k = a.cle < b.cle ? `${a.cle}|${b.cle}` : `${b.cle}|${a.cle}`; let e = ecarts.get(k); if (!e) { e = ecartCompositions(a.x, b.x); ecarts.set(k, e); } return e; };
  const ok = (a: PropositionDirection, b: PropositionDirection) => { const e = ecart(a, b); return e.distance >= SEUILS_DIRECTIONS.distance && e.dimensions.length >= SEUILS_DIRECTIONS.dimensions; };
  // Glouton depuis plusieurs départs : toujours la plus éloignée des déjà retenues, une famille une fois, contraintes sur CHAQUE paire
  const glouton = (premiere: PropositionDirection): PropositionDirection[] => {
    const ch = [premiere];
    while (ch.length < n) {
      let best: { x: PropositionDirection; v: number } | null = null;
      for (const x0 of candidats) {
        if (ch.some((y) => y.famille === x0.famille)) continue;
        const essais = ch.every((y) => ok(x0, y)) ? [x0] : ch.every((y) => ecart(x0, y).distance >= SEUILS_DIRECTIONS.distance) ? variantesAccueil(x0) : [];
        for (const x of essais) {
          if (!ch.every((y) => ok(x, y))) continue;
          const v = Math.min(...ch.map((y) => ecart(x, y).distance)) + (prio.includes(x.famille) ? 0.15 : 0) + 0.02 * r();
          if (!best || v > best.v) best = { x, v };
        }
      }
      if (!best) break;
      ch.push(best.x);
    }
    return ch;
  };
  const departs = prio.length ? candidats.filter((x) => x.famille === prio[0]) : candidats.map((x) => ({ x, k: r() })).sort((a, b) => a.k - b.k).slice(0, 4).map((o) => o.x);
  let choisies: PropositionDirection[] = [];
  let scoreChoix = -1;
  for (const d of departs) {
    const ch = glouton(d);
    let mini = 2;
    for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) mini = Math.min(mini, ecart(ch[i], ch[j]).distance);
    const sc = ch.length * 10 + mini;
    if (sc > scoreChoix) { choisies = ch; scoreChoix = sc; }
    if (ch.length >= n) break;
  }
  if (choisies.length < (p.min ?? 4)) return null;
  const melange = choisies.map((x) => ({ x, k: r() })).sort((a, b) => a.k - b.k).map((o) => o.x);
  let ecartMin: EcartCompositions | null = null;
  for (let i = 0; i < melange.length; i++) for (let j = i + 1; j < melange.length; j++) {
    const e = ecartCompositions(melange[i].x, melange[j].x);
    if (!ecartMin || e.distance < ecartMin.distance) ecartMin = e;
  }
  return { propositions: melange, ecartMin };
}

// ---------------------------------------------------------------------------------------------------------------
// Préférence de famille (apprentissage)
// ---------------------------------------------------------------------------------------------------------------

export const APPRENTISSAGE_FAMILLES = { facteur: 0.5, plafond: 0.5 } as const;

/**
 * Préférence de FAMILLE apprise des grilles « Directions » (duels dont les éléments classés sont `famille:<id>`) : Bradley-Terry
 * global et par sujet n° 1, Δ = clamp(0,5 · θ, ±0,5 ★). Forme des poids d'harmonie (familles), cumulée par ajouterFamillesApprises.
 */
export function famillesDesDuels(duels: readonly Duel[]): { global: Partial<Record<IdFamilleStyle, number>>; sujets: Record<string, Partial<Record<IdFamilleStyle, number>>> } {
  const l = duels.filter((d) => (d.aIngredients.element ?? '').startsWith('famille:') && (d.bIngredients.element ?? '').startsWith('famille:'));
  const ajuster = (x: readonly Duel[]) => {
    const m: MatchBT[] = x.map((d) => d.resultat === 'mauvais'
      ? { a: d.aIngredients.element!, b: REFERENCE, s: 0, w: APPRENTISSAGE_DUELS.penaliteMauvais }
      : { a: d.aIngredients.element!, b: d.bIngredients.element!, s: d.resultat === 'a' ? 1 : d.resultat === 'b' ? 0 : 0.5, w: 1 });
    const r: Partial<Record<IdFamilleStyle, number>> = {};
    for (const [k, f] of [...ajusterBT(m).entries()].sort()) {
      const v = Math.round(Math.max(-APPRENTISSAGE_FAMILLES.plafond, Math.min(APPRENTISSAGE_FAMILLES.plafond, APPRENTISSAGE_FAMILLES.facteur * f.theta)) * 1000) / 1000;
      if (v) r[k.slice(8) as IdFamilleStyle] = v;
    }
    return r;
  };
  const sujets: Record<string, Partial<Record<IdFamilleStyle, number>>> = {};
  for (const s of [...new Set(l.map((d) => d.scenario.sujets[0] ?? 'cabinet'))].sort()) sujets[s] = ajuster(l.filter((d) => (d.scenario.sujets[0] ?? 'cabinet') === s));
  return { global: ajuster(l), sujets };
}

/** Ajoute les préférences de famille aux poids d'harmonie appris (somme bornée ±1 ★ par famille, global et par sujet) */
export function ajouterFamillesApprises(h: ApprisHarmonie | null | undefined, f: ReturnType<typeof famillesDesDuels>): ApprisHarmonie | null {
  const vide = !Object.keys(f.global).length && !Object.values(f.sujets).some((x) => Object.keys(x).length);
  if (vide) return h ?? null;
  const base: ApprisHarmonie = h ?? { global: { familles: {}, ingredients: {} } };
  const somme = (a: Partial<Record<IdFamilleStyle, number>> | undefined, b: Partial<Record<IdFamilleStyle, number>>) => {
    const r: Partial<Record<IdFamilleStyle, number>> = { ...(a ?? {}) };
    for (const [k, v] of Object.entries(b) as [IdFamilleStyle, number][]) { const t = Math.round(Math.max(-1, Math.min(1, (r[k] ?? 0) + v)) * 1000) / 1000; if (t) r[k] = t; else delete r[k]; }
    return r;
  };
  const sujets = { ...(base.sujets ?? {}) };
  for (const [s, x] of Object.entries(f.sujets)) sujets[s] = { ...(sujets[s] ?? { familles: {}, ingredients: {} }), familles: somme(sujets[s]?.familles, x) };
  return { ...base, global: { ...base.global, familles: somme(base.global.familles, f.global) }, sujets };
}

/** Familles préférées d'un sujet (meilleure d'abord) d'après les préférences apprises ; [] sans signal */
export const famillesPreferees = (f: ReturnType<typeof famillesDesDuels>, sujet: string): IdFamilleStyle[] =>
  (Object.entries({ ...f.global, ...(f.sujets[sujet] ?? {}) }) as [IdFamilleStyle, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);

// ---------------------------------------------------------------------------------------------------------------
// Grilles « Détail » : écart minimal garanti, variantes rendues seulement
// ---------------------------------------------------------------------------------------------------------------

/**
 * Sections qu'un gabarit déclare variables mais que l'APERÇU ne rend pas sur la page donnée. Une grille ne fait jamais varier une
 * section invisible. Vide depuis le 2026-10-09 : la forme des cartes s'applique aussi au gabarit classique (cartes `.ap-carte` et
 * tuiles du site marquées forme-carte / forme-visuel / forme-grille), l'exclusion temporaire `classique: ['soins-forme']` est
 * retirée (mécanisme gardé pour un prochain cas).
 */
export const SECTIONS_NON_RENDUES: Readonly<Record<string, readonly string[]>> = {};

/** Gabarit d'une composition (fiche du modèle de sa structure) */
export function gabaritComposition(x: CompositionRecette, modele?: ContexteRecette['modele']): string {
  const id = universCatalogue(x.structure)?.preReglage.modele ?? 'tableau';
  return gabaritModele((modele ?? modeleIntegre)(id));
}

/** Sections réellement visibles et variables pour une page (ou un composant) dans le gabarit de `x` */
export function sectionsRendues(x: CompositionRecette, page: string, modele?: ContexteRecette['modele']): string[] {
  const g = gabaritComposition(x, modele);
  const variables = new Set<string>(sectionsVariables(g as never));
  const cachees = new Set(SECTIONS_NON_RENDUES[g] ?? []);
  const p = PAGES_STRUCTURE.find((y) => y.id === page);
  const l: string[] = p ? [...p.sections] : [page];
  return l.filter((s) => variables.has(s) && !cachees.has(s));
}

/** La variante y ne diffère-t-elle de x QUE par des sections visibles (rendues) ? */
export function differenceRendue(x: CompositionRecette, y: CompositionRecette, page: string, modele?: ContexteRecette['modele']): boolean {
  const vis = new Set(sectionsRendues(x, page, modele));
  const va = x.sections.variantes as Record<string, unknown>, vb = y.sections.variantes as Record<string, unknown>;
  const diff = [...new Set([...Object.keys(va), ...Object.keys(vb)])].filter((k) => va[k] !== vb[k]);
  return diff.length > 0 && diff.every((k) => vis.has(k));
}

export const SEUIL_PALETTES = 150;

/**
 * Deux options d'une grille « Détail » sont-elles nettement différentes ? Palettes : couleurs d'accent éloignées (distance perçue
 * ≥ SEUIL_PALETTES) ; polices : familles de titres différentes ET genres différents (ou paire de texte différente) ; autres : valeur
 * différente.
 */
export function optionsDistinctes(dimension: string, a: CompositionRecette, b: CompositionRecette): boolean {
  if (dimension === 'couleurs') {
    const ca = gammeParId(a.gamme ?? '')?.accent ?? a.couleur, cb = gammeParId(b.gamme ?? '')?.accent ?? b.couleur;
    return distanceCouleurs(ca, cb) >= SEUIL_PALETTES;
  }
  if (dimension === 'polices') {
    const pa = pairePolices(a.police), pb = pairePolices(b.police);
    if (!pa || !pb || pa.titres === pb.titres) return false;
    const ga = etiquetteIngredient('police', a.police)?.genre, gb = etiquetteIngredient('police', b.police)?.genre;
    return ga !== gb || pa.texte !== pb.texte;
  }
  return true;
}

/** Étiquette de ce qui change sur une carte : « Police : Bodoni / Newsreader », « Palette : Canard », « Premier écran : Notice tramée » */
export function etiquetteChangement(dimension: string, x: CompositionRecette, nouveau: string): string {
  if (dimension === 'couleurs') return `Palette : ${x.gamme ? gammeParId(x.gamme)?.nom ?? x.gamme : `couleur ${x.couleur}`}`;
  if (dimension === 'polices') { const p = pairePolices(x.police); return p ? `Police : ${nomPolice(p.titres)} / ${nomPolice(p.texte)}` : `Police : ${x.police}`; }
  if (dimension === 'visuels') return `Illustrations : ${(LIBELLES_STYLES[x.visuels.style]?.nom ?? x.visuels.style)}`;
  const k = nouveau.split(':');
  if (k[0] === 'composant') return `${NOMS_SECTIONS[k[1]] ?? k[1]} : ${LIBELLES_VARIANTES[k[1]]?.[k[2]] ?? k[2]}`;
  if (k[0] === 'structure') {
    const p = PAGES_STRUCTURE.find((y) => y.id === k[1]);
    const v = x.sections.variantes as Record<string, string>;
    return `${p?.nom ?? k[1]} : ${(p?.sections ?? []).map((s) => LIBELLES_VARIANTES[s]?.[v[s]] ?? v[s]).filter(Boolean).join(' · ')}`;
  }
  if (k[0] === 'details') return `${k[1] === 'coins' ? 'Coins' : k[1]} : ${k[2]}`;
  if (k[0] === 'typo') return `${k[1] === 'graisse' ? 'Graisse des titres' : k[1]} : ${k[2]}`;
  return nouveau;
}
/** Nom lisible d'une police (« Bodoni Moda ») d'après sa pile CSS */
const nomPolice = (id: string) => (/^'([^']+)'/.exec((POLICES as Record<string, string>)[id] ?? '')?.[1] ?? id).replace(/ Variable$/, '');
const NOMS_SECTIONS: Record<string, string> = { accueil: 'Premier écran', 'soins-forme': 'Forme des cartes', soins: 'Soins', sujets: 'Sujets', infos: 'Plan d’accès', horaires: 'Horaires', contact: 'Contact', praticiens: 'Équipe', galerie: 'Galerie', theme: 'Page sujet', article: 'Article' };

/** « Évalué ici : la police » */
export const reperesEvalues: Readonly<Record<string, string>> = {
  couleurs: 'la palette', polices: 'les polices', visuels: 'le style d’illustration', 'typo:graisse': 'la graisse des titres', 'details:coins': 'les coins',
  'composant:accueil': 'le premier écran', photo: 'la photo du premier écran', 'variante:style': 'le style de l’icône',
};
export const repereEvalue = (dimension: string) => reperesEvalues[dimension] ?? (dimension.startsWith('page:') ? `la mise en page « ${PAGES_STRUCTURE.find((p) => p.id === dimension.slice(5))?.nom ?? dimension.slice(5)} »` : dimension);

/** Empreintes de rendu de vignettes : indices des paires identiques (même empreinte) ; [] = grille acceptable */
export function pairesIdentiques(empreintes: readonly (string | null)[]): [number, number][] {
  const r: [number, number][] = [];
  for (let i = 0; i < empreintes.length; i++) for (let j = i + 1; j < empreintes.length; j++) if (empreintes[i] && empreintes[i] === empreintes[j]) r.push([i, j]);
  return r;
}
