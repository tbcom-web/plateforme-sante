'use client';

// Kits d'images par sujet (/admin/retours/kits) : bandeau « Vous notez : le kit d'images du sujet », planche (une vignette par
// emplacement, note, étiquette, complément), trous, aperçus ordinateur + téléphone d'un site d'exemple en style « Photos » avec ce
// kit, « Noter ce kit » (étoiles 1-5, touches 1-5), « Garder ce kit », « Autre kit » (rotation). Sans la migration 0039 : notes
// gardées dans ce navigateur.
import '@plateforme/core/dessins.css';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  appliquerRecette, choisirStyle, compositionInitiale, gamme as gammeParId, libelleEmplacement, libelleSujetKit, libelleTraitementPhotos, modeleIntegre, photosDuKit,
  reparerComposition, SURFACES_CSS, variablesCharte, variablesGamme,
  type ContexteRecette, type KitImages, type MarqueImportee, type ModeleManifeste, type TraitementPhotos, type Univers,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import { draftStudio } from '@/components/ApercuStudio';
import type { SoinCatalogue } from '@/lib/sites';
import { noterKit } from './actions';
import CompleterKit from './CompleterKit';
import RattacherNotees from '@/components/RattacherNotees';
import type { EmplacementAFaire, FamilleKit, KitVisuel, PhotoARattacher, SuggestionVivier, VisuelARattacher } from '@plateforme/core';
import VisuelsDuKit from './VisuelsDuKit';
import type { PhotoEnAttenteKit } from '@/lib/kits-images';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const CLE_LOCAUX = 'kits:locaux';

type Props = {
  sujet: string;
  rang: number;
  kit: KitImages;
  aFaire: (EmplacementAFaire & { banque: (SuggestionVivier & { famille?: FamilleKit })[]; manque: string | null; trouver: string; famille?: FamilleKit })[];
  visuelsARattacher: VisuelARattacher[];
  kitVisuel: KitVisuel;
  compteur: string;
  aRattacher: PhotoARattacher[];
  enAttente: PhotoEnAttenteKit[];
  resume: { sujet: string; libelle: string; note: number | null; trous: number; photos: number; garde: boolean; vivier: string; curees: number; parType: string }[];
  notes: { note: number | null; garder: boolean; le: string | null }[];
  migrationManquante: boolean;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
};

export default function Kits(props: Props) {
  const { kit, sujet } = props;
  const [note, setNote] = useState<number | null>(null);
  const [remarque, setRemarque] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [appareil, setAppareil] = useState<'bureau' | 'mobile'>('bureau');
  const [large, setLarge] = useState(false);
  useEffect(() => { const f = () => { setLarge(window.innerWidth >= 1200); if (window.innerWidth < 768) setAppareil('mobile'); }; f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  useEffect(() => { setNote(null); setRemarque(''); }, [kit.cle]);

  const apercu = useMemo(() => {
    const modele = (id: string) => props.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
    const sujets = sujet === 'general' ? [] : [sujet];
    const c: ContexteRecette = { sujets, principaux: sujets.length, modele };
    const x0 = choisirStyle(compositionInitiale(c, 1), 'photos', c);
    const traitement: TraitementPhotos = { id: kit.traitement as TraitementPhotos['id'], grain: false };
    const x = reparerComposition({ ...x0, photos: photosDuKit(kit), traitement, sections: { ...x0.sections, variantes: { ...x0.sections.variantes, accueil: 'photo-gauche' } } }, c);
    return appliquerRecette(draftStudio(sujets), { ...x, photos: photosDuKit(kit) }, { proposes: props.proposes, modeles: props.modeles.map((m) => m.manifeste), soinsConnus: props.catalogue.map((s) => s.slug), themesActives: props.themesActives });
  }, [kit, sujet, props.modeles, props.proposes, props.catalogue, props.themesActives]);

  const envoyer = async (garder: boolean) => {
    if (envoi) return;
    if (!note && !garder) { setMessage('Choisissez des étoiles, ou gardez le kit.'); return; }
    setEnvoi(true);
    const s = { sujet, rang: props.rang, cle: kit.cle, photos: kit.photos.map((p) => ({ emplacement: p.emplacement, url: p.url })), note, garder, remarque, appareil: large ? 'les-deux' : appareil === 'mobile' ? 'mobile' : 'ordinateur' };
    const r = await noterKit(s).catch(() => ({ ok: false, message: 'Connexion perdue : note gardée dans ce navigateur.', migrationManquante: true }));
    if (r.migrationManquante) {
      try { const l = JSON.parse(localStorage.getItem(CLE_LOCAUX) ?? '[]'); localStorage.setItem(CLE_LOCAUX, JSON.stringify([{ ...s, le: new Date().toISOString() }, ...(Array.isArray(l) ? l : [])].slice(0, 500))); } catch { /* stockage indisponible */ }
    }
    setMessage(r.message);
    setEnvoi(false);
  };

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      if (/^[1-5]$/.test(e.key)) { e.preventDefault(); setNote(Number(e.key)); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  const rendu = (app: 'bureau' | 'mobile') => apercu && (
    <div className={`overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10 ${app === 'mobile' && !large ? 'mx-auto w-full max-w-[420px]' : ''}`}>
      <ApercuTheme key={`${kit.cle}|${app}`} sansCommandes hauteurCadre={large ? 620 : 520} appareil={app} draft={apercu.draft} modele={apercu.modele} catalogue={props.catalogue} marquesImportees={props.marquesImportees} jeuPhotos={null} />
    </div>
  );
  const derniere = props.notes[0];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" style={style}>
      <style>{SURFACES_CSS}</style>
      {/* Couche 1 → 2 : état du vivier curé de chaque sujet (photos retenues et étiquetées par Paul), dont le kit est assemblé */}
      <section aria-labelledby="kits-viviers" className="grid gap-1.5 rounded-2xl border border-black/10 bg-white p-3">
        <h2 id="kits-viviers" className="text-sm font-semibold">Viviers curés (couche 1) → kits assemblés (couche 2)</h2>
        <ul className="grid gap-0.5 text-xs text-neutral-700 sm:grid-cols-2">
          {props.resume.map((r) => <li key={r.sujet} className={r.sujet === sujet ? 'font-semibold text-teal-900' : ''}>{r.vivier}<br /><span className="text-neutral-500">{r.parType}</span></li>)}
        </ul>
        <p className="text-xs text-neutral-500">Une photo entre dans le vivier d’un sujet quand vous l’avez retenue (gardée, importée ou intégrée) ET étiquetée avec ce sujet ; jamais si elle est notée 2 ★ ou moins, retirée ou à retravailler.</p>
      </section>
      <RattacherNotees photos={props.aRattacher} visuels={props.visuelsARattacher} />
      <nav aria-label="Sujets" className="flex gap-1 overflow-x-auto pb-1">
        {props.resume.map((r) => (
          <Link key={r.sujet} href={`/admin/retours/kits?sujet=${r.sujet}`} aria-current={r.sujet === sujet ? 'page' : undefined}
            className={`grid min-h-11 shrink-0 content-center rounded-lg border px-3 text-sm ${focus} ${r.sujet === sujet ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-200 bg-white'}`}>
            <span>{r.libelle}{r.garde ? ' ★' : ''}</span>
            <span className={`text-xs ${r.sujet === sujet ? 'text-teal-50' : 'text-neutral-500'}`}>{r.curees} curées · {r.photos} au kit{r.note !== null ? ` · ${String(r.note).replace('.', ',')}★` : ''}{r.trous ? ` · ${r.trous} trou${r.trous > 1 ? 's' : ''}` : ''}</span>
          </Link>
        ))}
      </nav>

      <section aria-label="Ce que vous notez" className="grid gap-2 rounded-2xl border-2 border-teal-800/70 bg-teal-50/60 p-3">
        <p className="text-sm sm:text-base"><strong>Vous notez : le kit d’images du sujet « {libelleSujetKit(sujet)} »</strong> — kit n° {props.rang + 1}{kit.garde ? ' (gardé)' : ''}</p>
        <p className="flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-black/10">{kit.photos.length} photos</span>
          <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-black/10">Note moyenne des photos : {kit.noteMoyenne !== null ? `${String(kit.noteMoyenne).replace('.', ',')}★` : 'pas encore notées'}</span>
          <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-black/10">Traitement commun : {libelleTraitementPhotos({ id: kit.traitement as TraitementPhotos['id'], grain: false })}</span>
          {kit.heros && <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-black/10">Héros illustré : {({ releve: 'relevé', pedagogique: 'illustration douce', ligne: 'trait fin' } as Record<string, string>)[kit.heros.split(':')[2]] ?? kit.heros.split(':')[2]}</span>}
          {derniere && (derniere.note || derniere.garder) && <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-black/10">Dernier avis : {derniere.note ? `${derniere.note}★` : ''}{derniere.garder ? ' gardé' : ''}</span>}
        </p>
      </section>

      {kit.trous.length > 0 && (
        <ul className="grid gap-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" aria-label="Trous du kit">
          {kit.trous.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}

      <CompleterKit key={sujet} sujet={sujet} aFaire={props.aFaire} compteur={props.compteur} enAttente={props.enAttente} />

      <VisuelsDuKit kit={props.kitVisuel} />

      <ul id="planche-photos" aria-label="Planche du kit" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {kit.photos.map((p) => (
          <li key={p.emplacement + p.url} className="grid content-start gap-1 rounded-xl border border-black/10 bg-white p-1.5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100"><Image src={p.url} alt="" fill sizes="(max-width: 767px) 50vw, 16vw" className="object-cover" /></div>
            <span className="text-xs font-semibold">{libelleEmplacement(p.emplacement)}</span>
            <span className="flex flex-wrap gap-1 text-[11px] text-neutral-600">
              <span>{p.note !== null ? `${String(p.note).replace('.', ',')}★` : 'non notée'}</span>
              {p.etiquetee && <span className="rounded bg-teal-100 px-1 text-teal-900">étiquetée</span>}
              {p.complement && <span className="rounded bg-amber-100 px-1 text-amber-900">complément</span>}
            </span>
          </li>
        ))}
        {props.enAttente.map((p) => (
          <li key={p.id} className="grid content-start gap-1 rounded-xl border border-dashed border-amber-300 bg-white p-1.5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.apercu && <img src={p.apercu} alt="" referrerPolicy="no-referrer" className="size-full object-cover opacity-70" />}
            </div>
            <span className="text-xs font-semibold">{p.emplacement ? libelleEmplacement(p.emplacement) : 'Kit'}</span>
            <span className="text-[11px] text-amber-900">en attente d’import</span>
          </li>
        ))}
      </ul>

      {!large && (
        <div role="group" aria-label="Appareil" className="flex gap-1 justify-self-start rounded-xl bg-neutral-100 p-1">
          {([['bureau', 'Ordinateur'], ['mobile', 'Téléphone']] as const).map(([id, nom]) => (
            <button key={id} type="button" aria-pressed={appareil === id} onClick={() => setAppareil(id)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${focus} ${appareil === id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700'}`}>{nom}</button>
          ))}
        </div>
      )}
      <div className={large ? 'grid grid-cols-[minmax(0,1fr)_400px] items-start gap-4' : 'grid grid-cols-[minmax(0,1fr)]'}>
        {large ? <>{rendu('bureau')}{rendu('mobile')}</> : rendu(appareil)}
      </div>

      <section aria-label="Votre avis sur le kit" className="grid gap-3 rounded-2xl border border-black/10 bg-white p-3">
        {message && <p role="status" className="text-sm text-neutral-800">{message}</p>}
        <div role="radiogroup" aria-label="Note du kit" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={note === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`} onClick={() => setNote(note === n ? null : n)}
              className={`grid size-11 place-items-center rounded-lg text-2xl ${focus} ${note !== null && n <= note ? 'text-amber-500' : 'text-neutral-300'} hover:bg-amber-50`}>★</button>
          ))}
        </div>
        <input value={remarque} onChange={(e) => setRemarque(e.target.value)} maxLength={1000} placeholder="Une remarque (facultatif)" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base md:text-sm" />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={envoi} onClick={() => void envoyer(false)} className={`min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white disabled:opacity-50 ${focus}`}>Noter ce kit</button>
          <button type="button" disabled={envoi} onClick={() => void envoyer(true)} className={`min-h-11 rounded-xl bg-amber-500 px-4 text-sm font-bold text-neutral-950 disabled:opacity-50 ${focus}`}>★ Garder ce kit</button>
          <Link href={`/admin/retours/kits?sujet=${sujet}&rang=${props.rang + 1}`} className={`ml-auto inline-flex min-h-11 items-center rounded-xl border border-teal-800 px-4 text-sm font-semibold text-teal-900 ${focus}`}>Autre kit →</Link>
        </div>
      </section>
    </div>
  );
}
