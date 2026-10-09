// Tests de l'univers diabète (univers-diabete.ts) — lancer : node packages/core/scripts/tests.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLES_UNIVERS_DIABETE, DESSINS_DIABETE, HEROS_DIABETE, FICHES_UNIVERS_DIABETE, HASHTAGS_UNIVERS_DIABETE, COULEURS_DIABETE,
  svgDessinDiabete, svgDessinHerosDiabete, herosDiabete, lireCleHerosDiabete,
} from './univers-diabete';
import { inventaireIllustrations } from './illustrations';
import { baseDeCle } from './bases-illustrations';
import { HASHTAGS_PAR_DEFAUT } from './kits';
import { estHashtag } from './hashtags';
import { sujetsParDefaut } from './sujets-visuels';
import { familleNouveaute } from './nouveautes';
import { REGLES_THEMES } from './propositions';
import { gamme } from './gammes';
import { DESSINS_PODOLOGIE } from './univers';
import { THEMES_ILLUSTRES } from './heros-themes';

const COULEUR_LITTERALE = /(?<![\w-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])|\b(?:rgba?|hsla?)\(\s*[\d.]/i;
/** Rouge (diabète) : variables chaudes de la palette ou teinte littérale rouge */
const ROUGE = /--d-haut|--d-chaud|--pression-4|--pression-5|\bred\b|crimson/i;

const rendus = () => [
  ...DESSINS_DIABETE.flatMap((d) => (['releve', 'pedagogique'] as const).map((r) => ({ cle: `dessin:${d}:${r}`, svg: svgDessinDiabete(d, { registre: r, id: 'x' }) }))),
  ...HEROS_DIABETE.flatMap((h) => (['releve', 'pedagogique'] as const).flatMap((r) => [
    { cle: `heros:${h}:${r}`, svg: svgDessinHerosDiabete(h, { registre: r, id: 'x' }) },
    { cle: `heros:${h}:${r}:paysage`, svg: herosDiabete(h, { registre: r, format: 'paysage', id: 'x' }) },
    { cle: `heros:${h}:${r}:portrait`, svg: herosDiabete(h, { registre: r, format: 'portrait', id: 'x' }) },
  ])),
];

test('univers diabète : rendus sans texte, sans couleur littérale, sans rouge, identifiants préfixés', () => {
  for (const { cle, svg } of rendus()) {
    assert.match(svg, /^<svg/, cle);
    assert.ok(!/<text|<style|NaN|undefined/.test(svg), `${cle} : texte, style ou valeur invalide`);
    // Héros habillés : seuls les replis de la charte (var(--plan, #…)) portent une couleur littérale
    assert.ok(!COULEUR_LITTERALE.test(svg.replace(/var\(--[\w-]+, #[0-9a-f]{3,8}\)/gi, '')), `${cle} : couleur littérale`);
    assert.ok(!ROUGE.test(svg), `${cle} : rouge interdit pour le diabète`);
    assert.ok(!/id="(?!x-)/.test(svg), `${cle} : identifiant non préfixé`);
    assert.ok(svg.length < 60_000, `${cle} : ${svg.length} caractères`);
  }
  assert.deepEqual([...COULEURS_DIABETE], ['var(--d-bas)', 'var(--d-froid)', 'var(--d-doux)']);
});

test('univers diabète : inventaire, statut « à revoir », bases à part entière, sujet et hashtags', () => {
  const inv = inventaireIllustrations();
  assert.equal(CLES_UNIVERS_DIABETE.length, (HEROS_DIABETE.length + DESSINS_DIABETE.length) * 2);
  for (const cle of CLES_UNIVERS_DIABETE) {
    const i = inv.find((x) => x.cle === cle);
    assert.ok(i, cle);
    assert.equal(i.statutParDefaut, 'a_revoir', cle);
    const id = cle.split(':')[1];
    assert.ok(!(DESSINS_PODOLOGIE as readonly string[]).includes(id) && !(THEMES_ILLUSTRES as readonly string[]).includes(id), `${id} : nom déjà pris`);
    assert.equal(baseDeCle(cle), `${cle.split(':')[0]}:${id}`);
    assert.equal(i.type, cle.startsWith('heros:') ? 'heros' : 'dessin');
    assert.deepEqual(sujetsParDefaut({ cle, type: i.type as never, soins: i.soins }), ['diabete'], cle);
    assert.ok(HASHTAGS_PAR_DEFAUT[cle]?.includes('diabete'), `${cle} : #diabete`);
    assert.deepEqual(HASHTAGS_PAR_DEFAUT[cle], HASHTAGS_UNIVERS_DIABETE[cle]);
    for (const h of HASHTAGS_PAR_DEFAUT[cle]) assert.ok(estHashtag(h), `${cle} : #${h}`);
    assert.equal(familleNouveaute(cle).id, 'univers-diabete');
  }
  for (const f of Object.values(FICHES_UNIVERS_DIABETE)) assert.ok(f.source.length > 10 && f.regard.length > 10);
});

test('univers diabète : clé de héros lue, jamais une autre', () => {
  assert.deepEqual(lireCleHerosDiabete('heros:diabete-miroir:pedagogique'), { nom: 'diabete-miroir', registre: 'pedagogique' });
  assert.equal(lireCleHerosDiabete('heros:diabete:pedagogique'), null);
  assert.equal(lireCleHerosDiabete('heros:diabete-inconnu:releve'), null);
  assert.equal(lireCleHerosDiabete('dessin:diabete-creme:releve'), null);
});

test('palette du diabète : aucune gamme rouge ni rose (pas de pastèque ni de framboise)', () => {
  const r = REGLES_THEMES.diabete;
  for (const id of ['pasteque', 'pistache', 'corail', 'corail-nuit']) assert.ok(r.exclues?.includes(id), `${id} exclue`);
  const teinte = (hex: string) => {
    const [R, V, B] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(R, V, B), min = Math.min(R, V, B), d = max - min;
    if (!d) return { t: 0, s: 0 };
    const t = max === R ? ((V - B) / d + 6) % 6 : max === V ? (B - R) / d + 2 : (R - V) / d + 4;
    return { t: t * 60, s: d / (1 - Math.abs(max + min - 1)) };
  };
  for (const id of r.gammes) {
    const g = gamme(id);
    assert.ok(g, id);
    assert.ok(!r.exclues?.includes(id), `${id} à la fois permise et exclue`);
    for (const c of [g.accent, g.accentFonce, g.signal, g.vif, g.duo].filter((x): x is string => Boolean(x))) {
      const { t, s } = teinte(c);
      assert.ok(!(s > 0.35 && (t < 20 || t > 330)), `${id} : ${c} est un rouge ou un rose`);
    }
  }
});
