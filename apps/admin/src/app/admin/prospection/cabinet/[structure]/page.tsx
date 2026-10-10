import Link from 'next/link';
import { notFound } from 'next/navigation';
import { casseNom, telephoneLisible } from '@plateforme/core/annuaire-sante';
import { exigerAdmin } from '@/lib/admin';
import { lireCabinet, type LigneProspection } from '@/lib/prospection';
import { autresProfessions, couleurEvenement, jour, Onglets, phraseEvenement, Scores, Specialites } from '../../Elements';
import { libelleEvenement } from '@plateforme/core';
import Suivi from '../../Suivi';

export const metadata = { title: 'Super admin · Cabinet' };

// FICHE CABINET (migration 0058, docs/prospection-rpps.md) : décideurs d'abord (titulaires, associés, avec leur suivi), puis
// collaborateurs, puis anciens membres ; actualités du cabinet depuis le premier import.

const decide = (m: LigneProspection) => /titulaire|associ/i.test(m.role ?? '');
const nomDe = (m: LigneProspection) => [casseNom(m.prenom ?? ''), casseNom(m.nom ?? '')].filter(Boolean).join(' ') || '—';

function Membre({ m, suivi }: { m: LigneProspection; suivi: boolean }) {
  return (
    <li className={`grid gap-2 rounded-2xl border bg-white p-4 text-sm ${m.disparu_le ? 'border-dashed border-neutral-300 opacity-80' : 'border-black/5'}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <Link href={`/admin/prospection/praticien/${m.rpps}`} className="font-semibold text-teal-900 underline">{nomDe(m)}</Link>
        <span className="text-xs text-neutral-600">{m.role ?? 'rôle inconnu'} · {m.apparu_le ? `arrivé le ${jour(m.apparu_le)}` : 'présent au premier import'}{m.disparu_le ? `, parti le ${jour(m.disparu_le)}` : ''}</span>
      </div>
      {m.telephone && !m.disparu_le && <a className="w-fit font-semibold text-teal-800 underline" href={`tel:${m.telephone.replace(/[^\d+]/g, '')}`}>{telephoneLisible(m.telephone)}</a>}
      <Specialites ids={m.specialites} />
      {!m.disparu_le && <Scores prospect={m.score_prospect} installation={m.score_installation} raisons={m.raisons} />}
      {suivi && <Suivi rpps={m.rpps} statut={m.statut} relance={m.relance_le} note={m.note} />}
    </li>
  );
}

export default async function FicheCabinet({ params }: PageProps<'/admin/prospection/cabinet/[structure]'>) {
  await exigerAdmin();
  const { structure } = await params;
  const r = await lireCabinet(structure);
  if (!r) notFound();
  const { membres, evenements } = r;
  const presents = membres.filter((m) => !m.disparu_le);
  const decideurs = presents.filter(decide);
  const autres = presents.filter((m) => !decide(m));
  const partis = membres.filter((m) => m.disparu_le);
  const ref = presents[0] ?? membres[0];

  return (
    <div className="grid grid-cols-1 gap-6">
      <Onglets actif="cabinets" />
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{casseNom(ref.enseigne || ref.raison_sociale || ref.entreprise_nom || 'Cabinet')}</h1>
        <p className="text-sm text-neutral-700">{[ref.adresse, [ref.code_postal, ref.commune && casseNom(ref.commune)].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</p>
        <p className="text-xs text-neutral-500">{[ref.secteur, `${presents.length} podologue${presents.length > 1 ? 's' : ''} aujourd’hui`, partis.length && `${partis.length} parti${partis.length > 1 ? 's' : ''} depuis le premier import`, ref.siret && `SIRET ${ref.siret}`].filter(Boolean).join(' · ')}</p>
        {autresProfessions(ref.autres_professions) && <p className="text-xs text-neutral-600">Autres professionnels à l’adresse : {autresProfessions(ref.autres_professions)}</p>}
      </div>

      <section className="grid gap-3">
        <h2 className="font-semibold">À contacter : {decideurs.length > 1 ? 'les décideurs' : 'le décideur'}</h2>
        {decideurs.length ? <ul className="grid gap-3">{decideurs.map((m) => <Membre key={m.cle} m={m} suivi />)}</ul>
          : <p className="text-sm text-neutral-500">Aucun titulaire ni associé renseigné au RPPS pour ce cabinet.</p>}
      </section>

      {autres.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-semibold">Collaborateurs et autres</h2>
          <ul className="grid gap-3">{autres.map((m) => <Membre key={m.cle} m={m} suivi={false} />)}</ul>
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="font-semibold">Actualités du cabinet</h2>
        {evenements.length ? (
          <ul className="grid gap-2 rounded-2xl border border-black/5 bg-white p-4 text-sm">
            {evenements.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-2">
                <span className="tabular-nums text-neutral-500">{jour(e.le)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${couleurEvenement[e.type] ?? ''}`}>{libelleEvenement(e.type)}</span>
                <span>{phraseEvenement(e)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">Aucun mouvement depuis le premier import (09/10/2026).</p>}
      </section>

      {partis.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-semibold">Anciens membres</h2>
          <ul className="grid gap-3">{partis.map((m) => <Membre key={m.cle} m={m} suivi={false} />)}</ul>
        </section>
      )}
    </div>
  );
}
