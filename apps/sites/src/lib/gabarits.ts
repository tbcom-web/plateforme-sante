// Données communes aux variantes de sections des gabarits autres que « classique » (components/gabarits/*) : variantes
// effectives du modèle, bulles « pour qui », horaires du jour, atouts du lieu. Aucun texte nouveau qui serait un titre :
// les intertitres (H1, H2) restent ceux du gabarit classique (SEO identique, npm run controle:seo).
import { variantesModele, gabaritModele, pictoSoin, resumeHygiene, faitEquipement, rendreCase, type Variantes } from '@plateforme/core';
import { site } from './site';
import { lieu, rdvEnLigne, TYPES_LIEU } from './textes';
import { visuelSoin, photoPraticienSoin } from './visuels-soins';
import { modeVisuel } from './visuels';

export const gabarit = gabaritModele(site.modele);
/** Gabarit autre que « classique » : les pages passent par les variantes de sections. */
export const nouveauGabarit = gabarit !== 'classique';
/** Variantes de sections du modèle (gabarits autres que classique) */
export const variantes: Variantes = variantesModele(site.modele) ?? { accueil: 'carte', soins: 'bulles', praticiens: 'cartes', infos: 'volets', faq: 'accordeon', actualites: 'liste', pied: 'simple' };

/** Picto métier d'un soin (« picto:<id> »), sinon picto générique du pied. */
export const pictoDuSoin = (slug: string) => `picto:${pictoSoin(slug) ?? 'pied-dessus'}`;

/**
 * Bulles « pour qui » : publics des soins du cabinet (seulement ceux que le cabinet propose), vers la fiche du soin.
 * Libellés factuels, sans promesse.
 */
const PUBLICS: [RegExp, string][] = [
  [/enfant/, 'Enfants'],
  [/sport/, 'Sportifs'],
  [/diab/, 'Diabétiques'],
  [/senior|chute/, 'Seniors'],
];
export const pourQui = site.soins.flatMap((s) => {
  const p = PUBLICS.find(([re]) => re.test(s.slug));
  return p ? [{ libelle: p[1], href: `/soins/${s.slug}`, picto: pictoDuSoin(s.slug) }] : [];
});

/** Plages d'un jour (« 9h00–12h30, 14h00–19h00 » → deux plages) ; vide = fermé. */
export const plagesDuJour = (heures: string) => (/\d/.test(heures) ? heures.split(/\s*,\s*/) : []);
/** Horaires par jour, avec le numéro du jour JavaScript (dimanche = 0) pour repérer « aujourd'hui » côté navigateur. */
export const semaine = lieu.horaires.map((h, i) => ({ jour: h.jour, plages: plagesDuJour(h.heures), numero: (i + 1) % 7 }));
export const cabinetOuvert = semaine.some((j) => j.plages.length > 0);

/** Atouts du lieu d'exercice (mêmes informations que le bandeau « lieu » du gabarit classique). */
export const atoutsLieu = [
  { titre: 'Hygiène', texte: resumeHygiene(site.equipements ?? []) || 'Instruments stérilisés après chaque patient' },
  site.accesDetail.pmr || site.accesDetail.parking
    ? { titre: 'Accès', texte: [site.accesDetail.pmr && 'Accessible PMR', site.accesDetail.parking].filter(Boolean).join(' · ') }
    : null,
  { titre: 'Rendez-vous', texte: !rdvEnLigne ? `Par téléphone au ${site.cabinet.telephone}` : `En ligne sur ${site.rdv.plateforme}, 24h/24` },
  site.domicile.actif ? { titre: 'Domicile', texte: site.domicile.creneaux || 'Visites à domicile sur demande' } : null,
].filter(Boolean) as { titre: string; texte: string }[];
export const nomLieu = lieu.nom || TYPES_LIEU[lieu.type];
/** Titre du lieu d'exercice (H2 « panorama » du gabarit classique) */
export const titreLieu = `${nomLieu} à ${lieu.ville || site.cabinet.ville}`;

/**
 * Visuel d'un soin dans une variante : photo (règles du style visuel, rendreCase) ou dessin. Jamais d'animation dans ces
 * gabarits (clarté, sobriété) : une animation est remplacée par le dessin du soin.
 */
export function visuelVariante(slug: string, contexte: 'liste' | 'page') {
  const v = visuelSoin(slug);
  const r = rendreCase(v, modeVisuel, contexte, { photoPraticien: photoPraticienSoin(slug), animationActive: false });
  return r.type === 'photo' ? { type: 'photo' as const, src: r.src, cadrage: r.cadrage, praticien: r.src === photoPraticienSoin(slug) } : { type: 'dessin' as const, dessin: v.dessin };
}

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
