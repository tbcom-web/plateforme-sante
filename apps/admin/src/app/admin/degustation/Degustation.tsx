'use client';

// 🍽 Dégustation (page.tsx) : session « Dégustation du jour », grille libre, « Mon palais ». Une carte à la fois :
// - GRILLE : 6 propositions (2 à 6), touchez vos 2 préférées (la première = n° 1), « celle qui ne va pas » en option (touche P puis le
//   numéro), Valider (Entrée) ; agrandir : loupe ou barre d'espace ; ← (ou Retour arrière) annule le dernier choix ;
// - DUEL de départage : ← / → (ou 1 / 2) ; NOTE RAPIDE : 1 à 5 (mode rafale : la note passe aussitôt à la suivante) ;
// - BATS CLAUDE : le pari du juge est calculé AVANT l'affichage et caché ; révélé après le choix ;
// - XP, série, défi du jour, missions par profil, médailles (confettis discrets), son désactivé par défaut ;
// - reprise d'une session interrompue (navigateur) ; sans la migration 0042 : choix gardés dans ce navigateur.
// Tout est rangé par profession (clés du stockage local suffixées, choix enregistrés avec la profession).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  apprentissagesSession, avancementDefi, baseFavoris, classerPhotos, clePhoto, clesRecette, cleComposition, compositionPourCle, contexteScenario, defiDuJour, DIMENSIONS_FORMAT,
  dimensionElement, duelsDepuisChoix, ECHANTILLON_DIRECTIONS, effetSession, elementsDuProfil, formatGrille, gamme as gammeParId, grilleCompositions, grilleIcones, grilleKit,
  hasard, LIBELLES_VARIANTES, libelleElement, medailles, missionProfil, modeleIntegre, niveauPalais, nouvellesMedailles, pairePolices, pariGrille, parisDesChoix,
  FAMILLES_STYLE, planifierSession, predireDuel, pretProfil, SUJETS_VISUELS, famillesPreferees, grilleDirectionsDegustation, repereEvalue, type IdFamilleStyle, type famillesDesDuels, scoreBatsClaude, serialiserComposition, serieDegustation, sessionReprenable, tempsEstime, texteDuree, xpCarte,
  type CarteSession, type ChoixGrille, type Duel, type EtatApprentissage, type FormatGrille, type GrilleDegustation, type MarqueImportee, type Medaille, type ModeleManifeste,
  type PhotoBanque, type PoidsAtelier, type PropositionDegustation, type ScenarioRecette, type ScoreBatsClaude, type Univers, type DefiDuJour, type ElementInventaire,
  construireCarte, lireRegistresTirage, outilsCartes, type CarteConstruite, type DonneesCartes,
  carteSelonPolitique, expositionsCarte, ordonnerNotesPolitique, type EtatPolitique,
} from '@plateforme/core';
import { useExpositions } from '@/components/useExpositions';
import type { PredictionJuge } from '@plateforme/core/juge';
import type { SoinCatalogue } from '@/lib/sites';
import { enregistrerDuel } from '../retours/duel/actions';
import { ajouterNoteAsset } from '../retours/actions';
import { enregistrerChoixGrille } from './actions';
import { apercusMontes } from '@/components/CadreApercu';
import { demander as demanderOuvrier, diffuser, nbOuvriers } from '@/components/pool-workers';
import { ApercuIngredient, comparerEmpreintes, Confettis, DIMENSIONS_FOCALES, empreinteIframe, jouerSon, VignetteProposition, type ContexteRendu } from './Vignettes';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Profil = { id: string; nom: string; sujets: string[]; scenario: ScenarioRecette };
type ChoixLeger = Omit<ChoixGrille, 'propositions'> & { propositions: { cle: string; ingredients: { element?: string | null; assets?: string[]; atelier?: string[] } }[] };

type Props = ContexteRendu & {
  profession: { id: string; parDefaut: string; libelle: string };
  profils: Profil[];
  etat: EtatApprentissage & { pret: Record<string, number>; couvertes: Record<string, string[]> };
  elements: ElementInventaire[];
  formats: FormatGrille[];
  choix: ChoixLeger[];
  parisSemaine: ScoreBatsClaude;
  joursActifs: string[];
  defi: DefiDuJour;
  faits: Record<string, { grilles: number; kits: number; recettesGardees: number }>;
  lienPublier: string;
  /** Préférences de famille apprises des grilles « Directions » (global et par sujet) */
  familles: ReturnType<typeof famillesDesDuels>;
  migrationManquante: boolean;
  tranches: { refuses: string[]; favoris: string[]; notes: string[] };
  predictions: Record<string, PredictionJuge[]>;
  poids: PoidsAtelier | null;
  photos: PhotoBanque[];
  /** Politique d'évaluation unique (politique-evaluation.ts) : mémoire commune des écrans, implicites, règles apprises */
  politique?: EtatPolitique;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
};

/** Carte jouée (journal du navigateur : XP, série, défi, reprise) */
type Jouee = { le: string; kind: CarteSession['kind'] | 'bonus'; xp: number; profil: string | null; accordClaude: boolean | null; dureeMs: number; session: string; tranche?: boolean; enBase?: boolean };
type EtatSession = { id: string; debut: string; position: number; cartes: CarteSession[] };

type Courant =
  | { kind: 'grille'; carte: CarteSession; profil: Profil; grille: GrilleDegustation; pari: number | null; debut: number }
  | { kind: 'duel'; carte: CarteSession; profil: Profil; grille: GrilleDegustation; pari: 'a' | 'b' | 'egalite' | null; debut: number }
  | { kind: 'note'; carte: CarteSession; profil: Profil | null; cle: string; url: string | null; pari: number | null; debut: number };

const lire = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const ecrire = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };

/** Libellé lisible d'un élément (« la palette « Sable » ») pour l'écran de fin */
function libelleIngredient(k: string): string {
  if (k.startsWith('famille:')) return `la direction « ${FAMILLES_STYLE.find((f) => f.id === k.slice(8))?.nom ?? k.slice(8)} »`;
  if (k.startsWith('gamme:')) return `la palette « ${gammeParId(k.slice(6))?.nom ?? k.slice(6)} »`;
  if (k.startsWith('typo:police:')) return `les polices « ${pairePolices(k.slice(12))?.nom ?? k.slice(12)} »`;
  if (k.startsWith('composant:accueil:')) return `le premier écran « ${(LIBELLES_VARIANTES.accueil as Record<string, string> | undefined)?.[k.slice(18)] ?? k.slice(18)} »`;
  if (k.startsWith('photo:')) return 'cette photo';
  if (k.startsWith('structure:')) return `cette mise en page (${k.split(':')[1]})`;
  if (k.startsWith('picto:')) return k.includes('@direction-') ? `le style d’icônes ${k.slice(-1).toUpperCase()}` : 'le picto actuel';
  return libelleElement(k);
}
const pct = (x: number) => `${Math.round(100 * x)} %`;
/** Largeur CSS (sans espace insécable) */
const largeurCss = (x: number) => `${Math.max(0, Math.min(100, Math.round(100 * x)))}%`;

export default function Degustation(props: Props) {
  const prof = props.profession.id || 'defaut';
  const K = { session: `degustation:session:${prof}`, journal: `degustation:journal:${prof}`, choix: `degustation:choix:${prof}`, options: 'degustation:options' };
  const [onglet, setOnglet] = useState<'session' | 'libre' | 'palais'>('session');
  const [journal, setJournal] = useState<Jouee[]>([]);
  const [choixLocaux, setChoixLocaux] = useState<ChoixLeger[]>([]);
  const [options, setOptions] = useState({ son: false, rafale: true, autoValider: true });
  useEffect(() => { setJournal(lire(K.journal, [])); setChoixLocaux(lire(K.choix, [])); setOptions({ son: false, rafale: true, autoValider: true, ...lire(K.options, {}) }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [prof]);
  const majOptions = (o: Partial<{ son: boolean; rafale: boolean; autoValider: boolean }>) => setOptions((x) => { const n = { ...x, ...o }; ecrire(K.options, n); return n; });

  const rendu: ContexteRendu = useMemo(() => ({ proposes: props.proposes, modeles: props.modeles, catalogue: props.catalogue, marquesImportees: props.marquesImportees, themesActives: props.themesActives }),
    [props.proposes, props.modeles, props.catalogue, props.marquesImportees, props.themesActives]);
  const tranches = useMemo(() => ({ refuses: new Set(props.tranches.refuses), favoris: new Set(props.tranches.favoris) }), [props.tranches]);
  const notes = props.poids?.notesElements ?? {};
  const effets = props.poids?.assets?.effets ?? {};
  const moyenne = props.poids?.assets?.moyenne || 3;
  const modele = useCallback((id: string) => props.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id), [props.modeles]);
  const profilDe = useCallback((id: string | null) => props.profils.find((p) => p.id === id) ?? null, [props.profils]);

  // Note du juge pour un élément : prédiction la plus récente, sinon note estimée par l'apprentissage, sinon note de Paul
  const noteJuge = useCallback((k: string): number | null => {
    const l = props.predictions[k];
    if (l?.length) return [...l].sort((a, b) => (a.le < b.le ? 1 : -1))[0].note;
    if (effets[k] !== undefined) return moyenne + effets[k];
    return notes[k]?.m ?? null;
  }, [props.predictions, effets, moyenne, notes]);

  /** Famille choisie (n° 1) par profil dans les grilles « Directions » de cette session : base des grilles « Détail » */
  const famillesSession = useRef(new Map<string, IdFamilleStyle>());

  // ---- Génération d'une carte ----
  // Calcul sorti dans le core (degustation-cartes.ts : construireCarte, même code) pour tourner dans un Web Worker et préparer
  // les cartes suivantes pendant que Paul joue (perf, 2026-10-09) ; ici, la version synchrone (grille libre, regénération).
  const donnees = useMemo<DonneesCartes>(() => ({ profils: props.profils, photos: props.photos, poids: props.poids, predictions: props.predictions, familles: props.familles, modeles: props.modeles, tranches: props.tranches }),
    [props.profils, props.photos, props.poids, props.predictions, props.familles, props.modeles, props.tranches]);
  const outils = useMemo(() => outilsCartes(donnees), [donnees]);
  // Politique d'évaluation unique : délai de retour (50 écrans / 2 jours, toutes surfaces), vus sans être choisis et écartés jamais
  // reproposés (sauf épuisement), notes rapides dans l'ordre de la file (jamais notés à fort potentiel d'abord)
  const { ctx: politique, montrer } = useExpositions('degustation', props.politique);
  const refPolitique = useRef(politique);
  refPolitique.current = politique;
  const planifier = useCallback((graine: number) => ordonnerNotesPolitique(planifierSession(props.etat, { graine }), refPolitique.current, { notes: outils.notes, noteJuge: outils.noteJuge }), [props.etat, outils]);
  const familleSessionDe = (c: CarteSession) => (c.kind === 'grille' ? famillesSession.current.get(c.profil) ?? null : null);
  const construire = useCallback((c: CarteSession, graine: number): Courant | null => {
    const x = construireCarte(donnees, c, graine, familleSessionDe(c), outils);
    return x ? ({ ...x, debut: Date.now() } as Courant) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donnees, outils]);

  // ---- Préparation des cartes (Web Workers, 1 à 3 selon les cœurs) : carte demandée = (carte, graine, famille de session) ;
  // résultats gardés ; chaque carte part au worker le moins chargé (les cartes sans grille possible sont écartées en parallèle)
  // Workers partagés par l'onglet (pool-workers.ts : réchauffés dès l'arrivée dans l'admin), données de la page envoyées ici
  type Preparee = { promesse: Promise<CarteConstruite | null>; valeur?: CarteConstruite | null; prete: boolean };
  const avecOuvriers = useRef(false);
  const preparees = useRef(new Map<string, Preparee>());
  useEffect(() => {
    preparees.current.clear();
    avecOuvriers.current = diffuser('cartes', nbOuvriers(), { type: 'donnees', donnees, registres: lireRegistresTirage() });
    return () => { preparees.current.clear(); };
  }, [donnees]);
  const demander = useCallback((c: CarteSession, graine: number): Preparee => {
    const famille = familleSessionDe(c);
    const cle = `${graine}|${famille ?? ''}|${JSON.stringify(c)}`;
    const deja = preparees.current.get(cle);
    if (deja) return deja;
    const surPlace = () => construireCarte(donnees, c, graine, famille, outils);
    const promesse: Promise<CarteConstruite | null> = avecOuvriers.current
      ? demanderOuvrier('cartes', { type: 'carte', carte: c, graine, famille }).then((r) => (r?.ok ? (r.carte as CarteConstruite | null) ?? null : surPlace()))
      : new Promise((ok) => setTimeout(() => ok(surPlace()), 0));
    const e: Preparee = { promesse, prete: false };
    void promesse.then((v) => { e.valeur = v; e.prete = true; });
    preparees.current.set(cle, e);
    return e;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donnees, outils]);
  const graineCarte = (s: { id: string }, i: number) => (hasard(i + 1)() * 1e9) >>> 0 ^ s.id.length * 7919 + i;
  /** Cartes suivantes préparées pendant que Paul joue (les six prochaines) */
  const prechauffer = useCallback((s: EtatSession, i: number) => { for (let k = i; k < Math.min(s.cartes.length, i + 6); k++) demander(s.cartes[k], graineCarte(s, k)); }, [demander]);

  // ---- Session ----
  const [session, setSession] = useState<EtatSession | null>(null);
  const [reprise, setReprise] = useState<EtatSession | null>(null);
  useEffect(() => { const s = lire<EtatSession | null>(K.session, null); setReprise(s && sessionReprenable(s, new Date().toISOString()) ? s : null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [prof]);
  const [courant, setCourant] = useState<Courant | null>(null);
  const [sessionDuels, setSessionDuels] = useState<Duel[]>([]);
  const [sessionJouees, setSessionJouees] = useState<Jouee[]>([]);
  const [fin, setFin] = useState(false);
  const [message, setMessage] = useState('');
  const [revelation, setRevelation] = useState<{ texte: string; accord: boolean | null; xp: number } | null>(null);
  const [confettis, setConfettis] = useState(0);
  const libre = useRef<{ profil: string; format: FormatGrille }>({ profil: props.profils[0]?.id ?? '', format: 'compositions' });

  const [attenteCarte, setAttenteCarte] = useState(false);
  const jeton = useRef(0);
  const ouvrir = useCallback(async (s: EtatSession, pos: number) => {
    const j = ++jeton.current;
    const servir = (i: number, x: CarteConstruite) => { const n = { ...s, position: i }; setSession(n); ecrire(K.session, n); setAttenteCarte(false); setCourant({ ...x, debut: Date.now() } as Courant); prechauffer(s, i + 1); };
    // Carte bloquée par la politique (élément jugé en délai, vu sans être choisi, écarté) : passée, servie seulement si rien ne reste
    let repli: { i: number; x: CarteConstruite } | null = null;
    for (let i = pos; i < s.cartes.length; i++) {
      const e = demander(s.cartes[i], graineCarte(s, i));
      if (!e.prete) { setCourant(null); setAttenteCarte(true); prechauffer(s, i + 1); }
      const x0 = e.prete ? e.valeur ?? null : await e.promesse;
      if (j !== jeton.current) return;
      const x = x0 ? carteSelonPolitique(x0, refPolitique.current) : null;
      if (x0 && !x && !repli) repli = { i, x: x0 };
      if (x) { servir(i, x); return; }
    }
    if (repli) { servir(repli.i, repli.x); return; }
    setAttenteCarte(false);
    setSession({ ...s, position: s.cartes.length }); ecrire(K.session, null); setCourant(null); setFin(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demander, prechauffer]);

  // Session du jour planifiée dès l'arrivée sur la page et ses premières cartes préparées en arrière-plan (première carte prête
  // au clic sur « Commencer ») : même planification, mêmes graines qu'au clic
  const planPrepare = useRef<{ id: string; cartes: CarteSession[]; etat: unknown } | null>(null);
  useEffect(() => {
    const p = { id: `s-${Date.now().toString(36)}`, cartes: planifier(Date.now() % 100000), etat: props.etat };
    planPrepare.current = p;
    prechauffer({ id: p.id, debut: '', position: 0, cartes: p.cartes }, 0);
  }, [props.etat, prechauffer, planifier]);

  const commencer = useCallback(() => {
    const prepare = planPrepare.current && planPrepare.current.etat === props.etat ? planPrepare.current : null;
    planPrepare.current = null;
    const id = prepare?.id ?? `s-${Date.now().toString(36)}`;
    const cartes = prepare?.cartes ?? planifier(Date.now() % 100000);
    setSessionDuels([]); setSessionJouees([]); setFin(false); setReprise(null); setRevelation(null);
    ouvrir({ id, debut: new Date().toISOString(), position: 0, cartes }, 0);
  }, [props.etat, ouvrir, planifier]);
  const reprendre = () => { if (!reprise) return; setReprise(null); setFin(false); ouvrir(reprise, reprise.position); };

  const lancerLibre = useCallback((profil: string, format: FormatGrille) => {
    libre.current = { profil, format };
    const c: CarteSession = { id: `l${Date.now()}`, kind: 'grille', format, dimension: DIMENSIONS_FORMAT[format][Math.floor(Math.random() * DIMENSIONS_FORMAT[format].length)], profil, valeur: 0 };
    const x = construire(c, Date.now() % 1000003);
    setCourant(x); setSession(null); setFin(false);
    setMessage('');
    if (!x) setMessage('Pas assez de propositions inédites pour ce profil et ce format : essayez un autre format.');
  }, [construire]);

  // ---- Jeu : XP, série, médailles ----
  const choixTous = useMemo(() => [...props.choix, ...choixLocaux], [props.choix, choixLocaux]);
  const jours = useMemo(() => [...props.joursActifs, ...journal.map((j) => j.le.slice(0, 10))], [props.joursActifs, journal]);
  const serie = serieDegustation(jours);
  const sessionsLocales = useMemo(() => new Set(journal.map((j) => j.session)), [journal]);
  const xpTotal = useMemo(() => journal.reduce((s, j) => s + j.xp, 0) + 10 * props.choix.filter((c) => !c.session || !sessionsLocales.has(c.session)).length, [journal, props.choix, sessionsLocales]);
  const niveau = niveauPalais(xpTotal);
  const nomDimension = useCallback((id: string) => { const e = props.elements.find((x) => x.dim === id); return (e && dimensionElement(e.cle, e.sujet ? [e.sujet] : [])?.nom) ?? id; }, [props.elements]);
  const missions = useMemo(() => props.profils.map((p) => {
    const f = props.faits[p.id] ?? { grilles: 0, kits: 0, recettesGardees: 0 };
    const loc = choixLocaux.filter((c) => c.profil === p.id);
    const j = journal.filter((x) => x.kind === 'grille' && x.profil === p.id && !x.enBase).length;
    return missionProfil(p, { grilles: f.grilles + Math.max(j, loc.filter((c) => c.format !== 'kits').length), kits: f.kits + loc.filter((c) => c.format === 'kits').length, recettesGardees: f.recettesGardees });
  }), [props.profils, props.faits, choixLocaux, journal]);
  const parisTous = useMemo(() => parisDesChoix(choixTous as ChoixGrille[]), [choixTous]);
  const score = scoreBatsClaude(parisTous, new Date().toISOString());
  const etatMedailles = useCallback((pret: Record<string, number>, grillesEnPlus: number): Medaille[] => medailles({
    grilles: choixTous.length + grillesEnPlus, serie,
    dimensionsCouvertes: [...new Set(Object.values(props.etat.couvertes).flat())].map((id) => ({ id, nom: nomDimension(id) })),
    profilsPrets: props.profils.filter((p) => (pret[p.id] ?? 0) >= 1).map((p) => ({ id: p.id, nom: p.nom })), missions, accord: score,
  }), [choixTous.length, serie, props.etat.couvertes, props.profils, missions, score, nomDimension]);
  const medaillesDebut = useRef<Medaille[] | null>(null);
  useEffect(() => { if (!medaillesDebut.current) medaillesDebut.current = etatMedailles(props.etat.pret, 0); }, [etatMedailles, props.etat.pret]);

  // Part prête estimée APRÈS la session (effets de la session ajoutés, ±0,5 ★ au plus)
  const pretApres = useMemo(() => {
    const ef = effetSession(sessionDuels);
    const est = (k: string) => (effets[k] !== undefined || ef[k] !== undefined ? moyenne + Math.max(-1, Math.min(1, (effets[k] ?? 0) + (ef[k] ?? 0))) : null);
    return Object.fromEntries(props.profils.map((p) => [p.id, pretProfil(elementsDuProfil(props.elements, p.sujets), (k) => notes[k]?.m ?? null, est).pret]));
  }, [sessionDuels, effets, moyenne, props.profils, props.elements, notes]);

  const noter = useCallback((j: Jouee) => {
    setJournal((l) => { const n = [j, ...l].slice(0, 5000); ecrire(K.journal, n); return n; });
    setSessionJouees((l) => [...l, j]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suivante = useCallback(() => {
    setSelection({ meilleures: [], pire: null }); setModePire(false); setAgrandi(null);
    if (session) ouvrir(session, session.position + 1);
    else if (onglet === 'libre') lancerLibre(libre.current.profil, libre.current.format);
  }, [session, ouvrir, onglet, lancerLibre]);

  // ---- Saisie d'une grille ----
  const [selection, setSelection] = useState<{ meilleures: number[]; pire: number | null }>({ meilleures: [], pire: null });
  const [modePire, setModePire] = useState(false);
  const [agrandi, setAgrandi] = useState<number | null>(null);
  const survol = useRef<number | null>(null);
  const toucher = useCallback((i: number) => {
    if (!courant || courant.kind !== 'grille') return;
    setSelection((s) => {
      if (modePire) return { ...s, pire: s.pire === i ? null : i, meilleures: s.meilleures.filter((x) => x !== i) };
      if (s.meilleures.includes(i)) return { ...s, meilleures: s.meilleures.filter((x) => x !== i) };
      if (s.meilleures.length >= 2) return s;
      return { meilleures: [...s.meilleures, i], pire: s.pire === i ? null : s.pire };
    });
    setModePire(false);
  }, [courant, modePire]);

  const scenarioDuel = (p: Profil) => ({ sujets: p.sujets.slice(0, 6), principaux: p.scenario.principaux.length, ...(p.scenario.couleurs.length ? { couleurs: p.scenario.couleurs.slice(0, 3) } : {}) });

  const valider = useCallback(async () => {
    if (!courant || courant.kind !== 'grille') return;
    const n = courant.grille.propositions.length;
    if (!selection.meilleures.length || (n >= 4 && selection.meilleures.length < 2)) { setMessage('Touchez vos deux préférées.'); return; }
    const f = formatGrille(courant.grille.format)!;
    const choix: ChoixGrille = {
      format: courant.grille.format, type: f.type, dimension: courant.grille.dimension, scenario: scenarioDuel(courant.profil),
      propositions: courant.grille.propositions.map((p) => ({ cle: p.cle, ingredients: p.ingredients })), meilleures: selection.meilleures, pire: selection.pire, pari: courant.pari,
      appareil: f.appareil === 'mobile' ? 'mobile' : 'ordinateur', session: session?.id ?? null, dureeMs: Date.now() - courant.debut, profession: props.profession.id || null, profil: courant.profil.id, le: new Date().toISOString(),
    };
    const accord = courant.pari === null ? null : selection.meilleures.includes(courant.pari);
    const xp = xpCarte('grille', { pire: selection.pire !== null, serie }) + (accord === false ? 0 : 0);
    setSessionDuels((l) => [...l, ...duelsDepuisChoix(choix)]);
    // Mémoire de la session (la grille elle-même est journalisée dans degustation_choix, relue par la politique)
    montrer(expositionsCarte(courant as unknown as CarteConstruite, { meilleures: selection.meilleures, pire: selection.pire }));
    if (courant.grille.format === 'directions') { const f = courant.grille.propositions[selection.meilleures[0]]?.nouveau.slice(8); if (f) famillesSession.current.set(courant.profil.id, f as IdFamilleStyle); }
    const j: Jouee = { le: choix.le!, kind: 'grille', xp, profil: courant.profil.id, accordClaude: accord, dureeMs: choix.dureeMs ?? 0, session: session?.id ?? 'libre', enBase: !props.migrationManquante };
    noter(j);
    const nums = selection.meilleures.map((i) => `la n° ${i + 1}`).join(' et ');
    setRevelation({ texte: courant.pari === null ? `Claude n’a pas parié (aucune prédiction). Tu as choisi ${nums}.` : `Claude avait parié sur la n° ${courant.pari + 1}, tu as choisi ${nums}.`, accord, xp });
    if (options.son) jouerSon(accord !== true);
    suivante();
    const r = await enregistrerChoixGrille(choix as unknown as Record<string, unknown>).catch(() => ({ ok: false, message: 'Connexion perdue : choix gardé dans ce navigateur.', migrationManquante: true }));
    if (!r.ok && r.migrationManquante) {
      const leger: ChoixLeger = { ...choix, propositions: choix.propositions.map((p) => ({ cle: p.cle, ingredients: { element: p.ingredients.element ?? null, assets: p.ingredients.assets, atelier: p.ingredients.atelier } })) };
      setChoixLocaux((l) => { const x = [leger, ...l].slice(0, 2000); ecrire(K.choix, x); return x; });
    } else if (!r.ok) setMessage(r.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courant, selection, session, serie, options.son, noter, suivante, props.migrationManquante, props.profession.id]);

  const duel = useCallback(async (res: 'a' | 'b') => {
    if (!courant || courant.kind !== 'duel') return;
    const [a, b] = courant.grille.propositions;
    const d = { type: 'theme' as const, scenario: scenarioDuel(courant.profil), aCle: a.cle, bCle: b.cle, aIngredients: a.ingredients, bIngredients: b.ingredients, dimension: courant.grille.dimension, resultat: res, etiquettes: [], appareil: 'ordinateur', prediction: courant.pari };
    setSessionDuels((l) => [...l, { ...d, le: new Date().toISOString() }]);
    montrer(expositionsCarte(courant as unknown as CarteConstruite, { duel: res }));
    const accord = courant.pari === null || courant.pari === 'egalite' ? null : courant.pari === res;
    const xp = xpCarte('duel', { serie });
    noter({ le: new Date().toISOString(), kind: 'duel', xp, profil: courant.profil.id, accordClaude: accord, dureeMs: Date.now() - courant.debut, session: session?.id ?? 'libre' });
    setRevelation({ texte: courant.pari && courant.pari !== 'egalite' ? `Claude avait parié sur ${courant.pari.toUpperCase()}, tu as choisi ${res.toUpperCase()}.` : `Tu as choisi ${res.toUpperCase()}.`, accord, xp });
    if (options.son) jouerSon(accord !== true);
    suivante();
    const r = await enregistrerDuel(d as unknown as Record<string, unknown>).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    if (!r.ok) setMessage(r.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courant, serie, options.son, noter, suivante, session]);

  const [noteSaisie, setNoteSaisie] = useState<number | null>(null);
  const noterVite = useCallback(async (note: number) => {
    if (!courant || courant.kind !== 'note') return;
    const tranche = note === 1 || note === 5;
    const xp = xpCarte('note', { tranche, serie });
    const accord = courant.pari === null ? null : Math.abs(courant.pari - note) <= 1;
    montrer(expositionsCarte(courant as unknown as CarteConstruite, { note }));
    noter({ le: new Date().toISOString(), kind: 'note', xp, profil: courant.profil?.id ?? null, accordClaude: accord, dureeMs: Date.now() - courant.debut, session: session?.id ?? 'libre', tranche });
    setRevelation({ texte: `${note} ★${tranche ? (note === 5 ? ' : favori, plus redemandé' : ' : refusé, plus jamais montré') : ''}${courant.pari !== null ? ` · Claude prévoyait ${courant.pari} ★` : ''}`, accord, xp });
    setNoteSaisie(null);
    suivante();
    const r = await ajouterNoteAsset(courant.cle, note, [], '', null, { appareil: 'ordinateur' }).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    if (!r.ok) setMessage(r.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courant, serie, noter, suivante, session]);

  // Passer : écran SANS choix journalisé comme expositions (pas choisi, « celle qui ne va pas », note ignorée) ; sans la migration
  // 0054 : mémoire de secours du navigateur (useExpositions)
  const passer = useCallback(() => {
    if (courant) montrer(expositionsCarte(courant as unknown as CarteConstruite, courant.kind === 'grille' ? { meilleures: selection.meilleures, pire: selection.pire } : null), { journaliser: true });
    suivante();
  }, [courant, selection, montrer, suivante]);

  // Annuler : ← retire le dernier choix de la grille
  const annuler = useCallback(() => setSelection((s) => (s.pire !== null && modePire ? { ...s, pire: null } : { ...s, meilleures: s.meilleures.slice(0, -1) })), [modePire]);

  // Valider stable (validation automatique au 2e choix : une seule minuterie, toujours la dernière saisie)
  const refValider = useRef(valider);
  refValider.current = valider;
  const validerStable = useCallback(() => { void refValider.current(); }, []);

  // Contrôle « différence perceptible » (empreintes du rendu) : deux vignettes identiques à l'œil → grille regénérée (2 essais),
  // sinon les doublons sont retirés (au moins 3 propositions) ; jamais une grille aux vignettes identiques
  const regenerations = useRef(0);
  const identiques = useCallback((paires: [number, number][]) => {
    if (!courant || courant.kind !== 'grille') return;
    if (regenerations.current < 2) {
      regenerations.current++;
      const x = construire(courant.carte, (Date.now() + 7919 * regenerations.current) % 1000003);
      if (x) { setSelection({ meilleures: [], pire: null }); setCourant(x); setMessage('Deux propositions se ressemblaient trop à l’écran : grille regénérée.'); return; }
    }
    const retirer = new Set(paires.map(([, j]) => j));
    const reste = courant.grille.propositions.filter((_, i) => !retirer.has(i));
    if (reste.length >= 3) { setSelection({ meilleures: [], pire: null }); setCourant({ ...courant, grille: { ...courant.grille, propositions: reste }, pari: null }); setMessage('Propositions trop proches retirées de la grille.'); }
    else { setMessage('Grille trop uniforme à l’écran : passée.'); suivante(); }
  }, [courant, construire, suivante]);
  useEffect(() => { regenerations.current = 0; }, [courant?.carte.id]);

  // ---- Clavier ----
  const ref = useRef({ toucher, valider, duel, noterVite, annuler, courant, agrandi, rafale: options.rafale, noteSaisie });
  ref.current = { toucher, valider, duel, noterVite, annuler, courant, agrandi, rafale: options.rafale, noteSaisie };
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable))) return;
      const r = ref.current, c = r.courant;
      if (!c) return;
      if (c.kind === 'grille') {
        if (/^[1-6]$/.test(e.key) && Number(e.key) <= c.grille.propositions.length) { e.preventDefault(); r.toucher(Number(e.key) - 1); return; }
        if (e.key === 'p' || e.key === 'P' || e.key === 'x' || e.key === 'X') { e.preventDefault(); setModePire((m) => !m); return; }
        if (e.key === 'Enter' && !(t && t.tagName === 'BUTTON')) { e.preventDefault(); void r.valider(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); r.annuler(); return; }
        if (e.key === ' ') { e.preventDefault(); setAgrandi((a) => (a !== null ? null : survol.current ?? 0)); return; }
        if (e.key === 'Escape') { setAgrandi(null); return; }
      } else if (c.kind === 'duel') {
        if (e.key === 'ArrowLeft' || e.key === '1') { e.preventDefault(); void r.duel('a'); }
        if (e.key === 'ArrowRight' || e.key === '2') { e.preventDefault(); void r.duel('b'); }
      } else if (c.kind === 'note' && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        if (r.rafale) void r.noterVite(Number(e.key)); else setNoteSaisie(Number(e.key));
      } else if (c.kind === 'note' && e.key === 'Enter' && r.noteSaisie) { e.preventDefault(); void r.noterVite(r.noteSaisie); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  // Révélation : quelques secondes
  useEffect(() => { if (!revelation) return; const t = setTimeout(() => setRevelation(null), 4200); return () => clearTimeout(t); }, [revelation]);

  // Fin de session : médailles nouvelles → confettis
  const finInfos = useMemo(() => {
    if (!fin) return null;
    const apres = etatMedailles(pretApres, 0);
    const nouvelles = nouvellesMedailles(medaillesDebut.current ?? [], apres);
    return { nouvelles };
  }, [fin, etatMedailles, pretApres]);
  useEffect(() => { if (finInfos?.nouvelles.length) setConfettis(Date.now()); }, [finInfos]);

  // ---- Défi du jour ----
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const defiJour = props.defi ?? defiDuJour(aujourdhui, []);
  const defiAv = avancementDefi(defiJour, journal.filter((j) => j.le.startsWith(aujourdhui) && j.kind !== 'bonus').reverse().map((j) => ({ ...j, kind: j.kind as CarteSession['kind'] })));
  // Défi réussi : bonus d'XP une fois par jour
  const defiPaye = journal.some((j) => j.kind === 'bonus' && j.le.startsWith(aujourdhui) && j.session === `defi:${defiJour.id}`);
  useEffect(() => {
    if (defiAv.reussi && !defiPaye) { noter({ le: new Date().toISOString(), kind: 'bonus', xp: defiJour.xp, profil: null, accordClaude: null, dureeMs: 0, session: `defi:${defiJour.id}` }); setConfettis(Date.now()); }
  }, [defiAv.reussi, defiPaye, defiJour, noter]);

  // ---- Rendu ----
  const restantes = session ? session.cartes.slice(session.position) : [];
  const progression = session ? Math.min(1, (session.position) / Math.max(1, session.cartes.length)) : 0;
  const xpSession = sessionJouees.reduce((s, j) => s + j.xp, 0);
  const accordSession = (() => { const l = sessionJouees.filter((j) => j.accordClaude !== null); return { n: l.length, ok: l.filter((j) => j.accordClaude).length }; })();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Confettis cle={confettis} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Dégustation" className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
          {([['session', 'Dégustation du jour'], ['libre', 'Grille libre'], ['palais', 'Mon palais']] as const).map(([id, nom]) => (
            <button key={id} type="button" role="tab" aria-selected={onglet === id} onClick={() => { setOnglet(id); if (id === 'libre') lancerLibre(libre.current.profil, libre.current.format); }}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${focus} ${onglet === id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>{nom}</button>
          ))}
        </div>
        <BandeauPalais niveau={niveau} serie={serie} xpSession={xpSession} />
      </div>

      {message && <p role="status" className="rounded-xl bg-neutral-50 p-2.5 text-sm ring-1 ring-black/5">{message} <button type="button" className="ml-2 underline" onClick={() => setMessage('')}>OK</button></p>}

      {onglet === 'palais' ? (
        <MonPalais niveau={niveau} serie={serie} score={score} semaine={props.parisSemaine} defi={defiJour} defiAv={defiAv} missions={missions} lienPublier={props.lienPublier}
          profils={props.profils} pret={props.etat.pret} medailles={etatMedailles(props.etat.pret, 0)} couvertes={[...new Set(Object.values(props.etat.couvertes).flat())].map(nomDimension)}
          grilles={choixTous.length} options={options} onOptions={majOptions} />
      ) : fin ? (
        <FinSession jouees={sessionJouees} duels={sessionDuels} profils={props.profils} avant={props.etat.pret} apres={pretApres} nouvelles={finInfos?.nouvelles ?? []} niveauAvant={niveauPalais(xpTotal - xpSession)} niveau={niveau}
          score={score} defi={defiJour} defiAv={defiAv} onRecommencer={commencer} onPalais={() => setOnglet('palais')} />
      ) : onglet === 'session' && !courant && !attenteCarte ? (
        <Accueil etat={props.etat} reprise={reprise} onCommencer={commencer} onReprendre={reprendre} defi={defiJour} defiAv={defiAv} profils={props.profils} />
      ) : (
        <>
          {onglet === 'libre' && (
            <ChoixLibre profils={props.profils} formats={props.formats} valeur={libre.current} onChange={(p, f) => lancerLibre(p, f)} />
          )}
          {session && (
            <div className="grid gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">Carte {Math.min(session.position + 1, session.cartes.length)} / {session.cartes.length}</span>
                <span className="text-neutral-600">{texteDuree(tempsEstime(restantes))} restantes · Claude {accordSession.ok} – Toi {accordSession.n - accordSession.ok}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuemin={0} aria-valuemax={session.cartes.length} aria-valuenow={session.position}>
                <div className="h-full rounded-full bg-teal-700 motion-safe:transition-[width] motion-safe:duration-500" style={{ width: largeurCss(progression) }} />
              </div>
            </div>
          )}
          {revelation && (
            <p role="status" className={`degustation-revelation flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${revelation.accord === false ? 'bg-amber-50 ring-amber-200' : revelation.accord ? 'bg-teal-50 ring-teal-200' : 'bg-neutral-50 ring-black/5'}`}>
              <span>{revelation.texte}</span>
              <strong className="ml-auto tabular-nums text-teal-800 motion-safe:animate-[degustation-xp_.6s_ease-out]">+{revelation.xp} XP</strong>
              <style>{'@keyframes degustation-xp { from { transform: translateY(6px); opacity: 0 } to { transform: none; opacity: 1 } }'}</style>
            </p>
          )}
          {attenteCarte && !courant && <p role="status" className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-neutral-700">Préparation de la carte…</p>}
          {courant?.kind === 'grille' && (
            <CarteGrille c={courant} selection={selection} modePire={modePire} rendu={rendu} onToucher={toucher} onSurvol={(i) => { survol.current = i; }} agrandi={agrandi} onAgrandir={setAgrandi}
              onPire={() => setModePire((m) => !m)} onValider={validerStable} onAnnuler={annuler} onPasser={passer}
              autoValider={options.autoValider} onIdentiques={identiques} />
          )}
          {courant?.kind === 'duel' && <CarteDuel c={courant} rendu={rendu} onChoisir={(r) => void duel(r)} onPasser={passer} />}
          {courant?.kind === 'note' && (
            <CarteNote c={courant} rendu={rendu} rafale={options.rafale} saisie={noteSaisie} onSaisie={setNoteSaisie} onNoter={(n) => void noterVite(n)} onRafale={(v) => majOptions({ rafale: v })} onPasser={passer} />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Morceaux
// ---------------------------------------------------------------------------------------------------------------

function BandeauPalais({ niveau, serie, xpSession }: { niveau: ReturnType<typeof niveauPalais>; serie: number; xpSession: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-black/10" aria-label="Mon palais">
      <span className="font-semibold text-teal-900">{niveau.nom}</span>
      <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200 sm:block" aria-hidden="true"><span className="block h-full bg-amber-500" style={{ width: largeurCss(niveau.part) }} /></span>
      <span className="tabular-nums text-neutral-700">{niveau.xp} XP{xpSession ? <span className="text-teal-800"> (+{xpSession})</span> : null}</span>
      <span title="Jours d’affilée" className="tabular-nums">🔥 {serie}</span>
    </div>
  );
}

function Accueil({ etat, reprise, onCommencer, onReprendre, defi, defiAv, profils }: { etat: Props['etat']; reprise: EtatSession | null; onCommencer: () => void; onReprendre: () => void; defi: DefiDuJour; defiAv: { fait: number; reussi: boolean }; profils: Profil[] }) {
  const plan = useMemo(() => planifierSession(etat, { graine: 1 }), [etat]);
  const enRetard = [...profils].sort((a, b) => (etat.pret[a.id] ?? 0) - (etat.pret[b.id] ?? 0)).slice(0, 3);
  return (
    <section className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
      <div className="grid gap-1">
        <h2 className="text-xl font-bold">Dégustation du jour</h2>
        <p className="text-sm text-neutral-700">{plan.length} cartes · environ {texteDuree(tempsEstime(plan))} · d’abord des directions très différentes, puis les détails dans vos styles préférés.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {reprise && <button type="button" onClick={onReprendre} className={`min-h-12 rounded-xl bg-teal-800 px-5 text-base font-bold text-white ${focus}`}>Reprendre ({reprise.cartes.length - reprise.position} cartes restantes)</button>}
        <button type="button" onClick={onCommencer} className={`min-h-12 rounded-xl px-5 text-base font-bold ${reprise ? 'border border-teal-800 text-teal-900' : 'bg-teal-800 text-white'} ${focus}`}>Commencer la dégustation</button>
      </div>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200"><strong>Défi du jour :</strong> {defi.texte} — {defiAv.reussi ? 'réussi ✓' : `${defiAv.fait}/${defi.cible}`} (+{defi.xp} XP)</p>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Profils à faire progresser</h3>
        <ul className="grid gap-2 sm:grid-cols-3">
          {enRetard.map((p) => <li key={p.id}><Jauge nom={`Profil ${p.nom}`} part={etat.pret[p.id] ?? 0} /></li>)}
        </ul>
      </div>
      <p className="text-xs text-neutral-500">Raccourcis : 1 à 6 choisir · P puis un numéro : celle qui ne va pas · Entrée valider · ← annuler · Espace agrandir.</p>
    </section>
  );
}

function Jauge({ nom, part, avant }: { nom: string; part: number; avant?: number }) {
  return (
    <div className="grid gap-1 rounded-xl bg-neutral-50 p-2.5 ring-1 ring-black/5">
      <span className="flex items-baseline justify-between gap-2 text-sm"><span className="min-w-0 truncate font-medium">{nom}</span><span className="shrink-0 tabular-nums">{avant !== undefined && Math.round(100 * avant) !== Math.round(100 * part) ? `${pct(avant)} → ` : ''}{pct(part)} prêt</span></span>
      <span className="h-2 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true"><span className="block h-full rounded-full bg-teal-700 motion-safe:transition-[width] motion-safe:duration-700" style={{ width: largeurCss(part) }} /></span>
    </div>
  );
}

function ChoixLibre({ profils, formats, valeur, onChange }: { profils: Profil[]; formats: FormatGrille[]; valeur: { profil: string; format: FormatGrille }; onChange: (p: string, f: FormatGrille) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="grid gap-1 text-sm"><span className="font-medium">Profil</span>
        <select value={valeur.profil} onChange={(e) => onChange(e.target.value, valeur.format)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
          {profils.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm"><span className="font-medium">Format</span>
        <select value={valeur.format} onChange={(e) => onChange(valeur.profil, e.target.value as FormatGrille)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
          {formats.map((f) => <option key={f} value={f}>{formatGrille(f)!.nom}</option>)}
        </select>
      </label>
    </div>
  );
}

/** Formats dont les vignettes sont des pages rendues (empreinte du rendu, recadrage automatique) */
const FORMATS_PAGES = new Set(['directions', 'compositions', 'premiers-ecrans', 'pages']);

function CarteGrille({ c, selection, modePire, rendu, onToucher, onSurvol, agrandi, onAgrandir, onPire, onValider, onAnnuler, onPasser, autoValider, onIdentiques }: {
  c: Extract<Courant, { kind: 'grille' }>; selection: { meilleures: number[]; pire: number | null }; modePire: boolean; rendu: ContexteRendu;
  onToucher: (i: number) => void; onSurvol: (i: number | null) => void; agrandi: number | null; onAgrandir: (i: number | null) => void; onPire: () => void; onValider: () => void; onAnnuler: () => void; onPasser: () => void;
  autoValider: boolean; onIdentiques: (paires: [number, number][]) => void;
}) {
  const f = formatGrille(c.grille.format)!;
  const directions = c.grille.format === 'directions';
  const focale = DIMENSIONS_FOCALES.has(c.grille.dimension);
  const mobile = f.appareil === 'mobile' || focale;
  const scenario = useMemo(() => ({ principaux: c.profil.scenario.principaux, secondaires: c.profil.scenario.secondaires, couleurs: c.profil.scenario.couleurs }), [c.profil]);
  const n = c.grille.propositions.length;
  const [h, setH] = useState(220);
  useEffect(() => {
    const m = () => setH(focale ? (window.innerWidth < 640 ? 300 : 380) : window.innerWidth < 640 ? (mobile ? 300 : 170) : mobile ? 420 : directions ? 300 : 250);
    m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m);
  }, [mobile, focale, directions]);
  const pret = selection.meilleures.length >= Math.min(2, n - 1);

  // ---- Contrôle « différence perceptible » sur le RENDU : empreintes, recadrage sur la zone qui diffère, refus si identiques ----
  const liste = useRef<HTMLUListElement | null>(null);
  const [recadrage, setRecadrage] = useState<number | null>(null);
  useEffect(() => {
    setRecadrage(null);
    if (!FORMATS_PAGES.has(c.grille.format) || focale) return;
    let annule = false;
    const t = setTimeout(async () => {
      // Aperçus montés progressivement (CadreApercu) : le contrôle attend qu'ils soient tous montés et remplis
      await apercusMontes(liste.current);
      if (annule) return;
      const cartes = Array.from(liste.current?.querySelectorAll<HTMLLIElement>('li[data-carte]') ?? []);
      const iframes = cartes.map((li) => li.querySelector('iframe'));
      // Une vignette par tâche (perf, 2026-10-09) : même empreinte, le fil principal respire entre deux
      const empreintes: ReturnType<typeof empreinteIframe>[] = [];
      for (const x of iframes) { empreintes.push(empreinteIframe(x)); await new Promise((ok) => setTimeout(ok, 0)); if (annule) return; }
      const hauteurVue = iframes.find((x) => x?.contentWindow)?.contentWindow?.innerHeight ?? 800;
      const r = comparerEmpreintes(empreintes, Math.round(hauteurVue * 0.9));
      if (r.identiques.length) { onIdentiques(r.identiques); return; }
      if (r.y > 0 && !directions) { for (const x of iframes) x?.contentWindow?.scrollTo(0, r.y); setRecadrage(r.y); }
    }, 2200);
    return () => { annule = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.grille]);

  // ---- Validation automatique dès le 2e choix (option, activée par défaut) ----
  useEffect(() => {
    if (!autoValider || selection.meilleures.length < Math.min(2, n - 1)) return;
    const t = setTimeout(onValider, 450);
    return () => clearTimeout(t);
  }, [autoValider, selection.meilleures.length, n, onValider]);

  // ---- Superposer (toucher long sur une carte) : cette carte et la n° 1 (ou la voisine) au même endroit, bascule au toucher ----
  const [superpose, setSuperpose] = useState<[number, number] | null>(null);
  const [voirB, setVoirB] = useState(false);
  const appui = useRef<number | null>(null);
  const long = useRef(false);
  const debutAppui = (i: number) => { long.current = false; appui.current = window.setTimeout(() => { appui.current = null; long.current = true; setSuperpose([selection.meilleures[0] ?? (i === 0 ? 1 : 0), i]); setVoirB(true); }, 550); };
  const finAppui = () => { if (appui.current) { clearTimeout(appui.current); appui.current = null; } };

  const titre = directions ? 'Choisis tes 2 directions préférées' : 'Choisis tes 2 préférées';
  return (
    <section aria-label={`Grille : ${titre}`} className="grid gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold">{titre}</h2>
        <span className="text-sm text-neutral-700">
          {directions ? `profil ${c.profil.nom} · des styles complètement différents` : <>profil {c.profil.nom} · <strong className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-950">Évalué ici : {repereEvalue(c.grille.dimension)}</strong>{recadrage ? ' · vignettes recadrées sur ce qui change' : ''}</>}
        </span>
      </div>
      <ul ref={liste} className={`grid gap-2 sm:gap-3 ${mobile && !focale ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {c.grille.propositions.map((p, i) => {
          const rang = selection.meilleures.indexOf(i);
          const pire = selection.pire === i;
          return (
            <li key={p.cle} data-carte={i} onMouseEnter={() => onSurvol(i)} onMouseLeave={() => onSurvol(null)} className="relative grid min-w-0 content-start gap-1">
              {!directions && p.etiquette && <span className="truncate px-1 text-xs font-semibold text-neutral-800" title={p.etiquette}>{p.etiquette}</span>}
              <button type="button" onClick={() => { if (long.current) { long.current = false; return; } onToucher(i); }} onPointerDown={() => debutAppui(i)} onPointerUp={finAppui} onPointerLeave={finAppui} onContextMenu={(e) => e.preventDefault()}
                aria-pressed={rang >= 0 || pire} aria-label={`Proposition ${i + 1}${p.etiquette ? ` : ${p.etiquette}` : ''}${rang >= 0 ? `, préférée n° ${rang + 1}` : ''}${pire ? ', celle qui ne va pas' : ''}`}
                className={`relative block w-full overflow-hidden rounded-xl bg-neutral-100 text-left ring-1 motion-safe:transition motion-safe:duration-200 ${focus} ${rang >= 0 ? 'ring-4 ring-teal-700 motion-safe:scale-[0.98]' : pire ? 'ring-4 ring-red-600 opacity-70' : 'ring-black/10 hover:ring-teal-700/50'}`}>
                <span className="pointer-events-none block min-w-0" aria-hidden="true">
                  <VignetteProposition p={p} format={c.grille.format} dimension={c.grille.dimension} scenario={scenario} rendu={rendu} hauteur={h} />
                </span>
                <span className={`pointer-events-none absolute left-2 grid size-7 place-items-center rounded-full bg-white/90 text-sm font-bold text-neutral-900 ring-1 ring-black/10 ${focale ? 'bottom-2' : 'top-2'}`}>{i + 1}</span>
                {rang >= 0 && <span className="pointer-events-none absolute right-12 top-2 rounded-full bg-teal-700 px-2 py-0.5 text-xs font-bold text-white motion-safe:animate-[degustation-pop_.25s_ease-out]">n°&nbsp;{rang + 1}</span>}
                {pire && <span className="pointer-events-none absolute right-12 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">ne va pas</span>}
              </button>
              {directions && (
                <span className="grid px-1 leading-tight">
                  <strong className="text-sm">{p.etiquette}</strong>
                  <span className="text-xs text-neutral-600">{(p.mots ?? []).join(' · ')}</span>
                </span>
              )}
              <button type="button" onClick={() => onAgrandir(i)} aria-label={`Agrandir la proposition ${i + 1}`} className={`absolute right-1.5 grid size-9 place-items-center rounded-full bg-white/95 text-sm ring-1 ring-black/10 ${directions ? 'top-1.5' : 'top-6'} ${focus}`}>⤢</button>
            </li>
          );
        })}
      </ul>
      <style>{'@keyframes degustation-pop { from { transform: scale(.6); opacity: 0 } to { transform: none; opacity: 1 } }'}</style>
      <p className="text-xs text-neutral-500">Toucher long (ou clic maintenu) sur une carte : la superposer à votre n°&nbsp;1 pour comparer.{autoValider ? ' Validation automatique au 2e choix.' : ''}</p>
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center gap-1.5 rounded-xl bg-white/95 p-2 ring-1 ring-black/10 backdrop-blur sm:gap-2">
        <button type="button" onClick={onPire} aria-pressed={modePire} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${focus} ${modePire ? 'bg-red-600 text-white' : 'border border-red-300 text-red-800'}`}>{modePire ? 'Touchez-la' : <>✕ <span className="hidden sm:inline">Celle qui </span>ne va pas</>}</button>
        <button type="button" onClick={onAnnuler} className={`min-h-11 rounded-xl border border-neutral-300 px-3 text-sm ${focus}`} aria-label="Annuler le dernier choix">←<span className="hidden sm:inline"> Annuler</span></button>
        <button type="button" onClick={onPasser} className={`min-h-11 rounded-xl px-2 text-sm text-neutral-600 underline ${focus}`}>Passer</button>
        {!autoValider && <button type="button" onClick={onValider} disabled={!pret} className={`ml-auto min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-bold text-white disabled:opacity-40 sm:px-6 ${focus}`}>Valider<span className="hidden sm:inline"> ↵</span></button>}
        {autoValider && <span className="ml-auto pr-1 text-sm tabular-nums text-neutral-700">{selection.meilleures.length}/2</span>}
      </div>
      {superpose && c.grille.propositions[superpose[0]] && c.grille.propositions[superpose[1]] && (
        <div role="dialog" aria-modal="true" aria-label="Superposer deux propositions" className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-3" onClick={() => setSuperpose(null)}>
          <div className="grid w-full max-w-3xl gap-2 rounded-2xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <strong>Superposer</strong>
              <span className="min-w-0 truncate text-neutral-700">n°&nbsp;{(voirB ? superpose[1] : superpose[0]) + 1} : {c.grille.propositions[voirB ? superpose[1] : superpose[0]].etiquette}</span>
              <button type="button" onClick={() => setVoirB((v) => !v)} className={`ml-auto min-h-11 rounded-xl bg-teal-800 px-4 font-bold text-white ${focus}`}>Basculer</button>
              <button type="button" onClick={() => setSuperpose(null)} className={`min-h-11 rounded-xl border border-neutral-300 px-4 ${focus}`}>Fermer</button>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-neutral-100" onPointerDown={() => setVoirB((v) => !v)} onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); setVoirB((v) => !v); } }} tabIndex={0}>
              {superpose.map((k, j) => (
                <div key={k} className={j === 0 ? '' : 'absolute inset-0'} style={{ visibility: (j === 1) === voirB ? 'visible' : 'hidden' }} aria-hidden="true">
                  <VignetteProposition p={c.grille.propositions[k]} format={c.grille.format} dimension={c.grille.dimension} scenario={scenario} rendu={rendu} hauteur={Math.round((typeof window === 'undefined' ? 800 : window.innerHeight) * 0.6)} grand />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {agrandi !== null && c.grille.propositions[agrandi] && (
        <div role="dialog" aria-modal="true" aria-label={`Proposition ${agrandi + 1} agrandie`} className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-3" onClick={() => onAgrandir(null)}>
          <div className="grid w-full max-w-5xl gap-2 rounded-2xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <strong className="min-w-0 truncate">Proposition {agrandi + 1}{c.grille.propositions[agrandi].etiquette ? ` · ${c.grille.propositions[agrandi].etiquette}` : ''}</strong>
              <button type="button" onClick={() => { onToucher(agrandi); onAgrandir(null); }} className={`ml-auto min-h-11 shrink-0 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white ${focus}`}>Je la choisis</button>
              <button type="button" onClick={() => onAgrandir(null)} className={`min-h-11 shrink-0 rounded-xl border border-neutral-300 px-4 text-sm ${focus}`}>Fermer</button>
            </div>
            <div className={`overflow-hidden rounded-xl bg-neutral-100 ${mobile ? 'mx-auto w-full max-w-[420px]' : ''}`}>
              <VignetteProposition p={c.grille.propositions[agrandi]} format={c.grille.format} dimension={c.grille.dimension} scenario={scenario} rendu={rendu} hauteur={Math.round((typeof window === 'undefined' ? 800 : window.innerHeight) * 0.72)} grand />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CarteDuel({ c, rendu, onChoisir, onPasser }: { c: Extract<Courant, { kind: 'duel' }>; rendu: ContexteRendu; onChoisir: (r: 'a' | 'b') => void; onPasser: () => void }) {
  const scenario = useMemo(() => ({ principaux: c.profil.scenario.principaux, secondaires: c.profil.scenario.secondaires, couleurs: c.profil.scenario.couleurs }), [c.profil]);
  return (
    <section aria-label="Duel de départage" className="grid gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-lg font-bold">Départage : A ou B ?</h2><span className="text-sm text-neutral-700">deux favoris au coude à coude · profil {c.profil.nom}</span></div>
      <div className="grid grid-cols-2 gap-3">
        {c.grille.propositions.map((p, i) => (
          <button key={p.cle} type="button" onClick={() => onChoisir(i === 0 ? 'a' : 'b')} className={`grid gap-1 overflow-hidden rounded-xl bg-white p-1 text-left ring-1 ring-black/10 hover:ring-teal-700 ${focus}`}>
            <span className="px-1 text-sm font-bold">{i === 0 ? '← A' : 'B →'} <span className="font-normal text-neutral-600">{libelleIngredient(p.nouveau)}</span></span>
            <span className="pointer-events-none block" aria-hidden="true"><VignetteProposition p={p} format="compositions" dimension={c.grille.dimension} scenario={scenario} rendu={rendu} hauteur={260} /></span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onPasser} className={`justify-self-start text-sm text-neutral-600 underline ${focus}`}>Passer</button>
    </section>
  );
}

function CarteNote({ c, rendu, rafale, saisie, onSaisie, onNoter, onRafale, onPasser }: { c: Extract<Courant, { kind: 'note' }>; rendu: ContexteRendu; rafale: boolean; saisie: number | null; onSaisie: (n: number | null) => void; onNoter: (n: number) => void; onRafale: (v: boolean) => void; onPasser: () => void }) {
  return (
    <section aria-label="Note rapide" className="grid gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-lg font-bold">Note rapide</h2><span className="text-sm text-neutral-700">{libelleIngredient(c.cle)} · jamais noté</span></div>
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.url ? <img src={c.url} alt="" className="max-h-[60vh] w-full object-contain" /> : <ApercuIngredient cle={c.cle} rendu={rendu} hauteur={360} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Note" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={saisie === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`} onClick={() => (rafale ? onNoter(n) : onSaisie(n))}
              className={`grid size-12 place-items-center rounded-lg text-2xl ${focus} ${saisie !== null && n <= saisie ? 'text-amber-500' : 'text-neutral-300'} hover:bg-amber-50`}>★</button>
          ))}
        </div>
        {!rafale && <button type="button" disabled={!saisie} onClick={() => saisie && onNoter(saisie)} className={`min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-bold text-white disabled:opacity-40 ${focus}`}>Valider ↵</button>}
        <label className="ml-auto flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={rafale} onChange={(e) => onRafale(e.target.checked)} className="size-5" /> Rafale (la note passe aussitôt)</label>
        <button type="button" onClick={onPasser} className={`text-sm text-neutral-600 underline ${focus}`}>Passer</button>
      </div>
    </section>
  );
}

function FinSession({ jouees, duels, profils, avant, apres, nouvelles, niveauAvant, niveau, score, defi, defiAv, onRecommencer, onPalais }: {
  jouees: Jouee[]; duels: Duel[]; profils: Profil[]; avant: Record<string, number>; apres: Record<string, number>; nouvelles: Medaille[];
  niveauAvant: ReturnType<typeof niveauPalais>; niveau: ReturnType<typeof niveauPalais>; score: ScoreBatsClaude; defi: DefiDuJour; defiAv: { fait: number; reussi: boolean }; onRecommencer: () => void; onPalais: () => void;
}) {
  // Les duels portent le sujet n° 1 (pas le profil) : libellé du sujet (« Sport »), jamais un profil pris au hasard
  const nomProfil = (s: string) => SUJETS_VISUELS.find((v) => v.id === s)?.libelle ?? profils.find((p) => p.sujets[0] === s)?.nom ?? s;
  const lecons = apprentissagesSession(duels, { libelle: libelleIngredient, profil: nomProfil });
  const xp = jouees.reduce((s, j) => s + j.xp, 0);
  // Effet concret : les profils joués dont la part prête bouge le plus (4 au plus)
  const touches = profils.filter((p) => jouees.some((j) => j.profil === p.id)).sort((a, b) => ((apres[b.id] ?? 0) - (avant[b.id] ?? 0)) - ((apres[a.id] ?? 0) - (avant[a.id] ?? 0))).slice(0, 4);
  const tranches = jouees.filter((j) => j.tranche).length;
  const acc = jouees.filter((j) => j.accordClaude !== null);
  return (
    <section className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4 sm:p-6" aria-label="Fin de session">
      <h2 className="text-xl font-bold">Session terminée · +{xp} XP</h2>
      {niveau.niveau > niveauAvant.niveau && <p className="rounded-xl bg-amber-50 px-3 py-2 font-semibold ring-1 ring-amber-200">Niveau supérieur : {niveau.nom} !</p>}
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Ce que la session a appris</h3>
        {lecons.length ? <ul className="grid gap-1 text-sm">{lecons.map((l) => <li key={l}>• {l}</li>)}</ul> : <p className="text-sm text-neutral-600">Pas encore de préférence nette : quelques grilles de plus sur la même dimension la feront ressortir.</p>}
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Effet concret</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {touches.map((p) => <li key={p.id}><Jauge nom={`Profil ${p.nom}`} avant={avant[p.id] ?? 0} part={apres[p.id] ?? avant[p.id] ?? 0} /></li>)}
        </ul>
        <p className="text-sm text-neutral-700">{tranches} élément{tranches > 1 ? 's' : ''} tranché{tranches > 1 ? 's' : ''} · {acc.length ? `Claude a vu juste ${acc.filter((j) => j.accordClaude).length}/${acc.length} cette session` : 'Claude n’a pas parié cette session'} · {score.texte}</p>
        <p className="text-xs text-neutral-500">Parts « prêtes » estimées : notes 4-5 ★, et pour les éléments jamais notés, la note estimée par vos choix (moyenne + effet appris).</p>
      </div>
      <p className="text-sm"><strong>Défi du jour :</strong> {defi.texte} — {defiAv.reussi ? 'réussi ✓' : `${defiAv.fait}/${defi.cible}`}</p>
      {nouvelles.length > 0 && (
        <div className="grid gap-2"><h3 className="text-sm font-semibold">Nouvelles médailles</h3>
          <ul className="flex flex-wrap gap-2">{nouvelles.map((m) => <li key={m.id} className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-950 ring-1 ring-amber-300">🏅 {m.nom}</li>)}</ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRecommencer} className={`min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-bold text-white ${focus}`}>Nouvelle session</button>
        <button type="button" onClick={onPalais} className={`min-h-11 rounded-xl border border-teal-800 px-5 text-sm font-semibold text-teal-900 ${focus}`}>Mon palais</button>
      </div>
    </section>
  );
}

function MonPalais({ niveau, serie, score, semaine, defi, defiAv, missions, lienPublier, profils, pret, medailles: gagnees, couvertes, grilles, options, onOptions }: {
  niveau: ReturnType<typeof niveauPalais>; serie: number; score: ScoreBatsClaude; semaine: ScoreBatsClaude; defi: DefiDuJour; defiAv: { fait: number; reussi: boolean };
  missions: ReturnType<typeof missionProfil>[]; lienPublier: string; profils: Profil[]; pret: Record<string, number>; medailles: Medaille[]; couvertes: string[]; grilles: number;
  options: { son: boolean; rafale: boolean; autoValider: boolean }; onOptions: (o: Partial<{ son: boolean; rafale: boolean; autoValider: boolean }>) => void;
}) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 sm:grid-cols-4">
        <Stat titre="Niveau" valeur={niveau.nom} detail={niveau.suivant ? `${niveau.xp} / ${niveau.suivant} XP` : `${niveau.xp} XP`} />
        <Stat titre="Série" valeur={`${serie} jour${serie > 1 ? 's' : ''}`} detail="d’affilée" />
        <Stat titre="Grilles" valeur={String(grilles)} detail={`≈ ${grilles * 9} comparaisons apprises`} />
        <Stat titre="Bats Claude" valeur={score.taux === null ? '—' : `${score.taux} %`} detail={`Toi ${score.paul} – Claude ${score.claude} · semaine ${semaine.taux === null ? '—' : `${semaine.taux} %`}${score.tendance !== null ? ` · ${score.tendance >= 0 ? '+' : ''}${score.tendance} pts` : ''}`} />
      </section>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200"><strong>Défi du jour :</strong> {defi.texte} — {defiAv.reussi ? 'réussi ✓' : `${defiAv.fait}/${defi.cible}`} (+{defi.xp} XP)</p>
      <section className="grid gap-2">
        <h2 className="text-base font-bold">Missions</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {missions.map((m) => (
            <li key={m.profil} className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-black/10">
              <span className="text-sm font-semibold" title={m.texte}>Rendre le profil {m.nom} prêt</span>
              <span className="h-2 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true"><span className="block h-full rounded-full bg-amber-500" style={{ width: largeurCss(m.part) }} /></span>
              <span className="flex flex-wrap gap-2 text-xs text-neutral-700">{m.etapes.map((e) => <span key={e.id}>{e.fait >= e.cible ? '✓' : '○'} {e.fait}/{e.cible} {e.texte.replace(/^\d+ /, '')}</span>)}</span>
              {m.terminee && <a href={`${lienPublier}?profil=${encodeURIComponent(m.profil)}`} className={`justify-self-start rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white ${focus}`}>🏅 Publier la meilleure recette de ce profil pour les praticiens →</a>}
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h2 className="text-base font-bold">Profils prêts</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{profils.map((p) => <li key={p.id}><Jauge nom={`Profil ${p.nom}`} part={pret[p.id] ?? 0} /></li>)}</ul>
      </section>
      <section className="grid gap-2">
        <h2 className="text-base font-bold">Médailles ({gagnees.length})</h2>
        {gagnees.length ? <ul className="flex flex-wrap gap-2">{gagnees.map((m) => <li key={m.id} title={m.detail} className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-950 ring-1 ring-amber-300">🏅 {m.nom}</li>)}</ul> : <p className="text-sm text-neutral-600">Première médaille à la première grille.</p>}
      </section>
      <section className="grid gap-2">
        <h2 className="text-base font-bold">Dimensions couvertes ({couvertes.length})</h2>
        <p className="text-sm text-neutral-700">{couvertes.length ? couvertes.join(' · ') : 'Aucune encore : il faut au moins deux choix 4-5 ★ par dimension.'}</p>
      </section>
      <section className="flex flex-wrap gap-4 text-sm">
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5" checked={options.son} onChange={(e) => onOptions({ son: e.target.checked })} /> Son de validation</label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5" checked={options.rafale} onChange={(e) => onOptions({ rafale: e.target.checked })} /> Notes rapides en rafale</label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5" checked={options.autoValider} onChange={(e) => onOptions({ autoValider: e.target.checked })} /> Valider automatiquement au 2e choix</label>
      </section>
    </div>
  );
}

function Stat({ titre, valeur, detail }: { titre: string; valeur: string; detail: string }) {
  return (
    <div className="grid content-start gap-0.5">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{titre}</span>
      <span className="text-lg font-bold">{valeur}</span>
      <span className="text-xs text-neutral-600">{detail}</span>
    </div>
  );
}
