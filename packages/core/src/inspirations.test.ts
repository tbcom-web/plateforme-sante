import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  codeGamme, domaineDuLien, estChromatique, gammeDepuisCouleurs, gammesCandidates, inspirationPourExport, markdownInspirations, normaliserPalette,
  palettesRecurrentes, quantifierPalette, validerInspiration,
} from './inspirations';
import {
  candidatPexels, candidatPixabay, candidatsDepuisReponse, cheminPhotoLibre, cleCandidat, construireTracabilite, csvLicences, construireCandidate, cleCandidatePhoto, apercuAutorise, estPhotoImportee, filtrerCandidats,
  largeursAProduire, MOTS_CLES_DEFAUT, motsClesDuSujet, normaliserMotsCles, orientation, peutAppeler, refusDecision, SUJETS_VISUELS,
  urlImageAutorisee, urlRecherchePexels, urlRecherchePixabay, type CandidatPhoto,
} from './photos-libres';
import { contraste } from './couleurs';
import { verifierGamme } from './gammes';

/** Image RVBA factice : blocs de couleurs (proportions données) */
function image(blocs: [string, number][]): Uint8ClampedArray {
  const px: number[] = [];
  for (const [h, n] of blocs) {
    const v = parseInt(h.slice(1), 16);
    for (let i = 0; i < n; i++) px.push((v >> 16) & 255, (v >> 8) & 255, v & 255, 255);
  }
  return new Uint8ClampedArray(px);
}

test('palette : couleurs dominantes, parts, pixels transparents ignorés, déterministe', () => {
  const px = image([['#1f6b64', 500], ['#1e6a63', 100], ['#f7f2ec', 300], ['#ffb547', 100]]);
  const p = quantifierPalette(px, { n: 6 });
  assert.equal(p.length, 3, 'les deux verts très proches sont fusionnés');
  assert.ok(Math.abs(p[0].part - 0.6) < 0.01, `part du vert ${p[0].part}`);
  assert.ok(contraste(p[0].hex, '#1f6b64') < 1.1);
  assert.ok(Math.abs(p.reduce((s, c) => s + c.part, 0) - 1) < 0.01);
  assert.deepEqual(quantifierPalette(px), p, 'même entrée, même palette');
  // Transparents : ignorés
  const t = new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 255, 255]);
  assert.deepEqual(quantifierPalette(t).map((c) => c.hex), ['#0000ff']);
  assert.deepEqual(quantifierPalette(new Uint8ClampedArray(0)), []);
  // Couleurs négligeables (bords lissés) écartées
  assert.deepEqual(quantifierPalette(image([['#ffffff', 995], ['#ff0000', 5]])).map((c) => c.hex), ['#ffffff']);
  // 6 couleurs au plus
  const arcEnCiel = image(['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000', '#ffffff'].map((h, i) => [h, 10 + i]));
  assert.equal(quantifierPalette(arcEnCiel, { n: 9 }).length, 6);
});

test('inspiration : validation, lien, palette, export sans image ni adresse complète', () => {
  assert.ok(validerInspiration({ etiquettes: [], objectif: '' }).erreurs.length, 'il faut dire ce qui plaît');
  const { inspiration } = validerInspiration({ etiquettes: ['couleurs', 'inconnue', 'couleurs'], objectif: '  des aplats   doux ', sujet: 'sport', typeElement: 'illustration', lien: 'https://www.exemple.fr/a?b=1', palette: [{ hex: '#ABCDEF', part: 0.5 }, { hex: 'rouge', part: 1 }] });
  assert.deepEqual(inspiration?.etiquettes, ['couleurs']);
  assert.equal(inspiration?.objectif, 'des aplats doux');
  assert.equal(inspiration?.sujet, 'sport');
  assert.deepEqual(inspiration?.palette, [{ hex: '#abcdef', part: 0.5 }]);
  assert.ok(validerInspiration({ etiquettes: ['ambiance'], lien: 'javascript:alert(1)' }).erreurs.length);
  assert.equal(validerInspiration({ etiquettes: ['ambiance'], sujet: 'posture' }).inspiration?.sujet, null, 'sujet différé refusé');
  assert.equal(domaineDuLien('https://www.dribbble.com/shots/1'), 'dribbble.com');
  const e = inspirationPourExport({ etiquettes: ['couleurs'], objectif: 'x', sujet: 'enfant', type_element: 'icone', lien: 'https://site.fr/page/secrete?jeton=1', palette: [{ hex: '#112233', part: 1 }], created_at: '2026-10-07T10:00:00Z' });
  assert.deepEqual(e, { jour: '2026-10-07', sujet: 'enfant', type: 'icone', etiquettes: ['couleurs'], objectif: 'x', palette: [{ hex: '#112233', part: 1 }], domaine: 'site.fr' });
  assert.ok(!JSON.stringify(e).includes('jeton'));
  assert.deepEqual(normaliserPalette(Array.from({ length: 9 }, () => ({ hex: '#000000', part: 0.1 }))).length, 6);
});

test('palettes récurrentes : couleurs proches regroupées entre inspirations, seuil minimal', () => {
  const ins = [
    { id: 'a', palette: [{ hex: '#1f6b64', part: 0.5 }, { hex: '#ffffff', part: 0.4 }], sujet: 'sport' },
    { id: 'b', palette: [{ hex: '#227066', part: 0.3 }, { hex: '#fafafa', part: 0.6 }], sujet: 'enfant' },
    { id: 'c', palette: [{ hex: '#ff5d73', part: 0.7 }, { hex: '#1d6560', part: 0.02 }] },
  ];
  const r = palettesRecurrentes(ins);
  assert.equal(r.length, 2, 'le vert et le blanc reviennent ; le rose (une seule) et la part de 2 % non');
  assert.ok(r.every((c) => c.inspirations === 2));
  assert.deepEqual(r.find((c) => estChromatique(c.hex))?.sujets, ['enfant', 'sport']);
  assert.equal(palettesRecurrentes(ins, { min: 1 }).length, 3);
});

test('gammes candidates : contrastes AA vérifiés, jamais une couleur pâle en accent, code prêt à coller', () => {
  for (const c of ['#ffb547', '#3fd0a0', '#6f4cff', '#1f6b64', '#f2df3a', '#ff5d73', '#9fd3ff']) {
    const g = gammeDepuisCouleurs(c, '#ffc83a', 'candidate-test', 'Test');
    assert.deepEqual(verifierGamme(g), [], `${c} : ${verifierGamme(g).join(' ; ')}`);
    assert.ok(contraste('#ffffff', g.accent) >= 4.5);
  }
  const rec = [
    { hex: '#ffb547', inspirations: 4, part: 1.2, sujets: [] },
    { hex: '#ffb040', inspirations: 3, part: 0.8, sujets: [] },
    { hex: '#fdfdfd', inspirations: 3, part: 2, sujets: [] },
    { hex: '#26305e', inspirations: 2, part: 0.5, sujets: [] },
  ];
  const cand = gammesCandidates(rec);
  assert.equal(cand.length, 2, 'les deux oranges proches → une seule candidate ; le blanc n’est pas chromatique');
  assert.ok(cand.every((c) => c.conforme && c.defauts.length === 0));
  assert.equal(cand[0].origine[0], '#ffb547');
  assert.ok(cand[0].proche.id);
  assert.match(codeGamme(cand[0].gamme), /^\{ id: 'candidate-ffb547', nom: 'Candidate 1', accent: '#[0-9a-f]{6}'/);
  const md = markdownInspirations([
    { jour: '2026-10-07', sujet: 'sport', type: null, etiquettes: ['couleurs'], objectif: 'aplats', palette: [{ hex: '#ffb547', part: 0.5 }], domaine: null },
    { jour: '2026-10-07', sujet: 'sport', type: null, etiquettes: ['couleurs', 'ambiance'], objectif: null, palette: [{ hex: '#ffb040', part: 0.5 }], domaine: null },
  ]);
  assert.match(md, /Couleurs \(2\)/);
  assert.match(md, /Gammes candidates/);
});

// ---------------------------------------------------------------------------------------------------------------
// Photos libres
// ---------------------------------------------------------------------------------------------------------------

const pexels = (id: number, w: number, h: number) => ({
  id, width: w, height: h, url: `https://www.pexels.com/photo/pieds-${id}/`, photographer: 'Jeanne Test', photographer_url: 'https://www.pexels.com/@jeanne',
  alt: 'Pieds nus', src: { original: `https://images.pexels.com/photos/${id}/a.jpeg`, large: `https://images.pexels.com/photos/${id}/a.jpeg?h=650` },
});

test('photos libres : sujets et mots-clés par défaut, normalisation', () => {
  assert.deepEqual(SUJETS_VISUELS.map((s) => s.id).sort(), Object.keys(MOTS_CLES_DEFAUT).sort(), 'un jeu de mots-clés par sujet, posture exclue');
  assert.deepEqual(normaliserMotsCles(' Trail  Running ,running shoes\n<script>, trail running'), ['trail running', 'running shoes']);
  assert.deepEqual(motsClesDuSujet('sport', { sport: [] }), [...MOTS_CLES_DEFAUT.sport]);
  assert.deepEqual(motsClesDuSujet('sport', { sport: ['barefoot run'] }), ['barefoot run']);
  assert.equal(normaliserMotsCles(Array.from({ length: 20 }, (_, i) => `mot ${i}`)).length, 12);
});

test('photos libres : lecture des API, hôtes contrôlés, adresses de recherche', () => {
  const c = candidatPexels(pexels(123, 4000, 2667))!;
  assert.equal(c.source, 'pexels');
  assert.equal(cleCandidat(c), 'pexels:123');
  assert.match(c.telechargement, /^https:\/\/images\.pexels\.com\/photos\/123\/a\.jpeg\?auto=compress&cs=tinysrgb&w=2400$/);
  assert.equal(candidatPexels({ ...pexels(1, 4000, 3000), src: { original: 'https://evil.example/x.jpg', large: 'https://evil.example/x.jpg' } }), null);
  const x = candidatPixabay({ id: 77, imageWidth: 5000, imageHeight: 3000, pageURL: 'https://pixabay.com/photos/feet-77/', user: 'Ana', user_id: 9, tags: 'feet, grass', webformatURL: 'https://pixabay.com/get/a_640.jpg', largeImageURL: 'https://pixabay.com/get/a_1280.jpg' })!;
  assert.equal(x.auteurUrl, 'https://pixabay.com/users/Ana-9/');
  assert.deepEqual(x.tags, ['feet', 'grass']);
  assert.equal(candidatsDepuisReponse('pexels', { photos: [pexels(1, 3000, 2000), { id: 'x' }] }).length, 1);
  assert.equal(candidatsDepuisReponse('pexels', pexels(5, 3000, 2000)).length, 1, 'détail d’une photo');
  assert.equal(candidatsDepuisReponse('pixabay', { hits: 'non' }).length, 0);
  assert.ok(!urlRecherchePexels('foot care', 2).includes('key'), 'clé Pexels jamais dans l’adresse');
  assert.match(urlRecherchePexels('foot care', 2), /query=foot\+care.*orientation=landscape.*page=2/);
  assert.match(urlRecherchePixabay('CLE', 'feet', 1), /safesearch=true/);
  assert.ok(urlImageAutorisee('pixabay', 'https://cdn.pixabay.com/a.jpg'));
  assert.ok(!urlImageAutorisee('pixabay', 'http://cdn.pixabay.com/a.jpg'), 'https seulement');
});

test('photos libres : filtre des candidates (taille, doublons, déjà vues, paysage d’abord)', () => {
  const l = [pexels(1, 1200, 800), pexels(2, 2000, 3000), pexels(3, 4000, 2600), pexels(3, 4000, 2600), pexels(4, 3000, 3000), pexels(5, 5000, 3000), pexels(6, 1800, 850)]
    .map((p) => candidatPexels(p)!) as CandidatPhoto[];
  const f = filtrerCandidats(l, new Set(['pexels:5']));
  assert.deepEqual(f.map((c) => c.idSource), ['3', '4', '2']);
  assert.equal(orientation(f[0]), 'paysage');
  assert.equal(orientation(f[2]), 'portrait');
});

test('photos libres : limites de débit (fenêtre glissante)', () => {
  const t0 = 1_000_000;
  const pleins = Array.from({ length: 90 }, (_, i) => t0 - i * 100);
  assert.equal(peutAppeler(pleins, 'pixabay', t0 + 1).ok, false);
  assert.ok(peutAppeler(pleins, 'pixabay', t0 + 1).attenteMs > 0);
  assert.equal(peutAppeler(pleins, 'pixabay', t0 + 61_000).ok, true, 'une minute plus tard');
  assert.equal(peutAppeler(pleins, 'pexels', t0 + 1).ok, true, '90 < 180 par heure');
});

test('photos libres : décision, traçabilité obligatoire, fichiers, CSV', () => {
  assert.ok(refusDecision('garder', ['parfaite', 'visage-visible']));
  assert.ok(refusDecision('garder', ['laisse-croire-patient']));
  assert.equal(refusDecision('rejeter', ['visage-visible']), null);
  assert.equal(refusDecision('garder', ['belle-lumiere']), null);
  assert.deepEqual(largeursAProduire(2400), [640, 1280, 1920]);
  assert.deepEqual(largeursAProduire(1280), [640, 1280]);
  assert.deepEqual(largeursAProduire(500), [500]);
  assert.equal(cheminPhotoLibre('sport', 'pexels', '123', 1920), 'banque/libres/sport/pexels-123-1920.webp');
  const c = candidatPexels(pexels(123, 4000, 2667))!;
  const date = new Date('2026-10-07T09:00:00Z');
  const { ligne, erreurs } = construireTracabilite({ candidat: c, sujet: 'sport', motsCles: ['Trail running', 'marathon'], requete: 'trail running', telechargeLe: date, largeurs: [1920, 640, 1280], urlPrincipale: 'https://x.supabase.co/storage/v1/object/public/photos/banque/libres/sport/pexels-123-1920.webp', etiquettes: ['parfaite', 'zzz'] });
  assert.deepEqual(erreurs, []);
  assert.equal(ligne?.licence, 'Licence Pexels');
  assert.equal(ligne?.licence_url, 'https://www.pexels.com/license/');
  assert.equal(ligne?.licence_version, 'texte en vigueur au 2026-10-07');
  assert.equal(ligne?.telecharge_le, '2026-10-07T09:00:00.000Z');
  assert.equal(ligne?.auteur_nom, 'Jeanne Test');
  assert.equal(ligne?.page_url, 'https://www.pexels.com/photo/pieds-123/');
  assert.deepEqual(ligne?.mots_cles, ['trail running', 'marathon']);
  assert.deepEqual(ligne?.largeurs, [640, 1280, 1920]);
  assert.equal(ligne?.chemin, 'banque/libres/sport/pexels-123-1920.webp');
  assert.deepEqual(ligne?.etiquettes, ['parfaite']);
  assert.equal(ligne?.statut, 'a_valider');
  // Information manquante : refus
  assert.ok(construireTracabilite({ candidat: { ...c, auteur: ' ' }, sujet: 'sport', motsCles: [], requete: '', telechargeLe: date, largeurs: [640], urlPrincipale: 'https://x/y.webp' }).erreurs.length);
  assert.ok(construireTracabilite({ candidat: c, sujet: 'posture', motsCles: [], requete: '', telechargeLe: date, largeurs: [640], urlPrincipale: 'https://x/y.webp' }).erreurs.length);
  assert.ok(construireTracabilite({ candidat: { ...c, pageUrl: 'https://ailleurs.fr/p' }, sujet: 'sport', motsCles: [], requete: '', telechargeLe: date, largeurs: [640], urlPrincipale: 'https://x/y.webp' }).erreurs.length);
  const csv = csvLicences([{ fournisseur: 'Pexels', identifiant: '123', auteur: 'A; "B"', page: 'p', licence: 'L', version: 'v', lienLicence: 'u', date: '2026-10-07', sujet: 'sport', fichier: 'f', statut: '=1+1' }]);
  assert.ok(csv.startsWith('﻿Fournisseur;Identifiant;'));
  assert.ok(csv.includes('"A; ""B"""'));
  assert.ok(csv.includes(";'=1+1"), 'formule neutralisée');
  assert.ok(csv.split('\r\n')[0].endsWith(';Importée le'), 'colonne « Importée le »');
  assert.ok(csv.split('\r\n')[1].endsWith(';'), 'candidate non importée : date d’import vide');
});

test('photos libres : candidate gardée sans import (aperçu de la source, rien d’hébergé)', () => {
  const c = candidatPexels(pexels(123, 4000, 2667))!;
  const { ligne, erreurs } = construireCandidate({ candidat: c, sujet: 'senior', motsCles: ['Trail running'], requete: 'trail running', gardeLe: new Date('2026-10-07T09:00:00Z'), etiquettes: ['parfaite'] });
  assert.deepEqual(erreurs, []);
  assert.equal(ligne?.chemin, null);
  assert.equal(ligne?.url, null);
  assert.deepEqual(ligne?.largeurs, []);
  assert.equal(ligne?.telecharge_le, null);
  assert.equal(ligne?.importe_le, null);
  assert.equal(ligne?.apercu_url, c.apercu);
  assert.equal(ligne?.statut, 'a_valider');
  assert.equal(ligne?.largeur_originale, 4000);
  assert.equal(ligne?.licence_version, 'texte en vigueur au 2026-10-07');
  assert.equal(cleCandidatePhoto('pexels', '123'), 'photo:libre:pexels-123');
  assert.ok(!apercuAutorise('pexels', 'https://ailleurs.fr/x.jpg'));
  assert.ok(!apercuAutorise('pexels', 'http://images.pexels.com/x.jpg'), 'https seulement');
  assert.ok(construireCandidate({ candidat: { ...c, apercu: 'https://ailleurs.fr/x.jpg' }, sujet: 'sport', motsCles: [], requete: '', gardeLe: new Date() }).erreurs.length);
  assert.ok(!estPhotoImportee({ statut: 'a_valider', chemin: null, url: null }));
  assert.ok(!estPhotoImportee({ statut: 'validee', chemin: null, url: null }), 'validée sans fichier : inutilisable');
  assert.ok(estPhotoImportee({ statut: 'validee', chemin: 'banque/libres/sport/pexels-1-640.webp', url: 'https://x/y.webp' }));
});
