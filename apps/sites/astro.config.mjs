import { defineConfig } from 'astro/config';

// Un build = un site praticien, choisi par la variable SITE_ID.
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  compressHTML: true,
});
