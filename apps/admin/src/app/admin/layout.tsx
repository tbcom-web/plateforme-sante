import Link from 'next/link';
import Shell from '@/components/Shell';
import { exigerAdmin } from '@/lib/admin';
import { getUser } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await exigerAdmin();
  const user = await getUser();

  return (
    <Shell email={user?.email ?? ''}>
      {/* Téléphone : bandeau défilant horizontalement (dans son conteneur), sur plusieurs lignes à partir de sm. */}
      <nav aria-label="Super admin" className="-mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 py-1 text-sm sm:mx-0 sm:mb-6 sm:flex-wrap sm:overflow-visible sm:px-0">
        <span className="mr-2 shrink-0 font-semibold text-amber-900">Super admin</span>
        <Link href="/admin" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Sites</Link>
        <Link href="/admin/leads" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Essais</Link>
        <Link href="/admin/catalogue" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Catalogue de soins</Link>
        <Link href="/admin/flux" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Flux de contenus</Link>
        <Link href="/admin/univers" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Univers</Link>
        <Link href="/admin/modeles" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Modèles</Link>
        <Link href="/admin/visuels" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Banque visuelle</Link>
        <Link href="/admin/atelier" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Atelier</Link>
        <Link href="/admin/illustrations"className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Illustrations</Link>
        <Link href="/admin/photos" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Jeux de photos</Link>
        <Link href="/admin/studio-portrait" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Studio portrait</Link>
        <Link href="/admin/logos" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Logos</Link>
        <Link href="/admin/maintenance" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Maintenance</Link>
      </nav>
      {children}
    </Shell>
  );
}
