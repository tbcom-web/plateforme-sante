'use client';

// Porte du rendu (« Voir le rendu de mon site ») pour un site commencé en session anonyme : e-mail, téléphone du cabinet
// (pré-rempli depuis le parcours, modifiable), accord OBLIGATOIRE pour être recontacté au sujet du site (+ lien
// confidentialité), conseils par e-mail facultatifs (case séparée, non cochée). Le prospect est enregistré et lié au
// brouillon (capturer_prospect_essai), puis le rendu s'affiche dans le navigateur (aucune construction, aucun coût).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { EtatPorte } from './actions';

const champ = 'h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 aria-[invalid=true]:border-red-600';
const etiquette = 'text-sm font-medium text-neutral-800';

type Saisie = { email: string; telephone: string; recontact: boolean; conseils: boolean };

export default function PorteRendu({
  email, telephone, onCapturer, onOk, onFermer,
}: {
  email: string;
  telephone: string;
  onCapturer: (s: Saisie) => Promise<EtatPorte>;
  onOk: (email: string, telephone: string) => void;
  onFermer: () => void;
}) {
  const [etat, setEtat] = useState<EtatPorte | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const premier = useRef<HTMLInputElement>(null);
  useEffect(() => {
    premier.current?.focus();
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulaire = e.currentTarget;
    const f = new FormData(formulaire);
    const s = { email: String(f.get('email') ?? ''), telephone: String(f.get('telephone') ?? ''), recontact: f.get('recontact') === 'on', conseils: f.get('conseils') === 'on' };
    setEnvoi(true);
    const r = await onCapturer(s).catch(() => ({ ok: false, message: 'Envoi impossible. Vérifiez la connexion.' }) as EtatPorte);
    setEnvoi(false);
    if (!r.ok) {
      setEtat(r);
      const k = Object.keys(r.erreurs ?? {})[0];
      if (k) (formulaire.elements.namedItem(k) as HTMLElement | null)?.focus();
      return;
    }
    onOk(s.email.trim().toLowerCase(), s.telephone.trim());
  }

  const err = etat?.erreurs ?? {};
  const aide = (k: keyof NonNullable<EtatPorte['erreurs']>) => (err[k] ? <p id={`porte-err-${k}`} className="text-sm text-red-700">{err[k]}</p> : null);
  const attributs = (k: keyof NonNullable<EtatPorte['erreurs']>) => ({ 'aria-invalid': Boolean(err[k]) || undefined, 'aria-describedby': err[k] ? `porte-err-${k}` : undefined });

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-neutral-900/50 sm:place-items-center sm:p-4" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="titre-porte" className="grid max-h-[100dvh] w-full gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="titre-porte" className="text-xl font-bold">Voir le rendu de votre site</h2>
          <button type="button" onClick={onFermer} className="-mr-2 -mt-1 min-h-11 min-w-11 rounded-lg text-2xl leading-none text-neutral-600 hover:bg-neutral-100" aria-label="Fermer">×</button>
        </div>
        <p className="text-sm text-neutral-700">Votre site s’affiche juste après, sur téléphone et sur ordinateur. Votre adresse permet à votre conseillère de vous recontacter à son sujet.</p>
        <form onSubmit={envoyer} noValidate className="grid gap-3.5">
          <div className="grid gap-1">
            <label htmlFor="porte-email" className={etiquette}>Adresse e-mail</label>
            <input ref={premier} id="porte-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={200} defaultValue={email} className={champ} {...attributs('email')} />
            {aide('email')}
          </div>
          <div className="grid gap-1">
            <label htmlFor="porte-telephone" className={etiquette}>Téléphone du cabinet <span className="font-normal text-neutral-500">(conseillé)</span></label>
            <input id="porte-telephone" name="telephone" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} defaultValue={telephone} className={champ} {...attributs('telephone')} />
            {aide('telephone')}
          </div>
          <label className="flex items-start gap-3 text-sm text-neutral-800">
            <input type="checkbox" name="recontact" className="mt-0.5 size-5 shrink-0 accent-teal-800" {...attributs('recontact')} />
            <span>J’accepte d’être recontacté(e) au sujet de mon site. <Link href="/essai/confidentialite" target="_blank" className="font-semibold text-teal-800 underline">Confidentialité</Link></span>
          </label>
          {aide('recontact')}
          <label className="flex items-start gap-3 text-sm text-neutral-800">
            <input type="checkbox" name="conseils" className="mt-0.5 size-5 shrink-0 accent-teal-800" />
            <span>Recevoir aussi des conseils par e-mail pour mon site (facultatif).</span>
          </label>
          <button type="submit" disabled={envoi} className="min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60">
            {envoi ? 'Préparation du rendu…' : 'Voir le rendu'}
          </button>
          <p role="status" aria-live="polite" className="text-sm text-red-700 empty:hidden">{etat && !etat.ok && !etat.erreurs ? etat.message : ''}</p>
        </form>
        <p className="text-xs text-neutral-600">Aucun mot de passe pour l’instant, aucune carte bancaire. Rien n’est publié sur internet.</p>
      </section>
    </div>
  );
}
