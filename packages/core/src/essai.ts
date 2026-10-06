// Essai gratuit de 3 mois (« onboarding lead ») : fonctions pures, sans accès réseau ni horloge cachée.
// Un pédicure-podologue s'inscrit depuis la page /essai, crée sa version d'essai dans le parcours guidé (/creer) et la voit
// en APERÇU privé (branche Cloudflare « apercu », jamais indexée). La mise en ligne publique sur son domaine n'a lieu
// qu'après validation manuelle par la commerciale (/admin/leads). Voir docs/onboarding-lead.md.
//
// Ce fichier calcule : dates d'essai, jours restants, progression du parcours, garde « essai = aperçu seulement »,
// relances commerciales à faire (moteur de planification, sans envoi) et prochaine étape affichée au praticien.

/** Durée de l'essai gratuit, en mois calendaires. */
export const DUREE_ESSAI_MOIS = 3;

/** Version des CGU de l'essai acceptées à l'inscription (docs/juridique/cgu-essai.md). */
export const CGU_ESSAI_VERSION = '2026-10-brouillon';

/** Conservation d'un compte d'essai non converti après la fin de l'essai (politique de confidentialité). */
export const CONSERVATION_ESSAI_MOIS = 6;

export const STATUTS_COMMERCIAUX = [
  { id: 'nouveau', libelle: 'Nouveau' },
  { id: 'contacte', libelle: 'Contacté' },
  { id: 'rendez_vous', libelle: 'Rendez-vous' },
  { id: 'gagne', libelle: 'Gagné' },
  { id: 'perdu', libelle: 'Perdu' },
] as const;
export type StatutCommercial = (typeof STATUTS_COMMERCIAUX)[number]['id'];

export const libelleStatutCommercial = (s: string | null | undefined) => STATUTS_COMMERCIAUX.find((x) => x.id === s)?.libelle ?? 'Nouveau';

const JOUR_MS = 86_400_000;

/** Date du jour (AAAA-MM-JJ) à Paris : les relances se comptent en jours calendaires français. */
export function jourParis(instant: Date | number | string): string {
  const d = new Date(instant);
  // en-CA donne directement le format AAAA-MM-JJ.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Ajoute des jours à une date AAAA-MM-JJ (calcul en UTC, sans effet d'heure d'été). */
export function ajouterJours(jour: string, n: number): string {
  const [a, m, j] = jour.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j) + n * JOUR_MS).toISOString().slice(0, 10);
}

/** Écart en jours entre deux dates AAAA-MM-JJ (b − a). */
export function ecartJours(a: string, b: string): number {
  const v = (s: string) => { const [x, y, z] = s.split('-').map(Number); return Date.UTC(x, y - 1, z); };
  return Math.round((v(b) - v(a)) / JOUR_MS);
}

/**
 * Fin de l'essai : début + 3 mois calendaires (même heure). Un jour qui n'existe pas dans le mois d'arrivée
 * (31 → 30 avril, 29-31 → février) est ramené au dernier jour de ce mois.
 */
export function finEssai(debut: Date | string | number, mois = DUREE_ESSAI_MOIS): Date {
  const d = new Date(debut);
  const cible = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + mois, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  const dernier = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  cible.setUTCDate(Math.min(d.getUTCDate(), dernier));
  return cible;
}

/** Jours restants avant la fin de l'essai (0 le dernier jour et après), en jours calendaires de Paris. */
export function joursRestants(fin: Date | string | number, maintenant: Date | string | number): number {
  return Math.max(0, ecartJours(jourParis(maintenant), jourParis(fin)));
}

/** Prolongation : la nouvelle fin part de la fin actuelle, ou d'aujourd'hui si l'essai est déjà terminé. */
export function prolongerEssai(fin: Date | string | number, jours: number, maintenant: Date | string | number): Date {
  const base = Math.max(new Date(fin).getTime(), new Date(maintenant).getTime());
  return new Date(base + Math.max(0, Math.round(jours)) * JOUR_MS);
}

/** Nombre d'étapes du parcours guidé (/creer) ; 7 = écran de vérification atteint. */
export const ETAPES_PARCOURS_ESSAI = 6;

/**
 * Progression du parcours, en pourcentage : chaque étape atteinte compte, l'écran de vérification et la première version
 * d'essai générée aussi (8 jalons). `etape` : étape la plus avancée atteinte (0 = inscrit, 1 à 6, 7 = vérification).
 */
export function progressionParcours(p: { etape: number | null | undefined; apercuGenere: boolean }): number {
  const etape = Math.max(0, Math.min(ETAPES_PARCOURS_ESSAI + 1, Math.floor(Number(p.etape) || 0)));
  if (p.apercuGenere) return 100;
  return Math.round((etape / (ETAPES_PARCOURS_ESSAI + 2)) * 100);
}

/** Parcours terminé : version d'essai générée au moins une fois. */
export const parcoursTermine = (p: { etape: number | null | undefined; apercuGenere: boolean }) => progressionParcours(p) >= 100;

/** Libellé de l'arrêt dans le parcours guidé d'un compte en essai (relance du lendemain). */
export function libelleArretParcours(etape: number | null | undefined, apercuGenere = false): string {
  const n = Math.max(0, Math.floor(Number(etape) || 0));
  if (apercuGenere) return 'Version d’essai générée';
  if (n <= 0) return 'Compte créé, parcours non commencé';
  if (n >= 7) return 'Compte créé, parcours terminé, version d’essai non générée';
  return `Compte créé, parcours arrêté à l’étape ${n} sur 6`;
}

export type GardeProduction = { autorisee: true } | { autorisee: false; raison: string };

/**
 * Garde « essai = aperçu seulement » : un site issu d'un essai n'est publié en production (site public, sur son
 * domaine) qu'une fois l'essai validé par la commerciale, quel que soit le demandeur (praticien ou admin : l'admin
 * passe par « Valider et mettre en ligne »). Même règle en SQL (demander_publication) et dans le workflow
 * (apps/sites/scripts/publication.mjs).
 */
export function gardeProduction(e: { enEssai: boolean; valideLe: string | null | undefined }): GardeProduction {
  if (!e.enEssai || e.valideLe) return { autorisee: true };
  return { autorisee: false, raison: 'Version d’essai : la mise en ligne publique se fait après validation par votre conseillère.' };
}

// ---------------------------------------------------------------------------------------------------------------------
// Relances commerciales (moteur de planification ; aucun envoi : la commerciale relance elle-même)
// ---------------------------------------------------------------------------------------------------------------------

export type CodeRelance = 'j1_parcours' | 'j7' | 'j60' | 'fin_moins_15' | 'fin_moins_1' | 'fin_essai' | 'manuelle';

export type EssaiPourRelances = {
  /** Début et fin de l'essai (horodatages ISO) */
  debut: string;
  fin: string;
  etape: number | null;
  apercuGenere: boolean;
  statutCommercial: string | null;
  /** Relances déjà faites : code → date AAAA-MM-JJ */
  faites: Record<string, string> | null;
  /** Relance programmée à la main par la commerciale (AAAA-MM-JJ) */
  prochaineRelance: string | null;
  valideLe: string | null;
  paye: boolean;
  suspenduLe: string | null;
};

export type Relance = {
  code: CodeRelance;
  /** Date prévue (AAAA-MM-JJ, Paris) */
  date: string;
  libelle: string;
  /** Ce qu'il y a à faire */
  action: 'relancer' | 'suspendre';
  faite: boolean;
  /** Prévue aujourd'hui ou en retard, pas encore faite */
  aFaire: boolean;
};

const LIBELLES_RELANCES: Record<CodeRelance, string> = {
  j1_parcours: 'Lendemain de l’inscription : aider à terminer le parcours',
  j7: 'Une semaine : premier retour sur la version d’essai',
  j60: 'Deux mois : point sur le site et la mise en ligne',
  fin_moins_15: 'Fin d’essai dans 15 jours',
  fin_moins_1: 'Fin d’essai demain',
  fin_essai: 'Essai terminé : suspendre l’aperçu (sauf paiement ou validation)',
  manuelle: 'Relance programmée',
};

/**
 * Relances d'un essai, dans l'ordre chronologique :
 * - J+1 si le parcours n'est pas terminé (aucune version d'essai générée) ;
 * - J+7, J+60 ;
 * - 15 jours et 1 jour avant la fin de l'essai ;
 * - fin de l'essai : suspension de l'aperçu, sauf paiement ou validation ;
 * - la relance programmée à la main par la commerciale.
 * Rien n'est proposé pour un essai gagné, perdu, validé, payé ou suspendu (sauf la relance manuelle).
 */
export function relancesEssai(e: EssaiPourRelances, aujourdhui: string): Relance[] {
  const faites = e.faites ?? {};
  const debut = jourParis(e.debut);
  const fin = jourParis(e.fin);
  const clos = e.statutCommercial === 'gagne' || e.statutCommercial === 'perdu' || Boolean(e.valideLe) || e.paye || Boolean(e.suspenduLe);
  const prevues: { code: CodeRelance; date: string; action?: Relance['action'] }[] = [];
  if (!clos) {
    if (!parcoursTermine({ etape: e.etape, apercuGenere: e.apercuGenere }) || faites.j1_parcours) prevues.push({ code: 'j1_parcours', date: ajouterJours(debut, 1) });
    prevues.push({ code: 'j7', date: ajouterJours(debut, 7) });
    prevues.push({ code: 'j60', date: ajouterJours(debut, 60) });
    prevues.push({ code: 'fin_moins_15', date: ajouterJours(fin, -15) });
    prevues.push({ code: 'fin_moins_1', date: ajouterJours(fin, -1) });
    prevues.push({ code: 'fin_essai', date: fin, action: 'suspendre' });
  }
  if (e.prochaineRelance && /^\d{4}-\d{2}-\d{2}$/.test(e.prochaineRelance) && e.statutCommercial !== 'perdu') {
    prevues.push({ code: 'manuelle', date: e.prochaineRelance });
  }
  // Après une prolongation, une relance « avant la fin » antérieure au début n'a pas de sens : filtrée.
  return prevues
    .filter((r) => r.code === 'manuelle' || r.date >= debut)
    .map((r) => {
      const faite = r.code === 'manuelle' ? false : Boolean(faites[r.code]);
      return { code: r.code, date: r.date, libelle: r.code === 'j1_parcours' ? libelleArretParcours(e.etape, e.apercuGenere) : LIBELLES_RELANCES[r.code], action: r.action ?? 'relancer', faite, aFaire: !faite && r.date <= aujourdhui };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Relances à faire aujourd'hui (prévues aujourd'hui ou en retard). Une relance dépassée par une plus récente du même essai est regroupée. */
export function relancesAFaire(e: EssaiPourRelances, aujourdhui: string): Relance[] {
  const dues = relancesEssai(e, aujourdhui).filter((r) => r.aFaire);
  // Les relances automatiques en retard se résument à la plus récente (inutile de relancer trois fois le même jour).
  const auto = dues.filter((r) => r.code !== 'manuelle');
  const manuelle = dues.filter((r) => r.code === 'manuelle');
  return [...(auto.length ? [auto[auto.length - 1]] : []), ...manuelle];
}

/** Prochaine relance (à faire ou à venir), pour la colonne « prochaine relance » de la liste. */
export function prochaineRelance(e: EssaiPourRelances, aujourdhui: string): Relance | null {
  return relancesEssai(e, aujourdhui).find((r) => !r.faite) ?? null;
}

/**
 * Message proposé pour une relance (la commerciale le copie dans sa messagerie ; l'envoi automatique est désactivé).
 * Ton sobre, sans promesse ni superlatif.
 */
export function messageRelance(code: CodeRelance, v: { prenom: string; finEssai: string; lienEssai: string | null; conseillere?: string }): { objet: string; corps: string } {
  const bonjour = `Bonjour${v.prenom ? ` ${v.prenom}` : ''},`;
  const signature = `\n\nBien cordialement,\n${v.conseillere || 'Votre conseillère Webpodologue'}`;
  const lien = v.lienEssai ? `\n\nVotre version d’essai : ${v.lienEssai}` : '';
  const finLisible = v.finEssai;
  switch (code) {
    case 'j1_parcours':
      return {
        objet: 'Votre site de cabinet : reprendre la création',
        corps: `${bonjour}\n\nVous avez commencé hier la création du site de votre cabinet. Vos informations sont enregistrées : vous pouvez reprendre là où vous vous êtes arrêté(e), depuis votre espace.\n\nSi une étape vous pose question, répondez simplement à ce message : je peux vous accompagner par téléphone.${signature}`,
      };
    case 'j7':
      return {
        objet: 'Votre version d’essai : un premier retour ?',
        corps: `${bonjour}\n\nVotre version d’essai est en place depuis une semaine. Avez-vous des questions sur les textes, les soins présentés ou la mise en page ?${lien}\n\nJe peux vous proposer un court échange téléphonique pour faire le point.${signature}`,
      };
    case 'j60':
      return {
        objet: 'Votre site : faire le point sur la mise en ligne',
        corps: `${bonjour}\n\nVotre essai se poursuit jusqu’au ${finLisible}. C’est le bon moment pour préparer la mise en ligne sur votre nom de domaine : je vérifie avec vous les informations du cabinet et votre inscription à l’Ordre avant toute publication.${lien}${signature}`,
      };
    case 'fin_moins_15':
      return {
        objet: 'Votre essai se termine le ' + finLisible,
        corps: `${bonjour}\n\nVotre essai gratuit se termine le ${finLisible}. Pour conserver votre site et le mettre en ligne, vous pouvez passer à l’abonnement depuis votre espace ou me répondre pour en parler.\n\nSans suite de votre part, la version d’essai sera suspendue à cette date. Vous n’avez aucun engagement.${signature}`,
      };
    case 'fin_moins_1':
      return {
        objet: 'Votre essai se termine demain',
        corps: `${bonjour}\n\nVotre essai gratuit se termine demain (${finLisible}). Si vous souhaitez conserver votre site, il suffit de passer à l’abonnement depuis votre espace ou de me répondre.${signature}`,
      };
    case 'fin_essai':
      return {
        objet: 'Votre version d’essai est suspendue',
        corps: `${bonjour}\n\nVotre essai gratuit est arrivé à son terme et votre version d’essai a été suspendue. Vos informations sont conservées quelque temps : vous pouvez reprendre à tout moment en me répondant.${signature}`,
      };
    default:
      return { objet: 'Votre site de cabinet', corps: `${bonjour}\n\n${signature}` };
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Tableau de bord du praticien en essai
// ---------------------------------------------------------------------------------------------------------------------

export type EtapeEssaiPraticien =
  | { id: 'terminer_parcours'; titre: string; texte: string }
  | { id: 'generer'; titre: string; texte: string }
  | { id: 'demander_mise_en_ligne'; titre: string; texte: string }
  | { id: 'attente_validation'; titre: string; texte: string }
  | { id: 'termine'; titre: string; texte: string }
  | { id: 'suspendu'; titre: string; texte: string };

/** Prochaine étape proposée au praticien en essai (tableau de bord). */
export function prochaineEtapeEssai(e: {
  etape: number | null;
  apercuGenere: boolean;
  miseEnLigneDemandee: boolean;
  suspendu: boolean;
  joursRestants: number;
  paye: boolean;
}): EtapeEssaiPraticien {
  if (e.suspendu) return { id: 'suspendu', titre: 'Votre version d’essai est suspendue', texte: 'Contactez-nous pour la réactiver : vos informations sont conservées.' };
  if (!e.apercuGenere && (Number(e.etape) || 0) < ETAPES_PARCOURS_ESSAI + 1) {
    return { id: 'terminer_parcours', titre: 'Terminer la création', texte: 'Reprenez le parcours là où vous l’avez laissé : vos informations sont enregistrées.' };
  }
  if (!e.apercuGenere) return { id: 'generer', titre: 'Voir votre site', texte: 'Générez votre version d’essai : un lien privé, non indexé, que vous pouvez partager.' };
  if (e.joursRestants <= 0 && !e.paye) return { id: 'termine', titre: 'Essai terminé', texte: 'Passez à l’abonnement ou contactez votre conseillère pour conserver votre site.' };
  if (!e.miseEnLigneDemandee) {
    return { id: 'demander_mise_en_ligne', titre: 'Demander la mise en ligne', texte: 'Quand votre site vous convient, votre conseillère vérifie les informations du cabinet et votre inscription à l’Ordre, puis le met en ligne sur votre nom de domaine.' };
  }
  return { id: 'attente_validation', titre: 'Mise en ligne demandée', texte: 'Votre conseillère vous contacte pour vérifier les informations avant la mise en ligne publique.' };
}
