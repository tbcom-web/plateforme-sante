// Tests des fonctions pures du parcours guidé (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerHorairesSimplifies, appliquerUniversParcours, basculerEnAvant, basculerSoin, choisirCouleurLibre, choisirGamme, deplacerSoin,
  etapeDeReprise, gammesConseillees, horairesSimplifies, natureCouleur, normaliserCouleur, placerSoin, soinsEnAvantValides, soinsSuggeres,
  universApplicableAuParcours, universDuParcours, universRecommande, aideEtape, ETAPES_PARCOURS, UNIVERS_PARCOURS,
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

test('les trois modèles du parcours, dans l’ordre, y compris en brouillon', () => {
  const liste = universDuParcours();
  assert.deepEqual(liste.map((u) => u.id), [...UNIVERS_PARCOURS]);
  assert.deepEqual(liste.map((u) => u.preReglage.modele), ['tableau', 'village', 'revue']);
});

test('un univers retiré ou hors parcours n’est jamais proposé', () => {
  const retire = CATALOGUE_UNIVERS.map((u) => (u.id === 'simple-proche' ? { ...u, statut: 'retire' as const } : u));
  assert.deepEqual(universDuParcours(retire).map((u) => u.id), ['clair-pratique', 'elegant-sobre']);
  assert.equal(universApplicableAuParcours(universCatalogue('podologie-generale')!), false);
  assert.equal(universApplicableAuParcours(universCatalogue('posture-biomecanique')!), false);
});

test('recommandation : choix existant, sinon profil, sinon premier', () => {
  const d = draftVide();
  assert.equal(universRecommande(d)?.id, 'clair-pratique');
  assert.equal(universRecommande({ ...d, profil: 'prevention' })?.id, 'simple-proche');
  assert.equal(universRecommande({ ...d, profil: 'prevention', theme: { ...d.theme, univers: 'elegant-sobre' } })?.id, 'elegant-sobre');
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
  const u = appliquerUniversParcours(d, universCatalogue('clair-pratique')!).draft;
  assert.equal(etapeDeReprise(u), 5);
  assert.equal(etapeDeReprise({ ...u, soins: [] }), 4);
  assert.equal(etapeDeReprise({ ...u, cabinet: { ...u.cabinet, telephone: '' } }), 3);
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
