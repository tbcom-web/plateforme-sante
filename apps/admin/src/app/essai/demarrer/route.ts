import { NextResponse, type NextRequest } from 'next/server';
import { demarrerEssai } from '../actions';

// Arrivée après la confirmation de l'e-mail (lien Supabase → /auth/callback?next=/essai/demarrer) : l'essai démarre
// puis le parcours guidé de création s'ouvre.
export async function GET(request: NextRequest) {
  const r = await demarrerEssai();
  const { origin } = request.nextUrl;
  if (r.ok) return NextResponse.redirect(`${origin}/creer`);
  return NextResponse.redirect(`${origin}/essai/inscription?erreur=${encodeURIComponent(r.message)}`);
}
