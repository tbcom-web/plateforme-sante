import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { empreinteImage, ligneJuge, lirePredictions, markdownCalibration, mesurerJuge, pairesJuge, predictionPour, type PredictionJuge } from './juge';

const p = (cle: string, empreinte: string, note: number, le = '2026-10-07'): PredictionJuge =>
  ({ cle, empreinte, note, confiance: 'moyenne', vaBien: 'a', generait: 'b', eliminatoire: note <= 2 ? 'clipart' : null, profil: 'v1', le });

test('predictionPour : seulement si l’empreinte est celle de l’élément', () => {
  const l = [p('dessin:a:releve', 'e1', 4), p('dessin:a:releve', 'e2', 2, '2026-10-08')];
  assert.equal(predictionPour(l, 'dessin:a:releve', 'e1')?.note, 4);
  assert.equal(predictionPour(l, 'dessin:a:releve', 'e2')?.note, 2);
  assert.equal(predictionPour(l, 'dessin:a:releve', 'e3'), null);
  assert.equal(predictionPour(l, 'dessin:a:releve', null), null);
});

test('pairesJuge et mesures : même clé et même empreinte, dernière note', () => {
  const preds = [p('a', 'e1', 4), p('b', 'e1', 2), p('c', 'x', 5), p('photo:x', empreinteImage('/photos/x.webp?v=1'), 3)];
  const notes = [
    { cle: 'a', note: 3, empreinte: 'e1', le: '2026-10-07' },
    { cle: 'a', note: 5, empreinte: 'e1', le: '2026-10-09' },
    { cle: 'b', note: 1, empreinte: 'e1', le: '2026-10-08' },
    { cle: 'c', note: 5, empreinte: 'autre', le: '2026-10-08' },
    { cle: 'photo:x', note: 4, empreinte: null, le: '2026-10-08' },
  ];
  const paires = pairesJuge(preds, notes, (cle) => (cle === 'photo:x' ? 'img:/photos/x.webp' : null));
  assert.deepEqual(paires.map((x) => [x.cle, x.predite, x.paul]), [['a', 4, 5], ['b', 2, 1], ['photo:x', 3, 4]]);
  const m = mesurerJuge(paires);
  assert.equal(m.n, 3);
  assert.equal(m.exactes, 0);
  assert.equal(m.aUnPres, 3);
  assert.equal(m.accordEliminatoires, 3);
  assert.match(ligneJuge(paires) ?? '', /^Juge : 3\/3 justes à ±1/);
  assert.match(markdownCalibration(paires), /\| v1 \| 3 \|/);
  assert.equal(ligneJuge([]), null);
});

test('retours/predictions.json : lisible, sans donnée personnelle, notes 1 à 5', () => {
  const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'retours', 'predictions.json')))!;
  const brut = readFileSync(join(racine, 'retours', 'predictions.json'), 'utf8');
  assert.doesNotMatch(brut, /@|auteur|e-mail|email/i);
  const l = lirePredictions(JSON.parse(brut));
  assert.ok(l.length >= 40);
  for (const x of l) assert.ok(x.vaBien && x.generait && x.profil && /^\d{4}-\d{2}-\d{2}$/.test(x.le), x.cle);
});
