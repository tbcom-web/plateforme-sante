'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  GAMMES, MOTIFS, POLICES_TEXTE, POLICES_TITRES, SECTIONS_ACCUEIL, TRAITEMENTS_IMAGES, TRAITEMENTS_MARQUE,
  validerManifeste, type ModeleManifeste, type SectionAccueil,
} from '@plateforme/core';
import { enregistrerModele, type ResultatImport } from '../actions';

type Props = { initial: ModeleManifeste; integre: boolean; actif: boolean };

const SECTIONS: Record<SectionAccueil, string> = {
  faits: 'En bref (faits clés)', etapes: 'Premier rendez-vous (3 étapes)', competences: 'Compétences', panorama: 'Bandeau photo', praticiens: 'Praticiens',
  galerie: 'Galerie', actualites: 'Actualités', acces: 'Accès et informations', faq: 'Questions fréquentes',
};
const OBLIGATOIRES: SectionAccueil[] = ['competences', 'acces'];
const champ = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm';

function Choix<T extends string>({ label, valeur, options, onChange }: { label: string; valeur: T; options: readonly T[] | { v: T; l: string }[]; onChange: (v: T) => void }) {
  const liste = (options as (T | { v: T; l: string })[]).map((o) => (typeof o === 'string' ? { v: o, l: o } : o));
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select value={valeur} onChange={(e) => onChange(e.target.value as T)} className={champ}>
        {liste.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

function Curseur({ label, valeur, min, max, pas = 1, unite = '', onChange }: { label: string; valeur: number; min: number; max: number; pas?: number; unite?: string; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="flex justify-between font-medium"><span>{label}</span><span className="font-mono text-neutral-500">{valeur}{unite}</span></span>
      <input type="range" min={min} max={max} step={pas} value={valeur} onChange={(e) => onChange(Number(e.target.value))} className="accent-teal-800" />
    </label>
  );
}

/** Couleur facultative : case « par défaut » ou valeur choisie */
function Couleur({ label, valeur, aide, onChange }: { label: string; valeur?: string; aide?: string; onChange: (v?: string) => void }) {
  return (
    <div className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={Boolean(valeur)} onChange={(e) => onChange(e.target.checked ? '#1f6b64' : undefined)} className="accent-teal-800" />
        {valeur ? <input type="color" value={valeur} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-neutral-300" /> : <span className="text-neutral-500">par défaut</span>}
      </span>
      {aide && <span className="text-xs text-neutral-500">{aide}</span>}
    </div>
  );
}

export default function EditeurModele({ initial, integre, actif }: Props) {
  const [m, setM] = useState<ModeleManifeste>(initial);
  const [resultat, setResultat] = useState<ResultatImport>(null);
  const [enCours, demarrer] = useTransition();
  const { erreurs } = useMemo(() => validerManifeste(m), [m]);
  const j = m.jetons;
  const majJetons = (p: Partial<ModeleManifeste['jetons']>) => setM({ ...m, jetons: { ...j, ...p } });
  const sections = m.accueil.sections;
  const majSections = (s: SectionAccueil[]) => setM({ ...m, accueil: { ...m.accueil, sections: s } });
  const deplacer = (k: number, d: number) => { const s = [...sections]; [s[k], s[k + d]] = [s[k + d], s[k]]; majSections(s); };
  // Aperçu rapide : couleurs, arrondis et boutons (la typographie exacte se voit sur la démo).
  const accent = j.accent === 'encre' ? '#0b1c24' : m.couleurConseillee ?? '#1f6b64';
  const rayonBouton = { pilule: 999, arrondi: 12, carre: 2 }[j.boutons];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-6">
        <section className="grid gap-3 rounded-xl border border-black/5 bg-white p-5">
          <h2 className="font-semibold">Identité</h2>
          <label className="grid gap-1 text-sm"><span className="font-medium">Nom</span><input className={champ} value={m.nom} maxLength={60} onChange={(e) => setM({ ...m, nom: e.target.value })} /></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">Effet recherché (choix du praticien, ex. « Simple et rassurant »)</span><input className={champ} value={m.effet ?? ''} maxLength={40} onChange={(e) => setM({ ...m, effet: e.target.value || undefined })} /></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">Description (montrée au praticien)</span><input className={champ} value={m.description} maxLength={200} onChange={(e) => setM({ ...m, description: e.target.value })} /></label>
          <p className="text-xs text-neutral-500">Identifiant <code>{m.id}</code> · version {m.version}{integre ? ' · modèle intégré' : ''}{actif ? ' · actif' : ''}</p>
        </section>

        <section className="grid gap-4 rounded-xl border border-black/5 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Accueil et en-tête</h2>
          <Choix label="Type d’accueil" valeur={m.accueil.hero} options={[{ v: 'scinde', l: 'Titre + photo côte à côte' }, { v: 'plein', l: 'Grande photo plein écran' }, { v: 'diaporama', l: 'Diaporama plein écran' }, { v: 'lieu', l: 'Photo du lieu + carte de contact' }]} onChange={(v) => setM({ ...m, accueil: { ...m.accueil, hero: v } })} />
          <Choix label="En-tête" valeur={m.entete} options={[{ v: 'opaque', l: 'Opaque' }, { v: 'transparent', l: 'Transparent sur l’image, opaque au défilement' }]} onChange={(v) => setM({ ...m, entete: v })} />
          <Curseur label="Assombrissement de l’image d’accueil" valeur={m.accueil.voile} min={0} max={90} unite=" %" onChange={(v) => setM({ ...m, accueil: { ...m.accueil, voile: v } })} />
          <Choix label="Animations au défilement" valeur={m.animations} options={[{ v: 'douces', l: 'Douces' }, { v: 'aucune', l: 'Aucune' }]} onChange={(v) => setM({ ...m, animations: v })} />
        </section>

        <section className="grid gap-3 rounded-xl border border-black/5 bg-white p-5">
          <h2 className="font-semibold">Sections de l’accueil (ordre)</h2>
          <ol className="grid gap-1.5">
            {sections.map((s, k) => (
              <li key={s} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <span className="w-6 font-mono text-xs text-neutral-400">{String(k + 1).padStart(2, '0')}</span>
                <span className="flex-1">{SECTIONS[s]}{OBLIGATOIRES.includes(s) && <span className="ml-2 text-xs text-neutral-500">(obligatoire)</span>}</span>
                <button type="button" disabled={k === 0} onClick={() => deplacer(k, -1)} className="rounded px-2 py-0.5 ring-1 ring-black/10 disabled:opacity-30" aria-label="Monter">↑</button>
                <button type="button" disabled={k === sections.length - 1} onClick={() => deplacer(k, 1)} className="rounded px-2 py-0.5 ring-1 ring-black/10 disabled:opacity-30" aria-label="Descendre">↓</button>
                {!OBLIGATOIRES.includes(s) && <button type="button" onClick={() => majSections(sections.filter((x) => x !== s))} className="rounded px-2 py-0.5 text-red-700 ring-1 ring-red-200" aria-label="Retirer">×</button>}
              </li>
            ))}
          </ol>
          {SECTIONS_ACCUEIL.filter((s) => !sections.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {SECTIONS_ACCUEIL.filter((s) => !sections.includes(s)).map((s) => (
                <button key={s} type="button" onClick={() => majSections([...sections, s])} className="rounded-full px-3 py-1 ring-1 ring-black/10 hover:bg-neutral-50">+ {SECTIONS[s]}</button>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Choix label="Présentation des compétences" valeur={m.competences} options={[{ v: 'cartes', l: 'Cartes (bento)' }, { v: 'liste', l: 'Liste numérotée' }]} onChange={(v) => setM({ ...m, competences: v })} />
            <Choix label="Pied de page" valeur={m.pied} options={[{ v: 'sombre', l: 'Sombre' }, { v: 'accent', l: 'Couleur du cabinet' }, { v: 'clair', l: 'Clair' }]} onChange={(v) => setM({ ...m, pied: v })} />
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-black/5 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Typographie et formes</h2>
          <Choix label="Police des titres" valeur={j.policeTitres} options={POLICES_TITRES} onChange={(v) => majJetons({ policeTitres: v })} />
          <Choix label="Police du texte" valeur={j.policeTexte} options={POLICES_TEXTE} onChange={(v) => majJetons({ policeTexte: v })} />
          <Curseur label="Graisse des titres" valeur={j.graisseTitres} min={300} max={800} pas={10} onChange={(v) => majJetons({ graisseTitres: v })} />
          <Curseur label="Arrondi des cartes et images" valeur={j.rayon} min={0} max={40} unite=" px" onChange={(v) => majJetons({ rayon: v })} />
          <Choix label="Boutons" valeur={j.boutons} options={[{ v: 'pilule', l: 'Pilule' }, { v: 'arrondi', l: 'Arrondis' }, { v: 'carre', l: 'Carrés' }]} onChange={(v) => majJetons({ boutons: v })} />
          <Choix label="Couleur des boutons" valeur={j.accent} options={[{ v: 'couleur', l: 'Couleur du cabinet' }, { v: 'encre', l: 'Bleu nuit' }]} onChange={(v) => majJetons({ accent: v })} />
          <Choix label="Logo" valeur={(j.logo ?? '') as '' | (typeof TRAITEMENTS_MARQUE)[number]} options={[{ v: '' as const, l: 'Automatique' }, ...TRAITEMENTS_MARQUE.map((t) => ({ v: t, l: { plein: 'Pastille pleine', trait: 'Au trait', plan: 'Fond plan' }[t] }))]} onChange={(v) => majJetons({ logo: v || undefined })} />
          <Choix label="Registre des illustrations" valeur={j.registre ?? 'releve'} options={[{ v: 'releve' as const, l: 'Relevé (trame de pression, données, plan sombre)' }, { v: 'pedagogique' as const, l: 'Pédagogique (schémas au trait, fonds clairs)' }]} onChange={(v) => majJetons({ registre: v })} />
          <Choix label="Traitement des photos" valeur={j.images} options={TRAITEMENTS_IMAGES} onChange={(v) => majJetons({ images: v })} />
        </section>

        <section className="grid gap-4 rounded-xl border border-black/5 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Fonds et couleurs</h2>
          <div className="grid gap-1 text-sm"><span className="font-medium">Fond des pages</span><input type="color" value={j.fond} onChange={(e) => majJetons({ fond: e.target.value })} className="h-8 w-12 cursor-pointer rounded border border-neutral-300" /></div>
          <Couleur label="Fond des sections alternées" valeur={j.fondDoux} aide="Par défaut : teinte de la couleur du cabinet" onChange={(v) => majJetons({ fondDoux: v })} />
          <Choix label="Texture des sections" valeur={j.motif ?? 'plan'} options={MOTIFS} onChange={(v) => majJetons({ motif: v })} />
          <Couleur label="Fond « plan » (surfaces sombres)" valeur={j.plan} aide="Par défaut : couleur du cabinet assombrie" onChange={(v) => majJetons({ plan: v })} />
          <Couleur label="Couleur des lectures sur fond sombre" valeur={j.signal} onChange={(v) => majJetons({ signal: v })} />
          <Couleur label="Couleur conseillée au praticien" valeur={m.couleurConseillee} onChange={(v) => setM({ ...m, couleurConseillee: v })} />
          <fieldset className="grid gap-2 text-sm sm:col-span-2">
            <legend className="font-medium">Gammes recommandées</legend>
            <div className="flex flex-wrap gap-2">
              {GAMMES.map((g) => {
                const coche = (m.gammes ?? []).includes(g.id);
                return (
                  <label key={g.id} className={`flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 ring-1 ${coche ? 'bg-teal-50 ring-teal-700' : 'ring-black/10'}`}>
                    <input type="checkbox" className="sr-only" checked={coche} onChange={() => setM({ ...m, gammes: coche ? (m.gammes ?? []).filter((x) => x !== g.id) : [...(m.gammes ?? []), g.id] })} />
                    <span className="size-3 rounded-full" style={{ background: g.accent }} />{g.nom}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>
      </div>

      <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
        <section className="overflow-hidden rounded-xl border border-black/5" style={{ background: j.fond }}>
          <div className="p-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: accent }}>Aperçu rapide</p>
            <p className="mt-1 text-2xl leading-tight" style={{ fontWeight: j.graisseTitres }}>Cabinet de podologie</p>
            <div className="mt-3 rounded p-3 text-xs" style={{ borderRadius: j.rayon, background: j.fondDoux ?? '#eef4f3' }}>Carte d’un soin, arrondi {j.rayon} px</div>
            <span className="mt-3 inline-block px-4 py-2 text-sm font-semibold text-white" style={{ background: accent, borderRadius: rayonBouton }}>Prendre rendez-vous</span>
          </div>
          <div className="p-3 font-mono text-xs" style={{ background: j.plan ?? '#0f3b3a', color: j.signal ?? '#6ff2c2' }}>Fond plan · lectures</div>
        </section>

        <section className="grid gap-2 rounded-xl border border-black/5 bg-white p-4 text-sm">
          {erreurs.length > 0
            ? <ul className="list-disc pl-5 text-red-700">{erreurs.map((e) => <li key={e}>{e}</li>)}</ul>
            : <p className="text-teal-800">Fiche valide.</p>}
          <button
            type="button"
            disabled={enCours || erreurs.length > 0}
            onClick={() => demarrer(async () => setResultat(await enregistrerModele(m, undefined, true)))}
            className="rounded-lg bg-teal-800 px-4 py-2.5 font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
          >
            {enCours ? 'Enregistrement…' : 'Enregistrer et appliquer aux sites'}
          </button>
          <button
            type="button"
            disabled={enCours || erreurs.length > 0}
            onClick={() => demarrer(async () => setResultat(await enregistrerModele(m)))}
            className="rounded-lg px-4 py-2.5 font-semibold ring-1 ring-black/10 hover:bg-neutral-50 disabled:opacity-50"
          >
            Enregistrer sans appliquer (brouillon)
          </button>
          <button
            type="button"
            disabled={enCours || erreurs.length > 0}
            onClick={() => {
              const id = prompt('Identifiant de la copie (minuscules, chiffres, tirets) :', `${m.id}-variante`);
              if (id) demarrer(async () => setResultat(await enregistrerModele({ ...m, nom: `${m.nom} (variante)` }, id.trim().toLowerCase())));
            }}
            className="rounded-lg px-4 py-2.5 font-semibold ring-1 ring-black/10 hover:bg-neutral-50 disabled:opacity-50"
          >
            Dupliquer en nouveau modèle
          </button>
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(m, null, 2))}`}
            download={`modele-${m.id}-v${m.version}.json`}
            className="text-center text-xs text-teal-800 underline-offset-4 hover:underline"
          >
            Télécharger la fiche (sauvegarde)
          </a>
          {resultat && (
            <div className={`rounded-lg p-2 text-xs ${resultat.ok ? 'bg-teal-50 text-teal-900' : 'bg-red-50 text-red-800'}`}>
              <p className="font-medium">{resultat.message}</p>
              {resultat.erreurs && <ul className="mt-1 list-disc pl-4">{resultat.erreurs.map((e) => <li key={e}>{e}</li>)}</ul>}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
