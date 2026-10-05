'use client';

import { useActionState } from 'react';
import { publierSite } from './actions';

export default function BoutonPublier({ pret, enLigne, modifs, echec }: { pret: boolean; enLigne: boolean; modifs: boolean; echec: boolean }) {
  const [etat, action, envoi] = useActionState(publierSite, null);

  return (
    <form action={action} className="mt-6">
      <button
        type="submit"
        disabled={!pret || envoi}
        className="w-full rounded-lg bg-teal-800 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
      >
        {envoi ? 'Lancement…' : echec ? 'Relancer la publication' : !enLigne ? 'Publier mon site' : modifs ? 'Publier mes modifications' : 'Republier mon site'}
      </button>
      {!pret && <p className="mt-2 text-xs text-neutral-500">Complétez les informations ci-dessus pour publier.</p>}
      {etat && (
        <p role="status" className={`mt-3 text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
