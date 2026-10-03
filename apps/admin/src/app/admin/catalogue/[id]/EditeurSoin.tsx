'use client';

import { useState, useTransition } from 'react';
import { enregistrerSoin, type ChampsSoin, type Resultat } from '../../actions';

type Props = { soin: ChampsSoin & { id: string } };

const champ = 'w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';

export default function EditeurSoin({ soin }: Props) {
  const [v, setV] = useState<ChampsSoin>({
    titre_court: soin.titre_court,
    titre: soin.titre,
    resume: soin.resume,
    corps: soin.corps,
    faq: soin.faq,
  });
  const [resultat, setResultat] = useState<Resultat>(null);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof ChampsSoin, valeur: ChampsSoin[keyof ChampsSoin]) => setV((x) => ({ ...x, [k]: valeur }));

  return (
    <form
      className="mt-6 grid gap-5 rounded-2xl border border-black/5 bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => setResultat(await enregistrerSoin(soin.id, v)));
      }}
    >
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Titre court (menus, cartes)</span>
        <input className={champ} value={v.titre_court} onChange={(e) => maj('titre_court', e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Titre de la page (H1, balise title)</span>
        <input className={champ} value={v.titre} onChange={(e) => maj('titre', e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Résumé (meta description, cartes)</span>
        <textarea rows={2} className={champ} value={v.resume} onChange={(e) => maj('resume', e.target.value)} />
        <span className="text-xs text-neutral-500">{v.resume.length} caractères · idéal entre 120 et 160</span>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Texte de la page (Markdown : ## titre, - liste, **gras**)</span>
        <textarea rows={16} className={`${champ} font-mono text-[13px]`} value={v.corps} onChange={(e) => maj('corps', e.target.value)} />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Questions fréquentes</legend>
        {v.faq.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-neutral-50 p-3">
            <input
              className={champ}
              placeholder="Question"
              value={f.q}
              onChange={(e) => maj('faq', v.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
            />
            <textarea
              rows={2}
              className={champ}
              placeholder="Réponse"
              value={f.r}
              onChange={(e) => maj('faq', v.faq.map((x, j) => (j === i ? { ...x, r: e.target.value } : x)))}
            />
            <button type="button" className="justify-self-end text-xs text-red-700" onClick={() => maj('faq', v.faq.filter((_, j) => j !== i))}>
              Supprimer cette question
            </button>
          </div>
        ))}
        <button type="button" className="justify-self-start text-sm font-semibold text-teal-800" onClick={() => maj('faq', [...v.faq, { q: '', r: '' }])}>
          + Ajouter une question
        </button>
      </fieldset>

      <div className="flex items-center gap-4 border-t border-neutral-100 pt-5">
        <button type="submit" disabled={enCours} className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {resultat && <p role="status" className={`text-sm ${resultat.ok ? 'text-teal-800' : 'text-red-700'}`}>{resultat.message}</p>}
      </div>
    </form>
  );
}
