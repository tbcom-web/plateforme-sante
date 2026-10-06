// Replis du site publié (replis.ts) : mentions sobres à la place des informations manquantes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecVille, aVille, retirerTextesProvisoires, ligneSansProvisoire, telephoneUtilisable, adresseUtilisable, nomAffiche, soinsParDefaut, soinsDeBase, SOINS_DE_BASE_MAX, modeContact, replisApercu, titreSoins, REPLIS } from './replis';

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
  // Acte spécialisé seul (k-taping) : jamais présenté d'office, repli sur la podologie générale
  assert.deepEqual(soinsParDefaut({ soinsEnAvant: ['k-taping'], specialite: 'inconnue' }, catalogue), ['bilan-podologique', 'soins-de-pedicurie', 'semelles-orthopediques']);
  assert.ok(!soinsParDefaut({ specialite: 'sport' }, catalogue).includes('k-taping'));
  assert.deepEqual(soinsParDefaut({ specialite: 'inconnue' }, catalogue), ['bilan-podologique', 'soins-de-pedicurie', 'semelles-orthopediques']);
});

test('soins par défaut du site = soins de base du parcours (jamais « Soins à domicile »)', () => {
  const connus = ['pied-diabetique', 'cors-durillons', 'ongles-epais', 'soins-a-domicile', 'podologie-du-senior', 'soins-de-pedicurie', 'semelles-orthopediques', 'bilan-podologique'];
  const priorites = { principaux: ['senior'], secondaires: ['diabete'] };
  const defaut = soinsParDefaut({ specialite: 'soins', soinsEnAvant: ['soins-a-domicile', 'podologie-du-senior'], priorites }, connus);
  assert.ok(!defaut.includes('soins-a-domicile'), defaut.join());
  assert.ok(defaut.length <= SOINS_DE_BASE_MAX && defaut[0] === 'podologie-du-senior');
  assert.deepEqual(defaut, soinsDeBase({ priorites }, connus));
  assert.ok(!soinsParDefaut({ specialite: 'soins' }, connus).includes('soins-a-domicile'));
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

test('aperçu de l’admin : mêmes replis que le site (ville, adresse, téléphone, rendez-vous)', () => {
  const vide = { pays: 'FR', cabinet: { nom: '', ville: '', telephone: '', email: '' }, lieux: [{ nom: '', adresse: '', codePostal: '', ville: '' }], praticiens: [{ prenom: '', nom: '' }], rdv: { mode: 'les_deux', url: '' } };
  const r = replisApercu(vide);
  assert.equal(r.ville, '');
  assert.equal(r.titreCabinet, 'Cabinet de pédicurie-podologie');
  assert.equal(r.adresse, REPLIS.adresse);
  assert.equal(r.aTelephone, false);
  assert.equal(r.telephone, '');
  assert.equal(r.rdvEnLigne, false);
  assert.equal(r.libelleContact, REPLIS.rdvCabinet);
  assert.equal(r.nomCabinet, REPLIS.nomCabinet);
  // Téléphone incomplet : jamais « Appeler le 0494123 »
  assert.equal(replisApercu({ ...vide, cabinet: { ...vide.cabinet, telephone: '0494123' } }).telephone, '');
  const plein = replisApercu({
    ...vide,
    cabinet: { nom: '', ville: 'Lyon', telephone: '0478000000', email: '' },
    lieux: [{ nom: '', adresse: '1 rue A', codePostal: '69006', ville: 'Lyon' }],
    praticiens: [{ prenom: 'Camille', nom: 'Rousseau' }],
    rdv: { mode: 'les_deux', url: 'https://www.doctolib.fr/podologue/lyon/camille-rousseau', outil: 'Doctolib' },
  });
  assert.equal(plein.titreCabinet, 'Cabinet de pédicurie-podologie à Lyon');
  assert.equal(plein.adresse, '1 rue A, 69006 Lyon');
  assert.equal(plein.telephone, '04 78 00 00 00');
  assert.equal(plein.rdvEnLigne, true);
  assert.equal(plein.nomCabinet, 'Cabinet de Camille Rousseau');
  // Lien vers l'accueil de la plateforme : pas de réservation en ligne, le bouton passe sur « Appeler »
  assert.equal(replisApercu({ ...vide, cabinet: { ...vide.cabinet, telephone: '0478000000' }, rdv: { mode: 'les_deux', url: 'https://www.doctolib.fr/' } }).libelleMenu, 'Appeler');
  assert.equal(titreSoins('je'), 'Mes soins');
  assert.equal(titreSoins('tiers'), 'Soins du cabinet');
});
