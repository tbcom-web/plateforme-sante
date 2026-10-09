'use client';

// File des Arrivages (packages/core/src/arrivages.ts, contenus-revue.ts) : un élément à la fois, ACCEPTER (thèmes et hashtags
// pré-cochés modifiables, note rapide facultative) ou REFUSER ; touches A / R, flèches → / ←, glisser au doigt (droite = accepter) ;
// Z (ou Ctrl+Z) annule la dernière décision. Contenus des packs : texte rendu dans un cadre de téléphone, sources en marge,
// avertissements du contrôle, « À retravailler » avec commentaire (touche T). Lots de nouveautés : « Tout accepter / Tout refuser »
// (confirmation). Filtres par source et par type (Visuels · Icônes · Animations · Mises en page · Contenus).
// Séries de l'agent (sourcing-photos.ts, 0053) : planche, signature, aperçu appliqué ; « Accepter la série / la sélection » importe
// les photos une à une (progression), « Autre série », « Refuser » ; « Sourcer automatiquement » lance l'agent (un profil ou les trous).
import '@plateforme/core/dessins.css';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from 'react';
import { gamme as gammeParId, htmlContenu, SURFACES_CSS, variablesCharte, variablesGamme, type BlocContenu, type MarqueImportee, type ModeleManifeste, type SourcePhotoLibre, type Univers } from '@plateforme/core';
import { FILTRES_TYPES_ARRIVAGES, filtreTypeArrivage, gesteClavier, gesteGlisse, SOURCES_ARRIVAGES, TYPES_INGREDIENTS, type SourceArrivage, type TypeArrivage } from '@plateforme/core/arrivages';
import ApercuStudio from '@/components/ApercuStudio';
import { cleImage, RAISONS_REFUS, type EtatPolitique } from '@plateforme/core';
import { useExpositions } from '@/components/useExpositions';
import { SaisieHashtags } from '@/components/HashtagsVisuel';
import type { SoinCatalogue } from '@/lib/sites';
import { candidatsPhotos } from '../retours/actions-photos';
import { accepterArrivage, annulerArrivage, deciderLot, refuserArrivage, retravaillerContenu, type Annulation, type Arrivage } from './actions';
import { accepterPhotoDeSerie, annulerSerie, autreSerie, cloreSerie, sourcerSeries } from './actions-series';
import SerieArrivage from './SerieArrivage';
import { itemSerie, type SerieAffichee } from './series';
import { visuelsNouveautes } from './visuels';

export type ContenuAffiche = {
  titre: string; chapo: string | null; nature: string; blocs: BlocContenu[];
  sources: { id: string; organisme: string; titre: string; url: string; verifie: boolean }[];
  erreurs: string[]; avertissements: string[];
  /** Déjà revu, texte modifié depuis : de nouveau en arrivage */
  modifie: boolean;
};

export type VisuelArrivage =
  | { kind: 'svg'; svg: string; fond: string; picto: boolean }
  | { kind: 'image'; src: string }
  | { kind: 'gamme'; couleurs: string[] }
  | { kind: 'studio'; cle: string }
  | { kind: 'differe'; cle: string }
  | { kind: 'contenu'; contenu: ContenuAffiche }
  | { kind: 'serie'; serie: SerieAffichee }
  | { kind: 'aucun' };

export type ItemArrivage = {
  id: string;
  source: SourceArrivage;
  type: TypeArrivage;
  titre: string;
  detail: string | null;
  date: string | null;
  /** Lot de nouveautés (famille × date) */
  lot?: string;
  arrivage: Arrivage;
  visuel: VisuelArrivage;
  /** Thèmes et hashtags proposés (pré-cochés) */
  sujets: string[];
  hashtags: string[];
  credit?: string | null;
  pageUrl?: string | null;
};

type Progression = { profession: string; libelle: string; acceptes: number; total: number; aRetravailler: number; refuses: number; enAttente: number; publiable: boolean; statutPack: string; erreursControle: number };

type Props = {
  items: ItemArrivage[];
  lots: { id: string; titre: string; n: number }[];
  progressions: Progression[];
  /** Champs du cabinet d'exemple pour l'aperçu des textes ({ville}, {cabinet}…) */
  champs: Record<string, string>;
  sujets: { id: string; libelle: string }[];
  sourcesPhotos: Record<SourcePhotoLibre, boolean>;
  motsCles: Record<string, string[]>;
  frequencesHashtags: Record<string, number>;
  sourceInitiale: string | null;
  typeInitial: string | null;
  lotInitial: string | null;
  studio: { proposes: Univers[]; modeles: { id: string; manifeste: ModeleManifeste }[]; catalogue: SoinCatalogue[]; marquesImportees: MarqueImportee[]; themesActives: string[] };
  /** Profils de la profession pour « Sourcer automatiquement » ; migration 0053 absente */
  profilsSourcing: { id: string; court: string }[];
  migrationSeries: boolean;
  /** Politique d'évaluation unique (politique-evaluation.ts) : décisions et raisons de refus journalisées (règles apprises) */
  politique?: EtatPolitique;
};


type Geste = 'accepter' | 'refuser' | 'retravailler';
type AnnulationArrivage = Annulation | { kind: 'serie'; id: string; photos: string[] };
type Decision = { items: ItemArrivage[]; geste: Geste; annulation: AnnulationArrivage | undefined; titre: string };

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const dateCourte = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '');
const PARTICIPE: Record<Geste, string> = { accepter: 'acceptée', refuser: 'refusée', retravailler: 'à retravailler' };

export default function Arrivages({ items: initiaux, lots: lotsInitiaux, progressions, champs, sujets, sourcesPhotos, frequencesHashtags, sourceInitiale, typeInitial, lotInitial, studio, profilsSourcing, migrationSeries, politique }: Props) {
  const { montrer } = useExpositions('arrivages', politique);
  // Raisons du refus (facultatives) : deviennent des règles apprises (« Ce que j'ai compris de tes retours »)
  const [raisons, setRaisons] = useState<string[]>([]);
  const [items, setItems] = useState<ItemArrivage[]>(initiaux);
  const [faits, setFaits] = useState<Set<string>>(new Set());
  const [historique, setHistorique] = useState<Decision[]>([]);
  const [source, setSource] = useState<SourceArrivage | 'tout'>(SOURCES_ARRIVAGES.some((s) => s.id === sourceInitiale) ? (sourceInitiale as SourceArrivage) : 'tout');
  const [filtreType, setFiltreType] = useState<string>(FILTRES_TYPES_ARRIVAGES.some((t) => t.id === typeInitial) ? typeInitial! : 'tout');
  const [lot, setLot] = useState<string | null>(lotsInitiaux.some((l) => l.id === lotInitial) ? lotInitial : null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [theme, setTheme] = useState(sujets[0]?.id ?? 'general');
  const [chargement, setChargement] = useState(false);
  const [visuels, setVisuels] = useState<Record<string, VisuelArrivage>>({});
  const vues = useRef(new Set<string>());

  const restants = useMemo(() => items.filter((i) => !faits.has(i.id)), [items, faits]);
  const correspond = useCallback((i: ItemArrivage, o: { source?: boolean; type?: boolean; lot?: boolean } = {}) =>
    (o.source === false || source === 'tout' || i.source === source) && (o.type === false || filtreType === 'tout' || filtreTypeArrivage(i.type) === filtreType) && (o.lot === false || !lot || i.lot === lot), [source, filtreType, lot]);
  const file = useMemo(() => restants.filter((i) => correspond(i)), [restants, correspond]);
  const courant = file[0] ?? null;
  const lots = useMemo(() => lotsInitiaux.map((l) => ({ ...l, restants: restants.filter((i) => i.lot === l.id) })).filter((l) => l.restants.length), [lotsInitiaux, restants]);

  // Aperçus différés : l'élément affiché et les 5 suivants
  const visuelDe = (i: ItemArrivage): VisuelArrivage => (i.visuel.kind === 'differe' ? visuels[i.visuel.cle] ?? i.visuel : i.visuel);
  useEffect(() => {
    const manquants = file.slice(0, 6).filter((i) => i.visuel.kind === 'differe' && !visuels[(i.visuel as { cle: string }).cle]).map((i) => (i.visuel as { cle: string }).cle);
    if (!manquants.length) return;
    let actif = true;
    void visuelsNouveautes(manquants).then((v) => { if (actif) setVisuels((x) => ({ ...x, ...v })); }).catch(() => undefined);
    return () => { actif = false; };
  }, [file, visuels]);

  // Choix de l'élément affiché (remis aux valeurs proposées à chaque élément)
  const [choixSujets, setChoixSujets] = useState<string[]>([]);
  const [choixTags, setChoixTags] = useState<string[]>([]);
  const [note, setNote] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [retravail, setRetravail] = useState(false);
  const champCommentaire = useRef<HTMLTextAreaElement>(null);
  // Série de l'agent : sélection (toutes les photos retenues par défaut), hashtags en plus, progression de l'import
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [progression, setProgression] = useState<string | null>(null);
  useEffect(() => {
    setChoixSujets(courant?.sujets ?? []); setChoixTags(courant?.hashtags ?? []); setNote(null); setCommentaire(''); setRetravail(false); setRaisons([]);
    setSelection(new Set(courant?.visuel.kind === 'serie' ? courant.visuel.serie.photos.map((p) => p.cle) : []));
  }, [courant?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (retravail) champCommentaire.current?.focus(); }, [retravail]);

  const noter = (d: Decision, ok: boolean, texte: string) => {
    setMessage({ ok, texte: `${d.titre} : ${texte}` });
    if (!ok) return;
    setFaits((f) => { const n = new Set(f); for (const i of d.items) n.add(i.id); return n; });
    setHistorique((h) => [...h, d].slice(-30));
  };

  /** Série : chaque photo sélectionnée est gardée puis importée (une requête par photo, progression affichée), puis la série est close */
  const deciderSerie = useCallback(async (geste: 'accepter' | 'refuser' | 'remplacer') => {
    if (!courant || occupe || courant.visuel.kind !== 'serie') return;
    const serie = courant.visuel.serie;
    setOccupe(true);
    if (geste === 'refuser') {
      const r = await cloreSerie(serie.id, 'refusee').catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.' }));
      setOccupe(false);
      noter({ items: [courant], geste: 'refuser', annulation: r.ok ? { kind: 'serie', id: serie.id, photos: [] } : undefined, titre: serie.titre }, r.ok, r.message);
      return;
    }
    if (geste === 'remplacer') {
      setProgression('Recherche d’une autre série…');
      const r = await autreSerie(serie.id).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.', series: [] as SerieAffichee[] }));
      setProgression(null);
      setOccupe(false);
      if (r.series.length) setItems((l) => { const i = l.findIndex((x) => x.id === courant.id); const n = [...l]; n.splice(i + 1, 0, ...r.series.map(itemSerie)); return n; });
      noter({ items: [courant], geste: 'refuser', annulation: { kind: 'serie', id: serie.id, photos: [] }, titre: serie.titre }, true, r.message);
      return;
    }
    const cles = serie.photos.map((p) => p.cle).filter((c) => selection.has(c));
    if (!cles.length) { setOccupe(false); setMessage({ ok: false, texte: 'Sélectionnez au moins une photo de la série.' }); return; }
    const ok: string[] = [], ids: string[] = [], echecs: string[] = [];
    for (const [i, c] of cles.entries()) {
      setProgression(`Import ${i + 1}/${cles.length}…`);
      const r: { ok: boolean; message: string; id?: string } = await accepterPhotoDeSerie(serie.id, c, choixTags).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
      if (r.ok) ok.push(c); else echecs.push(r.message);
      if (r.id) ids.push(r.id);
    }
    setProgression(null);
    const fin = ok.length ? await cloreSerie(serie.id, 'acceptee', ok).catch(() => ({ ok: false, message: 'Connexion perdue.' })) : { ok: false, message: '' };
    setOccupe(false);
    const texte = `${ok.length}/${cles.length} photo${cles.length > 1 ? 's' : ''} importée${ok.length > 1 ? 's' : ''} (WebP, sans métadonnées), au vivier et au kit${echecs.length ? ` ; ${echecs.length} échec${echecs.length > 1 ? 's' : ''} : ${[...new Set(echecs)].join(' ')}` : ''}.`;
    noter({ items: [courant], geste: 'accepter', annulation: { kind: 'serie', id: serie.id, photos: ids }, titre: serie.titre }, ok.length > 0 && fin.ok, ok.length ? texte : `Aucune photo importée : ${[...new Set(echecs)].join(' ')}`);
  }, [courant, occupe, selection, choixTags]); // eslint-disable-line react-hooks/exhaustive-deps

  const decider = useCallback(async (geste: Geste) => {
    if (!courant || occupe) return;
    if (courant.arrivage.kind === 'serie') { if (geste !== 'retravailler') void deciderSerie(geste); return; }
    const contenu = courant.arrivage.kind === 'contenu';
    if (geste === 'retravailler') {
      if (!contenu) return;
      if (!retravail) { setRetravail(true); return; }
      if (commentaire.trim().length < 3) { setMessage({ ok: false, texte: 'Dites ce qu’il faut retravailler : le commentaire part à Claude.' }); champCommentaire.current?.focus(); return; }
    }
    if (geste === 'accepter' && courant.type === 'photo' && !choixSujets.length) { setMessage({ ok: false, texte: 'Cochez au moins un thème pour accepter une photo.' }); return; }
    setOccupe(true);
    const a = courant.arrivage;
    const r = await (geste === 'retravailler' && a.kind === 'contenu' ? retravaillerContenu(a, commentaire)
      : geste === 'accepter' ? accepterArrivage(a, { sujets: choixSujets, sujetsProposes: courant.sujets, hashtags: choixTags, hashtagsProposes: courant.hashtags, note })
        : refuserArrivage(a)).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.', annulation: undefined }));
    setOccupe(false);
    noter({ items: [courant], geste, annulation: r.annulation, titre: courant.titre }, r.ok, r.message);
    // Politique d'évaluation : décision et raisons dans la mémoire commune (nouveautés et photos : clé de l'élément)
    const cle = a.kind === 'nouveaute' ? a.cle : courant.visuel.kind === 'image' ? cleImage(courant.visuel.src) : null;
    if (r.ok && cle && geste !== 'retravailler') montrer([{ cle, resultat: geste === 'accepter' ? 'accepte' : 'refuse', note, etiquettes: geste === 'refuser' ? raisons : null, texte: commentaire.trim() || null }], { journaliser: true });
  }, [courant, occupe, choixSujets, choixTags, note, commentaire, retravail, deciderSerie, raisons, montrer]);

  const deciderLeLot = async (id: string, geste: 'accepter' | 'refuser') => {
    const l = lots.find((x) => x.id === id);
    if (!l || occupe) return;
    const nouveautes = l.restants.filter((i) => i.arrivage.kind === 'nouveaute');
    if (!window.confirm(`${geste === 'accepter' ? 'Accepter' : 'Refuser'} les ${nouveautes.length} éléments du lot « ${l.titre} » ?`)) return;
    setOccupe(true);
    const r = await deciderLot(nouveautes.map((i) => ({ cle: (i.arrivage as { cle: string }).cle, precedent: (i.arrivage as { precedent: string | null }).precedent })), geste)
      .catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.', annulation: undefined }));
    setOccupe(false);
    noter({ items: nouveautes, geste, annulation: r.annulation, titre: `Lot ${l.titre}` }, r.ok, r.message);
    if (r.ok && lot === id) setLot(null);
  };

  const annuler = useCallback(async () => {
    const d = historique[historique.length - 1];
    if (!d || occupe) return;
    setOccupe(true);
    const x = d.annulation;
    const r = x?.kind === 'serie' ? await annulerSerie(x.id, x.photos).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.' }))
      : x ? await annulerArrivage(x).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.' })) : { ok: true, message: 'Remis dans la file.' };
    setOccupe(false);
    setMessage({ ok: r.ok, texte: `${d.titre} : ${r.message}` });
    if (!r.ok) return;
    setHistorique((h) => h.slice(0, -1));
    // Une candidate acceptée est devenue une photo de la base : elle revient sous sa nouvelle forme (« à valider »)
    const remis = d.items.map((it): ItemArrivage => (it.arrivage.kind === 'candidate' && d.annulation?.kind === 'photo'
      ? { ...it, id: `p:${d.annulation.id}`, arrivage: { kind: 'photo', id: d.annulation.id }, detail: 'Hébergée chez nous' } : it));
    const ids = new Set([...d.items, ...remis].map((x) => x.id));
    setFaits((f) => { const n = new Set(f); for (const x of d.items) n.delete(x.id); return n; });
    setItems((l) => [...remis, ...l.filter((x) => !ids.has(x.id))]);
  }, [historique, occupe]);

  // Clavier : A / → accepter, R / ← refuser, T à retravailler (contenus), Z ou Ctrl+Z annuler (hors champs de saisie)
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.altKey || e.metaKey) return;
      if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) { e.preventDefault(); void annuler(); return; }
      if (e.ctrlKey) return;
      if ((e.key === 't' || e.key === 'T') && courant?.arrivage.kind === 'contenu') { e.preventDefault(); void decider('retravailler'); return; }
      const g = gesteClavier(e.key);
      if (g) { e.preventDefault(); void decider(g); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [decider, annuler, courant]);

  // Glisser au doigt
  const depart = useRef<{ x: number; y: number; id: number } | null>(null);
  const [dx, setDx] = useState(0);
  const bas = (e: PE<HTMLDivElement>) => { if (e.pointerType === 'mouse') return; depart.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const bouge = (e: PE<HTMLDivElement>) => { if (depart.current?.id === e.pointerId) setDx(e.clientX - depart.current.x); };
  const haut = (e: PE<HTMLDivElement>) => {
    const d = depart.current;
    depart.current = null;
    setDx(0);
    if (!d || d.id !== e.pointerId) return;
    const g = gesteGlisse(e.clientX - d.x, e.clientY - d.y);
    if (g) void decider(g);
  };

  const chercherPhotos = async () => {
    setChargement(true);
    const r = await candidatsPhotos(theme, [...vues.current]).catch(() => ({ ok: false, message: 'Connexion perdue.', candidats: [] }));
    setChargement(false);
    if (!r.ok) { setMessage({ ok: false, texte: r.message }); return; }
    const nouveaux: ItemArrivage[] = r.candidats.map((c) => {
      vues.current.add(`${c.source}:${c.idSource}`);
      return {
        id: `c:${c.source}:${c.idSource}`, source: 'photos-libres', type: 'photo', titre: `Photo ${c.source === 'pexels' ? 'Pexels' : 'Pixabay'} · ${sujets.find((s) => s.id === theme)?.libelle ?? theme}`,
        detail: `Recherche « ${c.requete} » · ${c.largeur} × ${c.hauteur} px · « Accepter » l’importe chez nous (WebP, sans métadonnées)`, date: null,
        arrivage: { kind: 'candidate', source: c.source, idSource: c.idSource, requete: c.requete }, visuel: { kind: 'image', src: c.apercu },
        sujets: [theme], hashtags: [], credit: c.auteur, pageUrl: c.pageUrl,
      };
    });
    setItems((l) => [...l, ...nouveaux.filter((n) => !l.some((x) => x.id === n.id))]);
    if (source !== 'tout' && source !== 'photos-libres') setSource('photos-libres');
    setMessage({ ok: true, texte: `${nouveaux.length} photo${nouveaux.length > 1 ? 's' : ''} à découvrir ajoutée${nouveaux.length > 1 ? 's' : ''} à la file.` });
  };

  // « Sourcer automatiquement » : un profil, ou les trous prioritaires (3 cibles au plus) ; séries ajoutées en tête de file
  const [profilSourcing, setProfilSourcing] = useState('');
  const [sourcing, setSourcing] = useState(false);
  const sourcer = async () => {
    if (sourcing) return;
    setSourcing(true);
    setMessage({ ok: true, texte: 'L’agent cherche, analyse les aperçus et compose des séries cohérentes (jusqu’à une ou deux minutes)…' });
    const r = await sourcerSeries({ profil: profilSourcing || null }).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.', series: [] as SerieAffichee[] }));
    setSourcing(false);
    if (r.series.length) {
      setItems((l) => [...r.series.map(itemSerie), ...l.filter((x) => !r.series.some((s) => x.id === `s:${s.id}`))]);
      setSource('series-photos');
      setFiltreType('tout');
      setLot(null);
    }
    setMessage({ ok: r.ok, texte: r.message });
  };

  const compte = (f: (i: ItemArrivage) => boolean) => restants.filter(f).length;
  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  const sourcesPretes = Object.values(sourcesPhotos).some(Boolean);
  const estContenu = courant?.arrivage.kind === 'contenu';
  const v = courant ? visuelDe(courant) : null;
  const libelleType = (t: TypeArrivage) => (t === 'contenu' ? 'Contenu' : TYPES_INGREDIENTS.find((x) => x.id === t)?.libelle);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" style={style}>
      <style>{SURFACES_CSS + '.ar-svg svg{width:100%;height:100%;display:block}' + CSS_CONTENU}</style>

      {progressions.map((p) => (
        <section key={p.profession} aria-label={p.libelle} className="grid gap-2 rounded-2xl border border-black/5 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{p.libelle}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.publiable ? 'bg-teal-100 text-teal-900' : 'bg-amber-100 text-amber-900'}`}>
              {p.publiable ? 'Publiable' : 'Pas encore publiable'}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.acceptes} aria-label="Contenus acceptés">
            <div className="h-full bg-teal-700" style={{ width: `${p.total ? (100 * p.acceptes) / p.total : 0}%` }} />
          </div>
          <p className="text-xs text-neutral-600">
            {p.enAttente} en attente · {p.aRetravailler} à retravailler · {p.refuses} refusé{p.refuses > 1 ? 's' : ''}
            {p.statutPack === 'en-preparation' ? ' · pack « en préparation » (relecture d’un professionnel attendue)' : ''}{p.erreursControle ? ` · ${p.erreursControle} erreur${p.erreursControle > 1 ? 's' : ''} du contrôle` : ''}.
            {' '}Le pack ne s’ouvre au parcours client que lorsque tous ses contenus obligatoires sont acceptés.
          </p>
        </section>
      ))}

      <div className="grid gap-2">
        <div role="group" aria-label="Source" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {([['tout', 'Toutes les sources'], ...SOURCES_ARRIVAGES.map((s) => [s.id, s.libelle])] as [SourceArrivage | 'tout', string][]).filter(([id]) => id === 'tout' || compte((i) => i.source === id) > 0 || id === source || id === 'photos-libres').map(([id, libelle]) => (
            <button key={id} type="button" aria-pressed={source === id} onClick={() => setSource(id)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ring-1 ${focus} ${source === id ? 'bg-teal-800 font-semibold text-white ring-teal-900' : 'bg-white ring-black/10 hover:bg-neutral-50'}`}>
              {libelle} <span className="tabular-nums opacity-80">{compte((i) => correspond(i, { source: false, type: false, lot: false }) && (id === 'tout' || i.source === id))}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {([['tout', 'Tous les types'], ...FILTRES_TYPES_ARRIVAGES.map((t) => [t.id, t.libelle])] as [string, string][]).map(([id, libelle]) => (
            <button key={id} type="button" aria-pressed={filtreType === id} onClick={() => setFiltreType(id)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ring-1 ${focus} ${filtreType === id ? 'bg-neutral-800 font-semibold text-white ring-neutral-900' : 'bg-white ring-black/10 hover:bg-neutral-50'}`}>
              {libelle} <span className="tabular-nums opacity-80">{compte((i) => correspond(i, { type: false, lot: false }) && (id === 'tout' || filtreTypeArrivage(i.type) === id))}</span>
            </button>
          ))}
        </div>
      </div>

      {lots.length > 0 && (source === 'tout' || source === 'nouveautes') && filtreType !== 'contenus' && (
        <details className="rounded-2xl border border-black/5 bg-white p-3" open={Boolean(lot)}>
          <summary className={`cursor-pointer rounded-lg px-1 py-1 font-semibold ${focus}`}>Par lot ({lots.length}){lot ? ` · lot affiché : ${lots.find((l) => l.id === lot)?.titre ?? ''}` : ''}</summary>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {[...lots].sort((x, y) => Number(y.id === lot) - Number(x.id === lot)).map((l) => (
              <li key={l.id} className={`grid gap-2 rounded-xl p-2.5 ring-1 ${lot === l.id ? 'bg-teal-50 ring-teal-300' : 'ring-black/10'}`}>
                <p className="text-sm font-semibold">{l.titre.replace(/ · \d+ · /, ` · ${l.restants.length} · `)}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setLot(lot === l.id ? null : l.id)} aria-pressed={lot === l.id} className={`min-h-10 rounded-lg px-3 text-sm ring-1 ring-black/15 hover:bg-neutral-50 ${focus}`}>{lot === l.id ? 'Tous les lots' : 'Trier ce lot'}</button>
                  <button type="button" disabled={occupe} onClick={() => void deciderLeLot(l.id, 'accepter')} className={`min-h-10 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>Tout accepter</button>
                  <button type="button" disabled={occupe} onClick={() => void deciderLeLot(l.id, 'refuser')} className={`min-h-10 rounded-lg px-3 text-sm font-semibold text-red-800 ring-1 ring-red-700 hover:bg-red-50 disabled:opacity-50 ${focus}`}>Tout refuser</button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {message && <p role="status" className={`rounded-lg px-3 py-2 text-sm ring-1 ${message.ok ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-amber-50 text-amber-950 ring-amber-200'}`}>{message.texte}</p>}

      {courant && v?.kind === 'serie' ? (
        <article aria-labelledby="ar-titre" className="grid gap-4 rounded-2xl border border-black/10 bg-white p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid min-w-0 content-start gap-3">
            <div>
              <p className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">{SOURCES_ARRIVAGES.find((s) => s.id === courant.source)?.libelle}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">Série {v.serie.rang + 1}</span>
                {courant.date && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Arrivé le {dateCourte(courant.date)}</span>}
              </p>
              <h2 id="ar-titre" className="mt-1.5 text-lg font-bold">{courant.titre}</h2>
            </div>
            <SerieArrivage serie={v.serie} selection={selection} onBasculer={(c) => setSelection((x) => { const n = new Set(x); if (n.has(c)) n.delete(c); else n.add(c); return n; })} />
          </div>
          <div className="grid content-start gap-3 xl:sticky xl:top-4">
            <div className="grid gap-1 text-sm">
              <p><span className="font-semibold">Profession :</span> {v.serie.vocabulaire.metier}</p>
              <p><span className="font-semibold">Thèmes :</span> {v.serie.themes.map((t) => t.libelle).join(', ')}</p>
              <p className="text-xs text-neutral-600">Hashtags posés sur chaque photo : {[...new Set(v.serie.photos.filter((p) => selection.has(p.cle)).flatMap((p) => p.hashtags))].map((h) => `#${h}`).join(' ')}</p>
            </div>
            <SaisieHashtags compact libelle="Hashtags en plus" valeurs={choixTags} connus={frequencesHashtags}
              onAjout={(l) => setChoixTags((x) => [...x, ...l.filter((h) => !x.includes(h))])} onRetrait={(h) => setChoixTags((x) => x.filter((y) => y !== h))} />
            {progression && <p role="status" className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-950 ring-1 ring-teal-200">{progression}</p>}
            <button type="button" disabled={occupe || !selection.size} onClick={() => void deciderSerie('accepter')}
              className={`min-h-14 rounded-xl bg-teal-800 px-3 text-base font-bold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
              {selection.size === v.serie.photos.length ? `Accepter la série (${selection.size})` : `Accepter la sélection (${selection.size}/${v.serie.photos.length})`} <span className="text-xs font-normal">(A)</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={occupe} onClick={() => void deciderSerie('remplacer')}
                className={`min-h-12 rounded-xl border-2 border-neutral-700 bg-white px-2 text-sm font-bold text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 ${focus}`}>Autre série</button>
              <button type="button" disabled={occupe} onClick={() => void deciderSerie('refuser')}
                className={`min-h-12 rounded-xl border-2 border-red-700 bg-white px-2 text-sm font-bold text-red-800 hover:bg-red-50 disabled:opacity-50 ${focus}`}>Refuser <span className="text-xs font-normal">(R)</span></button>
            </div>
            <p className="text-xs text-neutral-600">Accepter : chaque photo est gardée (licence et traçabilité), importée en WebP sans métadonnées, rattachée au vivier du thème et au kit du profil. Rien n’est importé avant ce clic.</p>
            <p className="text-sm text-neutral-600"><span className="tabular-nums font-semibold">{file.length}</span> en attente dans ce filtre</p>
          </div>
        </article>
      ) : courant && v ? (
        <article aria-labelledby="ar-titre" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3 sm:p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut} onPointerCancel={() => { depart.current = null; setDx(0); }}
            className="relative touch-pan-y select-none" style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined, transition: dx ? 'none' : 'transform .2s' }}>
            <Visuel item={courant} visuel={v} studio={studio} champs={champs} />
            {Math.abs(dx) > 40 && (
              <span className={`pointer-events-none absolute top-3 rounded-lg px-3 py-1 text-lg font-bold text-white ${dx > 0 ? 'left-3 bg-teal-700' : 'right-3 bg-red-700'}`}>{dx > 0 ? 'Accepter' : 'Refuser'}</span>
            )}
          </div>
          <div className="grid content-start gap-3">
            <div>
              <p className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">{SOURCES_ARRIVAGES.find((s) => s.id === courant.source)?.libelle}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">{libelleType(courant.type)}</span>
                {courant.date && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Arrivé le {dateCourte(courant.date)}</span>}
                {v.kind === 'contenu' && v.contenu.modifie && <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-900">Modifié depuis votre revue</span>}
              </p>
              <h2 id="ar-titre" className="mt-1.5 text-lg font-bold">{courant.titre}</h2>
              {courant.detail && <p className="text-sm text-neutral-600">{courant.detail}</p>}
              {(courant.credit || courant.pageUrl) && (
                <p className="text-xs text-neutral-500">{courant.credit ? `Auteur : ${courant.credit}` : ''}{courant.pageUrl && <> · <a href={courant.pageUrl} target="_blank" rel="noopener noreferrer" className="underline">page source</a></>}</p>
              )}
            </div>
            {v.kind === 'contenu' ? <MargeContenu c={v.contenu} /> : (
              <>
                <fieldset className="grid gap-1.5">
                  <legend className="text-sm font-semibold">Thèmes</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {sujets.map((s) => {
                      const actif = choixSujets.includes(s.id);
                      return (
                        <button key={s.id} type="button" aria-pressed={actif} onClick={() => setChoixSujets((l) => (actif ? l.filter((x) => x !== s.id) : [...l, s.id]))}
                          className={`min-h-10 rounded-full px-3 text-sm ring-1 ${focus} ${actif ? 'bg-teal-800 text-white ring-teal-900' : 'bg-white ring-black/15 hover:bg-neutral-50'}`}>{s.libelle}</button>
                      );
                    })}
                  </div>
                </fieldset>
                <SaisieHashtags compact valeurs={choixTags} connus={frequencesHashtags}
                  onAjout={(l) => setChoixTags((x) => [...x, ...l.filter((h) => !x.includes(h))])} onRetrait={(h) => setChoixTags((x) => x.filter((y) => y !== h))} />
                <fieldset className="grid gap-1.5">
                  <legend className="text-sm font-semibold">Note rapide <span className="font-normal text-neutral-500">(facultative)</span></legend>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" aria-pressed={note === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`} onClick={() => setNote(note === n ? null : n)}
                        className={`grid size-11 place-items-center rounded-lg text-xl ring-1 ${focus} ${note !== null && n <= note ? 'bg-amber-400 text-amber-950 ring-amber-500' : 'bg-white text-neutral-400 ring-black/15'}`}>★</button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            {estContenu && retravail && (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Ce qu’il faut retravailler <span className="font-normal text-neutral-500">(part à Claude avec l’export)</span></span>
                <textarea ref={champCommentaire} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} maxLength={4000}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void decider('retravailler'); } }}
                  className="rounded-lg border border-neutral-300 p-2" placeholder="Ex. « la deuxième section promet trop », « source à préciser »" />
              </label>
            )}
            {!estContenu && (
              <fieldset className="grid gap-1">
                <legend className="text-xs font-semibold text-neutral-700">Pourquoi refuser ? <span className="font-normal text-neutral-500">(facultatif, appris pour la suite)</span></legend>
                <div className="flex flex-wrap gap-1.5">
                  {RAISONS_REFUS.map((x) => (
                    <button key={x.id} type="button" aria-pressed={raisons.includes(x.id)} onClick={() => setRaisons((l) => (l.includes(x.id) ? l.filter((y) => y !== x.id) : [...l, x.id]))}
                      className={`min-h-9 rounded-full border px-3 text-xs ${raisons.includes(x.id) ? 'border-red-700 bg-red-50 font-semibold text-red-900' : 'border-neutral-300 bg-white text-neutral-800'} ${focus}`}>{x.libelle}</button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className={`grid gap-2 ${estContenu ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <button type="button" disabled={occupe} onClick={() => void decider('refuser')}
                className={`min-h-14 rounded-xl border-2 border-red-700 bg-white text-base font-bold text-red-800 hover:bg-red-50 disabled:opacity-50 ${focus}`}>← Refuser <span className="text-xs font-normal">(R)</span></button>
              {estContenu && (
                <button type="button" disabled={occupe} onClick={() => void decider('retravailler')}
                  className={`min-h-14 rounded-xl border-2 border-amber-600 bg-white px-1 text-sm font-bold text-amber-900 hover:bg-amber-50 disabled:opacity-50 ${focus}`}>{retravail ? 'Envoyer' : 'À retravailler'} <span className="text-xs font-normal">(T)</span></button>
              )}
              <button type="button" disabled={occupe} onClick={() => void decider('accepter')}
                className={`min-h-14 rounded-xl bg-teal-800 text-base font-bold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>Accepter → <span className="text-xs font-normal">(A)</span></button>
            </div>
            <p className="text-sm text-neutral-600"><span className="tabular-nums font-semibold">{file.length}</span> en attente dans ce filtre</p>
          </div>
        </article>
      ) : (
        <p className="rounded-2xl bg-white p-8 text-center text-neutral-700 ring-1 ring-black/5">
          {restants.length ? 'Rien en attente dans ce filtre.' : 'Tout est trié : aucun arrivage en attente.'}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void annuler()} disabled={!historique.length || occupe}
          className={`min-h-11 rounded-xl px-4 text-sm font-semibold ring-1 ring-black/15 hover:bg-neutral-50 disabled:opacity-40 ${focus}`}>
          Annuler la dernière décision{historique.length ? ` (${historique[historique.length - 1].items.length > 1 ? 'lot ' : ''}${PARTICIPE[historique[historique.length - 1].geste]})` : ''} <span className="font-normal text-neutral-500">(Z)</span>
        </button>
      </div>

      <section aria-labelledby="ar-agent" className="grid gap-2 rounded-2xl border border-black/5 bg-white p-4">
        <h2 id="ar-agent" className="font-semibold">Sélections de l’agent (séries de photos)</h2>
        <p className="max-w-3xl text-sm text-neutral-600">
          L’agent part des trous réels (profils, kits, thèmes peu couverts, modèles finalistes), lance plusieurs recherches Pexels et Pixabay,
          analyse les aperçus et propose 2 ou 3 séries de 6 à 12 photos cohérentes (lumière, température, couleurs). Rien n’est importé avant votre acceptation.
        </p>
        {migrationSeries ? <p className="text-sm text-amber-900">Migration 0053 à exécuter (supabase/migrations/0053_photos_series.sql).</p> : sourcesPretes ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">Pour</span>
              <select value={profilSourcing} onChange={(e) => setProfilSourcing(e.target.value)} className="h-11 rounded-lg border border-neutral-300 px-2">
                <option value="">Tous les trous prioritaires</option>
                {profilsSourcing.map((p) => <option key={p.id} value={p.id}>{p.court}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void sourcer()} disabled={sourcing}
              className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>{sourcing ? 'Sourcing en cours…' : 'Sourcer automatiquement'}</button>
          </div>
        ) : <p className="text-sm text-neutral-600">Clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY) pour sourcer des photos.</p>}
      </section>

      <section aria-labelledby="ar-decouvrir" className="grid gap-2 rounded-2xl border border-black/5 bg-white p-4">
        <h2 id="ar-decouvrir" className="font-semibold">Photos à découvrir (Pexels, Pixabay)</h2>
        {sourcesPretes ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">Thème recherché</span>
              <select value={theme} onChange={(e) => setTheme(e.target.value)} className="h-11 rounded-lg border border-neutral-300 px-2">
                {sujets.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void chercherPhotos()} disabled={chargement}
              className={`min-h-11 rounded-xl bg-neutral-800 px-4 text-sm font-semibold text-white hover:bg-neutral-900 disabled:opacity-50 ${focus}`}>{chargement ? 'Recherche…' : 'Chercher des photos'}</button>
          </div>
        ) : <p className="text-sm text-neutral-600">Clé API à configurer (PEXELS_API_KEY ou PIXABAY_API_KEY) pour chercher des photos.</p>}
      </section>
    </div>
  );
}

const CSS_CONTENU = `.ct-page{font-family:var(--police-texte,system-ui);color:#1f2937;line-height:1.55}
.ct-page h1{font-size:1.45rem;line-height:1.2;font-weight:700;margin:0 0 .5rem}
.ct-page h2{font-size:1.1rem;font-weight:700;margin:1.1rem 0 .35rem}
.ct-page h3,.ct-page h4{font-size:1rem;font-weight:700;margin:.9rem 0 .3rem}
.ct-page p{margin:.4rem 0}.ct-page ul{list-style:disc;padding-left:1.2rem;margin:.4rem 0}.ct-page ol{list-style:decimal;padding-left:1.3rem;margin:.4rem 0}
.ct-champ{background:#ecfeff;border-radius:3px;padding:0 2px}.ct-vide{background:#fef3c7;font-family:ui-monospace,monospace;font-size:.85em}
.ct-chapo{color:#4b5563;font-size:.95rem}.ct-condition{font-size:.75rem;color:#92400e;background:#fffbeb;border-radius:4px;padding:1px 6px;display:inline-block}
.ct-src{font-size:.7rem;color:#0f766e;vertical-align:super;margin-left:2px}`;

/** Aperçu d'un texte de pack dans un cadre de téléphone (390 px), champs du cabinet d'exemple surlignés */
function TexteContenu({ c, champs }: { c: ContenuAffiche; champs: Record<string, string> }) {
  const index = new Map(c.sources.map((s, i) => [s.id, i + 1]));
  const appel = (b: BlocContenu) => b.sources.map((s) => index.get(s)).filter(Boolean).map((n) => `<span class="ct-src">[${n}]</span>`).join('');
  const html = [
    `<h1>${htmlContenu(c.titre, champs).replace(/^<p>|<\/p>$/g, '')}</h1>`,
    c.chapo ? `<div class="ct-chapo">${htmlContenu(c.chapo, champs)}</div>` : '',
    ...c.blocs.map((b) => [
      b.titre ? `<h2>${htmlContenu(b.titre, champs).replace(/^<p>|<\/p>$/g, '')}${appel(b)}</h2>` : '',
      b.condition ? `<span class="ct-condition">Affiché seulement si : ${b.condition}</span>` : '',
      htmlContenu(b.corps, champs).replace(/<\/p>$/, `${b.titre ? '' : appel(b)}</p>`),
    ].join('')),
  ].join('');
  return (
    <div className="grid place-items-center rounded-xl bg-neutral-100 p-3">
      <div className="w-full max-w-[390px] overflow-hidden rounded-[28px] border-[6px] border-neutral-800 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-2 text-xs text-neutral-500"><span>{champs.cabinet}</span><span aria-hidden="true">☰</span></div>
        <div className="ct-page max-h-[640px] overflow-y-auto px-4 py-3 text-[15px]" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

/** Marge d'un contenu : sources réglementaires numérotées, erreurs et avertissements du contrôle des packs */
function MargeContenu({ c }: { c: ContenuAffiche }) {
  return (
    <div className="grid gap-3 text-sm">
      {(c.erreurs.length > 0 || c.avertissements.length > 0) && (
        <div className="grid gap-1.5">
          <h3 className="font-semibold">Contrôle du pack</h3>
          <ul className="grid gap-1">
            {c.erreurs.map((e) => <li key={e} className="rounded-lg bg-red-50 px-2 py-1 text-red-900 ring-1 ring-red-200">Erreur : {e}</li>)}
            {c.avertissements.map((e) => <li key={e} className="rounded-lg bg-amber-50 px-2 py-1 text-amber-950 ring-1 ring-amber-200">{e}</li>)}
          </ul>
        </div>
      )}
      <div className="grid gap-1.5">
        <h3 className="font-semibold">Sources ({c.sources.length})</h3>
        {c.sources.length ? (
          <ol className="grid gap-1.5">
            {c.sources.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-1">
                <span className="text-xs font-semibold text-teal-800">[{i + 1}]</span>
                <span className="min-w-0">
                  <span className="font-semibold">{s.organisme}</span> · <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-words underline">{s.titre}</a>
                  {!s.verifie && <span className="ml-1 rounded bg-amber-100 px-1 text-xs text-amber-900">à revérifier</span>}
                </span>
              </li>
            ))}
          </ol>
        ) : <p className="text-neutral-600">Aucune source citée (texte sans affirmation réglementaire).</p>}
      </div>
    </div>
  );
}

function Visuel({ item, visuel: v, studio, champs }: { item: ItemArrivage; visuel: VisuelArrivage; studio: Props['studio']; champs: Record<string, string> }) {
  const cadre = 'grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl ring-1 ring-black/10';
  if (v.kind === 'contenu') return <TexteContenu c={v.contenu} champs={champs} />;
  if (v.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={v.src} alt={item.titre} draggable={false} className="aspect-[4/3] w-full rounded-xl bg-neutral-100 object-contain" />;
  }
  if (v.kind === 'svg') {
    return (
      <div className={`${cadre} ${v.fond === 'grille' ? 'surface-grille' : v.fond === 'plan' ? 'surface-plan' : ''}`} style={{ background: v.fond === 'doux' ? 'var(--doux)' : v.fond === 'grille' || v.fond === 'plan' ? undefined : 'var(--fond)', color: 'var(--encre)' }}>
        <div className={`ar-svg ${v.picto ? 'size-40' : 'h-[88%] w-[88%]'}`} dangerouslySetInnerHTML={{ __html: v.svg }} />
      </div>
    );
  }
  if (v.kind === 'gamme') return <div className={`${cadre} grid-cols-6 gap-0`}>{v.couleurs.map((c, i) => <span key={i} className="h-full w-full" style={{ background: c }} />)}</div>;
  if (v.kind === 'studio') return <div className="overflow-hidden rounded-xl ring-1 ring-black/10"><ApercuStudio cle={v.cle} {...studio} /></div>;
  if (v.kind === 'differe') return <div className={`${cadre} animate-pulse bg-neutral-100 text-sm text-neutral-500`}>Chargement de l’aperçu…</div>;
  return <div className={`${cadre} bg-neutral-50 text-sm text-neutral-500`}>Sans aperçu</div>;
}
