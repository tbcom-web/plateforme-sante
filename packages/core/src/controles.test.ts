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

test('brouillon totalement vide : rien ne bloque, chaque manque dit ce que le site affichera', () => {
  const r = controlerPublication(draftVide());
  assert.deepEqual(r.bloquants, []);
  const tout = r.remplacements.join('\n');
  for (const attendu of [/Ville non renseignée/, /Téléphone non renseigné/, /Adresse communiquée à la prise de rendez-vous/, /Aucun praticien nommé/, /Lien de prise de rendez-vous non renseigné/, /Aucune compétence/, /Cabinet de pédicurie-podologie/]) {
    assert.match(tout, attendu);
  }
  // Les remplacements font partie des conseils (affichés en ambre).
  assert.ok(r.remplacements.every((m) => r.conseils.includes(m)));
  // Jamais de crochets ni « à compléter » dans les messages.
  assert.ok(!/\[|à compléter/i.test(r.conseils.join(' ')));
});

test('code postal invalide, lien vers l’accueil de la plateforme, INAMI, texte provisoire, lexique strict : avertissements', () => {
  const d = site('123456780');
  d.lieux[0] = { ...d.lieux[0], codePostal: '6900' };
  d.rdv = { mode: 'les_deux', outil: 'Doctolib', url: 'https://www.doctolib.fr/' };
  d.praticiens[0] = { ...d.praticiens[0], bio: 'Présentation [à compléter].\n\nJe vous reçois au cabinet.' };
  const r = controlerPublication(d, 'strict');
  assert.deepEqual(r.bloquants, []);
  assert.ok(r.remplacements.some((m) => /Code postal invalide/.test(m)));
  assert.ok(r.remplacements.some((m) => /accueil de la plateforme.*téléphone du cabinet/.test(m)));
  assert.ok(r.remplacements.some((m) => /Texte provisoire.*ne sera pas publié/.test(m)));
  const be = site('');
  be.pays = 'BE';
  assert.ok(controlerPublication(be).remplacements.some((m) => /INAMI non renseigné.*omise/.test(m)));
  const promo = site('123456780');
  promo.message = { texte: 'Le meilleur podologue de Lyon', jusquAu: '' };
  const strict = controlerPublication(promo, 'strict');
  assert.deepEqual(strict.bloquants, []);
  assert.ok(strict.conseils.some((c) => /meilleur/i.test(c)));
});

test('sans téléphone : l’action de rendez-vous dépend du lien en ligne ou de l’e-mail', () => {
  const d = site('123456780');
  d.cabinet = { ...d.cabinet, telephone: '' };
  d.rdv = { mode: 'les_deux', outil: 'Doctolib', url: 'https://www.doctolib.fr/pedicure-podologue/lyon/camille-rousseau' };
  assert.ok(controlerPublication(d).remplacements.some((m) => /rendez-vous en ligne devient l’action principale/.test(m)));
  d.rdv = { mode: 'telephone', outil: '', url: '' };
  d.cabinet.email = 'contact@exemple.fr';
  assert.ok(controlerPublication(d).remplacements.some((m) => /e-mail/.test(m)));
  d.cabinet.email = '';
  assert.ok(controlerPublication(d).remplacements.some((m) => /Prise de rendez-vous au cabinet/.test(m)));
});

test('site complet : aucun remplacement', () => {
  const d = site('123456780');
  d.cabinet.nom = 'Cabinet des Tilleuls';
  assert.deepEqual(controlerPublication(d).remplacements, []);
});
