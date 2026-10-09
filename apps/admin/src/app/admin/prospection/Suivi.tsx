'use client';

import { useActionState } from 'react';
import { STATUTS_PROSPECTION } from '@plateforme/core';
import { enregistrerSuivi } from './actions';

/** Statut, date de relance et note d'un praticien (partagés entre ses cabinets : le suivi est par RPPS). */
export default function Suivi({ rpps, statut, relance, note }: { rpps: string; statut: string | null; relance: string | null; note: string | null }) {
  const [etat, action, envoi] = useActionState(enregistrerSuivi.bind(null, rpps), null);
  return (
    <form action={action} className="grid gap-2 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Statut</span>
          <select name="statut" defaultValue={statut ?? 'a_contacter'} className="min-h-10 rounded-lg border border-neutral-300 px-2">
            {STATUTS_PROSPECTION.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Relance</span>
          <input type="date" name="relance" defaultValue={relance ?? ''} className="min-h-10 rounded-lg border border-neutral-300 px-2" />
        </label>
        <button type="submit" disabled={envoi} className="min-h-10 rounded-lg bg-teal-800 px-3 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">Enregistrer</button>
        {etat && <span role="status" className={etat.ok ? 'text-teal-800' : 'text-red-700'}>{etat.message}</span>}
      </div>
      <label className="grid gap-1">
        <span className="sr-only">Note</span>
        <textarea name="note" defaultValue={note ?? ''} rows={1} maxLength={2000} placeholder="Note (appel, objection, secrétariat…)" className="min-h-10 rounded-lg border border-neutral-300 px-2 py-2" />
      </label>
    </form>
  );
}
