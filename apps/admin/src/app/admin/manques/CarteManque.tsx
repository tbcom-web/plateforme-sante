'use client';

// Carte d'un manque (Atelier des manques, page.tsx) — MOBILE D'ABORD : ce qui existe (vignettes), ce qui manque, le prompt de l'outil
// choisi (ChatGPT / Gemini : photo ou illustration en aplats, format téléphone 4:5 ou ordinateur 16:9 ; Claude : demande SVG à envoyer
// dans l'app Claude), « Copier » / « Partager » (feuille de partage du téléphone), rappel en français, conditions de l'outil, puis
// « Déposer l'image générée » : formulaire d'import des images générées prérempli (sujet, hashtags de l'activité, trou du manque,
// outil, prompt, conditions) ; sur téléphone, le sélecteur propose l'appareil photo ou la galerie.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Manque, OutilManque, PromptManque } from '@plateforme/core/manques';
import DemandeClaude from '@/components/DemandeClaude';
import ImportImageGeneree from '../retours/images-a-generer/ImportImageGeneree';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const puce = (actif: boolean) => `min-h-11 rounded-full border px-3 text-sm font-semibold ${actif ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white text-neutral-800'} ${focus}`;

const NOMS_OUTILS: Record<OutilManque, string> = { chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude (SVG)' };
const RAISONS: Record<Manque['raison'], string> = { aucun: 'Rien de validé', moyens: 'Notes moyennes', peu: 'Trop peu de choix', composeur: 'Repli du composeur' };

export type CarteManqueProps = {
  manque: Manque & { rang: number; prompts: PromptManque[]; lienValider: string };
  svgs: Record<string, string>;
  migrationManquante: boolean;
  migration0048Manquante: boolean;
  profession: string;
  /** Rappel des conditions de chaque outil (CONDITIONS_OUTILS du core, une seule source) */
  conditions: Record<OutilManque, { texte: string; url: string }>;
};

export default function CarteManque({ manque: m, svgs, migrationManquante, migration0048Manquante, profession, conditions: CONDITIONS }: CarteManqueProps) {
  const outils = useMemo(() => [...new Set(m.prompts.map((p) => p.outil))], [m.prompts]);
  const [outil, setOutil] = useState<OutilManque | null>(outils[0] ?? null);
  const formats = m.prompts.filter((p) => p.outil === outil);
  const [format, setFormat] = useState<string | null>(formats[0]?.format ?? null);
  useEffect(() => { if (!formats.some((p) => p.format === format)) setFormat(formats[0]?.format ?? null); }, [formats, format]);
  const prompt = formats.find((p) => p.format === format) ?? formats[0] ?? null;
  const [copie, setCopie] = useState('');
  const [partage, setPartage] = useState(false);
  const [deposer, setDeposer] = useState(false);
  useEffect(() => { setPartage(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);
  const raster = Boolean(prompt && prompt.outil !== 'claude');

  const copier = async () => {
    if (!prompt) return;
    try { await navigator.clipboard.writeText(prompt.texte); setCopie('Copié : collez-le dans ' + NOMS_OUTILS[prompt.outil] + '.'); } catch { setCopie('Copie refusée : touchez le texte pour le sélectionner.'); }
  };
  const partager = async () => {
    if (!prompt) return;
    try { await navigator.share({ title: m.libelle, text: prompt.texte }); setCopie('Partagé.'); } catch (e) { if ((e as Error)?.name !== 'AbortError') await copier(); }
  };

  return (
    <article className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm md:p-4" data-manque={m.id} data-etat={m.etat} aria-labelledby={`mq-${m.rang}`}>
      <header className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-neutral-900 px-2 py-0.5 font-semibold tabular-nums text-white">#{m.rang}</span>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${m.raison === 'aucun' ? 'bg-red-50 text-red-900' : m.raison === 'peu' ? 'bg-neutral-100 text-neutral-800' : 'bg-amber-50 text-amber-900'}`}>{RAISONS[m.raison]}</span>
          {m.etat === 'a-valider' && <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-900">En cours : à valider</span>}
          {m.composeur > 0 && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-900">Composeur ×{m.composeur}</span>}
        </div>
        <h2 id={`mq-${m.rang}`} className="text-base font-semibold leading-snug">{m.libelle}</h2>
        <p className="text-sm text-neutral-700">{m.texte}</p>
        {m.nomsProfils.length > 0 && <p className="text-xs text-neutral-600">Bloque : {m.nomsProfils.join(', ')}{m.modeles ? ` · ${m.modeles} modèle${m.modeles > 1 ? 's' : ''} en repli` : ''}</p>}
      </header>

      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ce qui existe</p>
        {m.existants.length ? (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {m.existants.map((e) => (
              <li key={e.cle} className="grid w-20 shrink-0 gap-0.5 text-[11px]">
                <div className="mq-svg grid aspect-square place-items-center overflow-hidden rounded-lg ring-1 ring-black/10" style={{ background: 'var(--fond)', color: 'var(--encre)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {e.url ? <img src={e.url} alt="" loading="lazy" className="h-full w-full object-cover" /> : svgs[e.cle] ? <span className="block h-[86%] w-[86%]" dangerouslySetInnerHTML={{ __html: svgs[e.cle] }} /> : <span className="px-1 text-center text-[10px] text-neutral-500">{e.cle.split(':').slice(1).join(' ')}</span>}
                </div>
                <span className="tabular-nums text-neutral-600">{e.aValider ? 'à valider' : e.note !== null ? `${String(e.note).replace('.', ',')} ★` : 'non noté'}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">Rien encore.</p>}
        {(m.enAttente > 0 || m.imports.enAttente > 0) && (
          <Link href={m.lienValider} className="text-sm font-semibold text-violet-900 underline">{m.enAttente + m.imports.enAttente} à juger dans 🎯 À valider →</Link>
        )}
      </div>

      {outils.length > 0 && (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Outil">
            {outils.map((o) => <button key={o} type="button" aria-pressed={o === outil} onClick={() => { setOutil(o); setCopie(''); }} className={puce(o === outil)}>{NOMS_OUTILS[o]}</button>)}
          </div>
          {formats.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Format">
              {formats.map((p) => <button key={p.id} type="button" aria-pressed={p.format === format} onClick={() => setFormat(p.format)} className={puce(p.format === format)}>{p.ratio === '4:5' ? 'Téléphone 4:5' : p.ratio === '16:9' ? 'Ordinateur 16:9' : p.ratio}</button>)}
            </div>
          )}
          {prompt && prompt.outil === 'claude' && <DemandeClaude texte={prompt.texte} titre={`Manque : ${m.libelle}`} />}
          {prompt && raster && (
            <>
              <textarea readOnly value={prompt.texte} rows={7} aria-label={`Prompt ${NOMS_OUTILS[prompt.outil]}`} onFocus={(e) => e.currentTarget.select()}
                className={`w-full rounded-lg border border-neutral-300 bg-neutral-50 p-2 font-mono text-xs leading-relaxed text-neutral-800 ${focus}`} data-prompt={prompt.id} />
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button type="button" onClick={() => void copier()} className={`min-h-12 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white ${focus}`}>Copier le prompt</button>
                {partage && <button type="button" onClick={() => void partager()} className={`min-h-12 rounded-xl border border-teal-800 bg-white px-4 text-sm font-semibold text-teal-900 ${focus}`}>Partager</button>}
              </div>
              {copie && <p role="status" className="text-sm text-teal-900">{copie}</p>}
              <details className="text-sm">
                <summary className="min-h-11 cursor-pointer py-2 text-neutral-700">Ce que demande le prompt (en français)</summary>
                <pre className="whitespace-pre-wrap break-words rounded-lg bg-neutral-50 p-2 text-xs leading-relaxed text-neutral-800">{prompt.rappelFr}</pre>
              </details>
            </>
          )}
          {prompt && <p className="text-xs text-neutral-600">{CONDITIONS[prompt.outil].texte} <a href={CONDITIONS[prompt.outil].url} target="_blank" rel="noreferrer" className="underline">Conditions</a> · rappel indicatif, pas un avis juridique.</p>}
        </div>
      )}
      {!outils.length && <p className="text-sm text-neutral-600">Pas de prompt pour cet emplacement : notez les options existantes dans 🎯 À valider.</p>}

      {raster && prompt && (
        deposer ? (
          <ImportImageGeneree key={prompt.id} migrationManquante={migrationManquante} migration0048Manquante={migration0048Manquante} onFermer={() => setDeposer(false)}
            initial={{
              sujet: m.sujet, hashtags: m.hashtags, prompt: prompt.texte, trou: m.trou, emplacement: 'illustration', usage: 'site', profession,
              outil: prompt.outil, conditions: `${CONDITIONS[prompt.outil].texte} (conditions consultées le ${new Date().toLocaleDateString('fr-FR')})`, conditionsUrl: CONDITIONS[prompt.outil].url,
            }} />
        ) : (
          <button type="button" onClick={() => setDeposer(true)} className={`min-h-12 rounded-xl border-2 border-violet-500 bg-violet-50 px-4 text-base font-semibold text-violet-950 ${focus}`} data-action="deposer">
            Déposer l’image générée
          </button>
        )
      )}
      {(m.imports.acceptes > 0 || m.imports.enAttente > 0) && <p className="text-xs text-neutral-600">Déjà déposées pour ce manque : {m.imports.enAttente} en attente, {m.imports.acceptes} acceptée{m.imports.acceptes > 1 ? 's' : ''}.</p>}
    </article>
  );
}
