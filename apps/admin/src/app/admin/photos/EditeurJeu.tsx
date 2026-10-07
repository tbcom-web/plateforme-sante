'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  dossierJeuExclusif, dossierJeuPartage, estPhotoIntegree, GALERIE_MAX, LIBELLES_SOURCES, photosDuJeu, specialite as specialiteDe,
  type JeuPhotos, type PhotosJeu, type SourceJeuPhotos,
} from '@plateforme/core';
import Propagation from '@/components/Propagation';
import ChoixPhoto from './ChoixPhoto';
import { basculerJeu, enregistrerJeu, type Licence, type Resultat } from './actions';

type Props = {
  /** Jeu existant, ou null pour un nouveau jeu */
  jeu: JeuPhotos | null;
  specialite: string;
  /** null : jeu partagé ; sinon jeu exclusif de ce site (photos premium) */
  siteId: string | null;
  soins: { slug: string; titre: string }[];
  /** Licences déjà enregistrées (URL → licence) */
  licences?: Record<string, Licence>;
  /** Nombre de sites auxquels le jeu est affecté */
  nbSites?: number;
  /** Ouvert d'emblée (nouveau jeu) */
  ouvert?: boolean;
  /** Photos libres de droits validées (Pexels / Pixabay, hébergées chez nous) proposées au choix : jeux partagés seulement */
  libres?: { url: string; legende: string }[];
};

const VIDE: PhotosJeu = { accueil: '', panorama: '', galerie: [], soins: {} };
const LICENCE_VIDE: Licence = { reference: '', dateAchat: '', transferee: false, notes: '' };

/** Planche contact : toutes les photos du jeu en vignettes, avec leur emplacement */
export function PlancheContact({ photos, soins }: { photos: PhotosJeu; soins: { slug: string; titre: string }[] }) {
  const cases = [
    ...(photos.accueil ? [{ src: photos.accueil, legende: 'Accueil' }] : []),
    ...(photos.panorama ? [{ src: photos.panorama, legende: 'Panorama' }] : []),
    ...photos.galerie.map((src, k) => ({ src, legende: `Galerie ${k + 1}` })),
    ...Object.entries(photos.soins).map(([slug, src]) => ({ src, legende: soins.find((s) => s.slug === slug)?.titre ?? slug })),
  ];
  if (!cases.length) return <p className="text-xs text-neutral-500">Aucune photo : le site garde les photos intégrées de la spécialité.</p>;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
      {cases.map((c, k) => (
        <figure key={`${c.src}-${k}`} className="grid gap-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.src} alt="" loading="lazy" className="aspect-[4/3] w-full rounded object-cover" style={{ objectPosition: photos.cadrages?.[c.src] }} />
          <figcaption className="truncate text-[11px] text-neutral-600">{c.legende}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function EditeurJeu({ jeu, specialite, siteId, soins, licences: licencesInitiales = {}, nbSites = 0, ouvert = false, libres = [] }: Props) {
  const router = useRouter();
  const [nom, setNom] = useState(jeu?.nom ?? '');
  const [source, setSource] = useState<SourceJeuPhotos>(jeu?.source ?? (siteId ? 'adobe' : 'banque'));
  const [photos, setPhotos] = useState<PhotosJeu>(jeu?.photos ?? VIDE);
  const [licences, setLicences] = useState<Record<string, Licence>>(licencesInitiales);
  const [edition, setEdition] = useState(ouvert);
  const [etat, setEtat] = useState<Resultat>(null);
  const [enCours, demarrer] = useTransition();

  const dossier = siteId ? dossierJeuExclusif(siteId) : dossierJeuPartage(specialite);
  const maj = (p: Partial<PhotosJeu>) => setPhotos({ ...photos, ...p });
  const aLicencier = source === 'adobe' ? photosDuJeu(photos).filter((u) => !estPhotoIntegree(u)) : [];
  const majLicence = (url: string, l: Partial<Licence>) => setLicences({ ...licences, [url]: { ...LICENCE_VIDE, ...licences[url], ...l } });

  const enregistrer = () =>
    demarrer(async () => {
      const r = await enregistrerJeu(jeu?.id ?? null, { nom, specialite, source, siteId, actif: jeu?.actif ?? true, photos }, licences);
      setEtat(r);
      if (r?.ok) {
        if (!jeu) { setNom(''); setPhotos(VIDE); setLicences({}); setEdition(false); }
        router.refresh();
      }
    });

  return (
    <section className={`grid gap-3 rounded-xl border bg-white p-4 ${jeu && !jeu.actif ? 'border-dashed border-neutral-300 opacity-80' : 'border-black/5'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-semibold">{jeu ? jeu.nom : 'Nouveau jeu'}</h3>
        {jeu && (
          <>
            <span className="text-xs text-neutral-500">{LIBELLES_SOURCES[jeu.source]}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${jeu.actif ? 'bg-teal-100 text-teal-900' : 'bg-neutral-200 text-neutral-700'}`}>{jeu.actif ? 'actif' : 'inactif'}</span>
            <span className="text-xs text-neutral-600">{nbSites} site(s) l’utilisent</span>
          </>
        )}
        <span className="ml-auto flex gap-2">
          {jeu && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => demarrer(async () => { setEtat(await basculerJeu(jeu.id, !jeu.actif)); router.refresh(); })}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {jeu.actif ? 'Désactiver' : 'Activer'}
            </button>
          )}
          <button type="button" onClick={() => setEdition(!edition)} aria-expanded={edition} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50">
            {edition ? 'Fermer' : jeu ? 'Modifier' : 'Créer un jeu'}
          </button>
        </span>
      </div>

      {jeu && <PlancheContact photos={edition ? photos : jeu.photos} soins={soins} />}

      {edition && (
        <div className="grid gap-4 border-t border-neutral-100 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Nom du jeu</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} placeholder={`${specialiteDe(specialite).label}, lumière naturelle`} className="rounded-lg border border-neutral-300 px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Origine des photos</span>
              <select value={source} disabled={!siteId} onChange={(e) => setSource(e.target.value as SourceJeuPhotos)} className="rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-50">
                {(siteId ? (['adobe', 'praticien', 'banque'] as const) : (['banque'] as const)).map((s) => <option key={s} value={s}>{LIBELLES_SOURCES[s]}</option>)}
              </select>
              {!siteId && <span className="text-xs text-neutral-500">Un jeu partagé ne contient que des photos de la banque : jamais de photo Adobe Stock ni de photo d’un praticien.</span>}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ChoixPhoto label="Photo d’accueil" valeur={photos.accueil} onChange={(u) => maj({ accueil: u })} dossier={dossier} libres={libres} type="accueil" />
            <ChoixPhoto label="Photo panoramique" valeur={photos.panorama} onChange={(u) => maj({ panorama: u })} dossier={dossier} libres={libres} type="panorama" />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Galerie et diaporama ({GALERIE_MAX} au maximum)</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {[...photos.galerie, ''].slice(0, GALERIE_MAX).map((u, k) => (
                <ChoixPhoto
                  key={u || `nouvelle-${k}`}
                  label={`Photo ${k + 1}`}
                  valeur={u}
                  dossier={dossier} libres={libres}
                  type="galerie"
                  onChange={(v) => maj({ galerie: v ? [...photos.galerie.slice(0, k), v, ...photos.galerie.slice(k + 1)] : photos.galerie.filter((_, j) => j !== k) })}
                />
              ))}
            </div>
          </fieldset>

          <details className="rounded-lg border border-neutral-200 p-3">
            <summary className="cursor-pointer text-sm font-medium">Photos par soin ({Object.keys(photos.soins).length} / {soins.length}) : facultatif, sinon photo du jeu visuel</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {soins.map((s) => (
                <ChoixPhoto
                  key={s.slug}
                  label={s.titre}
                  valeur={photos.soins[s.slug] ?? ''}
                  dossier={dossier} libres={libres}
                  type={`soin-${s.slug}`}
                  onChange={(v) => {
                    const suivant = { ...photos.soins };
                    if (v) suivant[s.slug] = v; else delete suivant[s.slug];
                    maj({ soins: suivant });
                  }}
                />
              ))}
            </div>
          </details>

          {aLicencier.length > 0 && (
            <fieldset className="grid gap-2 rounded-lg bg-amber-50 p-3">
              <legend className="px-1 text-sm font-medium text-amber-900">Licences Adobe Stock (une par photo, au nom du client)</legend>
              {aLicencier.map((url) => {
                const l = licences[url] ?? LICENCE_VIDE;
                return (
                  <div key={url} className="grid items-center gap-2 sm:grid-cols-[80px_1fr_150px_auto]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-12 w-20 rounded object-cover" />
                    <input value={l.reference} onChange={(e) => majLicence(url, { reference: e.target.value })} placeholder="Référence de licence Adobe" aria-label="Référence de licence Adobe" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                    <input type="date" value={l.dateAchat} onChange={(e) => majLicence(url, { dateAchat: e.target.value })} aria-label="Date d’achat" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={l.transferee} onChange={(e) => majLicence(url, { transferee: e.target.checked })} className="accent-amber-600" />
                      Transférée au client
                    </label>
                    <input value={l.notes} onChange={(e) => majLicence(url, { notes: e.target.value })} placeholder="Notes (n° de commande, courrier de transfert…)" aria-label="Notes" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-3 sm:col-start-2" />
                  </div>
                );
              })}
            </fieldset>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={enCours} onClick={enregistrer} className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
              {enCours ? 'Enregistrement…' : 'Enregistrer le jeu'}
            </button>
          </div>
        </div>
      )}
      {etat && <p className={`text-sm ${etat.ok ? 'text-teal-800' : 'text-red-700'}`}>{etat.message}</p>}
      {jeu && <Propagation cible={{ jeuPhotos: jeu.id }} libelle={`le jeu « ${jeu.nom} »`} />}
    </section>
  );
}
