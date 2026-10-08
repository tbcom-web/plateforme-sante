import 'server-only';
import { cache } from 'react';
import { assainirMarque, type MarqueImportee } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

/** Marques de logo importées par l'admin et actives (renettoyées), proposées aux praticiens. */
async function getMarquesImporteesSansMemo(): Promise<MarqueImportee[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('marques_logo').select('id, nom, sens, view_box, contenu').eq('actif', true).order('nom');
  return (data ?? [])
    .map((l) => assainirMarque({ id: l.id, nom: l.nom, sens: l.sens, viewBox: l.view_box, contenu: l.contenu }))
    .filter((m): m is MarqueImportee => Boolean(m));
}
export const getMarquesImportees = cache(getMarquesImporteesSansMemo);
