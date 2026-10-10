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
    // Aucun texte, SAUF l'analyse de la foulée du sport en relevé (exception de Paul du 2026-10-10 : données d'une analyse de course)
    if (t === 'sport' && r === 'releve') assert.ok(s.includes('dessin--analyse-course') && !s.includes('grille-labo'), `${f} : analyse de la foulée, plus le coureur à rotules`);
    else assert.equal((s.match(/<text\b/g) ?? []).length, 0, `${t} ${f} ${r}`);
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

test('aucun texte incrusté dans les dessins, le matériel et les animations des sites (règle de Paul du 2026-10-06)', async () => {
  const { DESSINS_PODOLOGIE } = await import('./univers');
  const { ANIMATIONS } = await import('./packs');
  const { svgDessin, svgAnimationFixe, contenuSemelle, contenuPremiersPas, contenuTrajectoire, EQUIPEMENTS_DESSINES } = await import('./dessins');
  const sans = (s: string, ou: string) => {
    assert.ok(!/<text\b/.test(s), `${ou} : <text>`);
    assert.ok(!/class="legende"|<line class="cote"|class="renvoi"/.test(s), `${ou} : légende, cote ou renvoi`);
  };
  for (const n of DESSINS_PODOLOGIE) for (const r of REGISTRES) sans(svgDessin(n, { registre: r }), `dessin ${n} ${r}`);
  for (const id of EQUIPEMENTS_DESSINES) for (const r of REGISTRES) sans(svgEquipement(id, { registre: r }), `matériel ${id} ${r}`);
  for (const a of ANIMATIONS) for (const r of REGISTRES) sans(svgAnimationFixe(a, { registre: r }), `animation ${a} ${r}`);
  for (const c of [contenuSemelle(), contenuPremiersPas(), contenuTrajectoire()]) sans(c, 'contenu animé');
  assert.ok(!/rect x="\d+" y="268"/.test(contenuSemelle()), 'semelle : nuancier « relief » retiré');
});

test('héros enfant et senior : scènes dessinées (ni podoscope, ni plaque d’empreintes, ni point rouge isolé)', () => {
  for (const f of ['paysage', 'portrait'] as const) for (const r of REGISTRES) {
    const e = illustrationTheme('enfant', { format: f, registre: r });
    assert.ok(e.includes('dessin--heros-enfant'), `enfant ${f} ${r}`);
    assert.ok(!/podoscope/.test(e), `enfant ${f} ${r} : podoscope`);
    const s = illustrationTheme('senior', { format: f, registre: r });
    assert.ok(s.includes('dessin--heros-senior') && (r === 'ligne' || s.includes('class="canne"')), `senior ${f} ${r}`);
    assert.ok(!/oscillation|polygone|--d-chaud/.test(s), `senior ${f} ${r} : plaque d’empreintes ou point rouge`);
  }
});

test('héros diabète (monofilament tenu en main), pédicurie (sans durillon en trame)', () => {
  for (const f of ['paysage', 'portrait'] as const) for (const r of REGISTRES) {
    const d = illustrationTheme('diabete', { format: f, registre: r });
    assert.ok(d.includes('dessin--heros-diabete'), `diabète ${f} ${r} : scène`);
    assert.ok(r === 'ligne' || d.includes('class="filament"'), `diabète ${f} ${r} : filament`);
    assert.ok(!/--d-chaud|vibration|onde/.test(d), `diabète ${f} ${r} : rouge ou diapason flottant`);
    const p = illustrationTheme('pedicurie', { format: f, registre: r });
    assert.ok(!/durillon/.test(p), `pédicurie ${f} ${r} : plaque de durillon`);
  }
});
