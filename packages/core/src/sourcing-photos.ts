// SOURCING AUTOMATIQUE DE PHOTOS EN SÉRIES COHÉRENTES (demande de Paul du 2026-10-09 : « qu'un agent puisse me sourcer des belles
// photos depuis Pexels / Pixabay pour illustrer mes modèles sans que j'aie à le faire moi-même… et qu'il y ait une vraie cohérence
// visuelle »). Documentation : docs/sourcing-photos.md.
//
// 1. CIBLES : les TROUS réels (profils de pratique sans photo d'activité, emplacements de kits vides ou faibles, thèmes d'une
//    profession peu couverts, profils des finalistes de la chaîne des modèles en premier), toujours PAR PROFESSION (verrou :
//    requêtes et hashtags de la profession, recherche-photos-professions.ts, pratiques.ts).
// 2. REQUÊTES : plusieurs requêtes ciblées par cible, tirées en privilégiant les moins couvertes (choisirRequete), réparties sur
//    les sources configurées → 100 à 200 candidates.
// 3. FILTRES : dimensions, orientation selon l'emplacement, doublons (clé et empreinte visuelle), déjà vues / rejetées / déjà
//    proposées, mots interdits (marque, texte incrusté, visage, sang ou plaie, hors métier).
// 4. SCORES sur l'APERÇU basse définition (lu en mémoire côté serveur, jamais stocké) : qualité (netteté, exposition,
//    résolution), pertinence (texte de la source vs thème), caractéristiques visuelles (palette via quantifierPalette, température,
//    luminosité, saturation, contraste, couleurs proches de la gamme).
// 5. SÉRIES : 6 à 12 photos qui minimisent la DISPERSION autour d'une signature (« lumineuse · chaude · naturelle · touches
//    vertes »), variées (jamais deux quasi identiques, pas plus d'un tiers par requête), compatibles avec la gamme et le traitement
//    photo ; 2-3 séries alternatives par cible. Chaque photo reçoit son emplacement prévu.
// 6. REVUE DE CLAUDE (facultative) : retours/series-photos-claude.json (agent .claude/agents/sourceur-photos.md) écarte et réordonne.
// Rien n'est importé avant l'acceptation de Paul (Arrivages). Module pur, déterministe, sans réseau.

import { choisirRequete, cleCandidat, HAUTEUR_MIN, LARGEUR_MIN, urlImageAutorisee, urlPageAutorisee, type CandidatPhoto, type SourcePhotoLibre } from './photos-libres';
import { quantifierPalette, tslDe, estChromatique, type CouleurPalette } from './inspirations';
import { distance } from './couleurs';
import { GAMMES, gamme as gammeParId } from './gammes';
import { etiquetteIngredient } from './harmonie';
import { traitementPhotos, type IdTraitementPhotos } from './traitements-photos';
import { activitePratique, pratiqueDe, themePratique } from './pratiques';
import { profilsDePratique } from './profils';
import { MOTS_METIER, REQUETES_SOINS, requetesEmplacement, hashtagKit } from './suggestions-kits';
import { couvertureRequetes, requetesDuTheme, themeRecherche, themesRecherche, trousParProfession, type PhotoCouverture } from './recherche-photos-professions';
import { idProfession, PROFESSION_PAR_DEFAUT } from './professions';
import { hashtagsValides } from './hashtags';
import { libelleEmplacement } from './kits-images';
import { coherenceSerieTexte, exclusionsSerie, seriesDuProfil, tagsSerieActivite, type ExclusionsSerie } from './series-photos-activites';

// Séries par activité (basket, tennis, golf, cyclisme, course, trail / randonnée) : requêtes, exclusions, tags, cohérence
export * from './series-photos-activites';

// ---------------------------------------------------------------------------------------------------------------
// Quotas (docs/sourcing-photos.md, « Quotas ») : très en dessous des limites des API (Pexels 200 / h et 20 000 / mois,
// Pixabay 100 / min), en plus de la fenêtre glissante et du cache 24 h de apps/admin/src/lib/photos-libres.ts
// ---------------------------------------------------------------------------------------------------------------

export const QUOTAS_SOURCING = {
  /** Requêtes de recherche (pages de 30) par cible : 8 → 240 résultats bruts au plus */
  requetesParCible: 8,
  /** Cibles traitées par lancement (« Tous les trous prioritaires », passage hebdomadaire) */
  ciblesParLancement: 3,
  /** Aperçus basse définition analysés par cible (en mémoire, jamais stockés) */
  apercusParCible: 160,
  /** Lancements automatiques (endpoint protégé) par jour et par instance */
  lancementsAutoParJour: 4,
  /** Séries proposées par cible (la meilleure + 2 alternatives) */
  seriesParCible: 3,
  /** Une série non décidée expire (aperçus des sources : affichage temporaire seulement) */
  joursAvantExpiration: 14,
} as const;

export const TAILLE_SERIE = { min: 6, max: 12 } as const;

// ---------------------------------------------------------------------------------------------------------------
// Cibles (trous)
// ---------------------------------------------------------------------------------------------------------------

export type TypeCible = 'profil' | 'kit' | 'theme';

export type CibleSourcing = {
  /** « profil:podologue:sport-basket », « kit:podologue:sport », « theme:psychomotricien:graphomotricite » */
  id: string;
  type: TypeCible;
  profession: string;
  /** Sujet visuel enregistré sur les photos (photos_libres.sujet, SUJETS_VISUELS) */
  sujet: string;
  /** Thème de recherche de la profession (recherche-photos-professions.ts) */
  theme: string;
  /** Thèmes cochés à l'acceptation (podologue : sujets visuels ; autre profession : thèmes de la profession) */
  themesDecision: string[];
  profil: string | null;
  libelle: string;
  /** Hashtag principal de l'activité (#basket), sinon null */
  activite: string | null;
  /** Emplacements visés, dans l'ordre (accueil, page-sujet, activite:basket, soin:k-taping, cabinet, theme:<hashtag>) */
  emplacements: string[];
  /** Hashtags pré-remplis à l'acceptation (activité, thème de la profession…) */
  hashtags: string[];
  /** Requêtes ciblées possibles (anglais), les plus précises d'abord */
  requetes: string[];
  priorite: number;
  raison: string;
  /** Gamme et traitement du finaliste de la chaîne des modèles (cohérence avec le modèle), sinon null */
  gamme: string | null;
  traitement: IdTraitementPhotos | null;
  /** Série d'activité (series-photos-activites.ts) : exclusions propres, vocabulaire du terrain accepté, cohérence visée */
  exclusions?: Required<ExclusionsSerie> | null;
  vocabulaire?: string[];
  coherence?: string | null;
};

const uniques = <T,>(l: readonly T[]) => [...new Set(l)];

/** Requêtes d'un emplacement POUR UNE PROFESSION (verrou : jamais une requête de pieds pour une autre profession que podologue) */
export function requetesEmplacementProfession(profession: string, sujet: string, theme: string, emplacement: string): string[] {
  const p = idProfession(profession);
  if (emplacement.startsWith('activite:')) {
    const h = emplacement.slice(9);
    const a = pratiqueDe(p).activites.find((x) => x.hashtags.includes(h));
    return a ? [...a.requetes] : [];
  }
  if (p === PROFESSION_PAR_DEFAUT) return requetesEmplacement(sujet, emplacement);
  // Autre profession : requêtes du thème (pack), quel que soit l'emplacement de page
  return requetesDuTheme(p, theme);
}

/** Hashtag posé sur une photo pour son emplacement (#accueil, #basket, #k-taping, #cabinet, #graphomotricite) ; « reserve » : aucun */
export function hashtagEmplacementSerie(emplacement: string): string | null {
  if (emplacement === 'reserve') return null;
  const i = emplacement.indexOf(':');
  return i >= 0 ? emplacement.slice(i + 1) : emplacement;
}

export const libelleEmplacementSerie = (e: string) => (e === 'reserve' ? 'Réserve (autres pages)' : e.startsWith('theme:') ? `Thème : #${e.slice(6)}` : libelleEmplacement(e));

const finalisteDe = (finalistes: EntreesCibles['finalistes'], profil: string) => (finalistes ?? []).find((f) => f.profil === profil);
const traitementValide = (t: string | null | undefined): IdTraitementPhotos | null => (t && traitementPhotos(t) ? (t as IdTraitementPhotos) : null);
const gammeValide = (g: string | null | undefined) => (g && gammeParId(g) ? g : null);

/** Cible d'un profil de référence de la profession (« Sourcer pour ce profil ») ; null si le profil est inconnu ou généraliste */
export function cibleProfil(profession: string, profilId: string, o: { finalistes?: EntreesCibles['finalistes']; priorite?: number; raison?: string } = {}): CibleSourcing | null {
  const p = idProfession(profession);
  const pratique = pratiqueDe(p);
  const profil = profilsDePratique(p).find((x) => x.id === profilId);
  if (!profil || !profil.principal) return null;
  const th = themePratique(pratique, profil.principal);
  const sujet = th?.sujetVisuel ?? 'general';
  // Thème de recherche : celui de la profession qui porte ce thème, sinon le sujet visuel
  const theme = themeRecherche(p, profil.principal) ? profil.principal : themeRecherche(p, sujet) ? sujet : 'general';
  const activite = profil.activites.length ? activitePratique(pratique, profil.activites[0]) : undefined;
  const h = activite?.hashtags[0] ?? null;
  const soins = (activite?.soins ?? th?.soins ?? []).filter((s) => p === PROFESSION_PAR_DEFAUT && REQUETES_SOINS[s]).slice(0, 2);
  const emplacements = ['accueil', 'page-sujet', ...(h ? [`activite:${h}`, `activite:${h}`] : []), ...soins.map((s) => `soin:${s}`)];
  const themeHashtags = themeRecherche(p, theme)?.hashtags ?? [];
  const requetes = uniques([
    ...(activite?.requetes ?? []),
    ...emplacements.filter((e) => !e.startsWith('activite:')).flatMap((e) => requetesEmplacementProfession(p, sujet, theme, e)),
    ...requetesDuTheme(p, theme),
  ]);
  const f = finalisteDe(o.finalistes, profil.id);
  // Série d'activité : ambiance après les requêtes de l'activité, tags (sujet, activité, profession), exclusions, vocabulaire du terrain
  const series = seriesDuProfil(profil.id).filter((s) => profil.activites.includes(s.activite));
  const serie = series.find((s) => s.activite === activite?.id) ?? series[0];
  if (serie) {
    const autres = series.filter((s) => s !== serie);
    const tete = [...(activite?.requetes ?? []), ...autres.flatMap((s) => activitePratique(pratique, s.activite)?.requetes.slice(0, 2) ?? [])];
    const requetesSerie = uniques([...tete, ...series.flatMap((s) => s.ambiance), ...requetes]);
    requetes.splice(0, requetes.length, ...requetesSerie);
  }
  const tagsSerie = series.flatMap((s) => tagsSerieActivite(p, s.activite));
  const coherence = serie ? coherenceSerieTexte(serie) : null;
  return {
    id: `profil:${p}:${profil.id}`, type: 'profil', profession: p, sujet, theme, themesDecision: p === PROFESSION_PAR_DEFAUT ? [sujet] : [theme], profil: profil.id, libelle: profil.court,
    activite: h, emplacements, hashtags: hashtagsValides([...(activite?.hashtags ?? []), ...themeHashtags, ...tagsSerie]), requetes,
    priorite: o.priorite ?? (f ? 100 : 50), raison: o.raison ?? `${f ? 'Profil d’un modèle finaliste' : `Profil ${profil.court}`}${coherence ? ` · série : ${coherence}` : ''}`,
    gamme: gammeValide(f?.gamme), traitement: traitementValide(f?.traitement),
    ...(serie ? { exclusions: exclusionsSerie(serie.activite), vocabulaire: uniques(series.flatMap((s) => s.vocabulaire)), coherence } : {}),
  };
}

/** Cible d'un kit d'images (podologue : sujets des kits) pour des emplacements à compléter */
export function cibleKit(profession: string, sujet: string, emplacements: readonly string[], o: { priorite?: number; raison?: string } = {}): CibleSourcing {
  const p = idProfession(profession);
  const theme = themeRecherche(p, sujet) ? sujet : 'general';
  const l = uniques(['accueil', 'page-sujet', ...emplacements]).filter((e) => e !== 'cabinet' || emplacements.includes('cabinet'));
  const libelle = themeRecherche(p, sujet)?.libelle ?? sujet;
  return {
    id: `kit:${p}:${sujet}`, type: 'kit', profession: p, sujet, theme, themesDecision: p === PROFESSION_PAR_DEFAUT ? [sujet] : [theme], profil: null, libelle: `Kit ${libelle}`,
    activite: null, emplacements: l, hashtags: hashtagsValides([hashtagKit(sujet), ...(themeRecherche(p, theme)?.hashtags ?? [])]),
    requetes: uniques([...l.flatMap((e) => requetesEmplacementProfession(p, sujet, theme, e)), ...requetesDuTheme(p, theme)]),
    priorite: o.priorite ?? 40, raison: o.raison ?? `Kit ${libelle} à compléter`, gamme: null, traitement: null,
  };
}

/** Cible d'un thème de la profession peu couvert (« Psychomotricité : 0 photo #graphomotricite ») */
export function cibleTheme(profession: string, theme: string, o: { priorite?: number; raison?: string } = {}): CibleSourcing | null {
  const p = idProfession(profession);
  const t = themeRecherche(p, theme);
  if (!t) return null;
  const h = t.hashtags[0] ?? null;
  return {
    id: `theme:${p}:${theme}`, type: 'theme', profession: p, sujet: t.sujet, theme, themesDecision: p === PROFESSION_PAR_DEFAUT ? [t.sujet] : [theme], profil: null, libelle: t.libelle,
    activite: null, emplacements: ['accueil', 'page-sujet', ...(h ? [`theme:${h}`, `theme:${h}`] : [])], hashtags: hashtagsValides([...t.hashtags]),
    requetes: requetesDuTheme(p, theme), priorite: o.priorite ?? 35, raison: o.raison ?? `Thème ${t.libelle} peu couvert`, gamme: null, traitement: null,
  };
}

export type EntreesCibles = {
  profession: string;
  /** Photos gardées ou importées (couverture) : hashtags, sujets, statut, professions effectives, note moyenne */
  photos: readonly (PhotoCouverture & { sujets?: readonly string[]; note?: number | null })[];
  /** Emplacements des kits à compléter (admin : emplacementsAFaire), podologue */
  kits?: readonly { sujet: string; emplacement: string; raison: 'vide' | 'faible' | 'complement' }[];
  /** Profils des modèles finalistes de la chaîne (gamme et traitement de leur version courante) */
  finalistes?: readonly { profil: string; gamme?: string | null; traitement?: string | null }[];
  /** Cibles qui ont déjà une série proposée en attente : pas de nouveau sourcing tant qu'elle attend */
  enAttente?: ReadonlySet<string> | readonly string[];
};

/** Photos minimales attendues par activité ou thème avant qu'il ne soit plus un trou (MINIMUMS_KIT.photo, plus une série) */
export const PHOTOS_ATTENDUES = { notees4: 2, total: 6 } as const;

/**
 * TROUS PRIORITAIRES d'une profession, du plus urgent au moins urgent (docs/sourcing-photos.md, « Priorités ») :
 *   profil de référence avec activité ou thème : n4 = photos de la profession portant le hashtag (notées ≥ 4 ★), n = toutes ;
 *     priorité = 30 + 40 si finaliste + 25 si n4 = 0 (12 si n4 < 2) + 2 · max(0, 6 − n) ; pas de trou si n4 ≥ 2 et n ≥ 6 ;
 *   kit (podologue) : 30 + 25 par emplacement vide (15 complément, 10 faible), + 10 pour le premier écran ou la page sujet, plafond 95 ;
 *   thème de la profession : 30 + 10 · (3 − photos) si moins de 3 photos.
 * Les cibles qui ont déjà une série en attente sont retirées.
 */
export function ciblesPrioritaires(e: EntreesCibles): CibleSourcing[] {
  const p = idProfession(e.profession);
  const attente = new Set(e.enAttente ?? []);
  const de = e.photos.filter((x) => x.statut !== 'retiree' && (x.professions.includes('commun') || x.professions.includes(p)));
  const res: CibleSourcing[] = [];
  const pratique = pratiqueDe(p);
  for (const profil of profilsDePratique(p)) {
    if (!profil.principal) continue;
    const a = profil.activites.length ? activitePratique(pratique, profil.activites[0]) : undefined;
    const sujet = themePratique(pratique, profil.principal)?.sujetVisuel ?? 'general';
    const portent = de.filter((x) => (a ? a.hashtags.some((h) => (x.hashtags ?? []).includes(h)) : (x.sujets ?? []).includes(sujet) || (x.hashtags ?? []).includes(profil.principal!)));
    const n = portent.length, n4 = portent.filter((x) => (x.note ?? 0) >= 4).length;
    const fin = Boolean(finalisteDe(e.finalistes, profil.id));
    if (n4 >= PHOTOS_ATTENDUES.notees4 && n >= PHOTOS_ATTENDUES.total && !fin) continue;
    const prio = 30 + (fin ? 40 : 0) + (n4 === 0 ? 25 : n4 < PHOTOS_ATTENDUES.notees4 ? 12 : 0) + 2 * Math.max(0, PHOTOS_ATTENDUES.total - n);
    const quoi = a ? `#${a.hashtags[0]}` : profil.court;
    const raison = `${fin ? 'Modèle finaliste · ' : ''}${n4 === 0 ? `aucune photo ${quoi} notée ≥ 4 ★` : `${n4} photo${n4 > 1 ? 's' : ''} ${quoi} notée${n4 > 1 ? 's' : ''} ≥ 4 ★`} (${n} au total)`;
    const c = cibleProfil(p, profil.id, { finalistes: e.finalistes, priorite: prio, raison });
    if (c) res.push(c);
  }
  // Kits (une cible par sujet, tous ses emplacements à compléter)
  const parSujet = new Map<string, { emplacements: string[]; prio: number; vides: number }>();
  for (const k of e.kits ?? []) {
    const x = parSujet.get(k.sujet) ?? { emplacements: [], prio: 30, vides: 0 };
    x.emplacements.push(k.emplacement);
    x.prio += (k.raison === 'vide' ? 25 : k.raison === 'complement' ? 15 : 10) + (k.emplacement === 'accueil' || k.emplacement === 'page-sujet' ? 10 : 0);
    if (k.raison === 'vide') x.vides++;
    parSujet.set(k.sujet, x);
  }
  for (const [sujet, x] of parSujet) {
    const n = x.emplacements.length;
    res.push(cibleKit(p, sujet, uniques(x.emplacements), { priorite: Math.min(95, x.prio), raison: `Kit ${themeRecherche(p, sujet)?.libelle ?? sujet} : ${n} emplacement${n > 1 ? 's' : ''} à compléter (${x.vides} vide${x.vides > 1 ? 's' : ''})` }));
  }
  for (const t of trousParProfession(p, de)) {
    if (t.photos >= 3) continue;
    const c = cibleTheme(p, t.theme, { priorite: 30 + 10 * (3 - t.photos), raison: `${t.libelle} : ${t.photos} photo${t.photos > 1 ? 's' : ''}${t.hashtag ? ` #${t.hashtag}` : ''}` });
    if (c) res.push(c);
  }
  // Une seule cible par identifiant (la plus prioritaire), sans celles qui attendent déjà une décision
  const m = new Map<string, CibleSourcing>();
  for (const c of res) if (!attente.has(c.id) && (!m.has(c.id) || m.get(c.id)!.priorite < c.priorite)) m.set(c.id, c);
  return [...m.values()].sort((a, b) => b.priorite - a.priorite || (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------------------------------------------------------
// Plan des requêtes
// ---------------------------------------------------------------------------------------------------------------

/** Générateur pseudo-aléatoire déterministe (mulberry32) */
export function aleaGraine(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RequetePlan = { source: SourcePhotoLibre; requete: string; page: number };

/** Requêtes « de tête » (les plus précises : activité, emplacements) prises d'office dans le plan, si elles ne sont pas saturées */
export const REQUETES_DE_TETE = 4;

/**
 * Plan des requêtes d'une cible : d'abord les REQUETES_DE_TETE premières requêtes de la cible (les plus précises : activité,
 * emplacements), sauf celles déjà saturées (≥ 6 photos gardées) ou trop souvent rejetées ; puis le reste du quota tiré sans remise
 * en privilégiant les moins couvertes (poids de choisirRequete : 1 / (1 + photos déjà gardées)²). Sources alternées ; page 2 pour
 * une requête déjà bien couverte (≥ 3 photos). `max` requêtes distinctes au plus.
 */
export function planRequetes(cible: Pick<CibleSourcing, 'requetes'>, o: { sources: readonly SourcePhotoLibre[]; couverture?: Readonly<Record<string, number>>; rejets?: Readonly<Record<string, number>>; graine?: number; max?: number }): RequetePlan[] {
  if (!o.sources.length || !cible.requetes.length) return [];
  const alea = aleaGraine(o.graine ?? 1);
  const restantes = [...cible.requetes];
  const plan: RequetePlan[] = [];
  const max = Math.max(1, o.max ?? QUOTAS_SOURCING.requetesParCible);
  const page = (q: string) => ((o.couverture?.[q] ?? 0) >= 3 ? 2 : 1);
  for (const q of cible.requetes.slice(0, Math.min(REQUETES_DE_TETE, max))) {
    if ((o.couverture?.[q] ?? 0) >= 6 || ((o.rejets?.[q] ?? 0) >= 8 && !(o.couverture?.[q] ?? 0))) continue;
    restantes.splice(restantes.indexOf(q), 1);
    plan.push({ source: o.sources[plan.length % o.sources.length], requete: q, page: page(q) });
  }
  while (plan.length < max && restantes.length) {
    const q = choisirRequete(restantes, o.couverture ?? {}, alea(), o.rejets ?? {});
    restantes.splice(restantes.indexOf(q), 1);
    plan.push({ source: o.sources[plan.length % o.sources.length], requete: q, page: (o.couverture?.[q] ?? 0) >= 3 ? 2 : 1 });
  }
  // Moins de requêtes que le quota : la première requête est relancée sur l'autre source (plus de candidates)
  for (let i = 0; plan.length < max && o.sources.length > 1 && i < cible.requetes.length; i++) {
    const x = plan[i];
    if (!x) break;
    const autre = o.sources.find((s) => s !== x.source)!;
    if (!plan.some((y) => y.requete === x.requete && y.source === autre)) plan.push({ source: autre, requete: x.requete, page: x.page });
  }
  return plan;
}

// ---------------------------------------------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------------------------------------------

/** Texte normalisé en mots (minuscules, sans accents) */
export function motsDuTexte(t: string): string[] {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Mots et expressions INTERDITS dans la description ou les étiquettes de la source (charte, docs/gout-paul.md R4, prompts-images.ts).
 * Expressions de plusieurs mots : recherchées telles quelles.
 */
export const MOTS_INTERDITS: Readonly<Record<'marque' | 'texte' | 'visage' | 'sang-plaie' | 'hors-metier', readonly string[]>> = {
  marque: ['nike', 'adidas', 'puma', 'reebok', 'asics', 'new balance', 'converse', 'vans', 'jordan', 'air jordan', 'skechers', 'crocs', 'hoka', 'salomon', 'under armour', 'fila', 'mizuno', 'brooks', 'logo', 'logos', 'brand', 'branding', 'trademark'],
  texte: ['text', 'quote', 'quotes', 'typography', 'lettering', 'letters', 'signage', 'billboard', 'poster', 'banner', 'caption', 'headline', 'slogan', 'word', 'words', 'message', 'inscription', 'neon sign', 'sign board'],
  visage: ['portrait', 'face', 'faces', 'selfie', 'headshot', 'smile', 'smiling', 'laughing', 'eyes', 'looking at camera', 'close up face', 'closeup face'],
  'sang-plaie': ['blood', 'bloody', 'bleeding', 'wound', 'wounds', 'injury', 'injured', 'scar', 'scars', 'surgery', 'surgical', 'stitches', 'ulcer', 'gangrene', 'pus', 'infected', 'infection', 'amputation', 'corpse', 'dead', 'tattoo', 'tattoos', 'tattooed'],
  'hors-metier': ['sexy', 'lingerie', 'bikini', 'fetish', 'nude', 'naked', 'erotic', 'sensual', 'alcohol', 'beer', 'wine', 'cocktail', 'cigarette', 'smoking', 'weapon', 'gun', 'pedicure polish', 'nail polish', 'nail art', 'high heels', 'stiletto'],
};
/** Mots qui laissent croire à un patient ou à un soignant réel, écartés pour les emplacements de soin (charte) */
export const MOTS_INTERDITS_SOINS: readonly string[] = ['patient', 'patients', 'doctor', 'nurse', 'hospital bed'];

/** Pieds, chaussures et équipements des activités (en plus de MOTS_METIER de suggestions-kits.ts) */
const MOTS_METIER_PODOLOGUE = ['sneaker', 'sneakers', 'cleats', 'boot', 'sock', 'socks', 'sandals', 'slippers', 'insoles', 'toes', 'podiatry', 'podiatrist', 'orthotic', 'orthotics', 'footwear', 'step', 'steps', 'stride', 'trail', 'hiking', 'hike', 'pedal', 'heels', 'legs', 'spikes', 'laces', 'shoelaces', 'footprints'];

const MOTS_VIDES = new Set(['a', 'an', 'the', 'of', 'on', 'in', 'with', 'and', 'for', 'at', 'to', 'by', 'up', 'close', 'closeup', 'care', 'light', 'soft', 'colorful', 'indoor', 'outdoor', 'room', 'person', 'people', 'interior', 'young', 'small', 'low', 'floor', 'table', 'line', 'lines', 'calm', 'first', 'healthy', 'treatment', 'tools', 'test']);

/**
 * Vocabulaire du MÉTIER d'une profession : un texte de source sans aucun de ces mots est « hors métier ». Podologue : MOTS_METIER
 * (pieds, chaussures, marche…) + équipements des activités ; autre profession : mots de ses requêtes (thèmes et activités) hors mots vides.
 */
export function vocabulaireMetier(profession: string): Set<string> {
  const p = idProfession(profession);
  const requetes = [...themesRecherche(p).flatMap((t) => [...t.requetes, ...t.exploration]), ...pratiqueDe(p).activites.flatMap((a) => a.requetes)];
  // Podologue : vocabulaire CURÉ (ses requêtes contiennent des mots trop généraux : « city walking », « tennis court »…)
  if (p === PROFESSION_PAR_DEFAUT) return new Set([...MOTS_METIER, ...MOTS_METIER_PODOLOGUE]);
  return new Set(requetes.flatMap(motsDuTexte).filter((m) => m.length > 2 && !MOTS_VIDES.has(m)));
}

const contientExpression = (mots: readonly string[], expr: string) => {
  const e = motsDuTexte(expr);
  if (e.length === 1) return mots.includes(e[0]);
  for (let i = 0; i + e.length <= mots.length; i++) if (e.every((m, j) => mots[i + j] === m)) return true;
  return false;
};

/** Orientation d'une candidate (même seuils que photos-libres.ts) */
export const orientationCandidate = (c: Pick<CandidatPhoto, 'largeur' | 'hauteur'>): 'paysage' | 'carree' | 'portrait' => {
  const r = c.hauteur ? c.largeur / c.hauteur : 0;
  return r >= 1.2 ? 'paysage' : r > 0.85 ? 'carree' : 'portrait';
};
/** Emplacements en grand bandeau (premier écran, page sujet) : paysage seulement (rapport ≥ 1,2) ; les autres : paysage ou carrée */
export const EMPLACEMENTS_PAYSAGE = ['accueil', 'page-sujet'] as const;
export const orientationsPermises = (emplacement: string): readonly ('paysage' | 'carree')[] => ((EMPLACEMENTS_PAYSAGE as readonly string[]).includes(emplacement) ? ['paysage'] : ['paysage', 'carree']);

export type RaisonEcart = 'deja-vue' | 'doublon' | 'trop-petite' | 'orientation' | 'marque' | 'texte' | 'visage' | 'enfant' | 'sang-plaie' | 'hors-metier' | 'apercu';
export const LIBELLES_ECARTS: Record<RaisonEcart, string> = {
  'deja-vue': 'déjà vue, rejetée ou proposée', doublon: 'doublon', 'trop-petite': 'trop petite', orientation: 'orientation', marque: 'marque', texte: 'texte',
  visage: 'visage', enfant: 'enfant identifiable', 'sang-plaie': 'sang, plaie ou tatouage', 'hors-metier': 'hors métier', apercu: 'aperçu illisible',
};

export type CandidateSourcing = CandidatPhoto & { requete: string };

/**
 * Filtre des candidates d'une cible : déjà vues (gardées, rejetées ou déjà proposées dans une série), doublons (même clé),
 * trop petites, portrait (et carrée si la cible n'a que des bandeaux), mots interdits (marque, texte, visage, sang / plaie,
 * hors métier ; pour les soins, aussi « patient », « médecin »), texte de la source sans aucun mot du métier.
 */
export function filtrerCandidatesSourcing(liste: readonly CandidateSourcing[], o: { profession: string; emplacements: readonly string[]; dejaVues?: ReadonlySet<string>; exclusions?: ExclusionsSerie | null; vocabulaire?: readonly string[] }): { gardees: CandidateSourcing[]; ecartees: { cle: string; raison: RaisonEcart }[] } {
  const vues = new Set(o.dejaVues ?? []);
  const vocab = new Set([...vocabulaireMetier(o.profession), ...(o.vocabulaire ?? [])]);
  // Exclusions d'une série d'activité (marques et compétitions, enfants identifiables, foule, dossards), après les mots interdits communs
  const exclusions = (Object.entries(o.exclusions ?? {}) as ['marque' | 'texte' | 'visage' | 'enfant', readonly string[] | undefined][]).filter(([, l]) => l?.length);
  const soins = o.emplacements.some((e) => e.startsWith('soin:'));
  const permises = new Set(o.emplacements.flatMap((e) => orientationsPermises(e)));
  const gardees: CandidateSourcing[] = [];
  const ecartees: { cle: string; raison: RaisonEcart }[] = [];
  const vuesIci = new Set<string>();
  for (const c of liste) {
    const cle = cleCandidat(c);
    const ecarter = (raison: RaisonEcart) => ecartees.push({ cle, raison });
    if (vuesIci.has(cle)) { ecarter('doublon'); continue; }
    vuesIci.add(cle);
    if (vues.has(cle)) { ecarter('deja-vue'); continue; }
    if (Math.max(c.largeur, c.hauteur) < LARGEUR_MIN || Math.min(c.largeur, c.hauteur) < HAUTEUR_MIN) { ecarter('trop-petite'); continue; }
    const or = orientationCandidate(c);
    if (or === 'portrait' || !permises.has(or)) { ecarter('orientation'); continue; }
    const mots = motsDuTexte(`${c.description} ${c.tags.join(' ')}`);
    const interdit = (Object.keys(MOTS_INTERDITS) as (keyof typeof MOTS_INTERDITS)[]).find((k) => MOTS_INTERDITS[k].some((m) => contientExpression(mots, m)));
    if (interdit) { ecarter(interdit); continue; }
    const exclue = exclusions.find(([, l]) => l!.some((m) => contientExpression(mots, m)));
    if (exclue) { ecarter(exclue[0]); continue; }
    if (soins && MOTS_INTERDITS_SOINS.some((m) => contientExpression(mots, m))) { ecarter('visage'); continue; }
    if (mots.length >= 2 && !mots.some((m) => vocab.has(m))) { ecarter('hors-metier'); continue; }
    gardees.push(c);
  }
  return { gardees, ecartees };
}

// ---------------------------------------------------------------------------------------------------------------
// Aperçu basse définition et caractéristiques visuelles
// ---------------------------------------------------------------------------------------------------------------

/**
 * Adresse de l'aperçu ANALYSÉ (basse définition, ≈ 340 px) : Pexels → service d'images (w=340), Pixabay → variante _340 de
 * webformatURL. Toujours un hôte d'images de la source (sinon null). L'image est lue en mémoire côté serveur, jamais stockée.
 */
export function urlApercuAnalyse(c: Pick<CandidatPhoto, 'source' | 'apercu'>): string | null {
  if (!urlImageAutorisee(c.source, c.apercu)) return null;
  try {
    const u = new URL(c.apercu);
    if (c.source === 'pexels') {
      u.searchParams.set('auto', 'compress'); u.searchParams.set('cs', 'tinysrgb'); u.searchParams.set('w', '340'); u.searchParams.delete('h');
      return u.toString();
    }
    u.pathname = u.pathname.replace(/_(640|960|1280)\.(jpe?g|png)$/i, '_340.$2');
    return u.toString();
  } catch {
    return null;
  }
}

export type CaracteristiquesPhoto = {
  /** Luminance moyenne (0-1) */
  luminosite: number;
  /** Saturation moyenne (TSV, 0-1) */
  saturation: number;
  /** Contraste : écart type de la luminance (0-0,5) */
  contraste: number;
  /** Température (−1 froide, +1 chaude), pondérée par la chroma, amortie pour une image presque grise */
  temperature: number;
  /** Netteté : moyenne du laplacien absolu de la luminance sur l'aperçu réduit */
  nettete: number;
  /** Part des pixels bouchés (luminance < 0,04) et brûlés (> 0,97) */
  sombres: number;
  brulees: number;
  /** Palette dominante (quantifierPalette, 5 couleurs) */
  palette: CouleurPalette[];
  /** Empreinte visuelle (différence de luminance 9 × 8, 64 bits en hexadécimal) : photos quasi identiques */
  empreinte: string;
};

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const borne = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/** Caractéristiques d'un aperçu réduit (pixels RVBA, largeur × hauteur, ≈ 96 px de côté) */
export function caracteristiquesPixels(pixels: ArrayLike<number>, largeur: number, hauteur: number): CaracteristiquesPhoto {
  const n = largeur * hauteur;
  const Y = new Float64Array(n);
  let sY = 0, sY2 = 0, sS = 0, sC = 0, sCT = 0, sombres = 0, brulees = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const r = pixels[4 * i] / 255, v = pixels[4 * i + 1] / 255, b = pixels[4 * i + 2] / 255;
    const y = 0.2126 * r + 0.7152 * v + 0.0722 * b;
    Y[i] = y;
    if ((pixels[4 * i + 3] ?? 255) < 128) continue;
    k++;
    sY += y; sY2 += y * y;
    const max = Math.max(r, v, b), min = Math.min(r, v, b), c = max - min;
    sS += max ? c / max : 0;
    if (c > 0.06) {
      const h = (max === r ? 60 * (((v - b) / c) % 6) : max === v ? 60 * ((b - r) / c + 2) : 60 * ((r - v) / c + 4)) + 360;
      sCT += c * Math.cos((((h % 360) - 30) * Math.PI) / 180);
      sC += c;
    }
    if (y < 0.04) sombres++;
    if (y > 0.97) brulees++;
  }
  const m = k || 1;
  const moy = sY / m;
  let lap = 0, nl = 0;
  for (let yy = 1; yy < hauteur - 1; yy++) for (let x = 1; x < largeur - 1; x++) {
    const i = yy * largeur + x;
    lap += Math.abs(4 * Y[i] - Y[i - 1] - Y[i + 1] - Y[i - largeur] - Y[i + largeur]);
    nl++;
  }
  return {
    luminosite: r3(moy), saturation: r3(sS / m), contraste: r3(Math.sqrt(Math.max(0, sY2 / m - moy * moy))),
    temperature: r3(sC ? (sCT / sC) * Math.min(1, sC / m / 0.12) : 0),
    nettete: r3(nl ? lap / nl : 0), sombres: r3(sombres / m), brulees: r3(brulees / m),
    palette: quantifierPalette(pixels, { n: 5 }),
    empreinte: empreinteDHash(Y, largeur, hauteur),
  };
}

/** Empreinte « dHash » : luminance moyennée sur 9 × 8 cases, bit = case plus claire que sa voisine de droite */
function empreinteDHash(Y: ArrayLike<number>, largeur: number, hauteur: number): string {
  const g: number[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 9; c++) {
    const x0 = Math.floor((c * largeur) / 9), x1 = Math.max(x0 + 1, Math.floor(((c + 1) * largeur) / 9));
    const y0 = Math.floor((r * hauteur) / 8), y1 = Math.max(y0 + 1, Math.floor(((r + 1) * hauteur) / 8));
    let s = 0, n = 0;
    for (let y = y0; y < y1 && y < hauteur; y++) for (let x = x0; x < x1 && x < largeur; x++) { s += Y[y * largeur + x]; n++; }
    g.push(n ? s / n : 0);
  }
  let hex = '';
  for (let r = 0; r < 8; r++) {
    let octet = 0;
    for (let c = 0; c < 8; c++) octet = (octet << 1) | (g[r * 9 + c] > g[r * 9 + c + 1] ? 1 : 0);
    hex += octet.toString(16).padStart(2, '0');
  }
  return hex;
}

const BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
/** Distance de Hamming entre deux empreintes (0 = identiques, 64 = opposées) ; empreinte absente : 64 */
export function distanceEmpreintes(a: string, b: string): number {
  if (!/^[0-9a-f]{16}$/.test(a) || !/^[0-9a-f]{16}$/.test(b)) return 64;
  let d = 0;
  for (let i = 0; i < 16; i++) d += BITS[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  return d;
}
/** Deux photos « quasi identiques » (même scène, recadrage, variante de la même séance) : distance ≤ 12 */
export const SEUIL_QUASI_IDENTIQUE = 12;

// ---------------------------------------------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------------------------------------------

/** Netteté de référence (laplacien moyen d'un aperçu net de 96 px) */
export const NETTETE_REFERENCE = 0.06;

/**
 * Qualité (0-1) = 0,25 · résolution + 0,4 · netteté + 0,35 · exposition.
 *   résolution = (petit côté − 900) / 1 500, bornée ; netteté = laplacien / 0,06, borné ;
 *   exposition = 1 − (bouchés + brûlés − 2 %) / 20 %, bornée, × 0,5 si la luminosité moyenne est < 0,22 (« trop sombre », R4)
 *   ou > 0,9.
 */
export function scoreQualite(c: Pick<CandidatPhoto, 'largeur' | 'hauteur'>, car: Pick<CaracteristiquesPhoto, 'nettete' | 'sombres' | 'brulees' | 'luminosite'>): number {
  const res = borne((Math.min(c.largeur, c.hauteur) - 900) / 1500);
  const net = borne(car.nettete / NETTETE_REFERENCE);
  let expo = borne(1 - (car.sombres + car.brulees - 0.02) / 0.2);
  if (car.luminosite < 0.22 || car.luminosite > 0.9) expo *= 0.5;
  return r3(0.25 * res + 0.4 * net + 0.35 * expo);
}

/**
 * Pertinence (0-1) : 0,3 (trouvée par une requête ciblée) + 0,15 par mot de la cible retrouvé dans le texte de la source
 * (description, étiquettes ; 4 au plus) + 0,1 si le texte contient un mot du métier. Sans texte : 0,35.
 */
export function scorePertinence(c: Pick<CandidateSourcing, 'description' | 'tags' | 'requete'>, cible: Pick<CibleSourcing, 'requetes' | 'hashtags' | 'activite' | 'profession'>): number {
  const mots = new Set(motsDuTexte(`${c.description} ${c.tags.join(' ')}`));
  if (!mots.size) return 0.35;
  const cibles = new Set([...motsDuTexte(c.requete), ...cible.requetes.slice(0, 6).flatMap(motsDuTexte), ...cible.hashtags.flatMap((h) => h.split('-')), ...(cible.activite ? [cible.activite] : [])].filter((m) => m.length > 2 && !MOTS_VIDES.has(m)));
  const communs = [...cibles].filter((m) => mots.has(m)).length;
  const metier = [...vocabulaireMetier(cible.profession)].some((m) => mots.has(m));
  return r3(borne(0.3 + 0.15 * Math.min(4, communs) + (metier ? 0.1 : 0)));
}

/** Température d'une gamme (étiquette d'harmonie, −1 à 1) */
export const temperatureGamme = (g: string | null | undefined) => (g ? etiquetteIngredient('gamme', g)?.p.t ?? 0 : 0);
/** Température d'une photo ramenée à l'échelle des gammes (±0,3 de photo ≈ ±1 de gamme) */
const temperatureEchelle = (t: number) => borne(t / 0.3, -1, 1);

/** Couleurs de la gamme qui comptent pour la proximité : accent, accent vif, signal, fond doux */
const couleursGamme = (g: string) => { const x = gammeParId(g); return x ? [x.accent, x.vif, x.signal, x.fondDoux].filter((c): c is string => typeof c === 'string') : []; };

/**
 * Compatibilité avec la gamme (0-1) = 0,7 · accord des températures + 0,3 · couleurs proches.
 *   accord = 1 − |température de la photo (÷ 0,3, bornée) − température de la gamme| / 2 ;
 *   couleurs proches = part de la palette à moins de 90 (distance perceptive) d'une couleur de la gamme, ÷ 15 %, bornée.
 * Sans gamme : 1 (neutre).
 */
export function compatibiliteGamme(car: Pick<CaracteristiquesPhoto, 'temperature' | 'palette'>, gamme: string | null | undefined): number {
  if (!gamme || !gammeParId(gamme)) return 1;
  const accord = 1 - Math.abs(temperatureEchelle(car.temperature) - temperatureGamme(gamme)) / 2;
  const cs = couleursGamme(gamme);
  const proche = car.palette.filter((p) => cs.some((c) => distance(p.hex, c) < 90)).reduce((s, p) => s + p.part, 0);
  return r3(0.7 * accord + 0.3 * borne(proche / 0.15));
}

export const POIDS_SCORE_CANDIDATE = { qualite: 0.45, pertinence: 0.35, gamme: 0.2 } as const;

export type CandidateAnalysee = CandidateSourcing & { car: CaracteristiquesPhoto; qualite: number; pertinence: number; gamme: number; score: number };

/** Score d'une candidate (0-1) : 0,45 · qualité + 0,35 · pertinence + 0,2 · compatibilité gamme */
export function analyserCandidate(c: CandidateSourcing, car: CaracteristiquesPhoto, cible: Pick<CibleSourcing, 'requetes' | 'hashtags' | 'activite' | 'profession' | 'gamme'>): CandidateAnalysee {
  const qualite = scoreQualite(c, car), pertinence = scorePertinence(c, cible), gamme = compatibiliteGamme(car, cible.gamme);
  const P = POIDS_SCORE_CANDIDATE;
  return { ...c, car, qualite, pertinence, gamme, score: r3(P.qualite * qualite + P.pertinence * pertinence + P.gamme * gamme) };
}

/** Écarte les quasi-doublons visuels (empreintes à ≤ 12) : garde la mieux notée de chaque groupe */
export function sansQuasiDoublons<T extends { car: Pick<CaracteristiquesPhoto, 'empreinte'>; score: number }>(l: readonly T[]): { gardees: T[]; doublons: T[] } {
  const gardees: T[] = [], doublons: T[] = [];
  for (const c of [...l].sort((a, b) => b.score - a.score)) {
    if (gardees.some((g) => distanceEmpreintes(g.car.empreinte, c.car.empreinte) <= SEUIL_QUASI_IDENTIQUE)) doublons.push(c);
    else gardees.push(c);
  }
  return { gardees, doublons };
}

// ---------------------------------------------------------------------------------------------------------------
// Cohérence d'une série
// ---------------------------------------------------------------------------------------------------------------

/**
 * Échelles de la dispersion : écart jugé « visible » pour chaque caractéristique (une photo à une échelle du centre compte 1).
 */
export const ECHELLES_SERIE = { luminosite: 0.12, saturation: 0.12, contraste: 0.06, temperature: 0.25, palette: 110 } as const;
type Dim = 'luminosite' | 'saturation' | 'contraste' | 'temperature';
const DIMS: readonly Dim[] = ['luminosite', 'saturation', 'contraste', 'temperature'];

/** Écart entre deux palettes : moyenne pondérée (parts) de la distance de chaque couleur à la plus proche de l'autre, symétrisée */
export function ecartPalettes(a: readonly CouleurPalette[], b: readonly CouleurPalette[]): number {
  if (!a.length || !b.length) return 0;
  const sens = (x: readonly CouleurPalette[], y: readonly CouleurPalette[]) => {
    const t = x.reduce((s, c) => s + c.part, 0) || 1;
    return x.reduce((s, c) => s + c.part * Math.min(...y.map((d) => distance(c.hex, d.hex))), 0) / t;
  };
  return (sens(a, b) + sens(b, a)) / 2;
}

type CarSerie = Pick<CaracteristiquesPhoto, Dim | 'palette'>;

/** Centre de la série (moyenne des quatre caractéristiques) */
export function centreSerie(l: readonly CarSerie[]): Record<Dim, number> {
  const c = { luminosite: 0, saturation: 0, contraste: 0, temperature: 0 };
  for (const x of l) for (const d of DIMS) c[d] += x[d] / (l.length || 1);
  return c;
}

/**
 * DISPERSION D d'une série E (docs/sourcing-photos.md, « Formule de cohérence ») :
 *   D = moyenne sur les photos de Σ_k ((x_k − μ_k) / e_k)² / 4   (k : luminosité, saturation, contraste, température ;
 *                                                                  μ : centre ; e : ECHELLES_SERIE)
 *     + moyenne sur les paires de (écart des palettes / 110)² / 2.
 * Chaque terme vaut ≈ 1 quand l'écart typique égale l'échelle. COHÉRENCE = 100 · exp(−D / 2) (100 : photos identiques de ton).
 */
export function dispersionSerie(l: readonly CarSerie[]): number {
  if (l.length < 2) return 0;
  const mu = centreSerie(l);
  let ton = 0;
  for (const x of l) ton += DIMS.reduce((s, d) => s + ((x[d] - mu[d]) / ECHELLES_SERIE[d]) ** 2, 0) / 4;
  ton /= l.length;
  let pal = 0, n = 0;
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) { pal += (ecartPalettes(l[i].palette, l[j].palette) / ECHELLES_SERIE.palette) ** 2; n++; }
  return r3(ton + (n ? pal / n / 2 : 0));
}
export const coherenceDepuisDispersion = (d: number) => Math.round(100 * Math.exp(-d / 2));

// ---------------------------------------------------------------------------------------------------------------
// Signature, gamme et traitement de la série
// ---------------------------------------------------------------------------------------------------------------

export type SignatureSerie = {
  luminosite: number; saturation: number; contraste: number; temperature: number;
  /** Teinte dominante des couleurs franches de la série (« vertes »), sinon null */
  teinte: string | null;
  /** Mots de la signature, dans l'ordre (lumière, température, couleur, contraste) */
  mots: string[];
  /** « lumineuse · chaude · naturelle · touches vertes » */
  libelle: string;
};

/** Nom (pluriel féminin, « touches … ») d'une teinte */
export function nomTeinteSerie(hexa: string): string {
  const [t, , l] = tslDe(hexa);
  const h = t * 360;
  if (h < 15 || h >= 345) return 'rouges';
  if (h < 45) return l < 0.45 ? 'terre' : 'orangées';
  if (h < 70) return 'jaunes';
  if (h < 170) return 'vertes';
  if (h < 200) return 'turquoise';
  if (h < 255) return 'bleues';
  if (h < 290) return 'violettes';
  return 'roses';
}

/** Palette réunie d'une série : couleurs des photos regroupées (distance < 56), parts cumulées, 6 au plus */
export function paletteSerie(l: readonly Pick<CaracteristiquesPhoto, 'palette'>[]): CouleurPalette[] {
  const g: { hex: string; part: number }[] = [];
  for (const c of l.flatMap((x) => x.palette).sort((a, b) => b.part - a.part || (a.hex < b.hex ? -1 : 1))) {
    const x = g.find((y) => distance(y.hex, c.hex) < 56);
    if (x) x.part += c.part; else g.push({ hex: c.hex, part: c.part });
  }
  const total = g.reduce((s, c) => s + c.part, 0) || 1;
  return g.sort((a, b) => b.part - a.part).slice(0, 6).map((c) => ({ hex: c.hex, part: r3(c.part / total) }));
}

/**
 * Signature : lumière (≥ 0,58 lumineuse, ≤ 0,36 sombre, sinon tamisée), température (≥ 0,1 chaude, ≤ −0,1 froide, sinon neutre),
 * couleur (saturation ≥ 0,42 vive, ≤ 0,2 douce, sinon naturelle), contraste (≥ 0,24 contrastée, ≤ 0,12 feutrée), teinte dominante
 * des couleurs franches de la palette réunie (≥ 6 % : « touches vertes »).
 */
export function signatureSerie(l: readonly CarSerie[]): SignatureSerie {
  const mu = centreSerie(l);
  const mots = [
    mu.luminosite >= 0.58 ? 'lumineuse' : mu.luminosite <= 0.36 ? 'sombre' : 'tamisée',
    mu.temperature >= 0.1 ? 'chaude' : mu.temperature <= -0.1 ? 'froide' : 'neutre',
    mu.saturation >= 0.42 ? 'vive' : mu.saturation <= 0.2 ? 'douce' : 'naturelle',
    ...(mu.contraste >= 0.24 ? ['contrastée'] : mu.contraste <= 0.12 ? ['feutrée'] : []),
  ];
  const franche = paletteSerie(l).find((c) => c.part >= 0.06 && estChromatique(c.hex));
  const teinte = franche ? nomTeinteSerie(franche.hex) : null;
  if (teinte) mots.push(`touches ${teinte}`);
  return { luminosite: r3(mu.luminosite), saturation: r3(mu.saturation), contraste: r3(mu.contraste), temperature: r3(mu.temperature), teinte, mots, libelle: mots.join(' · ') };
}

/**
 * Gamme de la série : celle de la cible (finaliste) si connue ; sinon la gamme SOBRE qui s'accorde le mieux (température de la série
 * vs gamme : 1 − |écart| / 2, + couleur franche dominante proche de l'accent : (180 − distance) / 180 si < 180).
 */
export function gammeSerie(sig: Pick<SignatureSerie, 'temperature'>, palette: readonly CouleurPalette[], gammeCible: string | null | undefined): string {
  if (gammeCible && gammeParId(gammeCible)) return gammeCible;
  const franche = palette.find((c) => estChromatique(c.hex))?.hex ?? null;
  const t = temperatureEchelle(sig.temperature);
  return GAMMES.filter((g) => (g.famille ?? 'sobre') === 'sobre').map((g) => {
    const d = franche ? distance(franche, g.accent) : 999;
    return { id: g.id, s: 1 - Math.abs(t - temperatureGamme(g.id)) / 2 + (d < 180 ? (180 - d) / 180 : 0) };
  }).sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1))[0].id;
}

/**
 * Traitement photo commun de la série (traitements-photos.ts) : celui du finaliste s'il est connu ; sinon
 *   cohérence < 55 → « voile » (le voile de la gamme unifie des photos disparates) ;
 *   température opposée à la gamme (série chaude et gamme froide ≤ −0,3, ou l'inverse ≥ 0,3) → « voile » ;
 *   série chaude et gamme chaude (≥ 0,3) → « chaud-doux » ; série vive (saturation ≥ 0,42) → « mat » ; sinon « modele » (naturel).
 */
export function traitementSerie(sig: Pick<SignatureSerie, 'temperature' | 'saturation'>, coherence: number, gamme: string, traitementCible?: IdTraitementPhotos | null): IdTraitementPhotos {
  if (traitementCible) return traitementCible;
  if (coherence < 55) return 'voile';
  const tg = temperatureGamme(gamme);
  if ((sig.temperature >= 0.1 && tg <= -0.3) || (sig.temperature <= -0.1 && tg >= 0.3)) return 'voile';
  if (sig.temperature >= 0.1 && tg >= 0.3) return 'chaud-doux';
  if (sig.saturation >= 0.42) return 'mat';
  return 'modele';
}

// ---------------------------------------------------------------------------------------------------------------
// Composition des séries
// ---------------------------------------------------------------------------------------------------------------

export type PhotoSerie = {
  cle: string;
  source: SourcePhotoLibre;
  idSource: string;
  apercu: string;
  pageUrl: string;
  auteur: string;
  auteurUrl: string | null;
  largeur: number;
  hauteur: number;
  requete: string;
  description: string;
  tags: string[];
  /** Emplacement prévu (accueil, page-sujet, activite:basket, soin:…, cabinet, theme:…, reserve) */
  emplacement: string;
  qualite: number;
  pertinence: number;
  score: number;
  /** Écart au centre de la série (même unité que la dispersion) */
  ecart: number;
  car: Pick<CaracteristiquesPhoto, Dim | 'palette' | 'empreinte'>;
};

export type SerieProposee = {
  /** Empreinte de la série (photos, dans l'ordre) */
  empreinte: string;
  titre: string;
  cible: CibleSourcing;
  signature: SignatureSerie;
  /** 0-100 */
  coherence: number;
  dispersion: number;
  /** Score global 0-100 = 50 · score moyen + 35 · cohérence / 100 + 15 · compatibilité gamme */
  score: number;
  gamme: string;
  traitement: IdTraitementPhotos;
  palette: CouleurPalette[];
  photos: PhotoSerie[];
  /** 0 = meilleure série, 1 et 2 = alternatives */
  rang: number;
};

export const POIDS_SERIE = { score: 0.5, coherence: 0.35, gamme: 0.15 } as const;
/** Pénalité de dispersion lors de l'ajout d'une photo (par unité de D ajoutée) */
export const LAMBDA_DISPERSION = 0.35;

const hache = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
export const empreinteSerie = (cles: readonly string[]) => hache(cles.join('|'));

/** Nombre de photos de la série visée : emplacements + 2, entre 6 et 12 */
export const tailleVisee = (cible: Pick<CibleSourcing, 'emplacements'>) => Math.max(TAILLE_SERIE.min, Math.min(TAILLE_SERIE.max, cible.emplacements.length + 2));

/**
 * Emplacement de chaque photo : premier écran = meilleure QUALITÉ en paysage (rapport ≥ 1,3 d'abord), page sujet = suivante en
 * paysage, puis les autres emplacements dans l'ordre (meilleure PERTINENCE), le reste en « réserve ».
 */
export function affecterEmplacements<T extends { largeur: number; hauteur: number; qualite: number; pertinence: number; cle: string }>(photos: readonly T[], emplacements: readonly string[]): (T & { emplacement: string })[] {
  const libres = [...photos];
  const res: (T & { emplacement: string })[] = [];
  const prendre = (e: string, cmp: (a: T, b: T) => number, ok: (x: T) => boolean) => {
    const l = libres.filter(ok).sort((a, b) => cmp(a, b) || (a.cle < b.cle ? -1 : 1));
    if (!l.length) return false;
    libres.splice(libres.indexOf(l[0]), 1);
    res.push({ ...l[0], emplacement: e });
    return true;
  };
  const rapport = (x: T) => (x.hauteur ? x.largeur / x.hauteur : 0);
  for (const e of emplacements) {
    if ((EMPLACEMENTS_PAYSAGE as readonly string[]).includes(e)) {
      if (!prendre(e, (a, b) => b.qualite - a.qualite, (x) => rapport(x) >= 1.3)) prendre(e, (a, b) => b.qualite - a.qualite, (x) => rapport(x) >= 1.2);
    } else prendre(e, (a, b) => b.pertinence - a.pertinence || b.qualite - a.qualite, () => true);
  }
  for (const x of libres.sort((a, b) => b.qualite + b.pertinence - a.qualite - a.pertinence || (a.cle < b.cle ? -1 : 1))) res.push({ ...x, emplacement: 'reserve' });
  return res;
}

/** Titre du lot : « Sélection de l'agent — Sport · basket · série lumineuse chaude (9 photos) » */
export const titreSerie = (libelleCible: string, sig: Pick<SignatureSerie, 'mots'>, n: number) =>
  `Sélection de l’agent — ${libelleCible} · série ${sig.mots.slice(0, 2).join(' ')} (${n} photo${n > 1 ? 's' : ''})`;

/** Une série à partir de photos analysées (ordre conservé) */
export function construireSerie(membres: readonly CandidateAnalysee[], cible: CibleSourcing, rang = 0): SerieProposee {
  const disp = dispersionSerie(membres.map((m) => m.car));
  const coherence = coherenceDepuisDispersion(disp);
  const signature = signatureSerie(membres.map((m) => m.car));
  const palette = paletteSerie(membres.map((m) => m.car));
  const gamme = gammeSerie(signature, palette, cible.gamme);
  const traitement = traitementSerie(signature, coherence, gamme, cible.traitement);
  const mu = centreSerie(membres.map((m) => m.car));
  const ecart = (m: CandidateAnalysee) => r3(DIMS.reduce((s, d) => s + ((m.car[d] - mu[d]) / ECHELLES_SERIE[d]) ** 2, 0) / 4);
  const places = affecterEmplacements(membres.map((m) => ({ ...m, cle: cleCandidat(m) })), cible.emplacements);
  const photos: PhotoSerie[] = places.map((m) => ({
    cle: cleCandidat(m), source: m.source, idSource: m.idSource, apercu: m.apercu, pageUrl: m.pageUrl, auteur: m.auteur, auteurUrl: m.auteurUrl, largeur: m.largeur, hauteur: m.hauteur,
    requete: m.requete, description: m.description, tags: m.tags.slice(0, 12), emplacement: m.emplacement, qualite: m.qualite, pertinence: m.pertinence, score: m.score, ecart: ecart(m),
    car: { luminosite: m.car.luminosite, saturation: m.car.saturation, contraste: m.car.contraste, temperature: m.car.temperature, palette: m.car.palette.slice(0, 5), empreinte: m.car.empreinte },
  }));
  const moyenne = membres.reduce((s, m) => s + m.score, 0) / (membres.length || 1);
  const compat = compatibiliteGamme({ temperature: signature.temperature, palette }, gamme);
  const P = POIDS_SERIE;
  return {
    empreinte: empreinteSerie(photos.map((p) => p.cle)), titre: titreSerie(cible.libelle, signature, photos.length), cible, signature, coherence, dispersion: disp,
    score: Math.round(100 * (P.score * moyenne + (P.coherence * coherence) / 100 + P.gamme * compat)), gamme, traitement, palette, photos, rang,
  };
}

/**
 * SÉRIES d'une cible (docs/sourcing-photos.md, « Composition ») : pour chaque graine (les 10 meilleures candidates en paysage), on
 * ajoute pas à pas la candidate qui maximise score − 0,35 · (hausse de dispersion), sous contraintes : jamais deux photos quasi
 * identiques (empreintes à ≤ 12), au plus un tiers de la série (2 au moins) par requête, assez de paysages pour les bandeaux.
 * Valeur d'une série = 0,5 · score moyen + 0,35 · cohérence + 0,15 · compatibilité gamme : on garde la meilleure. Puis jusqu'à 2
 * ALTERNATIVES, recomposées de la même façon avec au plus un tiers de photos déjà prises par une série retenue (graines nouvelles
 * seulement) ; parmi elles, d'abord celle dont la signature diffère (libellé différent, ou centres à plus de 0,8 échelle), sinon la
 * meilleure. Moins de 6 candidates utilisables : aucune série (motif).
 */
export function composerSeriesPhotos(candidates: readonly CandidateAnalysee[], cible: CibleSourcing, o: { n?: number; taille?: number } = {}): { series: SerieProposee[]; motif: string | null } {
  const { gardees: pool } = sansQuasiDoublons(candidates);
  const taille = Math.max(TAILLE_SERIE.min, Math.min(TAILLE_SERIE.max, o.taille ?? tailleVisee(cible)));
  if (pool.length < TAILLE_SERIE.min) return { series: [], motif: `Pas assez de candidates utilisables (${pool.length} sur ${TAILLE_SERIE.min} au moins).` };
  const bandeaux = cible.emplacements.filter((e) => (EMPLACEMENTS_PAYSAGE as readonly string[]).includes(e)).length;
  const paysage = (c: CandidateAnalysee) => orientationCandidate(c) === 'paysage';
  const parRequeteMax = Math.max(2, Math.ceil(taille / 3));
  const tri = [...pool].sort((a, b) => b.score - a.score || (cleCandidat(a) < cleCandidat(b) ? -1 : 1));
  /** Série gloutonne depuis une graine ; au plus `maxPrises` photos de `prises` (photos des séries déjà retenues) */
  const depuisGraine = (g: CandidateAnalysee, prises: ReadonlySet<string>, maxPrises: number): SerieProposee | null => {
    const E: CandidateAnalysee[] = [g];
    while (E.length < taille) {
      const dE = dispersionSerie(E.map((x) => x.car));
      const manquePaysage = Math.max(0, bandeaux - E.filter(paysage).length);
      const restePlaces = taille - E.length;
      const nPrises = E.filter((x) => prises.has(cleCandidat(x))).length;
      let best: CandidateAnalysee | null = null, bestG = -Infinity;
      for (const c of tri) {
        if (E.includes(c)) continue;
        if (prises.has(cleCandidat(c)) && nPrises >= maxPrises) continue;
        if (E.some((x) => distanceEmpreintes(x.car.empreinte, c.car.empreinte) <= SEUIL_QUASI_IDENTIQUE)) continue;
        if (E.filter((x) => x.requete === c.requete).length >= parRequeteMax) continue;
        if (manquePaysage >= restePlaces && !paysage(c)) continue;
        const gain = c.score - LAMBDA_DISPERSION * (dispersionSerie([...E, c].map((x) => x.car)) - dE);
        if (gain > bestG + 1e-9) { bestG = gain; best = c; }
      }
      if (!best) break;
      E.push(best);
    }
    return E.length >= TAILLE_SERIE.min && E.filter(paysage).length >= Math.min(bandeaux, E.length) ? construireSerie(E, cible) : null;
  };
  const differe = (r: SerieProposee, s: SerieProposee) => r.signature.libelle !== s.signature.libelle || DIMS.reduce((x, d) => x + ((r.signature[d] - s.signature[d]) / ECHELLES_SERIE[d]) ** 2, 0) ** 0.5 > 0.8;
  const retenues: SerieProposee[] = [];
  const n = Math.max(1, o.n ?? QUOTAS_SOURCING.seriesParCible);
  for (let k = 0; k < n; k++) {
    const prises = new Set(retenues.flatMap((r) => r.photos.map((p) => p.cle)));
    const graines = tri.filter((c) => paysage(c) && !prises.has(cleCandidat(c))).slice(0, 10);
    const essais = graines.map((g) => depuisGraine(g, prises, k ? Math.floor(taille / 3) : taille)).filter((x): x is SerieProposee => x !== null)
      .filter((x) => !retenues.some((r) => r.empreinte === x.empreinte))
      .sort((a, b) => b.score - a.score || (a.empreinte < b.empreinte ? -1 : 1));
    const choisie = essais.find((x) => retenues.every((r) => differe(r, x))) ?? essais[0];
    if (!choisie) break;
    retenues.push({ ...choisie, rang: k });
  }
  if (!retenues.length) return { series: [], motif: 'Aucune série assez variée (trop de photos quasi identiques ou d’une seule requête).' };
  return { series: retenues, motif: null };
}

// ---------------------------------------------------------------------------------------------------------------
// Stockage (table photos_series, migration 0053) et affichage
// ---------------------------------------------------------------------------------------------------------------

export const STATUTS_SERIE = ['proposee', 'acceptee', 'refusee', 'remplacee', 'expiree'] as const;
export type StatutSerie = (typeof STATUTS_SERIE)[number];

/** Ligne de photos_series (sans id ni dates, posés par la base) */
export type LigneSerie = {
  groupe: string; rang: number; profession: string; cible: string; cible_details: CibleSourcing; titre: string; signature: SignatureSerie;
  coherence: number; dispersion: number; score: number; gamme: string; traitement: string; palette: CouleurPalette[]; photos: PhotoSerie[];
  empreinte: string; statut: StatutSerie; journal: JournalSourcing;
};

/** Journal d'un lancement (requêtes, candidates, écarts) : expliqué dans la carte de la série */
export type JournalSourcing = { requetes: RequetePlan[]; candidates: number; analysees: number; ecartees: Partial<Record<RaisonEcart, number>>; erreurs: string[] };

export const ligneDeSerie = (s: SerieProposee, groupe: string, journal: JournalSourcing): LigneSerie => ({
  groupe, rang: s.rang, profession: s.cible.profession, cible: s.cible.id, cible_details: s.cible, titre: s.titre, signature: s.signature, coherence: s.coherence, dispersion: s.dispersion,
  score: s.score, gamme: s.gamme, traitement: s.traitement, palette: s.palette, photos: s.photos, empreinte: s.empreinte, statut: 'proposee', journal,
});

export type SerieEnregistree = Omit<LigneSerie, 'cible_details'> & { id: string; cibleDetails: CibleSourcing; creeLe: string; expireLe: string | null };

const estPhotoSerie = (p: unknown): p is PhotoSerie => {
  const x = p as PhotoSerie;
  return Boolean(x && (x.source === 'pexels' || x.source === 'pixabay') && /^[0-9]{1,20}$/.test(String(x.idSource)) && urlImageAutorisee(x.source, x.apercu) && urlPageAutorisee(x.source, x.pageUrl) && typeof x.emplacement === 'string');
};

/** Ligne lue en base → série (photos invalides retirées : hôte inattendu, identifiant invalide) ; null si inutilisable */
export function serieDepuisLigne(l: Record<string, unknown>): SerieEnregistree | null {
  if (typeof l?.id !== 'string' || typeof l.titre !== 'string' || !Array.isArray(l.photos)) return null;
  const photos = (l.photos as unknown[]).filter(estPhotoSerie).map((p) => ({ ...p, cle: `${p.source}:${p.idSource}` }));
  if (!photos.length) return null;
  const statut = (STATUTS_SERIE as readonly unknown[]).includes(l.statut) ? (l.statut as StatutSerie) : 'proposee';
  const cible = (l.cible_details ?? {}) as CibleSourcing;
  return {
    id: l.id, groupe: String(l.groupe ?? ''), rang: Number(l.rang ?? 0), profession: String(l.profession ?? PROFESSION_PAR_DEFAUT), cible: String(l.cible ?? ''), cibleDetails: cible,
    titre: l.titre, signature: l.signature as SignatureSerie, coherence: Number(l.coherence ?? 0), dispersion: Number(l.dispersion ?? 0), score: Number(l.score ?? 0),
    gamme: String(l.gamme ?? 'canard'), traitement: String(l.traitement ?? 'modele'), palette: Array.isArray(l.palette) ? (l.palette as CouleurPalette[]) : [], photos,
    empreinte: String(l.empreinte ?? empreinteSerie(photos.map((p) => p.cle))), statut, journal: (l.journal ?? { requetes: [], candidates: 0, analysees: 0, ecartees: {}, erreurs: [] }) as JournalSourcing,
    creeLe: String(l.created_at ?? ''), expireLe: typeof l.expire_le === 'string' ? l.expire_le : null,
  };
}

/** Série encore proposée et non expirée */
export const serieEnAttente = (s: Pick<SerieEnregistree, 'statut' | 'expireLe'>, maintenant: Date = new Date()) => s.statut === 'proposee' && (!s.expireLe || new Date(s.expireLe).getTime() > maintenant.getTime());

/**
 * Hashtags d'une photo acceptée : ceux de la cible (activité, thème de la profession), celui de son emplacement (#accueil, #basket,
 * #k-taping…), #kit-<sujet> (photo gardée pour le kit du sujet) et #serie-<empreinte> (la série reste groupée). 15 au plus.
 */
export function hashtagsAcceptation(s: Pick<SerieEnregistree, 'empreinte' | 'cibleDetails'>, p: Pick<PhotoSerie, 'emplacement'>): string[] {
  const e = hashtagEmplacementSerie(p.emplacement);
  return hashtagsValides([...s.cibleDetails.hashtags, ...(e ? [e] : []), hashtagKit(s.cibleDetails.sujet), `serie-${s.empreinte}`]);
}

// ---------------------------------------------------------------------------------------------------------------
// Export (dépôt public) et revue de Claude
// ---------------------------------------------------------------------------------------------------------------

export type SerieExportee = {
  id: string; empreinte: string; titre: string; profession: string; cible: string; profil: string | null; sujet: string; activite: string | null;
  signature: string; coherence: number; score: number; gamme: string; traitement: string; jour: string | null;
  /** Aperçus PUBLICS des sources (adresse de l'image et de la page), identifiants, emplacement, scores : jamais d'auteur ni de clé */
  photos: { cle: string; apercu: string; page: string; emplacement: string; qualite: number; pertinence: number; ecart: number }[];
};

/** Série → forme exportée (retours/series-photos-proposees.json : dépôt public, aucune donnée personnelle) */
export function seriePourExport(s: SerieEnregistree): SerieExportee {
  return {
    id: s.id, empreinte: s.empreinte, titre: s.titre, profession: s.profession, cible: s.cible, profil: s.cibleDetails?.profil ?? null, sujet: s.cibleDetails?.sujet ?? 'general',
    activite: s.cibleDetails?.activite ?? null, signature: s.signature?.libelle ?? '', coherence: s.coherence, score: s.score, gamme: s.gamme, traitement: s.traitement, jour: s.creeLe ? s.creeLe.slice(0, 10) : null,
    photos: s.photos.map((p) => ({ cle: p.cle, apercu: p.apercu, page: p.pageUrl, emplacement: p.emplacement, qualite: p.qualite, pertinence: p.pertinence, ecart: p.ecart })),
  };
}

export const RAISONS_ECART_CLAUDE = ['faible', 'hors-sujet', 'anatomie-douteuse', 'texte', 'marque', 'visage', 'doublon', 'sombre', 'patient', 'autre'] as const;
export type RaisonEcartClaude = (typeof RAISONS_ECART_CLAUDE)[number];
export const LIBELLES_ECARTS_CLAUDE: Record<RaisonEcartClaude, string> = {
  faible: 'photo faible', 'hors-sujet': 'hors sujet', 'anatomie-douteuse': 'anatomie douteuse', texte: 'texte visible', marque: 'marque visible', visage: 'visage reconnaissable',
  doublon: 'quasi doublon', sombre: 'trop sombre', patient: 'laisse croire à un patient', autre: 'autre',
};

export type RevueSerieClaude = {
  /** Empreinte de la série revue : une revue ne s'applique qu'à la série exacte qu'elle a regardée */
  empreinte: string;
  /** Clés retenues, dans l'ordre conseillé */
  retenues: string[];
  ecartees: { cle: string; raison: RaisonEcartClaude; detail: string | null }[];
  /** Note prédite de la série (1-5, docs/gout-paul.md) : jamais une note de Paul */
  note: number | null;
  remarque: string | null;
  le: string | null;
  profil: string | null;
};

const CLE = /^(pexels|pixabay):[0-9]{1,20}$/;

/** Lecture de retours/series-photos-claude.json ({ series: { <id>: revue } }) ; entrées invalides ignorées */
export function lireRevuesSeries(brut: unknown): Record<string, RevueSerieClaude> {
  const series = (brut && typeof brut === 'object' ? (brut as { series?: unknown }).series : null) ?? {};
  const res: Record<string, RevueSerieClaude> = {};
  for (const [id, v] of Object.entries(series as Record<string, unknown>)) {
    const x = v as Partial<RevueSerieClaude> & { ecartees?: unknown[] };
    if (!/^[0-9a-f-]{36}$/i.test(id) || !x || typeof x.empreinte !== 'string' || !/^[0-9a-f]{8}$/.test(x.empreinte)) continue;
    const retenues = uniques((Array.isArray(x.retenues) ? x.retenues : []).filter((c): c is string => typeof c === 'string' && CLE.test(c)));
    const ecartees = (Array.isArray(x.ecartees) ? x.ecartees : []).map((e) => e as { cle?: unknown; raison?: unknown; detail?: unknown })
      .filter((e) => typeof e.cle === 'string' && CLE.test(e.cle) && !retenues.includes(e.cle))
      .map((e) => ({ cle: e.cle as string, raison: ((RAISONS_ECART_CLAUDE as readonly unknown[]).includes(e.raison) ? e.raison : 'autre') as RaisonEcartClaude, detail: typeof e.detail === 'string' ? e.detail.slice(0, 200) : null }));
    const note = typeof x.note === 'number' && Number.isInteger(x.note) && x.note >= 1 && x.note <= 5 ? x.note : null;
    res[id.toLowerCase()] = { empreinte: x.empreinte, retenues, ecartees, note, remarque: typeof x.remarque === 'string' ? x.remarque.slice(0, 400) : null, le: typeof x.le === 'string' ? x.le.slice(0, 10) : null, profil: typeof x.profil === 'string' ? x.profil.slice(0, 40) : null };
  }
  return res;
}

export type SerieRevue<P extends { cle: string }> = { photos: P[]; ecartees: (P & { raisonClaude: RaisonEcartClaude; detailClaude: string | null })[]; revue: RevueSerieClaude | null; libelle: string | null };

/**
 * Revue de Claude appliquée à une série : si l'empreinte correspond, photos retenues dans l'ordre conseillé (les photos ni retenues
 * ni écartées gardent leur place à la suite), écartées masquées, « Revu par Claude : 8/9 retenues ». Sinon la série telle quelle.
 */
export function appliquerRevueSerie<P extends { cle: string }>(s: { empreinte: string; photos: readonly P[] }, revue: RevueSerieClaude | null | undefined): SerieRevue<P> {
  if (!revue || revue.empreinte !== s.empreinte) return { photos: [...s.photos], ecartees: [], revue: null, libelle: null };
  const ecart = new Map(revue.ecartees.map((e) => [e.cle, e]));
  const ordre = new Map(revue.retenues.map((c, i) => [c, i]));
  const photos = s.photos.filter((p) => !ecart.has(p.cle)).map((p, i) => ({ p, i })).sort((a, b) => (ordre.get(a.p.cle) ?? 1000 + a.i) - (ordre.get(b.p.cle) ?? 1000 + b.i)).map((x) => x.p);
  const ecartees = s.photos.filter((p) => ecart.has(p.cle)).map((p) => ({ ...p, raisonClaude: ecart.get(p.cle)!.raison, detailClaude: ecart.get(p.cle)!.detail }));
  return { photos, ecartees, revue, libelle: `Revu par Claude : ${photos.length}/${s.photos.length} retenue${photos.length > 1 ? 's' : ''}` };
}

/** Séries à faire revoir par Claude : proposées, non expirées, sans revue pour leur empreinte exacte */
export const seriesARevoir = (series: readonly SerieEnregistree[], revues: Readonly<Record<string, RevueSerieClaude>>, maintenant: Date = new Date()) =>
  series.filter((s) => serieEnAttente(s, maintenant) && revues[s.id.toLowerCase()]?.empreinte !== s.empreinte);
