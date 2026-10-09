'use server';

import { revalidatePath } from 'next/cache';
import { etatLicencePourSite, photoSousLicenceDepuisLigne, validerAchatSite, type AchatSite } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { MIGRATION_0057 } from '@/lib/photos-sous-licence';
import { createClient, getUser } from '@/lib/supabase/server';

// Actions de /admin/photos-sous-licence (admin seulement) : curation (valider, retirer), « Marquer comme achetée pour le site X »
// (référence, titulaire, date : la licence est achetée par TBCOM hors plateforme ; AUCUN paiement ici), retrait d'une demande.

export type Resultat = { ok: boolean; message: string } | null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const jourParis = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

export async function changerEtatPhoto(photoId: string, etat: 'a_valider' | 'validee' | 'retiree'): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(photoId) || !['a_valider', 'validee', 'retiree'].includes(etat)) return { ok: false, message: 'Demande invalide.' };
  const supabase = await createClient();
  const { error } = await supabase.from('photos_sous_licence').update({ statut: etat, updated_at: new Date().toISOString() }).eq('id', photoId);
  if (error) return { ok: false, message: /does not exist|schema cache/i.test(error.message) ? MIGRATION_0057 : 'Enregistrement impossible.' };
  revalidatePath('/admin/photos-sous-licence');
  return {
    ok: true,
    message: etat === 'validee' ? 'Validée : la photo entre dans les tirages du Studio (badge « Photo premium »).' : etat === 'retiree' ? 'Retirée : plus proposée, jamais publiée.' : 'Remise « à valider ».',
  };
}

/** « Marquer comme achetée pour le site X » : la licence a été achetée par TBCOM pour ce client (référence saisie) */
export async function marquerAcheteePourSite(photoId: string, siteId: string, brut: Partial<AchatSite>): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(photoId) || !UUID.test(siteId)) return { ok: false, message: 'Choisissez la photo et le site.' };
  const { achat, erreurs } = validerAchatSite(brut);
  if (!achat) return { ok: false, message: erreurs.join(' ') };
  const supabase = await createClient();
  const [{ data: photo, error }, { data: site }, { data: rattachements }] = await Promise.all([
    supabase.from('photos_sous_licence').select('id, id_fichier, banque, statut_licence, statut, sites_par_licence, telecharge_le, url, id_image, page_url, sujet, type_licence').eq('id', photoId).maybeSingle(),
    supabase.from('sites').select('id').eq('id', siteId).maybeSingle(),
    supabase.from('photos_sous_licence_sites').select('photo_id, site_id, statut, reference_licence, date_achat, expire_le').eq('photo_id', photoId),
  ]);
  if (error) return { ok: false, message: MIGRATION_0057 };
  if (!photo) return { ok: false, message: 'Photo introuvable.' };
  if (!site) return { ok: false, message: 'Site introuvable.' };
  if (photo.statut === 'retiree') return { ok: false, message: 'Photo retirée : remettez-la « à valider » d’abord.' };
  if (photo.statut_licence === 'apercu') return { ok: false, message: 'Cette photo est un APERÇU (comp) : importez le fichier acheté (nouvel import « achetée »), puis marquez-le acheté pour ce site.' };
  // Limite de la licence : une même référence couvre au plus « sites par licence » sites
  const autres = ((rattachements ?? []) as Record<string, unknown>[]).filter((r) => r.site_id !== siteId);
  const simule = photoSousLicenceDepuisLigne(photo as Record<string, unknown>, [...autres, { site_id: siteId, statut: 'achetee', reference_licence: achat.reference, date_achat: achat.dateAchat, expire_le: achat.expireLe }]);
  const etat = etatLicencePourSite({ ...simule, etat: 'validee' }, siteId, jourParis());
  if (!etat.ok && etat.raison === 'limite') return { ok: false, message: `La licence ${achat.reference} couvre déjà ${photo.sites_par_licence} site(s) : achetez une nouvelle licence pour ce site et saisissez sa référence.` };
  const user = await getUser();
  const { error: e2 } = await supabase.from('photos_sous_licence_sites').upsert({
    photo_id: photoId, site_id: siteId, statut: 'achetee', reference_licence: achat.reference, titulaire: achat.titulaire, date_achat: achat.dateAchat,
    expire_le: achat.expireLe, achete_par: user?.id ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: 'photo_id,site_id' });
  if (e2) return { ok: false, message: `Enregistrement impossible : ${e2.message}` };
  revalidatePath('/admin/photos-sous-licence');
  return { ok: true, message: `Licence ${achat.reference} enregistrée : la photo peut être publiée sur ce site, et sur lui seul.` };
}

/** Demande retirée (abandonnée) : la photo reste bloquée pour ce site ; une licence achetée n'est jamais effacée (preuve) */
export async function retirerDemande(photoId: string, siteId: string): Promise<Resultat> {
  await exigerAdmin();
  if (!UUID.test(photoId) || !UUID.test(siteId)) return { ok: false, message: 'Demande invalide.' };
  const supabase = await createClient();
  const { error } = await supabase.from('photos_sous_licence_sites').update({ statut: 'retiree', updated_at: new Date().toISOString() }).eq('photo_id', photoId).eq('site_id', siteId).eq('statut', 'demandee');
  if (error) return { ok: false, message: 'Enregistrement impossible.' };
  revalidatePath('/admin/photos-sous-licence');
  return { ok: true, message: 'Demande retirée.' };
}
