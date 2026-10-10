// Tests des images fixes des animations du pied (images-fixes-pied.ts) — lancer : node packages/core/scripts/tests.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMAGES_FIXES_PIED, FICHES_IMAGES_FIXES, CLES_IMAGES_FIXES, HASHTAGS_IMAGES_FIXES, HALO_TALON, svgImageFixe, poserChemin } from './images-fixes-pied';
import { ANIMATIONS_PIED } from './entete-pied';
import { GEO_PIED } from './entete-pied-geo';
import { inventaireIllustrations } from './illustrations';
import { baseDeCle } from './bases-illustrations';
import { HASHTAGS_PAR_DEFAUT } from './kits';
import { estHashtag } from './hashtags';
import { SUJETS_VISUELS } from './photos-libres';
import { DESSINS_PODOLOGIE } from './univers';
import { PRATIQUE_PODOLOGUE } from './pratiques';
import { activitesReconnues, kitDuProfil, profilParId } from './profils';

const COULEUR_LITTERALE = /(?<![\w-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])|\b(?:rgba?|hsla?)\(\s*[\d.]/i;

test('images fixes : dans l’inventaire, « À revoir » (jamais Validé), base dessin:<id>, sans texte, chiffre ni couleur littérale', () => {
  const inv = inventaireIllustrations();
  assert.equal(CLES_IMAGES_FIXES.length, 5);
  for (const cle of CLES_IMAGES_FIXES) {
    const i = inv.find((x) => x.cle === cle);
    assert.ok(i, cle);
    assert.equal(i.statutParDefaut, 'a_revoir');
    assert.equal(i.type, 'dessin');
    const [, nom] = cle.split(':');
    assert.equal(baseDeCle(cle), `dessin:${nom}`);
    assert.ok(!(DESSINS_PODOLOGIE as readonly string[]).includes(nom), `${nom} : nom déjà pris`);
    const svg = i.svg();
    assert.match(svg, new RegExp(`^<svg class="dessin [^"]*dessin--${i.registre}"`));
    assert.ok(!/<text|<style|NaN|undefined|Infinity/.test(svg), `${cle} : texte, style ou valeur invalide`);
    assert.ok(!COULEUR_LITTERALE.test(svg), `${cle} : couleur littérale`);
    assert.ok(svg.length < 12000, `${cle} : ${svg.length} octets`);
  }
  for (const n of IMAGES_FIXES_PIED) for (const r of FICHES_IMAGES_FIXES[n].registres) assert.ok(!/id="(?!x-)/.test(svgImageFixe(n, { registre: r, id: 'x' })), `${n} : identifiant non préfixé`);
});

test('images fixes : dérivées des animations validées (même géométrie), aucune anatomie nouvelle', () => {
  for (const n of IMAGES_FIXES_PIED) assert.ok((ANIMATIONS_PIED as readonly string[]).includes(FICHES_IMAGES_FIXES[n].animation));
  // Montagne : toutes les courbes de niveau, la crête et le sentier de la géométrie dérivée ; pas = silhouette validée du pied
  const m = svgImageFixe('trail-montagne', { registre: 'pedagogique', id: 'x' });
  for (const n of GEO_PIED.montagne.niveaux) assert.ok(m.includes(poserChemin(n.d, 0.1875, 0.1875, 7.5, 0)), `niveau ${n.k}`);
  assert.ok(m.includes(`d="${GEO_PIED.adulte}"`));
  assert.equal((m.match(/<use /g) ?? []).length, GEO_PIED.montagne.pas.length);
  // Talon : la silhouette adulte et UN seul cercle (jamais une cible : aucun anneau concentrique, aucune croix), au talon
  const t = svgImageFixe('talon-douloureux', { id: 'x' });
  assert.equal((t.match(/<circle/g) ?? []).length, 1);
  assert.ok(!/<line|halo-cor|--d-chaud|pression-5/.test(t));
  assert.ok(HALO_TALON.cy > 140 && HALO_TALON.cy < 165 && Math.abs(HALO_TALON.cx - 120) < 6, JSON.stringify(HALO_TALON));
  // Chronomètre : grammaire du matériel (repère 120 × 90), aucun chiffre
  const c = svgImageFixe('chronometre', { registre: 'releve', id: 'x' });
  assert.match(c, /viewBox="0 0 120 90"/);
  assert.match(c, /dessin--materiel/);
});

test('fiches : sujets connus, hashtags valides repris dans HASHTAGS_PAR_DEFAUT ; #trail #randonnee, #douleur-talon', () => {
  const sujets = SUJETS_VISUELS.map((s) => s.id);
  for (const n of IMAGES_FIXES_PIED) {
    const f = FICHES_IMAGES_FIXES[n];
    assert.ok(f.sujets.every((s) => sujets.includes(s)), n);
    assert.ok(f.hashtags.every(estHashtag), n);
  }
  for (const cle of CLES_IMAGES_FIXES) assert.deepEqual(HASHTAGS_PAR_DEFAUT[cle], HASHTAGS_IMAGES_FIXES[cle]);
  assert.ok(HASHTAGS_PAR_DEFAUT['dessin:trail-montagne:pedagogique'].includes('trail') && HASHTAGS_PAR_DEFAUT['dessin:trail-montagne:pedagogique'].includes('randonnee'));
  assert.ok(HASHTAGS_PAR_DEFAUT['dessin:talon-douloureux:pedagogique'].includes('douleur-talon'));
  assert.ok(!JSON.stringify(FICHES_IMAGES_FIXES).match(/postur|reflexo/i));
});

test('kit « Sport · trail / randonnée » : la montagne y entre (à valider), le chronomètre reste générique, rien pour un praticien', () => {
  const p = PRATIQUE_PODOLOGUE;
  const profil = profilParId('sport-rando')!;
  assert.equal(profil.court, 'Sport · trail / randonnée');
  assert.deepEqual([...profil.activites].sort(), ['randonnee', 'trail']);
  assert.deepEqual(activitesReconnues({ cle: 'dessin:trail-montagne:pedagogique', tags: [...HASHTAGS_IMAGES_FIXES['dessin:trail-montagne:pedagogique']] }, p).sort(), ['randonnee', 'trail']);
  assert.deepEqual(activitesReconnues({ cle: 'dessin:chronometre:releve', tags: [...HASHTAGS_IMAGES_FIXES['dessin:chronometre:releve']] }, p), []);
  const visuels = { visuels: CLES_IMAGES_FIXES.map((cle) => ({ cle, type: 'dessin' as const, soins: [] })), hashtags: HASHTAGS_IMAGES_FIXES };
  const kit = kitDuProfil(profil, { visuels });
  const cles = JSON.stringify(kit);
  assert.ok(cles.includes('dessin:trail-montagne:pedagogique'), cles);
  assert.ok(!JSON.stringify(kitDuProfil(profil, { visuels }, { praticien: true }).activites).includes('trail-montagne'));
});
