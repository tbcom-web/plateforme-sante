// Catalogue des univers de site : des sites « tout prêts » que le praticien choisit (« celui-là ») sans composer
// lui-même modèle, gamme, spécialité, registre, logo et contenus. Décision produit du 2026-10-05 (docs/univers.md).
//
// Un univers est un PRÉRÉGLAGE COMPLET du thème (modèle, gamme, spécialités, registre, style visuel, animation, logo,
// soins mis en avant, ordre des sections, jeu de photos) et des contenus proposés (thèmes d'articles, fiches
// conseils). Il ne touche jamais à l'identité du cabinet : nom, praticiens, adresse, horaires, rendez-vous, photos
// et logo du praticien (appliquerUnivers).
//
// À ne pas confondre avec l'« univers métier » (univers.ts : la profession, couche 2 de la charte). Un univers du
// catalogue se place au-dessus des couches 3 à 5 (spécialité, gamme, modèle) et les fixe ensemble.
//
// Sujets à faible niveau de preuve (posturologie, réflexologie, semelles « posturales »…) : jamais proposés dans
// un univers du catalogue tant qu'ils n'ont pas été validés sur le plan déontologique (statut « differe »).

import { MODELES_INTEGRES, SECTIONS_ACCUEIL, REGISTRES_MODELE, type ModeleManifeste, type SectionAccueil } from './modeles';
import { GAMMES } from './gammes';
import { SPECIALITES } from './packs';
import { marquesLogo, DISPOSITIONS_LOGO, type DispositionLogo } from './logos';
import { THEMES_FLUX, type ModeVisuel, type SiteDraft } from './draft';
import { controlerPublication, type ResultatControle } from './controles';
import type { Registre } from './dessins';

/**
 * Statut d'un univers :
 * - brouillon : en préparation, visible du super admin seulement ;
 * - valide : proposé aux praticiens dans le catalogue ;
 * - retire : n'est plus proposé (les sites qui l'utilisent le gardent) ;
 * - differe : sujet à faible niveau de preuve, proposé plus tard après validation déontologique ; ne peut pas être validé.
 */
export const STATUTS_UNIVERS = ['brouillon', 'valide', 'retire', 'differe'] as const;
export type StatutUnivers = (typeof STATUTS_UNIVERS)[number];
export const LIBELLES_STATUTS_UNIVERS: Record<StatutUnivers, string> = {
  brouillon: 'Brouillon',
  valide: 'Validé pour le catalogue',
  retire: 'Retiré',
  differe: 'Plus tard (validation déontologique)',
};

export type ThemeFlux = (typeof THEMES_FLUX)[number];

/** Sujets de fiches conseils pour les patients (contenus rédigés plus tard, relus comme les fiches de soins) */
export const SUJETS_FICHES_CONSEILS = [
  { id: 'premier-rendez-vous', titre: 'Le premier rendez-vous : ce qu’il faut apporter' },
  { id: 'coupe-ongles', titre: 'Couper ses ongles sans favoriser l’ongle incarné' },
  { id: 'cors-durillons', titre: 'Cors et durillons : ce qu’il vaut mieux ne pas faire soi-même' },
  { id: 'hydratation-pieds', titre: 'Hydrater la peau des pieds, sans crème entre les orteils' },
  { id: 'semelles-entretien', titre: 'Semelles orthopédiques : entretien et renouvellement' },
  { id: 'diabete-examen-quotidien', titre: 'Pied diabétique : examiner ses pieds chaque jour, et ce qu’on y cherche' },
  { id: 'diabete-chaussage', titre: 'Pied diabétique : chaussures et chaussettes' },
  { id: 'diabete-signes-alerte', titre: 'Pied diabétique : les signes qui font consulter sans attendre' },
  { id: 'diabete-prise-en-charge', titre: 'Pied diabétique : grade de risque et prise en charge des séances' },
  { id: 'enfant-chaussage', titre: 'Chausser son enfant : pointure, maintien, premières chaussures' },
  { id: 'enfant-marche', titre: 'La marche de l’enfant selon l’âge : ce qui est habituel' },
  { id: 'verrues-plantaires', titre: 'Verrues plantaires : contagion, piscine, quand consulter' },
  { id: 'course-chaussures', titre: 'Chaussures de course : choisir et renouveler' },
  { id: 'course-reprise', titre: 'Reprendre la course progressivement' },
  { id: 'course-preparer-pieds', titre: 'Préparer ses pieds avant une course longue' },
  { id: 'senior-chutes', titre: 'Pieds, chaussage et prévention des chutes après 65 ans' },
] as const;
export type SujetFicheConseil = (typeof SUJETS_FICHES_CONSEILS)[number]['id'];

/** Préréglage complet appliqué au thème et aux contenus du site */
export type PreReglageUnivers = {
  /** Identifiant du modèle (fiche ModeleManifeste) */
  modele: string;
  /** Gamme de couleurs (GAMMES) */
  gamme: string;
  specialite: string;
  /** '' = aucune */
  specialiteSecondaire: string;
  registre: Registre;
  modeVisuel: ModeVisuel;
  /** Animation d'accueil (celle de la spécialité principale) */
  animation: boolean;
  logo: { marque: string; disposition: DispositionLogo };
  /** Soins du catalogue à présenter en premier, dans cet ordre */
  soinsEnAvant: string[];
  /** Ordre des sections de l'accueil (permutation de celles du modèle) ; absent : ordre du modèle */
  sections?: SectionAccueil[];
  /**
   * Jeu de photos (table jeux_photos) ; '' = tirage au hasard parmi les jeux partagés de la spécialité au moment de
   * l'enregistrement (lib/jeux-photos.ts de l'admin), à défaut photos intégrées de la spécialité.
   */
  jeuPhotos: string;
  /** Thèmes d'articles du flux cochés par défaut */
  themesFlux: ThemeFlux[];
  /** Fiches conseils proposées */
  fichesConseils: SujetFicheConseil[];
};

export type Univers = {
  /** Identifiant stable (minuscules, chiffres, tirets) */
  id: string;
  nom: string;
  /** Pour qui : une ligne factuelle, montrée sous la vignette du catalogue */
  pourQui: string;
  /** Pourquoi ce préréglage (revue graphiste), une ligne, pour l'admin */
  justification: string;
  statut: StatutUnivers;
  /** Validé par (e-mail de l'admin) et date ISO : posés par « Valider pour le catalogue » (table univers_statuts) */
  validePar?: string;
  valideLe?: string;
  /** Raison du statut « differe » ou « retire » */
  motif?: string;
  /** Revue détaillée faite (peaufiné modèle par modèle) ; sinon brouillon sommaire */
  revu: boolean;
  preReglage: PreReglageUnivers;
};

export const CATALOGUE_UNIVERS: Univers[] = [
  {
    id: 'podologie-generale',
    nom: 'Podologie générale',
    pourQui: 'Cabinet de ville qui reçoit tous les publics : soins, semelles, bilans.',
    justification: 'Proximité (titre + illustration, grotesque nette) en canard, podoscope animé : le site de référence, clair et factuel, sans orientation marquée.',
    statut: 'brouillon',
    revu: false,
    preReglage: {
      modele: 'proximite',
      gamme: 'canard',
      specialite: 'generale',
      specialiteSecondaire: '',
      registre: 'releve',
      modeVisuel: 'illustrations',
      animation: true,
      logo: { marque: 'empreinte', disposition: 'horizontale' },
      soinsEnAvant: ['soins-de-pedicurie', 'bilan-podologique', 'semelles-orthopediques', 'ongle-incarne', 'cors-durillons'],
      jeuPhotos: '',
      themesFlux: ['Prévention', 'Saison', 'Actualité de la profession'],
      fichesConseils: ['premier-rendez-vous', 'coupe-ongles', 'cors-durillons', 'semelles-entretien'],
    },
  },
  {
    id: 'pied-diabetique',
    nom: 'Pied diabétique et soins',
    pourQui: 'Cabinet qui suit des patients diabétiques et âgés : dépistage, soins, prévention des plaies.',
    justification:
      'Proximité en registre pédagogique (texte 18 px, schémas calmes, aucune lecture de pression rouge) en ardoise : l’accueil montre le dépistage au monofilament ; soins du diabète, repères (conventionnement, accès PMR, domicile) puis « premier rendez-vous » viennent avant le reste.',
    statut: 'brouillon',
    revu: true,
    preReglage: {
      modele: 'proximite',
      gamme: 'ardoise',
      specialite: 'diabete',
      specialiteSecondaire: 'soins',
      registre: 'pedagogique',
      modeVisuel: 'illustrations',
      animation: false,
      logo: { marque: 'empreinte', disposition: 'horizontale' },
      // Cors et durillons avant l'ongle incarné : lésions à montrer rapidement chez le diabétique (ameli.fr, « Suivi des pieds
      // du diabétique ») ; l'ongle incarné reste accessible par le bloc « À lire aussi » de la pédicurie.
      soinsEnAvant: ['pied-diabetique', 'soins-de-pedicurie', 'cors-durillons', 'podologie-du-senior', 'semelles-orthopediques'],
      sections: ['competences', 'faits', 'etapes', 'faq', 'praticiens', 'acces', 'panorama', 'galerie', 'actualites'],
      jeuPhotos: '',
      themesFlux: ['Diabète', 'Prévention', 'Seniors'],
      fichesConseils: ['diabete-examen-quotidien', 'diabete-chaussage', 'diabete-signes-alerte', 'diabete-prise-en-charge', 'coupe-ongles'],
    },
  },
  {
    id: 'podologie-enfant',
    nom: 'Podologie de l’enfant',
    pourQui: 'Cabinet qui reçoit beaucoup d’enfants et leurs parents : marche, croissance, chaussage.',
    justification: 'Zen (formes très arrondies, typographie légère) en canard, animation des premiers pas : doux pour les parents, sans infantiliser.',
    statut: 'brouillon',
    revu: false,
    preReglage: {
      modele: 'zen',
      gamme: 'canard',
      specialite: 'enfant',
      specialiteSecondaire: 'generale',
      registre: 'releve',
      modeVisuel: 'illustrations',
      animation: true,
      logo: { marque: 'empreinte', disposition: 'horizontale' },
      soinsEnAvant: ['podologie-enfant', 'bilan-podologique', 'semelles-orthopediques', 'verrues-plantaires'],
      jeuPhotos: '',
      themesFlux: ['Enfants', 'Prévention', 'Saison'],
      fichesConseils: ['enfant-chaussage', 'enfant-marche', 'verrues-plantaires', 'premier-rendez-vous'],
    },
  },
  {
    id: 'podologie-sport',
    nom: 'Podologie du sport',
    pourQui: 'Cabinet qui suit des coureurs et des sportifs : foulée, semelles de sport, prévention des blessures.',
    justification:
      'Médical premium (bleu nuit, plans « laboratoire ») en cobalt, schéma de la chaussure sur plan d’architecte et marque « semelle de course » : le langage du laboratoire d’analyse, avec le soin du sport, les semelles et le bilan en tête.',
    statut: 'brouillon',
    revu: true,
    preReglage: {
      modele: 'premium',
      gamme: 'cobalt',
      specialite: 'sport',
      specialiteSecondaire: 'generale',
      registre: 'releve',
      modeVisuel: 'illustrations',
      // Dessin « sport » (chaussure, force de réaction du sol, drop) plutôt que le coureur animé : dans l'accueil
      // scindé de Médical premium, le coureur est rogné par la carte d'adresse (composant signalé, docs/univers.md).
      animation: false,
      logo: { marque: 'semelle-sport', disposition: 'horizontale' },
      soinsEnAvant: ['podologie-du-sport', 'semelles-orthopediques', 'bilan-podologique', 'douleur-talon', 'k-taping'],
      sections: ['competences', 'faits', 'praticiens', 'panorama', 'etapes', 'actualites', 'galerie', 'acces', 'faq'],
      jeuPhotos: '',
      themesFlux: ['Sport', 'Prévention', 'Saison'],
      fichesConseils: ['course-chaussures', 'course-reprise', 'course-preparer-pieds', 'semelles-entretien'],
    },
  },
  {
    id: 'posture-biomecanique',
    nom: 'Posture et biomécanique',
    pourQui: 'Cabinet orienté analyse de la marche et examen sur plateforme.',
    justification: 'Médical premium en encre, trajet du centre de pression : technique et précis.',
    statut: 'differe',
    motif: 'Sujet à faible niveau de preuve (posturologie) : proposé plus tard, après validation déontologique (décision de Paul, 2026-10-05).',
    revu: false,
    preReglage: {
      modele: 'premium',
      gamme: 'encre',
      specialite: 'posture',
      specialiteSecondaire: 'generale',
      registre: 'releve',
      modeVisuel: 'illustrations',
      animation: true,
      logo: { marque: 'appuis', disposition: 'horizontale' },
      soinsEnAvant: ['bilan-podologique', 'semelles-orthopediques', 'posturologie'],
      jeuPhotos: '',
      themesFlux: ['Prévention', 'Actualité de la profession'],
      fichesConseils: ['premier-rendez-vous', 'semelles-entretien'],
    },
  },
  {
    id: 'zen-bien-etre',
    nom: 'Zen, confort du pied',
    pourQui: 'Cabinet qui met en avant les soins de pédicurie et le confort au quotidien.',
    justification:
      'Zen (pastel, arrondis) en sable, semelle en courbes de niveau, marque « rubans » : apaisant, centré sur la pédicurie et le chaussage, sans promesse ni pratique non validée.',
    statut: 'brouillon',
    revu: false,
    preReglage: {
      modele: 'zen',
      gamme: 'sable',
      specialite: 'soins',
      specialiteSecondaire: 'generale',
      registre: 'releve',
      modeVisuel: 'illustrations',
      animation: true,
      logo: { marque: 'rubans', disposition: 'horizontale' },
      soinsEnAvant: ['soins-de-pedicurie', 'ongle-incarne', 'verrues-plantaires', 'semelles-orthopediques', 'mycose-ongles'],
      jeuPhotos: '',
      themesFlux: ['Saison', 'Prévention'],
      fichesConseils: ['hydratation-pieds', 'cors-durillons', 'coupe-ongles', 'premier-rendez-vous'],
    },
  },
  {
    id: 'simple-rassurant',
    nom: 'Simple et rassurant',
    pourQui: 'Cabinet de village ou patientèle âgée : téléphone visible, gros caractères, photo du lieu.',
    justification: 'Modèle « Simple et pédagogique » (photo du lieu, Nunito, registre pédagogique) en sauge, sans animation, photos du lieu en mélange : la clarté avant tout.',
    statut: 'brouillon',
    revu: false,
    preReglage: {
      modele: 'simple',
      gamme: 'sauge',
      specialite: 'generale',
      specialiteSecondaire: 'soins',
      registre: 'pedagogique',
      modeVisuel: 'mixte',
      animation: false,
      logo: { marque: 'empreinte', disposition: 'horizontale' },
      soinsEnAvant: ['soins-de-pedicurie', 'podologie-du-senior', 'pied-diabetique', 'semelles-orthopediques', 'soins-a-domicile'],
      jeuPhotos: '',
      themesFlux: ['Seniors', 'Prévention', 'Saison'],
      fichesConseils: ['premier-rendez-vous', 'senior-chutes', 'coupe-ongles', 'hydratation-pieds'],
    },
  },
  // Gabarits « tableau » et « village » (2026-10-05) : options nouvelles, les univers ci-dessus ne changent pas (docs/univers.md).
  {
    id: 'clair-pratique',
    nom: 'Clair et pratique',
    pourQui: 'Cabinet de ville ou maison de santé, patients qui consultent sur téléphone : tout l’utile en un coup d’œil.',
    justification: 'Gabarit « Tableau » (cartes arrondies, bulles de navigation, Geist) en cobalt et abricot (gamme vitaminée), dessins au trait continu, sans animation : moderne et sobre, une idée par carte.',
    statut: 'brouillon',
    revu: false,
    preReglage: {
      modele: 'tableau',
      gamme: 'cobalt-abricot',
      specialite: 'generale',
      specialiteSecondaire: '',
      registre: 'ligne',
      modeVisuel: 'illustrations',
      animation: false,
      logo: { marque: 'empreinte', disposition: 'horizontale' },
      soinsEnAvant: ['bilan-podologique', 'soins-de-pedicurie', 'semelles-orthopediques', 'ongle-incarne', 'orthonyxie'],
      jeuPhotos: '',
      themesFlux: ['Prévention', 'Saison', 'Actualité de la profession'],
      fichesConseils: ['premier-rendez-vous', 'coupe-ongles', 'cors-durillons', 'semelles-entretien'],
    },
  },
  {
    id: 'simple-proche',
    nom: 'Simple et proche',
    pourQui: 'Petit cabinet de quartier ou de bourg, patientèle âgée : le plan, le téléphone et les horaires d’abord.',
    justification: 'Gabarit « Village » (une colonne, texte de 20 px, Public Sans, deux gros boutons, plan tiré des vraies rues) en tournesol et ardoise (gamme vitaminée), schémas pédagogiques, sans animation.',
    statut: 'brouillon',
    revu: false,
    preReglage: {
      modele: 'village',
      gamme: 'tournesol',
      specialite: 'generale',
      specialiteSecondaire: 'soins',
      registre: 'pedagogique',
      modeVisuel: 'illustrations',
      animation: false,
      logo: { marque: 'empreinte', disposition: 'horizontale' },
      soinsEnAvant: ['soins-de-pedicurie', 'pied-diabetique', 'podologie-du-senior', 'ongles-epais', 'semelles-orthopediques'],
      jeuPhotos: '',
      themesFlux: ['Seniors', 'Prévention', 'Diabète'],
      fichesConseils: ['premier-rendez-vous', 'senior-chutes', 'diabete-examen-quotidien', 'coupe-ongles'],
    },
  },
  // Gabarit « revue » (2026-10-05) : option nouvelle, les univers ci-dessus ne changent pas (docs/univers.md).
  {
    id: 'elegant-sobre',
    nom: 'Élégant et sobre',
    pourQui: 'Cabinet discret, en centre-ville ou en exercice seul : une présentation soignée, sans effet, facile à lire.',
    justification: 'Gabarit « Revue » (titres Bodoni Moda, texte Newsreader, papier blanc cassé, colonnes de journal, filets fins) en mangue et encre (gamme vitaminée), un seul dessin au trait continu, sans animation.',
    statut: 'brouillon',
    revu: false,
    preReglage: {
      modele: 'revue',
      gamme: 'mangue',
      specialite: 'generale',
      specialiteSecondaire: '',
      registre: 'ligne',
      modeVisuel: 'illustrations',
      animation: false,
      logo: { marque: 'empreinte', disposition: 'horizontale' },
      soinsEnAvant: ['bilan-podologique', 'semelles-orthopediques', 'soins-de-pedicurie', 'pied-diabetique', 'cors-durillons'],
      jeuPhotos: '',
      themesFlux: ['Prévention', 'Saison', 'Actualité de la profession'],
      fichesConseils: ['premier-rendez-vous', 'coupe-ongles', 'cors-durillons', 'semelles-entretien'],
    },
  },
];

export const universCatalogue = (id: string | undefined | null) => CATALOGUE_UNIVERS.find((u) => u.id === id);

/** Univers montrés aux praticiens : validés seulement */
export const universProposables = (liste: Univers[] = CATALOGUE_UNIVERS) => liste.filter((u) => u.statut === 'valide');

// ---- Sujets à faible niveau de preuve ----

/** Soins et spécialités jamais proposés par un univers du catalogue tant qu'ils ne sont pas validés */
export const SOINS_FAIBLE_PREUVE = ['posturologie'] as const;
export const SPECIALITES_FAIBLE_PREUVE = ['posture'] as const;
/** Mots qui signalent un sujet à faible niveau de preuve dans un texte d'univers (nom, pour qui, fiches) */
export const MOTS_FAIBLE_PREUVE = /posturo|r[ée]flexo|semelles? posturales?|proprioceptiv|reprogrammation/i;

const ID = /^[a-z0-9-]{3,40}$/;

/**
 * Contrôle d'un univers : chaque valeur du préréglage existe (modèle, gamme, spécialités, marque, soins, sections,
 * thèmes, fiches) et aucun sujet à faible niveau de preuve n'est proposé hors statut « differe ».
 * `modeles` : identifiants des modèles disponibles (intégrés par défaut, l'admin y ajoute les importés) ;
 * `sectionsDe` : sections d'un modèle importé.
 */
export function validerUnivers(
  u: Univers,
  opts: { modeles?: readonly ModeleManifeste[]; soinsConnus?: readonly string[] } = {},
): string[] {
  const e: string[] = [];
  const p = u.preReglage;
  const modeles = opts.modeles ?? MODELES_INTEGRES;
  if (!ID.test(u.id)) e.push('« id » : 3 à 40 caractères (minuscules, chiffres, tirets).');
  if (!u.nom.trim() || u.nom.length > 60) e.push('« nom » : obligatoire, 60 caractères maximum.');
  if (!u.pourQui.trim() || u.pourQui.length > 120) e.push('« pour qui » : une ligne de 120 caractères maximum.');
  if (!(STATUTS_UNIVERS as readonly string[]).includes(u.statut)) e.push(`Statut inconnu : ${u.statut}.`);
  const modele = modeles.find((m) => m.id === p.modele);
  if (!modele) e.push(`Modèle inconnu : ${p.modele}.`);
  if (!GAMMES.some((g) => g.id === p.gamme)) e.push(`Gamme inconnue : ${p.gamme}.`);
  if (!SPECIALITES.some((s) => s.value === p.specialite)) e.push(`Spécialité inconnue : ${p.specialite}.`);
  if (p.specialiteSecondaire && (p.specialiteSecondaire === p.specialite || !SPECIALITES.some((s) => s.value === p.specialiteSecondaire))) {
    e.push(`Spécialité secondaire invalide : ${p.specialiteSecondaire}.`);
  }
  if (!REGISTRES_MODELE.includes(p.registre)) e.push(`Registre inconnu : ${p.registre}.`);
  if (!['illustrations', 'photos', 'mixte'].includes(p.modeVisuel)) e.push(`Style visuel inconnu : ${p.modeVisuel}.`);
  if (!marquesLogo().some((m) => m.id === p.logo.marque)) e.push(`Marque de logo inconnue : ${p.logo.marque}.`);
  if (!DISPOSITIONS_LOGO.some((d) => d.id === p.logo.disposition)) e.push(`Disposition de logo inconnue : ${p.logo.disposition}.`);
  if (!p.soinsEnAvant.length) e.push('Au moins un soin à mettre en avant.');
  if (new Set(p.soinsEnAvant).size !== p.soinsEnAvant.length) e.push('Un soin mis en avant apparaît deux fois.');
  const soinsConnus = opts.soinsConnus;
  for (const s of p.soinsEnAvant) {
    if (!/^[a-z0-9-]{1,80}$/.test(s)) e.push(`Soin mis en avant invalide : ${s}.`);
    else if (soinsConnus && !soinsConnus.includes(s)) e.push(`Soin absent du catalogue : ${s}.`);
  }
  if (p.sections && modele && !sectionsCompatibles(modele, p.sections)) {
    e.push(`Ordre des sections : il doit reprendre exactement les sections du modèle « ${modele.id} » (${modele.accueil.sections.join(', ')}).`);
  }
  if (p.animation && !SPECIALITES.find((s) => s.value === p.specialite)?.animation) e.push('Animation demandée, mais la spécialité principale n’en a pas.');
  if (p.jeuPhotos && !/^[0-9a-f-]{36}$/.test(p.jeuPhotos)) e.push('Jeu de photos : identifiant de la table jeux_photos attendu (ou vide).');
  for (const t of p.themesFlux) if (!(THEMES_FLUX as readonly string[]).includes(t)) e.push(`Thème d’articles inconnu : ${t}.`);
  for (const f of p.fichesConseils) if (!SUJETS_FICHES_CONSEILS.some((s) => s.id === f)) e.push(`Fiche conseil inconnue : ${f}.`);

  // Sujets à faible niveau de preuve : seulement dans un univers « differe » (proposé plus tard).
  if (u.statut !== 'differe') {
    const faibles = [
      ...p.soinsEnAvant.filter((s) => (SOINS_FAIBLE_PREUVE as readonly string[]).includes(s)),
      ...[p.specialite, p.specialiteSecondaire].filter((s) => (SPECIALITES_FAIBLE_PREUVE as readonly string[]).includes(s)),
      ...[u.nom, u.pourQui, ...p.fichesConseils.map((f) => SUJETS_FICHES_CONSEILS.find((s) => s.id === f)?.titre ?? '')].filter((t) => MOTS_FAIBLE_PREUVE.test(t)),
    ];
    if (faibles.length) e.push(`Sujet à faible niveau de preuve, à proposer plus tard après validation déontologique : ${faibles.join(', ')}.`);
  }
  return e;
}

/** L'ordre demandé reprend-il exactement les sections du modèle (même ensemble, sans doublon) ? */
export function sectionsCompatibles(m: Pick<ModeleManifeste, 'accueil'>, sections: unknown): sections is SectionAccueil[] {
  if (!Array.isArray(sections) || sections.length !== m.accueil.sections.length) return false;
  const attendues = new Set<string>(m.accueil.sections);
  return new Set(sections).size === sections.length && sections.every((s) => attendues.has(s));
}

/**
 * Modèle effectivement rendu pour un site : ordre des sections et registre posés par l'univers, s'ils sont
 * compatibles avec la fiche. Le SEO ne change pas : l'ensemble des sections (et donc des intertitres) est le même.
 */
export function modeleDuSite(m: ModeleManifeste, t: { sections?: unknown; registre?: unknown } | null | undefined): ModeleManifeste {
  if (!t) return m;
  const sections = sectionsCompatibles(m, t.sections) ? t.sections : null;
  const registre = REGISTRES_MODELE.includes(t.registre as Registre) ? (t.registre as Registre) : null;
  if (!sections && !registre) return m;
  // Registre pédagogique : ni trame ni plan (docs/charte-graphique.md, « Deux registres ») ; texture des sections retirée.
  const jetons = registre ? { ...m.jetons, registre, ...(registre === 'pedagogique' ? { motif: 'aucun' as const } : {}) } : m.jetons;
  return { ...m, accueil: sections ? { ...m.accueil, sections: [...sections] } : m.accueil, jetons };
}

/** Soins du site dans l'ordre : ceux mis en avant d'abord (dans leur ordre), puis les autres dans l'ordre reçu. */
export function ordonnerSoins<T extends { slug: string }>(soins: T[], enAvant: readonly string[] | undefined): T[] {
  if (!enAvant?.length) return soins;
  const rang = (slug: string) => { const i = enAvant.indexOf(slug); return i < 0 ? enAvant.length : i; };
  return soins.map((s, i) => ({ s, i })).sort((a, b) => rang(a.s.slug) - rang(b.s.slug) || a.i - b.i).map((x) => x.s);
}

export type ResultatUnivers = {
  draft: SiteDraft;
  /** Contrôle de publication du résultat (identité incomplète, etc.) */
  controle: ResultatControle;
  /** Défauts de l'univers lui-même (préréglage invalide, statut non proposable) */
  erreurs: string[];
  /** Soins mis en avant que le cabinet n'a pas cochés : à proposer (jamais cochés d'office, chaque soin crée une page) */
  soinsACocher: string[];
};

/**
 * Applique un univers à un brouillon. Fonction pure.
 * - Pose tout le préréglage du thème (modèle, gamme, spécialités, registre, style visuel, animation, marque du logo,
 *   soins mis en avant, ordre des sections) et les contenus proposés (thèmes d'articles, fiches conseils).
 * - Ne touche jamais à l'identité : cabinet, lieux et horaires, praticiens (et leurs photos), rendez-vous, accès,
 *   paiements, photos du cabinet, logo envoyé par le praticien (logoPerso), soins cochés, textes personnalisés,
 *   mode de réception des articles (manuel / automatique : un consentement, pas un style).
 * - Jeu de photos : celui de l'univers s'il en fixe un ; sinon conservé si la spécialité principale ne change pas,
 *   sinon vidé ('') pour que le serveur tire un jeu partagé de la nouvelle spécialité (jeuPhotosAEnregistrer).
 * `opts.autoriserNonValide` : aperçu et préparation par le super admin (brouillon, differe).
 */
export function appliquerUnivers(
  d: SiteDraft,
  u: Univers,
  opts: { modeles?: readonly ModeleManifeste[]; soinsConnus?: readonly string[]; autoriserNonValide?: boolean } = {},
): ResultatUnivers {
  const p = u.preReglage;
  const erreurs = validerUnivers(u, opts);
  if (!opts.autoriserNonValide && u.statut !== 'valide') erreurs.push(`L’univers « ${u.nom} » n’est pas proposé aux praticiens (${LIBELLES_STATUTS_UNIVERS[u.statut]}).`);
  const gamme = GAMMES.find((g) => g.id === p.gamme);
  const jeuPhotos = p.jeuPhotos || (d.theme.specialite === p.specialite ? d.theme.jeuPhotos : '');
  const draft: SiteDraft = {
    ...d,
    theme: {
      ...d.theme,
      couleur: gamme?.accent ?? d.theme.couleur,
      modele: p.modele,
      gamme: p.gamme,
      specialite: p.specialite,
      specialiteSecondaire: p.specialiteSecondaire,
      modeVisuel: p.modeVisuel,
      animation: p.animation,
      logo: { ...p.logo },
      // logoPerso : jamais modifié (le logo du praticien reste prioritaire sur la marque proposée).
      jeuPhotos,
      univers: u.id,
      soinsEnAvant: [...p.soinsEnAvant],
      sections: p.sections ? [...p.sections] : undefined,
      registre: p.registre,
    },
    flux: { ...d.flux, themes: [...p.themesFlux] },
    fichesConseils: [...p.fichesConseils],
  };
  if (!p.sections) delete draft.theme.sections;
  return {
    draft,
    controle: controlerPublication(draft),
    erreurs,
    soinsACocher: p.soinsEnAvant.filter((s) => !d.soins.includes(s)),
  };
}

/** Statut enregistré par l'admin (table univers_statuts) appliqué à l'univers du code */
export type LigneStatutUnivers = { id: string; statut: string; valide_par: string | null; valide_le: string | null };
export function avecStatut(u: Univers, ligne: LigneStatutUnivers | null | undefined): Univers {
  // Un univers « differe » le reste tant que le code ne le change pas : la base ne peut pas le valider.
  if (!ligne || u.statut === 'differe' || !(STATUTS_UNIVERS as readonly string[]).includes(ligne.statut) || ligne.statut === 'differe') return u;
  return { ...u, statut: ligne.statut as StatutUnivers, validePar: ligne.valide_par ?? undefined, valideLe: ligne.valide_le ?? undefined };
}
