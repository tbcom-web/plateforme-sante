import { csvDepuisRecap, csvLicences } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getRecapSources } from '@/lib/sources-photos';

// Export CSV complet des sources et licences (/admin/photos/licences.csv, admin seulement) : TOUTES les images du
// récapitulatif « Sources et licences » (packages/core/src/sources-photos.ts) — banque intégrée (Unsplash), photos libres
// Pexels / Pixabay (candidates non importées comprises, avec leur statut et la date d'import, 0031), photos envoyées dans la
// banque (provenance, 0031 ; « Source à renseigner » sinon), Adobe Stock (licences_photos, 0016), photos des praticiens.

export const dynamic = 'force-dynamic';

export async function GET() {
  await exigerAdmin();
  const { lignes } = await getRecapSources();
  const jour = new Date().toISOString().slice(0, 10);
  return new Response(csvLicences(csvDepuisRecap(lignes)), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="sources-licences-photos-${jour}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
