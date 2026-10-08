import 'server-only';
import { cache } from 'react';
import {
  clePhoto, clesImagesExclues, composerKitDemo, estImageDemo, notesPhotos, type ImageDemo, type KitDemo,
} from '@plateforme/core';
import { PROFESSION_PAR_DEFAUT } from '@plateforme/core/professions';
import { createClient } from '@/lib/supabase/server';
import { getLignesAssetsApprentissage } from '@/lib/notation-recettes';

// KIT DÉMO côté serveur (packages/core/src/kit-demo.ts) : images générées « Démo uniquement » (photos_libres, source « ia », dossier
// banque/ia/demo-<profession>/, migration 0048), acceptées (Arrivages : validée) et notées (assets_notes, ≥ 3 ★) ; composé pour
// chaque profession et posé dans le registre des kits sous demo:<profession> (getContexteImages) : TOUS les aperçus le lisent.
// Sans 0048 (aucune image démo ne peut encore être importée) : lecture par le dossier, emplacement « galerie ».

type Ligne = { url: string | null; chemin: string | null; statut: string; ia_emplacement?: string | null; ia_lot?: string | null; created_at?: string | null };

/** Images démo de la banque (toutes professions), notes et exclusions comprises */
export const getImagesDemo = cache(async (): Promise<{ images: ImageDemo[]; exclues: Set<string>; migration0048: boolean }> => {
  try {
    const supabase = await createClient();
    const lire = (colonnes: string) => supabase.from('photos_libres').select(colonnes).eq('source', 'ia').like('chemin', 'banque/ia/demo-%').order('created_at', { ascending: false }).limit(500);
    let { data, error } = await lire('url, chemin, statut, ia_emplacement, ia_lot, created_at');
    let migration0048 = true;
    if (error) { migration0048 = false; ({ data, error } = await lire('url, chemin, statut, created_at')); }
    if (error || !Array.isArray(data)) return { images: [], exclues: new Set(), migration0048 };
    const lignesNotes = await getLignesAssetsApprentissage();
    const notes = notesPhotos(lignesNotes);
    const exclues = clesImagesExclues(lignesNotes);
    const images = (data as unknown as Ligne[]).filter((l) => l.url && estImageDemo(l.url)).map((l) => {
      const cle = clePhoto(l.url!);
      const profession = /^banque\/ia\/demo-([a-z0-9-]+)\//.exec(l.chemin ?? '')?.[1] ?? PROFESSION_PAR_DEFAUT;
      return { url: l.url!, emplacement: l.ia_emplacement || 'demo-galerie', note: cle ? notes[cle]?.m ?? null : null, statut: l.statut, lot: l.ia_lot ?? null, profession };
    });
    return { images, exclues, migration0048 };
  } catch {
    return { images: [], exclues: new Set(), migration0048: false };
  }
});

/** Kit démo d'une profession (null : aucune image démo acceptée et notée) */
export async function getKitDemo(profession: string = PROFESSION_PAR_DEFAUT, rang = 0): Promise<KitDemo | null> {
  const { images, exclues } = await getImagesDemo();
  return composerKitDemo(images, { profession, rang, exclues });
}
