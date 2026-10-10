import Link from 'next/link';
import { MARQUE } from '@/lib/marque';
import { getRole } from '@/lib/admin';

/**
 * anonyme : session anonyme de l'essai (site commencé sans accès, 0025) : ni tableau de bord, ni compte, ni déconnexion
 * (se déconnecter ferait perdre le brouillon de ce navigateur).
 */
export default async function Shell({ email, children, anonyme = false }: { email: string; children: React.ReactNode; anonyme?: boolean }) {
  const admin = !anonyme && (await getRole()) === 'admin';
  return (
    // overflow-x-clip : filet de sécurité contre tout défilement horizontal de la page sur téléphone (les tableaux
    // larges défilent dans leur propre conteneur overflow-x-auto).
    <div className="min-h-screen overflow-x-clip">
      {/* Téléphone : l'en-tête passe à la ligne (marque, puis liens) et n'est collant qu'à partir de sm. */}
      <header className="z-20 border-b border-black/5 bg-white/90 backdrop-blur sm:sticky sm:top-0">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-0 px-4 py-1 sm:py-2">
          <Link href="/tableau-de-bord" className="inline-flex min-h-11 items-center font-bold text-teal-900">
            {MARQUE.nom}
          </Link>
          {anonyme ? <p className="text-sm text-neutral-600">Votre site d’essai</p> : (
          <nav className="-mx-4 flex w-[calc(100%+2rem)] min-w-0 items-center gap-x-1 overflow-x-auto whitespace-nowrap px-4 text-sm [scrollbar-width:none] sm:mx-0 sm:w-auto sm:flex-wrap sm:gap-x-5 sm:overflow-visible sm:px-0">
            <Link href="/tableau-de-bord" className="inline-flex min-h-11 items-center px-1.5 hover:text-teal-800 sm:px-0">Tableau de bord</Link>
            <Link href="/mon-site" className="inline-flex min-h-11 items-center px-1.5 hover:text-teal-800 sm:px-0">Mon site</Link>
            {admin && (
              <Link href="/admin" className="inline-flex min-h-11 items-center rounded-full bg-amber-100 px-3 font-semibold text-amber-900 hover:bg-amber-200">
                Super admin
              </Link>
            )}
            <Link href="/compte" className="hidden max-w-[16rem] truncate text-neutral-500 hover:text-teal-800 md:inline" title="Mon compte">{email}</Link>
            <Link href="/compte" className="inline-flex min-h-11 items-center px-1.5 text-neutral-600 hover:text-teal-800 md:hidden">Mon compte</Link>
            <form action="/deconnexion" method="post">
              <button className="inline-flex min-h-11 items-center px-1.5 text-neutral-600 underline-offset-4 hover:underline sm:px-0">Déconnexion</button>
            </form>
          </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
