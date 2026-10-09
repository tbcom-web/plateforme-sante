import { definirContexteImages } from '@plateforme/core';
import { getContexteImages } from '@/lib/kits-images';
import { getExclusionsArrivages } from '@/lib/arrivages';
import { PROFESSION_PAR_DEFAUT } from '@plateforme/core/professions';
import { getProfession } from '@/lib/profession';
import { getExclusionsProfession } from '@/lib/professions-ingredients';
import ContexteImagesClient from './ContexteImagesClient';
import { avecDelai, DELAIS } from '@/lib/delai';

// Pose le contexte d'images (photos exclues, kits par sujet : packages/core/src/contexte-images.ts) côté serveur ET dans le
// navigateur, avant le rendu des pages : tous les aperçus (Studio, atelier, duels, recettes à noter, parcours, édition) l'appliquent.
export default async function ContexteImages({ praticien = false }: { praticien?: boolean }) {
  // Praticiens : kits multi-visuels limités aux visuels validés (kits-visuels.ts)
  // Arrivages (arrivages.ts) : nouveautés pas encore acceptées, ou refusées, jamais tirées par le générateur
  // Professions (professions-ingredients.ts) : seuls les visuels de la profession et les communs sont tirés. Admin : profession de
  // l'en-tête ; praticiens : profession par défaut (seule profession ouverte au public).
  const profession = praticien ? PROFESSION_PAR_DEFAUT : (await getProfession()).id;
  // Bornés (2026-10-09) : une lecture lente ne bloque pas l'affichage de toutes les pages (contexte vide = comportement sans données)
  const [c0, arrivages, horsProfession] = await Promise.all([
    avecDelai(getContexteImages(praticien), DELAIS.contexte, { exclues: [] as string[], kits: {}, vivier: {} }),
    avecDelai(getExclusionsArrivages(), DELAIS.contexte, [] as string[]), avecDelai(getExclusionsProfession(profession), DELAIS.contexte, [] as string[]),
  ]);
  const ajouts = [...arrivages, ...horsProfession];
  const c = ajouts.length ? { ...c0, exclues: [...new Set([...c0.exclues, ...ajouts])] } : c0;
  definirContexteImages(c);
  return <ContexteImagesClient exclues={c.exclues} kits={c.kits} vivier={c.vivier} />;
}
