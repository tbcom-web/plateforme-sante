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
import { gamme as gammeParId, variantesGamme, assombrirJusqua, type Gamme } from './gammes';
import { NEUTRES, PLAN } from './charte';
import { contraste, melanger, rvb, hex } from './couleurs';
import { PRESSION } from './univers';
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
 * Héros posé SANS fond (retour de Paul du 2026-10-10 sur la foulée en relevé : « pour ces illustrations je pense qu'on peut
 * supprimer le background carré ») : ni rectangle « plan », ni quadrillage, ni filets de cadre ; le dessin est détouré, MÊME
 * géométrie. `clair` : posé sur une page claire (fond, fond doux ou aplat de la gamme) : trait à l'encre de la gamme au lieu du
 * papier, accent de la gamme assombri (même teinte), couleurs littérales (palette de pression, traces, marqueurs) assombries
 * jusqu'à 3:1 sur ces fonds ; `sombre` : posé sur une surface déjà sombre (premier écran plein, tuile plan) : couleurs du relevé
 * inchangées. Sans effet hors du registre relevé (pédagogique : aplat doux clair ; ligne : déjà sans fond).
 */
export type SansFond = 'clair' | 'sombre';

/** Fonds clairs sur lesquels un héros sans fond peut être posé (page, sections douces, aplat de la planche) */
export const fondsClairsGamme = (g: Gamme | undefined): string[] => (g ? [g.fond, g.fondDoux, variantesGamme(g).aplat] : [NEUTRES.blanc, NEUTRES.douxDefaut]);

/** Teinte (degrés) d'une couleur #rrggbb */
function teinte(c: string): number {
  const [r, v, b] = rvb(c).map((x) => x / 255);
  const max = Math.max(r, v, b), d = max - Math.min(r, v, b);
  if (d === 0) return 0;
  const t = max === r ? ((v - b) / d) % 6 : max === v ? (b - r) / d + 2 : (r - v) / d + 4;
  return (t * 60 + 360) % 360;
}
/** Un jaune ou un vert-jaune clair assombri vire à l'olive : on lui préfère l'autre couleur de la gamme */
const viraOlive = (c: string, fonds: string[]) => { const t = teinte(c); return t >= 40 && t <= 100 && Math.min(...fonds.map((f) => contraste(c, f))) < 3; };

/** Couleurs du relevé posé sur une page claire : encre de la gamme, accent (signal des vitaminées, accent des sobres) à 3:1 */
export function teintesRelevesClair(g: Gamme | undefined): { encre: string; accent: string; pression: string[]; fonds: string[] } {
  const fonds = fondsClairsGamme(g);
  const encre = g ? assombrirJusqua(variantesGamme(g).encre, fonds, 7) : NEUTRES.encre;
  // Accent : le signal du relevé sombre (même teinte, assombrie), sauf s'il virerait à l'olive : vif, duo puis accent de la gamme
  const candidats = g ? (g.famille === 'vitaminee' ? [g.signal, g.vif, g.duo, g.accent] : [g.accent]).filter((c): c is string => Boolean(c)) : [PLAN.fond];
  const accent = assombrirJusqua(candidats.find((c) => !viraOlive(c, fonds)) ?? candidats[candidats.length - 1], fonds, 3);
  return { encre, accent, pression: PRESSION.map((c) => assombrirJusqua(c, fonds, 3)), fonds };
}

/** Variables de couleur d'un héros relevé posé sur une page claire (sans gamme : celles de la page, --g-* puis la charte) */
function couleursClair(g: Gamme | undefined): string {
  const t = teintesRelevesClair(g);
  // Sans gamme : jamais une variable redéfinie à partir d'elle-même (cycle CSS → valeur invalide → signal menthe de repli)
  const encre = g ? t.encre : 'var(--g-encre, var(--encre))', accent = g ? t.accent : 'var(--g-accent-texte, var(--accent))';
  return [
    `--dessin-trait:${encre}`, `--dessin-ligne:${encre}`, `--anim-trait:${encre}`, `--papier:${encre}`,
    `--dessin-accent:${accent}`, `--accent-pale:${accent}`, `--signal:${accent}`, ...(g ? [`--accent:${accent}`] : []),
    `--dessin-os:${accent}`, '--dessin-os-opacite:0.4', '--dessin-os-aplat:0', '--dessin-os-secondaires:none',
    // Caches (peau-seule) : la couleur de la page qui porte le héros
    `--dessin-fond:var(--hp-page, var(--g-page, ${g ? g.fond : 'var(--fond)'}))`,
    ...t.pression.map((c, k) => `--pression-${k + 1}:${c}`),
  ].join(';');
}

const HEX = /^#[0-9a-f]{6}$/i;
/** Couleur littérale (#rrggbb ou « rgb(r g b / a) ») → [hex, alpha] ; null pour var(), none, currentColor… */
function lireCouleur(c: string): [string, number] | null {
  if (HEX.test(c)) return [c.toLowerCase(), 1];
  const m = c.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  return m ? [hex([+m[1], +m[2], +m[3]]), +m[4]] : null;
}
const ecrireCouleur = (h: string, a: number) => (a >= 1 ? h : `rgb(${rvb(h).join(' ')} / ${a})`);

/**
 * Couleurs littérales d'un relevé (dessiné pour le fond sombre) adaptées à une page claire, élément par élément : le blanc et le
 * papier deviennent l'encre (même transparence) ; les autres couleurs gardent leur teinte, assombries jusqu'à 3:1 sur chacun des
 * `fonds` — compte tenu de l'opacité de l'élément quand il est franc (≥ 0,5 : trait significatif), à pleine opacité sinon (voiles,
 * volumes pâles : même teinte que le trait). Les couleurs en var() suivent les variables posées sur la racine.
 */
export function adapterRelevePageClaire(svg: string, encre: string, fonds: string[]): string {
  const memo = new Map<string, string>();
  const adapter = (h: string, opacite: number) => {
    const o = opacite >= 0.5 ? opacite : 1;
    const cle = `${h}|${o}`;
    const deja = memo.get(cle);
    if (deja) return deja;
    let x = h;
    if (h === '#ffffff' || h === NEUTRES.papier.toLowerCase()) x = encre;
    else {
      const pire = (c: string) => Math.min(...fonds.map((f) => contraste(melanger(f, c, o), f)));
      for (let k = 3; pire(x) < 3 && k <= 21; k += 0.5) x = assombrirJusqua(h, fonds, k);
    }
    memo.set(cle, x);
    return x;
  };
  return svg.replace(/<(path|line|circle|ellipse|rect|polygon|polyline|stop)\b[^>]*>/g, (balise) => {
    const attr = (n: string) => balise.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
    const general = +(attr('opacity') ?? 1);
    let b = balise;
    for (const [nom, op] of [['stroke', 'stroke-opacity'], ['fill', 'fill-opacity'], ['stop-color', 'stop-opacity']] as const) {
      const v = attr(nom);
      const c = v ? lireCouleur(v) : null;
      if (!v || !c) continue;
      const o = c[1] * +(attr(op) ?? 1) * general;
      b = b.replace(` ${nom}="${v}"`, ` ${nom}="${ecrireCouleur(adapter(c[0], o), c[1])}"`);
    }
    return b;
  });
}

/** Retire la grille du laboratoire (coureur) : un héros sans fond n'a ni quadrillage ni cadre */
const sansGrille = (svg: string) => svg.replace(/<path class="grille-labo"[^>]*><\/path>/g, '');

/**
 * Bords fondus d'un héros sans fond : un sujet coupé par le cadre (jambes, bras, sol) se dissout dans la page sur 4 % de chaque
 * côté au lieu d'être tranché net (le cadre « plan » justifiait la coupe). Masques SVG natifs (aucun mask-image CSS : WebKit).
 */
function fondu(corps: string, id: string, L: number, H: number): string {
  const grad = (n: string, x2: number, y2: number) => `<linearGradient id="${id}-g${n}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#fff" stop-opacity="0"></stop><stop offset="0.04" stop-color="#fff"></stop><stop offset="0.96" stop-color="#fff"></stop><stop offset="1" stop-color="#fff" stop-opacity="0"></stop></linearGradient>`;
  const masque = (n: string) => `<mask id="${id}-m${n}" maskUnits="userSpaceOnUse" x="0" y="0" width="${L}" height="${H}"><rect width="${L}" height="${H}" fill="url(#${id}-g${n})"></rect></mask>`;
  return `<defs>${grad('x', 1, 0)}${grad('y', 0, 1)}${masque('x')}${masque('y')}</defs><g mask="url(#${id}-mx)"><g mask="url(#${id}-my)">${corps}</g></g>`;
}

/** Fond du héros : surface « plan » quadrillée (relevé), aplat doux arrondi centré (pédagogique), aucun (ligne) */
function fondHeros(registre: Registre, L: number, H: number): string {
  if (registre === 'releve') {
    const pas = 40;
    const grille = [...Array.from({ length: Math.floor(L / pas) }, (_, i) => `M${(i + 1) * pas} 0V${H}`), ...Array.from({ length: Math.floor(H / pas) }, (_, i) => `M0 ${(i + 1) * pas}H${L}`)].join('');
    return `<rect width="${L}" height="${H}" fill="var(--plan, ${PLAN.fond})"></rect><path d="${grille}" stroke="var(--papier, ${NEUTRES.papier})" stroke-opacity="0.07" stroke-width="1"></path><path d="M16 12H${L - 16}M16 ${H - 12}H${L - 16}" stroke="var(--papier, ${NEUTRES.papier})" stroke-opacity="0.28" stroke-width="1"></path>`;
  }
  if (registre === 'pedagogique') {
    // Aplat doux centré : le sujet (pieds, jambes) le déborde
    const [x, y, l, h] = [L * 0.1, H * 0.1, L * 0.8, H * 0.8];
    return `<rect x="${r1(x + l * 0.06)}" y="${r1(y + h * 0.04)}" width="${r1(l * 0.88)}" height="${r1(h * 0.92)}" rx="${r1(Math.min(l, h) * 0.12)}" fill="var(--aplat, var(--doux))"></rect>`;
  }
  return '';
}

/**
 * Habille un dessin (<svg> complet, repère 4:3) en héros de premier écran, exactement comme les héros des thèmes : format paysage
 * ou portrait, fond du registre, couleurs de la gamme, sujet dans le <title> (jamais affiché). Sert aux héros d'un univers
 * (univers-diabete.ts) qui ne sont pas des thèmes.
 */
export function habillerHeros(svg: string, o: { format?: FormatHeros; registre?: Registre; gamme?: string | Gamme | null; titre?: string; classe?: string; sansFond?: SansFond | null; id?: string } = {}): string {
  const format = o.format ?? 'paysage', registre = o.registre ?? 'releve';
  const g = typeof o.gamme === 'string' ? gammeParId(o.gamme) : (o.gamme ?? undefined);
  const { largeur: L, hauteur: H } = FORMATS_HEROS[format];
  const titre = o.titre ? `<title>${o.titre.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>` : '';
  const id = o.id ?? `hh-${format[0]}-${(o.classe ?? '').replace(/[^a-z0-9-]/gi, '')}`;
  return assembler({ g, registre, L, H, id, sansFond: o.sansFond ?? null, titre, corps: poser(svg, ...CADRES[format]), classes: [`heros-theme--${format}`, o.classe] });
}

/** Racine <svg> d'un héros : fond du registre (ou aucun : sansFond), couleurs, classes ; corps adapté à la page claire */
function assembler(a: { g: Gamme | undefined; registre: Registre; L: number; H: number; id: string; sansFond: SansFond | null; titre: string; corps: string; classes: (string | undefined)[] }): string {
  const sf = a.registre === 'releve' ? a.sansFond : null;
  const clair = sf === 'clair' ? teintesRelevesClair(a.g) : null;
  const detoure = clair ? adapterRelevePageClaire(sansGrille(a.corps), clair.encre, clair.fonds) : sf ? sansGrille(a.corps) : a.corps;
  const corps = sf ? fondu(detoure, `${a.id}-sf`, a.L, a.H) : detoure;
  const style = clair ? couleursClair(a.g) : couleurs(a.g, a.registre);
  // Relevé sur page claire : jamais la classe heros-theme--releve (elle prend l'échelle de pression des fonds sombres, gammes.ts)
  const registreClasse = clair ? 'heros-theme--releve-clair' : `heros-theme--${a.registre}`;
  const [premiere, ...autres] = a.classes;
  const classes = ['heros-theme', premiere, registreClasse, sf && 'heros-theme--sans-fond', ...autres].filter(Boolean).join(' ');
  return `<svg class="${classes}" viewBox="0 0 ${a.L} ${a.H}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" fill="none"${style ? ` style="${style}"` : ''}>${a.titre}${sf ? '' : fondHeros(a.registre, a.L, a.H)}${corps}</svg>`;
}

/**
 * Illustration « héros » d'un thème (<svg>…</svg>, décorative, aria-hidden). `format` : paysage 640 × 360 (16:9) ou portrait
 * 360 × 480 (3:4, téléphone) ; `registre` : relevé (surface « plan » sombre aux couleurs de la gamme, trame de pression), pédagogique
 * (schéma au trait sur aplat doux) ou ligne (trait continu, sans fond) ; `gamme` : identifiant ou gamme de gammes.ts. Chaîne vide
 * pour un thème inconnu ou différé (posture).
 */
export function illustrationTheme(
  themeId: string,
  o: { format?: FormatHeros; registre?: Registre; gamme?: string | Gamme | null; id?: string; classe?: string; sansFond?: SansFond | null } = {},
): string {
  if (!themeIllustre(themeId)) return '';
  const format = o.format ?? 'paysage', registre = o.registre ?? 'releve';
  const g = typeof o.gamme === 'string' ? gammeParId(o.gamme) : (o.gamme ?? undefined);
  const { largeur: L, hauteur: H } = FORMATS_HEROS[format];
  const id = o.id ?? `h-${themeId}-${format[0]}-${registre[0]}`;
  const piece = COMPOSITIONS[themeId][registre];
  // Sujet dans le <title> (jamais affiché) : thème et pièces, pour l'accessibilité des outils et les agents
  const titre = `<title>${titreTheme(themeId)} — ${sourcesTheme(themeId, registre).join(', ')}</title>`;
  const corps = piece.type === 'scene' ? sceneHeros(piece.nom, { format, registre }) : poser(svgPiece(piece, registre, `${id}-a`), ...CADRES[format]);
  // Fond : surface « plan » quadrillée (relevé), aplat doux arrondi centré (pédagogique), aucun (ligne) ; aucun non plus sansFond
  return assembler({ g, registre, L, H, id, sansFond: o.sansFond ?? null, titre, corps, classes: [`heros-theme--${themeId}`, `heros-theme--${format}`, o.classe] });
}
