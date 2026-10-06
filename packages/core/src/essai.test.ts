// Essai gratuit (essai.ts) : dates, progression, garde production, relances, prochaine étape du praticien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajouterJours, ecartJours, finEssai, gardeProduction, jourParis, joursRestants, messageRelance, prochaineEtapeEssai, prochaineRelance,
  progressionParcours, prolongerEssai, relancesAFaire, relancesEssai, type EssaiPourRelances,
} from './essai';
import { verifierTexte } from './lexique';

test('fin d’essai : 3 mois calendaires, fin de mois ramenée au dernier jour', () => {
  assert.equal(finEssai('2026-10-06T08:00:00Z').toISOString(), '2027-01-06T08:00:00.000Z');
  assert.equal(finEssai('2026-11-30T10:00:00Z').toISOString(), '2027-02-28T10:00:00.000Z');
  assert.equal(finEssai('2027-05-31T10:00:00Z').toISOString(), '2027-08-31T10:00:00.000Z');
  assert.equal(finEssai('2026-01-31T10:00:00Z', 1).toISOString(), '2026-02-28T10:00:00.000Z');
});

test('jours calendaires de Paris et jours restants', () => {
  assert.equal(jourParis('2026-10-06T22:30:00Z'), '2026-10-07'); // minuit passé à Paris
  assert.equal(ajouterJours('2026-12-31', 1), '2027-01-01');
  assert.equal(ajouterJours('2026-03-29', -1), '2026-03-28');
  assert.equal(ecartJours('2026-10-06', '2027-01-06'), 92);
  assert.equal(joursRestants('2027-01-06T08:00:00Z', '2026-10-06T09:00:00Z'), 92);
  assert.equal(joursRestants('2026-10-01T08:00:00Z', '2026-10-06T09:00:00Z'), 0);
});

test('prolongation : depuis la fin, ou depuis aujourd’hui si l’essai est terminé', () => {
  assert.equal(prolongerEssai('2027-01-06T08:00:00Z', 30, '2026-12-01T00:00:00Z').toISOString(), '2027-02-05T08:00:00.000Z');
  assert.equal(prolongerEssai('2026-10-01T00:00:00Z', 15, '2026-10-10T00:00:00Z').toISOString(), '2026-10-25T00:00:00.000Z');
  assert.equal(prolongerEssai('2027-01-06T08:00:00Z', -5, '2026-12-01T00:00:00Z').toISOString(), '2027-01-06T08:00:00.000Z');
});

test('progression du parcours', () => {
  assert.equal(progressionParcours({ etape: 0, apercuGenere: false }), 0);
  assert.equal(progressionParcours({ etape: 3, apercuGenere: false }), 38);
  assert.equal(progressionParcours({ etape: 7, apercuGenere: false }), 88);
  assert.equal(progressionParcours({ etape: 99, apercuGenere: false }), 88);
  assert.equal(progressionParcours({ etape: null, apercuGenere: true }), 100);
});

test('garde production : un essai non validé ne part jamais en production', () => {
  assert.equal(gardeProduction({ enEssai: true, valideLe: null }).autorisee, false);
  assert.equal(gardeProduction({ enEssai: true, valideLe: '2026-11-01T10:00:00Z' }).autorisee, true);
  assert.equal(gardeProduction({ enEssai: false, valideLe: null }).autorisee, true);
});

const base = (x: Partial<EssaiPourRelances> = {}): EssaiPourRelances => ({
  debut: '2026-10-06T08:00:00Z', fin: '2027-01-06T08:00:00Z', etape: 2, apercuGenere: false, statutCommercial: 'nouveau',
  faites: {}, prochaineRelance: null, valideLe: null, paye: false, suspenduLe: null, ...x,
});

test('relances : calendrier complet', () => {
  const r = relancesEssai(base(), '2026-10-06');
  assert.deepEqual(r.map((x) => [x.code, x.date]), [
    ['j1_parcours', '2026-10-07'], ['j7', '2026-10-13'], ['j60', '2026-12-05'],
    ['fin_moins_15', '2026-12-22'], ['fin_moins_1', '2027-01-05'], ['fin_essai', '2027-01-06'],
  ]);
  assert.equal(r.at(-1)!.action, 'suspendre');
  assert.ok(r.every((x) => !x.aFaire));
});

test('relances : J+1 seulement si le parcours n’est pas terminé', () => {
  assert.ok(!relancesEssai(base({ apercuGenere: true }), '2026-10-07').some((x) => x.code === 'j1_parcours'));
  // déjà faite : conservée dans l'historique
  assert.ok(relancesEssai(base({ apercuGenere: true, faites: { j1_parcours: '2026-10-07' } }), '2026-10-08').some((x) => x.code === 'j1_parcours' && x.faite));
});

test('relances à faire aujourd’hui : la plus récente en retard, plus la relance manuelle', () => {
  assert.deepEqual(relancesAFaire(base(), '2026-10-07').map((x) => x.code), ['j1_parcours']);
  assert.deepEqual(relancesAFaire(base(), '2026-10-20').map((x) => x.code), ['j7']);
  assert.deepEqual(relancesAFaire(base({ faites: { j1_parcours: '2026-10-07', j7: '2026-10-13' } }), '2026-10-20'), []);
  assert.deepEqual(relancesAFaire(base({ prochaineRelance: '2026-10-09', faites: { j1_parcours: '2026-10-07' } }), '2026-10-09').map((x) => x.code), ['manuelle']);
  assert.deepEqual(relancesAFaire(base(), '2027-01-06').map((x) => x.code), ['fin_essai']);
});

test('relances : rien pour un essai gagné, perdu, validé, payé ou suspendu', () => {
  for (const x of [{ statutCommercial: 'gagne' }, { statutCommercial: 'perdu' }, { valideLe: '2026-11-01' }, { paye: true }, { suspenduLe: '2027-01-06' }]) {
    assert.deepEqual(relancesAFaire(base(x), '2027-02-01'), []);
  }
  // une relance manuelle reste possible pour un essai validé
  assert.equal(relancesAFaire(base({ valideLe: '2026-11-01', prochaineRelance: '2026-11-15' }), '2026-11-15').length, 1);
});

test('prochaine relance', () => {
  assert.equal(prochaineRelance(base({ faites: { j1_parcours: '2026-10-07' } }), '2026-10-08')?.code, 'j7');
  assert.equal(prochaineRelance(base({ statutCommercial: 'perdu' }), '2026-10-08'), null);
});

test('messages de relance : ton sobre, sans terme interdit par le lexique', () => {
  for (const code of ['j1_parcours', 'j7', 'j60', 'fin_moins_15', 'fin_moins_1', 'fin_essai'] as const) {
    const m = messageRelance(code, { prenom: 'Claire', finEssai: '6 janvier 2027', lienEssai: 'https://apercu.exemple.pages.dev' });
    assert.ok(m.objet && m.corps.startsWith('Bonjour Claire,'));
    assert.deepEqual(verifierTexte(`${m.objet} ${m.corps}`, 'strict').filter((a) => a.bloquante), [], code);
  }
});

test('prochaine étape du praticien en essai', () => {
  const e = { etape: 3, apercuGenere: false, miseEnLigneDemandee: false, suspendu: false, joursRestants: 80, paye: false };
  assert.equal(prochaineEtapeEssai(e).id, 'terminer_parcours');
  assert.equal(prochaineEtapeEssai({ ...e, etape: 7 }).id, 'generer');
  assert.equal(prochaineEtapeEssai({ ...e, apercuGenere: true }).id, 'demander_mise_en_ligne');
  assert.equal(prochaineEtapeEssai({ ...e, apercuGenere: true, miseEnLigneDemandee: true }).id, 'attente_validation');
  assert.equal(prochaineEtapeEssai({ ...e, apercuGenere: true, joursRestants: 0 }).id, 'termine');
  assert.equal(prochaineEtapeEssai({ ...e, suspendu: true }).id, 'suspendu');
});
