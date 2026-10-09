'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { CATALOGUE_REGLES, lireExposition, type Exposition } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { COOKIE_REGLES, oublierPolitique } from '@/lib/politique-evaluation';

// Politique d'évaluation (packages/core/src/politique-evaluation.ts, migration 0054) : journal des expositions (écrans passés sans
// réponse, décisions des Arrivages et leurs raisons, « Pas pour ici » des kits) et « Désactiver » une règle apprise.

export type ResultatExpositions = { ok: boolean; message: string; migrationManquante?: boolean };

/** Ajoute des expositions (50 au plus) ; la date est posée par la base. Sans la migration : à garder dans le navigateur. */
export async function enregistrerExpositions(lignes: readonly Partial<Exposition>[]): Promise<ResultatExpositions> {
  await exigerAdmin();
  const l = (Array.isArray(lignes) ? lignes : []).slice(0, 50).map((x) => lireExposition({ ...x, le: new Date().toISOString() } as Record<string, unknown>)).filter((x): x is Exposition => x !== null);
  if (!l.length) return { ok: true, message: '' };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('expositions').insert(l.map((e) => ({ cle: e.cle, surface: e.surface, ecran: e.ecran, resultat: e.resultat, note: e.note ?? null, etiquettes: e.etiquettes ?? [], texte: e.texte ?? null })));
    if (error) return { ok: false, migrationManquante: true, message: 'Migration 0054 à exécuter : mémoire gardée dans ce navigateur.' };
    return { ok: true, message: '' };
  } catch {
    return { ok: false, migrationManquante: true, message: 'Connexion perdue : mémoire gardée dans ce navigateur.' };
  }
}

/** « Désactiver » / « Réactiver » une règle apprise : table regles_apprises_reglages (0054), sinon cookie (un an) */
export async function basculerRegle(regle: string, active: boolean): Promise<ResultatExpositions> {
  await exigerAdmin();
  if (!CATALOGUE_REGLES.some((r) => r.id === regle)) return { ok: false, message: 'Règle inconnue.' };
  const jar = await cookies();
  const actuel = new Set((jar.get(COOKIE_REGLES)?.value ?? '').split(',').filter(Boolean));
  if (active) actuel.delete(regle); else actuel.add(regle);
  // Cookie toujours tenu à jour (secours sans la table, et lecture immédiate)
  jar.set(COOKIE_REGLES, [...actuel].join(','), { path: '/', maxAge: 365 * 86400, sameSite: 'lax', httpOnly: true });
  let migrationManquante = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('regles_apprises_reglages').insert({ regle, active });
    if (error) migrationManquante = true;
  } catch { migrationManquante = true; }
  oublierPolitique();
  revalidatePath('/admin/retours/compris');
  revalidatePath('/admin');
  return { ok: true, migrationManquante, message: `${active ? 'Règle réactivée' : 'Règle désactivée'}${migrationManquante ? ' (dans ce navigateur : migration 0054 à exécuter)' : ''}.` };
}
