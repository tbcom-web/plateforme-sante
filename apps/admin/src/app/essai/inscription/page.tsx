import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnteteEssai, PiedEssai } from '../Cadre';
import Inscription from './Inscription';

export const metadata: Metadata = {
  title: 'Créer mon site d’essai',
  description: 'Inscription à l’essai gratuit de 3 mois : prénom, nom, e-mail et mot de passe, sans carte bancaire.',
  robots: { index: false, follow: true },
};

// Inscription en un écran, puis enchaînement direct sur le parcours guidé (/creer).
export default function PageInscription() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <EnteteEssai />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:py-12">
        <Suspense>
          <Inscription turnstile={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null} />
        </Suspense>
      </main>
      <PiedEssai />
    </div>
  );
}
