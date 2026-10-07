'use client';

// « Manques signalés » (Studio de recettes) : ce qui manque au directeur artistique pour composer des recettes vraiment
// harmonieuses (retours/MANQUES.md). Circuit : Paul décide « À faire » / « Pas utile » (journalisé : directeur_avis, 0035 ;
// sinon navigateur + export) → création par l'agent compétent → revue dans « Donner mon avis » → implémentation.
import { useEffect, useMemo, useState } from 'react';
import { dernieresDecisions, type AvisDirecteur, type ManqueSignale } from '@/lib/directeur-format';
import { journaliserAvisDirecteur } from './actions-directeur';
import { ajouterAvisLocal, avisLocaux } from './avis-locaux';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const bouton = `inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm ${focus}`;
const COULEUR_PRIORITE = { haute: 'bg-red-50 text-red-900 ring-red-200', moyenne: 'bg-amber-50 text-amber-900 ring-amber-200', basse: 'bg-neutral-50 text-neutral-700 ring-neutral-200' } as const;

/** **gras** → <strong> (seul formatage de MANQUES.md rendu ; le reste en texte) */
function Ligne({ texte }: { texte: string }) {
  const morceaux = texte.split(/\*\*([^*]+)\*\*/g);
  return <>{morceaux.map((m, i) => (i % 2 ? <strong key={i}>{m}</strong> : <span key={i}>{m.replace(/`/g, '')}</span>))}</>;
}

export default function ManquesSignales({ manques, avis }: { manques: ManqueSignale[]; avis: AvisDirecteur[] }) {
  const [locaux, setLocaux] = useState<AvisDirecteur[]>([]);
  useEffect(() => setLocaux(avisLocaux()), []);
  const [session, setSession] = useState<AvisDirecteur[]>([]);
  const decisions = useMemo(() => dernieresDecisions([...avis, ...locaux, ...session], 'manque'), [avis, locaux, session]);
  const [statut, setStatut] = useState<Record<string, string>>({});

  const decider = async (m: ManqueSignale, decision: 'a-faire' | 'pas-utile') => {
    const a: AvisDirecteur = { nature: 'manque', cle: m.id, decision, remarque: null, le: new Date().toISOString() };
    const r = await journaliserAvisDirecteur({ nature: 'manque', cle: m.id, decision }).catch(() => ({ ok: false, message: 'Connexion perdue.', migrationManquante: true }));
    if (r.ok) setSession((s) => [...s, a]);
    else if (r.migrationManquante) setLocaux(ajouterAvisLocal(a));
    setStatut((s) => ({ ...s, [m.id]: r.ok ? (decision === 'a-faire' ? 'Noté « À faire » : l’agent compétent s’en charge, vous le reverrez dans « Donner mon avis ».' : 'Noté « Pas utile ».') : r.migrationManquante ? 'Gardé dans ce navigateur (migration 0035 à exécuter).' : r.message }));
  };

  return (
    <section aria-labelledby="st-manques" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4">
      <div>
        <h2 id="st-manques" className="text-lg font-semibold">Manques signalés <span className="text-sm font-normal text-neutral-500">({manques.length})</span></h2>
        <p className="max-w-3xl text-sm text-neutral-600">Ce qui a manqué au directeur artistique pour composer des recettes vraiment harmonieuses. « À faire » : l’agent compétent le crée, vous le revoyez dans « Donner mon avis », puis il est intégré.</p>
      </div>
      {!manques.length ? <p className="text-sm text-neutral-500">Aucun manque signalé (retours/MANQUES.md).</p> : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {manques.map((m) => {
            const d = decisions[m.id];
            return (
              <li key={m.id} className={`grid min-w-0 content-start gap-2 rounded-xl border p-3 ${d?.decision === 'pas-utile' ? 'border-dashed border-neutral-300 opacity-70' : d?.decision === 'a-faire' ? 'border-teal-700' : 'border-black/10'}`}>
                <div className="flex items-start justify-between gap-2">
                  <strong className="min-w-0 break-words">{m.id} · {m.titre}</strong>
                  {m.priorite && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ring-1 ${COULEUR_PRIORITE[m.priorite]}`}>{m.priorite}</span>}
                </div>
                <ul className="grid gap-1 text-sm text-neutral-700">{m.lignes.map((l, i) => <li key={i} className="break-words"><Ligne texte={l} /></li>)}</ul>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => void decider(m, 'a-faire')} aria-pressed={d?.decision === 'a-faire'} className={`${bouton} ${d?.decision === 'a-faire' ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-teal-800 text-teal-900'}`}>À faire</button>
                  <button type="button" onClick={() => void decider(m, 'pas-utile')} aria-pressed={d?.decision === 'pas-utile'} className={`${bouton} ${d?.decision === 'pas-utile' ? 'border-neutral-700 bg-neutral-700 text-white' : 'border-neutral-300'}`}>Pas utile</button>
                </div>
                <p role="status" className="min-h-4 text-xs text-neutral-600">{statut[m.id] ?? ''}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
