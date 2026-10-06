import Link from 'next/link';
import { libelleStatutCommercial, STATUTS_COMMERCIAUX } from '@plateforme/core';
import { lireLeads, type Lead } from '@/lib/leads';
import { dateCourte } from '@/lib/libelles';
import { jourCourt } from '@/lib/essai';

export const metadata = { title: 'Super admin · Essais' };

// Back-office commercial : essais gratuits (leads), relances « à faire aujourd'hui » calculées par le moteur de
// planification (packages/core/src/essai.ts). Aucun e-mail n'est envoyé : la commerciale relance elle-même.

const FILTRES = {
  actifs: 'En cours',
  a_faire: 'À faire aujourd’hui',
  demandes: 'Mise en ligne demandée',
  fin_proche: 'Fin dans 15 jours',
  tous: 'Tous',
} as const;
type Filtre = keyof typeof FILTRES;

const clos = (l: Lead) => Boolean(l.valideLe) || l.statutCommercial === 'perdu' || l.statutCommercial === 'gagne';

function filtrer(leads: Lead[], filtre: Filtre, statut: string, q: string): Lead[] {
  const recherche = q.toLowerCase();
  return leads.filter((l) => {
    if (filtre === 'actifs' && (clos(l) || l.suspenduLe)) return false;
    if (filtre === 'a_faire' && !l.aFaire.length && !(l.miseEnLigneDemandeeLe && !l.valideLe)) return false;
    if (filtre === 'demandes' && !(l.miseEnLigneDemandeeLe && !l.valideLe)) return false;
    if (filtre === 'fin_proche' && (clos(l) || l.joursRestants > 15 || l.suspenduLe)) return false;
    if (statut && l.statutCommercial !== statut) return false;
    if (recherche && ![l.prenom, l.nom, l.ville, l.email, l.site?.nomCabinet ?? ''].join(' ').toLowerCase().includes(recherche)) return false;
    return true;
  });
}

const pastille: Record<string, string> = {
  nouveau: 'bg-sky-100 text-sky-900', contacte: 'bg-amber-100 text-amber-900', rendez_vous: 'bg-violet-100 text-violet-900', gagne: 'bg-teal-100 text-teal-900', perdu: 'bg-neutral-200 text-neutral-700',
};

export default async function Leads({ searchParams }: PageProps<'/admin/leads'>) {
  const p = await searchParams;
  const filtre: Filtre = typeof p.filtre === 'string' && p.filtre in FILTRES ? (p.filtre as Filtre) : 'actifs';
  const statut = typeof p.statut === 'string' && STATUTS_COMMERCIAUX.some((s) => s.id === p.statut) ? p.statut : '';
  const q = typeof p.q === 'string' ? p.q.slice(0, 80) : '';
  const leads = await lireLeads();

  if (!leads) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
        <h1 className="text-xl font-bold">Essais</h1>
        <p className="mt-2">La base n’a pas encore reçu la mise à jour <code>0023_essais_leads.sql</code> (voir docs/onboarding-lead.md).</p>
      </div>
    );
  }

  const aFaire = leads.filter((l) => l.aFaire.length || (l.miseEnLigneDemandeeLe && !l.valideLe && !l.suspenduLe));
  const liste = filtrer(leads, filtre, statut, q);
  const lien = (f: Filtre) => `/admin/leads?${new URLSearchParams({ filtre: f, ...(statut ? { statut } : {}), ...(q ? { q } : {}) })}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Essais gratuits</h1>
          <p className="text-sm text-neutral-600">{leads.length} essai{leads.length > 1 ? 's' : ''} · version d’essai en aperçu privé, mise en ligne publique après validation.</p>
        </div>
        <a href="/essai" target="_blank" rel="noopener" className="text-sm font-semibold text-teal-800 underline">Page d’essai ↗</a>
      </div>

      <section aria-labelledby="titre-a-faire" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <h2 id="titre-a-faire" className="font-semibold">À faire aujourd’hui ({aFaire.length})</h2>
        {aFaire.length ? (
          <ul className="mt-3 grid gap-2 text-sm">
            {aFaire.map((l) => (
              <li key={l.owner} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={`/admin/leads/${l.owner}`} className="font-semibold text-teal-900 underline">{`${l.prenom} ${l.nom}`.trim() || l.email}</Link>
                <span className="text-neutral-700">
                  {[
                    l.miseEnLigneDemandeeLe && !l.valideLe ? 'Mise en ligne demandée : vérifier puis valider' : null,
                    ...l.aFaire.map((r) => (r.action === 'suspendre' ? `${r.libelle}` : `${r.libelle} (prévue le ${jourCourt(r.date)})`)),
                  ].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">Rien à faire aujourd’hui.</p>
        )}
      </section>

      <form className="flex flex-wrap items-end gap-3 text-sm" action="/admin/leads">
        <input type="hidden" name="filtre" value={filtre} />
        <label className="grid gap-1">
          <span className="font-medium">Recherche</span>
          <input name="q" defaultValue={q} placeholder="Nom, ville, e-mail" className="min-h-10 rounded-lg border border-neutral-300 px-2" />
        </label>
        <label className="grid gap-1">
          <span className="font-medium">Statut commercial</span>
          <select name="statut" defaultValue={statut} className="min-h-10 rounded-lg border border-neutral-300 px-2">
            <option value="">Tous</option>
            {STATUTS_COMMERCIAUX.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-10 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">Filtrer</button>
      </form>

      <nav aria-label="Filtres" className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(FILTRES) as Filtre[]).map((f) => (
          <Link key={f} href={lien(f)} aria-current={f === filtre ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 ring-1 ring-black/10 ${f === filtre ? 'bg-teal-800 text-white' : 'bg-white hover:bg-neutral-50'}`}>
            {FILTRES[f]}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Inscription</th>
              <th className="px-3 py-2">Praticien</th>
              <th className="px-3 py-2">Ville</th>
              <th className="px-3 py-2">Parcours</th>
              <th className="px-3 py-2">Version d’essai</th>
              <th className="px-3 py-2">Jours restants</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Prochaine relance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {liste.map((l) => (
              <tr key={l.owner} className="align-top">
                <td className="px-3 py-2 whitespace-nowrap">{dateCourte(l.debut)}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/leads/${l.owner}`} className="font-semibold text-teal-900 underline">{`${l.prenom} ${l.nom}`.trim() || '—'}</Link>
                  <div className="text-xs text-neutral-500">{l.email}</div>
                </td>
                <td className="px-3 py-2">{l.ville || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true"><div className="h-full bg-teal-700" style={{ width: `${l.progression}%` }} /></div>
                    <span>{l.progression} %</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {l.suspenduLe ? <span className="text-neutral-500">Suspendue</span> : l.lienApercu ? <a href={l.lienApercu} target="_blank" rel="noopener" className="text-teal-800 underline">Voir ↗</a> : '—'}
                  {l.valideLe && <div className="text-xs text-teal-800">Validé le {dateCourte(l.valideLe)}</div>}
                  {l.miseEnLigneDemandeeLe && !l.valideLe && <div className="text-xs font-semibold text-amber-800">Mise en ligne demandée</div>}
                </td>
                <td className="px-3 py-2">{l.paiementStatut === 'paye' ? 'Payé' : l.valideLe ? '—' : l.joursRestants}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pastille[l.statutCommercial] ?? ''}`}>{libelleStatutCommercial(l.statutCommercial)}</span></td>
                <td className="px-3 py-2">
                  {l.prochaine ? (
                    <span className={l.prochaine.aFaire ? 'font-semibold text-amber-800' : ''}>{jourCourt(l.prochaine.date)}<span className="block text-xs font-normal text-neutral-500">{l.prochaine.libelle}</span></span>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {!liste.length && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-neutral-500">Aucun essai pour ce filtre.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
