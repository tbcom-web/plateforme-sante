// Apprentissage à partir des notes des ASSETS (/admin/illustrations « Bibliothèque & retours », migration 0027).
//
// Paul note chaque asset (picto, dessin, trait continu, matériel, animation, héros de thème, élément de bibliothèque, photo,
// modèle de structure, gamme de couleurs) de 1 à 5 étoiles, sous sa clé stable (`heros:sport:releve`, `photo:sport-course`,
// `gamme:cobalt`, `modele:clair-pratique`…). Comme pour l'atelier (atelier-poids.ts), la moyenne d'un asset est LISSÉE vers
// la moyenne générale tant qu'il a peu de notes :
//
//   μ        = moyenne brute de toutes les notes d'assets
//   m(a)     = (somme des notes de a + K · μ) / (n(a) + K)        K = 4
//   effet(a) = m(a) − μ                                            (en étoiles, arrondi au millième ; 0 n'est pas stocké)
//
// Les STATUTS de revue (0021) comptent aussi : « Retiré » = pénalité forte (−3, l'asset est écarté autant que les garde-fous
// le permettent), « À retravailler » = pénalité légère (−0,75). « Validé » et « À revoir » ne changent rien.
//
// Bonus d'une proposition (bonusAssets, en étoiles, borné à [−3 ; +1,5]) :
//   0,8 × héros du sujet n° 1 dans le registre de la proposition (illustrations seulement)
// + 0,6 × animation d'accueil + 0,6 × gamme + 0,6 × modèle de structure
// + 0,5 × moyenne des photos montrées (style « photos ») ou 0,3 × moyenne des dessins notés du registre (autres styles)
// propositions.ts l'ajoute au bonus de l'atelier : il réordonne et écarte, sans jamais lever un garde-fou (exclusions par
// sujet, diabète sans rouge, posture jamais, contrastes AA, diversité des lots).
//
// APPAREIL (migration 0034, rendu-mobile.ts) : chaque note de choix compte avec le poids de l'appareil regardé (mobile 1,25,
// ordinateur et « les-deux » 1) dans les sommes ci-dessus (n(a) devient la somme des poids). Les notes antérieures, sans
// appareil, valent « les-deux » : résultats inchangés. Les retours « Rendu mobile » (adaptation téléphone) ne passent JAMAIS ici.
// Module pur, sans dépendance d'exécution (importé par propositions.ts et jeux-photos.ts).
//
// ILLUSTRATION DE BASE → VARIANTES (2026-10-08, bases-illustrations.ts) : les notes d'un dessin et de toutes ses variantes
// (registres, styles, trait continu, héros d'un thème…) forment un groupe noté sous la clé de base (`dessin:orthonyxie`) :
//   effet(base) = m(groupe) − μ ; effet(variante) = effet(base) + écart(variante),
//   écart = clamp((moy(variante) − moy(groupe)) · n(variante) / (n(variante) + K), ±0,5) — 0 sans note propre.
// scoreAsset lit l'effet de la clé, à défaut celui de sa base ; statut « Retiré » / « À retravailler » de la base valable pour
// ses variantes sauf statut propre (lu quand la source le fournit : sansHeritage).

import { baseDeCle, HERITAGE_VARIANTES } from './bases-illustrations';

/** Préfixes de clé (= type d'asset enregistré dans assets_notes.type) */
/**
 * … + studio de recettes (migration 0032) : `structure:<page>:<variantes>` (structure d'un type de page), `effets:<jeu>` (jeu
 * d'effets), `composant:<famille>:<variante>` (présentation d'un élément : horaires, plan d'accès, galerie, questions…).
 * … + habillage (migration 0036) : `typo:<axe>:<valeur>` (typographie, `typo:police:<paire>`), `details:<élément>:<valeur>`
 * (`details:jeu:<id>`), `menu:<axe>:<variante>` (menus ordinateur, téléphone, rendez-vous).
 */
export const TYPES_ASSET = ['picto', 'dessin', 'ligne', 'materiel', 'animation', 'heros', 'biblio', 'photo', 'modele', 'gamme', 'structure', 'effets', 'composant', 'typo', 'details', 'menu'] as const;
export type TypeAsset = (typeof TYPES_ASSET)[number];
export const estTypeAsset = (x: unknown): x is TypeAsset => typeof x === 'string' && (TYPES_ASSET as readonly string[]).includes(x);

/** Type d'une clé (`heros:sport:releve` → `heros`) ; inconnu → null */
export function typeDeCle(cle: string): TypeAsset | null {
  const t = cle.slice(0, Math.max(0, cle.indexOf(':')));
  return estTypeAsset(t) ? t : null;
}

/** Clé d'asset valide (même contrôle que la base : préfixe connu, sans espace, 200 caractères au plus) */
export const CLE_ASSET = /^[a-z]+:[^\s]{1,200}$/;
export const estCleAsset = (cle: unknown): cle is string => typeof cle === 'string' && CLE_ASSET.test(cle) && typeDeCle(cle) !== null;

/** Une ligne lue pour l'apprentissage : une note (1 à 5) ou un statut courant (note nulle) ; appareil regardé (0034) */
export type LigneAppriseAsset = { cle: string; note?: number | null; etiquettes?: readonly string[] | null; statut?: string | null; appareil?: string | null };

/** Poids d'une note selon l'appareil (mobile d'abord : 1,25 ; voir rendu-mobile.ts, POIDS_APPAREIL) */
const poidsNote = (a: unknown) => (a === 'mobile' ? 1.25 : 1);

/** Poids compacts (transmis au navigateur du praticien) : effets non nuls, statuts pénalisants seulement */
/**
 * Sujets ajoutés / retirés à la main par Paul (table assets_sujets, migration 0028 ; sujets-visuels.ts) : état courant par clé.
 * Un visuel retiré d'un sujet n'est plus proposé pour ce sujet (pénalité forte), un sujet ajouté le favorise un peu.
 */
export type SurchargesSujets = Record<string, { ajouts: string[]; retraits: string[] }>;

export type PoidsAssets = {
  n: number; moyenne: number; effets: Record<string, number>; statuts: Record<string, 'a_retravailler' | 'retire'>; sujets?: SurchargesSujets;
  /** Variantes avec un statut propre non pénalisant (« Validé », « À revoir ») : n'héritent pas du statut de leur base */
  sansHeritage?: string[];
};

export const LISSAGE_ASSETS = 4;
export const PENALITES_STATUT = { retire: -3, a_retravailler: -0.75 } as const;
/** Visuel retiré d'un sujet par Paul : même poids qu'un visuel « retiré » ; ajouté à un sujet : léger bonus */
export const EFFETS_SUJET = { retrait: -3, ajout: 0.5 } as const;
export const COEFS_ASSETS = { heros: 0.8, animation: 0.6, gamme: 0.6, modele: 0.6, photos: 0.5, dessins: 0.3, min: -3, max: 1.5 } as const;

const arrondi = (x: number, p = 1000) => Math.round(x * p) / p;
const noteValide = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;

/** n : nombre de notes ; poids : somme des poids d'appareil ; somme : somme pondérée des notes */
export type StatAsset = { cle: string; type: TypeAsset; n: number; poids: number; somme: number; moyenne: number; lissee: number; effet: number; etiquettes: Record<string, number> };

/** Statistiques par asset (synthèse et poids) */
export function statsAssets(lignes: readonly LigneAppriseAsset[]): { n: number; moyenne: number; cles: Map<string, StatAsset> } {
  const ok = lignes.filter((x) => noteValide(x.note) && estCleAsset(x.cle)) as (LigneAppriseAsset & { note: number })[];
  const n = ok.length;
  const poidsTotal = ok.reduce((s, x) => s + poidsNote(x.appareil), 0);
  const moyenne = n ? ok.reduce((s, x) => s + poidsNote(x.appareil) * x.note, 0) / poidsTotal : 0;
  const cles = new Map<string, StatAsset>();
  for (const x of ok) {
    let s = cles.get(x.cle);
    if (!s) { s = { cle: x.cle, type: typeDeCle(x.cle)!, n: 0, poids: 0, somme: 0, moyenne: 0, lissee: 0, effet: 0, etiquettes: {} }; cles.set(x.cle, s); }
    const w = poidsNote(x.appareil);
    s.n++;
    s.poids += w;
    s.somme += w * x.note;
    for (const e of new Set(x.etiquettes ?? [])) s.etiquettes[e] = (s.etiquettes[e] ?? 0) + 1;
  }
  for (const s of cles.values()) {
    s.moyenne = s.somme / s.poids;
    s.lissee = (s.somme + LISSAGE_ASSETS * moyenne) / (s.poids + LISSAGE_ASSETS);
    s.effet = arrondi(s.lissee - moyenne);
    if (Object.is(s.effet, -0)) s.effet = 0;
  }
  return { n, moyenne, cles };
}

/** Poids appris (déterministes quel que soit l'ordre des lignes) ; null si rien n'est appris. Héritage base → variantes : voir l'en-tête. */
export function poidsAssets(lignes: readonly LigneAppriseAsset[]): PoidsAssets | null {
  const { n, moyenne, cles } = statsAssets(lignes);
  const effets: Record<string, number> = {};
  // Groupes base → variantes : notes agrégées sous la clé de base (anciennes notes de variantes comprises)
  const groupes = new Map<string, { poids: number; somme: number; membres: StatAsset[] }>();
  const basesNotees = new Set([...cles.keys()].map(baseDeCle).filter((b): b is string => Boolean(b)));
  for (const s of cles.values()) {
    const b = baseDeCle(s.cle) ?? (basesNotees.has(s.cle) ? s.cle : null);
    if (!b) continue;
    const g = groupes.get(b) ?? groupes.set(b, { poids: 0, somme: 0, membres: [] }).get(b)!;
    g.poids += s.poids; g.somme += s.somme; g.membres.push(s);
  }
  const K = HERITAGE_VARIANTES.lissage, P = HERITAGE_VARIANTES.plafondEcart;
  const enGroupe = new Set<string>();
  for (const [b, g] of groupes) {
    const effetBase = arrondi((g.somme + K * moyenne) / (g.poids + K) - moyenne);
    const moyG = g.somme / g.poids;
    if (effetBase !== 0) effets[b] = effetBase;
    for (const m of g.membres) {
      enGroupe.add(m.cle);
      if (m.cle === b) continue;
      const ecart = Math.max(-P, Math.min(P, ((m.somme / m.poids) - moyG) * (m.poids / (m.poids + K))));
      const e = arrondi(effetBase + ecart);
      // Effet propre stocké même nul quand la base a un effet (sinon la variante reprendrait l'effet de sa base)
      if (e !== 0 || effetBase !== 0) effets[m.cle] = Object.is(e, -0) ? 0 : e;
    }
  }
  for (const k of [...cles.keys()].sort()) {
    if (enGroupe.has(k)) continue;
    const e = cles.get(k)!.effet;
    if (e !== 0) effets[k] = e;
  }
  const effetsTries: Record<string, number> = {};
  for (const k of Object.keys(effets).sort()) effetsTries[k] = effets[k];
  const statuts: PoidsAssets['statuts'] = {};
  const sansHeritage: string[] = [];
  for (const l of [...lignes].sort((a, b) => (a.cle < b.cle ? -1 : 1))) {
    if (!estCleAsset(l.cle)) continue;
    if (l.statut === 'retire' || l.statut === 'a_retravailler') statuts[l.cle] = l.statut;
    else if ((l.statut === 'valide' || l.statut === 'a_revoir') && baseDeCle(l.cle) && !sansHeritage.includes(l.cle)) sansHeritage.push(l.cle);
  }
  if (!n && !Object.keys(statuts).length) return null;
  return { n, moyenne: arrondi(moyenne), effets: effetsTries, statuts, ...(sansHeritage.length ? { sansHeritage } : {}) };
}

/** Effet appris d'une clé (sans statut) : le sien, à défaut celui de sa base (illustration de base → variantes) */
export function effetHerite(cle: string, poids: Pick<PoidsAssets, 'effets'> | null | undefined): number {
  if (!poids) return 0;
  if (poids.effets[cle] !== undefined) return poids.effets[cle];
  const b = baseDeCle(cle);
  return b ? poids.effets[b] ?? 0 : 0;
}

/** Statut pénalisant d'une clé : le sien, à défaut celui de sa base (sauf statut propre non pénalisant) */
export function statutAppris(cle: string, poids: PoidsAssets | null | undefined): 'a_retravailler' | 'retire' | undefined {
  if (!poids) return undefined;
  if (poids.statuts[cle]) return poids.statuts[cle];
  if (poids.sansHeritage?.includes(cle)) return undefined;
  const b = baseDeCle(cle);
  return b ? poids.statuts[b] : undefined;
}

/** Score d'un asset (en étoiles, relatif à la moyenne) : effet lissé + pénalité de statut ; 0 si inconnu */
export function scoreAsset(cle: string, poids: PoidsAssets | null | undefined): number {
  if (!poids) return 0;
  const st = statutAppris(cle, poids);
  return arrondi(effetHerite(cle, poids) + (st ? PENALITES_STATUT[st] : 0));
}

/** Moyenne des scores d'une liste de clés (les inconnues comptent 0) */
/** Score d'un asset pour un sujet donné : score général ± surcharge de sujet (retiré du sujet : -3 ; ajouté : +0,5) */
export function scoreAssetPourSujet(cle: string, sujet: string | null | undefined, poids: PoidsAssets | null | undefined): number {
  if (!poids) return 0;
  const s = sujet ? poids.sujets?.[cle] : undefined;
  const ajust = s ? (s.retraits.includes(sujet!) ? EFFETS_SUJET.retrait : s.ajouts.includes(sujet!) ? EFFETS_SUJET.ajout : 0) : 0;
  return arrondi(scoreAsset(cle, poids) + ajust);
}

/** Retiré par Paul de TOUS les sujets donnés (au moins un) */
export const retireDesSujets = (cle: string, sujets: readonly string[] | null | undefined, poids: PoidsAssets | null | undefined) =>
  Boolean(sujets?.length && poids?.sujets?.[cle] && sujets.every((x) => poids.sujets![cle].retraits.includes(x)));

export function scoreMoyen(cles: readonly string[], poids: PoidsAssets | null | undefined): number {
  if (!poids || !cles.length) return 0;
  return arrondi(cles.reduce((s, c) => s + scoreAsset(c, poids), 0) / cles.length);
}

/** Moyenne des scores des assets NOTÉS ou revus dont la clé passe le filtre (0 si aucun) */
export function scorePrefixe(poids: PoidsAssets | null | undefined, filtre: (cle: string) => boolean): number {
  if (!poids) return 0;
  const cles = [...new Set([...Object.keys(poids.effets), ...Object.keys(poids.statuts)])].filter(filtre);
  return cles.length ? scoreMoyen(cles, poids) : 0;
}

/** Clé d'une photo à partir de son URL : `/photos/sport-course.webp` → `photo:sport-course` ; stockage → `photo:banque/…` */
export function clePhoto(url: string): string | null {
  const integree = /^\/photos\/([a-z0-9-]{1,120})\.(webp|jpe?g|png|avif)$/.exec(url);
  if (integree) return `photo:${integree[1]}`;
  const i = url.indexOf('/storage/v1/object/public/photos/');
  if (i < 0) return null;
  const chemin = url.slice(i + '/storage/v1/object/public/photos/'.length).split('?')[0];
  const cle = `photo:${chemin}`;
  return chemin && !chemin.includes('..') && estCleAsset(cle) ? cle : null;
}

/** Ce qu'une proposition montre (ingrédients utiles à l'apprentissage des assets) */
export type AssetsProposition = {
  structure: string;
  gamme: string;
  style: string;
  registre: string;
  modeVisuel: string;
  animation: string | null;
  heros: string | null;
  /** URLs des photos montrées (style photos) */
  photos?: readonly string[];
  /** Sujet n° 1 de la proposition (thème) : surcharges de sujets de Paul (héros, photos) */
  sujet?: string | null;
};

/** Bonus d'une proposition selon les notes et statuts des assets qu'elle montre (en étoiles, borné) ; 0 sans poids */
export function bonusAssets(p: AssetsProposition, poids: PoidsAssets | null | undefined): number {
  if (!poids) return 0;
  const c = COEFS_ASSETS;
  let b = c.gamme * scoreAsset(`gamme:${p.gamme}`, poids) + c.modele * scoreAsset(`modele:${p.structure}`, poids);
  if (p.animation) b += c.animation * scoreAsset(`animation:${p.animation}`, poids);
  if (p.modeVisuel === 'photos') {
    const cles = (p.photos ?? []).map(clePhoto).filter((x): x is string => Boolean(x));
    b += c.photos * (cles.length ? cles.reduce((s, k) => s + scoreAssetPourSujet(k, p.sujet, poids), 0) / cles.length : 0);
  } else {
    if (p.heros) b += c.heros * scoreAssetPourSujet(`heros:${p.heros}:${p.registre}`, p.sujet ?? p.heros, poids);
    const r = p.registre;
    b += c.dessins * scorePrefixe(poids, (k) => (r === 'ligne' ? k.startsWith('ligne:') : k.startsWith('dessin:') && k.endsWith(`:${r}`)));
  }
  return arrondi(Math.min(c.max, Math.max(c.min, b)));
}

/** Poids reçus de l'extérieur (route, props) : forme vérifiée, valeurs bornées ; invalide → null */
export function normaliserPoidsAssets(v: unknown): PoidsAssets | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.n !== 'number' || !o.effets || typeof o.effets !== 'object') return null;
  const effets: Record<string, number> = {};
  for (const [k, e] of Object.entries(o.effets as Record<string, unknown>)) {
    if (typeof e === 'number' && Number.isFinite(e) && estCleAsset(k)) effets[k] = Math.max(-4, Math.min(4, e));
  }
  const statuts: PoidsAssets['statuts'] = {};
  for (const [k, s] of Object.entries((o.statuts && typeof o.statuts === 'object' ? o.statuts : {}) as Record<string, unknown>)) {
    if (estCleAsset(k) && (s === 'retire' || s === 'a_retravailler')) statuts[k] = s;
  }
  const sujets: SurchargesSujets = {};
  for (const [k, s] of Object.entries((o.sujets && typeof o.sujets === 'object' ? o.sujets : {}) as Record<string, { ajouts?: unknown; retraits?: unknown }>)) {
    const l = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string' && /^[a-z0-9-]{2,30}$/.test(y)).slice(0, 20) : []);
    if (estCleAsset(k) && s && typeof s === 'object') sujets[k] = { ajouts: l(s.ajouts), retraits: l(s.retraits) };
  }
  const sansHeritage = Array.isArray(o.sansHeritage) ? o.sansHeritage.filter((k): k is string => estCleAsset(k)).slice(0, 2000) : [];
  return { n: Math.max(0, Math.floor(o.n)), moyenne: typeof o.moyenne === 'number' ? o.moyenne : 0, effets, statuts, ...(Object.keys(sujets).length ? { sujets } : {}), ...(sansHeritage.length ? { sansHeritage } : {}) };
}

/**
 * Photos ordonnées de la mieux à la moins bien notée (ordre d'origine à score égal) ; les photos « retirées » sont
 * enlevées tant qu'il en reste au moins `min`. Sans poids : liste inchangée.
 */
export function ordonnerPhotos(urls: readonly string[], poids: PoidsAssets | null | undefined, min = 1, sujets?: readonly string[] | null): string[] {
  if (!poids) return [...urls];
  // `sujets` : sujets du site ; une photo retirée par Paul de tous ces sujets est traitée comme « retirée »
  const s = urls.map((u, i) => ({ u, i, k: clePhoto(u) })).map((x) => ({
    ...x, sc: x.k ? scoreAssetPourSujet(x.k, sujets?.[0], poids) : 0, retire: Boolean(x.k && (poids.statuts[x.k] === 'retire' || retireDesSujets(x.k, sujets, poids))),
  }));
  const gardees = s.filter((x) => !x.retire);
  const liste = gardees.length >= Math.min(min, s.length) ? gardees : s;
  return liste.sort((a, b) => b.sc - a.sc || a.i - b.i).map((x) => x.u);
}
