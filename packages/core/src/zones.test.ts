import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deplacerZone, ligneZone, lignesZones, LIMITES_ZONES, normaliserZone, normaliserZones, positionZone, serialiserZones, svgSurimpression, zoneDepuisPixels, type Zone } from './zones';

test('normalisation : un tracé en pixels devient des coordonnées 0-1, dans n’importe quel sens, borné à la surface', () => {
  const z = zoneDepuisPixels({ x: 600, y: 300 }, { x: 300, y: 100 }, 1200, 800, { forme: 'ellipse', appareil: 'mobile' })!;
  assert.deepEqual([z.x, z.y, z.l, z.h], [0.25, 0.125, 0.25, 0.25]);
  assert.equal(z.forme, 'ellipse');
  assert.equal(z.appareil, 'mobile');
  // Débordement : borné à la surface
  const b = zoneDepuisPixels({ x: -50, y: -50 }, { x: 2000, y: 400 }, 1000, 800)!;
  assert.deepEqual([b.x, b.y, b.l, b.h], [0, 0, 1, 0.5]);
  // Trop petite : refusée
  assert.equal(zoneDepuisPixels({ x: 10, y: 10 }, { x: 12, y: 200 }, 1000, 1000), null);
  // Même zone quelle que soit la taille d'affichage
  const a1 = zoneDepuisPixels({ x: 100, y: 50 }, { x: 300, y: 150 }, 1000, 500)!;
  const a2 = zoneDepuisPixels({ x: 50, y: 25 }, { x: 150, y: 75 }, 500, 250)!;
  assert.deepEqual(a1, a2);
});

test('zone reçue : valeurs bornées, arrondies, étiquette et commentaire nettoyés ; invalide → null', () => {
  const z = normaliserZone({ x: 0.9, y: 0.123456789, l: 0.5, h: 0.2, etiquette: 'inconnue', commentaire: `  le   pouce\n est trop long ${'x'.repeat(400)}`, appareil: 'tablette' })!;
  assert.equal(z.x, 0.9);
  assert.ok(Math.abs(z.l - 0.1) < 1e-9, 'largeur ramenée dans la surface');
  assert.equal(z.y, 0.1235);
  assert.equal(z.etiquette, 'a-revoir');
  assert.equal(z.appareil, 'ordinateur');
  assert.ok(z.commentaire.startsWith('le pouce est trop long'));
  assert.equal(z.commentaire.length, LIMITES_ZONES.commentaire);
  assert.equal(normaliserZone({ x: 'a', y: 0, l: 1, h: 1 }), null);
  assert.equal(normaliserZone(null), null);
});

test('lot de zones : contexte vérifié, 12 zones au plus, sérialisation stable et relisible', () => {
  const zones = Array.from({ length: 15 }, (_, i) => ({ x: 0.01 * i, y: 0.1, l: 0.1, h: 0.1, etiquette: 'anatomie', commentaire: `n${i}` }));
  const n = normaliserZones({ appareil: 'mobile', empreinte: 'abcd1234', page: 'contact', largeur: 390, zones })!;
  assert.equal(n.zones.length, 12);
  assert.equal(n.appareil, 'mobile');
  assert.equal(n.empreinte, 'abcd1234');
  const s = serialiserZones(n)!;
  assert.deepEqual(normaliserZones(JSON.parse(s)), n, 'aller-retour identique');
  assert.equal(serialiserZones(normaliserZones(JSON.parse(s))), s, 'sérialisation stable');
  assert.equal(normaliserZones({ appareil: 'x', empreinte: 'pas-hex', zones: [] }), null, 'aucune zone : rien');
  assert.equal(normaliserZones({ zones: [{ x: 0, y: 0, l: 1, h: 1 }] })!.appareil, 'les-deux');
});

test('déplacement : la zone reste dans la surface', () => {
  const z = normaliserZone({ x: 0.7, y: 0.7, l: 0.2, h: 0.2 })!;
  const d = deplacerZone(z, 0.5, -1);
  assert.deepEqual([d.x, d.y], [0.8, 0]);
});

test('position et ligne de synthèse', () => {
  const z: Zone = { forme: 'rect', x: 0.7, y: 0.05, l: 0.2, h: 0.1, etiquette: 'anatomie', commentaire: 'le pouce est trop long', appareil: 'ordinateur' };
  assert.equal(positionZone(z), 'en haut à droite');
  assert.equal(positionZone({ x: 0.4, y: 0.4, l: 0.2, h: 0.2 }), 'au centre');
  assert.equal(positionZone({ x: 0.0, y: 0.4, l: 0.2, h: 0.2 }), 'à gauche');
  assert.equal(positionZone({ x: 0.4, y: 0.8, l: 0.2, h: 0.1 }), 'en bas');
  assert.equal(ligneZone(z, 1), 'zone 2 en haut à droite : anatomie — « le pouce est trop long »');
  assert.equal(ligneZone({ ...z, appareil: 'mobile', commentaire: '' }, 0), 'zone 1 en haut à droite (mobile) : anatomie');
  assert.deepEqual(lignesZones(null), []);
});

test('surimpression SVG : une forme et une pastille numérotée par zone, aux coordonnées de la surface, texte échappé', () => {
  const zones = [
    { forme: 'rect' as const, x: 0.5, y: 0.25, l: 0.25, h: 0.5, etiquette: 'texte' as const, commentaire: 'a <b> & "c"', appareil: 'ordinateur' as const },
    { forme: 'ellipse' as const, x: 0, y: 0, l: 0.5, h: 0.5, etiquette: 'coupe' as const, commentaire: '', appareil: 'mobile' as const },
  ];
  const svg = svgSurimpression(zones, 800, 400);
  assert.match(svg, /viewBox="0 0 800 400"/);
  assert.match(svg, /<rect x="400.0" y="100.0" width="200.0" height="200.0"/);
  assert.match(svg, /<ellipse cx="200.0" cy="100.0" rx="200.0" ry="100.0"/);
  assert.equal((svg.match(/<circle /g) ?? []).length, 2);
  assert.match(svg, />1<\/text>/);
  assert.match(svg, />2<\/text>/);
  assert.ok(!svg.includes('<b>'), 'commentaire échappé');
  assert.match(svg, /&lt;b&gt; &amp; &quot;c&quot;/);
  assert.equal(svgSurimpression([], 10, 10).includes('<g>'), false);
});
