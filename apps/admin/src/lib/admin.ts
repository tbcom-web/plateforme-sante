import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Rôle de l'utilisateur connecté, ou null si non connecté. */
export async function getRole(): Promise<'admin' | 'praticien' | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  return data?.role === 'admin' ? 'admin' : 'praticien';
}

/** À appeler en tête de chaque page et action super admin. */
export async function exigerAdmin() {
  const role = await getRole();
  if (role === null) redirect('/connexion');
  if (role !== 'admin') redirect('/tableau-de-bord');
}
