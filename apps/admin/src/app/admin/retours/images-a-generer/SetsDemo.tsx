'use client';

// SETS DÉMO (packages/core/src/prompts-images.ts, construirePromptSet) : « Set démo cabinet » (salle d'attente, accueil, salle de soins,
// autoclave, instruments en sachets, podoscope, bureau, lavage des mains, ambiance, façade neutre ; galerie 4:3, panorama 16:9,
// téléphone 4:5 ; même série) et « Set praticiens fictifs » (portrait 4:5 et en situation, diversité, mention du fictif). Prompt prêt
// à copier, puis « Importer le set » : import EN LOT, usage « Démo uniquement », emplacement du prompt. Aucun appel à un service d'IA.
import { useMemo, useState } from 'react';
import {
  construirePromptSet, formatSet, PERSONAS_FICTIFS, REGLES_SETS_DEMO, SETS_CABINET, SITUATIONS_PRATICIENS, type LanguePrompt, type StylePrompt,
} from '@plateforme/core';
import ImportImageGeneree, { type ValeursImport } from './ImportImageGeneree';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const puce = (actif: boolean) => `min-h-11 rounded-full border px-3 text-sm font-semibold ${actif ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'} ${focus}`;

type Reglages = { gamme: string; langue: LanguePrompt; style: StylePrompt };

function Copier({ texte }: { texte: string }) {
  const [fait, setFait] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(texte); setFait(true); setTimeout(() => setFait(false), 1800); } catch { setFait(false); } }}
      className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>
      {fait ? 'Copié' : 'Copier le prompt'}
    </button>
  );
}

export default function SetsDemo({ reglages, migrationManquante, migration0048Manquante, profession = 'podologue' }: { reglages: Reglages; migrationManquante: boolean; migration0048Manquante: boolean; profession?: string }) {
  const [set, setSet] = useState<'cabinet' | 'praticiens'>('cabinet');
  const scenes = set === 'cabinet' ? SETS_CABINET[profession] ?? [] : SITUATIONS_PRATICIENS;
  const [sceneId, setScene] = useState<Record<string, string>>({ cabinet: 'salle-attente', praticiens: 'portrait' });
  const scene = scenes.find((s) => s.id === sceneId[set]) ?? scenes[0];
  const [formatChoisi, setFormat] = useState<string>('galerie');
  const format = scene && scene.formats.includes(formatChoisi) ? formatChoisi : scene?.formats[0] ?? 'galerie';
  const [persona, setPersona] = useState(PERSONAS_FICTIFS[0].id);
  const [variante, setVariante] = useState(0);
  const [importer, setImporter] = useState<ValeursImport | null>(null);
  const r = useMemo(() => (scene ? construirePromptSet({ set, profession, scene: scene.id, format, persona, variante, gamme: reglages.gamme, langue: reglages.langue, style: reglages.style }) : null),
    [set, profession, scene, format, persona, variante, reglages]);

  return (
    <section aria-labelledby="sets-demo" className="grid gap-3 rounded-xl border border-black/5 bg-white p-3 md:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="sets-demo" className="text-lg font-semibold">Sets démo : kit de base des modèles</h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950 ring-1 ring-amber-300">Démo uniquement · jamais publié</span>
      </div>
      <p className="max-w-3xl text-sm text-neutral-600">
        Un cabinet et des praticiens FICTIFS pour que tous les aperçus (Studio, atelier, recettes, dégustation, parcours) aient l’air complets.
        Importez la série en une fois ; acceptées et notées 3 ★ ou plus, ces images remplacent les silhouettes dans les aperçus. Sur un site publié,
        seules les vraies photos du praticien apparaissent, sinon ses illustrations.
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">Règles des sets démo</summary>
        <ul className="mt-1 list-disc pl-5 text-neutral-700">{REGLES_SETS_DEMO.map((c) => <li key={c}>{c}</li>)}</ul>
      </details>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Set">
        <button type="button" aria-pressed={set === 'cabinet'} onClick={() => { setSet('cabinet'); setImporter(null); }} className={puce(set === 'cabinet')}>Set démo cabinet</button>
        <button type="button" aria-pressed={set === 'praticiens'} onClick={() => { setSet('praticiens'); setImporter(null); }} className={puce(set === 'praticiens')}>Set praticiens fictifs</button>
      </div>
      <div className="grid gap-1 text-sm">
        <span className="font-medium">{set === 'cabinet' ? 'Pièce ou détail' : 'Situation'}</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label={set === 'cabinet' ? 'Pièce ou détail' : 'Situation'}>
          {scenes.map((s) => <button key={s.id} type="button" aria-pressed={s.id === scene?.id} onClick={() => setScene((x) => ({ ...x, [set]: s.id }))} className={puce(s.id === scene?.id)}>{s.libelle}</button>)}
        </div>
      </div>
      {set === 'praticiens' && (
        <div className="grid gap-1 text-sm">
          <span className="font-medium">Praticien fictif</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Praticien fictif">
            {PERSONAS_FICTIFS.map((p) => <button key={p.id} type="button" aria-pressed={p.id === persona} onClick={() => setPersona(p.id)} className={puce(p.id === persona)}>{p.libelle}</button>)}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Format">
        <span className="text-xs text-neutral-600">Format :</span>
        {(scene?.formats ?? []).map((f) => <button key={f} type="button" aria-pressed={f === format} onClick={() => setFormat(f)} className={puce(f === format)}>{formatSet(f)?.libelle} · {formatSet(f)?.ratio}</button>)}
        {set === 'cabinet' && <>
          <span className="ml-2 text-xs text-neutral-600">Angle :</span>
          {[0, 1, 2].map((v) => <button key={v} type="button" aria-pressed={v === variante} onClick={() => setVariante(v)} className={puce(v === variante)}>{v + 1}</button>)}
        </>}
      </div>
      {r && (r.ok ? (
        <>
          <textarea readOnly value={r.texte} rows={reglages.style === 'midjourney' ? 6 : 10} aria-label="Prompt du set prêt à copier"
            className={`w-full rounded-lg border border-neutral-300 bg-neutral-50 p-2 font-mono text-xs leading-relaxed text-neutral-800 ${focus}`} />
          <div className="flex flex-wrap items-center gap-2">
            <Copier texte={r.texte} />
            <button type="button" onClick={() => setImporter(importer ? null : {
              sujet: 'general', prompt: r.texte, emplacement: r.emplacement, usage: 'demo', profession, trou: null,
              hashtags: ['image-generee', set === 'cabinet' ? 'demo-cabinet' : 'demo-praticien'],
            })} className={`min-h-11 rounded-xl border border-violet-400 bg-white px-4 text-sm font-semibold text-violet-950 hover:bg-violet-50 ${focus}`}>
              Importer le set (en lot)
            </button>
            <span className="text-xs text-neutral-600">Emplacement proposé : {r.emplacement} · usage « Démo uniquement »</span>
          </div>
        </>
      ) : <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-900 ring-1 ring-red-200">Prompt refusé : {r.refus.join(' ')}</p>)}
      {importer && <ImportImageGeneree key={`${importer.emplacement}|${scene?.id}`} initial={importer} migrationManquante={migrationManquante} migration0048Manquante={migration0048Manquante} onFermer={() => setImporter(null)} />}
    </section>
  );
}
