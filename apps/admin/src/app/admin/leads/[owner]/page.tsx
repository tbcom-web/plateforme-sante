import Link from 'next/link';
import { notFound } from 'next/navigation';
import { libelleStatutCommercial, messageRelance } from '@plateforme/core';
import { lireLead, lireNotes } from '@/lib/leads';
import { dateCourte } from '@/lib/libelles';
import { dateLongue, jourCourt } from '@/lib/essai';
import { envoiActive } from '@/lib/courriels';
import SuiviPublication from '@/components/SuiviPublication';
import { ActionsEssai, BoutonRelanceFaite, FormNote, FormSuivi, MessageACopier } from '../ActionsLead';

export const metadata = { title: 'Super admin · Fiche essai' };

export default async function FicheLead({ params }: PageProps<'/admin/leads/[owner]'>) {
  const { owner } = await params;
  const l = await lireLead(owner);
  if (!l) notFound();
  const notes = await lireNotes(owner);
  const nom = `${l.prenom} ${l.nom}`.trim() || l.email;
  const carte = 'grid content-start gap-3 rounded-2xl border border-black/5 bg-white p-5';
  const enCours = l.site?.publicationEtat === 'en_cours';

  const infos: [string, React.ReactNode][] = [
    ['E-mail', <a key="m" className="text-teal-800 underline" href={`mailto:${l.email}`}>{l.email}</a>],
    ['Ville', l.ville || '—'],
    ['Cabinet', l.site?.nomCabinet || '—'],
    ['Inscription', dateCourte(l.debut)],
    ['Fin d’essai', `${dateLongue(l.fin)}${l.valideLe || l.paiementStatut === 'paye' ? '' : ` (${l.joursRestants} j)`}`],
    ['Parcours', `${l.progression} %`],
    ['Provenance', [l.source, ...Object.entries(l.utm).map(([k, v]) => `${k}=${v}`)].filter(Boolean).join(' · ') || '—'],
    ['CGU', `version ${l.cguVersion}, acceptées le ${dateCourte(l.cguAccepteesLe)}`],
    ['Conseils par e-mail', l.conseils ? 'Accepté' : 'Non'],
    ['Paiement', l.paiementStatut === 'paye' ? 'Abonnement réglé' : l.paiementStatut === 'impaye' ? 'Impayé' : l.paiementStatut === 'annule' ? 'Abonnement annulé' : 'Aucun'],
    ['Validation', l.valideLe ? `Validé le ${dateCourte(l.valideLe)}` : l.miseEnLigneDemandeeLe ? `Mise en ligne demandée le ${dateCourte(l.miseEnLigneDemandeeLe)}` : 'Non demandée'],
    ['Statut commercial', libelleStatutCommercial(l.statutCommercial)],
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/leads" className="text-sm text-teal-800 underline">← Essais</Link>
          <h1 className="mt-1 text-2xl font-bold">{nom}</h1>
          {l.suspenduLe && <p className="text-sm font-semibold text-red-800">Version d’essai suspendue le {dateCourte(l.suspenduLe)}</p>}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {l.lienApercu && !l.suspenduLe && <a href={l.lienApercu} target="_blank" rel="noopener" className="font-semibold text-teal-800 underline">Version d’essai ↗</a>}
          {l.site && <Link href={`/admin/sites/${l.site.id}`} className="font-semibold text-teal-800 underline">Fiche du site</Link>}
          {l.site && <Link href={`/creer?site=${l.site.id}`} className="font-semibold text-teal-800 underline">Ouvrir dans le parcours</Link>}
        </div>
      </div>

      <section className={carte} aria-labelledby="titre-actions">
        <h2 id="titre-actions" className="font-semibold">Actions</h2>
        <p className="text-sm text-neutral-600">Avant « Valider et mettre en ligne » : vérifier l’inscription au tableau de l’Ordre (annuaire de l’Ordre ou RPPS) et les informations du cabinet avec le praticien. La mise en ligne publie le site en production par le flux habituel.</p>
        <ActionsEssai owner={l.owner} suspendu={Boolean(l.suspenduLe)} valide={Boolean(l.valideLe)} aSite={Boolean(l.site)} />
        {enCours && l.site && <SuiviPublication siteId={l.site.id} />}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={carte} aria-labelledby="titre-infos">
          <h2 id="titre-infos" className="font-semibold">Informations</h2>
          <dl className="grid gap-1 text-sm">
            {infos.map(([t, v]) => (
              <div key={t} className="grid grid-cols-[150px_minmax(0,1fr)] gap-2 border-b border-neutral-100 py-1.5">
                <dt className="text-neutral-600">{t}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={carte} aria-labelledby="titre-suivi">
          <h2 id="titre-suivi" className="font-semibold">Suivi commercial</h2>
          <FormSuivi owner={l.owner} statut={l.statutCommercial} relance={l.prochaineRelanceManuelle} />
          <FormNote owner={l.owner} />
          <ul className="grid gap-2 text-sm">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">{dateCourte(n.created_at)}{n.auteur?.email ? ` · ${n.auteur.email}` : ''}</p>
                <p className="mt-1 whitespace-pre-wrap">{n.texte}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={carte} aria-labelledby="titre-relances">
        <h2 id="titre-relances" className="font-semibold">Relances</h2>
        <p className="text-sm text-neutral-600">{envoiActive() ? 'Envoi automatique configuré.' : 'Envoi automatique désactivé : relancez par téléphone ou copiez le message proposé dans votre messagerie, puis marquez la relance comme faite.'}</p>
        <ol className="grid gap-3">
          {l.relances.map((r) => {
            const m = r.action === 'relancer' && r.code !== 'manuelle' ? messageRelance(r.code, { prenom: l.prenom, finEssai: dateLongue(l.fin), lienEssai: l.lienApercu }) : null;
            return (
              <li key={`${r.code}-${r.date}`} className={`grid gap-1 rounded-lg border p-3 text-sm ${r.aFaire ? 'border-amber-300 bg-amber-50/60' : 'border-neutral-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><strong>{jourCourt(r.date)}</strong> · {r.libelle}{r.faite ? ` · faite le ${jourCourt(l.relancesFaites[r.code] ?? r.date)}` : ''}</span>
                  {!r.faite && r.date <= new Date().toISOString().slice(0, 10) && r.action === 'relancer' && <BoutonRelanceFaite owner={l.owner} code={r.code} />}
                  {!r.faite && r.aFaire && r.action === 'suspendre' && <span className="text-xs font-semibold text-red-800">Utiliser « Suspendre » ci-dessus (sauf paiement ou validation)</span>}
                </div>
                {m && !r.faite && <MessageACopier objet={m.objet} corps={m.corps} />}
              </li>
            );
          })}
          {!l.relances.length && <li className="text-sm text-neutral-500">Aucune relance prévue (essai clos, validé, payé ou suspendu).</li>}
        </ol>
      </section>
    </div>
  );
}
