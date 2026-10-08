'use client';

// Démarrage de l'essai sans formulaire : session ANONYME Supabase (supabase.auth.signInAnonymously, clé publique
// seulement), créée dans ce navigateur. Le site est enregistré en base sous ce compte anonyme ; la commerciale ne voit un
// « lead » qu'après la porte du rendu (e-mail + accord de recontact). Captcha Turnstile transmis si configuré (Supabase
// recommande la captcha pour les connexions anonymes). Limite : la session anonyme n'existe que dans ce navigateur ; elle
// devient un vrai compte à la fin du parcours (« Créez votre accès »).
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { utmDepuis } from '@plateforme/core/prospects';
import { createClient } from '@/lib/supabase/client';
import { demarrerEssai } from '../actions';

type Etat = { type: 'preparation' } | { type: 'captcha' } | { type: 'erreur'; message: string } | { type: 'connecte' };

function messageErreur(m: string): string {
  if (/captcha/i.test(m)) return 'La vérification anti-robot a échoué. Réessayez.';
  if (/rate limit|too many/i.test(m)) return 'Trop de tentatives depuis cette connexion. Réessayez dans quelques minutes.';
  return 'Votre espace n’a pas pu être préparé. Réessayez dans un instant.';
}

export default function Commencer({ turnstile }: { turnstile: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [etat, setEtat] = useState<Etat>({ type: 'preparation' });
  const cadre = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const lance = useRef(false);

  const ouvrir = useCallback(async (captchaToken?: string) => {
    const supabase = createClient();
    const { data: existant } = await supabase.auth.getSession();
    const user = existant.session?.user;
    if (user && !user.is_anonymous) {
      // Compte avec accès déjà connecté sur ce navigateur : son espace.
      return setEtat({ type: 'connecte' });
    }
    if (!user) {
      const utm = utmDepuis(params);
      const { error } = await supabase.auth.signInAnonymously({
        options: {
          ...(captchaToken ? { captchaToken } : {}),
          data: { source: (params.get('utm_source') || 'page-essai').slice(0, 80), utm, profession: 'pedicure-podologue' },
        },
      });
      if (error) {
        // Connexions anonymes désactivées dans Supabase : ancien parcours (coordonnées, mot de passe, CGU).
        if (error.code === 'anonymous_provider_disabled' || (/anonymous/i.test(error.message) && /disabled|not enabled|not allowed/i.test(error.message))) {
          router.replace(`/essai/inscription${window.location.search}`);
          return;
        }
        if (widget.current) window.turnstile?.reset(widget.current);
        return setEtat({ type: 'erreur', message: messageErreur(error.message) });
      }
    }
    const r = await demarrerEssai();
    if (!r.ok) return setEtat({ type: 'erreur', message: r.message });
    // Parcours client (profession, informations préremplies, style) ; un site déjà commencé y est renvoyé vers /creer.
    router.replace(params.get('suite') === 'creer' ? '/creer' : '/essai/votre-site');
  }, [params, router]);

  // Sans Turnstile, ou session déjà ouverte : démarrage direct. Avec Turnstile : le widget donne le jeton.
  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    void (async () => {
      const { data } = await createClient().auth.getSession();
      if (!turnstile || data.session) await ouvrir();
      else setEtat({ type: 'captcha' });
    })();
  }, [ouvrir, turnstile]);

  const afficherCaptcha = () => {
    if (!turnstile || !cadre.current || !window.turnstile || widget.current) return;
    widget.current = window.turnstile.render(cadre.current, {
      sitekey: turnstile,
      language: 'fr',
      callback: (t) => { setEtat({ type: 'preparation' }); void ouvrir(t); },
      'expired-callback': () => undefined,
      'error-callback': () => setEtat({ type: 'erreur', message: 'La vérification anti-robot n’a pas pu se faire. Rechargez la page.' }),
    });
  };
  useEffect(() => { if (etat.type === 'captcha') afficherCaptcha(); });

  return (
    <section className="grid gap-4 rounded-2xl border border-black/5 bg-white p-6 sm:p-8" aria-labelledby="titre-commencer" aria-busy={etat.type === 'preparation'}>
      {turnstile && etat.type === 'captcha' && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={afficherCaptcha} />}
      <h1 id="titre-commencer" className="text-2xl font-bold">{etat.type === 'connecte' ? 'Vous êtes déjà connecté(e)' : 'Préparation de votre site'}</h1>
      {etat.type === 'preparation' && <p role="status" className="text-neutral-700">Un instant, votre espace s’ouvre…</p>}
      {etat.type === 'captcha' && (
        <>
          <p className="text-neutral-700">Une vérification rapide contre les robots, puis vous commencez.</p>
          <div ref={cadre} className="min-h-16" />
        </>
      )}
      {etat.type === 'erreur' && (
        <>
          <p role="alert" className="text-red-700">{etat.message}</p>
          <button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-xl bg-teal-800 px-5 font-semibold text-white hover:bg-teal-900">Réessayer</button>
        </>
      )}
      {etat.type === 'connecte' && (
        <>
          <p className="text-neutral-700">Ce navigateur est déjà connecté à un compte. Retrouvez votre site dans votre espace.</p>
          <Link href="/tableau-de-bord" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-5 font-semibold text-white hover:bg-teal-900">Mon espace</Link>
        </>
      )}
      <p className="text-sm text-neutral-600">Votre site est enregistré au fur et à mesure dans ce navigateur. À la fin, un mot de passe vous permettra de le retrouver partout.</p>
    </section>
  );
}
