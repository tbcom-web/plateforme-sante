// Vérifications avant chaque envoi (npm run verifier), aussi lancées par GitHub (.github/workflows/verifier.yml).
// 1. Types : core, contenus, sites (astro check, la construction Astro ne vérifie pas les types), admin.
// 2. Tests unitaires du core.
// 3. Constructions locales, sans Supabase : la démo et le site de test qui contient TOUS les soins du catalogue
//    (apps/sites/src/data/sites/test-tous-soins.ts), sur deux modèles. Sorties dans un dossier temporaire.
// 4. Contrôle de la charte graphique.
// S'arrête à la première erreur. Aucun secret, aucune publication.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const sites = join(racine, 'apps', 'sites');
const sorties = mkdtempSync(join(tmpdir(), 'verifier-'));

const CONSTRUCTIONS = [
  { site: 'demo-podologue-lyon', modele: 'tableau' },
  { site: 'demo-podologue-lyon', modele: 'technique' },
  { site: 'test-tous-soins', modele: 'tableau' },
  { site: 'test-tous-soins', modele: 'technique' },
];

const etapes = [
  { nom: 'Types : packages/core', cmd: 'npm run verifier:types -w @plateforme/core' },
  { nom: 'Types : packages/contenus', cmd: 'npm run verifier:types -w @plateforme/contenus' },
  { nom: 'Types : apps/sites (astro check)', cmd: 'npm run verifier:types -w apps/sites' },
  { nom: 'Types : apps/admin', cmd: 'npm run verifier:types -w apps/admin' },
  { nom: 'Tests du core', cmd: 'node packages/core/scripts/tests.mjs' },
  ...CONSTRUCTIONS.map(({ site, modele }) => ({
    nom: `Construction : ${site} (${modele})`,
    cmd: `npx astro build --outDir "${join(sorties, `${site}-${modele}`)}"`,
    cwd: sites,
    // PLAN_OSM=non : plan d'accès sans appel à OpenStreetMap (cache local utilisé s'il existe), construction reproductible.
    env: { SITE_ID: site, MODELE: modele, PLAN_OSM: 'non' },
  })),
  { nom: 'Contrôle de la charte', cmd: 'npm run controle:charte -w apps/sites' },
];

const duree = (ms) => `${(ms / 1000).toFixed(1)} s`;
const debut = Date.now();
const bilan = [];
let echec = null;
try {
  for (const e of etapes) {
    console.log(`\n▶ ${e.nom}`);
    const t = Date.now();
    const r = spawnSync(e.cmd, { cwd: e.cwd ?? racine, stdio: 'inherit', shell: true, env: { ...process.env, ...e.env } });
    bilan.push(`${r.status === 0 ? '✓' : '✗'} ${e.nom} (${duree(Date.now() - t)})`);
    if (r.status !== 0) {
      echec = e.nom;
      break;
    }
  }
} finally {
  rmSync(sorties, { recursive: true, force: true });
}

console.log(`\n${bilan.join('\n')}`);
if (echec) {
  console.error(`\nÉchec : ${echec} (${duree(Date.now() - debut)})`);
  process.exit(1);
}
console.log(`\nToutes les vérifications sont passées (${duree(Date.now() - debut)}).`);
