import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appareilDe, clesDefautsOuverts, empreinteMobile, etatsMobile, markdownDefautsMobile, markdownRetoursMobile, POIDS_APPAREIL, retourMobileDepuisLigne,
  statsParAppareil, VERSIONS_MOBILE, type RetourMobile,
} from './rendu-mobile';
import { poidsAssets, statsAssets, type LigneAppriseAsset } from './assets-poids';
import { poidsAtelier, type NoteAtelier } from './atelier-poids';
import { clesPage, clesStructure, compositionInitiale, markdownParPage, recettesPourScenario, renfortsPoids, sourcesNotesPages, tirerPage, type CompositionRecette, type Recette } from './recettes';

const n = (cle: string, note: number, k: number, appareil?: string): LigneAppriseAsset[] => Array.from({ length: k }, () => ({ cle, note, ...(appareil ? { appareil } : {}) }));

test('rétrocompatibilité : notes sans appareil = « les-deux », poids identiques à avant', () => {
  const avant = [...n('picto:ongle', 5, 3), ...n('picto:verrue', 2, 2), ...n('gamme:cobalt', 4, 1)];
  const lesDeux = avant.map((x) => ({ ...x, appareil: 'les-deux' }));
  const ordi = avant.map((x) => ({ ...x, appareil: 'ordinateur' }));
  assert.deepEqual(poidsAssets(lesDeux), poidsAssets(avant));
  assert.deepEqual(poidsAssets(ordi), poidsAssets(avant));
  assert.equal(appareilDe(undefined), 'les-deux');
  assert.equal(appareilDe('tablette'), 'les-deux');
  // Atelier
  const ing = { structure: 'clair-pratique', gamme: 'cobalt', style: 'ligne', theme1: 'sport', animation: null };
  const notes: NoteAtelier[] = [{ ingredients: ing, note: 5 }, { ingredients: { ...ing, gamme: 'mangue' }, note: 2 }];
  assert.deepEqual(poidsAtelier(notes.map((x) => ({ ...x, appareil: 'les-deux' }))), poidsAtelier(notes));
});

test('agrégation par appareil et lissage : une note mobile pèse un peu plus (mobile d’abord)', () => {
  // Bien noté sur ordinateur, mal sur mobile : l'effet appris est tiré vers la note mobile
  const lignes = [...n('composant:galerie:bande', 5, 2, 'ordinateur'), ...n('composant:galerie:bande', 1, 2, 'mobile'), ...n('picto:ongle', 3, 4)];
  const { cles } = statsAssets(lignes);
  const s = cles.get('composant:galerie:bande')!;
  assert.equal(s.n, 4);
  assert.equal(s.poids, 2 + 2 * POIDS_APPAREIL.mobile);
  assert.ok(s.moyenne < 3, `moyenne pondérée ${s.moyenne} sous 3 (la note mobile pèse plus)`);
  const equilibre = statsAssets([...n('composant:galerie:bande', 5, 2), ...n('composant:galerie:bande', 1, 2), ...n('picto:ongle', 3, 4)]).cles.get('composant:galerie:bande')!;
  assert.equal(equilibre.moyenne, 3);
  assert.ok(poidsAssets(lignes)!.effets['composant:galerie:bande'] < (poidsAssets([...n('composant:galerie:bande', 5, 2), ...n('composant:galerie:bande', 1, 2), ...n('picto:ongle', 3, 4)])!.effets['composant:galerie:bande'] ?? 0));
  // Lissage : une seule note mobile reste un effet faible
  const une = poidsAssets([...n('picto:a', 1, 1, 'mobile'), ...n('picto:b', 3, 10)])!;
  assert.ok(Math.abs(une.effets['picto:a']) < 1, 'lissé vers la moyenne');
  // Moyennes par appareil (synthèse)
  const parApp = statsParAppareil(lignes.map((l) => ({ cle: l.cle, note: l.note!, appareil: l.appareil })));
  assert.deepEqual(parApp.get('composant:galerie:bande')!.ordinateur, { n: 2, moyenne: 5 });
  assert.deepEqual(parApp.get('composant:galerie:bande')!.mobile, { n: 2, moyenne: 1 });
  assert.deepEqual(parApp.get('picto:ongle')!['les-deux'], { n: 4, moyenne: 3 });
});

test('note par page : ne renforce que les clés de sa page, au poids de son appareil', () => {
  const ctx = { sujets: ['sport', 'enfant'], principaux: 2 };
  const x0 = compositionInitiale(ctx);
  const x = { ...x0, structure: 'clair-pratique' as const, sections: { ...x0.sections, variantes: { ...x0.sections.variantes, infos: 'colonnes' as const, horaires: 'carte' as const, contact: 'bandeau' as const, theme: 'rangees' as const } } };
  const k = clesPage(x, 'acces');
  assert.ok(k.assets.some((c) => c.startsWith('structure:acces:')), 'structure de la page Contact');
  assert.ok(k.assets.includes('composant:contact:bandeau'));
  assert.ok(k.atelier.includes('variante=horaires:carte'));
  assert.ok(!k.assets.some((c) => c.startsWith('structure:accueil:') || c.startsWith('gamme:') || c.startsWith('modele:')), 'rien hors de la page');
  assert.ok(!k.atelier.some((c) => c.startsWith('police=') || c.startsWith('ordre=')), 'ni police ni ordre de l’accueil');
  assert.ok(clesPage(x, 'accueil').atelier.some((c) => c.startsWith('ordre=')), 'l’accueil porte son ordre');
  assert.ok(clesPage(x, 'theme').assets.includes('composant:theme:rangees'), 'page sujet');
  const sources = sourcesNotesPages([
    { recette: 'r1', note: 5, page: 'acces', appareil: 'mobile', composition: x, sujets: ['sport'] },
    { recette: 'r1', note: 1, page: null, composition: x, sujets: ['sport'] },
  ]);
  assert.equal(sources.length, 1, 'la note de recette entière n’est pas reprise ici');
  assert.equal(sources[0].poids, POIDS_APPAREIL.mobile);
  const r = renfortsPoids(sources);
  assert.ok(Object.keys(r.assets).every((c) => c.startsWith('structure:acces:') || c.startsWith('composant:') ), 'renforts limités à la page');
  assert.ok(!Object.keys(r.assets).some((c) => c.startsWith('structure:accueil:')));
  assert.ok(r.assets['composant:contact:bandeau'] > 0);
  // Poids d'appareil : la même note sur mobile renforce un peu plus
  const ordi = renfortsPoids([{ ...sources[0], poids: 1 }]);
  assert.ok(r.assets['composant:contact:bandeau'] > ordi.assets['composant:contact:bandeau']);
  assert.match(markdownParPage([{ recette: 'r1', note: 5, page: 'acces', appareil: 'mobile', composition: x, etiquettes: ['clair'], nom: 'Recette A' }]), /### Contact et accès — 1 note\(s\), moyenne 5★ \(1 sur mobile\)/);
});

test('dé de page sujet et d’article : seule la page visée change', () => {
  const ctx = { sujets: ['sport'], principaux: 1 };
  const x: CompositionRecette = { ...compositionInitiale(ctx), structure: 'clair-pratique' };
  const y = tirerPage(x, { page: 'theme' }, ctx, 11);
  const v = (c: CompositionRecette) => c.sections.variantes as Record<string, string>;
  assert.notEqual(v(y).theme, v(x).theme);
  for (const s of Object.keys(v(x)).filter((s) => s !== 'theme')) assert.equal(v(y)[s], v(x)[s], `${s} inchangé`);
  const z = tirerPage(x, { page: 'article' }, ctx, 12);
  assert.notEqual(v(z).article, v(x).article);
  assert.ok(clesStructure(z).some((k) => k.startsWith('structure:article:')));
});

test('défauts mobiles : un « Mobile à revoir » ouvre un défaut, « Mobile OK » le clôt, une feuille corrigée le rend « Modifié (mobile) »', () => {
  const e0 = empreinteMobile('composant:galerie:bande');
  const r: RetourMobile[] = [
    { cle: 'composant:galerie:bande', verdict: 'a_revoir', etiquettes: ['image-coupee'], statut: 'a_corriger', empreinte: e0, le: '2026-10-07T10:00:00Z', zones: { appareil: 'mobile', empreinte: null, zones: [{ forme: 'rect', x: 0, y: 0.5, l: 0.5, h: 0.3, etiquette: 'coupe', commentaire: 'photo coupée', appareil: 'mobile' }] } },
    { cle: 'structure:acces:volets-tableau-barre', verdict: 'a_revoir', etiquettes: ['texte-trop-petit'], statut: 'a_corriger', empreinte: empreinteMobile('structure:acces:volets-tableau-barre'), le: '2026-10-07T10:01:00Z' },
    { cle: 'structure:acces:volets-tableau-barre', verdict: 'ok', etiquettes: [], statut: 'sans_objet', le: '2026-10-07T11:00:00Z' },
  ];
  let etats = etatsMobile(r, (k) => empreinteMobile(k));
  assert.deepEqual([...clesDefautsOuverts(etats)], ['composant:galerie:bande']);
  assert.equal(etats.get('structure:acces:volets-tableau-barre')!.ouverts.length, 0, 'clos par « Mobile OK »');
  // Correction de la feuille responsive : version incrémentée → « Modifié (mobile) », plus compté comme ouvert
  VERSIONS_MOBILE['composant:galerie'] = '2026-10-08';
  try {
    etats = etatsMobile(r, (k) => empreinteMobile(k));
    assert.equal(etats.get('composant:galerie:bande')!.modifie, true);
    assert.equal(clesDefautsOuverts(etats).size, 0);
    assert.match(markdownDefautsMobile(r, { empreinteActuelle: (k) => empreinteMobile(k) }), /Modifié \(mobile\)/);
  } finally {
    delete VERSIONS_MOBILE['composant:galerie'];
  }
  const md = markdownRetoursMobile([{ cle: 'picto:a', note: 5, appareil: 'ordinateur' }, { cle: 'picto:a', note: 2, appareil: 'mobile' }], r, { titres: { 'composant:galerie:bande': 'Galerie, bande de quatre' } });
  assert.match(md, /## Retours mobile/);
  assert.match(md, /Galerie, bande de quatre/);
  assert.match(md, /Image coupée/);
  assert.match(md, /zone 1 à gauche \(mobile\) : coupé — « photo coupée »/);
  assert.match(md, /ordinateur 5★, mobile 2★/);
  // Lecture d'une ligne
  const l = retourMobileDepuisLigne({ cle: 'composant:galerie:bande', verdict: 'a_revoir', etiquettes: ['image-coupee', 'inconnue'], note: 9, statut: 'bizarre', created_at: '2026-10-07' })!;
  assert.deepEqual([l.etiquettes, l.note, l.statut], [['image-coupee'], null, 'a_corriger']);
  assert.equal(retourMobileDepuisLigne({ cle: 'pas une clé' }), null);
});

test('un défaut mobile ouvert ne touche pas la note du choix : la recette passe seulement après les autres', () => {
  const ctx = { sujets: ['sport'], principaux: 1 };
  const x = compositionInitiale(ctx);
  const y = { ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, galerie: 'bande' as const } } };
  const z = { ...x, sections: { ...x.sections, variantes: { ...x.sections.variantes, galerie: 'mosaique' as const } } };
  const recettes: Recette[] = [
    { id: 'a', nom: 'A', sujets: ['sport'], couleursPreferees: [], composition: y, note: 5, etiquettes: [], statut: 'active' },
    { id: 'b', nom: 'B', sujets: ['sport'], couleursPreferees: [], composition: z, note: 4, etiquettes: [], statut: 'active' },
  ];
  assert.deepEqual(recettesPourScenario(recettes, ['sport']).map((r) => r.id), ['a', 'b']);
  assert.deepEqual(recettesPourScenario(recettes, ['sport'], 4, new Set(['composant:galerie:bande'])).map((r) => r.id), ['b', 'a']);
  assert.equal(recettes[0].note, 5, 'note inchangée');
});
