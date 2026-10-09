// Prospection RPPS (prospection.ts) : signal d'installation, filtres de la page, export CSV.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvProspection, installation, lireFiltresProspection, moisAvant, parametresProspection, type LigneExport } from './prospection';

test('moisAvant : mois calendaires, fin de mois ramenée au dernier jour', () => {
  assert.equal(moisAvant('2026-10-09', 3), '2026-07-09');
  assert.equal(moisAvant('2026-10-09', 12), '2025-10-09');
  assert.equal(moisAvant('2026-05-31', 3), '2026-02-28');
  assert.equal(moisAvant('2026-01-15', 2), '2025-11-15');
});

test('installation : signal le plus récent, source lisible', () => {
  assert.equal(installation({}), null);
  assert.deepEqual(installation({ siret_cree_le: '2024-07-29', siret_source: 'siret', apparu_le: null }), { date: '2024-07-29', source: 'siret', libelle: 'SIRET créé' });
  assert.equal(installation({ siret_cree_le: '2018-02-12', siret_source: 'siret', apparu_le: '2026-10-01' })?.source, 'rpps');
  assert.equal(installation({ siret_cree_le: '2026-09-01', siret_source: 'nom' })?.libelle, 'Établissement trouvé par nom (à confirmer)');
});

test('filtres : valeurs par défaut et saisies refusées', () => {
  const f = lireFiltresProspection({});
  assert.deepEqual(f, { departement: '', q: '', periode: '12', statut: '', liberal: true, actifs: true, page: 1 });
  const g = lireFiltresProspection({ dep: '2a', q: 'Dupont<script>', periode: '3', statut: 'rappeler', liberal: 'non', page: '4' });
  assert.equal(g.departement, '2A');
  assert.equal(g.q, 'Dupont script');
  assert.equal(g.statut, 'rappeler');
  assert.equal(g.liberal, false);
  assert.equal(lireFiltresProspection({ dep: '123', periode: '7', statut: 'x', page: '-2' }).departement, '');
  assert.equal(lireFiltresProspection({ periode: '7' }).periode, '12');
  assert.equal(lireFiltresProspection({ page: '-2' }).page, 1);
  assert.equal(parametresProspection(g, 1), 'dep=2A&q=Dupont+script&periode=3&statut=rappeler&liberal=non');
});

test('CSV : séparateur point-virgule, guillemets, formules neutralisées', () => {
  const l: LigneExport = {
    nom: 'Dupont', prenom: 'Anne', profession: 'Pédicure-Podologue', cabinet: 'Cabinet "Les Pins"; Lyon', adresse: '1 rue A', codePostal: '69001', commune: 'Lyon',
    telephone: '04 00 00 00 00', email: '', installation: '2026-01-01', signal: 'SIRET créé', statut: 'À contacter', relance: '', note: '=HYPERLINK("x")', rpps: '10000000000',
  };
  const csv = csvProspection([l]);
  assert.ok(csv.startsWith('﻿Nom;Prénom;'));
  assert.ok(csv.includes('"Cabinet ""Les Pins""; Lyon"'));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
});
