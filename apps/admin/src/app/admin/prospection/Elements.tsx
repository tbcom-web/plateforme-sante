import { libelleSpecialite, type Raison } from '@plateforme/core';

// Éléments d'affichage partagés par la liste et la fiche praticien de la prospection (scores 0057).

export const jour = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

const teinte = (n: number) => (n >= 70 ? 'bg-teal-800 text-white' : n >= 40 ? 'bg-teal-100 text-teal-900' : 'bg-neutral-100 text-neutral-700');

/** Score de prospection et confiance d'installation, avec le détail des points */
export function Scores({ prospect, installation, raisons }: { prospect: number | null | undefined; installation: number | null | undefined; raisons: Raison[] | null | undefined }) {
  if (prospect == null && installation == null) return null;
  const parType = (t: Raison['t']) => (raisons ?? []).filter((r) => r.t === t);
  return (
    <details className="group text-xs">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 font-bold tabular-nums ${teinte(prospect ?? 0)}`} title="Intérêt commercial (0-100)">Score {prospect ?? 0}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 tabular-nums text-neutral-700" title="Confiance d'une installation récente à une nouvelle adresse">Installation {installation ?? 0} %</span>
        <span className="text-teal-800 underline group-open:hidden">Pourquoi ?</span>
      </summary>
      <div className="mt-2 grid gap-2 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2">
        {(['i', 'p'] as const).map((t) => (
          <div key={t}>
            <p className="font-semibold">{t === 'i' ? 'Installation' : 'Intérêt commercial'}</p>
            <ul className="mt-1 grid gap-0.5">
              {parType(t).map((r, i) => <li key={i} className="flex justify-between gap-2"><span>{r.l}</span>{r.p > 0 && <span className="tabular-nums text-neutral-500">+{r.p}</span>}</li>)}
              {!parType(t).length && <li className="text-neutral-500">Aucun signal</li>}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

export function Specialites({ ids }: { ids: string[] | null | undefined }) {
  const liste = (ids ?? []).filter(Boolean);
  if (!liste.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {liste.map((s) => <span key={s} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900 ring-1 ring-amber-200">{libelleSpecialite(s)}</span>)}
    </span>
  );
}

/** « Kinés : 2 · Médecin : 1 » : autres professions de santé à la même adresse */
export const autresProfessions = (a: Record<string, number> | null | undefined) =>
  a && Object.keys(a).length ? Object.entries(a).sort((x, y) => y[1] - x[1]).map(([p, n]) => `${p} : ${n}`).join(' · ') : '';
