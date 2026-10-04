import { normaliserDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { manques } from '@/lib/sites';
import ActionsSite from './ActionsSite';
import Propagation from '@/components/Propagation';

export const metadata = { title: 'Super admin · Sites' };

type Ligne = {
  id: string;
  slug: string | null;
  statut: 'brouillon' | 'en_ligne' | 'suspendu';
  test: boolean;
  options: { edition?: boolean } | null;
  domaine: string | null;
  published_at: string | null;
  publication_demandee_at: string | null;
  updated_at: string;
  config: unknown;
  profiles: { email: string } | null;
};

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const PASTILLES = {
  brouillon: 'bg-amber-100 text-amber-900',
  en_ligne: 'bg-teal-100 text-teal-900',
  suspendu: 'bg-neutral-200 text-neutral-700',
} as const;

export default async function AdminSites() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sites')
    .select('id, slug, statut, test, options, domaine, published_at, publication_demandee_at, updated_at, config, profiles(email)')
    .order('updated_at', { ascending: false })
    .returns<Ligne[]>();

  const sites = data ?? [];
  const compte = (s: Ligne['statut']) => sites.filter((x) => x.statut === s && !x.test).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Sites des praticiens</h1>
      <div className="mt-3">
        <p className="mb-2 text-sm text-neutral-600">Après une évolution de la charte, des dessins ou des animations (mise en ligne du code), appliquez-la aux sites déjà publiés :</p>
        <Propagation cible={{ tous: true }} libelle="la charte et les visuels communs" />
      </div>
      {error && <p className="mt-2 text-sm text-red-700">Lecture impossible : {error.message}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Sites', sites.length],
          ['En ligne (réels)', compte('en_ligne')],
          ['Brouillons', compte('brouillon')],
          ['Sites de test', sites.filter((s) => s.test).length],
        ].map(([label, valeur]) => (
          <div key={label} className="rounded-xl border border-black/5 bg-white p-4">
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className="text-2xl font-bold">{valeur}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Praticien</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Complétude</th>
              <th className="px-4 py-3">Publié le</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sites.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Aucun site pour le moment.</td></tr>
            )}
            {sites.map((s) => {
              const d = normaliserDraft(s.config);
              const p = d.praticiens[0];
              const reste = manques(s.config);
              return (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{[p?.prenom, p?.nom].filter(Boolean).join(' ') || '(sans nom)'}</p>
                    <p className="text-neutral-500">{d.cabinet.ville || '—'} · {d.pays} · {d.praticiens.length} prat. · {s.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PASTILLES[s.statut]}`}>{s.statut.replace('_', ' ')}</span>
                    {s.test && <span className="ml-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-900">test</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.domaine ? (
                      <a href={`https://${s.domaine}`} target="_blank" rel="noopener" className="text-teal-800 underline underline-offset-2">{s.domaine}</a>
                    ) : (
                      <span className="text-neutral-400">jamais publié</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {reste.length === 0 ? <span className="text-teal-800">Complet</span> : (
                      <span className="text-amber-800" title={reste.join(', ')}>{reste.length} manque(s)</span>
                    )}
                    <span className="mt-1 flex gap-3 text-xs font-semibold">
                      <a href={`/mon-site?site=${s.id}`} className="text-teal-800 underline-offset-4 hover:underline">Formulaire</a>
                      <a href={`/edition/${s.id}`} className="text-teal-800 underline-offset-4 hover:underline">Édition visuelle</a>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {date(s.published_at)}
                    {s.publication_demandee_at && (!s.published_at || s.publication_demandee_at > s.published_at) && (
                      <p className="text-xs text-amber-700">demandée {date(s.publication_demandee_at)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ActionsSite id={s.id} statut={s.statut} test={s.test} edition={Boolean((s.options as { edition?: boolean } | null)?.edition)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
