'use client';

import { useState, useTransition } from 'react';
import { THEMES_FLUX } from '@plateforme/core';
import { diffuserArticle, enregistrerArticle, type ChampsArticle, type Resultat } from '../actions';

const champ = 'w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';

type Props = { id: string | null; article: ChampsArticle & { statut: string } };

export default function EditeurArticle({ id, article }: Props) {
  const [v, setV] = useState<ChampsArticle>({
    titre: article.titre,
    resume: article.resume,
    corps: article.corps,
    theme: article.theme,
    date_publication: article.date_publication,
  });
  const [resultat, setResultat] = useState<Resultat>(null);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof ChampsArticle, valeur: string) => setV((x) => ({ ...x, [k]: valeur }));

  return (
    <form
      className="mt-6 grid gap-5 rounded-2xl border border-black/5 bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => setResultat(await enregistrerArticle(id, v)));
      }}
    >
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Titre</span>
        <input className={champ} value={v.titre} onChange={(e) => maj('titre', e.target.value)} placeholder="Préparer ses pieds avant une course à pied" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Thème</span>
          <select className={champ} value={v.theme} onChange={(e) => maj('theme', e.target.value)}>
            {THEMES_FLUX.map((th) => <option key={th}>{th}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Date de publication</span>
          <input type="date" className={champ} value={v.date_publication} onChange={(e) => maj('date_publication', e.target.value)} />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Résumé (cartes et référencement)</span>
        <textarea rows={2} className={champ} value={v.resume} onChange={(e) => maj('resume', e.target.value)} />
        <span className="text-xs text-neutral-500">{v.resume.length} caractères · idéal entre 120 et 160</span>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Article (Markdown : ## titre, - liste, **gras**)</span>
        <textarea rows={18} className={`${champ} font-mono text-[13px]`} value={v.corps} onChange={(e) => maj('corps', e.target.value)} />
      </label>

      {resultat && (
        <div role="status" className={`rounded-lg p-3 text-sm ${resultat.ok ? 'bg-teal-50 text-teal-900' : 'bg-red-50 text-red-800'}`}>
          <p className="font-medium">{resultat.message}</p>
          {resultat.alertes && <ul className="mt-1 list-disc pl-5">{resultat.alertes.map((a) => <li key={a}>{a}</li>)}</ul>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-5">
        <button type="submit" disabled={enCours} className="rounded-lg border border-teal-800 px-5 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-60">
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {id && (
          <button
            type="button"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const e = await enregistrerArticle(id, v);
                setResultat(e?.ok ? await diffuserArticle(id) : e);
              })
            }
            className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
          >
            {article.statut === 'diffuse' ? 'Diffuser aux nouveaux abonnés' : 'Diffuser aux praticiens'}
          </button>
        )}
      </div>
    </form>
  );
}
