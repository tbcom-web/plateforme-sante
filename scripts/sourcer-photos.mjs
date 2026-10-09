// Passage AUTOMATIQUE du sourcing de photos (workflow .github/workflows/sourcer-photos.yml, à la main ou chaque semaine si Paul
// décommente le « schedule » ; docs/sourcing-photos.md). Rien n'est importé : des SÉRIES sont proposées dans les Arrivages.
// 1. Lit Supabase avec la clé secrète du dépôt (photos gardées, rejetées, déjà proposées ; hashtags, professions, notes ; finalistes de
//    la chaîne des modèles ; séries en attente) et marque « expirée » toute série proposée dont la date est passée.
// 2. Appelle l'endpoint protégé de l'admin (ADMIN_URL/api/sourcing-photos, jeton SOURCING_PHOTOS_JETON) : les clés Pexels / Pixabay
//    restent sur Vercel ; l'endpoint renvoie les séries (aperçus des sources, scores), sans rien écrire.
// 3. Enregistre les séries dans photos_series (0053).
// Aucun secret n'est affiché ni écrit (journal : nombres et titres seulement). Variables : SUPABASE_URL, SUPABASE_SECRET_KEY,
// ADMIN_URL, SOURCING_PHOTOS_JETON (requises) ; PROFESSION (défaut podologue), PROFIL (facultatif), MAX_CIBLES (1 à 3).
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_URL, SOURCING_PHOTOS_JETON } = process.env;
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_URL, SOURCING_PHOTOS_JETON })) if (!v) throw new Error(`${k} est requis (secret du dépôt).`);
const PROFESSION = (process.env.PROFESSION || 'podologue').trim();
const PROFIL = (process.env.PROFIL || '').trim() || null;
const MAX = Math.max(1, Math.min(3, Number(process.env.MAX_CIBLES || 3) || 3));
const base = SUPABASE_URL.replace(/\/$/, '');
const entetes = { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` };

async function lire(table, colonnes, ordre) {
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const r = await fetch(`${base}/rest/v1/${table}?select=${colonnes}${ordre ? `&order=${ordre}` : ''}`, { headers: { ...entetes, Range: `${debut}-${debut + 999}`, 'Range-Unit': 'items' } });
    if (r.status === 404 || (r.status === 400 && /does not exist|PGRST205|42P01/.test(await r.clone().text()))) return null;
    if (!r.ok && r.status !== 206) throw new Error(`Supabase ${r.status} sur ${table}`);
    const page = await r.json();
    lignes.push(...page);
    if (page.length < 1000) return lignes;
  }
}
async function rpc(nom, args = {}) {
  const r = await fetch(`${base}/rest/v1/rpc/${nom}`, { method: 'POST', headers: { ...entetes, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  return r.ok ? r.json() : null;
}

// Fonctions pures du core (mêmes calculs que l'admin), assemblées par esbuild
const tmp = mkdtempSync(join(tmpdir(), 'sourcer-photos-'));
let core;
try {
  await build({
    stdin: { contents: "export { cleCandidatePhoto } from './photos-libres'; export { clePhoto } from './assets-poids'; export { hashtagsDepuisLignes } from './hashtags'; export { rattachementsDepuisLignes, rattachementsDepuisHashtags, fusionnerRattachements, professionsDeLIngredient } from './professions-ingredients'; export { notesPhotos } from './favoris'; export { STATUTS_BOUCLE } from './chaine-modeles';", resolveDir: join(racine, 'packages', 'core', 'src'), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: join(tmp, 'core.mjs'), logLevel: 'warning', loader: { '.svg': 'text' },
  });
  core = await import(pathToFileURL(join(tmp, 'core.mjs')).href);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// 1. Séries expirées (aperçus des sources : affichage temporaire seulement)
const maintenant = new Date().toISOString();
await fetch(`${base}/rest/v1/photos_series?statut=eq.proposee&expire_le=lt.${encodeURIComponent(maintenant)}`, { method: 'PATCH', headers: { ...entetes, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'expiree' }) });

const [avis, libres, series, lignesHashtags, professions, notes, fiches, versions] = await Promise.all([
  lire('photos_libres_avis', 'source,id_source'),
  lire('photos_libres', 'source,id_source,sujet,requete,statut,url'),
  lire('photos_series', 'cible,statut,photos,expire_le', 'created_at.desc'),
  lire('assets_hashtags', 'cle_asset,hashtag,action,created_at', 'created_at.asc'),
  rpc('assets_professions_effectifs'),
  rpc('assets_notes_apprentissage', { p_limite: 20000 }),
  lire('modeles_fiches', 'id,profil,statut,profession,version_courante'),
  lire('modeles_versions', 'modele,version,composition'),
]);
if (series === null) throw new Error('Table photos_series absente : exécuter supabase/migrations/0053_photos_series.sql.');

const hashtags = core.hashtagsDepuisLignes((lignesHashtags ?? []).map((l) => ({ cle: l.cle_asset, hashtag: l.hashtag, action: l.action, le: l.created_at })));
const rattachements = core.fusionnerRattachements(core.rattachementsDepuisLignes(Array.isArray(professions) ? professions : []), core.rattachementsDepuisHashtags(hashtags));
const notesP = core.notesPhotos((Array.isArray(notes) ? notes : []).map((l) => ({ cle: l.cle_asset, note: l.note })));
const dejaVues = new Set([...(avis ?? []), ...(libres ?? [])].map((l) => `${l.source}:${l.id_source}`));
for (const s of series) for (const p of Array.isArray(s.photos) ? s.photos : []) if (p?.source && p?.idSource) dejaVues.add(`${p.source}:${p.idSource}`);
const photos = (libres ?? []).map((l) => {
  const cleC = core.cleCandidatePhoto(l.source, l.id_source);
  const cleI = l.url ? core.clePhoto(l.url) : null;
  return { requete: l.requete, statut: l.statut, professions: core.professionsDeLIngredient(cleI ?? cleC, rattachements), hashtags: [...new Set([...(hashtags[cleC] ?? []), ...(cleI ? hashtags[cleI] ?? [] : [])])], sujets: [l.sujet], note: cleI ? notesP[cleI]?.m ?? null : null };
});
const statutsFinalistes = new Set(['finaliste', ...core.STATUTS_BOUCLE, 'pret-validation']);
const finalistes = (fiches ?? []).filter((f) => f.profession === PROFESSION && statutsFinalistes.has(f.statut)).map((f) => {
  const c = (versions ?? []).find((v) => v.modele === f.id && v.version === f.version_courante)?.composition ?? {};
  return { profil: f.profil, gamme: typeof c.gamme === 'string' && c.gamme ? c.gamme : null, traitement: typeof c.traitement?.id === 'string' ? c.traitement.id : null };
});
const enAttente = series.filter((s) => s.statut === 'proposee' && (!s.expire_le || s.expire_le > maintenant)).map((s) => s.cible);

// 2. Endpoint protégé de l'admin (le jeton n'est jamais affiché)
const r = await fetch(`${ADMIN_URL.replace(/\/$/, '')}/api/sourcing-photos`, {
  method: 'POST', headers: { Authorization: `Bearer ${SOURCING_PHOTOS_JETON}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ profession: PROFESSION, profil: PROFIL, max: MAX, contexte: { dejaVues: [...dejaVues], photos, finalistes, enAttente } }),
  signal: AbortSignal.timeout(320_000),
});
const corps = await r.json().catch(() => null);
if (!r.ok || !corps?.ok) throw new Error(`Endpoint de sourcing : ${r.status} ${corps?.message ?? ''}`.trim());

// 3. Enregistrement des séries proposées
const lignes = Array.isArray(corps.lignes) ? corps.lignes : [];
if (lignes.length) {
  const w = await fetch(`${base}/rest/v1/photos_series`, { method: 'POST', headers: { ...entetes, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(lignes) });
  if (!w.ok) throw new Error(`Séries non enregistrées : Supabase ${w.status}`);
}
for (const b of corps.bilan ?? []) console.log(`${b.libelle} (${b.raison}) : ${b.series} série${b.series > 1 ? 's' : ''}${b.motif ? ` — ${b.motif}` : ''}`);
console.log(`${lignes.length} série${lignes.length > 1 ? 's' : ''} proposée${lignes.length > 1 ? 's' : ''} dans les Arrivages (profession ${PROFESSION}). Rien n'est importé avant l'acceptation de Paul.`);
