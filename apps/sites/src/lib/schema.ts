// Données structurées schema.org : lues par Google, Bing et les assistants IA.
import { site, absUrl, nomPraticien, baseUrl } from './site';
import type { Faq, Soin, Article } from '@plateforme/core';

const businessId = `${baseUrl}/#cabinet`;
const personId = `${baseUrl}/#praticien`;

const jours: Record<string, string> = {
  Lundi: 'Monday', Mardi: 'Tuesday', Mercredi: 'Wednesday', Jeudi: 'Thursday',
  Vendredi: 'Friday', Samedi: 'Saturday', Dimanche: 'Sunday',
};

const openingHours = () =>
  site.cabinet.horaires
    .filter((h) => /\d/.test(h.heures))
    .flatMap((h) =>
      h.heures.split(/\s*[,/]\s*/).map((plage) => {
        const [opens, closes] = plage.split(/\s*[–-]\s*/).map((t) => t.replace('h', ':').padEnd(5, '0'));
        return { '@type': 'OpeningHoursSpecification', dayOfWeek: jours[h.jour], opens, closes };
      }),
    );

export const businessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': ['MedicalBusiness', 'LocalBusiness'],
  '@id': businessId,
  name: site.cabinet.nom,
  description: site.accroche.texte,
  url: baseUrl,
  telephone: site.cabinet.telephone,
  medicalSpecialty: site.profession.specialiteSchema,
  isAcceptingNewPatients: true,
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.cabinet.adresse,
    postalCode: site.cabinet.codePostal,
    addressLocality: site.cabinet.ville,
    addressCountry: 'FR',
  },
  ...(site.cabinet.geo && {
    geo: { '@type': 'GeoCoordinates', latitude: site.cabinet.geo.lat, longitude: site.cabinet.geo.lng },
  }),
  openingHoursSpecification: openingHours(),
  availableService: site.soins.map((s) => ({
    '@type': 'MedicalProcedure',
    name: s.titre,
    url: absUrl(`/soins/${s.slug}`),
  })),
  employee: { '@id': personId },
  potentialAction: {
    '@type': 'ReserveAction',
    target: site.rdv.url,
    name: 'Prendre rendez-vous',
  },
});

export const personSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': personId,
  name: nomPraticien,
  jobTitle: site.praticien.titre,
  identifier: { '@type': 'PropertyValue', propertyID: 'RPPS', value: site.praticien.rpps },
  worksFor: { '@id': businessId },
  knowsLanguage: site.praticien.langues,
  hasCredential: site.praticien.formations.map((f) => ({ '@type': 'EducationalOccupationalCredential', name: f })),
});

export const faqSchema = (faq: Faq[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.r },
  })),
});

export const soinSchema = (soin: Soin) => ({
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: soin.titre,
  description: soin.resume,
  url: absUrl(`/soins/${soin.slug}`),
  inLanguage: 'fr-FR',
  about: { '@type': 'MedicalProcedure', name: soin.titre },
  reviewedBy: { '@id': personId },
  provider: { '@id': businessId },
});

export const articleSchema = (a: Article) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.titre,
  description: a.resume,
  datePublished: a.date,
  inLanguage: 'fr-FR',
  url: absUrl(`/actualites/${a.slug}`),
  mainEntityOfPage: absUrl(`/actualites/${a.slug}`),
  ...(a.image ? { image: { '@type': 'ImageObject', url: absUrl(a.image), width: 1600, height: 900, caption: a.imageAlt ?? '' } } : {}),
  author: { '@id': personId },
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
