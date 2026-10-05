// Navigation du site, calculée une fois par le core (themes.ts, construireNavigation) à partir des priorités du praticien
// et des soins cochés : la même pour tous les gabarits (classique, tableau, village, revue), donc des liens identiques
// d'un modèle à l'autre. Thèmes différés (posture) : seulement si activés par le drapeau THEMES_ACTIVES au build.
import { construireNavigation, themeParId, type ThemeDuSite } from '@plateforme/core';
import { site } from './site';
import { noms, titreMetierAffiche, lieuExercice, suffixeVille } from './textes';

const env = (nom: string) => (import.meta.env[nom] as string | undefined) ?? process.env[nom];
export const themesActives = (env('THEMES_ACTIVES') ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export const navigation = construireNavigation(site, site.soins, { actualites: site.articles.length > 0, themesActives });

/** Thèmes qui ont une page (principaux puis secondaires), avec leur rang */
export const themesDuSite: (ThemeDuSite & { principal: boolean })[] = [
  ...navigation.principaux.map((t) => ({ ...t, principal: true })),
  ...navigation.secondaires.map((t) => ({ ...t, principal: false })),
];

/**
 * Accueil (tous les gabarits) : les cartes des sujets principaux (SujetsAccueil) portent déjà leurs soins ; la section
 * Soins qui suit ne montre que les autres (peu d'information d'un coup). Tous portés : un simple lien « Voir tous les
 * soins ». Sans carte de sujet : tous les soins. Aucun intertitre ne change (SEO identique d'un modèle à l'autre).
 */
const soinsDesCartes = new Set(navigation.principaux.flatMap((t) => t.soins));
export const soinsAccueil = site.soins.filter((s) => !soinsDesCartes.has(s.slug));
/** Des soins de l'accueil sont laissés aux cartes des sujets : lien vers la page de tous les soins */
export const soinsAccueilAllege = soinsAccueil.length < site.soins.length;

/** Lien du menu actif sur la page courante (préfixe d'adresse) */
export const lienActif = (href: string, courant: string) => (href === '/' ? courant === '/' : courant === href || courant.startsWith(`${href}/`));

/** Soin du site par slug (pour les listes des pages de thème et des groupes) */
export const soinDuSite = (slug: string) => site.soins.find((s) => s.slug === slug);

/** Picto « picto:<id> » d'un thème */
export const pictoTheme = (id: string) => `picto:${themeParId(id)?.picto ?? 'pied-dessus'}`;

/**
 * Textes d'une page de thème, partagés par la page HTML, sa version Markdown et llms.txt (mêmes données : SEO identique
 * d'un modèle à l'autre). Soins : seulement ceux cochés ; conseils : articles publiés du même thème d'articles.
 */
export function pageTheme(t: ThemeDuSite) {
  const soins = t.soins.map(soinDuSite).filter((s): s is NonNullable<typeof s> => Boolean(s));
  return {
    path: t.href,
    // Sans ville : pas de « à » orphelin (replis de lib/textes.ts)
    titre: `${t.theme.libelle}${suffixeVille}`,
    title: `${t.theme.libelle}${suffixeVille} – ${noms}`,
    description: `${t.theme.description} ${noms}, ${titreMetierAffiche.toLowerCase()}${lieuExercice ? ` ${lieuExercice}` : ''}.`,
    intro: t.theme.intro,
    soins,
    articles: [...site.articles].filter((a) => t.theme.themesFlux.includes(a.theme)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
  };
}
