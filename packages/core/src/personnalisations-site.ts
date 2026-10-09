// Personnalisations du praticien (« Personnaliser mon site », demande de Paul du 2026-10-08) : police, taille globale des textes,
// couleurs principale / secondaire, images par emplacement, textes des pages de contenus (blocs).
//
// COUCHE SÉPARÉE, APPLIQUÉE EN DERNIER : recette (commune) → pack profession → profil / kit d'images → PERSONNALISATIONS.
// - stockage : clé `personnalisations` du brouillon (colonne sites.config, jsonb versionné : révision + historique borné), figée
//   avec le reste à la publication (config → config_publiee) ; journal facultatif des versions (table personnalisations_versions) ;
// - aucune valeur de la recette n'est écrasée dans le brouillon : `appliquerPersonnalisations` produit une COPIE (aperçu de
//   l'admin, construction Astro). Une recette améliorée côté Paul (theme.*) se propage donc sans effacer les choix du praticien ;
// - chaque réglage a son « Revenir au modèle » (`revenirAuModele`) ;
// - garde-fous : polices de la liste fermée (paires notées et compatibles), couleurs remises au contraste AA (texte blanc sur la
//   couleur, couleur sur fond blanc), taille bornée sur téléphone (minimum lisible, aucun débordement à 360 px), images contrôlées
//   (stockage du site, banque intégrée ; images « Démo » jamais publiées), blocs réglementaires du pack profession non
//   supprimables et non modifiables, lexique (promesses, « guérir », superlatifs, avis), titre principal (H1) toujours conservé.
// Module pur (aucun accès réseau).

import { contraste, distance, hex, rvb } from './couleurs';
import { NEUTRES } from './charte';
import { buildTheme } from './theme';
import { GAMMES, gamme as gammeParIdentifiant, variantesGamme, type Gamme } from './gammes';
import { PAIRES_POLICES, pairePolices } from './modeles';
import { verifierTexte, PREFERER, type Alerte } from './lexique';
import { estImageDemo, estImageNonPubliable } from './photos-libres';
import type { SiteDraft } from './draft';
import type { Faq } from './types';

// ---------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------

/** Taille globale des textes : un seul réglage, toute l'échelle typographique suit (titres et corps, proportions gardées) */
export const TAILLES_TEXTE = [
  { id: 'petite', nom: 'Plus petit', facteur: 0.9375, mobile: 1 },
  { id: 'standard', nom: 'Standard', facteur: 1, mobile: 1 },
  { id: 'grande', nom: 'Plus grand', facteur: 1.0625, mobile: 1.0625 },
  { id: 'tres-grande', nom: 'Très grand', facteur: 1.125, mobile: 1.0625 },
] as const;
export type TailleTexte = (typeof TAILLES_TEXTE)[number]['id'];
export const tailleTexte = (id: unknown) => TAILLES_TEXTE.find((t) => t.id === id);

export type TypeBloc = 'intertitre' | 'paragraphe' | 'liste' | 'encadre' | 'question';
export const TYPES_BLOCS: readonly { id: TypeBloc; nom: string; aide: string }[] = [
  { id: 'paragraphe', nom: 'Paragraphe', aide: 'Un texte de quelques phrases.' },
  { id: 'liste', nom: 'Liste', aide: 'Des points courts, un par ligne.' },
  { id: 'encadre', nom: 'Encadré', aide: 'Un conseil ou une précision mise en valeur.' },
  { id: 'question', nom: 'Question de FAQ', aide: 'Une question fréquente et sa réponse.' },
  { id: 'intertitre', nom: 'Intertitre', aide: 'Un titre de partie (H2), utile au référencement.' },
];

/**
 * Bloc d'une page de contenus. `id` : « m<n> » pour un bloc du modèle (n-ième bloc du texte du catalogue), « p<…> » pour un bloc
 * ajouté par le praticien. `verrou` : bloc réglementaire du pack profession (ni modifiable, ni supprimable).
 */
export type Bloc = {
  id: string;
  type: TypeBloc;
  texte: string;
  /** Question de FAQ : réponse */
  reponse?: string;
  /** Liste : points (un par ligne) ; `ordonnee` : liste numérotée */
  items?: string[];
  ordonnee?: boolean;
  /** Intertitre : niveau (2 = H2, 3 = H3) */
  niveau?: 2 | 3;
  verrou?: { raison: string };
};
/** Bloc enregistré : référence à un bloc du modèle (texte toujours celui du catalogue à jour) ou bloc complet (modifié, ajouté) */
export type BlocStocke = { id: string; ref: true } | Bloc;

export type ChoixImage = {
  url: string;
  /** kit : image validée du kit du profil ; televersee : envoyée par le praticien ; modele : image du modèle reprise */
  source: 'kit' | 'televersee';
  /** Point focal (pourcentages) retenu au recadrage */
  focal?: { x: number; y: number };
};

export type ReglagesPerso = {
  police?: string;
  taille?: TailleTexte;
  couleurs?: { gamme?: string; principale?: string; secondaire?: string };
  /** Emplacement → image : accueil, panorama, sujet:<id>, soin:<slug>, cabinet:<n>, portrait:<n> */
  images?: Record<string, ChoixImage>;
  /** Page → blocs : soin:<slug> */
  pages?: Record<string, BlocStocke[]>;
};

export type ParPerso = 'praticien' | 'admin';
export type VersionPerso = { revision: number; le: string; par: ParPerso; note?: string; reglages: ReglagesPerso };
/** Contenu de la clé `personnalisations` du brouillon (jsonb versionné) */
export type PersonnalisationsSite = { v: 1; revision: number; le?: string; par?: ParPerso; reglages: ReglagesPerso; historique: VersionPerso[] };
export const HISTORIQUE_MAX = 30;

/** Champs du thème et des photos ajoutés par la couche (lus par le rendu, absents = rendu de la recette) */
/** `accueilPhoto` : le praticien a choisi l'image du premier écran (elle s'affiche quel que soit le style visuel de la recette) */
export type ThemePerso = { taille?: TailleTexte; couleurSecondaire?: string; accueilPhoto?: true };
export type PhotosPerso = { soins?: Record<string, string>; sujets?: Record<string, string> };
export type DraftPersonnalise = SiteDraft & { theme: SiteDraft['theme'] & ThemePerso; photos: SiteDraft['photos'] & PhotosPerso; personnalisations?: PersonnalisationsSite };

// ---------------------------------------------------------------------------------------------------------------
// Lecture et validation
// ---------------------------------------------------------------------------------------------------------------

const HEX = /^#[0-9a-f]{6}$/i;
const obj = (x: unknown): Record<string, unknown> | null => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null);
const texte = (x: unknown, max: number) => String(x ?? '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, max);
const ligne = (x: unknown, max: number) => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Limites de longueur (caractères) : au-delà, le texte est refusé à la saisie et tronqué à la lecture */
export const LIMITES_BLOCS = { intertitre: 90, paragraphe: 1200, item: 240, items: 12, question: 160, reponse: 800, encadre: 500, blocs: 40 } as const;

/** URL d'image acceptée : stockage « photos » du projet (https, ou http local pour les tests), banque intégrée /photos/*.webp */
export function urlImagePermise(u: unknown): u is string {
  if (typeof u !== 'string' || u.length > 500) return false;
  if (/^\/photos\/[a-z0-9-]+\.webp$/.test(u)) return true;
  if (/^https:\/\/[^\s"'<>]+\/storage\/v1\/object\/public\/photos\/[^\s"'<>]+$/.test(u)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/storage\/v1\/object\/public\/photos\/[^\s"'<>]+$/.test(u);
}

/** Emplacement d'image connu */
export const estEmplacementImage = (e: string) => /^(accueil|panorama|sujet:[a-z-]{2,30}|soin:[a-z0-9-]{1,80}|cabinet:[0-5]|portrait:[0-9])$/.test(e);
export const estClePage = (c: string) => /^soin:[a-z0-9-]{1,80}$/.test(c);

function blocValide(b: unknown, i: number): BlocStocke | null {
  const o = obj(b);
  if (!o) return null;
  const id = typeof o.id === 'string' && /^[mp][a-z0-9-]{1,24}$/.test(o.id) ? o.id : `p${i}`;
  if (o.ref === true) return /^m\d{1,3}$/.test(id) ? { id, ref: true } : null;
  const type = TYPES_BLOCS.some((t) => t.id === o.type) ? (o.type as TypeBloc) : null;
  if (!type) return null;
  if (type === 'intertitre') { const t = ligne(o.texte, LIMITES_BLOCS.intertitre); return t ? { id, type, texte: t, niveau: o.niveau === 3 ? 3 : 2 } : null; }
  if (type === 'liste') {
    const items = (Array.isArray(o.items) ? o.items : []).map((x) => ligne(x, LIMITES_BLOCS.item)).filter(Boolean).slice(0, LIMITES_BLOCS.items);
    return items.length ? { id, type, texte: '', items, ...(o.ordonnee === true ? { ordonnee: true } : {}) } : null;
  }
  if (type === 'question') {
    const q = ligne(o.texte, LIMITES_BLOCS.question), r = texte(o.reponse, LIMITES_BLOCS.reponse);
    return q && r ? { id, type, texte: q, reponse: r } : null;
  }
  const t = texte(o.texte, type === 'encadre' ? LIMITES_BLOCS.encadre : LIMITES_BLOCS.paragraphe);
  return t ? { id, type, texte: t } : null;
}

function imageValide(x: unknown): ChoixImage | null {
  const o = obj(x);
  if (!o || !urlImagePermise(o.url)) return null;
  const f = obj(o.focal);
  const pc = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 50)));
  return { url: o.url as string, source: o.source === 'televersee' ? 'televersee' : 'kit', ...(f ? { focal: { x: pc(f.x), y: pc(f.y) } } : {}) };
}

/** Réglages reçus (navigateur, base) : valeurs connues seulement, bornées ; tout le reste est ignoré */
export function normaliserReglagesPerso(brut: unknown): ReglagesPerso {
  const o = obj(brut) ?? {};
  const r: ReglagesPerso = {};
  if (pairePolices(o.police)) r.police = o.police as string;
  if (tailleTexte(o.taille) && o.taille !== 'standard') r.taille = o.taille as TailleTexte;
  const c = obj(o.couleurs);
  if (c) {
    const couleurs: NonNullable<ReglagesPerso['couleurs']> = {};
    if (typeof c.gamme === 'string' && gammeParIdentifiant(c.gamme)) couleurs.gamme = c.gamme;
    else if (typeof c.principale === 'string' && HEX.test(c.principale)) couleurs.principale = c.principale.toLowerCase();
    if (typeof c.secondaire === 'string' && HEX.test(c.secondaire)) couleurs.secondaire = c.secondaire.toLowerCase();
    if (Object.keys(couleurs).length) r.couleurs = couleurs;
  }
  const im = obj(o.images);
  if (im) {
    const images: Record<string, ChoixImage> = {};
    for (const [e, v] of Object.entries(im).slice(0, 60)) { const x = estEmplacementImage(e) ? imageValide(v) : null; if (x) images[e] = x; }
    if (Object.keys(images).length) r.images = images;
  }
  const pg = obj(o.pages);
  if (pg) {
    const pages: Record<string, BlocStocke[]> = {};
    for (const [cle, v] of Object.entries(pg).slice(0, 40)) {
      if (!estClePage(cle) || !Array.isArray(v)) continue;
      const vus = new Set<string>();
      const blocs = v.slice(0, LIMITES_BLOCS.blocs).map(blocValide).filter((b): b is BlocStocke => Boolean(b) && !vus.has(b!.id) && Boolean(vus.add(b!.id)));
      pages[cle] = blocs;
    }
    if (Object.keys(pages).length) r.pages = pages;
  }
  return r;
}

/** Personnalisations enregistrées d'un brouillon (clé `personnalisations` de sites.config) ; vides si absentes */
export function lirePersonnalisations(config: unknown): PersonnalisationsSite {
  const p = obj(obj(config)?.personnalisations);
  if (!p) return { v: 1, revision: 0, reglages: {}, historique: [] };
  const historique = (Array.isArray(p.historique) ? p.historique : []).slice(-HISTORIQUE_MAX).map((h) => {
    const o = obj(h) ?? {};
    return { revision: Math.max(0, Math.floor(Number(o.revision) || 0)), le: typeof o.le === 'string' ? o.le.slice(0, 40) : '', par: (o.par === 'admin' ? 'admin' : 'praticien') as ParPerso, ...(typeof o.note === 'string' && o.note ? { note: o.note.slice(0, 120) } : {}), reglages: normaliserReglagesPerso(o.reglages) };
  }).filter((h) => h.revision > 0);
  return {
    v: 1,
    revision: Math.max(0, Math.floor(Number(p.revision) || 0)),
    ...(typeof p.le === 'string' ? { le: p.le.slice(0, 40) } : {}),
    ...(p.par === 'admin' || p.par === 'praticien' ? { par: p.par } : {}),
    reglages: normaliserReglagesPerso(p.reglages),
    historique,
  };
}

/** Nouvelle version enregistrée : révision suivante, ajoutée à l'historique (borné aux HISTORIQUE_MAX dernières) */
export function nouvelleVersionPerso(p: PersonnalisationsSite, reglages: ReglagesPerso, par: ParPerso, le: string, note?: string): PersonnalisationsSite {
  const r = normaliserReglagesPerso(reglages);
  const revision = p.revision + 1;
  const version: VersionPerso = { revision, le, par, ...(note ? { note: note.slice(0, 120) } : {}), reglages: r };
  return { v: 1, revision, le, par, reglages: r, historique: [...p.historique, version].slice(-HISTORIQUE_MAX) };
}

/** Version de l'historique (restauration : elle devient une NOUVELLE version, l'historique n'est jamais réécrit) */
export const versionPerso = (p: PersonnalisationsSite, revision: number) => p.historique.find((h) => h.revision === revision) ?? null;

export const estVidePerso = (r: ReglagesPerso) => !r.police && !r.taille && !r.couleurs && !Object.keys(r.images ?? {}).length && !Object.keys(r.pages ?? {}).length;

/** Réglage d'une personnalisation : police, taille, couleurs, couleurs.secondaire, image:<emplacement>, page:<clé> */
export type CleReglage = 'police' | 'taille' | 'couleurs' | 'couleurs.principale' | 'couleurs.secondaire' | `image:${string}` | `page:${string}`;

/** « Revenir au modèle » pour un réglage : il est retiré de la couche (la recette et le pack reprennent la main) */
export function revenirAuModele(r: ReglagesPerso, cle: CleReglage): ReglagesPerso {
  const x: ReglagesPerso = JSON.parse(JSON.stringify(r));
  if (cle === 'police') delete x.police;
  else if (cle === 'taille') delete x.taille;
  else if (cle === 'couleurs') delete x.couleurs;
  else if (cle === 'couleurs.principale') { if (x.couleurs) { delete x.couleurs.gamme; delete x.couleurs.principale; } }
  else if (cle === 'couleurs.secondaire') { if (x.couleurs) delete x.couleurs.secondaire; }
  else if (cle.startsWith('image:')) { if (x.images) delete x.images[cle.slice(6)]; }
  else if (cle.startsWith('page:')) { if (x.pages) delete x.pages[cle.slice(5)]; }
  if (x.couleurs && !Object.keys(x.couleurs).length) delete x.couleurs;
  if (x.images && !Object.keys(x.images).length) delete x.images;
  if (x.pages && !Object.keys(x.pages).length) delete x.pages;
  return x;
}

// ---------------------------------------------------------------------------------------------------------------
// Polices
// ---------------------------------------------------------------------------------------------------------------

/** Note moyenne (★) des paires de polices, lue dans les notes d'assets (clés typo:police:<paire>) */
export function notesPolices(lignes: readonly { cle: string; note: number | null }[]): Record<string, number> {
  const acc: Record<string, number[]> = {};
  for (const l of lignes) {
    const m = /^typo:police:([a-z-]+)$/.exec(l.cle);
    if (m && typeof l.note === 'number') (acc[m[1]] ??= []).push(l.note);
  }
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v.reduce((s, x) => s + x, 0) / v.length]));
}

export type PoliceProposee = { id: string; nom: string; description: string; titres: string; texte: string; note: number | null; modele: boolean };

/**
 * Paires de polices proposées au praticien : celle de la recette (« modèle ») d'abord, puis les paires notées 4-5 ★ et
 * compatibles avec la recette (`compatible` : harmonie, budget du gabarit). Sans aucune note (base neuve) : les paires compatibles
 * de la liste fermée (jamais toutes les polices).
 */
export function policesProposees(opts: { modele?: string | null; notes?: Record<string, number>; compatible?: (id: string) => boolean; max?: number }): PoliceProposee[] {
  const notes = opts.notes ?? {};
  const compatible = opts.compatible ?? (() => true);
  const avecNotes = Object.keys(notes).length > 0;
  const fiche = (p: (typeof PAIRES_POLICES)[number], modele: boolean): PoliceProposee => ({ id: p.id, nom: p.nom, description: p.description, titres: p.titres, texte: p.texte, note: notes[p.id] ?? null, modele });
  const base = pairePolices(opts.modele);
  const autres = PAIRES_POLICES.filter((p) => p.id !== base?.id && compatible(p.id) && (!avecNotes || (notes[p.id] ?? 0) >= 4))
    .sort((a, b) => (notes[b.id] ?? 0) - (notes[a.id] ?? 0));
  return [...(base ? [fiche(base, true)] : []), ...autres.slice(0, opts.max ?? 8).map((p) => fiche(p, false))];
}

// ---------------------------------------------------------------------------------------------------------------
// Taille globale
// ---------------------------------------------------------------------------------------------------------------

/**
 * Feuille de la taille globale (racine <html data-taille>) : les tailles des gabarits sont en rem, la taille racine fait donc
 * suivre TOUTE l'échelle (titres et corps, proportions gardées). Téléphone (< 480 px) : jamais plus petit que le standard (minimum
 * lisible) et « Très grand » ramené à « Plus grand » (les grands titres restent bornés par la largeur : aucun débordement à 360 px).
 * Registre pédagogique (112,5 % de base) : facteur appliqué à sa propre base.
 */
export function cssTaillesTexte(): string {
  const regles: string[] = [];
  for (const t of TAILLES_TEXTE) {
    if (t.id === 'standard') continue;
    const pc = (f: number, base = 100) => `${+(base * f).toFixed(3)}%`;
    regles.push(`html[data-taille='${t.id}']{font-size:${pc(t.facteur)}}html[data-taille='${t.id}'][data-registre='pedagogique']{font-size:${pc(t.facteur, 112.5)}}`);
    regles.push(`@media (max-width:479px){html[data-taille='${t.id}']{font-size:${pc(t.mobile)}}html[data-taille='${t.id}'][data-registre='pedagogique']{font-size:${pc(t.mobile, 112.5)}}}`);
  }
  // Mots longs : jamais de débordement, même agrandis (les mots métier restent insécables : <mot-lie>, lib/typo.mjs)
  regles.push(`html[data-taille] :is(h1,h2,h3,p,li){overflow-wrap:break-word}`);
  return regles.join('');
}

/** Facteur de la taille globale (aperçu de l'admin : zoom du rendu) */
export const facteurTailleTexte = (id: unknown, mobile = false) => { const t = tailleTexte(id); return t ? (mobile ? t.mobile : t.facteur) : 1; };

/** Attribut data-taille de <html> (absent = standard) */
export const attributTaille = (id: unknown): string | undefined => (tailleTexte(id) && id !== 'standard' ? (id as string) : undefined);

/**
 * Estimation du débordement d'un mot sur téléphone (360 px, marges 20 px) : un mot de `n` lettres en intertitre (H2 téléphone :
 * 1,9 rem) dépasse-t-il la largeur ? Les mots composés à trait d'union sont insécables mais réduits par <mot-lie> : ignorés ici.
 */
export function motsTropLongs(textes: readonly string[], taille: unknown, opts: { majuscules?: boolean; largeur?: number } = {}): string[] {
  const largeur = (opts.largeur ?? 360) - 40;
  const px = 1.9 * 16 * facteurTailleTexte(taille, true) * (opts.majuscules ? 0.74 : 1);
  const chasse = 0.58 * (opts.majuscules ? 1.45 : 1);
  const mots = new Set<string>();
  for (const t of textes) for (const m of t.split(/[\s/]+/)) if (!m.includes('-') && m.length * chasse * px > largeur) mots.add(m);
  return [...mots];
}

// ---------------------------------------------------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------------------------------------------------

export type CouleurAjustee = { couleur: string; ajustee: boolean; message: string | null };

/**
 * Couleur principale lisible : texte blanc sur la couleur (boutons) et couleur sur fond blanc (liens) ≥ 4,5:1 (AA). Trop claire :
 * foncée juste assez, même teinte (buildTheme) ; le praticien voit la couleur retenue et le message.
 */
export function ajusterCouleurPrincipale(c: string, fonds: readonly string[] = []): CouleurAjustee {
  if (!HEX.test(c)) return { couleur: GAMMES[0].accent, ajustee: true, message: 'Couleur non reconnue : la couleur du modèle est gardée.' };
  const x = c.toLowerCase();
  const ink = buildTheme(x, [...fonds])['--brand-ink'].toLowerCase();
  if (ink === x) return { couleur: x, ajustee: false, message: null };
  const fort = distance(ink, x) > 60;
  return { couleur: ink, ajustee: true, message: fort ? 'Pour rester lisible (texte blanc sur les boutons, liens sur fond blanc), nous avons nettement foncé votre couleur.' : 'Pour rester lisible, nous avons foncé légèrement votre couleur.' };
}

// Teinte, saturation, luminosité (même calcul que gammes.ts, local : module pur sans dépendance circulaire)
function tsl(c: string): [number, number, number] {
  const [r, v, b] = rvb(c).map((x) => x / 255);
  const max = Math.max(r, v, b), min = Math.min(r, v, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const t = max === r ? (v - b) / d + (v < b ? 6 : 0) : max === v ? (b - r) / d + 2 : (r - v) / d + 4;
  return [t / 6, s, l];
}
function depuisTsl(t: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (x: number) => { const u = x < 0 ? x + 1 : x > 1 ? x - 1 : x; return u < 1 / 6 ? p + (q - p) * 6 * u : u < 1 / 2 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p; };
  return hex([f(t + 1 / 3), f(t), f(t - 1 / 3)].map((x) => x * 255));
}

/**
 * Couleur secondaire : pastilles, pictos et soulignés (élément graphique ≥ 3:1 sur blanc) et teinte très pâle des sections
 * alternées. Trop claire pour être vue sur blanc : foncée (même teinte).
 */
/** Remarque douce sur une couleur peu courante pour un cabinet de santé (rouge vif, fuchsia, fluo) : jamais bloquante */
export function remarqueCouleur(c: string): string | null {
  if (!HEX.test(c)) return null;
  const [t, s, l] = tsl(c);
  const h = t * 360;
  if (s > 0.6 && l > 0.25 && l < 0.75 && (h < 15 || h > 285)) return 'Couleur très vive, peu courante pour un cabinet de santé : vérifiez qu’elle vous ressemble (une gamme plus douce rassure souvent les patients).';
  if (s > 0.85 && l > 0.45 && h > 60 && h < 170) return 'Couleur fluo : elle peut fatiguer la lecture ; une teinte plus douce est souvent plus confortable.';
  return null;
}

export function ajusterCouleurSecondaire(c: string): CouleurAjustee {
  if (!HEX.test(c)) return { couleur: '', ajustee: true, message: 'Couleur non reconnue.' };
  let x = c.toLowerCase();
  const [t, s, l0] = tsl(x);
  for (let l = l0; l > 0.05 && contraste(x, NEUTRES.blanc) < 3; l -= 0.01) x = depuisTsl(t, Math.min(s, 0.85), l);
  return x === c.toLowerCase() ? { couleur: x, ajustee: false, message: null } : { couleur: x, ajustee: true, message: 'Pour rester visible sur fond blanc, nous avons foncé légèrement votre couleur secondaire.' };
}

/** Accent effectif d'un site (couleur des liens et des boutons) : celui de la gamme, sinon la couleur libre rendue lisible */
export const accentDuTheme = (theme: { couleur: string; gamme?: string | null }) => (gammeParIdentifiant(theme.gamme)?.accent ?? buildTheme(HEX.test(theme.couleur) ? theme.couleur : GAMMES[0].accent)['--brand-ink']);

/** Fond pâle des sections alternées dérivé de la couleur secondaire : encre et accent y restent ≥ 4,5:1 */
export function fondSecondaire(secondaire: string, accent: string): string {
  const [t, s] = tsl(secondaire);
  let l = 0.95, x = depuisTsl(t, Math.min(s, 0.55), l);
  while (l < 0.99 && (contraste(NEUTRES.encre, x) < 4.5 || contraste(accent, x) < 4.5 || contraste(NEUTRES.encrePale, x) < 4.5)) { l += 0.005; x = depuisTsl(t, Math.min(s, 0.55), l); }
  return x;
}

/**
 * Variables CSS de la couleur secondaire (appliquées APRÈS celles du thème et du gabarit) : duo (pastilles, pictos, soulignés,
 * dérivés lisibles de variantesGamme) et fond des sections alternées. Vide sans couleur secondaire.
 */
export function variablesSecondaire(theme: { couleur: string; gamme?: string | null; couleurSecondaire?: string | null }): Record<string, string> {
  const c = theme.couleurSecondaire;
  if (!c || !HEX.test(c)) return {};
  const accent = accentDuTheme(theme);
  const doux = fondSecondaire(c, accent);
  const g: Gamme = { id: 'perso', nom: 'Personnalisée', accent, accentFonce: accent, fond: NEUTRES.blanc, fondDoux: doux, plan: NEUTRES.encreNuit, signal: c, vif: gammeParIdentifiant(theme.gamme)?.vif ?? accent, duo: c };
  const v = variantesGamme(g);
  return { '--duo': v.duo, '--duo-texte': v.duoTexte, '--duo-pale': v.duoPale, '--duo-ligne': v.duoLigne, '--duo-fonce': v.duoFonce, '--doux': doux, '--g-bulle': v.duoPale };
}

/** Gammes proposées (couleurs principales) : toutes les gammes de la charte, contrôlées AA (controle:charte) */
export const gammesProposees = () => GAMMES.map((g) => ({ id: g.id, nom: g.nom, accent: g.accent, duo: g.duo ?? null, fondDoux: g.fondDoux, famille: g.famille ?? 'sobre' }));

/** Couleurs secondaires suggérées : duos des gammes vitaminées et teintes douces des gammes sobres, rendues visibles */
export const SECONDAIRES_SUGGEREES = ['#3fd0a0', '#f2df3a', '#ff5d73', '#ffb547', '#6f4cff', '#9fd3ff', '#c8f0a8', '#f2b880', '#f5b8de'].map((c) => ajusterCouleurSecondaire(c).couleur);

// ---------------------------------------------------------------------------------------------------------------
// Blocs des pages de contenus
// ---------------------------------------------------------------------------------------------------------------

/** Règles réglementaires d'un pack profession : intertitres de section et questions verrouillés */
export type ReglesReglementaires = { sections: RegExp; questions: RegExp; raison: string };
const REGLES_SANTE: ReglesReglementaires = {
  sections: /prise en charge|rembours|tarif|conventionn|honoraires|assurance maladie|mentions/i,
  questions: /rembours|ordonnance|prescription|assurance maladie|prise en charge|conventionn|mutuelle|compl[ée]mentaire/i,
  raison: 'Information réglementaire de votre profession (remboursement, prescription, tarifs) : texte relu et vérifié sur ameli.fr, il reste tel quel et ne peut pas être supprimé.',
};
/** Règles par profession (pack profession) ; défaut : santé (podologie) */
export const REGLES_REGLEMENTAIRES: Record<string, ReglesReglementaires> = { podologue: REGLES_SANTE };
export const reglesReglementaires = (profession?: string | null) => REGLES_REGLEMENTAIRES[profession ?? ''] ?? REGLES_SANTE;

const RE_LISTE = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** Découpe un texte Markdown du catalogue (corps d'un soin) et sa FAQ en blocs du modèle (m0, m1…), verrous compris */
export function blocsDuModele(corps: string, faq: readonly Faq[] = [], profession?: string | null): Bloc[] {
  const regles = reglesReglementaires(profession);
  const morceaux: string[] = [];
  for (const brut of String(corps ?? '').replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lignes = brut.split('\n').filter((l) => l.trim());
    // Intertitre collé à son paragraphe : séparé
    while (lignes.length > 1 && /^#{2,3}\s/.test(lignes[0])) morceaux.push(lignes.shift()!);
    if (lignes.length) morceaux.push(lignes.join('\n'));
  }
  const blocs: Bloc[] = [];
  let sectionVerrouillee = false;
  for (const m of morceaux) {
    const id = `m${blocs.length}`;
    const h = /^(#{2,3})\s+(.+)$/.exec(m);
    if (h) {
      sectionVerrouillee = regles.sections.test(h[2]);
      blocs.push({ id, type: 'intertitre', texte: h[2].trim(), niveau: h[1].length === 3 ? 3 : 2, ...(sectionVerrouillee ? { verrou: { raison: regles.raison } } : {}) });
      continue;
    }
    const lignes = m.split('\n');
    const verrou = sectionVerrouillee ? { verrou: { raison: regles.raison } } : {};
    if (lignes.every((l) => RE_LISTE.test(l))) blocs.push({ id, type: 'liste', texte: '', items: lignes.map((l) => l.replace(RE_LISTE, '').trim()), ...(/^\s*\d/.test(lignes[0]) ? { ordonnee: true } : {}), ...verrou });
    else if (lignes.every((l) => /^>\s?/.test(l))) blocs.push({ id, type: 'encadre', texte: lignes.map((l) => l.replace(/^>\s?/, '')).join('\n').trim(), ...verrou });
    else blocs.push({ id, type: 'paragraphe', texte: m.trim(), ...verrou });
  }
  for (const f of faq) {
    const id = `m${blocs.length}`;
    blocs.push({ id, type: 'question', texte: f.q, reponse: f.r, ...(regles.questions.test(`${f.q} ${f.r}`) ? { verrou: { raison: regles.raison } } : {}) });
  }
  return blocs;
}

/**
 * Blocs effectifs d'une page : ceux enregistrés par le praticien (références au modèle résolues sur le texte À JOUR du catalogue,
 * blocs modifiés, blocs ajoutés), puis RÉINJECTION des blocs verrouillés du modèle absents (jamais supprimés, même par une donnée
 * forgée) ; un bloc verrouillé modifié reprend le texte du modèle. Une référence à un bloc disparu du modèle est ignorée.
 */
export function blocsEffectifs(modele: readonly Bloc[], stockes: readonly BlocStocke[] | undefined): Bloc[] {
  if (!stockes) return modele.map((b) => ({ ...b }));
  const parId = new Map(modele.map((b) => [b.id, b]));
  const r: Bloc[] = [];
  for (const s of stockes) {
    const m = parId.get(s.id);
    if ('ref' in s) { if (m) r.push({ ...m }); continue; }
    if (m?.verrou) { r.push({ ...m }); continue; }
    r.push({ ...s });
  }
  // Blocs verrouillés manquants : remis après le bloc du modèle qui les précède (sinon en tête)
  for (const [i, m] of modele.entries()) {
    if (!m.verrou || r.some((b) => b.id === m.id)) continue;
    let pos = 0;
    for (let k = i - 1; k >= 0; k--) { const j = r.findIndex((b) => b.id === modele[k].id); if (j >= 0) { pos = j + 1; break; } }
    r.splice(pos, 0, { ...m });
  }
  // Doublons d'identifiant (donnée forgée) : le premier gardé
  const vus = new Set<string>();
  return r.filter((b) => (vus.has(b.id) ? false : (vus.add(b.id), true)));
}

/** Blocs à enregistrer : un bloc du modèle inchangé devient une référence (il suivra les améliorations du catalogue) */
export function blocsAStocker(modele: readonly Bloc[], blocs: readonly Bloc[]): BlocStocke[] {
  const parId = new Map(modele.map((b) => [b.id, b]));
  const pareil = (a: Bloc, b: Bloc) => a.type === b.type && a.texte === b.texte && (a.reponse ?? '') === (b.reponse ?? '') && JSON.stringify(a.items ?? []) === JSON.stringify(b.items ?? []) && Boolean(a.ordonnee) === Boolean(b.ordonnee);
  return blocs.map((b) => { const m = parId.get(b.id); if (m && (m.verrou || pareil(m, b))) return { id: b.id, ref: true as const }; const { verrou: _v, ...x } = b; return x; });
}

/** Page enregistrée identique au modèle (mêmes blocs, même ordre, tous des références) : rien à garder */
export const pageCommeLeModele = (modele: readonly Bloc[], stockes: readonly BlocStocke[]) =>
  stockes.length === modele.length && stockes.every((s, i) => 'ref' in s && s.id === modele[i].id);

/** Blocs → corps Markdown et FAQ (format du catalogue : le rendu des pages ne change pas) */
export function contenuDesBlocs(blocs: readonly Bloc[]): { corps: string; faq: Faq[] } {
  const parties: string[] = [];
  const faq: Faq[] = [];
  for (const b of blocs) {
    if (b.type === 'question') { faq.push({ q: b.texte, r: b.reponse ?? '' }); continue; }
    if (b.type === 'intertitre') parties.push(`${b.niveau === 3 ? '###' : '##'} ${b.texte}`);
    else if (b.type === 'liste') parties.push((b.items ?? []).map((x, i) => `${b.ordonnee ? `${i + 1}.` : '-'} ${x}`).join('\n'));
    else if (b.type === 'encadre') parties.push(b.texte.split('\n').map((l) => `> ${l}`).join('\n'));
    else parties.push(b.texte);
  }
  return { corps: parties.join('\n\n'), faq };
}

/**
 * Catalogue des soins avec les pages personnalisées (corps et FAQ remplacés par les blocs effectifs) ; rien d'autre ne change
 * (titre, résumé, H1 et données structurées gardés). Appliqué à la construction AVANT les remplacements {ville}.
 */
export function pagesPersonnalisees<T extends { slug: string; corps?: string; faq?: Faq[] }>(catalogue: readonly T[], reglages: ReglagesPerso | null | undefined, profession?: string | null): T[] {
  const pages = reglages?.pages ?? {};
  if (!Object.keys(pages).length) return [...catalogue];
  return catalogue.map((s) => {
    const stockes = pages[`soin:${s.slug}`];
    if (!stockes) return s;
    const { corps, faq } = contenuDesBlocs(blocsEffectifs(blocsDuModele(s.corps ?? '', s.faq ?? [], profession), stockes));
    return { ...s, corps, ...(s.faq !== undefined || faq.length ? { faq } : {}) };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Lexique : avertissements doux et reformulations
// ---------------------------------------------------------------------------------------------------------------

const AVIS: { motif: RegExp; raison: string; suggestion: string }[] = [
  { motif: /\bsoign(?:e|es|ent|ons|ez)\s+(?:d[ée]finitivement|tout|toutes?)\b|\bd[ée]finitivement\b/gi, raison: 'Promesse de résultat', suggestion: 'Décrivez la prise en charge : « nous prenons en charge… », « le soin vise à… ».' },
  { motif: /\b(?:le|la|les)\s+plus\s+(?:r[ée]put[ée]|connu|comp[ée]tent|exp[ée]riment[ée]|qualifi[ée]|recommand[ée])e?s?(?![a-zà-ÿ])|\br[ée]put[ée]e?s?(?![a-zà-ÿ])/gi, raison: 'Superlatif ou réputation revendiquée', suggestion: 'Présentez plutôt les formations suivies et l’expérience, sans comparaison.' },
  { motif: /\bavis\s+(?:de\s+(?:nos|mes|ses)\s+)?patients?\b|\bt[ée]moignages?\b|\b[0-5](?:[.,]\d)?\s?\/\s?5\b|\b\d\s?[ée]toiles\b|\bpatients?\s+satisfaits?\b|\brecommand[ée]e?s?\s+par\b/gi, raison: 'Avis ou témoignages de patients (interdits sur le site d’un professionnel de santé)', suggestion: 'Décrivez plutôt le déroulement du soin et ce que le cabinet propose.' },
];
const SUGGESTIONS_INTERDITS: Record<string, string> = {
  'Superlatif comparatif': 'Dites précisément ce que fait le cabinet : « formé à… », « équipé de… ».',
  'Revendication de primauté': 'Retirez la comparaison ; présentez l’expérience ou les formations.',
  'Promesse de résultat': 'Parlez d’objectif : « vise à soulager », « aide à… ».',
  'Formulation publicitaire': 'Préférez une description factuelle du soin.',
  'Promesse sur le ressenti du patient': 'Expliquez comment le confort est recherché pendant le soin.',
  'Promesse de délai ou de résultat': 'Indiquez que la durée dépend de chaque situation.',
  'Prix promotionnel': 'Indiquez les tarifs sans réduction ni offre.',
  'Engagement impossible à garantir': 'Indiquez comment prendre rendez-vous.',
};

export type AvertissementTexte = Alerte & { reformulation?: string };

/** Avertissements doux d'un texte (jamais bloquants à la saisie) : promesses, « guérir », superlatifs, avis ; reformulation proposée */
export function avertissementsTexte(t: string): AvertissementTexte[] {
  const r: AvertissementTexte[] = verifierTexte(t, 'standard').map((a) => ({ ...a, bloquante: false, suggestion: a.suggestion ?? SUGGESTIONS_INTERDITS[a.raison] }));
  for (const a of AVIS) for (const m of t.matchAll(a.motif)) r.push({ extrait: m[0], raison: a.raison, suggestion: a.suggestion, bloquante: false });
  const ref = reformuler(t);
  return ref !== t ? r.map((a) => ({ ...a, reformulation: ref })) : r;
}

/** Reformulation automatique : remplacements du lexique (« guérir » → « prendre en charge »…) */
export function reformuler(t: string): string {
  let x = t;
  for (const [motif, preferer] of PREFERER) if (!/podologue/.test(preferer)) x = x.replace(motif, preferer);
  return x;
}

// ---------------------------------------------------------------------------------------------------------------
// Application (aperçu de l'admin, construction des sites)
// ---------------------------------------------------------------------------------------------------------------

/** Réglages d'un brouillon (clé personnalisations), ou ceux passés en option */
export const reglagesDuDraft = (d: unknown): ReglagesPerso => lirePersonnalisations(d).reglages;

/**
 * Brouillon personnalisé (COPIE ; le brouillon enregistré n'est jamais modifié) : la couche du praticien passe en dernier.
 * `publication` (construction des sites) : les images « Démo » (banque/ia/demo-…) ne sont jamais posées, ni par la couche ni
 * depuis le brouillon (elles restent visibles, signalées, dans l'aperçu de l'admin).
 */
export function appliquerPersonnalisations(d: SiteDraft, opts: { reglages?: ReglagesPerso | null; publication?: boolean } = {}): DraftPersonnalise {
  const r = opts.reglages ? normaliserReglagesPerso(opts.reglages) : reglagesDuDraft(d);
  const x = JSON.parse(JSON.stringify(d)) as DraftPersonnalise;
  const t = x.theme;
  if (r.police) t.police = r.police;
  if (r.taille) t.taille = r.taille;
  if (r.couleurs?.gamme) { const g = gammeParIdentifiant(r.couleurs.gamme)!; t.gamme = g.id; t.couleur = g.accent; }
  else if (r.couleurs?.principale) { t.gamme = ''; t.couleur = ajusterCouleurPrincipale(r.couleurs.principale).couleur; }
  if (r.couleurs?.secondaire) t.couleurSecondaire = ajusterCouleurSecondaire(r.couleurs.secondaire).couleur;
  const sansDemo = (u: string | undefined) => (u && !(opts.publication && estImageNonPubliable(u)) ? u : '');
  for (const [e, choix] of Object.entries(r.images ?? {})) {
    const u = sansDemo(choix.url);
    if (!u) continue;
    let m: RegExpExecArray | null;
    if (e === 'accueil') { x.photos.accueil = u; t.accueilPhoto = true; }
    else if (e === 'panorama') x.photos.panorama = u;
    else if ((m = /^cabinet:(\d)$/.exec(e))) { const c = [...x.photos.cabinet]; c[Number(m[1])] = u; x.photos.cabinet = c.map((y) => y ?? ''); }
    else if ((m = /^soin:(.+)$/.exec(e))) x.photos.soins = { ...(x.photos.soins ?? {}), [m[1]]: u };
    else if ((m = /^sujet:(.+)$/.exec(e))) x.photos.sujets = { ...(x.photos.sujets ?? {}), [m[1]]: u };
    else if ((m = /^portrait:(\d)$/.exec(e)) && x.praticiens[Number(m[1])]) {
      const p = x.praticiens[Number(m[1])];
      p.photo = u;
      delete p.portrait; // rendus du studio portrait : ceux de l'ancienne photo
    }
  }
  if (opts.publication) {
    x.photos.accueil = sansDemo(x.photos.accueil);
    x.photos.panorama = sansDemo(x.photos.panorama);
    for (const p of x.praticiens) if (estImageNonPubliable(p.photo)) { p.photo = ''; delete p.portrait; }
    if (x.photos.soins) x.photos.soins = Object.fromEntries(Object.entries(x.photos.soins).filter(([, u]) => !estImageNonPubliable(u)));
    if (x.photos.sujets) x.photos.sujets = Object.fromEntries(Object.entries(x.photos.sujets).filter(([, u]) => !estImageNonPubliable(u)));
    if (x.theme.photosRecette) x.theme.photosRecette = x.theme.photosRecette.filter((u) => !estImageNonPubliable(u));
  }
  x.photos.cabinet = x.photos.cabinet.filter((u) => u && !(opts.publication && estImageNonPubliable(u)));
  return x;
}

// ---------------------------------------------------------------------------------------------------------------
// Contrôles (praticien, admin / commercial)
// ---------------------------------------------------------------------------------------------------------------

export type DomainePerso = 'police' | 'taille' | 'couleurs' | 'images' | 'textes';
export type AlertePerso = { niveau: 'casse-charte' | 'attention' | 'info'; domaine: DomainePerso; cle?: string; message: string };

/**
 * Contrôles d'une personnalisation : ce qui casse la charte (contraste, débordement, H1, bloc réglementaire) et ce qui mérite
 * attention (images démo, textes, longueur). `contexte` : titres et mots des pages (débordement), casse des titres.
 */
export function controlerPersonnalisations(reglages: ReglagesPerso, contexte: { titres?: readonly string[]; majuscules?: boolean; modele?: Record<string, Bloc[]>; profession?: string | null; nomsPages?: Record<string, string> } = {}): AlertePerso[] {
  const r = reglages;
  const libellePage = (cle: string) => (contexte.nomsPages?.[cle] ? `Page « ${contexte.nomsPages[cle]} »` : libellePageDefaut(cle));
  const a: AlertePerso[] = [];
  if (r.couleurs?.principale) {
    const c = r.couleurs.principale;
    if (contraste(NEUTRES.blanc, c) < 4.5 || contraste(c, NEUTRES.blanc) < 4.5) a.push({ niveau: 'casse-charte', domaine: 'couleurs', cle: 'couleurs.principale', message: `Couleur principale ${c} : contraste ${contraste(NEUTRES.blanc, c).toFixed(2)}:1 avec le texte blanc (minimum 4,5:1). Le site utilise automatiquement ${ajusterCouleurPrincipale(c).couleur}.` });
  }
  if (r.couleurs?.secondaire && contraste(r.couleurs.secondaire, NEUTRES.blanc) < 3) a.push({ niveau: 'attention', domaine: 'couleurs', cle: 'couleurs.secondaire', message: `Couleur secondaire ${r.couleurs.secondaire} peu visible sur fond blanc : foncée automatiquement en ${ajusterCouleurSecondaire(r.couleurs.secondaire).couleur}.` });
  if (r.taille) {
    const longs = motsTropLongs(contexte.titres ?? [], r.taille, { majuscules: contexte.majuscules });
    if (longs.length) a.push({ niveau: 'casse-charte', domaine: 'taille', cle: 'taille', message: `Taille « ${tailleTexte(r.taille)?.nom} » : mot trop long pour un téléphone (360 px) : ${longs.slice(0, 3).join(', ')}.` });
    if (r.taille === 'petite') a.push({ niveau: 'info', domaine: 'taille', cle: 'taille', message: 'Taille « Plus petit » : appliquée sur ordinateur seulement ; sur téléphone, les textes gardent la taille standard (lisibilité).' });
  }
  for (const [e, im] of Object.entries(r.images ?? {})) {
    if (estImageDemo(im.url)) a.push({ niveau: 'attention', domaine: 'images', cle: `image:${e}`, message: `Image « Démo » (${libelleEmplacementPerso(e)}) : visible dans l’aperçu seulement, jamais publiée. Remplacez-la.` });
  }
  for (const [cle, stockes] of Object.entries(r.pages ?? {})) {
    const modele = contexte.modele?.[cle];
    const blocs = modele ? blocsEffectifs(modele, stockes) : stockes.filter((b): b is Bloc => !('ref' in b));
    if (modele) {
      if (!blocs.some((b) => b.type === 'intertitre') && modele.some((b) => b.type === 'intertitre')) a.push({ niveau: 'attention', domaine: 'textes', cle: `page:${cle}`, message: `${libellePage(cle)} : plus aucun intertitre. Gardez au moins un intertitre (référencement, lecture sur téléphone).` });
      const verrous = modele.filter((b) => b.verrou).map((b) => b.id);
      const manquants = verrous.filter((id) => !stockes.some((s) => s.id === id));
      if (manquants.length) a.push({ niveau: 'info', domaine: 'textes', cle: `page:${cle}`, message: `${libellePage(cle)} : ${manquants.length} bloc(s) réglementaire(s) remis automatiquement.` });
    }
    const mots = blocs.map((b) => [b.texte, b.reponse ?? '', ...(b.items ?? [])].join(' ')).join(' ').split(/\s+/).filter(Boolean).length;
    if (mots > 1800) a.push({ niveau: 'attention', domaine: 'textes', cle: `page:${cle}`, message: `${libellePage(cle)} : texte très long (${mots} mots). Au-delà de 1 500 mots, la page se lit mal sur téléphone.` });
    if (mots < 60) a.push({ niveau: 'attention', domaine: 'textes', cle: `page:${cle}`, message: `${libellePage(cle)} : texte très court (${mots} mots) : la page risque d’être mal référencée.` });
    const alertes = blocs.flatMap((b) => avertissementsTexte([b.texte, b.reponse ?? '', ...(b.items ?? [])].join('\n')));
    if (alertes.length) a.push({ niveau: 'attention', domaine: 'textes', cle: `page:${cle}`, message: `${libellePage(cle)} : ${alertes.length} formulation(s) à revoir (${[...new Set(alertes.map((x) => `« ${x.extrait} »`))].slice(0, 3).join(', ')}).` });
    const longs = motsTropLongs(blocs.filter((b) => b.type === 'intertitre').map((b) => b.texte), r.taille ?? 'standard', { majuscules: contexte.majuscules });
    if (longs.length) a.push({ niveau: 'casse-charte', domaine: 'textes', cle: `page:${cle}`, message: `${libellePage(cle)} : mot trop long dans un intertitre pour un téléphone : ${longs.slice(0, 3).join(', ')}.` });
  }
  return a;
}

/** La personnalisation casse-t-elle la charte (alerte côté admin / commercial) ? */
export const casseLaCharte = (alertes: readonly AlertePerso[]) => alertes.some((x) => x.niveau === 'casse-charte');

// ---------------------------------------------------------------------------------------------------------------
// Libellés (praticien, admin)
// ---------------------------------------------------------------------------------------------------------------

export function libelleEmplacementPerso(e: string): string {
  if (e === 'accueil') return 'Premier écran';
  if (e === 'panorama') return 'Bandeau photo';
  if (e.startsWith('sujet:')) return `Sujet : ${e.slice(6).replace(/-/g, ' ')}`;
  if (e.startsWith('soin:')) return `Soin : ${e.slice(5).replace(/-/g, ' ')}`;
  if (e.startsWith('cabinet:')) return `Cabinet, photo ${Number(e.slice(8)) + 1}`;
  if (e.startsWith('portrait:')) return `Portrait ${Number(e.slice(9)) + 1}`;
  return e;
}
export const libellePageDefaut = (cle: string) => (cle.startsWith('soin:') ? `Page « ${cle.slice(5).replace(/-/g, ' ')} »` : cle);

/** Recadrage et dimensions minimales par emplacement (largeur / hauteur, pixels) */
export function formatEmplacement(e: string): { ratio: number; min: [number, number] } {
  if (e === 'accueil') return { ratio: 3 / 2, min: [1200, 800] };
  if (e === 'panorama') return { ratio: 21 / 9, min: [1400, 600] };
  if (e.startsWith('portrait:')) return { ratio: 4 / 5, min: [600, 750] };
  return { ratio: 4 / 3, min: [900, 675] };
}

/** Résumé lisible des réglages (admin / commercial, historique) */
export function resumePersonnalisations(r: ReglagesPerso, nomsPages: Record<string, string> = {}): { cle: CleReglage; libelle: string; valeur: string }[] {
  const l: { cle: CleReglage; libelle: string; valeur: string }[] = [];
  if (r.police) l.push({ cle: 'police', libelle: 'Police', valeur: pairePolices(r.police)?.nom ?? r.police });
  if (r.taille) l.push({ cle: 'taille', libelle: 'Taille des textes', valeur: tailleTexte(r.taille)?.nom ?? r.taille });
  if (r.couleurs?.gamme) l.push({ cle: 'couleurs.principale', libelle: 'Couleur principale', valeur: `Gamme ${gammeParIdentifiant(r.couleurs.gamme)?.nom ?? r.couleurs.gamme}` });
  if (r.couleurs?.principale) l.push({ cle: 'couleurs.principale', libelle: 'Couleur principale', valeur: r.couleurs.principale });
  if (r.couleurs?.secondaire) l.push({ cle: 'couleurs.secondaire', libelle: 'Couleur secondaire', valeur: r.couleurs.secondaire });
  for (const [e, im] of Object.entries(r.images ?? {})) l.push({ cle: `image:${e}`, libelle: libelleEmplacementPerso(e), valeur: `${im.source === 'televersee' ? 'Image envoyée' : 'Image du kit'}${estImageDemo(im.url) ? ' (Démo, non publiée)' : ''}` });
  for (const [c, b] of Object.entries(r.pages ?? {})) l.push({ cle: `page:${c}`, libelle: nomsPages[c] ? `Page « ${nomsPages[c]} »` : libellePageDefaut(c), valeur: `${b.filter((x) => !('ref' in x)).length} bloc(s) modifié(s) ou ajouté(s), ${b.length} au total` });
  return l;
}

/** Champs de la couche à reporter dans le thème du site assemblé (SiteConfig.theme) : taille globale, couleur secondaire */
export function extrasThemePerso(t: object): ThemePerso {
  const x = t as ThemePerso;
  return { ...(tailleTexte(x.taille) && x.taille !== 'standard' ? { taille: x.taille } : {}), ...(typeof x.couleurSecondaire === 'string' && HEX.test(x.couleurSecondaire) ? { couleurSecondaire: x.couleurSecondaire } : {}), ...(x.accueilPhoto === true ? { accueilPhoto: true as const } : {}) };
}

/** Aperçu de l'admin (tailles en pixels) : taille globale rendue par un zoom de la racine, largeur compensée (aucun débordement) */
export function styleTaillePerso(t: object, mobile: boolean): Record<string, string | number> {
  const f = facteurTailleTexte((t as ThemePerso).taille, mobile);
  return f === 1 ? {} : { zoom: f, width: `${+(100 / f).toFixed(4)}%` };
}
