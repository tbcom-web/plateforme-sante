import { marked } from 'marked';
import { espacesFines, REPLIS, telephoneUtilisable, type SiteConfig } from '@plateforme/core';
import { chargerDepuisSupabase } from './supabase';

const sites = import.meta.glob<SiteConfig>('../data/sites/*.ts', { eager: true, import: 'default' });

const SITE_ID = (import.meta.env.SITE_ID as string | undefined) ?? process.env.SITE_ID ?? 'demo-podologue-lyon';
const local = Object.entries(sites).find(([path]) => path.endsWith(`/${SITE_ID}.ts`));

// Site décrit dans un fichier local (démos), sinon chargé depuis Supabase.
const charge: SiteConfig = local ? local[1] : await chargerDepuisSupabase(SITE_ID);
// Contrôle local de la découvrabilité (scripts/controle-agents.mjs) : la démo est construite comme un site en ligne.
export const site: SiteConfig = process.env.CONTROLE_INDEXABLE === '1' ? { ...charge, demo: false } : charge;

export const baseUrl = `https://${site.domaine}`;
export const absUrl = (path: string) => new URL(path, baseUrl).toString();

// Replis des informations manquantes (replis.ts) : jamais de nom vide, de « à » orphelin ni de lien « tel: » vide.
export const nomPraticien = `${site.praticien.prenom} ${site.praticien.nom}`.trim() || site.cabinet.nom;
export const metierVille = site.cabinet.ville ? `${site.profession.libelle} à ${site.cabinet.ville}` : site.profession.libelle;
export const adresseComplete = site.cabinet.adresse && site.cabinet.codePostal ? `${site.cabinet.adresse}, ${site.cabinet.codePostal} ${site.cabinet.ville}` : REPLIS.adresse;
export const telLien = telephoneUtilisable(site.cabinet.telephone) ? `tel:${site.cabinet.telephone.replace(/[^\d+]/g, '').replace(/^0/, '+33')}` : '';

/** Markdown → HTML ; espace fine insécable avant « : ; ? ! » dans les intertitres (typographie française). */
export const md = (source: string) =>
  (marked.parse(source, { async: false }) as string).replace(/<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/g, (_, h, attrs, t) => `<${h}${attrs}>${espacesFines(t)}</${h}>`);

export const dateFr = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Lien de prise de RDV compté par le Worker /rdv avant redirection. */
export const rdvHref = (source: string) => `/rdv?src=${encodeURIComponent(source)}`;
