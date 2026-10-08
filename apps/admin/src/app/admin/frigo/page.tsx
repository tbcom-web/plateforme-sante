import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
  couvertureParSujet, estIngredientUnitaire, gamme as gammeParId, hashtagsDe, inventaireAssets, inventaireStudio, LIBELLES_STATUTS_ILLUSTRATION, libelleSujet,
  statutsAvecHeritage, SUJETS_VISUELS, sujetsDuVisuel, SURFACES_CSS, variablesCharte, variablesGamme, type Asset, type StatutIllustration,
} from '@plateforme/core';
import { etatNouveaute, estTypeIngredient, typeIngredient, TYPES_INGREDIENTS, type TypeIngredient } from '@plateforme/core/arrivages';
import { estDeLaProfession, sujetDeLaProfession } from '@plateforme/core/professions';
import { exigerAdmin } from '@/lib/admin';
import { getEtatsNouveautes } from '@/lib/arrivages';
import { getPhotosDesJeux, getSurchargesSujets, lireAssetsNotesApprentissage } from '@/lib/assets-notes';
import { getHashtagsAssets } from '@/lib/hashtags';
import { getRevuesIllustrations } from '@/lib/illustrations';
import { getProfession } from '@/lib/profession';
import { getTranches } from '@/lib/tranches';

export const metadata = { title: 'Super admin · Frigo' };

// FRIGO (décision de Paul du 2026-10-08, docs/espaces-admin.md) : les ingrédients ACCEPTÉS, par type (photos, illustrations,
// icônes, animations, palettes, polices, mises en page, éléments), avec note moyenne, thèmes, hashtags et statut ; couverture par
// thème en tête. Hors frigo : arrivages en attente ou refusés (arrivages.ts), retirés, à retravailler, tranchés 1 ★. Les ingrédients
// d'avant les Arrivages (registre des nouveautés à sa date de départ) sont au frigo. Lecture seule : on trie, on tranche et on
// révise depuis « Trier par sujet », « Éléments tranchés » et la bibliothèque complète.

const PAR_PAGE = 48;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function Frigo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerAdmin();
  const sp = await searchParams;
  const profession = await getProfession();
  const [photosJeux, surcharges, hashtags, revues, notes, etats, tranches] = await Promise.all([
    getPhotosDesJeux(), getSurchargesSujets(), getHashtagsAssets(), getRevuesIllustrations(), lireAssetsNotesApprentissage(), getEtatsNouveautes(), getTranches(),
  ]);
  const deLaProfession = estDeLaProfession({}, profession.id);

  // Notes (moyenne, nombre, dernière) par clé
  const moyennes = new Map<string, { s: number; n: number }>();
  const dernieres: Record<string, number> = {};
  for (const l of (Array.isArray(notes.data) ? notes.data : []) as { cle_asset: string; note: number | null }[]) {
    if (typeof l.note !== 'number') continue;
    const m = moyennes.get(l.cle_asset) ?? { s: 0, n: 0 };
    m.s += l.note; m.n++;
    moyennes.set(l.cle_asset, m);
    if (!(l.cle_asset in dernieres)) dernieres[l.cle_asset] = l.note;
  }
  const inventaire: Asset[] = deLaProfession ? [...inventaireAssets({ photosJeux }), ...inventaireStudio().filter((a) => estIngredientUnitaire(a.cle))] : [];
  const statutsBruts = Object.fromEntries(revues.statuts.map((s) => [s.cle, s.statut])) as Record<string, StatutIllustration>;
  const statuts = statutsAvecHeritage(statutsBruts, inventaire.map((a) => a.cle));
  const recentes = new Set(etats.recentes.map((r) => r.cle));
  const refuses = tranches.tranches.refuses;
  const auFrigo = inventaire.filter((a) => {
    if (refuses.has(a.cle)) return false;
    if (recentes.has(a.cle)) return etatNouveaute(a.cle, { statuts: etats.statuts, dernieresNotes: etats.dernieresNotes }) === 'accepte';
    const s = statuts[a.cle];
    return s !== 'retire' && s !== 'a_retravailler';
  }).filter((a) => a.type !== 'photo' || sujetsDuVisuel(a, surcharges).sujets.some((s) => { const x = SUJETS_VISUELS.find((y) => y.id === s); return !x || sujetDeLaProfession(x, profession); }));

  const parType = new Map<TypeIngredient, Asset[]>(TYPES_INGREDIENTS.map((t) => [t.id, []]));
  for (const a of auFrigo) parType.get(typeIngredient(a.cle))!.push(a);
  const typeChoisi: TypeIngredient = estTypeIngredient(un(sp.type)) ? (un(sp.type) as TypeIngredient) : (TYPES_INGREDIENTS.find((t) => parType.get(t.id)!.length)?.id ?? 'photo');
  const theme = SUJETS_VISUELS.some((s) => s.id === un(sp.theme)) ? un(sp.theme) : '';
  const liste = parType.get(typeChoisi)!.filter((a) => !theme || sujetsDuVisuel(a, surcharges).sujets.includes(theme))
    .sort((a, b) => (moyennes.get(b.cle)?.s ?? 0) / (moyennes.get(b.cle)?.n || 1) - (moyennes.get(a.cle)?.s ?? 0) / (moyennes.get(a.cle)?.n || 1));
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(un(sp.page), 10) || 1));
  const visibles = liste.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);
  const lien = (c: Record<string, string>) => {
    const u = new URLSearchParams(Object.entries({ type: typeChoisi, theme, ...c }).filter(([, v]) => v) as [string, string][]);
    return `/admin/frigo${u.size ? `?${u}` : ''}`;
  };

  // Couverture par thème (visuels du frigo, mêmes règles que « Trier par sujet »)
  const visuels = auFrigo.filter((a) => ['picto', 'dessin', 'ligne', 'materiel', 'animation', 'heros', 'biblio', 'photo'].includes(a.type)).map((a) => ({ cle: a.cle, type: a.type, soins: a.soins, statut: statuts[a.cle] ?? null }));
  const couverture = couvertureParSujet(visuels, surcharges).filter((c) => { const s = SUJETS_VISUELS.find((x) => x.id === c.sujet); return !s || sujetDeLaProfession(s, profession); });
  const style = { ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) } as CSSProperties;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6" style={style}>
      <style>{SURFACES_CSS + '.fr-svg svg{width:100%;height:100%;display:block}'}</style>
      <div>
        <h1 className="text-2xl font-bold">Frigo</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Les ingrédients acceptés, que le générateur peut utiliser ({profession.libelle}). Ce qui attend une décision est dans les{' '}
          <Link href="/admin/arrivages" className="font-semibold text-teal-900 underline">Arrivages</Link>.
        </p>
      </div>

      <section aria-labelledby="fr-couv" className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="fr-couv" className="text-lg font-semibold">Couverture par thème</h2>
          <Link href="/admin/frigo/tri?vue=couverture" className="text-sm font-semibold text-teal-900 underline">Détail et manques</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-600">
              <tr><th className="p-2">Thème</th><th className="p-2 text-right">Héros</th><th className="p-2 text-right">Illustrations</th><th className="p-2 text-right">Icônes</th><th className="p-2 text-right">Photos</th><th className="p-2 text-right">Animations</th></tr>
            </thead>
            <tbody>
              {couverture.map((c) => {
                const illus = Object.values(c.illustrations).reduce((s, n) => s + n, 0);
                const cell = (n: number, alerte: boolean) => <td className={`p-2 text-right tabular-nums ${alerte ? 'bg-red-50 font-semibold text-red-900' : ''}`}>{n}</td>;
                return (
                  <tr key={c.sujet} className="border-t border-black/5">
                    <th scope="row" className="p-2 text-left font-semibold"><Link href={lien({ theme: c.sujet, page: '' })} className="underline-offset-2 hover:underline">{c.libelle}</Link></th>
                    {cell(c.heros, !c.heros && c.sujet !== 'general')}
                    {cell(illus, !illus && c.sujet !== 'general')}
                    {cell(c.icones, !c.icones && c.sujet !== 'general')}
                    {cell(c.photosImportees + c.photosIntegrees, !c.photosImportees)}
                    {cell(c.animations, false)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="fr-types" className="grid gap-3">
        <h2 id="fr-types" className="sr-only">Ingrédients par type</h2>
        <nav aria-label="Types d’ingrédients" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {TYPES_INGREDIENTS.map((t) => (
            <Link key={t.id} href={lien({ type: t.id, page: '' })} aria-current={t.id === typeChoisi ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ring-1 ${t.id === typeChoisi ? 'bg-teal-800 font-semibold text-white ring-teal-900' : 'bg-white ring-black/10 hover:bg-neutral-50'}`}>
              {t.pluriel} <span className="tabular-nums opacity-80">{parType.get(t.id)!.length}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-600">Thème :</span>
          <Link href={lien({ theme: '', page: '' })} className={`rounded-full px-2.5 py-1 ring-1 ${!theme ? 'bg-neutral-800 text-white ring-neutral-900' : 'bg-white ring-black/10'}`}>Tous</Link>
          {SUJETS_VISUELS.filter((s) => sujetDeLaProfession(s, profession)).map((s) => (
            <Link key={s.id} href={lien({ theme: s.id, page: '' })} className={`rounded-full px-2.5 py-1 ring-1 ${theme === s.id ? 'bg-neutral-800 text-white ring-neutral-900' : 'bg-white ring-black/10'}`}>{s.libelle}</Link>
          ))}
        </div>
        <p className="text-sm text-neutral-600">{liste.length} ingrédient{liste.length > 1 ? 's' : ''}{pages > 1 ? ` · page ${page} sur ${pages}` : ''} · les mieux notés d’abord</p>
        {visibles.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-600 ring-1 ring-black/5">Rien de ce type au frigo pour l’instant.</p> : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibles.map((a) => {
              const m = moyennes.get(a.cle);
              const sujets = a.rendu.kind === 'studio' ? [] : sujetsDuVisuel(a, surcharges).sujets;
              const tags = hashtagsDe(hashtags.hashtags, a.cle);
              const st = statuts[a.cle];
              return (
                <li key={a.cle} className="grid content-start gap-2 rounded-2xl border border-black/5 bg-white p-2.5">
                  <Vignette a={a} />
                  <p className="line-clamp-2 text-sm font-semibold" title={a.titre}>{a.titre}</p>
                  <p className="flex flex-wrap gap-1 text-xs">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-900 tabular-nums">{m ? `${(m.s / m.n).toFixed(1).replace('.', ',')} ★ · ${m.n}` : 'pas noté'}</span>
                    {st && st !== 'a_revoir' && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">{LIBELLES_STATUTS_ILLUSTRATION[st]}</span>}
                  </p>
                  {sujets.length > 0 && <p className="text-xs text-neutral-600">{sujets.map(libelleSujet).join(' · ')}</p>}
                  {tags.length > 0 && <p className="truncate text-xs text-teal-900" title={tags.map((t) => `#${t}`).join(' ')}>{tags.map((t) => `#${t}`).join(' ')}</p>}
                  <Link href={`/admin/retours?cle=${encodeURIComponent(a.cle)}`} className="mt-auto flex min-h-11 items-center text-xs font-semibold text-teal-900 underline">Noter ou revoir</Link>
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center gap-3 text-sm">
            {page > 1 && <Link href={lien({ page: String(page - 1) })} className="flex min-h-11 items-center rounded-lg bg-white px-3 ring-1 ring-black/10">← Précédente</Link>}
            <span className="text-neutral-600">Page {page} sur {pages}</span>
            {page < pages && <Link href={lien({ page: String(page + 1) })} className="flex min-h-11 items-center rounded-lg bg-white px-3 ring-1 ring-black/10">Suivante →</Link>}
          </nav>
        )}
      </section>
    </div>
  );
}

/** Vignette rendue côté serveur : SVG sur le fond de son registre, image, nuancier, ou nom de l'élément (polices, mises en page…) */
function Vignette({ a }: { a: Asset }) {
  const cadre = 'grid aspect-square w-full place-items-center overflow-hidden rounded-xl ring-1 ring-black/10';
  if (a.rendu.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={a.rendu.src} alt="" loading="lazy" decoding="async" className="aspect-square w-full rounded-xl object-cover" />;
  }
  if (a.rendu.kind === 'svg') {
    const f = a.rendu.fond;
    let svg = '';
    try { svg = a.rendu.svg(); } catch { svg = ''; }
    return (
      <div className={`${cadre} ${f === 'grille' ? 'surface-grille' : f === 'plan' ? 'surface-plan' : ''}`} style={{ background: f === 'doux' ? 'var(--doux)' : f === 'grille' || f === 'plan' ? undefined : 'var(--fond)', color: 'var(--encre)' }}>
        <div className={`fr-svg ${a.type === 'picto' ? 'size-14' : 'h-[88%] w-[88%]'}`} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    );
  }
  if (a.rendu.kind === 'gamme') {
    const g = gammeParId(a.rendu.gamme);
    const couleurs = g ? Object.values(variablesGamme(g)).filter((v): v is string => typeof v === 'string' && v.startsWith('#')).slice(0, 5) : [];
    return <div className={`${cadre} grid-cols-5 gap-0`}>{couleurs.map((c, i) => <span key={i} className="h-full w-full" style={{ background: c }} />)}</div>;
  }
  return <div className={`${cadre} bg-neutral-50 p-2 text-center text-xs text-neutral-600`}>{a.detail ?? a.type}</div>;
}
