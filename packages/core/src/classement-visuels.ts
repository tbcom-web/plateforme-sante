// Suggestions de classement d'un visuel (demande de Paul, 2026-10-07 : « que le moteur suggère les rubriques / mots-clés
// par défaut auxquels on pourrait associer le visuel qu'on choisit »). Partout où l'on classe un visuel (Photos à découvrir,
// références d'illustration cochées, vue agrandie de la bibliothèque) : puces « suggérées » qu'un clic transforme en vrai
// sujet / hashtag. AUCUNE suggestion n'est appliquée automatiquement.
//
// Sources des suggestions, de la plus sûre à la moins sûre (confiance combinée « ou bruité » : 1 − Π(1 − poids)) :
//   - le dictionnaire métier FR ↔ EN (dictionnaire-metier.ts) appliqué à la requête, aux tags, au titre et à la description
//     fournis par la source (tags Pixabay / Openverse, texte alternatif Pexels, titre et catégories Wikimedia) ;
//   - le sujet / les hashtags de l'élément d'origine (pour une référence d'illustration) ;
//   - les tags bruts de la source (suggestionsHashtags de hashtags.ts : même logique que l'ancienne suggestion) ;
//   - les co-occurrences sur les visuels déjà classés (assets_hashtags et sujets effectifs) : « souvent avec #x ».
// Jamais le sujet « posture » (différé) ni un hashtag « postur… ». Module pur, déterministe.

import { correspondances, estHashtagExclu, SUJETS_EXCLUS } from './dictionnaire-metier';
import { normaliserHashtag, suggestionsHashtags, type HashtagsAssets } from './hashtags';
import { estSujetVisuel, SUJETS_VISUELS } from './photos-libres';

export type SuggestionSujet = { id: string; raison: string; confiance: number };
export type SuggestionHashtag = { tag: string; raison: string; confiance: number };
export type SuggestionsClassement = { sujets: SuggestionSujet[]; hashtags: SuggestionHashtag[] };

export type EntreeClassement = {
  requete?: string | null;
  tags?: readonly string[] | null;
  titre?: string | null;
  description?: string | null;
  /** Sujets / hashtags de l'élément d'origine (référence d'illustration) ou déjà connus du visuel */
  sujetsOrigine?: readonly string[];
  hashtagsOrigine?: readonly string[];
  /** Visuels déjà classés : hashtags (état courant) et sujets effectifs par clé */
  voisins?: { hashtags?: HashtagsAssets | null; sujets?: Readonly<Record<string, readonly string[]>> | null };
  /** Déjà choisis : jamais resuggérés */
  deja?: { sujets?: readonly string[]; hashtags?: readonly string[] };
  max?: { sujets?: number; hashtags?: number };
};

/** Poids de chaque origine (confiance d'un indice isolé) */
export const POIDS_CLASSEMENT = {
  dictionnaireTags: 0.6,
  dictionnaireRequete: 0.5,
  dictionnaireTexte: 0.4,
  origineSujet: 0.5,
  origineHashtag: 0.4,
  tagSource: 0.3,
  cooccurrence: 0.25,
} as const;

export const CONFIANCE_MIN = 0.15;

type Accu = Map<string, { poids: number[]; raisons: string[] }>;
const ajouter = (m: Accu, cle: string, poids: number, raison: string) => {
  const x = m.get(cle) ?? { poids: [], raisons: [] };
  x.poids.push(poids);
  if (!x.raisons.includes(raison)) x.raisons.push(raison);
  m.set(cle, x);
};
const combiner = (poids: readonly number[]) => Math.round((1 - poids.reduce((p, w) => p * (1 - w), 1)) * 100) / 100;

const libelleSujet = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;

/**
 * Sujets et hashtags suggérés pour un visuel, triés par confiance décroissante (puis ordre alphabétique) ; chaque suggestion
 * porte sa raison principale (la plus sûre d'abord). Ni « posture », ni ce qui est déjà choisi.
 */
export function suggererClassement(e: EntreeClassement): SuggestionsClassement {
  const sujets: Accu = new Map();
  const tags: Accu = new Map();
  const dejaS = new Set(e.deja?.sujets ?? []);
  const dejaH = new Set(e.deja?.hashtags ?? []);

  // 1. Dictionnaire métier sur chaque texte disponible
  const textes: [string, number, string][] = [
    ...(e.tags ?? []).map((t) => [t, POIDS_CLASSEMENT.dictionnaireTags, `tag « ${t} »`] as [string, number, string]),
    ...(e.requete ? [[e.requete, POIDS_CLASSEMENT.dictionnaireRequete, `recherche « ${e.requete} »`] as [string, number, string]] : []),
    ...(e.titre ? [[e.titre, POIDS_CLASSEMENT.dictionnaireTexte, 'titre de la source'] as [string, number, string]] : []),
    ...(e.description ? [[e.description, POIDS_CLASSEMENT.dictionnaireTexte, 'description de la source'] as [string, number, string]] : []),
  ];
  for (const [texte, poids, origine] of textes) {
    for (const c of correspondances(texte)) {
      const raison = `${origine} → « ${c.terme} »`;
      if (c.entree.sujet) ajouter(sujets, c.entree.sujet, poids, raison);
      for (const h of c.entree.hashtags ?? []) ajouter(tags, h, poids, raison);
    }
  }

  // 2. Élément d'origine
  for (const s of e.sujetsOrigine ?? []) ajouter(sujets, s, POIDS_CLASSEMENT.origineSujet, 'sujet de l’élément d’origine');
  for (const h of e.hashtagsOrigine ?? []) { const n = normaliserHashtag(h); if (n) ajouter(tags, n, POIDS_CLASSEMENT.origineHashtag, 'hashtag de l’élément d’origine'); }

  // 3. Tags bruts de la source (même règle que l'ancienne suggestion : tags, sinon mots de la description, puis requête ;
  //    une requête de plus de deux mots n'est pas un hashtag utile : « ingrown-toenail-brace »)
  const requeteCourte = e.requete && e.requete.trim().split(/\s+/).length <= 2 ? e.requete : null;
  for (const h of suggestionsHashtags({ tags: e.tags ?? [], description: e.description ?? e.titre ?? null, requete: requeteCourte }, [], 8)) {
    ajouter(tags, h, POIDS_CLASSEMENT.tagSource, 'tag de la source');
  }

  // 4. Co-occurrences sur les visuels déjà classés (à partir des hashtags et sujets les plus sûrs à ce stade)
  const hv = e.voisins?.hashtags ?? {};
  const sv = e.voisins?.sujets ?? {};
  const graines = [...tags.entries()].filter(([, x]) => combiner(x.poids) >= 0.4).map(([h]) => h);
  for (const g of graines) {
    const cles = Object.keys(hv).filter((k) => hv[k].includes(g));
    if (cles.length < 2) continue;
    const autresH: Record<string, number> = {};
    const autresS: Record<string, number> = {};
    for (const k of cles) {
      for (const h of hv[k]) if (h !== g) autresH[h] = (autresH[h] ?? 0) + 1;
      for (const s of sv[k] ?? []) autresS[s] = (autresS[s] ?? 0) + 1;
    }
    for (const [h, n] of Object.entries(autresH)) if (n >= 2) ajouter(tags, h, POIDS_CLASSEMENT.cooccurrence * Math.min(1, n / 3), `souvent avec #${g} (${n} visuels)`);
    for (const [s, n] of Object.entries(autresS)) if (n >= 2) ajouter(sujets, s, POIDS_CLASSEMENT.cooccurrence * Math.min(1, n / 3), `visuels #${g} rangés en ${libelleSujet(s)} (${n})`);
  }

  const trier = <T extends { confiance: number }>(l: T[], cle: (x: T) => string) => l.sort((a, b) => b.confiance - a.confiance || cle(a).localeCompare(cle(b)));
  const resS = trier(
    [...sujets.entries()]
      .filter(([id]) => estSujetVisuel(id) && !SUJETS_EXCLUS.includes(id) && !dejaS.has(id))
      .map(([id, x]) => ({ id, raison: x.raisons[0], confiance: combiner(x.poids) }))
      .filter((x) => x.confiance >= CONFIANCE_MIN),
    (x) => x.id,
  ).slice(0, e.max?.sujets ?? 4);
  const resH = trier(
    [...tags.entries()]
      .filter(([h]) => !estHashtagExclu(h) && !dejaH.has(h))
      .map(([tag, x]) => ({ tag, raison: x.raisons[0], confiance: combiner(x.poids) }))
      .filter((x) => x.confiance >= CONFIANCE_MIN),
    (x) => x.tag,
  ).slice(0, e.max?.hashtags ?? 8);
  return { sujets: resS, hashtags: resH };
}

/** Sujets effectifs de visuels de l'inventaire → table clé → sujets (co-occurrences) */
export function sujetsParCle(visuels: readonly { cle: string; sujets: readonly string[] }[]): Record<string, string[]> {
  return Object.fromEntries(visuels.map((v) => [v.cle, [...v.sujets]]));
}

// ---------------------------------------------------------------------------------------------------------------
// Journal des suggestions acceptées / refusées (table classement_suggestions, migration 0033)
// ---------------------------------------------------------------------------------------------------------------

export const CONTEXTES_SUGGESTION = ['bibliotheque', 'reference', 'photos'] as const;
export type ContexteSuggestion = (typeof CONTEXTES_SUGGESTION)[number];
export const NATURES_SUGGESTION = ['sujet', 'hashtag', 'requete'] as const;
export type NatureSuggestion = (typeof NATURES_SUGGESTION)[number];
export const DECISIONS_SUGGESTION = ['acceptee', 'refusee'] as const;
export type DecisionSuggestion = (typeof DECISIONS_SUGGESTION)[number];

export type DecisionClassement = { contexte: ContexteSuggestion; nature: NatureSuggestion; valeur: string; decision: DecisionSuggestion; raison?: string | null };

const VALEUR = /^[a-z0-9][a-z0-9 -]{0,59}$/;

/** Décision reçue du navigateur → ligne valide (null sinon) */
export function validerDecisionClassement(b: Partial<Record<keyof DecisionClassement, unknown>>): DecisionClassement | null {
  const contexte = (CONTEXTES_SUGGESTION as readonly unknown[]).includes(b.contexte) ? (b.contexte as ContexteSuggestion) : null;
  const nature = (NATURES_SUGGESTION as readonly unknown[]).includes(b.nature) ? (b.nature as NatureSuggestion) : null;
  const decision = (DECISIONS_SUGGESTION as readonly unknown[]).includes(b.decision) ? (b.decision as DecisionSuggestion) : null;
  const valeur = String(b.valeur ?? '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!contexte || !nature || !decision || !VALEUR.test(valeur)) return null;
  if (nature === 'sujet' && !estSujetVisuel(valeur)) return null;
  if (nature === 'hashtag' && normaliserHashtag(valeur) !== valeur) return null;
  const raison = typeof b.raison === 'string' && b.raison.trim() ? b.raison.replace(/\s+/g, ' ').trim().slice(0, 200) : null;
  return { contexte, nature, valeur, decision, raison };
}

/** Section « Suggestions refusées fréquentes » (retours/SYNTHESE.md) : refus par valeur, avec le taux d'acceptation */
export function markdownSuggestionsRefusees(lignes: readonly { nature: string; valeur: string; decision: string }[], opts: { titre?: string; max?: number } = {}): string {
  const l = [opts.titre ?? '## Suggestions refusées fréquentes', ''];
  const stats = new Map<string, { nature: string; valeur: string; refus: number; acceptations: number }>();
  for (const x of lignes) {
    const k = `${x.nature}:${x.valeur}`;
    const s = stats.get(k) ?? { nature: x.nature, valeur: x.valeur, refus: 0, acceptations: 0 };
    if (x.decision === 'refusee') s.refus++; else if (x.decision === 'acceptee') s.acceptations++;
    stats.set(k, s);
  }
  const refusees = [...stats.values()].filter((s) => s.refus >= 1).sort((a, b) => b.refus - a.refus || a.valeur.localeCompare(b.valeur)).slice(0, opts.max ?? 20);
  if (!refusees.length) { l.push('Aucune suggestion refusée pour l’instant.'); return l.join('\n'); }
  l.push('À corriger dans packages/core/src/dictionnaire-metier.ts (synonymes trop larges, variantes de requête hors sujet).', '');
  const nom = (s: { nature: string; valeur: string }) => (s.nature === 'hashtag' ? `#${s.valeur}` : s.nature === 'sujet' ? `sujet ${libelleSujet(s.valeur)}` : `requête « ${s.valeur} »`);
  for (const s of refusees) l.push(`- ${nom(s)} : refusée ${s.refus} fois, acceptée ${s.acceptations} fois`);
  return l.join('\n');
}
