'use client';

// File des Arrivages (packages/core/src/arrivages.ts) : un élément à la fois, ACCEPTER (thèmes et hashtags pré-cochés modifiables,
// note rapide facultative) ou REFUSER ; touches A / R, flèches → / ←, glisser au doigt (droite = accepter) ; Z (ou Ctrl+Z) annule la
// dernière décision. Filtres par source et par type ; « Chercher des photos » ajoute des photos à découvrir (Pexels, Pixabay) à la file.
import '@plateforme/core/dessins.css';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from 'react';
import { gamme as gammeParId, SURFACES_CSS, variablesCharte, variablesGamme, type MarqueImportee, type ModeleManifeste, type SourcePhotoLibre, type Univers } from '@plateforme/core';
import { gesteClavier, gesteGlisse, SOURCES_ARRIVAGES, TYPES_INGREDIENTS, type SourceArrivage, type TypeIngredient } from '@plateforme/core/arrivages';
import ApercuStudio from '@/components/ApercuStudio';
import { SaisieHashtags } from '@/components/HashtagsVisuel';
import type { SoinCatalogue } from '@/lib/sites';
import { candidatsPhotos } from '../retours/actions-photos';
import { accepterArrivage, annulerArrivage, refuserArrivage, type Annulation, type Arrivage } from './actions';

export type VisuelArrivage =
  | { kind: 'svg'; svg: string; fond: string; picto: boolean }
  | { kind: 'image'; src: string }
  | { kind: 'gamme'; couleurs: string[] }
  | { kind: 'studio'; cle: string }
  | { kind: 'aucun' };

export type ItemArrivage = {
  id: string;
  source: SourceArrivage;
  type: TypeIngredient;
  titre: string;
  detail: string | null;
  date: string | null;
  arrivage: Arrivage;
  visuel: VisuelArrivage;
  /** Thèmes et hashtags proposés (pré-cochés) */
  sujets: string[];
  hashtags: string[];
  credit?: string | null;
  pageUrl?: string | null;
};

type Props = {
  items: ItemArrivage[];
  sujets: { id: string; libelle: string }[];
  sourcesPhotos: Record<SourcePhotoLibre, boolean>;
  motsCles: Record<string, string[]>;
  frequencesHashtags: Record<string, number>;
  sourceInitiale: string | null;
  typeInitial: string | null;
  studio: { proposes: Univers[]; modeles: { id: string; manifeste: ModeleManifeste }[]; catalogue: SoinCatalogue[]; marquesImportees: MarqueImportee[]; themesActives: string[] };
};

type Decision = { item: ItemArrivage; geste: 'accepter' | 'refuser'; annulation: Annulation | undefined };

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const dateCourte = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '');

export default function Arrivages({ items: initiaux, sujets, sourcesPhotos, frequencesHashtags, sourceInitiale, typeInitial, studio }: Props) {
  const [items, setItems] = useState<ItemArrivage[]>(initiaux);
  const [faits, setFaits] = useState<Set<string>>(new Set());
  const [historique, setHistorique] = useState<Decision[]>([]);
  const [source, setSource] = useState<SourceArrivage | 'tout'>(SOURCES_ARRIVAGES.some((s) => s.id === sourceInitiale) ? (sourceInitiale as SourceArrivage) : 'tout');
  const [type, setType] = useState<TypeIngredient | 'tout'>(TYPES_INGREDIENTS.some((t) => t.id === typeInitial) ? (typeInitial as TypeIngredient) : 'tout');
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [theme, setTheme] = useState(sujets[0]?.id ?? 'general');
  const [chargement, setChargement] = useState(false);
  const vues = useRef(new Set<string>());

  const restants = useMemo(() => items.filter((i) => !faits.has(i.id)), [items, faits]);
  const file = useMemo(() => restants.filter((i) => (source === 'tout' || i.source === source) && (type === 'tout' || i.type === type)), [restants, source, type]);
  const courant = file[0] ?? null;

  // Choix de l'élément affiché (remis aux valeurs proposées à chaque élément)
  const [choixSujets, setChoixSujets] = useState<string[]>([]);
  const [choixTags, setChoixTags] = useState<string[]>([]);
  const [note, setNote] = useState<number | null>(null);
  useEffect(() => { setChoixSujets(courant?.sujets ?? []); setChoixTags(courant?.hashtags ?? []); setNote(null); }, [courant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const decider = useCallback(async (geste: 'accepter' | 'refuser') => {
    if (!courant || occupe) return;
    if (geste === 'accepter' && courant.type === 'photo' && !choixSujets.length) { setMessage({ ok: false, texte: 'Cochez au moins un thème pour accepter une photo.' }); return; }
    setOccupe(true);
    const r = await (geste === 'accepter'
      ? accepterArrivage(courant.arrivage, { sujets: choixSujets, sujetsProposes: courant.sujets, hashtags: choixTags, hashtagsProposes: courant.hashtags, note })
      : refuserArrivage(courant.arrivage)).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.', annulation: undefined }));
    setOccupe(false);
    setMessage({ ok: r.ok, texte: `${courant.titre} : ${r.message}` });
    if (!r.ok) return;
    setFaits((f) => new Set(f).add(courant.id));
    setHistorique((h) => [...h, { item: courant, geste, annulation: r.annulation }].slice(-30));
  }, [courant, occupe, choixSujets, choixTags, note]);

  const annuler = useCallback(async () => {
    const d = historique[historique.length - 1];
    if (!d || occupe) return;
    setOccupe(true);
    const r = d.annulation ? await annulerArrivage(d.annulation).catch(() => ({ ok: false, message: 'Connexion perdue : réessayez.' })) : { ok: true, message: 'Remis dans la file.' };
    setOccupe(false);
    setMessage({ ok: r.ok, texte: `${d.item.titre} : ${r.message}` });
    if (!r.ok) return;
    setHistorique((h) => h.slice(0, -1));
    // Une candidate acceptée est devenue une photo de la base : elle revient sous sa nouvelle forme (« à valider »)
    const remis: ItemArrivage = d.item.arrivage.kind === 'candidate' && d.annulation?.kind === 'photo'
      ? { ...d.item, id: `p:${d.annulation.id}`, arrivage: { kind: 'photo', id: d.annulation.id }, detail: 'Hébergée chez nous' }
      : d.item;
    setFaits((f) => { const n = new Set(f); n.delete(d.item.id); return n; });
    setItems((l) => [remis, ...l.filter((x) => x.id !== d.item.id && x.id !== remis.id)]);
  }, [historique, occupe]);

  // Clavier : A / → accepter, R / ← refuser, Z ou Ctrl+Z annuler (hors champs de saisie)
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.altKey || e.metaKey) return;
      if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) { e.preventDefault(); void annuler(); return; }
      if (e.ctrlKey) return;
      const g = gesteClavier(e.key);
      if (g) { e.preventDefault(); void decider(g); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [decider, annuler]);

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

  const compte = (f: (i: ItemArrivage) => boolean) => restants.filter(f).length;
  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  const sourcesPretes = Object.values(sourcesPhotos).some(Boolean);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" style={style}>
      <style>{SURFACES_CSS + '.ar-svg svg{width:100%;height:100%;display:block}'}</style>
      <div className="grid gap-2">
        <div role="group" aria-label="Source" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {([['tout', 'Toutes les sources'], ...SOURCES_ARRIVAGES.map((s) => [s.id, s.libelle])] as [SourceArrivage | 'tout', string][]).map(([id, libelle]) => (
            <button key={id} type="button" aria-pressed={source === id} onClick={() => setSource(id)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ring-1 ${focus} ${source === id ? 'bg-teal-800 font-semibold text-white ring-teal-900' : 'bg-white ring-black/10 hover:bg-neutral-50'}`}>
              {libelle} <span className="tabular-nums opacity-80">{compte((i) => id === 'tout' || i.source === id)}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {([['tout', 'Tous les types'], ...TYPES_INGREDIENTS.map((t) => [t.id, t.pluriel])] as [TypeIngredient | 'tout', string][]).filter(([id]) => id === 'tout' || compte((i) => i.type === id) > 0 || id === type).map(([id, libelle]) => (
            <button key={id} type="button" aria-pressed={type === id} onClick={() => setType(id)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ring-1 ${focus} ${type === id ? 'bg-neutral-800 font-semibold text-white ring-neutral-900' : 'bg-white ring-black/10 hover:bg-neutral-50'}`}>
              {libelle} <span className="tabular-nums opacity-80">{compte((i) => (source === 'tout' || i.source === source) && (id === 'tout' || i.type === id))}</span>
            </button>
          ))}
        </div>
      </div>

      {message && <p role="status" className={`rounded-lg px-3 py-2 text-sm ring-1 ${message.ok ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-amber-50 text-amber-950 ring-amber-200'}`}>{message.texte}</p>}

      {courant ? (
        <article aria-labelledby="ar-titre" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3 sm:p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut} onPointerCancel={() => { depart.current = null; setDx(0); }}
            className="relative touch-pan-y select-none" style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined, transition: dx ? 'none' : 'transform .2s' }}>
            <Visuel item={courant} studio={studio} />
            {Math.abs(dx) > 40 && (
              <span className={`pointer-events-none absolute top-3 rounded-lg px-3 py-1 text-lg font-bold text-white ${dx > 0 ? 'left-3 bg-teal-700' : 'right-3 bg-red-700'}`}>{dx > 0 ? 'Accepter' : 'Refuser'}</span>
            )}
          </div>
          <div className="grid content-start gap-3">
            <div>
              <p className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">{SOURCES_ARRIVAGES.find((s) => s.id === courant.source)?.libelle}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">{TYPES_INGREDIENTS.find((t) => t.id === courant.type)?.libelle}</span>
                {courant.date && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Arrivé le {dateCourte(courant.date)}</span>}
              </p>
              <h2 id="ar-titre" className="mt-1.5 text-lg font-bold">{courant.titre}</h2>
              {courant.detail && <p className="text-sm text-neutral-600">{courant.detail}</p>}
              {(courant.credit || courant.pageUrl) && (
                <p className="text-xs text-neutral-500">{courant.credit ? `Auteur : ${courant.credit}` : ''}{courant.pageUrl && <> · <a href={courant.pageUrl} target="_blank" rel="noopener noreferrer" className="underline">page source</a></>}</p>
              )}
            </div>
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
              onAjout={(l) => setChoixTags((v) => [...v, ...l.filter((h) => !v.includes(h))])} onRetrait={(h) => setChoixTags((v) => v.filter((x) => x !== h))} />
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-semibold">Note rapide <span className="font-normal text-neutral-500">(facultative)</span></legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-pressed={note === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`} onClick={() => setNote(note === n ? null : n)}
                    className={`grid size-11 place-items-center rounded-lg text-xl ring-1 ${focus} ${note !== null && n <= note ? 'bg-amber-400 text-amber-950 ring-amber-500' : 'bg-white text-neutral-400 ring-black/15'}`}>★</button>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={occupe} onClick={() => void decider('refuser')}
                className={`min-h-14 rounded-xl border-2 border-red-700 bg-white text-base font-bold text-red-800 hover:bg-red-50 disabled:opacity-50 ${focus}`}>← Refuser <span className="text-xs font-normal">(R)</span></button>
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
          Annuler la dernière décision{historique.length ? ` (${historique[historique.length - 1].geste === 'accepter' ? 'acceptée' : 'refusée'})` : ''} <span className="font-normal text-neutral-500">(Z)</span>
        </button>
      </div>

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

function Visuel({ item, studio }: { item: ItemArrivage; studio: Props['studio'] }) {
  const v = item.visuel;
  const cadre = 'grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl ring-1 ring-black/10';
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
  return <div className={`${cadre} bg-neutral-50 text-sm text-neutral-500`}>Sans aperçu</div>;
}
