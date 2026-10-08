import { definirContexteImages } from '@plateforme/core';
import { getContexteImages } from '@/lib/kits-images';
import ContexteImagesClient from './ContexteImagesClient';

// Pose le contexte d'images (photos exclues, kits par sujet : packages/core/src/contexte-images.ts) côté serveur ET dans le
// navigateur, avant le rendu des pages : tous les aperçus (Studio, atelier, duels, recettes à noter, parcours, édition) l'appliquent.
export default async function ContexteImages({ praticien = false }: { praticien?: boolean }) {
  // Praticiens : kits multi-visuels limités aux visuels validés (kits-visuels.ts)
  const c = await getContexteImages(praticien);
  definirContexteImages(c);
  return <ContexteImagesClient exclues={c.exclues} kits={c.kits} vivier={c.vivier} />;
}
