// CHAÎNE DE PRODUCTION DES MODÈLES (décision de Paul du 2026-10-09) : FORMAT COMMUN des tickets et des résultats de test.
//
// Ce module est le CONTRAT entre :
// - la chaîne (chaine-modeles.ts, /admin/chaine) : fiches de modèles versionnées, révision page par page, tickets, versions ;
// - le TESTEUR AUTOMATIQUE de modèles (agent « testeur de modèles ») : il passe sur une VERSION de modèle, page par page et appareil
//   par appareil, et rend un `ResultatTestModele` (verdict + contrôles + tickets techniques qu'il crée seul).
// Tout ce qui est ici est stable : ajouter des valeurs est permis, en retirer ou renommer demande d'aligner les deux côtés.
// Module pur, sans dépendance au navigateur ni à Supabase. Docs : docs/chaine-modeles.md.

/** Pages révisées, UNIFORMES pour tous les modèles (ids = types de page du studio, recettes.ts PAGES_STRUCTURE / colonne page) */
export const PAGES_MODELE = [
  { id: 'accueil', libelle: 'Accueil' },
  { id: 'theme', libelle: 'Page sujet' },
  { id: 'fiche', libelle: 'Fiche soin' },
  { id: 'cabinet', libelle: 'Cabinet' },
  { id: 'acces', libelle: 'Contact et accès' },
  { id: 'article', libelle: 'Article' },
  { id: 'questions', libelle: 'FAQ' },
  { id: 'soins', libelle: 'Liste des soins' },
] as const;
export type PageModele = (typeof PAGES_MODELE)[number]['id'];
export const estPageModele = (x: unknown): x is PageModele => PAGES_MODELE.some((p) => p.id === x);
export const libellePageModele = (id: string) => PAGES_MODELE.find((p) => p.id === id)?.libelle ?? id;

/** Appareils révisés : chaque page est vue sur ordinateur (1440) ET sur mobile (375) */
export const APPAREILS_MODELE = ['ordinateur', 'mobile'] as const;
export type AppareilModele = (typeof APPAREILS_MODELE)[number];
export const estAppareilModele = (x: unknown): x is AppareilModele => (APPAREILS_MODELE as readonly unknown[]).includes(x);
/** Largeur de rendu des captures et des contrôles */
export const LARGEURS_MODELE: Record<AppareilModele, number> = { ordinateur: 1440, mobile: 375 };

/** Zone entourée sur la page (coordonnées normalisées 0-1, même convention que zones.ts) */
export type ZoneTicket = { forme: 'rect' | 'ellipse'; x: number; y: number; l: number; h: number };

/** Origine d'un ticket : un humain (goût) ou le testeur automatique (technique) */
export const ORIGINES_TICKET = ['humain', 'testeur'] as const;
export type OrigineTicket = (typeof ORIGINES_TICKET)[number];

/** Statuts d'un ticket : ouvert → corrigé (nouvelle version) → fermé (revalidé) ; ou sans objet */
export const STATUTS_TICKET = ['ouvert', 'corrige', 'ferme', 'sans-objet'] as const;
export type StatutTicket = (typeof STATUTS_TICKET)[number];

/** Gravité (testeur surtout) : un ticket « bloquant » empêche toujours la validation finale */
export const GRAVITES_TICKET = ['bloquant', 'majeur', 'mineur'] as const;
export type GraviteTicket = (typeof GRAVITES_TICKET)[number];

/**
 * Étiquettes d'un ticket : celles du goût (mêmes ids que zones.ts ETIQUETTES_ZONE) + celles du testeur (techniques).
 * Le testeur peut utiliser n'importe quel id `technique:<controle>` (ex. technique:contraste, technique:debordement-mobile).
 */
export const ETIQUETTES_TICKET_GOUT = ['a-revoir', 'couleur', 'texte', 'alignement', 'coupe', 'trop-charge', 'illisible', 'image', 'espacement', 'typo', 'trop-petit', 'anatomie'] as const;
export const ETIQUETTES_TICKET_TECHNIQUES = [
  'technique:contraste', 'technique:debordement-mobile', 'technique:image-cassee', 'technique:lien-casse', 'technique:police',
  'technique:poids', 'technique:accessibilite', 'technique:mot-coupe', 'technique:texte-manquant', 'technique:console', 'technique:rendu',
] as const;
export const estEtiquetteTicket = (x: unknown): x is string =>
  typeof x === 'string' && ((ETIQUETTES_TICKET_GOUT as readonly string[]).includes(x) || /^technique:[a-z0-9-]{2,40}$/.test(x));

/** Un ticket de modèle : une remarque localisée (page × appareil × zone ou élément) sur une version */
export type TicketModele = {
  /** Numéro lisible, unique dans le modèle (#12) ; attribué par la chaîne à l'enregistrement (0 = pas encore enregistré) */
  numero: number;
  /** Identifiant du modèle (fiche) */
  modele: string;
  page: PageModele;
  appareil: AppareilModele;
  /** Zone entourée (facultative si un élément est cliqué ou si le ticket vaut pour toute la page) */
  zone?: ZoneTicket | null;
  /** Élément cliqué : clé d'ingrédient (`police:…`, `photo:…`, `variante:…`) ou sélecteur CSS stable du rendu (`[data-section=faq]`) */
  element?: string | null;
  etiquette: string;
  commentaire: string;
  origine: OrigineTicket;
  gravite?: GraviteTicket;
  /** Auteur : identifiant de compte (humain) ou « testeur » */
  auteur: string;
  statut: StatutTicket;
  /** Version du modèle où le ticket est ouvert */
  versionOuverture: number;
  /** Version qui le corrige (statut corrige / ferme) */
  versionCorrection?: number | null;
  /** Testeur : identifiant du contrôle à l'origine (permet de refermer seul le ticket quand le contrôle repasse au vert) */
  controle?: string | null;
  creeLe?: string;
  // Champs FACULTATIFS du testeur de modèles (testeur-modeles.ts, docs/testeur-modeles.md) : gardés par normaliserTicket
  /** Même défaut ⇒ même empreinte d'une version à l'autre (re-check : corrigé / toujours ouvert / nouveau) */
  empreinte?: string;
  /** Correction proposée */
  suggestion?: string;
  /** technique (mesuré) ou goût (vérification visuelle) */
  categorie?: 'technique' | 'gout';
  /** Jeu de démonstration (profil, ex. sport-basket) où le défaut apparaît */
  jeu?: string | null;
  /** Chemin exact de la page (404, mentions…) et largeur de rendu (px) */
  chemin?: string;
  largeur?: number | null;
  /** Mesure et seuil (« 3,2:1 », « ≥ 4,5:1 ») */
  mesure?: string | null;
  seuil?: string | null;
  /** Vignette de la zone (et de la version précédente au re-check), chemin relatif à retours/ */
  vignette?: string | null;
  vignetteAvant?: string | null;
};

/** Verdict d'un contrôle ou d'un test complet */
export const VERDICTS_TEST = ['vert', 'orange', 'rouge'] as const;
export type VerdictTest = (typeof VERDICTS_TEST)[number];

/** Un contrôle automatique (contraste, débordement, images, liens, poids, console…) sur une page × appareil (ou global) */
export type ControleModele = {
  /** Identifiant stable du contrôle (ex. contraste, debordement-mobile, images, liens, poids, console, mots-coupes) */
  id: string;
  libelle: string;
  page?: PageModele | null;
  appareil?: AppareilModele | null;
  verdict: VerdictTest;
  /** Mesure lisible (« ratio 3,9:1 sur le bouton », « 2 images 404 ») */
  detail?: string;
  /** Valeur numérique facultative (score, ratio, octets) */
  valeur?: number | null;
};

/** Résultat d'un passage du testeur sur UNE version de modèle */
export type ResultatTestModele = {
  modele: string;
  version: number;
  verdict: VerdictTest;
  controles: ControleModele[];
  /** Tickets techniques créés par le testeur (origine « testeur », statut « ouvert », numero 0 : numérotés par la chaîne) */
  tickets: TicketModele[];
  /** Date ISO du passage */
  le: string;
  /** Durée du passage en millisecondes (facultatif) */
  dureeMs?: number;
  /** Version de l'outil de test (pour comparer des passages) */
  outil?: string;
};

/** Verdict global d'une liste de contrôles : rouge s'il y en a un rouge, orange s'il y a un orange, sinon vert */
export function verdictGlobal(controles: readonly Pick<ControleModele, 'verdict'>[]): VerdictTest {
  if (controles.some((c) => c.verdict === 'rouge')) return 'rouge';
  if (controles.some((c) => c.verdict === 'orange')) return 'orange';
  return 'vert';
}

/** Lecture tolérante d'un résultat de test (JSON du testeur ou colonne jsonb) ; null s'il est inexploitable */
export function normaliserResultatTest(brut: unknown): ResultatTestModele | null {
  if (!brut || typeof brut !== 'object') return null;
  const r = brut as Record<string, unknown>;
  const version = Number(r.version);
  if (typeof r.modele !== 'string' || !Number.isInteger(version) || version < 1) return null;
  const controles = (Array.isArray(r.controles) ? r.controles : [])
    .filter((c): c is ControleModele => !!c && typeof c === 'object' && typeof (c as ControleModele).id === 'string' && (VERDICTS_TEST as readonly unknown[]).includes((c as ControleModele).verdict))
    .map((c) => ({ ...c, libelle: String(c.libelle ?? c.id) }));
  const tickets = (Array.isArray(r.tickets) ? r.tickets : [])
    .map((t) => normaliserTicket({ ...(t as object), modele: r.modele, origine: 'testeur', auteur: 'testeur' }))
    .filter((t): t is TicketModele => t !== null);
  const verdict = (VERDICTS_TEST as readonly unknown[]).includes(r.verdict) ? (r.verdict as VerdictTest) : verdictGlobal(controles);
  return { modele: r.modele, version, verdict, controles, tickets, le: typeof r.le === 'string' ? r.le : new Date(0).toISOString(), dureeMs: typeof r.dureeMs === 'number' ? r.dureeMs : undefined, outil: typeof r.outil === 'string' ? r.outil : undefined };
}

const VIGNETTE = /^tests-modeles\/[\w.-]+\/[\w.-]+\.(jpe?g|png|webp)$/;
/** Champs facultatifs du testeur, lus seulement s'ils sont présents et bien formés */
function champsTesteur(t: Record<string, unknown>): Partial<TicketModele> {
  const c: Partial<TicketModele> = {};
  const texte = (x: unknown, n: number) => (typeof x === 'string' ? x.slice(0, n) : undefined);
  if (typeof t.empreinte === 'string' && /^[0-9a-f]{8}$/.test(t.empreinte)) c.empreinte = t.empreinte;
  if (texte(t.suggestion, 400)) c.suggestion = texte(t.suggestion, 400);
  if (t.categorie === 'technique' || t.categorie === 'gout') c.categorie = t.categorie;
  if (typeof t.chemin === 'string' && /^\/[\w./-]{0,200}$/.test(t.chemin)) c.chemin = t.chemin;
  if (typeof t.jeu === 'string' && /^[a-z0-9~.+_-]{1,80}$/.test(t.jeu)) c.jeu = t.jeu;
  if (typeof t.largeur === 'number' && t.largeur > 0 && t.largeur < 5000) c.largeur = t.largeur;
  if (texte(t.mesure, 120)) c.mesure = texte(t.mesure, 120);
  if (texte(t.seuil, 120)) c.seuil = texte(t.seuil, 120);
  if (typeof t.vignette === 'string' && VIGNETTE.test(t.vignette)) c.vignette = t.vignette;
  if (typeof t.vignetteAvant === 'string' && VIGNETTE.test(t.vignetteAvant)) c.vignetteAvant = t.vignetteAvant;
  return c;
}

const borne01 = (x: unknown) => Math.min(1, Math.max(0, Number(x) || 0));

/** Lecture tolérante d'un ticket ; null s'il manque page, appareil ou étiquette valides */
export function normaliserTicket(brut: unknown): TicketModele | null {
  if (!brut || typeof brut !== 'object') return null;
  const t = brut as Record<string, unknown>;
  if (!estPageModele(t.page) || !estAppareilModele(t.appareil) || !estEtiquetteTicket(t.etiquette)) return null;
  const z = t.zone as Record<string, unknown> | null | undefined;
  const zone: ZoneTicket | null = z && typeof z === 'object' ? { forme: z.forme === 'ellipse' ? 'ellipse' : 'rect', x: borne01(z.x), y: borne01(z.y), l: borne01(z.l), h: borne01(z.h) } : null;
  const origine: OrigineTicket = t.origine === 'testeur' ? 'testeur' : 'humain';
  // Champs en plus (empreinte, suggestion… du testeur) conservés tels quels : le format peut s'enrichir sans casser la lecture
  return {
    ...(t as object),
    numero: Number.isInteger(t.numero) ? (t.numero as number) : 0,
    modele: String(t.modele ?? ''),
    page: t.page,
    appareil: t.appareil,
    zone,
    element: typeof t.element === 'string' ? t.element.slice(0, 200) : null,
    etiquette: t.etiquette,
    commentaire: String(t.commentaire ?? '').slice(0, 500),
    origine,
    gravite: (GRAVITES_TICKET as readonly unknown[]).includes(t.gravite) ? (t.gravite as GraviteTicket) : origine === 'testeur' ? 'majeur' : undefined,
    auteur: String(t.auteur ?? (origine === 'testeur' ? 'testeur' : '')),
    statut: (STATUTS_TICKET as readonly unknown[]).includes(t.statut) ? (t.statut as StatutTicket) : 'ouvert',
    versionOuverture: Number.isInteger(t.versionOuverture) ? (t.versionOuverture as number) : 1,
    versionCorrection: Number.isInteger(t.versionCorrection) ? (t.versionCorrection as number) : null,
    controle: typeof t.controle === 'string' ? t.controle : null,
    creeLe: typeof t.creeLe === 'string' ? t.creeLe : undefined,
    ...champsTesteur(t),
  };
}
