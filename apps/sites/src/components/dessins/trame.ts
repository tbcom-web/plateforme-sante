// Trame hexagonale de points (relevé de baropodométrie) : la source est dans le core
// (packages/core/src/trame.ts), partagée avec les marques du logo (logos.ts). Ce fichier la réexporte
// pour les dessins et animations du site.
export { PRESSION, couleurPression, dansPlante, pression, trame } from '@plateforme/core/trame';
export type { Appui, NiveauTrame } from '@plateforme/core/trame';
