// Recherche de photos PAR PROFESSION (ajout de Paul du 2026-10-09 : « Quand on crée une profession, on crée des thèmes clés qui
// permettent ensuite de sourcer des photos (Pexels, etc.). Dans le chercheur d'images, pouvoir LOCKER la profession pour laquelle
// on cherche, et taguer les images sur la bonne profession. »). docs/architecture-professions.md, « Recherche de photos ».
//
// - Chaque profession déclare ses THÈMES DE RECHERCHE : requêtes (anglais, banques libres), requêtes d'exploration, hashtags.
//   Podologue : repris À L'IDENTIQUE des sujets visuels (photos-libres.ts : MOTS_CLES_DEFAUT, MOTS_CLES_EXPLORATION).
//   Psychomotricien : thèmes du pack (packages/contenus/professions/psychomotricien/pratique.ts, 90966aa) et requêtes de ses
//   médiations et scènes.
// - `sujet` : sujet visuel enregistré sur la photo (photos_libres.sujet, compatibilité) ; un thème hors sujets visuels est rangé
//   sous « general » et porte ses hashtags (#graphomotricite…), qui servent à la couverture.
// - Mots-clés éditables en base par (profession, thème) : clé `cleMotsCles` (podologue : le sujet seul, comme avant ; autre
//   profession : « profession/thème », table photos_libres_mots_cles_professions, migration 0049).
// - Couverture et pondération PAR PROFESSION : seules les photos de la profession comptent (choisirRequete, photos-libres.ts).
// - Décision « Garder / Accepter » : la profession verrouillée est pré-cochée ; « Aussi pour… » suggéré quand le visuel est
//   générique (cabinet, marche, enfant, senior…) ou correspond aux mots-clés de partage d'une autre profession.
// Module pur.

import { MOTS_CLES_DEFAUT, MOTS_CLES_EXPLORATION, normaliserMotsCles, SUJETS_VISUELS, choisirRequete } from './photos-libres';
import { idProfession, PROFESSION_PAR_DEFAUT, professionsAdmin } from './professions';
import { packProfession } from './packs-professions';

export type ThemeRecherche = {
  id: string;
  libelle: string;
  /** Sujet visuel enregistré sur la photo (SUJETS_VISUELS) ; « general » pour un thème propre à la profession */
  sujet: string;
  /** Hashtags posés à la décision (normalisés, hashtags.ts) ; le premier sert à la couverture du thème */
  hashtags: readonly string[];
  requetes: readonly string[];
  exploration: readonly string[];
};

const PODOLOGUE: readonly ThemeRecherche[] = SUJETS_VISUELS.map((s) => ({
  id: s.id, libelle: s.libelle, sujet: s.id, hashtags: [], requetes: MOTS_CLES_DEFAUT[s.id] ?? MOTS_CLES_DEFAUT.general, exploration: MOTS_CLES_EXPLORATION[s.id] ?? [],
}));

// Psychomotricien : thèmes du pack (pratique.ts) ; requêtes = médiations du pack + scènes (cadrages sans visage identifiable)
const PSYCHOMOTRICIEN: readonly ThemeRecherche[] = [
  { id: 'petite-enfance', libelle: 'Bébés', sujet: 'enfant', hashtags: ['petite-enfance', 'bebe'],
    requetes: ['baby tummy time', 'toddler crawling mat', 'baby first steps', 'soft play foam blocks'], exploration: ['baby hands toy', 'toddler stacking cups', 'baby sensory play'] },
  { id: 'apprentissages', libelle: 'Enfants', sujet: 'enfant', hashtags: ['motricite', 'enfant'],
    requetes: ['motor skills course', 'children motor skills obstacle course mats', 'child wooden blocks', 'child hands wooden blocks'], exploration: ['hands stacking wooden shapes', 'kids balance game', 'child throwing ball'] },
  { id: 'graphomotricite', libelle: 'Écriture', sujet: 'general', hashtags: ['graphomotricite', 'ecriture'],
    requetes: ['handwriting child hand', 'child hand pencil drawing lines', 'pencil grip paper loops'], exploration: ['crayons drawing paper', 'child tracing shapes', 'hand writing notebook'] },
  { id: 'tnd', libelle: 'TND', sujet: 'general', hashtags: ['tnd', 'motricite'],
    requetes: ['sensory toys table', 'child hands wooden blocks', 'soft play foam blocks'], exploration: ['therapy room toys', 'weighted blanket', 'calm corner cushions'] },
  { id: 'adolescents', libelle: 'Ados', sujet: 'general', hashtags: ['adolescents'],
    requetes: ['teenager hands drawing', 'teen stretching mat'], exploration: ['teen sneakers walking', 'young person breathing calm'] },
  { id: 'adultes', libelle: 'Adultes', sujet: 'general', hashtags: ['adultes'],
    requetes: ['adult body awareness exercise', 'hands resting on belly breathing'], exploration: ['person lying on mat relaxation', 'stretching mat studio'] },
  { id: 'seniors', libelle: 'Seniors', sujet: 'senior', hashtags: ['seniors', 'equilibre'],
    requetes: ['elderly balance rail', 'older adult walking hallway handrail', 'senior feet walking indoor'], exploration: ['senior balance exercise', 'elderly hands ball exercise', 'senior walking cane'] },
  { id: 'relaxation', libelle: 'Relaxation', sujet: 'general', hashtags: ['relaxation', 'tonus'],
    requetes: ['person lying on mat relaxation', 'hands resting on belly breathing'], exploration: ['soft light therapy room', 'colorful scarves movement', 'hand drum rhythm'] },
  { id: 'general', libelle: 'Général', sujet: 'general', hashtags: [],
    requetes: ['therapy room soft mats', 'wooden toys shelf', 'feet walking on a line'], exploration: ['balance beam low feet', 'colorful foam shapes'] },
];

export const THEMES_RECHERCHE: Readonly<Record<string, readonly ThemeRecherche[]>> = { podologue: PODOLOGUE, psychomotricien: PSYCHOMOTRICIEN };

/** Thèmes de recherche d'une profession (alias ramenés) ; inconnue → ceux de la profession par défaut */
export const themesRecherche = (profession: string | null | undefined): readonly ThemeRecherche[] => THEMES_RECHERCHE[idProfession(profession)] ?? THEMES_RECHERCHE[PROFESSION_PAR_DEFAUT];
export const themeRecherche = (profession: string | null | undefined, theme: string): ThemeRecherche | undefined => themesRecherche(profession).find((t) => t.id === theme);

/** Clé des mots-clés en base : podologue = le sujet (table d'origine) ; autre profession = « profession/thème » */
export const cleMotsCles = (profession: string, theme: string) => (idProfession(profession) === PROFESSION_PAR_DEFAUT ? theme : `${idProfession(profession)}/${theme}`);

/** Mots-clés effectifs d'un thème : ceux enregistrés en base pour (profession, thème), sinon ceux du pack */
export function motsClesDuTheme(profession: string, theme: string, enBase: Readonly<Record<string, readonly string[]>> = {}): string[] {
  const b = normaliserMotsCles(enBase[cleMotsCles(profession, theme)] ?? []);
  if (b.length) return b;
  const t = themeRecherche(profession, theme) ?? themeRecherche(profession, 'general') ?? themesRecherche(profession)[0];
  return [...(t?.requetes ?? [])];
}

/** Toutes les requêtes d'un thème : mots-clés (base ou pack), puis exploration, sans doublon */
export function requetesDuTheme(profession: string, theme: string, enBase: Readonly<Record<string, readonly string[]>> = {}): string[] {
  return [...new Set([...motsClesDuTheme(profession, theme, enBase), ...(themeRecherche(profession, theme)?.exploration ?? [])])];
}

/** Photo gardée ou importée, vue pour la couverture : requête d'origine, statut, professions effectives, hashtags */
export type PhotoCouverture = { requete?: string | null; statut?: string | null; professions: readonly string[]; hashtags?: readonly string[] };

const pourProfession = (p: PhotoCouverture, profession: string) => p.professions.includes('commun') || p.professions.includes(idProfession(profession));

/** Couverture PAR PROFESSION des requêtes : photos de la profession (hors retirées) par requête */
export function couvertureRequetes(photos: readonly PhotoCouverture[], profession: string): Record<string, number> {
  const c: Record<string, number> = {};
  for (const p of photos) if (p.requete && p.statut !== 'retiree' && pourProfession(p, profession)) c[p.requete] = (c[p.requete] ?? 0) + 1;
  return c;
}

/** Requête suivante d'un thème pour une profession : pondérée par la couverture de CETTE profession (choisirRequete) */
export function choisirRequeteProfession(o: {
  profession: string; theme: string; enBase?: Readonly<Record<string, readonly string[]>>; photos?: readonly PhotoCouverture[]; r?: number; rejets?: Readonly<Record<string, number>>;
}): string {
  return choisirRequete(requetesDuTheme(o.profession, o.theme, o.enBase), couvertureRequetes(o.photos ?? [], o.profession), o.r ?? Math.random(), o.rejets ?? {});
}

// ---------------------------------------------------------------------------------------------------------------
// Verrou et décision
// ---------------------------------------------------------------------------------------------------------------

/** Profession du chercheur : verrouillée si le verrou est posé sur une profession connue de l'admin, sinon celle de l'en-tête */
export function professionDuChercheur(o: { globale: string; verrou?: string | null }): string {
  const ok = (id: string | null | undefined) => Boolean(id) && professionsAdmin().some((p) => p.id === idProfession(id));
  return ok(o.verrou) ? idProfession(o.verrou) : ok(o.globale) ? idProfession(o.globale) : PROFESSION_PAR_DEFAUT;
}

/** Mots qui rendent un visuel GÉNÉRIQUE (utile à plusieurs professions) : cabinet, marche, enfant, senior… (anglais et français) */
export const MOTS_GENERIQUES: readonly string[] = [
  'clinic', 'office', 'waiting', 'room', 'cabinet', 'walking', 'walk', 'marche', 'child', 'children', 'kid', 'kids', 'enfant', 'toddler', 'baby', 'bebe',
  'senior', 'elderly', 'older', 'balance', 'equilibre', 'hands', 'stairs', 'family',
];

const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Professions pré-cochées et suggestions « Aussi pour… » à la décision. `cochees` = la profession verrouillée ; `suggerees` =
 * autres professions de l'admin quand le texte (requête, description de la source, hashtags) contient un mot générique ou un
 * mot-clé de partage de leur pack. Rien n'est coché d'office pour une autre profession : Paul choisit.
 */
export function professionsALaDecision(o: { verrou: string; texte: string; hashtags?: readonly string[] }): { cochees: string[]; suggerees: { profession: string; raisons: string[] }[] } {
  const verrou = idProfession(o.verrou);
  const mots = new Set([...plat(o.texte).split(/[^a-z0-9]+/).filter(Boolean), ...(o.hashtags ?? []).map(plat)]);
  const generiques = MOTS_GENERIQUES.filter((m) => mots.has(m));
  const suggerees = professionsAdmin().filter((p) => p.id !== verrou).map((p) => {
    const partage = packProfession(p.id).motsClesPartage.map(plat).filter((m) => mots.has(m));
    const raisons = [...new Set([...generiques, ...partage])];
    return { profession: p.id, raisons };
  }).filter((x) => x.raisons.length);
  return { cochees: [verrou], suggerees };
}

/**
 * Lignes de rattachement (assets_professions) d'un visuel gardé : chaque profession cochée hors défaut → ajout ; la profession par
 * défaut non cochée → retrait (un visuel trouvé pour la psychomotricité n'entre pas d'office au frigo des podologues).
 */
export function lignesProfessionsDecision(cle: string, professions: readonly string[]): { cle_asset: string; profession: string; action: 'ajout' | 'retrait' }[] {
  const ps = [...new Set(professions.map(idProfession))].filter((p) => professionsAdmin().some((x) => x.id === p));
  if (!ps.length) return [];
  const l: { cle_asset: string; profession: string; action: 'ajout' | 'retrait' }[] = ps.filter((p) => p !== PROFESSION_PAR_DEFAUT).map((p) => ({ cle_asset: cle, profession: p, action: 'ajout' }));
  if (!ps.includes(PROFESSION_PAR_DEFAUT)) l.push({ cle_asset: cle, profession: PROFESSION_PAR_DEFAUT, action: 'retrait' });
  return l;
}

/** Thèmes cochés à la décision → sujets visuels enregistrés (compatibilité) et hashtags du thème */
export function sujetsEtHashtagsDesThemes(profession: string, themes: readonly string[]): { sujets: string[]; hashtags: string[] } {
  const ts = themes.map((t) => themeRecherche(profession, t)).filter((t): t is ThemeRecherche => Boolean(t));
  return { sujets: [...new Set(ts.map((t) => t.sujet))], hashtags: [...new Set(ts.flatMap((t) => t.hashtags))] };
}

// ---------------------------------------------------------------------------------------------------------------
// Couverture et trous par profession
// ---------------------------------------------------------------------------------------------------------------

export type TrouProfession = { theme: string; libelle: string; hashtag: string; photos: number; requete: string };

/**
 * Couverture des thèmes d'une profession : photos de la profession portant le hashtag principal du thème (ou, sans hashtag, son
 * sujet visuel), les moins couverts d'abord. Alimente les liens « Trouver des photos » (« Psychomot : 0 photo #graphomotricite »).
 */
export function trousParProfession(profession: string, photos: readonly (PhotoCouverture & { sujets?: readonly string[] })[]): TrouProfession[] {
  return themesRecherche(profession).filter((t) => t.id !== 'general').map((t) => {
    const hashtag = t.hashtags[0] ?? '';
    const n = photos.filter((p) => p.statut !== 'retiree' && pourProfession(p, profession) && (hashtag ? (p.hashtags ?? []).includes(hashtag) : (p.sujets ?? []).includes(t.sujet))).length;
    return { theme: t.id, libelle: t.libelle, hashtag, photos: n, requete: t.requetes[0] ?? '' };
  }).sort((a, b) => a.photos - b.photos);
}

/** Phrase d'un trou : « Psychomotricité : 0 photo #graphomotricite » */
export const libelleTrou = (court: string, t: TrouProfession) => `${court} : ${t.photos} photo${t.photos > 1 ? 's' : ''} ${t.hashtag ? `#${t.hashtag}` : t.libelle}`;
