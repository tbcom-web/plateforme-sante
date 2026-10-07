// Références d'illustration, dictionnaire métier et suggestions de classement. Réponses des 5 API : fixtures au format
// documenté de chaque API (fixtures/references), aucun appel réseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import wikimedia from './fixtures/references/wikimedia.json';
import openverse from './fixtures/references/openverse.json';
import pexels from './fixtures/references/pexels.json';
import pixabay from './fixtures/references/pixabay.json';
import google from './fixtures/references/google.json';
import { correspondances, DICTIONNAIRE_METIER, requeteDepuisElement, traduireSujet, variantesRequete } from './dictionnaire-metier';
import { markdownSuggestionsRefusees, suggererClassement, validerDecisionClassement } from './classement-visuels';
import {
  adressePublique, cleReference, empreinteCourte, fenetresLibres, filtrerReferences, initialiserRelance, integrerPage, marquerEpuisee, nombreBrut, ordreDuTour, pageAutorisee, prendreLot,
  quotaGoogleRestant, referencesDepuisReponse, referencesPourExport, requetesDuLot, sourcesActives, urlRechercheGoogle, urlRechercheOpenverse, urlRechercheWikimedia, urlReferencesPixabay, USER_AGENT_REFERENCES,
  validerChoixReference, vignetteAutorisee, type ReferenceImage, type SourceReference,
} from './references-illustrations';

// ------------------------------------------------------------------ Dictionnaire et traduction

test('traduction des sujets FR → EN', () => {
  assert.equal(traduireSujet('Orthonyxie'), 'ingrown toenail brace');
  assert.equal(traduireSujet('Onychoplastie'), 'artificial toenail reconstruction');
  assert.equal(traduireSujet('Podoscope'), 'podoscope');
  assert.equal(traduireSujet('Orthoplastie'), 'silicone toe orthosis');
  assert.equal(traduireSujet('Ongle incarné'), 'ingrown toenail', 'le terme le plus long l’emporte sur « ongle »');
  assert.equal(traduireSujet('Semelles orthopédiques'), 'orthotic insoles');
  assert.equal(traduireSujet('Pied diabétique'), 'diabetic foot examination');
  assert.equal(traduireSujet('Mot inconnu pédagogique'), 'mot inconnu', 'inconnu : texte nettoyé, sans mots neutres');
  assert.equal(traduireSujet(''), '');
});

test('requête par défaut d’un élément de la bibliothèque', () => {
  assert.equal(requeteDepuisElement({ titre: 'Orthonyxie', cle: 'picto:orthonyxie', soins: ['orthonyxie'] }), 'ingrown toenail brace');
  assert.equal(requeteDepuisElement({ titre: 'Dessin pédagogique', cle: 'dessin:semelle:pedagogique', soins: [] }), 'orthotic insoles', 'titre muet : la clé');
  assert.equal(requeteDepuisElement({ titre: 'Matériel', cle: 'materiel:podoscope:releve', soins: [] }), 'podoscope');
});

test('dictionnaire : identifiants uniques, jamais posture', () => {
  const ids = DICTIONNAIRE_METIER.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(DICTIONNAIRE_METIER.every((e) => e.sujet !== 'posture' && !(e.hashtags ?? []).some((h) => h.startsWith('postur'))));
  assert.deepEqual(correspondances('running shoes marathon').map((c) => c.entree.id).sort(), ['chaussure', 'sport']);
});

test('variantes de requête : base, variantes du dictionnaire, plus large, diagramme', () => {
  const v = variantesRequete('ingrown toenail brace');
  assert.equal(v[0], 'ingrown toenail brace');
  assert.ok(v.includes('toenail orthonyxia'));
  assert.ok(v.includes('nail brace podiatry'));
  assert.ok(v.includes('ingrown nail diagram'));
  assert.ok(v.length <= 6 && new Set(v).size === v.length);
  const libre = variantesRequete('blue abstract shape');
  assert.deepEqual(libre, ['blue abstract shape', 'abstract shape', 'blue abstract shape diagram']);
  assert.deepEqual(variantesRequete('  '), []);
});

// ------------------------------------------------------------------ Normalisation des réponses

test('Wikimedia : ordre de pertinence, métadonnées HTML nettoyées, hors image et hors hôte écartés', () => {
  const l = referencesDepuisReponse('wikimedia', wikimedia);
  assert.deepEqual(l.map((r) => r.idSource), ['2718281', '31415926']);
  const b = l[1];
  assert.equal(b.titre, 'Ingrown toenail brace diagram');
  assert.equal(b.auteur, 'Exemple');
  assert.equal(b.licence, 'CC BY-SA 4.0');
  assert.equal(b.pageUrl, 'https://commons.wikimedia.org/wiki/File:Ingrown_toenail_brace_diagram.svg');
  assert.ok(b.vignette.startsWith('https://upload.wikimedia.org/'));
  assert.deepEqual(b.tags, ['Ingrown nails', 'Podiatry']);
  assert.equal(b.description, 'Schematic of a nail brace correcting an ingrown toenail.');
  assert.equal(l[0].titre, 'Unguis incarnatus');
  assert.equal(nombreBrut('wikimedia', wikimedia), 4);
  // formatversion 1 : pages en objet
  assert.equal(referencesDepuisReponse('wikimedia', { query: { pages: { a: wikimedia.query.pages[0] } } }).length, 1);
});

test('Openverse : licence lisible, tags, contenu adulte et petites images écartés au filtrage', () => {
  const l = referencesDepuisReponse('openverse', openverse);
  assert.equal(l.length, 3, 'mature écarté dès la lecture');
  assert.equal(l[0].licence, 'CC BY 2.0');
  assert.equal(l[1].licence, 'CC0');
  assert.deepEqual(l[0].tags, ['running', 'marathon', 'shoes']);
  assert.equal(l[0].pageUrl, 'https://www.flickr.com/photos/exemple/123456789');
  assert.equal(filtrerReferences(l).length, 2, 'petite image écartée');
});

test('Pexels et Pixabay : vignette moyenne, licence de la banque, page hors hôte écartée', () => {
  const p = referencesDepuisReponse('pexels', pexels);
  assert.equal(p.length, 1);
  assert.equal(p[0].licence, 'Licence Pexels');
  assert.ok(p[0].vignette.includes('h=350'));
  assert.equal(p[0].description, 'Toddler first steps barefoot on wooden floor');
  const x = referencesDepuisReponse('pixabay', pixabay);
  assert.equal(x.length, 2);
  assert.deepEqual(x[0].tags, ['insole', 'orthotic', 'foot']);
  assert.equal(x[0].description, 'illustration');
  assert.equal(x[0].licence, 'Pixabay Content License');
});

test('Google : identifiant stable, vignette gstatic seulement, licence à vérifier', () => {
  const l = referencesDepuisReponse('google', google);
  assert.equal(l.length, 1);
  assert.equal(l[0].idSource, `g${empreinteCourte('https://www.exemple-clinique.org/images/monofilament.jpg?token=abc')}`);
  assert.ok(l[0].licence.startsWith('À vérifier'));
  assert.ok(vignetteAutorisee('google', 'https://encrypted-tbn0.gstatic.com/images?q=x'));
  assert.ok(!vignetteAutorisee('google', 'https://gstatic.com.evil.example/x'));
  assert.ok(!vignetteAutorisee('wikimedia', 'http://upload.wikimedia.org/x.png'), 'http refusé');
  assert.ok(pageAutorisee('openverse', 'https://www.flickr.com/x'));
  assert.ok(!pageAutorisee('pexels', 'https://evil.example/photo'));
  assert.deepEqual(referencesDepuisReponse('google', { items: 'non' }), []);
});

test('adresses des API : pagination et paramètres', () => {
  const w = new URL(urlRechercheWikimedia('podoscope', 3));
  assert.equal(w.searchParams.get('gsroffset'), '40');
  assert.equal(w.searchParams.get('gsrnamespace'), '6');
  assert.equal(new URL(urlRechercheOpenverse('foot', 2)).searchParams.get('page'), '2');
  assert.equal(new URL(urlReferencesPixabay('k', 'foot', 0)).searchParams.get('page'), '1');
  assert.equal(new URL(urlReferencesPixabay('k', 'foot')).searchParams.get('image_type'), 'all');
  const g = new URL(urlRechercheGoogle('k', 'cx', 'foot', 2));
  assert.equal(g.searchParams.get('searchType'), 'image');
  assert.equal(g.searchParams.get('start'), '11');
  assert.equal(g.searchParams.get('rights'), 'cc_publicdomain|cc_attribute|cc_sharealike');
});

test('User-Agent Wikimedia : ASCII (en-tête HTTP), nom et contact', () => {
  assert.match(USER_AGENT_REFERENCES, /^[ -~]+$/);
  assert.match(USER_AGENT_REFERENCES, /^PlateformeSanteAdmin\/1\.0 \(https:\/\//);
});

test('limites de débit et quota Google estimé', () => {
  const lim = [{ requetes: 2, fenetreMs: 1000 }, { requetes: 3, fenetreMs: 10_000 }];
  assert.equal(fenetresLibres([], lim, 0).ok, true);
  const a = fenetresLibres([100, 200], lim, 500);
  assert.equal(a.ok, false);
  assert.equal(a.attenteMs, 600);
  assert.equal(fenetresLibres([100, 200], lim, 1300).ok, true);
  const b = fenetresLibres([100, 2000, 3000], lim, 4000);
  assert.equal(b.ok, false, 'fenêtre longue atteinte');
  assert.equal(b.attenteMs, 6100);
  assert.equal(quotaGoogleRestant([1, 2, 3], 10), 97);
  assert.equal(quotaGoogleRestant([1], 1 + 25 * 3_600_000), 100);
});

// ------------------------------------------------------------------ Relance par lots de 5

const fausse = (source: SourceReference, i: number): ReferenceImage => ({
  source, idSource: `${i}`, vignette: '', pageUrl: `https://${source}.example/${i}`, imageUrl: null, titre: '', auteur: '', licence: '', licenceUrl: null, largeur: 800, hauteur: 600, tags: [], description: '',
});
const page = (source: SourceReference, debut: number, nb: number) => Array.from({ length: nb }, (_, k) => fausse(source, debut + k));

test('relance : rotation des sources, lot de 5, réserve conservée', () => {
  const sources: SourceReference[] = ['wikimedia', 'openverse'];
  let e = initialiserRelance('ingrown toenail brace');
  let r = prendreLot(e, sources);
  assert.deepEqual(r.aCharger, { source: 'wikimedia', requete: 'ingrown toenail brace', page: 1 });
  e = integrerPage(e, 'wikimedia', { requete: 'ingrown toenail brace', references: page('wikimedia', 0, 20), brut: 20 });
  r = prendreLot(e, sources);
  assert.equal(r.lot.length, 5);
  assert.ok(r.lot.every((x) => x.source === 'wikimedia' && x.requete === 'ingrown toenail brace'));
  assert.deepEqual(requetesDuLot(r.lot), ['ingrown toenail brace']);
  e = r.etat;
  // Lot suivant : l'autre source
  r = prendreLot(e, sources);
  assert.equal(r.aCharger?.source, 'openverse');
  e = integrerPage(e, 'openverse', { requete: 'ingrown toenail brace', references: page('openverse', 0, 20), brut: 20 });
  r = prendreLot(e, sources);
  assert.ok(r.lot.every((x) => x.source === 'openverse'));
  e = r.etat;
  // Retour à Wikimedia : la réserve (15) sert sans nouvel appel
  r = prendreLot(e, sources);
  assert.equal(r.aCharger, null);
  assert.deepEqual(r.lot.map((x) => x.idSource), ['5', '6', '7', '8', '9']);
  assert.equal(new Set(r.etat.vues).size, 15);
  assert.deepEqual(ordreDuTour(['wikimedia', 'openverse', 'pexels'], 4), ['openverse', 'pexels', 'wikimedia']);
});

test('relance : pagination puis variante de requête puis source épuisée', () => {
  let e = initialiserRelance('podoscope');
  assert.ok(e.requetes.length >= 3);
  e = integrerPage(e, 'pexels', { requete: e.requetes[0], references: page('pexels', 0, 20), brut: 20 });
  assert.deepEqual(e.curseurs.pexels, { requete: 0, page: 2, epuisee: false });
  e = integrerPage(e, 'pexels', { requete: e.requetes[0], references: page('pexels', 20, 3), brut: 3 });
  assert.deepEqual(e.curseurs.pexels, { requete: 1, page: 1, epuisee: false }, 'dernière page : variante suivante');
  const r = prendreLot({ ...e, reserves: {} }, ['pexels']);
  assert.equal(r.aCharger?.requete, e.requetes[1]);
  for (let i = 1; i < e.requetes.length; i++) e = integrerPage(e, 'pexels', { requete: e.requetes[i], references: [], brut: 0 });
  assert.equal(e.curseurs.pexels?.epuisee, true);
  // Épuisée : donne ce qui reste sans rien charger
  const fin = prendreLot(e, ['pexels']);
  assert.equal(fin.aCharger, null);
  assert.equal(fin.lot.length, 5);
});

test('relance : déduplication (vues, écartées, même page) et source épuisée complétée par la suivante', () => {
  let e = initialiserRelance('foot', ['wikimedia:0', 'wikimedia:1']);
  const doublon = { ...fausse('wikimedia', 50), pageUrl: 'https://wikimedia.example/2' };
  e = integrerPage(e, 'wikimedia', { requete: 'foot', references: [...page('wikimedia', 0, 4), doublon], brut: 5 });
  assert.deepEqual((e.reserves.wikimedia ?? []).map(cleReference), ['wikimedia:2', 'wikimedia:3'], 'vues et même page écartées');
  e = marquerEpuisee(e, 'wikimedia');
  e = integrerPage(e, 'openverse', { requete: 'foot', references: page('openverse', 0, 20), brut: 20 });
  const r = prendreLot(e, ['wikimedia', 'openverse']);
  assert.deepEqual(r.lot.map(cleReference), ['wikimedia:2', 'wikimedia:3', 'openverse:0', 'openverse:1', 'openverse:2']);
  // Une image montrée ne revient jamais
  const e2 = integrerPage(r.etat, 'openverse', { requete: 'foot', references: page('openverse', 0, 20), brut: 20 });
  assert.ok(!(e2.reserves.openverse ?? []).some((x) => ['openverse:0', 'openverse:1', 'openverse:2'].includes(cleReference(x))));
  // forcer : lot incomplet sans chargement
  const f = prendreLot(initialiserRelance('foot'), ['pexels'], { forcer: true });
  assert.deepEqual([f.lot.length, f.aCharger], [0, null]);
});

test('Google : seulement sur demande ou en dernier recours', () => {
  const dispo: SourceReference[] = ['wikimedia', 'openverse', 'google'];
  let e = initialiserRelance('foot');
  assert.deepEqual(sourcesActives(e, dispo), ['wikimedia', 'openverse']);
  assert.deepEqual(sourcesActives(e, dispo, true), ['wikimedia', 'openverse', 'google']);
  e = marquerEpuisee(marquerEpuisee(e, 'wikimedia'), 'openverse');
  assert.deepEqual(sourcesActives(e, dispo), ['wikimedia', 'openverse', 'google']);
  assert.deepEqual(sourcesActives(e, ['wikimedia', 'openverse']), ['wikimedia', 'openverse'], 'non configuré : jamais');
});

// ------------------------------------------------------------------ Choix, export

test('validation d’un choix : hôtes recontrôlés, étiquettes connues, jamais posture', () => {
  const [ref] = referencesDepuisReponse('wikimedia', wikimedia);
  const ok = validerChoixReference({ reference: ref, etiquettes: ['anatomie', 'trait', 'inconnue'], texte: '  le geste  ', sujets: ['ongles', 'posture'], hashtags: ['#Ongle incarné', 'posturologie'] });
  assert.deepEqual(ok.choix?.etiquettes, ['anatomie', 'trait']);
  assert.equal(ok.choix?.texte, 'le geste');
  assert.deepEqual(ok.choix?.sujets, ['ongles']);
  assert.deepEqual(ok.choix?.hashtags, ['ongle-incarne']);
  assert.equal(validerChoixReference({ reference: { ...ref, vignette: 'https://evil.example/x.png' } }).choix, null);
  assert.equal(validerChoixReference({ reference: { ...ref, source: 'bing' } }).choix, null);
});

test('export public : page nettoyée, ni vignette ni chemin, éléments triés', () => {
  assert.equal(adressePublique('https://www.exemple-clinique.org/diabetic-foot?utm_source=x&page=2#section'), 'https://www.exemple-clinique.org/diabetic-foot?page=2');
  assert.equal(adressePublique('http://exemple.org'), null);
  const l = referencesPourExport([
    { cle_asset: 'picto:orthonyxie', origine: 'wikimedia', page_origine: 'https://commons.wikimedia.org/wiki/File:A.svg', licence_origine: 'CC BY-SA 4.0', etiquettes: ['anatomie', 'x'], objectif: 'le crochet', created_at: '2026-10-07T10:00:00Z', sujets: ['ongles'], hashtags: ['orthonyxie'] },
    { cle_asset: 'dessin:enfant:releve', origine: 'pexels', page_origine: 'https://www.pexels.com/photo/1/?token=s', etiquettes: [], objectif: '', created_at: '2026-10-06T10:00:00Z' },
    { cle_asset: null, origine: 'wikimedia', page_origine: 'https://commons.wikimedia.org/x' },
    { cle_asset: 'picto:a', origine: 'inconnue', page_origine: 'https://x.org' },
  ], { 'picto:orthonyxie': 'Orthonyxie' });
  assert.deepEqual(l.map((x) => x.cle), ['dessin:enfant:releve', 'picto:orthonyxie']);
  assert.equal(l[0].references[0].page, 'https://www.pexels.com/photo/1/');
  assert.equal(l[1].titre, 'Orthonyxie');
  assert.deepEqual(l[1].references[0].etiquettes, ['anatomie']);
  assert.equal(l[1].references[0].texte, 'le crochet');
  const texte = JSON.stringify(l);
  assert.ok(!/vignette|chemin|signed|auteur/.test(texte));
});

// ------------------------------------------------------------------ Suggestions de classement

test('classement : dictionnaire sur les tags des 4 sources', () => {
  const [ov] = referencesDepuisReponse('openverse', openverse);
  const s1 = suggererClassement({ tags: ov.tags, titre: ov.titre });
  assert.equal(s1.sujets[0].id, 'sport');
  assert.ok(s1.hashtags.some((h) => h.tag === 'course'));
  assert.match(s1.sujets[0].raison, /running|marathon/);
  const [px] = referencesDepuisReponse('pexels', pexels);
  assert.equal(suggererClassement({ description: px.description }).sujets[0].id, 'enfant');
  const pb = referencesDepuisReponse('pixabay', pixabay);
  assert.equal(suggererClassement({ tags: pb[0].tags }).sujets[0].id, 'semelles');
  assert.equal(suggererClassement({ tags: pb[1].tags }).sujets[0].id, 'senior');
  const wk = referencesDepuisReponse('wikimedia', wikimedia)[1];
  const s4 = suggererClassement({ tags: wk.tags, titre: wk.titre, description: wk.description });
  assert.equal(s4.sujets[0].id, 'ongles');
  assert.ok(s4.hashtags.some((h) => h.tag === 'orthonyxie'));
  assert.ok(s4.sujets.every((x) => x.confiance > 0 && x.confiance <= 1));
  assert.ok(!suggererClassement({ requete: 'ingrown toenail brace' }).hashtags.some((h) => h.tag === 'ingrown-toenail-brace'), 'requête longue : pas un hashtag');
  assert.ok(suggererClassement({ requete: 'trail running' }).hashtags.some((h) => h.tag === 'trail-running'), 'requête courte : comme avant');
});

test('classement : synonymes demandés par Paul', () => {
  const sujet = (t: string) => suggererClassement({ tags: [t] }).sujets[0]?.id;
  assert.equal(sujet('runner'), 'sport');
  assert.equal(sujet('toddler'), 'enfant');
  assert.equal(sujet('walker'), 'senior');
  assert.equal(sujet('monofilament'), 'diabete');
  assert.equal(sujet('toenail'), 'ongles');
  assert.equal(sujet('orthotic'), 'semelles');
  assert.equal(sujet('chiropodist'), 'pedicurie');
});

test('classement : origine, déjà choisis, co-occurrences, jamais posture', () => {
  const s = suggererClassement({
    requete: 'running shoes', sujetsOrigine: ['sport'], deja: { hashtags: ['course'] },
    voisins: { hashtags: { 'photo:a': ['course', 'trail'], 'photo:b': ['course', 'trail'], 'photo:c': ['course', 'plage'] }, sujets: { 'photo:a': ['sport'], 'photo:b': ['sport', 'enfant'] } },
  });
  assert.ok(!s.hashtags.some((h) => h.tag === 'course'), 'déjà choisi');
  const s2 = suggererClassement({
    tags: ['running'],
    voisins: { hashtags: { 'photo:a': ['course', 'trail'], 'photo:b': ['course', 'trail'], 'photo:c': ['course', 'plage'] }, sujets: { 'photo:a': ['sport'], 'photo:b': ['sport', 'enfant'] } },
  });
  const trail = s2.hashtags.find((h) => h.tag === 'trail');
  assert.ok(trail && /souvent avec #course \(2 visuels\)/.test(trail.raison));
  assert.ok(!s2.hashtags.some((h) => h.tag === 'plage'), 'une seule co-occurrence : ignorée');
  const s3 = suggererClassement({ tags: ['posture', 'posturology', 'posturologie'], requete: 'posture', sujetsOrigine: ['posture'], hashtagsOrigine: ['posture'] });
  assert.ok(!s3.sujets.some((x) => x.id === 'posture'));
  assert.ok(!s3.hashtags.some((x) => x.tag.startsWith('postur')));
  assert.equal(s.sujets[0].id, 'sport', 'requête + sujet de l’élément d’origine');
  assert.ok(s.sujets[0].confiance > 0.5);
  assert.ok(!suggererClassement({ requete: 'running', deja: { sujets: ['sport'] } }).sujets.some((x) => x.id === 'sport'), 'déjà choisi');
});

test('journal des suggestions : validation et synthèse', () => {
  assert.deepEqual(validerDecisionClassement({ contexte: 'photos', nature: 'hashtag', valeur: 'trail', decision: 'refusee' }), { contexte: 'photos', nature: 'hashtag', valeur: 'trail', decision: 'refusee', raison: null });
  assert.equal(validerDecisionClassement({ contexte: 'photos', nature: 'sujet', valeur: 'inconnu', decision: 'acceptee' }), null);
  assert.equal(validerDecisionClassement({ contexte: 'photos', nature: 'hashtag', valeur: 'Pas Normalisé', decision: 'acceptee' }), null);
  assert.ok(validerDecisionClassement({ contexte: 'reference', nature: 'requete', valeur: 'ingrown toenail brace', decision: 'refusee' }));
  const md = markdownSuggestionsRefusees([
    { nature: 'hashtag', valeur: 'trail', decision: 'refusee' }, { nature: 'hashtag', valeur: 'trail', decision: 'refusee' }, { nature: 'hashtag', valeur: 'trail', decision: 'acceptee' },
    { nature: 'sujet', valeur: 'sport', decision: 'acceptee' },
  ]);
  assert.match(md, /#trail : refusée 2 fois, acceptée 1 fois/);
  assert.ok(!md.includes('sport'));
  assert.match(markdownSuggestionsRefusees([]), /Aucune/);
});
