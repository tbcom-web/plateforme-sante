// Scores de prospection (prospection-score.ts) : signaux pondérés par l'ancienneté, liens entre lignes, raisons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attenuation, scorerProspection, specialitesDepuisDiplomes, type LigneScore } from './prospection-score';

const J = '2026-10-10';
const base = (x: Partial<LigneScore> & { cle: string; rpps: string }): LigneScore => ({ mode_exercice: 'Lib,indép,artis,com', ...x });

test('atténuation : plein à 3 mois, rien au-delà de 2 ans', () => {
  assert.equal(attenuation('2026-09-01', J), 1);
  assert.equal(attenuation('2026-02-01', J), 0.65);
  assert.equal(attenuation('2025-01-01', J), 0.35);
  assert.equal(attenuation('2020-01-01', J), 0);
  assert.equal(attenuation(null, J), 0);
});

test('spécialités repérées dans les diplômes', () => {
  assert.deepEqual(specialitesDepuisDiplomes(['DU Podologie appliquée au sport', 'DU Pied diabétique']), ['sport', 'diabete']);
  assert.deepEqual(specialitesDepuisDiplomes(["Diplôme d'Ostéopathe d'un établissement agréé"]), ['osteo']);
  assert.deepEqual(specialitesDepuisDiplomes([]), []);
});

test('installation : signaux concordants, adresse nouvelle, départ d’un autre lieu', () => {
  const lignes = [
    base({ cle: 'a|1', rpps: '10000000001', apparu_le: '2026-09-15', siret_cree_le: '2026-09-01', siret_source: 'siret', adresse_cle: 'x', role: 'Titulaire de cabinet', telephone: '0400000000', commune: 'Lyon' }),
    base({ cle: 'a|0', rpps: '10000000001', disparu_le: '2026-09-10', adresse_cle: 'y', commune: 'Vienne' }),
    base({ cle: 'b|1', rpps: '10000000002', apparu_le: '2026-09-20', adresse_cle: 'z', role: 'Collaborateur' }),
    base({ cle: 'c|1', rpps: '10000000003', adresse_cle: 'z', role: 'Titulaire de cabinet' }),
  ];
  const s = scorerProspection(lignes, J);
  const a = s.get('a|1')!;
  assert.equal(a.installation, 100); // 45 + 40 + 10 (adresse nouvelle) + 10 (départ) + 5 (titulaire), plafonné
  assert.ok(a.raisons.some((r) => r.l.startsWith('A quitté un autre lieu (Vienne)')));
  assert.ok(a.prospect >= 70);
  const b = s.get('b|1')!;
  assert.ok(b.raisons.some((r) => r.l.startsWith('Rejoint un cabinet existant (1 confrère')));
  assert.equal(s.get('a|0')!.prospect, 0); // n'exerce plus là
  assert.equal(s.get('c|1')!.installation, 10); // seul indice : numéro RPPS le plus élevé de l'échantillon
});

test('prospection : non libéral à zéro, spécialités comptées sans le diplôme européen', () => {
  const s = scorerProspection([
    base({ cle: 's|1', rpps: '10000000004', mode_exercice: 'Salarié' }),
    base({ cle: 'l|1', rpps: '10000000005', specialites: ['sport', 'eee'], secteur: 'Cabinet individuel' }),
  ], J);
  assert.equal(s.get('s|1')!.prospect, 0);
  const l = s.get('l|1')!;
  assert.ok(l.raisons.some((r) => r.l === 'Spécialité à mettre en avant : Sport' && r.p === 4));
  assert.equal(l.prospect, 4 + 5 + 6); // spécialité + cabinet individuel + installation 10 (numéro RPPS le plus élevé) × 0,55
});
