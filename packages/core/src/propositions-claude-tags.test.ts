import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  aPrioriClaude, ecrituresValidation, hashtagProfession, hashtagsAValider, lirePropositionsTags, markdownCalibrationTags, MARQUEURS_CALIBRATION_TAGS,
  normaliserProfession, pairesPropositions, POIDS_A_PRIORI_CLAUDE, prioriteTags, remplacerSectionCalibrationTags, trierParNotePredite, mesurerPaires,
} from './propositions-claude-tags';
import { inventaireAssets } from './assets';
import { estSujetVisuel } from './photos-libres';
import { estHashtag } from './hashtags';

const brut = {
  version: 1, le: '2026-10-08', profil: '2026-10-07.v2',
  propositions: {
    'photo:sport-course': { sujets: ['sport', 'posture', 'inconnu'], activites: ['Course', 'posturologie'], hashtags: ['#Course à pied', 'running', 'posturo', 'x'], professions: ['Pédicure-podologue', 'kine'], description: '  Coureur  ', alertes: ['texte-ou-marque', 'nimporte'], notePredite: 4, confiance: 'moyenne', justification: 'Net.' },
    'dessin:verrue:releve': { sujets: ['pedicurie'], hashtags: ['verrue-plantaire'], notePredite: null, confiance: 'forte' },
    'pas une clé': { sujets: ['sport'] },
    'picto:laser': { sujets: ['ongles'], notePredite: 9, confiance: 'enorme' },
  },
};

test('lecture : normalisation stricte des sujets, hashtags, activités, professions et alertes', () => {
  const lot = lirePropositionsTags(brut);
  assert.equal(lot.propositions.length, 3);
  const p = lot.propositions.find((x) => x.cle === 'photo:sport-course')!;
  assert.deepEqual(p.sujets, ['sport']);
  assert.deepEqual(p.hashtags, ['course-a-pied', 'running']);
  assert.deepEqual(p.activites, ['course']);
  assert.deepEqual(p.professions, ['podologue', 'kinesitherapeute']);
  assert.deepEqual(p.alertes, ['texte-ou-marque']);
  assert.equal(p.description, 'Coureur');
  assert.equal(p.le, '2026-10-08');
  const l = lot.propositions.find((x) => x.cle === 'picto:laser')!;
  assert.equal(l.notePredite, null);
  assert.equal(l.confiance, 'faible');
  assert.deepEqual(lirePropositionsTags('nimporte').propositions, []);
});

test('professions : alias vers le registre, hashtag de rangement', () => {
  assert.equal(normaliserProfession('Pédicure-podologue'), 'podologue');
  assert.equal(normaliserProfession('#Ostéopathe'), 'osteopathe');
  assert.equal(hashtagProfession('kinesitherapeute'), 'profession-kinesitherapeute');
  assert.ok(hashtagsAValider({ hashtags: ['laser'], activites: ['tennis'], professions: ['podologue'] }).includes('profession-podologue'));
});

test('validation : seuls les tags cochés sont écrits, en ajouts, sans aucune note ; origine tracée', () => {
  const lot = lirePropositionsTags(brut);
  const e = ecrituresValidation([{ cle: 'photo:sport-course', sujets: ['sport', 'posture'], hashtags: ['running', 'trail', 'posturo'] }], lot.propositions, { hashtags: { 'photo:sport-course': ['running'] } });
  assert.deepEqual(e.sujets, [{ cle: 'photo:sport-course', sujet: 'sport', action: 'ajout' }]);
  assert.deepEqual(e.hashtags, [{ cle: 'photo:sport-course', hashtag: 'trail', action: 'ajout' }]);
  assert.ok(e.suggestions.every((s) => s.raison.startsWith('proposition Claude') && s.contexte === 'bibliotheque'));
  assert.equal(e.suggestions.find((s) => s.valeur === 'course-a-pied')?.decision, 'refusee');
  assert.equal(e.suggestions.find((s) => s.valeur === 'running')?.decision, 'acceptee');
  assert.ok(!('notes' in e));
  assert.ok(!JSON.stringify(e).includes('note'));
});

test('a priori : plafonné à ±0,25 ★, nul si déjà noté ou désactivé', () => {
  assert.equal(POIDS_A_PRIORI_CLAUDE, 0.25);
  assert.equal(aPrioriClaude({ notePredite: 5, confiance: 'forte' }), 0.25);
  assert.equal(aPrioriClaude({ notePredite: 1, confiance: 'forte' }), -0.25);
  assert.ok(aPrioriClaude({ notePredite: 5, confiance: 'faible' }) < 0.25);
  assert.equal(aPrioriClaude({ notePredite: 5, confiance: 'forte' }, { dejaNote: true }), 0);
  assert.equal(aPrioriClaude({ notePredite: 5, confiance: 'forte' }, { actif: false }), 0);
  assert.equal(aPrioriClaude({ notePredite: 5, confiance: 'forte' }, { poids: 3 }), 0.25);
  assert.equal(aPrioriClaude({ notePredite: null, confiance: 'forte' }), 0);
});

test('ordre : jamais notés d’abord, note prédite décroissante ; rien n’est retiré', () => {
  const l = [
    { cle: 'a', notePredite: 2, confiance: 'forte' as const },
    { cle: 'b', notePredite: 5, confiance: 'faible' as const },
    { cle: 'c', notePredite: 5, confiance: 'forte' as const },
    { cle: 'd', notePredite: null, confiance: 'faible' as const },
  ];
  assert.deepEqual(trierParNotePredite(l, new Set(['c'])).map((x) => x.cle), ['b', 'a', 'd', 'c']);
  assert.equal(prioriteTags('x', { sujets: { x: ['general'] } }), 'sans-sujet');
  assert.equal(prioriteTags('x', { sujets: { x: ['sport'] } }), 'sans-hashtag');
  assert.equal(prioriteTags('x', { sujets: { x: ['sport'] }, hashtags: { x: ['trail'] } }), 'complement');
});

test('calibration : seules les notes de Paul données après la proposition comptent ; jamais comptée comme note de Paul', () => {
  const lot = lirePropositionsTags(brut);
  const paires = pairesPropositions(lot.propositions, [
    { cle: 'photo:sport-course', note: 1, jour: '2026-10-07' },
    { cle: 'photo:sport-course', note: 3, jour: '2026-10-09' },
    { cle: 'dessin:verrue:releve', note: 5, jour: '2026-10-09' },
  ]);
  assert.deepEqual(paires.map((p) => [p.cle, p.predite, p.paul]), [['photo:sport-course', 4, 3]]);
  assert.deepEqual(mesurerPaires(paires), { n: 1, exactes: 0, aUnPres: 1, ecartMoyen: 1, biais: 1 });
  const md = markdownCalibrationTags(lot, [{ cle: 'photo:sport-course', note: 3, jour: '2026-10-09' }], { jour: '2026-10-09' });
  assert.match(md, /\| Toutes \| 1 \| 0 \(0 %\) \| 1 \(100 %\)/);
  const sans = markdownCalibrationTags(lot, []);
  assert.match(sans, /Pas encore de note/);
  const avant = '# Calibration\n\ntexte à garder\n';
  const apres = remplacerSectionCalibrationTags(avant, 'A');
  assert.ok(apres.startsWith(avant.trim()) && apres.includes(MARQUEURS_CALIBRATION_TAGS[0]) && apres.includes(MARQUEURS_CALIBRATION_TAGS[1]));
  assert.equal(remplacerSectionCalibrationTags(apres, 'B').match(/propositions-claude-tags -->/g)?.length, 2);
  assert.ok(remplacerSectionCalibrationTags(apres, 'B').includes('\nB\n') && !remplacerSectionCalibrationTags(apres, 'B').includes('\nA\n'));
});

test('fichier du dépôt : lisible, sans perte, sans données personnelles, tags valides', () => {
  const chemin = join(process.cwd(), 'retours', 'propositions-claude-tags.json');
  let texte: string;
  try { texte = readFileSync(chemin, 'utf8'); } catch { return; }
  const json = JSON.parse(texte);
  const lot = lirePropositionsTags(json);
  assert.equal(lot.propositions.length, Object.keys(json.propositions).length);
  assert.doesNotMatch(texte, /@[a-z0-9-]+\.[a-z]{2,}|auteur|e-?mail|signedurl|token=/i);
  const inventaire = new Set(inventaireAssets().map((a) => a.cle));
  for (const p of lot.propositions) {
    const b = json.propositions[p.cle];
    assert.equal(p.sujets.length, b.sujets.length, `${p.cle} : sujet rejeté`);
    assert.equal(p.hashtags.length, b.hashtags.length, `${p.cle} : hashtag rejeté`);
    assert.ok(p.sujets.every(estSujetVisuel) && p.hashtags.every(estHashtag));
    assert.ok(!p.sujets.includes('posture') && !p.hashtags.some((h) => h.startsWith('postur')));
    assert.ok(p.cle.startsWith('photo:banque/') || inventaire.has(p.cle), `${p.cle} absent de l'inventaire`);
    if (b.dejaNoteeParPaul) assert.equal(p.notePredite, null, `${p.cle} : prédiction sur un élément déjà noté`);
    if (p.notePredite != null) assert.ok(p.justification, `${p.cle} : prédiction sans justification`);
  }
});
