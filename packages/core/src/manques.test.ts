// Atelier des manques (manques.ts) : manques par profil et emplacement, raisons (rien, moyennes, trop peu), jamais de faible preuve
// ni d'animation pour un sujet calme, fusion entre profils, manques du composeur, imports rattachés, priorité, prompts conformes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculerManques, etatImport, gammePourManque, hashtagsDuManque, manqueDuTrou, manquesDuProfil, promptsDuManque, trouDuManque, CONDITIONS_OUTILS, SEUIL_OPTIONS,
  type EntreeManques, type Manque,
} from './manques';
import { profilsDePratique, type ElementProfil, type KitProfil, type ProfilPratique } from './profils';
import { pratiqueDe } from './pratiques';
import { FAMILLES_KIT, type FamilleKit } from './kits-visuels';
import { CONTRAINTES_NEGATIVES, motifsRefus } from './prompts-images';
import { SCENES_ACTIVITES } from './manques';

const PROFILS = profilsDePratique('podologue');
const profil = (id: string) => PROFILS.find((p) => p.id === id)!;
const el = (cle: string, famille: FamilleKit, note: number | null, aValider = false, url?: string): ElementProfil => ({ cle, famille, note, aValider, ...(url ? { url } : {}) });
const vide = (): Record<FamilleKit, ElementProfil[]> => ({ photo: [], illustration: [], icone: [], animation: [] });
const plein = (prefixe: string): Record<FamilleKit, ElementProfil[]> => {
  const r = vide();
  for (const f of FAMILLES_KIT) r[f] = [1, 2, 3].map((i) => el(`${f}:${prefixe}-${i}`, f, 4.5, false, f === 'photo' ? `https://x.test/${prefixe}-${i}.webp` : undefined));
  return r;
};
function kit(p: ProfilPratique, familles: Partial<Record<string, Record<FamilleKit, ElementProfil[]>>>): KitProfil {
  const activites = p.activites.map((a) => ({ activite: a, hashtag: a, libelle: a, familles: familles[a] ?? vide() }));
  return { profil: p.id, sujet: p.principal ?? 'general', activites, generique: familles.theme ?? vide(), replis: [] };
}

// Golf : photos moyennes, une seule illustration bonne, icônes complètes, animation à valider ; Diabète : rien du tout ;
// Course : tout est complet ; Enfant : rien
const golf = vide();
golf.photo = [el('photo:golf-1', 'photo', 3, false, 'https://x.test/g1.webp'), el('photo:golf-2', 'photo', 3.5, false, 'https://x.test/g2.webp')];
golf.illustration = [el('dessin:un-golf:pedagogique', 'illustration', 5)];
golf.icone = plein('golf').icone;
golf.animation = [el('composant:entete-anim:un-golf', 'animation', null, true)];
const ENTREE: EntreeManques = {
  profession: 'podologue',
  kits: [
    { profil: profil('sport-course'), kit: kit(profil('sport-course'), { course: plein('course') }) },
    { profil: profil('sport-golf'), kit: kit(profil('sport-golf'), { golf }) },
    { profil: profil('diabete'), kit: kit(profil('diabete'), {}) },
    { profil: profil('enfant'), kit: kit(profil('enfant'), {}) },
  ],
  composeur: [
    { profil: 'diabete', manques: [
      { id: 'image|diabete|illustration', type: 'image', dimension: 'illustration', sujet: 'diabete', texte: 'Pas d’illustration validée pour « Diabète »', exemple: null, frequence: 0 },
      { id: 'element|composant:accueil', type: 'element', dimension: 'composant:accueil', sujet: null, texte: 'Premiers écrans : aucun élément 4-5 ★', exemple: 'composant:accueil:figure', frequence: 5 },
    ] },
    { profil: 'sport-golf', manques: [{ id: 'element|composant:accueil', type: 'element', dimension: 'composant:accueil', sujet: null, texte: 'Premiers écrans : aucun élément 4-5 ★', exemple: null, frequence: 3 }] },
  ],
  imports: [
    { trou: 'sport|manque:golf:photo-accueil', statut: 'a_valider' },
    { trou: 'sport|manque:course:photo-accueil', statut: 'validee' },
    { trou: 'sport|accueil', statut: 'validee' },
  ],
};
const R = calculerManques(ENTREE);
const par = (id: string) => R.manques.find((m) => m.id === id);

test('un emplacement complet (3 bons choix) n’est pas un manque', () => {
  assert.equal(R.manques.filter((m) => m.activite === 'course').length, 0);
  assert.equal(par('sport|golf|icone'), undefined);
});

test('raisons : rien, que des moyennes, trop peu', () => {
  assert.equal(par('sport|golf|photo-accueil')?.raison, 'moyens');
  assert.equal(par('sport|golf|illustration')?.raison, 'peu');
  assert.equal(par('diabete|theme|photo-accueil')?.raison, 'aucun');
  assert.ok(par('sport|golf|illustration')!.texte.includes(`sur ${SEUIL_OPTIONS}`));
});

test('jamais d’animation pour un sujet calme, animation à valider = en cours', () => {
  assert.equal(R.manques.some((m) => m.sujet === 'diabete' && m.emplacement === 'animation'), false);
  const a = par('sport|golf|animation')!;
  assert.equal(a.etat, 'a-valider');
  assert.equal(a.enAttente, 1);
});

test('jamais de manque pour un sujet à faible preuve', () => {
  const p = { ...profil('diabete'), id: 'posture-x', principal: 'posture', court: 'Posture' } as ProfilPratique;
  const r = calculerManques({ ...ENTREE, kits: [{ profil: p, kit: { ...kit(p, {}), sujet: 'posture' } }], composeur: [] });
  assert.equal(r.manques.length, 0);
  assert.equal(promptsDuManque({ ...par('diabete|theme|photo-accueil')!, sujet: 'posture' }).length, 0);
});

test('manques du composeur : fusion avec le kit, éléments fusionnés entre profils (profils bloqués, modèles)', () => {
  const ill = par('diabete|theme|illustration')!;
  assert.equal(ill.composeur, 1);
  assert.equal(ill.raison, 'aucun');
  const fond = par('element|composant-accueil')!;
  assert.deepEqual(fond.profils.sort(), ['diabete', 'sport-golf']);
  assert.equal(fond.modeles, 8);
  assert.equal(fond.composeur, 2);
  assert.deepEqual(fond.outils, ['claude']);
});

test('imports : rattachés au manque (en attente → à valider), comblés comptés', () => {
  const ph = par('sport|golf|photo-accueil')!;
  assert.equal(ph.imports.enAttente, 1);
  assert.equal(ph.etat, 'a-valider');
  assert.equal(R.progression.combles, 1);
  assert.equal(etatImport('a_valider'), 'attente');
  assert.equal(etatImport('retiree'), 'refuse');
});

test('trou ↔ manque (contrainte de photos_libres.ia_trou)', () => {
  for (const m of R.manques) {
    assert.match(m.trou, /^[a-z-]{2,30}\|[a-z0-9:-]{2,90}$/, m.trou);
    assert.equal(manqueDuTrou(m.trou), m.id);
  }
  assert.equal(manqueDuTrou('sport|accueil'), null);
  assert.equal(trouDuManque({ sujet: 'sport', activite: 'golf', emplacement: 'photo-accueil', dimension: null }), 'sport|manque:golf:photo-accueil');
});

test('priorité : rien de validé et profils fréquents d’abord, en cours reculent', () => {
  const ids = R.manques.map((m) => m.id);
  assert.ok(ids.indexOf('diabete|theme|photo-accueil') < ids.indexOf('sport|golf|illustration'));
  assert.ok(ids.indexOf('sport|golf|animation') > ids.indexOf('sport|golf|illustration'));
  for (let i = 1; i < R.manques.length; i++) assert.ok(R.manques[i - 1].priorite >= R.manques[i].priorite);
  // Fréquences données par l'appelant : l'enfant passe devant le diabète
  const r2 = calculerManques({ ...ENTREE, frequences: { enfant: 10, diabete: 0 } });
  assert.ok(r2.manques.findIndex((m) => m.sujet === 'enfant') < r2.manques.findIndex((m) => m.sujet === 'diabete'));
});

test('progression et manques par profil', () => {
  assert.ok(R.progression.emplacements > 0 && R.progression.prets >= 4);
  assert.equal(R.parProfil.find((p) => p.id === 'sport-course')?.manques, 0);
  assert.ok(manquesDuProfil(R.manques, { id: 'diabete' }).length >= 3);
  assert.ok(manquesDuProfil(R.manques, { sujets: ['sport'], activites: ['golf'] }).some((m) => m.activite === 'golf'));
});

test('hashtags du dépôt : activité d’abord (bon sujet de À valider), image générée, manque', () => {
  assert.deepEqual(hashtagsDuManque(par('sport|golf|photo-accueil')!, pratiqueDe('podologue')), ['golf', 'accueil', 'image-generee', 'manque']);
});

test('gamme des prompts : la mieux notée ; sujet calme jamais vitaminée ni rouge', () => {
  assert.equal(gammePourManque('sport', { 'gamme:cobalt': { m: 5, n: 2 }, 'gamme:canard': { m: 4, n: 1 } }).id, 'cobalt');
  assert.notEqual(gammePourManque('diabete', { 'gamme:corail': { m: 5, n: 3 }, 'gamme:mangue': { m: 5, n: 3 } }).id, 'corail');
  assert.equal(gammePourManque('diabete', { 'gamme:corail': { m: 5, n: 3 } }).famille === 'vitaminee', false);
});

const pr = (m: Manque, extra = {}) => promptsDuManque(m, { profession: 'podologue', references: ['https://x.test/ref.webp'], ...extra });

test('photo : ChatGPT et Gemini, 4:5 et 16:9, en anglais, contraintes toujours présentes, rappel FR', () => {
  const l = pr(par('sport|golf|photo-accueil')!);
  assert.deepEqual(l.map((x) => `${x.outil}:${x.ratio}`), ['chatgpt:4:5', 'chatgpt:16:9', 'gemini:4:5', 'gemini:16:9']);
  for (const x of l) {
    for (const c of CONTRAINTES_NEGATIVES) assert.ok(x.texte.includes(c.en), c.id);
    assert.ok(x.texte.includes(x.ratio!));
    assert.ok(/golf shoes on a short-cut green fairway/i.test(x.texte));
    assert.ok(!/runner|trail/i.test(x.texte), 'jamais la scène de course pour le golf');
    assert.ok(x.texte.includes('toned calves'));
    assert.ok(x.rappelFr.includes('À éviter'));
    assert.ok(x.rappelFr.includes('https://x.test/ref.webp'));
    assert.deepEqual(x.controle, []);
  }
});

test('diabète : jamais de rouge ; enfant : jamais identifiable', () => {
  for (const x of pr(par('diabete|theme|photo-accueil')!)) { assert.ok(x.texte.includes('no red')); assert.ok(!/coral|\(#b0393a\)/i.test(x.texte)); }
  for (const x of pr(par('enfant|theme|photo-accueil')!)) assert.ok(x.texte.includes('no identifiable child'));
});

test('illustration : Claude d’abord (SVG, grammaire et géométries validées, à valider), puis raster en aplats', () => {
  const l = pr(par('sport|golf|illustration')!, { modeles: ['dessin:un-golf:pedagogique'] });
  assert.equal(l[0].outil, 'claude');
  assert.ok(l[0].texte.includes('GEO_PIED'));
  assert.ok(l[0].texte.includes('dessin:un-golf:pedagogique'));
  assert.ok(l[0].texte.includes('à valider'));
  assert.ok(/jamais de squelette/.test(l[0].texte));
  const raster = l.find((x) => x.outil === 'chatgpt')!;
  assert.ok(raster.texte.includes('flat minimalist illustration'));
  assert.ok(!raster.texte.includes('documentary-style photograph'));
});

test('animation et éléments : demande à Claude seulement ; diabète calme rappelé', () => {
  const a = pr(par('sport|golf|animation')!);
  assert.deepEqual(a.map((x) => x.outil), ['claude']);
  assert.ok(a[0].texte.includes('stroke-dashoffset'));
  const ill = pr(par('diabete|theme|illustration')!);
  assert.ok(ill[0].texte.includes('jamais de rouge'));
});

test('conditions des outils : rappel court pour chaque outil', () => {
  for (const o of ['chatgpt', 'gemini', 'claude'] as const) { assert.ok(CONDITIONS_OUTILS[o].texte.length < 260); assert.match(CONDITIONS_OUTILS[o].url, /^https:\/\//); }
});

test('scènes des activités : une par activité de la pratique, aucune demande interdite', () => {
  for (const a of pratiqueDe('podologue').activites) {
    const sc = SCENES_ACTIVITES[a.id];
    assert.ok(sc, a.id);
    assert.deepEqual(motifsRefus(`${sc.en} ${sc.fr}`), [], a.id);
  }
});
