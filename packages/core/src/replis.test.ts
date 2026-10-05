// Replis du site publié (replis.ts) : mentions sobres à la place des informations manquantes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecVille, aVille, retirerTextesProvisoires, ligneSansProvisoire, telephoneUtilisable, adresseUtilisable, nomAffiche, soinsParDefaut, modeContact } from './replis';

test('jeton {ville} : remplacé, ou retiré avec sa préposition', () => {
  assert.equal(avecVille('Bilan podologique à {ville}', 'Lyon'), 'Bilan podologique à Lyon');
  assert.equal(avecVille('Bilan podologique à {ville}', ''), 'Bilan podologique');
  assert.equal(avecVille('Au cabinet à {ville}, je vous reçois.', ''), 'Au cabinet, je vous reçois.');
  assert.equal(avecVille('Soins sur {ville} et alentours', ' '), 'Soins et alentours');
  assert.equal(aVille(''), '');
  assert.equal(aVille('Lyon'), 'à Lyon');
});

test('texte provisoire : le paragraphe est retiré', () => {
  assert.equal(retirerTextesProvisoires('Bonjour.\n\nN° [NumOrdre]\n\nÀ bientôt.'), 'Bonjour.\n\nÀ bientôt.');
  assert.equal(retirerTextesProvisoires('xxx'), '');
  assert.equal(retirerTextesProvisoires('Lorem ipsum dolor'), '');
  assert.equal(retirerTextesProvisoires(undefined), '');
  assert.equal(ligneSansProvisoire('Cabinet [nom]'), '');
  assert.equal(ligneSansProvisoire(' Cabinet des Tilleuls '), 'Cabinet des Tilleuls');
});

test('téléphone, adresse et nom utilisables', () => {
  assert.equal(telephoneUtilisable(''), false);
  assert.equal(telephoneUtilisable('04 78'), false);
  assert.equal(telephoneUtilisable('04 78 00 00 00'), true);
  assert.equal(adresseUtilisable({ adresse: '1 rue A', codePostal: '69006', ville: 'Lyon' }), true);
  assert.equal(adresseUtilisable({ adresse: '1 rue A', codePostal: '6900', ville: 'Lyon' }), false);
  assert.equal(adresseUtilisable({ adresse: '', codePostal: '69006', ville: 'Lyon' }), false);
  assert.equal(adresseUtilisable({ adresse: '1 rue A', codePostal: '1000', ville: 'Bruxelles' }, 'BE'), true);
  assert.equal(nomAffiche({ prenom: 'Camille', nom: 'Rousseau' }), 'Camille Rousseau');
  assert.equal(nomAffiche({ prenom: '', nom: 'Rousseau' }), 'Rousseau');
  assert.equal(nomAffiche({ prenom: 'Camille', nom: '' }), '');
});

test('soins par défaut : univers, spécialité, sinon podologie générale', () => {
  const catalogue = ['bilan-podologique', 'soins-de-pedicurie', 'semelles-orthopediques', 'podologie-du-sport', 'k-taping'];
  assert.deepEqual(soinsParDefaut({ specialite: 'generale' }, catalogue), ['bilan-podologique', 'soins-de-pedicurie', 'semelles-orthopediques']);
  assert.equal(soinsParDefaut({ specialite: 'sport' }, catalogue)[0], 'podologie-du-sport');
  assert.deepEqual(soinsParDefaut({ soinsEnAvant: ['k-taping'], specialite: 'inconnue' }, catalogue), ['k-taping']);
  assert.deepEqual(soinsParDefaut({ specialite: 'inconnue' }, catalogue), ['bilan-podologique', 'soins-de-pedicurie', 'semelles-orthopediques']);
});

test('prise de rendez-vous effective', () => {
  assert.equal(modeContact({ rdvEnLigne: true, telephone: '' }), 'en-ligne');
  assert.equal(modeContact({ rdvEnLigne: false, telephone: '0478000000' }), 'telephone');
  assert.equal(modeContact({ rdvEnLigne: false, telephone: '', email: 'a@b.fr' }), 'email');
  assert.equal(modeContact({ rdvEnLigne: false, telephone: '', email: '' }), 'cabinet');
});

test('lieu d’exercice sans ville : jamais de « à » orphelin', async () => {
  const { lieuEnClair, lieuCourt } = await import('./format');
  assert.equal(lieuEnClair('', ''), '');
  assert.equal(lieuEnClair('Brotteaux', ''), 'dans le quartier Brotteaux');
  assert.equal(lieuEnClair('', 'Lyon'), 'à Lyon');
  assert.equal(lieuCourt('', ''), '');
  assert.equal(lieuCourt('Brotteaux', ''), 'quartier Brotteaux');
});
