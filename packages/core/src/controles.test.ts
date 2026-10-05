// Contrôles avant publication : le n° d'Ordre et le RPPS avertissent sans jamais bloquer (règle de Paul, 2026-10-05).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlerPublication, numeroFictif, numeroOrdreAffichable, rppsAffichable } from './controles';
import { draftVide, type SiteDraft } from './draft';

const site = (numeroOrdre: string, rpps = ''): SiteDraft => {
  const d = draftVide();
  d.cabinet = { ...d.cabinet, ville: 'Lyon', telephone: '04 78 00 00 00' };
  d.lieux[0] = { ...d.lieux[0], adresse: '12 rue des Tilleuls', codePostal: '69006', ville: 'Lyon' };
  d.praticiens[0] = { ...d.praticiens[0], prenom: 'Camille', nom: 'Rousseau', numeroOrdre, rpps };
  d.rdv = { mode: 'telephone', outil: '', url: '' };
  d.soins = ['ongle-incarne'];
  return d;
};

test('n° d’Ordre manquant, mal formé, fictif ou en double : avertissement, jamais bloquant', () => {
  for (const n of ['', '12345', '10003456789', '111111111']) {
    const r = controlerPublication(site(n));
    assert.equal(r.bloquants.some((b) => /Ordre|RPPS/.test(b)), false, `bloquant pour « ${n} »`);
    assert.ok(r.conseils.some((c) => /Ordre/.test(c)), `pas d’avertissement pour « ${n} »`);
  }
  const d = site('123456780');
  d.praticiens.push({ ...d.praticiens[0], id: 'p2', prenom: 'Lou' });
  assert.equal(controlerPublication(d).bloquants.length, 0);
  assert.ok(controlerPublication(d).conseils.some((c) => /même n° d’Ordre/.test(c)));
});

test('RPPS mal formé ou fictif : avertissement seulement', () => {
  for (const n of ['1234', '11111111111']) {
    const r = controlerPublication(site('123456780', n));
    assert.equal(r.bloquants.length, 0);
    assert.ok(r.conseils.some((c) => /RPPS/.test(c)));
  }
});

test('seuls les numéros bien formés et non fictifs sont affichés', () => {
  assert.equal(numeroFictif('111111111'), true);
  assert.equal(numeroOrdreAffichable('123 456 780'), '123456780');
  assert.equal(numeroOrdreAffichable('12345'), '');
  assert.equal(numeroOrdreAffichable('10003456789'), '');
  assert.equal(numeroOrdreAffichable('111111111'), '');
  assert.equal(rppsAffichable('10003456789'), '10003456789');
  assert.equal(rppsAffichable('123'), '');
});
