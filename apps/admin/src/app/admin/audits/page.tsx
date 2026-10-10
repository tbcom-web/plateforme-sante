import { headers } from 'next/headers';
import { universCatalogue } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { dateCourte } from '@/lib/libelles';
import { Actualiser, BoutonRelancer, BoutonTraiter, Copier, FormulaireAudit } from './Elements';

export const metadata = { title: 'Super admin · Audits de sites' };

// Audits de sites de prospects (demande de Paul du 2026-10-10) : la commerciale saisit le site d'un praticien ; le
// back-office prépare un site webpodologue non publié à son nom (univers déduit des sujets du site), puis le workflow
// auditer-site audite les deux sites et produit le rapport web + PDF. Lien du rapport : /audit/<jeton> (sans connexion).

type Audit = {
  id: string; jeton: string; domaine: string; statut: 'demande' | 'en_attente' | 'en_cours' | 'pret' | 'echec'; origine?: string;
  contact?: { prenom?: string; nom?: string; email?: string; telephone?: string } | null; express?: { scoreIA?: number; totalIA?: number; aAmeliorer?: number; ville?: string } | null; site_id: string | null; univers: string | null;
  identite: { nomCabinet?: string; ville?: string; prenom?: string; nom?: string; rpps?: string; principaux?: string[] } | null;
  note_actuelle: number | null; note_proposee: number | null; marquants: string[] | null; run_url: string | null; erreur: string | null;
  cree_le: string; fini_le: string | null; site: { slug: string | null } | null;
};

const STATUTS = {
  demande: ['Demande à traiter', 'bg-violet-100 text-violet-900'],
  en_attente: ['En file d’attente', 'bg-neutral-100 text-neutral-700'],
  en_cours: ['En préparation', 'bg-amber-100 text-amber-900'],
  pret: ['Prêt', 'bg-teal-100 text-teal-900'],
  echec: ['Échec', 'bg-red-100 text-red-900'],
} as const;
const couleurNote = (n: number) => (n >= 85 ? 'text-teal-800' : n >= 70 ? 'text-green-700' : n >= 50 ? 'text-amber-700' : 'text-red-700');

export default async function PageAudits() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('audits')
    .select('id, jeton, domaine, statut, origine, contact, express, site_id, univers, identite, note_actuelle, note_proposee, marquants, run_url, erreur, cree_le, fini_le, site:sites(slug)')
    .order('cree_le', { ascending: false }).limit(100);
  const tous = (data ?? []) as unknown as Audit[];
  const demandes = tous.filter((a) => a.statut === 'demande');
  const audits = tous.filter((a) => a.statut !== 'demande');
  const h = await headers();
  const origine = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host') ?? 'admin.webpodologue.fr'}`;
  const enCours = audits.some((a) => a.statut === 'en_attente' || a.statut === 'en_cours');

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">Audits de sites</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Entrez le site d’un praticien : un site webpodologue est préparé à son nom (non publié, style choisi d’après ses soins),
          puis les deux sites passent les mêmes 46 contrôles. Vous obtenez un rapport à envoyer, en lien web et en PDF.
        </p>
      </header>

      {demandes.length > 0 && (
        <section aria-labelledby="titre-demandes" className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <h2 id="titre-demandes" className="font-semibold">Demandes reçues depuis la page « Audit gratuit » ({demandes.length})</h2>
          <p className="mt-1 text-sm text-neutral-600">Le praticien a testé son site et demandé l’audit complet. « Préparer et auditer » crée son site préparé et lance l’audit, signé de votre nom ; rappelez-le ensuite (promis sous 24 h ouvrées).</p>
          <ul className="mt-3 space-y-2">
            {demandes.map((d) => (
              <li key={d.id} className="rounded-xl bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={`https://${d.domaine}`} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{d.domaine}</a>
                  {d.express?.scoreIA != null && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">ChatGPT : {d.express.scoreIA}/{d.express.totalIA}</span>}
                  <span className="ml-auto text-xs text-neutral-500">{dateCourte(d.cree_le)}</span>
                </div>
                <p className="mt-1 text-neutral-700">{[d.contact?.prenom, d.contact?.nom].filter(Boolean).join(' ')} · <a className="underline" href={`tel:${(d.contact?.telephone ?? '').replace(/s/g, '')}`}>{d.contact?.telephone}</a> · <a className="underline" href={`mailto:${d.contact?.email}`}>{d.contact?.email}</a>{d.express?.ville ? ` · ${d.express.ville}` : ''}</p>
                <div className="mt-2"><BoutonTraiter id={d.id} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FormulaireAudit />
      <Actualiser actif={enCours} />

      {error && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Table des audits introuvable : exécutez la migration 0061_audits_sites.sql dans Supabase.</p>}

      <ul className="space-y-3">
        {audits.map((a) => {
          const [libelle, couleur] = STATUTS[a.statut];
          const lien = `${origine}/audit/${a.jeton}`;
          const nomPraticien = [a.identite?.prenom, a.identite?.nom].filter(Boolean).join(' ');
          const apercu = a.site?.slug ? `https://apercu.${a.site.slug}.pages.dev` : null;
          return (
            <li key={a.id} className="rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a href={`https://${a.domaine}`} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{a.domaine}</a>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${couleur}`}>{libelle}</span>
                {a.note_actuelle !== null && (
                  <span className="text-sm">
                    <b className={couleurNote(a.note_actuelle)}>{a.note_actuelle}</b>
                    {a.note_proposee !== null && <> → <b className={couleurNote(a.note_proposee)}>{a.note_proposee}</b></>}<span className="text-neutral-500"> /100</span>
                  </span>
                )}
                <span className="ml-auto text-xs text-neutral-500">{dateCourte(a.cree_le)}</span>
              </div>

              <p className="mt-1 text-sm text-neutral-600">
                {a.origine === 'page' && a.contact ? <>Demande de <b>{[a.contact.prenom, a.contact.nom].filter(Boolean).join(' ')}</b> ({a.contact.telephone}, {a.contact.email}) · </> : null}
                {nomPraticien ? <>Praticien reconnu : <b>{nomPraticien}</b>{a.identite?.rpps ? ` (RPPS ${a.identite.rpps})` : ''}</> : a.site_id ? 'Praticien non reconnu : nom à compléter dans le site préparé' : 'Audit seul'}
                {a.identite?.ville ? ` · ${a.identite.ville}` : ''}
                {a.univers ? ` · Style : ${universCatalogue(a.univers)?.nom ?? a.univers}` : ''}
                {a.identite?.principaux?.length ? ` · Sujets : ${a.identite.principaux.join(', ')}` : ''}
              </p>

              {a.statut === 'pret' && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <a href={lien} target="_blank" rel="noreferrer" className="rounded bg-neutral-900 px-3 py-1 font-semibold text-white">Rapport web</a>
                  <a href={`${lien}/pdf?nom=${encodeURIComponent(a.domaine.replace(/^www\./, ''))}`} target="_blank" rel="noreferrer" className="rounded border border-neutral-900 px-3 py-1 font-semibold">PDF</a>
                  <Copier texte={lien} />
                  {a.marquants?.length ? <span className="text-xs text-neutral-500">{a.marquants.length} point(s) marquant(s)</span> : null}
                </div>
              )}
              {a.site_id && (
                <p className="mt-2 flex flex-wrap gap-3 text-xs">
                  {apercu && <a href={apercu} target="_blank" rel="noreferrer" className="text-teal-800 underline-offset-4 hover:underline">Aperçu du site préparé</a>}
                  <a href={`/mon-site?site=${a.site_id}`} className="text-teal-800 underline-offset-4 hover:underline">Modifier le site préparé</a>
                  <a href={`/admin/sites`} className="text-teal-800 underline-offset-4 hover:underline">Transférer au praticien (Sites)</a>
                </p>
              )}
              {a.erreur && <p className="mt-2 text-xs text-red-700">{a.erreur}</p>}
              {(a.statut === 'echec' || a.erreur) && (
                <p className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <BoutonRelancer id={a.id} />
                  {a.run_url && <a href={a.run_url} target="_blank" rel="noreferrer" className="text-neutral-600 underline">Journal GitHub</a>}
                </p>
              )}
            </li>
          );
        })}
        {!audits.length && !error && <li className="text-sm text-neutral-500">Aucun audit pour l’instant.</li>}
      </ul>
    </div>
  );
}
