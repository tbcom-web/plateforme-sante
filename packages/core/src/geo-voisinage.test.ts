// Voisinage du cabinet (geo-voisinage.ts) : distances, noms, quartier, classement des communes.
// Réponses réelles enregistrées une fois (fixtures/geo, 2026-10-06) : aucun appel réseau pendant les tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHA_DISTANCE,
  arrondissement,
  classerCommunes,
  departementDepuisCodePostal,
  distanceKm,
  extraireQuartier,
  formaterDistance,
  formaterPopulation,
  normaliserNom,
  placesDepuisCommunesOfficielles,
  placesDepuisOverpass,
  populationArrondie,
  populationOsm,
  scoreCommune,
  type CommuneOfficielle,
  type ElementOsm,
  type PlaceOsm,
  type ResultatNominatim,
} from './geo-voisinage';
import lyonNominatim from './fixtures/geo/lyon-nominatim.json';
import toulonNominatim from './fixtures/geo/toulon-nominatim.json';
import villageNominatim from './fixtures/geo/village-nominatim.json';
import lyonOverpass from './fixtures/geo/lyon-overpass.json';
import toulonOverpass from './fixtures/geo/toulon-overpass.json';
import lyonGeoApi from './fixtures/geo/lyon-geoapi.json';
import toulonGeoApi from './fixtures/geo/toulon-geoapi.json';

const point = (r: ResultatNominatim) => ({ lat: Number(r.lat), lon: Number(r.lon) });
const officielles = (f: { departement: unknown[]; auPoint: unknown[] }) => [...f.departement, ...f.auPoint] as CommuneOfficielle[];

test('haversine : distances connues', () => {
  assert.equal(distanceKm({ lat: 45, lon: 4 }, { lat: 45, lon: 4 }), 0);
  // Lyon (place Bellecour) → Paris (Notre-Dame) : environ 392 km à vol d'oiseau.
  const d = distanceKm({ lat: 45.7578, lon: 4.832 }, { lat: 48.853, lon: 2.3499 });
  assert.ok(d > 388 && d < 396, String(d));
  // Un degré de latitude ≈ 111,2 km.
  assert.ok(Math.abs(distanceKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) - 111.2) < 0.1);
});

test('normalisation des noms : accents, Saint-, Cedex, arrondissement', () => {
  assert.equal(normaliserNom('Saint-Étienne'), 'saint etienne');
  assert.equal(normaliserNom('ST ETIENNE CEDEX 1'), 'saint etienne');
  assert.equal(normaliserNom('Ste-Foy-lès-Lyon'), 'sainte foy les lyon');
  assert.equal(normaliserNom('Sainte-Foy-lès-Lyon'), 'sainte foy les lyon');
  assert.equal(normaliserNom('Lyon 6e Arrondissement'), 'lyon');
  assert.equal(normaliserNom('Marseille 1er'), 'marseille');
  assert.equal(normaliserNom("L'Haÿ-les-Roses"), 'l hay les roses');
  assert.equal(normaliserNom('Œuilly'), 'oeuilly');
});

test('arrondissement : code postal de Paris, Lyon, Marseille', () => {
  assert.equal(arrondissement('69006'), 'Lyon 6e');
  assert.equal(arrondissement('69001'), 'Lyon 1er');
  assert.equal(arrondissement('75015'), 'Paris 15e');
  assert.equal(arrondissement('75116'), 'Paris 16e');
  assert.equal(arrondissement('13001'), 'Marseille 1er');
  assert.equal(arrondissement('13016'), 'Marseille 16e');
  assert.equal(arrondissement('83000'), '');
  assert.equal(arrondissement('69100'), ''); // Villeurbanne
  assert.equal(arrondissement('', { city: 'Lyon', suburb: 'Lyon 3e Arrondissement' }), 'Lyon 3e');
});

test('quartier : Lyon 6e (réponse Nominatim réelle)', () => {
  const q = extraireQuartier((lyonNominatim as ResultatNominatim[])[0], '69006');
  assert.equal(q.propose, 'Lyon 6e, Les Brotteaux');
  assert.equal(q.arrondissement, 'Lyon 6e');
  assert.deepEqual(q.options, ['Lyon 6e, Les Brotteaux', 'Lyon 6e', 'Les Brotteaux']);
});

test('quartier : Toulon centre, et rien d’inventé en village', () => {
  assert.equal(extraireQuartier((toulonNominatim as ResultatNominatim[])[0], '83000').propose, 'Basse Ville');
  // Saint-Julien-Chapteuil : un hameau et l'arrondissement administratif, mais pas de quartier.
  const v = extraireQuartier((villageNominatim as ResultatNominatim[])[0], '43260');
  assert.equal(v.propose, '');
  assert.deepEqual(v.options, []);
  assert.equal(extraireQuartier(null, '69006').propose, 'Lyon 6e');
});

test('population OSM : formats tolérés', () => {
  assert.equal(populationOsm('12345'), 12345);
  assert.equal(populationOsm('12 345'), 12345);
  assert.equal(populationOsm('12345;12000'), 12345);
  assert.equal(populationOsm('environ'), undefined);
  assert.equal(populationOsm(undefined), undefined);
});

test('score : population et proximité (α = 1,5)', () => {
  assert.equal(ALPHA_DISTANCE, 1.5);
  assert.equal(scoreCommune(1000, 0), 1000);
  assert.ok(Math.abs(scoreCommune(150000, 3) - 18750) < 1e-9);
  // Grande ville proche > ville moyenne proche ; préfecture à 20 km > village à 3 km.
  assert.ok(scoreCommune(150000, 3) > scoreCommune(40000, 4));
  assert.ok(scoreCommune(20000, 20) > scoreCommune(300, 3));
  // À population égale, la plus proche passe devant.
  assert.ok(scoreCommune(5000, 2) > scoreCommune(5000, 6));
});

test('communes autour de Lyon 6e : grandes villes proches, Lyon exclue, populations INSEE', () => {
  const r = (lyonNominatim as ResultatNominatim[])[0];
  const places = placesDepuisOverpass((lyonOverpass as { elements: ElementOsm[] }).elements);
  assert.ok(places.length > 100);
  const c = classerCommunes(point(r), places, { communeCabinet: ['Lyon', 'Lyon'], inseeCabinet: '69123', officielles: officielles(lyonGeoApi) });
  assert.equal(c.length, 8);
  assert.equal(c[0].nom, 'Villeurbanne');
  assert.equal(c[0].sourcePopulation, 'insee');
  assert.ok(c[0].distanceKm > 2 && c[0].distanceKm < 3.5);
  assert.ok(!c.some((x) => normaliserNom(x.nom) === 'lyon'));
  assert.ok(c.every((x) => x.distanceKm <= 10));
  for (let i = 1; i < c.length; i++) assert.ok(c[i - 1].score >= c[i].score);
  assert.ok(c.some((x) => x.nom === 'Caluire-et-Cuire'));
});

test('communes autour de Toulon : la commune du cabinet et ses doublons exclus', () => {
  const r = (toulonNominatim as ResultatNominatim[])[0];
  const places = placesDepuisOverpass((toulonOverpass as { elements: ElementOsm[] }).elements);
  const c = classerCommunes(point(r), places, { communeCabinet: 'Toulon', officielles: officielles(toulonGeoApi), max: 8 });
  assert.equal(c[0].nom, 'La Seyne-sur-Mer');
  assert.ok(!c.some((x) => x.nom === 'Toulon'));
  assert.equal(new Set(c.map((x) => x.insee ?? x.nom)).size, c.length);
  assert.ok(c.some((x) => x.nom === 'La Valette-du-Var'));
});

test('rayon adaptatif : zone rurale élargie, pôle lointain gardé s’il domine le bassin de vie', () => {
  const cabinet = { lat: 45.0, lon: 4.0 };
  // Décalage vers l'est d'environ d km (1° de longitude ≈ 78,6 km à 45° de latitude).
  const a = (nom: string, d: number, population: number, type: PlaceOsm['type'] = 'village'): PlaceOsm => ({ nom, lat: 45, lon: 4 + d / 78.63, type, population });
  const places = [
    a('Village A', 3, 300),
    a('Village B', 5, 450),
    a('Village C', 7, 200),
    a('Bourg D', 12, 2500, 'town'),
    a('Village E', 14, 150),
    a('Saint-Truc', 4, 600),
    a('St Truc', 4.2, 600), // doublon d'écriture
    a('Préfecture', 22, 19000, 'town'),
  ];
  const c = classerCommunes(cabinet, places, { communeCabinet: 'Mon Village' });
  // Moins de 8 communes jusqu'à 25 km : tout est retenu, la préfecture en tête malgré la distance.
  assert.equal(c[0].nom, 'Préfecture');
  assert.equal(c.filter((x) => normaliserNom(x.nom) === 'saint truc').length, 1);
  // Zone dense : 8 communes dans 10 km, la ville à 22 km n'est gardée que si elle domine nettement.
  const dense = Array.from({ length: 9 }, (_, i) => a(`Commune ${'ABCDEFGHI'[i]}`, 1 + i, 8000, 'town'));
  const sansPole = classerCommunes(cabinet, [...dense, a('Ville moyenne', 22, 19000, 'town')], { communeCabinet: 'X' });
  assert.ok(!sansPole.some((x) => x.nom === 'Ville moyenne'));
  const avecPole = classerCommunes(cabinet, [...dense, a('Grande ville', 22, 160000, 'city')], { communeCabinet: 'X' });
  assert.ok(avecPole.some((x) => x.nom === 'Grande ville'));
});

test('population sans source : estimée pour le classement, signalée comme telle', () => {
  const c = classerCommunes({ lat: 45, lon: 4 }, [{ nom: 'Hameau', lat: 45.01, lon: 4, type: 'village' }], { communeCabinet: 'X' });
  assert.equal(c[0].sourcePopulation, 'estimation');
});

test('repli sans Overpass : communes officielles placées à leur centre', () => {
  const p = placesDepuisCommunesOfficielles([
    { nom: 'Villeurbanne', code: '69266', population: 163684, centre: { type: 'Point', coordinates: [4.8897, 45.7699] } },
    { nom: 'Sans centre', code: '00000' },
  ]);
  assert.equal(p.length, 1);
  assert.deepEqual([p[0].type, p[0].insee, p[0].lat, p[0].lon], ['city', '69266', 45.7699, 4.8897]);
});

test('affichage : population arrondie, distance, département', () => {
  assert.equal(populationArrondie(347), 350);
  assert.equal(populationArrondie(4312), 4300);
  assert.equal(populationArrondie(152486), 150000);
  assert.equal(populationArrondie(63732), 64000);
  assert.equal(formaterPopulation(152486), '≈ 150 000 hab.');
  assert.equal(formaterDistance(0.62), '600 m');
  assert.equal(formaterDistance(3.24), '3,2 km');
  assert.equal(formaterDistance(18.4), '18 km');
  assert.equal(departementDepuisCodePostal('69006'), '69');
  assert.equal(departementDepuisCodePostal('20090'), '2A');
  assert.equal(departementDepuisCodePostal('20200'), '2B');
  assert.equal(departementDepuisCodePostal('97400'), '974');
  assert.equal(departementDepuisCodePostal('1000'), '');
});
