'use client';

// Choix du profil du composeur : profils de pratique (un toucher) ou composition libre « principal + secondaires + activités ».
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Props = {
  references: { id: string; nom: string }[];
  themes: { id: string; nom: string }[];
  activites: { id: string; nom: string; themes: string[] }[];
  actuel: string;
};

export default function ChoixProfil({ references, themes, activites, actuel }: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [principal, setPrincipal] = useState(themes[0]?.id ?? '');
  const [secondaires, setSecondaires] = useState<string[]>([]);
  const [acts, setActs] = useState<string[]>([]);
  const choisis = [principal, ...secondaires.filter((s) => s !== principal)];
  const possibles = activites.filter((a) => a.themes.some((t) => choisis.includes(t)));
  const cle = `${choisis.join('+')}${acts.filter((a) => possibles.some((p) => p.id === a)).length ? `~${acts.filter((a) => possibles.some((p) => p.id === a)).join('.')}` : ''}`;
  const aller = (p: string) => demarrer(() => router.push(`/chaine/composer?profil=${encodeURIComponent(p)}`));
  const basculer = (l: string[], v: string, max = 3) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v].slice(-max));

  return (
    <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3" aria-busy={enCours}>
      <div>
        <p className="text-sm font-semibold">Un cabinet type</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {references.map((r) => (
            <li key={r.id}>
              <Link href={`/chaine/composer?profil=${r.id}`} onClick={(e) => { e.preventDefault(); aller(r.id); }} aria-current={actuel === r.id ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${actuel === r.id ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white hover:bg-teal-50'} ${focus}`} data-profil-reference={r.id}>{r.nom}</Link>
            </li>
          ))}
        </ul>
      </div>
      <details open={!actuel || !references.some((r) => r.id === actuel)} className="text-sm">
        <summary className="min-h-11 cursor-pointer font-semibold">Ou composer un profil (ex. Sport + Diabète)</summary>
        <div className="mt-2 grid gap-3">
          <label className="grid gap-1">Thème principal
            <select value={principal} onChange={(e) => { setPrincipal(e.target.value); setSecondaires((l) => l.filter((x) => x !== e.target.value)); }} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm ${focus}`} data-champ="principal">
              {themes.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
          </label>
          <fieldset className="grid gap-1">
            <legend>Aussi (thèmes secondaires)</legend>
            <div className="flex flex-wrap gap-2">
              {themes.filter((t) => t.id !== principal).map((t) => (
                <button key={t.id} type="button" aria-pressed={secondaires.includes(t.id)} onClick={() => setSecondaires((l) => basculer(l, t.id, 2))}
                  className={`min-h-11 rounded-full border px-3 ${secondaires.includes(t.id) ? 'border-teal-800 bg-teal-50 font-semibold text-teal-900' : 'border-neutral-300 bg-white'} ${focus}`} data-secondaire={t.id}>{t.nom}</button>
              ))}
            </div>
          </fieldset>
          {possibles.length > 0 && (
            <fieldset className="grid gap-1">
              <legend>Activités mises en avant (3 au plus)</legend>
              <div className="flex flex-wrap gap-2">
                {possibles.map((a) => (
                  <button key={a.id} type="button" aria-pressed={acts.includes(a.id)} onClick={() => setActs((l) => basculer(l, a.id))}
                    className={`min-h-11 rounded-full border px-3 ${acts.includes(a.id) ? 'border-teal-800 bg-teal-50 font-semibold text-teal-900' : 'border-neutral-300 bg-white'} ${focus}`} data-activite={a.id}>{a.nom}</button>
                ))}
              </div>
            </fieldset>
          )}
          <button type="button" onClick={() => aller(cle)} disabled={!principal || enCours} className={`min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white disabled:opacity-50 ${focus}`} data-action="composer">Proposer des modèles</button>
        </div>
      </details>
      {enCours && <p role="status" className="text-sm text-neutral-700">Le composeur assemble les plus beaux modèles pour ce profil…</p>}
    </div>
  );
}
