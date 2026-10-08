// Faux Supabase LOCAL pour la mesure des performances de l'admin (npm run perf:admin) : auth minimale (session factice de
// l'admin), REST (filtres eq/neq/in/is/not.is/gte/lte, order, limit, select simple), RPC d'apprentissage, stockage (une image
// pour toute URL), latence réseau simulée et compteurs par requête (/__stats, /__reset). Aucune donnée réelle hors des exports
// déjà présents dans retours/ (formes réelles, multipliées par donnees.mjs), aucun appel externe, aucune écriture persistante.
// Usage : PORT=54490 LATENCE_MS=25 DONNEES=<donnees.json> node faux-supabase.mjs
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.PORT || 54490);
const LATENCE = Number(process.env.LATENCE_MS ?? 25);
const DIR = new URL('.', import.meta.url);
const maintenant = () => new Date().toISOString();
const ADMIN_ID = '00000000-0000-4000-8000-0000000000ad';
const IMAGE = readFileSync(new URL('../../apps/sites/public/photos/sport-chaussure.webp', DIR));

const T = {
  profiles: [{ id: ADMIN_ID, role: 'admin', email: 'admin@exemple-test.fr' }],
  soins_catalogue: JSON.parse(readFileSync(new URL('./catalogue.json', DIR), 'utf8')),
  jeux_photos: [], recettes_notes: [], defauts_mobile: [], classement_suggestions: [], directeur_avis: [], inspirations: [], modeles: [],
  marques_logo: [], univers_statuts: [], photos_libres_mots_cles: [], photos_sources: [], licences_photos: [], sites: [],
  ...JSON.parse(readFileSync(process.env.DONNEES, 'utf8')),
};
const STATS = [];

const userDe = (req) => {
  const p = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').split('.')[1];
  try { return p && JSON.parse(Buffer.from(p, 'base64url').toString()).sub === ADMIN_ID ? { id: ADMIN_ID } : null; } catch { return null; }
};
const json = (res, code, corps, entetes = {}) => {
  const txt = corps === undefined ? '' : JSON.stringify(corps);
  res.__octets = txt.length;
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...entetes });
  res.end(txt);
};
const valeur = (v) => (v === 'null' ? null : v === 'true' ? true : v === 'false' ? false : v);
function filtrer(lignes, params) {
  let r = lignes;
  for (const [k, brut] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    const [op, ...rest] = brut.split('.');
    const v = rest.join('.');
    if (op === 'eq') r = r.filter((l) => String(l[k]) === v);
    else if (op === 'neq') r = r.filter((l) => String(l[k]) !== v);
    else if (op === 'gte') r = r.filter((l) => String(l[k]) >= v);
    else if (op === 'lte') r = r.filter((l) => String(l[k]) <= v);
    else if (op === 'is') r = r.filter((l) => (l[k] ?? null) === valeur(v));
    else if (op === 'not' && rest[0] === 'is') r = r.filter((l) => (l[k] ?? null) !== valeur(rest.slice(1).join('.')));
    else if (op === 'in') { const set = v.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')); r = r.filter((l) => set.includes(String(l[k]))); }
  }
  return r;
}
function rest(req, res, url) {
  const table = url.pathname.replace('/rest/v1/', '');
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 201, []); // écritures ignorées (mesure seulement)
  let l = filtrer(T[table] ?? [], url.searchParams.entries());
  const order = url.searchParams.get('order');
  if (order) { const [c, sens] = order.split('.'); l = [...l].sort((a, b) => (String(a[c] ?? '') < String(b[c] ?? '') ? -1 : 1) * (sens === 'desc' ? -1 : 1)); }
  const lim = Number(url.searchParams.get('limit') || 0);
  if (lim) l = l.slice(0, lim);
  const sel = url.searchParams.get('select');
  if (sel && sel !== '*' && !sel.includes('(') && !sel.includes('->')) { const cols = sel.split(',').map((c) => c.trim()); l = l.map((x) => Object.fromEntries(cols.filter((c) => c in x).map((c) => [c, x[c]]))); }
  if (String(req.headers.accept ?? '').includes('vnd.pgrst.object')) return l.length === 1 ? json(res, 200, l[0]) : json(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
  return json(res, 200, l, { 'content-range': `0-${Math.max(0, l.length - 1)}/${l.length}` });
}
const sansComposition = (i) => { if (!i || typeof i !== 'object') return i; const { composition, ...r } = i; return r; };
const recents = (l) => [...l].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
function rpc(nom, args) {
  switch (nom) {
    case 'recettes_lecture': return T.recettes.filter((r) => r.statut === 'active' && r.note && r.note >= (args.p_note_min ?? 4)).map(({ id, nom: n, sujets, couleurs_preferees, composition, note, etiquettes, statut }) => ({ id, nom: n, sujets, couleurs_preferees, composition, note, etiquettes, statut }));
    case 'atelier_notes_apprentissage': return recents(T.atelier_notes).map((n) => ({ ingredients: n.ingredients, note: n.note, etiquettes: n.etiquettes, appareil: n.appareil ?? 'les-deux' }));
    case 'recettes_notes_apprentissage': return [];
    case 'defauts_mobile_ouverts': return [];
    case 'assets_sujets_effectifs': return T.assets_sujets;
    case 'assets_hashtags_effectifs': return T.assets_hashtags;
    case 'kits_images_apprentissage': return recents(T.kits_images_notes).map(({ auteur, remarque, id, cle, ...x }) => x);
    case 'recettes_notation_apprentissage': return recents(T.recettes_notation).map(({ auteur, pour, contre, id, source_id, predit, ...x }) => x);
    case 'duels_apprentissage': return recents(T.duels).map(({ auteur, remarque, id, ...x }) => ({ ...x, a_ingredients: sansComposition(x.a_ingredients), b_ingredients: sansComposition(x.b_ingredients) }));
    case 'assets_notes_apprentissage': return [
      ...recents(T.assets_notes).map((n) => ({ cle_asset: n.cle_asset, type: n.type, note: n.note, etiquettes: n.etiquettes, statut: null, appareil: n.appareil ?? 'les-deux' })),
      ...T.illustrations_statuts.filter((x) => ['a_retravailler', 'retire'].includes(x.statut)).map((x) => ({ cle_asset: x.cle, type: x.cle.split(':')[0], note: null, etiquettes: [], statut: x.statut })),
    ];
    default: return null;
  }
}
function traiter(req, res, url, corps) {
  const t0 = performance.now();
  if (!url.pathname.startsWith('/__')) res.on('finish', () => STATS.push({ route: `${req.method} ${url.pathname.replace('/rest/v1/', '').replace('/auth/v1/', 'auth:')}`, ms: +(performance.now() - t0 + LATENCE).toFixed(1), octets: res.__octets ?? 0 }));
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }); return res.end(); }
  try {
    if (url.pathname === '/__reset') { STATS.length = 0; return json(res, 200, { ok: true }); }
    if (url.pathname === '/__stats') {
      const par = {};
      for (const x of STATS) { const p = (par[x.route] ??= { n: 0, ms: 0, octets: 0 }); p.n++; p.ms += x.ms; p.octets += x.octets; }
      return json(res, 200, { total: STATS.length, octets: STATS.reduce((a, x) => a + x.octets, 0), par });
    }
    if (url.pathname.startsWith('/storage/v1/object/')) { res.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'public, max-age=3600' }); return res.end(IMAGE); }
    if (url.pathname === '/auth/v1/user') { const u = userDe(req); return u ? json(res, 200, { id: ADMIN_ID, aud: 'authenticated', role: 'authenticated', email: 'admin@exemple-test.fr', app_metadata: {}, user_metadata: {}, is_anonymous: false, created_at: maintenant() }) : json(res, 401, { code: 'bad_jwt' }); }
    if (url.pathname.startsWith('/auth/v1/')) return json(res, 200, {});
    if (url.pathname.startsWith('/rest/v1/rpc/')) return json(res, 200, rpc(url.pathname.replace('/rest/v1/rpc/', ''), corps ? JSON.parse(corps) : {}));
    if (url.pathname.startsWith('/rest/v1/')) return rest(req, res, url);
    return json(res, 404, {});
  } catch (err) { return json(res, 500, { message: String(err) }); }
}
createServer((req, res) => {
  const url = new URL(req.url, 'http://local');
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => setTimeout(() => traiter(req, res, url, corps), url.pathname.startsWith('/__') ? 0 : LATENCE));
}).listen(PORT, '127.0.0.1', () => console.log(`faux Supabase prêt sur ${PORT} (latence ${LATENCE} ms)`));
