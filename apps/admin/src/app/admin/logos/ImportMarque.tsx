'use client';

import { useActionState, useState } from 'react';
import { basculerMarque, importerMarque, supprimerMarque, type ResultatMarque } from './actions';

const champ = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm';

export function ImportMarque() {
  const [etat, action, enCours] = useActionState<ResultatMarque, FormData>(importerMarque, null);
  const [svg, setSvg] = useState('');

  return (
    <form action={action} className="grid gap-3 rounded-xl border border-black/5 bg-white p-5">
      <h2 className="font-semibold">Importer une marque</h2>
      <p className="text-sm text-neutral-600">
        Fichier SVG avec un attribut <code>viewBox</code>, dessiné en formes simples. Le fichier est nettoyé : scripts, styles, images et textes
        sont supprimés ; la couleur la plus foncée devient la couleur du cabinet, les autres une teinte adoucie.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="id" required pattern="[a-z0-9-]{3,40}" placeholder="identifiant (ex. talon-trait)" className={champ} />
        <input name="nom" required maxLength={40} placeholder="Nom affiché" className={champ} />
        <input name="sens" maxLength={200} placeholder="Idée métier (facultatif)" className={champ} />
      </div>
      <label className="w-fit cursor-pointer rounded-lg px-3 py-1.5 text-sm ring-1 ring-black/10 hover:bg-neutral-50">
        Choisir un fichier .svg
        <input type="file" accept="image/svg+xml,.svg" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setSvg(await f.text()); }} />
      </label>
      <textarea name="svg" value={svg} onChange={(e) => setSvg(e.target.value)} rows={6} placeholder="…ou collez le code SVG" className={`${champ} font-mono text-xs`} />
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={enCours || !svg.trim()} className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {enCours ? 'Vérification…' : 'Nettoyer et importer'}
        </button>
        {etat && <p className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
      </div>
      {etat?.erreurs && <ul className="list-disc pl-5 text-sm text-red-700">{etat.erreurs.map((e) => <li key={e}>{e}</li>)}</ul>}
    </form>
  );
}

export function ActionsMarque({ id, actif }: { id: string; actif: boolean }) {
  return (
    <span className="flex gap-2">
      <button onClick={() => basculerMarque(id, !actif)} className="rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-black/10 hover:bg-neutral-50">
        {actif ? 'Désactiver' : 'Activer'}
      </button>
      {!actif && (
        <button onClick={() => confirm('Supprimer cette marque ?') && supprimerMarque(id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
          Supprimer
        </button>
      )}
    </span>
  );
}
