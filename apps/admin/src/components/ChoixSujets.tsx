'use client';

// Choix des sujets du site (hiérarchie, themes.ts du core) : jusqu'à 3 sujets principaux dans l'ordre de préférence, puis
// jusqu'à 3 sujets traités aussi. Bulles tactiles (≥ 44 px), numéros 1-2-3 visibles, réordonner avec des flèches (aucun
// glisser-déposer nécessaire), sujets différés grisés « bientôt disponible ». Aperçu immédiat du menu obtenu (ordinateur et
// téléphone), calculé par la même fonction que les sites (construireNavigation). Utilisé par le parcours (/creer, étape 1)
// et par le formulaire complet (/mon-site, section « Structure du site »).
import {
  basculerPrincipal,
  basculerSecondaire,
  construireNavigation,
  deplacerPrincipal,
  ficheConseil,
  PRINCIPAUX_MAX,
  SECONDAIRES_MAX,
  soinsDesPriorites,
  themeParId,
  themesProposes,
  type Priorites,
} from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Props = {
  priorites: Priorites;
  onChange: (p: Priorites) => void;
  /** Soins cochés (vide au début du parcours : l'aperçu suppose les soins des sujets cochés) */
  soins: readonly string[];
  /** Soins du catalogue (pour l'aperçu du menu) */
  soinsConnus: readonly string[];
  /** Thèmes différés activés par le drapeau admin (THEMES_ACTIVES) */
  themesActives?: readonly string[];
  /** Montrer la fiche conseil (parcours : déjà affichée par l'étape) */
  conseils?: boolean;
};

export default function ChoixSujets({ priorites, onChange, soins, soinsConnus, themesActives = [], conseils = false }: Props) {
  const proposes = themesProposes(themesActives);
  const plein = priorites.principaux.length >= PRINCIPAUX_MAX;
  // Aperçu : soins cochés, sinon ceux des sujets (que le praticien confirmera à l'étape « Vos soins »)
  const soinsApercu = (soins.length ? soins : soinsDesPriorites(priorites, soinsConnus)).map((slug) => ({ slug }));
  const nav = construireNavigation({ priorites }, soinsApercu, { themesActives });
  const sansSoin = priorites.principaux.concat(priorites.secondaires).filter((id) => soins.length > 0 && !themeParId(id)?.soins.some((s) => soins.includes(s)));
  const fiche = ficheConseil('Sujets');

  const bulle = (actif: boolean, disponible: boolean) =>
    `flex min-h-12 items-center gap-2 rounded-full border px-4 text-left text-sm font-semibold ${focus} ${
      !disponible ? 'cursor-not-allowed border-dashed border-neutral-300 bg-neutral-50 text-neutral-400' : actif ? 'border-teal-700 bg-teal-50 text-teal-950 ring-1 ring-teal-700' : 'border-neutral-300 bg-white hover:bg-neutral-50'
    }`;

  return (
    <div className="grid gap-6">
      {conseils && fiche && (
        <details className="rounded-xl bg-teal-50/70 px-4 py-3 text-sm text-teal-950">
          <summary className="cursor-pointer font-semibold">Pourquoi choisir vos sujets ?</summary>
          <dl className="mt-2 grid gap-2">
            {fiche.points.map((p) => <div key={p.titre}><dt className="font-medium">{p.titre}</dt><dd className="text-teal-950/80">{p.conseil}</dd></div>)}
          </dl>
        </details>
      )}

      <section className="grid gap-3" aria-labelledby="titre-principaux">
        <div>
          <h2 id="titre-principaux" className="text-lg font-semibold">Vos {PRINCIPAUX_MAX} sujets principaux</h2>
          <p className="text-sm text-neutral-600">Touchez les sujets dans l’ordre de préférence : le n° 1 ouvre le menu et l’accueil.</p>
        </div>
        {priorites.principaux.length > 0 && (
          <ol className="grid gap-2" aria-label="Sujets principaux, dans l’ordre">
            {priorites.principaux.map((id, k) => {
              const t = themeParId(id);
              return (
                <li key={id} className="flex min-h-12 items-center gap-2 rounded-xl border border-teal-700/30 bg-white px-3">
                  <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-teal-800 text-sm font-bold text-white">{k + 1}</span>
                  <span className="flex-1 font-medium">{t?.libelle ?? id}</span>
                  <button type="button" aria-label={`Monter ${t?.libelle}`} disabled={k === 0} onClick={() => onChange(deplacerPrincipal(priorites, id, -1))} className={`grid size-11 place-items-center rounded-lg text-lg disabled:opacity-30 ${focus}`}>↑</button>
                  <button type="button" aria-label={`Descendre ${t?.libelle}`} disabled={k === priorites.principaux.length - 1} onClick={() => onChange(deplacerPrincipal(priorites, id, 1))} className={`grid size-11 place-items-center rounded-lg text-lg disabled:opacity-30 ${focus}`}>↓</button>
                  <button type="button" aria-label={`Retirer ${t?.libelle}`} onClick={() => onChange(basculerPrincipal(priorites, id, themesActives))} className={`grid size-11 place-items-center rounded-lg text-neutral-500 ${focus}`}>✕</button>
                </li>
              );
            })}
          </ol>
        )}
        <ul className="flex flex-wrap gap-2" aria-label="Sujets proposés">
          {proposes.map(({ theme: t, disponible }) => {
            const rang = priorites.principaux.indexOf(t.id);
            const actif = rang >= 0;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={actif}
                  disabled={!disponible || (!actif && plein)}
                  title={disponible ? t.description : t.motif}
                  onClick={() => onChange(basculerPrincipal(priorites, t.id, themesActives))}
                  className={`${bulle(actif, disponible)} disabled:opacity-100 ${disponible && !actif && plein ? 'opacity-50' : ''}`}
                >
                  {actif && <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-teal-800 text-xs font-bold text-white">{rang + 1}</span>}
                  {t.court}
                  {!disponible && <span className="text-xs font-medium">· bientôt disponible</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {plein && <p className="text-xs text-neutral-600">Trois sujets choisis : retirez-en un pour en changer.</p>}
      </section>

      <section className="grid gap-3" aria-labelledby="titre-secondaires">
        <div>
          <h2 id="titre-secondaires" className="text-lg font-semibold">Jusqu’à {SECONDAIRES_MAX} sujets que vous traitez aussi</h2>
          <p className="text-sm text-neutral-600">Facultatif. Ils apparaissent plus discrètement : « Aussi au cabinet » sur l’accueil, et sur la page « Soins ».</p>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Sujets traités aussi">
          {proposes.filter(({ theme: t }) => !priorites.principaux.includes(t.id)).map(({ theme: t, disponible }) => {
            const actif = priorites.secondaires.includes(t.id);
            const bloque = !actif && priorites.secondaires.length >= SECONDAIRES_MAX;
            return (
              <li key={t.id}>
                <button type="button" aria-pressed={actif} disabled={!disponible || bloque} title={disponible ? t.description : t.motif} onClick={() => onChange(basculerSecondaire(priorites, t.id, themesActives))} className={`${bulle(actif, disponible)} ${bloque && disponible ? 'opacity-50' : ''}`}>
                  {actif && <span aria-hidden="true">✓</span>}
                  {t.court}
                  {!disponible && <span className="text-xs font-medium">· bientôt disponible</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-2 rounded-xl border border-black/10 bg-neutral-50 p-4" aria-labelledby="titre-menu" aria-live="polite">
        <h2 id="titre-menu" className="font-semibold">Votre menu</h2>
        <p className="text-sm"><span className="font-medium text-neutral-600">Sur ordinateur : </span>{nav.menu.map((l) => l.libelle).join(' · ')} · <span className="font-semibold">Rendez-vous</span></p>
        <p className="text-sm"><span className="font-medium text-neutral-600">Sur téléphone : </span>{nav.menuMobile.map((l) => l.libelle).join(' · ')} <span className="text-neutral-500">(+ bouton Rendez-vous)</span></p>
        {nav.secondaires.length > 0 && <p className="text-sm"><span className="font-medium text-neutral-600">Aussi au cabinet : </span>{nav.secondaires.map((t) => t.theme.libelle).join(', ')}</p>}
        {sansSoin.length > 0 && <p className="text-sm text-amber-800">Sans soin coché, ces sujets ne s’affichent pas : {sansSoin.map((id) => themeParId(id)?.libelle).join(', ')}.</p>}
      </section>
    </div>
  );
}
