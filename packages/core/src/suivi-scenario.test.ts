import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gammesPreferees, respecterVerrous, suivreScenario } from './suivi-scenario';
import { compositionInitiale, stylesPermis, tirerDimension, toutChanger, type ContexteRecette, type PhotoBanque } from './recettes';

const ctx = (sujets: string[], couleurs: string[] = [], photos?: PhotoBanque[]): ContexteRecette => ({ sujets, principaux: Math.min(3, sujets.length), couleursPreferees: couleurs, ...(photos ? { photos } : {}) });

test('couleurs choisies dans le scénario : la gamme suit, sans attendre un dé (sauf couleurs verrouillées)', () => {
  const avant = ctx(['sport']);
  const x = compositionInitiale(avant);
  for (const couleur of ['rose', 'vert', 'jaune', 'bleu-nuit', 'violet']) {
    const apres = ctx(['sport'], [couleur]);
    const pref = gammesPreferees(apres);
    const y = suivreScenario(x, avant, apres, [], 7);
    if (pref.length) assert.ok(pref.includes(y.gamme), `${couleur} : ${y.gamme} parmi ${pref.join(', ')}`);
    assert.equal(suivreScenario(x, avant, apres, ['couleurs'], 7).gamme, x.gamme, 'couleurs verrouillées : gamme gardée');
  }
});

test('sujets changés : photos et héros du nouveau sujet n° 1', () => {
  const pool: PhotoBanque[] = [
    { url: '/photos/sport-a.webp', sujets: ['sport'], origine: 'integree' },
    { url: '/photos/enfant-a.webp', sujets: ['enfant'], origine: 'integree' },
  ];
  const avant = ctx(['sport'], [], pool);
  const x = { ...compositionInitiale(avant), visuels: { style: 'photos' as const, herosSujet: 'sport', animation: null }, photos: ['/photos/sport-a.webp'] };
  const apres = ctx(['enfant'], [], pool);
  const y = suivreScenario(x, avant, apres, [], 3);
  assert.ok(!y.photos.includes('/photos/sport-a.webp'), 'photo de l’ancien sujet retirée');
  if (y.visuels.herosSujet) assert.equal(y.visuels.herosSujet, 'enfant');
  assert.ok(suivreScenario(x, avant, apres, ['photos'], 3).photos.includes('/photos/sport-a.webp'), 'photos verrouillées : gardées');
});

test('verrous : « Tout changer » et les dés ne touchent jamais une dimension verrouillée', () => {
  const c = ctx(['sport', 'ongles']);
  const x = compositionInitiale(c);
  for (let g = 0; g < 40; g++) {
    for (const v of [['visuels'], ['couleurs'], ['polices'], ['effets'], ['visuels', 'couleurs']]) {
      const y = respecterVerrous(x, toutChanger(x, v, c, g), v, c);
      if (v.includes('visuels')) { assert.equal(y.visuels.style, x.visuels.style, `style verrouillé (graine ${g})`); assert.ok(stylesPermis(c, y.structure).includes(y.visuels.style)); }
      if (v.includes('couleurs')) assert.equal(y.gamme, x.gamme);
      if (v.includes('polices')) assert.equal(y.police, x.police);
      if (v.includes('effets')) assert.equal(y.effets, x.effets);
    }
    // Dé Structure avec le style verrouillé
    const s = respecterVerrous(x, tirerDimension(x, 'structure', c, g), ['visuels'], c);
    assert.equal(s.visuels.style, x.visuels.style);
  }
});
