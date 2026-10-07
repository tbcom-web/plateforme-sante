// Export des retours de Paul vers le dépôt (workflow .github/workflows/exporter-retours.yml, chaque nuit ou bouton
// « Envoyer mes retours à Claude maintenant »). Lit Supabase avec la clé secrète (secrets GitHub seulement) et écrit dans
// retours/ (ou $RETOURS_DIR) :
//   assets-notes.json, atelier-notes.json, illustrations-revues.json, illustrations-statuts.json : données brutes, triées
//   SYNTHESE.md : tendances lisibles (fonctions pures du core : syntheseAssets, markdownAssets, syntheseAtelier, markdownAtelier)
// Le dépôt est PUBLIC : seules des colonnes explicites sont lues — jamais d'auteur, d'e-mail, d'identifiant de compte, ni
// aucune table de leads, prospects ou sites. Dates réduites au jour. Aucune date d'export dans les fichiers : un export
// sans nouveau retour ne change rien (pas de commit).
// Variables : SUPABASE_URL, SUPABASE_SECRET_KEY (requises), RETOURS_DIR (facultative). Usage : node scripts/exporter-retours.mjs
import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.');
const sortie = process.env.RETOURS_DIR ? join(process.cwd(), process.env.RETOURS_DIR) : join(racine, 'retours');

/** Lecture paginée d'une table (colonnes explicites) ; table absente (migration pas encore exécutée) → null */
async function lireTout(table, colonnes, ordre) {
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?select=${colonnes}&order=${ordre}`, {
      headers: { apikey: SUPABASE_SECRET_KEY, Range: `${debut}-${debut + 999}`, 'Range-Unit': 'items' },
    });
    if (r.status === 404 || (r.status === 400 && /does not exist|PGRST205|42P01/.test(await r.clone().text()))) return null;
    if (!r.ok && r.status !== 206) throw new Error(`Supabase ${r.status} sur ${table} : ${await r.text()}`);
    const page = await r.json();
    lignes.push(...page);
    if (page.length < 1000) return lignes;
  }
}

// Fonctions pures du core, assemblées par esbuild (TypeScript, imports sans extension), comme les tests du core
const tmp = mkdtempSync(join(tmpdir(), 'exporter-retours-'));
let core;
try {
  await build({
    stdin: {
      contents: "export { syntheseAssets, markdownAssets, titresAssets, typeDeCle, estEtiquetteDuType } from './assets'; export { syntheseAtelier, markdownAtelier, estEtiquetteAtelier } from './atelier';",
      resolveDir: join(racine, 'packages', 'core', 'src'), loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: join(tmp, 'core.mjs'), logLevel: 'warning', loader: { '.svg': 'text' },
  });
  core = await import(pathToFileURL(join(tmp, 'core.mjs')).href);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const jour = (d) => (typeof d === 'string' ? d.slice(0, 10) : null);
const texte = (t) => (typeof t === 'string' && t.trim() ? t.trim() : null);

const [assets, atelier, revues, statuts] = await Promise.all([
  lireTout('assets_notes', 'cle_asset,type,note,etiquettes,commentaire,empreinte,created_at', 'created_at.asc,cle_asset.asc'),
  lireTout('atelier_notes', 'cle_combinaison,ingredients,note,etiquettes,commentaire,created_at', 'created_at.asc,cle_combinaison.asc'),
  lireTout('illustrations_revues', 'cle,statut,commentaire,empreinte,created_at', 'created_at.asc,cle.asc'),
  lireTout('illustrations_statuts', 'cle,statut,empreinte,maj_le', 'cle.asc'),
]);

const notesAssets = (assets ?? []).map((l) => ({ cle: l.cle_asset, type: l.type, note: l.note, etiquettes: l.etiquettes ?? [], commentaire: texte(l.commentaire), empreinte: l.empreinte ?? null, jour: jour(l.created_at) }));
const notesAtelier = (atelier ?? []).map((l) => ({ cle: l.cle_combinaison, ingredients: l.ingredients ?? {}, note: l.note, etiquettes: l.etiquettes ?? [], commentaire: texte(l.commentaire), jour: jour(l.created_at) }));
const journal = (revues ?? []).map((l) => ({ cle: l.cle, statut: l.statut, commentaire: texte(l.commentaire), empreinte: l.empreinte ?? null, jour: jour(l.created_at) }));
const courants = (statuts ?? []).map((l) => ({ cle: l.cle, statut: l.statut, empreinte: l.empreinte ?? null, jour: jour(l.maj_le) }));

mkdirSync(sortie, { recursive: true });
const ecrire = (nom, contenu) => writeFileSync(join(sortie, nom), typeof contenu === 'string' ? contenu : `${JSON.stringify(contenu, null, 2)}\n`);
ecrire('assets-notes.json', notesAssets);
ecrire('atelier-notes.json', notesAtelier);
ecrire('illustrations-revues.json', journal);
ecrire('illustrations-statuts.json', courants);

// Synthèse : dernier commentaire de revue par clé pour « à retravailler » ; dates au jour (ordre des commentaires)
const derniers = new Map();
for (const r of journal) if (r.commentaire) derniers.set(r.cle, r);
const titres = core.titresAssets();
const sAssets = core.syntheseAssets(notesAssets.map((n) => ({ ...n, le: n.jour })), {
  statuts: courants.map((s) => ({ cle: s.cle, statut: s.statut, commentaire: derniers.get(s.cle)?.commentaire ?? null, le: s.jour })),
  titres,
});
const sAtelier = core.syntheseAtelier(notesAtelier.map((n) => ({ ...n, le: n.jour })));
const dernierJour = [...notesAssets, ...notesAtelier, ...journal].map((x) => x.jour).filter(Boolean).sort().pop() ?? null;
const descendre = (md) => md.split('\n').map((l) => (/^#{1,5} /.test(l) ? `#${l}` : l)).join('\n');
const manquantes = [[assets, 'assets_notes (0027)'], [atelier, 'atelier_notes (0026)'], [revues, 'illustrations_revues (0021)']].filter(([d]) => d === null).map(([, n]) => n);

const md = [
  '# Retours de Paul — synthèse',
  '',
  `Export automatique (scripts/exporter-retours.mjs). Données jusqu’au ${dernierJour ?? '—'} : ${notesAssets.length} avis sur les assets, ${notesAtelier.length} sur les thèmes complets, ${journal.length} changements de statut.`,
  'Lire ensuite les JSON du dossier pour le détail ; noter chaque correction faite dans retours/CHANGEMENTS.md (docs/retours.md).',
  ...(manquantes.length ? ['', `Tables absentes (migrations à exécuter) : ${manquantes.join(', ')}.`] : []),
  '',
  core.markdownAssets(sAssets, { titre: '## Assets (icônes, illustrations, photos, gammes, structures)' }),
  '',
  descendre(core.markdownAtelier(sAtelier)),
  '',
].join('\n');
ecrire('SYNTHESE.md', md);
console.log(`Retours exportés dans ${sortie} : ${notesAssets.length} notes d’assets, ${notesAtelier.length} notes de l’atelier, ${journal.length} revues, ${courants.length} statuts.`);
