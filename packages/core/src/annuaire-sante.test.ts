// Annuaire Santé (annuaire-sante.ts) : normalisation de réponses FHIR construites d'après les exemples DOCUMENTÉS de l'ANS
// (docs/rpps-annuaire.md), fiches de démonstration fictives. Aucun appel réseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  casseNom, DEMOS_ANNUAIRE, diplomeEtatPresent, diplomesUniversitairesDe, ficheDemo, ficheDepuisBundles, memeVille, mentionSource,
  rechercheDemo, resumesDepuisBundle, rppsSaisi, telephoneLisible, type BundleFhir,
} from './annuaire-sante';
import { anglesDesDiplomes, professionDuCodeRpps, professionParcours } from './onboarding-professions';
import { themesDuMetier } from './onboarding';
import { pratiqueDe } from './pratiques';

const THEMES_PODO = themesDuMetier(pratiqueDe('podologue'));

// Réponse « Practitioner » telle que documentée (getting-started/test-api.md), noms remplacés par des valeurs d'exemple ;
// sans DU, sans système sur le type d'identifiant RPPS (tolérance), profession pédicure-podologue (80).
const PRATICIEN: BundleFhir = {
  resourceType: 'Bundle', total: 1,
  entry: [{ resource: {
    resourceType: 'Practitioner', id: '003-0000001', meta: { lastUpdated: '2026-09-30T10:00:00+02:00' },
    identifier: [{ type: { coding: [{ system: 'https://hl7.fr/ig/fhir/core/CodeSystem/fr-core-cs-v2-0203', code: 'IDNPS' }] }, value: '810000000009' }],
    name: [{ family: 'NOM-EXEMPLE', given: ['PRENOM'], prefix: ['MME'] }],
    qualification: [
      { code: { coding: [{ system: 'https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante', code: '80' }] } },
      { code: { coding: [{ system: 'https://mos.esante.gouv.fr/NOS/TRE_R48-DiplomeEtatFrancais/FHIR/TRE-R48-DiplomeEtatFrancais', code: 'DE12', display: 'Diplôme d\'Etat français de Pédicure-Podologue' }] } },
    ],
  } }],
};
const ROLES: BundleFhir = {
  resourceType: 'Bundle',
  entry: [
    { resource: { resourceType: 'PractitionerRole', id: 'r1', active: true, practitioner: { reference: 'Practitioner/003-0000001' }, organization: { reference: 'Organization/o2' }, code: [{ coding: [{ system: 'https://mos.esante.gouv.fr/NOS/TRE_R23-ModeExercice/FHIR/TRE-R23-ModeExercice', code: 'S' }] }] } },
    { resource: { resourceType: 'PractitionerRole', id: 'r2', active: true, practitioner: { reference: 'Practitioner/003-0000001' }, organization: { reference: 'Organization/o1' }, code: [{ coding: [{ system: 'https://mos.esante.gouv.fr/NOS/TRE_R23-ModeExercice/FHIR/TRE-R23-ModeExercice', code: 'L' }] }] } },
    { resource: { resourceType: 'PractitionerRole', id: 'r3', active: false, practitioner: { reference: 'Practitioner/003-0000001' }, organization: { reference: 'Organization/o3' } } },
    { resource: { resourceType: 'Organization', id: 'o1', name: 'CABINET EXEMPLE', address: [{ line: ['3 RUE DE L\'EXEMPLE'], postalCode: '13000', city: 'ST REMY DE PROVENCE' }], telecom: [{ system: 'phone', value: '+33199000000' }, { system: 'email', value: 'contact@exemple.invalid' }] } },
    { resource: { resourceType: 'Organization', id: 'o2', name: 'CENTRE EXEMPLE', address: [{ line: ['1 AVENUE DE L\'ESSAI'], postalCode: '13000', city: 'MARSEILLE' }] } },
    { resource: { resourceType: 'Organization', id: 'o3', name: 'ANCIEN', address: [{ line: ['9 RUE ANCIENNE'], city: 'PARIS' }] } },
  ],
};

test('fiche normalisée : identité d’exercice, RPPS depuis l’IDNPS, profession, diplôme d’État, libéral d’abord', () => {
  const f = ficheDepuisBundles(PRATICIEN, ROLES)!;
  assert.equal(f.rpps, '10000000009');
  assert.equal(f.prenom, 'Prenom');
  assert.equal(f.nom, 'Nom-Exemple');
  assert.equal(f.professionCode, '80');
  assert.equal(f.professionLibelle, 'Pédicure-podologue');
  assert.deepEqual(f.diplomes.map((d) => [d.code, d.type]), [['DE12', 'DE']]);
  assert.equal(f.lieux.length, 2, 'situation inactive ignorée');
  assert.equal(f.lieux[0].mode, 'liberal');
  assert.equal(f.lieux[0].adresse, '3 Rue de l\'Exemple');
  assert.equal(f.lieux[0].ville, 'Saint Remy de Provence');
  assert.equal(f.lieux[0].telephone, '01 99 00 00 00');
  assert.equal(f.lieux[1].telephone, '', 'pas de téléphone inventé');
  assert.equal(f.miseAJour, '2026-09-30');
  assert.equal(f.source, 'annuaire');
  assert.equal(professionDuCodeRpps(f.professionCode)?.id, 'podologue');
});

test('DU : jamais sans donnée réelle ; présent seulement s’il est dans la fiche', () => {
  const f = ficheDepuisBundles(PRATICIEN, ROLES)!;
  assert.deepEqual(diplomesUniversitairesDe(f), []);
  assert.deepEqual(anglesDesDiplomes(diplomesUniversitairesDe(f), professionParcours('podologue'), THEMES_PODO), [], 'aucun angle inventé');
  assert.ok(diplomeEtatPresent(f, ['DE12', 'DE86']));
  assert.ok(!diplomeEtatPresent(f, ['DE99']));
  const demo = ficheDemo('sport-basket')!;
  assert.deepEqual(diplomesUniversitairesDe(demo), ['DU Podologie du sport']);
  assert.deepEqual(anglesDesDiplomes(diplomesUniversitairesDe(demo), professionParcours('podologue'), THEMES_PODO), ['sport']);
  // DU déclaré seulement par son libellé (pas de TRE_R14)
  const sansType: BundleFhir = JSON.parse(JSON.stringify(PRATICIEN));
  sansType.entry![0].resource!.qualification!.push({ code: { coding: [{ system: 'https://mos.esante.gouv.fr/NOS/X-Diplome', code: 'DIP282', display: 'DU Podologie appliquée au sport' }] } });
  assert.deepEqual(diplomesUniversitairesDe(ficheDepuisBundles(sansType, null)), ['DU Podologie appliquée au sport']);
});

test('réponses incomplètes ou invalides : rien d’inventé', () => {
  assert.equal(ficheDepuisBundles(null, null), null);
  assert.equal(ficheDepuisBundles({ resourceType: 'Bundle', entry: [] }, null), null);
  const f = ficheDepuisBundles({ entry: [{ resource: { resourceType: 'Practitioner', id: 'x' } }] }, { entry: [{ resource: { resourceType: 'PractitionerRole', organization: { reference: 'Organization/absente' } } }] })!;
  assert.deepEqual([f.rpps, f.prenom, f.nom, f.professionCode, f.lieux.length, f.diplomes.length, f.miseAJour], ['', '', '', null, 0, 0, null]);
});

test('résumés de recherche : nom, profession, villes des situations actives', () => {
  const r = resumesDepuisBundle(PRATICIEN, ROLES);
  assert.deepEqual(r, [{ idFhir: '003-0000001', prenom: 'Prenom', nom: 'Nom-Exemple', professionLibelle: 'Pédicure-podologue', villes: ['Marseille', 'Saint Remy de Provence'] }]);
});

test('outils : casse, téléphone, RPPS saisi, villes', () => {
  assert.equal(casseNom('JEAN-MARIE DE LA TOUR'), 'Jean-Marie de la Tour');
  assert.equal(casseNom('Déjà Écrit'), 'Déjà Écrit');
  assert.equal(telephoneLisible('0199000101'), '01 99 00 01 01');
  assert.equal(rppsSaisi(' 100 000 000 01 '), '10000000001');
  assert.equal(rppsSaisi('1234'), '');
  assert.ok(memeVille('Saint-Étienne', 'ST ETIENNE'));
  assert.ok(!memeVille('Lyon', ''));
});

test('démonstration : fiches fictives seulement, mention explicite', () => {
  for (const d of DEMOS_ANNUAIRE) {
    const f = ficheDemo(d.persona)!;
    assert.equal(f.source, 'demonstration');
    assert.match(f.lieux[0].telephone, /^01 99 00/, 'plage de numéros réservée à la fiction');
    assert.match(f.rpps, /^1000000000\d$/);
  }
  assert.match(mentionSource(ficheDemo('enfant')!), /démonstration/);
  assert.match(mentionSource({ source: 'annuaire', miseAJour: '2026-09-30' }), /RPPS.*30 septembre 2026/);
  assert.equal(rechercheDemo('exemple', 'Lyon').length, 1);
  assert.equal(rechercheDemo('exemple', 'Paris').length, 0);
  assert.equal(ficheDemo('12345678901'), null);
});
