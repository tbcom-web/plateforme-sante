import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aleaGraine, affecterEmplacements, analyserCandidate, appliquerRevueSerie, caracteristiquesPixels, cibleKit, cibleProfil, cibleTheme, ciblesPrioritaires, coherenceDepuisDispersion,
  composerSeriesPhotos, dispersionSerie, distanceEmpreintes, filtrerCandidatesSourcing, gammeSerie, hashtagsAcceptation, lireRevuesSeries, orientationCandidate, planRequetes,
  scoreQualite, serieDepuisLigne, seriePourExport, seriesARevoir, signatureSerie, traitementSerie, urlApercuAnalyse, vocabulaireMetier, ligneDeSerie, titreSerie,
  SEUIL_QUASI_IDENTIQUE, TAILLE_SERIE, type CandidateAnalysee, type CandidateSourcing, type CaracteristiquesPhoto, type CibleSourcing,
} from './sourcing-photos';
import { motsDuTexte } from './sourcing-photos';

// ---------------------------------------------------------------------------------------------------------------
// Données synthétiques (aucun appel aux API : formes des réponses Pexels / Pixabay)
// ---------------------------------------------------------------------------------------------------------------

const hex16 = (i: number) => { const a = aleaGraine(1000 + i); return Array.from({ length: 16 }, () => Math.floor(a() * 16).toString(16)).join(''); };

function candidate(i: number, o: Partial<CandidateSourcing> = {}): CandidateSourcing {
  return {
    source: i % 2 ? 'pixabay' : 'pexels', idSource: String(100000 + i), largeur: 3000, hauteur: 2000,
    apercu: i % 2 ? `https://pixabay.com/get/g${i}_640.jpg` : `https://images.pexels.com/photos/${100000 + i}/pexels-photo-${100000 + i}.jpeg?auto=compress&cs=tinysrgb&h=650&w=940`,
    telechargement: i % 2 ? `https://pixabay.com/get/g${i}_1280.jpg` : `https://images.pexels.com/photos/${100000 + i}/pexels-photo.jpeg`,
    auteur: 'Auteur', auteurUrl: null, pageUrl: i % 2 ? `https://pixabay.com/photos/x-${100000 + i}/` : `https://www.pexels.com/photo/x-${100000 + i}/`,
    description: 'basketball shoes on court floor', tags: [], requete: `basketball shoes court`, ...o,
  };
}

type Groupe = { luminosite: number; saturation: number; contraste: number; temperature: number; couleur: string };
const GROUPES: Record<string, Groupe> = {
  chaude: { luminosite: 0.66, saturation: 0.32, contraste: 0.18, temperature: 0.22, couleur: '#c98a4b' },
  froide: { luminosite: 0.42, saturation: 0.3, contraste: 0.2, temperature: -0.25, couleur: '#3f6fa8' },
  vive: { luminosite: 0.55, saturation: 0.62, contraste: 0.28, temperature: 0.05, couleur: '#2fb34a' },
};

function analysee(i: number, g: Groupe, o: Partial<CandidateSourcing> = {}, bruit = 0.02, empreinte?: string): CandidateAnalysee {
  const a = aleaGraine(i);
  const j = (x: number, k: number) => x + (a() - 0.5) * 2 * k;
  const car: CaracteristiquesPhoto = {
    luminosite: j(g.luminosite, bruit), saturation: j(g.saturation, bruit), contraste: j(g.contraste, bruit / 2), temperature: j(g.temperature, bruit * 2),
    nettete: 0.07, sombres: 0.005, brulees: 0.005, palette: [{ hex: g.couleur, part: 0.4 }, { hex: '#e8e4dc', part: 0.35 }, { hex: '#3a3530', part: 0.25 }], empreinte: empreinte ?? hex16(i),
  };
  const c = candidate(i, { requete: ['basketball shoes court', 'basketball sneakers', 'basketball court floor', 'runner feet'][i % 4], ...o });
  return { ...c, car, qualite: 0.8, pertinence: 0.7, gamme: 1, score: 0.75 - (i % 7) * 0.01 };
}

const CIBLE = cibleProfil('podologue', 'sport-basket')!;

// ---------------------------------------------------------------------------------------------------------------

test('sourcing : une série cohérente a une dispersion plus faible qu’une sélection au hasard', () => {
  const l: CandidateAnalysee[] = [];
  let i = 1;
  for (const g of Object.values(GROUPES)) for (let k = 0; k < 14; k++) l.push(analysee(i++, g));
  const { series, motif } = composerSeriesPhotos(l, CIBLE);
  assert.equal(motif, null);
  assert.ok(series.length >= 2, 'au moins une alternative');
  const s = series[0];
  assert.ok(s.photos.length >= TAILLE_SERIE.min && s.photos.length <= TAILLE_SERIE.max);
  // Hasard : 50 tirages de la même taille
  const alea = aleaGraine(7);
  let moyenne = 0;
  for (let t = 0; t < 50; t++) {
    const tirage = [...l].sort(() => alea() - 0.5).slice(0, s.photos.length);
    moyenne += dispersionSerie(tirage.map((x) => x.car)) / 50;
  }
  assert.ok(s.dispersion < moyenne / 3, `série ${s.dispersion} vs hasard ${moyenne}`);
  assert.ok(s.coherence > coherenceDepuisDispersion(moyenne));
  // Une série = un seul groupe de ton (même signature pour toutes ses photos)
  const groupes = new Set(s.photos.map((p) => (p.car.temperature > 0.12 ? 'chaude' : p.car.temperature < -0.1 ? 'froide' : 'vive')));
  assert.equal(groupes.size, 1);
  // Les alternatives ont une autre signature et partagent au plus un tiers de leurs photos
  const b = series[1];
  assert.notEqual(b.signature.libelle, s.signature.libelle);
  const commun = b.photos.filter((p) => s.photos.some((q) => q.cle === p.cle)).length;
  assert.ok(commun <= Math.floor(Math.min(b.photos.length, s.photos.length) / 3));
  assert.equal(s.rang, 0);
  assert.equal(b.rang, 1);
});

test('sourcing : doublons rejetés (même clé, déjà vues, quasi identiques)', () => {
  const brutes = [candidate(1), candidate(1), candidate(2), candidate(3)];
  const f = filtrerCandidatesSourcing(brutes, { profession: 'podologue', emplacements: CIBLE.emplacements, dejaVues: new Set(['pixabay:100003']) });
  assert.deepEqual(f.gardees.map((c) => c.idSource), ['100001', '100002']);
  assert.deepEqual(f.ecartees.map((e) => e.raison).sort(), ['deja-vue', 'doublon']);
  // Quasi identiques (même empreinte visuelle) : jamais deux dans une série
  const meme = hex16(500);
  const l: CandidateAnalysee[] = [];
  for (let k = 0; k < 6; k++) l.push(analysee(500 + k, GROUPES.chaude, {}, 0.01, meme));
  for (let k = 0; k < 10; k++) l.push(analysee(600 + k, GROUPES.chaude));
  const { series } = composerSeriesPhotos(l, CIBLE);
  for (const s of series) {
    assert.ok(s.photos.filter((p) => p.car.empreinte === meme).length <= 1);
    for (const p of s.photos) for (const q of s.photos) if (p !== q) assert.ok(distanceEmpreintes(p.car.empreinte, q.car.empreinte) > SEUIL_QUASI_IDENTIQUE);
  }
  assert.equal(distanceEmpreintes('ffffffffffffffff', 'fffffffffffffff0'), 4);
  assert.equal(distanceEmpreintes('x', 'ffffffffffffffff'), 64);
});

test('sourcing : orientation respectée (portrait écarté, bandeaux en paysage)', () => {
  const portrait = candidate(1, { largeur: 2000, hauteur: 3000 });
  const carree = candidate(2, { largeur: 2400, hauteur: 2300 });
  assert.equal(orientationCandidate(portrait), 'portrait');
  const seulementBandeaux = filtrerCandidatesSourcing([portrait, carree, candidate(3)], { profession: 'podologue', emplacements: ['accueil', 'page-sujet'] });
  assert.deepEqual(seulementBandeaux.gardees.map((c) => c.idSource), ['100003']);
  assert.deepEqual(seulementBandeaux.ecartees.map((e) => e.raison), ['orientation', 'orientation']);
  const avecCartes = filtrerCandidatesSourcing([portrait, carree], { profession: 'podologue', emplacements: ['accueil', 'activite:basket'] });
  assert.deepEqual(avecCartes.gardees.map((c) => c.idSource), ['100002']);
  // Le premier écran et la page sujet reçoivent des paysages, même si une carrée est mieux notée
  const photos = [
    { cle: 'a', largeur: 2000, hauteur: 2000, qualite: 0.99, pertinence: 0.9 },
    { cle: 'b', largeur: 3000, hauteur: 2000, qualite: 0.7, pertinence: 0.5 },
    { cle: 'c', largeur: 3200, hauteur: 2000, qualite: 0.8, pertinence: 0.4 },
  ];
  const e = affecterEmplacements(photos, ['accueil', 'page-sujet', 'activite:basket']);
  assert.deepEqual(e.map((x) => `${x.emplacement}=${x.cle}`), ['accueil=c', 'page-sujet=b', 'activite:basket=a']);
  // Dans une série composée, les bandeaux sont toujours en paysage
  const l: CandidateAnalysee[] = [];
  for (let k = 0; k < 12; k++) l.push(analysee(700 + k, GROUPES.froide, k < 8 ? { largeur: 2400, hauteur: 2300 } : {}));
  const { series } = composerSeriesPhotos(l, CIBLE);
  for (const s of series) for (const p of s.photos.filter((x) => x.emplacement === 'accueil' || x.emplacement === 'page-sujet')) assert.ok(p.largeur / p.hauteur >= 1.2);
});

test('sourcing : mots interdits (marque, texte, visage, sang, hors métier) et verrou de profession', () => {
  const f = (description: string, profession = 'podologue', emplacements = CIBLE.emplacements) => filtrerCandidatesSourcing([candidate(1, { description })], { profession, emplacements });
  assert.equal(f('nike running shoes logo').ecartees[0]?.raison, 'marque');
  assert.equal(f('motivational quote text on running shoes').ecartees[0]?.raison, 'texte');
  assert.equal(f('woman smiling portrait with sneakers').ecartees[0]?.raison, 'visage');
  assert.equal(f('bleeding wound on foot').ecartees[0]?.raison, 'sang-plaie');
  assert.equal(f('feet with tattoo on the beach').ecartees[0]?.raison, 'sang-plaie');
  assert.equal(f('city skyline at night').ecartees[0]?.raison, 'hors-metier');
  assert.equal(f('podiatrist with patient foot', 'podologue', ['soin:bilan-podologique']).ecartees[0]?.raison, 'visage');
  assert.equal(f('basketball shoes on wooden court').gardees.length, 1);
  assert.equal(f('').gardees.length, 1, 'sans texte : gardée (pertinence basse)');
  // Psychomotricité : écriture permise (« handwriting »), pieds de podologie hors du vocabulaire
  assert.equal(f('child hand pencil handwriting', 'psychomotricien', ['accueil', 'theme:graphomotricite']).gardees.length, 1);
  assert.ok(vocabulaireMetier('psychomotricien').has('pencil'));
  assert.ok(!vocabulaireMetier('psychomotricien').has('podiatrist'));
  assert.ok(vocabulaireMetier('podologue').has('feet') && !vocabulaireMetier('podologue').has('court'));
  assert.deepEqual(motsDuTexte('Pédicure  Été-2'), ['pedicure', 'ete', '2']);
});

test('sourcing : caractéristiques d’un aperçu (luminosité, température, contraste, netteté, empreinte)', () => {
  const image = (f: (x: number, y: number) => [number, number, number], n = 32) => {
    const p = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const [r, v, b] = f(x, y); p.set([r, v, b, 255], 4 * (y * n + x)); }
    return caracteristiquesPixels(p, n, n);
  };
  const chaude = image(() => [230, 160, 90]), froide = image(() => [70, 120, 200]), grise = image(() => [128, 128, 128]);
  assert.ok(chaude.temperature > 0.3 && froide.temperature < -0.3 && grise.temperature === 0);
  assert.ok(chaude.luminosite > froide.luminosite);
  assert.equal(grise.saturation, 0);
  const damier = image((x, y) => ((x + y) % 2 ? [255, 255, 255] : [0, 0, 0]));
  assert.ok(damier.nettete > grise.nettete && damier.contraste > 0.4);
  assert.equal(chaude.palette[0].part, 1);
  assert.match(chaude.empreinte, /^[0-9a-f]{16}$/);
  const degrade = image((x) => [x * 8, x * 8, x * 8]), inverse = image((x) => [255 - x * 8, 255 - x * 8, 255 - x * 8]);
  assert.ok(distanceEmpreintes(degrade.empreinte, inverse.empreinte) > 40);
  // Qualité : un aperçu sombre perd la moitié de son exposition
  assert.ok(scoreQualite({ largeur: 3000, hauteur: 2000 }, { ...chaude, luminosite: 0.15 }) < scoreQualite({ largeur: 3000, hauteur: 2000 }, chaude));
});

test('sourcing : aperçu analysé basse définition, hôtes des sources seulement', () => {
  assert.equal(urlApercuAnalyse({ source: 'pexels', apercu: 'https://images.pexels.com/photos/1/p.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' }), 'https://images.pexels.com/photos/1/p.jpeg?auto=compress&cs=tinysrgb&w=340');
  assert.equal(urlApercuAnalyse({ source: 'pixabay', apercu: 'https://pixabay.com/get/gabc_640.jpg' }), 'https://pixabay.com/get/gabc_340.jpg');
  assert.equal(urlApercuAnalyse({ source: 'pexels', apercu: 'https://exemple.test/x.jpg' }), null);
});

test('sourcing : cibles prioritaires (finalistes d’abord, par profession, séries en attente retirées)', () => {
  const l = ciblesPrioritaires({ profession: 'podologue', photos: [], finalistes: [{ profil: 'sport-tennis', gamme: 'terracotta', traitement: 'chaud-doux' }], kits: [{ sujet: 'enfant', emplacement: 'accueil', raison: 'vide' }] });
  assert.equal(l[0].id, 'profil:podologue:sport-tennis');
  assert.equal(l[0].gamme, 'terracotta');
  assert.equal(l[0].traitement, 'chaud-doux');
  assert.ok(l.some((c) => c.id === 'kit:podologue:enfant'));
  assert.ok(l.every((c, i) => i === 0 || l[i - 1].priorite >= c.priorite));
  const sans = ciblesPrioritaires({ profession: 'podologue', photos: [], enAttente: ['profil:podologue:sport-tennis'] });
  assert.ok(!sans.some((c) => c.id === 'profil:podologue:sport-tennis'));
  // Profil bien couvert : plus un trou
  const photos = Array.from({ length: 8 }, (_, i) => ({ requete: 'x', statut: 'validee', professions: ['podologue'], hashtags: ['basket'], note: i < 3 ? 4.5 : null }));
  assert.ok(!ciblesPrioritaires({ profession: 'podologue', photos }).some((c) => c.id === 'profil:podologue:sport-basket'));
  // Psychomotricité : thèmes et requêtes de la profession, jamais une requête de pieds de podologie
  const psy = ciblesPrioritaires({ profession: 'psychomotricien', photos: [] });
  assert.ok(psy.length > 0 && psy.every((c) => c.profession === 'psychomotricien'));
  for (const c of psy) for (const q of c.requetes) assert.ok(!/podiatr|insole|toenail|orthotic/.test(q), q);
  assert.ok(psy.every((c) => c.emplacements.every((e) => !e.startsWith('soin:'))));
  assert.equal(cibleTheme('psychomotricien', 'graphomotricite')!.themesDecision[0], 'graphomotricite');
  assert.equal(cibleTheme('podologue', 'inconnu'), null);
  assert.deepEqual(cibleKit('podologue', 'sport', ['soin:k-taping']).emplacements, ['accueil', 'page-sujet', 'soin:k-taping']);
  assert.ok(CIBLE.requetes[0].includes('basketball'));
  assert.ok(CIBLE.hashtags.includes('basket'));
});

test('sourcing : plan des requêtes (distinctes, quota, sources alternées, déterministe)', () => {
  const p = planRequetes(CIBLE, { sources: ['pexels', 'pixabay'], graine: 3 });
  assert.ok(p.length <= 8 && p.length >= 6);
  assert.deepEqual(p, planRequetes(CIBLE, { sources: ['pexels', 'pixabay'], graine: 3 }));
  assert.equal(new Set(p.map((x) => `${x.source}|${x.requete}`)).size, p.length);
  assert.ok(p.some((x) => x.source === 'pexels') && p.some((x) => x.source === 'pixabay'));
  // Requêtes de tête (activité basket) d'abord, sauf si elles sont saturées
  assert.deepEqual(p.slice(0, 3).map((x) => x.requete), CIBLE.requetes.slice(0, 3));
  assert.ok(planRequetes(CIBLE, { sources: ['pexels'], couverture: { [CIBLE.requetes[0]]: 9 }, graine: 3 }).every((x) => x.requete !== CIBLE.requetes[0]));
  assert.deepEqual(planRequetes(CIBLE, { sources: [] }), []);
  // Requête très couverte : page 2
  const q = planRequetes({ requetes: ['a b'] }, { sources: ['pexels'], couverture: { 'a b': 5 } });
  assert.deepEqual(q, [{ source: 'pexels', requete: 'a b', page: 2 }]);
});

test('sourcing : signature, gamme et traitement de la série', () => {
  const sig = signatureSerie([0, 1, 2].map((i) => analysee(i, { ...GROUPES.chaude, couleur: '#5f9a4c' }).car));
  assert.equal(sig.libelle, 'lumineuse · chaude · naturelle · touches vertes');
  assert.equal(titreSerie('Sport · basket', sig, 9), 'Sélection de l’agent — Sport · basket · série lumineuse chaude (9 photos)');
  const g = gammeSerie(sig, [{ hex: '#5f9a4c', part: 0.4 }], null);
  assert.ok(['sauge', 'sable', 'terracotta'].includes(g), g);
  assert.equal(gammeSerie(sig, [], 'cobalt'), 'cobalt');
  assert.equal(traitementSerie(sig, 80, 'terracotta'), 'chaud-doux');
  assert.equal(traitementSerie(sig, 40, 'terracotta'), 'voile');
  assert.equal(traitementSerie(sig, 80, 'cobalt'), 'voile');
  assert.equal(traitementSerie(sig, 80, 'cobalt', 'mat'), 'mat');
});

test('sourcing : analyse d’une candidate (score borné, gamme neutre sans cible)', () => {
  const car = analysee(1, GROUPES.chaude).car;
  const a = analyserCandidate(candidate(1), car, { ...CIBLE, gamme: null });
  assert.ok(a.score > 0 && a.score <= 1 && a.gamme === 1);
  assert.ok(a.pertinence >= 0.6, String(a.pertinence));
});

test('sourcing : stockage, export public et revue de Claude', () => {
  const l: CandidateAnalysee[] = [];
  for (let k = 0; k < 10; k++) l.push(analysee(800 + k, GROUPES.chaude));
  const s = composerSeriesPhotos(l, CIBLE).series[0];
  const ligne = { ...ligneDeSerie(s, 'g1', { requetes: [], candidates: 10, analysees: 10, ecartees: {}, erreurs: [] }), id: '0b9a3c3e-1111-4222-8333-444455556666', created_at: '2026-10-09T10:00:00Z', expire_le: '2026-10-23T10:00:00Z' };
  const e = serieDepuisLigne(ligne as unknown as Record<string, unknown>)!;
  assert.equal(e.photos.length, s.photos.length);
  // Photo à l'hôte inattendu : retirée à la lecture
  const pirate = serieDepuisLigne({ ...ligne, photos: [...s.photos, { ...s.photos[0], idSource: '9', apercu: 'https://exemple.test/x.jpg' }] } as unknown as Record<string, unknown>)!;
  assert.equal(pirate.photos.length, s.photos.length);
  const x = seriePourExport(e);
  assert.ok(!JSON.stringify(x).includes('Auteur'), 'aucun auteur dans l’export public');
  assert.equal(x.photos.length, s.photos.length);
  const tags = hashtagsAcceptation(e, e.photos.find((p) => p.emplacement === 'accueil')!);
  assert.ok(tags.includes('basket') && tags.includes('accueil') && tags.includes('kit-sport') && tags.includes(`serie-${e.empreinte}`));
  // Revue de Claude : appliquée seulement à la série exacte (empreinte)
  const [a, b] = e.photos;
  const revues = lireRevuesSeries({ series: { [e.id]: { empreinte: e.empreinte, retenues: [b.cle, a.cle], ecartees: [{ cle: e.photos[2].cle, raison: 'anatomie-douteuse', detail: 'orteils' }, { cle: 'x', raison: 'faible' }], note: 4 } } });
  const r = appliquerRevueSerie(e, revues[e.id]);
  assert.equal(r.photos[0].cle, b.cle);
  assert.equal(r.photos[1].cle, a.cle);
  assert.equal(r.ecartees.length, 1);
  assert.equal(r.ecartees[0].raisonClaude, 'anatomie-douteuse');
  assert.equal(r.libelle, `Revu par Claude : ${e.photos.length - 1}/${e.photos.length} retenues`);
  assert.equal(appliquerRevueSerie(e, { ...revues[e.id], empreinte: '00000000' }).libelle, null);
  assert.equal(seriesARevoir([e], revues, new Date('2026-10-10')).length, 0);
  assert.equal(seriesARevoir([e], {}, new Date('2026-10-10')).length, 1);
  assert.equal(seriesARevoir([e], {}, new Date('2026-10-30')).length, 0, 'série expirée');
  assert.deepEqual(lireRevuesSeries({ series: { 'pas-un-id': { empreinte: e.empreinte } } }), {});
  // Cible typée conservée
  const c: CibleSourcing = e.cibleDetails;
  assert.equal(c.id, 'profil:podologue:sport-basket');
});
