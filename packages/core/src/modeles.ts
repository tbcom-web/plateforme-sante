// Modèles de présentation des sites.
//
// Un modèle ne contient AUCUN code : c'est une fiche (JSON) qui combine des sections déjà développées
// et testées, et règle polices, arrondis et couleurs. Tout ce qui compte pour le référencement
// (adresses des pages, title, description, H1, données structurées, sitemap, llms.txt, liens internes)
// est produit par le moteur et ne dépend jamais du modèle : changer de modèle ne change pas le SEO.

export const SECTIONS_ACCUEIL = ['faits', 'competences', 'panorama', 'praticiens', 'galerie', 'actualites', 'acces', 'faq'] as const;
export type SectionAccueil = (typeof SECTIONS_ACCUEIL)[number];

export const POLICES_TITRES = ['inter', 'manrope', 'fraunces', 'instrument'] as const;
export type PoliceTitres = (typeof POLICES_TITRES)[number];
export const POLICES_TEXTE = ['inter', 'manrope'] as const;
export type PoliceTexte = (typeof POLICES_TEXTE)[number];

export type ModeleManifeste = {
  /** Identifiant stable (minuscules, chiffres, tirets) */
  id: string;
  nom: string;
  description: string;
  version: number;
  /** En-tête : opaque, ou transparent sur l'image d'accueil puis opaque au défilement */
  entete: 'opaque' | 'transparent';
  accueil: {
    /** diaporama plein écran, photo unique plein écran, ou titre + photo côte à côte */
    hero: 'diaporama' | 'plein' | 'scinde';
    /** Assombrissement de l'image d'accueil pour la lisibilité du titre (0 à 90 %) */
    voile: number;
    /** Ordre des sections sous l'en-tête d'accueil */
    sections: SectionAccueil[];
  };
  competences: 'liste' | 'cartes';
  /** Pied de page : sombre (encre), à la couleur du cabinet, ou clair */
  pied: 'sombre' | 'accent' | 'clair';
  /** Apparition des sections au défilement */
  animations: 'douces' | 'aucune';
  /** Couleur proposée au praticien quand il choisit ce modèle (#rrggbb), facultatif */
  couleurConseillee?: string;
  jetons: {
    policeTitres: PoliceTitres;
    policeTexte: PoliceTexte;
    /** Graisse des titres (300 à 800) */
    graisseTitres: number;
    /** Arrondi des cartes et images, en px (0 à 40) */
    rayon: number;
    /** Forme des boutons */
    boutons: 'pilule' | 'arrondi' | 'carre';
    /** « couleur » : boutons à la couleur du cabinet ; « encre » : boutons bleu nuit */
    accent: 'couleur' | 'encre';
    /** Fond des pages (#rrggbb) */
    fond: string;
    /** Fond des sections alternées (#rrggbb), facultatif (sinon teinte de la couleur du cabinet) */
    fondDoux?: string;
  };
};

const TOUTES = [...SECTIONS_ACCUEIL];

export const MODELES_INTEGRES: ModeleManifeste[] = [
  {
    id: 'proximite',
    nom: 'Proximité',
    description: 'Clair et factuel, aux couleurs du cabinet. Titre et photo côte à côte.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: TOUTES },
    competences: 'liste',
    pied: 'sombre',
    animations: 'douces',
    jetons: { policeTitres: 'inter', policeTexte: 'inter', graisseTitres: 600, rayon: 22, boutons: 'pilule', accent: 'couleur', fond: '#ffffff' },
  },
  {
    id: 'premium',
    nom: 'Médical premium',
    description: 'Bleu nuit et typographie fine, esprit clinique haut de gamme.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: TOUTES },
    competences: 'liste',
    pied: 'sombre',
    animations: 'douces',
    jetons: { policeTitres: 'inter', policeTexte: 'inter', graisseTitres: 500, rayon: 14, boutons: 'arrondi', accent: 'encre', fond: '#ffffff', fondDoux: '#f4f5f4' },
  },
  {
    id: 'prestige',
    nom: 'Prestige',
    description: 'Diaporama plein écran, en-tête transparent, grands titres élégants.',
    version: 1,
    entete: 'transparent',
    accueil: { hero: 'diaporama', voile: 55, sections: ['faits', 'competences', 'praticiens', 'panorama', 'galerie', 'actualites', 'acces', 'faq'] },
    competences: 'cartes',
    pied: 'sombre',
    animations: 'douces',
    jetons: { policeTitres: 'fraunces', policeTexte: 'inter', graisseTitres: 420, rayon: 6, boutons: 'pilule', accent: 'couleur', fond: '#ffffff', fondDoux: '#f6f3ee' },
  },
  {
    id: 'zen',
    nom: 'Zen',
    description: 'Tons pastel et grande photo apaisante, typographie légère, formes très arrondies.',
    version: 1,
    entete: 'transparent',
    accueil: { hero: 'plein', voile: 35, sections: ['competences', 'faits', 'praticiens', 'panorama', 'acces', 'galerie', 'actualites', 'faq'] },
    competences: 'cartes',
    pied: 'accent',
    animations: 'douces',
    couleurConseillee: '#2f6f6a',
    jetons: { policeTitres: 'manrope', policeTexte: 'manrope', graisseTitres: 300, rayon: 30, boutons: 'pilule', accent: 'couleur', fond: '#fbfcfb', fondDoux: '#eef4f1' },
  },
  {
    id: 'atelier',
    nom: 'Atelier',
    description: 'Beige chaud et terracotta, esprit maison de design : serif éditoriale, angles nets.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'scinde', voile: 0, sections: ['faits', 'competences', 'panorama', 'praticiens', 'galerie', 'acces', 'actualites', 'faq'] },
    competences: 'liste',
    pied: 'clair',
    animations: 'douces',
    couleurConseillee: '#b0583a',
    jetons: { policeTitres: 'instrument', policeTexte: 'inter', graisseTitres: 400, rayon: 2, boutons: 'carre', accent: 'couleur', fond: '#f7f2ec', fondDoux: '#efe6dc' },
  },
];

const HEX = /^#[0-9a-f]{6}$/i;
const parmi = (v: unknown, valeurs: readonly string[]) => valeurs.includes(v as string);

/**
 * Vérifie une fiche de modèle importée. Retourne la liste des erreurs (vide si valide) et,
 * si elle est valide, la fiche complétée (valeurs par défaut) et réduite aux champs connus.
 */
export function validerManifeste(brut: unknown): { erreurs: string[]; modele?: ModeleManifeste } {
  const e: string[] = [];
  const m = brut as Partial<ModeleManifeste> | null;
  if (!m || typeof m !== 'object') return { erreurs: ['La fiche doit être un objet JSON.'] };
  if (typeof m.id !== 'string' || !/^[a-z0-9-]{3,40}$/.test(m.id)) e.push('« id » : 3 à 40 caractères (minuscules, chiffres, tirets).');
  if (typeof m.nom !== 'string' || !m.nom.trim() || m.nom.length > 60) e.push('« nom » : obligatoire, 60 caractères maximum.');
  if (typeof m.description !== 'string' || m.description.length > 200) e.push('« description » : 200 caractères maximum.');
  if (!Number.isInteger(m.version) || (m.version as number) < 1) e.push('« version » : entier positif.');
  if (!parmi(m.entete, ['opaque', 'transparent'])) e.push('« entete » : « opaque » ou « transparent ».');
  if (!m.accueil || !parmi(m.accueil.hero, ['diaporama', 'plein', 'scinde'])) e.push('« accueil.hero » : « diaporama », « plein » ou « scinde ».');
  const voile = m.accueil?.voile ?? 50;
  if (!Number.isInteger(voile) || voile < 0 || voile > 90) e.push('« accueil.voile » : entre 0 et 90.');
  const sections = m.accueil?.sections;
  if (!Array.isArray(sections) || sections.length === 0) e.push('« accueil.sections » : liste non vide.');
  else {
    const inconnues = sections.filter((s) => !parmi(s, SECTIONS_ACCUEIL));
    if (inconnues.length) e.push(`Sections inconnues : ${inconnues.join(', ')}. Possibles : ${SECTIONS_ACCUEIL.join(', ')}.`);
    if (new Set(sections).size !== sections.length) e.push('Une section ne peut apparaître qu’une fois.');
    for (const requise of ['competences', 'acces'] as const) {
      if (!sections.includes(requise)) e.push(`La section « ${requise} » est obligatoire (contenu utile au référencement local).`);
    }
  }
  if (!parmi(m.competences, ['liste', 'cartes'])) e.push('« competences » : « liste » ou « cartes ».');
  const pied = m.pied ?? 'sombre';
  if (!parmi(pied, ['sombre', 'accent', 'clair'])) e.push('« pied » : « sombre », « accent » ou « clair ».');
  const animations = m.animations ?? 'douces';
  if (!parmi(animations, ['douces', 'aucune'])) e.push('« animations » : « douces » ou « aucune ».');
  if (m.couleurConseillee !== undefined && !HEX.test(m.couleurConseillee)) e.push('« couleurConseillee » : couleur au format #rrggbb.');
  const j = m.jetons;
  if (!j) e.push('« jetons » : obligatoire.');
  else {
    if (!parmi(j.policeTitres, POLICES_TITRES)) e.push(`« jetons.policeTitres » : ${POLICES_TITRES.join(', ')}.`);
    if (j.policeTexte !== undefined && !parmi(j.policeTexte, POLICES_TEXTE)) e.push(`« jetons.policeTexte » : ${POLICES_TEXTE.join(' ou ')}.`);
    if (!Number.isInteger(j.graisseTitres) || j.graisseTitres < 300 || j.graisseTitres > 800) e.push('« jetons.graisseTitres » : entre 300 et 800.');
    if (!Number.isInteger(j.rayon) || j.rayon < 0 || j.rayon > 40) e.push('« jetons.rayon » : entre 0 et 40.');
    if (j.boutons !== undefined && !parmi(j.boutons, ['pilule', 'arrondi', 'carre'])) e.push('« jetons.boutons » : « pilule », « arrondi » ou « carre ».');
    if (!parmi(j.accent, ['couleur', 'encre'])) e.push('« jetons.accent » : « couleur » ou « encre ».');
    if (j.fond !== undefined && !HEX.test(j.fond)) e.push('« jetons.fond » : couleur au format #rrggbb.');
    if (j.fondDoux !== undefined && !HEX.test(j.fondDoux)) e.push('« jetons.fondDoux » : couleur au format #rrggbb.');
  }
  if (e.length) return { erreurs: e };

  // Valeurs par défaut pour les champs facultatifs ; aucun champ inconnu n'est conservé.
  const v = m as ModeleManifeste;
  return {
    erreurs: [],
    modele: {
      id: v.id,
      nom: v.nom.trim(),
      description: v.description,
      version: v.version,
      entete: v.entete,
      accueil: { hero: v.accueil.hero, voile, sections: v.accueil.sections },
      competences: v.competences,
      pied,
      animations,
      ...(v.couleurConseillee ? { couleurConseillee: v.couleurConseillee } : {}),
      jetons: {
        policeTitres: v.jetons.policeTitres,
        policeTexte: v.jetons.policeTexte ?? 'inter',
        graisseTitres: v.jetons.graisseTitres,
        rayon: v.jetons.rayon,
        boutons: v.jetons.boutons ?? 'pilule',
        accent: v.jetons.accent,
        fond: v.jetons.fond ?? '#ffffff',
        ...(v.jetons.fondDoux ? { fondDoux: v.jetons.fondDoux } : {}),
      },
    },
  };
}

export const modeleIntegre = (id: string) => MODELES_INTEGRES.find((m) => m.id === id) ?? MODELES_INTEGRES[0];
