'use server';

import { revalidatePath } from 'next/cache';
import { clePhoto, estAssetDuCode, estEtiquetteDuType, typeDeCle } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getPhotosDesJeux } from '@/lib/assets-notes';
import { lancerWorkflow } from '@/lib/publication';
import { createClient, getUser } from '@/lib/supabase/server';

export type ResultatNoteAsset = { ok: boolean; message: string; le?: string; migrationManquante?: boolean };

/**
 * Ajoute une note au journal des assets (migration 0027, ajout seul) : clé connue de l'inventaire (code, ou photo d'un jeu
 * de photos), note de 1 à 5, étiquettes de la famille de l'asset, commentaire facultatif, empreinte du rendu noté.
 */
export async function ajouterNoteAsset(cle: string, note: number, etiquettes: string[], commentaire: string, empreinte: string | null): Promise<ResultatNoteAsset> {
  await exigerAdmin();
  const type = typeof cle === 'string' ? typeDeCle(cle) : null;
  if (!type) return { ok: false, message: 'Élément inconnu.' };
  if (!estAssetDuCode(cle)) {
    const photos = type === 'photo' ? await getPhotosDesJeux() : [];
    if (!photos.some((p) => clePhoto(p.url) === cle)) return { ok: false, message: 'Élément inconnu.' };
  }
  if (!Number.isInteger(note) || note < 1 || note > 5) return { ok: false, message: 'Note de 1 à 5.' };
  const etq = [...new Set((etiquettes ?? []).filter((e) => estEtiquetteDuType(type, e)))].slice(0, 12);
  const texte = String(commentaire ?? '').trim().slice(0, 2000) || null;
  const user = await getUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assets_notes')
    .insert({ cle_asset: cle, type, note, etiquettes: etq, commentaire: texte, empreinte: empreinte && /^[0-9a-f]{8}$/.test(empreinte) ? empreinte : null, auteur: user?.id ?? null })
    .select('created_at')
    .maybeSingle();
  if (error) return { ok: false, message: 'Enregistrement impossible : migration 0027 à exécuter (supabase/migrations/0027_assets_notes.sql).', migrationManquante: true };
  revalidatePath('/admin/illustrations');
  return { ok: true, message: `${note}★ enregistrée${texte ? ' avec commentaire' : ''}.`, le: data?.created_at };
}

/**
 * « Envoyer mes retours à Claude maintenant » : lance le workflow exporter-retours.yml (même jeton GitHub que la publication),
 * qui écrit les retours anonymisés dans le dossier retours/ du dépôt. Admin seulement.
 */
export async function envoyerRetoursAClaude(): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  const erreur = await lancerWorkflow('exporter-retours.yml', {});
  if (erreur) return { ok: false, message: erreur.message.includes('non configurée') ? 'Envoi non configuré (GITHUB_TOKEN / GITHUB_REPO).' : 'L’envoi n’a pas pu démarrer (GitHub). Réessayez plus tard : l’export automatique passe aussi chaque nuit.' };
  return { ok: true, message: 'Envoi lancé : vos retours seront dans le dépôt (dossier retours/) d’ici deux à trois minutes.' };
}
