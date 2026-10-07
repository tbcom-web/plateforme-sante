import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  draftPourOnglet, libelleScenario, niveauProximite, normaliserScenario, ongletsDuScenario, proximiteScenarios, scenarioAuHasard, scenarioDeRecette,
  soinsParDefautScenario, sujetsVisuelsDuScenario, couleursVoisines, type ScenarioRecette,
} from './simulateur';
import {
  alea, compositionInitiale, herosPossibles, photosCompatibles, recetteDepuisLigne, recettesPourScenario, serialiserComposition, serialiserRecetteAvecScenario,
  tirerDimension, toutChanger, animationsPermises, tirerAnimation, reparerComposition, type ContexteRecette, type PhotoBanque, type Recette,
} from './recettes';
import { themeParId } from './themes';

const sc = (principaux: string[], secondaires: string[] = [], couleurs: string[] = [], soins: string[] = []): ScenarioRecette => ({ principaux, secondaires, couleurs, soins });
const ctxDe = (s: ScenarioRecette): ContexteRecette => ({ sujets: [...s.principaux, ...s.secondaires], principaux: s.principaux.length, couleursPreferees: s.couleurs, sujetsSeulement: true });
const CATALOGUE = [...new Set(['sport', 'enfant', 'ongles', 'diabete', 'semelles', 'pedicurie'].flatMap((id) => themeParId(id)?.soins ?? []))].map((slug) => ({ slug, titre_court: slug.replace(/-/g, ' ') }));

test('scénario → pages du client : accueil, une page par sujet principal, ses fiches de soins, puis les pages communes', () => {
  const s = sc(['sport', 'enfant'], ['ongles']);
  const o = ongletsDuScenario(s, CATALOGUE);
  assert.equal(o[0].id, 'accueil');
  const sujets = o.filter((x) => x.page === 'theme').map((x) => x.sujet);
  assert.deepEqual(sujets, ['sport', 'enfant'], 'une page par sujet principal, dans l’ordre de préférence (pas de page pour un secondaire)');
  const fiches = o.filter((x) => x.page === 'fiche').map((x) => x.soin!);
  const soins = soinsParDefautScenario(s, CATALOGUE.map((c) => c.slug));
  assert.deepEqual([...fiches].sort(), [...soins].sort(), 'une fiche pour chacun de SES soins (cochés par défaut)');
  for (const p of ['soins', 'actualites', 'cabinet', 'acces', 'questions']) assert.ok(o.some((x) => x.page === p), p);
  // Soins cochés explicitement : exactement ceux-là
  const s2 = { ...s, soins: [CATALOGUE[0].slug] };
  assert.deepEqual(ongletsDuScenario(s2, CATALOGUE).filter((x) => x.page === 'fiche').map((x) => x.soin), [CATALOGUE[0].slug]);
});

test('onglet → brouillon montré : page sujet sur ce sujet, fiche sur ce soin', () => {
  const d = { soins: ['a', 'b'], theme: { soinsEnAvant: ['a'] } as { herosSujet?: string; soinsEnAvant?: string[] } };
  assert.equal(draftPourOnglet(d, { id: 'theme:enfant', page: 'theme', nom: 'Enfants', sujet: 'enfant' }).theme.herosSujet, 'enfant');
  const f = draftPourOnglet(d, { id: 'fiche:b', page: 'fiche', nom: 'b', soin: 'b' });
  assert.deepEqual(f.theme.soinsEnAvant, ['b', 'a']);
  assert.equal(draftPourOnglet(d, { id: 'accueil', page: 'accueil', nom: 'Accueil' }), d);
});

test('visuels autorisés : héros et photos viennent seulement des sujets du scénario', () => {
  const s = sc(['enfant'], ['ongles']);
  const c = ctxDe(s);
  assert.deepEqual(sujetsVisuelsDuScenario(s), ['enfant', 'ongles']);
  for (let g = 0; g < 30; g++) {
    const x = toutChanger(compositionInitiale(c), [], c, g);
    if (x.visuels.herosSujet) assert.ok(herosPossibles(c).includes(x.visuels.herosSujet) && s.principaux.includes(x.visuels.herosSujet), 'héros parmi les principaux');
  }
  const pool: PhotoBanque[] = [
    { url: '/photos/a.webp', sujets: ['enfant'], origine: 'integree' },
    { url: '/photos/b.webp', sujets: ['general'], origine: 'integree' },
    { url: '/photos/c.webp', sujets: ['sport'], origine: 'integree' },
    { url: '/photos/d.webp', sujets: ['ongles'], origine: 'integree' },
  ];
  assert.deepEqual(photosCompatibles(pool, c).map((x) => x.p.url).sort(), ['/photos/a.webp', '/photos/d.webp'], 'ni « général » ni autre sujet dans le simulateur');
  assert.ok(photosCompatibles(pool, { ...c, sujetsSeulement: false }).some((x) => x.p.url === '/photos/b.webp'), 'hors simulateur : photos générales permises');
  const tir = tirerDimension({ ...compositionInitiale(c), visuels: { style: 'photos', herosSujet: 'enfant', animation: null } }, 'photos', { ...c, photos: pool }, 5);
  assert.ok(tir.photos.every((u) => ['/photos/a.webp', '/photos/d.webp'].includes(u)));
});

test('proximité : identique = 1, même sujet n° 1 et couleurs voisines = proche, autre n° 1 = loin', () => {
  const a = sc(['sport', 'enfant'], ['ongles'], ['bleu']);
  assert.equal(proximiteScenarios(a, a), 1);
  assert.equal(niveauProximite(a, a), 'identique');
  assert.ok(couleursVoisines('bleu', 'bleu-nuit'));
  const voisin = sc(['sport', 'enfant'], ['ongles'], ['bleu-nuit']);
  const p = proximiteScenarios(a, voisin);
  assert.ok(p < 1 && p >= 0.6, `couleur voisine : ${p}`);
  assert.equal(niveauProximite(a, voisin), 'proche');
  const ordre = sc(['enfant', 'sport'], ['ongles'], ['bleu']);
  assert.ok(proximiteScenarios(a, ordre) < proximiteScenarios(a, voisin), 'autre n° 1 : moins proche');
  assert.equal(niveauProximite(a, ordre), 'meme-sujet');
  assert.equal(niveauProximite(a, sc([])), 'generique');
  assert.equal(niveauProximite(a, sc(['diabete'])), 'autre');
  // Symétrique, borné
  assert.equal(proximiteScenarios(a, voisin), proximiteScenarios(voisin, a));
  for (const x of [voisin, ordre, sc(['diabete'], [], ['vert'])]) { const v = proximiteScenarios(a, x); assert.ok(v >= 0 && v <= 1); }
  // « Laissez-nous proposer » des deux côtés : couleurs identiques
  assert.equal(proximiteScenarios(sc(['sport']), sc(['sport'])), 1);
});

test('recettes du parcours : scénario identique, puis proche, puis même sujet, puis génériques', () => {
  const client = sc(['sport', 'enfant'], [], ['bleu']);
  const x = compositionInitiale(ctxDe(client));
  const r = (id: string, s: ScenarioRecette, note = 4): Recette => ({ id, nom: id, sujets: [...s.principaux, ...s.secondaires], couleursPreferees: s.couleurs, scenario: s, composition: x, note, etiquettes: [], statut: 'active' });
  const l = [
    r('meme-sujet-5', sc(['enfant', 'sport'], [], ['vert']), 5),
    r('generique', sc([]), 5),
    r('proche', sc(['sport', 'enfant'], [], ['bleu-nuit'])),
    r('identique', sc(['sport', 'enfant'], [], ['bleu'])),
    r('hors-sujet', sc(['diabete']), 5),
  ];
  assert.deepEqual(recettesPourScenario(l, client).map((y) => y.id), ['identique', 'proche', 'meme-sujet-5', 'generique']);
  // Forme historique (liste de sujets) toujours acceptée
  assert.deepEqual(recettesPourScenario(l, ['sport']).map((y) => y.id).slice(0, 2).sort(), ['identique', 'proche']);
});

test('rétrocompatibilité : une recette enregistrée sans scénario ni traitement se relit', () => {
  const c = ctxDe(sc(['sport', 'enfant', 'ongles', 'diabete']));
  const x = compositionInitiale(c);
  const ancienne = JSON.parse(serialiserComposition(x));
  delete ancienne.traitement;
  const r = recetteDepuisLigne({ id: 'r1', nom: 'Ancienne', sujets: ['sport', 'enfant', 'ongles', 'diabete'], couleurs_preferees: ['vert'], composition: ancienne, note: 5, etiquettes: [], statut: 'active' })!;
  assert.ok(r);
  assert.deepEqual(r.scenario, { principaux: ['sport', 'enfant', 'ongles'], secondaires: ['diabete'], couleurs: ['vert'], soins: [] });
  assert.deepEqual(r.composition.traitement, { id: 'modele', grain: false });
  assert.deepEqual(scenarioDeRecette({ sujets: ['sport'], couleursPreferees: [] }), sc(['sport']));
  // Nouvelle recette : scénario complet gardé dans la composition jsonb
  const s = sc(['enfant'], ['ongles'], ['jaune'], ['bilan-podologique']);
  const neuve = recetteDepuisLigne({ id: 'r2', nom: 'Neuve', sujets: ['enfant', 'ongles'], couleurs_preferees: ['jaune'], composition: serialiserRecetteAvecScenario(x, s), note: null, etiquettes: [], statut: 'active' })!;
  assert.deepEqual(neuve.scenario, s);
  // Format du directeur artistique : ancien { sujets, couleurs } et nouveau { principaux, secondaires… }
  assert.deepEqual(normaliserScenario({ sujets: ['sport', 'posture-inconnue', 'enfant'], couleurs: ['bleu', 'rose-fluo'] }), sc(['sport', 'enfant'], [], ['bleu']));
  assert.deepEqual(normaliserScenario({ principaux: ['enfant'], secondaires: ['enfant', 'ongles'], couleurs: [] }), sc(['enfant'], ['ongles']));
});

test('dé « Animation d’accueil » : Technique + Relevé seulement, jamais la trajectoire, choix gardé par la réparation', () => {
  const c = ctxDe(sc(['sport', 'enfant']));
  const x = { ...compositionInitiale(c), structure: 'technique-precis' as const, visuels: { style: 'releve' as const, herosSujet: 'sport', animation: null } };
  const permises = animationsPermises(c, 'technique-precis', 'releve');
  assert.ok(permises.length >= 2 && permises.includes('coureur') && !permises.includes('trajectoire'));
  assert.deepEqual(animationsPermises(c, 'technique-precis', 'photos'), []);
  const vus = new Set<string | null>();
  for (let g = 0; g < 20; g++) vus.add(tirerAnimation(x, c, g).visuels.animation);
  assert.ok(vus.size >= 2);
  const y = tirerAnimation({ ...x, visuels: { ...x.visuels, animation: 'coureur' } }, c, 3);
  assert.equal(reparerComposition(y, c).visuels.animation, y.visuels.animation, 'animation choisie conservée');
});

test('client au hasard : déterministe, 1 à 3 principaux, soins de base cochés', () => {
  const a = scenarioAuHasard(alea(3), CATALOGUE.map((c) => c.slug));
  assert.deepEqual(a, scenarioAuHasard(alea(3), CATALOGUE.map((c) => c.slug)));
  assert.ok(a.principaux.length >= 1 && a.principaux.length <= 3 && a.couleurs.length <= 3);
  assert.ok(a.principaux.every((id) => themeParId(id)?.statut === 'actif'));
  assert.match(libelleScenario(a), /^1\. /);
});
