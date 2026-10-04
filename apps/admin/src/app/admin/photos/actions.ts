'use server';

import { revalidatePath } from 'next/cache';
import { estPhotoIntegree, jeuPhotosAutorise, normaliserDraft, photosDuJeu, validerJeuPhotos, type JeuPhotos } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { lireJeuPhotos, PREFIXE_STOCKAGE, tirerJeuPhotos, UUID } from '@/lib/jeux-photos';
import { createClient } from '@/lib/supabase/server';

export type Resultat = { ok: boolean; message: string; id?: string } | null;

/** Licence Adobe Stock d'une photo (table licences_photos) */
export type Licence = { reference: string; dateAchat: string; transferee: boolean; notes: string };

const MIGRATION = 'La migration 0016 (jeux de photos) a-t-elle été exécutée dans Supabase ?';

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

async function ecrireJeuDuSite(siteId: string, config: unknown, jeuPhotos: string): Promise<Resultat> {
  const d = normaliserDraft(config);
  const supabase = await createClient();
  const { error } = await supabase.from('sites').update({ config: { ...d, theme: { ...d.theme, jeuPhotos } } }).eq('id', siteId);
  revalidatePath(`/admin/sites/${siteId}`);
  revalidatePath('/admin/photos');
  return error ? { ok: false, message: 'Affectation impossible.' } : { ok: true, message: 'Jeu affecté. Publiez le site pour l’appliquer.' };
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
