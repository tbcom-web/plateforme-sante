// IMAGES EN SITUATION, STRUCTURE FIGÉE (décision de Paul du 2026-10-10 : « pour la finalisation des modèles […] je ne laisserais plus
// toucher à la structure mais juste choisir les photos en passant sur l'image du site et laisser à l'admin la possibilité de remplacer
// avec la roulette la photo qui va bien. Idem pour l'illustration du haut. Car là même après l'audit on peut tout relancer et ça casse
// tout »).
//
// 1. STRUCTURE FIGÉE dès « finaliste » : mise en page, gabarit, sections, polices, palette, premiers écrans, animations, liants… ne
//    changent plus. Une nouvelle version ne peut différer de la précédente que par ses EMPLACEMENTS D'IMAGES (photos, sujet de
//    l'illustration du haut), sauf la retouche de Claude issue des tickets (journal « correction » / « technique »).
// 2. CHOIX D'IMAGES : le modèle est un DESIGN sans images (chaine-design.ts) ; les images viennent du kit du profil de démonstration.
//    Le choix fait dans l'aperçu est une PRÉFÉRENCE DE RENDU « design × profil de démonstration × emplacement » (table
//    modeles_images_choix, migration 0063), jamais une version : le design reste réutilisable par tous les profils, le test et la
//    relecture restent valables. Chaque choix est aussi un signal positif pour l'image (ordre des candidates : choisies d'abord).
// Pur.

import type { StatutModele } from './chaine-modeles';
import type { KitProfil } from './profils';

export type TransitionsLike = readonly { de: string; vers: string }[];

/** Statuts où la structure est figée (finaliste et après ; « écarté » et « candidat » restent libres) */
export const STATUTS_STRUCTURE_FIGEE: readonly StatutModele[] = ['finaliste', 'check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation', 'pret-validation', 'publie'];
export const structureFigee = (s: string | null | undefined): boolean => (STATUTS_STRUCTURE_FIGEE as readonly string[]).includes(s ?? '');

/** JSON à clés triées (comparaison indépendante de l'ordre des clés) */
function canonique(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonique).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonique((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

/** Structure d'une composition : tout sauf les emplacements d'images (photos, sujet de l'illustration du haut) */
export function structureDe(c: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const o = JSON.parse(JSON.stringify(c ?? {})) as Record<string, unknown>;
  delete o.photos;
  if (o.visuels && typeof o.visuels === 'object') { const v = { ...(o.visuels as Record<string, unknown>) }; delete v.herosSujet; o.visuels = v; }
  return o;
}
export const memeStructure = (a: Record<string, unknown> | null | undefined, b: Record<string, unknown> | null | undefined) => canonique(structureDe(a)) === canonique(structureDe(b));

/** Origine d'une nouvelle version : relance humaine (🎲), retouche de Claude ou du testeur (tickets), création */
export type OrigineVersion = 'relance' | 'retouche' | 'creation';

/**
 * Une nouvelle version est-elle permise ? Structure figée (finaliste et après) : seule la RETOUCHE (tickets corrigés par Claude ou le
 * testeur) peut changer la structure ; une relance qui ne change que les images reste permise (sans objet aujourd'hui : les images
 * ne sont plus enregistrées dans les versions d'un design).
 */
export function verifierNouvelleVersion(p: { statut: string; base: Record<string, unknown> | null | undefined; nouvelle: Record<string, unknown>; origine: OrigineVersion }): { ok: true } | { ok: false; raison: string } {
  if (!structureFigee(p.statut) || p.origine === 'retouche' || p.origine === 'creation' || !p.base) return { ok: true };
  if (memeStructure(p.base, p.nouvelle)) return { ok: true };
  return { ok: false, raison: 'Structure figée depuis la sélection des finalistes : seules les images se choisissent (dans l’aperçu), la structure change seulement par la retouche de Claude (tickets).' };
}

/** Aucune transition ne ramène un modèle figé vers un statut où la structure se relance (candidat, présélection) */
export function transitionsRespectentStructure(transitions: TransitionsLike): boolean {
  return transitions.every((t) => !structureFigee(t.de) || structureFigee(t.vers));
}

// ---------------------------------------------------------------------------------------------------------------
// Emplacements et candidates
// ---------------------------------------------------------------------------------------------------------------

/** Emplacement d'image d'une page : illustration du haut (sujet du héros) ou photo n° i de la composition (0 = premier écran) */
export type EmplacementImage = 'heros' | `photo:${number}`;
export const estEmplacementImage = (x: unknown): x is EmplacementImage => typeof x === 'string' && /^(heros|photo:[0-9])$/.test(x);
export const libelleEmplacement = (e: EmplacementImage) => (e === 'heros' ? 'Illustration du haut' : e === 'photo:0' ? 'Photo du premier écran' : `Photo ${Number(e.slice(6)) + 1}`);

/** Une candidate : URL (photo) ou sujet (illustration du haut) */
export type CandidateImage = { image: string; note: number | null; valide: boolean; libelle?: string; choisie?: number };

/** Note sous laquelle une image n'est jamais proposée (refusée, 1 ★) */
export const NOTE_REFUS = 2;
const refusee = (note: number | null) => note !== null && note < NOTE_REFUS;
/** Rang : validées 4-5 ★ → validées → à valider ; puis déjà choisies ailleurs, puis note */
const rang = (c: CandidateImage) => (c.valide ? ((c.note ?? 0) >= 4 ? 0 : 1) : 2);
export function trierCandidates(l: CandidateImage[]): CandidateImage[] {
  return [...l].sort((a, b) => rang(a) - rang(b) || (b.choisie ?? 0) - (a.choisie ?? 0) || (b.note ?? 0) - (a.note ?? 0) || (a.image < b.image ? -1 : 1));
}

/**
 * Photos candidates d'un profil (kit du profil, profils.ts) : photos de SON activité, puis photos neutres du thème (aucune activité
 * identifiable : jamais une autre activité) ; jamais une photo refusée (1 ★) ; validées 4-5 ★ d'abord, puis à valider.
 * `choisies` : nombre de fois où chaque image a été choisie dans la chaîne (signal positif).
 */
export function candidatesPhotos(kit: KitProfil, activite: string | null, o: { choisies?: Readonly<Record<string, number>>; max?: number } = {}): CandidateImage[] {
  const k = kit.activites.find((x) => x.activite === (activite ?? kit.activites[0]?.activite));
  const vues = new Set<string>();
  const l: CandidateImage[] = [];
  for (const e of [...(k?.familles.photo ?? []), ...kit.generique.photo]) {
    if (!e.url || vues.has(e.url) || refusee(e.note)) continue;
    vues.add(e.url);
    l.push({ image: e.url, note: e.note, valide: !e.aValider, ...(o.choisies?.[e.url] ? { choisie: o.choisies[e.url] } : {}) });
  }
  return trierCandidates(l).slice(0, o.max ?? 40);
}

/**
 * Repli quand le kit du profil n'a encore aucune photo : les candidates sont celles où le rendu puise déjà (rendu-profil.ts,
 * contexteDuProfil : photos autorisées du profil, sinon photos de ses sujets) — jamais une photo que l'aperçu ne montrerait pas.
 */
export function candidatesDuContexte(photos: readonly { url: string; sujets?: readonly string[]; importee?: boolean }[], profil: { sujets: readonly string[]; photos: readonly string[] | null }, max = 40): CandidateImage[] {
  const ok = profil.photos ? new Set(profil.photos) : null;
  const vues = new Set<string>();
  const l: CandidateImage[] = [];
  for (const x of photos) {
    if (vues.has(x.url) || !(ok ? ok.has(x.url) : (x.sujets ?? []).some((s) => profil.sujets.includes(s)))) continue;
    vues.add(x.url);
    l.push({ image: x.url, note: null, valide: x.importee !== false });
  }
  return trierCandidates(l).slice(0, max);
}

/**
 * Illustrations du haut candidates : les sujets PRINCIPAUX du profil qui ont une illustration (le site ne dessine le héros que d'un
 * sujet principal, dans le registre du design) ; jamais un sujet hors du profil. `notes` : note du héros (clé heros:<sujet>:<registre>).
 */
export function candidatesHeros(principaux: readonly string[], o: { illustre: (s: string) => boolean; libelle?: (s: string) => string; notes?: Readonly<Record<string, number | null>> }): CandidateImage[] {
  return principaux.filter((s, i) => o.illustre(s) && principaux.indexOf(s) === i && !refusee(o.notes?.[s] ?? null))
    .map((s) => ({ image: s, note: o.notes?.[s] ?? null, valide: true, ...(o.libelle ? { libelle: o.libelle(s) } : {}) }));
}

/** Ligne du journal des choix (modeles_images_choix) */
export type ChoixImage = { modele: string; profil: string; emplacement: EmplacementImage; image: string; le: string };

/** Choix en vigueur pour un design × profil : le plus récent de chaque emplacement */
export function choixEnVigueur(lignes: readonly ChoixImage[], modele: string, profil: string): Partial<Record<EmplacementImage, string>> {
  const r: Partial<Record<EmplacementImage, string>> = {};
  const dates: Partial<Record<EmplacementImage, string>> = {};
  for (const l of lignes) {
    if (l.modele !== modele || l.profil !== profil) continue;
    if (!dates[l.emplacement] || l.le > dates[l.emplacement]!) { dates[l.emplacement] = l.le; r[l.emplacement] = l.image; }
  }
  return r;
}

/** Nombre de choix de chaque image (toute la chaîne) : signal positif, ordre des candidates */
export function comptesChoix(lignes: readonly Pick<ChoixImage, 'image'>[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const l of lignes) r[l.image] = (r[l.image] ?? 0) + 1;
  return r;
}

/**
 * Composition rendue avec les choix (préférences de rendu) : photo n° i remplacée, sujet du héros remplacé — seulement par une
 * CANDIDATE de l'emplacement (une préférence devenue invalide, image refusée depuis, est ignorée). Ne touche jamais la structure.
 */
export function appliquerChoixImages<C extends Record<string, unknown>>(composition: C, choix: Partial<Record<EmplacementImage, string>>, candidates: { photos: readonly CandidateImage[]; heros: readonly CandidateImage[] }): C {
  const photos = Array.isArray(composition.photos) ? [...(composition.photos as string[])] : [];
  const okPhoto = new Set(candidates.photos.map((c) => c.image)), okHeros = new Set(candidates.heros.map((c) => c.image));
  for (const [e, image] of Object.entries(choix) as [EmplacementImage, string][]) {
    if (e === 'heros' || !image || !okPhoto.has(image)) continue;
    const i = Number(e.slice(6));
    if (i < photos.length) { const j = photos.indexOf(image); if (j >= 0 && j !== i) photos[j] = photos[i]; photos[i] = image; }
  }
  const visuels = (composition.visuels ?? {}) as Record<string, unknown>;
  const heros = choix.heros && okHeros.has(choix.heros) ? choix.heros : visuels.herosSujet;
  return { ...composition, photos, visuels: { ...visuels, herosSujet: heros ?? null } };
}

/** Emplacements d'une composition rendue (photos présentes, illustration du haut hors style « photos ») */
export function emplacementsDe(c: Record<string, unknown>): EmplacementImage[] {
  const photos = Array.isArray(c.photos) ? (c.photos as unknown[]).length : 0;
  const style = ((c.visuels ?? {}) as Record<string, unknown>).style;
  return [...(style !== 'photos' ? ['heros' as const] : []), ...Array.from({ length: Math.min(photos, 10) }, (_, i) => `photo:${i}` as const)];
}

/** Image actuellement à un emplacement d'une composition rendue */
export function imageA(c: Record<string, unknown>, e: EmplacementImage): string | null {
  if (e === 'heros') return (((c.visuels ?? {}) as Record<string, unknown>).herosSujet as string | null) ?? null;
  const photos = Array.isArray(c.photos) ? (c.photos as string[]) : [];
  return photos[Number(e.slice(6))] ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// Contraste du texte posé sur une photo (contrôle léger après un choix d'image)
// ---------------------------------------------------------------------------------------------------------------

const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
/** Luminance relative WCAG d'une couleur RVB 0-255 */
export const luminance = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** Rapport de contraste WCAG entre deux luminances */
export const rapportContraste = (l1: number, l2: number) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
/** Contrôle léger : texte sur photo lisible (≥ 3:1 pour un grand titre, 4,5:1 sinon) */
export function controleContraste(texte: [number, number, number], fondMoyen: [number, number, number], grand = true): { ratio: number; ok: boolean } {
  const ratio = Math.round(rapportContraste(luminance(...texte), luminance(...fondMoyen)) * 10) / 10;
  return { ratio, ok: ratio >= (grand ? 3 : 4.5) };
}
