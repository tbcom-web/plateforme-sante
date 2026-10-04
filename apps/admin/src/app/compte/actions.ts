'use server';

import { createClient } from '@/lib/supabase/server';

export type EtatCompte = { ok: boolean; message: string } | null;

// Définit ou change le mot de passe du compte connecté.
export async function definirMotDePasse(_: EtatCompte, formData: FormData): Promise<EtatCompte> {
  const motDePasse = String(formData.get('motDePasse') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');
  if (motDePasse.length < 10) return { ok: false, message: 'Choisissez un mot de passe d’au moins 10 caractères.' };
  if (motDePasse !== confirmation) return { ok: false, message: 'Les deux saisies ne correspondent pas.' };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: 'Session expirée, reconnectez-vous.' };

  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) {
    return { ok: false, message: error.code === 'weak_password' ? 'Mot de passe trop faible : mélangez lettres, chiffres et symboles.' : 'Modification impossible. Réessayez.' };
  }
  return { ok: true, message: 'Mot de passe enregistré. Vous pourrez vous connecter avec lui.' };
}
