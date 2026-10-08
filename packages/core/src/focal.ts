// Blocs focalisés (retour de Paul du 2026-10-08 : « la comparaison de tailles et casse est difficile avec autant de contenu ;
// propose des blocs plus faciles à appréhender »). Module PUR.
//
// - blocFocal : pour une dimension de duel (ou une clé de tuile), le SEUL contenu touché, identique en A et B : échelle → surtitre,
//   H1 réel du site, H2, deux lignes ; casse → surtitre, titre, bouton ; graisse → titre seul en grand ; interlettrage → titre et
//   surtitre ; police (texte courant) → surtitre, titre, paragraphe de trois lignes ; détails (espacements, ombres, arrondis) → une
//   carte et un bouton isolés. `empile` : A au-dessus de B (écart vertical) ; sinon côte à côte possible.
// - tailles en pixels de l'aperçu (tailleH1Focal, tailleH2Focal : mêmes formules que le spécimen de l'admin) pour le bandeau
//   (« A : affirmée (H1 28 px) · B : spectaculaire (H1 35 px) »), selon l'appareil affiché.
// - ecartVisible : jamais deux crans dont le rendu diffère trop peu (H1 < 10 %, graisse < 100, interlettrage < 0,02 em, casse
//   identique de fait) : varierDuel retire alors un autre cran.
import { facteurChasse, facteurTitres, graisseTitres, INTERLETTRAGES, AXES_TYPO, NOMS_AXES_TYPO, type AxeTypo, type ReglagesTypo } from './typo';
import { pairePolices } from './modeles';

export type ElementFocal = 'surtitre' | 'h1' | 'h2' | 'texte2' | 'bouton' | 'paragraphe3' | 'carte';
export type BlocFocal = { elements: ElementFocal[]; empile: boolean; grand?: boolean };

/** Bloc focalisé d'une dimension de duel (typo:<axe>, polices, typo, details) ou d'une clé de tuile (typo:<axe>:<v>, details:…) ; null : pas de bloc */
export function blocFocal(dimensionOuCle: string | null | undefined): BlocFocal | null {
  if (!dimensionOuCle) return null;
  const [t, axe] = dimensionOuCle.split(':');
  if (t === 'typo') {
    switch (axe) {
      case 'echelle': return { elements: ['surtitre', 'h1', 'h2', 'texte2'], empile: true };
      case 'casse': return { elements: ['surtitre', 'h1', 'bouton'], empile: true };
      case 'graisse': return { elements: ['h1'], empile: true, grand: true };
      case 'interlettrage': return { elements: ['surtitre', 'h1'], empile: true };
      case 'police': case 'combinaison': return { elements: ['surtitre', 'h1', 'paragraphe3'], empile: true };
      case undefined: return { elements: ['surtitre', 'h1', 'h2', 'texte2'], empile: true };
      default: return { elements: ['surtitre', 'h1', 'texte2'], empile: true };
    }
  }
  if (t === 'polices' || t === 'police-couleurs') return { elements: ['surtitre', 'h1', 'paragraphe3'], empile: true };
  if (t === 'details') return { elements: ['carte', 'bouton'], empile: false };
  return null;
}

/** Taille du H1 du bloc (px, largeur réelle de l'appareil), comme le spécimen de l'admin */
export function tailleH1Focal(typo: Partial<ReglagesTypo> | null | undefined, mobile: boolean, grand = false): number {
  const base = Math.min(mobile ? 40 : 72, (mobile ? 330 : 1100) / (20 * 0.58 * facteurChasse(typo as ReglagesTypo)));
  return Math.round(base * facteurTitres(typo as ReglagesTypo) * (grand ? 1.25 : 1));
}
/** H2 : 72 % du H1 (toujours plus petit que lui, même rapport que les gabarits) */
export const tailleH2Focal = (typo: Partial<ReglagesTypo> | null | undefined, mobile: boolean) => Math.round(tailleH1Focal(typo, mobile) * 0.72);

/** Graisse effective des titres (celle de la paire si « paire ») */
export function graisseEffective(police: string, typo: Partial<ReglagesTypo> | null | undefined): number {
  return graisseTitres(police, { graisse: (typo?.graisse ?? 'paire') as ReglagesTypo['graisse'] }) ?? pairePolices(police)?.graisse ?? 400;
}

type CoteFocal = { police: string; typo?: Partial<ReglagesTypo> | null };

/** L'écart entre A et B se voit-il ? (dimension typo:<axe>) */
export function ecartVisible(dimension: string, a: CoteFocal, b: CoteFocal): boolean {
  if (!dimension.startsWith('typo:')) return true;
  const axe = dimension.slice(5) as AxeTypo;
  const va = a.typo?.[axe], vb = b.typo?.[axe];
  if (va === vb) return false;
  switch (axe) {
    case 'echelle': { const x = tailleH1Focal(a.typo, true), y = tailleH1Focal(b.typo, true); return Math.abs(x - y) / Math.max(x, y) >= 0.1; }
    case 'graisse': return Math.abs(graisseEffective(a.police, a.typo) - graisseEffective(b.police, b.typo)) >= 100;
    case 'interlettrage': { const e = (v: unknown) => INTERLETTRAGES.find((i) => i.id === v)?.em ?? -0.012; return Math.abs(e(va) - e(vb)) >= 0.02; }
    default: return true;
  }
}

/** Valeur lisible d'un côté, avec la mesure réelle de l'appareil affiché : « affirmée (H1 28 px) », « fine (300) » */
export function valeurFocale(dimension: string, c: CoteFocal, mobile: boolean): string {
  if (!dimension.startsWith('typo:')) return '';
  const axe = dimension.slice(5) as AxeTypo;
  const v = c.typo?.[axe];
  const nom = ((AXES_TYPO[axe] as readonly { id: string; nom: string }[] | undefined)?.find((o) => o.id === v)?.nom ?? String(v ?? '')).replace(/\s*\([^)]*\)$/, '').toLowerCase();
  if (axe === 'echelle') return `${nom} (H1 ${tailleH1Focal(c.typo, mobile)} px, H2 ${tailleH2Focal(c.typo, mobile)} px)`;
  if (axe === 'graisse') return `${nom} (${graisseEffective(c.police, c.typo)})`;
  if (axe === 'interlettrage') return `${nom} (${String(INTERLETTRAGES.find((i) => i.id === v)?.em ?? -0.012).replace('.', ',')} em)`;
  return nom || (NOMS_AXES_TYPO[axe] ?? axe);
}
