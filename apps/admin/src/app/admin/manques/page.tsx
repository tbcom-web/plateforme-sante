import Link from 'next/link';
import type { CSSProperties } from 'react';
import '@plateforme/core/dessins.css';
import { inventaireAssets, profilsDePratique, themePratique, pratiqueDe, SURFACES_CSS, variablesCharte, variablesGamme, gamme as gammeParId } from '@plateforme/core';
import { gammePourManque, manquesDuProfil, promptsDuManque, CONDITIONS_OUTILS, LIBELLES_EMPLACEMENTS_MANQUES, MENTION_CONDITIONS, type Manque } from '@plateforme/core/manques';
import { lienSujet } from '@plateforme/core/sujets-validation';
import { exigerAdmin } from '@/lib/admin';
import { getProfession } from '@/lib/profession';
import { getDonneesManques } from '@/lib/manques';
import { profilDepuisParametre } from '@/lib/composeur';
import { migration0040Manquante, migration0048Manquante } from '@/lib/images-generees';
import CarteManque, { type CarteManqueProps } from './CarteManque';

export const metadata = { title: 'Super admin · Manques' };

// ATELIER DES MANQUES (demande validée par Paul le 2026-10-11, packages/core/src/manques.ts) : ce qui manque
// aux modèles, du plus bloquant au moins bloquant (profils bloqués, manques remontés par le composeur), par profil. Chaque carte :
// ce qui existe, ce qui manque, le PROMPT prêt à copier ou à partager (ChatGPT / Gemini pour les photos, demande à Claude pour les
// SVG), et « Déposer l'image générée » (téléphone : appareil photo ou galerie) : l'image est rattachée au manque, convertie en WebP et
// arrive dans 🎯 À valider, dans le bon sujet. OK là-bas : elle entre dans le kit du profil, le manque se ferme seul.
// Accessible depuis 🎯 À valider et depuis le composeur (« Ce qui manque pour ce profil »). Aucun appel à un service d'IA.

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const puce = (actif: boolean) => `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${actif ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white text-neutral-800'} ${focus}`;
const PAR_PAGE = 20;

export default async function PageManques({ searchParams }: PageProps<'/admin/manques'>) {
  await exigerAdmin();
  const sp = await searchParams;
  const param = typeof sp.profil === 'string' ? sp.profil.trim() : '';
  const tout = sp.tout === '1';
  const profession = await getProfession();
  const pr = pratiqueDe(profession.id);
  const [d, migration, migration0048] = await Promise.all([getDonneesManques(profession.id), migration0040Manquante(), migration0048Manquante()]);

  // Filtre : profil de référence, sinon profil composé du composeur (« sport+diabete~course »)
  const reference = profilsDePratique(profession.id).find((p) => p.id === param && p.principal);
  const compose = !reference && param ? profilDepuisParametre(param, profession.id) : null;
  const sujetsCompose = compose ? [...compose.principaux, ...(compose.secondaires ?? [])].map((t) => themePratique(pr, t)?.sujetVisuel ?? t) : [];
  const filtres: Manque[] = reference ? manquesDuProfil(d.manques, { id: reference.id })
    : compose ? manquesDuProfil(d.manques, { sujets: sujetsCompose, activites: compose.activites ?? [] })
      : d.manques;
  const affiches = tout ? filtres : filtres.slice(0, PAR_PAGE);
  const nomFiltre = reference?.court ?? compose?.nom ?? null;

  // Aperçus SVG de ce qui existe (cartes affichées seulement)
  const cles = new Set(affiches.flatMap((m) => m.existants.filter((e) => !e.url).map((e) => e.cle)));
  const svgs: Record<string, string> = {};
  if (cles.size) for (const a of inventaireAssets()) if (cles.has(a.cle) && a.rendu.kind === 'svg') { try { svgs[a.cle] = a.rendu.svg(); } catch { /* aperçu indisponible */ } }

  const cartes: CarteManqueProps['manque'][] = affiches.map((m, i) => {
    const famille = m.emplacement === 'photo-accueil' ? 'photo' : m.emplacement;
    const refs = d.references[`${m.sujet}|${famille}`] ?? [];
    const prompts = promptsDuManque(m, {
      profession: profession.id, gamme: gammePourManque(m.sujet, d.notes),
      references: famille === 'photo' ? refs.slice(0, 3) : [], modeles: famille !== 'photo' ? refs.slice(0, 5) : [],
    });
    const sujetValider = m.profils[0] ?? null;
    return { ...m, rang: i + 1, prompts, lienValider: sujetValider ? lienSujet(sujetValider) : '/admin/sujets' };
  });
  const pc = Math.round(d.progression.part * 100);
  const style = { ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) } as CSSProperties;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" style={style}>
      <style>{SURFACES_CSS + '.mq-svg svg{width:100%;height:100%;display:block}'}</style>
      <div className="grid gap-1">
        <p className="flex flex-wrap gap-x-4 text-sm">
          <Link href="/admin/sujets" className="font-semibold text-teal-900 underline">← 🎯 À valider</Link>
          <Link href="/chaine/composer" className="font-semibold text-teal-900 underline">Composeur</Link>
        </p>
        <h1 className="text-2xl font-bold">🧩 Manques</h1>
        <p className="max-w-3xl text-sm text-neutral-600">
          Ce qui manque aux modèles, le plus bloquant d’abord. Copiez le prompt, générez, puis « Déposer l’image générée » : elle arrive dans 🎯 À valider, dans le bon sujet.
          Une fois OK, elle sert aux kits, au composeur et aux modèles, sans autre geste.
        </p>
      </div>

      <section aria-label="Progression" className="grid gap-2 rounded-xl border border-black/10 bg-white p-3" data-progression={pc}>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold">{d.progression.prets} / {d.progression.emplacements} emplacements prêts</span>
          <span className="tabular-nums font-semibold">{pc} %</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pc} aria-label="Emplacements prêts">
          <div className={`h-full rounded-full ${pc >= 80 ? 'bg-teal-700' : pc >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.max(3, pc)}%` }} />
        </div>
        <p className="text-xs text-neutral-600">
          {d.manques.length} manque{d.manques.length > 1 ? 's' : ''} · {d.progression.enCours} en cours (à valider) · {d.progression.combles} comblé{d.progression.combles > 1 ? 's' : ''} grâce à l’atelier
          {d.composeurLu ? ` · composeur : ${d.composeurLu} profil${d.composeurLu > 1 ? 's' : ''} lu${d.composeurLu > 1 ? 's' : ''}` : ' · composeur : aucun profil calculé pour l’instant'}
        </p>
      </section>

      <nav aria-label="Profils" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href="/admin/manques" className={puce(!param)} aria-current={!param ? 'page' : undefined}>Tous <span className="tabular-nums opacity-80">{d.manques.length}</span></Link>
        {d.parProfil.map((p) => (
          <Link key={p.id} href={`/admin/manques?profil=${encodeURIComponent(p.id)}`} className={puce(param === p.id)} aria-current={param === p.id ? 'page' : undefined}>
            {p.nom} <span className="tabular-nums opacity-80">{p.manques}</span>
          </Link>
        ))}
      </nav>
      {param && !nomFiltre && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Profil inconnu : tous les manques sont affichés.</p>}
      {nomFiltre && <p className="text-sm text-neutral-700">Ce qui manque pour <strong>{nomFiltre}</strong> : {filtres.length} manque{filtres.length > 1 ? 's' : ''}.</p>}
      {migration && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Migration à exécuter (<code>0040_images_generees.sql</code>) : les prompts fonctionnent, le dépôt d’images l’attend.</p>}

      {!filtres.length && <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-950 ring-1 ring-teal-200">Rien ne manque ici : chaque emplacement a au moins 3 choix notés 4-5 ★.</p>}
      <ol className="grid gap-4" aria-label="Manques, le plus bloquant d’abord">
        {cartes.map((m) => (
          <li key={m.id}><CarteManque manque={m} svgs={Object.fromEntries(m.existants.filter((e) => svgs[e.cle]).map((e) => [e.cle, svgs[e.cle]]))}
            migrationManquante={migration} migration0048Manquante={migration0048} profession={profession.id} conditions={CONDITIONS_OUTILS} /></li>
        ))}
      </ol>
      {!tout && filtres.length > PAR_PAGE && (
        <Link href={`/admin/manques?${new URLSearchParams({ ...(param ? { profil: param } : {}), tout: '1' })}`} className={`min-h-11 justify-self-start rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold ${focus}`}>
          Voir les {filtres.length - PAR_PAGE} autres manques
        </Link>
      )}

      <details className="rounded-xl border border-black/10 bg-white p-3 text-sm">
        <summary className="min-h-11 cursor-pointer font-semibold">Conditions d’usage des outils (rappel)</summary>
        <ul className="mt-2 grid gap-2">
          {(Object.keys(CONDITIONS_OUTILS) as (keyof typeof CONDITIONS_OUTILS)[]).map((o) => (
            <li key={o}><strong>{CONDITIONS_OUTILS[o].libelle}</strong> : {CONDITIONS_OUTILS[o].texte} <a href={CONDITIONS_OUTILS[o].url} target="_blank" rel="noreferrer" className="underline">Conditions</a></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-600">{MENTION_CONDITIONS}</p>
        <p className="mt-1 text-xs text-neutral-600">Emplacements : {Object.values(LIBELLES_EMPLACEMENTS_MANQUES).join(' · ')}.</p>
      </details>
    </div>
  );
}
