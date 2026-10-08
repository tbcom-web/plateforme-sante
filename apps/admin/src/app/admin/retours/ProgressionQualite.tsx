// Tableau de progression de l'objectif « compositions 100 % 4-5 ★ » (packages/core/src/qualite.ts, docs/ingredients-recettes.md) :
// par dimension, nombre d'éléments notés 4-5 ★ disponibles (couverte dès 2), taux global, prochaines priorités à noter avec un
// lien direct vers la tuile qui les fait noter.
import Link from 'next/link';
import { categorieDeDimension, type Progression } from '@plateforme/core';

export default function ProgressionQualite({ progression }: { progression: Progression }) {
  const { dimensions, taux, priorites, texte } = progression;
  if (!dimensions.length) return null;
  return (
    <section aria-label="Progression vers des compositions 100 % 4-5 étoiles" className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="relative h-2 w-28 shrink-0 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-black/10" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-full bg-teal-700" style={{ width: `${taux}%` }} />
        </span>
        <strong>{texte}</strong>
      </div>
      <p className="text-neutral-600">Une dimension est couverte quand elle offre au moins 2 éléments notés 4 ou 5 ★ : les compositions peuvent alors n’utiliser que des éléments que vous aimez.</p>
      {priorites.length > 0 && (
        <div className="grid gap-1">
          <p className="font-semibold">Prochaines priorités à noter</p>
          <ul className="flex flex-wrap gap-1.5">
            {priorites.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/retours?type=${categorieDeDimension(d.id)}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
                  {d.nom} <span className="tabular-nums text-amber-800">{d.bons}/{Math.min(2, d.total)} 4-5 ★</span> →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <details>
        <summary className="cursor-pointer font-medium text-teal-900">Toutes les dimensions ({dimensions.length})</summary>
        <ul className="mt-2 grid gap-x-4 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
          {dimensions.map((d) => (
            <li key={d.id} className="flex justify-between gap-2">
              <span>{d.couverte ? '✓' : '·'} {d.nom}</span>
              <span className="tabular-nums text-neutral-600">{d.bons} 4-5 ★ / {d.total}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
