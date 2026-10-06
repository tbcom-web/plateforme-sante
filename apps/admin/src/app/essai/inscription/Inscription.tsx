'use client';

// Inscription à l'essai en un écran : compte Supabase créé depuis le navigateur (auth.signUp, clé publique seulement ;
// jamais de clé secrète). Les informations de l'essai (prénom, nom, ville, CGU, conseils, provenance) sont enregistrées
// dans les métadonnées du compte puis reprises par la fonction SQL demarrer_essai.
// - Confirmation d'e-mail désactivée : session immédiate → essai démarré → parcours guidé (/creer).
// - Confirmation activée : écran « Vérifiez vos e-mails » ; le lien ramène sur /auth/callback?next=/essai/demarrer.
// Anti-abus : captcha Cloudflare Turnstile natif de Supabase Auth, seulement si NEXT_PUBLIC_TURNSTILE_SITE_KEY existe.
// Étape 2 du funnel : si le prospect vient de laisser ses coordonnées à l'étape 1 (/essai, stockage de session de
// l'onglet), seuls le mot de passe et les CGU sont demandés (coordonnées repliées, modifiables). Lien de reprise de la
// commerciale : /essai/inscription#email=… (e-mail pré-rempli, jamais envoyé au serveur dans l'adresse).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { CGU_ESSAI_VERSION } from '@plateforme/core';
import { createClient } from '@/lib/supabase/client';
import { demarrerEssai } from '../actions';
import { CLE_PROSPECT } from '../CaptureProspect';

type Prospect = { prenom: string; nom: string; email: string; ville: string; conseils: boolean; utm: Record<string, string>; source: string };

function lireProspect(): Prospect | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(CLE_PROSPECT) ?? 'null') as Prospect | null;
    return p && typeof p.email === 'string' && p.email ? p : null;
  } catch {
    return null;
  }
}


const champ = 'h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';
const etiquette = 'text-sm font-medium text-neutral-800';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

type Etat = { type: 'saisie' } | { type: 'envoi' } | { type: 'verifier'; email: string } | { type: 'erreur'; message: string };

function messageErreur(m: string): string {
  if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cette adresse e-mail : connectez-vous.';
  if (/password/i.test(m)) return 'Mot de passe trop faible : 8 caractères au moins, avec lettres et chiffres.';
  if (/captcha/i.test(m)) return 'La vérification anti-robot a échoué. Rechargez la page et réessayez.';
  if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (/signups? not allowed|disabled/i.test(m)) return 'Les inscriptions ne sont pas encore ouvertes. Écrivez-nous pour démarrer votre essai.';
  return 'L’inscription n’a pas abouti. Réessayez dans un instant.';
}

export default function Inscription({ turnstile }: { turnstile: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [etat, setEtat] = useState<Etat>(() => (params.get('erreur') ? { type: 'erreur', message: params.get('erreur')!.slice(0, 200) } : { type: 'saisie' }));
  const [jeton, setJeton] = useState<string | null>(null);
  const [renvoi, setRenvoi] = useState<string | null>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  // Coordonnées de l'étape 1 (même onglet) ou e-mail du lien de reprise (#email=…), lus après le premier rendu.
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [emailReprise, setEmailReprise] = useState('');
  const [modifier, setModifier] = useState(false);
  const [voirMdp, setVoirMdp] = useState(false);
  useEffect(() => {
    const p = lireProspect();
    const h = new URLSearchParams(window.location.hash.slice(1)).get('email') ?? '';
    if (p) setProspect(p);
    else if (h) setEmailReprise(h.slice(0, 200));
  }, []);
  const compact = Boolean(prospect) && !modifier;

  const afficherCaptcha = () => {
    if (!turnstile || !cadre.current || !window.turnstile || widget.current) return;
    widget.current = window.turnstile.render(cadre.current, {
      sitekey: turnstile,
      language: 'fr',
      callback: setJeton,
      'expired-callback': () => setJeton(null),
      'error-callback': () => setJeton(null),
    });
  };
  useEffect(afficherCaptcha);

  const redirection = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent('/essai/demarrer')}`;

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (k: string) => String(f.get(k) ?? '').trim();
    const email = val('email').toLowerCase();
    const motDePasse = String(f.get('motDePasse') ?? '');
    if (!val('prenom') || !val('nom')) return setEtat({ type: 'erreur', message: 'Indiquez votre prénom et votre nom.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setEtat({ type: 'erreur', message: 'Adresse e-mail invalide.' });
    if (motDePasse.length < 8) return setEtat({ type: 'erreur', message: 'Le mot de passe doit faire 8 caractères au moins.' });
    if (f.get('cgu') !== 'on') return setEtat({ type: 'erreur', message: 'Acceptez les conditions de l’essai pour continuer.' });
    if (turnstile && !jeton) return setEtat({ type: 'erreur', message: 'Patientez pendant la vérification anti-robot, puis réessayez.' });

    const utmAdresse = Object.fromEntries(UTM.flatMap((k) => { const v = params.get(k); return v ? [[k, v.slice(0, 100)]] : []; }));
    const utm = Object.keys(utmAdresse).length ? utmAdresse : prospect?.utm ?? {};
    setEtat({ type: 'envoi' });
    // Étape 2 notée sur le prospect (« création du compte commencée ») : sans effet s'il n'y a pas de prospect.
    await fetch('/api/essai/prospect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ etape: 'inscription', email }) }).catch(() => undefined);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: {
        emailRedirectTo: redirection(),
        ...(turnstile && jeton ? { captchaToken: jeton } : {}),
        data: {
          prenom: val('prenom').slice(0, 80),
          nom: val('nom').slice(0, 80),
          ville: val('ville').slice(0, 80),
          profession: 'pedicure-podologue',
          cgu_version: CGU_ESSAI_VERSION,
          conseils: f.get('conseils') === 'on',
          source: (params.get('utm_source') || prospect?.source || 'page-essai').slice(0, 80),
          utm,
        },
      },
    });
    if (error) {
      if (widget.current) window.turnstile?.reset(widget.current);
      setJeton(null);
      return setEtat({ type: 'erreur', message: messageErreur(error.message) });
    }
    try { sessionStorage.removeItem(CLE_PROSPECT); } catch { /* stockage indisponible */ }
    if (!data.session) return setEtat({ type: 'verifier', email });
    const r = await demarrerEssai();
    if (!r.ok) return setEtat({ type: 'erreur', message: r.message });
    router.push('/creer');
  }

  async function renvoyer(email: string) {
    setRenvoi('Envoi…');
    const { error } = await createClient().auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirection() } });
    setRenvoi(error ? 'Envoi impossible pour le moment. Réessayez dans une minute.' : 'E-mail renvoyé.');
  }

  if (etat.type === 'verifier') {
    return (
      <section className="grid gap-4 rounded-2xl border border-black/5 bg-white p-6 sm:p-8" aria-labelledby="titre-verifier">
        <h1 id="titre-verifier" className="text-2xl font-bold">Vérifiez vos e-mails</h1>
        <p className="text-neutral-700">Nous avons envoyé un lien de confirmation à <strong className="break-all">{etat.email}</strong>. Ouvrez-le pour commencer la création de votre site : vous arriverez directement sur la première étape.</p>
        <p className="text-sm text-neutral-600">Rien reçu après quelques minutes ? Regardez dans les indésirables, ou renvoyez l’e-mail.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => renvoyer(etat.email)} className="min-h-11 rounded-lg border border-teal-800 px-4 font-semibold text-teal-900 hover:bg-teal-50">Renvoyer l’e-mail</button>
          {renvoi && <span role="status" className="text-sm text-neutral-700">{renvoi}</span>}
        </div>
        <p className="text-sm text-neutral-600">Déjà confirmé ? <Link className="font-semibold text-teal-800 underline" href="/connexion">Connectez-vous</Link>.</p>
      </section>
    );
  }

  const envoi = etat.type === 'envoi';
  return (
    <section className="grid gap-5 rounded-2xl border border-black/5 bg-white p-6 sm:p-8" aria-labelledby="titre-inscription">
      {turnstile && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={afficherCaptcha} />}
      <div className="grid gap-1">
        <h1 id="titre-inscription" className="text-2xl font-bold">{prospect ? `Merci${prospect.prenom ? ` ${prospect.prenom}` : ''}, choisissez votre mot de passe` : 'Créer mon site d’essai'}</h1>
        <p className="text-neutral-700">{prospect ? 'Il servira à retrouver votre site et à le modifier. Ensuite, quelques questions guidées (environ 10 minutes).' : 'Gratuit pendant 3 mois, sans carte bancaire. Ensuite, quelques questions guidées.'}</p>
      </div>
      {compact && prospect && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-sm">
          <p className="min-w-0"><span className="font-semibold">{`${prospect.prenom} ${prospect.nom}`.trim()}</span>{prospect.ville ? ` · ${prospect.ville}` : ''}<span className="block break-all text-neutral-600">{prospect.email}</span></p>
          <button type="button" onClick={() => setModifier(true)} className="min-h-11 font-semibold text-teal-800 underline">Modifier</button>
        </div>
      )}
      <form onSubmit={envoyer} noValidate className="grid gap-4">
        <div hidden={compact} className="grid gap-4" key={prospect?.email || emailReprise || 'vide'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="prenom" className={etiquette}>Prénom</label>
            <input id="prenom" name="prenom" required autoComplete="given-name" maxLength={80} defaultValue={prospect?.prenom} className={champ} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="nom" className={etiquette}>Nom</label>
            <input id="nom" name="nom" required autoComplete="family-name" maxLength={80} defaultValue={prospect?.nom} className={champ} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="email" className={etiquette}>Adresse e-mail professionnelle</label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" maxLength={200} defaultValue={prospect?.email || emailReprise} className={champ} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="profession" className={etiquette}>Profession</label>
            <select id="profession" name="profession" defaultValue="pedicure-podologue" className={champ}>
              <option value="pedicure-podologue">Pédicure-podologue</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="ville" className={etiquette}>Ville du cabinet <span className="font-normal text-neutral-500">(facultatif)</span></label>
            <input id="ville" name="ville" autoComplete="address-level2" maxLength={80} defaultValue={prospect?.ville} className={champ} />
          </div>
        </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="motDePasse" className={etiquette}>Mot de passe</label>
          <div className="relative">
            <input id="motDePasse" name="motDePasse" type={voirMdp ? 'text' : 'password'} required minLength={8} autoComplete="new-password" aria-describedby="aide-mdp" className={`${champ} pr-24`} />
            <button type="button" onClick={() => setVoirMdp((v) => !v)} aria-pressed={voirMdp} className="absolute inset-y-0 right-0 min-w-20 px-3 text-sm font-semibold text-teal-800">{voirMdp ? 'Masquer' : 'Afficher'}</button>
          </div>
          <p id="aide-mdp" className="text-xs text-neutral-600">8 caractères au moins.</p>
        </div>
        <label className="flex items-start gap-3 text-sm text-neutral-800">
          <input type="checkbox" name="cgu" required className="mt-0.5 size-5 shrink-0 accent-teal-800" />
          <span>J’accepte les <Link href="/essai/cgu" target="_blank" className="font-semibold text-teal-800 underline">conditions de l’essai</Link> et j’ai lu la <Link href="/essai/confidentialite" target="_blank" className="font-semibold text-teal-800 underline">politique de confidentialité</Link>.</span>
        </label>
        {/* Choix des conseils déjà fait à l'étape 1 : case masquée mais transmise */}
        <label hidden={compact} className="flex items-start gap-3 text-sm text-neutral-800">
          <input type="checkbox" name="conseils" defaultChecked={prospect?.conseils} key={prospect ? 'p' : 'v'} className="mt-0.5 size-5 shrink-0 accent-teal-800" />
          <span>Je souhaite recevoir des conseils par e-mail pour mon site (facultatif, désinscription à tout moment).</span>
        </label>
        {turnstile && <div ref={cadre} className="min-h-16" />}
        <button type="submit" disabled={envoi} className="min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60">
          {envoi ? 'Création du compte…' : 'Créer mon compte et commencer'}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-red-700">{etat.type === 'erreur' ? etat.message : ''}</p>
      </form>
      <p className="text-sm text-neutral-600">Déjà inscrit ? <Link href="/connexion" className="font-semibold text-teal-800 underline">Se connecter</Link></p>
    </section>
  );
}
