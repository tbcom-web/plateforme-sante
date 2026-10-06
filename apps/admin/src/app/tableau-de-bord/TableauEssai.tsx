import Link from 'next/link';
import { joursRestants, prochaineEtapeEssai, progressionParcours } from '@plateforme/core';
import Shell from '@/components/Shell';
import SuiviPublication from '@/components/SuiviPublication';
import { BoutonDemanderMiseEnLigne, BoutonMettreAJour } from './BoutonsEssai';
import { mettreAJourEssai } from './actions-essai';
import { dateLongue, lienApercu, type MonEssai } from '@/lib/essai';
import type { MonSite } from '@/lib/sites';
import { stripeConfigure } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

// Tableau de bord d'un praticien en essai gratuit : jours restants, prochaine étape, version d'essai (lien privé),
// « Demander la mise en ligne » (la conseillère vérifie puis valide) et « Passer à l'abonnement » si Stripe est configuré.
export default async function TableauEssai({ email, essai, site }: { email: string; essai: MonEssai; site: MonSite }) {
  const supabase = await createClient();
  const { data } = site.id ? await supabase.from('sites').select('slug').eq('id', site.id).maybeSingle() : { data: null };
  const lien = essai.apercuGenereLe ? lienApercu((data as { slug: string | null } | null)?.slug) : null;
  const restants = joursRestants(essai.fin, Date.now());
  const paye = essai.paiementStatut === 'paye';
  const suspendu = Boolean(essai.suspenduLe) || site.statut === 'suspendu';
  const etape = prochaineEtapeEssai({
    etape: essai.etape, apercuGenere: Boolean(essai.apercuGenereLe), miseEnLigneDemandee: Boolean(essai.miseEnLigneDemandeeLe), suspendu, joursRestants: restants, paye,
  });
  const progression = progressionParcours({ etape: essai.etape, apercuGenere: Boolean(essai.apercuGenereLe) });
  const finRecente = site.publication.fin ? Date.now() - Date.parse(site.publication.fin) < 3 * 60_000 : false;
  const suivi = Boolean(site.id) && (site.publication.etat === 'en_cours' || (site.publication.etat === 'ok' && finRecente));
  const carte = 'grid gap-3 rounded-2xl border border-black/5 bg-white p-6';

  return (
    <Shell email={email}>
      <div className="grid gap-2">
        <h1 className="text-2xl font-bold">Bonjour{essai.prenom ? ` ${essai.prenom}` : ''}</h1>
        <p className="text-neutral-600">
          Version d’essai gratuite :{' '}
          <strong className="text-neutral-900">{paye ? 'abonnement réglé' : restants > 0 ? `${restants} jour${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}` : 'essai terminé'}</strong>
          {!paye && <> (jusqu’au {dateLongue(essai.fin)})</>}. Votre site reste privé tant qu’il n’est pas validé pour la mise en ligne.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className={carte} aria-labelledby="titre-etape">
          <p className="text-sm font-semibold text-teal-800">Prochaine étape</p>
          <h2 id="titre-etape" className="text-xl font-semibold">{etape.titre}</h2>
          <p className="text-neutral-700">{etape.texte}</p>
          {etape.id === 'terminer_parcours' && (
            <>
              <div role="progressbar" aria-label="Avancement de la création" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progression} className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-teal-700" style={{ width: `${Math.max(4, progression)}%` }} />
              </div>
              <Link href="/creer" className="min-h-11 content-center rounded-lg bg-teal-800 px-4 text-center text-sm font-semibold text-white hover:bg-teal-900">Reprendre la création</Link>
            </>
          )}
          {etape.id === 'generer' && site.id && !suivi && <BoutonMettreAJour libelle="Voir mon site" principalStyle />}
          {etape.id === 'demander_mise_en_ligne' && <BoutonDemanderMiseEnLigne dejaDemande={false} />}
          {etape.id === 'attente_validation' && <p className="text-sm text-neutral-600">Demande envoyée le {dateLongue(essai.miseEnLigneDemandeeLe)}.</p>}
          {(etape.id === 'termine' || etape.id === 'suspendu' || etape.id === 'attente_validation') && stripeConfigure() && !paye && (
            <Link href="/abonnement" className="min-h-11 content-center rounded-lg bg-teal-800 px-4 text-center text-sm font-semibold text-white hover:bg-teal-900">Passer à l’abonnement</Link>
          )}
        </section>

        <section className={carte} aria-labelledby="titre-version">
          <h2 id="titre-version" className="text-lg font-semibold">Ma version d’essai</h2>
          {suivi && site.id ? (
            <SuiviPublication siteId={site.id} reessayer={mettreAJourEssai} />
          ) : lien && !suspendu ? (
            <>
              <a href={lien} target="_blank" rel="noopener" className="min-h-11 content-center justify-self-start rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900">Voir mon site ↗</a>
              <p className="break-all text-xs text-neutral-600">{lien.replace(/^https:\/\//, '')} · lien privé, non indexé, que vous pouvez partager</p>
            </>
          ) : (
            <p className="text-sm text-neutral-600">{suspendu ? 'Version d’essai suspendue.' : 'Pas encore générée : terminez la création puis « Voir mon site ».'}</p>
          )}
          {site.publication.etat === 'echec' && !suivi && <p className="text-sm text-red-800">{site.publication.erreur || 'La dernière génération n’a pas abouti.'}</p>}
          {site.id && !suspendu && !suivi && essai.apercuGenereLe && <BoutonMettreAJour libelle="Mettre à jour ma version d’essai" />}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {site.id && <Link href="/mon-site" className="font-semibold text-teal-800 underline">Modifier mon site</Link>}
            {site.id && <Link href={`/edition/${site.id}`} className="font-semibold text-teal-800 underline">Édition visuelle</Link>}
            {stripeConfigure() && !paye && <Link href="/abonnement" className="font-semibold text-teal-800 underline">Passer à l’abonnement</Link>}
          </div>
        </section>
      </div>

      {essai.miseEnLigneDemandeeLe && etape.id === 'attente_validation' && (
        <section className="mt-6 rounded-2xl border border-black/5 bg-white p-6 text-sm text-neutral-700">
          <h2 className="font-semibold text-neutral-900">Avant la mise en ligne publique</h2>
          <p className="mt-2">Votre conseillère vérifie avec vous les informations du cabinet et votre inscription au tableau de l’Ordre, puis met votre site en ligne sur votre nom de domaine. Aucune publication n’a lieu sans cette vérification.</p>
          <div className="mt-3 max-w-sm"><BoutonDemanderMiseEnLigne dejaDemande /></div>
        </section>
      )}
    </Shell>
  );
}
