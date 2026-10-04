'use client';

import { useRef, useState } from 'react';
import { PHOTOS_INTEGREES } from '@plateforme/core';
import { envoyerPhoto, TAILLE_MAX } from '@/lib/envoi-photo';

// Choix d'une photo d'un jeu : dans la banque intégrée (/photos, copiée depuis apps/sites/public/photos), ou
// envoi d'un fichier (WebP compressé, stockage Supabase, dossier banque/… réservé à l'admin).

type Props = { label: string; valeur: string; onChange: (url: string) => void; dossier: string; type: string };

const nomCourt = (url: string) => decodeURIComponent(url.split('/').pop() ?? '').replace(/\.webp$/, '');

export default function ChoixPhoto({ label, valeur, onChange, dossier, type }: Props) {
  const entree = useRef<HTMLInputElement>(null);
  const [banque, setBanque] = useState(false);
  const [etat, setEtat] = useState<string | null>(null);

  const envoyer = async (fichier: File) => {
    setEtat('Optimisation et envoi…');
    try {
      const { url, taille } = await envoyerPhoto(dossier, type, fichier, null, TAILLE_MAX);
      onChange(url);
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
        <button type="button" onClick={() => entree.current?.click()} className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50">
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
      {banque && (
        <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-2 sm:grid-cols-6">
          {PHOTOS_INTEGREES.map((src) => (
            <button
              key={src}
              type="button"
              title={nomCourt(src)}
              onClick={() => { onChange(src); setBanque(false); }}
              className={`overflow-hidden rounded ring-2 ${src === valeur ? 'ring-teal-700' : 'ring-transparent hover:ring-neutral-400'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={nomCourt(src)} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {etat && <span className="text-xs text-neutral-600">{etat}</span>}
    </div>
  );
}
