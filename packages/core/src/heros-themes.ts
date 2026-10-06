// Illustrations « héros » des thèmes du cabinet (themes.ts) : une composition grand format par thème principal, en format paysage
// (ordinateur, 16:9) et portrait (téléphone, 3:4), dans les trois registres (relevé, pédagogique, trait continu), aux couleurs de la
// gamme. API pure (chaîne SVG, aucune dépendance d'exécution) : l'accueil et les pages de thème la branchent.
//
// RÈGLE : aucune géométrie nouvelle. Chaque composition ASSEMBLE des dessins existants et revus (dessins.ts, ligne.ts, images fixes
// des animations, matériel) : pied, foulée, empreintes, semelle, hallux viennent des géométries validées (pied.ts, foulee.ts, pas.ts,
// bibliotheque/). La composition elle-même (choix, cadrage, couleurs) est un BROUILLON à valider par Paul.
//
// Garde-fous (pieges-illustration.md) : AUCUN texte visible dans un héros (consigne de Paul du 2026-10-06 : ni légende, ni lecture,
// ni mention « schéma illustratif » ; les <text>, étiquettes et renvois des pièces sont retirés ; le sujet reste dans le <title>,
// lu par les outils et les agents, pas affiché), diabète sans rouge « pic » ni pied nu qui marche (examen au monofilament,
// inspection des pieds), enfant sans courbes de données (premiers pas), pédicurie sans main ni visage.
//
// Exceptions (retours de Paul du 2026-10-06, heros-scenes.ts) : ENFANT et SENIOR ne sont plus des assemblages de deux pièces mais une
// SCÈNE dessinée à partir des géométries validées. Enfant : le podoscope (« boîte avec des pieds en barres, vraiment basique ») est
// remplacé par de petits pieds d'enfant face aux pieds d'un adulte (et leurs empreintes en points, en paysage). Senior : la plaque
// d'empreintes au point rouge central (incomprise) et la canne isolée en trait vertical sont remplacées par une marche à petits pas,
// chaussée, avec une canne lisible (poignée en crosse tenue par une main, embout au sol en avant du pied).
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

/** Pièce d'une composition : un dessin existant, dans un registre donné */
type Piece =
  | { type: 'dessin'; nom: NomDessin }
  | { type: 'animation'; nom: Animation }
  | { type: 'ligne'; nom: NomLigne }
  | { type: 'materiel'; id: string };

/**
 * Pièce principale (grande) et pièce d'appui (plus petite), par thème et par registre. Alignées sur le choix de l'agent « refonte
 * agence » (apps/sites/src/lib/vitrine.ts, DESSINS_THEME), sauf deux écarts voulus : diabète (pièce d'appui = matériel du test au
 * monofilament, pas le relevé « appuis » dont l'anneau rouge se lit « pic ») et enfant (premiers pas, pas la croissance chiffrée).
 */
const COMPOSITIONS: Record<ThemeIllustre, Record<Registre, [Piece, Piece]>> = {
  // Foulée (coureur chaussé de l'animation, cinématique foulee.ts) et chaussure de course de profil
  sport: {
    releve: [{ type: 'animation', nom: 'coureur' }, { type: 'dessin', nom: 'sport' }],
    pedagogique: [{ type: 'dessin', nom: 'sport' }, { type: 'dessin', nom: 'taping' }],
    ligne: [{ type: 'ligne', nom: 'marche' }, { type: 'ligne', nom: 'chaussure-course' }],
  },
  // Dépistage au monofilament (3 sites, fil plié en C) et matériel du test ; en trait : inspection des pieds (vus de dessus)
  diabete: {
    releve: [{ type: 'dessin', nom: 'diabete' }, { type: 'materiel', id: 'monofilament-diapason' }],
    pedagogique: [{ type: 'dessin', nom: 'diabete' }, { type: 'materiel', id: 'monofilament-diapason' }],
    ligne: [{ type: 'ligne', nom: 'monofilament' }, { type: 'ligne', nom: 'pieds-dessus' }],
  },
  // Orthonyxie et gros plan de l'hallux (normal / incarné, validé le 2026-10-05)
  ongles: {
    releve: [{ type: 'dessin', nom: 'orthonyxie' }, { type: 'dessin', nom: 'ongle' }],
    pedagogique: [{ type: 'dessin', nom: 'orthonyxie' }, { type: 'dessin', nom: 'ongle' }],
    ligne: [{ type: 'ligne', nom: 'orthonyxie' }, { type: 'ligne', nom: 'ongle' }],
  },
  // Scène dessinée (SCENES ci-dessous) : ces pièces ne servent plus qu'en repli
  enfant: {
    releve: [{ type: 'animation', nom: 'premiers-pas' }, { type: 'ligne', nom: 'premiers-pas' }],
    pedagogique: [{ type: 'ligne', nom: 'premiers-pas' }, { type: 'ligne', nom: 'empreintes' }],
    ligne: [{ type: 'ligne', nom: 'premiers-pas' }, { type: 'ligne', nom: 'empreintes' }],
  },
  // Scène dessinée (SCENES ci-dessous) : ces pièces ne servent plus qu'en repli
  senior: {
    releve: [{ type: 'dessin', nom: 'senior' }, { type: 'dessin', nom: 'domicile' }],
    pedagogique: [{ type: 'dessin', nom: 'senior' }, { type: 'dessin', nom: 'domicile' }],
    ligne: [{ type: 'ligne', nom: 'senior-canne' }, { type: 'ligne', nom: 'domicile' }],
  },
  // Semelle orthopédique (POD-AT-0004/0005, courbes de relief) et empreintes
  semelles: {
    releve: [{ type: 'animation', nom: 'semelle' }, { type: 'dessin', nom: 'analyse' }],
    pedagogique: [{ type: 'dessin', nom: 'semelle' }, { type: 'dessin', nom: 'analyse' }],
    ligne: [{ type: 'ligne', nom: 'semelle' }, { type: 'ligne', nom: 'empreintes' }],
  },
  // Soin de l'ongle (pied vu de dessus et médaillon de l'hallux), cors et durillons ; en trait : instruments et cor
  pedicurie: {
    releve: [{ type: 'dessin', nom: 'soin' }, { type: 'dessin', nom: 'cors-durillons' }],
    pedagogique: [{ type: 'dessin', nom: 'soin' }, { type: 'dessin', nom: 'cors-durillons' }],
    ligne: [{ type: 'ligne', nom: 'instruments' }, { type: 'ligne', nom: 'cor' }],
  },
};

/** Thèmes dont le héros est une scène dessinée d'un seul tenant (heros-scenes.ts) plutôt qu'un assemblage de deux pièces */
const SCENES: Partial<Record<ThemeIllustre, SceneHeros>> = { enfant: 'enfant', senior: 'senior' };

/** Sources d'une composition (inventaire, revue) : « dessin:sport », « animation:coureur », « ligne:marche », « materiel:podoscope » */
export function sourcesTheme(id: ThemeIllustre, registre: Registre): string[] {
  const scene = SCENES[id];
  if (scene) return [`scene:${scene}`];
  return COMPOSITIONS[id][registre].map((p) => (p.type === 'materiel' ? `materiel:${p.id}` : `${p.type}:${p.nom}`));
}

const r1 = (v: number) => +v.toFixed(1);

/** Retire d'une pièce toute lecture (textes, étiquettes et leurs renvois, légende graduée) : un héros ne montre que le dessin */
const sansLectures = sansTextes;
const svgPiece = (p: Piece, registre: Registre, id: string, appui: boolean) => sansLectures(svgPieceBrute(p, registre, id, appui));

/** SVG d'une pièce, dans le registre du héros ; la pièce d'appui en trait continu prend l'accent */
function svgPieceBrute(p: Piece, registre: Registre, id: string, appui: boolean): string {
  const ligne = { couleur: appui ? ('accent' as const) : ('trait' as const), epaisseur: registre === 'ligne' ? ('fine' as const) : ('moyenne' as const) };
  switch (p.type) {
    case 'dessin': return svgDessin(p.nom, { registre, id, ligne });
    // Images fixes des animations : sans aucune lecture chiffrée ni titre (un héros n'affiche pas de données)
    case 'animation': return svgAnimationFixe(p.nom, { registre, id }).replace(/<rect x="\d+" y="268"[^>]*><\/rect>/g, '');
    case 'ligne': return svgLigne(p.nom, ligne);
    case 'materiel': return svgEquipement(p.id, { registre, id, ligne });
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

/** Cadres des deux pièces (rapport 4:3) selon le format */
const CADRES: Record<FormatHeros, { principale: [number, number, number, number]; appui: [number, number, number, number] }> = {
  paysage: { principale: [8, 26, 400, 300], appui: [392, 86, 240, 180] },
  portrait: { principale: [0, 14, 360, 270], appui: [72, 278, 216, 162] },
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
  const [principale, appui] = COMPOSITIONS[themeId][registre];
  const c = CADRES[format];
  const R = registre === 'releve';
  // Fond : surface « plan » quadrillée (relevé), aplat doux arrondi derrière la pièce principale (pédagogique), aucun (ligne)
  let fond = '';
  if (R) {
    const pas = 40;
    const grille = [...Array.from({ length: Math.floor(L / pas) }, (_, i) => `M${(i + 1) * pas} 0V${H}`), ...Array.from({ length: Math.floor(H / pas) }, (_, i) => `M0 ${(i + 1) * pas}H${L}`)].join('');
    fond = `<rect width="${L}" height="${H}" fill="var(--plan, ${PLAN.fond})"></rect><path d="${grille}" stroke="var(--papier, ${NEUTRES.papier})" stroke-opacity="0.07" stroke-width="1"></path><path d="M16 12H${L - 16}M16 ${H - 12}H${L - 16}" stroke="var(--papier, ${NEUTRES.papier})" stroke-opacity="0.28" stroke-width="1"></path>`;
  } else if (registre === 'pedagogique') {
    // Scène : aplat doux centré (les pieds et les jambes le débordent) ; sinon derrière la pièce principale
    const [x, y, l, h] = SCENES[themeId] ? [L * 0.1, H * 0.1, L * 0.8, H * 0.8] : c.principale;
    fond =`<rect x="${r1(x + l * 0.06)}" y="${r1(y + h * 0.04)}" width="${r1(l * 0.88)}" height="${r1(h * 0.92)}" rx="${r1(Math.min(l, h) * 0.12)}" fill="var(--aplat, var(--doux))"></rect>`;
  }
  // Sujet dans le <title> (jamais affiché) : thème et pièces, pour l'accessibilité des outils et les agents
  const titre = `<title>${titreTheme(themeId)} — ${sourcesTheme(themeId, registre).join(', ')}</title>`;
  const scene = SCENES[themeId];
  const corps = scene
    ? sceneHeros(scene, { format, registre })
    : poser(svgPiece(principale, registre, `${id}-a`, false), ...c.principale) + poser(svgPiece(appui, registre, `${id}-b`, true), ...c.appui);
  const style = couleurs(g, registre);
  const classes = ['heros-theme', `heros-theme--${themeId}`, `heros-theme--${format}`, `heros-theme--${registre}`, o.classe].filter(Boolean).join(' ');
  return `<svg class="${classes}" viewBox="0 0 ${L} ${H}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" fill="none"${style ? ` style="${style}"` : ''}>${titre}${fond}${corps}</svg>`;
}
