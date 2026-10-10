import Link from 'next/link';
import { pourcent, type IndicateursPolitique, type JourIndicateurs } from '@plateforme/core';

// Indicateurs de la politique d'évaluation (politique-evaluation.ts) sur le tableau de bord : taux de répétition (objectif < 5 %),
// qualité moyenne des éléments présentés, part de jamais-notés, règles apprises ; tendance sur 30 jours (une courbe par indicateur).

const virgule = (x: number | null, d = 2) => (x === null ? '—' : x.toFixed(d).replace('.', ','));

function Courbe({ jours, cle, min, max, titre, format }: { jours: JourIndicateurs[]; cle: 'repetition' | 'qualite' | 'jamaisNotes'; min: number; max: number; titre: string; format: (x: number) => string }) {
  const L = 300, H = 56, n = jours.length;
  const pts = jours.map((j, i) => ({ i, v: j[cle] })).filter((p): p is { i: number; v: number } => p.v !== null);
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * (L - 8) + 4 : L / 2);
  const y = (v: number) => H - 6 - ((Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * (H - 12);
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const dernier = pts.at(-1);
  return (
    <figure className="grid gap-1 rounded-xl border border-black/5 bg-white p-3">
      <figcaption className="flex items-baseline justify-between gap-2 text-xs text-neutral-600">
        <span>{titre}</span><span className="tabular-nums font-semibold text-neutral-900">{dernier ? format(dernier.v) : '—'}</span>
      </figcaption>
      <svg viewBox={`0 0 ${L} ${H}`} className="h-14 w-full" role="img" aria-label={`${titre} sur 30 jours${dernier ? ` : dernier jour ${format(dernier.v)}` : ' : pas encore de données'}`} preserveAspectRatio="none">
        <line x1="0" x2={L} y1={H - 6} y2={H - 6} stroke="currentColor" className="text-neutral-200" strokeWidth="1" />
        {d && <path d={d} fill="none" stroke="currentColor" className="text-teal-700" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {pts.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="2" className="fill-teal-700" />)}
      </svg>
      <span className="flex justify-between text-[11px] text-neutral-500"><span>{jours[0]?.jour.slice(8, 10)}/{jours[0]?.jour.slice(5, 7)}</span><span>aujourd’hui</span></span>
    </figure>
  );
}

export default function IndicateursEvaluation({ ind }: { ind: (IndicateursPolitique & { migrationManquante: boolean }) | null }) {
  if (!ind) return null;
  const rep = ind.tauxRepetition;
  const cartes = [
    { titre: 'Répétition', valeur: pourcent(rep), detail: `objectif < ${pourcent(ind.objectifRepetition, 0)} · ${ind.ecrans} écrans`, alerte: rep !== null && rep >= ind.objectifRepetition, href: '/admin/retours/tranches' },
    { titre: 'Qualité présentée', valeur: ind.qualiteMoyenne === null ? '—' : `${virgule(ind.qualiteMoyenne)} ★`, detail: 'moyenne des éléments montrés', alerte: false, href: '/admin/degustation' },
    { titre: 'Jamais notés', valeur: pourcent(ind.partJamaisNotes, 0), detail: 'des éléments montrés', alerte: false, href: '/admin/retours' },
    { titre: 'Règles apprises', valeur: String(ind.regles), detail: 'de tes retours', alerte: false, href: '/admin/retours/compris' },
  ];
  return (
    <section aria-labelledby="tb-evaluation" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="tb-evaluation" className="text-lg font-semibold">Évaluation</h2>
        <Link href="/admin/retours/compris" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline">Ce que j’ai compris de tes retours</Link>
      </div>
      {ind.migrationManquante && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200">Migration 0054 à exécuter : les écrans passés sans réponse ne sont comptés que dans ce navigateur.</p>}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartes.map((c) => (
          <Link key={c.titre} href={c.href} className={`grid gap-0.5 rounded-xl border bg-white p-4 hover:border-teal-700/40 ${c.alerte ? 'border-amber-300' : 'border-black/5'}`}>
            <dt className="text-xs text-neutral-500">{c.titre}</dt>
            <dd className="text-2xl font-bold tabular-nums">{c.valeur}</dd>
            <dd className="text-xs text-neutral-600">{c.detail}</dd>
          </Link>
        ))}
      </dl>
      <div className="grid gap-3 md:grid-cols-3">
        <Courbe jours={ind.tendance} cle="repetition" min={0} max={0.3} titre="Répétition par jour" format={(v) => pourcent(v)} />
        <Courbe jours={ind.tendance} cle="qualite" min={1} max={5} titre="Qualité présentée par jour" format={(v) => `${virgule(v)} ★`} />
        <Courbe jours={ind.tendance} cle="jamaisNotes" min={0} max={1} titre="Jamais notés par jour" format={(v) => pourcent(v, 0)} />
      </div>
    </section>
  );
}
