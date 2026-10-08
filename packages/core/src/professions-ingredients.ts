// Rattachement des INGRÉDIENTS aux professions (décision de Paul du 2026-10-08, docs/architecture-professions.md) : une seule
// bibliothèque ; chaque ingrédient porte une ou plusieurs professions, ou « commun ».
//
// - Communs PAR NATURE : palettes, polices, mises en page, éléments (les recettes sont communes à toutes les professions).
// - Photos, illustrations, icônes, animations : par défaut la profession par défaut (tout ce qui existe avant le multi-professions
//   est de la podologie) ; Paul ajoute d'autres professions en un clic (« Aussi pour Psychomotricien »), seul ou en lot.
// - Journal en AJOUT SEUL (table assets_professions, migration 0045) : dernière action par (clé, profession) ; « ajout »,
//   « retrait », « refus » (suggestion refusée : ne change pas l'appartenance, ne la repropose plus).
// - Les hashtags « #profession-<id> » validés depuis les propositions de Claude (propositions-claude-tags.ts) valent ajout.
// - Suggestions de partage : mots-clés du pack de la profession cible (packs-professions.ts) retrouvés dans les sujets, hashtags
//   ou le titre d'un visuel ; jamais rattaché sans clic de Paul.
// Module pur.

import { typeIngredient, type TypeIngredient } from './arrivages';
import { PROFESSION_PAR_DEFAUT, idProfession } from './professions';

/** Valeur « commun » : l'ingrédient sert à toutes les professions */
export const COMMUN = 'commun';

/** Types d'ingrédients communs par nature (design : recettes communes) */
export const TYPES_COMMUNS_PAR_NATURE: readonly TypeIngredient[] = ['palette', 'police', 'mise-en-page', 'element'];

export const estCommunParNature = (cle: string) => TYPES_COMMUNS_PAR_NATURE.includes(typeIngredient(cle));

/** Professions par défaut d'un ingrédient sans décision enregistrée */
export const professionsParDefaut = (cle: string): string[] => (estCommunParNature(cle) ? [COMMUN] : [PROFESSION_PAR_DEFAUT]);

export type ActionProfession = 'ajout' | 'retrait' | 'refus';
export type LigneProfessionIngredient = { cle_asset: string; profession: string; action: ActionProfession | string };

/** Décisions enregistrées : par clé, professions ajoutées / retirées / suggestions refusées */
export type Rattachements = Readonly<Record<string, { ajouts: readonly string[]; retraits: readonly string[]; refus: readonly string[] }>>;

const PROFESSION_VALIDE = /^[a-z0-9-]{2,40}$/;
const normaliser = (p: string) => (p === COMMUN ? COMMUN : idProfession(p));

/**
 * Journal (lignes les plus RÉCENTES d'abord, ou état effectif : une ligne par (clé, profession)) → décisions. La première ligne
 * vue pour un couple (clé, profession) fait foi ; « refus » est rangé à part (il ne retire pas l'ingrédient).
 */
export function rattachementsDepuisLignes(lignes: readonly LigneProfessionIngredient[]): Rattachements {
  const vus = new Set<string>();
  const r: Record<string, { ajouts: string[]; retraits: string[]; refus: string[] }> = {};
  for (const l of lignes) {
    if (!l?.cle_asset || typeof l.profession !== 'string' || !PROFESSION_VALIDE.test(l.profession)) continue;
    const p = normaliser(l.profession);
    const k = `${l.cle_asset}\u0000${p}\u0000${l.action === 'refus' ? 'refus' : 'appartenance'}`;
    if (vus.has(k)) continue;
    vus.add(k);
    const e = (r[l.cle_asset] ??= { ajouts: [], retraits: [], refus: [] });
    if (l.action === 'ajout') e.ajouts.push(p);
    else if (l.action === 'retrait') e.retraits.push(p);
    else if (l.action === 'refus') e.refus.push(p);
  }
  return r;
}

/** Hashtags « #profession-<id> » (validation des propositions de Claude) → ajouts */
export function rattachementsDepuisHashtags(hashtags: Readonly<Record<string, readonly string[]>>): Rattachements {
  const r: Record<string, { ajouts: string[]; retraits: string[]; refus: string[] }> = {};
  for (const [cle, tags] of Object.entries(hashtags)) {
    const ps = tags.filter((t) => t.startsWith('profession-')).map((t) => normaliser(t.slice('profession-'.length))).filter((p) => PROFESSION_VALIDE.test(p));
    if (ps.length) r[cle] = { ajouts: [...new Set(ps)], retraits: [], refus: [] };
  }
  return r;
}

/** Fusion : la table (première source) l'emporte ; les ajouts d'une autre source s'ajoutent s'ils ne sont pas retirés */
export function fusionnerRattachements(...sources: Rattachements[]): Rattachements {
  const r: Record<string, { ajouts: string[]; retraits: string[]; refus: string[] }> = {};
  for (const s of sources) {
    for (const [cle, e] of Object.entries(s)) {
      const x = (r[cle] ??= { ajouts: [], retraits: [], refus: [] });
      for (const p of e.retraits) if (!x.ajouts.includes(p) && !x.retraits.includes(p)) x.retraits.push(p);
      for (const p of e.ajouts) if (!x.ajouts.includes(p) && !x.retraits.includes(p)) x.ajouts.push(p);
      for (const p of e.refus) if (!x.refus.includes(p)) x.refus.push(p);
    }
  }
  return r;
}

/** Professions effectives d'un ingrédient (défaut ∪ ajouts − retraits) ; « commun » seul si l'ingrédient est commun */
export function professionsDeLIngredient(cle: string, r: Rattachements = {}): string[] {
  const e = r[cle];
  const ps = new Set(professionsParDefaut(cle));
  if (e) {
    for (const p of e.ajouts) ps.add(p);
    for (const p of e.retraits) ps.delete(p);
  }
  if (ps.has(COMMUN)) return [COMMUN];
  return [...ps];
}

export const estCommun = (cle: string, r: Rattachements = {}) => professionsDeLIngredient(cle, r).includes(COMMUN);

/** L'ingrédient est-il utilisable pour cette profession (commun, ou rattaché) ? */
export const ingredientPourProfession = (cle: string, profession: string, r: Rattachements = {}) => {
  const ps = professionsDeLIngredient(cle, r);
  return ps.includes(COMMUN) || ps.includes(idProfession(profession));
};

/** Ingrédients de la profession + communs (kits, tirages, Frigo) */
export const filtrerParProfession = <T extends { cle: string }>(liste: readonly T[], profession: string, r: Rattachements = {}): T[] =>
  liste.filter((a) => ingredientPourProfession(a.cle, profession, r));

/** Vu depuis une profession : commun, propre (elle seule), partagé (elle et d'autres), autre (pas pour elle) */
export type Partage = 'commun' | 'propre' | 'partage' | 'autre';
export const FILTRES_PARTAGE: readonly { id: Exclude<Partage, 'autre'> | ''; libelle: string }[] = [
  { id: '', libelle: 'Tous' },
  { id: 'commun', libelle: 'Communs' },
  { id: 'propre', libelle: 'Propres à cette profession' },
  { id: 'partage', libelle: 'Partagés' },
];
export const estFiltrePartage = (x: unknown): x is Exclude<Partage, 'autre'> => x === 'commun' || x === 'propre' || x === 'partage';

export function partageDeLIngredient(cle: string, profession: string, r: Rattachements = {}): Partage {
  const ps = professionsDeLIngredient(cle, r);
  if (ps.includes(COMMUN)) return 'commun';
  const p = idProfession(profession);
  if (!ps.includes(p)) return 'autre';
  return ps.length > 1 ? 'partage' : 'propre';
}

/**
 * Lignes à écrire pour « Aussi pour <profession> » (un élément ou un lot) : seulement les clés qui ne l'ont pas déjà ; jamais
 * pour un commun (déjà utilisable partout).
 */
export function lignesAjout(cles: readonly string[], profession: string, r: Rattachements = {}): LigneProfessionIngredient[] {
  const p = idProfession(profession);
  return [...new Set(cles)].filter((c) => !estCommun(c, r) && !professionsDeLIngredient(c, r).includes(p)).map((c) => ({ cle_asset: c, profession: p, action: 'ajout' }));
}

/** Lignes à écrire pour retirer une profession (jamais la dernière : un ingrédient garde au moins une profession) */
export function lignesRetrait(cles: readonly string[], profession: string, r: Rattachements = {}): LigneProfessionIngredient[] {
  const p = idProfession(profession);
  return [...new Set(cles)].filter((c) => { const ps = professionsDeLIngredient(c, r); return ps.includes(p) && ps.length > 1; }).map((c) => ({ cle_asset: c, profession: p, action: 'retrait' }));
}

/** Élément candidat à une suggestion de partage : ses sujets, hashtags et titre (lus en minuscules, sans accents) */
export type CandidatPartage = { cle: string; titre?: string; sujets?: readonly string[]; hashtags?: readonly string[] };
export type SuggestionPartage = { cle: string; raisons: string[] };

const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Suggestions « Aussi pour <profession> » : visuels (pas les communs) qui ne sont pas encore à la profession cible, dont un sujet,
 * un hashtag ou un mot du titre fait partie des mots-clés de partage du pack cible ; suggestions refusées exclues. Ordre : le plus
 * de raisons d'abord, puis l'ordre reçu.
 */
export function suggestionsDePartage(candidats: readonly CandidatPartage[], cible: { profession: string; motsCles: readonly string[] }, r: Rattachements = {}): SuggestionPartage[] {
  const p = idProfession(cible.profession);
  const mots = cible.motsCles.map(plat);
  const res: (SuggestionPartage & { i: number })[] = [];
  candidats.forEach((c, i) => {
    if (estCommun(c.cle, r) || professionsDeLIngredient(c.cle, r).includes(p) || r[c.cle]?.refus.includes(p)) return;
    const raisons = new Set<string>();
    for (const s of c.sujets ?? []) if (mots.includes(plat(s))) raisons.add(`thème ${s}`);
    for (const h of c.hashtags ?? []) if (mots.includes(plat(h))) raisons.add(`#${h}`);
    const motsTitre = plat(c.titre ?? '').split(/[^a-z0-9]+/);
    for (const m of mots) if (m.length > 2 && motsTitre.includes(m)) raisons.add(`« ${m} » dans le titre`);
    if (raisons.size) res.push({ cle: c.cle, raisons: [...raisons], i });
  });
  return res.sort((a, b) => b.raisons.length - a.raisons.length || a.i - b.i).map(({ cle, raisons }) => ({ cle, raisons }));
}
