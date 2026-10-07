'use client';

// Rendus ordinateur ET mobile d'un élément noté (demande de Paul du 2026-10-07 : « faire des retours à la fois sur la version
// ordinateur et la version mobile ») : côte à côte sur grand écran, bascule Ordinateur / Mobile sur téléphone. Chaque rendu est
// annotable (AnnotateurZones, un seul mode zone pour les deux : touche z, Échap). `onAppareil` dit ce que Paul voit (les deux,
// ou l'un des deux) : c'est l'appareil enregistré avec la note du choix.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppareilRetour, Zone } from '@plateforme/core';
import AnnotateurZones from './AnnotateurZones';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

/** Écran de moins de 1024 px : un rendu à la fois */
export function useEcranEtroit(largeur = 1023) {
  const [etroit, setEtroit] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${largeur}px)`);
    const f = () => setEtroit(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [largeur]);
  return etroit;
}

type Props = {
  /** Rendu pour un appareil (« bureau » : ordinateur, « mobile » : téléphone) */
  rendu: (appareil: 'bureau' | 'mobile') => ReactNode;
  zonesOrdinateur: Zone[];
  zonesMobile: Zone[];
  onZonesOrdinateur: (z: Zone[]) => void;
  onZonesMobile: (z: Zone[]) => void;
  /** Appareil regardé : « les-deux » côte à côte, sinon celui de la bascule */
  onAppareil?: (a: AppareilRetour) => void;
  /** Cadre téléphone (largeur en px) du rendu mobile */
  largeurMobile?: number;
  /** Rendu mobile seul affiché d'abord sur téléphone */
  mobileDabord?: boolean;
  libelle?: string;
};

export default function DoubleRendu({ rendu, zonesOrdinateur, zonesMobile, onZonesOrdinateur, onZonesMobile, onAppareil, largeurMobile = 300, mobileDabord = true, libelle = 'Élément' }: Props) {
  const etroit = useEcranEtroit();
  const [vu, setVu] = useState<'ordinateur' | 'mobile'>(mobileDabord ? 'mobile' : 'ordinateur');
  const [mode, setMode] = useState(false);
  const appareil: AppareilRetour = etroit ? vu : 'les-deux';
  const dernier = useRef<AppareilRetour | null>(null);
  useEffect(() => { if (dernier.current !== appareil) { dernier.current = appareil; onAppareil?.(appareil); } }, [appareil, onAppareil]);

  // Un seul mode zone pour les deux rendus : z bascule, Échap quitte (ignoré pendant une saisie)
  const touches = useRef<(e: KeyboardEvent) => void>(() => {});
  touches.current = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || (cible && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName)))) return;
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); setMode((m) => !m); return; }
    if (e.key === 'Escape' && mode) { e.preventDefault(); e.stopImmediatePropagation(); setMode(false); }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => touches.current(e);
    window.addEventListener('keydown', f, true);
    return () => window.removeEventListener('keydown', f, true);
  }, []);

  const ordinateur = (
    <figure className="grid min-w-0 content-start gap-1.5">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ordinateur</figcaption>
      <AnnotateurZones zones={zonesOrdinateur} onChange={onZonesOrdinateur} appareil="ordinateur" mode={mode} onMode={setMode} raccourci={false} libelle={`${libelle}, rendu ordinateur`}>
        <div aria-hidden="true" className="overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10">{rendu('bureau')}</div>
      </AnnotateurZones>
    </figure>
  );
  const mobile = (
    <figure className="grid min-w-0 content-start justify-items-center gap-1.5">
      <figcaption className="justify-self-start text-xs font-semibold uppercase tracking-wide text-neutral-500">Mobile</figcaption>
      <AnnotateurZones zones={zonesMobile} onChange={onZonesMobile} appareil="mobile" mode={mode} onMode={setMode} raccourci={false} libelle={`${libelle}, rendu mobile`} className="w-full justify-items-center">
        <div aria-hidden="true" className="mx-auto overflow-hidden rounded-[22px] bg-neutral-100 ring-4 ring-neutral-800" style={{ width: largeurMobile, maxWidth: '100%' }}>{rendu('mobile')}</div>
      </AnnotateurZones>
    </figure>
  );
  if (!etroit) return <div className="grid min-w-0 items-start gap-4" style={{ gridTemplateColumns: `minmax(0, 1fr) ${largeurMobile + 24}px` }}>{ordinateur}{mobile}</div>;
  return (
    <div className="grid min-w-0 gap-2">
      <div role="radiogroup" aria-label="Rendu affiché" className="flex w-fit rounded-xl border border-neutral-200 bg-white p-0.5 text-sm">
        {(['mobile', 'ordinateur'] as const).map((a) => (
          <button key={a} type="button" role="radio" aria-checked={vu === a} onClick={() => setVu(a)}
            className={`min-h-11 rounded-lg px-3 font-medium ${focus} ${vu === a ? 'bg-teal-800 text-white' : 'text-neutral-700'}`}>{a === 'mobile' ? 'Mobile' : 'Ordinateur'}</button>
        ))}
      </div>
      {vu === 'mobile' ? mobile : ordinateur}
    </div>
  );
}
