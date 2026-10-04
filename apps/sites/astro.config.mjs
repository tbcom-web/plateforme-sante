import { defineConfig } from 'astro/config';
import { readdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Largeurs des variantes des photos d'illustration (public/photos), servies en srcset (lib/visuels.ts). */
export const LARGEURS_PHOTOS = [480, 960];

/**
 * Variantes allégées des photos d'illustration, produites après le build (sharp, dépendance d'Astro) :
 * « photo.webp » → « photo-480.webp », « photo-960.webp ». Sans sharp, rien n'est produit et les pages
 * gardent la photo d'origine (PHOTOS_VARIANTES n'est pas posé).
 */
function variantesPhotos() {
  let sharp = null;
  return {
    name: 'variantes-photos',
    hooks: {
      'astro:config:setup': async () => {
        try {
          sharp = (await import('sharp')).default;
          process.env.PHOTOS_VARIANTES = '1';
        } catch {
          sharp = null;
        }
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (!sharp) return;
        const dossier = join(fileURLToPath(dir), 'photos');
        const fichiers = (await readdir(dossier).catch(() => [])).filter((f) => /^[^-].*\.webp$/.test(f) && !/-\d+\.webp$/.test(f));
        await Promise.all(
          fichiers.flatMap((f) =>
            LARGEURS_PHOTOS.map((l) =>
              sharp(join(dossier, f)).resize({ width: l, withoutEnlargement: true }).webp({ quality: 70 }).toFile(join(dossier, f.replace(/\.webp$/, `-${l}.webp`))),
            ),
          ),
        );
        logger.info(`${fichiers.length} photos déclinées en ${LARGEURS_PHOTOS.join(' et ')} px`);
      },
    },
  };
}

/** Fichiers Markdown du site (dossier dist), chemins relatifs « soins/x.md ». */
async function fichiersMarkdown(racine, sous = '') {
  const entrees = await readdir(join(racine, sous), { withFileTypes: true }).catch(() => []);
  const listes = await Promise.all(
    entrees.map((e) => (e.isDirectory() ? fichiersMarkdown(racine, join(sous, e.name)) : e.name.endsWith('.md') ? [join(sous, e.name)] : [])),
  );
  return listes.flat().map((f) => f.replaceAll('\\', '/'));
}

/**
 * En-têtes Cloudflare des versions Markdown des pages (après le build) : type text/markdown, jamais indexées
 * (X-Robots-Tag), rattachées à leur page HTML (Link canonical) ; pas de contenu dupliqué pour Google.
 * Copie aussi les en-têtes communs (règle « /* ») dans en-tetes.json, relu par functions/_middleware.js.
 * Cloudflare accepte 100 règles au plus : au-delà, les versions Markdown restantes gardent les en-têtes
 * posés par la Function (même effet).
 */
function enTetesMarkdown() {
  return {
    name: 'en-tetes-markdown',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const racine = fileURLToPath(dir);
        const enTetes = await readFile(join(racine, '_headers'), 'utf8').catch(() => '');
        const communs = Object.fromEntries(
          (enTetes.match(/^\/\*\r?\n((?:[ \t]+.+\r?\n?)+)/m)?.[1] ?? '')
            .split(/\r?\n/)
            .map((l) => l.trim().match(/^([\w-]+):\s*(.+)$/))
            .filter(Boolean)
            .map((m) => [m[1], m[2]]),
        );
        await writeFile(join(racine, 'en-tetes.json'), JSON.stringify(communs));
        const place = 100 - (enTetes.match(/^\//gm)?.length ?? 0);
        const regles = [];
        for (const f of (await fichiersMarkdown(racine)).slice(0, Math.max(0, place))) {
          const page = (await readFile(join(racine, f), 'utf8')).match(/^canonical_url: (\S+)/m)?.[1];
          if (!page) continue;
          regles.push(`/${f}`, '  Content-Type: text/markdown; charset=utf-8', '  X-Robots-Tag: noindex', `  Link: <${page}>; rel="canonical"`, '');
        }
        if (!regles.length) return;
        await appendFile(join(racine, '_headers'), `\n\n# Versions Markdown des pages (générées au build)\n${regles.join('\n')}`);
        logger.info(`${regles.length / 5} versions Markdown déclarées dans _headers`);
      },
    },
  };
}

// Un build = un site praticien, choisi par la variable SITE_ID.
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  // Feuilles de style dans la page : aucune requête CSS bloquante avant le premier affichage (mobile).
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [variantesPhotos(), enTetesMarkdown()],
});
