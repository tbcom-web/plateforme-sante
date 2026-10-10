import Link from 'next/link';
import { Suspense } from 'react';
import TempsServeur from '@/components/TempsServeur';
import { getRole } from '@/lib/admin';
import Shell from '@/components/Shell';
import PrechauffageOuvriers from '@/components/PrechauffageOuvriers';
import { exigerContributeur } from '@/lib/chaine-modeles';
import { LIBELLES_ROLES } from '@plateforme/core';

// CHAÎNE DE PRODUCTION DES MODÈLES (docs/chaine-modeles.md) : ouverte à l'équipe TBCOM (contributeurs) et au validateur (Paul,
// super admin). Hors de /admin : un contributeur n'a pas accès au super admin.
const ONGLETS = [
  { href: '/chaine', libelle: 'Tableau' },
  { href: '/chaine/preselection', libelle: 'Présélection' },
  { href: '/chaine/tournoi', libelle: 'Tournoi' },
];

export default async function LayoutChaine({ children }: { children: React.ReactNode }) {
  const moi = await exigerContributeur();
  const admin = (await getRole()) === 'admin';
  return (
    <Shell email={moi.email}>
      {/* Téléphone : une seule rangée qui défile (deux rangées repoussaient le travail sous la ligne de flottaison) */}
      <nav aria-label="Chaîne des modèles" className="-mx-4 -mt-2 mb-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 text-sm [scrollbar-width:none] sm:mx-0 sm:mb-5 sm:flex-wrap sm:overflow-visible sm:px-0">
        <span className="mr-1 font-bold text-teal-900"><span className="sm:hidden">Chaîne</span><span className="hidden sm:inline">Chaîne des modèles</span></span>
        {ONGLETS.map((o) => <Link key={o.href} href={o.href} className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-neutral-300 bg-white px-3 hover:bg-teal-50">{o.libelle}</Link>)}
        {moi.role === 'validateur' && <Link href="/chaine/equipe" className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 bg-white px-3 hover:bg-teal-50">Équipe</Link>}
        <span className="ml-auto shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700" data-role={moi.role}>{LIBELLES_ROLES[moi.role]}</span>
      </nav>
      <PrechauffageOuvriers />
      {children}
      {/* Mesure continue : « page servie en x ms » (admins seulement) */}
      {admin && <Suspense fallback={null}><TempsServeur /></Suspense>}
    </Shell>
  );
}
