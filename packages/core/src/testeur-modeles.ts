// TESTEUR DE MODÈLES (décision de Paul du 2026-10-09 : « Ajouter un agent de test sur le modèle final pour vérifier que tout
// marche. Limiter au max l'humain. »). Docs : docs/testeur-modeles.md.
//
// Le testeur passe sur les FINALISTES du tournoi (jamais sur la présélection ni pendant le tournoi) :
//   finaliste → CHECK AGENT (mode « check » : rapport complet + tickets) → avis humain → retouche Claude
//   → RE-CHECK AGENT (mode « recheck » : comparaison à la version précédente) → revalidation humaine → prêt pour validation → publié.
// Deux moitiés produisent le MÊME format (chaine-modeles-format.ts, contrat avec la chaîne) :
// - le script `npm run tester:modele` (apps/sites/scripts/tester-modele.mjs) : contrôles mesurés (débordement, contrastes réels,
//   cibles tactiles, liens, menu mobile, images, polices, axe-core, SEO, agents IA, WebKit, performance, console, animations) ;
// - l'agent Claude `.claude/agents/testeur-modeles.md` : la vérification VISUELLE (goût, anatomie, cadrage, alignements).
// Ce module rassemble les parties PURES : seuils, tickets, verdicts, contrôles calculables hors navigateur (contraste sur pixels,
// chevauchements, cibles tactiles, liens internes, SEO d'une page, performance), comparaison check / re-check et règle de validation.
// Module pur, sans dépendance au navigateur ni à Supabase.

import {
  verdictGlobal, normaliserResultatTest, normaliserTicket, LARGEURS_MODELE,
  type AppareilModele, type ControleModele, type GraviteTicket, type PageModele, type ResultatTestModele, type TicketModele, type VerdictTest, type ZoneTicket,
} from './chaine-modeles-format';
import type { Rvb } from './couleurs';
import type { StatutModele } from './chaine-modeles';
import { profilsDePratique, activitesReconnues, type ProfilPratique } from './profils';
import { pratiqueDe } from './pratiques';
import type { PhotoBanque } from './recettes';

// ---------------------------------------------------------------------------------------------------------------
// Seuils (documentés dans docs/testeur-modeles.md)
// ---------------------------------------------------------------------------------------------------------------

export const SEUILS_TEST_MODELE = {
  /** Largeurs contrôlées (px CSS) ; 360-375 = téléphone, 768-1024 = tablette (rangée « ordinateur » du format commun), 1440 = ordinateur */
  largeurs: [360, 375, 768, 1024, 1440],
  /** WCAG 2.x AA : texte courant 4,5:1 ; grand texte (≥ 24 px, ou ≥ 18,66 px gras) 3:1 */
  contrasteTexte: 4.5,
  contrasteGrandTexte: 3,
  /** Cibles tactiles (téléphone) : 44 px recommandé (WCAG 2.5.5 AAA / Apple) ; < 24 px = échec WCAG 2.5.8 AA */
  cibleTactile: 44,
  cibleTactileMin: 24,
  /** Chevauchement de deux blocs de texte / interactifs : part de la plus petite boîte recouverte */
  chevauchement: 0.25,
  /** Performance mobile (4G lente simulée : 150 ms RTT, 1,6 Mb/s, processeur ×4) */
  lcpMs: 2500,
  lcpMsBloquant: 4000,
  cls: 0.05,
  clsBloquant: 0.25,
  tbtMs: 200,
  tbtMsBloquant: 600,
  /** Poids transféré d'une page (compressé) */
  poidsPage: 1_000_000,
  poidsPageBloquant: 2_500_000,
  /** Poids d'une image (fichier) */
  poidsImage: 300_000,
  /** SEO : longueur du title et de la description */
  titreMax: 65,
  descriptionMin: 70,
  descriptionMax: 170,
  /** Agents IA (controle:agents) : score sur 100 */
  scoreAgents: 90,
  /** Durée visée d'un passage complet du script (3 jeux de données) */
  dureeMaxMs: 10 * 60 * 1000,
  /** Re-test des modèles publiés */
  retestJours: 7,
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Contrôles du testeur
// ---------------------------------------------------------------------------------------------------------------

export const CATEGORIES_TICKET = ['technique', 'gout'] as const;
export type CategorieTicket = (typeof CATEGORIES_TICKET)[number];

/** Contrôles du testeur : identifiant stable (champ `controle` des tickets), libellé, étiquette de ticket, catégorie */
export const CONTROLES_TESTEUR = [
  { id: 'construction', libelle: 'Construction du site (jeux de démonstration)', etiquette: 'technique:rendu', categorie: 'technique' },
  { id: 'debordement', libelle: 'Débordement horizontal', etiquette: 'technique:debordement-mobile', categorie: 'technique' },
  { id: 'mots-coupes', libelle: 'Mots composés et métiers coupés', etiquette: 'technique:mot-coupe', categorie: 'technique' },
  { id: 'chevauchements', libelle: 'Éléments qui se recouvrent', etiquette: 'technique:rendu', categorie: 'technique' },
  { id: 'contraste', libelle: 'Contrastes AA mesurés sur le rendu', etiquette: 'technique:contraste', categorie: 'technique' },
  { id: 'cibles-tactiles', libelle: 'Cibles tactiles ≥ 44 px', etiquette: 'technique:accessibilite', categorie: 'technique' },
  { id: 'liens', libelle: 'Liens internes et ancres', etiquette: 'technique:lien-casse', categorie: 'technique' },
  { id: 'menu-mobile', libelle: 'Menu mobile (ouvrir, fermer, Échap, focus)', etiquette: 'technique:accessibilite', categorie: 'technique' },
  { id: 'barre-actions', libelle: 'Barre d’actions mobile (appel, itinéraire, RDV)', etiquette: 'technique:rendu', categorie: 'technique' },
  { id: 'formulaires', libelle: 'Formulaires (étiquettes, envoi)', etiquette: 'technique:accessibilite', categorie: 'technique' },
  { id: 'images', libelle: 'Images (chargées, dimensions, alt, poids, aucune démo ni refusée)', etiquette: 'technique:image-cassee', categorie: 'technique' },
  { id: 'polices', libelle: 'Polices chargées et auto-hébergées', etiquette: 'technique:police', categorie: 'technique' },
  { id: 'accessibilite', libelle: 'Accessibilité (axe-core)', etiquette: 'technique:accessibilite', categorie: 'technique' },
  { id: 'seo', libelle: 'SEO (titres, méta, données structurées)', etiquette: 'technique:texte-manquant', categorie: 'technique' },
  { id: 'agents', libelle: 'Découvrabilité par les agents IA (controle:agents)', etiquette: 'technique:texte-manquant', categorie: 'technique' },
  { id: 'charte', libelle: 'Charte graphique (controle:charte)', etiquette: 'technique:rendu', categorie: 'technique' },
  { id: 'webkit', libelle: 'Rendu iPhone (WebKit)', etiquette: 'technique:rendu', categorie: 'technique' },
  { id: 'performance', libelle: 'Performance mobile (4G lente simulée)', etiquette: 'technique:poids', categorie: 'technique' },
  { id: 'console', libelle: 'Console sans erreur JS', etiquette: 'technique:console', categorie: 'technique' },
  { id: 'animations', libelle: 'Animations : mouvement réduit respecté, image fixe correcte', etiquette: 'technique:rendu', categorie: 'technique' },
  { id: 'tiers', libelle: 'Aucune requête vers un service tiers', etiquette: 'technique:rendu', categorie: 'technique' },
  { id: 'activites', libelle: 'Aucun visuel d’une autre activité (jeux d’activité)', etiquette: 'technique:image', categorie: 'technique' },
  // Vérification visuelle (agent Claude testeur-modeles)
  { id: 'visuel', libelle: 'Vérification visuelle (grille du goût de Paul)', etiquette: 'a-revoir', categorie: 'gout' },
] as const satisfies readonly { id: string; libelle: string; etiquette: string; categorie: CategorieTicket }[];
export type IdControleTesteur = (typeof CONTROLES_TESTEUR)[number]['id'];
export const controleTesteur = (id: string) => CONTROLES_TESTEUR.find((c) => c.id === id);

/** Ticket du testeur : le ticket commun + ce que le testeur sait en plus (lu par le rapport de l'admin, ignoré par normaliserTicket) */
export type TicketTesteur = TicketModele & {
  /** Chemin exact de la page (« /soins/bilan-podologique ») : la page du format commun n'a pas 404 ni mentions */
  chemin: string;
  /** Largeur de rendu (px CSS) */
  largeur?: number | null;
  /** Jeu de données de démonstration (sport-basket, diabete-senior, enfant-minimal) */
  jeu?: string | null;
  /** Zone en pixels CSS de la page entière, à cette largeur */
  zonePx?: { x: number; y: number; l: number; h: number } | null;
  categorie: CategorieTicket;
  /** Mesure et seuil (« 3,2:1 », « ≥ 4,5:1 ») */
  mesure?: string | null;
  seuil?: string | null;
  suggestion: string;
  /** Vignette de la zone (chemin relatif au dossier retours/, ex. tests-modeles/x-v2/t-0007.jpg) */
  vignette?: string | null;
  /** Re-check : vignette de la même zone sur la version précédente (avant) */
  vignetteAvant?: string | null;
  /** Empreinte stable (même défaut d'une version à l'autre) */
  empreinte: string;
};

export type ControleTesteur = ControleModele & {
  categorie: CategorieTicket;
  /** Mesure lisible et seuil appliqué */
  mesure: string;
  seuil: string;
  tickets: number;
  dureeMs?: number;
  /** Outil absent ou étape sautée : jamais vert */
  nonMesure?: boolean;
};

export type CaptureTest = { chemin: string; page: PageModele; appareil: AppareilModele; largeur: number; jeu: string; fichier: string };

export const MODES_TEST = ['check', 'recheck'] as const;
export type ModeTest = (typeof MODES_TEST)[number];

export type ComparaisonVersions = {
  versionPrecedente: number;
  verdictPrecedent: VerdictTest;
  /** Empreintes des tickets de la version précédente qui ne se reproduisent plus */
  corriges: TicketTesteur[];
  toujoursOuverts: TicketTesteur[];
  /** Nouveaux défauts (régressions) */
  nouveaux: TicketTesteur[];
  /** Contrôles dont le verdict a changé */
  controlesChanges: { id: string; avant: VerdictTest; apres: VerdictTest }[];
};

export type ResultatTesteur = Omit<ResultatTestModele, 'controles' | 'tickets'> & {
  format: 'testeur-modeles/1';
  mode: ModeTest;
  source: 'script' | 'claude' | 'script+claude';
  controles: ControleTesteur[];
  tickets: TicketTesteur[];
  /** Jeux de démonstration (profils) : verdict propre (le pire de ses tickets) et durée de construction + contrôles */
  jeux: { id: string; libelle: string; verdict?: VerdictTest; dureeMs?: number | null; activites?: string[] }[];
  pages: string[];
  largeurs: number[];
  /** Captures (chemins relatifs au dossier de sortie du passage ; artefacts du workflow) */
  captures: CaptureTest[];
  comparaison?: ComparaisonVersions | null;
  /** Lien du run GitHub (CI) */
  run?: string | null;
};

// ---------------------------------------------------------------------------------------------------------------
// Pages et appareils
// ---------------------------------------------------------------------------------------------------------------

/** Type de page du format commun d'après le chemin (404 et mentions : rangées « accueil », chemin exact gardé dans le ticket) */
export function pageModeleDeChemin(chemin: string): PageModele {
  const c = chemin.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/+$/, '') || '/';
  if (c === '/' ) return 'accueil';
  if (c.startsWith('/themes/')) return 'theme';
  if (c === '/soins') return 'soins';
  if (c.startsWith('/soins/')) return 'fiche';
  if (c === '/le-cabinet' || c === '/a-propos') return 'cabinet';
  if (c === '/acces' || c === '/rdv' || c === '/contact') return 'acces';
  if (c.startsWith('/actualites')) return 'article';
  if (c === '/questions' || c === '/faq') return 'questions';
  return 'accueil';
}

/** Appareil du format commun : ≤ 600 px = mobile ; tablette et ordinateur = ordinateur */
export const appareilDeLargeur = (largeur: number): AppareilModele => (largeur <= 600 ? 'mobile' : 'ordinateur');
export { LARGEURS_MODELE };

// ---------------------------------------------------------------------------------------------------------------
// Tickets, verdicts
// ---------------------------------------------------------------------------------------------------------------

/** Empreinte FNV-1a (8 hexa) : même défaut → même empreinte d'une version à l'autre */
export function empreinte(texte: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Données personnelles masquées (e-mails, téléphones, RPPS) : un résultat ne contient que des données de démonstration, par sécurité */
export const masquerDonnees = (t: string) =>
  String(t ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[e-mail]')
    .replace(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, '[téléphone]')
    .replace(/\b\d{11}\b/g, '[numéro]');

const borne = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

export type EntreeTicket = {
  modele: string;
  version: number;
  controle: IdControleTesteur | string;
  chemin: string;
  largeur?: number | null;
  jeu?: string | null;
  gravite: GraviteTicket;
  commentaire: string;
  suggestion: string;
  element?: string | null;
  zonePx?: { x: number; y: number; l: number; h: number } | null;
  /** Dimensions de la page capturée (normalisation de la zone) */
  surface?: { l: number; h: number } | null;
  mesure?: string | null;
  seuil?: string | null;
  categorie?: CategorieTicket;
  etiquette?: string;
  /** Clé stable du défaut (sinon : contrôle + chemin + élément + largeur) */
  cle?: string;
  creeLe?: string;
};

/** Ticket du testeur, au format commun (origine « testeur », statut « ouvert », numéro 0 : numéroté par la chaîne) */
export function creerTicket(e: EntreeTicket): TicketTesteur {
  const def = controleTesteur(String(e.controle));
  const zonePx = e.zonePx ? { x: Math.round(e.zonePx.x), y: Math.round(e.zonePx.y), l: Math.round(e.zonePx.l), h: Math.round(e.zonePx.h) } : null;
  const zone: ZoneTicket | null =
    zonePx && e.surface && e.surface.l > 0 && e.surface.h > 0
      ? { forme: 'rect', x: borne(zonePx.x / e.surface.l), y: borne(zonePx.y / e.surface.h), l: borne(zonePx.l / e.surface.l), h: borne(zonePx.h / e.surface.h) }
      : null;
  const largeur = e.largeur ?? null;
  return {
    numero: 0,
    modele: e.modele,
    page: pageModeleDeChemin(e.chemin),
    appareil: largeur ? appareilDeLargeur(largeur) : 'mobile',
    zone,
    element: e.element ? masquerDonnees(e.element).slice(0, 200) : null,
    etiquette: e.etiquette ?? def?.etiquette ?? 'technique:rendu',
    commentaire: masquerDonnees(e.commentaire).slice(0, 500),
    origine: 'testeur',
    gravite: e.gravite,
    auteur: 'testeur',
    statut: 'ouvert',
    versionOuverture: e.version,
    versionCorrection: null,
    controle: String(e.controle),
    creeLe: e.creeLe,
    chemin: e.chemin,
    largeur,
    jeu: e.jeu ?? null,
    zonePx,
    categorie: e.categorie ?? def?.categorie ?? 'technique',
    mesure: e.mesure ?? null,
    seuil: e.seuil ?? null,
    suggestion: masquerDonnees(e.suggestion).slice(0, 400),
    vignette: null,
    empreinte: empreinte(e.cle ?? [e.controle, e.chemin, e.element ?? '', largeur ?? ''].join('|')),
  };
}

/** Verdict d'un contrôle d'après ses tickets : rouge (un bloquant), orange (un majeur, ou non mesuré), sinon vert */
export function verdictControle(tickets: readonly Pick<TicketModele, 'gravite'>[], nonMesure = false): VerdictTest {
  if (tickets.some((t) => t.gravite === 'bloquant')) return 'rouge';
  if (nonMesure || tickets.some((t) => t.gravite === 'majeur')) return 'orange';
  return 'vert';
}

/** Verdict d'un passage : celui de ses contrôles, et rouge dès qu'un ticket est bloquant (le contrat de la chaîne) */
export function verdictTest(controles: readonly Pick<ControleModele, 'verdict'>[], tickets: readonly Pick<TicketModele, 'gravite'>[]): VerdictTest {
  const v = verdictGlobal(controles);
  if (tickets.some((t) => t.gravite === 'bloquant')) return 'rouge';
  if (v === 'vert' && tickets.some((t) => t.gravite === 'majeur')) return 'orange';
  return v;
}

/** Contrôle agrégé à partir de ses tickets */
export function bilanControle(id: string, tickets: readonly TicketTesteur[], o: { mesure: string; seuil: string; nonMesure?: boolean; dureeMs?: number; valeur?: number | null }): ControleTesteur {
  const def = controleTesteur(id);
  const siens = tickets.filter((t) => t.controle === id);
  return {
    id,
    libelle: def?.libelle ?? id,
    page: null,
    appareil: null,
    verdict: verdictControle(siens, o.nonMesure),
    detail: masquerDonnees(o.mesure),
    valeur: o.valeur ?? null,
    categorie: def?.categorie ?? 'technique',
    mesure: masquerDonnees(o.mesure),
    seuil: o.seuil,
    tickets: siens.length,
    ...(o.dureeMs != null ? { dureeMs: o.dureeMs } : {}),
    ...(o.nonMesure ? { nonMesure: true } : {}),
  };
}

/** Tickets en double (même empreinte) fusionnés : on garde le plus grave */
export function dedoublonner<T extends Pick<TicketTesteur, 'empreinte' | 'gravite'>>(tickets: readonly T[]): T[] {
  const rang = { bloquant: 0, majeur: 1, mineur: 2 } as const;
  const m = new Map<string, T>();
  for (const t of tickets) {
    const a = m.get(t.empreinte);
    if (!a || rang[t.gravite ?? 'mineur'] < rang[a.gravite ?? 'mineur']) m.set(t.empreinte, t);
  }
  return [...m.values()];
}

/** Chemin du résultat dans le dépôt (retours/tests-modeles/<modele>-v<n>.json) ; identifiant ramené à [a-z0-9-] */
export function cheminResultatTest(modele: string, version: number): string {
  const id = String(modele).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'modele';
  return `retours/tests-modeles/${id}-v${Math.max(1, Math.trunc(version) || 1)}.json`;
}

// ---------------------------------------------------------------------------------------------------------------
// Contrôles purs
// ---------------------------------------------------------------------------------------------------------------

const canal = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const luminanceRvb = ([r, v, b]: readonly number[]) => 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
export function ratioContraste(a: readonly number[], b: readonly number[]): number {
  const [hi, lo] = [luminanceRvb(a), luminanceRvb(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Grand texte WCAG : ≥ 24 px, ou ≥ 18,66 px en gras (≥ 700) */
export const estGrandTexte = (taillePx: number, graisse: number) => taillePx >= 24 || (taillePx >= 18.66 && graisse >= 700);
export const seuilContraste = (taillePx: number, graisse: number) => (estGrandTexte(taillePx, graisse) ? SEUILS_TEST_MODELE.contrasteGrandTexte : SEUILS_TEST_MODELE.contrasteTexte);

/** Mélange d'une couleur de texte semi-transparente sur son fond */
export const melangerAlpha = (texte: readonly number[], alpha: number, fond: readonly number[]): Rvb =>
  [0, 1, 2].map((i) => texte[i] * alpha + fond[i] * (1 - alpha)) as Rvb;

export type AnalyseFond = {
  /** Fond dominant (hors pixels du texte) */
  fond: Rvb;
  /** Contraste texte / fond dominant */
  ratio: number;
  /** Contraste le plus faible sur 90 % du fond (photo, dégradé) */
  ratioP10: number;
  /** Fond uni (≥ 60 % des pixels de fond dans la même teinte) */
  uni: boolean;
  /** Contraste retenu : fond uni → ratio ; fond varié → ratioP10 */
  retenu: number;
  pixels: number;
};

/**
 * Contraste RÉEL d'un texte sur le rendu : pixels RGBA d'une capture (largeur × hauteur), boîte du texte, couleur du texte (alpha
 * compris). Les pixels proches de la couleur du texte (lettres, anticrénelage) sont écartés ; le fond est la teinte dominante du reste.
 */
export function analyserFondTexte(
  pixels: ArrayLike<number>, largeur: number, hauteur: number,
  boite: { x: number; y: number; l: number; h: number }, texte: readonly number[], alpha = 1,
): AnalyseFond | null {
  const x0 = Math.max(0, Math.floor(boite.x)), y0 = Math.max(0, Math.floor(boite.y));
  const x1 = Math.min(largeur, Math.ceil(boite.x + boite.l)), y1 = Math.min(hauteur, Math.ceil(boite.y + boite.h));
  if (x1 - x0 < 2 || y1 - y0 < 2) return null;
  const pas = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 6000)));
  const bacs = new Map<number, { n: number; s: [number, number, number] }>();
  const fonds: Rvb[] = [];
  // Couleur PEINTE des lettres : texte semi-transparent (rgba, ex. blanc à 80 % sur bleu nuit) mélangé au fond le plus fréquent de
  // la boîte ; sans ce mélange, les lettres ne sont pas reconnues et comptent comme « fond » (faux contraste de 1,5:1)
  let peint: readonly number[] = texte;
  if (alpha < 1) {
    const compte = new Map<number, { n: number; s: [number, number, number] }>();
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const i = (y * largeur + x) * 4;
      const k = ((pixels[i] >> 4) << 8) | ((pixels[i + 1] >> 4) << 4) | (pixels[i + 2] >> 4);
      const b = compte.get(k);
      if (b) { b.n++; b.s[0] += pixels[i]; b.s[1] += pixels[i + 1]; b.s[2] += pixels[i + 2]; } else compte.set(k, { n: 1, s: [pixels[i], pixels[i + 1], pixels[i + 2]] });
    }
    let m = { n: 0, s: [0, 0, 0] as [number, number, number] };
    for (const b of compte.values()) if (b.n > m.n) m = b;
    if (m.n) peint = melangerAlpha(texte, alpha, [m.s[0] / m.n, m.s[1] / m.n, m.s[2] / m.n]);
  }
  const dTexte = (i: number) => Math.abs(pixels[i] - peint[0]) + Math.abs(pixels[i + 1] - peint[1]) + Math.abs(pixels[i + 2] - peint[2]);
  // Pixel voisin (± 1 px) d'une lettre : bord anticrénelé possible (trié plus bas, une fois le fond dominant connu)
  const bordLettre = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if ((dx || dy) && xx >= 0 && yy >= 0 && xx < largeur && yy < hauteur && dTexte((yy * largeur + xx) * 4) < 60) return true;
    }
    return false;
  };
  const bords: boolean[] = [];
  // Fond dominant cherché d'abord parmi les pixels qui ne bordent aucune lettre (l'anticrénelage ne peut pas l'emporter)
  const bacsNets = new Map<number, { n: number; s: [number, number, number] }>();
  for (let y = y0; y < y1; y += pas) {
    for (let x = x0; x < x1; x += pas) {
      const i = (y * largeur + x) * 4;
      const p: Rvb = [pixels[i], pixels[i + 1], pixels[i + 2]];
      if (dTexte(i) < 60) continue; // lettre
      fonds.push(p);
      const bord = bordLettre(x, y);
      bords.push(bord);
      const cle = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4);
      for (const m of bord ? [bacs] : [bacs, bacsNets]) {
        const b = m.get(cle);
        if (b) { b.n++; b.s[0] += p[0]; b.s[1] += p[1]; b.s[2] += p[2]; } else m.set(cle, { n: 1, s: [p[0], p[1], p[2]] });
      }
    }
  }
  if (fonds.length < 4) return null;
  let max = { n: 0, s: [0, 0, 0] as [number, number, number] };
  let cleMax = -1;
  const nNets = [...bacsNets.values()].reduce((t, b) => t + b.n, 0);
  for (const [k, b] of nNets >= 4 ? bacsNets : bacs) if (b.n > max.n) { max = b; cleMax = k; }
  const fond: Rvb = [max.s[0] / max.n, max.s[1] / max.n, max.s[2] / max.n];
  const couleur = melangerAlpha(texte, alpha, fond);
  const ratio = ratioContraste(couleur, fond);
  // Pixels de fond intermédiaires (anticrénelage : voisins d'une lettre ET de couleur entre le texte et le fond dominant, cas des
  // polices fines, serifs à déliés, petits corps) : écartés du 10e centile et de la mesure d'uniformité ; un vrai fond varié (photo,
  // dégradé, motif) garde ses pixels.
  const entre = (p: Rvb) => {
    const v = [fond[0] - peint[0], fond[1] - peint[1], fond[2] - peint[2]];
    const n2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    if (n2 < 1) return false;
    const t = ((p[0] - peint[0]) * v[0] + (p[1] - peint[1]) * v[1] + (p[2] - peint[2]) * v[2]) / n2;
    if (t <= 0 || t >= 1) return false;
    // Anticrénelage en sRGB : courbe, pas tout à fait sur le segment ; tolérance proportionnelle à l'écart texte / fond
    return Math.hypot(p[0] - peint[0] - t * v[0], p[1] - peint[1] - t * v[1], p[2] - peint[2] - t * v[2]) < Math.max(28, 0.25 * Math.sqrt(n2));
  };
  const nets = fonds.filter((p, k) => !(bords[k] && entre(p)));
  const base = nets.length >= 4 ? nets : fonds;
  const ratios = base.map((p) => ratioContraste(melangerAlpha(texte, alpha, p), p)).sort((a, b) => a - b);
  const ratioP10 = ratios[Math.floor(ratios.length * 0.1)];
  const dominants = base.filter((p) => (((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4)) === cleMax).length;
  const uni = dominants / base.length >= 0.6;
  return { fond, ratio, ratioP10, uni, retenu: uni ? ratio : Math.min(ratio, ratioP10), pixels: fonds.length };
}

type Rect = { x: number; y: number; l: number; h: number };
/** Bloc candidat : boîte englobante et, pour un texte, ses boîtes ligne par ligne (« lignes ») */
export type BoiteElement = Rect & { id: number; type: 'texte' | 'interactif'; ancetres: readonly number[]; libelle?: string; lignes?: readonly Rect[] };

/** Plus grand recouvrement entre deux listes de boîtes : aire et part de la plus petite boîte concernée */
function recouvrement(as: readonly Rect[], bs: readonly Rect[]): { aire: number; part: number } {
  let meilleur = { aire: 0, part: 0 };
  for (const a of as) for (const b of bs) {
    const l = Math.min(a.x + a.l, b.x + b.l) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (l <= 0 || h <= 0) continue;
    const aire = l * h;
    const part = aire / Math.min(a.l * a.h, b.l * b.h);
    if (part > meilleur.part) meilleur = { aire, part };
  }
  return meilleur;
}

/** Paires de blocs de texte ou interactifs qui se recouvrent (hors parents / enfants) au-delà du seuil */
export function chevauchements(boites: readonly BoiteElement[], seuil: number = SEUILS_TEST_MODELE.chevauchement): { a: BoiteElement; b: BoiteElement; part: number }[] {
  const r: { a: BoiteElement; b: BoiteElement; part: number }[] = [];
  const tri = [...boites].filter((b) => b.l > 1 && b.h > 1).sort((p, q) => p.y - q.y);
  for (let i = 0; i < tri.length; i++) {
    const a = tri[i];
    for (let j = i + 1; j < tri.length; j++) {
      const b = tri[j];
      if (b.y >= a.y + a.h) break;
      if (a.ancetres.includes(b.id) || b.ancetres.includes(a.id)) continue;
      const { aire, part } = recouvrement(a.lignes?.length ? a.lignes : [a], b.lignes?.length ? b.lignes : [b]);
      if (part >= seuil && aire >= 40) r.push({ a, b, part });
    }
  }
  return r;
}

/** Gravité d'une cible tactile : null si conforme ; liens en ligne dans un paragraphe exemptés (WCAG 2.5.8) */
export function graviteCibleTactile(c: { l: number; h: number; enLigne: boolean }): GraviteTicket | null {
  if (c.enLigne) return null;
  const m = Math.min(c.l, c.h);
  if (m >= SEUILS_TEST_MODELE.cibleTactile) return null;
  return m < SEUILS_TEST_MODELE.cibleTactileMin ? 'majeur' : 'mineur';
}

export type PageLiens = { chemin: string; liens: readonly string[]; ids: readonly string[] };

/** Chemin de page normalisé (« / », « /soins », « /soins/x ») */
export const normaliserChemin = (c: string) => (c.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/+$/, '$1') || '/');

/**
 * Liens internes cassés : page introuvable (aucune page ni fichier du site) ou ancre absente de la page visée.
 * `fichiers` : fichiers du site (« photos/x.webp », « llms.txt ») ; les pages viennent de `pages`.
 */
export function liensCasses(pages: readonly PageLiens[], fichiers: ReadonlySet<string>): { page: string; href: string; raison: 'page' | 'ancre' }[] {
  const parChemin = new Map(pages.map((p) => [normaliserChemin(p.chemin), new Set(p.ids)]));
  const r: { page: string; href: string; raison: 'page' | 'ancre' }[] = [];
  for (const p of pages) {
    const ici = normaliserChemin(p.chemin);
    for (const brut of new Set(p.liens)) {
      const href = brut.trim();
      if (!href || /^(https?:|mailto:|tel:|sms:|javascript:|data:|\/\/)/i.test(href)) continue;
      const [sansAncre, ancre = ''] = href.split('#');
      const chemin = sansAncre.split('?')[0];
      const cible = chemin === '' ? ici : normaliserChemin(chemin.startsWith('/') ? chemin : `${ici.replace(/[^/]*$/, '')}${chemin}`);
      const ids = parChemin.get(cible);
      if (!ids) {
        const fichier = decodeURIComponent(cible.replace(/^\//, ''));
        if (!fichiers.has(fichier) && !fichiers.has(`${fichier}.html`) && !fichiers.has(`${fichier}/index.html`)) r.push({ page: ici, href, raison: 'page' });
        continue;
      }
      if (ancre && ancre !== 'top' && !ids.has(decodeURIComponent(ancre))) r.push({ page: ici, href, raison: 'ancre' });
    }
  }
  return r;
}

export type MetaSeo = { title: string; description: string; canonical: string; robots: string; lang: string; h1: number; jsonld: readonly string[] };

/** Défauts SEO d'une page (la 404 et les pages noindex sont dispensées de canonical et de données structurées) */
export function defautsSeo(m: MetaSeo, o: { erreur404?: boolean } = {}): { gravite: GraviteTicket; texte: string; suggestion: string }[] {
  const d: { gravite: GraviteTicket; texte: string; suggestion: string }[] = [];
  const S = SEUILS_TEST_MODELE;
  if (!m.title.trim()) d.push({ gravite: 'bloquant', texte: 'Balise <title> vide', suggestion: 'Donner un titre « soin / métier à ville » à la page.' });
  else if (m.title.length > S.titreMax) d.push({ gravite: 'mineur', texte: `Title de ${m.title.length} caractères (> ${S.titreMax})`, suggestion: 'Raccourcir le titre : il sera coupé dans les résultats Google.' });
  if (!m.lang.toLowerCase().startsWith('fr')) d.push({ gravite: 'majeur', texte: `Langue de la page « ${m.lang || 'absente'} »`, suggestion: 'Poser lang="fr" sur <html>.' });
  if (m.h1 !== 1) d.push({ gravite: 'majeur', texte: `${m.h1} titre(s) H1`, suggestion: 'Un seul H1 par page.' });
  if (o.erreur404 || /noindex/i.test(m.robots)) return d;
  if (!m.description.trim()) d.push({ gravite: 'majeur', texte: 'Méta description absente', suggestion: 'Écrire une description de 120 à 160 caractères.' });
  else if (m.description.length < S.descriptionMin || m.description.length > S.descriptionMax) d.push({ gravite: 'mineur', texte: `Méta description de ${m.description.length} caractères`, suggestion: `Viser ${S.descriptionMin} à ${S.descriptionMax} caractères.` });
  if (!m.canonical) d.push({ gravite: 'majeur', texte: 'Lien canonical absent', suggestion: 'Ajouter <link rel="canonical">.' });
  for (const j of m.jsonld) {
    try {
      const x = JSON.parse(j);
      const types = [x].flat().flatMap((y: Record<string, unknown>) => (y?.['@graph'] ? (y['@graph'] as unknown[]) : [y])).map((y) => (y as Record<string, unknown>)?.['@type']);
      if (!types.some(Boolean)) d.push({ gravite: 'majeur', texte: 'Données structurées sans @type', suggestion: 'Chaque bloc JSON-LD doit déclarer son @type.' });
    } catch {
      d.push({ gravite: 'bloquant', texte: 'Données structurées JSON-LD illisibles', suggestion: 'Corriger le JSON-LD (JSON invalide : Google l’ignore).' });
    }
  }
  return d;
}

export type MesuresPerformance = { lcpMs: number | null; cls: number | null; tbtMs: number | null; poids: number | null };

/** Défauts de performance mobile (seuils SEUILS_TEST_MODELE) */
export function defautsPerformance(m: MesuresPerformance): { mesure: keyof MesuresPerformance; gravite: GraviteTicket; texte: string; seuil: string }[] {
  const S = SEUILS_TEST_MODELE;
  const d: { mesure: keyof MesuresPerformance; gravite: GraviteTicket; texte: string; seuil: string }[] = [];
  const s = (ms: number) => `${(ms / 1000).toFixed(2).replace('.', ',')} s`;
  if (m.lcpMs != null && m.lcpMs > S.lcpMs) d.push({ mesure: 'lcpMs', gravite: m.lcpMs > S.lcpMsBloquant ? 'bloquant' : 'majeur', texte: `LCP ${s(m.lcpMs)}`, seuil: `≤ ${s(S.lcpMs)}` });
  if (m.cls != null && m.cls > S.cls) d.push({ mesure: 'cls', gravite: m.cls > S.clsBloquant ? 'bloquant' : 'majeur', texte: `CLS ${m.cls.toFixed(3).replace('.', ',')}`, seuil: `≤ ${String(S.cls).replace('.', ',')}` });
  if (m.tbtMs != null && m.tbtMs > S.tbtMs) d.push({ mesure: 'tbtMs', gravite: m.tbtMs > S.tbtMsBloquant ? 'bloquant' : 'majeur', texte: `TBT ${Math.round(m.tbtMs)} ms`, seuil: `≤ ${S.tbtMs} ms` });
  if (m.poids != null && m.poids > S.poidsPage) d.push({ mesure: 'poids', gravite: m.poids > S.poidsPageBloquant ? 'bloquant' : 'majeur', texte: `Page de ${Math.round(m.poids / 1024)} Ko`, seuil: `≤ ${Math.round(S.poidsPage / 1024)} Ko` });
  return d;
}

// ---------------------------------------------------------------------------------------------------------------
// Check / re-check
// ---------------------------------------------------------------------------------------------------------------

/**
 * Re-check d'une nouvelle version : compare aux tickets de la version précédente (même empreinte = même défaut).
 * L'humain ne revalide que ce qui a changé : corrigés (avant / après), toujours ouverts, nouveaux (régressions).
 */
export function comparerVersions(precedent: Pick<ResultatTesteur, 'version' | 'verdict' | 'tickets' | 'controles'>, actuel: Pick<ResultatTesteur, 'tickets' | 'controles'>): ComparaisonVersions {
  const avant = new Map(precedent.tickets.map((t) => [t.empreinte, t]));
  const apres = new Set(actuel.tickets.map((t) => t.empreinte));
  const verdicts = new Map(precedent.controles.map((c) => [c.id, c.verdict]));
  return {
    versionPrecedente: precedent.version,
    verdictPrecedent: precedent.verdict,
    corriges: precedent.tickets.filter((t) => !apres.has(t.empreinte)),
    toujoursOuverts: actuel.tickets.filter((t) => avant.has(t.empreinte)),
    nouveaux: actuel.tickets.filter((t) => !avant.has(t.empreinte)),
    controlesChanges: actuel.controles.flatMap((c) => {
      const v = verdicts.get(c.id);
      return v && v !== c.verdict ? [{ id: c.id, avant: v, apres: c.verdict }] : [];
    }),
  };
}

/** Fusion du passage du script et de la vérification visuelle de Claude (même version) */
export function fusionnerResultats(script: ResultatTesteur, visuel: Pick<ResultatTesteur, 'controles' | 'tickets'> & Partial<Pick<ResultatTesteur, 'captures'>>): ResultatTesteur {
  const ids = new Set(visuel.controles.map((c) => c.id));
  const controles = [...script.controles.filter((c) => !ids.has(c.id)), ...visuel.controles];
  const tickets = dedoublonner([...script.tickets, ...visuel.tickets]);
  return { ...script, source: 'script+claude', controles, tickets, captures: [...script.captures, ...(visuel.captures ?? [])], verdict: verdictTest(controles, tickets) };
}

/** Lecture tolérante d'un résultat du testeur (garde les champs du testeur ; null s'il est inexploitable) */
export function lireResultatTesteur(brut: unknown): ResultatTesteur | null {
  const commun = normaliserResultatTest(brut);
  if (!commun) return null;
  const r = brut as Record<string, unknown>;
  const tickets = (Array.isArray(r.tickets) ? r.tickets : []).flatMap((t) => {
    const s = t as Record<string, unknown>;
    const c = normaliserTicket({ ...s, modele: commun.modele, origine: 'testeur', auteur: 'testeur' });
    if (!c) return [];
    return [{
      ...c,
      chemin: typeof s.chemin === 'string' ? s.chemin : '/',
      largeur: typeof s.largeur === 'number' ? s.largeur : null,
      jeu: typeof s.jeu === 'string' ? s.jeu : null,
      zonePx: s.zonePx && typeof s.zonePx === 'object' ? (s.zonePx as TicketTesteur['zonePx']) : null,
      categorie: s.categorie === 'gout' ? 'gout' : 'technique',
      mesure: typeof s.mesure === 'string' ? s.mesure : null,
      seuil: typeof s.seuil === 'string' ? s.seuil : null,
      suggestion: typeof s.suggestion === 'string' ? s.suggestion : '',
      vignette: typeof s.vignette === 'string' && /^tests-modeles\/[\w./-]+\.(jpe?g|png|webp)$/.test(s.vignette) ? s.vignette : null,
      vignetteAvant: typeof s.vignetteAvant === 'string' && /^tests-modeles\/[\w./-]+\.(jpe?g|png|webp)$/.test(s.vignetteAvant) ? s.vignetteAvant : null,
      empreinte: typeof s.empreinte === 'string' ? s.empreinte : empreinte(`${c.controle}|${c.commentaire}`),
    } satisfies TicketTesteur];
  });
  const controles = commun.controles.map((c) => {
    const s = c as Partial<ControleTesteur>;
    return { ...c, categorie: s.categorie === 'gout' ? 'gout' : 'technique', mesure: String(s.mesure ?? c.detail ?? ''), seuil: String(s.seuil ?? ''), tickets: Number(s.tickets) || 0, ...(s.nonMesure ? { nonMesure: true } : {}) } as ControleTesteur;
  });
  return {
    ...commun,
    format: 'testeur-modeles/1',
    mode: r.mode === 'recheck' ? 'recheck' : 'check',
    source: r.source === 'claude' || r.source === 'script+claude' ? r.source : 'script',
    controles,
    tickets,
    jeux: Array.isArray(r.jeux) ? (r.jeux as ResultatTesteur['jeux']) : [],
    pages: Array.isArray(r.pages) ? (r.pages as string[]) : [],
    largeurs: Array.isArray(r.largeurs) ? (r.largeurs as number[]) : [],
    captures: Array.isArray(r.captures) ? (r.captures as CaptureTest[]) : [],
    comparaison: (r.comparaison as ComparaisonVersions | undefined) ?? null,
    run: typeof r.run === 'string' && /^https:\/\/github\.com\//.test(r.run) ? r.run : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Étapes de la chaîne et règle de validation
// ---------------------------------------------------------------------------------------------------------------

/**
 * Étapes d'un modèle : celles de la chaîne (STATUTS_MODELE de chaine-modeles.ts) — candidat → finaliste → check-agent → avis-humain
 * → retouche (Claude) → recheck-agent → revalidation → pret-validation → publie. Le testeur intervient APRÈS le tournoi : check
 * initial à « finaliste / check-agent », re-check à « retouche / recheck-agent », re-test hebdomadaire à « publie ». Jamais sur
 * les candidats (présélection, tournoi) ni les écartés.
 */
export function modeTestPourEtape(etape: StatutModele | string): ModeTest | null {
  if (etape === 'finaliste' || etape === 'check-agent' || etape === 'publie') return 'check';
  if (etape === 'retouche' || etape === 'recheck-agent') return 'recheck';
  return null;
}

/** Étape suivante une fois le test rendu : check → avis humain ; re-check → revalidation */
export const etapeApresTest = (mode: ModeTest): StatutModele => (mode === 'check' ? 'avis-humain' : 'revalidation');

export type DecisionValidation = { autorise: boolean; justificationRequise: boolean; raison: string };

/**
 * RÈGLE DE VALIDATION : un modèle ne peut être validé ni publié que si son DERNIER test sur la VERSION COURANTE est vert.
 * Sans la vérification visuelle de l'agent (contrôle « visuel »), le test compte comme orange (sauf exigerVisuel: false).
 * Orange : validation possible avec une justification écrite de Paul (≥ 15 caractères). Rouge, absent, ou test d'une autre
 * version : refus. Un ticket bloquant refuse toujours.
 */
export function regleValidationModele(o: {
  versionCourante: number;
  dernierTest: (Pick<ResultatTestModele, 'version' | 'verdict' | 'tickets'> & { controles?: readonly Pick<ControleModele, 'id'>[] }) | null | undefined;
  justification?: string | null;
  /** Vérification visuelle de l'agent exigée (contrôle « visuel ») ; par défaut oui */
  exigerVisuel?: boolean;
}): DecisionValidation {
  const t = o.dernierTest;
  if (!t) return { autorise: false, justificationRequise: false, raison: 'Aucun test du testeur de modèles : lancer le test avant de valider.' };

  if (t.version !== o.versionCourante) return { autorise: false, justificationRequise: false, raison: `Le dernier test porte sur la version ${t.version}, pas sur la version courante ${o.versionCourante} : relancer le test.` };
  if (t.verdict === 'rouge' || t.tickets.some((x) => x.gravite === 'bloquant' && x.statut !== 'sans-objet')) return { autorise: false, justificationRequise: false, raison: 'Test rouge : corriger les tickets bloquants puis relancer le test.' };
  // Vérification visuelle de l'agent absente (passage du script seul, ex. workflow) : traité comme un orange
  const sansVisuel = o.exigerVisuel !== false && Boolean(t.controles) && !t.controles!.some((c) => c.id === 'visuel');
  if (t.verdict === 'orange' || sansVisuel) {
    const ok = (o.justification ?? '').trim().length >= 15;
    const quoi = t.verdict === 'orange' ? 'Test orange' : 'Vérification visuelle de l’agent testeur-modeles absente';
    return { autorise: ok, justificationRequise: true, raison: ok ? `${quoi} : validation acceptée avec la justification écrite.` : `${quoi} : une justification écrite de Paul est nécessaire pour valider (ou lancer l’agent).` };
  }
  return { autorise: true, justificationRequise: false, raison: 'Test vert sur la version courante.' };
}

/** Modèle publié à re-tester (re-test hebdomadaire) : jamais testé, ou dernier test plus vieux que `retestJours` */
export function aRetester(dernierLe: string | null | undefined, maintenant: Date = new Date()): boolean {
  const t = Date.parse(dernierLe ?? '');
  if (!Number.isFinite(t)) return true;
  return maintenant.getTime() - t >= SEUILS_TEST_MODELE.retestJours * 24 * 3600 * 1000;
}

/**
 * Verrou « testeur » de la validation finale (à la place du verrou testeur de verrousValidation, chaine-modeles.ts) : applique
 * regleValidationModele — vert sur la version courante, ou orange / sans vérification visuelle AVEC la justification écrite de Paul.
 */
export function verrouTesteur(p: { versionCourante: number; test: Parameters<typeof regleValidationModele>[0]['dernierTest']; justification?: string | null }): { id: 'testeur'; libelle: string; ok: boolean; detail: string } {
  const d = regleValidationModele({ versionCourante: p.versionCourante, dernierTest: p.test, justification: p.justification });
  return { id: 'testeur', libelle: 'Testeur au vert sur la version (orange : justification de Paul)', ok: d.autorise, detail: p.test ? `v${p.test.version} : ${p.test.verdict} — ${d.raison}` : d.raison };
}

// ---------------------------------------------------------------------------------------------------------------
// Jeux de démonstration = profils (chaîne : un profil par famille de thèmes compatibles, retours/modeles-a-tester.json « jeux »)
// ---------------------------------------------------------------------------------------------------------------

/** Formes de données tournantes d'un jeu à l'autre : maximales à 3 praticiens, cabinet seul aux noms longs, données minimales */
export const FORMES_DONNEES_JEU = [
  { id: 'max', libelle: '3 praticiens, données maximales', env: { PRATICIENS: '3' } },
  { id: 'noms-longs', libelle: 'cabinet seul, noms et villes longs', env: { CAS: 'solo,noms-longs' } },
  { id: 'minimal', libelle: 'cabinet seul, données minimales', env: { CAS: 'solo,minimal' } },
] as const;

export type JeuTesteur = { id: string; libelle: string; principal: string | null; secondaires: string[]; activites: string[]; forme: (typeof FORMES_DONNEES_JEU)[number]['id']; env: Record<string, string> };

/**
 * Jeux du testeur à partir d'identifiants de profils de démonstration (profils.ts) : thèmes et activités du profil, forme des données
 * tournante (le 1er jeu a les données maximales). Profil inconnu ignoré.
 */
export function jeuxTesteurDeProfils(ids: readonly string[], profession = 'podologue'): JeuTesteur[] {
  const profils = profilsDePratique(profession);
  const connus = ids.map((id) => profils.find((x) => x.id === id)).filter((p): p is ProfilPratique => Boolean(p));
  return connus.map((p, i) => {
    const forme = FORMES_DONNEES_JEU[i % FORMES_DONNEES_JEU.length];
    const env: Record<string, string> = { ...forme.env };
    if (p.principal) { env.PRINCIPAUX = p.principal; env.SECONDAIRES = p.secondaires.join(','); } else env.PRIORITES = 'aucune';
    if (p.activites.length) env.ACTIVITE = p.activites.join(',');
    return { id: p.id, libelle: `${p.court} · ${forme.libelle}`, principal: p.principal, secondaires: [...p.secondaires], activites: [...p.activites], forme: forme.id, env };
  });
}

/** Activités reconnues dans une image (URL ou clé) pour une profession */
export const activitesDeLImage = (u: string, profession = 'podologue') => activitesReconnues({ cle: u, url: u }, pratiqueDe(profession));

/**
 * Visuels d'une AUTRE activité dans un jeu d'activité : image dont une activité reconnue n'est pas celle du profil (jamais une photo de
 * tennis chez « Sport · course »). Jeu sans activité : rien à signaler ici (le kit générique exclut déjà toute activité).
 */
export function visuelsAutreActivite(urls: readonly string[], activitesProfil: readonly string[], profession = 'podologue'): { url: string; activites: string[] }[] {
  if (!activitesProfil.length) return [];
  const vus = new Set<string>();
  return urls.flatMap((u) => {
    if (vus.has(u)) return [];
    vus.add(u);
    const autres = activitesDeLImage(u, profession).filter((a) => !activitesProfil.includes(a));
    return autres.length ? [{ url: u, activites: autres }] : [];
  });
}

/** Photos du kit d'un profil dans une banque : activité du profil ou aucune activité reconnue (jamais une autre activité) */
export function photosDuKitProfil(banque: readonly PhotoBanque[], p: Pick<ProfilPratique, 'activites'>, profession = 'podologue'): PhotoBanque[] {
  return banque.filter((x) => activitesDeLImage(x.url, profession).every((a) => p.activites.includes(a)));
}

/** Verdict par jeu (le pire de ses tickets) et verdict agrégé : le pire l'emporte */
export function verdictsParJeu(tickets: readonly Pick<TicketTesteur, 'jeu' | 'gravite'>[], jeux: readonly string[]): Record<string, VerdictTest> {
  return Object.fromEntries(jeux.map((j) => [j, verdictControle(tickets.filter((t) => t.jeu === j))]));
}
