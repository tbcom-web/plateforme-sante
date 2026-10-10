import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conseilsDuSite, conseilsDuSoin, markdownConseil, slugsAcceptes, type ConseilPatient } from './conseils-patients';
import { cleContenu, contenusDuPack, estCleContenu, progressionPack, type PackContenus } from './contenus-revue';
import { construireNavigation } from './themes';

const fiche = (slug: string, soins: string[], titre = `Fiche ${slug}`): ConseilPatient => ({
  slug, titre, resume: 'Résumé.', points: ['Un geste.'], quandConsulter: ['Une douleur.'], soins, sources: ['s1'],
});
const CONSEILS = [fiche('a', ['cors-durillons']), fiche('b', ['cors-durillons', 'semelles-orthopediques']), fiche('c', ['pied-diabetique']), fiche('posturo', ['bilan-podologique'], 'Posturologie')];

test('conseils du site : fiches liées aux soins, choix du praticien, acceptation, jamais de faible preuve', () => {
  assert.deepEqual(conseilsDuSite({ conseils: CONSEILS, soinsDuSite: ['cors-durillons', 'bilan-podologique'] }).map((c) => c.slug), ['a', 'b']);
  assert.deepEqual(conseilsDuSite({ conseils: CONSEILS, soinsDuSite: [], choix: ['c', 'posturo'] }).map((c) => c.slug), ['c']);
  assert.deepEqual(conseilsDuSite({ conseils: CONSEILS, soinsDuSite: ['cors-durillons'], choix: [] }).map((c) => c.slug), []);
  assert.deepEqual(conseilsDuSite({ conseils: CONSEILS, soinsDuSite: ['cors-durillons'], acceptees: new Set(['b']) }).map((c) => c.slug), ['b']);
});

test('conseils d’un soin : plusieurs fiches par soin, une fiche pour plusieurs soins, au plus 3', () => {
  assert.deepEqual(conseilsDuSoin('cors-durillons', CONSEILS).map((c) => c.slug), ['a', 'b']);
  assert.deepEqual(conseilsDuSoin('semelles-orthopediques', CONSEILS).map((c) => c.slug), ['b']);
  assert.equal(conseilsDuSoin('cors-durillons', [...CONSEILS, fiche('d', ['cors-durillons']), fiche('e', ['cors-durillons'])]).length, 3);
});

test('markdown d’une fiche : gestes, à ne pas faire (si présent), quand consulter', () => {
  const md = markdownConseil({ points: ['A'], aEviter: ['B'], quandConsulter: ['C'] });
  assert.match(md, /## Les gestes utiles\n\n- A/);
  assert.match(md, /## À ne pas faire soi-même\n\n- B/);
  assert.match(md, /## Quand consulter\n\n- C/);
  assert.doesNotMatch(markdownConseil({ points: ['A'], quandConsulter: ['C'] }), /À ne pas faire/);
});

const PACK: PackContenus = {
  profession: 'podologue', statut: 'complement',
  articles: [{ slug: 'art', titre: 'Article', resume: 'R', theme: 'Prévention', corps: '## Titre\n\nTexte', sources: ['s1'] }],
  conseils: CONSEILS.slice(0, 2),
};

test('revue : articles et fiches conseils deviennent des cartes non obligatoires ; un pack complément ne ferme jamais la profession', () => {
  const c = contenusDuPack(PACK);
  assert.deepEqual(c.map((x) => x.nature), ['article', 'conseil', 'conseil']);
  assert.ok(c.every((x) => !x.obligatoire && estCleContenu(x.cle)));
  const p = progressionPack(c, {}, { statutPack: 'complement' });
  assert.equal(p.total, 3);
  assert.equal(p.publiable, true);
});

test('slugsAcceptes : seulement les fiches acceptées pour leur texte actuel', () => {
  const c = contenusDuPack(PACK);
  const a = c.find((x) => x.id === 'a')!;
  const statuts = [
    { cle: cleContenu('podologue', 'conseil', 'a'), statut: 'valide', empreinte: a.empreinte },
    { cle: cleContenu('podologue', 'conseil', 'b'), statut: 'valide', empreinte: '00000000' },
    { cle: cleContenu('podologue', 'article', 'art'), statut: 'valide', empreinte: null },
  ];
  assert.deepEqual([...slugsAcceptes(PACK, 'conseil', statuts)], ['a']);
  assert.deepEqual([...slugsAcceptes(PACK, 'article', statuts)], ['art']);
});

test('navigation : « Fiches conseils » au pied de page seulement s’il y en a', () => {
  const soins = [{ slug: 'cors-durillons' }];
  assert.ok(!construireNavigation({}, soins).pied.some((l) => l.href === '/conseils'));
  assert.ok(construireNavigation({}, soins, { conseils: true }).pied.some((l) => l.cle === 'conseils' && l.libelle === 'Fiches conseils'));
});
