// Compléter un kit d'images à partir du VIVIER CURÉ (suggestions-kits.ts, couche 1 → couche 2)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compteurKit, emplacementsAFaire, etatVivier, etiquetteKit, hashtagKit, lienTrouverPhotos, manqueVivier, MOTS_METIER, REQUETES_PAGES, REQUETES_SOINS, REQUETES_CABINET,
  refusKitDepuisLignes, requetesEmplacement, suggestionsVivier, cleRefusKit, PREFIXE_REFUS_KIT,
} from './suggestions-kits';
import { composerKit, estCuree, SUJETS_KITS, type DonneesKits } from './kits-images';
import { photosIntegreesBanque, type PhotoBanque } from './recettes';
import { clePhoto } from './assets-poids';
import { VISUELS_SOINS } from './jeux';
import { choisirRequete } from './photos-libres';

const banque = photosIntegreesBanque();
const sport = banque.filter((p) => p.sujets.includes('sport'));
const cle = (p: PhotoBanque) => clePhoto(p.url)!;
const tag = (l: readonly PhotoBanque[], sujet: string) => Object.fromEntries(l.map((p) => [cle(p), { ajouts: [sujet], retraits: [] }]));

test('dictionnaire : chaque soin du catalogue a ses requêtes, toutes du métier, jamais la posture', () => {
  for (const slug of Object.keys(VISUELS_SOINS).filter((s) => s !== 'posturologie')) assert.ok(REQUETES_SOINS[slug]?.length >= 2, slug);
  const toutes = [...Object.values(REQUETES_SOINS).flat(), ...Object.values(REQUETES_PAGES).flatMap((x) => Object.values(x).flat()), ...REQUETES_CABINET];
  for (const q of toutes) {
    assert.ok(MOTS_METIER.some((m) => q.includes(m)), `hors métier : ${q}`);
    assert.ok(!/posture|face|portrait/.test(q), q);
  }
  assert.deepEqual(requetesEmplacement('ongles', 'soin:orthonyxie').slice(0, 2), ['toenail brace', 'ingrown toenail care']);
  for (const s of SUJETS_KITS) assert.ok(requetesEmplacement(s, 'accueil').length && requetesEmplacement(s, 'page-sujet').length, s);
  const q = requetesEmplacement('ongles', 'soin:orthonyxie');
  assert.ok(Array.from({ length: 300 }, (_, i) => choisirRequete(q, { [q[0]]: 5 }, i / 300)).filter((x) => x === q[0]).length < 20);
  assert.equal(lienTrouverPhotos('enfant', 'soin:orthonyxie'), '/admin/retours?type=decouvrir&sujet=enfant&emplacement=soin%3Aorthonyxie&retour=kits');
});

test('vivier : aucune photo hors vivier (non étiquetée, retirée du sujet, exclue, ≤ 2 ★) n’est proposée ni assemblée', () => {
  const [a, b, c, e, f] = sport;
  const d: DonneesKits = {
    banque,
    surcharges: { ...tag([a, b, c, e], 'sport'), [cle(f)]: { ajouts: ['sport'], retraits: ['sport'] } },
    exclues: new Set([cle(c)]),
    notes: { [cle(e)]: { m: 2, n: 1 } },
  };
  assert.ok(estCuree(a, 'sport', d) && estCuree(b, 'sport', d));
  assert.ok(!estCuree(c, 'sport', d) && !estCuree(e, 'sport', d) && !estCuree(f, 'sport', d));
  const nonTagguee = banque.find((p) => p.sujets.includes('sport') && ![a, b, c, e, f].includes(p));
  const kit = composerKit('sport', d, 0, ['k-taping']);
  const vivier = new Set([a.url, b.url]);
  assert.ok(kit.photos.every((p) => vivier.has(p.url)), 'kit : vivier seulement');
  for (const em of ['accueil', 'page-sujet', 'cabinet', 'soin:k-taping']) {
    for (const s of suggestionsVivier({ ...kit, photos: [] }, em, d, new Set(), 50)) {
      assert.ok(vivier.has(s.url), `${em} : ${s.url} hors vivier`);
      if (nonTagguee) assert.notEqual(s.url, nonTagguee.url);
    }
  }
});

test('ordre : ≥ 4 ★ étiquetée pour l’emplacement, puis ≥ 3,5 ★, puis non notées, puis < 3,5 ★ ; voisin seulement si rien', () => {
  const [a, b, c, e] = sport;
  const d: DonneesKits = {
    banque,
    surcharges: tag([a, b, c, e], 'sport'),
    hashtags: { [cle(c)]: ['cabinet'] },
    notes: { [cle(a)]: { m: 4.5, n: 2 }, [cle(b)]: { m: 2.5, n: 1 }, [cle(c)]: { m: 4.5, n: 1 } },
  };
  const kit = { ...composerKit('sport', d), photos: [] };
  const l = suggestionsVivier(kit, 'cabinet', d);
  assert.deepEqual(l.map((s) => s.rang), [1, 2, 3, 4]);
  assert.equal(l[0].url, c.url);
  assert.equal(l[1].url, a.url);
  assert.equal(l[2].url, e.url);
  assert.equal(l[3].url, b.url);
  // Sujet sans vivier : vivier du voisin, signalé
  const enfant = banque.filter((p) => p.sujets.includes('general')).slice(0, 2);
  const d2: DonneesKits = { banque, surcharges: tag(enfant, 'general') };
  const v = suggestionsVivier({ ...composerKit('enfant', d2), photos: [] }, 'cabinet', d2);
  assert.ok(v.length && v.every((s) => s.rang === 5 && s.voisin === 'general' && /Sujet voisin/.test(s.libelle)));
  // Manque et état
  assert.equal(manqueVivier('sport', 'soin:orthonyxie', d), 'Vivier Sport : 4 photos curées, aucune pour orthonyxie');
  assert.equal(manqueVivier('sport', 'cabinet', d), null);
  assert.match(etatVivier(composerKit('sport', d), d, []).texte, /^Sport : 4 photos curées · 2 notées ≥ 4 ★ · 1 non notée · emplacements couverts \d\/6$/);
});

test('notation en ligne : une note ≤ 2 ★ sort la photo du vivier, ≥ 4 ★ la fait monter ; « Pas pour ici » mémorisé', () => {
  const [a, b] = sport;
  const base: DonneesKits = { banque, surcharges: tag([a, b], 'sport') };
  const kit = { ...composerKit('sport', base), photos: [] };
  assert.equal(suggestionsVivier(kit, 'page-sujet', base).find((s) => s.url === a.url)?.rang, 3);
  const apres1 = { ...base, notes: { [cle(a)]: { m: 1, n: 1 } } };
  assert.ok(!suggestionsVivier(kit, 'page-sujet', apres1).some((s) => s.url === a.url));
  const apres5 = { ...base, notes: { [cle(a)]: { m: 5, n: 1 } } };
  assert.equal(suggestionsVivier(kit, 'page-sujet', apres5)[0].url, a.url);
  const refus = refusKitDepuisLignes([{ contexte: 'photos', nature: 'hashtag', valeur: 'page-sujet', decision: 'refusee', raison: `${PREFIXE_REFUS_KIT}${cle(a)}` }]);
  assert.ok(refus.has(cleRefusKit('page-sujet', cle(a))));
  assert.ok(!suggestionsVivier(kit, 'page-sujet', base, refus).some((s) => s.url === a.url));
  assert.ok(suggestionsVivier(kit, 'cabinet', base, refus).some((s) => s.url === a.url), 'ailleurs : toujours proposée');
});

test('gardée non importée : proposée avec « Importer et utiliser », jamais assemblée telle quelle', () => {
  const candidate: PhotoBanque = { url: 'https://images.pexels.com/photos/1/a.jpeg', sujets: ['sport'], origine: 'libre', importee: false, cle: 'photo:libre:pexels-1', idLibre: 'id-1' };
  const d: DonneesKits = { banque: [candidate], surcharges: { 'photo:libre:pexels-1': { ajouts: ['sport'], retraits: [] } } };
  const kit = composerKit('sport', d);
  assert.equal(kit.photos.length, 0);
  const s = suggestionsVivier(kit, 'accueil', d);
  assert.equal(s[0].aImporter, true);
  assert.equal(s[0].idLibre, 'id-1');
});

test('emplacements à compléter, compteur, étiquette des photos gardées pour un kit', () => {
  const enfant = banque.filter((p) => p.sujets.includes('enfant'));
  const d: DonneesKits = { banque, surcharges: tag(enfant, 'enfant'), notes: Object.fromEntries(enfant.slice(0, 2).map((p) => [cle(p), { m: 4.5, n: 2 }])) };
  const kit = composerKit('enfant', d, 0, ['podologie-enfant', 'orthonyxie']);
  const af = emplacementsAFaire(kit, ['podologie-enfant', 'orthonyxie']);
  assert.ok(af.some((e) => e.emplacement === 'soin:orthonyxie' && e.raison === 'vide'));
  assert.ok(!af.some((e) => e.emplacement === 'accueil'));
  assert.match(compteurKit(kit, ['podologie-enfant', 'orthonyxie']).texte, /^Kit Enfants : \d\/8 emplacements avec une photo ≥ 4 ★$/);
  assert.equal(hashtagKit('enfant'), 'kit-enfant');
  assert.equal(etiquetteKit(['kit-enfant', 'orthonyxie'])?.libelle, 'pour le kit Enfants · orthonyxie');
  assert.equal(etiquetteKit(['sport']), null);
});
