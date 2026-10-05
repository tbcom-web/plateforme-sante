import type { NextRequest } from 'next/server';
import { getRole } from '@/lib/admin';
import { suiviPublication } from '@/lib/suivi-publication';

// Suivi de la publication d'un site (composant SuiviPublication) : réservé au praticien propriétaire du site ou à un
// admin (la lecture du site passe par la RLS Supabase). Réponse jamais mise en cache, sans aucun secret.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const role = await getRole();
  const entetes = { 'Cache-Control': 'no-store' };
  if (!role) return Response.json({ erreur: 'Connexion requise.' }, { status: 401, headers: entetes });
  const suivi = await suiviPublication(id, role === 'admin');
  if (!suivi) return Response.json({ erreur: 'Site introuvable.' }, { status: 404, headers: entetes });
  return Response.json(suivi, { headers: entetes });
}
