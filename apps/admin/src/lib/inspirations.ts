import 'server-only';
import { cache } from 'react';
import { normaliserPalette, type CouleurPalette } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Inspirations (migration 0028) : métadonnées en table, images dans le bucket PRIVÉ « inspirations » (lecture admin,
// URL signées d'une heure, jamais d'URL publique). Référence d'inspiration uniquement : jamais réutilisée sur un site.

export const BUCKET_INSPIRATIONS = 'inspirations';
const DUREE_URL_SIGNEE = 3600;

export type Inspiration = {
  id: string;
  chemin: string;
  /** URL signée (1 h) pour l'affichage dans l'admin ; null si la signature a échoué */
  image: string | null;
  lien: string | null;
  etiquettes: string[];
  objectif: string;
  sujet: string | null;
  typeElement: string | null;
  palette: CouleurPalette[];
  le: string;
};

type Ligne = { id: string; chemin: string; lien: string | null; etiquettes: string[] | null; objectif: string | null; sujet: string | null; type_element: string | null; palette: unknown; created_at: string };

async function getInspirationsSansMemo(limite = 200): Promise<{ inspirations: Inspiration[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inspirations')
    .select('id, chemin, lien, etiquettes, objectif, sujet, type_element, palette, created_at')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) return { inspirations: [], migrationManquante: true };
  const lignes = (data ?? []) as Ligne[];
  const signees = new Map<string, string>();
  if (lignes.length) {
    const { data: s } = await supabase.storage.from(BUCKET_INSPIRATIONS).createSignedUrls(lignes.map((l) => l.chemin), DUREE_URL_SIGNEE);
    for (const x of s ?? []) if (x.path && x.signedUrl && !x.error) signees.set(x.path, x.signedUrl);
  }
  return {
    migrationManquante: false,
    inspirations: lignes.map((l) => ({
      id: l.id, chemin: l.chemin, image: signees.get(l.chemin) ?? null, lien: l.lien, etiquettes: l.etiquettes ?? [], objectif: l.objectif ?? '',
      sujet: l.sujet, typeElement: l.type_element, palette: normaliserPalette(l.palette), le: l.created_at,
    })),
  };
}
export const getInspirations = cache(getInspirationsSansMemo);
