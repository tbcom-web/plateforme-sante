// Textes par défaut par profession, utilisés tant que le praticien ne les a pas personnalisés.
import type { Faq } from '@plateforme/core';

type Defauts = {
  accrocheTitre: string;
  /**
   * enLigne : réservation en ligne possible (lien précis vers la plateforme) ; telephone : numéro publiable ; email : adresse
   * du cabinet (repli quand ni téléphone ni lien en ligne). Absents : valeurs historiques (téléphone présent).
   */
  faq: (o: { pmr: boolean; plateforme: string; enLigne: boolean; telephone?: boolean; email?: string }) => Faq[];
};

const PODOLOGUE: Defauts = {
  accrocheTitre: 'Prendre soin de vos pieds, à chaque étape de la vie',
  faq: ({ pmr, plateforme, enLigne, telephone = true, email = '' }) => [
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
    {
      q: 'Les soins sont-ils remboursés ?',
      r: 'Les soins de pédicurie courants ne sont pas remboursés, sauf pour les patients diabétiques sur prescription. Sur prescription, l’Assurance Maladie rembourse les semelles sur la base d’un tarif réglementaire faible ; le reste peut être pris en charge par la complémentaire santé selon le contrat. Un devis est remis avant fabrication.',
    },
  ],
};

const DEFAUTS: Record<string, Defauts> = { podologue: PODOLOGUE };

export const defautsProfession = (slug: string) => DEFAUTS[slug] ?? PODOLOGUE;
