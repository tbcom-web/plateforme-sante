// Chaîne de production des modèles (chaine-modeles.ts, chaine-modeles-format.ts) : rôles, statuts et transitions, arrêt du tournoi,
// sélection des finalistes, tickets et versions, testeur, verrous de validation, export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerResultatTest, attentesHumain, avisFaits, CHAINE, CELLULES_REVISION, choixDePreselection, classementTournoi, demandeCorrectionsModele, etatRevision, etatTournoi, exportTicketsModeles, fairetournerChaine,
  filtreLeger, ligneCorrection, lireRetouches, markdownTicketsModeles, modelesATester, nomTeinte, nouvelleVersion, pagesChangees, peut, peutPublier, poidsVote, prochainDuel,
  retouchesAAppliquer, roleEffectif, tagsAutomatiques, transitionPermise, verrousValidation, etapeVisible, pastilleVerification, raisonEcart, suiviTests, testsALancer,
  type EtatChaine, type TestLance, type FicheModele, type RevueModele, type VersionModele, type VoteModele,
} from './chaine-modeles';
import { normaliserResultatTest, normaliserTicket, verdictGlobal, type ResultatTestModele, type TicketModele } from './chaine-modeles-format';
import { validerChoixGrille } from './degustation';

const COMPO = { structure: 'tableau', gamme: 'canard', couleur: '#0f766e', police: 'revue', visuels: { style: 'ligne', herosSujet: 'sport', animation: null }, photos: [], sections: { ordre: 'modele', variantes: { faq: 'a', infos: 'b' } }, effets: 'sobre', traitement: 'naturel' };

const fiche = (id: string, extra: Partial<FicheModele> = {}): FicheModele => ({
  id, nom: `Modèle ${id}`, profession: 'podologue', profil: 'sport', statut: 'candidat', versionCourante: 1, versionPubliee: null,
  tags: { profession: 'podologue', profils: ['sport'], couleurs: ['canard'] }, tagsValides: false, recette: null, origine: 'preselection', cle: `compo:${id}`,
  rang: null, scenario: { principaux: ['sport'], secondaires: [], couleurs: [] }, creeLe: `2026-10-09T00:00:${id.padStart(2, '0').slice(-2)}Z`, ...extra,
});
const version = (modele: string, v: number, extra: Partial<VersionModele> = {}): VersionModele => ({ modele, version: v, composition: COMPO, cle: `compo:${modele}-${v}`, journal: [{ type: 'creation', texte: 'création' }], auteur: 'u1', test: null, creeLe: '2026-10-09', ...extra });
const testVert = (modele: string, v: number): ResultatTestModele => ({ modele, version: v, verdict: 'vert', controles: [{ id: 'contraste', libelle: 'Contraste', verdict: 'vert' }], tickets: [], le: '2026-10-09T10:00:00Z' });
const ticket = (modele: string, numero: number, extra: Partial<TicketModele> = {}): TicketModele => ({
  numero, modele, page: 'acces', appareil: 'mobile', zone: { forme: 'rect', x: 0.1, y: 0.4, l: 0.3, h: 0.1 }, element: null, etiquette: 'couleur', commentaire: 'trop pâle',
  origine: 'humain', auteur: 'u1', statut: 'ouvert', versionOuverture: 1, versionCorrection: null, ...extra,
});
const rienPartout = (modele: string, v: number, auteur = 'u1'): RevueModele[] => CELLULES_REVISION.map((c) => ({ modele, version: v, page: c.page, appareil: c.appareil, auteur, verdict: 'rien', le: '2026-10-09' }));

/** « Vraies » forces : c0 meilleur … cN pire ; votes déterministes (le meilleur gagne 85 % du temps) */
function tournoiSimule(n: number, nbVotes: number, opts: { graine?: number } = {}): { ids: string[]; votes: VoteModele[] } {
  const ids = Array.from({ length: n }, (_, i) => `c${String(i).padStart(2, '0')}`);
  const votes: VoteModele[] = [];
  let s = opts.graine ?? 7;
  const r = () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 2 ** 32; };
  for (let k = 0; k < nbVotes; k++) {
    const p = prochainDuel(ids, votes, { votant: k % 3 === 0 ? 'paul' : `u${k % 4}`, graine: k + 1 });
    assert.ok(p);
    const [a, b] = p!;
    const fa = -ids.indexOf(a), fb = -ids.indexOf(b);
    const pa = 1 / (1 + Math.exp(-(fa - fb) * 0.35));
    votes.push({ profil: 'sport', a, b, resultat: r() < pa ? 'a' : 'b', votant: k % 3 === 0 ? 'paul' : `u${k % 4}`, poids: k % 3 === 0 ? 2 : 1, le: `2026-10-09T${String(Math.floor(k / 60)).padStart(2, '0')}:${String(k % 60).padStart(2, '0')}:00Z` });
  }
  return { ids, votes };
}

test('rôles : le contributeur ne valide ni ne publie jamais ; admin = validateur ; vote du validateur ×2', () => {
  assert.equal(peut('contributeur', 'voter'), true);
  assert.equal(peut('contributeur', 'reviser'), true);
  assert.equal(peut('contributeur', 'publier'), false);
  assert.equal(peut('contributeur', 'valider'), false);
  assert.equal(peut('contributeur', 'gerer-roles'), false);
  assert.equal(peut('validateur', 'publier'), true);
  assert.equal(peut(null, 'voir'), false);
  assert.equal(roleEffectif('admin', null), 'validateur');
  assert.equal(roleEffectif('praticien', 'contributeur'), 'contributeur');
  assert.equal(roleEffectif('praticien', 'n-importe'), null);
  assert.equal(poidsVote('validateur'), CHAINE.poidsValidateur);
  assert.equal(poidsVote('contributeur'), 1);
});

test('transitions : publier = validateur seulement ; l’automate ne publie jamais', () => {
  assert.equal(transitionPermise('pret-validation', 'publie', 'validateur'), true);
  assert.equal(transitionPermise('pret-validation', 'publie', 'contributeur'), false);
  assert.equal(transitionPermise('pret-validation', 'publie', 'auto'), false);
  assert.equal(transitionPermise('candidat', 'publie', 'validateur'), false);
  assert.equal(transitionPermise('publie', 'retouche', 'auto'), true);
});

test('présélection : filtre léger (harmonie, exclus, déjà vu, rendu identique) et points au format de la Dégustation', () => {
  assert.equal(filtreLeger({ cle: 'compo:a', violationsDures: 0, elements: ['police=revue'], exclus: new Set(), dejaVues: new Set() }).garde, true);
  assert.deepEqual(filtreLeger({ cle: 'compo:a', violationsDures: 1, elements: ['photo:x'], exclus: new Set(['photo:x']), dejaVues: new Set(['compo:a']), empreinteRendu: 'e1', empreintesVoisines: ['e1'] }).raisons, ['harmonie', 'element-exclu', 'deja-vue', 'rendu-identique']);
  const props = Array.from({ length: 6 }, (_, i) => ({ cle: `compo:${i}`, ingredients: { element: `famille:f${i}` } }));
  assert.equal(choixDePreselection({ propositions: props, selection: [], profil: 'sport', profession: 'podologue', scenario: { sujets: ['sport'] }, appareil: 'mobile' }), null);
  const c = choixDePreselection({ propositions: props, selection: [4, 1, 2], profil: 'sport', profession: 'podologue', scenario: { sujets: ['sport'] }, appareil: 'mobile' })!;
  assert.deepEqual(c.meilleures, [4, 1]);
  const v = validerChoixGrille(c);
  assert.ok(v.ok, 'le choix passe la validation du journal degustation_choix');
});

test('tournoi : fermé sous le seuil, appariement suisse sans doublon immédiat, arrêt automatique stable, 10 finalistes justes', () => {
  assert.equal(etatTournoi(['a', 'b'], []).ouvert, false);
  const { ids, votes } = tournoiSimule(24, 200);
  const e = etatTournoi(ids, votes);
  assert.equal(e.ouvert, true);
  assert.ok(e.arrete, `arrêté (${e.texte})`);
  assert.equal(e.finalistes.length, CHAINE.finalistes);
  // Les vrais 5 meilleurs sont finalistes ; aucun des 6 pires
  for (const k of ids.slice(0, 5)) assert.ok(e.finalistes.includes(k), `${k} finaliste`);
  for (const k of ids.slice(-6)) assert.ok(!e.finalistes.includes(k), `${k} écarté`);
  // Chaque candidat a joué au moins minDuels duels (appariement suisse : les moins joués d'abord)
  assert.ok(e.minDuels >= CHAINE.minDuels || e.raison === 'budget');
  // Peu de votes : pas d'arrêt
  assert.equal(etatTournoi(ids, votes.slice(0, 40)).arrete, false);
});

test('tournoi : budget atteint = arrêt forcé ; poids du validateur ×2 pèse dans le classement', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `x${i}`);
  const votes: VoteModele[] = Array.from({ length: CHAINE.plafondParCandidat * 20 }, (_, k) => ({ profil: 'p', a: ids[k % 20], b: ids[(k + 1) % 20], resultat: 'egalite', votant: 'u', poids: 1, le: `2026-10-09T00:${String(k % 60).padStart(2, '0')}:00Z` }));
  assert.equal(etatTournoi(ids, votes).raison, 'budget');
  const v = (resultat: 'a' | 'b', poids: number): VoteModele => ({ profil: 'p', a: 'A', b: 'B', resultat, votant: poids === 2 ? 'paul' : 'u', poids, le: '2026-10-09' });
  const cl = classementTournoi(['A', 'B'], [v('a', 2), v('b', 1)]);
  assert.equal(cl[0].id, 'A', 'le vote de Paul (×2) l’emporte sur un vote contraire');
});

test('appariement : un votant ne revoit pas une paire qu’il a déjà votée tant qu’il y en a d’autres', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const votes: VoteModele[] = [{ profil: 'p', a: 'a', b: 'b', resultat: 'a', votant: 'moi', poids: 1, le: '1' }];
  for (let g = 1; g < 20; g++) {
    const p = prochainDuel(ids, votes, { votant: 'moi', graine: g })!;
    assert.notDeepEqual([...p].sort(), ['a', 'b']);
  }
});

test('tickets : numérotation, résultat du testeur (nouveaux dédoublonnés, fermés seuls au vert), normalisation du format', () => {
  const t1 = ticket('m', 1, { origine: 'testeur', auteur: 'testeur', controle: 'contraste', etiquette: 'technique:contraste', page: 'accueil', appareil: 'mobile' });
  const r: ResultatTestModele = {
    modele: 'm', version: 2, verdict: 'orange', le: '2026-10-09',
    controles: [{ id: 'contraste', libelle: 'Contraste', verdict: 'vert' }, { id: 'debordement-mobile', libelle: 'Débordement', verdict: 'orange', page: 'soins', appareil: 'mobile' }],
    tickets: [
      { ...ticket('m', 0, { origine: 'testeur', controle: 'debordement-mobile', etiquette: 'technique:debordement-mobile', page: 'soins' }) },
      { ...ticket('m', 0, { origine: 'testeur', controle: 'debordement-mobile', etiquette: 'technique:debordement-mobile', page: 'soins' }) },
    ],
  };
  const a = appliquerResultatTest([t1, ticket('m', 2)], r);
  assert.equal(a.nouveaux.length, 1, 'doublon retiré');
  assert.equal(a.nouveaux[0].numero, 3);
  assert.equal(a.nouveaux[0].versionOuverture, 2);
  assert.deepEqual(a.fermes, [1], 'contraste repassé au vert : ticket technique fermé sans humain');
  assert.equal(verdictGlobal(r.controles), 'orange');
  assert.equal(normaliserTicket({ page: 'xxx', appareil: 'mobile', etiquette: 'couleur' }), null);
  assert.equal(normaliserTicket({ page: 'acces', appareil: 'mobile', etiquette: 'technique:contraste', origine: 'testeur' })!.gravite, 'majeur');
  const n = normaliserResultatTest({ modele: 'm', version: 1, controles: [{ id: 'x', verdict: 'rouge' }], tickets: [{ page: 'faq', appareil: 'mobile', etiquette: 'texte' }, { page: 'questions', appareil: 'mobile', etiquette: 'texte' }] })!;
  assert.equal(n.verdict, 'rouge');
  assert.equal(n.tickets.length, 1);
  assert.equal(n.tickets[0].origine, 'testeur');
});

test('versions : nouvelle version, journal « corrigé : ticket #12 — zone … page Contact et accès », tickets corrigés', () => {
  const tk = [ticket('m', 12), ticket('m', 13, { statut: 'ferme' })];
  const r = nouvelleVersion({ fiche: { id: 'm', versionCourante: 1 }, composition: COMPO, cle: 'compo:z', tickets: tk, corrections: [{ ticket: 12, texte: 'couleur plus foncée' }, { ticket: 13 }, { ticket: 99 }], auteur: 'claude', type: 'correction' });
  assert.equal(r.version.version, 2);
  assert.equal(r.corriges.length, 1);
  assert.equal(r.corriges[0].statut, 'corrige');
  assert.equal(r.corriges[0].versionCorrection, 2);
  assert.match(r.version.journal[0].texte, /^corrigé : ticket #12 — zone \(10 %, 40 %\) page Contact et accès \(mobile\)/);
  assert.equal(ligneCorrection({ ...tk[0], zone: null, element: 'police=revue' }), 'corrigé : ticket #12 — élément police=revue page Contact et accès (mobile) [couleur]');
  const l = lireRetouches({ retouches: [{ modele: 'm', versionBase: 1, composition: COMPO, corrections: [{ ticket: '12' }, { ticket: -1 }] }, { modele: 3 }] });
  assert.equal(l.length, 1);
  assert.deepEqual(l[0].corrections, [{ ticket: 12, texte: undefined }]);
  assert.equal(retouchesAAppliquer(l, [fiche('m', { statut: 'retouche' })]).length, 1);
  assert.equal(retouchesAAppliquer(l, [fiche('m', { statut: 'retouche', versionCourante: 2 })]).length, 0, 'déjà appliquée');
  assert.equal(retouchesAAppliquer(l, [fiche('m', { statut: 'candidat' })]).length, 0);
});

test('ce qui a changé : dimension globale → toutes les pages ; variante FAQ → page FAQ seulement', () => {
  assert.equal(pagesChangees(COMPO, { ...COMPO, police: 'autre' }).length, 8);
  assert.deepEqual(pagesChangees(COMPO, { ...COMPO, sections: { ordre: 'modele', variantes: { faq: 'z', infos: 'b' } } }), ['questions']);
  assert.deepEqual(pagesChangees(COMPO, { ...COMPO, sections: { ordre: 'modele', variantes: { faq: 'a', infos: 'c' } } }), ['acces']);
  assert.deepEqual(pagesChangees(COMPO, COMPO), []);
});

test('avis humain : 16 cellules ; ticket ou « Rien à signaler » ; revalidation en 1 clic', () => {
  assert.equal(CELLULES_REVISION.length, 16);
  const r0 = etatRevision(1, [], []);
  assert.equal(r0.faites, 0);
  const r1 = etatRevision(1, rienPartout('m', 1).slice(1), [ticket('m', 1, { page: 'accueil', appareil: 'ordinateur' })]);
  assert.equal(r1.terminee, true);
  assert.equal(r1.cellules.find((c) => c.page === 'accueil' && c.appareil === 'ordinateur')!.etat, 'tickets');
  assert.equal(etatRevision(2, [{ modele: 'm', version: 2, page: null, appareil: null, auteur: 'u', verdict: 'revalide', le: '' }], []).revalidee, true);
  // Relance : les avis de la v1 valent pour les pages que la relance n'a pas changées
  const h = etatRevision(2, rienPartout('m', 1), [], { precedente: 1, changees: ['questions'] });
  assert.equal(h.faites, 14);
});

/** Applique un résultat du testeur à la version d'un modèle (tickets techniques créés comme le fait l'admin) */
function resultat(e: EtatChaine, r: ResultatTestModele): EtatChaine {
  const a = appliquerResultatTest(e.tickets.filter((t) => t.modele === r.modele), r);
  return { ...e, versions: e.versions.map((v) => (v.modele === r.modele && v.version === r.version ? { ...v, test: r } : v)), tickets: [...e.tickets, ...a.nouveaux] };
}
/** Nouvelle version (retouche de Claude) appliquée à l'état, comme l'automate de l'admin */
function retouche(e: EtatChaine, m: string, corrections: number[], auteur: 'claude' | 'testeur', composition: Record<string, unknown> = COMPO): EtatChaine {
  const f = e.fiches.find((x) => x.id === m)!;
  const nv = nouvelleVersion({ fiche: f, composition, cle: `compo:${m}-v${f.versionCourante + 1}`, tickets: e.tickets.filter((t) => t.modele === m), corrections: corrections.map((ticket) => ({ ticket })), auteur, type: auteur === 'testeur' ? 'technique' : 'correction' });
  return { ...e, fiches: e.fiches.map((x) => (x.id === m ? { ...x, versionCourante: nv.version.version } : x)), versions: [...e.versions, nv.version], tickets: e.tickets.map((t) => (t.modele === m ? nv.corriges.find((c) => c.numero === t.numero) ?? t : t)) };
}
const statutDe = (e: EtatChaine, id: string) => e.fiches.find((f) => f.id === id)!.statut;

test('chemin complet en 3 étapes : gardé → vérification automatique → corrections techniques → relecture finale → remarques → pages modifiées → catalogue', () => {
  const ids = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'];
  // 1. CHOISIR : 7 designs gardés (candidats, sans profil) ; m a le plus de J'aime
  let e: EtatChaine = { fiches: ids.map((id) => fiche(id, { profil: null })), versions: ids.map((id) => version(id, 1)), tickets: [], votes: [], revues: [], signaux: { g4: { jaime: 3 } } };
  e = fairetournerChaine(e).etat;
  assert.equal(e.fiches.filter((f) => f.statut === 'check-agent').length, CHAINE.maxVerification, '5 en vérification à la fois');
  assert.equal(e.fiches.filter((f) => f.statut === 'candidat').length, 2, 'les autres attendent en file');
  assert.equal(statutDe(e, 'g4'), 'check-agent', 'le plus aimé passe d’abord');
  const m = 'g4';
  // 2. VÉRIFICATION : tests lancés automatiquement, 3 au plus, jamais deux fois
  const t0 = Date.parse('2026-10-11T10:00:00Z');
  const lots = testsALancer(e, [], t0);
  assert.equal(lots.length, CHAINE.testsParalleles);
  assert.ok(lots.every((x) => x.mode === 'check' && x.essai === 1));
  const lances: TestLance[] = lots.map((x) => ({ modele: x.modele, version: x.version, essai: x.essai, le: new Date(t0).toISOString() }));
  assert.deepEqual(testsALancer(e, lances, t0 + 60_000), [], 'pas de redéclenchement : 3 en cours');
  assert.equal(lots[0].modele, m, 'tests lancés dans l’ordre de la file (meilleurs signaux d’abord)');
  // Résultat orange avec un défaut technique → corrections techniques (étape Vérification), une demande « corrections techniques »
  e = resultat(e, { ...testVert(m, 1), verdict: 'orange', controles: [{ id: 'mots-coupes', libelle: 'Mots coupés', verdict: 'orange', page: 'cabinet', appareil: 'mobile' }], tickets: [ticket(m, 0, { origine: 'testeur', controle: 'mots-coupes', etiquette: 'technique:mot-coupe', page: 'cabinet' })] });
  e = fairetournerChaine(e).etat;
  assert.equal(statutDe(e, m), 'retouche');
  assert.equal(etapeVisible(e, e.fiches.find((f) => f.id === m)!), 'verification', 'corrections techniques : encore la vérification pour Paul');
  assert.equal(pastilleVerification(e, e.fiches.find((f) => f.id === m)!).etat, 'corrections');
  assert.match(demandeCorrectionsModele(e.fiches.find((f) => f.id === m)!, e.tickets.filter((t) => t.modele === m)), /^Corrections techniques du modèle/);
  // Une place libérée ? Non : la retouche technique reste en vérification (5 au plus)
  assert.equal(e.fiches.filter((f) => f.statut === 'candidat').length, 2);
  // Claude corrige (auteur testeur), la v2 est revérifiée (re-check lancé seul) puis part en relecture finale
  e = fairetournerChaine(retouche(e, m, [1], 'testeur')).etat;
  assert.equal(statutDe(e, m), 'recheck-agent');
  // Le résultat de la v1 libère sa place : le re-check de la v2 est lancé seul (plus près du catalogue : en premier)
  assert.deepEqual(testsALancer(e, lances, t0 + 120_000).map((x) => [x.modele, x.version, x.mode, x.essai])[0], [m, 2, 'recheck', 1]);
  const plusTard = t0 + CHAINE.dureeTestMs + 60_000;
  e = fairetournerChaine(resultat(e, testVert(m, 2))).etat;
  assert.equal(statutDe(e, m), 'avis-humain');
  assert.equal(e.tickets.find((t) => t.modele === m && t.numero === 1)!.statut, 'ferme', 'défaut technique refermé par le re-check');
  assert.equal(etapeVisible(e, e.fiches.find((f) => f.id === m)!), 'relecture');
  assert.equal(pastilleVerification(e, e.fiches.find((f) => f.id === m)!).etat, 'ok');
  // 3. RELECTURE FINALE : une remarque, le reste OK → remarques chez Claude (relecture finale)
  e = { ...e, tickets: [...e.tickets, ticket(m, 2, { versionOuverture: 2 })], revues: rienPartout(m, 2).filter((x) => !(x.page === 'acces' && x.appareil === 'mobile')) };
  e = fairetournerChaine(e).etat;
  assert.equal(statutDe(e, m), 'retouche');
  assert.equal(etapeVisible(e, e.fiches.find((f) => f.id === m)!), 'relecture', 'remarques de Paul : relecture finale');
  assert.match(demandeCorrectionsModele(e.fiches.find((f) => f.id === m)!, e.tickets.filter((t) => t.modele === m)), /pages modifiées seulement/);
  e = fairetournerChaine(retouche(e, m, [2], 'claude', { ...COMPO, couleur: '#115e59' })).etat;
  assert.equal(statutDe(e, m), 'recheck-agent');
  assert.equal(testsALancer(e, [], plusTard).find((x) => x.modele === m)?.mode, 'recheck');
  e = fairetournerChaine(resultat(e, testVert(m, 3))).etat;
  assert.equal(statutDe(e, m), 'revalidation', 'pages modifiées en avant / après, dans la relecture finale');
  e = { ...e, revues: [...e.revues, { modele: m, version: 3, page: null, appareil: null, auteur: 'paul', verdict: 'revalide', le: '' }], tickets: e.tickets.map((t) => (t.modele === m && t.statut === 'corrige' ? { ...t, statut: 'ferme' as const } : t)) };
  e = fairetournerChaine(e).etat;
  assert.equal(statutDe(e, m), 'pret-validation');
  const avisM = avisFaits(3, e.versions.filter((v) => v.modele === m), e.revues.filter((r) => r.modele === m), e.tickets.filter((t) => t.modele === m));
  assert.deepEqual([avisM.ok, avisM.base], [true, 2], 'relecture complète sur la v2, pages modifiées revues sur la v3');
  // Catalogue : geste de Paul seulement (l'automate ne publie jamais)
  assert.ok(!fairetournerChaine(e).actions.some((a) => a.kind === 'statut' && a.vers === 'publie'));
  e = { ...e, fiches: e.fiches.map((x) => (x.id === m ? { ...x, statut: 'publie' as const, versionPubliee: 3 } : x)) };
  assert.equal(etapeVisible(e, e.fiches.find((f) => f.id === m)!), 'catalogue');
  // Une place s'est libérée : le gardé suivant entre en vérification
  assert.equal(e.fiches.filter((f) => f.statut === 'candidat').length, 1);
  // Publié : une zone signalée rouvre une retouche sans dépublier
  e = fairetournerChaine({ ...e, tickets: [...e.tickets, ticket(m, 3, { versionOuverture: 3, page: 'questions' })] }).etat;
  assert.equal(statutDe(e, m), 'retouche');
  assert.equal(e.fiches.find((x) => x.id === m)!.versionPubliee, 3, 'reste en ligne');
});

test('vérification : rouge persistant après correction → écarté, avec le message ; rouge sans défaut corrigeable → écarté', () => {
  let e: EtatChaine = { fiches: [fiche('r', { statut: 'check-agent', profil: null })], versions: [version('r', 1)], tickets: [], votes: [], revues: [] };
  const rouge = (v: number, avecTicket: boolean): ResultatTestModele => ({ ...testVert('r', v), verdict: 'rouge', controles: [{ id: 'construction', libelle: 'Construction', verdict: 'rouge', page: 'accueil', appareil: 'mobile' }], tickets: avecTicket ? [ticket('r', 0, { origine: 'testeur', controle: 'construction', etiquette: 'technique:construction', page: 'accueil', gravite: 'bloquant' })] : [] });
  e = fairetournerChaine(resultat(e, rouge(1, true))).etat;
  assert.equal(statutDe(e, 'r'), 'retouche', 'premier rouge : une correction est demandée');
  e = fairetournerChaine(retouche(e, 'r', [1], 'testeur')).etat;
  assert.equal(statutDe(e, 'r'), 'recheck-agent');
  const fin = fairetournerChaine(resultat(e, rouge(2, true)));
  assert.equal(statutDe(fin.etat, 'r'), 'ecarte');
  assert.match(fin.actions.find((a) => a.kind === 'statut' && a.vers === 'ecarte')!.raison, /toujours au rouge après correction/);
  assert.equal(raisonEcart(fin.etat, fin.etat.fiches[0]), 'Écarté : vérification toujours au rouge après correction');
  // Rouge sans aucun défaut à corriger (rien à envoyer à Claude) : écarté aussi, jamais bloqué
  const sans = fairetournerChaine(resultat({ fiches: [fiche('s', { statut: 'check-agent', profil: null })], versions: [version('s', 1)], tickets: [], votes: [], revues: [] }, { ...rouge(1, false), modele: 's' }));
  assert.equal(statutDe(sans.etat, 's'), 'ecarte');
  // Une place libérée en vérification profite au gardé suivant
  const avecFile = fairetournerChaine(resultat({ fiches: [fiche('s', { statut: 'check-agent', profil: null }), ...['a', 'b', 'c', 'd'].map((id) => fiche(id, { statut: 'check-agent', profil: null })), fiche('z', { profil: null })], versions: ['s', 'a', 'b', 'c', 'd', 'z'].map((id) => version(id, 1)), tickets: [], votes: [], revues: [] }, { ...rouge(1, false), modele: 's' }));
  assert.equal(statutDe(avecFile.etat, 'z'), 'check-agent');
});

test('tests automatiques : 3 en parallèle, jamais deux fois la même version, bloqué après 2 lancements, passages GitHub comptés', () => {
  const fs = ['a', 'b', 'c', 'd'].map((id) => fiche(id, { statut: 'check-agent', profil: null }));
  const e: EtatChaine = { fiches: [...fs, fiche('t', { statut: 'avis-humain', profil: null })], versions: [...fs.map((f) => version(f.id, 1)), version('t', 1, { test: testVert('t', 1) })], tickets: [], votes: [], revues: [] };
  const t0 = Date.parse('2026-10-11T10:00:00Z');
  const l1 = testsALancer(e, [], t0);
  assert.equal(l1.length, 3, 'limite de parallélisme');
  assert.ok(!l1.some((x) => x.modele === 't'), 'version déjà testée : jamais relancée');
  const lances: TestLance[] = l1.map((x) => ({ modele: x.modele, version: 1, essai: 1, le: new Date(t0).toISOString() }));
  assert.deepEqual(testsALancer(e, lances, t0 + 5 * 60_000), [], 'aucune place : rien de plus');
  // Un passage de plus en cours sur GitHub (lancé à la main) compte aussi
  const reste = fs.find((f) => !l1.some((x) => x.modele === f.id))!.id;
  assert.deepEqual(testsALancer(e, lances.slice(0, 1), t0, [{ modele: lances[1].modele, version: 1 }, { modele: 'autre', version: 1 }]).map((x) => x.modele), [], '1 lancement + 2 passages GitHub = 3');
  // Lancement en échec (workflow pas démarré) : ne compte pas, la version peut être relancée (essai 2)
  const echec: TestLance[] = [{ modele: reste, version: 1, essai: 1, le: new Date(t0).toISOString(), echec: 'GitHub 500' }];
  assert.equal(suiviTests(e, echec, t0 + 1000).find((x) => x.modele === reste)!.etat, 'a-lancer');
  assert.deepEqual(testsALancer({ ...e, fiches: e.fiches.filter((f) => f.id === reste) }, echec, t0 + 1000).map((x) => x.essai), [2]);
  // Deux lancements sans résultat : bloqué (relance à la main depuis la fiche), jamais un troisième automatique
  const deux: TestLance[] = [1, 2].map((essai) => ({ modele: reste, version: 1, essai, le: new Date(t0).toISOString() }));
  const tard = t0 + CHAINE.dureeTestMs + 1;
  assert.ok(!testsALancer(e, deux, tard).some((x) => x.modele === reste));
  assert.equal(suiviTests(e, deux, tard).find((x) => x.modele === reste)!.etat, 'bloque');
  assert.equal(pastilleVerification(e, fs.find((f) => f.id === reste)!, suiviTests(e, deux, tard)).etat, 'bloque');
  assert.equal(pastilleVerification(e, fs.find((f) => f.id === reste)!, suiviTests(e, deux, t0 + 1000)).texte, 'Vérification en cours');
  // Jeux de démonstration du design (profils compatibles) passés au workflow
  assert.ok(l1.every((x) => Array.isArray(x.jeux) && x.jeux.length > 0));
});

test('vérification : 5 designs à la fois au plus (boucle de 10 au plus) ; corrections purement techniques au vert après la relecture : prêt sans humain', () => {
  const fiches = Array.from({ length: 12 }, (_, i) => fiche(`f${i}`, { statut: 'finaliste', rang: i + 1 }));
  const { etat } = fairetournerChaine({ fiches, versions: fiches.map((f) => version(f.id, 1)), tickets: [], votes: [], revues: [] });
  assert.equal(etat.fiches.filter((f) => f.statut === 'check-agent').length, CHAINE.maxVerification);
  assert.deepEqual(etat.fiches.filter((f) => f.statut === 'finaliste').map((f) => f.rang), [6, 7, 8, 9, 10, 11, 12], 'gardés pour vérification d’abord, meilleur rang');
  // Boucle pleine (10 en relecture) : plus personne n'entre en vérification
  const pleins = Array.from({ length: 10 }, (_, i) => fiche(`r${i}`, { statut: 'avis-humain' }));
  const b = fairetournerChaine({ fiches: [...pleins, fiche('x', { profil: null })], versions: [...pleins.map((f) => version(f.id, 1, { test: testVert(f.id, 1) })), version('x', 1)], tickets: [], votes: [], revues: [] });
  assert.equal(b.etat.fiches.find((f) => f.id === 'x')!.statut, 'candidat');
  // Technique seul après une relecture complète : retouche par l'agent, re-check vert → prêt pour validation directement
  const t = ticket('t', 1, { origine: 'testeur', controle: 'poids', etiquette: 'technique:poids' });
  const nv = nouvelleVersion({ fiche: { id: 't', versionCourante: 1 }, composition: COMPO, cle: 'k', tickets: [t], corrections: [{ ticket: 1 }], auteur: 'testeur', type: 'technique' });
  const e2 = fairetournerChaine({ fiches: [fiche('t', { statut: 'retouche', versionCourante: 2, versionRetouche: 1 })], versions: [version('t', 1), { ...nv.version, test: testVert('t', 2) }], tickets: nv.corriges, votes: [], revues: rienPartout('t', 1) });
  assert.equal(e2.etat.fiches[0].statut, 'pret-validation');
  assert.equal(e2.etat.tickets[0].statut, 'ferme');
  // Candidat sans sa version : jamais envoyé en vérification (réparé ou écarté par l'admin)
  const sansVersion = fairetournerChaine({ fiches: [fiche('v', { profil: null })], versions: [], tickets: [], votes: [], revues: [] });
  assert.equal(sansVersion.etat.fiches[0].statut, 'candidat');
});

test('tableau : ce qui attend chaque personne ; tags pré-remplis', () => {
  const e: EtatChaine = { fiches: [fiche('a', { statut: 'avis-humain' }), fiche('b', { statut: 'pret-validation' })], versions: [], tickets: [], votes: [], revues: rienPartout('a', 1, 'moi').slice(0, 3) };
  const p = [{ id: 'sport', nom: 'Sport', profession: 'podologue' }];
  const contrib = attentesHumain(e, { id: 'moi', role: 'contributeur' }, p);
  assert.ok(contrib.some((x) => x.texte.startsWith('Choisir des designs : 0 gardé en file') && x.nom === 'Tous profils'), 'présélection par profession, sans thème');
  assert.ok(contrib.some((x) => x.modele === 'a' && /Relecture finale : 3 \/ 16 pages vues \(dont 3 par vous\)/.test(x.texte)));
  assert.ok(!contrib.some((x) => x.modele === 'b'), 'l’ajout au catalogue n’attend que Paul');
  assert.ok(!contrib.some((x) => /tournoi/i.test(x.texte)), 'le tournoi n’attend plus personne');
  assert.ok(attentesHumain(e, { id: 'paul', role: 'validateur' }, p).some((x) => x.modele === 'b' && x.texte === 'Ajouter au catalogue'));
  assert.deepEqual(tagsAutomatiques(COMPO, { profession: 'podologue', profil: 'sport', profilsCibles: ['sport', 'course'] }), { profession: 'podologue', profils: ['sport', 'course'], couleurs: ['gamme:canard', 'canard'] });
  assert.equal(nomTeinte('#c2410c'), 'orange');
  assert.equal(nomTeinte('#1d4ed8'), 'bleu');
  assert.equal(nomTeinte('#f5f5f5'), 'blanc');
});

test('transitions de la chaîne en 3 étapes : permises à l’automate seulement (migration 0064)', () => {
  for (const [de, vers] of [['check-agent', 'retouche'], ['check-agent', 'ecarte'], ['recheck-agent', 'avis-humain'], ['recheck-agent', 'ecarte']] as const) {
    assert.equal(transitionPermise(de, vers, 'auto'), true, `${de} → ${vers}`);
    assert.equal(transitionPermise(de, vers, 'contributeur'), false);
  }
});

test('test orange : le modèle va jusqu’à la validation (justification de Paul) ; rouge : jamais', () => {
  const orange = (id: string): ResultatTestModele => ({ ...testVert(id, 1), verdict: 'orange' });
  const rouge = (id: string): ResultatTestModele => ({ ...testVert(id, 1), verdict: 'rouge' });
  const { etat } = fairetournerChaine({ fiches: [fiche('o', { statut: 'avis-humain' }), fiche('r', { statut: 'avis-humain' })], versions: [version('o', 1, { test: orange('o') }), version('r', 1, { test: rouge('r') })], tickets: [], votes: [], revues: [...rienPartout('o', 1), ...rienPartout('r', 1)] });
  assert.equal(etat.fiches.find((f) => f.id === 'o')!.statut, 'pret-validation');
  assert.equal(etat.fiches.find((f) => f.id === 'r')!.statut, 'avis-humain');
});

test('automate : les avis d’un modèle ne valent jamais pour un autre (même version)', () => {
  const a = fiche('a', { statut: 'avis-humain' }), b = fiche('b', { statut: 'avis-humain' });
  const { etat } = fairetournerChaine({ fiches: [a, b], versions: [version('a', 1, { test: testVert('a', 1) }), version('b', 1, { test: testVert('b', 1) })], tickets: [], votes: [], revues: rienPartout('a', 1) });
  assert.equal(etat.fiches.find((f) => f.id === 'a')!.statut, 'pret-validation');
  assert.equal(etat.fiches.find((f) => f.id === 'b')!.statut, 'avis-humain', 'b n’a reçu aucun avis');
});

test('modèle = design : images retirées, rendu avec le kit du profil ; profils compatibles (énergique exclu de diabète / senior)', async () => {
  const { designDe, habillerPourProfil, profilsCompatibles, jeuxDeDemo, profilDemo, familleDuDesign } = await import('./chaine-design');
  const { normaliserComposition, compositionInitiale, toutChanger } = await import('./recettes');
  const { modeleIntegre } = await import('./modeles');
  const ctxSport = { sujets: ['sport'], principaux: 1, couleursPreferees: [], modele: modeleIntegre };
  const base = compositionInitiale(ctxSport, 3);
  const x = normaliserComposition({ ...JSON.parse(JSON.stringify(base)), visuels: { ...base.visuels, style: 'photos', herosSujet: 'sport' }, photos: ['/photos/sport-chaussure.webp'] }, ctxSport)!;
  const d = designDe(x) as Record<string, unknown> & { photos: string[]; visuels: { herosSujet: string | null } };
  assert.deepEqual(d.photos, []);
  assert.equal(d.visuels.herosSujet, null);
  const ctxEnfant = { sujets: ['enfant'], principaux: 1, couleursPreferees: [], modele: modeleIntegre, photos: [{ url: '/photos/enfant-pieds.webp', sujets: ['enfant'], origine: 'integree' as const }] };
  const h = habillerPourProfil(normaliserComposition(d, ctxEnfant)!, ctxEnfant, 3);
  assert.equal(h.visuels.herosSujet, 'enfant');
  assert.ok(h.photos.every((u) => !u.includes('sport')), 'aucune image du profil de départ');
  const profils = [{ id: 'sport-basket', sujets: ['sport'] }, { id: 'diabete', sujets: ['diabete'] }, { id: 'senior', sujets: ['senior'] }, { id: 'sport-course', sujets: ['sport'] }];
  let pop = null;
  for (let g = 1; g < 400 && !pop; g++) { const y = toutChanger(base, [], ctxSport, g * 7919); if (familleDuDesign(y) === 'graphique-pop') pop = y; }
  assert.ok(pop, 'un design « Graphique pop » tiré');
  assert.deepEqual(profilsCompatibles(pop!, profils).map((p) => p.id), ['sport-basket', 'sport-course'], 'énergique : ni diabète ni senior');
  assert.deepEqual(jeuxDeDemo(profils).map((p) => p.id), ['sport-basket', 'diabete', 'senior']);
  assert.notEqual(profilDemo(profils, 5, 'sport-basket')?.id, 'sport-basket');
});
