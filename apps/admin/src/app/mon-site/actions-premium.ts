'use server';

import { photosPremiumDans, type PhotoSousLicence } from '@plateforme/core';
import { etatPremiumDuSite } from '@/lib/photos-sous-licence';
import { createClient, getUser } from '@/lib/supabase/server';

// Option « Photos premium » côté praticien (parcours et /mon-site ; packages/core/src/photos-sous-licence.ts, migration 0057) :
// - lecture de l'état des photos premium de SON site (fonction photos_premium_du_site : propriétaire ou admin, aucune référence) ;
// - DEMANDE de l'option : une ligne « demandée » par photo (fonction demander_option_photos_premium). AUCUN paiement, AUCUN e-mail :
//   TBCOM voit la demande dans /admin/photos-sous-licence, achète la licence et la marque achetée pour ce site.

const UUID = /^[0-9a-f-]{36}$/;

export async function lireEtatPhotosPremium(siteId: string | null): Promise<PhotoSousLicence[]> {
  if (!siteId || !UUID.test(siteId) || !(await getUser())) return [];
  return etatPremiumDuSite(siteId);
}

export async function demanderOptionPhotosPremium(siteId: string | null, urls: string[]): Promise<{ ok: boolean; message: string }> {
  if (!(await getUser())) return { ok: false, message: 'Connectez-vous pour demander l’option.' };
  if (!siteId || !UUID.test(siteId)) return { ok: false, message: 'Enregistrez d’abord votre site, puis demandez l’option Photos premium.' };
  const premium = photosPremiumDans(Array.isArray(urls) ? urls.slice(0, 20).map(String) : []);
  if (!premium.length) return { ok: false, message: 'Aucune photo premium à demander.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('demander_option_photos_premium', { p_site: siteId, p_urls: premium });
  if (error) {
    if (error.code === 'PGRST202' || /does not exist|schema cache/i.test(error.message)) return { ok: false, message: 'L’option Photos premium n’est pas encore disponible. Remplacez la photo ou réessayez plus tard.' };
    if (/inaccessible/i.test(error.message)) return { ok: false, message: 'Ce site n’est pas le vôtre.' };
    console.error('demander_option_photos_premium', error);
    return { ok: false, message: 'La demande n’a pas pu être enregistrée. Réessayez dans un instant.' };
  }
  const n = Number(data ?? 0);
  return n
    ? { ok: true, message: 'Demande enregistrée. Aucun paiement maintenant : votre conseillère vous confirme l’option, puis la licence de la photo est achetée pour votre site. Vous pourrez alors publier avec cette photo.' }
    : { ok: false, message: 'Cette photo n’est plus proposée : remplacez-la par une photo du kit ou la vôtre.' };
}
