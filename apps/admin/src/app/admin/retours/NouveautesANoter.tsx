'use client';

// Tuile « Nouveautés à noter » en tête de « Donner mon avis » (exigence de Paul du 2026-10-08 : « tous les nouveaux ingrédients
// passent par le filtre de notation de base ») : les ingrédients unitaires apparus depuis moins de 30 jours (registre
// inventaire-connu.json, nouveautes.ts) et jamais notés, groupés par lot (famille et date) avec leur nombre. « Noter les
// nouveautés » lance la file dédiée (même carte de notation que les autres tuiles) ; chaque lot a son lien direct
// /admin/retours?nouveautes=<lot>. Une nouveauté notée sort de la tuile.
import { dateCourte, lienNouveautes, type LotNouveautes } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function NouveautesANoter({ lots, onNoter, message }: {
  lots: LotNouveautes[];
  onNoter: (lots: LotNouveautes[]) => void;
  /** Message d'accueil (lot demandé déjà noté, file terminée) */
  message?: string | null;
}) {
  const total = lots.reduce((s, l) => s + l.cles.length, 0);
  if (!total && !message) return null;
  return (
    <section aria-labelledby="rt-nouveautes" className="grid gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id="rt-nouveautes" className="text-lg font-bold text-amber-950">
            Nouveautés à noter{total ? <> · <span className="tabular-nums">{total}</span></> : null}
          </h2>
          <p className="text-sm text-amber-950/80">
            {total ? 'Ingrédients ajoutés depuis moins de 30 jours, jamais notés : ils passent par le filtre de notation avant d’entrer dans les compositions.' : 'Toutes les nouveautés sont notées.'}
          </p>
        </div>
        {total > 0 && (
          <button type="button" onClick={() => onNoter(lots)}
            className={`min-h-11 rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white hover:bg-amber-950 ${focus}`}>
            Noter les nouveautés ({total})
          </button>
        )}
      </div>
      {message && <p role="status" className="rounded-lg bg-white px-3 py-2 text-sm text-neutral-800 ring-1 ring-amber-200">{message}</p>}
      {lots.length > 0 && (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map((l) => (
            <li key={l.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-white p-2 pl-3 ring-1 ring-amber-200">
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-semibold text-neutral-900">{l.libelle}</span>
                <span className="text-neutral-600"> · <span className="tabular-nums">{l.cles.length}</span> · {dateCourte(l.date)}</span>
              </span>
              <a href={lienNouveautes(l.id)} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onNoter([l]); }}
                title={`Lien direct : ${lienNouveautes(l.id)}`}
                className={`flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold text-amber-950 ring-1 ring-amber-300 hover:bg-amber-100 ${focus}`}>
                Noter →
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
