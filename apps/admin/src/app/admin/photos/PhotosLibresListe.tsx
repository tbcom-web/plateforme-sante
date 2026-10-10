'use client';

// Photos libres de droits gardées : candidates NON importées (aperçu servi par Pexels / Pixabay, rien d'hébergé, migration
// 0031) avec « Valider et importer » / « Retirer », puis photos importées (fichiers WebP chez nous) avec leur statut.
// Thèmes et HASHTAGS (0029) : filtre « #… », recherche (auteur, thème, mot-clé, hashtag), ajout / retrait sur chaque photo.
import { useMemo, useState, useTransition } from 'react';

const PAR_PAGE = 60;
import { useRouter } from 'next/navigation';
import { cleCandidatePhoto, clePhoto, correspondHashtag, etiquetteKit, hashtagsDe, LIBELLE_IMAGE_GENEREE, LICENCES_SOURCES, libelleSujet, type HashtagsAssets } from '@plateforme/core';
import HashtagsVisuel, { FiltreHashtag } from '@/components/HashtagsVisuel';
import type { PhotoLibre } from '@/lib/photos-libres';
import { changerStatutPhotoLibre, importerPhotoLibre } from './actions';
import StatutPhotoLibre from './StatutPhotoLibre';

const champ = 'min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm';
const jour = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : '—');
/** Libellé de la source : Pexels, Pixabay ou « Image générée » (IA, migration 0040) */
const libelleSource = (p: PhotoLibre) => (p.source === 'ia' ? LIBELLE_IMAGE_GENEREE : LICENCES_SOURCES[p.source].libelle);

/** Candidate non importée : « Valider et importer » (téléchargement côté serveur) ou « Retirer » (sans import) */
function ActionsCandidate({ id, onResultat }: { id: string; onResultat: (r: { ok: boolean; texte: string }) => void }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const agir = (f: () => Promise<{ ok: boolean; message: string } | null>, attente: string) => demarrer(async () => {
    setMessage({ ok: true, texte: attente });
    const r = await f().catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage({ ok: Boolean(r?.ok), texte: r?.message ?? '' });
    // Message gardé au-dessus de la liste : la carte change (importée) après le rafraîchissement
    onResultat({ ok: Boolean(r?.ok), texte: r?.message ?? '' });
    router.refresh();
  });
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2">
        <button type="button" disabled={enCours} onClick={() => agir(() => importerPhotoLibre(id), 'Téléchargement, conversion WebP et hébergement…')}
          className="min-h-11 rounded-xl bg-teal-800 px-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">Valider et importer</button>
        <button type="button" disabled={enCours} onClick={() => agir(() => changerStatutPhotoLibre(id, 'retiree'), 'Retrait…')}
          className="min-h-11 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">Retirer</button>
      </div>
      {message && <p role="status" className={`text-xs ${message.ok ? 'text-neutral-700' : 'text-red-800'}`}>{message.texte}</p>}
    </div>
  );
}

export default function PhotosLibresListe({ photos, hashtags: initiaux, migrationHashtags, migration0031 = false }: { photos: PhotoLibre[]; hashtags: HashtagsAssets; migrationHashtags: boolean; migration0031?: boolean }) {
  const [hashtags, setHashtags] = useState(initiaux);
  const [filtre, setFiltre] = useState('');
  const [recherche, setRecherche] = useState('');
  // Pagination (2026-10-10, « optimiser ») : 60 photos affichées, « Afficher 60 de plus » ; filtres et recherche portent sur toutes
  // (2 000 cartes rendues d'un coup auparavant : 6 Mo de page et plus d'une seconde de rendu serveur)
  const [nbAffichees, setNbAffichees] = useState(PAR_PAGE);
  const [resultat, setResultat] = useState<{ ok: boolean; texte: string } | null>(null);
  // Clé d'asset : photo importée → clé de l'inventaire ; candidate → photo:libre:<source>-<id> (reportée à l'import)
  const lignes = useMemo(() => photos.map((p) => ({ p, cle: p.url ? clePhoto(p.url) : p.source === 'ia' ? null : cleCandidatePhoto(p.source, p.idSource) })), [photos]);
  // Photos gardées pour un kit d'images (#kit-<sujet>, suggestions-kits.ts) et pas encore importées : en tête, étiquetées
  const kitDe = (cle: string | null, p: PhotoLibre) => (cle && !p.url && p.statut !== 'retiree' ? etiquetteKit(hashtagsDe(hashtags, cle)) : null);
  const visibles = lignes.filter(({ p, cle }) => {
    if (filtre && (!cle || !correspondHashtag(hashtags, cle, filtre, true))) return false;
    const q = recherche.trim().toLowerCase().replace(/^#/, '');
    if (!q) return true;
    return [p.auteur, libelleSujet(p.sujet), p.sujet, p.source, p.idSource, ...(p.source === 'ia' ? [LIBELLE_IMAGE_GENEREE, p.iaOutil ?? ''] : []), ...p.motsCles, ...(cle ? hashtagsDe(hashtags, cle) : [])].some((t) => t.toLowerCase().includes(q));
  });
  visibles.sort((a, b) => Number(Boolean(kitDe(b.cle, b.p))) - Number(Boolean(kitDe(a.cle, a.p))));
  const aImporter = visibles.filter(({ p }) => !p.url && p.statut !== 'retiree').length;

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (auteur, thème, mot-clé, #hashtag)" aria-label="Rechercher une photo" className={champ} />
        <FiltreHashtag valeur={filtre} onChange={setFiltre} etat={hashtags} className={champ} />
      </div>
      {migration0031 && <p className="text-sm text-amber-900">Migration 0031 à exécuter (<code>supabase/migrations/0031_photos_libres_import_differe.sql</code>) : « Garder » sans import et « Valider et importer » ne fonctionnent pas encore.</p>}
      {migrationHashtags && <p className="text-sm text-amber-900">Migration 0029 à exécuter (<code>supabase/migrations/0029_assets_hashtags.sql</code>) : hashtags non enregistrés.</p>}
      {resultat && <p role="status" className={`rounded-lg p-3 text-sm ring-1 ${resultat.ok ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-red-50 text-red-900 ring-red-200'}`}>{resultat.texte}</p>}
      <p className="text-xs text-neutral-500">{visibles.length} photo{visibles.length > 1 ? 's' : ''} sur {photos.length}{aImporter ? ` · ${aImporter} à valider et importer` : ''}</p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.slice(0, nbAffichees).map(({ p, cle }) => {
          const importee = Boolean(p.url);
          const src = p.url ?? p.apercuUrl;
          return (
            <li key={p.id} className={`grid min-w-0 content-start gap-2 rounded-xl border bg-white p-3 ${importee ? 'border-black/10' : 'border-dashed border-amber-300'} ${p.statut === 'retiree' ? 'opacity-60' : ''}`}>
              <figure className="relative grid gap-1">
                {src ? (
                  // Candidate : aperçu servi par la source (évaluation seulement, jamais utilisé sur un site) ; importée : notre copie
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={`${libelleSujet(p.sujet)} · photo de ${p.auteur}`} loading="lazy" referrerPolicy="no-referrer" className="aspect-[3/2] w-full rounded-lg bg-neutral-100 object-cover" />
                ) : <div className="grid aspect-[3/2] w-full place-items-center rounded-lg bg-neutral-100 text-xs text-neutral-500">Aperçu indisponible</div>}
                {!importee && (
                  <figcaption className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950 ring-1 ring-amber-300">
                    Aperçu {libelleSource(p)}, non importée
                  </figcaption>
                )}
                {p.source === 'ia' && <span className="absolute right-2 top-2 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-950 ring-1 ring-violet-300">{LIBELLE_IMAGE_GENEREE}</span>}
                {kitDe(cle, p) && <span className="absolute bottom-2 left-2 rounded-full bg-teal-800 px-2 py-0.5 text-[11px] font-semibold text-white">{kitDe(cle, p)!.libelle}</span>}
              </figure>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
                <dt className="text-neutral-500">Sujet</dt><dd>{libelleSujet(p.sujet)}</dd>
                {p.source === 'ia' ? (
                  <>
                    <dt className="text-neutral-500">Source</dt><dd>{LIBELLE_IMAGE_GENEREE} par IA · {p.iaOutil ?? 'outil non renseigné'} · {p.largeurOriginale} × {p.hauteurOriginale} px</dd>
                    <dt className="text-neutral-500">Générée</dt><dd>{jour(p.iaGenereLe ?? null)}</dd>
                    <dt className="text-neutral-500">Auteur</dt><dd className="truncate">{p.auteur}</dd>
                    <dt className="text-neutral-500">Conditions</dt><dd>{p.licenceUrl ? <a href={p.licenceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{p.licence}</a> : p.licence}, {p.licenceVersion}{p.iaConditions ? ` : ${p.iaConditions}` : ''}</dd>
                  </>
                ) : (
                  <>
                    <dt className="text-neutral-500">Source</dt><dd><a href={p.pageUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{libelleSource(p)} n° {p.idSource}</a> · {p.largeurOriginale} × {p.hauteurOriginale} px</dd>
                    <dt className="text-neutral-500">Auteur</dt><dd className="truncate">{p.auteurUrl ? <a href={p.auteurUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{p.auteur}</a> : p.auteur}</dd>
                    <dt className="text-neutral-500">Licence</dt><dd><a href={p.licenceUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{p.licence}</a>, {p.licenceVersion}</dd>
                  </>
                )}
                <dt className="text-neutral-500">Importée</dt><dd>{importee ? `${jour(p.importeLe ?? p.telechargeLe)} · ${p.largeurs.join(', ')} px` : 'non (lien seulement)'}</dd>
                {p.source !== 'ia' && <><dt className="text-neutral-500">Mots-clés</dt><dd className="truncate">{p.motsCles.join(', ')}</dd></>}
              </dl>
              {p.source === 'ia' && p.iaPrompt && (
                <details className="text-xs"><summary className="cursor-pointer text-neutral-700">Prompt utilisé</summary><p className="mt-1 whitespace-pre-wrap break-words text-neutral-600">{p.iaPrompt}</p></details>
              )}
              {cle && <HashtagsVisuel cle={cle} etat={hashtags} onChange={setHashtags} migrationManquante={migrationHashtags} compact />}
              {importee ? <StatutPhotoLibre id={p.id} statut={p.statut} /> : p.statut === 'retiree' ? <p className="text-xs text-neutral-600">Retirée sans import (traçabilité conservée).</p> : <ActionsCandidate id={p.id} onResultat={setResultat} />}
            </li>
          );
        })}
      </ul>
      {visibles.length > nbAffichees && <button type="button" onClick={() => setNbAffichees((n) => n + PAR_PAGE)} className="min-h-11 justify-self-start rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold">Afficher {Math.min(PAR_PAGE, visibles.length - nbAffichees)} de plus ({visibles.length - nbAffichees} restantes)</button>}
      {!visibles.length && <p className="text-sm text-neutral-500">Aucune photo pour ces filtres.</p>}
    </div>
  );
}
