// Fond du premier écran (fonds-heros.ts, retour de Paul du 2026-10-09 : « assez vide, il manque de la matière en arrière-plan ») :
// poids < 4 Ko, statique, jamais d'image en url() (LCP = titre), contraste AA calculé sur toutes les gammes, rendu dans htmlHeros,
// règle dure « jamais un premier écran vide », réparation des compositions, tirages, praticien, règle apprise « trop vide ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FONDS_HEROS, FOND_HEROS_PAR_FAMILLE, INGREDIENTS_A_VALIDER, PREMIERS_ECRANS_SANS_VISUEL, type FondHeros } from './heros-photo-variantes';
import { alphaFond, alphaFondHeros, cssFondHeros, fondHerosEffectif, htmlFondHeros, poidsFondHeros } from './fonds-heros';
import { htmlHeros, styleCouleursHeros, type DonneesHeros } from './heros-photo';
import { modeleIntegre, VARIANTES_SECTIONS, variantesValides } from './modeles';
import { GAMMES } from './gammes';
import { contraste, melanger } from './couleurs';
import { compositionInitiale, compositionPourCle, reparerComposition, toutChanger, valeursTirables, type CompositionRecette, type ContexteRecette } from './recettes';
import { ETIQUETTES_HARMONIE, familleDePolice, familleDominante, reparerHarmonie, violationsDures } from './harmonie';
import { apprendreRegles, attributsDeCle, CATALOGUE_REGLES, declenche, SIGNAUX_CONSIGNES, signauxDepuisRetours } from './regles-apprises';

const FONDS = FONDS_HEROS.filter((f): f is Exclude<FondHeros, 'aucun'> => f !== 'aucun');
const base = (x: Partial<DonneesHeros> = {}): DonneesHeros => ({
  variante: 'typographique', transition: 'fondu', balise: 'h1', sur: 'Pédicure-podologue · Lyon', metier: 'pédicurie-podologie', ville: 'à Lyon',
  qui: 'Camille Rousseau', soins: 'Bilan podologique et semelles.', actions: [{ href: '/rdv', libelle: 'Prendre rendez-vous', plein: true }],
  photos: [], sujets: [], lieu: null, couleurs: styleCouleursHeros(modeleIntegre('tableau'), { couleur: '#6b2f5f', gamme: 'prune' }), motLong: 20, mode: 'site', ...x,
});

test('chaque fond : < 4 Ko (balisage + feuille), statique, sans image en url(), décoratif', () => {
  for (const f of FONDS) {
    if (f !== 'illustration') assert.ok(poidsFondHeros(f) < 4096, `${f} : ${poidsFondHeros(f)} o`);
    const h = htmlFondHeros(f, 0.2).avant + cssFondHeros(f);
    assert.ok(!/url\(/.test(h), `${f} : image en url()`);
    assert.ok(!/@keyframes|animation:/.test(h), `${f} : animé`);
    assert.ok(htmlFondHeros(f, 0.2).avant.includes('aria-hidden="true"'), f);
  }
  assert.equal(cssFondHeros('aucun'), '');
  // Empreintes : géométries validées seulement (contour du héros « semelles » et courbes de niveau), deux pieds par <use>
  assert.equal((htmlFondHeros('empreintes', 0.2).avant.match(/<use /g) ?? []).length, 2);
});

test('contraste AA calculé : le pire pixel (motif plein) garde chaque texte ≥ 4,5:1, sur toutes les gammes', () => {
  for (const g of GAMMES) {
    for (const gabarit of ['tableau', 'revue'] as const) {
      const style = styleCouleursHeros(modeleIntegre(gabarit), { couleur: g.accent, gamme: g.id });
      const v = (n: string) => new RegExp(`--hp-${n}:(#[0-9a-f]{6})`, 'i').exec(style)![1];
      for (const f of FONDS) {
        const a = alphaFondHeros(f, 'typographique', style);
        const motifs = f === 'illustration' ? ['#ffffff', '#000000'] : f.startsWith('formes') ? [v('aplat'), v('bulle'), v('vif')] : [v('plein-texte')];
        for (const m of motifs) assert.ok(contraste(v('plein-texte'), melanger(v('plein'), m, a)) >= 4.5, `${g.id} ${f} ${a}`);
      }
      // Trait (empreintes) : visible sur le typographique (≥ 0,1) dès que le fond le permet
      if (contraste(v('plein-texte'), v('plein')) >= 6) assert.ok(alphaFondHeros('empreintes', 'typographique', style) >= 0.1, g.id);
    }
  }
  assert.equal(alphaFond(['#777777'], ['#808080'], ['#ffffff']), 0);
});

test('rendu : la couche se pose sous le texte des premiers écrans sans visuel, jamais ailleurs ; sans fond, rendu d’avant', () => {
  const avant = htmlHeros(base());
  assert.ok(avant.avant.includes('hp__trame') && !avant.avant.includes('hp__fh'));
  for (const f of FONDS) {
    const h = htmlHeros(base({ fond: f }));
    assert.ok(!h.avant.includes('hp__trame'), f);
    assert.ok(h.css.includes(`.hp__fh--${f}`), f);
    // La couche précède le cadre du texte (H1) : le titre reste le premier contenu et l'élément LCP
    const tout = h.avant + h.apres;
    assert.ok(tout.indexOf('hp__fh') < tout.indexOf('<h1'), f);
    assert.equal(h.fente, f === 'illustration', f);
  }
  for (const v of PREMIERS_ECRANS_SANS_VISUEL) assert.ok(htmlHeros(base({ variante: v as never, fond: 'topographie' })).avant.includes('hp__fh--topographie'), v);
  // Premier écran à visuel : le fond est ignoré
  assert.ok(!htmlHeros(base({ variante: 'bento', fond: 'empreintes' })).avant.includes('hp__fh'));
});

test('fond effectif : choisi, sinon celui de la famille ; praticien : la trame ; illustration seulement si elle existe', () => {
  assert.equal(fondHerosEffectif('bento', 'empreintes'), null);
  assert.equal(fondHerosEffectif('typographique', 'trame'), 'trame');
  assert.equal(fondHerosEffectif('typographique', 'aucun', { famille: 'editorial-chic' }), 'empreintes');
  assert.equal(fondHerosEffectif('typographique', undefined, { famille: 'graphique-pop' }), 'formes-franches');
  assert.equal(fondHerosEffectif('typographique', 'illustration', { famille: 'technique-net', illustration: false }), 'topographie');
  // Seuil de masse : trajectoires et illustration estompée jamais sur le typographique ; décors légers → héros illustré
  assert.equal(fondHerosEffectif('typographique', 'trajectoires', { famille: 'minimal-clinique' }), 'trame');
  assert.equal(fondHerosEffectif('papier-decoupe', 'trajectoires'), 'trajectoires');
  assert.equal(fondHerosEffectif('forme-respire', undefined, { famille: 'nature-chaleureuse', style: 'ligne', illustration: true }), 'illustration');
  assert.equal(fondHerosEffectif('typographique', undefined, { famille: 'editorial-chic', permis: (f) => f === 'trame' }), 'trame');
  assert.equal(familleDePolice('didone'), 'editorial-chic');
  for (const f of Object.values(FOND_HEROS_PAR_FAMILLE)) assert.ok(FONDS.includes(f));
});

test('ingrédient du studio : dé, verrou, étiquettes d’harmonie, à valider (sauf la trame), « aucun » jamais tiré', () => {
  assert.deepEqual([...VARIANTES_SECTIONS['fond-heros']], [...FONDS_HEROS]);
  for (const f of FONDS_HEROS) assert.ok(ETIQUETTES_HARMONIE[`v.fond-heros:${f}`], f);
  for (const f of FONDS) assert.ok((ETIQUETTES_HARMONIE[`v.fond-heros:${f}`].fort ?? 0) < 0.8, `${f} : jamais un élément fort`);
  assert.ok(INGREDIENTS_A_VALIDER.has('composant:fond-heros:empreintes') && !INGREDIENTS_A_VALIDER.has('composant:fond-heros:trame'));
  assert.ok(!valeursTirables('fond-heros', 'tableau', false).includes('aucun'));
  assert.deepEqual(valeursTirables('fond-heros', 'tableau', false, { praticien: true }), ['trame']);
  assert.equal(variantesValides({ 'fond-heros': 'trame' }, 'classique')['fond-heros'], 'trame');
});

const c: ContexteRecette = { sujets: ['ongles', 'pedicurie'], principaux: 2 };
const avec = (x: CompositionRecette, v: Record<string, string | undefined>): CompositionRecette => ({ ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, ...v } as never } });

test('cas de Paul (Éditorial chic · typo didone · trait fin, typographique, prune) : réparé avec le filigrane d’empreintes', () => {
  const x0 = compositionInitiale(c);
  const paul = avec({ ...x0, structure: 'elegant-sobre', police: 'didone' as never, gamme: 'prune', couleur: '#6b2f5f', visuels: { ...x0.visuels, style: 'ligne' as never } }, { accueil: 'typographique', 'fond-heros': undefined });
  assert.ok(violationsDures(paul as never, c).some((v) => v.code === 'fond-vide'));
  const y = reparerComposition(paul, c);
  assert.equal(familleDominante(y as never)[0].id, 'editorial-chic');
  assert.equal(y.sections.variantes['fond-heros'], 'empreintes');
  assert.ok(!violationsDures(y as never, c).some((v) => v.code === 'fond-vide'));
  // Règle dure : « aucun » est corrigé par le fond de la famille d'abord
  const r = reparerHarmonie(avec(y, { 'fond-heros': 'aucun' }) as never, [], c);
  assert.equal((r as CompositionRecette).sections.variantes['fond-heros'], 'empreintes');
  // Praticien : seulement la trame tant que les autres fonds sont à valider
  assert.equal(reparerComposition(paul, { ...c, praticien: true }).sections.variantes['fond-heros'], 'trame');
  // Composition qui a déjà un visuel : inchangée (aucun fond ajouté)
  const carte = avec(x0, { accueil: 'bento', 'fond-heros': undefined });
  assert.equal(reparerComposition(carte, c).sections.variantes['fond-heros'], undefined);
  // Tuile : le fond se montre sur un premier écran sans visuel
  assert.equal(compositionPourCle(carte, 'composant:fond-heros:trame').sections.variantes.accueil, 'typographique');
});

test('génération : « Tout changer » n’émet jamais un premier écran sans visuel et sans fond (200 tirages, 4 profils)', () => {
  let sansVisuel = 0;
  for (const sujets of [['ongles'], ['sport', 'semelles'], ['enfant'], ['diabete', 'senior']]) {
    const ctx: ContexteRecette = { sujets, principaux: Math.min(2, sujets.length) };
    let x = compositionInitiale(ctx);
    for (let g = 1; g <= 50; g++) {
      x = toutChanger(x, [], ctx, g);
      const v = x.sections.variantes;
      if (PREMIERS_ECRANS_SANS_VISUEL.includes(v.accueil as string)) { sansVisuel++; assert.ok(v['fond-heros'] && v['fond-heros'] !== 'aucun', `${sujets} ${g}`); }
      else assert.equal(v['fond-heros'], undefined);
    }
  }
  assert.ok(sansVisuel > 0, 'aucun premier écran sans visuel tiré');
});

test('règle apprise « trop vide » : étiquette et mots-clés, cible les premiers écrans sans matière, premier signal de Paul', () => {
  const r = CATALOGUE_REGLES.find((x) => x.id === 'trop-vide')!;
  for (const t of ['assez vide', 'un peu fade', 'il manque de la matière', 'c’est plat', 'juste du texte sur un aplat']) assert.ok(declenche(r, { texte: t }), t);
  assert.ok(declenche(r, { etiquettes: ['trop-vide'] }));
  assert.ok(r.cible('composant:accueil:typographique', {}) && r.cible('composant:fond-heros:aucun', {}));
  assert.ok(!r.cible('composant:accueil:bento', {}) && !r.cible('composant:fond-heros:empreintes', {}));
  // Le retour de Paul du 2026-10-09 est compté (support 1), pas encore assez pour agir seul (3 retours)
  assert.equal(SIGNAUX_CONSIGNES.length, 1);
  const regles = apprendreRegles(signauxDepuisRetours({}), (k) => attributsDeCle(k));
  const tv = regles.find((x) => x.id === 'trop-vide')!;
  assert.equal(tv.support, 1);
  assert.equal(tv.active, false);
  assert.deepEqual(signauxDepuisRetours({ consignes: [] }), []);
});

test('second cas de Paul (Doux et rond · illustrations douces, dégradé maillé + anneau) : le héros illustré du thème, net, devant les aplats', () => {
  const x0 = compositionInitiale(c);
  const doux = avec({ ...x0, structure: 'simple-proche', police: 'douce' as never, gamme: 'menthe', couleur: '#0f7563', visuels: { ...x0.visuels, style: 'pedagogique' as never, herosSujet: 'ongles' } }, { accueil: 'maille-anime', 'fond-heros': undefined });
  assert.ok(violationsDures(doux as never, c).find((v) => v.code === 'fond-vide')!.corrections[0].valeur === 'illustration');
  assert.equal(reparerComposition(doux, c).sections.variantes['fond-heros'], 'illustration');
  assert.equal(fondHerosEffectif('maille-anime', undefined, { famille: 'doux-rond', style: 'pedagogique', illustration: true }), 'illustration');
  assert.equal(fondHerosEffectif('maille-anime', undefined, { famille: 'doux-rond', style: 'pedagogique', illustration: false }), 'formes');
  // Rendu : fente dans la zone visuelle (cadre de la composition), au-dessus des aplats, sans couche translucide sous le texte
  const h = htmlHeros(base({ variante: 'maille-anime', fond: 'illustration' }));
  assert.ok(h.fente && h.avant.includes('hp__fh-visuel') && !h.avant.includes('class="hp__fh '));
  assert.ok(h.apres.indexOf('<h1') > 0);
});
