'use client';

import { useEffect, useState } from 'react';
import { lireLocalement, oublierLocalement } from '@/lib/brouillon-local';

/**
 * Bandeau proposant de reprendre une saisie gardée dans ce navigateur après un enregistrement refusé
 * (« modifié ailleurs entre-temps »). Reprendre remplace la saisie affichée ; il reste à enregistrer.
 */
export default function SaisieGardee<T>({ espace, id, onReprendre }: { espace: string; id: string | null; onReprendre: (valeur: T) => void }) {
  const [sauvegarde, setSauvegarde] = useState<{ le: number; valeur: T } | null>(null);
  useEffect(() => {
    setSauvegarde(id ? lireLocalement<T>(espace, id) : null);
  }, [espace, id]);
  if (!sauvegarde || !id) return null;

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span>Une saisie non enregistrée du {new Date(sauvegarde.le).toLocaleString('fr-FR')} est gardée dans ce navigateur.</span>
      <span className="flex gap-3 font-semibold">
        <button type="button" className="underline-offset-4 hover:underline" onClick={() => { onReprendre(sauvegarde.valeur); setSauvegarde(null); }}>
          Reprendre cette saisie
        </button>
        <button type="button" className="text-neutral-600 underline-offset-4 hover:underline" onClick={() => { oublierLocalement(espace, id); setSauvegarde(null); }}>
          L’abandonner
        </button>
      </span>
    </div>
  );
}
