import Link from 'next/link';
import BoutonParcoursTest from '@/components/BoutonParcoursTest';
import { redirect } from 'next/navigation';
import { baseDeCle, clesUnitairesInventaire, profilsDePratique, publicationDepuisLigne, publicationsDuProfil } from '@plateforme/core';
import { ESPACES } from '@plateforme/core/admin-espaces';
import { estDeLaProfession } from '@plateforme/core/professions';
import { exigerAdmin } from '@/lib/admin';
import { getArrivagesEnAttente, getEtatsNouveautes } from '@/lib/arrivages';
import { lireAssetsNotesApprentissage } from '@/lib/assets-notes';
import { getProfession } from '@/lib/profession';
import { createClient } from '@/lib/supabase/server';
import { getIndicateursPolitique } from '@/lib/politique-evaluation';
import IndicateursEvaluation from './IndicateursEvaluation';

export const metadata = { title: 'Super admin · Tableau de bord' };

// Tableau de bord du super admin (décision de Paul du 2026-10-08) : court, par profession (sélecteur de l'en-tête). Compteurs :
// arrivages en attente, nouveautés reçues, à déguster, profils de pratique prêts / en cours, sites à publier ; un lien par espace.
// + Évaluation (politique-evaluation.ts, 2026-10-09) : taux de répétition, qualité présentée, jamais-notés, règles apprises, 30 jours.
// Ancienne adresse de la liste des sites : ses paramètres de filtre (?q=, ?statut=…) sont redirigés vers /admin/sites.

const PARAMS_SITES = ['q', 'statut', 'test', 'edition', 'echec', 'modifs', 'tri', 'page'];

let unitaires: string[] | null = null;

export default async function TableauDeBord({ searchParams }: PageProps<'/admin'>) {
  await exigerAdmin();
  const sp = await searchParams;
  if (PARAMS_SITES.some((k) => sp[k] !== undefined)) {
    const u = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v === undefined ? [] : [[k, v]])) as [string, string][]);
    redirect(`/admin/sites?${u}`);
  }
  const profession = await getProfession();
  const deLaProfession = estDeLaProfession({}, profession.id);
  const supabase = await createClient();
  const compter = async (f: (r: ReturnType<typeof base>) => ReturnType<typeof base>) => (deLaProfession ? (await f(base())).count ?? 0 : 0);
  const base = () => supabase.from('sites').select('id', { count: 'exact', head: true });

  const [arrivages, nouveautes, notes, modifs, brouillons, echecs, publications, evaluation] = await Promise.all([
    getArrivagesEnAttente(profession),
    getEtatsNouveautes(),
    lireAssetsNotesApprentissage(),
    compter((r) => r.eq('modifs_non_publiees', true).not('publiee_le', 'is', null).eq('test', false)),
    compter((r) => r.eq('statut', 'brouillon').eq('test', false)),
    compter((r) => r.eq('publication_etat', 'echec')),
    supabase.from('recettes_publications').select('recette, profession, profils, ordre, publiee, publiee_le').limit(2000),
    // Politique d'évaluation unique : répétition, qualité présentée, jamais-notés, règles apprises, tendance 30 jours
    getIndicateursPolitique().catch(() => null),
  ]);

  // À déguster : ingrédients unitaires jamais notés (ni eux ni leur illustration de base), hors arrivages en attente
  unitaires ??= clesUnitairesInventaire();
  const notees = new Set(((Array.isArray(notes.data) ? notes.data : []) as { cle_asset: string; note: number | null }[]).filter((l) => typeof l.note === 'number').map((l) => l.cle_asset));
  const enAttente = new Set(arrivages.nouveautes.map((n) => n.cle));
  const aDeguster = deLaProfession ? unitaires.filter((k) => !enAttente.has(k) && !notees.has(k) && !notees.has(baseDeCle(k) ?? k)).length : 0;

  // Profils de pratique : prêts = au moins une recette publiée pour eux (0043) ; sans la migration, tous en cours
  const profils = profilsDePratique(profession.id);
  const pubs = publications.error ? [] : (publications.data ?? []).map((l) => publicationDepuisLigne(l as Record<string, unknown>)).filter((p) => p !== null);
  const prets = profils.filter((p) => publicationsDuProfil(pubs, p).some((x) => x.publiee)).length;

  const recues = deLaProfession ? nouveautes.recentes.length : 0;
  const cartes: { titre: string; valeur: string; detail: string; href: string; alerte?: boolean }[] = [
    { titre: 'Arrivages en attente', valeur: String(arrivages.nouveautes.length + arrivages.photos.length), detail: `${arrivages.nouveautes.length} nouveauté${arrivages.nouveautes.length > 1 ? 's' : ''} · ${arrivages.photos.length} photo${arrivages.photos.length > 1 ? 's' : ''}`, href: '/admin/arrivages', alerte: arrivages.nouveautes.length + arrivages.photos.length > 0 },
    { titre: 'Nouveautés reçues', valeur: String(recues), detail: 'depuis 30 jours', href: '/admin/arrivages' },
    { titre: 'Dégustation du jour', valeur: String(aDeguster), detail: 'ingrédients jamais notés', href: '/admin/degustation' },
    { titre: 'Profils de pratique', valeur: `${prets} / ${profils.length}`, detail: `prêts · ${profils.length - prets} en cours`, href: '/admin/profils' },
    { titre: 'Sites à publier', valeur: String(modifs + brouillons), detail: `${modifs} modifiés · ${brouillons} brouillons${echecs ? ` · ${echecs} échec${echecs > 1 ? 's' : ''}` : ''}`, href: modifs ? '/admin/sites?modifs=1' : '/admin/sites?statut=brouillon&test=0', alerte: echecs > 0 },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="mt-1 text-sm text-neutral-600">{profession.pluriel}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cartes.map((c) => (
          <Link key={c.titre} href={c.href} className={`grid gap-0.5 rounded-xl border bg-white p-4 hover:border-teal-700/40 ${c.alerte ? 'border-amber-300' : 'border-black/5'}`}>
            <dt className="text-xs text-neutral-500">{c.titre}</dt>
            <dd className="text-2xl font-bold tabular-nums">{c.valeur}</dd>
            <dd className="text-xs text-neutral-600">{c.detail}</dd>
          </Link>
        ))}
      </dl>
      <IndicateursEvaluation ind={evaluation} />
      <BoutonParcoursTest />
      <section aria-labelledby="tb-espaces" className="grid gap-3">
        <h2 id="tb-espaces" className="text-lg font-semibold">Espaces</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ESPACES.map((e) => (
            <li key={e.id}>
              <Link href={e.href} className="grid h-full gap-1 rounded-2xl border border-black/5 bg-white p-4 hover:border-teal-700/40">
                <span className="font-semibold text-teal-900">{e.libelle}</span>
                <span className="text-sm text-neutral-600">{e.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
