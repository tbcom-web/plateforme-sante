// Studio portrait : préparation d'une photo (orientation, réduction, détourage, visage, retouche), composition d'un rendu
// (fond, ombre, personne, netteté) et export (WebP, sinon JPEG ; détourée en WebP avec transparence, sinon PNG).
// Le canvas ré-encode l'image : les métadonnées EXIF (dont la géolocalisation) ne sont jamais conservées.
import {
  ancreDepuisSilhouette, ancreDepuisVisage, ancreParDefaut, cadrer, calculerRetouche, COTE_SOURCE, hauteurRendu, largeursRendu,
  LARGEUR_MOBILE, POIDS_CIBLE_MOBILE, scoreDetourage, styleDetoure,
  type Ancre, type FormatPortrait, type PalettePortrait, type Rect, type Reglage, type Retouche, type StylePortrait,
} from '@plateforme/core/portrait';
import { masquePersonne, visagePrincipal } from './moteur';
import {
  accentuer, affinerMasque, appliquerRetouche, debruiter, detourer, flouFond, flouRGBA, mesurerMasque, niveauxGris, silhouette, statsPhoto,
} from './pixels';

/** Photo prête à composer */
export type Atelier = {
  l: number;
  h: number;
  /** Photo d'origine orientée et réduite (avant) */
  brute: HTMLCanvasElement;
  /** Personne détourée d'après la photo d'origine (RGBA), ou null */
  detouree: HTMLCanvasElement | null;
  /** Versions retouchées (calculées à la demande) */
  retouchee: HTMLCanvasElement | null;
  detoureeRetouchee: HTMLCanvasElement | null;
  retouche: Retouche;
  ancre: Ancre;
  /** Visage détecté (sinon cadrage d'après la silhouette ou par défaut) */
  visage: boolean;
  /** Score de confiance du détourage (0 à 1), null si pas de détourage */
  score: number | null;
};

export type Etape = 'lecture' | 'outils' | 'detourage' | 'retouche';

const canvas = (l: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(l));
  c.height = Math.max(1, Math.round(h));
  return c;
};
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;
const pause = () => new Promise<void>((ok) => setTimeout(ok, 16));

/** Image orientée (EXIF appliqué par le navigateur) et réduite à COTE_SOURCE au plus */
async function lirePhoto(fichier: Blob): Promise<HTMLCanvasElement> {
  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
  } catch {
    // Anciens Safari : <img> applique l'orientation EXIF
    image = await new Promise<HTMLImageElement>((ok, ko) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ko(new Error('Image illisible'));
      img.src = URL.createObjectURL(fichier);
    });
  }
  const l0 = 'naturalWidth' in image ? image.naturalWidth : image.width;
  const h0 = 'naturalHeight' in image ? image.naturalHeight : image.height;
  const k = Math.min(1, COTE_SOURCE / Math.max(l0, h0));
  const c = canvas(l0 * k, h0 * k);
  const g = ctx2d(c);
  g.imageSmoothingQuality = 'high';
  g.drawImage(image, 0, 0, c.width, c.height);
  if ('close' in image) image.close();
  return c;
}

function versCanvas(d: Uint8ClampedArray, l: number, h: number): HTMLCanvasElement {
  const c = canvas(l, h);
  ctx2d(c).putImageData(new ImageData(new Uint8ClampedArray(d), l, h), 0, 0);
  return c;
}

/**
 * Prépare une photo envoyée : lecture, détourage et visage (MediaPipe), affinage du masque, réglages de retouche.
 * Si le détourage échoue (navigateur, modèle), l'atelier est rendu sans détourage : styles « flou » et « original » seulement.
 */
export async function preparer(fichier: Blob, progres: (e: Etape) => void, detourage = true): Promise<Atelier> {
  progres('lecture');
  const brute = await lirePhoto(fichier);
  const { width: l, height: h } = brute;
  const donnees = ctx2d(brute).getImageData(0, 0, l, h).data;
  let alpha: Float32Array | null = null;
  let boite: Rect | null = null;
  if (detourage) {
    try {
      progres('outils');
      await pause();
      boite = await visagePrincipal(brute);
      progres('detourage');
      await pause();
      const brut = await masquePersonne(brute);
      alpha = affinerMasque(brut, niveauxGris(donnees, l, h), l, h);
    } catch (e) {
      console.warn('Studio portrait : détourage indisponible', e);
      alpha = null;
    }
  }
  progres('retouche');
  await pause();
  const sil = alpha ? silhouette(alpha, l, h) : null;
  const ancre = boite ? ancreDepuisVisage(boite, l, h) : sil ? ancreDepuisSilhouette(sil.haut, sil.cxTete, sil.largeurTete, l, h) : ancreParDefaut();
  const score = alpha ? scoreDetourage(mesurerMasque(alpha, l, h, boite)) : null;
  const retouche = calculerRetouche(statsPhoto(donnees, l, h, boite, alpha));
  const detouree = alpha ? versCanvas(detourer(donnees, alpha, l, h), l, h) : null;
  return { l, h, brute, detouree, retouchee: null, detoureeRetouchee: null, retouche, ancre, visage: Boolean(boite), score };
}

/** Recompose un atelier depuis les fichiers enregistrés (source + détourée), sans refaire le détourage. */
export async function reprendre(source: string, detouree: string, retouche: Retouche | null, ancre: Ancre): Promise<Atelier> {
  const charger = async (url: string) => {
    const r = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!r.ok) throw new Error(`Lecture impossible (${r.status})`);
    return lirePhoto(await r.blob());
  };
  const [brute, det] = await Promise.all([charger(source), detouree ? charger(detouree) : Promise.resolve(null)]);
  const { width: l, height: h } = brute;
  const donnees = ctx2d(brute).getImageData(0, 0, l, h).data;
  return {
    l, h, brute, detouree: det && det.width === l && det.height === h ? det : null, retouchee: null, detoureeRetouchee: null,
    retouche: retouche ?? calculerRetouche(statsPhoto(donnees, l, h, null, null)), ancre, visage: true, score: det ? 1 : null,
  };
}

/** Versions retouchées (calculées une fois) */
function retouchees(a: Atelier): { source: HTMLCanvasElement; personne: HTMLCanvasElement | null } {
  if (!a.retouchee) {
    const d = ctx2d(a.brute).getImageData(0, 0, a.l, a.h);
    appliquerRetouche(d.data, a.retouche);
    debruiter(d.data, a.l, a.h);
    a.retouchee = canvas(a.l, a.h);
    ctx2d(a.retouchee).putImageData(d, 0, 0);
    if (a.detouree) {
      const p = ctx2d(a.detouree).getImageData(0, 0, a.l, a.h);
      appliquerRetouche(p.data, a.retouche);
      debruiter(p.data, a.l, a.h);
      a.detoureeRetouchee = canvas(a.l, a.h);
      ctx2d(a.detoureeRetouchee).putImageData(p, 0, 0);
    }
  }
  return { source: a.retouchee, personne: a.detoureeRetouchee };
}

/** Copie floutée d'une zone de la source, à la taille (l × h) : flou calculé à petite résolution puis agrandi. */
function flouZone(src: HTMLCanvasElement, cadre: Rect, l: number, h: number, rayon: number, personne?: HTMLCanvasElement | null): HTMLCanvasElement {
  const f = Math.max(1, rayon / 6);
  const petit = canvas(l / f, h / f);
  const g = ctx2d(petit);
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, cadre.x, cadre.y, cadre.l, cadre.h, 0, 0, petit.width, petit.height);
  const d = g.getImageData(0, 0, petit.width, petit.height);
  if (personne) {
    // Fond seul : la silhouette est exclue du flou (pas de halo autour de la tête)
    const m = canvas(petit.width, petit.height);
    const gm = ctx2d(m);
    gm.drawImage(personne, cadre.x, cadre.y, cadre.l, cadre.h, 0, 0, m.width, m.height);
    flouFond(d.data, gm.getImageData(0, 0, m.width, m.height).data, petit.width, petit.height, rayon / f);
  } else {
    flouRGBA(d.data, petit.width, petit.height, rayon / f);
  }
  g.putImageData(d, 0, 0);
  const grand = canvas(l, h);
  const gg = ctx2d(grand);
  gg.imageSmoothingQuality = 'high';
  gg.drawImage(petit, 0, 0, l, h);
  return grand;
}

export type OptionsRendu = {
  format: FormatPortrait;
  style: StylePortrait;
  ombre: boolean;
  /** Retouche automatique appliquée */
  retouche: boolean;
  palette: PalettePortrait;
  reglage: Reglage;
  largeur: number;
  /** Netteté finale (export) ; désactivée pour les aperçus rapides */
  nettete?: boolean;
  /** Photo d'origine, sans retouche ni nouveau fond (avant/après) */
  avant?: boolean;
  /** Détourage refusé (ou jugé mauvais) : la personne détourée n'est pas utilisée */
  sansDetourage?: boolean;
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Compose un rendu (canvas largeur × hauteur du format). */
export function composer(a: Atelier, o: OptionsRendu): HTMLCanvasElement {
  const W = Math.round(o.largeur);
  const H = hauteurRendu(o.format, W);
  const c = canvas(W, H);
  const g = ctx2d(c);
  g.imageSmoothingQuality = 'high';
  const cadre = cadrer(o.format, a.ancre, o.reglage, a.l, a.h);
  if (o.avant) {
    g.drawImage(a.brute, cadre.x, cadre.y, cadre.l, cadre.h, 0, 0, W, H);
    return c;
  }
  const r0 = o.retouche ? retouchees(a) : { source: a.brute, personne: a.detouree };
  const r = o.sansDetourage ? { ...r0, personne: null } : r0;
  const detoure = styleDetoure(o.style) && r.personne !== null;
  const style: StylePortrait = styleDetoure(o.style) && !r.personne ? 'original' : o.style;
  const p = o.palette;
  // Position du visage dans le rendu (pour le cercle et la mise au point du flou)
  const fx = ((a.ancre.cx * a.l - cadre.x) / cadre.l) * W;
  const fy = ((a.ancre.cy * a.h - cadre.y) / cadre.h) * H;
  const tv = ((a.ancre.t * a.h) / cadre.h) * H;

  // 1. Fond
  switch (style) {
    case 'aplat':
      g.fillStyle = p.aplat;
      g.fillRect(0, 0, W, H);
      break;
    case 'degrade': {
      const grad = g.createRadialGradient(fx, fy - tv * 0.2, 0, fx, fy, Math.hypot(W, H) * 0.75);
      grad.addColorStop(0, mix(p.aplat, '#ffffff', 0.6));
      grad.addColorStop(0.55, mix(p.aplat, '#ffffff', 0.2));
      grad.addColorStop(1, mix(p.aplat, p.duo, 0.2));
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      break;
    }
    case 'forme': {
      g.fillStyle = p.doux;
      g.fillRect(0, 0, W, H);
      g.fillStyle = p.aplat;
      g.beginPath();
      g.arc(fx + W * 0.04, fy + tv * 0.25, Math.min(W, H) * (o.format === 'carre' ? 0.4 : 0.42), 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'duotone': {
      const f = flouZone(r.source, cadre, W, H, W * 0.025, r.personne);
      const fd = ctx2d(f).getImageData(0, 0, W, H);
      const [s0, s1] = [rgb(p.duotoneSombre), rgb(p.duotoneClair)];
      const fond = rgb(p.fond);
      for (let i = 0; i < fd.data.length; i += 4) {
        const t = Math.pow((0.299 * fd.data[i] + 0.587 * fd.data[i + 1] + 0.114 * fd.data[i + 2]) / 255, 0.8);
        for (let k = 0; k < 3; k++) {
          const v = s0[k] + (s1[k] - s0[k]) * t;
          fd.data[i + k] = v + (fond[k] - v) * 0.3; // discret : éclairci vers le fond de page
        }
      }
      g.putImageData(fd, 0, 0);
      break;
    }
    case 'flou': {
      g.drawImage(flouZone(r.source, cadre, W, H, W * 0.03, r.personne), 0, 0);
      if (!r.personne) {
        // Sans détourage : mise au point radiale sur le visage (le centre reste net, les bords se floutent)
        const net = canvas(W, H);
        const gn = ctx2d(net);
        gn.imageSmoothingQuality = 'high';
        gn.drawImage(r.source, cadre.x, cadre.y, cadre.l, cadre.h, 0, 0, W, H);
        gn.globalCompositeOperation = 'destination-in';
        const m = gn.createRadialGradient(fx, fy + tv * 0.6, tv * 0.9, fx, fy + tv * 0.6, Math.max(W, H) * 0.62);
        m.addColorStop(0, 'rgba(0,0,0,1)');
        m.addColorStop(1, 'rgba(0,0,0,0)');
        gn.fillStyle = m;
        gn.fillRect(0, 0, W, H);
        g.drawImage(net, 0, 0);
      }
      break;
    }
    case 'original':
      g.drawImage(r.source, cadre.x, cadre.y, cadre.l, cadre.h, 0, 0, W, H);
      break;
  }

  // 2. Ombre portée très douce (styles à fond remplacé)
  if (detoure && o.ombre && style !== 'flou') {
    const s = canvas(W, H);
    const gs = ctx2d(s);
    gs.drawImage(r.personne!, cadre.x, cadre.y, cadre.l, cadre.h, 0, 0, W, H);
    gs.globalCompositeOperation = 'source-in';
    gs.fillStyle = p.encre;
    gs.fillRect(0, 0, W, H);
    const flou = flouZone(s, { x: 0, y: 0, l: W, h: H }, W, H, W * 0.025);
    g.globalAlpha = 0.2;
    g.drawImage(flou, W * 0.018, H * 0.01);
    g.globalAlpha = 1;
  }

  // 3. Personne
  if (r.personne && (detoure || style === 'flou')) g.drawImage(r.personne, cadre.x, cadre.y, cadre.l, cadre.h, 0, 0, W, H);

  // 4. Netteté légère à la taille finale
  if (o.nettete) {
    const d = g.getImageData(0, 0, W, H);
    accentuer(d.data, W, H, W <= 200 ? 0.22 : 0.3);
    g.putImageData(d, 0, 0);
  }
  return c;
}

function mix(a: string, b: string, t: number) {
  const x = rgb(a), y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

// ———————————————————————————————————————————————————— Export

let webp: Promise<boolean> | null = null;
/** Le navigateur sait-il encoder le WebP ? (Safari ancien : non → JPEG / PNG) */
export function encodeWebp(): Promise<boolean> {
  webp ??= new Promise((ok) => canvas(2, 2).toBlob((b) => ok(b?.type === 'image/webp'), 'image/webp', 0.8));
  return webp;
}

const versBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('Encodage impossible'))), type, q));

/** Encode un rendu opaque : WebP (sinon JPEG), qualité abaissée jusqu'au poids cible s'il est donné. */
export async function encoder(c: HTMLCanvasElement, cible?: number): Promise<Blob> {
  const type = (await encodeWebp()) ? 'image/webp' : 'image/jpeg';
  let blob = await versBlob(c, type, 0.82);
  for (const q of [0.76, 0.7, 0.64, 0.58, 0.52]) {
    if (!cible || blob.size <= cible) break;
    blob = await versBlob(c, type, q);
  }
  return blob;
}

/** Encode une image avec transparence : WebP (sinon PNG) */
export async function encoderTransparent(c: HTMLCanvasElement): Promise<Blob> {
  return (await encodeWebp()) ? versBlob(c, 'image/webp', 0.86) : versBlob(c, 'image/png');
}

export type FichierRendu = { format: FormatPortrait; l: number; h: number; blob: Blob };

/** Tous les rendus du portrait (formats × largeurs utiles), encodés ; la largeur téléphone vise POIDS_CIBLE_MOBILE. */
export async function exporterRendus(a: Atelier, o: Omit<OptionsRendu, 'format' | 'largeur' | 'nettete' | 'avant'>): Promise<FichierRendu[]> {
  const sortie: FichierRendu[] = [];
  for (const format of ['portrait', 'carre'] as const) {
    const cadre = cadrer(format, a.ancre, o.reglage, a.l, a.h);
    for (const l of largeursRendu(format, cadre.l)) {
      const c = composer(a, { ...o, format, largeur: l, nettete: true });
      const cible = format === 'portrait' && l <= LARGEUR_MOBILE ? POIDS_CIBLE_MOBILE : format === 'carre' ? 20 * 1024 : 140 * 1024;
      sortie.push({ format, l, h: c.height, blob: await encoder(c, cible) });
      await pause();
    }
  }
  return sortie;
}

/** Fichiers gardés pour recomposer : photo d'origine réduite (sans EXIF) et personne détourée */
export async function exporterSources(a: Atelier, sansDetourage = false): Promise<{ source: Blob; detouree: Blob | null }> {
  const type = (await encodeWebp()) ? 'image/webp' : 'image/jpeg';
  return { source: await versBlob(a.brute, type, 0.86), detouree: a.detouree && !sansDetourage ? await encoderTransparent(a.detouree) : null };
}
