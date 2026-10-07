import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bonusAtelier, cleCombinaison, ETIQUETTES_ATELIER, extremesAtelier, ingredientsProposition, markdownAtelier, normaliserPoidsAtelier, poidsAtelier,
  statsAtelier, syntheseAtelier, type NoteAtelier,
} from './atelier';
import { lotsPropositions, propositionParId, propositionsModeles, stylesCompatibles, type EntreePropositions, type Proposition } from './propositions';
import { gamme, verifierGamme } from './gammes';

const entree = (principaux: string[], couleursPreferees: string[] = [], secondaires: string[] = []): EntreePropositions => ({ priorites: { principaux, secondaires }, couleursPreferees });
const noter = (p: Proposition, e: EntreePropositions, note: number, etiquettes: string[] = []): NoteAtelier => ({ ingredients: ingredientsProposition(p, e), note, etiquettes });

test('clé de combinaison : stable, sensible aux ingrédients', () => {
  const e = entree(['sport'], ['corail']);
  const [a, b] = propositionsModeles(e);
  const ia = ingredientsProposition(a, e);
  assert.match(cleCombinaison(ia), /^[0-9a-f]{16}$/);
  assert.equal(cleCombinaison(ia), cleCombinaison(JSON.parse(JSON.stringify(ia))));
  assert.equal(cleCombinaison(ia), cleCombinaison({ ...ia }), 'ordre des clés indifférent');
  assert.notEqual(cleCombinaison(ia), cleCombinaison(ingredientsProposition(b, e)));
  assert.notEqual(cleCombinaison(ia), cleCombinaison({ ...ia, couleurs: ['bleu'] }));
  assert.equal(ia.theme1, 'sport');
  assert.equal(ingredientsProposition(a, entree(['posture', 'sport'])).theme1, 'sport', 'posture jamais prise en compte');
});

test('lissage bayésien : une note isolée pèse peu, beaucoup de notes concordantes pèsent', () => {
  const e = entree(['sport']);
  const lots = lotsPropositions(e, 6).flat();
  const cible = lots[0];
  const autres = lots.slice(1, 13);
  const fond = Array.from({ length: 8 }, () => autres.map((p) => noter(p, e, 3))).flat();
  const une = poidsAtelier([...fond, noter(cible, e, 5)]);
  const k = `combinaison=${cible.id}`;
  assert.ok(une.effets[k] > 0 && une.effets[k] < 0.5, `une note : ${une.effets[k]}`);
  const beaucoup = poidsAtelier([...fond, ...Array.from({ length: 30 }, () => noter(cible, e, 5))]);
  assert.ok(beaucoup.effets[k] > 1, `trente notes : ${beaucoup.effets[k]}`);
  assert.ok(beaucoup.effets[`structure=${cible.univers}`] > une.effets[`structure=${cible.univers}`]);
  // Ordre des notes indifférent
  const notes = [...fond, noter(cible, e, 1), noter(lots[2], e, 4)];
  assert.deepEqual(poidsAtelier(notes), poidsAtelier([...notes].reverse()));
  // Notes invalides ignorées
  assert.equal(statsAtelier([{ ingredients: {}, note: 7 }, { ingredients: {}, note: 2.5 }]).n, 0);
});

test('à poids égaux (aucune note, notes toutes identiques) : propositions inchangées', () => {
  for (const e of [entree(['sport'], ['corail']), entree(['diabete'], ['rouge']), entree([]), entree(['enfant', 'senior'], ['vert', 'jaune'])]) {
    const sans = lotsPropositions(e, 8);
    assert.deepEqual(lotsPropositions(e, 8, { poids: poidsAtelier([]) }), sans);
    const egales = poidsAtelier(sans.flat().map((p) => noter(p, e, 4)));
    assert.deepEqual(egales.effets, {}, 'notes égales : aucun effet');
    assert.deepEqual(lotsPropositions(e, 8, { poids: egales }), sans);
  }
});

test('déterminisme avec poids', () => {
  const e = entree(['ongles'], ['prune']);
  const l = lotsPropositions(e, 3).flat();
  const poids = poidsAtelier([noter(l[0], e, 1), noter(l[1], e, 5), noter(l[4], e, 2, ['fade'])]);
  assert.deepEqual(lotsPropositions(e, 5, { poids }), lotsPropositions(e, 5, { poids }));
  assert.deepEqual(lotsPropositions(e, 2, { poids }), lotsPropositions(e, 5, { poids }).slice(0, 2), 'lots déjà vus inchangés');
});

test('les poids réordonnent et écartent', () => {
  const e = entree(['sport']);
  const premier = propositionsModeles(e);
  const cible = premier[0];
  const fond = lotsPropositions(e, 6).flat().slice(3).map((p) => noter(p, e, 3));
  // Combinaison de tête notée 1 plusieurs fois : elle quitte le premier lot et n'apparaît plus
  const poids = poidsAtelier([...fond, ...Array.from({ length: 4 }, () => noter(cible, e, 1))]);
  assert.ok(bonusAtelier(ingredientsProposition(cible, e), poids) <= -1.25);
  const apres = lotsPropositions(e, 30, { poids }).flat();
  assert.ok(!apres.some((p) => p.id === cible.id), 'combinaison écartée');
  assert.ok(propositionParId(e, cible.id, { poids }), 'toujours retrouvée par son identifiant (choix déjà enregistré)');
  // Une combinaison lointaine très bien notée remonte
  const loin = lotsPropositions(e, 10).flat()[25];
  const bon = poidsAtelier([...fond, ...Array.from({ length: 20 }, () => noter(loin, e, 5))]);
  const rang = (l: Proposition[]) => l.findIndex((p) => p.id === loin.id);
  assert.ok(rang(lotsPropositions(e, 10, { poids: bon }).flat()) < 25, 'remonte');
});

test('garde-fous jamais levés par les poids', () => {
  // Poids extrêmes en faveur de ce qui est interdit, en défaveur de tout le reste
  const effets: Record<string, number> = {
    'gamme=pasteque': 4, 'gamme=corail': 4, 'style=releve': 4, 'structure=technique-precis': 4, 'animation=trajectoire': 4,
    'structure=simple-proche': -4, 'structure=elegant-sobre': -4, 'style=pedagogique': -4, 'style=ligne': -4,
  };
  const poids = normaliserPoidsAtelier({ n: 50, moyenne: 3, effets })!;
  for (const id of ['diabete', 'sport', 'enfant', 'senior', 'ongles', 'semelles', 'pedicurie']) {
    const e = entree([id, 'posture'], ['rouge', 'rose']);
    const lots = lotsPropositions(e, 12, { poids });
    assert.ok(lots.length >= 8, `${id} : ${lots.length} lots`);
    for (const [i, lot] of lots.entries()) {
      if (i < 6) {
        assert.equal(new Set(lot.map((p) => p.univers)).size, 3, `${id} lot ${i} : structures`);
        assert.equal(new Set(lot.map((p) => p.gamme)).size, 3, `${id} lot ${i} : gammes`);
        assert.equal(new Set(lot.map((p) => p.style)).size, 3, `${id} lot ${i} : styles`);
      }
      for (const p of lot) {
        assert.deepEqual(verifierGamme(gamme(p.gamme)!), [], `AA ${p.gamme}`);
        assert.ok(stylesCompatibles(p.univers).includes(p.style));
        assert.notEqual(p.animation, 'trajectoire', 'posture : jamais');
        assert.notEqual(p.heros, 'posture');
        if (id === 'diabete') {
          assert.notEqual(p.style, 'releve', 'diabète : pas de relevé');
          assert.notEqual(p.univers, 'technique-precis');
          assert.ok(!['pasteque', 'corail', 'corail-nuit', 'pistache'].includes(p.gamme), `diabète sans rouge : ${p.gamme}`);
        }
      }
    }
    const premier = lots[0];
    assert.ok(premier.some((p) => p.famille === 'sobre') && premier.some((p) => p.famille === 'vitaminee'), `${id} : sobre + vitaminée`);
  }
  assert.equal(normaliserPoidsAtelier('x'), null);
  assert.equal(normaliserPoidsAtelier({ n: 1, effets: { a: 99 } })!.effets.a, 4, 'borné');
});

test('synthèse et Markdown', () => {
  const e = entree(['enfant'], ['jaune']);
  const l = lotsPropositions(e, 4).flat();
  const notes = [
    { ...noter(l[0], e, 5, ['waouh']), commentaire: 'Très réussi, le héros est lisible.', le: '2026-10-07T10:00:00Z' },
    { ...noter(l[1], e, 2, ['fade', 'illustration-petite']), le: '2026-10-07T10:01:00Z' },
    { ...noter(l[1], e, 1, ['fade']), commentaire: 'Trop pâle', le: '2026-10-07T10:02:00Z' },
    noter(l[2], e, 3),
  ];
  const s = syntheseAtelier(notes);
  assert.equal(s.total, 4);
  assert.deepEqual(s.repartition, [1, 1, 1, 0, 1]);
  assert.equal(s.etiquettes[0].id, 'fade');
  assert.equal(s.etiquettes[0].total, 2);
  assert.ok(s.commentaires[0].commentaire === 'Trop pâle', 'plus récent d’abord');
  const { meilleures, pires } = extremesAtelier(s.combinaisons);
  assert.equal(meilleures[0].cle, `combinaison=${l[0].id}`);
  assert.equal(pires[0].cle, `combinaison=${l[1].id}`);
  const md = markdownAtelier(s, { date: '7 octobre 2026' });
  assert.match(md, /^# Retours de l’atelier/);
  assert.match(md, /Fade/);
  assert.match(md, /Trop pâle/);
  assert.ok(ETIQUETTES_ATELIER.length === 12 && ETIQUETTES_ATELIER.filter((e) => e.positive).length === 5);
  assert.deepEqual(syntheseAtelier([]).ingredients, []);
});
