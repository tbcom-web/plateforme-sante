// Chaîne de production des modèles (chaine-modeles.ts, chaine-modeles-format.ts) : rôles, statuts et transitions, arrêt du tournoi,
// sélection des finalistes, tickets et versions, testeur, verrous de validation, export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appliquerResultatTest, attentesHumain, avisFaits, CHAINE, CELLULES_REVISION, choixDePreselection, classementTournoi, etatRevision, etatTournoi, exportTicketsModeles, fairetournerChaine,
  filtreLeger, ligneCorrection, lireRetouches, markdownTicketsModeles, modelesATester, nomTeinte, nouvelleVersion, pagesChangees, peut, peutPublier, poidsVote, prochainDuel,
  retouchesAAppliquer, roleEffectif, tagsAutomatiques, transitionPermise, verrousValidation,
  type EtatChaine, type FicheModele, type RevueModele, type VersionModele, type VoteModele,
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

test('parcours complet par l’automate : candidat → finaliste → check agent → avis → retouche → re-check → revalidation → prêt → publié → ticket rouvre sans dépublier', () => {
  const { ids, votes } = tournoiSimule(22, 220, { graine: 11 });
  let e: EtatChaine = { fiches: ids.map((id) => fiche(id)), versions: ids.map((id) => version(id, 1)), tickets: [], votes, revues: [] };
  let r = fairetournerChaine(e);
  e = r.etat;
  const statuts = (s: string) => e.fiches.filter((f) => f.statut === s).map((f) => f.id);
  assert.equal(statuts('check-agent').length, CHAINE.finalistes, 'les 10 finalistes entrent dans la boucle (10 places)');
  assert.equal(statuts('ecarte').length, 12);
  const m = statuts('check-agent').sort((a, b) => (e.fiches.find((f) => f.id === a)!.rang ?? 0) - (e.fiches.find((f) => f.id === b)!.rang ?? 0))[0];
  assert.equal(e.fiches.find((f) => f.id === m)!.rang, 1);
  // 3. Le testeur passe : un ticket technique
  const rt: ResultatTestModele = { ...testVert(m, 1), verdict: 'orange', controles: [{ id: 'mots-coupes', libelle: 'Mots coupés', verdict: 'orange', page: 'cabinet', appareil: 'mobile' }], tickets: [ticket(m, 0, { origine: 'testeur', controle: 'mots-coupes', etiquette: 'technique:mot-coupe', page: 'cabinet' })] };
  const a = appliquerResultatTest([], rt);
  e = { ...e, versions: e.versions.map((v) => (v.modele === m && v.version === 1 ? { ...v, test: rt } : v)), tickets: a.nouveaux };
  e = fairetournerChaine(e).etat;
  assert.equal(e.fiches.find((f) => f.id === m)!.statut, 'avis-humain');
  // 4. Un humain : un ticket de goût + « Rien à signaler » ailleurs
  e = { ...e, tickets: [...e.tickets, ticket(m, 2)], revues: rienPartout(m, 1).filter((x) => !(x.page === 'acces' && x.appareil === 'mobile')) };
  e = fairetournerChaine(e).etat;
  assert.equal(e.fiches.find((f) => f.id === m)!.statut, 'retouche');
  const exp = exportTicketsModeles(e.fiches, e.versions, e.tickets);
  assert.equal(exp[0].modele, m, 'le modèle en retouche passe en premier');
  assert.equal(exp[0].tickets.length, 2);
  assert.ok(!('auteur' in exp[0].tickets[0]), 'jamais d’auteur dans l’export public');
  assert.match(markdownTicketsModeles(exp), /#2 \[humain\] Contact et accès \(mobile\)/);
  // 5. Claude retouche
  const f = e.fiches.find((x) => x.id === m)!;
  const nv = nouvelleVersion({ fiche: f, composition: { ...COMPO, couleur: '#115e59' }, cle: 'compo:v2', tickets: e.tickets, corrections: [{ ticket: 1 }, { ticket: 2 }], auteur: 'claude', type: 'correction' });
  e = { ...e, fiches: e.fiches.map((x) => (x.id === m ? { ...x, versionCourante: 2 } : x)), versions: [...e.versions, nv.version], tickets: e.tickets.map((t) => nv.corriges.find((c) => c.numero === t.numero && t.modele === m) ?? t) };
  e = fairetournerChaine(e).etat;
  assert.equal(e.fiches.find((x) => x.id === m)!.statut, 'recheck-agent');
  assert.equal(modelesATester(e.fiches, e.versions).filter((x) => x.modele === m)[0].version, 2);
  // 6. Re-check au vert → 7. revalidation humaine (correction de goût) → 8. prêt
  e = { ...e, versions: e.versions.map((v) => (v.modele === m && v.version === 2 ? { ...v, test: testVert(m, 2) } : v)) };
  e = fairetournerChaine(e).etat;
  assert.equal(e.fiches.find((x) => x.id === m)!.statut, 'revalidation');
  e = { ...e, revues: [...e.revues, { modele: m, version: 2, page: null, appareil: null, auteur: 'u2', verdict: 'revalide', le: '' }], tickets: e.tickets.map((t) => (t.modele === m && t.statut === 'corrige' ? { ...t, statut: 'ferme' as const } : t)) };
  e = fairetournerChaine(e).etat;
  assert.equal(e.fiches.find((x) => x.id === m)!.statut, 'pret-validation');
  // Validation : verrous
  const fm = e.fiches.find((x) => x.id === m)!;
  const avis = avisFaits(2, e.versions.filter((v) => v.modele === m), e.revues.filter((r) => r.modele === m), e.tickets.filter((t) => t.modele === m));
  assert.deepEqual([avis.ok, avis.base], [true, 1], 'avis complet sur la v1 puis revalidé sur la v2 (depuis modeles_revues)');
  assert.equal(avisFaits(2, e.versions.filter((v) => v.modele === m), e.revues.filter((r) => r.modele === m && r.verdict !== 'revalide'), e.tickets.filter((t) => t.modele === m)).ok, false, 'sans revalidation : verrou au rouge, quel que soit le statut');
  assert.equal(avisFaits(1, e.versions.filter((v) => v.modele === m), [], []).ok, false, 'aucun avis : rouge');
  const ver = (over: Partial<Parameters<typeof verrousValidation>[0]> = {}) => verrousValidation({ fiche: fm, version: e.versions.find((v) => v.modele === m && v.version === 2)!, tickets: e.tickets.filter((t) => t.modele === m), jauge: { part: 1, total: 9 }, elements: { ok: true, bloquants: 0 }, avis, ...over });
  assert.equal(peutPublier(ver()), false, 'tags pré-remplis mais pas encore vérifiés');
  assert.equal(peutPublier(ver({ fiche: { ...fm, tagsValides: true } })), true);
  assert.equal(peutPublier(ver({ fiche: { ...fm, tagsValides: true }, jauge: { part: 0.9, total: 10 } })), false, 'jauge < 100 %');
  assert.equal(peutPublier(ver({ fiche: { ...fm, tagsValides: true }, elements: { ok: false, bloquants: 1 } })), false);
  // Publication (Paul), puis une zone signalée rouvre une retouche sans dépublier
  e = { ...e, fiches: e.fiches.map((x) => (x.id === m ? { ...x, statut: 'publie' as const, versionPubliee: 2 } : x)) };
  assert.equal(fairetournerChaine(e).actions.filter((x) => x.modele === m).length, 0, 'publié et rien d’ouvert : stable');
  e = { ...e, tickets: [...e.tickets, ticket(m, 3, { versionOuverture: 2, page: 'questions' })] };
  e = fairetournerChaine(e).etat;
  const apres = e.fiches.find((x) => x.id === m)!;
  assert.equal(apres.statut, 'retouche');
  assert.equal(apres.versionPubliee, 2, 'reste en ligne');
});

test('boucle limitée à 10 ; corrections purement techniques au vert : prêt sans humain', () => {
  const fiches = Array.from({ length: 12 }, (_, i) => fiche(`f${i}`, { statut: 'finaliste', rang: i + 1 }));
  const { etat } = fairetournerChaine({ fiches, versions: fiches.map((f) => version(f.id, 1)), tickets: [], votes: [], revues: [] });
  assert.equal(etat.fiches.filter((f) => f.statut === 'check-agent').length, 10);
  assert.deepEqual(etat.fiches.filter((f) => f.statut === 'finaliste').map((f) => f.rang), [11, 12]);
  // Technique seul : retouche par l'agent, re-check vert → prêt pour validation directement
  const t = ticket('t', 1, { origine: 'testeur', controle: 'poids', etiquette: 'technique:poids' });
  const nv = nouvelleVersion({ fiche: { id: 't', versionCourante: 1 }, composition: COMPO, cle: 'k', tickets: [t], corrections: [{ ticket: 1 }], auteur: 'testeur', type: 'technique' });
  const e2 = fairetournerChaine({ fiches: [fiche('t', { statut: 'retouche', versionCourante: 2, versionRetouche: 1 })], versions: [version('t', 1), { ...nv.version, test: testVert('t', 2) }], tickets: nv.corriges, votes: [], revues: [] });
  assert.equal(e2.etat.fiches[0].statut, 'pret-validation');
  assert.equal(e2.etat.tickets[0].statut, 'ferme');
});

test('tableau : ce qui attend chaque personne ; tags pré-remplis', () => {
  const e: EtatChaine = { fiches: [fiche('a', { statut: 'avis-humain' }), fiche('b', { statut: 'pret-validation' })], versions: [], tickets: [], votes: [], revues: rienPartout('a', 1, 'moi').slice(0, 3) };
  const p = [{ id: 'sport', nom: 'Sport', profession: 'podologue' }];
  const contrib = attentesHumain(e, { id: 'moi', role: 'contributeur' }, p);
  assert.ok(contrib.some((x) => x.texte.startsWith('Présélection : 0 / 30') && x.nom === 'Tous profils'), 'présélection par profession, sans thème');
  assert.ok(contrib.some((x) => x.modele === 'a' && /3 \/ 16 pages vues \(dont 3 par vous\)/.test(x.texte)));
  assert.ok(!contrib.some((x) => x.modele === 'b'), 'la validation finale n’attend que Paul');
  assert.ok(attentesHumain(e, { id: 'paul', role: 'validateur' }, p).some((x) => x.modele === 'b'));
  assert.deepEqual(tagsAutomatiques(COMPO, { profession: 'podologue', profil: 'sport', profilsCibles: ['sport', 'course'] }), { profession: 'podologue', profils: ['sport', 'course'], couleurs: ['gamme:canard', 'canard'] });
  assert.equal(nomTeinte('#c2410c'), 'orange');
  assert.equal(nomTeinte('#1d4ed8'), 'bleu');
  assert.equal(nomTeinte('#f5f5f5'), 'blanc');
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
