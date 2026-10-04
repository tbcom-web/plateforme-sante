'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type EtatConnexion = { ok: boolean; message: string } | null;

const emailValide = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Connexion par e-mail et mot de passe (le mot de passe se définit dans « Mon compte »).
export async function connexionMotDePasse(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const motDePasse = String(formData.get('motDePasse') ?? '');
  if (!emailValide(email) || !motDePasse) {
    return { ok: false, message: 'Saisissez votre e-mail et votre mot de passe.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  if (error) {
    // Message volontairement identique dans tous les cas (ne révèle pas si le compte existe).
    return { ok: false, message: 'E-mail ou mot de passe incorrect. Pas encore de mot de passe ? Recevez un lien de connexion.' };
  }
  redirect('/tableau-de-bord');
}

// Envoie un lien de connexion par e-mail (première connexion ou mot de passe oublié).
export async function envoyerLien(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!emailValide(email)) {
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
