import { notFound, redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import Parcours from './Parcours';
import { choisirModele, publierParcours, sauvegarderParcours } from './actions';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite, getSiteParId } from '@/lib/sites';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';
import { getRole } from '@/lib/admin';
import { getUnivers } from '@/lib/univers';
import { lireJeuPhotos } from '@/lib/jeux-photos';

export const metadata = { title: 'Créer mon site' };

// /creer : parcours guidé du praticien (nouveau site, ou site pas encore publié : création à reprendre) ;
// /creer?site=<id> : le site d'un client, préparé par le super admin.
export default async function CreerPage({ searchParams }: PageProps<'/creer'>) {
  const user = await getUser();
  if (!user) redirect('/connexion');

  const { site: siteDemande } = await searchParams;
  const pourClient = typeof siteDemande === 'string' && siteDemande.length > 0;
  const admin = (await getRole()) === 'admin';
  if (pourClient && !admin) redirect('/creer');

  const [site, catalogue, modeles, marquesImportees, { univers }] = await Promise.all([
    pourClient ? getSiteParId(siteDemande) : getMonSite(),
    getCatalogue(),
    getModelesDisponibles(),
    getMarquesImportees(),
    getUnivers(),
  ]);
  if (!site) notFound();
  // Site déjà publié : le praticien le modifie dans le formulaire (le parcours sert à la création)
  if (site.dejaPublie && !admin) redirect('/mon-site');
  const jeuPhotos = site.draft.theme.jeuPhotos ? await lireJeuPhotos(site.draft.theme.jeuPhotos) : null;
  const nomClient = pourClient
    ? site.draft.cabinet.nom || `${site.draft.praticiens[0]?.prenom ?? ''} ${site.draft.praticiens[0]?.nom ?? ''}`.trim() || 'ce client'
    : null;

  return (
    <Shell email={user.email ?? ''}>
      <Parcours
        siteId={site.id}
        version={site.updatedAt}
        initial={site.draft}
        catalogue={catalogue}
        modeles={modeles}
        marquesImportees={marquesImportees}
        jeuPhotos={jeuPhotos}
        univers={univers}
        client={nomClient}
        admin={admin}
        lienAvance={pourClient ? `/mon-site?site=${site.id}` : '/mon-site'}
        actions={{ sauvegarder: sauvegarderParcours, choisir: choisirModele, publier: publierParcours }}
      />
    </Shell>
  );
}
