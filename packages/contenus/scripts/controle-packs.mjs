// Contrôle des packs de contenus par profession (packages/contenus/professions/<profession>/index.ts) : lexique, sources des
// affirmations réglementaires, renvois, scènes d'images, statut. Assemble le pack avec esbuild (TypeScript, imports sans
// extension), puis appelle sa fonction de contrôle. Usage : npm run controle:packs -w @plateforme/contenus [-- --apercu <fichier.json>]
// (--apercu : écrit le pack en JSON, pour l'aperçu de démonstration). Aucun réseau, aucune publication.
import { build } from 'esbuild';
import { mkdtempSync, readdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'professions');
const apercu = process.argv.includes('--apercu') ? process.argv[process.argv.indexOf('--apercu') + 1] : null;
const packs = readdirSync(racine, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(racine, d.name, 'index.ts'))).map((d) => d.name);
const sortie = mkdtempSync(join(tmpdir(), 'controle-packs-'));
let echec = false;
try {
  for (const nom of packs) {
    const fichier = join(sortie, `${nom}.mjs`);
    await build({ entryPoints: [join(racine, nom, 'index.ts')], bundle: true, platform: 'node', format: 'esm', outfile: fichier, logLevel: 'warning', loader: { '.svg': 'text', '.css': 'text' } });
    const mod = await import(pathToFileURL(fichier).href);
    const pack = Object.values(mod).find((v) => v && typeof v === 'object' && 'statut' in v && 'profession' in v);
    const controler = Object.entries(mod).find(([k, v]) => /^controlerPack/.test(k) && typeof v === 'function')?.[1];
    if (!pack || !controler) { console.error(`✗ ${nom} : pack ou fonction de contrôle introuvable`); echec = true; continue; }
    const { erreurs, avertissements } = controler(pack);
    console.log(`\n${erreurs.length ? '✗' : '✓'} pack ${nom} (statut : ${pack.statut}) : ${erreurs.length} erreur(s), ${avertissements.length} avertissement(s)`);
    for (const e of erreurs) console.log(`  ✗ ${e}`);
    for (const a of avertissements) console.log(`  · ${a}`);
    if (erreurs.length) echec = true;
    if (apercu) writeFileSync(apercu.replace(/(\.json)?$/, `-${nom}.json`), JSON.stringify(pack, (k, v) => (v instanceof RegExp ? String(v) : v), 2));
  }
} finally {
  rmSync(sortie, { recursive: true, force: true });
}
process.exitCode = echec ? 1 : 0;
