'use client';

// Visuel animé dans un vrai premier écran (retour de Paul du 2026-10-08 : « je ne vois pas d'animations ») : titre, sous-titre et
// bouton du cabinet à gauche, le visuel principal à droite (au-dessus sur téléphone), sur le fond « plan » des héros relevés.
// Animation JOUÉE (LectureAnimation : lecture en boucle, pause, figée si mouvements réduits) ; `fige` : son image fixe.
import { animationDeCle, type Asset } from '@plateforme/core';
import LectureAnimation from './LectureAnimation';

export default function PremierEcranAnime({ asset, fige = false, sujet, compact = false }: { asset: Asset; fige?: boolean; sujet: string; compact?: boolean }) {
  const nom = animationDeCle(asset.cle);
  const svg = asset.rendu.kind === 'svg' ? asset.rendu.svg() : '';
  return (
    // Fond plan : la classe surface-plan (dessins.css) ; couleur de repli dans le cadre téléphone (iframe sans la feuille de la page)
    <div className={`surface-plan grid items-center gap-4 overflow-hidden rounded-2xl p-5 text-white ${compact ? '' : 'sm:grid-cols-[1fr_1.1fr] sm:p-8'}`} style={{ backgroundColor: '#163a3e' }}>
      <div className={`grid gap-2 ${compact ? 'order-2' : ''}`}>
        <span className="text-xs font-semibold uppercase tracking-widest opacity-80">Pédicure-podologue · {sujet}</span>
        <span className="text-2xl font-bold leading-tight">Cabinet de pédicurie-podologie</span>
        <span className="justify-self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">Prendre rendez-vous</span>
      </div>
      <div className="min-w-0">
        {fige || !nom
          ? <div className="tr-svg aspect-[4/3] w-full" aria-label="Image fixe" dangerouslySetInnerHTML={{ __html: svg }} />
          : <LectureAnimation key={nom} nom={nom} />}
        <p className="mt-1 text-[11px] opacity-75">{fige ? 'Image fixe (sans animation)' : 'Animation jouée'}</p>
      </div>
    </div>
  );
}
