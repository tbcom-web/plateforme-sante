'use client';

// Récapitulatif « Sources et licences » : TOUTES les images (banque intégrée, photos libres, photos envoyées, Adobe Stock,
// photos des praticiens) avec source, licence, lien et statut ; filtres ; « Compléter » pour une photo envoyée sans source.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LIBELLES_TYPES_SOURCE, type LigneSourceImage, type TypeSourceImage } from '@plateforme/core';
import { enregistrerSourcePhoto } from './actions';
import FormulaireSource from './FormulaireSource';

const PAR_PAGE = 60;
const champ = 'min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm';

function Apercu({ url }: { url: string }) {
  if (!/^(\/|https:\/\/)/.test(url)) return <span className="grid size-16 shrink-0 place-items-center rounded-md bg-neutral-100 text-[10px] text-neutral-500">—</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-md bg-neutral-100 object-cover" />;
}

export default function SourcesLicences({ lignes, migration0031 }: { lignes: LigneSourceImage[]; migration0031: boolean }) {
  const router = useRouter();
  const [type, setType] = useState<'' | TypeSourceImage>('');
  const [aRenseigner, setARenseigner] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  // Pagination du rendu (perf vague 2, 2026-10-10) : 60 images affichées, « Afficher 60 de plus » ; filtres et recherche portent sur
  // toutes (toutes les images rendues d'un coup auparavant : ≈ 1,3 Mo de page au volume ×10)
  const [nbAffichees, setNbAffichees] = useState(PAR_PAGE);
  const nbARenseigner = lignes.filter((l) => l.aRenseigner).length;
  const types = useMemo(() => [...new Set(lignes.map((l) => l.type))], [lignes]);
  const visibles = lignes.filter((l) => {
    if (type && l.type !== type) return false;
    if (aRenseigner && !l.aRenseigner) return false;
    const q = recherche.trim().toLowerCase();
    return !q || [l.url, l.fournisseur, l.auteur, l.licence, l.statut, l.usage].some((t) => t.toLowerCase().includes(q));
  });

  return (
    <div className="grid gap-3">
      {migration0031 && <p className="text-sm text-amber-900">Migration 0031 à exécuter (<code>supabase/migrations/0031_photos_libres_import_differe.sql</code>) : les sources des photos envoyées ne peuvent pas encore être enregistrées.</p>}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher (fichier, auteur, licence, jeu)" aria-label="Rechercher une image" className={champ} />
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Type de source" className={champ}>
          <option value="">Toutes les sources</option>
          {types.map((t) => <option key={t} value={t}>{LIBELLES_TYPES_SOURCE[t]}</option>)}
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={aRenseigner} onChange={(e) => setARenseigner(e.target.checked)} className="size-4 accent-teal-700" />
          Source à renseigner ({nbARenseigner})
        </label>
      </div>
      {message && <p role="status" className={`rounded-lg p-3 text-sm ring-1 ${message.ok ? 'bg-teal-50 text-teal-950 ring-teal-200' : 'bg-red-50 text-red-900 ring-red-200'}`}>{message.texte}</p>}
      <p className="text-xs text-neutral-500">{visibles.length} image{visibles.length > 1 ? 's' : ''} sur {lignes.length}</p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-2">
        {visibles.slice(0, nbAffichees).map((l) => (
          <li key={l.url} className={`grid gap-2 rounded-xl border bg-white p-3 text-sm ${l.aRenseigner ? 'border-amber-300' : 'border-black/10'}`}>
            <div className="flex min-w-0 gap-3">
              <Apercu url={l.url} />
              <div className="grid min-w-0 gap-0.5">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-800">{LIBELLES_TYPES_SOURCE[l.type]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.aRenseigner ? 'bg-amber-100 text-amber-950' : 'bg-teal-50 text-teal-900'}`}>{l.statut}</span>
                </p>
                <p className="truncate font-medium" title={l.url}>{decodeURIComponent(l.url.split('/').pop() ?? l.url)}</p>
                <p className="text-xs text-neutral-700">
                  {[l.fournisseur, l.auteur].filter(Boolean).join(' · ') || '—'}
                  {l.lien && <> · <a href={l.lien} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">page d’origine</a></>}
                </p>
                <p className="text-xs text-neutral-700">
                  {l.lienLicence ? <a href={l.lienLicence} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{l.licence}</a> : l.licence || 'Licence inconnue'}
                  {l.date && <> · {l.date}</>}
                </p>
                {l.usage && <p className="truncate text-[11px] text-neutral-500" title={l.usage}>Utilisée : {l.usage}</p>}
              </div>
            </div>
            {l.aRenseigner && l.type === 'banque' && l.chemin && (ouverte === l.url ? (
              <FormulaireSource libelleBouton="Enregistrer la source" onAnnuler={() => setOuverte(null)} onValider={async (s) => {
                const r = await enregistrerSourcePhoto(l.chemin!, s).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
                setMessage({ ok: Boolean(r?.ok), texte: r?.message ?? '' });
                if (r?.ok) { setOuverte(null); router.refresh(); }
              }} />
            ) : (
              <button type="button" onClick={() => setOuverte(l.url)} className="min-h-11 w-fit rounded-xl border border-amber-400 bg-white px-3 text-sm font-semibold text-amber-950 hover:bg-amber-50">Compléter la source</button>
            ))}
            {l.aRenseigner && l.type === 'adobe' && <p className="text-xs text-amber-900">Licence Adobe Stock à saisir dans le jeu exclusif du site (fiche photos du site).</p>}
            {l.aRenseigner && l.type === 'inconnue' && <p className="text-xs text-amber-900">Adresse hors de nos dossiers : remplacer la photo dans le jeu.</p>}
          </li>
        ))}
      </ul>
      {visibles.length > nbAffichees && <button type="button" onClick={() => setNbAffichees((n) => n + PAR_PAGE)} className="min-h-11 justify-self-start rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold">Afficher {Math.min(PAR_PAGE, visibles.length - nbAffichees)} de plus ({visibles.length - nbAffichees} restantes)</button>}
      {!visibles.length && <p className="text-sm text-neutral-500">Aucune image pour ces filtres.</p>}
    </div>
  );
}
