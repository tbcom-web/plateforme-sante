'use client';

import { useEffect, useRef, useState } from 'react';
import type { ResultatExpress } from '@plateforme/core/audit-express';

// Test immédiat (score « lisible par ChatGPT ») puis demande de l'audit complet. Turnstile chargé à la première
// interaction avec le formulaire de contact (page rapide au premier affichage), comme /essai.

const ETAPES_CHARGEMENT = ['Lecture de votre page d’accueil…', 'Ce qu’un robot d’IA comprend de votre cabinet…', 'Vérification des accès de ChatGPT et Google…', 'Derniers contrôles…'];

export default function Testeur({ turnstile }: { turnstile: string | null }) {
  const [etat, setEtat] = useState<'saisie' | 'test' | 'resultat' | 'merci'>('saisie');
  const [erreur, setErreur] = useState('');
  const [etape, setEtape] = useState(0);
  const [r, setR] = useState<ResultatExpress | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const jeton = useRef<string | null>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const charge = useRef(false);
  const resultat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (etat !== 'test') return;
    const t = setInterval(() => setEtape((e) => Math.min(e + 1, ETAPES_CHARGEMENT.length - 1)), 1600);
    return () => clearInterval(t);
  }, [etat]);
  useEffect(() => { if (etat === 'resultat' || etat === 'merci') resultat.current?.focus(); }, [etat]);

  async function tester(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const domaine = String(new FormData(e.currentTarget).get('domaine') ?? '').trim();
    if (!domaine) return;
    setErreur(''); setEtape(0); setEtat('test');
    try {
      const rep = await fetch('/api/audit-gratuit/express', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domaine }) });
      const j = (await rep.json()) as { ok: boolean; message?: string; resultat?: ResultatExpress };
      if (!j.ok || !j.resultat) { setErreur(j.message ?? 'Test impossible pour le moment.'); setEtat('saisie'); return; }
      setR(j.resultat); setEtat('resultat');
    } catch { setErreur('Test impossible pour le moment : vérifiez votre connexion.'); setEtat('saisie'); }
  }

  const chargerCaptcha = () => {
    if (!turnstile || charge.current) return;
    charge.current = true;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => {
      if (!cadre.current || !window.turnstile) return;
      window.turnstile.render(cadre.current, {
        sitekey: turnstile, language: 'fr', size: 'flexible',
        callback: (t) => { jeton.current = t; }, 'expired-callback': () => { jeton.current = null; }, 'error-callback': () => { jeton.current = null; },
      });
    };
    document.head.appendChild(s);
  };

  async function demander(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!r) return;
    const f = new FormData(e.currentTarget);
    setErreur(''); setEnvoi(true);
    try {
      const rep = await fetch('/api/audit-gratuit/demande', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          domaine: r.domaine, prenom: f.get('prenom'), nom: f.get('nom'), email: f.get('email'), telephone: f.get('telephone'),
          recontact: f.get('recontact') === 'on', site_web: f.get('site_web'), turnstile: jeton.current,
          express: { scoreIA: r.scoreIA, totalIA: r.totalIA, aAmeliorer: r.aAmeliorer, ville: r.ville },
        }),
      });
      const j = (await rep.json()) as { ok: boolean; message: string };
      if (!j.ok) { setErreur(j.message); return; }
      setEtat('merci');
    } catch { setErreur('Envoi impossible pour le moment : vérifiez votre connexion.'); } finally { setEnvoi(false); }
  }

  if (etat === 'merci') {
    return (
      <div ref={resultat} tabIndex={-1} className="rounded-3xl bg-[#cfeee3] p-6 outline-none sm:p-8">
        <p className="ag-titre text-3xl">C’est noté, merci.</p>
        <p className="mt-3 text-[#3d4542]">Nous préparons votre audit complet et un site à votre nom, mesuré avec les mêmes tests. Votre conseillère vous l’envoie et vous appelle sous 24 heures ouvrées pour le parcourir avec vous.</p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={tester} className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-[#111614] bg-white p-2 sm:flex-row">
        <label htmlFor="domaine" className="sr-only">Adresse de votre site</label>
        <input id="domaine" name="domaine" required placeholder="votre-cabinet.fr" autoComplete="url" inputMode="url" spellCheck={false}
          className="min-h-12 min-w-0 flex-1 rounded-xl px-3 text-lg outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a6a]" />
        <button disabled={etat === 'test'} className="min-h-12 rounded-xl bg-[#111614] px-6 font-semibold text-white disabled:opacity-70">
          {etat === 'test' ? 'Test en cours…' : 'Tester mon site'}
        </button>
      </form>
      {etat === 'test' && <p role="status" className="mt-3 text-sm text-[#5c6461]">{ETAPES_CHARGEMENT[etape]}</p>}
      {erreur && etat !== 'resultat' && <p role="alert" className="mt-3 text-sm font-medium text-[#8a4b00]">{erreur}</p>}
      {etat === 'saisie' && !erreur && <p className="mt-3 text-sm text-[#5c6461]">Gratuit, sans inscription. Nous lisons uniquement ce qui est public sur votre site.</p>}

      {etat === 'resultat' && r && (
        <div ref={resultat} tabIndex={-1} className="mt-6 grid gap-4 outline-none">
          <div className="rounded-3xl bg-[#111614] p-6 text-white sm:p-8">
            <p className="text-sm font-semibold text-[#8fe0c9]">{r.domaine}</p>
            <p className="ag-titre mt-2 text-3xl sm:text-4xl">
              ChatGPT peut lire <span className={r.scoreIA >= 6 ? 'text-[#8fe0c9]' : 'text-[#ffc46b]'}>{r.scoreIA} informations sur {r.totalIA}</span> de votre cabinet.
            </p>
            <ul className="mt-5 grid gap-1 sm:grid-cols-2 sm:gap-x-6">
              {r.lisibleIA.map((c) => (
                <li key={c.libelle} className="flex items-center gap-2.5 border-t border-[#2a3330] py-2 text-[15px]">
                  <span aria-hidden className={`grid size-5 flex-none place-items-center rounded-full text-[11px] font-bold text-[#111614] ${c.ok ? 'bg-[#8fe0c9]' : 'bg-[#ffc46b]'}`}>{c.ok ? '✓' : '✕'}</span>
                  {c.libelle}<span className="sr-only">{c.ok ? ' : lisible' : ' : introuvable'}</span>
                </li>
              ))}
            </ul>
          </div>
          {r.constats.some((c) => !c.ok) && (
            <div className="rounded-3xl bg-[#fff3dc] p-6">
              <p className="font-semibold">Premiers points relevés</p>
              <ul className="mt-2 grid gap-2">
                {r.constats.filter((c) => !c.ok).map((c) => <li key={c.titre} className="text-[15px] text-[#3d4542]"><b className="text-[#6e4100]">{c.titre} :</b> {c.detail}</li>)}
              </ul>
            </div>
          )}
          <form onSubmit={demander} onFocus={chargerCaptcha} className="rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
            <p className="ag-titre text-2xl sm:text-3xl">Recevez votre audit complet, et votre futur site.</p>
            <p className="mt-2 text-[#5c6461]">49 contrôles (vitesse, téléphone, Google, ChatGPT, sécurité, conformité) et un site déjà préparé à votre nom, mesuré avec les mêmes tests. Offert, sans engagement.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([['prenom', 'Prénom', 'given-name', 'text'], ['nom', 'Nom', 'family-name', 'text'], ['email', 'E-mail', 'email', 'email'], ['telephone', 'Téléphone', 'tel', 'tel']] as const).map(([n, l, ac, t]) => (
                <label key={n} className="text-sm font-medium">{l}
                  <input name={n} type={t} required autoComplete={ac} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-base" />
                </label>
              ))}
            </div>
            <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden"><label>Site web<input name="site_web" tabIndex={-1} autoComplete="off" /></label></div>
            <label className="mt-4 flex items-start gap-2 text-sm text-[#3d4542]">
              <input type="checkbox" name="recontact" required className="mt-1 size-4" />
              <span>J’accepte d’être recontacté(e) au sujet de mon audit et de mon site (<a href="/essai/confidentialite" className="underline underline-offset-2">confidentialité</a>).</span>
            </label>
            <div ref={cadre} className="mt-3" />
            {erreur && <p role="alert" className="mt-3 text-sm font-medium text-[#8a4b00]">{erreur}</p>}
            <button disabled={envoi} className="mt-4 min-h-12 w-full rounded-xl bg-[#111614] px-6 font-semibold text-white disabled:opacity-70 sm:w-auto">
              {envoi ? 'Envoi…' : 'Recevoir mon audit complet'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
