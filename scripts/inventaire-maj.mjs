// Registre des nouveautés (packages/core/src/inventaire-connu.json, nouveautes.ts) : clé unitaire de l'inventaire de notation →
// date de première apparition. Exigence de Paul (2026-10-08) : tout nouvel ingrédient passe par « Donner mon avis ».
//
//   npm run inventaire:maj              ajoute chaque clé de l'inventaire absente du registre, datée du jour (heure de Paris)
//   npm run inventaire:maj -- --verifier   n'écrit rien : échoue (code 1) si une clé manque (GitHub, CI)
//
// npm run verifier le lance (mode écriture en local, --verifier si CI est défini) ; le test inventaire-connu.test.ts échoue aussi
// tant que le registre n'est pas à jour. Après un ajout : committer inventaire-connu.json avec l'ingrédient.
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const fichier = join(racine, 'packages', 'core', 'src', 'inventaire-connu.json');
const verifier = process.argv.includes('--verifier');
const dossier = mkdtempSync(join(tmpdir(), 'inventaire-maj-'));
try {
  const sortie = join(dossier, 'inventaire.mjs');
  await build({
    stdin: { contents: "export { clesUnitairesInventaire } from './assets';\nexport { registreComplete, absentesDuRegistre } from './nouveautes';\nexport { jourParis } from './essai';", resolveDir: join(racine, 'packages', 'core', 'src'), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: sortie, logLevel: 'warning', loader: { '.svg': 'text' },
  });
  const { clesUnitairesInventaire, registreComplete, absentesDuRegistre, jourParis } = await import(pathToFileURL(sortie).href);
  const registre = JSON.parse(readFileSync(fichier, 'utf8'));
  const cles = clesUnitairesInventaire();
  const absentes = absentesDuRegistre(cles, registre);
  if (!absentes.length) {
    console.log(`Registre des nouveautés à jour (${cles.length} ingrédients unitaires).`);
  } else if (verifier) {
    console.error(`${absentes.length} ingrédient(s) absent(s) de packages/core/src/inventaire-connu.json :\n${absentes.map((k) => `  ${k}`).join('\n')}\n→ lancez npm run inventaire:maj puis committez le fichier.`);
    process.exitCode = 1;
  } else {
    const jour = jourParis(new Date());
    writeFileSync(fichier, `${JSON.stringify(registreComplete(registre, cles, jour), null, 1)}\n`);
    console.log(`${absentes.length} nouveauté(s) ajoutée(s) au registre, datée(s) du ${jour} :\n${absentes.map((k) => `  ${k}`).join('\n')}\n→ committez packages/core/src/inventaire-connu.json avec l'ingrédient.`);
  }
} finally {
  rmSync(dossier, { recursive: true, force: true });
}
