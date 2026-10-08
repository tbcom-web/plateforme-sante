'use client';

// Tuile « Recettes complètes » (/admin/retours/recettes, demande de Paul du 2026-10-08). Une recette entière à la fois :
// - bandeau « Vous notez : la recette complète (thème entier) — <scénario> » et liste compacte de ses ingrédients (palette, polices,
//   style, premier écran…), pour que les étiquettes Pour / Contre ciblées soient évidentes ;
// - aperçus ordinateur + téléphone côte à côte sur grand écran (bascule sinon), page entière défilable (ApercuTheme → CadreApercu,
//   même rendu que le Studio) et onglets des pages du scénario ;
// - étoiles 1-5 (touches 1-5), Pour / Contre (champ court + étiquettes rapides), « Garder cette recette », « Ouvrir dans le Studio »,
//   « Suivant » (Entrée).
// Source : genererCandidates (packages/core/src/notation-recettes.ts, sans Claude) pour les scénarios types et ceux de Paul, et les
// propositions de Claude (retours/recettes-proposees.json) comme une source parmi d'autres. Onglet « Ce que le système a appris » :
// palmarès auto-noté (ingrédients, combinaisons, familles, à éviter) par sujet.
// Sans la migration 0038 : notes gardées dans ce navigateur (localStorage).
import '@plateforme/core/dessins.css';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  appliquerRecette, cleRecetteNotee, contexteScenario, draftPourOnglet, ETIQUETTES_POUR_CONTRE, gamme as gammeParId, jeuEffets, contexteImages, executerDemandeGeneration, type DemandeGeneration,
  libelleScenario, libelleTraitementPhotos, LIBELLES_SOURCES_NOTATION, LIBELLES_STRUCTURES, LIBELLES_STYLES, LIBELLES_VARIANTES, lireDimension, modeleIntegre,
  nomRecette, nomValeurHarmonie, normaliserComposition, ongletsDuScenario, pairePolices, scorePredit, serialiserComposition, SURFACES_CSS, sujetsDuScenario,
  SUJETS_VISUELS, variablesCharte, variablesGamme, vueDePage,
  type CandidateRecette, type CompositionRecette, type MarqueImportee, type ModeleManifeste, type PageStructure, type Palmares, type PhotoBanque, type PoidsAtelier,
  type ScenarioRecette, type StatsNotation, type Univers,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import { draftStudio } from '@/components/ApercuStudio';
import type { PropositionClaude } from '@/lib/directeur-format';
import type { SoinCatalogue } from '@/lib/sites';
import ChoixModeTirage, { useModeTirage } from '@/components/ModeTirage';
import { noterRecetteComplete } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const CLE_LOCAUX = 'recettes-notation:locaux';
/** Clé sessionStorage lue par le Studio (?generee=<clé>) : composition et scénario à ouvrir */
export const CLE_OUVRIR_STUDIO = 'studio:ouvrir-recette';
const libelleSujet = (id: string) => (id === '*' ? 'Tous les sujets' : SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id);

type Item = CandidateRecette & { sourceId?: string | null };
type Locale = { cle: string; note: number | null; garder: boolean; le: string };

type Props = {
  scenarios: { id: string; libelle: string; scenario: ScenarioRecette }[];
  propositions: PropositionClaude[];
  notees: string[];
  resume: { notes: number; gardees: number; apprises: number };
  stats: StatsNotation;
  palmares: Palmares[];
  refusees: string[];
  aValider: string[];
  migrationManquante: boolean;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
  poids: PoidsAtelier | null;
  photos: PhotoBanque[];
};

function lireLocaux(): Locale[] {
  try { const l = JSON.parse(localStorage.getItem(CLE_LOCAUX) ?? '[]'); return Array.isArray(l) ? l : []; } catch { return []; }
}

function useLargeur() {
  const [l, setL] = useState({ large: false, etroit: false, h: 640 });
  useEffect(() => {
    const f = () => setL({ large: window.innerWidth >= 1200, etroit: window.innerWidth < 768, h: Math.max(380, window.innerHeight - (window.innerWidth < 768 ? 300 : 360)) });
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return l;
}

/** Ingrédients lisibles d'une recette (bandeau « Vous notez ») ; `id` = étiquette Pour / Contre qui vise cette dimension */
function ingredientsLisibles(x: CompositionRecette): { id: string; nom: string; valeur: string }[] {
  const v = (d: string) => lireDimension(x, d);
  const accueil = x.sections.variantes.accueil;
  return [
    { id: 'couleurs', nom: 'Palette', valeur: x.gamme ? gammeParId(x.gamme)?.nom ?? x.gamme : `couleur libre ${x.couleur}` },
    { id: 'polices', nom: 'Polices', valeur: pairePolices(x.police)?.nom ?? x.police },
    { id: 'typo', nom: 'Typographie', valeur: (['typo.echelle', 'typo.casse'] as const).flatMap((d) => (v(d) ? [nomValeurHarmonie(d, v(d)!)] : [])).join(', ') || 'du modèle' },
    { id: 'illustrations', nom: 'Style', valeur: LIBELLES_STYLES[x.visuels.style]?.nom ?? x.visuels.style },
    ...(x.visuels.style === 'photos' ? [{ id: 'photos', nom: 'Photos', valeur: `${x.photos.length} · ${libelleTraitementPhotos(x.traitement)}` }] : []),
    { id: 'premier-ecran', nom: 'Premier écran', valeur: accueil ? LIBELLES_VARIANTES.accueil?.[accueil] ?? accueil : 'du modèle' },
    { id: 'mise-en-page', nom: 'Mise en page', valeur: LIBELLES_STRUCTURES[x.structure] },
    { id: 'details', nom: 'Détails', valeur: v('details.jeu') ? nomValeurHarmonie('details.jeu', v('details.jeu')!) : 'du modèle' },
    { id: 'menu', nom: 'Menu', valeur: v('menu.ordinateur') ? nomValeurHarmonie('menu.ordinateur', v('menu.ordinateur')!) : 'du modèle' },
    { id: 'effets', nom: 'Effets', valeur: jeuEffets(x.effets)?.nom ?? x.effets },
  ];
}

function Pastilles({ x }: { x: CompositionRecette }) {
  const g = gammeParId(x.gamme);
  const t = g ? [g.accent, g.vif ?? g.accentFonce, g.duo ?? g.plan, g.fondDoux] : [x.couleur];
  return <span className="inline-flex gap-0.5" aria-hidden="true">{t.map((c, i) => <span key={i} className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}</span>;
}

export default function NotationRecettes(props: Props) {
  const router = useRouter();
  const { large, etroit, h } = useLargeur();
  const [onglet, setOnglet] = useState<'noter' | 'appris'>('noter');
  const modele = useCallback((id: string) => props.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id), [props.modeles]);
  const refusees = useMemo(() => new Set(props.refusees), [props.refusees]);
  const aValider = useMemo(() => new Set(props.aValider), [props.aValider]);
  const [locaux, setLocaux] = useState<Locale[]>([]);
  useEffect(() => { setLocaux(lireLocaux()); }, []);
  const [session, setSession] = useState<Locale[]>([]);
  const dejaNotees = useMemo(() => new Set([...props.notees, ...locaux.map((l) => l.cle), ...session.map((l) => l.cle)]), [props.notees, locaux, session]);

  // ---- File : générateur (scénarios tour à tour) + propositions de Claude ----
  const [file, setFile] = useState<Item[]>([]);
  const [pos, setPos] = useState(0);
  const [prepa, setPrepa] = useState(false);
  const tour = useRef(0);
  const claudeVues = useRef(0);
  const vues = useRef(new Set<string>());
  // « Favoris d'abord · Équilibré · Découverte » (favoris.ts) : pondération des recettes générées, persistant par navigateur
  const [modeTirage, setModeTirage] = useModeTirage();
  const contexte = useCallback((s: ScenarioRecette) => contexteScenario(s, { poids: props.poids, photos: props.photos, modele, modeTirage }), [props.poids, props.photos, modele, modeTirage]);
  // Changement de mode : les recettes déjà préparées après la recette en cours sont refaites
  const modePrec = useRef(modeTirage);
  useEffect(() => { if (modePrec.current !== modeTirage) { modePrec.current = modeTirage; setFile((f) => f.slice(0, pos + 1)); } }, [modeTirage, pos]);

  const propositionEnItem = useCallback((p: PropositionClaude): Item | null => {
    const scenario: ScenarioRecette = { principaux: p.scenario.principaux, secondaires: p.scenario.secondaires, couleurs: p.scenario.couleurs, soins: [] };
    const c = contexte(scenario);
    const x = normaliserComposition(p.composition, c);
    if (!x) return null;
    return { cle: cleRecetteNotee(x), source: 'claude', sourceId: p.id, nom: p.nom, scenario, composition: x, predit: scorePredit(x, c, props.stats), exploration: false, aValider: [] };
  }, [contexte, props.stats]);

  // Génération dans un Web Worker (perf, 2026-10-08 : ~1 s par lot sur le fil principal auparavant) : même demande, même
  // graine, mêmes recettes (generation-recettes.ts du core) ; repli sur le fil principal si le worker est indisponible.
  const worker = useRef<{ w: Worker; n: number; attente: Map<number, (r: { ok: boolean; candidates?: CandidateRecette[] }) => void> } | null>(null);
  useEffect(() => {
    let w: Worker;
    try { w = new Worker(new URL('./generation.worker.ts', import.meta.url)); } catch { return; }
    const attente = new Map<number, (r: { ok: boolean; candidates?: CandidateRecette[] }) => void>();
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; candidates?: CandidateRecette[] }>) => { attente.get(e.data.id)?.(e.data); attente.delete(e.data.id); };
    w.onerror = () => { for (const f of attente.values()) f({ ok: false }); attente.clear(); worker.current = null; };
    worker.current = { w, n: 0, attente };
    return () => { w.terminate(); worker.current = null; for (const f of attente.values()) f({ ok: false }); };
  }, []);
  const generer = useCallback((demande: DemandeGeneration): Promise<CandidateRecette[]> => {
    const surPlace = () => executerDemandeGeneration({ ...demande, images: null });
    const wk = worker.current;
    if (!wk) return new Promise((ok) => setTimeout(() => ok(surPlace()), 30));
    const id = ++wk.n;
    return new Promise((ok) => { wk.attente.set(id, (r) => ok(r.ok && r.candidates ? r.candidates : surPlace())); wk.w.postMessage({ id, demande }); });
  }, []);

  const remplir = useCallback(() => {
    if (!props.scenarios.length) return;
    setPrepa(true);
    {
      const t = tour.current++;
      const sc = props.scenarios[t % props.scenarios.length];
      const deja = new Set([...dejaNotees, ...vues.current]);
      const images = contexteImages();
      const demande: DemandeGeneration = {
        scenario: sc.scenario, contexte: { poids: props.poids, photos: props.photos, modeTirage }, modeles: props.modeles.map((m) => m.manifeste),
        options: { n: 3, graine: (Date.now() % 100000) + t, iterations: 12, refusees: [...refusees], aValider: [...aValider], deja: [...deja], stats: props.stats },
        images: { exclues: [...images.exclues], kits: { ...images.kits }, vivier: images.vivier ? { ...images.vivier } : null },
      };
      generer(demande).then((gen) => {
      const ajout: Item[] = [...gen];
      // Une proposition de Claude (non notée) tous les deux lots : une source parmi d'autres
      if (t % 2 === 1) {
        while (claudeVues.current < props.propositions.length) {
          const it = propositionEnItem(props.propositions[claudeVues.current++]);
          if (it && !deja.has(it.cle)) { ajout.splice(1, 0, it); break; }
        }
      }
      for (const x of ajout) vues.current.add(x.cle);
      setFile((f) => [...f, ...ajout]);
      setPrepa(false);
      });
    }
  }, [props.scenarios, props.propositions, props.stats, props.poids, props.photos, props.modeles, modeTirage, dejaNotees, refusees, aValider, propositionEnItem, generer]);

  useEffect(() => { if (onglet === 'noter' && !prepa && file.length - pos < 2) remplir(); }, [onglet, prepa, file.length, pos, remplir]);

  const courant = file[pos] ?? null;

  // ---- Saisie ----
  const [note, setNote] = useState<number | null>(null);
  const [pour, setPour] = useState<string[]>([]);
  const [contre, setContre] = useState<string[]>([]);
  const [pourTexte, setPourTexte] = useState('');
  const [contreTexte, setContreTexte] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [appareil, setAppareil] = useState<'bureau' | 'mobile'>('bureau');
  useEffect(() => { if (etroit) setAppareil('mobile'); }, [etroit]);
  const [ongletPage, setOngletPage] = useState('accueil');
  const raz = () => { setNote(null); setPour([]); setContre([]); setPourTexte(''); setContreTexte(''); setOngletPage('accueil'); };

  const apercu = useMemo(() => {
    if (!courant) return null;
    const s = courant.scenario;
    return appliquerRecette(draftStudio(s.principaux, s.secondaires, s.couleurs), courant.composition, {
      proposes: props.proposes, modeles: props.modeles.map((m) => m.manifeste), soinsConnus: props.catalogue.map((c) => c.slug), themesActives: props.themesActives,
    });
  }, [courant, props.proposes, props.modeles, props.catalogue, props.themesActives]);
  const onglets = useMemo(() => (courant ? ongletsDuScenario(courant.scenario, props.catalogue, { themesActives: props.themesActives }) : []), [courant, props.catalogue, props.themesActives]);
  const ongletCourant = onglets.find((o) => o.id === ongletPage) ?? onglets[0];

  const enregistrer = useCallback(async (garder: boolean) => {
    if (!courant || envoi) return;
    const rien = !note && !garder && !pour.length && !contre.length && !pourTexte.trim() && !contreTexte.trim();
    if (rien) { setPos((p) => p + 1); raz(); setMessage('Recette passée sans note.'); return; }
    setEnvoi(true);
    const app = large ? 'les-deux' : appareil === 'mobile' ? 'mobile' : 'ordinateur';
    const saisie = {
      source: courant.source, sourceId: courant.sourceId ?? null, nom: courant.nom ?? nomRecette(courant.composition, sujetsDuScenario(courant.scenario)),
      scenario: courant.scenario, composition: JSON.parse(serialiserComposition(courant.composition)), note, garder, pour, contre, pourTexte, contreTexte,
      appareil: app, predit: courant.predit.score, exploration: courant.exploration,
    };
    const prevu = courant.predit.score.toFixed(1).replace('.', ',');
    const l: Locale = { cle: courant.cle, note, garder, le: new Date().toISOString() };
    setSession((s) => [l, ...s]);
    setPos((p) => p + 1);
    raz();
    const r = await noterRecetteComplete(saisie).catch(() => ({ ok: false, message: 'Connexion perdue : note gardée dans ce navigateur.', migrationManquante: true } as { ok: boolean; message: string; migrationManquante?: boolean }));
    if (r.migrationManquante && !(r.ok && garder)) {
      const n = [l, ...lireLocaux()].slice(0, 2000);
      try { localStorage.setItem(CLE_LOCAUX, JSON.stringify(n)); } catch { /* stockage indisponible */ }
      setLocaux(n);
    }
    setMessage(`${r.message} Le système prévoyait ${prevu}★.`);
    setEnvoi(false);
  }, [courant, envoi, note, pour, contre, pourTexte, contreTexte, large, appareil]);

  const ouvrirStudio = () => {
    if (!courant) return;
    // Proposition de Claude : le Studio la relit par son identifiant (?proposition=) ; recette générée : composition passée par
    // sessionStorage (?generee=<clé>, même forme que l'événement « studio:ouvrir-proposition »)
    if (courant.source === 'claude' && courant.sourceId) { router.push(`/admin/atelier/studio?proposition=${encodeURIComponent(courant.sourceId)}`); return; }
    const s = courant.scenario;
    try {
      sessionStorage.setItem(CLE_OUVRIR_STUDIO, JSON.stringify({
        cle: courant.cle, nom: courant.nom ?? nomRecette(courant.composition, sujetsDuScenario(s)), sujets: sujetsDuScenario(s), couleurs: s.couleurs,
        composition: JSON.parse(serialiserComposition(courant.composition)), scenario: s,
      }));
    } catch { /* stockage indisponible */ }
    router.push(`/admin/atelier/studio?generee=${encodeURIComponent(courant.cle)}`);
  };

  // Clavier : 1-5 étoiles, Entrée = Suivant (ignorés pendant la saisie)
  const refEnr = useRef(enregistrer);
  refEnr.current = enregistrer;
  useEffect(() => {
    if (onglet !== 'noter') return;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable))) return;
      if (/^[1-5]$/.test(e.key)) { e.preventDefault(); setNote(Number(e.key)); return; }
      if (e.key === 'Enter' && !(t && t.tagName === 'BUTTON')) { e.preventDefault(); void refEnr.current(false); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onglet]);

  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  const total = props.resume.notes + locaux.length + session.length;

  const rendu = (app: 'bureau' | 'mobile') => apercu && ongletCourant && (
    <div className={`overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10 ${app === 'mobile' && !large ? 'mx-auto w-full max-w-[420px]' : ''}`}>
      <ApercuTheme key={`${courant!.cle}|${ongletCourant.id}|${app}`} sansCommandes hauteurCadre={h} vueInitiale={vueDePage(ongletCourant.page as PageStructure)} appareil={app}
        draft={draftPourOnglet(apercu.draft, ongletCourant)} modele={apercu.modele} catalogue={props.catalogue} marquesImportees={props.marquesImportees} jeuPhotos={null} />
    </div>
  );

  const etiquettes = (cote: 'pour' | 'contre') => {
    const l = cote === 'pour' ? pour : contre;
    const set = cote === 'pour' ? setPour : setContre;
    return (
      <ul className="flex flex-wrap gap-1.5" aria-label={cote === 'pour' ? 'Étiquettes Pour' : 'Étiquettes Contre'}>
        {ETIQUETTES_POUR_CONTRE.map((e) => {
          const on = l.includes(e.id);
          return (
            <li key={e.id}>
              <button type="button" aria-pressed={on} onClick={() => set((x) => (on ? x.filter((y) => y !== e.id) : [...x, e.id]))}
                className={`min-h-9 rounded-full px-2.5 text-xs ${focus} ${on ? (cote === 'pour' ? 'bg-teal-700 text-white' : 'bg-red-700 text-white') : 'bg-white ring-1 ring-neutral-300'}`}>{e.libelle}</button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" style={style}>
      <style>{SURFACES_CSS}</style>
      <div className="flex flex-wrap items-center justify-between gap-2">
      <div role="tablist" aria-label="Recettes complètes" className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 justify-self-start">
        {([['noter', 'Noter des recettes'], ['appris', 'Ce que le système a appris']] as const).map(([id, nom]) => (
          <button key={id} type="button" role="tab" aria-selected={onglet === id} onClick={() => setOnglet(id)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${focus} ${onglet === id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>{nom}</button>
        ))}
      </div>
      {onglet === 'noter' && <ChoixModeTirage mode={modeTirage} onChange={setModeTirage} />}
      </div>

      {onglet === 'appris' ? <Appris palmares={props.palmares} resume={{ ...props.resume, notes: total }} /> : (
        <>
          {message && <p role="status" className="rounded-xl bg-neutral-50 p-2.5 text-sm ring-1 ring-black/5">{message}</p>}
          {!courant ? (
            <p className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-neutral-700">{prepa ? 'Préparation des recettes…' : 'Aucune recette à noter pour l’instant.'}</p>
          ) : (
            <>
              {/* Ce qui est évalué : la recette entière, son scénario, ses ingrédients */}
              <section aria-label="Ce que vous notez" className="grid gap-2 rounded-2xl border-2 border-teal-800/70 bg-teal-50/60 p-3">
                <p className="text-sm sm:text-base">
                  <strong>Vous notez : la recette complète (thème entier)</strong> — {libelleScenario(courant.scenario)}
                </p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-black/10">{LIBELLES_SOURCES_NOTATION[courant.source]}</span>
                  {courant.exploration && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-900 ring-1 ring-violet-200" title="Recette d’exploration : ingrédients encore peu notés, pour continuer d’apprendre">exploration</span>}
                  {courant.aValider.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 ring-1 ring-amber-200" title={courant.aValider.join(', ')}>contient {courant.aValider.length} ingrédient{courant.aValider.length > 1 ? 's' : ''} à valider</span>}
                  {courant.nom && <span className="text-neutral-700">« {courant.nom} »</span>}
                  <span className="text-neutral-500">{total} recette{total > 1 ? 's' : ''} notée{total > 1 ? 's' : ''} · {session.length} cette session</span>
                </p>
                <ul className="flex flex-wrap gap-1.5 text-xs" aria-label="Ingrédients de la recette">
                  {ingredientsLisibles(courant.composition).map((i) => (
                    <li key={i.id + i.nom} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-black/10">
                      {i.id === 'couleurs' && <Pastilles x={courant.composition} />}
                      <span className="text-neutral-500">{i.nom} :</span> <span className="font-medium">{i.valeur}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="flex flex-wrap items-center gap-2">
                <div role="tablist" aria-label="Pages du client" className="flex min-w-0 flex-1 basis-full gap-1 overflow-x-auto pb-1 md:basis-0">
                  {onglets.map((o) => (
                    <button key={o.id} type="button" role="tab" aria-selected={o.id === ongletCourant?.id} onClick={() => setOngletPage(o.id)}
                      className={`min-h-10 shrink-0 rounded-lg border px-3 text-sm ${focus} ${o.id === ongletCourant?.id ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-200 bg-white'}`}>{o.nom}</button>
                  ))}
                </div>
                {!large && (
                  <div role="group" aria-label="Appareil" className="flex gap-1 rounded-xl bg-neutral-100 p-1">
                    {([['bureau', 'Ordinateur'], ['mobile', 'Téléphone']] as const).map(([id, nom]) => (
                      <button key={id} type="button" aria-pressed={appareil === id} onClick={() => setAppareil(id)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${focus} ${appareil === id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>{nom}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className={large ? 'grid grid-cols-[minmax(0,1fr)_400px] items-start gap-4' : 'grid grid-cols-[minmax(0,1fr)]'}>
                {large ? <>{rendu('bureau')}{rendu('mobile')}</> : rendu(appareil)}
              </div>

              <section aria-label="Votre avis sur la recette complète" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div role="radiogroup" aria-label="Note de la recette complète" className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={note === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`} onClick={() => setNote(note === n ? null : n)}
                        className={`grid size-11 place-items-center rounded-lg text-2xl ${focus} ${note !== null && n <= note ? 'text-amber-500' : 'text-neutral-300'} hover:bg-amber-50`}>★</button>
                    ))}
                  </div>
                  <span className="hidden text-xs text-neutral-500 md:inline">touches 1 à 5 · Entrée = Suivant</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid content-start gap-1.5">
                    <label className="grid gap-1 text-sm font-semibold text-teal-900">Pour (ce qui va bien)
                      <input value={pourTexte} onChange={(e) => setPourTexte(e.target.value)} maxLength={500} placeholder="Facultatif" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base font-normal text-neutral-900 md:text-sm" />
                    </label>
                    {etiquettes('pour')}
                  </div>
                  <div className="grid content-start gap-1.5">
                    <label className="grid gap-1 text-sm font-semibold text-red-900">Contre (ce qui ne va pas)
                      <input value={contreTexte} onChange={(e) => setContreTexte(e.target.value)} maxLength={500} placeholder="Facultatif" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base font-normal text-neutral-900 md:text-sm" />
                    </label>
                    {etiquettes('contre')}
                  </div>
                </div>
                <p className="text-xs text-neutral-500">Une étiquette qui nomme un ingrédient (couleurs, polices, premier écran…) ne pèse que sur cet ingrédient.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={envoi} onClick={() => void enregistrer(true)} className={`min-h-11 rounded-xl bg-amber-500 px-4 text-sm font-bold text-neutral-950 hover:bg-amber-400 disabled:opacity-50 ${focus}`}>★ Garder cette recette</button>
                  <button type="button" onClick={ouvrirStudio} className={`min-h-11 rounded-xl border border-teal-800 px-4 text-sm font-semibold text-teal-900 ${focus}`}>Ouvrir dans le Studio</button>
                  <button type="button" disabled={envoi} onClick={() => void enregistrer(false)} className={`ml-auto min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>Suivant →</button>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Onglet « Ce que le système a appris » : palmarès auto-noté par sujet (score, incertitude, nombre de signaux) */
function Appris({ palmares, resume }: { palmares: Palmares[]; resume: { notes: number; gardees: number; apprises: number } }) {
  const [sujet, setSujet] = useState('*');
  const p = palmares.find((x) => x.sujet === sujet) ?? palmares[0];
  const fmt = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2).replace('.', ',')}`;
  const liste = (titre: string, l: Palmares['ingredients'], vide: string) => (
    <section className="grid content-start gap-2 rounded-2xl border border-black/10 bg-white p-3">
      <h3 className="text-sm font-semibold">{titre}</h3>
      {!l.length ? <p className="text-sm text-neutral-500">{vide}</p> : (
        <ol className="grid gap-1 text-sm">
          {l.map((x, i) => (
            <li key={x.cle} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 break-words" title={x.cle}>{i + 1}. {x.libelle}</span>
              <span className="shrink-0 text-xs tabular-nums text-neutral-600" title="Effet appris (étoiles) ± incertitude · nombre de signaux">{fmt(x.effet)} ★ ± {x.sigma.toFixed(2).replace('.', ',')} · {x.n}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
  return (
    <div className="grid gap-4">
      <p className="text-sm text-neutral-700">
        {resume.apprises} recette{resume.apprises > 1 ? 's' : ''} complète{resume.apprises > 1 ? 's' : ''} apprise{resume.apprises > 1 ? 's' : ''} en base · {resume.gardees} gardée{resume.gardees > 1 ? 's' : ''}.
        Calculé à chaque chargement depuis vos notes (aucun passage par Claude) : chaque note pondère les ingrédients de la recette et leurs combinaisons ;
        les tirages du Studio, « Tout changer », les recettes proposées ici et les propositions des praticiens en tiennent compte, toujours derrière les garde-fous et l’harmonie.
      </p>
      <label className="grid max-w-xs gap-1 text-sm">
        <span className="font-medium">Sujet n° 1</span>
        <select value={sujet} onChange={(e) => setSujet(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
          {palmares.map((x) => <option key={x.sujet} value={x.sujet}>{libelleSujet(x.sujet)}</option>)}
        </select>
      </label>
      {!p || !p.n ? <p className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-neutral-600">Rien d’appris pour l’instant : notez quelques recettes complètes.</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {liste('Meilleurs ingrédients', p.ingredients, 'Pas encore d’ingrédient favori.')}
          {liste('Meilleures combinaisons', p.paires, 'Pas encore de combinaison favorite.')}
          {liste('Familles de style', p.familles, '—')}
          {liste('À éviter', p.aEviter, 'Rien à éviter pour l’instant.')}
        </div>
      )}
    </div>
  );
}
