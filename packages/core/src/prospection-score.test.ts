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
  assert.ok(a.raisons.some((r) => r.l.startsWith('Déménagement : a quitté un autre lieu (Vienne)') && r.k === 'demenagement'));
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

test('cabinet : le titulaire hérite des arrivées et départs ; reprise de cabinet ; collaborateur moins noté', () => {
  const lignes = [
    base({ cle: 't|A', rpps: '10000000010', structure_cle: 'A', role: 'Titulaire de cabinet' }),
    base({ cle: 'c|A', rpps: '10000000011', structure_cle: 'A', role: 'Collaborateur', apparu_le: '2026-09-20' }),
    base({ cle: 'd|A', rpps: '10000000012', structure_cle: 'A', role: 'Collaborateur', disparu_le: '2026-09-01' }),
    base({ cle: 'r|B', rpps: '10000000013', structure_cle: 'B', role: 'Titulaire de cabinet' }),
  ];
  const s = scorerProspection(lignes, J, [{ type: 'role', cle: 'r|B', le: '2026-10-01', details: { avant: 'Collaborateur', apres: 'Titulaire de cabinet' } }]);
  const t = s.get('t|A')!;
  assert.ok(t.raisons.some((r) => r.l.startsWith('Un collaborateur a rejoint son cabinet le 20/09/2026') && r.p === 10));
  assert.ok(t.raisons.some((r) => r.l.startsWith('Départ d’un confrère le 01/09/2026') && r.p === 6));
  assert.ok(t.raisons.some((r) => r.l === 'Cabinet de 2 podologues'));
  const c = s.get('c|A')!;
  assert.ok(!c.raisons.some((r) => r.l.startsWith('Un collaborateur a rejoint')));
  assert.ok(c.raisons.some((r) => r.l.startsWith('Le site du cabinet se décide avec le titulaire')));
  const r = s.get('r|B')!;
  assert.ok(r.raisons.some((x) => x.l.startsWith('Devenu titulaire le 01/10/2026') && x.p === 35));
});

test('enseignant : points pour la situation libérale, badge posé par la synchro non compté comme spécialité', () => {
  const s = scorerProspection([
    base({ cle: 'l|1', rpps: '10000000020', role: 'Titulaire de cabinet', specialites: ['enseignant'] }),
    base({ cle: 'e|1', rpps: '10000000020', mode_exercice: 'Salarié', role: 'Enseignant salarié', secteur: "Etab. d'enseignement", raison_sociale: 'ECOLE ROCKEFELLER', specialites: ['enseignant'] }),
  ], J);
  const l = s.get('l|1')!;
  assert.ok(l.raisons.some((r) => r.l.startsWith('Enseigne aussi (Ecole Rockefeller)') && r.p === 8));
  assert.ok(!l.raisons.some((r) => r.l.startsWith('Spécialité à mettre en avant')));
  assert.equal(s.get('e|1')!.prospect, 0); // la situation d'enseignement elle-même n'est pas libérale
});

test('clients : déjà client à zéro, confrère d’un client signalé, ressemblance expliquée', () => {
  const clients = ['10000000031', '10000000032', '10000000033', '10000000034', '10000000035'].map((rpps, i) =>
    base({ cle: `c${i}|S${i}`, rpps, structure_cle: `S${i}`, role: 'Titulaire de cabinet', secteur: 'Cabinet individuel', departement: '33', statut: 'gagne', nom: `CLIENT${i}`, prenom: 'ANNE' }));
  const lignes = [
    ...clients,
    base({ cle: 'p|S0', rpps: '10000000040', structure_cle: 'S0', role: 'Collaborateur', departement: '33' }),
    base({ cle: 'q|T', rpps: '10000000041', structure_cle: 'T', role: 'Titulaire de cabinet', secteur: 'Cabinet individuel', departement: '33' }),
    ...Array.from({ length: 20 }, (_, i) => base({ cle: `x${i}|U${i}`, rpps: `100000001${String(i).padStart(2, '0')}`, structure_cle: `U${i}`, role: 'Collaborateur', departement: '75' })),
  ];
  const s = scorerProspection(lignes, J);
  assert.equal(s.get('c0|S0')!.prospect, 0);
  assert.ok(s.get('c0|S0')!.raisons.some((r) => r.k === 'deja_client'));
  const p = s.get('p|S0')!;
  assert.ok(p.raisons.some((r) => r.k === 'client' && r.l.startsWith('Travaille avec votre client Anne Client0') && r.p === 12));
  const q = s.get('q|T')!.raisons.find((r) => r.k === 'ressemblance')!;
  assert.ok(q.p >= 10 && q.l.includes('titulaire (100 % de vos clients)'), q.l);
  assert.ok(q.l.startsWith('Plus proche de vos clients que'), q.l);
  const x = s.get('x0|U0')!.raisons.find((r) => r.k === 'ressemblance');
  assert.ok(!x || x.p < q.p);
});

test('ressemblance : nom du cabinet, type d’e-mail, ancienneté INSEE et concurrence expliqués', () => {
  const client = (i: number) => base({
    cle: `k${i}|C${i}`, rpps: `1000000005${i}`, structure_cle: `C${i}`, code_commune: '33063', role: 'Titulaire de cabinet', nom: `NOM${i}`,
    enseigne: `CABINET NOM${i}`, email: `nom${i}@gmail.com`, siret_cree_le: '2020-01-01', statut: 'gagne', departement: '33',
  });
  const lignes = [
    ...[0, 1, 2, 3, 4, 5].map(client),
    base({ cle: 'm|M', rpps: '10000000070', structure_cle: 'M', code_commune: '33063', role: 'Titulaire de cabinet', nom: 'MARTIN', enseigne: 'CABINET MARTIN', email: 'm@gmail.com', siret_cree_le: '2019-06-01', departement: '33' }),
    ...Array.from({ length: 30 }, (_, i) => base({ cle: `z${i}|Z${i}`, rpps: `100000002${String(i).padStart(2, '0')}`, structure_cle: `Z${i}`, code_commune: `9${i}`, role: 'Titulaire de cabinet', nom: `AUTRE${i}`, enseigne: 'CENTRE PODOLOGIQUE DU LAC', email: `x${i}@orange.fr`, departement: '75' })),
  ];
  const r = scorerProspection(lignes, J).get('m|M')!.raisons.find((x) => x.k === 'ressemblance')!;
  assert.ok(r.l.includes('cabinet à son nom') || r.l.includes('cabinet créé il y a 3 à 9 ans') || r.l.includes('e-mail Gmail'), r.l);
  assert.ok(r.p >= 12, String(r.p));
});

test('SIREN et SIRET : première installation ou déménagement d’un libéral installé', () => {
  const s = scorerProspection([
    base({ cle: 'n|1', rpps: '10000000080', siret_cree_le: '2026-08-01', siren_cree_le: '2026-07-20', siret_source: 'siret' }),
    base({ cle: 'd|1', rpps: '10000000081', siret_cree_le: '2026-08-01', siren_cree_le: '2005-07-18', siret_source: 'siret' }),
  ], J);
  assert.ok(s.get('n|1')!.raisons.some((r) => r.l.startsWith('Première installation en libéral (entreprise créée le 20/07/2026)') && r.p === 5));
  assert.ok(s.get('d|1')!.raisons.some((r) => r.l.startsWith('Nouveau cabinet d’un libéral installé depuis 2005') && r.k === 'demenagement'));
});

test('déménagements : ancien cabinet fermé, établissements ouverts, collaborateur de longue date', () => {
  const s = scorerProspection([
    base({ cle: 'f|1', rpps: '10000000090', role: 'Titulaire de cabinet', siret_cree_le: '2026-06-01', siren_cree_le: '2012-03-01', siret_source: 'siret',
      ancien_cabinet: { commune: 'VIENNE', adresse: '3 RUE DU PONT', ouvert: '2012-03-01', ferme: '2026-05-31' } }),
    base({ cle: 'o|1', rpps: '10000000091', role: 'Titulaire de cabinet', siret_cree_le: '2026-09-01', siren_cree_le: '2026-09-01', siret_source: 'siret', etablissements_ouverts: 2 }),
    base({ cle: 'c|1', rpps: '10000000092', role: 'Collaborateur', siret_cree_le: '2022-05-01', siret_source: 'nom' }),
  ], J);
  const f = s.get('f|1')!;
  assert.ok(f.raisons.some((r) => r.l === 'Déménagement : ancien cabinet (Vienne) fermé le 31/05/2026 (INSEE)' && r.p === 13 && r.k === 'demenagement'));
  assert.ok(f.raisons.some((r) => r.t === 'p' && r.k === 'demenagement' && r.p === 13));
  assert.ok(!f.raisons.some((r) => r.l.startsWith('Nouveau cabinet d’un libéral'))); // fermeture constatée : pas de doublon « probable »
  assert.ok(s.get('o|1')!.raisons.some((r) => r.l.startsWith('2 établissements ouverts dont un récent') && r.k === 'demenagement'));
  assert.ok(s.get('c|1')!.raisons.some((r) => r.l === 'Collaborateur depuis 4 ans : installation à son compte probable' && r.p === 8));
});
