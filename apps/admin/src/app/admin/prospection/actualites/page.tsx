import Link from 'next/link';
import { departementSaisi, libelleEvenement, TYPES_EVENEMENTS } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { lireActualites } from '@/lib/prospection';
import { couleurEvenement, jour, Onglets, phraseEvenement } from '../Elements';

export const metadata = { title: 'Super admin · Actualités des cabinets' };

// ACTUALITÉS (migration 0058, docs/prospection-rpps.md) : mouvements constatés chaque nuit entre deux extractions du RPPS
// (nouveaux cabinets, arrivées de collaborateurs, départs, reprises, déménagements), du plus récent au plus ancien.

const champ = 'min-h-10 rounded-lg border border-neutral-300 px-2';
const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function Actualites({ searchParams }: PageProps<'/admin/prospection/actualites'>) {
  await exigerAdmin();
  const sp = await searchParams;
  const type = TYPES_EVENEMENTS.some((t) => t.id === premier(sp.type)) ? premier(sp.type) : '';
  const page = Math.max(1, Math.min(1000, Number.parseInt(premier(sp.page), 10) || 1));
  const f = { departement: departementSaisi(premier(sp.dep)), type, page };
  const r = await lireActualites(f);
  if (!r) {
    return (
      <div className="grid gap-4">
        <Onglets actif="actualites" />
        <p className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">La base n’a pas encore reçu la mise à jour <code>0058_prospection_cabinets_actualites.sql</code> (voir docs/prospection-rpps.md).</p>
      </div>
    );
  }
  const jours = [...new Set(r.evenements.map((e) => e.le))];
  const lien = (p: number) => `/admin/prospection/actualites?${new URLSearchParams({ ...(f.departement ? { dep: f.departement } : {}), ...(type ? { type } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="grid grid-cols-1 gap-6">
      <Onglets actif="actualites" />
      <div>
        <h1 className="text-2xl font-bold">Actualités des cabinets</h1>
        <p className="text-sm text-neutral-600">Mouvements constatés d’une nuit à l’autre dans le RPPS, depuis le premier import du 09/10/2026. {r.total.toLocaleString('fr-FR')} événement{r.total > 1 ? 's' : ''}.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm" action="/admin/prospection/actualites">
        <label className="grid gap-1"><span className="font-medium">Département</span><input name="dep" defaultValue={f.departement} placeholder="33" maxLength={3} className={`${champ} w-20`} /></label>
        <label className="grid gap-1">
          <span className="font-medium">Type</span>
          <select name="type" defaultValue={type} className={champ}>
            <option value="">Tous</option>
            {TYPES_EVENEMENTS.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-10 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">Filtrer</button>
      </form>

      {jours.map((j) => (
        <section key={j} className="grid gap-2">
          <h2 className="font-semibold">{jour(j)}</h2>
          <ul className="grid gap-2 rounded-2xl border border-black/5 bg-white p-4 text-sm">
            {r.evenements.filter((e) => e.le === j).map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${couleurEvenement[e.type] ?? ''}`}>{libelleEvenement(e.type)}</span>
                <span>{phraseEvenement(e)}</span>
                <span className="flex gap-2 text-xs">
                  <Link href={`/admin/prospection/praticien/${e.rpps}`} className="text-teal-800 underline">praticien</Link>
                  {e.structure_cle && <Link href={`/admin/prospection/cabinet/${e.structure_cle}`} className="text-teal-800 underline">cabinet</Link>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!r.evenements.length && <p className="rounded-2xl border border-black/5 bg-white p-4 text-center text-sm text-neutral-500">Aucun mouvement pour l’instant : les actualités apparaissent à partir de la deuxième synchronisation après la mise à jour 0058.</p>}

      {r.total > 100 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={lien(page - 1)} className="inline-flex min-h-10 items-center rounded-lg border border-neutral-300 bg-white px-3">Plus récents</Link>}
          {page * 100 < r.total && <Link href={lien(page + 1)} className="inline-flex min-h-10 items-center rounded-lg border border-neutral-300 bg-white px-3">Plus anciens</Link>}
        </nav>
      )}
    </div>
  );
}
