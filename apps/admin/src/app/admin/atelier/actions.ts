'use server';

import {
  cleCombinaison, estEtiquetteAtelier, ingredientsCanoniques, ingredientsProposition, propositionParId,
  type IngredientsAtelier,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient, getUser } from '@/lib/supabase/server';

export type ResultatNoteAtelier = { ok: boolean; message: string; cle?: string; migrationManquante?: boolean };

/**
 * Ajoute une note au journal de l'atelier (migration 0026, ajout seul). Les ingrédients reçus sont RECALCULÉS : la proposition
 * est retrouvée par son identifiant dans le scénario (sujets, couleurs), comme le fait le générateur ; une combinaison qui ne
 * correspond à rien est refusée.
 */
export async function ajouterNoteAtelier(recus: Partial<IngredientsAtelier>, note: number, etiquettes: string[], commentaire: string): Promise<ResultatNoteAtelier> {
  await exigerAdmin();
  if (!Number.isInteger(note) || note < 1 || note > 5) return { ok: false, message: 'Note de 1 à 5.' };
  const i = ingredientsCanoniques(recus ?? {});
  const entree = { priorites: { principaux: i.themes, secondaires: [] }, couleursPreferees: i.couleurs };
  const p = propositionParId(entree, i.proposition);
  if (!p) return { ok: false, message: 'Combinaison inconnue du générateur (scénario modifié ?).' };
  const ingredients = ingredientsProposition(p, entree);
  const cle = cleCombinaison(ingredients);
  const texte = String(commentaire ?? '').trim().slice(0, 2000) || null;
  const etq = [...new Set((etiquettes ?? []).filter(estEtiquetteAtelier))];
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('atelier_notes').insert({ cle_combinaison: cle, ingredients, note, etiquettes: etq, commentaire: texte, auteur: user?.id ?? null });
  if (error) return { ok: false, message: 'Enregistrement impossible : migration 0026 à exécuter (supabase/migrations/0026_atelier_notes.sql).', migrationManquante: true };
  return { ok: true, message: `${p.nom} : ${note}★ enregistrée${texte ? ' avec commentaire' : ''}.`, cle };
}
