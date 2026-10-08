import { NextResponse, type NextRequest } from 'next/server';
import { exigerAdmin } from '@/lib/admin';
import { COOKIE_MODE_TEST, DUREE_MODE_TEST_S } from '@/lib/mode-test';
import { PERSONAS_TEST, ETAPES_SAUT_TEST } from '@/app/essai/votre-site/personas';

// « Tester le parcours client » (super admin) : pose le drapeau du mode test (cookie httpOnly, vérifié avec le rôle admin à
// chaque lecture : lib/mode-test.ts) puis ouvre le parcours client avec le persona et l'étape demandés.
// ?effacer=1 : retire le drapeau (« Effacer mes sessions test » : l'état local du navigateur est vidé par la page).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await exigerAdmin();
  const p = req.nextUrl.searchParams;
  if (p.get('effacer') === '1') {
    const r = NextResponse.redirect(new URL('/admin?test-efface=1', req.url));
    r.cookies.delete(COOKIE_MODE_TEST);
    return r;
  }
  const persona = PERSONAS_TEST.some((x) => x.id === p.get('persona')) ? p.get('persona')! : 'vierge';
  const etape = ETAPES_SAUT_TEST.some((x) => x.id === p.get('etape')) ? p.get('etape')! : '';
  const cible = new URL('/essai/votre-site', req.url);
  cible.searchParams.set('test', '1');
  cible.searchParams.set('persona', persona);
  cible.searchParams.set('neuf', '1');
  if (etape) cible.searchParams.set('etape', etape);
  const r = NextResponse.redirect(cible);
  r.cookies.set(COOKIE_MODE_TEST, '1', { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', path: '/', maxAge: DUREE_MODE_TEST_S });
  return r;
}
