'use client';

// Photos libres de droits gardées (traçabilité, statut) avec leurs thèmes et HASHTAGS (migration 0029) : filtre « #… »,
// recherche (auteur, thème, mot-clé, hashtag) et ajout / retrait de hashtags sur chaque photo.
import { useMemo, useState } from 'react';
import { clePhoto, correspondHashtag, hashtagsDe, libelleSujet, type HashtagsAssets } from '@plateforme/core';
import HashtagsVisuel, { FiltreHashtag } from '@/components/HashtagsVisuel';
import type { PhotoLibre } from '@/lib/photos-libres';
import StatutPhotoLibre from './StatutPhotoLibre';

const champ = 'min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm';

export default function PhotosLibresListe({ photos, hashtags: initiaux, migrationHashtags }: { photos: PhotoLibre[]; hashtags: HashtagsAssets; migrationHashtags: boolean }) {
  const [hashtags, setHashtags] = useState(initiaux);
  const [filtre, setFiltre] = useState('');
  const [recherche, setRecherche] = useState('');
  const lignes = useMemo(() => photos.map((p) => ({ p, cle: clePhoto(p.url) })), [photos]);
  const visibles = lignes.filter(({ p, cle }) => {
    if (filtre && (!cle || !correspondHashtag(hashtags, cle, filtre, true))) return false;
    const q = recherche.trim().toLowerCase().replace(/^#/, '');
    if (!q) return true;
    return [p.auteur, libelleSujet(p.sujet), p.sujet, p.source, p.idSource, ...p.motsCles, ...(cle ? hashtagsDe(hashtags, cle) : [])].some((t) => t.toLowerCase().includes(q));
  });

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (auteur, thème, mot-clé, #hashtag)" aria-label="Rechercher une photo" className={champ} />
        <FiltreHashtag valeur={filtre} onChange={setFiltre} etat={hashtags} className={champ} />
      </div>
      {migrationHashtags && <p className="text-sm text-amber-900">Migration 0029 à exécuter (<code>supabase/migrations/0029_assets_hashtags.sql</code>) : hashtags non enregistrés.</p>}
      <p className="text-xs text-neutral-500">{visibles.length} photo{visibles.length > 1 ? 's' : ''} sur {photos.length}</p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map(({ p, cle }) => (
          <li key={p.id} className={`grid min-w-0 content-start gap-2 rounded-xl border border-black/10 bg-white p-3 ${p.statut === 'retiree' ? 'opacity-60' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`${libelleSujet(p.sujet)} · photo de ${p.auteur}`} loading="lazy" className="aspect-[3/2] w-full rounded-lg bg-neutral-100 object-cover" />
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
              <dt className="text-neutral-500">Sujet</dt><dd>{libelleSujet(p.sujet)}</dd>
              <dt className="text-neutral-500">Source</dt><dd><a href={p.pageUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{p.source === 'pexels' ? 'Pexels' : 'Pixabay'} n° {p.idSource}</a></dd>
              <dt className="text-neutral-500">Auteur</dt><dd className="truncate">{p.auteurUrl ? <a href={p.auteurUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{p.auteur}</a> : p.auteur}</dd>
              <dt className="text-neutral-500">Licence</dt><dd><a href={p.licenceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{p.licence}</a>, {p.licenceVersion}</dd>
              <dt className="text-neutral-500">Téléchargée</dt><dd>{new Date(p.telechargeLe).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })} · {p.largeurs.join(', ')} px</dd>
              <dt className="text-neutral-500">Mots-clés</dt><dd className="truncate">{p.motsCles.join(', ')}</dd>
            </dl>
            {cle && <HashtagsVisuel cle={cle} etat={hashtags} onChange={setHashtags} migrationManquante={migrationHashtags} compact />}
            <StatutPhotoLibre id={p.id} statut={p.statut} />
          </li>
        ))}
      </ul>
      {!visibles.length && <p className="text-sm text-neutral-500">Aucune photo pour ces filtres.</p>}
    </div>
  );
}
