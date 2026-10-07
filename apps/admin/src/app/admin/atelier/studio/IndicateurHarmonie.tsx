'use client';

// Indicateur d'harmonie du studio (harmonie.ts, docs/harmonie-graphique.md) : « Harmonie : 87/100 — Éditorial chic », règles dures
// enfreintes (rouge) et conseils (accords recommandés), chacun avec « Corriger » qui ajuste l'élément fautif ; case « Hors règles
// (explorer) » (désactivée par défaut) : les dés tirent alors sans les règles d'harmonie, les garde-fous du core restent actifs.
import { useMemo } from 'react';
import { corrigerHarmonie, familleStyle, outilsHarmonie, scoreHarmonie, type CompositionRecette, type ContexteRecette } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const bouton = `inline-flex min-h-9 shrink-0 items-center rounded-lg border border-neutral-300 bg-white px-2.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-40 ${focus}`;

type Props = {
  composition: CompositionRecette;
  contexte: ContexteRecette;
  onCorriger: (x: CompositionRecette) => void;
  explorer: boolean;
  onExplorer: (actif: boolean) => void;
};

export default function IndicateurHarmonie({ composition, contexte, onCorriger, explorer, onExplorer }: Props) {
  const s = useMemo(() => scoreHarmonie(composition, contexte), [composition, contexte]);
  const outils = useMemo(() => outilsHarmonie(contexte), [contexte]);
  // Corrections calculées une fois (bouton grisé si rien ne change : élément verrouillé par les garde-fous du core)
  const items = useMemo(() => [
    ...s.violations.map((v) => ({ ...v, dure: true })),
    ...s.conseils.slice(0, 4).map((c) => ({ ...c, dure: false })),
  ].map((it) => {
    const y = it.corrections.length ? corrigerHarmonie(composition, it, outils) : composition;
    return { ...it, correction: y !== composition && JSON.stringify(y) !== JSON.stringify(composition) ? y : null };
  }), [s, composition, outils]);
  const teinte = s.violations.length ? 'bg-red-50 text-red-900 ring-red-200' : s.score >= 75 ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-amber-50 text-amber-950 ring-amber-200';
  const autres = s.familles.slice(1).filter((f) => f.coherence >= s.familles[0].coherence - 0.08);

  return (
    <section aria-label="Harmonie graphique" className={`grid gap-2 rounded-xl p-3 text-sm ring-1 ${teinte}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold" aria-live="polite">
          Harmonie : {s.score}/100 — {s.nomFamille}
          {autres.length > 0 && <span className="font-normal opacity-75"> (proche : {autres.map((f) => familleStyle(f.id)?.nom ?? f.id).join(', ')})</span>}
        </p>
        <label className="inline-flex min-h-9 items-center gap-2 text-xs">
          <input type="checkbox" checked={explorer} onChange={(e) => onExplorer(e.target.checked)} className="h-4 w-4 accent-teal-800" />
          Hors règles (explorer)
        </label>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/70" aria-hidden="true">
        <div className={`h-full rounded-full ${s.violations.length ? 'bg-red-600' : s.score >= 75 ? 'bg-teal-700' : 'bg-amber-500'}`} style={{ width: `${s.score}%` }} />
      </div>
      {explorer && <p className="text-xs">Les dés tirent sans les règles d’harmonie (contrastes, diabète et posture restent protégés).</p>}
      {items.length > 0 && (
        <ul className="grid gap-1.5">
          {items.map((it, i) => (
            <li key={`${it.code}-${i}`} className="flex items-start justify-between gap-2">
              <span>{it.dure ? <strong>Règle : </strong> : null}{it.message}</span>
              {it.correction && <button type="button" className={bouton} onClick={() => onCorriger(it.correction!)}>Corriger</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
