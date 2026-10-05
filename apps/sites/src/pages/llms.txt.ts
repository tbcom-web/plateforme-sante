// Résumé du cabinet pour les assistants IA, au format llms.txt (https://llmstxt.org) : titre, résumé en
// citation, informations clés, puis sections de liens vers les versions Markdown des pages.
import type { APIRoute } from 'astro';
import { site, absUrl } from '../lib/site';
import { pagesMarkdown, cheminMarkdown, reponseTexte, dateMaj } from '../lib/agents';
import { noms, titreMetierAffiche, lieuExercice, adresseLieu, rdvEnLigne } from '../lib/textes';
import { themesDuSite, pageTheme } from '../lib/navigation';

const lien = (titre: string, path: string, note: string) => `- [${titre}](${absUrl(path)}): ${note}`;

export const GET: APIRoute = () => {
  const pages = new Map(pagesMarkdown().map((p) => [p.path, p]));
  const md = (path: string) => cheminMarkdown(path);
  const lignes = [
    `# ${site.cabinet.nom}`,
    '',
    `> ${noms}, ${titreMetierAffiche.toLowerCase()} ${lieuExercice}. ${site.accroche.texte}`,
    '',
    `Site officiel du cabinet (${absUrl('/')}), mis à jour le ${dateMaj}. Informations factuelles, sans publicité.`,
    '',
    `- Adresse : ${adresseLieu}`,
    `- Téléphone : ${site.cabinet.telephone}`,
    rdvEnLigne ? `- Prise de rendez-vous : en ligne sur ${site.rdv.plateforme} (${site.rdv.url}) ou par téléphone` : `- Prise de rendez-vous : par téléphone au ${site.cabinet.telephone}`,
    ...(site.praticien.conventionnement ? [`- ${site.praticien.conventionnement}`] : []),
    ...site.praticiens.flatMap((p) => p.identifiants.map((i) => `- ${p.prenom} ${p.nom} : ${i}`)),
    `- Accessibilité PMR : ${site.accesDetail.pmr ? 'oui' : 'non'}`,
    ...(site.communes.length ? [`- Communes desservies : ${site.communes.join(', ')}`] : []),
    '',
    '## Le cabinet',
    '',
    lien('Accueil', md('/'), pages.get('/')!.resume),
    lien('Le cabinet et les praticiens', md('/le-cabinet'), 'Praticiens, diplômes, identifiants professionnels, orientations, horaires.'),
    lien('Plan d’accès', md('/acces'), pages.get('/acces')!.resume),
    '',
    // Sujets choisis par le praticien (principaux dans son ordre, puis secondaires) : pages de thème
    ...(themesDuSite.length ? ['## Sujets du cabinet', '', ...themesDuSite.map((t) => lien(pageTheme(t).titre, md(t.href), t.theme.description)), ''] : []),
    '## Compétences',
    '',
    ...site.soins.map((s) => lien(s.titre, md(`/soins/${s.slug}`), s.resume)),
    ...(site.articles.length
      ? ['', '## Conseils', '', ...[...site.articles].sort((a, b) => b.date.localeCompare(a.date)).map((a) => lien(a.titre, md(`/actualites/${a.slug}`), a.resume))]
      : []),
    '',
    '## Optional',
    '',
    lien('Contenu complet', '/llms-full.txt', 'Toutes les pages du site en un seul fichier Markdown.'),
    lien('Mentions légales', '/mentions-legales', 'Éditeur, hébergeur, données personnelles.'),
    lien('Plan du site', '/sitemap.xml', 'Liste des pages HTML avec leur date de mise à jour.'),
    '',
  ];
  return reponseTexte(lignes.join('\n'), 'text/plain');
};
