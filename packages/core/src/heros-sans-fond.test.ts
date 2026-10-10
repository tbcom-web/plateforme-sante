// Héros posés SANS fond (retour de Paul du 2026-10-10 : « pour ces illustrations je pense qu'on peut supprimer le background
// carré ») : ni rectangle « plan », ni quadrillage ; sur page claire, traits significatifs ≥ 3:1 sur les fonds de chaque gamme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES_ILLUSTRES, illustrationTheme, teintesRelevesClair, fondsClairsGamme, adapterRelevePageClaire } from './heros-themes';
import { herosDiabete, HEROS_DIABETE } from './univers-diabete';
import { GAMMES, gamme as gammeParId } from './gammes';
import { contraste, melanger, rvb, hex } from './couleurs';
import { NEUTRES } from './charte';

const FORMATS = ['paysage', 'portrait'] as const;

/** Couleurs littérales des traits et aplats francs (opacité effective ≥ 0,5) d'un SVG, avec leur opacité */
function couleursFranches(svg: string): { c: string; o: number; balise: string }[] {
  const l: { c: string; o: number; balise: string }[] = [];
  for (const balise of svg.match(/<(path|line|circle|ellipse|rect|polygon|polyline)\b[^>]*>/g) ?? []) {
    if (/<rect width="\d+" height="\d+" fill="url\(#/.test(balise)) continue; // masques des bords fondus
    const attr = (n: string) => balise.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
    const general = +(attr('opacity') ?? 1);
    for (const [nom, op] of [['stroke', 'stroke-opacity']] as const) {
      const v = attr(nom);
      if (!v) continue;
      let c: string | null = null, a = 1;
      if (/^#[0-9a-f]{6}$/i.test(v)) c = v;
      const m = v.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
      if (m) { c = hex([+m[1], +m[2], +m[3]]); a = +m[4]; }
      if (!c) continue;
      const o = a * +(attr(op) ?? 1) * general;
      if (o >= 0.5) l.push({ c, o, balise });
    }
  }
  return l;
}

test('sans fond : ni rectangle plan, ni quadrillage, ni filets de cadre (17 gammes, 7 thèmes, 2 formats, clair et sombre)', () => {
  assert.equal(GAMMES.length, 17);
  for (const g of GAMMES) for (const t of THEMES_ILLUSTRES) for (const f of FORMATS) for (const sf of ['clair', 'sombre'] as const) {
    const s = illustrationTheme(t, { format: f, registre: 'releve', gamme: g.id, sansFond: sf });
    assert.ok(!/fill="var\(--plan/.test(s), `${g.id} ${t} ${f} ${sf} : rectangle plan`);
    assert.ok(!/grille-labo/.test(s), `${g.id} ${t} ${f} ${sf} : grille du laboratoire`);
    assert.ok(!/stroke-opacity="0.07"/.test(s), `${g.id} ${t} ${f} ${sf} : quadrillage`);
    assert.ok(s.includes('heros-theme--sans-fond'));
    assert.ok(!/NaN|undefined|Infinity/.test(s));
    // Page claire : jamais la classe qui prend l'échelle de pression des fonds sombres
    if (sf === 'clair') assert.ok(!/heros-theme--releve[" ]/.test(s) && s.includes('heros-theme--releve-clair'), `${g.id} ${t} ${f}`);
    else assert.ok(/heros-theme--releve[" ]/.test(s));
  }
});

test('sans fond, page claire : encre ≥ 7:1, accent et palette de pression ≥ 3:1 sur fond, fond doux et aplat (17 gammes)', () => {
  for (const g of GAMMES) {
    const t = teintesRelevesClair(g);
    for (const f of fondsClairsGamme(g)) {
      assert.ok(contraste(t.encre, f) >= 7, `${g.id} : encre ${t.encre} sur ${f} = ${contraste(t.encre, f).toFixed(2)}`);
      assert.ok(contraste(t.accent, f) >= 3, `${g.id} : accent ${t.accent} sur ${f} = ${contraste(t.accent, f).toFixed(2)}`);
      for (const p of t.pression) assert.ok(contraste(p, f) >= 3, `${g.id} : pression ${p} sur ${f}`);
    }
  }
});

test('sans fond, page claire : chaque trait franc (opacité ≥ 0,5) atteint 3:1 sur les fonds de la gamme, aucun blanc', () => {
  for (const g of GAMMES) {
    const fonds = fondsClairsGamme(g);
    const svgs = [
      ...THEMES_ILLUSTRES.flatMap((t) => FORMATS.map((f) => [`${t} ${f}`, illustrationTheme(t, { format: f, registre: 'releve', gamme: g.id, sansFond: 'clair' })])),
      ...HEROS_DIABETE.map((n) => [`diabète ${n}`, herosDiabete(n, { registre: 'releve', gamme: g.id, sansFond: 'clair' })]),
    ];
    for (const [nom, s] of svgs) {
      for (const { c, o, balise } of couleursFranches(s)) {
        for (const f of fonds) {
          const vu = melanger(f, c, o);
          assert.ok(contraste(vu, f) >= 3, `${g.id} ${nom} : ${c} (opacité ${o}) sur ${f} = ${contraste(vu, f).toFixed(2)} — ${balise.slice(0, 90)}`);
        }
      }
      assert.ok(!/(stroke|fill)="(#ffffff|#fff|rgb\(255 255 255)/i.test(s.replace(/<defs>.*?<\/defs>/gs, '')), `${g.id} ${nom} : blanc sur page claire`);
    }
  }
});

test('sans fond, page sombre : couleurs du relevé inchangées (même corps que le héros encadré, hors grille et masques)', () => {
  for (const t of THEMES_ILLUSTRES) {
    const cadre = illustrationTheme(t, { registre: 'releve', gamme: 'cobalt-abricot', id: 'x' });
    const nu = illustrationTheme(t, { registre: 'releve', gamme: 'cobalt-abricot', id: 'x', sansFond: 'sombre' });
    const style = (s: string) => s.match(/style="([^"]*)"/)?.[1];
    assert.equal(style(nu), style(cadre), t);
    assert.ok(nu.length < cadre.length + 1200, t);
  }
});

test('sans fond : sans effet hors du registre relevé ; sans option, héros encadré inchangé', () => {
  for (const r of ['pedagogique', 'ligne'] as const) {
    assert.equal(illustrationTheme('sport', { registre: r, gamme: 'canard', sansFond: 'clair' }), illustrationTheme('sport', { registre: r, gamme: 'canard' }));
  }
  const cadre = illustrationTheme('sport', { registre: 'releve', gamme: 'canard' });
  assert.ok(cadre.includes('fill="var(--plan') && cadre.includes('grille-labo') && !cadre.includes('sans-fond'));
});

test('adaptation à la page claire : blanc → encre (transparence gardée), teinte gardée, var() intouché', () => {
  const g = gammeParId('cobalt-abricot')!;
  const s = adapterRelevePageClaire('<line stroke="rgb(255 255 255 / 0.35)"></line><path stroke="#ffc23d" stroke-opacity="0.6"></path><path stroke="var(--accent)"></path><circle fill="#ffffff"></circle>', '#141f45', fondsClairsGamme(g));
  assert.ok(s.includes('stroke="rgb(20 31 69 / 0.35)"'), s);
  assert.ok(s.includes('stroke="var(--accent)"'));
  assert.ok(s.includes('fill="#141f45"'));
  const jaune = s.match(/<path stroke="(#[0-9a-f]{6})" stroke-opacity="0.6">/)![1];
  const [r, v, b] = rvb(jaune);
  assert.ok(r > b && v > b, `teinte gardée : ${jaune}`);
  for (const f of fondsClairsGamme(g)) assert.ok(contraste(melanger(f, jaune, 0.6), f) >= 3);
  assert.notEqual(NEUTRES.papier, '');
});
