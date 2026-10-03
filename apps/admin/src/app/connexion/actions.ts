'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type EtatConnexion = { ok: boolean; message: string } | null;

// Envoie un lien de connexion par e-mail (pas de mot de passe à retenir).
export async function envoyerLien(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Adresse e-mail invalide.' };
  }

  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { ok: false, message: 'Envoi impossible pour le moment. Réessayez dans une minute.' };
  }
  return { ok: true, message: `Lien envoyé à ${email}. Ouvrez votre boîte mail et cliquez sur le lien.` };
}
