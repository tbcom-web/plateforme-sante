// Tests des ingrédients de base des animations (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANIMATIONS } from './packs';
import { inventaireAssets } from './assets';
import { SOURCES_ANIMATIONS, animationDeCle, etatAnimation, etatsAnimations, markdownAnimationsEnAttente, animationEnAttente } from './animations-sources';
import { prochaineCarteAvecAttente } from './retours';
import { cssLectureAnimations, svgAnimationLecture, animationCanvas } from './animations-lecture';

test('chaque animation a des sources déclarées, toutes présentes dans l’inventaire', () => {
  const cles = new Set(inventaireAssets().map((a) => a.cle));
  for (const a of ANIMATIONS) {
    const sources = SOURCES_ANIMATIONS[a];
    assert.ok(sources && sources.length > 0, `${a} : aucune source`);
    assert.ok(cles.has(`animation:${a}`), `animation:${a} absente de l’inventaire`);
    for (const s of sources) {
      assert.ok(cles.has(s.cle), `${a} : ingrédient ${s.cle} absent de l’inventaire`);
      assert.ok(!s.cle.startsWith('animation:'), `${a} : une animation n’est pas un ingrédient de base (${s.cle})`);
      assert.ok(s.role.trim().length > 0, `${a} : rôle vide pour ${s.cle}`);
    }
    assert.equal(new Set(sources.map((s) => s.cle)).size, sources.length, `${a} : ingrédient en double`);
  }
  assert.deepEqual(Object.keys(SOURCES_ANIMATIONS).sort(), [...ANIMATIONS].sort());
});

test('état : en attente tant qu’un ingrédient n’est pas validé', () => {
  assert.equal(animationDeCle('animation:semelle'), 'semelle');
  assert.equal(animationDeCle('animation:inconnue'), null);
  assert.equal(animationDeCle('dessin:semelle:releve'), null);
  // Statuts par défaut : les dessins sont « À revoir » → en attente
  const e = etatAnimation('premiers-pas');
  assert.equal(e.enAttente, true);
  assert.equal(e.aValider.length, SOURCES_ANIMATIONS['premiers-pas'].length);
  // Tout validé → prête
  const tous = Object.fromEntries(SOURCES_ANIMATIONS['premiers-pas'].map((s) => [s.cle, 'valide' as const]));
  assert.equal(etatAnimation('premiers-pas', tous).enAttente, false);
  assert.equal(animationEnAttente('animation:premiers-pas', tous), false);
  // Un seul « À retravailler » suffit
  const un = { ...tous, 'dessin:enfant:releve': 'a_retravailler' as const };
  assert.equal(etatAnimation('premiers-pas', new Map(Object.entries(un))).aValider.map((i) => i.cle).join(), 'dessin:enfant:releve');
  assert.equal(etatsAnimations().length, ANIMATIONS.length);
});

test('Markdown des animations en attente', () => {
  const md = markdownAnimationsEnAttente();
  assert.match(md, /^## Animations en attente d’ingrédients validés/);
  assert.match(md, /`animation:meulage`/);
  assert.match(md, /- \[ \] `dessin:ongles-epais:releve`/);
  const tout = Object.fromEntries(Object.values(SOURCES_ANIMATIONS).flat().map((s) => [s.cle, 'valide' as const]));
  assert.match(markdownAnimationsEnAttente(tout), /Aucune/);
});

test('tirage : les cartes en attente passent après tout le reste', () => {
  const c = [{ cle: 'a' }, { cle: 'b' }, { cle: 'anim' }];
  const attente = (x: { cle: string }) => x.cle === 'anim';
  for (let i = 0; i < 20; i++) assert.notEqual(prochaineCarteAvecAttente(c, new Map(), new Set(), attente)?.cle, 'anim');
  assert.equal(prochaineCarteAvecAttente(c, new Map(), new Set(['a', 'b']), attente)?.cle, 'anim');
  assert.ok(prochaineCarteAvecAttente(c, new Map(), new Set(['a', 'b', 'anim']), attente));
  assert.equal(prochaineCarteAvecAttente([{ cle: 'anim' }], new Map(), new Set(), attente)?.cle, 'anim');
});

test('lecture dans l’admin : SVG animables et feuille de lecture', () => {
  for (const a of ANIMATIONS) {
    const s = svgAnimationLecture(a, `t-${a}`);
    if (animationCanvas(a)) assert.equal(s, null);
    else assert.match(s ?? '', /^<svg[^>]*al-svg/, a);
  }
  const css = cssLectureAnimations();
  for (const k of ['al-tj-trace', 'al-pp-pas', 'al-sm-courbe', 'mg-outil', 'al-scan']) assert.ok(css.includes(k), k);
  // Lecture forcée : les règles du meulage ne dépendent pas de prefers-reduced-motion
  assert.ok(!css.includes('prefers-reduced-motion'));
  assert.ok(css.includes('.al.al-joue .meulage .mg-outil'));
});
