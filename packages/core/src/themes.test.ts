// Tests des thèmes (hiérarchie du site) et de la navigation calculée : node packages/core/scripts/tests.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES, PRINCIPAUX_MAX, MENU_MOBILE_MAX, themeParId, themeSelectionnable, themesProposes, validerPriorites, normaliserPriorites,
  prioritesSelectionnables, deduirePriorites, basculerPrincipal, basculerSecondaire, deplacerPrincipal, specialitesDesPriorites,
  universDesPriorites, soinsDesPriorites, soinsEnAvantDesPriorites, appliquerPriorites, construireNavigation, cheminTheme, type Priorites,
} from './themes';
import { draftVide, normaliserDraft } from './draft';
import { SPECIALITES } from './packs';
import { PICTOS } from './pictos';
import { SOINS_LIES } from './soins-lies';
import { UNIVERS_PARCOURS, universRecommande, appliquerUniversParcours, soinsSuggeresParcours, ETAPES_PARCOURS, aideEtape } from './parcours';
import { universCatalogue } from './catalogue-univers';
import { verifierTexte } from './lexique';

const CATALOGUE = [...new Set([...Object.keys(SOINS_LIES), 'posturologie', 'laser', 'reflexologie'])];
const soinsDe = (...slugs: string[]) => slugs.map((slug) => ({ slug }));
const P = (principaux: string[], secondaires: string[] = []): Priorites => ({ principaux, secondaires });

test('catalogue des thèmes : identifiants uniques, soins, pictos, spécialités et modèles connus, libellés courts', () => {
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
  for (const t of THEMES) {
    assert.match(t.id, /^[a-z-]{3,30}$/);
    assert.ok(t.court.length <= 10, `${t.id} : libellé court trop long pour le menu mobile`);
    assert.ok(t.soins.length > 0 && t.soins.every((s) => CATALOGUE.includes(s)), `${t.id} : soin inconnu`);
    assert.ok(PICTOS.some((p) => p.id === t.picto), `${t.id} : picto inconnu`);
    assert.ok(SPECIALITES.some((s) => s.value === t.specialite), `${t.id} : spécialité inconnue`);
    assert.ok((UNIVERS_PARCOURS as readonly string[]).includes(t.univers), `${t.id} : modèle hors parcours`);
  }
});

test('textes des thèmes conformes au lexique (aucun superlatif, aucune promesse, titre complet)', () => {
  for (const t of THEMES.filter((x) => x.statut === 'actif')) {
    for (const texte of [t.libelle, t.description, t.intro]) assert.deepEqual(verifierTexte(texte, 'standard'), [], `${t.id} : « ${texte} »`);
  }
});

test('posture : différé, grisé dans le parcours, non sélectionnable sans le drapeau admin, jamais déduit', () => {
  const posture = themeParId('posture')!;
  assert.equal(posture.statut, 'differe');
  assert.equal(themeSelectionnable(posture), false);
  assert.equal(themeSelectionnable(posture, ['posture']), true);
  assert.deepEqual(themesProposes().find((x) => x.theme.id === 'posture'), { theme: posture, disponible: false });
  // Seul thème qui contient un sujet à faible niveau de preuve
  for (const t of THEMES.filter((x) => x.id !== 'posture')) assert.ok(!t.soins.some((s) => /posturo|r[ée]flexo/.test(s)), t.id);
  assert.deepEqual(basculerPrincipal(P([]), 'posture'), P([]));
  assert.deepEqual(basculerSecondaire(P([]), 'posture'), P([]));
  assert.deepEqual(basculerPrincipal(P([]), 'posture', ['posture']), P(['posture']));
  assert.ok(validerPriorites(P(['posture'])).some((e) => /bientôt disponible/.test(e)));
  assert.deepEqual(validerPriorites(P(['posture']), { themesActives: ['posture'] }), []);
  assert.deepEqual(prioritesSelectionnables(P(['posture', 'sport'], ['posture'])), P(['sport']));
  const d = deduirePriorites({ soins: ['posturologie', 'bilan-podologique'], theme: { specialite: 'posture', specialiteSecondaire: '' } });
  assert.ok(!d.principaux.includes('posture') && !d.secondaires.includes('posture'));
  // Jamais en spécialité par défaut : le thème posture n'est le n° 1 d'aucune déduction, aucun modèle ne le propose
  assert.ok(THEMES.filter((t) => t.statut === 'actif').every((t) => t.specialite !== 'posture'));
});

test('validation : listes, identifiants connus, 3 au plus, pas de doublon entre les listes', () => {
  assert.deepEqual(validerPriorites(P(['sport', 'diabete', 'ongles'], ['enfant', 'senior'])), []);
  assert.ok(validerPriorites(null).length);
  assert.ok(validerPriorites({ principaux: 'sport', secondaires: [] }).some((e) => /liste attendue/.test(e)));
  assert.ok(validerPriorites(P(['sport', 'diabete', 'ongles', 'enfant'])).some((e) => /3 thèmes au plus/.test(e)));
  assert.ok(validerPriorites(P(['sport', 'sport'])).some((e) => /deux fois/.test(e)));
  assert.ok(validerPriorites(P(['inconnu'])).some((e) => /inconnu/.test(e)));
  assert.ok(validerPriorites(P(['sport'], ['sport'])).some((e) => /à la fois principal et secondaire/.test(e)));
});

test('normalisation : inconnus et doublons retirés, secondaires sans les principaux, 3 au plus', () => {
  assert.deepEqual(normaliserPriorites({ principaux: ['sport', 'x', 'sport', 'diabete', 'ongles', 'enfant'], secondaires: ['sport', 'senior', 3] }), P(['sport', 'diabete', 'ongles'], ['senior']));
  assert.deepEqual(normaliserPriorites(undefined), P([]));
  assert.deepEqual(normaliserPriorites('n’importe quoi'), P([]));
});

test('brouillon : priorités normalisées, ou déduites de la spécialité et des soins (rétrocompatibilité)', () => {
  // Brouillon enregistré avec des priorités : gardées (normalisées)
  const avec = normaliserDraft({ ...draftVide(), priorites: { principaux: ['ongles', 'ongles'], secondaires: ['ongles', 'enfant'] } });
  assert.deepEqual(avec.priorites, P(['ongles'], ['enfant']));
  // Brouillon antérieur (sans priorités) : spécialité, puis soins pivots cochés, seulement les thèmes avec un soin coché
  const ancien: Record<string, unknown> = { ...draftVide(), soins: ['podologie-du-sport', 'pied-diabetique', 'ongle-incarne', 'podologie-enfant', 'soins-de-pedicurie'] };
  delete ancien.priorites;
  (ancien.theme as Record<string, unknown>).specialite = 'sport';
  const n = normaliserDraft(ancien);
  assert.deepEqual(n.priorites, P(['sport', 'diabete', 'ongles'], ['enfant', 'pedicurie']));
  // Spécialité sans soin coché du thème : pas retenue (pas de page possible)
  assert.deepEqual(deduirePriorites({ soins: ['ongle-incarne'], theme: { specialite: 'sport' } }), P(['ongles']));
  // Version 1 : déduites des soins
  assert.deepEqual(normaliserDraft({ praticien: {}, cabinet: {}, soins: ['pied-diabetique'] }).priorites, P(['diabete']));
  // Brouillon vide : aucune priorité
  assert.deepEqual(normaliserDraft({ version: 2 }).priorites, P([]));
});

test('sélection au doigt : ordre, 3 au plus, un thème ne peut pas être principal et secondaire', () => {
  let p = P([]);
  for (const id of ['sport', 'diabete', 'ongles', 'enfant']) p = basculerPrincipal(p, id);
  assert.deepEqual(p.principaux, ['sport', 'diabete', 'ongles']);
  p = basculerSecondaire(p, 'sport');
  assert.deepEqual(p.secondaires, [], 'un principal n’entre pas dans les secondaires');
  for (const id of ['enfant', 'senior', 'semelles', 'pedicurie']) p = basculerSecondaire(p, id);
  assert.deepEqual(p.secondaires, ['enfant', 'senior', 'semelles']);
  p = basculerPrincipal(p, 'diabete');
  p = basculerPrincipal(p, 'enfant');
  assert.deepEqual(p, P(['sport', 'ongles', 'enfant'], ['senior', 'semelles']), 'promu en principal : quitte les secondaires');
  assert.deepEqual(deplacerPrincipal(p, 'enfant', -1).principaux, ['sport', 'enfant', 'ongles']);
  assert.deepEqual(deplacerPrincipal(p, 'sport', -1), p, 'au bord : inchangé');
  assert.deepEqual(deplacerPrincipal(p, 'enfant', 1), p, 'au bord : inchangé');
  assert.ok(p.principaux.length <= PRINCIPAUX_MAX);
});

test('dérivations : spécialités des thèmes 1 et 2, modèle du thème 1, soins suggérés ordonnés', () => {
  assert.deepEqual(specialitesDesPriorites(P(['sport', 'diabete'])), { specialite: 'sport', specialiteSecondaire: 'diabete' });
  assert.deepEqual(specialitesDesPriorites(P(['ongles', 'pedicurie'])), { specialite: 'soins', specialiteSecondaire: '' }, 'même spécialité : pas de secondaire');
  assert.equal(specialitesDesPriorites(P([], ['enfant'])), null);
  assert.equal(universDesPriorites(P(['diabete'])), 'simple-proche');
  assert.equal(universDesPriorites(P([])), undefined);
  assert.deepEqual(soinsDesPriorites(P(['sport'], ['enfant'])), ['podologie-du-sport', 'semelles-orthopediques', 'douleur-talon', 'k-taping', 'podologie-enfant', 'verrues-plantaires']);
  assert.deepEqual(soinsDesPriorites(P(['sport']), ['semelles-orthopediques', 'k-taping']), ['semelles-orthopediques', 'k-taping']);
  assert.deepEqual(soinsEnAvantDesPriorites(P(['sport', 'diabete', 'ongles']), ['ongle-incarne', 'pied-diabetique', 'podologie-du-sport', 'k-taping']), ['podologie-du-sport', 'pied-diabetique', 'ongle-incarne']);
  const d = { ...draftVide(), theme: { ...draftVide().theme, jeuPhotos: 'abc' } };
  const x = appliquerPriorites(d, P(['diabete', 'sport'], ['posture']));
  assert.deepEqual(x.priorites, P(['diabete', 'sport']), 'différé retiré');
  assert.equal(x.theme.specialite, 'diabete');
  assert.equal(x.theme.specialiteSecondaire, 'sport');
  assert.equal(x.theme.jeuPhotos, '', 'nouvelle spécialité : nouveau jeu de photos');
  assert.deepEqual(x.soins, d.soins, 'soins cochés inchangés');
});

test('parcours : le thème n° 1 choisit le modèle recommandé et prime sur le préréglage du modèle', () => {
  const d = { ...draftVide(), priorites: P(['diabete', 'enfant']) };
  assert.equal(universRecommande(d)?.id, 'simple-proche');
  const r = appliquerUniversParcours(d, universCatalogue('clair-pratique')!, { soinsConnus: CATALOGUE });
  assert.equal(r.draft.theme.univers, 'clair-pratique');
  assert.equal(r.draft.theme.specialite, 'diabete');
  assert.equal(r.draft.theme.specialiteSecondaire, 'enfant');
  assert.deepEqual(r.draft.theme.soinsEnAvant?.slice(0, 2), ['pied-diabetique', 'podologie-enfant']);
  assert.deepEqual(soinsSuggeresParcours(d, universCatalogue('clair-pratique'), CATALOGUE).slice(0, 2), ['pied-diabetique', 'cors-durillons']);
  // Sans sujet : préréglage du modèle inchangé
  const sans = appliquerUniversParcours(draftVide(), universCatalogue('clair-pratique')!);
  assert.equal(sans.draft.theme.specialite, 'generale');
  assert.equal(ETAPES_PARCOURS[0].titre, 'Vos sujets');
  assert.equal(aideEtape(1).length, 2);
});

// ---- Navigation calculée ----

const SITE = soinsDe('bilan-podologique', 'semelles-orthopediques', 'soins-de-pedicurie', 'pied-diabetique', 'podologie-du-sport', 'podologie-enfant', 'cors-durillons', 'ongles-epais');
/** Aucun lien vers une page qui n'existe pas : pages fixes, soins cochés, pages de thème construites */
const pagesExistantes = (nav: ReturnType<typeof construireNavigation>, actualites = false) =>
  new Set(['/', '/soins', '/le-cabinet', '/acces', ...(actualites ? ['/actualites'] : []), ...SITE.map((s) => `/soins/${s.slug}`), ...nav.pages]);
const verifierLiens = (nav: ReturnType<typeof construireNavigation>, actualites = false) => {
  const pages = pagesExistantes(nav, actualites);
  for (const l of [...nav.menu, ...nav.menuMobile, ...nav.pied, ...nav.principaux, ...nav.secondaires, ...nav.groupesSoins.filter((g) => g.href)]) {
    assert.ok(pages.has(l.href!), `lien vers une page inexistante : ${l.href}`);
  }
  for (const g of nav.groupesSoins) for (const s of g.soins) assert.ok(pages.has(`/soins/${s}`), `soin absent : ${s}`);
  // Chaque soin du site exactement une fois sur la page « Soins »
  assert.deepEqual(nav.groupesSoins.flatMap((g) => g.soins).sort(), SITE.map((s) => s.slug).sort());
  assert.ok(nav.menuMobile.length <= MENU_MOBILE_MAX, 'téléphone : 3 liens au plus (+ logo + RDV = 5)');
  assert.ok(nav.menu.length <= 6);
};

test('navigation sans thème : Soins, Le cabinet, Infos pratiques (téléphone comme ordinateur)', () => {
  const nav = construireNavigation({}, SITE, { actualites: true });
  assert.deepEqual(nav.menu.map((l) => l.libelle), ['Soins', 'Le cabinet', 'Infos pratiques']);
  assert.deepEqual(nav.menuMobile.map((l) => l.libelle), ['Soins', 'Le cabinet', 'Infos pratiques']);
  assert.deepEqual(nav.pied.map((l) => l.href), ['/', '/soins', '/le-cabinet', '/acces', '/actualites']);
  assert.deepEqual(nav.groupesSoins.map((g) => g.titre), ['Soins']);
  assert.deepEqual(nav.pages, []);
  verifierLiens(nav, true);
});

test('navigation avec un thème principal', () => {
  const nav = construireNavigation({ priorites: P(['ongles']) }, SITE);
  assert.deepEqual(nav.menu.map((l) => l.libelle), ['Ongles', 'Soins', 'Le cabinet', 'Infos pratiques']);
  assert.deepEqual(nav.menuMobile.map((l) => l.libelle), ['Ongles', 'Soins', 'Infos pratiques']);
  assert.deepEqual(nav.principaux[0].soins, ['ongles-epais'], 'seulement les soins cochés');
  assert.deepEqual(nav.pages, [cheminTheme('ongles')]);
  assert.deepEqual(nav.pied.map((l) => l.href), ['/', '/themes/ongles', '/soins', '/le-cabinet', '/acces'], 'sans articles : pas d’actualités');
  verifierLiens(nav);
});

test('navigation démo : 3 principaux + secondaires, repli sur téléphone, groupes de la page Soins', () => {
  const nav = construireNavigation({ priorites: P(['sport', 'diabete', 'ongles'], ['enfant', 'senior']) }, SITE, { actualites: true });
  assert.deepEqual(nav.menu.map((l) => l.libelle), ['Sport', 'Diabète', 'Ongles', 'Soins', 'Le cabinet', 'Infos pratiques']);
  // Téléphone : thème n° 1, Soins (thèmes 2-3 en tête), Infos pratiques ; « Le cabinet » au pied de page
  assert.deepEqual(nav.menuMobile.map((l) => l.libelle), ['Sport', 'Soins', 'Infos pratiques']);
  assert.ok(nav.pied.some((l) => l.cle === 'cabinet'));
  assert.deepEqual(nav.secondaires.map((t) => t.theme.id), ['enfant', 'senior']);
  assert.deepEqual(nav.pages, ['/themes/sport', '/themes/diabete', '/themes/ongles', '/themes/enfant', '/themes/senior']);
  assert.deepEqual(nav.groupesSoins.map((g) => [g.titre, g.soins]), [
    ['Sport et course à pied', ['podologie-du-sport', 'semelles-orthopediques']],
    ['Pied diabétique', ['pied-diabetique', 'cors-durillons', 'ongles-epais']],
    ['Pieds de l’enfant', ['podologie-enfant']],
    ['Autres soins', ['bilan-podologique', 'soins-de-pedicurie']],
  ], 'Ongles et Seniors : soins déjà montrés plus haut, groupe vide non affiché');
  verifierLiens(nav, true);
});

test('navigation : 3 principaux et 3 secondaires, thème sans soin coché ignoré, posture différée ignorée', () => {
  const nav = construireNavigation({ priorites: P(['k', 'sport', 'semelles', 'posture'] as string[], ['enfant', 'senior', 'pedicurie']) }, SITE);
  assert.deepEqual(nav.principaux.map((t) => t.theme.id), ['sport', 'semelles'], 'inconnu, 4e et différé retirés');
  assert.deepEqual(nav.secondaires.map((t) => t.theme.id), ['enfant', 'senior', 'pedicurie']);
  const sansSoin = construireNavigation({ priorites: P(['ongles', 'diabete']) }, soinsDe('pied-diabetique'));
  assert.deepEqual(sansSoin.principaux.map((t) => t.theme.id), ['diabete'], 'Ongles sans soin coché : ni page ni menu');
  assert.deepEqual(sansSoin.menu.map((l) => l.href), ['/themes/diabete', '/soins', '/le-cabinet', '/acces']);
  verifierLiens(nav);
  const active = construireNavigation({ priorites: P(['posture']) }, soinsDe('posturologie'), { themesActives: ['posture'] });
  assert.deepEqual(active.pages, ['/themes/posture'], 'posture activée par le drapeau admin');
});

test('libellés des thèmes en mots de patient (relecture du 2026-10-06) : sans jargon, identifiants inchangés', () => {
  assert.deepEqual(THEMES.map((t) => t.id), ['sport', 'diabete', 'ongles', 'enfant', 'senior', 'semelles', 'pedicurie', 'posture'], 'ids stables (brouillons)');
  assert.equal(themeParId('semelles')?.libelle, 'Semelles orthopédiques');
  assert.equal(themeParId('semelles')?.court, 'Semelles');
  assert.equal(themeParId('pedicurie')?.libelle, 'Soins des pieds (pédicurie)');
  assert.equal(themeParId('ongles')?.libelle, 'Ongles incarnés, épais ou abîmés');
  for (const t of THEMES) {
    const textes = `${t.libelle} ${t.description} ${t.intro}`;
    assert.ok(!/\bappuis?\b|biomécani|hyperkérat|chaussage/i.test(textes), `${t.id} : jargon dans « ${textes} »`);
    assert.ok(t.court.length <= 10, `${t.id} : libellé court trop long`);
  }
});
