'use client';

// Tuile « Inspirations » de l'espace « Donner mon avis » : Paul ajoute une image de référence (fichier, glisser-déposer ou
// capture collée avec Ctrl+V ; lien facultatif), dit ce qui lui plaît, ce qu'on veut en tirer, et l'associe à un sujet et/ou
// un type d'élément. La palette dominante est extraite dans le navigateur (quantifierPalette, 6 couleurs) ; l'image, réduite
// en WebP, va dans le bucket PRIVÉ « inspirations » (URL signées). Synthèse : couleurs récurrentes et gammes CANDIDATES
// (contrastes AA vérifiés), jamais ajoutées automatiquement aux gammes.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  codeGamme, ETIQUETTES_INSPIRATION, gammesCandidates, libelleSujet, OBJECTIF_MAX, palettesRecurrentes, quantifierPalette, REGLE_INSPIRATIONS, SUJETS_VISUELS,
  TYPES_ELEMENT_INSPIRATION, type CouleurPalette,
} from '@plateforme/core';
import { compresser } from '@/lib/envoi-photo';
import type { Inspiration } from '@/lib/inspirations';
import { createClient } from '@/lib/supabase/client';
import { enregistrerInspiration } from './actions-inspirations';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Props = { inspirations: Inspiration[]; migrationManquante: boolean; onRetour: () => void };

/** Palette d'une image : réduite à 160 px de côté, pixels lus dans un canvas */
async function paletteDe(f: Blob): Promise<{ palette: CouleurPalette[]; largeur: number; hauteur: number }> {
  const img = await createImageBitmap(f);
  const e = Math.min(1, 160 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * e));
  c.height = Math.max(1, Math.round(img.height * e));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { palette: quantifierPalette(ctx.getImageData(0, 0, c.width, c.height).data, { n: 6 }), largeur: img.width, hauteur: img.height };
}

function Palette({ palette, grande = false }: { palette: CouleurPalette[]; grande?: boolean }) {
  if (!palette.length) return null;
  return (
    <ul className={`flex overflow-hidden rounded-lg ring-1 ring-black/10 ${grande ? 'h-12' : 'h-4'}`} aria-label="Palette dominante">
      {palette.map((c) => (
        <li key={c.hex} title={`${c.hex} · ${Math.round(c.part * 100)} %`} style={{ background: c.hex, flexGrow: Math.max(c.part, 0.04) }} className="grid min-w-0 place-items-end">
          {grande && <span className="m-1 rounded bg-white/85 px-1 font-mono text-[10px] text-neutral-800">{c.hex}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function Inspirations({ inspirations, migrationManquante, onRetour }: Props) {
  const [liste, setListe] = useState(inspirations);
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [palette, setPalette] = useState<CouleurPalette[]>([]);
  const [dims, setDims] = useState({ largeur: 0, hauteur: 0 });
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [objectif, setObjectif] = useState('');
  const [sujet, setSujet] = useState('');
  const [typeElement, setTypeElement] = useState('');
  const [lien, setLien] = useState('');
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [copie, setCopie] = useState('');
  const entree = useRef<HTMLInputElement>(null);

  const choisir = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setStatut({ ok: false, message: 'Ce fichier n’est pas une image.' }); return; }
    setStatut(null);
    setFichier(f);
    setApercu((a) => { if (a) URL.revokeObjectURL(a); return URL.createObjectURL(f); });
    try {
      const p = await paletteDe(f);
      setPalette(p.palette);
      setDims({ largeur: p.largeur, hauteur: p.hauteur });
    } catch {
      setPalette([]);
      setStatut({ ok: false, message: 'Image illisible : essayez un PNG, un JPEG ou un WebP.' });
    }
  };

  // Capture collée (Ctrl+V / Cmd+V) n'importe où sur la page
  const choisirRef = useRef(choisir);
  choisirRef.current = choisir;
  useEffect(() => {
    const coller = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      const f = item?.getAsFile();
      if (f) { e.preventDefault(); void choisirRef.current(new File([f], 'capture.png', { type: f.type })); }
    };
    window.addEventListener('paste', coller);
    return () => window.removeEventListener('paste', coller);
  }, []);
  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu); }, [apercu]);

  const basculer = (id: string) => setEtiquettes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const peutEnregistrer = Boolean(fichier) && (etiquettes.length > 0 || objectif.trim().length > 0) && !envoi && !migrationManquante;

  const enregistrer = async () => {
    if (!fichier || !peutEnregistrer) return;
    setEnvoi(true);
    setStatut({ ok: true, message: 'Réduction de l’image et envoi dans le stockage privé…' });
    try {
      const blob = await compresser(fichier, null, 1600);
      const chemin = `${crypto.randomUUID()}.webp`;
      const { error } = await createClient().storage.from('inspirations').upload(chemin, blob, { contentType: 'image/webp', cacheControl: '3600' });
      if (error) throw new Error('stockage');
      const r = await enregistrerInspiration(chemin, { etiquettes, objectif, sujet: sujet || null, typeElement: typeElement || null, lien: lien || null, palette }, dims);
      setStatut({ ok: r.ok, message: r.message });
      if (r.ok && r.inspiration) {
        setListe((l) => [r.inspiration!, ...l]);
        setFichier(null); setApercu(null); setPalette([]); setEtiquettes([]); setObjectif(''); setLien('');
      }
    } catch {
      setStatut({ ok: false, message: 'Envoi impossible (stockage privé « inspirations » : migration 0028 à exécuter ?). Réessayez.' });
    } finally {
      setEnvoi(false);
    }
  };

  const recurrentes = useMemo(() => palettesRecurrentes(liste.map((i) => ({ id: i.id, palette: i.palette, sujet: i.sujet }))), [liste]);
  const candidates = useMemo(() => gammesCandidates(recurrentes), [recurrentes]);
  const copier = async (texte: string, id: string) => { try { await navigator.clipboard.writeText(texte); setCopie(id); } catch { setCopie(''); } };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onRetour} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>← Accueil</button>
        <p className="text-sm text-neutral-600">{liste.length} inspiration{liste.length > 1 ? 's' : ''}</p>
      </div>
      <div className="grid gap-1">
        <h2 className="text-2xl font-bold">Inspirations</h2>
        <p className="max-w-3xl text-sm text-neutral-700">Une image qui vous plaît (site, affiche, illustration, publication…) : dites ce qui vous plaît et ce qu’on veut en tirer pour nos visuels.</p>
        <p className="w-fit rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 ring-1 ring-amber-200" role="note">{REGLE_INSPIRATIONS}</p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Migration 0028 à exécuter (<code>supabase/migrations/0028_inspirations_photos_libres.sql</code>) : les inspirations ne peuvent pas encore être enregistrées.</p>
      )}

      <section aria-labelledby="ins-ajout" className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] md:items-start">
        <h3 id="ins-ajout" className="sr-only">Ajouter une inspiration</h3>
        <div className="grid min-w-0 gap-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void choisir(e.dataTransfer.files?.[0] ?? null); }}
            className="grid min-h-56 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-center"
          >
            {apercu ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apercu} alt="Image de référence choisie" className="max-h-[420px] w-full object-contain" />
            ) : (
              <div className="grid gap-2 p-6 text-sm text-neutral-600">
                <span className="font-semibold text-neutral-800">Glissez une image ici, ou collez une capture (Ctrl+V)</span>
                <span>PNG, JPEG ou WebP. Réduite à 1600 px et gardée dans un stockage privé.</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => entree.current?.click()} className={`min-h-11 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold hover:bg-neutral-50 ${focus}`}>Choisir un fichier</button>
            {fichier && <span className="text-xs text-neutral-500">{dims.largeur} × {dims.hauteur} px</span>}
            <input ref={entree} type="file" accept="image/*" className="hidden" onChange={(e) => { void choisir(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </div>
          {palette.length > 0 && (
            <div className="grid gap-1">
              <p className="text-sm font-medium">Palette dominante (extraite automatiquement)</p>
              <Palette palette={palette} grande />
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-sm font-medium text-teal-900">Ce qui me plaît</legend>
            <div className="flex flex-wrap gap-1.5">
              {ETIQUETTES_INSPIRATION.map((e) => {
                const actif = etiquettes.includes(e.id);
                return (
                  <button key={e.id} type="button" aria-pressed={actif} onClick={() => basculer(e.id)}
                    className={`min-h-11 rounded-full border px-3 text-sm ${focus} ${actif ? 'border-teal-700 bg-teal-700 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>{e.libelle}</button>
                );
              })}
            </div>
          </fieldset>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Ce qu’on veut en tirer</span>
            <textarea value={objectif} onChange={(e) => setObjectif(e.target.value)} rows={3} maxLength={OBJECTIF_MAX}
              placeholder="Ex. ces aplats doux pour les illustrations des enfants ; des icônes aussi simples" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base md:text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2 [&>label]:min-w-0">
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="font-medium">Sujet</span>
              <select value={sujet} onChange={(e) => setSujet(e.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
                <option value="">Tous</option>
                {SUJETS_VISUELS.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="font-medium">Type d’élément</span>
              <select value={typeElement} onChange={(e) => setTypeElement(e.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
                <option value="">Tous</option>
                {TYPES_ELEMENT_INSPIRATION.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Lien <span className="font-normal text-neutral-500">(facultatif)</span></span>
            <input type="url" inputMode="url" value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://…" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base md:text-sm" />
          </label>
          <button type="button" onClick={() => void enregistrer()} disabled={!peutEnregistrer}
            className={`min-h-12 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
            {envoi ? 'Enregistrement…' : 'Enregistrer l’inspiration'}
          </button>
          <p role="status" className={`min-h-5 text-sm ${statut && !statut.ok ? 'text-red-800' : 'text-neutral-600'}`}>
            {statut?.message ?? (!fichier ? 'Ajoutez une image pour commencer.' : !etiquettes.length && !objectif.trim() ? 'Choisissez ce qui vous plaît, ou écrivez ce qu’on veut en tirer.' : '')}
          </p>
        </div>
      </section>

      <section aria-labelledby="ins-palettes" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <h3 id="ins-palettes" className="text-lg font-semibold">Palettes récurrentes</h3>
        {recurrentes.length ? (
          <>
            <ul className="flex flex-wrap gap-2">
              {recurrentes.slice(0, 12).map((c) => (
                <li key={c.hex} className="grid justify-items-center gap-1 text-[11px] text-neutral-600">
                  <span className="h-10 w-10 rounded-lg ring-1 ring-black/10" style={{ background: c.hex }} />
                  <span className="font-mono">{c.hex}</span>
                  <span>{c.inspirations} inspirations</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-neutral-600">Gammes candidates : une proposition pour vous et Claude, jamais ajoutée automatiquement aux gammes des sites.</p>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
              {candidates.map((c) => {
                const g = c.gamme;
                return (
                  <li key={g.id} className="grid min-w-0 gap-2 rounded-xl border border-black/10 p-3">
                    <div className="overflow-hidden rounded-lg ring-1 ring-black/10" style={{ background: g.fond }}>
                      <div className="px-3 py-2 text-sm font-bold text-white" style={{ background: g.accent }}>Cabinet de podologie</div>
                      <div className="grid gap-1 px-3 py-2" style={{ background: g.fondDoux }}>
                        <span className="text-sm font-semibold" style={{ color: g.accentFonce }}>Bilan podologique</span>
                        <span className="inline-flex w-fit rounded-md px-2 py-1 text-xs font-semibold text-white" style={{ background: g.accent }}>Prendre rendez-vous</span>
                      </div>
                      <div className="px-3 py-2 font-mono text-xs" style={{ background: g.plan, color: g.signal }}>Lecture de données</div>
                    </div>
                    <p className="text-sm"><strong>{g.nom}</strong> · {c.conforme ? <span className="font-semibold text-teal-900">contrastes AA conformes</span> : <span className="font-semibold text-red-800">{c.defauts.length} défaut(s) AA</span>}</p>
                    <p className="text-xs text-neutral-600">Tirée de {c.origine.join(' + ')} ({c.inspirations} inspirations) · proche de la gamme « {c.proche.nom} »</p>
                    <button type="button" onClick={() => void copier(codeGamme(g), g.id)} className={`min-h-11 rounded-lg border border-neutral-300 px-3 text-sm font-semibold hover:bg-neutral-50 ${focus}`}>
                      {copie === g.id ? 'Code copié : collez-le à Claude' : 'Copier pour Claude'}
                    </button>
                  </li>
                );
              })}
              {!candidates.length && <li className="text-sm text-neutral-500">Pas de couleur vive récurrente pour l’instant (les blancs et gris ne font pas une gamme).</li>}
            </ul>
          </>
        ) : <p className="text-sm text-neutral-500">Il faut au moins deux inspirations aux couleurs proches pour voir apparaître des palettes récurrentes.</p>}
      </section>

      <section aria-labelledby="ins-liste" className="grid gap-3">
        <h3 id="ins-liste" className="text-lg font-semibold">Vos inspirations</h3>
        {liste.length ? (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liste.map((i) => (
              <li key={i.id} className="grid min-w-0 content-start gap-2 rounded-xl border border-black/10 bg-white p-3">
                {i.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image} alt={`Inspiration${i.sujet ? ` · ${libelleSujet(i.sujet)}` : ''}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg bg-neutral-100 object-cover" />
                ) : <div className="grid aspect-[4/3] place-items-center rounded-lg bg-neutral-100 text-xs text-neutral-500">Image indisponible</div>}
                <Palette palette={i.palette} />
                <div className="flex flex-wrap gap-1 text-xs">
                  {i.sujet && <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-900">{libelleSujet(i.sujet)}</span>}
                  {i.typeElement && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">{TYPES_ELEMENT_INSPIRATION.find((t) => t.id === i.typeElement)?.libelle}</span>}
                  {i.etiquettes.map((e) => <span key={e} className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-900">{ETIQUETTES_INSPIRATION.find((x) => x.id === e)?.libelle ?? e}</span>)}
                </div>
                {i.objectif && <p className="text-sm text-neutral-800">{i.objectif}</p>}
                <p className="text-xs text-neutral-500">
                  {new Date(i.le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })}
                  {i.lien && <> · <a href={i.lien} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">source</a></>}
                </p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">Aucune inspiration pour l’instant.</p>}
      </section>
    </div>
  );
}
