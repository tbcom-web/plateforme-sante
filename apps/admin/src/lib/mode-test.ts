import 'server-only';
import { cookies } from 'next/headers';
import { getRole } from '@/lib/admin';

// MODE CLIENT TEST (demande de Paul du 2026-10-08 : « accéder au compte test facilement ») : le super admin ouvre le parcours
// client (/essai/votre-site) dans un nouvel onglet, sans créer de compte. Drapeau côté serveur : cookie httpOnly posé par
// /admin/tester-parcours après exigerAdmin, et RE-VÉRIFIÉ à chaque lecture (rôle admin obligatoire : un cookie seul ne
// suffit jamais).
// En mode test, RIEN n'est écrit : aucune session anonyme, aucun site créé, aucun prospect (lead), aucun e-mail, aucune
// préférence client, aucune publication ; l'annuaire répond avec les fiches de DÉMONSTRATION (fictives). L'état du parcours
// ne vit que dans le navigateur (localStorage « onboarding-test ») : « Recommencer » et « Effacer mes sessions test » le vident.

export const COOKIE_MODE_TEST = 'parcours-client-test';
export const DUREE_MODE_TEST_S = 4 * 60 * 60;

/** Vrai seulement pour un super admin connecté qui a ouvert le mode test */
export async function estModeTest(): Promise<boolean> {
  const c = await cookies();
  if (c.get(COOKIE_MODE_TEST)?.value !== '1') return false;
  return (await getRole()) === 'admin';
}
