// PRATIQUES PAR PROFESSION (consigne de Paul du 2026-10-08 : « il y aura ensuite les ostéopathes, les kinés, etc. ») : données des
// profils de pratique (profils.ts) rattachées à une PROFESSION (dimension de premier niveau, registre professions.ts : même `id`,
// slug de la table professions). Tout ce qui dépend du métier est ici, en DONNÉES : thèmes proposés (libellés, sujet des visuels,
// « pour qui » du badge), activités précises (basket, tennis…, hashtags, soins à mettre en avant, recherches de photos), publics,
// profils de référence et vocabulaire. La logique (profils.ts, publication-recettes.ts) ne connaît aucun métier : un nouveau métier =
// une nouvelle entrée de PRATIQUES, sans toucher au code (vérifié par un métier fictif dans profils.test.ts).
//
// Textes : sobres, factuels, sans promesse (mémoire métier) ; posturologie et réflexologie exclues (thème « posture » différé,
// jamais dans un profil de référence : controlerPratique). Module pur.

import { THEMES, THEMES_AUTRES_PROFESSIONS } from './themes';

/** Thème d'une profession (sujet que le patient comprend) */
export type ThemePratique = {
  id: string;
  libelle: string;
  court: string;
  /** Sujet des visuels et des kits (kits-images.ts, kits-visuels.ts) */
  sujetVisuel: string;
  /** « pour qui » du badge des recettes : « Conçu pour la podologie du sport » */
  pour: string;
  /** Thème proposé (false : différé, jamais dans un profil) */
  actif: boolean;
  /** Soins du catalogue liés (ordre de représentativité) */
  soins: readonly string[];
};

/** Activité précise mise en avant (sport, loisir) : dimension des profils */
export type ActivitePratique = {
  id: string;
  libelle: string;
  /** Forme courte, en minuscules, pour les badges (« basket ») */
  court: string;
  /** Hashtags normalisés (hashtags.ts : FORME_HASHTAG) ; le premier est le hashtag principal (#basket) */
  hashtags: readonly string[];
  /** Thèmes de la profession où l'activité est proposée */
  themes: readonly string[];
  /** Scène dessinée du kit (sports.ts : ligne:sport-<x>, dessin:sport-<x>:pedagogique, picto) ; absent : aucune scène */
  scene?: string;
  /** Soins à mettre en avant d'abord, dans cet ordre (seulement parmi ceux cochés par le praticien) */
  soins: readonly string[];
  /** Recherches de photos (banques libres, en anglais) : pied, chaussure, appui, les plus précises d’abord (séries : series-photos-activites.ts) */
  requetes: readonly string[];
  /** Précision d'un prompt d'image (prompts-images.ts, ≤ 200 caractères) */
  precision: string;
};

export type PublicPratique = { id: string; libelle: string; /** Thèmes qui impliquent ce public */ themes: readonly string[] };

/** Profil de référence préconfiguré (Sport·basket, Diabète…) */
export type ProfilReference = {
  id: string;
  /** Nom court affiché (« Sport · basket ») */
  court: string;
  principal: string | null;
  secondaires: readonly string[];
  activites: readonly string[];
  publics: readonly string[];
};

export type PratiqueProfession = {
  /** Identifiant de la profession (professions.ts, table professions) */
  profession: string;
  /** Vocabulaire des écrans : aucun métier codé en dur dans la logique */
  vocabulaire: { metier: string; discipline: string; generaliste: string };
  themes: readonly ThemePratique[];
  activites: readonly ActivitePratique[];
  publics: readonly PublicPratique[];
  profils: readonly ProfilReference[];
};

// ---------------------------------------------------------------------------------------------------------------
// Pédicure-podologue (profession « podologue »)
// ---------------------------------------------------------------------------------------------------------------

const POUR_PODO: Record<string, string> = {
  sport: 'la podologie du sport', diabete: 'le pied diabétique', ongles: 'les soins des ongles', enfant: 'les pieds de l’enfant',
  senior: 'les pieds des seniors', semelles: 'les semelles orthopédiques', pedicurie: 'les soins de pédicurie', posture: 'la posture',
};

const COURSE = ['podologie-du-sport', 'douleur-talon', 'semelles-orthopediques', 'k-taping'] as const;
const PIVOT = ['podologie-du-sport', 'k-taping', 'semelles-orthopediques', 'douleur-talon'] as const;
const MARCHE = ['podologie-du-sport', 'semelles-orthopediques', 'douleur-talon'] as const;

const ACTIVITES_PODO: readonly ActivitePratique[] = [
  { id: 'course', libelle: 'Course à pied', court: 'course à pied', hashtags: ['course-a-pied', 'running'], themes: ['sport'], scene: 'course', soins: COURSE, requetes: ['running shoes road close up', 'runner feet asphalt stride', 'running shoe sole', 'runner legs morning road', 'running shoes road', 'runner feet'], precision: 'course à pied : chaussure de course, foulée sur route' },
  { id: 'trail', libelle: 'Trail', court: 'trail', hashtags: ['trail'], themes: ['sport'], scene: 'trail', soins: COURSE, requetes: ['trail running shoes rocky path', 'trail runner feet mountain', 'trail running shoes mud', 'trail runner downhill path', 'trail running shoes', 'trail runner path'], precision: 'trail : chaussure à crampons sur un sentier en pente' },
  { id: 'randonnee', libelle: 'Randonnée', court: 'randonnée', hashtags: ['randonnee', 'marche'], themes: ['sport', 'senior'], scene: 'randonnee', soins: MARCHE, requetes: ['hiking boots rocky path close up', 'hiker feet mountain trail', 'hiking boots trail', 'walking boots path'], precision: 'randonnée : chaussure montante sur un chemin' },
  { id: 'football', libelle: 'Football', court: 'foot', hashtags: ['football', 'foot'], themes: ['sport', 'enfant'], scene: 'football', soins: PIVOT, requetes: ['football boots grass', 'soccer cleats'], precision: 'football : chaussures à crampons moulés sur gazon, ballon' },
  { id: 'rugby', libelle: 'Rugby', court: 'rugby', hashtags: ['rugby'], themes: ['sport'], scene: 'rugby', soins: PIVOT, requetes: ['rugby boots grass', 'rugby ball field'], precision: 'rugby : chaussures à crampons vissés sur gazon, ballon ovale' },
  { id: 'basket', libelle: 'Basket', court: 'basket', hashtags: ['basket', 'basketball'], themes: ['sport', 'enfant'], scene: 'basket', soins: PIVOT, requetes: ['basketball sneakers court close up', 'basketball player jump shoes', 'basketball shoes hardwood floor', 'basketball player feet pivot', 'basketball shoes court', 'basketball sneakers', 'basketball court floor'], precision: 'basket : chaussures montantes sur un parquet de salle, réception de saut' },
  { id: 'tennis', libelle: 'Tennis et padel', court: 'tennis', hashtags: ['tennis', 'padel'], themes: ['sport'], scene: 'tennis', soins: PIVOT, requetes: ['tennis clay court shoes', 'tennis player feet baseline', 'tennis shoe close-up court', 'tennis footwork clay slide', 'tennis shoes court', 'padel court shoes'], precision: 'tennis : chaussures de tennis sur un court, appuis latéraux' },
  { id: 'handball', libelle: 'Handball', court: 'handball', hashtags: ['handball'], themes: ['sport'], scene: 'handball', soins: PIVOT, requetes: ['handball shoes indoor', 'indoor court shoes'], precision: 'handball : chaussures de salle, pivot sur l’avant-pied' },
  { id: 'danse', libelle: 'Danse', court: 'danse', hashtags: ['danse'], themes: ['sport', 'enfant'], scene: 'danse', soins: ['podologie-du-sport', 'k-taping', 'cors-durillons', 'ongle-incarne'], requetes: ['ballet shoes', 'ballet slippers floor'], precision: 'danse : chaussons de danse sur le parquet d’un studio' },
  { id: 'cyclisme', libelle: 'Cyclisme', court: 'cyclisme', hashtags: ['cyclisme', 'velo'], themes: ['sport'], scene: 'cyclisme', soins: ['podologie-du-sport', 'semelles-orthopediques', 'k-taping'], requetes: ['cycling shoes clipless pedal', 'road cyclist legs pedaling', 'gravel bike ride feet', 'cycling shoe cleat close up', 'cycling shoes pedal', 'road bike pedal'], precision: 'cyclisme : chaussure de vélo sur la pédale' },
  { id: 'ski', libelle: 'Ski', court: 'ski', hashtags: ['ski'], themes: ['sport'], scene: 'ski', soins: ['podologie-du-sport', 'semelles-orthopediques', 'cors-durillons'], requetes: ['ski boots snow', 'ski boot binding'], precision: 'ski : chaussures de ski dans la neige' },
  { id: 'golf', libelle: 'Golf', court: 'golf', hashtags: ['golf'], themes: ['sport', 'senior'], scene: 'golf', soins: MARCHE, requetes: ['golf shoes green grass', 'golfer feet stance', 'golf shoes close up fairway', 'golf shoes grass', 'golfer walking fairway', 'golf course walking'], precision: 'golf : chaussures de golf sur le gazon' },
  { id: 'natation', libelle: 'Natation', court: 'natation', hashtags: ['natation', 'piscine'], themes: ['sport', 'enfant', 'senior'], soins: ['podologie-du-sport', 'verrues-plantaires', 'mycose-ongles'], requetes: ['swimming pool edge', 'pool deck sandals'], precision: 'natation : bord de piscine, sandales de bain' },
  { id: 'gymnastique', libelle: 'Gymnastique', court: 'gymnastique', hashtags: ['gymnastique', 'gym'], themes: ['sport', 'enfant'], soins: ['podologie-du-sport', 'k-taping', 'verrues-plantaires'], requetes: ['gymnastics mat', 'gymnastics floor'], precision: 'gymnastique : tapis de gymnastique dans une salle' },
  { id: 'arts-martiaux', libelle: 'Arts martiaux', court: 'arts martiaux', hashtags: ['arts-martiaux', 'judo', 'karate'], themes: ['sport', 'enfant'], soins: ['podologie-du-sport', 'verrues-plantaires', 'k-taping'], requetes: ['martial arts tatami', 'judo mat'], precision: 'arts martiaux : tatami d’une salle de judo' },
  { id: 'equitation', libelle: 'Équitation', court: 'équitation', hashtags: ['equitation'], themes: ['sport'], soins: ['podologie-du-sport', 'cors-durillons', 'semelles-orthopediques'], requetes: ['riding boots stirrup', 'horse riding boots'], precision: 'équitation : botte d’équitation dans l’étrier' },
];

export const PRATIQUE_PODOLOGUE: PratiqueProfession = {
  profession: 'podologue',
  vocabulaire: { metier: 'pédicure-podologue', discipline: 'podologie', generaliste: 'un cabinet de podologie généraliste' },
  themes: THEMES.map((t) => ({ id: t.id, libelle: t.libelle, court: t.court, sujetVisuel: t.id, pour: POUR_PODO[t.id] ?? t.libelle.toLowerCase(), actif: t.statut === 'actif', soins: t.soins })),
  activites: ACTIVITES_PODO,
  publics: [
    { id: 'enfants', libelle: 'Enfants et adolescents', themes: ['enfant'] },
    { id: 'seniors', libelle: 'Seniors', themes: ['senior'] },
    { id: 'sportifs', libelle: 'Sportifs', themes: ['sport'] },
  ],
  profils: [
    { id: 'sport-course', court: 'Sport · course', principal: 'sport', secondaires: [], activites: ['course'], publics: ['sportifs'] },
    { id: 'sport-basket', court: 'Sport · basket', principal: 'sport', secondaires: [], activites: ['basket'], publics: ['sportifs'] },
    { id: 'sport-foot', court: 'Sport · foot', principal: 'sport', secondaires: [], activites: ['football'], publics: ['sportifs'] },
    { id: 'sport-tennis', court: 'Sport · tennis', principal: 'sport', secondaires: [], activites: ['tennis'], publics: ['sportifs'] },
    // Golf et cyclisme (2026-10-10, univers minimal) : activités déjà connues, profils de référence ajoutés
    { id: 'sport-golf', court: 'Sport · golf', principal: 'sport', secondaires: [], activites: ['golf'], publics: ['sportifs'] },
    { id: 'sport-cyclisme', court: 'Sport · cyclisme', principal: 'sport', secondaires: [], activites: ['cyclisme'], publics: ['sportifs'] },
    // « Sport · trail / randonnée » (2026-10-10) : même identifiant (recettes déjà rattachées), le trail rejoint la randonnée
    { id: 'sport-rando', court: 'Sport · trail / randonnée', principal: 'sport', secondaires: [], activites: ['randonnee', 'trail'], publics: ['sportifs'] },
    { id: 'diabete', court: 'Diabète', principal: 'diabete', secondaires: [], activites: [], publics: [] },
    { id: 'enfant', court: 'Enfant', principal: 'enfant', secondaires: [], activites: [], publics: ['enfants'] },
    { id: 'enfant-danse', court: 'Enfant · danse', principal: 'enfant', secondaires: [], activites: ['danse'], publics: ['enfants'] },
    { id: 'senior', court: 'Senior', principal: 'senior', secondaires: [], activites: [], publics: ['seniors'] },
    { id: 'ongles', court: 'Ongles', principal: 'ongles', secondaires: [], activites: [], publics: [] },
    { id: 'semelles', court: 'Semelles', principal: 'semelles', secondaires: [], activites: [], publics: [] },
    { id: 'generaliste', court: 'Généraliste', principal: null, secondaires: [], activites: [], publics: [] },
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Psychomotricien (profession « psychomotricien », EN PRÉPARATION : jamais proposée au public, onboarding-professions.ts)
// Données du pack (packages/contenus/professions/psychomotricien/pratique.ts, 90966aa), source unique ici : le pack les
// réexporte et les contrôle (controlerPackPsychomot). Thèmes : themes.ts (THEMES_AUTRES_PROFESSIONS) ; activités = médiations des
// séances (CSP R4332-1 3°) ; `scene` absent : aucune scène dessinée existante.
// ---------------------------------------------------------------------------------------------------------------

const SUJET_PSYCHOMOT: Record<string, string> = { graphomotricite: 'ecriture', 'sante-mentale': 'adultes' };
const POUR_PSYCHOMOT: Record<string, string> = {
  'petite-enfance': 'la petite enfance', apprentissages: 'les enfants', graphomotricite: 'le geste d’écrire', tnd: 'les troubles du neurodéveloppement',
  adolescents: 'les adolescents', adultes: 'les adultes', seniors: 'les personnes âgées', relaxation: 'la régulation du tonus et des émotions', 'sante-mentale': 'la santé mentale',
};

export const PRATIQUE_PSYCHOMOTRICIEN: PratiqueProfession = {
  profession: 'psychomotricien',
  vocabulaire: { metier: 'psychomotricien', discipline: 'psychomotricité', generaliste: 'un cabinet de psychomotricité' },
  themes: THEMES_AUTRES_PROFESSIONS.filter((t) => t.profession === 'psychomotricien').map((t) => ({
    id: t.id, libelle: t.libelle, court: t.court, sujetVisuel: SUJET_PSYCHOMOT[t.id] ?? t.id, pour: POUR_PSYCHOMOT[t.id] ?? t.libelle.toLowerCase(), actif: t.statut === 'actif', soins: t.soins,
  })),
  activites: [
    { id: 'jeu-moteur', libelle: 'Jeux et parcours de motricité', court: 'parcours moteur', hashtags: ['motricite', 'parcours-moteur'], themes: ['petite-enfance', 'apprentissages', 'tnd'],
      soins: ['maladresse-coordination', 'developpement-du-tout-petit'], requetes: ['children motor skills obstacle course mats', 'soft play foam blocks'],
      precision: 'parcours de motricité en mousse colorée dans une salle claire, sans enfant identifiable' },
    { id: 'motricite-fine', libelle: 'Motricité fine et construction', court: 'motricité fine', hashtags: ['motricite-fine'], themes: ['petite-enfance', 'apprentissages', 'graphomotricite', 'tnd'],
      soins: ['maladresse-coordination', 'graphomotricite'], requetes: ['child hands wooden blocks', 'hands stacking wooden shapes'],
      precision: 'mains d’enfant qui empilent des formes en bois sur une table claire, cadrage serré sur les mains' },
    { id: 'graphisme', libelle: 'Graphisme et écriture', court: 'graphisme', hashtags: ['graphomotricite', 'ecriture'], themes: ['graphomotricite', 'apprentissages', 'adolescents'],
      soins: ['graphomotricite'], requetes: ['child hand pencil drawing lines', 'pencil grip paper loops'],
      precision: 'main qui trace des boucles au crayon sur une grande feuille, cadrage sur la main et la feuille' },
    { id: 'equilibre-coordination', libelle: 'Équilibre et coordination', court: 'équilibre', hashtags: ['equilibre', 'coordination'], themes: ['apprentissages', 'seniors', 'tnd'],
      soins: ['equilibre-marche-age', 'maladresse-coordination'], requetes: ['balance beam low feet', 'feet walking on a line'],
      precision: 'pieds qui avancent sur une poutre basse ou une ligne au sol, vue de côté au ras du sol' },
    { id: 'relaxation', libelle: 'Relaxation et conscience du corps', court: 'relaxation', hashtags: ['relaxation', 'tonus'], themes: ['relaxation', 'adolescents', 'adultes'],
      soins: ['tonus-emotions-relaxation'], requetes: ['person lying on mat relaxation', 'hands resting on belly breathing'],
      precision: 'personne allongée sur un tapis, mains posées sur le ventre, tête hors cadre, lumière douce' },
    { id: 'rythme-expression', libelle: 'Rythme et expression corporelle', court: 'rythme', hashtags: ['rythme', 'expression-corporelle'], themes: ['petite-enfance', 'apprentissages', 'adolescents'],
      soins: ['espace-temps-schema-corporel', 'reeducation-psychomotrice'], requetes: ['hand drum rhythm', 'colorful scarves movement'],
      precision: 'petit tambourin et foulards colorés posés sur un tapis de salle de motricité' },
    { id: 'marche', libelle: 'Marche et déplacements', court: 'marche', hashtags: ['marche', 'autonomie'], themes: ['seniors'],
      soins: ['equilibre-marche-age'], requetes: ['older adult walking hallway handrail', 'senior feet walking indoor'],
      precision: 'pieds d’une personne âgée en chaussures fermées qui marche dans un couloir clair, main sur la rampe' },
  ],
  publics: [
    { id: 'bebes', libelle: 'Bébés et tout-petits', themes: ['petite-enfance'] },
    { id: 'enfants', libelle: 'Enfants', themes: ['apprentissages', 'graphomotricite', 'tnd'] },
    { id: 'adolescents', libelle: 'Adolescents', themes: ['adolescents'] },
    { id: 'adultes', libelle: 'Adultes', themes: ['adultes', 'relaxation'] },
    { id: 'personnes-agees', libelle: 'Personnes âgées', themes: ['seniors'] },
  ],
  profils: [
    { id: 'petite-enfance', court: 'Petite enfance', principal: 'petite-enfance', secondaires: ['tnd'], activites: ['jeu-moteur', 'rythme-expression'], publics: ['bebes'] },
    { id: 'enfant-apprentissages', court: 'Enfant · apprentissages', principal: 'apprentissages', secondaires: ['graphomotricite'], activites: ['jeu-moteur', 'motricite-fine'], publics: ['enfants'] },
    { id: 'ecriture', court: 'Écriture', principal: 'graphomotricite', secondaires: ['apprentissages'], activites: ['graphisme', 'motricite-fine'], publics: ['enfants', 'adolescents'] },
    { id: 'tnd-pco', court: 'TND · parcours PCO', principal: 'tnd', secondaires: ['petite-enfance', 'apprentissages'], activites: ['jeu-moteur', 'motricite-fine'], publics: ['bebes', 'enfants'] },
    { id: 'ados-adultes', court: 'Ados et adultes', principal: 'adolescents', secondaires: ['adultes', 'relaxation'], activites: ['relaxation'], publics: ['adolescents', 'adultes'] },
    { id: 'seniors', court: 'Personnes âgées', principal: 'seniors', secondaires: [], activites: ['equilibre-coordination', 'marche'], publics: ['personnes-agees'] },
    { id: 'generaliste', court: 'Généraliste', principal: null, secondaires: [], activites: [], publics: [] },
  ],
};

/** Pratiques connues, une par profession (même `id` que professions.ts) */
export const PRATIQUES: readonly PratiqueProfession[] = [PRATIQUE_PODOLOGUE, PRATIQUE_PSYCHOMOTRICIEN];
/** Profession par défaut (sites existants : podologie), identique à PROFESSION_PAR_DEFAUT de professions.ts */
export const PROFESSION_PRATIQUE_DEFAUT = 'podologue';

/** Pratique d'une profession ; inconnue → celle de la profession par défaut. `registre` : autre liste (tests, métier à venir) */
export const pratiqueDe = (profession: string | null | undefined, registre: readonly PratiqueProfession[] = PRATIQUES): PratiqueProfession =>
  registre.find((p) => p.profession === profession) ?? registre.find((p) => p.profession === PROFESSION_PRATIQUE_DEFAUT) ?? registre[0];

export const themePratique = (p: PratiqueProfession, id: string | null | undefined) => p.themes.find((t) => t.id === id);
export const activitePratique = (p: PratiqueProfession, id: string | null | undefined) => p.activites.find((a) => a.id === id);

/** Contrôle des données d'une pratique : identifiants uniques, renvois connus, hashtags normalisés, aucun thème différé dans un profil */
export function controlerPratique(p: PratiqueProfession): string[] {
  const e: string[] = [];
  const themes = new Set(p.themes.map((t) => t.id));
  const acts = new Set(p.activites.map((a) => a.id));
  const pubs = new Set(p.publics.map((x) => x.id));
  const doublons = (l: readonly string[], quoi: string) => { if (new Set(l).size !== l.length) e.push(`${p.profession} : ${quoi} en double.`); };
  doublons(p.themes.map((t) => t.id), 'thème');
  doublons(p.activites.map((a) => a.id), 'activité');
  doublons(p.profils.map((x) => x.id), 'profil');
  const forme = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])$/;
  for (const a of p.activites) {
    if (!a.hashtags.length || a.hashtags.some((h) => !forme.test(h))) e.push(`${p.profession} · ${a.id} : hashtags invalides.`);
    for (const t of a.themes) if (!themes.has(t)) e.push(`${p.profession} · ${a.id} : thème inconnu ${t}.`);
    if (a.precision.length > 200) e.push(`${p.profession} · ${a.id} : précision trop longue.`);
  }
  for (const x of p.profils) {
    if (!/^[a-z0-9-]{2,40}$/.test(x.id)) e.push(`${p.profession} · profil ${x.id} : identifiant invalide.`);
    for (const t of [x.principal, ...x.secondaires].filter((v): v is string => v !== null)) {
      const th = themePratique(p, t);
      if (!th) e.push(`${p.profession} · profil ${x.id} : thème inconnu ${t}.`);
      else if (!th.actif) e.push(`${p.profession} · profil ${x.id} : thème différé ${t}.`);
    }
    for (const a of x.activites) if (!acts.has(a)) e.push(`${p.profession} · profil ${x.id} : activité inconnue ${a}.`);
    for (const u of x.publics) if (!pubs.has(u)) e.push(`${p.profession} · profil ${x.id} : public inconnu ${u}.`);
  }
  return e;
}
