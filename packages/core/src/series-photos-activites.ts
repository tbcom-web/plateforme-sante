// SÉRIES DE SOURCING PAR ACTIVITÉ (demande de Paul du 2026-10-10 : « compléter la banque de photos pour Basket, Tennis, Golf,
// Cyclisme » : aucune photo de ces activités, ce qui bloque les tracés sur photo, photo-trace.ts, et les modèles « photo » des
// profils Sport · basket / tennis / golf / cyclisme). Rattrapage des profils course et trail / randonnée quand ils sont pauvres.
//
// Une SÉRIE d'activité complète la cible du profil (sourcing-photos.ts, cibleProfil) :
// - requêtes : celles de l'activité (pratiques.ts : pied, chaussure, appui, les plus précises d'abord, prises d'office par
//   planRequetes) puis les requêtes d'AMBIANCE ci-dessous (terrain, lumière), anglaises, esthétiques ;
// - vocabulaire du terrain accepté pour CETTE cible seulement (« fairway », « hardwood »…) : sans lui, une photo d'ambiance serait
//   écartée « hors métier » (le vocabulaire général du podologue reste pied / chaussure / marche) ;
// - exclusions propres (marques et compétitions de l'activité, enfants identifiables, foule, dossards et tableaux d'affichage),
//   en plus des MOTS_INTERDITS communs (logos, texte, visages, sang) ;
// - cohérence visuelle visée (lumière, palette, cadrage) : rappelée dans la raison de la cible et dans la revue de Claude ; la
//   composition des séries (composerSeriesPhotos) minimise déjà la dispersion de lumière, de palette et de température ;
// - tags automatiques à l'acceptation : sujet (#sport), activité (#basket…), profession (#profession-podologue), puis ceux de
//   l'emplacement, du kit et de la série (hashtagsAcceptation).
// Module pur, sans réseau : le sourcing réel est lancé par Paul depuis l'admin (/admin/sujets).

import { activitePratique, pratiqueDe } from './pratiques';
import { hashtagsValides } from './hashtags';
import { idProfession } from './professions';

/** Raisons d'exclusion propres à une série (s'ajoutent aux MOTS_INTERDITS de sourcing-photos.ts) */
export type ExclusionsSerie = Partial<Record<'marque' | 'texte' | 'visage' | 'enfant', readonly string[]>>;

export type SerieActivite = {
  /** Activité de la pratique (pratiques.ts) */
  activite: string;
  /** Profil de référence alimenté (sujet « À valider » du même identifiant) */
  profil: string;
  /** Requêtes d'ambiance (terrain, lumière), après celles de l'activité */
  ambiance: readonly string[];
  /** Mots du terrain acceptés pour cette cible (anglais, minuscules, sans accents) */
  vocabulaire: readonly string[];
  exclusions: ExclusionsSerie;
  /** Cohérence visuelle visée */
  coherence: { lumiere: string; palette: string; cadrage: string };
};

/** Exclusions communes à toutes les séries d'activité (profils adultes : jamais d'enfant identifiable, ni foule, ni dossard) */
export const EXCLUSIONS_SERIES_COMMUNES: Required<ExclusionsSerie> = {
  marque: ['sponsor', 'sponsored', 'advertising', 'advertisement', 'merchandise', 'shoe store display'],
  texte: ['scoreboard', 'jersey number', 'race number', 'race bib', 'bib number', 'start number'],
  visage: ['crowd', 'spectators', 'audience', 'fans', 'team photo', 'group photo', 'celebrating', 'celebration'],
  enfant: ['child', 'children', 'kid', 'kids', 'boy', 'boys', 'girl', 'girls', 'toddler', 'baby', 'schoolboy', 'schoolgirl', 'teen', 'teens', 'teenager', 'youth', 'junior'],
};

export const SERIES_ACTIVITES: readonly SerieActivite[] = [
  {
    activite: 'basket', profil: 'sport-basket',
    ambiance: ['indoor basketball court floor light', 'basketball court hardwood floor', 'basketball shoes on court line', 'outdoor basketball court sunset'],
    vocabulaire: ['basketball', 'court', 'hardwood', 'parquet', 'hoop', 'dribble', 'jump', 'jumping', 'layup', 'gym'],
    exclusions: { marque: ['nba', 'wnba', 'euroleague', 'spalding', 'wilson', 'molten'] },
    coherence: { lumiere: 'salle, lumière chaude et rasante sur le parquet', palette: 'bois miel, orangé, touches sombres', cadrage: 'bas, au ras du parquet : appuis, pivot, réception de saut' },
  },
  {
    activite: 'tennis', profil: 'sport-tennis',
    ambiance: ['clay tennis court lines', 'tennis court baseline morning', 'tennis ball on clay court', 'padel court shoes'],
    vocabulaire: ['tennis', 'court', 'clay', 'baseline', 'racket', 'racquet', 'padel', 'serve', 'footwork'],
    exclusions: { marque: ['wilson', 'babolat', 'yonex', 'roland garros', 'wimbledon', 'us open', 'australian open', 'atp', 'wta'] },
    coherence: { lumiere: 'lumière de jour franche, ombres nettes', palette: 'terre battue ocre, blanc des lignes, vert', cadrage: 'pieds sur la ligne de fond, appuis latéraux, glissade' },
  },
  {
    activite: 'golf', profil: 'sport-golf',
    ambiance: ['golf course morning', 'golf fairway sunrise mist', 'golf ball tee grass close up', 'golf green flag morning light'],
    vocabulaire: ['golf', 'golfer', 'golfing', 'fairway', 'green', 'tee', 'putting', 'putt', 'course', 'grass', 'stance', 'swing'],
    exclusions: { marque: ['titleist', 'callaway', 'footjoy', 'taylormade', 'pga', 'ryder cup'] },
    coherence: { lumiere: 'matin doux et doré, brume légère', palette: 'verts du gazon, blanc, sable', cadrage: 'chaussures et posture à l’adresse, plans larges du parcours' },
  },
  {
    activite: 'cyclisme', profil: 'sport-cyclisme',
    ambiance: ['road bike countryside road', 'gravel bike forest path', 'cyclist mountain road morning', 'bike pedal crank close up'],
    vocabulaire: ['cycling', 'cyclist', 'bike', 'bicycle', 'pedal', 'pedals', 'pedaling', 'pedalling', 'cleat', 'cleats', 'clipless', 'crank', 'gravel', 'road'],
    exclusions: { marque: ['shimano', 'sram', 'specialized', 'cannondale', 'pinarello', 'tour de france', 'strava'] },
    coherence: { lumiere: 'lumière naturelle de route, fin de journée', palette: 'asphalte gris, verts de campagne, touche vive', cadrage: 'chaussure clipsée sur la pédale, jambes en mouvement' },
  },
  {
    activite: 'course', profil: 'sport-course',
    ambiance: ['running track lanes morning', 'runner park path morning light'],
    vocabulaire: ['jogging', 'jogger', 'track', 'asphalt', 'stride', 'marathon'],
    exclusions: { marque: ['garmin', 'strava'] },
    coherence: { lumiere: 'matin, lumière basse et chaude', palette: 'asphalte, verts, touche vive de la chaussure', cadrage: 'foulée au ras du sol, chaussure en appui' },
  },
  {
    activite: 'trail', profil: 'sport-rando',
    ambiance: ['mountain trail path morning', 'trail running forest path light'],
    vocabulaire: ['mountain', 'path', 'rocky', 'rocks', 'downhill', 'uphill', 'mud', 'muddy'],
    exclusions: { marque: ['merrell', 'the north face', 'columbia', 'quechua', 'decathlon', 'garmin'] },
    coherence: { lumiere: 'lumière de montagne, matin ou fin de journée', palette: 'roche, terre, verts profonds', cadrage: 'chaussure à crampons sur le sentier, appui en pente' },
  },
  {
    activite: 'randonnee', profil: 'sport-rando',
    ambiance: ['mountain hiking path', 'hiking trail forest light'],
    vocabulaire: ['hiker', 'mountain', 'path', 'rocky', 'rocks', 'meadow'],
    exclusions: { marque: ['merrell', 'the north face', 'columbia', 'quechua', 'decathlon'] },
    coherence: { lumiere: 'lumière de montagne, matin ou fin de journée', palette: 'roche, terre, verts profonds', cadrage: 'chaussure montante sur le chemin, pas posé' },
  },
];

/** Profils prioritaires du lot du 2026-10-10 (aucune photo de l'activité), puis rattrapage si pauvres */
export const PROFILS_SERIES_PRIORITAIRES = ['sport-basket', 'sport-tennis', 'sport-golf', 'sport-cyclisme'] as const;
export const PROFILS_SERIES_RATTRAPAGE = ['sport-rando', 'sport-course'] as const;
/** En dessous de ce nombre de photos, un sujet propose « Sourcer des photos » (PHOTOS_ATTENDUES.total de sourcing-photos.ts) */
export const SEUIL_PHOTOS_SUJET = 6;

export const serieDeLActivite = (activite: string | null | undefined) => SERIES_ACTIVITES.find((s) => s.activite === activite);
/** Séries d'un profil (« Sport · trail / randonnée » : deux activités) */
export const seriesDuProfil = (profil: string | null | undefined) => SERIES_ACTIVITES.filter((s) => s.profil === profil);

/**
 * Tags automatiques d'une photo sourcée pour une activité : sujet visuel (#sport), hashtags de l'activité (#basket, #basketball),
 * profession (#profession-podologue : rattachement, professions-ingredients.ts). Normalisés, sans doublon.
 */
export function tagsSerieActivite(profession: string, activite: string): string[] {
  const p = idProfession(profession);
  const a = activitePratique(pratiqueDe(p), activite);
  if (!a) return hashtagsValides([`profession-${p}`]);
  return hashtagsValides([...a.themes.slice(0, 1), ...a.hashtags, `profession-${p}`]);
}

/** Requêtes complètes d'une série : celles de l'activité (pied, chaussure, appui) puis l'ambiance, sans doublon */
export function requetesSerieActivite(profession: string, activite: string): string[] {
  const a = activitePratique(pratiqueDe(profession), activite);
  return [...new Set([...(a?.requetes ?? []), ...(serieDeLActivite(activite)?.ambiance ?? [])])];
}

/** Exclusions effectives d'une série (communes + propres), par raison */
export function exclusionsSerie(activite: string | null | undefined): Required<ExclusionsSerie> {
  const s = serieDeLActivite(activite)?.exclusions ?? {};
  const fus = (k: keyof ExclusionsSerie) => [...new Set([...EXCLUSIONS_SERIES_COMMUNES[k], ...(s[k] ?? [])])];
  return { marque: fus('marque'), texte: fus('texte'), visage: fus('visage'), enfant: fus('enfant') };
}

/** Phrase de cohérence (raison de la cible, revue de Claude) */
export const coherenceSerieTexte = (s: Pick<SerieActivite, 'coherence'>) => `${s.coherence.lumiere} · ${s.coherence.palette} · ${s.coherence.cadrage}`;

/**
 * Profils à sourcer (bouton « Sourcer les séries photos ») : les prioritaires sous le seuil, puis le rattrapage sous le seuil.
 * `photosParProfil` : photos déjà présentes dans le sujet du profil ; `enAttente` : profils dont une série attend déjà Paul.
 */
export function profilsSeriesASourcer(photosParProfil: Readonly<Record<string, number>>, enAttente: Iterable<string> = [], seuil = SEUIL_PHOTOS_SUJET): string[] {
  const attente = new Set(enAttente);
  return [...PROFILS_SERIES_PRIORITAIRES, ...PROFILS_SERIES_RATTRAPAGE].filter((p) => !attente.has(p) && (photosParProfil[p] ?? 0) < seuil);
}

/** Contrôle des séries : activité et profil connus de la profession, profil qui porte l'activité, requêtes en anglais simple */
export function controlerSeriesActivites(profession = 'podologue'): string[] {
  const e: string[] = [];
  const pr = pratiqueDe(profession);
  for (const s of SERIES_ACTIVITES) {
    if (!activitePratique(pr, s.activite)) e.push(`${s.activite} : activité inconnue.`);
    const profil = pr.profils.find((x) => x.id === s.profil);
    if (!profil) e.push(`${s.activite} : profil inconnu ${s.profil}.`);
    else if (!profil.activites.includes(s.activite)) e.push(`${s.activite} : absente du profil ${s.profil}.`);
    for (const q of [...s.ambiance, ...requetesSerieActivite(profession, s.activite)]) if (!/^[a-z][a-z -]{2,60}$/.test(q)) e.push(`${s.activite} : requête invalide « ${q} ».`);
    if (requetesSerieActivite(profession, s.activite).length < 6) e.push(`${s.activite} : moins de 6 requêtes.`);
  }
  return e;
}
