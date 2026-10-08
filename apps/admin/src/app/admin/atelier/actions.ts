'use server';

import {
  appareilDe, cleCombinaison, estCleAsset, estEtiquetteAtelier, ingredientsCanoniques, ingredientsProposition, normaliserZones, propositionParId, serialiserZones, texteRemarques,
  type AppareilRetour, type IngredientsAtelier, type ZonesNote,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient, getUser } from '@/lib/supabase/server';

export type ResultatNoteAtelier = { ok: boolean; message: string; cle?: string; migrationManquante?: boolean };

/**
 * Ajoute une note au journal de l'atelier (migration 0026, ajout seul). Les ingrédients reçus sont RECALCULÉS : la proposition
 * est retrouvée par son identifiant dans le scénario (sujets, couleurs), comme le fait le générateur ; une combinaison qui ne
 * correspond à rien est refusée.
 */
export async function ajouterNoteAtelier(recus: Partial<IngredientsAtelier>, note: number, etiquettes: string[], commentaire: string, remarques: { positif?: string; negatif?: string; appareil?: AppareilRetour; zones?: ZonesNote | null } = {}): Promise<ResultatNoteAtelier> {
  await exigerAdmin();
  if (!Number.isInteger(note) || note < 1 || note > 5) return { ok: false, message: 'Note de 1 à 5.' };
  const i = ingredientsCanoniques(recus ?? {});
  const entree = { priorites: { principaux: i.themes, secondaires: [] }, couleursPreferees: i.couleurs };
  const p = propositionParId(entree, i.proposition);
  if (!p) return { ok: false, message: 'Combinaison inconnue du générateur (scénario modifié ?).' };
  // Photos montrées (style « photos ») : clés de la banque reçues, gardées si bien formées (la note porte aussi sur elles)
  const photos = p.modeVisuel === 'photos' ? (i.photos ?? []).filter((k) => estCleAsset(k) && k.startsWith('photo:')) : [];
  const ingredients = ingredientsCanoniques({ ...ingredientsProposition(p, entree), ...(photos.length ? { photos } : {}) });
  const cle = cleCombinaison(ingredients);
  const texte = String(commentaire ?? '').trim().slice(0, 2000) || null;
  const etq = [...new Set((etiquettes ?? []).filter(estEtiquetteAtelier))];
  const user = await getUser();
  const supabase = await createClient();
  const positif = String(remarques?.positif ?? '').trim().slice(0, 2000) || null;
  const negatif = String(remarques?.negatif ?? '').trim().slice(0, 2000) || null;
  const base = { cle_combinaison: cle, ingredients, note, etiquettes: etq, commentaire: texte, auteur: user?.id ?? null };
  const ligne: Record<string, unknown> = positif || negatif ? { ...base, positif, negatif } : base;
  // Appareil regardé et zones signalées (0034) ; sans la migration, note enregistrée sans eux
  const zones = serialiserZones(normaliserZones(remarques?.zones));
  let { error } = await supabase.from('atelier_notes').insert({ ...ligne, appareil: appareilDe(remarques?.appareil), zones: zones ? JSON.parse(zones) : null });
  if (error) ({ error } = await supabase.from('atelier_notes').insert(ligne));
  // Sans la migration 0028 (colonnes positif / negatif) : remarques regroupées dans le commentaire
  if (error && (positif || negatif)) {
    ({ error } = await supabase.from('atelier_notes').insert({ ...base, commentaire: texteRemarques({ positif, negatif, commentaire: texte }).slice(0, 2000) }));
  }
  if (error) return { ok: false, message: 'Enregistrement impossible : migration 0026 à exécuter (supabase/migrations/0026_atelier_notes.sql).', migrationManquante: true };
  return { ok: true, message: `${p.nom} : ${note}★ enregistrée${texte || positif || negatif ? ' avec remarques' : ''}.`, cle };
}
