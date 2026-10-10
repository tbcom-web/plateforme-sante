import { Suspense } from 'react';
import Shell from '@/components/Shell';
import TempsServeur from '@/components/TempsServeur';
import ContexteImages from '@/components/ContexteImages';
import PrechauffageOuvriers from '@/components/PrechauffageOuvriers';
import NavAdmin from '@/components/NavAdmin';
import BoutonParcoursTest from '@/components/BoutonParcoursTest';
import { professionsAdmin } from '@plateforme/core/professions';
import { exigerAdmin } from '@/lib/admin';
import { getNombreArrivages, getNombreNouveautesANoter } from '@/lib/arrivages';
import { getProfession } from '@/lib/profession';
import { getUser } from '@/lib/supabase/server';
import { avecDelai, DELAIS } from '@/lib/delai';

// Super admin réorganisé en espaces (décision de Paul du 2026-10-08, docs/espaces-admin.md) : Arrivages, Frigo, Dégustation,
// Cuisine, Clients ; sélecteur de profession global ; fil d'Ariane ; tiroir sur téléphone (NavAdmin, admin-espaces.ts).
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await exigerAdmin();
  const profession = await getProfession();
  // Compteurs du menu NON ATTENDUS (2026-10-09, « l'admin est lent ») : promesse passée au menu (pastilles affichées dès qu'elles
  // arrivent), bornée (lents ou en erreur → 0) ; la page et le contexte d'images ne les attendent plus
  const compteurs = Promise.all([avecDelai(getNombreArrivages(profession), DELAIS.compteurs, 0), avecDelai(getNombreNouveautesANoter(profession), DELAIS.compteurs, 0)])
    .then(([arrivages, nouveautes]) => ({ arrivages, nouveautes }));
  const user = await getUser();

  return (
    <Shell email={user?.email ?? ''}>
      <NavAdmin
        compteurs={compteurs}
        professions={professionsAdmin().map((p) => ({ id: p.id, libelle: p.statut === 'preparation' ? `${p.libelle} (en préparation)` : p.libelle, court: p.court }))}
        profession={profession.id}
      />
      {/* Parcours client en mode test (aucune écriture) : components/BoutonParcoursTest.tsx */}
      <div className="mb-4 flex justify-end text-sm"><BoutonParcoursTest compact /></div>
      {/* Contexte d'images (photos exclues, kits par sujet : contexte-images.ts ; arrivages non acceptés) posé avant les aperçus */}
      <ContexteImages />
      {/* Workers de la Dégustation et de la Présélection réchauffés au repos (pool-workers.ts) */}
      <PrechauffageOuvriers />
      {children}
      {/* Mesure continue : « page servie en x ms » (admins seulement, mesurée par le navigateur) */}
      <Suspense fallback={null}><TempsServeur /></Suspense>
    </Shell>
  );
}
