'use client';

import { useState, useTransition } from 'react';
import { basculerEdition, basculerTest, changerStatut, publierCommeAdmin, type Resultat } from './actions';

type Statut = 'brouillon' | 'en_ligne' | 'suspendu';

export default function ActionsSite({ id, statut, test, edition }: { id: string; statut: Statut; test: boolean; edition: boolean }) {
  const [resultat, setResultat] = useState<Resultat>(null);
  const [enCours, demarrer] = useTransition();
  const lancer = (f: () => Promise<Resultat>) => demarrer(async () => setResultat(await f()));

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={enCours}
          onClick={() => lancer(() => publierCommeAdmin(id))}
          className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
        >
          Publier
        </button>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            className="accent-violet-700"
            checked={test}
            disabled={enCours}
            onChange={(e) => lancer(() => basculerTest(id, e.target.checked))}
          />
          Test
        </label>
        <label className="flex items-center gap-1.5 text-xs" title="Option payante : textes guidés de l’éditeur visuel et ajout de pages">
          <input
            type="checkbox"
            className="accent-amber-600"
            checked={edition}
            disabled={enCours}
            onChange={(e) => lancer(() => basculerEdition(id, e.target.checked))}
          />
          Édition
        </label>
        <select
          aria-label="Statut"
          value={statut}
          disabled={enCours}
          onChange={(e) => lancer(() => changerStatut(id, e.target.value as Statut))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
        >
          <option value="brouillon">brouillon</option>
          <option value="en_ligne">en ligne</option>
          <option value="suspendu">suspendu</option>
        </select>
      </div>
      {resultat && <p className={`text-xs ${resultat.ok ? 'text-teal-800' : 'text-red-700'}`}>{resultat.message}</p>}
    </div>
  );
}
