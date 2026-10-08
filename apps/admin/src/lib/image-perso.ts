'use client';

import { createClient } from '@/lib/supabase/client';

// Image envoyée par le praticien (« Personnaliser mon site ») : contrôle des dimensions, recadrage au format de l'emplacement
// autour du POINT FOCAL choisi, réduction à 2000 px au plus, conversion WebP, stockage dans le dossier du site (bucket « photos »).

const MAX = 2000;
const QUALITE = 0.82;

export type ImageLue = { bitmap: ImageBitmap; largeur: number; hauteur: number };

export async function lireImage(f: File): Promise<ImageLue> {
  if (!f.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image (JPEG, PNG ou WebP).');
  if (f.size > 25 * 1024 * 1024) throw new Error('Image trop lourde (25 Mo au plus).');
  const bitmap = await createImageBitmap(f);
  return { bitmap, largeur: bitmap.width, hauteur: bitmap.height };
}

/** Dimensions suffisantes pour l'emplacement (après recadrage au format) ? Message sinon */
export function controleDimensions(l: number, h: number, ratio: number, min: [number, number]): string | null {
  const [cl, ch] = l / h > ratio ? [Math.round(h * ratio), h] : [l, Math.round(l / ratio)];
  if (cl < min[0] * 0.6 || ch < min[1] * 0.6) return `Image trop petite pour cet emplacement (${l} × ${h} px) : ${min[0]} × ${min[1]} px au moins, sinon elle sera floue.`;
  if (cl < min[0] || ch < min[1]) return `Image un peu petite (${l} × ${h} px ; conseillé : ${min[0]} × ${min[1]} px) : elle risque d’être légèrement floue sur grand écran.`;
  return null;
}

/** Zone recadrée (pixels de l'image) au format `ratio`, centrée au plus près du point focal (pourcentages) */
export function zoneRecadree(l: number, h: number, ratio: number, focal: { x: number; y: number }) {
  const [cl, ch] = l / h > ratio ? [Math.round(h * ratio), h] : [l, Math.round(l / ratio)];
  const x = Math.min(l - cl, Math.max(0, Math.round((focal.x / 100) * l - cl / 2)));
  const y = Math.min(h - ch, Math.max(0, Math.round((focal.y / 100) * h - ch / 2)));
  return { x, y, l: cl, h: ch };
}

export async function recadrerEnWebp(img: ImageLue, ratio: number, focal: { x: number; y: number }): Promise<Blob> {
  const z = zoneRecadree(img.largeur, img.hauteur, ratio, focal);
  const e = Math.min(1, MAX / Math.max(z.l, z.h));
  const c = document.createElement('canvas');
  c.width = Math.round(z.l * e);
  c.height = Math.round(z.h * e);
  c.getContext('2d')!.drawImage(img.bitmap, z.x, z.y, z.l, z.h, 0, 0, c.width, c.height);
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('Conversion impossible'))), 'image/webp', QUALITE));
}

export async function envoyerImagePerso(siteId: string, emplacement: string, blob: Blob): Promise<string> {
  const chemin = `${siteId}/perso-${emplacement.replace(/[^a-z0-9]+/gi, '-')}-${Date.now()}.webp`;
  const supabase = createClient();
  const { error } = await supabase.storage.from('photos').upload(chemin, blob, { contentType: 'image/webp', cacheControl: '31536000' });
  if (error) throw new Error('Envoi impossible. Vérifiez votre connexion et réessayez.');
  return supabase.storage.from('photos').getPublicUrl(chemin).data.publicUrl;
}
