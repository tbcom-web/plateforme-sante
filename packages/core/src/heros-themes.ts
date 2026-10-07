// Illustrations « héros » des thèmes du cabinet (themes.ts) : une composition grand format par thème principal, en format paysage
// (ordinateur, 16:9) et portrait (téléphone, 3:4), dans les trois registres (relevé, pédagogique, trait continu), aux couleurs de la
// gamme. API pure (chaîne SVG, aucune dépendance d'exécution) : l'accueil et les pages de thème la branchent.
//
// RÈGLE : aucune géométrie nouvelle. UN SEUL sujet par héros (retours de Paul du 2026-10-07 : « une seule grande illustration, pas
// deux images côte à côte qu'on ne comprend pas ensemble ») : une scène dessinée (heros-scenes.ts) ou un dessin existant et revu
// (ligne.ts, image fixe d'une animation), centré en grand. Pied, foulée, semelle, hallux viennent des géométries validées (pied.ts,
// foulee.ts, bibliotheque/). La composition elle-même (choix, cadrage, couleurs) est un BROUILLON à valider par Paul.
//
// Garde-fous (pieges-illustration.md) : AUCUN texte visible dans un héros (consigne de Paul du 2026-10-06 : ni légende, ni lecture,
// ni mention « schéma illustratif » ; les <text>, étiquettes et renvois des pièces sont retirés ; le sujet reste dans le <title>,
// lu par les outils et les agents, pas affiché), diabète sans rouge « pic » ni pied nu qui marche (examen au monofilament,
// inspection des pieds), enfant sans courbes de données (premiers pas), pédicurie sans main ni visage.
//
// Exceptions (retours de Paul du 2026-10-06, heros-scenes.ts) : ENFANT, SENIOR et DIABÈTE ne sont plus des assemblages de deux pièces
// mais une SCÈNE dessinée à partir des géométries validées. Enfant : les pas d'un adulte et, à côté, les petits pas d'un tout-petit
// (vue de dessus, sans jambes). Diabète : le monofilament tenu en main, appliqué sous la tête de M1 (pied de profil, patient
// allongé) : monofilament et diapason ne flottent plus en l'air. Senior : la plaque
// d'empreintes au point rouge central (incomprise) et la canne isolée en trait vertical sont remplacées par une marche à petits pas,
// chaussée, avec une canne lisible (poignée tenue par une main, embout au sol en avant du pied). Le 2026-10-07, sport, ongles, semelles
// et pédicurie deviennent aussi des scènes d'un seul tenant (voir COMPOSITIONS).
//
// Usage : illustrationTheme('sport', { format: 'portrait', registre: 'ligne', gamme: 'mangue' }). Les classes viennent de
// dessins.css (feuille du site) ; les variables de la charte (--trait-*, --pression-*) de feuilleCharte(). `gamme` (identifiant ou
// gamme) fixe les couleurs du dessin en variables sur la racine ; sans gamme, le héros suit les variables de la page.
import { svgDessin, svgAnimationFixe, svgEquipement, svgLigne, sansTextes, type Registre } from './dessins';
import { sceneHeros, type SceneHeros } from './heros-scenes';
import { themeParId } from './themes';
import { gamme as gammeParId, variantesGamme, type Gamme } from './gammes';
import { NEUTRES, PLAN } from './charte';
import type { NomDessin } from './univers';
import type { NomLigne } from './ligne';
import type { Animation } from './packs';

export type FormatHeros = 'paysage' | 'portrait';
export const FORMATS_HEROS: Record<FormatHeros, { largeur: number; hauteur: number; rapport: string }> = {
  paysage: { largeur: 640, hauteur: 360, rapport: '16:9' },
  portrait: { largeur: 360, hauteur: 480, rapport: '3:4' },
};

/** Thèmes principaux illustrés (le thème « posture », différé, n'a pas de héros) */
export const THEMES_ILLUSTRES = ['sport', 'diabete', 'ongles', 'enfant', 'senior', 'semelles', 'pedicurie'] as const;
export type ThemeIllustre = (typeof THEMES_ILLUSTRES)[number];
export const themeIllustre = (id: string): id is ThemeIllustre => (THEMES_ILLUSTRES as readonly string[]).includes(id);

/** Sujet de chaque héros (contenu du <title>, non affiché) : le libellé patient du thème (themes.ts) */
const titreTheme = (id: ThemeIllustre) => themeParId(id)?.libelle ?? id;

/** Sujet d'un héros : une scène dessinée d'un seul tenant (heros-scenes.ts) ou UN dessin existant, dans un registre donné */
type Piece =
  | { type: 'scene'; nom: SceneHeros }
  | { type: 'dessin'; nom: NomDessin }
  | { type: 'animation'; nom: Animation }
  | { type: 'ligne'; nom: NomLigne }
  | { type: 'materiel'; id: string };

/**
 * UN SEUL sujet par thème et par registre (retours de Paul du 2026-10-07, règle générale : « une seule grande illustration par
 * héros, pas deux images côte à côte qu'on ne comprend pas ensemble » — ongles, semelles, enfant, pédicurie). Les anciennes paires
 * (pièce principale + pièce d'appui) sont abandonnées. Sport : la foulée (animation du coureur en relevé, jambes du coureur en
 * pleine foulée ailleurs) ; ongles : le gros orteil en gros plan, ongle sain (trait : l'avant-pied et ses ongles) ; semelles : la
 * semelle (animation des courbes de relief, paire de semelles, semelle au trait) ; pédicurie : les pieds soignés, SANS instrument.
 */
const COMPOSITIONS: Record<ThemeIllustre, Record<Registre, Piece>> = {
  sport: { releve: { type: 'animation', nom: 'coureur' }, pedagogique: { type: 'scene', nom: 'sport' }, ligne: { type: 'scene', nom: 'sport' } },
  diabete: { releve: { type: 'scene', nom: 'diabete' }, pedagogique: { type: 'scene', nom: 'diabete' }, ligne: { type: 'scene', nom: 'diabete' } },
  ongles: { releve: { type: 'scene', nom: 'ongles' }, pedagogique: { type: 'scene', nom: 'ongles' }, ligne: { type: 'ligne', nom: 'ongle' } },
  enfant: { releve: { type: 'scene', nom: 'enfant' }, pedagogique: { type: 'scene', nom: 'enfant' }, ligne: { type: 'scene', nom: 'enfant' } },
  senior: { releve: { type: 'scene', nom: 'senior' }, pedagogique: { type: 'scene', nom: 'senior' }, ligne: { type: 'scene', nom: 'senior' } },
  semelles: { releve: { type: 'animation', nom: 'semelle' }, pedagogique: { type: 'scene', nom: 'semelles' }, ligne: { type: 'ligne', nom: 'semelle' } },
  pedicurie: { releve: { type: 'scene', nom: 'pedicurie' }, pedagogique: { type: 'scene', nom: 'pedicurie' }, ligne: { type: 'ligne', nom: 'pieds-dessus' } },
};

/** Source d'une composition (inventaire, revue) : « scene:sport », « animation:coureur », « ligne:ongle », « materiel:podoscope » */
export function sourcesTheme(id: ThemeIllustre, registre: Registre): string[] {
  const p = COMPOSITIONS[id][registre];
  return [p.type === 'materiel' ? `materiel:${p.id}` : `${p.type}:${p.nom}`];
}

const r1 = (v: number) => +v.toFixed(1);

/** SVG d'un dessin existant dans le registre du héros, sans aucune lecture (textes, étiquettes et leurs renvois, légende graduée) */
function svgPiece(p: Exclude<Piece, { type: 'scene' }>, registre: Registre, id: string): string {
  const ligne = { couleur: 'trait' as const, epaisseur: registre === 'ligne' ? ('fine' as const) : ('moyenne' as const) };
  switch (p.type) {
    case 'dessin': return sansTextes(svgDessin(p.nom, { registre, id, ligne }));
    // Images fixes des animations : sans aucune lecture chiffrée ni titre (un héros n'affiche pas de données)
    case 'animation': return sansTextes(svgAnimationFixe(p.nom, { registre, id }).replace(/<rect x="\d+" y="268"[^>]*><\/rect>/g, ''));
    case 'ligne': return svgLigne(p.nom, ligne);
    case 'materiel': return sansTextes(svgEquipement(p.id, { registre, id, ligne }));
  }
}

/** Pose un <svg> complet dans un cadre (x, y, l, h) : SVG imbriqué sans classe (le style de .dessin ne s'applique qu'au groupe) */
function poser(svg: string, x: number, y: number, l: number, h: number): string {
  const ouverture = svg.slice(0, svg.indexOf('>'));
  const vue = ouverture.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 240 180';
  const classe = ouverture.match(/\sclass="([^"]*)"/)?.[1] ?? '';
  const interieur = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return `<svg x="${r1(x)}" y="${r1(y)}" width="${r1(l)}" height="${r1(h)}" viewBox="${vue}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><g class="${classe}" fill="none" stroke-linecap="round" stroke-linejoin="round">${interieur}</g></svg>`;
}

/** Cadre du sujet unique (rapport 4:3 des dessins), centré et aussi grand que le format le permet */
const CADRES: Record<FormatHeros, [number, number, number, number]> = {
  paysage: [92, 6, 456, 342],
  portrait: [0, 60, 360, 270],
};

/** Variables de couleur posées sur la racine du héros (gamme connue) ; sans gamme, celles de la page s'appliquent */
function couleurs(g: Gamme | undefined, registre: Registre): string {
  if (!g) return registre === 'releve' ? `--dessin-trait:var(--papier);--dessin-accent:var(--signal);--anim-trait:var(--papier);--accent-pale:var(--signal);--dessin-os:var(--signal);--dessin-os-opacite:0.4;--dessin-os-aplat:0;--dessin-os-secondaires:none;--dessin-fond:var(--plan)` : '';
  const v = variantesGamme(g);
  const accent = g.famille === 'vitaminee' ? v.vifFonce : g.accent;
  if (registre === 'releve')
    return `--plan:${g.plan};--signal:${g.signal};--papier:${NEUTRES.papier};--dessin-trait:${NEUTRES.papier};--dessin-accent:${g.signal};--anim-trait:${NEUTRES.papier};--accent-pale:${g.signal};--dessin-os:${g.signal};--dessin-os-opacite:0.4;--dessin-os-aplat:0;--dessin-os-secondaires:none;--dessin-fond:${g.plan}`;
  return `--doux:${g.fondDoux};--aplat:${v.aplat};--dessin-trait:${v.encre};--dessin-ligne:${v.encre};--dessin-accent:${accent};--accent:${accent};--dessin-fond:${g.fond}`;
}

/**
 * Illustration « héros » d'un thème (<svg>…</svg>, décorative, aria-hidden). `format` : paysage 640 × 360 (16:9) ou portrait
 * 360 × 480 (3:4, téléphone) ; `registre` : relevé (surface « plan » sombre aux couleurs de la gamme, trame de pression), pédagogique
 * (schéma au trait sur aplat doux) ou ligne (trait continu, sans fond) ; `gamme` : identifiant ou gamme de gammes.ts. Chaîne vide
 * pour un thème inconnu ou différé (posture).
 */
export function illustrationTheme(
  themeId: string,
  o: { format?: FormatHeros; registre?: Registre; gamme?: string | Gamme | null; id?: string; classe?: string } = {},
): string {
  if (!themeIllustre(themeId)) return '';
  const format = o.format ?? 'paysage', registre = o.registre ?? 'releve';
  const g = typeof o.gamme === 'string' ? gammeParId(o.gamme) : (o.gamme ?? undefined);
  const { largeur: L, hauteur: H } = FORMATS_HEROS[format];
  const id = o.id ?? `h-${themeId}-${format[0]}-${registre[0]}`;
  const piece = COMPOSITIONS[themeId][registre];
  const R = registre === 'releve';
  // Fond : surface « plan » quadrillée (relevé), aplat doux arrondi centré (pédagogique), aucun (ligne)
  let fond = '';
  if (R) {
    const pas = 40;
    const grille = [...Array.from({ length: Math.floor(L / pas) }, (_, i) => `M${(i + 1) * pas} 0V${H}`), ...Array.from({ length: Math.floor(H / pas) }, (_, i) => `M0 ${(i + 1) * pas}H${L}`)].join('');
    fond = `<rect width="${L}" height="${H}" fill="var(--plan, ${PLAN.fond})"></rect><path d="${grille}" stroke="var(--papier, ${NEUTRES.papier})" stroke-opacity="0.07" stroke-width="1"></path><path d="M16 12H${L - 16}M16 ${H - 12}H${L - 16}" stroke="var(--papier, ${NEUTRES.papier})" stroke-opacity="0.28" stroke-width="1"></path>`;
  } else if (registre === 'pedagogique') {
    // Aplat doux centré : le sujet (pieds, jambes) le déborde
    const [x, y, l, h] = [L * 0.1, H * 0.1, L * 0.8, H * 0.8];
    fond =`<rect x="${r1(x + l * 0.06)}" y="${r1(y + h * 0.04)}" width="${r1(l * 0.88)}" height="${r1(h * 0.92)}" rx="${r1(Math.min(l, h) * 0.12)}" fill="var(--aplat, var(--doux))"></rect>`;
  }
  // Sujet dans le <title> (jamais affiché) : thème et pièces, pour l'accessibilité des outils et les agents
  const titre = `<title>${titreTheme(themeId)} — ${sourcesTheme(themeId, registre).join(', ')}</title>`;
  const corps = piece.type === 'scene' ? sceneHeros(piece.nom, { format, registre }) : poser(svgPiece(piece, registre, `${id}-a`), ...CADRES[format]);
  const style = couleurs(g, registre);
  const classes = ['heros-theme', `heros-theme--${themeId}`, `heros-theme--${format}`, `heros-theme--${registre}`, o.classe].filter(Boolean).join(' ');
  return `<svg class="${classes}" viewBox="0 0 ${L} ${H}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" fill="none"${style ? ` style="${style}"` : ''}>${titre}${fond}${corps}</svg>`;
}
