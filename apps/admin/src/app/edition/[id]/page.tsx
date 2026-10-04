import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { CHAMPS_TEXTE, normaliserDraft } from '@plateforme/core';
import { createClient, getUser } from '@/lib/supabase/server';
import EditeurVisuel from './EditeurVisuel';

export const metadata = { title: 'Édition visuelle' };

export default async function Edition({ params }: PageProps<'/edition/[id]'>) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect('/connexion');

  const supabase = await createClient();
  const { data: site } = await supabase.from('sites').select('id, slug, options, config').eq('id', id).maybeSingle();
  if (!site) notFound();
  const d = normaliserDraft(site.config);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-2.5 text-sm">
        <div className="flex items-center gap-3">
          <Link href="/tableau-de-bord" className="text-teal-800">← Tableau de bord</Link>
          <span className="font-semibold">Édition visuelle · {d.cabinet.nom || d.praticiens[0]?.nom || 'mon site'}</span>
        </div>
        <Link href="/mon-site" className="text-neutral-600 underline-offset-4 hover:underline">Informations du cabinet (formulaire)</Link>
      </header>
      <EditeurVisuel
        siteId={site.id}
        slug={site.slug}
        edition={Boolean((site.options as { edition?: boolean } | null)?.edition)}
        textesInitiaux={d.perso.textes}
        champs={CHAMPS_TEXTE}
      />
    </div>
  );
}
