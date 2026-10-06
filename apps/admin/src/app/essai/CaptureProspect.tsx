'use client';

// Étape 1 de l'essai (« Créer mon site gratuit ») : prénom, nom, e-mail, téléphone facultatif, ville du cabinet, accord
// pour être recontacté (obligatoire) et conseils par e-mail (facultatif, non coché). Le prospect est enregistré dès la
// validation par la route serveur /api/essai/prospect (Turnstile vérifié côté serveur si configuré), même s'il ne va pas
// plus loin ; puis l'étape 2 (/essai/inscription) ne demande plus que le mot de passe et les CGU.
// Les informations sont passées à l'étape 2 par le stockage de session de l'onglet (jamais dans l'adresse).
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { utmDepuis, validerCapture, type Capture } from '@plateforme/core/prospects';


export const CLE_PROSPECT = 'essai-prospect';

const champ = 'h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 aria-[invalid=true]:border-red-600';
const etiquette = 'text-sm font-medium text-neutral-800';

type Erreurs = Partial<Record<keyof Capture | 'general', string>>;

export default function CaptureProspect({ turnstile }: { turnstile: string | null }) {
  const router = useRouter();
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const jeton = useRef<string | null>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const charge = useRef(false);

  // Turnstile chargé à la première interaction avec le formulaire (page rapide au premier affichage).
  const chargerCaptcha = () => {
    if (!turnstile || charge.current) return;
    charge.current = true;
    const rendre = () => {
      if (!cadre.current || !window.turnstile) return;
      window.turnstile.render(cadre.current, {
        sitekey: turnstile, language: 'fr', size: 'flexible',
        callback: (t) => { jeton.current = t; },
        'expired-callback': () => { jeton.current = null; },
        'error-callback': () => { jeton.current = null; },
      });
    };
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = rendre;
    document.head.appendChild(s);
  };

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (String(f.get('site_web') ?? '')) return; // champ piège invisible : robot
    const v = validerCapture({
      prenom: f.get('prenom'), nom: f.get('nom'), email: f.get('email'), telephone: f.get('telephone'), ville: f.get('ville'),
      recontact: f.get('recontact') === 'on', conseils: f.get('conseils') === 'on',
    });
    if (!v.ok) {
      setErreurs(v.erreurs);
      const premier = Object.keys(v.erreurs)[0];
      (e.currentTarget.elements.namedItem(premier) as HTMLElement | null)?.focus();
      return;
    }
    if (turnstile && !jeton.current) {
      chargerCaptcha();
      return setErreurs({ general: 'Vérification anti-robot en cours : patientez quelques secondes, puis réessayez.' });
    }
    setErreurs({});
    setEnvoi(true);
    const params = new URLSearchParams(window.location.search);
    const utm = utmDepuis(params);
    const source = (params.get('utm_source') || 'page-essai').slice(0, 80);
    try {
      const r = await fetch('/api/essai/prospect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...v.valeurs, etape: 'capture', utm, source, turnstile: jeton.current }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string; erreurs?: Erreurs };
      if (!r.ok || !j.ok) {
        setEnvoi(false);
        if (window.turnstile) window.turnstile.reset();
        jeton.current = null;
        return setErreurs({ ...(j.erreurs ?? {}), general: j.message || 'L’envoi n’a pas abouti. Réessayez dans un instant.' });
      }
    } catch {
      // Réseau coupé : on laisse quand même passer à l'étape 2 (le compte reste la vraie inscription).
    }
    try {
      sessionStorage.setItem(CLE_PROSPECT, JSON.stringify({ prenom: v.valeurs.prenom, nom: v.valeurs.nom, email: v.valeurs.email, ville: v.valeurs.ville, conseils: v.valeurs.conseils, utm, source }));
    } catch {
      // Stockage indisponible (navigation privée stricte) : l'étape 2 redemandera les informations.
    }
    router.push(`/essai/inscription${window.location.search}`);
  }

  const aide = (k: keyof Capture) => (erreurs[k] ? <p id={`err-${k}`} className="text-sm text-red-700">{erreurs[k]}</p> : null);
  const attributs = (k: keyof Capture) => ({ 'aria-invalid': Boolean(erreurs[k]) || undefined, 'aria-describedby': erreurs[k] ? `err-${k}` : undefined });

  return (
    <form onSubmit={envoyer} onFocus={chargerCaptcha} noValidate className="grid gap-3.5" aria-describedby="mention-capture">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid content-start gap-1">
          <label htmlFor="prenom" className={etiquette}>Prénom</label>
          <input id="prenom" name="prenom" autoComplete="given-name" maxLength={80} className={champ} {...attributs('prenom')} />
          {aide('prenom')}
        </div>
        <div className="grid content-start gap-1">
          <label htmlFor="nom" className={etiquette}>Nom</label>
          <input id="nom" name="nom" autoComplete="family-name" maxLength={80} className={champ} {...attributs('nom')} />
          {aide('nom')}
        </div>
      </div>
      <div className="grid content-start gap-1">
        <label htmlFor="email" className={etiquette}>Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={200} className={champ} {...attributs('email')} />
        {aide('email')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid content-start gap-1">
          <label htmlFor="telephone" className={etiquette}>Téléphone <span className="font-normal text-neutral-500">(facultatif)</span></label>
          <input id="telephone" name="telephone" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} className={champ} {...attributs('telephone')} />
          {aide('telephone')}
        </div>
        <div className="grid content-start gap-1">
          <label htmlFor="ville" className={etiquette}>Ville du cabinet</label>
          <input id="ville" name="ville" autoComplete="address-level2" maxLength={80} className={champ} {...attributs('ville')} />
          {aide('ville')}
        </div>
      </div>
      <p className="-mt-1 text-xs text-neutral-600">Le téléphone sert uniquement à vous aider si besoin pendant la création.</p>
      {/* Champ piège : invisible pour les personnes, rempli par certains robots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="site_web">Ne pas remplir</label>
        <input id="site_web" name="site_web" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-3 text-sm text-neutral-800">
        <input type="checkbox" name="recontact" className="mt-0.5 size-5 shrink-0 accent-teal-800" {...attributs('recontact')} />
        <span>J’accepte d’être recontacté(e) au sujet de mon site. <Link href="/essai/confidentialite" className="font-semibold text-teal-800 underline">Confidentialité</Link></span>
      </label>
      {aide('recontact')}
      <label className="flex items-start gap-3 text-sm text-neutral-800">
        <input type="checkbox" name="conseils" className="mt-0.5 size-5 shrink-0 accent-teal-800" />
        <span>Recevoir aussi des conseils par e-mail pour mon site (facultatif).</span>
      </label>
      {turnstile && <div ref={cadre} className="min-h-[65px]" />}
      <button type="submit" disabled={envoi} className="min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60">
        {envoi ? 'Enregistrement…' : 'Créer mon site gratuit'}
      </button>
      <p role="status" aria-live="polite" className="text-sm text-red-700 empty:hidden">{erreurs.general ?? ''}</p>
      <p id="mention-capture" className="text-xs text-neutral-600">Sans carte bancaire. Étape suivante : choisir un mot de passe.</p>
    </form>
  );
}
