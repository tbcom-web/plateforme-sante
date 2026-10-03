'use client';

import { useActionState } from 'react';
import { envoyerLien } from './actions';
import { MARQUE } from '@/lib/marque';

export default function Connexion() {
  const [etat, action, envoi] = useActionState(envoyerLien, null);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-teal-800">{MARQUE.nom}</p>
        <h1 className="mt-2 text-2xl font-bold">Connexion</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Saisissez votre e-mail : vous recevrez un lien pour vous connecter, sans mot de passe.
        </p>

        <form action={action} className="mt-6 grid gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 rounded-lg border border-neutral-300 px-3 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          />
          <button
            type="submit"
            disabled={envoi}
            className="h-11 rounded-lg bg-teal-800 font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
          >
            {envoi ? 'Envoi…' : 'Recevoir mon lien'}
          </button>
        </form>

        {etat && (
          <p role="status" className={`mt-4 text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>
            {etat.message}
          </p>
        )}
      </div>
    </main>
  );
}
