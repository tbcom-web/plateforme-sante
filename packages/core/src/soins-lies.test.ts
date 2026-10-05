// Tests du bloc « À lire aussi » (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soinsLies, SOINS_LIES, SOINS_LIES_MAX, SOINS_EXCLUS_DES_LIENS } from './soins-lies';
import { CATALOGUE_UNIVERS } from './catalogue-univers';
import { SPECIALITES } from './packs';

const site = (...slugs: string[]) => slugs.map((slug) => ({ slug, titreCourt: slug }));
const slugs = (l: { slug: string }[]) => l.map((s) => s.slug);

test('ne garde que les soins cochés, dans l’ordre du graphe', () => {
  const coches = site('soins-de-pedicurie', 'onychoplastie', 'ongle-incarne', 'orthonyxie', 'bilan-podologique');
  assert.deepEqual(slugs(soinsLies('ongle-incarne', coches)), ['orthonyxie', 'onychoplastie', 'soins-de-pedicurie']);
  // orthonyxie absente du site : jamais de lien vers une page inexistante
  assert.deepEqual(slugs(soinsLies('ongle-incarne', site('ongle-incarne', 'soins-de-pedicurie', 'laser'))), ['soins-de-pedicurie']);
  assert.deepEqual(soinsLies('ongle-incarne', site('ongle-incarne')), []);
  assert.deepEqual(soinsLies('inconnu', site('ongle-incarne', 'orthonyxie')), []);
});

test('complète par les liens réciproques puis les voisins de voisins', () => {
  const coches = site('orthonyxie', 'ongles-epais', 'mycose-ongles');
  // orthonyxie → (ongle-incarne, onychoplastie, soins-de-pedicurie absents) ; voisins de voisins : mycose-ongles (via onychoplastie), ongles-epais (via pédicurie)
  const r = slugs(soinsLies('orthonyxie', coches));
  assert.ok(r.includes('mycose-ongles') && r.includes('ongles-epais'));
  // voisin de voisin : k-taping → podologie-du-sport (absent) → bilan-podologique
  assert.deepEqual(slugs(soinsLies('k-taping', site('k-taping', 'bilan-podologique'))), ['bilan-podologique']);
});

test('pas d’auto-lien, pas de doublon, au plus 3 liens', () => {
  const tous = site(...new Set([...Object.keys(SOINS_LIES), ...Object.values(SOINS_LIES).flat()]));
  for (const s of tous) {
    const r = slugs(soinsLies(s.slug, tous));
    assert.ok(!r.includes(s.slug), `${s.slug} se lie à lui-même`);
    assert.equal(new Set(r).size, r.length, `${s.slug} : doublon`);
    assert.ok(r.length <= SOINS_LIES_MAX);
    assert.ok(r.length >= 2, `${s.slug} : moins de 2 liens avec tout le catalogue`);
  }
});

test('jamais de posturologie, de réflexologie ni de laser suggérés, même cochés', () => {
  const tous = site('posturologie', 'reflexologie', 'laser', 'bilan-podologique', 'semelles-orthopediques', 'douleur-talon', 'podologie-du-sport');
  for (const s of tous) {
    const r = slugs(soinsLies(s.slug, tous));
    for (const x of SOINS_EXCLUS_DES_LIENS) assert.ok(!r.includes(x), `${s.slug} → ${x}`);
  }
  for (const liste of Object.values(SOINS_LIES)) assert.ok(!liste.some((x) => /posturo|reflexo|laser/.test(x)));
});

test('graphe : 2 à 4 liens par fiche, pas d’auto-lien ni de doublon', () => {
  for (const [k, v] of Object.entries(SOINS_LIES)) {
    assert.ok(v.length >= 2 && v.length <= 4, k);
    assert.ok(!v.includes(k), k);
    assert.equal(new Set(v).size, v.length, k);
  }
});

test('univers et spécialités : nouveaux soins proposés, limites respectées, pas de posturologie hors « differe »', () => {
  const nouveaux = ['orthonyxie', 'orthoplastie', 'mycose-ongles', 'cors-durillons', 'ongles-epais', 'soins-a-domicile'];
  const proposes = new Set(CATALOGUE_UNIVERS.flatMap((u) => u.preReglage.soinsEnAvant));
  for (const n of ['cors-durillons', 'ongles-epais', 'soins-a-domicile', 'orthonyxie', 'mycose-ongles']) assert.ok(proposes.has(n), n);
  for (const u of CATALOGUE_UNIVERS) {
    assert.ok(u.preReglage.soinsEnAvant.length <= 5, u.id);
    if (u.statut !== 'differe') assert.ok(!u.preReglage.soinsEnAvant.includes('posturologie'), u.id);
  }
  for (const s of SPECIALITES) assert.ok((s.soins ?? []).length <= 5, s.value);
  assert.ok(SPECIALITES.some((s) => (s.soins ?? []).some((x) => nouveaux.includes(x))));
});
