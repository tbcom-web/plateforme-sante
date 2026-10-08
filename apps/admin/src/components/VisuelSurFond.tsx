'use client';

// Images × fonds (combinaisons-elements.ts) : la même image (héros, dessin, photo) posée sur un fond de la gamme, avec un traitement.
// Duels « Images × fonds » et tuile du même nom.
import { filtreImage, fondImageCss, gamme as gammeParId, type Asset } from '@plateforme/core';

export default function VisuelSurFond({ asset, fond, traitement = 'aucun', gamme = 'canard' }: { asset: Asset; fond: string; traitement?: string; gamme?: string }) {
  const g = gammeParId(gamme) ?? gammeParId('canard')!;
  const filtre = filtreImage(traitement);
  return (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl p-[8%] ring-1 ring-black/10" style={{ background: fondImageCss(fond, g) }}>
      {asset.rendu.kind === 'image'
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={asset.rendu.src} alt="" className="max-h-full max-w-full rounded-xl object-cover" style={{ filter: filtre }} />
        : asset.rendu.kind === 'svg' ? <div className="tr-svg rt-svg h-full w-full [&_svg]:h-full [&_svg]:w-full" style={{ filter: filtre }} dangerouslySetInnerHTML={{ __html: asset.rendu.svg() }} /> : null}
    </div>
  );
}
