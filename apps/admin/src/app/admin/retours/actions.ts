'use server';

import { revalidatePath } from 'next/cache';
import { clePhoto, estAssetDuCode, estCleAsset, estCleStudio, estEtiquetteDuType, estSujetDeVisuel, lireInstantane, texteRemarques, typeDeCle } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getPhotosDesJeux } from '@/lib/assets-notes';
import { lancerWorkflow } from '@/lib/publication';
import { createClient, getUser } from '@/lib/supabase/server';

export type ResultatNoteAsset = { ok: boolean; message: string; le?: string; migrationManquante?: boolean };

/**
 * Ajoute une note au journal des assets (migration 0027, ajout seul) : clé connue de l'inventaire (code, ou photo d'un jeu
 * de photos), note de 1 à 5, étiquettes de la famille de l'asset, commentaire facultatif, empreinte du rendu noté.
 */
export async function ajouterNoteAsset(
  cle: string, note: number, etiquettes: string[], commentaire: string, empreinte: string | null,
  extras: { positif?: string; negatif?: string; apercu?: string | null } = {},
): Promise<ResultatNoteAsset> {
  await exigerAdmin();
  const type = typeof cle === 'string' ? typeDeCle(cle) : null;
  if (!type) return { ok: false, message: 'Élément inconnu.' };
  // Structures de pages, éléments et jeux d'effets du studio (tuiles dédiées) : clé connue du studio (recettes.ts)
  if (!estAssetDuCode(cle) && !estCleStudio(cle)) {
    const photos = type === 'photo' ? await getPhotosDesJeux() : [];
    if (!photos.some((p) => clePhoto(p.url) === cle)) return { ok: false, message: 'Élément inconnu.' };
  }
  if (!Number.isInteger(note) || note < 1 || note > 5) return { ok: false, message: 'Note de 1 à 5.' };
  const etq = [...new Set((etiquettes ?? []).filter((e) => estEtiquetteDuType(type, e)))].slice(0, 12);
  const texte = String(commentaire ?? '').trim().slice(0, 2000) || null;
  const user = await getUser();
  const supabase = await createClient();
  const positif = String(extras?.positif ?? '').trim().slice(0, 2000) || null;
  const negatif = String(extras?.negatif ?? '').trim().slice(0, 2000) || null;
  // Instantané du rendu noté (avant / après) : SVG, adresse d'image ou couleurs de gamme reconnus seulement
  const apercu = lireInstantane(extras?.apercu) ? String(extras!.apercu) : null;
  const base = { cle_asset: cle, type, note, etiquettes: etq, commentaire: texte, empreinte: empreinte && /^[0-9a-f]{8}$/.test(empreinte) ? empreinte : null, auteur: user?.id ?? null };
  const inserer = (ligne: Record<string, unknown>) => supabase.from('assets_notes').insert(ligne).select('created_at').maybeSingle();
  let { data, error } = await inserer({ ...base, positif, negatif, apercu });
  // Sans la migration 0028 (colonnes positif, negatif, apercu) : remarques regroupées dans le commentaire, sans instantané
  if (error) ({ data, error } = await inserer({ ...base, commentaire: (texteRemarques({ positif, negatif, commentaire: texte }) || null)?.slice(0, 2000) ?? null }));
  if (error) return { ok: false, message: 'Enregistrement impossible : migration 0027 à exécuter (supabase/migrations/0027_assets_notes.sql).', migrationManquante: true };
  revalidatePath('/admin/illustrations');
  return { ok: true, message: `${note}★ enregistrée${texte || positif || negatif ? ' avec remarques' : ''}.`, le: data?.created_at };
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

export type NoteAvant = { note: number; etiquettes: string[]; commentaire: string | null; positif: string | null; negatif: string | null; empreinte: string | null; apercu: string | null; le: string };

/**
 * Dernière note d'un élément, avec l'instantané du rendu noté (avant / après) : lu à la demande, seulement quand l'élément a
 * changé depuis (l'instantané peut peser jusqu'à 60 Ko). Sans la migration 0028 : sans instantané (archives à la place).
 */
export async function derniereNoteAsset(cle: string): Promise<NoteAvant | null> {
  await exigerAdmin();
  if (!estCleAsset(cle)) return null;
  const supabase = await createClient();
  const lire = (colonnes: string) => supabase.from('assets_notes').select(colonnes).eq('cle_asset', cle).order('created_at', { ascending: false }).limit(1).maybeSingle();
  let { data, error } = await lire('note, etiquettes, commentaire, positif, negatif, empreinte, apercu, created_at');
  if (error) ({ data, error } = await lire('note, etiquettes, commentaire, empreinte, created_at'));
  if (error || !data) return null;
  const l = data as unknown as { note: number; etiquettes: string[] | null; commentaire: string | null; positif?: string | null; negatif?: string | null; empreinte: string | null; apercu?: string | null; created_at: string };
  return { note: l.note, etiquettes: l.etiquettes ?? [], commentaire: l.commentaire, positif: l.positif ?? null, negatif: l.negatif ?? null, empreinte: l.empreinte, apercu: l.apercu ?? null, le: l.created_at };
}

/**
 * Ajoute (+) ou retire (×) un sujet d'un visuel (migration 0028, journal en ajout seul ; l'état courant est la dernière action).
 * Le générateur et les sites utilisent les sujets effectifs (défauts du code ± ces surcharges).
 */
export async function basculerSujetAsset(cle: string, sujet: string, action: 'ajout' | 'retrait'): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!estCleAsset(cle) || !estSujetDeVisuel(sujet) || (action !== 'ajout' && action !== 'retrait')) return { ok: false, message: 'Valeur invalide.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('assets_sujets').insert({ cle_asset: cle, sujet, action, auteur: user?.id ?? null });
  if (error) return { ok: false, message: 'Enregistrement impossible : migration 0028 à exécuter (supabase/migrations/0028_inspirations_photos_libres.sql).', migrationManquante: true };
  revalidatePath('/admin/illustrations');
  return { ok: true, message: action === 'ajout' ? 'Sujet ajouté.' : 'Sujet retiré.' };
}
