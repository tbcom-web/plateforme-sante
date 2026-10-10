// CHAÎNE GUIDÉE (demande de Paul du 2026-10-10 : « que ce soit vraiment prescriptif pour qu'on arrive à des modèles valides à pousser
// aux clients finaux »), en 3 ÉTAPES depuis le 2026-10-11 (« c'est un peu trop complexe… une seule relecture finale avant publication
// et ajout au catalogue ») : 1. Choisir (présélection), 2. Vérification (automatique : testeur lancé par l'admin, corrections
// techniques demandées à Claude), 3. Relecture finale (Paul), puis le catalogue. À chaque instant UNE seule prochaine action,
// calculée ici (fonction pure, testée) et affichée en tête de /chaine et de chaque étape : titre, pourquoi, gros bouton, fil des étapes.
//
// Règle de priorité STRICTE (décision de Paul du 2026-10-10 : « on priorise un modèle quasi fini à un autre modèle en cours ») : ce qui
// rapproche le plus vite un modèle du catalogue d'abord — ajouter au catalogue > revoir les pages modifiées > envoyer les remarques à
// Claude > relire (une relecture déjà entamée avant toute autre) > envoyer les corrections techniques > relancer une vérification
// bloquée > choisir ; à étape égale, le modèle le plus avancé (comparerProximite de chaine-modeles.ts). Les gestes réservés au
// validateur (ajouter au catalogue, envoyer à Claude, relancer le testeur) ne sont jamais prescrits à un contributeur. Le tournoi
// n'est plus une étape (vue détaillée seulement). Docs : docs/chaine-modeles.md (« Chaîne en 3 étapes »). Module pur.

import {
  CHAINE, comparerProximite, demandeCorrectionsModele, etapeVisibleDuStatut, fileVerification, modelesEnRelecture, revisionDeFiche, suiviTests, ticketsOuverts,
  type EtapeVisible, type EtatChaine, type FicheModele, type RoleEquipe, type StatutModele, type TestLance,
} from './chaine-modeles';

/** Les 3 étapes montrées à l'équipe (les statuts internes de la fiche y sont regroupés) ; le catalogue est l'arrivée */
export const ETAPES_GUIDEES = [
  { n: 1, libelle: 'Choisir', court: 'Choisir' },
  { n: 2, libelle: 'Vérification', court: 'Vérifier' },
  { n: 3, libelle: 'Relecture finale', court: 'Relire' },
] as const;
export type NumeroEtape = (typeof ETAPES_GUIDEES)[number]['n'];

const NUMERO: Record<EtapeVisible, number> = { choisir: 1, verification: 2, relecture: 3, catalogue: 4 };

/**
 * Étape guidée d'un statut de fiche (écarté : null ; publié : 3, la relecture finale est sa dernière étape). Retouche et re-test :
 * vérification tant que la relecture finale n'a pas commencé (`relu`), relecture finale ensuite.
 */
export function etapeDuStatut(s: StatutModele, relu = false): NumeroEtape | null {
  const v = etapeVisibleDuStatut(s, relu);
  return v === null ? null : (Math.min(3, NUMERO[v]) as NumeroEtape);
}

export type BoutonGuide = { libelle: string; href: string } | { libelle: string; action: 'importer-claude' };
export type IdAction =
  | 'migration' | 'valider' | 'revalider' | 'retouche' | 'relire' | 'corrections' | 'tester' | 'importer-claude' | 'preselection' | 'attendre' | 'pret';
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
  /** « Encore 2 étapes avant le premier modèle au catalogue » */
  restant: string;
  /** 0 à 1 : avancement du modèle le plus avancé */
  progression: number;
  /** « Envoyer à Claude » : demande autonome à envoyer (partage depuis le téléphone, copie) */
  demande?: { titre: string; texte: string };
};

export type EntreeGuidage = {
  role: RoleEquipe;
  /** Chaîne de la profession (fiches de la profession seulement) */
  etat: EtatChaine;
  migrationManquante?: boolean;
  /** Designs proposés par Claude (ids canon-*) pas encore gardés */
  propositionsClaude?: number;
  /** Lancements du testeur (modeles_tests_lances) : vérification en cours ou bloquée */
  lances?: readonly TestLance[];
  /** Le lancement automatique du testeur est possible (GitHub configuré) ; false : à lancer à la main depuis la fiche */
  lancementAuto?: boolean;
  /** Horloge (tests) */
  maintenant?: number;
};

const guillemets = (s: string) => `« ${s} »`;
const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

/** Fil des 3 étapes : l'avancement du modèle le plus avancé, le détail de chaque étape */
function filEtapes(e: EtatChaine, etapeAction: NumeroEtape): { fil: EtapeFil[]; max: number; publies: number } {
  const relus = modelesEnRelecture(e);
  const vis = (f: FicheModele) => etapeVisibleDuStatut(f.statut, relus.has(f.id));
  const parEtape = (id: EtapeVisible) => e.fiches.filter((f) => vis(f) === id);
  const publies = parEtape('catalogue').length;
  const max = publies ? 4 : Math.max(1, ...e.fiches.map((f) => { const v = vis(f); return v ? NUMERO[v] : 1; }));
  const gardes = parEtape('choisir').length, verif = parEtape('verification').length;
  const relecture = parEtape('relecture'), prets = relecture.filter((f) => f.statut === 'pret-validation').length;
  const details: Record<NumeroEtape, string> = {
    1: gardes ? `${pluriel(gardes, 'gardé')} en file` : 'à choisir',
    2: verif ? `${verif} en vérification` : '—',
    3: relecture.length ? (prets ? `${pluriel(prets, 'prêt')} pour le catalogue` : `${relecture.length} en relecture`) : '—',
  };
  const fil = ETAPES_GUIDEES.map((s): EtapeFil => {
    const etat = s.n < max ? 'fait' : s.n === max ? 'courante' : 'a-venir';
    const vide = !(s.n === 1 ? gardes : s.n === 2 ? verif : relecture.length);
    return { n: s.n, libelle: s.libelle, court: s.court, detail: etat === 'fait' && vide ? 'fait' : details[s.n], ici: s.n === etapeAction, etat };
  });
  return { fil, max, publies };
}

/**
 * LA prochaine action de la chaîne pour une personne (contributeur ou validateur), avec le fil des 3 étapes. Ordre : plus près du
 * catalogue d'abord. Toujours une action ou une attente expliquée : jamais un écran sans quoi faire.
 */
export function prochaineActionChaine(p: EntreeGuidage): ProchaineAction {
  const e = p.etat;
  const validateur = p.role === 'validateur';
  const relus = modelesEnRelecture(e);
  // À étape égale : le modèle le plus avancé d'abord (relecture entamée, moins de pages et de tickets restants, meilleur rang)
  const proximite = comparerProximite(e);
  const de = (s: StatutModele) => e.fiches.filter((f) => f.statut === s).sort(proximite);
  const gardes = e.fiches.filter((f) => f.statut === 'candidat').length;
  const claude = Math.max(0, p.propositionsClaude ?? 0);
  const presel: BoutonGuide = { libelle: 'Choisir des designs', href: '/chaine/preselection' };
  const tickets = (f: FicheModele) => e.tickets.filter((x) => x.modele === f.id);

  const fin = (a: Omit<ProchaineAction, 'fil' | 'restant' | 'progression'>): ProchaineAction => {
    const { fil, max, publies } = filEtapes(e, a.etape);
    const reste = publies ? 0 : 3 - max + 1;
    return {
      ...a, fil,
      restant: publies ? `${pluriel(publies, 'modèle', 'modèles')} au catalogue` : `Encore ${pluriel(reste, 'étape')} avant le premier modèle au catalogue`,
      progression: publies ? 1 : Math.round(((max - 1) / 3) * 100) / 100,
    };
  };

  if (p.migrationManquante) {
    return fin({
      id: 'migration', etape: 1, qui: 'paul', bouton: null, secondaire: null,
      titre: 'Exécuter la migration de la chaîne dans Supabase',
      pourquoi: 'Les tables de la chaîne n’existent pas encore : rien ne peut être enregistré. Paul exécute supabase/migrations/0050_chaine_modeles.sql puis 0052_tournoi_grilles.sql (SQL Editor de Supabase), puis recharge cette page.',
    });
  }

  // 3. Relecture finale terminée : ajouter au catalogue (validateur)
  const prets = de('pret-validation');
  if (validateur && prets.length) {
    const f = prets[0];
    return fin({
      id: 'valider', etape: 3, qui: 'vous', secondaire: null,
      titre: `Ajouter ${guillemets(f.nom)} au catalogue`,
      pourquoi: `Vérification et relecture finale sont faites. Profils compatibles pré-cochés, puis « Ajouter au catalogue » : le modèle devient disponible pour les praticiens. Rien n’est publié sans votre clic.${prets.length > 1 ? ` ${prets.length - 1} autre${prets.length > 2 ? 's' : ''} ensuite.` : ''}`,
      bouton: { libelle: 'Ajouter au catalogue', href: `/chaine/revision/${f.id}` },
    });
  }

  // 3. Pages modifiées à revoir (relecture finale, avant / après)
  const reval = de('revalidation').filter((f) => !ticketsOuverts(tickets(f)).length);
  if (reval.length) {
    const f = reval[0];
    return fin({
      id: 'revalider', etape: 3, qui: 'vous', secondaire: null,
      titre: `Revoir les pages modifiées de ${guillemets(f.nom)}`,
      pourquoi: `Claude a corrigé vos remarques (v${f.versionCourante}, vérification passée). Seules les pages modifiées sont reproposées, avant / après : « C’est bon » ou « Encore à corriger ».`,
      bouton: { libelle: 'Revoir les pages modifiées', href: `/chaine/revision/${f.id}` },
    });
  }

  // 3. Remarques de la relecture finale à envoyer à Claude (validateur)
  const retouches = de('retouche');
  const remarques = retouches.filter((f) => relus.has(f.id));
  if (validateur && remarques.length) {
    const f = remarques[0];
    const n = ticketsOuverts(tickets(f)).length;
    return fin({
      id: 'retouche', etape: 3, qui: 'claude', secondaire: presel,
      titre: `Envoyer les remarques sur ${guillemets(f.nom)} à Claude (${pluriel(n, 'remarque')})`,
      pourquoi: '« Envoyer à Claude » partage la demande complète (remarques en clair, livraison attendue) vers l’app Claude, session Code. La nouvelle version revient seule, revérifiée ; vous ne reverrez que les pages modifiées.',
      bouton: { libelle: 'Voir la demande à Claude', href: `/chaine/revision/${f.id}` },
      demande: { titre: `Corrections du modèle ${f.nom}`, texte: demandeCorrectionsModele(f, tickets(f)) },
    });
  }

  // 3. Relecture finale page par page (une relecture entamée d'abord)
  const relire = de('avis-humain').map((f) => ({ f, r: revisionDeFiche(e, f) })).filter((x) => !x.r.terminee);
  if (relire.length) {
    const { f, r } = relire[0];
    return fin({
      id: 'relire', etape: 3, qui: 'vous', secondaire: null,
      titre: `Relecture finale de ${guillemets(f.nom)} (${r.faites} / ${r.total})`,
      pourquoi: `La vérification automatique est passée. Une page à la fois (téléphone puis ordinateur) : « Page OK » ou « Il manque / à corriger », et les images se choisissent sur la page. Il reste ${pluriel(r.total - r.faites, 'page')} à voir.`,
      bouton: { libelle: 'Relire ce modèle', href: `/chaine/revision/${f.id}` },
    });
  }

  // 2. Corrections techniques du testeur à envoyer à Claude (validateur), une demande par modèle
  const techniques = retouches.filter((f) => !relus.has(f.id));
  if (validateur && techniques.length) {
    const f = techniques[0];
    const n = ticketsOuverts(tickets(f)).length;
    return fin({
      id: 'corrections', etape: 2, qui: 'claude', secondaire: presel,
      titre: `Envoyer les corrections techniques de ${guillemets(f.nom)} à Claude (${n})`,
      pourquoi: 'Le testeur a relevé des défauts techniques (lisibilité, débordements, liens…). Une seule demande les regroupe ; la version corrigée est revérifiée seule, puis part en relecture finale.',
      bouton: { libelle: 'Voir la demande à Claude', href: `/chaine/revision/${f.id}` },
      demande: { titre: `Corrections techniques du modèle ${f.nom}`, texte: demandeCorrectionsModele(f, tickets(f)) },
    });
  }

  // 2. Vérification bloquée (lancements sans résultat) ou lancement automatique indisponible : relancer depuis la fiche (validateur)
  const suivi = suiviTests(e, p.lances ?? [], p.maintenant ?? Date.now());
  const aRelancer = suivi.filter((s) => s.etat === 'bloque' || (p.lancementAuto === false && s.etat === 'a-lancer'));
  if (validateur && aRelancer.length) {
    const f = e.fiches.find((x) => x.id === aRelancer[0].modele)!;
    const bloque = aRelancer[0].etat === 'bloque';
    return fin({
      id: 'tester', etape: 2, qui: 'vous', secondaire: null,
      titre: `${bloque ? 'Relancer' : 'Lancer'} la vérification de ${guillemets(f.nom)}`,
      pourquoi: bloque
        ? `Le testeur a été lancé ${pluriel(aRelancer[0].essais, 'fois', 'fois')} sans résultat. Bouton « Lancer le test » de la fiche ; la chaîne avance seule ensuite.`
        : 'Le lancement automatique n’est pas disponible ici (GitHub non configuré). Bouton « Lancer le test » de la fiche ; la chaîne avance seule ensuite.',
      bouton: { libelle: 'Lancer le test', href: `/chaine/modele/${f.id}#fi-test` },
    });
  }

  // 1. Choisir : tant que la file d'attente de la vérification est courte
  const enVerif = e.fiches.filter((f) => etapeVisibleDuStatut(f.statut, relus.has(f.id)) === 'verification');
  if (gardes < CHAINE.maxVerification) {
    if (claude > 0 && !e.fiches.some((f) => f.statut !== 'ecarte')) {
      return fin({
        id: 'importer-claude', etape: 1, qui: 'vous', secondaire: presel,
        titre: `Importer les ${pluriel(claude, 'modèle proposé', 'modèles proposés')} par Claude`,
        pourquoi: 'Ils sont gardés d’un coup et partent seuls en vérification. Rien n’est publié : chacun passe la relecture finale.',
        bouton: { libelle: `Importer les ${claude} modèles de Claude`, action: 'importer-claude' },
      });
    }
    return fin({
      id: 'preselection', etape: 1, qui: 'vous', secondaire: null,
      titre: gardes ? `Choisir des designs (${pluriel(gardes, 'gardé')} en file)` : 'Choisir des designs',
      pourquoi: `Faites défiler les pages de 6 designs, touchez ceux qui vous plaisent puis « Garder ». Chaque design gardé part seul en vérification (${CHAINE.maxVerification} à la fois)${enVerif.length ? ` ; ${enVerif.length} en cours` : ''}.`,
      bouton: { libelle: gardes || enVerif.length ? 'Continuer à choisir' : 'Commencer à choisir', href: '/chaine/preselection' },
    });
  }

  // Rien à faire pour cette personne : ce qui tourne tout seul, expliqué, et de quoi avancer en attendant
  if (enVerif.length) {
    const f = [...enVerif].sort(proximite)[0];
    return fin({
      id: 'attendre', etape: 2, qui: f.statut === 'retouche' ? 'claude' : 'agent', secondaire: null,
      titre: `Vérification en cours (${enVerif.length}) · ${pluriel(gardes, 'gardé')} en file`,
      pourquoi: f.statut === 'retouche'
        ? `Paul envoie les corrections techniques de ${guillemets(f.nom)} à Claude ; la version corrigée est revérifiée seule. Les gardés suivants entrent en vérification dès qu’une place se libère.`
        : `Le testeur vérifie toutes les pages sur téléphone et ordinateur (10 à 15 min par design). La relecture finale s’ouvre dès son résultat ; les gardés suivants entrent en vérification dès qu’une place se libère.`,
      bouton: { libelle: 'Choisir d’autres designs', href: '/chaine/preselection' },
    });
  }
  if (retouches.length) {
    const f = retouches[0];
    return fin({
      id: 'attendre', etape: 3, qui: 'claude', secondaire: null,
      titre: `Corrections de ${guillemets(f.nom)} chez Claude`,
      pourquoi: 'Paul envoie les remarques à Claude ; la nouvelle version revient seule, revérifiée, pour revoir les pages modifiées. En attendant, choisissez d’autres designs.',
      bouton: presel,
    });
  }
  if (prets.length) {
    return fin({
      id: 'attendre', etape: 3, qui: 'paul', secondaire: null,
      titre: `${pluriel(prets.length, 'modèle attend', 'modèles attendent')} l’ajout au catalogue par Paul`,
      pourquoi: 'Vérification et relecture finale sont faites : Paul coche les profils et ajoute au catalogue. En attendant, choisissez d’autres designs.',
      bouton: presel,
    });
  }
  const publies = de('publie').length;
  return fin({
    id: publies ? 'pret' : 'preselection', etape: 1, qui: 'vous', secondaire: null,
    titre: publies ? `${pluriel(publies, 'modèle', 'modèles')} au catalogue : choisir le lot suivant` : `Choisir des designs (${pluriel(gardes, 'gardé')} en file)`,
    pourquoi: `Chaque design gardé suit le même chemin : vérification automatique, relecture finale, catalogue. ${gardes ? `${pluriel(gardes, 'gardé attend', 'gardés attendent')} une place en vérification (${CHAINE.maxVerification} à la fois).` : ''}`.trim(),
    bouton: presel,
  });
}

/** Rang dans la file de vérification (1 = prochain), null hors file */
export function rangDansLaFile(e: Pick<EtatChaine, 'fiches' | 'versions' | 'signaux'>, id: string): number | null {
  const k = fileVerification(e).findIndex((f) => f.id === id);
  return k < 0 ? null : k + 1;
}
