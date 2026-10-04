'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Envoi d'une photo : redimensionnée et convertie en WebP dans le navigateur, puis stockée dans Supabase
// (dossier du site). Les règles de stockage n'autorisent que le propriétaire du site.

const TAILLE_MAX = 2000;
const QUALITE = 0.82;

/** Redimensionne (et recadre au centre si un ratio largeur/hauteur est imposé), puis convertit en WebP. */
async function compresser(fichier: File, ratio: number | null, max: number): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  let { width: l, height: h } = image;
  let sx = 0, sy = 0, sl = l, sh = h;
  if (ratio) {
    if (l / h > ratio) { sl = Math.round(h * ratio); sx = (l - sl) / 2; } else { sh = Math.round(l / ratio); sy = (h - sh) / 2; }
    l = sl; h = sh;
  }
  const echelle = Math.min(1, max / Math.max(l, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(l * echelle);
  canvas.height = Math.round(h * echelle);
  canvas.getContext('2d')!.drawImage(image, sx, sy, sl, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('Conversion impossible'))), 'image/webp', QUALITE));
}

type Props = {
  siteId: string | null;
  /** Préfixe du nom de fichier : accueil, cabinet, portrait… */
  type: string;
  valeur: string;
  onChange: (url: string) => void;
  /** Recadrage carré (portraits) */
  carre?: boolean;
  /** Recadrage à un ratio largeur/hauteur (ex. 16 / 9 pour les images d'articles) */
  ratio?: number;
  /** Plus grand côté en pixels après redimensionnement */
  largeurMax?: number;
  label: string;
};

export default function Photo({ siteId, type, valeur, onChange, carre = false, ratio, largeurMax, label }: Props) {
  const entree = useRef<HTMLInputElement>(null);
  const [etat, setEtat] = useState<string | null>(null);

  const envoyer = async (fichier: File) => {
    if (!siteId) return setEtat('Enregistrez d’abord une étape pour pouvoir ajouter des photos.');
    if (!fichier.type.startsWith('image/')) return setEtat('Ce fichier n’est pas une image.');
    setEtat('Optimisation…');
    try {
      const blob = await compresser(fichier, carre ? 1 : ratio ?? null, largeurMax ?? (carre ? 800 : TAILLE_MAX));
      setEtat('Envoi…');
      const chemin = `${siteId}/${type}-${Date.now()}.webp`;
      const supabase = createClient();
      const { error } = await supabase.storage.from('photos').upload(chemin, blob, { contentType: 'image/webp', cacheControl: '31536000' });
      if (error) throw error;
      onChange(supabase.storage.from('photos').getPublicUrl(chemin).data.publicUrl);
      setEtat(`Photo ajoutée (${Math.round(blob.size / 1024)} Ko).`);
    } catch {
      setEtat('Envoi impossible. Vérifiez le format de l’image et réessayez.');
    }
  };

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-3">
        {valeur ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={valeur} alt="" className={`${carre ? 'size-16 rounded-full' : 'h-16 w-24 rounded-lg'} border border-neutral-200 object-cover`} />
        ) : (
          <span className={`${carre ? 'size-16 rounded-full' : 'h-16 w-24 rounded-lg'} grid place-items-center border border-dashed border-neutral-300 text-xs text-neutral-400`}>
            Aucune
          </span>
        )}
        <button type="button" onClick={() => entree.current?.click()} className="rounded-lg border border-neutral-300 px-3 py-2 font-medium hover:bg-neutral-50">
          {valeur ? 'Remplacer' : 'Ajouter une photo'}
        </button>
        {valeur && (
          <button type="button" onClick={() => onChange('')} className="text-xs text-red-700">
            Retirer
          </button>
        )}
        <input
          ref={entree}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) envoyer(f);
            e.target.value = '';
          }}
        />
      </div>
      {etat && <span className="text-xs text-neutral-600">{etat}</span>}
    </div>
  );
}
