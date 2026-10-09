// Tests des profils de pratique (profils.ts, pratiques.ts) et de la publication des recettes (publication-recettes.ts).
// Lancer : node packages/core/scripts/tests.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRATIQUES, PRATIQUE_PODOLOGUE, controlerPratique, pratiqueDe, type PratiqueProfession } from './pratiques';
import {
  activitesProposees, badgeConcuPour, basculerActivite, combinerProfils, jaugeProfil, kitDuProfil, meilleursProfils, normaliserActivites, profilDepuisReponses,
  profilParId, profilsDePratique, proximiteProfils, questionActivites, soinsEnAvantActivites, visuelsDeLActivite,
} from './profils';
import { profilsCiblesParDefaut, publicationDepuisLigne, recettesPourPraticien, recettesPubliees, verifierPublicationRecette, type PublicationRecette } from './publication-recettes';
import { compositionInitiale, type Recette } from './recettes';
import { INGREDIENTS_A_VALIDER } from './heros-photo-variantes';
import type { DonneesVisuels } from './kits-visuels';
import { normaliserScenario } from './simulateur';

test('pratique des pédicures-podologues : données cohérentes, 12 profils de référence, aucun thème différé', () => {
  assert.deepEqual(controlerPratique(PRATIQUE_PODOLOGUE), []);
  const ids = profilsDePratique('podologue').map((p) => p.id);
  for (const id of ['sport-course', 'sport-basket', 'sport-foot', 'sport-tennis', 'sport-rando', 'diabete', 'enfant', 'enfant-danse', 'senior', 'ongles', 'semelles', 'generaliste']) assert.ok(ids.includes(id), id);
  assert.ok(profilsDePratique().every((p) => p.principal !== 'posture'));
  // Slug inconnu : profession par défaut
  assert.equal(pratiqueDe('inconnue').profession, 'podologue');
});

test('activités : proposées seulement pour les thèmes qui s’y prêtent, 3 au plus, ordre gardé', () => {
  const p = PRATIQUE_PODOLOGUE;
  assert.equal(questionActivites(p, ['diabete', 'ongles']), false);
  assert.equal(questionActivites(p, ['sport']), true);
  assert.ok(activitesProposees(p, ['enfant']).some((a) => a.id === 'danse'));
  assert.ok(!activitesProposees(p, ['enfant']).some((a) => a.id === 'ski'));
  assert.deepEqual(normaliserActivites(p, ['tennis', 'basket', 'inconnue', 'basket', 'golf', 'ski'], ['sport']), ['tennis', 'basket', 'golf']);
  assert.deepEqual(normaliserActivites(p, ['basket'], ['diabete']), []);
  assert.deepEqual(basculerActivite(p, ['basket'], 'basket', ['sport']), []);
  assert.deepEqual(basculerActivite(p, ['basket'], 'tennis', ['sport']), ['basket', 'tennis']);
});

test('profil depuis les réponses : hashtags normalisés, badge « Conçu pour la podologie du sport · basket »', () => {
  const x = profilDepuisReponses({ principaux: ['sport', 'diabete'], activites: ['basket'] });
  assert.equal(x.principal, 'sport');
  assert.deepEqual(x.secondaires, ['diabete']);
  assert.deepEqual(x.hashtags, ['sport', 'diabete', 'basket', 'basketball']);
  assert.equal(badgeConcuPour(profilParId('sport-basket')!), 'Conçu pour la podologie du sport · basket');
  assert.equal(x.id, 'sport~basket+diabete');
});

test('matching : « sport, surtout basket, diabétique » → Sport·basket puis Diabète (combinaison)', () => {
  const r = meilleursProfils({ principaux: ['sport', 'diabete'], activites: ['basket'] });
  assert.deepEqual(r.map((x) => x.profil.id).slice(0, 2), ['sport-basket', 'diabete']);
  assert.ok(r[0].score > r[1].score);
  // Un profil d'une autre activité du même thème passe après le profil exact
  const client = profilDepuisReponses({ principaux: ['sport'], activites: ['basket'] });
  assert.ok(proximiteProfils(client, profilParId('sport-basket')!) > proximiteProfils(client, profilParId('sport-foot')!));
  // Coureur : Sport·course ; enfant danseur : Enfant·danse avant Enfant
  assert.equal(meilleursProfils({ principaux: ['sport'], activites: ['course'] })[0].profil.id, 'sport-course');
  assert.equal(meilleursProfils({ principaux: ['enfant'], activites: ['danse'] })[0].profil.id, 'enfant-danse');
  // Sans thème : généraliste
  assert.equal(meilleursProfils({ principaux: [] })[0].profil.id, 'generaliste');
  // Combinaison explicite
  const c = combinerProfils([profilParId('sport-basket')!, profilParId('diabete')!])!;
  assert.deepEqual([c.principal, c.secondaires, c.activites], ['sport', ['diabete'], ['basket']]);
});

test('soins mis en avant : ordre de l’activité, seulement parmi les soins cochés', () => {
  const coches = ['douleur-talon', 'k-taping', 'podologie-du-sport', 'ongle-incarne'];
  assert.deepEqual(soinsEnAvantActivites(PRATIQUE_PODOLOGUE, ['basket'], coches, ['ongle-incarne']), ['podologie-du-sport', 'k-taping', 'douleur-talon']);
  assert.deepEqual(soinsEnAvantActivites(PRATIQUE_PODOLOGUE, [], coches, ['ongle-incarne']), ['ongle-incarne']);
});

// ---- Kit du profil et repli ----

const visuels = (statutBasket: string): DonneesVisuels => ({
  visuels: [
    { cle: 'ligne:sport-basket', type: 'ligne', soins: [] },
    { cle: 'dessin:sport:pedagogique', type: 'dessin', soins: [] },
    { cle: 'picto:sport-basket', type: 'picto', soins: [] },
  ],
  hashtags: { 'ligne:sport-basket': ['sport', 'basket'], 'dessin:sport:pedagogique': ['sport'], 'picto:sport-basket': ['sport', 'basket'] },
  statuts: { 'ligne:sport-basket': statutBasket as 'valide', 'dessin:sport:pedagogique': 'valide', 'picto:sport-basket': 'a_revoir' },
  notes: { 'ligne:sport-basket': { m: 4.5, n: 2 }, 'dessin:sport:pedagogique': { m: 4, n: 1 } },
});

test('kit du profil : visuels de l’activité validés pour le praticien ; à valider jamais montrés', () => {
  const profil = profilParId('sport-basket')!;
  const k = kitDuProfil(profil, { visuels: visuels('valide') }, { praticien: true });
  const basket = k.activites[0];
  assert.equal(basket.hashtag, 'basket');
  assert.deepEqual(basket.familles.illustration.map((e) => e.cle), ['ligne:sport-basket']);
  assert.deepEqual(basket.familles.icone, []);
  const v = visuelsDeLActivite(k, 'basket');
  assert.equal(v.repli, false);
  assert.equal(v.illustration, 'ligne:sport-basket');
});

test('repli : activité sans visuel validé → kit générique du thème (sport)', () => {
  const profil = profilParId('sport-basket')!;
  const k = kitDuProfil(profil, { visuels: visuels('a_revoir') }, { praticien: true });
  assert.deepEqual(k.replis, ['basket']);
  const v = visuelsDeLActivite(k, 'basket');
  assert.equal(v.repli, true);
  assert.equal(v.illustration, 'dessin:sport:pedagogique');
  // Côté admin (non praticien) : l'élément à valider est montré et compte comme trou de la jauge
  const ka = kitDuProfil(profil, { visuels: visuels('a_revoir') });
  const j = jaugeProfil(profil, ka, { gardees: 0, publiees: 0, qualite: null });
  assert.ok(j.trous.some((t) => t.texte === 'Pas d’animation #basket'));
  assert.ok(j.trous.some((t) => t.texte.startsWith('Aucune photo #basket notée ≥ 4 ★')));
  assert.ok(j.trous.some((t) => t.texte.includes('1 à valider')));
  assert.ok(j.trous.every((t) => t.actions.some((a) => a.libelle === 'Dégustation de ce profil')));
  assert.ok(j.trous.find((t) => t.famille === 'photo')!.actions[0].href.includes('activite%3Abasket'));
  assert.ok(j.pourcent >= 0 && j.pourcent < 100);
});

// ---- Publication ----

const recette = (id: string, sujets: string[], note = 5, modif?: (r: Recette) => void): Recette => {
  const composition = compositionInitiale({ sujets, principaux: sujets.length }, 3);
  composition.photos = [];
  const r: Recette = { id, nom: id, sujets, couleursPreferees: [], scenario: normaliserScenario({ principaux: sujets }), composition, note, etiquettes: ['gardee'], statut: 'active' };
  modif?.(r);
  return r;
};

test('publication refusée si un élément n’est pas validé ; liste de ce qu’il faut valider, avec un lien par élément', () => {
  const entete = [...INGREDIENTS_A_VALIDER].find((k) => k.startsWith('composant:entete-anim:'))!;
  const r = recette('r1', ['sport'], 5, (x) => { x.composition.sections.variantes = { ...x.composition.sections.variantes, 'entete-anim': entete.split(':')[2] as never }; x.composition.photos = ['https://images.pexels.com/photos/1/a.jpg']; });
  const v = verifierPublicationRecette(r);
  assert.equal(v.ok, false);
  assert.ok(v.bloquants.some((b) => b.cle === entete && b.raison === 'a-valider' && b.href === `/admin/retours?cle=${encodeURIComponent(entete)}`));
  assert.ok(v.bloquants.some((b) => b.raison === 'non-importee'));
  // Validé par Paul (valides) et photo retirée : publiable
  const r2 = recette('r2', ['sport'], 5, (x) => { x.composition.sections.variantes = { ...x.composition.sections.variantes, 'entete-anim': entete.split(':')[2] as never }; });
  assert.equal(verifierPublicationRecette(r2, { valides: new Set([entete]) }).ok, true);
  // Statut « à revoir » d'un élément de la recette : bloquant
  const cle = verifierPublicationRecette(r2, { valides: new Set([entete]) }).verifies > 0 ? `modele:${r2.composition.structure}` : '';
  assert.equal(verifierPublicationRecette(r2, { valides: new Set([entete]), statuts: { [cle]: 'a_revoir' } }).ok, false);
  assert.equal(verifierPublicationRecette(r2, { valides: new Set([entete]), exclues: new Set([cle]) }).bloquants[0].raison, 'exclu');
});

test('profils pré-cochés d’après le scénario ; lecture des lignes de publication', () => {
  assert.deepEqual(profilsCiblesParDefaut({ principaux: ['diabete'], secondaires: [] }), ['diabete']);
  assert.ok(profilsCiblesParDefaut({ principaux: ['sport'], secondaires: [] }).includes('sport-basket'));
  assert.deepEqual(profilsCiblesParDefaut({ principaux: ['sport'], secondaires: [], activites: ['basket'] }), ['sport-basket']);
  assert.equal(publicationDepuisLigne({ recette: 'x', profils: [] }), null);
  assert.deepEqual(publicationDepuisLigne({ recette: 'x', profession: 'podologue', profils: ['sport-basket', 'Mauvais'], ordre: 2, publiee: true }), { recette: 'x', profession: 'podologue', profils: ['sport-basket'], ordre: 2, publiee: true, publieeLe: null });
});

test('ordre des recettes dans /creer : publiées des profils proches d’abord (badge), ordre manuel, puis les autres', () => {
  const rs = [recette('a', ['sport'], 5), recette('b', ['sport'], 4), recette('c', ['diabete'], 5), recette('d', ['sport'], 5), recette('e', ['ongles'], 3)];
  const pubs: PublicationRecette[] = [
    { recette: 'b', profession: 'podologue', profils: ['sport-basket'], ordre: 1, publiee: true },
    { recette: 'd', profession: 'podologue', profils: ['sport-basket'], ordre: 2, publiee: true },
    { recette: 'c', profession: 'podologue', profils: ['diabete'], ordre: null, publiee: true },
    { recette: 'e', profession: 'podologue', profils: ['ongles'], ordre: null, publiee: true },
    { recette: 'a', profession: 'podologue', profils: ['sport-foot'], ordre: null, publiee: false },
  ];
  const l = recettesPourPraticien({ reponses: { principaux: ['sport', 'diabete'], activites: ['basket'] }, recettes: rs, publications: pubs, scenario: normaliserScenario({ principaux: ['sport', 'diabete'] }) });
  assert.deepEqual(l.filter((x) => x.publiee).map((x) => x.recette.id), ['b', 'd', 'c']);
  assert.equal(l[0].badge, 'Conçu pour la podologie du sport · basket');
  assert.equal(l[2].badge, 'Conçu pour le pied diabétique');
  // Puis les autres (a : dépubliée, revient dans l'ordre normal) ; jamais deux fois la même ; e (ongles, 3 ★) jamais
  assert.ok(l.slice(3).some((x) => x.recette.id === 'a' && !x.publiee));
  assert.equal(new Set(l.map((x) => x.recette.id)).size, l.length);
  assert.ok(!l.some((x) => x.recette.id === 'e'));
  assert.deepEqual(recettesPubliees(profilParId('sport-basket')!, rs, pubs).map((r) => r.id), ['b', 'd']);
});

// ---- Un second métier, fictif, passe par toute la chaîne sans modification de code ----

const KINE: PratiqueProfession = {
  profession: 'kinesitherapeute',
  vocabulaire: { metier: 'kinésithérapeute', discipline: 'kinésithérapie', generaliste: 'un cabinet de kinésithérapie' },
  themes: [
    { id: 'dos', libelle: 'Mal de dos', court: 'Dos', sujetVisuel: 'dos', pour: 'le mal de dos', actif: true, soins: ['lombalgie'] },
    { id: 'sport-kine', libelle: 'Rééducation du sportif', court: 'Sport', sujetVisuel: 'sport-kine', pour: 'la kinésithérapie du sport', actif: true, soins: ['entorse'] },
  ],
  activites: [{ id: 'basket', libelle: 'Basket', court: 'basket', hashtags: ['basket'], themes: ['sport-kine'], soins: ['entorse'], requetes: ['basketball court'], precision: 'basket' }],
  publics: [],
  profils: [
    { id: 'dos', court: 'Dos', principal: 'dos', secondaires: [], activites: [], publics: [] },
    { id: 'sport-basket', court: 'Sport · basket', principal: 'sport-kine', secondaires: [], activites: ['basket'], publics: [] },
  ],
};
const REGISTRE = [...PRATIQUES, KINE];

test('métier fictif (kinésithérapeute, 2 thèmes) : profils, matching, kit, publication et ordre /creer sans code spécifique', () => {
  assert.deepEqual(controlerPratique(KINE), []);
  assert.deepEqual(profilsDePratique('kinesitherapeute', REGISTRE).map((p) => p.id), ['dos', 'sport-basket']);
  const r = meilleursProfils({ profession: 'kinesitherapeute', principaux: ['sport-kine', 'dos'], activites: ['basket'] }, { registre: REGISTRE });
  assert.deepEqual(r.map((x) => x.profil.id), ['sport-basket', 'dos']);
  assert.equal(badgeConcuPour(r[0].profil), 'Conçu pour la kinésithérapie du sport · basket');
  // Le profil podologue « sport-basket » ne sert jamais un kiné (profession différente)
  assert.ok(r.every((x) => x.profil.profession === 'kinesitherapeute'));
  const k = kitDuProfil(r[0].profil, { visuels: { visuels: [{ cle: 'dessin:entorse:pedagogique', type: 'dessin', soins: [] }], hashtags: { 'dessin:entorse:pedagogique': ['sport-kine', 'basket'] }, statuts: { 'dessin:entorse:pedagogique': 'valide' } } }, { praticien: true, registre: REGISTRE });
  assert.equal(k.sujet, 'sport-kine');
  assert.equal(visuelsDeLActivite(k).illustration, 'dessin:entorse:pedagogique');
  const rs = [recette('k1', [], 5), recette('p1', ['sport'], 5)];
  const pubs: PublicationRecette[] = [
    { recette: 'k1', profession: 'kinesitherapeute', profils: ['sport-basket'], ordre: null, publiee: true },
    { recette: 'p1', profession: 'podologue', profils: ['sport-basket'], ordre: null, publiee: true },
  ];
  const l = recettesPourPraticien({ reponses: { profession: 'kinesitherapeute', principaux: ['sport-kine'], activites: ['basket'] }, recettes: rs, publications: pubs, scenario: normaliserScenario({}), registre: REGISTRE });
  assert.equal(l[0].recette.id, 'k1');
  assert.ok(!l.some((x) => x.recette.id === 'p1' && x.publiee));
  assert.deepEqual(profilsCiblesParDefaut({ principaux: ['dos'], secondaires: [] }, 'kinesitherapeute', REGISTRE), ['dos']);
});

test('photos de l’activité : posées seulement si validées et propres à l’activité, en style « photos »', async () => {
  const { avecPhotosActivite, tableVisuelsActivites, visuelsPourPraticien } = await import('./profils');
  const table = tableVisuelsActivites('podologue', { visuels: visuels('valide') });
  const v = visuelsPourPraticien(table, ['sport', 'diabete'], ['basket']);
  assert.equal(v?.illustration, 'ligne:sport-basket');
  assert.deepEqual(v?.photosActivite, []);
  const d = { theme: { photosRecette: ['/photos/a.webp'] } };
  assert.equal(avecPhotosActivite(d, v, true), d);
  const avec = { ...v!, photosActivite: ['https://x.supabase.co/storage/v1/object/public/photos/basket.webp'] };
  assert.deepEqual(avecPhotosActivite(d, avec, true).theme.photosRecette, ['https://x.supabase.co/storage/v1/object/public/photos/basket.webp', '/photos/a.webp']);
  assert.equal(avecPhotosActivite(d, avec, false), d);
  // Sans donnée (démo) : repli
  assert.equal(visuelsPourPraticien(tableVisuelsActivites(null, {}), ['sport'], ['basket'])?.repli, true);
});

test('« Trouver des photos pré-filtrées #basket » : recherches et hashtag de l’activité', async () => {
  const { requetesEmplacement, hashtagEmplacement } = await import('./suggestions-kits');
  assert.ok(requetesEmplacement('sport', 'activite:basket').includes('basketball shoes court'));
  assert.equal(hashtagEmplacement('activite:basket'), 'basket');
});

test('kit « course » : jamais une photo d’une autre activité (tennis tagué seulement « sport » reconnu par son nom ou sa requête)', () => {
  const U = 'https://x.supabase.co/storage/v1/object/public/photos/libres/';
  const banque = [
    { url: `${U}tennis-shoes-court-1.webp`, sujets: ['sport'], origine: 'libre' as const, cle: 'photo:libre-tennis' },
    { url: `${U}a1b2.webp`, sujets: ['sport'], origine: 'libre' as const, cle: 'photo:libre-padel', requete: 'padel court shoes' },
    { url: `${U}c3d4.webp`, sujets: ['sport'], origine: 'libre' as const, cle: 'photo:libre-course' },
    { url: `${U}e5f6.webp`, sujets: ['sport'], origine: 'libre' as const, cle: 'photo:libre-neutre' },
  ];
  const hashtags = { 'photo:libre-tennis': ['sport'], 'photo:libre-padel': ['sport'], 'photo:libre-course': ['sport', 'running'], 'photo:libre-neutre': ['sport'] };
  const profil = profilDepuisReponses({ profession: 'podologue', principaux: ['sport'], activites: ['course'] });
  const k = kitDuProfil(profil, { photos: { banque, hashtags } });
  const course = k.activites.find((a) => a.activite === 'course')!;
  assert.deepEqual(course.familles.photo.map((e) => e.cle), ['photo:libre-course']);
  assert.ok(!k.generique.photo.some((e) => /tennis|padel/.test(e.cle)), 'repli du thème sans autre activité identifiable');
  assert.deepEqual(k.generique.photo.map((e) => e.cle), ['photo:libre-neutre']);
  const v = visuelsDeLActivite(k, 'course');
  assert.ok(v.photos.every((u) => !/tennis/.test(u)));
  // Même sans photo de course : repli neutre, jamais le tennis
  const k2 = kitDuProfil(profil, { photos: { banque: banque.filter((p) => p.cle !== 'photo:libre-course'), hashtags } });
  assert.deepEqual(visuelsDeLActivite(k2, 'course').photos, [`${U}e5f6.webp`]);
});
