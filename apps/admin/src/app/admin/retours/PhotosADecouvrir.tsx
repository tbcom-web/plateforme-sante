'use client';

// Tuile « Photos à découvrir » : une photo candidate Pexels / Pixabay à la fois (vignette servie par la source pendant
// l'évaluation, ce que les deux licences autorisent), auteur, source et lien ; GARDER / REJETER, étiquettes, THÈMES (plusieurs,
// pré-sélection = thème de la recherche, au moins un pour Garder) et HASHTAGS libres (#trail, #sneakers : autocomplétion,
// suggestions tirées des tags de la source ; table assets_hashtags, migration 0029 ; sans elle, la photo est gardée sans eux).
// GARDER : rien n'est téléchargé ; seuls la traçabilité et le lien d'aperçu de la source sont enregistrés, statut « à valider ».
// « Valider et importer » (/admin/photos) héberge ensuite la photo chez nous (WebP, sans EXIF).
// Les sites n'utilisent jamais un lien direct vers Pexels ou Pixabay. Charte : pas de visage reconnaissable mis en avant,
// rien qui laisse croire à un patient réel (étiquettes bloquantes).
// PROFESSION (ajout de Paul du 2026-10-09, recherche-photos-professions.ts) : sélecteur de profession VERROUILLABLE (cadenas,
// mémorisé dans ce navigateur ; sans verrou : profession de l'en-tête) ; thèmes et requêtes de la profession choisie ; à la
// décision, la profession est pré-cochée et « Aussi pour… » est suggéré quand le visuel est générique (cabinet, marche, enfant…).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cleCandidat, ETIQUETTES_BLOQUANTES, ETIQUETTES_DECOUVERTE, LICENCES_SOURCES, normaliserHashtag, orientation, SOURCES_PHOTOS_LIBRES, SUJETS_VISUELS, type HashtagsAssets,
  APERCUS_TRAITEMENTS_IMAGES, type SourcePhotoLibre,
  hashtagEmplacement, hashtagKit, libelleEmplacement, libelleSujet, requetesEmplacement, motsClesDuTheme, professionsALaDecision,
} from '@plateforme/core';
import { SaisieHashtags } from '@/components/HashtagsVisuel';
import { SuggestionsClassement } from '@/components/SuggestionsClassement';
import { suggererClassement } from '@plateforme/core/classement-visuels';
import { lireHashtagsAssets } from './actions-hashtags';
import { candidatsPhotos, contexteChercheur, deciderPhoto, enregistrerMotsCles, hashtagsConnus, type CandidatAffiche } from './actions-photos';

const CLE_VERROU = 'chercheur-profession-verrou';
const PAR_DEFAUT = 'podologue';
type Contexte = Awaited<ReturnType<typeof contexteChercheur>>;

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Props = {
  sources: Record<SourcePhotoLibre, boolean>;
  /** Mots-clés effectifs par sujet (base, sinon valeurs par défaut du core) */
  motsCles: Record<string, string[]>;
  migrationManquante: boolean;
  onRetour: () => void;
  /**
   * Ouvert depuis « Compléter ce kit » (couche 2 → couche 1) : sujet imposé, requêtes ciblées de l'emplacement (suggestions-kits.ts,
   * requetesEmplacement), hashtag de l'emplacement et #kit-<sujet> pré-cochés, lien de retour au kit.
   */
  cible?: { sujet: string; emplacement: string; retour: string | null } | null;
};

export default function PhotosADecouvrir({ sources, motsCles: motsClesInitiaux, migrationManquante, onRetour, cible }: Props) {
  const configurees = SOURCES_PHOTOS_LIBRES.filter((s) => sources[s]);
  const [sujet, setSujet] = useState(cible?.sujet ?? 'sport');
  const tagsCible = useMemo(() => (cible ? [hashtagEmplacement(cible.emplacement), hashtagKit(cible.sujet)] : []), [cible]);
  const [file, setFile] = useState<CandidatAffiche[]>([]);
  const [chargement, setChargement] = useState(false);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [gardees, setGardees] = useState(0);
  const [motsCles, setMotsCles] = useState(motsClesInitiaux);
  const [edition, setEdition] = useState(false);
  const [texteMots, setTexteMots] = useState('');
  // Thèmes et hashtags de la photo affichée (remis à zéro à chaque photo : thème de la recherche pré-coché)
  const [themes, setThemes] = useState<string[]>([sujet]);
  const [hashtags, setHashtags] = useState<string[]>(tagsCible);
  const [frequences, setFrequences] = useState<Record<string, number>>({});
  const [migrationHashtags, setMigrationHashtags] = useState(false);
  const [tousHashtags, setTousHashtags] = useState<HashtagsAssets>({});
  const vues = useRef(new Set<string>());
  const sujetCourant = useRef(sujet);
  sujetCourant.current = sujet;
  // Profession du chercheur : verrouillée (cadenas, mémorisée) ou celle de l'en-tête
  const [ctx, setCtx] = useState<Contexte | null>(null);
  const [profession, setProfession] = useState<string>(PAR_DEFAUT);
  const [verrou, setVerrou] = useState<string | null>(null);
  const [professionsCochees, setProfessionsCochees] = useState<string[]>([PAR_DEFAUT]);
  const professionCourante = useRef(profession);
  professionCourante.current = profession;
  const themesProfession = useMemo(() => (profession === PAR_DEFAUT || !ctx ? SUJETS_VISUELS.map((s) => ({ id: s.id, libelle: s.libelle })) : ctx.themes[profession] ?? []), [ctx, profession]);
  const motsAffiches = profession === PAR_DEFAUT ? motsCles[sujet] ?? [] : motsClesDuTheme(profession, sujet, ctx?.enBase ?? {});
  useEffect(() => {
    void contexteChercheur().then((c) => {
      setCtx(c);
      let v: string | null = null;
      try { v = window.localStorage.getItem(CLE_VERROU); } catch { v = null; }
      const ok = v && c.professions.some((p) => p.id === v) ? v : null;
      setVerrou(ok);
      // Ouvert depuis un kit : profession par défaut (sujet du kit) ; lien d'un trou de couverture (?profession=…&theme=…, Frigo) :
      // cette profession et ce thème, sans toucher au verrou ; sinon verrou, sinon en-tête
      const q = new URLSearchParams(window.location.search);
      const pUrl = q.get('profession');
      const tUrl = q.get('theme');
      const p = cible ? PAR_DEFAUT : pUrl && c.professions.some((x) => x.id === pUrl) ? pUrl : ok ?? c.globale;
      if (p !== PAR_DEFAUT) changerProfession(p, c, cible ? null : tUrl);
      else if (tUrl && !cible && SUJETS_VISUELS.some((x) => x.id === tUrl)) { setSujet(tUrl); setThemes([tUrl]); }
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const changerProfession = (p: string, c: Contexte | null = ctx, prefere: string | null = null) => {
    setProfession(p);
    setProfessionsCochees([p]);
    const themes = p === PAR_DEFAUT ? SUJETS_VISUELS.map((s) => s.id) : (c?.themes[p] ?? []).map((t) => t.id);
    const t = prefere && themes.includes(prefere) ? prefere : themes.includes(sujetCourant.current) ? sujetCourant.current : themes[0] ?? 'general';
    professionCourante.current = p;
    setFile([]); setEdition(false); setStatut(null);
    if (t !== sujetCourant.current) { setSujet(t); setThemes([t]); } else if (configurees.length) { setThemes([t]); void charger(t); }
  };
  const basculerVerrou = () => {
    const v = verrou ? null : profession;
    setVerrou(v);
    try { if (v) window.localStorage.setItem(CLE_VERROU, v); else window.localStorage.removeItem(CLE_VERROU); } catch { /* stockage indisponible : verrou de la session seulement */ }
  };

  // Hashtags déjà utilisés (autocomplétion) ; sans la migration 0029 : bandeau, la saisie reste possible
  useEffect(() => {
    void hashtagsConnus().then((r) => { setFrequences(r.frequences); setMigrationHashtags(r.migrationManquante); }).catch(() => undefined);
    // Classement suggéré (classement-visuels.ts) : co-occurrences sur les visuels déjà classés
    void lireHashtagsAssets().then((r) => setTousHashtags(r.hashtags)).catch(() => undefined);
  }, []);
  // Autocomplétion : hashtags utilisés (fréquence) + mots-clés de recherche de tous les thèmes
  const connus = useMemo(() => {
    const f: Record<string, number> = { ...frequences };
    for (const l of Object.values(motsCles)) for (const m of l) { const h = normaliserHashtag(m); if (h && !(h in f)) f[h] = 0; }
    return f;
  }, [frequences, motsCles]);

  const charger = useCallback(async (s: string) => {
    setChargement(true);
    const r = await candidatsPhotos(s, [...vues.current], cible && s === cible.sujet ? cible.emplacement : null, professionCourante.current).catch(() => ({ ok: false, message: 'Connexion perdue.', candidats: [] as CandidatAffiche[] }));
    setChargement(false);
    if (s !== sujetCourant.current) return;
    if (!r.ok) { setStatut({ ok: false, message: r.message }); return; }
    // Ajoutées à la suite (la photo affichée ne change pas), sans doublon
    setFile((f) => [...f, ...r.candidats.filter((c) => !f.some((x) => cleCandidat(x) === cleCandidat(c)))]);
  }, []);

  useEffect(() => { if (configurees.length) void charger(sujet); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sujet]);

  const carte = file[0] ?? null;
  const bloquee = etiquettes.some((e) => (ETIQUETTES_BLOQUANTES as readonly string[]).includes(e));
  const sansTheme = themes.length === 0;
  const classement = useMemo(() => (carte ? suggererClassement({ requete: carte.requete, tags: carte.tags, description: carte.description, voisins: { hashtags: tousHashtags }, deja: { sujets: themes, hashtags } }) : null), [carte, hashtags, themes, tousHashtags]);
  const suggestions = useMemo(() => classement?.hashtags.map((h) => h.tag) ?? [], [classement]);
  // « Aussi pour… » : autres professions suggérées quand le visuel est générique (requête, description, tags de la source)
  const aussiPour = useMemo(() => (carte ? professionsALaDecision({ verrou: profession, texte: `${carte.requete} ${carte.description ?? ''} ${(carte.tags ?? []).join(' ')}`, hashtags }).suggerees : []), [carte, profession, hashtags]);

  const suivante = () => {
    if (carte) vues.current.add(cleCandidat(carte));
    setEtiquettes([]);
    setThemes([sujet]);
    setProfessionsCochees([profession]);
    setHashtags(cible && sujet === cible.sujet ? tagsCible : []);
    const reste = file.slice(1);
    setFile(reste);
    if (reste.length < 2 && !chargement) void charger(sujet);
  };

  const decider = async (decision: 'garder' | 'rejeter') => {
    if (!carte) return;
    if (decision === 'garder' && (bloquee || sansTheme)) return;
    const c = carte;
    const etq = etiquettes;
    const ths = themes.length ? themes : [sujet];
    const tags = hashtags;
    const profs = professionsCochees.length ? professionsCochees : [profession];
    setStatut({ ok: true, message: decision === 'garder' ? 'Enregistrement du lien et de la licence…' : 'Rejet…' });
    suivante();
    const r = await deciderPhoto({ source: c.source, idSource: c.idSource, decision, etiquettes: etq, sujets: ths, hashtags: decision === 'garder' ? tags : [], requete: c.requete, profession, professions: profs })
      .catch(() => ({ ok: false, message: 'Connexion perdue : décision non enregistrée.' }));
    if (r.ok && decision === 'garder') {
      setGardees((n) => n + 1);
      if (!migrationHashtags) setFrequences((f) => { const g = { ...f }; for (const h of tags) g[h] = (g[h] ?? 0) + 1; return g; });
    }
    setStatut({ ok: r.ok, message: `${LICENCES_SOURCES[c.source].libelle} ${c.idSource} : ${r.message}` });
  };

  const basculer = (id: string) => setEtiquettes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const basculerTheme = (id: string) => setThemes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const ouvrirEdition = () => { setTexteMots(motsAffiches.join('\n')); setEdition(true); };
  const enregistrerMots = async () => {
    const r = await enregistrerMotsCles(sujet, texteMots, profession).catch(() => ({ ok: false, message: 'Connexion perdue.', motsCles: undefined }));
    setStatut({ ok: r.ok, message: r.message });
    if (r.ok && r.motsCles) {
      if (profession === PAR_DEFAUT) setMotsCles((m) => ({ ...m, [sujet]: r.motsCles! }));
      else setCtx((c) => (c ? { ...c, enBase: { ...c.enBase, [`${profession}/${sujet}`]: r.motsCles! } } : c));
      setEdition(false); setFile([]); if (configurees.length) void charger(sujet);
    }
  };
  const libelleProfession = (id: string) => ctx?.professions.find((p) => p.id === id)?.court ?? id;

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
        {cible?.retour
          ? <a href={cible.retour} className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>← Retour au kit</a>
          : <button type="button" onClick={onRetour} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>← Accueil</button>}
        {cible && <p className="w-full rounded-lg bg-teal-50 p-2 text-sm text-teal-950 ring-1 ring-teal-200 sm:order-last">Pour le kit {libelleSujet(cible.sujet)} · {libelleEmplacement(cible.emplacement)} : recherches ciblées ({requetesEmplacement(cible.sujet, cible.emplacement).join(', ')}) ; #{hashtagEmplacement(cible.emplacement)} et #{hashtagKit(cible.sujet)} pré-cochés. Gardée, la photo entre dans le vivier ; elle rejoint le kit une fois importée.</p>}
        {ctx && ctx.professions.length > 1 && (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-sm">
            <label className="flex items-center gap-2">
              <span className="font-medium">Profession</span>
              <select value={profession} disabled={Boolean(verrou) || Boolean(cible)} onChange={(e) => changerProfession(e.target.value)} className="min-h-11 max-w-[11rem] rounded-lg border border-neutral-300 bg-white px-2 text-base disabled:bg-neutral-100 md:text-sm">
                {ctx.professions.map((p) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
              </select>
            </label>
            <button type="button" onClick={basculerVerrou} aria-pressed={Boolean(verrou)} disabled={Boolean(cible)}
              title={verrou ? 'Profession verrouillée pour vos recherches : cliquer pour suivre la profession de l’en-tête' : 'Verrouiller cette profession pour vos recherches'}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-2 text-sm font-semibold ${focus} ${verrou ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white text-neutral-700'}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />{verrou ? <path d="M8 11V7a4 4 0 0 1 8 0v4" /> : <path d="M8 11V7a4 4 0 0 1 7.5-2" />}
              </svg>
              {verrou ? 'Verrouillée' : 'Verrouiller'}
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">Rechercher</span>
          <select value={sujet} onChange={(e) => { setSujet(e.target.value); setThemes([e.target.value]); setFile([]); setEdition(false); setStatut(null); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            {themesProfession.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </label>
        <p className="text-sm text-neutral-600">{gardees} gardée{gardees > 1 ? 's' : ''} cette session</p>
      </div>

      <div className="grid gap-1">
        <h2 className="text-2xl font-bold">Photos à découvrir</h2>
        <p className="max-w-3xl text-sm text-neutral-700">
          Photos libres de droits de Pexels et Pixabay, une à la fois. Gardée, seul son lien est enregistré avec sa licence : rien n’est
          téléchargé. « Valider et importer » (Jeux de photos) l’héberge ensuite chez nous ; les sites n’utilisent que nos copies importées.
        </p>
        <p className="text-sm">Aucune bonne photo pour un sujet ? <a href="/admin/retours/images-a-generer" className="font-semibold text-teal-900 underline underline-offset-4">Images à générer</a> : prompts prêts à copier et import d’une image générée.</p>
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Migration 0028 à exécuter (<code>supabase/migrations/0028_inspirations_photos_libres.sql</code>) : décisions et traçabilité ne peuvent pas encore être enregistrées.</p>
      )}
      {migrationHashtags && !migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Migration 0029 à exécuter (<code>supabase/migrations/0029_assets_hashtags.sql</code>) : les photos et leurs thèmes sont gardés, mais les hashtags ne sont pas encore enregistrés.</p>
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
              <legend className="mb-1 text-sm font-medium">Thèmes <span className="font-normal text-neutral-500">· au moins un pour garder ; le premier coché range la photo</span></legend>
              <div className="flex flex-wrap gap-1.5">
                {themesProfession.map((s) => {
                  const actif = themes.includes(s.id);
                  return (
                    <button key={s.id} type="button" aria-pressed={actif} onClick={() => basculerTheme(s.id)}
                      className={`min-h-11 rounded-full border px-3 text-sm ${focus} ${actif ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                      {actif ? '✓ ' : ''}{s.libelle}
                    </button>
                  );
                })}
              </div>
              {classement && <SuggestionsClassement suggestions={classement} contexte="photos" compact onSujet={(ids) => setThemes((l) => [...l, ...ids.filter((x) => !l.includes(x))])} />}
            </fieldset>
            {ctx && ctx.professions.length > 1 && (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1 text-sm font-medium">Professions <span className="font-normal text-neutral-500">· la photo sera rangée pour celles cochées</span></legend>
                <div className="flex flex-wrap gap-1.5">
                  {ctx.professions.map((p) => {
                    const actif = professionsCochees.includes(p.id);
                    const suggeree = aussiPour.find((x) => x.profession === p.id);
                    if (p.id !== profession && !actif && !suggeree) return null;
                    return (
                      <button key={p.id} type="button" aria-pressed={actif} disabled={p.id === profession && actif && professionsCochees.length === 1}
                        onClick={() => setProfessionsCochees((l) => (l.includes(p.id) ? l.filter((x) => x !== p.id) : [...l, p.id]))}
                        title={suggeree ? `Visuel générique : ${suggeree.raisons.join(', ')}` : undefined}
                        className={`min-h-11 rounded-full border px-3 text-sm ${focus} ${actif ? 'border-teal-800 bg-teal-800 text-white' : 'border-dashed border-teal-700 bg-white text-teal-900 hover:bg-teal-50'}`}>
                        {actif ? `✓ ${p.court}` : `Aussi pour ${p.court}`}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <SaisieHashtags valeurs={hashtags} connus={connus} suggestions={suggestions}
              onAjout={(h) => setHashtags((l) => [...l, ...h.filter((x) => !l.includes(x))])} onRetrait={(h) => setHashtags((l) => l.filter((x) => x !== h))} />
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
                <button type="button" onClick={() => void decider('garder')} disabled={bloquee || sansTheme || migrationManquante} className={`min-h-14 rounded-xl bg-teal-800 text-base font-bold text-white hover:bg-teal-900 disabled:opacity-40 ${focus}`}>Garder</button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500">{file.length - 1} autre{file.length - 1 > 1 ? 's' : ''} en attente</span>
                <button type="button" onClick={suivante} className={`min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-900 ${focus}`}>Passer →</button>
              </div>
              <p role="status" className={`min-h-5 text-sm ${(statut && !statut.ok) || bloquee || sansTheme ? 'text-red-800' : 'text-neutral-600'}`}>
                {bloquee ? 'Visage visible ou patient suggéré : cette photo ne peut pas être gardée, rejetez-la.' : sansTheme ? 'Cochez au moins un thème pour garder la photo.' : statut?.message ?? ''}
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
          <h3 id="pd-mots" className="text-base font-semibold">Mots-clés de recherche · {profession !== PAR_DEFAUT ? `${libelleProfession(profession)} · ` : ''}{themesProfession.find((s) => s.id === sujet)?.libelle}</h3>
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
          <ul className="flex flex-wrap gap-1.5 text-sm">{motsAffiches.map((m) => <li key={m} className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-800">{m}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
