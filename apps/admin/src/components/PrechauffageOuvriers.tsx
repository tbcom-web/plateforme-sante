'use client';

// Réchauffe les workers de préparation (pool-workers.ts) quand l'admin est au repos, ou dès le survol d'un lien vers la
// Dégustation ou la chaîne des modèles (perf, 2026-10-09) : la première carte ne paie plus leur démarrage. Rien n'est rendu.
import { useEffect } from 'react';
import { rechaufferOuvriers } from './pool-workers';

export default function PrechauffageOuvriers() {
  useEffect(() => {
    const go = () => rechaufferOuvriers();
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const idle = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 3000);
    const survol = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (a && /^\/(admin\/degustation|chaine)/.test(a.getAttribute('href') ?? '')) go();
    };
    document.addEventListener('pointerover', survol, { passive: true });
    document.addEventListener('focusin', survol);
    return () => {
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle); else clearTimeout(idle);
      document.removeEventListener('pointerover', survol);
      document.removeEventListener('focusin', survol);
    };
  }, []);
  return null;
}
