// Volume réaliste pour la mesure des performances de l'admin (npm run perf:admin, faux Supabase) : on part des exports du dépôt
// (retours/*.json, formes réelles) et on les multiplie avec un générateur pseudo-aléatoire à graine fixe (reproductible) :
// ~2 000 notes d'assets, 500 notes d'atelier, 1 500 duels, 300 recettes notées, 200 photos libres, 50 kits, 40 recettes.
// Usage : node donnees.mjs <sortie.json> [url du faux Supabase]
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../retours/', import.meta.url);
const lire = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
let graine = 12345;
const alea = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const pick = (a) => a[Math.floor(alea() * a.length)];
const ADMIN = '00000000-0000-4000-8000-0000000000ad';
const SUPA = process.argv[3] || 'http://127.0.0.1:54490';
const date = (i, n) => new Date(Date.UTC(2026, 8, 1) + Math.floor((i / n) * 37 * 86400000)).toISOString();
const hex = (n) => Array.from({ length: n }, () => Math.floor(alea() * 16).toString(16)).join('');
const uid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;

const assetsEx = lire('assets-notes.json');
const atelierEx = lire('atelier-notes.json');
const duelsEx = lire('duels.json');
const recettesEx = lire('recettes.json');
const statutsEx = lire('illustrations-statuts.json');
const revuesEx = lire('illustrations-revues.json');
const sujetsEx = lire('assets-sujets.json');
const hashtagsEx = lire('assets-hashtags.json');

// Photos libres (200) : URL de stockage du faux Supabase (servies par lui)
const SUJETS = ['enfant', 'sport', 'senior', 'diabete', 'ongles', 'semelles', 'pedicurie', 'general'];
const photos_libres = Array.from({ length: 200 }, (_, i) => {
  const sujet = SUJETS[i % SUJETS.length];
  const idSource = String(1000000 + i * 37);
  const chemin = `banque/libres/${sujet}/pexels-${idSource}-1920.webp`;
  const importee = i % 10 !== 9;
  return {
    id: uid(), source: 'pexels', id_source: idSource, sujet, requete: sujet, etiquettes: [], statut: importee ? 'validee' : 'a_valider',
    chemin: importee ? chemin : null, url: importee ? `${SUPA}/storage/v1/object/public/photos/${chemin}` : null,
    apercu_url: importee ? null : `https://images.pexels.com/photos/${idSource}/pexels-photo-${idSource}.jpeg?w=640`,
    auteur_nom: 'Auteur fictif', auteur_url: null, page_url: null, largeur: 1920, hauteur: 1280, created_at: date(i, 200),
  };
});
const clesPhotos = photos_libres.filter((p) => p.chemin).map((p) => `photo:${p.chemin}`);

// Notes d'assets (2 000) : clés et étiquettes des exports, + des photos libres ; notes un peu déplacées
const assets_notes = Array.from({ length: 2000 }, (_, i) => {
  const ex = pick(assetsEx);
  const cle = i % 5 === 0 ? pick(clesPhotos) : ex.cle;
  // Notes réelles de l'export (répartition des étoiles gardée : ~5 % de 1 ★)
  const note = ex.note;
  return { id: uid(), cle_asset: cle, type: cle.split(':')[0], note, etiquettes: ex.etiquettes ?? [], commentaire: i % 9 === 0 ? 'Commentaire fictif.' : null, positif: null, negatif: null, empreinte: ex.empreinte ?? null, appareil: pick(['les-deux', 'mobile', 'ordinateur']), auteur: ADMIN, created_at: date(i, 2000) };
});

// Notes d'atelier (500)
const atelier_notes = Array.from({ length: 500 }, (_, i) => {
  const ex = pick(atelierEx);
  return { id: uid(), cle_combinaison: i < atelierEx.length ? ex.cle : hex(16), ingredients: ex.ingredients, note: ex.note, etiquettes: ex.etiquettes ?? [], commentaire: null, positif: null, negatif: null, appareil: ex.appareil ?? 'les-deux', auteur: ADMIN, created_at: date(i, 500) };
});

// Duels (1 500) : formes réelles (ingrédients complets, composition comprise), résultats tirés
const duels = Array.from({ length: 1500 }, (_, i) => {
  const ex = pick(duelsEx);
  const inv = alea() < 0.5;
  // Résultat réel de l'export (« les deux sont mauvais » ~4 %), côtés éventuellement inversés
  const res = inv && (ex.resultat === 'a' || ex.resultat === 'b') ? (ex.resultat === 'a' ? 'b' : 'a') : ex.resultat;
  return {
    id: uid(), type: ex.type, scenario: ex.scenario, a_cle: inv ? ex.b : ex.a, b_cle: inv ? ex.a : ex.b,
    a_ingredients: inv ? ex.bIngredients : ex.aIngredients, b_ingredients: inv ? ex.aIngredients : ex.bIngredients,
    dimension_differente: ex.dimension, resultat: res, etiquettes: ex.etiquettes ?? [], remarque: null, appareil: ex.appareil ?? 'les-deux',
    prediction: ex.prediction ?? null, auteur: ADMIN, created_at: date(i, 1500),
  };
});

// Recettes (40) et recettes complètes notées (300)
const recettes = Array.from({ length: 40 }, (_, i) => {
  const ex = recettesEx[i % recettesEx.length];
  return { id: i < recettesEx.length ? ex.id : uid(), nom: `${ex.nom}${i >= recettesEx.length ? ` (${i})` : ''}`, sujets: ex.sujets, couleurs_preferees: ex.couleursPreferees ?? [], composition: ex.composition, note: ex.note ?? pick([3, 4, 5]), etiquettes: ex.etiquettes ?? [], positif: null, negatif: null, statut: 'active', created_at: date(i, 40), updated_at: date(i, 40) };
});
const recettes_notation = Array.from({ length: 300 }, (_, i) => {
  const r = pick(recettes);
  const note = pick([1, 2, 3, 3, 4, 4, 5]);
  return {
    id: uid(), cle: `compo:${hex(16)}`, source: pick(['generateur', 'generateur', 'claude']), source_id: null,
    scenario: { principaux: r.sujets.slice(0, 2), secondaires: r.sujets.slice(2), couleurs: r.couleurs_preferees, soins: [] },
    composition: r.composition, note, garder: note >= 5 && alea() < 0.3, etiquettes_pour: note >= 4 ? [pick(['couleurs', 'polices', 'ensemble'])] : [],
    etiquettes_contre: note <= 2 ? [pick(['polices', 'trop-charge', 'menu'])] : [], pour: null, contre: null, appareil: pick(['les-deux', 'mobile', 'ordinateur']),
    recette: null, predit: 3.4, exploration: false, auteur: ADMIN, created_at: date(i, 300),
  };
});

// Kits d'images notés (50)
const urlsPhotos = photos_libres.filter((p) => p.url).map((p) => p.url);
const kits_images_notes = Array.from({ length: 50 }, (_, i) => {
  const sujet = SUJETS[i % SUJETS.length];
  const note = pick([2, 3, 4, 5, 5]);
  return { id: uid(), sujet, rang: i % 5, cle: `kit:${sujet}:${hex(8)}`, photos: [['accueil', pick(urlsPhotos)], ['page-sujet', pick(urlsPhotos)], ['cabinet', pick(urlsPhotos)], ['soin:bilan-podologique', pick(urlsPhotos)]].map(([emplacement, url]) => ({ emplacement, url })), note, garder: note === 5 && i % 3 === 0, remarque: null, appareil: 'les-deux', auteur: ADMIN, created_at: date(i, 50) };
});

const illustrations_statuts = statutsEx.map((s) => ({ cle: s.cle, statut: s.statut, empreinte: s.empreinte, maj_le: `${s.jour}T08:00:00Z`, maj_par: ADMIN }));
const illustrations_revues = revuesEx.map((r, i) => ({ id: uid(), cle: r.cle, statut: r.statut, commentaire: r.commentaire, empreinte: r.empreinte, auteur: ADMIN, created_at: `${r.jour}T08:${String(i % 60).padStart(2, '0')}:00Z` }));
const assets_sujets = Object.entries(sujetsEx).flatMap(([cle, v]) => [...(v.ajouts ?? []).map((s) => ({ cle_asset: cle, sujet: s, action: 'ajout' })), ...(v.retraits ?? []).map((s) => ({ cle_asset: cle, sujet: s, action: 'retrait' }))]);
const assets_hashtags = Object.entries(hashtagsEx).flatMap(([cle, l]) => (Array.isArray(l) ? l : []).map((h) => ({ cle_asset: cle, hashtag: h, action: 'ajout' })));

writeFileSync(process.argv[2], JSON.stringify({ assets_notes, atelier_notes, duels, recettes, recettes_notation, photos_libres, kits_images_notes, illustrations_statuts, illustrations_revues, assets_sujets, assets_hashtags }));
console.log({ assets_notes: assets_notes.length, atelier_notes: atelier_notes.length, duels: duels.length, recettes: recettes.length, recettes_notation: recettes_notation.length, photos_libres: photos_libres.length, kits: kits_images_notes.length, statuts: illustrations_statuts.length, sujets: assets_sujets.length, hashtags: assets_hashtags.length });
