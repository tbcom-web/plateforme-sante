// TOURNOI EN GRILLES de la chaîne des modèles (retour de Paul du 2026-10-09 : « 160 batailles pour arriver à un seul modèle, c'est
// énorme. On peut arriver plus rapidement à un top 10 sans perdre en qualité ? »).
//
// 1. Format : grilles « tes 2 préférées parmi 6 » (+ « celle qui ne va pas », facultative) entre candidats du même profil. Modèle de
//    choix Plackett-Luce / meilleur-pire décomposé en comparaisons (rank-breaking, comme la Dégustation : n° 1 bat 5, n° 2 bat 4, les
//    3 du milieu battent la pire = 12 comparaisons), agrégé multi-votants (validateur ×2).
// 2. A priori : le classement démarre des signaux déjà là (« J'aime » de la présélection, note prédite par le juge, jauge 4-5 ★),
//    pondérés et plafonnés (APRIORI_TOURNOI) : moyenne a priori de chaque candidat, jamais plus de ±0,6.
// 3. On ne cherche QUE le top 10 : grilles choisies autour de la frontière (candidats dont l'intervalle chevauche le rang 10),
//    élimination rapide (jamais choisi après 3 apparitions), arrêt quand la précision attendue du top 10 (tirages de l'a posteriori)
//    atteint 90 % ; quelques duels A/B pour départager les derniers incertains.
// Simulation « jury synthétique » (simulerJury) : docs/chaine-modeles.md. Module pur, déterministe pour une graine.

import type { MatchBT } from './duels';

export const TOURNOI_GRILLES = {
  /** Propositions par grille */
  taille: 6,
  /** Taille du top recherché */
  top: 10,
  /** Précision attendue du top 10 pour arrêter */
  certitude: 0.9,
  /** Poids d'une comparaison issue d'une grille (les comparaisons d'une même grille sont corrélées : on ne les compte pas pleines) */
  poidsComparaison: 0.6,
  /** Élimination rapide : apparitions sans jamais être choisi (n° 1 ou n° 2) */
  eliminationApparitions: 3,
  /** Plafond de grilles par profil (arrêt forcé) */
  budget: 40,
  /** Départages au plus (2026-10-10 : des duels répétés sans fin bloquaient le tournoi ; au-delà, grilles, plus riches) */
  duelsMax: 8,
  /** Écrans au plus, grilles ET duels (arrêt forcé : le tournoi finit toujours) */
  ecransMax: 48,
  /** Tirages de l'a posteriori pour la certitude */
  tirages: 300,
  /** Écart-type a priori des forces */
  tau: 1,
} as const;

/** A priori (documenté) : chaque signal centré, pondéré, puis la somme plafonnée à ±plafond */
export const APRIORI_TOURNOI = { jaime: 0.25, jaimeMax: 3, juge: 0.2, jauge: 0.2, plafond: 0.6 } as const;

export type SignauxCandidat = { jaime?: number | null; juge?: number | null; jauge?: number | null };

/** Moyenne a priori de la force d'un candidat (0 sans signal) */
export function aPriori(s: SignauxCandidat | null | undefined): number {
  if (!s) return 0;
  let m = 0;
  if (s.jaime != null) m += APRIORI_TOURNOI.jaime * ((Math.min(s.jaime, APRIORI_TOURNOI.jaimeMax) / APRIORI_TOURNOI.jaimeMax) * 2 - 1);
  if (s.juge != null) m += APRIORI_TOURNOI.juge * Math.max(-1, Math.min(1, (s.juge - 3) / 2));
  if (s.jauge != null) m += APRIORI_TOURNOI.jauge * (Math.max(0, Math.min(1, s.jauge)) * 2 - 1);
  return Math.max(-APRIORI_TOURNOI.plafond, Math.min(APRIORI_TOURNOI.plafond, m));
}

/** Une grille répondue (table modeles_grilles, migration 0052) */
export type GrilleTournoi = { profil: string | null; propositions: string[]; meilleures: number[]; pire: number | null; votant: string; poids: number; le: string };
/** Un duel de départage (table modeles_votes) */
export type DuelTournoi = { a: string; b: string; resultat: 'a' | 'b' | 'egalite'; votant: string; poids: number; le: string };

/** Comparaisons d'une grille (gagnant, perdant) : rank-breaking complet du classement partiel */
export function comparaisonsGrille(g: Pick<GrilleTournoi, 'propositions' | 'meilleures' | 'pire'>): [string, string][] {
  const p = g.propositions, l: [string, string][] = [];
  const m = g.meilleures.filter((i) => i >= 0 && i < p.length);
  m.forEach((w, k) => { for (let j = 0; j < p.length; j++) if (j !== w && !m.slice(0, k).includes(j)) l.push([p[w], p[j]]); });
  if (g.pire !== null && g.pire >= 0 && g.pire < p.length && !m.includes(g.pire)) for (let j = 0; j < p.length; j++) if (j !== g.pire && !m.includes(j)) l.push([p[j], p[g.pire]]);
  return l;
}

export function matchsTournoi(grilles: readonly GrilleTournoi[], duels: readonly DuelTournoi[] = []): MatchBT[] {
  return [
    ...grilles.flatMap((g) => comparaisonsGrille(g).map(([a, b]) => ({ a, b, s: 1, w: (g.poids || 1) * TOURNOI_GRILLES.poidsComparaison }))),
    ...duels.map((d) => ({ a: d.a, b: d.b, s: d.resultat === 'a' ? 1 : d.resultat === 'b' ? 0 : 0.5, w: d.poids || 1 })),
  ];
}

export type Force = { theta: number; sigma: number };

/** Bradley-Terry MAP avec a priori N(μ_i, τ²) (Newton coordonnée par coordonnée), σ de Laplace */
export function ajusterAvecApriori(ids: readonly string[], matchs: readonly MatchBT[], mu: (id: string) => number, tau: number = TOURNOI_GRILLES.tau): Map<string, Force> {
  const set = new Set(ids);
  const adj = new Map<string, { o: string; s: number; w: number }[]>(ids.map((i) => [i, []]));
  for (const m of matchs) {
    if (!set.has(m.a) || !set.has(m.b) || m.a === m.b || !(m.w > 0)) continue;
    adj.get(m.a)!.push({ o: m.b, s: m.s, w: m.w });
    adj.get(m.b)!.push({ o: m.a, s: 1 - m.s, w: m.w });
  }
  const th = new Map(ids.map((i) => [i, mu(i)]));
  const sig = (x: number) => 1 / (1 + Math.exp(-x));
  const t2 = tau * tau;
  for (let it = 0; it < 80; it++) {
    let d = 0;
    for (const i of ids) {
      const ti = th.get(i)!;
      let g = -(ti - mu(i)) / t2, h = 1 / t2;
      for (const { o, s, w } of adj.get(i)!) { const p = sig(ti - th.get(o)!); g += w * (s - p); h += w * p * (1 - p); }
      const nv = ti + g / h;
      d = Math.max(d, Math.abs(nv - ti));
      th.set(i, nv);
    }
    if (d < 1e-7) break;
  }
  return new Map(ids.map((i) => {
    let h = 1 / t2;
    for (const { o, w } of adj.get(i)!) { const p = sig(th.get(i)! - th.get(o)!); h += w * p * (1 - p); }
    return [i, { theta: th.get(i)!, sigma: 1 / Math.sqrt(h) }];
  }));
}

function rng(graine: number) {
  let s = graine >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
const phi = (x: number) => 0.5 * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x ** 3)));

export type EtatTournoiGrilles = {
  ouvert: boolean;
  arrete: boolean;
  raison: 'pas-assez-de-candidats' | 'en-cours' | 'sur' | 'budget' | 'peu-de-candidats';
  /** Précision attendue du top 10 (0-1) */
  certitude: number;
  grilles: number;
  duels: number;
  classement: { id: string; theta: number; sigma: number; rang: number; apparitions: number; choisi: number; elimine: boolean; incertitude: number }[];
  top: string[];
  incertains: string[];
  restantes: number;
  texte: string;
};

/**
 * État du tournoi d'un profil. Certitude = précision ATTENDUE du top 10 estimé : moyenne, sur TOURNOI_GRILLES.tirages tirages des
 * forces dans leur a posteriori gaussien (θ̂, σ), de la part du top 10 estimé qui est aussi dans le top 10 tiré. Arrêt quand elle
 * atteint 90 % et que chaque candidat a été montré au moins une fois, ou au budget de 40 grilles.
 */
export function etatTournoiGrilles(candidats: readonly string[], grilles: readonly GrilleTournoi[], duels: readonly DuelTournoi[] = [], signaux: Readonly<Record<string, SignauxCandidat>> = {}, opts: { ouverture?: number; graine?: number } = {}): EtatTournoiGrilles {
  const top = TOURNOI_GRILLES.top;
  const set = new Set(candidats);
  const gs = grilles.filter((g) => g.propositions.every((p) => set.has(p)));
  const ds = duels.filter((d) => set.has(d.a) && set.has(d.b));
  const forces = ajusterAvecApriori(candidats, matchsTournoi(gs, ds), (i) => aPriori(signaux[i]));
  const app = new Map<string, number>(), cho = new Map<string, number>();
  for (const g of gs) { g.propositions.forEach((p) => app.set(p, (app.get(p) ?? 0) + 1)); g.meilleures.forEach((i) => cho.set(g.propositions[i], (cho.get(g.propositions[i]) ?? 0) + 1)); }
  const tri = [...candidats].sort((a, b) => forces.get(b)!.theta - forces.get(a)!.theta || (a < b ? -1 : 1));
  const rang = new Map(tri.map((id, i) => [id, i + 1]));
  const b = tri.length > top ? (forces.get(tri[top - 1])!.theta + forces.get(tri[top])!.theta) / 2 : -Infinity;
  const elimine = (id: string) => (app.get(id) ?? 0) >= TOURNOI_GRILLES.eliminationApparitions && !(cho.get(id) ?? 0) && rang.get(id)! > top;
  const classement = tri.map((id) => {
    const f = forces.get(id)!;
    const inc = elimine(id) ? 0 : phi(-Math.abs(f.theta - b) / Math.max(f.sigma, 1e-6));
    return { id, theta: Math.round(f.theta * 1000) / 1000, sigma: Math.round(f.sigma * 1000) / 1000, rang: rang.get(id)!, apparitions: app.get(id) ?? 0, choisi: cho.get(id) ?? 0, elimine: elimine(id), incertitude: Math.round(inc * 1000) / 1000 };
  });
  const estime = new Set(tri.slice(0, top));
  // Certitude : tirages de l'a posteriori (éliminés : tirés aussi, leur σ les laisse rarement entrer)
  const r = rng(opts.graine ?? 97);
  let somme = 0;
  if (candidats.length > top) {
    for (let k = 0; k < TOURNOI_GRILLES.tirages; k++) {
      const tir = candidats.map((id) => { const f = forces.get(id)!; return { id, v: f.theta + f.sigma * normal(r) }; }).sort((x, y) => y.v - x.v).slice(0, top);
      somme += tir.filter((x) => estime.has(x.id)).length / top;
    }
  }
  const certitude = candidats.length > top ? somme / TOURNOI_GRILLES.tirages : 1;
  const incertains = classement.filter((l) => l.incertitude > 0.1).map((l) => l.id);
  const vusTous = candidats.every((id) => (app.get(id) ?? 0) > 0 || ds.some((d) => d.a === id || d.b === id));
  const restantes = Math.max(certitude >= TOURNOI_GRILLES.certitude && vusTous ? 0 : 1, Math.ceil((2 * incertains.length) / TOURNOI_GRILLES.taille), vusTous ? 0 : Math.ceil(candidats.filter((id) => !app.get(id)).length / TOURNOI_GRILLES.taille));
  const base = { grilles: gs.length, duels: ds.length, classement, top: tri.slice(0, top), incertains, certitude: Math.round(certitude * 1000) / 1000 };
  const ouverture = opts.ouverture ?? 12;
  if (candidats.length < ouverture) return { ...base, ouvert: false, arrete: false, raison: 'pas-assez-de-candidats', restantes: 0, texte: `${candidats.length} / ${ouverture} candidats pour ouvrir le tournoi` };
  if (candidats.length <= top) return { ...base, ouvert: true, arrete: true, raison: 'peu-de-candidats', restantes: 0, texte: 'Tous finalistes' };
  const pct = Math.round(certitude * 100);
  if (certitude >= TOURNOI_GRILLES.certitude && vusTous) return { ...base, ouvert: true, arrete: true, raison: 'sur', restantes: 0, texte: `Top 10 sûr à ${pct} %` };
  if (gs.length >= TOURNOI_GRILLES.budget || gs.length + ds.length >= TOURNOI_GRILLES.ecransMax) return { ...base, ouvert: true, arrete: true, raison: 'budget', restantes: 0, texte: `Arrêté au budget (${gs.length >= TOURNOI_GRILLES.budget ? `${TOURNOI_GRILLES.budget} grilles` : `${TOURNOI_GRILLES.ecransMax} écrans`}) · top 10 sûr à ${pct} %` };
  return { ...base, ouvert: true, arrete: false, raison: 'en-cours', restantes, texte: `Top 10 sûr à ${pct} % · ~${restantes} grille${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}` };
}

export type EcranTournoi = { kind: 'grille'; propositions: string[] } | { kind: 'duel'; a: string; b: string } | null;

/**
 * Prochain écran pour un votant : grille de 6 autour de la frontière du top 10 (incertitude d'abord, puis les moins vus ; jamais un
 * éliminé ; jamais un candidat en cours dans la grille d'un autre votant tant qu'il en reste assez) ; duel de départage quand il ne
 * reste que 2 à 4 incertains (rangs 9-12 typiquement).
 */
export function prochainEcran(e: EtatTournoiGrilles, opts: { reserves?: ReadonlySet<string>; graine?: number } = {}): EcranTournoi {
  if (!e.ouvert || e.arrete) return null;
  const r = rng(opts.graine ?? e.grilles + 1);
  const vivants = e.classement.filter((l) => !l.elimine);
  const libres = vivants.filter((l) => !opts.reserves?.has(l.id));
  const pool = libres.length >= TOURNOI_GRILLES.taille ? libres : vivants;
  const jamaisVus = pool.some((l) => l.apparitions === 0);
  if (!jamaisVus && e.duels < TOURNOI_GRILLES.duelsMax && e.incertains.length >= 2 && e.incertains.length <= 4 && e.certitude >= 0.75) {
    const inc = e.classement.filter((l) => e.incertains.includes(l.id)).sort((a, b) => a.rang - b.rang);
    const dedans = inc.filter((l) => l.rang <= TOURNOI_GRILLES.top), dehors = inc.filter((l) => l.rang > TOURNOI_GRILLES.top);
    const a = dedans.at(-1) ?? inc[0], b = dehors[0] ?? inc[inc.length - 1];
    if (a && b && a.id !== b.id) return r() < 0.5 ? { kind: 'duel', a: a.id, b: b.id } : { kind: 'duel', a: b.id, b: a.id };
  }
  const score = (l: (typeof pool)[number]) => l.incertitude + 0.6 / (1 + l.apparitions) + 0.05 * r();
  const choix = [...pool].sort((x, y) => score(y) - score(x)).slice(0, TOURNOI_GRILLES.taille);
  if (choix.length < 3) return null;
  return { kind: 'grille', propositions: choix.map((l) => l.id).sort(() => r() - 0.5) };
}

// ---------------------------------------------------------------------------------------------------------------
// Jury synthétique (preuve chiffrée, docs/chaine-modeles.md)
// ---------------------------------------------------------------------------------------------------------------

export type ParamsJury = { candidats?: number; votants?: number; bruit?: number; graine: number; ecransMax?: number; signaux?: boolean };

/** Monde simulé : goût caché (forces vraies), goût propre de chaque votant (bruit persistant), signaux a priori bruités */
export function mondeJury(p: ParamsJury) {
  const n = p.candidats ?? 30, r = rng(p.graine * 7919 + 13);
  const ids = Array.from({ length: n }, (_, i) => `m${String(i).padStart(2, '0')}`);
  const vrai = new Map(ids.map((id) => [id, normal(r)]));
  const votants = Array.from({ length: p.votants ?? 2 }, (_, v) => ({ id: v === 0 ? 'paul' : `v${v}`, poids: v === 0 ? 2 : 1, gout: new Map(ids.map((id) => [id, vrai.get(id)! + 0.35 * normal(r)])) }));
  const signaux: Record<string, SignauxCandidat> = {};
  if (p.signaux !== false) for (const id of ids) {
    const t = vrai.get(id)!;
    const jaime = [0, 1, 2].filter(() => r() < 1 / (1 + Math.exp(-(t - 0.3) * 1.2))).length;
    signaux[id] = { jaime, juge: Math.max(1, Math.min(5, 3 + 0.6 * t + 0.8 * normal(r))), jauge: Math.max(0, Math.min(1, 0.6 + 0.12 * t + 0.2 * normal(r))) };
  }
  // Vérité recherchée : le goût AGRÉGÉ du jury (moyenne pondérée des goûts des votants, Paul ×2) — c'est lui que le tournoi doit retrouver
  const total = votants.reduce((x, v) => x + v.poids, 0);
  const jury = new Map(ids.map((id) => [id, votants.reduce((x, v) => x + v.poids * v.gout.get(id)!, 0) / total]));
  const vraiTop = new Set([...ids].sort((a, b) => jury.get(b)! - jury.get(a)!).slice(0, TOURNOI_GRILLES.top));
  return { ids, vrai, votants, signaux, vraiTop, r };
}

/** Choix Plackett-Luce d'un votant dans une grille : 2 préférées puis (une fois sur deux) la pire */
function choisirGrille(gout: Map<string, number>, props: readonly string[], r: () => number, bruit: number) {
  const reste = props.map((_, i) => i);
  const u = props.map((p) => gout.get(p)! * bruit);
  const tire = (l: number[], signe: 1 | -1) => { const w = l.map((i) => Math.exp(signe * u[i])); let x = r() * w.reduce((a, b) => a + b, 0); for (let k = 0; k < l.length; k++) { x -= w[k]; if (x <= 0) return l[k]; } return l[l.length - 1]; };
  const m1 = tire(reste, 1); reste.splice(reste.indexOf(m1), 1);
  const m2 = tire(reste, 1); reste.splice(reste.indexOf(m2), 1);
  const pire = r() < 0.5 ? tire(reste, -1) : null;
  return { meilleures: [m1, m2], pire };
}

export const precisionTop = (estime: readonly string[], vrai: ReadonlySet<string>) => estime.filter((x) => vrai.has(x)).length / TOURNOI_GRILLES.top;

/** Tournoi en grilles simulé : écrans joués jusqu'à l'arrêt (ou `ecransMax`), précision à chaque écran */
export function simulerGrilles(p: ParamsJury) {
  const w = mondeJury(p);
  const grilles: GrilleTournoi[] = [], duels: DuelTournoi[] = [];
  const courbe: number[] = [];
  let e = etatTournoiGrilles(w.ids, grilles, duels, w.signaux, { ouverture: 1 });
  courbe.push(precisionTop(e.top, w.vraiTop));
  for (let k = 0; k < (p.ecransMax ?? 60) && !e.arrete; k++) {
    const v = w.votants[k % w.votants.length];
    const ec = prochainEcran(e, { graine: p.graine * 31 + k });
    if (!ec) break;
    if (ec.kind === 'grille') grilles.push({ profil: 'p', propositions: ec.propositions, ...choisirGrille(v.gout, ec.propositions, w.r, p.bruit ?? 1), votant: v.id, poids: v.poids, le: String(k).padStart(4, '0') });
    else { const pa = 1 / (1 + Math.exp(-(v.gout.get(ec.a)! - v.gout.get(ec.b)!) * (p.bruit ?? 1))); duels.push({ a: ec.a, b: ec.b, resultat: w.r() < pa ? 'a' : 'b', votant: v.id, poids: v.poids, le: String(k).padStart(4, '0') }); }
    e = etatTournoiGrilles(w.ids, grilles, duels, w.signaux, { ouverture: 1 });
    courbe.push(precisionTop(e.top, w.vraiTop));
  }
  return { ecrans: grilles.length + duels.length, grilles: grilles.length, duels: duels.length, clics: grilles.reduce((s, g) => s + 2 + (g.pire !== null ? 1 : 0) + 1, 0) + duels.length, precision: precisionTop(e.top, w.vraiTop), certitude: e.certitude, arrete: e.arrete, courbe };
}
