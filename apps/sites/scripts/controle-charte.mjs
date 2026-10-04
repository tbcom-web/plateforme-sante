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
  stdin: { contents: "export { GAMMES, verifierGamme, MODELES_INTEGRES, validerManifeste, feuilleCharte, UNIVERS_LISTE, MARQUES_DESSINEES, DESSINS_PODOLOGIE, ANIMATIONS, REGISTRES, svgDessin, svgAnimationFixe, PHOTOS_DESSINS, VISUELS_SOINS, EQUIPEMENTS, EQUIPEMENTS_DESSINES, svgEquipement, FORMES_BIBLIOTHEQUE, BIBLIOTHEQUE, svgForme, jetonsSansCorrespondance } from '@plateforme/core';", resolveDir: racine, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: sortie, logLevel: 'silent',
});
const core = await import(pathToFileURL(sortie).href);
rmSync(sortie, { force: true });
const gammes = core.GAMMES.flatMap(core.verifierGamme);
const modeles = core.MODELES_INTEGRES.flatMap((m) => core.validerManifeste(m).erreurs.map((e) => `${m.id} : ${e}`));
// Chaque marque de logo déclarée par un univers doit avoir son dessin (logos.ts)
const marques = core.UNIVERS_LISTE.flatMap((u) => u.marques.filter((q) => !core.MARQUES_DESSINEES.includes(q.id)).map((q) => `${u.id} : marque de logo « ${q.id} » sans dessin`));
// Dessins et images fixes des animations : chacun se dessine dans les deux registres (relevé, pédagogique),
// sans valeur invalide ; une animation reste légère (moins de 400 éléments SVG) ; chaque dessin a sa photo
// associée et chaque soin du catalogue pointe vers un dessin existant.
const LIMITE_ELEMENTS = 400;
const elements = (svg) => (svg.match(/<(?!\/)[a-z]/gi) || []).length;
const invalide = (svg) => /NaN|undefined|Infinity/.test(svg);
const dessins = [
  ...core.DESSINS_PODOLOGIE.flatMap((n) => core.REGISTRES.flatMap((r) => {
    const svg = core.svgDessin(n, { registre: r });
    return [...(invalide(svg) ? [`dessin « ${n} » (${r}) : valeur invalide`] : []), ...(elements(svg) < 8 ? [`dessin « ${n} » (${r}) : vide`] : [])];
  })),
  ...core.ANIMATIONS.flatMap((a) => core.REGISTRES.flatMap((r) => {
    const svg = core.svgAnimationFixe(a, { registre: r });
    return [...(invalide(svg) ? [`image fixe « ${a} » (${r}) : valeur invalide`] : []), ...(elements(svg) > LIMITE_ELEMENTS ? [`image fixe « ${a} » (${r}) : ${elements(svg)} éléments (> ${LIMITE_ELEMENTS})`] : [])];
  })),
  ...core.EQUIPEMENTS_DESSINES.flatMap((id) => [
    ...(core.EQUIPEMENTS.some((e) => e.id === id) ? [] : [`dessin de matériel « ${id} » absent du catalogue EQUIPEMENTS`]),
    ...core.REGISTRES.flatMap((r) => {
      const svg = core.svgEquipement(id, { registre: r });
      return invalide(svg) || elements(svg) < 6 ? [`dessin de matériel « ${id} » (${r}) : vide ou invalide`] : [];
    }),
  ]),
  ...core.DESSINS_PODOLOGIE.filter((n) => !core.PHOTOS_DESSINS[n]).map((n) => `dessin « ${n} » sans photo associée (PHOTOS_DESSINS)`),
  ...Object.entries(core.VISUELS_SOINS).filter(([, c]) => !core.DESSINS_PODOLOGIE.includes(c.dessin)).map(([s, c]) => `soin « ${s} » : dessin inconnu « ${c.dessin} »`),
];
// Bibliothèque partagée (éléments repris d'ÉcranZen, packages/core/src/bibliotheque) : chaque forme, dans les deux registres, sans
// couleur littérale (uniquement des variables de la charte), sans valeur invalide et d'un poids raisonnable pour le mobile ; chaque
// jeton ÉcranZen a sa correspondance ; chaque déclinaison du catalogue pointe vers une forme existante. Les sources du module
// (formes générées comprises) sont aussi contrôlées.
const LIMITE_KO = 64;
const litterales = (texte) => [HEX, FONCTION].flatMap((re) => [...texte.replace(/url\(#[^)]*\)/g, '').matchAll(re)].map((m) => m[0]));
const dossierBib = join(racine, '../../packages/core/src/bibliotheque');
const bibliotheque = [
  ...core.jetonsSansCorrespondance().map((j) => `bibliothèque : jeton ÉcranZen « ${j} » sans correspondance dans la charte`),
  ...core.FORMES_BIBLIOTHEQUE.flatMap((cle) => core.REGISTRES.flatMap((r) => {
    const svg = core.svgForme(cle, { registre: r });
    const l = litterales(svg), ko = Buffer.byteLength(svg) / 1024;
    return [...(invalide(svg) ? [`bibliothèque « ${cle} » (${r}) : valeur invalide`] : []), ...(l.length ? [`bibliothèque « ${cle} » (${r}) : couleur littérale ${l[0]}`] : []),
      ...(ko > LIMITE_KO ? [`bibliothèque « ${cle} » (${r}) : ${ko.toFixed(0)} ko (> ${LIMITE_KO} ko)`] : [])];
  })),
  ...core.BIBLIOTHEQUE.flatMap((e) => e.declinaisons.filter((d) => !core.FORMES_BIBLIOTHEQUE.includes(d.forme)).map((d) => `bibliothèque « ${e.id} » : forme inconnue « ${d.forme} »`)),
  ...readdirSync(dossierBib).filter((f) => /\.ts$/.test(f)).flatMap((f) => readFileSync(join(dossierBib, f), 'utf8').split(/\r?\n/)
    .flatMap((ligne, i) => (EXCEPTION_LIGNE.test(ligne) ? [] : litterales(ligne).map((c) => `packages/core/src/bibliotheque/${f}:${i + 1}  ${c}`)))),
];
// Règles anatomiques (docs/charte-graphique.md, revue de l'illustrateur médical du 2026-10-04) : « un défaut vu deux fois = un contrôle ».
// Géométries partagées (packages/core/src/pied.ts, foulee.ts, pas.ts) chargées à part (sous-chemins du core).
const sortieGeo = join(tmpdir(), `controle-charte-geo-${process.pid}.mjs`);
await build({
  stdin: { contents: "export { PLANTE, EMPREINTE, dansPolygone, SEMELLE_POINTS, SEMELLE_ELEMENTS, CONTOUR_PIED, piedDeProfil, largeurA, echantillonner, TRAJET_POINTS } from '@plateforme/core/pied'; export { poseCoureur, APPUI } from '@plateforme/core/foulee'; export { pressionPas, APPUI_MARCHE } from '@plateforme/core/pas'; export { SITES_MONOFILAMENT, svgDessin, DESSINS_PODOLOGIE, svgAnimationFixe } from '@plateforme/core';", resolveDir: racine, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: sortieGeo, logLevel: 'silent',
});
const geo = await import(pathToFileURL(sortieGeo).href);
rmSync(sortieGeo, { force: true });
const largeurMax = (poly, y0, y1) => { let m = 0; for (let y = y0; y <= y1; y += 0.25) { const l = geo.largeurA(poly, y); if (l) m = Math.max(m, l[1] - l[0]); } return m; };
/** Proportions d'une plante : avant-pied / L (L du talon au bout de l'hallux) et talon / avant-pied */
function proportions(poly, haut) {
  const ys = poly.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), Lp = y1 - y0, L = y1 - haut;
  const avant = largeurMax(poly, y0, y0 + 0.45 * Lp), talon = largeurMax(poly, y1 - 0.25 * Lp, y1);
  return { avant: avant / L, talon: talon / avant };
}
const dans = (v, [a, b]) => v >= a && v <= b;
const anatomie = [];
{
  const hautPied = Math.min(...geo.CONTOUR_PIED.polygonesOrteils.flat().map((p) => p[1]));
  const p = proportions(geo.PLANTE, hautPied);
  if (!dans(p.avant, [0.35, 0.4])) anatomie.push(`CONTOUR_PIED : avant-pied ${p.avant.toFixed(3)} × L (attendu 0,35–0,40)`);
  if (!dans(p.talon, [0.6, 0.65])) anatomie.push(`CONTOUR_PIED : talon ${p.talon.toFixed(3)} × avant-pied (attendu 0,60–0,65)`);
  const hautEmp = Math.min(...geo.EMPREINTE.pulpes.map(([, cy, , ry]) => cy - ry));
  const e = proportions(geo.EMPREINTE.polygone, hautEmp);
  // Empreinte (zone de contact, POD-SC-0007) : la bande sous les têtes est un peu plus étroite que le pied, le talon d'appui aussi
  if (!dans(e.avant, [0.34, 0.4])) anatomie.push(`EMPREINTE : avant-pied ${e.avant.toFixed(3)} × L (attendu 0,34–0,40)`);
  if (!dans(e.talon, [0.58, 0.68])) anatomie.push(`EMPREINTE : talon ${e.talon.toFixed(3)} × avant-pied (attendu 0,58–0,68)`);
  const ysS = geo.SEMELLE_POINTS.map((q) => q[1]), LS = Math.max(...ysS) - Math.min(...ysS);
  const rapport = LS / largeurMax(geo.SEMELLE_POINTS, Math.min(...ysS), Math.max(...ysS));
  if (!dans(rapport, [2.5, 2.75])) anatomie.push(`semelle : L/l = ${rapport.toFixed(2)} (attendu ≈ 2,6)`);
  // Barre rétrocapitale DERRIÈRE les têtes métatarsiennes (M2 à M4)
  const barre = geo.echantillonner(geo.SEMELLE_ELEMENTS.barre)[0].pts;
  const tetes = geo.CONTOUR_PIED.mtp.slice(1, 4);
  for (const [x, y] of tetes) { const avant = barre.filter((q) => Math.abs(q[0] - x) < 3).map((q) => q[1]); if (avant.length && Math.min(...avant) < y + 4) anatomie.push(`semelle : barre rétrocapitale devant la tête métatarsienne (x ${x})`); }
  // Profil : l'arche ne touche pas le sol (pied normal, creux) ; elle touche le sol (pied plat) ; le pied creux est plus cambré
  const arche = (v) => Math.max(...geo.echantillonner(geo.piedDeProfil(v).peau)[0].pts.filter(([x, y]) => x > 28 && x < 68 && y > 40).map((q) => q[1]));
  const [an, ac, ap] = ['normale', 'creuse', 'plate'].map(arche), sol = geo.piedDeProfil().sol;
  if (!(an < sol - 2)) anatomie.push(`profil : l'arche du pied normal touche le sol (y ${an.toFixed(1)})`);
  if (!(ac < an - 2)) anatomie.push('profil : le pied creux n’est pas plus cambré que le pied normal');
  if (!(ap > sol - 1)) anatomie.push('profil : l’arche du pied plat ne touche pas le sol');
  // Monofilament : 3 sites par pied (IWGDF 2019, HAS)
  if (geo.SITES_MONOFILAMENT.length !== 3) anatomie.push(`monofilament : ${geo.SITES_MONOFILAMENT.length} sites (attendu 3)`);
  if (/9 sites/.test(geo.svgDessin('diabete'))) anatomie.push('monofilament : mention « 9 sites »');
  // Course : appui 35–40 % du cycle, bras opposés aux jambes (au contact du pied droit, la main gauche est devant la droite)
  if (!dans(geo.APPUI, [0.35, 0.4])) anatomie.push(`coureur : appui ${geo.APPUI} du cycle (attendu 0,35–0,40)`);
  const q = geo.poseCoureur(0, 100);
  if (!(q.brasGauche.main.x > q.brasDroit.main.x)) anatomie.push('coureur : bras du même côté que la jambe en avant');
  if (Math.abs(Math.max(...q.droite.chaussure.map((r) => r.y))) > 0.5) anatomie.push('coureur : le pied d’appui ne touche pas le sol au contact');
  // Empreinte entièrement dans le contour du pied réel (contre-revue N3)
  const dansPied = ([x, y]) => geo.dansPolygone(geo.PLANTE, x, y) || geo.CONTOUR_PIED.polygonesOrteils.some((o) => geo.dansPolygone(o, x, y));
  const hors = geo.EMPREINTE.polygone.filter((q) => !dansPied(q));
  if (hors.length) anatomie.push(`EMPREINTE : ${hors.length} point(s) hors du contour du pied (ex. ${hors[0].join(', ')})`);
  // Coureur : pas de saut d'angle du pied au décollement, aucun pied sous le tapis (contre-revue N1)
  let saut = 0, sous = 0, prec = null;
  for (let p = 0; p < 1; p += 0.002) {
    const q = geo.poseCoureur(p, 100);
    sous = Math.max(sous, ...q.droite.chaussure.map((r) => r.y), ...q.gauche.chaussure.map((r) => r.y));
    if (prec) saut = Math.max(saut, Math.hypot(q.droite.orteil.x - prec.x, q.droite.orteil.y - prec.y));
    prec = q.droite.orteil;
  }
  if (sous > 0.5) anatomie.push(`coureur : pied sous le tapis de ${sous.toFixed(1)} % de L`);
  if (saut > 3) anatomie.push(`coureur : saut du pied de ${saut.toFixed(1)} % de L entre deux images`);
  // Podoscope : masque de contact (talon déchargé pendant la poussée, avant-pied et orteils non chargés à l'attaque du talon)
  const A = geo.APPUI_MARCHE;
  if (geo.pressionPas(48, 200, 1, 0.92 * A, geo.TRAJET_POINTS) > 0.02) anatomie.push('podoscope : talon chargé pendant la poussée sur l’hallux');
  if (geo.pressionPas(22, 15, 1, 0.03 * A, geo.TRAJET_POINTS) > 0.02 || geo.pressionPas(42, 70, 1, 0.03 * A, geo.TRAJET_POINTS) > 0.02) anatomie.push('podoscope : avant-pied ou orteils chargés à l’attaque du talon');
  // Lecture profane : ni zone colorée, ni point, ni anneau, ni trame posés sur la PEAU (dessins pédagogiques qui montrent le pied réel)
  for (const n of ['soin', 'diabete', 'laser', 'verrue', 'talon', 'taping', 'ongle']) {
    const svg = geo.svgDessin(n, { registre: 'pedagogique' });
    if (/class="(zone|point|anneau|trame)/.test(svg)) anatomie.push(`dessin « ${n} » (pédagogique) : couleur ou point posé sur la peau`);
  }
  // Podoscope : aucune pression en phase oscillante
  if (geo.pressionPas(48, 200, 1, (geo.APPUI_MARCHE + 1) / 2, geo.TRAJET_POINTS) !== 0) anatomie.push('podoscope : pression pendant la phase oscillante');
  // Lecture profane : pas de pointillés sur la peau (registre pédagogique : jamais de contour en pointillés)
  for (const n of geo.DESSINS_PODOLOGIE) if (/class="pointille/.test(geo.svgDessin(n, { registre: 'pedagogique' }))) anatomie.push(`dessin « ${n} » (pédagogique) : contour en pointillés`);
}
// iPhone (WebKit) : la feuille <style> d'un document SVG externe référencé par <use> est ignorée. Les fichiers /dessins/*.svg portent
// donc leurs styles en attributs (core : fichiers-svg.ts). Contrôle statique, toujours exécuté : sur les fichiers générés par le
// dernier build (dist/dessins) s'il existe, et sur l'assemblage lui-même (un dessin de chaque famille passé par fichierSvg).
const webkit = [];
{
  const sortieFs = join(tmpdir(), `controle-charte-fs-${process.pid}.mjs`);
  await build({ stdin: { contents: "export { fichierSvg } from '@plateforme/core/fichiers-svg'; export { symboleDessin, symboleEquipement, symboleEmpreintes } from '@plateforme/core';", resolveDir: racine, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: sortieFs, logLevel: 'silent' });
  const fs2 = await import(pathToFileURL(sortieFs).href);
  rmSync(sortieFs, { force: true });
  const feuille = readFileSync(join(racine, '../../packages/core/src/dessins.css'), 'utf8');
  for (const [nom, svg] of [['talon', fs2.fichierSvg(fs2.symboleDessin('talon'), feuille)], ['materiel-podoscope', fs2.fichierSvg(fs2.symboleEquipement('podoscope'), feuille)]]) {
    if (/<style[s>]/.test(svg)) webkit.push(`fichier de dessin « ${nom} » : <style> (ignoré par WebKit)`);
    if (nom === 'talon' && !/class="mono[^"]*"[^>]*style="[^"]*font-size/.test(svg)) webkit.push(`fichier de dessin « ${nom} » : styles des étiquettes absents des attributs`);
  }
  const dossierDist = join(racine, 'dist/dessins');
  let fichiersDist = [];
  try { fichiersDist = readdirSync(dossierDist).filter((f) => f.endsWith('.svg')); } catch {}
  for (const f of fichiersDist) if (/<style[s>]/.test(readFileSync(join(dossierDist, f), 'utf8'))) webkit.push(`dist/dessins/${f} : <style> dans un fichier référencé par <use> (ignoré par WebKit)`);
}
const inconnues = core.MODELES_INTEGRES.flatMap((m) => (m.gammes ?? []).filter((g) => !core.GAMMES.some((x) => x.id === g)).map((g) => `${m.id} : gamme inconnue « ${g} »`));

if (defauts.length) {
  console.log(`✗ ${defauts.length} couleur(s) littérale(s) hors charte :`);
  for (const d of defauts) console.log(`  ${d}`);
}
for (const d of [...gammes, ...modeles, ...inconnues, ...marques, ...dessins, ...bibliotheque, ...anatomie, ...webkit]) console.log(`✗ ${d}`);
const total = defauts.length + gammes.length + modeles.length + inconnues.length + marques.length + dessins.length + bibliotheque.length + anatomie.length + webkit.length;
console.log(total
  ? `\n${total} écart(s) à la charte.`
  : `✓ Charte respectée : aucune couleur littérale, ${core.GAMMES.length} gammes conformes AA, ${core.MODELES_INTEGRES.length} modèles valides, ${core.UNIVERS_LISTE.reduce((t, u) => t + u.marques.length, 0)} marques de logo dessinées, ${core.DESSINS_PODOLOGIE.length} dessins, ${core.EQUIPEMENTS_DESSINES.length} dessins de matériel, ${core.ANIMATIONS.length} images fixes et ${core.FORMES_BIBLIOTHEQUE.length} formes de la bibliothèque dans ${core.REGISTRES.length} registres ; règles anatomiques vérifiées (proportions du pied et de l’empreinte, semelle, profil, monofilament, coureur, podoscope) ; fichiers de dessins sans <style> (WebKit).`);
process.exit(total ? 1 : 0);
