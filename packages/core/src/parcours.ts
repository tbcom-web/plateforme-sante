// Parcours guidé de création du site (/creer dans l'admin) : le praticien CHOISIT un modèle dans un catalogue court
// puis AFFINE quelques éléments, une étape par écran, avec une recommandation par défaut à chaque étape
// (décision de Paul, 2026-10-05 : « prescriptif et didactique, sinon on le perd »).
//
// Fonctions pures, testées (scripts/tests.mjs) : univers proposés et recommandés, choix de la couleur, soins à mettre
// en avant (3 au plus, dans l'ordre), horaires simplifiés, étape de reprise et aide courte de chaque étape (reprise des
// fiches conseils). L'identité du cabinet n'est jamais modifiée par le choix d'un modèle (appliquerUnivers).

import { appliquerUnivers, CATALOGUE_UNIVERS, SUJETS_FICHES_CONSEILS, type ResultatUnivers, type Univers } from './catalogue-univers';
import { FICHES_CONSEILS } from './conseils';
import { controlerPublication } from './controles';
import { JOURS, type SiteDraft } from './draft';
import { GAMMES, variantesGamme, type Gamme } from './gammes';
import type { ModeleManifeste } from './modeles';
import type { Horaire } from './types';
import { horaireDe, lirePlages, plagesDe } from './horaires';
import { appliquerPriorites, soinsDesPriorites, soinsEnAvantDesPriorites, universDesPriorites } from './themes';

/**
 * Les quatre modèles du parcours, dans l'ordre d'affichage : quatre sites vraiment différents, personnalisables par les
 * couleurs (Tableau « Clair et pratique », Village « Simple et proche », Revue « Élégant et sobre », Technique « Technique
 * et précis » : le style laboratoire d'analyse, animations de points de pression).
 */
export const UNIVERS_PARCOURS = ['clair-pratique', 'simple-proche', 'elegant-sobre', 'technique-precis'] as const;
export type UniversParcours = (typeof UNIVERS_PARCOURS)[number];

/**
 * Un univers du parcours est proposé au praticien s'il est validé, ou encore en brouillon : ces quatre-là sont le
 * catalogue de départ choisi par Paul. Retiré ou « plus tard » (validation déontologique) : jamais proposé.
 */
export const universApplicableAuParcours = (u: Pick<Univers, 'id' | 'statut'>) =>
  (UNIVERS_PARCOURS as readonly string[]).includes(u.id) && (u.statut === 'valide' || u.statut === 'brouillon');

/** Univers du parcours (avec les statuts enregistrés par l'admin), dans l'ordre d'affichage */
export function universDuParcours(liste: readonly Univers[] = CATALOGUE_UNIVERS): Univers[] {
  return UNIVERS_PARCOURS.map((id) => liste.find((u) => u.id === id)).filter((u): u is Univers => Boolean(u && universApplicableAuParcours(u)));
}

/**
 * Univers recommandé (badge « Recommandé pour vous » de l'étape 2) : celui du sujet principal n° 1 actuel (themes.ts),
 * sinon le premier proposé (le tableau, le plus polyvalent). Le modèle déjà enregistré n'influe pas : il a son propre
 * badge « Votre choix actuel ».
 */
export function universRecommande(d: { priorites?: SiteDraft['priorites'] }, proposes: readonly Univers[] = universDuParcours()): Univers | undefined {
  const duTheme = d.priorites ? universDesPriorites(d.priorites) : undefined;
  return proposes.find((u) => u.id === duTheme) ?? proposes[0];
}

/**
 * Applique un modèle du parcours au brouillon (aperçu local et enregistrement serveur) : préréglage complet de
 * l'univers, identité conservée. Les univers du parcours en brouillon sont acceptés (universApplicableAuParcours).
 */
export function appliquerUniversParcours(
  d: SiteDraft,
  u: Univers,
  opts: { modeles?: readonly ModeleManifeste[]; soinsConnus?: readonly string[]; themesActives?: readonly string[] } = {},
): ResultatUnivers {
  const r = appliquerUnivers(d, u, { ...opts, autoriserNonValide: universApplicableAuParcours(u) });
  return { ...r, draft: avecPrioritesParcours(r.draft, opts) };
}

/**
 * Les sujets choisis par le praticien priment sur le préréglage du modèle : spécialités tirées des thèmes n° 1 et n° 2,
 * soins des thèmes présentés en premier (theme.soinsEnAvant). Sans thème principal : brouillon inchangé.
 */
export function avecPrioritesParcours(d: SiteDraft, opts: { soinsConnus?: readonly string[]; themesActives?: readonly string[] } = {}): SiteDraft {
  if (!d.priorites?.principaux.length) return d;
  const x = appliquerPriorites(d, d.priorites, opts.themesActives);
  const ordre = soinsEnAvantDesPriorites(x.priorites, soinsDesPriorites(x.priorites, opts.soinsConnus), 6);
  return ordre.length ? { ...x, theme: { ...x.theme, soinsEnAvant: ordre } } : x;
}

/** Soins suggérés à l'étape « Vos soins » : ceux des sujets choisis, sinon ceux du modèle (présents au catalogue) */
export function soinsSuggeresParcours(d: Pick<SiteDraft, 'priorites'>, u: Pick<Univers, 'preReglage'> | undefined, soinsConnus: readonly string[]): string[] {
  const duTheme = d.priorites ? soinsDesPriorites(d.priorites, soinsConnus) : [];
  return duTheme.length ? duTheme : soinsSuggeres(u, soinsConnus);
}

// ---- Étape 3 : couleurs ----

/** Nombre de gammes conseillées montrées d'abord (pastilles) */
export const GAMMES_CONSEILLEES_MAX = 4;

/** Gammes conseillées du modèle (4 au plus, dans l'ordre de la fiche) ; repli : la gamme choisie */
export function gammesConseillees(m: Pick<ModeleManifeste, 'gammes'>, max = GAMMES_CONSEILLEES_MAX): Gamme[] {
  return (m.gammes ?? []).map((id) => GAMMES.find((g) => g.id === id)).filter((g): g is Gamme => Boolean(g)).slice(0, max);
}

/** Deux couleurs d'une pastille : le duo des gammes vitaminées, l'accent et son fond doux pour les gammes sobres */
export function pastilleGamme(g: Gamme): [string, string] {
  if (g.famille === 'vitaminee') {
    const v = variantesGamme(g);
    return [v.vif, v.duo];
  }
  return [g.accent, g.fondDoux];
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Normalise une couleur saisie (#abc, abc, #AABBCC…) en #rrggbb minuscules ; null si invalide */
export function normaliserCouleur(saisie: string): string | null {
  let s = saisie.trim().toLowerCase();
  if (!s.startsWith('#')) s = `#${s}`;
  if (/^#[0-9a-f]{3}$/.test(s)) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return HEX.test(s) ? s : null;
}

/** Thème après le choix d'une gamme (couleur = accent de la gamme) ; gamme inconnue : thème inchangé */
export function choisirGamme<T extends Pick<SiteDraft['theme'], 'gamme' | 'couleur'>>(theme: T, id: string): T {
  const g = GAMMES.find((x) => x.id === id);
  return g ? { ...theme, gamme: g.id, couleur: g.accent } : theme;
}

/**
 * Thème après le choix d'une couleur libre (« Ma couleur ») : plus de gamme, couleur normalisée. Le contraste reste
 * garanti par le core (couleursGabarit et buildTheme assombrissent ou éclaircissent les dérivés). Saisie invalide :
 * thème inchangé.
 */
export function choisirCouleurLibre<T extends Pick<SiteDraft['theme'], 'gamme' | 'couleur'>>(theme: T, saisie: string): T {
  const c = normaliserCouleur(saisie);
  return c ? { ...theme, gamme: '', couleur: c } : theme;
}

/** Nature du choix de couleur actuel : gamme conseillée du modèle, autre gamme, ou couleur libre */
export function natureCouleur(theme: Pick<SiteDraft['theme'], 'gamme'>, m: Pick<ModeleManifeste, 'gammes'>): 'conseillee' | 'autre' | 'libre' {
  if (!theme.gamme) return 'libre';
  return gammesConseillees(m).some((g) => g.id === theme.gamme) ? 'conseillee' : 'autre';
}

// ---- Étape 5 : soins ----

/** Soins mis en avant dans le parcours (les plus visibles de l'accueil) */
export const SOINS_EN_AVANT_MAX = 3;

/** Soins suggérés par l'univers et présents au catalogue (pré-cochés en suggestion, jamais enregistrés sans confirmation) */
export function soinsSuggeres(u: Pick<Univers, 'preReglage'> | undefined, soinsConnus: readonly string[]): string[] {
  return (u?.preReglage.soinsEnAvant ?? []).filter((s) => soinsConnus.includes(s));
}

/** Soins à mettre en avant : cochés seulement, sans doublon, dans l'ordre donné, 3 au plus */
export function soinsEnAvantValides(enAvant: readonly string[] | undefined, coches: readonly string[], max = SOINS_EN_AVANT_MAX): string[] {
  return [...new Set(enAvant ?? [])].filter((s) => coches.includes(s)).slice(0, max);
}

/**
 * Coche ou décoche un soin. Décocher le retire aussi des soins mis en avant ; cocher l'ajoute en fin de liste des soins
 * mis en avant s'il reste de la place (jamais au-delà de 3).
 */
export function basculerSoin(etat: { soins: readonly string[]; enAvant: readonly string[] }, slug: string, coche: boolean): { soins: string[]; enAvant: string[] } {
  const soins = coche ? [...new Set([...etat.soins, slug])] : etat.soins.filter((s) => s !== slug);
  let enAvant = soinsEnAvantValides(etat.enAvant, soins);
  if (coche && !enAvant.includes(slug) && enAvant.length < SOINS_EN_AVANT_MAX) enAvant = [...enAvant, slug];
  return { soins, enAvant };
}

/** Met un soin coché en avant (à la fin) ou l'en retire ; refusé (liste inchangée) au-delà de 3 ou s'il n'est pas coché */
export function basculerEnAvant(enAvant: readonly string[], slug: string, coches: readonly string[]): string[] {
  const liste = soinsEnAvantValides(enAvant, coches);
  if (liste.includes(slug)) return liste.filter((s) => s !== slug);
  if (!coches.includes(slug) || liste.length >= SOINS_EN_AVANT_MAX) return liste;
  return [...liste, slug];
}

/** Déplace un soin mis en avant d'un rang vers le haut (-1) ou le bas (+1) ; aux bords : liste inchangée */
export function deplacerSoin(enAvant: readonly string[], slug: string, sens: -1 | 1): string[] {
  const liste = [...enAvant];
  const i = liste.indexOf(slug);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= liste.length) return liste;
  [liste[i], liste[j]] = [liste[j], liste[i]];
  return liste;
}

/** Place un soin mis en avant au rang `vers` (glisser-déposer) */
export function placerSoin(enAvant: readonly string[], slug: string, vers: number): string[] {
  const liste = enAvant.filter((s) => s !== slug);
  if (liste.length === enAvant.length) return [...enAvant];
  liste.splice(Math.max(0, Math.min(vers, liste.length)), 0, slug);
  return liste;
}

// ---- Étape 4 : horaires simplifiés ----

export const FERME = 'Fermé';
export const HEURES_PAR_DEFAUT = '9h00–12h30, 14h00–19h00';

const ouvert = (h: Horaire) => plagesDe(h).length > 0;

/**
 * Lecture simplifiée des horaires : jours ouverts et heures communes. `uniformes` faux si les jours ouverts n'ont pas
 * tous les mêmes heures (le praticien les règle alors dans le formulaire complet).
 */
export function horairesSimplifies(horaires: readonly Horaire[]): { jours: string[]; heures: string; uniformes: boolean } {
  const ouverts = horaires.filter(ouvert);
  const heures = ouverts[0]?.heures.trim() ?? HEURES_PAR_DEFAUT;
  return { jours: ouverts.map((h) => h.jour), heures, uniformes: ouverts.every((h) => h.heures.trim() === heures) };
}

/** Horaires de la semaine (7 jours, dans l'ordre) : les mêmes heures les jours cochés, « Fermé » les autres */
export function appliquerHorairesSimplifies(jours: readonly string[], heures: string): Horaire[] {
  const h = heures.trim() || HEURES_PAR_DEFAUT;
  // Heures lisibles : jour structuré (plages) ; sinon le texte est gardé tel quel (relu au chargement, horaires.ts).
  const { plages, reste } = lirePlages(h);
  return JOURS.map((jour) => (!jours.includes(jour) ? horaireDe(jour, []) : plages.length && !reste ? horaireDe(jour, plages) : { jour, heures: h }));
}

// ---- Étapes, aide et reprise ----

export type EtapeParcours = {
  numero: 1 | 2 | 3 | 4 | 5 | 6;
  titre: string;
  /** Une phrase : ce que le praticien fait à cette étape */
  consigne: string;
  /** Recommandation par défaut, en une ligne */
  recommandation: string;
  /** Points des fiches conseils repris pour l'aide (étape du formulaire complet, titre du point) */
  aide: [string, string][];
};

/**
 * Les six étapes. « Vos sujets » vient en premier : c'est la question la plus simple pour le praticien (« ce que je fais »)
 * et elle règle tout le reste — modèle recommandé (thème n° 1), spécialité des illustrations, soins suggérés, accueil et
 * menus. Les aperçus des modèles de l'étape 2 montrent donc déjà le bon menu.
 */
export const ETAPES_PARCOURS: EtapeParcours[] = [
  {
    numero: 1,
    titre: 'Vos sujets',
    consigne: 'Choisissez jusqu’à 3 sujets principaux, dans l’ordre, puis jusqu’à 3 sujets que vous traitez aussi.',
    recommandation: 'Commencez par l’activité qui occupe le plus votre agenda.',
    aide: [['Sujets', 'Pourquoi choisir'], ['Sujets', 'Accueil et menus']],
  },
  {
    numero: 2,
    titre: 'Choisissez votre site',
    consigne: 'Quatre sites prêts à l’emploi. Choisissez celui qui ressemble le plus à votre cabinet ; vous pourrez en changer.',
    recommandation: 'Le site mis en avant convient à la plupart des cabinets comme le vôtre.',
    aide: [['Photos et style', 'Style du site']],
  },
  {
    numero: 3,
    titre: 'Vos couleurs',
    consigne: 'Choisissez deux couleurs pour votre site. L’aperçu se met à jour aussitôt.',
    recommandation: 'Les couleurs conseillées sont choisies pour ce site ; leur lisibilité est vérifiée.',
    aide: [['Photos et style', 'Gamme de couleurs']],
  },
  {
    numero: 4,
    titre: 'Votre cabinet',
    consigne: 'Vérifiez les informations essentielles : elles s’affichent sur toutes les pages.',
    recommandation: 'Recopiez le n° d’Ordre et le lien de rendez-vous tels quels.',
    aide: [['Praticiens', 'N° d’Ordre et RPPS'], ['Rendez-vous et infos', 'Lien de rendez-vous'], ['Horaires', 'Cohérence']],
  },
  {
    numero: 5,
    titre: 'Vos soins et votre image',
    consigne: 'Confirmez les soins que vous pratiquez, puis ajoutez un portrait et un logo si vous le souhaitez.',
    recommandation: 'Gardez les soins suggérés que vous pratiquez chaque semaine, et la marque proposée si vous n’avez pas de logo.',
    aide: [['Compétences', 'Choix'], ['Compétences', 'Ordre'], ['Praticiens', 'Portrait'], ['Photos et style', 'Logo']],
  },
  {
    numero: 6,
    titre: 'Vos contenus',
    consigne: 'Choisissez les articles et les fiches conseils proposés à vos patients, puis vérifiez avant de publier.',
    recommandation: 'Commencez par valider vous-même chaque article.',
    aide: [['Compétences', 'Actualités']],
  },
];

/** Aide courte d'une étape : points des fiches conseils (même texte que le formulaire complet) */
export function aideEtape(numero: number): { titre: string; conseil: string; exemple?: string }[] {
  const e = ETAPES_PARCOURS.find((x) => x.numero === numero);
  if (!e) return [];
  return e.aide.flatMap(([etape, titre]) => {
    const p = FICHES_CONSEILS.find((f) => f.etape === etape)?.points.find((x) => x.titre === titre);
    return p ? [p] : [];
  });
}

/** Informations manquantes (remplacements, jamais bloquantes) qui relèvent de l'étape « Votre cabinet » (identité, adresse, téléphone, rendez-vous) */
export const MANQUE_IDENTITE = /ville|téléphone|adresse|Code postal|praticien|nom et le prénom|Ordre|RPPS|INAMI|rendez-vous|Texte provisoire/i;

/**
 * Étape où reprendre la création : sans modèle du parcours, 1 (aucun sujet choisi) ou 2 ; 4 si l'identité est à
 * compléter, 5 sans soin, sinon 6. (L'étape 3 a une valeur par défaut : la gamme du modèle.)
 */
export function etapeDeReprise(d: SiteDraft): 1 | 2 | 4 | 5 | 6 {
  if (!d.theme.univers || !(UNIVERS_PARCOURS as readonly string[]).includes(d.theme.univers)) return d.priorites?.principaux.length ? 2 : 1;
  // Plus rien ne bloque la publication : on reprend à l'identité si une information y est remplacée par un repli.
  const { remplacements } = controlerPublication(d);
  if (remplacements.some((b) => MANQUE_IDENTITE.test(b) && !/compétence|Horaires/i.test(b))) return 4;
  if (!d.soins.length) return 5;
  return 6;
}

/** Fiches conseils connues, dans l'ordre du catalogue, sans doublon */
export function fichesConseilsValides(ids: readonly string[] | undefined): string[] {
  const connues = SUJETS_FICHES_CONSEILS.map((s) => s.id as string);
  return connues.filter((id) => (ids ?? []).includes(id));
}
