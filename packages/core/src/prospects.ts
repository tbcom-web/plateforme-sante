// Capture précoce des prospects de l'essai gratuit (avant la création du compte), relances des prospects sans compte,
// entonnoir de l'essai et détection des leads de test : fonctions pures, sans accès réseau ni horloge cachée.
// Voir docs/onboarding-lead.md (parcours) et docs/tester-parcours-lead.md (mode test).
//
// Parcours (migration 0025) : /essai → site commencé en session anonyme (/creer, sans formulaire) → porte du rendu
// (e-mail, téléphone du cabinet, accord de recontact : prospect enregistré par capturer_prospect_essai et lié au compte
// anonyme) → rendu dans le navigateur → « Créez votre accès » (mot de passe + CGU).
// Ancien parcours (0024, toujours accepté) : coordonnées sur /essai puis /essai/inscription (prospects « sans compte »).

import { ajouterJours, jourParis } from './essai';

// ---------------------------------------------------------------------------------------------------------------------
// Leads de test
// ---------------------------------------------------------------------------------------------------------------------

/** Domaine interne : les adresses @webpodologue.fr sont des tests (Paul, la commerciale). */
export const DOMAINE_TEST = '@webpodologue.fr';

/**
 * Lead de test : e-mail se terminant par @webpodologue.fr ou contenant « +test » (ex. prenom.nom+test1@gmail.com).
 * Exclus des statistiques, marqués « test » dans /admin/leads, supprimables par l'admin. Même règle en SQL (0024).
 */
export function estLeadTest(email: string | null | undefined): boolean {
  const e = String(email ?? '').trim().toLowerCase();
  if (!e) return false;
  return e.endsWith(DOMAINE_TEST) || e.includes('+test');
}

// ---------------------------------------------------------------------------------------------------------------------
// Validation de la capture (navigateur, route serveur ; la fonction SQL refait les mêmes contrôles)
// ---------------------------------------------------------------------------------------------------------------------

export const LONGUEUR_MAX_NOM = 80;
export const LONGUEUR_MAX_EMAIL = 200;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Téléphone normalisé, ou null s'il est invalide ('' si vide) : numéro français à 10 chiffres (06 12 34 56 78,
 * +33 6 12 34 56 78, 0033…) ramené à « 06 12 34 56 78 » ; numéro étranger en +XX gardé en chiffres (8 à 15).
 */
export function normaliserTelephone(brut: string | null | undefined): string | null {
  const s = String(brut ?? '').replace(/[\s.\-()/]/g, '');
  if (!s) return '';
  const fr = s.replace(/^(?:\+33|0033)/, '0');
  if (/^0[1-9]\d{8}$/.test(fr)) return fr.replace(/(\d{2})(?=\d)/g, '$1 ');
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

export type SaisieCapture = {
  prenom?: unknown;
  nom?: unknown;
  email?: unknown;
  telephone?: unknown;
  ville?: unknown;
  recontact?: unknown;
  conseils?: unknown;
};

export type Capture = { prenom: string; nom: string; email: string; telephone: string; ville: string; recontact: true; conseils: boolean };

export type ResultatCapture = { ok: true; valeurs: Capture } | { ok: false; erreurs: Partial<Record<keyof Capture, string>> };

const texte = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const vrai = (v: unknown) => v === true || v === 'on' || v === 'true';

/** Contrôle la saisie de l'étape 1. Messages courts, en français, un par champ. */
export function validerCapture(s: SaisieCapture): ResultatCapture {
  const erreurs: Partial<Record<keyof Capture, string>> = {};
  const prenom = texte(s.prenom);
  const nom = texte(s.nom);
  const email = texte(s.email).toLowerCase();
  const ville = texte(s.ville);
  const telephone = normaliserTelephone(texte(s.telephone));
  if (!prenom) erreurs.prenom = 'Indiquez votre prénom.';
  else if (prenom.length > LONGUEUR_MAX_NOM) erreurs.prenom = 'Prénom trop long.';
  if (!nom) erreurs.nom = 'Indiquez votre nom.';
  else if (nom.length > LONGUEUR_MAX_NOM) erreurs.nom = 'Nom trop long.';
  if (!EMAIL.test(email) || email.length > LONGUEUR_MAX_EMAIL) erreurs.email = 'Adresse e-mail invalide.';
  if (telephone === null) erreurs.telephone = 'Numéro de téléphone invalide (ex. 06 12 34 56 78).';
  if (!ville) erreurs.ville = 'Indiquez la ville du cabinet.';
  else if (ville.length > LONGUEUR_MAX_NOM) erreurs.ville = 'Nom de ville trop long.';
  if (!vrai(s.recontact)) erreurs.recontact = 'Cochez la case pour que nous puissions vous recontacter au sujet de votre site.';
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  return { ok: true, valeurs: { prenom, nom, email, telephone: telephone ?? '', ville, recontact: true, conseils: vrai(s.conseils) } };
}

export type PorteRendu = { email: string; telephone: string; recontact: true; conseils: boolean };
export type ResultatPorteRendu = { ok: true; valeurs: PorteRendu } | { ok: false; erreurs: Partial<Record<keyof PorteRendu, string>> };

/**
 * Porte du rendu (« Voir le rendu de mon site ») : e-mail obligatoire, téléphone du cabinet facultatif (pré-rempli depuis
 * le parcours), accord de recontact obligatoire, conseils facultatifs (case séparée, non cochée). Le prénom, le nom et
 * la ville sont repris du brouillon côté serveur (capturer_prospect_essai).
 */
export function validerPorteRendu(s: { email?: unknown; telephone?: unknown; recontact?: unknown; conseils?: unknown }): ResultatPorteRendu {
  const erreurs: Partial<Record<keyof PorteRendu, string>> = {};
  const email = texte(s.email).toLowerCase();
  const telephone = normaliserTelephone(texte(s.telephone));
  if (!EMAIL.test(email) || email.length > LONGUEUR_MAX_EMAIL) erreurs.email = 'Adresse e-mail invalide.';
  if (telephone === null) erreurs.telephone = 'Numéro de téléphone invalide (ex. 04 78 12 34 56).';
  if (!vrai(s.recontact)) erreurs.recontact = 'Cochez la case pour que nous puissions vous recontacter au sujet de votre site.';
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  return { ok: true, valeurs: { email, telephone: telephone ?? '', recontact: true, conseils: vrai(s.conseils) } };
}

const CLES_UTM =['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/** Paramètres de campagne conservés : utm_* seulement, 100 caractères au plus chacun. */
export function utmDepuis(p: { get(cle: string): string | null } | Record<string, unknown> | null | undefined): Record<string, string> {
  if (!p) return {};
  const lire = (k: string) => (typeof (p as { get?: unknown }).get === 'function' ? (p as { get(c: string): string | null }).get(k) : (p as Record<string, unknown>)[k]);
  return Object.fromEntries(CLES_UTM.flatMap((k) => { const v = texte(lire(k)); return v ? [[k, v.slice(0, 100)]] : []; }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Prospects sans compte : étape atteinte et relances
// ---------------------------------------------------------------------------------------------------------------------

export type EtapeProspect = 'capture' | 'inscription' | 'rendu' | 'compte';

export const LIBELLES_ETAPE_PROSPECT: Record<EtapeProspect, string> = {
  capture: 'Coordonnées laissées',
  inscription: 'Création du compte commencée',
  rendu: 'Rendu vu, coordonnées laissées',
  compte: 'Accès créé',
};

export const libelleEtapeProspect = (e: string | null | undefined) => LIBELLES_ETAPE_PROSPECT[(e as EtapeProspect)] ?? LIBELLES_ETAPE_PROSPECT.capture;

export type CodeRelanceProspect = 'p1' | 'p3';

export type ProspectPourRelances = {
  /** Date de la capture (horodatage ISO) */
  creeLe: string;
  /** Compte créé (essai rattaché) : plus de relance « prospect », l'essai prend le relais */
  compteCreeLe: string | null;
  faites: Record<string, string> | null;
};

export type RelanceProspect = { code: CodeRelanceProspect; date: string; libelle: string; faite: boolean; aFaire: boolean };

const JOURS_RELANCE_PROSPECT: Record<CodeRelanceProspect, number> = { p1: 1, p3: 3 };

/** Relances d'un prospect sans compte : lendemain et 3 jours après la capture. Aucune si le compte est créé. */
export function relancesProspect(p: ProspectPourRelances, aujourdhui: string): RelanceProspect[] {
  if (p.compteCreeLe) return [];
  const faites = p.faites ?? {};
  const debut = jourParis(p.creeLe);
  return (Object.keys(JOURS_RELANCE_PROSPECT) as CodeRelanceProspect[]).map((code) => {
    const n = JOURS_RELANCE_PROSPECT[code];
    const date = ajouterJours(debut, n);
    const faite = Boolean(faites[code]);
    return { code, date, libelle: `Prospect sans compte depuis ${n} j`, faite, aFaire: !faite && date <= aujourdhui };
  });
}

/** Relance à faire aujourd'hui : la plus récente en retard (inutile de relancer deux fois le même jour). */
export function relanceProspectAFaire(p: ProspectPourRelances, aujourdhui: string): RelanceProspect | null {
  const dues = relancesProspect(p, aujourdhui).filter((r) => r.aFaire);
  // Une relance « 3 j » faite rend la « 1 j » sans objet.
  if (p.faites?.p3) return null;
  return dues.length ? dues[dues.length - 1] : null;
}

/**
 * Lien de reprise d'un site commencé en session anonyme : la page reprend la session du navigateur (même appareil) et
 * rouvre le parcours. Sur un autre appareil, la session anonyme n'existe pas : un nouveau site est commencé.
 */
export const lienRepriseEssai = (origine: string) => `${origine.replace(/\/$/, '')}/essai/commencer`;

/** Lien de reprise d'un prospect : e-mail dans le fragment (#), jamais transmis au serveur ni aux journaux. */
export const lienRepriseProspect = (origine: string, email: string) => `${origine.replace(/\/$/, '')}/essai/inscription#email=${encodeURIComponent(email)}`;

/** Message proposé pour relancer un prospect sans compte (copié par la commerciale ; aucun envoi automatique). */
export function messageRelanceProspect(code: CodeRelanceProspect, v: { prenom: string; lienReprise: string; conseillere?: string }): { objet: string; corps: string } {
  const bonjour = `Bonjour${v.prenom ? ` ${v.prenom}` : ''},`;
  const signature = `\n\nBien cordialement,\n${v.conseillere || 'Votre conseillère Webpodologue'}`;
  if (code === 'p1') {
    return {
      objet: 'Le site de votre cabinet : reprendre où vous en étiez',
      corps: `${bonjour}\n\nVous avez commencé hier la création du site de votre cabinet sur Webpodologue. Pour continuer, il reste à choisir un mot de passe : ${v.lienReprise}\n\nSi vous avez une question ou préférez être accompagné(e), répondez simplement à ce message ; je peux aussi vous appeler.${signature}`,
    };
  }
  return {
    objet: 'Votre site de cabinet : puis-je vous aider ?',
    corps: `${bonjour}\n\nJe reviens vers vous au sujet du site de votre cabinet. La création prend une dizaine de minutes ; vos informations sont conservées et vous pouvez reprendre ici : ${v.lienReprise}\n\nSi ce n’est pas le moment, aucun problème : dites-le-moi et je ne vous relancerai plus.${signature}`,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Entonnoir de l'essai (statistiques de /admin/leads, sans traceur ni cookie)
// ---------------------------------------------------------------------------------------------------------------------

export type DonneesEntonnoir = {
  /** Chargements de la page /essai par jour (AAAA-MM-JJ, Paris), compteur côté serveur */
  visites: { jour: string; nombre: number }[];
  /**
   * Essais (un par site commencé, session anonyme comprise) : date de création, e-mail connu (compte ou porte du rendu,
   * '' sinon), coordonnées laissées au rendu, accès créé, aperçu, demande, validation.
   */
  essais: {
    creeLe: string;
    email: string;
    renduLe: string | null;
    accesLe: string | null;
    apercuGenereLe: string | null;
    miseEnLigneDemandeeLe: string | null;
    valideLe: string | null;
  }[];
};

export type EtapeEntonnoir = {
  id: 'visites' | 'commences' | 'rendus' | 'acces' | 'apercu' | 'demande' | 'publie';
  libelle: string;
  nombre: number;
  /** Part de l'étape précédente (0-100), null pour la première ou si l'étape précédente est vide */
  taux: number | null;
};

/**
 * Entonnoir sur la période qui commence le jour `depuis` (inclus, Paris) : visites de /essai → sites commencés (session
 * anonyme) → rendu demandé (coordonnées laissées) → accès créé → aperçu privé généré → mise en ligne demandée → validé et
 * mis en ligne. Les étapes après « visites » portent sur les sites commencés dans la période (cohorte). Leads de test
 * exclus (un site anonyme sans e-mail n'est jamais un test reconnaissable : il est compté).
 * Un essai créé par l'ancienne inscription (accès sans rendu) compte comme « rendu demandé ».
 */
export function entonnoirEssai(d: DonneesEntonnoir, depuis: string): EtapeEntonnoir[] {
  const dans = (iso: string) => jourParis(iso) >= depuis;
  const essais = d.essais.filter((e) => !estLeadTest(e.email) && dans(e.creeLe));
  const valeurs: [EtapeEntonnoir['id'], string, number][] = [
    ['visites', 'Visites de la page d’essai', d.visites.filter((v) => v.jour >= depuis).reduce((s, v) => s + Math.max(0, v.nombre), 0)],
    ['commences', 'Sites commencés', essais.length],
    ['rendus', 'Rendu demandé (coordonnées laissées)', essais.filter((e) => e.renduLe || e.accesLe).length],
    ['acces', 'Accès créé', essais.filter((e) => e.accesLe).length],
    ['apercu', 'Aperçu privé généré', essais.filter((e) => e.accesLe && e.apercuGenereLe).length],
    ['demande', 'Mise en ligne demandée', essais.filter((e) => e.accesLe && e.miseEnLigneDemandeeLe).length],
    ['publie', 'Validé et mis en ligne', essais.filter((e) => e.accesLe && e.valideLe).length],
  ];
  return valeurs.map(([id, libelle, nombre], i) => {
    const avant = i ? valeurs[i - 1][2] : 0;
    return { id, libelle, nombre, taux: i && avant > 0 ? Math.round((nombre / avant) * 100) : null };
  });
}
