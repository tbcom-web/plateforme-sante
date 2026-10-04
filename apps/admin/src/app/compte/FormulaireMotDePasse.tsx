'use client';

import { useActionState } from 'react';
import { definirMotDePasse } from './actions';

const champ = 'h-11 rounded-lg border border-neutral-300 px-3 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';

export default function FormulaireMotDePasse() {
  const [etat, action, envoi] = useActionState(definirMotDePasse, null);

  return (
    <form action={action} className="mt-4 grid gap-3">
      <label htmlFor="motDePasse" className="text-sm font-medium">Nouveau mot de passe (10 caractères minimum)</label>
      <input id="motDePasse" name="motDePasse" type="password" required minLength={10} autoComplete="new-password" className={champ} />
      <label htmlFor="confirmation" className="text-sm font-medium">Confirmation</label>
      <input id="confirmation" name="confirmation" type="password" required minLength={10} autoComplete="new-password" className={champ} />
      <button type="submit" disabled={envoi} className="h-11 rounded-lg bg-teal-800 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
        {envoi ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
      </button>
      {etat && <p role="status" className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
    </form>
  );
}
