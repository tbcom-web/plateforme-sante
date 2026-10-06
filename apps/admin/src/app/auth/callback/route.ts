import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Retour du lien magique ou de la confirmation d'e-mail : échange le code (PKCE, même navigateur) ou vérifie le jeton
// (token_hash, modèle d'e-mail Supabase « {{ .TokenHash }} » : fonctionne aussi depuis un autre appareil) contre une
// session. `next` : page d'arrivée, chemin interne uniquement (ex. /essai/demarrer après l'inscription à l'essai).
const TYPES: EmailOtpType[] = ['signup', 'email', 'magiclink', 'recovery', 'invite', 'email_change'];

const destination = (next: string | null) => (next && /^\/(?!\/)[\w\-/?=&.%]*$/.test(next) ? next : '/tableau-de-bord');

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const suite = destination(searchParams.get('next'));

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${suite}`);
  } else if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${suite}`);
  }

  return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
}
