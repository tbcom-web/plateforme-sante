// Contrastes couleur × fond (demande de Paul du 2026-10-08 : « noter / A-B tester les contrastes de couleurs avec leurs fonds,
// ainsi que les images, combinaisons d'éléments »). Module PUR.
//
// RÉPARTITIONS DES SURFACES d'une même palette (couleurs des gabarits, couleursGabarit de gabarits.ts) : seules la répartition et
// l'intensité changent (fond blanc ou teinté, texte franc ou doux, aplat d'accent plein ou léger, cartes sur fond teinté…).
// Règle DURE : jamais sous AA (texte 4,5:1, grands éléments et pictos 3:1) — mesurerSurfaces calcule chaque paire texte / fond
// touchée ; seules les répartitions conformes sont proposées (surfacesConformes). Aperçu de l'ADMIN seulement (feuille CSS qui
// remplace des variables --g-* de la racine .ap : cssSurfaces) : à valider avant d'entrer dans les recettes et les sites.
// Clés : duel `surfaces=<id>` (atelier), tuile `effets:surfaces-<id>` (assets_notes, type effets : aucune migration).
import { contraste, melanger } from './couleurs';
import type { CouleursGabarit } from './gabarits';

export type IdSurfaces = 'modele' | 'blanc' | 'teinte' | 'cartes-teintees' | 'texte-franc' | 'texte-doux' | 'accent-plein' | 'accent-leger';

/** Zones encadrées (reperes.ts) : où la surface change */
export const SURFACES: readonly { id: IdSurfaces; nom: string; detail: string; zones: string[] }[] = [
  { id: 'modele', nom: 'Celle du modèle', detail: 'répartition d’origine de la palette', zones: [] },
  { id: 'blanc', nom: 'Fond blanc', detail: 'page blanche, sections douces teintées', zones: [] },
  { id: 'teinte', nom: 'Fond teinté doux', detail: 'page teintée, cartes blanches', zones: ['cartes'] },
  { id: 'cartes-teintees', nom: 'Cartes teintées', detail: 'cartes et bulles teintées sur fond clair', zones: ['cartes'] },
  { id: 'texte-franc', nom: 'Contraste franc', detail: 'texte très foncé, texte secondaire foncé', zones: ['titres', 'paragraphe'] },
  { id: 'texte-doux', nom: 'Contraste doux', detail: 'texte adouci (toujours AA)', zones: ['titres', 'paragraphe'] },
  { id: 'accent-plein', nom: 'Accent plein', detail: 'aplats et bandeaux en couleur pleine, texte clair', zones: ['premier-ecran', 'contact'] },
  { id: 'accent-leger', nom: 'Accent léger', detail: 'aplats et bandeaux en teinte légère, texte foncé', zones: ['premier-ecran', 'contact'] },
];
export const surface = (id: unknown) => SURFACES.find((s) => s.id === id) ?? null;

/** Paires vérifiées : [texte, fond, minimum] (sous-ensemble des paires des gabarits que ces répartitions touchent) */
export const PAIRES_SURFACES: readonly (readonly [keyof CouleursGabarit, keyof CouleursGabarit, number])[] = [
  ['encre', 'page', 4.5], ['encre', 'carte', 4.5], ['encre', 'doux', 4.5], ['encre', 'bulle', 4.5],
  ['encre-douce', 'page', 4.5], ['encre-douce', 'carte', 4.5], ['encre-douce', 'doux', 4.5],
  ['accent-texte', 'page', 4.5], ['accent-texte', 'carte', 4.5], ['accent-texte', 'doux', 4.5],
  ['bulle-texte', 'bulle', 4.5], ['aplat-texte', 'aplat', 4.5], ['aplat-doux', 'aplat', 4.5], ['plein-texte', 'plein', 4.5],
  ['plein-bord', 'page', 3], ['figure', 'aplat', 3], ['figure', 'page', 3],
];

/** Couleurs d'une répartition (partielles acceptées : couleurs lues dans l'aperçu) */
export function appliquerSurfaces(c: Partial<CouleursGabarit>, id: string): Partial<CouleursGabarit> {
  const blanc = '#ffffff';
  const x = { ...c };
  switch (id) {
    case 'blanc': x.page = blanc; x.carte = blanc; break;
    case 'teinte': if (c.doux) x.page = c.doux; x.carte = blanc; if (c.bulle) x.doux = c.bulle; break;
    case 'cartes-teintees': if (c.doux) x.carte = c.doux; if (c.bulle) x.doux = c.bulle; break;
    case 'texte-franc': if (c.encre) { x.encre = melanger(c.encre, '#000000', 0.45); x['encre-douce'] = melanger(c.encre, '#000000', 0.15); } break;
    case 'texte-doux': if (c.encre && c.page) { x.encre = melanger(c.encre, c.page, 0.22); x['encre-douce'] = melanger(c.encre, c.page, 0.38); } break;
    case 'accent-plein': if (c.plein) { x.aplat = c.plein; x['aplat-texte'] = c['plein-texte']; x['aplat-doux'] = c['plein-texte']; x.figure = c['plein-texte']; } break;
    case 'accent-leger': if (c.bulle) { x.aplat = c.bulle; x['aplat-texte'] = c.encre; x['aplat-doux'] = c['encre-douce']; } break;
  }
  return x;
}

export type MesureSurfaces = { ratio: number; pire: { texte: string; fond: string; ratio: number; minimum: number } | null; conforme: boolean };

/** Contraste principal (texte courant sur le fond de page) et paire la plus faible au regard de son minimum */
export function mesurerSurfaces(c: Partial<CouleursGabarit>): MesureSurfaces {
  let pire: MesureSurfaces['pire'] = null;
  let conforme = true;
  for (const [t, f, min] of PAIRES_SURFACES) {
    const a = c[t], b = c[f];
    if (!a || !b) continue;
    const r = contraste(a, b);
    if (r < min) conforme = false;
    if (!pire || r / min < pire.ratio / pire.minimum) pire = { texte: t, fond: f, ratio: Math.round(r * 10) / 10, minimum: min };
  }
  const ratio = c.encre && c.page ? Math.round(contraste(c.encre, c.page) * 10) / 10 : 0;
  return { ratio, pire, conforme };
}

/** Répartitions conformes AA pour ces couleurs (celle du modèle comprise si elle l'est) */
export const surfacesConformes = (c: Partial<CouleursGabarit>): IdSurfaces[] => SURFACES.filter((s) => mesurerSurfaces(appliquerSurfaces(c, s.id)).conforme).map((s) => s.id);

/** Feuille de l'aperçu : variables --g-* modifiées sur la racine ; vide si rien ne change ou si la répartition n'est pas conforme */
export function cssSurfaces(c: Partial<CouleursGabarit>, id: string, racine = '.ap'): string {
  const y = appliquerSurfaces(c, id);
  if (!mesurerSurfaces(y).conforme) return '';
  const decl = (Object.keys(y) as (keyof CouleursGabarit)[]).filter((k) => y[k] && y[k] !== c[k]).map((k) => `--g-${k}:${y[k]} !important`);
  return decl.length ? `${racine}{${decl.join(';')}}` : '';
}

/** Ratio lisible : « 7,2:1 » */
export const ratioLisible = (r: number) => `${String(Math.round(r * 10) / 10).replace('.', ',')}:1`;

/** Clés */
export const cleAssetSurfaces = (id: string) => `effets:surfaces-${id}`;
export function lireCleSurfaces(cle: unknown): IdSurfaces | null {
  if (typeof cle !== 'string' || !cle.startsWith('effets:surfaces-')) return null;
  const s = surface(cle.slice('effets:surfaces-'.length));
  return s ? s.id : null;
}
