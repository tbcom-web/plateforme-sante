// Voisinage du cabinet : quartier et communes alentour, calculés à partir d'OpenStreetMap (Nominatim, Overpass) et,
// en France, de l'API officielle geo.api.gouv.fr (Etalab : population légale INSEE, code commune).
// Fonctions pures, sans réseau : la route serveur de l'admin (apps/admin/src/lib/geo-suggestions.ts) fait les appels,
// ce module ne fait que lire leurs réponses. Testé par geo-voisinage.test.ts sur des réponses réelles enregistrées.

export type PointGeo = { lat: number; lon: number };

/** Rayon moyen de la Terre (km, IUGG). */
const RAYON_TERRE_KM = 6371.0088;

/** Distance à vol d'oiseau entre deux points (formule de haversine), en kilomètres. */
export function distanceKm(a: PointGeo, b: PointGeo): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Forme de comparaison d'un nom de lieu : minuscules, sans accents ni ponctuation, « St »/« Ste » développés,
 * mentions « Cedex » et numéro d'arrondissement retirées. « Saint-Étienne », « ST ETIENNE CEDEX 1 » et
 * « saint etienne » donnent la même clé.
 */
export function normaliserNom(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/\bcedex\b.*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+\d+\s*(?:er|e|eme)?(?:\s+arrondissement)?\s*$/, '')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\bst\b/g, 'saint')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------------------------------------------
// Quartier (réponse Nominatim, format jsonv2 avec addressdetails=1)
// ---------------------------------------------------------------------------------------------------------------

export type ResultatNominatim = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
};

const VILLES_ARRONDISSEMENTS: { ville: string; re: RegExp; max: number }[] = [
  { ville: 'Paris', re: /^75(\d{3})$/, max: 20 },
  { ville: 'Lyon', re: /^690(\d{2})$/, max: 9 },
  { ville: 'Marseille', re: /^130(\d{2})$/, max: 16 },
];

const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`);

/**
 * Arrondissement des trois villes qui en ont (Paris, Lyon, Marseille), lu d'abord dans le code postal
 * (75015 → « Paris 15e », 69006 → « Lyon 6e », 13001 → « Marseille 1er »), sinon dans l'adresse Nominatim
 * (« Lyon 6e Arrondissement »). Chaîne vide ailleurs.
 */
export function arrondissement(codePostal: string, adresse?: ResultatNominatim['address']): string {
  const cp = codePostal.replace(/\s/g, '');
  for (const v of VILLES_ARRONDISSEMENTS) {
    const m = v.re.exec(cp);
    if (!m) continue;
    // 75116 : Paris 16e (partie nord) ; 75001…75020 sinon.
    const n = cp === '75116' ? 16 : Number(m[1]);
    if (n >= 1 && n <= v.max) return `${v.ville} ${ordinal(n)}`;
  }
  if (!adresse) return '';
  const ville = adresse.city ?? adresse.town ?? '';
  const v = VILLES_ARRONDISSEMENTS.find((x) => normaliserNom(ville) === normaliserNom(x.ville));
  if (!v) return '';
  for (const cle of ['city_district', 'suburb', 'borough']) {
    const m = /(\d{1,2})\s*(?:er|e|ème|eme)?\s+arrondissement/i.exec(adresse[cle] ?? '');
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= v.max) return `${v.ville} ${ordinal(Number(m[1]))}`;
  }
  return '';
}

/** Clés d'adresse Nominatim qui peuvent nommer un quartier, de la plus parlante à la plus large. */
const CLES_QUARTIER = ['quarter', 'suburb', 'neighbourhood', 'city_district', 'borough'] as const;

export type QuartierPropose = {
  /** Valeur proposée pour le champ « Quartier » : « Lyon 6e, Brotteaux », « Mourillon » ou vide */
  propose: string;
  arrondissement: string;
  quartier: string;
  /** Autres formulations possibles, sans doublon, la proposition en premier */
  options: string[];
};

/** Quartier (et arrondissement le cas échéant) tiré d'une réponse Nominatim. */
export function extraireQuartier(r: ResultatNominatim | null | undefined, codePostal: string): QuartierPropose {
  const adresse = r?.address ?? {};
  const arr = arrondissement(codePostal, adresse);
  const ville = normaliserNom(adresse.city ?? adresse.town ?? adresse.village ?? adresse.municipality ?? '');
  const noms: string[] = [];
  for (const cle of CLES_QUARTIER) {
    const v = (adresse[cle] ?? '').trim();
    if (!v || /arrondissement/i.test(v) || /^\d/.test(v)) continue;
    const n = normaliserNom(v);
    if (!n || n === ville || noms.some((x) => normaliserNom(x) === n)) continue;
    noms.push(v);
  }
  const quartier = noms[0] ?? '';
  const propose = [arr, quartier].filter(Boolean).join(', ');
  const options = [...new Set([propose, arr, ...noms].filter(Boolean))];
  return { propose, arrondissement: arr, quartier, options };
}

// ---------------------------------------------------------------------------------------------------------------
// Communes alentour
// ---------------------------------------------------------------------------------------------------------------

export type TypePlace = 'city' | 'town' | 'village';

/** Lieu habité d'OpenStreetMap (nœud place=city|town|village renvoyé par Overpass). */
export type PlaceOsm = { nom: string; lat: number; lon: number; type: TypePlace; population?: number; insee?: string };

/** Commune de geo.api.gouv.fr (champs nom, code, population, centre, codesPostaux). */
export type CommuneOfficielle = {
  nom: string;
  code: string;
  population?: number;
  centre?: { type?: string; coordinates: [number, number] };
  codesPostaux?: string[];
};

export type SourcePopulation = 'insee' | 'osm' | 'estimation';

export type CommuneVoisine = {
  nom: string;
  insee?: string;
  distanceKm: number;
  population: number;
  /** « estimation » : ordre de grandeur selon le type de lieu OSM, jamais affiché */
  sourcePopulation: SourcePopulation;
  score: number;
};

/** Élément brut renvoyé par Overpass (sous-ensemble utile). */
export type ElementOsm = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string | undefined>;
};

/** Tag population d'OSM : « 12345 », « 12 345 », « 12345;12000 » → nombre, ou undefined s'il est illisible. */
export function populationOsm(tag: string | undefined): number | undefined {
  if (!tag) return undefined;
  const n = Number(tag.split(/[;,(]/)[0].replace(/[\s  .]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** Nœuds place=city|town|village d'une réponse Overpass, avec nom (français de préférence). */
export function placesDepuisOverpass(elements: ElementOsm[]): PlaceOsm[] {
  const places: PlaceOsm[] = [];
  for (const e of elements) {
    const t = e.tags ?? {};
    const type = t.place;
    if (e.type !== 'node' || e.lat === undefined || e.lon === undefined) continue;
    if (type !== 'city' && type !== 'town' && type !== 'village') continue;
    const nom = (t['name:fr'] ?? t.name ?? '').trim();
    if (!nom) continue;
    places.push({ nom, lat: e.lat, lon: e.lon, type, population: populationOsm(t.population), insee: t['ref:INSEE'] });
  }
  return places;
}

/**
 * Repli quand Overpass ne répond pas (France) : les communes officielles du département, placées à leur centre
 * geo.api.gouv.fr. Le type de lieu est déduit de la population (il ne sert qu'aux estimations, inutiles ici).
 */
export function placesDepuisCommunesOfficielles(officielles: CommuneOfficielle[]): PlaceOsm[] {
  return officielles
    .filter((o) => o.centre?.coordinates?.length === 2)
    .map((o) => ({
      nom: o.nom,
      lat: o.centre!.coordinates[1],
      lon: o.centre!.coordinates[0],
      type: (o.population ?? 0) >= 20000 ? 'city' : (o.population ?? 0) >= 2000 ? 'town' : 'village',
      population: o.population,
      insee: o.code,
    }));
}

/**
 * Exposant de distance du classement. score = population / (1 + distance_km)^ALPHA.
 * Avec 1,5 : une ville de 150 000 habitants à 3 km (score 18 750) passe devant une de 40 000 à 4 km (3 580),
 * une préfecture de 20 000 habitants à 20 km (208) devant un village de 300 habitants à 3 km (37).
 * Le « + 1 » évite qu'une commune collée au cabinet écrase tout.
 */
export const ALPHA_DISTANCE = 1.5;

export function scoreCommune(population: number, distance: number, alpha = ALPHA_DISTANCE): number {
  return population / Math.pow(1 + Math.max(0, distance), alpha);
}

/** Ordre de grandeur quand aucune population n'est connue (classement seulement, jamais affiché). */
const ESTIMATION: Record<TypePlace, number> = { city: 50000, town: 5000, village: 400 };

/** Rayons essayés tour à tour (km) jusqu'à trouver assez de communes ; le dernier est la limite de la requête. */
export const RAYONS_KM = [10, 15, 20, 25] as const;
/** Nombre de communes à trouver dans le rayon avant de s'arrêter d'élargir. */
const COMMUNES_SUFFISANTES = 8;
/** Une ville au-delà du rayon retenu reste proposée si elle domine clairement le bassin de vie. */
export const POLE_MIN_HABITANTS = 15000;
const POLE_FACTEUR = 3;

export type OptionsClassement = {
  /** Commune du cabinet, sous une ou plusieurs graphies (exclue des suggestions, avec ses doublons) */
  communeCabinet: string | string[];
  inseeCabinet?: string;
  /** Communes officielles connues (geo.api.gouv.fr), pour fiabiliser population et code INSEE */
  officielles?: CommuneOfficielle[];
  max?: number;
};

function rapprocher(p: PlaceOsm, officielles: CommuneOfficielle[], parNom: Map<string, CommuneOfficielle[]>): CommuneOfficielle | undefined {
  if (p.insee) {
    const parCode = officielles.find((o) => o.code === p.insee);
    if (parCode) return parCode;
  }
  const homonymes = parNom.get(normaliserNom(p.nom)) ?? [];
  if (homonymes.length === 0) return undefined;
  // Homonymes (deux « Saint-Martin » dans le département) : celui dont le centre est le plus proche, à moins de 8 km.
  const avecCentre = homonymes
    .filter((o) => o.centre)
    .map((o) => ({ o, d: distanceKm(p, { lat: o.centre!.coordinates[1], lon: o.centre!.coordinates[0] }) }))
    .sort((a, b) => a.d - b.d);
  if (avecCentre.length) return avecCentre[0].d <= 8 ? avecCentre[0].o : undefined;
  return homonymes.length === 1 ? homonymes[0] : undefined;
}

/**
 * Communes à proposer autour du cabinet, de la plus pertinente à la moins pertinente.
 * 1. Rayon adaptatif : 10 km, élargi à 15, 20 puis 25 km tant qu'on a moins de 8 communes (zone rurale).
 * 2. Au-delà du rayon retenu (jusqu'à 25 km), une ville reste candidate si elle compte au moins 15 000 habitants
 *    et trois fois plus que la plus grande commune du rayon (la préfecture qui domine le bassin de vie).
 * 3. Classement par score = population / (1 + distance)^1,5 ; commune du cabinet et doublons exclus.
 * Population : geo.api.gouv.fr (INSEE) en priorité, sinon tag OSM, sinon ordre de grandeur (non affiché).
 */
export function classerCommunes(cabinet: PointGeo, places: PlaceOsm[], options: OptionsClassement): CommuneVoisine[] {
  const officielles = options.officielles ?? [];
  const parNom = new Map<string, CommuneOfficielle[]>();
  for (const o of officielles) {
    const k = normaliserNom(o.nom);
    parNom.set(k, [...(parNom.get(k) ?? []), o]);
  }
  const clesCabinet = new Set((Array.isArray(options.communeCabinet) ? options.communeCabinet : [options.communeCabinet]).map(normaliserNom).filter(Boolean));
  const vues = new Map<string, CommuneVoisine>();
  for (const p of places) {
    const o = rapprocher(p, officielles, parNom);
    const insee = o?.code ?? p.insee;
    const nom = o?.nom ?? p.nom;
    if (clesCabinet.has(normaliserNom(nom)) || clesCabinet.has(normaliserNom(p.nom))) continue;
    if (insee && options.inseeCabinet && insee === options.inseeCabinet) continue;
    const distance = distanceKm(cabinet, p);
    if (distance > RAYONS_KM[RAYONS_KM.length - 1]) continue;
    const [population, sourcePopulation]: [number, SourcePopulation] =
      o?.population ? [o.population, 'insee'] : p.population ? [p.population, 'osm'] : [ESTIMATION[p.type], 'estimation'];
    const c: CommuneVoisine = { nom, insee, distanceKm: distance, population, sourcePopulation, score: scoreCommune(population, distance) };
    const cle = insee ?? normaliserNom(nom);
    const deja = vues.get(cle);
    if (!deja || c.distanceKm < deja.distanceKm) vues.set(cle, c);
  }
  const toutes = [...vues.values()];
  let rayon: number = RAYONS_KM[0];
  for (const r of RAYONS_KM) {
    rayon = r;
    if (toutes.filter((c) => c.distanceKm <= r).length >= COMMUNES_SUFFISANTES) break;
  }
  const dedans = toutes.filter((c) => c.distanceKm <= rayon);
  const plusGrande = Math.max(0, ...dedans.map((c) => c.population));
  const seuilPole = Math.max(POLE_MIN_HABITANTS, POLE_FACTEUR * plusGrande);
  const poles = toutes.filter((c) => c.distanceKm > rayon && c.population >= seuilPole && c.sourcePopulation !== 'estimation');
  return [...dedans, ...poles]
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, options.max ?? 8);
}

// ---------------------------------------------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------------------------------------------

const ESPACE_FINE = ' ';
const grouper = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);

/** Population arrondie pour l'affichage : 347 → « 350 », 4 312 → « 4 300 », 152 486 → « 150 000 ». */
export function populationArrondie(n: number): number {
  if (n < 1000) return Math.max(10, Math.round(n / 10) * 10);
  if (n < 10000) return Math.round(n / 100) * 100;
  const pas = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / pas) * pas;
}

export function formaterPopulation(n: number): string {
  return `≈${ESPACE_FINE}${grouper(populationArrondie(n))}${ESPACE_FINE}hab.`;
}

/** Distance lisible : « 650 m », « 3,2 km », « 18 km ». */
export function formaterDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${(Math.round(km * 10) / 10).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/** Code du département d'un code postal français (geo.api.gouv.fr) : 69006 → 69, 20090 → 2A, 97400 → 974. */
export function departementDepuisCodePostal(codePostal: string): string {
  const cp = codePostal.replace(/\s/g, '');
  if (!/^\d{5}$/.test(cp)) return '';
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3);
  if (cp.startsWith('20')) return Number(cp) < 20200 ? '2A' : '2B';
  return cp.slice(0, 2);
}
