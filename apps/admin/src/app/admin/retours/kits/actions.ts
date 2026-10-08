'use server';

import { revalidatePath } from 'next/cache';
import {
  choisirRequete, estCleAsset, filtrerCandidats, hashtagEmplacement, hashtagKit, hashtagsValides, PREFIXE_REFUS_KIT, requetesEmplacement, SOURCES_PHOTOS_LIBRES, SUJETS_KITS,
} from '@plateforme/core';
import { validerDecisionClassement } from '@plateforme/core/classement-visuels';
import { ErreurSource, rechercher, sourcesConfigurees } from '@/lib/photos-libres';
import { deciderPhoto, type ResultatCandidats } from '../actions-photos';
import { exigerAdmin } from '@/lib/admin';
import { MIGRATION_KITS } from '@/lib/kits-images';
import { createClient, getUser } from '@/lib/supabase/server';

// « Noter ce kit » (/admin/retours/kits, migration 0039) : note de 1 à 5 et / ou « Garder ce kit » (action de Paul seulement).
// Les photos du kit sont revérifiées (emplacements connus, URL de photo hébergée ou intégrée).

export type SaisieKit = { sujet: string; rang: number; cle: string; photos: { emplacement: string; url: string }[]; note: number | null; garder: boolean; remarque?: string; appareil?: string };

const URL_PHOTO = /^(\/photos\/[a-z0-9-]{1,120}\.(webp|jpe?g|png|avif)|https:\/\/[^\s]{1,400}\/storage\/v1\/object\/public\/photos\/[^\s]{1,300})$/;
const EMPLACEMENT = /^(accueil|page-sujet|cabinet|soin:[a-z0-9-]{1,60})$/;

export async function noterKit(s: SaisieKit): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!(SUJETS_KITS as readonly string[]).includes(s?.sujet)) return { ok: false, message: 'Sujet inconnu.' };
  if (!/^kit:[a-z-]{2,30}:[0-9a-f]{8}$/.test(s.cle ?? '')) return { ok: false, message: 'Kit inconnu.' };
  const note = Number.isInteger(s.note) && (s.note as number) >= 1 && (s.note as number) <= 5 ? (s.note as number) : null;
  if (!note && !s.garder) return { ok: false, message: 'Donnez une note ou gardez le kit.' };
  const photos = (Array.isArray(s.photos) ? s.photos : []).filter((p) => p && EMPLACEMENT.test(p.emplacement) && URL_PHOTO.test(p.url)).slice(0, 40).map((p) => ({ emplacement: p.emplacement, url: p.url }));
  if (!photos.length) return { ok: false, message: 'Kit vide.' };
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('kits_images_notes').insert({
    sujet: s.sujet, rang: Math.max(0, Math.min(99, Math.floor(s.rang) || 0)), cle: s.cle, photos, note, garder: s.garder === true,
    remarque: String(s.remarque ?? '').trim().slice(0, 1000) || null, appareil: s.appareil === 'mobile' || s.appareil === 'ordinateur' ? s.appareil : 'les-deux', auteur: user?.id ?? null,
  });
  if (error) return { ok: false, message: MIGRATION_KITS, migrationManquante: true };
  revalidatePath('/admin/retours/kits');
  return { ok: true, message: s.garder ? 'Kit gardé : il passe en premier pour ce sujet.' : `Kit noté ${note}★.` };
}

// ---------------------------------------------------------------------------------------------------------------
// Compléter un kit (suggestions-kits.ts) : banque d'abord, puis Pexels / Pixabay
// ---------------------------------------------------------------------------------------------------------------

const EMPLACEMENT_KIT = /^(accueil|page-sujet|cabinet|soin:[a-z0-9-]{1,40})$/;

/**
 * « Utiliser ici » : ajoute à la photo le sujet du kit et le hashtag de l'emplacement (#<slug du soin>, #cabinet…) dans les
 * journaux existants (assets_sujets 0028, assets_hashtags 0029) ; le kit se recompose au prochain affichage.
 */
export async function utiliserIci(cle: string, sujet: string, emplacement: string): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!estCleAsset(cle) || !cle.startsWith('photo:')) return { ok: false, message: 'Photo inconnue.' };
  if (!(SUJETS_KITS as readonly string[]).includes(sujet) || !EMPLACEMENT_KIT.test(emplacement)) return { ok: false, message: 'Emplacement inconnu.' };
  const tag = hashtagEmplacement(emplacement);
  if (!hashtagsValides([tag]).length) return { ok: false, message: 'Hashtag invalide.' };
  const user = await getUser();
  const supabase = await createClient();
  const auteur = user?.id ?? null;
  const { error: e1 } = await supabase.from('assets_sujets').insert({ cle_asset: cle, sujet, action: 'ajout', auteur });
  const { error: e2 } = await supabase.from('assets_hashtags').insert({ cle_asset: cle, hashtag: tag, action: 'ajout', auteur });
  if (e1 && e2) return { ok: false, message: 'Migrations 0028 et 0029 à exécuter : sujet et hashtag non enregistrés.' };
  revalidatePath('/admin/retours/kits');
  return { ok: true, message: `Photo placée : sujet ${sujet}, #${tag}${e1 ? ' (sujet non enregistré : migration 0028)' : ''}${e2 ? ' (hashtag non enregistré : migration 0029)' : ''}.` };
}

/** « Pas pour ici » : refus mémorisé pour CET emplacement (classement_suggestions, raison kit-pas-ici:<clé>) */
export async function pasPourIci(cle: string, emplacement: string): Promise<{ ok: boolean; message: string; migrationManquante?: boolean }> {
  await exigerAdmin();
  if (!estCleAsset(cle) || !EMPLACEMENT_KIT.test(emplacement)) return { ok: false, message: 'Photo inconnue.' };
  const raison = `${PREFIXE_REFUS_KIT}${cle}`;
  const d = validerDecisionClassement({ contexte: 'photos', nature: 'hashtag', valeur: hashtagEmplacement(emplacement), decision: 'refusee', raison });
  if (!d || d.raison !== raison) return { ok: false, message: 'Refus non mémorisable (clé trop longue).' };
  const supabase = await createClient();
  const { error } = await supabase.from('classement_suggestions').insert(d);
  if (error) return { ok: false, message: 'Migration 0033 à exécuter : refus gardé dans ce navigateur seulement.', migrationManquante: true };
  return { ok: true, message: 'Elle ne sera plus proposée ici.' };
}

/**
 * Suggestions NOUVELLES pour un emplacement (Pexels / Pixabay, clés serveur seulement, limites de débit et cache de lib/photos-libres) :
 * requêtes ciblées (requetesEmplacement) tirées par couverture (choisirRequete : requêtes déjà riches en photos gardées en dernier) ;
 * photos déjà vues (gardées ou rejetées) jamais remontrées. Rien n'est téléchargé.
 */
export async function suggestionsNouvelles(sujet: string, emplacement: string, vuesNavigateur: string[] = []): Promise<ResultatCandidats> {
  await exigerAdmin();
  if (!(SUJETS_KITS as readonly string[]).includes(sujet) || !EMPLACEMENT_KIT.test(emplacement)) return { ok: false, message: 'Emplacement inconnu.', candidats: [] };
  const conf = sourcesConfigurees();
  const sources = SOURCES_PHOTOS_LIBRES.filter((s) => conf[s]);
  if (!sources.length) return { ok: false, cleManquante: true, message: 'Clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY dans Vercel).', candidats: [] };
  const supabase = await createClient();
  const [{ data: a }, { data: p }] = await Promise.all([
    supabase.from('photos_libres_avis').select('source, id_source').limit(20000),
    supabase.from('photos_libres').select('source, id_source, requete, statut').limit(20000),
  ]);
  const vues = new Set([...(a ?? []), ...(p ?? [])].map((l: { source: string; id_source: string }) => `${l.source}:${l.id_source}`));
  for (const v of (Array.isArray(vuesNavigateur) ? vuesNavigateur : []).slice(0, 2000)) if (typeof v === 'string') vues.add(v);
  const gardees: Record<string, number> = {};
  for (const l of (p ?? []) as { requete: string | null; statut: string }[]) if (l.requete && l.statut !== 'retiree') gardees[l.requete] = (gardees[l.requete] ?? 0) + 1;
  const requetes = requetesEmplacement(sujet, emplacement);
  let derniere = '';
  for (let essai = 0; essai < 3; essai++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const requete = choisirRequete(requetes, gardees);
    try {
      const l = filtrerCandidats(await rechercher(source, requete, 1 + Math.floor(Math.random() * (essai ? 3 : 1))), vues).slice(0, 8);
      if (l.length) return { ok: true, message: '', candidats: l.map(({ telechargement: _t, ...c }) => ({ ...c, requete })) };
    } catch (e) {
      derniere = e instanceof ErreurSource ? e.message : 'Recherche impossible.';
    }
  }
  return { ok: false, message: derniere || 'Aucune nouvelle photo pour cet emplacement : réessayez plus tard.', candidats: [] };
}

/**
 * « Garder » pour un kit : flux existant (deciderPhoto : lien seulement, aucun téléchargement), sujet du kit, hashtag de l'emplacement
 * et #kit-<sujet> pré-cochés ; la photo n'entre dans le kit qu'une fois « Valider et importer » fait dans /admin/photos.
 */
export async function garderPourKit(source: string, idSource: string, sujet: string, emplacement: string, requete: string): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  if (!(SUJETS_KITS as readonly string[]).includes(sujet) || !EMPLACEMENT_KIT.test(emplacement)) return { ok: false, message: 'Emplacement inconnu.' };
  const r = await deciderPhoto({ source, idSource, decision: 'garder', etiquettes: [], sujets: [sujet], hashtags: [hashtagEmplacement(emplacement), hashtagKit(sujet)], requete });
  if (r.ok) revalidatePath('/admin/retours/kits');
  return { ok: r.ok, message: r.ok ? 'Gardée pour le kit (lien seulement) : « Valider et importer » dans Jeux de photos ; elle entrera dans le kit une fois importée.' : r.message };
}
