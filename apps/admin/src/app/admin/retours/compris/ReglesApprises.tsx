'use client';

// Règles apprises (regles-apprises.ts) : constat, preuves, effet, exemples ; « Désactiver » / « Réactiver » (journal 0054, sinon cookie).
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { RegleApprise } from '@plateforme/core';
import { basculerRegle } from '../actions-politique';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const LIBELLES_SOURCES: Record<string, string> = { note: 'notes', recette: 'recettes', duel: 'duels', grille: 'grilles', arrivage: 'Arrivages', ticket: 'tickets', kit: 'kits', atelier: 'atelier' };
const virgule = (x: number) => x.toFixed(2).replace('.', ',');

type Regle = Omit<RegleApprise, 'exemples'> & { exemples: { cle: string; titre: string }[] };

export default function ReglesApprises({ regles }: { regles: Regle[] }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [enCours, demarrer] = useTransition();
  const basculer = (r: Regle) => demarrer(async () => {
    const x = await basculerRegle(r.id, r.desactivee).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage(x.message);
    router.refresh();
  });
  return (
    <div className="grid gap-3">
      <ul className="grid gap-3 lg:grid-cols-2">
        {regles.map((r) => (
          <li key={r.id} className={`grid gap-2 rounded-2xl border bg-white p-4 ${r.desactivee ? 'border-dashed border-neutral-300 opacity-75' : 'border-black/5'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="grid gap-0.5">
                <span className="font-semibold text-teal-950">{r.action}</span>
                <span className="text-sm text-neutral-600">{r.constat}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.desactivee ? 'bg-neutral-100 text-neutral-700' : r.type === 'ecarter' ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'}`}>
                {r.desactivee ? 'Désactivée' : r.type === 'ecarter' ? 'Écarté' : `${virgule(r.effet)} ★`}
              </span>
            </div>
            <p className="text-sm text-neutral-700">Vise : {r.portee}.</p>
            <p className="text-xs text-neutral-600">
              Appuyée par {r.support} retour{r.support > 1 ? 's' : ''} ({Math.round(r.coherence * 100)} % de cohérence){r.contre ? `, ${r.contre} avis contraire${r.contre > 1 ? 's' : ''}` : ''} · {r.sources.map((s) => LIBELLES_SOURCES[s] ?? s).join(', ')}
            </p>
            {r.exemples.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Exemples">
                {r.exemples.map((e) => <li key={e.cle} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800" title={e.cle}>{e.titre}</li>)}
              </ul>
            )}
            <div>
              <button type="button" disabled={enCours} onClick={() => basculer(r)}
                className={`min-h-10 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50 ${r.desactivee ? 'border-teal-700 text-teal-900' : 'border-neutral-300 text-neutral-800'} ${focus}`}>
                {r.desactivee ? 'Réactiver' : 'Désactiver'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {message && <p role="status" className="text-sm text-neutral-700">{message}</p>}
    </div>
  );
}
