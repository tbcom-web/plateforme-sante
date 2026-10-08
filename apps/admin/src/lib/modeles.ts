import 'server-only';
import { cache } from 'react';
import { MODELES_INTEGRES, validerManifeste, type ModeleManifeste } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

export type ModeleDisponible = { id: string; nom: string; description: string; couleurConseillee?: string; source: 'integre' | 'importe'; manifeste: ModeleManifeste };
export type LigneModele = { id: string; nom: string; manifeste: unknown; version: number; actif: boolean; updated_at: string };

/** Toutes les fiches importées (admin), ou seulement les actives (praticiens, via RLS). */
async function getModelesImportesSansMemo(): Promise<{ lignes: LigneModele[]; erreur: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('modeles').select('id, nom, manifeste, version, actif, updated_at').order('nom');
  return { lignes: (data ?? []) as LigneModele[], erreur: Boolean(error) };
}
export const getModelesImportes = cache(getModelesImportesSansMemo);

/** Modèles proposables : intégrés + importés actifs. Une fiche importée active remplace l'intégré de même id. */
async function getModelesDisponiblesSansMemo(): Promise<ModeleDisponible[]> {
  const { lignes } = await getModelesImportes();
  const importes = new Map<string, ModeleManifeste>();
  for (const l of lignes) {
    const { modele } = validerManifeste(l.manifeste);
    if (l.actif && modele) importes.set(modele.id, modele);
  }
  const liste: ModeleDisponible[] = MODELES_INTEGRES.map((m) => {
    const r = importes.get(m.id) ?? m;
    return { id: r.id, nom: r.nom, description: r.description, couleurConseillee: r.couleurConseillee, source: importes.has(m.id) ? 'importe' : 'integre', manifeste: r };
  });
  for (const [id, m] of importes) {
    if (!liste.some((x) => x.id === id)) liste.push({ id, nom: m.nom, description: m.description, couleurConseillee: m.couleurConseillee, source: 'importe', manifeste: m });
  }
  return liste;
}
export const getModelesDisponibles = cache(getModelesDisponiblesSansMemo);
