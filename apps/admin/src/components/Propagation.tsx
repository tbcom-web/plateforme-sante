'use client';

import { useEffect, useState, useTransition } from 'react';
import { compterConcernes, propager } from '@/app/admin/propagation';
import type { Cible } from '@/lib/publication';

/**
 * Propage un changement partagé (photo de la banque visuelle, modèle, charte…) à tous les sites en ligne
 * qui l'utilisent : affiche le nombre de sites concernés et republie après confirmation.
 */
export default function Propagation({ cible, libelle }: { cible: Cible; libelle: string }) {
  const [concernes, setConcernes] = useState<{ nombre: number; noms: string[] } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const cle = JSON.stringify(cible);

  useEffect(() => {
    compterConcernes(JSON.parse(cle)).then(setConcernes).catch(() => setConcernes(null));
  }, [cle]);

  if (!concernes) return null;
  if (concernes.nombre === 0) return <p className="text-xs text-neutral-500">Aucun site en ligne n’utilise encore {libelle}.</p>;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm">
      <span>
        <strong>{concernes.nombre} site(s) en ligne</strong> utilisent {libelle}
        <span className="text-neutral-500"> ({concernes.noms.join(', ')}{concernes.nombre > concernes.noms.length ? '…' : ''})</span>
      </span>
      <button
        type="button"
        disabled={enCours}
        onClick={() => {
          if (!confirm(`Republier ${concernes.nombre} site(s) pour appliquer le changement ?`)) return;
          demarrer(async () => setMessage(await propager(JSON.parse(cle))));
        }}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {enCours ? 'Lancement…' : 'Appliquer à tous ces sites'}
      </button>
      {message && <span className={message.ok ? 'text-teal-800' : 'text-red-700'}>{message.message}</span>}
    </div>
  );
}
