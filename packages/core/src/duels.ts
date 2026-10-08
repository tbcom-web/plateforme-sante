// Mode duel « A ou B ? » (demande de Paul, 2026-10-07 : « un mode d'entraînement de comparaison entre deux sujets similaires :
// cette composition ou cette composition ? Comme ça tu sais quels sont les meilleurs combos / photos »). Page /admin/retours/duel,
// journal en ajout seul `duels` (migration 0037). Module PUR, déterministe, sans dépendance d'exécution vers recettes.ts (les
// compositions sont générées par des fonctions passées en paramètre : tirerDimension, tirerPage).
//
// 1. TYPES DE DUEL
//   theme       : deux compositions complètes pour le MÊME scénario client (une dimension changée : gamme, polices, effets…)
//   typo        : même recette, deux polices (ou deux réglages de typographie)
//   traitement  : même recette en style « Photos », deux traitements photo
//   element     : même recette, même page, deux présentations d'un élément (horaires, galerie, plan d'accès…)
//   photo       : deux photos du même sujet, au même emplacement, avec le même traitement (seule la photo change)
//   illustration: deux illustrations / héros du même sujet : même dessin dans deux styles (dimension « style »), ou deux dessins
//                 du même style (dimension « version »)
//                 + VARIANTES d'une même illustration de base (2026-10-08, bases-illustrations.ts) : dimension « variante:contraste »
//                 (contraste fort / doux / d'origine, filtre CSS au rendu), « variante:couleur » (deux gammes) ou « variante:style »
//                 (deux registres ou styles du même dessin) ; UNE seule dimension diffère (genererDuelVariantes) ; résultat → écart
//                 propre de la variante (renfortsDuels sur la clé de variante, ajouté à l'effet hérité de la base).
//
// 2. PAIRES (genererPaireElements, genererDuelComposition) : même sujet / même scénario ; la plupart des duels ne diffèrent que
//   par UNE dimension (contrôlée : champsDifferents / variantesDifferentes) ; ~15 % de duels « libres » entre deux recettes bien
//   classées du scénario ; une paire déjà jouée n'est pas reposée tant qu'il en reste d'autres ; priorité aux éléments au
//   classement incertain (σ élevé) et proches (|θa − θb| faible) et aux dimensions peu jouées.
//
// 3. CLASSEMENT : modèle de Bradley-Terry bayésien (a priori gaussien) — équivalent statistique d'un Elo sans ordre :
//   P(i bat j) = σ(θi − θj),  σ(x) = 1 / (1 + e^−x),  a priori θ ~ N(0, τ²), τ = 1
//   Estimation MAP par Newton coordonnée par coordonnée (60 passes, joueurs triés : résultat indépendant de l'ordre des duels).
//   Égalité = demi-victoire de chaque côté ; « Les deux sont mauvais » = une défaite de chaque élément contre la RÉFÉRENCE
//   (θ = 0, élément moyen) avec un poids 0,35 (pénalité légère : ≈ −0,08 étoile). Incertitude : σθ = 1 / √(Σ w·p·(1 − p) + 1/τ²).
//   Affichage façon Elo : elo = 1500 + θ · 400 / ln 10 (≈ 173,7 · θ), ± 173,7 · σθ.
//   Contexte d'un classement : type (photos, illustrations, ou dimension des compositions) × sujet n° 1 du scénario.
//
// 4. APPRENTISSAGE (renfortsDuels → lib/atelier.ts, getPoidsAtelier) : les CLÉS D'INGRÉDIENTS qui diffèrent entre A et B
//   (atelier : police=…, gamme=…, variante=… ; assets : photo:…, heros:…, gamme:…) jouent un Bradley-Terry global :
//   un duel à une dimension pèse 1, un duel libre 0,5 (réparti sur les |A|·|B| paires de clés différentes), × poids de l'appareil
//   (mobile 1,25 comme les notes). Puis, pour chaque clé :  Δduel(k) = clamp(0,5 · θk, ±0,5 étoile).
//   Cumul avec les notes (fusionnerRenforts) : Δ = clamp(Δrecettes(k) + Δduel(k), ±1 étoile) AJOUTÉ à l'effet appris de k par
//   ses notes individuelles (appliquerRenforts, bornes ±4 inchangées). Un duel isolé gagné donne θ ≈ +0,3 → +0,15 étoile ; il
//   faut une série cohérente pour approcher le plafond. Les garde-fous (diabète sans rouge, posture jamais, AA…) passent
//   toujours avant : les poids ne font que réordonner des choix déjà permis.
//
// 5. JUGE (juge.ts, retours/predictions.json) : predireDuel compare les notes prédites des éléments qui diffèrent ; l'admin
//   affiche « Claude prévoyait A » APRÈS le choix de Paul ; accordJuge mesure l'accord (calibration).

import { cleVarianteRendu, CONTRASTES, DIMENSIONS_VARIANTE, dimensionDuelVariante, lireVarianteRendu, rangVariante, valeurVariante, type DimensionVariante } from './bases-illustrations';

export const TYPES_DUEL = ['theme', 'typo', 'traitement', 'element', 'photo', 'illustration'] as const;
export type TypeDuel = (typeof TYPES_DUEL)[number];
export const estTypeDuel = (x: unknown): x is TypeDuel => (TYPES_DUEL as readonly unknown[]).includes(x);

export const LIBELLES_TYPES_DUEL: Record<TypeDuel, { nom: string; detail: string }> = {
  theme: { nom: 'Thèmes complets', detail: 'Deux sites pour le même client : une seule chose change (couleurs, polices, effets…), parfois deux recettes bien classées.' },
  typo: { nom: 'Typographies', detail: 'La même recette avec deux polices ou deux réglages de typographie.' },
  traitement: { nom: 'Traitements photo', detail: 'La même recette en photos, deux traitements (teinte, contraste, grain…).' },
  element: { nom: 'Éléments et structures', detail: 'La même page avec deux présentations d’un élément (horaires, galerie, plan d’accès…).' },
  photo: { nom: 'Photos', detail: 'Deux photos du même sujet, au même emplacement, avec le même traitement.' },
  illustration: { nom: 'Illustrations et héros', detail: 'Le même sujet en deux styles, ou deux dessins du même style.' },
};

/**
 * MODES du duel (demande de Paul du 2026-10-08 : « pouvoir noter / A-B tester des palettes de couleurs, des combinaisons de
 * polices et de tailles ») : un mode est un type enregistré (colonne `type`, contrainte de 0037 inchangée : aucune migration)
 * restreint à certaines dimensions. Palettes : seule la gamme change (gammes et couleurs libres proches des préférences du
 * scénario) ; Paires de polices : seule la paire change ; Tailles et casse : même paire, UN axe de typographie (échelle, casse,
 * graisse, interlettrage) ; Police × palette : les deux changent ensemble (combinaison, clé apprise `gamme:<g>&police:<p>`).
 * Les tirages passent par le moteur d'harmonie (jamais de règle dure enfreinte : duels-compositions.ts).
 */
/**
 * Duels de PAGES COMPLÈTES (demande de Paul du 2026-10-08 : « voter entre deux pages complètes : page de soin, d'article, de
 * contact ») : type `element`, dimension `page:<page>` (même recette, seule la structure de CETTE page change : dé par page,
 * clés structure:<page>:*) ou `page-libre:<page>` (deux recettes complètes vues sur cette page).
 */
export const PAGES_DUEL: readonly { id: string; nom: string }[] = [
  { id: 'accueil', nom: 'Accueil' }, { id: 'theme', nom: 'Page sujet' }, { id: 'fiche', nom: 'Fiche soin' }, { id: 'article', nom: 'Article de blog' },
  { id: 'actualites', nom: 'Actualités' }, { id: 'cabinet', nom: 'Le cabinet' }, { id: 'acces', nom: 'Contact et accès' }, { id: 'questions', nom: 'Questions' },
  { id: 'soins', nom: 'Liste des soins' },
];
export const pageDuel = (id: unknown) => PAGES_DUEL.find((p) => p.id === id) ?? null;
/** Page d'une dimension `page:<id>` ou `page-libre:<id>` */
export const pageDeDimension = (d: string | null | undefined): string | null => (d && /^page(-libre)?:/.test(d) ? d.slice(d.indexOf(':') + 1) : null);
export const AXES_TAILLES = ['echelle', 'casse', 'graisse', 'interlettrage'] as const;
/**
 * Paires d'éléments (= PAIRES_ELEMENTS de combinaisons-elements.ts, vérifié par les tests) : dimension `paire:<a>:<b>`, « . » des
 * dimensions d'harmonie écrit « _ » (contrainte de la colonne dimension_differente, 0037 : [a-z0-9:_-], aucune migration)
 */
export const DIMENSIONS_PAIRES: readonly string[] = ['paire:v_soins-forme:style', 'paire:v_accueil:v_entete-anim', 'paire:menu_ordinateur:police', 'paire:details_jeu:structure', 'paire:v_accueil:police', 'paire:style:structure', 'paire:v_portraits:v_accueil'];
export const MODES_DUEL: readonly { id: string; type: TypeDuel; nom: string; detail: string; dimensions: readonly string[] }[] = [
  { id: 'palette', type: 'theme', nom: 'Palettes', detail: 'La même recette, seule la palette de couleurs change (gammes, couleurs libres proches des préférences).', dimensions: ['couleurs'] },
  { id: 'polices', type: 'typo', nom: 'Paires de polices', detail: 'La même recette, seule la paire de polices (titres et texte) change.', dimensions: ['polices'] },
  { id: 'tailles', type: 'typo', nom: 'Tailles et casse', detail: 'La même paire de polices : échelle des titres, casse, graisse ou interlettrage, un réglage à la fois.', dimensions: AXES_TAILLES.map((a) => `typo:${a}`) },
  { id: 'police-palette', type: 'theme', nom: 'Police × palette', detail: 'La paire de polices ET la palette changent ensemble : quelles combinaisons vont bien ensemble.', dimensions: ['police-couleurs'] },
  { id: 'pages', type: 'element', nom: 'Pages complètes', detail: 'La même page (fiche soin, article, contact…) en deux structures, ou dans deux recettes complètes : page entière, ordinateur et téléphone.', dimensions: PAGES_DUEL.map((p) => `page:${p.id}`) },
  // Lot du 2026-10-08 (« contrastes de couleurs avec leurs fonds, images, combinaisons d'éléments ») : surfaces.ts, combinaisons-elements.ts
  { id: 'surfaces', type: 'theme', nom: 'Contrastes et fonds', detail: 'La même palette, répartie autrement : fond blanc ou teinté, texte franc ou doux, accent plein ou léger (toujours AA).', dimensions: ['surfaces'] },
  { id: 'images-fonds', type: 'illustration', nom: 'Images × fonds', detail: 'La même image sur deux fonds, ou sur le même fond avec deux traitements.', dimensions: ['image:fond', 'image:traitement'] },
  // Réglages fins (demande de Paul du 2026-10-08 : « tester les padding, les ombres… ») : UN élément du jeu de détails à la fois
  // (densité = espacements intérieurs, ombres, coins = arrondis, boutons, cadres d'images), bloc focalisé carte + bouton
  { id: 'details-fins', type: 'theme', nom: 'Espacements, ombres, arrondis', detail: 'Un seul réglage fin change : densité (espacements), ombres, coins, boutons ou cadres d’images.', dimensions: ['details:densite', 'details:ombres', 'details:coins', 'details:boutons', 'details:cadre'] },
  { id: 'combinaisons', type: 'theme', nom: 'Combinaisons d’éléments', detail: 'Deux éléments qui se voient ensemble changent à la fois : cartes × illustrations, premier écran × animation, menu × police…', dimensions: DIMENSIONS_PAIRES },
];
export const modeDuel = (id: unknown) => MODES_DUEL.find((m) => m.id === id) ?? null;
/** Mode d'un duel enregistré (d'après sa dimension) ; null : type de base */
export const modeDuDuel = (d: Pick<Duel, 'type' | 'dimension'>) => MODES_DUEL.find((m) => m.type === d.type && d.dimension !== null && m.dimensions.includes(d.dimension)) ?? null;

export const RESULTATS_DUEL = ['a', 'b', 'egalite', 'mauvais'] as const;
export type ResultatDuel = (typeof RESULTATS_DUEL)[number];
export const estResultatDuel = (x: unknown): x is ResultatDuel => (RESULTATS_DUEL as readonly unknown[]).includes(x);

export const APPAREILS_DUEL = ['ordinateur', 'mobile', 'les-deux'] as const;
export type AppareilDuel = (typeof APPAREILS_DUEL)[number];

/** « Pourquoi ? » : étiquettes rapides, facultatives (positives : ce qui fait gagner ; négatives : ce qui fait perdre) */
export const ETIQUETTES_DUEL: readonly { id: string; libelle: string }[] = [
  { id: 'plus-lisible', libelle: 'Plus lisible' },
  { id: 'plus-harmonieux', libelle: 'Plus harmonieux' },
  { id: 'plus-pro', libelle: 'Plus pro' },
  { id: 'plus-rassurant', libelle: 'Plus rassurant' },
  { id: 'mieux-dans-le-sujet', libelle: 'Mieux dans le sujet' },
  { id: 'plus-moderne', libelle: 'Plus moderne' },
  { id: 'meilleures-couleurs', libelle: 'Couleurs' },
  { id: 'meilleure-typo', libelle: 'Typographie' },
  { id: 'photo-plus-nette', libelle: 'Photo plus nette' },
  { id: 'meilleur-cadrage', libelle: 'Cadrage' },
  { id: 'mieux-sur-mobile', libelle: 'Mieux sur mobile' },
  { id: 'trop-charge', libelle: 'L’autre est trop chargé' },
  { id: 'fade', libelle: 'L’autre est fade' },
];
export const estEtiquetteDuel = (x: unknown): x is string => ETIQUETTES_DUEL.some((e) => e.id === x);

/** Ce que montre un côté du duel (colonnes a_ingredients / b_ingredients) */
export type IngredientsDuel = {
  /** Clés d'apprentissage atelier (police=…, gamme=…, variante=…) et assets (photo:…, gamme:…, heros:…) : clesRecette */
  atelier?: string[];
  assets?: string[];
  /** Élément classé pour l'affichage (« police=revue », « photo:sport-course ») ; défaut : la clé du côté */
  element?: string | null;
  /** Clés que le juge peut avoir prédites (assets : photo:…, typo:police:…, gamme:…) */
  juge?: string[];
  /** Composition complète (thèmes) : rejouer le duel, export */
  composition?: unknown;
};

export type ScenarioDuel = {
  /** Sujets du client (principaux puis secondaires) ; le sujet n° 1 est le contexte du classement */
  sujets: string[];
  principaux?: number;
  couleurs?: string[];
  /** Page montrée (duels d'éléments) */
  page?: string | null;
  /** Emplacement (photos : accueil, page sujet, galerie) */
  emplacement?: string | null;
};

export type Duel = {
  type: TypeDuel;
  scenario: ScenarioDuel;
  aCle: string;
  bCle: string;
  aIngredients: IngredientsDuel;
  bIngredients: IngredientsDuel;
  /** Dimension qui seule diffère (« polices », « couleurs », « composant:horaires », « photo », « style », « version ») ; null = libre */
  dimension: string | null;
  resultat: ResultatDuel;
  etiquettes?: readonly string[];
  appareil?: string | null;
  /** Gagnant prédit par le juge au moment du duel (calibration) */
  prediction?: 'a' | 'b' | 'egalite' | null;
  le?: string | null;
};

// ---------------------------------------------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------------------------------------------

/** Générateur pseudo-aléatoire déterministe (mulberry32) */
export function hasard(graine: number): () => number {
  let a = (graine >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** JSON stable (clés d'objets triées, récursif) */
export function jsonStable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonStable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${jsonStable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

function fnv(s: string, graine: number): string {
  let h = graine >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Clé stable d'une composition (16 caractères hexadécimaux) : `compo:<hachage>` */
export const cleComposition = (x: unknown) => { const s = jsonStable(x); return `compo:${fnv(s, 2166136261)}${fnv(s, 0x9747b28c)}`; };

/** Identifiant d'une paire, indépendant de l'ordre A / B */
export const cleDePaire = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Champs de premier niveau qui diffèrent entre deux compositions */
export function champsDifferents(a: object, b: object): string[] {
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => jsonStable(x[k]) !== jsonStable(y[k])).sort();
}

/** Familles de variantes de sections (et l'ordre de l'accueil) qui diffèrent */
export function variantesDifferentes(a: object, b: object): string[] {
  const sa = (a as { sections?: { ordre?: unknown; variantes?: Record<string, unknown> } }).sections ?? {};
  const sb = (b as { sections?: { ordre?: unknown; variantes?: Record<string, unknown> } }).sections ?? {};
  const va = sa.variantes ?? {}, vb = sb.variantes ?? {};
  const l = [...new Set([...Object.keys(va), ...Object.keys(vb)])].filter((k) => jsonStable(va[k]) !== jsonStable(vb[k]));
  if (jsonStable(sa.ordre) !== jsonStable(sb.ordre)) l.push('ordre');
  return l.sort();
}

/** Champs de la composition qu'une dimension a le droit de changer (au-delà : le duel n'est plus « à une dimension ») */
export const CHAMPS_DIMENSION: Readonly<Record<string, readonly string[]>> = {
  couleurs: ['gamme', 'couleur'],
  polices: ['police'],
  effets: ['effets'],
  traitement: ['traitement'],
  typo: ['typo'],
  details: ['details'],
  menu: ['menu'],
  visuels: ['visuels', 'photos'],
  photos: ['photos'],
  // Police × palette (MODES_DUEL) : les deux changent ensemble
  'police-couleurs': ['police', 'gamme', 'couleur'],
};

/** La différence entre a et b est-elle celle de la dimension, et elle seule ? */
export function uneSeuleDimension(a: object, b: object, dimension: string): boolean {
  const d = champsDifferents(a, b);
  if (!d.length) return false;
  if (dimension.startsWith('composant:')) {
    const v = variantesDifferentes(a, b);
    return d.length === 1 && d[0] === 'sections' && v.length === 1 && v[0] === dimension.slice('composant:'.length);
  }
  // Un axe de typographie (typo:echelle…) : seul le réglage `typo`, et dans lui seul cet axe
  if (dimension.startsWith('typo:')) {
    const axe = dimension.slice(5);
    const ta = ((a as { typo?: Record<string, unknown> }).typo ?? {}), tb = ((b as { typo?: Record<string, unknown> }).typo ?? {});
    const axes = [...new Set([...Object.keys(ta), ...Object.keys(tb)])].filter((k) => jsonStable(ta[k]) !== jsonStable(tb[k]));
    return d.length === 1 && d[0] === 'typo' && axes.length === 1 && axes[0] === axe;
  }
  // Combinaison d'éléments : contrôlée par varierPaire (les deux dimensions d'harmonie, elles seules) ; répartition des surfaces : son champ
  if (dimension.startsWith('paire:')) return d.length > 0;
  // Un élément du jeu de détails (details:densite…) : seul le réglage `details`, et dans lui seul cet élément
  if (dimension.startsWith('details:')) {
    const e = dimension.slice(8);
    const da = ((a as { details?: Record<string, unknown> }).details ?? {}), db = ((b as { details?: Record<string, unknown> }).details ?? {});
    const el = [...new Set([...Object.keys(da), ...Object.keys(db)])].filter((k) => jsonStable(da[k]) !== jsonStable(db[k]));
    return d.length === 1 && d[0] === 'details' && el.length === 1 && el[0] === e;
  }
  if (dimension === 'surfaces') return d.length === 1 && d[0] === 'surfaces';
  // Structure d'une page : seules ses présentations (sections) changent ; recettes complètes vues sur une page : libre
  if (dimension.startsWith('page:')) return d.length === 1 && d[0] === 'sections';
  if (dimension.startsWith('page-libre:')) return d.length > 0;
  // Police × palette : la paire ET la palette diffèrent, rien d'autre
  if (dimension === 'police-couleurs') return d.includes('police') && (d.includes('gamme') || d.includes('couleur')) && d.every((c) => CHAMPS_DIMENSION[dimension].includes(c));
  const permis = CHAMPS_DIMENSION[dimension];
  return Boolean(permis) && d.every((c) => permis.includes(c));
}

// ---------------------------------------------------------------------------------------------------------------
// Validation (action serveur)
// ---------------------------------------------------------------------------------------------------------------

const CLE = /^[a-z]+:[^\s]{1,200}$/;
const CLE_ING = /^[^\s]{1,300}$/;
const listeCles = (v: unknown, max = 60) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && CLE_ING.test(x)))].slice(0, max) : undefined);

/** Ingrédients reçus du navigateur → forme bornée (taille de la composition limitée à 12 Ko) */
export function normaliserIngredientsDuel(v: unknown): IngredientsDuel {
  if (!v || typeof v !== 'object') return {};
  const o = v as Record<string, unknown>;
  const r: IngredientsDuel = {};
  const at = listeCles(o.atelier), as = listeCles(o.assets), j = listeCles(o.juge, 12);
  if (at?.length) r.atelier = at;
  if (as?.length) r.assets = as;
  if (j?.length) r.juge = j;
  if (typeof o.element === 'string' && CLE_ING.test(o.element)) r.element = o.element;
  if (o.composition && typeof o.composition === 'object' && JSON.stringify(o.composition).length <= 12000) r.composition = o.composition;
  return r;
}

const SUJET = /^[a-z0-9-]{2,30}$/;
export function normaliserScenarioDuel(v: unknown): ScenarioDuel {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const liste = (x: unknown, re: RegExp, max: number) => (Array.isArray(x) ? [...new Set(x.filter((y): y is string => typeof y === 'string' && re.test(y)))].slice(0, max) : []);
  const s: ScenarioDuel = { sujets: liste(o.sujets, SUJET, 6) };
  if (Number.isInteger(o.principaux) && (o.principaux as number) >= 0 && (o.principaux as number) <= 6) s.principaux = o.principaux as number;
  const c = liste(o.couleurs, /^#[0-9a-fA-F]{6}$|^[a-z-]{2,30}$/, 3);
  if (c.length) s.couleurs = c;
  if (typeof o.page === 'string' && SUJET.test(o.page)) s.page = o.page;
  if (typeof o.emplacement === 'string' && SUJET.test(o.emplacement)) s.emplacement = o.emplacement;
  return s;
}

/** Duel reçu du navigateur → ligne valide, ou un message d'erreur */
export function validerDuel(b: Record<string, unknown>): { ok: true; duel: Duel } | { ok: false; message: string } {
  if (!estTypeDuel(b.type)) return { ok: false, message: 'Type de duel inconnu.' };
  if (!estResultatDuel(b.resultat)) return { ok: false, message: 'Résultat invalide.' };
  const aCle = String(b.aCle ?? ''), bCle = String(b.bCle ?? '');
  if (!CLE.test(aCle) || !CLE.test(bCle) || aCle === bCle) return { ok: false, message: 'Éléments du duel invalides.' };
  const dimension = typeof b.dimension === 'string' && /^[a-z0-9:_-]{1,60}$/.test(b.dimension) ? b.dimension : null;
  const etiquettes = Array.isArray(b.etiquettes) ? [...new Set(b.etiquettes.filter(estEtiquetteDuel))].slice(0, 12) : [];
  const appareil = (APPAREILS_DUEL as readonly unknown[]).includes(b.appareil) ? (b.appareil as AppareilDuel) : 'les-deux';
  const prediction = b.prediction === 'a' || b.prediction === 'b' || b.prediction === 'egalite' ? b.prediction : null;
  return {
    ok: true,
    duel: {
      type: b.type, scenario: normaliserScenarioDuel(b.scenario), aCle, bCle,
      aIngredients: normaliserIngredientsDuel(b.aIngredients), bIngredients: normaliserIngredientsDuel(b.bIngredients),
      dimension, resultat: b.resultat, etiquettes, appareil, prediction,
    },
  };
}

/** Ligne de la table (ou de duels_apprentissage) → duel ; invalide → null */
export function duelDepuisLigne(l: Record<string, unknown>): Duel | null {
  const v = validerDuel({
    type: l.type, resultat: l.resultat, aCle: l.a_cle, bCle: l.b_cle, dimension: l.dimension_differente, etiquettes: l.etiquettes ?? [],
    appareil: l.appareil, prediction: l.prediction, scenario: l.scenario, aIngredients: l.a_ingredients, bIngredients: l.b_ingredients,
  });
  return v.ok ? { ...v.duel, le: typeof l.created_at === 'string' ? l.created_at : null } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Bradley-Terry bayésien
// ---------------------------------------------------------------------------------------------------------------

/** Joueur de référence (élément moyen, θ = 0) : « Les deux sont mauvais » = défaite contre lui */
export const REFERENCE = '∅';

/** Un match : score de `a` (1 victoire, 0 défaite, 0,5 égalité), poids w */
export type MatchBT = { a: string; b: string; s: number; w: number };

export type ForceBT = { theta: number; sigma: number; n: number; victoires: number; defaites: number; egalites: number; mauvais: number };

export const BT = { tau: 1, iterations: 60, eloEchelle: 400 / Math.LN10, eloBase: 1500 } as const;

const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** Ajustement MAP (a priori N(0, τ²)), déterministe ; la RÉFÉRENCE reste à 0 */
export function ajusterBT(matchs: readonly MatchBT[], tau: number = BT.tau): Map<string, ForceBT> {
  const adj = new Map<string, { o: string; s: number; w: number }[]>();
  const stat = new Map<string, ForceBT>();
  const ajouter = (i: string, o: string, s: number, w: number) => {
    if (i === REFERENCE) return;
    (adj.get(i) ?? adj.set(i, []).get(i)!).push({ o, s, w });
    const f = stat.get(i) ?? { theta: 0, sigma: tau, n: 0, victoires: 0, defaites: 0, egalites: 0, mauvais: 0 };
    stat.set(i, f);
  };
  for (const m of matchs) {
    if (!(m.w > 0) || m.a === m.b) continue;
    ajouter(m.a, m.b, m.s, m.w);
    ajouter(m.b, m.a, 1 - m.s, m.w);
  }
  const joueurs = [...adj.keys()].sort();
  const theta = new Map<string, number>(joueurs.map((j) => [j, 0]));
  const t = (j: string) => (j === REFERENCE ? 0 : theta.get(j) ?? 0);
  for (let it = 0; it < BT.iterations; it++) {
    let delta = 0;
    for (const i of joueurs) {
      const ti = theta.get(i)!;
      let g = -ti / (tau * tau), h = 1 / (tau * tau);
      for (const { o, s, w } of adj.get(i)!) { const p = sig(ti - t(o)); g += w * (s - p); h += w * p * (1 - p); }
      const nv = ti + g / h;
      delta = Math.max(delta, Math.abs(nv - ti));
      theta.set(i, nv);
    }
    if (delta < 1e-9) break;
  }
  for (const i of joueurs) {
    const ti = theta.get(i)!;
    let h = 1 / (tau * tau);
    for (const { o, w } of adj.get(i)!) { const p = sig(ti - t(o)); h += w * p * (1 - p); }
    const f = stat.get(i)!;
    f.theta = Math.round(ti * 10000) / 10000;
    f.sigma = Math.round((1 / Math.sqrt(h)) * 10000) / 10000;
  }
  return stat;
}

export const elo = (theta: number) => Math.round(BT.eloBase + BT.eloEchelle * theta);
export const eloPlusMoins = (sigma: number) => Math.round(BT.eloEchelle * sigma);

/** Élément classé d'un côté (affichage) */
export const elementDuCote = (d: Duel, c: 'a' | 'b') => (c === 'a' ? d.aIngredients.element ?? d.aCle : d.bIngredients.element ?? d.bCle);

/** Famille de classement : photos, illustrations, ou dimension des compositions (« polices », « couleurs »…) ; libre = compositions */
export function familleClassement(d: Pick<Duel, 'type' | 'dimension'>): string {
  if (d.type === 'photo') return 'photo';
  // Variantes d'une illustration de base : classement à part (contrastes, couleurs, styles du même dessin)
  if (d.type === 'illustration' && d.dimension?.startsWith('variante:')) return d.dimension;
  // Images × fonds : classement des combinaisons image × fond (ou traitement)
  if (d.dimension?.startsWith('image:')) return d.dimension;
  if (d.type === 'illustration') return 'illustration';
  return d.dimension ?? 'libre';
}

/** Sujet n° 1 du scénario (contexte du classement) ; « cabinet » sans sujet */
export const sujetDuDuel = (d: Pick<Duel, 'scenario'>) => d.scenario.sujets[0] ?? 'cabinet';

export type LigneClassement = ForceBT & { cle: string; elo: number; plusMoins: number };

/** Classement des éléments (un joueur par côté) d'une liste de duels */
export function classementDuels(duels: readonly Duel[]): LigneClassement[] {
  const matchs: MatchBT[] = [];
  const compte = new Map<string, { n: number; victoires: number; defaites: number; egalites: number; mauvais: number }>();
  const cpt = (k: string) => compte.get(k) ?? compte.set(k, { n: 0, victoires: 0, defaites: 0, egalites: 0, mauvais: 0 }).get(k)!;
  for (const d of duels) {
    const a = elementDuCote(d, 'a'), b = elementDuCote(d, 'b');
    if (a === b) continue;
    const w = poidsAppareilDuel(d.appareil);
    const ca = cpt(a), cb = cpt(b);
    ca.n++; cb.n++;
    if (d.resultat === 'mauvais') {
      matchs.push({ a, b: REFERENCE, s: 0, w: w * APPRENTISSAGE_DUELS.penaliteMauvais }, { a: b, b: REFERENCE, s: 0, w: w * APPRENTISSAGE_DUELS.penaliteMauvais });
      ca.mauvais++; cb.mauvais++;
      continue;
    }
    const s = d.resultat === 'a' ? 1 : d.resultat === 'b' ? 0 : 0.5;
    matchs.push({ a, b, s, w });
    if (s === 1) { ca.victoires++; cb.defaites++; } else if (s === 0) { cb.victoires++; ca.defaites++; } else { ca.egalites++; cb.egalites++; }
  }
  const forces = ajusterBT(matchs);
  return [...forces.entries()]
    .map(([cle, f]) => ({ ...f, ...compte.get(cle)!, cle, elo: elo(f.theta), plusMoins: eloPlusMoins(f.sigma) }))
    .sort((x, y) => y.theta - x.theta || x.cle.localeCompare(y.cle));
}

export type ClassementContexte = { contexte: string; type: TypeDuel; famille: string; sujet: string; titre: string; duels: number; lignes: LigneClassement[] };

const NOMS_FAMILLES: Record<string, string> = {
  'variante:contraste': 'contrastes d’illustration', 'variante:couleur': 'couleurs d’illustration', 'variante:style': 'styles d’une même illustration',
  photo: 'photos', illustration: 'illustrations et héros', couleurs: 'palettes', polices: 'paires de polices', effets: 'effets', typo: 'typographies',
  'typo:echelle': 'échelles de titres', 'typo:casse': 'casses de titres', 'typo:graisse': 'graisses de titres', 'typo:interlettrage': 'interlettrages de titres',
  'details:densite': 'densités (espacements)', 'details:ombres': 'ombres', 'details:coins': 'arrondis', 'details:boutons': 'boutons', 'details:cadre': 'cadres d’images',
  'police-couleurs': 'combinaisons police × palette', surfaces: 'répartitions des couleurs et des fonds', 'image:fond': 'images × fonds', 'image:traitement': 'traitements d’image sur fond',
  details: 'détails', menu: 'menus', visuels: 'styles d’illustration', traitement: 'traitements photo', photos: 'jeux de photos', libre: 'compositions',
};
/** « polices », « présentations des horaires »… */
export function nomFamille(f: string, nomsSections: Readonly<Record<string, string>> = {}): string {
  if (/^page(-libre)?:/.test(f)) { const p = pageDuel(pageDeDimension(f)); return `${f.startsWith('page-libre:') ? 'recettes vues sur la page' : 'structures de la page'} « ${p?.nom ?? f} »`; }
  if (f.startsWith('composant:')) { const s = f.slice(10); return `présentations « ${(nomsSections[s] ?? s).toLowerCase()} »`; }
  if (f.startsWith('paire:')) return `combinaisons « ${f.slice(6).replace(':', ' × ').replace(/(^|\s)v_/g, '$1').replace(/_/g, ' ')} »`;
  return NOMS_FAMILLES[f] ?? f;
}

/** Classements par contexte (famille × sujet n° 1), du plus joué au moins joué */
export function classementsParContexte(duels: readonly Duel[], opts: { libelleSujet?: (id: string) => string; nomsSections?: Readonly<Record<string, string>> } = {}): ClassementContexte[] {
  const groupes = new Map<string, Duel[]>();
  for (const d of duels) {
    const k = `${familleClassement(d)}|${sujetDuDuel(d)}`;
    (groupes.get(k) ?? groupes.set(k, []).get(k)!).push(d);
  }
  const lib = opts.libelleSujet ?? ((s: string) => s);
  return [...groupes.entries()].map(([contexte, l]) => {
    const [famille, sujet] = contexte.split('|');
    const nom = nomFamille(famille, opts.nomsSections);
    return { contexte, type: l[0].type, famille, sujet, titre: `Meilleures ${nom} — ${sujet === 'cabinet' ? 'cabinet (sans sujet)' : lib(sujet)}`, duels: l.length, lignes: classementDuels(l) };
  }).sort((a, b) => b.duels - a.duels || a.contexte.localeCompare(b.contexte));
}

// ---------------------------------------------------------------------------------------------------------------
// Apprentissage (poids du générateur)
// ---------------------------------------------------------------------------------------------------------------

export const APPRENTISSAGE_DUELS = { facteur: 0.5, plafond: 0.5, poidsLibre: 0.5, penaliteMauvais: 0.35, plafondCumule: 1 } as const;

/** Poids de l'appareil regardé (même règle que les notes : mobile d'abord) */
export const poidsAppareilDuel = (a: unknown) => (a === 'mobile' ? 1.25 : 1);

/** Clés qui diffèrent entre A et B, par espace (atelier, assets) */
export function clesDifferentes(d: Pick<Duel, 'aIngredients' | 'bIngredients' | 'aCle' | 'bCle' | 'type'>): { atelier: [string[], string[]]; assets: [string[], string[]] } {
  const ens = (i: IngredientsDuel, k: 'atelier' | 'assets', cle: string) => new Set(i[k]?.length ? i[k] : k === 'assets' && (d.type === 'photo' || d.type === 'illustration') ? [cle] : []);
  const r = { atelier: [[], []] as [string[], string[]], assets: [[], []] as [string[], string[]] };
  for (const k of ['atelier', 'assets'] as const) {
    const a = ens(d.aIngredients, k, d.aCle), b = ens(d.bIngredients, k, d.bCle);
    r[k] = [[...a].filter((x) => !b.has(x)).sort(), [...b].filter((x) => !a.has(x)).sort()];
  }
  return r;
}

/**
 * Renforts des poids par les duels : Δduel(k) = clamp(0,5 · θk, ±0,5) (θ : Bradley-Terry global des clés qui diffèrent). Mêmes
 * formes que renfortsPoids (recettes.ts) : { atelier, assets } en étoiles, effets nuls absents, déterministe.
 */
export function renfortsDuels(duels: readonly Duel[]): { atelier: Record<string, number>; assets: Record<string, number> } {
  const res = { atelier: {} as Record<string, number>, assets: {} as Record<string, number> };
  for (const esp of ['atelier', 'assets'] as const) {
    const matchs: MatchBT[] = [];
    for (const d of duels) {
      const [A, B] = clesDifferentes(d)[esp];
      if (!A.length && !B.length) continue;
      const w0 = poidsAppareilDuel(d.appareil) * (d.dimension ? 1 : APPRENTISSAGE_DUELS.poidsLibre);
      if (d.resultat === 'mauvais') {
        for (const cote of [A, B]) for (const k of cote) matchs.push({ a: k, b: REFERENCE, s: 0, w: (w0 * APPRENTISSAGE_DUELS.penaliteMauvais) / cote.length });
        continue;
      }
      if (!A.length || !B.length) continue;
      const s = d.resultat === 'a' ? 1 : d.resultat === 'b' ? 0 : 0.5;
      const w = w0 / (A.length * B.length);
      for (const ka of A) for (const kb of B) matchs.push({ a: ka, b: kb, s, w });
    }
    const f = ajusterBT(matchs);
    for (const k of [...f.keys()].sort()) {
      const v = Math.round(Math.max(-APPRENTISSAGE_DUELS.plafond, Math.min(APPRENTISSAGE_DUELS.plafond, APPRENTISSAGE_DUELS.facteur * f.get(k)!.theta)) * 1000) / 1000;
      if (v) res[esp][k] = v;
    }
  }
  return res;
}

/** Cumul de deux renforts (recettes + duels), plafonné à ±1 étoile par clé */
export function fusionnerRenforts(
  a: { atelier: Record<string, number>; assets: Record<string, number> },
  b: { atelier: Record<string, number>; assets: Record<string, number> },
  plafond: number = APPRENTISSAGE_DUELS.plafondCumule,
): { atelier: Record<string, number>; assets: Record<string, number> } {
  const f = (x: Record<string, number>, y: Record<string, number>) => {
    const r: Record<string, number> = {};
    for (const k of [...new Set([...Object.keys(x), ...Object.keys(y)])].sort()) {
      const v = Math.round(Math.max(-plafond, Math.min(plafond, (x[k] ?? 0) + (y[k] ?? 0))) * 1000) / 1000;
      if (v) r[k] = v;
    }
    return r;
  };
  return { atelier: f(a.atelier, b.atelier), assets: f(a.assets, b.assets) };
}

// ---------------------------------------------------------------------------------------------------------------
// Génération des paires
// ---------------------------------------------------------------------------------------------------------------

/** Photo ou illustration candidate : `groupe` = même dessin (dessin:verrue, heros:sport), `variante` = style (relevé, trait fin…) */
export type CandidatElement = { cle: string; sujets: readonly string[]; groupe: string; variante: string; exclu?: boolean };

export type PaireElements = { a: CandidatElement; b: CandidatElement; sujet: string; dimension: string | null };

/** Groupe et variante d'une clé d'illustration : `dessin:verrue:releve` → [dessin:verrue, releve] ; `ligne:mycose` → [ligne:mycose, ligne] */
export function groupeEtVariante(cle: string): { groupe: string; variante: string } {
  const p = cle.split(':');
  if (p[0] === 'ligne') return { groupe: `${p[0]}:${p[1]}`, variante: 'ligne' };
  if (p[0] === 'photo') return { groupe: 'photo', variante: 'photo' };
  if (p.length >= 3) return { groupe: `${p[0]}:${p[1]}`, variante: p.slice(2).join(':') };
  return { groupe: cle, variante: p[0] };
}

const forcesDuContexte = (historique: readonly Duel[], filtre: (d: Duel) => boolean) =>
  new Map(classementDuels(historique.filter(filtre)).map((l) => [l.cle, l]));

/**
 * Paire de photos ou d'illustrations du même sujet. Photos : seule la photo change (dimension « photo »). Illustrations : même
 * dessin en deux styles (« style ») ou deux dessins du même style (« version ») ; `partLibre` du temps, deux illustrations
 * quelconques du sujet (null). Priorité : jamais jouée, incertaine (σ), proche (|Δθ|), sujet peu joué.
 */
export function genererPaireElements(type: 'photo' | 'illustration', candidats: readonly CandidatElement[], historique: readonly Duel[], opts: { graine: number; sujet?: string | null; partLibre?: number }): PaireElements | null {
  const r = hasard(opts.graine);
  const duelsType = historique.filter((d) => d.type === type);
  const dejaVus = new Set(duelsType.map((d) => cleDePaire(d.aCle, d.bCle)));
  const pool = candidats.filter((c) => !c.exclu);
  const sujets = [...new Set(pool.flatMap((c) => c.sujets))].filter((s) => (!opts.sujet || s === opts.sujet) && pool.filter((c) => c.sujets.includes(s)).length >= 2).sort();
  if (!sujets.length) return null;
  const parSujet = new Map(sujets.map((s) => [s, duelsType.filter((d) => sujetDuDuel(d) === s).length]));
  // Ordre de visite des sujets : tirage pondéré vers les sujets peu joués
  const ordre = [...sujets].map((s) => ({ s, k: -Math.log(Math.max(r(), 1e-9)) * (1 + parSujet.get(s)!) })).sort((a, b) => a.k - b.k).map((x) => x.s);
  const libre = type === 'illustration' && r() < (opts.partLibre ?? 0.15);
  for (const sujet of ordre) {
    const l = pool.filter((c) => c.sujets.includes(sujet)).sort((a, b) => a.cle.localeCompare(b.cle));
    const forces = forcesDuContexte(historique, (d) => d.type === type && sujetDuDuel(d) === sujet);
    let meilleur: { a: CandidatElement; b: CandidatElement; dim: string | null; score: number } | null = null;
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const a = l[i], b = l[j];
      let dim: string | null;
      if (type === 'photo') dim = 'photo';
      else if (a.groupe === b.groupe && a.variante !== b.variante) dim = 'style';
      else if (a.variante === b.variante && a.groupe !== b.groupe && a.groupe.split(':')[0] === b.groupe.split(':')[0]) dim = 'version';
      else dim = null;
      if (type === 'illustration' && (dim === null) !== libre) continue;
      const fa = forces.get(a.cle), fb = forces.get(b.cle);
      const score = (fa?.sigma ?? BT.tau) + (fb?.sigma ?? BT.tau) - 0.3 * Math.abs((fa?.theta ?? 0) - (fb?.theta ?? 0)) + 0.6 * r() - (dejaVus.has(cleDePaire(a.cle, b.cle)) ? 100 : 0);
      if (!meilleur || score > meilleur.score) meilleur = { a, b, dim, score };
    }
    if (meilleur && meilleur.score > -50) return r() < 0.5 ? { a: meilleur.a, b: meilleur.b, sujet, dimension: meilleur.dim } : { a: meilleur.b, b: meilleur.a, sujet, dimension: meilleur.dim };
  }
  // Toutes les paires ont déjà été jouées : on en repose une (la plus incertaine), plutôt que rien ; sinon le mode libre
  if (type === 'illustration' && !libre) return genererPaireElements(type, candidats, historique, { ...opts, partLibre: 1 });
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Variantes d'une illustration de base (contraste, couleur, style) : une seule dimension diffère
// ---------------------------------------------------------------------------------------------------------------

/** Une variante candidate : clé (de rendu ou d'inventaire), sa base, et la valeur de chaque dimension */
export type CandidatVariante = {
  cle: string; base: string; valeurs: Readonly<Partial<Record<DimensionVariante, string>>>;
  /** Variante de RENDU (`<clé>@contraste=…`, `<clé>@couleur=…`) : comparée seulement à d'autres variantes de rendu */
  rendu?: boolean;
  /** Axe d'une variante de rendu (contraste ou couleur) : deux variantes de rendu ne se comparent que sur le même axe */
  axe?: 'contraste' | 'couleur';
};

/** Dimension (unique) qui distingue deux variantes de la MÊME base ; null si base différente, aucune ou plusieurs dimensions */
export function dimensionUniqueVariantes(a: CandidatVariante, b: CandidatVariante): DimensionVariante | null {
  if (a.base !== b.base || a.cle === b.cle || Boolean(a.rendu) !== Boolean(b.rendu) || a.axe !== b.axe) return null;
  const d = DIMENSIONS_VARIANTE.filter((x) => (a.valeurs[x] ?? '') !== (b.valeurs[x] ?? ''));
  if (d.length !== 1) return null;
  // Style : variantes d'inventaire (le renfort va à la vraie clé) ; contraste / couleur : variantes de rendu seulement
  return (d[0] === 'style') === !a.rendu ? d[0] : null;
}

/**
 * Candidats d'une base : chaque variante d'inventaire (dimension « style », clé réelle) et, pour l'illustration « basique »,
 * des variantes de RENDU (`<clé>@contraste=normal|fort|doux`, `<clé>@couleur=<gamme>`, aucune source modifiée) comparées
 * entre elles : le renfort d'un duel de contraste ne touche jamais la clé réelle du dessin.
 */
export function candidatsVariantes(base: string, cles: readonly string[], opts: { contrastes?: boolean; gammes?: readonly string[]; gammeDeBase?: string } = {}): CandidatVariante[] {
  const l = [...cles].sort((a, b) => rangVariante(a) - rangVariante(b) || a.localeCompare(b));
  if (!l.length) return [];
  const g0 = opts.gammeDeBase ?? 'origine';
  const res: CandidatVariante[] = l.map((cle) => ({ cle, base, valeurs: { style: valeurVariante(cle) ?? cle, contraste: 'normal', couleur: g0 } }));
  const rep = l[0], style = valeurVariante(rep) ?? rep;
  if (opts.contrastes !== false) for (const c of CONTRASTES) res.push({ cle: cleVarianteRendu(rep, 'contraste', c), base, valeurs: { style, contraste: c, couleur: g0 }, rendu: true, axe: 'contraste' });
  if (opts.gammes?.length) {
    // Couleurs : variantes de rendu au contraste d'origine, la gamme de base comprise (sous sa clé couleur=…)
    for (const g of [...new Set([g0, ...opts.gammes])]) res.push({ cle: cleVarianteRendu(rep, 'couleur', g), base, valeurs: { style, contraste: 'normal', couleur: g }, rendu: true, axe: 'couleur' });
  }
  return res;
}

export type PaireVariantes = { a: CandidatVariante; b: CandidatVariante; dimension: string };

/**
 * Duel de variantes : même base, UNE dimension différente (`variante:contraste` par défaut si demandé). Priorité : paire jamais
 * jouée, dimension demandée, variantes sans signal ; ordre A / B tiré au hasard. null s'il n'y a pas deux variantes comparables.
 */
export function genererDuelVariantes(candidats: readonly CandidatVariante[], historique: readonly Pick<Duel, 'aCle' | 'bCle'>[], opts: { graine: number; dimension?: DimensionVariante | null }): PaireVariantes | null {
  const r = hasard(opts.graine);
  const joues = new Set(historique.map((d) => cleDePaire(d.aCle, d.bCle)));
  const vus = new Set(historique.flatMap((d) => [d.aCle, d.bCle]));
  let meilleur: { a: CandidatVariante; b: CandidatVariante; dim: DimensionVariante; score: number } | null = null;
  for (let i = 0; i < candidats.length; i++) for (let j = i + 1; j < candidats.length; j++) {
    const a = candidats[i], b = candidats[j];
    const dim = dimensionUniqueVariantes(a, b);
    if (!dim) continue;
    if (opts.dimension && dim !== opts.dimension) continue;
    const score = (joues.has(cleDePaire(a.cle, b.cle)) ? -100 : 0) + (vus.has(a.cle) ? 0 : 1) + (vus.has(b.cle) ? 0 : 1) + 0.5 * r();
    if (!meilleur || score > meilleur.score) meilleur = { a, b, dim, score };
  }
  if (!meilleur) return null;
  const dimension = dimensionDuelVariante(meilleur.dim);
  return r() < 0.5 ? { a: meilleur.a, b: meilleur.b, dimension } : { a: meilleur.b, b: meilleur.a, dimension };
}

/**
 * Préférence globale d'une dimension de rendu (tous dessins confondus) : Bradley-Terry sur les VALEURS (« fort », « doux »,
 * « normal ») des duels `variante:<dimension>` ; du plus au moins préféré.
 */
export function preferencesVariantes(duels: readonly Duel[], dimension: 'contraste' | 'couleur'): LigneClassement[] {
  const valeur = (k: string) => { const v = lireVarianteRendu(k); return v && v.dimension === dimension ? v.valeur : null; };
  const l = duels.filter((d) => d.type === 'illustration' && d.dimension === dimensionDuelVariante(dimension))
    .map((d) => ({ ...d, aIngredients: { element: valeur(d.aCle) ?? d.aCle }, bIngredients: { element: valeur(d.bCle) ?? d.bCle } }));
  return classementDuels(l);
}

/** Dimensions des duels de compositions, par type */
export const DIMENSIONS_DUEL: Readonly<Record<'theme' | 'typo' | 'traitement', readonly string[]>> = {
  theme: ['couleurs', 'polices', 'effets', 'visuels', 'typo', 'details', 'menu'],
  typo: ['polices', 'typo'],
  traitement: ['traitement'],
};

export type DuelComposition<C> = { a: C; b: C; dimension: string | null; champs: string[] };

/**
 * Deux compositions pour le même scénario. La plupart du temps, `base` et une variante qui ne diffère que par UNE dimension
 * (essais successifs de `varier`, contrôlés par uneSeuleDimension) ; `partLibre` du temps (≈ 15 %), deux recettes bien classées
 * du scénario (`libres`). Dimensions visitées des moins jouées aux plus jouées (pour ce type et ce sujet) ; paires déjà jouées
 * évitées ; ordre A / B tiré au hasard (pas de biais de position).
 */
export function genererDuelComposition<C extends object>(p: {
  type: TypeDuel; graine: number; base: C; sujet: string; dimensions: readonly string[];
  varier: (x: C, dimension: string, graine: number) => C;
  historique: readonly Duel[]; libres?: readonly C[]; partLibre?: number; essais?: number;
}): DuelComposition<C> | null {
  const r = hasard(p.graine);
  const duels = p.historique.filter((d) => d.type === p.type && sujetDuDuel(d) === p.sujet);
  const dejaVus = new Set(p.historique.map((d) => cleDePaire(d.aCle, d.bCle)));
  const melanger = (x: DuelComposition<C>): DuelComposition<C> => (r() < 0.5 ? x : { ...x, a: x.b, b: x.a });
  const libres = (p.libres ?? []).filter((x, i, l) => l.findIndex((y) => cleComposition(y) === cleComposition(x)) === i);
  if (libres.length >= 2 && r() < (p.partLibre ?? 0.15)) {
    const paires: [C, C][] = [];
    for (let i = 0; i < libres.length; i++) for (let j = i + 1; j < libres.length; j++) if (!dejaVus.has(cleDePaire(cleComposition(libres[i]), cleComposition(libres[j])))) paires.push([libres[i], libres[j]]);
    if (paires.length) { const [a, b] = paires[Math.floor(r() * paires.length)]; return melanger({ a, b, dimension: null, champs: champsDifferents(a, b) }); }
  }
  const joues = (dim: string) => duels.filter((d) => d.dimension === dim).length;
  const ordre = [...p.dimensions].map((d) => ({ d, k: joues(d) + 1.5 * r() })).sort((a, b) => a.k - b.k).map((x) => x.d);
  const cleBase = cleComposition(p.base);
  for (const dim of ordre) {
    for (let t = 0; t < (p.essais ?? 8); t++) {
      const b = p.varier(p.base, dim, (Math.imul(p.graine, 31) + 7 * t + 1) >>> 0);
      if (!uneSeuleDimension(p.base, b, dim) || dejaVus.has(cleDePaire(cleBase, cleComposition(b)))) continue;
      return melanger({ a: p.base, b, dimension: dim, champs: champsDifferents(p.base, b) });
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Juge (prédiction du gagnant) et accord
// ---------------------------------------------------------------------------------------------------------------

/** Clé d'ingrédient de l'atelier → clé d'asset que le juge a pu prédire (police=x → typo:police:x, effets=x → effets:x…) */
export function cleJugeDe(k: string): string | null {
  if (/^[a-z]+:[^\s]+$/.test(k) && !k.includes('=')) return k;
  if (k.includes('&')) return null;
  const m = /^([a-z0-9]+)=(.+)$/.exec(k);
  if (!m) return null;
  const [, g, v] = m;
  if (g === 'police') return `typo:police:${v}`;
  if (g === 'effets') return `effets:${v}`;
  if (g === 'gamme') return `gamme:${v}`;
  if (g === 'typo' || g === 'details' || g === 'menu') return `${g}:${v.replace('=', ':')}`;
  if (g === 'variante') return `composant:${v}`;
  return null;
}

/** Clés « juge » d'un côté : celles qui diffèrent de l'autre côté, traduites en clés d'assets (au plus 8) */
export function clesJugeDuel(d: Pick<Duel, 'aIngredients' | 'bIngredients' | 'aCle' | 'bCle' | 'type'>): [string[], string[]] {
  const diff = clesDifferentes(d);
  const cote = (i: 0 | 1) => [...new Set([...diff.assets[i], ...diff.atelier[i].map(cleJugeDe).filter((x): x is string => Boolean(x))])].slice(0, 8);
  return [cote(0), cote(1)];
}

type PredLegere = { cle: string; note: number; le: string };

/**
 * Gagnant prédit : moyenne des notes prédites (prédiction la plus récente par clé) des éléments qui diffèrent ; écart < 0,5
 * étoile → égalité ; null si un côté n'a aucune prédiction.
 */
export function predireDuel(clesA: readonly string[], clesB: readonly string[], predictions: Readonly<Record<string, readonly PredLegere[]>>): 'a' | 'b' | 'egalite' | null {
  const note = (k: string) => { const l = predictions[k]; if (!l?.length) return null; return [...l].sort((x, y) => (x.le < y.le ? 1 : -1))[0].note; };
  const moy = (l: readonly string[]) => { const n = l.map(note).filter((x): x is number => x !== null); return n.length ? n.reduce((s, x) => s + x, 0) / n.length : null; };
  const a = moy(clesA), b = moy(clesB);
  if (a === null || b === null) return null;
  return Math.abs(a - b) < 0.5 ? 'egalite' : a > b ? 'a' : 'b';
}

export type AccordJuge = { n: number; accords: number; taux: number | null; parType: Record<string, { n: number; accords: number }> };

/** Accord du juge avec Paul (duels avec prédiction, hors « les deux sont mauvais ») */
export function accordJuge(duels: readonly Duel[]): AccordJuge {
  const l = duels.filter((d) => d.prediction && d.resultat !== 'mauvais');
  const parType: AccordJuge['parType'] = {};
  let accords = 0;
  for (const d of l) {
    const ok = d.prediction === d.resultat;
    if (ok) accords++;
    const t = (parType[d.type] ??= { n: 0, accords: 0 });
    t.n++; if (ok) t.accords++;
  }
  return { n: l.length, accords, taux: l.length ? Math.round((100 * accords) / l.length) : null, parType };
}

// ---------------------------------------------------------------------------------------------------------------
// Session (compteur et série) et synthèse
// ---------------------------------------------------------------------------------------------------------------

/** Série : jours consécutifs (AAAA-MM-JJ) avec au moins un duel, en remontant depuis le plus récent */
export function serieDuels(jours: readonly string[]): number {
  const j = [...new Set(jours.map((x) => x.slice(0, 10)))].sort().reverse();
  if (!j.length) return 0;
  let n = 1;
  for (let i = 1; i < j.length; i++) {
    const prec = new Date(`${j[i - 1]}T12:00:00Z`).getTime(), cur = new Date(`${j[i]}T12:00:00Z`).getTime();
    if (Math.round((prec - cur) / 86400000) === 1) n++; else break;
  }
  return n;
}

const pct = (x: number, n: number) => (n ? `${Math.round((100 * x) / n)} %` : '—');

/** Section « Duels : classements par sujet » de retours/SYNTHESE.md */
export function markdownDuels(duels: readonly Duel[], opts: { libelleSujet?: (id: string) => string; titres?: Readonly<Record<string, string>>; nomsSections?: Readonly<Record<string, string>>; max?: number; titre?: string } = {}): string {
  const l = [opts.titre ?? '## Duels : classements par sujet', ''];
  if (!duels.length) { l.push('Aucun duel pour l’instant (/admin/retours/duel).'); return l.join('\n'); }
  const res = { a: 0, b: 0, egalite: 0, mauvais: 0 } as Record<ResultatDuel, number>;
  for (const d of duels) res[d.resultat]++;
  const unes = duels.filter((d) => d.dimension).length;
  l.push(`${duels.length} duel(s) : ${unes} à une seule dimension, ${duels.length - unes} libre(s) ; A ${res.a}, B ${res.b}, égalité ${res.egalite}, les deux mauvais ${res.mauvais}.`);
  const acc = accordJuge(duels);
  if (acc.n) l.push(`Juge : d’accord avec Paul sur ${acc.accords}/${acc.n} duels (${pct(acc.accords, acc.n)}) — ${Object.entries(acc.parType).map(([t, x]) => `${LIBELLES_TYPES_DUEL[t as TypeDuel]?.nom ?? t} ${x.accords}/${x.n}`).join(', ')}.`);
  l.push('Classement Bradley-Terry (Elo ± incertitude) ; « n » = duels joués. Lecture : packages/core/src/duels.ts.', '');
  const titre = (k: string) => opts.titres?.[k] ? `${opts.titres[k]} (\`${k}\`)` : `\`${k}\``;
  for (const c of classementsParContexte(duels, opts)) {
    l.push(`### ${c.titre} — ${c.duels} duel(s)`, '');
    for (const x of c.lignes.slice(0, opts.max ?? 8)) l.push(`- ${titre(x.cle)} : ${x.elo} ± ${x.plusMoins} (n ${x.n} : ${x.victoires} V, ${x.defaites} D, ${x.egalites} N${x.mauvais ? `, ${x.mauvais} « mauvais »` : ''})`);
    l.push('');
  }
  const ren = renfortsDuels(duels);
  const forts = [...Object.entries(ren.atelier), ...Object.entries(ren.assets)].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0])).slice(0, 12);
  if (forts.length) {
    l.push('Effet sur le générateur (renfortsDuels, ±0,5 ★ au plus, cumulé aux notes dans la limite de ±1 ★) :');
    for (const [k, v] of forts) l.push(`- \`${k}\` ${v > 0 ? '+' : ''}${String(v).replace('.', ',')} ★`);
  }
  return l.join('\n').replace(/\n+$/, '');
}

/** Forme exportée (retours/duels.json) : ni auteur, dates au jour, composition gardée pour rejouer le duel */
export const duelPourExport = (d: Duel & { remarque?: string | null }) => ({
  type: d.type, scenario: d.scenario, a: d.aCle, b: d.bCle, dimension: d.dimension, resultat: d.resultat, etiquettes: d.etiquettes ?? [],
  remarque: d.remarque ?? null, appareil: d.appareil ?? 'les-deux', prediction: d.prediction ?? null,
  aElement: d.aIngredients.element ?? null, bElement: d.bIngredients.element ?? null,
  aIngredients: d.aIngredients, bIngredients: d.bIngredients, jour: d.le ? d.le.slice(0, 10) : null,
});
