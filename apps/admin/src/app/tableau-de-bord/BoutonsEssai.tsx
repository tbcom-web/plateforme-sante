'use client';

import { useActionState } from 'react';
import { demanderMiseEnLigne, mettreAJourEssai } from './actions-essai';

const principal = 'min-h-11 w-full rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60';
const secondaire = 'min-h-11 w-full rounded-lg border border-teal-800 px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60';

export function BoutonMettreAJour({ libelle, principalStyle = false }: { libelle: string; principalStyle?: boolean }) {
  const [etat, action, envoi] = useActionState(mettreAJourEssai, null);
  return (
    <form action={action} className="grid gap-2">
      <button type="submit" disabled={envoi} className={principalStyle ? principal : secondaire}>{envoi ? 'Préparation…' : libelle}</button>
      {etat && <p role="status" className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
    </form>
  );
}

export function BoutonDemanderMiseEnLigne({ dejaDemande }: { dejaDemande: boolean }) {
  const [etat, action, envoi] = useActionState(demanderMiseEnLigne, null);
  return (
    <form action={action} className="grid gap-2">
      <button type="submit" disabled={envoi || Boolean(etat?.ok)} className={principal}>
        {envoi ? 'Envoi…' : dejaDemande ? 'Renouveler ma demande de mise en ligne' : 'Demander la mise en ligne'}
      </button>
      {etat && <p role="status" className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
    </form>
  );
}
