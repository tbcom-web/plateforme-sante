'use client';

// Studio de recettes (super admin), RÉORGANISÉ le 2026-10-08 (retour de Paul : « le studio devient un peu chaotique… le but
// étant de créer des recettes élégantes et de les enregistrer, pas besoin de mettre autant de notes ; focus sur la sélection des
// zones à améliorer ; laisser la possibilité de bloquer certains éléments »). Un seul geste : composer → affiner → enregistrer.
// - En haut : le client simulé en une ligne (Modifier : tiroir SimulateurClient, mêmes contrôles que /creer).
// - Gauche : « Tout changer » (espace), éléments bloqués (compteur, « Tout débloquer »), harmonie compacte (score, « Corriger »),
//   zones « À améliorer » de la page affichée, puis les dés rangés en six groupes repliables (ParametresGroupes.tsx : une rangée
//   par dimension = valeur · 🎲 · ← · 🔒 ; groupe donné par le registre du core, groupeDeCle) ; « Notes détaillées » repliées.
// - Droite : onglets des pages de ce client, aperçus ordinateur + téléphone côte à côte (ApercusCoteACote), bouton « À améliorer »
//   (z) : tracer des zones, étiquette rapide + précision ; elles restent en surimpression, par page et par appareil.
// - « Enregistrer la recette » : nom proposé, appréciation facultative (Élégante / Correcte / À revoir → note 5 / 3 / 2), zones
//   jointes (composition `ameliorations` + journal recettes_notes par page et appareil). Anciennes notes et étoiles : lues et
//   gardées (« Notes détaillées »).
// - En bas : Mes recettes (vignettes) et Manques signalés, en onglets. Les propositions de Claude se notent dans
//   /admin/retours/recettes ; elles s'ouvrent ici par l'événement `studio:ouvrir-proposition` ou `?proposition=<id>`.
// Tirages déterministes (graine), pondérés par les notes ; garde-fous du core (recettes.ts) toujours avant.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  appliquerRecette, clesStructure, compositionInitiale, controlerComposition, DIMENSIONS_RECETTE, draftVide,
  ETIQUETTES_RECETTE, ETIQUETTES_STUDIO, FAMILLES_COMPOSANTS, gabaritModele, libelleCleRenfort, libellesComposition, LIBELLES_VARIANTES, modeleIntegre,
  nomRecette, NOMS_SECTIONS_VARIABLES, reparerComposition, PAGES_STRUCTURE, sectionsVariables, THEMES, themeParId, tirerDimension, tirerPage, toutChanger,
  universCatalogue, ONGLETS_PAGES, vueDePage, empreinteMobile, choisirStyle, stylesDuStudio, photosDuScenario, photosAImporter, estPhotoHebergee, type AppareilRetour, type Zone,
  type CompositionRecette, type ContexteRecette, type DimensionRecette, type MarqueImportee, type ModeleManifeste, type PageStructure,
  type PhotoBanque, type PoidsAtelier, type Recette, type SiteDraft, type Univers, type Variantes,
  appliquerPriorites, draftPourOnglet, libelleTraitementPhotos, niveauProximite, normaliserScenario, ongletsDuScenario, scenarioDeRecette, soinsDuScenario,
  TRAITEMENTS_PHOTOS, respecterVerrous, suivreScenario, animationsPermises, tirerAnimation, LIBELLES_ANIMATIONS, type ScenarioRecette,
  tirerHabillageRecette, verrouAxe, type AxeHabillage, apprendreHarmonie, libelleScenario, scenarioAuHasard, alea,
  APPRECIATIONS, appreciationDeNote, groupeDeCle, nombreZones, noteAppreciation, type AmeliorationPage, type Appreciation,
  contexteImages,
} from '@plateforme/core';
import SimulateurClient, { type CabinetDemo } from './SimulateurClient';
import ChoixModeTirage, { useModeTirage } from '@/components/ModeTirage';
import RecetteVignette from './RecetteVignette';
import { rangeesHabillage } from './PanneauHabillage';
import ParametresGroupes, { type RangeeStudio } from './ParametresGroupes';
import ApercusCoteACote from './ApercusCoteACote';
import IndicateurHarmonie from './IndicateurHarmonie';
import ZonesAAmeliorer from './ZonesAAmeliorer';
import ApercuTheme from '@/components/ApercuTheme';
import DoubleRendu from '@/components/DoubleRendu';
import RenduMobile from '@/components/RenduMobile';
import type { SoinCatalogue } from '@/lib/sites';
import { EVENEMENT_OUVRIR, type DetailOuvrir } from './PropositionsClaude';
import Link from 'next/link';
import {
  changerStatutRecette, enregistrerRecette, lireAmeliorations, lireAnimationsEnAttente, importerPhotoStudio, lireNotesPages, noterElementStudio, noterPageRecette,
} from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const petitBase = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-2 text-sm disabled:opacity-40 ${focus}`;
const petit = `${petitBase} border-neutral-200 bg-white hover:bg-neutral-50`;
const principal = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`;

type Props = {
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
  poids: PoidsAtelier | null;
  photos: PhotoBanque[];
  recettes: Recette[];
  renforts: string[];
  migrationManquante: boolean;
  /** Proposition de Claude ouverte par l'adresse (?proposition=…) */
  propositionInitiale?: DetailOuvrir | null;
  /** Recette ouverte par l'adresse (?recette=…) */
  recetteInitiale?: string | null;
  /** Manques signalés par le directeur artistique (onglet du bas) */
  manques?: { nombre: number; contenu: ReactNode } | null;
};

// Scénario = client simulé (simulateur.ts : sujets principaux ordonnés, secondaires, couleurs, soins)
type Scenario = ScenarioRecette;
const ACTIFS = THEMES.filter((t) => t.statut === 'actif').map((t) => t.id);
const CABINET_DEMO: CabinetDemo = { nom: 'Cabinet de podologie', ville: 'Lyon' };
/** Zones « À améliorer » d'un onglet (page affichée), par appareil */
type ZonesOnglet = { page: string; ordinateur: Zone[]; mobile: Zone[] };

/** Cabinet fictif de l'aperçu : nom, ville et soins du client simulé ; l'apparence vient de la recette */
function draftDemo(s: Scenario, cabinet: CabinetDemo = CABINET_DEMO, slugs: readonly string[] = []): SiteDraft {
  const d = draftVide();
  const ville = cabinet.ville.trim() || 'Lyon';
  d.cabinet = { ...d.cabinet, nom: cabinet.nom.trim() || 'Cabinet de podologie', ville, quartier: ville === 'Lyon' ? 'Brotteaux' : '', telephone: '04 00 00 00 00' };
  d.lieux[0] = { ...d.lieux[0], adresse: '10 rue de la Démo', codePostal: ville === 'Lyon' ? '69006' : '', ville };
  d.praticiens = [{ ...d.praticiens[0], prenom: 'Camille', nom: 'Rousseau' }, { ...d.praticiens[0], id: 'demo2', prenom: 'Julien', nom: 'Bernard' }];
  d.couleursPreferees = s.couleurs;
  d.soins = soinsDuScenario(s, slugs);
  return appliquerPriorites(d, { principaux: s.principaux, secondaires: s.secondaires });
}

/** Valeur d'une dimension (historique « ← Précédent ») et sa remise */
const lire = (x: CompositionRecette, d: DimensionRecette): Partial<CompositionRecette> => {
  switch (d) {
    case 'couleurs': return { gamme: x.gamme, couleur: x.couleur };
    case 'polices': return { police: x.police };
    case 'visuels': return { visuels: x.visuels };
    case 'photos': return { photos: x.photos };
    case 'structure': return { structure: x.structure, sections: x.sections };
    case 'effets': return { effets: x.effets };
    case 'traitement': return { traitement: x.traitement };
    case 'typo': return { typo: x.typo };
    case 'details': return { details: x.details };
    case 'menu': return { menu: x.menu };
  }
};

/** Zones par onglet → lots enregistrés avec la recette */
const versAmeliorations = (z: Record<string, ZonesOnglet>): AmeliorationPage[] =>
  Object.entries(z).flatMap(([onglet, v]) => (['ordinateur', 'mobile'] as const).filter((a) => v[a].length).map((a) => ({ onglet, page: v.page, appareil: a, zones: v[a] })));
const depuisAmeliorations = (l: readonly AmeliorationPage[]): Record<string, ZonesOnglet> => {
  const r: Record<string, ZonesOnglet> = {};
  for (const a of l) { const v = r[a.onglet] ?? { page: a.page, ordinateur: [], mobile: [] }; v[a.appareil] = a.zones; r[a.onglet] = v; }
  return r;
};

export default function Studio({ proposes, modeles, catalogue, marquesImportees, themesActives, poids, photos, recettes, renforts, migrationManquante, propositionInitiale = null, recetteInitiale = null, manques = null }: Props) {
  const [scenario, setScenario] = useState<Scenario>({ principaux: ['sport'], secondaires: [], couleurs: [], soins: [] });
  const [cabinet, setCabinet] = useState<CabinetDemo>(CABINET_DEMO);
  const modele = useCallback((id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id), [modeles]);
  // Banque de photos (importées + gardées non importées) ; une photo importée depuis le studio y remplace son aperçu
  const [banque, setBanque] = useState<PhotoBanque[]>(photos);
  const [avecNonImportees, setAvecNonImportees] = useState(true);
  // Harmonie (harmonie.ts) : règles actives sauf « Hors règles (explorer) » ; poids souples appris des recettes notées
  const [explorer, setExplorer] = useState(false);
  // « Favoris d'abord · Équilibré · Découverte » (favoris.ts) : persistant par navigateur
  const [modeTirage, setModeTirage] = useModeTirage();
  const poidsHarmonie = useMemo(() => apprendreHarmonie(recettes.filter((r) => r.note !== null && r.statut === 'active').map((r) => ({ note: r.note!, composition: r.composition }))), [recettes]);
  const ctx = useMemo<ContexteRecette>(() => ({ sujets: [...scenario.principaux, ...scenario.secondaires], principaux: scenario.principaux.length, couleursPreferees: scenario.couleurs, poids, photos: banque, nonImportees: avecNonImportees, sujetsSeulement: true, modele, horsRegles: explorer, poidsHarmonie, modeTirage }), [scenario, poids, banque, avecNonImportees, modele, explorer, poidsHarmonie, modeTirage]);
  const [comp, setComp] = useState<CompositionRecette>(() => compositionInitiale({ sujets: ['sport'], principaux: 1, photos, sujetsSeulement: true, modele: modeleIntegre }));
  const [historique, setHistorique] = useState<Record<string, Partial<CompositionRecette>[]>>({});
  const [verrous, setVerrous] = useState<string[]>([]);
  const graine = useRef(Math.floor(Math.random() * 1e6));
  const [ouverte, setOuverte] = useState<{ id: string | null; origine: string | null }>({ id: null, origine: null });
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);

  const suivante = () => { graine.current = (graine.current * 1103515245 + 12345) % 2147483647; return graine.current; };
  const memoriser = (cle: string, d: DimensionRecette) => setHistorique((h) => ({ ...h, [cle]: [...(h[cle] ?? []), lire(comp, d)].slice(-30) }));

  const lancer = useCallback((d: DimensionRecette) => {
    if (verrous.includes(d)) return;
    memoriser(d, d);
    // Verrous respectés : une dimension verrouillée n'est jamais changée par la réparation qui suit un dé (suivi-scenario.ts)
    setComp((x) => respecterVerrous(x, tirerDimension(x, d, ctx, suivante()), verrous, ctx));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verrous, ctx, comp]);
  const lancerSous = (cible: { page: PageStructure } | { composant: keyof Variantes }) => {
    const cle = 'page' in cible ? `page:${cible.page}` : `composant:${cible.composant}`;
    if (verrous.includes(cle) || verrous.includes('structure')) return;
    memoriser(cle, 'structure');
    setComp((x) => tirerPage(x, cible, ctx, suivante()));
  };
  const precedent = (cle: string) => {
    const l = historique[cle] ?? [];
    if (!l.length) return;
    setComp((x) => ({ ...x, ...l[l.length - 1] }));
    setHistorique((h) => ({ ...h, [cle]: l.slice(0, -1) }));
  };
  const tout = useCallback(() => {
    setHistorique((h) => { const n = { ...h }; for (const d of DIMENSIONS_RECETTE) if (!verrous.includes(d.id)) n[d.id] = [...(n[d.id] ?? []), lire(comp, d.id)].slice(-30); return n; });
    // Animation d'accueil verrouillée : gardée si elle reste permise (reparerComposition)
    setComp((x) => { const y = respecterVerrous(x, toutChanger(x, verrous, ctx, suivante()), verrous, ctx); return verrous.includes('animation') ? reparerComposition({ ...y, visuels: { ...y.visuels, animation: x.visuels.animation } }, ctx) : y; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verrous, ctx, comp]);
  const basculerVerrou = (cle: string) => setVerrous((v) => (v.includes(cle) ? v.filter((x) => x !== cle) : [...v, cle]));
  // Habillage (typographie, détails, menu) : dé d'un groupe ou d'un axe, choix direct ; historique par clé (← Précédent)
  const lancerHabillage = (cible: 'polices' | 'typo' | 'details' | 'menu' | AxeHabillage) => {
    if (typeof cible === 'string') { lancer(cible); return; }
    const cle = verrouAxe(cible);
    if (verrous.includes(cle) || (cible.groupe !== 'details' && verrous.includes(cible.groupe))) return;
    memoriser(cle, cible.groupe);
    setComp((x) => tirerHabillageRecette(x, cible, ctx, suivante()));
  };
  const choisirHabillage = (y: Partial<CompositionRecette>, cle: string) => {
    const d = cle.startsWith('hab:') ? (cle.split(':')[1] as DimensionRecette) : (cle as DimensionRecette);
    memoriser(cle, d);
    setComp((x) => reparerComposition({ ...x, ...y }, ctx));
  };

  // ---- Pages (onglets) : pages qu'aurait CE client (simulateur.ts) ----
  const onglets = useMemo(() => ongletsDuScenario(scenario, catalogue, { themesActives }), [scenario, catalogue, themesActives]);
  const [ongletId, setOngletId] = useState('accueil');
  const onglet = onglets.find((o) => o.id === ongletId) ?? onglets[0];
  const page = onglet.page as PageStructure;
  const nomPage = onglet.nom;

  // ---- Zones « À améliorer » : par onglet et par appareil, gardées en changeant de page ----
  const [zones, setZones] = useState<Record<string, ZonesOnglet>>({});
  const [modeZone, setModeZone] = useState(false);
  const zonesIci = zones[onglet.id] ?? { page, ordinateur: [], mobile: [] };
  const majZones = (appareil: 'ordinateur' | 'mobile') => (l: Zone[]) => setZones((z) => ({ ...z, [onglet.id]: { ...(z[onglet.id] ?? { page, ordinateur: [], mobile: [] }), page, [appareil]: l } }));
  const ameliorations = useMemo(() => versAmeliorations(zones), [zones]);
  const totalZones = nombreZones(ameliorations);
  const zonesDe = (id: string) => (zones[id]?.ordinateur.length ?? 0) + (zones[id]?.mobile.length ?? 0);

  // ---- Notes détaillées de la page (facultatives, repliées) ----
  const [appareilVu, setAppareilVu] = useState<AppareilRetour>('les-deux');
  const [notePage, setNotePage] = useState<number | null>(null);
  const [etqPage, setEtqPage] = useState<string[]>([]);
  const [positifPage, setPositifPage] = useState('');
  const [negatifPage, setNegatifPage] = useState('');
  const [notesPages, setNotesPages] = useState<{ page: string; note: number; appareil: string; le: string }[]>([]);
  const changerOnglet = (id: string) => { setOngletId(id); setNotePage(null); setEtqPage([]); setPositifPage(''); setNegatifPage(''); };

  // Changement de scénario : composition remise dans les garde-fous du nouveau scénario (héros, gammes exclues…)
  const changerScenario = (s: Scenario) => {
    setScenario(s);
    const c2 = { ...ctx, sujets: [...s.principaux, ...s.secondaires], principaux: s.principaux.length, couleursPreferees: s.couleurs };
    const g = suivante();
    setComp((x) => suivreScenario(x, ctx, c2, verrous, g));
    if (!ongletsDuScenario(s, catalogue, { themesActives }).some((o) => o.id === ongletId)) changerOnglet('accueil');
  };
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);
  const clientAuHasard = () => changerScenario(scenarioAuHasard(alea(Math.floor(Math.random() * 1e9)), slugs));

  // ---- Dialogues : client simulé (tiroir) et enregistrement ----
  const tiroir = useRef<HTMLDialogElement>(null);
  const dlgEnregistrer = useRef<HTMLDialogElement>(null);

  // Raccourcis clavier (ignorés pendant la saisie et quand un dialogue est ouvert)
  const touches = useRef<(e: KeyboardEvent) => void>(() => {});
  touches.current = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (cible && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName))) return;
    if (e.key === ' ' && cible?.tagName === 'BUTTON') return;
    if (e.key === ' ') { e.preventDefault(); tout(); return; }
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); setModeZone((m) => !m); return; }
    if (e.key === 'Escape' && modeZone) { e.preventDefault(); setModeZone(false); return; }
    const d = DIMENSIONS_RECETTE.find((x) => x.touche === e.key.toLowerCase());
    if (d) { e.preventDefault(); if (d.id === 'polices' || d.id === 'typo' || d.id === 'details' || d.id === 'menu') lancerHabillage(d.id); else lancer(d.id); }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => touches.current(e);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  // Téléphone : l'aperçu s'ouvre en vue téléphone ; grand écran (≥ 1200 px) : paramètres à gauche, aperçus côte à côte
  const [etroit, setEtroit] = useState(false);
  const [large, setLarge] = useState(false);
  useEffect(() => { const mq = window.matchMedia('(min-width: 1200px)'); const f = () => setLarge(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  useEffect(() => { const mq = window.matchMedia('(max-width: 767px)'); const f = () => setEtroit(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);

  // Démonstration des effets : survol simulé en boucle, apparition rejouée (l'aperçu est recréé)
  const [demoSurvol, setDemoSurvol] = useState(false);
  // Animations JOUÉES dans les aperçus (désactivées d'office si le système demande moins de mouvements ; la case force la lecture)
  const [animer, setAnimer] = useState(true);
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAnimer(false); }, []);
  const [animationsEnAttente, setAnimationsEnAttente] = useState<string[]>([]);
  useEffect(() => { void lireAnimationsEnAttente().then(setAnimationsEnAttente).catch(() => undefined); }, []);
  const [survolActif, setSurvolActif] = useState(false);
  const [rejouer, setRejouer] = useState(0);
  useEffect(() => { if (!demoSurvol) { setSurvolActif(false); return; } const t = setInterval(() => setSurvolActif((x) => !x), 1400); return () => clearInterval(t); }, [demoSurvol]);
  const base = useMemo(() => draftDemo(scenario, cabinet, slugs), [scenario, cabinet, slugs]);
  // Aperçu du studio : les photos non importées sont montrées (aperçu de la source) ; jamais sur un site (appliquerRecette par défaut)
  const apercu = useMemo(() => appliquerRecette(base, comp, { proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives, photosNonImportees: true }), [base, comp, proposes, modeles, slugs, themesActives]);
  const defauts = controlerComposition(comp, ctx);
  const gabarit = gabaritModele(modele(universCatalogue(comp.structure)?.preReglage.modele ?? 'tableau'));
  const variables = sectionsVariables(gabarit);
  const libelles = libellesComposition(comp);
  const valeur = (titre: string) => libelles.find((l) => l.dimension === titre)?.valeur ?? '';
  const v = comp.sections.variantes as Record<string, string>;

  // ---- Style des illustrations (sélecteur explicite, pour tout le site) ----
  const styles = stylesDuStudio(ctx, comp.structure);
  const choisir = (id: CompositionRecette['visuels']['style']) => {
    if (id === comp.visuels.style) return;
    memoriser('visuels', 'visuels');
    setComp((x) => choisirStyle(x, id, ctx, suivante()));
  };

  // ---- Photos du scénario (importées, gardées non importées) ----
  const dispo = useMemo(() => photosDuScenario(ctx), [ctx]);
  const pool = avecNonImportees ? [...dispo.importees, ...dispo.nonImportees] : dispo.importees;
  const aImporter = photosAImporter(comp.photos);
  const photoDe = (url: string) => banque.find((p) => p.url === url);
  const basculerPhoto = (url: string) => setComp((x) => ({ ...x, photos: x.photos.includes(url) ? x.photos.filter((u) => u !== url) : [...x.photos, url].slice(0, 8) }));
  const [importEnCours, setImportEnCours] = useState<string | null>(null);
  const importer = async (url: string) => {
    const p = photoDe(url);
    if (!p?.idLibre) { setStatut({ ok: false, message: 'Photo introuvable dans la banque : importez-la depuis /admin/photos.' }); return; }
    setImportEnCours(url);
    const r = await importerPhotoStudio(p.idLibre).catch(() => ({ ok: false, message: 'Connexion perdue : photo non importée.' } as { ok: boolean; message: string; url?: string }));
    setImportEnCours(null);
    setStatut({ ok: r.ok, message: r.message });
    if (r.ok && r.url) {
      const nouvelle = r.url;
      setBanque((l) => l.map((x) => (x.url === url ? { ...x, url: nouvelle, importee: true, cle: null } : x)));
      setComp((x) => ({ ...x, photos: x.photos.map((u) => (u === url ? nouvelle : u)) }));
    }
  };
  const Vignette = ({ url, choisie }: { url: string; choisie?: boolean }) => (
    <span className="relative block shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" loading="lazy" className={`h-12 w-16 rounded-md object-cover ${choisie ? 'ring-2 ring-teal-700 ring-offset-1' : ''}`} />
      {!estPhotoHebergee(url) && <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-amber-100/95 px-1 text-center text-[10px] font-semibold leading-4 text-amber-950">non importée</span>}
    </span>
  );

  // ---- Enregistrement ----
  const [nom, setNom] = useState('');
  const [note, setNote] = useState<number | null>(null);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [positif, setPositif] = useState('');
  const [negatif, setNegatif] = useState('');
  const nomPropose = nomRecette(comp, ctx.sujets);
  const appreciation = appreciationDeNote(note);
  const [enCours, setEnCours] = useState(false);
  const ouvrirEnregistrement = () => { setStatut(null); if (!nom) setNom(nomPropose); dlgEnregistrer.current?.showModal(); };
  const enregistrer = async () => {
    setStatut(null);
    setEnCours(true);
    const r = await enregistrerRecette({
      id: ouverte.id, origine: ouverte.origine, nom: nom || nomPropose, sujets: scenario.principaux, secondaires: scenario.secondaires, couleurs: scenario.couleurs,
      scenario: { ...scenario, soins: soinsDuScenario(scenario, slugs) }, composition: comp, note, etiquettes, positif, negatif, appareil: appareilVu, ameliorations,
    }).catch(() => ({ ok: false, message: 'Connexion perdue : recette non enregistrée.' } as { ok: boolean; message: string; id?: string }));
    setEnCours(false);
    setStatut(r);
    if (r.ok && r.id) setOuverte({ id: r.id, origine: null });
  };
  const nouvelle = () => { setOuverte({ id: null, origine: null }); setNom(''); setNote(null); setEtiquettes([]); setPositif(''); setNegatif(''); setNotesPages([]); setZones({}); };
  const ouvrir = (r: Recette, dupliquer = false) => {
    setScenario(scenarioDeRecette(r));
    setComp(r.composition);
    changerOnglet('accueil');
    setNom(dupliquer ? `${r.nom} (copie)` : r.nom);
    setNote(dupliquer ? null : r.note);
    setEtiquettes(dupliquer ? [] : r.etiquettes);
    setPositif(dupliquer ? '' : r.positif ?? '');
    setNegatif(dupliquer ? '' : r.negatif ?? '');
    setOuverte(dupliquer ? { id: null, origine: r.id } : { id: r.id, origine: null });
    setHistorique({});
    setNotesPages([]);
    setZones({});
    // Zones enregistrées avec la recette : réaffichées (une copie repart sans zones)
    if (!dupliquer) {
      void lireNotesPages(r.id).then(setNotesPages).catch(() => undefined);
      void lireAmeliorations(r.id).then((l) => setZones(depuisAmeliorations(l))).catch(() => undefined);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Proposition de Claude (événement de la tuile de notation, ou ?proposition=) : composition et scénario chargés, verrous à zéro
  const ouvrirProposition = (d: DetailOuvrir) => {
    setScenario(normaliserScenario((d as { scenario?: unknown }).scenario ?? { sujets: d.sujets, couleurs: d.couleurs }));
    setComp(d.composition); setVerrous([]); setHistorique({}); nouvelle(); setNom(d.nom);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const ouvrirPropositionRef = useRef(ouvrirProposition);
  ouvrirPropositionRef.current = ouvrirProposition;
  useEffect(() => {
    const f = (e: Event) => ouvrirPropositionRef.current((e as CustomEvent<DetailOuvrir>).detail);
    window.addEventListener(EVENEMENT_OUVRIR, f);
    return () => window.removeEventListener(EVENEMENT_OUVRIR, f);
  }, []);
  // Ouverture par l'adresse (une seule fois)
  const ouvertAuDepart = useRef(false);
  useEffect(() => {
    if (ouvertAuDepart.current) return;
    ouvertAuDepart.current = true;
    if (propositionInitiale) ouvrirPropositionRef.current(propositionInitiale);
    else if (recetteInitiale) { const r = recettes.find((x) => x.id === recetteInitiale); if (r) ouvrir(r); }
    else {
      // Recette générée par le système (tuile « Recettes complètes », ?generee=<clé>) : composition passée par sessionStorage
      const cle = new URLSearchParams(window.location.search).get('generee');
      try {
        const d = cle ? JSON.parse(sessionStorage.getItem('studio:ouvrir-recette') ?? 'null') : null;
        // Composition sérialisée par la tuile (serialiserComposition) : remise dans les garde-fous du scénario
        const x = d && d.cle === cle && d.composition?.structure ? reparerComposition(d.composition, { sujets: d.sujets ?? [], principaux: d.scenario?.principaux?.length, couleursPreferees: d.couleurs ?? [], modele: modeleIntegre }) : null;
        if (x) ouvrirPropositionRef.current({ ...d, composition: x });
      } catch { /* stockage indisponible ou illisible */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Note détaillée de la page affichée (facultative) ----
  const noterPage = async () => {
    if (!notePage) return;
    const toutes = [...zonesIci.ordinateur, ...zonesIci.mobile];
    const r = await noterPageRecette({
      recette: ouverte.id, page, sujets: [...scenario.principaux, ...scenario.secondaires], couleurs: scenario.couleurs, composition: comp, note: notePage, etiquettes: etqPage,
      positif: positifPage, negatif: negatifPage, appareil: appareilVu,
      zones: toutes.length ? { appareil: appareilVu, empreinte: null, page, largeur: appareilVu === 'mobile' ? 390 : 1280, zones: toutes } : null,
    }).catch(() => ({ ok: false, message: 'Connexion perdue : note de la page non enregistrée.' }));
    setStatut({ ok: r.ok, message: `${ONGLETS_PAGES.find((o) => o.page === page)?.nom} : ${r.message}` });
    if (r.ok) {
      if (ouverte.id) setNotesPages((l) => [{ page, note: notePage, appareil: appareilVu, le: new Date().toISOString() }, ...l]);
      setNotePage(null); setEtqPage([]); setPositifPage(''); setNegatifPage('');
    }
  };

  // ---- Notes d'éléments (facultatives, repliées) ----
  const cles = clesStructure(comp);
  const [notesElements, setNotesElements] = useState<Record<string, number>>({});
  const noterElement = async (cle: string, n: number) => {
    setNotesElements((x) => ({ ...x, [cle]: n }));
    const r = await noterElementStudio(cle, n, []).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    if (!r.ok) setNotesElements((x) => { const y = { ...x }; delete y[cle]; return y; });
    setStatut({ ok: r.ok, message: `${libelleCleRenfort(cle)} : ${r.message}` });
  };

  // ---- Mes recettes ----
  const [filtreSujet, setFiltreSujet] = useState('');
  const [filtreNote, setFiltreNote] = useState(0);
  const [archivees, setArchivees] = useState(false);
  const [filtreScenario, setFiltreScenario] = useState<'tous' | 'identique' | 'proche'>('tous');
  const auNiveau = (r: Recette) => { const n = niveauProximite(scenario, scenarioDeRecette(r)); return filtreScenario === 'tous' || n === 'identique' || (filtreScenario === 'proche' && n === 'proche'); };
  const liste = recettes.filter((r) => (archivees || r.statut === 'active') && (!filtreSujet || r.sujets.includes(filtreSujet)) && (r.note ?? 0) >= filtreNote && auNiveau(r));
  // Aperçu de chaque recette mémorisé (perf, 2026-10-08) : il était recalculé pour TOUTES les recettes à chaque rendu du
  // Studio (chaque « Tout changer », chaque dé). Même calcul, refait seulement si la recette, le cabinet, le catalogue, les
  // univers, les modèles, les thèmes actifs ou le contexte d'images (photos exclues, kits) changent.
  const cacheApercus = useRef<{ cles: readonly unknown[]; parRecette: WeakMap<Recette, ReturnType<typeof appliquerRecette>> } | null>(null);
  const apercuRecette = (r: Recette) => {
    const cles = [cabinet, slugs, proposes, modeles, themesActives, contexteImages()];
    if (!cacheApercus.current || cacheApercus.current.cles.some((k, i) => k !== cles[i])) cacheApercus.current = { cles, parRecette: new WeakMap() };
    const parRecette = cacheApercus.current.parRecette;
    if (!parRecette.has(r)) parRecette.set(r, appliquerRecette(draftDemo(scenarioDeRecette(r), cabinet, slugs), r.composition, { proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives }));
    return parRecette.get(r)!;
  };
  const [bas, setBas] = useState<'recettes' | 'manques'>('recettes');

  // ---- Rangées des dés (rangées dans leurs groupes par le registre du core) ----
  const valeurPage = (p: (typeof PAGES_STRUCTURE)[number]) => [p.ordre ? valeur('Sections').split(' · ')[0] : '', ...p.sections.filter((s) => v[s]).map((s) => LIBELLES_VARIANTES[s]?.[v[s]] ?? v[s])].filter(Boolean).join(' · ');
  const pagesVariables = PAGES_STRUCTURE.filter((p) => p.ordre || p.sections.some((s) => variables.includes(s)));
  const choixRadio = <T extends string>(label: string, options: readonly { id: T; nom: string; detail: string; permis?: boolean; raison?: string | null }[], actuel: T, onChoix: (id: T) => void) => (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={actuel === o.id} disabled={o.permis === false} onClick={() => onChoix(o.id)} title={o.raison ?? o.detail}
          className={`grid min-h-11 content-center rounded-lg border px-2 py-1 text-left text-sm ${focus} disabled:cursor-not-allowed disabled:opacity-50 ${actuel === o.id ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-300 bg-white hover:bg-neutral-50'}`}>
          <span>{o.nom}</span><span className={`text-xs font-normal ${actuel === o.id ? 'text-white/85' : 'text-neutral-500'}`}>{o.detail}</span>
        </button>
      ))}
    </div>
  );
  const choixPhotos = (
    <div className="grid gap-2 text-sm" role="group" aria-label="Photos du scénario">
      <p aria-live="polite"><strong>{dispo.bibliotheque.length}</strong> importée{dispo.bibliotheque.length > 1 ? 's' : ''} pour ces sujets{dispo.nonImportees.length > 0 && <> · <strong>{dispo.nonImportees.length}</strong> gardée{dispo.nonImportees.length > 1 ? 's' : ''} non importée{dispo.nonImportees.length > 1 ? 's' : ''}</>}</p>
      {dispo.bibliotheque.length === 0 && <p className="rounded-lg bg-amber-50 p-2 text-amber-950 ring-1 ring-amber-200">Aucune photo importée pour ces sujets : <Link href="/admin/photos" className="font-semibold underline">/admin/photos</Link>.</p>}
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={avecNonImportees} onChange={(e) => setAvecNonImportees(e.target.checked)} className="size-5" />Inclure les photos gardées non importées (studio seulement)</label>
      {comp.visuels.style === 'photos' && comp.photos.some((u) => !estPhotoHebergee(u)) && (
        <ul className="grid gap-1.5">
          {comp.photos.filter((u) => !estPhotoHebergee(u)).map((u) => (
            <li key={u} className="flex items-center gap-2">
              <Vignette url={u} />
              <button type="button" onClick={() => void importer(u)} disabled={importEnCours !== null} className={`min-h-11 rounded-lg border border-teal-800 px-3 text-sm font-semibold text-teal-900 disabled:opacity-50 ${focus}`}>{importEnCours === u ? 'Import en cours…' : 'Valider et importer'}</button>
            </li>
          ))}
        </ul>
      )}
      {pool.length > 0 && (
        <>
          <p className="text-xs text-neutral-500">{comp.visuels.style === 'photos' ? 'Touchez une photo pour l’ajouter ou la retirer (8 au plus).' : 'Passez au style « Photos » pour les utiliser.'}</p>
          <ul className="grid grid-cols-4 gap-1.5">
            {pool.slice(0, 48).map((p) => (
              <li key={p.url}>
                <button type="button" disabled={comp.visuels.style !== 'photos'} aria-pressed={comp.photos.includes(p.url)} onClick={() => basculerPhoto(p.url)} className={`block rounded-md ${focus} disabled:cursor-default`}
                  aria-label={`${comp.photos.includes(p.url) ? 'Retirer' : 'Ajouter'} la photo ${p.url.split('/').pop()?.split('?')[0]}${p.importee === false ? ' (non importée)' : ''}`}>
                  <Vignette url={p.url} choisie={comp.photos.includes(p.url)} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
  const rangees: RangeeStudio[] = [
    { cle: 'couleurs', titre: 'Couleurs', touche: 'c', valeur: valeur('Couleurs'), onDe: () => lancer('couleurs') },
    ...rangeesHabillage({ comp, gabarit, onDe: lancerHabillage, onChoix: choisirHabillage }),
    {
      cle: 'visuels', titre: 'Style des illustrations', touche: 'v', valeur: valeur('Visuels'), onDe: () => lancer('visuels'),
      choix: <>{choixRadio('Style des illustrations (tout le site)', styles, comp.visuels.style, choisir)}{styles.some((st) => !st.permis) && <ul className="grid gap-0.5 text-xs text-neutral-600">{styles.filter((st) => !st.permis).map((st) => <li key={st.id}><span className="font-semibold">{st.nom} grisé</span> : {st.raison}</li>)}</ul>}</>,
    },
    { cle: 'photos', titre: 'Photos', touche: 'f', valeur: comp.visuels.style === 'photos' ? valeur('Photos') : 'Style « Photos » pour les utiliser', onDe: () => lancer('photos'), choix: choixPhotos },
    {
      cle: 'traitement', titre: 'Traitement des photos', touche: 't', valeur: libelleTraitementPhotos(comp.traitement), onDe: () => lancer('traitement'),
      choix: <>
        {choixRadio('Traitement de toutes les photos du site', TRAITEMENTS_PHOTOS, comp.traitement.id, (id) => { if (comp.traitement.id !== id) { memoriser('traitement', 'traitement'); setComp((x) => ({ ...x, traitement: { ...x.traitement, id } })); } })}
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={comp.traitement.grain} onChange={(e) => { memoriser('traitement', 'traitement'); setComp((x) => ({ ...x, traitement: { ...x.traitement, grain: e.target.checked } })); }} className="size-5" />Grain fin</label>
      </>,
    },
    {
      cle: 'animation', titre: 'Animation d’accueil',
      valeur: comp.visuels.animation ? `${LIBELLES_ANIMATIONS[comp.visuels.animation] ?? comp.visuels.animation}${animationsEnAttente.includes(comp.visuels.animation) ? ' (en attente de validation)' : ''}` : animationsPermises(ctx, comp.structure, comp.visuels.style).length ? 'aucune' : 'Structure Technique + Relevé seulement',
      onDe: () => { if (verrous.includes('animation')) return; memoriser('animation', 'visuels'); setComp((x) => tirerAnimation(x, ctx, suivante())); },
    },
    {
      cle: 'effets', titre: 'Effets', touche: 'e', valeur: valeur('Effets'), onDe: () => lancer('effets'),
      choix: <div className="flex flex-wrap gap-1.5 text-sm">
        <button type="button" aria-pressed={demoSurvol} onClick={() => setDemoSurvol((x) => !x)} className={`min-h-11 rounded-lg border px-3 ${focus} ${demoSurvol ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-300 bg-white'}`}>Survol en boucle</button>
        <button type="button" onClick={() => setRejouer((n) => n + 1)} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>Rejouer l’apparition</button>
      </div>,
    },
    { cle: 'structure', titre: 'Structure (modèle et tout)', touche: 's', valeur: valeur('Structure'), onDe: () => lancer('structure') },
    // Page affichée d'abord ; les autres pages et les éléments de page sous « Réglage fin »
    ...[...pagesVariables.filter((p) => p.id === page), ...pagesVariables.filter((p) => p.id !== page)].map((p): RangeeStudio => ({
      cle: `page:${p.id}`, titre: p.id === page ? `Cette page : ${nomPage}` : `Page ${p.nom}`, verrouParent: 'structure', fin: p.id !== page, valeur: valeurPage(p), onDe: () => lancerSous({ page: p.id }),
    })),
    // Éléments : un dé par famille ; le registre range premier écran, transitions et animations d'en-tête dans leur groupe
    ...FAMILLES_COMPOSANTS.filter((s) => variables.includes(s)).map((s): RangeeStudio => {
      const cle = `composant:${s}`;
      return { cle, titre: NOMS_SECTIONS_VARIABLES[s] ?? s, verrouParent: 'structure', fin: groupeDeCle(cle) === 'structure', valeur: LIBELLES_VARIANTES[s]?.[v[s]] ?? v[s] ?? 'Celui du modèle', onDe: () => lancerSous({ composant: s }) };
    }),
  ];
  const bloques = verrous.length;

  // ---- Morceaux de la page ----
  const resumeClient = (
    <section aria-label="Client simulé" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm">
      <span className="text-neutral-500">Client simulé</span>
      <span className="min-w-0 flex-1 basis-48 truncate font-medium text-teal-950" title={libelleScenario({ ...scenario, soins: soinsDuScenario(scenario, slugs) })}>
        {libelleScenario({ ...scenario, soins: soinsDuScenario(scenario, slugs) })} · {soinsDuScenario(scenario, slugs).length} soins · {cabinet.nom}, {cabinet.ville}
      </span>
      <span className="flex gap-1">
        <button type="button" onClick={() => tiroir.current?.showModal()} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 font-semibold ${focus}`}>Modifier</button>
        <button type="button" onClick={clientAuHasard} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`} title="Client au hasard">🎲 Au hasard</button>
      </span>
    </section>
  );
  const boutonAmeliorer = (
    <button type="button" aria-pressed={modeZone} onClick={() => setModeZone((m) => !m)} title="Touche z ; Échap pour arrêter"
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-4 text-sm font-semibold ${focus} ${modeZone ? 'border-orange-700 bg-orange-700 text-white' : 'border-orange-700 bg-white text-orange-800 hover:bg-orange-50'}`}>
      {modeZone ? 'Tracez une zone… (Échap)' : 'À améliorer'}{totalZones > 0 && !modeZone && <span className="rounded-full bg-orange-100 px-1.5 text-xs text-orange-900">{totalZones}</span>}
      <kbd className={`rounded px-1 text-xs font-normal ${modeZone ? 'bg-white/20' : 'bg-orange-50'}`}>z</kbd>
    </button>
  );
  const boutonEnregistrer = (
    <button type="button" onClick={ouvrirEnregistrement} className={principal}>{ouverte.id ? 'Enregistrer les modifications' : 'Enregistrer la recette'}</button>
  );
  const etatRecette = (
    <p className="text-sm text-neutral-600" aria-live="polite">
      {ouverte.id ? <>Recette « <strong className="text-neutral-900">{nom || nomPropose}</strong> »</> : ouverte.origine ? 'Copie d’une recette' : 'Nouvelle recette'}
      {(ouverte.id || ouverte.origine) && <> · <button type="button" onClick={nouvelle} className={`font-semibold text-teal-900 underline ${focus}`}>Nouvelle</button></>}
    </p>
  );
  const ongletsJsx = (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <div role="tablist" aria-label="Pages de ce client" className="flex min-w-0 gap-1 overflow-x-auto pb-1">
        {onglets.map((o) => {
          const actif = onglet.id === o.id;
          const nz = zonesDe(o.id);
          return (
            <button key={o.id} type="button" role="tab" aria-selected={actif} aria-controls="st-page" id={`st-onglet-${o.id.replace(/[^a-z0-9-]/g, '-')}`} onClick={() => changerOnglet(o.id)}
              title={o.page === 'fiche' ? 'Fiche d’un soin' : o.page === 'theme' ? 'Page sujet' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm ${focus} ${actif ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
              {o.nom}{verrous.includes(`page:${o.page}`) && <span aria-label="bloquée">🔒</span>}
              {nz > 0 && <span className={`rounded-full px-1.5 text-xs ${actif ? 'bg-white/20' : 'bg-orange-100 text-orange-900'}`} aria-label={`${nz} zone${nz > 1 ? 's' : ''} à améliorer`}>{nz}</span>}
            </button>
          );
        })}
      </div>
      {pagesVariables.some((p) => p.id === page) && (
        <button type="button" onClick={() => basculerVerrou(`page:${page}`)} aria-pressed={verrous.includes(`page:${page}`)} className={verrous.includes(`page:${page}`) ? `${petitBase} shrink-0 border-amber-500 bg-amber-100` : `${petit} shrink-0`}
          aria-label={`${verrous.includes(`page:${page}`) ? 'Débloquer' : 'Bloquer'} la structure de la page ${nomPage}`} title="Bloquer la structure de cette page">{verrous.includes(`page:${page}`) ? '🔒' : '🔓'}</button>
      )}
    </div>
  );
  const composition = (
    <section aria-label="Composer" className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3">
      <button type="button" onClick={tout} className={`${principal} min-h-12 w-full text-base`}>🎲 Tout changer <kbd className="rounded bg-white/20 px-1 text-xs font-normal">espace</kbd></button>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm">
        <span className={bloques ? 'font-semibold text-amber-900' : 'text-neutral-500'}>{bloques ? `🔒 ${bloques} élément${bloques > 1 ? 's' : ''} bloqué${bloques > 1 ? 's' : ''}` : 'Rien de bloqué : 🔓 sur une rangée pour garder un élément'}</span>
        {bloques > 0 && <button type="button" onClick={() => setVerrous([])} className={`min-h-9 rounded-lg px-2 font-semibold text-teal-900 underline ${focus}`}>Tout débloquer</button>}
      </div>
      <IndicateurHarmonie compact composition={comp} contexte={ctx} onCorriger={setComp} explorer={explorer} onExplorer={setExplorer} />
      <ChoixModeTirage mode={modeTirage} onChange={setModeTirage} />
      {defauts.length > 0 && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-900">{defauts.join(' ')}</p>}
    </section>
  );
  const zonesJsx = (modeZone || zonesIci.ordinateur.length + zonesIci.mobile.length > 0) && (
    <ZonesAAmeliorer zonesOrdinateur={zonesIci.ordinateur} zonesMobile={zonesIci.mobile} onZonesOrdinateur={majZones('ordinateur')} onZonesMobile={majZones('mobile')}
      mode={modeZone} onMode={setModeZone} page={nomPage} autres={totalZones - zonesIci.ordinateur.length - zonesIci.mobile.length} />
  );
  const parametres = (
    <ParametresGroupes rangees={rangees} verrous={verrous} onVerrou={basculerVerrou} onPrecedent={precedent} peutRevenir={(cle) => (historique[cle] ?? []).length > 0} />
  );
  // Notes détaillées (anciennes notes : étoiles et étiquettes par page, rendu mobile, éléments) : facultatives, repliées
  const notesDetaillees = (() => {
    const cleStructurePage = cles.find((k) => k.startsWith(`structure:${page}:`)) ?? `modele:${comp.structure}`;
    const em = empreinteMobile(cleStructurePage);
    return (
      <details className="rounded-xl border border-black/10 bg-white">
        <summary className={`flex min-h-11 cursor-pointer items-center px-3 text-sm text-neutral-700 ${focus}`}>Notes détaillées (facultatif)</summary>
        <div className="grid gap-3 px-3 pb-3">
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Noter la page « {nomPage} »</p>
            <div role="group" aria-label={`Note de la page ${nomPage}`} className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={notePage === n} onClick={() => setNotePage(notePage === n ? null : n)} className={`min-h-11 rounded-xl border text-sm font-bold ${focus} ${notePage === n ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white'}`}>{n}<span aria-hidden="true" className="text-amber-500">★</span></button>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {ETIQUETTES_STUDIO.map((e) => (
                <button key={e.id} type="button" aria-pressed={etqPage.includes(e.id)} onClick={() => setEtqPage((l) => (l.includes(e.id) ? l.filter((x) => x !== e.id) : [...l, e.id]))}
                  className={`min-h-9 rounded-full border px-2.5 text-xs ${focus} ${etqPage.includes(e.id) ? (e.positive ? 'border-teal-700 bg-teal-700 text-white' : 'border-red-800 bg-red-800 text-white') : 'border-neutral-200 bg-white'}`}>{e.libelle}</button>
              ))}
            </div>
            <label className="grid gap-1 text-sm"><span>Ce qui va bien</span><textarea value={positifPage} onChange={(e) => setPositifPage(e.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" /></label>
            <label className="grid gap-1 text-sm"><span>Ce qui ne va pas</span><textarea value={negatifPage} onChange={(e) => setNegatifPage(e.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" /></label>
            <button type="button" disabled={!notePage} onClick={() => void noterPage()} className={`${petit} justify-self-start px-3 font-semibold`}>Enregistrer la note de la page</button>
            {notesPages.some((x) => x.page === page) && <p className="text-xs text-neutral-600">Déjà notée : {notesPages.filter((x) => x.page === page).slice(0, 5).map((x) => `${x.note}★ (${x.appareil})`).join(', ')}</p>}
          </div>
          <RenduMobile key={`rm-${page}-${cleStructurePage}`} cle={cleStructurePage} empreinte={em} page={page} recette={ouverte.id} libelle={nomPage}
            zones={zonesIci.mobile.length ? { appareil: 'mobile', empreinte: em, page, largeur: 390, zones: zonesIci.mobile } : null} />
          <div className="grid gap-1.5">
            <p className="text-sm font-semibold">Noter les éléments affichés</p>
            <ul className="grid gap-1.5">
              {cles.map((k) => (
                <li key={k} className="grid gap-1">
                  <span className="truncate text-sm" title={k}>{libelleCleRenfort(k)}</span>
                  <span className="flex gap-1" role="group" aria-label={`Noter ${libelleCleRenfort(k)}`}>
                    {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => void noterElement(k, n)} className={notesElements[k] === n ? `${petitBase} border-teal-800 bg-teal-800 text-white` : petit} aria-label={`${n} sur 5`}>{n}★</button>)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    );
  })();

  const rendu = (app: 'bureau' | 'mobile', hauteur?: number) => apercu && <ApercuTheme sansCommandes hauteurCadre={hauteur} animer={animer} animationsEnAttente={animationsEnAttente} vueInitiale={vueDePage(page)} survol={survolActif} appareil={app} draft={draftPourOnglet(apercu.draft, onglet)} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />;
  const optionsApercu = (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm" title="Illustrations animées jouées comme sur le site"><input type="checkbox" checked={animer} onChange={(e) => setAnimer(e.target.checked)} className="size-5 accent-teal-800" />Animer</label>
      <button type="button" onClick={() => setRejouer((n) => n + 1)} className={`min-h-11 rounded-lg px-1 text-left text-sm underline ${focus}`}>Rejouer l’apparition</button>
    </>
  );
  const cleApercu = `${onglet.id}|${scenario.principaux.join()}|${comp.structure}|${rejouer}`;

  // ---- Enregistrer (dialogue) ----
  const dialogueEnregistrer = (
    <dialog ref={dlgEnregistrer} aria-labelledby="st-enr" className="m-auto w-[min(520px,94vw)] max-w-none rounded-2xl p-0 backdrop:bg-black/40">
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); void enregistrer(); }} className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 id="st-enr" className="text-lg font-semibold">{ouverte.id ? 'Enregistrer les modifications' : 'Enregistrer la recette'}</h2>
          <button type="button" onClick={() => dlgEnregistrer.current?.close()} className={`${petit} shrink-0`} aria-label="Fermer">✕</button>
        </div>
        <label className="grid gap-1 text-sm"><span className="font-medium">Nom</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={nomPropose} maxLength={120} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base md:text-sm" />
        </label>
        <fieldset className="grid gap-1.5">
          <legend className="text-sm font-medium">Votre avis <span className="font-normal text-neutral-500">(facultatif)</span></legend>
          <div role="radiogroup" aria-label="Appréciation" className="grid grid-cols-3 gap-1.5">
            {APPRECIATIONS.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={appreciation === a.id} onClick={() => setNote(appreciation === a.id ? null : noteAppreciation(a.id as Appreciation))}
                className={`min-h-12 rounded-xl border text-sm font-semibold ${focus} ${appreciation === a.id ? (a.id === 'a-revoir' ? 'border-red-800 bg-red-800 text-white' : 'border-teal-800 bg-teal-800 text-white') : 'border-neutral-300 bg-white hover:bg-neutral-50'}`}>{a.libelle}</button>
            ))}
          </div>
          {note !== null && !appreciation && <p className="text-xs text-neutral-600">Note détaillée actuelle : {note}★ (gardée).</p>}
        </fieldset>
        <p className="text-sm text-neutral-700">
          {totalZones ? <><strong>{totalZones}</strong> zone{totalZones > 1 ? 's' : ''} à améliorer jointe{totalZones > 1 ? 's' : ''} ({new Set(ameliorations.map((a) => a.onglet)).size} page{new Set(ameliorations.map((a) => a.onglet)).size > 1 ? 's' : ''}).</> : 'Aucune zone à améliorer.'}
          {' '}Client simulé gardé avec la recette.
        </p>
        <details className="rounded-lg border border-neutral-200">
          <summary className={`flex min-h-11 cursor-pointer items-center px-3 text-sm text-neutral-700 ${focus}`}>Notes détaillées</summary>
          <div className="grid gap-2 px-3 pb-3">
            <div role="group" aria-label="Note détaillée" className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={note === n} onClick={() => setNote(note === n ? null : n)} className={`min-h-11 rounded-xl border text-sm font-bold ${focus} ${note === n ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white'}`}>{n}<span aria-hidden="true" className="text-amber-500">★</span></button>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {ETIQUETTES_RECETTE.map((e) => <button key={e} type="button" aria-pressed={etiquettes.includes(e)} onClick={() => setEtiquettes((l) => (l.includes(e) ? l.filter((x) => x !== e) : [...l, e]))} className={`min-h-9 rounded-full border px-2.5 text-xs ${focus} ${etiquettes.includes(e) ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-200 bg-white'}`}>{e.replace(/-/g, ' ')}</button>)}
            </div>
            <label className="grid gap-1 text-sm"><span>Ce qui va</span><textarea value={positif} onChange={(e) => setPositif(e.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" /></label>
            <label className="grid gap-1 text-sm"><span>Ce qui ne va pas</span><textarea value={negatif} onChange={(e) => setNegatif(e.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" /></label>
          </div>
        </details>
        {aImporter.length > 0 && <p role="alert" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-950 ring-1 ring-amber-200">⚠ {aImporter.length} photo{aImporter.length > 1 ? 's' : ''} non importée{aImporter.length > 1 ? 's' : ''} : import requis avant tout usage sur un site (Visuels & photos → Photos).</p>}
        {defauts.length > 0 && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-900">{defauts.join(' ')}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={defauts.length > 0 || enCours} className={principal}>{enCours ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button type="button" onClick={() => dlgEnregistrer.current?.close()} className={`${petit} px-3`}>Fermer</button>
        </div>
        <p role="status" className={`min-h-5 text-sm ${statut && !statut.ok ? 'text-red-800' : 'text-teal-900'}`}>{statut?.message ?? (migrationManquante ? 'Migration 0032 à exécuter pour enregistrer.' : '')}</p>
      </form>
    </dialog>
  );
  const tiroirClient = (
    <dialog ref={tiroir} aria-label="Client simulé" className="ml-auto mr-0 mt-0 h-dvh max-h-dvh w-[min(560px,100vw)] max-w-none overflow-y-auto rounded-none p-0 backdrop:bg-black/40">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-black/10 bg-white px-4 py-2">
        <h2 className="text-base font-semibold">Client simulé</h2>
        <button type="button" onClick={() => tiroir.current?.close()} className={`${principal}`}>Fermer</button>
      </div>
      <SimulateurClient compact scenario={scenario} onChange={changerScenario} cabinet={cabinet} onCabinet={setCabinet} catalogue={catalogue} themesActives={themesActives} />
    </dialog>
  );

  // ---- Bas de page : Mes recettes et Manques signalés, en onglets ----
  const basJsx = (
    <section aria-label="Bibliothèque" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-black/10 bg-white p-4">
      <div role="tablist" aria-label="Bibliothèque" className="flex flex-wrap gap-1 border-b border-black/10 pb-2">
        <button type="button" role="tab" aria-selected={bas === 'recettes'} onClick={() => setBas('recettes')} className={`min-h-11 rounded-lg px-3 text-sm ${focus} ${bas === 'recettes' ? 'bg-teal-800 font-semibold text-white' : 'hover:bg-neutral-100'}`}>Mes recettes ({liste.length})</button>
        {manques && <button type="button" role="tab" aria-selected={bas === 'manques'} onClick={() => setBas('manques')} className={`min-h-11 rounded-lg px-3 text-sm ${focus} ${bas === 'manques' ? 'bg-teal-800 font-semibold text-white' : 'hover:bg-neutral-100'}`}>Manques signalés ({manques.nombre})</button>}
      </div>
      <div hidden={bas !== 'recettes'} className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">Client <select value={filtreScenario} onChange={(e) => setFiltreScenario(e.target.value as typeof filtreScenario)} className="min-h-11 rounded-lg border border-neutral-300 px-2"><option value="tous">Tous</option><option value="identique">Ce client</option><option value="proche">Ce client et proches</option></select></label>
          <label className="flex items-center gap-1">Sujet <select value={filtreSujet} onChange={(e) => setFiltreSujet(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 px-2"><option value="">Tous</option>{ACTIFS.map((id) => <option key={id} value={id}>{themeParId(id)?.court}</option>)}</select></label>
          <label className="flex items-center gap-1">Avis <select value={filtreNote} onChange={(e) => setFiltreNote(Number(e.target.value))} className="min-h-11 rounded-lg border border-neutral-300 px-2"><option value={0}>Tous</option><option value={3}>Correctes et mieux</option><option value={4}>4★ et plus</option><option value={5}>Élégantes</option></select></label>
          <label className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={archivees} onChange={(e) => setArchivees(e.target.checked)} className="size-5" />Archivées</label>
        </div>
        {renforts.length > 0 && (
          <details className="rounded-xl bg-teal-50 p-3 text-sm text-teal-950">
            <summary className={`cursor-pointer font-semibold ${focus}`}>Ce que vos recettes ont changé</summary>
            <ul className="mt-1 grid gap-0.5">{renforts.map((x) => <li key={x}>{x}</li>)}</ul>
          </details>
        )}
        {!liste.length ? <p className="text-sm text-neutral-500">Aucune recette{filtreSujet || filtreNote ? ' pour ce filtre' : ' enregistrée pour l’instant'}.</p> : (
          <ul className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {liste.map((r) => (
              <RecetteVignette key={r.id} recette={r} apercu={apercuRecette(r)} catalogue={catalogue} marquesImportees={marquesImportees} themesActives={themesActives} onOuvrir={() => ouvrir(r)}>
                {filtreScenario !== 'tous' && <p className="text-xs font-semibold text-teal-900">{niveauProximite(scenario, scenarioDeRecette(r)) === 'identique' ? 'Même client' : 'Client proche'}</p>}
                {photosAImporter(r.composition.photos).length > 0 && <p className="text-xs font-semibold text-amber-900">⚠ {photosAImporter(r.composition.photos).length} photo(s) non importée(s) : import requis avant tout usage sur un site.</p>}
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => ouvrir(r)} className={`min-h-11 rounded-lg border border-teal-800 px-3 text-sm font-semibold text-teal-900 ${focus}`}>Ouvrir</button>
                  <button type="button" onClick={() => ouvrir(r, true)} className={`min-h-11 rounded-lg border border-neutral-300 px-3 text-sm ${focus}`}>Dupliquer</button>
                  <button type="button" onClick={async () => setStatut(await changerStatutRecette(r.id, r.statut === 'active' ? 'archivee' : 'active'))} className={`min-h-11 rounded-lg border border-neutral-300 px-3 text-sm ${focus}`}>{r.statut === 'active' ? 'Archiver' : 'Réactiver'}</button>
                </div>
              </RecetteVignette>
            ))}
          </ul>
        )}
      </div>
      {manques && <div hidden={bas !== 'manques'}>{manques.contenu}</div>}
    </section>
  );

  if (large) return (
    <div className="grid gap-5">
      <div className="grid gap-2" style={{ marginInline: 'calc(50% - 50vw + 24px)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">{resumeClient}</div>
          {etatRecette}
          {boutonAmeliorer}
          {boutonEnregistrer}
        </div>
        <div className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-4">
          {/* ---- Composer (colonne gauche, défilement interne) ---- */}
          <aside aria-label="Paramètres du studio" className="sticky top-[4.5rem] grid max-h-[calc(100dvh-5rem)] min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2 overflow-y-auto overflow-x-hidden overscroll-contain pb-4 pr-1">
            {composition}
            {zonesJsx}
            {parametres}
            {notesDetaillees}
          </aside>
          {/* ---- Aperçus ordinateur et téléphone côte à côte ---- */}
          <div role="tabpanel" id="st-page" aria-labelledby={`st-onglet-${onglet.id.replace(/[^a-z0-9-]/g, '-')}`} className="sticky top-[4.5rem] min-w-0">
            {apercu && (
              <ApercusCoteACote key={cleApercu} libelle={onglet.nom} onAppareil={setAppareilVu} mode={modeZone} onMode={setModeZone} options={optionsApercu}
                zonesOrdinateur={zonesIci.ordinateur} zonesMobile={zonesIci.mobile} onZonesOrdinateur={majZones('ordinateur')} onZonesMobile={majZones('mobile')} rendu={rendu}
                entete={ongletsJsx} />
            )}
          </div>
        </div>
      </div>
      {basJsx}
      {dialogueEnregistrer}
      {tiroirClient}
    </div>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {resumeClient}
      <div className="flex flex-wrap items-center gap-2">
        {etatRecette}
        <span className="ml-auto flex flex-wrap gap-2">{boutonAmeliorer}{boutonEnregistrer}</span>
      </div>
      <section aria-label="Recette en cours" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
        <div className="grid min-w-0 gap-2">
          {ongletsJsx}
          <div role="tabpanel" id="st-page" aria-labelledby={`st-onglet-${onglet.id.replace(/[^a-z0-9-]/g, '-')}`} className="grid min-w-0 gap-3">
            {apercu && (
              <DoubleRendu key={`${cleApercu}|${etroit}`} libelle={onglet.nom} onAppareil={setAppareilVu} mobileDabord={etroit} mode={modeZone} onMode={setModeZone} outilsZones={false}
                zonesOrdinateur={zonesIci.ordinateur} zonesMobile={zonesIci.mobile} onZonesOrdinateur={majZones('ordinateur')} onZonesMobile={majZones('mobile')}
                rendu={rendu} />
            )}
            {zonesJsx}
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {composition}
          {parametres}
          {notesDetaillees}
        </div>
      </section>
      {basJsx}
      {dialogueEnregistrer}
      {tiroirClient}
    </div>
  );
}
