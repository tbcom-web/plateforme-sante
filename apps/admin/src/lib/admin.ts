import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';

/**
 * Compte connecté et ses rôles (profiles.role, profiles.role_equipe de 0050), lus UNE fois par requête (2026-10-10, perf de la
 * chaîne : le menu, la page, la portée des instantanés et l'équipier relisaient chacun la session et le profil). null : non connecté.
 */
export const getRoles = cache(async (): Promise<{ id: string; email: string; role: string | null; roleEquipe: string | null } | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  let { data, error } = await supabase.from('profiles').select('role, role_equipe').eq('id', user.id).maybeSingle();
  // Colonne role_equipe absente (0050 pas exécutée) : rôle seul, comme avant
  if (error) ({ data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle());
  const l = data as { role?: string | null; role_equipe?: string | null } | null;
  return { id: user.id, email: user.email ?? '', role: l?.role ?? null, roleEquipe: l?.role_equipe ?? null };
});

/** Rôle de l'utilisateur connecté, ou null si non connecté. */
async function getRoleSansMemo(): Promise<'admin' | 'praticien' | null> {
  const r = await getRoles();
  if (!r) return null;
  return r.role === 'admin' ? 'admin' : 'praticien';
}
export const getRole = cache(getRoleSansMemo);

/** À appeler en tête de chaque page et action super admin. */
export async function exigerAdmin() {
  const role = await getRole();
  if (role === null) redirect('/connexion');
  if (role !== 'admin') redirect('/tableau-de-bord');
}
