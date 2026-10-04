import { defineConfig } from 'astro/config';
import { readdir } from 'node:fs/promises';
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

// Un build = un site praticien, choisi par la variable SITE_ID.
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  // Feuilles de style dans la page : aucune requête CSS bloquante avant le premier affichage (mobile).
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [variantesPhotos()],
});
