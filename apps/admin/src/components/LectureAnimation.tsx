'use client';

// Lecteur d'animation de l'admin (/admin/retours, /admin/illustrations) : l'animation telle que les sites la jouent, pas l'image
// figée. SVG + CSS (trajectoire, premiers-pas, semelle, meulage : animations-lecture.ts du core, feuille injectée une fois) ou
// canvas (podoscope, coureur : animations-canvas.ts). Boutons Lecture / Pause et Rejouer. Mouvements réduits (réglage du système) :
// image figée par défaut, comme sur les sites, et « Voir l'animation » pour forcer la lecture dans l'admin.
import { useEffect, useMemo, useRef, useState } from 'react';
import { animationCanvas, cssLectureAnimations, svgAnimationLecture, type Animation } from '@plateforme/core';
import { renduCanvas, type RenduCanvas } from './animations-canvas';

const ID_FEUILLE = 'al-feuille-lecture';
/** Feuille de lecture injectée une seule fois dans <head> */
function injecterFeuille() {
  if (typeof document === 'undefined' || document.getElementById(ID_FEUILLE)) return;
  const s = document.createElement('style');
  s.id = ID_FEUILLE;
  s.textContent = cssLectureAnimations();
  document.head.appendChild(s);
}

const bouton = 'min-h-11 rounded-lg bg-white px-3 text-sm font-semibold text-neutral-900 ring-1 ring-black/15 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700';

export default function LectureAnimation({ nom, className = '' }: { nom: Animation; className?: string }) {
  const [reduit, setReduit] = useState(false);
  const [joue, setJoue] = useState(false);
  const [demarre, setDemarre] = useState(false);
  const [tour, setTour] = useState(0);
  const canvas = animationCanvas(nom);
  const svg = useMemo(() => svgAnimationLecture(nom, `al-${nom}`), [nom]);

  // Préférence du système : lecture automatique, sauf mouvements réduits (image figée, lecture sur demande)
  useEffect(() => {
    injecterFeuille();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduit(mq.matches);
    if (!mq.matches) { setJoue(true); setDemarre(true); }
  }, [nom]);

  // Canvas : horloge pilotée par le lecteur (temps écoulé en lecture seulement)
  const cv = useRef<HTMLCanvasElement>(null);
  const rendu = useRef<RenduCanvas | null>(null);
  const ecoule = useRef(0);
  useEffect(() => {
    if (!canvas || !cv.current) return;
    const r = renduCanvas(nom, cv.current);
    rendu.current = r;
    if (!r) return;
    const ro = new ResizeObserver(() => { r.dimensionner(); r.dessiner(ecoule.current, ecoule.current > 0); });
    ro.observe(cv.current);
    return () => { ro.disconnect(); rendu.current = null; };
  }, [canvas, nom]);
  useEffect(() => {
    if (!canvas || !joue) return;
    let id = 0, avant = performance.now();
    const image = (maintenant: number) => {
      ecoule.current += Math.min(100, maintenant - avant);
      avant = maintenant;
      rendu.current?.dessiner(ecoule.current, true);
      id = requestAnimationFrame(image);
    };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, [canvas, joue, tour]);

  const lire = () => { setDemarre(true); setJoue(true); };
  const rejouer = () => {
    ecoule.current = 0;
    rendu.current?.reinitialiser();
    rendu.current?.dessiner(0, false);
    setDemarre(true); setJoue(true); setTour((t) => t + 1);
  };

  const classes = ['al', 'grid', 'aspect-[4/3]', 'w-full', 'overflow-hidden', 'rounded-xl', 'ring-1', 'ring-black/10', demarre ? 'al-joue' : '', demarre && !joue ? 'al-pause' : ''].join(' ');
  return (
    <div className={`grid gap-2 ${className}`}>
      <div className={classes} data-animation={nom} data-etat={!demarre ? 'fige' : joue ? 'lecture' : 'pause'}>
        {canvas ? (
          <>
            <canvas ref={cv} aria-hidden="true" className="col-start-1 row-start-1" />
            {nom === 'podoscope' && <span className="al-scan" aria-hidden="true" />}
          </>
        ) : <div key={tour} className="col-start-1 row-start-1 h-full w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg ?? '' }} />}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lecture de l’animation">
        {!demarre ? (
          <button type="button" onClick={lire} className={bouton}>▶ Voir l’animation</button>
        ) : (
          <button type="button" onClick={() => setJoue((j) => !j)} className={bouton} aria-pressed={!joue}>{joue ? '❚❚ Pause' : '▶ Lecture'}</button>
        )}
        <button type="button" onClick={rejouer} className={bouton}>↻ Rejouer</button>
        <span className="text-xs text-neutral-500" aria-live="polite">
          {!demarre ? (reduit ? 'Image figée : mouvements réduits sur cet appareil.' : 'Image figée.') : joue ? 'Lecture en boucle, comme sur le site.' : 'En pause.'}
        </span>
      </div>
    </div>
  );
}
