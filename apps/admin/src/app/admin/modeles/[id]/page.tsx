import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MODELES_INTEGRES, validerManifeste, type ModeleManifeste } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import Propagation from '@/components/Propagation';
import EditeurModele from './EditeurModele';

export const metadata = { title: 'Super admin · Modifier un modèle' };

export default async function ModifierModele({ params }: PageProps<'/admin/modeles/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ligne } = await supabase.from('modeles').select('manifeste, actif').eq('id', id).maybeSingle();
  const integre = MODELES_INTEGRES.find((m) => m.id === id);
  // Version en base (importée ou modifiée) en priorité, sinon le modèle intégré.
  const enBase = ligne ? validerManifeste(ligne.manifeste).modele : undefined;
  const modele: ModeleManifeste | undefined = enBase ?? integre;
  if (!modele) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/modeles" className="text-sm text-teal-800">← Modèles</Link>
        <h1 className="mt-2 text-2xl font-bold">Modifier « {modele.nom} »</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          {integre && !ligne && 'Modèle intégré : vos modifications créent une version qui le remplace, inactive tant que vous ne l’activez pas. '}
          {ligne && (ligne.actif ? 'Version active : ' : 'Version inactive : ')}
          {ligne && 'chaque enregistrement crée une nouvelle version. '}
          Le référencement n’est jamais touché : le modèle ne règle que la présentation.
        </p>
      </div>
      {ligne?.actif && <Propagation cible={{ modele: id }} libelle="ce modèle" />}
      <EditeurModele initial={modele} integre={Boolean(integre)} actif={Boolean(ligne?.actif)} />
    </div>
  );
}
