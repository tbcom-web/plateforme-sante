import 'server-only';
import { kitDuProfil, profilParId } from '@plateforme/core';
import { candidatesPhotos, comptesChoix, estEmplacementImage, trierCandidates, type CandidateImage, type ChoixImage } from '@plateforme/core/chaine-images';
import { getDonneesKits } from '@/lib/kits-images';
import { instantane, porteeInstantane, SOURCES_CONTEXTE_IMAGES } from '@/lib/apprentissage-instantane';
import { createClient } from '@/lib/supabase/server';
import { profilsChaine } from './donnees';

// Images en situation (chaine-images.ts) : photos candidates de chaque profil de démonstration (kit du profil : son activité puis le
// neutre du thème, jamais une autre activité ni une image refusée) et journal des choix (modeles_images_choix, migration 0063).

export const MIGRATION_IMAGES = 'Migration 0063 à exécuter (supabase/migrations/0063_images_situation.sql) : le choix est montré mais pas encore enregistré.';

/** Journal des choix d'images (toute la chaîne : signal positif des images) ; table absente → migrationManquante */
export async function lireChoixImages(): Promise<{ lignes: ChoixImage[]; migrationManquante: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('modeles_images_choix').select('modele, profil, emplacement, image, created_at').order('created_at', { ascending: false }).limit(5000);
    if (error) return { lignes: [], migrationManquante: true };
    const lignes = ((data ?? []) as { modele: string; profil: string; emplacement: string; image: string; created_at: string }[])
      .filter((l) => estEmplacementImage(l.emplacement))
      .map((l) => ({ modele: l.modele, profil: l.profil, emplacement: l.emplacement as ChoixImage['emplacement'], image: l.image, le: l.created_at }));
    return { lignes, migrationManquante: false };
  } catch {
    return { lignes: [], migrationManquante: true };
  }
}

/** Photos candidates (kit complet, à valider compris) de chaque profil de démonstration de la profession */
async function calculerCandidates(): Promise<Record<string, CandidateImage[]>> {
  const { profession, profils } = await profilsChaine();
  const dk = await getDonneesKits();
  const r: Record<string, CandidateImage[]> = {};
  for (const p of profils) {
    const pp = profilParId(p.id, profession.id);
    if (!pp) continue;
    try { r[p.id] = candidatesPhotos(kitDuProfil(pp, { photos: dk }), pp.activites[0] ?? null); } catch { r[p.id] = []; }
  }
  return r;
}

/** Candidates (gardées en instantané comme les photos des profils de démonstration), ordonnées avec le signal des choix */
export async function candidatesImagesDemo(choix: readonly ChoixImage[]): Promise<Record<string, CandidateImage[]>> {
  let base: Record<string, CandidateImage[]> = {};
  try {
    const { profession } = await profilsChaine();
    base = await instantane({ cle: `images-candidates|${profession.id}`, portee: await porteeInstantane(), tables: SOURCES_CONTEXTE_IMAGES, calculer: calculerCandidates });
  } catch {
    base = {};
  }
  const n = comptesChoix(choix);
  const r: Record<string, CandidateImage[]> = {};
  for (const [id, l] of Object.entries(base ?? {})) {
    // Déjà choisies d'abord, à rang de validation égal (chaine-images.ts, trierCandidates)
    r[id] = trierCandidates((Array.isArray(l) ? l : []).map((c) => (n[c.image] ? { ...c, choisie: n[c.image] } : c)));
  }
  return r;
}
