'use client';

// Animations d'illustrations PRÊTES (images de base validées dans la bibliothèque) : registre du core posé côté navigateur, avant
// le rendu de la page (studio, atelier, tuiles, duels, recettes à noter). Le dé « Animation d'en-tête », le visuel animé du premier
// écran et les tuiles ne montrent une animation d'illustration (semelle, équilibre, premiers pas) qu'une fois ses images de base
// validées (règle de Paul). Rien n'est rendu.
import { definirAnimationsPretes } from '@plateforme/core';

export default function AnimationsPretes({ cles }: { cles: readonly string[] }) {
  definirAnimationsPretes(cles);
  return null;
}
