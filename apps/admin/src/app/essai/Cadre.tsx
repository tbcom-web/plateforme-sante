import Link from 'next/link';
import { MARQUE } from '@/lib/marque';

// En-tête et pied des pages publiques de l'essai (/essai, inscription, textes juridiques) : aucun appel serveur, aucun
// traceur ; liens vers les conditions de l'essai et la confidentialité.
export function EnteteEssai({ connexion = true }: { connexion?: boolean }) {
  return (
    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/essai" className="font-bold text-teal-900">{MARQUE.nom}</Link>
        {connexion && <Link href="/connexion" className="min-h-11 content-center text-sm font-medium text-neutral-700 underline-offset-4 hover:underline">Se connecter</Link>}
      </div>
    </header>
  );
}

export function PiedEssai() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-5xl gap-3 px-4 py-8 text-sm text-neutral-600 sm:flex sm:items-center sm:justify-between">
        <p>{MARQUE.nom} est un service de TBCOM pour les pédicures-podologues. Contact : <a className="underline underline-offset-2" href={`mailto:${MARQUE.contact}`}>{MARQUE.contact}</a></p>
        <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/essai/cgu" className="underline underline-offset-2">Conditions de l’essai</Link>
          <Link href="/essai/confidentialite" className="underline underline-offset-2">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
