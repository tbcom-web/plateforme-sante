'use client';

import { useRef, useState } from 'react';
import { creditPhotoIntegree, PHOTOS_INTEGREES, type SourcePhotoManuelle } from '@plateforme/core';
import { envoyerPhoto, TAILLE_MAX } from '@/lib/envoi-photo';
import { enregistrerSourcePhoto } from './actions';
import FormulaireSource from './FormulaireSource';

// Choix d'une photo d'un jeu : dans la banque intégrée (/photos, copiée depuis apps/sites/public/photos), ou
// envoi d'un fichier (WebP compressé, stockage Supabase, dossier banque/… réservé à l'admin), ou parmi les photos libres de
// droits validées (Pexels / Pixabay, hébergées chez nous avec leur licence tracée : /admin/retours, « Photos à découvrir »).
// `exigeSource` (jeux « banque ») : la provenance est demandée AVANT l'envoi et enregistrée avec la photo (photos_sources, 0031).

type Props = { label: string; valeur: string; onChange: (url: string) => void; dossier: string; type: string; libres?: { url: string; legende: string }[]; exigeSource?: boolean };

const nomCourt = (url: string) => decodeURIComponent(url.split('/').pop() ?? '').replace(/\.webp$/, '');

export default function ChoixPhoto({ label, valeur, onChange, dossier, type, libres = [], exigeSource = false }: Props) {
  const entree = useRef<HTMLInputElement>(null);
  const [demandeSource, setDemandeSource] = useState(false);
  const source = useRef<SourcePhotoManuelle | null>(null);
  const [banque, setBanque] = useState(false);
  const [libre, setLibre] = useState(false);
  const [etat, setEtat] = useState<string | null>(null);

  const envoyer = async (fichier: File) => {
    setEtat('Optimisation et envoi…');
    try {
      const { url, taille } = await envoyerPhoto(dossier, type, fichier, null, TAILLE_MAX);
      onChange(url);
      if (exigeSource && source.current) {
        const r = await enregistrerSourcePhoto(url, source.current).catch(() => ({ ok: false, message: 'Connexion perdue : source non enregistrée.' }));
        setEtat(`Photo ajoutée (${Math.round(taille / 1024)} Ko). ${r?.ok ? r.message : `${r?.message ?? ''} Complétez-la dans « Sources et licences ».`}`);
        source.current = null;
        return;
      }
      setEtat(`Photo ajoutée (${Math.round(taille / 1024)} Ko).`);
    } catch {
      setEtat('Envoi impossible. Vérifiez le format de l’image et réessayez.');
    }
  };

  return (
    <div className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {valeur ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={valeur} alt="" title={nomCourt(valeur)} className="h-14 w-20 rounded-md border border-neutral-200 object-cover" />
        ) : (
          <span className="grid h-14 w-20 place-items-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-400">Aucune</span>
        )}
        <button type="button" onClick={() => setBanque(!banque)} aria-expanded={banque} className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50">
          Banque intégrée
        </button>
        {libres.length > 0 && (
          <button type="button" onClick={() => setLibre(!libre)} aria-expanded={libre} className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50">
            Libres de droits ({libres.length})
          </button>
        )}
        <button type="button" onClick={() => (exigeSource ? setDemandeSource(true) : entree.current?.click())} className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50">
          Envoyer
        </button>
        {valeur && <button type="button" onClick={() => onChange('')} className="text-xs text-red-700">Retirer</button>}
        <input
          ref={entree}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void envoyer(f); e.target.value = ''; }}
        />
      </div>
      {demandeSource && (
        <FormulaireSource libelleBouton="Choisir le fichier" onAnnuler={() => setDemandeSource(false)}
          onValider={(s) => { source.current = s; setDemandeSource(false); entree.current?.click(); }} />
      )}
      {banque && (
        <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-2 sm:grid-cols-6">
          {PHOTOS_INTEGREES.map((src) => (
            <button
              key={src}
              type="button"
              title={(() => { const c = creditPhotoIntegree(src); return c ? `${nomCourt(src)} · Unsplash, ${c.photographe}` : nomCourt(src); })()}
              onClick={() => { onChange(src); setBanque(false); }}
              className={`overflow-hidden rounded ring-2 ${src === valeur ? 'ring-teal-700' : 'ring-transparent hover:ring-neutral-400'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={nomCourt(src)} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {libre && (
        <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-2 sm:grid-cols-5">
          {libres.map((p) => (
            <button
              key={p.url}
              type="button"
              title={p.legende}
              onClick={() => { onChange(p.url); setLibre(false); }}
              className={`overflow-hidden rounded ring-2 ${p.url === valeur ? 'ring-teal-700' : 'ring-transparent hover:ring-neutral-400'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.legende} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {etat && <span className="text-xs text-neutral-600">{etat}</span>}
    </div>
  );
}
