// Portraits des praticiens sur les sites : images finales produites par le studio portrait de l'admin (WebP, plusieurs
// largeurs, 4:5 et carré), servies en srcset aux tailles d'affichage réelles. Aucun script : le navigateur choisit la
// largeur. Sans rendus du studio (photo simple), la photo enregistrée est servie telle quelle.
import type { PraticienPublic } from '@plateforme/core';
import { altPortrait, POSITION_PORTRAIT, renduPour, srcsetPortrait } from '@plateforme/core/portrait';

type Attributs = { src: string; srcset?: string; sizes?: string; width: number; height: number; alt: string; style?: string };

/**
 * Attributs <img> du portrait :
 * - « portrait » (fiche des modèles éditoriaux) : 4:5, recadré en 4:3 ou en colonne haute par object-fit, tête gardée visible ;
 * - « carre » (pastille ronde de 64 px des gabarits tableau, village et revue).
 */
export function imagePortrait(p: PraticienPublic, format: 'portrait' | 'carre'): Attributs {
  const alt = altPortrait(p.prenom, p.nom, p.titre);
  const rendus = p.portrait?.[format] ?? [];
  if (!rendus.length) return format === 'portrait' ? { src: p.photo, width: 480, height: 600, alt } : { src: p.photo, width: 160, height: 160, alt };
  const defaut = renduPour(rendus, format === 'portrait' ? 640 : 128)!;
  return {
    src: defaut.url,
    srcset: srcsetPortrait(rendus),
    sizes: format === 'portrait' ? '(min-width: 1100px) 480px, (min-width: 760px) 45vw, calc(100vw - 60px)' : '64px',
    width: defaut.l,
    height: defaut.h,
    alt,
    ...(format === 'portrait' ? { style: `object-position:${POSITION_PORTRAIT}` } : {}),
  };
}
