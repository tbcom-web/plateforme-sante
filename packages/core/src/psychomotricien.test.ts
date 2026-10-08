// Psychomotricien branché de bout en bout (2026-10-09) : thèmes de la profession (themes.ts), pratique (pratiques.ts), entrée du
// parcours client (onboarding-professions.ts : code RPPS 96, questions dont « contrat PCO »), toujours EN PRÉPARATION (jamais
// publique), brouillon et propositions du parcours avec ses thèmes, aucun thème de podologie proposé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estProfessionPublique } from './professions';
import { controlerPratique, pratiqueDe, PRATIQUES } from './pratiques';
import { normaliserReponsesMetier, professionDuCodeRpps, professionParcours, questionsVisibles } from './onboarding-professions';
import { brouillonOnboarding, etapesOnboarding, identiteVide, normaliserChoixClient, themesDuMetier } from './onboarding';
import { construireNavigation, themeParId, themesProposes, THEMES, basculerPrincipal, type Priorites } from './themes';
import { profilsDePratique } from './profils';
import { lotsPropositions } from './propositions';
import { verifierPackPubliable } from './packs-professions';

test('psychomotricien : thèmes propres, jamais ceux de la podologie ; podologie inchangée', () => {
  const ids = themesProposes([], 'psychomotricien').map((x) => x.theme.id);
  assert.deepEqual(ids, ['petite-enfance', 'apprentissages', 'graphomotricite', 'tnd', 'adolescents', 'adultes', 'seniors', 'relaxation', 'sante-mentale']);
  assert.ok(!ids.some((id) => THEMES.some((t) => t.id === id)), 'identifiants distincts de la podologie');
  assert.deepEqual(themesProposes().map((x) => x.theme.id), THEMES.map((t) => t.id), 'sans profession : podologie');
  assert.equal(themesProposes([], 'psychomotricien').find((x) => x.theme.id === 'sante-mentale')?.disponible, false, 'santé mentale différée');
  assert.equal(themeParId('graphomotricite')?.profession, 'psychomotricien');
  // Sélection au doigt : un thème différé n'est jamais retenu
  assert.deepEqual(basculerPrincipal({ principaux: [], secondaires: [] }, 'sante-mentale').principaux, []);
});

test('psychomotricien : pratique contrôlée, profils de référence, thèmes du parcours = thèmes actifs du pack', () => {
  const p = pratiqueDe('psychomotricien');
  assert.equal(p.profession, 'psychomotricien');
  assert.ok(PRATIQUES.some((x) => x.profession === 'psychomotricien'));
  assert.deepEqual(controlerPratique(p), []);
  assert.deepEqual(themesDuMetier(p), ['petite-enfance', 'apprentissages', 'graphomotricite', 'tnd', 'adolescents', 'adultes', 'seniors', 'relaxation']);
  assert.equal(profilsDePratique('psychomotricien').length, 7);
  assert.equal(p.activites.length, 7);
  assert.equal(p.publics.length, 5);
});

test('psychomotricien : parcours en préparation (RPPS 96, questions du métier), jamais public ni publiable', () => {
  const pp = professionParcours('psychomotricien')!;
  assert.equal(professionDuCodeRpps('96')?.id, 'psychomotricien');
  assert.equal(pp.disponible, false);
  assert.ok(!estProfessionPublique('psychomotricien'));
  assert.ok(!verifierPackPubliable('psychomotricien').ok);
  assert.ok(pp.questions?.some((q) => q.id === 'contrat-pco' && q.type === 'oui-non'));
  // Question conditionnelle : le territoire n'est demandé qu'après « oui » au contrat PCO
  assert.ok(!questionsVisibles(pp, {}).some((q) => q.id === 'territoire-pco'));
  assert.ok(questionsVisibles(pp, { 'contrat-pco': true }).some((q) => q.id === 'territoire-pco'));
  assert.deepEqual(normaliserReponsesMetier(pp, { 'contrat-pco': false, 'territoire-pco': 'Lyon', groupes: 'oui', 'interventions-exterieures': ['ecole', 'lune'], inconnue: true }),
    { 'contrat-pco': false, 'interventions-exterieures': ['ecole'] });
  // Choix du client : réponses relues d'après les questions de la profession
  const c = normaliserChoixClient({ le: '2026-10-09T10:00:00Z', profession: 'psychomotricien', reponses: { 'contrat-pco': true, 'territoire-pco': '  PCO   Rhône ' } });
  assert.deepEqual(c?.reponses, { 'contrat-pco': true, 'territoire-pco': 'PCO Rhône' });
  assert.equal(normaliserChoixClient({ le: '2026-10-09T10:00:00Z', profession: 'podologue', reponses: { 'contrat-pco': true } })?.reponses, undefined);
});

test('psychomotricien : étapes, brouillon et propositions du parcours avec ses thèmes', () => {
  const pp = professionParcours('psychomotricien')!;
  const pratique = pratiqueDe('psychomotricien');
  const priorites: Priorites = { principaux: ['graphomotricite', 'apprentissages'], secondaires: ['tnd'] };
  assert.ok(etapesOnboarding(pratique, priorites, pp.themesActivites).includes('activites'), 'médiations des séances');
  const d = brouillonOnboarding({ profession: 'psychomotricien', identite: { ...identiteVide(), nom: 'Exemple', ville: 'Lyon', diplomeEtat: true }, priorites, activites: ['graphisme', 'basket'], couleurs: [] }, pp, pratique);
  assert.deepEqual(d.priorites, priorites, 'thèmes gardés par le brouillon');
  assert.deepEqual(d.activites, ['graphisme'], 'activité de la podologie refusée');
  assert.equal(d.praticiens[0].diplome, 'Diplôme d’État de psychomotricien');
  // Navigation du site de démonstration : catalogue des fiches du pack
  const nav = construireNavigation(d, ['graphomotricite', 'maladresse-coordination', 'bilan-psychomoteur', 'parcours-pco'].map((slug) => ({ slug })));
  assert.deepEqual(nav.principaux.map((t) => t.theme.id), ['graphomotricite', 'apprentissages']);
  assert.deepEqual(nav.menu.map((l) => l.libelle).slice(0, 2), ['Écriture', 'Enfants']);
  assert.ok(lotsPropositions({ priorites, couleursPreferees: [] }, 4).flat().length > 0, 'propositions de style');
});
