// Visuels des soins : jeu visuel de la spécialité du site (packages/core/src/jeux.ts, source unique partagée
// avec l'aperçu de l'admin). Chaque soin du catalogue a une photo (et son cadrage), un dessin technique et
// une animation facultative ; une photo fournie par le praticien pour un soin passe toujours en premier.
import { jeuVisuel, visuelSoinJeu, type NomDessin, type VisuelCase } from '@plateforme/core';
import { site } from './site';

export type VisuelSoin = VisuelCase;

/** Jeu visuel du site : spécialité principale, secondaire et personnalisations de l'admin */
export const jeu = jeuVisuel(site.visuels.specialite, site.visuels.specialiteSecondaire, site.visuels.perso, site.visuels.persoSecondaire);

/** Photos fournies par le praticien pour ses soins (facultatif, clé = slug du soin) */
const photosPraticien = site.photos.soins ?? {};

/** Photo du praticien pour un soin, s'il en a fourni une */
export const photoPraticienSoin = (slug: string): string | undefined => photosPraticien[slug] || undefined;

/** Visuels d'un soin : photo (praticien d'abord), cadrage, dessin et animation */
export const visuelSoin = (slug: string): VisuelSoin => visuelSoinJeu(jeu, slug, photoPraticienSoin(slug));

/** Photo de la banque associée à un dessin (couvertures d'articles en mode photos, par exemple) */
export const photoDessin = (nom: NomDessin) => jeu.photosDessins[nom] ?? jeu.photosDessins.analyse;
