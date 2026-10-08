import HubEspace from '@/components/HubEspace';
import { getProfession } from '@/lib/profession';

export const metadata = { title: 'Super admin · Clients' };

// Clients (espaces de l'admin, docs/espaces-admin.md) : sites des praticiens, essais, republication de tous les sites.
export default async function Clients() {
  const profession = await getProfession();
  return (
    <HubEspace id="clients" sousTitre={`Profession : ${profession.libelle}.`} details={{
      '/admin/sites': 'Liste, filtres, publication de chaque site.',
      '/admin/leads': 'Essais gratuits et prospects.',
      '/admin/maintenance': 'Republier tous les sites après une évolution de la charte.',
    }} />
  );
}
