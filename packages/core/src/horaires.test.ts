// Horaires structurés (horaires.ts) : lecture des anciens formats, regroupement, schema.org, avertissements.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lireHeure, lirePlages, plagesDe, horaireDe, normaliserHoraires, regrouperHoraires, libelleJours, resumeHoraires, lignesHoraires,
  specificationsHoraires, avertissementsHoraires, avertissementsNoteHoraires, copierJour, MODELES_HORAIRES, plageSuivante,
  journeeContinue, phraseJoursDomicile, mentionsHoraires, HEURES_CHOIX, semaineFermee, definirJour,
} from './horaires';
import { normaliserDraft, horairesParDefaut, draftVide } from './draft';
import { controlerPublication } from './controles';
import type { Horaire } from './types';

const P = (debut: string, fin: string) => ({ debut, fin });
/** Semaine de la démo : lundi-mercredi 9-12/14-19, jeudi 8h30-17h, vendredi et samedi 9-12. */
const demo = (): Horaire[] => [
  horaireDe('Lundi', [P('09:00', '12:00'), P('14:00', '19:00')]),
  horaireDe('Mardi', [P('09:00', '12:00'), P('14:00', '19:00')]),
  horaireDe('Mercredi', [P('09:00', '12:00'), P('14:00', '19:00')]),
  horaireDe('Jeudi', [P('08:30', '17:00')]),
  horaireDe('Vendredi', [P('09:00', '12:00')]),
  horaireDe('Samedi', [P('09:00', '12:00')]),
  horaireDe('Dimanche', []),
];

test('lecture des heures', () => {
  assert.equal(lireHeure('9h'), '09:00');
  assert.equal(lireHeure('9h30'), '09:30');
  assert.equal(lireHeure('09:15'), '09:15');
  assert.equal(lireHeure('14'), '14:00');
  assert.equal(lireHeure('25h'), null);
  assert.equal(HEURES_CHOIX[0].value, '06:00');
  assert.equal(HEURES_CHOIX[1].value, '06:15');
  assert.equal(HEURES_CHOIX.at(-1)!.value, '22:00');
  assert.equal(HEURES_CHOIX[4].label, '7h00');
});

test('anciens formats en texte libre', () => {
  assert.deepEqual(lirePlages('9h00–12h30, 14h00–19h00'), { plages: [P('09:00', '12:30'), P('14:00', '19:00')], reste: '' });
  assert.deepEqual(lirePlages('9h-12h / 14h-19h').plages, [P('09:00', '12:00'), P('14:00', '19:00')]);
  assert.deepEqual(lirePlages('de 8h30 à 17h').plages, [P('08:30', '17:00')]);
  assert.deepEqual(lirePlages('Fermé'), { plages: [], reste: '' });
  assert.deepEqual(lirePlages(''), { plages: [], reste: '' });
  assert.deepEqual(lirePlages('Sur rendez-vous'), { plages: [], reste: 'Sur rendez-vous' });
  // Plages lues, mais le texte autour est gardé (rien n'est perdu)
  assert.equal(lirePlages('9h-12h, visites l’après-midi').reste, '9h-12h, visites l’après-midi');
});

test('normalisation : 7 jours, plages, texte non interprété gardé', () => {
  const { horaires, nonLus } = normaliserHoraires([
    { jour: 'Lundi', heures: '9h-12h / 14h-19h' },
    { jour: 'Mardi', heures: 'Sur rendez-vous' },
    { jour: 'Samedi', heures: '9h–12h' },
  ]);
  assert.equal(horaires.length, 7);
  assert.deepEqual(horaires.map((h) => h.jour), ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']);
  assert.equal(horaires[0].heures, '9h00–12h00, 14h00–19h00');
  assert.deepEqual(horaires[1].plages, []);
  assert.equal(horaires[2].heures, 'Fermé');
  assert.deepEqual(horaires[5].plages, [P('09:00', '12:00')]);
  assert.deepEqual(nonLus, ['Mardi : Sur rendez-vous']);
  // Idempotente
  assert.deepEqual(normaliserHoraires(horaires).horaires, horaires);
});

test('plages et texte : le texte modifié seul (ancien code) fait foi', () => {
  const h = horaireDe('Lundi', [P('09:00', '12:00')]);
  assert.deepEqual(plagesDe(h), [P('09:00', '12:00')]);
  assert.deepEqual(plagesDe({ ...h, heures: '' }), []);
  assert.deepEqual(plagesDe({ ...h, heures: '8h-10h' }), [P('08:00', '10:00')]);
  assert.deepEqual(plagesDe({ heures: '9h00–12h30' }), [P('09:00', '12:30')]);
});

test('brouillon : anciens horaires convertis, note du lieu complétée', () => {
  const d = normaliserDraft({ version: 2, lieux: [{ id: 'a', horaires: [{ jour: 'Lundi', heures: '9h-12h' }, { jour: 'Mardi', heures: 'les semaines paires' }], noteHoraires: 'Fermé en août' }] });
  const l = d.lieux[0];
  assert.equal(l.horaires.length, 7);
  assert.deepEqual(l.horaires[0].plages, [P('09:00', '12:00')]);
  assert.equal(l.noteHoraires, 'Fermé en août ; Mardi : les semaines paires');
  assert.equal(l.surRendezVous, false);
  assert.deepEqual(d.domicile.jours, []);
  // Une seconde normalisation ne double pas la note
  assert.equal(normaliserDraft(d).lieux[0].noteHoraires, 'Fermé en août ; Mardi : les semaines paires');
  // Version 1 et défaut
  assert.equal(normaliserDraft({ cabinet: { horaires: [{ jour: 'Jeudi', heures: '8h30–17h' }] } }).lieux[0].horaires[3].heures, '8h30–17h00');
  assert.equal(horairesParDefaut()[0].heures, '9h00–12h30, 14h00–19h00');
  assert.equal(draftVide().lieux[0].horaires[5].heures, 'Fermé');
});

test('regroupement des jours consécutifs identiques', () => {
  const g = regrouperHoraires(demo());
  assert.deepEqual(g.map((x) => [libelleJours(x.jours), x.texte, x.numeros]), [
    ['Lundi au mercredi', '9h00–12h00, 14h00–19h00', '1 2 3'],
    ['Jeudi', '8h30–17h00', '4'],
    ['Vendredi et samedi', '9h00–12h00', '5 6'],
    ['Dimanche', 'Fermé', '0'],
  ]);
  assert.equal(resumeHoraires(demo()), 'Lundi au mercredi : 9h00–12h00, 14h00–19h00 ; Jeudi : 8h30–17h00 ; Vendredi et samedi : 9h00–12h00');
  assert.equal(lignesHoraires(demo()).at(-1), 'Dimanche : fermé');
  assert.equal(resumeHoraires(semaineFermee()), '');
  // Ordre de saisie indifférent
  const inverse = definirJour(demo(), 'Lundi', [P('14:00', '19:00'), P('09:00', '12:00')]);
  assert.equal(regrouperHoraires(inverse)[0].jours.length, 3);
});

test('JSON-LD OpeningHoursSpecification exact', () => {
  const s = specificationsHoraires(demo());
  assert.deepEqual(s, [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['https://schema.org/Monday', 'https://schema.org/Tuesday', 'https://schema.org/Wednesday', 'https://schema.org/Friday', 'https://schema.org/Saturday'], opens: '09:00', closes: '12:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['https://schema.org/Monday', 'https://schema.org/Tuesday', 'https://schema.org/Wednesday'], opens: '14:00', closes: '19:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Thursday', opens: '08:30', closes: '17:00' },
  ]);
  assert.deepEqual(specificationsHoraires(semaineFermee()), []);
  // Plage incohérente ignorée (jamais de donnée fausse pour Google)
  assert.deepEqual(specificationsHoraires([horaireDe('Lundi', [P('12:00', '09:00')])]), []);
});

test('avertissements doux : fin avant début, chevauchement, note', () => {
  const h = [horaireDe('Lundi', [P('12:00', '09:00')]), horaireDe('Mardi', [P('09:00', '13:00'), P('12:00', '19:00')]), horaireDe('Mercredi', [P('09:00', '12:00')])];
  const a = avertissementsHoraires(h);
  assert.equal(a.length, 2);
  assert.match(a[0], /^Lundi : la plage 12h00–9h00 se termine avant de commencer/);
  assert.match(a[1], /^Mardi : les plages 9h00–13h00 et 12h00–19h00 se chevauchent/);
  assert.match(avertissementsHoraires(h, '(lieu 2)')[0], /^Lundi \(lieu 2\)/);
  assert.deepEqual(avertissementsHoraires(demo()), []);
  assert.deepEqual(avertissementsNoteHoraires('Fermé en août'), []);
  assert.match(avertissementsNoteHoraires('Soins garantis sans attente')[0], /Note des horaires/);
  assert.equal(avertissementsNoteHoraires('x'.repeat(130)).length, 1);
});

test('contrôles : avertissements des horaires dans les conseils, jamais bloquants', () => {
  const d = draftVide();
  d.lieux[0].horaires = definirJour(d.lieux[0].horaires, 'Lundi', [P('12:00', '09:00')]);
  const r = controlerPublication(d);
  assert.equal(r.bloquants.length, 0);
  assert.ok(r.conseils.some((c) => /^Lundi : la plage/.test(c)));
});

test('accélérateurs : copier, modèles, plage suivante, journée continue', () => {
  const c = copierJour(demo(), 'Jeudi', ['Lundi', 'Dimanche']);
  assert.equal(c[0].heures, '8h30–17h00');
  assert.equal(c[6].heures, '8h30–17h00');
  assert.equal(c[1].heures, '9h00–12h00, 14h00–19h00');
  const coupee = MODELES_HORAIRES.find((m) => m.id === 'coupee')!.appliquer(semaineFermee());
  assert.equal(resumeHoraires(coupee), 'Lundi au vendredi : 9h00–12h00, 14h00–19h00');
  const samedi = MODELES_HORAIRES.find((m) => m.id === 'samedi-matin')!.appliquer(coupee);
  assert.equal(resumeHoraires(samedi), 'Lundi au vendredi : 9h00–12h00, 14h00–19h00 ; Samedi : 9h00–12h00');
  assert.deepEqual(plageSuivante([]), P('09:00', '12:00'));
  assert.deepEqual(plageSuivante([P('09:00', '12:00')]), P('14:00', '19:00'));
  assert.deepEqual(journeeContinue([P('09:00', '12:00'), P('14:00', '19:00')]), [P('09:00', '19:00')]);
});

test('mentions et visites à domicile', () => {
  assert.deepEqual(mentionsHoraires({ surRendezVous: true, noteHoraires: ' Fermé en août ' }), ['Sur rendez-vous uniquement', 'Fermé en août']);
  assert.deepEqual(mentionsHoraires({}), []);
  assert.equal(phraseJoursDomicile(['Jeudi', 'Mardi']), 'Le mardi et le jeudi');
  assert.equal(phraseJoursDomicile(['Lundi', 'Mardi', 'Vendredi']), 'Le lundi, le mardi et le vendredi');
  assert.equal(phraseJoursDomicile([]), '');
});
