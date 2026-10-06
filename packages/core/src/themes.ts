// Thèmes (« sujets ») du cabinet : la hiérarchie du site choisie par le praticien (demande de Paul, 2026-10-05).
//
// Un THÈME est un sujet que le patient comprend (« Sport », « Diabète », « Ongles »…) et qui regroupe des soins du
// catalogue. Le praticien choisit, par ordre de préférence :
//   - jusqu'à 3 thèmes PRINCIPAUX : ils ouvrent le menu, ont une carte en tête de l'accueil et leur page (hub) ;
//   - jusqu'à 3 thèmes SECONDAIRES : traités au cabinet, montrés plus discrètement (« Aussi au cabinet »), avec leur page.
// Les soins restent cochés un par un (chaque soin coché = une page) : un thème n'affiche que les soins cochés, et un
// thème sans soin coché n'a ni page ni entrée de menu (jamais de lien vers une page inexistante).
//
// Règle déontologique (Paul, 2026-10-05) : posturologie, réflexologie, biomécanique posturale = sujets à faible niveau de
// preuve, proposés seulement après validation déontologique. Le thème « posture » existe avec le statut « differe » :
// montré grisé « bientôt disponible », jamais sélectionnable tant qu'un drapeau admin ne l'active pas (`themesActives`,
// variable THEMES_ACTIVES côté admin et côté build des sites), jamais déduit d'une spécialité, jamais spécialité par défaut.
//
// Libellés (relecture « œil du patient », Paul, 2026-10-06) : les mots que le patient tape dans un moteur de recherche, sans
// jargon (ni « appuis », ni « biomécanique », ni « hyperkératose », ni « chaussage ») ; le terme du métier, s'il aide, entre
// parenthèses. Les identifiants ne changent jamais (brouillons et adresses /themes/<id>).
//
// Module pur, sans dépendance d'exécution (testé par scripts/tests.mjs : themes.test.ts).

import type { IdPicto } from './pictos';

export const STATUTS_THEME = ['actif', 'differe'] as const;
export type StatutTheme = (typeof STATUTS_THEME)[number];

export type Theme = {
  /** Identifiant stable, aussi utilisé dans l'adresse de la page (/themes/<id>) */
  id: string;
  /** Libellé patient (cartes, titre de la page) */
  libelle: string;
  /** Libellé court du menu (un mot, ≤ 10 caractères : tient sur une ligne de téléphone de 375 px) */
  court: string;
  /** Une ligne factuelle, sans promesse */
  description: string;
  /** Picto métier (pictos.ts) */
  picto: IdPicto;
  /** Soins du catalogue regroupés, du plus représentatif au moins représentatif (le premier sert de « pivot ») */
  soins: readonly string[];
  /** Spécialité liée (packs.ts) : visuels et illustrations quand le thème est n° 1 (principale) ou n° 2 (secondaire) */
  specialite: string;
  /** Modèle du parcours suggéré quand ce thème est le n° 1 (parcours.ts, UNIVERS_PARCOURS) */
  univers: 'clair-pratique' | 'simple-proche' | 'elegant-sobre' | 'technique-precis';
  /** Thèmes d'articles du flux rattachés (articles publiés sur le site, montrés sur la page du thème) ; [] = aucun (thème trop large) */
  themesFlux: readonly string[];
  /** Introduction pédagogique de la page du thème : neutre, sans superlatif ni promesse (vérifiée par le lexique) */
  intro: string;
  statut: StatutTheme;
  /** Raison du statut « differe » */
  motif?: string;
};

export const THEMES: readonly Theme[] = [
  {
    id: 'sport',
    libelle: 'Sport et course à pied',
    court: 'Sport',
    description: 'Douleurs à l’effort, chaussures et semelles adaptées à votre activité.',
    picto: 'sport-course',
    soins: ['podologie-du-sport', 'semelles-orthopediques', 'douleur-talon', 'k-taping'],
    specialite: 'sport',
    univers: 'technique-precis',
    themesFlux: ['Sport'],
    intro:
      'Une douleur qui apparaît à l’effort ou une gêne qui revient à chaque sortie mérite d’être examinée. Le pédicure-podologue observe la façon dont vos pieds se posent, votre foulée et vos chaussures, puis propose si besoin des semelles ou un strapping adaptés à votre activité.',
    statut: 'actif',
  },
  {
    id: 'diabete',
    libelle: 'Pied diabétique',
    court: 'Diabète',
    description: 'Examen des pieds, soins et prévention des plaies avec un diabète.',
    picto: 'pied-diabetique',
    soins: ['pied-diabetique', 'cors-durillons', 'ongles-epais', 'soins-a-domicile'],
    specialite: 'diabete',
    univers: 'simple-proche',
    themesFlux: ['Diabète'],
    intro:
      'Avec un diabète, la sensibilité des pieds peut diminuer et une petite blessure peut passer inaperçue. Le pédicure-podologue examine vos pieds, réalise les soins et vous indique les gestes de prévention à faire chaque jour, en lien avec votre médecin.',
    statut: 'actif',
  },
  {
    id: 'ongles',
    libelle: 'Ongles incarnés, épais ou abîmés',
    court: 'Ongles',
    description: 'Ongle incarné, ongle épais, déformé ou atteint par une mycose : soins et corrections.',
    picto: 'ongle-incarne',
    soins: ['ongle-incarne', 'orthonyxie', 'onychoplastie', 'mycose-ongles', 'ongles-epais'],
    specialite: 'soins',
    univers: 'clair-pratique',
    themesFlux: [],
    intro:
      'Ongle incarné, ongle épaissi, déformé ou abîmé : la plupart de ces gênes se prennent en charge au cabinet. Le pédicure-podologue soigne l’ongle et, selon le cas, propose une correction pour limiter la récidive.',
    statut: 'actif',
  },
  {
    id: 'enfant',
    libelle: 'Pieds de l’enfant',
    court: 'Enfants',
    description: 'Marche, croissance et chaussures, des premiers pas à l’adolescence.',
    picto: 'premiers-pas',
    soins: ['podologie-enfant', 'semelles-orthopediques', 'verrues-plantaires'],
    specialite: 'enfant',
    univers: 'clair-pratique',
    themesFlux: ['Enfants'],
    intro:
      'Le pied de l’enfant change beaucoup pendant la croissance, et bien des particularités de la marche sont habituelles selon l’âge. En cas de doute, de douleur ou de chutes fréquentes, le pédicure-podologue examine la marche et conseille sur les chaussures.',
    statut: 'actif',
  },
  {
    id: 'senior',
    libelle: 'Pieds des seniors',
    court: 'Seniors',
    description: 'Soins réguliers, chaussures adaptées et équilibre pour marcher à l’aise.',
    picto: 'senior-canne',
    soins: ['podologie-du-senior', 'ongles-epais', 'soins-a-domicile', 'cors-durillons'],
    specialite: 'soins',
    univers: 'simple-proche',
    themesFlux: ['Seniors'],
    intro:
      'Avec l’âge, la peau s’affine, les ongles s’épaississent et il devient parfois difficile d’atteindre ses pieds. Des soins réguliers et des chaussures adaptées aident à marcher à l’aise.',
    statut: 'actif',
  },
  {
    id: 'semelles',
    libelle: 'Semelles orthopédiques',
    court: 'Semelles',
    description: 'Semelles orthopédiques sur mesure, après un examen de vos pieds et de votre marche.',
    picto: 'semelle-orthopedique',
    soins: ['semelles-orthopediques', 'bilan-podologique', 'douleur-talon'],
    specialite: 'generale',
    univers: 'technique-precis',
    themesFlux: [],
    intro:
      'Des douleurs au talon, sous la voûte du pied ou aux genoux peuvent venir de la façon dont vous posez le pied en marchant. Après un examen de vos pieds et de votre marche, le pédicure-podologue peut proposer des semelles orthopédiques fabriquées sur mesure.',
    statut: 'actif',
  },
  {
    id: 'pedicurie',
    libelle: 'Soins des pieds (pédicurie)',
    court: 'Pédicurie',
    description: 'Cors, durillons, verrues, peau épaissie et soins réguliers des ongles.',
    picto: 'hallux-ongle',
    soins: ['soins-de-pedicurie', 'cors-durillons', 'verrues-plantaires'],
    specialite: 'soins',
    univers: 'simple-proche',
    themesFlux: [],
    intro:
      'Cors, durillons, verrues ou peau épaissie : ces soins des pieds se font au cabinet avec du matériel stérilisé. Le pédicure-podologue vous indique aussi les gestes utiles entre deux séances.',
    statut: 'actif',
  },
  {
    id: 'posture',
    libelle: 'Posture et équilibre',
    court: 'Posture',
    description: 'Bientôt disponible, après validation déontologique.',
    picto: 'plateforme-pression',
    soins: ['posturologie'],
    specialite: 'posture',
    univers: 'clair-pratique',
    themesFlux: [],
    intro: 'Sujet proposé après validation déontologique.',
    statut: 'differe',
    motif: 'Sujet à faible niveau de preuve (posturologie, réflexologie, biomécanique posturale) : proposé plus tard, après validation déontologique (décision de Paul, 2026-10-05).',
  },
];

export const PRINCIPAUX_MAX = 3;
export const SECONDAIRES_MAX = 3;

/** Adresse de la page d'un thème (distincte des pages de soin /soins/<slug> : aucune collision possible) */
export const cheminTheme = (id: string) => `/themes/${id}`;

export const themeParId = (id: string | null | undefined): Theme | undefined => THEMES.find((t) => t.id === id);

/** Un thème est sélectionnable s'il est actif, ou différé mais activé par le drapeau admin (`themesActives`) */
export const themeSelectionnable = (t: Pick<Theme, 'id' | 'statut'>, themesActives: readonly string[] = []) =>
  t.statut === 'actif' || themesActives.includes(t.id);

/** Thèmes proposés dans le parcours, dans l'ordre d'affichage, avec leur disponibilité (les différés restent montrés, grisés) */
export function themesProposes(themesActives: readonly string[] = []): { theme: Theme; disponible: boolean }[] {
  return THEMES.map((theme) => ({ theme, disponible: themeSelectionnable(theme, themesActives) }));
}

// ---- Priorités du praticien ----

export type Priorites = {
  /** Thèmes principaux, par ordre de préférence (0 à 3) */
  principaux: string[];
  /** Thèmes traités aussi au cabinet (0 à 3), sans doublon avec les principaux */
  secondaires: string[];
};

export const prioritesVides = (): Priorites => ({ principaux: [], secondaires: [] });

const listeIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Contrôle des priorités enregistrées : listes, identifiants connus, 3 au plus par liste, aucun doublon (dans une liste ou
 * entre les deux), aucun thème différé non activé. Renvoie la liste des erreurs (vide = valide).
 */
export function validerPriorites(p: unknown, opts: { themesActives?: readonly string[] } = {}): string[] {
  const e: string[] = [];
  const o = (p ?? {}) as Record<string, unknown>;
  if (typeof p !== 'object' || p === null) return ['Priorités : objet { principaux, secondaires } attendu.'];
  for (const cle of ['principaux', 'secondaires'] as const) {
    if (!Array.isArray(o[cle])) { e.push(`« ${cle} » : liste attendue.`); continue; }
    const ids = o[cle] as unknown[];
    const max = cle === 'principaux' ? PRINCIPAUX_MAX : SECONDAIRES_MAX;
    if (ids.length > max) e.push(`« ${cle} » : ${max} thèmes au plus.`);
    if (new Set(ids).size !== ids.length) e.push(`« ${cle} » : un thème apparaît deux fois.`);
    for (const id of ids) {
      const t = typeof id === 'string' ? themeParId(id) : undefined;
      if (!t) e.push(`Thème inconnu : ${String(id)}.`);
      else if (!themeSelectionnable(t, opts.themesActives)) e.push(`Thème « ${t.libelle} » : bientôt disponible, après validation déontologique.`);
    }
  }
  const communs = listeIds(o.principaux).filter((id) => listeIds(o.secondaires).includes(id));
  if (communs.length) e.push(`Thème à la fois principal et secondaire : ${communs.join(', ')}.`);
  return e;
}

/**
 * Normalisation structurelle (lecture d'un brouillon) : identifiants connus, sans doublon, secondaires sans les principaux,
 * 3 au plus par liste. Les thèmes différés sont gardés ici (le drapeau admin est vérifié à l'enregistrement et au build :
 * prioritesSelectionnables).
 */
export function normaliserPriorites(p: unknown): Priorites {
  const o = (p ?? {}) as Record<string, unknown>;
  const connus = (v: unknown) => [...new Set(listeIds(v))].filter((id) => themeParId(id));
  const principaux = connus(o.principaux).slice(0, PRINCIPAUX_MAX);
  const secondaires = connus(o.secondaires).filter((id) => !principaux.includes(id)).slice(0, SECONDAIRES_MAX);
  return { principaux, secondaires };
}

/** Priorités réellement utilisables : normalisées, thèmes différés non activés retirés */
export function prioritesSelectionnables(p: unknown, themesActives: readonly string[] = []): Priorites {
  const n = normaliserPriorites(p);
  const ok = (id: string) => themeSelectionnable(themeParId(id)!, themesActives);
  return { principaux: n.principaux.filter(ok), secondaires: n.secondaires.filter(ok) };
}

/** Thème d'une spécialité (packs.ts) pour la déduction ; « generale » et « posture » ne donnent aucun thème */
const THEME_DE_SPECIALITE: Record<string, string> = { sport: 'sport', diabete: 'diabete', enfant: 'enfant', soins: 'pedicurie' };

/**
 * Priorités d'un brouillon enregistré avant cette fonctionnalité (rétrocompatibilité) : thème de la spécialité principale
 * puis de la secondaire, puis les thèmes dont le soin « pivot » (premier soin du thème) est coché, dans l'ordre des soins
 * mis en avant puis des soins cochés. Seuls les thèmes actifs ayant au moins un soin coché sont retenus (sans soin, pas
 * de page) ; les 3 premiers deviennent principaux, les 3 suivants secondaires. Jamais de thème différé.
 */
export function deduirePriorites(d: { soins?: readonly string[]; theme?: { specialite?: string; specialiteSecondaire?: string; soinsEnAvant?: readonly string[] } }): Priorites {
  const soins = d.soins ?? [];
  const ordreSoins = [...new Set([...(d.theme?.soinsEnAvant ?? []).filter((s) => soins.includes(s)), ...soins])];
  const candidats = [
    THEME_DE_SPECIALITE[d.theme?.specialite ?? ''],
    THEME_DE_SPECIALITE[d.theme?.specialiteSecondaire ?? ''],
    ...ordreSoins.flatMap((s) => THEMES.filter((t) => t.soins[0] === s).map((t) => t.id)),
  ];
  const retenus = [...new Set(candidats.filter(Boolean))].filter((id) => {
    const t = themeParId(id);
    return t && t.statut === 'actif' && t.soins.some((s) => soins.includes(s));
  });
  return { principaux: retenus.slice(0, PRINCIPAUX_MAX), secondaires: retenus.slice(PRINCIPAUX_MAX, PRINCIPAUX_MAX + SECONDAIRES_MAX) };
}

// ---- Sélection au doigt (parcours, éditeur) : fonctions pures ----

/**
 * Ajoute un thème aux principaux (à la fin, s'il reste de la place) ou l'en retire. Un thème ajouté aux principaux quitte
 * les secondaires. Refusé (inchangé) : thème inconnu, différé non activé, ou 3 principaux déjà choisis.
 */
export function basculerPrincipal(p: Priorites, id: string, themesActives: readonly string[] = []): Priorites {
  if (p.principaux.includes(id)) return { ...p, principaux: p.principaux.filter((x) => x !== id) };
  const t = themeParId(id);
  if (!t || !themeSelectionnable(t, themesActives) || p.principaux.length >= PRINCIPAUX_MAX) return p;
  return { principaux: [...p.principaux, id], secondaires: p.secondaires.filter((x) => x !== id) };
}

/** Ajoute un thème aux secondaires ou l'en retire ; jamais un thème principal, jamais au-delà de 3 */
export function basculerSecondaire(p: Priorites, id: string, themesActives: readonly string[] = []): Priorites {
  if (p.secondaires.includes(id)) return { ...p, secondaires: p.secondaires.filter((x) => x !== id) };
  const t = themeParId(id);
  if (!t || !themeSelectionnable(t, themesActives) || p.principaux.includes(id) || p.secondaires.length >= SECONDAIRES_MAX) return p;
  return { ...p, secondaires: [...p.secondaires, id] };
}

/** Monte (-1) ou descend (+1) un thème principal d'un rang ; aux bords : inchangé */
export function deplacerPrincipal(p: Priorites, id: string, sens: -1 | 1): Priorites {
  const l = [...p.principaux];
  const i = l.indexOf(id);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= l.length) return p;
  [l[i], l[j]] = [l[j], l[i]];
  return { ...p, principaux: l };
}

// ---- Dérivations ----

/** Spécialités (packs.ts) des thèmes n° 1 et n° 2 ; null sans thème principal (le brouillon garde les siennes) */
export function specialitesDesPriorites(p: Priorites): { specialite: string; specialiteSecondaire: string } | null {
  const [t1, t2] = p.principaux.map((id) => themeParId(id)).filter((t): t is Theme => Boolean(t));
  if (!t1) return null;
  const secondaire = t2 && t2.specialite !== t1.specialite ? t2.specialite : '';
  return { specialite: t1.specialite, specialiteSecondaire: secondaire };
}

/** Modèle du parcours suggéré par le thème n° 1 (undefined sans thème principal) */
export const universDesPriorites = (p: Priorites) => themeParId(p.principaux[0])?.univers;

/**
 * Soins suggérés par les priorités : union ordonnée des soins des thèmes principaux (dans leur ordre) puis secondaires,
 * présents au catalogue, sans doublon. À cocher ou décocher ensuite par le praticien (jamais enregistrés sans confirmation).
 */
export function soinsDesPriorites(p: Priorites, soinsConnus?: readonly string[]): string[] {
  const tous = [...p.principaux, ...p.secondaires].flatMap((id) => themeParId(id)?.soins ?? []);
  return [...new Set(tous)].filter((s) => !soinsConnus || soinsConnus.includes(s));
}

/** Soins à mettre en avant (3 au plus) : le soin pivot de chaque thème principal, complété dans l'ordre des suggestions */
export function soinsEnAvantDesPriorites(p: Priorites, soinsCoches: readonly string[], max = 3): string[] {
  const pivots = p.principaux.map((id) => themeParId(id)?.soins.find((s) => soinsCoches.includes(s))).filter((s): s is string => Boolean(s));
  return [...new Set([...pivots, ...soinsDesPriorites(p).filter((s) => soinsCoches.includes(s))])].slice(0, max);
}

/**
 * Brouillon après un changement de priorités : priorités normalisées, spécialités principale et secondaire tirées des
 * thèmes n° 1 et n° 2 (le jeu de photos est vidé si la spécialité principale change : le serveur en tire un nouveau).
 * Soins cochés inchangés. Sans thème principal : spécialités inchangées.
 */
export function appliquerPriorites<D extends { priorites?: Priorites; theme: { specialite: string; specialiteSecondaire: string; jeuPhotos: string } }>(
  d: D,
  p: Priorites,
  themesActives: readonly string[] = [],
): D {
  const priorites = prioritesSelectionnables(p, themesActives);
  const s = specialitesDesPriorites(priorites);
  if (!s) return { ...d, priorites };
  const jeuPhotos = s.specialite === d.theme.specialite ? d.theme.jeuPhotos : '';
  return { ...d, priorites, theme: { ...d.theme, specialite: s.specialite, specialiteSecondaire: s.specialiteSecondaire, jeuPhotos } };
}

// ---- Navigation calculée (tous les gabarits) ----

export type CleNavigation = 'accueil' | 'theme' | 'soins' | 'cabinet' | 'infos' | 'actualites';
export type LienNavigation = { cle: CleNavigation; href: string; libelle: string; theme?: string };
export type ThemeDuSite = { theme: Theme; href: string; soins: string[] };
export type GroupeSoins = { titre: string; href?: string; theme?: string; soins: string[] };

export type Navigation = {
  /** Thèmes principaux qui ont une page (au moins un soin coché), dans l'ordre de préférence */
  principaux: ThemeDuSite[];
  /** Thèmes secondaires qui ont une page */
  secondaires: ThemeDuSite[];
  /** Menu principal (ordinateur) : thèmes principaux, Soins, Le cabinet, Infos pratiques ; ni Accueil (logo) ni RDV (bouton) */
  menu: LienNavigation[];
  /** Menu sur téléphone : 3 entrées au plus (+ Accueil par le logo + « Rendez-vous » en bouton = 5 au plus) */
  menuMobile: LienNavigation[];
  /** Pied de page : Accueil, toutes les entrées du menu, Actualités */
  pied: LienNavigation[];
  /** Page « Soins » : chaque soin du site une seule fois, groupé par thème principal, secondaire, puis « Autres soins » */
  groupesSoins: GroupeSoins[];
  /** Adresses des pages de thème à construire (principaux puis secondaires) */
  pages: string[];
};

/** Nombre d'entrées texte du menu sur téléphone (avec l'Accueil implicite du logo et le bouton RDV : 5 au plus) */
export const MENU_MOBILE_MAX = 3;

/**
 * Navigation d'un site, calculée une fois et utilisée par tous les gabarits (classique, tableau, village, revue).
 * Règles (docs : packages/core/src/themes.ts, testées) :
 * 1. Un thème n'entre dans la navigation que s'il est sélectionnable (différé activé ou actif) et a au moins un soin coché.
 * 2. Ordinateur : thèmes principaux (libellé court, ordre de préférence), puis « Soins », « Le cabinet », « Infos pratiques »
 *    (6 entrées au plus) ; Accueil = logo, Rendez-vous = bouton.
 * 3. Téléphone (≤ 5 entrées avec le logo et le bouton RDV, soit 3 liens) : thème n° 1, « Soins », « Infos pratiques ».
 *    Repli : les thèmes n° 2 et 3 passent en tête de la page « Soins » (rangée « Par sujet » et premiers groupes) ;
 *    « Le cabinet » passe au pied de page (et reste sur l'accueil). Sans thème : Soins, Le cabinet, Infos pratiques.
 * 4. Page « Soins » : chaque soin une seule fois, dans le premier groupe qui le contient (thèmes principaux, puis
 *    secondaires, puis « Autres soins ») ; un groupe vide n'est pas montré.
 * 5. Pied de page : Accueil + menu complet + Actualités (s'il y a des articles).
 */
export function construireNavigation(
  entree: { priorites?: Priorites | null },
  soinsDuSite: readonly { slug: string }[],
  opts: { actualites?: boolean; themesActives?: readonly string[] } = {},
): Navigation {
  const slugs = soinsDuSite.map((s) => s.slug);
  const p = prioritesSelectionnables(entree.priorites ?? prioritesVides(), opts.themesActives);
  const duSite = (id: string): ThemeDuSite | null => {
    const theme = themeParId(id)!;
    const soins = theme.soins.filter((s) => slugs.includes(s));
    return soins.length ? { theme, href: cheminTheme(id), soins } : null;
  };
  const principaux = p.principaux.map(duSite).filter((t): t is ThemeDuSite => Boolean(t));
  const secondaires = p.secondaires.map(duSite).filter((t): t is ThemeDuSite => Boolean(t));

  const lienTheme = (t: ThemeDuSite): LienNavigation => ({ cle: 'theme', href: t.href, libelle: t.theme.court, theme: t.theme.id });
  const soins: LienNavigation = { cle: 'soins', href: '/soins', libelle: 'Soins' };
  const cabinet: LienNavigation = { cle: 'cabinet', href: '/le-cabinet', libelle: 'Le cabinet' };
  const infos: LienNavigation = { cle: 'infos', href: '/acces', libelle: 'Infos pratiques' };

  const menu = [...principaux.map(lienTheme), soins, cabinet, infos];
  const menuMobile = (principaux.length ? [lienTheme(principaux[0]), soins, infos] : [soins, cabinet, infos]).slice(0, MENU_MOBILE_MAX);
  const pied = [{ cle: 'accueil' as const, href: '/', libelle: 'Accueil' }, ...menu, ...(opts.actualites ? [{ cle: 'actualites' as const, href: '/actualites', libelle: 'Actualités' }] : [])];

  const vus = new Set<string>();
  const prendre = (l: readonly string[]) => l.filter((s) => !vus.has(s) && (vus.add(s), true));
  const groupesSoins: GroupeSoins[] = [
    ...[...principaux, ...secondaires].map((t) => ({ titre: t.theme.libelle, href: t.href, theme: t.theme.id, soins: prendre(t.soins) })),
    { titre: principaux.length || secondaires.length ? 'Autres soins' : 'Soins', soins: prendre(slugs) },
  ].filter((g) => g.soins.length > 0);

  return { principaux, secondaires, menu, menuMobile, pied, groupesSoins, pages: [...principaux, ...secondaires].map((t) => t.href) };
}
