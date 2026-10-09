// PROFILS DE PRATIQUE (décision de Paul du 2026-10-08 : « quand le praticien dit "je suis podologue du sport, spécialisé diabétique
// et surtout en basket", lui servir un thème qui représente bien ça »). Documentation : docs/profils-pratique.md.
//
// Un PROFIL = profession (dimension de premier niveau, pratiques.ts) + thème principal + thèmes secondaires + ACTIVITÉS précises
// (basket, tennis…, seulement pour les thèmes qui s'y prêtent) + publics (enfants, seniors…) ; hashtags normalisés associés
// (#sport, #basket). Les profils de RÉFÉRENCE (Sport·basket, Diabète…) sont des données de la profession ; un praticien en combine
// plusieurs (Sport·basket + Diabète : meilleursProfils en renvoie un par thème).
//
// Proximité (proximiteProfils, 0 à 1, poids documentés dans POIDS_PROFIL) :
//   thème n° 1 (0,45) : identique 0,45 ; le principal du profil est un autre thème PRINCIPAL du praticien 0,25, un secondaire 0,15 ;
//                       profil généraliste (sans thème) 0,1 ; sinon 0 ;
//   activités (0,3)   : profil sans activité : 0,3 si le praticien n'en a pas, 0,12 sinon (le générique du thème convient) ;
//                       profil avec activités : part pondérée des activités du praticien couvertes (rang 1 : 3, rang 2 : 2, rang 3 : 1),
//                       praticien sans activité 0,06, aucune activité commune −0,1 (un profil foot n'est pas pour un praticien basket) ;
//   secondaires (0,15): recouvrement (Jaccard) des autres thèmes ; aucun des deux → 0,15 ;
//   publics (0,1)     : recouvrement (Jaccard) ; aucun des deux → 0,1.
// meilleursProfils : classement par proximité, puis DIVERSITÉ (un profil dont le thème principal est déjà couvert par un profil retenu
// perd 0,2) : « Sport·basket + Diabète » donne Sport·basket puis Diabète.
//
// KIT DU PROFIL (kitDuProfil) : photos (vivier curé, kits-images.ts), illustrations, icônes et animations (vivier curé, kits-visuels.ts)
// du sujet du thème principal, ÉTIQUETÉES avec l'activité (#basket, ou scène du kit Sports) ; praticien : seulement les éléments
// validés (jamais « à valider ») ; activité sans visuel validé → REPLI sur le kit générique du thème (« sport »), signalé.
// JAUGE (jaugeProfil) : kit complet ? recettes gardées 4-5 ★ ? éléments 100 % 4-5 ★ ? → trous concrets avec leurs actions.
// Module pur, aucun métier codé en dur (le vocabulaire vient de la pratique).

import { pratiqueDe, themePratique, activitePratique, PRATIQUES, type ActivitePratique, type PratiqueProfession, type ProfilReference } from './pratiques';
import { vivierVisuels, FAMILLES_KIT, type DonneesVisuels, type FamilleKit } from './kits-visuels';
import { vivierCure, type DonneesKits } from './kits-images';
import { normaliserHashtag } from './hashtags';

// ---------------------------------------------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------------------------------------------

export type ProfilPratique = {
  /** Identifiant stable : celui du profil de référence, sinon composé (« sport~basket+diabete ») */
  id: string;
  profession: string;
  /** Nom court (« Sport · basket ») */
  court: string;
  /** « pour qui » du badge (« la podologie du sport · basket ») */
  pour: string;
  principal: string | null;
  secondaires: string[];
  activites: string[];
  publics: string[];
  hashtags: string[];
  reference: boolean;
};

/** Réponses d'un praticien (parcours /creer, préremplissage de l'onboarding) */
export type ReponsesPratique = {
  profession?: string | null;
  principaux: readonly string[];
  secondaires?: readonly string[];
  /** Activités à mettre en avant, dans l'ordre (3 au plus) */
  activites?: readonly string[];
  publics?: readonly string[];
};

export const ACTIVITES_MAX = 3;

const uniques = (l: readonly (string | null | undefined)[]) => [...new Set(l.filter((x): x is string => typeof x === 'string' && x.length > 0))];

/** Thèmes actifs connus de la pratique, sans doublon */
const themesActifs = (p: PratiqueProfession, l: readonly string[]) => uniques(l).filter((id) => themePratique(p, id)?.actif);

/** Activités proposées pour des thèmes choisis (ordre des données) ; aucune si aucun thème ne s'y prête */
export function activitesProposees(p: PratiqueProfession, themes: readonly string[]): ActivitePratique[] {
  const t = themesActifs(p, themes);
  return p.activites.filter((a) => a.themes.some((x) => t.includes(x)));
}

/** La question « activités à mettre en avant » est posée si un thème choisi s'y prête */
export const questionActivites = (p: PratiqueProfession, themes: readonly string[]) => activitesProposees(p, themes).length > 0;

/** Activités valides pour ces thèmes : connues, proposées, sans doublon, dans l'ordre, ACTIVITES_MAX au plus */
export function normaliserActivites(p: PratiqueProfession, activites: unknown, themes: readonly string[]): string[] {
  const permises = new Set(activitesProposees(p, themes).map((a) => a.id));
  return uniques(Array.isArray(activites) ? (activites as unknown[]).map((x) => (typeof x === 'string' ? x : null)) : []).filter((a) => permises.has(a)).slice(0, ACTIVITES_MAX);
}

/** Ajoute une activité (à la fin, s'il reste de la place) ou la retire */
export function basculerActivite(p: PratiqueProfession, activites: readonly string[], id: string, themes: readonly string[]): string[] {
  if (activites.includes(id)) return activites.filter((a) => a !== id);
  return normaliserActivites(p, [...activites, id], themes);
}

/** Monte (−1) ou descend (+1) une activité d'un rang */
export function deplacerActivite(activites: readonly string[], id: string, sens: -1 | 1): string[] {
  const l = [...activites];
  const i = l.indexOf(id), j = i + sens;
  if (i < 0 || j < 0 || j >= l.length) return l;
  [l[i], l[j]] = [l[j], l[i]];
  return l;
}

/** Publics impliqués par des thèmes (enfant → enfants…) */
export const publicsDesThemes = (p: PratiqueProfession, themes: readonly string[]) => p.publics.filter((u) => u.themes.some((t) => themes.includes(t))).map((u) => u.id);

/** Hashtags normalisés d'un profil : sujets des thèmes puis hashtags des activités */
export function hashtagsDuProfil(p: PratiqueProfession, x: Pick<ProfilPratique, 'principal' | 'secondaires' | 'activites'>): string[] {
  const sujets = [x.principal, ...x.secondaires].map((t) => themePratique(p, t)?.sujetVisuel);
  const acts = x.activites.flatMap((a) => activitePratique(p, a)?.hashtags ?? []);
  return uniques([...sujets, ...acts].map((h) => normaliserHashtag(h)));
}

/** « pour qui » : thème + activité principale (« la podologie du sport · basket ») ; généraliste : vocabulaire de la pratique */
export function pourDuProfil(p: PratiqueProfession, x: Pick<ProfilPratique, 'principal' | 'activites'>): string {
  const t = themePratique(p, x.principal);
  if (!t) return p.vocabulaire.generaliste;
  const a = activitePratique(p, x.activites[0]);
  return a ? `${t.pour} · ${a.court}` : t.pour;
}

/** Badge d'une recette conçue pour un profil : « Conçu pour la podologie du sport · basket » */
export const badgeConcuPour = (x: Pick<ProfilPratique, 'pour'>) => `Conçu pour ${x.pour}`;

function construire(p: PratiqueProfession, b: { id: string; court: string; principal: string | null; secondaires: readonly string[]; activites: readonly string[]; publics: readonly string[]; reference: boolean }): ProfilPratique {
  const principal = b.principal && themePratique(p, b.principal)?.actif ? b.principal : null;
  const secondaires = themesActifs(p, b.secondaires).filter((t) => t !== principal);
  const activites = normaliserActivites(p, b.activites, uniques([principal, ...secondaires]));
  const publics = uniques(b.publics).filter((u) => p.publics.some((x) => x.id === u));
  const x = { principal, secondaires, activites };
  return { id: b.id, profession: p.profession, court: b.court, pour: pourDuProfil(p, x), ...x, publics, hashtags: hashtagsDuProfil(p, x), reference: b.reference };
}

export const profilDeReference = (p: PratiqueProfession, r: ProfilReference): ProfilPratique => construire(p, { ...r, reference: true });

/** Profils de référence d'une profession (API publique : onboarding, dégustation, /admin/profils) */
export function profilsDePratique(profession?: string | null, registre: readonly PratiqueProfession[] = PRATIQUES): ProfilPratique[] {
  const p = pratiqueDe(profession, registre);
  return p.profils.map((r) => profilDeReference(p, r));
}

export const profilParId = (id: string | null | undefined, profession?: string | null, registre: readonly PratiqueProfession[] = PRATIQUES) =>
  profilsDePratique(profession, registre).find((x) => x.id === id);

/** Identifiant composé d'un profil libre (« sport~basket.tennis+diabete ») */
const idCompose = (principal: string | null, activites: readonly string[], autres: readonly string[]) =>
  `${principal ?? 'generaliste'}${activites.length ? `~${activites.join('.')}` : ''}${autres.length ? `+${autres.join('+')}` : ''}`;

/** Profil d'un praticien à partir de ses réponses (thème n° 1, autres thèmes, activités, publics) */
export function profilDepuisReponses(r: ReponsesPratique, registre: readonly PratiqueProfession[] = PRATIQUES): ProfilPratique {
  const p = pratiqueDe(r.profession, registre);
  const principaux = themesActifs(p, r.principaux);
  const principal = principaux[0] ?? null;
  const secondaires = themesActifs(p, [...principaux.slice(1), ...(r.secondaires ?? [])]).filter((t) => t !== principal);
  const activites = normaliserActivites(p, r.activites ?? [], principaux.concat(secondaires));
  const publics = uniques([...(r.publics ?? []), ...publicsDesThemes(p, [...principaux, ...secondaires])]);
  const court = [themePratique(p, principal)?.court ?? 'Généraliste', ...activites.map((a) => activitePratique(p, a)?.court ?? a)].join(' · ');
  const x = construire(p, { id: idCompose(principal, activites, secondaires), court, principal, secondaires, activites, publics, reference: false });
  // Les autres thèmes PRINCIPAUX du praticien gardent leur rang (pour la proximité) : ils précèdent les secondaires
  return { ...x, secondaires };
}

/** Combinaison de profils (Sport·basket + Diabète) : principal du premier, autres thèmes, activités et publics réunis */
export function combinerProfils(profils: readonly ProfilPratique[], registre: readonly PratiqueProfession[] = PRATIQUES): ProfilPratique | null {
  if (!profils.length) return null;
  return profilDepuisReponses({
    profession: profils[0].profession,
    principaux: uniques(profils.map((x) => x.principal)),
    secondaires: profils.flatMap((x) => x.secondaires),
    activites: profils.flatMap((x) => x.activites),
    publics: profils.flatMap((x) => x.publics),
  }, registre);
}

// ---------------------------------------------------------------------------------------------------------------
// Proximité
// ---------------------------------------------------------------------------------------------------------------

export const POIDS_PROFIL = { themeUn: 0.45, activites: 0.3, secondaires: 0.15, publics: 0.1 } as const;
/** Proximité minimale pour qu'un profil soit retenu (recettes publiées proposées au praticien) */
export const SEUIL_PROFIL = 0.4;

const jaccard = (a: readonly string[], b: readonly string[]) => {
  const u = new Set([...a, ...b]);
  return u.size ? a.filter((x) => b.includes(x)).length / u.size : 1;
};

/**
 * Proximité d'un profil cible (référence) pour un praticien (profil issu de ses réponses), de 0 à 1 (voir l'en-tête).
 * `principauxClient` : autres thèmes principaux du praticien (rang ≥ 2), distingués des secondaires.
 */
export function proximiteProfils(client: ProfilPratique, cible: ProfilPratique, principauxClient: readonly string[] = []): number {
  const P = POIDS_PROFIL;
  if (client.profession !== cible.profession) return 0;
  let un = 0;
  if (cible.principal === null) un = 0.1;
  else if (cible.principal === client.principal) un = P.themeUn;
  else if (principauxClient.includes(cible.principal)) un = 0.25;
  else if (client.secondaires.includes(cible.principal)) un = 0.15;
  let acts: number;
  if (!cible.activites.length) acts = client.activites.length ? 0.12 : P.activites;
  else if (!client.activites.length) acts = 0.06;
  else {
    const w = (i: number) => Math.max(1, 3 - i);
    const total = client.activites.reduce((s, _, i) => s + w(i), 0);
    const couvert = client.activites.reduce((s, a, i) => s + (cible.activites.includes(a) ? w(i) : 0), 0);
    acts = couvert ? (P.activites * couvert) / total : -0.1;
  }
  // Une activité ne compte que si le thème du profil est celui du praticien qui la porte (sinon : profil d'un autre thème)
  if (cible.principal !== null && cible.principal !== client.principal && cible.activites.length) acts = Math.min(acts, 0.06);
  const autresClient = client.secondaires.filter((t) => t !== cible.principal);
  const autresCible = cible.secondaires.filter((t) => t !== client.principal);
  const sec = !autresClient.length && !autresCible.length ? P.secondaires : P.secondaires * jaccard(autresClient, autresCible);
  const pub = !client.publics.length && !cible.publics.length ? P.publics : P.publics * jaccard(client.publics, cible.publics);
  return Math.round(Math.max(0, Math.min(1, un + acts + sec + pub)) * 1000) / 1000;
}

export type ProfilClasse = { profil: ProfilPratique; score: number };

/**
 * Profils de référence les plus proches des réponses d'un praticien, pour SA profession : proximité, puis diversité (un profil dont
 * le thème principal est déjà couvert perd 0,2), au-dessus de `seuil`, `n` au plus.
 */
export function meilleursProfils(r: ReponsesPratique, opts: { n?: number; seuil?: number; registre?: readonly PratiqueProfession[] } = {}): ProfilClasse[] {
  const registre = opts.registre ?? PRATIQUES;
  const client = profilDepuisReponses(r, registre);
  const p = pratiqueDe(r.profession, registre);
  const principaux = themesActifs(p, r.principaux).slice(1);
  const bruts = profilsDePratique(client.profession, registre).map((profil) => ({ profil, score: proximiteProfils(client, profil, principaux) }))
    .sort((a, b) => b.score - a.score || (a.profil.id < b.profil.id ? -1 : 1));
  const retenus: ProfilClasse[] = [];
  const restants = [...bruts];
  while (restants.length && retenus.length < (opts.n ?? 3)) {
    const couverts = new Set(retenus.map((x) => x.profil.principal));
    const ajuste = restants.map((x) => ({ ...x, a: x.score - (couverts.has(x.profil.principal) ? 0.2 : 0) })).sort((a, b) => b.a - a.a || (a.profil.id < b.profil.id ? -1 : 1));
    const best = ajuste[0];
    if (best.a < (opts.seuil ?? SEUIL_PROFIL)) break;
    retenus.push({ profil: best.profil, score: best.score });
    restants.splice(restants.findIndex((x) => x.profil.id === best.profil.id), 1);
  }
  return retenus;
}

/**
 * Soins mis en avant d'après les activités (ordre de la première activité, puis des suivantes), parmi les soins cochés, complétés par
 * les soins déjà en avant ; `max` au plus. Sans activité : soins en avant inchangés.
 */
export function soinsEnAvantActivites(p: PratiqueProfession, activites: readonly string[], soinsCoches: readonly string[], enAvant: readonly string[] = [], max = 3): string[] {
  if (!activites.length) return [...enAvant].slice(0, max);
  const ordre = activites.flatMap((a) => activitePratique(p, a)?.soins ?? []);
  return uniques([...ordre.filter((s) => soinsCoches.includes(s)), ...enAvant.filter((s) => soinsCoches.includes(s))]).slice(0, max);
}

// ---------------------------------------------------------------------------------------------------------------
// Kit du profil
// ---------------------------------------------------------------------------------------------------------------

export type ElementProfil = { cle: string; famille: FamilleKit; note: number | null; aValider: boolean; url?: string };
export type KitActivite = { activite: string; hashtag: string; libelle: string; familles: Record<FamilleKit, ElementProfil[]> };
export type KitProfil = {
  profil: string;
  sujet: string;
  activites: KitActivite[];
  /** Kit générique du thème (repli d'une activité sans visuel validé) */
  generique: Record<FamilleKit, ElementProfil[]>;
  /** Activités sans aucun visuel retenu : le site utilise le kit générique du thème */
  replis: string[];
};

const familleVide = (): Record<FamilleKit, ElementProfil[]> => ({ photo: [], illustration: [], icone: [], animation: [] });

/** Un élément porte-t-il l'activité ? (hashtag de l'activité, ou scène du kit de visuels : sport-<scene>) */
export function porteActivite(cle: string, tags: readonly string[], a: Pick<ActivitePratique, 'hashtags' | 'scene'>): boolean {
  if (a.hashtags.some((h) => !MOTS_AMBIGUS.has(h) && tags.includes(h))) return true;
  return Boolean(a.scene && new RegExp(`(^|[:-])sport-${a.scene}(:|$)`).test(cle));
}

// Mots trop généraux des requêtes de photos (« tennis shoes court » → tennis) : jamais un indice d'activité à eux seuls
const MOTS_GENERAUX = new Set(['shoes', 'shoe', 'boots', 'boot', 'court', 'grass', 'floor', 'road', 'path', 'indoor', 'field', 'feet', 'foot', 'sole', 'edge', 'deck', 'mat', 'snow', 'binding', 'pedal', 'ball', 'sneakers', 'slippers', 'sandals', 'walking', 'trail', 'stirrup', 'tatami', 'arts', 'course']);

/**
 * Mots AMBIGUS, jamais lus comme une activité à eux seuls (retour du 2026-10-09 : « accueil-observation-marche » classée randonnée) :
 * « marche » désigne aussi l'analyse de la marche, la marche du quotidien — pas une activité sportive. La randonnée se reconnaît à
 * ses mots propres (randonnee, rando, trail, montagne, bâtons, hiking).
 */
const MOTS_AMBIGUS = new Set(['marche']);
/** Mots propres d'une activité en plus de ses hashtags (indices non ambigus) */
const MOTS_PROPRES: Readonly<Record<string, readonly string[]>> = { randonnee: ['rando', 'montagne', 'batons', 'baton', 'hiking'] };

/** Mots qui trahissent une activité dans l'adresse ou la requête d'origine d'une photo : hashtags + premiers mots des requêtes */
export function motsActivite(a: Pick<ActivitePratique, 'hashtags' | 'requetes' | 'scene'>): string[] {
  const l = new Set<string>([...a.hashtags.flatMap((h) => [h, h.replace(/-/g, '')]), ...(a.scene ? [a.scene] : [])]);
  for (const r of a.requetes) for (const m of r.toLowerCase().split(/[^a-z]+/).slice(0, 2)) if (m.length > 3 && !MOTS_GENERAUX.has(m)) l.add(m);
  if (a.hashtags.includes('trail')) l.add('trail');
  for (const h of a.hashtags) for (const m of MOTS_PROPRES[h] ?? []) l.add(m);
  return [...l].filter((m) => !MOTS_AMBIGUS.has(m));
}

/**
 * Activités RECONNUES sur un visuel (retour de Paul du 2026-10-09 : des photos de tennis dans « Sport · course ») : hashtag ou scène
 * (porteActivite), sinon un mot de l'activité dans la clé, l'adresse ou la requête d'origine (photo taguée seulement « sport » mais
 * nommée « tennis-shoes-court… » = tennis). Activités de la profession seulement.
 */
export function activitesReconnues(e: { cle: string; tags?: readonly string[]; url?: string | null; requete?: string | null }, p: Pick<PratiqueProfession, 'activites'>): string[] {
  const jetons = new Set(`${e.cle} ${e.url ?? ''} ${e.requete ?? ''}`.toLowerCase().replace(/%20/g, ' ').split(/[^a-z0-9]+/).filter(Boolean));
  return p.activites.filter((a) => porteActivite(e.cle, e.tags ?? [], a) || motsActivite(a).some((m) => jetons.has(m))).map((a) => a.id);
}

export type DonneesProfil = { visuels?: DonneesVisuels | null; photos?: DonneesKits | null };

/**
 * Kit d'un profil : pour chaque activité, photos, illustrations, icônes et animations du vivier curé du sujet du thème principal qui
 * portent l'activité ; `praticien` : éléments validés seulement (une photo non importée, un visuel « à valider » ne sont jamais
 * montrés). Mieux notés d'abord.
 */
export function kitDuProfil(profil: ProfilPratique, d: DonneesProfil, opts: { praticien?: boolean; registre?: readonly PratiqueProfession[] } = {}): KitProfil {
  const p = pratiqueDe(profil.profession, opts.registre ?? PRATIQUES);
  const sujet = themePratique(p, profil.principal)?.sujetVisuel ?? 'general';
  const ok = (e: ElementProfil) => !opts.praticien || !e.aValider;
  const tous: (ElementProfil & { tags: string[]; activites: string[] })[] = [];
  const reconnues = (cle: string, tags: string[], url?: string, requete?: string | null) => activitesReconnues({ cle, tags, url, requete }, p);
  if (d.photos) for (const v of vivierCure(sujet, d.photos)) tous.push({ cle: v.cle, famille: 'photo', note: v.note, aValider: !v.importee, url: v.p.url, tags: v.tags, activites: reconnues(v.cle, v.tags, v.p.url, v.p.requete ?? null) });
  if (d.visuels) {
    const v = vivierVisuels(sujet, d.visuels);
    for (const f of FAMILLES_KIT) if (f !== 'photo') for (const x of v[f]) tous.push({ cle: x.cle, famille: f, note: x.note, aValider: x.aValider, tags: x.tags, activites: reconnues(x.cle, x.tags) });
  }
  const tri = (l: ElementProfil[]) => l.sort((a, b) => Number(a.aValider) - Number(b.aValider) || (b.note ?? 0) - (a.note ?? 0) || (a.cle < b.cle ? -1 : 1));
  // Kit générique du thème = visuels SANS activité identifiable (jamais une photo de tennis dans le repli d'un profil « course ») ;
  // famille vide et profil sans activité : tout le thème (rien à confondre)
  const generique = familleVide();
  const neutre = (e: (typeof tous)[number]) => !e.activites.length;
  for (const e of tous) if (ok(e) && neutre(e)) generique[e.famille].push({ cle: e.cle, famille: e.famille, note: e.note, aValider: e.aValider, ...(e.url ? { url: e.url } : {}) });
  if (!profil.activites.length) for (const f of FAMILLES_KIT) if (!generique[f].length) for (const e of tous) if (ok(e) && e.famille === f) generique[f].push({ cle: e.cle, famille: e.famille, note: e.note, aValider: e.aValider, ...(e.url ? { url: e.url } : {}) });
  for (const f of FAMILLES_KIT) tri(generique[f]);
  const activites: KitActivite[] = [];
  const replis: string[] = [];
  for (const id of profil.activites) {
    const a = activitePratique(p, id);
    if (!a) continue;
    const familles = familleVide();
    // Visuels de l'activité : reconnus comme ELLE, et aucune autre activité (une photo « tennis et course » n'illustre pas la course)
    for (const f of FAMILLES_KIT) {
      familles[f] = tri(tous.filter((t) => t.famille === f && ok(t) && t.activites.includes(id) && t.activites.every((x) => x === id))
        .map((e) => ({ cle: e.cle, famille: e.famille, note: e.note, aValider: e.aValider, ...(e.url ? { url: e.url } : {}) })));
    }
    activites.push({ activite: id, hashtag: a.hashtags[0], libelle: a.libelle, familles });
    if (FAMILLES_KIT.every((f) => !familles[f].length)) replis.push(id);
  }
  return { profil: profil.id, sujet, activites, generique, replis };
}

/**
 * Visuels d'un site pour une activité (héros, page sujet, fiches) : ceux de l'activité s'il y en a de VALIDÉS, sinon le kit
 * générique du thème (repli). `illustration` : clé de l'illustration retenue ; `photos` : URL des photos (meilleures d'abord).
 */
export type VisuelsActivite = { activite: string | null; repli: boolean; illustration: string | null; photos: string[]; icone: string | null; /** Photos propres à l'activité (validées), sans repli */ photosActivite: string[] };
export function visuelsDeLActivite(kit: KitProfil, activite?: string | null): VisuelsActivite {
  const k = kit.activites.find((x) => x.activite === (activite ?? kit.activites[0]?.activite));
  const prendre = (f: FamilleKit) => (k?.familles[f].filter((e) => !e.aValider) ?? []);
  const propres = { illustration: prendre('illustration')[0]?.cle ?? null, photos: prendre('photo').map((e) => e.url!).filter(Boolean), icone: prendre('icone')[0]?.cle ?? null };
  const repli = !k || (!propres.illustration && !propres.photos.length && !propres.icone);
  const g = (f: FamilleKit) => kit.generique[f].filter((e) => !e.aValider);
  return {
    activite: k?.activite ?? null, repli, photosActivite: propres.photos,
    illustration: propres.illustration ?? g('illustration')[0]?.cle ?? null,
    photos: propres.photos.length ? propres.photos : g('photo').map((e) => e.url!).filter(Boolean),
    icone: propres.icone ?? g('icone')[0]?.cle ?? null,
  };
}

/** Clé de la table des visuels d'activités (praticiens) : `<thème>|<activité>` */
export const cleVisuelsActivite = (theme: string, activite: string) => `${theme}|${activite}`;

/**
 * Table des visuels VALIDÉS de chaque activité, par thème qui s'y prête (parcours /creer, sites) : kit du profil « thème + activité »
 * en mode praticien. Pur : les données viennent de l'appelant.
 */
export function tableVisuelsActivites(profession: string | null | undefined, d: DonneesProfil, registre: readonly PratiqueProfession[] = PRATIQUES): Record<string, VisuelsActivite> {
  const p = pratiqueDe(profession, registre);
  const r: Record<string, VisuelsActivite> = {};
  for (const t of p.themes.filter((x) => x.actif)) for (const a of p.activites.filter((x) => x.themes.includes(t.id))) {
    const profil = profilDepuisReponses({ profession: p.profession, principaux: [t.id], activites: [a.id] }, registre);
    r[cleVisuelsActivite(t.id, a.id)] = visuelsDeLActivite(kitDuProfil(profil, d, { praticien: true, registre }), a.id);
  }
  return r;
}

/** Visuels de la première activité du praticien, pour son thème principal qui s'y prête (thèmes dans l'ordre) ; null sans activité */
export function visuelsPourPraticien(table: Readonly<Record<string, VisuelsActivite>>, themes: readonly string[], activites: readonly string[]): VisuelsActivite | null {
  for (const a of activites) for (const t of themes) { const v = table[cleVisuelsActivite(t, a)]; if (v) return v; }
  return null;
}

/**
 * Photos de l'activité posées sur un brouillon au style « photos » (premier écran, page du sujet, fiches) : seulement des photos
 * VALIDÉES propres à l'activité ; sans elles (repli), le brouillon garde les photos de la recette ou du thème.
 */
export function avecPhotosActivite<D extends { theme: { photosRecette?: string[] } }>(d: D, v: VisuelsActivite | null, stylePhotos: boolean): D {
  if (!stylePhotos || !v || !v.photosActivite.length) return d;
  const photos = [...new Set([...v.photosActivite, ...(d.theme.photosRecette ?? [])])].slice(0, 5);
  return { ...d, theme: { ...d.theme, photosRecette: photos } };
}

// ---------------------------------------------------------------------------------------------------------------
// Jauge de préparation (/admin/profils, dégustation)
// ---------------------------------------------------------------------------------------------------------------

/** Éléments PRÊTS (validés, notés ≥ 4 ★) attendus par famille et par activité (ou par thème sans activité) */
export const MINIMUMS_KIT: Record<FamilleKit, number> = { photo: 2, illustration: 1, icone: 1, animation: 1 };
export const POIDS_JAUGE = { kit: 0.4, recettes: 0.3, qualite: 0.3 } as const;

export type ActionTrou = { libelle: string; href: string };
export type TrouProfil = { id: string; texte: string; famille: FamilleKit | 'recette' | 'qualite'; activite: string | null; actions: ActionTrou[] };
export type JaugeProfil = {
  /** Part (0-1) */
  pret: number;
  pourcent: number;
  kit: { remplis: number; attendus: number };
  recettes: { gardees: number; publiees: number };
  /** Part d'éléments 4-5 ★ de la meilleure recette du profil (null sans recette) */
  qualite: number | null;
  trous: TrouProfil[];
};

const NOMS_FAMILLES: Record<FamilleKit, { un: string; aucun: string }> = {
  photo: { un: 'photo', aucun: 'Aucune photo' }, illustration: { un: 'illustration', aucun: 'Pas d’illustration' },
  icone: { un: 'icône', aucun: 'Pas d’icône' }, animation: { un: 'animation', aucun: 'Pas d’animation' },
};

/** Liens d'action d'un trou (routes de l'admin) */
export const LIENS_PROFILS = {
  trouverPhotos: (sujet: string, hashtag: string) => `/admin/retours?type=decouvrir&sujet=${encodeURIComponent(sujet)}&emplacement=${encodeURIComponent(`activite:${hashtag}`)}&retour=kits`,
  trier: (hashtag: string) => `/admin/retours/tri?hashtag=${encodeURIComponent(hashtag)}`,
  imagesAGenerer: (sujet: string, hashtag: string | null, profil: string) => `/admin/profils?profil=${encodeURIComponent(profil)}&generer=${encodeURIComponent(hashtag ?? sujet)}#generer`,
  degustation: (profil: string) => `/admin/degustation?profil=${encodeURIComponent(profil)}`,
  kits: (sujet: string) => `/admin/retours/kits?sujet=${encodeURIComponent(sujet)}`,
  studio: () => '/admin/atelier/studio',
} as const;

/**
 * Jauge d'un profil : kit (éléments prêts par famille et par activité), recettes gardées 4-5 ★ du profil, part d'éléments 4-5 ★ de
 * sa meilleure recette ; trous concrets (« Pas d'animation #basket », « 1 seule photo #basket notée ≥ 4 ★ ») avec leurs actions.
 * `kit` : kitDuProfil(…, { praticien: false }) (les éléments « à valider » y sont, signalés).
 */
export function jaugeProfil(profil: ProfilPratique, kit: KitProfil, r: { gardees: number; publiees: number; qualite: number | null }): JaugeProfil {
  const trous: TrouProfil[] = [];
  let remplis = 0, attendus = 0;
  const cibles = kit.activites.length ? kit.activites.map((a) => ({ activite: a.activite as string | null, hashtag: a.hashtag, familles: a.familles })) : [{ activite: null, hashtag: kit.sujet, familles: kit.generique }];
  for (const c of cibles) {
    for (const f of FAMILLES_KIT) {
      const prets = c.familles[f].filter((e) => !e.aValider && (e.note ?? 0) >= 4).length;
      const aValider = c.familles[f].filter((e) => e.aValider).length;
      const min = MINIMUMS_KIT[f];
      attendus += min; remplis += Math.min(min, prets);
      if (prets >= min) continue;
      const nom = NOMS_FAMILLES[f];
      const texte = prets === 0
        ? `${nom.aucun} #${c.hashtag}${f === 'animation' ? '' : ' notée ≥ 4 ★'}`
        : `${prets} seule ${nom.un} #${c.hashtag} notée ≥ 4 ★`;
      const actions: ActionTrou[] = f === 'photo'
        ? [{ libelle: `Trouver des photos pré-filtrées #${c.hashtag}`, href: LIENS_PROFILS.trouverPhotos(kit.sujet, c.hashtag) }, { libelle: 'Images à générer pour ce trou', href: LIENS_PROFILS.imagesAGenerer(kit.sujet, c.activite ? c.hashtag : null, profil.id) }]
        : [{ libelle: `Trier les visuels #${c.hashtag}`, href: LIENS_PROFILS.trier(c.hashtag) }, { libelle: `Kit ${kit.sujet}`, href: LIENS_PROFILS.kits(kit.sujet) }];
      actions.push({ libelle: 'Dégustation de ce profil', href: LIENS_PROFILS.degustation(profil.id) });
      trous.push({ id: `${c.activite ?? 'theme'}|${f}`, texte: `${texte}${aValider ? ` · ${aValider} à valider` : ''}`, famille: f, activite: c.activite, actions });
    }
  }
  if (!r.gardees) trous.push({ id: 'recette', texte: 'Aucune recette gardée 4-5 ★ pour ce profil', famille: 'recette', activite: null, actions: [{ libelle: 'Composer dans le Studio', href: LIENS_PROFILS.studio() }, { libelle: 'Dégustation de ce profil', href: LIENS_PROFILS.degustation(profil.id) }] });
  if (r.qualite !== null && r.qualite < 1) trous.push({ id: 'qualite', texte: `Meilleure recette : ${Math.round(r.qualite * 100)} % d’éléments 4-5 ★`, famille: 'qualite', activite: null, actions: [{ libelle: 'Dégustation de ce profil', href: LIENS_PROFILS.degustation(profil.id) }] });
  const partKit = attendus ? remplis / attendus : 0;
  const pret = POIDS_JAUGE.kit * partKit + POIDS_JAUGE.recettes * Math.min(1, r.gardees / 2) + POIDS_JAUGE.qualite * (r.qualite ?? 0);
  return { pret: Math.round(pret * 1000) / 1000, pourcent: Math.round(pret * 100), kit: { remplis, attendus }, recettes: { gardees: r.gardees, publiees: r.publiees }, qualite: r.qualite, trous };
}
