import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SuiviPublication from '@/components/SuiviPublication';
import { dateCourte, etatPublication, STATUTS } from '@/lib/libelles';
import { CODE_VALIDE } from '@/lib/rattachement';
import Shell from '@/components/Shell';
import Apercu from '@/components/Apercu';
import BoutonPublier from './BoutonPublier';
import Propositions from './Propositions';
import { getPropositions } from './flux';
import { publierSite } from './actions';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite, manques } from '@/lib/sites';
import { getRole } from '@/lib/admin';
import { getMonEssai } from '@/lib/essai';
import TableauEssai from './TableauEssai';

export const metadata = { title: 'Tableau de bord' };

export default async function TableauDeBord() {
  const user = await getUser();
  if (!user) redirect('/connexion');

  const [site, catalogue, role] = await Promise.all([getMonSite(), getCatalogue(), getRole()]);
  // Praticien sans site : parcours guidé de création
  if (!site.id && role !== 'admin') redirect('/creer');
  // Compte en essai gratuit non validé : tableau de bord de l'essai (aperçu privé, demande de mise en ligne, abonnement).
  const essai = role === 'admin' ? null : await getMonEssai();
  if (essai && !essai.valideLe) return <TableauEssai email={user.email ?? ''} essai={essai} site={site} />;
  // Site jamais publié : la création se reprend dans le parcours guidé
  const creationEnCours = Boolean(site.id) && !site.dejaPublie && site.statut !== 'en_ligne';
  const aFaire = manques(site.draft);
  const propositions = site.id ? await getPropositions(site.id) : [];
  const statut = STATUTS[site.statut];
  const publication = etatPublication(site.publication.etat, site.publication.debut);
  // Suivi détaillé pendant la publication, et quelques minutes après pour annoncer la mise en ligne (vérifiée).
  const finRecente = site.publication.fin ? Date.now() - Date.parse(site.publication.fin) < 3 * 60_000 : false;
  const suivi = Boolean(site.id) && (publication?.cle === 'en_cours' || (publication?.cle === 'ok' && finRecente));
  // Lien de rattachement ouvert avant la connexion (voir /rattacher)
  const codeEnAttente = (await cookies()).get('rattachement')?.value;

  return (
    <Shell email={user.email ?? ''}>
      {codeEnAttente && CODE_VALIDE.test(codeEnAttente) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Un site préparé pour votre cabinet attend d’être rattaché à votre compte.</span>
          <Link href={`/rattacher?code=${encodeURIComponent(codeEnAttente)}`} className="font-semibold underline-offset-4 hover:underline">Rattacher ce site →</Link>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Bonjour{site.draft.praticiens[0]?.prenom ? ` ${site.draft.praticiens[0].prenom}` : ''}
          </h1>
          <p className="text-neutral-600">Voici l’état de votre site.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {site.id && (
            <Link href={`/edition/${site.id}`} className="rounded-lg border border-teal-800 px-5 py-2.5 font-semibold text-teal-900 hover:bg-teal-50">
              Édition visuelle
            </Link>
          )}
          {creationEnCours || !site.id ? (
            <>
              <Link href="/mon-site" className="rounded-lg border border-teal-800 px-5 py-2.5 font-semibold text-teal-900 hover:bg-teal-50">
                Formulaire complet
              </Link>
              <Link href="/creer" className="rounded-lg bg-teal-800 px-5 py-2.5 font-semibold text-white hover:bg-teal-900">
                {site.id ? 'Reprendre la création' : 'Créer mon site'}
              </Link>
            </>
          ) : (
            <Link href="/mon-site" className="rounded-lg bg-teal-800 px-5 py-2.5 font-semibold text-white hover:bg-teal-900">
              Modifier mon site
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-black/5 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Mon site</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statut.classe}`}>{statut.label}</span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              {site.domaine ? site.domaine : 'Nom de domaine : à choisir avant la mise en ligne.'}
            </p>
            {publication && !suivi && (
              <div className="mt-3 text-sm">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${publication.classe}`}>{publication.label}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  {publication.cle === 'ok' ? `le ${dateCourte(site.publication.fin)}` : `demandée le ${dateCourte(site.publication.debut)}`}
                </span>
                {(publication.cle === 'echec' || publication.cle === 'interrompue') && (
                  <p className="mt-2 text-red-800">
                    {site.publication.erreur || 'La mise en ligne n’a pas abouti.'} Vous pouvez relancer la publication ci-dessous ; si l’échec se répète, contactez-nous.
                  </p>
                )}
              </div>
            )}
            {suivi && site.id && <SuiviPublication siteId={site.id} reessayer={publierSite} className="mt-4" />}
            {site.modifsNonPubliees && !suivi && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Modifications non publiées : votre site en ligne n’affiche pas encore vos derniers changements.
              </p>
            )}
            {site.statut === 'suspendu' && (
              <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">Votre site est suspendu : contactez-nous pour le remettre en ligne.</p>
            )}

            {aFaire.length > 0 ? (
              <>
                <p className="mt-4 text-sm font-medium">À compléter (en attendant, le site affiche une mention à la place) :</p>
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {aFaire.map((m) => (
                    <li key={m} className="flex items-center gap-2 text-neutral-700">
                      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
                      {m}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-sm text-teal-800">Toutes les informations sont renseignées.</p>
            )}

            {site.domaine && site.statut === 'en_ligne' && (
              <a href={`https://${site.domaine}`} target="_blank" rel="noopener" className="mt-4 inline-block text-sm font-semibold text-teal-800 underline underline-offset-4">
                Voir mon site en ligne ↗
              </a>
            )}
            {site.statut !== 'suspendu' && publication?.cle !== 'en_cours' && (
              <BoutonPublier
                manques={aFaire}
                enLigne={site.statut === 'en_ligne'}
                modifs={site.modifsNonPubliees}
                echec={publication?.cle === 'echec' || publication?.cle === 'interrompue'}
              />
            )}
          </section>

          {site.id && <Propositions items={propositions} />}

          <section className="rounded-2xl border border-black/5 bg-white p-6">
            <h2 className="font-semibold">Statistiques</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-neutral-500">Visites (30 j)</dt>
                <dd className="text-2xl font-bold text-neutral-300">—</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-500">Clics « Prendre RDV »</dt>
                <dd className="text-2xl font-bold text-neutral-300">—</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-neutral-500">Disponibles une fois le site en ligne.</p>
          </section>
        </div>

        <section aria-label="Aperçu du site">
          <Apercu draft={site.draft} catalogue={catalogue} />
        </section>
      </div>
    </Shell>
  );
}
