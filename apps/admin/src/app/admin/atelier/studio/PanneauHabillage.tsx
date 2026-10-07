'use client';

// Panneau « Typographie & détails » du studio de recettes (demande de Paul du 2026-10-07 : « plus de combinaisons de polices, de
// tailles, MAJUSCULES vs minuscules… des éléments de style pour des templates vraiment wow » ; « des styles de menus différents »).
// Dés 🎲 / ← / 🔒 : polices, typographie (et chacun de ses axes), jeu de détails (et chacun de ses éléments, dépliables), menu
// (ordinateur, téléphone, rendez-vous). L'aperçu suit immédiatement (même feuille CSS que le site : habillage.ts) ; la recette
// enregistre tout. Verrous d'axe : `hab:<groupe>:<axe>` (« Tout changer » et le dé du groupe les respectent).
import {
  AXES_MENU, AXES_TYPO, ELEMENTS_DETAILS, JEUX_DETAILS, NOMS_AXES_MENU, NOMS_AXES_TYPO, NOMS_ELEMENTS_DETAILS, PAIRES_POLICES, POLICES,
  accentEffectif, habillageDe, menusPermis, verrouAxe, type AxeHabillage, type CompositionRecette, type Gabarit,
} from '@plateforme/core';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const petitBase = `grid size-11 place-items-center rounded-lg border text-base ${focus} disabled:opacity-40`;
const petit = `${petitBase} border-neutral-300 bg-white hover:bg-neutral-50`;

type Props = {
  comp: CompositionRecette;
  gabarit: Gabarit;
  verrous: readonly string[];
  /** Dé d'un groupe entier (polices, typo, details = jeu, menu) ou d'un axe */
  onDe: (cible: 'polices' | 'typo' | 'details' | 'menu' | AxeHabillage) => void;
  /** Choix direct (liste) : réglages posés sur la composition */
  onChoix: (y: Partial<CompositionRecette>, cle: string) => void;
  onPrecedent: (cle: string) => void;
  peutRevenir: (cle: string) => boolean;
  onVerrou: (cle: string) => void;
};

const nomDe = (l: readonly { id: string; nom: string }[], id: string) => l.find((x) => x.id === id)?.nom ?? id;

export default function PanneauHabillage({ comp, gabarit, verrous, onDe, onChoix, onPrecedent, peutRevenir, onVerrou }: Props) {
  const h = habillageDe(comp);
  const paire = PAIRES_POLICES.find((p) => p.id === comp.police);
  const accent = accentEffectif(comp.police, h.typo, { mono: gabarit === 'classique' });
  const permis = menusPermis(gabarit);

  const Rangee = ({ cle, titre, valeur, onDeLigne, touche, verrouParent, enfant }: { cle: string; titre: string; valeur: string; onDeLigne: () => void; touche?: string; verrouParent?: string; enfant?: React.ReactNode }) => {
    const verrou = verrous.includes(cle);
    const bloque = verrou || (verrouParent ? verrous.includes(verrouParent) : false);
    return (
      <li className={`grid gap-1 rounded-xl px-2 py-1.5 ${verrou ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">{titre}{touche && <kbd className="ml-1 rounded bg-neutral-100 px-1 font-normal normal-case">{touche}</kbd>}</span><span className="block truncate text-sm" title={valeur}>{valeur}</span></span>
          <span className="flex gap-1">
            <button type="button" className={petit} onClick={onDeLigne} disabled={bloque} aria-label={`Changer : ${titre}`} title="Changer">🎲</button>
            <button type="button" className={petit} onClick={() => onPrecedent(cle)} disabled={!peutRevenir(cle)} aria-label={`Précédent : ${titre}`} title="Précédent">←</button>
            <button type="button" className={verrou ? `${petitBase} border-amber-400 bg-amber-100` : petit} onClick={() => onVerrou(cle)} aria-pressed={verrou} aria-label={`${verrou ? 'Déverrouiller' : 'Verrouiller'} : ${titre}`} title="Verrouiller">{verrou ? '🔒' : '🔓'}</button>
          </span>
        </div>
        {enfant}
      </li>
    );
  };
  const Choix = ({ label, valeur, options, onChange }: { label: string; valeur: string; options: readonly { id: string; nom: string }[]; onChange: (v: string) => void }) => (
    <label className="grid gap-0.5 text-xs text-neutral-600">
      <span className="sr-only">{label}</span>
      <select value={valeur} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 ${focus}`}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
      </select>
    </label>
  );

  return (
    <section aria-labelledby="st-habillage" className="grid gap-1 rounded-2xl border border-black/10 bg-white p-3">
      <h2 id="st-habillage" className="px-2 text-base font-semibold">Typographie & détails</h2>
      <ul className="grid gap-0.5">
        <Rangee cle="polices" titre="Polices" touche="p" valeur={paire ? `${paire.nom} — ${paire.description}` : comp.police} onDeLigne={() => onDe('polices')}
          enfant={<>
            <Choix label="Paire de polices" valeur={comp.police} options={PAIRES_POLICES.map((p) => ({ id: p.id, nom: `${p.nom} (${p.description.split(' : ')[0]})` }))} onChange={(v) => onChoix({ police: v as CompositionRecette['police'] }, 'polices')} />
            {paire && (
              <p className="rounded-lg bg-neutral-50 px-2 py-1.5" aria-hidden="true">
                <span className="block text-lg leading-tight" style={{ fontFamily: (POLICES as Record<string, string>)[paire.titres], fontWeight: paire.graisse }}>Cabinet de pédicurie-podologie</span>
                <span className="block text-sm" style={{ fontFamily: (POLICES as Record<string, string>)[paire.texte] }}>Bilan podologique, semelles et soins, sur rendez-vous.</span>
              </p>
            )}
          </>} />
        <Rangee cle="typo" titre="Typographie (tout)" touche="y" valeur={(Object.keys(AXES_TYPO) as (keyof typeof AXES_TYPO)[]).map((a) => nomDe(AXES_TYPO[a], h.typo[a])).join(' · ')} onDeLigne={() => onDe('typo')} />
        {(Object.keys(AXES_TYPO) as (keyof typeof AXES_TYPO)[]).map((a) => {
          const cle = verrouAxe({ groupe: 'typo', axe: a });
          return (
            <Rangee key={a} cle={cle} titre={NOMS_AXES_TYPO[a]} verrouParent="typo" valeur={nomDe(AXES_TYPO[a], h.typo[a]) + (a === 'accent' && h.typo.accent === 'italique' && accent !== 'italique' ? ' (en couleur : pas d’italique dans cette police ou budget dépassé)' : '')}
              onDeLigne={() => onDe({ groupe: 'typo', axe: a })}
              enfant={<Choix label={NOMS_AXES_TYPO[a]} valeur={h.typo[a]} options={AXES_TYPO[a]} onChange={(v) => onChoix({ typo: { ...h.typo, [a]: v } }, cle)} />} />
          );
        })}
        <Rangee cle="details" titre="Jeu de détails" touche="d" valeur={`${nomDe(JEUX_DETAILS, h.details.jeu)} — ${JEUX_DETAILS.find((j) => j.id === h.details.jeu)?.description ?? ''}`} onDeLigne={() => onDe('details')}
          enfant={<Choix label="Jeu de détails" valeur={h.details.jeu} options={JEUX_DETAILS} onChange={(v) => { const j = JEUX_DETAILS.find((x) => x.id === v)!; onChoix({ details: { jeu: j.id, ...j.valeurs } }, 'details'); }} />} />
        <li className="px-2">
          <details className="rounded-xl border border-neutral-200">
            <summary className={`flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold ${focus}`}>Éléments du jeu (varier ou verrouiller un à un)</summary>
            <ul className="grid gap-0.5 pb-1">
              {(Object.keys(ELEMENTS_DETAILS) as (keyof typeof ELEMENTS_DETAILS)[]).map((e) => {
                const cle = verrouAxe({ groupe: 'details', axe: e });
                return (
                  <Rangee key={e} cle={cle} titre={NOMS_ELEMENTS_DETAILS[e]} valeur={nomDe(ELEMENTS_DETAILS[e], h.details[e])} onDeLigne={() => onDe({ groupe: 'details', axe: e })}
                    enfant={<Choix label={NOMS_ELEMENTS_DETAILS[e]} valeur={h.details[e]} options={ELEMENTS_DETAILS[e]} onChange={(v) => onChoix({ details: { ...h.details, [e]: v } }, cle)} />} />
                );
              })}
            </ul>
          </details>
        </li>
        <Rangee cle="menu" titre="Menu (tout)" touche="m" valeur={(Object.keys(AXES_MENU) as (keyof typeof AXES_MENU)[]).map((a) => nomDe(AXES_MENU[a], h.menu[a])).join(' · ')} onDeLigne={() => onDe('menu')} />
        {(Object.keys(AXES_MENU) as (keyof typeof AXES_MENU)[]).map((a) => {
          const cle = verrouAxe({ groupe: 'menu', axe: a });
          const options = (AXES_MENU[a] as readonly { id: string; nom: string }[]).filter((o) => (permis[a] as readonly string[]).includes(o.id));
          return (
            <Rangee key={a} cle={cle} titre={NOMS_AXES_MENU[a]} verrouParent="menu" valeur={nomDe(AXES_MENU[a], h.menu[a])} onDeLigne={() => onDe({ groupe: 'menu', axe: a })}
              enfant={<Choix label={NOMS_AXES_MENU[a]} valeur={h.menu[a]} options={options} onChange={(v) => onChoix({ menu: { ...h.menu, [a]: v } }, cle)} />} />
          );
        })}
      </ul>
      <p className="px-2 text-xs text-neutral-500">Casse en CSS seulement (le texte reste en casse normale pour Google) ; mots métier insécables ; menus : mêmes rubriques, ordre et page active. Enregistré dans la recette.</p>
    </section>
  );
}
