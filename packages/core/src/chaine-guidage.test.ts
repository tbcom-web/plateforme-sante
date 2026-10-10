// Chaîne guidée (chaine-guidage.ts) : une seule prochaine action, dans l'ordre « plus près des clients d'abord », jamais un écran sans
// action ni explication, gestes du validateur jamais prescrits à un contributeur, fil des 6 étapes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAINE, CELLULES_REVISION, type EtatChaine, type FicheModele, type RevueModele, type VersionModele } from './chaine-modeles';
import { etapeDuStatut, prochaineActionChaine, type EntreeGuidage } from './chaine-guidage';
import type { ResultatTestModele, TicketModele } from './chaine-modeles-format';

const fiche = (id: string, extra: Partial<FicheModele> = {}): FicheModele => ({
  id, nom: `Design ${id}`, profession: 'podologue', profil: null, statut: 'candidat', versionCourante: 1, versionPubliee: null,
  tags: { profession: 'podologue', profils: [], couleurs: [] }, tagsValides: false, recette: null, origine: 'preselection', cle: `compo:${id}`,
  rang: null, scenario: { principaux: ['sport'], secondaires: [], couleurs: [] }, creeLe: `2026-10-10T00:00:${id.padStart(2, '0').slice(-2)}Z`, ...extra,
});
const version = (modele: string, v = 1, test: ResultatTestModele | null = null): VersionModele => ({ modele, version: v, composition: {}, cle: `c:${modele}`, journal: [{ type: 'creation', texte: 'x' }], auteur: 'u', test, creeLe: '2026-10-10' });
const vert = (modele: string, v = 1): ResultatTestModele => ({ modele, version: v, verdict: 'vert', controles: [], tickets: [], le: '2026-10-10T10:00:00Z' });
const etat = (fiches: FicheModele[], extra: Partial<EtatChaine> = {}): EtatChaine => ({ fiches, versions: fiches.map((f) => version(f.id)), tickets: [], votes: [], revues: [], grilles: [], ...extra });
const candidats = (n: number) => Array.from({ length: n }, (_, i) => fiche(`c${i}`));
const guide = (e: EtatChaine, extra: Partial<EntreeGuidage> = {}) => prochaineActionChaine({ role: 'validateur', etat: e, ...extra });
const tournoiOuvert = { ouvert: true, arrete: false, grilles: 2, restantes: 6, certitude: 0.72, texte: '' };

test('guidage : seuil du tournoi à 12 candidats', () => {
  assert.equal(CHAINE.ouvertureTournoi, 12);
});

test('guidage : chaîne vide → importer les propositions de Claude, sinon présélection', () => {
  const a = guide(etat([]), { propositionsClaude: 8 });
  assert.equal(a.id, 'importer-claude');
  assert.match(a.titre, /Importer les 8 modèles proposés par Claude/);
  assert.deepEqual(a.bouton, { libelle: 'Importer les 8 modèles de Claude', action: 'importer-claude' });
  assert.equal(a.etape, 1);
  const b = guide(etat(candidats(8)));
  assert.equal(b.id, 'preselection');
  assert.match(b.titre, /Garder encore 4 candidats pour ouvrir le tournoi \(8 \/ 12\)/);
  assert.deepEqual(b.bouton, { libelle: 'Continuer la présélection', href: '/chaine/preselection' });
  assert.equal(guide(etat([])).bouton?.libelle, 'Commencer la présélection');
});

test('guidage : tournoi ouvert → jouer la grille suivante', () => {
  const a = guide(etat(candidats(14)), { tournoi: tournoiOuvert, propositionsClaude: 3 });
  assert.equal(a.id, 'tournoi');
  assert.match(a.titre, /Jouer la grille 3 \/ ~8 du tournoi/);
  assert.deepEqual(a.bouton, { libelle: 'Jouer la grille 3', href: '/chaine/tournoi' });
  assert.deepEqual(a.fil.map((x) => x.etat), ['fait', 'courante', 'a-venir', 'a-venir', 'a-venir', 'a-venir']);
  assert.match(a.restant, /Encore 5 étapes/);
});

test('guidage : plus près des clients d’abord (valider > revalider > retouche > relire > tester > tournoi)', () => {
  const fs = [
    fiche('p', { statut: 'pret-validation', rang: 3 }), fiche('r', { statut: 'revalidation', versionCourante: 2 }), fiche('t', { statut: 'retouche' }),
    fiche('a', { statut: 'avis-humain' }), fiche('k', { statut: 'check-agent' }), ...candidats(14),
  ];
  let e = etat(fs, { versions: [...fs.map((f) => version(f.id, f.versionCourante, f.statut === 'check-agent' ? null : vert(f.id, f.versionCourante)))] });
  const ordre: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = guide(e, { tournoi: tournoiOuvert });
    ordre.push(a.id);
    const vise = { valider: 'p', revalider: 'r', retouche: 't', relire: 'a', tester: 'k' }[a.id as string];
    if (!vise) break;
    e = { ...e, fiches: e.fiches.filter((f) => f.id !== vise) };
  }
  assert.deepEqual(ordre, ['valider', 'revalider', 'retouche', 'relire', 'tester', 'tournoi']);
});

test('guidage : un contributeur ne reçoit jamais un geste du validateur', () => {
  const fs = [fiche('p', { statut: 'pret-validation' }), fiche('t', { statut: 'retouche' }), fiche('k', { statut: 'check-agent' }), ...candidats(14)];
  const e = etat(fs, { versions: fs.map((f) => version(f.id, 1, f.statut === 'pret-validation' ? vert(f.id) : null)) });
  const a = prochaineActionChaine({ role: 'contributeur', etat: e, tournoi: tournoiOuvert });
  assert.equal(a.id, 'tournoi');
  // Sans tournoi ni présélection à faire : attente expliquée, avec un geste utile
  const b = prochaineActionChaine({ role: 'contributeur', etat: etat([fiche('k', { statut: 'check-agent' })]), tournoi: { ...tournoiOuvert, ouvert: false } });
  assert.notEqual(b.id, 'tester');
});

test('guidage : relecture page par page avec le compte des pages vues', () => {
  const revues: RevueModele[] = CELLULES_REVISION.slice(0, 5).map((c) => ({ modele: 'a', version: 1, page: c.page, appareil: c.appareil, auteur: 'u', verdict: 'rien', le: '2026-10-10' }));
  const a = guide(etat([fiche('a', { statut: 'avis-humain' }), ...candidats(14)], { revues }), { tournoi: tournoiOuvert });
  assert.equal(a.id, 'relire');
  assert.match(a.titre, /Relire « Design a » page par page \(5 \/ 16\)/);
  assert.deepEqual(a.bouton, { libelle: 'Relire ce modèle', href: '/chaine/revision/a' });
});

test('guidage : retouche demandée à Claude avec le nombre de tickets', () => {
  const tickets: TicketModele[] = [1, 2].map((n) => ({ numero: n, modele: 't', page: 'accueil', appareil: 'mobile', zone: null, element: null, etiquette: 'couleur', commentaire: '', origine: 'humain', auteur: 'u', statut: 'ouvert', versionOuverture: 1, versionCorrection: null }));
  const a = guide(etat([fiche('t', { statut: 'retouche' })], { tickets }));
  assert.equal(a.id, 'retouche');
  assert.equal(a.qui, 'claude');
  assert.match(a.titre, /2 tickets/);
});

test('guidage : jamais d’écran sans action ni explication (tous les statuts, deux rôles)', () => {
  const statuts = ['candidat', 'finaliste', 'check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation', 'pret-validation', 'publie', 'ecarte'] as const;
  for (const role of ['validateur', 'contributeur'] as const) {
    for (const s of statuts) {
      for (const n of [0, 1, 13]) {
        const fs = [fiche('x', { statut: s }), ...candidats(n)];
        const a = prochaineActionChaine({ role, etat: etat(fs), tournoi: n >= 12 ? tournoiOuvert : null });
        assert.ok(a.titre.length > 5 && a.pourquoi.length > 20, `${role} ${s} ${n}`);
        assert.ok(a.bouton !== null, `${role} ${s} ${n} : un bouton`);
        assert.equal(a.fil.length, 6);
        assert.equal(a.fil.filter((x) => x.ici).length, 1);
      }
    }
  }
  const m = guide(etat([]), { migrationManquante: true });
  assert.equal(m.id, 'migration');
  assert.match(m.pourquoi, /0050/);
});

test('guidage : fil des étapes et reste jusqu’aux clients', () => {
  const a = guide(etat(candidats(3)));
  assert.equal(a.fil[0].etat, 'courante');
  assert.equal(a.fil[0].detail, '3 / 12 candidats');
  assert.match(a.restant, /Encore 6 étapes avant le premier modèle prêt pour les clients/);
  const b = guide(etat([fiche('a', { statut: 'avis-humain' })]));
  assert.deepEqual(b.fil.map((x) => x.etat), ['fait', 'fait', 'fait', 'courante', 'a-venir', 'a-venir']);
  assert.match(b.restant, /Encore 3 étapes/);
  assert.equal(b.fil[1].detail, 'fait');
  const c = guide(etat([fiche('a', { statut: 'publie' })]));
  assert.ok(c.fil.every((x) => x.etat === 'fait'));
  assert.equal(c.progression, 1);
  assert.match(c.restant, /1 modèle prêt pour les clients/);
  assert.equal(etapeDuStatut('ecarte'), null);
  assert.equal(etapeDuStatut('revalidation'), 5);
});
