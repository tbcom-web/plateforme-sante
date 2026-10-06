'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { getMonEssai } from '@/lib/essai';
import { creerSessionAbonnement } from '@/lib/stripe';

export type EtatAbonnement = { ok: boolean; message: string } | null;

/** Ouvre la page de paiement Stripe (abonnement) pour le compte en essai connecté. */
export async function passerAbonnement(): Promise<EtatAbonnement> {
  const user = await getUser();
  if (!user?.email) return { ok: false, message: 'Connectez-vous pour continuer.' };
  const essai = await getMonEssai();
  if (!essai) return { ok: false, message: 'Le paiement en ligne est réservé aux comptes en essai : contactez votre conseillère.' };
  if (essai.paiementStatut === 'paye') return { ok: true, message: 'Votre abonnement est déjà réglé.' };
  const h = await headers();
  const origine = h.get('origin') ?? `https://${h.get('host') ?? ''}`;
  const r = await creerSessionAbonnement({ owner: user.id, email: user.email, origine });
  if ('erreur' in r) return { ok: false, message: r.erreur };
  redirect(r.url);
}
