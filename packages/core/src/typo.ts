// Typographie du studio de recettes (demande de Paul du 2026-10-07 : « plus de combinaisons de polices, de tailles, MAJUSCULES
// vs minuscules… »). Dimension INDÉPENDANTE de la paire de polices (PAIRES_POLICES, modeles.ts) : échelle des tailles, casse des
// titres, graisse, interlettrage, mot d'accent du titre principal, alignement des têtes de section, forme des surtitres.
// Une recette enregistre ces réglages ; une SEULE feuille CSS (cssTypo) est partagée par les gabarits Astro (layouts/Gabarit.astro :
// <style> en ligne, data-td sur <html>) et l'aperçu de l'admin (ApercuTheme : data-td sur la racine .ap) : même rendu des deux côtés.
//
// Règles (Paul, docs/charte-graphique.md) :
// - SEO identique : balisage et titres inchangés ; la casse se fait en CSS (`text-transform`), le texte source reste en casse
//   normale ; aucun texte ajouté (numéros de surtitres par compteur CSS) ;
// - lisibilité mobile : tailles minimales, mots métier insécables (« pédicurie-podologie » : --mot-long agrandi quand les titres
//   passent en capitales, Gabarit.astro), titres en capitales réduits sous 480 px (aucun débordement : controle:debordement) ;
// - registre pédagogique : jamais de surtitre numéroté (charte) ; graisse bornée à l'axe réel de la police (aucun faux gras) ;
// - aucun JS, CSS ≤ 4 Ko gzip par recette avec les détails et le menu (typo.test.ts).
// Module pur.

import { POLICES } from './charte';
import { PAIRES_POLICES, pairePolices, type PoliceTitres, type PoliceTexte } from './modeles';

// ---------------------------------------------------------------------------------------------------------------
// Catalogue des polices : licences, axes, fichiers (budget et préchargement)
// ---------------------------------------------------------------------------------------------------------------

export type GenrePolice = 'serif-editoriale' | 'didone' | 'grotesque' | 'geometrique' | 'humaniste' | 'slab' | 'condensee' | 'ronde' | 'mono';
/**
 * Fiche d'une police auto-hébergée (@fontsource, sous-ensemble latin, woff2, font-display swap) : licence libre, axe de graisse
 * réel (aucune graisse hors de l'axe : pas de faux gras), italique disponible pour le mot d'accent, poids du fichier latin (octets,
 * avant la réduction aux caractères du site par l'intégration « polices-reduites » : −20 à −35 %).
 */
export type FichePolice = { id: PoliceTitres | PoliceTexte; famille: string; genre: GenrePolice; licence: 'OFL-1.1' | 'Apache-2.0'; paquet: string; graisses: [number, number]; italique: boolean; octets: number; octetsItalique?: number };
export const FICHES_POLICES: readonly FichePolice[] = [
  { id: 'inter', famille: 'Inter Variable', genre: 'grotesque', licence: 'OFL-1.1', paquet: '@fontsource-variable/inter', graisses: [100, 900], italique: false, octets: 48256 },
  { id: 'manrope', famille: 'Manrope Variable', genre: 'geometrique', licence: 'OFL-1.1', paquet: '@fontsource-variable/manrope', graisses: [200, 800], italique: false, octets: 24836 },
  { id: 'fraunces', famille: 'Fraunces Variable', genre: 'serif-editoriale', licence: 'OFL-1.1', paquet: '@fontsource-variable/fraunces', graisses: [100, 900], italique: true, octets: 67304, octetsItalique: 45656 },
  { id: 'instrument', famille: 'Instrument Serif', genre: 'serif-editoriale', licence: 'OFL-1.1', paquet: '@fontsource/instrument-serif', graisses: [400, 400], italique: true, octets: 22000, octetsItalique: 23000 },
  { id: 'schibsted', famille: 'Schibsted Grotesk Variable', genre: 'grotesque', licence: 'OFL-1.1', paquet: '@fontsource-variable/schibsted-grotesk', graisses: [400, 900], italique: false, octets: 30000 },
  { id: 'nunito', famille: 'Nunito Variable', genre: 'ronde', licence: 'OFL-1.1', paquet: '@fontsource-variable/nunito', graisses: [200, 1000], italique: false, octets: 38000 },
  { id: 'geist', famille: 'Geist Variable', genre: 'geometrique', licence: 'OFL-1.1', paquet: '@fontsource-variable/geist', graisses: [100, 900], italique: false, octets: 29400 },
  { id: 'publicsans', famille: 'Public Sans Variable', genre: 'grotesque', licence: 'OFL-1.1', paquet: '@fontsource-variable/public-sans', graisses: [100, 900], italique: false, octets: 30000 },
  { id: 'bodoni', famille: 'Bodoni Moda Variable', genre: 'didone', licence: 'OFL-1.1', paquet: '@fontsource-variable/bodoni-moda', graisses: [400, 900], italique: true, octets: 40000, octetsItalique: 42000 },
  { id: 'newsreader', famille: 'Newsreader Variable', genre: 'serif-editoriale', licence: 'OFL-1.1', paquet: '@fontsource-variable/newsreader', graisses: [200, 800], italique: true, octets: 40000, octetsItalique: 42000 },
  { id: 'playfair', famille: 'Playfair Display Variable', genre: 'didone', licence: 'OFL-1.1', paquet: '@fontsource-variable/playfair-display', graisses: [400, 900], italique: true, octets: 38404, octetsItalique: 38804 },
  { id: 'dmserif', famille: 'DM Serif Display', genre: 'didone', licence: 'OFL-1.1', paquet: '@fontsource/dm-serif-display', graisses: [400, 400], italique: true, octets: 24744, octetsItalique: 24572 },
  { id: 'youngserif', famille: 'Young Serif', genre: 'serif-editoriale', licence: 'OFL-1.1', paquet: '@fontsource/young-serif', graisses: [400, 400], italique: false, octets: 26992 },
  { id: 'lora', famille: 'Lora Variable', genre: 'serif-editoriale', licence: 'OFL-1.1', paquet: '@fontsource-variable/lora', graisses: [400, 700], italique: true, octets: 37788, octetsItalique: 40772 },
  { id: 'cormorant', famille: 'Cormorant Garamond Variable', genre: 'serif-editoriale', licence: 'OFL-1.1', paquet: '@fontsource-variable/cormorant-garamond', graisses: [300, 700], italique: true, octets: 37640, octetsItalique: 39260 },
  { id: 'robotoslab', famille: 'Roboto Slab Variable', genre: 'slab', licence: 'Apache-2.0', paquet: '@fontsource-variable/roboto-slab', graisses: [100, 900], italique: false, octets: 34236 },
  { id: 'spacegrotesk', famille: 'Space Grotesk Variable', genre: 'grotesque', licence: 'OFL-1.1', paquet: '@fontsource-variable/space-grotesk', graisses: [300, 700], italique: false, octets: 22288 },
  { id: 'outfit', famille: 'Outfit Variable', genre: 'geometrique', licence: 'OFL-1.1', paquet: '@fontsource-variable/outfit', graisses: [100, 900], italique: false, octets: 32292 },
  { id: 'oswald', famille: 'Oswald Variable', genre: 'condensee', licence: 'OFL-1.1', paquet: '@fontsource-variable/oswald', graisses: [200, 700], italique: false, octets: 28488 },
  { id: 'quicksand', famille: 'Quicksand Variable', genre: 'ronde', licence: 'OFL-1.1', paquet: '@fontsource-variable/quicksand', graisses: [300, 700], italique: false, octets: 28244 },
  { id: 'jakarta', famille: 'Plus Jakarta Sans Variable', genre: 'geometrique', licence: 'OFL-1.1', paquet: '@fontsource-variable/plus-jakarta-sans', graisses: [200, 800], italique: false, octets: 27348 },
  { id: 'figtree', famille: 'Figtree Variable', genre: 'geometrique', licence: 'OFL-1.1', paquet: '@fontsource-variable/figtree', graisses: [300, 900], italique: false, octets: 20156 },
  { id: 'dmsans', famille: 'DM Sans Variable', genre: 'geometrique', licence: 'OFL-1.1', paquet: '@fontsource-variable/dm-sans', graisses: [100, 1000], italique: false, octets: 36932 },
  { id: 'worksans', famille: 'Work Sans Variable', genre: 'grotesque', licence: 'OFL-1.1', paquet: '@fontsource-variable/work-sans', graisses: [100, 900], italique: false, octets: 50316 },
  { id: 'sourcesans', famille: 'Source Sans 3 Variable', genre: 'humaniste', licence: 'OFL-1.1', paquet: '@fontsource-variable/source-sans-3', graisses: [200, 900], italique: false, octets: 28740 },
  { id: 'mono', famille: 'JetBrains Mono Variable', genre: 'mono', licence: 'OFL-1.1', paquet: '@fontsource-variable/jetbrains-mono', graisses: [100, 800], italique: false, octets: 40000 },
];
export const fichePolice = (id: string) => FICHES_POLICES.find((f) => f.id === id);
/** Budget polices d'un site (octets, fichiers réduits aux caractères du site, mesuré au build) */
export const BUDGET_POLICES = 90 * 1024;
/** Part gardée par la réduction aux caractères du site (estimation prudente : mesuré −28 à −40 %) */
export const REDUCTION = 0.72;

// ---------------------------------------------------------------------------------------------------------------
// Réglages typographiques
// ---------------------------------------------------------------------------------------------------------------

export const ECHELLES = [
  { id: 'modeste', nom: 'Modeste (1,2)', ratio: 1.2 },
  { id: 'affirmee', nom: 'Affirmée (1,333)', ratio: 1.333 },
  { id: 'spectaculaire', nom: 'Spectaculaire (1,5)', ratio: 1.5 },
] as const;
export const CASSES = [
  { id: 'normale', nom: 'Casse normale' },
  { id: 'majuscules', nom: 'MAJUSCULES espacées' },
  { id: 'petites-capitales', nom: 'Surtitres en petites capitales' },
] as const;
export const GRAISSES = [
  { id: 'paire', nom: 'Celle de la paire', valeur: 0 },
  { id: 'fine', nom: 'Fine', valeur: 300 },
  { id: 'normale', nom: 'Normale', valeur: 450 },
  { id: 'grasse', nom: 'Grasse', valeur: 700 },
  { id: 'noire', nom: 'Noire', valeur: 850 },
] as const;
export const INTERLETTRAGES = [
  { id: 'serre', nom: 'Serré', em: -0.035 },
  { id: 'normal', nom: 'Normal', em: -0.012 },
  { id: 'large', nom: 'Large', em: 0.02 },
] as const;
export const ACCENTS = [
  { id: 'aucun', nom: 'Aucun' },
  { id: 'italique', nom: 'Un mot en italique' },
  { id: 'couleur', nom: 'Un mot en couleur' },
] as const;
export const ALIGNEMENTS = [
  { id: 'gauche', nom: 'À gauche' },
  { id: 'centre', nom: 'Centré' },
] as const;
export const SURTITRES = [
  { id: 'simple', nom: 'Simple' },
  { id: 'filet', nom: 'Avec filet' },
  { id: 'numero', nom: 'Numéroté' },
  { id: 'pastille', nom: 'En pastille' },
] as const;

/** Axes typographiques (ordre du studio), avec leurs valeurs */
export const AXES_TYPO = {
  echelle: ECHELLES, casse: CASSES, graisse: GRAISSES, interlettrage: INTERLETTRAGES, accent: ACCENTS, alignement: ALIGNEMENTS, surtitre: SURTITRES,
} as const;
export type AxeTypo = keyof typeof AXES_TYPO;
export const NOMS_AXES_TYPO: Record<AxeTypo, string> = { echelle: 'Échelle', casse: 'Casse', graisse: 'Graisse', interlettrage: 'Interlettrage', accent: 'Mot d’accent', alignement: 'Alignement', surtitre: 'Surtitres' };
export type ReglagesTypo = { [A in AxeTypo]: (typeof AXES_TYPO)[A][number]['id'] };
/** Réglages par défaut : rendu historique des gabarits (aucune règle CSS) */
export const TYPO_PAR_DEFAUT: ReglagesTypo = { echelle: 'affirmee', casse: 'normale', graisse: 'paire', interlettrage: 'normal', accent: 'aucun', alignement: 'gauche', surtitre: 'simple' };
export const estTypoParDefaut = (t: ReglagesTypo) => (Object.keys(TYPO_PAR_DEFAUT) as AxeTypo[]).every((a) => t[a] === TYPO_PAR_DEFAUT[a]);
const valeursAxe = (a: AxeTypo) => (AXES_TYPO[a] as readonly { id: string }[]).map((x) => x.id);

/** Réglages reçus (brouillon, recette) : valeurs connues seulement, défaut pour le reste */
export function normaliserTypo(brut: unknown): ReglagesTypo {
  const o = brut && typeof brut === 'object' && !Array.isArray(brut) ? (brut as Record<string, unknown>) : {};
  const r = { ...TYPO_PAR_DEFAUT } as Record<AxeTypo, string>;
  for (const a of Object.keys(AXES_TYPO) as AxeTypo[]) if (valeursAxe(a).includes(o[a] as string)) r[a] = o[a] as string;
  return r as ReglagesTypo;
}

/** Graisse effective des titres : celle de la paire, ou l'axe choisi borné à la graisse réelle de la police (jamais de faux gras) */
export function graisseTitres(police: unknown, t: Pick<ReglagesTypo, 'graisse'>): number | null {
  const p = pairePolices(police);
  const v = GRAISSES.find((g) => g.id === t.graisse)?.valeur ?? 0;
  if (!p || !v) return null;
  const [min, max] = fichePolice(p.titres)?.graisses ?? [100, 900];
  return Math.max(min, Math.min(max, v));
}

/**
 * Mot d'accent effectif : l'italique n'est servi que si la police des titres a un italique, que le site reste à 3 fichiers de
 * police au plus (titres, texte, italique ; la mono du registre relevé classique en est un) et dans le budget de 90 Ko ; sinon le
 * mot passe en couleur.
 */
export function accentEffectif(police: unknown, t: Pick<ReglagesTypo, 'accent'>, opts: { mono?: boolean } = {}): ReglagesTypo['accent'] {
  if (t.accent !== 'italique') return t.accent;
  const p = pairePolices(police);
  const f = p ? fichePolice(p.titres) : undefined;
  if (!p || !f?.italique) return 'couleur';
  const o = { italique: true, mono: opts.mono };
  return fichiersPolices(p.id, o).length <= 3 && poidsPolices(p.id, o) * REDUCTION <= BUDGET_POLICES ? 'italique' : 'couleur';
}

/** Fichiers de police d'un site (identifiants, `-italique` pour l'italique des titres) : 3 au plus, 2 familles au plus */
export function fichiersPolices(police: unknown, opts: { italique?: boolean; mono?: boolean } = {}): string[] {
  const p = pairePolices(police) ?? PAIRES_POLICES[0];
  return [...new Set([p.titres, p.texte, ...(opts.italique ? [`${p.titres}-italique`] : []), ...(opts.mono ? ['mono'] : [])])];
}
/** Poids estimé des polices d'un site avant réduction (octets) : contrôle du budget (le build mesure le poids réduit) */
export function poidsPolices(police: unknown, opts: { italique?: boolean; mono?: boolean } = {}): number {
  return fichiersPolices(police, opts).reduce((s, id) => {
    const f = fichePolice(id.replace(/-italique$/, ''));
    return s + (id.endsWith('-italique') ? f?.octetsItalique ?? 0 : f?.octets ?? 0);
  }, 0);
}

/** Facteur de chasse des titres : les capitales sont plus larges (≈ ×1,3) ; sert à --mot-long (titres ajustés au plus long mot) */
export const facteurChasse = (t: Pick<ReglagesTypo, 'casse'> | null | undefined) => (t?.casse === 'majuscules' ? 1.45 : 1);
/** Facteur de taille du titre principal (aperçu de l'admin : tailles calculées en pixels) */
export const facteurTitres = (t: Pick<ReglagesTypo, 'echelle'> | null | undefined) => ({ modeste: 0.78, affirmee: 1, spectaculaire: 1.22 })[t?.echelle ?? 'affirmee'];

// ---------------------------------------------------------------------------------------------------------------
// Feuille CSS
// ---------------------------------------------------------------------------------------------------------------

// Cibles (site : gabarits classique et coquille ; aperçu : classes ap-*) — balisage inchangé
const H1 = ':is(h1,.ap-h1)';
const H2 = ':is(h2,.ap-h2):not(:is(.prose,.ap-prose) *)';
const SUR = ':is(.g-sur,.sur,.pe__sur,.ap-sur,.td-sur)';
const TETE = ':is(.g-tete,.entete-section,.td-tete)';
const MOT = `${H1} :is(.pale,.ap-pale)`;

/**
 * Feuille CSS des réglages typographiques (racine `[data-td]` : <html> du site, racine .ap de l'aperçu) ; vide pour les réglages
 * par défaut. Les tailles passent par des variables (--pe-h1 du premier écran) ou par min() avec la largeur utile, jamais plus
 * grandes que ce que le plus long mot permet (--mot-long).
 */
export function cssTypo(brut: unknown, opts: { police?: unknown; mono?: boolean } = {}): string {
  const t = normaliserTypo(brut);
  if (estTypoParDefaut(t)) return '';
  const r = '[data-td]';
  const css: string[] = [];
  // Échelle : h2 = r³ rem, h1 = r⁵ rem (bornés), réduits sur téléphone ; « affirmée » = tailles du gabarit (aucune règle)
  if (t.echelle !== 'affirmee') {
    const k = ECHELLES.find((e) => e.id === t.echelle)!.ratio;
    const h1 = Math.min(7.2, k ** 5).toFixed(2), h2 = Math.min(3.6, k ** 3).toFixed(2);
    const h2min = t.echelle === 'spectaculaire' ? 1.9 : 1.55;
    css.push(`${r} :is(.pe--carte,.pe--notice,.pe--figure){--pe-h1:${h1}rem!important}`);
    css.push(`${r} ${H2}{font-size:clamp(${h2min}rem,${(k ** 3 * 1.6).toFixed(1)}vw,${h2}rem)!important;line-height:${t.echelle === 'spectaculaire' ? 1.02 : 1.18}!important}`);
    css.push(`${r} ${H1}:not(.pe__grille>h1){font-size:min(${h1}rem,calc((100vw - 40px) / (var(--mot-long,14) * .58)))!important}`);
  }
  // Interlettrage (titres) ; les capitales s'espacent toujours un peu
  const em = INTERLETTRAGES.find((i) => i.id === t.interlettrage)!.em + (t.casse === 'majuscules' ? 0.05 : 0);
  if (t.interlettrage !== 'normal' || t.casse === 'majuscules') css.push(`${r} :is(${H1},${H2}){letter-spacing:${em.toFixed(3)}em!important}`);
  // Casse (CSS seulement : le texte source reste en casse normale)
  if (t.casse === 'majuscules') {
    // Capitales accentuées (É, À) : un peu plus d'interligne, jamais de lignes qui se touchent
    css.push(`${r} :is(${H1},${H2}){text-transform:uppercase;line-height:1.1!important}`);
    // Capitales sur téléphone : intertitres plus petits (mot métier insécable sur une ligne à 360 px)
    css.push(`@media (max-width:479px){${r} ${H2}{font-size:min(1.4rem,6.4vw)!important}}`);
  }
  if (t.casse === 'petites-capitales' || t.casse === 'majuscules') css.push(`${r} ${SUR}{text-transform:uppercase!important;font-size:.82em!important;letter-spacing:.12em!important;font-style:normal!important}`);
  // Mot d'accent du titre principal (la ville : « .pale ») : italique de la police des titres, ou couleur du cabinet
  const accent = accentEffectif(opts.police, t, { mono: opts.mono });
  if (accent === 'italique') css.push(`${r} ${MOT}{font-style:italic!important;font-weight:inherit}`);
  if (accent === 'couleur') css.push(`${r} ${MOT}{color:var(--g-accent-texte,var(--accent))!important;font-style:normal!important}`);
  // Alignement des têtes de section
  if (t.alignement === 'centre') css.push(`${r} ${TETE}{text-align:center;justify-items:center;margin-inline:auto!important}${r} ${TETE} ${H2}{margin-inline:auto}`);
  // Surtitres
  if (t.surtitre === 'filet') css.push(`${r} ${SUR}{display:inline-flex!important;align-items:center;gap:12px}${r} ${SUR}::before{content:''!important;display:block!important;flex:none;width:28px;height:2px;background:currentColor;transform:none!important}`);
  if (t.surtitre === 'pastille') css.push(`${r} ${SUR}{display:inline-flex!important;align-items:center;justify-self:start;width:fit-content;padding:5px 14px!important;border-radius:999px;background:var(--g-bulle,var(--accent-tres-pale,#eef));color:var(--g-bulle-texte,var(--encre))!important}${r} ${SUR}::before{display:none!important}`);
  if (t.surtitre === 'numero') {
    // Registre pédagogique : jamais de numéro (charte) — le filet le remplace
    const n = `${r}:not([data-registre=pedagogique])`;
    css.push(`${n}{counter-reset:td-sur}${n} ${SUR}::before{counter-increment:td-sur;content:counter(td-sur,decimal-leading-zero) ' — '!important;display:inline!important;width:auto!important;height:auto!important;background:none!important;font-variant-numeric:tabular-nums}`);
    css.push(`${r}[data-registre=pedagogique] ${SUR}::before{content:''!important;display:inline-block!important;width:28px;height:2px;margin-right:12px;vertical-align:middle;background:currentColor}`);
  }
  return css.join('');
}

// ---------------------------------------------------------------------------------------------------------------
// Notables, libellés
// ---------------------------------------------------------------------------------------------------------------

/** Clés notables (assets_notes, type typo) : `typo:police:<paire>` (spécimen d'une paire), `typo:<axe>:<valeur>` */
export function clesTypo(police: unknown, t: ReglagesTypo): string[] {
  const p = pairePolices(police);
  return [...(p ? [`typo:police:${p.id}`] : []), ...(Object.keys(AXES_TYPO) as AxeTypo[]).map((a) => `typo:${a}:${t[a]}`)];
}
/** Toutes les clés notables de la typographie (tuile « Typographies » de /admin/retours) */
export const toutesClesTypo = (): string[] => [
  ...PAIRES_POLICES.map((p) => `typo:police:${p.id}`),
  ...(Object.keys(AXES_TYPO) as AxeTypo[]).flatMap((a) => valeursAxe(a).filter((v) => !(a === 'graisse' && v === 'paire')).map((v) => `typo:${a}:${v}`)),
];
export function estCleTypo(k: unknown): boolean {
  if (typeof k !== 'string') return false;
  const [type, a, v, ...reste] = k.split(':');
  if (type !== 'typo' || reste.length || !v) return false;
  if (a === 'police') return Boolean(pairePolices(v));
  return a in AXES_TYPO && valeursAxe(a as AxeTypo).includes(v);
}
/** Libellé d'une clé typo (« Échelle : Spectaculaire (1,5) », « Polices : Didone élégante ») */
export function libelleCleTypo(k: string): string {
  const [, a, v] = k.split(':');
  if (a === 'police') return `Polices : ${pairePolices(v)?.nom ?? v}`;
  const x = (AXES_TYPO[a as AxeTypo] as readonly { id: string; nom: string }[] | undefined)?.find((y) => y.id === v);
  return `${NOMS_AXES_TYPO[a as AxeTypo] ?? a} : ${x?.nom ?? v}`;
}
/** Réglages de typo montrés par une clé (aperçu de la tuile) : la valeur de l'axe posée sur `t` */
export function typoPourCle(t: ReglagesTypo, k: string): { typo: ReglagesTypo; police?: string } {
  const [, a, v] = k.split(':');
  if (a === 'police') return { typo: t, police: v };
  return { typo: normaliserTypo({ ...t, [a]: v }) };
}
/** Résumé lisible (studio, export) */
export const libelleTypo = (t: ReglagesTypo) => (Object.keys(AXES_TYPO) as AxeTypo[]).map((a) => (AXES_TYPO[a] as readonly { id: string; nom: string }[]).find((x) => x.id === t[a])?.nom ?? t[a]).join(' · ');
/** Pile CSS d'une police (spécimens) */
export const pilePolice = (id: string) => (POLICES as Record<string, string>)[id] ?? POLICES.inter;
