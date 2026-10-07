import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {
  alea, appliquerRecette, appliquerRenforts, clesRecette, compositionInitiale, controlerComposition, couleurLibreValide, estRougeVif, normaliserComposition,
  nomRecette, photosIntegreesBanque, propositionDeRecette, recetteDepuisLigne, recettesPourScenario, renfortsPoids, RENFORT, resumeRenforts, sectionsSelonOrdre,
  serialiserComposition, sourcesRecettes, tirerPage, clesStructure, estCleStudio, tirerDimension, tirerPhotos, toutChanger, DIMENSIONS_RECETTE, type ContexteRecette, type CompositionRecette, type Recette,
} from './recettes';
import { cssEffets, cssSurvolSimule, JEUX_EFFETS } from './effets';
import { cssFormes, FORMES_CARTES } from './formes';
import { modeleDuSite, universCatalogue } from './catalogue-univers';
import { estCleAsset } from './assets-poids';
import { gabaritModele, modeleIntegre, PAIRES_POLICES, varianteSujets, POLICES_TITRES, POLICES_TEXTE } from './modeles';
import { draftVide, normaliserDraft } from './draft';
import { gamme } from './gammes';
import { bonusAtelier, poidsAtelier, cleCombinaison, ingredientsCanoniques } from './atelier-poids';
import { scoreAsset } from './assets-poids';

const ctx = (sujets: string[], couleurs: string[] = []): ContexteRecette => ({ sujets, principaux: Math.min(3, sujets.length), couleursPreferees: couleurs });

test('tirage déterministe par graine, et un dé change sa dimension seulement', () => {
  const c = ctx(['sport', 'ongles']);
  const x = compositionInitiale(c);
  for (const d of DIMENSIONS_RECETTE) {
    const a = tirerDimension(x, d.id, c, 42);
    const b = tirerDimension(x, d.id, c, 42);
    assert.deepEqual(a, b, `dé ${d.id} déterministe`);
  }
  const p = tirerDimension(x, 'polices', c, 7);
  assert.notEqual(p.police, x.police, 'le dé des polices change la paire');
  assert.equal(p.structure, x.structure);
  assert.equal(p.gamme, x.gamme);
  assert.deepEqual(p.sections, x.sections);
  const e = tirerDimension(x, 'effets', c, 3);
  assert.notEqual(e.effets, x.effets);
  assert.equal(e.police, x.police);
});

test('verrous : « tout changer » ne touche jamais une dimension verrouillée', () => {
  const c = ctx(['enfant']);
  let x = compositionInitiale(c);
  for (let g = 1; g < 40; g++) {
    const y = toutChanger(x, ['polices', 'structure'], c, g);
    assert.equal(y.police, x.police);
    assert.equal(y.structure, x.structure);
    assert.deepEqual(y.sections, x.sections);
    x = { ...y };
  }
  // Sans verrou, sur plusieurs graines, chaque dimension finit par changer
  const z = compositionInitiale(c);
  const tirs = Array.from({ length: 20 }, (_, g) => toutChanger(z, [], c, g + 100));
  assert.ok(tirs.some((t) => t.police !== z.police) && tirs.some((t) => t.structure !== z.structure) && tirs.some((t) => t.effets !== z.effets));
});

test('garde-fous : diabète sans rouge vif ni relevé ni Technique ; posture jamais ; AA', () => {
  const c = ctx(['diabete', 'posture', 'senior'], ['rouge', 'corail']);
  let x = compositionInitiale(c);
  for (let g = 0; g < 300; g++) {
    x = toutChanger(x, [], c, g);
    assert.deepEqual(controlerComposition(x, c), [], `graine ${g} : ${controlerComposition(x, c).join(' ')}`);
    assert.notEqual(x.structure, 'technique-precis');
    assert.notEqual(x.visuels.style, 'releve');
    assert.ok(!['pasteque', 'corail', 'corail-nuit', 'pistache'].includes(x.gamme));
    if (!x.gamme) assert.ok(!estRougeVif(x.couleur));
    assert.notEqual(x.visuels.herosSujet, 'posture');
    assert.ok(!x.photos.some((u) => /posture/.test(u)));
  }
  assert.equal(couleurLibreValide('#e10600', c, 'clair-pratique'), false, 'rouge vif refusé avec le diabète');
  assert.equal(couleurLibreValide('#fff3a0', ctx(['sport']), 'technique-precis'), false, 'jaune pâle : contraste insuffisant en classique');
});

test('garde-fous AA sur 200 tirages de couleurs (couleurs libres comprises)', () => {
  const c = ctx(['sport', 'semelles']);
  let x = compositionInitiale(c);
  let libres = 0;
  for (let g = 0; g < 200; g++) {
    x = tirerDimension(x, g % 3 ? 'couleurs' : 'structure', c, g);
    if (!x.gamme) libres++;
    assert.deepEqual(controlerComposition(x, c), []);
  }
  assert.ok(libres > 0, 'des couleurs libres sont tirées');
});

test('photos : banque compatible avec les sujets, sans posture, tirage déterministe, seulement en style photos', () => {
  const c = ctx(['sport']);
  const a = tirerPhotos(c, alea(5, 'p'));
  assert.deepEqual(a, tirerPhotos(c, alea(5, 'p')));
  assert.ok(a.length >= 3 && a.every((u) => !/posture|enfant/.test(u)));
  assert.ok(photosIntegreesBanque().every((p) => !p.url.includes('posture')));
  const x = compositionInitiale(c);
  const y = { ...x, visuels: { ...x.visuels, style: 'photos' as const } };
  const z = tirerDimension(y, 'photos', c, 9);
  assert.ok(z.photos.length > 0);
  const w = tirerDimension({ ...z, visuels: { ...z.visuels, style: 'ligne' } }, 'polices', c, 1);
  assert.deepEqual(w.photos, [], 'hors style photos : aucune photo');
});

test('sérialisation et relecture d’une recette', () => {
  const c = ctx(['ongles']);
  const x = toutChanger(compositionInitiale(c), [], c, 11);
  const json = serialiserComposition(x);
  const relue = normaliserComposition(JSON.parse(json), c);
  assert.deepEqual(relue, x);
  const r = recetteDepuisLigne({ id: '1b4e28ba-2fa1-11d2-883f-0016d3cca427', nom: '', sujets: ['ongles'], couleurs_preferees: [], composition: JSON.parse(json), note: 5, etiquettes: ['waouh'], statut: 'active' })!;
  assert.equal(r.nom, nomRecette(x, ['ongles']));
  assert.equal(normaliserComposition({ structure: 'inconnue' }, c), null);
  // Composition reçue hors garde-fous : remise dans les règles
  const forcee = normaliserComposition({ ...JSON.parse(json), structure: 'technique-precis', visuels: { style: 'releve' }, gamme: 'pasteque' }, ctx(['diabete']))!;
  assert.deepEqual(controlerComposition(forcee, ctx(['diabete'])), []);
});

test('ordre des sections : permutation (SEO : même ensemble), « infos en tête »', () => {
  const base = modeleIntegre('tableau').accueil.sections;
  for (const o of ['modele', 'infos-haut', 'soins-puis-infos', 'equipe-haut', 'questions-haut'] as const) {
    const { sections } = sectionsSelonOrdre(base, o);
    assert.deepEqual([...sections].sort(), [...base].sort(), o);
  }
  const h = sectionsSelonOrdre(base, 'infos-haut');
  assert.equal(h.sections[0], 'acces');
  assert.equal(h.infosEnTete, true);
});

test('application au brouillon, rétrocompatible, et modèle effectif (police, variantes, ordre)', () => {
  const d = normaliserDraft({ ...draftVide(), priorites: { principaux: ['sport', 'enfant'], secondaires: [] } });
  const c = ctx(['sport', 'enfant']);
  const x: CompositionRecette = {
    ...compositionInitiale(c), structure: 'elegant-sobre', gamme: '', couleur: '#1f6a64', police: 'ronde',
    sections: { ordre: 'infos-haut', variantes: { sujets: 'liste', horaires: 'bandeau', soins: 'grille' } }, effets: 'vivant',
    visuels: { style: 'ligne', herosSujet: 'enfant', animation: null },
  };
  const r = appliquerRecette(d, x, { id: '1b4e28ba-2fa1-11d2-883f-0016d3cca427' })!;
  const t = r.draft.theme;
  assert.equal(t.modele, 'revue');
  assert.equal(t.gamme, '');
  assert.equal(t.couleur, '#1f6a64');
  assert.equal(t.police, 'ronde');
  assert.equal(t.infosEnTete, true);
  assert.equal(t.herosSujet, 'enfant');
  assert.equal(t.effets, 'vivant');
  assert.equal(r.modele.jetons.policeTitres, 'nunito');
  assert.equal(r.modele.accueil.sections[0], 'acces');
  assert.equal(r.modele.accueil.infosEnTete, true);
  assert.equal(r.modele.variantes?.horaires, 'bandeau');
  assert.equal(varianteSujets(r.modele), 'liste');
  // Relecture du brouillon (base) : champs conservés ; valeurs inconnues retirées
  const relu = normaliserDraft(JSON.parse(JSON.stringify(r.draft)));
  assert.deepEqual(relu.theme.variantes, t.variantes);
  const sale = normaliserDraft({ ...r.draft, theme: { ...r.draft.theme, police: 'comic', variantes: { soins: 'x', horaires: 'carte' }, effets: 'clignotant', photosRecette: ['javascript:alert(1)', '/photos/sport-course.webp'], recette: 'x y' } });
  assert.equal(sale.theme.police, undefined);
  assert.deepEqual(sale.theme.variantes, { horaires: 'carte' });
  assert.equal(sale.theme.effets, undefined);
  assert.deepEqual(sale.theme.photosRecette, ['/photos/sport-course.webp']);
  assert.equal(sale.theme.recette, undefined);
  // Brouillon ancien : modèle inchangé
  const ancien = normaliserDraft({ ...draftVide() });
  assert.deepEqual(modeleDuSite(modeleIntegre('tableau'), ancien.theme), modeleIntegre('tableau'));
  // Classique : seule la présentation des sujets s'applique
  const tech = modeleDuSite(modeleIntegre('technique'), { variantes: { sujets: 'cartes', horaires: 'bandeau' } });
  assert.deepEqual(tech.variantes, { sujets: 'cartes' });
});

test('paires de polices : polices installées, 2 familles au plus', () => {
  assert.ok(PAIRES_POLICES.length >= 6 && PAIRES_POLICES.length <= 10);
  for (const p of PAIRES_POLICES) {
    assert.ok((POLICES_TITRES as readonly string[]).includes(p.titres) && (POLICES_TEXTE as readonly string[]).includes(p.texte));
    assert.ok(new Set([p.titres, p.texte]).size <= 2);
  }
});

test('effets : CSS seul, mouvement sous prefers-reduced-motion, apparition en amélioration progressive, < 3 Ko gzip', () => {
  const tout = JEUX_EFFETS.map((j) => cssEffets(j.id)).join('');
  assert.ok(gzipSync(tout).length < 3072, `${gzipSync(tout).length} octets gzip`);
  for (const j of JEUX_EFFETS) {
    const css = cssEffets(j.id);
    assert.ok(!/<script|javascript:/i.test(css));
    // Aucun état caché hors @supports (animation-timeline) : contenu toujours visible sans prise en charge
    const horsSupports = css.replace(/@supports \(animation-timeline:view\(\)\)\{@media \(prefers-reduced-motion:no-preference\)\{.*\}\}/s, '');
    assert.ok(!/opacity:0[;}]/.test(horsSupports.replace(/::after\{[^}]*\}/g, '')), `${j.id} : opacité nulle hors amélioration progressive`);
    // Mouvements : transform / opacity / filter / background-size seulement (aucune propriété de mise en page animée)
    for (const m of css.matchAll(/transition:([^;}]+)/g)) assert.match(m[1], /^(transform|opacity|filter|background-size)\b/);
  }
  assert.equal(cssEffets('inconnu'), '');
});

test('renforts : une recette 5★ fait monter chacun de ses ingrédients, sans écraser les notes ; plafond', () => {
  const c = ctx(['sport']);
  const x = { ...compositionInitiale(c), gamme: 'cobalt', couleur: gamme('cobalt')!.accent, police: 'grotesque' as const, visuels: { style: 'photos' as const, herosSujet: 'sport', animation: null }, photos: ['/photos/sport-course.webp'] };
  const r: Recette = { id: 'a', nom: 'Essai', sujets: ['sport'], couleursPreferees: [], composition: x, note: 5, etiquettes: [], statut: 'active' };
  const k = clesRecette(x, ['sport']);
  assert.ok(k.assets.includes('gamme:cobalt') && k.assets.includes('photo:sport-course') && k.atelier.includes('police=grotesque'));
  const ren = renfortsPoids(sourcesRecettes([r]));
  for (const cle of k.assets) assert.ok(ren.assets[cle] > 0, cle);
  for (const cle of k.atelier) assert.ok(ren.atelier[cle] > 0, cle);
  // Une seule recette : effet modéré (0,4 × 2 / (4 + 0,4) ≈ 0,18 sur un asset)
  assert.ok(ren.assets['gamme:cobalt'] < 0.25);
  // Plafond : 100 recettes 5★ ne dépassent pas 0,75
  const beaucoup = renfortsPoids(sourcesRecettes(Array.from({ length: 100 }, (_, i) => ({ ...r, id: String(i) }))));
  assert.equal(beaucoup.assets['gamme:cobalt'], RENFORT.plafond);
  // Notes individuelles conservées : les effets s'ajoutent
  const notesIndiv = { n: 10, moyenne: 3, effets: {}, assets: { n: 5, moyenne: 3, effets: { 'gamme:cobalt': -0.5 }, statuts: {} } };
  const p = appliquerRenforts(notesIndiv, ren)!;
  assert.ok(Math.abs(p.assets!.effets['gamme:cobalt'] - (-0.5 + ren.assets['gamme:cobalt'])) < 1e-9);
  assert.ok(scoreAsset('gamme:cobalt', p.assets) > -0.5);
  // Une recette 1★ affaiblit
  const mal = renfortsPoids(sourcesRecettes([{ ...r, note: 1 }]));
  assert.ok(mal.assets['gamme:cobalt'] < 0);
  // Les propositions en tiennent compte (bonus des combinaisons de la gamme renforcée)
  const pa = appliquerRenforts(poidsAtelier([]), ren);
  assert.ok(bonusAtelier({ structure: x.structure, gamme: 'cobalt', style: 'photos', animation: null, theme1: 'sport' }, pa) > 0);
  assert.match(resumeRenforts([r])[0], /Recette « Essai » validée \(5★\) : renforce gamme Cobalt.*photo sport-course/);
});

test('recettes du parcours : actives, bien notées, du sujet n° 1, en premier', () => {
  const c = ctx(['sport']);
  const x = compositionInitiale(c);
  const l: Recette[] = [
    { id: 'a', nom: 'A', sujets: ['sport'], couleursPreferees: [], composition: x, note: 5, etiquettes: [], statut: 'active' },
    { id: 'b', nom: 'B', sujets: ['sport'], couleursPreferees: [], composition: x, note: 3, etiquettes: [], statut: 'active' },
    { id: 'c', nom: 'C', sujets: ['sport'], couleursPreferees: [], composition: x, note: 5, etiquettes: [], statut: 'archivee' },
    { id: 'd', nom: 'D', sujets: ['enfant'], couleursPreferees: [], composition: x, note: 5, etiquettes: [], statut: 'active' },
  ];
  assert.deepEqual(recettesPourScenario(l, ['sport', 'ongles']).map((r) => r.id), ['a']);
  const p = propositionDeRecette(l[0]);
  assert.equal(p.id, 'recette~a');
  assert.equal(p.univers, x.structure);
});

test('photos dans les ingrédients de l’atelier : clé inchangée sans photo', () => {
  const sans = ingredientsCanoniques({ structure: 'clair-pratique', gamme: 'cobalt', proposition: 'x' });
  assert.equal(sans.photos, undefined);
  const avec = ingredientsCanoniques({ structure: 'clair-pratique', gamme: 'cobalt', proposition: 'x', photos: ['photo:sport-course', 'pas une clé'] });
  assert.deepEqual(avec.photos, ['photo:sport-course']);
  assert.notEqual(cleCombinaison(sans), cleCombinaison(avec));
  assert.equal(cleCombinaison({ structure: 'clair-pratique', gamme: 'cobalt', proposition: 'x', photos: [] }), cleCombinaison(sans));
});

test('dé par type de page et par élément : seules leurs variantes changent ; clés notables', () => {
  const c = ctx(['sport']);
  const x = toutChanger({ ...compositionInitiale(c), structure: 'clair-pratique' }, ['structure'], c, 4);
  const base = { ...x, structure: 'clair-pratique' as const };
  const y = tirerPage(base, { page: 'acces' }, c, 8);
  assert.equal(y.structure, base.structure);
  assert.equal(y.sections.ordre, base.sections.ordre);
  for (const s of ['accueil', 'sujets', 'soins', 'praticiens', 'galerie', 'faq'] as const) assert.equal(y.sections.variantes[s], base.sections.variantes[s], s);
  const z = tirerPage(base, { composant: 'horaires' }, c, 9);
  assert.notEqual(z.sections.variantes.horaires, base.sections.variantes.horaires);
  assert.equal(z.sections.variantes.infos, base.sections.variantes.infos);
  const k = clesStructure(z);
  assert.ok(k.some((x) => x.startsWith('structure:acces:')) && k.includes(`composant:horaires:${z.sections.variantes.horaires}`) && k.includes(`effets:${z.effets}`));
  for (const cle of k) assert.ok(estCleAsset(cle), cle);
  // Verrou d'un élément respecté par « tout changer » (structure non verrouillée)
  for (let g = 0; g < 30; g++) {
    const w = toutChanger(base, ['composant:horaires'], c, g);
    if (gabaritModele(modeleIntegre(universCatalogue(w.structure)!.preReglage.modele)) !== 'classique') assert.equal(w.sections.variantes.horaires, base.sections.variantes.horaires);
  }
});

test('clés notables du studio : bien formées et connues', () => {
  const c = ctx(['sport']);
  for (let g = 0; g < 20; g++) for (const k of clesStructure(toutChanger(compositionInitiale(c), [], c, g))) assert.ok(estCleStudio(k), k);
  assert.ok(!estCleStudio('composant:horaires:inconnu'));
  assert.ok(!estCleStudio('effets:clignotant'));
  assert.ok(!estCleStudio('structure:acces:x'));
});

test('formes des cartes : CSS seul, sans image, texte des tuiles lisible (vif / vif-texte), indépendantes de la disposition', () => {
  for (const f of FORMES_CARTES) {
    const css = cssFormes(f.id);
    if (f.id === 'gabarit') { assert.equal(css, ''); continue; }
    assert.ok(css.length > 0 && !/url\(|<script/i.test(css), f.id);
    assert.ok(gzipSync(css).length < 600, `${f.id} : ${gzipSync(css).length} o`);
  }
  assert.match(cssFormes('tuiles'), /var\(--g-vif-texte/);
  const c = ctx(['sport']);
  const x = tirerPage({ ...compositionInitiale(c), structure: 'clair-pratique' }, { composant: 'soins-forme' }, c, 3);
  assert.ok(x.sections.variantes['soins-forme']);
  assert.equal(modeleDuSite(modeleIntegre('technique'), { variantes: { 'soins-forme': 'tuiles' } }).variantes?.['soins-forme'], 'tuiles');
});

test('effets : démonstration du survol (aperçu) sans :hover, racine data-survol', () => {
  for (const id of ['doux', 'vivant', 'editorial'] as const) {
    const css = cssSurvolSimule(id);
    assert.ok(css.includes('[data-survol]') && !css.includes(':hover'), id);
  }
  assert.equal(cssSurvolSimule('inconnu'), '');
});
