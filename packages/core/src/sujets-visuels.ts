// Sujets des visuels (demande de Paul, 2026-10-07 : « pouvoir taguer ou détaguer les sujets auxquels les visuels sont
// associés »). Chaque visuel de l'inventaire (assets.ts) a des sujets PAR DÉFAUT, tirés du code : soins et fiches de la
// bibliothèque (champ `soins` de l'inventaire), thème des héros, spécialité des photos de jeux, sujet choisi pour les photos
// libres. Paul ajoute (+) ou retire (×) un sujet en un clic (/admin/retours, /admin/illustrations) ; le journal est en ajout
// seul (table assets_sujets, migration 0028) et l'état courant = dernière action par (clé, sujet).
// Sujets EFFECTIFS = défauts du code ± surcharges de Paul. Le générateur les utilise via PoidsAssets.sujets (assets-poids.ts :
// un visuel retiré d'un sujet n'est plus proposé pour ce sujet) ; si un sujet n'a plus aucun visuel d'un type, on garde un
// REPLI (les visuels par défaut) et la synthèse le signale (« sujet sans visuel »). Module pur, déterministe.

import { THEMES } from './themes';
import { SUJETS_VISUELS } from './photos-libres';
import type { SurchargesSujets, PoidsAssets, TypeAsset } from './assets-poids';

export const ACTIONS_SUJET = ['ajout', 'retrait'] as const;
export type ActionSujet = (typeof ACTIONS_SUJET)[number];

const IDS_SUJETS = SUJETS_VISUELS.map((s) => s.id);
export const estSujetDeVisuel = (s: unknown): s is string => typeof s === 'string' && IDS_SUJETS.includes(s);

/** Visuel minimal (inventaire) */
export type VisuelSujets = { cle: string; type: TypeAsset; soins: readonly string[] };

/**
 * Sujets par défaut d'un visuel, dans l'ordre de SUJETS_VISUELS : un identifiant de sujet tel quel (photos libres,
 * héros), un soin du catalogue → les thèmes qui le regroupent, une spécialité → ses thèmes (« generale » → général).
 */
export function sujetsParDefaut(v: VisuelSujets): string[] {
  const s = new Set<string>();
  const ajouter = (x: string) => {
    if (IDS_SUJETS.includes(x)) { s.add(x); return; }
    for (const t of THEMES) if (t.statut === 'actif' && (t.soins.includes(x) || t.specialite === x)) s.add(t.id);
    if (x === 'generale' || x === 'generale-pieds' || x === 'accueil') s.add('general');
  };
  // Héros : heros:<thème>:<registre>
  if (v.cle.startsWith('heros:')) ajouter(v.cle.split(':')[1]);
  for (const x of v.soins) ajouter(x);
  return IDS_SUJETS.filter((x) => s.has(x));
}

export type LigneSujet = { cle: string; sujet: string; action: ActionSujet | string; le?: string | null };

/**
 * Surcharges courantes à partir du journal (ou des lignes effectives de assets_sujets_effectifs) : dernière action par
 * (clé, sujet), dans l'ordre des dates (`le`), puis de lecture. Sujets inconnus ignorés.
 */
export function surchargesDepuisLignes(lignes: readonly LigneSujet[]): SurchargesSujets {
  const triees = lignes.map((l, i) => ({ l, i })).sort((a, b) => String(a.l.le ?? '').localeCompare(String(b.l.le ?? '')) || a.i - b.i);
  const etat = new Map<string, Map<string, ActionSujet>>();
  for (const { l } of triees) {
    if (!estSujetDeVisuel(l.sujet) || (l.action !== 'ajout' && l.action !== 'retrait')) continue;
    const m = etat.get(l.cle) ?? new Map<string, ActionSujet>();
    m.set(l.sujet, l.action);
    etat.set(l.cle, m);
  }
  const res: SurchargesSujets = {};
  for (const cle of [...etat.keys()].sort()) {
    const m = etat.get(cle)!;
    res[cle] = {
      ajouts: IDS_SUJETS.filter((s) => m.get(s) === 'ajout'),
      retraits: IDS_SUJETS.filter((s) => m.get(s) === 'retrait'),
    };
  }
  return res;
}

export type SujetsEffectifs = {
  /** Sujets effectifs (ordre de SUJETS_VISUELS) */
  sujets: string[];
  defauts: string[];
  /** Ajoutés par Paul (absents des défauts) */
  ajoutes: string[];
  /** Retirés par Paul (présents dans les défauts) */
  retires: string[];
};

/** Défauts du code ± surcharges de Paul (un ajout d'un sujet déjà par défaut, ou un retrait d'un sujet absent, ne change rien) */
export function sujetsEffectifs(defauts: readonly string[], surcharge?: { ajouts: readonly string[]; retraits: readonly string[] } | null): SujetsEffectifs {
  const d = IDS_SUJETS.filter((x) => defauts.includes(x));
  const aj = surcharge?.ajouts ?? [];
  const re = surcharge?.retraits ?? [];
  const sujets = IDS_SUJETS.filter((x) => (d.includes(x) || aj.includes(x)) && !re.includes(x));
  return { sujets, defauts: d, ajoutes: sujets.filter((x) => !d.includes(x)), retires: d.filter((x) => re.includes(x)) };
}

/** Sujets effectifs d'un visuel */
export const sujetsDuVisuel = (v: VisuelSujets, surcharges?: SurchargesSujets | null) => sujetsEffectifs(sujetsParDefaut(v), surcharges?.[v.cle]);

/**
 * Visuels d'un sujet (filtre « noter les visuels du sujet Sport », choix d'un visuel par thème) : ceux dont les sujets
 * effectifs comprennent le sujet ; si aucun, REPLI sur ceux qui l'ont par défaut (signalé par `repli`).
 */
export function visuelsDuSujet<T extends VisuelSujets>(visuels: readonly T[], sujet: string, surcharges?: SurchargesSujets | null): { visuels: T[]; repli: boolean } {
  const effectifs = visuels.filter((v) => sujetsDuVisuel(v, surcharges).sujets.includes(sujet));
  if (effectifs.length) return { visuels: effectifs, repli: false };
  const defaut = visuels.filter((v) => sujetsParDefaut(v).includes(sujet));
  return { visuels: defaut, repli: defaut.length > 0 };
}

/** Familles de visuels suivies pour « sujet sans visuel » */
const FAMILLES: { id: string; libelle: string; types: readonly TypeAsset[] }[] = [
  { id: 'illustrations', libelle: 'illustrations', types: ['dessin', 'ligne', 'heros', 'materiel', 'biblio'] },
  { id: 'icones', libelle: 'icônes', types: ['picto'] },
  { id: 'photos', libelle: 'photos', types: ['photo'] },
];

/** Sujets qui avaient des visuels d'une famille par défaut et n'en ont plus aucun après les retraits de Paul (repli utilisé) */
export function sujetsSansVisuel(visuels: readonly VisuelSujets[], surcharges?: SurchargesSujets | null): { sujet: string; libelle: string; famille: string }[] {
  const res: { sujet: string; libelle: string; famille: string }[] = [];
  for (const s of SUJETS_VISUELS) {
    for (const f of FAMILLES) {
      const l = visuels.filter((v) => f.types.includes(v.type));
      if (visuelsDuSujet(l, s.id, surcharges).repli) res.push({ sujet: s.id, libelle: s.libelle, famille: f.libelle });
    }
  }
  return res;
}

/** Poids appris + surcharges de sujets (générateur, sites) : poids neutre créé si aucune note n'existe encore */
export function avecSujets(poids: PoidsAssets | null, surcharges: SurchargesSujets | null | undefined): PoidsAssets | null {
  if (!surcharges || !Object.keys(surcharges).length) return poids;
  return { ...(poids ?? { n: 0, moyenne: 0, effets: {}, statuts: {} }), sujets: surcharges };
}

const libelle = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;

/** Section « Sujets modifiés par Paul » (retours/SYNTHESE.md) */
export function markdownSujets(surcharges: SurchargesSujets, opts: { titres?: Record<string, string>; sansVisuel?: { libelle: string; famille: string }[]; titre?: string } = {}): string {
  const l = [opts.titre ?? '## Sujets modifiés par Paul', ''];
  const cles = Object.keys(surcharges).filter((k) => surcharges[k].ajouts.length || surcharges[k].retraits.length).sort();
  if (!cles.length) l.push('Aucune modification : les sujets des visuels sont ceux du code.');
  for (const k of cles) {
    const s = surcharges[k];
    const parts = [s.ajouts.length && `ajouté à ${s.ajouts.map(libelle).join(', ')}`, s.retraits.length && `retiré de ${s.retraits.map(libelle).join(', ')}`].filter(Boolean);
    l.push(`- \`${k}\`${opts.titres?.[k] ? ` ${opts.titres[k]}` : ''} : ${parts.join(' ; ')}`);
  }
  if (opts.sansVisuel?.length) {
    l.push('', 'Sujets sans visuel (repli sur les visuels par défaut, à compléter) :');
    for (const x of opts.sansVisuel) l.push(`- ${x.libelle} : plus aucune ${x.famille === 'photos' ? 'photo' : x.famille === 'icônes' ? 'icône' : 'illustration'}`);
  }
  return l.join('\n');
}
