// CHAÎNE GUIDÉE (demande de Paul du 2026-10-10 : « la partie de présélection tournoi etc paraît bloquée je voudrais que les étapes
// du funnel soient plus guidées […] que ce soit vraiment prescriptif pour qu'on arrive à des modèles valides à pousser aux clients
// finaux »). À chaque instant UNE seule prochaine action, calculée ici (fonction pure, testée) et affichée en tête de /chaine et de
// chaque étape : titre, pourquoi, gros bouton qui y mène, fil des 6 étapes jusqu'à « modèle prêt pour les clients ».
//
// Règle de priorité : ce qui rapproche le plus vite un modèle des clients d'abord (validation, revalidation, retouche, relecture,
// test), puis le tournoi, puis la présélection. Les gestes réservés au validateur (publier, lancer le testeur, demander la retouche
// à Claude) ne sont jamais prescrits à un contributeur ; il reçoit alors sa propre prochaine action ou une attente expliquée.
// Docs : docs/chaine-modeles.md (« Chaîne guidée »). Module pur.

import { CHAINE, etatRevision, pagesChangees, ticketsOuverts, versionDe, type EtatChaine, type FicheModele, type RoleEquipe, type StatutModele } from './chaine-modeles';
import { TOURNOI_GRILLES, type EtatTournoiGrilles } from './tournoi-grilles';

/** Les 6 étapes montrées à l'équipe (les statuts internes de la fiche y sont regroupés) */
export const ETAPES_GUIDEES = [
  { n: 1, libelle: 'Présélection', court: 'Choisir' },
  { n: 2, libelle: 'Tournoi', court: 'Voter' },
  { n: 3, libelle: 'Test automatique', court: 'Tester' },
  { n: 4, libelle: 'Relecture page par page', court: 'Relire' },
  { n: 5, libelle: 'Retouches et revalidation', court: 'Corriger' },
  { n: 6, libelle: 'Validation et publication', court: 'Valider' },
] as const;
export type NumeroEtape = (typeof ETAPES_GUIDEES)[number]['n'];

/** Étape guidée d'un statut de fiche (écarté : null) */
export function etapeDuStatut(s: StatutModele): NumeroEtape | null {
  switch (s) {
    case 'candidat': return 1;
    case 'finaliste': return 2;
    case 'check-agent': return 3;
    case 'avis-humain': return 4;
    case 'retouche': case 'recheck-agent': case 'revalidation': return 5;
    case 'pret-validation': case 'publie': return 6;
    default: return null;
  }
}

export type BoutonGuide = { libelle: string; href: string } | { libelle: string; action: 'importer-claude' };
export type IdAction =
  | 'migration' | 'valider' | 'revalider' | 'retouche' | 'relire' | 'tester' | 'tournoi' | 'importer-claude' | 'preselection' | 'attendre' | 'pret';
export type EtapeFil = { n: NumeroEtape; libelle: string; court: string; etat: 'fait' | 'courante' | 'a-venir'; detail: string; ici: boolean };
export type ProchaineAction = {
  id: IdAction;
  /** Étape guidée concernée par l'action */
  etape: NumeroEtape;
  titre: string;
  pourquoi: string;
  /** Gros bouton (null : rien à cliquer, l'explication dit qui agit et quand) */
  bouton: BoutonGuide | null;
  /** Lien secondaire facultatif (« En attendant : … ») */
  secondaire: BoutonGuide | null;
  /** Qui fait le geste prescrit */
  qui: 'vous' | 'paul' | 'claude' | 'agent';
  fil: EtapeFil[];
  /** « Encore 4 étapes avant le premier modèle prêt pour les clients » */
  restant: string;
  /** 0 à 1 : avancement du modèle le plus avancé */
  progression: number;
};

export type EntreeGuidage = {
  role: RoleEquipe;
  /** Chaîne de la profession (fiches de la profession seulement) */
  etat: EtatChaine;
  migrationManquante?: boolean;
  /** Tournoi des designs de la profession, déjà calculé par la page (tournoiDuProfil) ; null : pas encore de candidats */
  tournoi?: Pick<EtatTournoiGrilles, 'ouvert' | 'arrete' | 'grilles' | 'restantes' | 'certitude' | 'texte'> & { duels?: number } | null;
  /** Designs proposés par Claude (ids canon-*) pas encore candidats */
  propositionsClaude?: number;
};

const guillemets = (s: string) => `« ${s} »`;
const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

/** Fil des 6 étapes : l'avancement du modèle le plus avancé, le détail de chaque étape */
function filEtapes(e: EtatChaine, tournoi: EntreeGuidage['tournoi'], etapeAction: NumeroEtape): { fil: EtapeFil[]; max: number; publies: number } {
  const fiches = e.fiches.filter((f) => etapeDuStatut(f.statut) !== null);
  const parEtape = (n: number) => fiches.filter((f) => etapeDuStatut(f.statut) === n);
  const publies = fiches.filter((f) => f.statut === 'publie').length;
  // Tournoi ouvert : les candidats sont à l'étape 2 (on vote)
  const etapeDe = (f: FicheModele) => (f.statut === 'candidat' && tournoi?.ouvert ? 2 : etapeDuStatut(f.statut) ?? 1);
  const max = publies ? 7 : Math.max(1, ...fiches.map(etapeDe));
  const candidats = e.fiches.filter((f) => f.statut === 'candidat' && f.profil === null).length;
  const details: Record<NumeroEtape, string> = {
    1: `${candidats} / ${CHAINE.ouvertureTournoi} candidats`,
    2: tournoi?.ouvert ? (tournoi.arrete ? 'terminé' : `${pluriel(tournoi.grilles, 'grille')} · ~${tournoi.restantes} restante${tournoi.restantes > 1 ? 's' : ''}`) : parEtape(2).length ? `${pluriel(parEtape(2).length, 'finaliste')} en file` : `s’ouvre à ${CHAINE.ouvertureTournoi} candidats`,
    3: parEtape(3).length ? `${parEtape(3).length} en test` : '—',
    4: parEtape(4).length ? `${parEtape(4).length} à relire` : '—',
    5: parEtape(5).length ? `${parEtape(5).length} en retouche` : '—',
    6: publies ? `${pluriel(publies, 'modèle publié', 'modèles publiés')}` : parEtape(6).length ? `${parEtape(6).length} prêt${parEtape(6).length > 1 ? 's' : ''} à valider` : '—',
  };
  const fil = ETAPES_GUIDEES.map((s): EtapeFil => {
    const etat = s.n < max ? 'fait' : s.n === max ? 'courante' : 'a-venir';
    // Étape franchie sans rien en cours : « fait » plutôt qu'un compteur vide
    const vide = !parEtape(s.n).length && !(s.n === 2 && tournoi?.ouvert) && !(s.n === 1 && candidats);
    return { n: s.n, libelle: s.libelle, court: s.court, detail: etat === 'fait' && vide ? 'fait' : details[s.n], ici: s.n === etapeAction, etat };
  });
  return { fil, max, publies };
}

/** Avis page par page d'une fiche en relecture (cellules vues / total) */
function revisionDe(e: EtatChaine, f: FicheModele) {
  const v = versionDe(e, f.id, f.versionCourante), prec = versionDe(e, f.id, f.versionCourante - 1);
  return etatRevision(f.versionCourante, e.revues.filter((r) => r.modele === f.id), e.tickets.filter((t) => t.modele === f.id), prec ? { precedente: prec.version, changees: pagesChangees(prec.composition, v?.composition) } : undefined);
}

const meilleurRang = (a: FicheModele, b: FicheModele) => (a.rang ?? 99) - (b.rang ?? 99) || (a.creeLe < b.creeLe ? -1 : 1);

/**
 * LA prochaine action de la chaîne pour une personne (contributeur ou validateur), avec le fil des 6 étapes. Ordre : plus près des
 * clients d'abord. Toujours une action ou une attente expliquée : jamais un écran sans quoi faire.
 */
export function prochaineActionChaine(p: EntreeGuidage): ProchaineAction {
  const e = p.etat;
  const validateur = p.role === 'validateur';
  const de = (s: StatutModele) => e.fiches.filter((f) => f.statut === s).sort(meilleurRang);
  const candidats = e.fiches.filter((f) => f.statut === 'candidat' && f.profil === null).length;
  const manque = Math.max(0, CHAINE.ouvertureTournoi - candidats);
  const t = p.tournoi ?? null;
  const claude = Math.max(0, p.propositionsClaude ?? 0);
  const presel: BoutonGuide = { libelle: 'Présélectionner des designs', href: '/chaine/preselection' };

  const fin = (a: Omit<ProchaineAction, 'fil' | 'restant' | 'progression'>): ProchaineAction => {
    const { fil, max, publies } = filEtapes(e, t, a.etape);
    const reste = publies ? 0 : 6 - max + 1;
    return {
      ...a, fil,
      restant: publies ? `${pluriel(publies, 'modèle prêt', 'modèles prêts')} pour les clients` : `Encore ${pluriel(reste, 'étape')} avant le premier modèle prêt pour les clients`,
      progression: publies ? 1 : Math.round(((max - 1) / 6) * 100) / 100,
    };
  };

  if (p.migrationManquante) {
    return fin({
      id: 'migration', etape: 1, qui: 'paul', bouton: null, secondaire: null,
      titre: 'Exécuter la migration de la chaîne dans Supabase',
      pourquoi: 'Les tables de la chaîne n’existent pas encore : rien ne peut être enregistré. Paul exécute supabase/migrations/0050_chaine_modeles.sql puis 0052_tournoi_grilles.sql (SQL Editor de Supabase), puis recharge cette page.',
    });
  }

  // 6. Validation et publication (validateur)
  const prets = de('pret-validation');
  if (validateur && prets.length) {
    const f = prets[0];
    return fin({
      id: 'valider', etape: 6, qui: 'vous', secondaire: null,
      titre: `Valider et publier ${guillemets(f.nom)}`,
      pourquoi: `Testeur, relecture et tickets sont au vert. Vérifiez les tags (profils compatibles) puis « Publier pour les praticiens » : le modèle devient disponible pour les clients.${prets.length > 1 ? ` ${prets.length - 1} autre${prets.length > 2 ? 's' : ''} ensuite.` : ''}`,
      bouton: { libelle: 'Ouvrir la validation', href: `/chaine/modele/${f.id}` },
    });
  }

  // 5. Revalidation (1 clic, tout le monde)
  const reval = de('revalidation').filter((f) => !ticketsOuverts(e.tickets.filter((x) => x.modele === f.id)).length);
  if (reval.length) {
    const f = reval[0];
    return fin({
      id: 'revalider', etape: 5, qui: 'vous', secondaire: null,
      titre: `Revalider ${guillemets(f.nom)} (ce qui a changé seulement)`,
      pourquoi: `Claude a corrigé la v${f.versionCourante}. Regardez l’avant / après des pages modifiées : « Tout revalider » en 1 clic, ou rouvrez un ticket s’il n’est pas corrigé.`,
      bouton: { libelle: 'Revalider ce modèle', href: `/chaine/revision/${f.id}` },
    });
  }

  // 5. Retouche par Claude (le validateur la demande)
  const retouches = de('retouche');
  if (validateur && retouches.length) {
    const f = retouches[0];
    const n = ticketsOuverts(e.tickets.filter((x) => x.modele === f.id)).length;
    return fin({
      id: 'retouche', etape: 5, qui: 'claude', secondaire: presel,
      titre: `Faire corriger ${guillemets(f.nom)} par Claude (${pluriel(n, 'ticket')})`,
      pourquoi: 'Les tickets de la relecture sont prêts. Dans Claude Code, demandez : « Corrige les tickets de la chaîne des modèles (retours/tickets-modeles.json) ». La nouvelle version arrive seule dans la chaîne, puis repasse au testeur.',
      bouton: { libelle: 'Voir les tickets à corriger', href: `/chaine/modele/${f.id}` },
    });
  }

  // 4. Relecture page par page (tout le monde)
  const relire = de('avis-humain').map((f) => ({ f, r: revisionDe(e, f) })).filter((x) => !x.r.terminee);
  if (relire.length) {
    const { f, r } = relire[0];
    return fin({
      id: 'relire', etape: 4, qui: 'vous', secondaire: null,
      titre: `Relire ${guillemets(f.nom)} page par page (${r.faites} / ${r.total})`,
      pourquoi: `Le testeur a passé ce finaliste. Pour chaque page, sur téléphone puis sur ordinateur : « Rien à signaler », ou entourez ce qui ne va pas. Il reste ${pluriel(r.total - r.faites, 'page')} à voir.`,
      bouton: { libelle: 'Relire ce modèle', href: `/chaine/revision/${f.id}` },
    });
  }

  // 3. Test automatique (le validateur le lance : workflow GitHub, rien n'est publié)
  const aTester = [...de('check-agent'), ...de('recheck-agent')].filter((f) => !versionDe(e, f.id, f.versionCourante)?.test);
  if (validateur && aTester.length) {
    const f = aTester[0];
    return fin({
      id: 'tester', etape: f.statut === 'recheck-agent' ? 5 : 3, qui: 'vous', secondaire: null,
      titre: `Lancer le test automatique de ${guillemets(f.nom)}`,
      pourquoi: `Le testeur vérifie toutes les pages sur téléphone et ordinateur (lisibilité, contrastes, débordements, liens). Bouton « Lancer le test » de la fiche ; résultat en 10 à 15 min, la chaîne avance seule ensuite.${aTester.length > 1 ? ` ${aTester.length - 1} autre${aTester.length > 2 ? 's' : ''} à lancer ensuite.` : ''}`,
      bouton: { libelle: 'Lancer le test', href: `/chaine/modele/${f.id}#fi-test` },
    });
  }

  // 2. Tournoi ouvert
  // Arrêt forcé au plafond d'écrans (tournoi-grilles.ts) : jamais « Jouer la grille 49 » (bug du 2026-10-10)
  const faitsTournoi = t ? t.grilles + (t.duels ?? 0) : 0;
  const tournoiEnCours = Boolean(t?.ouvert && !t.arrete && faitsTournoi < TOURNOI_GRILLES.ecransMax);
  if (t && tournoiEnCours) {
    const faits = faitsTournoi, k = faits + 1, total = Math.min(TOURNOI_GRILLES.ecransMax, faits + Math.max(1, t.restantes));
    return fin({
      id: 'tournoi', etape: 2, qui: 'vous', secondaire: null,
      titre: `Jouer la grille ${k} / ~${total} du tournoi`,
      pourquoi: `Touchez vos 2 designs préférés parmi 6. Le tournoi s’arrête seul quand le top ${CHAINE.finalistes} est sûr (${Math.round((t.certitude ?? 0) * 100)} % pour l’instant) ; les finalistes passent alors au test automatique.`,
      bouton: { libelle: `Jouer la grille ${k}`, href: '/chaine/tournoi' },
    });
  }

  // 2. Tournoi terminé, candidats pas encore passés finalistes (l'automate le fait au chargement suivant, ou un passage a été
  //    refusé) : on l'explique, jamais une autre étape qui laisserait croire que les votes sont perdus
  if (t?.ouvert && !tournoiEnCours && candidats > CHAINE.finalistes) {
    return fin({
      id: 'attendre', etape: 2, qui: 'agent', secondaire: null,
      titre: `Tournoi terminé (${pluriel(faitsTournoi, 'écran')}) : passage des finalistes`,
      pourquoi: `Le top ${CHAINE.finalistes} est retenu ; les finalistes passent au test automatique et les autres sont écartés. Rechargez le tableau dans un instant pour voir la suite.`,
      bouton: { libelle: 'Voir les finalistes', href: '/chaine' },
    });
  }

  // 1. Présélection : pas assez de candidats pour ouvrir le tournoi
  if (manque > 0) {
    if (claude > 0) {
      return fin({
        id: 'importer-claude', etape: 1, qui: 'vous', secondaire: presel,
        titre: `Importer les ${pluriel(claude, 'modèle proposé', 'modèles proposés')} par Claude`,
        pourquoi: `Ils deviennent candidats d’un coup (${candidats} → ${candidats + claude} / ${CHAINE.ouvertureTournoi}). Rien n’est validé : ils passent le tournoi comme les autres.`,
        bouton: { libelle: `Importer les ${claude} modèles de Claude`, action: 'importer-claude' },
      });
    }
    return fin({
      id: 'preselection', etape: 1, qui: 'vous', secondaire: null,
      titre: `Garder encore ${pluriel(manque, 'candidat')} pour ouvrir le tournoi (${candidats} / ${CHAINE.ouvertureTournoi})`,
      pourquoi: `Faites défiler les pages de 6 designs, touchez ceux qui vous plaisent puis « Garder ». Le tournoi s’ouvre seul à ${CHAINE.ouvertureTournoi} candidats.`,
      bouton: { libelle: candidats ? 'Continuer la présélection' : 'Commencer la présélection', href: '/chaine/preselection' },
    });
  }

  // Rien à faire pour cette personne : ce qui tourne tout seul, expliqué, et de quoi avancer en attendant
  const enTest = [...de('check-agent'), ...de('recheck-agent')];
  if (enTest.length) {
    const f = enTest[0];
    const lance = Boolean(versionDe(e, f.id, f.versionCourante)?.test);
    return fin({
      id: 'attendre', etape: f.statut === 'recheck-agent' ? 5 : 3, qui: 'agent', secondaire: null,
      titre: `Test automatique de ${guillemets(f.nom)} en cours`,
      pourquoi: lance ? 'Le résultat est arrivé : la chaîne avance au prochain chargement.' : 'Paul lance le test depuis la fiche du modèle ; la relecture page par page s’ouvre dès son résultat. En attendant, présélectionnez d’autres designs pour le prochain tournoi.',
      bouton: presel,
    });
  }
  if (retouches.length) {
    const f = retouches[0];
    return fin({
      id: 'attendre', etape: 5, qui: 'claude', secondaire: null,
      titre: `Retouche de ${guillemets(f.nom)} par Claude`,
      pourquoi: 'Paul demande la correction des tickets à Claude ; la nouvelle version revient seule pour revalidation. En attendant, présélectionnez d’autres designs.',
      bouton: presel,
    });
  }
  if (prets.length) {
    return fin({
      id: 'attendre', etape: 6, qui: 'paul', secondaire: null,
      titre: `${pluriel(prets.length, 'modèle attend', 'modèles attendent')} la validation de Paul`,
      pourquoi: 'Tout est au vert : Paul vérifie les tags et publie. En attendant, présélectionnez d’autres designs pour le prochain tournoi.',
      bouton: presel,
    });
  }
  const file = de('finaliste');
  if (file.length) {
    return fin({
      id: 'attendre', etape: 2, qui: 'agent', secondaire: null,
      titre: `${pluriel(file.length, 'finaliste attend', 'finalistes attendent')} une place en relecture`,
      pourquoi: `${CHAINE.maxRevision} modèles au plus sont relus en même temps ; le suivant entre seul dès qu’une place se libère.`,
      bouton: presel,
    });
  }
  const publies = de('publie').length;
  return fin({
    id: publies ? 'pret' : 'preselection', etape: 1, qui: 'vous', secondaire: null,
    titre: publies ? `${pluriel(publies, 'modèle prêt', 'modèles prêts')} pour les clients : préparer le lot suivant` : 'Présélectionner de nouveaux designs',
    pourquoi: `Chaque lot de ${CHAINE.ouvertureTournoi} candidats ouvre un nouveau tournoi ; ses finalistes suivent le même chemin jusqu’aux clients.`,
    bouton: presel,
  });
}
