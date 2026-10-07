'use client';

// Aperçus du Studio sur grand écran (demande de Paul du 2026-10-07 : « mes paramètres sur la GAUCHE, et bien voir le défilement
// complet de la version ordinateur et de la version mobile CÔTE À CÔTE ») : ordinateur (cadre 1440 mis à l'échelle) et téléphone
// (390 × 844, échelle 1) remplissent la hauteur de l'écran, chacun avec son défilement complet (CadreApercu, iframe).
// Options : « Défilement synchronisé » (faire défiler l'un fait défiler l'autre, proportionnellement) et « Page entière » (toute la
// page réduite dans le cadre, sans défiler : réduction appliquée DANS le document de l'aperçu, la largeur de mise en page et la
// hauteur d'écran restent celles de l'appareil — les sections « plein écran » gardent leur taille réelle). Signaler une zone
// (touche z, Échap) comme DoubleRendu.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppareilRetour, Zone } from '@plateforme/core';
import AnnotateurZones from '@/components/AnnotateurZones';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const ID_STYLE = 'studio-page-entiere';

type Props = {
  /** Rendu d'un appareil à la hauteur affichée donnée (cadre qui remplit l'écran) */
  rendu: (appareil: 'bureau' | 'mobile', hauteur?: number) => ReactNode;
  zonesOrdinateur: Zone[];
  zonesMobile: Zone[];
  onZonesOrdinateur: (z: Zone[]) => void;
  onZonesMobile: (z: Zone[]) => void;
  onAppareil?: (a: AppareilRetour) => void;
  libelle?: string;
  /** Hauteur réservée au-dessus des aperçus (barre d'options), pour remplir l'écran */
  entete?: ReactNode;
};

const lireCase = (cle: string) => { try { return localStorage.getItem(cle) === '1'; } catch { return false; } };
const ecrireCase = (cle: string, v: boolean) => { try { localStorage.setItem(cle, v ? '1' : '0'); } catch { /* stockage indisponible */ } };

/** Documents des iframes d'aperçu présents dans un conteneur (même origine : srcdoc) */
const documentsDe = (el: HTMLElement | null) => [...(el?.querySelectorAll('iframe') ?? [])].map((f) => f.contentDocument).filter((d): d is Document => Boolean(d?.body));

export default function ApercusCoteACote({ rendu, zonesOrdinateur, zonesMobile, onZonesOrdinateur, onZonesMobile, onAppareil, libelle = 'Page', entete }: Props) {
  const [sync, setSync] = useState(false);
  const [entiere, setEntiere] = useState(false);
  useEffect(() => { setSync(lireCase('studio:defilement-sync')); setEntiere(lireCase('studio:page-entiere')); }, []);
  const [mode, setMode] = useState(false);
  const ordi = useRef<HTMLDivElement>(null);
  const mob = useRef<HTMLDivElement>(null);
  useEffect(() => { onAppareil?.('les-deux'); }, [onAppareil]);
  // Hauteur des cadres : l'écran moins l'en-tête de l'admin, la barre d'options, les commandes de zone et la note de l'aperçu
  const [hauteur, setHauteur] = useState(700);
  useEffect(() => { const f = () => setHauteur(Math.max(360, window.innerHeight - 250)); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);

  // z : signaler une zone (un seul mode pour les deux rendus) ; Échap quitte
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

  // Défilement synchronisé et page entière : appliqués aux documents des deux cadres (recréés à chaque page : relus régulièrement)
  useEffect(() => {
    const branches = new Map<Document, () => void>();
    let echo: Document | null = null;
    const appliquerEntiere = (d: Document) => {
      let s = d.getElementById(ID_STYLE) as HTMLStyleElement | null;
      if (!entiere) { s?.remove(); return; }
      const hauteur = Math.max(d.body.offsetHeight, 1);
      const vue = d.defaultView?.innerHeight ?? hauteur;
      const k = Math.min(1, vue / hauteur);
      const css = `html{overflow:hidden!important}body{transform:scale(${k.toFixed(4)});transform-origin:50% 0}`;
      if (!s) { s = d.createElement('style'); s.id = ID_STYLE; d.head.appendChild(s); }
      if (s.textContent !== css) { s.textContent = css; d.defaultView?.scrollTo(0, 0); }
    };
    const tour = () => {
      const docs = [...documentsDe(ordi.current), ...documentsDe(mob.current)];
      for (const d of docs) {
        appliquerEntiere(d);
        if (branches.has(d)) continue;
        const w = d.defaultView;
        if (!w) continue;
        const f = () => {
          if (!sync || entiere) return;
          if (echo === d) { echo = null; return; }
          const max = d.documentElement.scrollHeight - w.innerHeight;
          const ratio = max > 0 ? w.scrollY / max : 0;
          for (const autre of docs) {
            if (autre === d || !autre.defaultView) continue;
            const m2 = autre.documentElement.scrollHeight - autre.defaultView.innerHeight;
            echo = autre;
            autre.defaultView.scrollTo({ top: ratio * Math.max(0, m2) });
          }
        };
        w.addEventListener('scroll', f, { passive: true });
        branches.set(d, () => w.removeEventListener('scroll', f));
      }
    };
    tour();
    const t = window.setInterval(tour, 600);
    return () => { window.clearInterval(t); for (const fin of branches.values()) fin(); for (const d of [...documentsDe(ordi.current), ...documentsDe(mob.current)]) d.getElementById(ID_STYLE)?.remove(); };
  }, [sync, entiere]);

  const caseOption = (libelleCase: string, valeur: boolean, maj: (v: boolean) => void, cle: string, aide: string) => (
    <label className="flex min-h-11 items-center gap-2 text-sm" title={aide}>
      <input type="checkbox" checked={valeur} onChange={(e) => { maj(e.target.checked); ecrireCase(cle, e.target.checked); }} className={`size-5 accent-teal-800 ${focus}`} />{libelleCase}
    </label>
  );

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {entete}
        {caseOption('Défilement synchronisé', sync, setSync, 'studio:defilement-sync', 'Faire défiler un aperçu fait défiler l’autre au même endroit de la page')}
        {caseOption('Page entière', entiere, setEntiere, 'studio:page-entiere', 'Toute la page réduite dans le cadre, sans défiler')}
        <span className="text-xs text-neutral-500">z : signaler une zone</span>
      </div>
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_404px] items-start gap-4">
        <figure ref={ordi} className="grid min-w-0 content-start gap-1">
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ordinateur (1440)</figcaption>
          <AnnotateurZones zones={zonesOrdinateur} onChange={onZonesOrdinateur} appareil="ordinateur" mode={mode} onMode={setMode} raccourci={false} libelle={`${libelle}, rendu ordinateur`}>
            <div aria-hidden="true" className="overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10">{rendu('bureau', hauteur)}</div>
          </AnnotateurZones>
        </figure>
        <figure ref={mob} className="grid min-w-0 content-start gap-1">
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Téléphone (390 × 844)</figcaption>
          <AnnotateurZones zones={zonesMobile} onChange={onZonesMobile} appareil="mobile" mode={mode} onMode={setMode} raccourci={false} libelle={`${libelle}, rendu mobile`}>
            <div aria-hidden="true" className="overflow-hidden rounded-[22px] bg-neutral-100 ring-4 ring-neutral-800">{rendu('mobile', Math.min(hauteur, 844))}</div>
          </AnnotateurZones>
        </figure>
      </div>
    </div>
  );
}
