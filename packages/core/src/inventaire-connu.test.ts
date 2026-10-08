// Registre des nouveautés (inventaire-connu.json, nouveautes.ts) : toute clé unitaire de l'inventaire de notation y a sa date de
// première apparition. Échoue tant qu'un nouvel ingrédient n'y est pas : lancer `npm run inventaire:maj` puis committer le JSON.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clesUnitairesInventaire, estIngredientUnitaire, inventaireAssets, inventaireStudio } from './assets';
import { absentesDuRegistre, clesRecentes, dateCourte, familleNouveaute, joursAvant, libelleLot, lienNouveautes, lotsDuParametre, lotsNouveautes, REGISTRE_INVENTAIRE, registreComplete } from './nouveautes';

test('registre des nouveautés : chaque ingrédient unitaire de l’inventaire y est daté (sinon : npm run inventaire:maj)', () => {
  const absentes = absentesDuRegistre(clesUnitairesInventaire());
  assert.deepEqual(absentes, [], `${absentes.length} ingrédient(s) absent(s) de packages/core/src/inventaire-connu.json → lancez npm run inventaire:maj puis committez le fichier`);
  for (const [k, d] of Object.entries(REGISTRE_INVENTAIRE)) assert.match(d, /^\d{4}-\d{2}-\d{2}$/, k);
});

test('registre des nouveautés : seulement des ingrédients unitaires (aucune combinaison de structures, police × palette, paire, image × fond)', () => {
  const tout = [...inventaireAssets(), ...inventaireStudio()].map((a) => a.cle);
  const combinaisons = tout.filter((k) => !estIngredientUnitaire(k));
  assert.ok(combinaisons.length > 1000, `${combinaisons.length} combinaisons`);
  assert.ok(combinaisons.every((k) => !(k in REGISTRE_INVENTAIRE)));
  assert.ok(Object.keys(REGISTRE_INVENTAIRE).every(estIngredientUnitaire));
  assert.ok(estIngredientUnitaire('structure:fiche:colonne') && !estIngredientUnitaire('structure:accueil:modele-carte-une'));
  assert.ok(estIngredientUnitaire('composant:entete-anim:em-respire') && !estIngredientUnitaire('typo:combinaison:serif-fine.cobalt'));
});

test('registre : complété avec la date du jour, sans toucher aux dates connues, clés triées', () => {
  const r = registreComplete({ 'gamme:b': '2026-09-01' }, ['gamme:b', 'gamme:a'], '2026-10-09');
  assert.deepEqual(r, { 'gamme:a': '2026-10-09', 'gamme:b': '2026-09-01' });
  assert.deepEqual(Object.keys(r), ['gamme:a', 'gamme:b']);
  assert.throws(() => registreComplete({}, ['x:y'], '9 octobre'));
});

test('lots du jour : les animations d’en-tête empreintes et les directions des pictos datées du 2026-10-08', () => {
  assert.equal(REGISTRE_INVENTAIRE['composant:entete-anim:em-respire'], '2026-10-08');
  assert.equal(REGISTRE_INVENTAIRE['picto:ongle-incarne@direction-a'], '2026-10-08');
  const recentes = clesRecentes('2026-10-08');
  const lots = lotsNouveautes(recentes, { notees: new Set() });
  const em = lots.find((l) => l.id === 'entete-empreintes@2026-10-08');
  assert.ok(em && em.cles.length === 10 && em.cles.every((k) => k.startsWith('composant:entete-anim:em-')));
  assert.equal(libelleLot(em!), 'Animations d’en-tête empreintes · 10 · 08/10');
  const dir = lots.find((l) => l.id === 'pictos-directions@2026-10-08');
  assert.ok(dir && dir.cles.length >= 36, `${dir?.cles.length} directions`);
  // Les autres animations d'en-tête (lot 2) forment un autre lot
  assert.ok(lots.find((l) => l.id === 'entete-anim@2026-10-08')?.cles.every((k) => !k.includes(':em-')));
  // Hors fenêtre (30 jours) : rien
  assert.equal(clesRecentes('2026-12-01').length, 0);
});

test('lots : une nouveauté notée (ou dont l’illustration de base est notée) sort de son lot ; « Retiré » exclu ; lien direct', () => {
  const recentes = [
    { cle: 'composant:entete-anim:em-respire', date: '2026-10-08' }, { cle: 'composant:entete-anim:em-trace', date: '2026-10-08' },
    { cle: 'dessin:hallux-valgus:pedagogique', date: '2026-10-08' }, { cle: 'picto:laser', date: '2026-10-07' },
  ];
  const lots = lotsNouveautes(recentes, { notees: new Set(['composant:entete-anim:em-trace', 'dessin:hallux-valgus']), statuts: { 'picto:laser': 'retire' } });
  assert.deepEqual(lots.map((l) => [l.id, l.cles]), [['entete-empreintes@2026-10-08', ['composant:entete-anim:em-respire']]]);
  assert.deepEqual(lotsDuParametre(lots, 'entete-empreintes').map((l) => l.id), ['entete-empreintes@2026-10-08']);
  assert.deepEqual(lotsDuParametre(lots, 'entete-empreintes@2026-10-08').length, 1);
  assert.deepEqual(lotsDuParametre(lots, 'tout').length, 1);
  assert.deepEqual(lotsDuParametre(lots, 'inconnu'), []);
  assert.equal(lienNouveautes('pictos-directions@2026-10-08'), '/admin/retours?nouveautes=pictos-directions%402026-10-08');
});

test('familles des nouveautés et dates', () => {
  assert.equal(familleNouveaute('picto:style-icones-a').id, 'pictos-directions');
  assert.equal(familleNouveaute('composant:portraits:voile').libelle, 'Présentation des praticiens');
  assert.equal(familleNouveaute('effets:photos-voile-grain').id, 'traitements-photos');
  assert.equal(familleNouveaute('structure:fiche:colonne').libelle, 'Fiche d’un soin');
  assert.equal(dateCourte('2026-10-08'), '08/10');
  assert.equal(joursAvant('2026-10-08', 29), '2026-09-09');
});
