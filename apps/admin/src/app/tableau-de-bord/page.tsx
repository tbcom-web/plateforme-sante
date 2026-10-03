import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import Apercu from '@/components/Apercu';
import { getUser } from '@/lib/supabase/server';
import { getCatalogue, getMonSite, manques } from '@/lib/sites';

export const metadata = { title: 'Tableau de bord' };

const STATUTS = {
  brouillon: { label: 'Brouillon', classe: 'bg-amber-100 text-amber-900' },
  en_ligne: { label: 'En ligne', classe: 'bg-teal-100 text-teal-900' },
  suspendu: { label: 'Suspendu', classe: 'bg-neutral-200 text-neutral-700' },
} as const;

export default async function TableauDeBord() {
  const user = await getUser();
  if (!user) redirect('/connexion');

  const [site, catalogue] = await Promise.all([getMonSite(), getCatalogue()]);
  const aFaire = manques(site.draft);
  const statut = STATUTS[site.statut];

  return (
    <Shell email={user.email ?? ''}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Bonjour{site.draft.praticien.prenom ? ` ${site.draft.praticien.prenom}` : ''}
          </h1>
          <p className="text-neutral-600">Voici l’état de votre site.</p>
        </div>
        <Link href="/mon-site" className="rounded-lg bg-teal-800 px-5 py-2.5 font-semibold text-white hover:bg-teal-900">
          {site.id ? 'Modifier mon site' : 'Créer mon site'}
        </Link>
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

            {aFaire.length > 0 ? (
              <>
                <p className="mt-4 text-sm font-medium">Il reste à renseigner :</p>
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

            <button
              disabled
              className="mt-6 w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-500"
              title="La publication arrive à la prochaine étape du développement"
            >
              Publier mon site (bientôt)
            </button>
          </section>

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
