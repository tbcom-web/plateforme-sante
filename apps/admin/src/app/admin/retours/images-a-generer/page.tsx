import Link from 'next/link';
import { composerKit, emplacementsAFaire, etatVivier, SUJETS_KITS, trousImages, type ManquePourTrous } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getManques } from '@/lib/directeur';
import { migration0040Manquante } from '@/lib/images-generees';
import { getDonneesKits } from '@/lib/kits-images';
import { getPhotosLibres } from '@/lib/photos-libres';
import ImagesAGenerer from './ImagesAGenerer';

export const metadata = { title: 'Super admin · Images à générer' };

// Images à générer (demande de Paul du 2026-10-08, packages/core/src/prompts-images.ts) : TROUS réels (emplacements des kits sans photo,
// faibles ou complétés, sujets peu couverts, manques « photo » de retours/MANQUES.md), prompts prêts à copier pour un générateur
// d'images (Paul génère lui-même : aucun appel à un service d'IA), conseils de sélection, « Importer une image générée » (0040).
export default async function PageImagesAGenerer() {
  await exigerAdmin();
  const [d, manques, libres, migration] = await Promise.all([
    getDonneesKits(),
    getManques().catch(() => []),
    getPhotosLibres(),
    migration0040Manquante(),
  ]);
  const kits = SUJETS_KITS.map((s) => {
    const soins = d.soins?.[s] ?? [];
    const kit = composerKit(s, d, 0);
    const v = etatVivier(kit, d, soins);
    return { sujet: s, aFaire: emplacementsAFaire(kit, soins), vivier: { photos: v.photos, notees4: v.notees4 } };
  });
  const trous = trousImages({ kits, manques: manques as ManquePourTrous[] });
  const importees = libres.photos.filter((p) => p.source === 'ia').slice(0, 12)
    .map((p) => ({ id: p.id, url: p.url, sujet: p.sujet, outil: p.iaOutil ?? '', statut: p.statut, genereLe: p.iaGenereLe ?? null }));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <p className="flex flex-wrap gap-x-4 text-sm">
          <Link href="/admin/retours/kits" className="font-semibold text-teal-900 underline">← Kits d’images</Link>
          <Link href="/admin/retours?type=decouvrir" className="font-semibold text-teal-900 underline">Photos à découvrir</Link>
        </p>
        <h1 className="mt-1 text-2xl font-bold">Images à générer</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Quand la banque n’a pas de bonne photo pour un emplacement, copiez le prompt dans votre générateur d’images (ChatGPT, Midjourney…),
          gardez la meilleure image et importez-la ici. Elle arrive « à valider » avec sa traçabilité, puis se note et se trie comme les
          autres photos. Usage illustratif seulement : jamais présentée comme un patient, le praticien ou le cabinet.
        </p>
      </div>
      {migration && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration à exécuter (<code>supabase/migrations/0040_images_generees.sql</code>) : les prompts fonctionnent, l’import d’une image générée attend la migration.
        </p>
      )}
      <ImagesAGenerer trous={trous} importees={importees} migrationManquante={migration} />
    </div>
  );
}
