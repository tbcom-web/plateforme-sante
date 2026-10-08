// PACKS PROFESSION (décision de Paul du 2026-10-08, docs/architecture-professions.md) : tout ce qui change d'une profession à
// l'autre dans un site, en DONNÉES. Les recettes (design) sont communes ; les gabarits des sites (apps/sites) lisent le pack de
// `site.profession.slug` au lieu de mots de métier codés en dur (« Cabinet de pédicurie-podologie », ordre, diplôme, règles
// professionnelles, FAQ par défaut, nom générique du cabinet).
//
// Complètent ce pack : pratiques.ts (thèmes, activités, profils de référence), onboarding-professions.ts (codes RPPS / ADELI,
// diplôme affiché, disponibilité du parcours), professions.ts (registre), professions-ingredients.ts (ingrédients partagés).
//
// Textes provisoires : « [à rédiger] » (motif PROVISOIRE). Un pack qui en contient n'est PAS publiable (`verifierPackPubliable`),
// seulement construit en démonstration (jamais indexée). Les vrais contenus du pack Psychomotricien sont écrits par l'agent
// « pack Psychomotricien » (textes sobres, factuels, sans promesse ; vérification des remboursements sur ameli.fr).
// Module pur.

import type { Faq } from './types';
import { idProfession, PROFESSION_PAR_DEFAUT } from './professions';

export type PaysPack = 'FR' | 'BE' | 'CH';
type ParPays = Readonly<Record<PaysPack, string>>;

export type DefautsTextes = {
  accrocheTitre: string;
  /**
   * enLigne : réservation en ligne possible (lien précis vers la plateforme) ; telephone : numéro publiable ; email : adresse
   * du cabinet (repli quand ni téléphone ni lien en ligne). Absents : valeurs historiques (téléphone présent).
   */
  faq: (o: { pmr: boolean; plateforme: string; enLigne: boolean; telephone?: boolean; email?: string }) => Faq[];
};

export type PackProfession = {
  profession: string;
  /** Faux tant que des textes « [à rédiger] » restent ou que les mentions n'ont pas été relues */
  publiable: boolean;
  /** Discipline du titre « Cabinet de … » (H1 de l'accueil, titre du cabinet) */
  discipline: ParPays;
  /** Nom générique d'un cabinet de plusieurs praticiens sans nom (logo) */
  cabinetGenerique: string;
  /** Instance professionnelle (mentions légales) */
  instance: ParPays;
  /** Lien de l'instance dans le pied de page (pays absents : aucun lien) */
  lienInstance: Partial<Record<PaysPack, { libelle: string; url: string }>>;
  /** Diplôme affiché par défaut (mentions légales) */
  diplome: ParPays;
  /** Règles professionnelles applicables (mentions légales) */
  regles: ParPays;
  /** Spécialité schema.org (https://schema.org/MedicalSpecialty) ; '' : aucune spécialité adaptée */
  specialiteSchema: string;
  defauts: DefautsTextes;
  /** Univers métier : motif signature et pictos / illustrations propres (univers.ts quand il est implémenté) */
  univers: { id: string; nom: string; motif: string; implemente: boolean };
  /** Mots-clés de partage : sujets, hashtags ou mots de titre d'un visuel qui suggèrent « Aussi pour cette profession » */
  motsClesPartage: readonly string[];
  /** Soins de démonstration (catalogue provisoire tant que la table soins_catalogue n'a pas la profession) */
  soinsDemo?: readonly { slug: string; titreCourt: string; titre: string; resume: string; corps: string }[];
};

/** Texte provisoire, jamais publiable */
export const A_REDIGER = '[à rédiger]';
export const PROVISOIRE = /\[à rédiger\]/;

const faqRdvAcces = ({ pmr, plateforme, enLigne, telephone = true, email = '' }: Parameters<DefautsTextes['faq']>[0]): Faq[] => [
  {
    q: 'Comment prendre rendez-vous ?',
    r: enLigne
      ? `En ligne sur ${plateforme}, 24h/24${telephone ? ', ou par téléphone aux heures d’ouverture du cabinet' : ''}.`
      : telephone
        ? 'Par téléphone, aux heures d’ouverture du cabinet.'
        : email
          ? `Par e-mail (${email}) ou directement au cabinet.`
          : 'Directement au cabinet.',
  },
  {
    q: 'Le cabinet est-il accessible aux personnes à mobilité réduite ?',
    r: pmr
      ? 'Oui, le cabinet est accessible aux personnes à mobilité réduite.'
      : 'Merci de nous contacter avant votre venue : nous vous indiquerons les conditions d’accès.',
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Pédicure-podologue : textes repris À L'IDENTIQUE des gabarits (contrôle SEO avant / après identique)
// ---------------------------------------------------------------------------------------------------------------

const PODOLOGUE: PackProfession = {
  profession: 'podologue',
  publiable: true,
  discipline: { FR: 'pédicurie-podologie', BE: 'podologie', CH: 'podologie' },
  cabinetGenerique: 'Cabinet de podologie',
  instance: { FR: 'Ordre national des pédicures-podologues', BE: 'INAMI', CH: 'Société Suisse des Podologues (SSP)' },
  lienInstance: { FR: { libelle: 'Ordre national des pédicures-podologues', url: 'https://www.onpp.fr' } },
  diplome: { FR: 'Diplôme d’État de pédicure-podologue', BE: 'Titre professionnel de podologue', CH: 'Diplôme de podologue ES' },
  regles: {
    FR: 'Code de déontologie des pédicures-podologues : Code de la santé publique, articles R.4322-31 et suivants (consultables sur legifrance.gouv.fr).',
    BE: 'Loi coordonnée du 10 mai 2015 relative à l’exercice des professions des soins de santé.',
    CH: 'Législation sanitaire du canton d’exercice et règles professionnelles de la Société Suisse des Podologues.',
  },
  specialiteSchema: 'Podiatric',
  defauts: {
    accrocheTitre: 'Prendre soin de vos pieds, à chaque étape de la vie',
    faq: (o) => [
      ...faqRdvAcces(o),
      {
        q: 'Les soins sont-ils remboursés ?',
        r: 'Les soins de pédicurie courants ne sont pas remboursés, sauf pour les patients diabétiques sur prescription. Sur prescription, l’Assurance Maladie rembourse les semelles sur la base d’un tarif réglementaire faible ; le reste peut être pris en charge par la complémentaire santé selon le contrat. Un devis est remis avant fabrication.',
      },
    ],
  },
  univers: { id: 'podologie', nom: 'Podologie', motif: 'Trame de pression', implemente: true },
  motsClesPartage: [],
};

// ---------------------------------------------------------------------------------------------------------------
// Psychomotricien : PACK MINIMAL PROVISOIRE (structure ; textes « [à rédiger] » par l'agent du pack Psychomotricien)
// ---------------------------------------------------------------------------------------------------------------

const PSYCHOMOTRICIEN: PackProfession = {
  profession: 'psychomotricien',
  publiable: false,
  discipline: { FR: 'psychomotricité', BE: 'psychomotricité', CH: 'psychomotricité' },
  cabinetGenerique: 'Cabinet de psychomotricité',
  instance: { FR: A_REDIGER, BE: A_REDIGER, CH: A_REDIGER },
  lienInstance: {},
  diplome: { FR: `Diplôme d’État de psychomotricien ${A_REDIGER}`, BE: A_REDIGER, CH: A_REDIGER },
  regles: { FR: A_REDIGER, BE: A_REDIGER, CH: A_REDIGER },
  specialiteSchema: '',
  defauts: {
    accrocheTitre: `${A_REDIGER} Accroche du cabinet de psychomotricité`,
    faq: (o) => [...faqRdvAcces(o), { q: 'Les séances sont-elles remboursées ?', r: `${A_REDIGER} Prise en charge à vérifier sur ameli.fr avant rédaction.` }],
  },
  univers: { id: 'psychomotricite', nom: 'Psychomotricité', motif: A_REDIGER, implemente: false },
  // Visuels de la bibliothèque à proposer aussi pour la psychomotricité (validés par Paul) : enfant, marche, équilibre…
  motsClesPartage: ['enfant', 'enfants', 'bebe', 'marche', 'marcher', 'premiers-pas', 'equilibre', 'motricite', 'coordination', 'jeu', 'jouer', 'saut', 'sauter', 'danse', 'yoga', 'senior', 'chute', 'relaxation'],
  soinsDemo: [
    { slug: 'bilan-psychomoteur', titreCourt: 'Bilan psychomoteur', titre: 'Bilan psychomoteur à {ville}', resume: `${A_REDIGER} Résumé du bilan psychomoteur.`, corps: `${A_REDIGER}\n\nTexte du bilan psychomoteur, à rédiger par le pack Psychomotricien.` },
    { slug: 'reeducation-psychomotrice', titreCourt: 'Rééducation psychomotrice', titre: 'Rééducation psychomotrice à {ville}', resume: `${A_REDIGER} Résumé des séances.`, corps: `${A_REDIGER}\n\nTexte des séances, à rédiger par le pack Psychomotricien.` },
  ],
};

export const PACKS_PROFESSIONS: Readonly<Record<string, PackProfession>> = { podologue: PODOLOGUE, psychomotricien: PSYCHOMOTRICIEN };

/** Pack d'une profession (alias ramenés) ; inconnue → pack de la profession par défaut */
export const packProfession = (slug: string | null | undefined): PackProfession => PACKS_PROFESSIONS[idProfession(slug)] ?? PACKS_PROFESSIONS[PROFESSION_PAR_DEFAUT];

/** Textes d'un pack qui contiennent encore un texte provisoire (chemins lisibles) */
export function textesProvisoiresDuPack(p: PackProfession): string[] {
  const res: string[] = [];
  const voir = (chemin: string, v: unknown) => {
    if (typeof v === 'string') { if (PROVISOIRE.test(v)) res.push(chemin); }
    else if (Array.isArray(v)) v.forEach((x, i) => voir(`${chemin}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) voir(chemin ? `${chemin}.${k}` : k, x);
  };
  voir('', { ...p, defauts: { accrocheTitre: p.defauts.accrocheTitre, faq: p.defauts.faq({ pmr: true, plateforme: 'Doctolib', enLigne: true }) } });
  return res;
}

/** Publication d'un site de cette profession : refusée tant que le pack n'est pas publiable (textes « [à rédiger] ») */
export function verifierPackPubliable(slug: string | null | undefined): { ok: boolean; erreurs: string[] } {
  const p = packProfession(slug);
  const provisoires = textesProvisoiresDuPack(p);
  const erreurs = [
    ...(p.publiable ? [] : [`Le pack « ${p.profession} » n’est pas encore publiable (textes à relire).`]),
    ...provisoires.map((c) => `Texte provisoire : ${c}`),
  ];
  return { ok: erreurs.length === 0, erreurs };
}
