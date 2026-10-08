'use client';

// Tendances de l'atelier : nombre de notes, meilleurs et pires ingrédients / combinaisons, étiquettes les plus fréquentes,
// « Copier mes retours » (Markdown à coller à Claude pour corriger les règles ou faire retoucher des illustrations).
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { extremesAtelier, libelleEtiquette, type LigneSyntheseAtelier, type SyntheseAtelier } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const num = (x: number) => x.toFixed(2).replace('.', ',');

function Tableau({ titre, lignes, ton }: { titre: string; lignes: LigneSyntheseAtelier[]; ton: 'bon' | 'mauvais' }) {
  return (
    <section className="min-w-0 rounded-xl border border-black/10 bg-white p-3">
      <h3 className={`mb-2 text-sm font-semibold ${ton === 'bon' ? 'text-teal-900' : 'text-red-900'}`}>{titre}</h3>
      {lignes.length === 0 ? <p className="text-xs text-neutral-500">Pas encore assez de notes.</p> : (
        <ol className="grid gap-1.5 text-sm">
          {lignes.map((l) => (
            <li key={l.cle} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
              <span className="truncate" title={l.libelle}>{l.libelle}</span>
              <span className="whitespace-nowrap tabular-nums text-neutral-700">{num(l.lissee)} ★ <span className="text-xs text-neutral-500">({l.n})</span></span>
              {l.etiquettes.length > 0 && <span className="col-span-2 truncate text-xs text-neutral-500">{l.etiquettes.slice(0, 3).map(([id, nb]) => `${libelleEtiquette(id)} ×${nb}`).join(' · ')}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function Synthese({ synthese: s, markdown }: { synthese: SyntheseAtelier; markdown: string }) {
  const router = useRouter();
  const [copie, setCopie] = useState<'' | 'ok' | 'manuel'>('');
  const [actualisation, demarrer] = useTransition();
  const ing = extremesAtelier(s.ingredients, 5);
  const com = extremesAtelier(s.combinaisons, 5);
  const pai = extremesAtelier(s.paires, 5, 2);
  const max = Math.max(1, ...s.repartition);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopie('ok');
    } catch {
      setCopie('manuel');
    }
  };

  return (
    <details className="rounded-2xl border border-black/10 bg-neutral-50 p-4">
      <summary className={`flex min-h-11 cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 rounded ${focus}`}>
        <span className="font-semibold">Tendances</span>
        <span className="text-sm text-neutral-600">{s.total} note{s.total > 1 ? 's' : ''}{s.total ? ` · moyenne ${num(s.moyenne)} ★` : ''}</span>
      </summary>
      <div className="mt-3 grid gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div aria-label="Répartition des notes" className="flex items-end gap-1.5">
            {s.repartition.map((n, i) => (
              <div key={i} className="grid justify-items-center gap-1 text-xs text-neutral-600">
                <span className="tabular-nums">{n}</span>
                <span aria-hidden="true" className="w-7 rounded-t bg-teal-700/80" style={{ height: 4 + (n / max) * 44 }} />
                <span>{i + 1}★</span>
              </div>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" onClick={() => demarrer(() => router.refresh())} className={`min-h-11 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold hover:bg-neutral-50 ${focus}`}>
              {actualisation ? 'Actualisation…' : 'Actualiser'}
            </button>
            <button type="button" onClick={copier} disabled={!s.total} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
              Copier mes retours
            </button>
          </div>
        </div>
        <p role="status" className="text-sm text-neutral-600">{copie === 'ok' ? 'Retours copiés (Markdown) : collez-les à Claude.' : copie === 'manuel' ? 'Copie automatique impossible : sélectionnez le texte ci-dessous.' : ''}</p>
        {copie === 'manuel' && <textarea readOnly value={markdown} rows={10} className="w-full rounded-lg border border-neutral-300 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />}
        {s.total > 0 && (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Tableau titre="Ingrédients les mieux notés" lignes={ing.meilleures} ton="bon" />
              <Tableau titre="Ingrédients les moins bien notés" lignes={ing.pires} ton="mauvais" />
              <Tableau titre="Associations à revoir" lignes={pai.pires} ton="mauvais" />
              <Tableau titre="Combinaisons préférées" lignes={com.meilleures} ton="bon" />
              <Tableau titre="Combinaisons ratées" lignes={com.pires} ton="mauvais" />
              <Tableau titre="Associations à garder" lignes={pai.meilleures} ton="bon" />
            </div>
            {s.etiquettes.length > 0 && (
              <section className="rounded-xl border border-black/10 bg-white p-3">
                <h3 className="mb-2 text-sm font-semibold">Étiquettes les plus fréquentes</h3>
                <ul className="grid gap-1.5 text-sm">
                  {s.etiquettes.map((e) => (
                    <li key={e.id}><strong>{e.libelle}</strong> ({e.total}) : <span className="text-neutral-700">{e.ingredients.map((x) => `${x.libelle} (${x.nb})`).join(' · ') || '—'}</span></li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </details>
  );
}
