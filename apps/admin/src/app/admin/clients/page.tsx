import { ALIAS_PROFESSIONS, professionsAdmin } from '@plateforme/core/professions';
import BasculeProfession from '@/components/BasculeProfession';
import HubEspace from '@/components/HubEspace';
import { getProfession } from '@/lib/profession';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Super admin · Clients' };

// Clients (espaces de l'admin, docs/espaces-admin.md) : sites des praticiens, essais, republication de tous les sites. Bascule
// rapide d'une profession à l'autre pour le commercial (docs/architecture-professions.md) : même cookie que le sélecteur de
// l'en-tête ; Sites et Essais n'affichent que la profession choisie.
export default async function Clients() {
  const profession = await getProfession();
  const professions = professionsAdmin();
  const slugs = (id: string) => [id, ...Object.entries(ALIAS_PROFESSIONS).filter(([, v]) => v === id).map(([k]) => k)];
  const supabase = await createClient();
  const compter = async (table: 'sites' | 'essais', colonne: string, id: string) => {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).in(colonne, slugs(id));
    return error ? null : count ?? 0;
  };
  const comptes = await Promise.all(professions.map(async (p) => ({ p, sites: await compter('sites', 'profession_slug', p.id), essais: await compter('essais', 'profession', p.id) })));
  const n = (x: number | null, mot: string) => (x === null ? '' : ` · ${x} ${mot}${x > 1 ? 's' : ''}`);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section aria-label="Profession affichée" className="grid gap-2 rounded-2xl border border-black/5 bg-white p-4">
        <p className="text-sm text-neutral-600">Profession affichée dans Sites et Essais :</p>
        <BasculeProfession courante={profession.id}
          professions={comptes.map(({ p, sites, essais }) => ({ id: p.id, libelle: `${p.libelle}${p.statut === 'preparation' ? ' (en préparation)' : ''}${n(sites, 'site')}${n(essais, 'essai')}` }))} />
      </section>
      <HubEspace id="clients" sousTitre={`Profession : ${profession.libelle}.`} details={{
        '/admin/sites': 'Liste, filtres, publication de chaque site.',
        '/admin/leads': 'Essais gratuits et prospects.',
        '/admin/maintenance': 'Republier tous les sites après une évolution de la charte.',
      }} />
    </div>
  );
}
