import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { articlesDesPacks } from '@/lib/packs-contenus';
import { importerArticlePack } from './actions';

export const metadata = { title: 'Super admin · Flux de contenus' };

type Ligne = {
  id: string;
  titre: string;
  theme: string;
  statut: 'brouillon' | 'diffuse';
  date_publication: string;
  site_articles: { statut: string }[];
};

const ETATS_ARTICLE = { en_attente: 'À relire dans les Arrivages', accepte: 'Accepté', a_retravailler: 'À retravailler', refuse: 'Refusé' } as const;
const MESSAGES_IMPORT: Record<string, string> = {
  refuse: 'Import impossible : l’article doit d’abord être accepté dans les Arrivages (texte actuel).',
  lexique: 'Import impossible : le texte contient des formulations à revoir.',
  echec: 'Import impossible : la base de données est-elle à jour (mise à jour 0009, flux) ?',
};

export default async function Flux({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('articles_flux')
    .select('id, titre, theme, statut, date_publication, site_articles(statut)')
    .order('date_publication', { ascending: false })
    .returns<Ligne[]>();
  // Articles pré-écrits des packs de contenus : importables en brouillon une fois acceptés dans les Arrivages
  const [packs, { data: slugs }] = await Promise.all([articlesDesPacks(), supabase.from('articles_flux').select('slug').returns<{ slug: string }[]>()]);
  const importes = new Set((slugs ?? []).map((x) => x.slug));
  const aImporter = packs.filter((a) => !importes.has(a.slug));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Flux de contenus</h1>
          <p className="mt-1 text-sm text-neutral-600">Les articles diffusés sont proposés aux praticiens abonnés au thème, puis publiés dans la rubrique Actualités de leur site.</p>
        </div>
        <Link href="/admin/flux/nouveau" className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900">Nouvel article</Link>
      </div>

      {sp.import && MESSAGES_IMPORT[sp.import] && <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">{MESSAGES_IMPORT[sp.import]}</p>}

      {aImporter.length > 0 && (
        <section aria-labelledby="articles-packs" className="mt-6 grid gap-2 rounded-2xl border border-black/5 bg-white p-4">
          <h2 id="articles-packs" className="font-semibold">Articles pré-écrits à importer</h2>
          <p className="text-sm text-neutral-600">Rédigés dans les packs de contenus. Relisez-les dans les <Link href="/admin/arrivages?type=contenus" className="font-semibold text-teal-800 underline">Arrivages</Link> ; une fois acceptés, importez-les en brouillon, ajoutez l’image, puis diffusez.</p>
          <ul className="grid gap-2">
            {aImporter.map((a) => (
              <li key={a.cle} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 p-3">
                <span>
                  <span className="block font-semibold">{a.titre}</span>
                  <span className="text-sm text-neutral-500">{a.theme} · {ETATS_ARTICLE[a.etat]}</span>
                </span>
                {a.etat === 'accepte' ? (
                  <form action={importerArticlePack.bind(null, a.cle)}>
                    <button type="submit" className="min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900">Importer en brouillon</button>
                  </form>
                ) : (
                  <Link href="/admin/arrivages?type=contenus" className="min-h-11 content-center rounded-lg px-3 text-sm font-semibold text-teal-800 ring-1 ring-teal-800/30">Relire</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

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
