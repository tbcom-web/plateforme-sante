// Moteur d'HARMONIE graphique du studio de recettes (demande de Paul du 2026-10-07 : « même en cliquant sur “au hasard”, on doit
// arriver à une cohésion graphique grâce à des règles qui lient les polices, la taille, les éléments et la structure de manière
// harmonieuse. On fait du hasard, mais à travers des règles de design graphique établies. »). Documentation : docs/harmonie-graphique.md.
//
// 1. FAMILLES_STYLE DE STYLE (archétypes) : huit directions nettes (Éditorial chic, Technique net, Doux et rond, Graphique pop, Classique
//    sobre, Nature chaleureuse, Minimal clinique, Magazine affirmé), chacune avec un PROFIL sur six attributs (contraste, rondeur,
//    densité, énergie, température, formalité ; −1 à 1).
// 2. ÉTIQUETTES : chaque ingrédient (paire de polices, échelle, casse, graisse…, jeu de détails et chacun de ses éléments, forme des
//    cartes, menus, premier écran et transitions, style d'illustration — expérimentaux compris —, traitement photo, effets, structure,
//    gamme, présentations des pages) porte un profil partiel, les familles où il est PRÉFÉRÉ et celles où il est EXCLU. Sinon, la
//    distance de son profil à celui de la famille décide (admis / exclu). Un ingrédient inconnu (nouveau) est NEUTRE : admis partout.
// 3. RÈGLES DURES (jamais, quel que soit le hasard) : `violationsDures` ; RÈGLES SOUPLES (scores 0-1, accords recommandés) :
//    `scoreHarmonie` → { score 0-100, violations, conseils, famille dominante }. Chaque violation et chaque conseil propose une
//    correction (« Corriger » du studio).
// 4. TIRAGE HARMONIEUX : « Tout changer » choisit d'abord une famille (sujet n° 1, notes apprises, compatibilité avec ce qui est
//    verrouillé), puis tire chaque dimension non verrouillée parmi les valeurs compatibles ; un dé seul ne propose que des valeurs
//    compatibles avec le reste. Les garde-fous du core (recettes.ts : AA, diabète, posture, structures et styles permis) passent
//    TOUJOURS avant : ils sont fournis par `OutilsTirage` (tirage brut, réparation, valeurs permises). « Hors règles » : ctx.horsRegles.
// 5. APPRENTISSAGE : les notes (atelier, recettes) ajustent les poids SOUPLES par famille et par ingrédient (lissage, plafond ±0,75 ★) ;
//    jamais les règles dures.
// Module pur, sans dépendance d'exécution vers recettes.ts (recettes.ts l'appelle ; aucune boucle d'imports).

import { GAMMES, gamme as gammeParId } from './gammes';
import { contraste, rvb } from './couleurs';
import { PAIRES_POLICES, VARIANTES_SECTIONS } from './modeles';
import { JEUX_EFFETS } from './effets';
import { FORMES_CARTES } from './formes';
import { PRESENTATIONS_PORTRAITS } from './portraits-variantes';

// ---------------------------------------------------------------------------------------------------------------
// Profils et familles
// ---------------------------------------------------------------------------------------------------------------

/** Attributs d'un profil (−1 à 1) : contraste, rondeur, densité, énergie (mouvement), température, formalité */
export const ATTRIBUTS_HARMONIE = { c: 'Contraste', r: 'Rondeur', d: 'Densité', e: 'Énergie', t: 'Température', f: 'Formalité' } as const;
export type AttributHarmonie = keyof typeof ATTRIBUTS_HARMONIE;
export type ProfilHarmonie = Partial<Record<AttributHarmonie, number>>;

export const FAMILLES_STYLE = [
  {
    id: 'editorial-chic', nom: 'Éditorial chic',
    description: 'Serifs de revue, grands titres fins, beaucoup d’air, filets et coins nets, aucune ombre ; mouvement lent.',
    profil: { c: 0.9, r: -0.4, d: -0.9, e: -0.2, t: 0.1, f: 1 },
  },
  {
    id: 'technique-net', nom: 'Technique net',
    description: 'Grotesques et mono, relevé de pression, grille fine, coins carrés, compact ; couleurs froides.',
    profil: { c: 0.7, r: -0.9, d: 0.6, e: 0.3, t: -0.7, f: 0.4 },
  },
  {
    id: 'doux-rond', nom: 'Doux et rond',
    description: 'Polices rondes, coins très arrondis, ombres douces, ondulations, illustrations douces ; rassurant.',
    profil: { c: -0.4, r: 1, d: 0, e: -0.1, t: 0.4, f: -0.6 },
  },
  {
    id: 'graphique-pop', nom: 'Graphique pop',
    description: 'Géométriques franches, gammes vitaminées, surligneur, ombres portées, formes de la gamme ; énergique.',
    profil: { c: 0.9, r: 0.3, d: 0.2, e: 1, t: 0.4, f: -0.8 },
  },
  {
    id: 'classique-sobre', nom: 'Classique sobre',
    description: 'Lisible avant tout : sans-serif publique ou serif de lecture, coins arrondis, ombres douces, aucun effet.',
    profil: { c: 0.2, r: 0, d: 0, e: -0.5, t: 0.1, f: 0.6 },
  },
  {
    id: 'nature-chaleureuse', nom: 'Nature chaleureuse',
    description: 'Serifs humanistes, terres et sauges, photos chaudes, formes organiques ; calme et accueillant.',
    profil: { c: 0, r: 0.5, d: -0.2, e: -0.2, t: 1, f: 0 },
  },
  {
    id: 'minimal-clinique', nom: 'Minimal clinique',
    description: 'Une seule sans-serif neutre, beaucoup de blanc, gris-bleus, aucun ornement ni mouvement.',
    profil: { c: 0.2, r: -0.3, d: -0.6, e: -0.9, t: -0.5, f: 0.5 },
  },
  {
    id: 'magazine-affirme', nom: 'Magazine affirmé',
    description: 'Titres d’affiche ou condensés, double filet, grain, trait épais, cadres décalés ; contrasté.',
    profil: { c: 1, r: -0.6, d: 0.4, e: 0.6, t: 0.2, f: 0.3 },
  },
] as const satisfies readonly { id: string; nom: string; description: string; profil: Required<ProfilHarmonie> }[];
export type IdFamilleStyle = (typeof FAMILLES_STYLE)[number]['id'];
export const familleStyle = (id: unknown) => FAMILLES_STYLE.find((f) => f.id === id);
export const estFamilleStyle = (x: unknown): x is IdFamilleStyle => FAMILLES_STYLE.some((f) => f.id === x);

/**
 * Familles pondérées par sujet (sujet n° 1 ; le n° 2 nuance à 30 %) : sport → Technique net / Graphique pop ; diabète → Classique
 * sobre / Minimal clinique / Doux ; enfant → Doux et rond / Nature ; senior → Classique sobre ; ongles → Éditorial chic…
 */
export const FAMILLES_PAR_SUJET: Record<string, Partial<Record<IdFamilleStyle, number>>> = {
  sport: { 'technique-net': 3, 'graphique-pop': 3, 'magazine-affirme': 2, 'minimal-clinique': 1, 'classique-sobre': 1, 'editorial-chic': 0.7, 'nature-chaleureuse': 0.7, 'doux-rond': 0.5 },
  diabete: { 'classique-sobre': 3, 'minimal-clinique': 3, 'doux-rond': 2.5, 'nature-chaleureuse': 1.5, 'editorial-chic': 1, 'technique-net': 0.3, 'graphique-pop': 0.3, 'magazine-affirme': 0.3 },
  enfant: { 'doux-rond': 3, 'nature-chaleureuse': 3, 'graphique-pop': 1.5, 'classique-sobre': 1, 'minimal-clinique': 0.5, 'editorial-chic': 0.5, 'technique-net': 0.3, 'magazine-affirme': 0.3 },
  senior: { 'classique-sobre': 3, 'nature-chaleureuse': 2, 'doux-rond': 2, 'minimal-clinique': 1.5, 'editorial-chic': 1, 'technique-net': 0.3, 'graphique-pop': 0.2, 'magazine-affirme': 0.3 },
  ongles: { 'editorial-chic': 3, 'minimal-clinique': 2, 'nature-chaleureuse': 1.5, 'classique-sobre': 1.5, 'doux-rond': 1, 'graphique-pop': 1, 'magazine-affirme': 1, 'technique-net': 0.7 },
  semelles: { 'technique-net': 3, 'magazine-affirme': 1.5, 'minimal-clinique': 1.5, 'graphique-pop': 1.5, 'classique-sobre': 1, 'editorial-chic': 1, 'nature-chaleureuse': 1, 'doux-rond': 0.7 },
  pedicurie: { 'classique-sobre': 2.5, 'editorial-chic': 2, 'nature-chaleureuse': 2, 'minimal-clinique': 2, 'doux-rond': 1.5, 'technique-net': 1, 'graphique-pop': 0.7, 'magazine-affirme': 0.7 },
  cabinet: { 'classique-sobre': 2, 'technique-net': 2, 'editorial-chic': 1.5, 'minimal-clinique': 1.5, 'nature-chaleureuse': 1.5, 'doux-rond': 1.5, 'graphique-pop': 1.5, 'magazine-affirme': 1.5 },
};

// ---------------------------------------------------------------------------------------------------------------
// Compositions (forme structurelle : CompositionRecette de recettes.ts s'y range sans conversion)
// ---------------------------------------------------------------------------------------------------------------

export type CompositionHarmonie = {
  structure: string;
  gamme: string;
  couleur: string;
  police: string;
  /** `experimental` : registre expérimental (styles-experimentaux.ts) quand il sera branché sur les recettes */
  visuels: { style: string; experimental?: string | null; herosSujet?: string | null; animation?: unknown };
  photos?: readonly string[];
  sections: { ordre?: string; variantes: Partial<Record<string, string>> };
  effets: string;
  traitement?: { id: string; grain?: boolean } | null;
  typo?: Partial<Record<string, string>> | null;
  details?: Partial<Record<string, string>> | null;
  menu?: Partial<Record<string, string>> | null;
};

/** Contexte : sujets (le n° 1 d'abord), poids appris (atelier + renforts des recettes), option « Hors règles » */
export type ContexteHarmonie = {
  sujets: readonly string[];
  /**
   * `harmonie` : apprentissage des RECETTES COMPLÈTES notées (notation-recettes.ts, tuile « Recettes complètes ») : effets par
   * ingrédient, par PAIRE d'ingrédients et par famille, globaux et par sujet n° 1 ; fusionnés à `poidsHarmonie` (fusionPoidsHarmonie).
   */
  poids?: { effets: Record<string, number>; harmonie?: ApprisHarmonie | null } | null;
  /** « Hors règles (explorer) » : désactivé par défaut ; les garde-fous du core restent actifs */
  horsRegles?: boolean;
  /** Poids appris par famille et par ingrédient (apprendreHarmonie) ; sinon dérivés de `poids` */
  poidsHarmonie?: PoidsHarmonie | null;
};

// ---------------------------------------------------------------------------------------------------------------
// Dimensions d'harmonie (lecture, écriture, verrous du studio)
// ---------------------------------------------------------------------------------------------------------------

const AXES_TYPO_H = ['echelle', 'casse', 'graisse', 'interlettrage', 'accent', 'alignement', 'surtitre'] as const;
const ELEMENTS_DETAILS_H = ['coins', 'ombres', 'separateur', 'souligne', 'fond', 'boutons', 'densite', 'cadre', 'citation', 'badge'] as const;
const AXES_MENU_H = ['ordinateur', 'mobile', 'rdv'] as const;
/** Sections dont la présentation est étiquetée (VARIANTES_SECTIONS) */
const SECTIONS_H = Object.keys(VARIANTES_SECTIONS);

/**
 * Dimensions d'harmonie : `police`, `structure`, `style`, `experimental`, `gamme`, `effets`, `traitement`, `typo.<axe>`,
 * `details.jeu`, `details.<élément>`, `menu.<axe>`, `v.<section>` (présentation : v.accueil = premier écran, v.soins-forme = forme
 * des cartes, v.transition, v.sections = transitions entre sections…).
 */
export type DimensionHarmonie = string;
export const DIMENSIONS_HARMONIE: readonly DimensionHarmonie[] = [
  'structure', 'police', ...AXES_TYPO_H.map((a) => `typo.${a}`), 'details.jeu', ...ELEMENTS_DETAILS_H.map((e) => `details.${e}`),
  ...SECTIONS_H.map((s) => `v.${s}`), ...AXES_MENU_H.map((a) => `menu.${a}`), 'style', 'experimental', 'traitement', 'effets', 'gamme',
];

export const NOMS_DIMENSIONS_HARMONIE: Record<string, string> = {
  structure: 'Structure', police: 'Polices', style: 'Style des illustrations', experimental: 'Registre expérimental', gamme: 'Couleurs',
  effets: 'Effets', traitement: 'Traitement des photos',
  'typo.echelle': 'Échelle des titres', 'typo.casse': 'Casse', 'typo.graisse': 'Graisse', 'typo.interlettrage': 'Interlettrage', 'typo.accent': 'Mot d’accent',
  'typo.alignement': 'Alignement', 'typo.surtitre': 'Surtitres', 'details.jeu': 'Jeu de détails', 'details.coins': 'Coins', 'details.ombres': 'Ombres',
  'details.separateur': 'Séparateurs', 'details.souligne': 'Soulignés', 'details.fond': 'Motif de fond', 'details.boutons': 'Boutons', 'details.densite': 'Densité',
  'details.cadre': 'Cadres d’images', 'details.citation': 'Encadrés', 'details.badge': 'Étiquettes', 'menu.ordinateur': 'Menu (ordinateur)', 'menu.mobile': 'Menu (téléphone)',
  'menu.rdv': 'Bouton de rendez-vous', 'v.accueil': 'Premier écran', 'v.transition': 'Transition du diaporama', 'v.entete-anim': 'Animation d’en-tête', 'v.sections': 'Transitions entre sections',
  'v.soins-forme': 'Forme des cartes', 'v.sujets': 'Sujets', 'v.soins': 'Soins', 'v.praticiens': 'Équipe', 'v.portraits': 'Présentation des praticiens', 'v.infos': 'Plan d’accès', 'v.faq': 'Questions',
  'v.galerie': 'Galerie', 'v.horaires': 'Horaires', 'v.contact': 'Contact', 'v.pied': 'Pied de page', 'v.fiche': 'Fiche d’un soin', 'v.actualites': 'Actualités',
  'v.theme': 'Page sujet', 'v.article': 'Article',
};

/** Valeur d'une dimension dans une composition (undefined : absente, rendu du modèle) */
export function lireDimension(x: CompositionHarmonie, dim: DimensionHarmonie): string | undefined {
  if (dim === 'structure') return x.structure;
  if (dim === 'police') return x.police;
  if (dim === 'style') return x.visuels.style;
  if (dim === 'experimental') return x.visuels.experimental ?? undefined;
  if (dim === 'gamme') return x.gamme || undefined;
  if (dim === 'effets') return x.effets;
  if (dim === 'traitement') return x.traitement?.id;
  const i = dim.indexOf('.');
  const g = dim.slice(0, i), k = dim.slice(i + 1);
  if (g === 'typo') return x.typo?.[k] ?? undefined;
  if (g === 'details') return x.details?.[k] ?? undefined;
  if (g === 'menu') return x.menu?.[k] ?? undefined;
  if (g === 'v') return x.sections.variantes[k] ?? undefined;
  return undefined;
}

/** Composition avec une dimension posée (jeu de détails : ses éléments repartent de ceux du jeu, sauf `garder`) */
export function ecrireDimension<T extends CompositionHarmonie>(x: T, dim: DimensionHarmonie, v: string, garder: readonly string[] = []): T {
  if (dim === 'structure') return { ...x, structure: v };
  if (dim === 'police') return { ...x, police: v };
  if (dim === 'style') return { ...x, visuels: { ...x.visuels, style: v } };
  if (dim === 'experimental') return { ...x, visuels: { ...x.visuels, experimental: v } };
  if (dim === 'gamme') { const g = gammeParId(v); return g ? { ...x, gamme: v, couleur: g.accent } : x; }
  if (dim === 'effets') return { ...x, effets: v };
  if (dim === 'traitement') return { ...x, traitement: { grain: false, ...(x.traitement ?? {}), id: v } };
  const [g, k] = dim.split('.');
  if (g === 'typo') return { ...x, typo: { ...(x.typo ?? {}), [k]: v } };
  if (g === 'details' && k === 'jeu') {
    // Jeu de détails : ses éléments (normaliserDetails, details.ts), sauf les éléments verrouillés
    const gardes = Object.fromEntries(ELEMENTS_DETAILS_H.filter((e) => garder.includes(`details.${e}`) && x.details?.[e]).map((e) => [e, x.details![e]]));
    return { ...x, details: { ...(JEUX_DETAILS_H[v] ?? {}), ...gardes, jeu: v } };
  }
  if (g === 'details') return { ...x, details: { ...(x.details ?? {}), [k]: v } };
  if (g === 'menu') return { ...x, menu: { ...(x.menu ?? {}), [k]: v } };
  if (g === 'v') {
    const variantes = { ...x.sections.variantes, [k]: v };
    if (!v) delete variantes[k];
    return { ...x, sections: { ...x.sections, variantes } };
  }
  return x;
}

/** Verrous du studio qui figent une dimension (dimension du studio, axe d'habillage, page, élément) */
export function verrousDimension(dim: DimensionHarmonie): string[] {
  if (dim === 'structure') return ['structure'];
  if (dim === 'police') return ['polices'];
  if (dim === 'style' || dim === 'experimental') return ['visuels'];
  if (dim === 'gamme') return ['couleurs'];
  if (dim === 'effets') return ['effets'];
  if (dim === 'traitement') return ['traitement'];
  const [g, k] = dim.split('.');
  if (g === 'typo') return ['typo', `hab:typo:${k}`];
  if (g === 'details') return ['details', `hab:details:${k}`];
  if (g === 'menu') return ['menu', `hab:menu:${k}`];
  if (g === 'v') return ['structure', `composant:${k}`, ...Object.entries(PAGES_H).filter(([, s]) => s.includes(k)).map(([p]) => `page:${p}`)];
  return [];
}
/** Pages du studio et leurs sections (PAGES_STRUCTURE de recettes.ts) */
const PAGES_H: Record<string, readonly string[]> = {
  accueil: ['accueil', 'sujets', 'entete-anim'], soins: ['soins', 'soins-forme'], acces: ['infos', 'horaires', 'contact'], cabinet: ['praticiens', 'galerie'],
  questions: ['faq'], fiche: ['fiche'], actualites: ['actualites'], theme: ['theme'], article: ['article'],
};
export const estVerrouilleeHarmonie = (dim: DimensionHarmonie, verrous: readonly string[]) => verrousDimension(dim).some((v) => verrous.includes(v));

/** Dimensions d'harmonie que touche un dé du studio (dimension, page `page:<id>`, élément `composant:<section>`) */
export function dimsDuDe(de: string): DimensionHarmonie[] {
  if (de.startsWith('page:')) return (PAGES_H[de.slice(5)] ?? []).map((s) => `v.${s}`).concat(de === 'page:accueil' ? ['v.transition'] : []);
  if (de.startsWith('composant:')) return [`v.${de.slice(10)}`];
  return DIMENSIONS_HARMONIE.filter((d) => verrousDimension(d)[0] === de);
}

// ---------------------------------------------------------------------------------------------------------------
// Étiquettes des ingrédients
// ---------------------------------------------------------------------------------------------------------------

export type GenrePoliceH = 'serif' | 'didone' | 'grotesque' | 'geometrique' | 'humaniste' | 'slab' | 'condensee' | 'ronde' | 'mono';
export type EtiquetteHarmonie = {
  nom: string;
  /** Profil partiel (−1 à 1) */
  p: ProfilHarmonie;
  /** Familles où l'ingrédient est préféré */
  pref?: readonly IdFamilleStyle[];
  /** Familles où il est exclu (jamais tiré dans cette famille) */
  jamais?: readonly IdFamilleStyle[];
  /** Force expressive (0-1) ; ≥ 0,8 = élément expressif FORT (un seul par écran) */
  fort?: number;
  /** Polices : genre des titres, police d'affichage (grandes tailles), ronde ou fantaisie (pas de MAJUSCULES espacées), élégante */
  genre?: GenrePoliceH;
  affichage?: boolean;
  fantaisie?: boolean;
  elegante?: boolean;
  /** Rondeur des angles en classe (0 carré, 1 arrondi, 2 très arrondi) : cohérence des coins */
  rayon?: 0 | 1 | 2;
  /** Sans profil ni famille : ingrédient neutre (rendu du modèle), ignoré par la cohérence */
  neutre?: boolean;
};

const E = (nom: string, p: ProfilHarmonie, o: Omit<EtiquetteHarmonie, "nom" | "p" | "neutre"> = {}): EtiquetteHarmonie => ({ nom, p, ...o, neutre: !Object.keys(p).length && !o.pref && !o.jamais });
const F = {
  ed: 'editorial-chic', te: 'technique-net', dx: 'doux-rond', po: 'graphique-pop', cl: 'classique-sobre', na: 'nature-chaleureuse', mi: 'minimal-clinique', ma: 'magazine-affirme',
} as const satisfies Record<string, IdFamilleStyle>;

/** Paires de polices (PAIRES_POLICES, modeles.ts) */
const POLICES_H: Record<string, EtiquetteHarmonie> = {
  grotesque: E('Grotesque affirmée', { c: 0.5, r: -0.5, d: 0.3, e: 0.3, t: -0.4, f: 0.3 }, { pref: [F.te, F.ma], genre: 'grotesque', affichage: true }),
  geometrique: E('Géométrique nette', { c: 0.2, r: -0.1, d: 0, e: 0, t: -0.3, f: 0.3 }, { pref: [F.mi, F.te, F.cl], genre: 'geometrique' }),
  publique: E('Publique lisible', { c: 0.1, r: 0, d: 0.2, e: -0.3, t: 0, f: 0.4 }, { pref: [F.cl, F.mi], genre: 'grotesque' }),
  revue: E('Revue à empattements', { c: 1, r: -0.4, d: -0.6, e: -0.2, t: 0.1, f: 1 }, { pref: [F.ed], jamais: [F.po, F.dx], genre: 'didone', affichage: true, elegante: true }),
  editoriale: E('Éditoriale chaleureuse', { c: 0.5, r: 0.2, d: -0.3, e: 0, t: 0.5, f: 0.4 }, { pref: [F.ed, F.na], genre: 'serif', affichage: true }),
  douce: E('Douce arrondie', { c: -0.2, r: 0.5, d: 0, e: -0.2, t: 0.1, f: -0.1 }, { pref: [F.dx, F.cl], genre: 'geometrique' }),
  'serif-fine': E('Serif fine', { c: 0.8, r: -0.2, d: -0.8, e: -0.3, t: 0.1, f: 0.9 }, { pref: [F.ed], jamais: [F.po, F.te], genre: 'serif', affichage: true, elegante: true }),
  ronde: E('Ronde pédagogique', { c: -0.3, r: 1, d: 0, e: 0.1, t: 0.4, f: -0.8 }, { pref: [F.dx], jamais: [F.ed, F.te, F.ma, F.mi], genre: 'ronde', fantaisie: true }),
  clinique: E('Clinique sobre', { c: 0, r: -0.3, d: 0.2, e: -0.5, t: -0.6, f: 0.5 }, { pref: [F.mi, F.cl], genre: 'grotesque' }),
  didone: E('Didone élégante', { c: 1, r: -0.2, d: -0.4, e: 0.2, t: 0.2, f: 0.8 }, { pref: [F.ed], jamais: [F.dx], genre: 'didone', affichage: true, elegante: true }),
  affiche: E('Serif d’affiche', { c: 0.9, r: 0, d: -0.2, e: 0.5, t: 0.3, f: 0.3 }, { pref: [F.ma, F.po, F.ed], genre: 'didone', affichage: true }),
  gazette: E('Gazette', { c: 0.4, r: -0.1, d: -0.2, e: -0.3, t: 0.3, f: 0.7 }, { pref: [F.cl, F.ed], genre: 'serif', elegante: true }),
  humaniste: E('Humaniste chaleureuse', { c: 0.3, r: 0.3, d: -0.1, e: -0.2, t: 0.7, f: 0.4 }, { pref: [F.na, F.cl], genre: 'humaniste' }),
  luxe: E('Garamond de luxe', { c: 0.9, r: -0.3, d: -0.9, e: -0.3, t: 0.2, f: 1 }, { pref: [F.ed], jamais: [F.po, F.te, F.dx], genre: 'serif', affichage: true, elegante: true }),
  vintage: E('Serif ronde', { c: 0.5, r: 0.7, d: 0, e: 0.2, t: 0.8, f: -0.2 }, { pref: [F.na, F.dx], jamais: [F.te, F.mi], genre: 'serif', affichage: true, fantaisie: true }),
  slab: E('Slab robuste', { c: 0.6, r: -0.6, d: 0.4, e: 0.3, t: 0.1, f: 0.1 }, { pref: [F.ma, F.te], genre: 'slab', affichage: true }),
  spatiale: E('Grotesque à caractère', { c: 0.5, r: -0.4, d: 0.2, e: 0.5, t: -0.5, f: -0.1 }, { pref: [F.te, F.po], genre: 'grotesque', affichage: true }),
  pop: E('Géométrique pop', { c: 0.7, r: 0.5, d: 0.1, e: 0.9, t: 0.3, f: -0.7 }, { pref: [F.po], jamais: [F.ed, F.mi, F.cl], genre: 'geometrique', affichage: true }),
  condensee: E('Condensée affirmée', { c: 0.9, r: -0.7, d: 0.5, e: 0.8, t: 0, f: 0.1 }, { pref: [F.ma, F.po, F.te], jamais: [F.dx, F.na], genre: 'condensee', affichage: true }),
  'ronde-douce': E('Ronde et douce', { c: -0.4, r: 1, d: -0.2, e: -0.1, t: 0.3, f: -0.6 }, { pref: [F.dx], jamais: [F.ed, F.te, F.ma, F.mi], genre: 'ronde', fantaisie: true }),
  jakarta: E('Moderne amicale', { c: 0.3, r: 0.3, d: 0, e: 0.3, t: 0.1, f: 0 }, { pref: [F.po, F.dx, F.cl], genre: 'geometrique' }),
  'grotesque-douce': E('Grotesque douce', { c: 0.1, r: 0.3, d: 0, e: 0, t: 0.1, f: 0.1 }, { pref: [F.mi, F.dx, F.na], genre: 'geometrique' }),
  mono: E('Mono technique', { c: 0.6, r: -0.8, d: 0.6, e: 0.3, t: -0.8, f: 0.2 }, { pref: [F.te], jamais: [F.dx, F.na, F.ed], genre: 'mono', affichage: true }),
};

/** Valeurs des jeux de détails (JEUX_DETAILS, details.ts) — à garder alignées (test harmonie.test.ts quand details.ts est poussé) */
const JEUX_DETAILS_H: Record<string, Record<string, string>> = {
  gabarit: { separateur: 'aucun', souligne: 'aucun', citation: 'gabarit', badge: 'gabarit', fond: 'aucun', coins: 'gabarit', ombres: 'gabarit', boutons: 'gabarit', densite: 'aeree', cadre: 'aucun' },
  'editorial-chic': { separateur: 'filet', souligne: 'aucun', citation: 'guillemets', badge: 'contour', fond: 'aucun', coins: 'carres', ombres: 'aucune', boutons: 'fleche', densite: 'tres-aeree', cadre: 'aucun' },
  'graphique-pop': { separateur: 'points', souligne: 'surligneur', citation: 'aplat', badge: 'plein', fond: 'formes', coins: 'mixtes', ombres: 'portee', boutons: 'pilule', densite: 'aeree', cadre: 'decale' },
  'doux-rond': { separateur: 'ondulation', souligne: 'vague', citation: 'aplat', badge: 'plein', fond: 'formes', coins: 'tres-arrondis', ombres: 'douce', boutons: 'pilule', densite: 'aeree', cadre: 'organique' },
  'technique-net': { separateur: 'points', souligne: 'trait', citation: 'filet', badge: 'contour', fond: 'grille', coins: 'carres', ombres: 'aucune', boutons: 'fleche', densite: 'compacte', cadre: 'aucun' },
  'classique-sobre': { separateur: 'filet', souligne: 'aucun', citation: 'filet', badge: 'gabarit', fond: 'aucun', coins: 'arrondis', ombres: 'douce', boutons: 'gabarit', densite: 'aeree', cadre: 'arrondi' },
  magazine: { separateur: 'double', souligne: 'trait', citation: 'guillemets', badge: 'plein', fond: 'grain', coins: 'carres', ombres: 'portee', boutons: 'contour', densite: 'aeree', cadre: 'decale' },
};

/**
 * Table des étiquettes : clé `<dimension>:<valeur>`. Une valeur absente de la table est NEUTRE (admise partout, aucune règle) :
 * c'est le cas par défaut d'un ingrédient nouveau tant qu'il n'est pas étiqueté (format : docs/harmonie-graphique.md).
 */
export const ETIQUETTES_HARMONIE: Record<string, EtiquetteHarmonie> = {
  ...Object.fromEntries(Object.entries(POLICES_H).map(([k, v]) => [`police:${k}`, v])),

  // Structures (parcours) — moyennes de l'atelier : Élégant et Technique préférés, Simple et proche « trop fiche Doctolib »
  'structure:clair-pratique': E('Clair et pratique', { d: 0.3, e: 0.1, f: 0 }, { pref: [F.cl, F.po, F.dx, F.na] }),
  'structure:simple-proche': E('Simple et proche', { d: 0.2, r: 0.4, f: -0.2, c: -0.3 }, { pref: [F.dx, F.cl, F.na] }),
  'structure:elegant-sobre': E('Élégant et sobre', { d: -0.8, f: 0.9, c: 0.5 }, { pref: [F.ed, F.mi, F.cl, F.na] }),
  'structure:technique-precis': E('Technique et précis', { c: 0.9, r: -0.8, t: -0.7, d: 0.6 }, { pref: [F.te, F.ma], jamais: [F.dx, F.na] }),

  // Typographie (typo.ts)
  'typo.echelle:modeste': E('Échelle modeste', { c: -0.4, e: -0.4, d: 0.2, f: 0.3 }, { pref: [F.mi, F.cl] }),
  'typo.echelle:affirmee': E('Échelle affirmée', {}),
  'typo.echelle:spectaculaire': E('Échelle spectaculaire', { c: 1, e: 0.6, d: -0.5 }, { pref: [F.ed, F.ma, F.po], jamais: [F.mi, F.cl], fort: 1 }),
  'typo.casse:normale': E('Casse normale', {}),
  'typo.casse:majuscules': E('MAJUSCULES espacées', { c: 0.6, f: 0.6, r: -0.6, e: 0.3 }, { pref: [F.ed, F.ma], jamais: [F.dx, F.na, F.cl], fort: 0.4 }),
  'typo.casse:petites-capitales': E('Surtitres en petites capitales', { f: 0.6, c: 0.3, r: -0.2 }, { pref: [F.ed, F.cl] }),
  'typo.graisse:paire': E('Graisse de la paire', {}),
  'typo.graisse:fine': E('Graisse fine', { c: 0.4, f: 0.7, e: -0.4, d: -0.5 }, { pref: [F.ed, F.mi], jamais: [F.po, F.ma] }),
  'typo.graisse:normale': E('Graisse normale', { c: -0.1, e: -0.2 }),
  'typo.graisse:grasse': E('Graisse grasse', { c: 0.6, e: 0.5, d: 0.2 }, { pref: [F.po, F.ma, F.te] }),
  'typo.graisse:noire': E('Graisse noire', { c: 1, e: 0.9, d: 0.3, f: -0.3 }, { pref: [F.po, F.ma], jamais: [F.ed, F.mi, F.cl, F.na] }),
  'typo.interlettrage:serre': E('Interlettrage serré', { c: 0.6, e: 0.5, d: 0.4 }, { pref: [F.ma, F.po], jamais: [F.mi] }),
  'typo.interlettrage:normal': E('Interlettrage normal', {}),
  'typo.interlettrage:large': E('Interlettrage large', { d: -0.5, f: 0.5, e: -0.3 }, { pref: [F.ed, F.mi], jamais: [F.po] }),
  'typo.accent:aucun': E('Sans mot d’accent', {}),
  'typo.accent:italique': E('Un mot en italique', { f: 0.8, t: 0.2, c: 0.4 }, { pref: [F.ed, F.cl], jamais: [F.te, F.po] }),
  'typo.accent:couleur': E('Un mot en couleur', { e: 0.5, f: -0.5, t: 0.2 }, { pref: [F.po, F.dx, F.na] }),
  'typo.alignement:gauche': E('Têtes à gauche', {}),
  'typo.alignement:centre': E('Têtes centrées', { f: 0.5, d: -0.4, e: -0.3 }, { pref: [F.ed, F.cl], jamais: [F.te] }),
  'typo.surtitre:simple': E('Surtitre simple', {}),
  'typo.surtitre:filet': E('Surtitre à filet', { f: 0.5, c: 0.3 }, { pref: [F.ed, F.cl, F.mi] }),
  'typo.surtitre:numero': E('Surtitre numéroté', { r: -0.7, d: 0.4, t: -0.5, f: 0.2 }, { pref: [F.te, F.ma], jamais: [F.dx, F.na] }),
  'typo.surtitre:pastille': E('Surtitre en pastille', { r: 0.8, e: 0.4, f: -0.5 }, { pref: [F.dx, F.po], jamais: [F.ed, F.te, F.mi], rayon: 2 }),

  // Jeux de détails (details.ts)
  'details.jeu:gabarit': E('Détails du modèle', {}),
  'details.jeu:editorial-chic': E('Détails « Éditorial chic »', { c: 0.8, r: -0.5, d: -0.9, f: 0.9 }, { pref: [F.ed, F.mi], jamais: [F.po, F.dx] }),
  'details.jeu:graphique-pop': E('Détails « Graphique pop »', { c: 0.9, r: 0.4, e: 1, f: -0.8 }, { pref: [F.po], jamais: [F.ed, F.mi, F.cl, F.te] }),
  'details.jeu:doux-rond': E('Détails « Doux et rond »', { r: 1, c: -0.4, f: -0.6, t: 0.4 }, { pref: [F.dx, F.na], jamais: [F.te, F.ed, F.ma, F.mi] }),
  'details.jeu:technique-net': E('Détails « Technique net »', { r: -0.9, d: 0.7, t: -0.7, c: 0.7 }, { pref: [F.te], jamais: [F.dx, F.na, F.ed, F.po, F.cl, F.mi] }),
  'details.jeu:classique-sobre': E('Détails « Classique sobre »', { r: 0.2, e: -0.5, f: 0.6 }, { pref: [F.cl, F.na, F.mi] }),
  'details.jeu:magazine': E('Détails « Magazine affirmé »', { c: 1, r: -0.6, e: 0.6 }, { pref: [F.ma], jamais: [F.dx, F.mi, F.cl, F.na] }),
  // Éléments (un par un)
  'details.coins:gabarit': E('Coins du modèle', {}),
  'details.coins:carres': E('Coins carrés', { r: -1, f: 0.4 }, { pref: [F.ed, F.te, F.ma], jamais: [F.dx], rayon: 0 }),
  'details.coins:arrondis': E('Coins arrondis', { r: 0.3 }, { pref: [F.cl, F.na, F.mi], rayon: 1 }),
  'details.coins:tres-arrondis': E('Coins très arrondis', { r: 1, f: -0.5 }, { pref: [F.dx], jamais: [F.te, F.ed, F.ma], rayon: 2 }),
  'details.coins:mixtes': E('Coins mixtes', { r: 0.2, e: 0.6, f: -0.5 }, { pref: [F.po], jamais: [F.cl, F.mi, F.ed], rayon: 2 }),
  'details.ombres:gabarit': E('Ombres du modèle', {}),
  'details.ombres:aucune': E('Sans ombre', { e: -0.3, f: 0.3 }, { pref: [F.ed, F.te, F.mi] }),
  'details.ombres:douce': E('Ombres douces', { r: 0.5, c: -0.3 }, { pref: [F.dx, F.cl, F.na] }),
  'details.ombres:portee': E('Ombre portée décalée « pop »', { c: 1, e: 1, f: -0.6 }, { pref: [F.po, F.ma], jamais: [F.ed, F.cl, F.mi, F.na], fort: 0.5 }),
  'details.separateur:aucun': E('Sans séparateur', {}),
  'details.separateur:filet': E('Filet fin', { f: 0.5 }, { pref: [F.ed, F.cl, F.mi] }),
  'details.separateur:double': E('Double filet', { f: 0.5, c: 0.4 }, { pref: [F.ma, F.ed] }),
  'details.separateur:ondulation': E('Ondulation', { r: 1, e: 0.3, f: -0.5 }, { pref: [F.dx, F.na], jamais: [F.te, F.ed, F.ma, F.mi] }),
  'details.separateur:points': E('Points de pression', { r: 0.2, t: -0.3, e: 0.3 }, { pref: [F.te, F.po] }),
  'details.souligne:aucun': E('Sans souligné', {}),
  'details.souligne:trait': E('Trait épais décalé', { c: 0.6, r: -0.5, e: 0.4 }, { pref: [F.te, F.ma] }),
  'details.souligne:surligneur': E('Surligneur couleur', { e: 0.8, f: -0.6, c: 0.5 }, { pref: [F.po], jamais: [F.ed, F.cl, F.mi], fort: 0.4 }),
  'details.souligne:vague': E('Souligné en vague', { r: 1, e: 0.5, f: -0.6 }, { pref: [F.dx], jamais: [F.te, F.ed, F.ma, F.mi] }),
  'details.citation:gabarit': E('Encadrés du modèle', {}),
  'details.citation:filet': E('Encadré à filet', { f: 0.4 }, { pref: [F.te, F.cl] }),
  'details.citation:guillemets': E('Grands guillemets', { f: 0.7, c: 0.6 }, { pref: [F.ed, F.ma] }),
  'details.citation:aplat': E('Encadré en aplat doux', { r: 0.4, c: -0.3 }, { pref: [F.dx, F.po, F.na] }),
  'details.badge:gabarit': E('Étiquettes du modèle', {}),
  'details.badge:contour': E('Étiquettes à contour', { f: 0.4, d: -0.2 }, { pref: [F.ed, F.te, F.mi] }),
  'details.badge:plein': E('Étiquettes pleines', { e: 0.6, c: 0.6 }, { pref: [F.po, F.ma, F.dx] }),
  'details.badge:carre': E('Étiquettes carrées', { r: -1 }, { pref: [F.te], jamais: [F.dx], rayon: 0 }),
  'details.fond:aucun': E('Sans motif de fond', {}),
  'details.fond:trame': E('Trame de points', { t: -0.3, e: 0.3, r: 0.2 }, { pref: [F.te], jamais: [F.mi, F.ed], fort: 0.8 }),
  'details.fond:grain': E('Grain', { t: 0.5, f: 0.2 }, { pref: [F.ma, F.na], jamais: [F.mi], fort: 0.4 }),
  'details.fond:formes': E('Formes floues de la gamme', { r: 1, e: 0.5, f: -0.5 }, { pref: [F.dx, F.po], jamais: [F.te, F.ed, F.mi, F.ma], fort: 0.8 }),
  'details.fond:grille': E('Grille fine', { r: -1, t: -0.6, f: 0.3 }, { pref: [F.te], jamais: [F.dx, F.na], fort: 0.4 }),
  'details.boutons:gabarit': E('Boutons du modèle', {}),
  'details.boutons:contour': E('Boutons en contour', { f: 0.5, c: 0.3, d: -0.2 }, { pref: [F.ed, F.ma, F.mi] }),
  'details.boutons:fleche': E('Boutons à flèche', { f: 0.4, e: 0.2, r: -0.4 }, { pref: [F.ed, F.te] }),
  'details.boutons:pilule': E('Boutons pilule', { r: 1, f: -0.3 }, { pref: [F.dx, F.po], jamais: [F.te, F.ed], rayon: 2 }),
  'details.densite:compacte': E('Densité compacte', { d: 1 }, { pref: [F.te], jamais: [F.ed, F.mi] }),
  'details.densite:aeree': E('Densité aérée', { d: -0.2 }),
  'details.densite:tres-aeree': E('Densité très aérée', { d: -1 }, { pref: [F.ed, F.mi], jamais: [F.te, F.po] }),
  'details.cadre:aucun': E('Images sans cadre', {}),
  'details.cadre:arrondi': E('Images arrondies', { r: 0.5 }, { pref: [F.cl, F.na, F.dx], rayon: 1 }),
  'details.cadre:organique': E('Découpe organique', { r: 1, e: 0.3, f: -0.5 }, { pref: [F.dx, F.na], jamais: [F.te, F.ed, F.ma, F.mi], rayon: 2 }),
  'details.cadre:decale': E('Cadre décalé', { e: 0.8, c: 0.7, f: -0.3 }, { pref: [F.po, F.ma], jamais: [F.mi, F.cl, F.ed], fort: 0.5 }),

  // Forme des cartes (formes.ts)
  'v.soins-forme:gabarit': E('Cartes du modèle', {}),
  'v.soins-forme:bulles': E('Bulles rondes', { r: 1, f: -0.4 }, { pref: [F.dx], jamais: [F.te, F.ed, F.ma], rayon: 2 }),
  'v.soins-forme:carres': E('Gros carrés', { r: -0.8, c: 0.5, e: 0.3 }, { pref: [F.te, F.ma], jamais: [F.dx, F.na], rayon: 0 }),
  'v.soins-forme:arrondies': E('Cartes arrondies', { r: 0.6 }, { pref: [F.cl, F.dx, F.na], rayon: 2 }),
  'v.soins-forme:mosaique': E('Mosaïque', { e: 0.6, c: 0.4, d: 0.2 }, { pref: [F.ma, F.po], rayon: 1 }),
  'v.soins-forme:pilules': E('Pastilles', { r: 1, e: 0.3, f: -0.5 }, { pref: [F.dx, F.po], jamais: [F.te, F.ed, F.ma, F.mi], rayon: 2 }),
  'v.soins-forme:organiques': E('Formes organiques', { r: 1, t: 0.5, f: -0.6 }, { pref: [F.na, F.dx], jamais: [F.te, F.ed, F.ma, F.mi], rayon: 2 }),
  'v.soins-forme:tuiles': E('Tuiles pleine couleur', { c: 0.9, e: 0.7, r: -0.2 }, { pref: [F.po], jamais: [F.ed, F.mi], rayon: 1 }),
  'v.soins-forme:sans-cadre': E('Sans cadre', { d: -0.6, f: 0.6, c: 0.2 }, { pref: [F.ed, F.mi] }),

  // Menus (menus.ts)
  'menu.ordinateur:gabarit': E('Menu du modèle', {}),
  'menu.ordinateur:centre': E('Logo centré', { f: 0.8, d: -0.3 }, { pref: [F.ed, F.cl] }),
  'menu.ordinateur:collante': E('Barre fine collante', { d: 0.3, e: 0.2 }, { pref: [F.te, F.mi] }),
  'menu.ordinateur:pastilles': E('Liens en pastilles', { r: 0.8, e: 0.5, f: -0.5 }, { pref: [F.dx, F.po], jamais: [F.te, F.ed, F.mi], rayon: 2 }),
  'menu.ordinateur:souligne': E('Soulignés animés', { f: 0.3, e: 0.2 }, { pref: [F.ed, F.ma] }),
  'menu.ordinateur:transparente': E('Transparente puis pleine', { c: 0.5, e: 0.3 }, { pref: [F.ma, F.po] }),
  'menu.ordinateur:laterale': E('Menu latéral', { f: 0.8, d: -0.4 }, { pref: [F.ed, F.ma], jamais: [F.dx, F.po] }),
  'menu.mobile:gabarit': E('Menu téléphone du modèle', {}),
  'menu.mobile:defilant': E('Liens défilants', { d: 0.4, e: 0.3 }, { pref: [F.te, F.po] }),
  'menu.mobile:panneau': E('Panneau plein écran', { f: 0.6, d: -0.5 }, { pref: [F.ed, F.ma] }),
  'menu.mobile:tiroir': E('Tiroir latéral', {}),
  'menu.mobile:onglets': E('Barre d’onglets', { d: 0.5, r: 0.2, f: -0.3 }, { pref: [F.cl, F.dx] }),
  'menu.rdv:gabarit': E('Bouton plein', {}),
  'menu.rdv:contour': E('Bouton à filet', { f: 0.4, c: 0.2 }, { pref: [F.ed, F.mi] }),
  'menu.rdv:flottant': E('Bouton flottant', { e: 0.5 }, { pref: [F.po, F.dx] }),

  // Premier écran (modeles.ts, heros-photo-variantes.ts) et transitions
  'v.accueil:carte': E('Carte et disque', { r: 0.3 }, { pref: [F.cl, F.dx, F.na] }),
  'v.accueil:notice': E('Notice tramée', { d: 0.3, f: 0.3, t: -0.2 }, { pref: [F.te, F.mi, F.cl] }),
  'v.accueil:figure': E('Figure de revue', { f: 0.9, d: -0.6, c: 0.3 }, { pref: [F.ed, F.mi] }),
  'v.accueil:typographique': E('Premier écran typographique', { c: 1, e: 0.7 }, { pref: [F.ma, F.po, F.ed], jamais: [F.mi, F.dx], fort: 1 }),
  'v.accueil:maille': E('Dégradé maillé', { r: 0.7, e: 0.6, f: -0.4 }, { pref: [F.po, F.dx], jamais: [F.te, F.cl, F.mi, F.ed], fort: 1 }),
  'v.accueil:bento': E('Bento', { d: 0.5, e: 0.5, r: 0.2 }, { pref: [F.po, F.te], jamais: [F.ed, F.mi], fort: 0.5 }),
  'v.accueil:photo-gauche': E('Photo plein écran, texte à gauche', { c: 0.5, e: 0.3 }, { pref: [F.ma, F.na], fort: 0.8 }),
  'v.accueil:photo-centre': E('Photo plein écran, texte centré', { c: 0.5, e: 0.3, f: 0.3 }, { pref: [F.ed, F.ma], fort: 0.8 }),
  'v.accueil:photo-bas': E('Photo plein écran, texte en bas', { c: 0.4, f: 0.4 }, { pref: [F.ed, F.na], fort: 0.8 }),
  'v.accueil:diaporama': E('Diaporama plein écran', { e: 1, c: 0.4 }, { pref: [F.po, F.ma], jamais: [F.mi, F.cl], fort: 1 }),
  // Formats fondus, dynamiques et organiques (retour de Paul du 2026-10-07)
  'v.accueil:fondu': E('Photo fondue dans la page', { t: 0.2, r: 0.3, f: 0.3 }, { pref: [F.na, F.ed, F.dx], fort: 0.8 }),
  'v.accueil:fondu-double': E('Photo fondue des deux côtés', { f: 0.4, d: -0.3 }, { pref: [F.ed, F.cl, F.na], fort: 0.8 }),
  'v.accueil:voile-degrade': E('Photo sous un voile dégradé', { c: 0.4, e: 0.4 }, { pref: [F.po, F.ma, F.cl], fort: 0.8 }),
  'v.accueil:oblique': E('Découpe oblique (vitesse)', { e: 1, r: -0.6, c: 0.7 }, { pref: [F.te, F.ma, F.po], jamais: [F.dx, F.na, F.mi, F.cl, F.ed], fort: 1 }),
  'v.accueil:parallelogramme': E('Parallélogramme et lignes de vitesse', { e: 1, r: -0.7, c: 0.7 }, { pref: [F.ma, F.te, F.po], jamais: [F.dx, F.na, F.mi, F.cl, F.ed], fort: 1 }),
  'v.accueil:organique': E('Photo dans une forme organique', { r: 1, e: 0.5, f: -0.5 }, { pref: [F.dx, F.na], jamais: [F.te, F.ed, F.ma, F.mi], fort: 1 }),
  'v.accueil:organique-fondu': E('Forme organique fondue', { r: 1, t: 0.3, f: -0.3 }, { pref: [F.na, F.dx], jamais: [F.te, F.ma, F.mi], fort: 0.8 }),
  'v.accueil:scinde-photo': E('Photo d’un côté, texte de l’autre', { f: 0.3 }, { pref: [F.cl, F.na, F.ed], fort: 0.5 }),
  // Lot 2 des premiers écrans « couleurs / formes organiques » (2026-10-08, à valider)
  'v.accueil:decoupe-photo': E('Photo en papier découpé', { r: 0.4, t: 0.6, e: 0.5, f: -0.4 }, { pref: [F.na, F.po, F.dx], jamais: [F.te, F.mi, F.ed], fort: 0.9 }),
  'v.accueil:duo-taches': E('Duo de taches, couleur et photo', { r: 1, e: 0.5, f: -0.5 }, { pref: [F.dx, F.na, F.po], jamais: [F.te, F.ed, F.ma, F.mi], fort: 1 }),
  'v.accueil:arche-photo': E('Photo dans une arche', { r: 0.6, f: 0.3, c: 0.2 }, { pref: [F.ed, F.na, F.cl, F.dx], jamais: [F.te], fort: 0.8 }),
  'v.accueil:voute-photo': E('Photo en courbe de voûte', { r: 0.5, f: 0.2, t: 0.2 }, { pref: [F.na, F.cl, F.dx], jamais: [F.ma], fort: 0.8 }),
  'v.accueil:papier-decoupe': E('Aplats en papier découpé', { r: 0.5, t: 0.6, e: 0.5, f: -0.4 }, { pref: [F.na, F.dx, F.po], jamais: [F.te, F.mi, F.ed], fort: 0.9 }),
  'v.accueil:tache-morph': E('Tache qui se déforme', { r: 1, e: 0.5, f: -0.5 }, { pref: [F.dx, F.na, F.po], jamais: [F.te, F.ed, F.ma, F.mi], fort: 0.9 }),
  'v.accueil:maille-anime': E('Dégradé maillé animé', { r: 0.7, e: 0.5, f: -0.3 }, { pref: [F.po, F.dx, F.na], jamais: [F.te, F.cl, F.mi], fort: 0.8 }),
  'v.accueil:forme-respire': E('Grande forme qui respire', { r: 1, e: 0.3, t: 0.3, f: -0.4 }, { pref: [F.dx, F.na], jamais: [F.te, F.ma, F.mi], fort: 0.8 }),
  'v.accueil:bandes-ondulantes': E('Bandes ondulantes', { r: 0.7, e: 0.7, f: -0.4 }, { pref: [F.po, F.dx], jamais: [F.te, F.ed, F.mi, F.cl], fort: 0.9 }),
  'v.accueil:voute-aplat': E('Aplat en courbe de voûte', { r: 0.6, f: 0.1, t: 0.2 }, { pref: [F.na, F.cl, F.dx], jamais: [F.ma], fort: 0.8 }),
  // Animations d'en-tête (entete-anim.ts, 2026-10-08, à valider) : très dynamiques = FORTES (≥ 0,8), jamais avec un autre
  // élément fort ; les minimalistes (≤ 0,6) se combinent avec les premiers écrans des lots 1 et 2
  'v.entete-anim:aucune': E('Sans animation d’en-tête', {}),
  'v.entete-anim:voute-trace': E('Trait qui trace la voûte', { e: 0.4, f: 0.3 }, { pref: [F.ed, F.cl, F.na, F.te], fort: 0.5 }),
  'v.entete-anim:points-pression': E('Points de pression en séquence', { e: 0.5, t: -0.4, d: 0.3 }, { pref: [F.te, F.mi, F.cl], fort: 0.5 }),
  'v.entete-anim:foulee': E('Lignes de foulée', { e: 1, r: -0.6, c: 0.6 }, { pref: [F.te, F.po, F.ma], jamais: [F.dx, F.na, F.mi, F.cl, F.ed], fort: 0.8 }),
  'v.entete-anim:onde': E('Onde au sol', { e: 0.5, r: 0.8 }, { pref: [F.dx, F.na, F.cl], jamais: [F.te, F.ma], fort: 0.6 }),
  'v.entete-anim:taches': E('Taches qui se rejoignent', { r: 1, e: 0.6, f: -0.5 }, { pref: [F.dx, F.po, F.na], jamais: [F.te, F.ed, F.ma, F.mi], fort: 0.8 }),
  'v.entete-anim:mots': E('Mots des soins cinétiques', { e: 0.9, c: 0.8 }, { pref: [F.ma, F.po, F.ed], jamais: [F.mi, F.cl, F.dx], fort: 0.9 }),
  'v.entete-anim:empreintes': E('Pas abstraits qui avancent', { e: 0.7 }, { pref: [F.po, F.te, F.dx], jamais: [F.mi, F.ed], fort: 0.6 }),
  'v.entete-anim:rubans': E('Rubans de couleur', { e: 0.8, r: 0.7, f: -0.5 }, { pref: [F.po, F.dx], jamais: [F.te, F.ed, F.mi, F.cl], fort: 0.8 }),
  'v.entete-anim:geometrie': E('Formes géométriques en rotation', { e: 0.5, c: 0.6, r: -0.3 }, { pref: [F.po, F.te, F.ma], jamais: [F.na], fort: 0.6 }),
  'v.entete-anim:lueur': E('Lueur qui suit le pointeur', { e: 0.3, f: 0.2 }, { pref: [F.ed, F.mi, F.ma], fort: 0.4 }),
  'v.transition:fondu': E('Fondu enchaîné', {}),
  'v.transition:ken-burns': E('Ken Burns', { e: 0.4, f: 0.2 }, { pref: [F.ed, F.na] }),
  'v.transition:glissement': E('Glissement', { e: 0.6 }, { pref: [F.po], jamais: [F.mi] }),
  'v.transition:volet': E('Volet', { e: 0.7, c: 0.4, r: -0.4 }, { pref: [F.ma, F.te], jamais: [F.dx, F.mi] }),
  'v.transition:rideau': E('Rideau', { e: 0.7, f: 0.2 }, { pref: [F.ma, F.ed], jamais: [F.mi] }),
  'v.transition:flou': E('Fondu flou', { r: 0.5, e: 0.3 }, { pref: [F.dx, F.na] }),
  'v.sections:aucune': E('Sans transition', {}),
  'v.sections:vague': E('Vague entre sections', { r: 1, e: 0.4, f: -0.4 }, { pref: [F.dx, F.na], jamais: [F.te, F.ed, F.ma, F.mi] }),
  'v.sections:chevauchement': E('Sections qui se recouvrent', { e: 0.5, c: 0.3 }, { pref: [F.ma, F.po] }),
  'v.sections:revelation': E('Révélation au défilement', { e: 0.6 }, { pref: [F.po, F.ed], jamais: [F.mi] }),
  'v.sections:empilees': E('Cartes empilées', { e: 0.8, d: 0.3 }, { pref: [F.po, F.ma], jamais: [F.mi, F.cl, F.ed], fort: 0.6 }),

  // Présentations des pages (étiquetage léger : densité, formalité)
  'v.sujets:une': E('Le premier à la une', { c: 0.5, f: 0.4, e: 0.3 }, { pref: [F.ed, F.ma] }),
  'v.sujets:rangees': E('Grandes rangées', { d: -0.2, r: 0.2 }),
  'v.sujets:cartes': E('Cartes égales', { d: 0.3, r: 0.2 }, { pref: [F.cl, F.dx] }),
  'v.sujets:liste': E('Liste éditoriale', { f: 0.7, d: -0.4, c: 0.3 }, { pref: [F.ed, F.mi] }),
  'v.sujets:colonnes': E('Deux colonnes', { d: 0.2, f: 0.3 }),
  'v.soins:bulles': E('Cartes illustrées', { r: 0.7 }, { pref: [F.dx, F.na] }),
  'v.soins:grille': E('Rangées larges', { d: 0.5, r: -0.5 }, { pref: [F.te] }),
  'v.soins:filets': E('Bulles à filet', { f: 0.7, d: -0.4 }, { pref: [F.ed, F.mi] }),
  'v.praticiens:liste': E('Équipe en liste', { f: 0.6, d: -0.4 }, { pref: [F.ed] }),
  // Présentations des portraits des praticiens (portraits-variantes.ts, 2026-10-08, à valider) : jamais FORTES (un seul élément fort
  // par écran reste le premier écran) ; forme organique = élément rond (règle Technique) ; tirage incliné = chaleureux, jamais clinique
  'v.portraits:sobre': E('Portraits en petit format', {}),
  'v.portraits:editorial': E('Grand portrait éditorial', { f: 0.8, c: 0.6, d: -0.5 }, { pref: [F.ed, F.ma, F.cl], fort: 0.5 }),
  'v.portraits:voile': E('Portrait plein cadre et voile', { c: 0.7, e: 0.4, f: 0.3 }, { pref: [F.ma, F.ed, F.po], jamais: [F.mi], fort: 0.6 }),
  'v.portraits:duo': E('Portraits côte à côte', { d: 0.1, f: 0.4 }, { pref: [F.cl, F.mi, F.te] }),
  'v.portraits:mosaique': E('Mosaïque décalée', { e: 0.5, d: -0.2, c: 0.3 }, { pref: [F.ma, F.po, F.ed], jamais: [F.mi, F.cl], fort: 0.5 }),
  'v.portraits:organique': E('Portrait en forme organique', { r: 1, t: 0.5, f: -0.4 }, { pref: [F.dx, F.na], jamais: [F.te, F.mi, F.ma, F.ed], fort: 0.5, rayon: 2 }),
  'v.portraits:anneau': E('Portrait rond et anneau', { r: 0.6, e: 0.2 }, { pref: [F.dx, F.po, F.cl], jamais: [F.ed] }),
  'v.portraits:polaroid': E('Tirage à bordure', { t: 0.6, f: -0.5, e: 0.3 }, { pref: [F.na, F.po, F.dx], jamais: [F.mi, F.ed, F.te], fort: 0.5 }),
  'v.portraits:defilement': E('Bandeau de portraits', { e: 0.5, d: 0.3 }, { pref: [F.po, F.te, F.ma], jamais: [F.ed] }),
  'v.portraits:detoure': E('Portrait sur aplat', { c: 0.5, e: 0.4, r: 0.2 }, { pref: [F.po, F.ma, F.dx], jamais: [F.mi, F.ed], fort: 0.5 }),
  'v.faq:ouverte': E('Questions ouvertes', { d: -0.3, f: 0.3 }),
  'v.galerie:mosaique': E('Mosaïque', { e: 0.4 }),
  'v.galerie:defilement': E('Diaporama au doigt', { e: 0.5 }),
  'v.galerie:grande': E('Grande photo', { f: 0.4, c: 0.4 }),
  'v.horaires:tableau': E('Tableau compact', { d: 0.4, r: -0.4 }, { pref: [F.te] }),
  'v.horaires:carte': E('Carte encadrée', { r: 0.4 }),
  'v.contact:flottant': E('Bouton flottant', { e: 0.5 }),
  'v.pied:centre': E('Pied centré', { f: 0.5 }),
  'v.pied:large': E('Nom du cabinet en grand', { c: 0.7, e: 0.4 }, { pref: [F.ma, F.ed] }),
  'v.fiche:colonne': E('Fiche en une colonne', { f: 0.4, d: -0.3 }),
  'v.actualites:une': E('Le dernier à la une', { c: 0.5, e: 0.3 }),
  'v.theme:heros': E('Illustration pleine largeur', { c: 0.5, e: 0.4 }),
  'v.article:lecture': E('Colonne de lecture', { f: 0.5, d: -0.4 }, { pref: [F.ed, F.mi] }),
  'v.article:chapo': E('Chapô en grand', { f: 0.8, c: 0.5 }, { pref: [F.ed, F.ma] }),

  // Styles d'illustration (propositions.ts) — dont registres expérimentaux (styles-experimentaux.ts, pas encore sur les recettes)
  'style:releve': E('Relevé (points de pression)', { t: -0.6, r: -0.4, c: 0.5, d: 0.4, e: 0.3 }, { pref: [F.te, F.ma], jamais: [F.dx, F.na] }),
  'style:pedagogique': E('Illustrations douces', { r: 0.7, t: 0.4, c: -0.3, f: -0.3 }, { pref: [F.dx, F.na, F.cl], jamais: [F.te, F.ma] }),
  'style:ligne': E('Trait fin', { c: 0.2, f: 0.6, d: -0.5, e: -0.3 }, { pref: [F.ed, F.mi, F.cl, F.na] }),
  'style:photos': E('Photos', { t: 0.3, c: 0.3, e: 0.3 }, { pref: [F.ma, F.po, F.na] }),
  'experimental:decoupe': E('Papier découpé', { r: 0.6, t: 0.7, e: 0.4, f: -0.4 }, { pref: [F.na, F.dx, F.po], jamais: [F.te, F.mi] }),
  'experimental:riso': E('Risographie', { c: 0.6, e: 0.7, t: 0.4, f: -0.5 }, { pref: [F.po, F.ma], jamais: [F.ed, F.mi, F.cl] }),
  'experimental:volume': E('Volume doux', { r: 1, c: -0.3, f: -0.3 }, { pref: [F.dx], jamais: [F.te, F.ma, F.ed] }),
  'experimental:geometrique': E('Géométrique graphique', { r: -0.5, c: 0.9, e: 0.6 }, { pref: [F.po, F.te, F.ma], jamais: [F.dx, F.na] }),

  // Traitements des photos (traitements-photos.ts)
  'traitement:modele': E('Traitement du modèle', {}),
  'traitement:voile': E('Voile de couleur', { c: -0.2 }, { pref: [F.cl, F.dx] }),
  'traitement:duotone': E('Duotone', { c: 0.9, e: 0.6, f: -0.2, t: -0.2 }, { pref: [F.po, F.ma, F.te], jamais: [F.na, F.cl] }),
  'traitement:nb-accent': E('Noir et blanc + accent', { c: 0.8, f: 0.7, t: -0.4 }, { pref: [F.ed, F.ma], jamais: [F.dx, F.na] }),
  'traitement:chaud-doux': E('Chaud doux', { t: 1, c: -0.3, r: 0.3 }, { pref: [F.na, F.dx], jamais: [F.te] }),
  'traitement:mat': E('Mat éditorial', { f: 0.6, c: -0.2, t: 0.1, e: -0.5 }, { pref: [F.ed, F.mi, F.cl] }),

  // Effets (effets.ts)
  'effets:sobre': E('Effets sobres', { e: -0.8 }, { pref: [F.mi, F.cl, F.te] }),
  'effets:doux': E('Effets doux', { e: -0.2, r: 0.5 }, { pref: [F.dx, F.na, F.cl] }),
  'effets:vivant': E('Effets vivants', { e: 1, f: -0.5 }, { pref: [F.po], jamais: [F.ed, F.mi, F.cl, F.na] }),
  'effets:editorial': E('Effets éditoriaux', { f: 0.9, c: 0.6, e: -0.1 }, { pref: [F.ed, F.ma], jamais: [F.dx, F.po] }),

  // Gammes (gammes.ts) : température d'après l'accent, énergie des vitaminées
  'gamme:canard': E('Canard', { t: -0.4, f: 0.4, e: -0.3 }, { pref: [F.te, F.cl, F.mi] }),
  'gamme:cobalt': E('Cobalt', { t: -0.6, c: 0.6 }, { pref: [F.te, F.ma, F.mi] }),
  'gamme:sauge': E('Sauge', { t: 0.3, r: 0.3, e: -0.4 }, { pref: [F.na, F.dx] }),
  'gamme:terracotta': E('Terracotta', { t: 0.9, e: -0.1 }, { pref: [F.na, F.ed] }),
  'gamme:prune': E('Prune', { t: 0.2, f: 0.8, e: -0.2 }, { pref: [F.ed, F.cl] }),
  'gamme:sable': E('Sable', { t: 0.8, f: 0.4, e: -0.3 }, { pref: [F.na, F.ed, F.cl] }),
  'gamme:encre': E('Encre', { c: 1, t: -0.3, f: 0.9, e: -0.4 }, { pref: [F.ed, F.mi, F.te, F.ma] }),
  'gamme:ardoise': E('Ardoise', { t: -0.4, f: 0.5, e: -0.5 }, { pref: [F.mi, F.cl, F.te] }),
  'gamme:corail': E('Corail', { t: 0.7, e: 0.3 }, { pref: [F.na, F.po] }),
  'gamme:mangue': E('Mangue & encre', { t: 0.8, e: 0.7, c: 0.6 }, { pref: [F.po, F.ma, F.na], jamais: [F.mi] }),
  'gamme:pasteque': E('Pastèque & menthe', { t: 0.5, e: 0.9, f: -0.6 }, { pref: [F.po, F.dx], jamais: [F.ed, F.mi, F.te] }),
  'gamme:lavande': E('Lavande & citron', { t: -0.1, e: 0.6, r: 0.5 }, { pref: [F.dx, F.po], jamais: [F.te, F.mi] }),
  'gamme:corail-nuit': E('Corail & bleu nuit', { t: 0.4, e: 0.6, c: 0.7 }, { pref: [F.ma, F.po, F.ed] }),
  'gamme:menthe': E('Menthe glacée & prune', { t: -0.3, e: 0.4 }, { pref: [F.dx, F.te, F.mi] }),
  'gamme:cobalt-abricot': E('Cobalt & abricot', { t: 0, e: 0.7, c: 0.8 }, { pref: [F.po, F.te, F.ma] }),
  'gamme:pistache': E('Pistache & framboise', { t: 0.3, e: 0.7, r: 0.4 }, { pref: [F.dx, F.na, F.po], jamais: [F.ed, F.mi, F.te] }),
  'gamme:tournesol': E('Tournesol & ardoise', { t: 0.6, e: 0.6 }, { pref: [F.dx, F.po, F.cl, F.na] }),
};

/** Libellé d'une valeur (étiquette, sinon la valeur) */
export const nomValeurHarmonie = (dim: DimensionHarmonie, v: string) => ETIQUETTES_HARMONIE[`${dim}:${v}`]?.nom ?? v;

/** Étiquette d'une valeur ; couleur libre : température calculée depuis la teinte */
export function etiquetteIngredient(dim: DimensionHarmonie, v: string | undefined): EtiquetteHarmonie | undefined {
  if (v === undefined) return undefined;
  const e = ETIQUETTES_HARMONIE[`${dim}:${v}`];
  if (e) return e;
  if (dim === 'gamme-libre' && /^#[0-9a-f]{6}$/i.test(v)) return E(`Couleur libre ${v}`, { t: temperatureCouleur(v) });
  return undefined;
}

/** Température d'une couleur (−1 froide, +1 chaude) d'après sa teinte */
export function temperatureCouleur(c: string): number {
  const [r, g, b] = rvb(c).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.08) return 0;
  const h = (max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4)) + 360;
  // Rouges-oranges-jaunes (≈ 30°) chauds, bleus (≈ 210°) froids
  return Math.round(Math.cos(((h % 360) - 30) * (Math.PI / 180)) * 100) / 100;
}

// ---------------------------------------------------------------------------------------------------------------
// Compatibilité ingrédient × famille
// ---------------------------------------------------------------------------------------------------------------

export type CompatibiliteFamille = 'prefere' | 'admis' | 'exclu';
/** Distance (0-2) d'un profil partiel au profil d'une famille : moyenne des écarts sur les attributs renseignés */
export function distanceFamille(p: ProfilHarmonie, f: IdFamilleStyle): number {
  const pf = familleStyle(f)!.profil as Required<ProfilHarmonie>;
  const k = (Object.keys(p) as AttributHarmonie[]).filter((a) => typeof p[a] === 'number');
  if (!k.length) return 0;
  return k.reduce((s, a) => s + Math.abs((p[a] as number) - pf[a]), 0) / k.length;
}
/** Seuil de distance au-delà duquel un ingrédient sort d'une famille */
export const SEUIL_ADMIS_FAMILLE = 0.75;

/** Un ingrédient dans une famille : préféré, admis ou exclu ; inconnu (non étiqueté) = admis */
export function compatibiliteFamille(dim: DimensionHarmonie, v: string | undefined, f: IdFamilleStyle): CompatibiliteFamille {
  const k = `${dim}:${v}`;
  let parF = CACHE_COMPAT.get(k);
  if (!parF) { parF = {}; if (CACHE_COMPAT.size < 20000) CACHE_COMPAT.set(k, parF); }
  let r = parF[f];
  if (r) return r;
  const e = etiquetteIngredient(dim, v);
  r = !e ? 'admis' : e.jamais?.includes(f) ? 'exclu' : e.pref?.includes(f) ? 'prefere' : distanceFamille(e.p, f) <= SEUIL_ADMIS_FAMILLE ? 'admis' : 'exclu';
  parF[f] = r;
  return r;
}
/** Table constante : la compatibilité d'un ingrédient avec une famille ne change jamais (mémoïsée) */
const CACHE_COMPAT = new Map<string, Partial<Record<IdFamilleStyle, CompatibiliteFamille>>>();

/** Valeurs connues d'une dimension (catalogues réels quand ils sont importables, sinon la table des étiquettes) */
export function valeursDimensionHarmonie(dim: DimensionHarmonie): string[] {
  const m = CACHE_VALEURS.get(dim);
  if (m) return [...m];
  const l = valeursSansCache(dim);
  CACHE_VALEURS.set(dim, l);
  return [...l];
}
const CACHE_VALEURS = new Map<string, string[]>();
function valeursSansCache(dim: DimensionHarmonie): string[] {
  if (dim === 'police') return PAIRES_POLICES.map((p) => p.id);
  if (dim === 'gamme') return GAMMES.map((g) => g.id);
  if (dim === 'effets') return JEUX_EFFETS.map((j) => j.id);
  if (dim === 'v.soins-forme') return FORMES_CARTES.map((f) => f.id);
  if (dim.startsWith('v.')) return [...((VARIANTES_SECTIONS as Record<string, readonly string[]>)[dim.slice(2)] ?? [])];
  if (dim === 'details.jeu') return Object.keys(JEUX_DETAILS_H);
  const p = `${dim}:`;
  return Object.keys(ETIQUETTES_HARMONIE).filter((k) => k.startsWith(p)).map((k) => k.slice(p.length));
}

// ---------------------------------------------------------------------------------------------------------------
// Règles dures
// ---------------------------------------------------------------------------------------------------------------

export type CorrectionHarmonie = { dim: DimensionHarmonie; valeur: string };
export type ViolationHarmonie = {
  code: string;
  message: string;
  /** Dimensions en cause (la première est la plus simple à corriger) */
  dims: DimensionHarmonie[];
  /** Corrections possibles, dans l'ordre de préférence */
  corrections: CorrectionHarmonie[];
};

const pol = (x: CompositionHarmonie) => POLICES_H[x.police];
const val = (x: CompositionHarmonie, dim: DimensionHarmonie) => lireDimension(x, dim);
const SUJETS_CALMES = ['diabete', 'senior'];
/** Éléments ronds ou « blobs » (interdits avec la structure Technique et la police mono) */
const RONDS: [DimensionHarmonie, string][] = [
  ['v.portraits', 'organique'],
  ['details.coins', 'tres-arrondis'], ['v.soins-forme', 'bulles'], ['v.soins-forme', 'organiques'], ['v.soins-forme', 'pilules'], ['details.cadre', 'organique'],
  ['details.fond', 'formes'], ['details.separateur', 'ondulation'], ['details.souligne', 'vague'], ['v.sections', 'vague'], ['v.accueil', 'maille'], ['details.boutons', 'pilule'],
  ['v.accueil', 'organique'], ['v.accueil', 'organique-fondu'], ['v.accueil', 'duo-taches'], ['v.accueil', 'tache-morph'], ['v.accueil', 'forme-respire'],
  ['v.accueil', 'maille-anime'], ['v.accueil', 'bandes-ondulantes'], ['v.entete-anim', 'taches'], ['v.entete-anim', 'onde'], ['v.entete-anim', 'rubans'],
];
/** Animations d'en-tête trop vives pour le diabète et les seniors (énergie ≥ 0,7 : il faut rassurer) */
const ANIMATIONS_VIVES = ['foulee', 'mots', 'empreintes', 'rubans'];
/** Animations qui pulsent : jamais avec les illustrations douces (registre pédagogique : « rien qui pulse », charte) */
const ANIMATIONS_PULSEES = ['points-pression', 'onde'];

/** Valeur neutre (sans règle) d'une dimension, utilisée pour corriger */
const NEUTRES: Record<string, string> = {
  'details.coins': 'gabarit', 'v.soins-forme': 'gabarit', 'details.cadre': 'aucun', 'details.fond': 'aucun', 'details.separateur': 'filet', 'details.souligne': 'aucun',
  'v.sections': 'aucune', 'v.entete-anim': 'aucune', 'v.portraits': 'sobre', 'details.boutons': 'gabarit', 'details.ombres': 'aucune', 'typo.echelle': 'affirmee', 'typo.casse': 'normale', 'typo.interlettrage': 'normal',
  'details.densite': 'aeree', effets: 'sobre', 'v.accueil': 'carte', 'details.badge': 'gabarit', 'menu.ordinateur': 'gabarit', 'typo.surtitre': 'simple',
};
/** Classe de rayon (0 carré, 1 arrondi, 2 très arrondi) des éléments qui portent des angles */
const DIMS_RAYON = ['details.coins', 'v.soins-forme', 'details.boutons', 'details.cadre', 'details.badge', 'menu.ordinateur', 'typo.surtitre'];
const rayonDe = (x: CompositionHarmonie, dim: DimensionHarmonie) => etiquetteIngredient(dim, val(x, dim))?.rayon;

/** Accent servi comme texte (liens, boutons) et fond de page : AA ≥ 4,5:1 */
function couleursAA(x: CompositionHarmonie): { accent: string; fond: string } {
  const g = x.gamme ? gammeParId(x.gamme) : undefined;
  return { accent: g?.accent ?? x.couleur, fond: g?.fond ?? '#ffffff' };
}

/** Éléments expressifs FORTS présents (force ≥ 0,8) */
export function elementsExpressifsForts(x: CompositionHarmonie): { dim: DimensionHarmonie; valeur: string; force: number }[] {
  return DIMENSIONS_HARMONIE.map((dim) => ({ dim, valeur: val(x, dim) ?? '' })).map((o) => ({ ...o, force: etiquetteIngredient(o.dim, o.valeur)?.fort ?? 0 })).filter((o) => o.force >= 0.8);
}

/**
 * Règles DURES : jamais violées par un tirage harmonieux (seul « Hors règles » les lève ; les garde-fous du core, eux, restent).
 * Chaque violation nomme les dimensions en cause et des corrections.
 */
export function violationsDures(x: CompositionHarmonie, c?: ContexteHarmonie | null): ViolationHarmonie[] {
  const v: ViolationHarmonie[] = [];
  const p = pol(x);
  const echelle = val(x, 'typo.echelle');
  const casse = val(x, 'typo.casse');
  const densite = val(x, 'details.densite');
  // 1. Échelle spectaculaire : seulement avec une police d'affichage (ou condensée) et une respiration aérée
  if (echelle === 'spectaculaire' && p && !p.affichage) {
    v.push({ code: 'echelle-affichage', message: `Titres en échelle spectaculaire avec « ${p.nom} » (police de texte) : les très grands titres demandent une police d’affichage ou condensée.`, dims: ['typo.echelle', 'police'], corrections: [{ dim: 'typo.echelle', valeur: 'affirmee' }, { dim: 'police', valeur: 'affiche' }, { dim: 'police', valeur: 'condensee' }] });
  }
  if (echelle === 'spectaculaire' && densite === 'compacte') {
    v.push({ code: 'echelle-respiration', message: 'Titres spectaculaires dans une mise en page compacte : un très grand titre a besoin d’air autour.', dims: ['details.densite', 'typo.echelle'], corrections: [{ dim: 'details.densite', valeur: 'aeree' }, { dim: 'typo.echelle', valeur: 'affirmee' }] });
  }
  // 2. MAJUSCULES espacées : jamais sur une police ronde ou fantaisie, jamais sur les titres longs en très grand ni serrés
  if (casse === 'majuscules' && p?.fantaisie) {
    v.push({ code: 'majuscules-ronde', message: `MAJUSCULES espacées sur « ${p.nom} » : une police ronde ou fantaisie ne se compose pas en capitales.`, dims: ['typo.casse', 'police'], corrections: [{ dim: 'typo.casse', valeur: 'normale' }, { dim: 'typo.casse', valeur: 'petites-capitales' }] });
  }
  if (casse === 'majuscules' && echelle === 'spectaculaire') {
    v.push({ code: 'majuscules-longues', message: 'MAJUSCULES en échelle spectaculaire : les titres longs (« Pédicurie-podologie… ») deviennent illisibles, surtout sur téléphone.', dims: ['typo.casse', 'typo.echelle'], corrections: [{ dim: 'typo.casse', valeur: 'normale' }, { dim: 'typo.echelle', valeur: 'affirmee' }] });
  }
  if (casse === 'majuscules' && val(x, 'typo.interlettrage') === 'serre') {
    v.push({ code: 'majuscules-serrees', message: 'MAJUSCULES avec un interlettrage serré : les capitales doivent être espacées.', dims: ['typo.interlettrage', 'typo.casse'], corrections: [{ dim: 'typo.interlettrage', valeur: 'normal' }, { dim: 'typo.casse', valeur: 'normale' }] });
  }
  // 3. Ombre portée décalée « pop » : jamais avec une police élégante ni la structure Élégant et sobre
  if (val(x, 'details.ombres') === 'portee' && (p?.elegante || x.structure === 'elegant-sobre')) {
    v.push({ code: 'ombre-pop-elegant', message: `Ombre portée « pop » avec ${p?.elegante ? `la police élégante « ${p.nom} »` : 'la structure Élégant et sobre'} : registres incompatibles.`, dims: ['details.ombres'], corrections: [{ dim: 'details.ombres', valeur: 'aucune' }, { dim: 'details.ombres', valeur: 'douce' }] });
  }
  // 4. Rondeurs et « blobs » : jamais avec la structure Technique et précis ni la police mono
  if (x.structure === 'technique-precis' || x.police === 'mono') {
    for (const [dim, valeur] of RONDS) {
      if (val(x, dim) !== valeur) continue;
      v.push({ code: 'rond-technique', message: `« ${nomValeurHarmonie(dim, valeur)} » avec ${x.structure === 'technique-precis' ? 'la structure Technique et précis' : 'la police mono'} : les formes rondes et organiques cassent le registre technique.`, dims: [dim], corrections: [{ dim, valeur: dim === 'details.coins' ? 'carres' : NEUTRES[dim] ?? 'gabarit' }] });
    }
  }
  // 5. Registres expérimentaux : géométrique ↔ grotesques / condensées ; risographie ↔ slab / mono / grotesque
  const exp = val(x, 'experimental');
  if (exp === 'geometrique' && p && !['grotesque', 'condensee', 'geometrique'].includes(p.genre ?? '')) {
    v.push({ code: 'geometrique-police', message: `Illustrations géométriques avec « ${p.nom} » : ce registre appelle une grotesque, une géométrique ou une condensée.`, dims: ['police'], corrections: [{ dim: 'police', valeur: 'spatiale' }, { dim: 'police', valeur: 'condensee' }, { dim: 'police', valeur: 'grotesque' }] });
  }
  if (exp === 'riso' && p && !['slab', 'mono', 'grotesque'].includes(p.genre ?? '')) {
    v.push({ code: 'riso-police', message: `Risographie avec « ${p.nom} » : ce registre appelle une slab, une mono ou une grotesque.`, dims: ['police'], corrections: [{ dim: 'police', valeur: 'slab' }, { dim: 'police', valeur: 'grotesque' }, { dim: 'police', valeur: 'mono' }] });
  }
  // 6. Effets « Vivant » : jamais pour le diabète ni le senior
  const calmes = (c?.sujets ?? []).filter((s) => SUJETS_CALMES.includes(s));
  if (x.effets === 'vivant' && calmes.length) {
    v.push({ code: 'vivant-sujet', message: `Effets « Vivant » pour ${calmes.map((s) => (s === 'diabete' ? 'le diabète' : 'les seniors')).join(' et ')} : il faut rassurer, pas animer.`, dims: ['effets'], corrections: [{ dim: 'effets', valeur: 'doux' }, { dim: 'effets', valeur: 'sobre' }] });
  }
  // 6 bis. Animations d'en-tête : jamais très dynamiques pour le diabète ni le senior ; jamais pulsées en illustrations douces
  const anim = val(x, 'v.entete-anim');
  if (anim && ANIMATIONS_VIVES.includes(anim) && calmes.length) {
    v.push({ code: 'animation-calme', message: `Animation d’en-tête « ${nomValeurHarmonie('v.entete-anim', anim)} » pour ${calmes.map((s) => (s === 'diabete' ? 'le diabète' : 'les seniors')).join(' et ')} : trop vive, il faut rassurer.`, dims: ['v.entete-anim'], corrections: [{ dim: 'v.entete-anim', valeur: 'voute-trace' }, { dim: 'v.entete-anim', valeur: 'aucune' }] });
  }
  if (anim && ANIMATIONS_PULSEES.includes(anim) && x.visuels.style === 'pedagogique') {
    v.push({ code: 'pulse-pedagogique', message: `« ${nomValeurHarmonie('v.entete-anim', anim)} » avec les illustrations douces : en registre pédagogique, rien ne pulse.`, dims: ['v.entete-anim'], corrections: [{ dim: 'v.entete-anim', valeur: 'voute-trace' }, { dim: 'v.entete-anim', valeur: 'aucune' }] });
  }
  // 7. Deux familles de polices au plus (titres + texte ; la mono des données du registre relevé est la signature de la marque)
  if (!p && !PAIRES_POLICES.some((q) => q.id === x.police)) {
    v.push({ code: 'polices-familles', message: `Paire de polices inconnue (« ${x.police} ») : deux familles au plus, choisies dans le catalogue.`, dims: ['police'], corrections: [{ dim: 'police', valeur: 'grotesque' }] });
  }
  // 8. Un seul élément expressif FORT par écran (titre géant OU fond motif OU héros diaporama / photo plein écran…)
  const forts = elementsExpressifsForts(x);
  if (forts.length > 1) {
    const ordre = ['v.entete-anim', 'details.fond', 'typo.echelle', 'v.accueil', 'v.sections'];
    const trie = [...forts].sort((a, b) => ordre.indexOf(a.dim) - ordre.indexOf(b.dim));
    v.push({
      code: 'expressif', message: `Plusieurs éléments expressifs forts à la fois (${forts.map((f) => `« ${nomValeurHarmonie(f.dim, f.valeur)} »`).join(', ')}) : un seul par écran.`,
      dims: trie.map((f) => f.dim), corrections: trie.map((f) => ({ dim: f.dim, valeur: NEUTRES[f.dim] ?? 'gabarit' })),
    });
  }
  // 9. Contrastes AA (texte d'accent sur le fond de la page)
  const { accent, fond } = couleursAA(x);
  if (/^#[0-9a-f]{6}$/i.test(accent) && /^#[0-9a-f]{6}$/i.test(fond) && contrasteMemo(accent, fond) < 4.5) {
    v.push({ code: 'contraste-aa', message: `Contraste insuffisant entre l’accent ${accent} et le fond (${contraste(accent, fond).toFixed(2)}:1 < 4,5:1).`, dims: ['gamme'], corrections: [{ dim: 'gamme', valeur: 'encre' }, { dim: 'gamme', valeur: 'canard' }] });
  }
  // 10. Cohérence des coins : jamais d'angles carrés et très arrondis ensemble (même rayon partout)
  const rayons = DIMS_RAYON.map((dim) => ({ dim, r: rayonDe(x, dim) })).filter((o): o is { dim: string; r: 0 | 1 | 2 } => o.r !== undefined);
  const carres = rayons.filter((o) => o.r === 0), ronds = rayons.filter((o) => o.r === 2);
  if (carres.length && ronds.length) {
    // Le moins « structurant » se corrige : éléments ronds (boutons, cadre, forme) vers le neutre, sinon les coins
    const fautifs = [...ronds.filter((o) => o.dim !== 'details.coins'), ...carres.filter((o) => o.dim !== 'details.coins'), ...rayons.filter((o) => o.dim === 'details.coins')];
    v.push({
      code: 'coins-coherents', message: `Rayons incohérents : ${carres.map((o) => `« ${nomValeurHarmonie(o.dim, val(x, o.dim)!)} »`).join(', ')} avec ${ronds.map((o) => `« ${nomValeurHarmonie(o.dim, val(x, o.dim)!)} »`).join(', ')} (même rayon partout).`,
      dims: fautifs.map((o) => o.dim), corrections: fautifs.map((o) => ({ dim: o.dim, valeur: o.dim === 'details.coins' ? 'arrondis' : NEUTRES[o.dim] ?? 'gabarit' })),
    });
  }
  return v;
}

// ---------------------------------------------------------------------------------------------------------------
// Règles souples (scores) et score d'harmonie
// ---------------------------------------------------------------------------------------------------------------

/**
 * Accord structure × style d'illustration : a priori tirés des 132 notes de l'atelier (retours/atelier-notes.json, 2026-10-07) :
 * Technique + relevé 4,1 ★, Élégant + trait fin 4,0 ★ ; photos sur Clair ou Technique 2,7-2,8 ★ ; Élégant + relevé 2,5 ★.
 */
const ACCORD_STRUCTURE_STYLE: Record<string, number> = {
  'technique-precis|releve': 1, 'elegant-sobre|ligne': 1, 'clair-pratique|releve': 0.75, 'elegant-sobre|pedagogique': 0.75, 'simple-proche|pedagogique': 0.7,
  'clair-pratique|pedagogique': 0.65, 'simple-proche|ligne': 0.65, 'clair-pratique|ligne': 0.65, 'elegant-sobre|photos': 0.6, 'technique-precis|photos': 0.45,
  'clair-pratique|photos': 0.4, 'elegant-sobre|releve': 0.35, 'simple-proche|releve': 0.25, 'simple-proche|photos': 0.3,
};

export type ConseilHarmonie = { code: string; message: string; dims: DimensionHarmonie[]; corrections: CorrectionHarmonie[] };
export type ScoreHarmonie = {
  /** 0-100 ; une violation dure plafonne le score à 45 */
  score: number;
  famille: IdFamilleStyle;
  nomFamille: string;
  /** Familles les plus proches (score de cohérence 0-1) */
  familles: { id: IdFamilleStyle; coherence: number }[];
  violations: ViolationHarmonie[];
  conseils: ConseilHarmonie[];
  /** Composantes souples (0-1) */
  composantes: Record<string, number>;
};

/** Dimensions présentes (valeur lue) */
const presentes = (x: CompositionHarmonie) => DIMENSIONS_HARMONIE.map((d) => [d, val(x, d)] as const).filter((e): e is readonly [string, string] => e[1] !== undefined && e[1] !== '');

/** Cohérence (0-1) d'une composition avec une famille : préféré 1, admis 0,65, exclu 0 ; ingrédients neutres ignorés */
export function coherenceFamille(x: CompositionHarmonie, f: IdFamilleStyle, ignorer: readonly DimensionHarmonie[] = []): number {
  let s = 0, n = 0;
  for (const [d, v] of presentes(x)) {
    if (ignorer.includes(d)) continue;
    const e = etiquetteIngredient(d, v);
    if (!e || e.neutre) continue;
    const k = compatibiliteFamille(d, v, f);
    // Ingrédients qui portent le style (police, détails, structure, premier écran, effets) : poids double
    const w = ['police', 'details.jeu', 'structure', 'v.accueil', 'effets', 'style', 'gamme'].includes(d) ? 2 : 1;
    s += w * (k === 'prefere' ? 1 : k === 'admis' ? 0.65 : 0);
    n += w;
  }
  return n ? s / n : 0.65;
}

const moyenneProfil = (x: CompositionHarmonie, dims: readonly DimensionHarmonie[], a: AttributHarmonie): number | null => {
  const l = dims.map((d) => etiquetteIngredient(d, val(x, d))?.p[a]).filter((n): n is number => typeof n === 'number');
  return l.length ? l.reduce((s, n) => s + n, 0) / l.length : null;
};
const accord = (a: number | null, b: number | null) => (a === null || b === null ? null : 1 - Math.min(2, Math.abs(a - b)) / 2);

/** Famille dominante (cohérence maximale, apprentissage en départage) */
export function familleDominante(x: CompositionHarmonie, c?: ContexteHarmonie | null, ignorer: readonly DimensionHarmonie[] = []): { id: IdFamilleStyle; coherence: number }[] {
  const ph = poidsHarmonie(c);
  return FAMILLES_STYLE.map((f) => ({ id: f.id, coherence: coherenceFamille(x, f.id, ignorer) + 0.02 * (ph.familles[f.id] ?? 0) }))
    .sort((a, b) => b.coherence - a.coherence || FAMILLES_STYLE.findIndex((f) => f.id === a.id) - FAMILLES_STYLE.findIndex((f) => f.id === b.id));
}

/** Score d'harmonie d'une recette : score 0-100, violations dures, conseils (avec corrections), famille dominante */
export function scoreHarmonie(x: CompositionHarmonie, c?: ContexteHarmonie | null): ScoreHarmonie {
  const violations = violationsDures(x, c);
  const fams = familleDominante(x, c);
  const fam = fams[0].id;
  const conseils: ConseilHarmonie[] = [];
  const comp: Record<string, number> = {};
  comp.coherence = fams[0].coherence;

  // Températures : gamme ↔ traitement photo (style photos) ↔ style d'illustration
  const tGamme = x.gamme ? etiquetteIngredient('gamme', x.gamme)?.p.t ?? 0 : temperatureCouleur(x.couleur);
  const tVisuel = x.visuels.style === 'photos' ? etiquetteIngredient('traitement', x.traitement?.id)?.p.t ?? null : etiquetteIngredient('style', x.visuels.style)?.p.t ?? null;
  const aT = accord(tGamme, tVisuel);
  if (aT !== null) {
    comp.temperature = aT;
    if (aT < 0.55) {
      const chaud = tGamme > 0;
      const corr: CorrectionHarmonie[] = x.visuels.style === 'photos' ? [{ dim: 'traitement', valeur: chaud ? 'chaud-doux' : 'mat' }, { dim: 'traitement', valeur: 'voile' }] : [];
      conseils.push({ code: 'temperature', message: `Couleurs ${chaud ? 'chaudes' : 'froides'} (${x.gamme ? nomValeurHarmonie('gamme', x.gamme) : 'couleur libre'}) et ${x.visuels.style === 'photos' ? `photos « ${nomValeurHarmonie('traitement', x.traitement?.id ?? 'modele')} »` : `illustrations « ${nomValeurHarmonie('style', x.visuels.style)} »`} ${chaud ? 'froides' : 'chaudes'} : accorder les températures${corr.length ? ` (essayer « ${nomValeurHarmonie('traitement', corr[0].valeur)} »)` : ''}.`, dims: ['traitement', 'gamme'], corrections: corr });
    }
  }
  // Rondeur : police ↔ coins, formes, boutons, cadres
  const rPolice = etiquetteIngredient('police', x.police)?.p.r ?? null;
  const rFormes = moyenneProfil(x, ['details.coins', 'v.soins-forme', 'details.boutons', 'details.cadre'], 'r');
  const aR = accord(rPolice, rFormes);
  if (aR !== null) {
    comp.rondeur = aR;
    if (aR < 0.55 && rPolice !== null && rFormes !== null) {
      const ronde = rPolice > rFormes;
      conseils.push({
        code: 'rondeur', message: ronde ? `La police « ${pol(x)?.nom ?? x.police} » est ronde mais les angles sont carrés : essayer « Coins arrondis ».` : `La police « ${pol(x)?.nom ?? x.police} » est anguleuse mais les formes sont très rondes : essayer « Coins carrés » ou des cartes sans bulles.`,
        dims: ['details.coins', 'police'], corrections: ronde ? [{ dim: 'details.coins', valeur: 'arrondis' }] : [{ dim: 'details.coins', valeur: 'carres' }, { dim: 'v.soins-forme', valeur: 'gabarit' }],
      });
    }
  }
  // Densité : respiration (détails) ↔ structure ↔ présentation des sujets
  const dStructure = moyenneProfil(x, ['structure', 'v.sujets', 'v.soins'], 'd');
  const dDetails = etiquetteIngredient('details.densite', val(x, 'details.densite'))?.p.d ?? null;
  const aD = accord(dStructure, dDetails);
  if (aD !== null) {
    comp.densite = aD;
    if (aD < 0.55 && dStructure !== null && dDetails !== null) {
      const dense = dStructure > dDetails;
      // Respiration la plus proche de la mise en page (compacte 1, aérée −0,2, très aérée −1)
      const cible = dStructure > 0.4 ? 'compacte' : dStructure < -0.6 ? 'tres-aeree' : 'aeree';
      conseils.push({ code: 'densite', message: `Mise en page plutôt ${dense ? 'dense' : 'aérée'} (${nomValeurHarmonie('structure', x.structure)}) et respiration « ${nomValeurHarmonie('details.densite', val(x, 'details.densite')!)} » : essayer « ${nomValeurHarmonie('details.densite', cible)} ».`, dims: ['details.densite'], corrections: [{ dim: 'details.densite', valeur: cible }] });
    }
  }
  // Structure × style (notes de l'atelier)
  const aSS = ACCORD_STRUCTURE_STYLE[`${x.structure}|${x.visuels.style}`];
  if (aSS !== undefined) {
    comp.structureStyle = aSS;
    if (aSS < 0.5) {
      const mieux = Object.entries(ACCORD_STRUCTURE_STYLE).filter(([k, s]) => k.startsWith(`${x.structure}|`) && s >= 0.65).sort((a, b) => b[1] - a[1])[0]?.[0].split('|')[1];
      conseils.push({ code: 'structure-style', message: `« ${nomValeurHarmonie('style', x.visuels.style)} » sur la structure « ${nomValeurHarmonie('structure', x.structure)} » : combinaison moins aimée dans l’atelier${mieux ? ` ; essayer « ${nomValeurHarmonie('style', mieux)} »` : ''}.`, dims: ['style'], corrections: mieux ? [{ dim: 'style', valeur: mieux }] : [] });
    }
  }
  // Expressivité : un peu de caractère, jamais trop (somme des forces)
  const expr = DIMENSIONS_HARMONIE.reduce((s, d) => s + (etiquetteIngredient(d, val(x, d))?.fort ?? 0), 0);
  comp.expressivite = expr < 0.4 ? 0.8 : expr <= 2 ? 1 : Math.max(0.3, 1 - (expr - 2) * 0.35);
  if (expr > 2.2) conseils.push({ code: 'trop-charge', message: 'Beaucoup d’effets de caractère à la fois (ombres portées, cadres décalés, transitions…) : en retirer un.', dims: ['details.cadre', 'details.ombres'], corrections: [{ dim: 'details.cadre', valeur: 'aucun' }, { dim: 'details.ombres', valeur: 'aucune' }] });

  // Ingrédients qui sortent de la famille dominante (deux au plus, les plus visibles d'abord)
  const hors = presentes(x).filter(([d, v]) => compatibiliteFamille(d, v, fam) === 'exclu');
  for (const [d, v] of hors.slice(0, 2)) {
    const alt = valeursDimensionHarmonie(d).filter((w) => compatibiliteFamille(d, w, fam) === 'prefere' && w !== v)[0];
    conseils.push({ code: 'hors-famille', message: `« ${nomValeurHarmonie(d, v)} » sort de la famille ${familleStyle(fam)!.nom}${alt ? ` : essayer « ${nomValeurHarmonie(d, alt)} »` : ''}.`, dims: [d], corrections: alt ? [{ dim: d, valeur: alt }] : [] });
  }

  // Apprentissage (souple) : notes de Paul par famille et par ingrédient, ±5 points au plus
  const ph = poidsHarmonie(c);
  const appris = Math.max(-1, Math.min(1, ((ph.familles[fam] ?? 0) + presentes(x).reduce((s, [d, v]) => s + (ph.ingredients[`${d}:${v}`] ?? 0), 0) / 4 + effetPairesComposition(ph, x) / 4) / PLAFOND_HARMONIE));

  const POIDS: Record<string, number> = { coherence: 4, temperature: 1.2, rondeur: 1.5, densite: 1, structureStyle: 1.5, expressivite: 1 };
  const k = Object.keys(comp);
  const brut = k.reduce((s, n) => s + POIDS[n] * comp[n], 0) / k.reduce((s, n) => s + POIDS[n], 0);
  let score = Math.round(100 * brut + 5 * appris);
  if (violations.length) score = Math.min(score, 45) - 8 * (violations.length - 1);
  score = Math.max(0, Math.min(100, score));
  return { score, famille: fam, nomFamille: familleStyle(fam)!.nom, familles: fams.slice(0, 3), violations, conseils, composantes: comp };
}

// ---------------------------------------------------------------------------------------------------------------
// Apprentissage (poids souples seulement)
// ---------------------------------------------------------------------------------------------------------------

/** Poids appris : effet en étoiles (± PLAFOND_HARMONIE) par famille et par ingrédient `<dimension>:<valeur>` */
export type PoidsHarmonie = { familles: Partial<Record<IdFamilleStyle, number>>; ingredients: Record<string, number>; /** Paires `<dimA>:<va>&<dimB>:<vb>` (PAIRES_HARMONIE) */ paires?: Record<string, number> };
/** Apprentissage des recettes complètes (notation-recettes.ts) : global et par sujet n° 1 */
export type ApprisHarmonie = { global: PoidsHarmonie; sujets?: Record<string, PoidsHarmonie> };
export const PLAFOND_HARMONIE = 0.75;
export const LISSAGE_HARMONIE = 6;

/** Clés apprises de l'atelier (atelier-poids.ts, renforts des recettes compris) qui correspondent à une dimension */
const CLES_ATELIER: Record<string, (v: string) => string> = {
  police: (v) => `police=${v}`, structure: (v) => `structure=${v}`, gamme: (v) => `gamme=${v}`, style: (v) => `style=${v}`, effets: (v) => `effets=${v}`, 'details.jeu': (v) => `details=jeu:${v}`,
};
const cleAtelier = (dim: DimensionHarmonie, v: string): string => {
  if (CLES_ATELIER[dim]) return CLES_ATELIER[dim](v);
  const [g, k] = dim.split('.');
  if (g === 'v') return `variante=${k}:${v}`;
  return `${g}=${k}:${v}`;
};
/** Effet appris (atelier) d'un ingrédient */
export const effetApprisHarmonie = (c: ContexteHarmonie | null | undefined, dim: DimensionHarmonie, v: string) => c?.poids?.effets?.[cleAtelier(dim, v)] ?? 0;

/**
 * Poids d'harmonie du contexte : ceux fournis (apprendreHarmonie), sinon dérivés des effets de l'atelier : une famille vaut la moyenne
 * des effets de ses ingrédients préférés notés, plafonnée.
 */
export function poidsHarmonie(c?: ContexteHarmonie | null): PoidsHarmonie {
  const base = poidsHarmonieBase(c);
  const appris = c?.poids?.harmonie;
  if (!appris) return base;
  // Mémoïsé : poidsHarmonie est appelé à chaque score (mêmes objets de poids tout au long d'un tirage)
  const sujet = c?.sujets?.[0] ?? 'cabinet';
  let parBase = CACHE_FUSION.get(appris);
  if (!parBase) { parBase = new WeakMap(); CACHE_FUSION.set(appris, parBase); }
  let parSujet = parBase.get(base);
  if (!parSujet) { parSujet = new Map(); parBase.set(base, parSujet); }
  let r = parSujet.get(sujet);
  if (!r) { r = fusionPoidsHarmonie(base, appris, sujet); parSujet.set(sujet, r); }
  return r;
}
const CACHE_FUSION = new WeakMap<ApprisHarmonie, WeakMap<PoidsHarmonie, Map<string, PoidsHarmonie>>>();
const CACHE_BASE = new WeakMap<object, PoidsHarmonie>();
const VIDE_HARMONIE: PoidsHarmonie = { familles: {}, ingredients: {} };

/** Poids d'harmonie fournis, sinon dérivés des effets de l'atelier (mémoïsés par objet d'effets) */
function poidsHarmonieBase(c?: ContexteHarmonie | null): PoidsHarmonie {
  if (c?.poidsHarmonie) return c.poidsHarmonie;
  const effets = c?.poids?.effets;
  if (!effets) return VIDE_HARMONIE;
  const deja = CACHE_BASE.get(effets);
  if (deja) return deja;
  const familles: Partial<Record<IdFamilleStyle, number>> = {};
  for (const f of FAMILLES_STYLE) {
    const l: number[] = [];
    for (const [k, e] of Object.entries(ETIQUETTES_HARMONIE)) {
      if (!e.pref?.includes(f.id)) continue;
      const i = k.indexOf(':');
      const x = effets[cleAtelier(k.slice(0, i), k.slice(i + 1))];
      if (typeof x === 'number') l.push(x);
    }
    if (l.length) familles[f.id] = borne(l.reduce((s, n) => s + n, 0) / (l.length + LISSAGE_HARMONIE / 3));
  }
  const r: PoidsHarmonie = { familles, ingredients: {} };
  CACHE_BASE.set(effets, r);
  return r;
}

/**
 * Apprentissage des recettes complètes (notation-recettes.ts) ajouté aux poids d'harmonie : effet global + effet du sujet n° 1, pour
 * chaque famille, ingrédient `<dim>:<valeur>` et paire `<dim>:<v>&<dim>:<v>` ; somme bornée (familles et ingrédients ±1 ★, paires
 * ±0,75 ★). Les règles DURES ne sont jamais touchées : ces poids ne font que pondérer des valeurs déjà compatibles.
 */
export function fusionPoidsHarmonie(base: PoidsHarmonie, appris: ApprisHarmonie, sujet: string): PoidsHarmonie {
  const sj = appris.sujets?.[sujet];
  const somme = (a: Record<string, number> | undefined, b: Record<string, number> | undefined, c: Record<string, number> | undefined, plafond: number) => {
    const r: Record<string, number> = {};
    for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {}), ...Object.keys(c ?? {})])) {
      const v = Math.round(Math.max(-plafond, Math.min(plafond, (a?.[k] ?? 0) + (b?.[k] ?? 0) + (c?.[k] ?? 0))) * 1000) / 1000;
      if (v) r[k] = v;
    }
    return r;
  };
  return {
    familles: somme(base.familles as Record<string, number>, appris.global.familles as Record<string, number>, sj?.familles as Record<string, number> | undefined, 1) as Partial<Record<IdFamilleStyle, number>>,
    ingredients: somme(base.ingredients, appris.global.ingredients, sj?.ingredients, 1),
    paires: somme(base.paires, appris.global.paires, sj?.paires, 0.75),
  };
}

/**
 * Paires d'ingrédients apprises (combinaisons, demande de Paul du 2026-10-08) : une note de recette complète renforce aussi chaque
 * PAIRE de ses ingrédients parmi ces couples de dimensions. Clé : `<dimA>:<va>&<dimB>:<vb>` (dimensions dans cet ordre).
 */
export const PAIRES_HARMONIE: readonly (readonly [DimensionHarmonie, DimensionHarmonie])[] = [
  ['gamme', 'police'], ['style', 'structure'], ['police', 'structure'], ['v.accueil', 'gamme'], ['style', 'gamme'], ['gamme', 'structure'],
  ['style', 'police'], ['police', 'details.jeu'], ['details.jeu', 'gamme'], ['v.accueil', 'police'], ['v.accueil', 'structure'],
  ['traitement', 'gamme'], ['effets', 'v.accueil'], ['police', 'typo.casse'], ['menu.ordinateur', 'structure'], ['v.sujets', 'structure'],
];
export const clePaireHarmonie = (a: DimensionHarmonie, va: string, b: DimensionHarmonie, vb: string) => `${a}:${va}&${b}:${vb}`;

/** Somme des effets de paires appris qui relient la valeur `v` de `dim` aux valeurs actuelles de `x` */
export function effetPairesHarmonie(ph: PoidsHarmonie, dim: DimensionHarmonie, v: string, x: CompositionHarmonie): number {
  if (!ph.paires) return 0;
  let s = 0;
  for (const [a, b] of PAIRES_HARMONIE) {
    if (a === dim) { const w = val(x, b); if (w) s += ph.paires[clePaireHarmonie(a, v, b, w)] ?? 0; }
    else if (b === dim) { const w = val(x, a); if (w) s += ph.paires[clePaireHarmonie(a, w, b, v)] ?? 0; }
  }
  return s;
}

/** Somme des effets de paires appris présents dans une composition */
export function effetPairesComposition(ph: PoidsHarmonie, x: CompositionHarmonie): number {
  if (!ph.paires) return 0;
  let s = 0;
  for (const [a, b] of PAIRES_HARMONIE) { const va = val(x, a), vb = val(x, b); if (va && vb) s += ph.paires[clePaireHarmonie(a, va, b, vb)] ?? 0; }
  return s;
}

/**
 * Bonus appris (étoiles, borné ±1,5) d'une combinaison du générateur des praticiens (propositions.ts : structure × style × gamme)
 * d'après les recettes complètes notées : ingrédients et paires entre ces trois dimensions, globaux + sujet n° 1.
 */
export function bonusRecettesApprises(appris: ApprisHarmonie | null | undefined, sujet: string, valeurs: Partial<Record<DimensionHarmonie, string>>): number {
  if (!appris) return 0;
  const ph = fusionPoidsHarmonie(VIDE_HARMONIE, appris, sujet);
  let b = 0;
  for (const [d, v] of Object.entries(valeurs)) if (v) b += 0.5 * (ph.ingredients[`${d}:${v}`] ?? 0);
  for (const [a, c] of PAIRES_HARMONIE) { const va = valeurs[a], vc = valeurs[c]; if (va && vc) b += 0.5 * (ph.paires?.[clePaireHarmonie(a, va, c, vc)] ?? 0); }
  return Math.round(Math.max(-1.5, Math.min(1.5, b)) * 1000) / 1000;
}

const borne = (n: number) => Math.max(-PLAFOND_HARMONIE, Math.min(PLAFOND_HARMONIE, Math.round(n * 1000) / 1000));

/**
 * Apprentissage depuis les notes de Paul (recettes du studio, combinaisons de l'atelier) : chaque note (1-5) renforce ou affaiblit
 * la famille dominante de sa composition et chacun de ses ingrédients étiquetés : effet = Σ (note − μ) / (n + lissage), plafonné à
 * ±0,75 ★. Les règles DURES ne sont jamais touchées.
 */
export function apprendreHarmonie(notes: readonly { note: number; composition: CompositionHarmonie; sujets?: readonly string[] }[], mu = 3): PoidsHarmonie {
  const fam: Record<string, { s: number; n: number }> = {};
  const ing: Record<string, { s: number; n: number }> = {};
  const add = (o: Record<string, { s: number; n: number }>, k: string, d: number) => { o[k] = { s: (o[k]?.s ?? 0) + d, n: (o[k]?.n ?? 0) + 1 }; };
  for (const n of notes) {
    if (!(n.note >= 1 && n.note <= 5)) continue;
    const d = n.note - mu;
    add(fam, familleDominante(n.composition)[0].id, d);
    for (const [dim, v] of presentes(n.composition)) if (ETIQUETTES_HARMONIE[`${dim}:${v}`]) add(ing, `${dim}:${v}`, d);
  }
  const fin = (o: Record<string, { s: number; n: number }>) => Object.fromEntries(Object.entries(o).map(([k, { s, n }]) => [k, borne(s / (n + LISSAGE_HARMONIE))]).filter(([, e]) => e !== 0));
  return { familles: fin(fam) as Partial<Record<IdFamilleStyle, number>>, ingredients: fin(ing) };
}

// ---------------------------------------------------------------------------------------------------------------
// Tirage harmonieux
// ---------------------------------------------------------------------------------------------------------------

function hache(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function alea(graine: number, sel = ''): () => number {
  let a = (hache(`${graine}|${sel}`) + 0x6d2b79f5) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function choisir<T>(l: readonly { v: T; p: number }[], r: () => number): T | undefined {
  const total = l.reduce((s, x) => s + Math.max(0, x.p), 0);
  if (!l.length) return undefined;
  if (total <= 0) return l[Math.floor(r() * l.length)].v;
  let x = r() * total;
  for (const e of l) { x -= Math.max(0, e.p); if (x < 0) return e.v; }
  return l[l.length - 1].v;
}
const masse = (effet: number) => 2 ** Math.max(-3, Math.min(2, effet));

/**
 * Outils fournis par recettes.ts (garde-fous du core) : `brut` = tirage sans les règles d'harmonie (verrous, AA, diabète, photos…),
 * `reparer` = reparerComposition, `permis` = valeurs permises par les garde-fous pour une dimension (structures du sujet, styles de
 * la structure, gammes non exclues, premiers écrans du gabarit) ou null (toutes).
 */
export type OutilsTirage<T> = {
  brut: (x: T, graine: number) => T;
  reparer: (x: T) => T;
  permis?: (dim: DimensionHarmonie, x: T) => readonly string[] | null;
};
const outilsNeutres = <T>(): OutilsTirage<T> => ({ brut: (x) => x, reparer: (x) => x });

/** Familles compatibles avec ce qui est verrouillé (aucun ingrédient verrouillé exclu), pondérées par sujet et apprentissage */
export function famillesPossibles(x: CompositionHarmonie, verrous: readonly string[], c?: ContexteHarmonie | null): { id: IdFamilleStyle; p: number }[] {
  const figees = presentes(x).filter(([d]) => estVerrouilleeHarmonie(d, verrous));
  const ph = poidsHarmonie(c);
  const sujets = (c?.sujets ?? []).filter((s) => FAMILLES_PAR_SUJET[s]);
  const prior = (f: IdFamilleStyle) => {
    const s1 = FAMILLES_PAR_SUJET[sujets[0] ?? 'cabinet'];
    const s2 = sujets[1] ? FAMILLES_PAR_SUJET[sujets[1]] : null;
    return (s1[f] ?? 1) + 0.3 * (s2?.[f] ?? 0);
  };
  const toutes = FAMILLES_STYLE.map((f) => ({ id: f.id, exclus: figees.filter(([d, v]) => compatibiliteFamille(d, v, f.id) === 'exclu').length, p: prior(f.id) * masse(2 * (ph.familles[f.id] ?? 0)) }));
  const min = Math.min(...toutes.map((f) => f.exclus));
  return toutes.filter((f) => f.exclus === min).map(({ id, p }) => ({ id, p }));
}

/** Choix d'une famille pour « Tout changer » : sujet n° 1, notes, verrous (déterministe pour une graine) */
export function choisirFamille(x: CompositionHarmonie, verrous: readonly string[], c: ContexteHarmonie | null | undefined, graine: number): IdFamilleStyle {
  return choisir(famillesPossibles(x, verrous, c).map((f) => ({ v: f.id, p: f.p })), alea(graine, 'famille')) ?? 'classique-sobre';
}

/** Interdit par le contexte (règle dure liée au sujet) */
const interditContexte = (dim: DimensionHarmonie, v: string, c?: ContexteHarmonie | null) =>
  dim === 'effets' && v === 'vivant' && (c?.sujets ?? []).some((s) => SUJETS_CALMES.includes(s));

/** Une valeur pour une dimension dans une famille : préférées ×3, admises ×1, exclues jamais ; notes apprises en masse */
function valeurDansFamille<T extends CompositionHarmonie>(dim: DimensionHarmonie, f: IdFamilleStyle, x: T, c: ContexteHarmonie | null | undefined, r: () => number, outils: OutilsTirage<T>): string | undefined {
  const permis = outils.permis?.(dim, x) ?? null;
  const base = permis ? [...permis] : valeursDimensionHarmonie(dim);
  const ph = poidsHarmonie(c);
  const l = base.filter((v) => compatibiliteFamille(dim, v, f) !== 'exclu' && !interditContexte(dim, v, c))
    .map((v) => ({ v, p: (compatibiliteFamille(dim, v, f) === 'prefere' ? 4 : (etiquetteIngredient(dim, v)?.neutre ?? true) ? 2 : 1) * masse(effetApprisHarmonie(c, dim, v) + (ph.ingredients[`${dim}:${v}`] ?? 0) + effetPairesHarmonie(ph, dim, v, x)) }));
  return choisir(l, r);
}

/** Ordre de projection : la structure et le style d'abord (ils conditionnent les valeurs permises), puis le reste */
/** Dimensions qui portent le style (une valeur seulement « admise » y est re-tirée : la famille doit se voir) */
const DIMS_PORTEUSES: readonly DimensionHarmonie[] = ['structure', 'police', 'details.jeu', 'v.accueil', 'effets', 'style'];
const ORDRE_PROJECTION: readonly DimensionHarmonie[] = ['structure', 'style', 'gamme', 'police', 'details.jeu', ...DIMENSIONS_HARMONIE.filter((d) => !['structure', 'style', 'gamme', 'police', 'details.jeu', 'experimental'].includes(d))];

/**
 * Projette une composition sur une famille : chaque dimension NON verrouillée (et présente, ou structurante) dont la valeur sort de
 * la famille est re-tirée parmi les valeurs compatibles ; une valeur préférée ou admise est gardée une fois sur deux environ
 * (le tirage brut porte déjà les notes de Paul et les garde-fous). Seules les dimensions de `dims` sont touchées.
 */
function projeter<T extends CompositionHarmonie>(x: T, f: IdFamilleStyle, verrous: readonly string[], c: ContexteHarmonie | null | undefined, r: () => number, outils: OutilsTirage<T>, dims: readonly DimensionHarmonie[] = ORDRE_PROJECTION): T {
  let y = x;
  const garder = DIMENSIONS_HARMONIE.filter((d) => estVerrouilleeHarmonie(d, verrous));
  for (const d of ORDRE_PROJECTION) {
    if (!dims.includes(d) || estVerrouilleeHarmonie(d, verrous)) continue;
    const v = val(y, d);
    // Dimensions absentes (habillage d'une ancienne recette, variante non tirée) : seulement le jeu de détails et la typo
    if (v === undefined && !(d === 'details.jeu' || d.startsWith('typo.') || d === 'gamme')) continue;
    if (d === 'gamme' && !y.gamme && compatibiliteFamille('gamme-libre', y.couleur, f) !== 'exclu' && r() < 0.6) continue;
    const k = v === undefined ? 'exclu' : compatibiliteFamille(d, v, f);
    // Éléments d'un jeu de détails tiré : ceux du jeu sont gardés (le jeu est un ensemble cohérent) sauf s'ils sortent de la famille
    const duJeu = d.startsWith('details.') && d !== 'details.jeu' && v !== undefined && JEUX_DETAILS_H[val(y, 'details.jeu') ?? '']?.[d.slice(8)] === v;
    const garde = k === 'exclu' ? 0 : duJeu ? 1 : k === 'prefere' ? 0.6 : DIMS_PORTEUSES.includes(d) ? 0 : 0.25;
    if (r() < garde && !interditContexte(d, v ?? '', c)) continue;
    const w = valeurDansFamille(d, f, y, c, r, outils);
    if (w !== undefined && w !== v) y = ecrireDimension(y, d, w, garder);
    // Après la structure ou le style : garde-fous du core (styles permis, variantes du gabarit)
    if (d === 'structure' || d === 'style' || d === 'details.jeu') y = outils.reparer(y);
  }
  return outils.reparer(y);
}

/**
 * Corrige les violations dures en touchant SEULEMENT les dimensions non verrouillées (de `dims`) : première correction possible de
 * chaque violation ; en dernier recours, la dimension fautive repasse à sa valeur neutre. Les verrous ne sont jamais levés.
 */
export function reparerHarmonie<T extends CompositionHarmonie>(x: T, verrous: readonly string[], c?: ContexteHarmonie | null, outils: OutilsTirage<T> = outilsNeutres<T>(), dims: readonly DimensionHarmonie[] = DIMENSIONS_HARMONIE): T {
  let y = x;
  const libre = (d: DimensionHarmonie) => dims.includes(d) && !estVerrouilleeHarmonie(d, verrous);
  for (let i = 0; i < 12; i++) {
    const v = violationsDures(y, c);
    if (!v.length) return y;
    let change = false;
    for (const viol of v) {
      const permis = (corr: CorrectionHarmonie) => { const l = outils.permis?.(corr.dim, y) ?? null; return !l || l.includes(corr.valeur); };
      const corr = viol.corrections.find((k) => libre(k.dim) && val(y, k.dim) !== k.valeur && permis(k));
      if (corr) { y = applique(y, corr, outils); change = true; break; }
      // Dernier recours : la première dimension fautive libre passe au neutre (premier écran : une valeur permise non expressive)
      const d = viol.dims.find(libre);
      if (d) {
        const neutre = d === 'v.accueil' ? (outils.permis?.(d, y) ?? ['carte']).find((w) => (etiquetteIngredient(d, w)?.fort ?? 0) < 0.8) ?? '' : NEUTRES[d] ?? 'gabarit';
        if (val(y, d) !== neutre) { y = applique(y, { dim: d, valeur: neutre }, outils); change = true; break; }
      }
    }
    if (!change) return y;
  }
  return y;
}
const applique = <T extends CompositionHarmonie>(x: T, k: CorrectionHarmonie, outils: OutilsTirage<T>): T => outils.reparer(ecrireDimension(x, k.dim, k.valeur));

/**
 * Accords souples : applique les corrections des conseils (dimensions libres seulement) tant qu'elles améliorent le score sans
 * créer de violation (deux passes, cinq essais au plus) : le hasard reste, les désaccords les plus visibles partent.
 */
export function ameliorer<T extends CompositionHarmonie>(x: T, verrous: readonly string[], c?: ContexteHarmonie | null, outils: OutilsTirage<T> = outilsNeutres<T>(), dims: readonly DimensionHarmonie[] = DIMENSIONS_HARMONIE): T {
  let y = x;
  let s = scoreHarmonie(y, c);
  for (let i = 0; i < 2; i++) {
    if (!s.conseils.length || s.score >= 88) break;
    let mieux: { y: T; s: ScoreHarmonie } | null = null;
    for (const k of s.conseils.flatMap((co) => co.corrections).slice(0, 5)) {
      if (!dims.includes(k.dim) || estVerrouilleeHarmonie(k.dim, verrous) || lireDimension(y, k.dim) === k.valeur) continue;
      const l = outils.permis?.(k.dim, y) ?? null;
      if (l && !l.includes(k.valeur)) continue;
      const z = applique(y, k, outils);
      const sz = scoreHarmonie(z, c);
      if (!sz.violations.length && sz.score > (mieux?.s.score ?? s.score)) mieux = { y: z, s: sz };
    }
    if (!mieux) break;
    ({ y, s } = mieux);
  }
  return y;
}

/**
 * Harmonie d'une combinaison du générateur des praticiens (propositions.ts : structure × style × gamme), 0-1 : cohérence avec la
 * meilleure famille, accord structure × style (notes de l'atelier) et accord des températures gamme ↔ illustrations.
 */
export function harmonieCombinaison(structure: string, style: string, gamme: string): number {
  const x: CompositionHarmonie = { structure, gamme, couleur: gammeParId(gamme)?.accent ?? '#000000', police: '', visuels: { style }, sections: { variantes: {} }, effets: '' };
  const coh = Math.max(...FAMILLES_STYLE.map((f) => coherenceFamille(x, f.id)));
  const ss = ACCORD_STRUCTURE_STYLE[`${structure}|${style}`] ?? 0.6;
  const t = accord(etiquetteIngredient('gamme', gamme)?.p.t ?? 0, etiquetteIngredient('style', style)?.p.t ?? null) ?? 0.8;
  return Math.round(((2 * coh + 2 * ss + t) / 5) * 1000) / 1000;
}

/** Corrige UNE violation ou UN conseil (bouton « Corriger » du studio) : première correction applicable */
export function corrigerHarmonie<T extends CompositionHarmonie>(x: T, item: Pick<ViolationHarmonie, 'corrections' | 'dims'>, outils: OutilsTirage<T> = outilsNeutres<T>()): T {
  for (const k of item.corrections) {
    const l = outils.permis?.(k.dim, x) ?? null;
    if (l && !l.includes(k.valeur)) continue;
    const y = applique(x, k, outils);
    if (JSON.stringify(y) !== JSON.stringify(x)) return y;
  }
  return x;
}

/**
 * Tire une composition DANS une famille : tirage brut (garde-fous du core, verrous), projection sur la famille, réparation des règles
 * dures ; quelques essais, le meilleur score sans violation est gardé. Déterministe pour une graine.
 */
export function tirerDansFamille<T extends CompositionHarmonie>(f: IdFamilleStyle, x: T, verrous: readonly string[], c: ContexteHarmonie | null | undefined, graine: number, outils: OutilsTirage<T> = outilsNeutres<T>()): T {
  let meilleur: { y: T; s: number } | null = null;
  for (let essai = 0; essai < 4; essai++) {
    const g = hache(`${graine}|${f}|${essai}`);
    let y = outils.brut(x, g);
    y = projeter(y, f, verrous, c, alea(g, 'projection'), outils);
    y = reparerHarmonie(y, verrous, c, outils);
    y = ameliorer(y, verrous, c, outils);
    const s = scoreHarmonie(y, c);
    const note = s.score - (s.violations.length ? 100 : 0) + (s.famille === f ? 5 : 0);
    if (!meilleur || note > meilleur.s) meilleur = { y, s: note };
    if (!s.violations.length && s.famille === f && s.score >= 72) break;
  }
  return meilleur!.y;
}

/** « Tout changer » harmonieux : famille d'abord (sujet, notes, verrous), puis chaque dimension non verrouillée dans la famille */
export function toutChangerHarmonieux<T extends CompositionHarmonie>(x: T, verrous: readonly string[], c: ContexteHarmonie | null | undefined, graine: number, outils: OutilsTirage<T>): T {
  return tirerDansFamille(choisirFamille(x, verrous, c, graine), x, verrous, c, graine, outils);
}

/**
 * Dé d'UNE dimension du studio (couleurs, polices, détails…, `page:<id>`, `composant:<section>`) : ne propose que des valeurs
 * compatibles avec le RESTE (famille dominante calculée sans cette dimension) et sans nouvelle violation dure. Le reste ne bouge pas.
 */
export function tirerDimensionHarmonieuse<T extends CompositionHarmonie>(x: T, de: string, c: ContexteHarmonie | null | undefined, graine: number, outils: OutilsTirage<T>): T {
  const dims = dimsDuDe(de);
  if (!dims.length) return outils.brut(x, graine);
  const f = familleDominante(x, c, dims)[0].id;
  const avant = new Set(violationsDures(x, c).map((v) => v.code));
  let meilleur: { y: T; s: number } | null = null;
  for (let essai = 0; essai < 10; essai++) {
    const g = hache(`${graine}|${de}|${essai}`);
    let y = outils.brut(x, g);
    // Seules les dimensions de ce dé : valeurs exclues de la famille du reste re-tirées, puis réparation sur ces dimensions
    y = projeter(y, f, [], c, alea(g, 'de'), outils, dims.filter((d) => { const v = val(y, d); return v !== undefined && compatibiliteFamille(d, v, f) === 'exclu'; }));
    y = reparerHarmonie(y, [], c, outils, dims);
    const s = scoreHarmonie(y, c);
    const nouvelles = s.violations.filter((v) => !avant.has(v.code)).length;
    const change = dims.some((d) => val(y, d) !== val(x, d)) || JSON.stringify(y) !== JSON.stringify(x);
    const note = s.score - 100 * nouvelles - (change ? 0 : 60) + (dims.every((d) => compatibiliteFamille(d, val(y, d), f) !== 'exclu') ? 10 : 0);
    if (!meilleur || note > meilleur.s) meilleur = { y, s: note };
    if (!nouvelles && change && note >= 70) break;
  }
  return meilleur!.y;
}

/** Contraste mémoïsé (les mêmes couples accent / fond reviennent à chaque score) */
const CACHE_CONTRASTE = new Map<string, number>();
function contrasteMemo(a: string, b: string): number {
  const k = `${a}|${b}`;
  let r = CACHE_CONTRASTE.get(k);
  if (r === undefined) { r = contraste(a, b); if (CACHE_CONTRASTE.size < 5000) CACHE_CONTRASTE.set(k, r); }
  return r;
}
