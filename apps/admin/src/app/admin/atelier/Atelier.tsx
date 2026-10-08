'use client';

// Atelier des propositions (super admin) : un scénario (sujets, couleurs préférées) ou « Au hasard », puis les combinaisons
// du générateur une par une, exactement comme le parcours les produit (lotsPropositions, mêmes poids appris, même aperçu
// apercuProposition). Notation : 1 à 5 étoiles, étiquettes rapides, commentaire facultatif ; passage automatique à la
// suivante. Ordinateur : 1-5 = note, t = étiquettes (puis 1-8), ← → = précédente / suivante, z = signaler une zone.
// Téléphone : gros boutons, barre de notation fixée en bas. Une seule carte rendue à la fois (rendu paresseux).
// Ordinateur ET mobile (0034) : les deux rendus côte à côte (bascule sur téléphone), annotables ; la note du CHOIX garde
// l'appareil regardé ; bloc « Rendu mobile » à part (défaut d'adaptation rattaché à la structure, jamais au choix).
// COMBINAISONS COMPLÈTES (retour de Paul du 2026-10-08 : « je ne vois pas les nouveaux headers… on voit juste le hero ») : chaque
// proposition est complétée par tous les ingrédients du Studio (compositionAtelier, core : premiers écrans photo et organiques,
// animations d'en-tête, transitions, portraits, habillage, traitement des photos ; « à valider » compris, avec badge), notés avec
// elle (`reglages`). Aperçu de la PAGE ENTIÈRE : ordinateur et téléphone côte à côte avec défilement dans le cadre, « Page
// entière », défilement synchronisé et onglets des pages du scénario (ApercusCoteACote du Studio) ; sur téléphone, un rendu à la fois.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  basculerCouleur, cleCombinaison, COULEURS_PREFEREES, couleurPreferee, draftVide, ETIQUETTES_ATELIER, gamme as gammeParId, ingredientsProposition,
  LIBELLES_ANIMATIONS, LIBELLES_STRUCTURES, LIBELLES_STYLES, lotsPropositions, pastilleGamme, sujetsPris, THEMES, themeParId, alea, tirerPhotos,
  type PhotoBanque, type MarqueImportee, type ModeleManifeste, type PoidsAtelier, type SiteDraft, type Univers,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import ApercusCoteACote from './studio/ApercusCoteACote';
import {
  aValiderDansComposition, appliquerPriorites, appliquerRecette, avecPartPhotos, compositionAtelier, vivierDuSujet, VIVIER_PHOTOS, draftPourOnglet, libelleTraitementPhotos, LIBELLES_VARIANTES, modeleIntegre,
  NOMS_SECTIONS_VARIABLES, ongletsDuScenario, pairePolices, reglagesAtelier, soinsDuScenario, vueDePage, type ContexteRecette, type PageStructure,
} from '@plateforme/core';
import DoubleRendu from '@/components/DoubleRendu';
import RenduMobile from '@/components/RenduMobile';
import { empreinteMobile, type AppareilRetour, type ScenarioRecette, type Zone } from '@plateforme/core';
import type { SoinCatalogue } from '@/lib/sites';
import { ajouterNoteAtelier } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const puce = 'rounded-full bg-neutral-100 px-2.5 py-1';

type Props = {
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
  poids: PoidsAtelier | null;
  dejaNotees: Record<string, { n: number; derniere: number }>;
  migrationManquante: boolean;
  /** Photos de la banque (jeux de photos, photos libres validées, photos intégrées) : montrées en style « photos » */
  photos?: PhotoBanque[];
};

/** Même format de scénario que le Studio et les recettes (simulateur.ts) : soins = [] → soins de base des sujets */
export type Scenario = ScenarioRecette;

const ACTIFS = THEMES.filter((t) => t.statut === 'actif').map((t) => t.id);

/** Tirage au hasard : 1 à 3 sujets principaux, 0 à 2 secondaires, 0 à 3 couleurs (thèmes différés exclus) */
export function auHasard(): Scenario {
  const melange = <T,>(l: readonly T[]) => [...l].map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const t = melange(ACTIFS);
  const np = 1 + Math.floor(Math.random() * 3);
  const ns = Math.floor(Math.random() * 3);
  const nc = Math.floor(Math.random() * 4);
  return { principaux: t.slice(0, np), secondaires: t.slice(np, np + ns), couleurs: melange(COULEURS_PREFEREES.map((c) => c.id)).slice(0, nc), soins: [] };
}

/** Cabinet fictif de l'aperçu (seule l'apparence vient de la proposition) */
export function draftDemo(): SiteDraft {
  const d = draftVide();
  d.cabinet = { ...d.cabinet, nom: 'Cabinet de podologie', ville: 'Lyon', quartier: 'Brotteaux', telephone: '04 00 00 00 00' };
  d.lieux[0] = { ...d.lieux[0], adresse: '10 rue de la Démo', codePostal: '69006', ville: 'Lyon' };
  d.praticiens[0] = { ...d.praticiens[0], prenom: 'Camille', nom: 'Rousseau' };
  return d;
}

/** Écran étroit (téléphone) */
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

export default function Atelier({ proposes, modeles, catalogue, marquesImportees, themesActives, poids, dejaNotees, migrationManquante, photos = [] }: Props) {
  const [scenario, setScenario] = useState<Scenario>({ principaux: ['sport'], secondaires: [], couleurs: [], soins: [] });
  const [apprentissage, setApprentissage] = useState(true);
  const [nbLots, setNbLots] = useState(1);
  const [index, setIndex] = useState(0);
  const etroit = useEtroit();
  const [appareilVu, setAppareilVu] = useState<AppareilRetour>('les-deux');
  const [zonesOrdi, setZonesOrdi] = useState<Zone[]>([]);
  const [zonesMobile, setZonesMobile] = useState<Zone[]>([]);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [modeEtiquettes, setModeEtiquettes] = useState(false);
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [session, setSession] = useState<Record<string, number>>({});
  const [envois, setEnvois] = useState(0);

  const base = useMemo(draftDemo, []);
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);
  const entree = useMemo(() => ({ priorites: { principaux: scenario.principaux, secondaires: scenario.secondaires }, couleursPreferees: scenario.couleurs }), [scenario]);
  const d = useMemo<SiteDraft>(() => ({ ...base, priorites: entree.priorites, couleursPreferees: scenario.couleurs }), [base, entree, scenario.couleurs]);
  const disponibles = useMemo(() => new Set(proposes.map((u) => u.id)), [proposes]);
  // Mêmes lots que le parcours (mêmes poids appris) ; « apprentissage » décoché : générateur brut
  const lots = useMemo(() => lotsPropositions(entree, nbLots, { poids: apprentissage ? poids : null }), [entree, nbLots, apprentissage, poids]);
  // Vivier curé 4-5 ★ du sujet n° 1 (contexte-images.ts) : assez de photos → ≈ VIVIER_PHOTOS.part des combinaisons en style photo,
  // avec ces photos seulement (tirerPhotos) ; sinon illustrations et bandeau « Peu de photos 4-5 ★ … → Compléter le vivier »
  const sujetUn = sujetsPris(entree)[0] ?? 'general';
  const vivier = vivierDuSujet(sujetUn);
  const liste = useMemo(() => avecPartPhotos(lots.flat().filter((p) => disponibles.has(p.univers)), sujetUn, vivier?.length ?? 0), [lots, disponibles, sujetUn, vivier]);
  const epuise = lots.length < nbLots;
  const p = liste[index] ?? null;

  // Page suivante du générateur quand on arrive au bout de la liste
  useEffect(() => {
    if (!epuise && index >= liste.length - 1) setNbLots((n) => n + 1);
  }, [index, liste.length, epuise]);

  // Style « photos » : de VRAIES photos de la banque, tirées pour les sujets et pondérées par les notes ; elles font partie des
  // ingrédients notés (clé de combinaison) — même tirage pour une même proposition (graine : son identifiant)
  const photosP = useMemo(() => (p && p.modeVisuel === 'photos' && photos.length ? tirerPhotos({ sujets: sujetsPris(entree), principaux: scenario.principaux.length, poids, photos }, alea(0, p.id)) : []), [p, photos, entree, scenario.principaux.length, poids]);
  // Combinaison complète : la proposition + tous les autres ingrédients du Studio (registre, harmonie), « à valider » compris
  const modele = useCallback((id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id), [modeles]);
  const ctxRecette = useMemo<ContexteRecette>(() => ({ sujets: sujetsPris(entree), principaux: scenario.principaux.length, couleursPreferees: scenario.couleurs, poids: apprentissage ? poids : null, photos, modele }), [entree, scenario.principaux.length, scenario.couleurs, apprentissage, poids, photos, modele]);
  const comp = useMemo(() => (p ? compositionAtelier(p, ctxRecette, photosP, 0) : null), [p, ctxRecette, photosP]);
  const aValider = useMemo(() => (comp ? aValiderDansComposition(comp) : []), [comp]);
  const ingredients = useMemo(() => (p && comp ? { ...ingredientsProposition(p, entree, photosP), reglages: reglagesAtelier(comp, sujetsPris(entree)) } : null), [p, comp, entree, photosP]);
  const cle = useMemo(() => (ingredients ? cleCombinaison(ingredients) : ''), [ingredients]);
  const apercu = useMemo(() => {
    if (!comp) return null;
    const dd = appliquerPriorites({ ...d, soins: soinsDuScenario(scenario, slugs) }, { principaux: scenario.principaux, secondaires: scenario.secondaires });
    return appliquerRecette(dd, comp, { proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives });
  }, [comp, d, scenario, slugs, proposes, modeles, themesActives]);
  // Pages du scénario (onglets) ; mode zone (z) partagé par les deux rendus côte à côte
  const onglets = useMemo(() => ongletsDuScenario(scenario, catalogue, { themesActives }), [scenario, catalogue, themesActives]);
  const [ongletId, setOngletId] = useState('accueil');
  const onglet = onglets.find((o) => o.id === ongletId) ?? onglets[0];
  const [large, setLarge] = useState(false);
  useEffect(() => { const mq = window.matchMedia('(min-width: 1200px)'); const f = () => setLarge(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  const [modeZone, setModeZone] = useState(false);
  const [animer, setAnimer] = useState(true);
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAnimer(false); }, []);

  const changerScenario = (s: Scenario) => {
    setScenario(s);
    setNbLots(1);
    setIndex(0);
    setEtiquettes([]);
    setCommentaire('');
    setStatut(null);
  };

  const aller = useCallback((delta: number) => {
    setIndex((i) => Math.max(0, Math.min(liste.length - 1, i + delta)));
    setEtiquettes([]);
    setCommentaire('');
    setModeEtiquettes(false);
    setZonesOrdi([]);
    setZonesMobile([]);
  }, [liste.length]);

  const noter = useCallback(async (note: number) => {
    if (!p || !ingredients) return;
    if (migrationManquante) { setStatut({ ok: false, message: 'Migration 0026 à exécuter : la note ne peut pas être enregistrée.' }); return; }
    const etq = etiquettes;
    const com = commentaire;
    const nom = p.nom;
    // Optimiste : on passe tout de suite à la suivante, l'enregistrement suit
    setSession((s) => ({ ...s, [cle]: note }));
    aller(1);
    setEnvois((n) => n + 1);
    const toutes = [...zonesOrdi, ...zonesMobile];
    const r = await ajouterNoteAtelier(ingredients, note, etq, com, { appareil: appareilVu, zones: toutes.length ? { appareil: appareilVu, empreinte: null, zones: toutes } : null }).catch(() => ({ ok: false, message: 'Connexion perdue : note non enregistrée.' }));
    setEnvois((n) => n - 1);
    if (!r.ok) setSession((s) => { const x = { ...s }; delete x[cle]; return x; });
    setStatut(r.ok ? { ok: true, message: r.message } : { ok: false, message: `${nom} : ${r.message}` });
  }, [p, ingredients, migrationManquante, etiquettes, commentaire, cle, aller, zonesOrdi, zonesMobile, appareilVu]);

  const basculerEtiquette = (id: string) => setEtiquettes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  // Raccourcis clavier (ignorés pendant la saisie)
  const touches = useRef<(e: KeyboardEvent) => void>(() => {});
  touches.current = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || (cible && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName)))) return;
    if (modeEtiquettes && /^[1-8]$/.test(e.key)) { e.preventDefault(); basculerEtiquette(ETIQUETTES_ATELIER[Number(e.key) - 1].id); return; }
    if (/^[1-5]$/.test(e.key)) { e.preventDefault(); void noter(Number(e.key)); return; }
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); setModeEtiquettes((m) => !m); return; }
    if (large && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); setModeZone((m) => !m); return; }
    if (e.key === 'Escape') { setModeEtiquettes(false); setModeZone(false); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); aller(1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); aller(-1); return; }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => touches.current(e);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const g = p ? gammeParId(p.gamme) : undefined;
  const [pa, pb] = g ? pastilleGamme(g) : ['#ccc', '#eee'];
  const lot = Math.floor(index / 3) + 1;
  const deja = dejaNotees[cle];
  const noteSession = session[cle];
  const sujets = sujetsPris(entree);

  return (
    <div className="grid gap-5">
      {vivier !== null && vivier.length < VIVIER_PHOTOS.seuil && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <span>Peu de photos 4-5 ★ pour {themeParId(sujetUn)?.court ?? 'ce sujet'} ({vivier.length}) : les combinaisons restent en illustrations.</span>
          <a href={`/admin/retours/kits?sujet=${sujetUn}`} className="font-semibold text-teal-900 underline">Compléter le vivier →</a>
        </p>
      )}
      {/* ---- Scénario ---- */}
      <section aria-labelledby="atelier-scenario" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="atelier-scenario" className="text-lg font-semibold">Scénario</h2>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={apprentissage} onChange={(e) => { setApprentissage(e.target.checked); setNbLots(1); setIndex(0); }} className="size-5 accent-teal-700" />
              Avec l’apprentissage{poids ? ` (${poids.n} notes)` : ''}
            </label>
            <button type="button" onClick={() => changerScenario(auHasard())} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>Au hasard</button>
          </div>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Sujets <span className="font-normal text-neutral-600">(1er appui : principal, 2e : secondaire, 3e : retiré)</span></legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => {
              const rang = scenario.principaux.indexOf(t.id);
              const sec = scenario.secondaires.includes(t.id);
              const differe = t.statut !== 'actif';
              const cycle = () => {
                const sans = { principaux: scenario.principaux.filter((x) => x !== t.id), secondaires: scenario.secondaires.filter((x) => x !== t.id) };
                if (rang < 0 && !sec) changerScenario(scenario.principaux.length < 3 ? { ...scenario, ...sans, principaux: [...sans.principaux, t.id] } : { ...scenario, ...sans, secondaires: [...sans.secondaires, t.id].slice(0, 3) });
                else if (rang >= 0) changerScenario({ ...scenario, ...sans, secondaires: [...sans.secondaires, t.id].slice(0, 3) });
                else changerScenario({ ...scenario, ...sans });
              };
              return (
                <button key={t.id} type="button" onClick={cycle} disabled={differe} aria-pressed={rang >= 0 || sec}
                  aria-label={`${t.court}${rang >= 0 ? `, principal n° ${rang + 1}` : sec ? ', secondaire' : ''}${differe ? ' (différé)' : ''}`}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${focus} disabled:opacity-40 ${rang >= 0 ? 'border-teal-700 bg-teal-50 font-semibold' : sec ? 'border-dashed border-teal-700 bg-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                  {rang >= 0 && <span className="grid size-5 place-items-center rounded-full bg-teal-800 text-xs text-white">{rang + 1}</span>}
                  {sec && <span className="text-xs text-teal-800">+</span>}
                  {t.court}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Couleurs préférées <span className="font-normal text-neutral-600">({scenario.couleurs.length} sur 3, dans l’ordre)</span></legend>
          <div className="flex flex-wrap gap-1.5">
            {COULEURS_PREFEREES.map((c) => {
              const rang = scenario.couleurs.indexOf(c.id);
              return (
                <button key={c.id} type="button" aria-pressed={rang >= 0} aria-label={`${c.nom}${rang >= 0 ? `, choix n° ${rang + 1}` : ''}`}
                  onClick={() => changerScenario({ ...scenario, couleurs: basculerCouleur(scenario.couleurs, c.id) })}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-sm ${focus} ${rang >= 0 ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                  <span aria-hidden="true" className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white ring-1 ring-black/10" style={{ background: c.hex }}>{rang >= 0 ? rang + 1 : ''}</span>
                  {c.nom}
                </button>
              );
            })}
          </div>
        </fieldset>
        <p className="text-sm text-neutral-700">
          Sujets pris en compte : <strong>{sujets.map((id) => themeParId(id)?.court).join(', ') || 'aucun (cabinet)'}</strong>
          {scenario.couleurs.length > 0 && <> · couleurs : <strong>{scenario.couleurs.map((id) => couleurPreferee(id)?.nom).join(', ')}</strong></>}
        </p>
      </section>

      {/* ---- Combinaison ---- */}
      {!p ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Aucune combinaison pour ce scénario.</p> : (
        <section aria-label="Combinaison à noter" className={large ? 'grid grid-cols-[minmax(0,1fr)_360px] items-start gap-4' : 'grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] md:items-start'} style={large ? { marginInline: 'calc(50% - 50vw + 24px)' } : undefined}>
          <div className="grid min-w-0 gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-neutral-600" aria-live="polite">Lot {lot} · proposition {(index % 3) + 1} sur 3 · n° {index + 1}{epuise && index >= liste.length - 1 ? ' (dernière)' : ''}</p>
            </div>
            {apercu && (() => {
              const cleRendu = `${p.id}|${scenario.couleurs.join()}|${sujets.join()}|${onglet.id}`;
              const rendu = (app: 'bureau' | 'mobile', hauteur?: number) => <ApercuTheme sansCommandes hauteurCadre={hauteur} animer={animer} appareil={app} vueInitiale={vueDePage(onglet.page as PageStructure)} draft={draftPourOnglet(apercu.draft, onglet)} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />;
              const ongletsJsx = (
                <div role="tablist" aria-label="Pages du scénario" className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">
                  {onglets.map((o) => (
                    <button key={o.id} type="button" role="tab" aria-selected={o.id === onglet.id} onClick={() => setOngletId(o.id)}
                      className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm ${focus} ${o.id === onglet.id ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>{o.nom}</button>
                  ))}
                </div>
              );
              const optionAnimer = <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={animer} onChange={(e) => setAnimer(e.target.checked)} className="size-5 accent-teal-800" />Animer</label>;
              return large ? (
                <ApercusCoteACote key={cleRendu} libelle={p.nom} onAppareil={setAppareilVu} mode={modeZone} onMode={setModeZone} options={optionAnimer}
                  zonesOrdinateur={zonesOrdi} zonesMobile={zonesMobile} onZonesOrdinateur={setZonesOrdi} onZonesMobile={setZonesMobile} rendu={rendu} entete={ongletsJsx} />
              ) : (
                <>
                  {ongletsJsx}
                  <DoubleRendu key={`${cleRendu}|${etroit}`} libelle={p.nom} onAppareil={setAppareilVu} mobileDabord={etroit} largeurMobile={etroit ? 360 : 340}
                    zonesOrdinateur={zonesOrdi} zonesMobile={zonesMobile} onZonesOrdinateur={setZonesOrdi} onZonesMobile={setZonesMobile}
                    rendu={(app) => rendu(app, app === 'mobile' ? 640 : 560)} />
                </>
              );
            })()}
          </div>

          <div className="grid gap-3 md:sticky md:top-4">
            <div className="grid gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{p.nom}</h2>
                {noteSession ? <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">Notée {noteSession}★</span>
                  : deja ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Déjà notée {deja.derniere}★{deja.n > 1 ? ` (${deja.n} fois)` : ''}</span> : null}
              </div>
              <p className="text-sm text-neutral-700">{p.phrase}</p>
            </div>
            <ul aria-label="Composition" className="flex flex-wrap gap-1.5 text-xs text-neutral-700">
              <li className={puce}>Structure : {LIBELLES_STRUCTURES[p.univers]}</li>
              {g && <li className={`inline-flex items-center gap-1.5 ${puce}`}><span aria-hidden="true" className="size-3 rounded-full ring-1 ring-black/10" style={{ background: `linear-gradient(135deg, ${pa} 0 50%, ${pb} 50% 100%)` }} />Gamme : {g.nom} ({p.famille === 'vitaminee' ? 'vitaminée' : 'sobre'})</li>}
              <li className={puce}>Style : {LIBELLES_STYLES[p.style].nom}</li>
              <li className={puce}>Animation : {p.animation ? LIBELLES_ANIMATIONS[p.animation].split(' ').slice(0, 3).join(' ') : 'image fixe'}</li>
              <li className={puce}>Héros : {p.heros ? themeParId(p.heros)?.court : 'aucun'}</li>
              <li className={puce}>Sujet n° 1 : {sujets[0] ? themeParId(sujets[0])?.court : 'cabinet'}</li>
              {comp && (['accueil', 'entete-anim', 'transition', 'sections', 'portraits'] as const).map((s) => {
                const v = (comp.sections.variantes as Record<string, string>)[s];
                return v ? <li key={s} className={puce}>{NOMS_SECTIONS_VARIABLES[s] ?? s} : {LIBELLES_VARIANTES[s]?.[v] ?? v}{aValider.includes(`composant:${s}:${v}`) && <span className="ml-1 rounded bg-amber-100 px-1 font-semibold text-amber-900">à valider</span>}</li> : null;
              })}
              {comp && <li className={puce}>Polices : {pairePolices(comp.police)?.nom ?? comp.police}</li>}
              {comp && <li className={puce}>Photos : {libelleTraitementPhotos(comp.traitement)}</li>}
            </ul>
            {aValider.length > 0 && <p className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Contient {aValider.length} ingrédient{aValider.length > 1 ? 's' : ''} à valider (jamais proposé{aValider.length > 1 ? 's' : ''} aux praticiens avant validation)</p>}
            {p.nuances.length > 0 && <p className="text-xs text-neutral-500">{p.nuances.join(' · ')}</p>}

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Étiquettes <span className="hidden font-normal text-neutral-500 md:inline">(t puis 1 à 8)</span></legend>
              <div className={`flex flex-wrap gap-1.5 rounded-xl ${modeEtiquettes ? 'bg-amber-50 p-1.5 ring-2 ring-amber-300' : ''}`}>
                {ETIQUETTES_ATELIER.map((e, i) => {
                  const actif = etiquettes.includes(e.id);
                  return (
                    <button key={e.id} type="button" aria-pressed={actif} onClick={() => basculerEtiquette(e.id)}
                      className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${focus} ${actif ? (e.positive ? 'border-teal-700 bg-teal-700 text-white' : 'border-red-800 bg-red-800 text-white') : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                      {modeEtiquettes && <kbd className="rounded bg-black/10 px-1 text-xs">{i + 1}</kbd>}
                      {e.libelle}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Commentaire <span className="font-normal text-neutral-500">(facultatif)</span></span>
              <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={2} maxLength={2000}
                placeholder="Ex. le héros est coupé en mobile, la gamme manque de contraste…" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" />
            </label>

            <RenduMobile key={`rm-${p.id}|${sujets.join()}`} cle={`modele:${p.univers}`} empreinte={empreinteMobile(`modele:${p.univers}`)} libelle={p.nom}
              zones={zonesMobile.length ? { appareil: 'mobile', empreinte: empreinteMobile(`modele:${p.univers}`), largeur: 390, zones: zonesMobile } : null}
              onEnregistre={(v) => { if (v === 'a_revoir') setZonesMobile([]); }} />

            {/* Barre de notation : fixée en bas sur téléphone */}
            <div className="sticky bottom-0 z-10 -mx-4 grid gap-2 border-t border-black/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
              <div role="group" aria-label="Note de 1 à 5 (la suivante s’affiche aussitôt)" className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => void noter(n)} aria-label={`Noter ${n} sur 5`}
                    className={`grid min-h-14 place-items-center rounded-xl border text-lg font-bold ${focus} ${noteSession === n ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white hover:bg-teal-50'}`}>
                    <span>{n}<span aria-hidden="true" className="text-amber-500">★</span></span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => aller(-1)} disabled={index === 0} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 disabled:opacity-40 ${focus}`}>← Précédente</button>
                <span className="text-center text-xs text-neutral-500">{envois > 0 ? 'Enregistrement…' : Object.keys(session).length ? `${Object.keys(session).length} notée(s) cette session` : ''}</span>
                <button type="button" onClick={() => aller(1)} disabled={epuise && index >= liste.length - 1} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 disabled:opacity-40 ${focus}`}>Passer →</button>
              </div>
              <p role="status" className={`min-h-5 text-sm ${statut && !statut.ok ? 'text-red-800' : 'text-neutral-600'}`}>{statut?.message ?? ''}</p>
            </div>
            <p className="hidden text-xs text-neutral-500 md:block">Clavier : 1 à 5 noter · t étiquettes · ← → naviguer · z signaler une zone</p>
          </div>
        </section>
      )}
    </div>
  );
}
