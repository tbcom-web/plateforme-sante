'use client';

import { useEffect, useState } from 'react';

/**
 * Hauteur d'un aperçu défilant sur téléphone (« mobile seul », 2026-10-10) : un aperçu (iframe qui défile) plus haut que ~62 % de
 * l'écran piège le doigt (on ne fait plus défiler la page, seulement l'aperçu). Sur un écran étroit, la hauteur est bornée à 62 %
 * de la hauteur visible (au moins 360 px) ; ailleurs, la hauteur demandée. Le cadre ne suit pas un changement de hauteur une
 * fois monté : donner la hauteur en `key` de l'aperçu (remonté une fois au chargement). Recalculée seulement quand la LARGEUR
 * change (rotation) : le clavier virtuel et la barre d'adresse qui se replie ne remontent pas l'aperçu.
 */
export function useHauteurApercu(max: number): number {
  const [h, setH] = useState(max);
  useEffect(() => {
    let largeur = -1;
    const calculer = () => {
      if (window.innerWidth === largeur) return;
      largeur = window.innerWidth;
      setH(largeur < 640 ? Math.max(360, Math.min(max, Math.round(window.innerHeight * 0.62))) : max);
    };
    calculer();
    window.addEventListener('resize', calculer);
    return () => window.removeEventListener('resize', calculer);
  }, [max]);
  return h;
}
