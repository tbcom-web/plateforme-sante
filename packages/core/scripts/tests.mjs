// Tests unitaires du core : chaque src/**/*.test.ts est assemblé par esbuild (TypeScript, imports sans extension)
// puis lancé par le lanceur de tests de Node. Usage : node packages/core/scripts/tests.mjs
import { build } from 'esbuild';
import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const fichiers = readdirSync(src, { recursive: true }).map(String).filter((f) => f.endsWith('.test.ts')).map((f) => join(src, f));
const sortie = mkdtempSync(join(tmpdir(), 'core-tests-'));
try {
  await build({ entryPoints: fichiers, bundle: true, platform: 'node', format: 'esm', outdir: sortie, outExtension: { '.js': '.mjs' }, logLevel: 'warning', loader: { '.svg': 'text' } });
  const tests = readdirSync(sortie, { recursive: true }).map(String).filter((f) => f.endsWith('.mjs')).map((f) => join(sortie, f));
  const r = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(sortie, { recursive: true, force: true });
}
