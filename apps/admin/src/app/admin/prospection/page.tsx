import Link from 'next/link';
import { installation, lireFiltresProspection, parametresProspection, PERIODES_INSTALLATION, ROLES_PROSPECTION, SPECIALITES_DIPLOMES, STATUTS_PROSPECTION } from '@plateforme/core';
import { casseNom, telephoneLisible } from '@plateforme/core/annuaire-sante';
import { exigerAdmin } from '@/lib/admin';
import { dateCourte } from '@/lib/libelles';
import { derniereSynchro, lireProspection, PAR_PAGE, type LigneProspection } from '@/lib/prospection';
import { autresProfessions, jour, Onglets, Scores, Specialites } from './Elements';
import Suivi from './Suivi';

export const metadata = { title: 'Super admin · Prospection' };

// PROSPECTION RPPS (docs/prospection-rpps.md, migration 0055) : praticiens de l'extraction publique du RPPS, synchronisée chaque
// nuit (scripts/synchro-rpps.mjs), triés du plus récemment installé au plus ancien ; suivi de la commerciale par praticien.
// Aucun message n'est envoyé d'ici. Les adresses MSSanté ne sont jamais importées (messagerie réservée aux échanges de santé).

const couleurSignal: Record<string, string> = { siret: 'bg-teal-100 text-teal-900', rpps: 'bg-violet-100 text-violet-900', nom: 'bg-amber-100 text-amber-900', ans: 'bg-sky-100 text-sky-900' };
const champ = 'min-h-10 rounded-lg border border-neutral-300 px-2';

function Fiche({ p }: { p: LigneProspection }) {
  const inst = installation(p);
  const nom = [p.civilite, casseNom(p.prenom ?? ''), casseNom(p.nom ?? '')].filter(Boolean).join(' ');
  const cabinet = p.enseigne || p.raison_sociale || p.entreprise_nom;
  const tel = p.telephone ? telephoneLisible(p.telephone) : '';
  return (
    <li className="grid gap-3 rounded-2xl border border-black/5 bg-white p-4 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="grid min-w-0 content-start gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link href={`/admin/prospection/praticien/${p.rpps}`} className="font-semibold text-teal-900 underline decoration-teal-800/30 hover:decoration-teal-800">{nom || '—'}</Link>
          {p.role && <span className="text-xs text-neutral-600">{p.role}</span>}
          {p.statut === 'gagne' && <span className="rounded-full bg-teal-800 px-2 py-0.5 text-xs font-semibold text-white">Client</span>}
          {p.raisons?.some((r) => r.k === 'client') && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Lien avec un client</span>}
          {inst && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${couleurSignal[inst.source]}`}>{inst.libelle} le {jour(inst.date)}</span>}
          {p.disparu_le && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">Absent du RPPS depuis le {jour(p.disparu_le)}</span>}
          {p.siret_ferme && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">Établissement fermé</span>}
        </div>
        {cabinet && (p.structure_cle
          ? <Link href={`/admin/prospection/cabinet/${p.structure_cle}`} className="w-fit text-neutral-700 underline decoration-neutral-300 hover:text-teal-900">{casseNom(cabinet)}</Link>
          : <p className="text-neutral-700">{casseNom(cabinet)}</p>)}
        <p className="text-neutral-700">{[p.adresse, [p.code_postal, p.commune && casseNom(p.commune)].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}</p>
        <p className="flex flex-wrap gap-x-3 text-neutral-700">
          {tel ? <a className="font-semibold text-teal-800 underline" href={`tel:${p.telephone!.replace(/[^\d+]/g, '')}`}>{tel}</a> : <span className="text-neutral-500">Pas de téléphone au RPPS</span>}
          {p.email && <a className="break-all text-teal-800 underline" href={`mailto:${p.email}`}>{p.email}</a>}
        </p>
        <Specialites ids={p.specialites} />
        {autresProfessions(p.autres_professions) && <p className="text-xs text-neutral-600">À la même adresse : {autresProfessions(p.autres_professions)}</p>}
        <p className="text-xs text-neutral-500">{[p.mode_exercice, p.secteur, `RPPS ${p.rpps}`, p.siret && `SIRET ${p.siret}`].filter(Boolean).join(' · ')}</p>
        <Scores prospect={p.score_prospect} installation={p.score_installation} raisons={p.raisons} />
      </div>
      <Suivi rpps={p.rpps} statut={p.statut} relance={p.relance_le} note={p.note} />
    </li>
  );
}

export default async function Prospection({ searchParams }: PageProps<'/admin/prospection'>) {
  await exigerAdmin();
  const f = lireFiltresProspection(await searchParams);
  const [resultat, synchro] = await Promise.all([lireProspection(f), derniereSynchro()]);

  if (!resultat) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
        <h1 className="text-xl font-bold">Prospection</h1>
        <p className="mt-2">La base n’a pas encore reçu la mise à jour <code>0055_prospection_rpps.sql</code>, puis la première synchronisation (Actions → synchro-rpps). Voir docs/prospection-rpps.md.</p>
      </div>
    );
  }

  const { lignes, total, niveau } = resultat;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const lien = (page: number) => `/admin/prospection?${parametresProspection(f, page)}`;

  return (
    <div className="grid grid-cols-1 gap-6">
      <Onglets actif="praticiens" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prospection <span className="text-base font-semibold text-neutral-600">· RPPS</span></h1>
          <p className="text-sm text-neutral-600">
            {total.toLocaleString('fr-FR')} situation{total > 1 ? 's' : ''} d’exercice · {niveau >= 57 && f.tri === 'score' ? 'du meilleur score au plus faible' : 'du plus récemment installé au plus ancien'}.
            {synchro ? ` Données issues du RPPS (Annuaire Santé, ANS), mise à jour du ${dateCourte(synchro.le)}${synchro.nouveaux ? ` : ${synchro.nouveaux} nouveauté${synchro.nouveaux > 1 ? 's' : ''}` : ''}.` : ' Première synchronisation pas encore faite.'}
          </p>
        </div>
        <a href={`/admin/prospection/export.csv?${parametresProspection(f, 1)}`} className="text-sm font-semibold text-teal-800 underline">Exporter (CSV, 5 000 lignes au plus)</a>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm" action="/admin/prospection">
        <label className="grid gap-1">
          <span className="font-medium">Département</span>
          <input name="dep" defaultValue={f.departement} placeholder="69" maxLength={3} className={`${champ} w-20`} />
        </label>
        <label className="grid gap-1">
          <span className="font-medium">Recherche</span>
          <input name="q" defaultValue={f.q} placeholder="Nom, commune, code postal, cabinet" className={champ} />
        </label>
        <label className="grid gap-1">
          <span className="font-medium">Installation</span>
          <select name="periode" defaultValue={f.periode} className={champ}>
            {PERIODES_INSTALLATION.map((p) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-medium">Suivi</span>
          <select name="statut" defaultValue={f.statut} className={champ}>
            <option value="">Tous</option>
            <option value="relance">Relance à faire</option>
            {STATUTS_PROSPECTION.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-medium">Exercice</span>
          <select name="liberal" defaultValue={f.liberal ? '' : 'non'} className={champ}>
            <option value="">Libéral</option>
            <option value="non">Tous</option>
          </select>
        </label>
        {niveau >= 57 && (
          <>
            <label className="grid gap-1">
              <span className="font-medium">Rôle</span>
              <select name="role" defaultValue={f.role} className={champ}>
                <option value="">Tous</option>
                {ROLES_PROSPECTION.map((r) => <option key={r.id} value={r.id}>{r.libelle}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-medium">Spécialité (diplôme)</span>
              <select name="specialite" defaultValue={f.specialite} className={champ}>
                <option value="">Toutes</option>
                {SPECIALITES_DIPLOMES.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-medium">Tri</span>
              <select name="tri" defaultValue={f.tri} className={champ}>
                <option value="score">Meilleur score</option>
                <option value="recent">Installation la plus récente</option>
              </select>
            </label>
          </>
        )}
        {niveau >= 57 && (
          <label className="flex min-h-10 items-center gap-2">
            <input type="checkbox" name="lien" value="client" defaultChecked={f.lienClient} />
            <span>Liés à un client</span>
          </label>
        )}
        {niveau >= 57 && (
          <label className="flex min-h-10 items-center gap-2">
            <input type="checkbox" name="dem" value="oui" defaultChecked={f.demenagement} />
            <span>Déménagements</span>
          </label>
        )}
        <label className="flex min-h-10 items-center gap-2">
          <input type="checkbox" name="actifs" value="non" defaultChecked={!f.actifs} />
          <span>Inclure fermés et absents</span>
        </label>
        <button type="submit" className="min-h-10 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">Filtrer</button>
      </form>

      <p className="text-xs text-neutral-500">
        Signaux : <span className="rounded-full bg-teal-100 px-1.5 text-teal-900">Cabinet ouvert (INSEE)</span> date d’ouverture déclarée à l’INSEE, la plus fiable ·{' '}
        <span className="rounded-full bg-violet-100 px-1.5 text-violet-900">Nouveau au RPPS</span> apparu dans l’annuaire depuis le premier import (arrivée dans un cabinet existant, nouveau diplômé) ·{' '}
        <span className="rounded-full bg-amber-100 px-1.5 text-amber-900">Trouvé par nom</span> sans SIRET au RPPS, à confirmer ·{' '}
        <span className="rounded-full bg-sky-100 px-1.5 text-sky-900">Situation modifiée au RPPS</span> dernière modification du cabinet dans l’annuaire de l’ANS (changement de lieu ou de rôle, parfois simple correction).
      </p>

      <ul className="grid gap-3">
        {lignes.map((p) => <Fiche key={p.cle} p={p} />)}
        {!lignes.length && <li className="rounded-2xl border border-black/5 bg-white p-4 text-center text-sm text-neutral-500">Aucun praticien pour ces filtres.</li>}
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
