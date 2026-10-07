'use client';

// Sélectionneur de zones (demande de Paul du 2026-10-07 : « identifier les zones à revoir » sur les illustrations, images,
// rendus de pages…). Mode « Signaler une zone » (bouton ou touche z ; Échap pour annuler) : tracer un rectangle ou une ellipse
// à la souris ou au doigt sur l'aperçu, puis choisir une étiquette rapide et écrire un commentaire court ; plusieurs zones
// numérotées ; une zone se déplace (glisser) ou se supprime avant l'enregistrement ; zoom ×2 pour viser juste sur téléphone.
// Coordonnées NORMALISÉES (0 à 1) par rapport à la surface (core : zones.ts) : justes quelle que soit la taille d'affichage.
// Aucune dépendance : SVG et événements pointeur natifs. Lecture seule (`lectureSeule`) : surimpression numérotée (avant /
// après, rendu mobile à revoir).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { deplacerZone, ETIQUETTES_ZONE, ligneZone, LIMITES_ZONES, zoneDepuisPixels, type EtiquetteZone, type FormeZone, type Zone } from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const ORANGE = '#c2410c';

type Props = {
  zones: Zone[];
  onChange?: (zones: Zone[]) => void;
  /** Appareil du rendu annoté (chaque zone le garde) */
  appareil: 'ordinateur' | 'mobile';
  children: ReactNode;
  /** Surimpression seule (aucun tracé) */
  lectureSeule?: boolean;
  /** Mode zone contrôlé par le parent (rendus doubles : un seul mode pour les deux surfaces) */
  mode?: boolean;
  onMode?: (m: boolean) => void;
  /** Touche z / Échap gérées ici (une seule surface par écran) */
  raccourci?: boolean;
  /** Libellé accessible de la surface */
  libelle?: string;
  /** Liste des zones sous la surface (édition) ; défaut : oui hors lecture seule */
  liste?: boolean;
  className?: string;
};

/** Surimpression : formes en SVG (coordonnées 0-1000, trait constant) et pastilles numérotées en HTML (jamais déformées) */
function Formes({ zones, apercu, choisie, onChoisir, onDebutGlisser, actif }: {
  zones: Zone[]; apercu?: Zone | null; choisie?: number | null; onChoisir?: (i: number) => void; onDebutGlisser?: (i: number, e: React.PointerEvent) => void; actif: boolean;
}) {
  const forme = (z: Zone, i: number | null) => {
    const p = { fill: ORANGE, fillOpacity: i === choisie ? 0.18 : 0.08, stroke: ORANGE, strokeWidth: i === choisie ? 3 : 2.5, strokeDasharray: i === null ? '4 4' : '9 6', vectorEffect: 'non-scaling-stroke' as const };
    const evts = i !== null && actif ? { onPointerDown: (e: React.PointerEvent) => onDebutGlisser?.(i, e), style: { cursor: 'move', pointerEvents: 'auto' as const } } : {};
    return z.forme === 'ellipse'
      ? <ellipse key={i ?? 'apercu'} cx={(z.x + z.l / 2) * 1000} cy={(z.y + z.h / 2) * 1000} rx={(z.l / 2) * 1000} ry={(z.h / 2) * 1000} {...p} {...evts} />
      : <rect key={i ?? 'apercu'} x={z.x * 1000} y={z.y * 1000} width={z.l * 1000} height={z.h * 1000} rx={6} {...p} {...evts} />;
  };
  return (
    <>
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
        {zones.map((z, i) => forme(z, i))}
        {apercu && forme(apercu, null)}
      </svg>
      {zones.map((z, i) => (
        <button key={i} type="button" tabIndex={onChoisir ? 0 : -1} onClick={() => onChoisir?.(i)} title={ligneZone(z, i)} aria-label={ligneZone(z, i)}
          className={`absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-bold text-white shadow ring-2 ring-white ${onChoisir ? 'pointer-events-auto' : 'pointer-events-none'} ${focus}`}
          style={{ left: `${Math.max(2, Math.min(98, z.x * 100))}%`, top: `${Math.max(3, Math.min(97, z.y * 100))}%`, background: i === choisie ? '#7c2d12' : ORANGE }}>
          {i + 1}
        </button>
      ))}
    </>
  );
}

/** Surimpression numérotée en lecture seule (avant / après, rendu mobile à revoir) */
export function SurimpressionZones({ zones, children, className = '' }: { zones: Zone[]; children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {zones.length > 0 && <div className="pointer-events-none absolute inset-0"><Formes zones={zones} actif={false} /></div>}
    </div>
  );
}

export default function AnnotateurZones({ zones, onChange, appareil, children, lectureSeule = false, mode: modeControle, onMode, raccourci, libelle = 'Aperçu', liste = !lectureSeule, className = '' }: Props) {
  const [modeLocal, setModeLocal] = useState(false);
  const mode = !lectureSeule && (modeControle ?? modeLocal);
  const changerMode = (m: boolean) => { if (onMode) onMode(m); else setModeLocal(m); };
  const [forme, setForme] = useState<FormeZone>('rect');
  const [zoom, setZoom] = useState(1);
  const [choisie, setChoisie] = useState<number | null>(null);
  const [trace, setTrace] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const glisse = useRef<{ i: number; x: number; y: number; z: Zone } | null>(null);
  const surface = useRef<HTMLDivElement>(null);

  const rect = () => surface.current?.getBoundingClientRect() ?? null;
  const point = (e: React.PointerEvent) => { const r = rect(); return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 }; };

  // Clavier : z bascule le mode zone, Échap annule le tracé en cours, puis quitte le mode (ignoré pendant une saisie)
  const touches = useRef<(e: KeyboardEvent) => void>(() => {});
  touches.current = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || (cible && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName)))) return;
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); changerMode(!mode); return; }
    if (e.key === 'Escape' && (trace || mode)) { e.preventDefault(); e.stopImmediatePropagation(); if (trace) setTrace(null); else changerMode(false); }
  };
  const ecoute = !lectureSeule && (raccourci ?? modeControle === undefined);
  useEffect(() => {
    if (!ecoute) return;
    const f = (e: KeyboardEvent) => touches.current(e);
    window.addEventListener('keydown', f, true);
    return () => window.removeEventListener('keydown', f, true);
  }, [ecoute]);

  const maj = (l: Zone[]) => onChange?.(l.slice(0, LIMITES_ZONES.zones));
  const debut = (e: React.PointerEvent) => {
    if (!mode || zones.length >= LIMITES_ZONES.zones) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = point(e);
    setTrace({ a: p, b: p });
  };
  const bouge = (e: React.PointerEvent) => {
    const r = rect();
    if (glisse.current && r) {
      const g = glisse.current;
      const z = deplacerZone(g.z, (e.clientX - g.x) / r.width, (e.clientY - g.y) / r.height);
      maj(zones.map((x, i) => (i === g.i ? z : x)));
      return;
    }
    if (trace) setTrace({ ...trace, b: point(e) });
  };
  const fin = () => {
    if (glisse.current) { glisse.current = null; return; }
    if (!trace) return;
    const r = rect();
    const z = r ? zoneDepuisPixels(trace.a, trace.b, r.width, r.height, { forme, appareil }) : null;
    setTrace(null);
    if (z) { maj([...zones, z]); setChoisie(zones.length); }
  };
  const debutGlisser = (i: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (surface.current as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
    glisse.current = { i, x: e.clientX, y: e.clientY, z: zones[i] };
    setChoisie(i);
  };
  const apercu = trace && rect() ? zoneDepuisPixels(trace.a, trace.b, rect()!.width, rect()!.height, { forme, appareil }) : null;
  const modifier = (i: number, d: Partial<Zone>) => maj(zones.map((z, k) => (k === i ? { ...z, ...d } : z)));
  const supprimer = (i: number) => { maj(zones.filter((_, k) => k !== i)); setChoisie(null); };

  if (lectureSeule) return <SurimpressionZones zones={zones} className={className}>{children}</SurimpressionZones>;

  return (
    <div className={`grid min-w-0 gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <button type="button" aria-pressed={mode} onClick={() => changerMode(!mode)} title="Touche z ; Échap pour annuler"
          className={`min-h-11 rounded-lg border px-3 font-semibold ${focus} ${mode ? 'border-orange-700 bg-orange-700 text-white' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-orange-50'}`}>
          {mode ? 'Tracer une zone… (Échap)' : 'Signaler une zone'} <kbd className={`ml-1 rounded px-1 text-xs ${mode ? 'bg-white/20' : 'bg-neutral-100'}`}>z</kbd>
        </button>
        {mode && (
          <span role="group" aria-label="Forme de la zone" className="flex gap-1">
            {(['rect', 'ellipse'] as const).map((f) => (
              <button key={f} type="button" aria-pressed={forme === f} onClick={() => setForme(f)} className={`min-h-11 rounded-lg border px-2.5 ${focus} ${forme === f ? 'border-orange-700 bg-orange-50 font-semibold' : 'border-neutral-300 bg-white'}`}>{f === 'rect' ? '▭ Rectangle' : '◯ Ellipse'}</button>
            ))}
          </span>
        )}
        <button type="button" aria-pressed={zoom > 1} onClick={() => setZoom((z) => (z > 1 ? 1 : 2))} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-2.5 ${focus}`}>{zoom > 1 ? 'Zoom ×1' : 'Zoom ×2'}</button>
        {zones.length > 0 && <span className="text-xs text-neutral-600">{zones.length} zone{zones.length > 1 ? 's' : ''}{zones.length >= LIMITES_ZONES.zones ? ' (maximum)' : ''}</span>}
      </div>
      <div className={`min-w-0 ${zoom > 1 ? 'max-h-[70vh] overflow-auto rounded-xl ring-1 ring-orange-300' : ''}`}>
        <div ref={surface} role="group" aria-label={`${libelle}${mode ? ' : mode zone, tracez à la souris ou au doigt' : ''}`}
          className={`relative min-w-0 ${mode ? 'cursor-crosshair select-none' : ''}`} style={{ zoom, touchAction: mode ? 'none' : undefined }}
          onPointerDown={debut} onPointerMove={bouge} onPointerUp={fin} onPointerCancel={() => { setTrace(null); glisse.current = null; }}>
          {children}
          <div className={`absolute inset-0 ${mode ? '' : 'pointer-events-none'}`} style={mode ? { outline: `2px dashed ${ORANGE}`, outlineOffset: -2 } : undefined}>
            <Formes zones={zones} apercu={apercu} choisie={choisie} onChoisir={setChoisie} onDebutGlisser={debutGlisser} actif={mode} />
          </div>
        </div>
      </div>
      {liste && zones.length > 0 && (
        <ol className="grid gap-1.5" aria-label="Zones signalées">
          {zones.map((z, i) => (
            <li key={i} className={`grid gap-1.5 rounded-lg p-2 text-sm ring-1 ${choisie === i ? 'bg-orange-50 ring-orange-300' : 'bg-white ring-black/10'}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => setChoisie(choisie === i ? null : i)} className={`grid size-7 place-items-center rounded-full text-xs font-bold text-white ${focus}`} style={{ background: ORANGE }} aria-label={`Zone ${i + 1} : ${choisie === i ? 'replier' : 'modifier'}`}>{i + 1}</button>
                <select value={z.etiquette} onChange={(e) => modifier(i, { etiquette: e.target.value as EtiquetteZone })} aria-label={`Étiquette de la zone ${i + 1}`} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
                  {ETIQUETTES_ZONE.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
                </select>
                <button type="button" onClick={() => supprimer(i)} className={`ml-auto min-h-11 rounded-lg px-2 text-sm text-red-800 hover:bg-red-50 ${focus}`} aria-label={`Supprimer la zone ${i + 1}`}>Supprimer</button>
              </div>
              <input value={z.commentaire} onChange={(e) => modifier(i, { commentaire: e.target.value.slice(0, LIMITES_ZONES.commentaire) })} maxLength={LIMITES_ZONES.commentaire}
                placeholder="Ex. le pouce est trop long" aria-label={`Commentaire de la zone ${i + 1}`} className="min-h-11 w-full rounded-lg border border-neutral-300 px-2 text-base md:text-sm" />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
