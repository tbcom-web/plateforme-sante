import Link from 'next/link';
import { MARQUE } from '@/lib/marque';
import { getRole } from '@/lib/admin';

export default async function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  const admin = (await getRole()) === 'admin';
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/tableau-de-bord" className="font-bold text-teal-900">
            {MARQUE.nom}
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/tableau-de-bord" className="hover:text-teal-800">Tableau de bord</Link>
            <Link href="/mon-site" className="hover:text-teal-800">Mon site</Link>
            {admin && (
              <Link href="/admin" className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900 hover:bg-amber-200">
                Super admin
              </Link>
            )}
            <span className="hidden text-neutral-500 sm:inline">{email}</span>
            <form action="/deconnexion" method="post">
              <button className="text-neutral-600 underline-offset-4 hover:underline">Déconnexion</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
