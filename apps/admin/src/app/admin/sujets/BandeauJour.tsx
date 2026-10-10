'use client';

// Bandeau du jour (point d'entrée « À valider ») : objectif quotidien (OBJECTIF_QUOTIDIEN décisions), série de jours, sobre.
// Décisions du jour = notes enregistrées à l'ouverture de la page (serveur) + décisions prises depuis sur la page (`enPlus`).
import { OBJECTIF_QUOTIDIEN, serieDeJours } from '@plateforme/core/sujets-validation';

export default function BandeauJour({ jours, aujourdhui, enPlus = 0, compact = false }: { jours: Record<string, number>; aujourdhui: string; enPlus?: number; compact?: boolean }) {
  const faits = (jours[aujourdhui] ?? 0) + Math.max(0, enPlus);
  const serie = serieDeJours({ ...jours, [aujourdhui]: faits }, aujourdhui);
  const part = Math.min(1, faits / OBJECTIF_QUOTIDIEN);
  const atteint = faits >= OBJECTIF_QUOTIDIEN;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-black/5 bg-white ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className="grid min-w-40 flex-1 gap-1">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-neutral-900">{atteint ? 'Objectif du jour atteint ✓' : 'Objectif du jour'}</span>
          <span className="tabular-nums text-neutral-600"><span className="font-semibold text-neutral-900">{faits}</span> / {OBJECTIF_QUOTIDIEN}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200" role="meter" aria-valuemin={0} aria-valuemax={OBJECTIF_QUOTIDIEN} aria-valuenow={faits} aria-label="Décisions du jour">
          <div className={`h-full rounded-full transition-[width] duration-300 ${atteint ? 'bg-teal-700' : 'bg-amber-400'}`} style={{ width: `${Math.max(2, Math.round(part * 100))}%` }} />
        </div>
      </div>
      <div className="text-sm text-neutral-700" title="Jours d’affilée avec au moins une décision">
        Série : <span className="font-semibold tabular-nums text-neutral-900">{serie}</span> jour{serie > 1 ? 's' : ''}
      </div>
    </div>
  );
}
