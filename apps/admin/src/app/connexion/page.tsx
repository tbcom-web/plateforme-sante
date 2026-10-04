'use client';

import { useActionState, useState } from 'react';
import { connexionMotDePasse, envoyerLien } from './actions';
import { MARQUE } from '@/lib/marque';

const champ = 'h-11 rounded-lg border border-neutral-300 px-3 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';
const bouton = 'h-11 rounded-lg bg-teal-800 font-semibold text-white hover:bg-teal-900 disabled:opacity-60';

export default function Connexion() {
  const [mode, setMode] = useState<'motDePasse' | 'lien'>('motDePasse');
  const [etatMdp, actionMdp, envoiMdp] = useActionState(connexionMotDePasse, null);
  const [etatLien, actionLien, envoiLien] = useActionState(envoyerLien, null);
  const etat = mode === 'motDePasse' ? etatMdp : etatLien;

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-teal-800">{MARQUE.nom}</p>
        <h1 className="mt-2 text-2xl font-bold">Connexion</h1>

        <div role="tablist" className="mt-5 grid grid-cols-2 rounded-lg bg-neutral-100 p-1 text-sm font-medium">
          {([['motDePasse', 'Mot de passe'], ['lien', 'Lien par e-mail']] as const).map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={mode === v} onClick={() => setMode(v)}
              className={`rounded-md py-2 ${mode === v ? 'bg-white shadow-sm' : 'text-neutral-600'}`}>
              {l}
            </button>
          ))}
        </div>

        {mode === 'motDePasse' ? (
          <form action={actionMdp} className="mt-5 grid gap-3">
            <label htmlFor="email" className="text-sm font-medium">Adresse e-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" className={champ} />
            <label htmlFor="motDePasse" className="text-sm font-medium">Mot de passe</label>
            <input id="motDePasse" name="motDePasse" type="password" required autoComplete="current-password" className={champ} />
            <button type="submit" disabled={envoiMdp} className={bouton}>{envoiMdp ? 'Connexion…' : 'Se connecter'}</button>
            <button type="button" onClick={() => setMode('lien')} className="text-left text-sm text-teal-800 underline-offset-4 hover:underline">
              Première connexion ou mot de passe oublié ?
            </button>
          </form>
        ) : (
          <form action={actionLien} className="mt-5 grid gap-3">
            <p className="text-sm text-neutral-600">Recevez un lien pour vous connecter. Vous pourrez ensuite définir un mot de passe dans « Mon compte ».</p>
            <label htmlFor="email-lien" className="text-sm font-medium">Adresse e-mail</label>
            <input id="email-lien" name="email" type="email" required autoComplete="email" className={champ} />
            <button type="submit" disabled={envoiLien} className={bouton}>{envoiLien ? 'Envoi…' : 'Recevoir mon lien'}</button>
          </form>
        )}

        {etat && (
          <p role="status" className={`mt-4 text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>
            {etat.message}
          </p>
        )}
      </div>
    </main>
  );
}
