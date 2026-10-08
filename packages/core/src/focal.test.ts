import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blocFocal, ecartVisible, graisseEffective, tailleH1Focal, valeurFocale } from './focal';
import { varierDuel } from './duels-compositions';
import { compositionInitiale, habillageDe } from './recettes';
import { MODES_DUEL } from './duels';

test('blocs focalisés : seul le contenu touché, A au-dessus de B pour les tailles', () => {
  assert.deepEqual(blocFocal('typo:echelle'), { elements: ['surtitre', 'h1', 'h2', 'texte2'], empile: true });
  assert.deepEqual(blocFocal('typo:casse')!.elements, ['surtitre', 'h1', 'bouton']);
  assert.deepEqual(blocFocal('typo:graisse'), { elements: ['h1'], empile: true, grand: true });
  assert.deepEqual(blocFocal('typo:interlettrage')!.elements, ['surtitre', 'h1']);
  assert.deepEqual(blocFocal('polices')!.elements, ['surtitre', 'h1', 'paragraphe3']);
  assert.deepEqual(blocFocal('details:jeu:doux')!.elements, ['carte', 'bouton']);
  assert.equal(blocFocal('couleurs'), null);
  for (const d of MODES_DUEL.find((m) => m.id === 'tailles')!.dimensions) assert.ok(blocFocal(d));
});

test('tailles réelles et écart visible garanti', () => {
  assert.ok(tailleH1Focal({ echelle: 'spectaculaire' }, true) > tailleH1Focal({ echelle: 'affirmee' }, true));
  assert.ok(tailleH1Focal({ echelle: 'affirmee' }, false) > tailleH1Focal({ echelle: 'affirmee' }, true));
  assert.match(valeurFocale('typo:echelle', { police: 'revue', typo: { echelle: 'affirmee' } }, true), /^affirmée \(H1 \d+ px, H2 \d+ px\)$/);
  assert.ok(!ecartVisible('typo:echelle', { police: 'revue', typo: { echelle: 'modeste' } }, { police: 'revue', typo: { echelle: 'modeste' } }));
  assert.ok(ecartVisible('typo:echelle', { police: 'revue', typo: { echelle: 'modeste' } }, { police: 'revue', typo: { echelle: 'affirmee' } }));
  // Graisse : « celle de la paire » = graisse de la paire ; même graisse effective → pas d'écart
  const g = graisseEffective('revue', { graisse: 'paire' });
  const meme = (['fine', 'normale', 'grasse', 'noire'] as const).find((v) => Math.abs(graisseEffective('revue', { graisse: v }) - g) < 100);
  if (meme) assert.ok(!ecartVisible('typo:graisse', { police: 'revue', typo: { graisse: 'paire' } }, { police: 'revue', typo: { graisse: meme } }));
  // Les duels « Tailles et casse » tirés ont toujours un écart visible
  for (let i = 1; i <= 20; i++) {
    const c = { sujets: ['senior'], principaux: 1, couleursPreferees: [] as string[] };
    const x = compositionInitiale(c, i * 13);
    for (const d of ['typo:echelle', 'typo:graisse', 'typo:interlettrage', 'typo:casse']) {
      const y = varierDuel(x, d, c, i);
      if (y === x) continue;
      assert.ok(ecartVisible(d, { police: x.police, typo: habillageDe(x).typo }, { police: y.police, typo: habillageDe(y).typo }), `${d} ${i}`);
    }
  }
});
