// Personnalisation des textes par le praticien (éditeur visuel) : surcouche du contenu standard.
//
// Compromis « standard / sur-mesure » :
// - libre    : modifiable dans l'abonnement de base (photos, bio… : déjà des champs du brouillon) ;
// - guidé    : modifiable avec l'option « édition », longueur bornée, lexique contrôlé, retour au standard possible ;
// - verrouillé : non listé ici (titre principal, mots-clés des titres, structure, mentions, identifiants).
// Un texte non personnalisé reste relié au standard : les améliorations du catalogue profitent à tous les sites.

import { verifierTexte, type Alerte, type NiveauConformite } from './lexique';

export type NiveauChamp = 'libre' | 'guide';

export type DefinitionChamp = {
  /** Motif de la clé : texte exact, ou préfixe se terminant par « * » (ex. « soin.*.resume ») */
  cle: string;
  libelle: string;
  niveau: NiveauChamp;
  /** Longueur maximale en caractères */
  max: number;
  /** Texte sur une seule ligne (titres) */
  ligne?: boolean;
};

/** Zones de texte modifiables dans l'éditeur visuel. */
export const CHAMPS_TEXTE: DefinitionChamp[] = [
  { cle: 'accueil.chapo', libelle: 'Phrase d’accueil', niveau: 'guide', max: 280 },
  { cle: 'competences.deco', libelle: 'Titre « compétences » (fin décorative)', niveau: 'guide', max: 40, ligne: true },
  { cle: 'competences.chapo', libelle: 'Introduction des compétences', niveau: 'guide', max: 220 },
  { cle: 'praticiens.deco', libelle: 'Titre « praticiens » (fin décorative)', niveau: 'guide', max: 40, ligne: true },
  { cle: 'actualites.deco', libelle: 'Titre « actualités » (fin décorative)', niveau: 'guide', max: 40, ligne: true },
  { cle: 'acces.deco', libelle: 'Titre « accès » (fin décorative)', niveau: 'guide', max: 40, ligne: true },
  { cle: 'faq.deco', libelle: 'Titre « questions » (fin décorative)', niveau: 'guide', max: 40, ligne: true },
  { cle: 'panorama.titre', libelle: 'Phrase du bandeau photo', niveau: 'guide', max: 90, ligne: true },
  { cle: 'soin.*.resume', libelle: 'Résumé d’un soin', niveau: 'guide', max: 220 },
  { cle: 'faq.*.reponse', libelle: 'Réponse de la FAQ', niveau: 'guide', max: 600 },
];

const RE_CLE = /^[a-z]+(\.[a-z0-9-]+){1,2}$/;

export function definitionChamp(cle: string): DefinitionChamp | undefined {
  if (!RE_CLE.test(cle)) return undefined;
  return CHAMPS_TEXTE.find((c) => {
    if (!c.cle.includes('*')) return c.cle === cle;
    const [avant, apres] = c.cle.split('*');
    return cle.startsWith(avant) && cle.endsWith(apres) && cle.length > avant.length + apres.length;
  });
}

export type ResultatPersonnalisation = {
  /** Textes retenus (clés connues, nettoyés, autorisés par l'abonnement) */
  textes: Record<string, string>;
  /** Alertes du lexique par clé (les bloquantes empêchent l'enregistrement de la clé) */
  alertes: Record<string, Alerte[]>;
  /** Clés refusées et pourquoi */
  refus: Record<string, string>;
};

/**
 * Nettoie et contrôle les textes personnalisés.
 * @param edition le site a l'option « édition » (requise pour les champs guidés)
 */
export function validerPersonnalisation(brut: unknown, edition: boolean, niveau: NiveauConformite = 'standard'): ResultatPersonnalisation {
  const res: ResultatPersonnalisation = { textes: {}, alertes: {}, refus: {} };
  if (!brut || typeof brut !== 'object') return res;
  for (const [cle, valeur] of Object.entries(brut as Record<string, unknown>).slice(0, 200)) {
    const def = definitionChamp(cle);
    if (!def) { res.refus[cle] = 'Zone non modifiable.'; continue; }
    if (def.niveau === 'guide' && !edition) { res.refus[cle] = 'Réservé à l’option « édition ».'; continue; }
    let texte = String(valeur ?? '').replace(/\r\n/g, '\n').trim();
    if (def.ligne) texte = texte.replace(/\s+/g, ' ');
    if (!texte) continue; // vide = retour au texte standard
    if (texte.length > def.max) { res.refus[cle] = `${def.max} caractères maximum.`; continue; }
    const alertes = verifierTexte(texte, niveau);
    if (alertes.length) res.alertes[cle] = alertes;
    if (alertes.some((a) => a.bloquante)) { res.refus[cle] = 'Formulation à revoir (déontologie).'; continue; }
    res.textes[cle] = texte;
  }
  return res;
}

/** Texte personnalisé s'il existe, sinon le texte standard. */
export const textePerso = (textes: Record<string, string> | undefined, cle: string, standard: string) => textes?.[cle] || standard;
