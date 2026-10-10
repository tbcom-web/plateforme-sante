import Link from 'next/link';
import type { BoutonGuide, ProchaineAction } from '@plateforme/core';
import BoutonImporterClaude from './BoutonImporterClaude';

// Bandeau « Prochaine étape » (chaîne guidée, packages/core/src/chaine-guidage.ts) : en tête du tableau et de chaque étape, UNE action,
// son pourquoi, un gros bouton qui y mène, le fil des 6 étapes jusqu'au modèle prêt pour les clients. Mobile d'abord (Paul pilote
// souvent depuis son téléphone) : bouton pleine largeur, fil en 6 pastilles numérotées.
const QUI: Record<ProchaineAction['qui'], string> = { vous: 'À vous', paul: 'Paul', claude: 'Claude', agent: 'Automatique' };

function Bouton({ b, principal }: { b: BoutonGuide; principal: boolean }) {
  if ('action' in b) return <BoutonImporterClaude libelle={b.libelle} principal={principal} />;
  return principal
    ? <Link href={b.href} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-800 px-5 text-center text-base font-semibold text-white shadow-sm hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 sm:w-auto" data-action-guidee="">{b.libelle}</Link>
    : <Link href={b.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-900 underline">{b.libelle}</Link>;
}

/**
 * `ici` : chemin de la page affichée. Version COMPACTE (fiche, relecture : on y travaille déjà) : une ligne et le bouton, sans le
 * fil ; « Vous y êtes » quand la prochaine étape est justement cette page.
 */
export default function ProchaineEtape({ action, importes = 0, compact = false, ici }: { action: ProchaineAction; importes?: number; compact?: boolean; ici?: string }) {
  const courante = action.fil.find((x) => x.ici) ?? action.fil[0];
  const surPlace = Boolean(ici && action.bouton && 'href' in action.bouton && action.bouton.href.split('#')[0] === ici);
  // Déjà sur la page de la prochaine étape (présélection, tournoi…) : version compacte, le travail reste au premier écran du téléphone
  if (compact || surPlace) {
    return (
      <section aria-label="Prochaine étape" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-teal-700 bg-teal-50/70 px-3 py-2 text-sm" data-prochaine-action={action.id}>
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-900">Prochaine étape {courante.n} / 6</span>
        <span className="min-w-0 flex-1 basis-56 font-semibold text-neutral-950 [overflow-wrap:anywhere]">{surPlace ? `Vous y êtes : ${action.titre}` : action.titre}</span>
        {surPlace && <span className="basis-full text-xs text-neutral-700">{action.pourquoi}</span>}
        {!surPlace && action.bouton && ('action' in action.bouton
          ? <BoutonImporterClaude libelle={action.bouton.libelle} />
          : <Link href={action.bouton.href} className="inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 font-semibold text-white" data-action-guidee="">{action.bouton.libelle}</Link>)}
      </section>
    );
  }
  return (
    <section aria-labelledby="prochaine-etape" className="grid gap-3 rounded-2xl border-2 border-teal-700 bg-teal-50/70 p-4 sm:p-5" data-prochaine-action={action.id}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-900">
        <span>Prochaine étape</span>
        <span className="hidden sm:inline" aria-hidden="true">·</span>
        <span className="hidden sm:inline">Étape {courante.n} / 6 · {courante.libelle}</span>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 normal-case tracking-normal text-teal-900 ring-1 ring-teal-200">{QUI[action.qui]}</span>
      </div>
      <h2 id="prochaine-etape" className="text-xl font-bold leading-snug text-neutral-950 [overflow-wrap:anywhere] sm:text-2xl">{action.titre}</h2>
      <p className="max-w-3xl text-sm text-neutral-800">{action.pourquoi}</p>
      {importes > 0 && <p role="status" className="text-sm font-semibold text-teal-900">{importes} design{importes > 1 ? 's' : ''} de Claude ajouté{importes > 1 ? 's' : ''} aux candidats automatiquement.</p>}
      {(action.bouton || action.secondaire) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {action.bouton && <Bouton b={action.bouton} principal />}
          {action.secondaire && <span className="text-sm text-neutral-700">En attendant : <Bouton b={action.secondaire} principal={false} /></span>}
        </div>
      )}
      <ol className="grid grid-cols-6 gap-1 pt-1" aria-label="Étapes jusqu’au modèle prêt pour les clients">
        {action.fil.map((x) => (
          <li key={x.n} className="grid min-w-0 justify-items-center gap-1 text-center" aria-current={x.ici ? 'step' : undefined} data-etape={x.etat}>
            <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ${x.etat === 'fait' ? 'bg-teal-700 text-white' : x.etat === 'courante' ? 'bg-white text-teal-900 ring-2 ring-teal-700' : 'bg-white text-neutral-500 ring-1 ring-neutral-300'} ${x.ici ? 'outline outline-2 outline-offset-2 outline-amber-500' : ''}`}>
              {x.etat === 'fait' ? '✓' : x.n}
            </span>
            <span className={`w-full text-[11px] leading-tight sm:text-xs ${x.ici ? 'font-semibold text-neutral-950' : 'text-neutral-700'}`}>
              <span className="block sm:hidden">{x.court}</span>
              <span className="hidden sm:block">{x.libelle}</span>
              <span className="hidden text-neutral-600 sm:block">{x.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="grid gap-1">
        <span className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-teal-100" aria-hidden="true"><span className="block h-full bg-teal-700" style={{ width: `${Math.max(4, Math.round(action.progression * 100))}%` }} /></span>
        <p className="text-sm text-neutral-800" data-restant="">{action.restant}<span className="sm:hidden"> · {courante.libelle} : {courante.detail}</span></p>
      </div>
    </section>
  );
}
