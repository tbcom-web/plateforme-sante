// Faux Supabase LOCAL pour la mesure des performances de l'admin (npm run perf:admin) : auth minimale (session factice de
// l'admin), REST (filtres eq/neq/in/is/not.is/gte/lte/like, or, order multiple, limit/offset, select simple, count exact, HEAD),
// RPC d'apprentissage, stockage (une image pour toute URL), latence réseau simulée et compteurs par requête (/__stats, /__reset).
// Aucune donnée réelle hors des exports déjà présents dans retours/ (formes réelles, multipliées par donnees.mjs), aucun appel
// externe, aucune écriture persistante (écritures gardées en mémoire pour les tables de MEMOIRE seulement, sinon ignorées).
// Coût simulé d'une requête (2026-10-10, « base lente ») : LATENCE_MS (aller-retour) + taille de la réponse / DEBIT_KO_MS
// (sérialisation jsonb + transfert) + lignes parcourues × LIGNE_US (lecture sans index adapté : la table entière est parcourue).
// SANS=<liste> : tables ou fonctions absentes (ex. SANS=apprentissage_instantane,chaine_compteurs → repli du code sans la migration).
// SANS=0062 : migration 0062 pas exécutée (ni chaine_etat, ni compteurs des fiches, versions, duels, avis et « J'aime »).
// Usage : PORT=54490 LATENCE_MS=15 DEBIT_KO_MS=20 LIGNE_US=0.5 DONNEES=<donnees.json> node faux-supabase.mjs
import { createServer } from 'node:http';
import { appendFileSync, readFileSync } from 'node:fs';

const PORT = Number(process.env.PORT || 54490);
const LATENCE = Number(process.env.LATENCE_MS ?? 25);
const DEBIT = Number(process.env.DEBIT_KO_MS ?? 0) * 1024; // octets par ms (0 = illimité)
const LIGNE_US = Number(process.env.LIGNE_US ?? 0);
const SANS = new Set(String(process.env.SANS ?? '').split(',').filter(Boolean));
const DIR = new URL('.', import.meta.url);
const maintenant = () => new Date().toISOString();
const ADMIN_ID = '00000000-0000-4000-8000-0000000000ad';
const IMAGE = readFileSync(new URL('../../apps/sites/public/photos/sport-chaussure.webp', DIR));

const T = {
  profiles: [{ id: ADMIN_ID, role: 'admin', role_equipe: null, email: 'admin@exemple-test.fr' }],
  soins_catalogue: JSON.parse(readFileSync(new URL('./catalogue.json', DIR), 'utf8')),
  jeux_photos: [], recettes_notes: [], defauts_mobile: [], classement_suggestions: [], directeur_avis: [], inspirations: [], modeles: [],
  marques_logo: [], univers_statuts: [], photos_libres_mots_cles: [], photos_sources: [], licences_photos: [], sites: [],
  apprentissage_instantane: [], regles_apprises_reglages: [], elements_reevalues: [],
  ...JSON.parse(readFileSync(process.env.DONNEES, 'utf8')),
};
// Migration 0059 : compteurs des sources de l'apprentissage (fixes : les écritures du banc sont ignorées) et vues
for (const t of ['atelier_notes', 'assets_notes', 'illustrations_statuts', 'assets_sujets', 'assets_hashtags', 'assets_professions', 'recettes', 'recettes_notes', 'recettes_notation', 'duels', 'degustation_choix', 'kits_images_notes', 'expositions', 'regles_apprises_reglages', 'elements_reevalues', 'modeles_grilles', 'modeles_tickets', 'photos_libres', 'jeux_photos', 'illustrations_revues', 'soins_catalogue']) (T.apprentissage_sources ??= []).push({ nom: t, n: (T[t] ?? []).length, maj_le: maintenant() });
// Migration 0062 : compteurs des autres tables de la chaîne (mémoire de la chaîne par signature) ; SANS=0062 → absents
if (!SANS.has('0062')) for (const t of ['modeles_fiches', 'modeles_versions', 'modeles_votes', 'modeles_revues', 'modeles_jaime']) T.apprentissage_sources.push({ nom: t, n: (T[t] ?? []).length, maj_le: maintenant() });
const VUES = {
  modeles_versions_utiles: () => { const f = new Map((T.modeles_fiches ?? []).map((x) => [x.id, x])); return (T.modeles_versions ?? []).flatMap((v) => { const x = f.get(v.modele); return x && (v.version === x.version_courante || v.version === x.version_courante - 1) ? [{ modele: v.modele, version: v.version, composition: v.composition, cle: v.cle, journal: v.journal, auteur: v.auteur, created_at: v.created_at, profession: x.profession, test: v.version === x.version_courante ? v.test : null }] : []; }); },
  modeles_jaime_compteurs: () => { const n = {}; for (const j of T.modeles_jaime ?? []) n[j.modele] = (n[j.modele] ?? 0) + 1; return Object.entries(n).map(([modele, k]) => ({ modele, n: k })); },
  degustation_choix_legers: () => (T.degustation_choix ?? []).map(({ propositions, auteur, id, ...x }) => ({ ...x, propositions: (propositions ?? []).map((p) => ({ cle: p.cle, ingredients: { element: p.ingredients?.element ?? null } })) })),
  assets_cles_notees: () => [...new Set((T.assets_notes ?? []).filter((x) => x.note !== null && x.note !== undefined).map((x) => x.cle_asset))].map((cle_asset) => ({ cle_asset })),
};
// Tables dont les écritures sont gardées (instantanés d'apprentissage : relus par les requêtes suivantes, comme en base)
// + chaîne des modèles : l'automate écrit tickets, résultats de test et statuts une fois (comme en base), sans les rejouer à chaque page
const MEMOIRE = new Set(['apprentissage_instantane', 'modeles_fiches', 'modeles_versions', 'modeles_tickets', 'modeles_grilles', 'modeles_votes', 'modeles_jaime', 'modeles_revues']);
// Valeurs par défaut des colonnes (0050) : une fiche ajoutée sans statut est « candidat », comme en base
const DEFAUTS = { modeles_fiches: () => ({ statut: 'candidat', version_courante: 1, version_publiee: null, version_retouche: null, tags: {}, tags_valides: false, origine: 'preselection', rang: null, scenario: {}, recette: null }) };
const nouvelId = () => `${Date.now().toString(16).padStart(8, '0').slice(-8)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;
const compter = (table) => { const x = (T.apprentissage_sources ?? []).find((l) => l.nom === table); if (x) { x.n++; x.maj_le = maintenant(); } };
const STATS = [];

const userDe = (req) => {
  const p = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').split('.')[1];
  try { return p && JSON.parse(Buffer.from(p, 'base64url').toString()).sub === ADMIN_ID ? { id: ADMIN_ID } : null; } catch { return null; }
};
const json = (res, code, corps, entetes = {}, sansCorps = false) => {
  const txt = corps === undefined || sansCorps ? '' : JSON.stringify(corps);
  res.__octets = txt.length;
  const delai = res.__mesure ? (DEBIT ? txt.length / DEBIT : 0) + ((res.__lignes ?? 0) * LIGNE_US) / 1000 : 0;
  const envoyer = () => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...entetes }); res.end(txt); };
  if (delai >= 1) setTimeout(envoyer, delai); else envoyer();
};
const absente = (res, nom, fonction = false) => json(res, 404, fonction
  ? { code: 'PGRST202', message: `Could not find the function public.${nom} in the schema cache` }
  : { code: 'PGRST205', message: `Could not find the table 'public.${nom}' in the schema cache` });
const valeur = (v) => (v === 'null' ? null : v === 'true' ? true : v === 'false' ? false : v);
// Motif LIKE (* ou %) → expression régulière ; caractères spéciaux échappés (barre oblique inverse : code 92)
const BS = String.fromCharCode(92);
const motif = (p) => new RegExp('^' + p.split(/[*%]/).map((x) => [...x].map((c) => (('.+?^$' + '{}()|[]' + BS).includes(c) ? BS + c : c)).join('')).join('.*') + '$');
// Condition PostgREST simple (col.op.valeur) pour or=(…)
const condition = (c) => { const [col, ...reste] = c.split('.'); return (l) => filtrer([l], [[col, reste.join('.')]]).length === 1; };
const texte = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
function filtrer(lignes, params) {
  let r = lignes;
  for (const [k, brut] of params) {
    if (k === 'or') { const conds = brut.replace(/^\(|\)$/g, '').split(',').map(condition); r = r.filter((l) => conds.some((f) => f(l))); continue; }
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    const [op, ...rest] = brut.split('.');
    const v = rest.join('.');
    if (op === 'eq') r = r.filter((l) => texte(l[k]) === v);
    else if (op === 'neq') r = r.filter((l) => texte(l[k]) !== v);
    else if (op === 'gte') r = r.filter((l) => texte(l[k]) >= v);
    else if (op === 'gt') r = r.filter((l) => texte(l[k]) > v);
    else if (op === 'lte') r = r.filter((l) => texte(l[k]) <= v);
    else if (op === 'lt') r = r.filter((l) => texte(l[k]) < v);
    else if (op === 'is') r = r.filter((l) => (l[k] ?? null) === valeur(v));
    else if (op === 'not' && rest[0] === 'is') r = r.filter((l) => (l[k] ?? null) !== valeur(rest.slice(1).join('.')));
    else if (op === 'like' || op === 'ilike') r = r.filter((l) => motif(v).test(String(l[k] ?? '')));
    else if (op === 'not' && (rest[0] === 'like' || rest[0] === 'ilike')) r = r.filter((l) => l[k] !== null && l[k] !== undefined && !motif(rest.slice(1).join('.')).test(String(l[k])));
    else if (op === 'in') { const set = v.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')); r = r.filter((l) => set.includes(String(l[k]))); }
  }
  return r;
}
const comparer = (order) => {
  const cles = order.split(',').map((o) => { const [c, sens] = o.split('.'); return { c, d: sens === 'desc' ? -1 : 1 }; });
  return (a, b) => { for (const { c, d } of cles) { const x = texte(a[c]), y = texte(b[c]); if (x !== y) return (x < y ? -1 : 1) * d; } return 0; };
};
function projeter(l, sel) {
  if (!sel || sel === '*' || sel.includes('(')) return l;
  const cols = sel.split(',').map((c) => c.trim().replace(/::[a-z]+$/, '')).map((c) => {
    const [alias, chemin] = c.includes(':') ? c.split(':') : [null, c];
    const [col, cle] = chemin.split(/->>?/);
    return { alias: alias ?? (cle ? cle : col), col, cle };
  });
  return l.map((x) => Object.fromEntries(cols.filter((c) => c.col in x).map((c) => [c.alias, c.cle ? (x[c.col]?.[c.cle] ?? null) : x[c.col]])));
}
function ecrire(req, res, url, table, corps) {
  if (!MEMOIRE.has(table)) return json(res, 201, []); // écritures ignorées (mesure seulement)
  const t = (T[table] ??= []);
  const lignes = (() => { try { const c = JSON.parse(corps || '[]'); return Array.isArray(c) ? c : [c]; } catch { return []; } })();
  const conflit = (url.searchParams.get('on_conflict') ?? '').split(',').filter(Boolean);
  const ecrites = [];
  // Index uniques de la base (0050) : un design déjà candidat (même profession et même clé) est refusé (23505), comme en vrai
  if (req.method === 'POST' && table === 'modeles_fiches' && lignes.some((l) => t.some((x) => x.profession === (l.profession ?? 'podologue') && x.cle === l.cle && (x.profil ?? null) === (l.profil ?? null)))) return json(res, 409, { code: '23505', message: 'duplicate key value violates unique constraint "modeles_fiches_design_idx"' });
  if (req.method === 'POST') {
    for (const l of lignes) {
      const i = conflit.length ? t.findIndex((x) => conflit.every((c) => texte(x[c]) === texte(l[c]))) : -1;
      const n = { ...(i >= 0 ? t[i] : { id: nouvelId(), created_at: maintenant(), ...(DEFAUTS[table]?.() ?? {}) }), ...l, ...(table === 'apprentissage_instantane' ? { maj_le: l.maj_le ?? maintenant() } : {}) };
      if (i >= 0) t[i] = n; else t.push(n);
      ecrites.push(n);
    }
  } else if (req.method === 'PATCH') {
    for (const x of filtrer(t, url.searchParams.entries())) { Object.assign(x, lignes[0] ?? {}); ecrites.push(x); }
  } else if (req.method === 'DELETE') {
    const sup = new Set(filtrer(t, url.searchParams.entries()));
    T[table] = t.filter((x) => !sup.has(x));
    ecrites.push(...sup);
  }
  // Déclencheurs de 0059 (tables de transition) : seulement si l'instruction a touché au moins une ligne
  if (ecrites.length) compter(table);
  // JOURNAL_ECRITURES=<fichier> : écritures gardées (diagnostic du banc : qui périme les instantanés)
  if (process.env.JOURNAL_ECRITURES && ecrites.length) appendFileSync(process.env.JOURNAL_ECRITURES, `${new Date().toISOString()} ${req.method} ${table} ${ecrites.length} ${url.search.slice(0, 160)} ${String(corps).slice(0, 160)}
`);
  const unique = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
  if (unique) return ecrites.length === 1 ? json(res, 201, projeter(ecrites, url.searchParams.get('select'))[0]) : json(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
  return json(res, 201, String(req.headers.prefer ?? '').includes('return=representation') ? projeter(ecrites, url.searchParams.get('select')) : []);
}
function rest(req, res, url, corps) {
  const table = url.pathname.replace('/rest/v1/', '');
  if (SANS.has(table)) return absente(res, table);
  if (req.method !== 'GET' && req.method !== 'HEAD') return ecrire(req, res, url, table, corps);
  const source = VUES[table] ? VUES[table]() : T[table] ?? [];
  // Vue : la base parcourt les tables jointes (≈ lignes de la plus grande)
  res.__lignes = VUES[table] ? Math.max(source.length, (T[{ modeles_versions_utiles: 'modeles_versions', modeles_jaime_compteurs: 'modeles_jaime', assets_cles_notees: 'assets_notes', degustation_choix_legers: 'degustation_choix' }[table]] ?? []).length) : source.length;
  let l = filtrer(source, url.searchParams.entries());
  const order = url.searchParams.get('order');
  if (order) l = [...l].sort(comparer(order));
  const total = l.length;
  const off = Number(url.searchParams.get('offset') || 0);
  const lim = Number(url.searchParams.get('limit') || 0);
  if (off) l = l.slice(off);
  if (lim) l = l.slice(0, lim);
  l = projeter(l, url.searchParams.get('select'));
  if (String(req.headers.accept ?? '').includes('vnd.pgrst.object')) return l.length === 1 ? json(res, 200, l[0]) : json(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
  const compte = String(req.headers.prefer ?? '').includes('count=exact');
  return json(res, 200, l, { 'content-range': `${off}-${Math.max(off, off + l.length - 1)}/${compte ? total : '*'}` }, req.method === 'HEAD');
}
const sansComposition = (i) => { if (!i || typeof i !== 'object') return i; const { composition, ...r } = i; return r; };
const recents = (l) => [...l].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
const VERROUS = new Map();
function rpc(nom, args) {
  switch (nom) {
    case 'recettes_lecture': return T.recettes.filter((r) => r.statut === 'active' && r.note && r.note >= (args.p_note_min ?? 4)).map(({ id, nom: n, sujets, couleurs_preferees, composition, note, etiquettes, statut }) => ({ id, nom: n, sujets, couleurs_preferees, composition, note, etiquettes, statut }));
    case 'atelier_notes_apprentissage': return recents(T.atelier_notes).slice(0, args.p_limite ?? 5000).map((n) => ({ ingredients: n.ingredients, note: n.note, etiquettes: n.etiquettes, appareil: n.appareil ?? 'les-deux' }));
    case 'recettes_notes_apprentissage': return [];
    case 'defauts_mobile_ouverts': return [];
    case 'assets_sujets_effectifs': return T.assets_sujets;
    case 'assets_hashtags_effectifs': return T.assets_hashtags;
    case 'kits_images_apprentissage': return recents(T.kits_images_notes).map(({ auteur, remarque, id, cle, ...x }) => x);
    case 'recettes_notation_apprentissage': return recents(T.recettes_notation).map(({ auteur, pour, contre, id, source_id, predit, ...x }) => x);
    case 'duels_apprentissage': return recents(T.duels).slice(0, args.p_limite ?? 20000).map(({ auteur, remarque, id, ...x }) => ({ ...x, a_ingredients: sansComposition(x.a_ingredients), b_ingredients: sansComposition(x.b_ingredients) }));
    case 'degustation_apprentissage': return recents(T.degustation_choix ?? []).slice(0, args.p_limite ?? 20000).map(({ auteur, session, duree_ms, id, ...x }) => ({ ...x, propositions: (x.propositions ?? []).map((p) => ({ ...p, ingredients: sansComposition(p.ingredients) })) }));
    case 'avancer_modele': { const f = (T.modeles_fiches ?? []).find((x) => x.id === args.p_id); if (f) { f.statut = args.p_vers; if (args.p_rang !== undefined) f.rang = args.p_rang; } return null; }
    case 'equipe_chaine': return T.profiles.map((p) => ({ id: p.id, email: p.email, role_equipe: p.role === 'admin' ? 'validateur' : p.role_equipe }));
    case 'assets_notes_apprentissage': return [
      ...recents(T.assets_notes).map((n) => ({ cle_asset: n.cle_asset, type: n.type, note: n.note, etiquettes: n.etiquettes, statut: null, appareil: n.appareil ?? 'les-deux' })),
      ...T.illustrations_statuts.filter((x) => ['a_retravailler', 'retire'].includes(x.statut)).map((x) => ({ cle_asset: x.cle, type: x.cle.split(':')[0], note: null, etiquettes: [], statut: x.statut })),
    ];
    // Agrégats de la chaîne (0059) : apparitions / choix / pire par candidat, J'aime par modèle
    case 'chaine_compteurs': {
      const ids = new Set((T.modeles_fiches ?? []).filter((f) => !args.p_profession || f.profession === args.p_profession).map((f) => f.id));
      const jaime = {};
      for (const j of T.modeles_jaime ?? []) if (ids.has(j.modele)) jaime[j.modele] = (jaime[j.modele] ?? 0) + 1;
      return Object.entries(jaime).map(([modele, n]) => ({ modele, jaime: n }));
    }
    // État de la chaîne en une requête (0062) : fiches, versions utiles ou toutes, tickets, duels, avis, grilles, J'aime comptés
    case 'chaine_etat': {
      if (SANS.has('0062')) return undefined;
      const cmp = (...k) => comparer(k.join(','));
      const fiches = (T.modeles_fiches ?? []).filter((f) => !args.p_profession || f.profession === args.p_profession).sort(cmp('created_at', 'id'));
      const parId = new Map(fiches.map((f) => [f.id, f]));
      const garder = (o, cols) => Object.fromEntries(cols.map((c) => [c, o[c] ?? null]));
      const CV = ['modele', 'version', 'composition', 'cle', 'journal', 'auteur', 'test', 'created_at'];
      const versions = (T.modeles_versions ?? []).flatMap((v) => { const f = parId.get(v.modele); if (!f) return []; if (args.p_versions !== 'toutes') { if (v.version !== f.version_courante && v.version !== f.version_courante - 1) return []; return [{ ...garder(v, CV), test: v.version === f.version_courante ? v.test ?? null : null }]; } return [garder(v, CV)]; }).sort(cmp('version', 'modele'));
      const grilles = (T.modeles_grilles ?? []).filter((g) => (g.propositions ?? []).every((p) => parId.has(p)) && (g.repondue_le || Date.parse(g.servie_le) >= Date.now() - 15 * 60_000)).sort(cmp('servie_le', 'id'));
      const jaime = {};
      for (const j of T.modeles_jaime ?? []) if (parId.has(j.modele)) jaime[j.modele] = (jaime[j.modele] ?? 0) + 1;
      return {
        fiches: fiches.map((f) => garder(f, ['id', 'nom', 'profession', 'profil', 'statut', 'version_courante', 'version_publiee', 'version_retouche', 'justification_test', 'justification_version', 'tags', 'tags_valides', 'recette', 'origine', 'cle', 'rang', 'scenario', 'created_at'])),
        versions,
        tickets: (T.modeles_tickets ?? []).filter((x) => parId.has(x.modele)).sort(cmp('numero', 'id')).map((x) => garder(x, ['id', 'numero', 'modele', 'page', 'appareil', 'zone', 'element', 'etiquette', 'commentaire', 'origine', 'gravite', 'auteur', 'statut', 'version_ouverture', 'version_correction', 'controle', 'created_at'])),
        votes: (T.modeles_votes ?? []).filter((x) => parId.has(x.a) && parId.has(x.b)).sort(cmp('created_at', 'id')).map((x) => garder(x, ['profil', 'a', 'b', 'resultat', 'votant', 'poids', 'created_at'])),
        revues: (T.modeles_revues ?? []).filter((x) => parId.has(x.modele)).sort(cmp('created_at', 'id')).map((x) => garder(x, ['modele', 'version', 'page', 'appareil', 'auteur', 'verdict', 'created_at'])),
        grilles: grilles.map((x) => garder(x, ['id', 'profil', 'propositions', 'votant', 'servie_le', 'meilleures', 'pire', 'poids', 'repondue_le'])),
        jaime: Object.entries(jaime).sort(([a], [b]) => (a < b ? -1 : 1)).map(([modele, n]) => ({ modele, n })),
      };
    }
    // Verrous du recalcul de l'apprentissage (0060) : un seul recalcul à la fois par clé
    case 'prendre_verrou_apprentissage': { const v = VERROUS.get(args.p_cle); if (v && v > Date.now()) return false; VERROUS.set(args.p_cle, Date.now() + 1000 * (args.p_secondes ?? 150)); return true; }
    case 'rendre_verrou_apprentissage': VERROUS.delete(args.p_cle); return null;
    case 'apprentissage_signatures': return (args.p_tables ?? []).map((t) => { const l = T[t] ?? []; let d = ''; for (const x of l) { const v = x.created_at ?? x.maj_le ?? ''; if (v > d) d = v; } return { nom: t, lignes: l.length, derniere: d || null }; });
    default: return undefined;
  }
}
function traiter(req, res, url, corps) {
  const t0 = performance.now();
  res.__mesure = !url.pathname.startsWith('/__');
  if (res.__mesure) res.on('finish', () => STATS.push({ route: `${req.method} ${url.pathname.replace('/rest/v1/', '').replace('/auth/v1/', 'auth:')}`, ms: +(performance.now() - t0 + LATENCE).toFixed(1), octets: res.__octets ?? 0 }));
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }); return res.end(); }
  try {
    if (url.pathname === '/__reset') { STATS.length = 0; return json(res, 200, { ok: true }); }
    // Un vote simulé (banc --apres-vote) : le compteur de la table augmente, comme le déclencheur de 0059
    if (url.pathname === '/__toucher') { compter(url.searchParams.get('table') ?? 'duels'); return json(res, 200, { ok: true }); }
    if (url.pathname === '/__vider') { T.apprentissage_instantane = []; return json(res, 200, { ok: true }); }
    if (url.pathname === '/__stats') {
      const par = {};
      for (const x of STATS) { const p = (par[x.route] ??= { n: 0, ms: 0, octets: 0 }); p.n++; p.ms += x.ms; p.octets += x.octets; }
      return json(res, 200, { total: STATS.length, octets: STATS.reduce((a, x) => a + x.octets, 0), par });
    }
    if (url.pathname.startsWith('/storage/v1/object/')) { res.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'public, max-age=3600' }); return res.end(IMAGE); }
    if (url.pathname === '/auth/v1/user') { const u = userDe(req); return u ? json(res, 200, { id: ADMIN_ID, aud: 'authenticated', role: 'authenticated', email: 'admin@exemple-test.fr', app_metadata: {}, user_metadata: {}, is_anonymous: false, created_at: maintenant() }) : json(res, 401, { code: 'bad_jwt' }); }
    if (url.pathname.startsWith('/auth/v1/')) return json(res, 200, {});
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const nom = url.pathname.replace('/rest/v1/rpc/', '');
      if (SANS.has(nom)) return absente(res, nom, true);
      const args = corps ? JSON.parse(corps) : {};
      const r = rpc(nom, args);
      if (nom === 'chaine_etat') res.__lignes = ['modeles_fiches', 'modeles_versions', 'modeles_tickets', 'modeles_votes', 'modeles_revues', 'modeles_grilles', 'modeles_jaime'].reduce((s, k) => s + (T[k] ?? []).length, 0);
      return r === undefined ? absente(res, nom, true) : json(res, 200, r);
    }
    if (url.pathname.startsWith('/rest/v1/')) return rest(req, res, url, corps);
    return json(res, 404, {});
  } catch (err) { return json(res, 500, { message: String(err) }); }
}
createServer((req, res) => {
  const url = new URL(req.url, 'http://local');
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => setTimeout(() => traiter(req, res, url, corps), url.pathname.startsWith('/__') ? 0 : LATENCE));
}).listen(PORT, '127.0.0.1', () => console.log(`faux Supabase prêt sur ${PORT} (latence ${LATENCE} ms, débit ${DEBIT / 1024 || '∞'} Ko/ms, ${LIGNE_US} µs/ligne)`));
