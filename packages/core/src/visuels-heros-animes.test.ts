import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animationDeImageFixe, cleImageFixe, estImageFixe, visuelsHerosAnimes } from './visuels-heros-animes';
import { inventaireAssets } from './assets';
import { sujetsDuVisuel } from './sujets-visuels';
import { repereDimension, repereConnu } from './reperes';
import { estCleAsset } from './assets-poids';

test('visuels animés du premier écran : animations du sujet, état, image fixe', () => {
  const assets = inventaireAssets({ photosJeux: [] });
  const sujetsDe = (a: (typeof assets)[number]) => sujetsDuVisuel({ cle: a.cle, type: a.type, soins: a.soins }, {}).sujets;
  const sport = visuelsHerosAnimes('sport', { assets, sujetsDe });
  assert.ok(sport.length > 0, 'au moins une animation pour le sport');
  for (const v of sport) {
    assert.match(v.cle, /^animation:/);
    assert.equal(animationDeImageFixe(v.imageFixe), v.cle);
    assert.ok(estCleAsset(v.imageFixe));
    assert.equal(v.admissible, !v.enAttente);
  }
  const retiree = visuelsHerosAnimes('sport', { assets, sujetsDe, statuts: { [sport[0].cle]: 'retire' } });
  assert.equal(retiree.find((v) => v.cle === sport[0].cle)!.admissible, false);
  assert.ok(estImageFixe(cleImageFixe('animation:coureur')) && !estImageFixe('animation:coureur'));
  assert.ok(repereConnu('animation:fige') && repereConnu('animation:illustration'));
  assert.ok(!repereDimension('animation:fige').libelle.includes(':'));
});

test('option heros : animations qui tiennent en grand (empreintes, abstraites, illustrations validées), image fixe en HTML', () => {
  const assets = inventaireAssets({ photosJeux: [] });
  const sujetsDe = (a: (typeof assets)[number]) => sujetsDuVisuel({ cle: a.cle, type: a.type, soins: a.soins }, {}).sujets;
  const sans = visuelsHerosAnimes('semelles', { assets, sujetsDe });
  assert.ok(sans.every((v) => v.cle.startsWith('animation:')), 'inchangé sans l’option');
  const avec = visuelsHerosAnimes('semelles', { assets, sujetsDe, heros: true });
  const em = avec.find((v) => v.cle === 'composant:entete-anim:em-respire')!;
  assert.ok(em && em.admissible && em.aValider && em.rendu === 'entete' && em.fixe!.html.includes('ea--em-respire'));
  // Animation d'illustration sans images de base validées : listée, jamais admissible ni rendue
  const il = avec.find((v) => v.cle === 'composant:entete-anim:il-semelle')!;
  assert.ok(il.enAttente && !il.admissible && !il.fixe);
  // Diabète : jamais les vives
  assert.ok(!visuelsHerosAnimes('diabete', { assets, sujetsDe, heros: true }).some((v) => /em-petits-pas|em-particules|:taches/.test(v.cle)));
});
