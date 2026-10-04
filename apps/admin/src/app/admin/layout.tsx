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
        <Link href="/admin/catalogue" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Catalogue de soins</Link>
        <Link href="/admin/flux" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Flux de contenus</Link>
      </div>
      {children}
    </Shell>
  );
}
