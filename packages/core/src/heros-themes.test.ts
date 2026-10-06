// Tests des héros de thème et du matériel dessiné le 2026-10-06 (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { THEMES_ILLUSTRES, illustrationTheme, FORMATS_HEROS } from './heros-themes';
import { THEMES } from './themes';
import { REGISTRES, EQUIPEMENTS_DESSINES_2026_10_06, svgEquipement } from './dessins';
import { inventaireIllustrations } from './illustrations';
import { GAMMES_SOBRES, GAMMES_VITAMINEES } from './gammes';

test('chaque thème actif a son héros, posture (différé) n’en a pas', () => {
  for (const t of THEMES) {
    if (t.statut === 'actif') assert.ok((THEMES_ILLUSTRES as readonly string[]).includes(t.id), t.id);
    else assert.equal(illustrationTheme(t.id), '', t.id);
  }
});

test('héros : deux formats, trois registres, deux familles de gammes, sans valeur invalide ni lecture, < 25 Ko gzip', () => {
  for (const g of [GAMMES_SOBRES[0].id, GAMMES_VITAMINEES[0].id, null]) for (const t of THEMES_ILLUSTRES) for (const f of ['paysage', 'portrait'] as const) for (const r of REGISTRES) {
    const s = illustrationTheme(t, { format: f, registre: r, gamme: g });
    assert.match(s, new RegExp(`viewBox="0 0 ${FORMATS_HEROS[f].largeur} ${FORMATS_HEROS[f].hauteur}"`));
    assert.ok(!/NaN|undefined|Infinity/.test(s), `${t} ${f} ${r}`);
    assert.ok(s.includes('aria-hidden="true"'));
    assert.equal((s.match(/<text\b/g) ?? []).length, 0, `${t} ${f} ${r}`);
    assert.ok(gzipSync(s).length < 25 * 1024, `${t} ${f} ${r} : ${gzipSync(s).length} o gzip`);
  }
});

test('matériel du 2026-10-06 : trois registres, et dans l’inventaire de /admin/illustrations', () => {
  const cles = new Set(inventaireIllustrations().map((i) => i.cle));
  for (const id of EQUIPEMENTS_DESSINES_2026_10_06) for (const r of REGISTRES) {
    assert.match(svgEquipement(id, { registre: r }), /^<svg/, `${id} ${r}`);
    assert.ok(cles.has(`materiel:${id}:${r}`), `${id} ${r}`);
  }
  for (const t of THEMES_ILLUSTRES) for (const r of REGISTRES) assert.ok(cles.has(`heros:${t}:${r}`));
  for (const n of ['talon', 'taping', 'verrue', 'laser']) assert.ok(cles.has(`ligne:${n}`), n);
});
