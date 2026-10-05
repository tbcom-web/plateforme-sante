// Plan d'accès des gabarits « tableau » et « village » : JAMAIS inventé.
// - Si le cabinet a des coordonnées (saisies ou géocodées, lib/visuels.ts), les VRAIES rues autour du cabinet sont lues dans
//   OpenStreetMap au build (API Overpass, une requête, mise en cache sur disque) et dessinées en SVG simplifié, aux couleurs
//   du site (variables --g-plan-*) : aucune tuile, aucune iframe, aucun script tiers ; mention « © OpenStreetMap » (ODbL).
// - Sinon (pas de coordonnées, réseau indisponible, PLAN_OSM=non), un schéma volontairement abstrait, étiqueté
//   « plan schématique » : un point et l'adresse, sans aucune fausse rue.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geo } from './visuels';

export const PLAN = { largeur: 400, hauteur: 300, rayon: 230 } as const;

type Rue = { d: string; classe: 'grande' | 'moyenne' | 'petite' | 'pietonne'; nom?: string };
type Etiquette = { x: number; y: number; angle: number; nom: string };
export type PlanAcces =
  | { source: 'osm'; rues: Rue[]; etiquettes: Etiquette[]; stations: { x: number; y: number; nom: string }[]; point: { x: number; y: number } }
  | { source: 'schema' };

const CLASSES: Record<string, Rue['classe']> = {
  trunk: 'grande', primary: 'grande', secondary: 'grande', tertiary: 'moyenne',
  residential: 'petite', unclassified: 'petite', living_street: 'pietonne', pedestrian: 'pietonne',
};

type Element = { type: string; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[]; lat?: number; lon?: number };

async function donneesOsm(lat: number, lng: number): Promise<Element[] | null> {
  const dossier = join(process.cwd(), 'node_modules', '.cache', 'plan-acces');
  const cache = join(dossier, `${lat.toFixed(5)}_${lng.toFixed(5)}.json`);
  try {
    return JSON.parse(await readFile(cache, 'utf8'));
  } catch { /* pas encore en cache */ }
  if (process.env.PLAN_OSM === 'non') return null;
  const r = Math.round(PLAN.rayon * 1.6);
  const requete = `[out:json][timeout:20];(way["highway"~"^(${Object.keys(CLASSES).join('|')})$"](around:${r},${lat},${lng});node["railway"="station"](around:${r},${lat},${lng});node["public_transport"="station"](around:${r},${lat},${lng}););out geom tags;`;
  for (const serveur of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']) {
    try {
      const rep = await fetch(serveur, {
        method: 'POST',
        body: new URLSearchParams({ data: requete }),
        headers: { 'User-Agent': 'plateforme-sante/1.0 (contact@webpodologue.fr)' },
        signal: AbortSignal.timeout(25000),
      });
      if (!rep.ok) continue;
      const json = (await rep.json()) as { elements?: Element[] };
      if (!json.elements?.length) continue;
      await mkdir(dossier, { recursive: true }).then(() => writeFile(cache, JSON.stringify(json.elements))).catch(() => {});
      return json.elements;
    } catch { /* serveur suivant */ }
  }
  return null;
}

async function construire(): Promise<PlanAcces> {
  if (!geo) return { source: 'schema' };
  const elements = await donneesOsm(geo.lat, geo.lng);
  if (!elements) return { source: 'schema' };
  const { largeur: L, hauteur: H, rayon } = PLAN;
  const echelle = L / (2 * rayon);
  const kx = Math.cos((geo.lat * Math.PI) / 180) * 111320;
  // Le cabinet un peu à droite du centre : la photo ou la légende peuvent occuper la gauche sans le cacher.
  const cx = L * 0.56, cy = H * 0.5;
  const proj = (p: { lat: number; lon: number }) => [cx + (p.lon - geo.lng) * kx * echelle, cy - (p.lat - geo.lat) * 110540 * echelle] as const;
  const dedans = ([x, y]: readonly [number, number], marge = 40) => x > -marge && x < L + marge && y > -marge && y < H + marge;
  const rues: Rue[] = [];
  const longueurs = new Map<string, { l: number; x: number; y: number; angle: number }>();
  for (const e of elements) {
    if (e.type !== 'way' || !e.geometry || !e.tags?.highway) continue;
    const classe = CLASSES[e.tags.highway];
    if (!classe) continue;
    const pts = e.geometry.map(proj);
    if (!pts.some((p) => dedans(p))) continue;
    rues.push({ d: `M${pts.map(([x, y]) => `${x.toFixed(0)} ${y.toFixed(0)}`).join('L')}`, classe, nom: e.tags.name });
    // Étiquette : sur le plus long segment visible de la rue (toutes portions confondues), lisible (angle entre −80° et 80°).
    if (!e.tags.name) continue;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (!dedans([mx, my], -50)) continue;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      const cour = longueurs.get(e.tags.name);
      if ((!cour || l > cour.l) && Math.abs(angle) < 80) longueurs.set(e.tags.name, { l, x: mx, y: my, angle });
    }
  }
  if (rues.length < 3) return { source: 'schema' };
  // Les rues les plus visibles d'abord ; jamais deux étiquettes qui se touchent, ni une étiquette sur le cabinet.
  const etiquettes: Etiquette[] = [];
  for (const [nom, v] of [...longueurs].sort((a, b) => b[1].l - a[1].l)) {
    if (v.l < 46 || etiquettes.length >= 6) continue;
    if (Math.hypot(v.x - cx, v.y - cy) < 56) continue;
    if (etiquettes.some((t) => Math.hypot(t.x - v.x, t.y - v.y) < 90)) continue;
    etiquettes.push({ x: +v.x.toFixed(0), y: +v.y.toFixed(0), angle: +v.angle.toFixed(0), nom });
  }
  const stations = elements
    .filter((e) => e.type === 'node' && e.tags?.name && e.lat !== undefined && e.lon !== undefined)
    .map((e) => { const [x, y] = proj({ lat: e.lat!, lon: e.lon! }); return { x: +x.toFixed(0), y: +y.toFixed(0), nom: e.tags!.name }; })
    .filter((s, i, t) => dedans([s.x, s.y], -24) && t.findIndex((u) => u.nom === s.nom) === i)
    .slice(0, 2);
  const ordre = { pietonne: 0, petite: 1, moyenne: 2, grande: 3 };
  rues.sort((a, b) => ordre[a.classe] - ordre[b.classe]);
  return { source: 'osm', rues, etiquettes, stations, point: { x: +cx.toFixed(0), y: +cy.toFixed(0) } };
}

/** Plan d'accès du cabinet, calculé une fois par build. */
export const planAcces: PlanAcces = await construire();
