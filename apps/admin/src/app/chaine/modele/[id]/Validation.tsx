'use client';

// 8. Validation finale (Paul) : verrous automatiques, tags pré-remplis à vérifier, publication. Un contributeur voit l'état, sans bouton.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { peutPublier, type StatutModele, type TagsModele, type VerrouValidation } from '@plateforme/core';
import { publierModele, repecher, verifierTags } from '../../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function Validation({ modele, validateur, statut, verrous, jauge, bloquants, tags, tagsValides }: {
  modele: string; validateur: boolean; statut: StatutModele; verrous: VerrouValidation[]; jauge: string | null; bloquants: string[]; tags: TagsModele; tagsValides: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState('');
  const [profils, setProfils] = useState(tags.profils.join(', '));
  const [couleurs, setCouleurs] = useState(tags.couleurs.join(', '));
  const liste = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const agir = (f: () => Promise<{ ok: boolean; message: string }>) => demarrer(async () => { const r = await f(); setMessage(r.message); if (r.ok) router.refresh(); });
  const pret = peutPublier(verrous);
  return (
    <section aria-labelledby="va-titre" className="grid content-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
      <h2 id="va-titre" className="font-semibold">Validation pour la production</h2>
      <ul className="grid gap-1 text-sm">
        {verrous.map((v) => (
          <li key={v.id} className="flex items-start gap-2" data-verrou={v.id} data-ok={v.ok ? 'oui' : 'non'}>
            <span aria-hidden="true">{v.ok ? '🟢' : '🔴'}</span>
            <span><span className="font-medium">{v.libelle}</span> <span className="text-neutral-600">· {v.detail}</span></span>
          </li>
        ))}
      </ul>
      {jauge && <p className="text-xs text-neutral-600">Jauge : {jauge}</p>}
      {bloquants.length > 0 && <details className="text-xs"><summary className="cursor-pointer">Éléments à valider ({bloquants.length})</summary><ul className="mt-1 list-disc pl-5">{bloquants.slice(0, 12).map((b) => <li key={b}>{b}</li>)}</ul></details>}
      <div className="grid gap-2 text-sm">
        <p className="font-medium">Tags {tagsValides ? '(vérifiés)' : '(pré-remplis automatiquement)'}</p>
        <p>Profession : {tags.profession}</p>
        <label className="grid gap-1">Profils<input value={profils} onChange={(e) => setProfils(e.target.value)} disabled={!validateur} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm" /></label>
        <label className="grid gap-1">Couleurs<input value={couleurs} onChange={(e) => setCouleurs(e.target.value)} disabled={!validateur} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm" /></label>
      </div>
      {validateur ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={enCours} onClick={() => agir(() => verifierTags(modele, { profession: tags.profession, profils: liste(profils), couleurs: liste(couleurs) }))} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm ${focus}`} data-action="tags">Tags vérifiés</button>
          {statut === 'ecarte' ? (
            <button type="button" disabled={enCours} onClick={() => agir(() => repecher(modele))} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm ${focus}`}>Repêcher</button>
          ) : (
            <button type="button" disabled={enCours || !pret || statut === 'publie'} onClick={() => agir(() => publierModele(modele))} className={`min-h-11 rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white disabled:opacity-50 ${focus}`} data-action="publier">
              {statut === 'publie' ? 'Publié' : 'Publier pour les praticiens'}
            </button>
          )}
        </div>
      ) : <p className="text-xs text-neutral-600">La validation finale et la publication sont faites par Paul.</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
  );
}
