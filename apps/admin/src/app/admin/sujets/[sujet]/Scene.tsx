'use client';

// Une carte EN SITUATION (point d'entrée « À valider ») : l'élément n'est pas montré seul sur fond blanc mais là où il servira —
// illustration ou photo dans un premier écran de cabinet, icône dans une section de soins, palette appliquée à la page, texte dans
// une page de téléphone, série de photos en planche ; mises en page, polices et animations d'en-tête : aperçu du site (ApercuStudio,
// le même que les Arrivages). « Voir seul » : l'élément en grand. Sobre : vocabulaire de la profession, aucun slogan.
import { htmlContenu, type MarqueImportee, type ModeleManifeste, type Univers } from '@plateforme/core';
import { lazy, Suspense, type ReactNode } from 'react';
import type { SoinCatalogue } from '@/lib/sites';
import type { VisuelArrivage } from '../../arrivages/Arrivages';

// Aperçu du site chargé seulement quand une carte en a besoin (mises en page, polices, animations) : page plus légère au départ
const ApercuStudio = lazy(() => import('@/components/ApercuStudio'));

export type DonneesScene = { metier: string; pour: string; soins: string[] };
export type DonneesStudio = { proposes: Univers[]; modeles: { id: string; manifeste: ModeleManifeste }[]; catalogue: SoinCatalogue[]; marquesImportees: MarqueImportee[]; themesActives: string[] };

const CHAMPS: Record<string, string> = { ville: 'Lyon', cabinet: 'Cabinet Rousseau', praticien: 'Camille Rousseau' };

function Fond({ v, children, className = '' }: { v: Extract<VisuelArrivage, { kind: 'svg' }>; children: ReactNode; className?: string }) {
  return (
    <div className={`${className} ${v.fond === 'grille' ? 'surface-grille' : v.fond === 'plan' ? 'surface-plan' : ''}`} style={{ background: v.fond === 'doux' ? 'var(--doux)' : v.fond === 'grille' || v.fond === 'plan' ? undefined : 'var(--fond)', color: 'var(--encre)' }}>
      {children}
    </div>
  );
}

/** Premier écran d'un cabinet avec le visuel principal à droite (au-dessus sur téléphone) */
function PremierEcran({ scene, visuel, couleurs }: { scene: DonneesScene; visuel: ReactNode; couleurs?: string[] }) {
  const [c1, c2, c3] = couleurs ?? [];
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10" style={c1 ? { background: c3 ?? '#fff' } : undefined}>
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-2 text-xs text-neutral-600">
        <span className="font-semibold" style={c1 ? { color: c1 } : undefined}>{CHAMPS.cabinet}</span>
        <span className="hidden gap-3 sm:flex"><span>Soins</span><span>Le cabinet</span><span>Contact</span></span>
        <span aria-hidden="true" className="sm:hidden">☰</span>
      </div>
      <div className="grid items-center gap-4 p-4 sm:grid-cols-[1fr_1.1fr] sm:p-6">
        <div className="order-2 grid gap-2 sm:order-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{scene.metier} · {CHAMPS.ville}</span>
          <span className="text-xl font-bold leading-tight text-neutral-900 sm:text-2xl">{CHAMPS.cabinet}</span>
          <span className="text-sm text-neutral-600">Consultations pour {scene.pour}.</span>
          <span className="justify-self-start rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: c1 ?? 'var(--accent, #0f766e)' }}>Prendre rendez-vous</span>
        </div>
        <div className="order-1 min-w-0 sm:order-2">{visuel}</div>
      </div>
    </div>
  );
}

/** Section « soins » : trois cartes, l'icône évaluée sur la première (les autres en attente de leur icône) */
function SectionSoins({ scene, icone }: { scene: DonneesScene; icone: Extract<VisuelArrivage, { kind: 'svg' }> }) {
  const soins = scene.soins.length ? scene.soins : ['Bilan', 'Suivi', 'Conseils'];
  return (
    <div className="overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-black/10 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Nos soins</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {soins.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${i === 0 ? 'ring-teal-700/40' : 'ring-black/5'}`}>
            {i === 0
              ? <Fond v={icone} className="grid size-14 shrink-0 place-items-center rounded-xl"><span className="sc-svg block size-10" dangerouslySetInnerHTML={{ __html: icone.svg }} /></Fond>
              : <span className="size-14 shrink-0 rounded-xl bg-neutral-100" aria-hidden="true" />}
            <span className="text-sm font-semibold capitalize text-neutral-800">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TexteContenu({ c }: { c: Extract<VisuelArrivage, { kind: 'contenu' }>['contenu'] }) {
  const html = [
    `<h1>${htmlContenu(c.titre, CHAMPS).replace(/^<p>|<\/p>$/g, '')}</h1>`,
    c.chapo ? `<div class="ct-chapo">${htmlContenu(c.chapo, CHAMPS)}</div>` : '',
    ...c.blocs.map((b) => [b.titre ? `<h2>${htmlContenu(b.titre, CHAMPS).replace(/^<p>|<\/p>$/g, '')}</h2>` : '', htmlContenu(b.corps, CHAMPS)].join('')),
  ].join('');
  return (
    <div className="grid place-items-center rounded-2xl bg-neutral-100 p-3">
      <div className="w-full max-w-[390px] overflow-hidden rounded-[28px] border-[6px] border-neutral-800 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-2 text-xs text-neutral-500"><span>{CHAMPS.cabinet}</span><span aria-hidden="true">☰</span></div>
        <div className="ct-page max-h-[min(60vh,560px)] overflow-y-auto px-4 py-3 text-[15px]" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {(c.erreurs.length > 0 || c.avertissements.length > 0) && (
        <ul className="mt-2 grid w-full max-w-[390px] gap-1 text-xs">
          {c.erreurs.map((e) => <li key={e} className="rounded-lg bg-red-50 px-2 py-1 text-red-900 ring-1 ring-red-200">Erreur : {e}</li>)}
          {c.avertissements.map((e) => <li key={e} className="rounded-lg bg-amber-50 px-2 py-1 text-amber-950 ring-1 ring-amber-200">{e}</li>)}
        </ul>
      )}
    </div>
  );
}

export const CSS_SCENE = `.sc-svg svg{width:100%;height:100%;display:block}
.ct-page{font-family:var(--police-texte,system-ui);color:#1f2937;line-height:1.55}
.ct-page h1{font-size:1.4rem;line-height:1.2;font-weight:700;margin:0 0 .5rem}.ct-page h2{font-size:1.08rem;font-weight:700;margin:1rem 0 .3rem}
.ct-page p{margin:.4rem 0}.ct-page ul{list-style:disc;padding-left:1.2rem;margin:.4rem 0}.ct-page ol{list-style:decimal;padding-left:1.3rem}
.ct-chapo{color:#4b5563;font-size:.95rem}`;

export default function Scene({ visuel: v, scene, studio, seul, titre, photosSerie, mobile }: {
  visuel: VisuelArrivage | null;
  scene: DonneesScene;
  studio: DonneesStudio | null;
  seul: boolean;
  titre: string;
  photosSerie?: { cle: string; apercu: string; auteur: string }[];
  mobile: boolean;
}) {
  if (photosSerie?.length) {
    // eslint-disable-next-line @next/next/no-img-element
    const img = (src: string, cl: string) => <img src={src} alt="" decoding="async" draggable={false} className={cl} />;
    const planche = (
      <ul className="grid grid-cols-3 gap-1.5">
        {photosSerie.slice(0, 9).map((p) => <li key={p.cle}>{img(p.apercu, 'aspect-square w-full rounded-lg object-cover')}</li>)}
      </ul>
    );
    return seul ? planche : (
      <div className="grid gap-3">
        <PremierEcran scene={scene} visuel={img(photosSerie[0].apercu, 'aspect-[4/3] w-full rounded-xl object-cover')} />
        {planche}
      </div>
    );
  }
  if (!v) return <div className="grid aspect-[4/3] w-full animate-pulse place-items-center rounded-2xl bg-neutral-100 text-sm text-neutral-500">Chargement…</div>;
  if (v.kind === 'contenu') return <TexteContenu c={v.contenu} />;
  if (v.kind === 'studio') {
    if (!studio) return <p className="rounded-2xl bg-neutral-50 p-6 text-sm text-neutral-600">Aperçu du site indisponible.</p>;
    // Écran tactile ou étroit (2026-10-10, « mobile seul ») : l'aperçu est une illustration de la carte, pas une page à parcourir ; sans
    // pointeur dans l'iframe, le doigt fait défiler la page et le glisser OK / Pas OK part de toute la carte (l'iframe avalait le geste)
    return <div className={`overflow-hidden rounded-2xl ring-1 ring-black/10 pointer-coarse:[&_iframe]:pointer-events-none ${mobile ? '[&_iframe]:pointer-events-none' : ''}`}><Suspense fallback={<div className="grid aspect-[4/3] w-full animate-pulse place-items-center bg-neutral-100 text-sm text-neutral-500">Aperçu du site…</div>}><ApercuStudio cle={v.cle} {...studio} mobile={mobile} /></Suspense></div>;
  }
  if (v.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img src={v.src} alt={titre} decoding="async" draggable={false} className={seul ? 'max-h-[70vh] w-full rounded-2xl bg-neutral-100 object-contain' : 'aspect-[4/3] w-full rounded-xl object-cover'} />;
    return seul ? img : <PremierEcran scene={scene} visuel={img} />;
  }
  if (v.kind === 'gamme') {
    const bande = <div className="grid h-24 grid-cols-6 overflow-hidden rounded-xl">{v.couleurs.map((c, i) => <span key={i} style={{ background: c }} />)}</div>;
    return seul ? bande : <div className="grid gap-3"><PremierEcran scene={scene} couleurs={v.couleurs} visuel={<div className="aspect-[4/3] w-full rounded-xl" style={{ background: `linear-gradient(135deg, ${v.couleurs[0] ?? '#ccc'}, ${v.couleurs[1] ?? '#eee'})` }} />} />{bande}</div>;
  }
  if (v.kind === 'svg') {
    const grand = <Fond v={v} className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl"><span className={`sc-svg block ${v.picto ? 'size-40' : 'h-[88%] w-[88%]'}`} dangerouslySetInnerHTML={{ __html: v.svg }} /></Fond>;
    if (seul) return grand;
    return v.picto ? <div className="grid gap-3"><SectionSoins scene={scene} icone={v} /><div className="mx-auto w-40">{grand}</div></div> : <PremierEcran scene={scene} visuel={grand} />;
  }
  if (v.kind === 'differe') return <div className="grid aspect-[4/3] w-full animate-pulse place-items-center rounded-2xl bg-neutral-100 text-sm text-neutral-500">Chargement…</div>;
  return <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl bg-neutral-50 text-sm text-neutral-500">Sans aperçu</div>;
}
