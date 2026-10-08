// Cadre des aperçus de l'admin (retour de Paul du 2026-10-07 : « le rendu aperçu mobile est vraiment mauvais, les boutons
// flottants ne sont pas du tout bien placés »). Le rendu est monté dans une iframe de la LARGEUR RÉELLE de l'appareil, réduite
// par transform sur l'iframe : media queries, position fixe, vh, sticky et défilement s'y comportent comme sur l'appareil.
// Ici : la géométrie du cadre (échelle, hauteur de la fenêtre simulée) et le contenu des actions rapides du téléphone
// (barre d'actions, bouton flottant), repris des gabarits du site (Gabarit.astro, Coquille.astro). Fonctions pures, testées.

export type AppareilApercu = 'bureau' | 'mobile';

/** Fenêtres simulées : téléphone 390 × 844 (iPhone 15), ordinateur 1440 × 900 */
export const APPAREILS_APERCU: Record<AppareilApercu, { largeur: number; hauteur: number }> = {
  mobile: { largeur: 390, hauteur: 844 },
  bureau: { largeur: 1440, hauteur: 900 },
};

/** Marge basse du corps de page sur téléphone (Gabarit.astro : body { padding-bottom: 82px } sous 900 px) */
export const MARGE_BARRE_MOBILE = 82;

export type DimensionsCadre = {
  /** Réduction appliquée à l'iframe (transform: scale) */
  echelle: number;
  /** Largeur de la fenêtre simulée (px de l'appareil) */
  largeur: number;
  /** Hauteur de la fenêtre simulée (px de l'appareil) : c'est là que se placent les éléments en position fixe */
  hauteurVue: number;
  /** Encombrement à l'écran (px de l'admin) */
  largeurAffichee: number;
  hauteurAffichee: number;
};

/**
 * Géométrie du cadre.
 * - `vignette` : hauteur affichée imposée (catalogue, cartes de retours) ; la fenêtre simulée en découle.
 * - téléphone avec place (écran large) : le téléphone entier tient dans `hauteurMax` (réduit si besoin).
 * - ordinateur, ou téléphone sur un écran étroit : la largeur prime ; la fenêtre simulée est coupée à `hauteurMax`
 *   (`remplir` : elle occupe toute la hauteur disponible, rendu plein écran).
 */
export function dimensionsCadre(o: { appareil: AppareilApercu; largeurDispo: number; hauteurMax?: number; vignette?: number; remplir?: boolean }): DimensionsCadre {
  const { largeur, hauteur } = APPAREILS_APERCU[o.appareil];
  const dispo = Math.max(1, o.largeurDispo);
  let echelle = Math.min(1, dispo / largeur);
  const max = o.hauteurMax && o.hauteurMax > 0 ? o.hauteurMax : undefined;
  let hauteurAffichee: number;
  if (o.vignette) {
    hauteurAffichee = o.vignette;
  } else if (o.appareil === 'mobile' && dispo >= 480) {
    // Le téléphone entier, jamais en dessous de la moitié de sa taille
    if (max) echelle = Math.max(0.5, Math.min(echelle, max / hauteur));
    hauteurAffichee = hauteur * echelle;
  } else {
    const naturelle = hauteur * echelle;
    hauteurAffichee = max ? (o.remplir ? max : Math.min(naturelle, max)) : naturelle;
  }
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return {
    echelle: r(echelle),
    largeur,
    hauteurVue: Math.round(hauteurAffichee / echelle),
    largeurAffichee: Math.round(largeur * echelle),
    hauteurAffichee: Math.round(hauteurAffichee),
  };
}

export type IconeAction = 'telephone' | 'rendez-vous' | 'itineraire' | 'courriel';
export type ActionRapide = { libelle: string; icone: IconeAction; plein: boolean; via?: string };
export type ActionsRapides =
  | { forme: 'barre'; actions: ActionRapide[] }
  | { forme: 'barre-classique'; appel: boolean; actions: ActionRapide[] }
  | { forme: 'flottant'; action: ActionRapide };

/**
 * Actions rapides du téléphone, exactement comme le site :
 * - gabarit classique (Gabarit.astro, .barre-mobile) : [Appeler] Rendez-vous [Itinéraire], ou l'action de contact + Itinéraire ;
 * - gabarits tableau, village, revue (Coquille.astro) : barre .c-barre (Appeler | Rendez-vous, ou Appeler le cabinet | Itinéraire),
 *   ou bouton flottant (variante « contact : flottant ») portant l'action principale (rendez-vous, sinon appeler, sinon écrire).
 * `null` : rien à montrer.
 */
export function actionsRapides(o: {
  gabarit: 'classique' | 'tableau' | 'village' | 'revue';
  contact?: string | null;
  rdvEnLigne: boolean;
  aTelephone: boolean;
  aAdresse: boolean;
  email?: string | null;
  libelleContact: string;
  via?: string;
}): ActionsRapides | null {
  if (o.gabarit === 'classique') {
    const actions: ActionRapide[] = o.rdvEnLigne
      ? [...(o.aTelephone ? [{ libelle: 'Appeler', icone: 'telephone' as const, plein: false }] : []), { libelle: 'Rendez-vous', icone: 'rendez-vous', plein: true, ...(o.via ? { via: o.via } : {}) }]
      : [{ libelle: o.libelleContact, icone: o.aTelephone ? 'telephone' : 'rendez-vous', plein: true }];
    if (o.aAdresse) actions.push({ libelle: 'Itinéraire', icone: 'itineraire', plein: false });
    return { forme: 'barre-classique', appel: !o.rdvEnLigne, actions };
  }
  if (o.contact === 'flottant') {
    const action: ActionRapide | null = o.rdvEnLigne ? { libelle: 'Prendre rendez-vous', icone: 'rendez-vous', plein: true }
      : o.aTelephone ? { libelle: 'Appeler le cabinet', icone: 'telephone', plein: true }
      : o.email ? { libelle: 'Écrire au cabinet', icone: 'courriel', plein: true }
      : o.aAdresse ? { libelle: 'Itinéraire', icone: 'itineraire', plein: true } : null;
    return action ? { forme: 'flottant', action } : null;
  }
  const actions: ActionRapide[] = [];
  if (o.aTelephone) actions.push({ libelle: o.rdvEnLigne ? 'Appeler' : 'Appeler le cabinet', icone: 'telephone', plein: !o.rdvEnLigne });
  else if (!o.rdvEnLigne) actions.push({ libelle: o.libelleContact, icone: 'rendez-vous', plein: true });
  if (o.rdvEnLigne) actions.push({ libelle: 'Rendez-vous', icone: 'rendez-vous', plein: true });
  else if (o.aAdresse) actions.push({ libelle: 'Itinéraire', icone: 'itineraire', plein: false });
  return { forme: 'barre', actions };
}

/**
 * Doublon « bouton d'appel » (retour de Paul du 2026-10-08 : « sur mobile, on peut éviter le doublon APPELER LE CABINET s'il
 * apparaît déjà dans le bandeau du bas »). Plages de largeur où la barre du bas (visible sous 900 px) porte l'appel :
 * - `large` : 760 à 899 px ; `etroit` : sous 760 px (la barre d'onglets du menu « onglets », gabarits coquille, y remplace
 *   la barre d'actions : son bouton plein est le lien de rendez-vous, l'appel seulement sans rendez-vous en ligne).
 * Bouton flottant (variante « contact : flottant ») : ce n'est pas un bandeau, rien n'est masqué (hors barre d'onglets).
 * Gabarit classique : sa barre (.barre-mobile) porte toujours l'appel quand il y a un téléphone (pas de barre d'onglets).
 */
export function appelDansBarre(o: { gabarit: 'classique' | 'tableau' | 'village' | 'revue'; contact?: string | null; menuMobile?: string | null; rdvEnLigne: boolean; aTelephone: boolean }): { etroit: boolean; large: boolean } {
  if (!o.aTelephone) return { etroit: false, large: false };
  if (o.gabarit === 'classique') return { etroit: true, large: true };
  const barre = o.contact !== 'flottant';
  const onglets = o.menuMobile === 'onglets';
  return { large: barre, etroit: onglets ? !o.rdvEnLigne : barre };
}

/** Valeur de l'attribut data-appel-barre de la racine (site) : plages où le doublon est masqué, absent si aucune */
export function attributAppelBarre(p: { etroit: boolean; large: boolean }): 'tout' | 'etroit' | 'large' | undefined {
  return p.etroit && p.large ? 'tout' : p.etroit ? 'etroit' : p.large ? 'large' : undefined;
}

/**
 * Boutons d'appel masqués (affichage seulement : le lien reste dans le HTML, SEO identique ; ordinateur inchangé) : liens
 * tel: directs d'un groupe de boutons du premier écran (.hp__actions des premiers écrans photo, .appel-groupe posé sur les
 * groupes des gabarits) et éléments .appel-bouton de ces groupes (élément de liste du bandeau de contact). Le numéro en texte (coordonnées, pied
 * de page, page Accès) n'est jamais dans ces groupes. Un groupe qui ne contient plus que des boutons d'appel disparaît (pas
 * de trou) ; les autres boutons gardent leur mise en page (grille pleine largeur sur téléphone).
 */
const GROUPE_APPEL = ':is(.appel-groupe,.hp__actions)';
const BOUTON_APPEL = 'a[href^="tel:"],.appel-bouton';
const masquerAppel = (racine: string) => `${racine} ${GROUPE_APPEL}>:is(${BOUTON_APPEL}){display:none!important}${racine} ${GROUPE_APPEL}:not(:has(>:not(${BOUTON_APPEL}))){display:none!important}`;
export const CSS_APPEL_DOUBLON = `@media (max-width:759px){${masquerAppel(':is([data-appel-barre=tout],[data-appel-barre=etroit])')}}`
  + `@media (min-width:760px) and (max-width:899px){${masquerAppel(':is([data-appel-barre=tout],[data-appel-barre=large])')}}`;

/** Aperçu de l'admin (téléphone : 390 px, plage « étroit ») : le bouton d'appel du premier écran est-il retiré ? */
export const appelMasqueApercu = (mobile: boolean, p: { etroit: boolean; large: boolean }) => mobile && p.etroit;
