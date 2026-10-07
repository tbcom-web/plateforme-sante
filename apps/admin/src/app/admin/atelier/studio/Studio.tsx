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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  appliquerRecette, basculerCouleur, clesStructure, compositionInitiale, controlerComposition, COULEURS_PREFEREES, DIMENSIONS_RECETTE, draftVide,
  ETIQUETTES_RECETTE, ETIQUETTES_STUDIO, FAMILLES_COMPOSANTS, gabaritModele, libelleCleRenfort, libellesComposition, LIBELLES_VARIANTES, modeleIntegre,
  nomRecette, NOMS_SECTIONS_VARIABLES, reparerComposition, PAGES_STRUCTURE, PAIRES_POLICES, sectionsVariables, THEMES, themeParId, tirerDimension, tirerPage, toutChanger,
  universCatalogue, ONGLETS_PAGES, vueDePage, empreinteMobile, type AppareilRetour, type Zone,
  type CompositionRecette, type ContexteRecette, type DimensionRecette, type MarqueImportee, type ModeleManifeste, type PageStructure,
  type PhotoBanque, type PoidsAtelier, type Recette, type SiteDraft, type Univers, type Variantes,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import DoubleRendu from '@/components/DoubleRendu';
import RenduMobile from '@/components/RenduMobile';
import type { SoinCatalogue } from '@/lib/sites';
import { changerStatutRecette, enregistrerRecette, lireNotesPages, noterElementStudio, noterPageRecette } from './actions';

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

type Scenario = { principaux: string[]; secondaires: string[]; couleurs: string[] };
const ACTIFS = THEMES.filter((t) => t.statut === 'actif').map((t) => t.id);

/** Cabinet fictif de l'aperçu (seule l'apparence vient de la recette) */
function draftDemo(s: Scenario): SiteDraft {
  const d = draftVide();
  d.cabinet = { ...d.cabinet, nom: 'Cabinet de podologie', ville: 'Lyon', quartier: 'Brotteaux', telephone: '04 00 00 00 00' };
  d.lieux[0] = { ...d.lieux[0], adresse: '10 rue de la Démo', codePostal: '69006', ville: 'Lyon' };
  d.praticiens = [{ ...d.praticiens[0], prenom: 'Camille', nom: 'Rousseau' }, { ...d.praticiens[0], id: 'demo2', prenom: 'Julien', nom: 'Bernard' }];
  d.priorites = { principaux: s.principaux, secondaires: s.secondaires };
  d.couleursPreferees = s.couleurs;
  return d;
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
  }
};

export default function Studio({ proposes, modeles, catalogue, marquesImportees, themesActives, poids, photos, recettes, renforts, migrationManquante }: Props) {
  const [scenario, setScenario] = useState<Scenario>({ principaux: ['sport'], secondaires: [], couleurs: [] });
  const modele = useCallback((id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id), [modeles]);
  const ctx = useMemo<ContexteRecette>(() => ({ sujets: [...scenario.principaux, ...scenario.secondaires], principaux: scenario.principaux.length, couleursPreferees: scenario.couleurs, poids, photos, modele }), [scenario, poids, photos, modele]);
  const [comp, setComp] = useState<CompositionRecette>(() => compositionInitiale({ sujets: ['sport'], principaux: 1, photos, modele: modeleIntegre }));
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
    setComp((x) => tirerDimension(x, d, ctx, suivante()));
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
    setComp((x) => toutChanger(x, verrous, ctx, suivante()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verrous, ctx, comp]);
  const basculerVerrou = (cle: string) => setVerrous((v) => (v.includes(cle) ? v.filter((x) => x !== cle) : [...v, cle]));

  // Changement de scénario : composition remise dans les garde-fous du nouveau scénario (héros, gammes exclues…)
  const changerScenario = (s: Scenario) => {
    setScenario(s);
    const c2 = { ...ctx, sujets: [...s.principaux, ...s.secondaires], principaux: s.principaux.length, couleursPreferees: s.couleurs };
    setComp((x) => reparerComposition(x, c2));
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
  useEffect(() => { const mq = window.matchMedia('(max-width: 767px)'); const f = () => setEtroit(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  // ---- Pages (onglets) : aperçu, dé, verrou, note, zones et rendu mobile de chaque page ----
  const [page, setPage] = useState<PageStructure>('accueil');
  const [zonesOrdi, setZonesOrdi] = useState<Zone[]>([]);
  const [zonesMobile, setZonesMobile] = useState<Zone[]>([]);
  const [appareilVu, setAppareilVu] = useState<AppareilRetour>('les-deux');
  const [notePage, setNotePage] = useState<number | null>(null);
  const [etqPage, setEtqPage] = useState<string[]>([]);
  const [positifPage, setPositifPage] = useState('');
  const [negatifPage, setNegatifPage] = useState('');
  const [notesPages, setNotesPages] = useState<{ page: string; note: number; appareil: string; le: string }[]>([]);
  const changerPage = (p: PageStructure) => { setPage(p); setZonesOrdi([]); setZonesMobile([]); setNotePage(null); setEtqPage([]); setPositifPage(''); setNegatifPage(''); };
  // Démonstration des effets : survol simulé en boucle, apparition rejouée (l'aperçu est recréé)
  const [demoSurvol, setDemoSurvol] = useState(false);
  const [survolActif, setSurvolActif] = useState(false);
  const [rejouer, setRejouer] = useState(0);
  useEffect(() => { if (!demoSurvol) { setSurvolActif(false); return; } const t = setInterval(() => setSurvolActif((x) => !x), 1400); return () => clearInterval(t); }, [demoSurvol]);
  const base = useMemo(() => draftDemo(scenario), [scenario]);
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);
  const apercu = useMemo(() => appliquerRecette(base, comp, { proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives }), [base, comp, proposes, modeles, slugs, themesActives]);
  const defauts = controlerComposition(comp, ctx);
  const gabarit = gabaritModele(modele(universCatalogue(comp.structure)?.preReglage.modele ?? 'tableau'));
  const variables = sectionsVariables(gabarit);
  const libelles = libellesComposition(comp);

  // ---- Enregistrement ----
  const [nom, setNom] = useState('');
  const [note, setNote] = useState<number | null>(null);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [positif, setPositif] = useState('');
  const [negatif, setNegatif] = useState('');
  const nomPropose = nomRecette(comp, ctx.sujets);
  const enregistrer = async () => {
    setStatut(null);
    const r = await enregistrerRecette({ id: ouverte.id, origine: ouverte.origine, nom: nom || nomPropose, sujets: scenario.principaux, secondaires: scenario.secondaires, couleurs: scenario.couleurs, composition: comp, note, etiquettes, positif, negatif, appareil: appareilVu })
      .catch(() => ({ ok: false, message: 'Connexion perdue : recette non enregistrée.' } as { ok: boolean; message: string; id?: string }));
    setStatut(r);
    if (r.ok && r.id) setOuverte({ id: r.id, origine: null });
  };
  const ouvrir = (r: Recette, dupliquer = false) => {
    setScenario({ principaux: r.sujets.slice(0, 3), secondaires: r.sujets.slice(3), couleurs: r.couleursPreferees });
    setComp(r.composition);
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
  const liste = recettes.filter((r) => (archivees || r.statut === 'active') && (!filtreSujet || r.sujets.includes(filtreSujet)) && (r.note ?? 0) >= filtreNote);

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

  return (
    <div className="grid gap-5">
      {/* ---- Scénario ---- */}
      <section aria-labelledby="st-scenario" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <h2 id="st-scenario" className="text-lg font-semibold">Scénario</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sujets (1er appui : principal, 2e : secondaire, 3e : retiré)">
          {THEMES.map((t) => {
            const rang = scenario.principaux.indexOf(t.id);
            const sec = scenario.secondaires.includes(t.id);
            const differe = !ACTIFS.includes(t.id);
            const cycle = () => {
              const sans = { principaux: scenario.principaux.filter((x) => x !== t.id), secondaires: scenario.secondaires.filter((x) => x !== t.id) };
              if (rang < 0 && !sec) changerScenario(scenario.principaux.length < 3 ? { ...scenario, ...sans, principaux: [...sans.principaux, t.id] } : { ...scenario, ...sans, secondaires: [...sans.secondaires, t.id].slice(0, 3) });
              else if (rang >= 0) changerScenario({ ...scenario, ...sans, secondaires: [...sans.secondaires, t.id].slice(0, 3) });
              else changerScenario({ ...scenario, ...sans });
            };
            return (
              <button key={t.id} type="button" onClick={cycle} disabled={differe} aria-pressed={rang >= 0 || sec}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${focus} disabled:opacity-40 ${rang >= 0 ? 'border-teal-700 bg-teal-50 font-semibold' : sec ? 'border-dashed border-teal-700 bg-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                {rang >= 0 && <span className="grid size-5 place-items-center rounded-full bg-teal-800 text-xs text-white">{rang + 1}</span>}
                {sec && <span className="text-xs text-teal-800">+</span>}
                {t.court}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Couleurs préférées (3 au plus)">
          {COULEURS_PREFEREES.map((c) => {
            const rang = scenario.couleurs.indexOf(c.id);
            return (
              <button key={c.id} type="button" aria-pressed={rang >= 0} onClick={() => changerScenario({ ...scenario, couleurs: basculerCouleur(scenario.couleurs, c.id) })}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-sm ${focus} ${rang >= 0 ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                <span aria-hidden="true" className="size-5 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />{c.nom}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Recette en cours" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
        {/* ---- Aperçu vivant, page par page ---- */}
        <div className="grid min-w-0 gap-2">
          <div role="tablist" aria-label="Page de la recette" className="flex gap-1 overflow-x-auto pb-1">
            {ONGLETS_PAGES.map((o) => {
              const n = notesPages.filter((x) => x.page === o.page);
              return (
                <button key={o.page} type="button" role="tab" aria-selected={page === o.page} aria-controls="st-page" id={`st-onglet-${o.page}`} onClick={() => changerPage(o.page)}
                  className={`flex min-h-11 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm ${focus} ${page === o.page ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                  {o.nom}{verrous.includes(`page:${o.page}`) && <span aria-label="verrouillée">🔒</span>}{n.length > 0 && <span className={`rounded-full px-1.5 text-xs ${page === o.page ? 'bg-white/20' : 'bg-teal-50 text-teal-900'}`}>{n[0].note}★</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-neutral-600" aria-live="polite">{ouverte.id ? 'Recette ouverte' : ouverte.origine ? 'Copie d’une recette' : 'Nouvelle recette'}{derniereGraine !== null ? ` · graine ${derniereGraine}` : ''}</p>
            <button type="button" onClick={tout} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>🎲 Tout changer <kbd className="ml-1 rounded bg-white/20 px-1">espace</kbd></button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-600">Effets :</span>
            <button type="button" aria-pressed={demoSurvol} onClick={() => setDemoSurvol((x) => !x)} className={`min-h-11 rounded-lg border px-3 ${focus} ${demoSurvol ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-300 bg-white'}`}>Survol en boucle</button>
            <button type="button" onClick={() => setRejouer((n) => n + 1)} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>Rejouer l’apparition</button>
            <span className="text-xs text-neutral-500">Transition entre pages : visible sur le site publié (navigateurs compatibles).</span>
          </div>
          {defauts.length > 0 && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-900">{defauts.join(' ')}</p>}
          <div role="tabpanel" id="st-page" aria-labelledby={`st-onglet-${page}`} className="grid min-w-0 gap-3">
            {apercu && (
              <DoubleRendu key={`${page}|${scenario.principaux.join()}|${comp.structure}|${rejouer}`} libelle={ONGLETS_PAGES.find((o) => o.page === page)?.nom} onAppareil={setAppareilVu} mobileDabord={etroit}
                zonesOrdinateur={zonesOrdi} zonesMobile={zonesMobile} onZonesOrdinateur={setZonesOrdi} onZonesMobile={setZonesMobile}
                rendu={(app) => <ApercuTheme sansCommandes vueInitiale={vueDePage(page)} survol={survolActif} appareil={app} draft={apercu.draft} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />} />
            )}
            {(() => {
              const p = PAGES_STRUCTURE.find((x) => x.id === page)!;
              const variablesPage = p.sections.filter((s) => variables.includes(s));
              const nomPage = ONGLETS_PAGES.find((o) => o.page === page)?.nom ?? page;
              const cleStructurePage = cles.find((k) => k.startsWith(`structure:${page}:`)) ?? `modele:${comp.structure}`;
              const em = empreinteMobile(cleStructurePage);
              return (
                <section aria-label={`Page ${nomPage}`} className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3 md:grid-cols-2 md:items-start">
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
            })()}
          </div>
        </div>

        {/* ---- Dés ---- */}
        <div className="grid gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <section aria-labelledby="st-des" className="grid gap-1 rounded-2xl border border-black/10 bg-white p-3">
            <h2 id="st-des" className="px-2 text-base font-semibold">Dés</h2>
            <ul className="grid gap-0.5">
              <Ligne cle="couleurs" dim="couleurs" titre="Couleurs" valeur={valeur('Couleurs')} onDe={() => lancer('couleurs')} />
              <Ligne cle="polices" dim="polices" titre="Polices" valeur={PAIRES_POLICES.find((p) => p.id === comp.police)?.description ?? ''} onDe={() => lancer('polices')} />
              <Ligne cle="visuels" dim="visuels" titre="Visuels" valeur={valeur('Visuels')} onDe={() => lancer('visuels')} />
              <Ligne cle="photos" dim="photos" titre="Photos" valeur={comp.visuels.style === 'photos' ? valeur('Photos') : 'Style « Photos » seulement'} onDe={() => lancer('photos')} />
              <Ligne cle="effets" dim="effets" titre="Effets" valeur={valeur('Effets')} onDe={() => lancer('effets')} />
              <Ligne cle="structure" dim="structure" titre="Structure (modèle et tout)" valeur={valeur('Structure')} onDe={() => lancer('structure')} />
            </ul>
            {comp.visuels.style === 'photos' && comp.photos.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto px-2 pb-1">{comp.photos.map((u) => <img key={u} src={u} alt="" className="h-14 w-20 shrink-0 rounded-md object-cover" />)}</div>
            )}
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
            <button type="button" onClick={() => void enregistrer()} disabled={defauts.length > 0} className={`min-h-12 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>{ouverte.id ? 'Enregistrer les modifications' : 'Enregistrer cette recette'}</button>
            <p role="status" className={`min-h-5 text-sm ${statut && !statut.ok ? 'text-red-800' : 'text-neutral-600'}`}>{statut?.message ?? (migrationManquante ? 'Migration 0032 à exécuter pour enregistrer.' : '')}</p>
          </section>
        </div>
      </section>

      {/* ---- Mes recettes ---- */}
      <section aria-labelledby="st-mes" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="st-mes" className="text-lg font-semibold">Mes recettes <span className="text-sm font-normal text-neutral-500">({liste.length})</span></h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
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
              <li key={r.id} className={`grid gap-1.5 rounded-xl border p-3 ${r.statut === 'archivee' ? 'border-dashed border-neutral-300 opacity-70' : 'border-black/10'}`}>
                <div className="flex items-start justify-between gap-2"><strong className="min-w-0">{r.nom}</strong><span className="shrink-0 text-sm">{r.note ? `${r.note}★` : 'non notée'}</span></div>
                <p className="text-xs text-neutral-600">{r.sujets.map((s) => themeParId(s)?.court ?? s).join(', ') || 'Sans sujet'}{r.etiquettes.length ? ` · ${r.etiquettes.join(', ')}` : ''}</p>
                <p className="text-xs text-neutral-500">{libellesComposition(r.composition).map((l) => l.valeur).slice(0, 4).join(' · ')}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => ouvrir(r)} className={`min-h-11 rounded-lg border border-teal-800 px-3 text-sm font-semibold text-teal-900 ${focus}`}>Ouvrir</button>
                  <button type="button" onClick={() => ouvrir(r, true)} className={`min-h-11 rounded-lg border border-neutral-300 px-3 text-sm ${focus}`}>Dupliquer</button>
                  <button type="button" onClick={async () => setStatut(await changerStatutRecette(r.id, r.statut === 'active' ? 'archivee' : 'active'))} className={`min-h-11 rounded-lg border border-neutral-300 px-3 text-sm ${focus}`}>{r.statut === 'active' ? 'Archiver' : 'Réactiver'}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
