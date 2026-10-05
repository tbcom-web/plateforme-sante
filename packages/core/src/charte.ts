// Charte graphique de la plateforme : couche 1, les INVARIANTS de marque, identiques pour toutes les
// professions de santé. Source unique des valeurs visuelles partagées : neutres et fonds, quadrillage
// « plan d'architecte », graisses de trait et pointillés, trame de points, rôles typographiques,
// mouvement. Aucun composant ne code ces valeurs en dur : il lit ces constantes (scripts, calculs au build)
// ou les variables CSS produites par `feuilleCharte()` (styles), injectées une fois par page.
//
// Les quatre couches s'emboîtent ainsi (voir docs/charte-graphique.md) :
//   1. charte (ce fichier)            → invariants de marque ;
//   2. univers métier (univers.ts)    → motif signature et palette de données de chaque profession ;
//   3. gammes de couleurs (gammes.ts) → accent, fonds, plan et signal du cabinet ;
//   4. modèles (modeles.ts)           → mise en page, polices, arrondis (fiche JSON).

import { rvb } from './couleurs';
import { UNIVERS, universMetier, paletteDonnees } from './univers';

export { rvb, hex, interpoler, contraste, contrasteAA } from './couleurs';
// Palette de données de la podologie, réexportée pour les scripts navigateur (import « @plateforme/core/charte »)
export { PRESSION, ARRETS_PRESSION, couleurPression } from './univers';
/** Couleur #rrggbb avec transparence, pour les canvas : « rgb(r g b / a) » */
export const transparence = (h: string, a: number) => `rgb(${rvb(h).join(' ')} / ${a})`;
/** Canaux « r g b » pour composer une transparence en CSS : rgb(var(--encre-rgb) / 0.1) */
const canaux = (h: string) => rvb(h).join(' ');

// ———————————————————————————————————————————————————— Couleurs

/** Neutres de la marque : texte, filets, surfaces claires et sombres. */
export const NEUTRES = {
  /** Encre du texte et des dessins sur fond clair (vert-de-gris très foncé) */
  encre: '#102224',
  encreDouce: '#4d5d5e',
  /** Texte secondaire (jours fermés, numéros, fil d'Ariane) : contraste AA (≥ 4,5:1) sur blanc et sur les fonds doux */
  encrePale: '#5a6a6b',
  /** Filets et bordures sur fond clair */
  ligne: '#e3e9e8',
  blanc: '#ffffff',
  /** Fond de secours des surfaces claires (sections alternées sans gamme ni modèle) */
  douxDefaut: '#f3f7f6',
  /** Papier : traits et textes clairs sur fond « plan » */
  papier: '#f2f6ff',
  /** Accent « encre » (modèles sobres) et sa version profonde */
  encreNuit: '#0b1c24',
  encreNuitDouce: '#1c3742',
  /** Nuit : base des fonds sombres des animations et des voiles sur photo */
  nuit: '#071214',
  nuitHaut: '#10262a',
  /** Pastille « réservation disponible » */
  disponible: '#27a36b',
} as const;

/**
 * Teintes anatomiques des illustrations de la bibliothèque partagée (bibliotheque/, éléments repris d'ÉcranZen), registre
 * pédagogique : peau (claire, moyenne, ombre), ongle, os et tendon. Valeurs du thème « zen-doux » d'ÉcranZen, validées par
 * Paul sur les atomes du studio (peau-1, peau-2, peau-ombre, ongle, os, tendon) : mêmes rendus sur les sites et en salle d'attente.
 * Jamais posées sur un fond sombre en os clairs (lecture « radio ») : les os restent au trait, sur la peau ou un voile clair.
 */
export const ANATOMIE = {
  peau: '#E9B793',
  peauClair: '#F6D7C3',
  peauOmbre: '#D9A383',
  ongle: '#F9E4DC',
  os: '#F5EFE3',
  tendon: '#E6D3B3',
} as const;

/** Fonds « plan d'architecte » par défaut (cobalt) et couleur des lectures de données sur fond sombre */
export const PLAN = { fond: '#123c8c', profond: '#0c2c6b', signal: '#6ff2c2' } as const;

/** Quadrillage : pas en px et opacités du trait (sur fond clair : encre ; sur fond sombre : blanc) */
export const QUADRILLAGE = {
  /** Maille fine (sections, pied de page, plan) */
  pas: 24,
  /** Maille majeure (tous les 5 pas) */
  pasMajeur: 120,
  /** Grille serrée derrière les dessins techniques */
  pasFin: 16,
  clair: 0.07,
  clairFin: 0.035,
  sombre: 0.07,
  sombreFin: 0.035,
} as const;

/** Filets éditoriaux (px) : fort = filet d'ouverture sous un bandeau ou en tête de liste, fin = séparation */
export const FILETS = { fort: 1.5, fin: 1 } as const;

/** Transparences du texte et des filets sur fond sombre (photo, plan, nuit) */
export const SUR_SOMBRE = { doux: 0.8, pale: 0.55, filet: 0.22, verre: 0.14 } as const;

// ———————————————————————————————————————————————————— Traits

/**
 * Graisses de trait, en unités du dessin (≈ px à l'échelle nominale) :
 * filet = grilles et hachures, fin = cotes et repères, normal = contour principal,
 * fort = trait anatomique et forces, marque = segments épais (squelette du coureur, crampons).
 */
export const TRAIT = { filet: 0.6, fin: 1, normal: 1.5, fort: 2.2, marque: 3.2 } as const;

/**
 * Pictogrammes métier (pictos.ts) : grille de `grille` unités, UN seul trait par picto, en unités de la grille (le picto se dessine
 * à 24, 32 ou 48 px) : `trait` 3 = 1,5 px à 24 px (défaut), `traitFort` 4 = 2 px à 24 px (variante soumise à l'arbitrage).
 */
export const PICTO = { grille: 48, trait: 3, traitFort: 4 } as const;

/**
 * Registre « ligne » (dessins au trait continu, ligne.ts) : une seule épaisseur par dessin, prise dans TRAIT (unités LOCALES du
 * repère 240 × 180, jamais vector-effect : piège WebKit avec pathLength) ; boucles de raccord (rayon) et queues de début et de
 * fin (longueur), en unités du repère ; `final` : le trait finit par une boucle. Variantes soumises à l'arbitrage de Paul.
 */
export const LIGNE = {
  epaisseur: { fine: TRAIT.normal, moyenne: TRAIT.fort },
  boucles: {
    marquees: { rayon: 5.2, queue: 16, final: true },
    discretes: { rayon: 2.6, queue: 9, final: false },
  },
  defaut: { epaisseur: 'fine', boucles: 'discretes' },
} as const;
export type EpaisseurLigne = keyof typeof LIGNE.epaisseur;
export type BouclesLigne = keyof typeof LIGNE.boucles;

/**
 * Pointillés et tirets (dasharray). Le contour « relevé de podoscope » est une suite de points ronds
 * (longueur 0, bouts ronds) : `point` = épaisseur, `ecart` = distance entre deux points.
 */
export const POINTILLE = {
  contour: { point: 2.6, ecart: 5.5, opacite: 0.8 },
  /** Contour autour d'une trame de points (il s'efface derrière la donnée) */
  leger: { point: 1.6, ecart: 5.5, opacite: 0.4 },
  tiret: '4 5',
  tiretCourt: '2 3',
} as const;

// ———————————————————————————————————————————————————— Trame de points

/**
 * Trame hexagonale de points (relevé de baropodométrie). `pas` en unités du repère du pied (92 × 222) ;
 * diamètre d'un point = pas × (min + (max − min) × valeur). `niveaux` : regroupement des points par niveau.
 * `motif` : trame décorative CSS des sections (px).
 */
export const TRAME = {
  pas: 6.4,
  pasEnfant: 9,
  diametre: { min: 0.3, max: 0.8 },
  niveaux: 9,
  motif: { pas: 16, point: 1.2, opacite: 0.13 },
} as const;

// ———————————————————————————————————————————————————— Typographie

/** Piles de polices des titres (au choix du modèle) et du texte. */
export const POLICES = {
  inter: "'Inter Variable', system-ui, sans-serif",
  manrope: "'Manrope Variable', system-ui, sans-serif",
  fraunces: "'Fraunces Variable', Georgia, serif",
  instrument: "'Instrument Serif', Georgia, serif",
  schibsted: "'Schibsted Grotesk Variable', 'Helvetica Neue', Arial, sans-serif",
  /** Ronde et très lisible (modèle Simple et pédagogique) */
  nunito: "'Nunito Variable', system-ui, sans-serif",
} as const;
/** Police des données (lectures, cotes, numéros, légendes) : toujours la même, quel que soit le modèle */
export const POLICE_MONO = "'JetBrains Mono Variable', ui-monospace, 'SFMono-Regular', Consolas, monospace";

/** Rôles : titres = police du modèle ; texte = police de texte du modèle ; données = mono. */
export const TYPO = {
  roles: { titres: 'var(--police-titres)', texte: 'var(--police-texte)', donnees: 'var(--police-mono)' },
  echelle: {
    affiche: 'clamp(2.8rem, 7.4vw, 6.6rem)',
    h1: 'clamp(2.4rem, 5.6vw, 4.6rem)',
    h2: 'clamp(1.9rem, 3.8vw, 3.1rem)',
    h3: '1.2rem',
    chapo: '1.12rem',
    texte: '1.0625rem',
    note: '0.86rem',
    /** Lectures mono (sur-titres, numéros, légendes) : 12,8 px, jamais moins de 12 px pour rester lisibles */
    donnees: '0.8rem',
    donneesPetit: '0.75rem',
  },
  /** Taille des annotations mono dans les dessins SVG (unités du dessin 240 × 180) */
  donneesDessin: 7.5,
  /** Interlettrage des données en capitales */
  interlettrage: '0.08em',
} as const;

// ———————————————————————————————————————————————————— Espacements et téléphone

/**
 * Rythme vertical, du téléphone (375 px) à l'ordinateur (1 440 px) : `clamp(téléphone, fluide, ordinateur)`.
 * La borne « ordinateur » reprend les valeurs historiques (rien ne change au-delà de 900 px) ; la borne
 * « téléphone » donne de l'air aux petits écrans. `section` : entre deux sections ; `bloc` : entre l'en-tête
 * d'une section et son contenu, ou entre deux blocs ; `element` : entre deux éléments d'une liste ou d'une carte ;
 * `ligne` : marge intérieure verticale d'une ligne de liste ou de tableau.
 */
export const ESPACES = {
  section: 'clamp(72px, 9vw, 120px)',
  bloc: 'clamp(36px, 4vw, 56px)',
  element: 'clamp(20px, 2.4vw, 28px)',
  ligne: '12px',
} as const;

/**
 * Téléphone (jusqu'à `largeur` px, même seuil que les grilles à 760 px) : minimums de lisibilité et de confort.
 * `texte` : corps des textes secondaires (résumés, infos pratiques, fiches) ; `donnees` : lectures mono et
 * légendes (13 px) ; `cible` : zone tactile minimale d'un lien ou d'un bouton isolé (WCAG 2.5.5).
 */
export const TELEPHONE = {
  largeur: 759,
  texte: '1rem',
  donnees: '0.8125rem',
  cible: '44px',
} as const;

// ———————————————————————————————————————————————————— Mouvement

/** Durées (ms) : transitions ponctuelles */
export const DUREES = { instant: 150, court: 300, moyen: 600, long: 900, trace: 1400, decalage: 80, ligne: 2600 } as const;
/** Cycles (ms) des animations continues */
export const CYCLES = {
  /** Pulsation d'un point d'intérêt, onde, rebond, déroulé d'un pas au podoscope */
  pouls: 2400,
  /** Trajet du centre de pression sur un pied */
  pas: 3200,
  /** Relevé complet : ligne de scan, courbes de niveau, suite d'empreintes */
  releve: 5600,
  /** Photo du diaporama d'accueil */
  diapo: 7000,
  /** Cycle de foulée du coureur (2 pas) : cadence ≈ 167 pas/min */
  foulee: 720,
} as const;
/** Courbes d'accélération */
export const COURBES = {
  /** Sortie douce : apparitions, survols */
  sortie: 'cubic-bezier(.2,.7,.2,1)',
  /** Entrée-sortie : allers-retours, balayages */
  entreeSortie: 'cubic-bezier(.65,0,.35,1)',
  /** Tracé d'un trait */
  trace: 'cubic-bezier(.4,0,.2,1)',
  /** Léger rebond : points qui s'allument */
  rebond: 'cubic-bezier(.3,1.4,.5,1)',
} as const;

// ———————————————————————————————————————————————————— Logo

/**
 * Logo du site (logos.ts) : la marque est dessinée dans un repère carré de `cadre` unités, avec les traits,
 * pointillés et la trame de la charte. Trois niveaux de détail selon la taille affichée : jusqu'à `compact` px
 * (favicon), version pleine et épaissie ; jusqu'à `moyen` px (en-tête, pied de page), version allégée
 * (points plus gros, sans annotations) ; au-delà, version détaillée. La trame des marques est plus lâche que celle du relevé (illisible à 48 px) ; `donnees` : points de taille égale du relevé « données », `crantage` : points du talon de la semelle de course ;
 * pas = TRAME.pas × facteur. `marge` : marge intérieure de la tuile, au trait, et marge verticale des marques
 * en forme de pied, étroites (unités). `rayonTuile` : arrondi de la
 * tuile = arrondi du modèle × rapport, plafonné à `rayonMax` (unités). `opaciteSecondaire` : traits
 * d'accompagnement (contour derrière une trame, axes). `tailles` : côté de la marque affichée (px).
 * `nom` : taille du nom du cabinet (la police et la graisse sont celles des titres du modèle).
 * Graisses des marques (unités du cadre ; 1 unité ≈ 0,9 px en en-tête, 0,33 px en favicon 16 px), plus fines
 * que les traits des dessins (TRAIT) car la marque est vue petite et sur tuile pleine : `trait.compact` et
 * `compactFin` pour le favicon, `moyen` pour l'en-tête, `normal` / `epais` (titres gras) pour la version
 * détaillée, `fin` pour les cotes, rayons et polygones ; `pointille` : épaisseur des points du contour
 * « podoscope » ; `appui` : rayon des points d'appui (talon, têtes métatarsiennes) ; `trame.chaussure*` :
 * pas de la trame de l'empeigne ; `profil` : aplat des os et fragments de l'épure (pied articulé) ;
 * `rubans` : échelle, inclinaison, teinte adoucie et épaississement par niveau de la marque « Rubans ».
 */
export const LOGO = {
  cadre: 48,
  compact: 24,
  moyen: 56,
  trait: { compact: 3, compactFin: 2, moyen: 1.7, normal: 1.1, epais: 1.4, fin: 0.7 },
  pointille: { moyen: 2.3, normal: 1.6, epais: 2 },
  appui: { grand: 2.6, moyen: 2, petit: 1.4 },
  trame: { facteur: 2.4, facteurMoyen: 3.4, donnees: 1.8, donneesMoyen: 2.8, crantage: 1.9, chaussure: 0.54, chaussureMoyen: 0.85 },
  marge: { tuile: 7, trait: 2, pied: 4 },
  rayonTuile: 0.6,
  rayonMax: 24,
  opaciteSecondaire: 0.45,
  profil: { aplat: 0.28, ombre: 0.55, trait: 0.8, traitEpais: 1 },
  rubans: { echelle: 0.92, inclinaison: 38, adouci: 0.55, moyen: 1.25, compact: 1.6 },
  tailles: { horizontale: 42, empilee: 40, monogramme: 44, pied: 48 },
  nom: { taille: '1.04rem', tailleSerif: '1.32rem', tailleEmpilee: '0.98rem' },
  /**
   * Options typographiques du nom et de la ligne « métier · ville » (proposition, non activée : la valeur
   * par défaut reste `courante`). Police inchangée : celle des titres du modèle pour le nom, la mono des
   * données pour la ligne. `capitales` : nom en capitales grasses serrées, ligne en capitales très espacées ;
   * `minuscules` : nom courant, ligne en minuscules très espacées.
   */
  typo: {
    courante: { nom: { casse: 'none', interlettrage: '-0.02em' }, ligne: { casse: 'uppercase', interlettrage: 'var(--interlettrage-donnees)' } },
    capitales: { nom: { casse: 'uppercase', interlettrage: '0.01em' }, ligne: { casse: 'uppercase', interlettrage: '0.28em' } },
    minuscules: { nom: { casse: 'none', interlettrage: '-0.02em' }, ligne: { casse: 'lowercase', interlettrage: '0.3em' } },
  },
} as const;

/** Mention obligatoire des représentations graphiques de données */
export const MENTION_ILLUSTRATIVE = 'Représentation illustrative, sans valeur de mesure';

// ———————————————————————————————————————————————————— Variables CSS

const tiret = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Variables CSS de la charte (et de la palette de données de l'univers métier), à injecter une seule fois
 * par page, sur :root. Les jetons du modèle et de la gamme (style de <html>) viennent ensuite les compléter.
 */
export function variablesCharte(metier: string = UNIVERS.podologie.id): Record<string, string> {
  const u = universMetier(metier);
  const v: Record<string, string> = {};
  for (const [k, c] of Object.entries(NEUTRES)) v[`--${tiret(k)}`] = c;
  v['--encre-rgb'] = canaux(NEUTRES.encre);
  v['--nuit-rgb'] = canaux(NEUTRES.nuit);
  v['--blanc-rgb'] = canaux(NEUTRES.blanc);
  v['--papier-rgb'] = canaux(NEUTRES.papier);
  // Teintes anatomiques de la bibliothèque (--peau, --peau-clair, --peau-ombre, --ongle, --os, --tendon)
  for (const [k, c] of Object.entries(ANATOMIE)) v[`--${tiret(k)}`] = c;
  v['--plan'] = PLAN.fond;
  v['--plan-profond'] = PLAN.profond;
  v['--signal'] = PLAN.signal;
  // Palette de données de l'univers (5 niveaux) ; alias --pression-n pour la podologie et les composants de pression.
  const donnees = paletteDonnees(u);
  donnees.couleurs.forEach((c, k) => { v[`--donnee-${k + 1}`] = c; v[`--pression-${k + 1}`] = c; });
  v['--degrade-donnees'] = donnees.couleurs.map((_, k) => `var(--donnee-${k + 1}) ${Math.round(donnees.arrets[k] * 100)}%`).join(', ');
  // Texte et filets sur fond sombre
  for (const [k, a] of Object.entries(SUR_SOMBRE)) v[`--sur-sombre-${k}`] = `rgb(var(--blanc-rgb) / ${a})`;
  v['--sur-sombre'] = 'var(--blanc)';
  // Filets éditoriaux
  v['--filet-fort'] = `${FILETS.fort}px`;
  v['--filet'] = `${FILETS.fin}px`;
  // Quadrillage
  v['--quadrillage-pas'] = `${QUADRILLAGE.pas}px`;
  v['--quadrillage-pas-majeur'] = `${QUADRILLAGE.pasMajeur}px`;
  v['--quadrillage-pas-fin'] = `${QUADRILLAGE.pasFin}px`;
  v['--quadrillage-clair'] = `rgb(var(--encre-rgb) / ${QUADRILLAGE.clair})`;
  v['--quadrillage-clair-fin'] = `rgb(var(--encre-rgb) / ${QUADRILLAGE.clairFin})`;
  v['--quadrillage-sombre'] = `rgb(var(--blanc-rgb) / ${QUADRILLAGE.sombre})`;
  v['--quadrillage-sombre-fin'] = `rgb(var(--blanc-rgb) / ${QUADRILLAGE.sombreFin})`;
  // Fonds sombres partagés : animations (nuit) et accueils animés (nuit teintée de la couleur du cabinet)
  v['--fond-nuit'] = 'radial-gradient(ellipse at 50% 45%, var(--nuit-haut) 0%, var(--nuit) 75%)';
  v['--fond-anime'] = 'radial-gradient(ellipse at 65% 45%, color-mix(in srgb, var(--accent-fonce, var(--nuit-haut)) 45%, var(--nuit)) 0%, var(--nuit) 78%)';
  // Ombres
  v['--ombre'] = '0 24px 60px -30px rgb(var(--encre-rgb) / 0.35)';
  v['--ombre-profonde'] = '0 40px 80px -40px rgb(var(--encre-rgb) / 0.45), 0 2px 6px -2px rgb(var(--encre-rgb) / 0.08)';
  // Traits et pointillés
  for (const [k, w] of Object.entries(TRAIT)) v[`--trait-${k}`] = String(w);
  v['--pointille'] = `0 ${POINTILLE.contour.ecart}`;
  v['--pointille-point'] = String(POINTILLE.contour.point);
  v['--pointille-opacite'] = String(POINTILLE.contour.opacite);
  v['--pointille-leger-point'] = String(POINTILLE.leger.point);
  v['--pointille-leger-opacite'] = String(POINTILLE.leger.opacite);
  v['--tiret'] = POINTILLE.tiret;
  v['--tiret-court'] = POINTILLE.tiretCourt;
  // Trame décorative
  v['--trame-pas'] = `${TRAME.motif.pas}px`;
  v['--trame-point'] = `${TRAME.motif.point}px`;
  v['--trame-couleur'] = `rgb(var(--encre-rgb) / ${TRAME.motif.opacite})`;
  // Typographie
  v['--police-mono'] = POLICE_MONO;
  for (const [k, t] of Object.entries(TYPO.echelle)) v[`--taille-${tiret(k)}`] = t;
  v['--taille-donnees-dessin'] = `${TYPO.donneesDessin}px`;
  v['--interlettrage-donnees'] = TYPO.interlettrage;
  // Mouvement
  for (const [k, e] of Object.entries(ESPACES)) v[`--espace-${k}`] = e;
  v['--taille-texte-telephone'] = TELEPHONE.texte;
  v['--cible-tactile'] = TELEPHONE.cible;
  for (const [k, d] of Object.entries(DUREES)) v[`--duree-${k}`] = `${d}ms`;
  for (const [k, d] of Object.entries(CYCLES)) v[`--cycle-${k}`] = `${d}ms`;
  for (const [k, c] of Object.entries(COURBES)) v[`--courbe-${tiret(k)}`] = c;
  return v;
}

/**
 * Surfaces partagées de la charte : « plan d'architecte » (fond sombre quadrillé, traits papier, lectures
 * au signal) et « grille » (quadrillage fin clair derrière les dessins techniques).
 */
export const SURFACES_CSS = `.surface-plan { --dessin-trait: var(--papier); --dessin-accent: var(--signal); --dessin-os: var(--signal); --dessin-os-opacite: 0.4; --dessin-os-aplat: 0; --dessin-os-secondaires: none; --dessin-fond: color-mix(in srgb, var(--plan), var(--nuit) 30%); color: var(--papier); background-color: var(--plan); background-image: linear-gradient(var(--quadrillage-sombre) var(--filet), transparent var(--filet)), linear-gradient(90deg, var(--quadrillage-sombre) var(--filet), transparent var(--filet)), linear-gradient(var(--quadrillage-sombre-fin) var(--filet), transparent var(--filet)), linear-gradient(90deg, var(--quadrillage-sombre-fin) var(--filet), transparent var(--filet)), radial-gradient(120% 90% at 72% 30%, color-mix(in srgb, var(--plan), var(--blanc) 14%) 0%, var(--plan) 72%); background-size: var(--quadrillage-pas-majeur) var(--quadrillage-pas-majeur), var(--quadrillage-pas-majeur) var(--quadrillage-pas-majeur), var(--quadrillage-pas) var(--quadrillage-pas), var(--quadrillage-pas) var(--quadrillage-pas), 100% 100%; } .surface-grille { background-color: color-mix(in srgb, var(--fond), var(--encre) 2%); background-image: linear-gradient(var(--quadrillage-clair-fin) var(--filet), transparent var(--filet)), linear-gradient(90deg, var(--quadrillage-clair-fin) var(--filet), transparent var(--filet)); background-size: var(--quadrillage-pas-fin) var(--quadrillage-pas-fin); background-position: center; }`;

/** Feuille de style de la charte : `:root { … }` et surfaces partagées, à poser une fois dans <head>. */
export const feuilleCharte = (metier?: string) =>
  `:root{${Object.entries(variablesCharte(metier)).map(([k, v]) => `${k}:${v}`).join(';')}}${TELEPHONE_CSS}${SURFACES_CSS}`;

/** Téléphone : lectures mono et légendes relevées à 13 px (jamais moins), le reste de l'échelle est inchangé. */
export const TELEPHONE_CSS = `@media (max-width:${TELEPHONE.largeur}px){:root{--taille-donnees:${TELEPHONE.donnees};--taille-donnees-petit:${TELEPHONE.donnees}}}`;
