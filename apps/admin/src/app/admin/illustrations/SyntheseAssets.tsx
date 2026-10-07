'use client';

// Tendances des notes d'assets (0027) en tête de « Bibliothèque & retours » : répartition, par type, meilleurs / pires,
// étiquettes fréquentes ; « Copier mes retours » (Markdown à coller à Claude), comme l'atelier.
import { useState } from 'react';
import { libelleEtiquetteAsset, LIBELLES_TYPES_ASSET, type LigneSyntheseAsset, type SyntheseAssets as Synthese } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const num = (x: number) => x.toFixed(2).replace('.', ',');

function Liste({ titre, lignes, ton }: { titre: string; lignes: LigneSyntheseAsset[]; ton: 'bon' | 'mauvais' }) {
  return (
    <section className="min-w-0 rounded-xl border border-black/10 bg-white p-3">
      <h3 className={`mb-2 text-sm font-semibold ${ton === 'bon' ? 'text-teal-900' : 'text-red-900'}`}>{titre}</h3>
      {lignes.length === 0 ? <p className="text-xs text-neutral-500">Pas encore assez de notes.</p> : (
        <ol className="grid gap-1.5 text-sm">
          {lignes.slice(0, 6).map((l) => (
            <li key={l.cle} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
              <span className="truncate" title={l.cle}>{l.titre} <span className="text-xs text-neutral-500">· {LIBELLES_TYPES_ASSET[l.type]}</span></span>
              <span className="whitespace-nowrap tabular-nums text-neutral-700">{num(l.lissee)} ★ <span className="text-xs text-neutral-500">({l.n})</span></span>
              {l.etiquettes.length > 0 && <span className="col-span-2 truncate text-xs text-neutral-500">{l.etiquettes.slice(0, 3).map(([id, nb]) => `${libelleEtiquetteAsset(id)} ×${nb}`).join(' · ')}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function SyntheseAssets({ synthese: s, markdown }: { synthese: Synthese; markdown: string }) {
  const [copie, setCopie] = useState<'' | 'ok' | 'manuel'>('');
  const copier = async () => { try { await navigator.clipboard.writeText(markdown); setCopie('ok'); } catch { setCopie('manuel'); } };
  return (
    <details open={s.total > 0} className="rounded-2xl border border-black/10 bg-neutral-50 p-4">
      <summary className={`flex min-h-11 cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 rounded ${focus}`}>
        <span className="font-semibold">Tendances</span>
        <span className="text-sm text-neutral-600">{s.total} note{s.total > 1 ? 's' : ''}{s.total ? ` · moyenne ${num(s.moyenne)} ★` : ''} · {s.aRetravailler.length} à retravailler</span>
      </summary>
      <div className="mt-3 grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={copier} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>Copier mes retours</button>
          <p role="status" className="text-sm text-neutral-600">{copie === 'ok' ? 'Retours copiés (Markdown) : collez-les à Claude.' : copie === 'manuel' ? 'Copie automatique impossible : sélectionnez le texte ci-dessous.' : ''}</p>
        </div>
        {copie === 'manuel' && <textarea readOnly value={markdown} rows={10} className="w-full rounded-lg border border-neutral-300 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />}
        {s.parType.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {s.parType.map((t) => <li key={t.type} className="rounded-full bg-white px-3 py-1 ring-1 ring-black/10">{t.libelle} : {num(t.moyenne)} ★ <span className="text-xs text-neutral-500">({t.notes})</span></li>)}
          </ul>
        )}
        {s.total > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Liste titre="Les mieux notés" lignes={s.meilleures} ton="bon" />
            <Liste titre="Les moins bien notés" lignes={s.pires} ton="mauvais" />
            <section className="rounded-xl border border-black/10 bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">Étiquettes les plus fréquentes</h3>
              <ul className="grid gap-1.5 text-sm">
                {s.etiquettes.slice(0, 6).map((e) => <li key={e.id}><strong>{e.libelle}</strong> ({e.total}) <span className="text-xs text-neutral-600">{e.assets.slice(0, 3).map((x) => x.titre).join(' · ')}</span></li>)}
              </ul>
            </section>
          </div>
        )}
      </div>
    </details>
  );
}
