'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { choisirProfession } from '@/app/admin/actions-profession';

// Bascule rapide d'une profession à l'autre (vue Clients du commercial) : mêmes données et même cookie que le sélecteur de
// l'en-tête (NavAdmin), en boutons visibles. Libellés issus du registre (props), aucun métier codé en dur.
export default function BasculeProfession({ professions, courante }: { professions: { id: string; libelle: string }[]; courante: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <div role="group" aria-label="Profession affichée" className="flex flex-wrap gap-2">
      {professions.map((p) => (
        <button key={p.id} type="button" aria-pressed={p.id === courante} disabled={enCours}
          onClick={() => p.id !== courante && demarrer(async () => { await choisirProfession(p.id); router.refresh(); })}
          className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${p.id === courante ? 'bg-teal-800 text-white ring-teal-900' : 'bg-white text-neutral-800 ring-black/10 hover:bg-neutral-50'}`}>
          {p.libelle}
        </button>
      ))}
    </div>
  );
}
