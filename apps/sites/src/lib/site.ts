import { marked } from 'marked';
import type { SiteConfig } from './types';

const sites = import.meta.glob<SiteConfig>('../data/sites/*.ts', { eager: true, import: 'default' });

const SITE_ID = process.env.SITE_ID ?? 'demo-podologue-lyon';
const found = Object.entries(sites).find(([path]) => path.endsWith(`/${SITE_ID}.ts`));
if (!found) throw new Error(`Site introuvable : ${SITE_ID}`);

export const site: SiteConfig = found[1];

export const baseUrl = `https://${site.domaine}`;
export const absUrl = (path: string) => new URL(path, baseUrl).toString();

export const nomPraticien = `${site.praticien.prenom} ${site.praticien.nom}`;
export const metierVille = `${site.profession.libelle} à ${site.cabinet.ville}`;
export const adresseComplete = `${site.cabinet.adresse}, ${site.cabinet.codePostal} ${site.cabinet.ville}`;
export const telLien = `tel:${site.cabinet.telephone.replace(/[^\d+]/g, '').replace(/^0/, '+33')}`;

export const md = (source: string) => marked.parse(source, { async: false }) as string;

export const dateFr = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Lien de prise de RDV compté par le Worker /rdv avant redirection. */
export const rdvHref = (source: string) => `/rdv?src=${encodeURIComponent(source)}`;
