// Tests de l'inventaire des illustrations (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { illustrationUtilisable, inventaireIllustrations, markdownRetours, empreinteSvg, statutRevueBibliotheque } from './illustrations';
import { PICTOS } from './pictos';
import { DESSINS_PODOLOGIE } from './univers';
import { SPORTS } from './sports';
import { DESSINS_UNIVERS } from './dessins-univers';
import { STYLES_EXPERIMENTAUX, SUJETS_STYLES, hashtagsStyleExperimental } from './styles-experimentaux';
import { HASHTAGS_PAR_DEFAUT } from './kits';

test('clés uniques et rendus non vides', () => {
  const l = inventaireIllustrations();
  assert.equal(new Set(l.map((i) => i.cle)).size, l.length);
  for (const i of l) assert.match(i.svg(), /^<svg/, i.cle);
  assert.equal(l.filter((i) => i.type === 'picto').length, PICTOS.length + 3 * 12 + 3); // + directions de style à l'essai (pictos-directions.ts)
  assert.ok(l.some((i) => i.cle === 'dessin:orthonyxie:releve') && l.some((i) => i.cle === 'picto:orthonyxie'));
  assert.equal(l.filter((i) => i.type === 'dessin' && i.registre !== 'ligne' && !i.style).length, DESSINS_PODOLOGIE.length * 2 + SPORTS.length + DESSINS_UNIVERS.length);
});

test('registres expérimentaux : 5 sujets × 4 styles, clés stables, sans texte ni couleur littérale', () => {
  const l = inventaireIllustrations().filter((i) => i.style);
  assert.equal(l.length, SUJETS_STYLES.length * STYLES_EXPERIMENTAUX.length);
  for (const i of l) {
    assert.match(i.cle, /^dessin:[a-z-]+:(decoupe|riso|volume|geometrique)$/);
    assert.equal(i.statutParDefaut, 'a_revoir');
    for (const svg of [i.svg(), i.svgVariante!()]) {
      assert.ok(!/<text|<style|NaN|undefined/.test(svg), i.cle);
      assert.ok(!/(?<![\w-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])|\b(?:rgba?|hsla?)\(\s*[\d.]/i.test(svg), i.cle);
    }
  }
  for (const s of SUJETS_STYLES) for (const st of STYLES_EXPERIMENTAUX) assert.deepEqual(HASHTAGS_PAR_DEFAUT[`dessin:${s}:${st}`], hashtagsStyleExperimental(s, st));
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
