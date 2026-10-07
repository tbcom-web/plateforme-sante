'use client';

// Vignettes des recettes (demande de Paul du 2026-10-07 : « pour les recettes enregistrées, c'est important qu'on ait un aperçu »).
// Chaque carte de « Mes recettes » montre l'accueil en mini-aperçu ordinateur + téléphone côte à côte, rendus par le MÊME moteur
// que le studio (ApercuTheme, dans son cadre iframe), en lecture seule, avec le scénario de la recette (sujets, couleurs, soins).
// Chargement paresseux : un aperçu n'est monté que pour une carte visible, et au plus APERCUS_VIVANTS cartes à la fois (les plus
// récemment apparues) ; les autres montrent une vignette figée légère (pastilles de la gamme, police, style) jusqu'à leur tour.
// Image figée enregistrée : NON (une capture navigateur fidèle demanderait de rasteriser l'iframe — polices, SVG, filtres —, trop
// fragile sans dépendance lourde) ; l'aperçu vivant paresseux en tient lieu (documenté dans retours/CHANGEMENTS.md).
// Survol / toucher : « Ouvrir dans le Studio » et « Voir en grand » (toutes les pages du client, ordinateur / téléphone).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  draftPourOnglet, gamme as gammeParId, libelleScenario, libelleTraitementPhotos, LIBELLES_STYLES, ongletsDuScenario, pairePolices, scenarioDeRecette, vueDePage,
  type MarqueImportee, type ModeleManifeste, type PageStructure, type Recette, type SiteDraft,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import type { SoinCatalogue } from '@/lib/sites';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
export const APERCUS_VIVANTS = 3;

// ---- Jetons d'aperçu vivant (partagés par toutes les cartes de la page) ----
let actifs: string[] = [];
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());
const demander = (id: string) => { actifs = [id, ...actifs.filter((x) => x !== id)].slice(0, APERCUS_VIVANTS); prevenir(); };
const rendre = (id: string) => { if (actifs.includes(id)) { actifs = actifs.filter((x) => x !== id); prevenir(); } };
const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };

function useVivant(id: string) {
  const ref = useRef<HTMLDivElement>(null);
  const vivant = useSyncExternalStore(abonner, () => actifs.includes(id), () => false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? demander(id) : rendre(id)), { rootMargin: '120px' });
    io.observe(el);
    return () => { io.disconnect(); rendre(id); };
  }, [id]);
  return { ref, vivant };
}

type Apercu = { draft: SiteDraft; modele: ModeleManifeste };

type Props = {
  recette: Recette;
  apercu: Apercu | null;
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
  onOuvrir: () => void;
  children?: React.ReactNode;
};

/** Pastilles de la gamme (vignette figée et carte) */
export function PastillesGamme({ gamme, couleur }: { gamme: string; couleur: string }) {
  const g = gammeParId(gamme);
  const teintes = g ? [g.accent, g.vif ?? g.accentFonce, g.duo ?? g.plan, g.fondDoux] : [couleur];
  return <span className="flex gap-0.5" aria-label={g ? `Gamme ${g.nom}` : `Couleur libre ${couleur}`}>{teintes.map((t, i) => <span key={i} aria-hidden="true" className="size-4 rounded-full ring-1 ring-black/10" style={{ background: t }} />)}</span>;
}

export default function RecetteVignette({ recette: r, apercu, catalogue, marquesImportees, themesActives, onOuvrir, children }: Props) {
  const { ref, vivant } = useVivant(r.id);
  const [grand, setGrand] = useState(false);
  const x = r.composition;
  const scenario = scenarioDeRecette(r);
  const g = gammeParId(x.gamme);
  return (
    <li className={`grid content-start gap-2 rounded-xl border p-3 ${r.statut === 'archivee' ? 'border-dashed border-neutral-300 opacity-70' : 'border-black/10'}`}>
      <div ref={ref} className="group relative grid grid-cols-[minmax(0,1fr)_86px] gap-2 overflow-hidden rounded-lg bg-neutral-100 p-1.5" style={{ height: 178 }}>
        {vivant && apercu ? (
          <>
            <div className="pointer-events-none min-w-0 overflow-hidden rounded-md" aria-hidden="true"><ApercuTheme vignette={164} sansCommandes appareil="bureau" draft={apercu.draft} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} /></div>
            <div className="pointer-events-none overflow-hidden rounded-md" aria-hidden="true"><ApercuTheme vignette={164} sansCommandes appareil="mobile" draft={apercu.draft} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} /></div>
          </>
        ) : (
          <div className="col-span-2 grid place-items-center gap-1 rounded-md text-center text-xs text-neutral-600" style={{ background: g?.fondDoux ?? '#f4f4f5' }}>
            <span className="grid gap-1 justify-items-center">
              <PastillesGamme gamme={x.gamme} couleur={x.couleur} />
              <span className="text-sm font-semibold" style={{ color: g?.accent ?? x.couleur }}>{pairePolices(x.police)?.nom}</span>
              <span>Aperçu à l’approche de l’écran</span>
            </span>
          </div>
        )}
        <div className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap justify-center gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <button type="button" onClick={onOuvrir} className={`min-h-11 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white shadow ${focus}`}>Ouvrir dans le Studio</button>
          <button type="button" onClick={() => setGrand(true)} disabled={!apercu} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold shadow ${focus}`}>Voir en grand</button>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2"><strong className="min-w-0">{r.nom}</strong><span className="shrink-0 text-sm">{r.note ? `${r.note}★` : 'non notée'}</span></div>
      <p className="text-xs text-neutral-700">{libelleScenario(scenario)}{r.etiquettes.length ? ` · ${r.etiquettes.join(', ')}` : ''}</p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
        <PastillesGamme gamme={x.gamme} couleur={x.couleur} />
        <span>{g?.nom ?? `couleur libre ${x.couleur}`}</span>·<span>{pairePolices(x.police)?.nom ?? x.police}</span>·<span>{LIBELLES_STYLES[x.visuels.style]?.nom}</span>·<span>photos : {libelleTraitementPhotos(x.traitement)}</span>
      </p>
      {children}
      {grand && apercu && <VoirEnGrand recette={r} apercu={apercu} catalogue={catalogue} marquesImportees={marquesImportees} themesActives={themesActives} onFermer={() => setGrand(false)} />}
    </li>
  );
}

/** « Voir en grand » : toutes les pages du client de la recette, ordinateur ou téléphone (lecture seule) */
function VoirEnGrand({ recette, apercu, catalogue, marquesImportees, themesActives, onFermer }: { recette: Recette; apercu: Apercu; catalogue: SoinCatalogue[]; marquesImportees: MarqueImportee[]; themesActives: string[]; onFermer: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const onglets = ongletsDuScenario(scenarioDeRecette(recette), catalogue, { themesActives });
  const [id, setId] = useState('accueil');
  const [appareil, setAppareil] = useState<'bureau' | 'mobile'>('bureau');
  const o = onglets.find((x) => x.id === id) ?? onglets[0];
  useEffect(() => { dlg.current?.showModal(); }, []);
  return (
    <dialog ref={dlg} onClose={onFermer} aria-label={`Recette « ${recette.nom} » en grand`} className="m-auto h-[94vh] w-[min(1200px,96vw)] max-w-none rounded-2xl p-0 backdrop:bg-black/50">
      <div className="grid h-full grid-rows-[auto_auto_minmax(0,1fr)] gap-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{recette.nom}</h2>
          <span className="flex gap-1">
            {(['bureau', 'mobile'] as const).map((a) => <button key={a} type="button" aria-pressed={appareil === a} onClick={() => setAppareil(a)} className={`min-h-11 rounded-lg border px-3 text-sm ${focus} ${appareil === a ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white'}`}>{a === 'bureau' ? 'Ordinateur' : 'Téléphone'}</button>)}
            <button type="button" onClick={() => dlg.current?.close()} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold ${focus}`}>Fermer</button>
          </span>
        </div>
        <div role="tablist" aria-label="Pages du client" className="flex gap-1 overflow-x-auto pb-1">
          {onglets.map((x) => <button key={x.id} type="button" role="tab" aria-selected={x.id === o.id} onClick={() => setId(x.id)} className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm ${focus} ${x.id === o.id ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-200 bg-white'}`}>{x.nom}</button>)}
        </div>
        <div className={`min-h-0 overflow-auto ${appareil === 'mobile' ? 'mx-auto w-full max-w-[420px]' : ''}`}>
          <ApercuTheme key={`${o.id}|${appareil}`} sansCommandes appareil={appareil} vueInitiale={vueDePage(o.page as PageStructure)} draft={draftPourOnglet(apercu.draft, o)} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />
        </div>
      </div>
    </dialog>
  );
}
