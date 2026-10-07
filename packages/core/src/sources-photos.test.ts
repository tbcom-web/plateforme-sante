import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { creditPhotoIntegree, CREDITS_PHOTOS_INTEGREES, LICENCE_UNSPLASH } from './credits-photos';
import { PHOTOS_INTEGREES } from './jeux-photos';
import { csvLicences } from './photos-libres';
import { cheminStockagePhoto, csvDepuisRecap, libelleSourceImage, recapSourcesImages, typeSourceImage, validerSourcePhoto } from './sources-photos';

const SB = 'https://x.supabase.co/storage/v1/object/public/photos/';
const SITE = '0b9a2b7e-1c1d-4a4a-9d8e-123456789abc';

test('crédits : chaque photo de la banque intégrée a son crédit, et inversement', () => {
  const racine = [process.cwd(), join(process.cwd(), '..', '..')].find((r) => existsSync(join(r, 'apps', 'sites', 'public', 'photos')))!;
  const dossier = readdirSync(join(racine, 'apps', 'sites', 'public', 'photos')).filter((f) => /\.(webp|jpe?g|png|avif)$/.test(f)).sort();
  assert.deepEqual(CREDITS_PHOTOS_INTEGREES.map((c) => c.fichier).sort(), dossier, 'un crédit par fichier, aucun crédit orphelin');
  assert.deepEqual(CREDITS_PHOTOS_INTEGREES.map((c) => `/photos/${c.fichier}`).sort(), [...PHOTOS_INTEGREES].sort());
  for (const c of CREDITS_PHOTOS_INTEGREES) {
    assert.ok(c.photographe.trim(), c.fichier);
    assert.match(c.urlSource, /^https:\/\/unsplash\.com\/photos\/[A-Za-z0-9_-]+$/, c.fichier);
    assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/, c.fichier);
  }
  assert.equal(creditPhotoIntegree('/photos/sport-trail.webp')?.photographe, 'Mathias Reding');
  assert.equal(creditPhotoIntegree('/photos/inconnue.webp'), null);
  assert.equal(LICENCE_UNSPLASH.url, 'https://unsplash.com/license');
});

test('sources : provenance obligatoire et champs selon la provenance', () => {
  assert.ok(validerSourcePhoto({}).erreurs.length);
  assert.deepEqual(validerSourcePhoto({ provenance: 'adobe-stock', referenceLicence: '  ' }).source, null);
  assert.deepEqual(validerSourcePhoto({ provenance: 'adobe-stock', referenceLicence: ' 123456 ', auteur: 'ignoré' }).source, { provenance: 'adobe-stock', referenceLicence: '123456' });
  assert.ok(validerSourcePhoto({ provenance: 'personnelle' }).erreurs.length);
  assert.deepEqual(validerSourcePhoto({ provenance: 'personnelle', auteur: 'Cabinet Dupont' }).source, { provenance: 'personnelle', auteur: 'Cabinet Dupont' });
  assert.equal(validerSourcePhoto({ provenance: 'autre-banque', banque: 'Freepik', urlSource: 'http://x.fr', licence: 'L' }).source, null, 'https exigé');
  assert.equal(validerSourcePhoto({ provenance: 'autre-banque', banque: 'Freepik', urlSource: 'https://x.fr/p' }).erreurs.length, 1, 'licence manquante');
  assert.equal(validerSourcePhoto({ provenance: 'autre-banque', banque: 'Freepik', urlSource: 'https://x.fr/p', licence: 'Licence Freepik' }).source?.banque, 'Freepik');
});

test('sources : classement d’une image d’après son adresse', () => {
  assert.equal(typeSourceImage('/photos/sport-trail.webp'), 'integree');
  assert.equal(typeSourceImage('/photos/absente.webp'), 'inconnue');
  assert.equal(typeSourceImage(`${SB}banque/libres/sport/pexels-1-640.webp`), 'libre');
  assert.equal(typeSourceImage(`${SB}banque/jeux/podologie/accueil-1.webp`), 'banque');
  assert.equal(typeSourceImage(`${SB}banque/sites/${SITE}/a.webp`, 'adobe'), 'adobe');
  assert.equal(typeSourceImage(`${SB}banque/sites/${SITE}/a.webp`, 'praticien'), 'praticien');
  assert.equal(typeSourceImage(`${SB}${SITE}/portrait.webp`), 'praticien');
  assert.equal(typeSourceImage('https://ailleurs.fr/x.jpg'), 'inconnue');
  assert.equal(cheminStockagePhoto(`${SB}banque/jeux/a%20b.webp?v=2`), 'banque/jeux/a b.webp');
  assert.equal(cheminStockagePhoto(`${SB}../x`), null);
});

test('sources : récapitulatif (à renseigner d’abord) et export CSV complet', () => {
  const manuelle = `${SB}banque/jeux/podologie/accueil-1.webp`;
  const sansSource = `${SB}banque/jeux/podologie/galerie-2.webp`;
  const r = recapSourcesImages({
    libres: [{ url: null, apercuUrl: 'https://images.pexels.com/photos/1/a.jpeg', source: 'pexels', idSource: '1', auteur: 'A', pageUrl: 'https://www.pexels.com/photo/1/', licence: 'Licence Pexels', licenceVersion: 'texte en vigueur au 2026-10-07', licenceUrl: 'https://www.pexels.com/license/', telechargeLe: null, importeLe: null, statut: 'a_valider', sujet: 'sport' }],
    photosJeux: [
      { url: manuelle, jeu: 'Podologie 1', source: 'banque' }, { url: sansSource, jeu: 'Podologie 1', source: 'banque' },
      { url: `${SB}banque/sites/${SITE}/a.webp`, jeu: 'Cabinet X', source: 'adobe' }, { url: `${SB}${SITE}/p.webp`, jeu: 'Cabinet X', source: 'praticien' },
      { url: '/photos/sport-trail.webp', jeu: 'Sport 1', source: 'banque' },
    ],
    manuelles: { 'banque/jeux/podologie/accueil-1.webp': { provenance: 'personnelle', auteur: 'Cabinet Dupont', le: '2026-10-07T10:00:00Z' } },
    adobe: [{ url: `${SB}banque/sites/${SITE}/a.webp`, reference: 'AS-1', dateAchat: '2026-09-01', transferee: true, site: SITE }],
  });
  assert.equal(r.length, CREDITS_PHOTOS_INTEGREES.length + 5);
  assert.equal(r[0].url, sansSource, 'à renseigner d’abord');
  assert.ok(r[0].aRenseigner);
  assert.equal(r.filter((x) => x.aRenseigner).length, 1);
  const m = r.find((x) => x.url === manuelle)!;
  assert.equal(m.licence, 'Photo personnelle / réalisée pour le cabinet');
  assert.equal(m.auteur, 'Cabinet Dupont');
  assert.equal(libelleSourceImage(r.find((x) => x.type === 'praticien')!), 'Photo fournie par le praticien');
  assert.equal(r.find((x) => x.type === 'adobe')!.licence, 'Adobe Stock, réf. AS-1');
  const integ = r.find((x) => x.url === '/photos/sport-trail.webp')!;
  assert.equal(integ.usage, 'Sport 1');
  assert.equal(integ.licence, 'Unsplash License');
  assert.equal(r.find((x) => x.type === 'libre')!.statut, 'À valider (non importée)');
  const csv = csvLicences(csvDepuisRecap(r));
  assert.ok(csv.includes('Unsplash License'));
  assert.ok(csv.includes('Source à renseigner'));
  assert.equal(csv.trim().split('\r\n').length, r.length + 1);
});
