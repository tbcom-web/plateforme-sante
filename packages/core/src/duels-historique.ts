// Historique des duels envoyé au navigateur (/admin/retours/duel), allégé (perf, retour de Paul du 2026-10-08 : « le tool
// commence un peu à ramer ») : la composition complète stockée dans les ingrédients d'un duel (~3 Ko par côté, ~4 Mo pour
// 1 500 duels) n'est lue côté navigateur que par matchsPaires (combinaisons-elements.ts), pour les duels de combinaisons
// d'éléments (dimension `paire:…`) dont un côté n'a pas de clé `paire=` (anciens duels). Partout ailleurs (classements par
// contexte, accord avec le juge, tirages, mobile) seules les clés comptent : on retire la composition des autres duels.
// Résultats identiques (duels-historique.test.ts) ; l'export quotidien lit la table, pas cette page.
import { lireDimensionPaire } from './combinaisons-elements';
import type { Duel } from './duels';

type AvecIngredients = Pick<Duel, 'dimension' | 'aIngredients' | 'bIngredients'>;

const sansComposition = (i: Duel['aIngredients']): Duel['aIngredients'] => {
  if (!i || !('composition' in i)) return i;
  const { composition: _retiree, ...reste } = i;
  return reste;
};

export function historiqueDuelsAllege<D extends AvecIngredients>(duels: readonly D[]): D[] {
  return duels.map((d) => (lireDimensionPaire(d.dimension) || (!('composition' in (d.aIngredients ?? {})) && !('composition' in (d.bIngredients ?? {})))
    ? d
    : { ...d, aIngredients: sansComposition(d.aIngredients), bIngredients: sansComposition(d.bIngredients) }));
}

// ---- Lecture allégée de la table des duels (perf, 2026-10-09) ----
// PostgREST lit dans les ingrédients seulement ce dont l'historique allégé a besoin (comme duels_apprentissage), sauf pour les
// duels de combinaisons d'éléments (dimension `paire:…`), lus complets. Même résultat que historiqueDuelsAllege(getDuels)
// (duels-historique.test.ts), environ un quart de données en moins.
const CLES_INGREDIENTS = ['atelier', 'assets', 'juge', 'element'] as const;
/** Colonnes PostgREST : ingrédients sans la composition, en colonnes séparées (a_atelier, a_assets…) */
export const COLONNES_INGREDIENTS_LEGERS = (['a', 'b'] as const).flatMap((c) => CLES_INGREDIENTS.map((k) => `${c}_${k}:${c}_ingredients->${k}`)).join(', ');
/** Ligne allégée → ligne au format de la table (a_ingredients / b_ingredients reconstitués), pour duelDepuisLigne */
export function ligneDuelLegere(l: Record<string, unknown>): Record<string, unknown> {
  const ing = (c: 'a' | 'b') => Object.fromEntries(CLES_INGREDIENTS.flatMap((k) => (l[`${c}_${k}`] === undefined || l[`${c}_${k}`] === null ? [] : [[k, l[`${c}_${k}`]]])));
  const r: Record<string, unknown> = { ...l, a_ingredients: ing('a'), b_ingredients: ing('b') };
  for (const c of ['a', 'b']) for (const k of CLES_INGREDIENTS) delete r[`${c}_${k}`];
  return r;
}
