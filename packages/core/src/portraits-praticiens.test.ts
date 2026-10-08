import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CSS_PORTRAITS, htmlPortraits, insecablesPortraits, LIBELLES_PRESENTATIONS_PORTRAITS, METADONNEES_PORTRAITS, nombrePortraits, PORTRAITS_A_VALIDER, PORTRAITS_DEMO,
  praticiensDemo, PRESENTATIONS_PORTRAITS, styleCouleursPortraits, taillesPortrait,
} from './portraits-praticiens';
import { ETIQUETTES_HARMONIE, violationsDures } from './harmonie';
import { blocsPourCle, clesStructure, compositionInitiale, compositionPourCle, FAMILLES_COMPOSANTS, LIBELLES_VARIANTES, NOMS_SECTIONS_VARIABLES, reparerComposition, sectionsVariables, valeursTirables } from './recettes';
import { modeleIntegre, VARIANTES_SECTIONS } from './modeles';
import { modeleDuSite } from './catalogue-univers';
import { GAMMES } from './gammes';
import { contraste, melanger } from './couleurs';
import { NEUTRES } from './charte';

const couleurs = styleCouleursPortraits(modeleIntegre('tableau'), { couleur: '#2d5bff', gamme: 'ardoise' });

test('portraits : chaque présentation × 1, 2, 3, 5 praticiens × avec / sans photo se rend sans trou', () => {
  for (const variante of PRESENTATIONS_PORTRAITS) {
    for (const n of [1, 2, 3, 5]) {
      for (const photos of ['avec', 'sans', 'mixte'] as const) {
        const praticiens = praticiensDemo(n, photos);
        const h = htmlPortraits({ variante, praticiens, couleurs });
        const cas = `${variante} × ${n} × ${photos}`;
        assert.match(h, new RegExp(`^<div class="pp pp--${variante}" data-n="${nombrePortraits(n)}"`), cas);
        assert.equal((h.match(/<h3 class="pp__nom">/g) ?? []).length, n, `${cas} : un H3 par praticien`);
        assert.equal((h.match(/<li class="pp__fiche"/g) ?? []).length, n, cas);
        const avec = praticiens.filter((p) => p.photo).length;
        assert.equal((h.match(/<img /g) ?? []).length, avec, `${cas} : photos`);
        assert.equal((h.match(/class="pp__mono"/g) ?? []).length, n - avec, `${cas} : monogrammes`);
        // Images : dimensions fixées, chargement différé, texte alternatif
        for (const img of h.match(/<img [^>]*>/g) ?? []) {
          assert.match(img, /width="\d+" height="\d+"/, cas);
          assert.match(img, /loading="lazy"/, cas);
          assert.match(img, /alt="Portrait de [^"]+, pédicure-podologue"/, cas);
        }
        assert.doesNotMatch(h, /undefined|null|NaN|\[object/, cas);
        // Aucun intertitre H1 / H2 ajouté (SEO identique)
        assert.doesNotMatch(h, /<h[12][ >]/, cas);
        // Bandeau défilant : région atteignable au clavier
        if (variante === 'defilement') assert.match(h, /<ul class="pp__liste" role="list" tabindex="0" aria-label="Praticiens">/, cas);
      }
    }
  }
  assert.equal(htmlPortraits({ variante: 'voile', praticiens: [], couleurs }), '');
});

test('portraits : srcset → sizes propre à la présentation ; mots composés insécables', () => {
  const [p] = praticiensDemo(1);
  const h = htmlPortraits({ variante: 'anneau', couleurs, praticiens: [{ ...p, photo: { src: '/a-400.webp', srcset: '/a-400.webp 400w, /a-640.webp 640w', largeur: 640, hauteur: 800 } }] });
  assert.match(h, /srcset="\/a-400\.webp 400w, \/a-640\.webp 640w" sizes="\(min-width: 760px\) 200px, 168px" width="640" height="800"/);
  for (const v of PRESENTATIONS_PORTRAITS) for (const n of [1, 2, 3, 5]) assert.ok(taillesPortrait(v, n).length > 3, `${v} ${n}`);
  assert.equal(insecablesPortraits('Pédicure-podologue à Saint-Rémy-de-Provence'), '<span class="pp-lie">Pédicure-podologue</span> à <span class="pp-lie">Saint-Rémy-de-Provence</span>');
  assert.match(h, /<p class="pp__titre"><span class="pp-lie">Pédicure-podologue<\/span> à Lyon<\/p>/);
});

test('portraits : feuille sans couleur littérale, voile AA calculé pour chaque gamme', () => {
  assert.doesNotMatch(CSS_PORTRAITS, /#[0-9a-f]{3,8}\b|rgba?\(\s*\d/i);
  for (const g of GAMMES) {
    const s = styleCouleursPortraits(modeleIntegre('tableau'), { couleur: g.accent, gamme: g.id });
    const v = (k: string) => s.match(new RegExp(`--pp-${k}:([^;]+)`))![1];
    const [, a] = s.match(/--pp-voile:rgb\([^/]+\/ ([\d.]+)\)/)!;
    // Pire pixel sous le voile : blanc ; texte du nom et du titre : sombre-texte
    assert.ok(contraste(v('sombre-texte'), melanger(NEUTRES.blanc, v('sombre'), Number(a))) >= 4.5, g.id);
  }
});

test('portraits : démonstrations dessinées (aucune photo de personne), cinq silhouettes', () => {
  assert.equal(PORTRAITS_DEMO.length, 5);
  for (const s of PORTRAITS_DEMO) assert.match(s, /^data:image\/svg\+xml,/);
});

test('portraits : ingrédient étiqueté, libellé, « à valider », tirable et notable', () => {
  assert.deepEqual([...VARIANTES_SECTIONS.portraits], [...PRESENTATIONS_PORTRAITS]);
  for (const v of PRESENTATIONS_PORTRAITS) {
    assert.ok(ETIQUETTES_HARMONIE[`v.portraits:${v}`], `étiquette ${v}`);
    assert.ok(METADONNEES_PORTRAITS[v], `métadonnées ${v}`);
    assert.equal(LIBELLES_VARIANTES.portraits[v], LIBELLES_PRESENTATIONS_PORTRAITS[v]);
    if (v !== 'sobre') { assert.ok(PORTRAITS_A_VALIDER.includes(`composant:portraits:${v}`)); assert.match(LIBELLES_PRESENTATIONS_PORTRAITS[v], /\(à valider\)$/); }
  }
  assert.equal(NOMS_SECTIONS_VARIABLES.portraits, 'Présentation des praticiens');
  assert.ok(FAMILLES_COMPOSANTS.includes('portraits'));
  for (const g of ['classique', 'tableau', 'village', 'revue'] as const) assert.ok(sectionsVariables(g).includes('portraits'), g);
  assert.deepEqual(valeursTirables('portraits', 'tableau', false), [...PRESENTATIONS_PORTRAITS]);
  assert.deepEqual(blocsPourCle('composant:portraits:voile'), ['praticiens']);
  // Classique : la variante passe dans le modèle du site
  assert.equal(modeleDuSite(modeleIntegre('technique'), { variantes: { portraits: 'editorial' } }).variantes?.portraits, 'editorial');
  // Tuile : la clé pose la présentation, la recette la garde et la note
  const x = compositionInitiale({ sujets: ['sport'], principaux: 1 });
  const y = compositionPourCle(x, 'composant:portraits:voile');
  assert.equal(y.sections.variantes.portraits, 'voile');
  assert.equal(reparerComposition(y, { sujets: ['sport'], principaux: 1 }).sections.variantes.portraits, 'voile');
  assert.ok(clesStructure(y).includes('composant:portraits:voile'));
});

test('portraits : forme organique jamais avec la structure Technique (règle dure, corrigée vers « sobre »)', () => {
  const x = compositionInitiale({ sujets: ['sport'], principaux: 1 });
  const t = { ...x, structure: 'technique-precis' as const, sections: { ...x.sections, variantes: { ...x.sections.variantes, portraits: 'organique' as const } } };
  const v = violationsDures(t).find((w) => w.dims.includes('v.portraits'));
  assert.ok(v, 'violation attendue');
  assert.deepEqual(v!.corrections[0], { dim: 'v.portraits', valeur: 'sobre' });
  assert.ok(!violationsDures({ ...t, sections: { ...t.sections, variantes: { ...t.sections.variantes, portraits: 'anneau' as const } } }).some((w) => w.dims.includes('v.portraits')));
});
