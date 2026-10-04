// Contrôle de la charte graphique : aucune couleur littérale dans les composants, gabarits et pages.
// Toute couleur vient de la charte (packages/core/src/charte.ts, univers.ts, gammes.ts) : variables CSS
// (var(--encre), rgb(var(--encre-rgb) / 0.1)…) ou constantes importées du core.
// Vérifie aussi les contrastes AA des gammes de couleurs et la validité des fiches de modèles intégrées.
// Usage : node scripts/controle-charte.mjs   (npm run controle:charte)
import { readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const racine = fileURLToPath(new URL('..', import.meta.url));
const DOSSIERS = ['src/components', 'src/layouts', 'src/pages'];
const EXTENSIONS = /\.(astro|ts|js|mjs|css)$/;

// Liste blanche, à garder minimale. Chaque entrée est justifiée.
const FICHIERS_EXCLUS = [
  // Anciens prototypes de modèles et pages « outil » de démonstration, hors sites praticiens :
  // ils seront supprimés ou reconstruits sur la charte, pas maintenus.
  'src/pages/[outil].astro',
  'src/components/CartePied.astro', // utilisé uniquement par [outil].astro
  'src/components/Illustration.astro', // utilisé uniquement par les prototypes src/modeles/*
];
// Exception ponctuelle : une ligne peut porter le commentaire « charte: exception — raison ».
const EXCEPTION_LIGNE = /charte:\s*exception\s*—\s*\S/;

const fichiers = (dossier) =>
  readdirSync(dossier).flatMap((f) => {
    const p = join(dossier, f);
    return statSync(p).isDirectory() ? fichiers(p) : EXTENSIONS.test(f) ? [p] : [];
  });

// Couleurs littérales : #rgb, #rgba, #rrggbb, #rrggbbaa ; rgb()/rgba()/hsl()/hsla() dont le premier
// argument est un nombre (rgb(var(--encre-rgb) / 0.1) est une référence à la charte, donc accepté).
const HEX = /(?<![&\w$])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const FONCTION = /\b(?:rgba?|hsla?)\(\s*[\d.]/gi;
// Ancres et identifiants qui ressemblent à de l'hexadécimal (href="#cafe") : ignorés.
const ANCRE = /(?:href|id|url)\s*=\s*["'`{][^"'`}]*$/i;

const defauts = [];
for (const dossier of DOSSIERS) {
  for (const f of fichiers(join(racine, dossier))) {
    const rel = relative(racine, f).replaceAll('\\', '/');
    if (FICHIERS_EXCLUS.includes(rel)) continue;
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((ligne, i) => {
      if (EXCEPTION_LIGNE.test(ligne)) return;
      for (const re of [HEX, FONCTION]) {
        for (const m of ligne.matchAll(re)) {
          if (re === HEX && ANCRE.test(ligne.slice(0, m.index))) continue;
          defauts.push(`${rel}:${i + 1}  ${m[0]}  →  ${ligne.trim().slice(0, 110)}`);
        }
      }
    });
  }
}

// Gammes (contrastes AA) et fiches de modèles : on charge le core via esbuild (TypeScript).
const sortie = join(tmpdir(), `controle-charte-${process.pid}.mjs`);
await build({
  stdin: { contents: "export { GAMMES, verifierGamme, MODELES_INTEGRES, validerManifeste, feuilleCharte, UNIVERS_LISTE, MARQUES_DESSINEES } from '@plateforme/core';", resolveDir: racine, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: sortie, logLevel: 'silent',
});
const core = await import(pathToFileURL(sortie).href);
rmSync(sortie, { force: true });
const gammes = core.GAMMES.flatMap(core.verifierGamme);
const modeles = core.MODELES_INTEGRES.flatMap((m) => core.validerManifeste(m).erreurs.map((e) => `${m.id} : ${e}`));
// Chaque marque de logo déclarée par un univers doit avoir son dessin (logos.ts)
const marques = core.UNIVERS_LISTE.flatMap((u) => u.marques.filter((q) => !core.MARQUES_DESSINEES.includes(q.id)).map((q) => `${u.id} : marque de logo « ${q.id} » sans dessin`));
const inconnues = core.MODELES_INTEGRES.flatMap((m) => (m.gammes ?? []).filter((g) => !core.GAMMES.some((x) => x.id === g)).map((g) => `${m.id} : gamme inconnue « ${g} »`));

if (defauts.length) {
  console.log(`✗ ${defauts.length} couleur(s) littérale(s) hors charte :`);
  for (const d of defauts) console.log(`  ${d}`);
}
for (const d of [...gammes, ...modeles, ...inconnues, ...marques]) console.log(`✗ ${d}`);
const total = defauts.length + gammes.length + modeles.length + inconnues.length + marques.length;
console.log(total
  ? `\n${total} écart(s) à la charte.`
  : `✓ Charte respectée : aucune couleur littérale, ${core.GAMMES.length} gammes conformes AA, ${core.MODELES_INTEGRES.length} modèles valides, ${core.UNIVERS_LISTE.reduce((t, u) => t + u.marques.length, 0)} marques de logo dessinées.`);
process.exit(total ? 1 : 0);
