// Accès au cabinet (geo-acces.ts) : regroupement des arrêts, fusion des lignes, formulations, stationnement.
// Réponses Overpass réelles enregistrées une fois (fixtures/geo, 2026-10-06) : aucun appel réseau pendant les tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arretsDepuisOverpass,
  composerTexteAcces,
  distanceLisible,
  libelleGare,
  listeLignes,
  minutesAPied,
  propositionsStationnement,
  propositionsTransports,
  texteParking,
} from './geo-acces';
import type { ElementOsm, ResultatNominatim } from './geo-voisinage';
import lyonNominatim from './fixtures/geo/lyon-nominatim.json';
import lyonOverpass from './fixtures/geo/lyon-overpass.json';
import toulonNominatim from './fixtures/geo/toulon-nominatim.json';
import toulonOverpass from './fixtures/geo/toulon-overpass.json';

const point = (r: ResultatNominatim[]) => ({ lat: Number(r[0].lat), lon: Number(r[0].lon) });
const lyon = point(lyonNominatim as ResultatNominatim[]);
const toulon = point(toulonNominatim as ResultatNominatim[]);
const elLyon = (lyonOverpass as { elements: ElementOsm[] }).elements;
const elToulon = (toulonOverpass as { elements: ElementOsm[] }).elements;

test('marche : vol d’oiseau × 1,3 à 80 m/min, au moins une minute', () => {
  assert.equal(minutesAPied(10), 1);
  assert.equal(minutesAPied(400), 7);
  assert.equal(minutesAPied(800), 13);
  assert.equal(distanceLisible(57), '50 m');
  assert.equal(distanceLisible(255), '250 m');
  assert.equal(distanceLisible(1482), '1,5 km');
});

test('lignes : tri naturel, fusion des doublons, liste française', () => {
  assert.equal(listeLignes(['C5', '127', 'C5']), '127 et C5');
  assert.equal(listeLignes(['T4', 'T1']), 'T1 et T4');
  assert.equal(listeLignes(['A']), 'A');
  assert.equal(listeLignes(['10', '2', '1']), '1, 2 et 10');
  assert.equal(listeLignes(['1', '2', '3', '4', '5', '6', '7']), '1, 2, 3, 4, 5 et d’autres lignes');
});

test('regroupement : quais et positions d’arrêt d’une même station fusionnés, lignes réunies', () => {
  const pt = { lat: 45, lon: 4 };
  const els: ElementOsm[] = [
    { type: 'node', id: 1, lat: 45.001, lon: 4, tags: { public_transport: 'platform', highway: 'bus_stop', name: 'Mairie' } },
    { type: 'relation', id: 10, tags: { route: 'bus', ref: '12' } },
    { type: 'node', id: 2, lat: 45.0012, lon: 4, tags: { public_transport: 'stop_position', bus: 'yes', name: 'Mairie' } },
    { type: 'relation', id: 11, tags: { route: 'bus', ref: '3' } },
    { type: 'relation', id: 10, tags: { route: 'bus', ref: '12' } },
    { type: 'node', id: 3, lat: 45.002, lon: 4, tags: { railway: 'tram_stop', name: 'Mairie' } },
    { type: 'relation', id: 12, tags: { route: 'tram', ref: 'T2' } },
    { type: 'node', id: 4, lat: 45.0015, lon: 4, tags: { railway: 'subway_entrance', name: 'Sortie 2' } },
    { type: 'node', id: 5, lat: 45.0015, lon: 4, tags: { amenity: 'parking' } },
    // Relation qui suit un élément qui n'est pas un arrêt : ignorée.
    { type: 'relation', id: 13, tags: { route: 'bus', ref: '99' } },
  ];
  const { arrets } = arretsDepuisOverpass(pt, els);
  assert.equal(arrets.length, 1);
  assert.equal(arrets[0].nom, 'Mairie');
  assert.deepEqual([...arrets[0].lignes.get('bus')!].sort(), ['12', '3']);
  assert.deepEqual([...arrets[0].lignes.get('tram')!], ['T2']);
  assert.equal(arrets[0].distanceM, 111);
  const [p] = propositionsTransports(pt, els);
  assert.equal(p.texte, 'Tram T2 et bus 3 et 12, arrêt Mairie (2 min à pied)');
});

test('Lyon 6e : métro, bus et gares (réponse Overpass réelle)', () => {
  const t = propositionsTransports(lyon, elLyon);
  assert.deepEqual(
    t.map((p) => p.texte),
    [
      'Métro A, station Foch (1 min à pied)',
      'Bus 127 et C5, arrêt Foch - Roosevelt Metro (2 min à pied)',
      'Bus 127, C5 et C6, arrêt Duquesne - Foch (7 min à pied)',
      'Gare de Lyon-Saint-Paul à 1,5 km',
      'Gare de Lyon Part-Dieu à 1,5 km',
    ],
  );
  assert.ok(t.filter((p) => p.genre === 'arret').every((p) => p.distanceM <= 800));
});

test('Lyon 6e : parking nommé avec prix et places PMR tirés des tags, place PMR, vélos', () => {
  assert.deepEqual(
    propositionsStationnement(lyon, elLyon).map((p) => p.texte),
    ['Parc Morand à 250 m (payant, 695 places dont 13 PMR)', 'Place de stationnement PMR à 50 m', 'Stationnement vélo à 50 m'],
  );
});

test('Toulon centre : arrêts de bus regroupés, gare à pied, parkings', () => {
  const t = propositionsTransports(toulon, elToulon).map((p) => p.texte);
  assert.ok(t.includes('Gare de Toulon à 750 m (12 min à pied)'), t.join(' | '));
  assert.ok(t.some((x) => /^Bus .*, arrêt Strasbourg \(\d+ min à pied\)$/.test(x)), t.join(' | '));
  const s = propositionsStationnement(toulon, elToulon).map((p) => p.texte);
  assert.equal(s[0], 'Parking Peiresc à 50 m (payant, 534 places)');
  assert.ok(!s.includes('Stationnement dans les rues voisines'));
});

test('stationnement : rien d’affirmé sans tag, repli « rues voisines », parkings privés exclus', () => {
  assert.equal(texteParking({ name: 'Parking de la Gare' }, 120), 'Parking de la Gare à 100 m');
  assert.equal(texteParking({ name: 'Morand', fee: 'no', capacity: '40' }, 120), 'Parking Morand à 100 m (gratuit, 40 places)');
  assert.equal(texteParking({}, 320), 'Parking à 300 m');
  const pt = { lat: 45, lon: 4 };
  const prive: ElementOsm[] = [
    { type: 'way', id: 1, center: { lat: 45.001, lon: 4 }, tags: { amenity: 'parking', access: 'private', name: 'Résidence' } },
    { type: 'way', id: 2, center: { lat: 45.001, lon: 4 }, tags: { amenity: 'parking', parking: 'street_side' } },
    { type: 'way', id: 3, center: { lat: 45.01, lon: 4 }, tags: { amenity: 'parking', name: 'Loin' } },
  ];
  assert.deepEqual(propositionsStationnement(pt, prive).map((p) => p.texte), ['Stationnement dans les rues voisines']);
});

test('gares : article contracté', () => {
  assert.equal(libelleGare('Toulon'), 'Gare de Toulon');
  assert.equal(libelleGare('Le Puy-en-Velay'), 'Gare du Puy-en-Velay');
  assert.equal(libelleGare('Les Arcs - Draguignan'), 'Gare des Arcs - Draguignan');
  assert.equal(libelleGare('La Ciotat'), 'Gare de la Ciotat');
  assert.equal(libelleGare("L'Isle-Adam"), 'Gare de l’Isle-Adam');
  assert.equal(libelleGare('Gare Saint-Charles'), 'Gare Saint-Charles');
});

test('texte du champ : propositions jointes sans dépasser la longueur enregistrée', () => {
  assert.equal(composerTexteAcces(['Métro A, station Foch', ' Gare à 1 km '], 200), 'Métro A, station Foch · Gare à 1 km');
  assert.equal(composerTexteAcces(['a'.repeat(100), 'b'.repeat(100)], 160), 'a'.repeat(100));
  assert.equal(composerTexteAcces(['x'.repeat(170)], 160).length, 160);
  assert.equal(composerTexteAcces([], 160), '');
});
