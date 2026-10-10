// NOUVEAUTÉS À NOTER (exigence de Paul du 2026-10-08 : « il faut absolument que tous les nouveaux "ingrédients" passent par le
// filtre de notation de base »). Documentation : docs/retours.md (« Nouveautés à noter »).
//
// 1. REGISTRE « DÉJÀ CONNU » (inventaire-connu.json, versionné) : clé unitaire de l'inventaire de notation → date de première
//    apparition (AAAA-MM-JJ). Mis à jour par `npm run inventaire:maj` (scripts/inventaire-maj.mjs : ajoute chaque clé absente
//    avec la date du jour) ; inventaire-connu.test.ts échoue tant qu'une clé de l'inventaire n'y est pas (npm run verifier).
//    Seuls les ingrédients UNITAIRES y sont (estIngredientUnitaire) : les combinaisons (structures de pages, police × palette,
//    paires d'éléments, images × fonds) ne sont jamais des nouveautés.
// 2. LOTS : les clés récentes (apparues depuis moins de JOURS_NOUVEAUTES jours) et JAMAIS notées (ni elles ni leur illustration
//    de base), hors « Retiré », sont groupées par famille et par date : « Animations d'en-tête empreintes · 10 · 08/10 ».
//    Identifiant d'un lot : `<famille>@<AAAA-MM-JJ>` ; lien direct /admin/retours?nouveautes=<lot> (ou =<famille> : toutes les
//    dates de la famille ; =tout : toutes les nouveautés). Une nouveauté notée sort de son lot.
// Pur (le JSON est importé à la construction).

import registreJson from './inventaire-connu.json';
import { baseDeCle } from './bases-illustrations';
import { NOMS_SECTIONS_VARIABLES } from './recettes';

export type RegistreInventaire = Readonly<Record<string, string>>;
export const REGISTRE_INVENTAIRE: RegistreInventaire = registreJson as RegistreInventaire;

/** Fenêtre des nouveautés (jours depuis la première apparition) */
export const JOURS_NOUVEAUTES = 30;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Clés de l'inventaire absentes du registre (à ajouter par npm run inventaire:maj) */
export const absentesDuRegistre = (cles: readonly string[], registre: RegistreInventaire = REGISTRE_INVENTAIRE) => cles.filter((k) => !DATE.test(registre[k] ?? ''));

/** Registre complété : chaque clé absente ajoutée avec `date` ; clés triées (diff lisible, fusions git sans conflit d'ordre) */
export function registreComplete(registre: RegistreInventaire, cles: readonly string[], date: string): Record<string, string> {
  if (!DATE.test(date)) throw new Error(`date invalide : ${date}`);
  const r: Record<string, string> = { ...registre };
  for (const k of cles) if (!DATE.test(r[k] ?? '')) r[k] = date;
  return Object.fromEntries(Object.keys(r).sort().map((k) => [k, r[k]]));
}

/** Jour (AAAA-MM-JJ) `n` jours avant `jour` */
export function joursAvant(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export type CleRecente = { cle: string; date: string };

/** Clés apparues depuis moins de `jours` jours (bornes : depuis `jour - jours + 1`, jusqu'à `jour`), plus récentes d'abord */
export function clesRecentes(jour: string, opts: { jours?: number; registre?: RegistreInventaire } = {}): CleRecente[] {
  const debut = joursAvant(jour, (opts.jours ?? JOURS_NOUVEAUTES) - 1);
  return Object.entries(opts.registre ?? REGISTRE_INVENTAIRE).filter(([, d]) => d >= debut && d <= jour).map(([cle, date]) => ({ cle, date }))
    .sort((a, b) => (a.date === b.date ? (a.cle < b.cle ? -1 : 1) : a.date < b.date ? 1 : -1));
}

// ---------------------------------------------------------------------------------------------------------------
// Familles de nouveautés (libellé des lots)
// ---------------------------------------------------------------------------------------------------------------

/** Règles de la plus précise à la plus générale (premier test vrai) */
const FAMILLES: readonly { id: string; libelle: string; test: (k: string) => boolean }[] = [
  // Analyse de la foulée (2026-10-10) : héros illustré, visuel animé, photo + données — remplace le coureur à rotules
  { id: 'analyse-course', libelle: 'Analyse de la foulée (course)', test: (k) => k === 'composant:entete-anim:pi-analyse-course' || k.startsWith('composant:trace-photo:analyse') || k.startsWith('dessin:analyse-course:') },
  { id: 'animations-pied', libelle: 'Animations du pied', test: (k) => k.startsWith('composant:entete-anim:pi-') || k === 'composant:sections:chevrons' },
  { id: 'entete-empreintes', libelle: 'Animations d’en-tête empreintes', test: (k) => k.startsWith('composant:entete-anim:em-') },
  { id: 'pictos-directions', libelle: 'Style d’icônes A/B/C/D', test: (k) => /^picto:.+@direction-[a-z]$/.test(k) || k.startsWith('picto:style-icones-') },
  { id: 'premiers-ecrans', libelle: 'Premiers écrans', test: (k) => k.startsWith('composant:accueil:') },
  { id: 'entete-anim', libelle: 'Animations d’en-tête', test: (k) => k.startsWith('composant:entete-anim:') },
  { id: 'univers-diabete', libelle: 'Univers diabète', test: (k) => /^(heros|dessin):diabete-/.test(k) },
  { id: 'kit-sports', libelle: 'Kit Sports', test: (k) => /^(dessin|ligne):sport-/.test(k) || k.startsWith('picto:sport-') },
  { id: 'traitements-photos', libelle: 'Traitements des photos', test: (k) => k.startsWith('effets:photos-') },
  { id: 'surfaces', libelle: 'Contrastes et fonds', test: (k) => k.startsWith('effets:surfaces-') },
  { id: 'effets', libelle: 'Jeux d’effets', test: (k) => k.startsWith('effets:') },
  { id: 'polices', libelle: 'Paires de polices', test: (k) => k.startsWith('typo:police:') },
  { id: 'typographies', libelle: 'Typographies', test: (k) => k.startsWith('typo:') },
  { id: 'details', libelle: 'Détails', test: (k) => k.startsWith('details:') },
  { id: 'menus', libelle: 'Menus', test: (k) => k.startsWith('menu:') },
  { id: 'pictos', libelle: 'Pictos', test: (k) => k.startsWith('picto:') },
  { id: 'heros', libelle: 'Héros de thème', test: (k) => k.startsWith('heros:') },
  { id: 'traits', libelle: 'Traits continus', test: (k) => k.startsWith('ligne:') },
  { id: 'materiel', libelle: 'Matériel', test: (k) => k.startsWith('materiel:') },
  { id: 'animations', libelle: 'Animations de soins', test: (k) => k.startsWith('animation:') },
  { id: 'bibliotheque', libelle: 'Bibliothèque', test: (k) => k.startsWith('biblio:') },
  { id: 'illustrations', libelle: 'Illustrations', test: (k) => k.startsWith('dessin:') },
  { id: 'photos', libelle: 'Photos', test: (k) => k.startsWith('photo:') },
  { id: 'gammes', libelle: 'Gammes de couleurs', test: (k) => k.startsWith('gamme:') },
  { id: 'modeles', libelle: 'Modèles de site', test: (k) => k.startsWith('modele:') },
];

/** Famille d'une clé : règles ci-dessus, sinon l'élément (`composant:<famille>`) ou la page (`structure:<page>`) */
export function familleNouveaute(cle: string): { id: string; libelle: string } {
  const f = FAMILLES.find((x) => x.test(cle));
  if (f) return { id: f.id, libelle: f.libelle };
  const [t, a] = cle.split(':');
  if ((t === 'composant' || t === 'structure') && a) return { id: a, libelle: NOMS_SECTIONS_VARIABLES[a] ?? a };
  return { id: t || 'autres', libelle: 'Autres éléments' };
}

// ---------------------------------------------------------------------------------------------------------------
// Lots à noter
// ---------------------------------------------------------------------------------------------------------------

export type LotNouveautes = { id: string; famille: string; libelle: string; date: string; cles: string[] };

/** « 08/10 » */
export const dateCourte = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/**
 * Lots des nouveautés JAMAIS notées : `recentes` (clesRecentes), restreintes aux clés présentes dans `connues` (inventaire chargé),
 * sans celles qui ont une note (ou dont l'illustration de base en a une : bases-illustrations.ts) ni celles « Retirées ».
 * Plus récents d'abord, puis par libellé.
 */
export function lotsNouveautes(
  recentes: readonly CleRecente[],
  opts: { notees: { has(cle: string): boolean }; connues?: { has(cle: string): boolean }; statuts?: Readonly<Record<string, string>> },
): LotNouveautes[] {
  const lots = new Map<string, LotNouveautes>();
  for (const { cle, date } of recentes) {
    if (opts.connues && !opts.connues.has(cle)) continue;
    if (opts.statuts?.[cle] === 'retire') continue;
    const b = baseDeCle(cle);
    if (opts.notees.has(cle) || (b && opts.notees.has(b))) continue;
    const f = familleNouveaute(cle);
    const id = `${f.id}@${date}`;
    const l = lots.get(id) ?? { id, famille: f.id, libelle: f.libelle, date, cles: [] };
    l.cles.push(cle);
    lots.set(id, l);
  }
  return [...lots.values()].sort((a, b) => (a.date === b.date ? a.libelle.localeCompare(b.libelle, 'fr') : a.date < b.date ? 1 : -1));
}

/** Lots désignés par le paramètre `?nouveautes=` : un lot exact (`famille@date`), une famille (toutes ses dates) ou `tout` */
export function lotsDuParametre(lots: readonly LotNouveautes[], parametre: string | null | undefined): LotNouveautes[] {
  const p = (parametre ?? '').trim();
  if (!p) return [];
  if (p === 'tout' || p === '1') return [...lots];
  return lots.filter((l) => l.id === p || l.famille === p);
}

/** Lien direct vers un lot (à envoyer à Paul après une livraison) */
export const lienNouveautes = (lot: string) => `/admin/retours?nouveautes=${encodeURIComponent(lot)}`;

/** Libellé d'un lot : « Animations d'en-tête empreintes · 10 · 08/10 » */
export const libelleLot = (l: Pick<LotNouveautes, 'libelle' | 'cles' | 'date'>) => `${l.libelle} · ${l.cles.length} · ${dateCourte(l.date)}`;
