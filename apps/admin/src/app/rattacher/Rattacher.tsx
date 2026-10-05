'use client';

import { useState, useTransition } from 'react';
import { rattacher, seConnecterPourRattacher, type EtatRattachement } from './actions';

const bouton = 'h-11 w-full rounded-lg bg-teal-800 font-semibold text-white hover:bg-teal-900 disabled:opacity-60';

export default function Rattacher({ code, email }: { code: string; email: string | null }) {
  const [etat, setEtat] = useState<EtatRattachement>(null);
  const [enCours, demarrer] = useTransition();

  if (!email) {
    return (
      <div className="mt-5 grid gap-3">
        <p className="text-sm text-neutral-600">
          Connectez-vous avec l’adresse e-mail à laquelle ce lien vous a été envoyé (lien de connexion par e-mail si vous n’avez pas encore de mot de passe).
          Le rattachement vous sera proposé ensuite sur votre tableau de bord.
        </p>
        <button type="button" disabled={enCours} className={bouton} onClick={() => demarrer(() => seConnecterPourRattacher(code))}>
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3">
      <p className="text-sm text-neutral-600">
        Vous êtes connecté avec <strong>{email}</strong>. Le site préparé pour votre cabinet sera rattaché à ce compte : vous pourrez le compléter et le publier.
      </p>
      <button type="button" disabled={enCours} className={bouton} onClick={() => demarrer(async () => setEtat(await rattacher(code)))}>
        {enCours ? 'Rattachement…' : 'Rattacher le site à mon compte'}
      </button>
      {etat && <p role="status" className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
      <button type="button" disabled={enCours} onClick={() => demarrer(() => seConnecterPourRattacher(code, true))} className="text-left text-sm text-teal-800 underline-offset-4 hover:underline">
        Ce n’est pas la bonne adresse ? Changer de compte
      </button>
    </div>
  );
}
