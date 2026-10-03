// Textes par défaut par profession, utilisés tant que le praticien ne les a pas personnalisés.
import type { Faq } from '@plateforme/core';

type Defauts = {
  accrocheTitre: string;
  faq: (o: { pmr: boolean; plateforme: string }) => Faq[];
};

const PODOLOGUE: Defauts = {
  accrocheTitre: 'Prendre soin de vos pieds, à chaque étape de la vie',
  faq: ({ pmr, plateforme }) => [
    {
      q: 'Comment prendre rendez-vous ?',
      r: `En ligne sur ${plateforme}, 24h/24, ou par téléphone aux heures d’ouverture du cabinet.`,
    },
    {
      q: 'Le cabinet est-il accessible aux personnes à mobilité réduite ?',
      r: pmr
        ? 'Oui, le cabinet est accessible aux personnes à mobilité réduite.'
        : 'Merci de nous contacter avant votre venue : nous vous indiquerons les conditions d’accès.',
    },
    {
      q: 'Les soins sont-ils remboursés ?',
      r: 'Les soins de pédicurie courants ne sont pas remboursés, sauf pour les patients diabétiques sur prescription. Les semelles orthopédiques sont partiellement remboursées sur prescription. Votre complémentaire santé peut compléter.',
    },
  ],
};

const DEFAUTS: Record<string, Defauts> = { podologue: PODOLOGUE };

export const defautsProfession = (slug: string) => DEFAUTS[slug] ?? PODOLOGUE;
