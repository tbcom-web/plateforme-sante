import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import Editeur from './Editeur';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite } from '@/lib/sites';

export const metadata = { title: 'Mon site' };

export default async function MonSitePage() {
  const user = await getUser();
  if (!user) redirect('/connexion');

  const [site, catalogue] = await Promise.all([getMonSite(), getCatalogue()]);

  return (
    <Shell email={user.email ?? ''}>
      <Editeur siteId={site.id} initial={site.draft} catalogue={catalogue} />
    </Shell>
  );
}
