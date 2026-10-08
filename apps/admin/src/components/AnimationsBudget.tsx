'use client';

// Budget des animations des aperçus (décision du 2026-10-08, après la mesure « le tool commence un peu à ramer » : au repos, les
// animations des aperçus occupaient 65 % du fil principal dans le Studio, 42 % dans l'Atelier). Paul veut toujours VOIR les
// animations : elles jouent ~6 s au chargement d'un aperçu et après chaque changement de son contenu (dé, recette, duel), puis se
// mettent en pause ; elles rejouent au survol ou au toucher de l'aperçu (et via « Rejouer ») ; pause hors écran et onglet caché.
// Canvas compris (boucle requestAnimationFrame arrêtée en pause, 30 images/s au plus : AnimationsApercu.ts). L'option « Animer en
// continu » (désactivée par défaut, mémorisée par navigateur) rend le comportement d'avant. Mise en œuvre : CadreApercu.tsx.
import { useSyncExternalStore } from 'react';

/** Durée de jeu après un chargement, un changement ou un survol */
export const DUREE_ANIMATIONS_MS = 6000;
/** Cadence plafond des canvas animés */
export const IMAGES_PAR_SECONDE = 30;
/** Classe posée sur <html> du document de l'aperçu quand ses animations sont en pause */
export const CLASSE_PAUSE = 'ap-anim-pause';
/** Événement (fenêtre de l'admin) : des animations reprennent, les boucles des canvas redémarrent */
export const EVENEMENT_REPRISE = 'ap-anim-reprise';

const CLE = 'admin-animer-continu';
const abonnes = new Set<() => void>();
let valeur: boolean | null = null;
const lire = (): boolean => {
  if (valeur === null) { try { valeur = window.localStorage.getItem(CLE) === '1'; } catch { valeur = false; } }
  return valeur;
};
export function definirAnimerContinu(v: boolean) {
  valeur = v;
  try { window.localStorage.setItem(CLE, v ? '1' : '0'); } catch { /* navigation privée */ }
  abonnes.forEach((f) => f());
}
const abonner = (f: () => void) => {
  abonnes.add(f);
  const s = (e: StorageEvent) => { if (e.key === CLE) { valeur = null; f(); } };
  window.addEventListener('storage', s);
  return () => { abonnes.delete(f); window.removeEventListener('storage', s); };
};
/** « Animer en continu » (navigateur) : false par défaut */
export const useAnimerContinu = () => useSyncExternalStore(abonner, lire, () => false);

/** Case « Animer en continu » (Studio, Atelier) */
export function OptionAnimerContinu({ className = 'flex min-h-11 items-center gap-2 text-sm' }: { className?: string }) {
  const continu = useAnimerContinu();
  return (
    <label className={className} title="Sinon : les animations jouent quelques secondes après chaque changement, puis au survol de l’aperçu">
      <input type="checkbox" checked={continu} onChange={(e) => definirAnimerContinu(e.target.checked)} className="size-5 accent-teal-800" />Animer en continu
    </label>
  );
}

const pausees = new WeakMap<Document, Set<Animation>>();
/**
 * Animations infinies d'un document mises en pause (les animations finies — apparitions — vont à leur terme), ou reprises :
 * seules celles que le budget a mises en pause reprennent (une pause demandée ailleurs, bouton du diaporama, est respectée).
 */
export function pauserAnimations(doc: Document, pause: boolean) {
  doc.documentElement.classList.toggle(CLASSE_PAUSE, pause);
  const l = pausees.get(doc) ?? new Set<Animation>();
  pausees.set(doc, l);
  if (pause) {
    for (const a of doc.getAnimations()) if (a.playState === 'running' && a.effect?.getTiming().iterations === Infinity) { a.pause(); l.add(a); }
  } else {
    for (const a of l) if (a.playState === 'paused') a.play();
    l.clear();
  }
}
