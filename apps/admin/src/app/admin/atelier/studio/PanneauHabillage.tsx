'use client';

// Habillage du studio de recettes (demande de Paul du 2026-10-07 : « plus de combinaisons de polices, de tailles, MAJUSCULES vs
// minuscules… des éléments de style pour des templates vraiment wow » ; « des styles de menus différents »).
// Depuis la réorganisation du 2026-10-08, plus de panneau à part : des RANGÉES (ParametresGroupes.tsx) que le registre du core
// range dans leurs groupes — polices et typographie dans « Typographie », jeu de détails dans « Détails & effets », menu dans
// « Structure des pages » ; les axes un à un sous « Réglage fin ». Dés 🎲 / ← / 🔒 et choix direct (liste) inchangés ; verrous
// d'axe `hab:<groupe>:<axe>` (« Tout changer » et le dé du groupe les respectent). L'aperçu suit immédiatement (habillage.ts).
import {
  AXES_MENU, AXES_TYPO, ELEMENTS_DETAILS, JEUX_DETAILS, NOMS_AXES_MENU, NOMS_AXES_TYPO, NOMS_ELEMENTS_DETAILS, PAIRES_POLICES, POLICES,
  accentEffectif, habillageDe, menusPermis, verrouAxe, type AxeHabillage, type CompositionRecette, type Gabarit,
} from '@plateforme/core';
import type { RangeeStudio } from './ParametresGroupes';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Options = {
  comp: CompositionRecette;
  gabarit: Gabarit;
  /** Dé d'un groupe entier (polices, typo, details = jeu, menu) ou d'un axe */
  onDe: (cible: 'polices' | 'typo' | 'details' | 'menu' | AxeHabillage) => void;
  /** Choix direct (liste) : réglages posés sur la composition */
  onChoix: (y: Partial<CompositionRecette>, cle: string) => void;
};

const nomDe = (l: readonly { id: string; nom: string }[], id: string) => l.find((x) => x.id === id)?.nom ?? id;

function Choix({ label, valeur, options, onChange }: { label: string; valeur: string; options: readonly { id: string; nom: string }[]; onChange: (v: string) => void }) {
  return (
    <select value={valeur} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 ${focus}`}>
      {options.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
    </select>
  );
}

/** Rangées de l'habillage (polices, typographie, jeu de détails, menu, et leurs axes) */
export function rangeesHabillage({ comp, gabarit, onDe, onChoix }: Options): RangeeStudio[] {
  const h = habillageDe(comp);
  const paire = PAIRES_POLICES.find((p) => p.id === comp.police);
  const accent = accentEffectif(comp.police, h.typo, { mono: gabarit === 'classique' });
  const permis = menusPermis(gabarit);
  const axesTypo = Object.keys(AXES_TYPO) as (keyof typeof AXES_TYPO)[];
  const axesMenu = Object.keys(AXES_MENU) as (keyof typeof AXES_MENU)[];
  const elements = Object.keys(ELEMENTS_DETAILS) as (keyof typeof ELEMENTS_DETAILS)[];
  return [
    {
      cle: 'polices', titre: 'Polices', touche: 'p', valeur: paire ? `${paire.nom} — ${paire.description}` : comp.police, onDe: () => onDe('polices'),
      choix: <>
        <Choix label="Paire de polices" valeur={comp.police} options={PAIRES_POLICES.map((p) => ({ id: p.id, nom: `${p.nom} (${p.description.split(' : ')[0]})` }))} onChange={(v) => onChoix({ police: v as CompositionRecette['police'] }, 'polices')} />
        {paire && (
          <p className="rounded-lg bg-neutral-50 px-2 py-1.5" aria-hidden="true">
            <span className="block text-lg leading-tight" style={{ fontFamily: (POLICES as Record<string, string>)[paire.titres], fontWeight: paire.graisse }}>Cabinet de pédicurie-podologie</span>
            <span className="block text-sm" style={{ fontFamily: (POLICES as Record<string, string>)[paire.texte] }}>Bilan podologique, semelles et soins, sur rendez-vous.</span>
          </p>
        )}
      </>,
    },
    { cle: 'typo', titre: 'Typographie', touche: 'y', valeur: axesTypo.map((a) => nomDe(AXES_TYPO[a], h.typo[a])).join(' · '), onDe: () => onDe('typo') },
    ...axesTypo.map((a): RangeeStudio => {
      const cle = verrouAxe({ groupe: 'typo', axe: a });
      return {
        cle, titre: NOMS_AXES_TYPO[a], verrouParent: 'typo', fin: true, onDe: () => onDe({ groupe: 'typo', axe: a }),
        valeur: nomDe(AXES_TYPO[a], h.typo[a]) + (a === 'accent' && h.typo.accent === 'italique' && accent !== 'italique' ? ' (en couleur : pas d’italique dans cette police)' : ''),
        choix: <Choix label={NOMS_AXES_TYPO[a]} valeur={h.typo[a]} options={AXES_TYPO[a]} onChange={(v) => onChoix({ typo: { ...h.typo, [a]: v } }, cle)} />,
      };
    }),
    {
      cle: 'details', titre: 'Jeu de détails', touche: 'd', valeur: `${nomDe(JEUX_DETAILS, h.details.jeu)} — ${JEUX_DETAILS.find((j) => j.id === h.details.jeu)?.description ?? ''}`, onDe: () => onDe('details'),
      choix: <Choix label="Jeu de détails" valeur={h.details.jeu} options={JEUX_DETAILS} onChange={(v) => { const j = JEUX_DETAILS.find((x) => x.id === v)!; onChoix({ details: { jeu: j.id, ...j.valeurs } }, 'details'); }} />,
    },
    ...elements.map((e): RangeeStudio => {
      const cle = verrouAxe({ groupe: 'details', axe: e });
      return {
        cle, titre: NOMS_ELEMENTS_DETAILS[e], fin: true, valeur: nomDe(ELEMENTS_DETAILS[e], h.details[e]), onDe: () => onDe({ groupe: 'details', axe: e }),
        choix: <Choix label={NOMS_ELEMENTS_DETAILS[e]} valeur={h.details[e]} options={ELEMENTS_DETAILS[e]} onChange={(v) => onChoix({ details: { ...h.details, [e]: v } }, cle)} />,
      };
    }),
    { cle: 'menu', titre: 'Menu', touche: 'm', valeur: axesMenu.map((a) => nomDe(AXES_MENU[a], h.menu[a])).join(' · '), onDe: () => onDe('menu') },
    ...axesMenu.map((a): RangeeStudio => {
      const cle = verrouAxe({ groupe: 'menu', axe: a });
      const options = (AXES_MENU[a] as readonly { id: string; nom: string }[]).filter((o) => (permis[a] as readonly string[]).includes(o.id));
      return {
        cle, titre: NOMS_AXES_MENU[a], verrouParent: 'menu', fin: true, valeur: nomDe(AXES_MENU[a], h.menu[a]), onDe: () => onDe({ groupe: 'menu', axe: a }),
        choix: <Choix label={NOMS_AXES_MENU[a]} valeur={h.menu[a]} options={options} onChange={(v) => onChoix({ menu: { ...h.menu, [a]: v } }, cle)} />,
      };
    }),
  ];
}
