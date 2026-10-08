// Personnalisations du praticien : couche appliquée en dernier, qui survit à une mise à jour de la recette ; AA garanti ; taille
// globale sans débordement à 360 px ; blocs réglementaires non supprimables ; images « Démo » jamais publiées.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerPersonnalisations, ajusterCouleurPrincipale, ajusterCouleurSecondaire, avertissementsTexte, blocsAStocker, blocsDuModele, blocsEffectifs,
  contenuDesBlocs, controlerPersonnalisations, cssTaillesTexte, facteurTailleTexte, lirePersonnalisations, motsTropLongs, normaliserReglagesPerso,
  nouvelleVersionPerso, pagesPersonnalisees, remarqueCouleur, policesProposees, revenirAuModele, variablesSecondaire, versionPerso, type Bloc,
} from './personnalisations-site';
import { appliquerRecette, compositionInitiale, tirerDimension } from './recettes';
import { draftVide, normaliserDraft, type SiteDraft } from './draft';
import { contraste } from './couleurs';
import { NEUTRES } from './charte';
import { modeleIntegre } from './modeles';

const PHOTO = 'https://abc.supabase.co/storage/v1/object/public/photos/site-1/perso-accueil-1.webp';
const DEMO = 'https://abc.supabase.co/storage/v1/object/public/photos/banque/ia/demo-podologue/cabinet-1.webp';

const CORPS = `## Pour qui ?\n\nLes personnes qui ont mal sous le pied.\n\n## Déroulement\n\n1. **Échange** sur votre gêne.\n2. **Examen** des pieds.\n\n> Apportez vos chaussures habituelles.\n\n## Prise en charge\n\nLes semelles ont une base de remboursement de l’Assurance Maladie sur prescription médicale.`;
const FAQ = [{ q: 'Combien de temps dure la séance ?', r: 'Environ quarante-cinq minutes.' }, { q: 'Les semelles sont-elles remboursées ?', r: 'Partiellement, sur prescription médicale.' }];

const site = (): SiteDraft => {
  const d = draftVide();
  d.priorites = { principaux: ['sport'], secondaires: [] };
  return d;
};

test('couche appliquée en dernier : copie du brouillon, réglages de la recette remplacés seulement là où le praticien a choisi', () => {
  const d = site();
  d.theme.police = 'grotesque';
  d.theme.variantes = { faq: 'liste' } as never;
  const avant = JSON.stringify(d);
  const x = appliquerPersonnalisations(d, { reglages: { police: 'luxe', taille: 'grande', couleurs: { gamme: 'prune', secondaire: '#3fd0a0' } } });
  assert.equal(x.theme.police, 'luxe');
  assert.equal(x.theme.taille, 'grande');
  assert.equal(x.theme.gamme, 'prune');
  assert.ok(x.theme.couleurSecondaire);
  assert.deepEqual(x.theme.variantes, { faq: 'liste' }, 'le reste de la recette est gardé');
  assert.equal(JSON.stringify(d), avant, 'le brouillon enregistré n’est jamais modifié');
});

test('la couche survit à une mise à jour de la recette (réapplication) et « Revenir au modèle » rend la main à la recette', () => {
  const c = { sujets: ['sport'], principaux: 1, modele: modeleIntegre };
  const x1 = compositionInitiale(c, 1);
  const r1 = appliquerRecette(site(), x1)!;
  const perso = nouvelleVersionPerso(lirePersonnalisations({}), { police: 'humaniste', couleurs: { principale: '#7b4fa0' } }, 'praticien', '2026-10-08T10:00:00Z');
  const stocke = normaliserDraft({ ...r1.draft, personnalisations: perso });
  // Paul améliore la recette : nouvelle police et nouvelle couleur tirées, réappliquées au brouillon
  let x2 = tirerDimension(x1, 'polices', c, 7);
  for (let g = 8; x2.police === 'humaniste' && g < 40; g++) x2 = tirerDimension(x1, 'polices', c, g);
  const r2 = appliquerRecette(stocke, x2)!;
  assert.deepEqual(lirePersonnalisations(r2.draft).reglages, perso.reglages, 'personnalisations conservées par la recette');
  const final = appliquerPersonnalisations(r2.draft);
  assert.equal(final.theme.police, 'humaniste');
  assert.equal(final.theme.gamme, '');
  assert.equal(final.theme.couleur, '#7b4fa0');
  // Revenir au modèle (police) : la police de la recette mise à jour revient
  const sans = appliquerPersonnalisations(r2.draft, { reglages: revenirAuModele(perso.reglages, 'police') });
  assert.equal(sans.theme.police, x2.police);
  assert.equal(sans.theme.couleur, '#7b4fa0', 'les autres choix restent');
});

test('historique versionné : révisions croissantes, restauration = nouvelle version, historique borné', () => {
  let p = lirePersonnalisations(null);
  for (let i = 0; i < 35; i++) p = nouvelleVersionPerso(p, { taille: i % 2 ? 'grande' : 'petite' }, 'praticien', `2026-10-08T10:${String(i).padStart(2, '0')}:00Z`);
  assert.equal(p.revision, 35);
  assert.equal(p.historique.length, 30);
  const v = versionPerso(p, 10)!;
  const q = nouvelleVersionPerso(p, v.reglages, 'admin', '2026-10-08T12:00:00Z', 'Restauration de la version 10');
  assert.equal(q.revision, 36);
  assert.equal(q.reglages.taille, 'grande');
  assert.equal(lirePersonnalisations({ personnalisations: q }).historique.at(-1)?.note, 'Restauration de la version 10');
});

test('AA garanti : couleur principale (texte blanc et liens ≥ 4,5:1), secondaire visible (≥ 3:1), fonds pâles lisibles', () => {
  const couleurs = ['#ffff00', '#ffe1ad', '#3fd0a0', '#ff5d73', '#00ff00', '#aaaaaa', '#1f6b64', '#000000', '#f2df3a', '#9fd3ff', '#ff0000', '#ffffff'];
  for (const c of couleurs) {
    const p = ajusterCouleurPrincipale(c);
    assert.ok(contraste(NEUTRES.blanc, p.couleur) >= 4.5, `${c} → ${p.couleur}`);
    assert.equal(p.ajustee, p.couleur !== c, c);
    if (p.ajustee) assert.match(p.message!, /lisible/);
    const s = ajusterCouleurSecondaire(c);
    assert.ok(contraste(s.couleur, NEUTRES.blanc) >= 3, `secondaire ${c} → ${s.couleur}`);
    for (const g of ['', 'mangue', 'canard']) {
      const v = variablesSecondaire({ couleur: p.couleur, gamme: g, couleurSecondaire: s.couleur });
      assert.ok(contraste(NEUTRES.encre, v['--doux']) >= 4.5, `encre sur fond doux ${c}`);
      assert.ok(contraste(v['--duo-texte'], v['--duo']) >= 4.5 || contraste(v['--duo-fonce'], NEUTRES.blanc) >= 3, `duo ${c}`);
    }
  }
  const x = appliquerPersonnalisations(site(), { reglages: { couleurs: { principale: '#ffe1ad' } } });
  assert.ok(contraste(NEUTRES.blanc, x.theme.couleur) >= 4.5, 'couleur trop claire foncée à l’application');
  assert.deepEqual(variablesSecondaire({ couleur: '#1f6b64' }), {}, 'sans couleur secondaire : aucune variable');
});

test('taille globale : toute l’échelle suit (rem), minimum lisible et aucun débordement à 360 px sur téléphone', () => {
  const css = cssTaillesTexte();
  assert.match(css, /html\[data-taille='grande'\]\{font-size:106\.25%\}/);
  assert.match(css, /@media \(max-width:479px\)\{html\[data-taille='petite'\]\{font-size:100%\}/, 'jamais plus petit que le standard sur téléphone');
  assert.match(css, /@media \(max-width:479px\)\{html\[data-taille='tres-grande'\]\{font-size:106\.25%\}/, 'très grand ramené à plus grand sur téléphone');
  assert.equal(facteurTailleTexte('tres-grande', true), 1.0625);
  assert.equal(facteurTailleTexte('inconnue'), 1);
  // Titres réels des soins et des sujets : aucun mot ne déborde à 360 px, même en très grand
  const titres = ['Semelles orthopédiques', 'Podologie du sport', 'Suivi du pied diabétique', 'Orthonyxie', 'Onychoplastie', 'Orthoplastie', 'Posturologie', 'Réflexologie plantaire', 'Pédicurie-podologie à Saint-Rémy-de-Provence'];
  for (const t of ['petite', 'standard', 'grande', 'tres-grande']) assert.deepEqual(motsTropLongs(titres, t), [], t);
  assert.ok(motsTropLongs(['Anticonstitutionnellement'], 'tres-grande').length, 'mot de 25 lettres signalé');
  assert.ok(controlerPersonnalisations({ taille: 'tres-grande' }, { titres: ['Anticonstitutionnellement'] }).some((a) => a.niveau === 'casse-charte'));
});

test('blocs du modèle : découpage du Markdown, verrous réglementaires (section « Prise en charge », questions de remboursement)', () => {
  const m = blocsDuModele(CORPS, FAQ, 'podologue');
  assert.deepEqual(m.map((b) => b.type), ['intertitre', 'paragraphe', 'intertitre', 'liste', 'encadre', 'intertitre', 'paragraphe', 'question', 'question']);
  assert.deepEqual(m.filter((b) => b.verrou).map((b) => b.id), ['m5', 'm6', 'm8']);
  assert.equal(m[3].ordonnee, true);
  // Aller-retour : sans modification, le contenu est identique
  const { corps, faq } = contenuDesBlocs(m);
  assert.equal(corps, CORPS);
  assert.deepEqual(faq, FAQ);
});

test('blocs obligatoires non supprimables ni modifiables, même par une donnée forgée ; ajout, suppression, réordonnancement libres', () => {
  const m = blocsDuModele(CORPS, FAQ, 'podologue');
  const ajout: Bloc = { id: 'p1', type: 'paragraphe', texte: 'Le cabinet reçoit aussi les sportifs le samedi matin.' };
  // Le praticien supprime tout sauf l'intro, ajoute un paragraphe, et tente de modifier un bloc verrouillé
  const stockes = normaliserReglagesPerso({ pages: { 'soin:semelles': [{ id: 'm1', ref: true }, ajout, { id: 'm6', type: 'paragraphe', texte: 'Tout est remboursé à 100 %.' }] } }).pages!['soin:semelles'];
  const eff = blocsEffectifs(m, stockes);
  for (const id of ['m5', 'm6', 'm8']) assert.ok(eff.some((b) => b.id === id), `${id} réinjecté`);
  assert.equal(eff.find((b) => b.id === 'm6')!.texte, m[6].texte, 'texte réglementaire gardé');
  assert.ok(eff.some((b) => b.id === 'p1'));
  assert.equal(eff.some((b) => b.id === 'm2' || b.id === 'm3'), false, 'blocs libres supprimés');
  // Réordonnancement : le paragraphe ajouté avant l'intro
  const eff2 = blocsEffectifs(m, [ajout, { id: 'm1', ref: true }]);
  assert.equal(eff2[0].id, 'p1');
  // Les blocs inchangés restent des références : le texte à jour du catalogue est repris
  const st = blocsAStocker(m, eff);
  assert.ok(st.filter((b) => 'ref' in b).length >= 4);
  const ameliore = blocsDuModele(CORPS.replace('Les personnes qui ont mal sous le pied.', 'Les personnes qui ont mal sous le pied ou au talon.'), FAQ);
  assert.match(contenuDesBlocs(blocsEffectifs(ameliore, st)).corps, /ou au talon/);
});

test('pages personnalisées : corps et FAQ remplacés, titre et résumé (H1, SEO) inchangés ; alerte sans intertitre', () => {
  const cat = [{ slug: 'semelles', titre: 'Semelles orthopédiques à {ville}', resume: 'Résumé', corps: CORPS, faq: FAQ }, { slug: 'autre', titre: 'Autre', resume: 'R', corps: 'Texte.', faq: [] }];
  const reglages = { pages: { 'soin:semelles': [{ id: 'm1', ref: true as const }, { id: 'p1', type: 'question' as const, texte: 'Faut-il une ordonnance ?', reponse: 'Non pour un bilan.' }] } };
  const r = pagesPersonnalisees(cat, reglages, 'podologue');
  assert.equal(r[0].titre, cat[0].titre);
  assert.equal(r[0].resume, 'Résumé');
  assert.match(r[0].corps, /## Prise en charge/, 'section réglementaire toujours là');
  assert.ok(r[0].faq.some((f) => f.q === 'Faut-il une ordonnance ?'));
  assert.ok(r[0].faq.some((f) => /remboursées/.test(f.q)), 'question réglementaire toujours là');
  assert.equal(r[1], cat[1]);
  const alertes = controlerPersonnalisations({ pages: { 'soin:semelles': [{ id: 'm1', ref: true }] } }, { modele: { 'soin:semelles': blocsDuModele(CORPS, FAQ) } });
  assert.ok(alertes.some((a) => /réglementaire/.test(a.message)), 'blocs réglementaires remis : signalés');
});

test('avertissements doux : promesses, « guérir », superlatifs, avis ; reformulation proposée, jamais bloquant', () => {
  const a = avertissementsTexte('Le meilleur cabinet pour guérir vos douleurs, résultat garanti. Avis de nos patients : 5/5 !');
  const raisons = a.map((x) => x.raison).join(' | ');
  assert.match(raisons, /Superlatif/);
  assert.match(raisons, /Promesse de résultat/);
  assert.match(raisons, /Avis ou témoignages/);
  assert.ok(a.every((x) => !x.bloquante));
  assert.ok(a.some((x) => x.reformulation && /prendre en charge/.test(x.reformulation)));
  assert.ok(a.every((x) => x.suggestion));
  // Formulations relevées par le test des personas (2026-10-09)
  for (const phrase of ['Nos semelles soignent définitivement la fasciite plantaire.', 'Le plus réputé de Lyon.', 'Nous soignons tout.']) assert.ok(avertissementsTexte(phrase).length, phrase);
  assert.equal(avertissementsTexte('Le bilan dure environ quarante-cinq minutes.').length, 0);
  assert.ok(remarqueCouleur('#d4008d'));
  assert.equal(remarqueCouleur('#1f6b64'), null);
});

test('images « Démo » : signalées, visibles dans l’aperçu, jamais publiées (ni par la couche, ni depuis le brouillon)', () => {
  const d = site();
  d.photos.cabinet = [DEMO, PHOTO];
  d.praticiens[0].photo = DEMO;
  const reglages = normaliserReglagesPerso({ images: { accueil: { url: DEMO, source: 'kit' }, 'soin:semelles': { url: PHOTO, source: 'televersee', focal: { x: 30, y: 70 } } } });
  const apercu = appliquerPersonnalisations(d, { reglages });
  assert.equal(apercu.photos.accueil, DEMO, 'aperçu : visible');
  const pub = appliquerPersonnalisations(d, { reglages, publication: true });
  assert.equal(pub.photos.accueil, '');
  assert.deepEqual(pub.photos.cabinet, [PHOTO]);
  assert.equal(pub.praticiens[0].photo, '');
  assert.equal(pub.photos.soins?.semelles, PHOTO);
  assert.ok(JSON.stringify(pub).includes('demo-') === false, 'aucune image démo dans le site publié');
  assert.ok(controlerPersonnalisations(reglages).some((a) => a.domaine === 'images' && /Démo/.test(a.message)));
});

test('normalisation : valeurs inconnues ou dangereuses écartées', () => {
  const r = normaliserReglagesPerso({
    police: 'comic-sans', taille: 'geante', couleurs: { principale: 'red', secondaire: '#12345' },
    images: { accueil: { url: 'javascript:alert(1)' }, 'inconnu:1': { url: PHOTO }, panorama: { url: 'https://exemple.com/x.webp' }, 'cabinet:0': { url: '/photos/cabinet-lumineux.webp' } },
    pages: { 'soin:x': [{ id: 'p1', type: 'script', texte: 'x' }, { id: 'p2', type: 'paragraphe', texte: 'a'.repeat(5000) }], 'admin:x': [] },
  });
  assert.equal(r.police, undefined);
  assert.equal(r.taille, undefined);
  assert.equal(r.couleurs, undefined);
  assert.deepEqual(Object.keys(r.images ?? {}), ['cabinet:0']);
  assert.equal(r.pages!['soin:x'].length, 1);
  assert.equal((r.pages!['soin:x'][0] as Bloc).texte.length, 1200);
});

test('polices proposées : celle de la recette d’abord, puis les paires notées 4-5 ★ compatibles', () => {
  const l = policesProposees({ modele: 'grotesque', notes: { luxe: 4.6, pop: 2, humaniste: 4.2, mono: 5 }, compatible: (id) => id !== 'mono' });
  assert.deepEqual(l.map((p) => p.id), ['grotesque', 'luxe', 'humaniste']);
  assert.equal(l[0].modele, true);
  assert.ok(policesProposees({ modele: 'grotesque' }).length > 3, 'sans notes : paires compatibles');
});
