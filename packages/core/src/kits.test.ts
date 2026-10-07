// Tests du kit Sports (sports.ts, kits.ts) et des hashtags par défaut (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KITS, KIT_SPORTS, HASHTAGS_PAR_DEFAUT, clesDuKit, sujetsDesKits } from './kits';
import { SPORTS, svgSport, pictoSport } from './sports';
import { inventaireIllustrations } from './illustrations';
import { estHashtag, hashtagsDepuisLignes, assetsDuHashtag } from './hashtags';
import { sujetsParDefaut } from './sujets-visuels';
import { svgPicto } from './pictos';

test('kit Sports : 12 sports, chaque ingrédient existe dans l’inventaire, brouillon, sujet « sport »', () => {
  assert.equal(KIT_SPORTS.elements.length, SPORTS.length);
  assert.equal(SPORTS.length, 12);
  assert.equal(KIT_SPORTS.statut, 'brouillon');
  const inv = new Map(inventaireIllustrations().map((i) => [i.cle, i]));
  for (const cle of clesDuKit(KIT_SPORTS)) {
    const i = inv.get(cle);
    assert.ok(i, cle);
    assert.equal(i!.statutParDefaut, 'a_revoir', cle);
    assert.ok(sujetsParDefaut({ cle, type: i!.type === 'picto' ? 'picto' : i!.registre === 'ligne' ? 'ligne' : 'dessin', soins: i!.soins }).includes('sport'), cle);
    assert.deepEqual(sujetsDesKits(cle), ['sport']);
  }
  assert.equal(new Set(KITS.map((k) => k.id)).size, KITS.length);
});

test('hashtags par défaut : valides, appliqués avant le journal (Paul peut retirer ou ajouter)', () => {
  for (const [cle, hs] of Object.entries(HASHTAGS_PAR_DEFAUT)) for (const h of hs) assert.ok(estHashtag(h), `${cle} #${h}`);
  const cle = 'ligne:sport-basket';
  assert.ok(HASHTAGS_PAR_DEFAUT[cle].includes('basket') && HASHTAGS_PAR_DEFAUT[cle].includes('cheville'));
  const etat = hashtagsDepuisLignes([{ cle, hashtag: 'cheville', action: 'retrait' }, { cle, hashtag: 'nba', action: 'ajout' }], HASHTAGS_PAR_DEFAUT);
  assert.ok(!etat[cle].includes('cheville') && etat[cle].includes('nba') && etat[cle].includes('basket'));
  assert.ok(assetsDuHashtag(etat, '#Basket').includes('picto:sport-basket'));
  assert.ok(assetsDuHashtag(etat, 'padel').includes('dessin:sport-tennis:pedagogique'));
  assert.deepEqual(hashtagsDepuisLignes([]), {});
});

test('rendus : aucun texte, trait continu en 1 à 3 chemins, picto dans la grille', () => {
  for (const s of SPORTS) {
    for (const r of ['ligne', 'pedagogique'] as const) {
      const svg = svgSport(s, r);
      assert.match(svg, /^<svg/);
      assert.ok(!/<text|NaN|undefined|Infinity/.test(svg), `${s} ${r}`);
      if (r === 'ligne') { const n = (svg.match(/<path\b/g) ?? []).length; assert.ok(n >= 1 && n <= 3, `${s} : ${n} chemins`); }
    }
    assert.ok(pictoSport(s).traits.length > 0);
  }
  assert.ok(svgPicto('sport-basket') && svgPicto('sport-course-a-pied') && svgPicto('sport-course'));
});
