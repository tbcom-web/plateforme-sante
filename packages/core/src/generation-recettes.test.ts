import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { executerDemandeGeneration, modeleDesFiches, type DemandeGeneration } from './generation-recettes';
import { contexteScenario, genererCandidates } from './notation-recettes';
import { contexteImages, viderContexteImages } from './contexte-images';
import { poidsAtelier } from './atelier-poids';
import { poidsAssets } from './assets-poids';
import { MODELES_INTEGRES } from './modeles';

// Le worker de /admin/retours/recettes reçoit une copie (structuredClone, comme postMessage) : mêmes recettes pour la même graine
const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'retours', 'atelier-notes.json')))!;
const lire = (f: string) => JSON.parse(readFileSync(join(racine, 'retours', f), 'utf8'));

test('executerDemandeGeneration (copie sérialisée) = genererCandidates dans la page, même graine', () => {
  const atelier = lire('atelier-notes.json') as { ingredients: Record<string, unknown>; note: number; etiquettes: string[] }[];
  const notes = lire('assets-notes.json') as { cle: string; note: number; etiquettes: string[] }[];
  const poids = { ...poidsAtelier(atelier.map((n) => ({ ingredients: n.ingredients, note: n.note, etiquettes: n.etiquettes }))), assets: poidsAssets(notes.map((n) => ({ cle: n.cle, note: n.note, etiquettes: n.etiquettes, statut: null })))! };
  const photos = [{ url: '/photos/sport-course.webp', origine: 'integree' as const, sujets: ['sport'] }, { url: '/photos/enfant-bebe.webp', origine: 'integree' as const, sujets: ['enfant'] }];
  const images = { exclues: ['photo:sport-trail'], kits: {}, vivier: { sport: ['/photos/sport-course.webp'] } };
  for (const [i, scenario] of [{ principaux: ['sport'], secondaires: ['ongles'], couleurs: ['bleu'], soins: [] }, { principaux: ['diabete', 'senior'], secondaires: [], couleurs: [], soins: [] }].entries()) {
    const demande: DemandeGeneration = {
      scenario, contexte: { poids, photos, modeTirage: i ? 'decouverte' : null }, modeles: MODELES_INTEGRES,
      options: { n: 3, graine: 4242 + i, iterations: 12, refusees: ['gamme:mangue'], aValider: [], deja: [], stats: null }, images,
    };
    viderContexteImages();
    const viaWorker = executerDemandeGeneration(structuredClone(demande));
    assert.deepEqual([...contexteImages().exclues], images.exclues, 'contexte d’images reposé');
    assert.deepEqual(contexteImages().vivier, images.vivier);
    const dansLaPage = genererCandidates(scenario, contexteScenario(scenario, { poids, photos, modele: modeleDesFiches(MODELES_INTEGRES), modeTirage: demande.contexte.modeTirage }), {
      n: 3, graine: 4242 + i, iterations: 12, refusees: new Set(['gamme:mangue']), estAValider: () => false, deja: new Set(), stats: null,
    });
    assert.ok(dansLaPage.length > 0);
    assert.deepEqual(viaWorker, dansLaPage);
  }
  viderContexteImages();
  // Garde-fou : un nouveau champ du registre d'images doit aussi voyager vers le worker (DemandeGeneration.images)
  assert.deepEqual(Object.keys(contexteImages()).sort(), ['exclues', 'kits', 'vivier']);
});
