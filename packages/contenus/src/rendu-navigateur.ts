// Rendu dans le navigateur : ajustement du texte et contrôle de lecture. MÊME code pour l'aperçu instantané (admin,
// aperçu gratuit) et pour l'export (Playwright ouvre la même page) : ce que le praticien voit est ce qui est exporté.
//
// ajuster(racine)        : réduit la taille des textes [data-ajuste] jusqu'à ce qu'ils tiennent, jamais sous data-min ;
// controlerRendu(section): ✗ si un texte déborde, est trop petit pour un téléphone (< 34 px sur 1080), sort de la zone utile
//                          (Story : interface d'Instagram), ou si son contraste est inférieur à AA (4,5:1).

import { TAILLES } from './gabarits';

/** Zone utile des Stories et Reels (hors interface d'Instagram) : y de 200 à 1720 sur 1920 */
export const ZONE_UTILE_STORY = { haut: 200, bas: 1720 } as const;

export function ajuster(racine: ParentNode = document): number {
  let n = 0;
  for (const el of Array.from(racine.querySelectorAll<HTMLElement>('[data-ajuste]'))) {
    let t = Number(el.dataset.taille) || 48;
    const min = Number(el.dataset.min) || TAILLES.minimum;
    el.style.fontSize = `${t}px`;
    // Tolérance : jambages et accents dépassent un interligne serré (≈ 0,25 em) sans que le texte soit coupé
    // La boîte est bornée par max-height (ou par sa hauteur si elle est fixée) : déborder, c’est la dépasser.
    const borne = () => { const mh = parseFloat(getComputedStyle(el).maxHeight); return Number.isFinite(mh) ? mh : el.clientHeight; };
    const deborde = () => el.scrollHeight > borne() + t * 0.25 || el.scrollWidth > el.clientWidth + 1;
    while (deborde() && t > min) { t -= 2; el.style.fontSize = `${t}px`; n++; }
    if (deborde()) el.dataset.deborde = '1'; else delete el.dataset.deborde;
  }
  return n;
}

// ———————————————————————————————— couleurs (toutes notations CSS, color-mix compris : on laisse le navigateur résoudre)
let ctx: CanvasRenderingContext2D | null = null;
function rgba(couleur: string): [number, number, number, number] {
  ctx ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  if (!ctx) return [0, 0, 0, 1];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = 'transparent';
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], d[3] / 255];
}
const lum = ([r, g, b]: number[]) => { const c = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b); };
const sur = (a: [number, number, number, number], b: number[]) => [0, 1, 2].map((i) => a[i] * a[3] + b[i] * (1 - a[3]));
export const contrasteRvb = (a: number[], b: number[]) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };

/** Fond effectif d'un élément : superposition des background-color des ancêtres (le quadrillage, très léger, est ignoré) */
function fondEffectif(el: Element): number[] {
  const couches: [number, number, number, number][] = [];
  for (let x: Element | null = el; x; x = x.parentElement) {
    const c = rgba(getComputedStyle(x).backgroundColor);
    if (c[3] > 0) couches.push(c);
    if (c[3] >= 1) break;
  }
  let fond = [255, 255, 255];
  for (const c of couches.reverse()) fond = sur(c, fond);
  return fond;
}

export type DefautRendu = { publication: string; index: number; role: string; message: string };

/** Contrôle de lecture d'une diapositive rendue */
export function controlerRendu(section: HTMLElement): DefautRendu[] {
  const D: DefautRendu[] = [];
  const pub = section.dataset.publication ?? '', index = Number(section.dataset.index), role = section.dataset.role ?? '';
  const d = (message: string) => D.push({ publication: pub, index, role, message });
  const cadre = section.getBoundingClientRect();
  const k = cadre.width / (parseFloat(section.style.width) || cadre.width); // aperçu réduit : on ramène au canevas
  for (const el of Array.from(section.querySelectorAll<HTMLElement>('[data-deborde]'))) d(`texte trop long même à ${el.style.fontSize} (minimum ${el.dataset.min} px) : « ${el.textContent?.trim().slice(0, 60)} »`);
  const textes = Array.from(section.querySelectorAll<HTMLElement>('*')).filter((e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim()));
  for (const el of textes) {
    // Annotations des dessins du core (SVG décoratifs, aria-hidden) : tailles et couleurs fixées par la charte, hors contrôle
    if (el.closest('svg')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const taille = parseFloat(cs.fontSize);
    const extrait = (el.textContent ?? '').trim().slice(0, 40);
    if (taille < TAILLES.minimum - 0.5) d(`texte de ${taille.toFixed(0)} px < ${TAILLES.minimum} px (illisible sur un téléphone) : « ${extrait} »`);
    const fond = fondEffectif(el);
    const c = contrasteRvb(sur(rgba(cs.color), fond), fond);
    if (c < 4.5) d(`contraste ${c.toFixed(2)}:1 < 4,5:1 (AA) : « ${extrait} »`);
    const r = el.getBoundingClientRect();
    const haut = (r.top - cadre.top) / k, bas = (r.bottom - cadre.top) / k, gauche = (r.left - cadre.left) / k, droite = (r.right - cadre.left) / k;
    const W = parseFloat(section.style.width), H = parseFloat(section.style.height);
    if (gauche < -1 || droite > W + 1 || haut < -1 || bas > H + 1) d(`texte hors du cadre : « ${extrait} »`);
    if (section.dataset.format === 'story' && (haut < ZONE_UTILE_STORY.haut || bas > ZONE_UTILE_STORY.bas)) d(`texte hors de la zone utile de la Story (y ${ZONE_UTILE_STORY.haut}–${ZONE_UTILE_STORY.bas}) : « ${extrait} »`);
  }
  return D;
}
