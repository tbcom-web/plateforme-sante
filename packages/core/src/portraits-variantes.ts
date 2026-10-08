// Présentations des portraits des praticiens (retour de Paul du 2026-10-08 : « proposer plusieurs manières de présenter les
// portraits des praticiens sur les sites. C'est tout le temps des petites images mini ; on pourrait imaginer des plus grands
// portraits, plus petits, côte à côte, joli voile overlay, etc. Pareil, à ajouter aux éléments à noter / A-B tester »).
//
// Nouvel ingrédient de recette : variante de section `portraits` (VARIANTES_SECTIONS, modeles.ts), clé notable
// `composant:portraits:<présentation>`, sur l'accueil ET la page « Le cabinet » (bloc praticiens), tous gabarits (classique
// compris). « sobre » = le rendu historique de chaque gabarit (petite pastille ronde, ou fiche éditoriale du classique),
// inchangé ; les autres sont rendues par portraits-praticiens.ts (HTML et CSS UNIQUES partagés par le site et l'aperçu).
// Toutes « à valider » : disponibles dans le Studio (libellé « à valider »), « Donner mon avis » et les duels ; jamais tirées
// ni proposées à un praticien avant validation par Paul (PORTRAITS_A_VALIDER).
// Module de constantes, sans import (modeles.ts l'importe : aucune boucle).

export const PRESENTATIONS_PORTRAITS = ['sobre', 'editorial', 'voile', 'duo', 'mosaique', 'organique', 'anneau', 'polaroid', 'defilement', 'detoure'] as const;
export type PresentationPortraits = (typeof PRESENTATIONS_PORTRAITS)[number];
export const estPresentationPortraits = (v: unknown): v is PresentationPortraits => (PRESENTATIONS_PORTRAITS as readonly unknown[]).includes(v);

export const LIBELLES_PRESENTATIONS_PORTRAITS: Record<PresentationPortraits, string> = {
  sobre: 'Petit format sobre (actuel)',
  editorial: 'Grand portrait éditorial (à valider)',
  voile: 'Plein cadre, voile de couleur et nom en surimpression (à valider)',
  duo: 'Côte à côte, même hauteur (à valider)',
  mosaique: 'Mosaïque décalée (à valider)',
  organique: 'Forme organique (à valider)',
  anneau: 'Cercle et anneau de couleur (à valider)',
  polaroid: 'Tirage à bordure (à valider)',
  defilement: 'Bandeau qui défile au doigt (à valider)',
  detoure: 'Portrait sur aplat de couleur (à valider)',
};

/** Description courte (tuiles, documentation) */
export const DETAILS_PRESENTATIONS_PORTRAITS: Record<PresentationPortraits, string> = {
  sobre: 'pastille ronde de 64 px (gabarits) ou fiche éditoriale (classique) : le rendu historique',
  editorial: 'photo haute 4:5, nom en grand, texte à côté ; un praticien par rangée, côtés alternés',
  voile: 'photo pleine carte, voile dégradé de la couleur sombre de la gamme (AA calculé), nom et titre posés dessus',
  duo: 'cartes de même hauteur côte à côte, photo 4:5 en tête',
  mosaique: 'cadres de hauteurs différentes, une colonne sur deux décalée vers le bas',
  organique: 'photo dans une forme organique, ombre pleine de l’aplat de la gamme',
  anneau: 'grand cercle cerné d’un anneau de la couleur du cabinet, texte centré',
  polaroid: 'tirage carré à bordure claire, légèrement incliné sur grand écran',
  defilement: 'cartes en bandeau horizontal, défilement au doigt (aimanté), sans animation automatique',
  detoure: 'portrait en arche posé sur un aplat de la gamme (le portrait détouré du studio s’y fond)',
};

export type FamillePortraits = 'sobre' | 'editorial' | 'organique' | 'graphique';
/** Étiquettes de style (Studio, harmonie) : famille, énergie (0-1), rondeur (0-1), présentation expressive */
export const METADONNEES_PORTRAITS: Record<PresentationPortraits, { famille: FamillePortraits; energie: number; rondeur: number; expressif: boolean }> = {
  sobre: { famille: 'sobre', energie: 0, rondeur: 0.6, expressif: false },
  editorial: { famille: 'editorial', energie: 0.2, rondeur: 0.1, expressif: true },
  voile: { famille: 'editorial', energie: 0.45, rondeur: 0.3, expressif: true },
  duo: { famille: 'sobre', energie: 0.15, rondeur: 0.4, expressif: false },
  mosaique: { famille: 'graphique', energie: 0.5, rondeur: 0.3, expressif: true },
  organique: { famille: 'organique', energie: 0.35, rondeur: 1, expressif: true },
  anneau: { famille: 'organique', energie: 0.25, rondeur: 0.85, expressif: false },
  polaroid: { famille: 'graphique', energie: 0.4, rondeur: 0.2, expressif: true },
  defilement: { famille: 'graphique', energie: 0.5, rondeur: 0.4, expressif: false },
  detoure: { famille: 'graphique', energie: 0.45, rondeur: 0.6, expressif: true },
};

/** Clés « à valider » (toutes sauf « sobre », le rendu historique) */
export const PORTRAITS_A_VALIDER: readonly string[] = PRESENTATIONS_PORTRAITS.filter((v) => v !== 'sobre').map((v) => `composant:portraits:${v}`);
