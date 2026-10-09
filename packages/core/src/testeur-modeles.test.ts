// Testeur de modèles (testeur-modeles.ts) : contrôles purs, tickets, verdicts, check / re-check, règle de validation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyserFondTexte, aRetester, bilanControle, chevauchements, cheminResultatTest, comparerVersions, creerTicket, defautsPerformance, defautsSeo,
  dedoublonner, estGrandTexte, etapeApresTest, fusionnerResultats, graviteCibleTactile, liensCasses, lireResultatTesteur, masquerDonnees, modeTestPourEtape,
  pageModeleDeChemin, ratioContraste, regleValidationModele, seuilContraste, verdictControle, verdictTest, verrouTesteur, type ResultatTesteur,
} from './testeur-modeles';
import { normaliserResultatTest } from './chaine-modeles-format';

const ticket = (o: Partial<Parameters<typeof creerTicket>[0]> = {}) =>
  creerTicket({ modele: 'm1', version: 2, controle: 'contraste', chemin: '/soins/bilan', largeur: 375, gravite: 'majeur', commentaire: 'Texte peu lisible', suggestion: 'Foncer le texte', ...o });

test('pages du format commun d’après le chemin', () => {
  assert.equal(pageModeleDeChemin('/'), 'accueil');
  assert.equal(pageModeleDeChemin('/index.html'), 'accueil');
  assert.equal(pageModeleDeChemin('/themes/sport'), 'theme');
  assert.equal(pageModeleDeChemin('/soins'), 'soins');
  assert.equal(pageModeleDeChemin('/soins/bilan-podologique'), 'fiche');
  assert.equal(pageModeleDeChemin('/le-cabinet'), 'cabinet');
  assert.equal(pageModeleDeChemin('/acces'), 'acces');
  assert.equal(pageModeleDeChemin('/actualites/x'), 'article');
  assert.equal(pageModeleDeChemin('/404'), 'accueil');
});

test('ticket : format commun, zone normalisée, empreinte stable, données masquées', () => {
  const t = ticket({ zonePx: { x: 100, y: 50, l: 75, h: 25 }, surface: { l: 375, h: 1000 }, element: 'p « 04 78 12 34 56 »' });
  assert.equal(t.origine, 'testeur');
  assert.equal(t.statut, 'ouvert');
  assert.equal(t.numero, 0);
  assert.equal(t.page, 'fiche');
  assert.equal(t.appareil, 'mobile');
  assert.equal(t.etiquette, 'technique:contraste');
  assert.deepEqual(t.zone, { forme: 'rect', x: 100 / 375, y: 0.05, l: 0.2, h: 0.025 });
  assert.ok(!t.element?.includes('04 78'));
  assert.equal(t.empreinte, ticket({ zonePx: { x: 1, y: 1, l: 1, h: 1 }, element: 'p « 04 78 12 34 56 »' }).empreinte);
  assert.notEqual(t.empreinte, ticket({ largeur: 1440 }).empreinte);
  assert.equal(creerTicket({ modele: 'm', version: 1, controle: 'debordement', chemin: '/', largeur: 1440, gravite: 'bloquant', commentaire: '', suggestion: '' }).appareil, 'ordinateur');
  assert.equal(masquerDonnees('Écrire à camille@exemple.fr ou au 06 12 34 56 78'), 'Écrire à [e-mail] ou au [téléphone]');
  // Le ticket passe la lecture du format commun de la chaîne
  const r = normaliserResultatTest({ modele: 'm1', version: 2, verdict: 'orange', controles: [], tickets: [t], le: '2026-10-09T00:00:00Z' });
  assert.equal(r?.tickets.length, 1);
  assert.equal(r?.tickets[0].controle, 'contraste');
  // Champs facultatifs du testeur gardés par le format commun
  assert.equal(r?.tickets[0].empreinte, t.empreinte);
  assert.equal(r?.tickets[0].suggestion, 'Foncer le texte');
  assert.equal(r?.tickets[0].chemin, '/soins/bilan');
});

test('verdicts : bloquant → rouge, majeur ou non mesuré → orange, mineur → vert', () => {
  assert.equal(verdictControle([{ gravite: 'mineur' }]), 'vert');
  assert.equal(verdictControle([{ gravite: 'majeur' }]), 'orange');
  assert.equal(verdictControle([], true), 'orange');
  assert.equal(verdictControle([{ gravite: 'bloquant' }, { gravite: 'mineur' }]), 'rouge');
  assert.equal(verdictTest([{ verdict: 'vert' }], [{ gravite: 'bloquant' }]), 'rouge');
  assert.equal(verdictTest([{ verdict: 'vert' }], []), 'vert');
  const b = bilanControle('contraste', [ticket(), ticket({ controle: 'liens', gravite: 'bloquant' })], { mesure: '1 texte sous AA', seuil: '≥ 4,5:1' });
  assert.equal(b.tickets, 1);
  assert.equal(b.verdict, 'orange');
  assert.equal(dedoublonner([ticket(), ticket({ gravite: 'bloquant' })])[0].gravite, 'bloquant');
});

test('contraste réel : fond uni, texte clair, texte sur photo', () => {
  assert.ok(Math.abs(ratioContraste([0, 0, 0], [255, 255, 255]) - 21) < 0.01);
  assert.equal(estGrandTexte(24, 400), true);
  assert.equal(estGrandTexte(19, 700), true);
  assert.equal(estGrandTexte(18, 700), false);
  assert.equal(seuilContraste(16, 400), 4.5);
  const L = 40, H = 20;
  const image = (fond: (x: number, y: number) => number[]) => {
    const p = new Uint8Array(L * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) { const c = fond(x, y); p.set([c[0], c[1], c[2], 255], (y * L + x) * 4); }
    return p;
  };
  // Texte gris foncé (#333) sur blanc, quelques « lettres »
  const blanc = image((x, y) => (x % 7 === 0 && y > 5 && y < 15 ? [51, 51, 51] : [255, 255, 255]));
  const a = analyserFondTexte(blanc, L, H, { x: 0, y: 0, l: L, h: H }, [51, 51, 51])!;
  assert.equal(a.uni, true);
  assert.ok(a.retenu > 12);
  // Texte jaune pâle sur blanc : échec
  const pale = analyserFondTexte(image(() => [255, 255, 255]), L, H, { x: 0, y: 0, l: L, h: H }, [250, 230, 120])!;
  assert.ok(pale.retenu < 1.5);
  // Texte blanc sur photo mi-sombre mi-claire : le 10e centile attrape la partie claire
  const photo = analyserFondTexte(image((x) => (x < 20 ? [20, 30, 40] : [230, 230, 220])), L, H, { x: 0, y: 0, l: L, h: H }, [255, 255, 255])!;
  assert.equal(photo.uni, false);
  assert.ok(photo.retenu < 1.5);
  // Texte semi-transparent : mélangé à son fond
  const transparent = analyserFondTexte(image(() => [255, 255, 255]), L, H, { x: 0, y: 0, l: L, h: H }, [0, 0, 0], 0.3)!;
  assert.ok(transparent.retenu < 3);
  assert.equal(analyserFondTexte(blanc, L, H, { x: 0, y: 0, l: 1, h: 1 }, [0, 0, 0]), null);
});

test('chevauchements : textes qui se recouvrent, parents exclus', () => {
  const r = chevauchements([
    { id: 1, x: 0, y: 0, l: 100, h: 40, type: 'texte', ancetres: [] },
    { id: 2, x: 10, y: 10, l: 100, h: 40, type: 'texte', ancetres: [] },
    { id: 3, x: 0, y: 0, l: 8, h: 8, type: 'interactif', ancetres: [1] },
    { id: 4, x: 0, y: 200, l: 50, h: 20, type: 'texte', ancetres: [] },
  ]);
  assert.deepEqual(r.map((x) => [x.a.id, x.b.id].sort()), [[1, 2]]);
  // Texte en ligne sur deux lignes : sa boîte englobante recouvre le voisin, pas ses lignes
  const enLigne = chevauchements([
    { id: 1, x: 0, y: 0, l: 300, h: 40, type: 'texte', ancetres: [], lignes: [{ x: 200, y: 0, l: 100, h: 20 }, { x: 0, y: 20, l: 120, h: 20 }] },
    { id: 2, x: 130, y: 20, l: 150, h: 20, type: 'texte', ancetres: [] },
  ]);
  assert.equal(enLigne.length, 0);
});

test('cibles tactiles : 44 px, 24 px minimum, liens en ligne exemptés', () => {
  assert.equal(graviteCibleTactile({ l: 120, h: 48, enLigne: false }), null);
  assert.equal(graviteCibleTactile({ l: 120, h: 32, enLigne: false }), 'mineur');
  assert.equal(graviteCibleTactile({ l: 18, h: 18, enLigne: false }), 'majeur');
  assert.equal(graviteCibleTactile({ l: 40, h: 18, enLigne: true }), null);
});

test('liens internes : page absente, ancre absente, fichiers et liens externes ignorés', () => {
  const r = liensCasses(
    [
      { chemin: '/', liens: ['/soins', '/soins#faq', '/inexistant', '#haut', '#absent', 'https://exemple.fr/x', 'tel:+33400000000', '/photos/a.webp', '/llms.txt?x=1'], ids: ['haut'] },
      { chemin: '/soins', liens: ['bilan', '/#haut'], ids: ['faq'] },
      { chemin: '/soins/bilan', liens: ['/soins/bilan#etapes'], ids: [] },
    ],
    new Set(['photos/a.webp', 'llms.txt']),
  );
  assert.deepEqual(r, [
    { page: '/', href: '/inexistant', raison: 'page' },
    { page: '/', href: '#absent', raison: 'ancre' },
    { page: '/soins', href: 'bilan', raison: 'page' }, // relatif à /soins → /bilan (comme un navigateur)
    { page: '/soins/bilan', href: '/soins/bilan#etapes', raison: 'ancre' },
  ]);
});

test('SEO d’une page', () => {
  const ok = { title: 'Pédicure-podologue à Lyon', description: 'x'.repeat(120), canonical: 'https://a.fr/', robots: 'index', lang: 'fr', h1: 1, jsonld: ['{"@context":"https://schema.org","@type":"Physician"}'] };
  assert.deepEqual(defautsSeo(ok), []);
  assert.equal(defautsSeo({ ...ok, jsonld: ['{x'] })[0].gravite, 'bloquant');
  assert.equal(defautsSeo({ ...ok, h1: 2 })[0].gravite, 'majeur');
  assert.deepEqual(defautsSeo({ ...ok, description: '', canonical: '', jsonld: [] }, { erreur404: true }), []);
  assert.equal(defautsSeo({ ...ok, title: '' })[0].gravite, 'bloquant');
});

test('performance mobile : seuils LCP, CLS, TBT, poids', () => {
  assert.deepEqual(defautsPerformance({ lcpMs: 2000, cls: 0.01, tbtMs: 50, poids: 400_000 }), []);
  const d = defautsPerformance({ lcpMs: 3000, cls: 0.3, tbtMs: 250, poids: null });
  assert.deepEqual(d.map((x) => [x.mesure, x.gravite]), [['lcpMs', 'majeur'], ['cls', 'bloquant'], ['tbtMs', 'majeur']]);
});

const resultat = (o: Partial<ResultatTesteur>): ResultatTesteur => ({
  format: 'testeur-modeles/1', mode: 'check', source: 'script', modele: 'm1', version: 1, verdict: 'vert', controles: [], tickets: [], le: '2026-10-09T00:00:00Z',
  jeux: [], pages: [], largeurs: [], captures: [], ...o,
});

test('re-check : corrigés, toujours ouverts, nouveaux, contrôles changés', () => {
  const a = ticket({ controle: 'contraste' }), b = ticket({ controle: 'liens', chemin: '/' }), c = ticket({ controle: 'debordement', chemin: '/acces' });
  const v1 = resultat({ version: 1, verdict: 'orange', tickets: [a, b], controles: [bilanControle('contraste', [a], { mesure: '', seuil: '' }), bilanControle('debordement', [], { mesure: '', seuil: '' })] });
  const v2 = resultat({ version: 2, mode: 'recheck', tickets: [b, c], controles: [bilanControle('contraste', [], { mesure: '', seuil: '' }), bilanControle('debordement', [c], { mesure: '', seuil: '' })] });
  const cmp = comparerVersions(v1, v2);
  assert.deepEqual(cmp.corriges.map((t) => t.controle), ['contraste']);
  assert.deepEqual(cmp.toujoursOuverts.map((t) => t.controle), ['liens']);
  assert.deepEqual(cmp.nouveaux.map((t) => t.controle), ['debordement']);
  assert.deepEqual(cmp.controlesChanges, [{ id: 'contraste', avant: 'orange', apres: 'vert' }, { id: 'debordement', avant: 'vert', apres: 'orange' }]);
});

test('fusion script + vérification visuelle, relecture du JSON', () => {
  const s = resultat({ controles: [bilanControle('contraste', [], { mesure: 'ok', seuil: '≥ 4,5:1' })] });
  const g = creerTicket({ modele: 'm1', version: 1, controle: 'visuel', chemin: '/', largeur: 1440, gravite: 'majeur', commentaire: 'Visage coupé dans le héros', suggestion: 'Recadrer la photo', etiquette: 'image' });
  const f = fusionnerResultats(s, { controles: [bilanControle('visuel', [g], { mesure: '1 remarque', seuil: 'grille juge-gout-paul' })], tickets: [g] });
  assert.equal(f.source, 'script+claude');
  assert.equal(f.verdict, 'orange');
  assert.equal(g.categorie, 'gout');
  const relu = lireResultatTesteur(JSON.parse(JSON.stringify(f)))!;
  assert.equal(relu.tickets[0].suggestion, 'Recadrer la photo');
  assert.equal(relu.tickets[0].categorie, 'gout');
  assert.equal(relu.controles.find((c) => c.id === 'contraste')?.seuil, '≥ 4,5:1');
  assert.equal(lireResultatTesteur({ modele: 'x' }), null);
});

test('règle de validation : vert, orange justifié, rouge, autre version', () => {
  const t = (verdict: 'vert' | 'orange' | 'rouge', version = 3) => ({ version, verdict, tickets: [] });
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: t('vert') }).autorise, true);
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: t('vert', 2) }).autorise, false);
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: null }).autorise, false);
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: t('rouge') }).autorise, false);
  const o = regleValidationModele({ versionCourante: 3, dernierTest: t('orange') });
  assert.deepEqual([o.autorise, o.justificationRequise], [false, true]);
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: t('orange'), justification: 'Contraste du logo accepté : marque du cabinet.' }).autorise, true);
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: { version: 3, verdict: 'vert', tickets: [ticket({ gravite: 'bloquant', version: 3 })] } }).autorise, false);
  // Vérification visuelle exigée quand les contrôles sont connus
  assert.deepEqual(Object.values(regleValidationModele({ versionCourante: 3, dernierTest: { ...t('vert'), controles: [{ id: 'contraste' }] } })).slice(0, 2), [false, true]);
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: { ...t('vert'), controles: [{ id: 'contraste' }] }, justification: 'Captures revues par Paul lui-même ce matin.' }).autorise, true);
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: { ...t('vert'), controles: [{ id: 'contraste' }, { id: 'visuel' }] } }).autorise, true);
  assert.equal(regleValidationModele({ versionCourante: 3, dernierTest: { ...t('vert'), controles: [] }, exigerVisuel: false }).autorise, true);
});

test('étapes de la chaîne, re-test hebdomadaire, chemin du résultat', () => {
  assert.equal(modeTestPourEtape('candidat'), null);
  assert.equal(modeTestPourEtape('finaliste'), 'check');
  assert.equal(modeTestPourEtape('retouche'), 'recheck');
  assert.equal(modeTestPourEtape('ecarte'), null);
  assert.equal(modeTestPourEtape('publie'), 'check');
  assert.equal(etapeApresTest('check'), 'avis-humain');
  assert.equal(etapeApresTest('recheck'), 'revalidation');
  const maintenant = new Date('2026-10-09T12:00:00Z');
  assert.equal(aRetester(null, maintenant), true);
  assert.equal(aRetester('2026-10-05T12:00:00Z', maintenant), false);
  assert.equal(aRetester('2026-10-01T12:00:00Z', maintenant), true);
  assert.equal(cheminResultatTest('Sport · Simple', 2), 'retours/tests-modeles/sport-simple-v2.json');
});

test('verrou testeur de la validation finale', () => {
  assert.equal(verrouTesteur({ versionCourante: 2, test: { version: 2, verdict: 'vert', tickets: [] } }).ok, true);
  assert.equal(verrouTesteur({ versionCourante: 2, test: { version: 2, verdict: 'orange', tickets: [] } }).ok, false);
  assert.equal(verrouTesteur({ versionCourante: 2, test: { version: 2, verdict: 'orange', tickets: [] }, justification: 'Logo du cabinet imposé par le praticien.' }).ok, true);
  assert.equal(verrouTesteur({ versionCourante: 2, test: null }).ok, false);
});
