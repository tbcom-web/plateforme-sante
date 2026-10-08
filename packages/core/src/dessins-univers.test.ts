// Tests de la planche « ce qui manque » (dessins-univers.ts, pictos nouveaux de pictos.ts) — lancer : node packages/core/scripts/tests.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DESSINS_UNIVERS, FICHES_DESSINS_UNIVERS, FICHES_PICTOS_UNIVERS, HASHTAGS_UNIVERS, HALLUX_VALGUS, piedHalluxValgus, bordTalon, svgDessinUnivers,
} from './dessins-univers';
import { DESSINS_PODOLOGIE } from './univers';
import { PICTOS, PICTOS_SOINS, pictoExiste, svgPicto } from './pictos';
import { inventaireIllustrations } from './illustrations';
import { baseDeCle } from './bases-illustrations';
import { HASHTAGS_PAR_DEFAUT } from './kits';
import { estHashtag } from './hashtags';
import { SUJETS_VISUELS } from './photos-libres';
import { sujetsParDefaut } from './sujets-visuels';
import { EZ_PIED } from './bibliotheque/geometrie';
import { echantillonner, dansPolygone, PLANTE } from './pied';

const COULEUR_LITTERALE = /(?<![\w-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])|\b(?:rgba?|hsla?)\(\s*[\d.]/i;

test('illustrations nouvelles : clés stables, pédagogique, sans texte ni couleur littérale, base dessin:<id>', () => {
  const inv = inventaireIllustrations();
  for (const nom of DESSINS_UNIVERS) {
    assert.ok(!(DESSINS_PODOLOGIE as readonly string[]).includes(nom), `${nom} : nom déjà pris par un dessin`);
    const cle = `dessin:${nom}:pedagogique`;
    const i = inv.find((x) => x.cle === cle);
    assert.ok(i, cle);
    assert.equal(i.statutParDefaut, 'a_revoir');
    assert.equal(i.registre, 'pedagogique');
    assert.equal(baseDeCle(cle), `dessin:${nom}`);
    const svg = i.svg();
    assert.match(svg, /^<svg class="dessin dessin--[a-z-]+ dessin--pedagogique"/);
    assert.ok(!/<text|<style|NaN|undefined|Infinity/.test(svg), `${cle} : texte, style ou valeur invalide`);
    assert.ok(!COULEUR_LITTERALE.test(svg), `${cle} : couleur littérale`);
    // Identifiants préfixés : deux rendus sur une page ne se marchent pas dessus
    assert.ok(!/id="(?!x-)/.test(svgDessinUnivers(nom, { id: 'x' })), `${cle} : identifiant non préfixé`);
  }
});

test('pictos nouveaux : grammaire des pictos, pas branchés sur les sites', () => {
  for (const id of Object.keys(FICHES_PICTOS_UNIVERS)) {
    assert.ok(pictoExiste(id), id);
    assert.ok(PICTOS.some((p) => p.id === id));
    assert.ok(!Object.values(PICTOS_SOINS).includes(id), `${id} : pas encore sur les sites (PICTOS_SOINS)`);
    const svg = svgPicto(id, { accent: true })!;
    assert.ok(!/<text|<style|id=|NaN|undefined/.test(svg), id);
    assert.ok(!COULEUR_LITTERALE.test(svg), id);
    // Une seule épaisseur, posée sur la racine
    assert.equal((svg.match(/stroke-width/g) ?? []).length, 1, id);
    // Points de passage (M, L) dans la grille 48, à la marge du trait près (les poignées de courbe peuvent déborder un peu)
    for (const m of svg.matchAll(/[ML](-?[\d.]+)[ ,](-?[\d.]+)/g)) for (const n of [+m[1], +m[2]]) assert.ok(n >= 0 && n <= 48, `${id} : ${n} hors grille`);
  }
});

test('fiches : sujets connus, hashtags valides et repris dans HASHTAGS_PAR_DEFAUT, sujets par défaut dans l’inventaire', () => {
  const sujets = SUJETS_VISUELS.map((s) => s.id);
  const inv = inventaireIllustrations();
  const fiches = { ...Object.fromEntries(DESSINS_UNIVERS.map((d) => [`dessin:${d}:pedagogique`, FICHES_DESSINS_UNIVERS[d]])), ...Object.fromEntries(Object.entries(FICHES_PICTOS_UNIVERS).map(([id, f]) => [`picto:${id}`, f])) };
  for (const [cle, f] of Object.entries(fiches)) {
    assert.ok(f.sujets.length && f.sujets.every((s) => sujets.includes(s)), `${cle} : sujet inconnu`);
    assert.ok(f.hashtags.every(estHashtag), `${cle} : hashtag invalide`);
    assert.deepEqual(HASHTAGS_PAR_DEFAUT[cle], [...new Set(f.hashtags)].sort());
    assert.deepEqual(HASHTAGS_UNIVERS[cle], HASHTAGS_PAR_DEFAUT[cle]);
    const i = inv.find((x) => x.cle === cle)!;
    assert.deepEqual(sujetsParDefaut({ cle, type: cle.startsWith('picto:') ? 'picto' : 'dessin', soins: i.soins }), sujets.filter((s) => f.sujets.includes(s)), cle);
  }
  // Rien sur la posturologie ni la réflexologie (sujets en attente de validation déontologique)
  assert.ok(!JSON.stringify(fiches).match(/postur|reflexo/i));
});

test('hallux valgus : déviation > 15°, contours raccordés (déformation continue du pied validé), saillie médiale', () => {
  assert.ok(HALLUX_VALGUS.angles[0] > 15 && HALLUX_VALGUS.angles[0] <= 25, 'hallux entre 15 et 25°');
  assert.ok(HALLUX_VALGUS.angles.every((a, i) => i === 0 || a < HALLUX_VALGUS.angles[i - 1]), 'petits orteils de moins en moins déviés');
  const p = piedHalluxValgus();
  // Le bord interne du dos du pied et le bord interne de l'hallux partent du même point (8,58 ; 58,08 avant déformation)
  const debut = (d: string) => echantillonner(d, 4)[0].pts[0];
  const [a, b] = [debut(p.dos.contour), debut(p.orteils[0].contour)];
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.8, `raccord ${a} / ${b}`);
  // L'axe de l'hallux (MTP → bout) est dévié vers le 2e orteil d'au moins 15°
  const piv = EZ_PIED.orteils[0].pivot, bout = EZ_PIED.orteils[0].bout;
  const pts = echantillonner(p.orteils[0].contour, 8).flatMap((s) => s.pts);
  const haut = pts.reduce((m, q) => (q[1] < m[1] ? q : m));
  const angle = (Math.atan2(haut[0] - piv[0], piv[1] - haut[1]) - Math.atan2(bout[0] - piv[0], piv[1] - bout[1])) * (180 / Math.PI);
  assert.ok(angle > 12, `hallux dévié de ${angle.toFixed(1)}°`);
  // Saillie : le bord interne passe en dedans du bord d'origine à la hauteur de la tête de M1
  const xMin = Math.min(...echantillonner(p.dos.contour, 8)[0].pts.filter(([, y]) => y > 58 && y < 72).map(([x]) => x));
  assert.ok(xMin < 6.77 - 4, `saillie ${xMin}`);
});

test('crevasses : bande de corne et fissures DANS la plante, au talon seulement', () => {
  const { bande, fissures } = bordTalon();
  assert.ok(bande.every(([, y]) => y >= 176));
  for (const f of fissures) for (const [x, y] of f) assert.ok(dansPolygone(PLANTE, x, y) && y > 185, `fissure hors du talon (${x}, ${y})`);
});
