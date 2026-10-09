import { csvLicences, lignesCsvPhotosSousLicence } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getPhotosSousLicence, nomsDesSites } from '@/lib/photos-sous-licence';

// Export CSV de conformité des photos sous licence (/admin/photos-sous-licence/licences.csv, admin seulement) : une ligne par photo
// (banque, identifiant, contributeur, page, type et statut de licence, référence, titulaire, restrictions, fichier hébergé) et une
// ligne par site rattaché (licence du site ou « licence à acheter »). Même format que l'export des licences libres (csvLicences).

export const dynamic = 'force-dynamic';

export async function GET() {
  await exigerAdmin();
  const [{ photos }, noms] = await Promise.all([getPhotosSousLicence(), nomsDesSites()]);
  const jour = new Date().toISOString().slice(0, 10);
  return new Response(csvLicences(lignesCsvPhotosSousLicence(photos, noms)), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="photos-sous-licence-${jour}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
