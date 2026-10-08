import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bonusAssets, clePhoto, estCleAsset, etiquettesDuType, inventaireAssets, markdownAssets, normaliserPoidsAssets, ordonnerPhotos, poidsAssets,
  scoreAsset, syntheseAssets, titresAssets, typeDeCle, type LigneAppriseAsset,
} from './assets';
import { lotsPropositions, propositionsModeles, type EntreePropositions } from './propositions';
import { normaliserPoidsAtelier } from './atelier-poids';
import { choisirJeuPhotos, persoDuJeuPhotos, PHOTOS_INTEGREES } from './jeux-photos';
import { gamme, verifierGamme } from './gammes';
import { assetsInfluents, changementsGenerateur, etatsNotes, palierAvis, prioriteAsset, prochaineCarte, serieAvis } from './retours';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const entree = (principaux: string[], couleursPreferees: string[] = []): EntreePropositions => ({ priorites: { principaux, secondaires: [] }, couleursPreferees });
const notes = (cle: string, note: number, n: number): LigneAppriseAsset[] => Array.from({ length: n }, () => ({ cle, note }));

test('inventaire unifié : tous les types, clés uniques et valides, toutes les photos de la banque', () => {
  const l = inventaireAssets();
  const cles = l.map((a) => a.cle);
  assert.equal(new Set(cles).size, cles.length, 'clés uniques');
  for (const a of l) {
    assert.ok(estCleAsset(a.cle), a.cle);
    assert.equal(typeDeCle(a.cle), a.type, a.cle);
    assert.ok(etiquettesDuType(a.type).some((e) => e.positive) && etiquettesDuType(a.type).some((e) => !e.positive));
  }
  for (const t of ['picto', 'dessin', 'ligne', 'materiel', 'animation', 'heros', 'biblio', 'photo', 'modele', 'gamme'] as const) assert.ok(l.some((a) => a.type === t), t);
  assert.equal(l.filter((a) => a.type === 'modele').length, 4);
  // Banque intégrée = dossier apps/sites/public/photos (aucune photo oubliée)
  const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'apps', 'sites', 'public', 'photos')))!;
  const dossier = readdirSync(join(racine, 'apps', 'sites', 'public', 'photos')).filter((f) => f.endsWith('.webp')).map((f) => `/photos/${f}`).sort();
  assert.deepEqual([...PHOTOS_INTEGREES].sort(), dossier);
  // Photos des jeux : ajoutées, sans doublon
  const url = 'https://x.supabase.co/storage/v1/object/public/photos/banque/jeux/sport/a1.webp';
  const avec = inventaireAssets({ photosJeux: [{ url, jeu: 'Sport 1', specialite: 'sport' }, { url, jeu: 'Sport 2', specialite: 'sport' }] });
  assert.equal(avec.length, l.length + 1);
  assert.equal(clePhoto(url), 'photo:banque/jeux/sport/a1.webp');
  assert.equal(clePhoto('/photos/sport-course.webp'), 'photo:sport-course');
  assert.equal(clePhoto('https://ailleurs.fr/x.webp'), null);
  assert.ok(titresAssets()['gamme:cobalt']);
});

test('lissage : une note isolée pèse peu ; statuts retiré / à retravailler pénalisent', () => {
  const fond = [...notes('gamme:sauge', 3, 6), ...notes('gamme:menthe', 3, 6)];
  const une = poidsAssets([...fond, { cle: 'gamme:cobalt', note: 5 }])!;
  const dix = poidsAssets([...fond, ...notes('gamme:cobalt', 5, 10)])!;
  assert.ok(une.effets['gamme:cobalt'] > 0 && une.effets['gamme:cobalt'] < dix.effets['gamme:cobalt']);
  const p = poidsAssets([...fond, { cle: 'heros:sport:releve', note: null, statut: 'retire' }, { cle: 'photo:sport-course', note: null, statut: 'a_retravailler' }, { cle: 'gamme:x', note: null, statut: 'valide' }])!;
  assert.equal(scoreAsset('heros:sport:releve', p), -3);
  assert.equal(scoreAsset('photo:sport-course', p), -0.75);
  assert.equal(scoreAsset('gamme:x', p), 0);
  assert.equal(poidsAssets([]), null);
  assert.deepEqual(poidsAssets(fond), poidsAssets([...fond].reverse()));
  // Normalisation (props, route) et transport dans les poids de l'atelier
  assert.deepEqual(normaliserPoidsAssets(JSON.parse(JSON.stringify(p))), p);
  assert.deepEqual(normaliserPoidsAtelier({ n: 0, moyenne: 0, effets: {}, assets: p })?.assets, p);
  assert.equal(normaliserPoidsAssets({ n: 1, effets: { 'pas une clé': 2 } })?.effets['pas une clé'], undefined);
});

test('apprentissage : gammes et héros bien notés remontent, retirés reculent ; garde-fous intacts', () => {
  const e = entree(['sport']);
  const sans = propositionsModeles(e);
  const cible = lotsPropositions(e, 4).flat().find((p) => !sans.some((s) => s.gamme === p.gamme))!;
  const fond = [...notes('gamme:sauge', 3, 6), ...notes('picto:x', 3, 6)];
  const pos = { n: 0, moyenne: 0, effets: {}, assets: poidsAssets([...fond, ...notes(`gamme:${cible.gamme}`, 5, 20)]) };
  assert.ok(propositionsModeles(e, { poids: pos }).some((p) => p.gamme === cible.gamme), 'gamme adorée : premier lot');
  const g0 = sans[0].gamme;
  const neg = { n: 0, moyenne: 0, effets: {}, assets: poidsAssets([...fond, ...notes(`gamme:${g0}`, 1, 20), { cle: `gamme:${g0}`, statut: 'retire' }]) };
  assert.ok(!propositionsModeles(e, { poids: neg }).some((p) => p.gamme === g0), 'gamme retirée : hors du premier lot');
  // Héros retiré dans un registre : bonus négatif pour ce registre seulement
  const h = poidsAssets([{ cle: 'heros:sport:releve', statut: 'retire' }]);
  assert.ok(bonusAssets({ structure: 'technique-precis', gamme: 'cobalt', style: 'releve', registre: 'releve', modeVisuel: 'illustrations', animation: 'coureur', heros: 'sport' }, h) < -2);
  assert.equal(bonusAssets({ structure: 'technique-precis', gamme: 'cobalt', style: 'pedagogique', registre: 'pedagogique', modeVisuel: 'illustrations', animation: null, heros: 'sport' }, h), 0);
  // Garde-fous : diabète sans rouge ni relevé, même si les gammes rouges et le relevé sont adorés
  const tout = { n: 0, moyenne: 0, effets: {}, assets: poidsAssets([...fond, ...notes('gamme:corail', 5, 30), ...notes('gamme:pasteque', 5, 30), ...notes('heros:diabete:releve', 5, 30)]) };
  for (const p of lotsPropositions(entree(['diabete'], ['rouge']), 6, { poids: tout }).flat()) {
    assert.ok(!['corail', 'pasteque', 'corail-nuit', 'pistache'].includes(p.gamme), p.id);
    assert.notEqual(p.style, 'releve');
    assert.notEqual(p.univers, 'technique-precis');
    assert.deepEqual(verifierGamme(gamme(p.gamme)!), [], 'AA');
  }
  // Diversité : 3 structures, 3 styles, 3 gammes par lot
  for (const lot of lotsPropositions(e, 4, { poids: neg })) {
    assert.equal(new Set(lot.map((p) => p.univers)).size, 3);
    assert.equal(new Set(lot.map((p) => p.style)).size, 3);
    assert.equal(new Set(lot.map((p) => p.gamme)).size, 3);
  }
  // Posture jamais
  assert.ok(lotsPropositions(entree(['posture']), 3, { poids: tout }).flat().every((p) => p.heros !== 'posture' && p.animation !== 'trajectoire'));
  // Sans notes : identique
  assert.deepEqual(propositionsModeles(e, { poids: { n: 0, moyenne: 0, effets: {} } }), sans);
});

test('photos : jeux aux photos bien notées tirés plus souvent, galerie ordonnée, retirées enlevées', () => {
  const u = (n: string) => `/photos/${n}.webp`;
  const jeux = [
    { id: 'a', specialite: 'sport', source: 'banque' as const, siteId: null, actif: true, photos: { accueil: u('sport-course'), panorama: '', galerie: [], soins: {} } },
    { id: 'b', specialite: 'sport', source: 'banque' as const, siteId: null, actif: true, photos: { accueil: u('sport-trail'), panorama: '', galerie: [], soins: {} } },
  ];
  assert.equal(choisirJeuPhotos(jeux, 'sport', () => 0.4), 'a', 'sans notes : tirage uniforme inchangé');
  const p = poidsAssets([...notes('photo:sport-trail', 5, 12), ...notes('photo:sport-course', 1, 12)]);
  let b = 0;
  for (let i = 0; i < 100; i++) if (choisirJeuPhotos(jeux, 'sport', () => i / 100, p) === 'b') b++;
  assert.ok(b > 70, `jeu mieux noté tiré ${b} fois sur 100`);
  const r = poidsAssets([...notes('photo:sport-trail', 5, 5), ...notes('photo:sport-lacage', 3, 5), { cle: 'photo:sport-course', statut: 'retire' }]);
  const g = [u('sport-course'), u('sport-lacage'), u('sport-trail'), u('sport-chaussure')];
  assert.deepEqual(ordonnerPhotos(g, r, 1), [u('sport-trail'), u('sport-chaussure'), u('sport-lacage')], 'notée sous la moyenne : après une photo jamais notée');
  assert.deepEqual(ordonnerPhotos(g, null), g);
  assert.equal(ordonnerPhotos([u('sport-course')], r, 1).length, 1, 'jamais vide');
  assert.deepEqual(persoDuJeuPhotos({ photos: { accueil: '', panorama: '', galerie: g, soins: {} } }, null, r)?.photos?.diaporama, [u('sport-trail'), u('sport-chaussure'), u('sport-lacage')]);
});

test('synthèse et Markdown des assets', () => {
  const l = [
    ...Array.from({ length: 4 }, () => ({ cle: 'gamme:cobalt', note: 5, etiquettes: ['parfaite'] })),
    ...Array.from({ length: 3 }, () => ({ cle: 'picto:orthonyxie', note: 1, etiquettes: ['illisible-petit'] })),
    { cle: 'photo:sport-course', note: 2, etiquettes: ['trop-stock'], commentaire: 'Trop posée | trop lisse', le: '2026-10-07T10:00:00Z' },
  ];
  const s = syntheseAssets(l, { statuts: [{ cle: 'picto:orthonyxie', statut: 'a_retravailler', commentaire: 'Trait trop fin' }, { cle: 'gamme:encre', statut: 'retire' }], titres: titresAssets() });
  assert.equal(s.total, 8);
  assert.equal(s.meilleures[0].cle, 'gamme:cobalt');
  assert.equal(s.pires[0].cle, 'picto:orthonyxie');
  assert.equal(s.parType[0].type, 'gamme');
  assert.equal(s.etiquettes[0].id, 'parfaite');
  const md = markdownAssets(s, { date: '7 octobre 2026' });
  assert.match(md, /Trait trop fin/);
  assert.match(md, /Trop posée \/ trop lisse/);
  assert.match(md, /gamme:encre/);
  assert.equal(syntheseAssets([]).total, 0);
});

test('retours : tirage prioritaire, série de jours, paliers, changements', () => {
  const c = [{ cle: 'a', empreinte: '1' }, { cle: 'b', empreinte: '2' }, { cle: 'c', empreinte: '3' }, { cle: 'd', empreinte: '4' }];
  const etats = etatsNotes([
    { cle: 'a', note: 4, empreinte: '1', le: '1' }, { cle: 'a', note: 4, empreinte: '1', le: '2' },
    { cle: 'b', note: 3, empreinte: 'x', le: '1' }, { cle: 'b', note: 3, empreinte: 'x', le: '2' },
    { cle: 'c', note: 2, empreinte: '3' },
  ]);
  assert.equal(prochaineCarte(c, etats)?.cle, 'b', 'modifié depuis la note d’abord (avant / après)');
  assert.equal(prochaineCarte(c, etats, new Set(['b']))?.cle, 'd', 'puis jamais noté');
  assert.equal(prochaineCarte(c, etats, new Set(['d', 'b']))?.cle, 'c', 'puis incertain');
  assert.equal(prochaineCarte(c, etats, new Set(['a', 'b', 'c', 'd']))?.cle !== undefined, true, 'tout vu : on recommence');
  assert.equal(prioriteAsset(undefined), 1);
  const m = new Date('2026-10-07T15:00:00Z');
  assert.deepEqual(serieAvis(['2026-10-07T08:00:00Z', '2026-10-07T09:00:00Z', '2026-10-06T09:00:00Z', '2026-10-05T09:00:00Z', '2026-10-01T09:00:00Z'], m), { aujourdhui: 2, serie: 3, jours: 4 });
  assert.equal(serieAvis(['2026-10-06T09:00:00Z'], m).serie, 1, 'hier compte encore');
  assert.equal(serieAvis([], m).serie, 0);
  assert.deepEqual(palierAvis(55), { atteint: 50, suivant: 100, reste: 45 });
  assert.equal(changementsGenerateur(null).total, 0);
  const sans = propositionsModeles(entree(['sport']));
  const poids = { n: 0, moyenne: 0, effets: {}, assets: poidsAssets([...notes('picto:x', 4, 40), ...notes(`gamme:${sans[0].gamme}`, 1, 20)]) };
  const ch = changementsGenerateur(poids);
  assert.ok(ch.total > 0 && ch.sujets.some((x) => x.sujet === 'sport' && x.ecartees.length > 0));
  assert.ok(assetsInfluents(poids).evites.some((x) => x.cle === `gamme:${sans[0].gamme}`));
});
