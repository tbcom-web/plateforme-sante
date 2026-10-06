import Link from 'next/link';
import Shell from '@/components/Shell';
import { exigerAdmin } from '@/lib/admin';
import { getUser } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await exigerAdmin();
  const user = await getUser();

  return (
    <Shell email={user?.email ?? ''}>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="mr-2 font-semibold text-amber-900">Super admin</span>
        <Link href="/admin" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Sites</Link>
        <Link href="/admin/leads" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Essais</Link>
        <Link href="/admin/catalogue" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Catalogue de soins</Link>
        <Link href="/admin/flux" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Flux de contenus</Link>
        <Link href="/admin/univers" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Univers</Link>
        <Link href="/admin/modeles" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Modèles</Link>
        <Link href="/admin/visuels" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Banque visuelle</Link>
        <Link href="/admin/illustrations" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Illustrations</Link>
        <Link href="/admin/photos" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Jeux de photos</Link>
        <Link href="/admin/studio-portrait" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Studio portrait</Link>
        <Link href="/admin/logos" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Logos</Link>
        <Link href="/admin/maintenance" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Maintenance</Link>
      </div>
      {children}
    </Shell>
  );
}
