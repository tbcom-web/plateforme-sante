import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliquerSurfaces, cssSurfaces, lireCleSurfaces, mesurerSurfaces, PAIRES_SURFACES, ratioLisible, SURFACES, surfacesConformes, cleAssetSurfaces } from './surfaces';
import { couleursGabarit, COULEURS_EXTREMES } from './gabarits';
import { contraste } from './couleurs';
import { GAMMES } from './gammes';
import { modeleIntegre } from './modeles';
import {
  cleAssetPaire, cleImageFond, dimensionPaire, ingredientPaire, cleImageRendu, fondImageCss, lireClePaire, lireDimensionPaire, lireImageRendu, PAIRES_ELEMENTS, pairesElementsDesNotes,
  poserPaire, toutesPairesElements, varierPaire,
} from './combinaisons-elements';
import { pairesElementsDuels } from './duels-compositions';
import { DIMENSIONS_PAIRES, hasard, MODES_DUEL, uneSeuleDimension, type Duel } from './duels';
import { clePaireHarmonie, DIMENSIONS_HARMONIE, lireDimension, PAIRES_HARMONIE, violationsDures } from './harmonie';
import { compositionInitiale, compositionPourCle, estCleStudio } from './recettes';
import { inventaireStudio } from './assets';
import { categorieDeCle } from './retours';
import { appareilDimension } from './duels-appareils';
import { repereCle, repereDimension, repereSurfaces } from './reperes';

const palettes = () => ['tableau', 'village', 'revue'].flatMap((m) => [...GAMMES.map((g) => ({ couleur: g.accent, gamme: g.id })), ...COULEURS_EXTREMES.map((c) => ({ couleur: c, gamme: null }))].map((choix) => couleursGabarit(modeleIntegre(m), choix)));

test('surfaces : règle dure AA — toute répartition proposée est conforme, sur toutes les palettes et tous les gabarits', () => {
  let proposees = 0;
  for (const c of palettes()) {
    for (const id of surfacesConformes(c)) {
      proposees++;
      const y = appliquerSurfaces(c, id);
      for (const [t, f, min] of PAIRES_SURFACES) assert.ok(contraste(y[t]!, y[f]!) >= min, `${id} ${t}/${f}`);
    }
  }
  assert.ok(proposees > 200, `trop peu de répartitions conformes : ${proposees}`);
});

test('surfaces : seule la répartition change, ratio lisible, CSS limité aux variables touchées, clés', () => {
  const c = couleursGabarit(modeleIntegre('tableau'), { couleur: GAMMES[0].accent, gamme: GAMMES[0].id });
  const b = appliquerSurfaces(c, 'blanc');
  assert.equal(b.page, '#ffffff');
  assert.equal(b.encre, c.encre);
  const css = cssSurfaces(c, 'texte-franc');
  assert.match(css, /^\.ap\{--g-encre:#[0-9a-f]{6} !important/);
  assert.ok(!css.includes('--g-page'));
  assert.equal(cssSurfaces(c, 'modele'), '');
  // Non conforme : jamais de CSS
  assert.equal(cssSurfaces({ ...c, encre: '#bbbbbb', page: '#ffffff' }, 'blanc'), '');
  assert.ok(mesurerSurfaces(appliquerSurfaces(c, 'texte-franc')).ratio > mesurerSurfaces(c).ratio);
  assert.equal(ratioLisible(7.24), '7,2:1');
  assert.equal(lireCleSurfaces(cleAssetSurfaces('teinte')), 'teinte');
  assert.equal(lireCleSurfaces('effets:surfaces-inconnu'), null);
  assert.ok(estCleStudio('effets:surfaces-teinte'));
  assert.equal(categorieDeCle({ cle: 'effets:surfaces-teinte', type: 'effets' }), 'surfaces');
  assert.ok(inventaireStudio().some((a) => a.cle === 'effets:surfaces-accent-plein'));
  assert.match(repereCle('effets:surfaces-accent-plein').libelle, /surfaces « Accent plein »/);
  assert.ok(repereCle('effets:surfaces-accent-plein').selecteurs.includes('[data-zone="premier-ecran"]'));
  assert.equal(repereSurfaces(['blanc', 'modele']).ensemble, true);
  assert.ok(repereSurfaces(['texte-doux', 'blanc']).selecteurs.includes('.ap-h1'));
  assert.equal(SURFACES[0].id, 'modele');
});

test('images × fonds : clés de rendu et de combinaison (héritage base → variantes)', () => {
  const k = cleImageRendu('dessin:verrue:releve', 'fond', 'aplat');
  assert.deepEqual(lireImageRendu(k), { cle: 'dessin:verrue:releve', axe: 'fond', id: 'aplat' });
  assert.match(cleImageFond('dessin:verrue:releve', 'fond', 'aplat'), /^image:.+&surface:aplat$/);
  assert.match(cleImageFond('photo:sport-course', 'traitement', 'nb'), /^image:photo:sport-course&traitement:nb$/);
  assert.match(fondImageCss('degrade', { fond: '#ffffff', fondDoux: '#eeeeee', accent: '#2d5bff' }), /^linear-gradient/);
  assert.equal(appareilDimension('image:fond'), 'les-deux');
  assert.equal(appareilDimension('surfaces'), 'les-deux');
  assert.ok(!repereDimension('image:fond').libelle.includes(':'));
});

test('combinaisons d’éléments : paires = celles des duels, clés apprises compatibles avec les recettes complètes', () => {
  const dims = PAIRES_ELEMENTS.map(([a, b]) => dimensionPaire(a, b));
  for (const d of dims) assert.ok(DIMENSIONS_PAIRES.includes(d), d);
  assert.deepEqual(MODES_DUEL.find((m) => m.id === 'combinaisons')!.dimensions, DIMENSIONS_PAIRES);
  // Paires déjà lues par les tirages harmonieux (les autres sont apprises, lues une fois ajoutées à PAIRES_HARMONIE)
  assert.ok(PAIRES_ELEMENTS.filter(([a, b]) => PAIRES_HARMONIE.some(([x, y]) => x === a && y === b)).length >= 2);
  assert.deepEqual(lireDimensionPaire('paire:menu_ordinateur:police'), ['menu.ordinateur', 'police']);
  for (const d of DIMENSIONS_PAIRES) assert.match(d, /^[a-z0-9:_-]{1,60}$/);
  const tout = toutesPairesElements();
  assert.ok(tout.length > 50 && new Set(tout.map((x) => x.cle)).size === tout.length);
  const k = tout[0].cle;
  assert.ok(lireClePaire(k) && estCleStudio(k));
  assert.equal(categorieDeCle({ cle: k, type: 'composant' }), 'combinaisons');
  const p = lireClePaire(k)!;
  const x = compositionPourCle(compositionInitiale({ sujets: ['sport'], principaux: 1, couleursPreferees: [] }, 3), k);
  assert.equal(lireDimension(x, p.a), p.va);
  assert.equal(lireDimension(poserPaire(x, k), p.b), p.vb);
  assert.match(repereCle(k).libelle, /^la combinaison /);
  assert.deepEqual(pairesElementsDesNotes({ [k]: 2 }), { [clePaireHarmonie(p.a, p.va, p.b, p.vb)]: 0.5 });
});

test('combinaisons : variantes où les deux éléments changent, eux seuls, sans nouvelle règle dure ; apprentissage', () => {
  let ok = 0;
  for (const s of ['sport', 'diabete', 'enfant']) for (let g = 1; g <= 4; g++) {
    const base = compositionInitiale({ sujets: [s], principaux: 1, couleursPreferees: [] }, g * 7);
    for (const [a, b] of PAIRES_ELEMENTS) {
      const y = varierPaire(base, a, b, hasard(g * 31));
      if (y === base) continue;
      const changees = DIMENSIONS_HARMONIE.filter((d) => lireDimension(y, d) !== lireDimension(base, d));
      assert.deepEqual([...changees].sort(), [a, b].sort());
      const avant = new Set(violationsDures(base).map((v) => v.code));
      assert.ok(violationsDures(y).every((v) => avant.has(v.code)));
      assert.ok(uneSeuleDimension(base, y, dimensionPaire(a, b)));
      ok++;
    }
  }
  assert.ok(ok > 20, `trop peu de variantes : ${ok}`);
  const base = compositionInitiale({ sujets: ['sport'], principaux: 1, couleursPreferees: [] }, 5);
  const [a, b] = PAIRES_ELEMENTS[2];
  const y = varierPaire(base, a, b, hasard(9));
  const d = (resultat: Duel['resultat']): Duel => ({ type: 'theme', scenario: { sujets: ['sport'] }, aCle: 'compo:a', bCle: 'compo:b', aIngredients: { composition: base }, bIngredients: { composition: y }, dimension: dimensionPaire(a, b), resultat });
  // Sans composition (duels_apprentissage) : la clé portée par les ingrédients atelier
  const sans = (resultat: Duel['resultat']): Duel => ({ ...d(resultat), aIngredients: { atelier: [ingredientPaire(base, a, b)!] }, bIngredients: { atelier: [ingredientPaire(y, a, b)!] } });
  const r = pairesElementsDuels([d('a'), d('a')]);
  assert.deepEqual(pairesElementsDuels([sans('a'), sans('a')]), r);
  const ka = clePaireHarmonie(a, lireDimension(base, a)!, b, lireDimension(base, b)!);
  assert.ok(r[ka] > 0 && Object.values(r).every((v) => Math.abs(v) <= 0.5));
});

test('réglages fins (espacements, ombres, arrondis…) : un élément de détails à la fois, densité jugée au téléphone', async () => {
  const { varierDuel } = await import('./duels-compositions');
  const { habillageDe } = await import('./recettes');
  const { blocFocal } = await import('./focal');
  const m = MODES_DUEL.find((x) => x.id === 'details-fins')!;
  assert.deepEqual(m.dimensions, ['details:densite', 'details:ombres', 'details:coins', 'details:boutons', 'details:cadre']);
  assert.equal(appareilDimension('details:densite'), 'mobile');
  assert.equal(appareilDimension('details:ombres'), 'les-deux');
  let ok = 0;
  for (let g = 1; g <= 10; g++) {
    const c = { sujets: ['sport'], principaux: 1, couleursPreferees: [] as string[] };
    const x = compositionInitiale(c, g * 3);
    for (const d of m.dimensions) {
      assert.ok(blocFocal(d), d);
      assert.ok(!repereDimension(d).libelle.includes(':'));
      const y = varierDuel(x, d, c, g);
      if (y === x) continue;
      assert.ok(uneSeuleDimension(x, y, d), d);
      const e = d.slice(8);
      assert.notEqual((habillageDe(y).details as Record<string, string>)[e], (habillageDe(x).details as Record<string, string>)[e]);
      ok++;
    }
  }
  assert.ok(ok > 15, `trop peu : ${ok}`);
});

test('tuile « Images × fonds » : clés, inventaire (une image par base), apprentissage', async () => {
  const { inventaireImagesFonds, lireCleImageFond, cleAssetImageFond, imagesFondsDesNotes, cleImageFond: cif } = await import('./combinaisons-elements');
  const { inventaireAssets } = await import('./assets');
  const { baseDeCle } = await import('./bases-illustrations');
  const inv = inventaireImagesFonds(inventaireAssets({ photosJeux: [] }));
  assert.ok(inv.length > 20 && new Set(inv.map((a) => a.cle)).size === inv.length);
  for (const a of inv.slice(0, 40)) {
    const x = lireCleImageFond(a.cle)!;
    assert.ok(x && estCleStudio(a.cle));
    assert.equal(categorieDeCle(a), 'images-fonds');
    assert.equal(baseDeCle(a.cle), null);
  }
  const k = cleAssetImageFond('dessin:verrue:releve', 'aplat');
  assert.deepEqual(lireCleImageFond(k), { cle: 'dessin:verrue:releve', fond: 'aplat' });
  assert.equal(lireCleImageFond('effets:image@inconnu:dessin:x'), null);
  assert.deepEqual(imagesFondsDesNotes({ [k]: 2 }), { [cif('dessin:verrue:releve', 'fond', 'aplat')]: 0.5 });
});

test('« Vous notez » de la tuile Images × fonds', () => {
  assert.equal(repereCle('effets:image@aplat:dessin:verrue:releve', 'Verrue sur aplat d’accent').libelle, 'l’image « Verrue » sur le fond « Aplat d’accent »');
});
