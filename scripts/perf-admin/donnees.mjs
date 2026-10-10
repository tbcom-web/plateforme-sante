// Volume réaliste pour la mesure des performances de l'admin (npm run perf:admin, faux Supabase) : on part des exports du dépôt
// (retours/*.json, formes réelles) et on les multiplie avec un générateur pseudo-aléatoire à graine fixe (reproductible) :
// ~2 000 notes d'assets, 500 notes d'atelier, 1 500 duels, 300 recettes notées, 200 photos libres, 50 kits, 40 recettes.
// Volume ×N (3e argument ou VOLUME, 2026-10-10 « optimiser les requêtes, la base ») : toutes les tables multipliées par N, plus la
// chaîne des modèles (fiches, versions avec composition, grilles, votes, J'aime, avis, tickets), la Dégustation (degustation_choix)
// et les expositions ; ×10 ≈ 20 000 notes d'assets, 15 000 duels, 500 fiches, 3 000 versions, 5 000 grilles, 50 000 expositions.
// Usage : node donnees.mjs <sortie.json> [url du faux Supabase] [volume]
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../retours/', import.meta.url);
const lire = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
let graine = 12345;
const alea = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const pick = (a) => a[Math.floor(alea() * a.length)];
const ADMIN = '00000000-0000-4000-8000-0000000000ad';
const SUPA = process.argv[3] || 'http://127.0.0.1:54490';
const V = Math.max(1, Number(process.argv[4] || process.env.VOLUME || 1));
const N = (n) => Math.round(n * V);
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
const photos_libres = Array.from({ length: N(200) }, (_, i) => {
  const sujet = SUJETS[i % SUJETS.length];
  const idSource = String(1000000 + i * 37);
  const chemin = `banque/libres/${sujet}/pexels-${idSource}-1920.webp`;
  const importee = i % 10 !== 9;
  return {
    id: uid(), source: 'pexels', id_source: idSource, sujet, requete: sujet, etiquettes: [], statut: importee ? 'validee' : 'a_valider',
    chemin: importee ? chemin : null, url: importee ? `${SUPA}/storage/v1/object/public/photos/${chemin}` : null,
    apercu_url: importee ? null : `https://images.pexels.com/photos/${idSource}/pexels-photo-${idSource}.jpeg?w=640`,
    auteur_nom: 'Auteur fictif', auteur_url: null, page_url: null, largeur: 1920, hauteur: 1280, created_at: date(i, N(200)),
  };
});
const clesPhotos = photos_libres.filter((p) => p.chemin).map((p) => `photo:${p.chemin}`);

// Notes d'assets (2 000) : clés et étiquettes des exports, + des photos libres ; notes un peu déplacées
const assets_notes = Array.from({ length: N(2000) }, (_, i) => {
  const ex = pick(assetsEx);
  const cle = i % 5 === 0 ? pick(clesPhotos) : ex.cle;
  // Notes réelles de l'export (répartition des étoiles gardée : ~5 % de 1 ★)
  const note = ex.note;
  return { id: uid(), cle_asset: cle, type: cle.split(':')[0], note, etiquettes: ex.etiquettes ?? [], commentaire: i % 9 === 0 ? 'Commentaire fictif.' : null, positif: null, negatif: null, empreinte: ex.empreinte ?? null, appareil: pick(['les-deux', 'mobile', 'ordinateur']), auteur: ADMIN, created_at: date(i, N(2000)) };
});

// Notes d'atelier (500)
const atelier_notes = Array.from({ length: N(500) }, (_, i) => {
  const ex = pick(atelierEx);
  return { id: uid(), cle_combinaison: i < atelierEx.length ? ex.cle : hex(16), ingredients: ex.ingredients, note: ex.note, etiquettes: ex.etiquettes ?? [], commentaire: null, positif: null, negatif: null, appareil: ex.appareil ?? 'les-deux', auteur: ADMIN, created_at: date(i, N(500)) };
});

// Duels (1 500) : formes réelles (ingrédients complets, composition comprise), résultats tirés
const duels = Array.from({ length: N(1500) }, (_, i) => {
  const ex = pick(duelsEx);
  const inv = alea() < 0.5;
  // Résultat réel de l'export (« les deux sont mauvais » ~4 %), côtés éventuellement inversés
  const res = inv && (ex.resultat === 'a' || ex.resultat === 'b') ? (ex.resultat === 'a' ? 'b' : 'a') : ex.resultat;
  return {
    id: uid(), type: ex.type, scenario: ex.scenario, a_cle: inv ? ex.b : ex.a, b_cle: inv ? ex.a : ex.b,
    a_ingredients: inv ? ex.bIngredients : ex.aIngredients, b_ingredients: inv ? ex.aIngredients : ex.bIngredients,
    dimension_differente: ex.dimension, resultat: res, etiquettes: ex.etiquettes ?? [], remarque: null, appareil: ex.appareil ?? 'les-deux',
    prediction: ex.prediction ?? null, profession: 'podologue', auteur: ADMIN, created_at: date(i, N(1500)),
  };
});

// Recettes (40) et recettes complètes notées (300)
const recettes = Array.from({ length: 40 }, (_, i) => {
  const ex = recettesEx[i % recettesEx.length];
  return { id: i < recettesEx.length ? ex.id : uid(), nom: `${ex.nom}${i >= recettesEx.length ? ` (${i})` : ''}`, sujets: ex.sujets, couleurs_preferees: ex.couleursPreferees ?? [], composition: ex.composition, note: ex.note ?? pick([3, 4, 5]), etiquettes: ex.etiquettes ?? [], positif: null, negatif: null, statut: 'active', created_at: date(i, 40), updated_at: date(i, 40) };
});
const recettes_notation = Array.from({ length: N(300) }, (_, i) => {
  const r = pick(recettes);
  const note = pick([1, 2, 3, 3, 4, 4, 5]);
  return {
    id: uid(), cle: `compo:${hex(16)}`, source: pick(['generateur', 'generateur', 'claude']), source_id: null,
    scenario: { principaux: r.sujets.slice(0, 2), secondaires: r.sujets.slice(2), couleurs: r.couleurs_preferees, soins: [] },
    composition: r.composition, note, garder: note >= 5 && alea() < 0.3, etiquettes_pour: note >= 4 ? [pick(['couleurs', 'polices', 'ensemble'])] : [],
    etiquettes_contre: note <= 2 ? [pick(['polices', 'trop-charge', 'menu'])] : [], pour: null, contre: null, appareil: pick(['les-deux', 'mobile', 'ordinateur']),
    recette: null, predit: 3.4, exploration: false, auteur: ADMIN, created_at: date(i, N(300)),
  };
});

// Kits d'images notés (50)
const urlsPhotos = photos_libres.filter((p) => p.url).map((p) => p.url);
const kits_images_notes = Array.from({ length: N(50) }, (_, i) => {
  const sujet = SUJETS[i % SUJETS.length];
  const note = pick([2, 3, 4, 5, 5]);
  return { id: uid(), sujet, rang: i % 5, cle: `kit:${sujet}:${hex(8)}`, photos: [['accueil', pick(urlsPhotos)], ['page-sujet', pick(urlsPhotos)], ['cabinet', pick(urlsPhotos)], ['soin:bilan-podologique', pick(urlsPhotos)]].map(([emplacement, url]) => ({ emplacement, url })), note, garder: note === 5 && i % 3 === 0, remarque: null, appareil: 'les-deux', auteur: ADMIN, created_at: date(i, N(50)) };
});

const illustrations_statuts = statutsEx.map((s) => ({ cle: s.cle, statut: s.statut, empreinte: s.empreinte, maj_le: `${s.jour}T08:00:00Z`, maj_par: ADMIN }));
const illustrations_revues = revuesEx.map((r, i) => ({ id: uid(), cle: r.cle, statut: r.statut, commentaire: r.commentaire, empreinte: r.empreinte, auteur: ADMIN, created_at: `${r.jour}T08:${String(i % 60).padStart(2, '0')}:00Z` }));
const assets_sujets = Object.entries(sujetsEx).flatMap(([cle, v]) => [...(v.ajouts ?? []).map((s) => ({ cle_asset: cle, sujet: s, action: 'ajout' })), ...(v.retraits ?? []).map((s) => ({ cle_asset: cle, sujet: s, action: 'retrait' }))]);
const assets_hashtags = Object.entries(hashtagsEx).flatMap(([cle, l]) => (Array.isArray(l) ? l : []).map((h) => ({ cle_asset: cle, hashtag: h, action: 'ajout' })));

// ---- Chaîne des modèles (0050, 0052) : 50 fiches × V (designs sans profil de la podologie), ~6 versions par fiche (compositions
// réelles de recettes-proposees.json et recettes.json), grilles du tournoi (répondues sauf ~3 %), votes A/B, J'aime, avis, tickets ----
const proposees = (() => { try { return lire('recettes-proposees.json').propositions.filter((p) => p.composition); } catch { return []; } })();
const compos = [...proposees.map((p) => p.composition), ...recettesEx.map((r) => r.composition).filter(Boolean)];
const recent = (i, n, jours = 20) => new Date(Date.now() - jours * 86400000 + Math.floor((i / n) * jours * 86400000)).toISOString();
const STATUTS = ['candidat', 'candidat', 'candidat', 'candidat', 'candidat', 'candidat', 'ecarte', 'ecarte', 'ecarte', 'finaliste', 'check-agent', 'avis-humain', 'retouche', 'revalidation', 'pret-validation', 'publie'];
const modeles_fiches = Array.from({ length: N(50) }, (_, i) => {
  const statut = STATUTS[i % STATUTS.length];
  const nbVersions = statut === 'candidat' || statut === 'ecarte' ? 1 + (i % 3) : 6 + (i % 20);
  return {
    id: uid(), nom: `Design ${i + 1}`, profession: 'podologue', profil: null, statut, version_courante: nbVersions, version_publiee: statut === 'publie' ? nbVersions : null,
    version_retouche: null, justification_test: null, justification_version: null, tags: { profession: 'podologue', profils: ['sport-course', 'enfant'], couleurs: ['bleu'] }, tags_valides: statut === 'publie',
    recette: null, origine: pick(['preselection', 'preselection', 'claude']), cle: `compo:${hex(16)}`, rang: statut === 'finaliste' ? 1 + (i % 10) : null,
    scenario: { principaux: ['sport'], secondaires: ['enfant'], couleurs: [] }, auteur: ADMIN, created_at: recent(i, N(50)), updated_at: recent(i, N(50)),
  };
});
const modeles_versions = modeles_fiches.flatMap((f, i) => Array.from({ length: f.version_courante }, (_, v) => {
  const c = compos[(i + v) % compos.length];
  return {
    modele: f.id, version: v + 1, composition: { ...c, visuels: { ...(c.visuels ?? {}), herosSujet: null }, photos: [] }, cle: v ? `compo:${f.id.slice(0, 8)}-v${v + 1}` : f.cle,
    journal: [{ type: v ? 'correction' : 'creation', texte: v ? `retouche ${v}` : 'présélection' }], auteur: v ? 'claude' : ADMIN,
    test: v === f.version_courante - 1 && f.statut !== 'candidat' && f.statut !== 'ecarte' ? { modele: f.id, version: v + 1, verdict: 'vert', le: recent(i, N(50)), controles: Array.from({ length: 30 }, (_, k) => ({ id: `controle-${k}`, statut: 'ok', detail: 'Mesure fictive du testeur sur 6 largeurs.' })) } : null,
    created_at: recent(i * 10 + v, N(50) * 10),
  };
}));
const candidats = modeles_fiches.filter((f) => f.statut === 'candidat' || f.statut === 'ecarte' || f.statut === 'finaliste');
const VOTANTS = [ADMIN, uid(), uid(), uid()];
const modeles_grilles = Array.from({ length: N(500) }, (_, i) => {
  const ids = new Set(); while (ids.size < 6) ids.add(pick(candidats).id);
  const repondue = i % 33 !== 0;
  const servie = recent(i, N(500));
  return { id: uid(), profession: 'podologue', profil: null, profil_demo: 'sport-course', propositions: [...ids], votant: pick(VOTANTS), servie_le: servie, meilleures: repondue ? [0, 3] : null, pire: repondue && i % 2 ? 5 : null, appareil: 'ordinateur', poids: 1, repondue_le: repondue ? servie : null };
});
const modeles_votes = Array.from({ length: N(500) }, (_, i) => { const a = pick(candidats).id; let b = pick(candidats).id; if (a === b) b = candidats[(candidats.findIndex((f) => f.id === a) + 1) % candidats.length].id; return { id: uid(), profession: 'podologue', profil: 'sport-course', a, b, resultat: pick(['a', 'b', 'egalite']), appareil: 'ordinateur', poids: 1, votant: pick(VOTANTS), created_at: recent(i, N(500)) }; });
const jaimeVus = new Set();
const modeles_jaime = Array.from({ length: N(300) }, (_, i) => ({ modele: pick(candidats).id, votant: pick(VOTANTS), created_at: recent(i, N(300)) })).filter((l) => { const k = l.modele + l.votant; if (jaimeVus.has(k)) return false; jaimeVus.add(k); return true; });
const boucle = modeles_fiches.filter((f) => !['candidat', 'ecarte'].includes(f.statut));
const PAGES_T = ['accueil', 'theme', 'fiche', 'cabinet', 'acces', 'article', 'questions', 'soins'];
const modeles_revues = Array.from({ length: N(100) }, (_, i) => { const f = pick(boucle); return { id: uid(), modele: f.id, version: f.version_courante, page: pick(PAGES_T), appareil: pick(['ordinateur', 'mobile']), verdict: pick(['rien', 'tickets', 'revalide']), auteur: pick(VOTANTS), created_at: recent(i, N(100)) }; });
const numeros = new Map();
const modeles_tickets = Array.from({ length: N(300) }, (_, i) => { const f = pick(boucle); const numero = (numeros.get(f.id) ?? 0) + 1; numeros.set(f.id, numero); return { id: uid(), modele: f.id, numero, page: pick(PAGES_T), appareil: pick(['ordinateur', 'mobile']), zone: { forme: 'rect', x: 0.1, y: 0.2, l: 0.3, h: 0.1 }, element: pick(['police:editoriale', 'gamme:pasteque', null]), etiquette: pick(['contraste', 'trop-charge', 'technique:debordement']), commentaire: 'Remarque fictive.', origine: pick(['humain', 'testeur']), gravite: pick(['mineur', 'majeur', null]), controle: null, statut: pick(['ouvert', 'corrige', 'ferme', 'ferme']), version_ouverture: Math.max(1, f.version_courante - 2), version_correction: null, auteur: ADMIN, created_at: recent(i, N(300)), updated_at: recent(i, N(300)) }; });

// ---- Dégustation (0042) : grilles de 6 (ingrédients des duels réels ; compositions pour les « directions ») ----
const FORMATS = ['directions', 'compositions', 'palettes-polices', 'premiers-ecrans', 'kits', 'icones', 'pages'];
const degustation_choix = Array.from({ length: N(500) }, (_, i) => {
  const format = FORMATS[i % FORMATS.length];
  const ex0 = pick(duelsEx);
  // 6 variantes d'une même base qui ne diffèrent que par la dimension de la grille (comme en vrai) : les deux côtés d'un duel réel
  const props = Array.from({ length: 6 }, (_, k) => { const cote = k % 2 ? 'b' : 'a'; const ing0 = ex0[`${cote}Ingredients`] ?? {}; const ing = format === 'directions' ? ing0 : (({ composition, ...r }) => r)(ing0); return { cle: `${ex0[cote]}#${k}`, ingredients: ing }; });
  return { id: uid(), format, type: ex0.type, dimension: ex0.dimension ?? 'couleurs', scenario: ex0.scenario ?? {}, propositions: props, meilleures: [0, 2], pire: i % 3 ? 5 : null, pari: 1, appareil: 'ordinateur', session: `s-${hex(8)}`, duree_ms: 4000, profession: 'podologue', profil: null, auteur: ADMIN, created_at: recent(i, N(500)) };
});

// ---- Expositions (0054) : écrans passés de toutes les surfaces (20 derniers jours) ----
const SURFACES = ['tuiles', 'nouveautes', 'arrivages', 'tri', 'duels', 'recettes', 'degustation', 'preselection', 'tournoi', 'kits', 'atelier'];
const clesExpo = [...new Set([...assets_notes.map((n) => n.cle_asset), ...modeles_fiches.map((f) => f.cle)])];
const expositions = Array.from({ length: N(5000) }, (_, i) => ({ id: uid(), cle: pick(clesExpo), surface: pick(SURFACES), ecran: `e-${hex(10)}`, resultat: pick(['choisi', 'pas-choisi', 'pas-choisi', 'ignore', 'note']), note: null, etiquettes: [], texte: null, auteur: ADMIN, created_at: recent(i, N(5000)) }));
const chaine = { modeles_fiches, modeles_versions, modeles_grilles, modeles_votes, modeles_jaime, modeles_revues, modeles_tickets, degustation_choix, expositions };

writeFileSync(process.argv[2], JSON.stringify({ ...chaine, assets_notes, atelier_notes, duels, recettes, recettes_notation, photos_libres, kits_images_notes, illustrations_statuts, illustrations_revues, assets_sujets, assets_hashtags }));
console.log({ assets_notes: assets_notes.length, atelier_notes: atelier_notes.length, duels: duels.length, recettes: recettes.length, recettes_notation: recettes_notation.length, photos_libres: photos_libres.length, kits: kits_images_notes.length, statuts: illustrations_statuts.length, sujets: assets_sujets.length, hashtags: assets_hashtags.length, ...Object.fromEntries(Object.entries(chaine).map(([k, v]) => [k, v.length])) });
