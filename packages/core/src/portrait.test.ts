// Tests du studio portrait (lancer : node packages/core/scripts/tests.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  altPortrait, ancreDepuisSilhouette, ancreDepuisVisage, cadrer, calculerRetouche, courbeRetouche, deplacer, FORMATS_PORTRAIT,
  hauteurRendu, largeursRendu, nettoyerPortrait, palettePortrait, portraitARecomposer, REGLAGE_NEUTRE, renduPour, rendusPortrait,
  scoreDetourage, SEUIL_DETOURAGE, srcsetPortrait, STYLES_PORTRAIT, zoomer, type PortraitStudio,
} from './portrait';
import { GAMMES } from './gammes';

const L = 1200, H = 1600;
// Visage de 300 px de haut, centré horizontalement, un peu haut dans la photo
const visage = ancreDepuisVisage({ x: 450, y: 400, l: 300, h: 300 }, L, H);

test('cadrage tête-épaules 4:5 : visage ≈ 28 % de la hauteur, centré, marge au-dessus de la tête', () => {
  const c = cadrer('portrait', visage, REGLAGE_NEUTRE, L, H);
  assert.ok(Math.abs(c.l / c.h - 4 / 5) < 1e-9, 'ratio 4:5');
  assert.ok(Math.abs(300 / c.h - 0.28) < 0.01, 'part du visage');
  assert.ok(Math.abs(c.x + c.l / 2 - 600) < 1, 'centré sur le visage');
  // Haut des cheveux ≈ 0,45 hauteur de visage au-dessus de la boîte : il reste une marge
  const hautTete = 400 - 0.45 * 300;
  assert.ok(hautTete - c.y > 0.05 * c.h, 'marge au-dessus de la tête');
  assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.l <= L + 1e-9 && c.y + c.h <= H + 1e-9, 'dans l’image');
});

test('cadrage carré plus serré, toujours dans l’image même avec un visage au bord', () => {
  const c = cadrer('carre', visage, REGLAGE_NEUTRE, L, H);
  assert.equal(Math.round(c.l), Math.round(c.h));
  assert.ok(300 / c.h > 0.35);
  const bord = ancreDepuisVisage({ x: 0, y: 0, l: 200, h: 200 }, L, H);
  for (const f of ['portrait', 'carre'] as const) {
    const b = cadrer(f, bord, REGLAGE_NEUTRE, L, H);
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.l <= L + 1e-9 && b.y + b.h <= H + 1e-9, f);
  }
});

test('un visage très grand (selfie trop proche) : cadre réduit à l’image, ratio conservé', () => {
  const proche = ancreDepuisVisage({ x: 200, y: 300, l: 800, h: 900 }, L, H);
  const c = cadrer('portrait', proche, REGLAGE_NEUTRE, L, H);
  assert.ok(c.l <= L + 1e-9 && c.h <= H + 1e-9);
  assert.ok(Math.abs(c.l / c.h - 0.8) < 1e-9);
});

test('zoom et déplacement au doigt : bornés, le cadre suit et ne sort jamais', () => {
  const z = zoomer(REGLAGE_NEUTRE, 10);
  assert.equal(z.zoom, 3);
  assert.equal(zoomer(REGLAGE_NEUTRE, 0.01).zoom, 0.5);
  const avant = cadrer('portrait', visage, REGLAGE_NEUTRE, L, H);
  // Glisser de 40 px vers la droite sur un aperçu de 400 px : le contenu suit le doigt, le cadre part à gauche
  const r = deplacer('portrait', visage, REGLAGE_NEUTRE, 40, 0, 400, L, H);
  const apres = cadrer('portrait', visage, r, L, H);
  assert.ok(Math.abs(avant.x - apres.x - (40 * avant.l) / 400) < 1e-6);
  // Glisser très loin : butée sur le bord, et un retour en arrière a un effet immédiat (pas d'accumulation)
  const loin = deplacer('portrait', visage, REGLAGE_NEUTRE, 100000, 0, 400, L, H);
  assert.equal(cadrer('portrait', visage, loin, L, H).x, 0);
  const retour = deplacer('portrait', visage, loin, -40, 0, 400, L, H);
  assert.ok(cadrer('portrait', visage, retour, L, H).x > 0);
});

test('ancre depuis la silhouette quand aucun visage n’est détecté', () => {
  const a = ancreDepuisSilhouette(200, 600, 280, L, H);
  assert.ok(a.cy * H > 200 && a.cy * H < 200 + 280 * 1.2);
  assert.equal(a.cx, 0.5);
});

test('tailles de rendu adaptées aux gabarits, sans agrandissement', () => {
  assert.deepEqual(largeursRendu('portrait', 2000), FORMATS_PORTRAIT.portrait.largeurs);
  assert.deepEqual(largeursRendu('portrait', 700), [400, 640]);
  assert.deepEqual(largeursRendu('portrait', 300), [300]);
  assert.deepEqual(largeursRendu('carre', 1000), [128, 192]);
  assert.equal(hauteurRendu('portrait', 640), 800);
  assert.equal(hauteurRendu('carre', 192), 192);
});

test('palette des fonds : couleurs de la gamme, recomposition si les couleurs changent', () => {
  for (const g of GAMMES) {
    const p = palettePortrait({ couleur: '#000000', gamme: g.id });
    for (const c of [p.fond, p.doux, p.aplat, p.pale, p.vif, p.duo, p.encre, p.duotoneSombre, p.duotoneClair]) assert.match(c, /^#[0-9a-f]{6}$/);
    assert.equal(p.cle, `gamme:${g.id}`);
  }
  const libre = palettePortrait({ couleur: '#C0392B', gamme: '' });
  assert.equal(libre.cle, 'couleur:#c0392b');
  assert.equal(palettePortrait({ couleur: 'pas une couleur' }).cle.startsWith('couleur:#'), true);
  const portrait = { style: 'aplat', couleurs: 'gamme:canard' } as PortraitStudio;
  assert.equal(portraitARecomposer(portrait, { couleur: '', gamme: 'canard' }), false);
  assert.equal(portraitARecomposer(portrait, { couleur: '', gamme: 'cobalt' }), true);
  assert.equal(portraitARecomposer({ ...portrait, style: 'flou' }, { couleur: '', gamme: 'cobalt' }), false);
  assert.equal(STYLES_PORTRAIT.length, 6);
});

const histo = (centre: number, etendue: number) => {
  const h = new Array(256).fill(0);
  for (let i = Math.max(0, centre - etendue); i <= Math.min(255, centre + etendue); i++) h[i] = 100;
  return h;
};

test('retouche : photo sombre et bleutée éclaircie et réchauffée, sans excès', () => {
  const r = calculerRetouche({ luminance: histo(70, 50), moyenne: [60, 70, 95], clairs: [150 * 1000, 170 * 1000, 215 * 1000, 1000], sujet: 70 });
  assert.ok(r.gamma < 1, 'éclaircit');
  assert.ok(r.gamma >= 0.72, 'borné');
  assert.ok(r.gains[0] > r.gains[2], 'réchauffe');
  assert.ok(r.gains.every((g) => g > 0.8 && g < 1.25), 'gains modérés');
  assert.ok(r.noir >= 0 && r.noir <= 32 && r.blanc <= 255 && r.blanc > r.noir);
  const lut = courbeRetouche(r, 1);
  for (let i = 1; i < 256; i++) assert.ok(lut[i] >= lut[i - 1], 'courbe monotone');
  assert.ok(lut[70] > 70, 'le sujet est plus lumineux');
});

test('retouche : photo déjà correcte presque inchangée', () => {
  const r = calculerRetouche({ luminance: histo(128, 127), moyenne: [128, 128, 128], clairs: [230e3, 230e3, 230e3, 1000], sujet: 143 });
  assert.ok(Math.abs(r.gamma - 1) < 0.08);
  assert.ok(Math.abs(r.gains[1] - 1) < 0.01);
  const lut = courbeRetouche(r, 1);
  assert.ok(Math.abs(lut[128] - 128) < 14);
  assert.equal(lut[0], 0);
  assert.ok(lut[255] >= 250);
});

test('score du détourage : bon masque au-dessus du seuil, masques douteux en dessous', () => {
  assert.ok(scoreDetourage({ surface: 0.4, incertain: 0.05, visage: 0.98, basTouche: true }) >= SEUIL_DETOURAGE);
  assert.ok(scoreDetourage({ surface: 0.4, incertain: 0.35, visage: 0.98, basTouche: true }) < SEUIL_DETOURAGE, 'nuageux');
  assert.ok(scoreDetourage({ surface: 0.4, incertain: 0.06, visage: 0.4, basTouche: true }) < SEUIL_DETOURAGE, 'visage hors silhouette');
  assert.equal(scoreDetourage({ surface: 0.01, incertain: 0, visage: null, basTouche: true }), 0);
  assert.equal(scoreDetourage({ surface: NaN, incertain: 0, visage: null, basTouche: true }), 0);
});

const base = 'https://x.supabase.co/storage/v1/object/public/photos/';
const valide = (u: string) => u.startsWith(base);
const rendus = {
  portrait: [{ l: 640, h: 800, url: `${base}s/p640.webp` }, { l: 400, h: 500, url: `${base}s/p400.webp` }],
  carre: [{ l: 128, h: 128, url: `${base}s/c128.webp` }, { l: 192, h: 192, url: 'https://ailleurs/c192.webp' }],
};

test('nettoyage des données : URLs du stockage seulement, portrait périmé abandonné', () => {
  const brut = { source: `${base}s/src.webp`, detouree: 'javascript:alert(1)', style: 'aplat', ombre: true, ancre: { cx: 9, cy: 0.4, t: 0.2 }, reglage: { zoom: 99, dx: 0, dy: 0 }, couleurs: 'gamme:canard', retouche: { gains: [5, 1, 1], noir: 10, blanc: 250, gamma: 0.9, contraste: 0.14, saturation: 1.04 }, rendus };
  const p = nettoyerPortrait(brut, `${base}s/p640.webp`, valide)!;
  assert.ok(p);
  assert.equal(p.detouree, '');
  assert.equal(p.style, 'original', 'style détouré sans photo détourée : repli');
  assert.equal(p.ancre.cx, 1);
  assert.equal(p.reglage.zoom, 3);
  assert.equal(p.retouche?.gains[0], 1.4, 'gains bornés');
  assert.equal(nettoyerPortrait({ ...brut, retouche: 'oui' }, `${base}s/p640.webp`, valide)?.retouche, null);
  assert.deepEqual(p.rendus.portrait.map((r) => r.l), [400, 640], 'tri par largeur');
  assert.deepEqual(p.rendus.carre.map((r) => r.l), [128], 'URL extérieure retirée');
  assert.equal(nettoyerPortrait(brut, `${base}s/autre.webp`, valide), undefined, 'photo remplacée par un autre chemin');
  assert.equal(nettoyerPortrait(brut, '', valide), undefined);
  assert.equal(nettoyerPortrait('n’importe quoi', `${base}s/p640.webp`, valide), undefined);
});

test('rendu sur les sites : srcset, src de secours et texte alternatif', () => {
  const r = rendusPortrait({ photo: `${base}s/p640.webp`, portrait: { rendus } as PortraitStudio })!;
  assert.ok(r);
  assert.equal(rendusPortrait({ photo: `${base}s/autre.webp`, portrait: { rendus } as PortraitStudio }), null);
  assert.equal(rendusPortrait({ photo: `${base}s/p640.webp` }), null);
  assert.equal(srcsetPortrait(r.portrait), `${base}s/p400.webp 400w, ${base}s/p640.webp 640w`);
  assert.equal(renduPour(r.portrait, 500)?.l, 640);
  assert.equal(renduPour(r.portrait, 2000)?.l, 640);
  assert.equal(altPortrait('Camille', 'Rousseau', 'Pédicure-podologue'), 'Portrait de Camille Rousseau, pédicure-podologue');
});
