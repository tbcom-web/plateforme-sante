import Link from 'next/link';
import { departementSaisi } from '@plateforme/core';
import { casseNom, telephoneLisible } from '@plateforme/core/annuaire-sante';
import { exigerAdmin } from '@/lib/admin';
import { lireCabinets, PAR_PAGE, type FiltresCabinets } from '@/lib/prospection';
import { jour, Onglets } from '../Elements';

export const metadata = { title: 'Super admin · Cabinets' };

// CABINETS (migration 0058, docs/prospection-rpps.md) : une ligne par structure RPPS libérale, triée par le meilleur score de ses
// décideurs (titulaires et associés) : c'est au cabinet qu'on vend un site, et le titulaire qui décide.

const champ = 'min-h-10 rounded-lg border border-neutral-300 px-2';
const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function Cabinets({ searchParams }: PageProps<'/admin/prospection/cabinets'>) {
  await exigerAdmin();
  const sp = await searchParams;
  const page = Number.parseInt(premier(sp.page), 10);
  const taille = premier(sp.taille);
  const f: FiltresCabinets = {
    departement: departementSaisi(premier(sp.dep)),
    q: premier(sp.q).replace(/[^\p{L}\p{N} '-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60),
    taille: taille === 'groupe' || taille === 'seul' ? taille : '',
    mouvement: premier(sp.mouvement) === 'oui',
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
  const r = await lireCabinets(f);
  if (!r) {
    return (
      <div className="grid gap-4">
        <Onglets actif="cabinets" />
        <p className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">La base n’a pas encore reçu la mise à jour <code>0058_prospection_cabinets_actualites.sql</code> (voir docs/prospection-rpps.md).</p>
      </div>
    );
  }
  const pages = Math.max(1, Math.ceil(r.total / PAR_PAGE));
  const lien = (p: number) => {
    const q = new URLSearchParams();
    if (f.departement) q.set('dep', f.departement);
    if (f.q) q.set('q', f.q);
    if (f.taille) q.set('taille', f.taille);
    if (f.mouvement) q.set('mouvement', 'oui');
    if (p > 1) q.set('page', String(p));
    return `/admin/prospection/cabinets?${q}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Onglets actif="cabinets" />
      <div>
        <h1 className="text-2xl font-bold">Cabinets <span className="text-base font-semibold text-neutral-600">· {r.total.toLocaleString('fr-FR')}</span></h1>
        <p className="text-sm text-neutral-600">Cabinets libéraux, du meilleur score de leurs décideurs (titulaires, associés) au plus faible.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm" action="/admin/prospection/cabinets">
        <label className="grid gap-1"><span className="font-medium">Département</span><input name="dep" defaultValue={f.departement} placeholder="33" maxLength={3} className={`${champ} w-20`} /></label>
        <label className="grid gap-1"><span className="font-medium">Recherche</span><input name="q" defaultValue={f.q} placeholder="Cabinet, commune, titulaire" className={champ} /></label>
        <label className="grid gap-1">
          <span className="font-medium">Taille</span>
          <select name="taille" defaultValue={f.taille} className={champ}>
            <option value="">Tous</option>
            <option value="groupe">Plusieurs podologues</option>
            <option value="seul">Un seul podologue</option>
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2"><input type="checkbox" name="mouvement" value="oui" defaultChecked={f.mouvement} /><span>Avec un mouvement connu</span></label>
        <button type="submit" className="min-h-10 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">Filtrer</button>
      </form>

      <ul className="grid gap-3">
        {r.cabinets.map((c) => (
          <li key={c.structure_cle} className="grid gap-1 rounded-2xl border border-black/5 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/admin/prospection/cabinet/${c.structure_cle}`} className="font-semibold text-teal-900 underline">{casseNom(c.nom || 'Cabinet sans nom')}</Link>
              {c.score != null && <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${c.score >= 70 ? 'bg-teal-800 text-white' : c.score >= 40 ? 'bg-teal-100 text-teal-900' : 'bg-neutral-100 text-neutral-700'}`}>Score {c.score}</span>}
            </div>
            <p className="text-neutral-700">{[c.adresse, [c.code_postal, c.commune && casseNom(c.commune)].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</p>
            <p className="text-neutral-700">
              <strong>Décideur{(c.titulaires + c.associes) > 1 ? 's' : ''} :</strong> {c.decideurs || 'non renseigné'}
              {c.telephone && <> · <a className="text-teal-800 underline" href={`tel:${c.telephone.replace(/[^\d+]/g, '')}`}>{telephoneLisible(c.telephone)}</a></>}
            </p>
            <p className="text-xs text-neutral-500">
              {[`${c.presents} podologue${c.presents > 1 ? 's' : ''}`, c.titulaires && `${c.titulaires} titulaire${c.titulaires > 1 ? 's' : ''}`, c.associes && `${c.associes} associé${c.associes > 1 ? 's' : ''}`,
                c.collaborateurs && `${c.collaborateurs} collaborateur${c.collaborateurs > 1 ? 's' : ''}`, c.partis && `${c.partis} parti${c.partis > 1 ? 's' : ''}`, c.secteur,
                c.dernier_mouvement && `dernier mouvement le ${jour(c.dernier_mouvement)}`].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
        {!r.cabinets.length && <li className="rounded-2xl border border-black/5 bg-white p-4 text-center text-sm text-neutral-500">Aucun cabinet pour ces filtres.</li>}
      </ul>

      {pages > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-3 text-sm">
          {f.page > 1 && <Link href={lien(f.page - 1)} className="inline-flex min-h-10 items-center rounded-lg border border-neutral-300 bg-white px-3 hover:bg-teal-50">Précédente</Link>}
          <span>Page {f.page} sur {pages}</span>
          {f.page < pages && <Link href={lien(f.page + 1)} className="inline-flex min-h-10 items-center rounded-lg border border-neutral-300 bg-white px-3 hover:bg-teal-50">Suivante</Link>}
        </nav>
      )}
    </div>
  );
}
