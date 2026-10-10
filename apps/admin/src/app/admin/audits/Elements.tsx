'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { lancerAudit, relancerAudit, type ResultatAudit } from './actions';

const CLE_COMMERCIAL = 'audit-commercial';

/** Formulaire « Auditer un site » ; le nom et le téléphone de la commerciale sont retenus sur ce navigateur */
export function FormulaireAudit() {
  const [etat, action, enCours] = useActionState<ResultatAudit, FormData>(lancerAudit, null);
  const [commercial, setCommercial] = useState({ nom: '', tel: '' });
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(CLE_COMMERCIAL) ?? 'null'); if (v) setCommercial(v); } catch { /* stockage indisponible */ }
  }, []);
  const retenir = (v: { nom: string; tel: string }) => { setCommercial(v); try { localStorage.setItem(CLE_COMMERCIAL, JSON.stringify(v)); } catch { /* idem */ } };

  return (
    <form action={action} className="rounded-2xl border border-black/5 bg-white p-5">
      <label htmlFor="domaine" className="block font-semibold">Site du praticien</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input id="domaine" name="domaine" required placeholder="cabinet-podologie-dupont.fr" autoComplete="off" inputMode="url"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-base" />
        <button disabled={enCours} className="rounded-lg bg-neutral-900 px-5 py-2 font-semibold text-white disabled:opacity-60">
          {enCours ? 'Préparation…' : 'Auditer'}
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-sm text-neutral-600">Votre nom (sur le rapport)
          <input name="commercial_nom" value={commercial.nom} onChange={(e) => retenir({ ...commercial, nom: e.target.value })} className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900" />
        </label>
        <label className="text-sm text-neutral-600">Votre téléphone (sur le rapport)
          <input name="commercial_tel" value={commercial.tel} onChange={(e) => retenir({ ...commercial, tel: e.target.value })} inputMode="tel" className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900" />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
        <input type="checkbox" name="preparer" value="non" /> Audit seul, sans préparer de site webpodologue
      </label>
      {etat && <p role="status" className={`mt-3 text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
    </form>
  );
}

export function BoutonRelancer({ id }: { id: string }) {
  const [enCours, demarrer] = useTransition();
  const [msg, setMsg] = useState('');
  return (
    <span>
      <button type="button" disabled={enCours} onClick={() => demarrer(async () => setMsg((await relancerAudit(id))?.message ?? ''))}
        className="rounded border border-neutral-400 px-2 py-0.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-60">Relancer</button>
      {msg && <span className="ml-2 text-xs text-neutral-500">{msg}</span>}
    </span>
  );
}

export function Copier({ texte, libelle = 'Copier le lien' }: { texte: string; libelle?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard.writeText(texte).then(() => setOk(true), () => setOk(false))}
      className="rounded border border-teal-800 px-2 py-0.5 text-xs font-semibold text-teal-900 hover:bg-teal-50">{ok ? 'Copié' : libelle}</button>
  );
}

/** Recharge la liste toutes les 15 s tant qu'un audit est en préparation */
export function Actualiser({ actif }: { actif: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!actif) return;
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [actif, router]);
  return null;
}
