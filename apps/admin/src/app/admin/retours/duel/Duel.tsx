'use client';

// Mode duel « A ou B ? » (/admin/retours/duel). Accueil : type de duel (thèmes complets, typographies, traitements photo,
// éléments et structures, photos, illustrations et héros), sujet du client, classements par sujet, accord du juge.
// Boucle : deux aperçus côte à côte sur ordinateur (bascule ordinateur / mobile pour les compositions, cadre d'appareil réel :
// ApercuTheme → CadreApercu), l'un au-dessus de l'autre sur téléphone ; « A », « B », « Égalité », « Les deux sont mauvais »
// (← → ↓ ↑ ; balayage sur la barre du bas au téléphone) ; « Pourquoi ? » facultatif (étiquettes + texte) ; enchaînement
// immédiat ; après le choix, « Claude prévoyait A » (juge) ; compteur de session et série de jours.
// Paires : packages/core/src/duels.ts (même sujet, une dimension à la fois, paires déjà jouées évitées, éléments incertains
// d'abord). Sans la migration 0037 : duels gardés dans ce navigateur (localStorage).
import '@plateforme/core/dessins.css';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent } from 'react';
import {
  accordJuge, appliquerRecette, choisirStyle, classementsParContexte, cleComposition, clesDifferentes, clesJugeDuel, clesRecette, compositionInitiale,
  DIMENSIONS_DUEL, DIMENSIONS_RECETTE, ETIQUETTES_DUEL, FAMILLES_COMPOSANTS, gamme as gammeParId, genererDuelComposition, genererPaireElements, groupeEtVariante,
  hasard, inventaireAssets, libelleCleRenfort, LIBELLES_TYPES_DUEL, NOMS_SECTIONS_VARIABLES, PAGES_STRUCTURE, predireDuel, recettesPourScenario,
  modeleIntegre, repereDimension, serialiserComposition, serieDuels, stylesPermis, SUJETS_VISUELS, sujetsDuVisuel, SURFACES_CSS, tirerDimension, tirerPage, titresAssets, TYPES_DUEL,
  valeursDuel, variablesCharte, variablesGamme, vueDePage, COULEURS_PREFEREES, MODES_DUEL, modeDuel, modeDuDuel, nuancier, varierDuel, appareilDimension, duelMobileSeulement,
  type Asset, type CandidatElement, type CompositionRecette, type ContexteRecette, type DimensionRecette, type Duel as DuelCore, type IngredientsDuel,
  type MarqueImportee, type ModeleManifeste, type PhotoBanque, type PhotoDeJeu, type PoidsAtelier, type Recette, type ResultatDuel, type ScenarioDuel,
  type StatutIllustration, type SurchargesSujets, type TypeDuel, type Univers, type VuePage,
} from '@plateforme/core';
import type { PredictionJuge } from '@plateforme/core/juge';
import { compositionPourCle as poserCle, PRESENTATIONS_PORTRAITS } from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import { draftStudio } from '@/components/ApercuStudio';
import PiloteApercu, { BandeauEvaluation, useRepereVisible } from '@/components/RepereEvaluation';
import CadreApercu from '@/components/CadreApercu';
import SpecimenHabillage from '@/components/SpecimenHabillage';
import type { SoinCatalogue } from '@/lib/sites';
import Apercu from '../tri/ApercuVisuel';
import { enregistrerDuel } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const CLE_LOCAUX = 'duels:locaux';
const SUJETS_CLIENT = SUJETS_VISUELS.filter((s) => s.id !== 'general');
const libelleSujet = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;
const EMPLACEMENTS = [{ id: 'accueil', nom: 'Premier écran' }, { id: 'page-sujet', nom: 'Page sujet' }, { id: 'galerie', nom: 'Galerie' }] as const;
/** États du menu montrés dans un duel de menus (bascule commune à A et B) */
type EtatMenu = 'haut' | 'ouvert' | 'survol' | 'defile';
/** Appareil montré : ordinateur, téléphone, ou les deux côte à côte */
type Appareil = 'bureau' | 'mobile' | 'les-deux';
const APPAREILS: [Appareil, string][] = [['bureau', 'Ordinateur'], ['mobile', 'Mobile'], ['les-deux', 'Les deux']];
const VU_SUR: Record<Appareil, string> = { bureau: 'vu sur ordinateur', mobile: 'vu sur téléphone', 'les-deux': 'vu sur ordinateur et téléphone' };
const ETATS_MENU: Record<Appareil, [EtatMenu, string][]> = {
  bureau: [['haut', 'Haut de page'], ['survol', 'Survol simulé'], ['defile', 'Après défilement']],
  mobile: [['haut', 'Fermé'], ['ouvert', 'Ouvert'], ['defile', 'Après défilement']],
  'les-deux': [['haut', 'Haut de page · fermé'], ['ouvert', 'Ouvert (téléphone)'], ['survol', 'Survol (ordinateur)'], ['defile', 'Après défilement']],
};
/** Dimensions qui ont une vue rapide « spécimen » (palette, polices, tailles) */
const AVEC_SPECIMEN = (d: string | null | undefined) => Boolean(d && (d === 'couleurs' || d === 'polices' || d === 'police-couleurs' || d.startsWith('typo:') || d === 'typo'));

/** Nuancier d'une palette (pastilles) */
function Nuancier({ x, lettre }: { x: CompositionRecette; lettre: string }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`Palette ${lettre}`}>
      <strong className="text-sm">{lettre}</strong>
      {nuancier(x).map((c) => <span key={c.nom + c.hex} title={`${c.nom} ${c.hex}`} className="size-6 rounded-md ring-1 ring-black/15" style={{ background: c.hex }} />)}
    </span>
  );
}

/** Un visuel (photo dans son cadre de site, illustration) dans le vrai cadre du téléphone : mise en page mobile de la section */
function CadreTelephone({ children, hauteur }: { children: ReactNode; hauteur: number }) {
  return (
    <div className="overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10">
      <CadreApercu appareil="mobile" hauteur={hauteur} titre="Aperçu téléphone">
        <div style={{ padding: 16, display: 'grid', alignContent: 'start', gap: 12, fontFamily: 'system-ui, sans-serif', background: '#fff', minHeight: '100vh' }}>{children}</div>
      </CadreApercu>
    </div>
  );
}

type Rendu = { kind: 'compo'; x: CompositionRecette } | { kind: 'asset'; asset: Asset };
type Cote = { cle: string; ingredients: IngredientsDuel; rendu: Rendu };
/** `mobileSeul` : duel « Mobile seulement » (duels-appareils.ts) : A et B montrés QU'EN cadre téléphone, appareil enregistré « mobile » */
type Courant = { type: TypeDuel; scenario: ScenarioDuel; a: Cote; b: Cote; dimension: string | null; prediction: 'a' | 'b' | 'egalite' | null; vue: VuePage; mobileSeul?: boolean };
type DuelLocal = DuelCore & { remarque?: string | null };

type Props = {
  historique: DuelLocal[];
  migrationManquante: boolean;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
  poids: PoidsAtelier | null;
  photos: PhotoBanque[];
  recettes: Recette[];
  photosJeux: PhotoDeJeu[];
  surcharges: SurchargesSujets;
  statuts: Record<string, StatutIllustration>;
  predictions: Record<string, PredictionJuge[]>;
  /** Type de duel ou mode (MODES_DUEL) */
  typeInitial: string | null;
  /** ?mobile=1 : série « Mobile seulement » */
  mobileInitial?: boolean;
};

function lireLocaux(): DuelLocal[] {
  try { const l = JSON.parse(localStorage.getItem(CLE_LOCAUX) ?? '[]'); return Array.isArray(l) ? l : []; } catch { return []; }
}

function useEtroit() {
  const [etroit, setEtroit] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const f = () => setEtroit(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return etroit;
}

function useHauteur(etroit: boolean) {
  const [h, setH] = useState(560);
  useEffect(() => {
    const f = () => setH(etroit ? Math.max(300, Math.round(window.innerHeight * 0.42)) : Math.max(420, window.innerHeight - 330));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, [etroit]);
  return h;
}

/** Une photo à un emplacement de site, avec le même cadre et le même traitement des deux côtés */
function CadrePhoto({ src, emplacement, sujet }: { src: string; emplacement: string; sujet: string }) {
  const g = gammeParId('canard')!;
  const titre = sujet === 'general' ? 'Cabinet de podologie' : libelleSujet(sujet);
  if (emplacement === 'accueil') {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl sm:aspect-[16/10]">
        <Image src={src} alt="" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgb(0 0 0 / 0.55))' }} />
        <div className="absolute inset-x-0 bottom-0 grid gap-1 p-4 text-white">
          <span className="text-lg font-bold leading-tight">Cabinet de podologie</span>
          <span className="text-sm opacity-90">{titre} · prise de rendez-vous en ligne</span>
        </div>
      </div>
    );
  }
  if (emplacement === 'galerie') {
    return (
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl p-2" style={{ background: g.fondDoux }}>
        <div className="relative col-span-2 row-span-2 aspect-square overflow-hidden rounded-xl"><Image src={src} alt="" fill sizes="(max-width: 767px) 66vw, 33vw" className="object-cover" /></div>
        <div className="aspect-square rounded-xl" style={{ background: g.fond }} />
        <div className="aspect-square rounded-xl" style={{ background: g.fond }} />
      </div>
    );
  }
  return (
    <div className="grid gap-3 rounded-2xl p-3 sm:grid-cols-2" style={{ background: g.fond, color: g.accentFonce }}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl"><Image src={src} alt="" fill sizes="(max-width: 767px) 100vw, 25vw" className="object-cover" /></div>
      <div className="grid content-center gap-1.5">
        <span className="text-base font-bold">{titre}</span>
        <span className="text-xs text-neutral-700">Bilan, conseils et soins adaptés : ce que nous faisons au cabinet pour vous.</span>
      </div>
    </div>
  );
}

export default function Duel(props: Props) {
  const etroit = useEtroit();
  const hauteur = useHauteur(etroit);
  // Type de duel ou MODE (MODES_DUEL : palettes, paires de polices, tailles et casse, police × palette ; enregistrés sous leur type)
  const [type, setType] = useState<string | null>(props.typeInitial);
  const mode = type ? modeDuel(type) : null;
  const typeBase: TypeDuel | null = type ? ((mode?.type ?? type) as TypeDuel) : null;
  const [sujetChoisi, setSujetChoisi] = useState('');
  // Appareil montré (retour de Paul du 2026-10-08 : « tu me demandes mon avis sur téléphone mais on ne voit pas le mode
  // mobile ») : ordinateur, téléphone (vrai cadre 390 px) ou les deux côte à côte (défaut en grand écran) ; sur un vrai téléphone,
  // le rendu mobile réel. L'appareil enregistré avec le duel est celui qui était affiché.
  const [appareil, setAppareil] = useState<Appareil>('les-deux');
  useEffect(() => { setAppareil(etroit ? 'mobile' : 'les-deux'); }, [etroit]);
  // Vue rapide « spécimen » (palettes, polices, tailles) ou page complète
  const [specimen, setSpecimen] = useState(false);
  // Série « Mobile seulement » (filtre de l'accueil, ?mobile=1) et défilement synchronisé des deux téléphones
  const [serieMobile, setSerieMobile] = useState(Boolean(props.mobileInitial));
  const [synchro, setSynchro] = useState(true);
  const [locaux, setLocaux] = useState<DuelLocal[]>([]);
  useEffect(() => { setLocaux(lireLocaux()); }, []);
  const [session, setSession] = useState<DuelLocal[]>([]);
  const historique = useMemo(() => [...session, ...locaux, ...props.historique], [session, locaux, props.historique]);
  const [graine, setGraine] = useState(() => Date.now() % 100000);
  const [courant, setCourant] = useState<Courant | null>(null);
  const [message, setMessage] = useState('');
  const [dernier, setDernier] = useState<{ resultat: ResultatDuel; prediction: Courant['prediction'] } | null>(null);
  const [pourquoi, setPourquoi] = useState(false);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [remarque, setRemarque] = useState('');
  // Repère « ce qui est évalué » (h : masquer) ; duels de menus : état du menu (o : ouvrir / fermer)
  const [repereVisible, basculerRepere] = useRepereVisible();
  const [etatMenu, setEtatMenu] = useState<EtatMenu>('haut');
  // Mobile seulement : hauteur des deux téléphones (grand écran) et défilement synchronisé (même position relative)
  const refPropositions = useRef<HTMLElement>(null);
  const [hauteurTelephones, setHauteurTelephones] = useState(760);
  useEffect(() => { const f = () => setHauteurTelephones(Math.max(560, Math.min(844, window.innerHeight - 140))); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const refSynchro = useRef(synchro);
  refSynchro.current = synchro;
  useEffect(() => {
    const branches = new Map<Window, () => void>();
    let pilote: Window | null = null;
    const t = setInterval(() => {
      const fenetres = Array.from(refPropositions.current?.querySelectorAll('iframe') ?? []).map((f) => f.contentWindow).filter((w): w is Window => Boolean(w));
      for (const w of fenetres) {
        if (branches.has(w)) continue;
        const f = () => {
          if (!refSynchro.current || pilote && pilote !== w) return;
          pilote = w;
          const max = w.document.documentElement.scrollHeight - w.innerHeight;
          const ratio = max > 0 ? w.scrollY / max : 0;
          for (const autre of fenetres) if (autre !== w) { const m = autre.document.documentElement.scrollHeight - autre.innerHeight; autre.scrollTo(0, Math.round(ratio * m)); }
          setTimeout(() => { if (pilote === w) pilote = null; }, 120);
        };
        w.addEventListener('scroll', f, { passive: true });
        branches.set(w, () => w.removeEventListener('scroll', f));
      }
    }, 400);
    return () => { clearInterval(t); for (const f of branches.values()) f(); };
  }, [courant?.mobileSeul]);

  const modele = useCallback((id: string) => props.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id), [props.modeles]);
  const inventaire = useMemo(() => inventaireAssets({ photosJeux: props.photosJeux }), [props.photosJeux]);
  const titres = useMemo(() => ({ ...titresAssets(), ...Object.fromEntries(inventaire.map((a) => [a.cle, a.titre])) }), [inventaire]);
  const libelleElement = useCallback((k: string) => (titres[k] ?? (k.startsWith('compo:') ? `Composition ${k.slice(6, 12)}` : libelleCleRenfort(k))), [titres]);
  const candidats = useMemo(() => {
    const vers = (a: Asset): CandidatElement => ({ cle: a.cle, sujets: sujetsDuVisuel({ cle: a.cle, type: a.type, soins: a.soins }, props.surcharges).sujets, ...groupeEtVariante(a.cle), exclu: props.statuts[a.cle] === 'retire' });
    return {
      photo: inventaire.filter((a) => a.type === 'photo').map(vers),
      illustration: inventaire.filter((a) => ['heros', 'dessin', 'ligne', 'materiel'].includes(a.type)).map(vers),
    };
  }, [inventaire, props.surcharges, props.statuts]);
  const parCle = useMemo(() => new Map(inventaire.map((a) => [a.cle, a])), [inventaire]);
  const dimensionsDispo = useCallback((l: readonly string[]) => l.filter((d) => DIMENSIONS_RECETTE.some((x) => x.id === d)), []);

  const contexte = useCallback((s: string): ContexteRecette => ({ sujets: [s], principaux: 1, couleursPreferees: [], poids: props.poids, photos: props.photos, modele }), [props.poids, props.photos, modele]);

  /** Côté « composition » : clés d'apprentissage et composition stockée */
  const coteCompo = (x: CompositionRecette, s: string): Cote => ({ cle: cleComposition(x), ingredients: { ...clesRecette(x, [s]), composition: JSON.parse(serialiserComposition(x)) }, rendu: { kind: 'compo', x } });
  const coteAsset = (cle: string): Cote | null => { const a = parCle.get(cle); return a ? { cle, ingredients: { assets: [cle], element: cle, juge: [cle] }, rendu: { kind: 'asset', asset: a } } : null; };

  /** Élément classé d'un côté : la clé lisible qui diffère (police, gamme, présentation…) */
  const choisirElement = (atelier: string[], assets: string[], cle: string) => {
    const l = [...atelier.filter((k) => !k.includes('&')), ...assets.filter((k) => !k.startsWith('structure:'))];
    return l.find((k) => libelleCleRenfort(k) !== k) ?? l[0] ?? cle;
  };

  const generer = useCallback((m: string, g: number, historique: readonly DuelLocal[]): Courant | null => {
    const md = modeDuel(m);
    const t = (md?.type ?? m) as TypeDuel;
    const r = hasard(g);
    const sujetsType = t === 'photo' || t === 'illustration' ? SUJETS_VISUELS : SUJETS_CLIENT;
    const parSujet = (s: string) => historique.filter((d) => d.type === t && (!md || modeDuDuel(d)?.id === md.id) && (d.scenario.sujets[0] ?? 'cabinet') === s).length;
    const ordre = sujetChoisi ? [sujetChoisi] : [...sujetsType.map((s) => s.id)].map((s) => ({ s, k: (1 + parSujet(s)) * -Math.log(Math.max(r(), 1e-9)) })).sort((a, b) => a.k - b.k).map((x) => x.s);
    if (t === 'photo' || t === 'illustration') {
      for (const s of ordre) {
        const p = genererPaireElements(t, candidats[t], historique, { graine: g, sujet: s });
        if (!p) continue;
        const a = coteAsset(p.a.cle), b = coteAsset(p.b.cle);
        if (!a || !b) continue;
        const scenario: ScenarioDuel = { sujets: [p.sujet], ...(t === 'photo' ? { emplacement: EMPLACEMENTS[Math.floor(r() * EMPLACEMENTS.length)].id } : {}) };
        return { type: t, scenario, a, b, dimension: p.dimension, prediction: predireDuel([p.a.cle], [p.b.cle], props.predictions), vue: 'accueil' };
      }
      return null;
    }
    for (const s of ordre) {
      // Palettes : la moitié du temps, un client qui a choisi 1 ou 2 couleurs (gammes et couleurs libres proches)
      const couleurs = md && md.dimensions.some((x) => x === 'couleurs' || x === 'police-couleurs') && r() < 0.5
        ? [...new Set([COULEURS_PREFEREES[Math.floor(r() * COULEURS_PREFEREES.length)].id, ...(r() < 0.4 ? [COULEURS_PREFEREES[Math.floor(r() * COULEURS_PREFEREES.length)].id] : [])])] : [];
      const c = { ...contexte(s), couleursPreferees: couleurs };
      const libres = recettesPourScenario(props.recettes, [s]).slice(0, 8).map((x) => x.composition);
      let base = libres.length && r() < 0.6 ? libres[Math.floor(r() * libres.length)] : compositionInitiale(c, g);
      let dims: string[];
      let varier: (x: CompositionRecette, dim: string, gg: number) => CompositionRecette;
      if (md) {
        // Modes : seules leurs dimensions, variantes du moteur d'harmonie sans nouvelle règle dure (duels-compositions.ts)
        dims = [...md.dimensions];
        varier = (x, dim, gg) => varierDuel(x, dim, c, gg);
      } else if (t === 'element') {
        dims = Object.keys(base.sections.variantes).filter((f) => (FAMILLES_COMPOSANTS as readonly string[]).includes(f)).map((f) => `composant:${f}`);
        // Présentations des portraits (à valider, 2026-10-08) : un duel d'éléments sur cinq compare deux présentations des
        // praticiens sur la même recette (repère « On compare : la présentation des portraits » sur le bloc praticiens)
        if (r() < 0.2) {
          const l = PRESENTATIONS_PORTRAITS.filter((p) => p !== 'sobre');
          base = poserCle(base, `composant:portraits:${l[Math.floor(r() * l.length)]}`);
          dims = ['composant:portraits'];
        }
        varier = (x, dim, gg) => tirerPage(x, { composant: dim.slice(10) } as Parameters<typeof tirerPage>[1], c, gg);
      } else {
        if (t === 'traitement') {
          if (!stylesPermis(c, base.structure).includes('photos')) continue;
          base = base.visuels.style === 'photos' ? base : choisirStyle(base, 'photos', c, g);
          if (base.visuels.style !== 'photos' || !base.photos.length) continue;
        }
        dims = dimensionsDispo(DIMENSIONS_DUEL[t]);
        varier = (x, dim, gg) => tirerDimension(x, dim as DimensionRecette, c, gg);
      }
      // Série « Mobile seulement » : seules les dimensions où le téléphone est décisif
      if (serieMobile) dims = dims.filter((x) => appareilDimension(x) === 'mobile');
      if (!dims.length) continue;
      const d = genererDuelComposition({ type: t, graine: g, base, sujet: s, dimensions: dims, varier, historique, libres: t === 'theme' ? libres : [] });
      if (!d) continue;
      const a = coteCompo(d.a, s), b = coteCompo(d.b, s);
      const base0 = { type: t, aCle: a.cle, bCle: b.cle, aIngredients: a.ingredients, bIngredients: b.ingredients };
      const diff = clesDifferentes(base0);
      a.ingredients.element = d.dimension ? choisirElement(diff.atelier[0], diff.assets[0], a.cle) : a.cle;
      b.ingredients.element = d.dimension ? choisirElement(diff.atelier[1], diff.assets[1], b.cle) : b.cle;
      const [ja, jb] = clesJugeDuel(base0);
      if (ja.length) a.ingredients.juge = ja;
      if (jb.length) b.ingredients.juge = jb;
      const famille = d.dimension?.startsWith('composant:') ? d.dimension.slice(10) : null;
      const page = famille ? PAGES_STRUCTURE.find((p) => (p.sections as readonly string[]).includes(famille)) : null;
      const vue: VuePage = famille === 'theme' ? 'theme' : famille === 'article' ? 'article' : page ? vueDePage(page.id) : 'accueil';
      return { type: t, scenario: { sujets: [s], principaux: 1, ...(couleurs.length ? { couleurs } : {}), ...(page ? { page: page.id } : {}) }, a, b, dimension: d.dimension, prediction: predireDuel(ja, jb, props.predictions), vue, mobileSeul: duelMobileSeulement(d.dimension, r(), { serie: serieMobile }) };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sujetChoisi, serieMobile, candidats, contexte, props.recettes, props.predictions, dimensionsDispo]);

  const lancer = useCallback((t: string, g: number, hist: readonly DuelLocal[]) => {
    const c = generer(t, g, hist);
    setCourant(c);
    setEtiquettes([]); setRemarque(''); setPourquoi(false); setEtatMenu('haut');
    if (!c) setMessage(`Plus de duel inédit pour ${sujetChoisi ? libelleSujet(sujetChoisi) : 'ces sujets'} : changez de sujet ou de type.`);
  }, [generer, sujetChoisi]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (type) lancer(type, graine, historique); }, [type, sujetChoisi, serieMobile]);

  const choisir = useCallback(async (resultat: ResultatDuel) => {
    if (!courant) return;
    // Appareil réellement affiché
    const app = courant.mobileSeul ? 'mobile' : appareil === 'les-deux' ? 'les-deux' : appareil === 'mobile' ? 'mobile' : 'ordinateur';
    const d: DuelLocal = {
      type: courant.type, scenario: courant.scenario, aCle: courant.a.cle, bCle: courant.b.cle, aIngredients: courant.a.ingredients, bIngredients: courant.b.ingredients,
      dimension: courant.dimension, resultat, etiquettes, appareil: app, prediction: courant.prediction, le: new Date().toISOString(), remarque: remarque.trim() || null,
    };
    setSession((s) => [d, ...s]);
    setDernier({ resultat, prediction: courant.prediction });
    const g = graine + 1;
    setGraine(g);
    lancer(type ?? courant.type, g, [d, ...historique]);
    const r = await enregistrerDuel(d as unknown as Record<string, unknown>, d.remarque).catch(() => ({ ok: false, message: 'Connexion perdue : duel gardé dans ce navigateur.', migrationManquante: true }));
    if (!r.ok) {
      if (r.migrationManquante) {
        const l = [d, ...lireLocaux()].slice(0, 2000);
        try { localStorage.setItem(CLE_LOCAUX, JSON.stringify(l)); } catch { /* plein ou privé */ }
        setSession((s) => s.filter((x) => x !== d));
        setLocaux(l);
      }
      setMessage(r.message);
    } else setMessage('');
  }, [courant, appareil, type, etiquettes, remarque, graine, lancer, historique]);

  // Clavier : ← A, → B, ↓ égalité, ↑ les deux sont mauvais
  const refChoisir = useRef(choisir);
  refChoisir.current = choisir;
  const refMenu = useRef(false);
  refMenu.current = courant?.dimension === 'menu';
  useEffect(() => {
    if (!type) return;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if ((e.key === 'o' || e.key === 'O') && refMenu.current && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setEtatMenu((x) => (x === 'ouvert' ? 'haut' : 'ouvert')); setAppareil((a) => (a === 'bureau' ? 'les-deux' : a)); return; }
      const m: Record<string, ResultatDuel> = { ArrowLeft: 'a', ArrowRight: 'b', ArrowDown: 'egalite', ArrowUp: 'mauvais' };
      if (m[e.key]) { e.preventDefault(); void refChoisir.current(m[e.key]); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [type]);

  // Balayage (téléphone) : barre du bas (4 directions) ; zone des aperçus (gauche / droite seulement)
  const debut = useRef<{ x: number; y: number } | null>(null);
  const toucher = (e: TouchEvent) => { const t = e.touches[0]; debut.current = { x: t.clientX, y: t.clientY }; };
  const lacher = (vertical: boolean) => (e: TouchEvent) => {
    const d = debut.current;
    debut.current = null;
    if (!d) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - d.x, dy = t.clientY - d.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) void choisir(dx < 0 ? 'a' : 'b');
    else if (vertical && Math.abs(dy) > 50 && Math.abs(dy) > 1.5 * Math.abs(dx)) void choisir(dy > 0 ? 'egalite' : 'mauvais');
  };

  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  const jours = useMemo(() => historique.map((d) => d.le ?? '').filter(Boolean), [historique]);
  const serie = serieDuels(jours);
  const accord = useMemo(() => accordJuge(historique), [historique]);
  const classements = useMemo(() => classementsParContexte(historique, { libelleSujet, nomsSections: NOMS_SECTIONS_VARIABLES }), [historique]);

  const rendreClassements = (filtre?: (c: (typeof classements)[number]) => boolean, max = 5) => {
    const l = classements.filter((c) => !filtre || filtre(c));
    if (!l.length) return <p className="text-sm text-neutral-600">Pas encore de classement : jouez quelques duels.</p>;
    return (
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {l.slice(0, 12).map((c) => (
          <li key={c.contexte} className="grid content-start gap-1.5 rounded-xl border border-black/10 bg-white p-3">
            <p className="text-sm font-semibold">{c.titre} <span className="font-normal text-neutral-500">· {c.duels} duel{c.duels > 1 ? 's' : ''}</span></p>
            <ol className="grid gap-1 text-sm">
              {c.lignes.slice(0, max).map((x, i) => (
                <li key={x.cle} className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate" title={x.cle}>{i + 1}. {libelleElement(x.cle)}</span>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-600">{x.elo} ± {x.plusMoins}</span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    );
  };

  const choixSujet = (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">Sujet du client</span>
      <select value={sujetChoisi} onChange={(e) => setSujetChoisi(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
        <option value="">Au choix (les moins joués d’abord)</option>
        {(type === 'photo' || type === 'illustration' ? SUJETS_VISUELS : SUJETS_CLIENT).map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
      </select>
    </label>
  );

  // ======================= Accueil : choix du type =======================
  if (!type) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6" style={style}>
        <section aria-labelledby="du-types" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="du-types" className="text-lg font-semibold">Quel duel ?</h2>
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-black/10">
              <input type="checkbox" checked={serieMobile} onChange={(e) => setSerieMobile(e.target.checked)} className="size-4" />
              Mobile seulement <span className="font-normal text-neutral-600">(tailles, densité, menus, barre du bas, cartes : en cadre téléphone)</span>
            </label>
          </div>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...TYPES_DUEL.filter((t) => t !== 'traitement' || DIMENSIONS_RECETTE.some((d) => d.id === 'traitement')).map((t) => ({ id: t as string, ...LIBELLES_TYPES_DUEL[t] })), ...MODES_DUEL]
              // Série « Mobile seulement » : les duels qui ont des dimensions où le téléphone est décisif
              .filter(({ id }) => !serieMobile || (modeDuel(id) ? modeDuel(id)!.dimensions.some((d) => appareilDimension(d) === 'mobile') : ['theme', 'typo', 'element'].includes(id)))
              .map(({ id: t, nom, detail }) => {
              const n = historique.filter((d) => (modeDuel(t) ? modeDuDuel(d)?.id === t : d.type === t && !modeDuDuel(d))).length;
              return (
                <li key={t}>
                  <button type="button" onClick={() => setType(t)} className={`grid h-full w-full content-start gap-2 rounded-2xl border border-black/10 bg-white p-4 text-left hover:border-teal-700 hover:bg-teal-50/40 ${focus}`}>
                    <span className="text-lg font-bold">{nom}</span>
                    <span className="text-sm text-neutral-600">{detail}</span>
                    <span className="text-sm font-semibold text-neutral-800">{n} duel{n > 1 ? 's' : ''} joué{n > 1 ? 's' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="flex flex-wrap gap-4 rounded-2xl border border-black/10 bg-neutral-50 p-4 text-sm">
          <p><strong>{historique.length}</strong> duel{historique.length > 1 ? 's' : ''} au total{locaux.length ? ` (dont ${locaux.length} dans ce navigateur)` : ''}</p>
          <p>Série : <strong>{serie}</strong> jour{serie > 1 ? 's' : ''} d’affilée</p>
          <p>Juge : {accord.n ? <><strong>{accord.accords}/{accord.n}</strong> duels où Claude prévoyait votre choix ({accord.taux} %)</> : 'pas encore de duel comparable'}</p>
        </section>
        <section aria-labelledby="du-classements" className="grid gap-3">
          <h2 id="du-classements" className="text-lg font-semibold">Classements par sujet</h2>
          {rendreClassements(undefined, 3)}
        </section>
      </div>
    );
  }

  // ======================= Duel =======================
  // Appareil effectif : un duel « Mobile seulement » n'est montré qu'en téléphone (pas de bascule)
  const vu: Appareil = courant?.mobileSeul ? 'mobile' : appareil;
  const cote = (lettre: 'A' | 'B', c: Cote) => (
    <figure className="grid min-w-0 content-start gap-2">
      <figcaption className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-teal-800 text-sm font-bold text-white">{lettre}</span>
        {courant?.dimension && <span className="truncate text-sm text-neutral-700">{libelleElement(c.ingredients.element ?? c.cle)}</span>}
      </figcaption>
      {/* Un cadre par appareil montré ; « Les deux » : ordinateur et vrai cadre téléphone côte à côte */}
      <div className={vu === 'les-deux' ? 'grid min-w-0 items-start gap-2' : 'min-w-0'} style={vu === 'les-deux' ? { gridTemplateColumns: `minmax(0, 1fr) ${etroit ? '42%' : '38%'}` } : undefined}>
        {(vu === 'les-deux' ? (['bureau', 'mobile'] as const) : [vu as 'bureau' | 'mobile']).map((app) => <div key={app} className="min-w-0">{rendu(c, app)}</div>)}
      </div>
    </figure>
  );
  /** Rendu d'un côté pour un appareil : composition (page ou spécimen), photo dans son cadre de site, illustration */
  function rendu(c: Cote, app: 'bureau' | 'mobile') {
    // Mobile seulement sur grand écran : les deux téléphones en grand (taille réelle, hauteur de l'écran)
    const h = courant?.mobileSeul && !etroit ? hauteurTelephones : vu === 'les-deux' && app === 'mobile' ? Math.max(hauteur, 420) : hauteur;
    if (c.rendu.kind === 'compo') {
      const x = c.rendu.x;
      if (specimen && AVEC_SPECIMEN(courant!.dimension)) return <div className="overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10"><SpecimenHabillage mobile={app === 'mobile'} hauteur={h} reglages={{ police: x.police, typo: x.typo ?? null, gamme: x.gamme || null, couleur: x.couleur }} /></div>;
      return <ApercuCompo x={x} sujet={courant!.scenario.sujets[0] ?? 'sport'} appareil={app} vue={courant!.vue} hauteur={h} props={props} />;
    }
    const visuel = courant!.type === 'photo' && c.rendu.asset.rendu.kind === 'image'
      ? <CadrePhoto src={c.rendu.asset.rendu.src} emplacement={courant!.scenario.emplacement ?? 'accueil'} sujet={courant!.scenario.sujets[0] ?? 'general'} />
      : <Apercu a={c.rendu.asset} grand />;
    if (app === 'bureau') return visuel;
    // Téléphone : la section où le visuel apparaît, en vraie largeur mobile (390 px)
    return (
      <CadreTelephone hauteur={h}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f766e' }}>Pédicure-podologue · {libelleSujet(courant!.scenario.sujets[0] ?? 'general')}</span>
        {visuel}
        <span style={{ fontSize: 14, color: '#404040' }}>Bilan, conseils et soins adaptés : ce que nous faisons au cabinet pour vous.</span>
      </CadreTelephone>
    );
  }

  // Ce qui est comparé (reperes.ts) : libellé, zones encadrées dans les aperçus, valeurs lisibles de A et B
  const repere = repereDimension(courant?.dimension ?? null);
  const valeurs: [string, string] | null = !courant ? null
    : courant.a.rendu.kind === 'compo' && courant.b.rendu.kind === 'compo' ? valeursDuel(courant.dimension, courant.a.rendu.x, courant.b.rendu.x)
    : [libelleElement(courant.a.cle), libelleElement(courant.b.cle)];

  const bouton = (r: ResultatDuel, texte: ReactNode, touche: string, cls: string) => (
    <button type="button" onClick={() => void choisir(r)} disabled={!courant} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold md:min-h-12 md:px-3 md:text-base disabled:opacity-40 ${focus} ${cls}`}>
      {texte}<kbd className="hidden rounded bg-black/10 px-1.5 text-xs md:inline">{touche}</kbd>
    </button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-32 md:pb-0" style={style}>
      <style>{SURFACES_CSS + '.tr-svg svg{width:100%;height:100%;display:block}'}</style>
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" onClick={() => { setType(null); setCourant(null); }} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>← Types de duel</button>
        <p className="text-sm"><strong>{mode?.nom ?? LIBELLES_TYPES_DUEL[typeBase!].nom}</strong> · {session.length} cette session · série {serie} j</p>
        {choixSujet}
        {courant?.mobileSeul && <p className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white">Téléphone uniquement</p>}
        {courant && !courant.mobileSeul && (
          <div role="group" aria-label="Appareil montré" className="flex gap-1 rounded-xl bg-neutral-100 p-1 ring-1 ring-black/10">
            {APPAREILS.map(([id, nom]) => (
              <button key={id} type="button" aria-pressed={appareil === id} onClick={() => setAppareil(id)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${focus} ${appareil === id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>{nom}</button>
            ))}
          </div>
        )}
      </div>

      {dernier && (
        <p role="status" className="rounded-xl bg-neutral-50 p-2.5 text-sm ring-1 ring-black/5">
          Duel précédent : {dernier.resultat === 'a' ? 'A' : dernier.resultat === 'b' ? 'B' : dernier.resultat === 'egalite' ? 'égalité' : 'les deux mauvais'}
          {' · '}
          {dernier.prediction
            ? <>Claude prévoyait {dernier.prediction === 'egalite' ? 'une égalité' : dernier.prediction.toUpperCase()} {dernier.prediction === dernier.resultat ? '✓' : dernier.resultat === 'mauvais' ? '' : '✗'}</>
            : 'pas de prédiction de Claude pour ce duel'}
        </p>
      )}
      {message && <p role="status" className="text-sm text-amber-900">{message}</p>}

      {courant ? (
        <>
          <p className="text-sm text-neutral-700">
            Client : <strong>{libelleSujet(courant.scenario.sujets[0] ?? 'general')}</strong>
            {courant.scenario.emplacement ? <> · emplacement : {EMPLACEMENTS.find((e) => e.id === courant.scenario.emplacement)?.nom}</> : null}
          </p>
          <BandeauEvaluation prefixe="On compare" repere={{ ...repere, detail: [repere.detail, courant.mobileSeul ? 'sur téléphone uniquement' : VU_SUR[vu]].filter(Boolean).join(' · ') }} valeurs={valeurs} visible={repereVisible} onBasculer={basculerRepere}>
            {(courant.dimension === 'couleurs' || courant.dimension === 'police-couleurs') && courant.a.rendu.kind === 'compo' && courant.b.rendu.kind === 'compo' && (
              <div className="grid gap-1.5">
                <Nuancier x={courant.a.rendu.x} lettre="A" />
                <Nuancier x={courant.b.rendu.x} lettre="B" />
              </div>
            )}
            {courant.mobileSeul && (
              <label className="flex min-h-11 items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={synchro} onChange={(e) => setSynchro(e.target.checked)} className="size-4" />
                Défilement synchronisé
              </label>
            )}
            {AVEC_SPECIMEN(courant.dimension) && courant.a.rendu.kind === 'compo' && (
              <div role="group" aria-label="Vue" className="flex gap-1 rounded-xl bg-neutral-100 p-1">
                {([[false, 'Page complète'], [true, 'Spécimen']] as const).map(([v, nom]) => (
                  <button key={nom} type="button" aria-pressed={specimen === v} onClick={() => setSpecimen(v)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${focus} ${specimen === v ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>{nom}</button>
                ))}
              </div>
            )}
            {courant.dimension === 'menu' && (
              <div role="group" aria-label="État du menu montré" className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
                {ETATS_MENU[vu].map(([id, nom]) => (
                  <button key={id} type="button" aria-pressed={etatMenu === id} onClick={() => setEtatMenu(id)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${focus} ${etatMenu === id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>
                    {nom}{id === 'ouvert' && <kbd className="ml-1 hidden rounded bg-black/10 px-1 text-xs md:inline">o</kbd>}
                  </button>
                ))}
              </div>
            )}
          </BandeauEvaluation>
          <PiloteApercu selecteurs={repere.selecteurs} visible={repereVisible} cle={`${courant.a.cle}|${courant.b.cle}|${vu}|${etatMenu === 'defile' ? 'd' : ''}`}
            defiler={etatMenu === 'defile' && courant.dimension === 'menu' ? 520 : 'repere'}
            menu={courant.dimension === 'menu' ? { ouvert: etatMenu === 'ouvert', survol: etatMenu === 'survol', rubriqueActive: true, onBascule: (o) => setEtatMenu(o ? 'ouvert' : 'haut') } : undefined}>
            <section ref={refPropositions} aria-label="Les deux propositions" onTouchStart={toucher} onTouchEnd={lacher(false)}
              className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
              {cote('A', courant.a)}
              {cote('B', courant.b)}
            </section>
          </PiloteApercu>

          <div className="fixed inset-x-0 bottom-0 z-20 grid gap-1.5 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0"
            onTouchStart={toucher} onTouchEnd={lacher(true)}>
            <p className="text-center text-[11px] text-neutral-500 md:hidden">Balayez : ← A · → B · ↓ égalité · ↑ les deux mauvais</p>
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
              {bouton('a', 'A', '←', 'bg-teal-800 text-white hover:bg-teal-900')}
              {bouton('b', 'B', '→', 'bg-teal-800 text-white hover:bg-teal-900')}
              {bouton('egalite', 'Égalité', '↓', 'border border-neutral-300 bg-white')}
              {bouton('mauvais', <><span className="md:hidden" aria-hidden="true">Mauvais</span><span className="sr-only md:not-sr-only">{' '}Les deux sont mauvais</span></>, '↑', 'border border-red-200 bg-red-50 text-red-900')}
            </div>
            <button type="button" aria-expanded={pourquoi} onClick={() => setPourquoi((x) => !x)} className={`justify-self-start text-sm text-teal-900 underline ${focus}`}>Pourquoi ? (facultatif)</button>
            {pourquoi && (
              <div className="grid gap-2">
                <ul className="flex flex-wrap gap-1.5">
                  {ETIQUETTES_DUEL.map((e) => {
                    const on = etiquettes.includes(e.id);
                    return (
                      <li key={e.id}>
                        <button type="button" aria-pressed={on} onClick={() => setEtiquettes((l) => (on ? l.filter((x) => x !== e.id) : [...l, e.id]))}
                          className={`min-h-9 rounded-full px-3 text-sm ${focus} ${on ? 'bg-teal-700 text-white' : 'bg-white ring-1 ring-neutral-300'}`}>{e.libelle}</button>
                      </li>
                    );
                  })}
                </ul>
                <input value={remarque} onChange={(e) => setRemarque(e.target.value)} maxLength={1000} placeholder="Une remarque (facultatif)" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base md:text-sm" />
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-neutral-700">Aucun duel à proposer pour l’instant.</p>
      )}

      <section aria-labelledby="du-classement" className="grid gap-3">
        <h2 id="du-classement" className="text-lg font-semibold">Classement{courant ? ` — ${libelleSujet(courant.scenario.sujets[0] ?? 'general')}` : ''}</h2>
        {rendreClassements((c) => (!courant || c.sujet === (courant.scenario.sujets[0] ?? 'cabinet')) && (mode ? mode.dimensions.includes(c.famille) : true) && (type === 'photo' || type === 'illustration' ? c.famille === type : c.famille !== 'photo' && c.famille !== 'illustration'))}
      </section>
    </div>
  );
}

/** Une composition dans le cadre de l'appareil (ApercuTheme → CadreApercu), page imposée, sans commandes */
function ApercuCompo({ x, sujet, appareil, vue, hauteur, props }: { x: CompositionRecette; sujet: string; appareil: 'bureau' | 'mobile'; vue: VuePage; hauteur: number; props: Props }) {
  const apercu = useMemo(() => appliquerRecette(draftStudio([sujet]), x, {
    proposes: props.proposes, modeles: props.modeles.map((m) => m.manifeste), soinsConnus: props.catalogue.map((c) => c.slug), themesActives: props.themesActives,
  }), [x, sujet, props.proposes, props.modeles, props.catalogue, props.themesActives]);
  if (!apercu) return <p className="text-sm text-neutral-600">Aperçu indisponible.</p>;
  return (
    <div className="overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10">
      <ApercuTheme key={`${appareil}|${vue}`} sansCommandes hauteurCadre={hauteur} vueInitiale={vue} appareil={appareil} draft={apercu.draft} modele={apercu.modele} catalogue={props.catalogue} marquesImportees={props.marquesImportees} jeuPhotos={null} />
    </div>
  );
}
