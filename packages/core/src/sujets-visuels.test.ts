import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avecSujets, markdownSujets, sujetsDuVisuel, sujetsEffectifs, sujetsParDefaut, sujetsSansVisuel, surchargesDepuisLignes, visuelsDuSujet,
} from './sujets-visuels';
import { archiverInventaire, empreinteAsset, instantaneAsset, lireInstantane, minifierSvg, rendusAvant } from './avant-apres';
import { bonusAssets, ordonnerPhotos, scoreAssetPourSujet } from './assets-poids';
import { choisirJeuPhotos } from './jeux-photos';
import { inventaireAssets } from './assets';
import { texteRemarques } from './remarques';
import { markdownAssets, syntheseAssets } from './assets';
import { empreinteSvg } from './illustrations';
import { GAMMES } from './gammes';

test('sujets : défauts tirés du code (héros, soins, spécialités, photos libres)', () => {
  assert.deepEqual(sujetsParDefaut({ cle: 'heros:sport:releve', type: 'heros', soins: [] }), ['sport']);
  assert.deepEqual(sujetsParDefaut({ cle: 'dessin:x', type: 'dessin', soins: ['ongle-incarne'] }), ['ongles']);
  assert.deepEqual(sujetsParDefaut({ cle: 'photo:x', type: 'photo', soins: ['soins'] }), ['ongles', 'senior', 'pedicurie']);
  assert.deepEqual(sujetsParDefaut({ cle: 'photo:y', type: 'photo', soins: ['ongles'] }), ['ongles'], 'sujet d’une photo libre : tel quel');
  assert.deepEqual(sujetsParDefaut({ cle: 'photo:z', type: 'photo', soins: ['generale'] }), ['semelles', 'general']);
  assert.deepEqual(sujetsParDefaut({ cle: 'gamme:canard', type: 'gamme', soins: [] }), []);
  assert.ok(!sujetsParDefaut({ cle: 'dessin:p', type: 'dessin', soins: ['posturologie'] }).includes('posture'), 'sujet différé jamais proposé');
  // Tout l'inventaire : sujets connus seulement
  for (const a of inventaireAssets()) for (const s of sujetsParDefaut(a)) assert.ok(['sport', 'diabete', 'ongles', 'enfant', 'senior', 'semelles', 'pedicurie', 'general'].includes(s), `${a.cle} ${s}`);
});

test('sujets : fusion défauts ± surcharges, dernière action, déterminisme', () => {
  const lignes = [
    { cle: 'photo:a', sujet: 'sport', action: 'retrait', le: '2026-10-07T10:00:00Z' },
    { cle: 'photo:a', sujet: 'enfant', action: 'ajout', le: '2026-10-07T10:01:00Z' },
    { cle: 'photo:a', sujet: 'sport', action: 'ajout', le: '2026-10-07T09:00:00Z' },
    { cle: 'photo:a', sujet: 'posture', action: 'ajout', le: '2026-10-07T11:00:00Z' },
    { cle: 'photo:b', sujet: 'diabete', action: 'ajout', le: '2026-10-07T10:00:00Z' },
    { cle: 'photo:b', sujet: 'diabete', action: 'retrait', le: '2026-10-07T12:00:00Z' },
  ];
  const s = surchargesDepuisLignes(lignes);
  assert.deepEqual(s['photo:a'], { ajouts: ['enfant'], retraits: ['sport'] }, 'dernière action par (clé, sujet), sujet différé ignoré');
  assert.deepEqual(surchargesDepuisLignes([...lignes].reverse()), s, 'même résultat quel que soit l’ordre de lecture');
  const e = sujetsEffectifs(['sport', 'general'], s['photo:a']);
  assert.deepEqual(e, { sujets: ['enfant', 'general'], defauts: ['sport', 'general'], ajoutes: ['enfant'], retires: ['sport'] });
  assert.deepEqual(sujetsEffectifs(['sport'], s['photo:b']).sujets, ['sport'], 'retrait d’un sujet absent : sans effet');
  assert.deepEqual(sujetsDuVisuel({ cle: 'photo:a', type: 'photo', soins: ['sport'] }, s).sujets, ['enfant']);
});

test('sujets : visuels d’un sujet, repli et « sujet sans visuel »', () => {
  const v = [
    { cle: 'heros:sport:releve', type: 'heros' as const, soins: [] },
    { cle: 'dessin:x', type: 'dessin' as const, soins: ['ongle-incarne'] },
  ];
  assert.deepEqual(visuelsDuSujet(v, 'sport').visuels.map((x) => x.cle), ['heros:sport:releve']);
  const s = { 'heros:sport:releve': { ajouts: [], retraits: ['sport'] }, 'dessin:x': { ajouts: ['enfant'], retraits: [] } };
  const r = visuelsDuSujet(v, 'sport', s);
  assert.equal(r.repli, true, 'plus aucun visuel : repli sur les défauts');
  assert.deepEqual(r.visuels.map((x) => x.cle), ['heros:sport:releve']);
  assert.deepEqual(visuelsDuSujet(v, 'enfant', s).visuels.map((x) => x.cle), ['dessin:x']);
  const sans = sujetsSansVisuel(v, s);
  assert.deepEqual(sans, [{ sujet: 'sport', libelle: 'Sport', famille: 'illustrations' }]);
  assert.match(markdownSujets(s, { sansVisuel: sans }), /retiré de Sport[\s\S]*Sport : plus aucune illustration/);
  assert.match(markdownSujets({}), /Aucune modification/);
});

test('sujets : effet sur le générateur (héros, photos, jeux)', () => {
  const s = { 'heros:sport:releve': { ajouts: [], retraits: ['sport'] }, 'photo:banque/a.webp': { ajouts: [], retraits: ['sport'] } };
  const p = avecSujets(null, s)!;
  assert.equal(scoreAssetPourSujet('heros:sport:releve', 'sport', p), -3);
  assert.equal(scoreAssetPourSujet('heros:sport:releve', 'enfant', p), 0);
  const prop = { structure: 'clair-pratique', gamme: 'canard', style: 'x', registre: 'releve', modeVisuel: 'illustrations', animation: null, heros: 'sport', sujet: 'sport' };
  assert.ok(bonusAssets(prop, p) < bonusAssets(prop, avecSujets(null, {})), 'héros retiré du sujet : proposition pénalisée');
  const url = (n: string) => `https://x.supabase.co/storage/v1/object/public/photos/banque/${n}.webp`;
  assert.deepEqual(ordonnerPhotos([url('a'), url('b')], p, 1, ['sport']), [url('b')], 'photo retirée du sujet du site : enlevée');
  assert.deepEqual(ordonnerPhotos([url('a'), url('b')], p, 1, ['enfant']), [url('a'), url('b')]);
  const jeux = [{ id: 'j1', specialite: 'sport', source: 'banque' as const, siteId: null, actif: true, photos: { accueil: url('a'), panorama: '', galerie: [], soins: {} } },
    { id: 'j2', specialite: 'sport', source: 'banque' as const, siteId: null, actif: true, photos: { accueil: url('b'), panorama: '', galerie: [], soins: {} } }];
  let j2 = 0;
  for (let i = 0; i < 100; i++) if (choisirJeuPhotos(jeux, 'sport', () => i / 100, p) === 'j2') j2++;
  assert.ok(j2 > 80, `le jeu sans photo retirée sort bien plus souvent (${j2} / 100)`);
});

test('avant / après : empreintes, instantanés, archives, remarques', () => {
  const inv = inventaireAssets();
  const picto = inv.find((a) => a.type === 'picto')!;
  const svg = picto.rendu.kind === 'svg' ? picto.rendu.svg() : '';
  assert.equal(empreinteAsset(picto), empreinteSvg(svg), 'même empreinte que les notes 0027');
  const ap = instantaneAsset(picto)!;
  assert.ok(ap.length <= svg.length && ap.startsWith('<svg'));
  assert.equal(minifierSvg('<svg>\n  <g>  </g>\n</svg>'), '<svg><g></g></svg>');
  const gamme = inv.find((a) => a.cle === 'gamme:canard')!;
  assert.match(empreinteAsset(gamme)!, /^[0-9a-f]{8}$/);
  assert.equal(lireInstantane(instantaneAsset(gamme))?.kind, 'gamme');
  const photo = inv.find((a) => a.type === 'photo')!;
  assert.equal(empreinteAsset(photo), null);
  assert.deepEqual(lireInstantane(instantaneAsset(photo)), { kind: 'image', src: '/photos/accueil-observation-marche.webp' });
  assert.equal(lireInstantane('javascript:alert(1)'), null);
  assert.equal(lireInstantane('<img src=x>'), null);
  // Archive : gammes de la version archivée (couleurs modifiées depuis)
  const anciennes = GAMMES.map((g) => (g.id === 'canard' ? { ...g, accent: '#000000' } : g));
  const ar = archiverInventaire(inv, 'abc1234', '2026-10-07', anciennes);
  assert.ok(Object.keys(ar.assets).length > 100);
  assert.ok(!Object.keys(ar.assets).some((k) => k.startsWith('photo:')), 'photos : l’adresse suffit');
  const eAncienne = ar.assets['gamme:canard'].e;
  assert.notEqual(eAncienne, empreinteAsset(gamme), 'gamme retouchée : autre empreinte');
  const avant = rendusAvant({ cle: 'gamme:canard', empreinte: eAncienne }, [ar]);
  assert.equal(avant?.kind === 'gamme' && avant.gamme.accent, '#000000');
  assert.equal(rendusAvant({ cle: 'gamme:canard', empreinte: 'ffffffff' }, [ar]), null, 'empreinte inconnue : pas d’avant');
  assert.equal(rendusAvant({ cle: picto.cle, empreinte: null, apercu: ap }, [])?.kind, 'svg', 'instantané d’abord');
  // Remarques distinctes dans la synthèse
  assert.equal(texteRemarques({ positif: ' net ', negatif: 'trop  fin', commentaire: '' }), 'Ce qui va bien : net — Ce qui ne va pas : trop fin');
  const md = markdownAssets(syntheseAssets([{ cle: picto.cle, note: 2, positif: 'lisible', negatif: 'trait trop fin', le: '2026-10-07' }]));
  assert.match(md, /Ce qui va bien : lisible — Ce qui ne va pas : trait trop fin/);
});
