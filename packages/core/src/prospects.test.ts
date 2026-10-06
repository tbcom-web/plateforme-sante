// Capture précoce, relances des prospects sans compte, entonnoir, leads de test (prospects.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  entonnoirEssai, estLeadTest, lienRepriseProspect, messageRelanceProspect, normaliserTelephone, relanceProspectAFaire, relancesProspect,
  utmDepuis, validerCapture, type DonneesEntonnoir,
} from './prospects';
import { libelleArretParcours, relancesEssai } from './essai';
import { verifierTexte } from './lexique';

test('leads de test : @webpodologue.fr ou « +test », insensible à la casse', () => {
  assert.equal(estLeadTest('paul.tremblot@webpodologue.fr'), true);
  assert.equal(estLeadTest(' Commerciale@WebPodologue.FR '), true);
  assert.equal(estLeadTest('paul+test1@gmail.com'), true);
  assert.equal(estLeadTest('paul+TEST@gmail.com'), true);
  assert.equal(estLeadTest('camille@cabinet-podo.fr'), false);
  assert.equal(estLeadTest('contact@webpodologue.fr.exemple.com'), false);
  assert.equal(estLeadTest('test@gmail.com'), false, '« test » sans + : vrai prospect possible');
  assert.equal(estLeadTest(null), false);
});

test('téléphone : formats français normalisés, étranger en +, invalide refusé', () => {
  assert.equal(normaliserTelephone('0612345678'), '06 12 34 56 78');
  assert.equal(normaliserTelephone('+33 6 12 34 56 78'), '06 12 34 56 78');
  assert.equal(normaliserTelephone('0033.4.78.00.00.00'), '04 78 00 00 00');
  assert.equal(normaliserTelephone('+32 470 12 34 56'), '+32470123456');
  assert.equal(normaliserTelephone(''), '');
  assert.equal(normaliserTelephone('  '), '');
  assert.equal(normaliserTelephone('12345'), null);
  assert.equal(normaliserTelephone('0012345678'), null);
  assert.equal(normaliserTelephone('06 12 34 56 7a'), null);
});

test('capture : champs obligatoires, accord de recontact obligatoire, conseils facultatifs', () => {
  const ok = validerCapture({ prenom: ' Camille ', nom: 'Rousseau', email: 'Camille@Exemple.FR', telephone: '06 12 34 56 78', ville: 'Lyon', recontact: 'on' });
  assert.deepEqual(ok, { ok: true, valeurs: { prenom: 'Camille', nom: 'Rousseau', email: 'camille@exemple.fr', telephone: '06 12 34 56 78', ville: 'Lyon', recontact: true, conseils: false } });
  const sansTel = validerCapture({ prenom: 'A', nom: 'B', email: 'a@b.fr', ville: 'Lyon', recontact: true, conseils: true });
  assert.equal(sansTel.ok && sansTel.valeurs.telephone, '');
  assert.equal(sansTel.ok && sansTel.valeurs.conseils, true);
  const ko = validerCapture({ prenom: '', nom: 'x'.repeat(81), email: 'pas-un-email', telephone: '123', ville: '', recontact: false });
  assert.equal(ko.ok, false);
  assert.deepEqual(Object.keys(!ko.ok ? ko.erreurs : {}).sort(), ['email', 'nom', 'prenom', 'recontact', 'telephone', 'ville']);
});

test('UTM : seulement utm_*, tronqués', () => {
  const p = new URLSearchParams({ utm_source: 'newsletter', utm_campaign: 'x'.repeat(150), autre: 'non', utm_term: '' });
  assert.deepEqual(utmDepuis(p), { utm_source: 'newsletter', utm_campaign: 'x'.repeat(100) });
  assert.deepEqual(utmDepuis({ utm_medium: 'site', gclid: 'abc' }), { utm_medium: 'site' });
  assert.deepEqual(utmDepuis(null), {});
});

test('relances prospect : J+1 et J+3 sans compte, rien après la création du compte', () => {
  const p = { creeLe: '2026-10-06T08:00:00Z', compteCreeLe: null, faites: {} };
  assert.deepEqual(relancesProspect(p, '2026-10-06').map((r) => [r.code, r.date, r.aFaire]), [['p1', '2026-10-07', false], ['p3', '2026-10-09', false]]);
  assert.equal(relancesProspect(p, '2026-10-07')[0].libelle, 'Prospect sans compte depuis 1 j');
  assert.equal(relanceProspectAFaire(p, '2026-10-06'), null);
  assert.equal(relanceProspectAFaire(p, '2026-10-07')?.code, 'p1');
  assert.equal(relanceProspectAFaire(p, '2026-10-10')?.code, 'p3', 'la plus récente en retard');
  assert.equal(relanceProspectAFaire({ ...p, faites: { p1: '2026-10-07' } }, '2026-10-08'), null);
  assert.equal(relanceProspectAFaire({ ...p, faites: { p1: '2026-10-07' } }, '2026-10-09')?.code, 'p3');
  assert.equal(relanceProspectAFaire({ ...p, faites: { p3: '2026-10-09' } }, '2026-10-12'), null);
  assert.deepEqual(relancesProspect({ ...p, compteCreeLe: '2026-10-06T09:00:00Z' }, '2026-10-12'), []);
});

test('relance du lendemain d’un compte : étape d’arrêt du parcours', () => {
  assert.equal(libelleArretParcours(0), 'Compte créé, parcours non commencé');
  assert.equal(libelleArretParcours(3), 'Compte créé, parcours arrêté à l’étape 3 sur 6');
  assert.equal(libelleArretParcours(7), 'Compte créé, parcours terminé, version d’essai non générée');
  const r = relancesEssai({ debut: '2026-10-06T08:00:00Z', fin: '2027-01-06T08:00:00Z', etape: 2, apercuGenere: false, statutCommercial: 'nouveau', faites: {}, prochaineRelance: null, valideLe: null, paye: false, suspenduLe: null }, '2026-10-07');
  assert.equal(r[0].libelle, 'Compte créé, parcours arrêté à l’étape 2 sur 6');
});

test('message de relance prospect : lien de reprise, ton sobre, lexique respecté', () => {
  const lien = lienRepriseProspect('https://admin.webpodologue.fr/', 'camille+cabinet@exemple.fr');
  assert.equal(lien, 'https://admin.webpodologue.fr/essai/inscription#email=camille%2Bcabinet%40exemple.fr');
  for (const code of ['p1', 'p3'] as const) {
    const m = messageRelanceProspect(code, { prenom: 'Camille', lienReprise: lien });
    assert.match(m.corps, /^Bonjour Camille,/);
    assert.ok(m.corps.includes(lien));
    assert.deepEqual(verifierTexte(`${m.objet} ${m.corps}`, 'strict').filter((a) => a.bloquante), [], code);
  }
});

test('entonnoir : période, cohorte des essais, tests exclus, taux', () => {
  const d: DonneesEntonnoir = {
    visites: [{ jour: '2026-09-20', nombre: 50 }, { jour: '2026-10-01', nombre: 80 }, { jour: '2026-10-05', nombre: 20 }],
    prospects: [
      { creeLe: '2026-10-01T09:00:00Z', email: 'a@exemple.fr' },
      { creeLe: '2026-10-02T09:00:00Z', email: 'b@exemple.fr' },
      { creeLe: '2026-10-03T09:00:00Z', email: 'c@exemple.fr' },
      { creeLe: '2026-10-03T09:00:00Z', email: 'd@exemple.fr' },
      { creeLe: '2026-10-03T09:00:00Z', email: 'paul+test@gmail.com' },
      { creeLe: '2026-09-01T09:00:00Z', email: 'ancien@exemple.fr' },
    ],
    essais: [
      { debut: '2026-10-01T10:00:00Z', email: 'a@exemple.fr', etape: 7, apercuGenereLe: '2026-10-01T11:00:00Z', miseEnLigneDemandeeLe: '2026-10-02T09:00:00Z', valideLe: '2026-10-03T09:00:00Z' },
      { debut: '2026-10-02T10:00:00Z', email: 'b@exemple.fr', etape: 3, apercuGenereLe: null, miseEnLigneDemandeeLe: null, valideLe: null },
      { debut: '2026-10-03T10:00:00Z', email: 'paul@webpodologue.fr', etape: 7, apercuGenereLe: '2026-10-03T11:00:00Z', miseEnLigneDemandeeLe: null, valideLe: null },
    ],
  };
  const e = entonnoirEssai(d, '2026-09-30');
  assert.deepEqual(e.map((x) => [x.id, x.nombre, x.taux]), [
    ['visites', 100, null], ['captures', 4, 4], ['comptes', 2, 50], ['parcours', 1, 50], ['apercu', 1, 100], ['demande', 1, 100], ['publie', 1, 100],
  ]);
  const vide = entonnoirEssai({ visites: [], prospects: [], essais: [] }, '2026-10-01');
  assert.ok(vide.every((x) => x.nombre === 0 && x.taux === null));
});
