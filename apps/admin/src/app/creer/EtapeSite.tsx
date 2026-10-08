'use client';

// Étapes 2 et 3 du parcours guidé (/creer) :
// - « Vos couleurs » : jusqu'à 3 couleurs aimées, dans l'ordre (pastilles nommées simplement ; aucune = « laissez-nous
//   proposer ») ;
// - « Votre site » : des sites tout prêts tirés des sujets et des couleurs (propositions.ts du core) en grandes cartes
//   d'aperçu VIVANTES (même rendu que « Voir le rendu », réduit), côte à côte sur ordinateur, en carrousel sur téléphone ;
//   « Voir d'autres propositions » en ajoute par lots de 3 (la liste s'allonge, les aperçus ne se calculent qu'une fois
//   visibles) ; « Ajuster » (après le choix) : style d'illustration, couleurs, structure.
// Le plein écran reste derrière « Voir le rendu » (porte de l'e-mail pour l'essai) : la carte réduite suffit avant.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  appliquerRecette,
  appliquerReglages,
  basculerCouleur,
  propositionDeRecette,
  recettesPourScenario,
  type PropositionRecette,
  type Recette,
  COULEURS_PREFEREES,
  COULEURS_PREFEREES_MAX,
  couleurPreferee,
  gammesDesCouleurs,
  gamme as gammeParId,
  illustrationTheme,
  LIBELLES_ANIMATIONS,
  LIBELLES_STRUCTURES,
  LIBELLES_STYLES,
  lotsPropositions,
  modeleIntegre,
  pastilleGamme,
  STRUCTURES,
  STYLES_ILLUSTRATION,
  styleDuTheme,
  stylesCompatibles,
  themeIllustre,
  themeParId,
  packVisuel,
  type JeuPhotos,
  type MarqueImportee,
  type ModeleManifeste,
  type PoidsAtelier,
  type Proposition,
  type SiteDraft,
  type StyleIllustration,
  type Structure,
  type Univers,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import { apercuProposition } from '@/lib/apercu-proposition';
import type { SoinCatalogue } from '@/lib/sites';
import { EtapeCouleurs } from './Etapes';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const carte = 'grid gap-4 rounded-2xl border border-black/10 bg-white p-4 sm:p-5';

// ---------------------------------------------------------------------------------------------------------------
// Étape 2 : vos couleurs
// ---------------------------------------------------------------------------------------------------------------

export function EtapeCouleursPreferees({ valeur, onChange }: { valeur: string[] | undefined; onChange: (v: string[]) => void }) {
  const choisies = valeur ?? [];
  const plein = choisies.length >= COULEURS_PREFEREES_MAX;
  return (
    <div className="grid max-w-3xl gap-4">
      <fieldset className={carte}>
        <legend className="sr-only">Couleurs que vous aimez</legend>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-lg font-semibold">Couleurs que vous aimez</p>
          <p className="text-sm text-neutral-600" aria-live="polite">{choisies.length} sur {COULEURS_PREFEREES_MAX}</p>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {COULEURS_PREFEREES.map((c) => {
            const rang = choisies.indexOf(c.id);
            const actif = rang >= 0;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={actif}
                  disabled={!actif && plein}
                  onClick={() => onChange(basculerCouleur(choisies, c.id))}
                  aria-label={`${c.nom}${actif ? `, choix n° ${rang + 1}` : ''}`}
                  className={`grid w-full justify-items-center gap-1.5 rounded-xl border p-2.5 text-sm ${focus} disabled:opacity-40 ${actif ? 'border-teal-700 bg-teal-50 font-semibold ring-1 ring-teal-700' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}
                >
                  <span aria-hidden="true" className="relative grid size-11 place-items-center rounded-full ring-1 ring-black/10" style={{ background: c.hex }}>
                    {actif && <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold text-neutral-900 shadow">{rang + 1}</span>}
                  </span>
                  {c.nom}
                </button>
              </li>
            );
          })}
        </ul>
        {choisies.length > 0 && (
          <p className="text-sm text-neutral-700">
            Vos couleurs, dans l’ordre : <strong>{choisies.map((id) => couleurPreferee(id)?.nom).join(', ')}</strong>.{' '}
            <button type="button" onClick={() => onChange([])} className={`min-h-11 rounded px-1 font-semibold text-teal-800 underline ${focus}`}>Tout retirer</button>
          </p>
        )}
      </fieldset>
      <button
        type="button"
        aria-pressed={valeur !== undefined && choisies.length === 0}
        onClick={() => onChange([])}
        className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-4 text-left text-sm ${focus} ${valeur !== undefined && choisies.length === 0 ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-200 bg-white'}`}
      >
        <span><span className="font-semibold">Laissez-nous proposer</span><span className="block text-neutral-600">Des couleurs adaptées à vos sujets, lisibles et vérifiées.</span></span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Étape 3 : votre site
// ---------------------------------------------------------------------------------------------------------------

/** Rendu paresseux : l'aperçu n'est calculé qu'à l'approche de l'écran (puis gardé) */
function Paresseux({ hauteur, children }: { hauteur: number; children: () => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || vu) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) setVu(true); }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [vu]);
  return <div ref={ref} style={{ height: hauteur }} className="relative overflow-hidden bg-neutral-100">{vu ? children() : <span className="sr-only">Aperçu en préparation</span>}</div>;
}

type PropsSite = {
  d: SiteDraft;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  jeuPhotos: JeuPhotos | null;
  slugs: string[];
  themesActives: string[];
  /** Poids appris des notes de l'atelier (/admin/atelier) : réordonnent les propositions, sans lever aucun garde-fou */
  poids?: PoidsAtelier | null;
  /** Recettes du studio bien notées : celles du sujet n° 1 passent en premier, puis le générateur */
  recettes?: Recette[];
  /** Clés dont l'adaptation mobile est à corriger (0034) : recettes concernées après les autres */
  defautsMobile?: string[];
  etroit: boolean;
  /** Proposition en cours d'application (serveur) */
  choixEnCours: string | null;
  onChoisir: (p: Proposition) => void;
  /** Réglage local (gamme, style) : brouillon modifié puis enregistré automatiquement */
  onMaj: (d: SiteDraft) => void;
  /** Changement de structure (serveur : préréglage du modèle), réglages actuels gardés */
  onStructure: (u: Structure) => void;
};

export function EtapeVotreSite({ d, proposes, modeles, catalogue, marquesImportees, jeuPhotos, slugs, themesActives, poids = null, recettes = [], defautsMobile = [], etroit, choixEnCours, onChoisir, onMaj, onStructure }: PropsSite) {
  const entree = useMemo(() => ({ priorites: d.priorites, couleursPreferees: d.couleursPreferees ?? [] }), [d.priorites, d.couleursPreferees]);
  const [nbLots, setNbLots] = useState(1);
  const lots = useMemo(() => lotsPropositions(entree, nbLots, { poids }), [entree, nbLots, poids]);
  const disponibles = new Set(proposes.map((u) => u.id));
  // Recettes du studio (bien notées) d'abord : celles d'un scénario identique ou proche de ce client (mêmes sujets ordonnés,
  // couleurs identiques ou voisines : simulateur.ts, proximiteScenarios), puis du sujet n° 1, puis génériques ; puis le générateur
  const duStudio = useMemo(() => recettesPourScenario(recettes, { principaux: d.priorites.principaux, secondaires: d.priorites.secondaires, couleurs: d.couleursPreferees ?? [], soins: d.soins }, 4, new Set(defautsMobile), { praticien: true }).slice(0, 6).map(propositionDeRecette), [recettes, d.priorites, d.couleursPreferees, d.soins, defautsMobile]);
  const liste: Proposition[] = [...duStudio, ...lots.flat()].filter((p) => disponibles.has(p.univers));
  const epuise = lots.length < nbLots;
  const manifeste = (id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);

  // Aperçu d'une proposition : structure appliquée localement (comme le serveur), réglages de la proposition, soins de base
  const apercu = (p: Proposition) => ('recette' in p
    ? appliquerRecette(d, (p as PropositionRecette).recette.composition, { id: (p as PropositionRecette).recette.id, proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives })
    : apercuProposition(d, p, { proposes, modeles, slugs, themesActives }))!;

  const hauteur = etroit ? 460 : 300;
  const actuelle = d.theme.proposition;
  const carrousel = useRef<HTMLUListElement>(null);
  const [annonce, setAnnonce] = useState('');
  const chargerPlus = () => {
    const avant = liste.length;
    setNbLots((n) => n + 1);
    setAnnonce('');
    // Carrousel (téléphone) : on glisse jusqu'à la première nouvelle carte
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = carrousel.current?.children[avant] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      setAnnonce('Trois nouvelles propositions ajoutées.');
    }));
  };

  return (
    <div className="grid min-w-0 gap-5">
      <p className="text-sm text-neutral-700">
        D’après {d.priorites.principaux.length ? <>vos sujets (<strong>{d.priorites.principaux.map((id) => themeParId(id)?.court).filter(Boolean).join(', ')}</strong>)</> : 'votre cabinet'}
        {d.couleursPreferees?.length ? <> et vos couleurs (<strong>{d.couleursPreferees.map((id) => couleurPreferee(id)?.nom).join(', ')}</strong>)</> : null}.
        {etroit && ' Glissez pour voir les autres.'}
      </p>
      <ul ref={carrousel} aria-label="Sites proposés" className="relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {liste.map((p, i) => {
          const choisie = actuelle === p.id;
          const g = gammeParId(p.gamme)!;
          const [a, b] = pastilleGamme(g);
          return (
            <li key={p.id} className={`relative grid w-[86vw] max-w-[420px] shrink-0 snap-start content-start gap-3 rounded-2xl border bg-white p-3 shadow-sm sm:p-4 lg:w-auto lg:max-w-none ${choisie ? 'border-teal-700 ring-2 ring-teal-700/25' : 'border-black/10'}`}>
              <div className="flex min-h-7 flex-wrap items-center gap-2">
                {i === 0 && <span className="rounded-full bg-teal-800 px-2.5 py-1 text-xs font-semibold text-white">Le plus proche de vos choix</span>}
                {choisie && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Votre choix</span>}
              </div>
              <div aria-hidden="true" className={`overflow-hidden ring-1 ring-black/10 ${etroit ? 'mx-auto w-[230px] rounded-[18px] ring-4 ring-neutral-800' : 'rounded-lg'}`}>
                <Paresseux hauteur={hauteur}>
                  {() => { const x = apercu(p); return <ApercuTheme vignette={hauteur} appareil={etroit ? 'mobile' : 'bureau'} draft={x.draft} modele={x.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={jeuPhotos} />; }}
                </Paresseux>
              </div>
              <div className="grid gap-1">
                <h2 className="text-xl font-bold">{p.nom}</h2>
                <p className="text-sm text-neutral-700">{p.phrase}</p>
              </div>
              <ul className="flex flex-wrap gap-1.5 text-xs text-neutral-700" aria-label="Composition">
                <li className="rounded-full bg-neutral-100 px-2.5 py-1">{LIBELLES_STRUCTURES[p.univers]}</li>
                <li className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1"><span aria-hidden="true" className="size-3 rounded-full ring-1 ring-black/10" style={{ background: `linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)` }} />{g.nom}</li>
                <li className="rounded-full bg-neutral-100 px-2.5 py-1">{LIBELLES_STYLES[p.style].nom}</li>
                {p.animation && <li className="rounded-full bg-neutral-100 px-2.5 py-1">Animation : {LIBELLES_ANIMATIONS[p.animation].split(' ').slice(0, 3).join(' ')}</li>}
              </ul>
              {p.nuances.length > 0 && <p className="text-xs text-neutral-500">{p.nuances.join(' · ')}</p>}
              <button
                type="button"
                onClick={() => onChoisir(p)}
                disabled={choixEnCours !== null}
                aria-label={`Choisir le site « ${p.nom} » (${g.nom}, ${LIBELLES_STYLES[p.style].nom})`}
                className={`min-h-12 rounded-xl px-5 text-base font-semibold disabled:opacity-60 ${focus} ${choisie || i === 0 ? 'bg-teal-800 text-white hover:bg-teal-900' : 'border border-teal-800 text-teal-900 hover:bg-teal-50'}`}
              >
                {choixEnCours === p.id ? 'Préparation du site…' : choisie ? 'Site choisi ✓' : 'Choisir ce site'}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {!epuise && (
          <button type="button" onClick={chargerPlus} className={`min-h-12 rounded-xl border border-teal-800 bg-white px-5 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>
            Voir d’autres propositions
          </button>
        )}
        <p role="status" className="text-sm text-neutral-600">{annonce || (epuise ? 'Toutes les combinaisons ont été proposées.' : `${liste.length} sites proposés`)}</p>
      </div>
      {d.theme.univers && <Ajuster d={d} modele={manifeste(d.theme.modele)} univers={proposes.find((u) => u.id === d.theme.univers)} entree={entree} onMaj={onMaj} onStructure={onStructure} enCours={choixEnCours !== null} />}
    </div>
  );
}

/** Vignette d'un style d'illustration : le héros du sujet n° 1 (ou de la pédicurie) dans ce registre, ou une photo */
function VignetteStyle({ style, sujet, gamme }: { style: StyleIllustration; sujet: string | null; gamme: string }) {
  const id = sujet && themeIllustre(sujet) ? sujet : 'pedicurie';
  if (style === 'photos') {
    const src = packVisuel(themeParId(id)?.specialite ?? 'generale').photos.accueil;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-full w-full object-cover" />;
  }
  return <span className="block h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: illustrationTheme(id, { format: 'paysage', registre: style, gamme, id: `vs-${id}-${style}` }) }} />;
}

/** « Ajuster » : style d'illustration (4 vignettes), couleurs, structure. La proposition choisie les a pré-réglés. */
function Ajuster({ d, modele, univers, entree, onMaj, onStructure, enCours }: {
  d: SiteDraft; modele: ModeleManifeste; univers?: Univers; entree: { priorites: SiteDraft['priorites']; couleursPreferees: string[] };
  onMaj: (d: SiteDraft) => void; onStructure: (u: Structure) => void; enCours: boolean;
}) {
  const style = styleDuTheme(d.theme);
  const compatibles = stylesCompatibles(d.theme.univers);
  const sujet = d.priorites.principaux[0] ?? null;
  return (
    <details className={carte}>
      <summary className={`min-h-11 cursor-pointer content-center rounded ${focus}`}>
        <span className="font-semibold">Ajuster</span>
        <span className="block text-sm text-neutral-600">Style d’illustration ({LIBELLES_STYLES[style].nom}), couleurs, structure</span>
      </summary>
      <div className="mt-3 grid gap-6">
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-semibold">Style d’illustration</legend>
          <div role="radiogroup" aria-label="Style d’illustration" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STYLES_ILLUSTRATION.map((s) => {
              const ok = compatibles.includes(s);
              const actif = style === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  disabled={!ok}
                  onClick={() => onMaj(appliquerReglages(d, { style: s }))}
                  className={`grid gap-1.5 overflow-hidden rounded-xl border p-1.5 text-left text-sm ${focus} disabled:cursor-not-allowed disabled:opacity-45 ${actif ? 'border-teal-700 bg-teal-50 ring-1 ring-teal-700' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}
                >
                  <span aria-hidden="true" className="block aspect-[16/9] overflow-hidden rounded-lg bg-neutral-50"><VignetteStyle style={s} sujet={sujet} gamme={d.theme.gamme || 'canard'} /></span>
                  <span className="px-1 font-semibold">{LIBELLES_STYLES[s].nom}</span>
                  <span className="px-1 pb-1 text-xs text-neutral-600">{ok ? LIBELLES_STYLES[s].description : 'Pas avec la structure « Technique et précis »'}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid gap-3">
          <p className="font-semibold">Couleurs</p>
          <EtapeCouleurs d={d} modele={modele} univers={univers} prioritaires={gammesDesCouleurs(entree)} onTheme={(theme) => onMaj({ ...d, theme })} />
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-semibold">Structure</legend>
          <div role="radiogroup" aria-label="Structure du site" className="grid gap-2 sm:grid-cols-2">
            {STRUCTURES.map((u) => (
              <button key={u} type="button" role="radio" aria-checked={d.theme.univers === u} disabled={enCours} onClick={() => d.theme.univers !== u && onStructure(u)}
                className={`min-h-12 rounded-xl border px-3 text-left text-sm font-semibold ${focus} disabled:opacity-60 ${d.theme.univers === u ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                {LIBELLES_STRUCTURES[u]}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500">La structure change la mise en page ; vos couleurs et votre style d’illustration sont gardés quand c’est possible.</p>
        </fieldset>
      </div>
    </details>
  );
}
