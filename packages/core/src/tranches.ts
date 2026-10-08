// Éléments et combinaisons TRANCHÉS (règle de Paul du 2026-10-08 : « si un élément a été noté 1 étoile, il n'apparaît plus (idem
// pour une combinaison exacte). Idem pour un élément ou une combinaison noté 5 étoiles, je ne veux plus qu'il apparaisse, sinon on
// répète tout le temps les mêmes choses »). Règle centrale, appliquée partout où Paul évalue (Donner mon avis, tri, recettes
// complètes, atelier, duels, kits) et, pour les refusés, dans toutes les compositions générées. Documentation : docs/retours.md.
//
//   REFUSÉ  : dernière note de Paul = 1 ★, ou moyenne ≤ 1,5 ★ ; combinaison exacte notée 1 ★ ; duel « les deux sont mauvais »
//             (les deux compositions). Ne réapparaît plus NULLE PART : ni à évaluer, ni dans une composition (Studio, atelier,
//             recettes, duels, kits, /creer, sites ; registre contexte-images.ts : exclusions).
//   FAVORI  : dernière note = 5 ★, ou « Garder ». N'est plus PROPOSÉ À L'ÉVALUATION, mais reste tiré en composition (Favoris
//             d'abord inchangé). Duels : seulement en « Champion » face à un élément JAMAIS jugé (≤ 10 % des duels).
//   NOTÉ    : 2 à 4 ★ ; ne revient en évaluation qu'après tous les jamais notés, ou s'il a changé (nouvelle version, empreinte).
//   RÉÉVALUER (page « Éléments tranchés », migration 0041) : les notes antérieures à la réévaluation sont ignorées pour la règle ;
//   l'élément revient dans la file jusqu'à sa prochaine note.
// Pur.

export const SEUIL_REFUS_MOYENNE = 1.5;
export const PART_CHAMPION = 0.1;

export type EtatTranche = 'refuse' | 'favori' | 'note' | 'nouveau';
export type SignalTranche = { cle: string; note?: number | null; le?: string | null; garder?: boolean };
export type Reevaluation = { cle: string; le: string };
export type Tranches = { refuses: ReadonlySet<string>; favoris: ReadonlySet<string>; notes: ReadonlySet<string> };
export const TRANCHES_VIDES: Tranches = { refuses: new Set(), favoris: new Set(), notes: new Set() };

/** Signaux postérieurs à la dernière réévaluation de leur clé (signal sans date : gardé seulement sans réévaluation) */
export function avecReevaluations<T extends { cle: string; le?: string | null }>(signaux: readonly T[], reev: readonly Reevaluation[] = []): T[] {
  if (!reev.length) return [...signaux];
  const derniere = new Map<string, string>();
  for (const r of reev) if (!derniere.has(r.cle) || r.le > derniere.get(r.cle)!) derniere.set(r.cle, r.le);
  return signaux.filter((s) => { const d = derniere.get(s.cle); return !d || (Boolean(s.le) && s.le! > d); });
}

/**
 * États tranchés à partir des signaux (notes 1-5, « Garder »). Dernière note : celle de date la plus récente ; sans date, la PREMIÈRE
 * ligne de la clé (journaux lus plus récents d'abord).
 */
export function tranchesDepuisSignaux(signaux: readonly SignalTranche[], reev: readonly Reevaluation[] = []): Tranches {
  const acc = new Map<string, { s: number; n: number; derniere: number | null; le: string; garder: boolean }>();
  for (const x of avecReevaluations(signaux, reev)) {
    const note = Number.isInteger(x.note) && (x.note as number) >= 1 && (x.note as number) <= 5 ? (x.note as number) : null;
    if (note === null && !x.garder) continue;
    const a = acc.get(x.cle) ?? { s: 0, n: 0, derniere: null, le: '', garder: false };
    if (note !== null) {
      a.s += note; a.n++;
      const le = x.le ?? '';
      if (a.derniere === null || (le && le > a.le)) { a.derniere = note; a.le = le || a.le; }
    }
    if (x.garder) a.garder = true;
    acc.set(x.cle, a);
  }
  const refuses = new Set<string>(), favoris = new Set<string>(), notes = new Set<string>();
  for (const [k, a] of acc) {
    if (a.derniere === 1 || (a.n && a.s / a.n <= SEUIL_REFUS_MOYENNE)) refuses.add(k);
    else if (a.derniere === 5 || a.garder) favoris.add(k);
    else notes.add(k);
  }
  return { refuses, favoris, notes };
}

/** Fusion de plusieurs ensembles de tranches (assets, combinaisons, recettes, kits, duels) */
export function fusionnerTranches(...l: readonly Tranches[]): Tranches {
  const refuses = new Set(l.flatMap((t) => [...t.refuses]));
  const favoris = new Set(l.flatMap((t) => [...t.favoris]).filter((k) => !refuses.has(k)));
  const notes = new Set(l.flatMap((t) => [...t.notes]).filter((k) => !refuses.has(k) && !favoris.has(k)));
  return { refuses, favoris, notes };
}

/** Duels « les deux sont mauvais » : les deux compositions (ou éléments) sont refusées comme combinaisons exactes */
export function tranchesDepuisDuels(duels: readonly { aCle: string; bCle: string; resultat: string; le?: string | null }[], reev: readonly Reevaluation[] = []): Tranches {
  const s: SignalTranche[] = duels.filter((d) => d.resultat === 'mauvais').flatMap((d) => [{ cle: d.aCle, note: 1, le: d.le }, { cle: d.bCle, note: 1, le: d.le }]);
  return tranchesDepuisSignaux(s, reev);
}

export const etatTranche = (cle: string, t: Tranches): EtatTranche => (t.refuses.has(cle) ? 'refuse' : t.favoris.has(cle) ? 'favori' : t.notes.has(cle) ? 'note' : 'nouveau');
/** Déjà tranché (1 ★ ou 5 ★) : plus jamais proposé à l'évaluation */
export const dejaTranche = (cle: string, t: Tranches) => t.refuses.has(cle) || t.favoris.has(cle);
/** Refusé : jamais dans une composition */
export const estRefuse = (cle: string, t: Tranches) => t.refuses.has(cle);

/**
 * File d'évaluation : sans les éléments tranchés ; les jamais notés d'abord, puis les modifiés depuis leur note (`change`), puis
 * les notés 2-4 ★ (ordre d'origine gardé dans chaque palier).
 */
export function filtreAEvaluer<T>(items: readonly T[], cle: (x: T) => string, t: Tranches, change?: (x: T) => boolean): T[] {
  const l = items.filter((x) => !dejaTranche(cle(x), t));
  const rang = (x: T) => (etatTranche(cle(x), t) === 'nouveau' ? 0 : change?.(x) ? 1 : 2);
  return l.map((x, i) => ({ x, i, r: rang(x) })).sort((a, b) => a.r - b.r || a.i - b.i).map((o) => o.x);
}

/** « Il reste N éléments jamais notés » */
export const resteJamaisNotes = (cles: readonly string[], t: Tranches) => cles.filter((k) => etatTranche(k, t) === 'nouveau').length;

/**
 * Candidats d'un duel (photos, illustrations) selon les tranches : jamais un refusé ; les favoris (5 ★) seulement en « Champion »
 * face à un élément JAMAIS jugé (ni noté, ni joué en duel), environ `PART_CHAMPION` des duels. `r` : tirage [0, 1).
 */
export function candidatsDuelTranches<T extends { cle: string; sujets?: readonly string[] }>(candidats: readonly T[], t: Tranches, juges: ReadonlySet<string>, r: () => number):
  { candidats: T[]; champion: { a: T; b: T } | null } {
  const sansRefus = candidats.filter((c) => !t.refuses.has(c.cle));
  const evaluables = sansRefus.filter((c) => !t.favoris.has(c.cle));
  if (r() < PART_CHAMPION) {
    const favoris = sansRefus.filter((c) => t.favoris.has(c.cle));
    const nouveaux = evaluables.filter((c) => etatTranche(c.cle, t) === 'nouveau' && !juges.has(c.cle));
    for (const n of nouveaux) {
      const f = favoris.find((x) => !x.sujets || !n.sujets || x.sujets.some((s) => n.sujets!.includes(s)));
      if (f) return { candidats: evaluables, champion: { a: f, b: n } };
    }
  }
  return { candidats: evaluables, champion: null };
}

/** Clés jugées en duel (au moins un duel), pour « jamais jugé » */
export const clesJugeesEnDuel = (duels: readonly { aCle: string; bCle: string }[]) => new Set(duels.flatMap((d) => [d.aCle, d.bCle]));
