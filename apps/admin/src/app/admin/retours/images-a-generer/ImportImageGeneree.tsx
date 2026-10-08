'use client';

// « Importer une image générée » (couche 1, curation) : fichier depuis l'ordinateur ou le téléphone, déclaration de Paul (outil, date de
// génération, prompt utilisé, conditions d'utilisation de l'outil + lien, vérifications), sujet et hashtags du trou pré-cochés. Contrôles
// dans le navigateur (type réel, dimensions, localisation EXIF) puis sur le serveur (route importer/). Au-delà de 4 Mo, l'image est
// réencodée en JPEG dans le navigateur (après le contrôle de localisation) pour passer la limite d'envoi.
import { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AVERTISSEMENT_CONDITIONS, CONSEILS_SELECTION, contientGpsExif, GRAND_COTE_MIN_IA, libelleSujetKit, OUTILS_IA, PETIT_COTE_MIN_IA, SUJETS_KITS, TAILLE_MAX_FICHIER_CHOISI,
  TAILLE_MAX_IMAGE_GENEREE, typeImageDepuisOctets, validerDeclarationIa, type DeclarationIa,
} from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const champ = `min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm ${focus}`;
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/** Réencode en JPEG (grand côté 2560 px au plus) pour rester sous la limite d'envoi ; les métadonnées disparaissent */
async function reencoder(f: Blob): Promise<Blob> {
  const img = await createImageBitmap(f);
  const k = Math.min(1, 2560 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.92, 0.85, 0.78]) {
    const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', q));
    if (b && b.size <= TAILLE_MAX_IMAGE_GENEREE) return b;
  }
  throw new Error('trop lourd');
}

export type ValeursImport = { sujet: string; hashtags: string[]; prompt: string; trou?: string | null };

export default function ImportImageGeneree({ initial, migrationManquante, onFermer }: { initial: ValeursImport; migrationManquante: boolean; onFermer?: () => void }) {
  const router = useRouter();
  const id = useId();
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [dims, setDims] = useState<{ l: number; h: number } | null>(null);
  const [sujet, setSujet] = useState(initial.sujet);
  const [tags, setTags] = useState<string[]>(initial.hashtags);
  const [outil, setOutil] = useState('chatgpt');
  const [outilAutre, setOutilAutre] = useState('');
  const [genereLe, setGenereLe] = useState(aujourdhui());
  const [prompt, setPrompt] = useState(initial.prompt);
  const [conditions, setConditions] = useState('');
  const [conditionsUrl, setConditionsUrl] = useState('');
  const [conditionsVerifiees, setConditionsVerifiees] = useState(false);
  const [imageVerifiee, setImageVerifiee] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const declaration: Partial<DeclarationIa> = useMemo(() => ({ sujet, outil, outilAutre, genereLe, prompt, conditions, conditionsUrl, conditionsVerifiees, imageVerifiee, hashtags: tags, trou: initial.trou ?? null }),
    [sujet, outil, outilAutre, genereLe, prompt, conditions, conditionsUrl, conditionsVerifiees, imageVerifiee, tags, initial.trou]);

  const choisir = async (f: File | null) => {
    setMessage(null); setFichier(null); setDims(null);
    if (apercu) URL.revokeObjectURL(apercu);
    setApercu(null);
    if (!f) return;
    if (f.size > TAILLE_MAX_FICHIER_CHOISI) { setMessage({ ok: false, texte: 'Fichier trop lourd (30 Mo au plus).' }); return; }
    const debut = new Uint8Array(await f.slice(0, 512 * 1024).arrayBuffer());
    if (!typeImageDepuisOctets(debut)) { setMessage({ ok: false, texte: 'Format refusé : PNG, JPEG ou WebP seulement.' }); return; }
    if (contientGpsExif(debut)) { setMessage({ ok: false, texte: 'Localisation GPS dans les métadonnées : c’est une photo d’appareil, pas une image générée. Refusée.' }); return; }
    try {
      const img = await createImageBitmap(f);
      setDims({ l: img.width, h: img.height });
      if (Math.max(img.width, img.height) < GRAND_COTE_MIN_IA || Math.min(img.width, img.height) < PETIT_COTE_MIN_IA) {
        setMessage({ ok: false, texte: `Image trop petite (${img.width} × ${img.height} px) : grand côté ${GRAND_COTE_MIN_IA} px et petit côté ${PETIT_COTE_MIN_IA} px au moins.` });
        return;
      }
    } catch { setMessage({ ok: false, texte: 'Image illisible.' }); return; }
    setFichier(f);
    setApercu(URL.createObjectURL(f));
  };

  const envoyer = async () => {
    const v = validerDeclarationIa(declaration);
    if (!fichier) { setMessage({ ok: false, texte: 'Choisissez une image.' }); return; }
    if (!v.declaration) { setMessage({ ok: false, texte: v.erreurs.join(' ') }); return; }
    setEnvoi(true);
    setMessage({ ok: true, texte: 'Envoi, conversion WebP sans métadonnées et hébergement…' });
    try {
      const corps = fichier.size > TAILLE_MAX_IMAGE_GENEREE ? await reencoder(fichier) : fichier;
      const form = new FormData();
      form.set('fichier', corps, fichier.size > TAILLE_MAX_IMAGE_GENEREE ? 'image.jpg' : fichier.name);
      form.set('declaration', JSON.stringify(v.declaration));
      const r = await fetch('/admin/retours/images-a-generer/importer', { method: 'POST', body: form });
      const j = (await r.json().catch(() => null)) as { ok: boolean; message: string } | null;
      setMessage({ ok: Boolean(j?.ok), texte: j?.message ?? `Erreur ${r.status}.` });
      if (j?.ok) { setFichier(null); router.refresh(); }
    } catch {
      setMessage({ ok: false, texte: 'Envoi impossible (connexion ou image trop lourde). Réessayez.' });
    } finally {
      setEnvoi(false);
    }
  };

  const basculer = (t: string) => setTags((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));

  return (
    <form className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3 md:p-4" onSubmit={(e) => { e.preventDefault(); void envoyer(); }} aria-label="Importer une image générée">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">Importer une image générée</h3>
        {onFermer && <button type="button" onClick={onFermer} className={`min-h-11 rounded-lg px-3 text-sm text-neutral-700 hover:bg-white ${focus}`}>Fermer</button>}
      </div>
      {migrationManquante && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200">Migration à exécuter (<code>0040_images_generees.sql</code>) : l’import sera possible après.</p>}

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Image (PNG, JPEG ou WebP ; ordinateur ou téléphone)</span>
        <input id={`${id}-f`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void choisir(e.target.files?.[0] ?? null)}
          className={`block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-teal-800 file:px-3 file:font-semibold file:text-white ${focus}`} />
      </label>
      {apercu && (
        <figure className="grid gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apercu} alt="Image générée choisie" className="max-h-64 w-auto max-w-full rounded-lg object-contain ring-1 ring-black/10" />
          <figcaption className="text-xs text-neutral-600">{dims ? `${dims.l} × ${dims.h} px` : ''}{fichier && fichier.size > TAILLE_MAX_IMAGE_GENEREE ? ' · sera réencodée (plus de 4 Mo)' : ''}</figcaption>
        </figure>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Sujet</span>
          <select value={sujet} onChange={(e) => setSujet(e.target.value)} className={champ}>
            {SUJETS_KITS.map((s) => <option key={s} value={s}>{libelleSujetKit(s)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Date de génération</span>
          <input type="date" value={genereLe} max={aujourdhui()} onChange={(e) => setGenereLe(e.target.value)} className={champ} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Outil utilisé</span>
          <select value={outil} onChange={(e) => setOutil(e.target.value)} className={champ}>
            {OUTILS_IA.map((o) => <option key={o.id} value={o.id}>{o.libelle}</option>)}
          </select>
        </label>
        {outil === 'autre' && (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Nom de l’outil</span>
            <input value={outilAutre} onChange={(e) => setOutilAutre(e.target.value)} maxLength={60} className={champ} />
          </label>
        )}
      </div>

      <fieldset className="grid gap-1 text-sm">
        <legend className="font-medium">Hashtags</legend>
        <div className="flex flex-wrap gap-2">
          {[...new Set([...initial.hashtags, ...tags])].map((t) => (
            <label key={t} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-300 bg-white px-3">
              <input type="checkbox" checked={tags.includes(t)} onChange={() => basculer(t)} /> #{t}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Prompt utilisé</span>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={4000} className={`${champ} py-2`} />
      </label>

      <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-950 ring-1 ring-amber-200">{AVERTISSEMENT_CONDITIONS}</p>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Conditions d’utilisation de l’outil (résumé)</span>
        <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={2} maxLength={1000} placeholder="Ex. : conditions consultées le …, usage commercial autorisé pour mon abonnement, aucune mention obligatoire."
          className={`${champ} py-2`} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Lien des conditions (facultatif, https)</span>
        <input type="url" inputMode="url" value={conditionsUrl} onChange={(e) => setConditionsUrl(e.target.value)} placeholder="https://…" className={champ} />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-5" checked={conditionsVerifiees} onChange={(e) => setConditionsVerifiees(e.target.checked)} />
        <span>J’ai vérifié que les conditions de l’outil autorisent l’usage commercial de cette image.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-5" checked={imageVerifiee} onChange={(e) => setImageVerifiee(e.target.checked)} />
        <span>J’ai vérifié l’image : cinq orteils par pied, mains correctes, aucun texte, aucun visage reconnaissable, aucune marque.</span>
      </label>
      <details className="text-xs text-neutral-700">
        <summary className="cursor-pointer">Conseils de sélection</summary>
        <ul className="mt-1 list-disc pl-5">{CONSEILS_SELECTION.map((c) => <li key={c}>{c}</li>)}</ul>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={envoi || migrationManquante || !fichier}
          className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
          {envoi ? 'Import en cours…' : 'Importer « à valider »'}
        </button>
        <span className="text-xs text-neutral-600">Auteur : Paul · source « image générée par IA » · WebP sans métadonnées</span>
      </div>
      {message && <p role="status" className={`rounded-lg p-2 text-sm ring-1 ${message.ok ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-red-50 text-red-900 ring-red-200'}`}>{message.texte}</p>}
    </form>
  );
}
