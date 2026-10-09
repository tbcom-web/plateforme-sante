// Tournoi en grilles (tournoi-grilles.ts) : comparaisons d'une grille, a priori plafonné, élimination, sélection autour de la
// frontière, arrêt sur la certitude, et jury synthétique (moins d'écrans que les duels pour une précision au moins égale).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aPriori, APRIORI_TOURNOI, comparaisonsGrille, etatTournoiGrilles, mondeJury, precisionTop, prochainEcran, simulerGrilles, TOURNOI_GRILLES, type GrilleTournoi,
} from './tournoi-grilles';
import { etatTournoi, prochainDuel, type VoteModele } from './chaine-modeles';

test('grille : n° 1 bat 5, n° 2 bat 4, les 3 du milieu battent la pire (12 comparaisons)', () => {
  const l = comparaisonsGrille({ propositions: ['a', 'b', 'c', 'd', 'e', 'f'], meilleures: [2, 0], pire: 5 });
  assert.equal(l.length, 12);
  assert.ok(l.some(([w, p]) => w === 'c' && p === 'a'));
  assert.ok(!l.some(([w, p]) => w === 'a' && p === 'c'));
  assert.ok(l.some(([w, p]) => w === 'd' && p === 'f'));
  assert.equal(comparaisonsGrille({ propositions: ['a', 'b', 'c'], meilleures: [1], pire: null }).length, 2);
});

test('a priori : J’aime, juge, jauge pondérés, plafonnés à ±0,6 ; rien = 0', () => {
  assert.equal(aPriori(null), 0);
  assert.ok(aPriori({ jaime: 3, juge: 5, jauge: 1 }) <= APRIORI_TOURNOI.plafond);
  assert.ok(aPriori({ jaime: 9, juge: 5, jauge: 1 }) === aPriori({ jaime: 3, juge: 5, jauge: 1 }), 'J’aime plafonnés à 3');
  assert.ok(aPriori({ jaime: 0, juge: 1, jauge: 0 }) >= -APRIORI_TOURNOI.plafond);
  assert.ok(aPriori({ jaime: 2 }) > aPriori({ jaime: 0 }));
});

test('tournoi : fermé sous 20, élimination rapide, jamais un éliminé ni un candidat réservé dans la grille suivante', () => {
  const ids = Array.from({ length: 24 }, (_, i) => `c${i}`);
  assert.equal(etatTournoiGrilles(ids.slice(0, 10), [], [], {}, { ouverture: 20 }).ouvert, false);
  const g = (props: string[], m: number[]): GrilleTournoi => ({ profil: 'p', propositions: props, meilleures: m, pire: null, votant: 'u', poids: 1, le: '1' });
  const grilles = [0, 1, 2].map((k) => g(['c0', 'c1', 'c2', 'c3', 'c4', 'c23'], k === 0 ? [0, 1] : k === 1 ? [2, 3] : [4, 0]));
  const e = etatTournoiGrilles(ids, grilles, [], {}, { ouverture: 20 });
  assert.ok(e.classement.find((l) => l.id === 'c23')!.elimine, 'vu 3 fois, jamais choisi : éliminé');
  const ec = prochainEcran(e, { reserves: new Set(['c5', 'c6']) });
  assert.equal(ec?.kind, 'grille');
  if (ec?.kind === 'grille') {
    assert.equal(ec.propositions.length, TOURNOI_GRILLES.taille);
    assert.ok(!ec.propositions.includes('c23'));
    assert.ok(!ec.propositions.includes('c5') && !ec.propositions.includes('c6'), 'réservés par un autre votant');
  }
});

test('jury synthétique : ≈ 15-25 grilles contre ≈ 90-100 duels, précision au moins égale (12 tirages, 2 votants)', () => {
  let ecransG = 0, precG = 0, ecransD = 0, precD = 0;
  const N = 12;
  for (let s = 1; s <= N; s++) {
    const rg = simulerGrilles({ graine: s, votants: 2, bruit: 2 });
    ecransG += rg.ecrans; precG += rg.precision;
    const w = mondeJury({ graine: s, votants: 2, bruit: 2 });
    const votes: VoteModele[] = [];
    let e = etatTournoi(w.ids, votes);
    for (let k = 0; k < 400 && !e.arrete; k++) {
      const v = w.votants[k % 2];
      const [a, b] = prochainDuel(w.ids, votes, { votant: v.id, graine: k + 1 })!;
      const pa = 1 / (1 + Math.exp(-(v.gout.get(a)! - v.gout.get(b)!) * 2));
      votes.push({ profil: 'p', a, b, resultat: w.r() < pa ? 'a' : 'b', votant: v.id, poids: v.poids, le: String(k).padStart(5, '0') });
      e = etatTournoi(w.ids, votes);
    }
    ecransD += votes.length; precD += precisionTop(e.classement.slice(0, 10).map((l) => l.id), w.vraiTop);
  }
  assert.ok(ecransG / N <= 30, `grilles : ${ecransG / N} écrans`);
  assert.ok(ecransD / N >= 3 * (ecransG / N), `duels : ${ecransD / N} écrans`);
  assert.ok(precG / N >= precD / N - 0.02, `précision grilles ${precG / N} ≥ duels ${precD / N}`);
});
