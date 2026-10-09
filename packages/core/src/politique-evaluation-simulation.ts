// PREUVE CHIFFRÉE de la politique d'évaluation (politique-evaluation.ts) : simulation « Paul synthétique » sur des écrans MÉLANGÉS
// de toutes les surfaces (tuiles, duels, Dégustation, présélection, recettes complètes, Arrivages, kits). Documentation et chiffres :
// docs/politique-evaluation.md (« Simulation »).
//
// MONDE : ~520 éléments (photos en séries, illustrations de base × variantes, gammes, polices, détails, éléments, modèles de la chaîne)
// avec une qualité VRAIE q ∈ [1 ; 5] que seul Paul synthétique connaît ; défauts qu'il n'aime pas (densité forte −1,1 ★, couleur
// saturée −1 ★, visage −1,4 ★) ; note prédite (juge) pour 60 % des éléments (q + bruit σ 0,7) ; 10 % déjà notés une fois ; 60
// nouveautés arrivent par paquets de 6 tous les 20 écrans.
// PAUL : note = arrondi(q + bruit σ 0,55) ; grille = Plackett-Luce (θ = 1,3 q), « celle qui ne va pas » 60 % du temps ; duel
// P(a) = σ(1,4 (qa − qb)) ; Arrivages : accepte si q + bruit ≥ 2,6 ; quand il juge mal, il donne la raison (étiquette 75 %, mots 40 %).
// AVANT : chaque surface avec SA logique et SA mémoire (code réel quand il existe : prochaineCarte des tuiles avec mémoire de session
// remise à zéro toutes les 20 cartes, genererPaireElements des duels, genererGrille + interetElement de la Dégustation ; sinon
// approximations documentées : présélection sans mémoire des pages vues, recettes « Favoris d'abord », Arrivages dans l'ordre
// d'arrivée, kits = meilleures photos du sujet).
// APRÈS : la politique unique (mémoire commune, délai de retour en écrans, implicites, file prioritaire, groupes visuels, règles
// apprises recalculées tous les 10 écrans).
// MESURES : taux de répétition (fenêtre 50 écrans, groupes visuels, éléments à juger seulement : les favoris de contexte ne comptent
// pas), qualité vraie moyenne des éléments présentés, part de jamais-notés, précision du classement (concordance par paires et
// précision du top 20 % entre l'estimation tirée des retours et la vérité) à 50, 100 et 200 écrans. Pur, déterministe par graine.

import { etatsNotes, prochaineCarte } from './retours';
import { genererPaireElements, groupeEtVariante, type Duel } from './duels';
import { genererGrille, interetElement } from './degustation';
import { tranchesDepuisSignaux } from './tranches';
import {
  choisirEcran, dimensionsFraiches, fileEvaluation, implicitesNegatifs, indicateursPolitique, memoireExpositions, enDelai,
  type CandidatPolitique, type Exposition, type ReglagesPolitique, type ResultatExposition, type SurfaceEvaluation,
} from './politique-evaluation';
import { apprendreRegles, effetRegles, signauxDepuisRetours, type AttributsElement, type RegleApprise } from './regles-apprises';

type TypeSim = 'photo' | 'illustration' | 'gamme' | 'police' | 'details' | 'composant' | 'modele';
type El = { cle: string; type: TypeSim; q: number; pred: number | null; dense: boolean; sature: boolean; visage: boolean; arrivee: number | null };

export type ParamsSimulation = { graine: number; ecrans?: number; mode: 'avant' | 'apres'; reglages?: Partial<ReglagesPolitique> };
export type PointApprentissage = { ecrans: number; concordance: number; precisionTop: number };
export type ResultatSimulation = {
  mode: 'avant' | 'apres'; ecrans: number; tauxRepetition: number; qualiteMoyenne: number; partJamaisNotes: number; partMauvais: number;
  apprentissage: PointApprentissage[]; regles: string[]; implicites: number; parSurface: Record<string, { ecrans: number; repetition: number }>;
};

function rng(graine: number) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
const borne = (x: number) => Math.max(1, Math.min(5, x));
const sigm = (x: number) => 1 / (1 + Math.exp(-x));

/** Monde déterministe (même graine → mêmes éléments pour les deux modes) */
export function mondeSimulation(graine: number): El[] {
  const r = rng(graine * 7 + 1);
  const l: El[] = [];
  const ajouter = (cle: string, type: TypeSim, q0?: number) => {
    const dense = ['details', 'composant', 'police'].includes(type) && r() < 0.25;
    const sature = (type === 'gamme' || type === 'photo') && r() < 0.3;
    const visage = type === 'photo' && r() < 0.15;
    const q = borne((q0 ?? 3.1 + 0.8 * gauss(r)) - (dense ? 1.1 : 0) - (sature ? 1 : 0) - (visage ? 1.4 : 0));
    l.push({ cle, type, q, pred: r() < 0.6 ? borne(Math.round((q + 0.7 * gauss(r)) * 2) / 2) : null, dense, sature, visage, arrivee: null });
  };
  for (let s = 0; l.length < 160; s++) { const n = 1 + Math.floor(r() * 3); for (let i = 1; i <= n && l.length < 160; i++) ajouter(`photo:sim/s${s}x-${i}`, 'photo'); }
  for (let b = 0; b < 60; b++) { const q0 = 3.1 + 0.8 * gauss(r); for (const reg of ['pedagogique', 'riso', 'trait']) ajouter(`dessin:sim${b}:${reg}`, 'illustration', q0 + 0.3 * gauss(r)); }
  for (let i = 0; i < 24; i++) ajouter(`gamme:sim${i}`, 'gamme');
  for (let i = 0; i < 20; i++) ajouter(`typo:police:sim${i}`, 'police');
  for (let i = 0; i < 40; i++) ajouter(`details:jeu:sim${i}`, 'details');
  for (let i = 0; i < 60; i++) ajouter(`composant:soins:sim${i}`, 'composant');
  for (let i = 0; i < 200; i++) ajouter(`modele-chaine:sim${i}`, 'modele');
  // 60 nouveautés (hors modèles) arrivent par 6 tous les 20 écrans
  const nouv = l.filter((e) => e.type !== 'modele').map((e) => ({ e, k: r() })).sort((a, b) => a.k - b.k).slice(0, 60);
  nouv.forEach((x, i) => { x.e.arrivee = 20 * Math.floor(i / 6); });
  return l;
}

const attributsSim = (el: El | undefined): AttributsElement => ({
  profil: el ? { d: el.dense ? 0.6 : 0, e: el.sature ? 0.8 : 0 } : null,
  saturation: el && (el.type === 'gamme' || el.type === 'photo') ? (el.sature ? 0.8 : 0.35) : null,
  alertes: el?.visage ? ['visage-reconnaissable'] : [],
});

const RAISON = (el: El) => (el.visage ? { e: 'photo-visage', t: 'on voit son visage' } : el.sature ? { e: 'couleur-criarde', t: 'couleur criarde' } : el.dense ? { e: 'trop-charge', t: 'trop chargé' } : { e: 'hors-sujet', t: 'bof' });
const SURFACES: readonly [SurfaceEvaluation, number][] = [['tuiles', 0.3], ['duels', 0.2], ['degustation', 0.15], ['preselection', 0.1], ['recettes', 0.1], ['arrivages', 0.1], ['kits', 0.05]];

export function simulerPolitique(p: ParamsSimulation): ResultatSimulation {
  const N = p.ecrans ?? 200;
  const monde = mondeSimulation(p.graine);
  const parCle = new Map(monde.map((e) => [e.cle, e]));
  const rS = rng(p.graine * 13 + 5), rP = rng(p.graine * 31 + 7), rC = rng(p.graine * 53 + 11 + (p.mode === 'apres' ? 1 : 0));
  const reg: Partial<ReglagesPolitique> = { delaiJours: 0, ...(p.reglages ?? {}) };
  const notes: { cle: string; note: number; le: string }[] = [];
  const expos: Exposition[] = [];
  const duels: Duel[] = [];
  const acceptees = new Set<string>(), refuseesArr = new Set<string>(), jaime = new Set<string>();
  const t0 = Date.parse('2026-10-01T08:00:00Z');
  const le = (i: number) => new Date(t0 + i * 60000).toISOString();
  // 10 % déjà notés une fois (sessions précédentes)
  for (const e of monde) if (e.arrivee === null && rS() < 0.1) notes.push({ cle: e.cle, note: borne(Math.round(e.q + 0.55 * gauss(rP))), le: le(-1000) });
  const noter = (e: El) => borne(Math.round(e.q + 0.55 * gauss(rP)));
  const raisonSi = (e: El, p0: number) => (rP() < p0 ? RAISON(e) : null);
  const evaluees: number[] = [];
  let mauvais = 0;
  const dispo = (i: number, e: El) => (e.arrivee === null || (e.arrivee <= i && acceptees.has(e.cle))) && !refuseesArr.has(e.cle);
  const enAttente = (i: number) => monde.filter((e) => e.arrivee !== null && e.arrivee <= i && !acceptees.has(e.cle) && !refuseesArr.has(e.cle));
  const stats = () => {
    const m = new Map<string, number[]>();
    for (const n of notes) m.set(n.cle, [...(m.get(n.cle) ?? []), n.note]);
    return m;
  };
  let regles: RegleApprise[] = [];
  const vusSession = new Set<string>();
  let tuilesSession = 0;
  const apprentissage: PointApprentissage[] = [];
  const parSurface: Record<string, { ecrans: number; rep: number }> = {};

  const estimation = () => {
    const sig = new Map<string, number[]>();
    const V: Partial<Record<ResultatExposition, number>> = { choisi: 4.5, 'pas-choisi': 2.5, pire: 1.5, ignore: 2.75, accepte: 3.5, refuse: 1.5 };
    for (const n of notes) sig.set(n.cle, [...(sig.get(n.cle) ?? []), n.note]);
    for (const x of expos) if (x.resultat !== 'note' && V[x.resultat] !== undefined) sig.set(x.cle, [...(sig.get(x.cle) ?? []), V[x.resultat]!]);
    // Classement du SYSTÈME : retours de Paul + a priori (note prédite, et, après, les règles apprises appliquées aux jamais vus)
    const appris = (e: El) => (p.mode === 'apres' ? effetRegles(e.cle, regles, (x) => attributsSim(parCle.get(x))).effet : 0);
    return (e: El) => { const s = sig.get(e.cle) ?? []; const prior = (e.pred ?? 3) + appris(e); return (s.reduce((a, b) => a + b, 0) + 2 * prior) / (s.length + 2); };
  };
  const mesurer = (i: number) => {
    const est = estimation();
    const r = rng(p.graine * 97 + i);
    let ok = 0, tot = 0;
    for (let k = 0; k < 4000; k++) {
      const a = monde[Math.floor(r() * monde.length)], b = monde[Math.floor(r() * monde.length)];
      if (Math.abs(a.q - b.q) < 0.25) continue;
      tot++;
      if ((est(a) - est(b)) * (a.q - b.q) > 0) ok++;
    }
    const k = Math.round(monde.length * 0.2);
    const vrai = new Set([...monde].sort((a, b) => b.q - a.q).slice(0, k).map((e) => e.cle));
    const estTop = [...monde].sort((a, b) => est(b) - est(a)).slice(0, k);
    apprentissage.push({ ecrans: i, concordance: Math.round((1000 * ok) / Math.max(1, tot)) / 1000, precisionTop: Math.round((1000 * estTop.filter((e) => vrai.has(e.cle)).length) / k) / 1000 });
  };

  for (let i = 0; i < N; i++) {
    if (i === 50 || i === 100) mesurer(i);
    let v = rS(); let surface: SurfaceEvaluation = 'tuiles';
    for (const [s, w] of SURFACES) { if (v < w) { surface = s; break; } v -= w; }
    if (surface === 'arrivages' && !enAttente(i).length) surface = 'tuiles';
    const ecran = `sim:${i}`;
    const st = stats();
    const tr = tranchesDepuisSignaux(notes);
    const moy = (k: string) => { const l = st.get(k); return l ? l.reduce((a, b) => a + b, 0) / l.length : null; };
    const favori = (k: string) => (moy(k) ?? 0) >= 4;
    // Contexte de la politique (après seulement)
    const memoire = memoireExpositions(expos);
    const implicites = new Set(implicitesNegatifs(memoire, { reglages: reg }).map((x) => x.cle));
    if (p.mode === 'apres' && i % 10 === 0) {
      const sig = signauxDepuisRetours({ notes: notes.map((n) => { const x = expos.find((y) => y.cle === n.cle && y.le === n.le); return { ...n, etiquettes: x?.etiquettes ?? null, texte: x?.texte ?? null }; }), expositions: expos });
      regles = apprendreRegles(sig, (k) => attributsSim(parCle.get(k)));
    }
    const effetR = (k: string) => (p.mode === 'apres' ? effetRegles(k, regles, (x) => attributsSim(parCle.get(x))) : { effet: 0, ecarte: false, raisons: [] });
    const candidat = (e: El): CandidatPolitique => {
      const l = st.get(e.cle);
      return { cle: e.cle, note: l ? l.reduce((a, b) => a + b, 0) / l.length : null, n: l?.length ?? 0, ecart: l ? Math.max(...l) - Math.min(...l) : 0, tranche: tr.refuses.has(e.cle) || tr.favoris.has(e.cle), potentiel: e.pred, nouveauteAcceptee: acceptees.has(e.cle) && !l };
    };
    const ctx = { memoire, implicites, regles: (k: string) => effetR(k), reglages: reg };
    const fileDe = (els: El[]) => fileEvaluation(els.map((e) => ({ ...candidat(e), e })), ctx);
    const choisirApres = (els: El[], n: number) => choisirEcran(fileDe(els), n, { parmi: 3, aleatoire: rC }).choix.map((x) => parCle.get(x.x.cle)!);
    const tirerType = (types: TypeSim[], n: number) => {
      const l = p.mode === 'apres' ? dimensionsFraiches(types, (t) => monde.filter((e) => e.type === t && dispo(i, e)).map(candidat), n, ctx) : types;
      return l[Math.floor(rC() * l.length)];
    };
    const NTYPE = surface === 'duels' ? 2 : surface === 'tuiles' ? 1 : 6;
    const montres: { e: El; resultat: ResultatExposition; note?: number; raison?: { e: string; t: string } | null }[] = [];
    const extra: string[] = [];

    if (surface === 'tuiles') {
      const types: TypeSim[] = ['photo', 'illustration', 'gamme', 'police', 'details', 'composant'];
      const t = tirerType(types, NTYPE);
      const pool = monde.filter((e) => e.type === t && dispo(i, e));
      let e: El | undefined;
      if (p.mode === 'avant') {
        if (tuilesSession++ % 20 === 0) vusSession.clear();
        const c = prochaineCarte(pool.map((x) => ({ cle: x.cle })), etatsNotes(notes), vusSession, rC);
        e = c ? parCle.get(c.cle) : undefined;
      } else e = choisirApres(pool, 1)[0];
      if (e) { vusSession.add(e.cle); const n = noter(e); montres.push({ e, resultat: 'note', note: n, raison: n <= 2 ? raisonSi(e, 0.75) : null }); }
    } else if (surface === 'duels') {
      const types: TypeSim[] = ['photo', 'illustration', 'gamme', 'police', 'details', 'composant'];
      const t = tirerType(types, NTYPE);
      const pool = monde.filter((e) => e.type === t && dispo(i, e) && !tr.refuses.has(e.cle) && !tr.favoris.has(e.cle));
      let paire: El[] = [];
      if (p.mode === 'avant') {
        if (t === 'photo' || t === 'illustration') {
          const pp = genererPaireElements(t, pool.map((e) => ({ cle: e.cle, sujets: ['sim'], ...groupeEtVariante(e.cle) })), duels, { graine: Math.floor(rC() * 1e9) });
          if (pp) paire = [parCle.get(pp.a.cle)!, parCle.get(pp.b.cle)!];
        } else {
          const joues = new Set(duels.map((d) => [d.aCle, d.bCle].sort().join('|')));
          for (let k = 0; k < 30 && !paire.length; k++) { const a = pool[Math.floor(rC() * pool.length)], b = pool[Math.floor(rC() * pool.length)]; if (a && b && a !== b && !joues.has([a.cle, b.cle].sort().join('|'))) paire = [a, b]; }
        }
      } else paire = choisirApres(pool, 2);
      if (paire.length === 2) {
        const [a, b] = paire;
        const mauvaisDuel = a.q < 2.2 && b.q < 2.2 && rP() < 0.6;
        const gagneA = rP() < sigm(1.4 * (a.q - b.q));
        const res = mauvaisDuel ? 'mauvais' : gagneA ? 'a' : 'b';
        duels.push({ type: t === 'photo' ? 'photo' : 'illustration', scenario: { sujets: ['sim'] }, aCle: a.cle, bCle: b.cle, aIngredients: {}, bIngredients: {}, dimension: null, resultat: res, le: le(i) });
        montres.push({ e: a, resultat: mauvaisDuel ? 'pire' : gagneA ? 'choisi' : 'pas-choisi', raison: mauvaisDuel || !gagneA ? raisonSi(a, 0.3) : null });
        montres.push({ e: b, resultat: mauvaisDuel ? 'pire' : gagneA ? 'pas-choisi' : 'choisi', raison: mauvaisDuel || gagneA ? raisonSi(b, 0.3) : null });
      }
    } else if (surface === 'degustation' || surface === 'preselection') {
      const types: TypeSim[] = surface === 'preselection' ? ['modele'] : ['gamme', 'police', 'details', 'composant', 'illustration'];
      const t = tirerType(types, NTYPE);
      const pool = monde.filter((e) => e.type === t && dispo(i, e) && !(surface === 'preselection' && jaime.has(e.cle)));
      let grille: El[] = [];
      if (p.mode === 'avant') {
        if (surface === 'preselection') {
          const ouverts = pool.filter((e) => !tr.refuses.has(e.cle));
          grille = ouverts.map((e) => ({ e, k: rC() })).sort((a, b) => a.k - b.k).slice(0, 6).map((x) => x.e);
        } else {
          const notesM: Record<string, { m: number; n: number }> = {};
          for (const [k, l] of st) notesM[k] = { m: l.reduce((a, b) => a + b, 0) / l.length, n: l.length };
          const g = genererGrille<string>({ base: 'base:sim', dimension: t, graine: Math.floor(rC() * 1e9), varier: (_x, _d, gg) => pool[gg % Math.max(1, pool.length)]?.cle ?? 'base:sim', elements: (x) => [x], cle: (x) => x, tranches: tr, interet: (k) => interetElement(k, { notes: notesM }) });
          grille = (g?.propositions ?? []).map((x) => parCle.get(x.nouveau)!).filter(Boolean);
        }
      } else grille = choisirApres(pool, 6);
      if (grille.length >= 3) {
        const restants = [...grille];
        const pick = () => { const w = restants.map((e) => Math.exp(1.3 * e.q)); let x = rP() * w.reduce((a, b) => a + b, 0); let k = 0; for (; k < w.length - 1; k++) { x -= w[k]; if (x < 0) break; } return restants.splice(k, 1)[0]; };
        const meilleures = [pick(), pick()];
        let pire: El | null = null;
        if (rP() < 0.6 && restants.length) { const w = restants.map((e) => Math.exp(-1.3 * e.q)); let x = rP() * w.reduce((a, b) => a + b, 0); let k = 0; for (; k < w.length - 1; k++) { x -= w[k]; if (x < 0) break; } pire = restants[k]; }
        for (const e of grille) {
          const res: ResultatExposition = meilleures.includes(e) ? 'choisi' : e === pire ? 'pire' : 'pas-choisi';
          montres.push({ e, resultat: res, raison: res === 'pire' ? raisonSi(e, 0.5) : null });
          if (surface === 'preselection' && res === 'choisi') jaime.add(e.cle);
        }
      }
    } else if (surface === 'recettes') {
      const dims: TypeSim[] = ['gamme', 'police', 'composant'];
      const tirees: El[] = [];
      if (p.mode === 'avant') {
        for (const t of dims) {
          const pool = monde.filter((e) => e.type === t && dispo(i, e) && !tr.refuses.has(e.cle) && (moy(e.cle) ?? 3) > 2);
          const w = pool.map((e) => { const m = moy(e.cle); return m === null ? 0.15 : 2 ** (3 * Math.max(-3, Math.min(2, m - 3))); });
          let x = rC() * w.reduce((a, b) => a + b, 0); let k = 0; for (; k < w.length - 1; k++) { x -= w[k]; if (x < 0) break; }
          if (pool[k]) tirees.push(pool[k]);
        }
      } else {
        // Un seul nouveau à la fois : base de favoris, un élément à juger tiré de la file
        const nouveau = choisirApres(monde.filter((e) => dims.includes(e.type) && dispo(i, e)), 1)[0];
        for (const t of dims) {
          if (nouveau?.type === t) { tirees.push(nouveau); continue; }
          const fav = monde.filter((e) => e.type === t && favori(e.cle) && dispo(i, e));
          const pool = fav.length ? fav : monde.filter((e) => e.type === t && dispo(i, e) && !implicites.has(e.cle) && !tr.refuses.has(e.cle));
          if (pool.length) tirees.push(pool[Math.floor(rC() * pool.length)]);
        }
      }
      const n = borne(Math.round(tirees.reduce((a, e) => a + e.q, 0) / Math.max(1, tirees.length) + 0.5 * gauss(rP)));
      const pire = [...tirees].sort((a, b) => a.q - b.q)[0];
      for (const e of tirees) if (!favori(e.cle)) montres.push({ e, resultat: 'note', note: n, raison: n <= 2 && e === pire ? raisonSi(e, 0.6) : null });
      extra.push(`compo:${tirees.map((e) => e.cle).sort().join('+')}`);
    } else if (surface === 'arrivages') {
      const att = enAttente(i);
      let e: El | undefined;
      if (p.mode === 'avant') e = att[0];
      else {
        const l = [...att].sort((a, b) => (b.pred ?? 3) - (a.pred ?? 3));
        e = l.find((x) => !enDelai(x.cle, memoire, { reglages: reg })) ?? l[0];
      }
      if (e) {
        const ok = e.q + 0.5 * gauss(rP) >= 2.6 && !effetR(e.cle).ecarte;
        (ok ? acceptees : refuseesArr).add(e.cle);
        montres.push({ e, resultat: ok ? 'accepte' : 'refuse', raison: ok ? null : raisonSi(e, 0.8) });
      }
    } else if (surface === 'kits') {
      const pool = monde.filter((e) => e.type === 'photo' && dispo(i, e) && !tr.refuses.has(e.cle) && (moy(e.cle) ?? 3) > 2);
      let kit: El[];
      if (p.mode === 'avant') kit = [...pool].sort((a, b) => (moy(b.cle) ?? 3.2) - (moy(a.cle) ?? 3.2) || (a.cle < b.cle ? -1 : 1)).slice(0, 4);
      else { const fav = pool.filter((e) => favori(e.cle)).slice(0, 2); kit = [...fav, ...choisirApres(pool.filter((e) => !favori(e.cle)), 4 - fav.length)]; }
      const n = borne(Math.round(kit.reduce((a, e) => a + e.q, 0) / Math.max(1, kit.length) + 0.5 * gauss(rP)));
      for (const e of kit) if (!favori(e.cle)) montres.push({ e, resultat: 'note', note: n });
    }

    // Journal commun de la simulation (mêmes règles de comptage pour les deux modes)
    if (!montres.length) continue;
    for (const m of montres) {
      if (m.resultat === 'note' && typeof m.note === 'number') notes.push({ cle: m.e.cle, note: m.note, le: le(i) });
      expos.push({ cle: m.e.cle, surface, ecran, le: le(i), resultat: m.resultat, ...(m.note ? { note: m.note } : {}), ...(m.raison ? { etiquettes: rP() < 0.75 ? [m.raison.e] : [], texte: rP() < 0.4 ? m.raison.t : null } : {}) });
      evaluees.push(m.e.q);
      if (m.e.q < 2) mauvais++;
    }
    for (const k of extra) expos.push({ cle: k, surface, ecran, le: le(i), resultat: 'note' });
  }
  mesurer(N);
  const memoire = memoireExpositions(expos);
  const premiere = new Map<string, string>();
  for (const n of notes) if (!premiere.has(n.cle) || n.le < premiere.get(n.cle)!) premiere.set(n.cle, n.le);
  const ind = indicateursPolitique(memoire, { qualite: (k) => parCle.get(k)?.q ?? null, premiereNote: (k) => premiere.get(k) ?? null, maintenant: le(N), ecransMesure: N });
  // Répétition par surface
  const derniers = new Map<string, number>();
  memoire.ecrans.forEach((e, i) => {
    const r = e.groupes.some((g) => { const d = derniers.get(g); return d !== undefined && i - d <= 50; });
    for (const g of e.groupes) derniers.set(g, i);
    const s = (parSurface[e.surface] ??= { ecrans: 0, rep: 0 });
    s.ecrans++; if (r) s.rep++;
  });
  return {
    mode: p.mode, ecrans: memoire.ecrans.length, tauxRepetition: ind.tauxRepetition ?? 0,
    qualiteMoyenne: Math.round((100 * evaluees.reduce((a, b) => a + b, 0)) / Math.max(1, evaluees.length)) / 100,
    partJamaisNotes: ind.partJamaisNotes ?? 0, partMauvais: Math.round((1000 * mauvais) / Math.max(1, evaluees.length)) / 1000,
    apprentissage, regles: regles.filter((r) => r.active).map((r) => r.id), implicites: implicitesNegatifs(memoire).length,
    parSurface: Object.fromEntries(Object.entries(parSurface).map(([k, v]) => [k, { ecrans: v.ecrans, repetition: Math.round((1000 * v.rep) / v.ecrans) / 1000 }])),
  };
}

/** Moyennes sur plusieurs graines, avant / après */
export function comparerPolitique(graines: readonly number[] = [1, 2, 3, 4, 5], ecrans = 200) {
  const moy = (l: number[]) => Math.round((1000 * l.reduce((a, b) => a + b, 0)) / Math.max(1, l.length)) / 1000;
  const bilan = (mode: 'avant' | 'apres') => {
    const r = graines.map((g) => simulerPolitique({ graine: g, ecrans, mode }));
    const pts = r[0].apprentissage.map((p0, i) => ({ ecrans: p0.ecrans, concordance: moy(r.map((x) => x.apprentissage[i].concordance)), precisionTop: moy(r.map((x) => x.apprentissage[i].precisionTop)) }));
    const surfaces = [...new Set(r.flatMap((x) => Object.keys(x.parSurface)))].sort();
    return {
      tauxRepetition: moy(r.map((x) => x.tauxRepetition)), qualiteMoyenne: moy(r.map((x) => x.qualiteMoyenne)), partJamaisNotes: moy(r.map((x) => x.partJamaisNotes)),
      partMauvais: moy(r.map((x) => x.partMauvais)), apprentissage: pts, regles: [...new Set(r.flatMap((x) => x.regles))].sort(), implicites: moy(r.map((x) => x.implicites)),
      parSurface: Object.fromEntries(surfaces.map((s) => [s, moy(r.map((x) => x.parSurface[s]?.repetition ?? 0))])),
    };
  };
  return { avant: bilan('avant'), apres: bilan('apres') };
}

