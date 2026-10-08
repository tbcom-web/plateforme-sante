'use client';

// Tri par sujet (/admin/retours/tri). Trois vues :
// - « Un par un » : la file (fileTri, couverture-sujets.ts) — sans sujet, seulement « général », peut compléter un sujet mal
//   couvert, jamais trié, déjà trié — un visuel à la fois en grand ; gros boutons des sujets (multi-sélection, touches 1 à 8) ;
//   suggestions (suggererClassement) pré-cochées en pointillé ; hashtags suggérés ; Entrée = « Suivant » (enregistre les
//   ajouts / retraits et les suggestions acceptées ou refusées), → passer, ← précédent.
//   Hashtags LIBRES (2026-10-08, « on doit pouvoir donner des hashtags, par exemple Laser ») : champ avec puces supprimables,
//   autocomplétion (hashtags déjà utilisés par fréquence, puis vocabulaire métier : soins du catalogue, dessins, sujets),
//   enregistrés aussitôt (assets_hashtags, 0029) ; « # » donne le focus au champ ; dans le champ, Entrée ajoute le hashtag,
//   Entrée sur champ vide ou Ctrl+Entrée = enregistrer et suivant.
// - « Sélection multiple » : grille, clic ou espace pour sélectionner, « Ajouter le sujet X à la sélection » (ou le retirer),
//   « Ajouter #… à la sélection » (ou les retirer).
// - Filtre par hashtag (file et grille ; saisie partielle : « las » trouve #laser).
// - « Couverture par sujet » : tableau (héros, illustrations par style, icônes, photos importées, animations validées) et
//   manques, chacun avec un lien vers le tri filtré.
// Lien « Propositions de Claude » (2026-10-08) : tags proposés par Claude, à valider (tri/claude).
// Les visuels confirmés sans changement sont retenus dans ce navigateur (localStorage) pour ne pas revenir en tête de file.
import '@plateforme/core/dessins.css';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  actionsTri, alertesCouverture, correspondHashtag, dansFamille, appliquerHashtag, DESSINS_PODOLOGIE, frequencesAvecVocabulaire, VISUELS_SOINS, couvertureParSujet, fileTri, gamme as gammeParId, hashtagsDe, inventaireAssets, LIBELLES_FAMILLES_TRI,
  LIBELLES_RAISONS_TRI, LIBELLES_TYPES_ASSET, STYLES_COUVERTURE, SUJETS_VISUELS, sujetsDuVisuel, SURFACES_CSS, variablesCharte, variablesGamme,
  FAMILLES_TRI, type FamilleTri, type HashtagsAssets, type PhotoDeJeu, type StatutIllustration, type SurchargesSujets,
} from '@plateforme/core';
import { suggererClassement, type DecisionClassement } from '@plateforme/core/classement-visuels';
import { appliquerAction } from '@/components/SujetsVisuel';
import Apercu from './ApercuVisuel';
import { FiltreHashtag, SaisieHashtags } from '@/components/HashtagsVisuel';
import { basculerHashtagAsset } from '../actions-hashtags';
import { enregistrerTri, hashtagsEnLot, sujetEnLot } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const libelle = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;
const CLE_VUS = 'tri-sujets:vus';
const PAGE_GRILLE = 48;

type Vue = 'un' | 'grille' | 'couverture';
type Props = {
  photosJeux: PhotoDeJeu[];
  surcharges: SurchargesSujets;
  hashtags: HashtagsAssets;
  migrationHashtags: boolean;
  statuts: Record<string, StatutIllustration>;
  sujetInitial: string;
  /** Filtre par hashtag (?hashtag=) */
  hashtagInitial?: string;
  familleInitiale: FamilleTri;
  vueInitiale: Vue;
};

function lireVus(): Set<string> {
  try { const l = JSON.parse(localStorage.getItem(CLE_VUS) ?? '[]'); return new Set(Array.isArray(l) ? l.filter((x) => typeof x === 'string') : []); } catch { return new Set(); }
}
function ecrireVus(s: Set<string>) { try { localStorage.setItem(CLE_VUS, JSON.stringify([...s].slice(-5000))); } catch { /* navigation privée */ } }

export default function Tri(props: Props) {
  const [surcharges, setSurcharges] = useState<SurchargesSujets>(props.surcharges);
  const [hashtags, setHashtags] = useState<HashtagsAssets>(props.hashtags);
  const [vue, setVue] = useState<Vue>(props.vueInitiale);
  const [famille, setFamille] = useState<FamilleTri>(props.familleInitiale);
  const [sujetFiltre, setSujetFiltre] = useState(props.sujetInitial);
  const [filtreHashtag, setFiltreHashtag] = useState(props.hashtagInitial ?? '');
  // Hashtags lus par la file au moment où elle est figée (un hashtag ajouté en cours de session ne la réordonne pas)
  const refHashtags = useRef(hashtags);
  refHashtags.current = hashtags;
  // Autocomplétion : hashtags utilisés (fréquence), puis vocabulaire métier (soins du catalogue, dessins, sujets)
  const connusHashtags = useMemo(() => frequencesAvecVocabulaire(hashtags, [...Object.keys(VISUELS_SOINS), ...DESSINS_PODOLOGIE, ...SUJETS_VISUELS.map((x) => x.id)]), [hashtags]);
  const champHashtag = useRef<HTMLInputElement>(null);
  const [vus, setVus] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);
  useEffect(() => { setVus(lireVus()); }, []);

  // Props stabilisées : une action serveur (revalidatePath) renvoie de nouveaux objets identiques, qui ne doivent pas refiger la
  // file ni la ramener au début
  const clePhotos = JSON.stringify(props.photosJeux), cleStatuts = JSON.stringify(props.statuts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const photosJeux = useMemo(() => props.photosJeux, [clePhotos]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const statutsTri = useMemo(() => props.statuts, [cleStatuts]);
  const inventaire = useMemo(() => inventaireAssets({ photosJeux }).filter((a) => ['picto', 'dessin', 'ligne', 'materiel', 'animation', 'heros', 'biblio', 'photo'].includes(a.type)), [photosJeux]);
  const parCle = useMemo(() => new Map(inventaire.map((a) => [a.cle, a])), [inventaire]);
  const visuels = useMemo(() => inventaire.map((a) => ({ cle: a.cle, type: a.type, soins: a.soins, statut: statutsTri[a.cle] ?? null })), [inventaire, statutsTri]);
  const couverture = useMemo(() => couvertureParSujet(visuels, surcharges), [visuels, surcharges]);
  const alertes = useMemo(() => alertesCouverture(couverture), [couverture]);
  // Sujets mal couverts : pour la famille filtrée (ou, sans filtre, les manques importants seulement)
  const faibles = useMemo(() => new Set(alertes.filter((a) => (famille === 'tout' ? a.gravite === 'forte' : a.filtre.famille === famille)).map((a) => a.sujet)), [alertes, famille]);
  const sujetsParCleVoisins = useMemo(() => Object.fromEntries(visuels.map((v) => [v.cle, sujetsDuVisuel(v, surcharges).sujets])), [visuels, surcharges]);

  // Suggestions légères (file) : titre, détail et hashtags du visuel, sans co-occurrences
  const suggestionsLegeres = useCallback((cle: string) => {
    const a = parCle.get(cle);
    if (!a) return [];
    return suggererClassement({ titre: a.titre, description: a.detail ?? null, tags: hashtagsDe(hashtags, cle), max: { sujets: 3, hashtags: 0 } }).sujets.map((s) => s.id);
  }, [parCle, hashtags]);

  // File figée au début (et à chaque changement de filtre) : les actions ne la réordonnent pas en cours de session
  const [graineFile, setGraineFile] = useState(0);
  const file = useMemo(() => fileTri(filtreHashtag ? visuels.filter((v) => correspondHashtag(refHashtags.current, v.cle, filtreHashtag, true)) : visuels,
    { surcharges, famille, sujet: sujetFiltre || null, tries: vus, faibles, suggestions: (v) => suggestionsLegeres(v.cle) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visuels, famille, sujetFiltre, filtreHashtag, graineFile]);
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [file]);
  const entree = file[index] ?? null;
  const asset = entree ? parCle.get(entree.visuel.cle) ?? null : null;
  const effectifs = asset ? sujetsDuVisuel({ cle: asset.cle, type: asset.type, soins: asset.soins }, surcharges) : null;

  // Suggestions complètes du visuel courant (avec co-occurrences)
  const suggestions = useMemo(() => {
    if (!asset || !effectifs) return { sujets: [], hashtags: [] };
    return suggererClassement({
      titre: asset.titre, description: asset.detail ?? null, tags: hashtagsDe(hashtags, asset.cle),
      voisins: { hashtags, sujets: sujetsParCleVoisins }, deja: { sujets: [...effectifs.sujets, ...effectifs.retires], hashtags: hashtagsDe(hashtags, asset.cle) }, max: { sujets: 3, hashtags: 6 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.cle, hashtags]);

  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [suggeres, setSuggeres] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!effectifs) return;
    const sug = new Set(suggestions.sujets.map((s) => s.id));
    setSuggeres(sug);
    setCoches(new Set([...effectifs.sujets, ...sug]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.cle, suggestions]);

  const basculer = (s: string) => setCoches((c) => { const n = new Set(c); if (n.has(s)) n.delete(s); else n.add(s); return n; });

  const suivant = useCallback(async () => {
    if (!asset || !effectifs || enCours) return;
    const apres = SUJETS_VISUELS.map((s) => s.id).filter((s) => coches.has(s));
    const actions = actionsTri(effectifs.sujets, apres);
    const decisions: Partial<DecisionClassement>[] = suggestions.sujets.map((s) => ({ nature: 'sujet', valeur: s.id, decision: coches.has(s.id) ? 'acceptee' : 'refusee', raison: s.raison }));
    setEnCours(true);
    const avant = surcharges;
    let s = surcharges;
    for (const a of actions) s = appliquerAction(s, asset.cle, a.sujet, a.action);
    setSurcharges(s);
    const r = await enregistrerTri(asset.cle, actions, decisions).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setEnCours(false);
    if (!r.ok) { setSurcharges(avant); setMessage(r.message); return; }
    setMessage(`${asset.titre} : ${r.message}`);
    setVus((v) => { const n = new Set(v).add(asset.cle); ecrireVus(n); return n; });
    setIndex((i) => i + 1);
  }, [asset, effectifs, enCours, coches, suggestions, surcharges]);

  // Hashtags du visuel courant : enregistrés aussitôt (ajout ou retrait), annulés localement en cas d'échec
  const changerHashtags = async (tags: string[], action: 'ajout' | 'retrait') => {
    if (!asset || !tags.length) return;
    const cle = asset.cle;
    setHashtags((e) => tags.reduce((x, t) => appliquerHashtag(x, cle, t, action), e));
    const res = await Promise.all(tags.map((t) => basculerHashtagAsset(cle, t, action).catch(() => ({ ok: false, message: 'Connexion perdue.' }))));
    const echec = res.find((r) => !r.ok);
    if (echec) { setHashtags((e) => tags.reduce((x, t) => appliquerHashtag(x, cle, t, action === 'ajout' ? 'retrait' : 'ajout'), e)); setMessage(echec.message); }
  };

  // Clavier (vue « un par un ») : 1-8 sujets, Entrée suivant, → passer, ← précédent
  const refSuivant = useRef(suivant);
  refSuivant.current = suivant;
  useEffect(() => {
    if (vue !== 'un') return;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      // « # » (AltGr+3 sur un clavier français : Ctrl+Alt) : focus du champ des hashtags
      if (e.key === '#') { e.preventDefault(); champHashtag.current?.focus(); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void refSuivant.current(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= SUJETS_VISUELS.length) { e.preventDefault(); basculer(SUJETS_VISUELS[n - 1].id); return; }
      if (e.key === 'Enter') { e.preventDefault(); void refSuivant.current(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); setIndex((i) => Math.min(i + 1, file.length)); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [vue, file.length]);

  // ===== Grille (sélection multiple) =====
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [pageGrille, setPageGrille] = useState(1);
  const [sujetLot, setSujetLot] = useState(SUJETS_VISUELS[0].id);
  const [tagsLot, setTagsLot] = useState<string[]>([]);
  const lotHashtags = async (action: 'ajout' | 'retrait') => {
    const cles = [...selection].filter((cle) => parCle.has(cle));
    if (!cles.length || !tagsLot.length) return;
    setEnCours(true);
    const avant = hashtags;
    setHashtags((e) => cles.reduce((x, cle) => tagsLot.reduce((y, t) => appliquerHashtag(y, cle, t, action), x), e));
    const r = await hashtagsEnLot(cles, tagsLot, action).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setEnCours(false);
    if (!r.ok) setHashtags(avant); else setTagsLot([]);
    setMessage(r.message);
  };
  useEffect(() => { setPageGrille(1); setSelection(new Set()); }, [famille, sujetFiltre, filtreHashtag]);
  const lot = async (action: 'ajout' | 'retrait') => {
    const cles = [...selection].filter((cle) => { const a = parCle.get(cle); if (!a) return false; const e = sujetsDuVisuel({ cle, type: a.type, soins: a.soins }, surcharges).sujets; return action === 'ajout' ? !e.includes(sujetLot) : e.includes(sujetLot); });
    if (!cles.length) { setMessage(action === 'ajout' ? `Tous les visuels sélectionnés ont déjà le sujet ${libelle(sujetLot)}.` : `Aucun visuel sélectionné n’a le sujet ${libelle(sujetLot)}.`); return; }
    setEnCours(true);
    const avant = surcharges;
    let s = surcharges;
    for (const cle of cles) s = appliquerAction(s, cle, sujetLot, action);
    setSurcharges(s);
    const r = await sujetEnLot(cles, sujetLot, action).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setEnCours(false);
    if (!r.ok) setSurcharges(avant);
    setMessage(r.message);
  };

  const changerFiltre = (f: FamilleTri, s: string, v: Vue, h: string = filtreHashtag) => {
    setFamille(f); setSujetFiltre(s); setVue(v); setFiltreHashtag(h); setGraineFile((g) => g + 1);
    try {
      const u = new URL(window.location.href); u.searchParams.set('famille', f); if (s) u.searchParams.set('sujet', s); else u.searchParams.delete('sujet'); u.searchParams.set('vue', v);
      if (h) u.searchParams.set('hashtag', h); else u.searchParams.delete('hashtag');
      window.history.replaceState(null, '', u);
    } catch { /* sans effet */ }
  };

  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  const restants = file.filter((x) => x.raison !== 'deja-trie').length;
  const fortes = alertes.filter((a) => a.gravite === 'forte');

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-28 md:pb-0" style={style}>
      <style>{SURFACES_CSS + '.tr-svg svg{width:100%;height:100%;display:block}'}</style>

      <div className="flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label="Vues du tri" className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
          {([['un', 'Un par un'], ['grille', 'Sélection multiple'], ['couverture', 'Couverture par sujet']] as const).map(([id, nom]) => (
            <button key={id} type="button" role="tab" aria-selected={vue === id} onClick={() => changerFiltre(famille, sujetFiltre, id)}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${focus} ${vue === id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700 hover:bg-white/60'}`}>{nom}</button>
          ))}
        </div>
        <Link href="/admin/frigo/tri/claude" className={`flex min-h-11 items-center rounded-xl border border-dashed border-violet-600 bg-violet-50 px-3 text-sm font-semibold text-violet-950 ${focus}`}>Propositions de Claude</Link>
        {vue !== 'couverture' && (
          <>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Famille</span>
              <select value={famille} onChange={(e) => changerFiltre(e.target.value as FamilleTri, sujetFiltre, vue)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
                {FAMILLES_TRI.map((f) => <option key={f} value={f}>{LIBELLES_FAMILLES_TRI[f]}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Sujet</span>
              <select value={sujetFiltre} onChange={(e) => changerFiltre(famille, e.target.value, vue)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
                <option value="">Tous (non étiquetés d’abord)</option>
                {SUJETS_VISUELS.map((s) => <option key={s.id} value={s.id}>{s.libelle} (et ce qui pourrait l’être)</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Hashtag</span>
              <FiltreHashtag valeur={filtreHashtag} onChange={(h) => changerFiltre(famille, sujetFiltre, vue, h)} etat={hashtags}
                className="min-h-11 w-40 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm" />
            </label>
          </>
        )}
        <p className="text-sm text-neutral-600">{restants} à trier sur {file.length}{fortes.length ? ` · ${fortes.length} manque${fortes.length > 1 ? 's' : ''} important${fortes.length > 1 ? 's' : ''}` : ''}</p>
      </div>
      {props.migrationHashtags && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Migration 0029 à exécuter : les hashtags ne peuvent pas être enregistrés (les sujets, si).</p>}
      {message && <p role="status" className="text-sm text-neutral-700">{message}</p>}

      {vue === 'un' && (
        !asset || !entree || !effectifs ? (
          <section className="grid gap-3 rounded-2xl border border-black/10 bg-white p-6 text-center">
            <p className="text-lg font-semibold">Tout est trié pour ce filtre.</p>
            <p className="text-sm text-neutral-600">Changez de famille ou de sujet, ou regardez la couverture par sujet.</p>
            {index > 0 && <button type="button" onClick={() => setIndex(0)} className={`mx-auto min-h-11 rounded-xl border border-neutral-300 px-4 text-sm ${focus}`}>Revenir au début de la file</button>}
          </section>
        ) : (
          <section aria-label="Visuel à trier" className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start">
            <div className="grid gap-2">
              <Apercu key={asset.cle} a={asset} grand />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base font-semibold">{asset.titre}</p>
                <p className="text-xs text-neutral-500">{LIBELLES_TYPES_ASSET[asset.type]} · <code>{asset.cle}</code></p>
              </div>
              {asset.detail && <p className="text-sm text-neutral-600">{asset.detail}</p>}
            </div>
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-950">{LIBELLES_RAISONS_TRI[entree.raison]}</span>
                <span className="text-neutral-600">{index + 1} / {file.length}</span>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-semibold">Sujets de ce visuel</legend>
                <div className="grid grid-cols-2 gap-2">
                  {SUJETS_VISUELS.map((s, i) => {
                    const coche = coches.has(s.id);
                    const sug = suggeres.has(s.id) && !effectifs.sujets.includes(s.id);
                    const faible = alertes.some((x) => x.sujet === s.id && dansFamille(asset, x.filtre.famille));
                    return (
                      <button key={s.id} type="button" aria-pressed={coche} onClick={() => basculer(s.id)}
                        title={sug ? `Suggéré : ${suggestions.sujets.find((x) => x.id === s.id)?.raison ?? ''}` : undefined}
                        className={`flex min-h-14 items-center gap-2 rounded-xl px-3 text-left text-base font-semibold ${focus} ${coche
                          ? sug ? 'border-2 border-dashed border-teal-700 bg-teal-50 text-teal-950' : 'border-2 border-teal-700 bg-teal-700 text-white'
                          : 'border-2 border-neutral-200 bg-white text-neutral-800 hover:border-teal-600'}`}>
                        <kbd className={`grid size-7 shrink-0 place-items-center rounded-md text-sm ${coche && !sug ? 'bg-white/20' : 'bg-neutral-100 text-neutral-700'}`}>{i + 1}</kbd>
                        <span className="min-w-0 flex-1">{s.libelle}{sug && <span className="block text-xs font-normal">suggéré</span>}</span>
                        {faible && <span className="text-xs font-normal opacity-80" title="Sujet mal couvert">manque</span>}
                      </button>
                    );
                  })}
                </div>
                {effectifs.retires.length > 0 && <p className="text-xs text-neutral-500">Retiré par vous : {effectifs.retires.map(libelle).join(', ')}</p>}
              </fieldset>
              <SaisieHashtags key={asset.cle} libelle="Hashtags (libres : #laser, #enfant…)" valeurs={hashtagsDe(hashtags, asset.cle)} connus={connusHashtags} ouvrirVide
                suggestions={suggestions.hashtags.map((h) => h.tag)} champRef={champHashtag} desactive={props.migrationHashtags}
                onAjout={(h) => void changerHashtags(h, 'ajout')} onRetrait={(h) => void changerHashtags([h], 'retrait')}
                onEntreeVide={() => void refSuivant.current()} onCtrlEntree={() => void refSuivant.current()}
                aide="# : aller au champ · Entrée ou virgule : ajouter · Entrée champ vide ou Ctrl+Entrée : enregistrer et suivant" />
              <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
                <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className={`min-h-12 rounded-xl border border-neutral-300 px-3 text-sm disabled:opacity-40 ${focus}`} aria-label="Précédent">←</button>
                <button type="button" onClick={() => setIndex((i) => i + 1)} className={`min-h-12 rounded-xl border border-neutral-300 px-3 text-sm ${focus}`}>Passer →</button>
                <button type="button" onClick={() => void suivant()} disabled={enCours} className={`min-h-12 flex-1 rounded-xl bg-teal-800 px-4 text-base font-semibold text-white hover:bg-teal-900 disabled:opacity-60 ${focus}`}>Suivant <kbd className="ml-1 rounded bg-white/20 px-1.5 text-xs">Entrée</kbd></button>
              </div>
            </div>
          </section>
        )
      )}

      {vue === 'grille' && (
        <section aria-label="Sélection multiple" className="grid gap-3">
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-white/95 p-3 backdrop-blur">
            <span className="text-sm font-semibold">{selection.size} sélectionné{selection.size > 1 ? 's' : ''}</span>
            <select value={sujetLot} onChange={(e) => setSujetLot(e.target.value)} aria-label="Sujet à appliquer" className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
              {SUJETS_VISUELS.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
            </select>
            <button type="button" disabled={!selection.size || enCours} onClick={() => void lot('ajout')} className={`min-h-11 rounded-xl bg-teal-800 px-3 text-sm font-semibold text-white disabled:opacity-50 ${focus}`}>Ajouter le sujet {libelle(sujetLot)} à la sélection</button>
            <button type="button" disabled={!selection.size || enCours} onClick={() => void lot('retrait')} className={`min-h-11 rounded-xl border border-neutral-300 px-3 text-sm disabled:opacity-50 ${focus}`}>Le retirer</button>
            <button type="button" onClick={() => setSelection(new Set(file.slice(0, pageGrille * PAGE_GRILLE).map((x) => x.visuel.cle)))} className={`min-h-11 rounded-xl px-3 text-sm text-teal-900 underline ${focus}`}>Tout sélectionner</button>
            {selection.size > 0 && <button type="button" onClick={() => setSelection(new Set())} className={`min-h-11 rounded-xl px-3 text-sm text-neutral-700 underline ${focus}`}>Vider</button>}
            <div className="flex basis-full flex-wrap items-end gap-2 border-t border-black/5 pt-2">
              <div className="min-w-[220px] flex-1 sm:max-w-sm">
                <SaisieHashtags compact libelle="Hashtags à appliquer" valeurs={tagsLot} connus={connusHashtags} ouvrirVide desactive={props.migrationHashtags}
                  onAjout={(h) => setTagsLot((l) => [...l, ...h.filter((x) => !l.includes(x))])} onRetrait={(h) => setTagsLot((l) => l.filter((x) => x !== h))} />
              </div>
              <button type="button" disabled={!selection.size || !tagsLot.length || enCours} onClick={() => void lotHashtags('ajout')} className={`min-h-11 rounded-xl bg-sky-800 px-3 text-sm font-semibold text-white disabled:opacity-50 ${focus}`}>
                Ajouter {tagsLot.length ? tagsLot.map((t) => `#${t}`).join(' ') : 'les hashtags'} à la sélection
              </button>
              <button type="button" disabled={!selection.size || !tagsLot.length || enCours} onClick={() => void lotHashtags('retrait')} className={`min-h-11 rounded-xl border border-neutral-300 px-3 text-sm disabled:opacity-50 ${focus}`}>Les retirer</button>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {file.slice(0, pageGrille * PAGE_GRILLE).map(({ visuel, raison }) => {
              const a = parCle.get(visuel.cle)!;
              const choisi = selection.has(a.cle);
              const s = sujetsDuVisuel({ cle: a.cle, type: a.type, soins: a.soins }, surcharges).sujets;
              return (
                <li key={a.cle}>
                  <button type="button" aria-pressed={choisi} onClick={() => setSelection((x) => { const n = new Set(x); if (n.has(a.cle)) n.delete(a.cle); else n.add(a.cle); return n; })}
                    className={`grid w-full gap-1.5 rounded-2xl border-2 p-2 text-left ${focus} ${choisi ? 'border-teal-700 bg-teal-50' : 'border-transparent bg-white ring-1 ring-black/10 hover:ring-teal-600'}`}>
                    <Apercu a={a} />
                    <span className="truncate text-xs font-semibold" title={a.titre}>{choisi ? '✓ ' : ''}{a.titre}</span>
                    <span className="truncate text-[11px] text-neutral-600">{s.length ? s.map(libelle).join(', ') : LIBELLES_RAISONS_TRI[raison]}</span>
                    {hashtagsDe(hashtags, a.cle).length > 0 && <span className="truncate text-[11px] text-sky-900" title={hashtagsDe(hashtags, a.cle).map((h) => `#${h}`).join(' ')}>{hashtagsDe(hashtags, a.cle).map((h) => `#${h}`).join(' ')}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {file.length > pageGrille * PAGE_GRILLE && <button type="button" onClick={() => setPageGrille((p) => p + 1)} className={`mx-auto min-h-11 rounded-xl border border-neutral-300 px-4 text-sm ${focus}`}>Afficher {Math.min(PAGE_GRILLE, file.length - pageGrille * PAGE_GRILLE)} de plus</button>}
        </section>
      )}

      {vue === 'couverture' && (
        <section aria-labelledby="tr-couv" className="grid gap-4">
          <h2 id="tr-couv" className="text-lg font-semibold">Couverture par sujet</h2>
          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs text-neutral-600">
                <tr>
                  <th className="p-2 font-semibold">Sujet</th><th className="p-2 text-right font-semibold">Héros</th>
                  {STYLES_COUVERTURE.filter((s) => s.suivi).map((s) => <th key={s.id} className="p-2 text-right font-semibold">Illustr. {s.libelle}</th>)}
                  <th className="p-2 text-right font-semibold">Icônes</th><th className="p-2 text-right font-semibold">Photos importées</th><th className="p-2 text-right font-semibold">Photos intégrées</th><th className="p-2 text-right font-semibold">Animations validées</th>
                </tr>
              </thead>
              <tbody>
                {couverture.map((c) => {
                  const cell = (n: number, f: FamilleTri, seuil = 1) => (
                    <td className="p-2 text-right">
                      <button type="button" onClick={() => changerFiltre(f, c.sujet, 'un')} className={`min-h-9 min-w-9 rounded-lg px-2 font-semibold underline-offset-2 hover:underline ${focus} ${n < seuil ? 'bg-red-50 text-red-900' : n === seuil ? 'bg-amber-50 text-amber-900' : ''}`}>{n}</button>
                    </td>
                  );
                  return (
                    <tr key={c.sujet} className="border-t border-black/5">
                      <th scope="row" className="p-2 text-left font-semibold">{c.libelle}</th>
                      {cell(c.heros, 'heros', c.sujet === 'general' ? 0 : 1)}
                      {STYLES_COUVERTURE.filter((s) => s.suivi).map((s) => <Fragment key={s.id}>{cell(c.illustrations[s.id] ?? 0, 'illustrations', c.sujet === 'general' ? 0 : 1)}</Fragment>)}
                      {cell(c.icones, 'icones', c.sujet === 'general' ? 0 : 1)}
                      {cell(c.photosImportees, 'photos', 1)}
                      {cell(c.photosIntegrees, 'photos', 0)}
                      <td className="p-2 text-right"><button type="button" onClick={() => changerFiltre('animations', c.sujet, 'un')} className={`min-h-9 rounded-lg px-2 font-semibold hover:underline ${focus} ${!c.animationsValidees && c.sujet !== 'general' ? 'bg-amber-50 text-amber-900' : ''}`}>{c.animationsValidees}/{c.animations}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-2">
            <h3 className="text-base font-semibold">Manques ({alertes.length})</h3>
            {alertes.length ? (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {alertes.map((a) => (
                  <li key={a.texte} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-white p-2.5 text-sm">
                    <span className={a.gravite === 'forte' ? 'font-semibold text-red-900' : 'text-neutral-800'}>{a.texte}</span>
                    <button type="button" onClick={() => changerFiltre(a.filtre.famille, a.filtre.sujet, 'un')} className={`min-h-9 rounded-lg px-2 text-teal-900 underline ${focus}`}>Trier ({LIBELLES_FAMILLES_TRI[a.filtre.famille].toLowerCase()})</button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-neutral-600">Aucun manque.</p>}
            <p className="text-xs text-neutral-500">Les visuels retirés ne comptent pas. Ces manques partent aussi dans retours/SYNTHESE.md et retours/MANQUES.md à chaque export.</p>
          </div>
        </section>
      )}
    </div>
  );
}
