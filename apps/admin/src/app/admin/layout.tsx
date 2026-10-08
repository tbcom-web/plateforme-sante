import Shell from '@/components/Shell';
import ContexteImages from '@/components/ContexteImages';
import NavAdmin from '@/components/NavAdmin';
import { professionsActives } from '@plateforme/core/professions';
import { exigerAdmin } from '@/lib/admin';
import { getNombreArrivages, getNombreNouveautesANoter } from '@/lib/arrivages';
import { getProfession } from '@/lib/profession';
import { getUser } from '@/lib/supabase/server';

// Super admin réorganisé en espaces (décision de Paul du 2026-10-08, docs/espaces-admin.md) : Arrivages, Frigo, Dégustation,
// Cuisine, Clients ; sélecteur de profession global ; fil d'Ariane ; tiroir sur téléphone (NavAdmin, admin-espaces.ts).
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await exigerAdmin();
  const profession = await getProfession();
  const [user, arrivages, nouveautes] = await Promise.all([getUser(), getNombreArrivages(profession), getNombreNouveautesANoter(profession)]);

  return (
    <Shell email={user?.email ?? ''}>
      <NavAdmin
        compteurs={{ arrivages, nouveautes }}
        professions={professionsActives().map((p) => ({ id: p.id, libelle: p.libelle, court: p.court }))}
        profession={profession.id}
      />
      {/* Contexte d'images (photos exclues, kits par sujet : contexte-images.ts ; arrivages non acceptés) posé avant les aperçus */}
      <ContexteImages />
      {children}
    </Shell>
  );
}
