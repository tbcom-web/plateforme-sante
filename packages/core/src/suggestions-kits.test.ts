// Suggestions pour compléter un kit d'images (suggestions-kits.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compteurKit, emplacementsAFaire, etiquetteKit, hashtagEmplacement, hashtagKit, MOTS_METIER, REQUETES_PAGES, REQUETES_SOINS, REQUETES_CABINET, refusKitDepuisLignes,
  requetesEmplacement, suggestionsBanque, cleRefusKit, PREFIXE_REFUS_KIT,
} from './suggestions-kits';
import { composerKit, SUJETS_KITS } from './kits-images';
import { photosIntegreesBanque } from './recettes';
import { clePhoto } from './assets-poids';
import { VISUELS_SOINS } from './jeux';
import { choisirRequete } from './photos-libres';

const banque = photosIntegreesBanque();

test('dictionnaire : chaque soin du catalogue a ses requêtes, toutes du métier (pieds, ongles, chaussures, cabinet), jamais la posture', () => {
  for (const slug of Object.keys(VISUELS_SOINS).filter((s) => s !== 'posturologie')) assert.ok(REQUETES_SOINS[slug]?.length >= 2, slug);
  const toutes = [...Object.values(REQUETES_SOINS).flat(), ...Object.values(REQUETES_PAGES).flatMap((x) => Object.values(x).flat()), ...REQUETES_CABINET];
  for (const q of toutes) {
    assert.ok(MOTS_METIER.some((m) => q.includes(m)), `hors métier : ${q}`);
    assert.ok(!/posture|face|portrait/.test(q), q);
  }
  assert.deepEqual(requetesEmplacement('ongles', 'soin:orthonyxie').slice(0, 2), ['toenail brace', 'ingrown toenail care']);
  assert.ok(requetesEmplacement('enfant', 'cabinet').includes('podiatry clinic interior'));
  for (const s of SUJETS_KITS) assert.ok(requetesEmplacement(s, 'accueil').length && requetesEmplacement(s, 'page-sujet').length, s);
  // Pondération par couverture : une requête déjà bien couverte sort rarement
  const q = requetesEmplacement('ongles', 'soin:orthonyxie');
  const n = Array.from({ length: 300 }, (_, i) => choisirRequete(q, { [q[0]]: 5 }, i / 300)).filter((x) => x === q[0]).length;
  assert.ok(n < 20, `${n}`);
});

test('banque : jamais exclue, ni dans le kit, ni déjà étiquetée ; sujet et mots (hashtag, nom) font monter', () => {
  const sport = banque.filter((p) => p.sujets.includes('sport'));
  const exclue = sport[1];
  const exclues = new Set([clePhoto(exclue.url)!]);
  const hashtags: Record<string, string[]> = {};
  const enfant = banque.find((p) => p.sujets.includes('enfant'))!;
  hashtags[clePhoto(enfant.url)!] = ['taping', 'kinesiology'];
  const d = { banque, exclues, hashtags };
  const kit = composerKit('sport', d, 0, ['k-taping']);
  const l = suggestionsBanque(kit, 'soin:k-taping', d, new Set(), 20);
  assert.ok(l.length > 0);
  assert.ok(!l.some((s) => s.url === exclue.url), 'exclue jamais suggérée');
  assert.ok(!l.some((s) => kit.photos.some((p) => p.url === s.url)), 'pas déjà dans le kit');
  assert.ok(l.every((s, i) => i === 0 || l[i - 1].score >= s.score));
  // La photo étiquetée #taping (mot du soin) remonte malgré un autre sujet
  const sansTag = suggestionsBanque(kit, 'soin:k-taping', { banque, exclues }, new Set(), 50).find((s) => s.url === enfant.url);
  const avecTag = l.find((s) => s.url === enfant.url);
  if (sansTag && avecTag) assert.ok(avecTag.score > sansTag.score);
  // Déjà étiquetée pour l'emplacement : n'est plus suggérée
  const d2 = { banque, exclues, hashtags: { [clePhoto(sport[0].url)!]: ['k-taping'] } };
  const k2 = composerKit('sport', d2, 0, []);
  assert.ok(!suggestionsBanque(k2, 'soin:k-taping', d2, new Set(), 50).some((s) => s.url === sport[0].url));
  // Note ≤ 2 ★ : jamais
  const d3 = { banque, notes: { [clePhoto(sport[2].url)!]: { m: 2, n: 1 } } };
  assert.ok(!suggestionsBanque(composerKit('sport', d3), 'cabinet', d3, new Set(), 50).some((s) => s.url === sport[2].url));
});

test('« Pas pour ici » mémorisé : relu du journal, la photo n’est plus proposée pour CET emplacement seulement', () => {
  const d = { banque };
  const kit = { ...composerKit('senior', d, 0, []), photos: [] };
  const l = suggestionsBanque(kit, 'cabinet', d, new Set(), 10);
  assert.ok(l.length > 0);
  const cible = l[0];
  const refus = refusKitDepuisLignes([{ contexte: 'photos', nature: 'hashtag', valeur: hashtagEmplacement('cabinet'), decision: 'refusee', raison: `${PREFIXE_REFUS_KIT}${cible.cle}` }]);
  assert.ok(refus.has(cleRefusKit('cabinet', cible.cle)));
  assert.ok(!suggestionsBanque(kit, 'cabinet', d, refus, 10).some((s) => s.url === cible.url));
  // Ailleurs (page sujet), toujours possible
  assert.ok(suggestionsBanque(kit, 'page-sujet', d, refus, 50).some((s) => s.url === cible.url));
});

test('emplacements à compléter, compteur, étiquette des photos gardées pour un kit', () => {
  const d = { banque, notes: Object.fromEntries(banque.filter((p) => p.sujets.includes('enfant')).slice(0, 2).map((p) => [clePhoto(p.url)!, { m: 4.5, n: 2 }])) };
  const kit = composerKit('enfant', d, 0, ['podologie-enfant', 'orthonyxie']);
  const af = emplacementsAFaire(kit, ['podologie-enfant', 'orthonyxie']);
  assert.ok(af.some((e) => e.emplacement === 'soin:orthonyxie' && e.raison === 'vide'));
  assert.ok(!af.some((e) => e.emplacement === 'accueil'), 'premier écran ≥ 4 ★ : rien à faire');
  const c = compteurKit(kit, ['podologie-enfant', 'orthonyxie']);
  assert.equal(c.total, 8);
  assert.match(c.texte, /^Kit Enfants : \d\/8 emplacements avec une photo ≥ 4 ★$/);
  assert.equal(hashtagKit('enfant'), 'kit-enfant');
  assert.equal(etiquetteKit(['kit-enfant', 'orthonyxie'])?.libelle, 'pour le kit Enfants · orthonyxie');
  assert.equal(etiquetteKit(['kit-sport', 'cabinet'])?.emplacement, 'cabinet');
  assert.equal(etiquetteKit(['sport']), null);
});
