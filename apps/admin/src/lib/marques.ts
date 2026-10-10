import 'server-only';
import { cache } from 'react';
import { assainirMarque, type MarqueImportee } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { lireEnCache, TAGS_DONNEES } from '@/lib/cache-donnees';

/** Marques de logo importées par l'admin et actives (renettoyées), proposées aux praticiens. */
async function getMarquesImporteesSansMemo(): Promise<MarqueImportee[]> {
  // Gardé dans le cache de données (cache-donnees.ts, invalidé par app/admin/logos/actions.ts)
  type L = { id: string; nom: string; sens: string; view_box: string; contenu: string };
  const data = await lireEnCache<L[]>('marques', TAGS_DONNEES.marques, [], async (supabase) => {
    const { data, error } = await supabase.from('marques_logo').select('id, nom, sens, view_box, contenu').eq('actif', true).order('nom');
    return error ? { ok: false, repli: (data ?? []) as L[] } : { ok: true, valeur: (data ?? []) as L[] };
  });
  return (data ?? [])
    .map((l) => assainirMarque({ id: l.id, nom: l.nom, sens: l.sens, viewBox: l.view_box, contenu: l.contenu }))
    .filter((m): m is MarqueImportee => Boolean(m));
}
export const getMarquesImportees = cache(getMarquesImporteesSansMemo);
