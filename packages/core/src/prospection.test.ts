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
  assert.deepEqual(installation({ siret_cree_le: '2024-07-29', siret_source: 'siret', apparu_le: null }), { date: '2024-07-29', source: 'siret', libelle: 'Cabinet ouvert (INSEE)' });
  assert.equal(installation({ siret_cree_le: '2018-02-12', siret_source: 'siret', apparu_le: '2026-10-01' })?.source, 'rpps'); // rejoint un cabinet existant
  assert.deepEqual(installation({ siret_cree_le: '2026-07-01', siret_source: 'siret', apparu_le: '2026-10-05' }), { date: '2026-07-01', source: 'siret', libelle: 'Cabinet ouvert (INSEE)' }); // RPPS en retard : l'INSEE fait foi
  assert.equal(installation({ siret_cree_le: '2026-09-01', siret_source: 'nom' })?.libelle, 'Ouvert à son nom (INSEE, à confirmer)');
  assert.deepEqual(installation({ siret_cree_le: null, situation_maj_le: '2025-11-03' }), { date: '2025-11-03', source: 'ans', libelle: 'Situation modifiée au RPPS' });
});

test('filtres : valeurs par défaut et saisies refusées', () => {
  const f = lireFiltresProspection({});
  assert.deepEqual(f, { departement: '', q: '', periode: '12', statut: '', liberal: true, actifs: true, specialite: '', role: '', lienClient: false, tri: 'score', page: 1 });
  assert.equal(lireFiltresProspection({ lien: 'client' }).periode, 'tous');
  assert.equal(lireFiltresProspection({ specialite: 'sport', role: 'titulaire', tri: 'recent' }).role, 'titulaire');
  assert.equal(lireFiltresProspection({ specialite: 'x;drop' }).specialite, '');
  assert.equal(lireFiltresProspection({ specialite: 'sport' }).periode, 'tous');
  assert.equal(lireFiltresProspection({ specialite: 'sport', periode: '6' }).periode, '6');
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
    telephone: '04 00 00 00 00', email: '', installation: '2026-01-01', signal: 'SIRET créé', statut: 'À contacter', relance: '', note: '=HYPERLINK("x")', rpps: '10000000000', score: '72', role: 'Titulaire de cabinet', specialites: 'Sport',
  };
  const csv = csvProspection([l]);
  assert.ok(csv.startsWith('﻿Score;Nom;Prénom;Rôle;'));
  assert.ok(csv.includes('"Cabinet ""Les Pins""; Lyon"'));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
});
