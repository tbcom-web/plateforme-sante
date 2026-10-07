import Link from 'next/link';
import { markdownAssets, syntheseAssets, titresAssets } from '@plateforme/core';
import EnvoyerRetours from '@/components/EnvoyerRetours';
import { exigerAdmin } from '@/lib/admin';
import { getNotesAssets, getPhotosDesJeux, getSurchargesSujets } from '@/lib/assets-notes';
import { getRevuesIllustrations } from '@/lib/illustrations';
import RevueIllustrations from './RevueIllustrations';
import SyntheseAssets from './SyntheseAssets';

export const metadata = { title: 'Super admin · Bibliothèque & retours' };

export default async function PageIllustrations({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const cle = typeof sp.cle === 'string' ? sp.cle : null;
  const [{ statuts, revues, migrationManquante }, notes, photosJeux, surchargesSujets] = await Promise.all([getRevuesIllustrations(), getNotesAssets(), getPhotosDesJeux(), getSurchargesSujets()]);
  // Empreinte de la dernière note de chaque élément (avant / après dans la vue agrandie)
  const empreintesNotees: Record<string, string | null> = {};
  for (const x of notes.notes) if (!(x.cle in empreintesNotees)) empreintesNotees[x.cle] = x.empreinte;
  const moyennes: Record<string, { n: number; somme: number }> = {};
  for (const x of notes.notes) moyennes[x.cle] = { n: (moyennes[x.cle]?.n ?? 0) + 1, somme: (moyennes[x.cle]?.somme ?? 0) + x.note };
  const synthese = syntheseAssets(notes.notes, {
    statuts: statuts.map((s) => ({ cle: s.cle, statut: s.statut, commentaire: revues.find((r) => r.cle === s.cle && r.commentaire)?.commentaire ?? null, le: s.majLe })),
    titres: titresAssets(),
  });
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bibliothèque &amp; retours</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Tous les assets du code (pictos, dessins, traits continus, matériel, animations, héros, bibliothèque, photos, structures,
            gammes) : statut (à valider ou à faire retravailler), note rapide, historique. Pour noter à la chaîne, avec « ce qui va
            bien / ce qui ne va pas » : <Link href="/admin/retours" className="font-semibold text-teal-900 underline">Donner mon avis</Link>.
            Les thèmes complets se notent dans l’<Link href="/admin/atelier" className="font-semibold text-teal-900 underline">atelier</Link>.
          </p>
        </div>
        <EnvoyerRetours compact />
      </div>
      {migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration 0021 à exécuter (<code>supabase/migrations/0021_revues_illustrations.sql</code>) : les assets s’affichent, mais les statuts ne peuvent pas encore être enregistrés.
        </p>
      )}
      {notes.migrationManquante && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Migration 0027 à exécuter (<code>supabase/migrations/0027_assets_notes.sql</code>) : les notes ne peuvent pas encore être enregistrées.
        </p>
      )}
      <SyntheseAssets synthese={synthese} markdown={markdownAssets(synthese, { date })} />
      <RevueIllustrations statuts={statuts} revues={revues} migrationManquante={migrationManquante} photosJeux={photosJeux} moyennes={moyennes} migrationNotes={notes.migrationManquante} surchargesSujets={surchargesSujets} empreintesNotees={empreintesNotees} cleInitiale={cle} />
    </div>
  );
}
