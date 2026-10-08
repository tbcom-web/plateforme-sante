import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIONS_PICTOS, ECHANTILLON_DIRECTIONS, FICHES_DIRECTIONS, FONDS_PICTO, CONTRASTE_PICTO, svgPictoDirection, svgPlancheDirection, svgTuileDirection,
  couleursPictoSur, traitOptique, traitDirection, cleDirection, cleStyleIcones, lireCleDirection, echelleTrace,
} from './pictos-directions';
import { baseDeCle, regrouperParBase, dedoublonnerParBase, libelleVariante, valeurVariante } from './bases-illustrations';
import { candidatsVariantes } from './duels';
import { inventaireIllustrations } from './illustrations';
import { gamme } from './gammes';
import { contraste } from './couleurs';

const nombres = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);

test('36 pictos : grille de la direction, un seul trait, ni couleur littérale, ni texte, ni <style>, ni identifiant', () => {
  for (const d of DIRECTIONS_PICTOS) {
    const G = FICHES_DIRECTIONS[d].grille;
    for (const id of ECHANTILLON_DIRECTIONS) {
      for (const taille of [20, 24, 32, 48, 64]) {
        const svg = svgPictoDirection(id, d, { taille })!;
        const v = `${id} ${d} ${taille}`;
        assert.ok(svg.includes(`viewBox="0 0 ${G} ${G}"`), v);
        const ep = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => +m[1]);
        assert.equal(ep[0], traitDirection(d, taille), v);
        if (d !== 'c') assert.equal(ep.length, 1, `${v} : un seul trait`);
        assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i, v);
        assert.doesNotMatch(svg, /<text|<style|\sid=|vector-effect|pathLength/, v);
        for (const [, p] of svg.matchAll(/ d="([^"]+)"/g)) {
          const abs = p.replace(/a[^A-Za-z]*/g, '');
          assert.ok(nombres(abs).every((n) => n >= -0.6 && n <= G + 0.6), `${v} : tracé hors de la grille`);
        }
        assert.ok(svg.length < 6144, `${v} : ${svg.length} octets`);
      }
      assert.match(svgPictoDirection(id, d, { accent: true })!, /--picto-accent/);
      assert.doesNotMatch(svgPictoDirection(id, d, { accent: false })!, /--picto-accent/);
    }
  }
  assert.equal(svgPictoDirection('inconnu', 'a'), null);
});

test('épaisseur optique : jamais proportionnelle à la taille (fine en grand, tenue en petit)', () => {
  assert.equal(traitOptique('a', 24), 1.5);
  assert.equal(traitOptique('a', 48), 2);
  assert.ok(traitDirection('a', 48) < traitDirection('a', 24));
  assert.ok(traitOptique('a', 40) > 1.75 && traitOptique('a', 40) < 2);
});

test('anatomie : 5 orteils sur chaque plante dessinée (adulte et tout-petit)', () => {
  const ellipses = (svg: string) => (svg.match(/a[\d.]+ [\d.]+ 0 1 0/g) ?? []).length / 2;
  // premiers pas : plante adulte (5) + tout-petit (5) ; domicile, verrue : 5 (+ la verrue, cercle)
  assert.equal(ellipses(svgPictoDirection('premiers-pas', 'a')!), 10);
  assert.equal(ellipses(svgPictoDirection('soins-domicile', 'a')!), 5);
  assert.equal(ellipses(svgPictoDirection('verrue-plantaire', 'a')!), 6);
});

test('accent jamais invisible : ≥ 3:1 contre le fond (blanc, teinté, sombre) dans 4 gammes, sinon une variante', () => {
  for (const id of ['canard', 'pasteque', 'menthe', 'sable']) {
    const g = gamme(id)!;
    for (const f of FONDS_PICTO) {
      const c = couleursPictoSur(g, f);
      assert.ok(contraste(c.accent, c.fond) >= CONTRASTE_PICTO, `${id} ${f} : accent ${c.accent} sur ${c.fond}`);
      assert.ok(contraste(c.trait, c.fond) >= 4.5, `${id} ${f} : trait`);
    }
  }
  // Le cas du retour de Paul : sur l'aplat vert de Menthe, l'accent vert ne passe pas → variante
  const m = couleursPictoSur(gamme('menthe')!, 'teinte');
  assert.ok(m.contrasteAccent >= 3);
});

test('clés : variantes du picto actuel, regroupées sous sa base, picto actuel en tête', () => {
  assert.equal(cleDirection('ongle-incarne', 'b'), 'picto:ongle-incarne@direction-b');
  assert.deepEqual(lireCleDirection('picto:horaires@direction-c'), { id: 'horaires', direction: 'c' });
  assert.equal(baseDeCle('picto:horaires@direction-a'), 'picto:horaires');
  assert.equal(baseDeCle('picto:horaires'), null);
  assert.equal(baseDeCle(cleStyleIcones('a')), null, 'la tuile « Style d’icônes » se note seule');
  assert.equal(valeurVariante('picto:horaires@direction-b'), 'direction-b');
  assert.equal(libelleVariante('picto:horaires@direction-a'), 'Direction A (trait fin)');
  const items = ['picto:horaires@direction-b', 'picto:telephone', 'picto:horaires', 'picto:horaires@direction-a'].map((cle) => ({ cle }));
  const { groupes, seuls } = regrouperParBase(items);
  assert.deepEqual(seuls.map((x) => x.cle), ['picto:telephone']);
  assert.equal(groupes[0].base, 'picto:horaires');
  assert.deepEqual(groupes[0].variantes.map((x) => x.cle), ['picto:horaires', 'picto:horaires@direction-a', 'picto:horaires@direction-b']);
  const file = dedoublonnerParBase(items, (g) => ({ cle: g.base }));
  assert.deepEqual(file.map((x) => x.cle), ['picto:horaires', 'picto:telephone'], 'une seule carte par picto');
  const c = candidatsVariantes('picto:horaires', groupes[0].variantes.map((x) => x.cle), { contrastes: false });
  assert.equal(c.length, 3);
});

test('inventaire : 36 pictos et 3 planches « Style d’icônes », à revoir, sans sujet, rendus non vides', () => {
  const l = inventaireIllustrations();
  const dirs = l.filter((i) => lireCleDirection(i.cle));
  assert.equal(dirs.length, 36);
  const planches = l.filter((i) => i.cle.startsWith('picto:style-icones-'));
  assert.equal(planches.length, 3);
  for (const i of [...dirs, ...planches]) {
    assert.equal(i.statutParDefaut, 'a_revoir');
    assert.deepEqual(i.soins, []);
    assert.match(i.svg(), /^<svg/);
  }
  for (const d of DIRECTIONS_PICTOS) {
    const p = svgPlancheDirection(d);
    assert.doesNotMatch(p, /#[0-9a-f]{3,8}\b|<text|<style|\sid=/i);
    assert.match(svgTuileDirection('horaires', d), /width="100%"/);
  }
});

test('mise à l’échelle des tracés (arcs relatifs compris)', () => {
  assert.equal(echelleTrace('M2 4L6 8H10V12Z', 0.5), 'M1 2L3 4H5V6Z');
  assert.equal(echelleTrace('M10 10a4 4 0 1 0 8 0', 0.5), 'M5 5a2 2 0 1 0 4 0');
});
