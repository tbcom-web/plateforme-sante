import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import Editeur from './Editeur';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite, getSiteParId } from '@/lib/sites';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';
import { getRole } from '@/lib/admin';

export const metadata = { title: 'Mon site' };

// /mon-site : le site du praticien connecté ; /mon-site?site=<id> : le site d'un client (super admin uniquement).
export default async function MonSitePage({ searchParams }: PageProps<'/mon-site'>) {
  const user = await getUser();
  if (!user) redirect('/connexion');

  const { site: siteDemande } = await searchParams;
  const pourClient = typeof siteDemande === 'string' && siteDemande.length > 0;
  if (pourClient && (await getRole()) !== 'admin') redirect('/mon-site');

  const [site, catalogue, modeles, marquesImportees] = await Promise.all([
    pourClient ? getSiteParId(siteDemande) : getMonSite(),
    getCatalogue(),
    getModelesDisponibles(),
    getMarquesImportees(),
  ]);
  if (!site) notFound();

  return (
    <Shell email={user.email ?? ''}>
      {pourClient && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            Vous modifiez le site de <strong>{site.draft.cabinet.nom || `${site.draft.praticiens[0]?.prenom ?? ''} ${site.draft.praticiens[0]?.nom ?? ''}`.trim() || 'ce client'}</strong> (super admin).
          </span>
          <span className="flex gap-3 font-semibold">
            <Link href={`/edition/${site.id}`} className="underline-offset-4 hover:underline">Édition visuelle</Link>
            <Link href="/admin" className="underline-offset-4 hover:underline">← Tous les sites</Link>
          </span>
        </div>
      )}
      <Editeur siteId={site.id} initial={site.draft} catalogue={catalogue} modeles={modeles} marquesImportees={marquesImportees} />
    </Shell>
  );
}
