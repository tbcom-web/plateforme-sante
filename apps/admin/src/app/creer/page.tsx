import { notFound, redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import Parcours from './Parcours';
import { choisirModele, noterProgressionEssai, publierApercuParcours, publierParcours, sauvegarderParcours } from './actions';
import { joursRestants } from '@plateforme/core';
import { dateLongue, getMonEssai } from '@/lib/essai';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite, getSiteParId } from '@/lib/sites';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';
import { getRole } from '@/lib/admin';
import { getUnivers } from '@/lib/univers';
import { lireJeuPhotos } from '@/lib/jeux-photos';
import { themesActives } from '@/lib/themes';

export const metadata = { title: 'Créer mon site' };

// /creer : parcours guidé du praticien (nouveau site, ou site pas encore publié : création à reprendre) ;
// /creer?site=<id> : le site d'un client, préparé par le super admin.
// /creer?etape=2 : changer de modèle (bouton « Changer de modèle » de /mon-site), y compris pour un site déjà publié :
// modèle et univers changent ensemble.
export default async function CreerPage({ searchParams }: PageProps<'/creer'>) {
  const user = await getUser();
  if (!user) redirect('/connexion');

  const { site: siteDemande, etape: etapeDemandee } = await searchParams;
  const changerModele = etapeDemandee === '2';
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
  // Compte en essai gratuit (non validé) : même parcours, pré-rempli avec le nom, « Voir mon site » en aperçu privé.
  const monEssai = pourClient ? null : await getMonEssai();
  const essai = monEssai && !monEssai.valideLe
    ? { prenom: monEssai.prenom, fin: dateLongue(monEssai.fin), joursRestants: joursRestants(monEssai.fin, Date.now()), suspendu: Boolean(monEssai.suspenduLe) }
    : null;
  if (essai && !site.id) {
    const p = site.draft.praticiens[0];
    if (p && !p.prenom && !p.nom) site.draft.praticiens[0] = { ...p, prenom: monEssai!.prenom, nom: monEssai!.nom };
    const lieu = site.draft.lieux[0];
    if (lieu && !lieu.ville && monEssai!.ville) site.draft.lieux[0] = { ...lieu, ville: monEssai!.ville };
    if (!site.draft.cabinet.ville && monEssai!.ville) site.draft.cabinet = { ...site.draft.cabinet, ville: monEssai!.ville };
  }
  // Site déjà publié : le praticien le modifie dans le formulaire (le parcours sert à la création)
  if (site.dejaPublie && !admin && !changerModele) redirect('/mon-site');
  const jeuPhotos = site.draft.theme.jeuPhotos ? await lireJeuPhotos(site.draft.theme.jeuPhotos) : null;
  const nomClient = pourClient
    ? site.draft.cabinet.nom || `${site.draft.praticiens[0]?.prenom ?? ''} ${site.draft.praticiens[0]?.nom ?? ''}`.trim() || 'ce client'
    : null;

  return (
    <Shell email={user.email ?? ''}>
      <Parcours
        siteId={site.id}
        etapeInitiale={changerModele ? 2 : undefined}
        version={site.updatedAt}
        initial={site.draft}
        catalogue={catalogue}
        modeles={modeles}
        marquesImportees={marquesImportees}
        jeuPhotos={jeuPhotos}
        univers={univers}
        client={nomClient}
        admin={admin}
        themesActives={themesActives()}
        lienAvance={pourClient ? `/mon-site?site=${site.id}` : '/mon-site'}
        essai={essai}
        actions={{ sauvegarder: sauvegarderParcours, choisir: choisirModele, publier: essai ? publierApercuParcours : publierParcours, ...(essai ? { progression: noterProgressionEssai } : {}) }}
      />
    </Shell>
  );
}
