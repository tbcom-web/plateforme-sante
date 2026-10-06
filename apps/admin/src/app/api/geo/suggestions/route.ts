import type { NextRequest } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { MESSAGE_INDISPONIBLE, suggestionsGeo, type EntreeSuggestions } from '@/lib/geo-suggestions';

// Suggestions de voisinage pour l'adresse du cabinet (composant SuggestionsVoisinage) : quartier, communes alentour,
// transports et stationnement, tirés d'OpenStreetMap et de geo.api.gouv.fr par lib/geo-suggestions.ts.
// Réservé aux utilisateurs connectés ; les services tiers ne sont appelés que d'ici (jamais depuis le navigateur).
// Jamais bloquant : en cas de panne, réponse 200 avec ok=false et un message sobre.
export const maxDuration = 30;

const PAYS = new Set(['FR', 'BE', 'CH']);
const propre = (v: string | null, max: number) => (v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

export async function GET(req: NextRequest) {
  const entetes = { 'Cache-Control': 'private, no-store' };
  const user = await getUser();
  if (!user) return Response.json({ erreur: 'Connexion requise.' }, { status: 401, headers: entetes });

  const q = req.nextUrl.searchParams;
  const pays = propre(q.get('pays'), 2).toUpperCase();
  const entree: EntreeSuggestions = {
    adresse: propre(q.get('adresse'), 160),
    codePostal: propre(q.get('cp'), 10),
    ville: propre(q.get('ville'), 80),
    pays: (PAYS.has(pays) ? pays : 'FR') as EntreeSuggestions['pays'],
  };
  if (!entree.codePostal || !entree.ville) {
    return Response.json({ erreur: 'Code postal et ville requis.' }, { status: 400, headers: entetes });
  }
  try {
    return Response.json(await suggestionsGeo(entree), { headers: entetes });
  } catch {
    return Response.json(
      { ok: false, message: MESSAGE_INDISPONIBLE, quartier: null, communes: [], transports: [], stationnement: [] },
      { headers: entetes },
    );
  }
}
