// Outils communs aux aperçus des univers du catalogue (packages/core/src/catalogue-univers.ts) :
// lecture du catalogue, construction de la démo avec un univers (UNIVERS=<id>) dans un dossier à part
// (jamais dans dist/, que d'autres contrôles utilisent), serveur statique local sur un port libre.
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { sousDossier } from '../../../packages/core/scripts/chemins.mjs';

export const racine = fileURLToPath(new URL('..', import.meta.url));

/** Catalogue des univers, lu dans le core (TypeScript) via esbuild */
export async function catalogue() {
  const sortie = join(tmpdir(), `univers-catalogue-${process.pid}.mjs`);
  await build({
    stdin: { contents: "export { CATALOGUE_UNIVERS, LIBELLES_STATUTS_UNIVERS } from '@plateforme/core';", resolveDir: racine, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: sortie, logLevel: 'silent',
  });
  const core = await import(pathToFileURL(sortie).href);
  rmSync(sortie, { force: true });
  return core;
}

/** Dossier de construction d'un univers (hors du dépôt) */
export const dossierUnivers = (id) => sousDossier(join(tmpdir(), 'plateforme-univers'), id); // vidé avant construction : jamais hors de ce dossier

/** Construit la démo avec l'univers appliqué (identité de démo inchangée) */
export function construire(id, { silencieux = false } = {}) {
  const dossier = dossierUnivers(id);
  rmSync(dossier, { recursive: true, force: true });
  const commande = () => execSync(`npx astro build --outDir "${dossier}"`, {
    cwd: racine,
    stdio: silencieux ? 'pipe' : 'inherit',
    env: { ...process.env, SITE_ID: 'demo-podologue-lyon', UNIVERS: id },
  });
  // Une construction lancée en même temps par un autre outil (cache .astro partagé) peut échouer : un second essai.
  try { commande(); } catch { commande(); }
  return dossier;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

const existe = async (p) => (await stat(p).catch(() => null))?.isFile() ?? false;

/** Sert un dossier statique (pages en « page.html » ou « page/index.html ») ; port 0 = port libre */
export function servir(dossier, port = 0) {
  const serveur = createServer(async (req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const base = normalize(join(dossier, chemin));
    if (!base.startsWith(normalize(dossier))) { res.writeHead(403).end(); return; }
    const candidats = chemin.endsWith('/') ? [join(base, 'index.html')] : [base, `${base}.html`, join(base, 'index.html')];
    for (const c of candidats) {
      if (await existe(c)) {
        res.writeHead(200, { 'content-type': TYPES[extname(c)] ?? 'application/octet-stream' });
        res.end(await readFile(c));
        return;
      }
    }
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end((await readFile(join(dossier, '404.html')).catch(() => 'Introuvable')));
  });
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${serveur.address().port}/`, fermer: () => serveur.close() })));
}
