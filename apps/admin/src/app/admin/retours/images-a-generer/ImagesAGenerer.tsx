'use client';

// Images à générer : réglages (gamme, langue, outil), règles et conseils de sélection, TROUS priorisés (prompt prêt à copier par format
// et variante, « Importer une image générée » avec le sujet, les hashtags et le prompt du trou), composition libre d'un prompt, dernières
// images générées importées. Les prompts sont construits ici (prompts-images.ts, pur) : aucun appel à un service d'IA.
import { useEffect, useMemo, useState } from 'react';
import {
  CONSEILS_SELECTION, construirePrompt, formatImage, formatsEmplacement, GAMMES, hashtagsDuTrou, LIBELLE_IMAGE_GENEREE, libelleEmplacement, libelleSujetKit,
  REGLES_DEONTOLOGIQUES, SCENES_SOINS, SUJETS_KITS, themeParId, type LanguePrompt, type StylePrompt, type TrouImage,
} from '@plateforme/core';
import ImportImageGeneree, { type ValeursImport } from './ImportImageGeneree';
import SetsDemo from './SetsDemo';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const champ = `min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm ${focus}`;
const puce = (actif: boolean) => `min-h-11 rounded-full border px-3 text-sm font-semibold ${actif ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'} ${focus}`;
const CLE = 'images-a-generer:reglages';
const PRIORITES = { 1: 'Priorité haute', 2: 'Priorité moyenne', 3: 'À compléter' } as const;

type Reglages = { gamme: string; langue: LanguePrompt; style: StylePrompt };
type Importee = { id: string; url: string | null; sujet: string; outil: string; statut: string; genereLe: string | null; demo?: boolean };

function Copier({ texte }: { texte: string }) {
  const [fait, setFait] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(texte); setFait(true); setTimeout(() => setFait(false), 1800); } catch { setFait(false); } }}
      className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>
      {fait ? 'Copié' : 'Copier le prompt'}
    </button>
  );
}

/** Prompt d'un sujet × emplacement : choix du format et de la variante, texte, copier, importer */
function BlocPrompt({ sujet, emplacement, formats, reglages, precision, trou, migrationManquante, migration0048Manquante }: {
  sujet: string; emplacement: string; formats: string[]; reglages: Reglages; precision?: string; trou?: TrouImage; migrationManquante: boolean; migration0048Manquante: boolean;
}) {
  const [format, setFormat] = useState(formats[0]);
  const [variante, setVariante] = useState(0);
  const [importer, setImporter] = useState<ValeursImport | null>(null);
  useEffect(() => { if (!formats.includes(format)) setFormat(formats[0]); }, [formats, format]);
  const r = useMemo(() => construirePrompt({ sujet, emplacement, format, gamme: reglages.gamme, langue: reglages.langue, style: reglages.style, variante, precision }),
    [sujet, emplacement, format, reglages, variante, precision]);
  const f = formatImage(format);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Format">
        {formats.map((x) => <button key={x} type="button" aria-pressed={x === format} onClick={() => setFormat(x)} className={puce(x === format)}>{formatImage(x)?.libelle} · {formatImage(x)?.ratio}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Variante">
        <span className="text-xs text-neutral-600">Variante (lumière, angle) :</span>
        {[0, 1, 2].map((v) => <button key={v} type="button" aria-pressed={v === variante} onClick={() => setVariante(v)} className={puce(v === variante)}>{v + 1}</button>)}
      </div>
      {f && <p className="text-xs text-neutral-600">{f.usage}.</p>}
      {r.ok ? (
        <>
          <textarea readOnly value={r.texte} rows={reglages.style === 'midjourney' ? 6 : 9} aria-label="Prompt prêt à copier"
            className={`w-full rounded-lg border border-neutral-300 bg-neutral-50 p-2 font-mono text-xs leading-relaxed text-neutral-800 ${focus}`} />
          <div className="flex flex-wrap gap-2">
            <Copier texte={r.texte} />
            <button type="button" onClick={() => setImporter(importer ? null : { sujet, hashtags: trou?.hashtags ?? hashtagsDuTrou(emplacement), prompt: r.texte, trou: trou?.id ?? `${sujet}|${emplacement}` })}
              className={`min-h-11 rounded-xl border border-violet-400 bg-white px-4 text-sm font-semibold text-violet-950 hover:bg-violet-50 ${focus}`}>
              Importer une image générée
            </button>
          </div>
        </>
      ) : (
        <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-900 ring-1 ring-red-200">Prompt refusé : {r.refus.join(' ')}</p>
      )}
      {importer && <ImportImageGeneree key={`${importer.trou}|${format}|${variante}`} initial={importer} migrationManquante={migrationManquante} migration0048Manquante={migration0048Manquante} onFermer={() => setImporter(null)} />}
    </div>
  );
}

export default function ImagesAGenerer({ trous, importees, migrationManquante, migration0048Manquante = false }: { trous: TrouImage[]; importees: Importee[]; migrationManquante: boolean; migration0048Manquante?: boolean }) {
  const [reglages, setReglages] = useState<Reglages>({ gamme: 'canard', langue: 'en', style: 'phrases' });
  const [tout, setTout] = useState(false);
  useEffect(() => { try { const r = JSON.parse(localStorage.getItem(CLE) ?? 'null'); if (r && GAMMES.some((g) => g.id === r.gamme)) setReglages({ gamme: r.gamme, langue: r.langue === 'fr' ? 'fr' : 'en', style: r.style === 'midjourney' ? 'midjourney' : 'phrases' }); } catch { /* réglages par défaut */ } }, []);
  const regler = (r: Partial<Reglages>) => setReglages((x) => { const n = { ...x, ...r }; try { localStorage.setItem(CLE, JSON.stringify(n)); } catch { /* sans mémoire */ } return n; });

  // Composition libre
  const [sujet, setSujet] = useState<string>('senior');
  const soins = useMemo(() => (themeParId(sujet)?.soins ?? []).filter((s) => SCENES_SOINS[s]), [sujet]);
  const emplacements = useMemo(() => ['accueil', 'page-sujet', ...soins.map((s) => `soin:${s}`), 'cabinet', 'ecranzen'], [soins]);
  const [emplacement, setEmplacement] = useState('accueil');
  const [precision, setPrecision] = useState('');
  useEffect(() => { if (!emplacements.includes(emplacement)) setEmplacement('accueil'); }, [emplacements, emplacement]);
  const g = GAMMES.find((x) => x.id === reglages.gamme);
  const visibles = tout ? trous : trous.slice(0, 6);

  return (
    <div className="grid gap-5">
      <section aria-label="Réglages" className="grid gap-3 rounded-xl border border-black/5 bg-white p-3 md:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Gamme (couleurs injectées)</span>
            <span className="flex items-center gap-2">
              <select value={reglages.gamme} onChange={(e) => regler({ gamme: e.target.value })} className={`${champ} min-w-0 flex-1`}>
                {GAMMES.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
              </select>
              {g && <span aria-hidden className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-black/10">{[g.accent, g.aplat ?? g.fondDoux, g.vif ?? g.fond].map((c, i) => <span key={i} className="block size-6" style={{ background: c }} />)}</span>}
            </span>
          </label>
          <div className="grid gap-1 text-sm">
            <span className="font-medium">Langue du prompt</span>
            <div className="flex gap-2" role="group" aria-label="Langue">
              {(['en', 'fr'] as const).map((l) => <button key={l} type="button" aria-pressed={reglages.langue === l} onClick={() => regler({ langue: l })} className={puce(reglages.langue === l)}>{l === 'en' ? 'Anglais' : 'Français'}</button>)}
            </div>
          </div>
          <div className="grid gap-1 text-sm">
            <span className="font-medium">Générateur</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Générateur">
              <button type="button" aria-pressed={reglages.style === 'phrases'} onClick={() => regler({ style: 'phrases' })} className={puce(reglages.style === 'phrases')}>ChatGPT, Firefly…</button>
              <button type="button" aria-pressed={reglages.style === 'midjourney'} onClick={() => regler({ style: 'midjourney' })} className={puce(reglages.style === 'midjourney')}>Midjourney</button>
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="text-sm">
            <h2 className="font-semibold">Avant d’importer</h2>
            <ul className="mt-1 list-disc pl-5 text-neutral-700">{CONSEILS_SELECTION.slice(0, 3).map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">Règles déontologiques (intégrées aux prompts)</summary>
            <ul className="mt-1 list-disc pl-5 text-neutral-700">{REGLES_DEONTOLOGIQUES.map((c) => <li key={c}>{c}</li>)}</ul>
          </details>
        </div>
      </section>

      <SetsDemo reglages={reglages} migrationManquante={migrationManquante} migration0048Manquante={migration0048Manquante} />

      <section aria-labelledby="trous" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="trous" className="text-lg font-semibold">Trous à combler ({trous.length})</h2>
          <p className="text-xs text-neutral-600">Kits d’images, sujets peu couverts, manques signalés. La galerie du cabinet n’en fait pas partie.</p>
        </div>
        {!trous.length && <p className="text-sm text-neutral-600">Aucun trou : tous les emplacements des kits ont une bonne photo.</p>}
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-2">
          {visibles.map((t) => (
            <li key={t.id} className="grid min-w-0 content-start gap-2 rounded-xl border border-black/10 bg-white p-3 md:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${t.priorite === 1 ? 'bg-amber-100 text-amber-950 ring-amber-300' : 'bg-neutral-100 text-neutral-800 ring-neutral-200'}`}>{PRIORITES[t.priorite]}</span>
                <h3 className="text-base font-semibold">{t.libelle}</h3>
              </div>
              <ul className="text-xs text-neutral-600">{t.details.map((d) => <li key={d}>{d}</li>)}</ul>
              <BlocPrompt sujet={t.sujet} emplacement={t.emplacement} formats={[...t.formats, 'ecranzen']} reglages={reglages} trou={t} migrationManquante={migrationManquante} migration0048Manquante={migration0048Manquante} />
            </li>
          ))}
        </ul>
        {trous.length > 6 && (
          <button type="button" onClick={() => setTout(!tout)} className={`min-h-11 justify-self-start rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold ${focus}`}>
            {tout ? 'Afficher moins' : `Afficher les ${trous.length} trous`}
          </button>
        )}
      </section>

      <section aria-labelledby="composer" className="grid gap-3 rounded-xl border border-black/5 bg-white p-3 md:p-4">
        <h2 id="composer" className="text-lg font-semibold">Composer un prompt</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Sujet</span>
            <select value={sujet} onChange={(e) => setSujet(e.target.value)} className={champ}>{SUJETS_KITS.map((s) => <option key={s} value={s}>{libelleSujetKit(s)}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Emplacement</span>
            <select value={emplacement} onChange={(e) => setEmplacement(e.target.value)} className={champ}>
              {emplacements.map((e) => <option key={e} value={e}>{e === 'ecranzen' ? 'ÉcranZen' : e === 'cabinet' ? 'Cabinet : détail d’ambiance' : libelleEmplacement(e)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Précision (facultatif)</span>
            <input value={precision} onChange={(e) => setPrecision(e.target.value)} maxLength={200} placeholder="ex. serviette vert sauge" className={champ} />
          </label>
        </div>
        <BlocPrompt sujet={sujet} emplacement={emplacement} formats={formatsEmplacement(emplacement)} reglages={reglages} precision={precision} migrationManquante={migrationManquante} migration0048Manquante={migration0048Manquante} />
      </section>

      <section aria-labelledby="importees" className="grid gap-2">
        <h2 id="importees" className="text-lg font-semibold">Dernières images générées importées</h2>
        {!importees.length ? <p className="text-sm text-neutral-600">Aucune pour l’instant.</p> : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {importees.map((p) => (
              <li key={p.id} className="relative grid gap-1 rounded-lg border border-black/10 bg-white p-1.5 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.url && <img src={p.url} alt={`${LIBELLE_IMAGE_GENEREE} · ${libelleSujetKit(p.sujet)}`} loading="lazy" className="aspect-[3/2] w-full rounded object-cover" />}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-950 ring-1 ring-violet-300">{LIBELLE_IMAGE_GENEREE}</span>
                {p.demo && <span className="absolute right-2.5 top-2.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-950 ring-1 ring-amber-300">Démo</span>}
                <span>{p.demo ? 'Démo' : libelleSujetKit(p.sujet)} · {p.outil} · {p.statut === 'a_valider' ? 'à valider' : p.statut === 'validee' ? 'validée' : 'retirée'}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-neutral-600">Notez-les dans « Donner mon avis », validez-les dans Jeux de photos : elles entrent alors dans le vivier de leur sujet.</p>
      </section>
    </div>
  );
}
