'use server';

import { revalidatePath } from 'next/cache';
import {
  cleCandidatePhoto, clePhoto, estPhotoImportee, estPhotoIntegree, estSourcePhotoLibre, hashtagsDepuisLignes, jeuPhotosAutorise, normaliserDraft, photosDuJeu,
  surchargesDepuisLignes, validerJeuPhotos, type JeuPhotos,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { lireJeuPhotos, PREFIXE_STOCKAGE, tirerJeuPhotos, UUID } from '@/lib/jeux-photos';
import { importerDepuisSource, MIGRATION_0031 } from '@/lib/photos-libres';
import { createClient, getUser } from '@/lib/supabase/server';

export type Resultat = { ok: boolean; message: string; id?: string } | null;

/** Licence Adobe Stock d'une photo (table licences_photos) */
export type Licence = { reference: string; dateAchat: string; transferee: boolean; notes: string };

const MIGRATION = 'La base de données est-elle à jour (mise à jour 0016, jeux de photos) ?';

async function optionsDuSite(siteId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('sites').select('id, options, config').eq('id', siteId).maybeSingle();
  return data;
}

/**
 * Crée ou modifie un jeu. Jeu exclusif d'un site : l'option « photos premium » doit être cochée sur le site.
 * Jeu Adobe Stock : chaque photo envoyée doit avoir sa référence de licence, enregistrée dans licences_photos.
 */
export async function enregistrerJeu(id: string | null, brut: Omit<JeuPhotos, 'id'>, licences: Record<string, Licence> = {}): Promise<Resultat> {
  await exigerAdmin();
  if (id && !UUID.test(id)) return { ok: false, message: 'Jeu invalide.' };
  const { jeu, erreurs } = validerJeuPhotos(brut, PREFIXE_STOCKAGE);
  if (!jeu) return { ok: false, message: erreurs.join(' ') };

  const supabase = await createClient();
  if (id) {
    // Un jeu ne change jamais de site : une photo sous licence d'un client ne passe pas chez un autre.
    const avant = await lireJeuPhotos(id, supabase);
    if (!avant) return { ok: false, message: 'Jeu introuvable.' };
    if (avant.siteId !== jeu.siteId) return { ok: false, message: 'Un jeu ne peut pas changer de site (ni devenir partagé).' };
  }
  if (jeu.siteId) {
    const site = await optionsDuSite(jeu.siteId);
    if (!site) return { ok: false, message: 'Site introuvable.' };
    if (!(site.options as { photosPremium?: boolean } | null)?.photosPremium) {
      return { ok: false, message: 'Cochez d’abord « Photos premium (contrat signé) » sur la fiche du site.' };
    }
  }

  // Adobe Stock : une référence de licence par photo envoyée (les photos de la banque intégrée n'en ont pas besoin).
  const aLicencier = jeu.source === 'adobe' ? photosDuJeu(jeu.photos).filter((u) => !estPhotoIntegree(u)) : [];
  const lignesLicences = aLicencier.map((url) => {
    const l = licences[url] ?? { reference: '', dateAchat: '', transferee: false, notes: '' };
    return {
      site_id: jeu.siteId!,
      photo_url: url,
      fournisseur: 'adobe',
      reference_licence: String(l.reference ?? '').trim().slice(0, 120),
      date_achat: /^\d{4}-\d{2}-\d{2}$/.test(l.dateAchat ?? '') ? l.dateAchat : null,
      transferee_au_client: Boolean(l.transferee),
      notes: String(l.notes ?? '').trim().slice(0, 1000),
      updated_at: new Date().toISOString(),
    };
  });
  const sansReference = lignesLicences.filter((l) => l.reference_licence.length < 3).length;
  if (sansReference) return { ok: false, message: `Renseignez la référence de licence Adobe Stock de chaque photo (${sansReference} manquante(s)).` };

  const ligne = {
    nom: jeu.nom,
    specialite: jeu.specialite,
    photos: jeu.photos,
    source: jeu.source,
    site_id: jeu.siteId,
    actif: jeu.actif,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = id
    ? await supabase.from('jeux_photos').update(ligne).eq('id', id).select('id').single()
    : await supabase.from('jeux_photos').insert(ligne).select('id').single();
  if (error || !data) return { ok: false, message: `Enregistrement impossible. ${MIGRATION}` };

  if (lignesLicences.length) {
    const { error: e } = await supabase
      .from('licences_photos')
      .upsert(lignesLicences.map((l) => ({ ...l, jeu_id: data.id })), { onConflict: 'site_id,photo_url' });
    if (e) return { ok: false, message: 'Jeu enregistré, mais les licences n’ont pas pu l’être. Réessayez.', id: data.id };
  }

  revalidatePath('/admin/photos');
  if (jeu.siteId) revalidatePath(`/admin/sites/${jeu.siteId}`);
  return { ok: true, message: 'Enregistré. Les sites qui utilisent ce jeu l’afficheront à leur prochaine publication.', id: data.id };
}

/** Active ou désactive un jeu (un jeu désactivé n'est plus tiré ni affiché : photos intégrées à la place). */
export async function basculerJeu(id: string, actif: boolean): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(id)) return { ok: false, message: 'Jeu invalide.' };
  const supabase = await createClient();
  const { error } = await supabase.from('jeux_photos').update({ actif, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/photos');
  return error ? { ok: false, message: 'Modification impossible.' } : { ok: true, message: actif ? 'Jeu activé.' : 'Jeu désactivé : republiez les sites concernés.' };
}

/** Option « photos premium » (validation commerciale après signature du contrat), dans sites.options. */
export async function basculerPhotosPremium(siteId: string, photosPremium: boolean): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const site = await optionsDuSite(siteId);
  if (!site) return { ok: false, message: 'Site introuvable.' };
  const options = { ...((site.options as Record<string, unknown> | null) ?? {}), photosPremium };
  const supabase = await createClient();
  const { error } = await supabase.from('sites').update({ options }).eq('id', siteId);
  revalidatePath(`/admin/sites/${siteId}`);
  return error ? { ok: false, message: 'Modification impossible.' } : { ok: true, message: photosPremium ? 'Option « photos premium » activée.' : 'Option « photos premium » retirée.' };
}

/**
 * Écrit le jeu dans le brouillon et, s'il existe, dans la version publiée : le jeu est choisi par l'admin, une
 * republication (« Réessayer », propagation du jeu) l'applique sans mettre en ligne le brouillon du praticien.
 */
async function ecrireJeuDuSite(siteId: string, config: unknown, jeuPhotos: string): Promise<Resultat> {
  const d = normaliserDraft(config);
  const supabase = await createClient();
  const { data: publie } = await supabase.from('sites').select('config_publiee').eq('id', siteId).maybeSingle();
  const maj: Record<string, unknown> = { config: { ...d, theme: { ...d.theme, jeuPhotos } } };
  if (publie?.config_publiee) {
    const p = publie.config_publiee as { theme?: Record<string, unknown> };
    maj.config_publiee = { ...p, theme: { ...(p.theme ?? {}), jeuPhotos } };
  }
  const { error } = await supabase.from('sites').update(maj).eq('id', siteId);
  revalidatePath(`/admin/sites/${siteId}`);
  revalidatePath('/admin/photos');
  return error ? { ok: false, message: 'Affectation impossible.' } : { ok: true, message: 'Jeu affecté. Republiez le site pour l’afficher en ligne.' };
}

/** Affecte un jeu au site : '' (photos intégrées), jeu partagé actif de sa spécialité, ou jeu exclusif de ce site. */
export async function affecterJeu(siteId: string, jeuId: string): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId) || (jeuId && !UUID.test(jeuId))) return { ok: false, message: 'Valeur invalide.' };
  const site = await optionsDuSite(siteId);
  if (!site) return { ok: false, message: 'Site introuvable.' };
  if (jeuId) {
    const jeu = await lireJeuPhotos(jeuId);
    if (!jeu || !jeuPhotosAutorise(jeu, siteId, normaliserDraft(site.config).theme.specialite)) {
      return { ok: false, message: 'Ce jeu n’est pas disponible pour ce site (inactif, autre spécialité, ou réservé à un autre site).' };
    }
  }
  return ecrireJeuDuSite(siteId, site.config, jeuId);
}

/** Nouveau tirage au hasard parmi les jeux partagés de la spécialité du site. */
export async function retirerAuSort(siteId: string): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(siteId)) return { ok: false, message: 'Site invalide.' };
  const site = await optionsDuSite(siteId);
  if (!site) return { ok: false, message: 'Site introuvable.' };
  const jeu = await tirerJeuPhotos(normaliserDraft(site.config).theme.specialite);
  const r = await ecrireJeuDuSite(siteId, site.config, jeu);
  return r?.ok && !jeu ? { ok: true, message: 'Aucun jeu partagé actif pour cette spécialité : photos intégrées.' } : r;
}

/**
 * Statut d'une photo libre de droits gardée (Pexels / Pixabay, migration 0028) : « validée » = proposée dans le choix des
 * jeux de photos ; « retirée » = plus proposée ni notée. La ligne de traçabilité n'est jamais supprimée (preuve de licence).
 */
export async function changerStatutPhotoLibre(id: string, statut: 'a_valider' | 'validee' | 'retiree'): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(id) || !['a_valider', 'validee', 'retiree'].includes(statut)) return { ok: false, message: 'Valeur invalide.' };
  const supabase = await createClient();
  // « Validée » exige une photo importée (fichiers hébergés) : sinon, passer par « Valider et importer »
  if (statut === 'validee') {
    const { data } = await supabase.from('photos_libres').select('statut, chemin, url').eq('id', id).maybeSingle();
    if (!data || !estPhotoImportee({ statut: 'validee', chemin: data.chemin, url: data.url })) return { ok: false, message: 'Photo non importée : utilisez « Valider et importer ».' };
  }
  const { error } = await supabase.from('photos_libres').update({ statut, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/photos');
  revalidatePath('/admin/illustrations');
  return error ? { ok: false, message: 'Modification impossible (migration 0028 ?).' } : { ok: true, message: statut === 'validee' ? 'Validée : proposée dans le choix des jeux de photos.' : statut === 'retiree' ? 'Retirée (traçabilité conservée).' : 'Remise à valider.' };
}

/**
 * « Valider et importer » une photo libre gardée (candidate, migration 0031) : relue à la source côté serveur, téléchargée,
 * convertie en WebP 640 / 1280 / 1920 px sans EXIF, hébergée dans photos/banque/libres/<sujet>/ ; traçabilité complétée
 * (chemin, url, largeurs, date d'import = date de téléchargement, version de licence du jour), statut « validée ». Thèmes et
 * hashtags saisis sur la candidate recopiés sur la photo importée. Photo disparue de la source : statut « retirée ».
 */
export async function importerPhotoLibre(id: string): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(id)) return { ok: false, message: 'Valeur invalide.' };
  const supabase = await createClient();
  const { data: p, error: eLecture } = await supabase.from('photos_libres').select('id, source, id_source, sujet, requete, etiquettes, statut, chemin, url').eq('id', id).maybeSingle();
  if (eLecture || !p) return { ok: false, message: 'Photo introuvable.' };
  if (!estSourcePhotoLibre(p.source)) return { ok: false, message: 'Source inconnue.' };
  if (p.chemin && p.url) {
    const { error } = await supabase.from('photos_libres').update({ statut: 'validee', updated_at: new Date().toISOString() }).eq('id', id);
    revalidatePath('/admin/photos');
    return error ? { ok: false, message: `Modification impossible : ${error.message}` } : { ok: true, message: 'Déjà importée : validée.' };
  }
  const r = await importerDepuisSource(supabase, { source: p.source, idSource: p.id_source, sujet: p.sujet, requete: p.requete ?? '', etiquettes: p.etiquettes ?? [] });
  if (!r.ok) {
    if (r.introuvable) await supabase.from('photos_libres').update({ statut: 'retiree', updated_at: new Date().toISOString() }).eq('id', id);
    revalidatePath('/admin/photos');
    return { ok: false, message: r.message };
  }
  const maintenant = r.ligne.telecharge_le;
  const { error } = await supabase.from('photos_libres').update({
    auteur_nom: r.ligne.auteur_nom, auteur_url: r.ligne.auteur_url, page_url: r.ligne.page_url, licence: r.ligne.licence, licence_version: r.ligne.licence_version,
    licence_url: r.ligne.licence_url, telecharge_le: maintenant, importe_le: maintenant, chemin: r.ligne.chemin, url: r.ligne.url, largeurs: r.ligne.largeurs,
    largeur_originale: r.ligne.largeur_originale, hauteur_originale: r.ligne.hauteur_originale, statut: 'validee', updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) {
    console.error('Photos libres : import non enregistré', error);
    return { ok: false, message: /importe_le|schema cache/i.test(error.message) ? `Fichiers hébergés mais import non enregistré. ${MIGRATION_0031}` : `Fichiers hébergés mais import non enregistré : ${error.message}` };
  }
  // Thèmes et hashtags de la candidate → photo importée (clé de l'inventaire : photo:banque/libres/…)
  const cleFinale = clePhoto(r.ligne.url);
  const cleCandidate = cleCandidatePhoto(p.source, p.id_source);
  let complement = '';
  if (cleFinale) {
    const user = await getUser();
    const auteur = user?.id ?? null;
    const [{ data: s }, { data: h }] = await Promise.all([supabase.rpc('assets_sujets_effectifs'), supabase.rpc('assets_hashtags_effectifs')]);
    const sujets = surchargesDepuisLignes(((s ?? []) as { cle_asset: string; sujet: string; action: string }[]).filter((l) => l.cle_asset === cleCandidate).map((l) => ({ cle: l.cle_asset, sujet: l.sujet, action: l.action })))[cleCandidate]?.ajouts ?? [];
    const tags = hashtagsDepuisLignes(((h ?? []) as { cle_asset: string; hashtag: string; action: string }[]).filter((l) => l.cle_asset === cleCandidate).map((l) => ({ cle: l.cle_asset, hashtag: l.hashtag, action: l.action })))[cleCandidate] ?? [];
    if (sujets.length) await supabase.from('assets_sujets').insert(sujets.map((x) => ({ cle_asset: cleFinale, sujet: x, action: 'ajout', auteur })));
    if (tags.length) await supabase.from('assets_hashtags').insert(tags.map((x) => ({ cle_asset: cleFinale, hashtag: x, action: 'ajout', auteur })));
    if (sujets.length || tags.length) complement = ` Thèmes et hashtags reportés (${[...sujets, ...tags.map((t) => `#${t}`)].join(', ')}).`;
  }
  revalidatePath('/admin/photos');
  revalidatePath('/admin/illustrations');
  revalidatePath('/admin/retours');
  return { ok: true, message: `Importée et validée : hébergée chez nous (${r.ligne.largeurs.join(', ')} px, sans métadonnées), proposée dans le choix des jeux.${complement}` };
}
