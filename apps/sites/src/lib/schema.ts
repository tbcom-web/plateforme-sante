// Données structurées schema.org : lues par Google, Bing et les assistants IA.
import { site, absUrl, baseUrl } from './site';
import { photoAccueil } from './visuels';
import { dateMaj } from './agents';
import { rdvEnLigne, itineraire, lieu, telLien } from './textes';
import type { Faq, Soin, Article, PraticienPublic } from '@plateforme/core';

const businessId = `${baseUrl}/#cabinet`;
const siteId = `${baseUrl}/#site`;
/** Premier praticien : « #praticien » (référencé par les soins et articles) ; suivants : « #praticien-2 »… */
const personId = (i = 0) => `${baseUrl}/#praticien${i ? `-${i + 1}` : ''}`;

const jours: Record<string, string> = {
  Lundi: 'Monday', Mardi: 'Tuesday', Mercredi: 'Wednesday', Jeudi: 'Thursday',
  Vendredi: 'Friday', Samedi: 'Saturday', Dimanche: 'Sunday',
};

/** « 9h », « 9h00 », « 14h30 », « 9:00 » → « 09:00 ». */
const heure = (t: string) => {
  const [, h, m] = t.match(/(\d{1,2})\s*[h:]\s*(\d{2})?/) ?? [];
  return h ? `${h.padStart(2, '0')}:${m ?? '00'}` : '';
};

const openingHours = (horaires = lieu.horaires) =>
  horaires
    .filter((h) => /\d/.test(h.heures) && jours[h.jour])
    .flatMap((h) =>
      h.heures.split(/\s*[,/]\s*/).flatMap((plage) => {
        const [opens, closes] = plage.split(/\s*[–—-]\s*/).map(heure);
        return opens && closes ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${jours[h.jour]}`, opens, closes }] : [];
      }),
    );

/** Lien direct vers l'agenda en ligne (sans le compteur /rdv), seulement s'il mène à une page précise. */
const agenda = rdvEnLigne ? site.rdv.url || site.praticiens.find((p) => p.rdvUrl)?.rdvUrl : undefined;

/** Identifiants professionnels publics : « N° RPPS : 10001234567 » → PropertyValue. */
const identifiants = (p: PraticienPublic) =>
  p.identifiants.flatMap((ligne) => {
    const i = ligne.lastIndexOf(':');
    if (i < 0) return [];
    const nom = ligne.slice(0, i).trim();
    const valeur = ligne.slice(i + 1).replace(/\(exemple\)/i, '').trim();
    const code = /RPPS/i.test(nom) ? 'RPPS' : /INAMI/i.test(nom) ? 'INAMI' : /RCC/i.test(nom) ? 'RCC' : /Ordre/i.test(nom) ? 'Ordre' : nom;
    return valeur ? [{ '@type': 'PropertyValue', propertyID: code, name: nom, value: valeur }] : [];
  });

const adresse = {
  '@type': 'PostalAddress',
  streetAddress: [lieu.adresse, lieu.complement].filter(Boolean).join(', '),
  postalCode: lieu.codePostal,
  addressLocality: lieu.ville,
  addressCountry: site.pays,
};

export const businessSchema = () => ({
  '@context': 'https://schema.org',
  // MedicalClinic : à la fois commerce local (adresse, horaires) et organisation de santé (spécialité, patients) ;
  // LocalBusiness et MedicalBusiness restent explicites pour les lecteurs qui ne suivent pas la hiérarchie schema.org.
  '@type': ['LocalBusiness', 'MedicalBusiness', 'MedicalClinic'],
  '@id': businessId,
  name: site.cabinet.nom,
  description: site.accroche.texte,
  url: baseUrl,
  image: absUrl(photoAccueil),
  telephone: telLien.replace(/^tel:/, ''),
  ...(site.cabinet.email && { email: site.cabinet.email }),
  medicalSpecialty: site.profession.specialiteSchema.startsWith('http') ? site.profession.specialiteSchema : `https://schema.org/${site.profession.specialiteSchema}`,
  isAcceptingNewPatients: true,
  address: adresse,
  ...(site.cabinet.geo && {
    geo: { '@type': 'GeoCoordinates', latitude: site.cabinet.geo.lat, longitude: site.cabinet.geo.lng },
  }),
  hasMap: itineraire,
  openingHoursSpecification: openingHours(),
  ...(site.communes.length > 0 && { areaServed: site.communes.map((name) => ({ '@type': 'AdministrativeArea', name })) }),
  ...(site.paiements.length > 0 && { paymentAccepted: site.paiements.join(', ') }),
  currenciesAccepted: site.pays === 'CH' ? 'CHF' : 'EUR',
  ...(site.cabinet.tarifs.length > 0 && {
    makesOffer: site.cabinet.tarifs.map((t) => {
      const prix = /^\s*(\d+(?:[.,]\d+)?)\s*(€|CHF)\s*$/.exec(t.prix);
      return { '@type': 'Offer', name: t.acte, description: `${t.acte} : ${t.prix}`, ...(prix && { price: prix[1].replace(',', '.'), priceCurrency: prix[2] === '€' ? 'EUR' : 'CHF' }) };
    }),
  }),
  amenityFeature: [{ '@type': 'LocationFeatureSpecification', name: 'Accès personnes à mobilité réduite', value: site.accesDetail.pmr }],
  availableService: site.soins.map((s) => ({
    '@type': 'MedicalProcedure',
    name: s.titre,
    description: s.resume,
    url: absUrl(`/soins/${s.slug}`),
  })),
  employee: site.praticiens.map((_, i) => ({ '@id': personId(i) })),
  ...(agenda && { sameAs: [agenda] }),
  potentialAction: agenda
    ? {
        '@type': 'ReserveAction',
        name: 'Prendre rendez-vous',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: agenda,
          inLanguage: 'fr',
          actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'],
        },
      }
    : { '@type': 'CommunicateAction', name: 'Appeler le cabinet', target: telLien },
});

/** Une fiche Person par praticien, avec ses identifiants publics (RPPS, n° d'Ordre, INAMI…). */
export const personSchemas = () =>
  site.praticiens.map((p, i) => ({
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId(i),
    name: `${p.prenom} ${p.nom}`,
    givenName: p.prenom,
    familyName: p.nom,
    jobTitle: p.titre,
    url: absUrl('/le-cabinet'),
    identifier: identifiants(p),
    worksFor: { '@id': businessId },
    workLocation: { '@id': businessId },
    knowsLanguage: site.praticien.langues,
    ...(p.orientations.length > 0 && { knowsAbout: p.orientations }),
    hasCredential: [p.diplome, ...p.formations].filter(Boolean).map((f) => ({ '@type': 'EducationalOccupationalCredential', name: f })),
    ...(rdvEnLigne && p.rdvUrl && { sameAs: [p.rdvUrl] }),
  }));

export const websiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': siteId,
  name: site.cabinet.nom,
  url: baseUrl,
  inLanguage: 'fr-FR',
  publisher: { '@id': businessId },
  dateModified: dateMaj,
});

/** Page ordinaire (accueil, cabinet, accès…) : rattachée au site et au cabinet, avec sa date de mise à jour. */
export const pageSchema = (nom: string, description: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${absUrl(path)}#page`,
  name: nom,
  description,
  url: absUrl(path),
  inLanguage: 'fr-FR',
  isPartOf: { '@id': siteId },
  about: { '@id': businessId },
  dateModified: dateMaj,
});

/** Questions fréquentes ; avec « page », le nœud décrit aussi la page (nom, description, adresse, date). */
export const faqSchema = (faq: Faq[], page?: { nom: string; description: string; path: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  ...(page && {
    '@id': `${absUrl(page.path)}#faq`,
    name: page.nom,
    description: page.description,
    url: absUrl(page.path),
    inLanguage: 'fr-FR',
    isPartOf: { '@id': siteId },
    dateModified: dateMaj,
  }),
  mainEntity: faq.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.r },
  })),
});

/** Page d'un soin ; `lies` : chemins des soins du bloc « À lire aussi » (relatedLink), seulement s'il y en a. */
export const soinSchema = (soin: Soin, lies: string[] = []) => ({
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  '@id': `${absUrl(`/soins/${soin.slug}`)}#page`,
  name: soin.titre,
  description: soin.resume,
  url: absUrl(`/soins/${soin.slug}`),
  inLanguage: 'fr-FR',
  isPartOf: { '@id': siteId },
  about: { '@type': 'MedicalProcedure', name: soin.titre },
  reviewedBy: { '@id': personId() },
  lastReviewed: dateMaj,
  dateModified: dateMaj,
  provider: { '@id': businessId },
  ...(lies.length ? { relatedLink: lies.map((p) => absUrl(p)) } : {}),
});

export const articleSchema = (a: Article) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.titre,
  description: a.resume,
  datePublished: a.date,
  dateModified: a.date,
  inLanguage: 'fr-FR',
  url: absUrl(`/actualites/${a.slug}`),
  mainEntityOfPage: absUrl(`/actualites/${a.slug}`),
  isPartOf: { '@id': siteId },
  ...(a.image ? { image: { '@type': 'ImageObject', url: absUrl(a.image), width: 1600, height: 900, caption: a.imageAlt ?? '' } } : {}),
  author: { '@id': personId() },
  publisher: { '@id': businessId },
});

export const breadcrumbSchema = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: absUrl(it.path),
  })),
});

/**
 * Page d'un thème du cabinet (/themes/<id>) : WebPage rattachée au site et au cabinet, avec la liste des pages de soin du
 * thème (ItemList d'adresses existantes : seulement les soins cochés). Aucune donnée ajoutée hors du contenu affiché.
 */
export const themeSchema = (t: { nom: string; description: string; path: string; soins: Soin[] }) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${absUrl(t.path)}#page`,
  name: t.nom,
  description: t.description,
  url: absUrl(t.path),
  inLanguage: 'fr-FR',
  isPartOf: { '@id': siteId },
  about: { '@id': businessId },
  dateModified: dateMaj,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: t.soins.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.titre, url: absUrl(`/soins/${s.slug}`) })),
  },
});
