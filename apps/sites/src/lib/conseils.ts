// Fiches conseils du site (core/conseils-patients.ts) : bloc « Fiches conseils » des pages de soin, page /conseils et une page par
// fiche. Site publié (Supabase, lib/supabase.ts) : `site.conseils` = fiches ACCEPTÉES par Paul et cochées par le praticien.
// Démonstrations locales (data/sites/*.ts, jamais publiées) : fiches du pack de la profession liées aux soins du site.
import { conseilsDuSite, conseilsDuSoin as duSoin, type ConseilPatient } from '@plateforme/core';
import { site } from './site';
import { conseilsDeProfession } from './conseils-packs';

export const conseils: ConseilPatient[] = site.conseils
  ?? conseilsDuSite({ conseils: conseilsDeProfession(site.profession.slug), soinsDuSite: site.soins.map((s) => s.slug) });

/** Fiches liées à un soin du site (3 au plus) */
export const conseilsDuSoin = (slug: string) => duSoin(slug, conseils);

/** Soins du site liés à une fiche (liens existants seulement) */
export const soinsDuConseil = (c: ConseilPatient) => site.soins.filter((s) => c.soins.includes(s.slug));
