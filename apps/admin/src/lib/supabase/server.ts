import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Délai maximal de chaque requête Supabase côté serveur (2026-10-09, « l'admin ne charge pas ») : une requête qui ne répond pas
// (base chargée, réseau) échoue proprement au bout de 20 s (erreur renvoyée comme une table absente : repli de chaque lecture)
// au lieu de garder la page en chargement sans fin. Stockage (envois de fichiers) et requêtes déjà munies d'un signal : inchangés.
const DELAI_SUPABASE_MS = 20_000;
const fetchBorne: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (init?.signal || url.includes('/storage/v1/')) return fetch(input, init);
  return fetch(input, { ...init, signal: AbortSignal.timeout(DELAI_SUPABASE_MS) });
};

/** Client Supabase côté serveur, authentifié avec la session du visiteur. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: fetchBorne },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : le proxy se charge de rafraîchir la session.
          }
        },
      },
    },
  );
}

/** Utilisateur connecté (vérifié auprès de Supabase), ou null. */
async function getUserSansMemo() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
export const getUser = cache(getUserSansMemo);
