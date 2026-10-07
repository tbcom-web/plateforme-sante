// Données communes aux variantes de sections des gabarits autres que « classique » (components/gabarits/*) : variantes
// effectives du modèle, bulles « pour qui », horaires du jour, atouts du lieu. Aucun texte nouveau qui serait un titre :
// les intertitres (H1, H2) restent ceux du gabarit classique (SEO identique, npm run controle:seo).
import { variantesModele, varianteSujets, varianteTheme, varianteArticle, formeDesCartes, gabaritModele, pictoSoin, resumeHygiene, faitEquipement, rendreCase, LIGNE_DESSIN, type Variantes, type NomDessin, type NomLigne } from '@plateforme/core';
import { site } from './site';
import { cheminTheme } from '@plateforme/core';
import { navigation } from './navigation';
import { lieu, TYPES_LIEU, phraseRdv, suffixeVille, semaineDe } from './textes';
import { visuelSoin, photoPraticienSoin } from './visuels-soins';
import { modeVisuel, registre } from './visuels';

export const gabarit = gabaritModele(site.modele);
/** Gabarit autre que « classique » : les pages passent par les variantes de sections. */
export const nouveauGabarit = gabarit !== 'classique';
/** Variantes de sections du modèle (gabarits autres que classique) */
export const variantes: Variantes = variantesModele(site.modele) ?? { accueil: 'carte', soins: 'bulles', praticiens: 'cartes', infos: 'volets', faq: 'accordeon', actualites: 'liste', pied: 'simple', sujets: varianteSujets(site.modele), horaires: 'tableau', galerie: 'mosaique', 'soins-forme': formeDesCartes(site.modele), contact: 'barre', fiche: 'encadre', theme: varianteTheme(site.modele), article: varianteArticle(site.modele) };

/** Picto métier d'un soin (« picto:<id> »), sinon picto générique du pied. */
export const pictoDuSoin = (slug: string) => `picto:${pictoSoin(slug) ?? 'pied-dessus'}`;

/**
 * Bulles « pour qui » : publics des soins du cabinet (seulement ceux que le cabinet propose), vers la fiche du soin.
 * Libellés factuels, sans promesse.
 */
const PUBLICS: [RegExp, string, string][] = [
  [/enfant/, 'Enfants', 'enfant'],
  [/sport/, 'Sportifs', 'sport'],
  [/diab/, 'Diabétiques', 'diabete'],
  [/senior|chute/, 'Seniors', 'senior'],
];
// Quand le praticien a retenu le thème du même public (lib/navigation.ts), la bulle mène à la page du thème.
export const pourQui = site.soins.flatMap((s) => {
  const p = PUBLICS.find(([re]) => re.test(s.slug));
  if (!p) return [];
  const theme = cheminTheme(p[2]);
  return [{ libelle: p[1], href: navigation.pages.includes(theme) ? theme : `/soins/${s.slug}`, picto: pictoDuSoin(s.slug) }];
});

/**
 * Horaires du tableau : jours consécutifs identiques réunis (« Lundi au mercredi »), plages, numéros des jours JavaScript
 * (« 1 2 3 », dimanche = 0) pour repérer « aujourd'hui » côté navigateur (sélecteur [data-jour~="n"]).
 */
export const semaine = semaineDe(lieu.horaires);
export const cabinetOuvert = semaine.some((j) => j.plages.length > 0);

/** Atouts du lieu d'exercice (mêmes informations que le bandeau « lieu » du gabarit classique). */
export const atoutsLieu = [
  { titre: 'Hygiène', texte: resumeHygiene(site.equipements ?? []) || 'Instruments stérilisés après chaque patient' },
  site.accesDetail.pmr || site.accesDetail.parking
    ? { titre: 'Accès', texte: [site.accesDetail.pmr && 'Accessible PMR', site.accesDetail.parking].filter(Boolean).join(' · ') }
    : null,
  { titre: 'Rendez-vous', texte: phraseRdv },
  site.domicile.actif ? { titre: 'Domicile', texte: site.domicile.creneaux || 'Visites à domicile sur demande' } : null,
].filter(Boolean) as { titre: string; texte: string }[];
export const nomLieu = lieu.nom || TYPES_LIEU[lieu.type];
/** Titre du lieu d'exercice (H2 « panorama » du gabarit classique) */
export const titreLieu = `${nomLieu}${lieu.ville ? ` à ${lieu.ville}` : suffixeVille}`;

/**
 * Visuel d'un soin dans une variante : photo (règles du style visuel, rendreCase) ou dessin. Jamais d'animation dans ces
 * gabarits (clarté, sobriété) : une animation est remplacée par le dessin du soin.
 */
export function visuelVariante(slug: string, contexte: 'liste' | 'page') {
  const v = visuelSoin(slug);
  const r = rendreCase(v, modeVisuel, contexte, { photoPraticien: photoPraticienSoin(slug), animationActive: false });
  return r.type === 'photo' ? { type: 'photo' as const, src: r.src, cadrage: r.cadrage, praticien: r.src === photoPraticienSoin(slug) } : { type: 'dessin' as const, dessin: unSujet(v.dessin) };
}

/**
 * Dessins à plusieurs sujets côte à côte (trois pieds et leurs empreintes, trois arrière-pieds) : dans le cadre bas et large
 * d'un en-tête de fiche, les sujets se tassent et se coupent (lu « des jambes alignées »). Ces gabarits montrent UNE
 * illustration claire par fiche : le dessin à un seul sujet le plus proche (empreintes des deux pieds avec leurs zones
 * d'appui, pour le bilan). Le registre « ligne » a déjà un sujet unique par dessin (LIGNE_DESSIN) : inchangé.
 */
const UN_SUJET: Partial<Record<NomDessin, NomDessin>> = { voutes: 'analyse', 'arriere-pied': 'analyse' };
const unSujet = (d: NomDessin): NomDessin => (registre === 'ligne' ? d : (UN_SUJET[d] ?? d));

/** Dessin au trait continu d'un soin (gabarit « revue » : figure du premier écran et des fiches). */
export const ligneDuSoin = (slug: string): NomLigne => LIGNE_DESSIN[visuelSoin(slug).dessin] ?? 'pied-dessous';
/** Légende factuelle d'un dessin au trait continu : ce qui est dessiné, jamais une promesse ni une mesure. */
const LEGENDES_LIGNE: Record<NomLigne, string> = {
  'pied-dessous': 'Le pied, vue de dessous', 'pied-dessus': 'Le pied, vue de dessus', 'pieds-dessus': 'Les pieds, vue de dessus',
  empreintes: 'Empreintes des deux pieds', 'pied-profil': 'Le pied, vue de profil', marche: 'La marche', ongle: 'Les ongles des orteils',
  semelle: 'Une semelle orthopédique', 'chaussure-course': 'Une chaussure de course', 'premiers-pas': 'Pied d’adulte et pied d’enfant',
  'senior-canne': 'La marche avec une canne', fauteuil: 'Le fauteuil de soins', instruments: 'Les instruments de soin',
  autoclave: 'L’autoclave de stérilisation', podoscope: 'Le podoscope', monofilament: 'Le test au monofilament',
  orthonyxie: 'Une agrafe d’orthonyxie sur l’ongle', onychoplastie: 'Un ongle reconstitué en résine', mycose: 'Un ongle atteint d’une mycose',
  'ongle-epais': 'Le meulage d’un ongle épaissi', cor: 'Un durillon sous l’avant-pied et un cor sur un orteil', orthoplastie: 'Une orthèse d’orteil en silicone',
  domicile: 'Les soins à domicile',
  talon: 'Le talon et la voûte plantaire', taping: 'Des bandes adhésives de K-taping', verrue: 'Une verrue plantaire', laser: 'Un soin au laser',
};
export const legendeLigne = (nom: NomLigne) => LEGENDES_LIGNE[nom];

/**
 * Bulles « Infos pratiques » (règles de clarté) : chacune ouvre le bon volet de « Venir au cabinet » (accueil) ou mène à la
 * rubrique du plan d'accès (autres pages). Seules les rubriques renseignées apparaissent.
 */
export const infosPratiques = (accueil: boolean) =>
  [
    cabinetOuvert ? { libelle: 'Horaires', picto: 'picto:horaires', ancre: 'horaires' } : null,
    { libelle: 'Accès', picto: 'picto:accessibilite', ancre: 'volet-acces' },
    site.cabinet.tarifs.length ? { libelle: 'Tarifs', picto: 'picto:honoraires', ancre: 'volet-tarifs' } : null,
    site.domicile.actif ? { libelle: 'Visites à domicile', picto: 'picto:soins-domicile', ancre: 'volet-domicile' } : null,
  ]
    .filter(Boolean)
    .map((i) => ({ ...i!, href: accueil ? `#${i!.ancre}` : `/acces#${i!.ancre === 'volet-tarifs' ? 'tarifs' : i!.ancre === 'volet-domicile' ? 'domicile' : i!.ancre === 'volet-acces' ? 'acces' : 'horaires'}` }));

/** Pastilles du lieu d'exercice (une ligne, quatre au plus) : accessibilité, stationnement, hygiène, conventionnement. */
export const pastillesLieu = [
  site.accesDetail.pmr ? 'Accessible PMR' : '',
  site.accesDetail.parking ? site.accesDetail.parking.replace(/ sur place$/i, '') : '',
  faitEquipement(site.equipements ?? []),
  site.praticien.conventionnement ? site.praticien.conventionnement.split(" ")[0] : "",
].filter(Boolean).slice(0, 4);
