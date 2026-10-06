'use client';

import { useActionState } from 'react';
import { passerAbonnement } from './actions';

export default function BoutonAbonnement() {
  const [etat, action, envoi] = useActionState(passerAbonnement, null);
  return (
    <form action={action} className="grid gap-2">
      <button type="submit" disabled={envoi} className="min-h-12 rounded-xl bg-teal-800 px-5 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
        {envoi ? 'Ouverture du paiement…' : 'Passer à l’abonnement'}
      </button>
      {etat && <p role="status" className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
    </form>
  );
}
