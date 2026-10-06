import Link from 'next/link';
import { normaliserDraft } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { manques } from '@/lib/sites';
import { dateCourte, etatPublication, STATUTS, type Etat, type Statut } from '@/lib/libelles';
import ActualisationAuto from '@/components/ActualisationAuto';
import ActionsSite from './ActionsSite';
import NouveauSite from './NouveauSite';

export const metadata = { title: 'Super admin · Sites' };

const PAR_PAGE = 25;

type Ligne = {
  id: string;
  slug: string | null;
  statut: Statut;
  test: boolean;
  options: { edition?: boolean; photosPremium?: boolean } | null;
  domaine: string | null;
  published_at: string | null;
  updated_at: string;
  config: unknown;
  modifs_non_publiees: boolean;
  publiee_le: string | null;
  publication_etat: Etat | null;
  publication_run_url: string | null;
  publication_debut: string | null;
  publication_fin: string | null;
  publication_erreur: string | null;
  profiles: { email: string } | null;
};

const TRIS = {
  modif: { libelle: 'Dernière modification', colonne: 'updated_at', croissant: false },
  publication: { libelle: 'Dernière publication', colonne: 'published_at', croissant: false },
  creation: { libelle: 'Création', colonne: 'created_at', croissant: false },
  nom: { libelle: 'Nom du cabinet', colonne: 'config->cabinet->>nom', croissant: true },
} as const;

/** Recherche : lettres, chiffres, espaces, apostrophes et tirets (les autres caractères ont un sens pour l'API). */
const nettoyerRecherche = (v: unknown) => (typeof v === 'string' ? v.replace(/[^\p{L}\p{N} '-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) : '');
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function AdminSites({ searchParams }: PageProps<'/admin'>) {
  const p = await searchParams;
  const q = nettoyerRecherche(un(p.q));
  const statut = (['brouillon', 'en_ligne', 'suspendu'] as const).find((s) => s === un(p.statut)) ?? '';
  const test = un(p.test) === '1' ? '1' : un(p.test) === '0' ? '0' : '';
  const edition = un(p.edition) === '1';
  const echec = un(p.echec) === '1';
  const modifs = un(p.modifs) === '1';
  const triCle = (Object.keys(TRIS) as (keyof typeof TRIS)[]).find((k) => k === un(p.tri)) ?? 'modif';
  const page = Math.max(1, Math.min(10_000, Number.parseInt(un(p.page), 10) || 1));
  const tri = TRIS[triCle];

  const supabase = await createClient();
  let requete = supabase
    .from('sites')
    .select(
      'id, slug, statut, test, options, domaine, published_at, updated_at, config, modifs_non_publiees, publiee_le, publication_etat, publication_run_url, publication_debut, publication_fin, publication_erreur, profiles(email)',
      { count: 'exact' },
    );
  if (q) {
    const motif = `*${q}*`;
    requete = requete.or(
      ['slug', 'config->cabinet->>nom', 'config->cabinet->>ville', 'config->praticiens->0->>nom', 'config->lieux->0->>ville'].map((c) => `${c}.ilike.${motif}`).join(','),
    );
  }
  if (statut) requete = requete.eq('statut', statut);
  if (test) requete = requete.eq('test', test === '1');
  if (edition) requete = requete.eq('options->>edition', 'true');
  if (echec) requete = requete.eq('publication_etat', 'echec');
  if (modifs) requete = requete.eq('modifs_non_publiees', true).not('publiee_le', 'is', null);
  const debut = (page - 1) * PAR_PAGE;
  const { data, error, count } = await requete
    .order(tri.colonne, { ascending: tri.croissant, nullsFirst: false })
    .order('id')
    .range(debut, debut + PAR_PAGE - 1)
    .returns<Ligne[]>();
  const sites = data ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  // Compteurs (requêtes de comptage seulement, sans charger les sites).
  const compter = async (filtre: (r: ReturnType<typeof base>) => ReturnType<typeof base>) => (await filtre(base())).count ?? 0;
  const base = () => supabase.from('sites').select('id', { count: 'exact', head: true });
  const [nbTotal, nbEnLigne, nbBrouillons, nbTests, nbEchecs, nbModifs] = await Promise.all([
    compter((r) => r),
    compter((r) => r.eq('statut', 'en_ligne').eq('test', false)),
    compter((r) => r.eq('statut', 'brouillon').eq('test', false)),
    compter((r) => r.eq('test', true)),
    compter((r) => r.eq('publication_etat', 'echec')),
    compter((r) => r.eq('modifs_non_publiees', true).not('publiee_le', 'is', null)),
  ]);

  // Liens de rattachement en attente pour les sites de la page.
  const { data: attentes } = sites.length
    ? await supabase.from('rattachements').select('site_id, email, expire_le').in('site_id', sites.map((s) => s.id)).is('utilise_le', null).gt('expire_le', new Date().toISOString())
    : { data: [] };
  const attente = new Map((attentes ?? []).map((a) => [a.site_id as string, a as { email: string; expire_le: string }]));

  const parametres = { q, statut, test, edition: edition ? '1' : '', echec: echec ? '1' : '', modifs: modifs ? '1' : '', tri: triCle === 'modif' ? '' : triCle };
  const lien = (changements: Record<string, string>) => {
    const u = new URLSearchParams(Object.entries({ ...parametres, ...changements }).filter(([, v]) => v) as [string, string][]);
    return `/admin${u.size ? `?${u}` : ''}`;
  };
  const enCours = sites.some((s) => etatPublication(s.publication_etat, s.publication_debut)?.cle === 'en_cours');

  return (
    <div>
      <ActualisationAuto actif={enCours} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sites des praticiens</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Changement de charte, de dessins ou d’animations à appliquer à tous les sites : <Link href="/admin/maintenance" className="text-teal-800 underline underline-offset-2">Maintenance</Link>.
          </p>
        </div>
        <NouveauSite />
      </div>
      {error && <p className="mt-2 text-sm text-red-700">Lecture impossible : {/column|colonne/i.test(error.message) ? 'installez la mise à jour de la base de données (fichier 0017_production.sql).' : error.message}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-6">
        {(
          [
            ['Sites', nbTotal, lien({ statut: '', test: '', edition: '', echec: '', modifs: '', q: '' })],
            ['En ligne (réels)', nbEnLigne, lien({ statut: 'en_ligne', test: '0' })],
            ['Pas encore en ligne', nbBrouillons, lien({ statut: 'brouillon', test: '0' })],
            ['Sites de test', nbTests, lien({ test: '1' })],
            ['Publication échouée', nbEchecs, lien({ echec: '1' })],
            ['Modifications non publiées', nbModifs, lien({ modifs: '1' })],
          ] as const
        ).map(([label, valeur, href]) => (
          <Link key={label} href={href} className="rounded-xl border border-black/5 bg-white p-4 hover:border-teal-700/40">
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className={`text-2xl font-bold ${label === 'Publication échouée' && valeur > 0 ? 'text-red-700' : ''}`}>{valeur}</dd>
          </Link>
        ))}
      </dl>

      <form method="get" action="/admin" className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-white p-4 text-sm">
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Recherche (cabinet, praticien, ville, adresse du site)</span>
          <input name="q" defaultValue={q} placeholder="ex. Toulon" className="h-9 w-64 rounded-md border border-neutral-300 px-2" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Statut</span>
          <select name="statut" defaultValue={statut} className="h-9 rounded-md border border-neutral-300 px-2">
            <option value="">Tous</option>
            {(Object.keys(STATUTS) as Statut[]).map((s) => <option key={s} value={s}>{STATUTS[s].label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Type</span>
          <select name="test" defaultValue={test} className="h-9 rounded-md border border-neutral-300 px-2">
            <option value="">Réels et tests</option>
            <option value="0">Réels</option>
            <option value="1">Tests</option>
          </select>
        </label>
        <label className="flex h-9 items-center gap-1.5"><input type="checkbox" name="edition" value="1" defaultChecked={edition} className="accent-amber-600" /> Option « Édition »</label>
        <label className="flex h-9 items-center gap-1.5"><input type="checkbox" name="echec" value="1" defaultChecked={echec} className="accent-red-700" /> Publication échouée</label>
        <label className="flex h-9 items-center gap-1.5"><input type="checkbox" name="modifs" value="1" defaultChecked={modifs} className="accent-teal-800" /> Modifications non publiées</label>
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Trier par</span>
          <select name="tri" defaultValue={triCle} className="h-9 rounded-md border border-neutral-300 px-2">
            {(Object.keys(TRIS) as (keyof typeof TRIS)[]).map((k) => <option key={k} value={k}>{TRIS[k].libelle}</option>)}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">Filtrer</button>
        <Link href="/admin" className="h-9 px-2 leading-9 text-neutral-600 underline-offset-4 hover:underline">Réinitialiser</Link>
      </form>

      <p className="mt-4 text-sm text-neutral-600">
        {total} site(s){total > PAR_PAGE ? ` · page ${page} sur ${pages}` : ''}
      </p>

      <div className="mt-2 overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Cabinet</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Adresse du site</th>
              <th className="px-4 py-3">Complétude</th>
              <th className="px-4 py-3">Publication</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sites.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">{q || statut || test || edition || echec || modifs ? 'Aucun site ne correspond.' : 'Aucun site pour le moment.'}</td></tr>
            )}
            {sites.map((s) => {
              const d = normaliserDraft(s.config);
              const pr = d.praticiens[0];
              const nomPraticien = [pr?.prenom, pr?.nom].filter(Boolean).join(' ');
              const reste = manques(s.config);
              const etat = etatPublication(s.publication_etat, s.publication_debut);
              const enAttente = attente.get(s.id);
              return (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{d.cabinet.nom || nomPraticien || '(sans nom)'}</p>
                    <p className="text-neutral-500">
                      {[d.cabinet.nom && nomPraticien, d.cabinet.ville || d.lieux[0]?.ville || '—', d.pays, `${d.praticiens.length} prat.`].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-neutral-500">{s.profiles?.email}</p>
                    {enAttente && (
                      <p className="mt-1 text-xs text-amber-800">En attente de rattachement : {enAttente.email} (jusqu’au {dateCourte(enAttente.expire_le)})</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUTS[s.statut].classe}`}>{STATUTS[s.statut].label}</span>
                    {s.test && <span className="ml-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-900">test</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.domaine ? (
                      <a href={`https://${s.domaine}`} target="_blank" rel="noopener" className="text-teal-800 underline underline-offset-2">{s.domaine}</a>
                    ) : (
                      <span className="text-neutral-400">jamais publié</span>
                    )}
                    {(!s.domaine || s.domaine.endsWith('.pages.dev')) && (
                      <a href="https://github.com/tbcom-web/plateforme-sante/blob/main/docs/procedure-domaine-praticien.md" target="_blank" rel="noopener" className="mt-1 block text-xs text-neutral-500 underline underline-offset-2 hover:text-teal-800">Brancher son nom de domaine ↗</a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {reste.length === 0 ? <span className="text-teal-800">Complet</span> : (
                      <span className="text-amber-800" title={reste.join(', ')}>{reste.length} manque(s)</span>
                    )}
                    <span className="mt-1 flex gap-3 text-xs font-semibold">
                      <a href={`/creer?site=${s.id}`} className="text-teal-800 underline-offset-4 hover:underline">Parcours</a>
                      <a href={`/mon-site?site=${s.id}`} className="text-teal-800 underline-offset-4 hover:underline">Formulaire</a>
                      <a href={`/edition/${s.id}`} className="text-teal-800 underline-offset-4 hover:underline">Édition visuelle</a>
                      <a href={`/admin/sites/${s.id}`} className="text-teal-800 underline-offset-4 hover:underline">Photos{s.options?.photosPremium ? ' (premium)' : ''}</a>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    <p>{s.published_at ? `En ligne depuis le ${dateCourte(s.published_at)}` : '—'}</p>
                    {etat && (
                      <p className="mt-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${etat.classe}`}>{etat.label}</span>
                        {s.publication_run_url && (
                          <a href={s.publication_run_url} target="_blank" rel="noopener" className="ml-2 text-xs text-teal-800 underline underline-offset-2">journal</a>
                        )}
                      </p>
                    )}
                    {etat?.cle !== 'ok' && s.publication_debut && <p className="text-xs">demandée le {dateCourte(s.publication_debut)}</p>}
                    {s.publication_etat === 'echec' && s.publication_erreur && <p className="mt-1 max-w-xs text-xs text-red-800">{s.publication_erreur}</p>}
                    {s.modifs_non_publiees && s.publiee_le && <p className="mt-1 text-xs font-semibold text-amber-800">Modifications non publiées</p>}
                  </td>
                  <td className="px-4 py-3">
                    <ActionsSite
                      id={s.id}
                      statut={s.statut}
                      test={s.test}
                      edition={Boolean(s.options?.edition)}
                      manques={reste}
                      dejaPublie={Boolean(s.publiee_le || s.published_at)}
                      relancer={etat?.cle === 'echec' || etat?.cle === 'interrompue'}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && <Link href={lien({ page: String(page - 1) })} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">← Précédente</Link>}
          <span className="text-neutral-600">Page {page} sur {pages}</span>
          {page < pages && <Link href={lien({ page: String(page + 1) })} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">Suivante →</Link>}
        </nav>
      )}
    </div>
  );
}
