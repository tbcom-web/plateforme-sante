import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Délai maximal de chaque requête Supabase côté serveur (2026-10-09, « l'admin ne charge pas ») : une requête qui ne répond pas
// (base chargée, réseau) échoue proprement au bout de 20 s (erreur renvoyée comme une table absente : repli de chaque lecture)
// au lieu de garder la page en chargement sans fin. Stockage (envois de fichiers) : inchangé.
// Requête déjà munie d'un signal (.abortSignal() de la chaîne des modèles, 2026-10-10 « la chaîne ne charge plus ») : le délai
// s'applique AUSSI (les deux signaux combinés) ; avant, ces requêtes n'avaient aucune limite et une table lente gardait /chaine en
// chargement jusqu'à l'arrêt de la fonction par Vercel (mesuré sur le banc : 60 s pour une table à 60 s, contre 20 s ailleurs).
const DELAI_SUPABASE_MS = 20_000;
// Journal des requêtes lentes (mesure continue, 2026-10-10) : toute requête Supabase de plus d'une seconde est écrite dans le journal
// du serveur (Vercel › Logs) avec sa table ou sa fonction, sa durée et son volume ; jamais les filtres ni les données (personnelles).
const LENTE_MS = 1000;
// Échecs de lecture (réseau, délai dépassé, erreur 5xx) depuis le démarrage de l'instance : un calcul d'apprentissage pendant lequel
// une lecture a échoué n'est pas gardé en base (apprentissage-instantane.ts : jamais un repli vide figé pour une heure)
let echecs = 0;
export const nombreEchecsSupabase = () => echecs;
const cible = (url: string) => { try { return new URL(url).pathname.replace(/^\/rest\/v1\//, '').replace(/^\/auth\/v1\//, 'auth/'); } catch { return '?'; } };
const fetchBorne: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.includes('/storage/v1/')) return fetch(input, init);
  const debut = performance.now();
  // abort() simple (AbortError) et non AbortSignal.timeout (TimeoutError) : postgrest-js retente jusqu'à 3 fois une requête en
  // erreur réseau SAUF une AbortError ; avec TimeoutError, une table lente coûtait 4 × 20 s (mesuré : Frigo 87 s)
  const c = new AbortController();
  const minuteur = setTimeout(() => c.abort(), DELAI_SUPABASE_MS);
  (minuteur as { unref?: () => void }).unref?.();
  const signal = init?.signal ? AbortSignal.any([init.signal, c.signal]) : c.signal;
  return fetch(input, { ...init, signal }).then((r) => {
    if (r.status >= 500) echecs++;
    const ms = performance.now() - debut;
    if (ms >= LENTE_MS) console.warn(`[supabase lent] ${init?.method ?? 'GET'} ${cible(url)} ${Math.round(ms)} ms (statut ${r.status}, ${r.headers.get('content-length') ?? '?'} octets)`);
    return r;
  }, (err) => {
    echecs++;
    const ms = performance.now() - debut;
    if (ms >= LENTE_MS) console.warn(`[supabase lent] ${init?.method ?? 'GET'} ${cible(url)} ${Math.round(ms)} ms (échec : ${err instanceof Error ? err.name : 'erreur'})`);
    throw err;
  });
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
