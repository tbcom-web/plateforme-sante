import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// /rattacher : lien de rattachement d'un site, ouvert avant connexion (le code est gardé pendant la connexion).
// /essai : page d'essai gratuit, inscription et textes juridiques (publiques ; la page d'accueil de l'essai est statique et
// exclue du proxy, voir config.matcher). /api/stripe/webhook : appelé par Stripe, sans session (signature vérifiée).
// /api/essai/* : capture du prospect et compteur de visites de la page d'essai (sans session, hors proxy aussi).
// /audit/<jeton> : rapport d'audit de site remis au prospect (lien à capacité, app/audit/[jeton]/route.ts).
// /api/sourcing-photos : appelé par le workflow sourcer-photos, sans session (jeton partagé vérifié par la route, docs/sourcing-photos.md).
const PAGES_PUBLIQUES = ['/connexion', '/auth', '/rattacher', '/essai', '/api/stripe/webhook', '/api/essai/', '/api/sourcing-photos', '/audit/'];

// Rafraîchit la session Supabase à chaque navigation et protège les pages privées.
export async function proxy(request: NextRequest) {
  const debut = performance.now();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const publique = PAGES_PUBLIQUES.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!data.user && !publique) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Mesure continue (2026-10-10) : durée de la vérification de session, lisible dans l'onglet Réseau et la pastille des admins
  response.headers.set('Server-Timing', `session;desc="Session";dur=${(performance.now() - debut).toFixed(1)}`);
  return response;
}

export const config = {
  // /essai (page statique servie telle quelle, sans appel à Supabase), ses textes juridiques, ses images et ses routes
  // de capture et de mesure (sans session) : hors proxy.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|essai$|essai/cgu|essai/confidentialite|api/essai/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
