import Link from 'next/link';
import { ESPACES, type IdEspace } from '@plateforme/core/admin-espaces';

// Page d'accueil d'un espace du super admin (Cuisine, Clients) : ses outils, en grandes cases (docs/espaces-admin.md).
export default function HubEspace({ id, sousTitre, details = {} }: { id: IdEspace; sousTitre?: string; details?: Record<string, string> }) {
  const e = ESPACES.find((x) => x.id === id)!;
  const carte = (href: string, libelle: string) => (
    <li key={href}>
      <Link href={href} className="grid h-full min-h-16 gap-0.5 rounded-2xl border border-black/5 bg-white p-4 hover:border-teal-700/40">
        <span className="font-semibold text-teal-900">{libelle}</span>
        {details[href] && <span className="text-sm text-neutral-600">{details[href]}</span>}
      </Link>
    </li>
  );
  const principales = e.entrees.filter((x) => !x.secondaire && x.href !== e.href);
  const secondaires = e.entrees.filter((x) => x.secondaire);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="text-2xl font-bold">{e.libelle}</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">{e.description}{sousTitre ? ` ${sousTitre}` : ''}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{principales.map((x) => carte(x.href, x.libelle))}</ul>
      {secondaires.length > 0 && (
        <section aria-labelledby={`hub-${id}-plus`} className="grid gap-3">
          <h2 id={`hub-${id}-plus`} className="text-base font-semibold text-neutral-700">Réglages et ressources</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{secondaires.map((x) => carte(x.href, x.libelle))}</ul>
        </section>
      )}
    </div>
  );
}
