// Espace « Donner mon avis » (/admin/retours, demande de Paul du 2026-10-07) : notation ludique et sobre de tout ce que la
// plateforme produit, une carte à la fois, pour que Claude lise les retours (export quotidien vers retours/) et améliore
// en boucle. Ce module : catégories, tirage de la prochaine carte, compteurs (jour, série, progression, paliers) et
// « ce que vos avis ont changé » (différences du générateur avec et sans apprentissage). Module pur.

import type { TypeAsset } from './assets-poids';
import { scoreAsset } from './assets-poids';
import type { PoidsAtelier } from './atelier-poids';
import { libelleCombinaison } from './atelier';
import { lotsPropositions } from './propositions';
import { THEMES } from './themes';
import { jourParis } from './essai';

// ---------------------------------------------------------------------------------------------------------------
// Catégories (tuiles de l'accueil)
// ---------------------------------------------------------------------------------------------------------------

export type CategorieRetours = 'hasard' | 'themes' | 'illustrations' | 'icones' | 'photos' | 'animations' | 'couleurs' | 'structures';

export const CATEGORIES_RETOURS: readonly { id: CategorieRetours; libelle: string; description: string; types: readonly TypeAsset[] }[] = [
  { id: 'hasard', libelle: 'Tout au hasard', description: 'Un peu de tout, les jamais notés d’abord', types: [] },
  { id: 'themes', libelle: 'Thèmes complets', description: 'Sites entiers proposés par le générateur', types: [] },
  { id: 'illustrations', libelle: 'Illustrations', description: 'Dessins, traits continus, héros, matériel, bibliothèque', types: ['dessin', 'ligne', 'heros', 'materiel', 'biblio'] },
  { id: 'icones', libelle: 'Icônes', description: 'Pictos des soins et des informations', types: ['picto'] },
  { id: 'photos', libelle: 'Photos', description: 'Banque intégrée et jeux de photos', types: ['photo'] },
  { id: 'animations', libelle: 'Animations', description: 'Images d’accueil animées', types: ['animation'] },
  { id: 'couleurs', libelle: 'Couleurs', description: 'Gammes de couleurs', types: ['gamme'] },
  { id: 'structures', libelle: 'Structures', description: 'Les 4 modèles du parcours', types: ['modele'] },
];

export const categorieRetours = (id: string | null | undefined) => CATEGORIES_RETOURS.find((c) => c.id === id);

/** Catégorie d'un type d'asset (thèmes : aucune) */
export const categorieDuType = (t: TypeAsset): CategorieRetours => CATEGORIES_RETOURS.find((c) => c.types.includes(t))?.id ?? 'illustrations';

// ---------------------------------------------------------------------------------------------------------------
// Tirage de la prochaine carte
// ---------------------------------------------------------------------------------------------------------------

/** État d'un asset vis-à-vis des notes : nombre, empreinte du rendu lors de la dernière note, notes extrêmes */
export type EtatNotesAsset = { n: number; empreinte?: string | null; min: number; max: number };

/**
 * Palier de priorité : 0 modifié depuis la dernière note (avant / après à juger, demande de Paul 2026-10-07), 1 jamais noté,
 * 2 note incertaine (1 seule, ou avis partagés), 3 le reste
 */
export function prioriteAsset(e: EtatNotesAsset | undefined, empreinte?: string | null): 0 | 1 | 2 | 3 {
  if (!e || !e.n) return 1;
  if (empreinte && e.empreinte && e.empreinte !== empreinte) return 0;
  if (e.n < 2 || e.max - e.min >= 2) return 2;
  return 3;
}

/**
 * Prochaine carte : au hasard dans le meilleur palier non vide (modifiés depuis la note, puis jamais notés, puis incertains, puis le reste),
 * sans les clés déjà vues dans la session (`exclues`) tant qu'il en reste d'autres.
 */
export function prochaineCarte<T extends { cle: string; empreinte?: string | null }>(
  candidats: readonly T[],
  etats: ReadonlyMap<string, EtatNotesAsset> | Record<string, EtatNotesAsset>,
  exclues: ReadonlySet<string> = new Set(),
  aleatoire: () => number = Math.random,
): T | null {
  const etat = (k: string) => (etats instanceof Map ? etats.get(k) : (etats as Record<string, EtatNotesAsset>)[k]);
  const libres = candidats.filter((c) => !exclues.has(c.cle));
  const pool = libres.length ? libres : candidats;
  if (!pool.length) return null;
  const paliers: T[][] = [[], [], [], []];
  for (const c of pool) paliers[prioriteAsset(etat(c.cle), c.empreinte)].push(c);
  const p = paliers.find((l) => l.length)!;
  return p[Math.min(p.length - 1, Math.floor(aleatoire() * p.length))];
}

/**
 * Comme prochaineCarte, mais les candidats « en attente » (animations dont les ingrédients de base ne sont pas validés :
 * animations-sources.ts) ne sortent qu'après tous les autres : seulement quand tous les autres ont été vus dans la session.
 */
export function prochaineCarteAvecAttente<T extends { cle: string; empreinte?: string | null }>(
  candidats: readonly T[],
  etats: ReadonlyMap<string, EtatNotesAsset> | Record<string, EtatNotesAsset>,
  exclues: ReadonlySet<string>,
  enAttente: (c: T) => boolean,
  aleatoire: () => number = Math.random,
): T | null {
  const prets = candidats.filter((c) => !enAttente(c));
  const attente = candidats.filter((c) => enAttente(c));
  const libre = (l: readonly T[]) => l.some((c) => !exclues.has(c.cle));
  if (libre(prets)) return prochaineCarte(prets, etats, exclues, aleatoire);
  if (libre(attente)) return prochaineCarte(attente, etats, exclues, aleatoire);
  return prochaineCarte(prets.length ? prets : attente, etats, exclues, aleatoire);
}

/** États par clé à partir des notes (plus récentes d'abord ou non : l'empreinte retenue est celle de la note la plus récente) */
export function etatsNotes(notes: readonly { cle: string; note: number; empreinte?: string | null; le?: string | null }[]): Map<string, EtatNotesAsset> {
  const m = new Map<string, EtatNotesAsset & { le: string }>();
  for (const x of notes) {
    const e = m.get(x.cle);
    const le = x.le ?? '';
    if (!e) { m.set(x.cle, { n: 1, empreinte: x.empreinte ?? null, min: x.note, max: x.note, le }); continue; }
    e.n++;
    e.min = Math.min(e.min, x.note);
    e.max = Math.max(e.max, x.note);
    if (le > e.le) { e.le = le; e.empreinte = x.empreinte ?? e.empreinte; }
  }
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// Compteurs : aujourd'hui, série de jours, progression, paliers
// ---------------------------------------------------------------------------------------------------------------

/** Avis donnés aujourd'hui et série de jours consécutifs avec au moins un avis (aujourd'hui, ou hier si rien encore aujourd'hui) */
export function serieAvis(dates: readonly string[], maintenant: Date = new Date()): { aujourdhui: number; serie: number; jours: number } {
  const jours = new Set(dates.filter(Boolean).map(jourParis));
  const auj = jourParis(maintenant);
  const aujourdhui = dates.filter((d) => d && jourParis(d) === auj).length;
  const veille = (j: string) => { const d = new Date(`${j}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  let j = jours.has(auj) ? auj : veille(auj);
  let serie = 0;
  while (jours.has(j)) { serie++; j = veille(j); }
  return { aujourdhui, serie, jours: jours.size };
}

export const PALIERS_AVIS = [10, 25, 50, 100, 250, 500, 1000] as const;

/** Palier atteint et suivant (« 50 avis : merci ») */
export function palierAvis(total: number): { atteint: number | null; suivant: number | null; reste: number } {
  const atteint = [...PALIERS_AVIS].reverse().find((p) => total >= p) ?? null;
  const suivant = PALIERS_AVIS.find((p) => total < p) ?? null;
  return { atteint, suivant, reste: suivant ? suivant - total : 0 };
}

// ---------------------------------------------------------------------------------------------------------------
// Ce que vos avis ont changé
// ---------------------------------------------------------------------------------------------------------------

export type ChangementGenerateur = { sujet: string; libelleSujet: string; ecartees: string[]; remontees: string[] };

/**
 * Différences du générateur avec et sans apprentissage, sujet par sujet (sans couleur choisie, deux premiers lots) :
 * combinaisons qui ne sont plus proposées d'emblée (« écartées ») et nouvelles venues (« remontées »).
 */
export function changementsGenerateur(poids: PoidsAtelier | null | undefined, opts: { lots?: number } = {}): { total: number; sujets: ChangementGenerateur[] } {
  if (!poids || (!poids.n && !poids.assets)) return { total: 0, sujets: [] };
  const lots = opts.lots ?? 2;
  const sujets: ChangementGenerateur[] = [];
  for (const t of [...THEMES.filter((x) => x.statut === 'actif').map((x) => x.id), 'cabinet']) {
    const e = { priorites: { principaux: t === 'cabinet' ? [] : [t], secondaires: [] }, couleursPreferees: [] };
    const avant = lotsPropositions(e, lots).flat().map((p) => p.id);
    const apres = lotsPropositions(e, lots, { poids }).flat().map((p) => p.id);
    const ecartees = avant.filter((id) => !apres.includes(id)).map(libelleCombinaison);
    const remontees = apres.filter((id) => !avant.includes(id)).map(libelleCombinaison);
    if (ecartees.length || remontees.length) sujets.push({ sujet: t, libelleSujet: THEMES.find((x) => x.id === t)?.court ?? 'Sans sujet', ecartees, remontees });
  }
  return { total: sujets.reduce((s, x) => s + x.ecartees.length + x.remontees.length, 0) / 2, sujets };
}

/** Assets que l'apprentissage favorise (score ≥ 0,3) ou évite (score ≤ −0,75 : mal notés, retirés, à retravailler) */
export function assetsInfluents(poids: PoidsAtelier | null | undefined, titres: Record<string, string> = {}, nb = 8): { favorises: { cle: string; titre: string; score: number }[]; evites: { cle: string; titre: string; score: number }[] } {
  const a = poids?.assets;
  if (!a) return { favorises: [], evites: [] };
  const cles = [...new Set([...Object.keys(a.effets), ...Object.keys(a.statuts)])];
  const l = cles.map((cle) => ({ cle, titre: titres[cle] ?? cle, score: scoreAsset(cle, a) }));
  return {
    favorises: l.filter((x) => x.score >= 0.3).sort((x, y) => y.score - x.score || (x.cle < y.cle ? -1 : 1)).slice(0, nb),
    evites: l.filter((x) => x.score <= -0.75).sort((x, y) => x.score - y.score || (x.cle < y.cle ? -1 : 1)).slice(0, nb),
  };
}
