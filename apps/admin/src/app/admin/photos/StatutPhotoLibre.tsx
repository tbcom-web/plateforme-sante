'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LIBELLES_STATUTS_PHOTO_LIBRE, STATUTS_PHOTO_LIBRE, type StatutPhotoLibre as Statut } from '@plateforme/core';
import { changerStatutPhotoLibre } from './actions';

/** Boutons de statut d'une photo libre de droits (à valider, validée, retirée) */
export default function StatutPhotoLibre({ id, statut }: { id: string; statut: Statut }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState('');
  return (
    <div className="grid gap-1">
      <div role="group" aria-label="Statut" className="flex flex-wrap gap-1">
        {STATUTS_PHOTO_LIBRE.map((s) => (
          <button key={s} type="button" aria-pressed={s === statut} disabled={enCours || s === statut}
            onClick={() => demarrer(async () => { const r = await changerStatutPhotoLibre(id, s); setMessage(r?.message ?? ''); router.refresh(); })}
            className={`min-h-9 rounded-full border px-2.5 text-xs font-semibold ${s === statut ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white hover:bg-neutral-50'}`}>
            {LIBELLES_STATUTS_PHOTO_LIBRE[s]}
          </button>
        ))}
      </div>
      {message && <span role="status" className="text-xs text-neutral-600">{message}</span>}
    </div>
  );
}
