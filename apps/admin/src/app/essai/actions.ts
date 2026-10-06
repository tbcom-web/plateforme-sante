'use server';

import { createClient } from '@/lib/supabase/server';

export type EtatDemarrage = { ok: boolean; message: string };

/**
 * Démarre l'essai du compte qui vient de s'inscrire (fonction demarrer_essai : informations lues dans les métadonnées
 * du compte, consentement aux CGU obligatoire, un seul essai par compte). Aucune clé secrète : session du praticien.
 */
export async function demarrerEssai(): Promise<EtatDemarrage> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: 'Session introuvable : connectez-vous.' };
  const { error } = await supabase.rpc('demarrer_essai');
  if (error) {
    if (error.code === 'PGRST202') return { ok: false, message: 'L’essai n’est pas encore ouvert. Réessayez plus tard ou contactez-nous.' };
    if (/déjà un site/.test(error.message)) return { ok: false, message: 'Ce compte a déjà un site : retrouvez-le dans votre tableau de bord.' };
    console.error('demarrer_essai', error);
    return { ok: false, message: 'L’essai n’a pas pu démarrer. Réessayez dans un instant.' };
  }
  return { ok: true, message: 'Essai démarré.' };
}
