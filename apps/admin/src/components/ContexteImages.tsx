import { definirContexteImages } from '@plateforme/core';
import { getContexteImages } from '@/lib/kits-images';
import { getExclusionsArrivages } from '@/lib/arrivages';
import ContexteImagesClient from './ContexteImagesClient';

// Pose le contexte d'images (photos exclues, kits par sujet : packages/core/src/contexte-images.ts) côté serveur ET dans le
// navigateur, avant le rendu des pages : tous les aperçus (Studio, atelier, duels, recettes à noter, parcours, édition) l'appliquent.
export default async function ContexteImages({ praticien = false }: { praticien?: boolean }) {
  // Praticiens : kits multi-visuels limités aux visuels validés (kits-visuels.ts)
  // Arrivages (arrivages.ts) : nouveautés pas encore acceptées, ou refusées, jamais tirées par le générateur
  const [c0, arrivages] = await Promise.all([getContexteImages(praticien), getExclusionsArrivages()]);
  const c = arrivages.length ? { ...c0, exclues: [...new Set([...c0.exclues, ...arrivages])] } : c0;
  definirContexteImages(c);
  return <ContexteImagesClient exclues={c.exclues} kits={c.kits} vivier={c.vivier} />;
}
