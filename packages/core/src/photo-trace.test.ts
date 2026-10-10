// Photo + tracé (photo-trace.ts, idée de Paul du 2026-10-10 : « superposer des images "sport" trail etc avec des illustrations
// minimalistes ») : poids < 4 Ko, géométries validées seulement, jamais d'image (la photo reste l'élément LCP), animations
// limitées à opacity / stroke-dashoffset avec réduction des animations, activité de la photo respectée, hôtes seulement, règles
// d'harmonie (vif ↛ diabète / seniors, jamais deux tracés, pas sur une photo déjà chargée), « à valider » et intégration Studio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOTES_TRACE_PHOTO, INGREDIENTS_A_VALIDER, PHOTOS_DEMO_TRACES, TRACES_PHOTO, type TracePhoto } from './heros-photo-variantes';
import { ACTIVITES_TRACES, activitesDeLaPhoto, cssTracePhoto, htmlTracePhoto, poidsTracePhoto, TRACES_ANIMES, TRACES_VIFS, tracePhotoEffectif, tracePhotoPermis, traitBlanc } from './photo-trace';
import { htmlHeros, styleCouleursHeros, type DonneesHeros } from './heros-photo';
import { modeleIntegre, VARIANTES_SECTIONS } from './modeles';
import { GEO_PIED } from './entete-pied-geo';
import { GEO_EMPREINTES } from './entete-empreintes-geo';
import { compositionInitiale, compositionPourCle, FAMILLES_COMPOSANTS, reparerComposition, valeursTirables, type CompositionRecette, type ContexteRecette } from './recettes';
import { ETIQUETTES_HARMONIE, violationsDures } from './harmonie';
import { inventaireStudio } from './assets';

const TRACES = TRACES_PHOTO.filter((t): t is Exclude<TracePhoto, 'aucun'> => t !== 'aucun');
const style = (gamme: string, couleur: string) => styleCouleursHeros(modeleIntegre('tableau'), { couleur, gamme });
const base = (x: Partial<DonneesHeros> = {}): DonneesHeros => ({
  variante: 'scinde-photo', transition: 'fondu', balise: 'h1', sur: 'Pédicure-podologue · Annecy', metier: 'pédicurie-podologie', ville: 'à Annecy',
  qui: 'Camille Rousseau', soins: 'Podologie du sport.', actions: [{ href: '/rdv', libelle: 'Prendre rendez-vous', plein: true }],
  photos: [{ src: '/photos/sport-trail.webp' }], sujets: [], lieu: null, couleurs: style('canard', '#1f6b64'), motLong: 20, mode: 'site', ...x,
});

test('chaque tracé : < 4 Ko (balisage + feuille), décoratif, aucune image, géométries validées', () => {
  for (const t of TRACES) {
    assert.ok(poidsTracePhoto(t) < 4096, `${t} : ${poidsTracePhoto(t)} o`);
    const h = htmlTracePhoto(t) + cssTracePhoto(t);
    assert.ok(!/url\((?!#)/.test(h) && !/<img|<image/.test(h), `${t} : image`);
    assert.ok(htmlTracePhoto(t).includes('aria-hidden="true"'), t);
    // Animés : seulement opacity et stroke-dashoffset, sous prefers-reduced-motion: no-preference ; les autres sont statiques
    if (TRACES_ANIMES.includes(t)) {
      assert.ok(/@media \(prefers-reduced-motion:no-preference\)/.test(h), `${t} : réduction des animations`);
      for (const k of h.match(/@keyframes [^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g) ?? []) assert.ok(!/transform|width|height|top|left/.test(k.replace(/@keyframes [^{]+/, '')), `${t} : ${k}`);
    } else assert.ok(!/@keyframes|animation:/.test(h), `${t} : animé`);
  }
  // Rien de redessiné : les tracés reprennent les géométries des animations et fonds validés
  assert.ok(htmlTracePhoto('topographie').includes(GEO_PIED.montagne.niveaux[0].d) && htmlTracePhoto('topographie').includes(GEO_PIED.montagne.crete));
  assert.ok(htmlTracePhoto('lacets').includes(GEO_PIED.montagne.sentier));
  assert.ok(htmlTracePhoto('empreintes').includes(GEO_EMPREINTES.contour));
});

test('couleur du trait : vive (gammes lumineuses), sinon blanche (accent sombre des gammes classiques)', () => {
  assert.equal(traitBlanc(style('canard', '#1f6b64')), true);
  assert.equal(traitBlanc(style('encre', '#0b1c24')), true);
  assert.equal(traitBlanc(style('mangue', '#ffb547')), false);
});

test('activité : le tracé dit la même chose que la photo (jamais une montagne sur une route)', () => {
  assert.deepEqual(activitesDeLaPhoto('/photos/sport-trail.webp'), ['trail']);
  assert.deepEqual(activitesDeLaPhoto('/photos/sport-course.webp'), ['course']);
  assert.deepEqual(activitesDeLaPhoto('/photos/sport-chaussure.webp'), []);
  assert.ok(tracePhotoPermis('topographie', { photo: '/photos/sport-trail.webp' }));
  assert.ok(!tracePhotoPermis('topographie', { photo: '/photos/sport-course.webp' }));
  assert.ok(!tracePhotoPermis('lacets', { photo: '/photos/sport-trail.webp', activites: ['basket'] }), 'profil basket : pas de sentier');
  assert.ok(tracePhotoPermis('chevrons', { photo: '/photos/sport-course.webp' }));
  assert.ok(!tracePhotoPermis('chevrons', { photo: '/photos/sport-chaussure.webp' }), 'activité inconnue : pas de tracé d’activité');
  assert.ok(tracePhotoPermis('empreintes', { photo: '/photos/sport-chaussure.webp' }), 'empreintes : universel');
  for (const t of TRACES) {
    const p = PHOTOS_DEMO_TRACES[t];
    assert.ok(tracePhotoPermis(t, { photo: p }), `${t} : sa photo de démonstration ${p}`);
    assert.ok(ACTIVITES_TRACES[t] === null || ACTIVITES_TRACES[t]!.length > 0, t);
  }
});

test('rendu : hôtes seulement, dans le cadre de la photo, jamais avec une animation ; photo = LCP inchangée', () => {
  const avec = htmlHeros(base({ trace: 'topographie' }));
  assert.ok(avec.avant.includes('hp__tp--topographie') && avec.css.includes('.hp__tp'));
  // La couche est DANS le cadre de la photo (.hp__media), après la photo, avant le texte
  const i = avec.avant.indexOf('class="hp__media"'), j = avec.avant.indexOf('hp__tp'), k = avec.avant.indexOf('hp__texte');
  assert.ok(i >= 0 && i < j && j < k);
  assert.ok(avec.avant.includes('fetchpriority="high"'), 'la photo reste prioritaire');
  assert.ok(avec.avant.includes('hp__tp--blanc'), 'Canard : trait blanc');
  assert.ok(!htmlHeros(base({ trace: 'topographie', variante: 'oblique' })).avant.includes('hp__tp'), 'photo déjà chargée');
  assert.ok(!htmlHeros(base({ trace: 'topographie', variante: 'photo-gauche' })).avant.includes('hp__tp'), 'texte sur la photo');
  assert.ok(!htmlHeros(base({ trace: 'topographie', animation: 'pi-chrono' })).avant.includes('hp__tp'), 'jamais deux tracés');
  assert.ok(!htmlHeros(base({ trace: 'topographie', photos: [{ src: '/photos/sport-course.webp' }] })).avant.includes('hp__tp'), 'route : pas de montagne');
  for (const h of HOTES_TRACE_PHOTO) assert.ok(htmlHeros(base({ trace: 'lacets', variante: h as never })).avant.includes('hp__tp--lacets'), h);
  // Effectif : diabète et seniors, jamais un tracé vif
  for (const t of TRACES_VIFS) assert.equal(tracePhotoEffectif(t, { accueil: 'fondu', photo: PHOTOS_DEMO_TRACES[t], sujets: ['sport', 'diabete'] }), null, t);
  assert.equal(tracePhotoEffectif('empreintes', { accueil: 'fondu', photo: '/photos/sport-course.webp', sujets: ['senior'] }), 'empreintes');
});

test('ingrédient : notable, « à valider », étiqueté, jamais tiré pour un praticien, tuile sur un hôte avec la photo de l’activité', () => {
  assert.deepEqual([...VARIANTES_SECTIONS['trace-photo']], [...TRACES_PHOTO]);
  assert.ok(FAMILLES_COMPOSANTS.includes('trace-photo'));
  for (const t of TRACES_PHOTO) assert.ok(ETIQUETTES_HARMONIE[`v.trace-photo:${t}`], t);
  for (const t of TRACES) assert.ok(INGREDIENTS_A_VALIDER.has(`composant:trace-photo:${t}`), t);
  const studio = new Set(inventaireStudio().map((a) => a.cle));
  for (const t of TRACES) assert.ok(studio.has(`composant:trace-photo:${t}`), t);
  assert.ok(!studio.has('composant:trace-photo:aucun'));
  assert.deepEqual(valeursTirables('trace-photo', 'tableau', true, { praticien: true }), ['aucun']);
  const c: ContexteRecette = { sujets: ['sport'], principaux: 1 };
  const x0 = compositionInitiale(c);
  for (const t of TRACES) {
    const y = compositionPourCle(x0, `composant:trace-photo:${t}`);
    assert.ok(HOTES_TRACE_PHOTO.includes(y.sections.variantes.accueil as string), t);
    assert.deepEqual(y.photos, [PHOTOS_DEMO_TRACES[t]], t);
    assert.equal(y.sections.variantes['entete-anim'], 'aucune');
  }
});

test('harmonie et réparation : vif ↛ diabète / seniors, jamais deux tracés, jamais sur une photo déjà chargée', () => {
  const c: ContexteRecette = { sujets: ['sport', 'diabete'], principaux: 2 };
  const x0 = compositionInitiale(c);
  const avec = (v: Record<string, string>): CompositionRecette => ({ ...x0, visuels: { ...x0.visuels, style: 'photos' as never }, photos: ['/photos/sport-course.webp'], sections: { ...x0.sections, variantes: { ...x0.sections.variantes, ...v } as never } });
  const codes = (x: CompositionRecette) => violationsDures(x as never, c).map((v) => v.code);
  assert.ok(codes(avec({ accueil: 'fondu', 'trace-photo': 'chevrons', 'entete-anim': 'aucune' })).includes('trace-calme'));
  assert.ok(codes(avec({ accueil: 'fondu', 'trace-photo': 'empreintes', 'entete-anim': 'pi-pression' })).includes('trace-double'));
  assert.ok(codes(avec({ accueil: 'oblique', 'trace-photo': 'empreintes', 'entete-anim': 'aucune' })).includes('trace-hote'));
  assert.ok(!codes(avec({ accueil: 'fondu', 'trace-photo': 'empreintes', 'entete-anim': 'aucune' })).some((k) => k.startsWith('trace-')));
  // Réparation : un tracé vif pour le diabète, ou sur un premier écran non hôte, est retiré
  assert.equal(reparerComposition(avec({ accueil: 'fondu', 'trace-photo': 'chevrons' }), c).sections.variantes['trace-photo'], 'aucun');
  assert.equal(reparerComposition(avec({ accueil: 'oblique', 'trace-photo': 'empreintes' }), c).sections.variantes['trace-photo'], undefined);
  assert.equal(reparerComposition(avec({ accueil: 'fondu', 'trace-photo': 'empreintes', 'entete-anim': 'aucune' }), c).sections.variantes['trace-photo'], 'empreintes');
  // Praticien : jamais (tout est à valider)
  assert.equal(reparerComposition(avec({ accueil: 'fondu', 'trace-photo': 'empreintes', 'entete-anim': 'aucune' }), { ...c, praticien: true }).sections.variantes['trace-photo'] ?? 'aucun', 'aucun');
});
