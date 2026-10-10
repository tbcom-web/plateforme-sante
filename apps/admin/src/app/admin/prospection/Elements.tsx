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
        {(raisons ?? []).find((r) => r.k === 'besoin' && r.p > 0) && <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 font-semibold text-fuchsia-900">{(raisons ?? []).find((r) => r.k === 'besoin' && r.p > 0)!.l.split(' :')[0]}</span>}
        <span className="text-teal-800 underline group-open:hidden">Pourquoi ?</span>
      </summary>
      <div className="mt-2 grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-3">
        {([
          { titre: 'Pourquoi maintenant : besoin de se faire connaître', liste: (raisons ?? []).filter((r) => r.k === 'besoin') },
          { titre: 'Profil et accès', liste: parType('p').filter((r) => r.k !== 'besoin') },
          { titre: `Installation (${installation ?? 0} %)`, liste: parType('i') },
        ]).map((b) => (
          <div key={b.titre}>
            <p className="font-semibold">{b.titre}</p>
            <ul className="mt-1 grid gap-0.5">
              {b.liste.map((r, i) => <li key={i} className={`flex justify-between gap-2 ${r.p > 0 ? '' : 'text-neutral-500'}`}><span>{r.l}</span>{r.p > 0 && <span className="tabular-nums text-neutral-500">+{r.p}</span>}</li>)}
              {!b.liste.length && <li className="text-neutral-500">Aucun signal</li>}
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

/** Onglets de la prospection : praticiens, cabinets, actualités */
export function Onglets({ actif }: { actif: 'praticiens' | 'cabinets' | 'actualites' }) {
  const onglets = [
    { id: 'praticiens', href: '/admin/prospection', libelle: 'Praticiens' },
    { id: 'cabinets', href: '/admin/prospection/cabinets', libelle: 'Cabinets' },
    { id: 'actualites', href: '/admin/prospection/actualites', libelle: 'Actualités' },
  ] as const;
  return (
    <nav aria-label="Prospection" className="flex flex-wrap gap-2 text-sm">
      {onglets.map((o) => (
        <a key={o.id} href={o.href} aria-current={o.id === actif ? 'page' : undefined}
          className={`inline-flex min-h-10 items-center rounded-full border px-4 ${o.id === actif ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-300 bg-white hover:bg-teal-50'}`}>
          {o.libelle}
        </a>
      ))}
    </nav>
  );
}

const casse = (s: string | null | undefined) => String(s ?? '').toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

/** Phrase lisible d'un événement (prospection_evenements, 0058) */
export function phraseEvenement(e: { type: string; praticien: string | null; cabinet: string | null; commune: string | null; details: Record<string, string | number | null> }): string {
  const qui = casse(e.praticien) || 'Un praticien';
  const ou = [e.cabinet && casse(e.cabinet), e.commune && casse(e.commune)].filter(Boolean).join(', ');
  const d = e.details ?? {};
  switch (e.type) {
    case 'nouveau_cabinet': return `${qui} ouvre un nouveau cabinet${ou ? ` (${ou})` : ''}${d.role ? ` comme ${String(d.role).toLowerCase()}` : ''}.`;
    case 'arrivee': return `${qui} rejoint ${ou || 'un cabinet'}${d.role ? ` comme ${String(d.role).toLowerCase()}` : ''}${d.titulaires ? ` : titulaire ${casse(String(d.titulaires))}` : ''}.`;
    case 'depart': return `${qui} quitte ${ou || 'son cabinet'}${d.restent ? ` (${d.restent} confrère${Number(d.restent) > 1 ? 's' : ''} reste${Number(d.restent) > 1 ? 'nt' : ''})` : ''}.`;
    case 'fermeture': return `${qui}, dernier praticien connu, quitte ${ou || 'son cabinet'} : cabinet vidé ou repris sous un autre nom.`;
    case 'role': return `${qui} passe de ${String(d.avant ?? '?').toLowerCase()} à ${String(d.apres ?? '?').toLowerCase()}${ou ? ` (${ou})` : ''}.`;
    case 'demenagement': return `${qui} déménage${d.depuis_commune ? ` de ${casse(String(d.depuis_commune))}` : ''}${e.commune ? ` à ${casse(e.commune)}` : ''}.`;
    default: return `${qui} : ${e.type}`;
  }
}

export const couleurEvenement: Record<string, string> = {
  nouveau_cabinet: 'bg-teal-100 text-teal-900', arrivee: 'bg-sky-100 text-sky-900', depart: 'bg-amber-100 text-amber-900',
  fermeture: 'bg-neutral-200 text-neutral-800', role: 'bg-violet-100 text-violet-900', demenagement: 'bg-fuchsia-100 text-fuchsia-900',
};
