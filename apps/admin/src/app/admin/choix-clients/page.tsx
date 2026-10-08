import Link from 'next/link';
import { normaliserChoixClient, syntheseChoixClients, type ChoixClient } from '@plateforme/core/onboarding';
import { exigerAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Super admin · Choix des clients' };

// Ce que les praticiens choisissent dans « Choisissez votre style » (parcours client /essai/votre-site) : préférences de CHAQUE
// client, enregistrées dans le brouillon de son site (sites.config.choixClient), jamais dans le goût global de Paul (atelier,
// duels, notes). Les sessions de test n'écrivent rien ; les sites marqués « test » sont exclus.
export default async function ChoixClients() {
  await exigerAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from('sites').select('id, test, updated_at, choix:config->choixClient').not('config->choixClient', 'is', null).order('updated_at', { ascending: false }).limit(500);
  const lignes = (data ?? []) as { id: string; test?: boolean; updated_at: string; choix: unknown }[];
  const choix = lignes.filter((l) => !l.test).map((l) => ({ id: l.id, c: normaliserChoixClient(l.choix) })).filter((x): x is { id: string; c: ChoixClient } => Boolean(x.c));
  const synthese = syntheseChoixClients(choix.map((x) => x.c)).slice(0, 40);
  const nom = (id: string) => (id.startsWith('recette~') ? `Recette ${id.slice(8, 16)}…` : id.split('~').slice(1, 4).join(' · '));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Choix des clients</h1>
        <p className="mt-1 text-sm text-neutral-600">« J’aime » et « Pas pour moi » donnés par les praticiens dans le parcours client, et la proposition retenue. {choix.length} parcours enregistrés (sites de test exclus).</p>
      </div>
      {error && <p className="text-sm text-red-700">Lecture impossible : {error.message}</p>}
      {!synthese.length ? (
        <p className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-700">Aucun choix enregistré pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr><th className="px-4 py-2">Proposition</th><th className="px-4 py-2">Retenue</th><th className="px-4 py-2">J’aime</th><th className="px-4 py-2">Pas pour moi</th></tr>
            </thead>
            <tbody>
              {synthese.map((l) => (
                <tr key={l.id} className="border-t border-black/5">
                  <td className="px-4 py-2" title={l.id}>{nom(l.id)}</td>
                  <td className="px-4 py-2 tabular-nums">{l.retenue}</td>
                  <td className="px-4 py-2 tabular-nums">{l.aime}</td>
                  <td className="px-4 py-2 tabular-nums">{l.non}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {choix.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Derniers parcours</h2>
          <ul className="grid gap-2 text-sm">
            {choix.slice(0, 20).map(({ id, c }) => (
              <li key={id} className="rounded-xl border border-black/5 bg-white px-4 py-2">
                <Link href={`/creer?site=${id}`} className="font-semibold text-teal-800 underline underline-offset-2">Site</Link>
                {' · '}{new Date(c.le).toLocaleDateString('fr-FR')} · {c.avis.filter((a) => a.verdict === 'aime').length} aimé(s), {c.avis.filter((a) => a.verdict === 'non').length} écarté(s)
                {c.activites.length ? ` · activités : ${c.activites.join(', ')}` : ''}{c.couleurs.length ? ` · couleurs : ${c.couleurs.join(', ')}` : ''} · source : {c.source === 'annuaire' ? 'annuaire' : 'saisie'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
