// Analyse de la foulée (analyse-course.ts, retours de Paul du 2026-10-10 : le coureur à rotules « fait robot » ; « des chiffres qui
// apparaissent sur une image de coureur, sur un pied de course, avec les données classiques ») : héros sport, visuel animé, photo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DONNEES_COURSE, DONNEES_TELEPHONE, etapesCompteur, svgAnalyseCourse, CLES_ANALYSE_COURSE, HASHTAGS_ANALYSE_COURSE, htmlDonneesCourse, PHASE_ANALYSE } from './analyse-course';
import { illustrationTheme, teintesRelevesClair, fondsClairsGamme } from './heros-themes';
import { GAMMES, variantesGamme } from './gammes';
import { NEUTRES } from './charte';
import { contraste, melanger } from './couleurs';
import { inventaireIllustrations } from './illustrations';
import { HASHTAGS_PAR_DEFAUT } from './kits';
import { estHashtag } from './hashtags';
import { PRATIQUE_PODOLOGUE } from './pratiques';
import { activitesReconnues, kitDuProfil, profilParId } from './profils';
import { animationsHerosDuSujet, animationDuHeros } from './heros-anime';
import { familleNouveaute } from './nouveautes';
import { INGREDIENTS_A_VALIDER } from './heros-photo-variantes';
import { htmlTracePhoto, cssTracePhoto, poidsTracePhoto, tracePhotoPermis } from './photo-trace';
import { poseCoureur } from './foulee';

test('données : valeurs génériques plausibles d’un coureur loisir, unités françaises, jamais de norme ni de verdict', () => {
  const v = Object.fromEntries(DONNEES_COURSE.map((d) => [d.id, Number(d.valeur.replace(',', '.'))]));
  assert.ok(v.cadence >= 170 && v.cadence <= 180);
  assert.ok(v.contact >= 220 && v.contact <= 260);
  assert.ok(v.attaque >= 5 && v.attaque <= 10);
  assert.ok(v.oscillation >= 7 && v.oscillation <= 9);
  assert.ok(v.foulee >= 1.1 && v.foulee <= 1.3);
  assert.deepEqual(DONNEES_COURSE.map((d) => d.unite), ['pas/min', 'ms', '°', 'cm', 'm']);
  const tout = JSON.stringify(DONNEES_COURSE) + svgAnalyseCourse() + htmlDonneesCourse(true, 'x');
  assert.doesNotMatch(tout, /normal|patient|résultat|idéal|optimal|risque/i, 'ni norme, ni verdict');
  assert.ok(DONNEES_COURSE.every((d) => !d.valeur.includes('.')), 'virgule décimale');
  // Compteur : croissant, finit sur la valeur, mêmes décimales
  for (const d of DONNEES_COURSE) {
    const e = etapesCompteur(d.valeur, 4);
    assert.equal(e.at(-1), d.valeur);
    assert.ok(e.every((x) => (x.split(',')[1]?.length ?? 0) === (d.valeur.split(',')[1]?.length ?? 0)), d.id);
  }
  // Pose : juste avant l'attaque du talon (cinématique de foulee.ts)
  assert.ok(PHASE_ANALYSE > 0.95 && PHASE_ANALYSE < 1);
  assert.ok(poseCoureur(PHASE_ANALYSE, 1).droite.cheville.x > 0, 'pied d’attaque devant le bassin');
});

test('héros sport (relevé) : analyse de la foulée, plus le coureur à rotules ; SVG < 5 Ko, sans rotule ni point blanc', () => {
  for (const f of ['paysage', 'portrait'] as const) {
    const s = svgAnalyseCourse(f);
    assert.ok(Buffer.byteLength(s) < 5120, `${f} : ${Buffer.byteLength(s)} octets`);
    assert.doesNotMatch(s, /<circle|grille-labo|NaN|undefined/, f);
    // Téléphone (portrait) : trois données ; paysage : trois aussi (le héros est réduit dans son cadre)
    assert.equal((s.match(/class="ac-l"/g) ?? []).length, DONNEES_TELEPHONE, f);
    for (const sf of [null, 'clair', 'sombre'] as const) {
      const h = illustrationTheme('sport', { format: f, registre: 'releve', gamme: 'canard', sansFond: sf });
      assert.ok(h.includes('dessin--analyse-course') && !h.includes('grille-labo'), `${f} ${sf}`);
      assert.match(h, /<title>[^<]*dessin:analyse-course/);
    }
  }
  // L'ancien coureur reste noté et jouable en duel : animation:coureur toujours dans l'inventaire
  const cles = new Set(inventaireIllustrations().map((i) => i.cle));
  assert.ok(cles.has('animation:coureur'));
  for (const c of CLES_ANALYSE_COURSE) assert.ok(cles.has(c), c);
});

test('contraste ≥ 3:1 des traits significatifs sur les 17 gammes (page claire, surface sombre, pédagogique) ; textes ≥ 4,5:1', () => {
  assert.equal(GAMMES.length, 17);
  for (const g of GAMMES) {
    const c = teintesRelevesClair(g);
    for (const fond of fondsClairsGamme(g)) {
      assert.ok(contraste(c.encre, fond) >= 4.5, `${g.id} encre / ${fond}`);
      assert.ok(contraste(c.accent, fond) >= 3, `${g.id} accent / ${fond}`);
      // Libellés et unités (opacité 0,82) et jambe arrière (0,62) : lisibles sur la page
      assert.ok(contraste(melanger(fond, c.encre, 0.82), fond) >= 4.5, `${g.id} libellés / ${fond}`);
      assert.ok(contraste(melanger(fond, c.encre, 0.62), fond) >= 3, `${g.id} jambe arrière / ${fond}`);
    }
    // Surface sombre (relevé encadré, premier écran plein) : papier et signal sur le plan
    assert.ok(contraste(NEUTRES.papier, g.plan) >= 4.5, `${g.id} papier / plan`);
    assert.ok(contraste(g.signal, g.plan) >= 3, `${g.id} signal / plan`);
  }
  void variantesGamme;
});

test('inventaire, hashtags, kit « Sport · course », nouveautés, jamais chez un praticien', () => {
  for (const c of CLES_ANALYSE_COURSE) {
    assert.deepEqual(HASHTAGS_PAR_DEFAUT[c], HASHTAGS_ANALYSE_COURSE[c]);
    for (const h of ['sport', 'course', 'running', 'marathon']) assert.ok(HASHTAGS_ANALYSE_COURSE[c].includes(h), `${c} #${h}`);
    assert.ok(HASHTAGS_ANALYSE_COURSE[c].every(estHashtag));
    assert.equal(familleNouveaute(c).id, 'analyse-course');
    // Activité reconnue : la course (jamais le trail en plus : un visuel de deux activités sortirait des deux kits)
    assert.deepEqual(activitesReconnues({ cle: c, tags: [...HASHTAGS_ANALYSE_COURSE[c]] }, PRATIQUE_PODOLOGUE), ['course']);
  }
  const profil = profilParId('sport-course')!;
  const visuels = { visuels: CLES_ANALYSE_COURSE.map((cle) => ({ cle, type: 'dessin' as const, soins: [] })), hashtags: HASHTAGS_ANALYSE_COURSE };
  assert.ok(JSON.stringify(kitDuProfil(profil, { visuels }).activites).includes('dessin:analyse-course:releve'));
  assert.ok(!JSON.stringify(kitDuProfil(profil, { visuels }, { praticien: true }).activites).includes('analyse-course'));
  for (const k of ['composant:entete-anim:pi-analyse-course', 'composant:trace-photo:analyse', 'composant:trace-photo:analyse-anime']) {
    assert.ok(INGREDIENTS_A_VALIDER.has(k), k);
    assert.equal(familleNouveaute(k).id, 'analyse-course', k);
  }
  // Visuel animé du sport : l'analyse en premier pour Paul, jamais pour un praticien avant validation
  assert.equal(animationsHerosDuSujet('sport')[0]?.animation, 'pi-analyse-course');
  assert.equal(animationDuHeros({ 'visuel-heros': 'animation' }, 'sport'), 'pi-analyse-course');
  assert.notEqual(animationDuHeros({ 'visuel-heros': 'animation' }, 'sport', { praticien: true }), 'pi-analyse-course');
  for (const s of ['diabete', 'senior', 'enfant']) assert.ok(!animationsHerosDuSujet(s).some((x) => x.animation === 'pi-analyse-course'), s);
});

test('photo + analyse : course et trail seulement, plaque lisible, téléphone trois données, < 4 Ko, animée sans transform', () => {
  for (const t of ['analyse', 'analyse-anime'] as const) {
    assert.ok(poidsTracePhoto(t) < 4096, `${t} : ${poidsTracePhoto(t)} o`);
    assert.ok(tracePhotoPermis(t, { photo: '/photos/sport-course.webp' }) && tracePhotoPermis(t, { photo: '/photos/sport-trail.webp' }));
    assert.ok(!tracePhotoPermis(t, { photo: '/photos/tennis-court.webp', activites: ['tennis'] }));
    const css = cssTracePhoto(t), html = htmlTracePhoto(t);
    assert.match(css, /background:rgb\(8 12 16\/\.62\)/, 'plaque sombre : blanc ≥ 6:1 sur toute photo');
    assert.match(css, /@container \(max-width:520px\)\{\.tp-a \.ac-r4,\.tp-a \.ac-r5\{display:none\}/);
    assert.equal((html.match(/<dt>/g) ?? []).length, DONNEES_COURSE.length);
  }
  // Pire cas : plaque à 62 % de noir posée sur une photo blanche
  const plaque = melanger('#ffffff', '#080c10', 0.62);
  assert.ok(contraste('#ffffff', plaque) >= 4.5);
  assert.ok(contraste(melanger(plaque, '#ffffff', 0.88), plaque) >= 4.5, 'libellés');
});
