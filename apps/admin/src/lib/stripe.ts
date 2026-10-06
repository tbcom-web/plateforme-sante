import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Paiement de l'abonnement après l'essai (Stripe Checkout, mode abonnement), par l'API HTTP de Stripe (sans paquet npm).
// Désactivé tant que les variables d'environnement ne sont pas toutes définies côté Vercel (docs/onboarding-lead.md) :
//   STRIPE_SECRET_KEY        clé secrète Stripe, MODE TEST (sk_test_… ou rk_test_…) ; une clé live est refusée tant que
//                            STRIPE_LIVE_AUTORISE=1 n'est pas posé explicitement (passage en production décidé par Paul)
//   STRIPE_PRICE_ID          prix récurrent de l'abonnement (price_…), créé dans le tableau de bord Stripe
//   STRIPE_WEBHOOK_SECRET    secret de signature du webhook (whsec_…), point de terminaison /api/stripe/webhook
//   PAIEMENT_WEBHOOK_JETON   jeton aléatoire partagé avec Supabase (son SHA-256 dans public.jetons_webhooks)
// Aucune clé n'est écrite dans le code ; aucune n'est renvoyée au navigateur.

const cle = () => process.env.STRIPE_SECRET_KEY ?? '';
const cleAutorisee = (k: string) => /^(sk|rk)_test_/.test(k) || (/^(sk|rk)_live_/.test(k) && process.env.STRIPE_LIVE_AUTORISE === '1');

/** Paiement en ligne disponible (Checkout) : clé autorisée et prix définis. */
export function stripeConfigure(): boolean {
  return cleAutorisee(cle()) && /^price_\w+$/.test(process.env.STRIPE_PRICE_ID ?? '');
}

/** Webhook utilisable : signature Stripe et jeton Supabase définis. */
export function webhookConfigure(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.PAIEMENT_WEBHOOK_JETON && (process.env.PAIEMENT_WEBHOOK_JETON ?? '').length >= 32);
}

/** Corps application/x-www-form-urlencoded de l'API Stripe (objets imbriqués : a[b][c]=…). */
function formulaire(valeurs: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(valeurs)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

/**
 * Crée une session Stripe Checkout d'abonnement pour le compte en essai (owner = identifiant Supabase, repris dans
 * client_reference_id et les métadonnées pour le webhook). Renvoie l'adresse de la page de paiement Stripe.
 */
export async function creerSessionAbonnement(p: { owner: string; email: string; origine: string }): Promise<{ url: string } | { erreur: string }> {
  if (!stripeConfigure()) return { erreur: 'Le paiement en ligne n’est pas encore ouvert.' };
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle()}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `abonnement-${p.owner}-${new Date().toISOString().slice(0, 13)}` },
    body: formulaire({
      mode: 'subscription',
      'line_items[0][price]': process.env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': 1,
      client_reference_id: p.owner,
      customer_email: p.email,
      'metadata[owner]': p.owner,
      'subscription_data[metadata][owner]': p.owner,
      locale: 'fr',
      billing_address_collection: 'required',
      'tax_id_collection[enabled]': true,
      success_url: `${p.origine}/abonnement?paiement=ok`,
      cancel_url: `${p.origine}/abonnement?paiement=annule`,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!r?.ok) {
    console.error('Stripe checkout', r?.status, r ? (await r.text()).slice(0, 300) : 'réseau');
    return { erreur: 'La page de paiement n’a pas pu s’ouvrir. Réessayez dans un instant.' };
  }
  const session = (await r.json()) as { url?: string };
  return session.url?.startsWith('https://checkout.stripe.com/') ? { url: session.url } : { erreur: 'Réponse de paiement inattendue.' };
}

/**
 * Vérifie l'en-tête Stripe-Signature (t=…,v1=…) : HMAC-SHA256 de « t.corps » avec le secret du webhook, comparaison à
 * temps constant, tolérance de 5 minutes sur l'horodatage (rejeu).
 */
export function signatureValide(corps: string, entete: string | null, secret: string, maintenant = Date.now(), toleranceS = 300): boolean {
  if (!entete || !secret) return false;
  const parts = entete.split(',').map((x) => x.split('=') as [string, string]);
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  if (!Number.isFinite(t) || Math.abs(maintenant / 1000 - t) > toleranceS) return false;
  const attendu = Buffer.from(createHmac('sha256', secret).update(`${t}.${corps}`).digest('hex'));
  return parts.filter(([k]) => k === 'v1').some(([, v]) => {
    const recu = Buffer.from(v ?? '');
    return recu.length === attendu.length && timingSafeEqual(recu, attendu);
  });
}
