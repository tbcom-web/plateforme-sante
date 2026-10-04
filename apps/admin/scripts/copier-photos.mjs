// Copie la banque de photos des sites (apps/sites/public/photos) dans public/photos de l'admin,
// pour l'aperçu du thème (mêmes chemins « /photos/… » que sur les sites). Dossier ignoré par git.
import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../sites/public/photos', import.meta.url));
const cible = fileURLToPath(new URL('../public/photos', import.meta.url));
if (existsSync(source)) cpSync(source, cible, { recursive: true, filter: (f) => !f.endsWith('.md') });
