import Link from 'next/link';
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
  return (
    <Shell email={moi.email}>
      <nav aria-label="Chaîne des modèles" className="-mt-2 mb-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="mr-1 font-bold text-teal-900">Chaîne des modèles</span>
        {ONGLETS.map((o) => <Link key={o.href} href={o.href} className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 bg-white px-3 hover:bg-teal-50">{o.libelle}</Link>)}
        {moi.role === 'validateur' && <Link href="/chaine/equipe" className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 bg-white px-3 hover:bg-teal-50">Équipe</Link>}
        <span className="ml-auto rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700" data-role={moi.role}>{LIBELLES_ROLES[moi.role]}</span>
      </nav>
      <PrechauffageOuvriers />
      {children}
    </Shell>
  );
}
