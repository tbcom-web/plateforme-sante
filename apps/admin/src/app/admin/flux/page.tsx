import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Super admin · Flux de contenus' };

type Ligne = {
  id: string;
  titre: string;
  theme: string;
  statut: 'brouillon' | 'diffuse';
  date_publication: string;
  site_articles: { statut: string }[];
};

export default async function Flux() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('articles_flux')
    .select('id, titre, theme, statut, date_publication, site_articles(statut)')
    .order('date_publication', { ascending: false })
    .returns<Ligne[]>();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Flux de contenus</h1>
          <p className="mt-1 text-sm text-neutral-600">Les articles diffusés sont proposés aux praticiens abonnés au thème, puis publiés dans la rubrique Actualités de leur site.</p>
        </div>
        <Link href="/admin/flux/nouveau" className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900">Nouvel article</Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">Lecture impossible : la base de données n’est pas à jour (mise à jour 0009, flux, à installer).</p>}

      <ul className="mt-6 grid gap-2">
        {(data ?? []).length === 0 && !error && <li className="text-sm text-neutral-500">Aucun article pour le moment.</li>}
        {(data ?? []).map((a) => {
          const publies = a.site_articles.filter((s) => s.statut === 'publie').length;
          const attente = a.site_articles.filter((s) => s.statut === 'propose').length;
          return (
            <li key={a.id}>
              <Link href={`/admin/flux/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 hover:border-teal-700/40">
                <span>
                  <span className="block font-semibold">{a.titre}</span>
                  <span className="text-sm text-neutral-500">{a.theme} · {new Date(a.date_publication).toLocaleDateString('fr-FR')}</span>
                </span>
                <span className="flex items-center gap-3 text-xs">
                  {a.statut === 'diffuse' ? (
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 font-semibold text-teal-900">Diffusé · {publies} publié(s) · {attente} en attente</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900">Brouillon</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
