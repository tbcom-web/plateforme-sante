import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnteteEssai, PiedEssai } from '../Cadre';
import Commencer from './Commencer';

export const metadata: Metadata = {
  title: 'Créer mon site d’essai',
  description: 'Préparation de votre espace d’essai gratuit.',
  robots: { index: false, follow: false },
};

// « Créer mon site gratuit » (bouton de /essai) : ouvre une session ANONYME Supabase dans ce navigateur (aucun
// formulaire, aucune donnée personnelle), démarre l'essai puis ouvre le parcours guidé /creer. Même navigateur avec une
// session existante : reprise directe. Inscriptions anonymes désactivées dans Supabase : repli sur /essai/inscription.
export default function PageCommencer() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <EnteteEssai />
      <main className="mx-auto grid w-full max-w-lg flex-1 content-start gap-4 px-4 py-6 sm:py-12">
        <Suspense>
          <Commencer turnstile={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null} />
        </Suspense>
      </main>
      <PiedEssai />
    </div>
  );
}
