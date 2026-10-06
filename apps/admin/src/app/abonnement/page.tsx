import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import BoutonAbonnement from './BoutonAbonnement';
import { getUser } from '@/lib/supabase/server';
import { dateLongue, getMonEssai } from '@/lib/essai';
import { stripeConfigure } from '@/lib/stripe';
import { MARQUE } from '@/lib/marque';

export const metadata = { title: 'Passer à l’abonnement' };

// Passage à l'abonnement d'un compte en essai (Stripe Checkout). Aucun tarif n'est inventé ici : le tarif est celui
// indiqué par la conseillère et affiché par Stripe sur la page de paiement (prix STRIPE_PRICE_ID).
export default async function Abonnement({ searchParams }: PageProps<'/abonnement'>) {
  const user = await getUser();
  if (!user) redirect('/connexion');
  const [essai, { paiement }] = await Promise.all([getMonEssai(), searchParams]);
  const ouvert = stripeConfigure();

  return (
    <Shell email={user.email ?? ''}>
      <div className="mx-auto grid max-w-xl gap-5">
        <h1 className="text-2xl font-bold">Passer à l’abonnement</h1>
        {paiement === 'ok' && (
          <p role="status" className="rounded-xl bg-teal-50 px-4 py-3 text-teal-900">Merci. Votre paiement est en cours de confirmation ; votre conseillère vous contacte pour la mise en ligne.</p>
        )}
        {paiement === 'annule' && (
          <p role="status" className="rounded-xl bg-neutral-100 px-4 py-3 text-neutral-800">Paiement annulé : rien n’a été prélevé.</p>
        )}
        {essai?.paiementStatut === 'paye' ? (
          <p className="rounded-xl bg-teal-50 px-4 py-3 text-teal-900">Votre abonnement est réglé.</p>
        ) : (
          <section className="grid gap-4 rounded-2xl border border-black/5 bg-white p-6">
            <p className="text-neutral-700">
              Votre essai gratuit {essai ? `se termine le ${dateLongue(essai.fin)}` : 'est en cours'}. L’abonnement conserve votre site et permet sa mise en ligne sur votre nom de domaine, après vérification de vos informations par votre conseillère.
            </p>
            <p className="text-neutral-700">Tarif : celui indiqué par votre conseiller, affiché sur la page de paiement avant toute validation.</p>
            {ouvert && essai ? (
              <>
                <BoutonAbonnement />
                <p className="text-xs text-neutral-500">Paiement sécurisé par Stripe : vos coordonnées bancaires ne sont jamais transmises à {MARQUE.nom}.</p>
              </>
            ) : (
              <p className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                Le paiement en ligne n’est pas encore ouvert. Votre conseillère vous indique les modalités : <a className="font-semibold underline" href={`mailto:${MARQUE.contact}`}>{MARQUE.contact}</a>.
              </p>
            )}
          </section>
        )}
        <Link href="/tableau-de-bord" className="font-semibold text-teal-800 underline">← Tableau de bord</Link>
      </div>
    </Shell>
  );
}
