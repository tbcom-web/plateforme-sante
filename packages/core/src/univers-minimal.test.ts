// Univers minimal (univers-minimal.ts, demande de Paul du 2026-10-10) : basket, tennis, golf, cyclisme, diabète.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UNIVERS_MINIMAUX, FICHES_UNIVERS_MINIMAUX, UNIVERS_MINIMAUX_VIFS, CLES_UNIVERS_MINIMAUX, HASHTAGS_UNIVERS_MINIMAUX,
  htmlUniversMinimal, cssUniversMinimal, svgUniversMinimal, corpsUniversMinimal,
} from './univers-minimal';
import { GAMMES } from './gammes';
import { couleursGabarit } from './gabarits';
import { modeleIntegre } from './modeles';
import { contraste, rvb, hex } from './couleurs';
import { PRESSION } from './univers';
import { inventaireIllustrations } from './illustrations';
import { HASHTAGS_PAR_DEFAUT } from './kits';
import { estHashtag } from './hashtags';
import { PRATIQUE_PODOLOGUE } from './pratiques';
import { activitesReconnues, profilParId } from './profils';
import { animationsHerosDuSujet, htmlVisuelAnime, cssVisuelAnime } from './heros-anime';
import { familleNouveaute } from './nouveautes';
import { ANIMATIONS_HEROS, INGREDIENTS_A_VALIDER, LIBELLES_ANIMATIONS_ENTETE } from './heros-photo-variantes';
import { ETIQUETTES_HARMONIE } from './harmonie';
import { htmlAnimationEntete, cssAnimationEntete } from './entete-anim';

/** color-mix(in oklab, a p, b) (même calcul que les navigateurs) */
function mixOklab(a: string, b: string, p: number): string {
  const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const vers = (h: string) => {
    const [r, g, bb] = rvb(h).map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bb), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bb), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bb);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const A = vers(a), B = vers(b), [L, x, y] = A.map((v, i) => v * p + B[i] * (1 - p));
  const l = (L + 0.3963377774 * x + 0.2158037573 * y) ** 3, m = (L - 0.1055613458 * x - 0.0638541728 * y) ** 3, s = (L - 0.0894841775 * x - 1.291485548 * y) ** 3;
  const g = (v: number) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)));
  return hex([g(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), g(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), g(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)]);
}

test('dix visuels, deux par univers ; fiches, sujets, vifs jamais pour le diabète ni les seniors', () => {
  assert.equal(UNIVERS_MINIMAUX.length, 10);
  for (const u of ['basket', 'tennis', 'golf', 'cyclisme', 'diabete']) assert.equal(UNIVERS_MINIMAUX.filter((a) => FICHES_UNIVERS_MINIMAUX[a].univers === u).length, 2, u);
  assert.deepEqual([...UNIVERS_MINIMAUX_VIFS].sort(), ['un-basket-arc', 'un-tennis-rebond']);
  for (const a of UNIVERS_MINIMAUX) {
    const f = FICHES_UNIVERS_MINIMAUX[a];
    if (f.univers === 'basket' || f.univers === 'tennis') assert.ok(!f.sujets.includes('diabete') && !f.sujets.includes('senior'), a);
    if (f.univers === 'diabete') assert.deepEqual([...f.sujets], ['diabete'], a);
  }
  for (const s of ['diabete', 'senior']) for (const x of animationsHerosDuSujet(s)) assert.ok(!/un-(basket|tennis)/.test(x.animation), `${s} : ${x.animation}`);
  assert.ok(animationsHerosDuSujet('sport').some((x) => x.animation === 'un-basket-arc'));
  assert.ok(animationsHerosDuSujet('diabete').some((x) => x.animation === 'un-diabete-miroir'));
  assert.ok(!animationsHerosDuSujet('diabete').some((x) => x.animation === 'un-golf-green'));
});

test('visuel animé : < 5 Ko, transform / opacity / stroke-dashoffset seulement, une lecture sous .ea-joue, réduction des animations, aucun texte', () => {
  for (const a of UNIVERS_MINIMAUX) {
    const html = htmlUniversMinimal(a), css = cssUniversMinimal(a);
    assert.ok(Buffer.byteLength(html + css) < 5120, `${a} : ${Buffer.byteLength(html + css)} octets`);
    assert.ok(Buffer.byteLength(htmlVisuelAnime(a) + cssVisuelAnime(a)) < 5200, a);
    assert.doesNotMatch(html, /<text|<img|<script|<image|<foreignObject/, a);
    assert.doesNotMatch(css, /infinite/, a);
    assert.match(css, /prefers-reduced-motion:reduce/, a);
    for (const m of css.matchAll(/@keyframes [\w-]+\{((?:[^{}]*\{[^{}]*\})*)\}/g)) for (const p of m[1].matchAll(/([a-z-]+):/g)) assert.ok(['transform', 'opacity', 'stroke-dashoffset'].includes(p[1]), `${a} : ${p[1]}`);
    for (const m of css.matchAll(/([^{}]*)\{[^{}]*animation:ea-/g)) assert.match(m[1], /\.ea-joue/, a);
    // Mêmes balisages que l'entrée de l'en-tête (scène, emblème)
    assert.equal(htmlAnimationEntete(a, [], { scene: true }), htmlUniversMinimal(a));
    assert.equal(cssAnimationEntete(a), css);
    // Couleurs : variables seulement (aucune couleur littérale hors des bleus de la charte du diabète)
    const lit = [...css.matchAll(/#[0-9a-f]{6}/gi)].map((x) => x[0].toLowerCase());
    assert.ok(lit.every((c) => [PRESSION[0], PRESSION[1]].includes(c as never)), `${a} : ${lit}`);
  }
});

test('diabète : jamais la couleur vive de la gamme ni le rouge, lecture lente sans rebond', () => {
  for (const a of UNIVERS_MINIMAUX.filter((x) => FICHES_UNIVERS_MINIMAUX[x].univers === 'diabete')) {
    const propre = cssUniversMinimal(a).split(`.ea--${a}{`)[1];
    for (const v of ['--u-a', '--u-p', '--u-q']) assert.match(propre, new RegExp(`${v}:color-mix\\(in oklab,#(3e7bfa|22c3a6)`), `${a} ${v}`);
    assert.doesNotMatch(cssUniversMinimal(a), /f0352f|ff7a2f/i, a);
    assert.doesNotMatch(htmlUniversMinimal(a), /u-s|u-y/, `${a} : aucun rebond`);
    assert.match(svgUniversMinimal(a), /--dessin-accent:var\(--pression-1\)/, a);
  }
});

test('contraste ≥ 3:1 des traits significatifs sur les 17 gammes (panneau sombre, clair, et sans fond sur la page claire)', () => {
  assert.equal(GAMMES.length, 17);
  for (const g of GAMMES) {
    const c = couleursGabarit(modeleIntegre('tableau'), { couleur: g.accent, gamme: g.id }) as unknown as Record<string, string>;
    const surfaces: [string, string][] = [[c.sombre, c['sombre-texte']], [c.doux, c.encre], [c.page, c.encre]];
    for (const [f, t] of surfaces) {
      assert.ok(contraste(t, f) >= 4.5, `${g.id} trait ${t} / ${f}`);
      const accent = mixOklab(c.vif, t, 0.56);
      assert.ok(contraste(accent, f) >= 3, `${g.id} accent ${accent} / ${f} : ${contraste(accent, f).toFixed(2)}`);
      const froid = mixOklab(PRESSION[0], t, 0.62);
      assert.ok(contraste(froid, f) >= 3, `${g.id} bleu froid ${froid} / ${f} : ${contraste(froid, f).toFixed(2)}`);
    }
  }
});

test('inventaire : animation et illustration fixe « à valider », hashtags (#sport #basket…, #diabete), kits des profils, nouveautés', () => {
  assert.equal(CLES_UNIVERS_MINIMAUX.length, 20);
  const inv = new Map(inventaireIllustrations().map((i) => [i.cle, i]));
  for (const a of UNIVERS_MINIMAUX) {
    const k = `composant:entete-anim:${a}`, d = `dessin:${a}:pedagogique`;
    assert.ok(ANIMATIONS_HEROS.includes(a), a);
    assert.ok(INGREDIENTS_A_VALIDER.has(k), k);
    assert.match(LIBELLES_ANIMATIONS_ENTETE[a], /à valider/);
    assert.ok(ETIQUETTES_HARMONIE[`v.entete-anim:${a}`], a);
    const i = inv.get(d);
    assert.ok(i && i.statutParDefaut === 'a_revoir', d);
    const svg = i!.svg();
    assert.doesNotMatch(svg, /<style|<text|class="u-|pathLength|--i:/, d);
    assert.ok(!/id="(?!rv-)/.test(svg), `${d} : identifiant non préfixé`);
    assert.ok(Buffer.byteLength(svg) < 5120, `${d} : ${Buffer.byteLength(svg)} octets`);
    for (const cle of [k, d]) {
      assert.deepEqual(HASHTAGS_PAR_DEFAUT[cle], HASHTAGS_UNIVERS_MINIMAUX[cle]);
      assert.ok(HASHTAGS_UNIVERS_MINIMAUX[cle].every(estHashtag), cle);
      assert.equal(familleNouveaute(cle).id, 'univers-minimal', cle);
    }
    const f = FICHES_UNIVERS_MINIMAUX[a];
    const attendu = f.univers === 'diabete' ? [] : [f.univers];
    assert.deepEqual(activitesReconnues({ cle: k, tags: [...HASHTAGS_UNIVERS_MINIMAUX[k]] }, PRATIQUE_PODOLOGUE), attendu, a);
    assert.ok(HASHTAGS_UNIVERS_MINIMAUX[k].includes(f.univers === 'diabete' ? 'diabete' : 'sport'), a);
  }
  // Profils de référence : golf et cyclisme ajoutés
  for (const id of ['sport-basket', 'sport-tennis', 'sport-golf', 'sport-cyclisme', 'diabete']) assert.ok(profilParId(id), id);
});

test('identifiants préfixés (deux visuels sur une page : aucun conflit)', () => {
  for (const a of UNIVERS_MINIMAUX) assert.ok(!/id="(?!x-)/.test(corpsUniversMinimal(a, 'x')), a);
});
