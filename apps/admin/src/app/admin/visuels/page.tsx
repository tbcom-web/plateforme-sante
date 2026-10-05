import { SPECIALITES, type PersonnalisationPack } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import EditeurPack from './EditeurPack';

export const metadata = { title: 'Super admin · Banque visuelle' };

export default async function Visuels() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('packs_visuels').select('id, photos, animation');
  const persos = new Map((data ?? []).map((l) => [l.id as string, { photos: l.photos, animation: l.animation } as PersonnalisationPack]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Banque visuelle</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Photos et animation proposées par défaut pour chaque spécialité. Les photos du praticien passent toujours en premier ;
          le style du site leur applique ensuite une teinte commune. Choisissez des photos sans visage, pour qu’aucune personne ne passe pour le praticien.
        </p>
      </div>
      {error && <p className="text-sm text-red-700">Lecture impossible : la base de données n’est pas à jour (mise à jour 0011, banque visuelle, à installer).</p>}
      {SPECIALITES.map((pack) => <EditeurPack key={pack.value} pack={pack} perso={persos.get(pack.value) ?? {}} />)}
    </div>
  );
}
