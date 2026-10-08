'use client';

// Animation d'un visuel du kit (SVG animé) : même budget que les aperçus (AnimationsBudget.tsx) — elle joue DUREE_ANIMATIONS_MS au
// chargement, puis se met en pause ; elle rejoue au survol ou au toucher ; « Animer en continu » la laisse jouer.
import { useEffect, useState, type ReactNode } from 'react';
import { DUREE_ANIMATIONS_MS, useAnimerContinu } from '@/components/AnimationsBudget';

export default function AnimationBornee({ children }: { children: ReactNode }) {
  const continu = useAnimerContinu();
  const [joue, setJoue] = useState(true);
  const [tour, setTour] = useState(0);
  useEffect(() => {
    if (continu) { setJoue(true); return; }
    setJoue(true);
    const t = window.setTimeout(() => setJoue(false), DUREE_ANIMATIONS_MS);
    return () => window.clearTimeout(t);
  }, [continu, tour]);
  return (
    <div onMouseEnter={() => setTour((x) => x + 1)} onTouchStart={() => setTour((x) => x + 1)} className={joue ? '' : 'kit-anim-pause'} title={joue ? undefined : 'Survolez pour rejouer'}>
      <style>{'.kit-anim-pause *{animation-play-state:paused!important}'}</style>
      {children}
    </div>
  );
}
