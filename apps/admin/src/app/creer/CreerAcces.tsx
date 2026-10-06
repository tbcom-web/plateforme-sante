'use client';

// « Créez votre accès pour voir et garder votre site » : conversion du compte ANONYME en compte permanent, depuis le
// navigateur (auth.updateUser, clé publique seulement) : e-mail lié, mot de passe, CGU de l'essai acceptées (case
// obligatoire, version enregistrée dans les métadonnées puis dans la table essais par creer_acces_essai).
// - Confirmation d'e-mail désactivée dans Supabase : accès créé tout de suite → « Voir mon site » (aperçu privé).
// - Confirmation activée : écran « Vérifiez vos e-mails » ; le lien (modèle « Change email address ») ramène sur
//   /auth/callback?next=/essai/acces, qui enregistre les CGU puis rouvre /creer?etape=fin. Si Supabase refuse le mot de
//   passe tant que l'e-mail n'est pas confirmé, il est demandé à nouveau au retour (mode « mdp »).
// - Adresse déjà utilisée par un compte : message clair (le brouillon reste lié à cette session ; la conseillère peut
//   le rattacher au compte existant).
import { useState } from 'react';
import Link from 'next/link';
import { CGU_ESSAI_VERSION } from '@plateforme/core';
import { createClient } from '@/lib/supabase/client';

const champ = 'h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';
const etiquette = 'text-sm font-medium text-neutral-800';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Etat =
  | { type: 'saisie'; message?: string }
  | { type: 'envoi' }
  | { type: 'verifier'; email: string }
  | { type: 'existant'; email: string };

function messageErreur(m: string): string {
  if (/password/i.test(m) && /(weak|short|characters|least)/i.test(m)) return 'Mot de passe trop faible : 8 caractères au moins, avec lettres et chiffres.';
  if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (/invalid.*email|email.*invalid/i.test(m)) return 'Adresse e-mail invalide.';
  return 'Votre accès n’a pas pu être créé. Réessayez dans un instant.';
}

const existe = (e: { code?: string; message: string }) => e.code === 'email_exists' || /already (been )?registered|already exists|already in use/i.test(e.message);

export default function CreerAcces({
  email: emailInitial, mode, onFinaliser, onTermine,
}: {
  email: string;
  /** « creer » : session anonyme (e-mail, mot de passe, CGU) ; « mdp » : e-mail confirmé, mot de passe à choisir */
  mode: 'creer' | 'mdp';
  onFinaliser: () => Promise<{ ok: boolean; message: string }>;
  onTermine: () => void;
}) {
  const [etat, setEtat] = useState<Etat>({ type: 'saisie' });
  const [voir, setVoir] = useState(false);
  const [renvoi, setRenvoi] = useState<string | null>(null);
  const redirection = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent('/essai/acces')}`;

  async function terminer() {
    const supabase = createClient();
    await supabase.auth.refreshSession().catch(() => undefined);
    const f = await onFinaliser();
    if (!f.ok) return setEtat({ type: 'saisie', message: f.message });
    onTermine();
  }

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') ?? emailInitial).trim().toLowerCase();
    const motDePasse = String(f.get('motDePasse') ?? '');
    if (mode === 'creer' && !EMAIL.test(email)) return setEtat({ type: 'saisie', message: 'Adresse e-mail invalide.' });
    if (motDePasse.length < 8) return setEtat({ type: 'saisie', message: 'Le mot de passe doit faire 8 caractères au moins.' });
    if (mode === 'creer' && f.get('cgu') !== 'on') return setEtat({ type: 'saisie', message: 'Acceptez les conditions de l’essai pour créer votre accès.' });
    setEtat({ type: 'envoi' });
    const supabase = createClient();

    if (mode === 'mdp') {
      const { error } = await supabase.auth.updateUser({ password: motDePasse, data: { mot_de_passe: true } });
      if (error) return setEtat({ type: 'saisie', message: messageErreur(error.message) });
      return terminer();
    }

    const cgu = { cgu_version: CGU_ESSAI_VERSION, cgu_acceptees_le: new Date().toISOString() };
    const options = { emailRedirectTo: redirection() };
    let mdpEnAttente = false;
    let r = await supabase.auth.updateUser({ email, password: motDePasse, data: { ...cgu, mot_de_passe: true } }, options);
    // Certains réglages refusent le mot de passe d'un compte anonyme avant la confirmation de l'e-mail : e-mail d'abord.
    if (r.error && !existe(r.error) && /anonymous/i.test(r.error.message)) {
      mdpEnAttente = true;
      r = await supabase.auth.updateUser({ email, data: { ...cgu, mot_de_passe: false } }, options);
    }
    if (r.error) {
      if (existe(r.error)) return setEtat({ type: 'existant', email });
      return setEtat({ type: 'saisie', message: messageErreur(r.error.message) });
    }
    const user = r.data.user;
    if (user && !user.is_anonymous && (user.email ?? '').toLowerCase() === email) {
      if (mdpEnAttente) {
        const m = await supabase.auth.updateUser({ password: motDePasse, data: { mot_de_passe: true } });
        if (m.error) return setEtat({ type: 'saisie', message: messageErreur(m.error.message) });
      }
      return terminer();
    }
    // Confirmation de l'e-mail activée : l'adresse sera liée quand le lien sera ouvert.
    setEtat({ type: 'verifier', email });
  }

  async function renvoyer(email: string) {
    setRenvoi('Envoi…');
    const { error } = await createClient().auth.resend({ type: 'email_change', email, options: { emailRedirectTo: redirection() } });
    setRenvoi(error ? 'Envoi impossible pour le moment. Réessayez dans une minute.' : 'E-mail renvoyé.');
  }

  if (etat.type === 'verifier') {
    return (
      <div className="grid gap-3" role="status">
        <h3 className="text-lg font-semibold">Vérifiez vos e-mails</h3>
        <p className="text-sm text-neutral-700">Un lien de confirmation a été envoyé à <strong className="break-all">{etat.email}</strong>. Ouvrez-le pour terminer : votre accès sera créé et votre site vous attendra.</p>
        <p className="text-sm text-neutral-600">Rien reçu après quelques minutes ? Regardez dans les indésirables, ou renvoyez l’e-mail.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => renvoyer(etat.email)} className="min-h-11 rounded-lg border border-teal-800 px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50">Renvoyer l’e-mail</button>
          {renvoi && <span className="text-sm text-neutral-700">{renvoi}</span>}
        </div>
      </div>
    );
  }

  if (etat.type === 'existant') {
    return (
      <div className="grid gap-3" role="alert">
        <h3 className="text-lg font-semibold">Vous avez déjà un compte</h3>
        <p className="text-sm text-neutral-700">Un compte existe déjà avec <strong className="break-all">{etat.email}</strong> : connectez-vous pour retrouver votre espace.</p>
        <p className="text-sm text-neutral-700">Le site commencé ici reste enregistré, mais il n’est pas encore relié à ce compte : en vous connectant, vous quittez ce brouillon sur ce navigateur. Votre conseillère peut le rattacher à votre compte ; elle a vos coordonnées et vous recontacte.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/connexion" className="inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900">Me connecter</Link>
          <button type="button" onClick={() => setEtat({ type: 'saisie' })} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-teal-800 underline">Utiliser une autre adresse</button>
        </div>
      </div>
    );
  }

  const envoi = etat.type === 'envoi';
  return (
    <form onSubmit={envoyer} noValidate className="grid gap-3.5">
      {mode === 'creer' && (
        <div className="grid gap-1">
          <label htmlFor="acces-email" className={etiquette}>Adresse e-mail</label>
          <input id="acces-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={200} defaultValue={emailInitial} className={champ} />
        </div>
      )}
      <div className="grid gap-1">
        <label htmlFor="acces-mdp" className={etiquette}>{mode === 'mdp' ? 'Choisissez votre mot de passe' : 'Mot de passe'}</label>
        <div className="relative">
          <input id="acces-mdp" name="motDePasse" type={voir ? 'text' : 'password'} minLength={8} autoComplete="new-password" aria-describedby="acces-aide-mdp" className={`${champ} pr-24`} />
          <button type="button" onClick={() => setVoir((v) => !v)} aria-pressed={voir} className="absolute inset-y-0 right-0 min-w-20 px-3 text-sm font-semibold text-teal-800">{voir ? 'Masquer' : 'Afficher'}</button>
        </div>
        <p id="acces-aide-mdp" className="text-xs text-neutral-600">8 caractères au moins. Il sert à retrouver et modifier votre site.</p>
      </div>
      {mode === 'creer' && (
        <label className="flex items-start gap-3 text-sm text-neutral-800">
          <input type="checkbox" name="cgu" className="mt-0.5 size-5 shrink-0 accent-teal-800" />
          <span>J’accepte les <Link href="/essai/cgu" target="_blank" className="font-semibold text-teal-800 underline">conditions de l’essai</Link> et j’ai lu la <Link href="/essai/confidentialite" target="_blank" className="font-semibold text-teal-800 underline">politique de confidentialité</Link>.</span>
        </label>
      )}
      <button type="submit" disabled={envoi} className="min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60">
        {envoi ? 'Création de l’accès…' : mode === 'mdp' ? 'Enregistrer le mot de passe' : 'Créer mon accès'}
      </button>
      <p role="status" aria-live="polite" className="text-sm text-red-700 empty:hidden">{etat.type === 'saisie' ? etat.message ?? '' : ''}</p>
    </form>
  );
}
