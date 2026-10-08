import Link from 'next/link';
import type { CSSProperties } from 'react';
import '@plateforme/core/dessins.css';
import {
  construirePrompt, formatsEmplacement, inventaireAssets, jaugeProfil, kitDuProfil, notesElements, pratiqueDe, profilsCiblesParDefaut, profilsDePratique,
  publicationsDuProfil, qualiteComposition, scenarioDeRecette, FAMILLES_KIT, LIBELLES_FAMILLES_KIT,
  gamme as gammeParId, SURFACES_CSS, variablesCharte, variablesGamme, type ElementProfil, type FamilleKit, type KitProfil, type ProfilPratique, type Recette,
} from '@plateforme/core';
import { exigerAdmin } from '@/lib/admin';
import { getDonneesKits, getDonneesVisuels } from '@/lib/kits-images';
import { getLignesAssetsApprentissage } from '@/lib/notation-recettes';
import { getRecettes } from '@/lib/recettes';
import { getPublications, MIGRATION_PUBLICATIONS, professionAdmin } from '@/lib/profils';

export const metadata = { title: 'Super admin · Profils de pratique' };

// PROFILS DE PRATIQUE (décision de Paul du 2026-10-08, packages/core/src/profils.ts) : pour la profession choisie dans l'en-tête,
// chaque profil de référence (Sport·basket, Diabète…) avec sa JAUGE de préparation (kit complet ? recettes gardées 4-5 ★ ?
// éléments 100 % 4-5 ★ ?), ses TROUS concrets et leurs actions, son kit (photos, illustrations, icônes, animations tagués thème +
// activité) et ses recettes (« Publier pour les praticiens »). Lecture seule : rien n'est validé ici.

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

/** Recettes d'un profil : publiées pour lui, ou gardées / bien notées dont le scénario le vise (profils pré-cochés) */
function recettesDuProfil(profil: ProfilPratique, recettes: readonly Recette[], publiees: ReadonlySet<string>) {
  return recettes.filter((r) => r.statut === 'active' && (publiees.has(r.id) || (((r.note ?? 0) >= 4 || r.etiquettes.includes('gardee')) && profilsCiblesParDefaut(scenarioDeRecette(r), profil.profession).includes(profil.id))));
}

function Jauge({ part, etiquette }: { part: number; etiquette: string }) {
  const pc = Math.round(part * 100);
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between text-xs text-neutral-600"><span>{etiquette}</span><span className="font-semibold tabular-nums text-neutral-900">{pc} %</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pc} aria-label={etiquette}>
        <div className={`h-full rounded-full ${pc >= 80 ? 'bg-teal-700' : pc >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.max(3, pc)}%` }} />
      </div>
    </div>
  );
}

function Vignette({ e, svg }: { e: ElementProfil; svg: string | null }) {
  return (
    <li className="grid w-24 shrink-0 gap-1">
      <div className="grid aspect-square place-items-center overflow-hidden rounded-xl ring-1 ring-black/10" style={{ background: 'var(--fond)', color: 'var(--encre)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.url ? <img src={e.url} alt="" loading="lazy" className="h-full w-full object-cover" /> : svg ?  <span className="block h-[86%] w-[86%] [&>svg]:block [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="px-1 text-center text-[10px] text-neutral-500">{e.cle}</span>}
      </div>
      <span className="flex flex-wrap gap-1 text-[11px]">
        {e.aValider ? <span className="rounded bg-amber-100 px-1 text-amber-900">à valider</span> : <span className="rounded bg-teal-50 px-1 text-teal-900">validé</span>}
        <span className="tabular-nums text-neutral-600">{e.note !== null ? `${String(e.note).replace('.', ',')} ★` : 'non noté'}</span>
      </span>
    </li>
  );
}

function KitFamilles({ familles, svgs, titre }: { familles: Record<FamilleKit, ElementProfil[]>; svgs: Map<string, string>; titre: string }) {
  return (
    <div className="grid gap-3 rounded-xl border border-black/10 bg-white p-3">
      <h3 className="font-semibold">{titre}</h3>
      {FAMILLES_KIT.map((f) => (
        <div key={f} className="grid gap-1.5">
          <p className="text-sm text-neutral-700">{LIBELLES_FAMILLES_KIT[f].titre} <span className="text-neutral-500">({familles[f].length})</span></p>
          {familles[f].length
            ? <ul className="flex gap-2 overflow-x-auto pb-1">{familles[f].slice(0, 8).map((e) => <Vignette key={e.cle} e={e} svg={svgs.get(e.cle) ?? null} />)}</ul>
            : <p className="text-xs text-neutral-500">Aucun élément étiqueté.</p>}
        </div>
      ))}
    </div>
  );
}

export default async function PageProfils({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const profession = await professionAdmin();
  const pratique = pratiqueDe(profession.id);
  const profils = profilsDePratique(profession.id);
  const [dk, dv, { recettes }, { publications, migrationManquante }, lignes] = await Promise.all([
    getDonneesKits(), getDonneesVisuels(), getRecettes(), getPublications(), getLignesAssetsApprentissage(),
  ]);
  const notes = notesElements(lignes);
  const publieesActives = publications.filter((p) => p.publiee);
  const lignesProfils = profils.map((profil) => {
    const kit = kitDuProfil(profil, { visuels: dv, photos: dk });
    const pubs = new Set(publicationsDuProfil(publieesActives, profil).map((p) => p.recette));
    const rs = recettesDuProfil(profil, recettes, pubs);
    const qualite = rs.length ? Math.max(...rs.map((r) => qualiteComposition(r.composition, r.sujets, notes).part)) : null;
    return { profil, kit, recettes: rs, publiees: pubs, jauge: jaugeProfil(profil, kit, { gardees: rs.filter((r) => (r.note ?? 0) >= 4).length, publiees: pubs.size, qualite }) };
  });
  const choisi = lignesProfils.find((l) => l.profil.id === un(sp.profil)) ?? lignesProfils[0];
  // Aperçus SVG (rendus côté serveur) des visuels montrés dans le kit du profil choisi
  const montres = (k: KitProfil) => [...k.activites.flatMap((a) => FAMILLES_KIT.flatMap((f) => a.familles[f].slice(0, 8))), ...FAMILLES_KIT.flatMap((f) => k.generique[f].slice(0, 8))].filter((e) => !e.url).map((e) => e.cle);
  const cles = new Set(choisi ? montres(choisi.kit) : []);
  const svgs = new Map<string, string>();
  for (const a of inventaireAssets()) if (cles.has(a.cle) && a.rendu.kind === 'svg') { try { svgs.set(a.cle, a.rendu.svg()); } catch { /* aperçu indisponible */ } }
  // « Images à générer pour ce trou » : prompt prêt à copier (aucun appel à un service d'IA)
  const generer = un(sp.generer);
  const activite = pratique.activites.find((a) => a.hashtags.includes(generer));
  const prompt = choisi && generer ? construirePrompt({ sujet: choisi.kit.sujet, emplacement: 'page-sujet', format: formatsEmplacement('page-sujet')[0] ?? 'paysage', gamme: null, langue: 'fr', style: 'phrases', variante: 0, precision: activite?.precision ?? null }) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6" style={{ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) } as CSSProperties}>
      <style>{SURFACES_CSS}</style>
      <div>
        <p className="text-sm"><Link href="/admin/retours" className="font-semibold text-teal-900 underline">← Donner mon avis</Link></p>
        <h1 className="mt-1 text-2xl font-bold">Profils de pratique · {profession.court}</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Chaque profil (thème, activités, public) reçoit son kit de visuels et ses recettes. La jauge dit ce qui est prêt pour un
          praticien : kit complet en éléments validés notés 4-5 ★, recettes gardées, recette entièrement 4-5 ★. Les praticiens ne
          voient que des éléments validés.
        </p>
      </div>
      {migrationManquante && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{MIGRATION_PUBLICATIONS}</p>}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Profils">
        {lignesProfils.map(({ profil, jauge }) => (
          <li key={profil.id}>
            <Link href={`/admin/profils?profil=${profil.id}`} aria-current={choisi?.profil.id === profil.id ? 'true' : undefined}
              className={`grid gap-2 rounded-2xl border bg-white p-4 hover:bg-neutral-50 ${focus} ${choisi?.profil.id === profil.id ? 'border-teal-700 ring-2 ring-teal-700/20' : 'border-black/10'}`}>
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-lg font-semibold">{profil.court}</span>
                <span className="text-xs text-neutral-500">{profil.hashtags.map((h) => `#${h}`).join(' ')}</span>
              </span>
              <Jauge part={jauge.pret} etiquette="Préparation" />
              <span className="text-xs text-neutral-600">Kit {jauge.kit.remplis}/{jauge.kit.attendus} · {jauge.recettes.gardees} recette{jauge.recettes.gardees > 1 ? 's' : ''} 4-5 ★ · {jauge.recettes.publiees} publiée{jauge.recettes.publiees > 1 ? 's' : ''} · {jauge.qualite === null ? 'qualité : —' : `${Math.round(jauge.qualite * 100)} % 4-5 ★`}</span>
            </Link>
          </li>
        ))}
      </ul>

      {choisi && (
        <section aria-labelledby="titre-profil" className="grid gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titre-profil" className="text-xl font-bold">{choisi.profil.court} <span className="text-base font-normal text-neutral-600">· conçu pour {choisi.profil.pour}</span></h2>
            <Link href={`/admin/degustation?profil=${choisi.profil.id}`} className={`min-h-11 content-center rounded-lg border border-teal-800 px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>Dégustation de ce profil</Link>
          </div>

          <div className="grid gap-2">
            <h3 className="font-semibold">Trous à combler ({choisi.jauge.trous.length})</h3>
            {choisi.jauge.trous.length === 0 ? <p className="text-sm text-teal-900">Profil prêt : kit complet, recettes 4-5 ★.</p> : (
              <ul className="grid gap-2">
                {choisi.jauge.trous.map((t) => (
                  <li key={t.id} className="grid gap-2 rounded-xl border border-black/10 bg-white p-3 sm:flex sm:items-center sm:justify-between">
                    <span className="text-sm">{t.texte}</span>
                    <span className="flex flex-wrap gap-2">
                      {t.actions.map((a) => <Link key={a.href} href={a.href} className={`inline-flex min-h-11 items-center rounded-lg bg-neutral-100 px-3 text-sm font-medium text-neutral-900 hover:bg-neutral-200 ${focus}`}>{a.libelle}</Link>)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {prompt && (
            <div id="generer" className="grid gap-2 rounded-xl border border-teal-700/30 bg-teal-50/50 p-3">
              <h3 className="font-semibold">Image à générer · {activite ? `#${activite.hashtags[0]}` : choisi.kit.sujet}</h3>
              {prompt.ok ? <pre className="whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs">{prompt.texte}</pre> : <p className="text-sm text-red-700">{prompt.refus.join(' ')}</p>}
              <p className="text-xs text-neutral-600">À copier dans votre générateur d’images, puis « Importer une image générée » : <Link href="/admin/retours/images-a-generer" className="font-semibold underline">Images à générer</Link> (sujet {choisi.kit.sujet}, hashtag #{activite?.hashtags[0] ?? choisi.kit.sujet}).</p>
            </div>
          )}

          <div className="grid gap-3">
            <h3 className="font-semibold">Kit du profil</h3>
            {choisi.kit.activites.map((a) => (
              <KitFamilles key={a.activite} familles={a.familles} svgs={svgs} titre={`${a.libelle} · #${a.hashtag}${choisi.kit.replis.includes(a.activite) ? ' (aucun visuel : repli sur le kit générique)' : ''}`} />
            ))}
            <KitFamilles familles={choisi.kit.generique} svgs={svgs} titre={`Kit générique du thème (${choisi.kit.sujet})`} />
          </div>

          <div className="grid gap-2">
            <h3 className="font-semibold">Recettes du profil ({choisi.recettes.length})</h3>
            {!choisi.recettes.length ? <p className="text-sm text-neutral-600">Aucune recette gardée pour ce profil. <Link href="/admin/atelier/studio" className="font-semibold text-teal-900 underline">Composer dans le Studio</Link></p> : (
              <ul className="grid gap-2">
                {choisi.recettes.map((r) => {
                  const q = qualiteComposition(r.composition, r.sujets, notes);
                  return (
                    <li key={r.id} className="grid gap-2 rounded-xl border border-black/10 bg-white p-3 sm:flex sm:items-center sm:justify-between">
                      <span className="grid gap-0.5">
                        <span className="font-medium">{r.nom}</span>
                        <span className="text-xs text-neutral-600">{r.note ? `${r.note} ★` : 'non notée'} · {q.texte}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        {choisi.publiees.has(r.id) && <span className="rounded-full bg-teal-800 px-2.5 py-1 text-xs font-semibold text-white">Publiée</span>}
                        <Link href={`/admin/profils/publier?recette=${r.id}&profil=${choisi.profil.id}`} className={`inline-flex min-h-11 items-center rounded-lg border border-teal-800 px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 ${focus}`}>
                          {choisi.publiees.has(r.id) ? 'Modifier la publication' : 'Publier pour les praticiens'}
                        </Link>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
