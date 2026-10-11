// ATELIER DES MANQUES (demande validée par Paul le 2026-10-11 : « un générateur qui part de ce qui manque — icônes, images,
// illustrations, animations… — et fait les prompts à générer sur ChatGPT / Gemini (images) ou Claude (SVG), pour ensuite les
// réinsérer facilement et faciliter l'insertion dans les modèles. Nourri par les manques du composeur »).
// Module PUR, déterministe : aucune lecture, aucun appel à un service d'IA (Paul génère lui-même).
//
// 1. MANQUES (calculerManques) par profession → profil de référence → (thème, activité) → EMPLACEMENT : photo du premier écran,
//    illustration (sections, héros dessiné), icônes (soins), animation d'en-tête ; plus les dimensions où le COMPOSEUR a dû se
//    replier (manques remontés par composer(), instantanés de chaque profil : fonds, premiers écrans, palettes…).
//    Un emplacement est un manque quand il n'a RIEN de bon (aucun élément validé noté 4-5 ★), QUE des notes moyennes, ou TROP PEU
//    d'options (< SEUIL_OPTIONS bonnes). Les éléments « à valider » (et les images déposées pour ce manque) le mettent « à valider »
//    (en cours) : il recule dans la liste, Paul les juge dans 🎯 À valider.
//    Jamais de manque pour un sujet à faible preuve (posturologie, réflexologie : sujets-faible-preuve) ni d'animation pour un sujet
//    calme (diabète, seniors, pédicurie : ton « calme » du composeur, jamais d'animation).
//    PRIORITÉ = impact : gravité (rien < moyennes < peu), profils bloqués (pondérés par leur fréquence : ordre des profils de
//    référence de la pratique, ou fréquences données par l'appelant), profils où le composeur l'a remonté, modèles concernés,
//    emplacement (le premier écran d'abord).
// 2. PROMPTS (promptsDuManque) adaptés à l'outil :
//    - photo (et illustration « raster ») → ChatGPT et Gemini, en ANGLAIS (rappel en français) : construirePrompt de prompts-images.ts
//      (scène, palette de la gamme la mieux notée, lumière, cadrage et ratio exact de l'emplacement, contraintes négatives toujours
//      présentes), précision de l'activité, contraintes du sujet (enfant : jamais identifiable ; diabète : doux, jamais rouge ; sport :
//      volumes sains), images 4-5 ★ du même type à joindre comme référence de style. Recontrôlé (controlerPrompt + controlerPromptManque).
//    - icône, illustration SVG, animation, élément de design → DEMANDE À CLAUDE (session Code) : emplacement, grammaire visuelle
//      existante (dessins.ts, registres relevé / pédagogique, entete-pied, univers-minimal), géométries validées à réutiliser,
//      éléments 4-5 ★ à imiter, livrable (module + clés d'inventaire « à valider »), à envoyer par « Envoyer à Claude ».
// 3. IMPORT : une image déposée sur un manque porte son TROU (`<sujet>|manque:<activité|theme>:<emplacement>`, colonne ia_trou de
//    0040, même contrainte), le sujet du thème, le hashtag de l'activité (elle arrive dans le bon sujet de 🎯 À valider), l'outil, le
//    prompt et les conditions déclarées. Une fois OK dans À valider, elle entre dans le kit du profil : le manque se ferme seul.

import { activitePratique, pratiqueDe, themePratique, PRATIQUES, type PratiqueProfession } from './pratiques';
import type { ElementProfil, KitProfil, ProfilPratique } from './profils';
import { FAMILLES_KIT, type FamilleKit } from './kits-visuels';
import { construirePrompt, controlerPrompt, formatImage, motifsRefus, sceneDe, sujetExclu, CONTRAINTES_NEGATIVES, HASHTAG_IMAGE_GENEREE, type PromptConstruit } from './prompts-images';
import { GAMMES, gamme as gammeParId, type Gamme } from './gammes';
import { rvb } from './couleurs';
import type { NotesElements } from './qualite';

// ---------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------

export type EmplacementManque = 'photo-accueil' | 'illustration' | 'icone' | 'animation' | 'element';
export type OutilManque = 'chatgpt' | 'gemini' | 'claude';
export type RaisonManque = 'aucun' | 'moyens' | 'peu' | 'composeur';
export type EtatManque = 'a-combler' | 'a-valider';

export const LIBELLES_EMPLACEMENTS_MANQUES: Record<EmplacementManque, string> = {
  'photo-accueil': 'Photo du premier écran',
  illustration: 'Illustration (sections, héros dessiné)',
  icone: 'Icônes (soins, repères)',
  animation: 'Animation d’en-tête',
  element: 'Élément de design',
};
export const LIBELLES_RAISONS_MANQUES: Record<RaisonManque, string> = {
  aucun: 'Rien de validé',
  moyens: 'Que des notes moyennes',
  peu: 'Trop peu de choix',
  composeur: 'Le composeur s’est replié',
};
const EMPLACEMENT_DE_FAMILLE: Record<FamilleKit, EmplacementManque> = { photo: 'photo-accueil', illustration: 'illustration', icone: 'icone', animation: 'animation' };

/** Bonnes options attendues par emplacement (en dessous : « trop peu de choix ») */
export const SEUIL_OPTIONS = 3;
/** Note à partir de laquelle un élément validé est « bon » (4-5 ★) */
export const NOTE_BONNE = 4;
/** Ton calme (diabète, seniors, pédicurie) : jamais d'animation (même table que le composeur, TONS_SUJETS) */
export const SUJETS_CALMES: readonly string[] = ['diabete', 'senior', 'pedicurie'];

/** Manque remonté par le composeur (composeur.ts, ManqueComposeur ; repris ici sans dépendre de tout le composeur) */
export type ManqueDuComposeur = { id: string; type: 'element' | 'image'; dimension: string; sujet: string | null; texte: string; exemple: string | null; frequence: number };

export type ExistantManque = { cle: string; url: string | null; note: number | null; aValider: boolean };

export type Manque = {
  /** Clé stable : `<sujet>|<activité|theme>|<emplacement>` ou `element|<dimension>` */
  id: string;
  /** Trou enregistré avec une image déposée (ia_trou, migration 0040) */
  trou: string;
  sujet: string;
  activite: string | null;
  emplacement: EmplacementManque;
  /** Dimension du composeur (éléments de design) */
  dimension: string | null;
  libelle: string;
  raison: RaisonManque;
  texte: string;
  /** Profils de référence bloqués (identifiants), dans l'ordre de la pratique */
  profils: string[];
  nomsProfils: string[];
  /** Ce qui existe déjà (meilleurs d'abord, 4 au plus) */
  existants: ExistantManque[];
  bons: number;
  moyens: number;
  enAttente: number;
  /** Profils où le composeur l'a remonté, modèles concernés (fréquence des replis) */
  composeur: number;
  modeles: number;
  /** Images déposées pour ce manque (en attente dans À valider, acceptées) */
  imports: { enAttente: number; acceptes: number };
  etat: EtatManque;
  priorite: number;
  outils: OutilManque[];
  /** Hashtags pré-cochés au dépôt : activité, emplacement, image-generee, manque */
  hashtags: string[];
};

export type EntreeManques = {
  profession?: string | null;
  registre?: readonly PratiqueProfession[];
  /** Kit de chaque profil de référence (kitDuProfil SANS le mode praticien : les éléments « à valider » y sont, signalés) */
  kits: readonly { profil: ProfilPratique; kit: KitProfil }[];
  /** Manques du composeur par profil (instantanés) : `profil` = identifiant du profil de référence ou clé libre */
  composeur?: readonly { profil: string; sujets?: readonly string[]; activites?: readonly string[]; manques: readonly ManqueDuComposeur[] }[];
  /** Images générées déposées sur un manque (photos_libres.ia_trou, statut) */
  imports?: readonly { trou: string | null; statut: string }[];
  /** Fréquence relative des profils (clients, demandes) ; défaut : ordre des profils de référence de la pratique */
  frequences?: Readonly<Record<string, number>>;
  seuil?: number;
};

export type ResultatManques = {
  manques: Manque[];
  progression: {
    /** Emplacements attendus (profil × activité × famille) et emplacements prêts (sans manque) */
    emplacements: number; prets: number; part: number;
    /** Manques en cours (à valider dans À valider) */
    enCours: number;
    /** Manques fermés grâce à une image déposée ici (import accepté, emplacement désormais prêt) */
    combles: number;
  };
  /** Profils (ordre de la pratique) et leur nombre de manques */
  parProfil: { id: string; nom: string; manques: number }[];
};

// ---------------------------------------------------------------------------------------------------------------
// Trous (ia_trou)
// ---------------------------------------------------------------------------------------------------------------

const TROU = /^([a-z-]{2,30})\|manque:([a-z0-9-]{2,30}):([a-z0-9:-]{2,60})$/;
/** Trou d'une image déposée sur un manque (même contrainte que photos_libres.ia_trou : `^[a-z-]{2,30}\|[a-z0-9:-]{2,90}$`) */
export function trouDuManque(m: Pick<Manque, 'sujet' | 'activite' | 'emplacement' | 'dimension'>): string {
  const sujet = /^[a-z-]{2,30}$/.test(m.sujet) ? m.sujet : 'general';
  const empl = m.emplacement === 'element' ? `element-${String(m.dimension ?? 'design').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'design'}` : m.emplacement;
  const act = m.activite && /^[a-z0-9-]{2,30}$/.test(m.activite) ? m.activite : 'theme';
  return `${sujet}|${`manque:${act}:${empl}`.slice(0, 90)}`;
}
/** Identifiant du manque d'un trou déposé (null : trou d'une autre origine) */
export function manqueDuTrou(trou: string | null | undefined): string | null {
  const r = TROU.exec(String(trou ?? ''));
  if (!r) return null;
  const [, sujet, act, empl] = r;
  if (empl.startsWith('element-')) return `element|${empl.slice(8)}`;
  return `${sujet}|${act}|${empl}`;
}
const idElement = (dim: string) => `element|${dim.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'design'}`;

/** Statut d'une image déposée : en attente (À valider), acceptée, refusée */
export const etatImport = (statut: string): 'attente' | 'accepte' | 'refuse' => (statut === 'a_valider' ? 'attente' : statut === 'retiree' || statut === 'refusee' ? 'refuse' : 'accepte');

// ---------------------------------------------------------------------------------------------------------------
// Calcul des manques
// ---------------------------------------------------------------------------------------------------------------

const GRAVITE: Record<RaisonManque, number> = { aucun: 3, moyens: 2, composeur: 2, peu: 1 };
const BONUS_EMPLACEMENT: Record<EmplacementManque, number> = { 'photo-accueil': 4, illustration: 3, icone: 2, animation: 1, element: 1 };
export const POIDS_PRIORITE = { gravite: 10, profils: 6, composeur: 2, modeles: 0.5, enCours: 25 } as const;

const estBon = (e: ElementProfil) => !e.aValider && (e.note ?? NOTE_BONNE) >= NOTE_BONNE;
const estMoyen = (e: ElementProfil) => !e.aValider && e.note !== null && e.note < NOTE_BONNE && e.note > 2.5;
const triExistants = (l: readonly ElementProfil[]) => [...l].sort((a, b) => Number(a.aValider) - Number(b.aValider) || (b.note ?? 0) - (a.note ?? 0) || (a.cle < b.cle ? -1 : 1));

/** Sujet exclu des manques : faible preuve (posturologie, réflexologie) */
export const sujetSansManque = (sujet: string, extra = '') => sujetExclu(sujet, extra);

/** Animation attendue pour ce sujet ? (jamais pour un sujet calme) */
export const animationAttendue = (sujet: string) => !SUJETS_CALMES.includes(sujet);

/** Emplacement d'une dimension du composeur (éléments de design) */
export function emplacementDeDimension(dim: string): { emplacement: EmplacementManque; sujet: string | null } {
  if (dim === 'composant:entete-anim' || dim === 'animation') return { emplacement: 'animation', sujet: null };
  if (dim.startsWith('illustration:')) return { emplacement: 'illustration', sujet: null };
  if (dim === 'picto') return { emplacement: 'icone', sujet: null };
  if (dim.startsWith('photo:')) return { emplacement: 'photo-accueil', sujet: dim.slice(6) || null };
  return { emplacement: 'element', sujet: null };
}

/** Outils d'un emplacement : photo → ChatGPT, Gemini ; illustration → Claude (SVG) puis ChatGPT, Gemini (raster) ; le reste → Claude */
export function outilsDeLEmplacement(e: EmplacementManque): OutilManque[] {
  if (e === 'photo-accueil') return ['chatgpt', 'gemini'];
  if (e === 'illustration') return ['claude', 'chatgpt', 'gemini'];
  return ['claude'];
}

/** Hashtags d'une image déposée sur un manque (activité d'abord : elle rejoint le bon sujet de À valider) */
export function hashtagsDuManque(m: Pick<Manque, 'activite' | 'emplacement'>, p: PratiqueProfession): string[] {
  const a = activitePratique(p, m.activite);
  const empl = m.emplacement === 'photo-accueil' ? 'accueil' : m.emplacement;
  return [...new Set([...(a ? a.hashtags.slice(0, 1) : []), empl, HASHTAG_IMAGE_GENEREE, 'manque'])];
}

/**
 * Manques de la profession, du plus urgent au moins urgent (voir l'en-tête). Une même place (thème × activité × emplacement)
 * partagée par plusieurs profils n'est qu'un manque, qui liste les profils bloqués.
 */
export function calculerManques(e: EntreeManques): ResultatManques {
  const registre = e.registre ?? PRATIQUES;
  const p = pratiqueDe(e.profession ?? e.kits[0]?.profil.profession ?? null, registre);
  const seuil = e.seuil ?? SEUIL_OPTIONS;
  const ordre = p.profils.map((x) => x.id);
  const frequence = (id: string) => {
    if (e.frequences && typeof e.frequences[id] === 'number') return Math.max(0, e.frequences[id]);
    const i = ordre.indexOf(id);
    return i < 0 ? 0.5 : 1 + (ordre.length - i) / Math.max(1, ordre.length);
  };
  const nomProfil = (id: string) => e.kits.find((k) => k.profil.id === id)?.profil.court ?? p.profils.find((x) => x.id === id)?.court ?? id;
  const parId = new Map<string, Manque>();
  const places = new Set<string>();
  const prets = new Set<string>();

  const libelleCible = (sujet: string, activite: string | null) => {
    const t = themePratique(p, sujet)?.court ?? (sujet === 'commun' ? 'Commun à tous' : sujet);
    const a = activitePratique(p, activite);
    return a ? `${t} · ${a.court}` : t;
  };
  const creer = (o: { id: string; sujet: string; activite: string | null; emplacement: EmplacementManque; dimension: string | null; raison: RaisonManque; texte: string; existants?: ElementProfil[] }): Manque => {
    const base = { sujet: o.sujet, activite: o.activite, emplacement: o.emplacement, dimension: o.dimension };
    const l = triExistants(o.existants ?? []);
    return {
      id: o.id, trou: trouDuManque(base), ...base, libelle: `${libelleCible(o.sujet, o.activite)} — ${o.emplacement === 'element' && o.dimension ? libelleDimension(o.dimension) : LIBELLES_EMPLACEMENTS_MANQUES[o.emplacement]}`,
      raison: o.raison, texte: o.texte, profils: [], nomsProfils: [],
      existants: l.slice(0, 4).map((x) => ({ cle: x.cle, url: x.url ?? null, note: x.note, aValider: x.aValider })),
      bons: l.filter(estBon).length, moyens: l.filter(estMoyen).length, enAttente: l.filter((x) => x.aValider).length,
      composeur: 0, modeles: 0, imports: { enAttente: 0, acceptes: 0 }, etat: 'a-combler', priorite: 0, outils: outilsDeLEmplacement(o.emplacement), hashtags: hashtagsDuManque(base, p),
    };
  };
  const ajouterProfil = (m: Manque, id: string) => { if (!m.profils.includes(id)) m.profils.push(id); };

  // 1. Kits des profils de référence
  for (const { profil, kit } of e.kits) {
    const sujet = kit.sujet;
    if (!profil.principal || sujetSansManque(sujet) || sujetSansManque(profil.principal) || !themePratique(p, profil.principal)?.actif) continue;
    const cibles = kit.activites.length
      ? kit.activites.map((a) => ({ activite: a.activite as string | null, familles: a.familles }))
      : [{ activite: null as string | null, familles: kit.generique }];
    for (const c of cibles) {
      if (sujetSansManque(sujet, c.activite ?? '')) continue;
      for (const f of FAMILLES_KIT) {
        if (f === 'animation' && !animationAttendue(sujet)) continue;
        const emplacement = EMPLACEMENT_DE_FAMILLE[f];
        const id = `${sujet}|${c.activite ?? 'theme'}|${emplacement}`;
        places.add(id);
        const l = c.familles[f];
        const bons = l.filter(estBon).length, moyens = l.filter(estMoyen).length, attente = l.filter((x) => x.aValider).length;
        if (bons >= seuil) { prets.add(id); continue; }
        const raison: RaisonManque = bons > 0 ? 'peu' : moyens > 0 ? 'moyens' : 'aucun';
        const un = LIBELLES_EMPLACEMENTS_MANQUES[emplacement].toLowerCase();
        const texte = raison === 'aucun'
          ? `Aucun élément validé noté 4-5 ★ pour : ${un}${attente ? ` (${attente} à valider)` : ''}.`
          : raison === 'moyens'
            ? `Seulement des notes moyennes (${moyens} élément${moyens > 1 ? 's' : ''} sous 4 ★) pour : ${un}${attente ? ` ; ${attente} à valider` : ''}.`
            : `${bons} seul${bons > 1 ? 's' : ''} choix 4-5 ★ sur ${seuil} attendus pour : ${un}${attente ? ` ; ${attente} à valider` : ''}.`;
        const m = parId.get(id) ?? creer({ id, sujet, activite: c.activite, emplacement, dimension: null, raison, texte, existants: l });
        ajouterProfil(m, profil.id);
        parId.set(id, m);
      }
    }
  }

  // 2. Manques remontés par le composeur (instantanés de chaque profil)
  for (const r of e.composeur ?? []) {
    const activites = r.activites ?? p.profils.find((x) => x.id === r.profil)?.activites ?? [];
    const ref = p.profils.find((x) => x.id === r.profil);
    const profilsTouches = ref ? [ref.id] : p.profils.filter((x) => x.principal && (r.sujets ?? []).includes(x.principal) && (!x.activites.length || x.activites.some((a) => activites.includes(a)))).map((x) => x.id);
    const vus = new Set<string>();
    for (const mc of r.manques) {
      if (motifsRefus(mc.texte).some((x) => /postur/i.test(x)) || sujetSansManque(mc.sujet ?? '', mc.dimension)) continue;
      let id: string, m: Manque | undefined;
      if (mc.type === 'image') {
        const theme = mc.sujet ?? 'general';
        const sujet = themePratique(p, theme)?.sujetVisuel ?? theme;
        const activite = activites.find((a) => activitePratique(p, a)?.themes.includes(theme)) ?? null;
        const emplacement: EmplacementManque = mc.dimension === 'illustration' ? 'illustration' : mc.dimension === 'icone' ? 'icone' : 'photo-accueil';
        id = `${sujet}|${activite ?? 'theme'}|${emplacement}`;
        m = parId.get(id) ?? creer({ id, sujet, activite, emplacement, dimension: null, raison: 'composeur', texte: mc.texte });
      } else {
        const d = emplacementDeDimension(mc.dimension);
        if (d.emplacement === 'animation' && (r.sujets ?? []).some((s) => !animationAttendue(s))) continue;
        id = idElement(mc.dimension);
        const sujet = d.sujet ? themePratique(p, d.sujet)?.sujetVisuel ?? d.sujet : 'commun';
        m = parId.get(id) ?? creer({ id, sujet, activite: null, emplacement: d.emplacement, dimension: mc.dimension, raison: 'composeur', texte: mc.texte });
        m.modeles += Math.max(0, mc.frequence);
        if (!m.existants.length && mc.exemple) m.existants.push({ cle: mc.exemple, url: null, note: null, aValider: false });
      }
      if (!vus.has(id)) { m.composeur++; vus.add(id); }
      for (const x of profilsTouches) ajouterProfil(m, x);
      parId.set(id, m);
    }
  }

  // 3. Images déposées sur un manque
  const importsPar = new Map<string, { enAttente: number; acceptes: number }>();
  for (const i of e.imports ?? []) {
    const id = manqueDuTrou(i.trou);
    if (!id) continue;
    const x = importsPar.get(id) ?? { enAttente: 0, acceptes: 0 };
    const s = etatImport(i.statut);
    if (s === 'attente') x.enAttente++; else if (s === 'accepte') x.acceptes++;
    importsPar.set(id, x);
  }
  let combles = 0;
  for (const [id, x] of importsPar) {
    const m = parId.get(id);
    if (m) m.imports = x;
    else if (x.acceptes > 0) combles++;
  }

  // 4. Priorité
  const manques = [...parId.values()].filter((m) => !sujetSansManque(m.sujet, m.activite ?? ''));
  for (const m of manques) {
    m.profils.sort((a, b) => (ordre.indexOf(a) + 1 || 99) - (ordre.indexOf(b) + 1 || 99) || a.localeCompare(b));
    m.nomsProfils = m.profils.map(nomProfil);
    m.etat = m.enAttente > 0 || m.imports.enAttente > 0 ? 'a-valider' : 'a-combler';
    const P = POIDS_PRIORITE;
    const poidsProfils = m.profils.reduce((s, id) => s + frequence(id), 0);
    const v = P.gravite * GRAVITE[m.raison] + P.profils * poidsProfils + P.composeur * Math.min(5, m.composeur) + P.modeles * Math.min(10, m.modeles) + BONUS_EMPLACEMENT[m.emplacement] - (m.etat === 'a-valider' ? P.enCours : 0);
    m.priorite = Math.round(v * 10) / 10;
  }
  manques.sort((a, b) => b.priorite - a.priorite || a.id.localeCompare(b.id));

  const emplacements = places.size;
  const nPrets = prets.size;
  const parProfil = e.kits.filter((k) => k.profil.principal).map((k) => ({ id: k.profil.id, nom: k.profil.court, manques: manques.filter((m) => m.profils.includes(k.profil.id)).length }));
  return {
    manques,
    progression: { emplacements, prets: nPrets, part: emplacements ? Math.round((nPrets / emplacements) * 100) / 100 : 0, enCours: manques.filter((m) => m.etat === 'a-valider').length, combles },
    parProfil,
  };
}

/** Manques d'un profil (identifiant de référence) ou d'un profil composé (thèmes + activités) */
export function manquesDuProfil(manques: readonly Manque[], f: { id?: string | null; sujets?: readonly string[]; activites?: readonly string[] }): Manque[] {
  return manques.filter((m) => (f.id && m.profils.includes(f.id)) || ((f.sujets ?? []).includes(m.sujet) && (!m.activite || (f.activites ?? []).includes(m.activite))));
}

const NOMS_DIMENSIONS: Record<string, string> = {
  gamme: 'Palettes', modele: 'Structures de site', 'typo:police': 'Polices', 'composant:accueil': 'Premiers écrans (fonds)', 'composant:entete-anim': 'Animations d’en-tête',
  'composant:portraits': 'Portraits des praticiens', traitement: 'Traitements photo', effets: 'Effets', picto: 'Icônes', animation: 'Animations',
};
/** Libellé d'une dimension du composeur */
export function libelleDimension(dim: string): string {
  if (NOMS_DIMENSIONS[dim]) return NOMS_DIMENSIONS[dim];
  if (dim.startsWith('illustration:')) return `Illustrations (${dim.slice(13)})`;
  if (dim.startsWith('photo:')) return 'Photos';
  const [t, x] = dim.split(':');
  return x ? `${t === 'composant' ? 'Élément' : t} : ${x}` : t;
}

// ---------------------------------------------------------------------------------------------------------------
// Gamme des prompts : la mieux notée, compatible avec le sujet
// ---------------------------------------------------------------------------------------------------------------

const rougeVif = (h: string) => { const [r, g, b] = rvb(h); return r > 140 && r > g * 1.6 && r > b * 1.6; };
/** Gamme injectée dans un prompt : la mieux notée (≥ 4 ★) ; sujet calme : gammes sobres, jamais d'accent rouge ; défaut canard */
export function gammePourManque(sujet: string, notes?: NotesElements | null): Gamme {
  const calme = SUJETS_CALMES.includes(sujet);
  const permises = GAMMES.filter((g) => !(calme && (g.famille === 'vitaminee' || rougeVif(g.accent) || (g.vif && rougeVif(g.vif)))));
  const notees = permises.map((g) => ({ g, n: notes?.[`gamme:${g.id}`]?.m ?? null })).filter((x): x is { g: Gamme; n: number } => x.n !== null && x.n >= NOTE_BONNE)
    .sort((a, b) => b.n - a.n || a.g.id.localeCompare(b.g.id));
  return notees[0]?.g ?? gammeParId(calme ? 'ardoise' : 'canard') ?? GAMMES[0];
}

// ---------------------------------------------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------------------------------------------

export type PromptManque = {
  id: string;
  outil: OutilManque;
  titre: string;
  /** Format (prompts-images.ts) et ratio exact de l'emplacement (null : SVG) */
  format: string | null;
  ratio: string | null;
  /** Texte à coller (anglais pour ChatGPT / Gemini, français pour Claude) */
  texte: string;
  /** Rappel en français (ce que demande le prompt) */
  rappelFr: string;
  /** Manquements du contrôle (vide : conforme) ; un prompt non conforme n'est jamais proposé à la copie */
  controle: string[];
};

/** Conditions d'usage commercial des outils : rappel court, à vérifier par Paul (pas un avis juridique) */
export const CONDITIONS_OUTILS: Record<OutilManque, { libelle: string; texte: string; url: string }> = {
  chatgpt: {
    libelle: 'ChatGPT (OpenAI)',
    texte: 'Selon les conditions d’OpenAI, ce que vous générez vous revient, dans le respect de ses règles d’usage. Vérifiez les conditions en vigueur pour votre abonnement avant un usage commercial.',
    url: 'https://openai.com/policies/terms-of-use/',
  },
  gemini: {
    libelle: 'Google Gemini',
    texte: 'Google encadre les contenus générés par ses conditions et sa politique d’usage (images marquées d’un filigrane invisible SynthID). Vérifiez les conditions de votre compte (personnel ou Workspace) avant un usage commercial.',
    url: 'https://policies.google.com/terms/generative-ai',
  },
  claude: {
    libelle: 'Claude (Anthropic)',
    texte: 'Le SVG est écrit dans votre session Claude Code à partir des géométries du dépôt (aucune image tierce copiée). Vérifiez les conditions d’Anthropic applicables à votre offre.',
    url: 'https://www.anthropic.com/legal/consumer-terms',
  },
};
export const MENTION_CONDITIONS = 'Rappel indicatif, pas un avis juridique : les conditions changent selon l’outil et l’abonnement.';

type Texte = { en: string; fr: string };
/** Contraintes propres au sujet, ajoutées aux contraintes négatives habituelles */
export function contraintesDuSujet(sujet: string): Texte[] {
  const l: Texte[] = [];
  if (sujet === 'enfant') l.push({ en: 'no identifiable child: only feet, legs or small shoes in frame, never a child’s face', fr: 'aucun enfant identifiable : seulement pieds, jambes ou petites chaussures dans le cadre, jamais le visage d’un enfant' });
  if (sujet === 'diabete') l.push({ en: 'soft and calm mood, cool gentle colours, absolutely no red', fr: 'ambiance douce et calme, couleurs froides et tendres, aucun rouge' });
  if (sujet === 'sport') l.push({ en: 'healthy athletic proportions with toned calves, never skinny tube-like legs', fr: 'proportions sportives et saines, mollets galbés, jamais de jambes en tubes' });
  if (sujet === 'senior') l.push({ en: 'dignified and active, no frailty or medical props in the foreground', fr: 'digne et actif, pas de fragilité ni de matériel médical au premier plan' });
  return l;
}

/** Contrôle d'un prompt de manque, en plus de controlerPrompt : ratio présent, contraintes du sujet présentes, aucune demande interdite */
export function controlerPromptManque(texte: string, o: { sujet: string; ratio: string | null; langue: 'en' | 'fr'; outil: OutilManque }): string[] {
  const r: string[] = [];
  if (o.ratio && !texte.includes(o.ratio)) r.push(`Ratio ${o.ratio} absent.`);
  for (const c of contraintesDuSujet(o.sujet)) if (!texte.includes(c[o.langue])) r.push(`Contrainte du sujet absente : ${c.fr}.`);
  if (sujetSansManque(o.sujet)) r.push('Pas de posturologie ni de réflexologie.');
  if (o.outil !== 'claude' && !/no text/i.test(texte)) r.push('« Aucun texte » absent.');
  return r;
}

export type ContextePrompts = {
  profession?: string | null;
  registre?: readonly PratiqueProfession[];
  /** Gamme injectée (gammePourManque) */
  gamme?: Gamme | string | null;
  /** Images 4-5 ★ du même type à joindre comme référence de style (adresses) */
  references?: readonly string[];
  /** Éléments 4-5 ★ du même type à imiter (clés d'inventaire, Claude) */
  modeles?: readonly string[];
};

const FORMATS_PHOTO = ['premier-ecran-mobile', 'premier-ecran'] as const;
const FORMAT_ILLUSTRATION = 'page-sujet';

/** Scènes des activités (pied, chaussure, sol de l'activité ; jamais de marque ni de visage) : remplacent la scène générique du sujet */
export const SCENES_ACTIVITES: Readonly<Record<string, Texte>> = {
  course: { en: 'the lower legs and feet of a runner in plain unbranded running shoes, mid-stride on a quiet road', fr: 'les jambes et les pieds d’un coureur en chaussures de course unies en pleine foulée sur une route calme' },
  trail: { en: 'the lower legs and feet of a trail runner in plain unbranded trail shoes with lugged soles on a rocky mountain path', fr: 'les jambes et les pieds d’un traileur en chaussures de trail unies à crampons sur un sentier de montagne rocailleux' },
  randonnee: { en: 'the lower legs and feet of a hiker in plain unbranded hiking boots on a stony footpath', fr: 'les jambes et les pieds d’un randonneur en chaussures de randonnée unies sur un chemin caillouteux' },
  football: { en: 'feet in plain unbranded football boots on green grass next to a ball', fr: 'des pieds en chaussures de football unies sur une pelouse verte à côté d’un ballon' },
  rugby: { en: 'feet in plain unbranded rugby boots on a grass pitch next to an oval ball', fr: 'des pieds en chaussures de rugby unies sur une pelouse, à côté d’un ballon ovale' },
  basket: { en: 'the lower legs and feet of a player in plain unbranded high-top basketball shoes landing on a wooden indoor court', fr: 'les jambes et les pieds d’un joueur en chaussures de basket montantes unies, à la réception d’un saut sur un parquet de salle' },
  tennis: { en: 'feet in plain unbranded tennis shoes sliding sideways on a clay court near the baseline', fr: 'des pieds en chaussures de tennis unies en glissade latérale sur terre battue, près de la ligne de fond' },
  handball: { en: 'feet in plain unbranded indoor court shoes pivoting on a sports hall floor', fr: 'des pieds en chaussures de salle unies en pivot sur le sol d’un gymnase' },
  danse: { en: 'feet in soft ballet slippers on the wooden floor of a bright dance studio', fr: 'des pieds en chaussons de danse sur le parquet d’un studio lumineux' },
  cyclisme: { en: 'a foot in a plain unbranded cycling shoe clipped onto a road bike pedal', fr: 'un pied en chaussure de vélo unie, clipsée sur la pédale d’un vélo de route' },
  ski: { en: 'plain unbranded ski boots clicked into bindings on fresh snow', fr: 'des chaussures de ski unies dans leurs fixations sur la neige fraîche' },
  golf: { en: 'feet in plain unbranded golf shoes on a short-cut green fairway', fr: 'des pieds en chaussures de golf unies sur un fairway vert tondu ras' },
  natation: { en: 'bare feet and pool sandals at the edge of a bright swimming pool', fr: 'des pieds nus et des sandales de bain au bord d’une piscine lumineuse' },
  gymnastique: { en: 'bare feet on a blue gymnastics mat in a bright gym', fr: 'des pieds nus sur un tapis de gymnastique bleu dans une salle lumineuse' },
  'arts-martiaux': { en: 'bare feet on a tatami mat in a calm martial arts hall', fr: 'des pieds nus sur un tatami dans une salle d’arts martiaux calme' },
  equitation: { en: 'a plain riding boot resting in a stirrup', fr: 'une botte d’équitation unie posée dans l’étrier' },
};

function precisionAnglaise(m: Pick<Manque, 'activite'>, p: PratiqueProfession): string | null {
  const a = activitePratique(p, m.activite);
  const q = a?.requetes[0] ?? null;
  return q && !motifsRefus(q).length ? q.slice(0, 200) : null;
}

function enrobage(outil: 'chatgpt' | 'gemini', genre: 'photo' | 'illustration', ratio: string): string {
  const quoi = genre === 'photo' ? 'photorealistic image' : 'flat illustration';
  return outil === 'chatgpt'
    ? `Create one ${quoi} (aspect ratio ${ratio}, high resolution, at least 1536 px on the long side). Follow every line below.`
    : `Generate one ${quoi} in ${ratio} aspect ratio, high resolution. Follow every line below.`;
}

const STYLE_ILLUSTRATION: Texte = {
  en: 'Style: flat minimalist illustration, organic shapes and fine lines, contour lines like a topographic map, generous empty space, no gradients, no 3D, no photo texture',
  fr: 'Style : illustration minimaliste en aplats, formes organiques et traits fins, lignes de niveau comme une carte topographique, beaucoup d’espace vide, sans dégradé, sans 3D, sans texture photo',
};

/** Prompt raster (ChatGPT, Gemini) : photo ou illustration, en anglais, recontrôlé */
function promptRaster(m: Manque, outil: 'chatgpt' | 'gemini', format: string, c: ContextePrompts, p: PratiqueProfession): PromptManque | null {
  const empl = m.emplacement === 'photo-accueil' ? 'accueil' : 'page-sujet';
  const sceneActivite = m.activite ? SCENES_ACTIVITES[m.activite] ?? null : null;
  const scene = sceneActivite ?? sceneDe(m.sujet, empl, format);
  if (!scene) return null;
  const g = typeof c.gamme === 'object' && c.gamme ? c.gamme : gammeParId(typeof c.gamme === 'string' ? c.gamme : null) ?? gammePourManque(m.sujet);
  // Activité décrite par sa propre scène ; sinon scène du sujet + précision de l'activité (recherche de photos en anglais)
  const precision = (langue: 'en' | 'fr') => (sceneActivite ? null : langue === 'en' ? precisionAnglaise(m, p) : activitePratique(p, m.activite)?.precision ?? null);
  const base = (langue: 'en' | 'fr') => construirePrompt({ sujet: m.sujet, emplacement: empl, format, gamme: g, langue, style: 'phrases', variante: 0, precision: precision(langue), scene: sceneActivite });
  const en = base('en'), fr = base('fr');
  const f = formatImage(format)!;
  const genre = m.emplacement === 'photo-accueil' ? 'photo' : 'illustration';
  const extra = contraintesDuSujet(m.sujet);
  const assembler = (b: PromptConstruit, L: 'en' | 'fr') => {
    let t = b.texte;
    if (genre === 'illustration') t = t.replace(/^(Style|Style) ?:.*$/m, STYLE_ILLUSTRATION[L]).replace(/^(Purpose|Usage) ?:.*$/m, L === 'en' ? 'Purpose: generic illustration for the website of a foot-care practice (no real person).' : 'Usage : illustration générique pour le site d’un cabinet de soins des pieds (aucune personne réelle).');
    const sujetEnPlus = extra.length ? `\n${L === 'en' ? 'Also:' : 'Aussi :'} ${extra.map((x) => x[L]).join(' ; ')}.` : '';
    const refs = L === 'en' && c.references?.length ? `\nStyle reference: match the light, framing and colours of the attached images (our best-rated ${genre === 'photo' ? 'photos' : 'visuals'}), without copying them.` : '';
    return `${t}${sujetEnPlus}${refs}`;
  };
  if (!en.ok || !fr.ok) return { id: `${m.id}|${outil}|${format}`, outil, titre: `${CONDITIONS_OUTILS[outil].libelle} · ${f.libelle}`, format, ratio: f.ratio, texte: '', rappelFr: '', controle: en.ok ? (fr.ok ? [] : fr.refus) : en.refus };
  const corps = assembler(en, 'en');
  const texte = `${enrobage(outil, genre, f.ratio)}\n${corps}`;
  const controle = [
    ...controlerPrompt(texte, { style: 'phrases', langue: 'en', scene: `${scene.en} ${precision('en') ?? ''}` }),
    ...controlerPromptManque(texte, { sujet: m.sujet, ratio: f.ratio, langue: 'en', outil }),
  ];
  const refsFr = c.references?.length ? `\n\nImages de référence (4-5 ★) à joindre au message si possible :\n${c.references.slice(0, 3).map((u) => `- ${u}`).join('\n')}` : '';
  return {
    id: `${m.id}|${outil}|${format}`, outil, titre: `${CONDITIONS_OUTILS[outil].libelle} · ${f.libelle} ${f.ratio}`, format, ratio: f.ratio, texte,
    rappelFr: `${assembler(fr, 'fr')}${refsFr}\n\nTéléchargez l’image en pleine résolution (au moins 1024 × 768 px), puis « Déposer l’image générée » sur ce manque.`, controle,
  };
}

/** Grammaire visuelle existante à rappeler à Claude, selon l'emplacement */
const GRAMMAIRE: Record<Exclude<EmplacementManque, 'photo-accueil'>, string[]> = {
  icone: [
    'Grammaire : pictos du kit (pictos.ts, icones.ts : trait régulier, coins arrondis, une seule couleur currentColor, lisible à 24 px) ; icônes illustrées (icones-illustrees.ts) pour les soins.',
    'Géométries validées à réutiliser : silhouettes de pied d’entete-pied-geo.ts (GEO_PIED), sites SITES_MONOFILAMENT de dessins.ts, objets du kit Sports (sports.ts).',
  ],
  illustration: [
    'Grammaire : dessins.ts et dessins.css (registres « relevé » et « pédagogique »), univers-minimal.ts (aplats organiques + traits fins, lignes de niveau, trajectoires), empreintes en lignes de niveau (entete-empreintes.ts).',
    'Géométries validées à réutiliser : GEO_PIED (entete-pied-geo.ts), isothermes et poserChemin (images-fixes-pied.ts), SITES_MONOFILAMENT (dessins.ts), coutures et objets de sports.ts. AUCUNE anatomie inventée.',
  ],
  animation: [
    'Grammaire : animations d’en-tête (entete-anim.ts, entete-pied.ts, univers-minimal.ts « composant:entete-anim:un-<id> ») : panneau de la gamme, variables --hp-*, < 5 Ko balisage + feuille.',
    'Animer SEULEMENT transform, opacity, stroke-dashoffset, une fois sous .ea-joue ; réduction des animations → l’image fixe finale (belle d’abord). Géométries : GEO_PIED, empreintes, lignes de niveau, chevrons.',
  ],
  element: [
    'Grammaire : composants des modèles (recettes.ts, gabarits.ts, fonds-heros.ts pour les fonds de premier écran : jamais d’écran vide, empreintes en filigrane, illustration posée nette), harmonie.ts (règles dures).',
    'Géométries et éléments 4-5 ★ existants à réutiliser ; rien de nouveau qui contredise les règles dures de l’harmonie.',
  ],
};

/** Demande à Claude (session Code) : texte autonome en français, à envoyer par « Envoyer à Claude » */
function promptClaude(m: Manque, c: ContextePrompts, p: PratiqueProfession): PromptManque {
  const a = activitePratique(p, m.activite);
  const theme = themePratique(p, m.sujet);
  const empl = m.emplacement === 'photo-accueil' ? 'illustration' : m.emplacement;
  const quoi = m.emplacement === 'element' && m.dimension ? libelleDimension(m.dimension) : LIBELLES_EMPLACEMENTS_MANQUES[m.emplacement];
  const calme = SUJETS_CALMES.includes(m.sujet);
  const livrable = m.emplacement === 'icone'
    ? '3 icônes SVG (viewBox 0 0 24 24, currentColor), clés « picto:<id> » ou « icone-illustree:<id> »'
    : m.emplacement === 'animation'
      ? '2 animations d’en-tête (clés « composant:entete-anim:<id> ») + leur image fixe finale'
      : m.emplacement === 'element'
        ? `3 nouvelles variantes de « ${quoi} » qui aillent avec les éléments 4-5 ★`
        : '3 illustrations SVG (clés « dessin:<id>:pedagogique » ou « heros:<id> »), fond transparent, cadrées dans leur case';
  const lignes = [
    `Atelier des manques — ${m.libelle}`,
    `Manque : ${m.id} (${LIBELLES_RAISONS_MANQUES[m.raison]}). ${m.texte}`,
    `Profils bloqués : ${m.nomsProfils.join(', ') || '—'}${m.composeur ? ` ; remonté par le composeur pour ${m.composeur} profil${m.composeur > 1 ? 's' : ''}` : ''}.`,
    `Emplacement : ${quoi}${theme ? ` · thème « ${theme.court} »` : ''}${a ? ` · activité « ${a.libelle} » (#${a.hashtags[0]})` : ''}.`,
    ...GRAMMAIRE[empl as Exclude<EmplacementManque, 'photo-accueil'>],
    c.modeles?.length ? `Éléments 4-5 ★ du même type à imiter (même registre, même épaisseur de trait, même palette) : ${c.modeles.slice(0, 5).join(', ')}.` : 'Aucun élément 4-5 ★ de ce type encore : partir des univers que Paul a trouvés « WOW » (animations du pied, empreintes en lignes de niveau, univers minimal).',
    `Contraintes : aucun texte, aucun chiffre, aucun logo ni marque, aucune anatomie inventée (pieds = géométries validées), formes robustes ; couleurs de la gamme par variables CSS${calme ? ' ; sujet CALME : bleus froids, jamais de rouge, aucune animation vive' : ''}${m.sujet === 'sport' ? ' ; course et sport : silhouettes pleines et fluides, volumes sains (jamais de squelette à rotules « robot », jamais de jambes en tubes)' : ''}${m.sujet === 'enfant' ? ' ; enfant : jamais de visage, rien d’effrayant' : ''}.`,
    `Livrable : ${livrable} dans un module de packages/core/src (ou un module existant de la même famille), hashtags ${[...new Set([m.sujet, ...(a ? a.hashtags.slice(0, 1) : [])])].map((h) => `#${h}`).join(' ')} dans l’inventaire, statut « à valider » (jamais « Validé » : seul Paul valide), clés ajoutées au registre des nouveautés (npm run inventaire:maj) pour qu’elles arrivent dans 🎯 À valider › ${m.nomsProfils[0] ?? (theme?.court ?? m.sujet)}.`,
    'Avant de livrer : planche des propositions (clair / sombre, téléphone ; pour une animation, 6 instants + image finale), tests du core, npm run verifier vert, commit par scripts/pousser-commit.sh, lien « À valider » du lot.',
  ];
  const texte = lignes.join('\n');
  const controle = controlerPromptManque(texte, { sujet: m.sujet, ratio: null, langue: 'fr', outil: 'claude' }).filter((x) => !x.startsWith('Contrainte du sujet'));
  if (!/aucun texte/i.test(texte)) controle.push('« Aucun texte » absent.');
  if (!/à valider/.test(texte)) controle.push('Livrable « à valider » absent.');
  return { id: `${m.id}|claude`, outil: 'claude', titre: `Claude (SVG) · ${quoi}`, format: null, ratio: null, texte, rappelFr: texte, controle };
}

/** Prompts d'un manque, dans l'ordre des outils de l'emplacement (photo : téléphone 4:5 puis ordinateur 16:9) ; jamais un prompt non conforme */
export function promptsDuManque(m: Manque, c: ContextePrompts = {}): PromptManque[] {
  if (sujetSansManque(m.sujet, m.activite ?? '')) return [];
  const p = pratiqueDe(c.profession ?? null, c.registre ?? PRATIQUES);
  const l: PromptManque[] = [];
  for (const outil of m.outils) {
    if (outil === 'claude') { l.push(promptClaude(m, c, p)); continue; }
    const formats = m.emplacement === 'photo-accueil' ? FORMATS_PHOTO : [FORMAT_ILLUSTRATION];
    for (const f of formats) { const x = promptRaster(m, outil, f, c, p); if (x) l.push(x); }
  }
  return l.filter((x) => x.texte && !x.controle.length);
}

/** Toutes les contraintes négatives d'un prompt raster (pour l'affichage « ce que le prompt interdit ») */
export const INTERDITS_PROMPTS = CONTRAINTES_NEGATIVES.map((c) => c.fr);
