'use client';

// Jauge « qualité de la composition » (packages/core/src/qualite.ts, docs/ingredients-recettes.md) : objectif de Paul, des
// compositions faites UNIQUEMENT d'éléments notés 4 ou 5 ★. Une ligne « 9/12 éléments 4-5 ★ · 2 jamais notés · 1 à 3 ★ », le
// détail élément par élément au survol (title), « Nouveau à juger : … » quand la composition à évaluer introduit un élément à
// juger, et les dimensions qui n'ont encore aucun 4-5 ★ (meilleur disponible, signalé).
import { useMemo } from 'react';
import { dimensionsSansFavori, libelleElement, ordonnerNouveaux, qualiteComposition, type CompositionRecette, type NotesElements } from '@plateforme/core';

type Props = {
  composition: CompositionRecette;
  sujets: readonly string[];
  notes?: NotesElements | null;
  /** Éléments à juger introduits volontairement (« un seul nouveau à la fois ») ; absent : seulement le signal des dimensions sans 4-5 ★ */
  nouveaux?: readonly string[] | null;
  className?: string;
};

export default function JaugeQualite({ composition, sujets, notes, nouveaux, className = '' }: Props) {
  const q = useMemo(() => qualiteComposition(composition, sujets, notes), [composition, sujets, notes]);
  const restants = useMemo(() => q.details.filter((d) => d.note === null || d.note < 4).map((d) => d.cle), [q]);
  const sans = useMemo(() => dimensionsSansFavori(restants, notes, sujets), [restants, notes, sujets]);
  const nouveau = useMemo(() => (nouveaux?.length ? ordonnerNouveaux(nouveaux, notes, sujets)[0] : null), [nouveaux, notes, sujets]);
  if (!q.total) return null;
  const pct = Math.round(q.part * 100);
  const teinte = q.bons === q.total ? 'bg-teal-50 text-teal-950 ring-teal-200' : pct >= 60 ? 'bg-sky-50 text-sky-950 ring-sky-200' : 'bg-amber-50 text-amber-950 ring-amber-200';
  const detail = q.details.map((d) => `${libelleElement(d.cle, sujets)} : ${d.note === null ? 'jamais noté' : `${d.note.toLocaleString('fr-FR')} ★`}`).join('\n');
  return (
    <div className={`grid gap-0.5 rounded-xl px-3 py-1.5 text-xs ring-1 ${teinte} ${className}`} data-jauge-qualite>
      <div className="flex items-center gap-2" title={detail}>
        <span className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/10" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-full bg-current opacity-60" style={{ width: `${pct}%` }} />
        </span>
        <span className="font-semibold">{q.texte}</span>
      </div>
      {nouveau && <p className="font-medium">Nouveau à juger : {libelleElement(nouveau, sujets)}</p>}
      {sans.length > 0 && (
        <p className="text-[11px] opacity-80" title={sans.join('\n')}>
          Pas encore de 4-5 ★ (meilleur disponible) : {sans.slice(0, 3).join(', ')}{sans.length > 3 ? ` et ${sans.length - 3} autre${sans.length - 3 > 1 ? 's' : ''}` : ''}
        </p>
      )}
    </div>
  );
}
