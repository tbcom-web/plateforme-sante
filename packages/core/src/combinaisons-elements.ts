// Images × fonds et combinaisons d'éléments (demande de Paul du 2026-10-08). Module PUR.
//
// 1. IMAGE × FOND : la même illustration / photo / héros sur deux fonds (FONDS_IMAGE), ou sur le même fond avec deux traitements
//    (TRAITEMENTS_IMAGE). Côtés de duel : `<clé>@fond=<id>` / `<clé>@traitement=<id>` (variantes de RENDU, comme
//    `<clé>@contraste=…` de bases-illustrations.ts : aucune source modifiée). Clé de combinaison apprise (assets) :
//    `image:<base>&surface:<id>` ou `image:<base>&traitement:<id>`, <base> = illustration de base (baseDeCle, héritage
//    base → variantes : une variante joue pour sa base).
// 2. COMBINAISONS D'ÉLÉMENTS : paires d'ingrédients qui se voient ensemble (PAIRES_ELEMENTS) ; même clé que les paires apprises
//    des recettes complètes (`<dimA>:<va>&<dimB>:<vb>`, clePaireHarmonie, plafond ±0,75 ★). Duels : dimension `paire:<a>:<b>`
//    (« . » écrit « _ » : contrainte de la colonne dimension_differente), clé apprise de chaque côté rangée dans ses ingrédients
//    atelier (`paire=<clé>` : duels_apprentissage ne renvoie pas la composition)
//    (les deux valeurs changent, rien d'autre, jamais de nouvelle règle dure : varierPaire) ; tuile : clé
//    `composant:paire:<a>=<va>&<b>=<vb>` (assets_notes, type composant : aucune migration).
import { baseDeCle } from './bases-illustrations';
import { clePaireHarmonie, DIMENSIONS_HARMONIE, ecrireDimension, lireDimension, NOMS_DIMENSIONS_HARMONIE, nomValeurHarmonie, valeursDimensionHarmonie, violationsDures, type CompositionHarmonie, type ContexteHarmonie, type DimensionHarmonie } from './harmonie';
import type { Duel } from './duels';
import type { Asset } from './assets';

// ---------------------------------------------------------------------------------------------------------------
// Image × fond
// ---------------------------------------------------------------------------------------------------------------

export const FONDS_IMAGE = [
  { id: 'blanc', nom: 'Blanc' }, { id: 'gamme', nom: 'Fond de la gamme' }, { id: 'teinte', nom: 'Teinte douce' },
  { id: 'aplat', nom: 'Aplat d’accent' }, { id: 'degrade', nom: 'Dégradé' },
] as const;
export const TRAITEMENTS_IMAGE = [
  { id: 'aucun', nom: 'Sans traitement', filtre: 'none' }, { id: 'doux', nom: 'Adouci', filtre: 'saturate(0.8) brightness(1.05)' },
  { id: 'contraste', nom: 'Plus contrasté', filtre: 'contrast(1.18) saturate(1.1)' }, { id: 'nb', nom: 'Noir et blanc', filtre: 'grayscale(1) contrast(1.05)' },
] as const;
export type AxeImage = 'fond' | 'traitement';

/** Fond CSS d'un fond d'image pour une gamme (couleurs de la gamme : fond, fondDoux, accent) */
export function fondImageCss(id: string, g: { fond: string; fondDoux: string; accent: string }): string {
  switch (id) {
    case 'gamme': return g.fond;
    case 'teinte': return g.fondDoux;
    case 'aplat': return g.accent;
    case 'degrade': return `linear-gradient(160deg, ${g.fondDoux} 0%, ${g.accent} 140%)`;
    default: return '#ffffff';
  }
}
export const filtreImage = (id: string) => TRAITEMENTS_IMAGE.find((t) => t.id === id)?.filtre ?? 'none';

/** Côté de duel : clé de rendu `<clé>@fond=<id>` */
export const cleImageRendu = (cle: string, axe: AxeImage, id: string) => `${cle}@${axe}=${id}`;
export function lireImageRendu(cle: string): { cle: string; axe: AxeImage; id: string } | null {
  const m = /^(.+)@(fond|traitement)=([a-z-]+)$/.exec(cle);
  return m ? { cle: m[1], axe: m[2] as AxeImage, id: m[3] } : null;
}
/** Clé de combinaison apprise : `image:<base>&surface:<id>` (fond) ou `image:<base>&traitement:<id>` */
export function cleImageFond(cle: string, axe: AxeImage, id: string): string {
  return `image:${baseDeCle(cle) ?? cle}&${axe === 'fond' ? 'surface' : 'traitement'}:${id}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Combinaisons d'éléments
// ---------------------------------------------------------------------------------------------------------------

/** Paires d'ingrédients qui se voient ensemble (dimensions d'harmonie) */
export const PAIRES_ELEMENTS: readonly (readonly [DimensionHarmonie, DimensionHarmonie])[] = ([
  ['v.soins-forme', 'style'], ['v.accueil', 'v.entete-anim'], ['menu.ordinateur', 'police'], ['details.jeu', 'structure'],
  ['v.accueil', 'police'], ['style', 'structure'], ['v.portraits', 'v.accueil'],
] as [DimensionHarmonie, DimensionHarmonie][]).filter(([a, b]) => DIMENSIONS_HARMONIE.includes(a) && DIMENSIONS_HARMONIE.includes(b));

export const dimensionPaire = (a: string, b: string) => `paire:${a.replace('.', '_')}:${b.replace('.', '_')}`;
export function lireDimensionPaire(d: string | null | undefined): [string, string] | null {
  if (!d?.startsWith('paire:')) return null;
  const [a, b, ...reste] = d.slice(6).split(':');
  return a && b && !reste.length ? [a.replace('_', '.'), b.replace('_', '.')] : null;
}
/** Ingrédient atelier qui porte la clé apprise d'un côté : `paire=<dimA>:<va>&<dimB>:<vb>` */
export function ingredientPaire(x: CompositionHarmonie, a: string, b: string): string | null {
  const va = lireDimension(x, a), vb = lireDimension(x, b);
  return va && vb ? `paire=${clePaireHarmonie(a, va, b, vb)}` : null;
}

/** Libellé d'une paire : « Forme des cartes × Style des illustrations » */
export const nomPaire = (a: string, b: string) => `${NOMS_DIMENSIONS_HARMONIE[a] ?? a} × ${NOMS_DIMENSIONS_HARMONIE[b] ?? b}`;

/**
 * Variante d'une composition où les DEUX dimensions de la paire changent, et elles seules (lecture de toutes les dimensions
 * d'harmonie), sans nouvelle violation dure ; `reparer` : garde-fous du core (reparerComposition). Base rendue si impossible.
 */
export function varierPaire<T extends CompositionHarmonie>(x: T, a: string, b: string, r: () => number, opts: { contexte?: ContexteHarmonie | null; reparer?: (y: T) => T; essais?: number } = {}): T {
  const avant = new Set(violationsDures(x, opts.contexte).map((v) => v.code));
  const va = lireDimension(x, a), vb = lireDimension(x, b);
  const la = valeursDimensionHarmonie(a).filter((v) => v !== va), lb = valeursDimensionHarmonie(b).filter((v) => v !== vb);
  if (!la.length || !lb.length) return x;
  for (let i = 0; i < (opts.essais ?? 24); i++) {
    let y = ecrireDimension(ecrireDimension(x, a, la[Math.floor(r() * la.length)]), b, lb[Math.floor(r() * lb.length)]);
    if (opts.reparer) y = opts.reparer(y);
    const changees = DIMENSIONS_HARMONIE.filter((d) => lireDimension(y, d) !== lireDimension(x, d));
    if (changees.length !== 2 || !changees.includes(a) || !changees.includes(b)) continue;
    if (violationsDures(y, opts.contexte).some((v) => !avant.has(v.code))) continue;
    return y;
  }
  return x;
}

/** Clé apprise d'un côté (composition stockée dans les ingrédients du duel) */
function clePaireDuCote(composition: unknown, a: string, b: string): string | null {
  if (!composition || typeof composition !== 'object') return null;
  const x = composition as CompositionHarmonie;
  if (!x.sections || !x.visuels) return null;
  const va = lireDimension(x, a), vb = lireDimension(x, b);
  return va && vb ? clePaireHarmonie(a, va, b, vb) : null;
}

/** Paires apprises des duels de combinaisons (Bradley-Terry via un ajusteur passé en paramètre : duels-compositions.ts) */
export function matchsPaires(duels: readonly Duel[]): { a: string | null; b: string | null; resultat: Duel['resultat']; appareil?: string | null }[] {
  const l: { a: string | null; b: string | null; resultat: Duel['resultat']; appareil?: string | null }[] = [];
  for (const d of duels) {
    const p = lireDimensionPaire(d.dimension);
    if (!p) continue;
    const cote = (i: Duel['aIngredients']) => i.atelier?.find((k) => k.startsWith('paire='))?.slice(6) ?? clePaireDuCote(i.composition, p[0], p[1]);
    l.push({ a: cote(d.aIngredients), b: cote(d.bIngredients), resultat: d.resultat, appareil: d.appareil });
  }
  return l;
}

/** Clé de la tuile : `composant:paire:<a>=<va>&<b>=<vb>` */
export const cleAssetPaire = (a: string, va: string, b: string, vb: string) => `composant:paire:${a}=${va}&${b}=${vb}`;
export function lireClePaire(cle: unknown): { a: string; va: string; b: string; vb: string } | null {
  if (typeof cle !== 'string' || !cle.startsWith('composant:paire:')) return null;
  const m = /^([a-z.-]+)=([^&]+)&([a-z.-]+)=([^&]+)$/.exec(cle.slice('composant:paire:'.length));
  if (!m) return null;
  const [, a, va, b, vb] = m;
  if (!PAIRES_ELEMENTS.some(([x, y]) => x === a && y === b)) return null;
  if (!valeursDimensionHarmonie(a).includes(va) || !valeursDimensionHarmonie(b).includes(vb)) return null;
  return { a, va, b, vb };
}
export const libellePaire = (p: { a: string; va: string; b: string; vb: string }) =>
  `${NOMS_DIMENSIONS_HARMONIE[p.a] ?? p.a} « ${nomValeurHarmonie(p.a, p.va)} » + ${NOMS_DIMENSIONS_HARMONIE[p.b] ?? p.b} « ${nomValeurHarmonie(p.b, p.vb)} »`;

/** Toutes les combinaisons notables (tuile « Combinaisons ») */
export function toutesPairesElements(): { cle: string; titre: string }[] {
  return PAIRES_ELEMENTS.flatMap(([a, b]) => valeursDimensionHarmonie(a).flatMap((va) => valeursDimensionHarmonie(b).map((vb) => {
    const p = { a, va, b, vb };
    return { cle: cleAssetPaire(a, va, b, vb), titre: libellePaire(p) };
  })));
}

/** Composition qui montre une combinaison notée (les deux valeurs posées) */
export function poserPaire<T extends CompositionHarmonie>(x: T, cle: string): T {
  const p = lireClePaire(cle);
  return p ? ecrireDimension(ecrireDimension(x, p.a, p.va), p.b, p.vb) : x;
}

/** Notes de la tuile → paires apprises (moitié de l'effet, ±0,5 ★) */
export function pairesElementsDesNotes(effets: Readonly<Record<string, number>>): Record<string, number> {
  const r: Record<string, number> = {};
  for (const [k, e] of Object.entries(effets)) {
    const p = lireClePaire(k);
    if (p) { const v = Math.round(Math.max(-0.5, Math.min(0.5, 0.5 * e)) * 1000) / 1000; if (v) r[clePaireHarmonie(p.a, p.va, p.b, p.vb)] = v; }
  }
  return r;
}

// ---------------------------------------------------------------------------------------------------------------
// Tuile « Images × fonds » : clé notable `effets:image@<fond>:<clé de l'image>` (type effets : aucune migration ; jamais lue
// comme une variante de l'illustration : baseDeCle ne la découpe pas)
// ---------------------------------------------------------------------------------------------------------------

export const cleAssetImageFond = (cle: string, fond: string) => `effets:image@${fond}:${cle}`;
export function lireCleImageFond(cle: unknown): { cle: string; fond: string } | null {
  if (typeof cle !== 'string') return null;
  const m = /^effets:image@([a-z-]+):([a-z]+:[^\s@]+)$/.exec(cle);
  return m && FONDS_IMAGE.some((f) => f.id === m[1]) ? { fond: m[1], cle: m[2] } : null;
}

/** Une image par illustration de base (héros, dessins) et les photos, chacune sur chaque fond */
export function inventaireImagesFonds(assets: readonly Asset[], maxPhotos = 12): Asset[] {
  const vues = new Set<string>();
  const sources = assets.filter((a) => {
    if (a.type !== 'heros' && a.type !== 'dessin' && a.type !== 'photo') return false;
    const b = baseDeCle(a.cle) ?? a.cle;
    if (vues.has(b)) return false;
    vues.add(b);
    return true;
  });
  const photos = sources.filter((a) => a.type === 'photo').slice(0, maxPhotos);
  return [...sources.filter((a) => a.type !== 'photo'), ...photos].flatMap((a) => FONDS_IMAGE.map((f) => ({
    ...a, cle: cleAssetImageFond(a.cle, f.id), type: 'effets' as const, titre: `${a.titre} sur ${f.nom.toLowerCase()}`, detail: 'Image × fond',
    source: 'packages/core/src/combinaisons-elements.ts', statutParDefaut: 'a_revoir' as const, rendu: { kind: 'studio' as const, cle: cleAssetImageFond(a.cle, f.id) },
  })));
}

/** Notes de la tuile → clés apprises image × fond (assets : `image:<base>&surface:<fond>`), moitié de l'effet, ±0,5 ★ */
export function imagesFondsDesNotes(effets: Readonly<Record<string, number>>): Record<string, number> {
  const r: Record<string, number> = {};
  for (const [k, e] of Object.entries(effets)) {
    const x = lireCleImageFond(k);
    if (x) { const v = Math.round(Math.max(-0.5, Math.min(0.5, 0.5 * e)) * 1000) / 1000; if (v) r[cleImageFond(x.cle, 'fond', x.fond)] = v; }
  }
  return r;
}
