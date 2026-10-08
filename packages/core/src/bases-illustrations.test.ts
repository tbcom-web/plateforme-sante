import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  baseDeCle, clesAvecSignal, dedoublonnerParBase, LIBELLES_DUELS_VARIANTES, LIGNE_VERS_DESSIN, lireVarianteRendu, notesAvecBases, regrouperParBase, statutEffectif,
  statutsAvecHeritage, STYLES_VARIANTES, tailleFileParBase, titreDeBase, variantesADuel,
} from './bases-illustrations';
import { LIGNE_DESSIN } from './ligne';
import { STYLES_EXPERIMENTAUX } from './styles-experimentaux';
import { inventaireIllustrations } from './illustrations';
import { poidsAssets, scoreAsset, PENALITES_STATUT, type LigneAppriseAsset } from './assets-poids';
import { etatsNotes } from './retours';
import { appliquerRenforts } from './recettes';
import { candidatsVariantes, dimensionUniqueVariantes, genererDuelVariantes, familleClassement, preferencesVariantes, renfortsDuels, validerDuel, type Duel } from './duels';
import { repereDimension } from './reperes';

const notes = (cle: string, note: number, n: number): LigneAppriseAsset[] => Array.from({ length: n }, () => ({ cle, note }));
const fond = [...notes('gamme:a', 3, 20), ...notes('gamme:b', 4, 20), ...notes('picto:x', 2, 10)];

test('tables recopiées : traits continus propres à un seul dessin, styles expérimentaux', () => {
  const usages = new Map<string, string[]>();
  for (const [d, l] of Object.entries(LIGNE_DESSIN)) usages.set(l, [...(usages.get(l) ?? []), d]);
  const attendu = Object.fromEntries([...usages].filter(([, d]) => d.length === 1).map(([l, d]) => [l, d[0]]));
  assert.deepEqual(Object.fromEntries(Object.entries(LIGNE_VERS_DESSIN).sort()), Object.fromEntries(Object.entries(attendu).sort()));
  assert.deepEqual([...STYLES_VARIANTES], [...STYLES_EXPERIMENTAUX]);
});

test('clé → base : registres, styles, trait continu, sport, héros, matériel ; le reste sans base', () => {
  assert.equal(baseDeCle('dessin:orthonyxie:releve'), 'dessin:orthonyxie');
  assert.equal(baseDeCle('dessin:orthonyxie:pedagogique'), 'dessin:orthonyxie');
  assert.equal(baseDeCle('ligne:orthonyxie'), 'dessin:orthonyxie');
  assert.equal(baseDeCle('ligne:cor'), 'dessin:cors-durillons');
  assert.equal(baseDeCle('ligne:empreintes'), null, 'trait partagé par deux dessins : seul');
  assert.equal(baseDeCle('dessin:pied-profil:riso'), 'dessin:pied-profil');
  assert.equal(baseDeCle('ligne:sport-trail'), 'dessin:sport-trail');
  assert.equal(baseDeCle('heros:sport:ligne'), 'heros:sport');
  assert.equal(baseDeCle('materiel:podoscope:releve'), 'materiel:podoscope');
  assert.equal(baseDeCle('dessin:orthonyxie:pedagogique@contraste=fort'), 'dessin:orthonyxie');
  for (const k of ['picto:orthonyxie', 'photo:sport-course', 'biblio:POD-AT-0001', 'animation:meulage', 'gamme:cobalt', 'dessin:orthonyxie']) assert.equal(baseDeCle(k), null, k);
  assert.deepEqual(lireVarianteRendu('dessin:x:releve@contraste=doux'), { source: 'dessin:x:releve', dimension: 'contraste', valeur: 'doux' });
  assert.equal(titreDeBase('Pied de profil (Découpe)', 'dessin:pied-profil:decoupe'), 'Pied de profil');
  assert.equal(titreDeBase('Course (kit Sports)', 'dessin:sport-course:pedagogique'), 'Course (kit Sports)');
});

test('inventaire : aucune clé de base ne recouvre une clé réelle ; chaque groupe a au moins deux variantes ou une base distincte', () => {
  const cles = inventaireIllustrations().map((i) => i.cle);
  const reelles = new Set(cles);
  const { groupes } = regrouperParBase(cles.map((cle) => ({ cle })));
  assert.ok(groupes.length > 30);
  for (const g of groupes) assert.ok(!reelles.has(g.base), g.base);
  // L'illustration « basique » : pédagogique d'abord
  const ortho = groupes.find((g) => g.base === 'dessin:orthonyxie')!;
  assert.equal(ortho.representant.cle, 'dessin:orthonyxie:pedagogique');
  assert.deepEqual(ortho.variantes.map((v) => v.cle), ['dessin:orthonyxie:pedagogique', 'dessin:orthonyxie:releve', 'ligne:orthonyxie']);
});

test('file « à noter » dédoublonnée par base, ordre conservé', () => {
  const l = ['picto:a', 'dessin:x:releve', 'photo:p', 'ligne:orthonyxie', 'dessin:x:pedagogique', 'dessin:orthonyxie:releve'].map((cle) => ({ cle, base: false }));
  const d = dedoublonnerParBase(l, (g) => ({ cle: g.base, base: true }));
  assert.deepEqual(d.map((x) => x.cle), ['picto:a', 'dessin:x', 'photo:p', 'dessin:orthonyxie']);
  assert.deepEqual(tailleFileParBase(l.map((x) => x.cle)), { avant: 6, apres: 4, economisees: 2, bases: 2 });
  const inv = tailleFileParBase(inventaireIllustrations().map((i) => i.cle));
  assert.ok(inv.apres < inv.avant && inv.economisees > 40, JSON.stringify(inv));
});

test('anciennes notes de variantes : agrégées pour leur base (file), sans faux « modifié depuis »', () => {
  const n = [
    { cle: 'dessin:x:releve', note: 4, empreinte: 'aaaaaaaa', le: '2026-10-01' },
    { cle: 'ligne:orthonyxie', note: 2, empreinte: 'bbbbbbbb', le: '2026-10-02' },
    { cle: 'dessin:orthonyxie:releve', note: 5, empreinte: 'cccccccc', le: '2026-10-03' },
  ];
  const e = etatsNotes(notesAvecBases(n));
  assert.deepEqual(e.get('dessin:orthonyxie'), { n: 2, empreinte: null, min: 2, max: 5, le: '2026-10-03', derniere: 5, somme: 7 });
  assert.equal(e.get('dessin:x')!.n, 1);
  assert.equal(e.get('dessin:x:releve')!.empreinte, 'aaaaaaaa', 'la note d’origine reste lue');
});

test('héritage : une note sur la base vaut pour toutes ses variantes', () => {
  const p = poidsAssets([...fond, ...notes('dessin:orthonyxie', 5, 6)])!;
  const base = scoreAsset('dessin:orthonyxie', p);
  assert.ok(base > 0.5);
  for (const v of ['dessin:orthonyxie:releve', 'dessin:orthonyxie:pedagogique', 'ligne:orthonyxie', 'dessin:orthonyxie:pedagogique@contraste=fort']) assert.equal(scoreAsset(v, p), base, v);
  assert.equal(scoreAsset('dessin:verrue:releve', p), 0, 'une autre base n’hérite de rien');
});

test('héritage : écart propre d’une variante plafonné à ±0,5, anciennes notes comptées pour la base', () => {
  const p = poidsAssets([...fond, ...notes('dessin:orthonyxie', 5, 4), ...notes('dessin:orthonyxie:releve', 1, 40)])!;
  const b = scoreAsset('dessin:orthonyxie', p), v = scoreAsset('dessin:orthonyxie:releve', p), h = scoreAsset('ligne:orthonyxie', p);
  assert.ok(b < 0, 'les 40 notes de la variante tirent la base vers le bas (agrégation)');
  assert.equal(h, b, 'variante sans note propre : effet de la base');
  assert.ok(v < b && b - v <= 0.5 + 1e-9, `${v} / ${b}`);
  // Seule une variante notée : la base et elle ont le même effet (pas de double compte)
  const q = poidsAssets([...fond, ...notes('heros:diabete:releve', 5, 30)])!;
  assert.equal(scoreAsset('heros:diabete:releve', q), scoreAsset('heros:diabete', q));
  assert.equal(scoreAsset('heros:diabete:ligne', q), scoreAsset('heros:diabete', q));
});

test('statuts : posés sur la base, valables pour les variantes sauf statut propre', () => {
  const p = poidsAssets([...fond, { cle: 'dessin:orthonyxie', statut: 'retire' }, { cle: 'ligne:orthonyxie', statut: 'valide' }, { cle: 'dessin:orthonyxie:releve', statut: 'a_retravailler' }])!;
  assert.equal(scoreAsset('dessin:orthonyxie:pedagogique', p), PENALITES_STATUT.retire);
  assert.equal(scoreAsset('dessin:orthonyxie:releve', p), PENALITES_STATUT.a_retravailler);
  assert.equal(scoreAsset('ligne:orthonyxie', p), 0);
  const s = { 'dessin:orthonyxie': 'retire', 'ligne:orthonyxie': 'valide' } as const;
  assert.equal(statutEffectif('dessin:orthonyxie:releve', s), 'retire');
  assert.equal(statutEffectif('ligne:orthonyxie', s), 'valide');
  assert.deepEqual(statutsAvecHeritage(s, ['dessin:orthonyxie:releve', 'picto:x']), { ...s, 'dessin:orthonyxie:releve': 'retire' });
});

test('variante nouvelle sans signal d’une base notée : en duel, pas en note', () => {
  const g = { base: 'dessin:pied-profil', variantes: ['decoupe', 'riso', 'volume'].map((s) => ({ cle: `dessin:pied-profil:${s}` })) };
  assert.deepEqual(variantesADuel(g, clesAvecSignal([])), [], 'base pas encore notée : on note la base');
  assert.deepEqual(variantesADuel(g, clesAvecSignal([{ cle: 'dessin:pied-profil' }], [{ aCle: 'dessin:pied-profil:riso@contraste=fort', bCle: 'x:y' }])), ['dessin:pied-profil:decoupe', 'dessin:pied-profil:volume']);
});

test('duel de variantes : même base, une seule dimension ; renfort = écart propre ajouté à l’héritage', () => {
  const cles = ['dessin:orthonyxie:releve', 'dessin:orthonyxie:pedagogique', 'ligne:orthonyxie'];
  const c = candidatsVariantes('dessin:orthonyxie', cles, { gammes: ['canard', 'cobalt'], gammeDeBase: 'canard' });
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
    const d = dimensionUniqueVariantes(c[i], c[j]);
    if (!d) continue;
    const diff = (['style', 'contraste', 'couleur'] as const).filter((x) => c[i].valeurs[x] !== c[j].valeurs[x]);
    assert.deepEqual(diff, [d]);
    if (d === 'style') assert.ok(!c[i].rendu && !c[j].rendu); else assert.ok(c[i].rendu && c[j].rendu);
  }
  for (let g = 1; g < 30; g++) {
    const p = genererDuelVariantes(c, [], { graine: g, dimension: 'contraste' })!;
    assert.equal(p.dimension, 'variante:contraste');
    assert.equal(lireVarianteRendu(p.a.cle)!.source, 'dessin:orthonyxie:pedagogique');
    assert.equal(lireVarianteRendu(p.b.cle)!.source, 'dessin:orthonyxie:pedagogique');
    assert.notEqual(lireVarianteRendu(p.a.cle)!.valeur, lireVarianteRendu(p.b.cle)!.valeur);
  }
  const st = genererDuelVariantes(c, [], { graine: 3, dimension: 'style' })!;
  assert.ok(cles.includes(st.a.cle) && cles.includes(st.b.cle));
  const pc = genererDuelVariantes(c, [], { graine: 3, dimension: 'couleur' })!;
  assert.ok(pc.a.cle.includes('@couleur=') && pc.b.cle.includes('@couleur='));
  // Paire déjà jouée évitée tant qu'il en reste
  const p1 = genererDuelVariantes(c, [], { graine: 5, dimension: 'contraste' })!;
  const p2 = genererDuelVariantes(c, [{ aCle: p1.a.cle, bCle: p1.b.cle }], { graine: 5, dimension: 'contraste' })!;
  assert.notEqual([p1.a.cle, p1.b.cle].sort().join('|'), [p2.a.cle, p2.b.cle].sort().join('|'));

  const v = validerDuel({ type: 'illustration', resultat: 'a', aCle: 'dessin:orthonyxie:pedagogique@contraste=fort', bCle: 'dessin:orthonyxie:pedagogique@contraste=normal', dimension: 'variante:contraste', scenario: { sujets: ['ongles'] } });
  assert.ok(v.ok);
  const duels: Duel[] = Array.from({ length: 6 }, () => (v as { ok: true; duel: Duel }).duel);
  assert.equal(familleClassement(duels[0]), 'variante:contraste');
  assert.equal(preferencesVariantes(duels, 'contraste')[0].cle, 'fort');
  const r = renfortsDuels(duels);
  assert.ok(r.assets['dessin:orthonyxie:pedagogique@contraste=fort'] > 0);
  assert.equal(r.assets['dessin:orthonyxie:pedagogique'], undefined, 'la clé réelle du dessin n’est pas touchée');
  const base = poidsAssets([...fond, ...notes('dessin:orthonyxie', 5, 6)])!;
  const avec = appliquerRenforts({ n: 1, moyenne: 3, effets: {}, assets: base }, r)!.assets!;
  assert.equal(scoreAsset('dessin:orthonyxie:pedagogique@contraste=fort', avec), Math.round((scoreAsset('dessin:orthonyxie', base) + r.assets['dessin:orthonyxie:pedagogique@contraste=fort']) * 1000) / 1000);
  assert.equal(scoreAsset('dessin:orthonyxie:releve', avec), scoreAsset('dessin:orthonyxie', base));
});

test('libellés simples des duels de variantes (repères)', () => {
  assert.equal(LIBELLES_DUELS_VARIANTES['variante:contraste'], 'le contraste de l’illustration');
  for (const [d, l] of Object.entries(LIBELLES_DUELS_VARIANTES)) assert.equal(repereDimension(d).libelle, l);
});
