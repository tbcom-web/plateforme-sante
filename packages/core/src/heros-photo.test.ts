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
