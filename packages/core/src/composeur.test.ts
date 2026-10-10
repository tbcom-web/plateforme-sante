// Composeur (composeur.ts) : règles dures jamais violées, éléments refusés jamais tirés, diversité, profil mixte (une ambiance, un
// ton par thème), déterminisme, manques listés, sélection des éléments 4-5 ★.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleProfilComposeur, composer, DISTANCE_MIN, dimensionDeCle, elementBon, elementRefuse, famillesDuProfil, nomProfilComposeur, profilComposeurDepuisCle,
  propositionsDistinctes, repartitionCandidats, type EntreeComposeur, type ProfilComposeur,
} from './composeur';
import { violationsDures, type ContexteHarmonie } from './harmonie';
import { elementsComposition, type NotesElements } from './qualite';
import { controlerComposition, estRougeVif, photosIntegreesBanque, type ContexteRecette } from './recettes';
import { modeleIntegre } from './modeles';
import { gamme } from './gammes';

const NOTES: NotesElements = {
  'gamme:ardoise': { m: 5, n: 3 }, 'gamme:menthe': { m: 4.5, n: 2 }, 'gamme:sauge': { m: 4, n: 2 }, 'gamme:cobalt': { m: 4, n: 1 }, 'gamme:lavande': { m: 4.5, n: 2 },
  'gamme:tournesol': { m: 4, n: 1 }, 'gamme:cobalt-abricot': { m: 1, n: 2 },
  'typo:police:humaniste': { m: 4.5, n: 2 }, 'typo:police:grotesque': { m: 4, n: 2 }, 'typo:police:publique': { m: 4, n: 1 }, 'typo:police:ronde': { m: 1, n: 3 },
  'typo:echelle:modeste': { m: 1.5, n: 2 }, 'typo:echelle:affirmee': { m: 4, n: 2 },
  'effets:sobre': { m: 4, n: 2 }, 'effets:doux': { m: 4.5, n: 2 },
  'composant:accueil:carte': { m: 4, n: 2 }, 'composant:accueil:notice': { m: 4.5, n: 1 }, 'composant:accueil:figure': { m: 1, n: 1 },
};
const ctx = (poids: NotesElements = NOTES): EntreeComposeur['contexte'] => ({ poids: { n: 1, moyenne: 3, effets: {}, notesElements: poids }, photos: photosIntegreesBanque(), modele: modeleIntegre, modeTirage: 'favoris' });
const SPORT_DIABETE: ProfilComposeur = { nom: 'Sport + Diabète', principaux: ['sport'], secondaires: ['diabete'], activites: ['course'] };
const entree = (p: ProfilComposeur, extra: Partial<EntreeComposeur> = {}): EntreeComposeur => ({ profil: p, contexte: ctx(), candidats: 48, n: 6, graine: 7, ...extra });
const contexteDe = (sujets: string[]): ContexteRecette => ({ ...ctx(), sujets });

// Un seul calcul par profil pour tous les tests (le composeur tire des dizaines de compositions)
const rSD = composer(entree(SPORT_DIABETE, {
  tranches: { refuses: new Set(['composant:accueil:bento', 'typo:police:serif-fine']), favoris: new Set(['details:jeu:classique-sobre']) },
  images: [{ sujet: 'sport', activite: 'course', illustration: 'dessin:sport-course:pedagogique', photos: ['/photos/sport-foulee.webp'], icone: 'picto:course', animation: 'il-foulee' }, { sujet: 'diabete', illustration: null, photos: [], icone: 'picto:diabete', animation: 'il-pouls' }],
}));

test('profil : clé stable, relecture, nom', () => {
  assert.equal(cleProfilComposeur(SPORT_DIABETE), 'sport+diabete~course');
  assert.deepEqual(profilComposeurDepuisCle('sport+diabete~course'), { principaux: ['sport'], secondaires: ['diabete'], activites: ['course'] });
  // Thème différé (posture) ou inconnu : ignoré
  assert.deepEqual(profilComposeurDepuisCle('posture+enfant+inconnu').principaux, ['enfant']);
  assert.equal(nomProfilComposeur({ principaux: ['senior'], secondaires: ['ongles'] }), 'Seniors + Ongles');
});

test('ambiance : le diabète fait reculer les familles vives du sport sans les supprimer', () => {
  const seul = famillesDuProfil(['sport']);
  const mixte = famillesDuProfil(['sport', 'diabete']);
  const p = (l: typeof seul, id: string) => l.find((f) => f.id === id)!.poids;
  assert.ok(p(mixte, 'graphique-pop') < p(seul, 'graphique-pop'));
  assert.ok(p(mixte, 'classique-sobre') > p(seul, 'classique-sobre'));
  assert.ok(p(mixte, 'graphique-pop') > 0);
  // Répartition : chaque famille admise a au moins 4 candidats, les mieux placées davantage
  const r = repartitionCandidats(mixte, 240);
  assert.ok(r.every((x) => x.n >= 4));
  assert.ok(r[0].n >= r[r.length - 1].n);
});

test('règles dures et garde-fous jamais violés (sport + diabète : ni rouge vif, ni relevé, ni Technique, ni « Vivant »)', () => {
  assert.ok(rSD.propositions.length >= 3, `propositions : ${rSD.propositions.length}`);
  const c = contexteDe(['sport', 'diabete']);
  for (const p of rSD.propositions) {
    assert.deepEqual(violationsDures(p.x as never, c as unknown as ContexteHarmonie).map((v) => v.code), []);
    assert.deepEqual(controlerComposition(p.x, c), []);
    assert.ok(!estRougeVif(p.x.gamme ? gamme(p.x.gamme)!.accent : p.x.couleur));
    assert.notEqual(p.x.visuels.style, 'releve');
    assert.notEqual(p.x.structure, 'technique-precis');
    assert.notEqual(p.x.effets, 'vivant');
  }
});

test('éléments refusés (1 ★, ≤ 2,5 ★, tranchés) jamais tirés', () => {
  const o = { notes: NOTES, tranches: { refuses: new Set(['composant:accueil:bento', 'typo:police:serif-fine']) } };
  assert.ok(elementRefuse('gamme:cobalt-abricot', o) && elementRefuse('composant:accueil:bento', o) && !elementRefuse('gamme:ardoise', o));
  for (const p of rSD.propositions) {
    const els = elementsComposition(p.x, ['sport', 'diabete']);
    for (const k of ['gamme:cobalt-abricot', 'typo:police:ronde', 'typo:echelle:modeste', 'composant:accueil:figure', 'composant:accueil:bento', 'typo:police:serif-fine']) assert.ok(!els.includes(k), `${k} tiré`);
  }
  assert.equal(rSD.stats.admis + Object.values(rSD.stats.ecartes).reduce((s, v) => s + v, 0), rSD.stats.candidats);
});

test('sélection : les éléments 4-5 ★, favoris ou validés sont bons ; les autres sont des replis signalés', () => {
  assert.ok(elementBon('gamme:ardoise', { notes: NOTES }));
  assert.ok(elementBon('details:jeu:classique-sobre', { tranches: { favoris: new Set(['details:jeu:classique-sobre']) } }));
  assert.ok(elementBon('composant:accueil:x', { valides: new Set(['composant:accueil:x']) }));
  assert.ok(!elementBon('gamme:pasteque', { notes: NOTES }));
  assert.deepEqual(dimensionDeCle('typo:police:grotesque'), { dim: 'police', v: 'grotesque', prefixe: 'typo:police:' });
  assert.deepEqual(dimensionDeCle('effets:photos-mat-grain'), { dim: 'traitement', v: 'mat', grain: true, prefixe: 'effets:photos-' });
  assert.equal(dimensionDeCle('modele:clair-pratique'), null);
  for (const p of rSD.propositions) {
    const els = elementsComposition(p.x, ['sport', 'diabete']);
    assert.equal(p.qualite.total, els.length);
    assert.equal(p.qualite.bons + p.replis.length, p.qualite.total);
    // Une palette notée 4-5 ★ compatible existe toujours ici : jamais une palette de repli
    if (p.x.gamme) assert.ok(!p.replis.includes(`gamme:${p.x.gamme}`), `palette de repli ${p.x.gamme}`);
  }
});

test('diversité : jamais deux propositions quasi identiques, palettes variées', () => {
  const l = rSD.propositions;
  assert.equal(new Set(l.map((p) => p.cle)).size, l.length);
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) assert.ok(propositionsDistinctes(l[i].x, l[j].x), `propositions ${i} et ${j} trop proches`);
  const palettes = new Map<string, number>();
  for (const p of l) palettes.set(p.x.gamme || p.x.couleur, (palettes.get(p.x.gamme || p.x.couleur) ?? 0) + 1);
  assert.ok([...palettes.values()].every((n) => n <= 3));
  assert.ok(DISTANCE_MIN.dimensions >= 2);
  // Meilleure d'abord
  assert.deepEqual(l.map((p) => p.score), [...l.map((p) => p.score)].sort((a, b) => b - a));
});

test('profil mixte : une ambiance pour tout le site, un ton par page (énergie du sport, calme du diabète sans animation)', () => {
  const pages = rSD.propositions[0].pages;
  assert.deepEqual(pages.map((p) => [p.sujet, p.ton]), [['sport', 'energie'], ['diabete', 'calme']]);
  assert.equal(pages[0].animation, 'il-foulee');
  assert.equal(pages[1].animation, null);
  assert.equal(rSD.profil.cle, 'sport+diabete~course');
  for (const p of rSD.propositions) {
    assert.match(p.pourquoi, /énergie du sport/);
    assert.match(p.pourquoi, /calme pour le diabète/);
    assert.match(p.pourquoi, /éléments 4-5 ★/);
    // Design = sans images (ce que garde la chaîne) ; composition habillée pour le profil
    assert.deepEqual(p.design.photos, []);
    assert.equal((p.design.visuels as { herosSujet: unknown }).herosSujet, null);
  }
});

test('manques listés : images absentes d’un thème, dimensions sans élément 4-5 ★', () => {
  const ids = rSD.manques.map((m) => m.id);
  assert.ok(ids.includes('image|diabete|illustration'));
  assert.ok(ids.includes('image|diabete|photo'));
  assert.ok(!ids.includes('image|sport|illustration'));
  const el = rSD.manques.filter((m) => m.type === 'element');
  assert.ok(el.length > 0);
  assert.ok(el.every((m) => m.exemple && m.frequence >= 1 && /4-5 ★/.test(m.texte)));
  // Aucune palette en manque : les palettes 4-5 ★ suffisent
  assert.ok(!el.some((m) => m.dimension === 'gamme'));
});

test('déterministe pour une graine', () => {
  const p: ProfilComposeur = { principaux: ['enfant'] };
  const a = composer(entree(p, { candidats: 24, n: 4 }));
  const b = composer(entree(p, { candidats: 24, n: 4 }));
  assert.deepEqual(a.propositions.map((x) => [x.cle, x.score]), b.propositions.map((x) => [x.cle, x.score]));
  assert.deepEqual(a.manques, b.manques);
});

test('enfant : jamais de palette exclue (encre) ; senior + ongles : effets calmes', () => {
  const enfant = composer(entree({ principaux: ['enfant'] }, { candidats: 32, n: 4 }));
  assert.ok(enfant.propositions.every((p) => p.x.gamme !== 'encre'));
  const so = composer(entree({ principaux: ['senior'], secondaires: ['ongles'] }, { candidats: 32, n: 4 }));
  const c = contexteDe(['senior', 'ongles']);
  for (const p of so.propositions) {
    assert.notEqual(p.x.effets, 'vivant');
    assert.deepEqual(violationsDures(p.x as never, c as unknown as ContexteHarmonie), []);
  }
  assert.match(so.propositions[0]?.pourquoi ?? '', /calme pour les seniors/);
});

test('style « Photos » jamais proposé sans photo dans le kit du profil', () => {
  const r = composer({ ...entree({ principaux: ['senior'] }, { candidats: 32, n: 4 }), contexte: { ...ctx(), photos: [] } });
  assert.ok(r.propositions.length > 0);
  assert.ok(r.propositions.every((p) => p.x.visuels.style !== 'photos'));
});
