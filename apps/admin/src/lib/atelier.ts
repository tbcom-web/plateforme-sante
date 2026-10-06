import 'server-only';
import { estEtiquetteAtelier, poidsAtelier, type IngredientsAtelier, type NoteAtelierLue, type PoidsAtelier } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';

// Notes de l'atelier des propositions (migration 0026).
// - getNotesAtelier : journal complet, lu par le super admin (/admin/atelier) ;
// - getPoidsAtelier : poids appris, calculés côté serveur à partir de atelier_notes_apprentissage() (ingrédients, note,
//   étiquettes : ni commentaire ni auteur), pour tout compte connecté, y compris les sessions anonymes de l'essai.

export type NoteAtelierAdmin = NoteAtelierLue & { id: string; cle: string };

type Ligne = { id: string; cle_combinaison: string; ingredients: Partial<IngredientsAtelier> | null; note: number; etiquettes: string[] | null; commentaire: string | null; created_at: string };

/** Journal des notes (plus récentes d'abord) ; `migrationManquante` : table absente (migration 0026 pas encore exécutée) */
export async function getNotesAtelier(): Promise<{ notes: NoteAtelierAdmin[]; migrationManquante: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('atelier_notes')
    .select('id, cle_combinaison, ingredients, note, etiquettes, commentaire, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) return { notes: [], migrationManquante: true };
  const notes = ((data ?? []) as Ligne[])
    .filter((l) => l.ingredients && typeof l.ingredients === 'object')
    .map((l) => ({
      id: l.id, cle: l.cle_combinaison, ingredients: l.ingredients!, note: l.note,
      etiquettes: (l.etiquettes ?? []).filter(estEtiquetteAtelier), commentaire: l.commentaire, le: l.created_at,
    }));
  return { notes, migrationManquante: false };
}

/** Poids appris pour le générateur de propositions ; null sans notes ou si la migration 0026 manque (aucune erreur) */
export async function getPoidsAtelier(): Promise<PoidsAtelier | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('atelier_notes_apprentissage', { p_limite: 5000 });
    if (error || !Array.isArray(data) || !data.length) return null;
    const poids = poidsAtelier((data as { ingredients: Partial<IngredientsAtelier>; note: number; etiquettes: string[] | null }[]).map((l) => ({ ingredients: l.ingredients ?? {}, note: l.note, etiquettes: l.etiquettes })));
    return poids.n ? poids : null;
  } catch {
    return null;
  }
}
