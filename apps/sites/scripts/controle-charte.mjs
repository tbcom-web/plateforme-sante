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
  stdin: { contents: "export { GAMMES, verifierGamme, MODELES_INTEGRES, validerManifeste, feuilleCharte, UNIVERS_LISTE, MARQUES_DESSINEES, DESSINS_PODOLOGIE, ANIMATIONS, REGISTRES, svgDessin, svgAnimationFixe, PHOTOS_DESSINS, VISUELS_SOINS, EQUIPEMENTS, EQUIPEMENTS_DESSINES, svgEquipement, FORMES_BIBLIOTHEQUE, BIBLIOTHEQUE, svgForme, jetonsSansCorrespondance, DESSINS_LIGNE, svgLigne, svgElement, CATALOGUE_UNIVERS, validerUnivers, appliquerUnivers, draftVide, UNIVERS_DU_PROFIL } from '@plateforme/core';", resolveDir: racine, loader: 'ts' },
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
// Registre « ligne » (trait continu, packages/core/src/ligne.ts) : 1 à 3 chemins, aucun aplat (fill="none" partout, ni <rect>, <circle>,
// <ellipse>, <polygon>), épaisseur en unités locales (jamais vector-effect : tracé tronqué dans WebKit avec pathLength), pathLength="1"
// sur chaque chemin (animation du tracé), aucune <style>, poids léger (≤ 16 ko).
const LIMITE_KO_LIGNE = 16;
const defautsLigne = (svg, quoi) => {
  const chemins = (svg.match(/<path\b/g) || []).length, d = [];
  if (chemins < 1 || chemins > 3) d.push(`${quoi} : ${chemins} chemin(s) (attendu 1 à 3)`);
  if (/fill="(?!none)/.test(svg) || /<(rect|circle|ellipse|polygon|text)\b/.test(svg)) d.push(`${quoi} : aplat ou forme pleine dans le registre ligne`);
  if (/vector-effect/.test(svg)) d.push(`${quoi} : vector-effect (tracé tronqué dans WebKit avec pathLength)`);
  if ((svg.match(/pathLength="1"/g) || []).length !== chemins) d.push(`${quoi} : chemin sans pathLength="1"`);
  if (/<style[\s>]/.test(svg)) d.push(`${quoi} : <style> dans un dessin en ligne`);
  if (invalide(svg)) d.push(`${quoi} : valeur invalide`);
  if (Buffer.byteLength(svg) / 1024 > LIMITE_KO_LIGNE) d.push(`${quoi} : ${(Buffer.byteLength(svg) / 1024).toFixed(1)} ko (> ${LIMITE_KO_LIGNE} ko)`);
  return d;
};
const dessins = [
  ...core.DESSINS_PODOLOGIE.flatMap((n) => core.REGISTRES.flatMap((r) => {
    const svg = core.svgDessin(n, { registre: r });
    if (r === 'ligne') return defautsLigne(svg, `dessin « ${n} » (ligne)`);
    return [...(invalide(svg) ? [`dessin « ${n} » (${r}) : valeur invalide`] : []), ...(elements(svg) < 8 ? [`dessin « ${n} » (${r}) : vide`] : [])];
  })),
  ...core.DESSINS_LIGNE.flatMap((l) => ['discretes', 'marquees'].flatMap((b) => defautsLigne(core.svgLigne(l, { boucles: b }), `dessin ligne « ${l} » (boucles ${b})`))),
  ...core.ANIMATIONS.flatMap((a) => core.REGISTRES.flatMap((r) => {
    const svg = core.svgAnimationFixe(a, { registre: r });
    return [...(invalide(svg) ? [`image fixe « ${a} » (${r}) : valeur invalide`] : []), ...(elements(svg) > LIMITE_ELEMENTS ? [`image fixe « ${a} » (${r}) : ${elements(svg)} éléments (> ${LIMITE_ELEMENTS})`] : [])];
  })),
  ...core.EQUIPEMENTS_DESSINES.flatMap((id) => [
    ...(core.EQUIPEMENTS.some((e) => e.id === id) ? [] : [`dessin de matériel « ${id} » absent du catalogue EQUIPEMENTS`]),
    ...core.REGISTRES.flatMap((r) => {
      const svg = core.svgEquipement(id, { registre: r });
      if (r === 'ligne') return defautsLigne(svg, `dessin de matériel « ${id} » (ligne)`);
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
  // Registre ligne des éléments : le dessin au trait continu du même sujet, ou la forme pédagogique (sans couleur littérale)
  ...core.BIBLIOTHEQUE.flatMap((e) => e.declinaisons.flatMap((d) => { const svg = core.svgElement(e.id, { vue: d.vue, etat: d.etat, registre: 'ligne' }); return invalide(svg) || litterales(svg).length ? [`bibliothèque « ${e.id} » ${d.vue}/${d.etat} (ligne) : invalide ou couleur littérale`] : []; })),
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
    if (/class="(zone|point|anneau|trame)\b/.test(svg)) anatomie.push(`dessin « ${n} » (pédagogique) : couleur ou point posé sur la peau`);
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
  for (const [nom, svg] of [['talon', fs2.fichierSvg(fs2.symboleDessin('talon'), feuille)], ['materiel-podoscope', fs2.fichierSvg(fs2.symboleEquipement('podoscope'), feuille)], ['talon-ligne', fs2.fichierSvg(fs2.symboleDessin('talon', { registre: 'ligne' }), feuille)], ['materiel-fauteuil-soins-ligne', fs2.fichierSvg(fs2.symboleEquipement('fauteuil-soins', { registre: 'ligne' }), feuille)]]) {
    if (/<style[s>]/.test(svg)) webkit.push(`fichier de dessin « ${nom} » : <style> (ignoré par WebKit)`);
    if (nom === 'talon' && !/class="mono[^"]*"[^>]*style="[^"]*font-size/.test(svg)) webkit.push(`fichier de dessin « ${nom} » : styles des étiquettes absents des attributs`);
    // Registre ligne : trait, épaisseur et couleur EN ATTRIBUTS (WebKit), aucune règle de la page reportée sur le trait (le pointillé
    // d'attente n'est posé que par la page, à l'apparition)
    if (nom.endsWith('-ligne') && (!/class="ligne"[^>]*style="stroke:[^"]*stroke-width:/.test(svg) || /stroke-dasharray/.test(svg))) webkit.push(`fichier de dessin « ${nom} » : trait du registre ligne sans styles en attributs, ou pointillé figé`);
  }
  const dossierDist = join(racine, 'dist/dessins');
  let fichiersDist = [];
  try { fichiersDist = readdirSync(dossierDist).filter((f) => f.endsWith('.svg')); } catch {}
  for (const f of fichiersDist) if (/<style[s>]/.test(readFileSync(join(dossierDist, f), 'utf8'))) webkit.push(`dist/dessins/${f} : <style> dans un fichier référencé par <use> (ignoré par WebKit)`);
}
// Moteur de contenus (packages/contenus, réseaux sociaux) : gabarits sans couleur littérale (toutes les couleurs viennent de la
// charte, de la gamme ou de la couleur du cabinet) ; catalogue de sujets et publications de tous les formats conformes aux
// garde-fous (sources, mentions, lexique, lecture), pour le cabinet de démo et trois identités fictives ; garde-fou « faible niveau
// de preuve » actif. Exclu : reels/ecranzen (copie conforme du studio ÉcranZen, ses palettes y sont définies — voir docs/moteur-contenus.md).
// Les contrôles de rendu (débordement, taille ≥ 34 px, contraste AA mesuré, zone utile des Stories) tournent dans le navigateur à
// chaque génération (packages/contenus/scripts/generer.mjs) : une diapositive en défaut n'est pas exportée.
const contenus = [];
let nbSujets = 0;
{
  const dossierContenus = join(racine, '../../packages/contenus');
  for (const sous of ['src', 'scripts']) {
    for (const f of fichiers(join(dossierContenus, sous))) {
      readFileSync(f, 'utf8').split(/\r?\n/).forEach((ligne, i) => {
        if (EXCEPTION_LIGNE.test(ligne)) return;
        for (const re of [HEX, FONCTION]) for (const m of ligne.matchAll(re)) {
          if (re === HEX && ANCRE.test(ligne.slice(0, m.index))) continue;
          contenus.push(`${relative(dossierContenus, f).replaceAll('\\', '/')}:${i + 1}  ${m[0]} : couleur littérale dans le moteur de contenus`);
        }
      });
    }
  }
  const sortieC = join(tmpdir(), `controle-charte-contenus-${process.pid}.mjs`);
  await build({ stdin: { contents: "export * from '../../packages/contenus/src/index.ts'; export { default as SITE_DEMO } from './src/data/sites/demo-podologue-lyon.ts';", resolveDir: racine, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: sortieC, logLevel: 'silent', loader: { '.css': 'text' } });
  const K = await import(pathToFileURL(sortieC).href);
  rmSync(sortieC, { force: true });
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const identites = [
    K.identiteDepuisSite(K.SITE_DEMO),
    K.identiteRapide({ nom: 'Cabinet du Parc', praticiens: ['A B'], ville: 'Nantes', domaine: 'exemple.fr', modele: 'premium', gamme: 'canard' }),
    K.identiteRapide({ nom: 'Cabinet de pédicurie-podologie des Coteaux de Saint-Germain-en-Laye', praticiens: ['A B', 'C D'], ville: 'Saint-Germain-en-Laye', domaine: 'exemple.fr', modele: 'simple', gamme: 'sable' }),
    K.identiteRapide({ nom: 'L’Atelier du Pied — « Beaune » & Cie', praticiens: ['Élodie Ægerter'], ville: 'Beaune', domaine: 'exemple.fr', modele: 'prestige', gamme: 'encre' }),
  ];
  for (const s of K.SUJETS) {
    contenus.push(...K.verifierSujet(s, aujourdHui).erreurs);
    for (const f of ['carrousel', 'post', 'story', 'google']) for (const i of identites) contenus.push(...K.verifierPublication(K.personnaliser(K.composer(s, f), s, i)).erreurs);
  }
  for (const i of identites) contenus.push(...K.verifierIdentite(i.nom, i.praticiens).erreurs);
  contenus.push(...K.verifierEnchainements(K.MOIS_TYPE_OCTOBRE));
  const faible = K.verifierSujet({ ...K.SUJETS[0], id: 'essai', specialite: 'posture', niveauPreuve: 'faible' }, aujourdHui);
  if (!faible.erreurs.some((e) => /faible niveau de preuve/.test(e))) contenus.push('garde-fou « faible niveau de preuve » inactif');
  nbSujets = K.SUJETS.length;
}
// Univers du catalogue (catalogue-univers.ts) : préréglages valides (soins du catalogue, sections du modèle, aucun sujet à
// faible niveau de preuve hors « differe »), profils qui ne recommandent qu'un univers proposable, identité jamais touchée.
const univers = core.CATALOGUE_UNIVERS.flatMap((u) => core.validerUnivers(u, { soinsConnus: Object.keys(core.VISUELS_SOINS) }).map((e) => `univers ${u.id} : ${e}`));
{
  const posture = core.CATALOGUE_UNIVERS.find((u) => u.preReglage.specialite === 'posture');
  if (!posture || !core.validerUnivers({ ...posture, statut: 'brouillon' }).some((e) => /faible niveau de preuve/.test(e))) univers.push('garde-fou « faible niveau de preuve » des univers inactif');
  const zen = core.CATALOGUE_UNIVERS[0];
  if (!core.validerUnivers({ ...zen, pourQui: 'Réflexologie plantaire et bien-être' }).some((e) => /faible niveau de preuve/.test(e))) univers.push('garde-fou « réflexologie » des univers inactif');
}
for (const [profil, id] of Object.entries(core.UNIVERS_DU_PROFIL)) {
  const u = core.CATALOGUE_UNIVERS.find((x) => x.id === id);
  if (!u || ['differe', 'retire'].includes(u.statut)) univers.push(`profil « ${profil} » : univers recommandé absent ou non proposable (${id})`);
}
{
  const d = core.draftVide();
  Object.assign(d.cabinet, { nom: 'Cabinet du Parc', ville: 'Nantes', telephone: '02 40 00 00 00' });
  d.praticiens[0] = { ...d.praticiens[0], prenom: 'Anne', nom: 'Martin', photo: 'https://exemple/portrait.webp' };
  d.photos = { accueil: 'https://exemple/a.webp', panorama: '', cabinet: ['https://exemple/c.webp'] };
  d.theme.logoPerso = { url: 'https://exemple/logo.png', complet: true };
  d.soins = ['bilan-podologique'];
  d.flux.mode = 'auto';
  const identite = (x) => JSON.stringify([x.pays, x.profil, x.voix, x.cabinet, x.lieux, x.praticiens, x.acces, x.rdv, x.paiements, x.equipements, x.domicile, x.message, x.conventionnement, x.photos, x.soins, x.perso, x.theme.logoPerso, x.flux.mode]);
  for (const u of core.CATALOGUE_UNIVERS) {
    const r = core.appliquerUnivers(d, u, { autoriserNonValide: true });
    if (identite(r.draft) !== identite(d)) univers.push(`univers ${u.id} : appliquerUnivers modifie l'identité du cabinet`);
    if (r.draft.theme.univers !== u.id || r.draft.theme.modele !== u.preReglage.modele) univers.push(`univers ${u.id} : préréglage non appliqué`);
  }
}
const inconnues = core.MODELES_INTEGRES.flatMap((m) => (m.gammes ?? []).filter((g) => !core.GAMMES.some((x) => x.id === g)).map((g) => `${m.id} : gamme inconnue « ${g} »`));

// Pictogrammes métier (pictos.ts) : grille 48, un seul trait, aucune couleur littérale ni <style> (scripts/controle-pictos.mjs)
const pictos = await import('./controle-pictos.mjs');
anatomie.push(...pictos.defauts.map((d) => `picto ${d}`));
if (!pictos.defauts.length) console.log(`✓ ${pictos.resume}`);
if (defauts.length) {
  console.log(`✗ ${defauts.length} couleur(s) littérale(s) hors charte :`);
  for (const d of defauts) console.log(`  ${d}`);
}
for (const d of [...gammes, ...modeles, ...univers, ...inconnues, ...marques, ...dessins, ...bibliotheque, ...anatomie, ...webkit, ...contenus]) console.log(`✗ ${d}`);
const total = defauts.length + gammes.length + modeles.length + univers.length + inconnues.length + marques.length + dessins.length + bibliotheque.length + anatomie.length + webkit.length + contenus.length;
console.log(total
  ? `\n${total} écart(s) à la charte.`
  : `✓ Charte respectée : aucune couleur littérale, ${core.GAMMES.length} gammes conformes AA, ${core.MODELES_INTEGRES.length} modèles valides, ${core.CATALOGUE_UNIVERS.length} univers de catalogue valides (identité préservée), ${core.UNIVERS_LISTE.reduce((t, u) => t + u.marques.length, 0)} marques de logo dessinées, ${core.DESSINS_PODOLOGIE.length} dessins, ${core.EQUIPEMENTS_DESSINES.length} dessins de matériel, ${core.ANIMATIONS.length} images fixes et ${core.FORMES_BIBLIOTHEQUE.length} formes de la bibliothèque dans ${core.REGISTRES.length} registres ; ${core.DESSINS_LIGNE.length} dessins au trait continu (1 à 3 chemins, sans aplat) ; règles anatomiques vérifiées (proportions du pied et de l’empreinte, semelle, profil, monofilament, coureur, podoscope) ; fichiers de dessins sans <style> (WebKit) ; moteur de contenus : gabarits sans couleur littérale, ${nbSujets} sujets et leurs publications (4 formats × 4 identités) conformes aux garde-fous.`);
process.exit(total ? 1 : 0);
