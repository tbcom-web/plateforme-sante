// KITS MULTI-VISUELS (demande de Paul du 2026-10-08 : « les kits d'images peuvent aussi contenir des illustrations taguées avec
// semelles, etc. ; idem pour les animations »). Même logique en deux couches que kits-images.ts (photos), étendue à tous les visuels
// de l'inventaire (assets.ts : dessins, traits continus, héros, matériel, styles expérimentaux, kit sport, pictos / icônes,
// animations) — aucune liste figée : un nouveau visuel de l'inventaire entre dans le vivier dès que Paul le rattache.
//
// COUCHE 1 — vivier curé d'un sujet (estCureVisuel) : visuel rattaché au sujet par Paul (assets_sujets : sujet ajouté, ou hashtag
// #<sujet>) ou à l'un des soins du sujet (#<slug>), jamais exclu (moyenne ou dernière note ≤ 2 ★ — note HÉRITÉE de la base pour
// une variante, bases-illustrations.ts —, retiré, à retravailler, statut hérité de la base compris).
// COUCHE 2 — kit (composerKitVisuel) : UN seul style d'illustration (registre le mieux fourni et noté, ou imposé), le héros illustré,
// une illustration pour la page sujet et par soin (étiquetée #<slug> ou rattachée au soin), une icône par soin et pour les infos
// pratiques, l'animation d'en-tête et les animations de soin. Une variante n'est jamais un doublon de sa base (une seule par base).
// Animations : jamais tant que leurs images de base ne sont pas validées pour un PRATICIEN ; pour Paul, visibles avec « à valider ».
// Praticiens : seulement les visuels validés. Suggestions pour compléter (suggestionsVisuels) : même ordre que pour les photos.
// Pur.

import { sujetsDuVisuel } from './sujets-visuels';
import { baseDeCle, statutEffectif } from './bases-illustrations';
import { clesImagesExclues, imageExclue } from './contexte-images';
import { etatAnimation, animationDeCle } from './animations-sources';
import { libelleSujetKit } from './kits-images';
import type { SurchargesSujets, TypeAsset } from './assets-poids';
import type { StatutIllustration } from './illustrations';
import { DESSINS_PODOLOGIE } from './univers';
import { ANIMATIONS } from './packs';

export const FAMILLES_KIT = ['photo', 'illustration', 'icone', 'animation'] as const;
export type FamilleKit = (typeof FAMILLES_KIT)[number];
export const LIBELLES_FAMILLES_KIT: Record<FamilleKit, { un: string; plusieurs: string; titre: string }> = {
  photo: { un: 'photo', plusieurs: 'photos', titre: 'Photos' },
  illustration: { un: 'illustration', plusieurs: 'illustrations', titre: 'Illustrations' },
  icone: { un: 'icône', plusieurs: 'icônes', titre: 'Icônes' },
  animation: { un: 'animation', plusieurs: 'animations', titre: 'Animations' },
};

/** Famille d'une clé d'inventaire (null : ni photo, ni illustration, ni icône, ni animation) */
export function familleDeCle(cle: string): FamilleKit | null {
  const t = cle.slice(0, cle.indexOf(':'));
  if (t === 'photo') return 'photo';
  if (t === 'picto') return 'icone';
  if (t === 'animation') return 'animation';
  if (t === 'dessin' || t === 'ligne' || t === 'heros' || t === 'materiel' || t === 'biblio') return 'illustration';
  return null;
}
/** Registre (style) d'une illustration : `dessin:<nom>:<registre>`, `heros:<sujet>:<registre>`, `materiel:<id>:<registre>`, `ligne:` → ligne */
export function registreDeCle(cle: string): string | null {
  const p = cle.split(':');
  if (p[0] === 'ligne') return 'ligne';
  if ((p[0] === 'dessin' || p[0] === 'heros' || p[0] === 'materiel') && p.length === 3) return p[2];
  return null;
}

/** Un visuel candidat : clé, type et soins / sujets par défaut (Asset de l'inventaire) */
export type VisuelCandidat = { cle: string; type: TypeAsset; soins: readonly string[]; titre?: string };
export type NotesVisuels = Record<string, { m: number; n: number }>;

export type DonneesVisuels = {
  visuels: readonly VisuelCandidat[];
  surcharges?: SurchargesSujets | null;
  hashtags?: Readonly<Record<string, readonly string[]>> | null;
  notes?: NotesVisuels | null;
  exclues?: ReadonlySet<string>;
  /** Statuts de revue (illustrations_statuts) : retiré / à retravailler excluent, « valide » ouvre aux praticiens */
  statuts?: Readonly<Record<string, StatutIllustration>> | null;
  /** Soins de chaque sujet (#<slug> rattache au sujet) */
  soins?: Readonly<Record<string, readonly string[]>>;
};

/** Notes brutes (moyenne, nombre) des visuels à partir des lignes d'apprentissage des assets */
export function notesVisuels(lignes: readonly { cle: string; note?: number | null }[]): NotesVisuels {
  const acc = new Map<string, { s: number; n: number }>();
  for (const l of lignes) {
    if (!l?.cle || !familleDeCle(l.cle) || !Number.isInteger(l.note) || (l.note as number) < 1 || (l.note as number) > 5) continue;
    const a = acc.get(l.cle) ?? { s: 0, n: 0 };
    a.s += l.note as number; a.n++;
    acc.set(l.cle, a);
  }
  return Object.fromEntries([...acc.entries()].sort().map(([k, a]) => [k, { m: Math.round((a.s / a.n) * 100) / 100, n: a.n }]));
}

/** Note d'un visuel : la sienne, à défaut celle de sa base (une variante hérite de la note de son illustration de base) */
export function noteHeritee(cle: string, notes?: NotesVisuels | null): number | null {
  const n = notes?.[cle]?.m;
  if (typeof n === 'number') return n;
  const b = baseDeCle(cle);
  const nb = b ? notes?.[b]?.m : undefined;
  return typeof nb === 'number' ? nb : null;
}

const tagsDe = (cle: string, d: Pick<DonneesVisuels, 'hashtags'>) => (d.hashtags?.[cle] ?? []).map((t) => t.replace(/^#/, ''));

/** Visuel exclu : image exclue (≤ 2 ★, retirée…), statut retiré / à retravailler (hérité), note héritée ≤ 2 ★ */
export function visuelExclu(cle: string, d: DonneesVisuels): boolean {
  const b = baseDeCle(cle);
  if (imageExclue(cle, d.exclues) || (b && imageExclue(b, d.exclues))) return true;
  const st = d.statuts ? statutEffectif(cle, d.statuts) : undefined;
  if (st === 'retire' || st === 'a_retravailler') return true;
  const n = noteHeritee(cle, d.notes);
  return n !== null && n <= 2;
}

/** Couche 1 : visuel rattaché par Paul au sujet (ou à l'un de ses soins), non exclu */
export function estCureVisuel(v: VisuelCandidat, sujet: string, d: DonneesVisuels): boolean {
  if (visuelExclu(v.cle, d) || /posture|trajectoire/.test(v.cle)) return false;
  const s = d.surcharges?.[v.cle];
  if (s?.retraits.includes(sujet)) return false;
  const tags = tagsDe(v.cle, d);
  return Boolean(s?.ajouts.includes(sujet) || tags.includes(sujet) || (d.soins?.[sujet] ?? []).some((x) => tags.includes(x)));
}

/** Validé (praticiens) : statut « valide », le sien ou celui de sa base ; animation : tous ses ingrédients validés */
export function visuelValide(cle: string, d: DonneesVisuels): boolean {
  if (familleDeCle(cle) === 'animation') return !animationEnAttenteDe(cle, d);
  return (d.statuts ? statutEffectif(cle, d.statuts) : undefined) === 'valide';
}
const animationEnAttenteDe = (cle: string, d: DonneesVisuels) => { const a = animationDeCle(cle); return a ? etatAnimation(a, d.statuts ?? {}).enAttente : false; };

export type VisuelVivier = { cle: string; famille: FamilleKit; registre: string | null; note: number | null; aValider: boolean; base: string; soins: readonly string[]; tags: string[] };

/** Vivier curé d'un sujet, par famille (photos comprises si elles sont dans `visuels`), mieux notés d'abord */
export function vivierVisuels(sujet: string, d: DonneesVisuels): Record<FamilleKit, VisuelVivier[]> {
  const r: Record<FamilleKit, VisuelVivier[]> = { photo: [], illustration: [], icone: [], animation: [] };
  for (const v of d.visuels) {
    const f = familleDeCle(v.cle);
    if (!f || !estCureVisuel(v, sujet, d)) continue;
    r[f].push({ cle: v.cle, famille: f, registre: registreDeCle(v.cle), note: noteHeritee(v.cle, d.notes), aValider: !visuelValide(v.cle, d), base: baseDeCle(v.cle) ?? v.cle, soins: v.soins, tags: tagsDe(v.cle, d) });
  }
  for (const f of FAMILLES_KIT) r[f].sort((a, b) => (b.note ?? 0) - (a.note ?? 0) || (a.cle < b.cle ? -1 : 1));
  return r;
}

/** « Semelles : 4 illustrations, 7 icônes, 1 animation, 2 photos » (`photos` : nombre de photos du vivier, kits-images.ts) */
export function etatVivierVisuels(sujet: string, d: DonneesVisuels, photos?: number): string {
  const v = vivierVisuels(sujet, d);
  const n = (f: FamilleKit, k: number) => `${k} ${k > 1 ? LIBELLES_FAMILLES_KIT[f].plusieurs : LIBELLES_FAMILLES_KIT[f].un}`;
  return `${libelleSujetKit(sujet)} : ${n('illustration', v.illustration.length)}, ${n('icone', v.icone.length)}, ${n('animation', v.animation.length)}, ${n('photo', photos ?? v.photo.length)}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Couche 2 : le kit
// ---------------------------------------------------------------------------------------------------------------

export type ElementKitVisuel = { emplacement: string; cle: string; famille: FamilleKit; note: number | null; aValider: boolean };
export type KitVisuel = {
  sujet: string;
  /** Style d'illustration du kit (un seul) */
  registre: string | null;
  heros: ElementKitVisuel | null;
  illustrations: ElementKitVisuel[];
  icones: ElementKitVisuel[];
  animations: ElementKitVisuel[];
  trous: string[];
};

/** Registre le mieux fourni et noté du vivier (illustrations) ; null sans illustration */
export function registreDuVivier(illus: readonly VisuelVivier[]): string | null {
  const g = new Map<string, number>();
  for (const v of illus) if (v.registre) g.set(v.registre, (g.get(v.registre) ?? 0) + 1 + 0.5 * ((v.note ?? 3) - 3));
  return [...g.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null;
}

const pourSoin = (v: VisuelVivier, slug: string) => v.tags.includes(slug) || v.soins.includes(slug);
const INFOS = ['horaires', 'acces', 'infos', 'contact', 'adresse', 'rendez-vous', 'telephone'];

/**
 * Kit multi-visuels d'un sujet. `praticien` : seulement les visuels validés (animations : ingrédients validés). `registre` : style
 * imposé (style choisi par la recette), sinon celui du vivier. `soins` : soins du sujet (par défaut d.soins[sujet]).
 */
export function composerKitVisuel(sujet: string, d: DonneesVisuels, opts: { praticien?: boolean; registre?: string | null; soins?: readonly string[] } = {}): KitVisuel {
  const v = vivierVisuels(sujet, d);
  const ok = (x: VisuelVivier) => !opts.praticien || !x.aValider;
  const registre = opts.registre ?? registreDuVivier(v.illustration.filter(ok));
  const soins = opts.soins ?? d.soins?.[sujet] ?? [];
  const bases = new Set<string>();
  const el = (emplacement: string, x: VisuelVivier): ElementKitVisuel => { bases.add(x.base); return { emplacement, cle: x.cle, famille: x.famille, note: x.note, aValider: x.aValider }; };
  const libre = (x: VisuelVivier) => ok(x) && !bases.has(x.base);
  const illus = v.illustration.filter((x) => ok(x) && (!registre || x.registre === registre || x.registre === null));
  const trous: string[] = [];
  const nom = libelleSujetKit(sujet);
  const h = illus.find((x) => x.cle.startsWith('heros:') && libre(x));
  const heros = h ? el('accueil', h) : null;
  if (!heros && sujet !== 'general') trous.push(`${nom} : aucun héros illustré curé${registre ? ` (style ${registre})` : ''}.`);
  const illustrations: ElementKitVisuel[] = [];
  // Soins d'abord (illustration rattachée au soin), puis la page sujet avec ce qui reste
  for (const s of soins) {
    const x = illus.find((y) => !y.cle.startsWith('heros:') && pourSoin(y, s) && libre(y));
    if (x) illustrations.push(el(`soin:${s}`, x));
    else trous.push(`${nom} : aucune illustration curée pour ${s.replace(/-/g, ' ')}.`);
  }
  const page = illus.find((x) => !x.cle.startsWith('heros:') && libre(x));
  if (page) illustrations.unshift(el('page-sujet', page));
  const icones: ElementKitVisuel[] = [];
  for (const s of soins) { const x = v.icone.find((y) => pourSoin(y, s) && libre(y)); if (x) icones.push(el(`soin:${s}`, x)); }
  const infos = v.icone.find((y) => y.tags.some((t) => INFOS.includes(t)) && libre(y));
  if (infos) icones.push(el('infos', infos));
  for (const x of v.icone) { if (icones.length >= Math.max(4, soins.length + 1)) break; if (libre(x)) icones.push(el('autre', x)); }
  if (!icones.length) trous.push(`${nom} : aucune icône curée.`);
  const anims = v.animation.filter(ok);
  const animations: ElementKitVisuel[] = [];
  const ent = anims.find((x) => !soins.some((s) => pourSoin(x, s))) ?? anims[0];
  if (ent) animations.push(el('entete', ent));
  for (const s of soins) { const x = anims.find((y) => pourSoin(y, s) && !animations.some((a) => a.cle === y.cle)); if (x) animations.push(el(`soin:${s}`, x)); }
  return { sujet, registre, heros, illustrations, icones, animations, trous };
}

// ---------------------------------------------------------------------------------------------------------------
// Compléter le kit : suggestions et rattachement des visuels déjà bien notés
// ---------------------------------------------------------------------------------------------------------------

export const VOISINS_VISUELS: Readonly<Record<string, readonly string[]>> = {
  enfant: ['general', 'sport'], sport: ['semelles', 'general'], senior: ['pedicurie', 'diabete', 'general'], diabete: ['pedicurie', 'senior', 'general'],
  ongles: ['pedicurie', 'general'], semelles: ['sport', 'general'], pedicurie: ['ongles', 'diabete', 'senior', 'general'], general: [],
};

export type VisuelARattacher = { cle: string; famille: FamilleKit; note: number; sujets: string[]; sujetPropose: string };

/** Visuels notés ≥ 4 ★ (note propre), non exclus, avec un sujet implicite (inventaire) sans être curés ; `sujet` : pour ce sujet seulement */
export function visuelsARattacher(d: DonneesVisuels, sujet?: string | null, familles: readonly FamilleKit[] = ['illustration', 'icone', 'animation']): VisuelARattacher[] {
  const r: VisuelARattacher[] = [];
  for (const v of d.visuels) {
    const f = familleDeCle(v.cle);
    const note = d.notes?.[v.cle]?.m;
    if (!f || !familles.includes(f) || typeof note !== 'number' || note < 4 || visuelExclu(v.cle, d)) continue;
    const implicites = sujetsDuVisuel(v, d.surcharges).sujets.filter((s) => s !== 'posture');
    const cure = implicites.some((s) => estCureVisuel(v, s, d));
    const l = (sujet ? implicites.filter((s) => s === sujet) : cure ? [] : implicites).filter((s) => !estCureVisuel(v, s, d));
    if (!l.length) continue;
    const tri = [...l].sort((a, b) => Number(a === 'general') - Number(b === 'general'));
    r.push({ cle: v.cle, famille: f, note, sujets: tri, sujetPropose: tri[0] });
  }
  return r.sort((a, b) => b.note - a.note || (a.cle < b.cle ? -1 : 1));
}

export type SuggestionVisuel = { cle: string; famille: FamilleKit; note: number | null; rang: 1 | 2 | 3 | 4 | 5 | 6; libelle: string; voisin: string | null; aRattacher: boolean; aValider: boolean };

/**
 * Suggestions d'un emplacement pour une famille (illustration, icône, animation), du vivier curé SEULEMENT : (1) ≥ 4 ★ étiquetées pour
 * l'emplacement, (2) ≥ 3,5 ★, (3) non notées, (4) < 3,5 ★ ; vivier épuisé : (6) bien notées à rattacher ; sinon (5) voisin. Hors
 * visuels déjà dans le kit (et leurs bases) et refus « Pas pour ici » (`refus` : `<hashtag de l'emplacement>|<clé>`).
 */
export function suggestionsVisuels(kit: KitVisuel, emplacement: string, famille: FamilleKit, d: DonneesVisuels, refus: ReadonlySet<string> = new Set(), n = 8): SuggestionVisuel[] {
  const dans = new Set([kit.heros, ...kit.illustrations, ...kit.icones, ...kit.animations].filter(Boolean).map((e) => baseDeCle(e!.cle) ?? e!.cle));
  const tag = emplacement.startsWith('soin:') ? emplacement.slice(5) : emplacement;
  const refuse = (cle: string) => refus.has(`${tag}|${cle}`);
  const de = (sujet: string, voisin: string | null): SuggestionVisuel[] => vivierVisuels(sujet, d)[famille]
    .filter((x) => !dans.has(x.base) && !refuse(x.cle) && (!kit.registre || famille !== 'illustration' || x.registre === kit.registre || x.registre === null))
    .map((x) => {
      const et = x.tags.includes(tag) || x.soins.includes(tag);
      const rang = voisin ? 5 : x.note !== null && x.note >= 4 && et ? 1 : x.note !== null && x.note >= 3.5 ? 2 : x.note === null ? 3 : 4;
      return { cle: x.cle, famille, note: x.note, rang, voisin, aRattacher: false, aValider: x.aValider, libelle: voisin ? `Sujet voisin : ${libelleSujetKit(voisin)}` : ['', 'Notée ≥ 4 ★, étiquetée pour cet emplacement', 'Notée ≥ 3,5 ★', 'Pas encore notée', 'Notée moins de 3,5 ★'][rang] };
    });
  let l = de(kit.sujet, null);
  if (!l.length) l = visuelsARattacher(d, kit.sujet, [famille]).filter((x) => !dans.has(baseDeCle(x.cle) ?? x.cle) && !refuse(x.cle))
    .map((x) => ({ cle: x.cle, famille, note: x.note, rang: 6 as const, voisin: null, aRattacher: true, aValider: !visuelValide(x.cle, d), libelle: `Notée ${String(x.note).replace('.', ',')} ★, pas encore rattachée à ${libelleSujetKit(kit.sujet)}` }));
  if (!l.length) { const vues = new Set<string>(); l = (VOISINS_VISUELS[kit.sujet] ?? []).flatMap((s) => de(s, s)).filter((x) => !vues.has(x.cle) && Boolean(vues.add(x.cle))); }
  return l.sort((a, b) => a.rang - b.rang || (b.note ?? 0) - (a.note ?? 0) || (a.cle < b.cle ? -1 : 1)).slice(0, n);
}

/** Forme compacte du kit illustré pour les rendus (registre contexte-images.ts) : dessin par soin, animation d'en-tête */
export function kitVisuelCompact(k: KitVisuel): { registre?: string; dessins?: Record<string, string>; animation?: string; heros?: string } {
  const dessins: Record<string, string> = {};
  for (const e of k.illustrations) if (e.emplacement.startsWith('soin:') && e.cle.startsWith('dessin:') && (DESSINS_PODOLOGIE as readonly string[]).includes(e.cle.split(':')[1])) dessins[e.emplacement.slice(5)] = e.cle.split(':')[1];
  const anim = k.animations.find((a) => a.emplacement === 'entete' && (ANIMATIONS as readonly string[]).includes(a.cle.slice('animation:'.length)));
  return {
    ...(k.registre ? { registre: k.registre } : {}), ...(Object.keys(dessins).length ? { dessins } : {}),
    ...(anim ? { animation: anim.cle.slice('animation:'.length) } : {}), ...(k.heros ? { heros: k.heros.cle } : {}),
  };
}

/** Emplacements visuels vides d'un kit : illustration (page sujet, chaque soin), icône (chaque soin, infos pratiques), animation d'en-tête */
export function emplacementsVisuelsAFaire(k: KitVisuel, soins: readonly string[]): { emplacement: string; famille: FamilleKit; libelle: string }[] {
  const r: { emplacement: string; famille: FamilleKit; libelle: string }[] = [];
  const a = (l: readonly ElementKitVisuel[], e: string) => l.some((x) => x.emplacement === e);
  const nomSoin = (s: string) => s.replace(/-/g, ' ');
  if (!k.heros && k.sujet !== 'general') r.push({ emplacement: 'accueil', famille: 'illustration', libelle: 'Héros illustré' });
  if (!a(k.illustrations, 'page-sujet')) r.push({ emplacement: 'page-sujet', famille: 'illustration', libelle: 'Illustration de la page sujet' });
  for (const s of soins) if (!a(k.illustrations, `soin:${s}`)) r.push({ emplacement: `soin:${s}`, famille: 'illustration', libelle: `Illustration : ${nomSoin(s)}` });
  for (const s of soins) if (!a(k.icones, `soin:${s}`)) r.push({ emplacement: `soin:${s}`, famille: 'icone', libelle: `Icône : ${nomSoin(s)}` });
  if (!a(k.icones, 'infos')) r.push({ emplacement: 'infos', famille: 'icone', libelle: 'Icône des infos pratiques' });
  if (!a(k.animations, 'entete')) r.push({ emplacement: 'entete', famille: 'animation', libelle: 'Animation d’en-tête' });
  return r;
}

/**
 * Kit illustré d'un site praticien (construction, apps/sites) à partir des lignes lues dans Supabase : visuels VALIDÉS seulement
 * (statuts de revue), animations aux ingrédients validés seulement, jamais d'élément exclu ; forme compacte (dessin par soin,
 * animation d'en-tête).
 */
export function kitVisuelSite(e: {
  sujet: string;
  soins: readonly string[];
  lignesAssets: readonly { cle_asset: string; note: number | null; statut: string | null }[];
  surcharges?: SurchargesSujets | null;
  hashtags?: Readonly<Record<string, readonly string[]>> | null;
  statuts: readonly { cle: string; statut: string }[];
  visuels: readonly VisuelCandidat[];
}): ReturnType<typeof kitVisuelCompact> {
  const lignes = e.lignesAssets.map((l) => ({ cle: l.cle_asset, note: l.note, statut: l.statut }));
  const statuts = Object.fromEntries(e.statuts.filter((s) => ['valide', 'a_revoir', 'a_retravailler', 'retire'].includes(s.statut)).map((s) => [s.cle, s.statut as StatutIllustration]));
  const d: DonneesVisuels = { visuels: e.visuels, surcharges: e.surcharges, hashtags: e.hashtags, notes: notesVisuels(lignes), exclues: clesImagesExclues(lignes), statuts, soins: { [e.sujet]: e.soins } };
  return kitVisuelCompact(composerKitVisuel(e.sujet, d, { praticien: true, soins: e.soins }));
}
