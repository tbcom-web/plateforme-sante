// Chaîne guidée (chaine-guidage.ts) : une seule prochaine action, dans l'ordre « plus près des clients d'abord », jamais un écran sans
// action ni explication, gestes du validateur jamais prescrits à un contributeur, fil des 6 étapes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliquerActions, attentesHumain, CHAINE, CELLULES_REVISION, comparerProximite, modelesATester, DELAI_FICHE_SANS_VERSION_MS, fairetournerChaine, fichesSansVersion, tournoiDuProfil, type EtatChaine, type FicheModele, type RevueModele, type VersionModele, type VoteModele } from './chaine-modeles';
import { TOURNOI_GRILLES, etatTournoiGrilles, prochainEcran, type GrilleTournoi } from './tournoi-grilles';
import { appliquerRecette, normaliserComposition, type CompositionRecette } from './recettes';
import { draftVide } from './draft';
import { contexteScenario } from './notation-recettes';
import { modeleIntegre } from './modeles';
import type { PoidsAtelier } from './atelier-poids';
import { etapeDuStatut, prochaineActionChaine, type EntreeGuidage } from './chaine-guidage';
import type { ResultatTestModele, TicketModele } from './chaine-modeles-format';

const fiche = (id: string, extra: Partial<FicheModele> = {}): FicheModele => ({
  id, nom: `Design ${id}`, profession: 'podologue', profil: null, statut: 'candidat', versionCourante: 1, versionPubliee: null,
  tags: { profession: 'podologue', profils: [], couleurs: [] }, tagsValides: false, recette: null, origine: 'preselection', cle: `compo:${id}`,
  rang: null, scenario: { principaux: ['sport'], secondaires: [], couleurs: [] }, creeLe: `2026-10-10T00:00:${id.padStart(2, '0').slice(-2)}Z`, ...extra,
});
const version = (modele: string, v = 1, test: ResultatTestModele | null = null): VersionModele => ({ modele, version: v, composition: {}, cle: `c:${modele}`, journal: [{ type: 'creation', texte: 'x' }], auteur: 'u', test, creeLe: '2026-10-10' });
const vert = (modele: string, v = 1): ResultatTestModele => ({ modele, version: v, verdict: 'vert', controles: [], tickets: [], le: '2026-10-10T10:00:00Z' });
const etat = (fiches: FicheModele[], extra: Partial<EtatChaine> = {}): EtatChaine => ({ fiches, versions: fiches.map((f) => version(f.id)), tickets: [], votes: [], revues: [], grilles: [], ...extra });
const candidats = (n: number) => Array.from({ length: n }, (_, i) => fiche(`c${i}`));
const guide = (e: EtatChaine, extra: Partial<EntreeGuidage> = {}) => prochaineActionChaine({ role: 'validateur', etat: e, ...extra });
const tournoiOuvert = { ouvert: true, arrete: false, grilles: 2, restantes: 6, certitude: 0.72, texte: '' };

test('guidage : seuil du tournoi à 12 candidats', () => {
  assert.equal(CHAINE.ouvertureTournoi, 12);
});

test('guidage : chaîne vide → importer les propositions de Claude, sinon présélection', () => {
  const a = guide(etat([]), { propositionsClaude: 8 });
  assert.equal(a.id, 'importer-claude');
  assert.match(a.titre, /Importer les 8 modèles proposés par Claude/);
  assert.deepEqual(a.bouton, { libelle: 'Importer les 8 modèles de Claude', action: 'importer-claude' });
  assert.equal(a.etape, 1);
  const b = guide(etat(candidats(8)));
  assert.equal(b.id, 'preselection');
  assert.match(b.titre, /Garder encore 4 candidats pour ouvrir le tournoi \(8 \/ 12\)/);
  assert.deepEqual(b.bouton, { libelle: 'Continuer la présélection', href: '/chaine/preselection' });
  assert.equal(guide(etat([])).bouton?.libelle, 'Commencer la présélection');
});

test('guidage : tournoi ouvert → jouer la grille suivante', () => {
  const a = guide(etat(candidats(14)), { tournoi: tournoiOuvert, propositionsClaude: 3 });
  assert.equal(a.id, 'tournoi');
  assert.match(a.titre, /Jouer la grille 3 \/ ~8 du tournoi/);
  assert.deepEqual(a.bouton, { libelle: 'Jouer la grille 3', href: '/chaine/tournoi' });
  assert.deepEqual(a.fil.map((x) => x.etat), ['fait', 'courante', 'a-venir', 'a-venir', 'a-venir', 'a-venir']);
  assert.match(a.restant, /Encore 5 étapes/);
});

test('guidage : plus près des clients d’abord (valider > revalider > retouche > relire > tester > tournoi)', () => {
  const fs = [
    fiche('p', { statut: 'pret-validation', rang: 3 }), fiche('r', { statut: 'revalidation', versionCourante: 2 }), fiche('t', { statut: 'retouche' }),
    fiche('a', { statut: 'avis-humain' }), fiche('k', { statut: 'check-agent' }), ...candidats(14),
  ];
  let e = etat(fs, { versions: [...fs.map((f) => version(f.id, f.versionCourante, f.statut === 'check-agent' ? null : vert(f.id, f.versionCourante)))] });
  const ordre: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = guide(e, { tournoi: tournoiOuvert });
    ordre.push(a.id);
    const vise = { valider: 'p', revalider: 'r', retouche: 't', relire: 'a', tester: 'k' }[a.id as string];
    if (!vise) break;
    e = { ...e, fiches: e.fiches.filter((f) => f.id !== vise) };
  }
  assert.deepEqual(ordre, ['valider', 'revalider', 'retouche', 'relire', 'tester', 'tournoi']);
});

test('guidage : un contributeur ne reçoit jamais un geste du validateur', () => {
  const fs = [fiche('p', { statut: 'pret-validation' }), fiche('t', { statut: 'retouche' }), fiche('k', { statut: 'check-agent' }), ...candidats(14)];
  const e = etat(fs, { versions: fs.map((f) => version(f.id, 1, f.statut === 'pret-validation' ? vert(f.id) : null)) });
  const a = prochaineActionChaine({ role: 'contributeur', etat: e, tournoi: tournoiOuvert });
  assert.equal(a.id, 'tournoi');
  // Sans tournoi ni présélection à faire : attente expliquée, avec un geste utile
  const b = prochaineActionChaine({ role: 'contributeur', etat: etat([fiche('k', { statut: 'check-agent' })]), tournoi: { ...tournoiOuvert, ouvert: false } });
  assert.notEqual(b.id, 'tester');
});

test('guidage : relecture page par page avec le compte des pages vues', () => {
  const revues: RevueModele[] = CELLULES_REVISION.slice(0, 5).map((c) => ({ modele: 'a', version: 1, page: c.page, appareil: c.appareil, auteur: 'u', verdict: 'rien', le: '2026-10-10' }));
  const a = guide(etat([fiche('a', { statut: 'avis-humain' }), ...candidats(14)], { revues }), { tournoi: tournoiOuvert });
  assert.equal(a.id, 'relire');
  assert.match(a.titre, /Relire « Design a » page par page \(5 \/ 16\)/);
  assert.deepEqual(a.bouton, { libelle: 'Relire ce modèle', href: '/chaine/revision/a' });
});

test('guidage : retouche demandée à Claude avec le nombre de tickets', () => {
  const tickets: TicketModele[] = [1, 2].map((n) => ({ numero: n, modele: 't', page: 'accueil', appareil: 'mobile', zone: null, element: null, etiquette: 'couleur', commentaire: '', origine: 'humain', auteur: 'u', statut: 'ouvert', versionOuverture: 1, versionCorrection: null }));
  const a = guide(etat([fiche('t', { statut: 'retouche' })], { tickets }));
  assert.equal(a.id, 'retouche');
  assert.equal(a.qui, 'claude');
  assert.match(a.titre, /2 tickets/);
});

test('guidage : jamais d’écran sans action ni explication (tous les statuts, deux rôles)', () => {
  const statuts = ['candidat', 'finaliste', 'check-agent', 'avis-humain', 'retouche', 'recheck-agent', 'revalidation', 'pret-validation', 'publie', 'ecarte'] as const;
  for (const role of ['validateur', 'contributeur'] as const) {
    for (const s of statuts) {
      for (const n of [0, 1, 13]) {
        const fs = [fiche('x', { statut: s }), ...candidats(n)];
        const a = prochaineActionChaine({ role, etat: etat(fs), tournoi: n >= 12 ? tournoiOuvert : null });
        assert.ok(a.titre.length > 5 && a.pourquoi.length > 20, `${role} ${s} ${n}`);
        assert.ok(a.bouton !== null, `${role} ${s} ${n} : un bouton`);
        assert.equal(a.fil.length, 6);
        assert.equal(a.fil.filter((x) => x.ici).length, 1);
      }
    }
  }
  const m = guide(etat([]), { migrationManquante: true });
  assert.equal(m.id, 'migration');
  assert.match(m.pourquoi, /0050/);
});

test('guidage : fil des étapes et reste jusqu’aux clients', () => {
  const a = guide(etat(candidats(3)));
  assert.equal(a.fil[0].etat, 'courante');
  assert.equal(a.fil[0].detail, '3 / 12 candidats');
  assert.match(a.restant, /Encore 6 étapes avant le premier modèle prêt pour les clients/);
  const b = guide(etat([fiche('a', { statut: 'avis-humain' })]));
  assert.deepEqual(b.fil.map((x) => x.etat), ['fait', 'fait', 'fait', 'courante', 'a-venir', 'a-venir']);
  assert.match(b.restant, /Encore 3 étapes/);
  assert.equal(b.fil[1].detail, 'fait');
  const c = guide(etat([fiche('a', { statut: 'publie' })]));
  assert.ok(c.fil.every((x) => x.etat === 'fait'));
  assert.equal(c.progression, 1);
  assert.match(c.restant, /1 modèle prêt pour les clients/);
  assert.equal(etapeDuStatut('ecarte'), null);
  assert.equal(etapeDuStatut('revalidation'), 5);
});

// ---------------------------------------------------------------------------------------------------------------
// Bug « grille 49 » (2026-10-10) : arrêt au plafond d'écrans, comptage identique pour le guidage, la page et l'automate
// ---------------------------------------------------------------------------------------------------------------

/** Tournoi de 30 candidats joué « à contre-courant » (choix contradictoires : jamais sûr) : `g` grilles puis `d` départages */
function tournoiJoue(g: number, d: number): EtatChaine {
  const cs = candidats(30);
  const ids = cs.map((f) => f.id);
  const grilles: GrilleTournoi[] = [];
  const votes: VoteModele[] = [];
  let e = etat(cs);
  for (let k = 0; k < g; k++) {
    const t = tournoiDuProfil(e, ids);
    const props = Array.from({ length: 6 }, (_, i) => ids[(k * 7 + i * 5) % 30]);
    // Les 2 moins bien classés de la grille gagnent : le classement ne se stabilise jamais
    const rang = (id: string) => t.classement.find((l) => l.id === id)!.rang;
    const ord = props.map((id, i) => [rang(id), i] as const).sort((a, b) => b[0] - a[0]);
    grilles.push({ profil: null, propositions: props, meilleures: [ord[0][1], ord[1][1]], pire: null, votant: 'paul', poids: 2, le: String(k).padStart(4, '0') });
    e = { ...e, grilles: [...grilles] };
  }
  for (let k = 0; k < d; k++) {
    const t = tournoiDuProfil(e, ids);
    votes.push({ profil: null, a: t.classement[9].id, b: t.classement[10].id, resultat: k % 2 ? 'a' : 'b', votant: 'paul', poids: 2, le: `d${k}` });
    e = { ...e, votes: [...votes] };
  }
  return e;
}
const idsDe = (e: EtatChaine) => e.fiches.filter((f) => f.statut === 'candidat' && f.profil === null).map((f) => f.id);

test('grille 49 : 47 écrans → « Jouer la grille 48 / ~48 » au plus ; 48 écrans → tournoi arrêté, plus aucun écran', () => {
  const e47 = tournoiJoue(39, 8);
  const t47 = tournoiDuProfil(e47, idsDe(e47));
  assert.equal(t47.grilles + t47.duels, 47);
  assert.equal(t47.arrete, false);
  const a = guide(e47, { tournoi: t47 });
  assert.equal(a.id, 'tournoi');
  assert.match(a.titre, /^Jouer la grille 48 \/ ~48 du tournoi$/);
  assert.equal(a.bouton && 'libelle' in a.bouton ? a.bouton.libelle : '', 'Jouer la grille 48');
  const e48 = tournoiJoue(40, 8);
  const t48 = tournoiDuProfil(e48, idsDe(e48));
  assert.equal(t48.arrete, true);
  assert.equal(t48.raison === 'budget' || t48.raison === 'sur', true);
  assert.equal(prochainEcran(t48), null, 'aucun écran une fois arrêté');
  // Plafond d'écrans atteint par des départages (39 grilles + 9 duels = 48) : arrêté aussi
  const e48d = tournoiJoue(39, 9);
  const t48d = tournoiDuProfil(e48d, idsDe(e48d));
  assert.equal(t48d.grilles + t48d.duels, TOURNOI_GRILLES.ecransMax);
  assert.equal(t48d.arrete, true);
  assert.match(t48d.texte, /48 écrans|sûr/);
});

test('grille 49 : jamais « Jouer la grille » au-delà du plafond, même avec un état incohérent', () => {
  for (const [grilles, duels] of [[40, 8], [41, 8], [48, 0], [45, 10]]) {
    const a = guide(etat(candidats(30)), { tournoi: { ouvert: true, arrete: false, grilles, duels, restantes: 3, certitude: 0.8, texte: '' } });
    assert.notEqual(a.id, 'tournoi');
    assert.doesNotMatch(a.titre, /Jouer la grille/);
  }
});

test('grille 49 : fin du tournoi → automate (top 10 finalistes, autres écartés), même comptage que la page et le guidage', () => {
  const e = tournoiJoue(40, 8);
  const ids = idsDe(e);
  const t = tournoiDuProfil(e, ids);
  assert.equal(t.arrete, true);
  // Guidage AVANT les passages (automate pas encore passé, ou passage refusé par la base) : explication, lien vers le tableau
  const avant = guide(e, { tournoi: t });
  assert.equal(avant.id, 'attendre');
  assert.equal(avant.etape, 2);
  assert.match(avant.titre, /Tournoi terminé \(48 écrans\)/);
  assert.deepEqual(avant.bouton, { libelle: 'Voir les finalistes', href: '/chaine' });
  // L'automate voit le même tournoi : 10 finalistes (rangs 1-10), 20 écartés, puis 10 au plus entrent dans la boucle
  const { actions, etat: apres } = fairetournerChaine(e);
  const vers = (v: string) => actions.filter((a) => a.kind === 'statut' && a.vers === v).map((a) => a.modele);
  assert.deepEqual(new Set(vers('finaliste')), new Set(t.top));
  assert.equal(vers('ecarte').length, 20);
  assert.ok(vers('check-agent').length <= CHAINE.maxRevision);
  assert.equal(apres.fiches.filter((f) => f.statut === 'candidat').length, 0);
  // Après les passages : jamais « Jouer la grille », la suite est le test automatique (validateur)
  const g = guide(apres, { tournoi: null });
  assert.notEqual(g.id, 'tournoi');
  assert.equal(g.id, 'tester');
  // Passages appliqués en partie (base lente) : l'état reste cohérent, rien n'est rejoué deux fois
  const partiel = appliquerActions(e, actions.slice(0, 7));
  const suite = fairetournerChaine(partiel).actions;
  assert.ok(suite.every((a) => !actions.slice(0, 7).some((x) => x.kind === 'statut' && a.kind === 'statut' && x.modele === a.modele && x.vers === a.vers)));
});

test('grille 49 : un design vide ou incomplet ne lève jamais d’exception au rendu (aperçu indisponible)', () => {
  // Erreur réelle du 2026-10-10 : « Cannot read properties of undefined (reading 'style') » (version absente → design {})
  const d = draftVide();
  d.priorites = { principaux: ['sport'], secondaires: [] };
  for (const brut of [{}, { structure: 'cocon' }, { visuels: null }, null] as unknown[]) {
    assert.doesNotThrow(() => appliquerRecette(d, brut as CompositionRecette));
    assert.equal(appliquerRecette(d, brut as CompositionRecette), null);
  }
  // Rendu pour un profil (Tournoi, présélection) : un design vide reste vide, sans exception
  const ctx = contexteScenario({ principaux: ['sport'], secondaires: [], couleurs: [], soins: [] }, { poids: null, photos: [], modele: modeleIntegre });
  assert.doesNotThrow(() => normaliserComposition({}, ctx));
  // Poids partiels (instantané désérialisé incomplet) : le contexte se construit sans exception
  assert.doesNotThrow(() => contexteScenario({ principaux: ['sport'], secondaires: [], couleurs: [], soins: [] }, { poids: {} as PoidsAtelier, photos: [], modele: modeleIntegre }));
});

test('fiches sans version : candidates sans version courante depuis plus de 10 min seulement', () => {
  const t0 = Date.parse('2026-10-10T12:00:00Z');
  const vieille = fiche('a', { creeLe: '2026-10-10T11:00:00Z' });
  const recente = fiche('b', { creeLe: '2026-10-10T11:55:00Z' });
  const complete = fiche('c', { creeLe: '2026-10-10T10:00:00Z' });
  const ecartee = fiche('d', { creeLe: '2026-10-10T10:00:00Z', statut: 'ecarte' });
  const v2 = fiche('e', { creeLe: '2026-10-10T10:00:00Z', versionCourante: 2 });
  const e: EtatChaine = { ...etat([vieille, recente, complete, ecartee, v2]), versions: [version('c'), version('e', 1)] };
  assert.deepEqual(fichesSansVersion(e, t0).map((f) => f.id), ['a', 'e']);
  assert.deepEqual(fichesSansVersion(e, t0, 0).map((f) => f.id), ['a', 'b', 'e']);
  assert.equal(DELAI_FICHE_SANS_VERSION_MS, 10 * 60_000);
});

test('candidat retiré en cours de tournoi : les grilles où il figurait comptent toujours (comparaisons des autres gardées)', () => {
  const e = tournoiJoue(30, 0);
  const ids = idsDe(e);
  const avant = tournoiDuProfil(e, ids);
  const sans = tournoiDuProfil(e, ids.filter((id) => id !== ids[3]));
  assert.equal(sans.grilles, avant.grilles);
  assert.equal(sans.classement.some((l) => l.id === ids[3]), false);
});

test('tournoi mémorisé par contenu : même résultat que le calcul direct ; une grille, un duel ou un signal de plus le recalcule', () => {
  const e = tournoiJoue(20, 2);
  const ids = idsDe(e);
  const direct = (x: EtatChaine) => etatTournoiGrilles(ids, (x.grilles ?? []).filter((g) => g.propositions.filter((p) => ids.includes(p)).length >= 2), x.votes.filter((v) => ids.includes(v.a) && ids.includes(v.b)), x.signaux ?? {}, { ouverture: CHAINE.ouvertureTournoi });
  const t1 = tournoiDuProfil(e, ids);
  // Objets différents, même contenu (copies servies par la mémoire de la chaîne) : résultat identique au calcul direct
  const copie: EtatChaine = { ...e, grilles: (e.grilles ?? []).map((g) => ({ ...g, propositions: [...g.propositions], meilleures: [...g.meilleures] })), votes: e.votes.map((v) => ({ ...v })) };
  assert.deepEqual(tournoiDuProfil(copie, ids), t1);
  assert.deepEqual(t1, direct(e));
  // Une grille de plus : nouveau calcul
  const plus: EtatChaine = { ...e, grilles: [...(e.grilles ?? []), { profil: null, propositions: ids.slice(0, 6), meilleures: [5, 4], pire: 0, votant: 'paul', poids: 2, le: '9999' }] };
  assert.deepEqual(tournoiDuProfil(plus, ids), direct(plus));
  assert.equal(tournoiDuProfil(plus, ids).grilles, t1.grilles + 1);
  // Un duel de plus, un a priori différent : nouveaux calculs, égaux au calcul direct
  const duel: EtatChaine = { ...e, votes: [...e.votes, { profil: null, a: ids[0], b: ids[1], resultat: 'b', votant: 'paul', poids: 2, le: 'zz' }] };
  assert.deepEqual(tournoiDuProfil(duel, ids), direct(duel));
  const signaux: EtatChaine = { ...e, signaux: { [ids[7]]: { jaime: 5, juge: 4.8, jauge: 0.9 } } };
  assert.deepEqual(tournoiDuProfil(signaux, ids), direct(signaux));
  assert.notDeepEqual(tournoiDuProfil(signaux, ids).classement, t1.classement);
});

// ---------------------------------------------------------------------------------------------------------------
// Proximité de la publication (décision de Paul du 2026-10-10 : « on priorise un modèle quasi fini à un autre modèle en cours »)
// ---------------------------------------------------------------------------------------------------------------

/** Avis « rien à signaler » sur les `n` premières cellules de la version courante d'une fiche */
const avis = (modele: string, n: number, version = 1): RevueModele[] => CELLULES_REVISION.slice(0, n).map(({ page, appareil }) => ({ modele, version, page, appareil, auteur: 'u', verdict: 'rien', le: '2026-10-10' }));

test('proximité : publier > revalider > retouche > retest > relire > tester un finaliste > file > tournoi', () => {
  const fs = [
    fiche('c1'), fiche('fi', { statut: 'finaliste', rang: 1 }), fiche('ck', { statut: 'check-agent', rang: 1 }), fiche('av', { statut: 'avis-humain', rang: 1 }),
    fiche('rc', { statut: 'recheck-agent' }), fiche('rt', { statut: 'retouche' }), fiche('rv', { statut: 'revalidation' }), fiche('pv', { statut: 'pret-validation', rang: 9 }),
  ];
  const e = etat(fs);
  assert.deepEqual([...fs].sort(comparerProximite(e)).map((f) => f.id), ['pv', 'rv', 'rt', 'rc', 'av', 'ck', 'fi', 'c1']);
  // Tests à lancer : version retouchée avant un finaliste
  assert.deepEqual(modelesATester([fiche('ck', { statut: 'check-agent' }), fiche('rc', { statut: 'recheck-agent' })], [version('ck'), version('rc')]).map((m) => m.modele), ['rc', 'ck']);
});

test('proximité : relecture entamée d’abord, puis moins de pages restantes, puis meilleur rang — jamais une 2e relecture en parallèle', () => {
  const fs = [fiche('neuf', { statut: 'avis-humain', rang: 1 }), fiche('peu', { statut: 'avis-humain', rang: 5 }), fiche('bcp', { statut: 'avis-humain', rang: 2 })];
  const e = etat(fs, { revues: [...avis('peu', 3), ...avis('bcp', 12)] });
  // « bcp » : 12 pages vues, il en reste le moins → d'abord ; « peu » ensuite ; le meilleur rang mais pas entamé en dernier
  assert.deepEqual([...fs].sort(comparerProximite(e)).map((f) => f.id), ['bcp', 'peu', 'neuf']);
  const a = guide(e);
  assert.equal(a.id, 'relire');
  assert.match(a.titre, /Design bcp/);
  // Ce qui attend un humain : relectures entamées seulement (jamais « neuf » tant qu'un modèle entamé peut être terminé)
  const l = attentesHumain(e, { id: 'u', role: 'contributeur' }, []).filter((x) => x.statut === 'avis-humain').map((x) => x.modele);
  assert.deepEqual(l, ['bcp', 'peu']);
  // Aucune relecture entamée : la meilleure du tournoi d'abord
  const e2 = etat(fs);
  assert.match(guide(e2).titre, /Design neuf/);
  assert.deepEqual(attentesHumain(e2, { id: 'u', role: 'contributeur' }, []).filter((x) => x.statut === 'avis-humain').map((x) => x.modele), ['neuf', 'bcp', 'peu']);
});

test('proximité : à étape égale, moins de tickets ouverts puis meilleur rang ; validateur : publier avant tout le reste', () => {
  const t = (modele: string, numero: number): TicketModele => ({ numero, modele, page: 'accueil', appareil: 'mobile', zone: null, element: null, etiquette: 'contraste', commentaire: '', origine: 'humain', auteur: 'u', statut: 'ouvert', versionOuverture: 1, versionCorrection: null });
  const fs = [fiche('a', { statut: 'retouche', rang: 1 }), fiche('b', { statut: 'retouche', rang: 4 }), fiche('c', { statut: 'retouche', rang: 2 })];
  const e = etat(fs, { tickets: [t('a', 1), t('a', 2), t('a', 3), t('b', 1), t('c', 1)] });
  assert.deepEqual([...fs].sort(comparerProximite(e)).map((f) => f.id), ['c', 'b', 'a']);
  const avecPret = etat([...fs, fiche('p', { statut: 'pret-validation' }), fiche('rv', { statut: 'revalidation' })], { tickets: e.tickets });
  assert.equal(guide(avecPret).id, 'valider');
  assert.equal(attentesHumain(avecPret, { id: 'u', role: 'validateur' }, [])[0]?.modele, 'p');
  assert.equal(prochaineActionChaine({ role: 'contributeur', etat: avecPret }).id, 'revalider');
});
