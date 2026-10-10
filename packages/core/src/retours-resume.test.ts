import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clesDepuisResume, compterJours, elementsDepuisResume, etatsDepuisResume, resumerNotesAssets, versionNotee, type NotePourResume } from './retours-resume';
import { etatsNotes, serieAvis, serieAvisJours } from './retours';
import { jourParis } from './essai';
import { notesAvecBases, clesAvecSignal } from './bases-illustrations';
import { avecReevaluations } from './tranches';
import { notesElements } from './qualite';

// Égalité exacte avec les calculs sur la liste complète (ce que faisait la page avant le résumé)
const CLES = ['dessin:orthonyxie', 'dessin:orthonyxie:releve', 'dessin:orthonyxie:pedagogique', 'ligne:orthonyxie', 'ligne:cor', 'dessin:cors-durillons', 'photo:a', 'photo:b', 'gamme:canard', 'icone:x'];
const DATES = ['2026-10-01T08:00:00.000Z', '2026-10-01T08:00:00.000Z', '2026-10-02T23:30:00.000Z', '2026-10-03T10:00:00.000Z', '2026-10-09T22:30:00.000Z', '2026-10-10T07:00:00.000Z', '', null];
function alea(graine: number) { let s = graine; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
const pick = <T,>(r: () => number, l: readonly T[]) => l[Math.floor(r() * l.length)];
function notes(r: () => number, n: number): NotePourResume[] {
  return Array.from({ length: n }, () => {
    const x: NotePourResume = { cle: pick(r, CLES), note: r() < 0.03 ? 7 : 1 + Math.floor(r() * 5), le: pick(r, DATES) };
    const e = pick(r, [null, undefined, 'e1', 'e2', 'e3']);
    if (e !== undefined) x.empreinte = e;
    return x;
  });
}
const enListe = (m: Map<string, unknown>) => [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));

test('résumé des notes : états, éléments, clés, série et versions identiques au calcul sur toutes les notes', () => {
  for (let g = 1; g <= 60; g++) {
    const r = alea(g);
    const srv = notes(r, Math.floor(r() * 300));
    const loc = notes(r, Math.floor(r() * 6));
    const reev = r() < 0.5 ? [] : Array.from({ length: 3 }, () => ({ cle: pick(r, CLES), le: pick(r, DATES.filter(Boolean)) as string }));
    const res = JSON.parse(JSON.stringify(resumerNotesAssets(srv, reev)));
    const toutes = [...loc, ...srv];
    assert.deepEqual(enListe(etatsDepuisResume(res, loc, reev)), enListe(etatsNotes(notesAvecBases(avecReevaluations(toutes, reev)))), `états (graine ${g})`);
    assert.equal(JSON.stringify(elementsDepuisResume(res, loc)), JSON.stringify(notesElements(toutes)), `éléments (graine ${g})`);
    assert.deepEqual([...clesDepuisResume(res, loc)], [...clesAvecSignal(toutes)]);
    const maintenant = new Date('2026-10-10T12:00:00Z');
    const jours = compterJours(loc.map((x) => x.le), { ...res.jours });
    assert.deepEqual(serieAvisJours(jours, maintenant), serieAvis(toutes.map((x) => x.le ?? ''), maintenant));
    assert.equal(res.total + loc.length, toutes.length);
    for (const cle of CLES) for (const e of [null, undefined, 'e1', 'e2', 'e3', 'e4']) {
      assert.equal(versionNotee(res, loc, cle, e), toutes.some((n) => n.cle === cle && (n.empreinte ?? null) === (e ?? null)));
    }
  }
});

test('résumé des notes : jour de Paris mémorisé par heure UTC = jourParis date par date (heures d\'été comprises)', () => {
  const r = alea(7);
  const dates: string[] = [];
  for (let i = 0; i < 20000; i++) {
    const t = Date.UTC(2026, 0, 1) + Math.floor(r() * 365 * 86400) * 1000 + Math.floor(r() * 1000);
    const iso = new Date(t).toISOString();
    dates.push(r() < 0.5 ? iso : iso.replace('Z', '+00:00'));
  }
  // Autour des changements d'heure (01:00 UTC) et de minuit à Paris
  for (const base of ['2026-03-29T00:59:59.999Z', '2026-03-29T01:00:00.000Z', '2026-10-25T00:59:59.999Z', '2026-10-25T01:00:00.000Z', '2026-10-24T21:59:59.000Z', '2026-10-24T22:00:00.000Z', '2026-10-25T22:59:59.000+00:00', '2026-10-25T23:00:00.000+00:00']) dates.push(base);
  dates.push('2026-10-10T12:00:00+02:00', '', '2026-10-10');
  const attendu: Record<string, number> = {};
  for (const d of dates) if (d) { const j = jourParis(d); attendu[j] = (attendu[j] ?? 0) + 1; }
  assert.deepEqual(compterJours(dates), attendu);
});
