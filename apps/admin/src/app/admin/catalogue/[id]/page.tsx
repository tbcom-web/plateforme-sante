import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditeurSoin from './EditeurSoin';

export const metadata = { title: 'Super admin · Modifier un soin' };

export default async function ModifierSoin({ params }: PageProps<'/admin/catalogue/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: soin } = await supabase
    .from('soins_catalogue')
    .select('id, slug, titre_court, titre, resume, corps, faq')
    .eq('id', id)
    .maybeSingle();
  if (!soin) notFound();

  return (
    <div>
      <Link href="/admin/catalogue" className="text-sm text-teal-800">← Catalogue</Link>
      <h1 className="mt-2 text-2xl font-bold">{soin.titre_court}</h1>
      <p className="text-sm text-neutral-500">Adresse de la page sur chaque site : /soins/{soin.slug}</p>
      <EditeurSoin soin={soin} />
    </div>
  );
}
