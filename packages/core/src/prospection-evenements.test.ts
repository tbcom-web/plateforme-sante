// Actualités des cabinets (prospection-evenements.ts) : arrivées, départs, nouveaux cabinets, fermetures, rôles, déménagements.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evenementsDuJour, type EtatSituation } from './prospection-evenements';

const s = (cle: string, rpps: string, structure_cle: string, role = 'Collaborateur', extra: Partial<EtatSituation> = {}): EtatSituation => ({ cle, rpps, structure_cle, role, nom: `NOM${rpps.slice(-1)}`, ...extra });

test('arrivée dans un cabinet existant, avec le titulaire en place', () => {
  const avant = [s('1|A', '10000000001', 'A', 'Titulaire de cabinet')];
  const apres = [...avant, s('2|A', '10000000002', 'A')];
  const [e] = evenementsDuJour(avant, apres, '2026-10-11');
  assert.equal(e.type, 'arrivee');
  assert.equal(e.details.titulaires, 'NOM1');
  assert.equal(e.details.confreres, 1);
});

test('nouveau cabinet, départ, fermeture', () => {
  const avant = [s('1|A', '10000000001', 'A', 'Titulaire de cabinet'), s('2|A', '10000000002', 'A'), s('3|B', '10000000003', 'B', 'Titulaire de cabinet')];
  const apres = [s('1|A', '10000000001', 'A', 'Titulaire de cabinet'), s('4|C', '10000000004', 'C', 'Titulaire de cabinet')];
  const types = evenementsDuJour(avant, apres, '2026-10-11').map((e) => `${e.type}:${e.rpps.slice(-1)}`).sort();
  assert.deepEqual(types, ['depart:2', 'fermeture:3', 'nouveau_cabinet:4']);
});

test('reprise : collaborateur devenu titulaire ; déménagement', () => {
  const avant = [s('1|A', '10000000001', 'A'), s('5|D', '10000000005', 'D', 'Titulaire de cabinet', { commune: 'Lyon' })];
  const apres = [s('1|A', '10000000001', 'A', 'Titulaire de cabinet'), s('5|E', '10000000005', 'E', 'Titulaire de cabinet')];
  const ev = evenementsDuJour(avant, apres, '2026-10-11');
  assert.ok(ev.some((e) => e.type === 'role' && e.details.avant === 'Collaborateur' && e.details.apres === 'Titulaire de cabinet'));
  assert.ok(ev.some((e) => e.type === 'demenagement' && e.details.depuis_commune === 'Lyon'));
});

test('rien ne change : aucun événement', () => {
  const etat = [s('1|A', '10000000001', 'A', 'Titulaire de cabinet'), s('2|A', '10000000002', 'A')];
  assert.deepEqual(evenementsDuJour(etat, etat, '2026-10-11'), []);
});
