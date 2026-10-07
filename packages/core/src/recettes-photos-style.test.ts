// Studio de recettes, retours de Paul du 2026-10-07 : photos de la bibliothèque (sources, statut importé / non importé, sujets
// effectifs, hashtags) et sélecteur explicite du style des illustrations (permis, raisons, appliqué et sérialisé).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerRecette, banquePhotos, choisirStyle, compositionInitiale, normaliserComposition, photosAImporter, photosCompatibles, photosDuScenario, photosImportees,
  photosIntegreesBanque, serialiserComposition, stylesDuStudio, tirerDimension, tirerPhotos, alea, type ContexteRecette, type EntreeBanquePhotos,
} from './recettes';
import { draftVide, normaliserDraft } from './draft';
import { registreModele } from './modeles';
import { reglageStyle, STYLES_ILLUSTRATION } from './propositions';

const STOCK = 'https://exemple.supabase.co/storage/v1/object/public/photos/';
const PEXELS = 'https://images.pexels.com/photos/123/pexels-photo-123.jpeg?auto=compress&w=640';
const PIXABAY = 'https://cdn.pixabay.com/photo/2026/01/01/pied-456_640.jpg';
const ctx = (sujets: string[], extra: Partial<ContexteRecette> = {}): ContexteRecette => ({ sujets, principaux: Math.min(3, sujets.length), ...extra });

const entrees: EntreeBanquePhotos[] = [
  { url: `${STOCK}jeux/enfant/a.webp`, origine: 'jeu', sujets: ['enfant'] },
  { url: `${STOCK}banque/libres/sport/pexels-1-640.webp`, origine: 'libre', sujets: ['sport'], idLibre: 'l1', source: 'pexels' },
  { url: PEXELS, origine: 'libre', sujets: ['sport'], importee: false, cle: 'photo:libre:pexels-123', idLibre: 'l2', source: 'pexels' },
  { url: PIXABAY, origine: 'libre', sujets: ['diabete'], importee: false, cle: 'photo:libre:pixabay-456', idLibre: 'l3', source: 'pixabay' },
  { url: `${STOCK}banque/libres/ongles/pexels-9-640.webp`, origine: 'libre', sujets: ['ongles'] },
];

test('banque : sujets effectifs (ajouts, retraits de Paul) et hashtags qui nomment un sujet', () => {
  const b = banquePhotos(entrees, {
    surcharges: { 'photo:jeux/enfant/a.webp': { ajouts: ['sport'], retraits: [] }, 'photo:banque/libres/ongles/pexels-9-640.webp': { ajouts: [], retraits: ['ongles'] } },
    hashtags: { 'photo:libre:pixabay-456': ['senior', 'pied-sec'] },
  });
  const de = (u: string) => b.find((p) => p.url === u);
  assert.deepEqual(de(`${STOCK}jeux/enfant/a.webp`)?.sujets, ['sport', 'enfant'], 'sujet ajouté par Paul');
  assert.equal(de(`${STOCK}banque/libres/ongles/pexels-9-640.webp`), undefined, 'plus aucun sujet effectif : hors de la banque');
  assert.deepEqual(de(PIXABAY)?.sujets, ['diabete', 'senior'], '#senior nomme un sujet ; #pied-sec non');
  assert.equal(de(PEXELS)?.importee, false);
  assert.equal(de(PEXELS)?.idLibre, 'l2');
  assert.equal(de(`${STOCK}banque/libres/sport/pexels-1-640.webp`)?.importee, undefined, 'importée : pas de marque');
  // Doublon : l'importée gagne
  const d = banquePhotos([{ url: PEXELS, origine: 'libre', sujets: ['sport'], importee: false }, { url: PEXELS, origine: 'libre', sujets: ['sport'] }]);
  assert.equal(d.length, 1);
  assert.equal(d[0].importee, undefined);
});

test('photos non importées : tirées dans le studio seulement, comptées à part', () => {
  const pool = banquePhotos([...entrees, ...photosIntegreesBanque().map((p) => ({ url: p.url, origine: 'integree' as const, sujets: p.sujets }))]);
  const hors = photosCompatibles(pool, ctx(['sport'], { photos: pool }));
  assert.ok(hors.every((x) => x.p.importee !== false), 'atelier, parcours : jamais de photo non importée');
  assert.ok(hors.some((x) => x.p.url.includes('banque/libres/sport')), 'photo libre importée du sujet incluse');
  assert.ok(!hors.some((x) => x.p.url.includes('jeux/enfant')), 'photo d’un autre sujet exclue');
  const studio = photosCompatibles(pool, ctx(['sport'], { photos: pool, nonImportees: true }));
  assert.ok(studio.some((x) => x.p.url === PEXELS), 'studio : la photo gardée non importée peut sortir');
  assert.ok(!studio.some((x) => x.p.url === PIXABAY), 'filtrée par sujet');
  const n = photosDuScenario(ctx(['sport'], { photos: pool }));
  assert.ok(n.importees.length >= 2);
  assert.deepEqual(n.nonImportees.map((p) => p.url), [PEXELS]);
  assert.ok([...n.importees, ...n.nonImportees].every((p) => !/posture/.test(p.url)));
  // Tirages : sans le studio, jamais d'aperçu ; dans le studio, déterministes
  for (let g = 0; g < 40; g++) assert.ok(!tirerPhotos(ctx(['sport'], { photos: pool }), alea(g, 'p'), 8).includes(PEXELS));
  const c = ctx(['sport'], { photos: pool, nonImportees: true });
  assert.deepEqual(tirerPhotos(c, alea(3, 'p'), 8), tirerPhotos(c, alea(3, 'p'), 8));
  assert.ok(Array.from({ length: 30 }, (_, g) => tirerPhotos(c, alea(g, 'p'), 3)).some((l) => l.includes(PEXELS)), 'la photo non importée sort parfois');
  assert.deepEqual(n.bibliotheque.map((p) => p.url), [`${STOCK}banque/libres/sport/pexels-1-640.webp`], 'bibliothèque : importées du sujet, hors photos intégrées');
  // Zéro photo importée pour un sujet (photos intégrées et générales mises à part) : le studio le dit (compteur à 0)
  const diab = photosDuScenario(ctx(['diabete'], { photos: pool }));
  assert.equal(diab.bibliotheque.length, 0);
  assert.ok(diab.importees.length > 0, 'les photos intégrées restent utilisables');
});

test('notes : une photo mieux notée pèse plus, une photo retirée sort', () => {
  const pool = banquePhotos(entrees);
  const cle = 'photo:banque/libres/sport/pexels-1-640.webp';
  const poids = { n: 1, moyenne: 3, effets: {}, assets: { n: 3, moyenne: 3, effets: { [cle]: 1.5 }, statuts: {} } };
  const l = photosCompatibles(pool, ctx(['sport'], { photos: pool, poids }));
  const sans = photosCompatibles(pool, ctx(['sport'], { photos: pool }));
  assert.ok(l.find((x) => x.p.url.endsWith('pexels-1-640.webp'))!.masse > sans.find((x) => x.p.url.endsWith('pexels-1-640.webp'))!.masse);
  const retire = { ...poids, assets: { ...poids.assets, statuts: { [cle]: 'retire' as const } } };
  assert.ok(!photosCompatibles(pool, ctx(['sport'], { photos: pool, poids: retire })).some((x) => x.p.url.endsWith('pexels-1-640.webp')));
});

test('recette avec photo non importée : enregistrée telle quelle, jamais posée sur un site', () => {
  const c = ctx(['sport']);
  const x = choisirStyle(compositionInitiale(c), 'photos', c);
  const avec = { ...x, photos: [`${STOCK}banque/libres/sport/pexels-1-640.webp`, PEXELS] };
  const relue = normaliserComposition(JSON.parse(serialiserComposition(avec)), c)!;
  assert.deepEqual(relue.photos, avec.photos, 'aperçu Pexels gardé dans la recette (avertissement du studio)');
  assert.deepEqual(photosAImporter(relue.photos), [PEXELS]);
  assert.deepEqual(photosImportees(relue.photos), [`${STOCK}banque/libres/sport/pexels-1-640.webp`]);
  assert.deepEqual(normaliserComposition({ ...JSON.parse(serialiserComposition(avec)), photos: ['https://ailleurs.example/x.jpg', 'javascript:alert(1)'] }, c)!.photos, [], 'autres hôtes refusés');
  const d = draftVide();
  d.priorites = { principaux: ['sport'], secondaires: [] };
  const site = appliquerRecette(d, relue)!;
  assert.deepEqual(site.draft.theme.photosRecette, [`${STOCK}banque/libres/sport/pexels-1-640.webp`], 'site : photos importées seulement');
  const studio = appliquerRecette(d, relue, { photosNonImportees: true })!;
  assert.ok(studio.draft.theme.photosRecette?.includes(PEXELS), 'aperçu du studio : la photo non importée est montrée');
  assert.ok(!normaliserDraft(studio.draft).theme.photosRecette?.includes(PEXELS), 'et un brouillon enregistré la retire quand même');
});

test('style : sélecteur explicite, incompatibilités expliquées, choix refusé s’il est grisé', () => {
  const sport = ctx(['sport']);
  const tech = stylesDuStudio(sport, 'technique-precis');
  assert.deepEqual(tech.filter((s) => s.permis).map((s) => s.id), ['releve', 'photos']);
  assert.match(tech.find((s) => s.id === 'ligne')!.raison!, /Technique et précis.*Relevé ou Photos seulement/);
  assert.ok(stylesDuStudio(sport, 'clair-pratique').every((s) => s.permis));
  const diab = stylesDuStudio(ctx(['diabete']), 'simple-proche');
  assert.match(diab.find((s) => s.id === 'releve')!.raison!, /Diabète/);
  const x = compositionInitiale(sport);
  const t = { ...x, structure: 'technique-precis' as const, visuels: { ...x.visuels, style: 'releve' as const } };
  assert.equal(choisirStyle(t, 'ligne', sport), t, 'grisé : rien ne change');
  const p = choisirStyle(t, 'photos', sport, 4);
  assert.equal(p.visuels.style, 'photos');
  assert.ok(p.photos.length > 0, 'passage aux photos : photos tirées aussitôt');
  assert.equal(choisirStyle(p, 'releve', sport).photos.length, 0, 'retour aux illustrations : plus de photos');
  // Les dés gardent le style verrouillé hors de leur dimension
  assert.equal(tirerDimension(p, 'polices', sport, 9).visuels.style, 'photos');
});

test('style : appliqué à tout le site (registre, style visuel) et sérialisé dans la recette', () => {
  const c = ctx(['sport']);
  for (const structure of ['clair-pratique', 'technique-precis'] as const) {
    for (const style of STYLES_ILLUSTRATION) {
      const base = compositionInitiale(c);
      const x = choisirStyle({ ...base, structure }, style, c, 2);
      if (!stylesDuStudio(c, structure).find((s) => s.id === style)!.permis) { assert.notEqual(x.visuels.style, style); continue; }
      assert.equal(x.visuels.style, style);
      const relue = normaliserComposition(JSON.parse(serialiserComposition(x)), c)!;
      assert.equal(relue.visuels.style, style, `${structure} ${style} : relu`);
      assert.match(serialiserComposition(x), new RegExp(`"style":"${style}"`));
      const d = draftVide();
      d.priorites = { principaux: ['sport'], secondaires: [] };
      const r = appliquerRecette(d, relue)!;
      const attendu = reglageStyle(style, structure);
      assert.equal(r.draft.theme.styleIllustration, style);
      assert.equal(r.draft.theme.modeVisuel, attendu.modeVisuel);
      assert.equal(r.draft.theme.registre, attendu.registre);
      // Le modèle du site (toutes les pages : héros, soins, pages sujet, fiches, articles) porte le registre du style
      assert.equal(registreModele(r.modele), attendu.registre, `${structure} ${style} : registre du modèle`);
      const n = normaliserDraft(r.draft);
      assert.equal(n.theme.modeVisuel, attendu.modeVisuel, 'le brouillon enregistré garde le style visuel');
      assert.equal(n.theme.registre, attendu.registre);
    }
  }
});
