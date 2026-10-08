import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTRAINTES_NEGATIVES, construirePrompt, controlerPrompt, FORMATS_IMAGES, formatsEmplacement, motifsRefus, nomCouleur, partiePositive, SCENES_SOINS,
  SCENES_SUJETS, trousImages, variantesPrompt, type PromptConstruit,
} from './prompts-images';
import { GAMMES, gamme } from './gammes';
import { REQUETES_SOINS } from './suggestions-kits';

const ok = (r: ReturnType<typeof construirePrompt>): PromptConstruit => { assert.ok(r.ok, r.ok ? '' : r.refus.join(' ')); return r as PromptConstruit; };

test('contraintes négatives toujours présentes : tous sujets, soins, formats, langues, styles, variantes', () => {
  const emplacements = ['accueil', 'page-sujet', 'cabinet', 'ecranzen', ...Object.keys(SCENES_SOINS).map((s) => `soin:${s}`)];
  let n = 0;
  for (const sujet of Object.keys(SCENES_SUJETS)) {
    for (const emplacement of emplacements) {
      for (const format of formatsEmplacement(emplacement)) {
        for (const langue of ['fr', 'en'] as const) {
          for (const style of ['phrases', 'midjourney'] as const) {
            for (const r of variantesPrompt({ sujet, emplacement, format, gamme: 'canard', langue, style })) {
              const p = ok(r);
              n++;
              for (const c of CONTRAINTES_NEGATIVES) {
                for (const attendu of style === 'midjourney' ? c.mj.split(', ') : [c[langue]]) assert.ok(p.texte.includes(attendu), `${sujet} ${emplacement} ${format} ${langue} ${style} : ${c.id}`);
              }
              assert.ok(p.texte.includes(style === 'midjourney' ? `--ar ${p.format.ratio}` : p.format.ratio));
              assert.deepEqual(controlerPrompt(p.texte, { style, langue, scene: '' }), []);
            }
          }
        }
      }
    }
  }
  assert.ok(n > 1000);
});

test('chaque soin du catalogue (REQUETES_SOINS) et chaque format ont une scène et un cadrage', () => {
  for (const slug of Object.keys(REQUETES_SOINS)) assert.ok(SCENES_SOINS[slug], slug);
  assert.deepEqual(FORMATS_IMAGES.map((f) => f.ratio), ['16:9', '4:5', '4:3', '3:2', '3:2', '9:16']);
  for (const s of [...Object.values(SCENES_SUJETS), ...Object.values(SCENES_SOINS)]) {
    assert.deepEqual(motifsRefus(s.fr), [], s.fr);
    assert.deepEqual(motifsRefus(s.en), [], s.en);
  }
});

test('couleurs de la gamme injectées (hexadécimal et nom), en français et en anglais', () => {
  const g = gamme('cobalt-abricot')!;
  const fr = ok(construirePrompt({ sujet: 'sport', emplacement: 'accueil', format: 'premier-ecran', gamme: g.id, langue: 'fr', style: 'phrases' }));
  for (const h of [g.accent, g.aplat!, g.vif!, g.fond]) assert.ok(fr.texte.includes(h), h);
  assert.match(fr.texte, /Palette : touches discrètes de bleu/);
  const en = ok(construirePrompt({ sujet: 'sport', emplacement: 'accueil', format: 'premier-ecran', gamme: 'sauge', langue: 'en', style: 'midjourney' }));
  assert.ok(en.texte.includes(gamme('sauge')!.accent) && en.texte.includes(gamme('sauge')!.fondDoux));
  assert.match(en.texte, /--ar 16:9 --style raw --no /);
  // Gamme inconnue : repli sur Canard
  assert.ok(ok(construirePrompt({ sujet: 'enfant', emplacement: 'accueil', format: 'premier-ecran', gamme: 'inconnue', langue: 'fr', style: 'phrases' })).texte.includes('#1f6b64'));
  // Diabète : pas de rouge (R6.2), même avec une gamme corail
  const d = ok(construirePrompt({ sujet: 'diabete', emplacement: 'accueil', format: 'premier-ecran', gamme: 'corail', langue: 'fr', style: 'phrases' }));
  assert.ok(!d.texte.includes(gamme('corail')!.accent) && d.texte.includes('aucune teinte rouge'));
  for (const g2 of GAMMES) assert.ok(nomCouleur(g2.accent, 'fr').length > 2 && nomCouleur(g2.accent, 'en').length > 2);
  assert.equal(nomCouleur('#ffffff', 'en'), 'white');
  assert.equal(nomCouleur('#1f4fbf', 'fr'), 'bleu');
});

test('refus déontologiques : aucun prompt rendu', () => {
  const base = { sujet: 'ongles', emplacement: 'soin:ongle-incarne', format: 'carte-soin', gamme: 'canard', langue: 'fr' as const, style: 'phrases' as const };
  const cas: [string, RegExp][] = [
    ['photo avant après du traitement', /avant \/ après/],
    ['before/after result', /avant \/ après/],
    ['résultat garanti, ongle guéri', /résultat/],
    ['notre patient Jean, vrai patient', /vrai patient/],
    ['portrait du praticien Dr Martin', /praticien/],
    ['chaussures Nike et pince de marque', /marque/],
    ['séance de réflexologie plantaire', /réflexologie/],
    ['plaie qui saigne', /sang/],
    ['visage souriant face caméra', /visage/],
    ['avec le texte « Cabinet Martin »', /texte/],
  ];
  for (const [precision, motif] of cas) {
    const r = construirePrompt({ ...base, precision });
    assert.equal(r.ok, false, precision);
    if (!r.ok) assert.ok(r.refus.some((m) => motif.test(m)), `${precision} → ${r.refus.join(' | ')}`);
  }
  // Sujet exclu (posturologie)
  const p = construirePrompt({ ...base, sujet: 'posture', emplacement: 'accueil', format: 'premier-ecran' });
  assert.equal(p.ok, false);
  // Précision acceptable
  assert.ok(construirePrompt({ ...base, precision: 'serviette vert sauge, pied gauche' }).ok);
  // Format inconnu, précision trop longue
  assert.equal(construirePrompt({ ...base, format: 'banniere' }).ok, false);
  assert.equal(construirePrompt({ ...base, precision: 'x'.repeat(201) }).ok, false);
});

test('controlerPrompt signale une contrainte retirée et ignore la section « à éviter »', () => {
  const p = ok(construirePrompt({ sujet: 'sport', emplacement: 'accueil', format: 'premier-ecran', gamme: 'canard', langue: 'en', style: 'phrases' }));
  const retire = p.texte.replace(CONTRAINTES_NEGATIVES[4].en, '');
  assert.ok(controlerPrompt(retire, { style: 'phrases', langue: 'en', scene: '' }).some((m) => m.includes('anatomie')));
  assert.ok(!partiePositive(p.texte).includes('blood'));
  assert.ok(partiePositive(p.texte).includes('runner'));
});

test('trous réels priorisés : premier écran d’abord, cabinet jamais, manques photo rattachés', () => {
  const t = trousImages({
    kits: [
      { sujet: 'senior', aFaire: [
        { emplacement: 'page-sujet', libelle: '', raison: 'vide', photo: null, note: null },
        { emplacement: 'accueil', libelle: '', raison: 'vide', photo: null, note: null },
        { emplacement: 'soin:podologie-du-senior', libelle: '', raison: 'faible', photo: 'x', note: 3 },
        { emplacement: 'cabinet', libelle: '', raison: 'vide', photo: null, note: null },
      ], vivier: { photos: 2, notees4: 0 } },
      { sujet: 'enfant', aFaire: [], vivier: { photos: 9, notees4: 5 } },
    ],
    manques: [
      { id: 'M2', titre: 'Photos utilisables par sujet', lignes: ['aucune pour le diabète ni pour les seniors'], priorite: 'haute' },
      { id: 'M9', titre: 'Héros', lignes: ['dessin seulement'], priorite: 'haute' },
    ],
  });
  assert.equal(t[0].id, 'senior|accueil');
  assert.equal(t[0].priorite, 1);
  assert.ok(t[0].details.some((d) => d.startsWith('M2')));
  assert.ok(t.some((x) => x.id === 'diabete|accueil' && x.raison === 'manque'));
  assert.ok(!t.some((x) => x.emplacement === 'cabinet'));
  assert.ok(!t.some((x) => x.sujet === 'enfant'));
  const page = t.find((x) => x.id === 'senior|page-sujet')!;
  assert.ok(page.details.some((d) => d.includes('peu couvert')));
  assert.deepEqual(t.find((x) => x.id === 'senior|accueil')!.formats, ['premier-ecran', 'premier-ecran-mobile']);
  assert.deepEqual(t.find((x) => x.emplacement === 'soin:podologie-du-senior')!.hashtags, ['podologie-du-senior', 'image-generee']);
});
