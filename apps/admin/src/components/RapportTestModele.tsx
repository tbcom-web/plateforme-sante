import { controleTesteur, libellePageModele, type ResultatTesteur, type TicketTesteur, type VerdictTest } from '@plateforme/core';
import { urlVignette } from '@/lib/tests-modeles';

// Rapport du TESTEUR DE MODÈLES dans la fiche d'un modèle de la chaîne (docs/testeur-modeles.md) : verdict, contrôles (mesure et
// seuil), comparaison avec la version précédente (re-check : corrigés avant / après, toujours ouverts, nouveaux), puis tickets avec la
// vignette de la zone. Composant serveur, sans état : à placer dans /chaine/modele/[id] avec lireResultatTestModele(f.id, version).

const COULEUR: Record<VerdictTest, string> = { vert: 'bg-emerald-700', orange: 'bg-amber-600', rouge: 'bg-red-700' };
const LIBELLE: Record<VerdictTest, string> = { vert: 'Vert', orange: 'Orange', rouge: 'Rouge' };
const GRAVITES = ['bloquant', 'majeur', 'mineur'] as const;

function Pastille({ verdict }: { verdict: VerdictTest }) {
  return <span className={`inline-flex min-w-16 justify-center rounded-full px-2 py-0.5 text-xs font-semibold text-white ${COULEUR[verdict]}`}>{LIBELLE[verdict]}</span>;
}

function Vignette({ chemin, alt }: { chemin?: string | null; alt: string }) {
  const url = urlVignette(chemin);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} loading="lazy" className="max-h-40 w-auto max-w-full rounded border border-neutral-200" /> : null;
}

function Ticket({ t }: { t: TicketTesteur }) {
  return (
    <li className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto]" data-gravite={t.gravite} data-controle={t.controle ?? ''}>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{t.commentaire}</p>
        <p className="mt-1 text-xs text-neutral-700">
          {libellePageModele(t.page)} <code className="break-all">{t.chemin}</code> · {t.appareil === 'mobile' ? 'téléphone' : 'ordinateur'}{t.largeur ? ` ${t.largeur} px` : ''}
          {t.jeu ? ` · jeu ${t.jeu}` : ''} · {t.categorie === 'gout' ? 'goût' : 'technique'} · {controleTesteur(t.controle ?? '')?.libelle ?? t.etiquette}
        </p>
        {t.element && <p className="mt-1 text-xs text-neutral-600">Élément : <code className="break-all">{t.element}</code></p>}
        {(t.mesure || t.seuil) && <p className="mt-1 text-xs text-neutral-600">Mesure : {t.mesure ?? '—'}{t.seuil ? ` · seuil ${t.seuil}` : ''}</p>}
        {t.zonePx && <p className="mt-1 text-xs text-neutral-600">Zone : x {t.zonePx.x}, y {t.zonePx.y}, {t.zonePx.l} × {t.zonePx.h} px</p>}
        {t.suggestion && <p className="mt-1 text-sm text-teal-900">Correction proposée : {t.suggestion}</p>}
      </div>
      {(t.vignette || t.vignetteAvant) && (
        <div className="flex flex-wrap items-start gap-2">
          {t.vignetteAvant && <figure className="grid gap-1"><Vignette chemin={t.vignetteAvant} alt={`Avant : ${t.commentaire}`} /><figcaption className="text-xs text-neutral-600">Avant</figcaption></figure>}
          {t.vignette && <figure className="grid gap-1"><Vignette chemin={t.vignette} alt={`Zone : ${t.commentaire}`} /><figcaption className="text-xs text-neutral-600">{t.vignetteAvant ? 'Après' : 'Zone'}</figcaption></figure>}
        </div>
      )}
    </li>
  );
}

export default function RapportTestModele({ resultat }: { resultat: ResultatTesteur | null }) {
  if (!resultat) return <p className="text-sm text-neutral-700">Pas encore de passage du testeur sur cette version.</p>;
  const r = resultat;
  const cmp = r.comparaison;
  const nb = (g: string) => r.tickets.filter((t) => t.gravite === g).length;
  return (
    <section aria-labelledby="rapport-testeur" className="grid gap-3" data-verdict={r.verdict}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="rapport-testeur" className="text-lg font-bold">Testeur de modèles · v{r.version}</h2>
        <Pastille verdict={r.verdict} />
        <span className="text-sm text-neutral-700">
          {r.mode === 'recheck' ? 'Re-check' : 'Check initial'} · {r.source === 'script+claude' ? 'script + vérification visuelle' : r.source === 'claude' ? 'vérification visuelle' : 'script seul (vérification visuelle à faire)'}
          {' · '}{new Date(r.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
          {r.dureeMs ? ` · ${(r.dureeMs / 60000).toFixed(1).replace('.', ',')} min` : ''}
          {' · '}{nb('bloquant')} bloquant(s), {nb('majeur')} majeur(s), {nb('mineur')} mineur(s)
        </span>
        {r.run && <a href={r.run} className="text-sm font-semibold text-teal-900 underline" target="_blank" rel="noopener">Run et captures</a>}
      </div>

      {r.jeux.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm" aria-label="Jeux de démonstration" data-jeux>
          {r.jeux.map((j) => (
            <li key={j.id} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5" data-jeu={j.id}>
              {j.verdict && <Pastille verdict={j.verdict} />}
              <span>{j.libelle}</span>
              {j.dureeMs ? <span className="text-neutral-600">· {Math.round(j.dureeMs / 1000)} s</span> : null}
            </li>
          ))}
        </ul>
      )}

      {cmp && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm" data-comparaison>
          <p className="font-semibold">Depuis la v{cmp.versionPrecedente} ({LIBELLE[cmp.verdictPrecedent].toLowerCase()}) : {cmp.corriges.length} corrigé(s), {cmp.toujoursOuverts.length} toujours ouvert(s), {cmp.nouveaux.length} nouveau(x)</p>
          {cmp.controlesChanges.length > 0 && <p className="mt-1">Contrôles changés : {cmp.controlesChanges.map((c) => `${controleTesteur(c.id)?.libelle ?? c.id} ${c.avant} → ${c.apres}`).join(' ; ')}</p>}
          <p className="mt-1 text-neutral-700">À revalider : seulement les corrigés (avant / après) et les nouveaux.</p>
        </div>
      )}

      <details open className="rounded-lg border border-neutral-200 bg-white p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">Contrôles ({r.controles.length})</summary>
        <ul className="mt-2 grid gap-1">
          {r.controles.map((c) => (
            <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-sm" data-controle={c.id}>
              <Pastille verdict={c.verdict} />
              <span className="min-w-0">
                <span className="font-semibold">{c.libelle}</span>{c.nonMesure ? ' (non mesuré)' : ''} — {c.mesure || '—'}
                {c.seuil ? <span className="text-neutral-600"> · seuil : {c.seuil}</span> : null}
                {c.tickets ? <span className="text-neutral-600"> · {c.tickets} ticket(s)</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {cmp && cmp.corriges.length > 0 && (
        <details className="rounded-lg border border-neutral-200 bg-white p-3">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">Corrigés depuis la v{cmp.versionPrecedente} ({cmp.corriges.length})</summary>
          <ul className="mt-2 grid gap-2">{cmp.corriges.map((t) => <Ticket key={`c-${t.empreinte}`} t={t} />)}</ul>
        </details>
      )}

      {GRAVITES.map((g) => {
        const liste = r.tickets.filter((t) => t.gravite === g);
        if (!liste.length) return null;
        const nouveaux = new Set(cmp?.nouveaux.map((t) => t.empreinte) ?? []);
        return (
          <details key={g} open={g !== 'mineur'} className="rounded-lg border border-neutral-200 bg-white p-3" data-liste={g}>
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">Tickets {g}s ({liste.length}){cmp ? ` dont ${liste.filter((t) => nouveaux.has(t.empreinte)).length} nouveau(x)` : ''}</summary>
            <ul className="mt-2 grid gap-2">{liste.slice(0, 120).map((t) => <Ticket key={t.empreinte} t={t} />)}</ul>
            {liste.length > 120 && <p className="mt-2 text-xs text-neutral-600">… et {liste.length - 120} autre(s) dans le fichier du résultat.</p>}
          </details>
        );
      })}
    </section>
  );
}
