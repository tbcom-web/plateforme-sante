// Tests du point d'entrée « À valider » (sujets-validation.ts) : correspondance des gestes avec l'apprentissage (OK 4, J'adore 5,
// Pas OK 2, 1 seulement au second Pas OK ou sur choix explicite), sujet de chaque nouveauté (golf, cyclisme, diabète…), ordre des
// sujets, progression, file des cartes sans répétition (politique d'évaluation : nouveautés d'abord, tranchés exclus, délai de retour).
// Lancer : node packages/core/scripts/tests.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  carteAVoir, comboDecisions, expositionDuGeste, fileCartes, gesteSujetClavier, gesteSujetGlisse, lienCreerModeles, lienSujetsNouveautes, memeGroupe, NOTES_GESTES, noteDuGeste,
  ordonnerSujets, peutCreerModeles, progressionSujet, remarquesDuGeste, SEUIL_MODELES, serieDeJours, statutNouveauteDuGeste, SUJET_COMMUN, SUJET_TEXTES, sujetDeCle, sujetDuLot,
  sujetsValidation, textePari, verdictPari, type CarteCandidate,
} from './sujets-validation';
import { memoireExpositions, type Exposition } from './politique-evaluation';
import { lienNouveautes } from './nouveautes';

test('gestes → notes : OK 4, J’adore 5, Pas OK 2, Plus tard aucune ; 1 jamais au premier Pas OK', () => {
  assert.equal(noteDuGeste('ok'), 4);
  assert.equal(noteDuGeste('adore'), 5);
  assert.equal(noteDuGeste('pas-ok'), 2);
  assert.equal(noteDuGeste('plus-tard'), null);
  // Premier Pas OK : 2, même sur un élément noté 3, 4 ou 5 auparavant
  for (const derniereNote of [null, 3, 3.5, 4, 5]) assert.equal(noteDuGeste('pas-ok', { derniereNote }), NOTES_GESTES.pasOk);
  // Second Pas OK (dernière note ≤ 2, ou « à retravailler ») : 1 = ne plus jamais montrer
  assert.equal(noteDuGeste('pas-ok', { derniereNote: 2 }), 1);
  assert.equal(noteDuGeste('pas-ok', { derniereNote: 1 }), 1);
  assert.equal(noteDuGeste('pas-ok', { statut: 'a_retravailler' }), 1);
  // Choix explicite
  assert.equal(noteDuGeste('pas-ok', { jamais: true }), 1);
  // OK après un Pas OK : 4 (on change d'avis)
  assert.equal(noteDuGeste('ok', { derniereNote: 2 }), 4);
});

test('commentaire → colonnes positif / négatif existantes', () => {
  assert.deepEqual(remarquesDuGeste('ok', '  belle lumière '), { positif: 'belle lumière', negatif: null });
  assert.deepEqual(remarquesDuGeste('adore', 'waouh'), { positif: 'waouh', negatif: null });
  assert.deepEqual(remarquesDuGeste('pas-ok', 'trop chargé'), { positif: null, negatif: 'trop chargé' });
  assert.deepEqual(remarquesDuGeste('ok', '   '), { positif: null, negatif: null });
  assert.deepEqual(remarquesDuGeste('plus-tard', 'x'), { positif: null, negatif: null });
  assert.equal(remarquesDuGeste('ok', 'a'.repeat(3000)).positif?.length, 2000);
});

test('nouveautés en attente : OK / J’adore → accepté, Pas OK → à retravailler, second Pas OK → retiré ; Plus tard → rien', () => {
  assert.equal(statutNouveauteDuGeste('ok', 4), 'accepte');
  assert.equal(statutNouveauteDuGeste('adore', 5), 'accepte');
  assert.equal(statutNouveauteDuGeste('pas-ok', 2), 'a_retravailler');
  assert.equal(statutNouveauteDuGeste('pas-ok', 1), 'retire');
  assert.equal(statutNouveauteDuGeste('plus-tard', null), null);
  // Jamais « valide » : la validation pour les sites reste un geste explicite
  for (const g of ['ok', 'adore', 'pas-ok', 'plus-tard'] as const) assert.notEqual(statutNouveauteDuGeste(g, noteDuGeste(g)), 'valide');
  assert.equal(expositionDuGeste('plus-tard'), 'ignore');
  assert.equal(expositionDuGeste('ok'), 'note');
});

test('clavier et doigt : → OK, ← Pas OK, ↑ J’adore, ↓ Plus tard', () => {
  assert.equal(gesteSujetClavier('ArrowRight'), 'ok');
  assert.equal(gesteSujetClavier('O'), 'ok');
  assert.equal(gesteSujetClavier('ArrowLeft'), 'pas-ok');
  assert.equal(gesteSujetClavier('n'), 'pas-ok');
  assert.equal(gesteSujetClavier('ArrowUp'), 'adore');
  assert.equal(gesteSujetClavier('ArrowDown'), 'plus-tard');
  assert.equal(gesteSujetClavier('x'), null);
  assert.equal(gesteSujetGlisse(120, 10), 'ok');
  assert.equal(gesteSujetGlisse(-120, 10), 'pas-ok');
  assert.equal(gesteSujetGlisse(5, -140), 'adore');
  assert.equal(gesteSujetGlisse(40, 10), null);
  assert.equal(gesteSujetGlisse(90, 100), null);
});

test('sujets de la profession : profils de référence, Sport (commun), Commun à tous, Textes ; jamais le généraliste', () => {
  const s = sujetsValidation('podologue');
  const ids = s.map((x) => x.id);
  for (const id of ['sport-golf', 'sport-cyclisme', 'sport-basket', 'sport-tennis', 'sport-course', 'sport-rando', 'diabete', 'enfant', 'senior', 'ongles', 'semelles', 'theme-sport', SUJET_COMMUN, SUJET_TEXTES]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('generaliste'));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(s.find((x) => x.id === 'sport-golf')?.hashtags, ['golf']);
  assert.equal(s.find((x) => x.id === 'sport-golf')?.theme, 'sport');
  assert.equal(s.find((x) => x.id === SUJET_TEXTES)?.profil, null);
});

test('sujet d’une nouveauté : univers minimal golf, cyclisme, basket, tennis, diabète ; course, trail ; sinon commun', () => {
  const s = (cle: string, o = {}) => sujetDeCle(cle, { profession: 'podologue', ...o });
  assert.equal(s('composant:entete-anim:un-golf-green'), 'sport-golf');
  assert.equal(s('dessin:un-golf-alveoles:pedagogique'), 'sport-golf');
  assert.equal(s('composant:entete-anim:un-cyclisme-roue'), 'sport-cyclisme');
  assert.equal(s('dessin:un-basket-arc:pedagogique'), 'sport-basket');
  assert.equal(s('composant:entete-anim:un-tennis-rebond'), 'sport-tennis');
  assert.equal(s('composant:entete-anim:un-diabete-miroir'), 'diabete');
  assert.equal(s('dessin:diabete-bilan:releve'), 'diabete');
  assert.equal(s('composant:entete-anim:pi-analyse-course'), 'sport-course');
  assert.equal(s('dessin:trail-montagne:pedagogique'), 'sport-rando');
  // « marche » est ambigu : jamais la randonnée à lui seul
  assert.equal(s('composant:entete-anim:em-marche'), SUJET_COMMUN);
  assert.equal(s('composant:accueil:organique'), SUJET_COMMUN);
  assert.equal(s('typo:police:inter-lora'), SUJET_COMMUN);
  // Thèmes par défaut de l'inventaire (soins de l'asset), étiquettes de Paul
  assert.equal(s('dessin:auto-examen:pedagogique', { themes: ['diabete'] }), 'diabete');
  assert.equal(s('photo:/photos/x.webp', { tags: ['golf'] }), 'sport-golf');
  // Sport sans activité reconnue : Sport (commun) ; activité sans profil (rugby) : son thème
  assert.equal(s('dessin:sport-generique:pedagogique'), 'theme-sport');
  assert.equal(s('dessin:sport-rugby:pedagogique'), 'theme-sport');
  // Contenus : Textes
  assert.equal(s('contenu:podologue:fiche:talons'), SUJET_TEXTES);
});

test('lien d’un lot de nouveautés : ouvre le sujet qui en contient le plus', () => {
  const cles = ['composant:entete-anim:un-golf-green', 'dessin:un-golf-green:pedagogique', 'composant:entete-anim:un-tennis-court'];
  assert.equal(sujetDuLot(cles, (k) => sujetDeCle(k, { profession: 'podologue' })), 'sport-golf');
  assert.equal(sujetDuLot([], () => 'x'), null);
  // Égalité : l'ordre des sujets décide
  assert.equal(sujetDuLot(['a', 'b'], (k) => k, ['b', 'a']), 'b');
  assert.equal(lienSujetsNouveautes('univers-minimal@2026-10-10'), '/admin/sujets?nouveautes=univers-minimal%402026-10-10');
  // Les liens envoyés après une livraison mènent au point d'entrée unique
  assert.equal(lienNouveautes('univers-minimal@2026-10-10'), lienSujetsNouveautes('univers-minimal@2026-10-10'));
  assert.equal(lienCreerModeles('sport-golf'), '/chaine/preselection?profil=sport-golf');
});

test('ordre des sujets : nouveautés d’abord (sujets d’un profil avant « Commun à tous »), puis à voir, puis ordre de la profession', () => {
  const l = [
    { id: 'a', nouveautes: 0, aVoir: 0, ordre: 0, profil: 'a' },
    { id: 'b', nouveautes: 0, aVoir: 5, ordre: 1, profil: 'b' },
    { id: 'c', nouveautes: 2, aVoir: 2, ordre: 2, profil: 'c' },
    { id: 'd', nouveautes: 9, aVoir: 9, ordre: 3, profil: 'd' },
    { id: 'e', nouveautes: 0, aVoir: 3, ordre: 4, profil: 'e' },
    { id: 'commun', nouveautes: 24, aVoir: 30, ordre: 5, profil: null },
    { id: 'textes', nouveautes: 0, aVoir: 0, ordre: 6, profil: null },
  ];
  assert.deepEqual(ordonnerSujets(l).map((x) => x.id), ['d', 'c', 'commun', 'b', 'e', 'a', 'textes']);
});

test('progression : part vue, part OK, sujet complet ; récompense « Créer des modèles » au seuil', () => {
  assert.deepEqual(progressionSujet({ total: 10, aVoir: 4, ok: 5 }), { vus: 6, part: 0.6, partOk: 0.5, complet: false });
  assert.equal(progressionSujet({ total: 3, aVoir: 0, ok: 3 }).complet, true);
  assert.equal(progressionSujet({ total: 0, aVoir: 0, ok: 0 }).complet, false);
  assert.equal(progressionSujet({ total: 0, aVoir: 0, ok: 0 }).part, 0);
  assert.equal(peutCreerModeles({ profil: 'sport-golf' }, { ok: SEUIL_MODELES }), true);
  assert.equal(peutCreerModeles({ profil: 'sport-golf' }, { ok: SEUIL_MODELES - 1 }), false);
  assert.equal(peutCreerModeles({ profil: null }, { ok: 99 }), false);
});

test('file des cartes : nouveautés d’abord, sans répétition, tranchés et décidés exclus, délai de retour à la fin', () => {
  const c = (id: string, o: Partial<CarteCandidate> = {}): CarteCandidate => ({ id, cle: id, nouveaute: false, note: null, ...o });
  const cartes = [
    c('dessin:a:releve', { note: 4.2, n: 3, ecart: 0 } as Partial<CarteCandidate>),
    c('dessin:b:releve'),
    c('composant:entete-anim:un-golf-green', { nouveaute: true }),
    c('dessin:t:releve', { note: 5, tranche: true }),
    c('dessin:b:releve', { id: 'doublon' }),
    c('dessin:d:releve', { note: 3, n: 1 }),
    c('composant:entete-anim:un-golf-alveoles', { nouveaute: true, potentiel: 4.5 }),
    c('dessin:x:releve'),
  ];
  const f = fileCartes(cartes);
  // Nouveautés d'abord, la plus prometteuse en tête
  assert.deepEqual(f.slice(0, 2).map((x) => x.cle), ['composant:entete-anim:un-golf-alveoles', 'composant:entete-anim:un-golf-green']);
  // Jamais deux fois la même clé ; jamais un tranché ; jamais un élément déjà bien noté sans incertitude
  assert.equal(new Set(f.map((x) => x.cle)).size, f.length);
  assert.ok(!f.some((x) => x.cle === 'dessin:t:releve'));
  assert.ok(!f.some((x) => x.cle === 'dessin:a:releve'));
  // Jamais notés avant le départage d'un 3 ★
  assert.ok(f.findIndex((x) => x.cle === 'dessin:b:releve') < f.findIndex((x) => x.cle === 'dessin:d:releve'));
  // Décidés dans la séance : retirés
  const g = fileCartes(cartes, { decidees: new Set(['dessin:b:releve', 'composant:entete-anim:un-golf-green']) });
  assert.ok(!g.some((x) => x.cle === 'dessin:b:releve' || x.cle === 'composant:entete-anim:un-golf-green'));
  // Délai de retour : un élément montré à l'instant passe après les autres
  const maintenant = new Date().toISOString();
  const expos: Exposition[] = [{ cle: 'dessin:b:releve', surface: 'tuiles', ecran: 'e1', le: maintenant, resultat: 'ignore' }];
  const h = fileCartes(cartes, { ctx: { memoire: memoireExpositions(expos), maintenant } });
  assert.equal(h[h.length - 1].cle, 'dessin:b:releve');
  // Nouveautés : jamais deux variantes du même visuel à la suite quand une autre est disponible
  const v = fileCartes([c('dessin:z:releve', { nouveaute: true }), c('dessin:z:pedagogique', { nouveaute: true }), c('dessin:y:releve', { nouveaute: true })]);
  for (let i = 1; i < v.length - 1; i++) assert.ok(!memeGroupe(v[i - 1].cle, v[i].cle) || v.length < 3);
});

test('carte à voir : nouveauté, jamais notée, ou entre 2 et 4 ★ non tranchée', () => {
  assert.equal(carteAVoir({ nouveaute: true, note: 5 }), true);
  assert.equal(carteAVoir({ nouveaute: false, note: null }), true);
  assert.equal(carteAVoir({ nouveaute: false, note: 3 }), true);
  assert.equal(carteAVoir({ nouveaute: false, note: 4 }), false);
  assert.equal(carteAVoir({ nouveaute: false, note: 2 }), false);
  assert.equal(carteAVoir({ nouveaute: false, note: 3, tranche: true }), false);
});

test('série de jours, combo, pari du juge', () => {
  const j = { '2026-10-10': 3, '2026-10-09': 1, '2026-10-08': 12, '2026-10-06': 4 };
  assert.equal(serieDeJours(j, '2026-10-10'), 3);
  // Rien encore aujourd'hui : la série d'hier tient
  assert.equal(serieDeJours({ '2026-10-09': 1, '2026-10-08': 1 }, '2026-10-10'), 2);
  assert.equal(serieDeJours({}, '2026-10-10'), 0);
  assert.equal(comboDecisions([]), 0);
  assert.equal(comboDecisions([1000]), 1);
  assert.equal(comboDecisions([0, 10_000, 12_000, 13_500, 16_000]), 4);
  assert.equal(comboDecisions([0, 10_000, 15_000]), 1);
  assert.equal(verdictPari(4, 'ok'), 'juste');
  assert.equal(verdictPari(5, 'adore'), 'juste');
  assert.equal(verdictPari(4, 'pas-ok'), 'rate');
  assert.equal(verdictPari(2, 'pas-ok'), 'juste');
  assert.equal(verdictPari(2, 'ok'), 'rate');
  assert.equal(verdictPari(3, 'ok'), null);
  assert.equal(verdictPari(null, 'ok'), null);
  assert.equal(verdictPari(4, 'plus-tard'), null);
  assert.match(textePari(4, 'juste'), /pensait que tu allais aimer : vu juste/);
});
