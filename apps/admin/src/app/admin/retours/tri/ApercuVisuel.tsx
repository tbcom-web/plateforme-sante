'use client';

// Aperçu d'un visuel de l'inventaire (tri par sujet, duels d'illustrations) : SVG sur le fond de son registre, ou image.
// Les variables de couleur (--fond, --doux, --encre) et SURFACES_CSS sont posées par la page appelante.
import Image from 'next/image';
import { useMemo } from 'react';
import type { Asset } from '@plateforme/core';

/** Aperçu d'un visuel : SVG (fond du registre), image, ou rien */
export default function Apercu({ a, grand = false }: { a: Asset; grand?: boolean }) {
  const svg = useMemo(() => (a.rendu.kind === 'svg' ? a.rendu.svg() : null), [a]);
  if (a.rendu.kind === 'image') {
    return (
      <div className={`relative w-full overflow-hidden ${grand ? 'aspect-[4/3] rounded-2xl' : 'aspect-square rounded-xl'} bg-neutral-100`}>
        <Image src={a.rendu.src} alt={grand ? a.titre : ''} fill sizes={grand ? '(max-width: 767px) 100vw, 720px' : '200px'} className={a.type === 'modele' ? 'object-contain' : 'object-cover'} />
      </div>
    );
  }
  if (!svg || a.rendu.kind !== 'svg') return <div className={`grid ${grand ? 'aspect-[4/3]' : 'aspect-square'} place-items-center rounded-xl bg-neutral-100 text-xs text-neutral-500`}>Sans aperçu</div>;
  const fond = a.rendu.fond;
  return (
    <div className={`grid w-full place-items-center overflow-hidden ${grand ? 'aspect-[4/3] rounded-2xl' : 'aspect-square rounded-xl'} ring-1 ring-black/10 ${fond === 'grille' ? 'surface-grille' : fond === 'plan' ? 'surface-plan' : ''}`}
      style={{ background: fond === 'doux' ? 'var(--doux)' : fond === 'grille' || fond === 'plan' ? undefined : 'var(--fond)', color: 'var(--encre)' }}>
      <div className={`tr-svg ${a.type === 'picto' ? (grand ? 'size-40' : 'size-16') : 'h-[88%] w-[88%]'}`} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
