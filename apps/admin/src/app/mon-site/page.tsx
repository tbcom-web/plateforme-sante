import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import Editeur from './Editeur';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite, getSiteParId } from '@/lib/sites';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';
import { getRole } from '@/lib/admin';
import { lireJeuPhotos } from '@/lib/jeux-photos';
import { themesActives } from '@/lib/themes';

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
  const nomClient = site.draft.cabinet.nom || `${site.draft.praticiens[0]?.prenom ?? ''} ${site.draft.praticiens[0]?.nom ?? ''}`.trim() || 'ce client';
  // Jeu de photos affecté (aperçu seulement : le praticien ne le choisit pas)
  const jeuPhotos = site.draft.theme.jeuPhotos ? await lireJeuPhotos(site.draft.theme.jeuPhotos) : null;

  return (
    <Shell email={user.email ?? ''}>
      {pourClient && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            Vous modifiez le site de <strong>{nomClient}</strong> (super admin). « Enregistrer » ne change pas le site en ligne ; « Enregistrer et publier » le met à jour.
          </span>
          <span className="flex gap-3 font-semibold">
            <Link href={`/edition/${site.id}`} className="underline-offset-4 hover:underline">Édition visuelle</Link>
            <Link href="/admin" className="underline-offset-4 hover:underline">← Tous les sites</Link>
          </span>
        </div>
      )}
      <Editeur siteId={site.id} version={site.updatedAt} titre={pourClient ? `Site de ${nomClient}` : 'Mon site'} initial={site.draft} lienChangerModele={pourClient ? `/creer?site=${site.id}&etape=2` : '/creer?etape=2'} catalogue={catalogue} modeles={modeles} marquesImportees={marquesImportees} jeuPhotos={jeuPhotos} themesActives={themesActives()} />
    </Shell>
  );
}
