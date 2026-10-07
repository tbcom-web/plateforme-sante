'use client';

// Animations JOUÉES dans les aperçus (demande de Paul du 2026-10-07 : « dans le Studio, je voudrais voir les illustrations animées
// aussi ») : à la place de l'image figée (svgAnimationFixe), l'animation telle que les sites la jouent — SVG + CSS (premiers-pas,
// semelle, meulage, trajectoire : animations-lecture.ts du core) ou canvas (podoscope, coureur : animations-canvas.ts), comme le
// lecteur de /admin/retours (LectureAnimation). La feuille de lecture voyage avec l'aperçu (iframe CadreApercu) ; les canvas sont
// pilotés par l'horloge de la fenêtre de l'aperçu, en pause hors écran (IntersectionObserver de l'iframe) et quand l'onglet est
// caché. Une animation dont les ingrédients ne sont pas encore validés joue quand même, avec un badge « en attente de validation ».
import { createContext, useEffect, type RefObject } from 'react';
import { animationCanvas, cssLectureAnimations, svgAnimationFixe, svgAnimationLecture, type Animation, type Registre } from '@plateforme/core';
import { renduCanvas } from './animations-canvas';

export type ReglageAnimations = { jouer: boolean; enAttente: readonly string[] };
export const ContexteAnimations = createContext<ReglageAnimations>({ jouer: false, enAttente: [] });

const ech = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');

/** HTML d'une animation dans l'aperçu : jouée (lecture) ou image figée ; badge si ses ingrédients ne sont pas validés */
export function htmlAnimationApercu(a: Animation, registre: Registre, r: ReglageAnimations, id?: string): string {
  if (!r.jouer) return svgAnimationFixe(a, { registre, ...(id ? { id } : {}) });
  const ident = ech(id ?? `apa-${a}`);
  const badge = r.enAttente.includes(a) ? '<span class="apa-attente">animation en attente de validation</span>' : '';
  const corps = animationCanvas(a)
    ? `<canvas data-anim-canvas="${a}" aria-hidden="true"></canvas>${a === 'podoscope' ? '<span class="al-scan" aria-hidden="true"></span>' : ''}`
    : svgAnimationLecture(a, ident) ?? svgAnimationFixe(a, { registre });
  return `<div class="al al-joue apa" data-animation="${a}">${corps}${badge}</div>`;
}

/** Feuille des animations jouées (lecture du site + badge), à poser dans l'aperçu */
export const cssAnimationsApercu = () =>
  `${cssLectureAnimations()}.apa{position:relative;width:100%;height:100%;border-radius:inherit}.apa-attente{position:absolute;right:8px;top:8px;padding:2px 8px;border-radius:999px;background:#fff7e6;color:#7a4a00;font:600 11px/1.6 system-ui,sans-serif;box-shadow:0 0 0 1px rgb(0 0 0 / .12)}`;

/**
 * Canvas des animations jouées sous `racine` (podoscope, coureur) : une horloge (requestAnimationFrame) pour tous, pause hors écran
 * (IntersectionObserver de la fenêtre de l'aperçu) et onglet caché. L'aperçu est monté par portail dans une iframe qui peut être
 * recréée (mesure du cadre, changement de page) : les canvas sont relus régulièrement et rattachés.
 */
export function useAnimationsCanvas(racine: RefObject<HTMLElement | null>, actif: boolean, cle: string) {
  useEffect(() => {
    if (!actif) return;
    type Suivi = { r: NonNullable<ReturnType<typeof renduCanvas>>; t: number; visible: boolean; fin: () => void };
    const suivis = new Map<HTMLCanvasElement, Suivi>();
    const relire = () => {
      for (const [cv, s] of suivis) if (!cv.isConnected) { s.fin(); suivis.delete(cv); }
      const el = racine.current;
      if (!el) return;
      for (const cv of el.querySelectorAll<HTMLCanvasElement>('canvas[data-anim-canvas]')) {
        if (suivis.has(cv) || !cv.clientWidth) continue;
        const r = renduCanvas(cv.dataset.animCanvas ?? '', cv);
        const win = cv.ownerDocument.defaultView;
        if (!r || !win) continue;
        r.dimensionner();
        const s: Suivi = { r, t: 0, visible: true, fin: () => undefined };
        const io = new win.IntersectionObserver((es) => { s.visible = es.some((e) => e.isIntersecting); });
        const ro = new win.ResizeObserver(() => { r.dimensionner(); r.dessiner(s.t, true); });
        io.observe(cv); ro.observe(cv);
        s.fin = () => { io.disconnect(); ro.disconnect(); };
        suivis.set(cv, s);
      }
    };
    relire();
    const scrute = window.setInterval(relire, 400);
    let id = 0;
    let avant = performance.now();
    const image = (maintenant: number) => {
      const dt = Math.min(100, maintenant - avant);
      avant = maintenant;
      if (!document.hidden) for (const s of suivis.values()) if (s.visible) { s.t += dt; s.r.dessiner(s.t, true); }
      id = requestAnimationFrame(image);
    };
    id = requestAnimationFrame(image);
    return () => { window.clearInterval(scrute); cancelAnimationFrame(id); for (const s of suivis.values()) s.fin(); suivis.clear(); };
  }, [racine, actif, cle]);
}