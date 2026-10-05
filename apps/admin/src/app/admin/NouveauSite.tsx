'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { PROFILS } from '@plateforme/core';
import { creerSiteClient } from './actions';
import LienACopier from './LienACopier';

const champ = 'h-9 rounded-md border border-neutral-300 px-2';

/** Création du site d'un client par l'admin, avec lien de rattachement pour le praticien. */
export default function NouveauSite() {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, envoi] = useActionState(creerSiteClient, null);

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
        Nouveau site client
      </button>
    );
  }

  return (
    <form action={action} className="grid w-full max-w-xl gap-3 rounded-2xl border border-black/5 bg-white p-4 text-sm">
      <p className="font-semibold">Nouveau site client</p>
      <p className="text-xs text-neutral-600">
        Le site est créé à votre nom le temps de le préparer. Le praticien se connecte avec l’e-mail indiqué puis ouvre le lien de rattachement :
        le site passe alors sur son compte.
      </p>
      <label className="grid gap-1">
        <span>Nom du cabinet</span>
        <input name="nom" required maxLength={120} className={champ} />
      </label>
      <label className="grid gap-1">
        <span>E-mail du praticien</span>
        <input name="email" type="email" required maxLength={200} className={champ} />
      </label>
      <label className="grid gap-1">
        <span>Profil du cabinet</span>
        <select name="profil" defaultValue="proximite" className={champ}>
          {PROFILS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={envoi} className="rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
          {envoi ? 'Création…' : 'Créer le site'}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="rounded-lg px-3 py-2 text-neutral-600 hover:bg-neutral-100">Fermer</button>
      </div>
      {etat && (
        <div role="status" className={etat.ok ? 'text-teal-800' : 'text-red-700'}>
          <p>{etat.message}</p>
          {etat.lien && <LienACopier lien={etat.lien} />}
          {etat.id && <Link href={`/mon-site?site=${etat.id}`} className="mt-2 inline-block font-semibold underline-offset-4 hover:underline">Compléter le site →</Link>}
        </div>
      )}
    </form>
  );
}
