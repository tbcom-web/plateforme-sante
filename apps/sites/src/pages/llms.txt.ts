// Résumé du cabinet lisible par les assistants IA (convention llms.txt).
import type { APIRoute } from 'astro';
import { site, absUrl, nomPraticien, adresseComplete } from '../lib/site';

export const GET: APIRoute = () => {
  const lignes = [
    `# ${site.cabinet.nom}`,
    '',
    `> ${nomPraticien}, ${site.praticien.titre.toLowerCase()}, ${site.cabinet.quartier}. ${site.accroche.texte}`,
    '',
    '## Informations clés',
    `- Adresse : ${adresseComplete}`,
    `- Téléphone : ${site.cabinet.telephone}`,
    `- Prise de rendez-vous : ${site.rdv.url} (${site.rdv.plateforme})`,
    `- ${site.praticien.conventionnement}`,
    `- RPPS : ${site.praticien.rpps}`,
    `- Accessibilité PMR : ${site.cabinet.pmr ? 'oui' : 'non'}`,
    `- Langues : ${site.praticien.langues.join(', ')}`,
    `- Horaires : ${site.cabinet.horaires.map((h) => `${h.jour} ${h.heures}`).join(' ; ')}`,
    '',
    '## Soins',
    ...site.soins.map((s) => `- [${s.titreCourt}](${absUrl(`/soins/${s.slug}`)}) : ${s.resume}`),
    '',
    ...(site.articles.length > 0 ? ['## Conseils'] : []),
    ...site.articles.map((a) => `- [${a.titre}](${absUrl(`/actualites/${a.slug}`)}) : ${a.resume}`),
    '',
    '## Pages',
    `- [Le cabinet et les praticiens](${absUrl('/le-cabinet')})`,
    `- [Mentions légales](${absUrl('/mentions-legales')})`,
    '',
  ];
  return new Response(lignes.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
