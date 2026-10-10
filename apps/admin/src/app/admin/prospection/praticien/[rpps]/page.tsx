import Link from 'next/link';
import { notFound } from 'next/navigation';
import { casseNom, telephoneLisible } from '@plateforme/core/annuaire-sante';
import { exigerAdmin } from '@/lib/admin';
import { lireFiche, type Lien, type LigneProspection } from '@/lib/prospection';
import { historiqueAnnuaire, type HistoriqueAns } from '@/lib/annuaire-sante';
import { autresProfessions, jour, Scores, Specialites } from '../../Elements';
import Suivi from '../../Suivi';

export const metadata = { title: 'Super admin · Fiche praticien' };

// FICHE PRATICIEN DE LA PROSPECTION (migration 0057, docs/prospection-rpps.md) : toutes ses situations d'exercice, présentes et
// passées (historique tenu nuit après nuit depuis l'import initial du 2026-10-09), scores expliqués, diplômes, et son RÉSEAU :
// confrères passés et présents de la même structure RPPS ou de la même adresse, avec leurs dates.

const nomDe = (p: LigneProspection) => [casseNom(p.prenom ?? ''), casseNom(p.nom ?? '')].filter(Boolean).join(' ') || '—';
const lieuDe = (p: LigneProspection) => [p.adresse, [p.code_postal, p.commune && casseNom(p.commune)].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—';
const periode = (p: LigneProspection) =>
  `${p.apparu_le ? `arrivé le ${jour(p.apparu_le)}` : 'présent au premier import (09/10/2026)'}${p.disparu_le ? `, parti le ${jour(p.disparu_le)}` : ', toujours là'}`;

function Situation({ s }: { s: LigneProspection }) {
  const tel = s.telephone ? telephoneLisible(s.telephone) : '';
  return (
    <li className={`grid gap-1 rounded-2xl border bg-white p-4 text-sm ${s.disparu_le ? 'border-dashed border-neutral-300 opacity-80' : 'border-black/5'}`}>
      {s.structure_cle
        ? <Link href={`/admin/prospection/cabinet/${s.structure_cle}`} className="w-fit font-semibold text-teal-900 underline">{casseNom(s.enseigne || s.raison_sociale || s.entreprise_nom || 'Cabinet')}</Link>
        : <p className="font-semibold">{casseNom(s.enseigne || s.raison_sociale || s.entreprise_nom || 'Cabinet')}</p>}
      <p className="text-neutral-700">{lieuDe(s)}</p>
      <p className="text-xs text-neutral-600">{[s.role, s.secteur, s.mode_exercice].filter(Boolean).join(' · ')} — {periode(s)}</p>
      {(tel || s.email) && (
        <p className="flex flex-wrap gap-x-3">
          {tel && <a className="font-semibold text-teal-800 underline" href={`tel:${s.telephone!.replace(/[^\d+]/g, '')}`}>{tel}</a>}
          {s.email && <a className="break-all text-teal-800 underline" href={`mailto:${s.email}`}>{s.email}</a>}
        </p>
      )}
      {autresProfessions(s.autres_professions) && <p className="text-xs text-neutral-600">À la même adresse : {autresProfessions(s.autres_professions)}</p>}
      {s.ancien_cabinet?.ferme && (
        <p className="text-xs text-fuchsia-900">Ancien cabinet : {casseNom([s.ancien_cabinet.adresse, s.ancien_cabinet.commune].filter(Boolean).join(', ') || '—')} · {jour(s.ancien_cabinet.ouvert)} → {jour(s.ancien_cabinet.ferme)} (INSEE)</p>
      )}
      <p className="text-xs text-neutral-500">
        {[s.siret && `SIRET ${s.siret}`, s.siret_cree_le && `cabinet ouvert le ${jour(s.siret_cree_le)}${s.siret_source === 'nom' ? ' (trouvé par nom)' : ''}`, s.siren_cree_le && `libéral depuis le ${jour(s.siren_cree_le)} (SIREN)`, s.situation_maj_le && `modifiée au RPPS le ${jour(s.situation_maj_le)}`].filter(Boolean).join(' · ')}
      </p>
      <Scores prospect={s.score_prospect} installation={s.score_installation} raisons={s.raisons} />
    </li>
  );
}

function Reseau({ liens, situations }: { liens: Lien[]; situations: LigneProspection[] }) {
  if (!liens.length) return <p className="text-sm text-neutral-500">Aucun confrère connu dans ses structures ni à ses adresses.</p>;
  // Regroupés par lieu de la fiche
  return (
    <div className="grid gap-4">
      {situations.filter((s) => liens.some((l) => l.depuis === s.cle)).map((s) => (
        <section key={s.cle} className="rounded-2xl border border-black/5 bg-white p-4 text-sm">
          <h3 className="font-semibold">{s.structure_cle ? <Link href={`/admin/prospection/cabinet/${s.structure_cle}`} className="underline">{casseNom(s.enseigne || s.raison_sociale || 'Cabinet')}</Link> : casseNom(s.enseigne || s.raison_sociale || 'Cabinet')} <span className="font-normal text-neutral-600">· {lieuDe(s)}</span></h3>
          <ul className="mt-2 divide-y divide-neutral-100">
            {liens.filter((l) => l.depuis === s.cle).sort((a, b) => Number(Boolean(a.ligne.disparu_le)) - Number(Boolean(b.ligne.disparu_le))).map(({ ligne: l, via }) => (
              <li key={l.cle} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <Link href={`/admin/prospection/praticien/${l.rpps}`} className="font-semibold text-teal-900 underline">{nomDe(l)}</Link>
                  <span className="text-neutral-600"> · {l.role ?? 'rôle inconnu'}{via === 'adresse' ? ' · même adresse, autre structure' : ''}</span>
                </span>
                <span className="text-xs text-neutral-500">{periode(l)}{l.score_prospect != null ? ` · score ${l.score_prospect}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Situations selon l'API FHIR de l'ANS, actives ET terminées : ce que l'ANS garde de l'historique */
function SituationsAns({ h }: { h: HistoriqueAns }) {
  if (h.etat === 'indisponible') return <p className="text-sm text-neutral-500">Clé de l’API ANS absente sur ce serveur (variable ANNUAIRE_SANTE_API_KEY dans Vercel).</p>;
  if (h.etat === 'introuvable') return <p className="text-sm text-neutral-500">Praticien introuvable dans l’API ANS.</p>;
  if (h.etat !== 'ok') return <p className="text-sm text-amber-800">API ANS indisponible ({h.message}).</p>;
  return (
    <div className="grid gap-2">
      <ul className="grid gap-2 rounded-2xl border border-black/5 bg-white p-4 text-sm">
        {h.situations.map((s) => (
          <li key={s.id} className="grid gap-0.5">
            <span>
              <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${s.active === false ? 'bg-neutral-200 text-neutral-700' : 'bg-teal-100 text-teal-900'}`}>{s.active === false ? 'Terminée' : 'Active'}</span>
              <strong>{s.structure ? casseNom(s.structure) : 'Structure non renseignée'}</strong>{s.adresse && <span className="text-neutral-600"> · {casseNom(s.adresse)}</span>}
            </span>
            <span className="text-xs text-neutral-500">
              {[s.debut && `début ${jour(s.debut)}`, s.fin && `fin ${jour(s.fin)}`, s.majLe && `modifiée le ${jour(s.majLe)}`, s.codes.join(', ')].filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
        {!h.situations.length && <li className="text-neutral-500">Aucune situation renvoyée.</li>}
      </ul>
      <p className="text-xs text-neutral-500">{h.situations.filter((s) => s.active === false).length} situation(s) terminée(s) gardée(s) par l’ANS · fiche praticien modifiée le {jour(h.praticienMajLe)}</p>
      <details className="text-xs"><summary className="cursor-pointer text-teal-800 underline">Réponse brute de l’API</summary><pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-neutral-50 p-3">{h.brut}</pre></details>
    </div>
  );
}

export default async function FichePraticien({ params }: PageProps<'/admin/prospection/praticien/[rpps]'>) {
  await exigerAdmin();
  const { rpps } = await params;
  const [fiche, ans] = await Promise.all([lireFiche(rpps), historiqueAnnuaire(rpps)]);
  if (!fiche) notFound();
  const { situations, liens } = fiche;
  const p = situations.find((s) => !s.disparu_le) ?? situations[0];
  const diplomes = [...new Map(situations.flatMap((s) => s.diplomes ?? []).map((d) => [d.l, d])).values()];
  const actifs = liens.filter((l) => !l.ligne.disparu_le).length;

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid gap-1">
        <Link href="/admin/prospection" className="text-sm text-teal-800 underline">← Prospection</Link>
        <h1 className="text-2xl font-bold">{[p.civilite, nomDe(p)].filter(Boolean).join(' ')}</h1>
        <p className="text-sm text-neutral-600">{p.profession} · RPPS {p.rpps} · {situations.length} situation{situations.length > 1 ? 's' : ''} connue{situations.length > 1 ? 's' : ''} · {actifs} confrère{actifs > 1 ? 's' : ''} lié{actifs > 1 ? 's' : ''} aujourd’hui, {liens.length - actifs} par le passé</p>
        <Specialites ids={p.specialites} />
      </div>

      <section className="grid gap-3 rounded-2xl border border-black/5 bg-white p-4">
        <h2 className="font-semibold">Suivi</h2>
        <Suivi rpps={p.rpps} statut={p.statut} relance={p.relance_le} note={p.note} />
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold">Situations d’exercice</h2>
        <ul className="grid gap-3">{situations.map((s) => <Situation key={s.cle} s={s} />)}</ul>
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="font-semibold">Situations au RPPS selon l’API ANS</h2>
          <p className="text-xs text-neutral-500">En direct, actives et terminées : ce que l’Annuaire Santé garde de son parcours.</p>
        </div>
        <SituationsAns h={ans} />
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold">Diplômes et titres <span className="text-xs font-normal text-neutral-500">(RPPS, comme sur annuaire.sante.fr)</span></h2>
        {diplomes.length ? (
          <ul className="grid gap-1 rounded-2xl border border-black/5 bg-white p-4 text-sm">
            {diplomes.map((d) => <li key={d.l} className={d.t === 'DE' ? 'text-neutral-600' : 'font-medium'}>{d.c && <span className="mr-2 font-mono text-xs text-neutral-500">{d.c}</span>}{d.l}{d.t && <span className="text-xs text-neutral-500"> · {d.t}</span>}</li>)}
          </ul>
        ) : <p className="text-sm text-neutral-500">Aucun diplôme ni titre transmis par le RPPS (fiche antérieure à la synchro des diplômes).</p>}
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="font-semibold">Réseau</h2>
          <p className="text-xs text-neutral-500">Confrères de la même structure RPPS ou de la même adresse, présents ou partis. L’historique s’enrichit chaque nuit depuis le premier import.</p>
        </div>
        <Reseau liens={liens} situations={situations} />
      </section>
    </div>
  );
}
