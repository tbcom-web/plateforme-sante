'use server';

import { revalidatePath } from 'next/cache';
import { estCleAsset, estSujetDeVisuel } from '@plateforme/core';
import { validerDecisionClassement, type DecisionClassement } from '@plateforme/core/classement-visuels';
import { exigerAdmin } from '@/lib/admin';
import { createClient, getUser } from '@/lib/supabase/server';

// Tri par sujet (/admin/retours/tri) : mêmes tables que les puces « + Sujet / × » (assets_sujets, 0028, journal en ajout seul ;
// état courant = dernière action) et que les suggestions (classement_suggestions, 0033, sans auteur ; ignoré sans la migration).

const MIGRATION_SUJETS = 'Enregistrement impossible : migration 0028 à exécuter (supabase/migrations/0028_inspirations_photos_libres.sql).';

type Action = { sujet: string; action: 'ajout' | 'retrait' };
const actionValide = (a: Partial<Action> | null | undefined): a is Action => Boolean(a) && estSujetDeVisuel(a!.sujet) && (a!.action === 'ajout' || a!.action === 'retrait');

/**
 * « Suivant » du tri : enregistre les sujets cochés d'un visuel (ajouts / retraits par rapport à ses sujets effectifs) et les
 * suggestions acceptées ou refusées (contexte « bibliotheque »).
 */
export async function enregistrerTri(cle: string, actions: Action[], decisions: Partial<DecisionClassement>[] = []): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!estCleAsset(cle)) return { ok: false, message: 'Visuel inconnu.' };
  const l = (Array.isArray(actions) ? actions : []).filter(actionValide).slice(0, 20);
  const supabase = await createClient();
  if (l.length) {
    const user = await getUser();
    const { error } = await supabase.from('assets_sujets').insert(l.map((a) => ({ cle_asset: cle, sujet: a.sujet, action: a.action, auteur: user?.id ?? null })));
    if (error) return { ok: false, message: MIGRATION_SUJETS, migrationManquante: true };
  }
  const d = (Array.isArray(decisions) ? decisions : []).slice(0, 30).map((x) => validerDecisionClassement({ ...(x ?? {}), contexte: 'bibliotheque' })).filter((x): x is DecisionClassement => x !== null);
  if (d.length) await supabase.from('classement_suggestions').insert(d);
  if (l.length) revalidatePath('/admin/illustrations');
  return { ok: true, message: l.length ? `${l.length} changement${l.length > 1 ? 's' : ''} de sujet enregistré${l.length > 1 ? 's' : ''}.` : 'Sujets confirmés.' };
}

/** Actions groupées : ajoute (ou retire) un sujet à une sélection de visuels (500 au plus) */
export async function sujetEnLot(cles: string[], sujet: string, action: 'ajout' | 'retrait'): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!estSujetDeVisuel(sujet) || (action !== 'ajout' && action !== 'retrait')) return { ok: false, message: 'Sujet invalide.' };
  const l = [...new Set((Array.isArray(cles) ? cles : []).filter(estCleAsset))].slice(0, 500);
  if (!l.length) return { ok: false, message: 'Aucun visuel sélectionné.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('assets_sujets').insert(l.map((cle) => ({ cle_asset: cle, sujet, action, auteur: user?.id ?? null })));
  if (error) return { ok: false, message: MIGRATION_SUJETS, migrationManquante: true };
  revalidatePath('/admin/illustrations');
  return { ok: true, message: `${l.length} visuel${l.length > 1 ? 's' : ''} : sujet ${action === 'ajout' ? 'ajouté' : 'retiré'}.` };
}
