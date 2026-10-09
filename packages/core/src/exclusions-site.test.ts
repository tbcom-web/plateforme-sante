// Exclusions à la construction des sites publiés (exclusions-site.ts) : mêmes règles que l'admin ; un élément refusé de la
// configuration est remplacé par son repli.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliquerExclusionsSite, clesExcluesSite } from './exclusions-site';
import { draftVide } from './draft';
import { TYPO_PAR_DEFAUT } from './typo';
import { MENU_PAR_DEFAUT } from './menus';

const JOUR = '2026-10-09';
const connues = new Set(['composant:accueil:bento', 'composant:accueil:fondu', 'composant:accueil:arche-photo', 'menu:mobile:pastilles']);

test('clés exclues : nouveautés non acceptées ou refusées, ≤ 2 ★, retirées, photos à valider ; acceptées gardées', () => {
  const lignes = [
    { cle: 'composant:accueil:fondu', note: 4 }, // une note vaut acceptation
    { cle: 'photo:pied-x', note: 2 },
    { cle: 'gamme:mangue', note: 1 },
    { cle: 'composant:accueil:arche-photo', statut: 'retire' },
    { cle: 'menu:mobile:pastilles', statut: 'accepte' },
  ];
  const r = clesExcluesSite({ lignes, jour: JOUR, connues, urlsAValider: ['https://x.supabase.co/storage/v1/object/public/photos/libres/a.webp'] });
  assert.ok(r.has('composant:accueil:bento'), 'en attente');
  assert.ok(r.has('composant:accueil:arche-photo'), 'refusée');
  assert.ok(!r.has('composant:accueil:fondu') && !r.has('menu:mobile:pastilles'), 'acceptées');
  assert.ok(r.has('photo:pied-x') && r.has('gamme:mangue'));
  assert.ok(r.has('https://x.supabase.co/storage/v1/object/public/photos/libres/a.webp'));
});

test('configuration avec un élément refusé → remplacé par le repli ; sans exclusion : inchangée', () => {
  const d0 = draftVide();
  const d = {
    ...d0,
    theme: { ...d0.theme, gamme: 'mangue', variantes: { accueil: 'arche-photo', soins: 'filets' }, menu: { ...MENU_PAR_DEFAUT, mobile: 'pastilles' }, typo: { ...TYPO_PAR_DEFAUT, casse: 'capitales' }, photosRecette: ['/photos/pied-x.webp', '/photos/ok.webp'] },
    photos: { ...d0.photos, accueil: '/photos/pied-x.webp', cabinet: ['/photos/ok.webp', '/photos/pied-x.webp'] },
  } as unknown as typeof d0;
  const exclues = new Set(['gamme:mangue', 'composant:accueil:arche-photo', 'menu:mobile:pastilles', 'typo:casse:capitales', 'photo:pied-x']);
  const { draft, retires } = appliquerExclusionsSite(d, exclues);
  assert.equal(draft.theme.gamme, '');
  assert.equal((draft.theme.variantes as Record<string, string>).accueil, undefined);
  assert.equal((draft.theme.variantes as Record<string, string>).soins, 'filets');
  assert.equal(draft.theme.menu!.mobile, MENU_PAR_DEFAUT.mobile);
  assert.equal(draft.theme.typo!.casse, TYPO_PAR_DEFAUT.casse);
  assert.deepEqual(draft.theme.photosRecette, ['/photos/ok.webp']);
  assert.equal(draft.photos.accueil, '');
  assert.deepEqual(draft.photos.cabinet, ['/photos/ok.webp']);
  assert.ok(retires.includes('composant:accueil:arche-photo'));
  assert.equal(appliquerExclusionsSite(d, new Set(['gamme:autre'])).draft, d, 'rien d’exclu présent : même objet');
});
