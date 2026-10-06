// Tests des fonctions pures du parcours guidé (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerHorairesSimplifies, appliquerUniversParcours, basculerEnAvant, basculerSoin, choisirCouleurLibre, choisirGamme, deplacerSoin,
  etapeDeReprise, gammesConseillees, horairesSimplifies, natureCouleur, normaliserCouleur, placerSoin, soinsEnAvantValides, soinsSuggeres,
  universApplicableAuParcours, universDuParcours, universRecommande, aideEtape, ETAPES_PARCOURS, UNIVERS_PARCOURS,
  jalonProgressionEssai, soinsDeBaseParcours, encouragementParcours, SOINS_SPECIALISES, SOINS_DE_BASE_MAX,
} from './parcours';
import { CATALOGUE_UNIVERS, universCatalogue, type Univers } from './catalogue-univers';
import { draftVide, type SiteDraft } from './draft';
import { modeleIntegre } from './modeles';
import { GAMMES } from './gammes';
import { couleursGabarit, verifierCouleursGabarit } from './gabarits';

const identite = (): SiteDraft => {
  const d = draftVide();
  d.cabinet = { nom: 'Cabinet des Tilleuls', ville: 'Lyon', quartier: 'Brotteaux', telephone: '04 78 00 00 00', email: 'contact@exemple.fr', communes: ['Villeurbanne'] };
  d.lieux[0] = { ...d.lieux[0], adresse: '12 rue des Tilleuls', codePostal: '69006', ville: 'Lyon' };
  d.praticiens[0] = { ...d.praticiens[0], prenom: 'Camille', nom: 'Rousseau', numeroOrdre: '123456780', photo: 'https://x/portrait.webp' };
  d.rdv = { mode: 'les_deux', outil: 'Doctolib', url: 'https://www.doctolib.fr/pedicure-podologue/lyon/camille-rousseau' };
  d.theme.logoPerso = { url: 'https://x/logo.png', complet: true };
  d.photos.accueil = 'https://x/accueil.webp';
  d.soins = ['ongle-incarne'];
  d.flux.mode = 'auto';
  return d;
};

test('les quatre modèles du parcours, dans l’ordre, y compris en brouillon', () => {
  const liste = universDuParcours();
  assert.deepEqual(liste.map((u) => u.id), [...UNIVERS_PARCOURS]);
  assert.deepEqual(liste.map((u) => u.preReglage.modele), ['tableau', 'village', 'revue', 'technique']);
});

test('un univers retiré ou hors parcours n’est jamais proposé', () => {
  const retire = CATALOGUE_UNIVERS.map((u) => (u.id === 'simple-proche' ? { ...u, statut: 'retire' as const } : u));
  assert.deepEqual(universDuParcours(retire).map((u) => u.id), ['clair-pratique', 'elegant-sobre', 'technique-precis']);
  assert.equal(universApplicableAuParcours(universCatalogue('podologie-generale')!), false);
  assert.equal(universApplicableAuParcours(universCatalogue('posture-biomecanique')!), false);
});

test('recommandation : sujet n° 1 actuel, sinon premier ; le choix enregistré ne la change pas', () => {
  const d = draftVide();
  assert.equal(universRecommande(d)?.id, 'clair-pratique');
  const avecProfil = { ...d, profil: 'prevention' };
  assert.equal(universRecommande(avecProfil)?.id, 'clair-pratique', 'le profil ne compte plus');
  const diabete = { ...d, priorites: { principaux: ['diabete'], secondaires: [] } } as typeof d;
  assert.equal(universRecommande(diabete)?.id, 'simple-proche');
  const avecChoix = { ...diabete, theme: { ...d.theme, univers: 'elegant-sobre' } };
  assert.equal(universRecommande(avecChoix)?.id, 'simple-proche', 'badge séparé « Votre choix actuel »');
});

test('application d’un modèle : identité jamais écrasée', () => {
  const avant = identite();
  for (const id of UNIVERS_PARCOURS) {
    const u = universCatalogue(id)!;
    const r = appliquerUniversParcours(structuredClone(avant), u);
    assert.deepEqual(r.erreurs, [], `${id} : ${r.erreurs.join(' ')}`);
    const d = r.draft;
    assert.deepEqual(d.cabinet, avant.cabinet);
    assert.deepEqual(d.lieux, avant.lieux);
    assert.deepEqual(d.praticiens, avant.praticiens);
    assert.deepEqual(d.rdv, avant.rdv);
    assert.deepEqual(d.photos, avant.photos);
    assert.deepEqual(d.soins, avant.soins, 'les soins cochés ne changent pas (suggestions à confirmer)');
    assert.deepEqual(d.theme.logoPerso, avant.theme.logoPerso);
    assert.equal(d.flux.mode, 'auto', 'le mode de réception des articles est un consentement, pas un style');
    assert.equal(d.theme.univers, id);
    assert.equal(d.theme.modele, u.preReglage.modele);
    assert.equal(d.theme.gamme, u.preReglage.gamme);
  }
});

test('un univers en brouillon hors parcours reste refusé', () => {
  const r = appliquerUniversParcours(identite(), universCatalogue('podologie-generale')!);
  assert.ok(r.erreurs.some((e) => /n’est pas proposé/.test(e)));
});

test('changer de modèle puis revenir garde l’identité', () => {
  const avant = identite();
  const a = appliquerUniversParcours(avant, universCatalogue('elegant-sobre')!).draft;
  const b = appliquerUniversParcours(a, universCatalogue('clair-pratique')!).draft;
  assert.deepEqual(b.cabinet, avant.cabinet);
  assert.deepEqual(b.praticiens, avant.praticiens);
  assert.equal(b.theme.modele, 'tableau');
});

test('gammes conseillées : 4 au plus, dans l’ordre de la fiche', () => {
  const g = gammesConseillees(modeleIntegre('tableau'));
  assert.equal(g.length, 4);
  assert.deepEqual(g.map((x) => x.id), modeleIntegre('tableau').gammes!.slice(0, 4));
});

test('choix de couleur : gamme, couleur libre, saisie invalide', () => {
  const t = { ...draftVide().theme };
  const a = choisirGamme(t, 'mangue');
  assert.equal(a.gamme, 'mangue');
  assert.equal(a.couleur, GAMMES.find((g) => g.id === 'mangue')!.accent);
  assert.deepEqual(choisirGamme(t, 'inconnue'), t);
  const b = choisirCouleurLibre(a, 'F0A');
  assert.equal(b.gamme, '');
  assert.equal(b.couleur, '#ff00aa');
  assert.deepEqual(choisirCouleurLibre(a, 'rouge'), a);
  assert.equal(normaliserCouleur('#ABCDEF'), '#abcdef');
  assert.equal(natureCouleur(a, modeleIntegre('revue')), 'conseillee');
  assert.equal(natureCouleur({ gamme: 'canard' }, modeleIntegre('revue')), 'autre');
  assert.equal(natureCouleur(b, modeleIntegre('revue')), 'libre');
});

test('couleur libre : contraste garanti par le core sur les trois gabarits', () => {
  for (const couleur of ['#ffff00', '#00ffff', '#ff00aa', '#111111', '#f5f5f5']) {
    for (const id of ['tableau', 'village', 'revue']) {
      const m = modeleIntegre(id);
      assert.ok(couleursGabarit(m, { couleur, gamme: null }));
      assert.deepEqual(verifierCouleursGabarit(m, { couleur, gamme: null }), [], `${id} ${couleur}`);
    }
  }
});

test('soins suggérés : ceux de l’univers présents au catalogue', () => {
  const u = universCatalogue('clair-pratique')!;
  assert.deepEqual(soinsSuggeres(u, ['soins-de-pedicurie', 'ongle-incarne']), ['soins-de-pedicurie', 'ongle-incarne']);
  assert.deepEqual(soinsSuggeres(undefined, ['x']), []);
});

test('ordre des soins mis en avant : 3 au plus, cochés seulement, flèches et glisser', () => {
  const coches = ['a', 'b', 'c', 'd'];
  assert.deepEqual(soinsEnAvantValides(['a', 'z', 'b', 'a', 'c', 'd'], coches), ['a', 'b', 'c']);
  assert.deepEqual(basculerEnAvant(['a', 'b', 'c'], 'd', coches), ['a', 'b', 'c'], 'refusé au-delà de 3');
  assert.deepEqual(basculerEnAvant(['a', 'b'], 'd', coches), ['a', 'b', 'd']);
  assert.deepEqual(basculerEnAvant(['a', 'b'], 'a', coches), ['b']);
  assert.deepEqual(basculerEnAvant(['a'], 'z', coches), ['a'], 'soin non coché refusé');
  assert.deepEqual(deplacerSoin(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b']);
  assert.deepEqual(deplacerSoin(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
  assert.deepEqual(deplacerSoin(['a', 'b', 'c'], 'c', 1), ['a', 'b', 'c']);
  assert.deepEqual(placerSoin(['a', 'b', 'c'], 'c', 0), ['c', 'a', 'b']);
  assert.deepEqual(placerSoin(['a', 'b', 'c'], 'z', 0), ['a', 'b', 'c']);
});

test('cocher et décocher un soin met à jour les soins mis en avant', () => {
  let e = { soins: ['a', 'b'], enAvant: ['b', 'a'] };
  e = basculerSoin(e, 'c', true);
  assert.deepEqual(e, { soins: ['a', 'b', 'c'], enAvant: ['b', 'a', 'c'] });
  e = basculerSoin(e, 'd', true);
  assert.deepEqual(e.enAvant, ['b', 'a', 'c'], 'pas de 4e soin mis en avant');
  e = basculerSoin(e, 'b', false);
  assert.deepEqual(e, { soins: ['a', 'c', 'd'], enAvant: ['a', 'c'] });
});

test('horaires simplifiés : lecture et écriture', () => {
  const h = appliquerHorairesSimplifies(['Lundi', 'Mardi', 'Jeudi'], '8h30–18h00');
  assert.equal(h.length, 7);
  assert.equal(h[0].heures, '8h30–18h00');
  assert.equal(h[2].heures, 'Fermé');
  assert.deepEqual(horairesSimplifies(h), { jours: ['Lundi', 'Mardi', 'Jeudi'], heures: '8h30–18h00', uniformes: true });
  const mixtes = h.map((x, i) => (i === 1 ? { ...x, heures: '9h00–12h00' } : x));
  assert.equal(horairesSimplifies(mixtes).uniformes, false);
  assert.equal(appliquerHorairesSimplifies(['Lundi'], '  ')[0].heures, '9h00–12h30, 14h00–19h00');
});

test('étape de reprise', () => {
  const d = identite();
  assert.equal(etapeDeReprise(d), 1);
  // Sujets choisis, modèle pas encore choisi : reprise au choix du site
  assert.equal(etapeDeReprise({ ...d, priorites: { principaux: ['ongles'], secondaires: [] } }), 2);
  const u = appliquerUniversParcours(d, universCatalogue('clair-pratique')!).draft;
  assert.equal(etapeDeReprise(u), 7);
  assert.equal(etapeDeReprise({ ...u, soins: [] }), 6);
  assert.equal(etapeDeReprise({ ...u, cabinet: { ...u.cabinet, telephone: '' } }), 4);
});

test('sept étapes numérotées dans l’ordre, horaires à part', () => {
  assert.deepEqual(ETAPES_PARCOURS.map((e) => e.numero), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(ETAPES_PARCOURS[4].titre, 'Vos horaires');
  assert.ok(ETAPES_PARCOURS.every((e) => !/Quatre sites|prêts à l’emploi/.test(e.consigne)));
});

test('progression de l’essai : 7 écrans ramenés sur la borne 0..7 de la base (migration 0023 inchangée)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((n) => jalonProgressionEssai(n, false)), [1, 2, 3, 4, 4, 5, 6]);
  assert.equal(jalonProgressionEssai(7, true), 7);
  assert.equal(jalonProgressionEssai(99, false), 6);
  assert.equal(jalonProgressionEssai(-2, false), 0);
  for (let n = 0; n <= 9; n++) for (const v of [true, false]) assert.ok(jalonProgressionEssai(n, v) >= 0 && jalonProgressionEssai(n, v) <= 7);
});

test('soins cochés d’office : quelques soins de base des sujets, jamais d’acte spécialisé', () => {
  const connus = ['ongle-incarne', 'orthonyxie', 'onychoplastie', 'mycose-ongles', 'ongles-epais', 'pied-diabetique', 'cors-durillons', 'soins-a-domicile', 'soins-de-pedicurie', 'verrues-plantaires', 'podologie-du-sport', 'semelles-orthopediques', 'douleur-talon', 'k-taping'];
  const d = { priorites: { principaux: ['diabete', 'ongles', 'pedicurie'], secondaires: ['sport'] } };
  const base = soinsDeBaseParcours(d, undefined, connus);
  assert.ok(base.length >= 3 && base.length <= SOINS_DE_BASE_MAX, base.join(','));
  assert.ok(base.every((s) => !SOINS_SPECIALISES.includes(s)), base.join(','));
  assert.equal(base[0], 'pied-diabetique', 'soin pivot du sujet n° 1 d’abord');
  assert.ok(base.includes('ongle-incarne'));
  // Sans sujet : soins du modèle, filtrés de la même façon
  const u = universCatalogue('simple-proche')!;
  assert.ok(soinsDeBaseParcours({ priorites: { principaux: [], secondaires: [] } }, u, connus).every((s) => !SOINS_SPECIALISES.includes(s)));
});

test('encouragement juste selon la progression réelle', () => {
  assert.match(encouragementParcours(1, false, 'Catherine'), /^Bienvenue Catherine/);
  assert.equal(encouragementParcours(2, false), 'Encore 5 étapes courtes après celle-ci. Tout est enregistré au fur et à mesure.');
  assert.doesNotMatch(encouragementParcours(2, false), /Bien avancé|moitié/);
  assert.match(encouragementParcours(4, false), /Plus de la moitié/);
  assert.match(encouragementParcours(5, false), /deux étapes/);
  assert.match(encouragementParcours(6, false), /une étape/);
  assert.equal(encouragementParcours(7, false), 'Dernière étape avant de voir votre site.');
  assert.equal(encouragementParcours(7, true), 'Dernière étape : découvrez votre site.');
});

test('aide de chaque étape reprise des fiches conseils', () => {
  for (const e of ETAPES_PARCOURS) {
    const a = aideEtape(e.numero);
    assert.equal(a.length, e.aide.length, `étape ${e.numero} : point de fiche introuvable`);
    assert.ok(a.every((p) => p.conseil.length > 10));
  }
});

test('le catalogue du parcours ne propose aucun sujet à faible niveau de preuve', () => {
  const tous: Univers[] = universDuParcours();
  for (const u of tous) assert.ok(!u.preReglage.soinsEnAvant.includes('posturologie'));
});
