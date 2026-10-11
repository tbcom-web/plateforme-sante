'use client';

// « Importer une image générée » (couche 1, curation) : un fichier ou un LOT (set de 8 à 12 images, mêmes métadonnées) depuis
// l'ordinateur ou le téléphone, déclaration de Paul (outil, date de génération, prompt utilisé, conditions d'utilisation de l'outil +
// lien, vérifications), USAGE obligatoire (« Démo uniquement » par défaut pour le cabinet et les praticiens / « Utilisable sur les
// sites » pour une image générique, case dédiée), EMPLACEMENT (galerie cabinet démo, portrait démo, hygiène, matériel…), sujet et
// hashtags pré-cochés. Contrôles dans le navigateur (type réel, dimensions, localisation EXIF) puis sur le serveur (route importer/,
// un envoi par fichier, même lot). Au-delà de 4 Mo, l'image est réencodée en JPEG dans le navigateur pour passer la limite d'envoi.
import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AVERTISSEMENT_CONDITIONS, CONSEILS_SELECTION, contientGpsExif, declarationSans0048, emplacementIa, EMPLACEMENTS_IA, GRAND_COTE_MIN_IA, libelleSujetKit,
  libelleVerificationImage, LIBELLES_USAGES_IA, LOT_MAX_IA, OUTILS_IA, PETIT_COTE_MIN_IA, SUJETS_KITS, TAILLE_MAX_FICHIER_CHOISI, TAILLE_MAX_IMAGE_GENEREE,
  typeImageDepuisOctets, usageParDefaut, validerDeclarationIa, type DeclarationIa, type UsageImageGeneree,
} from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const champ = `min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm ${focus}`;
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const nouveauLot = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');

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

/** `outil`, `conditions`, `conditionsUrl` : préremplis par l'Atelier des manques (outil du prompt copié, rappel de ses conditions) */
export type ValeursImport = { sujet: string; hashtags: string[]; prompt: string; trou?: string | null; emplacement?: string; usage?: UsageImageGeneree; profession?: string; outil?: string; conditions?: string; conditionsUrl?: string };

type Choisi = { id: string; fichier: File; apercu: string; l: number; h: number; etat: 'pret' | 'envoi' | 'ok' | 'erreur'; message?: string };

/** Contrôle d'un fichier dans le navigateur : erreur lisible, ou dimensions */
async function controler(f: File): Promise<{ l: number; h: number } | string> {
  if (f.size > TAILLE_MAX_FICHIER_CHOISI) return 'Fichier trop lourd (30 Mo au plus).';
  const debut = new Uint8Array(await f.slice(0, 512 * 1024).arrayBuffer());
  if (!typeImageDepuisOctets(debut)) return 'Format refusé : PNG, JPEG ou WebP seulement.';
  if (contientGpsExif(debut)) return 'Localisation GPS dans les métadonnées : c’est une photo d’appareil, pas une image générée. Refusée.';
  try {
    const img = await createImageBitmap(f);
    if (Math.max(img.width, img.height) < GRAND_COTE_MIN_IA || Math.min(img.width, img.height) < PETIT_COTE_MIN_IA)
      return `Image trop petite (${img.width} × ${img.height} px) : grand côté ${GRAND_COTE_MIN_IA} px et petit côté ${PETIT_COTE_MIN_IA} px au moins.`;
    return { l: img.width, h: img.height };
  } catch { return 'Image illisible.'; }
}

export default function ImportImageGeneree({ initial, migrationManquante, migration0048Manquante = false, onFermer }: {
  initial: ValeursImport; migrationManquante: boolean; migration0048Manquante?: boolean; onFermer?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [choisis, setChoisis] = useState<Choisi[]>([]);
  const [refuses, setRefuses] = useState<string[]>([]);
  const [sujet, setSujet] = useState(initial.sujet);
  const [tags, setTags] = useState<string[]>(initial.hashtags);
  const [emplacement, setEmplacement] = useState(initial.emplacement ?? 'illustration');
  const [usage, setUsage] = useState<UsageImageGeneree>(initial.usage ?? usageParDefaut(initial.emplacement ?? 'illustration'));
  const [generiqueConfirme, setGeneriqueConfirme] = useState(false);
  const [outil, setOutil] = useState(initial.outil ?? 'chatgpt');
  const [outilAutre, setOutilAutre] = useState('');
  const [genereLe, setGenereLe] = useState(aujourdhui());
  const [prompt, setPrompt] = useState(initial.prompt);
  const [conditions, setConditions] = useState(initial.conditions ?? '');
  const [conditionsUrl, setConditionsUrl] = useState(initial.conditionsUrl ?? '');
  const [conditionsVerifiees, setConditionsVerifiees] = useState(false);
  const [imageVerifiee, setImageVerifiee] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Lot : un identifiant par ouverture du formulaire (toute la série importée ici partage le même lot)
  const [lot] = useState(nouveauLot);
  useEffect(() => () => { for (const c of choisis) URL.revokeObjectURL(c.apercu); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const e = emplacementIa(emplacement);
  const avecLot = !(usage === 'site' && emplacement === 'illustration');
  const declaration: Partial<DeclarationIa> = useMemo(() => ({
    sujet, outil, outilAutre, genereLe, prompt, conditions, conditionsUrl, conditionsVerifiees, imageVerifiee, hashtags: tags, trou: initial.trou ?? null,
    usage, emplacement, profession: initial.profession ?? 'podologue', lot: avecLot ? lot : null, generiqueConfirme,
  }), [sujet, outil, outilAutre, genereLe, prompt, conditions, conditionsUrl, conditionsVerifiees, imageVerifiee, tags, initial.trou, initial.profession, usage, emplacement, avecLot, lot, generiqueConfirme]);
  const attend0048 = migration0048Manquante && !declarationSans0048({ usage, emplacement, lot: avecLot ? lot : null });

  const choisirEmplacement = (x: string) => { setEmplacement(x); setUsage(usageParDefaut(x)); setGeneriqueConfirme(false); };

  const ajouter = async (liste: FileList | null) => {
    setMessage(null);
    const fichiers = [...(liste ?? [])];
    const place = LOT_MAX_IA - choisis.filter((c) => c.etat !== 'ok').length;
    const pris = fichiers.slice(0, Math.max(0, place));
    const ref: string[] = fichiers.length > pris.length ? [`${fichiers.length - pris.length} fichier(s) en trop : ${LOT_MAX_IA} images au plus par lot.`] : [];
    const nouveaux: Choisi[] = [];
    for (const f of pris) {
      const r = await controler(f);
      if (typeof r === 'string') { ref.push(`${f.name} : ${r}`); continue; }
      nouveaux.push({ id: `${f.name}-${f.size}-${f.lastModified}`, fichier: f, apercu: URL.createObjectURL(f), l: r.l, h: r.h, etat: 'pret' });
    }
    setRefuses(ref);
    setChoisis((l) => [...l.filter((c) => c.etat !== 'ok'), ...nouveaux.filter((n) => !l.some((c) => c.id === n.id))]);
  };
  const retirer = (cid: string) => setChoisis((l) => { const c = l.find((x) => x.id === cid); if (c) URL.revokeObjectURL(c.apercu); return l.filter((x) => x.id !== cid); });

  const envoyer = async () => {
    const v = validerDeclarationIa(declaration);
    const aEnvoyer = choisis.filter((c) => c.etat === 'pret' || c.etat === 'erreur');
    if (!aEnvoyer.length) { setMessage({ ok: false, texte: 'Choisissez une ou plusieurs images.' }); return; }
    if (!v.declaration) { setMessage({ ok: false, texte: v.erreurs.join(' ') }); return; }
    setEnvoi(true);
    let reussis = 0;
    // Un envoi par fichier (limite de 4 Mo par requête), mêmes métadonnées et même lot
    for (const [k, c] of aEnvoyer.entries()) {
      setMessage({ ok: true, texte: `Envoi ${k + 1} / ${aEnvoyer.length} : conversion WebP sans métadonnées et hébergement…` });
      setChoisis((l) => l.map((x) => (x.id === c.id ? { ...x, etat: 'envoi', message: undefined } : x)));
      let r: { ok: boolean; message: string };
      try {
        const corps = c.fichier.size > TAILLE_MAX_IMAGE_GENEREE ? await reencoder(c.fichier) : c.fichier;
        const form = new FormData();
        form.set('fichier', corps, c.fichier.size > TAILLE_MAX_IMAGE_GENEREE ? 'image.jpg' : c.fichier.name);
        form.set('declaration', JSON.stringify(v.declaration));
        const rep = await fetch('/admin/retours/images-a-generer/importer', { method: 'POST', body: form });
        const j = (await rep.json().catch(() => null)) as { ok: boolean; message: string } | null;
        r = { ok: Boolean(j?.ok), message: j?.message ?? `Erreur ${rep.status}.` };
      } catch {
        r = { ok: false, message: 'Envoi impossible (connexion ou image trop lourde).' };
      }
      if (r.ok) reussis++;
      setChoisis((l) => l.map((x) => (x.id === c.id ? { ...x, etat: r.ok ? 'ok' : 'erreur', message: r.message } : x)));
    }
    setEnvoi(false);
    const echecs = aEnvoyer.length - reussis;
    setMessage({ ok: !echecs, texte: `${reussis} image${reussis > 1 ? 's' : ''} importée${reussis > 1 ? 's' : ''} « à valider »${usage === 'demo' ? ', Démo uniquement' : ''}${echecs ? ` ; ${echecs} en échec (motif sous chaque image, réessayez)` : ''}.${reussis && usage === 'demo' ? ' Acceptez-les dans Arrivages et notez-les : 3 ★ ou plus, elles entrent dans le kit démo des aperçus.' : ''}` });
    if (reussis) router.refresh();
  };

  const basculer = (t: string) => setTags((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  const prets = choisis.filter((c) => c.etat === 'pret' || c.etat === 'erreur').length;

  return (
    <form className="grid gap-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3 md:p-4" onSubmit={(ev) => { ev.preventDefault(); void envoyer(); }} aria-label="Importer une image générée">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">Importer une image générée</h3>
        {onFermer && <button type="button" onClick={onFermer} className={`min-h-11 rounded-lg px-3 text-sm text-neutral-700 hover:bg-white ${focus}`}>Fermer</button>}
      </div>
      {migrationManquante && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200">Migration à exécuter (<code>0040_images_generees.sql</code>) : l’import sera possible après.</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid content-start gap-1 text-sm">
          <span className="font-medium">Emplacement</span>
          <select value={emplacement} onChange={(x) => choisirEmplacement(x.target.value)} className={champ}>
            {(['cabinet', 'praticien', 'generique'] as const).map((g) => (
              <optgroup key={g} label={g === 'cabinet' ? 'Cabinet (démo)' : g === 'praticien' ? 'Praticiens fictifs (démo)' : 'Images génériques'}>
                {EMPLACEMENTS_IA.filter((x) => x.groupe === g).map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-1 text-sm">
          <legend className="font-medium">Usage (obligatoire)</legend>
          <div className="grid gap-1.5">
            {(['demo', 'site'] as const).map((u) => {
              const permis = Boolean(e?.usages.includes(u));
              return (
                <label key={u} className={`flex min-h-11 items-start gap-2 rounded-lg border px-3 py-2 ${usage === u ? 'border-teal-800 bg-white' : 'border-neutral-300 bg-white/60'} ${permis ? '' : 'opacity-50'}`}>
                  <input type="radio" name={`${id}-usage`} className="mt-1 size-4" checked={usage === u} disabled={!permis} onChange={() => { setUsage(u); setGeneriqueConfirme(false); }} />
                  <span>{LIBELLES_USAGES_IA[u]}{u === 'demo' && <span className="block text-xs text-neutral-600">Aperçus seulement (Studio, atelier, parcours) ; jamais sur un site publié.</span>}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
      {e && e.groupe !== 'generique' && (
        <p className="rounded-lg bg-white p-2 text-xs text-neutral-700 ring-1 ring-black/5">
          Cabinet ou praticien FICTIF : « Démo uniquement ». Le site publié d’un praticien ne montre que ses vraies photos (cabinet, portrait), sinon ses illustrations.
        </p>
      )}
      {usage === 'site' && e?.groupe === 'generique' && emplacement !== 'illustration' && (
        <label className="flex items-start gap-2 rounded-lg bg-white p-2 text-sm ring-1 ring-amber-200">
          <input type="checkbox" className="mt-1 size-5" checked={generiqueConfirme} onChange={(x) => setGeneriqueConfirme(x.target.checked)} />
          <span>Image générique (gros plan, aucune pièce identifiable) : elle ne sera jamais présentée comme le cabinet du praticien (légende neutre, jamais dans la galerie « Le cabinet »), avec la mention « image générée » des crédits.</span>
        </label>
      )}
      {attend0048 && <p role="alert" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200">Migration à exécuter (<code>0048_images_generees_usage.sql</code>) : l’usage « Démo uniquement », les emplacements et l’import en lot l’attendent. Les prompts restent utilisables.</p>}

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Images (PNG, JPEG ou WebP ; une ou plusieurs, {LOT_MAX_IA} au plus : même set, mêmes informations)</span>
        <input id={`${id}-f`} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(x) => { void ajouter(x.target.files); x.target.value = ''; }}
          className={`block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-teal-800 file:px-3 file:font-semibold file:text-white ${focus}`} />
      </label>
      {refuses.length > 0 && <ul role="alert" className="list-disc rounded-lg bg-red-50 p-2 pl-6 text-xs text-red-900 ring-1 ring-red-200">{refuses.map((r) => <li key={r}>{r}</li>)}</ul>}
      {choisis.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="Images choisies">
          {choisis.map((c) => (
            <li key={c.id} className="relative grid content-start gap-1 rounded-lg bg-white p-1.5 text-xs ring-1 ring-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.apercu} alt={`Image choisie : ${c.fichier.name}`} className="aspect-[4/3] w-full rounded object-cover" />
              <span className="truncate">{c.l} × {c.h} px{c.fichier.size > TAILLE_MAX_IMAGE_GENEREE ? ' · réencodée' : ''}</span>
              <span className={c.etat === 'ok' ? 'font-semibold text-teal-900' : c.etat === 'erreur' ? 'text-red-800' : 'text-neutral-600'}>
                {c.etat === 'pret' ? 'Prête' : c.etat === 'envoi' ? 'Envoi…' : c.etat === 'ok' ? 'Importée' : c.message ?? 'Échec'}
              </span>
              {c.etat !== 'envoi' && c.etat !== 'ok' && (
                <button type="button" onClick={() => retirer(c.id)} aria-label={`Retirer ${c.fichier.name}`} className={`absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full bg-white/95 text-base ring-1 ring-black/10 ${focus}`}>×</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {avecLot && <p className="text-xs text-neutral-600">Lot <code>{lot}</code> : toutes les images importées depuis ce formulaire forment une même série (cohérence du kit démo).</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Sujet</span>
          <select value={sujet} onChange={(x) => setSujet(x.target.value)} className={champ}>
            {SUJETS_KITS.map((s) => <option key={s} value={s}>{libelleSujetKit(s)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Date de génération</span>
          <input type="date" value={genereLe} max={aujourdhui()} onChange={(x) => setGenereLe(x.target.value)} className={champ} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Outil utilisé</span>
          <select value={outil} onChange={(x) => setOutil(x.target.value)} className={champ}>
            {OUTILS_IA.map((o) => <option key={o.id} value={o.id}>{o.libelle}</option>)}
          </select>
        </label>
        {outil === 'autre' && (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Nom de l’outil</span>
            <input value={outilAutre} onChange={(x) => setOutilAutre(x.target.value)} maxLength={60} className={champ} />
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
        <textarea value={prompt} onChange={(x) => setPrompt(x.target.value)} rows={4} maxLength={4000} className={`${champ} py-2`} />
      </label>

      <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-950 ring-1 ring-amber-200">{AVERTISSEMENT_CONDITIONS}</p>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Conditions d’utilisation de l’outil (résumé)</span>
        <textarea value={conditions} onChange={(x) => setConditions(x.target.value)} rows={2} maxLength={1000} placeholder="Ex. : conditions consultées le …, usage commercial autorisé pour mon abonnement, aucune mention obligatoire."
          className={`${champ} py-2`} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Lien des conditions (facultatif, https)</span>
        <input type="url" inputMode="url" value={conditionsUrl} onChange={(x) => setConditionsUrl(x.target.value)} placeholder="https://…" className={champ} />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-5" checked={conditionsVerifiees} onChange={(x) => setConditionsVerifiees(x.target.checked)} />
        <span>J’ai vérifié que les conditions de l’outil autorisent l’usage commercial de {choisis.length > 1 ? 'ces images' : 'cette image'}.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-5" checked={imageVerifiee} onChange={(x) => setImageVerifiee(x.target.checked)} />
        <span>{libelleVerificationImage(emplacement)}{choisis.length > 1 ? ' (chaque image du lot)' : ''}</span>
      </label>
      <details className="text-xs text-neutral-700">
        <summary className="cursor-pointer">Conseils de sélection</summary>
        <ul className="mt-1 list-disc pl-5">{CONSEILS_SELECTION.map((c) => <li key={c}>{c}</li>)}</ul>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={envoi || migrationManquante || attend0048 || !prets}
          className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
          {envoi ? 'Import en cours…' : prets > 1 ? `Importer les ${prets} images « à valider »` : 'Importer « à valider »'}
        </button>
        <span className="text-xs text-neutral-600">Auteur : Paul · source « image générée par IA » · WebP sans métadonnées · {usage === 'demo' ? 'Démo uniquement' : 'utilisable sur les sites'}</span>
      </div>
      {message && <p role="status" className={`rounded-lg p-2 text-sm ring-1 ${message.ok ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-red-50 text-red-900 ring-red-200'}`}>{message.texte}</p>}
    </form>
  );
}
