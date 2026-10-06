// Accès au cabinet : transports en commun et stationnement proposés à partir d'OpenStreetMap (réponse Overpass).
// Fonctions pures, sans réseau (la requête est faite par la route serveur de l'admin). Les textes produits sont des
// PROPOSITIONS que le praticien coche, corrige ou écarte : rien n'est publié sans sa validation, et rien n'est affirmé
// au-delà des tags OSM (« gratuit » / « payant » seulement si le tag fee le dit). Tests : geo-acces.test.ts.
import { distanceKm, normaliserNom, type ElementOsm, type PointGeo } from './geo-voisinage';

export type ModeTransport = 'metro' | 'tram' | 'bus';
export type GenreProposition = 'arret' | 'gare' | 'parking' | 'pmr' | 'velo' | 'rue';

export type PropositionAcces = {
  id: string;
  genre: GenreProposition;
  texte: string;
  /** Distance à vol d'oiseau, en mètres (0 pour « rues voisines ») */
  distanceM: number;
};

/** Seuils (mètres, à vol d'oiseau) : au-delà, l'arrêt n'est pas proposé. */
export const SEUILS_ACCES = { bus: 500, tramMetro: 800, gare: 2000, stationnement: 400 } as const;
/** Marche : distance à vol d'oiseau × 1,3 (détours des rues), à 80 m par minute. */
export const DETOUR = 1.3;
export const METRES_PAR_MINUTE = 80;

export function minutesAPied(metres: number): number {
  return Math.max(1, Math.round((metres * DETOUR) / METRES_PAR_MINUTE));
}

const metresEntre = (a: PointGeo, b: PointGeo) => Math.round(distanceKm(a, b) * 1000);
const position = (e: ElementOsm): PointGeo | null =>
  e.lat !== undefined && e.lon !== undefined ? { lat: e.lat, lon: e.lon } : e.center ? { lat: e.center.lat, lon: e.center.lon } : null;

/** « 650 m », « 1,2 km » (arrondi à 50 m sous le kilomètre). */
export function distanceLisible(metres: number): string {
  if (metres < 1000) return `${Math.max(50, Math.round(metres / 50) * 50)} m`;
  return `${(Math.round(metres / 100) / 10).toFixed(1).replace('.', ',')} km`;
}

/** « A », « A et B », « C3, 38 et 70 » (cinq lignes au plus, puis « et d'autres lignes »). */
export function listeLignes(refs: string[], max = 5): string {
  const tri = [...new Set(refs)].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  if (tri.length > max) return `${tri.slice(0, max).join(', ')} et d’autres lignes`;
  if (tri.length <= 1) return tri.join('');
  return `${tri.slice(0, -1).join(', ')} et ${tri[tri.length - 1]}`;
}

const modeDeRoute = (route: string | undefined): ModeTransport | null =>
  route === 'subway' ? 'metro' : route === 'tram' || route === 'light_rail' ? 'tram' : route === 'bus' || route === 'trolleybus' ? 'bus' : null;

/** Mode d'un nœud d'arrêt d'après ses seuls tags (les lignes qui le desservent peuvent le préciser). */
function modeDeNoeud(t: Record<string, string | undefined>): ModeTransport | 'gare' | null {
  if (t.railway === 'station' || t.railway === 'halt') {
    if (t.station === 'subway' || t.subway === 'yes') return 'metro';
    if (t.station === 'light_rail' || t.station === 'tram' || t.tram === 'yes' || t.light_rail === 'yes') return 'tram';
    if (t.station === 'funicular' || t.station === 'monorail' || t.funicular === 'yes') return null;
    return 'gare';
  }
  if (t.railway === 'subway_entrance') return 'metro';
  if (t.railway === 'tram_stop') return 'tram';
  if (t.highway === 'bus_stop') return 'bus';
  if (t.public_transport === 'platform' || t.public_transport === 'stop_position' || t.public_transport === 'station') {
    if (t.subway === 'yes') return 'metro';
    if (t.tram === 'yes' || t.light_rail === 'yes') return 'tram';
    if (t.bus === 'yes' || t.trolleybus === 'yes' || t.amenity === 'bus_station') return 'bus';
    if (t.train === 'yes' || t.railway) return null; // quais de gare : la gare est proposée par son nœud station
    return 'bus';
  }
  return null;
}

/** Entrées de métro nommées « Sortie 2 », « Accès Foch » : pas un nom d'arrêt utilisable. */
const NOM_D_ACCES = /\b(sortie|acc[eè]s|entr[ée]e|exit|escalier|ascenseur)\b/i;

type Groupe = { nom: string; distanceM: number; modes: Set<ModeTransport>; lignes: Map<ModeTransport, Set<string>> };

/**
 * Lit une réponse Overpass dans l'ordre : chaque relation route=… suit le nœud d'arrêt qu'elle dessert (requête
 * « foreach » de la route serveur). Regroupe les arrêts par nom (quais, poteaux et positions d'arrêt d'une même
 * station), fusionne leurs lignes, garde la distance du plus proche.
 */
export function arretsDepuisOverpass(cabinet: PointGeo, elements: ElementOsm[]): { arrets: Groupe[]; gares: { nom: string; distanceM: number }[] } {
  const groupes = new Map<string, Groupe>();
  const gares = new Map<string, { nom: string; distanceM: number }>();
  let courant: Groupe | null = null;
  for (const e of elements) {
    const t = e.tags ?? {};
    if (e.type === 'relation') {
      const mode = modeDeRoute(t.route);
      const ref = (t.ref ?? '').trim() || (t.name && t.name.length <= 12 ? t.name.trim() : '');
      if (courant && mode && ref) {
        courant.modes.add(mode);
        courant.lignes.set(mode, (courant.lignes.get(mode) ?? new Set()).add(ref));
      }
      continue;
    }
    courant = null;
    const p = position(e);
    const mode = modeDeNoeud(t);
    const nom = (t['name:fr'] ?? t.name ?? '').trim();
    if (!p || !mode || !nom) continue;
    if (mode === 'metro' && t.railway === 'subway_entrance' && NOM_D_ACCES.test(nom)) continue;
    const d = metresEntre(cabinet, p);
    const cle = normaliserNom(nom.replace(/^gare\s+(de\s+|d['’]\s*)?/i, ''));
    if (mode === 'gare') {
      const g = gares.get(cle);
      if (!g || d < g.distanceM) gares.set(cle, { nom, distanceM: d });
      continue;
    }
    const g = groupes.get(cle) ?? { nom, distanceM: d, modes: new Set<ModeTransport>(), lignes: new Map() };
    g.modes.add(mode);
    if (d < g.distanceM) g.distanceM = d;
    groupes.set(cle, g);
    courant = g;
  }
  return { arrets: [...groupes.values()], gares: [...gares.values()] };
}

const ORDRE_MODES: ModeTransport[] = ['metro', 'tram', 'bus'];
const LIBELLE_MODE: Record<ModeTransport, string> = { metro: 'métro', tram: 'tram', bus: 'bus' };

/** Mode principal d'un groupe : le plus « lourd » qui le dessert réellement (lignes connues), sinon d'après les tags. */
function modePrincipal(g: Groupe): ModeTransport {
  return ORDRE_MODES.find((m) => g.lignes.has(m)) ?? ORDRE_MODES.find((m) => g.modes.has(m)) ?? 'bus';
}

/** « Tram T1 et bus C3, arrêt Brotteaux (3 min à pied) » ; sans ligne connue : « Arrêt de bus Mairie (2 min à pied) ». */
export function texteArret(g: Groupe): string {
  const parts = ORDRE_MODES.filter((m) => g.lignes.get(m)?.size).map((m) => `${LIBELLE_MODE[m]} ${listeLignes([...g.lignes.get(m)!])}`);
  const temps = `${minutesAPied(g.distanceM)} min à pied`;
  const mode = modePrincipal(g);
  if (parts.length === 0) {
    return mode === 'metro' ? `Station de métro ${g.nom} (${temps})` : `Arrêt de ${LIBELLE_MODE[mode]} ${g.nom} (${temps})`;
  }
  const lignes = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
  const lieu = mode === 'metro' ? 'station' : 'arrêt';
  return `${lignes.charAt(0).toUpperCase()}${lignes.slice(1)}, ${lieu} ${g.nom} (${temps})`;
}

/** « Gare de Toulon », « Gare du Puy-en-Velay », « Gare de Lyon-Part-Dieu » ; un nom qui commence par « Gare » est gardé. */
export function libelleGare(nom: string): string {
  if (/^gare\b/i.test(nom)) return nom;
  const elision = /^l['’]\s*(.+)$/i.exec(nom);
  if (elision) return `Gare de l’${elision[1]}`;
  const m = /^(les|le|la)\s+(.+)$/i.exec(nom);
  if (!m) return `Gare de ${nom}`;
  const article = m[1].toLowerCase();
  return `Gare ${article === 'le' ? 'du' : article === 'les' ? 'des' : 'de la'} ${m[2]}`;
}

export function texteGare(nom: string, distanceM: number): string {
  const libelle = libelleGare(nom);
  return distanceM < 1000 ? `${libelle} à ${distanceLisible(distanceM)} (${minutesAPied(distanceM)} min à pied)` : `${libelle} à ${distanceLisible(distanceM)}`;
}

/**
 * Propositions « Transports en commun » : au plus trois arrêts (le métro et le tram les plus proches d'abord,
 * puis les arrêts de bus les plus proches qui apportent des lignes nouvelles) et les deux gares les plus proches.
 * Bus à moins de 500 m, tram et métro à moins de 800 m, gare à moins de 2 km.
 */
export function propositionsTransports(cabinet: PointGeo, elements: ElementOsm[], maxArrets = 3, maxGares = 2): PropositionAcces[] {
  const { arrets, gares } = arretsDepuisOverpass(cabinet, elements);
  const lourd = (g: Groupe) => g.modes.has('metro') || g.modes.has('tram') || g.lignes.has('metro') || g.lignes.has('tram');
  const utiles = arrets
    .filter((g) => g.distanceM <= (lourd(g) ? SEUILS_ACCES.tramMetro : SEUILS_ACCES.bus))
    .sort((a, b) => a.distanceM - b.distanceM);
  const choisis: Groupe[] = [];
  for (const mode of ['metro', 'tram'] as const) {
    const g = utiles.find((x) => modePrincipal(x) === mode && !choisis.includes(x));
    if (g && choisis.length < maxArrets) choisis.push(g);
  }
  const lignesVues = () => new Set(choisis.flatMap((g) => [...g.lignes.entries()].flatMap(([m, s]) => [...s].map((r) => `${m}:${r}`))));
  for (const g of utiles) {
    if (choisis.length >= maxArrets) break;
    if (choisis.includes(g)) continue;
    const vues = lignesVues();
    const siennes = [...g.lignes.entries()].flatMap(([m, s]) => [...s].map((r) => `${m}:${r}`));
    // Un arrêt dont toutes les lignes sont déjà citées n'apporte rien ; un arrêt sans ligne connue passe s'il est le seul.
    if (siennes.length ? siennes.every((l) => vues.has(l)) : choisis.length > 0) continue;
    choisis.push(g);
  }
  choisis.sort((a, b) => a.distanceM - b.distanceM);
  const props: PropositionAcces[] = choisis.map((g) => ({ id: `arret:${normaliserNom(g.nom)}`, genre: 'arret', texte: texteArret(g), distanceM: g.distanceM }));
  // Deux gares au plus : à distances voisines (Lyon-Saint-Paul et Lyon-Part-Dieu), rien ne permet de dire laquelle compte.
  for (const gare of gares.filter((g) => g.distanceM <= SEUILS_ACCES.gare).sort((a, b) => a.distanceM - b.distanceM).slice(0, maxGares)) {
    props.push({ id: `gare:${normaliserNom(gare.nom)}`, genre: 'gare', texte: texteGare(gare.nom, gare.distanceM), distanceM: gare.distanceM });
  }
  return props;
}

const ACCES_EXCLUS = new Set(['private', 'no', 'customers', 'delivery', 'residents', 'employees', 'permit']);
const STATIONNEMENT_DE_RUE = new Set(['street_side', 'lane', 'on_street']);
const entier = (v: string | undefined) => (v && /^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);

/** « Parking Morand à 200 m (payant, 300 places dont 6 PMR) » : seulement ce que disent les tags. */
export function texteParking(t: Record<string, string | undefined>, distanceM: number): string {
  const nom = (t.name ?? '').trim();
  const libelle = !nom ? 'Parking' : /^(parking|parc\b|stationnement)/i.test(nom) ? nom : `Parking ${nom}`;
  const details: string[] = [];
  if (t.fee === 'yes') details.push('payant');
  else if (t.fee === 'no') details.push('gratuit');
  const places = entier(t.capacity);
  const pmr = entier(t['capacity:disabled']);
  if (places) details.push(pmr ? `${places} places dont ${pmr} PMR` : `${places} places`);
  else if (pmr) details.push(`${pmr} places PMR`);
  return `${libelle} à ${distanceLisible(distanceM)}${details.length ? ` (${details.join(', ')})` : ''}`;
}

/**
 * Propositions « Stationnement » à moins de 400 m : deux parkings ouverts au public au plus (les nommés d'abord),
 * la place PMR la plus proche, le stationnement vélo le plus proche. Sans parking trouvé : « Stationnement dans les
 * rues voisines », sans rien affirmer sur le prix.
 */
export function propositionsStationnement(cabinet: PointGeo, elements: ElementOsm[], maxParkings = 2): PropositionAcces[] {
  type Trouve = { e: ElementOsm; t: Record<string, string | undefined>; d: number };
  const parkings: Trouve[] = [];
  const pmr: Trouve[] = [];
  const velos: Trouve[] = [];
  const vus = new Set<string>();
  for (const e of elements) {
    const t = e.tags ?? {};
    const p = position(e);
    if (!p || !t.amenity || vus.has(`${e.type}${e.id}`)) continue;
    vus.add(`${e.type}${e.id}`);
    const d = metresEntre(cabinet, p);
    if (d > SEUILS_ACCES.stationnement) continue;
    if (ACCES_EXCLUS.has(t.access ?? '')) continue;
    if (t.amenity === 'parking') {
      if (STATIONNEMENT_DE_RUE.has(t.parking ?? '')) continue;
      parkings.push({ e, t, d });
    } else if (t.amenity === 'parking_space' && (t.parking_space === 'disabled' || entier(t['capacity:disabled']))) {
      pmr.push({ e, t, d });
    } else if (t.amenity === 'bicycle_parking') {
      velos.push({ e, t, d });
    }
  }
  const props: PropositionAcces[] = [];
  const choisis = parkings.sort((a, b) => a.d - (a.t.name ? 150 : 0) - (b.d - (b.t.name ? 150 : 0))).slice(0, maxParkings).sort((a, b) => a.d - b.d);
  for (const c of choisis) props.push({ id: `parking:${c.e.type}${c.e.id}`, genre: 'parking', texte: texteParking(c.t, c.d), distanceM: c.d });
  const placePmr = pmr.sort((a, b) => a.d - b.d)[0];
  if (placePmr) props.push({ id: `pmr:${placePmr.e.type}${placePmr.e.id}`, genre: 'pmr', texte: `Place de stationnement PMR à ${distanceLisible(placePmr.d)}`, distanceM: placePmr.d });
  if (choisis.length === 0) props.push({ id: 'rue', genre: 'rue', texte: 'Stationnement dans les rues voisines', distanceM: 0 });
  const velo = velos.sort((a, b) => a.d - b.d)[0];
  if (velo) props.push({ id: `velo:${velo.e.type}${velo.e.id}`, genre: 'velo', texte: `Stationnement vélo à ${distanceLisible(velo.d)}`, distanceM: velo.d });
  return props;
}

/**
 * Texte d'un champ du brouillon à partir des propositions retenues, séparées par « · », sans dépasser la longueur
 * acceptée à l'enregistrement (transports 200, stationnement 160) : les dernières propositions sont écartées.
 */
export function composerTexteAcces(textes: string[], max: number): string {
  const retenus = textes.map((t) => t.trim()).filter(Boolean);
  while (retenus.length > 1 && retenus.join(' · ').length > max) retenus.pop();
  const texte = retenus.join(' · ');
  return texte.length > max ? `${texte.slice(0, max - 1).trimEnd()}…` : texte;
}

/** Longueurs maximales des champs d'accès à l'enregistrement (apps/admin/src/app/mon-site/actions.ts). */
export const LONGUEUR_ACCES = { transports: 200, parking: 160 } as const;
