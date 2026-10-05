'use client';

import { useActionState, useState } from 'react';
import { publierSite } from './actions';
import ConfirmationPublication from '@/components/ConfirmationPublication';

/** `manques` : informations remplacées sur le site par une mention sobre ; jamais bloquantes, confirmées avant l'envoi. */
export default function BoutonPublier({ manques, enLigne, modifs, echec }: { manques: string[]; enLigne: boolean; modifs: boolean; echec: boolean }) {
  const [etat, action, envoi] = useActionState(publierSite, null);
  const [confirmer, setConfirmer] = useState(false);

  return (
    <form action={action} onSubmit={() => setConfirmer(false)} className="mt-6">
      {confirmer && manques.length > 0 && !envoi ? (
        <ConfirmationPublication remplacements={manques} soumettre onAnnuler={() => setConfirmer(false)} />
      ) : (
      <button
        type={manques.length > 0 && !confirmer ? 'button' : 'submit'}
        onClick={manques.length > 0 && !confirmer ? () => setConfirmer(true) : undefined}
        disabled={envoi}
        className="w-full rounded-lg bg-teal-800 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
      >
        {envoi ? 'Lancement…' : echec ? 'Relancer la publication' : !enLigne ? 'Publier mon site' : modifs ? 'Publier mes modifications' : 'Republier mon site'}
      </button>
      )}
      {etat && (
        <p role="status" className={`mt-3 text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
