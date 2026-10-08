import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estDeLaProfession, estProfession, professionDe, professionsActives, PROFESSION_PAR_DEFAUT, PROFESSIONS, sujetDeLaProfession } from './professions';
import { UNIVERS_LISTE } from './univers';
import { SUJETS_VISUELS } from './photos-libres';

test('professions : identifiants uniques, profession par défaut active, univers connu, spécialités de l’univers', () => {
  assert.equal(new Set(PROFESSIONS.map((p) => p.id)).size, PROFESSIONS.length);
  assert.ok(estProfession(PROFESSION_PAR_DEFAUT));
  for (const p of PROFESSIONS) {
    const u = UNIVERS_LISTE.find((x) => x.id === p.univers);
    assert.ok(u, `univers inconnu : ${p.univers}`);
    assert.ok(u!.professions.includes(p.id), `${p.id} absent de l'univers ${u!.id}`);
    assert.deepEqual([...p.specialites].sort(), u!.specialites.map((s) => s.value).sort());
    assert.ok(p.libelle && p.pluriel && p.court);
  }
  assert.ok(professionsActives().length >= 1);
});

test('professions : repli sur la profession par défaut, éléments sans profession = podologie', () => {
  assert.equal(professionDe('inconnue').id, PROFESSION_PAR_DEFAUT);
  assert.equal(professionDe(null).id, PROFESSION_PAR_DEFAUT);
  assert.ok(estDeLaProfession({}, PROFESSION_PAR_DEFAUT));
  assert.ok(!estDeLaProfession({ profession: 'osteopathe' }, PROFESSION_PAR_DEFAUT));
  // Tous les sujets de visuels actuels appartiennent à la profession par défaut
  const p = professionDe(PROFESSION_PAR_DEFAUT);
  for (const s of SUJETS_VISUELS) assert.ok(sujetDeLaProfession(s, p), s.id);
});
