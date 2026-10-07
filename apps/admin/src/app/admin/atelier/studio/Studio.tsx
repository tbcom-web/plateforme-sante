'use client';

// Studio de recettes (super admin) : un scénario (sujets, couleurs préférées), un aperçu vivant grand format (ordinateur /
// téléphone, celui du parcours : ApercuTheme), et une barre de « dés » par dimension — 🎲 Changer, ← Précédent, 🔒 Verrouiller —
// pour les couleurs, polices, visuels, photos, structure (modèle, puis un dé par type de page et par élément) et effets.
// « Tout changer » (espace) lance les dés non verrouillés. Les tirages sont déterministes (graine affichée) et pondérés par
// les notes ; les garde-fous du core (recettes.ts) passent toujours avant. « Enregistrer cette recette » : nom proposé,
// note, étiquettes, ce qui va / ne va pas ; « Mes recettes » : ouvrir, dupliquer, archiver.
// PAR PAGE (demande de Paul du 2026-10-07) : onglets Accueil, Page sujet, Fiche soin, Article de blog, Actualités, Cabinet,
// Contact et accès, Questions, Soins ; pour chacun, l'aperçu de CETTE page (contenu de démonstration : sujet n° 1, article de
// démonstration), son dé de structure et son verrou 🔒 (verrouiller Contact sans verrouiller l'Accueil), sa note (étoiles,
// étiquettes, va bien / ne va pas) en plus de celle de la recette, ses zones (z) et son bloc « Rendu mobile ». Rendus ordinateur
// ET mobile côte à côte (bascule sur téléphone).
// SIMULATEUR DE RENDU (demande de Paul du 2026-10-07) : « Simuler un client » (SimulateurClient.tsx, mêmes contrôles que /creer) ;
// le rendu reste dans ce scénario (visuels des seuls sujets choisis, onglets = pages que ce client aurait : simulateur.ts) ; une
// recette garde son scénario complet ; « Mes recettes » se filtre par scénario, en vignettes (RecetteVignette.tsx). Dé « t » :
// traitement uniforme des photos (traitements-photos.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  appliquerRecette, clesStructure, compositionInitiale, controlerComposition, DIMENSIONS_RECETTE, draftVide,
  ETIQUETTES_RECETTE, ETIQUETTES_STUDIO, FAMILLES_COMPOSANTS, gabaritModele, libelleCleRenfort, libellesComposition, LIBELLES_VARIANTES, modeleIntegre,
  nomRecette, NOMS_SECTIONS_VARIABLES, reparerComposition, PAGES_STRUCTURE, PAIRES_POLICES, sectionsVariables, THEMES, themeParId, tirerDimension, tirerPage, toutChanger,
  universCatalogue, ONGLETS_PAGES, vueDePage, empreinteMobile, choisirStyle, stylesDuStudio, photosDuScenario, photosAImporter, estPhotoHebergee, type AppareilRetour, type Zone,
  type CompositionRecette, type ContexteRecette, type DimensionRecette, type MarqueImportee, type ModeleManifeste, type PageStructure,
  type PhotoBanque, type PoidsAtelier, type Recette, type SiteDraft, type Univers, type Variantes,
  appliquerPriorites, draftPourOnglet, libelleTraitementPhotos, niveauProximite, normaliserScenario, ongletsDuScenario, scenarioDeRecette, soinsDuScenario,
  TRAITEMENTS_PHOTOS, photosCompatibles, tirerPhotos, alea, respecterVerrous, suivreScenario, animationsPermises, tirerAnimation, LIBELLES_ANIMATIONS, type ScenarioRecette,
} from '@plateforme/core';
import SimulateurClient, { type CabinetDemo } from './SimulateurClient';
import RecetteVignette from './RecetteVignette';
import ApercusCoteACote from './ApercusCoteACote';
import ApercuTheme from '@/components/ApercuTheme';
import DoubleRendu from '@/components/DoubleRendu';
import RenduMobile from '@/components/RenduMobile';
import type { SoinCatalogue } from '@/lib/sites';
import { EVENEMENT_OUVRIR, type DetailOuvrir } from './PropositionsClaude';
import Link from 'next/link';
import { changerStatutRecette, enregistrerRecette, lireAnimationsEnAttente, importerPhotoStudio, lireNotesPages, noterElementStudio, noterPageRecette } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const petitBase = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-2 text-sm disabled:opacity-40 ${focus}`;
const petit = `${petitBase} border-neutral-200 bg-white hover:bg-neutral-50`;

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
};

// Scénario = client simulé (simulateur.ts : sujets principaux ordonnés, secondaires, couleurs, soins)
type Scenario = ScenarioRecette;
const ACTIFS = THEMES.filter((t) => t.statut === 'actif').map((t) => t.id);
const CABINET_DEMO: CabinetDemo = { nom: 'Cabinet de podologie', ville: 'Lyon' };

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
  }
};

export default function Studio({ proposes, modeles, catalogue, marquesImportees, themesActives, poids, photos, recettes, renforts, migrationManquante }: Props) {
  const [scenario, setScenario] = useState<Scenario>({ principaux: ['sport'], secondaires: [], couleurs: [], soins: [] });
  const [cabinet, setCabinet] = useState<CabinetDemo>(CABINET_DEMO);
  const modele = useCallback((id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id), [modeles]);
  // Banque de photos (importées + gardées non importées) ; une photo importée depuis le studio y remplace son aperçu
  const [banque, setBanque] = useState<PhotoBanque[]>(photos);
  const [avecNonImportees, setAvecNonImportees] = useState(true);
  // Simulateur : visuels (héros, photos) tirés SEULEMENT des sujets du client simulé (sujetsSeulement)
  const ctx = useMemo<ContexteRecette>(() => ({ sujets: [...scenario.principaux, ...scenario.secondaires], principaux: scenario.principaux.length, couleursPreferees: scenario.couleurs, poids, photos: banque, nonImportees: avecNonImportees, sujetsSeulement: true, modele }), [scenario, poids, banque, avecNonImportees, modele]);
  const [comp, setComp] = useState<CompositionRecette>(() => compositionInitiale({ sujets: ['sport'], principaux: 1, photos, sujetsSeulement: true, modele: modeleIntegre }));
  const [historique, setHistorique] = useState<Record<string, Partial<CompositionRecette>[]>>({});
  const [verrous, setVerrous] = useState<string[]>([]);
  const graine = useRef(Math.floor(Math.random() * 1e6));
  const [derniereGraine, setDerniereGraine] = useState<number | null>(null);
  const [ouverte, setOuverte] = useState<{ id: string | null; origine: string | null }>({ id: null, origine: null });
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);

  const suivante = () => { graine.current = (graine.current * 1103515245 + 12345) % 2147483647; setDerniereGraine(graine.current); return graine.current; };
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

  // Changement de scénario : composition remise dans les garde-fous du nouveau scénario (héros, gammes exclues…)
  const changerScenario = (s: Scenario) => {
    setScenario(s);
    const c2 = { ...ctx, sujets: [...s.principaux, ...s.secondaires], principaux: s.principaux.length, couleursPreferees: s.couleurs };
    // La composition SUIT le scénario (suivi-scenario.ts) : couleurs choisies → gamme, sujets → photos et héros ; verrous respectés
    const g = suivante();
    setComp((x) => suivreScenario(x, ctx, c2, verrous, g));
    // Onglet d'une page que ce client n'a plus : retour à l'accueil
    if (!ongletsDuScenario(s, catalogue, { themesActives }).some((o) => o.id === ongletId)) changerOnglet('accueil');
  };

  // Raccourcis clavier (ignorés pendant la saisie)
  const touches = useRef<(e: KeyboardEvent) => void>(() => {});
  touches.current = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || (cible && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(cible.tagName) && e.key === ' '))) return;
    if (cible && ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); tout(); return; }
    const d = DIMENSIONS_RECETTE.find((x) => x.touche === e.key.toLowerCase());
    if (d) { e.preventDefault(); lancer(d.id); }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => touches.current(e);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  // Téléphone : l'aperçu s'ouvre en vue téléphone
  const [etroit, setEtroit] = useState(false);
  // Grand écran (≥ 1200 px) : paramètres à gauche, aperçus ordinateur et téléphone côte à côte (ApercusCoteACote)
  const [large, setLarge] = useState(false);
  useEffect(() => { const mq = window.matchMedia('(min-width: 1200px)'); const f = () => setLarge(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  useEffect(() => { const mq = window.matchMedia('(max-width: 767px)'); const f = () => setEtroit(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  // ---- Pages (onglets) : aperçu, dé, verrou, note, zones et rendu mobile de chaque page ----
  // Onglets = pages qu'aurait CE client (simulateur.ts) : accueil, une page par sujet principal, ses fiches de soins…
  const onglets = useMemo(() => ongletsDuScenario(scenario, catalogue, { themesActives }), [scenario, catalogue, themesActives]);
  const [ongletId, setOngletId] = useState('accueil');
  const onglet = onglets.find((o) => o.id === ongletId) ?? onglets[0];
  const page = onglet.page as PageStructure;
  const [zonesOrdi, setZonesOrdi] = useState<Zone[]>([]);
  const [zonesMobile, setZonesMobile] = useState<Zone[]>([]);
  const [appareilVu, setAppareilVu] = useState<AppareilRetour>('les-deux');
  const [notePage, setNotePage] = useState<number | null>(null);
  const [etqPage, setEtqPage] = useState<string[]>([]);
  const [positifPage, setPositifPage] = useState('');
  const [negatifPage, setNegatifPage] = useState('');
  const [notesPages, setNotesPages] = useState<{ page: string; note: number; appareil: string; le: string }[]>([]);
  const changerOnglet = (id: string) => { setOngletId(id); setZonesOrdi([]); setZonesMobile([]); setNotePage(null); setEtqPage([]); setPositifPage(''); setNegatifPage(''); };
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
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);
  const base = useMemo(() => draftDemo(scenario, cabinet, slugs), [scenario, cabinet, slugs]);
  // Aperçu du studio : les photos non importées sont montrées (aperçu de la source) ; jamais sur un site (appliquerRecette par défaut)
  const apercu = useMemo(() => appliquerRecette(base, comp, { proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives, photosNonImportees: true }), [base, comp, proposes, modeles, slugs, themesActives]);
  const defauts = controlerComposition(comp, ctx);
  const gabarit = gabaritModele(modele(universCatalogue(comp.structure)?.preReglage.modele ?? 'tableau'));
  const variables = sectionsVariables(gabarit);
  const libelles = libellesComposition(comp);

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
  const Vignette = ({ url, choisie }: { url: string; choisie?: boolean }) => {
    const nonImportee = !estPhotoHebergee(url);
    return (
      <span className="relative block shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" loading="lazy" className={`h-14 w-20 rounded-md object-cover ${choisie ? 'ring-2 ring-teal-700 ring-offset-1' : ''}`} />
        {nonImportee && <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-amber-100/95 px-1 text-center text-[10px] font-semibold leading-4 text-amber-950">non importée</span>}
      </span>
    );
  };

  // ---- Enregistrement ----
  const [nom, setNom] = useState('');
  const [note, setNote] = useState<number | null>(null);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [positif, setPositif] = useState('');
  const [negatif, setNegatif] = useState('');
  const nomPropose = nomRecette(comp, ctx.sujets);
  const enregistrer = async () => {
    setStatut(null);
    const r = await enregistrerRecette({ id: ouverte.id, origine: ouverte.origine, nom: nom || nomPropose, sujets: scenario.principaux, secondaires: scenario.secondaires, couleurs: scenario.couleurs, scenario: { ...scenario, soins: soinsDuScenario(scenario, slugs) }, composition: comp, note, etiquettes, positif, negatif, appareil: appareilVu })
      .catch(() => ({ ok: false, message: 'Connexion perdue : recette non enregistrée.' } as { ok: boolean; message: string; id?: string }));
    setStatut(r);
    if (r.ok && r.id) setOuverte({ id: r.id, origine: null });
  };
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
    if (!dupliquer) void lireNotesPages(r.id).then(setNotesPages).catch(() => undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const nouvelle = () => { setOuverte({ id: null, origine: null }); setNom(''); setNote(null); setEtiquettes([]); setPositif(''); setNegatif(''); setNotesPages([]); };
  // « Propositions de Claude » (PropositionsClaude.tsx) : composition chargée avec son scénario, nouvelle recette, verrous à zéro
  useEffect(() => {
    const f = (e: Event) => {
      const d = (e as CustomEvent<DetailOuvrir>).detail;
      // Même format de scénario que les recettes (simulateur.ts) : { principaux, secondaires, couleurs, soins } ou ancien { sujets, couleurs }
      setScenario(normaliserScenario((d as { scenario?: unknown }).scenario ?? { sujets: d.sujets, couleurs: d.couleurs }));
      setComp(d.composition); setVerrous([]); setHistorique({}); nouvelle(); setNom(d.nom);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener(EVENEMENT_OUVRIR, f);
    return () => window.removeEventListener(EVENEMENT_OUVRIR, f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Note de la page affichée ----
  const noterPage = async () => {
    if (!notePage) return;
    const toutes = [...zonesOrdi, ...zonesMobile];
    const r = await noterPageRecette({
      recette: ouverte.id, page, sujets: [...scenario.principaux, ...scenario.secondaires], couleurs: scenario.couleurs, composition: comp, note: notePage, etiquettes: etqPage,
      positif: positifPage, negatif: negatifPage, appareil: appareilVu,
      zones: toutes.length ? { appareil: appareilVu, empreinte: null, page, largeur: appareilVu === 'mobile' ? 390 : 1280, zones: toutes } : null,
    }).catch(() => ({ ok: false, message: 'Connexion perdue : note de la page non enregistrée.' }));
    setStatut({ ok: r.ok, message: `${ONGLETS_PAGES.find((o) => o.page === page)?.nom} : ${r.message}` });
    if (r.ok) {
      if (ouverte.id) setNotesPages((l) => [{ page, note: notePage, appareil: appareilVu, le: new Date().toISOString() }, ...l]);
      setZonesOrdi([]); setZonesMobile([]); setNotePage(null); setEtqPage([]); setPositifPage(''); setNegatifPage('');
    }
  };

  // ---- Notes d'éléments (structures de pages, éléments, effets) ----
  const cles = clesStructure(comp);
  const [notesElements, setNotesElements] = useState<Record<string, number>>({});
  const [etqElement, setEtqElement] = useState<string[]>([]);
  const noterElement = async (cle: string, n: number) => {
    setNotesElements((x) => ({ ...x, [cle]: n }));
    const r = await noterElementStudio(cle, n, etqElement).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    if (!r.ok) setNotesElements((x) => { const y = { ...x }; delete y[cle]; return y; });
    setStatut({ ok: r.ok, message: `${libelleCleRenfort(cle)} : ${r.message}` });
  };

  // ---- Mes recettes ----
  const [filtreSujet, setFiltreSujet] = useState('');
  const [filtreNote, setFiltreNote] = useState(0);
  const [archivees, setArchivees] = useState(false);
  // Filtre par scénario (simulateur.ts) : recettes de ce client simulé, ou aussi des clients proches
  const [filtreScenario, setFiltreScenario] = useState<'tous' | 'identique' | 'proche'>('tous');
  const auNiveau = (r: Recette) => { const n = niveauProximite(scenario, scenarioDeRecette(r)); return filtreScenario === 'tous' || n === 'identique' || (filtreScenario === 'proche' && n === 'proche'); };
  const liste = recettes.filter((r) => (archivees || r.statut === 'active') && (!filtreSujet || r.sujets.includes(filtreSujet)) && (r.note ?? 0) >= filtreNote && auNiveau(r));
  // Vignettes : chaque recette rendue avec SON scénario (cabinet de démonstration courant)
  const apercuRecette = (r: Recette) => appliquerRecette(draftDemo(scenarioDeRecette(r), cabinet, slugs), r.composition, { proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives });

  const Ligne = ({ cle, titre, valeur, onDe, dim }: { cle: string; titre: string; valeur: string; onDe: () => void; dim?: DimensionRecette }) => {
    const verrou = verrous.includes(cle);
    const touche = dim ? DIMENSIONS_RECETTE.find((x) => x.id === dim)?.touche : undefined;
    return (
      <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2 py-1.5 ${verrou ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}>
        <span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">{titre}{touche && <kbd className="ml-1 rounded bg-neutral-100 px-1 font-normal normal-case">{touche}</kbd>}</span><span className="block truncate text-sm" title={valeur}>{valeur}</span></span>
        <span className="flex gap-1">
          <button type="button" className={petit} onClick={onDe} disabled={verrou} aria-label={`Changer : ${titre}`} title="Changer">🎲</button>
          <button type="button" className={petit} onClick={() => precedent(cle)} disabled={!(historique[cle] ?? []).length} aria-label={`Précédent : ${titre}`} title="Précédent">←</button>
          <button type="button" className={verrou ? `${petitBase} border-amber-400 bg-amber-100` : petit} onClick={() => basculerVerrou(cle)} aria-pressed={verrou} aria-label={`${verrou ? 'Déverrouiller' : 'Verrouiller'} : ${titre}`} title="Verrouiller">{verrou ? '🔒' : '🔓'}</button>
        </span>
      </li>
    );
  };
  const valeur = (titre: string) => libelles.find((l) => l.dimension === titre)?.valeur ?? '';
  const v = comp.sections.variantes as Record<string, string>;

  // ---- Morceaux de la page (deux mises en page : grand écran ≥ 1200 px, paramètres à gauche ; sinon la mise en page empilée) ----
  const ongletsJsx = (
          <div role="tablist" aria-label="Pages de ce client" className={large ? 'flex flex-wrap gap-1' : 'flex gap-1 overflow-x-auto pb-1'}>
            {onglets.map((o) => {
              const n = notesPages.filter((x) => x.page === o.page);
              const actif = onglet.id === o.id;
              return (
                <button key={o.id} type="button" role="tab" aria-selected={actif} aria-controls="st-page" id={`st-onglet-${o.id.replace(/[^a-z0-9-]/g, '-')}`} onClick={() => changerOnglet(o.id)}
                  title={o.page === 'fiche' ? 'Fiche d’un soin' : o.page === 'theme' ? 'Page sujet' : undefined}
                  className={`flex min-h-11 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm ${focus} ${actif ? 'border-teal-800 bg-teal-800 font-semibold text-white' : o.page === 'fiche' ? 'border-dashed border-neutral-300 bg-white hover:bg-neutral-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                  {o.page === 'theme' && <span aria-hidden="true" className="text-xs opacity-70">Sujet :</span>}{o.page === 'fiche' && <span aria-hidden="true" className="text-xs opacity-70">Soin :</span>}
                  {o.nom}{verrous.includes(`page:${o.page}`) && <span aria-label="verrouillée">🔒</span>}{n.length > 0 && <span className={`rounded-full px-1.5 text-xs ${actif ? 'bg-white/20' : 'bg-teal-50 text-teal-900'}`}>{n[0].note}★</span>}
                </button>
              );
            })}
          </div>
  );
  const barreJsx = (
    <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-neutral-600" aria-live="polite">{ouverte.id ? 'Recette ouverte' : ouverte.origine ? 'Copie d’une recette' : 'Nouvelle recette'}{derniereGraine !== null ? ` · graine ${derniereGraine}` : ''}</p>
            <button type="button" onClick={tout} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>🎲 Tout changer <kbd className="ml-1 rounded bg-white/20 px-1">espace</kbd></button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-600">Effets :</span>
            <label className="flex min-h-11 items-center gap-2" title="Illustrations animées jouées comme sur le site (pause hors écran)"><input type="checkbox" checked={animer} onChange={(e) => setAnimer(e.target.checked)} className="size-5 accent-teal-800" />Animer</label>
            <button type="button" aria-pressed={demoSurvol} onClick={() => setDemoSurvol((x) => !x)} className={`min-h-11 rounded-lg border px-3 ${focus} ${demoSurvol ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-300 bg-white'}`}>Survol en boucle</button>
            <button type="button" onClick={() => setRejouer((n) => n + 1)} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>Rejouer l’apparition</button>
            <span className="text-xs text-neutral-500">Transition entre pages : visible sur le site publié (navigateurs compatibles).</span>
          </div>
          {defauts.length > 0 && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-900">{defauts.join(' ')}</p>}

    </>
  );
  const rendu = (app: 'bureau' | 'mobile', hauteur?: number) => apercu && <ApercuTheme sansCommandes hauteurCadre={hauteur} animer={animer} animationsEnAttente={animationsEnAttente} vueInitiale={vueDePage(page)} survol={survolActif} appareil={app} draft={draftPourOnglet(apercu.draft, onglet)} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />;
  const blocPage = (() => {
              const p = PAGES_STRUCTURE.find((x) => x.id === page)!;
              const variablesPage = p.sections.filter((s) => variables.includes(s));
              const nomPage = ONGLETS_PAGES.find((o) => o.page === page)?.nom ?? page;
              const cleStructurePage = cles.find((k) => k.startsWith(`structure:${page}:`)) ?? `modele:${comp.structure}`;
              const em = empreinteMobile(cleStructurePage);
              return (
                <section aria-label={`Page ${nomPage}`} className={`grid gap-3 rounded-2xl border border-black/10 bg-white p-3 ${large ? '' : 'md:grid-cols-2 md:items-start'}`}>
                  <div className="grid content-start gap-2">
                    <h2 className="px-2 text-base font-semibold">Page « {nomPage} »</h2>
                    {p.ordre || variablesPage.length ? (
                      <ul className="grid gap-0.5">
                        <Ligne cle={`page:${page}`} titre={`Structure de la page${verrous.includes('structure') ? ' (structure verrouillée)' : ''}`} valeur={[p.ordre ? valeur('Sections').split(' · ')[0] : '', ...variablesPage.filter((s) => v[s]).map((s) => LIBELLES_VARIANTES[s]?.[v[s]] ?? v[s])].filter(Boolean).join(' · ')} onDe={() => lancerSous({ page })} />
                      </ul>
                    ) : <p className="px-2 text-sm text-neutral-600">Pas de présentation variable sur ce modèle pour cette page.</p>}
                    <p className="px-2 text-xs text-neutral-500">🔒 verrouille cette page seulement : « Tout changer » et les autres dés la laissent telle quelle.</p>
                    <RenduMobile key={`rm-${page}-${cleStructurePage}`} cle={cleStructurePage} empreinte={em} page={page} recette={ouverte.id} libelle={nomPage}
                      zones={zonesMobile.length ? { appareil: 'mobile', empreinte: em, page, largeur: 390, zones: zonesMobile } : null}
                      onEnregistre={(x) => { if (x === 'a_revoir') setZonesMobile([]); }} />
                  </div>
                  <div className="grid content-start gap-2">
                    <p className="text-sm font-semibold">Noter cette page <span className="font-normal text-neutral-500">({appareilVu === 'les-deux' ? 'ordinateur et mobile' : appareilVu})</span></p>
                    <div role="group" aria-label={`Note de la page ${nomPage}`} className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={notePage === n} onClick={() => setNotePage(notePage === n ? null : n)} className={`min-h-11 rounded-xl border text-base font-bold ${focus} ${notePage === n ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white'}`}>{n}<span aria-hidden="true" className="text-amber-500">★</span></button>)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ETIQUETTES_STUDIO.map((e) => (
                        <button key={e.id} type="button" aria-pressed={etqPage.includes(e.id)} onClick={() => setEtqPage((l) => (l.includes(e.id) ? l.filter((x) => x !== e.id) : [...l, e.id]))}
                          className={`min-h-11 rounded-full border px-2.5 text-xs ${focus} ${etqPage.includes(e.id) ? (e.positive ? 'border-teal-700 bg-teal-700 text-white' : 'border-red-800 bg-red-800 text-white') : 'border-neutral-200 bg-white'}`}>{e.libelle}</button>
                      ))}
                    </div>
                    <label className="grid gap-1 text-sm"><span className="text-teal-900">Ce qui va bien</span><textarea value={positifPage} onChange={(e) => setPositifPage(e.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" /></label>
                    <label className="grid gap-1 text-sm"><span className="text-red-900">Ce qui ne va pas</span><textarea value={negatifPage} onChange={(e) => setNegatifPage(e.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" /></label>
                    <p className="text-xs text-neutral-500">{zonesOrdi.length + zonesMobile.length ? `${zonesOrdi.length + zonesMobile.length} zone(s) partiront avec la note. ` : ''}{ouverte.id ? 'Note rattachée à la recette ouverte, pour cette page seulement.' : 'Recette non enregistrée : la note porte sur la structure de la page.'}</p>
                    <button type="button" disabled={!notePage} onClick={() => void noterPage()} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>Enregistrer la note de la page</button>
                    {notesPages.some((x) => x.page === page) && <p className="text-xs text-neutral-600">Déjà notée : {notesPages.filter((x) => x.page === page).slice(0, 5).map((x) => `${x.note}★ (${x.appareil})`).join(', ')}</p>}
                  </div>
                </section>
              );
  })();
  const desJsx = (
    <>
          <section aria-labelledby="st-des" className="grid gap-1 rounded-2xl border border-black/10 bg-white p-3">
            <h2 id="st-des" className="px-2 text-base font-semibold">Dés</h2>
            <ul className="grid gap-0.5">
              <Ligne cle="couleurs" dim="couleurs" titre="Couleurs" valeur={valeur('Couleurs')} onDe={() => lancer('couleurs')} />
              <Ligne cle="polices" dim="polices" titre="Polices" valeur={PAIRES_POLICES.find((p) => p.id === comp.police)?.description ?? ''} onDe={() => lancer('polices')} />
              <Ligne cle="visuels" dim="visuels" titre="Style des illustrations" valeur={valeur('Visuels')} onDe={() => lancer('visuels')} />
              <li className="px-2 pb-1">
                <div role="radiogroup" aria-label="Style des illustrations (tout le site : héros, soins, pages sujet, fiches)" className="grid grid-cols-2 gap-1">
                  {styles.map((st) => (
                    <button key={st.id} type="button" role="radio" aria-checked={comp.visuels.style === st.id} disabled={!st.permis} onClick={() => choisir(st.id)}
                      title={st.raison ?? `${st.nom} : ${st.detail}`}
                      className={`grid min-h-11 content-center rounded-lg border px-2 py-1 text-left text-sm ${focus} disabled:cursor-not-allowed disabled:opacity-50 ${comp.visuels.style === st.id ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-300 bg-white hover:bg-neutral-50'}`}>
                      <span>{st.nom}</span><span className={`text-xs font-normal ${comp.visuels.style === st.id ? 'text-white/85' : 'text-neutral-500'}`}>{st.detail}</span>
                    </button>
                  ))}
                </div>
                {styles.some((st) => !st.permis) && (
                  <ul className="mt-1 grid gap-0.5 text-xs text-neutral-600">{styles.filter((st) => !st.permis).map((st) => <li key={st.id}><span className="font-semibold">{st.nom} grisé</span> : {st.raison}</li>)}</ul>
                )}
                <p className="mt-1 text-xs text-neutral-500">Appliqué à tout le site (héros, illustrations des soins, pages sujet, fiches, articles) et enregistré dans la recette. 🔒 protège le style des dés, pas de vos choix.</p>
              </li>
              <Ligne cle="animation" titre="Animation d’accueil"
                valeur={comp.visuels.animation ? `${LIBELLES_ANIMATIONS[comp.visuels.animation] ?? comp.visuels.animation}${animationsEnAttente.includes(comp.visuels.animation) ? ' (en attente de validation)' : ''}` : animationsPermises(ctx, comp.structure, comp.visuels.style).length ? 'aucune' : 'Structure Technique + Relevé seulement'}
                onDe={() => { if (verrous.includes('animation')) return; memoriser('animation', 'visuels'); setComp((x) => tirerAnimation(x, ctx, suivante())); }} />
              <Ligne cle="photos" dim="photos" titre="Photos" valeur={comp.visuels.style === 'photos' ? valeur('Photos') : 'Choisissez le style « Photos »'} onDe={() => lancer('photos')} />
              <Ligne cle="effets" dim="effets" titre="Effets" valeur={valeur('Effets')} onDe={() => lancer('effets')} />
              <Ligne cle="traitement" dim="traitement" titre="Traitement des photos" valeur={libelleTraitementPhotos(comp.traitement)} onDe={() => lancer('traitement')} />
              <li className="px-2 pb-1">
                <div role="radiogroup" aria-label="Traitement de toutes les photos du site (premier écran, cabinet, galerie, pages sujet, soins)" className="grid grid-cols-2 gap-1">
                  {TRAITEMENTS_PHOTOS.map((t) => (
                    <button key={t.id} type="button" role="radio" aria-checked={comp.traitement.id === t.id} title={t.detail}
                      onClick={() => { if (comp.traitement.id !== t.id) { memoriser('traitement', 'traitement'); setComp((x) => ({ ...x, traitement: { ...x.traitement, id: t.id } })); } }}
                      className={`grid min-h-11 content-center rounded-lg border px-2 py-1 text-left text-sm ${focus} ${comp.traitement.id === t.id ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-300 bg-white hover:bg-neutral-50'}`}>
                      <span>{t.nom}</span><span className={`text-xs font-normal ${comp.traitement.id === t.id ? 'text-white/85' : 'text-neutral-500'}`}>{t.detail}</span>
                    </button>
                  ))}
                </div>
                <label className="mt-1 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={comp.traitement.grain} onChange={(e) => { memoriser('traitement', 'traitement'); setComp((x) => ({ ...x, traitement: { ...x.traitement, grain: e.target.checked } })); }} className="size-5" />Grain fin</label>
                <p className="text-xs text-neutral-500">Même voile sur toutes les photos du site, couleurs tirées de la gamme ; CSS seul (aucun fichier retraité).</p>
              </li>
              <Ligne cle="structure" dim="structure" titre="Structure (modèle et tout)" valeur={valeur('Structure')} onDe={() => lancer('structure')} />
            </ul>
            <div className="grid gap-2 px-2 pb-1" role="group" aria-label="Photos du scénario">
              <p className="text-sm" aria-live="polite">
                <strong>{dispo.bibliotheque.length}</strong> photo{dispo.bibliotheque.length > 1 ? 's' : ''} importée{dispo.bibliotheque.length > 1 ? 's' : ''} pour ces sujets
                {dispo.nonImportees.length > 0 && <> · <strong>{dispo.nonImportees.length}</strong> gardée{dispo.nonImportees.length > 1 ? 's' : ''} non importée{dispo.nonImportees.length > 1 ? 's' : ''}</>}
                <span className="block text-xs text-neutral-500">{dispo.importees.length} utilisable{dispo.importees.length > 1 ? 's' : ''} sur un site en tout (photos générales et intégrées comprises).</span>
              </p>
              {dispo.bibliotheque.length === 0 && (
                <p role="alert" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-950 ring-1 ring-amber-200">Aucune photo importée pour ces sujets : importez-en depuis <Link href="/admin/photos" className="font-semibold underline">/admin/photos</Link>.</p>
              )}
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={avecNonImportees} onChange={(e) => setAvecNonImportees(e.target.checked)} className="size-5" />Inclure les photos gardées non importées (studio seulement)</label>
              {comp.visuels.style === 'photos' && comp.photos.length > 0 && (
                <ul className="grid gap-1.5">
                  {comp.photos.map((u) => (
                    <li key={u} className="flex items-center gap-2">
                      <Vignette url={u} />
                      {estPhotoHebergee(u) ? <span className="min-w-0 truncate text-xs text-neutral-600" title={u}>{u.split('/').pop()}</span> : (
                        <span className="grid min-w-0 gap-1">
                          <span className="text-xs text-amber-900">Non importée : aperçu {photoDe(u)?.source === 'pixabay' ? 'Pixabay' : 'Pexels'}, jamais sur un site avant l’import.</span>
                          <button type="button" onClick={() => void importer(u)} disabled={importEnCours !== null} className={`min-h-11 justify-self-start rounded-lg border border-teal-800 px-3 text-sm font-semibold text-teal-900 disabled:opacity-50 ${focus}`}>{importEnCours === u ? 'Import en cours…' : 'Valider et importer'}</button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {pool.length > 0 && (
                <details>
                  <summary className={`min-h-11 cursor-pointer content-center text-sm font-semibold ${focus}`}>Photos disponibles ({pool.length})</summary>
                  <p className="text-xs text-neutral-500">{comp.visuels.style === 'photos' ? 'Touchez une photo pour l’ajouter à la recette ou l’en retirer (8 au plus).' : 'Passez au style « Photos » pour les utiliser.'}</p>
                  <ul className="mt-1 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {pool.slice(0, 48).map((p) => (
                      <li key={p.url}>
                        <button type="button" disabled={comp.visuels.style !== 'photos'} aria-pressed={comp.photos.includes(p.url)} onClick={() => basculerPhoto(p.url)} className={`block rounded-md ${focus} disabled:cursor-default`}
                          aria-label={`${comp.photos.includes(p.url) ? 'Retirer' : 'Ajouter'} la photo ${p.url.split('/').pop()?.split('?')[0]}${p.importee === false ? ' (non importée)' : ''}`}>
                          <Vignette url={p.url} choisie={comp.photos.includes(p.url)} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <details className="px-2" open>
              <summary className={`min-h-11 cursor-pointer content-center text-sm font-semibold ${focus}`}>Structure par type de page</summary>
              <ul className="grid gap-0.5">
                {PAGES_STRUCTURE.filter((p) => p.ordre || p.sections.some((s) => variables.includes(s))).map((p) => (
                  <Ligne key={p.id} cle={`page:${p.id}`} titre={p.nom} valeur={[p.ordre ? valeur('Sections').split(' · ')[0] : '', ...p.sections.filter((s) => v[s]).map((s) => LIBELLES_VARIANTES[s]?.[v[s]] ?? v[s])].filter(Boolean).join(' · ')} onDe={() => lancerSous({ page: p.id })} />
                ))}
              </ul>
            </details>
            <details className="px-2">
              <summary className={`min-h-11 cursor-pointer content-center text-sm font-semibold ${focus}`}>Éléments (un dé par famille)</summary>
              <ul className="grid gap-0.5">
                {FAMILLES_COMPOSANTS.filter((s) => variables.includes(s)).map((s) => (
                  <Ligne key={s} cle={`composant:${s}`} titre={NOMS_SECTIONS_VARIABLES[s] ?? s} valeur={LIBELLES_VARIANTES[s]?.[v[s]] ?? v[s] ?? '—'} onDe={() => lancerSous({ composant: s })} />
                ))}
              </ul>
              {gabarit === 'classique' && <p className="pb-2 text-xs text-neutral-500">Modèle Technique : seules la présentation et la forme des sujets varient.</p>}
            </details>
          </section>

          {/* ---- Noter les éléments affichés ---- */}
          <details className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3">
            <summary className={`min-h-11 cursor-pointer content-center text-base font-semibold ${focus}`}>Noter les éléments affichés</summary>
            <div className="flex flex-wrap gap-1">
              {ETIQUETTES_STUDIO.map((e) => (
                <button key={e.id} type="button" aria-pressed={etqElement.includes(e.id)} onClick={() => setEtqElement((l) => (l.includes(e.id) ? l.filter((x) => x !== e.id) : [...l, e.id]))}
                  className={`min-h-11 rounded-full border px-2.5 text-xs ${focus} ${etqElement.includes(e.id) ? (e.positive ? 'border-teal-700 bg-teal-700 text-white' : 'border-red-800 bg-red-800 text-white') : 'border-neutral-200 bg-white'}`}>{e.libelle}</button>
              ))}
            </div>
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
          </details>

          {/* ---- Enregistrer ---- */}
          <section aria-labelledby="st-enr" className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3">
            <div className="flex items-center justify-between gap-2"><h2 id="st-enr" className="text-base font-semibold">Enregistrer cette recette</h2>{(ouverte.id || ouverte.origine) && <button type="button" onClick={nouvelle} className={`min-h-11 text-sm font-semibold text-teal-900 underline ${focus}`}>Nouvelle</button>}</div>
            <label className="grid gap-1 text-sm"><span className="font-medium">Nom</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={nomPropose} maxLength={120} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base md:text-sm" />
            </label>
            <p className="text-xs text-neutral-600">Sujets visés : {scenario.principaux.map((id) => themeParId(id)?.court).join(', ') || 'aucun'}</p>
            <div role="group" aria-label="Note" className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={note === n} onClick={() => setNote(note === n ? null : n)} className={`min-h-12 rounded-xl border text-base font-bold ${focus} ${note === n ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white'}`}>{n}<span aria-hidden="true" className="text-amber-500">★</span></button>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {ETIQUETTES_RECETTE.map((e) => <button key={e} type="button" aria-pressed={etiquettes.includes(e)} onClick={() => setEtiquettes((l) => (l.includes(e) ? l.filter((x) => x !== e) : [...l, e]))} className={`min-h-11 rounded-full border px-2.5 text-xs ${focus} ${etiquettes.includes(e) ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-200 bg-white'}`}>{e.replace(/-/g, ' ')}</button>)}
            </div>
            <label className="grid gap-1 text-sm"><span className="font-medium">Ce qui va</span><textarea value={positif} onChange={(e) => setPositif(e.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" /></label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Ce qui ne va pas</span><textarea value={negatif} onChange={(e) => setNegatif(e.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" /></label>
            {aImporter.length > 0 && (
              <p role="alert" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-950 ring-1 ring-amber-200">⚠ {aImporter.length} photo{aImporter.length > 1 ? 's' : ''} non importée{aImporter.length > 1 ? 's' : ''} dans cette recette : la recette peut être enregistrée, mais l’import est requis avant tout usage sur un site (photos ignorées d’ici là).</p>
            )}
            <button type="button" onClick={() => void enregistrer()} disabled={defauts.length > 0} className={`min-h-12 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>{ouverte.id ? 'Enregistrer les modifications' : 'Enregistrer cette recette'}</button>
            <p role="status" className={`min-h-5 text-sm ${statut && !statut.ok ? 'text-red-800' : 'text-neutral-600'}`}>{statut?.message ?? (migrationManquante ? 'Migration 0032 à exécuter pour enregistrer.' : '')}</p>
          </section>
    </>
  );
  const mesRecettes = (
      <section aria-labelledby="st-mes" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="st-mes" className="text-lg font-semibold">Mes recettes <span className="text-sm font-normal text-neutral-500">({liste.length})</span></h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1">Scénario <select value={filtreScenario} onChange={(e) => setFiltreScenario(e.target.value as typeof filtreScenario)} className="min-h-11 rounded-lg border border-neutral-300 px-2"><option value="tous">Tous</option><option value="identique">Ce client</option><option value="proche">Ce client et proches</option></select></label>
            <label className="flex items-center gap-1">Sujet <select value={filtreSujet} onChange={(e) => setFiltreSujet(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 px-2"><option value="">Tous</option>{ACTIFS.map((id) => <option key={id} value={id}>{themeParId(id)?.court}</option>)}</select></label>
            <label className="flex items-center gap-1">Note ≥ <select value={filtreNote} onChange={(e) => setFiltreNote(Number(e.target.value))} className="min-h-11 rounded-lg border border-neutral-300 px-2">{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n || 'toutes'}</option>)}</select></label>
            <label className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={archivees} onChange={(e) => setArchivees(e.target.checked)} className="size-5" />Archivées</label>
          </div>
        </div>
        {renforts.length > 0 && (
          <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-950">
            <p className="font-semibold">Ce que vos recettes ont changé</p>
            <ul className="mt-1 grid gap-0.5">{renforts.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        {!liste.length ? <p className="text-sm text-neutral-500">Aucune recette{filtreSujet || filtreNote ? ' pour ce filtre' : ' enregistrée pour l’instant'}.</p> : (
          <ul className="grid gap-2 md:grid-cols-2">
            {liste.map((r) => (
              <RecetteVignette key={r.id} recette={r} apercu={apercuRecette(r)} catalogue={catalogue} marquesImportees={marquesImportees} themesActives={themesActives} onOuvrir={() => ouvrir(r)}>
                {filtreScenario !== 'tous' && <p className="text-xs font-semibold text-teal-900">{niveauProximite(scenario, scenarioDeRecette(r)) === 'identique' ? 'Même scénario' : 'Scénario proche'}</p>}
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
      </section>
  );

  if (large) return (
    <div className="grid gap-5">
      <div className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-4" style={{ marginInline: 'calc(50% - 50vw + 24px)' }}>
        {/* ---- Paramètres (colonne gauche, défilement interne) ---- */}
        <aside aria-label="Paramètres du studio" className="sticky top-[4.5rem] grid max-h-[calc(100dvh-5rem)] min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 overflow-y-auto overflow-x-hidden overscroll-contain pb-4 pr-1">
          <details open className="rounded-2xl border border-black/10 bg-white">
            <summary className={`min-h-11 cursor-pointer content-center px-4 text-base font-semibold ${focus}`}>Simuler un client</summary>
            <SimulateurClient compact scenario={scenario} onChange={changerScenario} cabinet={cabinet} onCabinet={setCabinet} catalogue={catalogue} themesActives={themesActives} />
          </details>
          <section aria-label="Pages de ce client" className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3">
            <h2 className="text-base font-semibold">Pages de ce client</h2>
            {ongletsJsx}
            {barreJsx}
          </section>
          <details open className="rounded-2xl">
            <summary className={`min-h-11 cursor-pointer content-center px-1 text-base font-semibold ${focus}`}>Cette page : structure et note</summary>
            {blocPage}
          </details>
          {desJsx}
        </aside>
        {/* ---- Aperçus ordinateur et téléphone côte à côte, défilement complet ---- */}
        <div role="tabpanel" id="st-page" aria-labelledby={`st-onglet-${onglet.id.replace(/[^a-z0-9-]/g, '-')}`} className="sticky top-[4.5rem] min-w-0">
          {apercu && (
            <ApercusCoteACote key={`${onglet.id}|${scenario.principaux.join()}|${comp.structure}|${rejouer}`} libelle={onglet.nom} onAppareil={setAppareilVu}
              zonesOrdinateur={zonesOrdi} zonesMobile={zonesMobile} onZonesOrdinateur={setZonesOrdi} onZonesMobile={setZonesMobile} rendu={rendu}
              entete={<p className="text-sm font-semibold">{onglet.nom}</p>} />
          )}
        </div>
      </div>
      {mesRecettes}
    </div>
  );

  return (
    <div className="grid gap-5">
      {/* ---- Simuler un client (mêmes contrôles que le parcours /creer) ---- */}
      <SimulateurClient scenario={scenario} onChange={changerScenario} cabinet={cabinet} onCabinet={setCabinet} catalogue={catalogue} themesActives={themesActives} />

      <section aria-label="Recette en cours" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
        {/* ---- Aperçu vivant, page par page ---- */}
        <div className="grid min-w-0 gap-2">
          {ongletsJsx}
          {barreJsx}
          <div role="tabpanel" id="st-page" aria-labelledby={`st-onglet-${onglet.id.replace(/[^a-z0-9-]/g, '-')}`} className="grid min-w-0 gap-3">
            {apercu && (
              <DoubleRendu key={`${onglet.id}|${scenario.principaux.join()}|${comp.structure}|${rejouer}`} libelle={onglet.nom} onAppareil={setAppareilVu} mobileDabord={etroit}
                zonesOrdinateur={zonesOrdi} zonesMobile={zonesMobile} onZonesOrdinateur={setZonesOrdi} onZonesMobile={setZonesMobile}
                rendu={rendu} />
            )}
            {blocPage}
          </div>
        </div>

        {/* ---- Dés ---- */}
        <div className="grid gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {desJsx}
        </div>
      </section>

      {mesRecettes}
    </div>
  );
}
