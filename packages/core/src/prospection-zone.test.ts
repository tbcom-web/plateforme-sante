// Zone d'un cabinet (prospection-zone.ts) : nouveaux confrères à proximité hors même adresse, densité comparée à la moyenne.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerZones, type Commune } from './prospection-zone';
import { scorerProspection } from './prospection-score';

const J = '2026-10-10';
const communes = new Map<string, Commune>([
  ['A', { lat: 45.0, lon: 5.0, population: 10_000 }],
  ['B', { lat: 45.05, lon: 5.0, population: 10_000 }], // environ 5,6 km de A
  ['C', { lat: 46.0, lon: 5.0, population: 100_000 }], // environ 111 km : hors rayon, tire la moyenne nationale vers le bas
]);
const lib = 'Lib,indép,artis,com';
const s = (cle: string, rpps: string, code: string, extra = {}) => ({ cle, rpps, code_commune: code, mode_exercice: lib, adresse_cle: cle.split('|')[1], ...extra });

test('zone : nouveaux confrères dans le rayon, même adresse et praticien exclus ; densité', () => {
  const situations = [
    s('1|a1', '10000000001', 'A'),
    s('2|a1', '10000000002', 'A', { siret_cree_le: '2026-03-01' }), // même adresse que 1 : exclu pour 1
    s('3|a2', '10000000003', 'A', { siret_cree_le: '2025-01-01' }),
    s('4|b1', '10000000004', 'B', { apparu_le: '2026-09-01' }),
    s('5|b2', '10000000005', 'B', { siret_cree_le: '2019-01-01' }), // trop ancien
    s('6|c1', '10000000006', 'C', { siret_cree_le: '2026-01-01' }), // hors rayon
  ];
  const zones = calculerZones(situations, communes, J);
  const z = zones.get('1|a1')!;
  assert.equal(z.nouveaux3ans, 2); // 3 et 4
  assert.equal(z.nouveaux1an, 1); // 4
  assert.equal(z.podologues, 5);
  assert.equal(z.habitants, 20_000);
  assert.equal(z.densite, 2.5);
  assert.equal(z.densiteNationale, 0.5);
  assert.equal(z.rapport, 5);
  assert.equal(zones.get('2|a1')!.nouveaux3ans, 2); // 3 et 4, pas lui-même
});

test('score : argument de zone dans « Pourquoi maintenant », plafonné à 15', () => {
  const situations = [
    s('1|a1', '10000000001', 'A', { role: 'Titulaire de cabinet' }),
    ...Array.from({ length: 12 }, (_, i) => s(`n${i}|x${i}`, `100000002${String(i).padStart(2, '0')}`, i % 2 ? 'A' : 'B', { siret_cree_le: '2025-06-01' })),
  ];
  const zones = calculerZones(situations, communes, J);
  const r = scorerProspection(situations, J, [], zones).get('1|a1')!.raisons.filter((x) => x.k === 'zone');
  assert.ok(r[0].l.startsWith('12 podologues se sont installés à moins de 10 km depuis 3 ans'), r[0].l);
  assert.equal(r[0].p, 10);
  assert.ok(r[1].l.startsWith('Zone dense') && r[1].l.includes('moyenne nationale'), r[1].l);
  assert.equal(r.reduce((t, x) => t + x.p, 0), 15);
});
