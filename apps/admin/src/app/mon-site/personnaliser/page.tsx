import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import Personnaliser from './Personnaliser';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite, getSiteParId } from '@/lib/sites';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';
import { getRole } from '@/lib/admin';
import { lireJeuPhotos } from '@/lib/jeux-photos';
import { gammesProposees, lirePersonnalisations, SECONDAIRES_SUGGEREES } from '@plateforme/core';
import { imagesDuSite, journalPersonnalisations, modeleDeBase, policesDuSite } from '@/lib/personnalisations-site';

export const metadata = { title: 'Personnaliser mon site' };

// /mon-site/personnaliser : réglages du praticien connecté ; ?site=<id> : le site d'un client (super admin / commercial).
export default async function PagePersonnaliser({ searchParams }: PageProps<'/mon-site/personnaliser'>) {
  const user = await getUser();
  if (!user) redirect('/connexion');
  const { site: siteDemande } = await searchParams;
  const pourClient = typeof siteDemande === 'string' && siteDemande.length > 0;
  const admin = (await getRole()) === 'admin';
  if (pourClient && !admin) redirect('/mon-site/personnaliser');

  const site = pourClient ? await getSiteParId(siteDemande) : await getMonSite();
  if (!site || !site.id) {
    if (pourClient) notFound();
    redirect('/creer');
  }
  const [catalogue, modeles, marquesImportees] = await Promise.all([getCatalogue(), getModelesDisponibles(), getMarquesImportees()]);
  const modele = modeleDeBase(modeles, site.draft.theme.modele);
  const [polices, images, journal, jeuPhotos] = await Promise.all([
    policesDuSite(site.draft, modele),
    imagesDuSite(site.draft, catalogue),
    journalPersonnalisations(site.id),
    site.draft.theme.jeuPhotos ? lireJeuPhotos(site.draft.theme.jeuPhotos) : Promise.resolve(null),
  ]);
  const perso = lirePersonnalisations(site.draft);
  const nom = site.draft.cabinet.nom || [site.draft.praticiens[0]?.prenom, site.draft.praticiens[0]?.nom].filter(Boolean).join(' ') || 'ce client';

  return (
    <Shell email={user.email ?? ''} anonyme={Boolean(user.is_anonymous)}>
      {pourClient && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Personnalisations du site de <strong>{nom}</strong> (super admin). Vous pouvez les voir, les modifier ou toutes les annuler.</span>
          <span className="flex gap-3 font-semibold">
            <Link href={`/mon-site?site=${site.id}`} className="underline-offset-4 hover:underline">Formulaire du site</Link>
            <Link href="/admin/personnalisations" className="underline-offset-4 hover:underline">← Toutes les personnalisations</Link>
          </span>
        </div>
      )}
      <Personnaliser
        siteId={site.id}
        version={site.updatedAt}
        draft={site.draft}
        modele={modele}
        catalogue={catalogue}
        marquesImportees={marquesImportees}
        jeuPhotos={jeuPhotos}
        initial={perso}
        polices={polices}
        gammes={gammesProposees()}
        secondaires={SECONDAIRES_SUGGEREES}
        images={images}
        journal={journal}
        admin={pourClient && admin}
        lienFormulaire={pourClient ? `/mon-site?site=${site.id}` : '/mon-site'}
      />
    </Shell>
  );
}
