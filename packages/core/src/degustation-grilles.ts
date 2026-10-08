// Grilles de la Dégustation (degustation.ts) pour chaque format : compositions complètes, palettes et polices (spécimen),
// premiers écrans, mises en page d'une page, kits d'images, icônes. Séparé de degustation.ts (pur, sans recettes.ts) parce
// qu'il tire des compositions : base « favoris 4-5 ★ » (versQuatreCinq, maxNouveaux 0), puis variantes du moteur d'harmonie
// (varierDuel, tirerPage : jamais de nouvelle violation dure), une seule dimension à la fois, un seul élément nouveau chacune.
import { DIMENSIONS_FORMAT, genererGrille, interetElement, pretProfil, TAILLE_GRILLE, type EtatApprentissage, type FormatGrille } from './degustation';
import { cleComposition, cleJugeDe, type IngredientsDuel } from './duels';
import { sansNouvelleViolation, varierDuel } from './duels-compositions';
import { differenceRendue, etiquetteChangement, grilleDirections, optionsDistinctes, sectionsRendues } from './degustation-directions';
import { tirerDansFamille, type IdFamilleStyle } from './harmonie';
import { VARIANTES_SECTIONS } from './modeles';
import { clePhoto } from './assets-poids';
import { DIRECTIONS_PICTOS, cleDirection } from './pictos-directions';
import { avecBonusQuatreCinq, dimensionElement, elementsComposition, noteElement, versQuatreCinq, type NotesElements } from './qualite';
import { clesRecette, compositionInitiale, compositionPourCle, outilsHarmonie, serialiserComposition, tirerPage, type CompositionRecette, type ContexteRecette, type PageStructure } from './recettes';
import type { Tranches } from './tranches';

export type PropositionDegustation = {
  cle: string;
  /** Élément qui change par rapport à la base (clé d'asset : gamme:…, composant:accueil:…, photo:…, structure:<page>:…) */
  nouveau: string;
  ingredients: IngredientsDuel;
  /** Composition (formats de compositions) */
  x?: CompositionRecette;
  /** Photos du kit (format kits ; la première est celle du premier écran) */
  photos?: string[];
  /** Ce qui change, écrit sur la carte (« Police : Bodoni Moda / Newsreader ») ; directions : « Graphique pop » */
  etiquette?: string;
  /** Directions : les 3 mots de la légende (« sombre · typo didone · photos ») */
  mots?: string[];
};

export type GrilleDegustation = { format: FormatGrille; dimension: string; base: CompositionRecette | null; propositions: PropositionDegustation[] };

type OptionsGrille = {
  contexte: ContexteRecette;
  notes?: NotesElements | null;
  tranches?: Pick<Tranches, 'refuses' | 'favoris'> | null;
  graine: number;
  /** Incertitudes du classement (σ par clé) : priorité aux éléments incertains */
  sigma?: Readonly<Record<string, number>> | null;
  nouveautes?: ReadonlySet<string> | null;
  n?: number;
};

/** Base « favoris 4-5 ★ » d'un scénario : aucun élément à juger là où la dimension a des favoris */
export const baseFavoris = (c: ContexteRecette, notes: NotesElements | null | undefined, graine: number, famille?: IdFamilleStyle | null) => {
  // Entonnoir (2026-10-09) : les détails se dégustent dans la famille préférée du profil (choisie dans une grille « Directions »)
  if (famille) {
    const cb = avecBonusQuatreCinq(c, notes);
    return tirerDansFamille(famille, compositionInitiale(cb, graine), [], cb as never, graine, outilsHarmonie(cb) as never) as CompositionRecette;
  }
  return versQuatreCinq(compositionInitiale(c, graine), c, notes, { maxNouveaux: 0, essais: 3, graine }).composition;
};

/** Éléments comptés pour « un seul nouveau » : ceux de la jauge ; pour une page, sa structure seule remplace ses présentations */
export function elementsGrille(x: CompositionRecette, sujets: readonly string[], dimension: string): string[] {
  const els = elementsComposition(x, sujets);
  if (!dimension.startsWith('page:')) return els;
  const page = dimension.slice(5);
  return [...els.filter((k) => !k.startsWith('composant:')), ...clesRecette(x, sujets).assets.filter((k) => k.startsWith(`structure:${page}:`))];
}

/** Ingrédients d'une proposition (mêmes clés que les duels : clesRecette ; élément classé = le nouveau ; clés du juge) */
export function ingredientsPropositionGrille(x: CompositionRecette, sujets: readonly string[], nouveau: string): IngredientsDuel {
  const k = clesRecette(x, sujets);
  const juge = [...new Set([nouveau, ...k.atelier.map(cleJugeDe).filter((v): v is string => Boolean(v) && v === nouveau)])];
  return { ...k, element: nouveau, juge, composition: JSON.parse(serialiserComposition(x)) };
}

/**
 * Variante d'une dimension : structure d'une page (tirerPage), présentation d'un élément (une valeur de VARIANTES_SECTIONS posée
 * par compositionPourCle, comme les duels de premiers écrans), sinon le dé harmonieux des duels (varierDuel)
 */
const variateur = (c: ContexteRecette) => (x: CompositionRecette, d: string, g: number): CompositionRecette => {
  if (d.startsWith('page:')) return tirerPage(x, { page: d.slice(5) as PageStructure }, c, g);
  if (d.startsWith('composant:')) {
    const l = (VARIANTES_SECTIONS as Readonly<Record<string, readonly string[]>>)[d.slice(10)] ?? [];
    return l.length ? compositionPourCle(x, `${d}:${l[g % l.length]}`) : x;
  }
  return varierDuel(x, d, c, g);
};

/**
 * Grille de compositions (formats compositions, palettes-polices, premiers-ecrans, pages) : base favoris 4-5 ★ (ou `base`), six
 * variantes de la dimension, chacune avec un seul élément nouveau, jamais refusé ni tranché.
 */
export function grilleCompositions(format: FormatGrille, dimension: string, o: OptionsGrille & { base?: CompositionRecette | null; famille?: IdFamilleStyle | null }): GrilleDegustation | null {
  const c = o.contexte;
  const base = o.base ?? baseFavoris(c, o.notes, o.graine, o.famille);
  // Différence RENDUE seulement (cas « Mises en page · Semelles » du 2026-10-09 : forme des cartes invisible en gabarit classique)
  const page = dimension.startsWith('page:') ? dimension.slice(5) : dimension.startsWith('composant:') ? dimension.slice(10) : null;
  if (page && !sectionsRendues(base, page, c.modele).length) return null;
  const g = genererGrille<CompositionRecette>({
    base, dimension, graine: o.graine, n: o.n ?? TAILLE_GRILLE, essais: 7,
    varier: variateur(c), elements: (x) => elementsGrille(x, c.sujets, dimension), cle: (x) => cleComposition(JSON.parse(serialiserComposition(x))),
    tranches: o.tranches, interet: (k) => interetElement(k, { notes: o.notes, sigma: o.sigma, nouveautes: o.nouveautes }),
    // Jamais de nouvelle règle dure (harmonie.ts) par rapport à la base ; une page ou un élément : seulement des sections rendues
    controle: (b, y) => sansNouvelleViolation(b, y, c) && (!page || differenceRendue(b, y, page, c.modele)),
    // Écart minimal garanti entre options (palettes éloignées, polices de genres différents…) ; sinon grille plus courte (≥ 3)
    distinct: (a, b) => optionsDistinctes(dimension, a, b),
  });
  if (!g) return null;
  return {
    format, dimension, base,
    propositions: g.propositions.map((p) => ({ cle: p.cle, nouveau: p.nouveau, x: p.x, etiquette: etiquetteChangement(dimension, p.x, p.nouveau), ingredients: ingredientsPropositionGrille(p.x, c.sujets, p.nouveau) })),
  };
}

/** Grille « Directions » au format commun (vignettes d'accueil, étiquette = famille, 3 mots) */
export function grilleDirectionsDegustation(o: OptionsGrille & { priorite?: readonly IdFamilleStyle[] }): GrilleDegustation | null {
  const g = grilleDirections({ contexte: o.contexte, notes: o.notes, tranches: o.tranches, graine: o.graine, priorite: o.priorite });
  if (!g) return null;
  return {
    format: 'directions', dimension: 'directions', base: null,
    propositions: g.propositions.map((p) => ({ cle: p.cle, nouveau: `famille:${p.famille}`, x: p.x, etiquette: p.legende.famille, mots: p.legende.mots, ingredients: p.ingredients })),
  };
}

/**
 * Grille de kits d'images : le même kit (photos favorites du sujet), seule la photo du premier écran change (six photos du sujet,
 * jamais refusées ni tranchées, jamais déjà dans le kit). `pool` : adresses des photos admissibles du sujet, les meilleures d'abord
 * (classerPhotos) ; `kit` : le kit de base.
 */
export function grilleKit(kit: readonly string[], pool: readonly string[], o: Omit<OptionsGrille, 'contexte'> & { sujets: readonly string[] }): GrilleDegustation | null {
  if (!kit.length) return null;
  const cleDe = (u: string) => clePhoto(u);
  const g = genererGrille<string[]>({
    base: [...kit], dimension: 'photo', graine: o.graine, n: o.n ?? TAILLE_GRILLE, essais: 6,
    varier: (x, _d, gg) => { const l = pool.filter((u) => !x.includes(u)); return l.length ? [l[gg % l.length], ...x.slice(1)] : x; },
    elements: (x) => x.map(cleDe).filter((k): k is string => Boolean(k)),
    cle: (x) => cleDe(x[0]) ?? `photo:${x[0]}`,
    tranches: o.tranches, interet: (k) => interetElement(k, { notes: o.notes, sigma: o.sigma, nouveautes: o.nouveautes }),
  });
  if (!g) return null;
  return {
    format: 'kits', dimension: 'photo', base: null,
    propositions: g.propositions.map((p) => ({ cle: p.nouveau, nouveau: p.nouveau, photos: p.x, etiquette: `Photo : ${p.nouveau.slice(6)}`, ingredients: { assets: [p.nouveau], element: p.nouveau, juge: [p.nouveau] } })),
  };
}

/**
 * Grille d'icônes : la même icône dans chaque style à l'essai (directions de pictos-directions.ts) et le picto actuel ; autant de
 * propositions que de styles (4 aujourd'hui). Styles refusés ou tranchés écartés.
 */
export function grilleIcones(id: string, o: { tranches?: Pick<Tranches, 'refuses' | 'favoris'> | null; graine: number }): GrilleDegustation | null {
  const cles = [`picto:${id}`, ...DIRECTIONS_PICTOS.map((d) => cleDirection(id, d))].filter((k) => !o.tranches?.refuses.has(k) && !o.tranches?.favoris.has(k));
  if (cles.length < 3) return null;
  let s = o.graine >>> 0;
  const melange = cles.map((k) => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return { k, v: s }; }).sort((a, b) => a.v - b.v).map((x) => x.k);
  return { format: 'icones', dimension: 'variante:style', base: null, propositions: melange.map((k) => ({ cle: k, nouveau: k, etiquette: k.includes('@direction-') ? `Style ${k.slice(-1).toUpperCase()}` : 'Picto actuel', ingredients: { assets: [k], element: k, juge: [k] } })) };
}

// ---------------------------------------------------------------------------------------------------------------
// État d'apprentissage (serveur de /admin/degustation) : profils prêts, pistes de grille, départages, ingrédients à noter
// ---------------------------------------------------------------------------------------------------------------

export type ElementInventaire = { cle: string; dim: string; sujet: string | null };

/** Inventaire réduit aux éléments suivis par le tableau de progression (dimension, sujet des photos) */
export function elementsInventaire(items: readonly { cle: string; sujets?: readonly string[] }[]): ElementInventaire[] {
  const r: ElementInventaire[] = [];
  for (const it of items) {
    const photo = it.cle.startsWith('photo:');
    for (const s of photo ? (it.sujets?.length ? it.sujets : ['general']) : [null]) {
      const d = dimensionElement(it.cle, s ? [s] : []);
      if (d) r.push({ cle: it.cle, dim: d.id, sujet: s });
    }
  }
  return r;
}

/** Éléments qui concernent un profil : tout l'habillage commun, et les photos de son sujet n° 1 (ou « général ») */
export const elementsDuProfil = (els: readonly ElementInventaire[], sujets: readonly string[]) =>
  els.filter((e) => e.sujet === null || e.sujet === (sujets[0] ?? 'general') || (e.sujet === 'general' && !sujets.length)).map((e) => ({ cle: e.cle, dimension: e.dim }));

/** Dimension du tableau de progression que nourrit une dimension de grille (préfixe pour les illustrations) */
export function dimensionProgression(dimension: string, sujet: string | null): string | null {
  if (dimension === 'couleurs') return 'gamme';
  if (dimension === 'polices') return 'typo:police';
  if (dimension === 'visuels') return 'illustration:';
  if (dimension === 'effets') return 'effets';
  if (dimension === 'photo') return `photo:${sujet ?? 'general'}`;
  if (dimension === 'variante:style') return 'picto';
  if (/^(details|typo|composant):/.test(dimension)) return dimension;
  return null;
}

export type DonneesEtat = {
  profils: readonly { id: string; sujets: readonly string[] }[];
  elements: readonly ElementInventaire[];
  notes: NotesElements;
  /** Effets appris des assets (étoiles relatives à `moyenne`) : estimation des éléments jamais notés */
  effets?: Readonly<Record<string, number>> | null;
  moyenne?: number;
  /** Grilles déjà faites (profession choisie) : profil (sujet n° 1), format, dimension */
  faites: readonly { sujet: string; format: FormatGrille; dimension: string }[];
  /** Haut des classements des duels par contexte (classementsParContexte) */
  classements?: readonly { famille: string; sujet: string; lignes: readonly { cle: string; theta: number; sigma: number }[] }[];
  tranches?: Pick<Tranches, 'refuses' | 'favoris'> | null;
  /** Formats disponibles (icônes : seulement si la profession a des pictos à l'essai) */
  formats?: readonly FormatGrille[];
};

const PREFIXES_NOTE_RAPIDE = ['gamme:', 'typo:police:', 'composant:accueil:', 'photo:', 'effets:', 'details:', 'typo:'];

/** État pour planifierSession + part prête de chaque profil (notes, sinon estimation par les choix et duels) */
export function etatDegustation(d: DonneesEtat): EtatApprentissage & { pret: Record<string, number>; couvertes: Record<string, string[]> } {
  const note = (k: string) => noteElement(k, d.notes);
  const estime = (k: string) => (d.effets && d.effets[k] !== undefined ? (d.moyenne ?? 3) + d.effets[k] : null);
  const pret: Record<string, number> = {}, couvertes: Record<string, string[]> = {};
  const pistes: EtatApprentissage['pistes'][number][] = [];
  const formats = d.formats ?? (Object.keys(DIMENSIONS_FORMAT) as FormatGrille[]);
  for (const p of d.profils) {
    const els = elementsDuProfil(d.elements, p.sujets);
    const pp = pretProfil(els, note, estime);
    pret[p.id] = Math.round(pp.pret * 1000) / 1000;
    couvertes[p.id] = pp.dimensions.filter((x) => x.couverte).map((x) => x.id);
    for (const f of formats) for (const dim of DIMENSIONS_FORMAT[f]) {
      const prog = dimensionProgression(dim, p.sujets[0] ?? null);
      const lot = prog ? els.filter((e) => (prog.endsWith(':') ? e.dimension.startsWith(prog) : e.dimension === prog)) : [];
      const jamais = lot.filter((e) => note(e.cle) === null).length;
      const incertitude = lot.length ? jamais / lot.length : 0.5;
      const couverte = prog ? pp.dimensions.filter((x) => (prog.endsWith(':') ? x.id.startsWith(prog) : x.id === prog)).some((x) => x.couverte) : false;
      const jouees = d.faites.filter((x) => x.sujet === (p.sujets[0] ?? 'cabinet') && x.format === f && x.dimension === dim).length;
      pistes.push({ format: f, dimension: dim, profil: p.id, incertitude: Math.round(incertitude * 1000) / 1000, couverte, jouees });
    }
  }
  const departages: EtatApprentissage['departages'][number][] = [];
  for (const c of d.classements ?? []) {
    const p = d.profils.find((x) => x.sujets[0] === c.sujet);
    if (!p || !['couleurs', 'polices', 'composant:accueil'].includes(c.famille)) continue;
    const l = c.lignes.map((x) => ({ ...x, k: cleJugeDe(x.cle) ?? x.cle })).filter((x) => /^(gamme:|typo:police:|composant:accueil:)/.test(x.k) && !d.tranches?.refuses.has(x.k)).slice(0, 4);
    for (let i = 0; i + 1 < l.length; i++) departages.push({ dimension: c.famille, profil: p.id, a: l[i].k, b: l[i + 1].k, ecart: Math.round(Math.abs(l[i].theta - l[i + 1].theta) * 1000) / 1000, sigma: Math.round(((l[i].sigma + l[i + 1].sigma) / 2) * 1000) / 1000 });
  }
  const aNoter: EtatApprentissage['aNoter'][number][] = [];
  const vus = new Set<string>();
  for (const p of d.profils) for (const e of elementsDuProfil(d.elements, p.sujets)) {
    if (vus.has(e.cle) || note(e.cle) !== null || d.tranches?.refuses.has(e.cle) || d.tranches?.favoris.has(e.cle) || !PREFIXES_NOTE_RAPIDE.some((x) => e.cle.startsWith(x))) continue;
    vus.add(e.cle);
    aNoter.push({ cle: e.cle, profil: e.cle.startsWith('photo:') ? p.id : null, nouveaute: false });
  }
  return { profils: d.profils.map((p) => ({ id: p.id, pret: pret[p.id] })), pistes, departages, aNoter: aNoter.slice(0, 60), pret, couvertes };
}
