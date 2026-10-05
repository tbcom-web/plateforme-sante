'use client';

// Studio portrait : envoi des fichiers dans le stockage existant (bucket Supabase « photos », dossier du site, mêmes
// droits que les autres photos : migration 0008) et assemblage des données enregistrées dans le brouillon.
import { palettePortrait, renduPour, styleDetoure, type PortraitStudio, type RenduImage } from '@plateforme/core/portrait';
import { createClient } from '@/lib/supabase/client';
import type { Atelier, FichierRendu } from './atelier';
import { exporterRendus, exporterSources, type OptionsRendu } from './atelier';

export type ResultatStudio = { photo: string; portrait: PortraitStudio; fichiers: { nom: string; octets: number }[] };

const extension = (b: Blob) => (b.type === 'image/webp' ? 'webp' : b.type === 'image/png' ? 'png' : 'jpg');

/**
 * Exporte et envoie le portrait. `siteId` null : mode démonstration (rien n'est envoyé, URLs locales blob:).
 * La photo du praticien (champ `photo`, repli des anciens affichages) est le rendu 4:5 de 640 px.
 */
export async function enregistrerPortrait(
  siteId: string | null,
  praticienId: string,
  a: Atelier,
  o: Omit<OptionsRendu, 'format' | 'largeur' | 'nettete' | 'avant'>,
  theme: { couleur: string; gamme?: string | null },
  progres?: (texte: string) => void,
): Promise<ResultatStudio> {
  progres?.('Préparation des images…');
  const rendus = await exporterRendus(a, o);
  const sources = await exporterSources(a, o.sansDetourage);
  const base = `${siteId ?? 'demo'}/portrait-${praticienId.replace(/\W+/g, '').slice(0, 20) || 'p'}-${Date.now()}`;
  const fichiers: { nom: string; blob: Blob; rendu?: FichierRendu }[] = [
    { nom: `${base}-source.${extension(sources.source)}`, blob: sources.source },
    ...(sources.detouree ? [{ nom: `${base}-detouree.${extension(sources.detouree)}`, blob: sources.detouree }] : []),
    ...rendus.map((r) => ({ nom: `${base}-${r.format === 'portrait' ? 'p' : 'c'}${r.l}.${extension(r.blob)}`, blob: r.blob, rendu: r })),
  ];

  const urls = new Map<string, string>();
  if (siteId) {
    progres?.('Envoi…');
    const supabase = createClient();
    await Promise.all(fichiers.map(async (f) => {
      const { error } = await supabase.storage.from('photos').upload(f.nom, f.blob, { contentType: f.blob.type, cacheControl: '31536000' });
      if (error) throw error;
      urls.set(f.nom, supabase.storage.from('photos').getPublicUrl(f.nom).data.publicUrl);
    }));
  } else {
    for (const f of fichiers) urls.set(f.nom, URL.createObjectURL(f.blob));
  }

  const liste = (format: 'portrait' | 'carre'): RenduImage[] =>
    fichiers.filter((f) => f.rendu?.format === format).map((f) => ({ l: f.rendu!.l, h: f.rendu!.h, url: urls.get(f.nom)! }));
  const portrait: PortraitStudio = {
    v: 1,
    source: urls.get(fichiers[0].nom)!,
    detouree: sources.detouree ? urls.get(fichiers[1].nom)! : '',
    style: o.sansDetourage && styleDetoure(o.style) ? 'original' : o.style,
    ombre: o.ombre,
    retouche: o.retouche ? a.retouche : null,
    ancre: a.ancre,
    reglage: o.reglage,
    couleurs: palettePortrait(theme).cle,
    rendus: { portrait: liste('portrait'), carre: liste('carre') },
  };
  const photo = renduPour(portrait.rendus.portrait, 640)?.url ?? portrait.rendus.carre[0]?.url ?? '';
  return { photo, portrait, fichiers: fichiers.map((f) => ({ nom: f.nom.split('/').pop()!, octets: f.blob.size })) };
}
