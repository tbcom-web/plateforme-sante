import 'server-only';
import { appliquerRenforts, estEtiquetteAtelier, poidsAtelier, renfortsPoids, sourcesCombinaisons, sourcesRecettes, type IngredientsAtelier, type NoteAtelierLue, type PoidsAtelier } from '@plateforme/core';
import { getRecettesLecture } from '@/lib/recettes';
import { createClient } from '@/lib/supabase/server';
import { getPoidsAssets } from '@/lib/assets-notes';

// Notes de l'atelier des propositions (migration 0026).
// - getNotesAtelier : journal complet, lu par le super admin (/admin/atelier) ;
// - getPoidsAtelier : poids appris, calculés côté serveur à partir de atelier_notes_apprentissage() (ingrédients, note,
//   étiquettes : ni commentaire ni auteur), pour tout compte connecté, y compris les sessions anonymes de l'essai.

export type NoteAtelierAdmin = NoteAtelierLue & { id: string; cle: string };

type Ligne = { id: string; cle_combinaison: string; ingredients: Partial<IngredientsAtelier> | null; note: number; etiquettes: string[] | null; commentaire: string | null; positif?: string | null; negatif?: string | null; created_at: string };

/** Journal des notes (plus récentes d'abord) ; `migrationManquante` : table absente (migration 0026 pas encore exécutée) */
export async function getNotesAtelier(): Promise<{ notes: NoteAtelierAdmin[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const lire = (colonnes: string) => supabase.from('atelier_notes').select(colonnes).order('created_at', { ascending: false }).limit(5000);
  // Remarques « ce qui va bien / ce qui ne va pas » (0028) ; sans la migration 0028, lecture sans ces colonnes
  let { data, error } = await lire('id, cle_combinaison, ingredients, note, etiquettes, commentaire, positif, negatif, created_at');
  if (error) ({ data, error } = await lire('id, cle_combinaison, ingredients, note, etiquettes, commentaire, created_at'));
  if (error) return { notes: [], migrationManquante: true };
  const notes = ((data ?? []) as unknown as Ligne[])
    .filter((l) => l.ingredients && typeof l.ingredients === 'object')
    .map((l) => ({
      id: l.id, cle: l.cle_combinaison, ingredients: l.ingredients!, note: l.note,
      etiquettes: (l.etiquettes ?? []).filter(estEtiquetteAtelier), commentaire: l.commentaire, positif: l.positif ?? null, negatif: l.negatif ?? null, le: l.created_at,
    }));
  return { notes, migrationManquante: false };
}

/**
 * Poids appris pour le générateur de propositions (notes de l'atelier + notes et statuts des assets, 0027) ; null sans
 * aucune note ni statut, ou si les migrations manquent (aucune erreur).
 */
export async function getPoidsAtelier(): Promise<PoidsAtelier | null> {
  const [atelier, assets, recettes] = await Promise.all([poidsDesCombinaisons(), getPoidsAssets(), getRecettesLecture(1)]);
  const base = !atelier?.poids && !assets ? null : { ...(atelier?.poids ?? { n: 0, moyenne: 0, effets: {} }), ...(assets ? { assets } : {}) };
  // Renforts (recettes.ts) : une recette ou une combinaison notée renforce (ou affaiblit) un peu chacun de ses ingrédients
  const sources = [...sourcesRecettes(recettes), ...sourcesCombinaisons(atelier?.lignes ?? [])];
  return sources.length ? appliquerRenforts(base, renfortsPoids(sources, base?.moyenne || 3)) : base;
}

type LigneApprentissage = { ingredients: Partial<IngredientsAtelier>; note: number; etiquettes: string[] | null };

async function poidsDesCombinaisons(): Promise<{ poids: PoidsAtelier | null; lignes: LigneApprentissage[] } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('atelier_notes_apprentissage', { p_limite: 5000 });
    if (error || !Array.isArray(data) || !data.length) return null;
    const lignes = (data as LigneApprentissage[]).map((l) => ({ ingredients: l.ingredients ?? {}, note: l.note, etiquettes: l.etiquettes }));
    const poids = poidsAtelier(lignes);
    return { poids: poids.n ? poids : null, lignes };
  } catch {
    return null;
  }
}
