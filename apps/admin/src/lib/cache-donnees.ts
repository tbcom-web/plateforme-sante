import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getRole } from '@/lib/admin';

// CACHE DES DONNÉES QUI CHANGENT RAREMENT (2026-10-10, « optimiser les requêtes, la base ») : catalogue des soins, logos de marques,
// modèles importés, statuts des univers, équipe de la chaîne. Gardées dans le cache de données de Next (partagé entre les instances
// sur Vercel, docs node_modules/next/dist/docs : unstable_cache, sans « Cache Components » dans ce projet) une heure au plus, et
// INVALIDÉES par les actions qui écrivent (invaliderDonnees → updateTag : la personne voit tout de suite sa modification).
// Clé : nom + rôle (admin / autre : les règles de lecture diffèrent) + arguments ; la session est lue hors du cache (cookies).
// Une lecture en échec n'est JAMAIS gardée : la valeur de repli est rendue pour cette requête seulement.

export const TAGS_DONNEES = {
  catalogue: 'donnees:catalogue',
  marques: 'donnees:marques-logo',
  modeles: 'donnees:modeles-importes',
  univers: 'donnees:univers-statuts',
  equipe: 'donnees:equipe-chaine',
} as const;
export type TagDonnees = (typeof TAGS_DONNEES)[keyof typeof TAGS_DONNEES];

type Client = Awaited<ReturnType<typeof createClient>>;
/** Résultat d'une lecture : ok (gardé) ou repli (rendu sans être gardé) */
export type Lecture<T> = { ok: true; valeur: T } | { ok: false; repli: T };
class LectureNonGardee<T> extends Error { constructor(readonly repli: T) { super('lecture non gardée'); } }

/** Lecture `lire` gardée sous `nom` (une heure, tags) ; hors requête ou cache indisponible : lecture directe */
export async function lireEnCache<T>(nom: string, tag: TagDonnees, args: readonly (string | number | boolean | null)[], lire: (supabase: Client) => Promise<Lecture<T>>): Promise<T> {
  const supabase = await createClient();
  const portee = (await getRole().catch(() => null)) === 'admin' ? 'admin' : 'autre';
  try {
    return await unstable_cache(async () => {
      const r = await lire(supabase);
      if (!r.ok) throw new LectureNonGardee(r.repli);
      return r.valeur;
    }, ['donnees', nom, portee, JSON.stringify(args)], { tags: [tag], revalidate: 3600 })();
  } catch (e) {
    if (e instanceof LectureNonGardee) return e.repli as T;
    const r = await lire(supabase);
    return r.ok ? r.valeur : r.repli;
  }
}
