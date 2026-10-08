// Égalité avant / après des mémorisations de performance (2026-10-08) : mêmes dates, mêmes bonus, mêmes propositions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { jourParis } from './essai';
import { serieAvis, changementsGenerateur, changementsGenerateurDiffere } from './retours';
import { bonusAssets, clePhoto, COEFS_ASSETS, poidsAssets, scoreAsset, scoreAssetPourSujet, scorePrefixe, type AssetsProposition, type PoidsAssets } from './assets-poids';
import { lotsPropositions } from './propositions';
import { poidsAtelier } from './atelier-poids';

const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'retours', 'assets-notes.json')))!;
const lire = (f: string) => JSON.parse(readFileSync(join(racine, 'retours', f), 'utf8'));

test('jourParis : formateur partagé = formateur neuf (heures d’été / d’hiver, minuit UTC)', () => {
  const ref = (x: Date | number | string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(x));
  const dates = ['2026-03-29T00:59:59Z', '2026-03-29T01:00:00Z', '2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z', '2026-12-31T22:59:59Z', '2026-12-31T23:00:00Z', 0, Date.UTC(2026, 9, 8, 21, 59), new Date('2026-07-14T22:00:00Z')];
  for (let i = 0; i < 400; i++) dates.push(Date.UTC(2026, 0, 1) + i * 22 * 3600_000);
  for (const d of dates) assert.equal(jourParis(d), ref(d));
  assert.throws(() => jourParis('pas une date'), RangeError);
  const iso = dates.map((d) => new Date(d).toISOString());
  assert.deepEqual(serieAvis(iso, new Date('2026-10-08T10:00:00Z')), serieAvis([...iso], new Date('2026-10-08T10:00:00Z')));
});

// Ancienne version de bonusAssets (sans mémoire), recopiée pour la comparaison
function bonusReference(p: AssetsProposition, poids: PoidsAssets | null | undefined): number {
  if (!poids) return 0;
  const c = COEFS_ASSETS;
  const arrondi = (x: number) => Math.round(x * 1000) / 1000;
  let b = c.gamme * scoreAsset(`gamme:${p.gamme}`, poids) + c.modele * scoreAsset(`modele:${p.structure}`, poids);
  if (p.animation) b += c.animation * scoreAsset(`animation:${p.animation}`, poids);
  if (p.modeVisuel === 'photos') {
    const cles = (p.photos ?? []).map(clePhoto).filter((x): x is string => Boolean(x));
    b += c.photos * (cles.length ? cles.reduce((s, k) => s + scoreAssetPourSujet(k, p.sujet, poids), 0) / cles.length : 0);
  } else {
    if (p.heros) b += c.heros * scoreAssetPourSujet(`heros:${p.heros}:${p.registre}`, p.sujet ?? p.heros, poids);
    const r = p.registre;
    b += c.dessins * scorePrefixe(poids, (k) => (r === 'ligne' ? k.startsWith('ligne:') : k.startsWith('dessin:') && k.endsWith(`:${r}`)));
  }
  return arrondi(Math.min(c.max, Math.max(c.min, b)));
}

test('bonusAssets mémorisé = bonusAssets d’origine (notes réelles exportées, tous les registres)', () => {
  const notes = lire('assets-notes.json') as { cle: string; note: number; etiquettes: string[]; appareil?: string }[];
  const statuts = lire('illustrations-statuts.json') as { cle: string; statut: string }[];
  const poids = poidsAssets([...notes.map((n) => ({ cle: n.cle, note: n.note, etiquettes: n.etiquettes, statut: null, appareil: n.appareil ?? null })), ...statuts.map((s) => ({ cle: s.cle, note: null, etiquettes: [], statut: s.statut }))])!;
  assert.ok(poids && Object.keys(poids.effets).length > 20);
  const registres = ['releve', 'pedagogique', 'ligne', 'trait', 'organique', 'inconnu'];
  for (const registre of registres) for (const modeVisuel of ['illustrations', 'photos']) {
    const p: AssetsProposition = { structure: 'technique-precis', gamme: 'cobalt', style: registre, registre, modeVisuel, animation: 'coureur', heros: 'sport', sujet: 'sport', photos: ['/photos/sport-course.webp'] };
    for (let i = 0; i < 3; i++) assert.equal(bonusAssets(p, poids), bonusReference(p, poids), `${registre} ${modeVisuel} ${i}`);
    // Copie (autres objets) et statuts différents : la mémoire ne doit pas resservir l'ancien résultat
    const copie = structuredClone(poids);
    assert.equal(bonusAssets(p, copie), bonusReference(p, copie));
    const autresStatuts = { ...poids, statuts: { ...poids.statuts, ...Object.fromEntries(Object.keys(poids.effets).filter((k) => k.startsWith('dessin:')).map((k) => [k, 'retire' as const])) } };
    assert.equal(bonusAssets(p, autresStatuts), bonusReference(p, autresStatuts));
  }
});

test('Générateur : mêmes propositions et mêmes changements avec la mémoire chaude ou froide', () => {
  const notes = lire('assets-notes.json') as { cle: string; note: number; etiquettes: string[] }[];
  const atelier = lire('atelier-notes.json') as { ingredients: Record<string, unknown>; note: number; etiquettes: string[] }[];
  const assets = poidsAssets(notes.map((n) => ({ cle: n.cle, note: n.note, etiquettes: n.etiquettes, statut: null })))!;
  const poids = { ...poidsAtelier(atelier.map((n) => ({ ingredients: n.ingredients, note: n.note, etiquettes: n.etiquettes }))), assets };
  const entree = { priorites: { principaux: ['sport'], secondaires: ['ongles'] }, couleursPreferees: ['bleu'] };
  const a = lotsPropositions(entree, 3, { poids });
  const b = lotsPropositions(entree, 3, { poids });
  const froid = lotsPropositions(entree, 3, { poids: structuredClone(poids) });
  assert.deepEqual(b, a);
  assert.deepEqual(froid, a);
  assert.deepEqual(changementsGenerateur(poids), changementsGenerateur(structuredClone(poids)));
});

test('changementsGenerateurDiffere (sujet par sujet) = changementsGenerateur', async () => {
  const notes = lire('assets-notes.json') as { cle: string; note: number; etiquettes: string[] }[];
  const atelier = lire('atelier-notes.json') as { ingredients: Record<string, unknown>; note: number; etiquettes: string[] }[];
  const poids = { ...poidsAtelier(atelier.map((n) => ({ ingredients: n.ingredients, note: n.note, etiquettes: n.etiquettes }))), assets: poidsAssets(notes.map((n) => ({ cle: n.cle, note: n.note, etiquettes: n.etiquettes, statut: null })))! };
  const attendu = changementsGenerateur(poids);
  assert.ok(attendu.sujets.length > 0);
  assert.deepEqual(await changementsGenerateurDiffere(poids), attendu);
  assert.deepEqual(await changementsGenerateurDiffere(null), changementsGenerateur(null));
});
