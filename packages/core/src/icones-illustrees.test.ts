import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {
  ICONES_ILLUSTREES_IDS, FICHES_ICONES_ILLUSTREES, ICONES_ILLUSTREES_ECARTEES, ROLES_ICONES, ROLES_SIGNIFIANTS, CONTRASTE_ICONES, PEAU_ICONES,
  couleursIconesIllustrees, variablesIconesIllustrees, svgIconeIllustree, svgPlancheIllustree, calquesIconeIllustree, estChaudNonRouge,
  cleIconeIllustree, lireCleIconeIllustree, CLE_STYLE_ICONES_D, SOURCES_ICONES_ILLUSTREES, SOURCE_ICONES_ILLUSTREES, CORRESPONDANCE_ECHANTILLON_D,
} from './icones-illustrees';
import { TRACES_ICONES_ILLUSTREES } from './icones-illustrees-traces';
import { ECHANTILLON_DIRECTIONS } from './pictos-directions';
import { inventaireIllustrations } from './illustrations';
import { baseDeCle, libelleVariante } from './bases-illustrations';
import { GAMMES, gamme } from './gammes';
import { contraste } from './couleurs';

const LITTERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;
const GAMMES_PLANCHE = ['canard', 'cobalt-abricot', 'pistache', 'encre'];

test('rôles de couleur : chaque aplat tracé et construit est rattaché à un rôle connu, et chaque rôle a une couleur', () => {
  for (const id of ICONES_ILLUSTREES_IDS) {
    const calques = calquesIconeIllustree(id);
    assert.ok(calques.length >= 2, id);
    for (const c of calques) assert.ok((ROLES_ICONES as readonly string[]).includes(c.role), `${id} : ${c.role}`);
    for (const r of Object.keys(TRACES_ICONES_ILLUSTREES[id] ?? {})) assert.ok((ROLES_ICONES as readonly string[]).includes(r), `${id} : rôle tracé ${r}`);
    const svg = svgIconeIllustree(id)!;
    for (const [, r] of svg.matchAll(/var\(--ic-([a-z-]+)\)/g)) assert.ok((ROLES_ICONES as readonly string[]).includes(r), `${id} : variable --ic-${r}`);
  }
  for (const g of GAMMES) {
    const c = couleursIconesIllustrees(g);
    for (const r of ROLES_ICONES) assert.match(c[r], /^#[0-9a-f]{6}$/i, `${g.id} ${r}`);
    assert.deepEqual(Object.keys(variablesIconesIllustrees(g)).sort(), ROLES_ICONES.map((r) => `--ic-${r}`).sort());
  }
});

test('contrastes : formes signifiantes ≥ 3:1 sur la tache dans toutes les gammes ; peau constante ; accent chaud jamais rouge', () => {
  for (const g of GAMMES) {
    const c = couleursIconesIllustrees(g);
    for (const r of ROLES_SIGNIFIANTS) assert.ok(contraste(c[r], c.fond) >= CONTRASTE_ICONES, `${g.id} ${r} ${c[r]} sur ${c.fond} : ${contraste(c[r], c.fond).toFixed(2)}`);
    assert.equal(c.peau, PEAU_ICONES.peau, 'peau neutre, la même dans toutes les gammes');
    assert.equal(c['peau-ombre'], PEAU_ICONES.ombre);
    assert.ok(estChaudNonRouge(c['accent-chaud']), `${g.id} : accent chaud ${c['accent-chaud']} rouge ou rose`);
  }
  // framboise (pistache) : rose-rouge → jamais pris comme accent chaud
  assert.ok(!estChaudNonRouge(gamme('pistache')!.duo!));
  // pied diabétique : aucun accent chaud (aucun rouge, aucune « plaie »)
  assert.ok(!calquesIconeIllustree('pied-diabetique').some((c) => c.role === 'accent-chaud'));
});

test('SVG : grille 128, aucune couleur littérale, ni texte, ni <style>, ni identifiant ; poids < 6 Ko gzip', () => {
  for (const id of ICONES_ILLUSTREES_IDS) {
    for (const taille of [64, 96, 128]) {
      const svg = svgIconeIllustree(id, { taille })!;
      assert.ok(svg.includes('viewBox="0 0 128 128"'), id);
      assert.doesNotMatch(svg, LITTERAL, `${id} : couleur littérale`);
      assert.doesNotMatch(svg, /<text|<style|<image|\sid=|vector-effect|pathLength|xlink/, id);
      assert.ok(gzipSync(svg).length < 6144, `${id} : ${gzipSync(svg).length} octets gzip`);
    }
    // gamme inlinée : valeurs littérales SEULEMENT dans les déclarations de variables --ic-*
    const g = svgIconeIllustree(id, { gamme: 'canard' })!;
    const sansVariables = g.replace(/style="(?:--ic-[a-z-]+:#[0-9a-f]{6};?)+"/i, '');
    assert.doesNotMatch(sansVariables, LITTERAL, `${id} : couleur hors variable`);
  }
  assert.equal(svgIconeIllustree('inconnu'), null);
  const p = svgPlancheIllustree();
  assert.doesNotMatch(p.replace(/style="[^"]*"/, ''), LITTERAL);
  assert.doesNotMatch(p, /<text|<style|\sid=/);
});

test('anatomie : pas d’orteil inventé — cases douteuses améliorées (géométrie pied.ts) ou écartées, avec la raison', () => {
  assert.deepEqual(ICONES_ILLUSTREES_ECARTEES.map((e) => e.numero), [2, 11]);
  for (const e of ICONES_ILLUSTREES_ECARTEES) assert.ok(e.raison.length > 40);
  const ameliorees = ICONES_ILLUSTREES_IDS.filter((id) => FICHES_ICONES_ILLUSTREES[id].traitement === 'amelioree');
  assert.deepEqual(ameliorees.sort(), ['pied-diabetique', 'prevention-chutes', 'soins-domicile']);
  // plante du domicile : 5 orteils (5 ellipses) sur la plante validée
  const plante = calquesIconeIllustree('soins-domicile').filter((c) => c.role === 'accent-chaud' && c.separe);
  assert.equal(plante.length, 1);
  assert.equal((plante[0].d.match(/a[\d.]+ [\d.]+ 0 1 0/g) ?? []).length / 2, 5);
  // aucune case ne garde l'aplat de peau de la source là où le pied a été remplacé
  assert.equal(TRACES_ICONES_ILLUSTREES['prevention-chutes']?.peau, undefined);
  assert.equal(TRACES_ICONES_ILLUSTREES['pied-diabetique'], undefined);
  // numéros de la planche : 12 cases, chacune retenue ou écartée une seule fois
  const nums = [...ICONES_ILLUSTREES_IDS.map((id) => FICHES_ICONES_ILLUSTREES[id].numero), ...ICONES_ILLUSTREES_ECARTEES.map((e) => e.numero)].sort((a, b) => a - b);
  assert.deepEqual(nums, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('inventaire : 10 icônes D et la planche « Style d’icônes » D, à revoir, sans sujet rattaché, bases à part entière, sources tracées', () => {
  const l = inventaireIllustrations();
  const d = l.filter((i) => lireCleIconeIllustree(i.cle));
  assert.equal(d.length, ICONES_ILLUSTREES_IDS.length);
  const planche = l.find((i) => i.cle === CLE_STYLE_ICONES_D);
  assert.ok(planche);
  for (const i of [...d, planche!]) {
    assert.equal(i.statutParDefaut, 'a_revoir');
    assert.deepEqual(i.soins, [], 'rien de rattaché d’office : jamais dans un kit ni sur un site');
    assert.equal(baseDeCle(i.cle), null);
    assert.match(i.svg(), /^<svg/);
  }
  assert.equal(libelleVariante(cleIconeIllustree('sport')), 'Direction D (illustrée)');
  for (const id of ICONES_ILLUSTREES_IDS) {
    assert.match(SOURCES_ICONES_ILLUSTREES[cleIconeIllustree(id)], /ChatGPT, Paul, 2026-10-08/);
    assert.ok(FICHES_ICONES_ILLUSTREES[id].sujets.length && FICHES_ICONES_ILLUSTREES[id].hashtags.length, id);
  }
  assert.match(SOURCE_ICONES_ILLUSTREES.source, /image générée par IA/);
  for (const x of Object.values(CORRESPONDANCE_ECHANTILLON_D)) assert.ok((ECHANTILLON_DIRECTIONS as readonly string[]).includes(x!));
  for (const g of GAMMES_PLANCHE) assert.ok(gamme(g), g);
});
