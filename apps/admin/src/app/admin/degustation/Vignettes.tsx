'use client';

// Rendus des propositions de la Dégustation (Degustation.tsx) : vignettes d'accueil RENDUES EN VRAI (ApercuTheme : même rendu que
// le Studio, ordinateur ou téléphone selon le format), spécimens (palettes et polices : ApercuStudio), kits d'images (mosaïque),
// icônes (même picto dans chaque style) ; confettis discrets (désactivés si l'utilisateur réduit les animations).
import '@plateforme/core/dessins.css';
import { memo, useMemo, type CSSProperties } from 'react';
import {
  appliquerRecette, blocFocal, habillageDe, lireCleDirection, nuancier, svgPicto, svgPictoDirection, vueDePage, type CompositionRecette, type MarqueImportee, type ModeleManifeste, type PageStructure,
  type PropositionDegustation, type Univers,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import ApercuStudio, { draftStudio } from '@/components/ApercuStudio';
import BlocFocal from '@/components/BlocFocal';
import type { SoinCatalogue } from '@/lib/sites';

export type ContexteRendu = {
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
};

type PropsVignette = {
  p: PropositionDegustation;
  format: string;
  dimension: string;
  scenario: { principaux: string[]; secondaires: string[]; couleurs: string[] };
  rendu: ContexteRendu;
  hauteur: number;
  /** Rendu agrandi (défilable) */
  grand?: boolean;
};

function VignetteCompo({ x, scenario, rendu, hauteur, mobile, page, grand }: { x: CompositionRecette; scenario: PropsVignette['scenario']; rendu: ContexteRendu; hauteur: number; mobile: boolean; page: PageStructure | null; grand?: boolean }) {
  const apercu = useMemo(() => appliquerRecette(draftStudio(scenario.principaux, scenario.secondaires, scenario.couleurs), x, {
    proposes: rendu.proposes, modeles: rendu.modeles.map((m) => m.manifeste), soinsConnus: rendu.catalogue.map((c) => c.slug), themesActives: rendu.themesActives,
  }), [x, scenario, rendu]);
  if (!apercu) return <p className="p-3 text-xs text-neutral-600">Aperçu indisponible.</p>;
  return (
    <ApercuTheme sansCommandes {...(grand ? { hauteurCadre: hauteur } : { vignette: hauteur })} vueInitiale={page ? vueDePage(page) : 'accueil'} appareil={mobile ? 'mobile' : 'bureau'}
      draft={apercu.draft} modele={apercu.modele} catalogue={rendu.catalogue} marquesImportees={rendu.marquesImportees} jeuPhotos={null} />
  );
}

function MosaiqueKit({ photos, hauteur }: { photos: string[]; hauteur: number }) {
  const [une, ...autres] = photos;
  return (
    <div className="grid gap-1 bg-white p-1" style={{ height: hauteur, gridTemplateRows: '2fr 1fr' } as CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={une} alt="" className="h-full w-full rounded object-cover" loading="lazy" />
      <div className="grid grid-cols-3 gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {autres.slice(0, 3).map((u) => <img key={u} src={u} alt="" className="h-full w-full rounded object-cover" loading="lazy" />)}
      </div>
    </div>
  );
}

function Icone({ cle, hauteur }: { cle: string; hauteur: number }) {
  const d = lireCleDirection(cle);
  const svg = (t: number) => (d ? svgPictoDirection(d.id, d.direction, { taille: t }) : svgPicto(cle.slice(6), { taille: t, accent: true })) ?? '';
  return (
    <div className="grid place-items-center gap-3 bg-white" style={{ height: hauteur }}>
      <span dangerouslySetInnerHTML={{ __html: svg(Math.min(96, Math.round(hauteur / 2.4))) }} />
      <span className="flex items-center gap-3 rounded-lg bg-neutral-900 px-3 py-2 text-white" dangerouslySetInnerHTML={{ __html: svg(24) }} />
    </div>
  );
}

/** Dimensions d'une grille « Détail » montrées en BLOC FOCALISÉ (largeur téléphone, lisible dans une carte) */
export const DIMENSIONS_FOCALES = new Set(['couleurs', 'polices', 'typo:graisse', 'details:coins']);

/** Bloc focalisé d'une option de détail : palette (nuancier + titre + bouton + carte), police (titre + texte), graisse, coins */
function BlocDetail({ x, dimension, hauteur }: { x: CompositionRecette; dimension: string; hauteur: number }) {
  const h = habillageDe(x);
  const bloc = dimension === 'couleurs' ? { elements: ['surtitre', 'h1', 'bouton', 'carte'] as const, empile: true } : blocFocal(dimension) ?? { elements: ['surtitre', 'h1', 'paragraphe3'] as const, empile: true };
  const reglages = { police: x.police, typo: h.typo, details: h.details, gamme: x.gamme || null, couleur: x.couleur };
  return (
    <div className="grid content-start overflow-hidden bg-white" style={{ height: hauteur }}>
      {dimension === 'couleurs' && (
        <div className="flex h-9 shrink-0" aria-hidden="true">{nuancier(x).map((c) => <span key={c.nom} className="flex-1" style={{ background: c.hex }} title={c.nom} />)}</div>
      )}
      <BlocFocal bloc={{ ...bloc, elements: [...bloc.elements] }} reglages={reglages} mobile echelle={0.9} />
    </div>
  );
}

/** Rendu d'une proposition selon le format */
export const VignetteProposition = memo(function VignetteProposition({ p, format, dimension, scenario, rendu, hauteur, grand }: PropsVignette) {
  if (format === 'kits' && p.photos) return <MosaiqueKit photos={p.photos} hauteur={hauteur} />;
  if (format === 'icones') return <Icone cle={p.cle} hauteur={hauteur} />;
  if (p.x && DIMENSIONS_FOCALES.has(dimension)) return <BlocDetail x={p.x} dimension={dimension} hauteur={hauteur} />;
  if (!p.x) return null;
  const page = dimension.startsWith('page:') ? (dimension.slice(5) as PageStructure) : null;
  return <VignetteCompo x={p.x} scenario={scenario} rendu={rendu} hauteur={hauteur} mobile={format === 'premiers-ecrans'} page={page} grand={grand} />;
});

// ---------------------------------------------------------------------------------------------------------------
// Empreinte du rendu (contrôle « différence perceptible », 2026-10-09)
// ---------------------------------------------------------------------------------------------------------------

export type LigneEmpreinte = { y: number; sig: string };

/**
 * Empreinte d'une vignette rendue (iframe de CadreApercu) : pour chaque élément visible, position et taille (arrondies à 4 px),
 * rayon, couleurs, police et graisse calculés. Deux vignettes au rendu identique ont la même liste, quelle que soit leur clé.
 */
export function empreinteIframe(iframe: HTMLIFrameElement | null): LigneEmpreinte[] | null {
  const d = iframe?.contentDocument;
  const w = d?.defaultView;
  if (!d || !w || !d.body?.firstElementChild) return null;
  const l: LigneEmpreinte[] = [];
  const els = d.body.querySelectorAll('*');
  const sy = w.scrollY;
  for (let i = 0; i < els.length && l.length < 2500; i++) {
    const e = els[i] as HTMLElement;
    if (e.tagName === 'STYLE' || e.tagName === 'SCRIPT') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = w.getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const q = (v: number) => Math.round(v / 4);
    const texte = e.childElementCount === 0 ? (e.textContent ?? '').trim().slice(0, 24) : '';
    l.push({ y: Math.round(r.top + sy), sig: [e.tagName, q(r.left), q(r.top + sy), q(r.width), q(r.height), cs.borderRadius, cs.backgroundColor, cs.color, cs.fontFamily.slice(0, 24), cs.fontWeight, cs.fontSize, texte].join('|') });
  }
  return l;
}

/**
 * Comparaison des empreintes : fenêtre de recadrage (y, hauteur `h`) qui montre une différence pour le plus de paires possible
 * (« Évalué ici »), et paires sans AUCUNE différence dans cette fenêtre (rendu identique à l'œil) → grille refusée.
 */
export function comparerEmpreintes(l: readonly (LigneEmpreinte[] | null)[], h: number): { y: number; identiques: [number, number][] } {
  const ok = l.map((x, i) => ({ x, i })).filter((o): o is { x: LigneEmpreinte[]; i: number } => Boolean(o.x?.length));
  const diffs: { i: number; j: number; ys: number[] }[] = [];
  for (let a = 0; a < ok.length; a++) for (let b = a + 1; b < ok.length; b++) {
    const sa = new Set(ok[a].x.map((e) => e.sig)), sb = new Set(ok[b].x.map((e) => e.sig));
    const ys = [...ok[a].x.filter((e) => !sb.has(e.sig)), ...ok[b].x.filter((e) => !sa.has(e.sig))].map((e) => e.y).sort((m, n) => m - n);
    diffs.push({ i: ok[a].i, j: ok[b].i, ys });
  }
  // Fenêtres candidates : 0, puis chaque première différence (moins une marge)
  const candidats = [0, ...new Set(diffs.flatMap((d) => d.ys.slice(0, 1)).map((y) => Math.max(0, y - 40)))];
  let best = { y: 0, n: -1 };
  for (const y of candidats) {
    const n = diffs.filter((d) => d.ys.some((v) => v >= y && v < y + h)).length;
    if (n > best.n) best = { y, n };
  }
  return { y: best.y, identiques: diffs.filter((d) => !d.ys.some((v) => v >= best.y && v < best.y + h)).map((d) => [d.i, d.j]) };
}

/** Aperçu d'un ingrédient seul (notes rapides) */
export function ApercuIngredient({ cle, rendu, hauteur, mobile }: { cle: string; rendu: ContexteRendu; hauteur: number; mobile?: boolean }) {
  if (cle.startsWith('photo:')) return null;
  return <ApercuStudio cle={cle} nu mobile={mobile} vignette={hauteur} proposes={rendu.proposes} modeles={rendu.modeles} catalogue={rendu.catalogue} marquesImportees={rendu.marquesImportees} themesActives={rendu.themesActives} />;
}

const COULEURS_CONFETTIS = ['#0f766e', '#f59e0b', '#14b8a6', '#e11d48', '#6366f1'];

/** Confettis discrets (médaille) : 28 éclats, 1,6 s, rien si « réduire les animations » */
export function Confettis({ cle }: { cle: number }) {
  const eclats = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ g: (i * 37) % 100, d: (i * 53) % 40, c: COULEURS_CONFETTIS[i % COULEURS_CONFETTIS.length], r: (i * 47) % 360 })), []);
  if (!cle) return null;
  return (
    <div key={cle} aria-hidden="true" className="degustation-confettis pointer-events-none fixed inset-x-0 top-0 z-50 h-0">
      <style>{`
        .degustation-confettis span { position: absolute; top: -12px; width: 8px; height: 12px; border-radius: 2px; animation: degustation-chute 1.6s ease-in forwards; }
        @keyframes degustation-chute { to { transform: translateY(70vh) rotate(540deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .degustation-confettis { display: none; } }
      `}</style>
      {eclats.map((e, i) => <span key={i} style={{ left: `${e.g}%`, background: e.c, animationDelay: `${e.d * 10}ms`, transform: `rotate(${e.r}deg)` }} />)}
    </div>
  );
}

/** Petit son de validation (désactivé par défaut, option mémorisée) */
export function jouerSon(ok: boolean) {
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const A = W.AudioContext ?? W.webkitAudioContext;
    if (!A) return;
    const c = new A();
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = ok ? 880 : 520;
    g.gain.setValueAtTime(0.06, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.2);
    setTimeout(() => void c.close(), 400);
  } catch { /* son indisponible */ }
}
