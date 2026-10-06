import 'server-only';
import {
  classerCommunes,
  departementDepuisCodePostal,
  extraireQuartier,
  normaliserNom,
  placesDepuisCommunesOfficielles,
  placesDepuisOverpass,
  type CommuneOfficielle,
  type CommuneVoisine,
  type ElementOsm,
  type PointGeo,
  type QuartierPropose,
  type ResultatNominatim,
} from '@plateforme/core/geo-voisinage';
import { propositionsStationnement, propositionsTransports, type PropositionAcces } from '@plateforme/core/geo-acces';

// Suggestions de voisinage (quartier, communes alentour, transports, stationnement) pour l'adresse d'un cabinet.
// Appels faits côté serveur uniquement, jamais depuis le navigateur ; seule l'adresse professionnelle du cabinet
// (rue, code postal, ville, pays) est envoyée.
//
// Sources et politiques d'usage :
// - Nominatim (OpenStreetMap, https://operations.osmfoundation.org/policies/nominatim/) : User-Agent identifiant
//   l'application, une requête par seconde au plus (file d'attente ci-dessous), réponses gardées en cache, aucun
//   appel pendant la frappe (l'admin n'appelle qu'une fois l'adresse complète ou au clic sur « Suggérer »).
// - Overpass API (OpenStreetMap) : une seule requête combinée par adresse, plusieurs serveurs publics en repli,
//   délais courts, cache.
// - geo.api.gouv.fr (Etalab, gratuit, sans clé) : population légale INSEE, code commune, centre (France seulement).
// Données © OpenStreetMap contributors (ODbL) ; geo.api.gouv.fr (Licence Ouverte Etalab).

const USER_AGENT = 'webpodologue-admin (https://admin.webpodologue.fr)';
const ENTETES = { 'User-Agent': USER_AGENT, Referer: 'https://admin.webpodologue.fr', 'Accept-Language': 'fr' };

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
/** Budget total Overpass (ms), tous serveurs confondus : la route reste sous sa durée maximale (30 s). */
const BUDGET_OVERPASS = 22000;
const DELAI_PAR_SERVEUR = 18000;
const GEO_API = 'https://geo.api.gouv.fr';

export const MESSAGE_INDISPONIBLE = 'Suggestions indisponibles pour le moment, vous pouvez saisir les communes à la main.';

export type EntreeSuggestions = { adresse: string; codePostal: string; ville: string; pays: 'FR' | 'BE' | 'CH' };

export type CommuneSuggeree = Pick<CommuneVoisine, 'nom' | 'insee' | 'distanceKm'> & {
  /** Population connue (INSEE ou OSM), absente si seulement estimée */
  population?: number;
  sourcePopulation: CommuneVoisine['sourcePopulation'];
};

export type SuggestionsGeo = {
  /** false si l'adresse n'a pas été trouvée ou si aucun service n'a répondu */
  ok: boolean;
  message?: string;
  quartier: QuartierPropose | null;
  communes: CommuneSuggeree[];
  transports: PropositionAcces[];
  stationnement: PropositionAcces[];
  /** Vrai quand Overpass n'a pas répondu (communes et accès manquants, quartier seul) */
  partiel?: boolean;
};

// ---------------------------------------------------------------------------------------------------------------
// Cache en mémoire (par instance serveur) : entrées datées, taille bornée, la plus ancienne évincée en premier.
// ---------------------------------------------------------------------------------------------------------------

class Cache<T> {
  private m = new Map<string, { v: T; fin: number }>();
  constructor(private ttl: number, private max = 500) {}
  get(k: string): T | undefined {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (e.fin < Date.now()) {
      this.m.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k: string, v: T, ttl = this.ttl) {
    this.m.delete(k);
    this.m.set(k, { v, fin: Date.now() + ttl });
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value!);
  }
}

const JOUR = 24 * 3600 * 1000;
const cacheNominatim = new Cache<ResultatNominatim | null>(30 * JOUR);
const cacheOverpass = new Cache<ElementOsm[]>(7 * JOUR, 200);
const cacheGeoApi = new Cache<CommuneOfficielle[]>(7 * JOUR, 300);
const cacheResultats = new Cache<SuggestionsGeo>(7 * JOUR);
const enCours = new Map<string, Promise<SuggestionsGeo>>();

// ---------------------------------------------------------------------------------------------------------------
// Nominatim : une requête par seconde au plus pour toute l'instance.
// ---------------------------------------------------------------------------------------------------------------

let fileNominatim: Promise<unknown> = Promise.resolve();
let dernierAppelNominatim = 0;
const ESPACEMENT_NOMINATIM = 1100;

function dansLaFile<T>(f: () => Promise<T>): Promise<T> {
  const suite = fileNominatim.then(async () => {
    const attente = dernierAppelNominatim + ESPACEMENT_NOMINATIM - Date.now();
    if (attente > 0) await new Promise((r) => setTimeout(r, attente));
    try {
      return await f();
    } finally {
      dernierAppelNominatim = Date.now();
    }
  });
  fileNominatim = suite.catch(() => undefined);
  return suite;
}

async function nominatim(params: Record<string, string>): Promise<ResultatNominatim | null> {
  const qs = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: '1', ...params });
  const cle = qs.toString();
  const deja = cacheNominatim.get(cle);
  if (deja !== undefined) return deja;
  const r = await dansLaFile(async () => {
    const rep = await fetch(`${NOMINATIM}?${qs}`, { headers: ENTETES, signal: AbortSignal.timeout(6000), cache: 'no-store' });
    if (!rep.ok) throw new Error(`Nominatim ${rep.status}`);
    const json = (await rep.json()) as ResultatNominatim[];
    return json[0] ?? null;
  });
  cacheNominatim.set(cle, r);
  return r;
}

/** Géocode l'adresse (rue + code postal + ville), à défaut le code postal et la ville seuls. */
export async function geocoder(e: EntreeSuggestions): Promise<{ r: ResultatNominatim; precis: boolean } | null> {
  const pays = e.pays.toLowerCase();
  if (e.adresse.trim()) {
    const r = await nominatim({ street: e.adresse.trim(), postalcode: e.codePostal.trim(), city: e.ville.trim(), countrycodes: pays });
    if (r) return { r, precis: true };
  }
  const r = await nominatim({ postalcode: e.codePostal.trim(), city: e.ville.trim(), countrycodes: pays });
  return r ? { r, precis: false } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Overpass : une requête combinée (communes, stationnement, gares, arrêts et leurs lignes).
// ---------------------------------------------------------------------------------------------------------------

export function requeteOverpass({ lat, lon }: PointGeo): string {
  // Filtres sur des valeurs exactes (index de tags d'Overpass) plutôt que des expressions régulières : bien plus rapide.
  const p = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  const autour = (r: number, filtres: string[], type = 'node') => filtres.map((f) => `${type}${f}(around:${r},${p});`).join('');
  return `[out:json][timeout:25];
(${autour(25000, ['[place=city]', '[place=town]', '[place=village]'])});
out body;
(${autour(400, ['[amenity=parking]', '[amenity=parking_space]', '[amenity=bicycle_parking]'])});
out body;
(${autour(400, ['[amenity=parking]', '[amenity=parking_space]', '[amenity=bicycle_parking]'], 'way')});
out tags center;
(${autour(2000, ['[railway=station]', '[railway=halt]'])});
out body;
(${autour(500, ['[highway=bus_stop]', '[public_transport=platform]', '[public_transport=stop_position]', '[public_transport=station]'])}${autour(800, ['[railway=tram_stop]', '[railway=subway_entrance]', '[public_transport=stop_position][subway=yes]', '[public_transport=stop_position][tram=yes]'])})->.arrets;
foreach.arrets->.a(
  .a out body;
  rel(bn.a)[route~"^(bus|trolleybus|tram|light_rail|subway)$"];
  out tags;
);`;
}

export async function overpass(point: PointGeo): Promise<ElementOsm[] | null> {
  const cle = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
  const deja = cacheOverpass.get(cle);
  if (deja) return deja;
  const corps = new URLSearchParams({ data: requeteOverpass(point) }).toString();
  const fin = Date.now() + BUDGET_OVERPASS;
  for (const url of OVERPASS) {
    const reste = Math.min(DELAI_PAR_SERVEUR, fin - Date.now());
    if (reste < 3000) break;
    try {
      const rep = await fetch(url, {
        method: 'POST',
        headers: { ...ENTETES, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: corps,
        signal: AbortSignal.timeout(reste),
        cache: 'no-store',
      });
      if (!rep.ok) continue;
      const json = (await rep.json()) as { elements?: ElementOsm[]; remark?: string };
      // Une « remark » signale une requête interrompue (délai, mémoire) : réponse incomplète, serveur suivant.
      if (!Array.isArray(json.elements) || (json.remark && /error|timed out|runtime/i.test(json.remark))) continue;
      cacheOverpass.set(cle, json.elements);
      return json.elements;
    } catch {
      /* serveur suivant */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// geo.api.gouv.fr : communes du département (une requête, en cache) et, pour les communes d'un département voisin,
// la commune qui contient le point OSM.
// ---------------------------------------------------------------------------------------------------------------

const CHAMPS_GEO = 'nom,code,population,centre,codesPostaux';

async function geoApi(chemin: string): Promise<CommuneOfficielle[] | null> {
  const deja = cacheGeoApi.get(chemin);
  if (deja) return deja;
  try {
    const rep = await fetch(`${GEO_API}${chemin}`, { headers: ENTETES, signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (!rep.ok) return null;
    const json = (await rep.json()) as CommuneOfficielle[];
    if (!Array.isArray(json)) return null;
    cacheGeoApi.set(chemin, json);
    return json;
  } catch {
    return null;
  }
}

const communesDuDepartement = (dep: string) => geoApi(`/departements/${encodeURIComponent(dep)}/communes?fields=${CHAMPS_GEO}&format=json`);
const communeAuPoint = (p: PointGeo) => geoApi(`/communes?lat=${p.lat.toFixed(5)}&lon=${p.lon.toFixed(5)}&fields=${CHAMPS_GEO}&format=json`);

// ---------------------------------------------------------------------------------------------------------------

const cleEntree = (e: EntreeSuggestions) =>
  [e.pays, normaliserNom(e.adresse), e.codePostal.replace(/\s/g, ''), normaliserNom(e.ville)].join('|');

export function suggestionsGeo(e: EntreeSuggestions): Promise<SuggestionsGeo> {
  const cle = cleEntree(e);
  const deja = cacheResultats.get(cle);
  if (deja) return Promise.resolve(deja);
  const encours = enCours.get(cle);
  if (encours) return encours;
  const p = calculer(e)
    .then((r) => {
      // Résultat complet gardé une semaine ; partiel (Overpass muet) seulement deux minutes.
      cacheResultats.set(cle, r, r.ok && !r.partiel ? 7 * JOUR : 2 * 60 * 1000);
      return r;
    })
    .catch((): SuggestionsGeo => ({ ok: false, message: MESSAGE_INDISPONIBLE, quartier: null, communes: [], transports: [], stationnement: [] }))
    .finally(() => enCours.delete(cle));
  enCours.set(cle, p);
  return p;
}

const versSuggeree = (c: CommuneVoisine): CommuneSuggeree => ({
  nom: c.nom,
  insee: c.insee,
  distanceKm: Math.round(c.distanceKm * 10) / 10,
  population: c.sourcePopulation === 'estimation' ? undefined : c.population,
  sourcePopulation: c.sourcePopulation,
});

async function calculer(e: EntreeSuggestions): Promise<SuggestionsGeo> {
  const vide = { quartier: null, communes: [], transports: [], stationnement: [] };
  const geo = await geocoder(e);
  if (!geo) {
    return { ok: false, message: 'Adresse introuvable sur la carte : vérifiez-la, ou saisissez le quartier et les communes à la main.', ...vide };
  }
  const point = { lat: Number(geo.r.lat), lon: Number(geo.r.lon) };
  // Sans la rue, le point est le centre de la commune : quartier et accès n'auraient pas de sens.
  const quartier = geo.precis ? extraireQuartier(geo.r, e.codePostal) : null;
  // Commune du cabinet sous ses graphies connues (saisie, Nominatim) ; « municipality » n'en fait pas partie : en zone
  // rurale, Nominatim y met l'arrondissement administratif (« Le Puy-en-Velay » pour Saint-Julien-Chapteuil).
  const a = geo.r.address ?? {};
  const communeCabinet = [e.ville, a.city ?? a.town ?? a.village ?? ''];
  const elements = await overpass(point);
  if (!elements) {
    // Overpass muet : en France, les communes du département (geo.api.gouv.fr) suffisent pour les communes voisines.
    const dep = e.pays === 'FR' ? departementDepuisCodePostal(e.codePostal) : '';
    const [duDep, auPoint] = dep ? await Promise.all([communesDuDepartement(dep), communeAuPoint(point)]) : [null, null];
    if (!duDep?.length) return { ok: true, partiel: true, message: MESSAGE_INDISPONIBLE, ...vide, quartier };
    const communes = classerCommunes(point, placesDepuisCommunesOfficielles(duDep), {
      communeCabinet,
      inseeCabinet: auPoint?.[0]?.code,
      officielles: duDep,
      max: 8,
    }).map(versSuggeree);
    return {
      ok: true,
      partiel: true,
      message: 'Transports et stationnement indisponibles pour le moment, vous pouvez les saisir à la main.',
      ...vide,
      quartier,
      communes,
    };
  }

  const places = placesDepuisOverpass(elements);
  let officielles: CommuneOfficielle[] = [];
  let inseeCabinet: string | undefined;
  if (e.pays === 'FR') {
    const dep = departementDepuisCodePostal(e.codePostal);
    const [duDep, auPoint] = await Promise.all([dep ? communesDuDepartement(dep) : null, communeAuPoint(point)]);
    officielles = [...(duDep ?? []), ...(auPoint ?? [])];
    inseeCabinet = auPoint?.[0]?.code;
    // Communes d'un département voisin : la commune qui contient chaque nœud OSM bien classé et non encore rapproché.
    const provisoire = classerCommunes(point, places, { communeCabinet, inseeCabinet, officielles, max: 20 });
    const aRapprocher = provisoire.filter((c) => c.sourcePopulation !== 'insee').slice(0, 10);
    const trouves = await Promise.all(
      aRapprocher.map(async (c) => {
        const pl = places.find((x) => x.nom === c.nom || normaliserNom(x.nom) === normaliserNom(c.nom));
        const r = pl ? await communeAuPoint(pl) : null;
        // Le nœud OSM est rattaché à la commune qui le contient, même si les noms diffèrent (commune nouvelle :
        // « Oullins » → « Oullins-Pierre-Bénite ») ; les doublons sont ensuite fusionnés par code INSEE.
        if (pl && r?.[0]) pl.insee = r[0].code;
        return r;
      }),
    );
    officielles = [...officielles, ...trouves.flatMap((t) => t ?? [])];
  }
  const communes = classerCommunes(point, places, { communeCabinet, inseeCabinet, officielles, max: 8 }).map(versSuggeree);
  return {
    ok: true,
    quartier,
    communes,
    transports: geo.precis ? propositionsTransports(point, elements) : [],
    stationnement: geo.precis ? propositionsStationnement(point, elements) : [],
  };
}
