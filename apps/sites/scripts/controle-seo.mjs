// Contrôle SEO des modèles : construit le site de démo avec chaque modèle intégré et vérifie que
// tout ce que lisent les moteurs est identique (title, description, canonical, robots, H1, ensemble des H2,
// données structurées, sitemap, robots.txt, llms.txt). Usage : node scripts/controle-seo.mjs [modele…]
// Styles visuels : MODES_VISUELS=illustrations,photos,mixte construit chaque modèle dans chaque style ;
// les titres et textes ne doivent jamais changer d'un style à l'autre.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const modeles = process.argv.slice(2).length ? process.argv.slice(2) : ['proximite', 'premium', 'prestige', 'zen', 'atelier'];
const modes = (process.env.MODES_VISUELS ?? '').split(',').map((m) => m.trim()).filter(Boolean);
// Variantes construites : chaque modèle, dans chaque style visuel demandé (sinon le style par défaut).
const variantes = modeles.flatMap((modele) => (modes.length ? modes : [null]).map((mode) => ({ modele, mode, nom: mode ? `${modele}/${mode}` : modele })));
const dist = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const fichiers = (dossier) =>
  readdirSync(dossier).flatMap((f) => {
    const p = join(dossier, f);
    return statSync(p).isDirectory() ? fichiers(p) : [p];
  });

const texte = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const un = (html, re) => (html.match(re)?.[1] ?? '').trim();
const tous = (html, re) => [...html.matchAll(re)].map((m) => texte(m[1]));

function signature() {
  const sig = {};
  for (const f of fichiers(dist)) {
    const cle = relative(dist, f).replaceAll('\\', '/');
    if (cle.startsWith('modeles/') || cle === 'ambiances.html') continue; // prototypes de démo, hors sites praticiens
    if (cle.endsWith('.html')) {
      const h = readFileSync(f, 'utf8');
      sig[cle] = {
        title: un(h, /<title>([^<]*)<\/title>/),
        description: un(h, /<meta name="description" content="([^"]*)"/),
        canonical: un(h, /<link rel="canonical" href="([^"]*)"/),
        robots: un(h, /<meta name="robots" content="([^"]*)"/),
        h1: tous(h, /<h1[^>]*>([\s\S]*?)<\/h1>/g),
        h2: tous(h, /<h2[^>]*>([\s\S]*?)<\/h2>/g).sort(),
        jsonld: [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).sort(),
      };
    } else if (['sitemap.xml', 'robots.txt', 'llms.txt'].includes(cle)) {
      sig[cle] = readFileSync(f, 'utf8');
    }
  }
  return sig;
}

const resultats = {};
for (const { modele, mode, nom } of variantes) {
  console.log(`→ Construction avec le modèle « ${modele} »${mode ? `, style visuel « ${mode} »` : ''}…`);
  execSync('npx astro build', { stdio: 'ignore', env: { ...process.env, MODELE: modele, ...(mode ? { MODE_VISUEL: mode } : {}) } });
  resultats[nom] = signature();
}

const [reference, ...autres] = variantes.map((v) => v.nom);
let ecarts = 0;
for (const autre of autres) {
  const a = resultats[reference], b = resultats[autre];
  for (const cle of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = JSON.stringify(a[cle]), vb = JSON.stringify(b[cle]);
    if (va !== vb) {
      ecarts++;
      console.log(`✗ ${cle} diffère entre « ${reference} » et « ${autre} »`);
      if (a[cle] && b[cle] && typeof a[cle] === 'object') {
        for (const k of Object.keys(a[cle])) {
          if (JSON.stringify(a[cle][k]) !== JSON.stringify(b[cle][k])) console.log(`   · ${k} :\n     ${JSON.stringify(a[cle][k])}\n     ${JSON.stringify(b[cle][k])}`);
        }
      }
    }
  }
}
console.log(ecarts ? `\n${ecarts} écart(s) SEO détecté(s).` : `\n✓ SEO identique sur ${modeles.length} modèles${modes.length ? ` × ${modes.length} styles visuels` : ''} (${Object.keys(resultats[reference]).length} fichiers comparés).`);
process.exit(ecarts ? 1 : 0);
