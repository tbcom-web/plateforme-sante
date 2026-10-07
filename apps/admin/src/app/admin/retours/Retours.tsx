'use client';

// Espace « Donner mon avis » (super admin). Accueil : grosses tuiles par type (Tout au hasard, Thèmes complets, Illustrations,
// Icônes, Photos, Animations, Couleurs, Structures) avec compteurs et progression, « ce que vos avis ont changé ».
// Boucle : une carte à la fois, tirée au hasard (jamais notés, puis modifiés depuis la dernière note, puis notes incertaines :
// prochaineCarte, packages/core/src/retours.ts), aperçu en contexte (icône à 24/48/96 px, illustration en clair et en sombre,
// photo dans un cadre de site, gamme sur un mini site), « Ce qui va bien » / « Ce qui ne va pas », commentaire, 1 à 5 étoiles.
// Clavier : 1-5 noter (et passer à la suivante), t étiquettes (puis 1-9), → ou Entrée passer, ← précédente, Échap accueil.
// Téléphone : barre d'étoiles fixée en bas de l'écran (toujours visible). Assets → assets_notes (0027) ; thèmes complets → atelier_notes (0026).
// 0028 : « Ce qui va bien (libre) » / « Ce qui ne va pas (libre) » distincts ; instantané du rendu noté ; élément modifié depuis la
// note → avant / après côte à côte (et tiré en premier) ; sujets du visuel (+ / ×) et filtre « noter les visuels du sujet … ».
// Animations (2026-10-07) : l'animation joue (LectureAnimation : Lecture / Pause / Rejouer, figée si mouvements réduits) ; ses
// ingrédients de base (animations-sources.ts) et leur statut sont listés ; tant qu'un ingrédient n'est pas validé, l'animation est
// « en attente », passe après tout le reste au tirage, et « Noter d'abord ses ingrédients » lance une session sur eux (avec statut).
import '@plateforme/core/dessins.css';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  animationDeCle, CATEGORIES_RETOURS, categorieDuType, empreinteSvg, etatAnimation, prochaineCarteAvecAttente, cleCombinaison, empreinteAsset, ETIQUETTES_ATELIER, instantaneAsset, SUJETS_VISUELS, sujetsDuVisuel, etatsNotes, etiquettesDuType, GAMMES, gamme as gammeParId,
  ingredientsProposition, inventaireAssets, LIBELLES_STATUTS_ILLUSTRATION, LIBELLES_TYPES_ASSET, lotsPropositions, palierAvis,
  serieAvis, SURFACES_CSS, variablesCharte, variablesGamme, variantesGamme,
  type Asset, type CategorieRetours, type ChangementGenerateur, type IngredientsAtelier, type MarqueImportee, type ModeleManifeste, type PhotoDeJeu,
  type PoidsAtelier, type Proposition, type StatutIllustration, type Univers,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import type { SourcePhotoLibre, SurchargesSujets } from '@plateforme/core';
import AvantApres from '@/components/AvantApres';
import IngredientsAnimation from '@/components/IngredientsAnimation';
import PredictionClaude, { empreintePourJuge, textePrediction, useAfficherAvant } from '@/components/PredictionClaude';
import { predictionPour, type PredictionJuge } from '@plateforme/core/juge';
import LectureAnimation from '@/components/LectureAnimation';
import SujetsVisuel from '@/components/SujetsVisuel';
import HashtagsVisuel, { FiltreHashtag } from '@/components/HashtagsVisuel';
import { correspondHashtag, type HashtagsAssets } from '@plateforme/core';
import type { Inspiration } from '@/lib/inspirations';
import EnvoyerRetours from '@/components/EnvoyerRetours';
import { apercuProposition } from '@/lib/apercu-proposition';
import type { ChangementClaude } from '@/lib/changements';
import type { SoinCatalogue } from '@/lib/sites';
import { auHasard, draftDemo, type Scenario } from '../atelier/Atelier';
import { ajouterNoteAtelier } from '../atelier/actions';
import { ajouterRevue } from '../illustrations/actions';
import { ajouterNoteAsset } from './actions';
import Inspirations from './Inspirations';
import PhotosADecouvrir from './PhotosADecouvrir';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type NoteLegere = { cle: string; note: number; empreinte: string | null; le: string };
type Props = {
  notesAssets: NoteLegere[];
  datesAtelier: string[];
  dejaNotees: Record<string, number>;
  statuts: Record<string, StatutIllustration>;
  photosJeux: PhotoDeJeu[];
  markdown: string;
  changements: { total: number; sujets: ChangementGenerateur[] };
  influents: { favorises: { cle: string; titre: string; score: number }[]; evites: { cle: string; titre: string; score: number }[] };
  changementsClaude: ChangementClaude[];
  migrationAssets: boolean;
  migrationAtelier: boolean;
  poids: PoidsAtelier | null;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
  typeInitial: string | null;
  cleInitiale: string | null;
  /** ?ingredients=animation:<nom> : session sur les ingrédients non validés de cette animation */
  ingredientsDe?: string | null;
  /** Inspirations (0028) : images de référence (URL signées), étiquettes, palette */
  inspirations: Inspiration[];
  migrationInspirations: boolean;
  /** Photos à découvrir (0028) : sources dont la clé est configurée (booléens), mots-clés effectifs par sujet */
  sourcesPhotos: Record<SourcePhotoLibre, boolean>;
  motsClesPhotos: Record<string, string[]>;
  migrationPhotos: boolean;
  /** Sujets ajoutés / retirés par Paul (0028) */
  surchargesSujets: SurchargesSujets;
  /** Hashtags des visuels (0029) : état courant ; migration manquante = non enregistrés */
  hashtagsAssets?: HashtagsAssets;
  migrationHashtags?: boolean;
  /** Juge du goût de Paul (retours/predictions.json) : prédictions par clé, et ligne de justesse calculée côté serveur */
  predictions?: Record<string, PredictionJuge[]>;
  ligneJuge?: string | null;
};

/** Espaces hors notation : inspirations et photos à découvrir */
type Espace = 'inspirations' | 'decouvrir';

type Carte =
  | { kind: 'asset'; asset: Asset; empreinte: string | null; svg: string | null }
  | { kind: 'theme'; scenario: Scenario; p: Proposition; ingredients: IngredientsAtelier; cle: string };

const cleCarte = (c: Carte) => (c.kind === 'asset' ? c.asset.cle : `theme:${c.cle}`);

/** Rendu et empreinte d'un asset (SVG et gammes ; les photos et modèles n'ont pas d'empreinte : fichiers suivis par leur adresse) */
function preparer(a: Asset): Extract<Carte, { kind: 'asset' }> {
  if (a.rendu.kind !== 'svg') return { kind: 'asset', asset: a, empreinte: empreinteAsset(a), svg: null };
  const svg = a.rendu.svg();
  return { kind: 'asset', asset: a, empreinte: empreinteAsset(a, svg), svg };
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

// ---------------------------------------------------------------------------------------------------------------
// Aperçus en contexte
// ---------------------------------------------------------------------------------------------------------------

function Svg({ html, className = '', style }: { html: string; className?: string; style?: CSSProperties }) {
  return <div className={`rt-svg ${className}`} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Panneau({ titre, children, className = '', style }: { titre: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <figure className="grid gap-1">
      <div className={`grid min-h-40 place-items-center overflow-hidden rounded-xl ring-1 ring-black/10 ${className}`} style={style}>{children}</div>
      <figcaption className="text-xs text-neutral-500">{titre}</figcaption>
    </figure>
  );
}

function MiniSite({ gamme, photo }: { gamme: string; photo?: string }) {
  const g = gammeParId(gamme) ?? GAMMES[0];
  const v = variantesGamme(g);
  return (
    <div className="w-full max-w-[340px] overflow-hidden rounded-2xl text-left shadow-sm ring-1 ring-black/10" style={{ background: g.fond, color: v.encre }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: g.accent, color: '#fff' }}>
        <span className="text-sm font-bold">Cabinet de podologie</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">Rendez-vous</span>
      </div>
      {photo ? (
        <div className="relative aspect-[16/10] w-full"><Image src={photo} alt="" fill sizes="340px" className="object-cover" /></div>
      ) : (
        <div className="grid gap-1 px-4 py-4" style={{ background: v.aplat }}>
          <span className="text-lg font-bold leading-tight">Vos pieds, entre de bonnes mains</span>
          <span className="text-xs opacity-80">Soins, semelles, bilans à Lyon 6e.</span>
        </div>
      )}
      <div className="grid gap-2 p-4">
        <p className="text-sm font-semibold" style={{ color: g.accentFonce }}>Bilan podologique</p>
        <p className="text-xs leading-relaxed text-neutral-700">Examen de la marche et des appuis, conseils de chaussage, semelles si besoin.</p>
        <div className="flex flex-wrap gap-1.5">
          {['Sport', 'Enfant', 'Diabète'].map((t, i) => (
            <span key={t} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={i % 2 ? { background: v.duo, color: v.duoTexte } : { background: g.fondDoux, color: g.accentFonce }}>{t}</span>
          ))}
        </div>
        <span className="mt-1 inline-flex min-h-9 w-fit items-center rounded-lg px-3 text-xs font-semibold" style={{ background: v.vif, color: v.vifTexte }}>Prendre rendez-vous</span>
      </div>
    </div>
  );
}

function ApercuAsset({ c }: { c: Extract<Carte, { kind: 'asset' }> }) {
  const a = c.asset;
  if (a.rendu.kind === 'gamme') {
    const g = gammeParId(a.rendu.gamme) ?? GAMMES[0];
    const v = variantesGamme(g);
    const pastilles: [string, string][] = [['Accent', g.accent], ['Foncé', g.accentFonce], ['Fond', g.fond], ['Doux', g.fondDoux], ['Plan', g.plan], ['Signal', g.signal], ['Vif', v.vif], ['Duo', v.duo]];
    return (
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="grid grid-cols-4 gap-2">
          {pastilles.map(([n, hex]) => (
            <div key={n} className="grid gap-1 text-center text-[11px] text-neutral-600">
              <span className="aspect-square rounded-xl ring-1 ring-black/10" style={{ background: hex }} />
              {n}
            </div>
          ))}
        </div>
        <div className="grid justify-items-center"><MiniSite gamme={g.id} /></div>
      </div>
    );
  }
  if (a.rendu.kind === 'image') {
    if (a.type === 'modele') {
      return (
        <div className="grid justify-items-center">
          <div className="relative w-[260px] max-w-full overflow-hidden rounded-[22px] ring-4 ring-neutral-800" style={{ aspectRatio: '600 / 1067' }}>
            <Image src={a.rendu.src} alt={`Aperçu de la structure ${a.titre}`} fill sizes="260px" className="object-cover object-top" />
          </div>
        </div>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-start">
        <Panneau titre="Photo seule">
          <div className="relative aspect-[3/2] w-full"><Image src={a.rendu.src} alt={a.titre} fill sizes="(max-width: 767px) 100vw, 640px" className="object-cover" /></div>
        </Panneau>
        <figure className="grid justify-items-center gap-1">
          <MiniSite gamme="canard" photo={a.rendu.src} />
          <figcaption className="text-xs text-neutral-500">Dans un cadre de site</figcaption>
        </figure>
      </div>
    );
  }
  const svg = c.svg ?? '';
  if (a.type === 'picto') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[{ t: 'Sur fond clair', s: { background: 'var(--fond)', color: 'var(--encre)' } }, { t: 'Sur bouton coloré', s: { background: 'var(--accent)', color: '#fff' } }].map(({ t, s }) => (
          <Panneau key={t} titre={`${t} · 24, 48 et 96 px`} style={s}>
            <div className="flex items-end gap-6 p-4">
              {[24, 48, 96].map((px) => <Svg key={px} html={svg} style={{ width: px, height: px }} />)}
            </div>
          </Panneau>
        ))}
      </div>
    );
  }
  const anim = a.type === 'animation' ? animationDeCle(a.cle) : null;
  if (anim) {
    // L'animation elle-même (comme sur le site), puis son image figée (mouvements réduits, aperçus)
    return (
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-start">
        <figure className="grid gap-1">
          <LectureAnimation key={anim} nom={anim} />
          <figcaption className="text-xs text-neutral-500">Animation, telle que les sites la jouent</figcaption>
        </figure>
        <Panneau titre="Image figée (mouvements réduits, aperçus)" className="surface-plan">
          <Svg html={svg} className="aspect-[4/3] w-[88%]" />
        </Panneau>
      </div>
    );
  }
  const fondClair = a.rendu.fond === 'grille' ? 'surface-grille' : '';
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panneau titre="Fond clair" className={fondClair} style={{ background: a.rendu.fond === 'doux' ? 'var(--doux)' : a.rendu.fond === 'grille' ? undefined : 'var(--fond)', color: 'var(--encre)' }}>
        <Svg html={svg} className="aspect-[4/3] w-[88%]" />
      </Panneau>
      <Panneau titre="Fond sombre (plan)" className="surface-plan">
        <Svg html={svg} className="aspect-[4/3] w-[88%]" />
      </Panneau>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------------------------------------------

export default function Retours(props: Props) {
  const { photosJeux, markdown, changements, influents, changementsClaude, migrationAssets, migrationAtelier, poids, proposes, modeles, catalogue, marquesImportees, themesActives } = props;
  const inventaireComplet = useMemo(() => inventaireAssets({ photosJeux }), [photosJeux]);
  // Sujets des visuels (défauts du code ± surcharges de Paul) et filtre « noter les visuels du sujet … »
  const [surcharges, setSurcharges] = useState<SurchargesSujets>(props.surchargesSujets);
  const [filtreSujet, setFiltreSujet] = useState('');
  // Hashtags (0029) : état courant et filtre « noter les visuels #… » (saisie partielle acceptée)
  const [hashtags, setHashtags] = useState<HashtagsAssets>(props.hashtagsAssets ?? {});
  const [filtreHashtag, setFiltreHashtag] = useState('');
  const inventaire = useMemo(
    () => inventaireComplet.filter((a) => (!filtreSujet || sujetsDuVisuel(a, surcharges).sujets.includes(filtreSujet)) && correspondHashtag(hashtags, a.cle, filtreHashtag, true)),
    [inventaireComplet, filtreSujet, surcharges, hashtags, filtreHashtag],
  );
  const [notes, setNotes] = useState<NoteLegere[]>(props.notesAssets);
  const [datesAtelier, setDatesAtelier] = useState<string[]>(props.datesAtelier);
  const [dejaNotees, setDejaNotees] = useState(props.dejaNotees);
  const etats = useMemo(() => etatsNotes(notes), [notes]);
  // Statuts de la bibliothèque (illustrations_statuts), mis à jour localement depuis une session « ingrédients »
  const [statuts, setStatuts] = useState<Record<string, StatutIllustration>>(props.statuts);
  // Session limitée à une liste de clés (ingrédients d'une animation en attente)
  const [selection, setSelection] = useState<{ titre: string; cles: string[] } | null>(() => {
    const a = props.ingredientsDe ? animationDeCle(props.ingredientsDe) : null;
    const e = a ? etatAnimation(a, props.statuts) : null;
    return e?.aValider.length ? { titre: `Ingrédients de « ${e.titre} »`, cles: e.aValider.map((i) => i.cle) } : null;
  });
  const etroit = useEtroit();
  const [espace, setEspace] = useState<Espace | null>(props.typeInitial === 'inspirations' || props.typeInitial === 'decouvrir' ? props.typeInitial : null);

  // ---- Compteurs ----
  const serie = useMemo(() => serieAvis([...notes.map((n) => n.le), ...datesAtelier]), [notes, datesAtelier]);
  const totalAvis = notes.length + datesAtelier.length;
  const palier = palierAvis(totalAvis);
  const parCategorie = useMemo(() => {
    const m = new Map<CategorieRetours, { total: number; notes: number }>();
    for (const a of inventaire) {
      const c = categorieDuType(a.type);
      const x = m.get(c) ?? { total: 0, notes: 0 };
      x.total++;
      if (etats.has(a.cle)) x.notes++;
      m.set(c, x);
    }
    return m;
  }, [inventaire, etats]);

  // ---- Boucle de notation ----
  const [categorie, setCategorie] = useState<CategorieRetours | null>(() => (selection ? 'hasard' : CATEGORIES_RETOURS.some((c) => c.id === props.typeInitial) ? props.typeInitial as CategorieRetours : props.cleInitiale ? 'hasard' : null));
  const [historique, setHistorique] = useState<Carte[]>([]);
  const [position, setPosition] = useState(-1);
  const vus = useRef(new Set<string>());
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [positif, setPositif] = useState('');
  const [negatif, setNegatif] = useState('');
  const [modeEtiquettes, setModeEtiquettes] = useState(false);
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [session, setSession] = useState(0);
  const [envois, setEnvois] = useState(0);
  const [gammeApercu, setGammeApercu] = useState('canard');
  // Prévision du juge : après la note de Paul seulement, sauf option « afficher avant » (désactivée par défaut)
  const [afficherAvant, setAfficherAvant] = useAfficherAvant();

  const base = useMemo(draftDemo, []);
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);
  const disponibles = useMemo(() => new Set(proposes.map((u) => u.id)), [proposes]);

  const tirerTheme = useCallback((): Carte | null => {
    let repli: Carte | null = null;
    for (let i = 0; i < 12; i++) {
      const scenario = auHasard();
      const e = { priorites: { principaux: scenario.principaux, secondaires: scenario.secondaires }, couleursPreferees: scenario.couleurs };
      const liste = lotsPropositions(e, 2, { poids }).flat().filter((p) => disponibles.has(p.univers));
      const cartes = liste.map((p) => { const ingredients = ingredientsProposition(p, e); return { kind: 'theme' as const, scenario, p, ingredients, cle: cleCombinaison(ingredients) }; });
      const libres = cartes.filter((c) => !dejaNotees[c.cle] && !vus.current.has(`theme:${c.cle}`));
      if (libres.length) return libres[Math.floor(Math.random() * libres.length)];
      repli ??= cartes[0] ?? null;
    }
    return repli;
  }, [poids, disponibles, dejaNotees]);

  const candidatsDe = useCallback((c: CategorieRetours) => {
    if (selection) return inventaireComplet.filter((a) => selection.cles.includes(a.cle));
    const cat = CATEGORIES_RETOURS.find((x) => x.id === c)!;
    return cat.types.length ? inventaire.filter((a) => cat.types.includes(a.type)) : inventaire;
  }, [inventaire, inventaireComplet, selection]);
  // Animation dont un ingrédient de base n'est pas validé : tirée après tout le reste
  const enAttente = useCallback((a: Asset) => { const x = a.type === 'animation' ? animationDeCle(a.cle) : null; return x ? etatAnimation(x, statuts).enAttente : false; }, [statuts]);

  // Empreintes calculées une fois par catégorie (rendu SVG), pour repérer les assets modifiés depuis leur dernière note
  const cacheEmpreintes = useRef(new Map<string, string | null>());
  const tirer = useCallback((c: CategorieRetours): Carte | null => {
    if (!selection && (c === 'themes' || (c === 'hasard' && !migrationAtelier && Math.random() < 0.2))) return tirerTheme();
    const liste = candidatsDe(c).map((a) => {
      if (!cacheEmpreintes.current.has(a.cle)) cacheEmpreintes.current.set(a.cle, empreinteAsset(a));
      return { cle: a.cle, empreinte: cacheEmpreintes.current.get(a.cle) ?? null, a };
    });
    const x = prochaineCarteAvecAttente(liste, etats, vus.current, (l) => enAttente(l.a));
    return x ? preparer(x.a) : null;
  }, [candidatsDe, etats, tirerTheme, migrationAtelier, selection, enAttente]);

  const reinitialiserSaisie = () => { setEtiquettes([]); setPositif(''); setNegatif(''); setModeEtiquettes(false); };

  const suivante = useCallback(() => {
    reinitialiserSaisie();
    if (position < historique.length - 1) { setPosition((p) => p + 1); return; }
    if (!categorie) return;
    const carte = tirer(categorie);
    if (!carte) return;
    vus.current.add(cleCarte(carte));
    setHistorique((h) => [...h, carte]);
    setPosition(historique.length);
  }, [position, historique.length, categorie, tirer]);

  const precedente = () => { reinitialiserSaisie(); setPosition((p) => Math.max(0, p - 1)); };

  // Retour à l'accueil : fin de la session « ingrédients »
  useEffect(() => { if (!categorie) setSelection(null); }, [categorie]);

  // Démarrage d'une catégorie (et carte demandée par ?cle=)
  const demarrer = (c: CategorieRetours, cles: { titre: string; cles: string[] } | null = null) => {
    cleDemandee.current = null;
    setSelection(cles);
    setCategorie(c);
    setHistorique([]);
    setPosition(-1);
    vus.current = new Set();
    reinitialiserSaisie();
    setStatut(null);
  };
  const cleDemandee = useRef(props.cleInitiale);
  useEffect(() => {
    if (!categorie || historique.length) return;
    // ?cle= (lien « Noter » de la bibliothèque) : cet élément d'abord, une seule fois (oublié au démarrage d'une autre catégorie ;
    // pas ici : en développement, React rejoue l'effet et la 2e passe tirait une autre carte)
    const demandee = cleDemandee.current ? inventaireComplet.find((a) => a.cle === cleDemandee.current) : undefined;
    const carte = demandee ? preparer(demandee) : tirer(categorie);
    if (!carte) return;
    vus.current.add(cleCarte(carte));
    setHistorique([carte]);
    setPosition(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorie, historique.length]);

  const carte = position >= 0 ? historique[position] ?? null : null;
  const etiquettesCarte = useMemo(() => {
    if (!carte) return [];
    const l = carte.kind === 'asset' ? etiquettesDuType(carte.asset.type) : ETIQUETTES_ATELIER;
    return [...l.filter((e) => e.positive), ...l.filter((e) => !e.positive)];
  }, [carte]);

  const noter = useCallback(async (n: number) => {
    if (!carte) return;
    const etq = etiquettes;
    const remarques = { positif, negatif };
    const le = new Date().toISOString();
    if (carte.kind === 'asset') {
      if (migrationAssets) { setStatut({ ok: false, message: 'Migration 0027 à exécuter : avis non enregistré.' }); return; }
      const locale: NoteLegere = { cle: carte.asset.cle, note: n, empreinte: carte.empreinte, le };
      setNotes((l) => [locale, ...l]);
      setSession((s) => s + 1);
      suivante();
      setEnvois((x) => x + 1);
      const r = await ajouterNoteAsset(carte.asset.cle, n, etq, '', carte.empreinte, { ...remarques, apercu: instantaneAsset(carte.asset, carte.svg) }).catch(() => ({ ok: false, message: 'Connexion perdue : avis non enregistré.' }));
      setEnvois((x) => x - 1);
      if (!r.ok) { setNotes((l) => l.filter((x) => x !== locale)); setSession((s) => s - 1); }
      const prevue = r.ok ? predictionPour(props.predictions?.[carte.asset.cle] ?? [], carte.asset.cle, empreintePourJuge(carte.empreinte, carte.asset.rendu.kind === 'image' ? carte.asset.rendu.src : null)) : null;
      setStatut(r.ok ? { ok: true, message: `${carte.asset.titre} : ${r.message}${prevue ? ` · ${textePrediction(prevue)}` : ''}` } : { ok: false, message: `${carte.asset.titre} : ${r.message}` });
    } else {
      if (migrationAtelier) { setStatut({ ok: false, message: 'Migration 0026 à exécuter : avis non enregistré.' }); return; }
      setDatesAtelier((l) => [le, ...l]);
      setDejaNotees((d) => ({ ...d, [carte.cle]: (d[carte.cle] ?? 0) + 1 }));
      setSession((s) => s + 1);
      suivante();
      setEnvois((x) => x + 1);
      const r = await ajouterNoteAtelier(carte.ingredients, n, etq, '', remarques).catch(() => ({ ok: false, message: 'Connexion perdue : avis non enregistré.' }));
      setEnvois((x) => x - 1);
      if (!r.ok) { setDatesAtelier((l) => l.filter((x) => x !== le)); setSession((s) => s - 1); }
      setStatut({ ok: r.ok, message: r.ok ? r.message : `${carte.p.nom} : ${r.message}` });
    }
  }, [carte, etiquettes, positif, negatif, migrationAssets, migrationAtelier, suivante, props.predictions]);

  const basculer = (id: string) => setEtiquettes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  // Raccourcis clavier (ignorés pendant la saisie)
  const touches = useRef<(e: KeyboardEvent) => void>(() => {});
  touches.current = (e: KeyboardEvent) => {
    if (!categorie) return;
    const cible = e.target as HTMLElement | null;
    const saisie = cible && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName));
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (saisie) { if (e.key === 'Escape') cible.blur(); return; }
    if (modeEtiquettes && /^[1-9]$/.test(e.key)) { const x = etiquettesCarte[Number(e.key) - 1]; if (x) { e.preventDefault(); basculer(x.id); } return; }
    if (/^[1-5]$/.test(e.key)) { e.preventDefault(); void noter(Number(e.key)); return; }
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); setModeEtiquettes((m) => !m); return; }
    if (e.key === 'Escape') { e.preventDefault(); if (modeEtiquettes) setModeEtiquettes(false); else setCategorie(null); return; }
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); suivante(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); precedente(); }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => touches.current(e);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const g = gammeParId(gammeApercu) ?? GAMMES[0];
  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(g) }) as CSSProperties, [g]);
  const [copie, setCopie] = useState<'' | 'ok' | 'manuel'>('');
  const copier = async () => { try { await navigator.clipboard.writeText(markdown); setCopie('ok'); } catch { setCopie('manuel'); } };

  const bandeau = (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-700" aria-live="polite">
      <span><strong className="tabular-nums">{serie.aujourdhui}</strong> avis aujourd’hui</span>
      <span>Série : <strong className="tabular-nums">{serie.serie}</strong> jour{serie.serie > 1 ? 's' : ''}</span>
      <span><strong className="tabular-nums">{totalAvis}</strong> avis en tout</span>
    </p>
  );

  // ======================= Inspirations / Photos à découvrir =======================
  if (espace === 'inspirations') return <Inspirations inspirations={props.inspirations} migrationManquante={props.migrationInspirations} onRetour={() => setEspace(null)} />;
  if (espace === 'decouvrir') return <PhotosADecouvrir sources={props.sourcesPhotos} motsCles={props.motsClesPhotos} migrationManquante={props.migrationPhotos} onRetour={() => setEspace(null)} />;

  // ======================= Accueil =======================
  if (!categorie || !carte) {
    const tuile = (c: (typeof CATEGORIES_RETOURS)[number]) => {
      const x = c.id === 'themes' ? null : c.id === 'hasard'
        ? [...parCategorie.values()].reduce((s, v) => ({ total: s.total + v.total, notes: s.notes + v.notes }), { total: 0, notes: 0 })
        : parCategorie.get(c.id) ?? { total: 0, notes: 0 };
      const pct = x && x.total ? Math.round((x.notes / x.total) * 100) : 0;
      const nbThemes = Object.keys(dejaNotees).length;
      return (
        <li key={c.id}>
          <button type="button" onClick={() => demarrer(c.id)}
            className={`grid h-full w-full content-start gap-2 rounded-2xl border p-4 text-left hover:border-teal-700 hover:bg-teal-50/40 ${focus} ${c.id === 'hasard' ? 'border-teal-800 bg-teal-800 text-white hover:bg-teal-900' : 'border-black/10 bg-white'}`}>
            <span className="text-lg font-bold">{c.libelle}</span>
            <span className={`text-sm ${c.id === 'hasard' ? 'text-teal-50' : 'text-neutral-600'}`}>{c.description}</span>
            {x ? (
              <>
                <span className={`text-sm font-semibold ${c.id === 'hasard' ? '' : 'text-neutral-800'}`}>{x.total - x.notes ? `${x.total - x.notes} jamais noté${x.total - x.notes > 1 ? 's' : ''}` : 'Tout est noté'}</span>
                <span className="grid gap-1">
                  <span aria-hidden="true" className={`h-1.5 overflow-hidden rounded-full ${c.id === 'hasard' ? 'bg-white/25' : 'bg-neutral-200'}`}>
                    <span className={`block h-full rounded-full ${c.id === 'hasard' ? 'bg-white' : 'bg-teal-700'}`} style={{ width: `${pct}%` }} />
                  </span>
                  <span className={`text-xs ${c.id === 'hasard' ? 'text-teal-50' : 'text-neutral-500'}`}>{pct} % notés ({x.notes} sur {x.total})</span>
                </span>
              </>
            ) : <span className="text-sm font-semibold text-neutral-800">{nbThemes} combinaison{nbThemes > 1 ? 's' : ''} déjà notée{nbThemes > 1 ? 's' : ''} · réserve inépuisable</span>}
          </button>
        </li>
      );
    };
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <section className="grid gap-3 rounded-2xl border border-black/10 bg-neutral-50 p-4">
          {bandeau}
          <p className="text-sm text-neutral-700">
            {palier.atteint
              ? <>Palier de <strong>{palier.atteint} avis</strong> atteint, merci. Le générateur a déjà changé <strong>{Math.round(changements.total)}</strong> proposition{Math.round(changements.total) > 1 ? 's' : ''} grâce à vos notes.</>
              : <>Encore <strong>{palier.reste}</strong> avis pour le premier palier ({palier.suivant}).</>}
            {palier.atteint && palier.suivant ? <> Prochain palier : {palier.suivant} (encore {palier.reste}).</> : null}
          </p>
        </section>

        <section aria-labelledby="rt-types" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="rt-types" className="text-lg font-semibold">Que voulez-vous noter ?</h2>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Visuels du sujet</span>
              <select value={filtreSujet} onChange={(e) => setFiltreSujet(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
                <option value="">Tous les sujets</option>
                {SUJETS_VISUELS.map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Hashtag</span>
              <FiltreHashtag valeur={filtreHashtag} onChange={setFiltreHashtag} etat={hashtags} className="min-h-11 w-40 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm" />
            </label>
          </div>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">{CATEGORIES_RETOURS.map(tuile)}</ul>
        </section>

        <section aria-labelledby="rt-sources" className="grid gap-3">
          <h2 id="rt-sources" className="text-lg font-semibold">Nourrir les visuels</h2>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <li>
              <button type="button" onClick={() => setEspace('inspirations')} className={`grid h-full w-full content-start gap-2 rounded-2xl border border-black/10 bg-white p-4 text-left hover:border-teal-700 hover:bg-teal-50/40 ${focus}`}>
                <span className="text-lg font-bold">Inspirations</span>
                <span className="text-sm text-neutral-600">Une image qui vous plaît : ce qui plaît, ce qu’on veut en tirer, sa palette. Référence seulement, jamais réutilisée.</span>
                <span className="text-sm font-semibold text-neutral-800">{props.inspirations.length} inspiration{props.inspirations.length > 1 ? 's' : ''}{props.migrationInspirations ? ' · migration 0028 à exécuter' : ''}</span>
              </button>
            </li>
            <li>
              <button type="button" onClick={() => setEspace('decouvrir')} className={`grid h-full w-full content-start gap-2 rounded-2xl border border-black/10 bg-white p-4 text-left hover:border-teal-700 hover:bg-teal-50/40 ${focus}`}>
                <span className="text-lg font-bold">Photos à découvrir</span>
                <span className="text-sm text-neutral-600">Photos libres de droits (Pexels, Pixabay), une à la fois : garder ou rejeter. Gardées, elles sont hébergées chez nous avec leur licence.</span>
                <span className="text-sm font-semibold text-neutral-800">{Object.values(props.sourcesPhotos).some(Boolean) ? `Sources prêtes : ${Object.entries(props.sourcesPhotos).filter(([, v]) => v).map(([k]) => (k === 'pexels' ? 'Pexels' : 'Pixabay')).join(', ')}` : 'Clé API à configurer'}</span>
              </button>
            </li>
          </ul>
        </section>

        <section aria-labelledby="rt-change" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-black/10 bg-white p-4">
          <h2 id="rt-change" className="text-lg font-semibold">Ce que vos avis ont changé</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
            <div className="grid min-w-0 content-start gap-1.5">
              <h3 className="text-sm font-semibold text-teal-900">Favorisés par le générateur</h3>
              {influents.favorises.length ? <ul className="grid gap-1 text-sm">{influents.favorises.map((x) => <li key={x.cle} className="truncate" title={x.cle}>{x.titre} <span className="text-xs text-neutral-500">+{x.score.toFixed(1).replace('.', ',')}</span></li>)}</ul>
                : <p className="text-xs text-neutral-500">Pas encore : notez quelques éléments.</p>}
            </div>
            <div className="grid min-w-0 content-start gap-1.5">
              <h3 className="text-sm font-semibold text-red-900">Évités (mal notés, à retravailler, retirés)</h3>
              {influents.evites.length ? <ul className="grid gap-1 text-sm">{influents.evites.map((x) => <li key={x.cle} className="truncate" title={x.cle}>{x.titre} <span className="text-xs text-neutral-500">{x.score.toFixed(1).replace('.', ',')}</span></li>)}</ul>
                : <p className="text-xs text-neutral-500">Aucun pour l’instant.</p>}
            </div>
            <div className="grid min-w-0 content-start gap-1.5">
              <h3 className="text-sm font-semibold">Propositions modifiées (sans couleur choisie)</h3>
              {changements.sujets.length ? (
                <ul className="grid gap-2 text-sm">
                  {changements.sujets.slice(0, 4).map((s) => (
                    <li key={s.sujet}><strong>{s.libelleSujet}</strong> : {s.ecartees.length} écartée{s.ecartees.length > 1 ? 's' : ''}, {s.remontees.length} remontée{s.remontees.length > 1 ? 's' : ''}
                      {s.remontees[0] && <span className="block truncate text-xs text-neutral-500" title={s.remontees[0]}>↑ {s.remontees[0]}</span>}
                      {s.ecartees[0] && <span className="block truncate text-xs text-neutral-500" title={s.ecartees[0]}>↓ {s.ecartees[0]}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-neutral-500">Les premières propositions sont encore celles d’origine.</p>}
            </div>
          </div>
          <div className="grid gap-1.5 border-t border-black/5 pt-3">
            <h3 className="text-sm font-semibold">Corrigé par Claude d’après vos retours</h3>
            {changementsClaude.length ? (
              <ul className="grid gap-1 text-sm">{changementsClaude.slice(0, 8).map((c, i) => <li key={i}><span className="tabular-nums text-neutral-500">{c.date.split('-').reverse().join('/')}</span> · {c.texte}</li>)}</ul>
            ) : <p className="text-xs text-neutral-500">Rien encore : envoyez vos retours, Claude les lira à la prochaine séance.</p>}
            {props.ligneJuge && <p className="text-xs text-neutral-600" title="Le juge prédit votre note avant que vous la donniez (même élément, même version). Objectif avant toute autonomie : 8 sur 10 à ±1.">{props.ligneJuge}</p>}
          </div>
        </section>

        <section className="flex flex-wrap items-start gap-3">
          <button type="button" onClick={copier} disabled={!totalAvis} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>Copier mes retours</button>
          <EnvoyerRetours compact />
          <a href="/admin/illustrations" className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-teal-900 underline-offset-4 hover:underline ${focus}`}>Bibliothèque complète et statuts →</a>
          <p role="status" className="basis-full text-sm text-neutral-600">{copie === 'ok' ? 'Retours copiés (Markdown) : collez-les à Claude.' : copie === 'manuel' ? 'Copie automatique impossible : sélectionnez le texte ci-dessous.' : ''}</p>
          {copie === 'manuel' && <textarea readOnly value={markdown} rows={10} className="w-full rounded-lg border border-neutral-300 p-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />}
        </section>
      </div>
    );
  }

  // ======================= Carte =======================
  const cat = CATEGORIES_RETOURS.find((c) => c.id === categorie)!;
  const prog = selection
    ? { total: selection.cles.length, notes: selection.cles.filter((k) => etats.has(k)).length }
    : categorie === 'themes' ? null : categorie === 'hasard'
    ? [...parCategorie.values()].reduce((s, v) => ({ total: s.total + v.total, notes: s.notes + v.notes }), { total: 0, notes: 0 })
    : parCategorie.get(categorie);
  const pct = prog && prog.total ? Math.round((prog.notes / prog.total) * 100) : 0;
  const titre = carte.kind === 'asset' ? carte.asset.titre : carte.p.nom;
  const etat = carte.kind === 'asset' ? etats.get(carte.asset.cle) : undefined;
  const st = carte.kind === 'asset' ? statuts[carte.asset.cle] : undefined;
  const apercuTheme = carte.kind === 'theme'
    ? apercuProposition({ ...base, priorites: { principaux: carte.scenario.principaux, secondaires: carte.scenario.secondaires }, couleursPreferees: carte.scenario.couleurs }, carte.p, { proposes, modeles, slugs, themesActives })
    : null;
  const animCarte = carte.kind === 'asset' && carte.asset.type === 'animation' ? animationDeCle(carte.asset.cle) : null;
  const etatAnim = animCarte ? etatAnimation(animCarte, statuts) : null;
  const noterIngredients = () => {
    if (!etatAnim) return;
    demarrer('hasard', { titre: `Ingrédients de « ${etatAnim.titre} »`, cles: etatAnim.aValider.map((i) => i.cle) });
  };
  // Session « ingrédients » : statut dans la bibliothèque (Validé / À retravailler / À revoir), comme dans /admin/illustrations
  const changerStatut = async (s: StatutIllustration) => {
    if (carte.kind !== 'asset') return;
    const cleA = carte.asset.cle;
    const commentaire = s === 'a_retravailler' ? negatif : s === 'valide' ? positif : '';
    const r = await ajouterRevue(cleA, s, commentaire, carte.svg ? empreinteSvg(carte.svg) : null).catch(() => ({ ok: false, message: 'Connexion perdue : statut non enregistré.' }));
    if (r.ok) setStatuts((m) => ({ ...m, [cleA]: s }));
    setStatut({ ok: r.ok, message: `${carte.asset.titre} : ${r.message}` });
  };
  const modifieDepuis = Boolean(carte.kind === 'asset' && etat && carte.empreinte && etat.empreinte && etat.empreinte !== carte.empreinte);
  // Juge : Paul a-t-il noté CETTE version (même empreinte ; photos : la clé suffit) ?
  const empreinteJuge = carte.kind === 'asset' ? empreintePourJuge(carte.empreinte, carte.asset.rendu.kind === 'image' ? carte.asset.rendu.src : null) : null;
  const noteeCetteVersion = carte.kind === 'asset' && notes.some((n) => n.cle === carte.asset.cle && (n.empreinte ?? null) === (carte.empreinte ?? null));
  const positives = etiquettesCarte.filter((e) => e.positive);
  const negatives = etiquettesCarte.filter((e) => !e.positive);
  const puce = (e: { id: string; libelle: string; positive: boolean }) => {
    const actif = etiquettes.includes(e.id);
    const i = etiquettesCarte.indexOf(e as never);
    return (
      <button key={e.id} type="button" aria-pressed={actif} onClick={() => basculer(e.id)}
        className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${focus} ${actif ? (e.positive ? 'border-teal-700 bg-teal-700 text-white' : 'border-red-800 bg-red-800 text-white') : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
        {modeEtiquettes && i < 9 && <kbd className="rounded bg-black/10 px-1 text-xs">{i + 1}</kbd>}
        {e.libelle}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-44 md:pb-0" style={style}>
      <style>{SURFACES_CSS + '.rt-svg svg{width:100%;height:100%;display:block}'}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setCategorie(null)} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>← Accueil</button>
        <div className="grid min-w-[200px] flex-1 gap-1 sm:max-w-sm">
          <p className="text-sm"><strong>{selection ? selection.titre : cat.libelle}</strong> · {session} avis cette session</p>
          {prog && (
            <>
              <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-neutral-200"><span className="block h-full rounded-full bg-teal-700" style={{ width: `${pct}%` }} /></span>
              <span className="text-xs text-neutral-500">{pct} % notés ({prog.notes} sur {prog.total})</span>
            </>
          )}
        </div>
        {carte.kind === 'asset' && carte.asset.rendu.kind === 'svg' && (
          <select value={gammeApercu} onChange={(e) => setGammeApercu(e.target.value)} className="min-h-11 rounded-lg bg-white px-3 text-sm ring-1 ring-black/10" aria-label="Gamme de couleurs de l’aperçu">
            {GAMMES.map((x) => <option key={x.id} value={x.id}>Gamme {x.nom}</option>)}
          </select>
        )}
      </div>

      <section aria-label="Élément à noter" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] md:items-start">
        <div className="grid min-w-0 gap-2">
          {carte.kind === 'asset' ? (
            modifieDepuis ? <AvantApres key={carte.asset.cle} cle={carte.asset.cle}><ApercuAsset c={carte} /></AvantApres> : <ApercuAsset c={carte} />
          ) : apercuTheme && (
            <div aria-hidden="true" className={`overflow-hidden bg-neutral-100 ring-1 ring-black/10 ${etroit ? 'mx-auto w-[280px] max-w-full rounded-[22px] ring-4 ring-neutral-800' : 'rounded-xl'}`}>
              <ApercuTheme key={carte.cle} vignette={etroit ? 480 : 520} appareil={etroit ? 'mobile' : 'bureau'} draft={apercuTheme.draft} modele={apercuTheme.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />
            </div>
          )}
        </div>

        <div className="grid gap-3 md:sticky md:top-4">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{carte.kind === 'asset' ? LIBELLES_TYPES_ASSET[carte.asset.type] : 'Thème complet'}</p>
            <h2 className="text-2xl font-bold">{titre}</h2>
            {carte.kind === 'asset' ? (
              <p className="text-sm text-neutral-600">{carte.asset.detail}</p>
            ) : <p className="text-sm text-neutral-700">{carte.p.phrase}</p>}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {carte.kind === 'asset' && !etat && <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-900">Jamais noté</span>}
              {modifieDepuis && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-950">Modifié depuis votre note : comparez avant / après</span>}
              {etat && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Déjà noté {etat.n} fois ({etat.min === etat.max ? `${etat.min}★` : `${etat.min} à ${etat.max}★`})</span>}
              {st && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">Statut : {LIBELLES_STATUTS_ILLUSTRATION[st]}</span>}
              {etatAnim?.enAttente && <span className="rounded-full bg-amber-200 px-2 py-0.5 font-semibold text-amber-950">En attente d’ingrédients validés</span>}
            </div>
            {carte.kind === 'asset' && <PredictionClaude predictions={props.predictions} cle={carte.asset.cle} empreinte={empreinteJuge} notee={noteeCetteVersion} afficherAvant={afficherAvant} />}
          </div>
          {etatAnim && <IngredientsAnimation etat={etatAnim} onNoterIngredients={noterIngredients} />}
          {selection && carte.kind === 'asset' && (
            <div className="grid gap-1.5 rounded-xl bg-neutral-50 p-3 ring-1 ring-black/10">
              <p className="text-sm font-medium">Statut dans la bibliothèque <span className="text-xs font-normal text-neutral-500">(une animation attend sa validation)</span></p>
              <div className="grid grid-cols-3 gap-1.5">
                {(['valide', 'a_retravailler', 'a_revoir'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => void changerStatut(s)} aria-pressed={statuts[carte.asset.cle] === s}
                    className={`min-h-11 rounded-lg px-2 text-xs font-semibold ring-1 ${focus} ${statuts[carte.asset.cle] === s ? (s === 'valide' ? 'bg-teal-700 text-white ring-teal-700' : s === 'a_retravailler' ? 'bg-rose-600 text-white ring-rose-600' : 'bg-amber-500 text-white ring-amber-500') : 'bg-white ring-black/15 hover:bg-neutral-100'}`}>
                    {LIBELLES_STATUTS_ILLUSTRATION[s]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-500">« Ce qui va bien » part avec « Validé », « Ce qui ne va pas » avec « À retravailler ».</p>
            </div>
          )}
          {carte.kind === 'asset' && <SujetsVisuel visuel={carte.asset} surcharges={surcharges} onChange={setSurcharges} />}
          {carte.kind === 'asset' && <HashtagsVisuel cle={carte.asset.cle} etat={hashtags} onChange={setHashtags} migrationManquante={props.migrationHashtags} />}

          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-sm font-medium text-teal-900">Ce qui va bien</legend>
            <div className={`flex flex-wrap gap-1.5 rounded-xl ${modeEtiquettes ? 'bg-amber-50 p-1.5 ring-2 ring-amber-300' : ''}`}>{positives.map(puce)}</div>
            <label className="mt-1 grid gap-1 text-sm">
              <span className="text-teal-900">Ce qui va bien (libre) <span className="text-neutral-500">facultatif</span></span>
              <textarea value={positif} onChange={(e) => setPositif(e.target.value)} rows={2} maxLength={2000}
                placeholder="Ex. le trait est net, la lumière est douce" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" />
            </label>
          </fieldset>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-sm font-medium text-red-900">Ce qui ne va pas</legend>
            <div className={`flex flex-wrap gap-1.5 rounded-xl ${modeEtiquettes ? 'bg-amber-50 p-1.5 ring-2 ring-amber-300' : ''}`}>{negatives.map(puce)}</div>
            <label className="mt-1 grid gap-1 text-sm">
              <span className="text-red-900">Ce qui ne va pas (libre) <span className="text-neutral-500">facultatif</span></span>
              <textarea value={negatif} onChange={(e) => setNegatif(e.target.value)} rows={2} maxLength={2000}
                placeholder="Ex. le gros orteil est trop long, la photo fait banque d’images" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" />
            </label>
          </fieldset>

          <div className="fixed inset-x-0 bottom-0 z-20 grid gap-2 border-t border-black/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <div role="group" aria-label="Note de 1 à 5 (l’élément suivant s’affiche aussitôt)" className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => void noter(n)} aria-label={`Noter ${n} sur 5`}
                  className={`grid min-h-14 place-items-center rounded-xl border border-neutral-300 bg-white text-lg font-bold hover:bg-teal-50 ${focus}`}>
                  <span>{n}<span aria-hidden="true" className="text-amber-500">★</span></span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={precedente} disabled={position <= 0} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 disabled:opacity-40 ${focus}`}>← Précédent</button>
              <span className="text-center text-xs text-neutral-500">{envois > 0 ? 'Enregistrement…' : `${serie.aujourdhui} avis aujourd’hui`}</span>
              <button type="button" onClick={suivante} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 ${focus}`}>Passer →</button>
            </div>
            <p role="status" className={`min-h-5 text-sm ${statut && !statut.ok ? 'text-red-800' : 'text-neutral-600'}`}>{statut?.message ?? ''}</p>
          </div>
          <p className="hidden text-xs text-neutral-500 md:block">Clavier : 1 à 5 noter · t étiquettes (puis 1 à 9) · → ou Entrée passer · ← précédent · Échap accueil</p>
          {carte.kind === 'asset' && <p className="text-xs text-neutral-500">Clé : <code className="break-all">{carte.asset.cle}</code> · Source : <code className="break-all">{carte.asset.source}</code></p>}
          {props.predictions && Object.keys(props.predictions).length > 0 && (
            <label className="flex min-h-11 items-center gap-2 text-xs text-neutral-500">
              <input type="checkbox" checked={afficherAvant} onChange={(e) => setAfficherAvant(e.target.checked)} className="h-4 w-4" />
              Afficher la prévision de Claude avant de noter
            </label>
          )}
        </div>
      </section>
    </div>
  );
}
