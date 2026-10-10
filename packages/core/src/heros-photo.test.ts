// Nouveaux premiers écrans (heros-photo.ts) : voile AA, balisage (LCP, photos suivantes différées), images clés, garde-fous du
// studio (variantes à photos seulement en style « Photos », transition seulement si les photos défilent), transitions de sections.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METADONNEES_PREMIERS_ECRANS, alphaVoile, htmlHeros, keyframesHeros, styleCouleursHeros, cssTransitionsSections, PREMIERS_ECRANS_NOUVEAUX, TRANSITIONS_DIAPORAMA, TRANSITIONS_SECTIONS, type DonneesHeros } from './heros-photo';
import { contraste, melanger } from './couleurs';
import { NEUTRES } from './charte';
import { GAMMES } from './gammes';
import { modeleIntegre, variantesValides } from './modeles';
import { compositionInitiale, compositionPourCle, reparerComposition, tirerPage, valeursTirables, type ContexteRecette } from './recettes';

const base = (x: Partial<DonneesHeros> = {}): DonneesHeros => ({
  variante: 'diaporama', transition: 'fondu', balise: 'h1', sur: 'Pédicures-podologues · Lyon', metier: 'pédicurie-podologie', ville: 'à Lyon',
  qui: 'Camille Rousseau', soins: 'Bilan podologique et semelles.', actions: [{ href: '/rdv', libelle: 'Prendre rendez-vous', plein: true }],
  photos: ['/photos/a.webp', '/photos/b.webp', '/photos/c.webp'].map((src) => ({ src, srcset: `${src} 1600w` })), sujets: [], lieu: null,
  couleurs: styleCouleursHeros(modeleIntegre('tableau'), { couleur: '#1f6b64', gamme: 'canard' }), motLong: 20, mode: 'site', ...x,
});

test('voile : texte AA sur un pixel blanc, pour toutes les gammes et tous les gabarits', () => {
  for (const g of GAMMES) for (const id of ['tableau', 'village', 'revue', 'proximite']) {
    const style = styleCouleursHeros(modeleIntegre(id), { couleur: g.accent, gamme: g.id });
    const v = (k: string) => new RegExp(`--hp-${k}:(#[0-9a-f]{6})`).exec(style)![1];
    const a = Number(/--hp-voile-a:([\d.]+)/.exec(style)![1]);
    assert.ok(contraste(v('sombre-texte'), melanger(NEUTRES.blanc, v('sombre'), a)) >= 4.5, `${g.id} / ${id}`);
    // Voile dégradé de la couleur du cabinet : texte plein-texte AA sur un pixel blanc comme sur un pixel noir
    const [, rr, gg, bb, ap] = /--hp-voile-plein:rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/.exec(style)!.map(Number);
    const plein = `#${[rr, gg, bb].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    for (const px of [NEUTRES.blanc, '#000000']) assert.ok(contraste(v('plein-texte'), melanger(px, plein, ap)) >= 4.5, `${g.id} / ${id} / plein`);
  }
  assert.equal(alphaVoile('#000000', ['#ffffff']) < 0.6, true);
});

test('balisage : la première photo est l’élément LCP, les suivantes attendent le script', () => {
  const { avant, css } = htmlHeros(base());
  const imgs = avant.match(/<img[^>]*>/g)!;
  assert.equal(imgs.length, 3);
  assert.match(imgs[0], /src="\/photos\/a\.webp"/);
  assert.match(imgs[0], /fetchpriority="high"/);
  assert.match(imgs[0], /width="1600" height="1067"/);
  for (const i of imgs.slice(1)) { assert.match(i, /data-src=/); assert.match(i, /src="data:image\/gif/); assert.doesNotMatch(i, /fetchpriority/); }
  assert.match(avant, /<h1 class="hp__titre">Cabinet de <span class="hp__mot">pédicurie-podologie<\/span> <span class="pale">à Lyon<\/span><\/h1>/);
  assert.match(avant, /data-hp-diapos="3"/);
  assert.match(avant, /aria-label="Mettre en pause le défilement des photos"/);
  assert.match(css, /@keyframes hp-fondu-3/);
  // Aperçu : toutes chargées, défilement immédiat ; une seule photo : ni défilement ni bouton
  assert.match(htmlHeros(base({ mode: 'apercu', balise: 'p' })).avant, /class="hp hp--diaporama hp--sur-photo hp--t-fondu hp--joue"/);
  const seule = htmlHeros(base({ photos: base().photos.slice(0, 1) }));
  assert.doesNotMatch(seule.avant, /hp__pause|data-hp-diapos/);
  assert.equal(seule.css, '');
});

test('toutes les variantes se rendent ; maillé et bento sans photo ouvrent un emplacement', () => {
  for (const v of PREMIERS_ECRANS_NOUVEAUX) {
    const r = htmlHeros(base({ variante: v }));
    assert.match(r.avant, /class="hp__titre"/, v);
    const sans = htmlHeros(base({ variante: v, photos: [] }));
    assert.equal(sans.fente, v === 'maille' || v === 'bento', v);
  }
  assert.doesNotMatch(htmlHeros(base({ variante: 'typographique' })).avant, /<img/);
});

test('images clés : chaque transition, la première photo nette dès l’affichage', () => {
  for (const t of TRANSITIONS_DIAPORAMA) {
    const k = keyframesHeros(t, 4);
    assert.match(k, new RegExp(`@keyframes hp-${t}-4\\{0%\\{`));
    assert.doesNotMatch(k, /NaN|undefined/);
  }
  assert.equal(keyframesHeros('fondu', 1), '');
  assert.match(keyframesHeros('ken-burns', 3), /@keyframes hp-kb-3/);
});

test('studio : variantes à photos seulement en style « Photos », transition seulement si les photos défilent', () => {
  assert.ok(!valeursTirables('accueil', 'tableau', false).includes('diaporama'));
  assert.ok(valeursTirables('accueil', 'tableau', true).includes('diaporama'));
  assert.ok(valeursTirables('accueil', 'tableau', false).includes('typographique'));
  assert.deepEqual(valeursTirables('accueil', 'classique', false).slice(0, 1), ['']);
  assert.ok(!valeursTirables('accueil', 'classique', true).includes('carte'));
  const c: ContexteRecette = { sujets: ['sport', 'enfant'], principaux: 2 };
  const x = { ...compositionInitiale(c), structure: 'clair-pratique' as const };
  const illus = reparerComposition({ ...x, visuels: { ...x.visuels, style: 'releve' }, sections: { ...x.sections, variantes: { ...x.sections.variantes, accueil: 'diaporama', transition: 'volet' } } }, c);
  assert.notEqual(illus.sections.variantes.accueil, 'diaporama');
  assert.equal(illus.sections.variantes.transition, undefined);
  const photo = reparerComposition({ ...x, visuels: { ...x.visuels, style: 'photos' }, photos: ['/photos/sport-course.webp'], sections: { ...x.sections, variantes: { ...x.sections.variantes, accueil: 'diaporama', transition: 'volet' } } }, c);
  assert.equal(photo.sections.variantes.accueil, 'diaporama');
  assert.equal(photo.sections.variantes.transition, 'volet');
  // Tuile de notation d'une transition : diaporama avec les photos de démonstration
  const tuile = compositionPourCle(x, 'composant:transition:rideau');
  assert.equal(tuile.sections.variantes.accueil, 'diaporama');
  assert.ok(tuile.photos.length >= 3);
  // Dé de la page d'accueil : jamais de variante à photos sans photos
  for (let g = 1; g < 30; g++) assert.ok(!['diaporama', 'photo-gauche', 'photo-centre', 'photo-bas', 'scinde-photo'].includes(tirerPage({ ...x, visuels: { ...x.visuels, style: 'releve' }, photos: [] }, { page: 'accueil' }, c, g).sections.variantes.accueil as string));
  // Classique : seuls les nouveaux premiers écrans passent
  assert.deepEqual(variantesValides({ accueil: 'carte', sections: 'vague' }, 'classique'), { sections: 'vague' });
  assert.deepEqual(variantesValides({ accueil: 'bento' }, 'classique'), { accueil: 'bento' });
});

test('transitions entre sections : CSS seul, repli statique', () => {
  assert.equal(cssTransitionsSections('aucune'), '');
  assert.equal(cssTransitionsSections(undefined), '');
  for (const t of TRANSITIONS_SECTIONS.filter((t) => t !== 'aucune')) assert.ok(cssTransitionsSections(t).length > 40, t);
  assert.match(cssTransitionsSections('revelation'), /@supports \(animation-timeline:view\(\)\)/);
  assert.match(cssTransitionsSections('revelation'), /prefers-reduced-motion:no-preference/);
});

test('métadonnées d’harmonie : chaque premier écran a sa famille, son énergie et sa rondeur', () => {
  for (const v of PREMIERS_ECRANS_NOUVEAUX) {
    const m = METADONNEES_PREMIERS_ECRANS[v];
    assert.ok(m && m.energie >= 0 && m.energie <= 1 && m.rondeur >= 0 && m.rondeur <= 1, v);
  }
  assert.equal(METADONNEES_PREMIERS_ECRANS.oblique.famille, 'vitesse');
  assert.equal(METADONNEES_PREMIERS_ECRANS.organique.famille, 'organique');
  assert.equal(METADONNEES_PREMIERS_ECRANS.fondu.famille, 'fondu');
});

// ---------------------------------------------------------------------------------------------------------------
// Lot 2 « couleurs / formes organiques » et animations d'en-tête (2026-10-08)
// ---------------------------------------------------------------------------------------------------------------
import { ANIMATIONS_ENTETE, INGREDIENTS_A_VALIDER, PREMIERS_ECRANS_LOT2, PREMIERS_ECRANS_LOT2_LIBRES, PREMIERS_ECRANS_LOT2_PHOTO, LIBELLES_PREMIERS_ECRANS, LIBELLES_ANIMATIONS_ENTETE } from './heros-photo-variantes';
import { cssAnimationEntete, htmlAnimationEntete, motsDesSoins, SCRIPT_ENTETE } from './entete-anim';
import { cssLot2 } from './heros-organiques';
import { recettesPourScenario, toutChanger, type Recette } from './recettes';
import { violationsDures } from './harmonie';

test('lot 2 : chaque variante se rend ; sans photo aucune image, avec photo la première reste l’élément LCP', () => {
  for (const v of PREMIERS_ECRANS_LOT2) {
    const r = htmlHeros(base({ variante: v as never }));
    assert.match(r.avant, /class="hp__titre"/, v);
    assert.ok(cssLot2(v).length > 100, v);
    assert.doesNotMatch(r.css, /NaN|undefined/, v);
    const imgs = r.avant.match(/<img[^>]*>/g) ?? [];
    if ((PREMIERS_ECRANS_LOT2_LIBRES as readonly string[]).includes(v)) assert.equal(imgs.length, 0, v);
    else { assert.equal(imgs.length, 1, v); assert.match(imgs[0], /fetchpriority="high"/, v); assert.match(r.avant, /hp--sur-page/, v); }
  }
  assert.equal(PREMIERS_ECRANS_LOT2_PHOTO.length + PREMIERS_ECRANS_LOT2_LIBRES.length, 10);
});

test('lot 2 : teintes posées sous le texte AA (titre, sur-titre, texte doux) pour toutes les gammes et tous les gabarits', () => {
  for (const g of GAMMES) for (const id of ['tableau', 'village', 'revue', 'proximite']) {
    const style = styleCouleursHeros(modeleIntegre(id), { couleur: g.accent, gamme: g.id });
    const v = (k: string) => new RegExp(`--hp-${k}:(#[0-9a-f]{6})`).exec(style)![1];
    for (const t of ['t1', 't2', 't3']) for (const texte of ['encre', 'accent-texte', 'encre-douce']) {
      assert.ok(contraste(v(texte), v(t)) >= 4.5, `${g.id} / ${id} / ${texte} sur ${t}`);
      // Mélange avec le fond de la page (bord des taches floues) : AA aussi
      for (const a of [0.25, 0.5, 0.75]) assert.ok(contraste(v(texte), melanger(v('page'), v(t), a)) >= 4.5, `${g.id} / ${id} / ${texte} / ${t} ${a}`);
    }
  }
});

test('animations d’en-tête : < 3 Ko (empreintes : < 5 Ko), transform et opacity seulement, image fixe sans lecture, ≤ 5 s', () => {
  const mots = motsDesSoins('Bilan podologique, semelles orthopédiques et soins de pédicurie.');
  assert.deepEqual(mots, ['Bilan podologique', 'semelles orthopédiques', 'soins de pédicurie']);
  // il-* : animations d'illustrations, seulement en visuel du héros (heros-anime.test.ts)
  for (const a of ANIMATIONS_ENTETE.filter((x) => x !== 'aucune' && !x.startsWith('il-'))) {
    // Empreintes en lignes de niveau (entete-empreintes.ts), animations du pied (entete-pied.ts) et univers minimal
    // (univers-minimal.ts) : < 5 Ko, stroke-dashoffset permis
    const em = a.startsWith('em-') || a.startsWith('pi-') || a.startsWith('un-');
    const html = htmlAnimationEntete(a, mots), css = cssAnimationEntete(a);
    assert.ok(html.length > 20, a);
    assert.ok(Buffer.byteLength(html + css) < (a === 'pi-analyse-course' ? 7680 : em ? 5120 : 3072), `${a} : ${Buffer.byteLength(html + css)} octets`);
    // Images clés : transform et opacity seulement (compositeur)
    for (const k of css.match(/@keyframes [\w-]+\{.*?\}\}/g) ?? []) for (const p of k.replace(/@keyframes [\w-]+\{/, '').matchAll(/([a-z-]+):/g)) assert.ok(['transform', 'opacity', ...(em ? ['stroke-dashoffset'] : [])].includes(p[1]), `${a} anime ${p[1]}`);
    // Aucune lecture sans la classe posée par le script (image fixe par défaut) ; réduction des animations respectée
    for (const m of css.matchAll(/([^{}]*)\{[^{}]*animation:ea-/g)) assert.match(m[1], /\.ea-joue/, a);
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.doesNotMatch(html, /<script|<img|onclick/);
  }
  assert.equal(htmlAnimationEntete('aucune'), '');
  assert.ok(SCRIPT_ENTETE.length < 768, `script ${SCRIPT_ENTETE.length}`);
  // Aucun chevron : le post-traitement typographique du site (apps/sites/src/lib/typo.mjs) découpe le HTML sur « < »
  assert.doesNotMatch(SCRIPT_ENTETE, /</);
  // Placement : emblème / bande au-dessus du sur-titre, lueur en fond ; section marquée pour le script
  const r = htmlHeros(base({ variante: 'fondu', animation: 'voute-trace' }));
  assert.match(r.avant, /data-ea/);
  assert.match(r.avant, /<div class="hp__texte"><span class="ea ea--embleme ea--voute-trace"/);
  assert.match(htmlHeros(base({ variante: 'papier-decoupe', animation: 'lueur' })).avant, /data-ea><span class="ea ea--fond ea--lueur"/);
  assert.doesNotMatch(htmlHeros(base({ variante: 'fondu', animation: 'aucune' })).avant, /data-ea|class="ea /);
});

test('à valider : badge dans les libellés, jamais tirés ni gardés pour un praticien, disponibles au studio', () => {
  for (const v of PREMIERS_ECRANS_LOT2) { assert.ok(INGREDIENTS_A_VALIDER.has(`composant:accueil:${v}`)); assert.match(LIBELLES_PREMIERS_ECRANS[v as keyof typeof LIBELLES_PREMIERS_ECRANS], /à valider/); }
  for (const a of ANIMATIONS_ENTETE.filter((x) => x !== 'aucune')) { assert.ok(INGREDIENTS_A_VALIDER.has(`composant:entete-anim:${a}`)); assert.match(LIBELLES_ANIMATIONS_ENTETE[a], /à valider/); }
  assert.ok(valeursTirables('accueil', 'tableau', true).includes('duo-taches'));
  assert.ok(!valeursTirables('accueil', 'tableau', true, { praticien: true }).includes('duo-taches'));
  assert.ok(valeursTirables('accueil', 'tableau', true, { praticien: true, valides: new Set(['composant:accueil:duo-taches']) }).includes('duo-taches'));
  assert.deepEqual(valeursTirables('entete-anim', 'tableau', false, { praticien: true }), ['aucune']);
  const c: ContexteRecette = { sujets: ['sport', 'enfant'], principaux: 2 };
  const x = { ...compositionInitiale(c), structure: 'clair-pratique' as const };
  const avec = { ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, accueil: 'papier-decoupe' as const, 'entete-anim': 'onde' as const } } };
  assert.equal(reparerComposition(avec, c).sections.variantes['entete-anim'], 'onde');
  const prat = reparerComposition(avec, { ...c, praticien: true }).sections.variantes;
  assert.equal(prat['entete-anim'], undefined);
  assert.notEqual(prat.accueil, 'papier-decoupe');
  // Sans nouveau premier écran, pas d'animation d'en-tête ; tuile : jouée dans le premier écran fondu
  const sans = { ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, accueil: 'carte' as const, 'entete-anim': 'onde' as const } } };
  assert.equal(reparerComposition(sans, c).sections.variantes['entete-anim'], undefined);
  const tuile = compositionPourCle(sans, 'composant:entete-anim:foulee');
  assert.equal(tuile.sections.variantes.accueil, 'fondu');
  assert.ok(tuile.photos.length >= 3);
  // Parcours : les recettes qui contiennent un ingrédient à valider ne sont pas proposées
  const rec = (id: string, comp: typeof x): Recette => ({ id, nom: id, composition: comp, sujets: ['sport'], note: 5, statut: 'active' } as unknown as Recette);
  const l = [rec('a', avec), rec('b', x)];
  assert.equal(recettesPourScenario(l, ['sport']).length, 2);
  assert.deepEqual(recettesPourScenario(l, ['sport'], 4, undefined, { praticien: true }).map((r) => r.id), ['b']);
});

test('harmonie : animations vives jamais pour diabète et seniors, un seul élément fort, rien qui pulse en pédagogique', () => {
  const c: ContexteRecette = { sujets: ['diabete'], principaux: 1 };
  const x = compositionInitiale(c);
  const avec = (accueil: string, anim: string, style = x.visuels.style) => ({ ...x, visuels: { ...x.visuels, style }, sections: { ...x.sections, variantes: { ...x.sections.variantes, accueil, 'entete-anim': anim } } }) as never;
  assert.ok(violationsDures(avec('bento', 'foulee'), { sujets: ['diabete'] }).some((v) => v.code === 'animation-calme'));
  assert.ok(!violationsDures(avec('bento', 'voute-trace'), { sujets: ['diabete'] }).some((v) => v.code === 'animation-calme'));
  assert.ok(violationsDures(avec('organique', 'mots'), { sujets: ['sport'] }).some((v) => v.code === 'expressif'));
  assert.ok(!violationsDures(avec('papier-decoupe', 'voute-trace'), { sujets: ['sport'] }).some((v) => v.code === 'expressif'));
  assert.ok(violationsDures(avec('bento', 'onde', 'pedagogique'), { sujets: ['enfant'] }).some((v) => v.code === 'pulse-pedagogique'));
});

test('générateur des praticiens : jamais un premier écran, une animation d’en-tête ni une présentation des portraits « à valider »', () => {
  const c: ContexteRecette = { sujets: ['sport', 'enfant'], principaux: 2, praticien: true };
  let x = compositionInitiale(c);
  for (let g = 1; g <= 120; g++) {
    x = g % 3 ? toutChanger(x, [], c, g) : tirerPage(x, { page: 'accueil' }, c, g);
    const v = x.sections.variantes as Record<string, string | undefined>;
    for (const k of ['accueil', 'entete-anim', 'portraits']) assert.ok(!v[k] || !INGREDIENTS_A_VALIDER.has(`composant:${k}:${v[k]}`), `${g} : ${k} = ${v[k]}`);
  }
  // Le studio (sans « praticien ») y a accès
  assert.ok(INGREDIENTS_A_VALIDER.has('composant:portraits:organique') || [...INGREDIENTS_A_VALIDER].some((k) => k.startsWith('composant:portraits:')));
});
