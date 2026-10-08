'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { definirRole } from '../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function Roles({ moi, equipe, trouves, q }: { moi: string; equipe: { id: string; email: string; role: string }[]; trouves: { id: string; email: string; role_equipe: string | null }[]; q: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [enCours, demarrer] = useTransition();
  const changer = (id: string, role: string | null) => demarrer(async () => { const r = await definirRole(id, role); setMessage(r.message); if (r.ok) router.refresh(); });
  const ligne = (id: string, email: string, role: string | null) => (
    <li key={id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-black/5" data-compte={email}>
      <span className="min-w-0 flex-1 truncate">{email}</span>
      {id === moi ? <span className="text-neutral-600">vous · validateur</span> : (
        <select value={role ?? ''} disabled={enCours} onChange={(e) => changer(id, e.target.value || null)} aria-label={`Rôle de ${email}`} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
          <option value="">Aucun rôle</option>
          <option value="contributeur">Contributeur</option>
          <option value="validateur">Validateur</option>
        </select>
      )}
    </li>
  );
  return (
    <div className="grid gap-4">
      <section className="grid gap-2">
        <h2 className="font-semibold">Membres ({equipe.length})</h2>
        <ul className="grid gap-1">{equipe.map((e) => ligne(e.id, e.email, e.role))}</ul>
      </section>
      <form action="/chaine/equipe" className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">Chercher un compte existant (e-mail)<input name="q" defaultValue={q} className="min-h-11 rounded-lg border border-neutral-300 px-2 text-base md:text-sm" /></label>
        <button className={`min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white ${focus}`}>Chercher</button>
      </form>
      {q && <ul className="grid gap-1">{trouves.map((t) => ligne(t.id, t.email, t.role_equipe))}{!trouves.length && <li className="text-sm text-neutral-600">Aucun compte trouvé : créez-le d’abord.</li>}</ul>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </div>
  );
}
