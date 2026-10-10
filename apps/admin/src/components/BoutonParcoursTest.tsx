'use client';

// « Tester le parcours client » (super admin, demande de Paul du 2026-10-08) : ouvre le parcours client dans un nouvel onglet en
// MODE TEST (/admin/tester-parcours : drapeau serveur vérifié avec le rôle admin), avec un persona de départ en un clic.
// Rien n'est envoyé ni publié ; « Effacer mes sessions test » vide l'état gardé dans ce navigateur et retire le drapeau.
import { PERSONAS_TEST } from '@/app/essai/votre-site/personas';

const lien = (persona: string) => `/admin/tester-parcours?persona=${encodeURIComponent(persona)}`;

export default function BoutonParcoursTest({ compact = false }: { compact?: boolean }) {
  const effacer = () => {
    try { window.localStorage.removeItem('onboarding-test:v1'); } catch { /* stockage indisponible */ }
    window.location.href = '/admin/tester-parcours?effacer=1';
  };
  if (compact) {
    return (
      <a href={lien('vierge')} target="_blank" rel="noopener" className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-amber-100 px-3 font-semibold text-amber-950 ring-1 ring-amber-300 hover:bg-amber-200">
        Tester le parcours client
      </a>
    );
  }
  return (
    <section aria-labelledby="titre-parcours-test" className="grid gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titre-parcours-test" className="text-lg font-semibold">Tester le parcours client</h2>
        <p className="text-sm">Mode test : aucun compte, aucun lead, aucun e-mail, aucune publication.</p>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Personas de départ">
        {PERSONAS_TEST.map((p) => (
          <li key={p.id}>
            <a href={lien(p.id)} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-amber-300 hover:bg-amber-100">
              {p.titre}
            </a>
          </li>
        ))}
        <li>
          <a href={`${lien('sport-basket')}&etape=style`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-amber-300 hover:bg-amber-100">
            Aller à « Choisissez votre style »
          </a>
        </li>
      </ul>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button type="button" onClick={effacer} className="inline-flex min-h-11 items-center rounded px-1 font-semibold underline underline-offset-2">Effacer mes sessions test</button>
        <a href="/admin/choix-clients" className="inline-flex min-h-11 items-center rounded px-1 font-semibold underline underline-offset-2">Voir les choix des clients</a>
      </p>
    </section>
  );
}
