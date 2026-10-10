// Liants entre sections (liants-sections.ts, retour de Paul du 2026-10-10 : légende « Pieds de l'enfant » collée contre l'ombre
// de la section suivante) : chaque liant a sa propre bande d'air, jamais posée sur un contenu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIR_LIANT, AIR_LIANT_MIN_PX, cssBandeLiant } from './liants-sections';
import { cssTransitionsSections } from './heros-photo';
import { cssDetails, detailsDuJeu, ELEMENTS_DETAILS } from './details';

test('bande d’air : marge haute = hauteur du liant + 2 × air, liant centré dedans', () => {
  assert.ok(AIR_LIANT_MIN_PX >= 16);
  assert.match(AIR_LIANT, /clamp\(20px/);
  const css = cssBandeLiant(20);
  assert.match(css, /margin-top:calc\(20px \+ 2 \* var\(--espace-element/);
  assert.match(css, /::before\{top:calc\(-1 \* var\(--espace-element,[^)]*\)\) - 10px\)\}/);
});

test('séparateurs du jeu de détails : bande d’air, plus jamais centrés sur la limite des sections', () => {
  for (const { id } of ELEMENTS_DETAILS.separateur.filter((x) => x.id !== 'aucun')) {
    const css = cssDetails({ ...detailsDuJeu('gabarit'), jeu: 'classique-sobre', separateur: id });
    assert.match(css, /margin-top:calc\(\d+px \+ 2 \* var\(--espace-element/, id);
    assert.doesNotMatch(css, /top:0[;!}]/, id);
  }
});

test('chevrons : bande d’air ; vague : padding imposé et air ; chevauchement : jamais par-dessus un contenu', () => {
  const ch = cssTransitionsSections('chevrons');
  assert.match(ch, /margin-top:calc\(20px \+ 2 \*/);
  assert.doesNotMatch(ch, /top:0;/);
  const v = cssTransitionsSections('vague');
  assert.match(v, /padding-block:56px!important;margin-block:var\(--espace-element/);
  const c = cssTransitionsSections('chevauchement');
  // Recouvrement seulement là où :has() réserve une bande vide sous la section précédente (36 px + ombre + air)
  assert.match(c, /@supports selector\(:has\(\+ \*\)\)\{[^}]*:has\(\+[^{]*\)\{border-bottom:calc\(48px \+ var\(--espace-element/);
  assert.equal(c.split('margin-top:-36px').length, 2);
  assert.ok(c.indexOf('margin-top:-36px') > c.indexOf('@supports'));
});
