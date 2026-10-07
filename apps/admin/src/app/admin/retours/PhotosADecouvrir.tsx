'use client';

// Tuile « Photos à découvrir » : une photo candidate Pexels / Pixabay à la fois (vignette servie par la source pendant
// l'évaluation, ce que les deux licences autorisent), auteur, source et lien ; GARDER / REJETER, étiquettes, sujet cible.
// GARDER : la photo est hébergée chez nous (WebP, sans EXIF) avec sa traçabilité, statut « à valider » (Jeux de photos).
// Les sites n'utilisent jamais un lien direct vers Pexels ou Pixabay. Charte : pas de visage reconnaissable mis en avant,
// rien qui laisse croire à un patient réel (étiquettes bloquantes).
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cleCandidat, ETIQUETTES_BLOQUANTES, ETIQUETTES_DECOUVERTE, LICENCES_SOURCES, orientation, SOURCES_PHOTOS_LIBRES, SUJETS_VISUELS, APERCUS_TRAITEMENTS_IMAGES,
  type SourcePhotoLibre,
} from '@plateforme/core';
import { candidatsPhotos, deciderPhoto, enregistrerMotsCles, type CandidatAffiche } from './actions-photos';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Props = {
  sources: Record<SourcePhotoLibre, boolean>;
  /** Mots-clés effectifs par sujet (base, sinon valeurs par défaut du core) */
  motsCles: Record<string, string[]>;
  migrationManquante: boolean;
  onRetour: () => void;
};

export default function PhotosADecouvrir({ sources, motsCles: motsClesInitiaux, migrationManquante, onRetour }: Props) {
  const configurees = SOURCES_PHOTOS_LIBRES.filter((s) => sources[s]);
  const [sujet, setSujet] = useState('sport');
  const [file, setFile] = useState<CandidatAffiche[]>([]);
  const [chargement, setChargement] = useState(false);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [gardees, setGardees] = useState(0);
  const [motsCles, setMotsCles] = useState(motsClesInitiaux);
  const [edition, setEdition] = useState(false);
  const [texteMots, setTexteMots] = useState('');
  const vues = useRef(new Set<string>());
  const sujetCourant = useRef(sujet);
  sujetCourant.current = sujet;

  const charger = useCallback(async (s: string) => {
    setChargement(true);
    const r = await candidatsPhotos(s, [...vues.current]).catch(() => ({ ok: false, message: 'Connexion perdue.', candidats: [] as CandidatAffiche[] }));
    setChargement(false);
    if (s !== sujetCourant.current) return;
    if (!r.ok) { setStatut({ ok: false, message: r.message }); return; }
    // Ajoutées à la suite (la photo affichée ne change pas), sans doublon
    setFile((f) => [...f, ...r.candidats.filter((c) => !f.some((x) => cleCandidat(x) === cleCandidat(c)))]);
  }, []);

  useEffect(() => { if (configurees.length) void charger(sujet); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sujet]);

  const carte = file[0] ?? null;
  const bloquee = etiquettes.some((e) => (ETIQUETTES_BLOQUANTES as readonly string[]).includes(e));

  const suivante = () => {
    if (carte) vues.current.add(cleCandidat(carte));
    setEtiquettes([]);
    const reste = file.slice(1);
    setFile(reste);
    if (reste.length < 2 && !chargement) void charger(sujet);
  };

  const decider = async (decision: 'garder' | 'rejeter') => {
    if (!carte) return;
    if (decision === 'garder' && bloquee) return;
    const c = carte;
    const etq = etiquettes;
    setStatut({ ok: true, message: decision === 'garder' ? 'Téléchargement, conversion WebP et hébergement…' : 'Rejet…' });
    suivante();
    const r = await deciderPhoto({ source: c.source, idSource: c.idSource, decision, etiquettes: etq, sujet, requete: c.requete }).catch(() => ({ ok: false, message: 'Connexion perdue : décision non enregistrée.' }));
    if (r.ok && decision === 'garder') setGardees((n) => n + 1);
    setStatut({ ok: r.ok, message: `${LICENCES_SOURCES[c.source].libelle} ${c.idSource} : ${r.message}` });
  };

  const basculer = (id: string) => setEtiquettes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const ouvrirEdition = () => { setTexteMots((motsCles[sujet] ?? []).join('\n')); setEdition(true); };
  const enregistrerMots = async () => {
    const r = await enregistrerMotsCles(sujet, texteMots).catch(() => ({ ok: false, message: 'Connexion perdue.', motsCles: undefined }));
    setStatut({ ok: r.ok, message: r.message });
    if (r.ok && r.motsCles) { setMotsCles((m) => ({ ...m, [sujet]: r.motsCles! })); setEdition(false); setFile([]); if (configurees.length) void charger(sujet); }
  };

  const puce = (e: (typeof ETIQUETTES_DECOUVERTE)[number]) => {
    const actif = etiquettes.includes(e.id);
    return (
      <button key={e.id} type="button" aria-pressed={actif} onClick={() => basculer(e.id)}
        className={`min-h-11 rounded-full border px-3 text-sm ${focus} ${actif ? (e.positive ? 'border-teal-700 bg-teal-700 text-white' : 'border-red-800 bg-red-800 text-white') : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
        {e.libelle}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-40 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onRetour} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>← Accueil</button>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">Sujet cible</span>
          <select value={sujet} onChange={(e) => { setSujet(e.target.value); setFile([]); setEdition(false); setStatut(null); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            {SUJETS_VISUELS.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </label>
        <p className="text-sm text-neutral-600">{gardees} gardée{gardees > 1 ? 's' : ''} cette session</p>
      </div>

      <div className="grid gap-1">
        <h2 className="text-2xl font-bold">Photos à découvrir</h2>
        <p className="max-w-3xl text-sm text-neutral-700">
          Photos libres de droits de Pexels et Pixabay, une à la fois. Gardée, la photo est téléchargée et hébergée chez nous avec sa licence
          tracée ; les sites n’utilisent que nos copies, jamais un lien vers la banque.
        </p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Migration 0028 à exécuter (<code>supabase/migrations/0028_inspirations_photos_libres.sql</code>) : décisions et traçabilité ne peuvent pas encore être enregistrées.</p>
      )}

      <section aria-label="Sources" className="flex flex-wrap gap-2 text-sm">
        {SOURCES_PHOTOS_LIBRES.map((s) => (
          <span key={s} className={`rounded-full px-3 py-1 ring-1 ${sources[s] ? 'bg-teal-50 text-teal-900 ring-teal-200' : 'bg-amber-50 text-amber-950 ring-amber-200'}`}>
            {LICENCES_SOURCES[s].libelle} : {sources[s] ? 'prête' : <>Clé API à configurer (<code>{LICENCES_SOURCES[s].variable}</code>)</>}
          </span>
        ))}
      </section>

      {!configurees.length ? (
        <section className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <h3 className="text-lg font-semibold">Clé API à configurer</h3>
          <p>Ajoutez <code>PEXELS_API_KEY</code> et/ou <code>PIXABAY_API_KEY</code> dans Vercel (projet de l’admin → Settings → Environment Variables), puis redéployez.
            Marche à suivre : <code>docs/photos-libres.md</code>. Le reste de l’admin fonctionne sans.</p>
        </section>
      ) : carte ? (
        <section aria-label="Photo candidate" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] md:items-start">
          <div className="grid min-w-0 gap-2">
            <figure className="grid gap-1">
              {/* Vignette servie par la source, pendant l'évaluation seulement */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={cleCandidat(carte)} src={carte.apercu} alt={carte.description || `Photo candidate ${carte.source} ${carte.idSource}`} referrerPolicy="no-referrer"
                className="max-h-[55vh] w-full rounded-xl bg-neutral-100 object-contain ring-1 ring-black/10 md:max-h-[560px]" />
              <figcaption className="text-xs text-neutral-600">
                Photo : {carte.auteurUrl ? <a href={carte.auteurUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{carte.auteur}</a> : carte.auteur}
                {' '}sur <a href={carte.pageUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{LICENCES_SOURCES[carte.source].libelle}</a>
                {' '}· {carte.largeur} × {carte.hauteur} px · {orientation(carte)} · recherche « {carte.requete} »
              </figcaption>
            </figure>
            <div className="grid gap-1">
              <p className="text-xs font-medium text-neutral-600">Traitement de teinte appliqué par les modèles de site (comme pour les autres photos)</p>
              <ul className="grid grid-cols-4 gap-2">
                {APERCUS_TRAITEMENTS_IMAGES.map((t) => (
                  <li key={t.id} className="grid gap-1 text-center text-[11px] text-neutral-600">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={carte.apercu} alt="" referrerPolicy="no-referrer" className="aspect-[4/3] w-full rounded-md object-cover" style={{ filter: t.filtre }} />
                    {t.libelle}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-3 md:sticky md:top-4">
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700 ring-1 ring-black/5">
              Charte : pas de visage reconnaissable mis en avant, rien qui laisse croire à un patient réel. {LICENCES_SOURCES[carte.source].nom} (<a href={LICENCES_SOURCES[carte.source].url} target="_blank" rel="noopener noreferrer" className="underline">texte officiel</a>).
            </p>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1 text-sm font-medium text-teal-900">Ce qui va bien</legend>
              <div className="flex flex-wrap gap-1.5">{ETIQUETTES_DECOUVERTE.filter((e) => e.positive).map(puce)}</div>
            </fieldset>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1 text-sm font-medium text-red-900">Ce qui ne va pas</legend>
              <div className="flex flex-wrap gap-1.5">{ETIQUETTES_DECOUVERTE.filter((e) => !e.positive).map(puce)}</div>
            </fieldset>
            <div className="fixed inset-x-0 bottom-0 z-20 grid gap-2 border-t border-black/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void decider('rejeter')} className={`min-h-14 rounded-xl border border-red-800 bg-white text-base font-bold text-red-900 hover:bg-red-50 ${focus}`}>Rejeter</button>
                <button type="button" onClick={() => void decider('garder')} disabled={bloquee || migrationManquante} className={`min-h-14 rounded-xl bg-teal-800 text-base font-bold text-white hover:bg-teal-900 disabled:opacity-40 ${focus}`}>Garder</button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500">{file.length - 1} autre{file.length - 1 > 1 ? 's' : ''} en attente</span>
                <button type="button" onClick={suivante} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 ${focus}`}>Passer →</button>
              </div>
              <p role="status" className={`min-h-5 text-sm ${(statut && !statut.ok) || bloquee ? 'text-red-800' : 'text-neutral-600'}`}>
                {bloquee ? 'Visage visible ou patient suggéré : cette photo ne peut pas être gardée, rejetez-la.' : statut?.message ?? ''}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-2 rounded-2xl border border-black/10 bg-white p-4 text-sm">
          <p>{chargement ? 'Recherche de nouvelles photos…' : statut?.message ?? 'Aucune candidate pour l’instant.'}</p>
          {!chargement && <button type="button" onClick={() => void charger(sujet)} className={`min-h-11 w-fit rounded-xl bg-teal-800 px-4 font-semibold text-white ${focus}`}>Chercher d’autres photos</button>}
        </section>
      )}

      <section aria-labelledby="pd-mots" className="grid gap-2 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="pd-mots" className="text-base font-semibold">Mots-clés de recherche · {SUJETS_VISUELS.find((s) => s.id === sujet)?.libelle}</h3>
          {!edition && <button type="button" onClick={ouvrirEdition} className={`min-h-11 rounded-lg px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>Modifier</button>}
        </div>
        {edition ? (
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm">
              <span>Un mot-clé par ligne (en anglais, 12 au plus) ; tout effacer rétablit les mots-clés par défaut</span>
              <textarea value={texteMots} onChange={(e) => setTexteMots(e.target.value)} rows={5} className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-base md:text-sm" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => void enregistrerMots()} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white ${focus}`}>Enregistrer</button>
              <button type="button" onClick={() => setEdition(false)} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-neutral-700 ${focus}`}>Annuler</button>
            </div>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-1.5 text-sm">{(motsCles[sujet] ?? []).map((m) => <li key={m} className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-800">{m}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
