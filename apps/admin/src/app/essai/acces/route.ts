import { NextResponse, type NextRequest } from 'next/server';
import { finaliserAcces } from '../../creer/actions';

// Retour du lien de confirmation de l'e-mail après « Créez votre accès » (Supabase → /auth/callback?next=/essai/acces) :
// le compte n'est plus anonyme, les CGU sont enregistrées (creer_acces_essai), puis le dernier écran du parcours s'ouvre
// (mot de passe à choisir s'il n'a pas pu l'être avant la confirmation, puis « Voir mon site »).
export async function GET(request: NextRequest) {
  const r = await finaliserAcces();
  const { origin } = request.nextUrl;
  return NextResponse.redirect(`${origin}/creer?etape=fin${r.ok ? '' : `&erreur=${encodeURIComponent(r.message)}`}`);
}
