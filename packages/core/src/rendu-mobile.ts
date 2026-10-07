// Retours par APPAREIL et défauts d'ADAPTATION MOBILE (demandes de Paul du 2026-10-07).
//
// Deux natures de retour, bien séparées :
// 1. le CHOIX (une recette, une structure de page, un élément, une illustration : « est-ce beau, pertinent ? »). Note principale,
//    étiquettes, ce qui va / ne va pas. Elle porte l'APPAREIL sur lequel Paul regardait le rendu : `ordinateur`, `mobile`, ou
//    `les-deux` (rendus côte à côte ; c'est aussi la valeur des notes antérieures à la migration 0034, d'où la rétrocompatibilité).
//    Seul le choix pondère les propositions (assets-poids.ts, atelier-poids.ts, recettes.ts). Les sites étant pensés « mobile
//    d'abord », une note donnée en regardant le rendu téléphone pèse un peu plus : POIDS_APPAREIL (1,25 contre 1). Les notes
//    « les-deux » et « ordinateur » pèsent 1 : sans note mobile, tous les poids sont exactement ceux d'avant.
// 2. l'ADAPTATION MOBILE (« le choix est bon, mais sa déclinaison téléphone est à revoir ») : bloc « Rendu mobile » séparé,
//    ✓ « Mobile OK » / ✗ « Mobile à revoir », étiquettes mobiles, remarque, zones, note mobile facultative. Un « Mobile à revoir »
//    NE pénalise PAS le choix ni ses ingrédients : il ouvre un DÉFAUT D'ADAPTATION MOBILE rattaché à la variante, au composant ou
//    à la page (table defauts_mobile, migration 0034), jamais à la recette entière. Ces défauts forment la liste de corrections
//    « Rendu mobile à revoir » (/admin/retours, retours/SYNTHESE.md, retours/defauts-mobile.json) : Claude ou le graphiste corrige
//    la feuille responsive de la variante, puis incrémente sa version dans VERSIONS_MOBILE ; l'élément revient alors
//    « Modifié (mobile) » pour que Paul le revalide (avant / après téléphone). « Mobile OK » sur un élément clôt ses défauts.
//    Effet sur les propositions : un défaut OUVERT fait seulement passer la variante APRÈS les autres pour les praticiens
//    (FACTEUR_DEFAUT_MOBILE sur la masse d'un tirage, recettes concernées classées après les autres), jusqu'à sa correction.
// Module pur.

import { lignesZones, normaliserZones, type ZonesNote } from './zones';

export const APPAREILS_RETOUR = ['ordinateur', 'mobile', 'les-deux'] as const;
export type AppareilRetour = (typeof APPAREILS_RETOUR)[number];
export const estAppareilRetour = (x: unknown): x is AppareilRetour => (APPAREILS_RETOUR as readonly unknown[]).includes(x);
/** Appareil d'une note lue : absent ou inconnu (notes antérieures à 0034) → « les-deux » */
export const appareilDe = (x: unknown): AppareilRetour => (estAppareilRetour(x) ? x : 'les-deux');
export const LIBELLES_APPAREILS: Record<AppareilRetour, string> = { ordinateur: 'Ordinateur', mobile: 'Mobile', 'les-deux': 'Ordinateur et mobile' };

/** Poids d'une note de CHOIX selon l'appareil regardé (mobile d'abord : 1,25) ; les notes antérieures (« les-deux ») pèsent 1 */
export const POIDS_APPAREIL: Record<AppareilRetour, number> = { ordinateur: 1, mobile: 1.25, 'les-deux': 1 };
export const poidsAppareil = (x: unknown) => POIDS_APPAREIL[appareilDe(x)];

/** Étiquettes du bloc « Rendu mobile » (adaptation téléphone) */
export const ETIQUETTES_MOBILE = [
  { id: 'parfait-sur-mobile', libelle: 'Parfait sur mobile', positive: true },
  { id: 'texte-trop-petit', libelle: 'Texte trop petit', positive: false },
  { id: 'trop-long-a-defiler', libelle: 'Trop long à faire défiler', positive: false },
  { id: 'boutons-trop-petits', libelle: 'Boutons trop petits', positive: false },
  { id: 'image-coupee', libelle: 'Image coupée', positive: false },
  { id: 'colonnes-trop-serrees', libelle: 'Colonnes trop serrées', positive: false },
  { id: 'ordre-des-blocs', libelle: 'Ordre des blocs à revoir', positive: false },
  { id: 'menu-genant', libelle: 'Menu gênant', positive: false },
] as const;
export const estEtiquetteMobile = (x: unknown): x is string => ETIQUETTES_MOBILE.some((e) => e.id === x);
export const libelleEtiquetteMobile = (id: string) => ETIQUETTES_MOBILE.find((e) => e.id === id)?.libelle ?? id;

/**
 * Version de la feuille responsive d'un élément (variante, composant, page) : à incrémenter (ou à ajouter) par Claude ou le
 * graphiste après chaque correction d'un défaut mobile, avec la date. L'empreinte mobile en dépend : un défaut signalé sur une
 * empreinte antérieure apparaît « Modifié (mobile) », à revalider par Paul. Clé : celle de l'élément (`composant:galerie:bande`,
 * `structure:acces:…`), ou un préfixe (`composant:galerie`) qui vaut pour toutes ses variantes.
 */
export const VERSIONS_MOBILE: Record<string, string> = {};

/** Version mobile d'une clé : la sienne, sinon celle de son préfixe (`type:famille`), sinon « 0 » */
export function versionMobile(cle: string): string {
  const [type, a] = cle.split(':');
  return VERSIONS_MOBILE[cle] ?? VERSIONS_MOBILE[`${type}:${a}`] ?? '0';
}

function fnv(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
/** Empreinte du rendu mobile d'un élément : empreinte de l'élément (si connue) et version de sa feuille responsive */
export const empreinteMobile = (cle: string, empreinteElement?: string | null) => fnv(`${cle}|${empreinteElement ?? ''}|${versionMobile(cle)}`);

// ---------------------------------------------------------------------------------------------------------------
// Défauts d'adaptation mobile
// ---------------------------------------------------------------------------------------------------------------

export const VERDICTS_MOBILE = ['ok', 'a_revoir'] as const;
export type VerdictMobile = (typeof VERDICTS_MOBILE)[number];
export const STATUTS_DEFAUT_MOBILE = ['a_corriger', 'corrige', 'sans_objet'] as const;
export type StatutDefautMobile = (typeof STATUTS_DEFAUT_MOBILE)[number];
export const LIBELLES_STATUTS_MOBILE: Record<StatutDefautMobile, string> = { a_corriger: 'À corriger', corrige: 'Corrigé', sans_objet: 'Sans objet' };

/** Un retour « Rendu mobile » (une ligne de defauts_mobile) */
export type RetourMobile = {
  id?: string;
  cle: string;
  page?: string | null;
  verdict: VerdictMobile;
  etiquettes: string[];
  remarque?: string | null;
  note?: number | null;
  zones?: ZonesNote | null;
  /** Empreinte mobile au moment du retour (empreinteMobile) */
  empreinte?: string | null;
  statut: StatutDefautMobile;
  le?: string | null;
};

/** Ligne de la table (ou de l'export) → retour mobile ; invalide → null */
export function retourMobileDepuisLigne(l: Record<string, unknown>): RetourMobile | null {
  if (typeof l.cle !== 'string' || !/^[a-z]+:[^\s]{1,200}$/.test(l.cle)) return null;
  const verdict: VerdictMobile = l.verdict === 'ok' ? 'ok' : 'a_revoir';
  const statut: StatutDefautMobile = (STATUTS_DEFAUT_MOBILE as readonly unknown[]).includes(l.statut) ? l.statut as StatutDefautMobile : verdict === 'ok' ? 'sans_objet' : 'a_corriger';
  const note = typeof l.note === 'number' && Number.isInteger(l.note) && l.note >= 1 && l.note <= 5 ? l.note : null;
  return {
    ...(typeof l.id === 'string' ? { id: l.id } : {}),
    cle: l.cle, page: typeof l.page === 'string' ? l.page : null, verdict,
    etiquettes: Array.isArray(l.etiquettes) ? l.etiquettes.filter(estEtiquetteMobile).slice(0, 12) : [],
    remarque: typeof l.remarque === 'string' && l.remarque.trim() ? l.remarque.trim().slice(0, 2000) : null,
    note, zones: normaliserZones(l.zones), empreinte: typeof l.empreinte === 'string' && /^[0-9a-f]{8}$/.test(l.empreinte) ? l.empreinte : null,
    statut, le: typeof l.le === 'string' ? l.le : typeof l.created_at === 'string' ? l.created_at : typeof l.jour === 'string' ? l.jour : null,
  };
}

/** État mobile d'un élément : défauts ouverts, et « Modifié (mobile) » quand la feuille a changé depuis le signalement */
export type EtatMobile = { cle: string; ouverts: RetourMobile[]; modifie: boolean; dernier: RetourMobile };

/**
 * États mobiles par clé (ordre chronologique des retours). Un « Mobile OK » clôt les défauts antérieurs de la clé ; un défaut
 * reste ouvert tant que son statut est « à corriger ». `empreinteActuelle(cle)` : empreinte mobile courante (empreinteMobile).
 */
export function etatsMobile(retours: readonly RetourMobile[], empreinteActuelle?: (cle: string) => string | null): Map<string, EtatMobile> {
  const m = new Map<string, EtatMobile>();
  const tries = [...retours].sort((a, b) => String(a.le ?? '').localeCompare(String(b.le ?? '')));
  for (const r of tries) {
    const e = m.get(r.cle) ?? { cle: r.cle, ouverts: [], modifie: false, dernier: r };
    e.dernier = r;
    if (r.verdict === 'ok') e.ouverts = [];
    else if (r.statut === 'a_corriger') e.ouverts.push(r);
    m.set(r.cle, e);
  }
  for (const e of m.values()) {
    const actuelle = empreinteActuelle?.(e.cle) ?? null;
    e.modifie = Boolean(actuelle && e.ouverts.length && e.ouverts.every((o) => o.empreinte && o.empreinte !== actuelle));
  }
  return m;
}

/** Clés dont l'adaptation mobile est à corriger (défaut ouvert, pas encore modifiée) */
export const clesDefautsOuverts = (etats: Map<string, EtatMobile>): Set<string> =>
  new Set([...etats.values()].filter((e) => e.ouverts.length && !e.modifie).map((e) => e.cle));

/** Masse d'un tirage dont la variante a un défaut mobile ouvert : passe après les autres, sans être exclue */
export const FACTEUR_DEFAUT_MOBILE = 0.25;

// ---------------------------------------------------------------------------------------------------------------
// Notes de CHOIX par appareil (agrégation, synthèse)
// ---------------------------------------------------------------------------------------------------------------

export type NoteAppareil = { cle: string; note: number; appareil?: unknown; page?: string | null };
export type StatAppareil = { n: number; moyenne: number };

/** Moyennes par clé et par appareil (les notes sans appareil comptent « les-deux ») */
export function statsParAppareil(notes: readonly NoteAppareil[]): Map<string, Record<AppareilRetour, StatAppareil>> {
  const m = new Map<string, Record<AppareilRetour, { n: number; somme: number }>>();
  for (const x of notes) {
    if (!Number.isInteger(x.note) || x.note < 1 || x.note > 5) continue;
    const r = m.get(x.cle) ?? { ordinateur: { n: 0, somme: 0 }, mobile: { n: 0, somme: 0 }, 'les-deux': { n: 0, somme: 0 } };
    const a = appareilDe(x.appareil);
    r[a].n++; r[a].somme += x.note;
    m.set(x.cle, r);
  }
  const res = new Map<string, Record<AppareilRetour, StatAppareil>>();
  for (const [k, r] of m) {
    res.set(k, Object.fromEntries(APPAREILS_RETOUR.map((a) => [a, { n: r[a].n, moyenne: r[a].n ? Math.round((r[a].somme / r[a].n) * 100) / 100 : 0 }])) as Record<AppareilRetour, StatAppareil>);
  }
  return res;
}

/** Section « Retours mobile » de SYNTHESE.md : notes de choix données sur mobile, défauts ouverts et à revalider */
export function markdownRetoursMobile(
  notes: readonly NoteAppareil[], retours: readonly RetourMobile[], opts: { titres?: Map<string, string> | Record<string, string>; empreinteActuelle?: (cle: string) => string | null } = {},
): string {
  const titre = (k: string) => (opts.titres instanceof Map ? opts.titres.get(k) : opts.titres?.[k]) ?? k;
  const l = ['## Retours mobile', ''];
  const parApp = statsParAppareil(notes);
  const nMobile = notes.filter((x) => appareilDe(x.appareil) === 'mobile').length;
  const nOrdi = notes.filter((x) => appareilDe(x.appareil) === 'ordinateur').length;
  l.push(`Notes de choix : ${nMobile} données sur le rendu mobile, ${nOrdi} sur l'ordinateur, ${notes.length - nMobile - nOrdi} sur les deux (ou antérieures). Une note mobile pèse ${POIDS_APPAREIL.mobile} dans l'apprentissage (mobile d'abord).`, '');
  const ecarts = [...parApp.entries()].filter(([, r]) => r.mobile.n && r.ordinateur.n && Math.abs(r.mobile.moyenne - r.ordinateur.moyenne) >= 1)
    .sort((a, b) => Math.abs(b[1].mobile.moyenne - b[1].ordinateur.moyenne) - Math.abs(a[1].mobile.moyenne - a[1].ordinateur.moyenne));
  if (ecarts.length) {
    l.push('Écarts ordinateur / mobile (≥ 1 étoile) :');
    for (const [k, r] of ecarts.slice(0, 20)) l.push(`- ${titre(k)} (\`${k}\`) : ordinateur ${r.ordinateur.moyenne}★, mobile ${r.mobile.moyenne}★`);
    l.push('');
  }
  l.push(markdownDefautsMobile(retours, opts));
  return l.join('\n');
}

/** Liste « Rendu mobile à revoir » (SYNTHESE.md) : par élément, étiquettes, remarques et zones ; puis les « Modifié (mobile) » */
export function markdownDefautsMobile(retours: readonly RetourMobile[], opts: { titres?: Map<string, string> | Record<string, string>; empreinteActuelle?: (cle: string) => string | null } = {}): string {
  const titre = (k: string) => (opts.titres instanceof Map ? opts.titres.get(k) : opts.titres?.[k]) ?? k;
  const etats = etatsMobile(retours, opts.empreinteActuelle);
  const ouverts = [...etats.values()].filter((e) => e.ouverts.length).sort((a, b) => b.ouverts.length - a.ouverts.length || (a.cle < b.cle ? -1 : 1));
  const l = ['### Rendu mobile à revoir', ''];
  if (!ouverts.length) { l.push('Aucun défaut d’adaptation mobile ouvert.'); return l.join('\n'); }
  l.push('Le choix est bon, la déclinaison téléphone est à corriger (feuille responsive de la variante) ; ensuite incrémenter VERSIONS_MOBILE (packages/core/src/rendu-mobile.ts) et noter la correction dans retours/CHANGEMENTS.md, zone par zone.', '');
  for (const e of ouverts) {
    l.push(`- **${titre(e.cle)}** (\`${e.cle}\`)${e.ouverts[0].page ? `, page ${e.ouverts[0].page}` : ''}${e.modifie ? ' — **Modifié (mobile)** : à revalider' : ''}`);
    for (const r of e.ouverts) {
      const bits = [r.etiquettes.map(libelleEtiquetteMobile).join(', '), r.note ? `${r.note}★ mobile` : '', r.remarque ? `« ${r.remarque} »` : ''].filter(Boolean);
      l.push(`  - ${r.le ? `${String(r.le).slice(0, 10)} : ` : ''}${bits.join(' · ') || 'à revoir'}`);
      for (const z of lignesZones(r.zones)) l.push(`    - ${z}`);
    }
  }
  return l.join('\n');
}
