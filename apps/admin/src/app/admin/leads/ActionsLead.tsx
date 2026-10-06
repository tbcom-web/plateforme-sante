'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { STATUTS_COMMERCIAUX } from '@plateforme/core';
import { ajouterNote, majSuivi, marquerRelance, marquerRelanceProspect, prolonger, supprimerLeadTest, suspendre, validerEtMettreEnLigne, type EtatLead } from './actions';

const bouton = 'min-h-10 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60';
const Message = ({ etat }: { etat: EtatLead }) => (etat ? <p role="status" className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p> : null);

/** Valider et mettre en ligne / Prolonger / Suspendre : confirmation avant chaque action. */
export function ActionsEssai({ owner, suspendu, valide, aSite }: { owner: string; suspendu: boolean; valide: boolean; aSite: boolean }) {
  const [etat, setEtat] = useState<EtatLead>(null);
  const [enCours, demarrer] = useTransition();
  const [jours, setJours] = useState(30);
  const lancer = (question: string, f: () => Promise<EtatLead>) => {
    if (!confirm(question)) return;
    demarrer(async () => setEtat(await f()));
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {!valide && aSite && (
          <button type="button" disabled={enCours} className={`${bouton} bg-teal-800 text-white hover:bg-teal-900`}
            onClick={() => lancer('Avez-vous vérifié l’inscription au tableau de l’Ordre et les informations du cabinet ?\n\nLe site sera publié en production (site public).', () => validerEtMettreEnLigne(owner))}>
            Valider et mettre en ligne
          </button>
        )}
        <span className="inline-flex items-center gap-1">
          <label htmlFor="jours" className="sr-only">Durée de la prolongation</label>
          <select id="jours" value={jours} onChange={(e) => setJours(Number(e.target.value))} className="min-h-10 rounded-lg border border-neutral-300 px-2 text-sm">
            <option value={15}>15 jours</option>
            <option value={30}>30 jours</option>
            <option value={60}>60 jours</option>
          </select>
          <button type="button" disabled={enCours} className={`${bouton} border border-teal-800 text-teal-900 hover:bg-teal-50`}
            onClick={() => lancer(`Prolonger l’essai de ${jours} jours ?`, () => prolonger(owner, jours))}>
            Prolonger l’essai
          </button>
        </span>
        {suspendu ? (
          <button type="button" disabled={enCours} className={`${bouton} border border-neutral-400 text-neutral-800 hover:bg-neutral-50`}
            onClick={() => lancer('Lever la suspension et régénérer la version d’essai ?', () => suspendre(owner, false))}>
            Lever la suspension
          </button>
        ) : (
          <button type="button" disabled={enCours} className={`${bouton} border border-red-300 text-red-800 hover:bg-red-50`}
            onClick={() => lancer('Suspendre la version d’essai ? Le lien privé affichera « version d’essai suspendue ».', () => suspendre(owner, true))}>
            Suspendre
          </button>
        )}
      </div>
      {enCours && <p role="status" className="text-sm text-neutral-600">En cours…</p>}
      <Message etat={etat} />
    </div>
  );
}

export function FormSuivi({ owner, statut, relance }: { owner: string; statut: string; relance: string | null }) {
  const [etat, action, envoi] = useActionState(majSuivi.bind(null, owner), null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Statut commercial</span>
        <select name="statut" defaultValue={statut} className="min-h-10 rounded-lg border border-neutral-300 px-2">
          {STATUTS_COMMERCIAUX.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Prochaine relance (manuelle)</span>
        <input type="date" name="relance" defaultValue={relance ?? ''} className="min-h-10 rounded-lg border border-neutral-300 px-2" />
      </label>
      <button type="submit" disabled={envoi} className={`${bouton} bg-teal-800 text-white hover:bg-teal-900`}>{envoi ? '…' : 'Enregistrer'}</button>
      <div className="sm:col-span-3"><Message etat={etat} /></div>
    </form>
  );
}

export function FormNote({ owner }: { owner: string }) {
  const [etat, action, envoi] = useActionState(ajouterNote.bind(null, owner), null);
  return (
    <form action={action} className="grid gap-2">
      <label htmlFor="note" className="text-sm font-medium">Nouvelle note</label>
      <textarea id="note" name="texte" rows={3} maxLength={4000} required className="rounded-lg border border-neutral-300 p-2 text-sm" />
      <button type="submit" disabled={envoi} className={`${bouton} justify-self-start bg-teal-800 text-white hover:bg-teal-900`}>{envoi ? '…' : 'Ajouter la note'}</button>
      <Message etat={etat} />
    </form>
  );
}

export function BoutonRelanceFaite({ owner, code }: { owner: string; code: string }) {
  const [etat, setEtat] = useState<EtatLead>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={enCours || Boolean(etat?.ok)} onClick={() => demarrer(async () => setEtat(await marquerRelance(owner, code)))}
        className={`${bouton} border border-teal-800 text-teal-900 hover:bg-teal-50`}>
        {etat?.ok ? 'Faite' : 'Marquer comme faite'}
      </button>
      {etat && !etat.ok && <span className="text-xs text-red-700">{etat.message}</span>}
    </span>
  );
}

/** Message de relance proposé, à copier dans la messagerie de la commerciale (aucun envoi automatique). */
export function MessageACopier({ objet, corps }: { objet: string; corps: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <details className="text-sm">
      <summary className="min-h-10 cursor-pointer content-center font-semibold text-teal-800">Message proposé</summary>
      <div className="mt-2 grid gap-2 rounded-lg bg-neutral-50 p-3">
        <p><span className="font-medium">Objet :</span> {objet}</p>
        <pre className="whitespace-pre-wrap font-sans text-neutral-800">{corps}</pre>
        <button type="button" onClick={() => navigator.clipboard.writeText(`${objet}\n\n${corps}`).then(() => setCopie(true), () => setCopie(false))}
          className={`${bouton} justify-self-start border border-teal-800 text-teal-900 hover:bg-teal-50`}>
          {copie ? 'Copié' : 'Copier'}
        </button>
      </div>
    </details>
  );
}

export function BoutonRelanceProspectFaite({ id, code }: { id: string; code: string }) {
  const [etat, setEtat] = useState<EtatLead>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={enCours || Boolean(etat?.ok)} onClick={() => demarrer(async () => setEtat(await marquerRelanceProspect(id, code)))}
        className={`${bouton} border border-teal-800 text-teal-900 hover:bg-teal-50`}>
        {etat?.ok ? 'Faite' : 'Marquer comme faite'}
      </button>
      {etat && !etat.ok && <span className="text-xs text-red-700">{etat.message}</span>}
    </span>
  );
}

/** « Supprimer ce lead de test » : prospect, essai et site de test (le compte de connexion se supprime dans Supabase). */
export function BoutonSupprimerTest({ email, retour = false }: { email: string; retour?: boolean }) {
  const router = useRouter();
  const [etat, setEtat] = useState<EtatLead>(null);
  const [enCours, demarrer] = useTransition();
  const supprimer = () => {
    if (!confirm(`Supprimer le lead de test ${email} (prospect, essai et site de test) ?

Le compte de connexion éventuel est à supprimer ensuite dans Supabase → Authentication → Users.`)) return;
    demarrer(async () => {
      const r = await supprimerLeadTest(email);
      setEtat(r);
      if (r?.ok && retour) {
        alert(r.message);
        router.push('/admin/leads?filtre=tests');
      }
    });
  };
  return (
    <span className="inline-grid gap-1">
      <button type="button" disabled={enCours || Boolean(etat?.ok)} onClick={supprimer} className={`${bouton} border border-red-300 text-red-800 hover:bg-red-50`}>
        {enCours ? 'Suppression…' : etat?.ok ? 'Supprimé' : 'Supprimer ce lead de test'}
      </button>
      <Message etat={etat} />
    </span>
  );
}
