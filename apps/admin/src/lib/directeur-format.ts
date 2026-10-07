// Formats lus par le Studio pour le directeur artistique (.claude/agents/directeur-artistique.md) : propositions de recettes
// (retours/recettes-proposees.json) et manques signalés (retours/MANQUES.md). Fonctions pures, sans dépendance serveur.

/**
 * Scénario d'une proposition : même format que les recettes du Studio (simulateur.ts : principaux ordonnés, secondaires, couleurs,
 * soins) ; l'ancien format `{ sujets, couleurs }` reste lu (3 premiers sujets = principaux). `sujets` = principaux puis secondaires.
 */
export type ScenarioPropose = { id: string; libelle: string; sujets: string[]; couleurs: string[]; principaux: string[]; secondaires: string[]; soins: string[] };
export type PropositionClaude = {
  id: string;
  scenario: ScenarioPropose;
  rang: number;
  nom: string;
  /** Composition brute (forme de serialiserComposition) : relue par normaliserComposition avant tout usage */
  composition: unknown;
  score: number | null;
  raisons: string[];
  reserves: string[];
  captures: string[];
  essais: number | null;
};
export type LotPropositions = { profil: string | null; le: string | null; propositions: PropositionClaude[] };
export type ManqueSignale = { id: string; titre: string; priorite: 'haute' | 'moyenne' | 'basse' | null; qui: string | null; lignes: string[] };
export type DecisionDirecteur = 'pas-convaincu' | 'enregistree' | 'a-faire' | 'pas-utile';
export type AvisDirecteur = { nature: 'proposition' | 'manque'; cle: string; decision: DecisionDirecteur; remarque: string | null; le: string | null };

const CLE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
export const estCleDirecteur = (x: unknown): x is string => typeof x === 'string' && CLE.test(x);
const txt = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const liste = (v: unknown, max = 12, long = 400) => (Array.isArray(v) ? v.map((x) => txt(x, long)).filter(Boolean).slice(0, max) : []);
const identifiants = (v: unknown, max = 6) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && /^[a-z0-9-]{2,60}$/.test(x)).slice(0, max) : []);
/** Scénario lu : { principaux, secondaires, couleurs, soins } (format du Studio) ou l'ancien { sujets, couleurs } (3 premiers = principaux) */
function normaliserScenario(s: Record<string, unknown>): { principaux: string[]; secondaires: string[]; couleurs: string[]; soins: string[] } {
  const principaux = Array.isArray(s.principaux) ? identifiants(s.principaux, 3) : identifiants(s.sujets).slice(0, 3);
  const secondaires = (Array.isArray(s.principaux) ? identifiants(s.secondaires) : identifiants(s.sujets).slice(3)).filter((x) => !principaux.includes(x));
  return { principaux, secondaires, couleurs: identifiants(s.couleurs, 3), soins: identifiants(s.soins, 40) };
}

/** retours/recettes-proposees.json → propositions lisibles (entrées invalides ignorées, triées par scénario puis rang) */
export function lirePropositionsClaude(brut: unknown): LotPropositions {
  const o = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>;
  const props = (Array.isArray(o.propositions) ? o.propositions : []).flatMap((p): PropositionClaude[] => {
    if (!p || typeof p !== 'object') return [];
    const x = p as Record<string, any>;
    if (!estCleDirecteur(x.id) || !x.composition || typeof x.composition !== 'object' || !x.scenario || typeof x.scenario !== 'object') return [];
    const s = x.scenario as Record<string, unknown>;
    const sc = normaliserScenario(s);
    const sujets = [...sc.principaux, ...sc.secondaires];
    if (!sujets.length) return [];
    return [{
      id: x.id,
      scenario: { id: estCleDirecteur(s.id) ? s.id : sujets.join('-'), libelle: txt(s.libelle, 120) || sujets.join(', '), sujets, couleurs: sc.couleurs, principaux: sc.principaux, secondaires: sc.secondaires, soins: sc.soins },
      rang: Number.isFinite(x.rang) ? Number(x.rang) : 99,
      nom: txt(x.nom, 120) || x.id,
      composition: x.composition,
      score: typeof x.score === 'number' && x.score >= 1 && x.score <= 5 ? x.score : null,
      raisons: liste(x.raisons),
      reserves: liste(x.reserves),
      captures: liste(x.captures, 12, 120).filter((c) => /^[A-Za-z0-9._-]+\.(png|webp|jpg)$/.test(c)),
      essais: Number.isInteger(x.essais) ? x.essais : null,
    }];
  });
  props.sort((a, b) => (a.scenario.id === b.scenario.id ? a.rang - b.rang : a.scenario.id < b.scenario.id ? -1 : 1));
  return { profil: txt(o.profil, 40) || null, le: txt(o.le, 10) || null, propositions: props };
}

/**
 * retours/MANQUES.md → manques : une entrée par titre « ### M<n> — titre » ; les lignes qui suivent (jusqu'au titre suivant)
 * forment le détail ; « Priorité » et « Qui » sont repérés dans ces lignes (« **Priorité** : haute »).
 */
export function lireManques(md: string): ManqueSignale[] {
  const r: ManqueSignale[] = [];
  let cur: ManqueSignale | null = null;
  for (const brute of md.split(/\r?\n/)) {
    const t = /^###\s+(M\d{1,3})\s*[—–-]\s*(.+)$/.exec(brute.trim());
    if (t) { cur = { id: t[1], titre: t[2].trim().slice(0, 200), priorite: null, qui: null, lignes: [] }; r.push(cur); continue; }
    if (/^#{1,3}\s/.test(brute.trim())) { cur = null; continue; }
    if (!cur) continue;
    const l = brute.trim().replace(/^[-*]\s+/, '');
    if (!l) continue;
    const champ = /^\*\*([^*]+)\*\*\s*:\s*(.+)$/.exec(l);
    if (champ && /priorit/i.test(champ[1])) { const p = champ[2].toLowerCase(); cur.priorite = p.includes('haute') ? 'haute' : p.includes('moyenne') ? 'moyenne' : p.includes('basse') ? 'basse' : null; }
    if (champ && /^qui$/i.test(champ[1].trim())) cur.qui = champ[2].replace(/\*\*/g, '').slice(0, 120);
    cur.lignes.push(l.slice(0, 600));
  }
  return r;
}

/** Dernière décision par clé (la plus récente l'emporte) */
export function dernieresDecisions(avis: readonly AvisDirecteur[], nature: AvisDirecteur['nature']): Record<string, AvisDirecteur> {
  const m: Record<string, AvisDirecteur> = {};
  for (const a of [...avis].filter((x) => x.nature === nature).sort((x, y) => ((x.le ?? '') < (y.le ?? '') ? -1 : 1))) m[a.cle] = a;
  return m;
}
