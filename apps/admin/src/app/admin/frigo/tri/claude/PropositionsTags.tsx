'use client';

// « Propositions de Claude » : une carte par visuel. Tags proposés PRÉ-COCHÉS (pointillé violet « proposé par Claude »), décochables ;
// hashtag libre ajoutable (correction) ; « Valider » (la carte), « Valider la sélection », « Valider tout » (les cartes filtrées
// non encore validées). Alertes visibles en haut de carte. Ordre : priorité (sans sujet, sans hashtag, compléments) ou « les plus
// prometteurs d'abord » (note prédite, jamais notés avant). La note prédite n'est jamais enregistrée.
import '@plateforme/core/dessins.css';
import { useMemo, useState, type CSSProperties } from 'react';
import { gamme as gammeParId, inventaireAssets, normaliserHashtag, SURFACES_CSS, SUJETS_VISUELS, variablesCharte, variablesGamme, type PhotoDeJeu } from '@plateforme/core';
import {
  ACTIVITES_CLAUDE, ALERTES_CLAUDE, hashtagProfession, LIBELLES_PRIORITE_TAGS, libelleProfession, libelleSujetTags, professionDuRegistre, trierParNotePredite,
  type PrioriteTags, type PropositionTags,
} from '@plateforme/core/propositions-claude-tags';
import Apercu from '../../../retours/tri/ApercuVisuel';
import { validerPropositionsTags } from './actions';

export type ElementPropose = { p: PropositionTags; sujetsActuels: string[]; hashtagsActuels: string[]; priorite: PrioriteTags; dejaNote: boolean };
type Choix = { sujets: Set<string>; hashtags: Set<string> };

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const PAGE = 24;
const RANG_PRIORITE: Record<PrioriteTags, number> = { 'sans-sujet': 0, 'sans-hashtag': 1, complement: 2 };
type Famille = 'tout' | 'photos' | 'illustrations' | 'icones';
const familleDe = (cle: string): Exclude<Famille, 'tout'> => (cle.startsWith('photo:') ? 'photos' : cle.startsWith('picto:') ? 'icones' : 'illustrations');

/** Choix initial : tout ce que Claude propose, pré-coché */
function choixInitial(p: PropositionTags): Choix {
  return { sujets: new Set(p.sujets), hashtags: new Set([...p.activites, ...p.professions.map((x) => hashtagProfession(x) ?? ''), ...p.hashtags].filter(Boolean)) };
}

export default function PropositionsTags({ elements, photosJeux, urlStockage }: { elements: ElementPropose[]; photosJeux: PhotoDeJeu[]; urlStockage: string }) {
  const inventaire = useMemo(() => new Map(inventaireAssets({ photosJeux }).map((a) => [a.cle, a])), [photosJeux]);
  const [choix, setChoix] = useState<Record<string, Choix>>(() => Object.fromEntries(elements.map((e) => [e.p.cle, choixInitial(e.p)])));
  const [valides, setValides] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [ordre, setOrdre] = useState<'priorite' | 'note'>('priorite');
  const [famille, setFamille] = useState<Famille>('tout');
  const [priorite, setPriorite] = useState<PrioriteTags | 'tout'>('tout');
  const [alertesSeules, setAlertesSeules] = useState(false);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);

  const filtres = useMemo(() => {
    const l = elements.filter((e) => (famille === 'tout' || familleDe(e.p.cle) === famille) && (priorite === 'tout' || e.priorite === priorite) && (!alertesSeules || e.p.alertes.length > 0));
    if (ordre === 'note') {
      const notees = new Set(l.filter((e) => e.dejaNote).map((e) => e.p.cle));
      const parCle = new Map(l.map((e) => [e.p.cle, e]));
      return trierParNotePredite(l.map((e) => e.p), notees).map((p) => parCle.get(p.cle)!);
    }
    return [...l].sort((a, b) => RANG_PRIORITE[a.priorite] - RANG_PRIORITE[b.priorite] || (b.p.notePredite ?? 0) - (a.p.notePredite ?? 0) || a.p.cle.localeCompare(b.p.cle));
  }, [elements, famille, priorite, alertesSeules, ordre]);
  const visibles = filtres.slice(0, page * PAGE);
  const restants = filtres.filter((e) => !valides.has(e.p.cle));

  const basculer = (cle: string, nature: 'sujets' | 'hashtags', v: string) => setChoix((c) => {
    const x = c[cle]; const n = new Set(x[nature]);
    if (n.has(v)) n.delete(v); else n.add(v);
    return { ...c, [cle]: { ...x, [nature]: n } };
  });

  const valider = async (cles: string[]) => {
    const l = cles.filter((k) => !valides.has(k));
    if (!l.length || enCours) return;
    setEnCours(true);
    const parCle = new Map(elements.map((e) => [e.p.cle, e]));
    const r = await validerPropositionsTags(
      l.map((cle) => ({ cle, sujets: [...choix[cle].sujets], hashtags: [...choix[cle].hashtags] })),
      Object.fromEntries(l.map((k) => [k, parCle.get(k)?.sujetsActuels ?? []])),
    ).catch(() => ({ ok: false, message: 'Connexion perdue.', valides: undefined }));
    setEnCours(false);
    setMessage(r.message);
    if (r.ok) { setValides((v) => new Set([...v, ...l])); setSelection((s) => new Set([...s].filter((k) => !l.includes(k)))); }
  };

  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  const urlPhoto = (cle: string) => (urlStockage && cle.startsWith('photo:banque/') ? `${urlStockage.replace(/\/$/, '')}/storage/v1/object/public/photos/${cle.slice('photo:'.length)}` : null);

  const puce = (actif: boolean, propose: boolean, texte: string, onClick: () => void, titre?: string) => (
    <button type="button" aria-pressed={actif} onClick={onClick} title={titre}
      className={`min-h-9 rounded-full px-2.5 text-xs font-medium ${focus} ${actif
        ? propose ? 'border border-dashed border-violet-600 bg-violet-50 text-violet-950' : 'border border-teal-700 bg-teal-700 text-white'
        : 'border border-neutral-300 bg-white text-neutral-500 line-through decoration-neutral-400'}`}>{texte}</button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-28 md:pb-0" style={style}>
      <style>{SURFACES_CSS + '.tr-svg svg{width:100%;height:100%;display:block}'}</style>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 max-w-full gap-1 text-sm"><span className="font-medium">Ordre</span>
          <select aria-label="Ordre" value={ordre} onChange={(e) => { setOrdre(e.target.value as 'priorite' | 'note'); setPage(1); }} className="min-h-11 w-full max-w-full rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            <option value="priorite">Sans sujet, puis sans hashtag</option>
            <option value="note">Prometteurs d’abord (note prédite)</option>
          </select>
        </label>
        <label className="grid min-w-0 max-w-full gap-1 text-sm"><span className="font-medium">Famille</span>
          <select aria-label="Famille" value={famille} onChange={(e) => { setFamille(e.target.value as Famille); setPage(1); }} className="min-h-11 w-full max-w-full rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            <option value="tout">Tout</option><option value="photos">Photos</option><option value="illustrations">Illustrations, héros, animations</option><option value="icones">Icônes</option>
          </select>
        </label>
        <label className="grid min-w-0 max-w-full gap-1 text-sm"><span className="font-medium">Priorité</span>
          <select aria-label="Priorité" value={priorite} onChange={(e) => { setPriorite(e.target.value as PrioriteTags | 'tout'); setPage(1); }} className="min-h-11 w-full max-w-full rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            <option value="tout">Toutes</option>
            {(Object.keys(LIBELLES_PRIORITE_TAGS) as PrioriteTags[]).map((k) => <option key={k} value={k}>{LIBELLES_PRIORITE_TAGS[k]}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" aria-label="Avec alertes seulement" checked={alertesSeules} onChange={(e) => { setAlertesSeules(e.target.checked); setPage(1); }} className="size-5" />Avec alertes seulement</label>
        <p className="text-sm text-neutral-600">{restants.length} à valider sur {filtres.length}</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-2 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:sticky md:top-0 md:rounded-xl md:border">
        <span className="text-sm font-semibold">{selection.size} sélectionné{selection.size > 1 ? 's' : ''}</span>
        <button type="button" disabled={!selection.size || enCours} onClick={() => void valider([...selection])} className={`min-h-11 rounded-xl bg-teal-800 px-3 text-sm font-semibold text-white disabled:opacity-50 ${focus}`}>Valider la sélection</button>
        <button type="button" disabled={!restants.length || enCours} onClick={() => { if (window.confirm(`Enregistrer les tags cochés des ${restants.length} visuels affichés par ce filtre ?`)) void valider(restants.map((e) => e.p.cle)); }} className={`min-h-11 rounded-xl border border-teal-800 px-3 text-sm font-semibold text-teal-900 disabled:opacity-50 ${focus}`}>Valider tout ({restants.length})</button>
        <button type="button" onClick={() => setSelection(new Set(visibles.filter((e) => !valides.has(e.p.cle)).map((e) => e.p.cle)))} className={`min-h-11 rounded-xl px-2 text-sm text-teal-900 underline ${focus}`}>Tout sélectionner</button>
        {selection.size > 0 && <button type="button" onClick={() => setSelection(new Set())} className={`min-h-11 rounded-xl px-2 text-sm text-neutral-700 underline ${focus}`}>Vider</button>}
        {message && <p role="status" className="basis-full text-sm text-neutral-700 md:basis-auto">{message}</p>}
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibles.map(({ p, sujetsActuels, hashtagsActuels, priorite: prio, dejaNote }) => {
          const a = inventaire.get(p.cle);
          const c = choix[p.cle];
          const fait = valides.has(p.cle);
          const choisi = selection.has(p.cle);
          const photo = !a ? urlPhoto(p.cle) : null;
          const proposes = new Set([...p.activites, ...p.professions.map((x) => hashtagProfession(x) ?? ''), ...p.hashtags]);
          const libres = [...c.hashtags].filter((h) => !proposes.has(h));
          return (
            <li key={p.cle} className={`grid content-start gap-2 rounded-2xl border-2 bg-white p-3 ${fait ? 'border-teal-600 opacity-70' : choisi ? 'border-teal-700' : 'border-transparent ring-1 ring-black/10'}`}>
              <div className="flex items-start justify-between gap-2">
                <label className="flex min-h-9 items-center gap-2 text-xs"><input type="checkbox" disabled={fait} checked={choisi} onChange={() => setSelection((s) => { const n = new Set(s); if (n.has(p.cle)) n.delete(p.cle); else n.add(p.cle); return n; })} className="size-5" />Sélectionner</label>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">{LIBELLES_PRIORITE_TAGS[prio]}</span>
              </div>
              {a ? <Apercu a={a} /> : photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" loading="lazy" className="aspect-square w-full rounded-xl bg-neutral-100 object-cover" />
              ) : <div className="grid aspect-square place-items-center rounded-xl bg-neutral-100 text-xs text-neutral-500">Sans aperçu</div>}
              <p className="break-all text-[11px] text-neutral-500"><code>{p.cle}</code></p>
              {p.alertes.length > 0 && (
                <ul className="flex flex-wrap gap-1" aria-label="Alertes">
                  {p.alertes.map((x) => <li key={x} className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-900 ring-1 ring-red-200">⚠ {ALERTES_CLAUDE[x]}</li>)}
                </ul>
              )}
              <p className="text-sm text-neutral-800">{p.description}</p>
              <p className="text-xs text-neutral-600">
                {p.notePredite != null
                  ? <><span className="font-semibold text-violet-900">Claude prédit {p.notePredite} ★</span> (confiance {p.confiance}){p.justification ? ` : ${p.justification}` : ''}</>
                  : dejaNote ? 'Déjà noté par vous : pas de prédiction.' : 'Pas de prédiction.'}
              </p>
              <div className="grid gap-1">
                <p className="text-xs font-semibold">Sujets {sujetsActuels.length ? <span className="font-normal text-neutral-500">(actuels : {sujetsActuels.map(libelleSujetTags).join(', ')})</span> : <span className="font-normal text-red-800">(aucun)</span>}</p>
                <div className="flex flex-wrap gap-1">
                  {SUJETS_VISUELS.filter((s) => p.sujets.includes(s.id) || c.sujets.has(s.id)).map((s) => puce(c.sujets.has(s.id), p.sujets.includes(s.id), s.libelle, () => basculer(p.cle, 'sujets', s.id), p.sujets.includes(s.id) ? 'Proposé par Claude' : undefined))}
                  <select aria-label="Ajouter un sujet" value="" onChange={(e) => { if (e.target.value) basculer(p.cle, 'sujets', e.target.value); }} disabled={fait} className="min-h-9 rounded-full border border-neutral-300 bg-white px-2 text-xs">
                    <option value="">+ sujet</option>
                    {SUJETS_VISUELS.filter((s) => !c.sujets.has(s.id) && !p.sujets.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
                  </select>
                </div>
              </div>
              {(p.activites.length > 0 || p.professions.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  {p.activites.map((x) => puce(c.hashtags.has(x), true, ACTIVITES_CLAUDE[x] ?? x, () => basculer(p.cle, 'hashtags', x), 'Activité proposée par Claude'))}
                  {p.professions.map((x) => { const h = hashtagProfession(x) ?? x; return puce(c.hashtags.has(h), true, `${libelleProfession(x)}${professionDuRegistre(x) ? '' : ' (à venir)'}`, () => basculer(p.cle, 'hashtags', h), `Profession proposée par Claude (#${h})`); })}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {p.hashtags.map((h) => puce(c.hashtags.has(h), true, `#${h}`, () => basculer(p.cle, 'hashtags', h), hashtagsActuels.includes(h) ? 'Déjà sur ce visuel' : 'Proposé par Claude'))}
                {libres.map((h) => puce(true, false, `#${h}`, () => basculer(p.cle, 'hashtags', h), 'Ajouté par vous'))}
                <input aria-label="Ajouter un hashtag" placeholder="+ #hashtag" disabled={fait} onKeyDown={(e) => { if (e.key === 'Enter') { const h = normaliserHashtag((e.target as HTMLInputElement).value); if (h) { setChoix((x) => ({ ...x, [p.cle]: { ...x[p.cle], hashtags: new Set([...x[p.cle].hashtags, h]) } })); (e.target as HTMLInputElement).value = ''; } } }}
                  className="min-h-9 w-28 rounded-full border border-neutral-300 px-2 text-base md:text-xs" />
              </div>
              <button type="button" disabled={fait || enCours} onClick={() => void valider([p.cle])} className={`min-h-11 rounded-xl px-3 text-sm font-semibold disabled:opacity-60 ${focus} ${fait ? 'bg-teal-50 text-teal-900' : 'bg-teal-800 text-white hover:bg-teal-900'}`}>{fait ? 'Tags enregistrés' : 'Valider ces tags'}</button>
            </li>
          );
        })}
      </ul>
      {filtres.length > visibles.length && <button type="button" onClick={() => setPage((x) => x + 1)} className={`mx-auto min-h-11 rounded-xl border border-neutral-300 px-4 text-sm ${focus}`}>Afficher {Math.min(PAGE, filtres.length - visibles.length)} de plus</button>}
    </div>
  );
}
