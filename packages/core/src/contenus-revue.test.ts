import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contenusDuPack, empreinteTexte, estCleContenu, etatContenu, htmlContenu, libelleProgression, markdownContenusARetravailler, messagesDuContenu, progressionPack, type PackContenus,
} from './contenus-revue';

const PACK: PackContenus = {
  profession: 'metier-fictif', statut: 'relu',
  pages: [{ id: 'accueil', titreMenu: 'Accueil', titre: 'Cabinet à {ville}', description: 'Desc', sections: [{ titre: 'A', corps: 'Texte **gras**', sources: ['s1'] }, { titre: 'B', corps: '- un\n- deux', si: 'option' }] }],
  fiches: [{ slug: 'f1', titreCourt: 'F1', titre: 'Fiche 1', resume: 'R', corps: '## Titre\n\nCorps', faq: [{ q: 'Q ?', r: 'R.' }], sources: ['s2'] }],
  faq: [{ q: 'Faut-il une prescription médicale ?', r: 'Oui.', sources: ['s1'] }, { q: 'Faut-il une prescription médicale ?', r: 'Doublon.' }],
  mentions: [{ id: 'm1', ou: 'pied', texte: 'Mention', sources: ['s3'] }],
  onboarding: [{ id: 'q1', question: 'Question ?', effet: 'Effet', options: [{ libelle: 'Oui' }] }],
  priseEnCharge: { liberal: 'Non remboursé.' },
};

test('contenus : une carte par page, fiche, question ; mentions, prise en charge, onboarding groupés ; clés et empreintes stables', () => {
  const c = contenusDuPack(PACK);
  assert.deepEqual(c.map((x) => x.cle), [
    'contenu:metier-fictif:page:accueil', 'contenu:metier-fictif:fiche:f1', 'contenu:metier-fictif:faq:faut-il-une-prescription-medicale',
    'contenu:metier-fictif:faq:faut-il-une-prescription-medicale-2', 'contenu:metier-fictif:mentions:toutes', 'contenu:metier-fictif:prise-en-charge:textes',
    'contenu:metier-fictif:onboarding:questions',
  ]);
  for (const x of c) { assert.ok(estCleContenu(x.cle), x.cle); assert.match(x.empreinte, /^[0-9a-f]{8}$/); }
  assert.ok(new Set(c.map((x) => x.cle)).size === c.length);
  assert.deepEqual(c[0].sources, ['s1']);
  assert.equal(c[0].blocs[1].condition, 'option');
  // Même texte → même empreinte ; texte modifié → empreinte différente
  assert.equal(contenusDuPack(PACK)[0].empreinte, c[0].empreinte);
  const modifie = contenusDuPack({ ...PACK, pages: [{ ...PACK.pages![0], titre: 'Autre titre' }] });
  assert.notEqual(modifie[0].empreinte, c[0].empreinte);
  assert.equal(empreinteTexte(''), '811c9dc5');
  assert.deepEqual(messagesDuContenu(c[0], ['page accueil · A : x', 'page accueillir : y', 'accroche : z', 'fiche f1 : w']), ['page accueil · A : x', 'accroche : z']);
  assert.deepEqual(messagesDuContenu(c[2], ['FAQ 1 : a', 'FAQ 10 : b']), ['FAQ 1 : a']);
});

test('contenus : état (modification → de nouveau en attente), progression, publiable seulement si tout est accepté', () => {
  const c = contenusDuPack(PACK);
  const p = c[0];
  assert.equal(etatContenu(p, null), 'en_attente');
  assert.equal(etatContenu(p, { statut: 'valide', empreinte: p.empreinte }), 'accepte');
  assert.equal(etatContenu(p, { statut: 'valide', empreinte: 'deadbeef' }), 'en_attente');
  assert.equal(etatContenu(p, { statut: 'a_retravailler', empreinte: p.empreinte }), 'a_retravailler');
  assert.equal(etatContenu(p, { statut: 'retire', empreinte: p.empreinte }), 'refuse');
  assert.equal(etatContenu(p, { statut: 'a_revoir', empreinte: p.empreinte }), 'en_attente');
  const tous = Object.fromEntries(c.map((x) => [x.cle, { statut: 'valide', empreinte: x.empreinte }]));
  assert.equal(progressionPack(c, tous).publiable, true);
  assert.equal(progressionPack(c, tous, { erreursControle: 1 }).publiable, false);
  assert.equal(progressionPack(c, tous, { statutPack: 'en-preparation' }).publiable, false);
  const moinsUn = { ...tous, [c[1].cle]: { statut: 'a_retravailler', empreinte: c[1].empreinte } };
  const pr = progressionPack(c, moinsUn);
  assert.equal(pr.publiable, false);
  assert.equal(pr.aRetravailler, 1);
  assert.equal(libelleProgression('Psychomotricien', pr), `Pack Psychomotricien : ${c.length - 1}/${c.length} contenus acceptés`);
});

test('contenus : rendu Markdown échappé, export « à retravailler »', () => {
  const h = htmlContenu('## Titre\n\nTexte **gras** <script>\n- a\n- b\n1. c', { ville: 'Lyon' });
  assert.ok(h.includes('<h3>Titre</h3>') && h.includes('<strong>gras</strong>') && h.includes('&lt;script&gt;') && h.includes('<ul><li>a</li><li>b</li></ul><ol><li>c</li></ol>'));
  assert.ok(htmlContenu('à {ville} {x}', { ville: 'Lyon' }).includes('ct-vide'));
  const md = markdownContenusARetravailler([
    { cle: 'contenu:psychomotricien:page:accueil', statut: 'a_retravailler', commentaire: 'Trop long', empreinte: 'abcdef01', jour: '2026-10-09' },
    { cle: 'contenu:psychomotricien:fiche:x', statut: 'a_retravailler', commentaire: 'A' }, { cle: 'contenu:psychomotricien:fiche:x', statut: 'valide' },
    { cle: 'picto:x', statut: 'a_retravailler', commentaire: 'hors contenus' },
  ]);
  assert.ok(md.includes('Trop long') && !md.includes('fiche:x') && !md.includes('picto:x'));
});
