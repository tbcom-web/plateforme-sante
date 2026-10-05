// Versions Markdown des pages (/index.md, /soins/x.md…), llms.txt et llms-full.txt : le contenu utile du site,
// sans mise en page, pour les assistants IA (ChatGPT, Claude, Perplexity…). Construites à partir des mêmes
// données que les pages HTML, donc identiques quel que soit le modèle de présentation.
import { site, absUrl, dateFr } from './site';
import {
  praticiens, pluriel, noms, lieu, adresseLieu, titreCabinet, titreMetierAffiche, phraseAccueil, rdvEnLigne,
  horairesRegroupes, libelleJours, TYPES_LIEU, itineraire, lieuExercice, telLien,
} from './textes';
import { soinsLies, type Faq } from '@plateforme/core';
import { navigation, themesDuSite, pageTheme } from './navigation';

/** Date de dernière mise à jour du contenu : fiche du site, sinon article le plus récent, sinon jour du build. */
export const dateMaj =
  site.majLe ?? [...site.articles].map((a) => a.date).sort().at(-1) ?? new Date().toISOString().slice(0, 10);

type PageMd = { path: string; titre: string; resume: string; corps: string };

const liste = (lignes: (string | false | undefined | null)[]) => lignes.filter(Boolean).map((l) => `- ${l}`).join('\n');
const faqMd = (faq: Faq[]) => faq.map((f) => `### ${f.q}\n\n${f.r}`).join('\n\n');
/** Intertitres Markdown d'un corps rédigé : décalés d'un niveau sous le titre de section. */
const decaler = (source: string) => source.trim().replace(/^(#{1,5}) /gm, '#$1 ');

const rdv = () =>
  rdvEnLigne
    ? `en ligne sur ${site.rdv.plateforme} : ${site.rdv.url}${site.rdvMode !== 'en_ligne' ? ` ; ou par téléphone au ${site.cabinet.telephone}` : ''}.`
    : `par téléphone au ${site.cabinet.telephone}.`;

const horaires = () =>
  horairesRegroupes().map((h) => `${libelleJours(h.jours)} : ${/\d/.test(h.heures) ? h.heures : 'fermé'}`);

/** Bloc « informations pratiques » commun à l'accueil, au plan d'accès et à llms-full.txt. */
const pratique = () =>
  [
    '## Informations pratiques',
    '',
    liste([
      `Adresse : ${lieu.nom ? `${lieu.nom}, ` : lieu.type !== 'cabinet' ? `${TYPES_LIEU[lieu.type]}, ` : ''}${lieu.adresse}${lieu.complement ? `, ${lieu.complement}` : ''}, ${lieu.codePostal} ${lieu.ville}`,
      `Itinéraire : ${itineraire}`,
      `Téléphone : ${site.cabinet.telephone}`,
      site.cabinet.email && `Courriel : ${site.cabinet.email}`,
      `Prise de rendez-vous : ${rdv()}`,
      site.praticien.conventionnement && `Conventionnement : ${site.praticien.conventionnement}`,
      site.paiements.length > 0 && `Moyens de paiement : ${site.paiements.join(', ')}`,
      ...site.cabinet.tarifs.map((t) => `Tarif, ${t.acte} : ${t.prix}`),
      `Accessibilité aux personnes à mobilité réduite : ${site.accesDetail.pmr ? 'oui' : 'non'}`,
      site.accesDetail.parking && `Stationnement : ${site.accesDetail.parking}`,
      site.accesDetail.transports && `Transports : ${site.accesDetail.transports}`,
      ...site.accesDetail.autres,
      site.domicile.actif &&
        `Visites à domicile : ${[site.domicile.creneaux, site.domicile.secteurs.length ? `secteurs ${site.domicile.secteurs.join(', ')}` : 'sur demande'].filter(Boolean).join(' ; ')}`,
      site.communes.length > 0 && `Communes desservies : ${site.communes.join(', ')}`,
    ]),
    '',
    '### Horaires',
    '',
    liste(horaires()),
    ...site.lieux.slice(1).flatMap((l) => [
      '',
      `### Autre lieu d'exercice : ${l.nom || TYPES_LIEU[l.type]}`,
      '',
      liste([`Adresse : ${l.adresse}${l.complement ? `, ${l.complement}` : ''}, ${l.codePostal} ${l.ville}`, ...horairesRegroupes(l.horaires).map((h) => `${libelleJours(h.jours)} : ${/\d/.test(h.heures) ? h.heures : 'fermé'}`)]),
    ]),
  ].join('\n');

const fichePraticien = (p: (typeof praticiens)[number], detail: boolean) =>
  [
    `### ${p.prenom} ${p.nom}`,
    '',
    liste([
      `${p.titre}${p.statut === 'collaborateur' ? ', collaborateur' : p.statut === 'remplacant' ? ', remplaçant' : ''}`,
      ...p.identifiants,
      p.diplome && `Diplôme : ${p.diplome}`,
      detail && p.formations.length > 0 && `Formations : ${p.formations.join(' ; ')}`,
      p.orientations.length > 0 && `Orientations : ${p.orientations.join(', ')}`,
      detail && p.sports.length > 0 && `Sports suivis : ${p.sports.join(', ')}`,
      detail && p.presence && `Présence au cabinet : ${p.presence}`,
      rdvEnLigne && p.rdvUrl && `Rendez-vous en ligne : ${p.rdvUrl}`,
    ]),
    ...(detail && p.bio ? ['', p.bio] : []),
  ].join('\n');

const lienSoin = (s: (typeof site.soins)[number]) => `[${s.titre}](${absUrl(`/soins/${s.slug}.md`)}): ${s.resume}`;
/** Lien Markdown vers la page d'un thème du cabinet (sujet choisi par le praticien) */
const lienTheme = (t: (typeof themesDuSite)[number]) => `[${pageTheme(t).titre}](${absUrl(`${t.href}.md`)}): ${t.theme.description}`;
/** Sujets du cabinet (accueil Markdown) : principaux dans l'ordre du praticien, puis « Aussi au cabinet » */
const sujetsMd = () => [
  ...(navigation.principaux.length ? ['## Sujets principaux du cabinet', '', liste(themesDuSite.filter((t) => t.principal).map(lienTheme)), ''] : []),
  ...(navigation.secondaires.length ? ['## Aussi au cabinet', '', liste(themesDuSite.filter((t) => !t.principal).map(lienTheme)), ''] : []),
];

/** Toutes les pages disponibles en Markdown (chemin de la page HTML → contenu). */
export const pagesMarkdown = (): PageMd[] => [
  {
    path: '/',
    titre: `${site.cabinet.nom}, ${site.titreMetier.toLowerCase()} à ${site.cabinet.ville}`,
    resume: `${titreCabinet}. ${phraseAccueil}`,
    corps: [
      `## ${pluriel ? 'Praticiens' : 'Praticien'}`,
      '',
      praticiens.map((p) => fichePraticien(p, false)).join('\n\n'),
      '',
      ...sujetsMd(),
      '## Compétences',
      '',
      liste(site.soins.map(lienSoin)),
      '',
      pratique(),
      ...(site.faqGenerale.length ? ['', '## Questions fréquentes', '', faqMd(site.faqGenerale)] : []),
    ].join('\n'),
  },
  {
    path: '/soins',
    titre: `Compétences du cabinet, ${noms}`,
    resume: `Soins et prises en charge proposés par ${noms}, ${titreMetierAffiche.toLowerCase()} à ${site.cabinet.ville}.`,
    corps: liste(site.soins.map(lienSoin)),
  },
  ...themesDuSite.map((t) => {
    const p = pageTheme(t);
    return {
      path: p.path,
      titre: p.titre,
      resume: p.description,
      corps: [
        p.intro,
        '',
        '## Les soins proposés',
        '',
        liste(p.soins.map(lienSoin)),
        ...(p.articles.length ? ['', '## Conseils à lire', '', liste(p.articles.map((a) => `[${a.titre}](${absUrl(`/actualites/${a.slug}.md`)}) (${dateFr(a.date)}): ${a.resume}`))] : []),
        '',
        '## Prendre rendez-vous',
        '',
        `${noms}, ${titreMetierAffiche.toLowerCase()}, ${adresseLieu}. Rendez-vous ${rdv()}`,
      ].join('\n'),
    };
  }),
  ...site.soins.map((s) => ({
    path: `/soins/${s.slug}`,
    titre: s.titre,
    resume: s.resume,
    corps: [
      decaler(s.corps),
      ...(s.faq.length ? ['', '## Questions fréquentes', '', faqMd(s.faq)] : []),
      // Même bloc « À lire aussi » que la page HTML (soins proches proposés par le cabinet)
      ...(soinsLies(s.slug, site.soins).length ? ['', '## À lire aussi', '', liste(soinsLies(s.slug, site.soins).map(lienSoin))] : []),
      '',
      '## Rendez-vous',
      '',
      `${noms}, ${titreMetierAffiche.toLowerCase()}, ${adresseLieu}. Rendez-vous ${rdv()}`,
    ].join('\n'),
  })),
  {
    path: '/le-cabinet',
    titre: `Le cabinet, ${noms}`,
    resume: `${titreCabinet}. ${phraseAccueil}`,
    corps: [`## ${pluriel ? 'Praticiens' : 'Praticien'}`, '', praticiens.map((p) => fichePraticien(p, true)).join('\n\n'), '', pratique()].join('\n'),
  },
  {
    path: '/acces',
    titre: `Plan d'accès, ${titreCabinet}`,
    resume: `Venir au cabinet : ${lieu.nom ? `${lieu.nom}, ` : ''}${adresseLieu}.`,
    corps: pratique(),
  },
  ...(site.articles.length
    ? [
        {
          path: '/actualites',
          titre: `Actualités et conseils, ${site.cabinet.nom}`,
          resume: `Articles de conseil publiés par ${noms}.`,
          corps: liste(
            [...site.articles]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((a) => `[${a.titre}](${absUrl(`/actualites/${a.slug}.md`)}) (${dateFr(a.date)}): ${a.resume}`),
          ),
        },
        ...site.articles.map((a) => ({
          path: `/actualites/${a.slug}`,
          titre: a.titre,
          resume: a.resume,
          corps: [`Publié le ${dateFr(a.date)}, par ${noms}.`, '', decaler(a.corps)].join('\n'),
        })),
      ]
    : []),
];

/** Chemin Markdown d'une page HTML : « / » → « /index.md », « /soins/x » → « /soins/x.md ». */
export const cheminMarkdown = (path: string) => (path === '/' ? '/index.md' : `${path.replace(/\/$/, '')}.md`);

/** Pages ayant une version Markdown (pour le lien rel="alternate" de l'en-tête). */
export const aUneVersionMarkdown = (path: string) => pagesMarkdown().some((p) => p.path === path);

/** Valeur YAML entre guillemets (titres et résumés peuvent contenir « : »). */
const yaml = (v: string) => JSON.stringify(v);

/** Document Markdown d'une page : en-tête YAML (titre, résumé, date, page HTML), contenu, renvoi au plan du site. */
export const documentMarkdown = (p: PageMd) =>
  [
    '---',
    `title: ${yaml(p.titre)}`,
    `description: ${yaml(p.resume)}`,
    `last_updated: ${dateMaj}`,
    `canonical_url: ${absUrl(p.path)}`,
    'lang: fr',
    '---',
    '',
    `# ${p.titre}`,
    '',
    `> ${p.resume}`,
    '',
    p.corps,
    '',
    '## Sitemap',
    '',
    `Toutes les pages du site : [plan du site](${absUrl('/sitemap.md')}).`,
    '',
  ].join('\n');

/** Plan du site en Markdown (/sitemap.md) : pages HTML et leur version Markdown, par rubrique. */
export const planDuSite = () => {
  const pages = pagesMarkdown();
  const ligne = (p: PageMd) => `- [${p.titre}](${absUrl(p.path)}) ([Markdown](${absUrl(cheminMarkdown(p.path))})): ${p.resume}`;
  const rubrique = (titre: string, filtre: (p: PageMd) => boolean) => {
    const choix = pages.filter(filtre);
    return choix.length ? [`## ${titre}`, '', ...choix.map(ligne), ''] : [];
  };
  return [
    `# Plan du site : ${site.cabinet.nom}`,
    '',
    `> Pages du site ${absUrl('/')}, mises à jour le ${dateMaj}.`,
    '',
    ...rubrique('Le cabinet', (p) => !p.path.startsWith('/soins') && !p.path.startsWith('/actualites') && !p.path.startsWith('/themes/')),
    ...rubrique('Sujets du cabinet', (p) => p.path.startsWith('/themes/')),
    ...rubrique('Compétences', (p) => p.path.startsWith('/soins')),
    ...rubrique('Actualités', (p) => p.path.startsWith('/actualites')),
    '## Autres ressources',
    '',
    `- [Résumé pour les assistants IA](${absUrl('/llms.txt')})`,
    `- [Contenu complet](${absUrl('/llms-full.txt')})`,
    `- [Consignes pour les agents](${absUrl('/AGENTS.md')})`,
    `- [Mentions légales](${absUrl('/mentions-legales')})`,
    `- [Plan du site XML](${absUrl('/sitemap.xml')})`,
    '',
  ].join('\n');
};

/** Réponse HTTP d'un fichier texte (Markdown ou llms.txt). */
export const reponseTexte = (corps: string, type: 'text/markdown' | 'text/plain') =>
  new Response(corps, { headers: { 'Content-Type': `${type}; charset=utf-8` } });

/** Section d'une page dans llms-full.txt : titre de niveau 2, résumé, adresse, contenu (titres décalés). */
export const sectionMarkdown = (p: PageMd) =>
  [`## ${p.titre}`, '', `> ${p.resume}`, '', `Page : ${absUrl(p.path)}`, '', p.corps.replace(/^(#{1,5}) /gm, '#$1 '), ''].join('\n');

/**
 * Consignes pour les agents IA qui agissent pour un patient (/AGENTS.md) : ce que le site permet (lire les
 * informations, prendre rendez-vous sur la plateforme, appeler, venir), et les limites d'un site de santé.
 */
export const consignesAgents = () =>
  [
    `# ${site.cabinet.nom} : consignes pour les agents IA`,
    '',
    `> Site officiel de ${noms}, ${titreMetierAffiche.toLowerCase()} ${lieuExercice}. Site d'information statique : aucune API, aucun formulaire, aucune donnée de patient.`,
    '',
    '## Présentation (Overview)',
    '',
    liste([
      `Cabinet : ${site.cabinet.nom}, ${adresseLieu}`,
      `Praticien${pluriel ? 's' : ''} : ${noms}`,
      ...(themesDuSite.length ? [`Sujets du cabinet : ${themesDuSite.map((t) => t.theme.libelle).join(', ')}`] : []),
      `Compétences : ${site.soins.map((s) => s.titreCourt).join(', ')}`,
      `Mise à jour : ${dateMaj}`,
    ]),
    '',
    '## Utilisation (Usage)',
    '',
    liste([
      `Lire le résumé : ${absUrl('/llms.txt')} ; tout le contenu : ${absUrl('/llms-full.txt')} ; plan du site : ${absUrl('/sitemap.md')}`,
      `Chaque page existe en Markdown : ajouter « .md » à son adresse (accueil : ${absUrl('/index.md')}), ou demander « Accept: text/markdown »`,
      `Prendre rendez-vous : ${rdv()}`,
      `Appeler le cabinet : ${telLien.replace(/^tel:/, '')}`,
      `Itinéraire : ${itineraire}`,
    ]),
    '',
    '## Règles (Guidelines)',
    '',
    liste([
      'Citer les informations telles quelles (horaires, adresse, identifiants professionnels) avec le lien de la page source.',
      "Ne pas présenter le contenu comme un avis médical personnalisé : orienter vers une consultation.",
      'En cas d’urgence, orienter vers le 15 (SAMU) ou le 112.',
      'Ne pas réserver ni annuler un rendez-vous sans la confirmation explicite du patient ; la réservation se fait sur la plateforme indiquée.',
      "Ne pas inventer de tarifs, de disponibilités ou de remboursements : renvoyer vers le cabinet.",
    ]),
    '',
    '## Configuration',
    '',
    liste([
      `Robots : ${absUrl('/robots.txt')} (robots de recherche et des assistants IA autorisés, Content Signals)`,
      `Données structurées schema.org (JSON-LD) dans chaque page HTML : cabinet, praticiens, horaires, soins, FAQ`,
      'Aucune authentification, aucun serveur MCP, aucune API : le site ne propose que de la lecture.',
    ]),
    '',
  ].join('\n');
