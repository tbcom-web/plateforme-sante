import { defineConfig } from 'astro/config';
import { readdir, readFile, writeFile, appendFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

/** Fichiers du site (dossier dist) d'une extension donnée, chemins relatifs « soins/x.md ». */
async function fichiersDuSite(racine, extension, sous = '') {
  const entrees = await readdir(join(racine, sous), { withFileTypes: true }).catch(() => []);
  const listes = await Promise.all(
    entrees.map((e) => (e.isDirectory() ? fichiersDuSite(racine, extension, join(sous, e.name)) : e.name.endsWith(extension) ? [join(sous, e.name)] : [])),
  );
  return listes.flat().map((f) => f.replaceAll('\\', '/'));
}
const fichiersMarkdown = (racine) => fichiersDuSite(racine, '.md');

/** Découpe une feuille minifiée en règles de premier niveau (« sélecteurs{…} », « @media …{…} »). */
function reglesCss(css) {
  const regles = [];
  let profondeur = 0, debut = 0, chaine = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (chaine) {
      if (c === '\\') i++;
      else if (c === chaine) chaine = null;
    } else if (c === '"' || c === "'") chaine = c;
    else if (c === '{') profondeur++;
    else if ((c === '}' && --profondeur === 0) || (c === ';' && profondeur === 0)) {
      regles.push(css.slice(debut, i + 1));
      debut = i + 1;
    }
  }
  if (debut < css.length) regles.push(css.slice(debut));
  return regles;
}

/** Sélecteurs d'une liste « a, b:is(c, d) » (virgules de premier niveau seulement). */
function listeSelecteurs(texte) {
  const liste = [];
  let niveau = 0, debut = 0;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === '(' || c === '[') niveau++;
    else if (c === ')' || c === ']') niveau--;
    else if (c === ',' && niveau === 0) { liste.push(texte.slice(debut, i)); debut = i + 1; }
  }
  liste.push(texte.slice(debut));
  return liste;
}

/** Retire les sélecteurs de composants absents de la page (attribut data-astro-cid-… introuvable). */
function sansComposantsAbsents(css, presents) {
  return reglesCss(css)
    .map((regle) => {
      const accolade = regle.indexOf('{');
      if (accolade < 0) return regle;
      const tete = regle.slice(0, accolade).trim();
      if (/^@(media|supports|layer|container)\b/.test(tete)) {
        const corps = sansComposantsAbsents(regle.slice(accolade + 1, -1), presents);
        return corps ? `${tete}{${corps}}` : '';
      }
      if (tete.startsWith('@')) return regle; // @font-face, @keyframes…
      const gardes = listeSelecteurs(tete).filter((s) => [...s.matchAll(/data-astro-cid-([a-z0-9]+)/g)].every((m) => presents.has(m[1])));
      return gardes.length ? gardes.join(',') + regle.slice(accolade) : '';
    })
    .join('');
}

/**
 * Styles en ligne allégés, page par page (après le build) : Astro place dans chaque page les styles de tous
 * les composants importés, même ceux que le modèle n'affiche pas, et les @font-face de toutes les polices
 * du projet. On retire :
 * - les règles des composants absents de la page (elles ne peuvent rien cibler) ;
 * - les @font-face des polices que la page ne cite nulle part (un site n'emploie que les polices de titres
 *   et de texte de son modèle, plus la mono), et les jeux cyrillique, grec et vietnamien (latin et latin
 *   étendu conservés : noms propres accentués). Le rendu est inchangé.
 */
function stylesAlleges() {
  return {
    name: 'styles-alleges',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const racine = fileURLToPath(dir);
        let avant = 0, apres = 0;
        for (const f of await fichiersDuSite(racine, '.html')) {
          const chemin = join(racine, f);
          const html = await readFile(chemin, 'utf8');
          const hors = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
          const presents = new Set([...hors.matchAll(/data-astro-cid-([a-z0-9]+)/g)].map((m) => m[1]));
          let page = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_, a, css, b) => a + sansComposantsAbsents(css, presents) + b);
          const citees = page.replace(/@font-face\{[^}]*\}/g, '');
          page = page.replace(/@font-face\{[^}]*\}/g, (regle) => {
            const famille = regle.match(/font-family:\s*["']?([^;"'}]+)/)?.[1]?.trim();
            const utile = famille && citees.includes(famille) && !/-(cyrillic|greek|vietnamese)(-ext)?-/.test(regle);
            return utile ? regle : '';
          });
          page = page.replace(/<style[^>]*><\/style>/g, '');
          avant += html.length;
          apres += page.length;
          if (page !== html) await writeFile(chemin, page);
        }
        logger.info(`styles en ligne allégés : ${Math.round((avant - apres) / 1024)} Ko retirés sur l'ensemble des pages`);
      },
    },
  };
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

/**
 * Caractères toujours conservés, en plus de ceux du site : ASCII, lettres accentuées du français, ponctuation
 * française (saisie dans les formulaires, textes ajoutés plus tard). Chaque caractère pèse 0,3 à 0,8 Ko dans
 * une police variable : le jeu reste resserré.
 */
const CARACTERES_DE_BASE = [
  ...Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCodePoint(0x20 + i)),
  ...'  «»°×©àâäçéèêëîïôöùûüÿæœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸÆŒ’‘“”–—…•·€',
];

/**
 * Polices réduites aux caractères du site (après le build) : chaque fichier latin employé par les pages est
 * ramené aux caractères présents dans le site (textes, attributs, scripts) et au jeu de base ci-dessus,
 * toutes ses fonctions typographiques et ses axes variables conservés (rendu identique), soit 20 à 35 %
 * d'octets en moins avant le premier affichage. Le fichier change de nom (empreinte du contenu) : le cache
 * « immutable » de /_astro/* reste sûr. Un caractère absent du fichier s'affiche dans la police de secours.
 * Sans la dépendance subset-font, ou en mode aperçu (textes modifiés en direct), les fichiers restent entiers.
 */
function policesReduites() {
  return {
    name: 'polices-reduites',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env.APERCU === '1') return;
        let sousEnsemble;
        try {
          sousEnsemble = (await import('subset-font')).default;
        } catch {
          return;
        }
        const racine = fileURLToPath(dir);
        const pages = await fichiersDuSite(racine, '.html');
        const scripts = await fichiersDuSite(racine, '.js');
        const textes = await Promise.all([...pages, ...scripts].map((f) => readFile(join(racine, f), 'utf8')));
        const caracteres = new Set(CARACTERES_DE_BASE);
        for (const t of textes) {
          const decode = t
            .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
            .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
          for (const c of decode) if (c.codePointAt(0) >= 0x20) caracteres.add(c);
        }
        const texte = [...caracteres].join('');
        const html = new Map(pages.map((f, i) => [f, textes[i]]));
        const employes = new Set([...html.values()].flatMap((h) => [...h.matchAll(/\/_astro\/([\w.-]+-latin-[\w-]+\.[\w-]+\.woff2)/g)].map((m) => m[1])));
        const renommages = [];
        let avant = 0, apres = 0;
        for (const nom of employes) {
          if (nom.includes('-latin-ext-')) continue;
          const chemin = join(racine, '_astro', nom);
          try {
            const origine = await readFile(chemin);
            const reduit = await sousEnsemble(origine, texte, { targetFormat: 'woff2' });
            if (reduit.length >= origine.length) continue;
            const empreinte = createHash('sha256').update(reduit).digest('base64url').slice(0, 8);
            const nouveau = nom.replace(/\.[\w-]+\.woff2$/, `.${empreinte}.woff2`);
            await writeFile(join(racine, '_astro', nouveau), reduit);
            await unlink(chemin);
            renommages.push([nom, nouveau]);
            avant += origine.length;
            apres += reduit.length;
          } catch (e) {
            logger.warn(`${nom} gardée entière : ${e.message}`);
          }
        }
        if (!renommages.length) return;
        for (const [f, contenu] of html) {
          const page = renommages.reduce((h, [ancien, nouveau]) => h.replaceAll(`/_astro/${ancien}`, `/_astro/${nouveau}`), contenu);
          if (page !== contenu) await writeFile(join(racine, f), page);
        }
        logger.info(`${renommages.length} polices réduites à ${caracteres.size} caractères : ${Math.round(avant / 1024)} → ${Math.round(apres / 1024)} Ko`);
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
  vite: {
    build: {
      // Navigateurs visés par le CSS : préfixes ajoutés à la compilation (ex. -webkit-backdrop-filter pour iOS ≤ 17).
      cssTarget: ['chrome100', 'safari15', 'ios15', 'firefox100'],
      // Polices jamais intégrées en data: (CSP font-src 'self') : toujours des fichiers /_astro/ mis en cache.
      assetsInlineLimit: (fichier) => (/\.(woff2?|ttf|otf)$/.test(fichier) ? false : undefined),
    },
  },
  integrations: [variantesPhotos(), enTetesMarkdown(), stylesAlleges(), policesReduites()],
});
