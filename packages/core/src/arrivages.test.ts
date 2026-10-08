import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clesExcluesArrivages, etatNouveaute, etatPhotoLibre, gesteClavier, gesteGlisse, nouveautesEnAttente, statutAnnulation, typeIngredient,
} from './arrivages';
import { ESPACES, entreeActive, filAriane, nouvelleAdresse, REDIRECTIONS_ADMIN } from './admin-espaces';

test('arrivages : état d’une nouveauté (statut décisif, note = acceptation sauf 1 ★, sinon en attente)', () => {
  const o = (statuts: Record<string, string> = {}, dernieresNotes: Record<string, number> = {}) => ({ statuts, dernieresNotes });
  assert.equal(etatNouveaute('picto:x', o()), 'en_attente');
  assert.equal(etatNouveaute('picto:x', o({ 'picto:x': 'a_revoir' })), 'en_attente');
  assert.equal(etatNouveaute('picto:x', o({ 'picto:x': 'accepte' })), 'accepte');
  assert.equal(etatNouveaute('picto:x', o({ 'picto:x': 'valide' })), 'accepte');
  assert.equal(etatNouveaute('picto:x', o({ 'picto:x': 'retire' }, { 'picto:x': 5 })), 'refuse');
  assert.equal(etatNouveaute('picto:x', o({}, { 'picto:x': 3 })), 'accepte');
  assert.equal(etatNouveaute('picto:x', o({}, { 'picto:x': 1 })), 'refuse');
  assert.equal(etatNouveaute('typo:police:revue', o({ 'typo:police:revue': 'a_retravailler' })), 'refuse');
});

test('arrivages : file, exclusions du générateur, photos, annulation, gestes', () => {
  const recentes = [{ cle: 'picto:a', date: '2026-10-08' }, { cle: 'picto:b', date: '2026-10-08' }, { cle: 'menu:c', date: '2026-10-07' }, { cle: 'picto:z', date: '2026-10-07' }];
  const o = { statuts: { 'picto:b': 'accepte', 'menu:c': 'retire' }, dernieresNotes: {} };
  assert.deepEqual(nouveautesEnAttente(recentes, { ...o, connues: new Set(['picto:a', 'picto:b', 'menu:c']) }).map((r) => r.cle), ['picto:a']);
  // En attente ET refusées : jamais tirées par le générateur ; acceptées : utilisables
  assert.deepEqual(clesExcluesArrivages(recentes, o).sort(), ['menu:c', 'picto:a', 'picto:z']);
  assert.equal(etatPhotoLibre('a_valider'), 'en_attente');
  assert.equal(etatPhotoLibre('validee'), 'accepte');
  assert.equal(etatPhotoLibre('retiree'), 'refuse');
  assert.equal(statutAnnulation(undefined), 'a_revoir');
  assert.equal(statutAnnulation('a_revoir'), 'a_revoir');
  assert.equal(gesteClavier('a'), 'accepter');
  assert.equal(gesteClavier('ArrowLeft'), 'refuser');
  assert.equal(gesteClavier('x'), null);
  assert.equal(gesteGlisse(120, 10), 'accepter');
  assert.equal(gesteGlisse(-120, 10), 'refuser');
  assert.equal(gesteGlisse(40, 0), null);
  assert.equal(gesteGlisse(100, 200), null);
});

test('arrivages : types d’ingrédients', () => {
  assert.equal(typeIngredient('photo:banque/libres/sport/x.webp'), 'photo');
  assert.equal(typeIngredient('picto:orthonyxie'), 'icone');
  assert.equal(typeIngredient('composant:entete-anim:em-marche'), 'animation');
  assert.equal(typeIngredient('animation:meulage'), 'animation');
  assert.equal(typeIngredient('gamme:cobalt'), 'palette');
  assert.equal(typeIngredient('typo:police:revue'), 'police');
  assert.equal(typeIngredient('menu:mobile:panneau'), 'mise-en-page');
  assert.equal(typeIngredient('composant:accueil:split'), 'mise-en-page');
  assert.equal(typeIngredient('dessin:orthonyxie:releve'), 'illustration');
  assert.equal(typeIngredient('details:coins-doux'), 'element');
});

test('espaces de l’admin : menu, fil d’Ariane, redirections', () => {
  assert.deepEqual(ESPACES.map((e) => e.libelle), ['Arrivages', 'Frigo', 'Dégustation', 'Cuisine', 'Clients']);
  // Aucune adresse en double dans le menu
  const hrefs = ESPACES.flatMap((e) => e.entrees.map((x) => x.href));
  assert.equal(new Set(hrefs).size, hrefs.length);
  // Aucun libellé de métier codé en dur dans la navigation
  for (const e of ESPACES) for (const x of [e, ...e.entrees]) assert.ok(!/podolog|pédicure|kiné|ostéo/i.test(x.libelle), x.libelle);
  assert.deepEqual(filAriane('/admin').map((m) => m.libelle), ['Super admin', 'Tableau de bord']);
  assert.deepEqual(filAriane('/admin/frigo/tri').map((m) => m.libelle), ['Super admin', 'Frigo', 'Trier par sujet']);
  assert.deepEqual(filAriane('/admin/frigo').map((m) => m.libelle), ['Super admin', 'Frigo']);
  assert.equal(entreeActive('/admin/frigo')?.entree.libelle, 'Contenu');
  assert.deepEqual(filAriane('/admin/retours/duel/pictos').map((m) => m.libelle), ['Super admin', 'Dégustation', 'Duels A ou B', 'Style des icônes']);
  assert.deepEqual(filAriane('/admin/sites/1234').map((m) => m.libelle), ['Super admin', 'Clients', 'Sites', 'Photos du site']);
  assert.equal(entreeActive('/admin/retours?type=x')?.entree.href, '/admin/retours');
  assert.equal(entreeActive('/admin/inconnue'), null);
  // Redirections : anciennes adresses → adresses du menu ; jamais en chaîne ni vers une ancienne adresse
  for (const r of REDIRECTIONS_ADMIN) {
    assert.ok(hrefs.includes(r.destination), r.destination);
    assert.equal(nouvelleAdresse(r.destination), null);
  }
  assert.equal(nouvelleAdresse('/admin/retours/tri'), '/admin/frigo/tri');
  assert.equal(nouvelleAdresse('/admin/retours/images-a-generer/importer'), null);
});
