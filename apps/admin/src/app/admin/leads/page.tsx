import Link from 'next/link';
import { libelleStatutCommercial, messageRelanceProspect, STATUTS_COMMERCIAUX, type EtapeEntonnoir } from '@plateforme/core';
import { lireLeads, type Lead } from '@/lib/leads';
import { getProfession } from '@/lib/profession';
import { professionsAdmin } from '@plateforme/core/professions';
import BasculeProfession from '@/components/BasculeProfession';
import { lireEntonnoirs, lireProspects, type Prospect } from '@/lib/prospects';
import { dateCourte } from '@/lib/libelles';
import { jourCourt } from '@/lib/essai';
import { BoutonRelanceProspectFaite, BoutonSupprimerTest, MessageACopier } from './ActionsLead';

export const metadata = { title: 'Super admin · Essais' };

// Back-office commercial : entonnoir de l'essai (7 et 30 jours, leads de test exclus), essais gratuits (leads) et
// relances « à faire aujourd'hui » calculées par les moteurs purs (packages/core/src/essai.ts, prospects.ts). Aucun
// e-mail n'est envoyé : la commerciale relance elle-même.
// Session anonyme (0025) : un lead existe à partir de la porte du rendu (e-mail + accord de recontact) ; avant, les
// sites commencés sans coordonnées sont seulement comptés (entonnoir). Prospects sans compte : ancien parcours (0024).

const FILTRES = {
  actifs: 'En cours',
  a_faire: 'À faire aujourd’hui',
  sans_acces: 'Rendu vu, sans accès',
  prospects: 'Prospects sans compte',
  demandes: 'Mise en ligne demandée',
  fin_proche: 'Fin dans 15 jours',
  tests: 'Tests',
  tous: 'Tous',
} as const;
type Filtre = keyof typeof FILTRES;

const clos = (l: Lead) => Boolean(l.valideLe) || l.statutCommercial === 'perdu' || l.statutCommercial === 'gagne';
const contient = (champs: string[], q: string) => !q || champs.join(' ').toLowerCase().includes(q);

function filtrer(leads: Lead[], filtre: Filtre, statut: string, q: string): Lead[] {
  const recherche = q.toLowerCase();
  return leads.filter((l) => {
    if (filtre === 'prospects') return false;
    // Site anonyme sans coordonnées : compté seulement, jamais listé (aucun contact possible).
    if (!l.acces && !l.renduDemandeLe) return false;
    if (filtre === 'sans_acces' && l.acces) return false;
    if (filtre === 'tests' && !l.test) return false;
    if (filtre === 'actifs' && (clos(l) || l.suspenduLe)) return false;
    if (filtre === 'a_faire' && !l.aFaire.length && !(l.miseEnLigneDemandeeLe && !l.valideLe)) return false;
    if (filtre === 'demandes' && !(l.miseEnLigneDemandeeLe && !l.valideLe)) return false;
    if (filtre === 'fin_proche' && (clos(l) || l.joursRestants > 15 || l.suspenduLe)) return false;
    if (statut && l.statutCommercial !== statut) return false;
    return contient([l.prenom, l.nom, l.ville, l.email, l.telephone, l.site?.nomCabinet ?? ''], recherche);
  });
}

/** Prospects SANS compte (ceux qui ont un compte apparaissent dans la liste des essais). */
function filtrerProspects(prospects: Prospect[], filtre: Filtre, q: string): Prospect[] {
  const recherche = q.toLowerCase();
  if (!['prospects', 'a_faire', 'tests', 'tous'].includes(filtre)) return [];
  return prospects.filter((p) => {
    if (p.owner || p.compteCreeLe) return false;
    if (filtre === 'tests' && !p.test) return false;
    if (filtre === 'a_faire' && !p.aFaire) return false;
    return contient([p.prenom, p.nom, p.ville, p.email, p.telephone], recherche);
  });
}

const pastille: Record<string, string> = {
  nouveau: 'bg-sky-100 text-sky-900', contacte: 'bg-amber-100 text-amber-900', rendez_vous: 'bg-violet-100 text-violet-900', gagne: 'bg-teal-100 text-teal-900', perdu: 'bg-neutral-200 text-neutral-700',
};
const etatCouleur: Record<string, string> = {
  site_commence: 'bg-neutral-100 text-neutral-700', rendu: 'bg-amber-100 text-amber-900', acces: 'bg-sky-100 text-sky-900', apercu: 'bg-violet-100 text-violet-900',
  demande: 'bg-orange-100 text-orange-900', publie: 'bg-teal-100 text-teal-900',
};
const BadgeTest = () => <span className="ml-1 rounded bg-fuchsia-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wide text-fuchsia-900">Test</span>;
const provenance = (source: string, utm: Record<string, string>) => [source, ...Object.entries(utm).filter(([k]) => k !== 'utm_source').map(([k, v]) => `${k.replace('utm_', '')}=${v}`)].filter(Boolean).join(' · ') || '—';

function Entonnoir({ j7, j30, mesureActive }: { j7: EtapeEntonnoir[]; j30: EtapeEntonnoir[]; mesureActive: boolean }) {
  const taux = (e: EtapeEntonnoir) => (e.taux === null ? '' : ` (${e.taux} %)`);
  return (
    <section aria-labelledby="titre-entonnoir" className="rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titre-entonnoir" className="font-semibold">Entonnoir de l’essai</h2>
        <p className="text-xs text-neutral-500">Leads de test exclus · entre parenthèses : part de l’étape précédente</p>
      </div>
      {!mesureActive && <p className="mt-2 text-sm text-amber-800">Visites et coordonnées laissées : disponibles après la mise à jour <code>0024_prospects_entonnoir.sql</code>.</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr><th className="py-1.5 pr-3">Étape</th><th className="py-1.5 pr-3 text-right">7 jours</th><th className="py-1.5 text-right">30 jours</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {j30.map((e, i) => (
              <tr key={e.id}>
                <td className="py-1.5 pr-3">{e.libelle}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums"><strong>{j7[i].nombre}</strong><span className="text-neutral-500">{taux(j7[i])}</span></td>
                <td className="py-1.5 text-right tabular-nums"><strong>{e.nombre}</strong><span className="text-neutral-500">{taux(e)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableProspects({ prospects }: { prospects: Prospect[] }) {
  return (
    <section aria-labelledby="titre-prospects" className="grid gap-3">
      <h2 id="titre-prospects" className="font-semibold">Prospects sans compte ({prospects.length})</h2>
      <p className="text-sm text-neutral-600">Coordonnées laissées sur la page d’essai, compte pas encore créé. Accord pour être recontacté donné. Relance proposée le lendemain et 3 jours après.</p>
      <ul className="grid gap-3">
        {prospects.map((p) => {
          const r = p.aFaire ?? p.relances.find((x) => !x.faite) ?? null;
          const m = r ? messageRelanceProspect(r.code, { prenom: p.prenom, lienReprise: p.lienReprise }) : null;
          return (
            <li key={p.id} className={`grid gap-2 rounded-2xl border bg-white p-4 text-sm ${p.aFaire ? 'border-amber-300' : 'border-black/5'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{`${p.prenom} ${p.nom}`.trim() || '—'}{p.test && <BadgeTest />} <span className="font-normal text-neutral-600">· {p.ville || '—'}</span></p>
                  <p className="break-all text-neutral-700"><a className="text-teal-800 underline" href={`mailto:${p.email}`}>{p.email}</a>{p.telephone && <> · <a className="text-teal-800 underline" href={`tel:${p.telephone.replace(/\s/g, '')}`}>{p.telephone}</a></>}</p>
                </div>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">Prospect (sans compte)</span>
              </div>
              <dl className="grid gap-x-4 gap-y-1 text-neutral-700 sm:grid-cols-4">
                <div><dt className="text-xs text-neutral-500">Date</dt><dd>{dateCourte(p.creeLe)}{p.joursSansCompte ? ` · depuis ${p.joursSansCompte} j` : ' · aujourd’hui'}</dd></div>
                <div><dt className="text-xs text-neutral-500">Étape atteinte</dt><dd>{p.etapeLibelle}</dd></div>
                <div><dt className="text-xs text-neutral-500">Provenance</dt><dd className="break-words">{provenance(p.source, p.utm)}</dd></div>
                <div><dt className="text-xs text-neutral-500">Visites · conseils</dt><dd>{p.visites} · {p.conseils ? 'accepte les conseils' : 'pas de conseils'}</dd></div>
              </dl>
              {r && (
                <div className={`grid gap-1 rounded-lg p-3 ${r.aFaire ? 'bg-amber-50' : 'bg-neutral-50'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><strong>{jourCourt(r.date)}</strong> · {r.libelle}{r.aFaire ? ' · à faire' : ''}</span>
                    {r.aFaire && <BoutonRelanceProspectFaite id={p.id} code={r.code} />}
                  </div>
                  <p className="break-all text-xs text-neutral-600">Lien de reprise : <a className="text-teal-800 underline" href={p.lienReprise} target="_blank" rel="noopener">{p.lienReprise}</a></p>
                  {m && <MessageACopier objet={m.objet} corps={m.corps} />}
                </div>
              )}
              {p.test && <div><BoutonSupprimerTest email={p.email} /></div>}
            </li>
          );
        })}
        {!prospects.length && <li className="rounded-2xl border border-black/5 bg-white p-4 text-center text-sm text-neutral-500">Aucun prospect sans compte pour ce filtre.</li>}
      </ul>
    </section>
  );
}

export default async function Leads({ searchParams }: PageProps<'/admin/leads'>) {
  const p = await searchParams;
  const filtre: Filtre = typeof p.filtre === 'string' && p.filtre in FILTRES ? (p.filtre as Filtre) : 'actifs';
  const statut = typeof p.statut === 'string' && STATUTS_COMMERCIAUX.some((s) => s.id === p.statut) ? p.statut : '';
  const q = typeof p.q === 'string' ? p.q.slice(0, 80) : '';
  // Profession choisie dans l'en-tête : le commercial bascule d'une profession à l'autre (essais et prospects de ce métier seulement)
  const [tousLeads, tousProspects, profession] = await Promise.all([lireLeads(), lireProspects(), getProfession()]);
  const leads = tousLeads && tousLeads.filter((l) => l.profession === profession.id);
  const prospects = tousProspects && tousProspects.filter((x) => x.profession === profession.id);

  if (!leads) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
        <h1 className="text-xl font-bold">Essais</h1>
        <p className="mt-2">La base n’a pas encore reçu la mise à jour <code>0023_essais_leads.sql</code> (voir docs/onboarding-lead.md).</p>
      </div>
    );
  }

  const entonnoirs = await lireEntonnoirs(leads, prospects);
  // Sites commencés en session anonyme sans coordonnées : comptés seulement (nettoyage : nettoyer_anonymes, voir la doc).
  const anonymesSansContact = leads.filter((l) => !l.acces && !l.renduDemandeLe).length;
  const listes = leads.filter((l) => l.acces || l.renduDemandeLe);
  const sansCompte = (prospects ?? []).filter((x) => !x.owner && !x.compteCreeLe);
  const prospectsAFaire = sansCompte.filter((x) => x.aFaire);
  const aFaire = listes.filter((l) => l.aFaire.length || (l.miseEnLigneDemandeeLe && !l.valideLe && !l.suspenduLe));
  const liste = filtrer(leads, filtre, statut, q);
  const listeProspects = filtrerProspects(prospects ?? [], filtre, q);
  const lien = (f: Filtre) => `/admin/leads?${new URLSearchParams({ filtre: f, ...(statut ? { statut } : {}), ...(q ? { q } : {}) })}`;
  const nbTests = listes.filter((l) => l.test).length + sansCompte.filter((x) => x.test).length;

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Essais gratuits <span className="text-base font-semibold text-neutral-600">· {profession.pluriel}</span></h1>
          <p className="text-sm text-neutral-600">
            {listes.length} lead{listes.length > 1 ? 's' : ''} · {anonymesSansContact} site{anonymesSansContact > 1 ? 's' : ''} commencé{anonymesSansContact > 1 ? 's' : ''} sans coordonnées (comptés seulement) · {sansCompte.length} prospect{sansCompte.length > 1 ? 's' : ''} sans compte{nbTests ? ` · dont ${nbTests} de test` : ''} · version d’essai en aperçu privé, mise en ligne publique après validation.
          </p>
        </div>
        <a href="/essai" target="_blank" rel="noopener" className="text-sm font-semibold text-teal-800 underline">Page d’essai ↗</a>
      </div>
      <BasculeProfession courante={profession.id} professions={professionsAdmin().map((x) => ({ id: x.id, libelle: x.libelle }))} />

      <Entonnoir {...entonnoirs} />

      <section aria-labelledby="titre-a-faire" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <h2 id="titre-a-faire" className="font-semibold">À faire aujourd’hui ({aFaire.length + prospectsAFaire.length})</h2>
        {aFaire.length || prospectsAFaire.length ? (
          <ul className="mt-3 grid gap-2 text-sm">
            {prospectsAFaire.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={lien('prospects')} className="font-semibold text-teal-900 underline">{`${x.prenom} ${x.nom}`.trim() || x.email}</Link>
                {x.test && <BadgeTest />}
                <span className="text-neutral-700">{x.aFaire?.libelle}{x.telephone ? ` · ${x.telephone}` : ''}</span>
              </li>
            ))}
            {aFaire.map((l) => (
              <li key={l.owner} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={`/admin/leads/${l.owner}`} className="font-semibold text-teal-900 underline">{`${l.prenom} ${l.nom}`.trim() || l.email}</Link>
                {l.test && <BadgeTest />}
                <span className="text-neutral-700">
                  {[
                    l.miseEnLigneDemandeeLe && !l.valideLe ? 'Mise en ligne demandée : vérifier puis valider' : null,
                    ...l.aFaire.map((r) => (r.action === 'suspendre' ? `${r.libelle}` : `${r.libelle} (prévue le ${jourCourt(r.date)})`)),
                  ].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">Rien à faire aujourd’hui.</p>
        )}
      </section>

      <form className="flex flex-wrap items-end gap-3 text-sm" action="/admin/leads">
        <input type="hidden" name="filtre" value={filtre} />
        <label className="grid gap-1">
          <span className="font-medium">Recherche</span>
          <input name="q" defaultValue={q} placeholder="Nom, ville, e-mail, téléphone" className="min-h-10 rounded-lg border border-neutral-300 px-2" />
        </label>
        <label className="grid gap-1">
          <span className="font-medium">Statut commercial</span>
          <select name="statut" defaultValue={statut} className="min-h-10 rounded-lg border border-neutral-300 px-2">
            <option value="">Tous</option>
            {STATUTS_COMMERCIAUX.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-10 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">Filtrer</button>
      </form>

      <nav aria-label="Filtres" className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(FILTRES) as Filtre[]).map((f) => (
          <Link key={f} href={lien(f)} aria-current={f === filtre ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 ring-1 ring-black/10 ${f === filtre ? 'bg-teal-800 text-white' : 'bg-white hover:bg-neutral-50'}`}>
            {FILTRES[f]}{f === 'prospects' ? ` (${sansCompte.length})` : f === 'sans_acces' ? ` (${listes.filter((l) => !l.acces).length})` : ''}
          </Link>
        ))}
      </nav>

      {prospects && ['prospects', 'a_faire', 'tests', 'tous'].includes(filtre) && <TableProspects prospects={listeProspects} />}

      {filtre !== 'prospects' && (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Début</th>
                <th className="px-3 py-2">Praticien</th>
                <th className="px-3 py-2">Ville</th>
                <th className="px-3 py-2">État</th>
                <th className="px-3 py-2">Parcours</th>
                <th className="px-3 py-2">Version d’essai</th>
                <th className="px-3 py-2">Jours restants</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Prochaine relance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {liste.map((l) => (
                <tr key={l.owner} className="align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{dateCourte(l.creeLe)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/leads/${l.owner}`} className="font-semibold text-teal-900 underline">{`${l.prenom} ${l.nom}`.trim() || '—'}</Link>
                    {l.test && <BadgeTest />}
                    <div className="text-xs text-neutral-500">{l.email}{l.telephone ? ` · ${l.telephone}` : ''}</div>
                    {!l.acces && <div className="text-xs text-amber-800">Sans accès : brouillon lié à son navigateur</div>}
                  </td>
                  <td className="px-3 py-2">{l.ville || '—'}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${etatCouleur[l.etat.id] ?? ''}`}>{l.etat.libelle}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true"><div className="h-full bg-teal-700" style={{ width: `${l.progression}%` }} /></div>
                      <span>{l.progression} %</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {l.suspenduLe ? <span className="text-neutral-500">Suspendue</span> : l.lienApercu ? <a href={l.lienApercu} target="_blank" rel="noopener" className="text-teal-800 underline">Voir ↗</a> : '—'}
                    {l.valideLe && <div className="text-xs text-teal-800">Validé le {dateCourte(l.valideLe)}</div>}
                    {l.miseEnLigneDemandeeLe && !l.valideLe && <div className="text-xs font-semibold text-amber-800">Mise en ligne demandée</div>}
                  </td>
                  <td className="px-3 py-2">{l.paiementStatut === 'paye' ? 'Payé' : l.valideLe || !l.acces ? '—' : l.joursRestants}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pastille[l.statutCommercial] ?? ''}`}>{libelleStatutCommercial(l.statutCommercial)}</span></td>
                  <td className="px-3 py-2">
                    {l.prochaine ? (
                      <span className={l.prochaine.aFaire ? 'font-semibold text-amber-800' : ''}>{jourCourt(l.prochaine.date)}<span className="block text-xs font-normal text-neutral-500">{l.prochaine.libelle}</span></span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {!liste.length && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-neutral-500">Aucun essai pour ce filtre.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
