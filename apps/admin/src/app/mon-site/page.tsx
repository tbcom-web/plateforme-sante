import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import Editeur from './Editeur';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite } from '@/lib/sites';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';

export const metadata = { title: 'Mon site' };

export default async function MonSitePage() {
  const user = await getUser();
  if (!user) redirect('/connexion');

  const [site, catalogue, modeles, marquesImportees] = await Promise.all([getMonSite(), getCatalogue(), getModelesDisponibles(), getMarquesImportees()]);

  return (
    <Shell email={user.email ?? ''}>
      <Editeur siteId={site.id} initial={site.draft} catalogue={catalogue} modeles={modeles} marquesImportees={marquesImportees} />
    </Shell>
  );
}
