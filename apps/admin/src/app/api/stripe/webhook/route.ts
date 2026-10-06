import { createClient } from '@supabase/supabase-js';
import { signatureValide, webhookConfigure } from '@/lib/stripe';

// Webhook Stripe (paiement de l'abonnement après l'essai). Signature Stripe vérifiée, puis statut de paiement enregistré
// par la fonction SQL confirmer_paiement_essai, appelée avec la clé PUBLIQUE et un jeton partagé (jamais de clé
// service_role côté Vercel). Désactivé (503) tant que la configuration n'est pas complète. Ne renvoie aucun secret.
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/;
type Evenement = { id: string; type: string; data: { object: Record<string, unknown> } };

const statutDe = (e: Evenement): 'paye' | 'impaye' | 'annule' | null => {
  const o = e.data.object;
  switch (e.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return o.payment_status === 'paid' || o.payment_status === 'no_payment_required' ? 'paye' : null;
    case 'invoice.paid':
      return 'paye';
    case 'invoice.payment_failed':
      return 'impaye';
    case 'customer.subscription.deleted':
      return 'annule';
    default:
      return null;
  }
};

/** Compte Supabase concerné : client_reference_id ou métadonnées « owner » (session, abonnement ou facture). */
function proprietaire(o: Record<string, unknown>): string | null {
  const meta = (x: unknown) => (x && typeof x === 'object' ? (x as { owner?: unknown }).owner : undefined);
  const lignes = (o.lines as { data?: { metadata?: unknown }[] } | undefined)?.data ?? [];
  const parent = (o.parent as { subscription_details?: { metadata?: unknown } } | undefined)?.subscription_details?.metadata;
  const candidats = [o.client_reference_id, meta(o.metadata), meta((o as { subscription_details?: { metadata?: unknown } }).subscription_details?.metadata), meta(parent), ...lignes.map((l) => meta(l.metadata))];
  const v = candidats.find((c) => typeof c === 'string' && UUID.test(c));
  return (v as string) ?? null;
}

export async function POST(req: Request) {
  if (!webhookConfigure()) return Response.json({ erreur: 'Paiement non configuré.' }, { status: 503 });
  const corps = await req.text();
  if (!signatureValide(corps, req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET!)) {
    return Response.json({ erreur: 'Signature invalide.' }, { status: 400 });
  }
  let e: Evenement;
  try {
    e = JSON.parse(corps) as Evenement;
  } catch {
    return Response.json({ erreur: 'Corps invalide.' }, { status: 400 });
  }
  const statut = statutDe(e);
  if (!statut) return Response.json({ recu: true });
  const o = e.data.object;
  const owner = proprietaire(o);
  if (!owner) return Response.json({ recu: true, ignore: 'compte inconnu' });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const texte = (x: unknown) => (typeof x === 'string' ? x : '');
  const { error } = await supabase.rpc('confirmer_paiement_essai', {
    p_jeton: process.env.PAIEMENT_WEBHOOK_JETON,
    p_owner: owner,
    p_statut: statut,
    p_client: texte(o.customer),
    p_abonnement: texte(o.subscription) || (e.type.startsWith('customer.subscription') ? texte(o.id) : ''),
    p_evenement: e.id,
  });
  if (error) {
    console.error('confirmer_paiement_essai', error.code, error.message);
    // 500 : Stripe renverra l'événement plus tard.
    return Response.json({ erreur: 'Enregistrement impossible.' }, { status: 500 });
  }
  return Response.json({ recu: true });
}
