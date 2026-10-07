// Simulateur de rendu du Studio (demande de Paul du 2026-10-07 : « choisir les paramètres de la même manière qu'un client le
// ferait : spécialités / sous-thèmes / jeux de couleurs choisis, et on RESTE dans ce thème […] un simulateur de rendu dont on garde
// les recettes pour ces paramètres »).
//
// Un SCÉNARIO = les choix d'un client du parcours /creer : sujets principaux ordonnés (1 à 3), sujets secondaires (0 à 3), couleurs
// préférées (0 à 3, aucune = « laissez-nous proposer ») et soins cochés. Il est enregistré AVEC la recette (composition jsonb,
// clé `scenario` : aucune migration) ; une recette plus ancienne en déduit un (scenarioDeRecette : rétrocompatible).
// - ongletsDuScenario : les pages que CE client aurait (navigation construireNavigation) : accueil, une page par sujet principal
//   qui a des soins, la page Soins, la fiche de chacun de SES soins, actualités et un article, le cabinet, l'accès, les questions ;
// - proximiteScenarios : score documenté (ci-dessous) qui place, dans « Votre site » du parcours, les recettes d'un scénario
//   identique ou proche avant les autres (recettesPourScenario, recettes.ts) ; les recettes génériques restent proposées.
// Module pur.

import { construireNavigation, PRINCIPAUX_MAX, SECONDAIRES_MAX, themeParId, THEMES, type Priorites } from './themes';
import { soinsDeBase } from './replis';
import { COULEURS_PREFEREES, couleurPreferee } from './propositions';

export type ScenarioRecette = {
  /** Sujets principaux, dans l'ordre de préférence (le n° 1 ouvre le menu et l'accueil) */
  principaux: string[];
  secondaires: string[];
  /** Couleurs préférées (COULEURS_PREFEREES), dans l'ordre ; [] = « laissez-nous proposer » */
  couleurs: string[];
  /** Soins cochés (slugs du catalogue) ; [] = soins de base des sujets */
  soins: string[];
};
export const scenarioVide = (): ScenarioRecette => ({ principaux: [], secondaires: [], couleurs: [], soins: [] });

const ID = /^[a-z-]{2,30}$/;
const SLUG = /^[a-z0-9-]{2,80}$/;
const ids = (v: unknown, max: number, re = ID) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && re.test(x)))].slice(0, max) : []);
/** Sujets actifs (posture et sujets différés jamais pris en compte) */
const actifs = (l: readonly string[]) => [...new Set(l)].filter((id) => themeParId(id)?.statut === 'actif');

/**
 * Scénario lu (recette, proposition du directeur artistique, formulaire) : forme récente `{ principaux, secondaires, couleurs,
 * soins }` ou ancienne `{ sujets, couleurs }` (3 premiers sujets = principaux, la suite = secondaires). Sujets connus seulement,
 * sans doublon, 3 + 3 au plus ; couleurs de COULEURS_PREFEREES, 3 au plus.
 */
export function normaliserScenario(brut: unknown): ScenarioRecette {
  const o = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>;
  const connus = (l: string[]) => l.filter((id) => themeParId(id));
  let principaux: string[];
  let secondaires: string[];
  if (Array.isArray(o.principaux)) {
    principaux = connus(ids(o.principaux, 6)).slice(0, PRINCIPAUX_MAX);
    secondaires = connus(ids(o.secondaires, 6)).filter((id) => !principaux.includes(id)).slice(0, SECONDAIRES_MAX);
  } else {
    const sujets = connus(ids(o.sujets, 6));
    principaux = sujets.slice(0, PRINCIPAUX_MAX);
    secondaires = sujets.slice(PRINCIPAUX_MAX, PRINCIPAUX_MAX + SECONDAIRES_MAX);
  }
  const couleurs = ids(o.couleurs ?? o.couleursPreferees, 3, /^[a-z-]{2,20}$/).filter((c) => couleurPreferee(c));
  return { principaux, secondaires, couleurs, soins: ids(o.soins, 40, SLUG) };
}

/** Forme stockée (clé `scenario` de la composition jsonb des recettes) */
export const serialiserScenario = (s: ScenarioRecette) => normaliserScenario(s);

/** Sujets du scénario (principaux puis secondaires) : ceux dont viennent les visuels (héros, illustrations, photos, icônes) */
export const sujetsDuScenario = (s: Pick<ScenarioRecette, 'principaux' | 'secondaires'>) => [...s.principaux, ...s.secondaires.filter((x) => !s.principaux.includes(x))];
export const sujetsVisuelsDuScenario = (s: Pick<ScenarioRecette, 'principaux' | 'secondaires'>) => actifs(sujetsDuScenario(s));
export const prioritesDuScenario = (s: Pick<ScenarioRecette, 'principaux' | 'secondaires'>): Priorites => ({ principaux: [...s.principaux], secondaires: [...s.secondaires] });

/**
 * Scénario d'une recette : celui enregistré avec elle, sinon déduit de ses sujets (anciennes recettes : principaux puis
 * secondaires dans le tableau `sujets`) et de ses couleurs ; soins non connus (= soins de base des sujets).
 */
export function scenarioDeRecette(r: { sujets: readonly string[]; couleursPreferees: readonly string[]; scenario?: ScenarioRecette | null }): ScenarioRecette {
  if (r.scenario && (r.scenario.principaux.length || r.scenario.secondaires.length || r.scenario.couleurs.length)) return normaliserScenario(r.scenario);
  return normaliserScenario({ sujets: r.sujets, couleurs: r.couleursPreferees });
}

/** Soins cochés par défaut, issus des sujets (même règle que l'étape « Vos soins » du parcours : soins de base, 3 ou 4) */
export const soinsParDefautScenario = (s: Pick<ScenarioRecette, 'principaux' | 'secondaires'>, soinsConnus: readonly string[]) =>
  soinsDeBase({ priorites: prioritesDuScenario(s) }, soinsConnus);

/** Soins effectifs : cochés, sinon ceux par défaut */
export const soinsDuScenario = (s: ScenarioRecette, soinsConnus: readonly string[]) =>
  (s.soins.length ? s.soins.filter((x) => soinsConnus.includes(x)) : soinsParDefautScenario(s, soinsConnus));

/** Client au hasard : 1 à 3 sujets principaux, 0 à 2 secondaires (sujets actifs), 0 à 3 couleurs, soins de base cochés */
export function scenarioAuHasard(r: () => number, soinsConnus: readonly string[] = []): ScenarioRecette {
  const melange = <T,>(l: readonly T[]) => l.map((x) => [r(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const t = melange(THEMES.filter((x) => x.statut === 'actif').map((x) => x.id));
  const np = 1 + Math.floor(r() * 3);
  const ns = Math.floor(r() * 3);
  const nc = Math.floor(r() * 4);
  const s: ScenarioRecette = { principaux: t.slice(0, np), secondaires: t.slice(np, np + ns), couleurs: melange(COULEURS_PREFEREES.map((c) => c.id)).slice(0, nc), soins: [] };
  return { ...s, soins: soinsConnus.length ? soinsParDefautScenario(s, soinsConnus) : [] };
}

/** « 1. Sport · 2. Enfants · aussi : Ongles · Bleu, Vert » */
export function libelleScenario(s: ScenarioRecette): string {
  const sujets = s.principaux.map((id, i) => `${i + 1}. ${themeParId(id)?.court ?? id}`);
  const aussi = s.secondaires.length ? [`aussi : ${s.secondaires.map((id) => themeParId(id)?.court ?? id).join(', ')}`] : [];
  const couleurs = s.couleurs.length ? s.couleurs.map((c) => couleurPreferee(c)?.nom ?? c).join(', ') : 'couleurs proposées';
  return [...(sujets.length ? sujets : ['Sans sujet']), ...aussi, couleurs].join(' · ');
}

// ---------------------------------------------------------------------------------------------------------------
// Pages du client (onglets du simulateur)
// ---------------------------------------------------------------------------------------------------------------

/** Type de page du studio (PAGES_STRUCTURE de recettes.ts) — repris ici sans import circulaire */
export type PageSimulee = 'accueil' | 'theme' | 'soins' | 'fiche' | 'actualites' | 'article' | 'cabinet' | 'acces' | 'questions';
export type OngletSimulateur = { id: string; page: PageSimulee; nom: string; sujet?: string; soin?: string };

/**
 * Pages qu'aurait CE client, dans l'ordre de son site : accueil, une page par sujet principal qui a au moins un soin coché (ordre de
 * préférence, construireNavigation), la page Soins, la fiche de chacun de ses soins (ordre de la page Soins : groupés par sujet),
 * actualités et un article, le cabinet, l'accès (Infos pratiques), les questions.
 */
export function ongletsDuScenario(s: ScenarioRecette, catalogue: readonly { slug: string; titre_court?: string | null }[], opts: { themesActives?: readonly string[] } = {}): OngletSimulateur[] {
  const connus = catalogue.map((c) => c.slug);
  const soins = soinsDuScenario(s, connus);
  const nav = construireNavigation({ priorites: prioritesDuScenario(s) }, soins.map((slug) => ({ slug })), { actualites: true, themesActives: opts.themesActives });
  const titre = (slug: string) => catalogue.find((c) => c.slug === slug)?.titre_court || slug;
  return [
    { id: 'accueil', page: 'accueil', nom: 'Accueil' },
    ...nav.principaux.map((t): OngletSimulateur => ({ id: `theme:${t.theme.id}`, page: 'theme', nom: t.theme.court, sujet: t.theme.id })),
    { id: 'soins', page: 'soins', nom: 'Soins' },
    ...nav.groupesSoins.flatMap((g) => g.soins).map((slug): OngletSimulateur => ({ id: `fiche:${slug}`, page: 'fiche', nom: titre(slug), soin: slug })),
    { id: 'actualites', page: 'actualites', nom: 'Actualités' },
    { id: 'article', page: 'article', nom: 'Article' },
    { id: 'cabinet', page: 'cabinet', nom: 'Le cabinet' },
    { id: 'acces', page: 'acces', nom: 'Infos pratiques' },
    { id: 'questions', page: 'questions', nom: 'Questions' },
  ];
}

/**
 * Brouillon montré pour un onglet : page sujet → ce sujet (l'aperçu montre la page du sujet du héros) ; fiche → ce soin en premier
 * (l'aperçu montre la fiche du premier soin). Rien d'autre ne change.
 */
export function draftPourOnglet<D extends { soins: string[]; theme: { herosSujet?: string; soinsEnAvant?: string[] } }>(d: D, o: OngletSimulateur | null | undefined): D {
  if (!o) return d;
  if (o.sujet) return { ...d, theme: { ...d.theme, herosSujet: o.sujet } };
  if (o.soin) {
    const soins = d.soins.includes(o.soin) ? d.soins : [o.soin, ...d.soins];
    return { ...d, soins, theme: { ...d.theme, soinsEnAvant: [o.soin, ...(d.theme.soinsEnAvant ?? []).filter((x) => x !== o.soin)] } };
  }
  return d;
}

// ---------------------------------------------------------------------------------------------------------------
// Proximité de deux scénarios
// ---------------------------------------------------------------------------------------------------------------

/**
 * Couleurs voisines : même couleur, ou deux couleurs qui conduisent à une même gamme (COULEURS_PREFEREES.gammes : bleu et bleu
 * nuit → Cobalt, Ardoise ; turquoise et vert → Canard, Sauge…).
 */
export function couleursVoisines(a: string, b: string): boolean {
  if (a === b) return true;
  const ga = couleurPreferee(a)?.gammes.map(([g]) => g) ?? [];
  const gb = couleurPreferee(b)?.gammes.map(([g]) => g) ?? [];
  return ga.some((g) => gb.includes(g));
}

/** Poids de la proximité (somme = 1) */
export const POIDS_PROXIMITE = { sujetUn: 0.4, sujets: 0.3, couleurs: 0.2, ordre: 0.1 } as const;
/** Seuil « proche » (avec le même sujet n° 1) */
export const SEUIL_PROCHE = 0.6;

/**
 * Proximité de deux scénarios, de 0 à 1 (soins ignorés : ils suivent les sujets) :
 *   sujet n° 1 (0,4)  : identique → 0,4 ; le n° 1 de l'un parmi les principaux de l'autre → 0,15 ; sinon 0 ;
 *   sujets (0,3)      : recouvrement pondéré (principal 2, secondaire 1) : Σ min / Σ max sur l'union ;
 *   couleurs (0,2)    : aucune des deux → 0,2 ; sinon chaque couleur de l'un compte 1 si l'autre l'a, ½ si l'autre en a une
 *                       voisine (couleursVoisines), rapporté au plus grand des deux nombres de couleurs ; une seule des deux
 *                       sans couleur (« laissez-nous proposer ») → 0,05 ;
 *   ordre (0,1)       : mêmes principaux dans le même ordre → 0,1 ; mêmes principaux dans un autre ordre → 0,05.
 * Deux scénarios identiques valent 1.
 */
export function proximiteScenarios(a: ScenarioRecette, b: ScenarioRecette): number {
  const P = POIDS_PROXIMITE;
  const [a1, b1] = [a.principaux[0], b.principaux[0]];
  const un = a1 && a1 === b1 ? P.sujetUn : (a1 && b.principaux.includes(a1)) || (b1 && a.principaux.includes(b1)) ? 0.15 : 0;
  const poids = (s: ScenarioRecette, id: string) => (s.principaux.includes(id) ? 2 : s.secondaires.includes(id) ? 1 : 0);
  const union = [...new Set([...sujetsDuScenario(a), ...sujetsDuScenario(b)])];
  const max = union.reduce((t, id) => t + Math.max(poids(a, id), poids(b, id)), 0);
  const sujets = max ? (P.sujets * union.reduce((t, id) => t + Math.min(poids(a, id), poids(b, id)), 0)) / max : P.sujets;
  let couleurs: number;
  if (!a.couleurs.length && !b.couleurs.length) couleurs = P.couleurs;
  else if (!a.couleurs.length || !b.couleurs.length) couleurs = 0.05;
  else {
    const [p, g] = a.couleurs.length <= b.couleurs.length ? [a.couleurs, b.couleurs] : [b.couleurs, a.couleurs];
    const pts = p.reduce((t, c) => t + (g.includes(c) ? 1 : g.some((x) => couleursVoisines(c, x)) ? 0.5 : 0), 0);
    couleurs = (P.couleurs * pts) / g.length;
  }
  const memes = a.principaux.length === b.principaux.length && a.principaux.every((x) => b.principaux.includes(x));
  const ordre = memes && a.principaux.every((x, i) => b.principaux[i] === x) ? P.ordre : memes ? 0.05 : 0;
  return Math.round((un + sujets + couleurs + ordre) * 1000) / 1000;
}

export type NiveauProximite = 'identique' | 'proche' | 'meme-sujet' | 'generique' | 'autre';

/**
 * Niveau d'une recette pour le scénario d'un client : `identique` (mêmes principaux dans le même ordre, mêmes secondaires, mêmes
 * couleurs), `proche` (même sujet n° 1 et proximité ≥ SEUIL_PROCHE), `meme-sujet` (la recette vise le sujet n° 1 du client),
 * `generique` (recette sans sujet), `autre`.
 */
export function niveauProximite(client: ScenarioRecette, recette: ScenarioRecette): NiveauProximite {
  if (!recette.principaux.length && !recette.secondaires.length) return 'generique';
  const egal = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v) => y.includes(v));
  if (client.principaux.length && client.principaux.join() === recette.principaux.join() && egal(client.secondaires, recette.secondaires) && egal(client.couleurs, recette.couleurs)) return 'identique';
  const c1 = client.principaux[0];
  if (c1 && recette.principaux[0] === c1 && proximiteScenarios(client, recette) >= SEUIL_PROCHE) return 'proche';
  if (c1 && sujetsDuScenario(recette).includes(c1)) return 'meme-sujet';
  return 'autre';
}
export const RANG_PROXIMITE: Record<NiveauProximite, number> = { identique: 0, proche: 1, 'meme-sujet': 2, generique: 3, autre: 4 };
