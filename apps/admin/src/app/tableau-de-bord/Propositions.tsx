'use client';

import { useState, useTransition } from 'react';
import { deciderArticle, type Proposition } from './flux';

export default function Propositions({ items }: { items: Proposition[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const decider = (id: string, statut: 'publie' | 'ignore') =>
    demarrer(async () => setMessage((await deciderArticle(id, statut)).message));

  const enAttente = items.filter((i) => i.statut === 'propose' && i.article);
  const publies = items.filter((i) => i.statut === 'publie' && i.article);

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6">
      <h2 className="font-semibold">Actualités de votre site</h2>
      <p className="mt-1 text-sm text-neutral-600">Des articles rédigés pour la profession, à relayer sur votre site en un clic.</p>

      {enAttente.length === 0 && publies.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">Aucun article pour le moment. Les prochains vous seront proposés ici.</p>
      )}

      {enAttente.length > 0 && (
        <ul className="mt-4 grid gap-3">
          {enAttente.map((p) => (
            <li key={p.article_id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Nouveau · {p.article!.theme}</p>
              <p className="mt-1 font-semibold">{p.article!.titre}</p>
              <p className="mt-1 text-sm text-neutral-600">{p.article!.resume}</p>
              <div className="mt-3 flex gap-2">
                <button disabled={enCours} onClick={() => decider(p.article_id, 'publie')} className="rounded-lg bg-teal-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
                  Publier sur mon site
                </button>
                <button disabled={enCours} onClick={() => decider(p.article_id, 'ignore')} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">
                  Ignorer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {publies.length > 0 && (
        <>
          <p className="mt-5 text-sm font-medium">Publiés sur votre site</p>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {publies.map((p) => (
              <li key={p.article_id} className="flex items-center justify-between gap-3">
                <span>{p.article!.titre}</span>
                <button disabled={enCours} onClick={() => decider(p.article_id, 'ignore')} className="shrink-0 text-xs text-red-700 disabled:opacity-50">Retirer</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {message && <p role="status" className="mt-3 text-sm text-teal-800">{message}</p>}
    </section>
  );
}
