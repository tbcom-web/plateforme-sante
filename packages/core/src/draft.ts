// Brouillon de site édité par le praticien dans le back-office (colonne sites.config).
import type { Horaire, SiteConfig } from './types';

export type MiseEnPage = SiteConfig['theme']['mise_en_page'];
export type StyleImages = SiteConfig['theme']['style_images'];

export type SiteDraft = {
  praticien: { prenom: string; nom: string; titre: string; rpps: string };
  cabinet: {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    quartier: string;
    telephone: string;
    pmr: boolean;
    horaires: Horaire[];
  };
  rdv: { url: string; plateforme: string };
  theme: SiteConfig['theme'];
  /** Slugs des soins choisis dans le catalogue de la profession */
  soins: string[];
};

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export const MISES_EN_PAGE: { value: MiseEnPage; label: string; description: string }[] = [
  { value: 'sobre', label: 'Sobre', description: 'Épuré et professionnel' },
  { value: 'chaleureux', label: 'Chaleureux', description: 'Rond, doux et accueillant' },
  { value: 'premium', label: 'Premium', description: 'Élégant, typographie à empattements' },
];

export const STYLES_IMAGES: { value: StyleImages; label: string }[] = [
  { value: 'organique', label: 'Formes organiques' },
  { value: 'lignes', label: 'Dessin au trait' },
  { value: 'minimal', label: 'Minimaliste' },
];

export const COULEURS_SUGGEREES = ['#2f7d6d', '#2563a8', '#7b4fa0', '#c2553d', '#b0802b', '#3d6b3a', '#334155'];

export const draftVide = (): SiteDraft => ({
  praticien: { prenom: '', nom: '', titre: '', rpps: '' },
  cabinet: {
    nom: '',
    adresse: '',
    codePostal: '',
    ville: '',
    quartier: '',
    telephone: '',
    pmr: false,
    horaires: JOURS.map((jour) => ({
      jour,
      heures: jour === 'Samedi' || jour === 'Dimanche' ? 'Fermé' : '9h00–12h30, 14h00–19h00',
    })),
  },
  rdv: { url: '', plateforme: 'Doctolib' },
  theme: { couleur: COULEURS_SUGGEREES[0], mise_en_page: 'chaleureux', style_images: 'organique' },
  soins: [],
});
