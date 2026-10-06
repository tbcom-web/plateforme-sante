'use client';

// Rendu du site en plein écran, calculé dans le navigateur (ApercuTheme : mêmes modèles, couleurs, textes et dessins
// que le générateur), sur téléphone et sur ordinateur. Aucune construction GitHub ni Cloudflare : c'est le rendu
// proposé avant la création de l'accès. Le lien privé complet vient après « Créez votre accès ».
import { useEffect, useRef } from 'react';
import type { JeuPhotos, MarqueImportee, ModeleManifeste, SiteDraft } from '@plateforme/core';
import ApercuTheme, { type Appareil } from '@/components/ApercuTheme';
import type { SoinCatalogue } from '@/lib/sites';

export default function RenduPlein({
  draft, modele, catalogue, marquesImportees, jeuPhotos, appareil, acces, onFermer, onGarder,
}: {
  draft: SiteDraft;
  modele: ModeleManifeste;
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  jeuPhotos: JeuPhotos | null;
  appareil: Appareil;
  /** Accès déjà créé : pas d'invitation à le créer */
  acces: boolean;
  onFermer: () => void;
  onGarder: () => void;
}) {
  const fermer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    fermer.current?.focus();
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', echap);
    const ancien = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', echap); document.body.style.overflow = ancien; };
  }, [onFermer]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-rendu" className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] bg-neutral-100">
      <header className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-2.5">
        <h2 id="titre-rendu" className="text-base font-semibold">Le rendu de votre site</h2>
        <button ref={fermer} type="button" onClick={onFermer} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">← Revenir au parcours</button>
      </header>
      <div className="overflow-y-auto px-2 py-3 sm:px-6">
        <div className="mx-auto max-w-6xl" role="region" aria-label="Rendu du site">
          <ApercuTheme appareil={appareil} draft={draft} modele={modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={jeuPhotos} />
        </div>
        <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-neutral-600">Rendu préparé dans votre navigateur. Sur le site, le plan d’accès montre les vraies rues.</p>
      </div>
      {!acces && (
        <footer className="grid gap-2 border-t border-black/10 bg-white px-4 py-3 sm:flex sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-700">Pour garder ce site et l’ouvrir sur un lien privé : créez votre accès.</p>
          <button type="button" onClick={onGarder} className="min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            Garder mon site
          </button>
        </footer>
      )}
    </div>
  );
}
