'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CODE_VALIDE } from '@/lib/rattachement';

export type EtatRattachement = { ok: boolean; message: string } | null;

/** Cookie gardant le code pendant la connexion (lien magique ou mot de passe), lu par le tableau de bord. */
const COOKIE = 'rattachement';

/** Pas encore connecté (ou mauvais compte) : garde le code puis mène à la connexion. */
export async function seConnecterPourRattacher(code: string, deconnecter = false): Promise<void> {
  if (deconnecter) await (await createClient()).auth.signOut();
  if (CODE_VALIDE.test(code)) {
    (await cookies()).set(COOKIE, code, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86_400, path: '/' });
  }
  redirect('/connexion');
}

/** Rattache le site au compte connecté (fonction rattacher_site : code, e-mail et expiration vérifiés en base). */
export async function rattacher(code: string): Promise<EtatRattachement> {
  if (!CODE_VALIDE.test(code)) return { ok: false, message: 'Lien de rattachement invalide.' };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: 'Connectez-vous d’abord.' };
  const { error } = await supabase.rpc('rattacher_site', { p_code: code });
  if (error) {
    // Messages de la fonction SQL (code P0001) : rédigés pour le praticien ; les autres restent génériques.
    return { ok: false, message: error.code === 'P0001' ? error.message : 'Rattachement impossible pour le moment. Réessayez ou contactez-nous.' };
  }
  (await cookies()).delete(COOKIE);
  redirect('/tableau-de-bord');
}
