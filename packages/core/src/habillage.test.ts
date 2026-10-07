// Habillage du studio (typographie, jeux de détails, menus) : catalogue de polices libres, budget, CSS ≤ 4 Ko gzip par recette,
// tirages déterministes et verrous, clés notables, recettes (anciennes inchangées).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAIRES_POLICES } from './modeles';
import { POLICES } from './charte';
import { AXES_TYPO, BUDGET_POLICES, FICHES_POLICES, TYPO_PAR_DEFAUT, accentEffectif, cssTypo, fichePolice, fichiersPolices, graisseTitres, normaliserTypo, poidsPolices, toutesClesTypo } from './typo';
import { ELEMENTS_DETAILS, JEUX_DETAILS, cssDetails, detailsDuJeu, normaliserDetails, toutesClesDetails } from './details';
import { MENUS_MOBILE, MENUS_ORDINATEUR, MENUS_RDV, SCRIPT_MENU, cssMenu, menusPermis, normaliserMenu, toutesClesMenu } from './menus';
import { HABILLAGE_PAR_DEFAUT, cssHabillage, normaliserHabillage, tirerHabillage, attributsHabillage } from './habillage';
import { alea, appliquerRecette, clesRecette, compositionInitiale, compositionPourCle, estCleStudio, normaliserComposition, serialiserComposition, tirerDimension, tirerHabillageRecette, toutChanger, type ContexteRecette } from './recettes';
import { draftVide } from './draft';
import { estCleAsset } from './assets-poids';
import { inventaireStudio } from './assets';

const ctx: ContexteRecette = { sujets: ['sport', 'enfant'], principaux: 2 };

test('catalogue : 20 à 24 paires, polices libres déclarées, 2 familles au plus', () => {
  assert.ok(PAIRES_POLICES.length >= 20 && PAIRES_POLICES.length <= 24);
  assert.equal(new Set(PAIRES_POLICES.map((p) => p.id)).size, PAIRES_POLICES.length);
  // Caractères variés : au moins 7 genres différents parmi les titres
  assert.ok(new Set(PAIRES_POLICES.map((p) => fichePolice(p.titres)?.genre)).size >= 7);
  const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'apps', 'sites', 'package.json')));
  const deps = racine ? ['sites', 'admin'].map((a) => JSON.parse(readFileSync(join(racine, 'apps', a, 'package.json'), 'utf8')).dependencies as Record<string, string>) : [];
  for (const p of PAIRES_POLICES) {
    for (const id of [p.titres, p.texte]) {
      const f = fichePolice(id);
      assert.ok(f, `fiche de ${id}`);
      assert.ok(['OFL-1.1', 'Apache-2.0'].includes(f!.licence));
      assert.ok((POLICES as Record<string, string>)[id]?.includes(f!.famille), `pile de ${id}`);
      for (const d of deps) assert.ok(d[f!.paquet], `${f!.paquet} déclaré`);
    }
    assert.ok(fichiersPolices(p.id).length <= 2);
  }
  assert.equal(new Set(FICHES_POLICES.map((f) => f.id)).size, FICHES_POLICES.length);
});

test('budget : 3 fichiers au plus, ≤ 90 Ko une fois réduits (estimation −28 %), italique remplacé par la couleur sinon', () => {
  for (const p of PAIRES_POLICES) {
    for (const mono of [false, true]) {
      const accent = accentEffectif(p.id, { accent: 'italique' }, { mono });
      const fichiers = fichiersPolices(p.id, { italique: accent === 'italique', mono });
      assert.ok(fichiers.length <= 3, `${p.id} ${fichiers}`);
      if (accent === 'italique') assert.ok(poidsPolices(p.id, { italique: true, mono }) * 0.72 <= BUDGET_POLICES, p.id);
    }
    assert.ok(poidsPolices(p.id) * 0.72 <= BUDGET_POLICES, `${p.id} : ${poidsPolices(p.id)} o`);
  }
  assert.equal(accentEffectif('grotesque', { accent: 'italique' }), 'couleur'); // Schibsted : pas d'italique
  assert.equal(accentEffectif('didone', { accent: 'italique' }), 'italique');
});

test('graisse : bornée à l’axe réel de la police (aucun faux gras)', () => {
  assert.equal(graisseTitres('affiche', { graisse: 'noire' }), 400); // DM Serif Display : 400 seulement
  assert.equal(graisseTitres('condensee', { graisse: 'noire' }), 700);
  assert.equal(graisseTitres('pop', { graisse: 'fine' }), 300);
  assert.equal(graisseTitres('pop', { graisse: 'paire' }), null);
});

test('réglages par défaut : aucune règle CSS, aucun attribut (sites antérieurs inchangés)', () => {
  assert.equal(cssHabillage(HABILLAGE_PAR_DEFAUT), '');
  assert.deepEqual(attributsHabillage(HABILLAGE_PAR_DEFAUT), {});
  assert.deepEqual(normaliserHabillage({ typo: { echelle: 'enorme' }, details: { jeu: 'inconnu' }, menu: { mobile: 'x' } }), HABILLAGE_PAR_DEFAUT);
});

test('CSS par recette ≤ 4 Ko gzip, casse en text-transform seulement, aucune image externe', () => {
  let max = 0;
  const extremes = [
    { echelle: 'spectaculaire', casse: 'majuscules', graisse: 'noire', interlettrage: 'large', accent: 'italique', alignement: 'centre', surtitre: 'numero' },
    { echelle: 'modeste', casse: 'petites-capitales', graisse: 'fine', interlettrage: 'serre', accent: 'couleur', alignement: 'gauche', surtitre: 'pastille' },
  ];
  for (const t of extremes) for (const j of JEUX_DETAILS) for (const o of MENUS_ORDINATEUR) for (const m of MENUS_MOBILE) for (const g of ['tableau', 'revue', 'classique'] as const) {
    const css = cssHabillage(normaliserHabillage({ typo: t, details: detailsDuJeu(j.id), menu: { ordinateur: o.id, mobile: m.id, rdv: 'flottant' } }, g), { police: 'didone', gabarit: g });
    max = Math.max(max, gzipSync(css).length);
    assert.ok(!/url\((?!"data:)/.test(css.replace(/url\("data:[^"]*"\)/g, '')), 'aucune ressource externe');
    assert.ok(!/content:\s*'[A-Za-zÀ-ÿ]{2,}/.test(css), 'aucun texte ajouté');
  }
  assert.ok(max <= 4096, `${max} o gzip`);
  assert.match(cssTypo({ ...TYPO_PAR_DEFAUT, casse: 'majuscules' }), /text-transform:uppercase/);
  // Registre pédagogique : jamais de surtitre numéroté
  assert.match(cssTypo({ ...TYPO_PAR_DEFAUT, surtitre: 'numero' }), /\[data-td\]:not\(\[data-registre=pedagogique\]\)/);
});

test('chaque valeur produit une règle (aucun réglage sans effet)', () => {
  for (const [a, vals] of Object.entries(AXES_TYPO)) for (const v of vals) {
    if ((TYPO_PAR_DEFAUT as Record<string, string>)[a] === v.id) continue;
    if (a === 'graisse') continue; // graisse : jeton du modèle (modeleDuSite), pas de CSS
    if (a === 'accent' && v.id === 'italique') continue; // dépend de la paire
    assert.ok(cssTypo({ ...TYPO_PAR_DEFAUT, [a]: v.id }), `${a}:${v.id}`);
  }
  for (const [e, vals] of Object.entries(ELEMENTS_DETAILS)) for (const v of vals) {
    const base = detailsDuJeu('gabarit') as Record<string, string>;
    if (base[e] === v.id) continue;
    assert.ok(cssDetails({ ...base, [e]: v.id }), `${e}:${v.id}`);
  }
  for (const o of MENUS_ORDINATEUR.slice(1)) assert.ok(cssMenu({ ordinateur: o.id }, 'revue'), o.id);
  for (const m of MENUS_MOBILE.slice(1)) assert.ok(cssMenu({ mobile: m.id }, 'tableau'), m.id);
  for (const r of MENUS_RDV.slice(1)) assert.ok(cssMenu({ rdv: r.id }), r.id);
});

test('menus : variantes permises par gabarit, script du bouton « Menu » < 1 Ko', () => {
  assert.ok(!menusPermis('tableau').ordinateur.includes('laterale'));
  assert.ok(menusPermis('revue').ordinateur.includes('laterale'));
  assert.deepEqual([...menusPermis('classique').mobile], ['gabarit', 'tiroir']);
  assert.equal(normaliserMenu({ ordinateur: 'laterale', mobile: 'onglets' }, 'tableau').ordinateur, 'gabarit');
  assert.ok(Buffer.byteLength(SCRIPT_MENU) < 1024, `${Buffer.byteLength(SCRIPT_MENU)} o`);
  // Aucun « < » : le script reste lisible par l'intégration des mots insécables (découpe du HTML par balises)
  assert.ok(!SCRIPT_MENU.includes('<'));
  // La barre d'onglets remplace la barre d'actions (jamais deux boutons « Rendez-vous »)
  assert.match(cssMenu({ mobile: 'onglets' }), /\.c-barre,\.c-flottant/);
});

test('tirages : déterministes, verrous respectés, jeu de détails entier', () => {
  const a = tirerHabillage(HABILLAGE_PAR_DEFAUT, alea(7, 'h'));
  const b = tirerHabillage(HABILLAGE_PAR_DEFAUT, alea(7, 'h'));
  assert.deepEqual(a, b);
  const fige = tirerHabillage(a, alea(8, 'h'), { verrous: ['hab:typo:casse', 'hab:details:jeu', 'hab:menu:mobile'] });
  assert.equal(fige.typo.casse, a.typo.casse);
  assert.deepEqual(fige.details, a.details);
  assert.equal(fige.menu.mobile, a.menu.mobile);
  const jeu = tirerHabillage(HABILLAGE_PAR_DEFAUT, alea(3, 'j'), { axes: [{ groupe: 'details', axe: 'jeu' }] });
  assert.deepEqual(jeu.details, detailsDuJeu(jeu.details.jeu));
  // Élément verrouillé : gardé quand le jeu change
  const coins = tirerHabillage({ ...jeu, details: { ...jeu.details, coins: 'mixtes' } }, alea(4, 'j'), { axes: [{ groupe: 'details', axe: 'jeu' }], verrous: ['hab:details:coins'] });
  assert.equal(coins.details.coins, 'mixtes');
  // Assez de variété : 30 tirages donnent au moins 5 jeux et 3 échelles
  const l = Array.from({ length: 30 }, (_, i) => tirerHabillage(HABILLAGE_PAR_DEFAUT, alea(i, 'v')));
  assert.ok(new Set(l.map((h) => h.details.jeu)).size >= 5);
  assert.equal(new Set(l.map((h) => h.typo.echelle)).size, 3);
});

test('recettes : dés typo / détails / menu, enregistrement, anciennes recettes inchangées', () => {
  const x = compositionInitiale(ctx);
  assert.deepEqual(normaliserHabillage(x), HABILLAGE_PAR_DEFAUT);
  const y = tirerDimension(tirerDimension(tirerDimension(x, 'typo', ctx, 3), 'details', ctx, 4), 'menu', ctx, 5);
  assert.notDeepEqual(normaliserHabillage(y), HABILLAGE_PAR_DEFAUT);
  // Sérialisée puis relue : identique
  const relue = normaliserComposition(JSON.parse(serialiserComposition(y)), ctx)!;
  assert.deepEqual(normaliserHabillage(relue), normaliserHabillage(y));
  // Ancienne recette (sans habillage) : réglages par défaut, aucun champ sur le thème
  const ancienne = JSON.parse(serialiserComposition(x));
  delete ancienne.typo; delete ancienne.details; delete ancienne.menu;
  const r = appliquerRecette(draftVide(), normaliserComposition(ancienne, ctx)!)!;
  assert.equal(r.draft.theme.typo, undefined);
  const r2 = appliquerRecette(draftVide(), y)!;
  assert.deepEqual(r2.draft.theme.details, y.details);
  // Graisse « noire » posée sur le modèle rendu (bornée)
  const noire = appliquerRecette(draftVide(), { ...y, police: 'condensee', typo: { ...y.typo!, graisse: 'noire' } })!;
  assert.equal(noire.modele.jetons.graisseTitres, 700);
  // Verrous d'axe : « Tout changer » garde la casse verrouillée
  const v = toutChanger({ ...y, typo: { ...y.typo!, casse: 'majuscules' } }, ['hab:typo:casse'], ctx, 11);
  assert.equal(v.typo!.casse, 'majuscules');
  // Dé d'un seul axe : seul cet axe change
  const un = tirerHabillageRecette(y, { groupe: 'typo', axe: 'echelle' }, ctx, 12);
  assert.notEqual(un.typo!.echelle, y.typo!.echelle);
  assert.deepEqual({ ...un.typo, echelle: 0 }, { ...y.typo, echelle: 0 });
  // Apprentissage : clés atelier et notables de l'habillage
  const k = clesRecette(y, ctx.sujets);
  assert.ok(k.atelier.some((c) => c.startsWith('typo=echelle:')) && k.atelier.some((c) => c.startsWith('details=jeu:')) && k.atelier.some((c) => c.startsWith('menu=mobile:')));
  assert.ok(k.assets.some((c) => c.startsWith('typo:police:')) && k.assets.some((c) => c.startsWith('menu:')));
});

test('notables : clés connues, valides en base, inventaire et aperçu de la clé', () => {
  const cles = [...toutesClesTypo(), ...toutesClesDetails(), ...toutesClesMenu()];
  assert.ok(cles.length > 60);
  for (const k of cles) {
    assert.ok(estCleStudio(k), k);
    assert.ok(estCleAsset(k), k);
  }
  const inv = new Set(inventaireStudio().map((a) => a.cle));
  for (const k of cles) assert.ok(inv.has(k), k);
  const x = compositionInitiale(ctx);
  assert.equal(compositionPourCle(x, 'typo:casse:majuscules').typo!.casse, 'majuscules');
  assert.equal(compositionPourCle(x, 'typo:police:luxe').police, 'luxe');
  assert.equal(compositionPourCle(x, 'details:jeu:graphique-pop').details!.ombres, 'portee');
  assert.equal(compositionPourCle(x, 'menu:mobile:onglets').menu!.mobile, 'onglets');
  assert.equal(normaliserDetails({ jeu: 'magazine', coins: 'arrondis' }).coins, 'arrondis');
  assert.equal(normaliserTypo({ casse: 'majuscules' }).casse, 'majuscules');
});

test('polices auto-hébergées seulement : aucun appel à Google Fonts dans les sources', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'apps', 'sites', 'src')));
  if (!racine) return;
  const interdit = ['fonts.google', 'apis.com', 'fonts.gst', 'atic.com'];
  const motif = new RegExp(`${interdit[0]}${interdit[1]}|${interdit[2]}${interdit[3]}`.replace(/\./g, '\.'));
  const parcourir = (d: string): string[] => readdirSync(d).flatMap((f) => { const x = join(d, f); return statSync(x).isDirectory() ? (f === 'node_modules' ? [] : parcourir(x)) : /\.(astro|ts|tsx|mjs|js|css|html)$/.test(f) ? [x] : []; });
  for (const d of ['apps/sites/src', 'apps/admin/src', 'packages/core/src', 'packages/contenus/src']) {
    if (!existsSync(join(racine, d))) continue;
    for (const f of parcourir(join(racine, d))) assert.ok(!motif.test(readFileSync(f, 'utf8')), f);
  }
});

test('gabarit revue : paires permises dans le budget avec l’italique des titres', async () => {
  const { policePermise } = await import('./typo');
  for (const p of PAIRES_POLICES) {
    if (policePermise(p.id, 'revue') && fichePolice(p.titres)?.italique) assert.ok(poidsPolices(p.id, { italique: true }) * 0.72 <= BUDGET_POLICES, p.id);
  }
  assert.equal(policePermise('gazette', 'revue'), false);
  assert.equal(policePermise('gazette', 'tableau'), true);
  const r = normaliserComposition({ ...JSON.parse(serialiserComposition(compositionInitiale(ctx))), structure: 'elegant-sobre', police: 'gazette' }, ctx)!;
  assert.notEqual(r.police, 'gazette');
});
