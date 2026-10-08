// Onboarding client (onboarding.ts, onboarding-professions.ts) : étapes pilotées par la profession (métier fictif compris),
// avancement, brouillon depuis l'identité confirmée (aucun DU sans source), jeu « Choisissez votre style », préférences client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avancementOnboarding, brouillonOnboarding, diplomesConfirmes, etapesOnboarding, grilleDuTour, identiteVide, normaliserChoixClient,
  phraseAvancement, propositionRetenue, propositionSuivante, syntheseChoixClients, themesDuMetier, type CandidatStyle,
} from './onboarding';
import { anglesDesDiplomes, professionDuCodeRpps, professionParcours, professionsProposees, PROFESSIONS_PARCOURS, type ProfessionParcours } from './onboarding-professions';
import { pratiqueDe, PRATIQUES, type PratiqueProfession } from './pratiques';
import { activitesProposees, basculerActivite } from './profils';

// Métier FICTIF : le parcours ne dépend que des registres (onboarding-professions.ts, pratiques.ts)
const LUTHIER: ProfessionParcours = { id: 'luthier-du-pied', libelle: 'Luthier du pied', codesRpps: ['99'], disponible: true, codesDiplomeEtat: ['DE99'], diplomeEtat: 'Diplôme fictif', angles: [{ motif: /musique/i, theme: 'violon' }] };
const PRATIQUE_LUTHIER: PratiqueProfession = {
  profession: 'luthier-du-pied',
  vocabulaire: { metier: 'luthier du pied', discipline: 'lutherie', generaliste: 'un atelier généraliste' },
  themes: [
    { id: 'violon', libelle: 'Violon', court: 'Violon', sujetVisuel: 'violon', pour: 'le violon', actif: true, soins: [] },
    { id: 'scene', libelle: 'Scène', court: 'Scène', sujetVisuel: 'scene', pour: 'la scène', actif: true, soins: [] },
    { id: 'differe', libelle: 'Différé', court: 'Différé', sujetVisuel: 'differe', pour: 'le différé', actif: false, soins: [] },
  ],
  activites: [{ id: 'tournee', libelle: 'Tournée', court: 'tournée', hashtags: ['tournee'], themes: ['scene'], soins: [], requetes: [], precision: 'tournée' }],
  publics: [],
  profils: [],
};

test('registre : podologie disponible, autres métiers « bientôt », codes TRE_G15, pratique existante', () => {
  assert.equal(professionsProposees()[0].id, 'podologue');
  assert.equal(professionDuCodeRpps('80')?.id, 'podologue');
  assert.equal(professionDuCodeRpps('86'), undefined, '86 = technicien de laboratoire, pas un podologue');
  assert.equal(professionDuCodeRpps('70')?.disponible, false);
  assert.equal(professionDuCodeRpps('99', [LUTHIER])?.id, 'luthier-du-pied');
  assert.equal(new Set(PROFESSIONS_PARCOURS.map((p) => p.id)).size, PROFESSIONS_PARCOURS.length);
  // Un métier ouvert a sa pratique (thèmes, activités) : jamais de parcours sans données
  for (const p of PROFESSIONS_PARCOURS.filter((x) => x.disponible)) assert.ok(PRATIQUES.some((x) => x.profession === p.id), p.id);
  assert.ok(themesDuMetier(pratiqueDe('podologue')).includes('sport'));
  assert.ok(!themesDuMetier(pratiqueDe('podologue')).includes('posture'), 'thème différé jamais proposé');
});

test('étapes pilotées par la pratique : activités seulement si un thème s’y prête (métier fictif compris)', () => {
  const podo = pratiqueDe('podologue');
  assert.deepEqual(etapesOnboarding(podo, { principaux: ['diabete'], secondaires: [] }), ['profession', 'identite', 'sujets', 'couleurs', 'style', 'rendu']);
  assert.ok(etapesOnboarding(podo, { principaux: ['ongles'], secondaires: ['sport'] }).includes('activites'));
  assert.ok(!etapesOnboarding(PRATIQUE_LUTHIER, { principaux: ['violon'], secondaires: [] }).includes('activites'));
  assert.ok(etapesOnboarding(PRATIQUE_LUTHIER, { principaux: ['scene'], secondaires: [] }).includes('activites'));
  assert.deepEqual(themesDuMetier(PRATIQUE_LUTHIER), ['violon', 'scene']);
  assert.deepEqual(activitesProposees(PRATIQUE_LUTHIER, ['scene']).map((a) => a.id), ['tournee']);
  assert.deepEqual(anglesDesDiplomes(['DU Musique de chambre'], LUTHIER, themesDuMetier(PRATIQUE_LUTHIER)), ['violon']);
  assert.deepEqual(anglesDesDiplomes(['DU Podologie du sport'], professionParcours('podologue'), themesDuMetier(podo)), ['sport']);
  assert.deepEqual(anglesDesDiplomes([], professionParcours('podologue'), themesDuMetier(podo)), []);
});

test('avancement : pondéré, jamais 100 % avant le rendu', () => {
  const e = etapesOnboarding(pratiqueDe('podologue'), { principaux: [], secondaires: [] });
  assert.equal(avancementOnboarding([], e), 0);
  assert.ok(avancementOnboarding(['profession'], e) > 0);
  assert.equal(avancementOnboarding(['profession', 'identite', 'sujets', 'couleurs', 'style'], e), 85);
  assert.equal(avancementOnboarding(e, e), 100);
  assert.equal(phraseAvancement(80), 'Votre site est prêt à 80 %');
});

test('brouillon : identité confirmée, diplôme d’État du registre, DU seulement avec source, profil sport', () => {
  const p = professionParcours('podologue')!;
  const identite = { ...identiteVide(), prenom: ' Camille ', nom: 'Exemple', ville: 'Lyon', adresse: '12 rue de l’Exemple', codePostal: '69003', telephone: '01 99 00 01 01', rpps: '10000000001', diplomeEtat: true, diplomesUniversitaires: diplomesConfirmes(['DU Podologie du sport', 'DU inventé'], ['DU Podologie du sport']), source: 'annuaire' as const };
  const podo = pratiqueDe('podologue');
  let acts: string[] = [];
  for (const a of ['basket', 'tennis', 'course', 'golf']) acts = basculerActivite(podo, acts, a, ['sport']);
  assert.deepEqual(acts, ['basket', 'tennis', 'course'], '3 activités au plus, dans l’ordre');
  const d = brouillonOnboarding({ profession: 'podologue', identite, priorites: { principaux: ['sport', 'semelles'], secondaires: [] }, activites: ['basket', 'zzz', 'tennis'], couleurs: ['bleu'] }, p, podo);
  assert.equal(d.praticiens[0].prenom, 'Camille');
  assert.equal(d.praticiens[0].diplome, 'Diplôme d’État de pédicure-podologue');
  assert.deepEqual(d.praticiens[0].formations, ['DU Podologie du sport']);
  assert.deepEqual(d.praticiens[0].sports, ['basket', 'tennis']);
  assert.deepEqual(d.activites, ['basket', 'tennis'], 'activités du site (profils de pratique)');
  assert.equal(d.lieux[0].ville, 'Lyon');
  assert.equal(d.cabinet.telephone, '01 99 00 01 01');
  assert.equal(d.profil, 'sport');
  assert.deepEqual(d.couleursPreferees, ['bleu']);
  // Rien de confirmé : rien d'affiché
  const vide = brouillonOnboarding({ profession: 'podologue', identite: identiteVide(), priorites: { principaux: ['diabete'], secondaires: [] }, activites: ['basket'], couleurs: undefined }, p, podo);
  assert.deepEqual(vide.praticiens[0].sports, [], 'activité sans thème qui s’y prête : écartée');
  assert.deepEqual([vide.praticiens[0].diplome, vide.praticiens[0].formations.length, vide.praticiens[0].rpps, vide.couleursPreferees], ['', 0, '', undefined]);
  // Métier fictif : son diplôme
  const l = brouillonOnboarding({ profession: LUTHIER.id, identite: { ...identiteVide(), diplomeEtat: true }, priorites: { principaux: ['scene'], secondaires: [] }, activites: ['tournee'], couleurs: [] }, LUTHIER, PRATIQUE_LUTHIER);
  assert.equal(l.praticiens[0].diplome, 'Diplôme fictif');
  assert.deepEqual(l.praticiens[0].sports, ['tournee']);
});

const POOL: CandidatStyle[] = [
  { id: 'a', univers: 'clair-pratique', style: 'releve', gamme: 'canard', famille: 'sobre' },
  { id: 'b', univers: 'elegant-sobre', style: 'ligne', gamme: 'prune', famille: 'sobre' },
  { id: 'c', univers: 'technique-precis', style: 'releve', gamme: 'cobalt', famille: 'vitaminee' },
  { id: 'd', univers: 'simple-proche', style: 'pedagogique', gamme: 'mangue', famille: 'vitaminee' },
  { id: 'e', univers: 'clair-pratique', style: 'releve', gamme: 'sauge', famille: 'sobre' },
  { id: 'f', univers: 'clair-pratique', style: 'photos', gamme: 'canard', famille: 'sobre' },
  { id: 'g', univers: 'elegant-sobre', style: 'ligne', gamme: 'mangue', famille: 'vitaminee' },
  { id: 'h', univers: 'clair-pratique', style: 'releve', gamme: 'menthe', famille: 'sobre' },
  { id: 'i', univers: 'technique-precis', style: 'releve', gamme: 'encre', famille: 'sobre' },
  { id: 'j', univers: 'simple-proche', style: 'pedagogique', gamme: 'pasteque', famille: 'vitaminee' },
  { id: 'k', univers: 'clair-pratique', style: 'pedagogique', gamme: 'canard', famille: 'sobre' },
];

test('« Choisissez votre style » : 1er tour varié, puis convergence vers ce qu’il aime', () => {
  const t0 = grilleDuTour(POOL, {}, 0);
  assert.equal(t0.length, 4);
  assert.equal(new Set(t0.map((c) => c.univers)).size, 4, 'quatre structures différentes au premier tour');
  const avis = { a: 'aime', b: 'non', c: 'non', d: 'non' } as const;
  const vus = new Set(t0.map((c) => c.id));
  const t1 = grilleDuTour(POOL, avis, 1, vus);
  assert.ok(t1.every((c) => !vus.has(c.id)), 'jamais deux fois la même');
  assert.equal(t1[0].univers, 'clair-pratique', 'garde la structure aimée en tête');
  assert.ok(new Set(t1.map((c) => c.gamme)).size > 1, 'fait varier le reste');
  assert.ok(!t1.slice(0, 2).some((c) => c.id === 'b' || c.id === 'g'), 'un style rejeté recule');
  const t2 = grilleDuTour(POOL, { ...avis, [t1[0].id]: 'aime' }, 2, new Set([...vus, ...t1.map((c) => c.id)]));
  assert.ok(t2.length <= 3);
  assert.equal(propositionRetenue(POOL, { ...avis, [t1[0].id]: 'aime' })?.univers, 'clair-pratique');
  // Sans « J'aime » : la mieux notée qui n'est pas rejetée
  assert.notEqual(propositionRetenue(POOL, { a: 'non' })?.id, 'a');
  // Déterministe
  assert.deepEqual(grilleDuTour(POOL, avis, 1, vus), t1);
  // Autre proposition : en boucle, jamais une rejetée
  let x: string | null = 'a';
  for (let k = 0; k < POOL.length + 2; k++) { x = propositionSuivante(POOL, avis, x)!.id; assert.ok(!['b', 'c', 'd'].includes(x)); }
});

test('préférences client : bornées, aucune valeur inconnue, synthèse pour l’admin', () => {
  assert.equal(normaliserChoixClient(null), undefined);
  assert.equal(normaliserChoixClient({ le: 'pas une date' }), undefined);
  const c = normaliserChoixClient({ le: '2026-10-08T10:00:00Z', profession: 'podologue', source: 'demonstration', avis: [{ id: 'recette~r1', verdict: 'aime', tour: 0 }, { id: '<script>', verdict: 'aime' }, { id: 'x', verdict: 'peut-etre' }], retenue: 'recette~r1', activites: ['basket', 'BAD!'], couleurs: ['bleu'] })!;
  assert.equal(c.source, 'saisie', 'jamais « démonstration »');
  assert.deepEqual(c.avis, [{ id: 'recette~r1', verdict: 'aime', tour: 0 }]);
  assert.deepEqual(c.activites, ['basket']);
  const s = syntheseChoixClients([c, undefined, { ...c, avis: [{ id: 'p2', verdict: 'non', tour: 1 }], retenue: 'p2' }]);
  assert.deepEqual(s, [{ id: 'recette~r1', aime: 1, non: 0, retenue: 1 }, { id: 'p2', aime: 0, non: 1, retenue: 1 }]);
});
