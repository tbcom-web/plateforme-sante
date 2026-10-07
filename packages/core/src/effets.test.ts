import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { cssEffets, cssSurvolSimule, JEUX_EFFETS } from './effets';
import { cssFormes, FORMES_CARTES } from './formes';

const gz = (s: string) => gzipSync(Buffer.from(s, 'utf8'), { level: 9 }).length;

test('effets : poids mesuré, moins de 3 Ko gzip pour l’ensemble des jeux (un site n’embarque que le sien)', () => {
  const tous = JEUX_EFFETS.map((j) => cssEffets(j.id)).join('');
  assert.ok(gz(tous) < 3072, `effets : ${gz(tous)} octets gzip`);
  for (const j of JEUX_EFFETS) assert.ok(gz(cssEffets(j.id)) < 1536, `${j.id} : ${gz(cssEffets(j.id))} octets gzip`);
});

test('effets : CSS seul, transform et opacity pour le mouvement, jamais de propriété qui recalcule la mise en page', () => {
  for (const j of JEUX_EFFETS) {
    const css = cssEffets(j.id);
    assert.ok(!/<script|javascript:/i.test(css));
    // Transitions et images clés : jamais width, height, top, left, margin, padding (CLS nul, aucun recalcul de mise en page)
    for (const m of css.matchAll(/transition:([^;}]+)/g)) assert.ok(!/\b(width|height|top|left|margin|padding|all)\b/.test(m[1]), `${j.id} : transition ${m[1]}`);
    for (const m of css.matchAll(/@keyframes [\w-]+\{([^}]*\{[^}]*\})+\}/g)) assert.ok(!/\b(width|height|top|left|margin|padding)\s*:/.test(m[0]), `${j.id} : ${m[0]}`);
  }
});

test('effets : contenu toujours visible sans prise en charge (apparition en amélioration progressive) et mouvements réduits respectés', () => {
  for (const j of JEUX_EFFETS) {
    const css = cssEffets(j.id);
    // Aucun état caché hors d'un @supports (animation-timeline) : sans CSS moderne, sans JS ou pour un robot, tout est visible
    // (l'apparition progressive est toujours le dernier bloc de la feuille ; le voile ::after de « Vivant » est un calque vide)
    const horsSupports = css.split('@supports (animation-timeline:view())')[0].replace(/::after\{[^}]*\}/g, '');
    assert.ok(!/opacity:0(?![.\d])/.test(horsSupports), `${j.id} : état caché par défaut`);
    assert.equal(css.split('@supports (animation-timeline:view())').length <= 2, true, j.id);
    assert.ok(!/visibility:hidden|display:none/.test(css), `${j.id} : contenu masqué`);
    // Tout mouvement (apparition, zoom, soulèvement) est sous prefers-reduced-motion:no-preference
    if (/animation-timeline/.test(css)) assert.ok(/@supports \(animation-timeline:view\(\)\)\{@media \(prefers-reduced-motion:no-preference\)/.test(css), j.id);
    if (/scale\(1\.0/.test(css)) assert.ok(/prefers-reduced-motion:no-preference\)\{[^@]*scale\(1\.0/.test(css), j.id);
    if (/@view-transition/.test(css)) assert.ok(/prefers-reduced-motion:reduce\)\{@view-transition\{navigation:none\}/.test(css), j.id);
  }
});

test('effets : jamais sur le premier écran (élément LCP) : seulement les sections suivantes, les cartes et la galerie', () => {
  for (const j of JEUX_EFFETS) {
    const css = cssEffets(j.id);
    assert.ok(!/\.pe\b|premier|hero|h1/i.test(css), j.id);
    if (/eff-in/.test(css)) assert.ok(/:not\(:first-of-type\)/.test(css), j.id);
  }
  assert.equal(cssEffets('inconnu'), '');
});

test('effets : survol simulé (aperçu de l’admin) = règles de survol du jeu, rejouées sous data-survol', () => {
  assert.equal(cssSurvolSimule('inconnu'), '');
  for (const j of JEUX_EFFETS.filter((x) => x.id !== 'sobre')) {
    const s = cssSurvolSimule(j.id);
    assert.ok(s.includes(`[data-effets=${j.id}][data-survol]`), j.id);
    assert.ok(!s.includes(':hover'), j.id);
  }
});

test('formes des cartes : CSS seul, poids faible, aucune pour « celle du modèle »', () => {
  assert.equal(cssFormes('gabarit'), '');
  assert.equal(cssFormes('inconnue'), '');
  for (const f of FORMES_CARTES.filter((x) => x.id !== 'gabarit')) {
    const css = cssFormes(f.id);
    assert.ok(css.startsWith('[data-forme=') || css.startsWith('@media'), f.id);
    assert.ok(gz(css) < 600, `${f.id} : ${gz(css)} octets gzip`);
    // Mosaïque : seulement à partir de 760 px (téléphone : une colonne lisible)
    if (f.id === 'mosaique') assert.ok(/@media \(min-width:760px\)\{[^@]*span 2/.test(css));
    // Tuiles pleine couleur : texte sur la paire vif / vif-texte (contraste garanti par gabarits.ts)
    if (f.id === 'tuiles') assert.ok(css.includes('var(--g-vif-texte') && css.includes('var(--g-vif'));
  }
});
