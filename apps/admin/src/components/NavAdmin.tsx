'use client';

// Menu du super admin (espaces : packages/core/src/admin-espaces.ts) : grand écran — espaces en onglets, outils de l'espace
// actif en dessous ; téléphone — bouton « Menu » qui ouvre un tiroir avec tous les espaces et leurs outils. Sélecteur de
// profession global (professions.ts, cookie mémorisé), fil d'Ariane. Aucun libellé de métier ici : tout vient des données.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ACCUEIL_ADMIN, ESPACES, entreeActive, filAriane, type EntreeMenu } from '@plateforme/core/admin-espaces';
import { choisirProfession } from '@/app/admin/actions-profession';

type Compteurs = { arrivages: number; nouveautes: number };
type Props = {
  /** Compteurs, ou leur promesse (layout : le menu s'affiche tout de suite, les pastilles arrivent ensuite) */
  compteurs: Compteurs | Promise<Compteurs>;
  professions: { id: string; libelle: string; court: string }[];
  profession: string;
};

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

function Pastille({ n, libelle }: { n: number; libelle: string }) {
  if (!n) return null;
  return <span className="rounded-full bg-amber-300 px-1.5 text-xs font-bold tabular-nums text-amber-950" title={`${n} ${libelle}`}><span className="sr-only">, {libelle} : </span>{n}</span>;
}

const estPromesse = (x: unknown): x is Promise<Compteurs> => Boolean(x) && typeof (x as { then?: unknown }).then === 'function';

export default function NavAdmin({ compteurs: compteursRecus, professions, profession }: Props) {
  const [compteurs, setCompteurs] = useState<Compteurs>(() => (estPromesse(compteursRecus) ? { arrivages: 0, nouveautes: 0 } : compteursRecus));
  useEffect(() => {
    let actif = true;
    Promise.resolve(compteursRecus).then((c) => { if (actif && c) setCompteurs(c); }, () => { /* compteurs indisponibles : 0 */ });
    return () => { actif = false; };
  }, [compteursRecus]);
  const chemin = usePathname() ?? '/admin';
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();
  const actif = entreeActive(chemin);
  const accueil = chemin === ACCUEIL_ADMIN.href;
  const fil = filAriane(chemin);
  const tiroir = useRef<HTMLDivElement>(null);
  const compteur = (e: Pick<EntreeMenu, 'compteur'>) => (e.compteur ? compteurs[e.compteur] : 0);
  const libelleCompteur = (e: Pick<EntreeMenu, 'compteur'>) => (e.compteur === 'arrivages' ? 'en attente' : 'nouveautés à noter');

  // Le tiroir se ferme à chaque changement de page et avec Échap ; focus sur son premier lien à l'ouverture
  useEffect(() => { setOuvert(false); }, [chemin]);
  useEffect(() => {
    if (!ouvert) return;
    tiroir.current?.querySelector<HTMLElement>('a,button')?.focus();
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [ouvert]);

  const changerProfession = (id: string) => demarrer(async () => { await choisirProfession(id); router.refresh(); });

  const selecteur = (id: string) => (
    <label className="flex shrink-0 items-center gap-1.5 text-sm">
      <span className="text-neutral-600">Profession</span>
      <select id={id} value={profession} disabled={enCours} onChange={(e) => changerProfession(e.target.value)}
        className={`h-10 max-w-[11rem] rounded-lg border border-neutral-300 bg-white px-2 text-sm font-semibold ${focus}`}>
        {professions.map((p) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
      </select>
    </label>
  );

  const lienEspace = (e: (typeof ESPACES)[number]) => {
    const courant = actif?.espace.id === e.id;
    const n = e.entrees.reduce((s, x) => s + (x.compteur === 'arrivages' ? compteur(x) : 0), 0);
    return (
      <Link key={e.id} href={e.href} aria-current={courant ? 'true' : undefined}
        className={`flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-semibold ${focus} ${courant ? 'bg-teal-800 text-white' : 'text-neutral-800 hover:bg-neutral-100'}`}>
        {e.libelle}<Pastille n={n} libelle="arrivages en attente" />
      </Link>
    );
  };

  const lienEntree = (x: EntreeMenu, grand = false) => {
    const courant = actif?.entree.href === x.href;
    return (
      <Link key={x.href} href={x.href} aria-current={courant ? 'page' : undefined}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 ${grand ? 'min-h-11 text-base' : 'min-h-9 text-sm'} ${focus} ${courant ? 'bg-teal-50 font-semibold text-teal-950 ring-1 ring-teal-200' : 'text-neutral-700 hover:bg-neutral-100'}`}>
        {x.libelle}<Pastille n={compteur(x)} libelle={libelleCompteur(x)} />
      </Link>
    );
  };

  const espace = actif?.espace;
  return (
    <div className="mb-5 grid gap-2 sm:mb-6">
      {/* Grand écran : espaces en onglets */}
      <nav aria-label="Super admin" className="hidden flex-wrap items-center gap-1 rounded-2xl border border-black/5 bg-white p-1.5 text-sm md:flex">
        <Link href={ACCUEIL_ADMIN.href} aria-current={accueil ? 'page' : undefined}
          className={`flex min-h-10 items-center rounded-full px-3 font-semibold ${focus} ${accueil ? 'bg-amber-100 text-amber-950' : 'text-amber-900 hover:bg-amber-50'}`}>Super admin</Link>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-black/10" />
        {ESPACES.map(lienEspace)}
        <span className="ml-auto">{selecteur('profession-large')}</span>
      </nav>
      {espace && espace.entrees.length > 1 && (
        <nav aria-label={`Outils : ${espace.libelle}`} className="hidden flex-wrap items-center gap-1 md:flex">
          {espace.entrees.filter((x) => !x.secondaire).map((x) => lienEntree(x))}
          {espace.entrees.some((x) => x.secondaire) && (
            <details className="relative">
              <summary className={`flex min-h-9 cursor-pointer list-none items-center rounded-lg px-2.5 text-sm text-neutral-700 hover:bg-neutral-100 ${focus} ${espace.entrees.some((x) => x.secondaire && actif?.entree.href === x.href) ? 'font-semibold text-teal-950' : ''}`}>Plus ▾</summary>
              <div className="absolute left-0 z-30 mt-1 grid min-w-48 gap-0.5 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
                {espace.entrees.filter((x) => x.secondaire).map((x) => lienEntree(x))}
              </div>
            </details>
          )}
        </nav>
      )}

      {/* Téléphone : bouton Menu + tiroir */}
      <div className="flex items-center gap-2 md:hidden">
        <button type="button" onClick={() => setOuvert(true)} aria-expanded={ouvert} aria-controls="tiroir-admin"
          className={`flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-3 text-sm font-semibold text-white ${focus}`}>
          <span aria-hidden="true" className="grid gap-[3px]"><span className="block h-0.5 w-4 bg-white" /><span className="block h-0.5 w-4 bg-white" /><span className="block h-0.5 w-4 bg-white" /></span>
          Menu<Pastille n={compteurs.arrivages} libelle="arrivages en attente" />
        </button>
        <span className="min-w-0 truncate text-sm font-semibold text-neutral-800">{espace?.libelle ?? 'Super admin'}</span>
      </div>
      {ouvert && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu du super admin">
          <button type="button" aria-label="Fermer le menu" onClick={() => setOuvert(false)} className="absolute inset-0 bg-black/40" />
          <div id="tiroir-admin" ref={tiroir} className="absolute inset-y-0 left-0 grid w-[min(22rem,88vw)] content-start gap-3 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <Link href={ACCUEIL_ADMIN.href} className={`flex min-h-11 items-center font-bold text-amber-900 ${focus}`}>Super admin · {ACCUEIL_ADMIN.libelle}</Link>
              <button type="button" onClick={() => setOuvert(false)} className={`grid size-11 place-items-center rounded-lg text-xl ring-1 ring-black/10 ${focus}`} aria-label="Fermer">×</button>
            </div>
            {selecteur('profession-tiroir')}
            {ESPACES.map((e) => (
              <section key={e.id} aria-labelledby={`tiroir-${e.id}`} className="grid gap-0.5 border-t border-black/5 pt-2">
                <h2 id={`tiroir-${e.id}`}><Link href={e.href} className={`flex min-h-11 items-center font-bold text-teal-900 ${focus}`}>{e.libelle}</Link></h2>
                {e.entrees.filter((x) => x.href !== e.href || e.entrees.length > 1).map((x) => lienEntree(x, true))}
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Fil d'Ariane */}
      {fil.length > 1 && (
        <nav aria-label="Fil d’Ariane" className="text-sm text-neutral-600">
          <ol className="flex flex-wrap items-center gap-x-1.5">
            {fil.map((m, i) => (
              <li key={`${m.href}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true" className="text-neutral-400">›</span>}
                {i === fil.length - 1 ? <span aria-current="page" className="font-semibold text-neutral-900">{m.libelle}</span> : <Link href={m.href} className="inline-flex min-h-11 items-center underline-offset-2 hover:underline md:min-h-0">{m.libelle}</Link>}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
