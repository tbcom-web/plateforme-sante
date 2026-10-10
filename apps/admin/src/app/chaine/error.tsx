'use client';

// Erreur dans une page de la chaîne (2026-10-10, « jouer la grille 39 : This page couldn't load ») : au lieu de la page blanche de
// Next, le message réel (erreurs du navigateur : texte complet ; erreurs du serveur : identifiant à transmettre) et deux sorties.
import { useEffect } from 'react';
import Link from 'next/link';

export default function ErreurChaine({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div role="alert" className="grid gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
      <p className="text-base font-semibold">Cette étape a rencontré une erreur.</p>
      <p>Vos votes déjà validés sont enregistrés. Copiez le message ci-dessous à Claude :</p>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-neutral-900 ring-1 ring-amber-200 [overflow-wrap:anywhere]" data-erreur-chaine="">
        {`${error.name}: ${error.message}${error.digest ? `\nidentifiant : ${error.digest}` : ''}${error.stack ? `\n${error.stack.split('\n').slice(1, 6).join('\n')}` : ''}`}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => retry()} className="min-h-12 rounded-xl bg-teal-800 px-5 font-semibold text-white">Réessayer</button>
        <Link href="/chaine" className="inline-flex min-h-12 items-center rounded-xl border border-neutral-300 bg-white px-5 font-semibold">Retour au tableau</Link>
      </div>
    </div>
  );
}
