// ZONE D'UN CABINET (demande de Paul du 2026-10-10 : « argument fréquent de la commerciale : le nombre élevé de nouveaux praticiens
// installés à proximité depuis XX années, sans compter ceux de la même adresse ; et le nombre de podologues par habitant par rapport à
// la moyenne nationale »). Pur, sans import : le script de synchro l'importe tel quel (prospection-score.ts l'utilise).
//
// Rayon de 10 km autour du centre de la commune du cabinet (centres et populations : API Géo de l'État, geo.api.gouv.fr, avec les
// arrondissements de Paris, Lyon et Marseille, codes du RPPS). Pour chaque situation libérale active :
//  - nouveaux podologues installés dans le rayon depuis 1 an et depuis 3 ans (date INSEE d'ouverture du cabinet, à défaut arrivée au
//    RPPS), SANS ceux de la même adresse ni le praticien lui-même : borne basse (une partie des praticiens n'est pas datée) ;
//  - densité : podologues libéraux pour 10 000 habitants dans le rayon, comparée à la moyenne nationale.

export type Commune = { lat: number; lon: number; population: number };
export type SituationZone = {
  cle: string;
  rpps: string;
  code_commune?: string | null;
  adresse_cle?: string | null;
  mode_exercice?: string | null;
  disparu_le?: string | null;
  siret_cree_le?: string | null;
  apparu_le?: string | null;
};
export type ZoneCabinet = {
  rayonKm: number;
  /** Nouveaux podologues dans le rayon (hors même adresse et hors le praticien) */
  nouveaux1an: number;
  nouveaux3ans: number;
  /** Podologues libéraux pour 10 000 habitants dans le rayon */
  densite: number;
  densiteNationale: number;
  /** densite / densiteNationale */
  rapport: number;
  habitants: number;
  podologues: number;
};

/** Communes « mères » remplacées par leurs arrondissements (le RPPS code Paris, Lyon et Marseille par arrondissement) */
export const COMMUNES_A_ARRONDISSEMENTS = new Set(['75056', '69123', '13055']);

const distanceKm = (a: Commune, b: Commune) => {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
};
const moinsAns = (aujourdhui: string, ans: number) => `${Number(aujourdhui.slice(0, 4)) - ans}${aujourdhui.slice(4, 10)}`;
const estLiberalActif = (s: SituationZone) => /^lib/i.test(s.mode_exercice ?? '') && !s.disparu_le;

/** Zones de toutes les situations libérales actives : clé de situation → zone */
export function calculerZones(situations: readonly SituationZone[], communes: ReadonlyMap<string, Commune>, aujourdhui: string, rayonKm = 10): Map<string, ZoneCabinet> {
  const actives = situations.filter((s) => estLiberalActif(s) && s.code_commune && communes.has(s.code_commune));
  const il1an = moinsAns(aujourdhui, 1), il3ans = moinsAns(aujourdhui, 3);
  const dateInstallation = (s: SituationZone) => s.siret_cree_le ?? s.apparu_le ?? null;

  // Par commune : praticiens distincts, et nouveaux (1 an, 3 ans)
  const parCommune = new Map<string, { tous: Set<string>; n1: Set<string>; n3: Set<string> }>();
  for (const s of actives) {
    const c = parCommune.get(s.code_commune!) ?? { tous: new Set(), n1: new Set(), n3: new Set() };
    c.tous.add(s.rpps);
    const d = dateInstallation(s);
    if (d && d >= il3ans) c.n3.add(s.rpps);
    if (d && d >= il1an) c.n1.add(s.rpps);
    parCommune.set(s.code_commune!, c);
  }
  // Par adresse : nouveaux de la même adresse, à retirer (confrères du même cabinet)
  const parAdresse = new Map<string, { n1: Set<string>; n3: Set<string> }>();
  for (const s of actives) {
    if (!s.adresse_cle) continue;
    const a = parAdresse.get(s.adresse_cle) ?? { n1: new Set(), n3: new Set() };
    const d = dateInstallation(s);
    if (d && d >= il3ans) a.n3.add(s.rpps);
    if (d && d >= il1an) a.n1.add(s.rpps);
    parAdresse.set(s.adresse_cle, a);
  }

  // Densité nationale : podologues libéraux actifs / population (communes « mères » à arrondissements exclues : pas de double compte)
  let populationTotale = 0;
  for (const [code, c] of communes) if (!COMMUNES_A_ARRONDISSEMENTS.has(code)) populationTotale += c.population;
  const totalPodologues = new Set(actives.map((s) => s.rpps)).size;
  const densiteNationale = populationTotale ? (totalPodologues / populationTotale) * 10_000 : 0;

  // Voisinage de chaque commune où exerce un podologue (grille de 0,2° pour ne comparer que les communes proches)
  const cellule = (c: Commune) => `${Math.floor(c.lat / 0.2)}|${Math.floor(c.lon / 0.2)}`;
  const grille = new Map<string, string[]>();
  for (const [code, c] of communes) {
    if (COMMUNES_A_ARRONDISSEMENTS.has(code)) continue;
    const k = cellule(c);
    grille.set(k, [...(grille.get(k) ?? []), code]);
  }
  const voisinage = new Map<string, { habitants: number; tous: Set<string>; n1: Set<string>; n3: Set<string> }>();
  for (const code of parCommune.keys()) {
    const o = communes.get(code)!;
    const [la, lo] = cellule(o).split('|').map(Number);
    const v = { habitants: 0, tous: new Set<string>(), n1: new Set<string>(), n3: new Set<string>() };
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const autre of grille.get(`${la + i}|${lo + j}`) ?? []) {
        const c = communes.get(autre)!;
        if (distanceKm(o, c) > rayonKm) continue;
        v.habitants += c.population;
        const p = parCommune.get(autre);
        if (p) { p.tous.forEach((r) => v.tous.add(r)); p.n1.forEach((r) => v.n1.add(r)); p.n3.forEach((r) => v.n3.add(r)); }
      }
    }
    voisinage.set(code, v);
  }

  const zones = new Map<string, ZoneCabinet>();
  for (const s of actives) {
    const v = voisinage.get(s.code_commune!)!;
    const memeAdresse = s.adresse_cle ? parAdresse.get(s.adresse_cle) : undefined;
    const sans = (ens: Set<string>, local?: Set<string>) => [...ens].filter((r) => r !== s.rpps && !(local?.has(r))).length;
    const densite = v.habitants ? (v.tous.size / v.habitants) * 10_000 : 0;
    zones.set(s.cle, {
      rayonKm,
      nouveaux1an: sans(v.n1, memeAdresse?.n1),
      nouveaux3ans: sans(v.n3, memeAdresse?.n3),
      densite: Math.round(densite * 10) / 10,
      densiteNationale: Math.round(densiteNationale * 10) / 10,
      rapport: densiteNationale ? Math.round((densite / densiteNationale) * 100) / 100 : 0,
      habitants: v.habitants,
      podologues: v.tous.size,
    });
  }
  return zones;
}
