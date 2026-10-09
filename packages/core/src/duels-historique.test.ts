import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { historiqueDuelsAllege, ligneDuelLegere, COLONNES_INGREDIENTS_LEGERS } from './duels-historique';
import { accordJuge, classementsParContexte, duelDepuisLigne, type Duel } from './duels';
import { pairesElementsDuels } from './duels-compositions';
import { matchsPaires } from './combinaisons-elements';

// Duels réels exportés (retours/duels.json, forme de la table) : classements, accord avec le juge et paires apprises
// identiques avec ou sans les compositions retirées par historiqueDuelsAllege.
const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'retours', 'duels.json')))!;
const brut = JSON.parse(readFileSync(join(racine, 'retours', 'duels.json'), 'utf8')) as Record<string, unknown>[];
const duels = brut.map((d) => duelDepuisLigne({ ...d, a_cle: d.a, b_cle: d.b, dimension_differente: d.dimension, a_ingredients: d.aIngredients, b_ingredients: d.bIngredients, created_at: d.jour ? `${d.jour}T08:00:00Z` : null }))
  .filter((d): d is Duel => d !== null);

test('historiqueDuelsAllege : mêmes classements, même accord, mêmes paires', () => {
  assert.ok(duels.length > 10, 'export des duels lu');
  // Duel de paire SANS clé « paire= » : sa composition doit rester (repli de matchsPaires)
  const paire = { ...duels[0], dimension: 'paire:menu_ordinateur:police', aIngredients: { composition: { police: 'revue' } }, bIngredients: { composition: { police: 'grotesque' } } } as Duel;
  const tous = [...duels, paire];
  const allege = historiqueDuelsAllege(tous);
  assert.ok(JSON.stringify(allege).length < JSON.stringify(tous).length, 'historique plus léger');
  assert.deepEqual(allege.at(-1), paire, 'composition gardée pour une paire');
  assert.ok(allege.filter((d) => !d.dimension?.startsWith('paire:')).every((d) => !('composition' in d.aIngredients) && !('composition' in d.bIngredients)));
  assert.deepEqual(classementsParContexte(allege), classementsParContexte(tous));
  assert.deepEqual(accordJuge(allege), accordJuge(tous));
  assert.deepEqual(matchsPaires(allege), matchsPaires(tous));
  assert.deepEqual(pairesElementsDuels(allege), pairesElementsDuels(tous));
});

test('lecture allégée (colonnes JSON séparées) = historique allégé de la lecture complète', () => {
  const lignes = brut.map((d) => ({ type: d.type, scenario: d.scenario, a_cle: d.a, b_cle: d.b, dimension_differente: d.dimension, resultat: d.resultat, etiquettes: d.etiquettes, appareil: d.appareil, prediction: d.prediction, a_ingredients: d.aIngredients, b_ingredients: d.bIngredients, created_at: d.jour ? `${d.jour}T08:00:00Z` : null }));
  // Projection PostgREST `x_cle:x_ingredients->cle` (clé absente : null)
  const projeter = (l: Record<string, unknown>) => {
    const r: Record<string, unknown> = { ...l };
    delete r.a_ingredients; delete r.b_ingredients;
    for (const m of COLONNES_INGREDIENTS_LEGERS.split(', ')) {
      const [alias, chemin] = m.split(':'); const [col, cle] = chemin.split('->');
      const v = (l[col] as Record<string, unknown> | null)?.[cle];
      r[alias] = v === undefined ? null : v;
    }
    return r;
  };
  let n = 0;
  for (const l of lignes) {
    const complet = duelDepuisLigne(l);
    if (!complet || complet.dimension?.startsWith('paire:')) continue;
    assert.deepEqual(duelDepuisLigne(ligneDuelLegere(projeter(l))), historiqueDuelsAllege([complet])[0]);
    n++;
  }
  assert.ok(n > 10);
});
