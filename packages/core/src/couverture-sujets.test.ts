import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionsTri, alertesCouverture, couvertureParSujet, dansFamille, estPhotoStockee, fileTri, markdownCouverture, styleDeCle, type VisuelCouverture } from './couverture-sujets';

const v = (cle: string, type: VisuelCouverture['type'], soins: string[], statut: string | null = null): VisuelCouverture => ({ cle, type, soins, statut });

const visuels: VisuelCouverture[] = [
  v('heros:sport:releve', 'heros', ['sport']),
  v('heros:sport:ligne', 'heros', ['sport']),
  v('dessin:verrue:releve', 'dessin', ['sport']),
  v('dessin:verrue:pedagogique', 'dessin', ['sport']),
  v('ligne:chaussure-course', 'ligne', ['sport']),
  v('ligne:coureur', 'ligne', ['sport']),
  v('picto:course', 'picto', ['sport']),
  v('photo:sport-course', 'photo', ['sport']),
  v('photo:banque/pexels-1.webp', 'photo', ['sport']),
  v('photo:banque/pexels-2.webp', 'photo', ['sport'], 'retire'),
  v('animation:coureur', 'animation', ['sport'], 'valide'),
  v('dessin:pied-profil:riso', 'dessin', ['general']),
  v('picto:inconnu', 'picto', []),
];

test('couverture : styles, photos importées, familles', () => {
  assert.equal(styleDeCle('dessin:verrue:releve'), 'releve');
  assert.equal(styleDeCle('ligne:mycose'), 'ligne');
  assert.equal(styleDeCle('materiel:laser:pedagogique'), 'pedagogique');
  assert.equal(styleDeCle('dessin:pied-profil:riso'), 'experimental');
  assert.equal(styleDeCle('biblio:POD-AT-0009:dorsale'), 'bibliotheque');
  assert.equal(styleDeCle('picto:x'), null);
  assert.ok(estPhotoStockee('photo:banque/pexels-1.webp'));
  assert.ok(!estPhotoStockee('photo:sport-course'));
  assert.ok(dansFamille({ type: 'ligne' }, 'illustrations'));
  assert.ok(!dansFamille({ type: 'heros' }, 'illustrations'));
  assert.ok(!dansFamille({ type: 'gamme' }, 'tout'));
});

test('couverture : comptes par sujet (retirés exclus, surcharges de Paul prises en compte)', () => {
  const c = couvertureParSujet(visuels);
  const sport = c.find((x) => x.sujet === 'sport')!;
  assert.equal(sport.heros, 2);
  assert.deepEqual([sport.illustrations.releve, sport.illustrations.pedagogique, sport.illustrations.ligne], [1, 1, 2]);
  assert.equal(sport.icones, 1);
  assert.equal(sport.photosImportees, 1, 'la photo retirée ne compte pas');
  assert.equal(sport.photosIntegrees, 1);
  assert.deepEqual([sport.animationsValidees, sport.animations], [1, 1]);
  // Paul range la photo importée en Seniors et la retire du Sport
  const c2 = couvertureParSujet(visuels, { 'photo:banque/pexels-1.webp': { ajouts: ['senior'], retraits: ['sport'] } });
  assert.equal(c2.find((x) => x.sujet === 'sport')!.photosImportees, 0);
  assert.equal(c2.find((x) => x.sujet === 'senior')!.photosImportees, 1);
});

test('couverture : alertes (« Seniors : 0 photo importée », « 1 seule illustration en … ») et filtre du tri', () => {
  const a = alertesCouverture(couvertureParSujet(visuels));
  const textes = a.map((x) => x.texte);
  assert.ok(textes.some((t) => /^Seniors : 0 photo importée$/.test(t)));
  assert.ok(textes.includes('Sport : 1 seule illustration en relevé'));
  assert.ok(!textes.some((t) => t.startsWith('Sport : 0 photo')));
  assert.ok(!textes.some((t) => t === 'Général : aucun héros'));
  assert.equal(a[0].gravite, 'forte', 'les plus graves d’abord');
  const s = a.find((x) => x.texte === 'Seniors : 0 photo importée')!;
  assert.deepEqual(s.filtre, { sujet: 'senior', famille: 'photos' });
  const md = markdownCouverture(couvertureParSujet(visuels));
  assert.match(md, /## Couverture par sujet/);
  assert.match(md, /\| Sport \| 2 \| 1 \| 1 \| 2 \| 1 \| 1 \| 1 \| 1\/1 \|/);
  assert.match(md, /\*\*Seniors : 0 photo importée\*\*/);
});

test('tri : file (sans sujet, général seul, sujet mal couvert, jamais trié, déjà trié) et actions', () => {
  const f = fileTri(visuels, { tries: new Set(['heros:sport:releve']), faibles: new Set(['senior']), suggestions: (x) => (x.cle === 'ligne:coureur' ? ['senior'] : []) });
  assert.equal(f[0].visuel.cle, 'picto:inconnu');
  assert.equal(f[0].raison, 'sans-sujet');
  assert.equal(f[1].visuel.cle, 'dessin:pied-profil:riso');
  assert.equal(f[1].raison, 'general-seul');
  assert.equal(f[2].visuel.cle, 'ligne:coureur');
  assert.equal(f[2].raison, 'sujet-faible');
  assert.equal(f[f.length - 1].visuel.cle, 'heros:sport:releve');
  assert.equal(f[f.length - 1].raison, 'deja-trie');
  assert.ok(!f.some((x) => x.visuel.cle === 'photo:banque/pexels-2.webp'), 'retirés exclus');
  const photos = fileTri(visuels, { famille: 'photos' });
  assert.deepEqual(photos.map((x) => x.visuel.cle), ['photo:sport-course', 'photo:banque/pexels-1.webp']);
  const senior = fileTri(visuels, { sujet: 'senior' });
  assert.deepEqual(senior.map((x) => x.visuel.cle), ['picto:inconnu']);
  assert.deepEqual(actionsTri(['sport', 'general'], ['sport', 'senior']), [{ sujet: 'senior', action: 'ajout' }, { sujet: 'general', action: 'retrait' }]);
  assert.deepEqual(actionsTri(['sport'], ['sport']), []);
});
