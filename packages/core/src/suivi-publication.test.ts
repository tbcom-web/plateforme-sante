// Suivi de publication (suivi-publication.ts) : étapes GitHub → libellés praticien, causes d'échec, vue affichée.
// Données tirées de runs réels du dépôt public (API GitHub, 2026-10-05) : 37277943224 réussi, 37363308132 « not acquired
// by Runner », 37363261518 annulé car remplacé, 37206936919 publication groupée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  causeEchecEnregistre,
  causeEchecGithub,
  etapeDuPas,
  etapesFaites,
  idRunDepuisUrl,
  interpreterSuivi,
  jobDuSite,
  runsCandidats,
  versionConcorde,
  type EntreeSuivi,
  type JobGithub,
} from './suivi-publication';

const PAS_REUSSIS = [
  'Set up job',
  'Run actions/checkout@v4',
  'Run actions/setup-node@v4',
  'Run npm ci',
  'Préparer (slug du site, suivi de publication)',
  'Construire le site',
  'Créer le projet Cloudflare Pages si besoin',
  'Déployer sur Cloudflare Pages',
  'Publication réussie (site en ligne, sauf site suspendu)',
  "Signaler l'échec de la publication",
  'Post Run actions/setup-node@v4',
  'Post Run actions/checkout@v4',
  'Complete job',
];

/** Job du run 37277943224 arrêté après les `n` premiers pas (le suivant en cours). */
const jobEnCours = (n: number): JobGithub => ({
  name: 'publier',
  status: 'in_progress',
  conclusion: null,
  steps: PAS_REUSSIS.map((name, i) => ({ name, status: i < n ? 'completed' : i === n ? 'in_progress' : 'pending', conclusion: i < n ? 'success' : null })),
});

test('pas techniques → étapes praticien', () => {
  assert.equal(etapeDuPas('Set up job'), 'preparation');
  assert.equal(etapeDuPas('Run actions/checkout@v4'), 'preparation');
  assert.equal(etapeDuPas('Run actions/setup-node@v4'), 'preparation');
  assert.equal(etapeDuPas('Run npm ci'), 'contenus');
  assert.equal(etapeDuPas('Préparer (slug du site, suivi de publication)'), 'contenus');
  assert.equal(etapeDuPas('Préparer (slug du site)'), 'contenus'); // ancien nom (publication groupée)
  assert.equal(etapeDuPas('Construire le site'), 'mise_en_page');
  assert.equal(etapeDuPas('Créer le projet Cloudflare Pages si besoin'), 'mise_en_ligne');
  assert.equal(etapeDuPas('Déployer sur Cloudflare Pages'), 'mise_en_ligne');
  assert.equal(etapeDuPas('Publication réussie (site en ligne, sauf site suspendu)'), 'mise_en_ligne');
  assert.equal(etapeDuPas('Passer le site en ligne'), 'mise_en_ligne');
  assert.equal(etapeDuPas("Signaler l'échec de la publication"), null);
  assert.equal(etapeDuPas('Post Run actions/checkout@v4'), null);
  assert.equal(etapeDuPas('Complete job'), null);
});

test('progression : suit les pas réels, monotone', () => {
  assert.equal(etapesFaites(null), 0);
  assert.equal(etapesFaites({ name: 'publier', status: 'queued', conclusion: null, steps: [] }), 0);
  const suite = PAS_REUSSIS.map((_, n) => etapesFaites(jobEnCours(n)));
  assert.deepEqual(suite, [0, 0, 0, 1, 1, 2, 3, 3, 3, 4, 4, 4, 4]);
  for (let i = 1; i < suite.length; i++) assert.ok(suite[i] >= suite[i - 1]);
});

test('causes d’échec GitHub (annotations réelles)', () => {
  const sansPas = { conclusion: 'cancelled', steps: [] };
  assert.equal(causeEchecGithub(sansPas, ['The job was not acquired by Runner of type hosted even after multiple attempts']), 'serveur_indisponible');
  assert.equal(
    causeEchecGithub(sansPas, ['Canceling since a higher priority waiting request for publier-be311b3b-d294-4939-b8ff-441cd4a70e68-production exists']),
    'remplacee',
  );
  assert.equal(causeEchecGithub(sansPas, []), 'serveur_indisponible');
  assert.equal(causeEchecGithub({ conclusion: 'cancelled', steps: [{ name: 'Set up job', status: 'completed', conclusion: 'success' }] }), 'annulee');
  assert.equal(causeEchecGithub({ conclusion: 'failure', steps: [] }, ['Process completed with exit code 1.']), 'construction');
  assert.equal(causeEchecEnregistre('Site incomplet : téléphone'), 'construction');
  assert.equal(causeEchecEnregistre('La publication n’a pas pu démarrer (GitHub 502).'), 'lancement');
  assert.equal(causeEchecEnregistre('Service de publication momentanément indisponible (aucun serveur disponible).'), 'serveur_indisponible');
});

test('run et job du site', () => {
  assert.equal(idRunDepuisUrl('https://github.com/tbcom-web/plateforme-sante/actions/runs/37277943224'), 37277943224);
  assert.equal(idRunDepuisUrl(null), null);
  const id = '59486101-b8ff-4f8a-a8bb-d045c01b8dc8';
  const groupe = [
    { name: 'publier (00000000-0000-0000-0000-000000000000) / publier', status: 'queued', conclusion: null },
    { name: `publier (${id}) / publier`, status: 'completed', conclusion: 'success' },
  ];
  assert.equal(jobDuSite(groupe, id)?.conclusion, 'success');
  assert.equal(jobDuSite([{ name: 'publier', status: 'queued', conclusion: null }], id)?.name, 'publier');
  assert.equal(jobDuSite(groupe, 'autre'), null);

  const runs = [
    { id: 1, status: 'completed', conclusion: 'cancelled', created_at: '2026-10-05T19:25:14Z', path: '.github/workflows/publier-site.yml', display_title: `publier-site production ${id}` },
    { id: 2, status: 'queued', conclusion: null, created_at: '2026-10-05T19:25:40Z', path: '.github/workflows/publier-site.yml', display_title: `publier-site production ${id}` },
    { id: 3, status: 'queued', conclusion: null, created_at: '2026-10-05T19:25:41Z', path: '.github/workflows/publier-site.yml', display_title: 'publier-site production autre-site' },
    { id: 4, status: 'queued', conclusion: null, created_at: '2026-10-05T19:25:42Z', path: '.github/workflows/publier-sites.yml', display_title: 'publier-sites' },
    { id: 5, status: 'completed', conclusion: 'success', created_at: '2026-10-05T07:28:35Z', path: '.github/workflows/publier-site.yml', display_title: `publier-site production ${id}` },
  ];
  const c = runsCandidats(runs, id, '2026-10-05T19:25:39.512+00:00');
  assert.deepEqual(c.directs.map((r) => r.id), [2, 1]);
  assert.deepEqual(c.groupes.map((r) => r.id), [4]);
});

test('version en ligne : concordance de l’horodatage ou du run', () => {
  const demande = '2026-10-05T07:28:33.123456+00:00';
  assert.ok(versionConcorde({ publication: '2026-10-05T07:28:33.123456+00:00' }, demande));
  assert.ok(versionConcorde({ publication: '2026-10-05T07:28:33.123Z' }, demande));
  assert.ok(!versionConcorde({ publication: '2026-10-04T20:30:16Z' }, demande));
  assert.ok(versionConcorde({ publication: null, run: '37277943224' }, demande, 37277943224));
  assert.ok(!versionConcorde(null, demande));
  assert.ok(!versionConcorde({ publication: '' }, demande));
  assert.ok(!versionConcorde('<html>', demande));
});

const T0 = Date.parse('2026-10-05T07:28:35Z');
const entree = (x: Partial<EntreeSuivi> & { base?: Partial<EntreeSuivi['base']> }): EntreeSuivi => ({
  job: null,
  versionConfirmee: null,
  maintenant: T0 + 20_000,
  ...x,
  base: { etat: 'en_cours', debut: new Date(T0).toISOString(), fin: null, erreur: null, ...x.base },
});

test('vue : attente, étapes, vérification, en ligne', () => {
  const attente = interpreterSuivi(entree({}));
  assert.equal(attente.phase, 'attente');
  assert.equal(attente.titre, 'En attente d’une place de publication…');
  assert.equal(attente.etapes[0].etat, 'en_cours');
  assert.equal(attente.faites, 0);
  assert.ok(!attente.termine);
  assert.match(interpreterSuivi(entree({ maintenant: T0 + 3 * 60_000 })).detail, /très sollicités/);

  const construction = interpreterSuivi(entree({ job: jobEnCours(5) }));
  assert.equal(construction.phase, 'en_cours');
  assert.equal(construction.titre, 'Mise en page et mise en forme des illustrations…');
  assert.deepEqual(construction.etapes.map((x) => x.etat), ['faite', 'faite', 'en_cours', 'a_venir', 'a_venir']);
  assert.equal(interpreterSuivi(entree({ job: jobEnCours(3) })).titre, 'Récupération de vos contenus…');
  assert.equal(interpreterSuivi(entree({ job: jobEnCours(7) })).titre, 'Mise en ligne sécurisée…');
  assert.equal(interpreterSuivi(entree({ job: jobEnCours(10) })).titre, 'Dernières vérifications…');

  const reussi: JobGithub = { ...jobEnCours(PAS_REUSSIS.length), status: 'completed', conclusion: 'success' };
  assert.equal(interpreterSuivi(entree({ job: reussi })).phase, 'verification');

  const fin = new Date(T0 + 50_000).toISOString();
  const verif = interpreterSuivi(entree({ base: { etat: 'ok', fin }, maintenant: T0 + 55_000, versionConfirmee: false }));
  assert.equal(verif.phase, 'verification');
  assert.deepEqual(verif.etapes.map((x) => x.etat), ['faite', 'faite', 'faite', 'faite', 'en_cours']);
  const enLigne = interpreterSuivi(entree({ base: { etat: 'ok', fin }, maintenant: T0 + 58_000, versionConfirmee: true }));
  assert.equal(enLigne.phase, 'en_ligne');
  assert.equal(enLigne.titre, 'Ça y est, votre site est en ligne');
  assert.equal(enLigne.faites, enLigne.total);
  assert.ok(enLigne.termine);
  const tard = interpreterSuivi(entree({ base: { etat: 'ok', fin }, maintenant: T0 + 50_000 + 61_000, versionConfirmee: false }));
  assert.equal(tard.phase, 'en_ligne_propagation');
  assert.match(tard.detail, /quelques instants/);
  assert.ok(tard.termine);
});

test('vue : échecs et publication remplacée', () => {
  const jamaisLance: JobGithub = { name: 'publier', status: 'completed', conclusion: 'cancelled', steps: [] };
  const panne = interpreterSuivi(entree({ job: jamaisLance, runConclusion: 'failure', annotations: ['The job was not acquired by Runner of type hosted even after multiple attempts'] }));
  assert.equal(panne.phase, 'echec');
  assert.equal(panne.cause, 'serveur_indisponible');
  assert.match(panne.detail, /n’a pas changé/);
  assert.ok(panne.termine);

  const remplacee = interpreterSuivi(entree({ job: jamaisLance, runConclusion: 'cancelled', annotations: ['Canceling since a higher priority waiting request for publier-x-production exists'] }));
  assert.equal(remplacee.phase, 'attente');
  assert.ok(!remplacee.termine);

  const incomplet = interpreterSuivi(entree({ base: { etat: 'echec', erreur: 'Site incomplet : téléphone du cabinet' } }));
  assert.equal(incomplet.titre, 'La publication n’a pas abouti');
  assert.match(incomplet.detail, /^Site incomplet : téléphone du cabinet\. Votre site en ligne n’a pas changé\.$/);
  assert.match(interpreterSuivi(entree({ base: { etat: 'echec', erreur: 'La construction ou la mise en ligne a échoué : voir le journal de publication.' } })).detail, /Votre site en ligne n’a pas changé/);

  const oubliee = interpreterSuivi(entree({ maintenant: T0 + 31 * 60_000 }));
  assert.equal(oubliee.phase, 'echec');
  assert.equal(oubliee.cause, 'interrompue');

  assert.equal(interpreterSuivi(entree({ base: { etat: null } })).phase, 'aucune');
});
