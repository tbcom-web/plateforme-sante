// Tests de l'inventaire des illustrations (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { illustrationUtilisable, inventaireIllustrations, markdownRetours, empreinteSvg, statutRevueBibliotheque } from './illustrations';
import { PICTOS } from './pictos';
import { DESSINS_PODOLOGIE } from './univers';

test('clés uniques et rendus non vides', () => {
  const l = inventaireIllustrations();
  assert.equal(new Set(l.map((i) => i.cle)).size, l.length);
  for (const i of l) assert.match(i.svg(), /^<svg/, i.cle);
  assert.equal(l.filter((i) => i.type === 'picto').length, PICTOS.length);
  assert.ok(l.some((i) => i.cle === 'dessin:orthonyxie:releve') && l.some((i) => i.cle === 'picto:orthonyxie'));
  assert.equal(l.filter((i) => i.type === 'dessin' && i.registre !== 'ligne').length, DESSINS_PODOLOGIE.length * 2);
});

test('statuts', () => {
  assert.equal(illustrationUtilisable('retire'), false);
  assert.equal(illustrationUtilisable('a_retravailler'), true);
  assert.equal(illustrationUtilisable(null), true);
  assert.equal(statutRevueBibliotheque('valide'), 'valide');
  assert.equal(statutRevueBibliotheque('brouillon'), 'a_revoir');
  assert.equal(empreinteSvg('<svg/>'), empreinteSvg('<svg/>'));
  assert.notEqual(empreinteSvg('<svg/>'), empreinteSvg('<svg />'));
});

test('export Markdown : seulement « À retravailler »', () => {
  const md = markdownRetours([
    { cle: 'picto:a', titre: 'A', source: 'pictos.ts', statut: 'a_retravailler', commentaire: 'trait trop fin', le: null },
    { cle: 'picto:b', titre: 'B', source: 'pictos.ts', statut: 'valide', commentaire: 'ok', le: null },
  ]);
  assert.ok(md.includes('picto:a') && md.includes('trait trop fin') && !md.includes('picto:b'));
});
