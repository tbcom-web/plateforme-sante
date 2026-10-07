// Attributs d'harmonie : chaque paire, police, valeur de typographie, jeu et élément de détails, menu en a ; bornes 0-1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAIRES_POLICES, POLICES_TITRES, POLICES_TEXTE } from './modeles';
import { toutesClesTypo, AXES_TYPO } from './typo';
import { toutesClesDetails, ELEMENTS_DETAILS, JEUX_DETAILS } from './details';
import { toutesClesMenu, AXES_MENU } from './menus';
import { ATTRIBUTS_POLICES, ATTRIBUTS_PAIRES, attributsHarmonieCle } from './habillage-attributs';

test('attributs d’harmonie : complets et bornés', () => {
  const cles = [...toutesClesTypo(), ...toutesClesDetails(), ...toutesClesMenu(),
    ...Object.entries(AXES_TYPO).flatMap(([a, l]) => l.map((v) => `typo:${a}:${v.id}`)),
    ...JEUX_DETAILS.map((j) => `details:jeu:${j.id}`),
    ...Object.entries(ELEMENTS_DETAILS).flatMap(([e, l]) => l.map((v) => `details:${e}:${v.id}`)),
    ...Object.entries(AXES_MENU).flatMap(([a, l]) => l.map((v) => `menu:${a}:${v.id}`))];
  for (const k of cles) {
    const x = attributsHarmonieCle(k);
    assert.ok(x, k);
    for (const n of [x!.rondeur, x!.contraste, x!.energie, x!.formalite]) assert.ok(n >= 0 && n <= 1, k);
    assert.ok(x!.famille.length >= 1, k);
  }
  for (const p of PAIRES_POLICES) assert.ok(ATTRIBUTS_PAIRES[p.id]?.categorie, p.id);
  for (const id of [...POLICES_TITRES, ...POLICES_TEXTE]) assert.ok(ATTRIBUTS_POLICES[id], id);
});
