// Modèles de présentation des sites.
//
// Un modèle ne contient AUCUN code : c'est une fiche (JSON) qui combine des sections déjà développées
// et testées, et règle polices, arrondis et couleurs. Tout ce qui compte pour le référencement
// (adresses des pages, title, description, H1, données structurées, sitemap, llms.txt, liens internes)
// est produit par le moteur et ne dépend jamais du modèle : changer de modèle ne change pas le SEO.

export const SECTIONS_ACCUEIL = ['faits', 'competences', 'panorama', 'praticiens', 'galerie', 'actualites', 'acces', 'faq'] as const;
export type SectionAccueil = (typeof SECTIONS_ACCUEIL)[number];

export const POLICES_TITRES = ['inter', 'fraunces'] as const;
export type PoliceTitres = (typeof POLICES_TITRES)[number];

export type ModeleManifeste = {
  /** Identifiant stable (minuscules, chiffres, tirets) */
  id: string;
  nom: string;
  description: string;
  version: number;
  /** En-tête : opaque, ou transparent sur l'image d'accueil puis opaque au défilement */
  entete: 'opaque' | 'transparent';
  accueil: {
    /** diaporama plein écran, ou titre + photo côte à côte */
    hero: 'diaporama' | 'scinde';
    /** Ordre des sections sous l'en-tête d'accueil */
    sections: SectionAccueil[];
  };
  competences: 'liste' | 'cartes';
  jetons: {
    policeTitres: PoliceTitres;
    /** Graisse des titres (300 à 800) */
    graisseTitres: number;
    /** Arrondi des cartes et images, en px (0 à 40) */
    rayon: number;
    /** « couleur » : boutons à la couleur du cabinet ; « encre » : boutons bleu nuit */
    accent: 'couleur' | 'encre';
    /** Couleur des fonds de section alternés (#rrggbb), facultatif */
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
    accueil: { hero: 'scinde', sections: TOUTES },
    competences: 'liste',
    jetons: { policeTitres: 'inter', graisseTitres: 600, rayon: 22, accent: 'couleur' },
  },
  {
    id: 'premium',
    nom: 'Médical premium',
    description: 'Bleu nuit et typographie fine, esprit clinique haut de gamme.',
    version: 1,
    entete: 'opaque',
    accueil: { hero: 'scinde', sections: TOUTES },
    competences: 'liste',
    jetons: { policeTitres: 'inter', graisseTitres: 500, rayon: 14, accent: 'encre', fondDoux: '#f4f5f4' },
  },
  {
    id: 'prestige',
    nom: 'Prestige',
    description: 'Diaporama plein écran, en-tête transparent, grands titres élégants.',
    version: 1,
    entete: 'transparent',
    accueil: { hero: 'diaporama', sections: ['faits', 'competences', 'praticiens', 'panorama', 'galerie', 'actualites', 'acces', 'faq'] },
    competences: 'cartes',
    jetons: { policeTitres: 'fraunces', graisseTitres: 420, rayon: 6, accent: 'couleur', fondDoux: '#f6f3ee' },
  },
];

/** Vérifie une fiche de modèle importée. Retourne la liste des erreurs (vide si valide). */
export function validerManifeste(brut: unknown): { erreurs: string[]; modele?: ModeleManifeste } {
  const e: string[] = [];
  const m = brut as Partial<ModeleManifeste> | null;
  if (!m || typeof m !== 'object') return { erreurs: ['La fiche doit être un objet JSON.'] };
  if (typeof m.id !== 'string' || !/^[a-z0-9-]{3,40}$/.test(m.id)) e.push('« id » : 3 à 40 caractères (minuscules, chiffres, tirets).');
  if (typeof m.nom !== 'string' || !m.nom.trim() || m.nom.length > 60) e.push('« nom » : obligatoire, 60 caractères maximum.');
  if (typeof m.description !== 'string' || m.description.length > 200) e.push('« description » : 200 caractères maximum.');
  if (!Number.isInteger(m.version) || (m.version as number) < 1) e.push('« version » : entier positif.');
  if (!['opaque', 'transparent'].includes(m.entete as string)) e.push('« entete » : « opaque » ou « transparent ».');
  if (!m.accueil || !['diaporama', 'scinde'].includes(m.accueil.hero)) e.push('« accueil.hero » : « diaporama » ou « scinde ».');
  const sections = m.accueil?.sections;
  if (!Array.isArray(sections) || sections.length === 0) e.push('« accueil.sections » : liste non vide.');
  else {
    const inconnues = sections.filter((s) => !(SECTIONS_ACCUEIL as readonly string[]).includes(s));
    if (inconnues.length) e.push(`Sections inconnues : ${inconnues.join(', ')}. Possibles : ${SECTIONS_ACCUEIL.join(', ')}.`);
    if (new Set(sections).size !== sections.length) e.push('Une section ne peut apparaître qu’une fois.');
    for (const requise of ['competences', 'acces'] as const) {
      if (!sections.includes(requise)) e.push(`La section « ${requise} » est obligatoire (contenu utile au référencement local).`);
    }
  }
  if (!['liste', 'cartes'].includes(m.competences as string)) e.push('« competences » : « liste » ou « cartes ».');
  const j = m.jetons;
  if (!j) e.push('« jetons » : obligatoire.');
  else {
    if (!(POLICES_TITRES as readonly string[]).includes(j.policeTitres)) e.push(`« jetons.policeTitres » : ${POLICES_TITRES.join(' ou ')}.`);
    if (!Number.isInteger(j.graisseTitres) || j.graisseTitres < 300 || j.graisseTitres > 800) e.push('« jetons.graisseTitres » : entre 300 et 800.');
    if (!Number.isInteger(j.rayon) || j.rayon < 0 || j.rayon > 40) e.push('« jetons.rayon » : entre 0 et 40.');
    if (!['couleur', 'encre'].includes(j.accent)) e.push('« jetons.accent » : « couleur » ou « encre ».');
    if (j.fondDoux !== undefined && !/^#[0-9a-f]{6}$/i.test(j.fondDoux)) e.push('« jetons.fondDoux » : couleur au format #rrggbb.');
  }
  return e.length ? { erreurs: e } : { erreurs: [], modele: m as ModeleManifeste };
}

export const modeleIntegre = (id: string) => MODELES_INTEGRES.find((m) => m.id === id) ?? MODELES_INTEGRES[0];
