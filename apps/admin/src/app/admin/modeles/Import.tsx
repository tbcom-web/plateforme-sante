'use client';

import { useActionState, useState } from 'react';
import { importerModele, basculerModele, supprimerModele, type ResultatImport } from './actions';

export function Import({ exemple }: { exemple: string }) {
  const [etat, action, enCours] = useActionState<ResultatImport, FormData>(importerModele, null);
  const [texte, setTexte] = useState('');

  async function lireFichier(f: File | undefined) {
    if (f) setTexte(await f.text());
  }

  return (
    <form action={action} className="grid gap-3 rounded-xl border border-black/5 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Importer un modèle</h2>
        <div className="flex gap-2 text-sm">
          <label className="cursor-pointer rounded-lg px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">
            Choisir un fichier .json
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => lireFichier(e.target.files?.[0])} />
          </label>
          <button type="button" onClick={() => setTexte(exemple)} className="rounded-lg px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">
            Partir d’un exemple
          </button>
        </div>
      </div>
      <textarea
        name="manifeste"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={14}
        spellCheck={false}
        placeholder="Collez ici la fiche JSON du modèle…"
        className="w-full rounded-lg border border-neutral-300 p-3 font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={enCours || !texte.trim()} className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
          {enCours ? 'Vérification…' : 'Vérifier et importer'}
        </button>
        {etat && <p className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
      </div>
      {etat?.erreurs && (
        <ul className="list-disc pl-5 text-sm text-red-700">
          {etat.erreurs.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </form>
  );
}

export function ActionsModele({ id, actif }: { id: string; actif: boolean }) {
  return (
    <span className="flex gap-2">
      <button onClick={() => basculerModele(id, !actif)} className="rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-black/10 hover:bg-neutral-50">
        {actif ? 'Désactiver' : 'Activer'}
      </button>
      {!actif && (
        <button
          onClick={() => confirm('Supprimer ce modèle importé ?') && supprimerModele(id)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
        >
          Supprimer
        </button>
      )}
    </span>
  );
}
