import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  choisirRequeteProfession, cleMotsCles, couvertureRequetes, libelleTrou, lignesProfessionsDecision, motsClesDuTheme, professionDuChercheur, professionsALaDecision,
  requetesDuTheme, sujetsEtHashtagsDesThemes, THEMES_RECHERCHE, themesRecherche, trousParProfession,
} from './recherche-photos-professions';
import { MOTS_CLES_EXPLORATION, motsClesDuSujet, requetesDuSujet, SUJETS_VISUELS, estSujetVisuel } from './photos-libres';
import { normaliserHashtag } from './hashtags';
import { PROFESSIONS } from './professions';

test('recherche : podologue identique aux sujets visuels d’avant (mots-clés, exploration, base)', () => {
  for (const s of SUJETS_VISUELS) {
    assert.deepEqual(motsClesDuTheme('podologue', s.id), motsClesDuSujet(s.id));
    assert.deepEqual(requetesDuTheme('podologue', s.id), requetesDuSujet(s.id));
    assert.deepEqual(motsClesDuTheme('podologue', s.id, { [s.id]: ['custom query'] }), ['custom query']);
  }
  assert.ok(MOTS_CLES_EXPLORATION.sport.length);
});

test('recherche : requêtes par profession (psychomot : thèmes du pack, mots-clés en base par profession/thème)', () => {
  for (const p of PROFESSIONS) assert.ok(THEMES_RECHERCHE[p.id]?.length, `thèmes de recherche manquants : ${p.id}`);
  const ids = themesRecherche('psychomotricien').map((t) => t.id);
  for (const id of ['petite-enfance', 'apprentissages', 'graphomotricite', 'tnd', 'seniors', 'relaxation']) assert.ok(ids.includes(id), id);
  assert.ok(requetesDuTheme('psychomotricien', 'graphomotricite').includes('handwriting child hand'));
  assert.ok(requetesDuTheme('psychomotricien', 'seniors').includes('elderly balance rail'));
  assert.equal(cleMotsCles('psychomotricien', 'graphomotricite'), 'psychomotricien/graphomotricite');
  assert.equal(cleMotsCles('podologue', 'sport'), 'sport');
  assert.deepEqual(motsClesDuTheme('psychomotricien', 'graphomotricite', { graphomotricite: ['x y'], 'psychomotricien/graphomotricite': ['pencil grip'] }), ['pencil grip']);
  // Sujets enregistrés valides ; hashtags normalisés ; aucune requête de pieds de podologie dans la psychomotricité
  for (const p of Object.keys(THEMES_RECHERCHE)) for (const t of THEMES_RECHERCHE[p]) {
    assert.ok(estSujetVisuel(t.sujet), `${p}/${t.id}`);
    for (const h of t.hashtags) assert.equal(normaliserHashtag(h), h);
    assert.ok(t.requetes.length);
  }
  assert.ok(!requetesDuTheme('psychomotricien', 'apprentissages').some((q) => /insole|toenail|podiatr|pedicure/.test(q)));
});

test('recherche : couverture et pondération PAR PROFESSION', () => {
  const photos = [
    { requete: 'handwriting child hand', statut: 'validee', professions: ['psychomotricien'] },
    { requete: 'handwriting child hand', statut: 'validee', professions: ['psychomotricien'] },
    { requete: 'handwriting child hand', statut: 'retiree', professions: ['psychomotricien'] },
    { requete: 'child sneakers', statut: 'validee', professions: ['podologue'] },
  ];
  assert.deepEqual(couvertureRequetes(photos, 'psychomotricien'), { 'handwriting child hand': 2 });
  assert.deepEqual(couvertureRequetes(photos, 'podologue'), { 'child sneakers': 1 });
  // La requête déjà couverte est moins tirée que sa part égale
  let n = 0;
  for (let i = 0; i < 200; i++) if (choisirRequeteProfession({ profession: 'psychomotricien', theme: 'graphomotricite', photos, r: i / 200 }) === 'handwriting child hand') n++;
  assert.ok(n < 200 / requetesDuTheme('psychomotricien', 'graphomotricite').length, String(n));
});

test('verrou : la profession verrouillée l’emporte sur celle de l’en-tête ; inconnue → en-tête', () => {
  assert.equal(professionDuChercheur({ globale: 'podologue', verrou: 'psychomotricien' }), 'psychomotricien');
  assert.equal(professionDuChercheur({ globale: 'psychomotricien', verrou: null }), 'psychomotricien');
  assert.equal(professionDuChercheur({ globale: 'podologue', verrou: 'inconnue' }), 'podologue');
  assert.equal(professionDuChercheur({ globale: 'pedicure-podologue' }), 'podologue');
});

test('tag à la décision : profession verrouillée pré-cochée, « Aussi pour… » suggéré si générique, lignes de rattachement', () => {
  const d = professionsALaDecision({ verrou: 'psychomotricien', texte: 'Child walking barefoot on grass' });
  assert.deepEqual(d.cochees, ['psychomotricien']);
  assert.ok(d.suggerees.some((s) => s.profession === 'podologue' && s.raisons.includes('walking')));
  assert.deepEqual(professionsALaDecision({ verrou: 'psychomotricien', texte: 'pencil grip paper loops' }).suggerees, []);
  assert.ok(professionsALaDecision({ verrou: 'podologue', texte: 'trail running shoes', hashtags: ['equilibre'] }).suggerees.some((s) => s.profession === 'psychomotricien'));
  const cle = 'photo-candidate:pexels:123';
  assert.deepEqual(lignesProfessionsDecision(cle, ['psychomotricien']), [
    { cle_asset: cle, profession: 'psychomotricien', action: 'ajout' }, { cle_asset: cle, profession: 'podologue', action: 'retrait' },
  ]);
  assert.deepEqual(lignesProfessionsDecision(cle, ['podologue', 'psychomotricien']), [{ cle_asset: cle, profession: 'psychomotricien', action: 'ajout' }]);
  assert.deepEqual(lignesProfessionsDecision(cle, ['podologue']), []);
  assert.deepEqual(sujetsEtHashtagsDesThemes('psychomotricien', ['graphomotricite', 'seniors']), { sujets: ['general', 'senior'], hashtags: ['graphomotricite', 'ecriture', 'seniors', 'equilibre'] });
});

test('trous par profession : « Psychomotricité : 0 photo #graphomotricite » en tête', () => {
  const trous = trousParProfession('psychomotricien', [
    { statut: 'validee', professions: ['psychomotricien'], hashtags: ['seniors', 'equilibre'] },
    { statut: 'validee', professions: ['podologue'], hashtags: ['graphomotricite'] },
  ]);
  assert.equal(trous.find((t) => t.theme === 'graphomotricite')!.photos, 0);
  assert.equal(trous.find((t) => t.theme === 'seniors')!.photos, 1);
  assert.equal(trous[0].photos, 0);
  assert.equal(libelleTrou('Psychomotricité', trous.find((t) => t.theme === 'graphomotricite')!), 'Psychomotricité : 0 photo #graphomotricite');
});
