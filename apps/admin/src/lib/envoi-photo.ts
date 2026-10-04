'use client';

import { createClient } from '@/lib/supabase/client';

// Envoi d'une photo depuis le navigateur : redimensionnée (et recadrée si un ratio est imposé), convertie en WebP,
// puis stockée dans Supabase, dossier du site (ou « banque/… » pour l'admin). Renvoie l'URL publique.

export const TAILLE_MAX = 2000;
const QUALITE = 0.82;

/** Redimensionne (et recadre au centre si un ratio largeur/hauteur est imposé), puis convertit en WebP. */
export async function compresser(fichier: File, ratio: number | null, max: number): Promise<Blob> {
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

export async function envoyerPhoto(dossier: string, type: string, fichier: File, ratio: number | null, max: number): Promise<{ url: string; taille: number }> {
  if (!fichier.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.');
  const blob = await compresser(fichier, ratio, max);
  const chemin = `${dossier}/${type}-${Date.now()}.webp`;
  const supabase = createClient();
  const { error } = await supabase.storage.from('photos').upload(chemin, blob, { contentType: 'image/webp', cacheControl: '31536000' });
  if (error) throw error;
  return { url: supabase.storage.from('photos').getPublicUrl(chemin).data.publicUrl, taille: blob.size };
}
