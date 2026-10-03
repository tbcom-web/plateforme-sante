import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Super admin · Catalogue' };

type Soin = { id: string; profession_slug: string; slug: string; titre_court: string; resume: string; faq: unknown[] };

export default async function Catalogue() {
  const supabase = await createClient();
  const [{ data: soins }, { data: professions }] = await Promise.all([
    supabase.from('soins_catalogue').select('id, profession_slug, slug, titre_court, resume, faq').order('position').returns<Soin[]>(),
    supabase.from('professions').select('slug, libelle, ordre'),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Catalogue de soins</h1>
      <p className="mt-1 text-sm text-neutral-600">
        La base métier commune à tous les sites. Une modification s’applique à chaque site à sa prochaine publication.
        Utilisez <code className="rounded bg-neutral-100 px-1">{'{ville}'}</code> pour insérer la ville du praticien.
      </p>

      {(professions ?? []).map((p) => (
        <section key={p.slug} className="mt-8">
          <h2 className="font-semibold">{p.libelle} <span className="font-normal text-neutral-500">· {p.ordre}</span></h2>
          <ul className="mt-3 grid gap-2">
            {(soins ?? []).filter((s) => s.profession_slug === p.slug).map((s) => (
              <li key={s.id}>
                <Link href={`/admin/catalogue/${s.id}`} className="flex items-start justify-between gap-4 rounded-xl border border-black/5 bg-white p-4 hover:border-teal-700/40">
                  <span>
                    <span className="block font-semibold">{s.titre_court}</span>
                    <span className="block text-sm text-neutral-600">{s.resume}</span>
                  </span>
                  <span className="shrink-0 text-xs text-neutral-500">{s.faq.length} FAQ · Modifier →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
