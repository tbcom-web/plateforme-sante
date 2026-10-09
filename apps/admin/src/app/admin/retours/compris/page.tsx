import Link from 'next/link';
import { REGLAGES_REGLES, titresAssets } from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getPolitique, MIGRATION_EXPOSITIONS } from '@/lib/politique-evaluation';
import ReglesApprises from './ReglesApprises';

export const metadata = { title: 'Super admin · Ce que j’ai compris de tes retours' };

// « Ce que j'ai compris de tes retours » (politique d'évaluation, 2026-10-09 ; regles-apprises.ts, docs/politique-evaluation.md) :
// règles apprises des étiquettes et commentaires (Pour / Contre, zones, « celle qui ne va pas », raisons de refus des Arrivages,
// tickets d'avis), avec leurs preuves ; « Désactiver » les retire partout (files d'évaluation, générateur, sourcing de photos).
export default async function PageCompris() {
  await exigerAdmin();
  const p = await getPolitique();
  const titres = titresAssets();
  const titre = (k: string) => titres[k] ?? (k.startsWith('compo:') ? `Composition ${k.slice(6, 12)}` : k);
  const regles = (p?.regles ?? []).map((r) => ({ ...r, exemples: r.exemples.map((k) => ({ cle: k, titre: titre(k) })) }));
  const actives = regles.filter((r) => r.active || r.desactivee);
  const enCours = regles.filter((r) => !r.active && !r.desactivee && r.declencheurs > 0);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="text-2xl font-bold">Ce que j’ai compris de tes retours</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Les étiquettes et commentaires que tu laisses (Pour / Contre, « celle qui ne va pas », raisons de refus, tickets) deviennent des règles
          appliquées partout : files à noter, générateur et recherche de photos. Une règle n’est retenue qu’à partir de {REGLAGES_REGLES.supportMin} retours
          concordants ; son effet est plafonné et tu peux la désactiver à tout moment.
        </p>
      </div>
      {p?.migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_EXPOSITIONS}</p>}
      <section aria-labelledby="c-regles" className="grid gap-3">
        <h2 id="c-regles" className="text-lg font-semibold">Règles appliquées <span className="text-sm font-normal text-neutral-500">({regles.filter((r) => r.active).length})</span></h2>
        {actives.length ? <ReglesApprises regles={actives} /> : <p className="text-sm text-neutral-600">Aucune règle pour l’instant : pas encore assez de retours concordants.</p>}
      </section>
      {enCours.length > 0 && (
        <section aria-labelledby="c-encours" className="grid gap-3">
          <h2 id="c-encours" className="text-lg font-semibold">En observation</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {enCours.map((r) => (
              <li key={r.id} className="grid gap-1 rounded-xl border border-black/5 bg-white p-3 text-sm">
                <span className="font-semibold">{r.action}</span>
                <span className="text-neutral-600">{r.constat} : {r.support} retour{r.support > 1 ? 's' : ''} sur {REGLAGES_REGLES.supportMin} nécessaires{r.declencheurs > r.support ? ` (${r.declencheurs - r.support} sans élément visé)` : ''}.</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="c-mots" className="grid gap-2">
        <h2 id="c-mots" className="text-lg font-semibold">Mots qui reviennent dans tes critiques</h2>
        {p?.mots.length ? (
          <ul className="flex flex-wrap gap-2">
            {p.mots.map((m) => (
              <li key={m.mot} className={`rounded-full px-3 py-1 text-sm ring-1 ${m.couvert ? 'bg-teal-50 text-teal-900 ring-teal-200' : 'bg-white text-neutral-800 ring-neutral-200'}`}>
                {m.mot} <span className="tabular-nums text-neutral-500">×{m.n}</span>{m.couvert ? '' : ' · pas encore compris'}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-600">Pas encore de mot récurrent.</p>}
      </section>
      <section aria-labelledby="c-implicites" className="grid gap-2">
        <h2 id="c-implicites" className="text-lg font-semibold">Vus sans être choisis</h2>
        <p className="max-w-3xl text-sm text-neutral-600">
          {p?.implicites.length ?? 0} élément{(p?.implicites.length ?? 0) > 1 ? 's' : ''} montré{(p?.implicites.length ?? 0) > 1 ? 's' : ''} 3 fois sans jamais être choisi{(p?.implicites.length ?? 0) > 1 ? 's' : ''}, ou
          sorti{(p?.implicites.length ?? 0) > 1 ? 's' : ''} en « celle qui ne va pas » : traités comme mal notés (plus proposés à noter, moins tirés par le générateur).{' '}
          <Link href="/admin/retours/tranches" className="font-semibold text-teal-800 underline">Les revoir et réévaluer</Link>
        </p>
      </section>
    </div>
  );
}
