'use client';

// Suivi d'une publication, affiché partout où l'on publie (parcours /creer, /mon-site, tableau de bord, édition visuelle,
// admin). Étapes réelles du workflow (route /api/sites/[id]/publication) : rien d'inventé, ni pourcentage ni durée.
// « En ligne » n'est annoncé qu'une fois la nouvelle version servie par le site. La page peut être quittée : l'état est en
// base, le suivi reprend au retour (tableau de bord).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VueSuivi } from '@plateforme/core';

type Reponse = VueSuivi & { lien: string | null; journal?: string | null };
type Resultat = { ok: boolean; message: string } | null | void;

/** Intervalle d'interrogation : le workflow dure environ une minute, ses étapes 2 à 15 secondes. */
const INTERVALLE_MS = 2_500;

function Pastille({ etat }: { etat: 'faite' | 'en_cours' | 'a_venir' }) {
  if (etat === 'faite') {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-teal-700 text-white" aria-hidden="true">
        <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7" /></svg>
      </span>
    );
  }
  if (etat === 'en_cours') {
    return <span className="size-5 shrink-0 rounded-full border-2 border-teal-200 border-t-teal-700 motion-safe:animate-spin" aria-hidden="true" />;
  }
  return <span className="size-5 shrink-0 rounded-full border-2 border-neutral-200" aria-hidden="true" />;
}

export default function SuiviPublication({
  siteId,
  reessayer,
  onFermer,
  className = '',
}: {
  siteId: string;
  /** Relance la publication (même action que le bouton d'origine) ; sans elle, l'échec renvoie au bouton de la page */
  reessayer?: () => Promise<Resultat>;
  /** Bouton « Fermer » une fois la publication terminée */
  onFermer?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [vue, setVue] = useState<Reponse | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const [relance, setRelance] = useState<{ enCours: boolean; message?: string }>({ enCours: false });
  const [tour, setTour] = useState(0);
  const termine = Boolean(vue?.termine);
  const dejaTermine = useRef<boolean | null>(null);

  const interroger = useCallback(async () => {
    try {
      const r = await fetch(`/api/sites/${siteId}/publication`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error(String(r.status));
      setVue((await r.json()) as Reponse);
      setHorsLigne(false);
    } catch {
      setHorsLigne(true);
    }
  }, [siteId]);

  // Interrogation toutes les 2,5 s tant que la publication n'est pas terminée ; en pause quand l'onglet est caché.
  useEffect(() => {
    if (termine) return;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let actif = true;
    const boucle = async () => {
      if (!actif) return;
      if (document.visibilityState === 'visible') await interroger();
      if (actif) minuterie = setTimeout(boucle, INTERVALLE_MS);
    };
    const auRetour = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(minuterie);
      boucle();
    };
    boucle();
    document.addEventListener('visibilitychange', auRetour);
    return () => {
      actif = false;
      clearTimeout(minuterie);
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, [termine, interroger, tour]);

  // Fin de publication observée pendant le suivi : la page (statut, pastilles) se met à jour.
  useEffect(() => {
    if (!vue) return;
    if (dejaTermine.current === false && termine) router.refresh();
    dejaTermine.current = termine;
  }, [vue, termine, router]);

  const relancer = async () => {
    if (!reessayer) return;
    setRelance({ enCours: true });
    const r = await reessayer();
    if (r && !r.ok) {
      setRelance({ enCours: false, message: r.message });
      return;
    }
    setRelance({ enCours: false });
    setVue(null);
    dejaTermine.current = false;
    setTour((t) => t + 1);
  };

  if (!vue) {
    return (
      <div className={`rounded-xl border border-black/5 bg-white p-4 text-sm text-neutral-600 ${className}`} role="status" aria-live="polite">
        {horsLigne ? 'Connexion au suivi de publication…' : 'Publication en cours…'}
      </div>
    );
  }
  if (vue.phase === 'aucune') return null;

  const enLigne = vue.phase === 'en_ligne' || vue.phase === 'en_ligne_propagation';
  const echec = vue.phase === 'echec';

  return (
    <section
      aria-label="Suivi de la publication"
      className={`grid gap-3 rounded-xl border p-4 text-sm ${echec ? 'border-red-200 bg-red-50/60' : enLigne ? 'border-teal-200 bg-teal-50/60' : 'border-black/5 bg-white'} ${className}`}
    >
      <div className="flex items-start gap-3">
        {enLigne && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-700 text-white motion-safe:animate-[apparition_400ms_ease-out]" aria-hidden="true">
            <svg viewBox="0 0 16 16" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7" /></svg>
          </span>
        )}
        <div className="grid gap-0.5" role="status" aria-live="polite">
          <p className={`font-semibold ${echec ? 'text-red-900' : enLigne ? 'text-teal-900' : 'text-neutral-900'}`}>{vue.titre}</p>
          {vue.detail && <p className={echec ? 'text-red-900' : 'text-neutral-600'}>{vue.detail}</p>}
        </div>
      </div>

      {!echec && !enLigne && (
        <>
          <div
            role="progressbar"
            aria-label="Avancement de la publication"
            aria-valuemin={0}
            aria-valuemax={vue.total}
            aria-valuenow={vue.faites}
            aria-valuetext={`${vue.faites} étape${vue.faites > 1 ? 's' : ''} sur ${vue.total}`}
            className="h-1.5 overflow-hidden rounded-full bg-neutral-100"
          >
            <div className="h-full rounded-full bg-teal-700 transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${Math.max(4, (vue.faites / vue.total) * 100)}%` }} />
          </div>
          <ol className="grid gap-2">
            {vue.etapes.map((e) => (
              <li key={e.id} className={`flex items-center gap-2.5 ${e.etat === 'a_venir' ? 'text-neutral-400' : e.etat === 'en_cours' ? 'font-medium text-neutral-900' : 'text-neutral-700'}`}>
                <Pastille etat={e.etat} />
                <span>{e.libelle}</span>
                <span className="sr-only">{e.etat === 'faite' ? ' : terminé' : e.etat === 'en_cours' ? ' : en cours' : ' : à venir'}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-neutral-500">Vous pouvez quitter cette page : la publication continue, et son suivi reprend sur le tableau de bord.</p>
        </>
      )}

      {enLigne && vue.lien && (
        <div className="flex flex-wrap items-center gap-3">
          <a href={vue.lien} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">
            Voir mon site ↗
          </a>
          <span className="break-all text-xs text-neutral-600">{vue.lien.replace(/^https:\/\//, '')}</span>
        </div>
      )}

      {echec && (
        <div className="flex flex-wrap items-center gap-3">
          {reessayer ? (
            <button type="button" onClick={relancer} disabled={relance.enCours} className="min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
              {relance.enCours ? 'Relance…' : 'Réessayer'}
            </button>
          ) : (
            <span className="text-red-900">Vous pouvez relancer la publication ; si l’échec se répète, contactez-nous.</span>
          )}
          {relance.message && <span className="text-red-800">{relance.message}</span>}
        </div>
      )}

      {(vue.journal || (onFermer && vue.termine)) && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {vue.journal && <a href={vue.journal} target="_blank" rel="noopener" className="text-teal-800 underline underline-offset-2">Journal technique</a>}
          {onFermer && vue.termine && (
            <button type="button" onClick={onFermer} className="ml-auto min-h-9 rounded px-2 font-semibold text-neutral-600 hover:bg-neutral-100">Fermer</button>
          )}
        </div>
      )}
    </section>
  );
}
