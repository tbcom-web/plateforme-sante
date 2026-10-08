import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIONS_PICTOS, ECHANTILLON_DIRECTIONS, FICHES_DIRECTIONS, FONDS_PICTO, CONTRASTE_PICTO, svgPictoDirection, svgPlancheDirection, svgTuileDirection,
  couleursPictoSur, traitOptique, traitDirection, cleDirection, cleStyleIcones, lireCleDirection, echelleTrace,
} from './pictos-directions';
import { baseDeCle, regrouperParBase, dedoublonnerParBase, libelleVariante, notesAvecBases, statutEffectif } from './bases-illustrations';
import { tranchesDepuisSignaux } from './tranches';
import { poidsAssets, scoreAsset } from './assets-poids';
import { noteHeritee, notesVisuels, visuelExclu } from './kits-visuels';
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

test('clés : chaque direction est une base à part entière (refonte), jamais une variante du picto actuel', () => {
  assert.equal(cleDirection('ongle-incarne', 'b'), 'picto:ongle-incarne@direction-b');
  assert.deepEqual(lireCleDirection('picto:horaires@direction-c'), { id: 'horaires', direction: 'c' });
  for (const d of DIRECTIONS_PICTOS) assert.equal(baseDeCle(cleDirection('horaires', d)), null);
  assert.equal(baseDeCle(cleStyleIcones('a')), null, 'la tuile « Style d’icônes » se note seule');
  assert.equal(libelleVariante('picto:horaires@direction-a'), 'Direction A (trait fin)');
  const items = ['picto:horaires@direction-b', 'picto:telephone', 'picto:horaires', 'picto:horaires@direction-a'].map((cle) => ({ cle }));
  assert.equal(regrouperParBase(items).groupes.length, 0);
  assert.deepEqual(dedoublonnerParBase(items, (g) => ({ cle: g.base })).map((x) => x.cle), items.map((x) => x.cle), 'une carte par direction');
});

test('picto actuel noté 1 ★ (et retiré) : ses 3 directions restent visibles, sans note, statut ni refus hérités', () => {
  const actuel = 'picto:horaires';
  const dirs = DIRECTIONS_PICTOS.map((d) => cleDirection('horaires', d));
  const lignes = [{ cle: actuel, note: 1 }, { cle: actuel, note: 1 }];
  // Notes « vues par la file » : la note du picto actuel ne se recopie sur aucune direction
  assert.deepEqual(notesAvecBases(lignes.map((l) => ({ ...l, empreinte: null }))).map((n) => n.cle), [actuel, actuel]);
  // Règle « 1 ★ n'apparaît plus » (tranches.ts) : seul le picto actuel est refusé
  const t = tranchesDepuisSignaux(notesAvecBases(lignes));
  assert.ok(t.refuses.has(actuel));
  for (const k of dirs) assert.ok(!t.refuses.has(k) && !t.favoris.has(k) && !t.notes.has(k), k);
  // Apprentissage : aucun effet hérité (score neutre), statut « retiré » non hérité
  const poids = poidsAssets([...lignes, { cle: actuel, statut: 'retire' }, ...Array.from({ length: 8 }, () => ({ cle: 'gamme:canard', note: 4 }))]);
  assert.ok((poids!.effets[actuel] ?? 0) < 0);
  for (const k of dirs) assert.equal(scoreAsset(k, poids), 0, k);
  assert.equal(statutEffectif(dirs[0], { [actuel]: 'retire' }), undefined);
  // Kits / exclusions ≤ 2 ★ : ni note héritée, ni exclusion
  const notes = notesVisuels(lignes);
  for (const k of dirs) {
    assert.equal(noteHeritee(k, notes), null, k);
    assert.equal(visuelExclu(k, { visuels: [], notes, statuts: { [actuel]: 'retire' }, exclues: new Set([actuel]) }), false, k);
  }
  assert.equal(visuelExclu(actuel, { visuels: [], notes }), true);
  // Tuile « Style d'icônes » : indépendante elle aussi
  for (const d of DIRECTIONS_PICTOS) { assert.equal(scoreAsset(cleStyleIcones(d), poids), 0); assert.ok(!t.refuses.has(cleStyleIcones(d))); }
});

test('inventaire : 36 pictos et 3 planches « Style d’icônes », à revoir, sans sujet, rendus non vides', () => {
  const l = inventaireIllustrations();
  const dirs = l.filter((i) => lireCleDirection(i.cle));
  assert.equal(dirs.length, 36);
  const planches = l.filter((i) => /^picto:style-icones-[abc]$/.test(i.cle)); // la planche D : icones-illustrees.test.ts
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
