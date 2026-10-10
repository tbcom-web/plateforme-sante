// RÉSUMÉ DES NOTES pour la page « Donner mon avis » (/admin/retours, perf vague 2, 2026-10-10) : au volume ×10 (20 000 notes),
// la page envoyait ~2 Mo de notes au navigateur à chaque ouverture, seulement pour en tirer des compteurs et l'état de chaque clé.
// Le serveur envoie maintenant un RÉSUMÉ par clé, et le navigateur y ajoute ses notes du moment (données depuis l'ouverture).
// Les résultats sont IDENTIQUES à ceux calculés sur la liste complète (retours-resume.test.ts, jeux aléatoires) :
// - etatsNotes(notesAvecBases(avecReevaluations(notes, reev))) : chaque clé est un pli sur ses notes ; le pli se résume par
//   nombre, somme, min, max et la « chaîne des records » (première note, puis chaque note de date STRICTEMENT plus récente) ; deux
//   résumés se combinent exactement (la chaîne du second ne garde que ses records plus récents que le dernier du premier).
// - notesElements, clesAvecSignal : sommes et nombres par clé, clés dans l'ordre d'apparition.
// - serieAvis : nombre d'avis par jour (heure de Paris).
// - « déjà notée dans cette version » : couples (clé, empreinte).
// Module pur.

import { baseDeCle } from './bases-illustrations';
import { avecReevaluations, type Reevaluation } from './tranches';
import { jourParis } from './essai';
import type { EtatNotesAsset } from './retours';
import { finaliserNotesElements, type NotesElements } from './qualite';

export type NotePourResume = { cle: string; note: number; empreinte?: string | null; le?: string | null };

/** Record de la chaîne : [date (ou ''), note, empreinte (null si absente)] */
type Record_ = [string, number, string | null];
/** Résumé d'un pli : nombre, somme, min, max, chaîne des records */
export type PliNotes = { n: number; s: number; min: number; max: number; ch: Record_[] };

const pliVide = (): PliNotes => ({ n: 0, s: 0, min: 0, max: 0, ch: [] });
function plier(p: PliNotes, x: NotePourResume, empreinte: string | null | undefined) {
  const le = x.le ?? '';
  if (!p.n) { p.n = 1; p.s = x.note; p.min = x.note; p.max = x.note; p.ch.push([le, x.note, empreinte ?? null]); return; }
  p.n++;
  p.s += x.note;
  p.min = Math.min(p.min, x.note);
  p.max = Math.max(p.max, x.note);
  if (le > p.ch[p.ch.length - 1][0]) p.ch.push([le, x.note, empreinte ?? null]);
}
/** a puis b (dans cet ordre) */
function combiner(a: PliNotes | undefined, b: PliNotes | undefined): PliNotes | undefined {
  if (!a?.n) return b?.n ? b : a;
  if (!b?.n) return a;
  const dernier = a.ch[a.ch.length - 1][0];
  return { n: a.n + b.n, s: a.s + b.s, min: Math.min(a.min, b.min), max: Math.max(a.max, b.max), ch: [...a.ch, ...b.ch.filter((r) => r[0] > dernier)] };
}
/** État d'une clé (même objet que etatsNotes : empreinte gardée si le record suivant n'en a pas) */
function etatDuPli(p: PliNotes): EtatNotesAsset & { le: string } {
  let empreinte: string | null = p.ch[0][2];
  for (let i = 1; i < p.ch.length; i++) empreinte = p.ch[i][2] ?? empreinte;
  const d = p.ch[p.ch.length - 1];
  return { n: p.n, empreinte, min: p.min, max: p.max, le: d[0], derniere: d[1], somme: p.s };
}

/** Plis par clé : notes de la clé (o) et copies des notes de ses variantes (c, empreinte nulle : notesAvecBases) */
function plisParCle(notes: readonly NotePourResume[]): Map<string, { o?: PliNotes; c?: PliNotes }> {
  const m = new Map<string, { o?: PliNotes; c?: PliNotes }>();
  for (const x of notes) {
    const e = m.get(x.cle) ?? {};
    plier(e.o ??= pliVide(), x, x.empreinte);
    m.set(x.cle, e);
  }
  const bases = new Map<string, string | null>();
  for (const x of notes) {
    let b = bases.get(x.cle);
    if (b === undefined) { b = baseDeCle(x.cle); bases.set(x.cle, b); }
    if (!b) continue;
    const e = m.get(b) ?? {};
    plier(e.c ??= pliVide(), { ...x, cle: b }, null);
    m.set(b, e);
  }
  return m;
}

/** Pli à plat pour l'envoi : [n, somme, min, max, date1, note1, empreinte1, date2, …] */
export type PliPlat = (string | number | null)[];
const aplatir = (p: PliNotes | undefined): PliPlat | 0 => (p?.n ? [p.n, p.s, p.min, p.max, ...p.ch.flat()] : 0);
function deplier(x: PliPlat | 0 | undefined): PliNotes | undefined {
  if (!x) return undefined;
  const ch: Record_[] = [];
  for (let i = 4; i < x.length; i += 3) ch.push([x[i] as string, x[i + 1] as number, x[i + 2] as string | null]);
  return { n: x[0] as number, s: x[1] as number, min: x[2] as number, max: x[3] as number, ch };
}

/**
 * Une entrée par clé : [clé, pli de ses notes (après réévaluations), pli des notes de ses variantes, somme et nombre des notes
 * valides (notesElements, toutes notes), empreintes notées (null : sans empreinte)]. Clés notées d'abord, dans l'ordre
 * d'apparition (clesAvecSignal), puis les bases seulement notées par leurs variantes (aucune empreinte).
 */
export type EntreeResume = [string, PliPlat | 0, PliPlat | 0, number, number, (string | null)[]];
export type ResumeNotesAssets = {
  /** Nombre de notes */
  total: number;
  cles: EntreeResume[];
  /** Avis par jour (heure de Paris) */
  jours: Record<string, number>;
};

const noteValide = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5;

/** Avis par jour (heure de Paris), dates vides ignorées (serieAvis) */
export function compterJours(dates: readonly (string | null | undefined)[], dans: Record<string, number> = {}): Record<string, number> {
  // Jour de Paris mémorisé par heure UTC (dates ISO en UTC : « …Z » ou « …+00:00 », depuis 2000) : le décalage de Paris ne change
  // qu'à une heure UTC pleine (01:00, heure d'été), donc toutes les dates d'une même heure UTC tombent le même jour à Paris.
  // 20 000 dates : ~30 ms de formatage Intl évités (retours-resume.test.ts : identique à jourParis date par date)
  const parHeure = new Map<string, string>();
  for (const d of dates) {
    if (!d) continue;
    let j: string | undefined;
    const utc = d.length >= 20 && (d.endsWith('Z') || d.endsWith('+00:00')) && d[4] === '-' && d[10] === 'T' && d >= '2000';
    if (utc) { const h = d.slice(0, 13); j = parHeure.get(h); if (j === undefined) { j = jourParis(d); parHeure.set(h, j); } } else j = jourParis(d);
    dans[j] = (dans[j] ?? 0) + 1;
  }
  return dans;
}

/** Résumé des notes (côté serveur), réévaluations appliquées comme sur la page */
export function resumerNotesAssets(notes: readonly NotePourResume[], reev: readonly Reevaluation[] = []): ResumeNotesAssets {
  const plis = plisParCle(avecReevaluations(notes, reev));
  const propres = new Map<string, { s: number; n: number; v: Set<string | null> }>();
  for (const x of notes) {
    const e = propres.get(x.cle) ?? { s: 0, n: 0, v: new Set<string | null>() };
    e.v.add(x.empreinte ?? null);
    if (noteValide(x.note)) { e.s += x.note; e.n++; }
    propres.set(x.cle, e);
  }
  const cles: EntreeResume[] = [];
  for (const [k, e] of propres) { const p = plis.get(k); cles.push([k, aplatir(p?.o), aplatir(p?.c), e.s, e.n, [...e.v]]); }
  for (const [k, p] of plis) if (!propres.has(k)) cles.push([k, aplatir(p.o), aplatir(p.c), 0, 0, []]);
  return { total: notes.length, cles, jours: compterJours(notes.map((x) => x.le)) };
}

/** Index du résumé par clé (à garder tant que le résumé ne change pas) */
export type IndexResume = Map<string, EntreeResume>;
export const indexerResume = (r: ResumeNotesAssets): IndexResume => new Map(r.cles.map((e) => [e[0], e]));

/**
 * États par clé = etatsNotes(notesAvecBases(avecReevaluations([...locales, ...notes du résumé], reev))) : `locales` sont les
 * notes données depuis l'ouverture de la page (plus récentes d'abord, devant la liste du serveur comme avant).
 */
export function etatsDepuisResume(r: ResumeNotesAssets, locales: readonly NotePourResume[] = [], reev: readonly Reevaluation[] = []): Map<string, EtatNotesAsset> {
  const loc = plisParCle(avecReevaluations(locales, reev));
  const m = new Map<string, EtatNotesAsset>();
  const srv = new Map(r.cles.map(([k, o, c]) => [k, { o: deplier(o), c: deplier(c) }]));
  for (const k of new Set([...loc.keys(), ...srv.keys()])) {
    const l = loc.get(k), s = srv.get(k);
    const p = combiner(combiner(combiner(l?.o, s?.o), l?.c), s?.c);
    if (p?.n) m.set(k, etatDuPli(p));
  }
  return m;
}

/** notesElements([...locales, ...notes du résumé]) */
export function elementsDepuisResume(r: ResumeNotesAssets, locales: readonly NotePourResume[] = []): NotesElements {
  const acc = new Map<string, { s: number; n: number }>();
  for (const l of locales) {
    if (!l?.cle || !noteValide(l.note)) continue;
    const a = acc.get(l.cle) ?? { s: 0, n: 0 };
    a.s += l.note; a.n++;
    acc.set(l.cle, a);
  }
  for (const [k, , , s, n] of r.cles) { if (!n) continue; const a = acc.get(k) ?? { s: 0, n: 0 }; a.s += s; a.n += n; acc.set(k, a); }
  return finaliserNotesElements(acc);
}

/** clesAvecSignal([...locales, ...notes du résumé]) (même ordre) */
export const clesDepuisResume = (r: ResumeNotesAssets, locales: readonly { cle: string }[] = []) => new Set([...locales.map((l) => l.cle), ...r.cles.filter((e) => e[5].length).map((e) => e[0])]);

/** Une note porte-t-elle sur cette clé dans cette version (empreinte) ? */
export function versionNotee(r: ResumeNotesAssets | IndexResume, locales: readonly NotePourResume[], cle: string, empreinte: string | null | undefined): boolean {
  const e = empreinte ?? null;
  if (locales.some((n) => n.cle === cle && (n.empreinte ?? null) === e)) return true;
  const x = r instanceof Map ? r.get(cle) : r.cles.find((y) => y[0] === cle);
  return Boolean(x?.[5].includes(e));
}
