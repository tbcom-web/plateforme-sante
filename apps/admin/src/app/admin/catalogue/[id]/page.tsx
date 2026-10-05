import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditeurSoin from './EditeurSoin';
import Propagation from '@/components/Propagation';

export const metadata = { title: 'Super admin · Modifier un soin' };

export default async function ModifierSoin({ params }: PageProps<'/admin/catalogue/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: soin } = await supabase
    .from('soins_catalogue')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!soin) notFound();

  return (
    <div>
      <Link href="/admin/catalogue" className="text-sm text-teal-800">← Catalogue</Link>
      <h1 className="mt-2 text-2xl font-bold">{soin.titre_court}</h1>
      <p className="text-sm text-neutral-500">Adresse de la page sur chaque site : /soins/{soin.slug}</p>
      <EditeurSoin soin={{ ...soin, icone: soin.icone ?? '' }} />
      <section className="mt-8">
        <h2 className="font-semibold">Mettre à jour les sites en ligne</h2>
        <p className="mb-2 mt-1 text-sm text-neutral-600">Après enregistrement, republiez les sites qui proposent ce soin pour qu’ils affichent le nouveau texte.</p>
        <Propagation cible={{ soin: soin.slug }} libelle="ce soin" />
      </section>
    </div>
  );
}
