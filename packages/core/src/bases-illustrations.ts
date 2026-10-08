// Illustration de BASE → VARIANTES (demande de Paul, 2026-10-08 : « On me demande souvent de renoter plusieurs fois une
// illustration et toutes ses variantes… je voudrais pouvoir noter juste l'illustration "basique", et pareil on peut faire des
// A/B testing de contraste si besoin »). Module PUR, sans dépendance d'exécution (importé par assets-poids.ts, donc par les sites).
//
// 1. MODÈLE (dérivé des clés existantes, aucune clé stockée renommée)
//   base = un dessin / un sujet ; ses variantes = le même dessin rendu autrement :
//     dessin:<nom>:releve | dessin:<nom>:pedagogique | ligne:<trait>  → base dessin:<nom>   (dimension « style » : registre)
//     dessin:<sujet>:<style expérimental> (decoupe, riso, volume, geometrique) → base dessin:<sujet> (dimension « style »)
//     dessin:sport-<s>:pedagogique | ligne:sport-<s>                  → base dessin:sport-<s>
//     heros:<thème>:<registre>                                         → base heros:<thème>
//     materiel:<id>:<registre>                                         → base materiel:<id>
//   Un trait continu partagé par plusieurs dessins (ligne:empreintes, ligne:pieds-dessus) reste seul (pas de base). Pictos,
//   animations, bibliothèque, photos, gammes : pas de base (une déclinaison de la bibliothèque est un autre dessin, pas une variante).
//   Variantes DE RENDU (sans toucher aux sources de dessin) : `<clé>@contraste=fort|doux|normal`, `<clé>@couleur=<gamme>` —
//   filtre CSS de contraste / variables de gamme posés sur le conteneur du SVG ; elles n'existent que pour les duels.
//   La base est notée sous sa propre clé (`dessin:orthonyxie`, `heros:sport`…), acceptée par les tables existantes (0021, 0027 :
//   préfixe de type connu) : aucune migration.
//
// 2. HÉRITAGE DES NOTES (poidsAssets, assets-poids.ts)
//   Groupe G(B) = {B} ∪ variantes de B présentes dans les notes. Les anciennes notes données sur des variantes COMPTENT pour la base :
//     effet(B)  = m(G) − μ          m(G) = (Σ notes de G + K · μ) / (n(G) + K), K = 4 (même lissage que les assets)
//     écart(v)  = clamp((moy(v) − moy(G)) · n(v) / (n(v) + K), ±0,5 étoile)   seulement si v a des notes à elle ; 0 sinon
//     effet(v)  = effet(B) + écart(v)
//   (moy : moyennes brutes pondérées par l'appareil.) Une variante sans note à elle hérite exactement de sa base (scoreAsset lit
//   effets[v], à défaut effets[B]). Un duel de variantes ajoute son renfort (±0,5 au plus, duels.ts) à l'effet hérité.
//   STATUTS : « Retiré » / « À retravailler » posés sur la base valent pour les variantes, sauf statut propre de la variante.
//
// 3. FILE « À NOTER » (Donner mon avis)
//   Dédoublonnée par base : une seule carte (l'illustration « basique » : pédagogique, sinon relevé, sinon le premier style,
//   le trait continu en dernier), notée sous la clé de base ; les variantes sont montrées repliées (« Voir les N variantes »),
//   sans obligation de les noter. Une base est « notée » dès qu'elle ou une de ses variantes a une note (agrégation).
//   Une variante n'est jamais remise dans la file ; une variante NOUVELLE et SANS AUCUN SIGNAL (ni note, ni duel) d'une base
//   déjà notée part en duel (« Comparer ses variantes en duel ») plutôt qu'en note.

export const DIMENSIONS_VARIANTE = ['style', 'contraste', 'couleur'] as const;
export type DimensionVariante = (typeof DIMENSIONS_VARIANTE)[number];

/** Dimension de duel d'une variante (`variante:contraste`…) */
export const dimensionDuelVariante = (d: DimensionVariante) => `variante:${d}`;

/** Libellés simples (« Vous comparez … ») des duels de variantes : table des repères (reperes.ts) */
export const LIBELLES_DIMENSIONS_VARIANTE: Readonly<Record<DimensionVariante, string>> = {
  contraste: 'le contraste de l’illustration',
  couleur: 'les couleurs de l’illustration',
  style: 'le style de l’illustration (même dessin)',
};
/** Même table, indexée par dimension de duel (`variante:contraste` → « le contraste de l’illustration ») */
export const LIBELLES_DUELS_VARIANTES: Readonly<Record<string, string>> = Object.fromEntries(DIMENSIONS_VARIANTE.map((d) => [dimensionDuelVariante(d), LIBELLES_DIMENSIONS_VARIANTE[d]]));

/** Plafond de l'écart propre d'une variante (étoiles) et lissage (mêmes K que les assets) */
export const HERITAGE_VARIANTES = { plafondEcart: 0.5, lissage: 4 } as const;

/** Registres (ordre de préférence de l'illustration « basique ») */
const ORDRE_VARIANTES = ['pedagogique', 'releve', 'decoupe', 'riso', 'volume', 'geometrique', 'ligne', 'direction-a', 'direction-b', 'direction-c'] as const;
/**
 * Directions de style des pictos à l'essai (2026-10-08, pictos-directions.ts) : `picto:<id>@direction-<a|b|c>` est une variante
 * (dimension « style ») du picto actuel `picto:<id>`, qui est lui-même la base (il rejoint son groupe, en tête).
 */
const DIRECTION_PICTO = /^(picto:[a-z0-9-]+)@direction-([abc])$/;
/** Styles expérimentaux (styles-experimentaux.ts, recopiés : module sans dépendance ; test d'égalité) */
export const STYLES_VARIANTES = ['decoupe', 'riso', 'volume', 'geometrique'] as const;

/**
 * Trait continu → dessin quand le trait ne sert qu'à UN dessin (dérivé de LIGNE_DESSIN, ligne.ts ; recopié ici pour rester
 * sans dépendance, un test vérifie l'égalité).
 */
export const LIGNE_VERS_DESSIN: Readonly<Record<string, string>> = {
  'pied-dessous': 'appuis', semelle: 'semelle', monofilament: 'diabete', 'chaussure-course': 'sport', 'premiers-pas': 'enfant', talon: 'talon',
  ongle: 'ongle', laser: 'laser', 'senior-canne': 'senior', taping: 'taping', verrue: 'verrue', 'pied-profil': 'voutes', orthonyxie: 'orthonyxie',
  onychoplastie: 'onychoplastie', orthoplastie: 'orthoplastie', mycose: 'mycose', cor: 'cors-durillons', 'ongle-epais': 'ongles-epais', domicile: 'domicile',
};

// ---------------------------------------------------------------------------------------------------------------
// Variantes de rendu (contraste, couleur) : `<clé>@<dimension>=<valeur>`
// ---------------------------------------------------------------------------------------------------------------

export const CONTRASTES = ['normal', 'fort', 'doux'] as const;
export type Contraste = (typeof CONTRASTES)[number];
export const LIBELLES_CONTRASTES: Readonly<Record<Contraste, string>> = { normal: 'Contraste d’origine', fort: 'Contraste fort', doux: 'Contraste doux' };

/** Filtre CSS d'un contraste (posé sur le conteneur du SVG ; la source du dessin n'est pas touchée) */
export function filtreContraste(c: Contraste | string | null | undefined): string | undefined {
  if (c === 'fort') return 'contrast(1.4) saturate(1.15)';
  if (c === 'doux') return 'contrast(0.72) saturate(0.85) brightness(1.06)';
  return undefined;
}

const RENDU = /^([a-z]+:[^\s@]+)@(contraste|couleur)=([a-z0-9-]{1,30})$/;

/** Clé d'une variante de rendu */
export const cleVarianteRendu = (cle: string, dimension: 'contraste' | 'couleur', valeur: string) => `${cle}@${dimension}=${valeur}`;

/** `dessin:x:pedagogique@contraste=fort` → { source: dessin:x:pedagogique, dimension: contraste, valeur: fort } ; autre → null */
export function lireVarianteRendu(cle: string): { source: string; dimension: 'contraste' | 'couleur'; valeur: string } | null {
  const m = RENDU.exec(cle);
  return m ? { source: m[1], dimension: m[2] as 'contraste' | 'couleur', valeur: m[3] } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Clé → base
// ---------------------------------------------------------------------------------------------------------------

/** Base d'une clé de variante (null : la clé n'est pas une variante — picto, photo, base elle-même…) */
export function baseDeCle(cle: string): string | null {
  if (typeof cle !== 'string') return null;
  const r = lireVarianteRendu(cle);
  if (r) return baseDeCle(r.source) ?? r.source;
  const dir = DIRECTION_PICTO.exec(cle);
  if (dir) return dir[1];
  const p = cle.split(':');
  if (p.length === 3 && (p[0] === 'dessin' || p[0] === 'heros' || p[0] === 'materiel') && p[1] && p[2]) return `${p[0]}:${p[1]}`;
  if (p.length === 2 && p[0] === 'ligne') {
    if (p[1].startsWith('sport-')) return `dessin:${p[1]}`;
    const d = LIGNE_VERS_DESSIN[p[1]];
    return d ? `dessin:${d}` : null;
  }
  return null;
}

/** Valeur de la variante (« pedagogique », « riso », « ligne », « contraste=fort »…) ; null hors variante */
export function valeurVariante(cle: string): string | null {
  const r = lireVarianteRendu(cle);
  if (r) return `${r.dimension}=${r.valeur}`;
  const dir = DIRECTION_PICTO.exec(cle);
  if (dir) return `direction-${dir[2]}`;
  if (!baseDeCle(cle)) return null;
  const p = cle.split(':');
  return p[0] === 'ligne' ? 'ligne' : p[2];
}

/** Dimension qui distingue une variante de son illustration « basique » */
export function dimensionDeVariante(cle: string): DimensionVariante | null {
  const r = lireVarianteRendu(cle);
  if (r) return r.dimension;
  return baseDeCle(cle) ? 'style' : null;
}

/** Rang d'une variante (0 = illustration « basique ») */
export function rangVariante(cle: string): number {
  if (/^picto:[a-z0-9-]+$/.test(cle)) return -1; // le picto actuel, base de ses directions
  const v = valeurVariante(cle);
  if (!v) return 99;
  const i = (ORDRE_VARIANTES as readonly string[]).indexOf(v);
  return i < 0 ? 50 : i;
}

export const estVariante = (cle: string) => baseDeCle(cle) !== null;

/** Libellé court d'une variante pour les vignettes (« Pédagogique », « Trait continu », « Riso »…) */
export function libelleVariante(cle: string): string {
  const v = valeurVariante(cle) ?? '';
  const noms: Record<string, string> = { pedagogique: 'Pédagogique', releve: 'Relevé', ligne: 'Trait continu', decoupe: 'Découpe', riso: 'Riso', volume: 'Volume', geometrique: 'Géométrique', 'direction-a': 'Direction A (trait fin)', 'direction-b': 'Direction B (duotone)', 'direction-c': 'Direction C (éditorial)' };
  if (!v && /^picto:[a-z0-9-]+$/.test(cle)) return 'Picto actuel';
  if (v.startsWith('contraste=')) return LIBELLES_CONTRASTES[v.slice(10) as Contraste] ?? v;
  if (v.startsWith('couleur=')) return `Couleurs ${v.slice(8)}`;
  return noms[v] ?? v;
}

// ---------------------------------------------------------------------------------------------------------------
// Groupes
// ---------------------------------------------------------------------------------------------------------------

export type GroupeBase<T extends { cle: string }> = {
  /** Clé de la base (notée) */
  base: string;
  /** L'illustration « basique » montrée à sa place */
  representant: T;
  /** Toutes les variantes (représentant compris), de la plus « basique » à la dernière */
  variantes: T[];
};

/** Regroupe une liste par base : groupes (≥ 2 variantes, ou 1 variante dont la base n'est pas elle-même) et éléments seuls */
export function regrouperParBase<T extends { cle: string }>(items: readonly T[]): { groupes: GroupeBase<T>[]; seuls: T[] } {
  const parBase = new Map<string, T[]>();
  const seuls: T[] = [];
  // Une base présente elle-même dans la liste (picto actuel de ses directions) rejoint son groupe
  const bases = new Set(items.map((x) => baseDeCle(x.cle)).filter((b): b is string => Boolean(b)));
  for (const x of items) {
    const b = baseDeCle(x.cle) ?? (bases.has(x.cle) ? x.cle : null);
    if (!b) { seuls.push(x); continue; }
    (parBase.get(b) ?? parBase.set(b, []).get(b)!).push(x);
  }
  const groupes = [...parBase.entries()].map(([base, l]) => {
    const variantes = [...l].sort((a, b) => rangVariante(a.cle) - rangVariante(b.cle) || a.cle.localeCompare(b.cle));
    return { base, representant: variantes[0], variantes };
  });
  return { groupes, seuls };
}

/**
 * File dédoublonnée : chaque groupe de variantes est remplacé par UN élément (fabriqué par `base`, en général le représentant
 * sous la clé de base), à la place de la première variante rencontrée ; l'ordre du reste est conservé.
 */
export function dedoublonnerParBase<T extends { cle: string }>(items: readonly T[], fabriquer: (g: GroupeBase<T>) => T): T[] {
  const { groupes } = regrouperParBase(items);
  const parBase = new Map(groupes.map((g) => [g.base, g]));
  const faits = new Set<string>();
  const res: T[] = [];
  for (const x of items) {
    const b = baseDeCle(x.cle) ?? (parBase.has(x.cle) ? x.cle : null);
    if (!b) { res.push(x); continue; }
    if (faits.has(b)) continue;
    faits.add(b);
    res.push(fabriquer(parBase.get(b)!));
  }
  return res;
}

/** Titre de la base à partir du titre de son représentant (« Pied de profil (Découpe) » → « Pied de profil ») */
export function titreDeBase(titre: string, cleRepresentant: string): string {
  const v = valeurVariante(cleRepresentant);
  return v && (STYLES_VARIANTES as readonly string[]).includes(v) ? titre.replace(/\s*\([^()]*\)\s*$/, '') : titre;
}

/** Titres des bases (synthèse, « ce que vos avis ont changé ») à partir de titres de variantes */
export function titresBases(titres: Readonly<Record<string, string>>): Record<string, string> {
  const res: Record<string, string> = {};
  const { groupes } = regrouperParBase(Object.keys(titres).map((cle) => ({ cle })));
  for (const g of groupes) res[g.base] = `${titreDeBase(titres[g.representant.cle], g.representant.cle)} (illustration de base)`;
  return res;
}

// ---------------------------------------------------------------------------------------------------------------
// Notes : agrégation par base, file, duels à proposer
// ---------------------------------------------------------------------------------------------------------------

/**
 * Notes vues par la file : chaque note d'une variante compte AUSSI pour sa base (copie sous la clé de base, empreinte nulle :
 * une note de variante ne signale jamais « modifié depuis votre note » sur la base). Les notes d'origine sont gardées.
 */
export function notesAvecBases<N extends { cle: string; empreinte?: string | null }>(notes: readonly N[]): N[] {
  const res: N[] = [...notes];
  for (const n of notes) {
    const b = baseDeCle(n.cle);
    if (b) res.push({ ...n, cle: b, empreinte: null });
  }
  return res;
}

/** La base (ou une de ses variantes) a-t-elle au moins un signal (note, duel) ? */
export const baseNotee = (base: string, signaux: ReadonlySet<string>) => signaux.has(base) || [...signaux].some((k) => baseDeCle(k) === base);

/**
 * Variantes à comparer en duel plutôt qu'à noter : base déjà notée, variante sans AUCUN signal à elle (ni note ni duel).
 * Base pas encore notée : rien (c'est la base qu'il faut noter d'abord).
 */
export function variantesADuel(g: { base: string; variantes: readonly { cle: string }[] }, signaux: ReadonlySet<string>): string[] {
  if (!baseNotee(g.base, signaux)) return [];
  return g.variantes.map((v) => v.cle).filter((k) => !signaux.has(k));
}

/** Clés ayant un signal : notes et côtés des duels (la variante de rendu compte pour sa source) */
export function clesAvecSignal(notes: readonly { cle: string }[], duels: readonly { aCle: string; bCle: string }[] = []): Set<string> {
  const s = new Set<string>();
  for (const n of notes) s.add(n.cle);
  for (const d of duels) for (const k of [d.aCle, d.bCle]) { s.add(k); const r = lireVarianteRendu(k); if (r) s.add(r.source); }
  return s;
}

/** Taille de la file « à noter » avant / après dédoublonnage par base (et notes économisées) */
export function tailleFileParBase(cles: readonly string[]): { avant: number; apres: number; economisees: number; bases: number } {
  const { groupes, seuls } = regrouperParBase(cles.map((cle) => ({ cle })));
  const apres = seuls.length + groupes.length;
  return { avant: cles.length, apres, economisees: cles.length - apres, bases: groupes.length };
}

// ---------------------------------------------------------------------------------------------------------------
// Statuts hérités
// ---------------------------------------------------------------------------------------------------------------

/** Statut d'une clé : le sien, à défaut celui de sa base */
export function statutEffectif<S>(cle: string, statuts: Readonly<Record<string, S>>): S | undefined {
  if (statuts[cle] !== undefined) return statuts[cle];
  const b = baseDeCle(cle);
  return b ? statuts[b] : undefined;
}

/** Statuts complétés par héritage pour une liste de clés (variantes sans statut propre : statut de leur base) */
export function statutsAvecHeritage<S>(statuts: Readonly<Record<string, S>>, cles: readonly string[]): Record<string, S> {
  const res: Record<string, S> = { ...statuts };
  for (const k of cles) { if (res[k] !== undefined) continue; const s = statutEffectif(k, statuts); if (s !== undefined) res[k] = s; }
  return res;
}
