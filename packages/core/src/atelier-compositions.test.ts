import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aValiderDansComposition, compositionAtelier, desAtelier, DIMENSIONS_FIXEES_ATELIER, reglagesAtelier } from './atelier-compositions';
import { cleCombinaison, clesAtelier, ingredientsCanoniques, ingredientsProposition, sujetsPris } from './atelier';
import { lotsPropositions } from './propositions';
import { DIMENSIONS_RECETTE, FAMILLES_COMPOSANTS, PAGES_STRUCTURE, type ContexteRecette } from './recettes';
import { violationsDures } from './harmonie';

const scenarios = [
  { principaux: ['sport'], secondaires: ['enfant'], couleurs: [] },
  { principaux: ['diabete', 'senior'], secondaires: [], couleurs: ['bleu'] },
  { principaux: ['enfant'], secondaires: [], couleurs: ['vert'] },
  { principaux: ['ongles', 'semelles'], secondaires: ['sport'], couleurs: [] },
];

function combinaisons(nbLots = 4) {
  const res = [];
  for (const s of scenarios) {
    const e = { priorites: { principaux: s.principaux, secondaires: s.secondaires }, couleursPreferees: s.couleurs };
    const c: ContexteRecette = { sujets: sujetsPris(e), principaux: s.principaux.length, couleursPreferees: s.couleurs };
    for (const p of lotsPropositions(e, nbLots).flat()) res.push({ p, e, c, x: compositionAtelier(p, c, [], 0) });
  }
  return res;
}

test('atelier : les dés viennent du registre (aucune liste figée)', () => {
  const des = desAtelier();
  for (const d of DIMENSIONS_RECETTE) assert.equal(des.includes(d.id), !DIMENSIONS_FIXEES_ATELIER.includes(d.id), d.id);
  for (const p of PAGES_STRUCTURE) assert.ok(des.includes(`page:${p.id}`), p.id);
  for (const f of FAMILLES_COMPOSANTS) assert.ok(des.includes(`composant:${f}`), f);
});

test('atelier : la proposition est gardée, le reste est complet, déterministe et sans violation dure', () => {
  const l = combinaisons(2);
  assert.ok(l.length >= 12);
  for (const { p, c, x } of l) {
    assert.equal(x.structure, p.univers);
    assert.equal(x.gamme, p.gamme);
    assert.equal(x.visuels.style, p.style);
    assert.ok(x.typo && x.details && x.menu);
    assert.deepEqual(compositionAtelier(p, c, [], 0), x);
    assert.deepEqual(violationsDures(x, { sujets: c.sujets }), [], p.id);
  }
});

test('atelier : toute dimension du registre peut apparaître dans une combinaison (nouveaux premiers écrans, en-têtes, portraits, habillage)', () => {
  const l = combinaisons(5);
  const vues = (f: (x: (typeof l)[number]['x']) => string) => new Set(l.map(({ x }) => f(x)));
  // Dimensions tirées : plusieurs valeurs rencontrées
  assert.ok(vues((x) => x.police).size >= 3, 'polices');
  assert.ok(vues((x) => x.effets).size >= 2, 'effets');
  assert.ok(vues((x) => x.traitement.id).size >= 2, 'traitement');
  assert.ok(vues((x) => JSON.stringify(x.typo)).size >= 3, 'typo');
  assert.ok(vues((x) => JSON.stringify(x.details)).size >= 3, 'details');
  assert.ok(vues((x) => JSON.stringify(x.menu)).size >= 2, 'menu');
  // Familles d'éléments : chacune présente dans au moins une combinaison dont le gabarit la rend variable
  const familles = new Set(l.flatMap(({ x }) => Object.keys(x.sections.variantes)));
  const absentes = FAMILLES_COMPOSANTS.filter((f) => !familles.has(f) && !['fiche'].includes(f));
  assert.deepEqual(absentes, [], `familles jamais tirées : ${absentes.join(', ')}`);
  assert.ok(vues((x) => (x.sections.variantes as Record<string, string>).accueil ?? '').size >= 4, 'premiers écrans variés');
  // Ingrédients « à valider » : tirés pour Paul (badge), jamais refusés par l'atelier
  assert.ok(l.some(({ x }) => aValiderDansComposition(x).length > 0), 'au moins un ingrédient à valider rencontré');
});

test('atelier : les réglages sont notés avec la combinaison (clé, apprentissage) sans changer les anciennes clés', () => {
  const { p, e, x } = combinaisons(1)[0];
  const sans = ingredientsProposition(p, e);
  const reglages = reglagesAtelier(x, sujetsPris(e));
  assert.ok(reglages.some((k) => k.startsWith('police=')) && reglages.some((k) => k.startsWith('typo=')) && reglages.some((k) => k.startsWith('traitement=')));
  const avec = ingredientsCanoniques({ ...sans, reglages });
  assert.deepEqual(avec.reglages, [...new Set(reglages)].sort());
  assert.notEqual(cleCombinaison(avec), cleCombinaison(sans));
  assert.equal(cleCombinaison(ingredientsCanoniques(sans)), cleCombinaison(sans));
  const cles = clesAtelier(avec).map((k) => k.cle);
  for (const k of reglages) assert.ok(cles.includes(k), k);
  assert.equal(ingredientsCanoniques({ ...sans, reglages: ['pas une clé', 'police=x y'] }).reglages, undefined);
});
