import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditeurArticle from './EditeurArticle';

export const metadata = { title: 'Super admin · Article' };

export default async function Article({ params }: PageProps<'/admin/flux/[id]'>) {
  const { id } = await params;
  let article = { titre: '', resume: '', corps: '', theme: 'Prévention', date_publication: new Date().toISOString().slice(0, 10), statut: 'brouillon' };

  if (id !== 'nouveau') {
    const supabase = await createClient();
    const { data } = await supabase.from('articles_flux').select('titre, resume, corps, theme, date_publication, statut').eq('id', id).maybeSingle();
    if (!data) notFound();
    article = data;
  }

  return (
    <div>
      <Link href="/admin/flux" className="text-sm text-teal-800">← Flux de contenus</Link>
      <h1 className="mt-2 text-2xl font-bold">{id === 'nouveau' ? 'Nouvel article' : article.titre}</h1>
      <p className="text-sm text-neutral-500">
        Utilisez <code className="rounded bg-neutral-100 px-1">{'{ville}'}</code> pour insérer la ville de chaque praticien. Le texte est contrôlé par le lexique de la profession (niveau strict).
      </p>
      <EditeurArticle id={id === 'nouveau' ? null : id} article={article} />
    </div>
  );
}
