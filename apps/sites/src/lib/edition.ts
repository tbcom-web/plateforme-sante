// Éditeur visuel : textes personnalisés (surcouche du standard) et marquage des zones modifiables.
// Les marqueurs (data-champ, data-photo) et le script d'édition n'existent que dans l'aperçu (APERCU=1),
// jamais sur le site publié.
import { textePerso } from '@plateforme/core';
import { site } from './site';

export const APERCU = process.env.APERCU === '1';

/** Textes standard rencontrés au rendu (pour « Revenir au standard » dans l'éditeur). */
export const STANDARDS = new Map<string, string>();

/** Texte personnalisé par le praticien s'il existe, sinon le texte standard. */
export const texte = (cle: string, standard: string) => {
  if (APERCU) STANDARDS.set(cle, standard);
  return textePerso(site.textes, cle, standard);
};

/** Attributs d'une zone de texte modifiable (à étaler sur l'élément : {...champ('accueil.chapo')}). */
export const champ = (cle: string): Record<string, string> => (APERCU ? { 'data-champ': cle } : {});

/** Attributs d'une photo remplaçable : photos.accueil, photos.panorama, photos.cabinet.N, praticien.N.photo */
export const zonePhoto = (emplacement: string): Record<string, string> => (APERCU ? { 'data-photo': emplacement } : {});

/** Origines autorisées à piloter l'aperçu (back-office). */
export const ORIGINES_ADMIN = (process.env.ADMIN_ORIGINS ?? 'http://localhost:3001,https://admin.webpodologue.fr').split(',').map((o) => o.trim()).filter(Boolean);
