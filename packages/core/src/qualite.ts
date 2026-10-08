// QUALITÉ DES COMPOSITIONS — objectif de tout le système (Paul, 2026-10-08) : « arriver progressivement à des compositions qui
// contiennent uniquement des éléments notés 4 ou 5 étoiles ». Documentation : docs/ingredients-recettes.md.
//
// 1. qualiteComposition : part des éléments d'une composition notés ≥ 4 ★ (note propre, sinon celle de la base : variantes),
//    éléments jamais notés, éléments à 3 ★ (≤ 2 ★ : jamais dans une composition, contexte-images.ts). Jauge « 9/12 éléments 4-5 ★ ·
//    2 jamais notés · 1 à 3 ★ » sur chaque composition montrée à Paul.
// 2. versQuatreCinq (« un seul nouveau à la fois ») : pour une composition À ÉVALUER, chaque dé dont les éléments ne sont pas tous
//    4-5 ★ est relancé (quelques essais, harmonie et garde-fous compris) en gardant le tirage qui a le moins d'éléments « à juger » ;
//    on s'arrête à `maxNouveaux` (1 pour l'évaluation : la note de la composition renseigne sur CET élément, signalé « Nouveau à
//    juger » ; 0 pour le Studio en Favoris d'abord). Une dimension sans aucun 4-5 ★ garde son meilleur élément, signalée.
// 3. tableauProgression : par dimension, nombre d'éléments 4-5 ★ disponibles, couverte si ≥ 2 ; taux de dimensions couvertes et
//    prochaines priorités à noter (dimensions non couvertes, lien vers la tuile correspondante).
// Pur.

import { baseDeCle } from './bases-illustrations';
import { clePhoto } from './assets-poids';
import { clesDetails } from './details';
import { clesMenu } from './menus';
import { pairePolices } from './modeles';
import { cleTraitementPhotos } from './traitements-photos';
import { clesTypo } from './typo';
import { FAMILLES_COMPOSANTS } from './recettes';
import type { SiteDraft } from './draft';
import { clesRecette, tirerDimension, tirerPage, type CompositionRecette, type ContexteRecette, type DimensionRecette, type PageStructure } from './recettes';

export type NotesElements = Record<string, { m: number; n: number }>;

/** Notes brutes (moyenne, nombre) de tous les éléments notés (assets_notes : lignes d'apprentissage) */
export function notesElements(lignes: readonly { cle: string; note?: number | null }[]): NotesElements {
  const acc = new Map<string, { s: number; n: number }>();
  for (const l of lignes) {
    if (!l?.cle || !Number.isInteger(l.note) || (l.note as number) < 1 || (l.note as number) > 5) continue;
    const a = acc.get(l.cle) ?? { s: 0, n: 0 };
    a.s += l.note as number; a.n++;
    acc.set(l.cle, a);
  }
  return Object.fromEntries([...acc.entries()].sort().map(([k, a]) => [k, { m: Math.round((a.s / a.n) * 100) / 100, n: a.n }]));
}

/** Note d'un élément : la sienne, sinon celle de sa base (variante) ; null si jamais noté */
export function noteElement(cle: string, notes?: NotesElements | null): number | null {
  const n = notes?.[cle]?.m;
  if (typeof n === 'number') return n;
  const b = baseDeCle(cle);
  const nb = b ? notes?.[b]?.m : undefined;
  return typeof nb === 'number' ? nb : null;
}

/** Éléments notables d'une composition (gamme, modèle, héros, photos, éléments, effets, traitement, habillage) — pas les structures de page agrégées */
export const elementsComposition = (x: CompositionRecette, sujets: readonly string[]) => clesRecette(x, sujets).assets.filter((k) => !k.startsWith('structure:'));

export type QualiteComposition = { total: number; bons: number; trois: number; jamais: number; faibles: number; part: number; texte: string; details: { cle: string; note: number | null }[] };

export function qualiteComposition(x: CompositionRecette, sujets: readonly string[], notes?: NotesElements | null): QualiteComposition {
  return qualiteCles(elementsComposition(x, sujets), notes);
}

/** Même jauge pour une liste de clés d'éléments (site d'un praticien : elementsDuSite) */
export function qualiteCles(cles: readonly string[], notes?: NotesElements | null): QualiteComposition {
  const details = [...new Set(cles)].map((cle) => ({ cle, note: noteElement(cle, notes) }));
  const bons = details.filter((d) => d.note !== null && d.note >= 4).length;
  const jamais = details.filter((d) => d.note === null).length;
  const faibles = details.filter((d) => d.note !== null && d.note < 2.5).length;
  const trois = details.length - bons - jamais - faibles;
  const parts = [`${bons}/${details.length} éléments 4-5 ★`, ...(jamais ? [`${jamais} jamais noté${jamais > 1 ? 's' : ''}`] : []), ...(trois ? [`${trois} à 3 ★`] : [])];
  return { total: details.length, bons, trois, jamais, faibles, part: details.length ? bons / details.length : 0, texte: parts.join(' · '), details };
}

// ---------------------------------------------------------------------------------------------------------------
// Génération progressive : un seul nouveau à la fois
// ---------------------------------------------------------------------------------------------------------------

const DES: readonly (DimensionRecette | `page:${PageStructure}`)[] = ['couleurs', 'polices', 'visuels', 'structure', 'effets', 'traitement', 'typo', 'details', 'menu', 'photos', 'page:accueil', 'page:soins', 'page:acces', 'page:cabinet', 'page:questions', 'page:fiche', 'page:theme', 'page:article', 'page:actualites'];
const PREFIXES_DES: Readonly<Record<string, readonly string[]>> = {
  couleurs: ['gamme:'], polices: ['typo:police:'], visuels: ['heros:', 'dessin:', 'ligne:'], structure: ['modele:'], effets: ['effets:'], traitement: ['effets:photos-'],
  typo: ['typo:'], details: ['details:'], menu: ['menu:'], photos: ['photo:'],
};
const aJuger = (cle: string, notes?: NotesElements | null) => { const n = noteElement(cle, notes); return n === null || n < 4; };

export type ResultatProgressif = { composition: CompositionRecette; nouveaux: string[]; sansFavori: string[] };

/**
 * Rapproche une composition du « tout 4-5 ★ » : chaque dé dont les éléments ne sont pas tous ≥ 4 ★ est relancé (`essais` fois) et le
 * tirage qui en laisse le moins « à juger » (non noté ou < 4 ★) est gardé ; arrêt dès `maxNouveaux` éléments à juger au plus.
 * `nouveaux` : éléments restant à juger (le premier est « Nouveau à juger ») ; `sansFavori` : dés sans aucun tirage meilleur.
 */
export function versQuatreCinq(x0: CompositionRecette, c: ContexteRecette, notes: NotesElements | null | undefined, opts: { maxNouveaux?: number; essais?: number; graine?: number; verrous?: readonly string[] } = {}): ResultatProgressif {
  const max = opts.maxNouveaux ?? 1, essais = opts.essais ?? 6, g0 = opts.graine ?? 0;
  const compte = (y: CompositionRecette) => elementsComposition(y, c.sujets).filter((k) => aJuger(k, notes)).length;
  // Relances orientées vers les 4-5 ★ : effet appris au moins +1,5 ★ pour chacun (les poids ne font que réordonner des choix permis)
  const cBons = avecBonusQuatreCinq(c, notes);
  let x = x0;
  let n = compte(x);
  const sansFavori: string[] = [];
  if (!notes || !Object.keys(notes).length) return { composition: x, nouveaux: elementsComposition(x, c.sujets).filter((k) => aJuger(k, notes)), sansFavori };
  // Préfixes des éléments que touche chaque dé : un dé sans aucun 4-5 ★ disponible, ou dont les éléments sont déjà 4-5 ★, est sauté
  // Sous-dimensions tirées par un autre dé : traitement des photos (dé « traitement »), paire de polices (dé « polices »)
  const horsDe = (pre: readonly string[], k: string) => (pre[0] === 'effets:' && k.startsWith('effets:photos-')) || (pre[0] === 'typo:' && k.startsWith('typo:police:'));
  const bonsParPrefixe = (pre: readonly string[]) => Object.entries(notes).some(([k, v]) => v.m >= 4 && pre.some((x) => k.startsWith(x)) && !horsDe(pre, k));
  for (const de of DES) {
    if (n <= max) break;
    const pre = PREFIXES_DES[de] ?? ['composant:'];
    if (!bonsParPrefixe(pre)) { sansFavori.push(de); continue; }
    const dimension = (k: string) => pre.some((x) => k.startsWith(x)) && !horsDe(pre, k);
    if (!elementsComposition(x, c.sujets).some((k) => dimension(k) && aJuger(k, notes))) continue;
    if (opts.verrous?.includes(de) || (de === 'polices' && opts.verrous?.includes('polices')) || (de.startsWith('page:') && opts.verrous?.includes('structure'))) continue;
    let meilleur = x, nb = n;
    for (let i = 0; i < essais; i++) {
      const g = (g0 * 7919 + i * 104729 + de.length * 31) >>> 0;
      const y = de.startsWith('page:') ? tirerPage(x, { page: de.slice(5) as PageStructure }, cBons, g) : tirerDimension(x, de as DimensionRecette, cBons, g);
      const ny = compte(y);
      if (ny < nb) { meilleur = y; nb = ny; }
      if (nb <= max) break;
    }
    if (nb < n) { x = meilleur; n = nb; } else sansFavori.push(de);
  }
  return { composition: x, nouveaux: ordonnerNouveaux(elementsComposition(x, c.sujets).filter((k) => aJuger(k, notes)), notes, c.sujets), sansFavori };
}

/** Contexte dont les poids appris favorisent nettement les éléments 4-5 ★ (effet ≥ +1,5) ; garde-fous et exclusions inchangés */
export function avecBonusQuatreCinq(c: ContexteRecette, notes: NotesElements | null | undefined): ContexteRecette {
  const bons = Object.entries(notes ?? {}).filter(([, v]) => v.m >= 4);
  if (!bons.length) return c;
  const p = c.poids ?? { n: 1, moyenne: 3, effets: {} };
  const a = p.assets ?? { n: 1, moyenne: 3, effets: {}, statuts: {} };
  const effets = { ...a.effets };
  for (const [k] of bons) effets[k] = Math.max(effets[k] ?? 0, 1.5);
  return { ...c, poids: { ...p, assets: { ...a, n: Math.max(a.n, 1), effets } } };
}

/** Dimensions (dimensionElement) qui ont au moins un élément noté ≥ 4 ★ */
export function dimensionsAvecFavori(notes: NotesElements | null | undefined, sujets: readonly string[] = []): Set<string> {
  const r = new Set<string>();
  for (const [k, v] of Object.entries(notes ?? {})) if (v.m >= 4) { const d = dimensionElement(k, sujets); if (d) r.add(d.id); }
  return r;
}

/**
 * Éléments à juger dans l'ordre d'affichage : d'abord celui d'une dimension qui a déjà des 4-5 ★ (le « Nouveau à juger » choisi),
 * puis ceux des dimensions sans aucun 4-5 ★ (meilleur disponible, signalés).
 */
export function ordonnerNouveaux(cles: readonly string[], notes: NotesElements | null | undefined, sujets: readonly string[] = []): string[] {
  const avec = dimensionsAvecFavori(notes, sujets);
  const rang = (k: string) => { const d = dimensionElement(k, sujets); return d && avec.has(d.id) ? 0 : 1; };
  return [...cles].map((k, i) => ({ k, i, r: rang(k) })).sort((a, b) => a.r - b.r || a.i - b.i).map((o) => o.k);
}

/** Noms des dimensions d'une liste d'éléments qui n'ont encore aucun 4-5 ★ (signal « Pas encore de 4-5 ★ ») */
export function dimensionsSansFavori(cles: readonly string[], notes: NotesElements | null | undefined, sujets: readonly string[] = []): string[] {
  const avec = dimensionsAvecFavori(notes, sujets);
  return [...new Set(cles.map((k) => dimensionElement(k, sujets)).filter((d): d is { id: string; nom: string } => Boolean(d) && !avec.has(d!.id)).map((d) => d.nom))];
}

// ---------------------------------------------------------------------------------------------------------------
// Tableau de progression
// ---------------------------------------------------------------------------------------------------------------

/** Dimension d'un élément (regroupement du tableau de progression) ; null : non suivi */
export function dimensionElement(cle: string, sujets: readonly string[] = []): { id: string; nom: string } | null {
  const p = cle.split(':');
  const t = p[0];
  // Combinaisons (police × palette, éléments × éléments) et structures agrégées : pas des éléments (comme la jauge)
  if ((t === 'composant' && p[1] === 'paire') || (t === 'typo' && p[1] === 'combinaison') || t === 'structure') return null;
  if (t === 'gamme') return { id: 'gamme', nom: 'Palettes' };
  if (t === 'modele') return { id: 'modele', nom: 'Modèles de site' };
  if (t === 'typo' && p[1] === 'police') return { id: 'typo:police', nom: 'Polices' };
  if (t === 'typo') return { id: `typo:${p[1]}`, nom: `Typographie : ${p[1]}` };
  if (t === 'composant' && p[1] === 'accueil') return { id: 'composant:accueil', nom: 'Premiers écrans' };
  if (t === 'composant' && p[1] === 'entete-anim') return { id: 'composant:entete-anim', nom: 'Animations d’en-tête' };
  if (t === 'composant' && p[1] === 'portraits') return { id: 'composant:portraits', nom: 'Portraits des praticiens' };
  if (t === 'composant') return { id: `composant:${p[1]}`, nom: `Élément : ${p[1]}` };
  if (t === 'effets' && p[1]?.startsWith('photos-')) return { id: 'traitement', nom: 'Traitements photo' };
  if (t === 'effets') return { id: 'effets', nom: 'Effets' };
  if (t === 'details') return { id: `details:${p[1]}`, nom: `Détails : ${p[1]}` };
  if (t === 'menu') return { id: `menu:${p[1]}`, nom: `Menus : ${p[1]}` };
  if (t === 'animation') return { id: 'animation', nom: 'Animations' };
  if (t === 'picto') return { id: 'picto', nom: 'Icônes' };
  if (t === 'photo') return { id: `photo:${sujets[0] ?? 'general'}`, nom: `Photos : ${sujets[0] ?? 'général'}` };
  if (t === 'dessin' || t === 'heros' || t === 'materiel' || t === 'ligne') { const r = t === 'ligne' ? 'ligne' : p[2] ?? '?'; return { id: `illustration:${r}`, nom: `Illustrations : ${r}` }; }
  return null;
}

export type LigneProgression = { id: string; nom: string; total: number; bons: number; couverte: boolean; exemple: string };
export type Progression = { dimensions: LigneProgression[]; couvertes: number; taux: number; priorites: LigneProgression[]; texte: string };

/**
 * Tableau de progression : pour chaque dimension, éléments disponibles et notés ≥ 4 ★ ; couverte avec au moins `seuil` (2) choix
 * 4-5 ★. `elements` : clés de l'inventaire et leurs sujets (photos). Priorités : dimensions non couvertes, les plus proches d'abord.
 */
export function tableauProgression(elements: readonly { cle: string; sujets?: readonly string[] }[], notes: NotesElements | null | undefined, seuil = 2): Progression {
  const m = new Map<string, LigneProgression>();
  for (const e of elements) {
    const d = dimensionElement(e.cle, e.sujets ?? []);
    if (!d) continue;
    const l = m.get(d.id) ?? { id: d.id, nom: d.nom, total: 0, bons: 0, couverte: false, exemple: e.cle };
    l.total++;
    const n = noteElement(e.cle, notes);
    if (n !== null && n >= 4) l.bons++;
    m.set(d.id, l);
  }
  const dimensions = [...m.values()].map((l) => ({ ...l, couverte: l.bons >= Math.min(seuil, l.total) })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const couvertes = dimensions.filter((d) => d.couverte).length;
  const taux = dimensions.length ? Math.round((couvertes / dimensions.length) * 100) : 0;
  const priorites = dimensions.filter((d) => !d.couverte).sort((a, b) => b.bons - a.bons || a.total - b.total).slice(0, 8);
  return { dimensions, couvertes, taux, priorites, texte: `Compositions 100 % 4-5 ★ possibles : ${taux} % des dimensions couvertes (${couvertes}/${dimensions.length})` };
}

/** Libellé lisible d'un élément pour « Nouveau à juger : … » (« Polices : nunito-lora ») */
export function libelleElement(cle: string, sujets: readonly string[] = []): string {
  const d = dimensionElement(cle, sujets);
  const reste = cle.split(':').slice(cle.startsWith('typo:police:') ? 2 : 1).join(' · ');
  return d ? `${d.nom} : ${reste}` : cle;
}

/** Tuile « Donner mon avis » qui fait noter une dimension (lien des priorités : /admin/retours?type=…) */
export function categorieDeDimension(id: string): string {
  const t = id.split(':')[0];
  const table: Record<string, string> = {
    gamme: 'couleurs', modele: 'structures', typo: 'typographies', composant: 'elements', effets: 'effets', traitement: 'effets', details: 'details',
    menu: 'menus', animation: 'animations', picto: 'icones', photo: 'photos', illustration: 'illustrations',
  };
  if (id === 'composant:entete-anim') return 'animations';
  return table[t] ?? 'hasard';
}

/**
 * Éléments notables d'un site de praticien (/creer, sites : réglages posés par la recette ou la proposition choisie) : palette,
 * modèle, polices et habillage, jeu d'effets, traitement des photos, variantes de sections, photos. Pour exposer le taux 4-5 ★
 * par site (les sites gardent leur règle : éléments validés, jamais ≤ 2 ★).
 */
export function elementsDuSite(theme: Partial<SiteDraft['theme']> | null | undefined): string[] {
  if (!theme) return [];
  const t = theme;
  const police = t.police && pairePolices(t.police) ? t.police : null;
  return [...new Set([
    ...(t.gamme ? [`gamme:${t.gamme}`] : []),
    ...(t.modele ? [`modele:${t.modele}`] : []),
    ...(t.typo ? clesTypo(police, t.typo) : police ? [`typo:police:${police}`] : []),
    ...(t.details ? clesDetails(t.details) : []),
    ...(t.menu ? clesMenu(t.menu) : []),
    ...(t.effets ? [`effets:${t.effets}`] : []),
    ...(t.traitementPhotos ? [cleTraitementPhotos(t.traitementPhotos as Parameters<typeof cleTraitementPhotos>[0])] : []),
    ...Object.entries(t.variantes ?? {}).filter(([s, v]) => v && (FAMILLES_COMPOSANTS as readonly string[]).includes(s)).map(([s, v]) => `composant:${s}:${v}`),
    ...(t.photosRecette ?? []).map(clePhoto).filter((k): k is string => Boolean(k)),
  ])];
}
