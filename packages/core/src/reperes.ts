// Repère « ce qui est évalué » (retour de Paul du 2026-10-08 : « dans l'outil de review / A/B testing ce serait pas mal de
// montrer direct avec un encadré ou autre ce qui est évalué, parfois on ne sait pas trop »). Module PUR : pour une dimension de
// duel (duels.ts, `dimension_differente`) ou une clé notée (« Donner mon avis »), le libellé en langage simple (« la police des
// titres », « le menu sur téléphone ») et les zones de l'aperçu à encadrer, traduites en sélecteurs CSS.
//
// Zones : attributs `data-zone` posés par l'aperçu de l'ADMIN seulement (ApercuTheme, ApercuGabarit : premier écran, blocs de
// l'accueil, contact) et classes déjà présentes dans l'aperçu (.ap-h1, .mn-entete, .hp…). Le site publié n'est pas modifié.
// Couverture générique par préfixe : toute dimension `composant:<famille>` (y compris de nouvelles familles, ex.
// composant:entete-anim) et toute clé `composant:<famille>:<variante>` ont un repère ; famille inconnue → [data-zone="<famille>"].
import { DIMENSIONS_DUEL, MODES_DUEL, pageDeDimension, pageDuel } from './duels';
import { jeuEffets } from './effets';
import { gamme as gammeParId } from './gammes';
import { pairePolices } from './modeles';
import { LIBELLES_STYLES } from './propositions';
import { FAMILLES_COMPOSANTS, habillageDe, LIBELLES_VARIANTES, NOMS_SECTIONS_VARIABLES, PAGES_STRUCTURE, type CompositionRecette } from './recettes';
import { lireCleTraitementPhotos, libelleTraitementPhotos } from './traitements-photos';
import { AXES_TYPO, NOMS_AXES_TYPO, libelleCleTypo, type AxeTypo } from './typo';
import { jeuDetails, libelleCleDetails, libelleDetails } from './details';
import { lireCleSurfaces, surface } from './surfaces';
import { FONDS_IMAGE, lireCleImageFond, lireClePaire, lireDimensionPaire, libellePaire, nomPaire } from './combinaisons-elements';
import { lireDimension, nomValeurHarmonie, type CompositionHarmonie } from './harmonie';
import { ELEMENTS_DETAILS } from './details';
import { AXES_MENU, MENU_PAR_DEFAUT, NOMS_AXES_MENU, libelleCleMenu, menuPourCle, type AxeMenu } from './menus';

/** Zones nommées de l'aperçu (data-zone de l'admin, ou classes stables de l'aperçu) */
export const ZONES_APERCU = {
  'premier-ecran': ['[data-zone="premier-ecran"]', '.hp'],
  menu: ['.ap-entete', '.mn-entete'],
  'menu-mobile': ['.ap-menu', '.mn-burger', '.mn-nav', '.mn-entete', '.ap-entete'],
  rdv: ['.mn-rdv', '.ap-entete .ap-bouton', '.apb-rdv', '.apb-plein', '.apb-flottant'],
  titres: ['.ap-h1', '.ap-h2', '.ap-h3', '.hp__titre', '.eff-titre'],
  'titre-principal': ['.ap-h1', '.hp__titre'],
  paragraphe: ['.ap-chapo', '.hp__soins', '[data-zone="premier-ecran"] p:not([class])', '.td-tete > p:not([class])'],
  textes: ['.ap-sur', '.td-sur', '.hp__sur', '.ap-chapo'],
  photos: ['.ap img', '.hp__fond'],
  illustrations: ['.ap-svg', '.vt', '.eff-visuel'],
  'cartes-soins': ['.forme-carte', '[data-zone="competences"] .ap-carte', '[data-zone="sujets"] .ap-carte'],
  cartes: ['.ap-carte', '.eff-carte', '.td-encadre'],
  boutons: ['.ap-bouton', '.td-bouton', '.mn-rdv', '.hp__bouton'],
  sections: ['.ap-section', '.eff-section'],
  contact: ['[data-zone="contact"]', '.apb-barre', '.apb-flottant', '.apb-classique'],
  pied: ['.ap-pied', '.ap footer'],
} as const satisfies Record<string, readonly string[]>;
export type ZoneApercu = keyof typeof ZONES_APERCU;

/** Blocs de page (data-zone posé par l'aperçu sur le bloc de l'accueil : sujets, competences, acces…) */
const bloc = (b: string) => `[data-zone="${b}"]`;

export type Repere = {
  /** Ce qui est évalué, en langage simple (« la police des titres ») */
  libelle: string;
  /** Zones encadrées (vide : rien à encadrer, jugez l'ensemble) */
  zones: string[];
  /** Sélecteurs CSS des éléments à encadrer dans le document de l'aperçu */
  selecteurs: string[];
  /** Tout le rendu est concerné (thème complet, couleurs, page entière) : bandeau « jugez l'ensemble », pas d'encadré */
  ensemble: boolean;
  /** Précision facultative (« titres, sur-titres et texte courant ») */
  detail?: string;
};

const selecteursDe = (zones: readonly string[]) => [...new Set(zones.flatMap((z) => (z in ZONES_APERCU ? [...ZONES_APERCU[z as ZoneApercu]] : z.startsWith('bloc:') ? [bloc(z.slice(5))] : [])))];
const repere = (libelle: string, zones: string[], detail?: string): Repere => ({ libelle, zones, selecteurs: selecteursDe(zones), ensemble: false, ...(detail ? { detail } : {}) });
const ensemble = (libelle: string, detail?: string): Repere => ({ libelle, zones: [], selecteurs: [], ensemble: true, ...(detail ? { detail } : {}) });

/** Familles d'éléments (composant:<famille>) : nom en langage simple et zones */
const FAMILLES: Record<string, { nom: string; zones: string[]; page?: boolean }> = {
  accueil: { nom: 'le premier écran', zones: ['premier-ecran'] },
  transition: { nom: 'la transition du diaporama', zones: ['premier-ecran'] },
  'entete-anim': { nom: 'l’animation d’en-tête', zones: ['premier-ecran'] },
  'visuel-heros': { nom: 'le visuel du premier écran', zones: ['premier-ecran'] },
  'fond-heros': { nom: 'le fond du premier écran', zones: ['premier-ecran'] },
  'trace-photo': { nom: 'le tracé posé sur la photo', zones: ['premier-ecran'] },
  sections: { nom: 'les transitions entre sections', zones: ['sections'] },
  soins: { nom: 'la présentation des soins', zones: ['bloc:competences'] },
  'soins-forme': { nom: 'la forme des cartes de soins', zones: ['cartes-soins'] },
  sujets: { nom: 'la présentation des sujets', zones: ['bloc:sujets'] },
  horaires: { nom: 'les horaires', zones: ['bloc:acces'] },
  infos: { nom: 'le plan d’accès', zones: ['bloc:acces'] },
  galerie: { nom: 'la galerie du cabinet', zones: ['bloc:galerie'] },
  contact: { nom: 'le bloc rendez-vous et contact', zones: ['contact'] },
  praticiens: { nom: 'la présentation de l’équipe', zones: ['bloc:praticiens'] },
  portraits: { nom: 'la présentation des portraits', zones: ['bloc:praticiens'] },
  faq: { nom: 'les questions fréquentes', zones: ['bloc:faq'] },
  actualites: { nom: 'les actualités', zones: ['bloc:actualites'] },
  pied: { nom: 'le pied de page', zones: ['pied'] },
  fiche: { nom: 'la fiche d’un soin', zones: [], page: true },
  theme: { nom: 'la page sujet', zones: [], page: true },
  article: { nom: 'l’article de blog', zones: [], page: true },
};

/** Repère d'une famille d'éléments ; famille inconnue (nouvelle) : son nom du studio et [data-zone="<famille>"] */
function repereFamille(f: string, valeur?: string): Repere {
  const x = FAMILLES[f];
  const nom = x?.nom ?? (f.startsWith('accueil') || f.startsWith('entete') ? 'le premier écran' : `l’élément « ${(NOMS_SECTIONS_VARIABLES[f] ?? f).toLowerCase()} »`);
  const libelle = valeur ? `${nom} « ${valeur} »` : nom;
  if (x?.page) return ensemble(libelle, 'toute la page');
  return repere(libelle, x?.zones ?? (f.startsWith('accueil') || f.startsWith('entete') ? ['premier-ecran'] : [`bloc:${f}`]));
}

/** Variantes d'une illustration de base (dimension `variante:<axe>`) */
const VARIANTES_ILLUSTRATION: Record<string, string> = {
  contraste: 'le contraste de l’illustration', couleur: 'les couleurs de l’illustration', style: 'le style de l’illustration (même dessin)',
};

/** Zones d'une dimension d'harmonie (v.<section>, police, style, menu…) */
function zonesHarmonie(dim: string): string[] {
  if (dim.startsWith('v.')) return repereFamille(dim.slice(2)).zones;
  if (dim === 'police') return ['titres', 'paragraphe'];
  if (dim === 'style') return ['illustrations'];
  if (dim.startsWith('menu.')) return ['menu'];
  return [];
}
function repereDeuxDimensions(libelle: string, a: string, b: string): Repere {
  const zones = [...new Set([...zonesHarmonie(a), ...zonesHarmonie(b)])];
  return zones.length ? repere(libelle, zones) : ensemble(libelle);
}

/** Répartition des surfaces : zones qui changent entre A et B (premier écran, cartes, texte…) ; aucune : toute la page */
export function repereSurfaces(ids: readonly string[]): Repere {
  const zones = [...new Set(ids.flatMap((id) => surface(id)?.zones ?? []))];
  const libelle = 'la répartition des couleurs et des fonds (même palette)';
  return zones.length ? repere(libelle, zones, 'contraste AA vérifié') : ensemble(libelle, 'fonds de page : jugez l’ensemble · contraste AA vérifié');
}

/** Dimensions de duel nommées (hors composant:*) */
const DIMENSIONS: Record<string, () => Repere> = {
  polices: () => repere('la paire de polices (titres et texte)', ['titres', 'paragraphe']),
  typo: () => repere('la typographie (taille, casse, graisse des titres)', ['titres', 'textes']),
  couleurs: () => ensemble('la palette de couleurs', 'fonds, boutons, accents : partout'),
  'typo:echelle': () => repere('la taille des titres (échelle)', ['titre-principal']),
  'typo:casse': () => repere('la casse des titres (majuscules ou minuscules)', ['titre-principal']),
  'typo:graisse': () => repere('la graisse des titres', ['titre-principal']),
  'typo:interlettrage': () => repere('l’interlettrage des titres', ['titre-principal']),
  'police-couleurs': () => repere('la combinaison police × palette', ['titres', 'paragraphe']),
  effets: () => repere('les effets (survol, apparition)', ['cartes', 'illustrations', 'boutons']),
  traitement: () => repere('le traitement des photos', ['photos']),
  visuels: () => repere('le style des illustrations', ['illustrations', 'photos']),
  photos: () => repere('les photos', ['photos']),
  details: () => repere('les détails (séparateurs, coins, ombres, boutons)', ['cartes', 'boutons', 'textes']),
  menu: () => repere('le menu', ['menu', 'menu-mobile', 'rdv']),
  structure: () => ensemble('la structure du site'),
  photo: () => ensemble('la photo'),
  // Visuels animés du premier écran (visuels-heros-animes.ts) : l'animation jouée face à son image fixe, à une illustration fixe
  // du même sujet, ou à une autre animation (dimension « version » des illustrations)
  'animation:fige': () => ensemble('le visuel animé du premier écran, joué ou figé', 'l’animation apporte-t-elle quelque chose ?'),
  'animation:illustration': () => ensemble('le visuel du premier écran, animation ou illustration fixe'),
  surfaces: () => ensemble('la répartition des couleurs et des fonds (même palette)', 'contraste AA vérifié'),
  'image:fond': () => ensemble('le fond derrière l’image (même image)'),
  'image:traitement': () => ensemble('le traitement de l’image sur ce fond'),
  'details:densite': () => repere('la densité (espacements intérieurs des cartes et boutons)', ['cartes', 'boutons']),
  'details:ombres': () => repere('les ombres des cartes et boutons', ['cartes', 'boutons']),
  'details:coins': () => repere('les arrondis (coins des cartes, boutons, images)', ['cartes', 'boutons']),
  'details:boutons': () => repere('le style des boutons', ['boutons']),
  'details:cadre': () => repere('les cadres d’images', ['illustrations', 'photos']),
  style: () => ensemble('le style du dessin (même sujet)'),
  version: () => ensemble('le dessin (même style)'),
};

/**
 * Ce que compare un duel : dimension de duels.ts (« polices », « composant:horaires »…) ; null = duel libre (thème complet).
 * Toute dimension `composant:<famille>` est couverte (famille connue ou non).
 */
export function repereDimension(dimension: string | null | undefined): Repere {
  if (!dimension) return ensemble('tout le thème (duel libre)', 'thème complet : jugez l’ensemble');
  if (dimension.startsWith('composant:')) return repereFamille(dimension.slice('composant:'.length));
  // Pages complètes : toute la page (structure de cette page, ou deux recettes complètes vues sur elle)
  const page = pageDeDimension(dimension);
  if (page) return ensemble(`la page « ${pageDuel(page)?.nom ?? page} »`, dimension.startsWith('page-libre:') ? 'deux recettes complètes, jugez la page entière' : 'même recette, seule la structure de cette page change');
  // Combinaison d'éléments : les zones des deux éléments
  const paire = lireDimensionPaire(dimension);
  if (paire) return repereDeuxDimensions(`la combinaison ${nomPaire(paire[0], paire[1]).toLowerCase()}`, paire[0], paire[1]);
  // Variantes d'une illustration de base (contraste, couleur, style…) : l'illustration entière, aucun encadré
  if (dimension.startsWith('variante:')) { const v = dimension.slice(9); return ensemble(VARIANTES_ILLUSTRATION[v] ?? `la variante « ${v} » de l’illustration`, 'même dessin de base'); }
  return DIMENSIONS[dimension]?.() ?? ensemble(dimension);
}

/** Dimensions qu'un duel peut tirer (duels.ts, Duel.tsx) : compositions, éléments de page, photos, illustrations */
export const DIMENSIONS_DUEL_TIRABLES: readonly string[] = [
  ...new Set([...Object.values(DIMENSIONS_DUEL).flat(), ...MODES_DUEL.flatMap((m) => m.dimensions), ...FAMILLES_COMPOSANTS.map((f) => `composant:${f}`), 'photo', 'style', 'version']),
];

/** La dimension a-t-elle un repère explicite (pas un repli) ? (tests) */
export const repereConnu = (dimension: string) => dimension in DIMENSIONS || pageDeDimension(dimension) !== null || lireDimensionPaire(dimension) !== null || (dimension.startsWith('composant:') && dimension.slice(10) in FAMILLES) || (dimension.startsWith('variante:') && dimension.slice(9) in VARIANTES_ILLUSTRATION);

const sansPrefixe = (s: string) => s.replace(/^[^:]+ : /, '');

/**
 * Ce que l'on note (tuiles de « Donner mon avis ») : clé de l'élément (composant:…, structure:…, effets:…, typo:…, details:…,
 * menu:…, photo:…, gamme:…) et son titre. Les sélecteurs ne valent que pour un aperçu de page (éléments du studio) ; spécimens
 * (typographie, détails) et visuels seuls : libellé sans encadré.
 */
export function repereCle(cle: string, titre?: string | null): Repere {
  const [type, a, b] = cle.split(':');
  const t = titre ?? cle;
  // Image × fond (tuile « Images × fonds ») : l'image et son fond, sans encadré
  const imf = lireCleImageFond(cle);
  if (imf) return ensemble(`l’image « ${(t.lastIndexOf(' sur ') > 0 ? t.slice(0, t.lastIndexOf(' sur ')) : t)} » sur le fond « ${FONDS_IMAGE.find((f) => f.id === imf.fond)?.nom ?? imf.fond} »`, 'l’accord de l’image et du fond');
  const sf = lireCleSurfaces(cle);
  if (sf) { const x = surface(sf)!; return x.zones.length ? repere(`la répartition des surfaces « ${x.nom} »`, x.zones, x.detail) : ensemble(`la répartition des surfaces « ${x.nom} »`, `${x.detail} : toute la page`); }
  const pe = lireClePaire(cle);
  if (pe) return repereDeuxDimensions(`la combinaison ${libellePaire(pe)}`, pe.a, pe.b);
  const tp = lireCleTraitementPhotos(cle);
  if (tp) return repere(`le traitement photo « ${libelleTraitementPhotos(tp)} »`, ['photos']);
  if (type === 'composant') return repereFamille(a, b ? LIBELLES_VARIANTES[a]?.[b] ?? b : undefined);
  if (type === 'structure') {
    const p = PAGES_STRUCTURE.find((x) => x.id === a);
    const nom = `la structure de la page « ${p?.nom ?? a} »`;
    const zones: Record<string, string[]> = { soins: ['bloc:competences', 'bloc:sujets'], acces: ['bloc:acces', 'contact'], cabinet: ['bloc:praticiens', 'bloc:galerie'], questions: ['bloc:faq'], actualites: ['bloc:actualites'] };
    return zones[a] ? repere(`${nom} : ${sansPrefixe(t)}`, zones[a]) : ensemble(`${nom} : ${sansPrefixe(t)}`, 'toute la page : ordre et présentation des blocs');
  }
  if (type === 'effets') return repere(`le jeu d’effets « ${jeuEffets(a)?.nom ?? a} »`, ['cartes', 'illustrations', 'boutons'], 'survol simulé en boucle, apparition');
  if (type === 'typo') {
    if (a === 'combinaison') { const [p, g] = (b ?? '').split('.'); return { ...ensemble(`la combinaison « ${pairePolices(p)?.nom ?? p} × ${gammeParId(g)?.nom ?? g} »`), detail: 'paire de polices dans cette palette' }; }
    if (a === 'police') return { ...ensemble(`la paire de polices « ${pairePolices(b)?.nom ?? b} »`), detail: pairePolices(b)?.description };
    return ensemble(`la typographie : ${(NOMS_AXES_TYPO[a as AxeTypo] ?? a).toLowerCase()} « ${sansPrefixe(libelleCleTypo(cle))} »`);
  }
  if (type === 'details') {
    if (a === 'jeu') return ensemble(`le jeu de détails « ${jeuDetails(b)?.nom ?? b} »`);
    const [element, valeur] = libelleCleDetails(cle).split(' : ');
    return ensemble(`les détails : ${element.toLowerCase()} « ${valeur ?? b} »`);
  }
  if (type === 'menu') {
    const nom = a === 'mobile' ? 'le menu sur téléphone' : a === 'rdv' ? 'le bouton de rendez-vous' : 'le menu sur ordinateur';
    const m = menuPourCle(MENU_PAR_DEFAUT, cle);
    const nomAxe = (x: AxeMenu) => (AXES_MENU[x] as readonly { id: string; nom: string }[]).find((o) => o.id === m[x])?.nom.toLowerCase() ?? m[x];
    return repere(`${nom} « ${sansPrefixe(libelleCleMenu(cle))} »`, a === 'mobile' ? ['menu-mobile'] : a === 'rdv' ? ['rdv'] : ['menu'],
      `ordinateur : ${nomAxe('ordinateur')} · téléphone : ${nomAxe('mobile')} · rendez-vous : ${nomAxe('rdv')}`);
  }
  const visuel: Record<string, string> = {
    photo: 'la photo', dessin: 'l’illustration', ligne: 'le trait continu', heros: 'le héros', materiel: 'l’illustration de matériel', biblio: 'l’illustration',
    picto: 'l’icône', animation: 'l’animation', gamme: 'la gamme de couleurs', modele: 'le modèle de site',
  };
  if (type === 'gamme') return ensemble(`la gamme de couleurs « ${gammeParId(a)?.nom ?? sansPrefixe(t)} »`);
  return ensemble(`${visuel[type] ?? 'l’élément'} « ${t} »`);
}

/** Thème complet (tuile « Thèmes complets », « Recettes complètes ») */
export const repereTheme = (nom?: string | null): Repere => ensemble(nom ? `le thème complet « ${nom} »` : 'le thème complet', 'jugez l’ensemble du site');

// ---------------------------------------------------------------------------------------------------------------
// Valeurs lisibles A / B d'un duel de compositions (« A : Revue à empattements · B : Grotesque affirmée »)
// ---------------------------------------------------------------------------------------------------------------

type CompoPartielle = Pick<CompositionRecette, 'police' | 'gamme' | 'couleur' | 'effets' | 'traitement' | 'visuels' | 'photos' | 'sections' | 'typo' | 'details' | 'menu'>;

/** Axes qui diffèrent entre deux réglages (typo, menu), « Échelle : modeste » */
function axesDifferents<A extends string>(x: Record<A, string>, y: Record<A, string>, axes: Record<A, readonly { id: string; nom: string }[]>, noms: Record<A, string>): [string, string] | null {
  const diff = (Object.keys(axes) as A[]).filter((k) => x[k] !== y[k]);
  if (!diff.length) return null;
  const v = (r: Record<A, string>) => diff.map((k) => `${noms[k]} : ${(axes[k].find((o) => o.id === r[k])?.nom ?? r[k]).toLowerCase()}`).join(', ');
  return [v(x), v(y)];
}

/** Valeurs lisibles de la dimension comparée pour A et B ; null si rien de lisible (duel libre, dimension inconnue) */
export function valeursDuel(dimension: string | null | undefined, a: CompoPartielle, b: CompoPartielle): [string, string] | null {
  if (!dimension) return null;
  const deux = (f: (x: CompoPartielle) => string): [string, string] => [f(a), f(b)];
  // Structure d'une page : les présentations (et l'ordre de l'accueil) qui diffèrent, « Plan d'accès : Notice et plan »
  if (dimension.startsWith('page:')) {
    const p = PAGES_STRUCTURE.find((x) => x.id === dimension.slice(5));
    const secs = [...(p?.ordre ? ['ordre'] : []), ...((p?.sections ?? []) as string[])];
    const val = (x: CompoPartielle, s: string) => (s === 'ordre' ? x.sections.ordre : (x.sections.variantes as Record<string, string | undefined>)[s]) ?? '';
    const diff = secs.filter((s) => val(a, s) !== val(b, s));
    if (!diff.length) return null;
    const lib = (x: CompoPartielle) => diff.map((s) => `${s === 'ordre' ? 'Ordre' : NOMS_SECTIONS_VARIABLES[s] ?? s} : ${s === 'ordre' ? val(x, s) : LIBELLES_VARIANTES[s]?.[val(x, s)] ?? (val(x, s) || 'celle du modèle')}`).join(', ');
    return [lib(a), lib(b)];
  }
  if (dimension.startsWith('composant:')) {
    const fam = dimension.slice(10);
    return deux((x) => { const v = (x.sections.variantes as Record<string, string | undefined>)[fam]; return v ? LIBELLES_VARIANTES[fam]?.[v] ?? v : 'celle du modèle'; });
  }
  if (dimension.startsWith('typo:')) {
    const axe = dimension.slice(5) as AxeTypo;
    const nom = (x: CompoPartielle) => {
      const v = habillageDe(x).typo[axe];
      const axeNom = (NOMS_AXES_TYPO[axe] ?? axe).toLowerCase();
      const val = ((AXES_TYPO[axe] as readonly { id: string; nom: string }[] | undefined)?.find((o) => o.id === v)?.nom ?? v).replace(/\s*\([^)]*\)$/, '').toLowerCase();
      return val.startsWith(axeNom) ? val : `${axeNom} ${val}`;
    };
    return deux(nom);
  }
  // Combinaison d'éléments : les deux valeurs (« Bulles rondes + Trait fin »)
  const paire = lireDimensionPaire(dimension);
  if (paire) return deux((x) => paire.map((d) => nomValeurHarmonie(d, lireDimension(x as unknown as CompositionHarmonie, d) ?? 'celle du modèle')).join(' + '));
  // Un élément du jeu de détails (densité, ombres…)
  if (dimension.startsWith('details:')) {
    const e = dimension.slice(8);
    return deux((x) => { const v = (habillageDe(x).details as Record<string, string>)[e]; return (ELEMENTS_DETAILS[e as keyof typeof ELEMENTS_DETAILS] as readonly { id: string; nom: string }[] | undefined)?.find((o) => o.id === v)?.nom ?? v; });
  }
  switch (dimension) {
    case 'police-couleurs': return deux((x) => `${pairePolices(x.police)?.nom ?? x.police} + ${x.gamme ? gammeParId(x.gamme)?.nom ?? x.gamme : `couleur ${x.couleur}`}`);
    case 'polices': return deux((x) => pairePolices(x.police)?.nom ?? x.police);
    case 'couleurs': return deux((x) => (x.gamme ? gammeParId(x.gamme)?.nom ?? x.gamme : `couleur ${x.couleur}`));
    case 'effets': return deux((x) => jeuEffets(x.effets)?.nom ?? x.effets);
    case 'traitement': return deux((x) => libelleTraitementPhotos(x.traitement));
    case 'visuels': return deux((x) => LIBELLES_STYLES[x.visuels.style]?.nom ?? x.visuels.style);
    case 'photos': return deux((x) => `${x.photos.length} photo${x.photos.length > 1 ? 's' : ''} (${x.photos[0]?.split('/').pop()?.replace(/\.\w+$/, '') ?? 'aucune'}…)`);
    case 'details': return deux((x) => libelleDetails(habillageDe(x).details));
    case 'typo': {
      const ha = habillageDe(a).typo, hb = habillageDe(b).typo;
      const d = axesDifferents(ha as Record<AxeTypo, string>, hb as Record<AxeTypo, string>, AXES_TYPO as unknown as Record<AxeTypo, readonly { id: string; nom: string }[]>, NOMS_AXES_TYPO);
      if (a.police !== b.police) { const p = deux((x) => pairePolices(x.police)?.nom ?? x.police); return d ? [`${p[0]}, ${d[0]}`, `${p[1]}, ${d[1]}`] : p; }
      return d;
    }
    case 'menu': return axesDifferents(habillageDe(a).menu as Record<AxeMenu, string>, habillageDe(b).menu as Record<AxeMenu, string>, AXES_MENU as unknown as Record<AxeMenu, readonly { id: string; nom: string }[]>, NOMS_AXES_MENU);
    default: return null;
  }
}
