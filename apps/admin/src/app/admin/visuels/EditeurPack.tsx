'use client';

import { useState, useTransition } from 'react';
import { ANIMATIONS, LIBELLES_ANIMATIONS, type PackVisuel, type PersonnalisationPack } from '@plateforme/core';
import Photo from '@/components/Photo';
import Propagation from '@/components/Propagation';
import { enregistrerPack, type ResultatPack } from './actions';

type Props = { pack: PackVisuel; perso: PersonnalisationPack };

// Les photos intégrées sont servies par le site de démonstration.
const DEMO = 'https://plateforme-sante.pages.dev';

/** Vignette d'une photo du pack intégré (utilisée tant que l'admin n'en a pas déposé une autre). */
function ParDefaut({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${DEMO}${src}`} alt="" className="h-12 w-16 rounded border border-neutral-200 object-cover" />;
}

export default function EditeurPack({ pack, perso: initial }: Props) {
  const [perso, setPerso] = useState<PersonnalisationPack>(initial);
  const [etat, setEtat] = useState<ResultatPack>(null);
  const [enCours, demarrer] = useTransition();
  const photos = perso.photos ?? {};
  const diaporama = photos.diaporama ?? [];
  const majPhotos = (p: Partial<NonNullable<PersonnalisationPack['photos']>>) => setPerso({ ...perso, photos: { ...photos, ...p } });
  const dossier = `banque/${pack.value}`;

  return (
    <section className="grid gap-4 rounded-xl border border-black/5 bg-white p-5">
      <div>
        <h2 className="font-semibold">{pack.label}</h2>
        <p className="text-sm text-neutral-600">{pack.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1">
          <Photo siteId={dossier} type="accueil" label="Photo d’accueil" valeur={photos.accueil ?? ''} onChange={(u) => majPhotos({ accueil: u })} />
          {!photos.accueil && <span className="flex items-center gap-2 text-xs text-neutral-500">Par défaut : <ParDefaut src={pack.photos.accueil} /></span>}
        </div>
        <div className="grid gap-1">
          <Photo siteId={dossier} type="panorama" label="Photo panoramique" valeur={photos.panorama ?? ''} onChange={(u) => majPhotos({ panorama: u })} />
          {!photos.panorama && <span className="flex items-center gap-2 text-xs text-neutral-500">Par défaut : <ParDefaut src={pack.photos.panorama} /></span>}
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Diaporama (accueil Prestige), 6 au maximum</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {[...diaporama, ''].slice(0, 6).map((u, k) => (
            <Photo
              key={u || `nouvelle-${k}`}
              siteId={dossier}
              type="diaporama"
              label={`Diapositive ${k + 1}`}
              valeur={u}
              onChange={(v) => majPhotos({ diaporama: v ? [...diaporama.slice(0, k), v, ...diaporama.slice(k + 1)] : diaporama.filter((_, j) => j !== k) })}
            />
          ))}
        </div>
        {diaporama.length === 0 && (
          <span className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">Par défaut : {pack.photos.diaporama.map((s) => <ParDefaut key={s} src={s} />)}</span>
        )}
      </fieldset>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Animation d’accueil</span>
        <select
          value={perso.animation ?? ''}
          onChange={(e) => setPerso({ ...perso, animation: (e.target.value || null) as PersonnalisationPack['animation'] })}
          className="rounded-lg border border-neutral-300 px-3 py-2"
        >
          <option value="">Par défaut ({pack.animation ? LIBELLES_ANIMATIONS[pack.animation] : 'aucune'})</option>
          {ANIMATIONS.map((a) => <option key={a} value={a}>{LIBELLES_ANIMATIONS[a]}</option>)}
          <option value="aucune">Aucune animation</option>
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={enCours}
          onClick={() => demarrer(async () => setEtat(await enregistrerPack(pack.value, perso)))}
          className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
        >
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {etat && <p className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
      </div>
      <Propagation cible={{ specialite: pack.value }} libelle={`la spécialité « ${pack.label} »`} />
    </section>
  );
}
