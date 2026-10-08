// Site de DÉMONSTRATION psychomotricien (jamais publié, jamais indexé : test = true → noindex), construit avec le PACK MINIMAL
// provisoire de la profession (packages/core/src/packs-professions.ts) : mêmes recettes que les sites podologues, textes du pack
// (« [à rédiger] » tant que l'agent du pack Psychomotricien ne les a pas écrits ; verifierPackPubliable refuse la publication).
//   SITE_ID=demo-psychomotricien MODELE=tableau PLAN_OSM=non npx astro build --outDir <dossier>
// Les visuels restent ceux de la bibliothèque commune (recettes communes) : les illustrations propres à la psychomotricité
// viendront du Frigo (ingrédients rattachés à la profession).
import { draftVide, modeleDuSite, modeleIntegre, packProfession, packVisuel, validerChoixLogo, type SiteConfig } from '@plateforme/core';
import { assemblerSite, type LigneSoin } from '../../lib/supabase';

const pack = packProfession('psychomotricien');
const d = draftVide();
d.cabinet = { ...d.cabinet, nom: 'Cabinet de psychomotricité [démo]', ville: 'Lyon' };
d.lieux[0] = { ...d.lieux[0], adresse: '12 rue des Tilleuls', codePostal: '69006', ville: 'Lyon' };
d.praticiens[0] = { ...d.praticiens[0], prenom: 'Camille', nom: 'Martin', bio: `${pack.defauts.accrocheTitre}` };
d.theme.modele = process.env.MODELE ?? 'tableau';
const catalogue: LigneSoin[] = (pack.soinsDemo ?? []).map((s) => ({ slug: s.slug, titre_court: s.titreCourt, titre: s.titre, resume: s.resume, corps: s.corps, faq: [], icone: null }));
d.soins = catalogue.map((s) => s.slug);
const visuels = packVisuel(d.theme.specialite);

const site: SiteConfig = assemblerSite({
  ligne: { id: 'demo-psychomotricien', slug: 'demo-psychomotricien', domaine: 'demo-psychomotricien.pages.dev', test: true, options: null, updated_at: '2026-10-09', publiee_le: null },
  apercu: false,
  d,
  prof: { slug: 'psychomotricien', libelle: 'Psychomotricien', specialite_schema: pack.specialiteSchema, ordre: pack.instance.FR },
  catalogue,
  articles: [],
  modele: modeleDuSite(modeleIntegre(d.theme.modele), d.theme),
  pack: visuels,
  visuelsSpecialite: visuels,
  persoPack: null,
  persoSecondaire: null,
  logo: validerChoixLogo(d.theme.logo),
});

export default site;
