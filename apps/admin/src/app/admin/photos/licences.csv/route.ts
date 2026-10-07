import { csvLicences, LIBELLES_STATUTS_PHOTO_LIBRE, libelleSujet, type LigneLicenceCsv } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getPhotosLibres } from '@/lib/photos-libres';
import { createClient } from '@/lib/supabase/server';

// Export CSV des licences pour la conformité (/admin/photos/licences.csv, admin seulement) : photos libres de droits
// (Pexels / Pixabay, traçabilité 0028 : candidates non importées comprises, avec leur statut et la date d'import, 0031)
// puis licences Adobe Stock (licences_photos, 0016).

export const dynamic = 'force-dynamic';

export async function GET() {
  await exigerAdmin();
  const supabase = await createClient();
  const [{ photos }, { data: adobe }] = await Promise.all([
    getPhotosLibres(),
    supabase.from('licences_photos').select('site_id, photo_url, fournisseur, reference_licence, date_achat, transferee_au_client').order('created_at'),
  ]);
  const lignes: LigneLicenceCsv[] = [
    ...photos.map((p) => ({
      fournisseur: p.source === 'pexels' ? 'Pexels' : 'Pixabay',
      identifiant: p.idSource,
      auteur: p.auteur,
      page: p.pageUrl,
      licence: p.licence,
      version: p.licenceVersion,
      lienLicence: p.licenceUrl,
      date: (p.telechargeLe ?? '').slice(0, 10),
      sujet: libelleSujet(p.sujet),
      // Candidate non importée : aucun fichier chez nous (aperçu de la source seulement)
      fichier: p.url ?? 'non importée (aperçu de la source seulement)',
      statut: p.url ? LIBELLES_STATUTS_PHOTO_LIBRE[p.statut] : `${LIBELLES_STATUTS_PHOTO_LIBRE[p.statut]} (candidate non importée)`,
      importe: (p.importeLe ?? '').slice(0, 10),
    })),
    ...((adobe ?? []) as { site_id: string; photo_url: string; fournisseur: string; reference_licence: string; date_achat: string | null; transferee_au_client: boolean }[]).map((l) => ({
      fournisseur: 'Adobe Stock',
      identifiant: l.reference_licence,
      auteur: '',
      page: '',
      licence: 'Adobe Stock (licence au nom du client)',
      version: '',
      lienLicence: 'https://stock.adobe.com/license-terms',
      date: l.date_achat ?? '',
      sujet: `site ${l.site_id}`,
      fichier: l.photo_url,
      statut: l.transferee_au_client ? 'Transférée au client' : 'Non transférée',
    })),
  ];
  const jour = new Date().toISOString().slice(0, 10);
  return new Response(csvLicences(lignes), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="licences-photos-${jour}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
