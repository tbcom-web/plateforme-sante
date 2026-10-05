'use client';

import { useState, useTransition } from 'react';
import type { StatutUnivers } from '@plateforme/core';
import { changerStatutUnivers } from './actions';

/** Boutons de statut d'un univers : valider pour le catalogue, repasser en brouillon, retirer. */
export function ActionsUnivers({ id, statut }: { id: string; statut: StatutUnivers }) {
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  if (statut === 'differe') return <p className="text-xs text-amber-800">Plus tard : sujet à faible niveau de preuve, à valider d’abord sur le plan déontologique.</p>;
  const agir = (s: Exclude<StatutUnivers, 'differe'>, confirmation?: string) => {
    if (confirmation && !confirm(confirmation)) return;
    demarrer(async () => setMessage(await changerStatutUnivers(id, s)));
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {statut !== 'valide' && (
          <button type="button" disabled={enCours} onClick={() => agir('valide', 'Proposer cet univers aux praticiens ? Vérifiez d’abord l’aperçu local (ordinateur et mobile).')}
            className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
            Valider pour le catalogue
          </button>
        )}
        {statut !== 'brouillon' && (
          <button type="button" disabled={enCours} onClick={() => agir('brouillon')} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-black/10 hover:bg-neutral-50 disabled:opacity-50">
            Repasser en brouillon
          </button>
        )}
        {statut !== 'retire' && (
          <button type="button" disabled={enCours} onClick={() => agir('retire', 'Retirer cet univers du catalogue ? Les sites qui l’utilisent le gardent.')} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-800 ring-1 ring-black/10 hover:bg-red-50 disabled:opacity-50">
            Retirer
          </button>
        )}
      </div>
      {message && <p className={`text-xs ${message.ok ? 'text-teal-800' : 'text-red-700'}`}>{message.message}</p>}
    </div>
  );
}
