'use server';

import { revalidatePath } from 'next/cache';
import { estCleAsset } from '@plateforme/core';
import { ecrituresValidation, type ChoixValidation } from '@plateforme/core/propositions-claude-tags';
import { exigerAdmin } from '@/lib/admin';
import { getHashtagsAssets, MIGRATION_HASHTAGS } from '@/lib/hashtags';
import { getPropositionsTags } from '@/lib/propositions-tags';
import { createClient, getUser } from '@/lib/supabase/server';

// « Propositions de Claude » (/admin/frigo/tri/claude) : seul chemin d'écriture. Les tags COCHÉS par Paul (proposés par Claude,
// éventuellement corrigés) vont dans assets_sujets (0028) et assets_hashtags (0029) avec l'auteur = Paul (compte connecté) ;
// l'origine est tracée dans classement_suggestions (0033 : contexte « bibliotheque », raison « proposition Claude <clé> »,
// sans auteur). Jamais de note : la note prédite n'est pas une note de Paul et n'est écrite nulle part.

const MIGRATION_SUJETS = 'Enregistrement impossible : migration 0028 à exécuter (supabase/migrations/0028_inspirations_photos_libres.sql).';

export async function validerPropositionsTags(choix: ChoixValidation[], sujetsEffectifs: Record<string, string[]> = {}): Promise<{ ok: boolean; message: string; valides?: string[]; migrationManquante?: boolean }> {
  await exigerAdmin();
  const l = (Array.isArray(choix) ? choix : []).filter((c) => c && estCleAsset(c.cle)).slice(0, 500);
  if (!l.length) return { ok: false, message: 'Aucun visuel sélectionné.' };
  const [lot, h] = await Promise.all([getPropositionsTags(), getHashtagsAssets()]);
  // Sujets effectifs envoyés par la page (affichage) : ne servent qu'à éviter des ajouts redondants ; un ajout en trop est sans effet
  const sujets = Object.fromEntries(Object.entries(sujetsEffectifs ?? {}).filter(([k, v]) => estCleAsset(k) && Array.isArray(v)).map(([k, v]) => [k, v.filter((x) => typeof x === 'string')]));
  const e = ecrituresValidation(l, lot.propositions, { sujets, hashtags: h.hashtags });
  const user = await getUser();
  const supabase = await createClient();
  if (e.sujets.length) {
    const { error } = await supabase.from('assets_sujets').insert(e.sujets.slice(0, 2000).map((x) => ({ cle_asset: x.cle, sujet: x.sujet, action: x.action, auteur: user?.id ?? null })));
    if (error) return { ok: false, message: MIGRATION_SUJETS, migrationManquante: true };
  }
  if (e.hashtags.length) {
    const { error } = await supabase.from('assets_hashtags').insert(e.hashtags.slice(0, 4000).map((x) => ({ cle_asset: x.cle, hashtag: x.hashtag, action: x.action, auteur: user?.id ?? null })));
    if (error) return { ok: false, message: MIGRATION_HASHTAGS, migrationManquante: true };
  }
  // Origine « proposition Claude » : facultatif (sans la migration 0033, ignoré)
  if (e.suggestions.length) await supabase.from('classement_suggestions').insert(e.suggestions.slice(0, 4000));
  revalidatePath('/admin/frigo/tri/claude');
  revalidatePath('/admin/illustrations');
  const n = new Set(l.map((c) => c.cle)).size;
  return { ok: true, message: `${n} visuel${n > 1 ? 's' : ''} validé${n > 1 ? 's' : ''} : ${e.sujets.length} sujet${e.sujets.length > 1 ? 's' : ''} et ${e.hashtags.length} hashtag${e.hashtags.length > 1 ? 's' : ''} ajoutés.`, valides: l.map((c) => c.cle) };
}
