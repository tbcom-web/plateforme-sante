// Préparation d'un site à partir du site existant d'un prospect (audit-prospect.ts) : identité, sujets, praticien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecVitrine, draftProspect, identiteDepuisPage, imagesHeros, praticienReconnu, prioritesDepuisSujets, sujetsDepuisTexte, telephoneFr } from './audit-prospect';

const PAGE = `<html><head><title>Podologue du sport à Lyon – Cabinet des Brotteaux</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"MedicalBusiness","name":"Cabinet des Brotteaux",
"telephone":"+33478000000","address":{"streetAddress":"12 rue des Tilleuls","postalCode":"69006","addressLocality":"Lyon"}}</script>
<style>.x{color:red}</style></head><body><h1>Camille Rousseau, pédicure-podologue</h1>
<p>Semelles orthopédiques pour coureurs et sportifs, analyse de la marche et de la course.</p>
<p>Soins des ongles incarnés. Bilan podologique du sportif.</p>
<a href="https://www.doctolib.fr/pedicure-podologue/lyon/camille-rousseau">Prendre rendez-vous</a></body></html>`;

test('identité lue dans le JSON-LD, lien de rendez-vous reconnu', () => {
  const id = identiteDepuisPage(PAGE);
  assert.equal(id.nomCabinet, 'Cabinet des Brotteaux');
  assert.equal(id.telephone, '04 78 00 00 00');
  assert.equal(id.adresse, '12 rue des Tilleuls');
  assert.equal(id.codePostal, '69006');
  assert.equal(id.ville, 'Lyon');
  assert.match(id.rdvUrl, /doctolib/);
  assert.ok(!id.texte.includes('color:red'));
});

test('identité lue dans le texte sans JSON-LD', () => {
  const id = identiteDepuisPage('<title>Cabinet</title><p>Cabinet de podologie</p><p>5 avenue Foch, 34000 Montpellier</p><p>Tél. 04.67.82.78.09</p>');
  assert.equal(id.adresse, '5 avenue Foch');
  assert.equal(id.codePostal, '34000');
  assert.equal(id.ville, 'Montpellier');
  assert.equal(id.telephone, '04 67 82 78 09');
});

test('sujets : le sport domine (titre compté triple), un mot isolé ne fait pas un sujet principal', () => {
  const id = identiteDepuisPage(PAGE);
  const s = sujetsDepuisTexte(id.texte, id.titre);
  assert.equal(s[0].sujet, 'sport');
  const p = prioritesDepuisSujets(s);
  assert.equal(p.principaux[0], 'sport');
  assert.ok(p.principaux.length <= 3 && p.secondaires.length <= 3);
  assert.deepEqual(prioritesDepuisSujets([{ sujet: 'enfant', score: 1, termes: ['enfant'] }]), { principaux: [], secondaires: ['enfant'] });
});

test('praticien reconnu par son nom dans la page, jamais en cas de doute', () => {
  const texte = identiteDepuisPage(PAGE).texte;
  const camille = { rpps: '10101010101', nom: 'ROUSSEAU', prenom: 'CAMILLE', commune: 'LYON' };
  const autre = { rpps: '10202020202', nom: 'MARTIN', prenom: 'LUC', commune: 'LYON' };
  assert.equal(praticienReconnu(texte, [autre, camille])?.rpps, '10101010101');
  assert.equal(praticienReconnu(texte, [autre]), null);
  // deux Rousseau à égalité (prénom absent de la page) : aucun choix
  assert.equal(praticienReconnu('Cabinet Rousseau', [camille, { ...autre, nom: 'ROUSSEAU' }]), null);
});

test('brouillon préparé : identité, praticien de l’annuaire, priorités', () => {
  const id = identiteDepuisPage(PAGE);
  const d = draftProspect(id, { principaux: ['sport'], secondaires: [] }, { rpps: '10101010101', nom: 'ROUSSEAU', prenom: 'CAMILLE' });
  assert.equal(d.cabinet.nom, 'Cabinet des Brotteaux');
  assert.equal(d.praticiens[0].nom, 'Rousseau');
  assert.equal(d.praticiens[0].prenom, 'Camille');
  assert.equal(d.lieux[0].ville, 'Lyon');
  assert.equal(d.rdv.outil, 'Doctolib');
  assert.deepEqual(d.priorites.principaux, ['sport']);
  assert.equal(telephoneFr('+33 6 12 34 56 78'), '06 12 34 56 78');
});

test('photo principale : og:image puis bandeau, sans logo ni SVG', () => {
  const html = `<meta property="og:image" content="/img/cabinet.jpg"><img src="/logo.png" class="hero"><img class="hero-bandeau" src="https://cdn.x.fr/bandeau.webp"><div style="background-image:url('/fond.svg')">`;
  assert.deepEqual(imagesHeros(html, 'https://cabinet.fr/'), ['https://cabinet.fr/img/cabinet.jpg', 'https://cdn.x.fr/bandeau.webp']);
});

test('vitrine : semelles en sujet principal, animation de pression en tête, photo dans la galerie', () => {
  const d = draftProspect(identiteDepuisPage(PAGE), { principaux: ['sport', 'ongles', 'enfant'], secondaires: ['semelles'] }, null);
  const v = avecVitrine(d, 'https://x.supabase.co/storage/v1/object/public/photos/a/accueil.webp');
  assert.deepEqual(v.priorites.principaux, ['sport', 'ongles', 'semelles']);
  assert.ok(!v.priorites.secondaires.includes('semelles'));
  assert.equal(v.theme.herosSujet, 'semelles');
  assert.equal(v.theme.variantes?.['visuel-heros'], 'animation');
  assert.equal(v.theme.variantes?.['entete-anim'], 'pi-pression');
  assert.equal(v.photos.cabinet[0], v.photos.accueil);
});
