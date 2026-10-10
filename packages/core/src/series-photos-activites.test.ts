import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  controlerSeriesActivites, exclusionsSerie, profilsSeriesASourcer, requetesSerieActivite, SERIES_ACTIVITES, serieDeLActivite, tagsSerieActivite,
  PROFILS_SERIES_PRIORITAIRES, SEUIL_PHOTOS_SUJET,
} from './series-photos-activites';
import { cibleProfil, filtrerCandidatesSourcing, hashtagsAcceptation, planRequetes, vocabulaireMetier, type CandidateSourcing } from './sourcing-photos';
import { activitePratique, controlerPratique, PRATIQUE_PODOLOGUE } from './pratiques';

const candidate = (i: number, description: string): CandidateSourcing => ({
  source: 'pexels', idSource: String(200000 + i), largeur: 3000, hauteur: 2000, apercu: `https://images.pexels.com/photos/${200000 + i}/p.jpeg`,
  telechargement: `https://images.pexels.com/photos/${200000 + i}/p.jpeg`, auteur: 'A', auteurUrl: null, pageUrl: `https://www.pexels.com/photo/x-${200000 + i}/`,
  description, tags: [], requete: 'x',
});

test('séries d’activité : données valides (activités, profils, requêtes)', () => {
  assert.deepEqual(controlerSeriesActivites(), []);
  assert.deepEqual(controlerPratique(PRATIQUE_PODOLOGUE), []);
  for (const a of ['basket', 'tennis', 'golf', 'cyclisme']) assert.ok(serieDeLActivite(a), a);
  assert.deepEqual([...PROFILS_SERIES_PRIORITAIRES], ['sport-basket', 'sport-tennis', 'sport-golf', 'sport-cyclisme']);
});

test('séries d’activité : requêtes par activité (pied, chaussure, appui d’abord, puis ambiance)', () => {
  const attendu: Record<string, { tete: string; ambiance: string; mot: RegExp }> = {
    basket: { tete: 'basketball sneakers court close up', ambiance: 'indoor basketball court floor light', mot: /basketball/ },
    tennis: { tete: 'tennis clay court shoes', ambiance: 'clay tennis court lines', mot: /tennis|padel/ },
    golf: { tete: 'golf shoes green grass', ambiance: 'golf course morning', mot: /golf/ },
    cyclisme: { tete: 'cycling shoes clipless pedal', ambiance: 'road bike countryside road', mot: /cycl|bike|pedal/ },
  };
  for (const [a, x] of Object.entries(attendu)) {
    const q = requetesSerieActivite('podologue', a);
    assert.equal(q[0], x.tete, a);
    assert.ok(q.includes(x.ambiance), a);
    assert.ok(q.length >= 8, `${a} : ${q.length} requêtes`);
    assert.ok(q.every((r) => x.mot.test(r)), `${a} : requêtes toutes de l’activité`);
    // Les 4 premières (prises d'office par le plan) parlent de pied, de chaussure ou d'appui
    for (const r of q.slice(0, 4)) assert.ok(/shoe|sneaker|feet|foot|footwork|legs|stance|pivot|jump|cleat|pedal/.test(r), `${a} : ${r}`);
    assert.equal(new Set(q).size, q.length);
  }
  // Cible du profil : requêtes de l'activité en tête, ambiance ensuite, plan qui commence par les requêtes d'appui
  for (const p of PROFILS_SERIES_PRIORITAIRES) {
    const c = cibleProfil('podologue', p)!;
    const a = activitePratique(PRATIQUE_PODOLOGUE, c.profil === 'sport-cyclisme' ? 'cyclisme' : c.profil!.slice(6))!;
    assert.deepEqual(c.requetes.slice(0, 4), a.requetes.slice(0, 4), p);
    assert.ok(serieDeLActivite(a.id)!.ambiance.every((q) => c.requetes.includes(q)), p);
    assert.deepEqual(planRequetes(c, { sources: ['pexels', 'pixabay'], graine: 5 }).slice(0, 4).map((x) => x.requete), a.requetes.slice(0, 4));
    assert.ok(c.coherence && c.raison.includes('série'), p);
  }
  // Trail / randonnée : les deux activités sont sourcées
  const rando = cibleProfil('podologue', 'sport-rando')!;
  assert.ok(rando.requetes.some((q) => q.startsWith('trail')) && rando.requetes.some((q) => q.startsWith('hiking')));
});

test('séries d’activité : exclusions (logos, marques, visages, enfants, texte) et terrain accepté', () => {
  const c = cibleProfil('podologue', 'sport-golf')!;
  const f = (d: string, cible = c) => filtrerCandidatesSourcing([candidate(1, d)], { profession: 'podologue', emplacements: cible.emplacements, exclusions: cible.exclusions, vocabulaire: cible.vocabulaire });
  assert.equal(f('golf course fairway morning mist').gardees.length, 1, 'ambiance du terrain gardée');
  assert.equal(filtrerCandidatesSourcing([candidate(1, 'golf course fairway morning mist')], { profession: 'podologue', emplacements: c.emplacements }).ecartees[0]?.raison, 'hors-metier', 'sans la série : hors métier');
  assert.equal(f('titleist golf ball on tee').ecartees[0]?.raison, 'marque');
  assert.equal(f('golf shoes with logo on grass').ecartees[0]?.raison, 'marque');
  assert.equal(f('kids playing golf on the green').ecartees[0]?.raison, 'enfant');
  assert.equal(f('golfer smiling portrait on fairway').ecartees[0]?.raison, 'visage');
  assert.equal(f('crowd watching golfer on the green').ecartees[0]?.raison, 'visage');
  assert.equal(f('scoreboard at golf course').ecartees[0]?.raison, 'texte');
  const basket = cibleProfil('podologue', 'sport-basket')!;
  assert.equal(f('nba basketball shoes hardwood', basket).ecartees[0]?.raison, 'marque');
  assert.equal(f('basketball sneakers on hardwood court', basket).gardees.length, 1);
  const velo = cibleProfil('podologue', 'sport-cyclisme')!;
  assert.equal(f('shimano pedal cycling shoe', velo).ecartees[0]?.raison, 'marque');
  assert.equal(f('cyclist race bib number on road', velo).ecartees[0]?.raison, 'texte');
  assert.equal(f('road cyclist legs pedaling clipless', velo).gardees.length, 1);
  const tennis = cibleProfil('podologue', 'sport-tennis')!;
  assert.equal(f('roland garros clay court', tennis).ecartees[0]?.raison, 'marque');
  assert.equal(f('girl tennis player feet', tennis).ecartees[0]?.raison, 'enfant');
  // Le vocabulaire du terrain reste propre à la cible : le vocabulaire général du podologue n'est pas élargi
  assert.ok(!vocabulaireMetier('podologue').has('fairway') && !vocabulaireMetier('podologue').has('court'));
  assert.ok(exclusionsSerie('golf').enfant.includes('children') && exclusionsSerie('golf').marque.includes('titleist'));
  assert.ok(!exclusionsSerie('basket').marque.includes('titleist'));
});

test('séries d’activité : tags automatiques (sujet, activité, profession) et raccourci « Sourcer des photos »', () => {
  assert.deepEqual(tagsSerieActivite('podologue', 'basket'), ['sport', 'basket', 'basketball', 'profession-podologue']);
  assert.deepEqual(tagsSerieActivite('podologue', 'golf'), ['sport', 'golf', 'profession-podologue']);
  assert.deepEqual(tagsSerieActivite('podologue', 'cyclisme'), ['sport', 'cyclisme', 'velo', 'profession-podologue']);
  const c = cibleProfil('podologue', 'sport-tennis')!;
  for (const t of ['sport', 'tennis', 'padel', 'profession-podologue']) assert.ok(c.hashtags.includes(t), t);
  assert.equal(c.profil, 'sport-tennis', 'la série arrive dans le sujet « Sport · tennis » d’À valider');
  const h = hashtagsAcceptation({ empreinte: 'abc123', cibleDetails: c }, { emplacement: 'activite:tennis' });
  for (const t of ['sport', 'tennis', 'profession-podologue', 'kit-sport', 'serie-abc123']) assert.ok(h.includes(t), t);
  // Profils à sourcer : sous le seuil, sans série en attente ; prioritaires d'abord
  assert.equal(SEUIL_PHOTOS_SUJET, 6);
  assert.deepEqual(profilsSeriesASourcer({}), ['sport-basket', 'sport-tennis', 'sport-golf', 'sport-cyclisme', 'sport-rando', 'sport-course']);
  assert.deepEqual(profilsSeriesASourcer({ 'sport-basket': 6, 'sport-rando': 9, 'sport-course': 12 }, ['sport-golf']), ['sport-tennis', 'sport-cyclisme']);
  // Toutes les séries : profils de référence existants
  for (const s of SERIES_ACTIVITES) assert.ok(PRATIQUE_PODOLOGUE.profils.some((p) => p.id === s.profil), s.profil);
});
