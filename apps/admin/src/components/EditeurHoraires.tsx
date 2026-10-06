'use client';

// Réglage des horaires d'ouverture, jour par jour (mobile d'abord) : interrupteur Ouvert / Fermé, deux plages au plus
// choisies dans des listes au quart d'heure (aucune saisie libre), « + plage », « Journée continue », « Copier vers… »,
// modèles rapides, mentions (« Sur rendez-vous uniquement », note courte, jours de visites à domicile) et aperçu du rendu
// sur le site. Avertissements en ambre, jamais bloquants. Un réglage par lieu (lieux[]).
// Utilisé par le parcours guidé (/creer, étape « Le cabinet ») et le formulaire complet (/mon-site, étape « Horaires ») ;
// toute la logique est dans @plateforme/core (horaires.ts).
import { useId, useState } from 'react';
import {
  avertissementsHoraires,
  avertissementsNoteHoraires,
  copierJour,
  definirJour,
  formaterHeure,
  HEURES_CHOIX,
  journeeContinue,
  JOURS_OUVRES,
  JOURS_SEMAINE,
  libelleJours,
  mentionsHoraires,
  MODELES_HORAIRES,
  NOTE_HORAIRES_MAX,
  phraseJoursDomicile,
  plageSuivante,
  plagesDe,
  PLAGES_PAR_JOUR,
  regrouperHoraires,
  TYPES_LIEU,
  type LieuDraft,
  type Plage,
} from '@plateforme/core';

type Props = {
  lieux: LieuDraft[];
  onLieux: (lieux: LieuDraft[]) => void;
  /** Visites à domicile actives : cases des jours possibles */
  domicile?: { actif: boolean; jours: string[] };
  onDomicileJours?: (jours: string[]) => void;
};

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const bouton = `min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50 ${focus}`;
const lien = `min-h-11 rounded px-1 text-sm font-semibold text-teal-800 ${focus}`;
const selection = 'h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2 text-base tabular-nums outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';
const court = (j: string) => `${j.slice(0, 3)}.`;

/** Choix d'heure : la liste au quart d'heure, plus la valeur actuelle si elle n'y est pas (ancien horaire). */
function ChoixHeure({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const options = HEURES_CHOIX.some((o) => o.value === value) ? HEURES_CHOIX : [{ value, label: formaterHeure(value) }, ...HEURES_CHOIX];
  return (
    <select aria-label={label} className={selection} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Jour({ jour, plages, alertes, onPlages, onCopier, autres }: {
  jour: string;
  plages: Plage[];
  alertes: string[];
  onPlages: (p: Plage[]) => void;
  onCopier: (cibles: string[]) => void;
  autres: readonly string[];
}) {
  const [copie, setCopie] = useState<string[] | null>(null);
  const ouvert = plages.length > 0;
  const id = useId();
  const majPlage = (i: number, patch: Partial<Plage>) => onPlages(plages.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className={`grid gap-2 rounded-xl border p-3 ${ouvert ? 'border-neutral-200 bg-white' : 'border-neutral-200 bg-neutral-50'}`}>
      <div className="flex items-center justify-between gap-3">
        <span id={`${id}-jour`} className="font-semibold">{jour}</span>
        <button
          type="button"
          role="switch"
          aria-checked={ouvert}
          aria-labelledby={`${id}-jour`}
          onClick={() => onPlages(ouvert ? [] : [{ debut: '09:00', fin: '12:00' }, { debut: '14:00', fin: '19:00' }])}
          className={`flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-medium ${focus}`}
        >
          <span className={ouvert ? 'text-teal-800' : 'text-neutral-500'}>{ouvert ? 'Ouvert' : 'Fermé'}</span>
          <span aria-hidden="true" className={`relative h-7 w-12 rounded-full transition-colors ${ouvert ? 'bg-teal-700' : 'bg-neutral-300'}`}>
            <span className={`absolute left-0 top-0.5 size-6 rounded-full bg-white shadow transition-transform ${ouvert ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </span>
        </button>
      </div>

      {ouvert && (
        <>
          {plages.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <ChoixHeure label={`${jour}, plage ${i + 1} : début`} value={p.debut} onChange={(v) => majPlage(i, { debut: v })} />
              <span aria-hidden="true" className="text-neutral-500">–</span>
              <ChoixHeure label={`${jour}, plage ${i + 1} : fin`} value={p.fin} onChange={(v) => majPlage(i, { fin: v })} />
              {plages.length > 1 && (
                <button type="button" aria-label={`Retirer la plage ${i + 1} du ${jour.toLowerCase()}`} className={`grid size-11 shrink-0 place-items-center rounded-lg text-xl text-neutral-500 hover:bg-neutral-100 ${focus}`} onClick={() => onPlages(plages.filter((_, j) => j !== i))}>
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-x-3">
            {plages.length < PLAGES_PAR_JOUR && <button type="button" className={lien} onClick={() => onPlages([...plages, plageSuivante(plages)])}>+ plage</button>}
            {plages.length > 1 && <button type="button" className={lien} onClick={() => onPlages(journeeContinue(plages))}>Journée continue</button>}
            <button type="button" className={lien} aria-expanded={copie !== null} onClick={() => setCopie(copie ? null : [])}>Copier vers…</button>
          </div>
        </>
      )}

      {copie && ouvert && (
        <div className="grid gap-2 rounded-lg bg-teal-50 p-2">
          <p className="text-sm">Copier les horaires du {jour.toLowerCase()} vers :</p>
          <div role="group" aria-label={`Jours qui reçoivent les horaires du ${jour.toLowerCase()}`} className="flex flex-wrap gap-2">
            {autres.map((j) => {
              const actif = copie.includes(j);
              return (
                <button key={j} type="button" aria-pressed={actif} onClick={() => setCopie(actif ? copie.filter((x) => x !== j) : [...copie, j])} className={`min-h-11 min-w-11 rounded-full px-3 text-sm font-semibold ring-1 ${focus} ${actif ? 'bg-teal-800 text-white ring-teal-800' : 'bg-white text-neutral-700 ring-neutral-300'}`}>
                  <span aria-hidden="true">{court(j)}</span><span className="sr-only">{j}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={lien} onClick={() => setCopie(JOURS_OUVRES.filter((j) => j !== jour))}>Jours ouvrés</button>
            <span className="grow" />
            <button type="button" className={bouton} onClick={() => setCopie(null)}>Annuler</button>
            <button type="button" disabled={!copie.length} className={`min-h-11 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white disabled:opacity-40 ${focus}`} onClick={() => { onCopier(copie); setCopie(null); }}>
              Copier
            </button>
          </div>
        </div>
      )}

      {alertes.length > 0 && <ul className="grid gap-0.5 text-xs text-amber-800">{alertes.map((a) => <li key={a}>{a.replace(/^[^:]+: /, '')}</li>)}</ul>}
    </div>
  );
}

export default function EditeurHoraires({ lieux, onLieux, domicile, onDomicileJours }: Props) {
  const [indice, setIndice] = useState(0);
  const i = Math.min(indice, lieux.length - 1);
  const lieu = lieux[i];
  const idNote = useId();
  if (!lieu) return null;

  const majLieu = (patch: Partial<LieuDraft>) => onLieux(lieux.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const horaires = lieu.horaires;
  const alertes = avertissementsHoraires(horaires);
  const alertesNote = avertissementsNoteHoraires(lieu.noteHoraires ?? '');
  const groupes = regrouperHoraires(horaires);
  const mentions = mentionsHoraires(lieu);
  const lundi = plagesDe(horaires.find((h) => h.jour === 'Lundi') ?? { heures: '' });
  const dimanche = plagesDe(horaires.find((h) => h.jour === 'Dimanche') ?? { heures: '' });
  const nomLieu = (l: LieuDraft, k: number) => l.nom || (l.ville ? `${TYPES_LIEU.find((t) => t.value === l.type)?.label ?? 'Cabinet'}, ${l.ville}` : `Lieu ${k + 1}`);

  const jour = (j: string) => (
    <Jour
      key={j}
      jour={j}
      plages={plagesDe(horaires.find((h) => h.jour === j) ?? { heures: '' })}
      alertes={alertes.filter((a) => a.startsWith(`${j} `))}
      onPlages={(p) => majLieu({ horaires: definirJour(horaires, j, p) })}
      onCopier={(cibles) => majLieu({ horaires: copierJour(horaires, j, cibles) })}
      autres={JOURS_SEMAINE.filter((x) => x !== j)}
    />
  );

  return (
    <div className="grid gap-4">
      {lieux.length > 1 && (
        <div className="grid gap-2">
          <div role="tablist" aria-label="Lieu d’exercice" className="flex flex-wrap gap-2">
            {lieux.map((l, k) => (
              <button key={l.id} type="button" role="tab" aria-selected={k === i} onClick={() => setIndice(k)} className={`min-h-11 rounded-full px-3 text-sm font-semibold ring-1 ${focus} ${k === i ? 'bg-teal-800 text-white ring-teal-800' : 'bg-white text-neutral-700 ring-neutral-300'}`}>
                {nomLieu(l, k)}
              </button>
            ))}
          </div>
          {i > 0 && (
            <button type="button" className={`${bouton} justify-self-start`} onClick={() => majLieu({ horaires: lieux[0].horaires.map((h) => ({ ...h, plages: plagesDe(h) })) })}>
              Copier les horaires du lieu 1
            </button>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <p className="text-sm font-medium">Modèles rapides</p>
        <div className="flex flex-wrap gap-2">
          {MODELES_HORAIRES.map((m) => (
            <button key={m.id} type="button" className={bouton} onClick={() => majLieu({ horaires: m.appliquer(horaires) })}>{m.libelle}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {jour('Lundi')}
        {lundi.length > 0 && (
          <button type="button" className={`${lien} justify-self-start`} onClick={() => majLieu({ horaires: copierJour(horaires, 'Lundi', JOURS_OUVRES) })}>
            Copier le lundi sur tous les jours ouvrés (mardi au vendredi)
          </button>
        )}
        {JOURS_SEMAINE.slice(1, 6).map(jour)}
        <details className="rounded-xl" open={dimanche.length > 0}>
          <summary className={`min-h-11 cursor-pointer content-center rounded px-1 text-sm font-medium text-neutral-700 ${focus}`}>Dimanche{dimanche.length ? '' : ' (fermé)'}</summary>
          <div className="mt-2">{jour('Dimanche')}</div>
        </details>
      </div>

      <fieldset className="grid gap-3 rounded-xl border border-neutral-200 p-3">
        <legend className="px-1 text-sm font-semibold">Mentions</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-teal-800" checked={Boolean(lieu.surRendezVous)} onChange={(e) => majLieu({ surRendezVous: e.target.checked })} />
          Sur rendez-vous uniquement
        </label>
        <label className="grid gap-1.5 text-sm" htmlFor={idNote}>
          <span className="font-medium">Note courte (facultative)</span>
          <input
            id={idNote}
            className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
            placeholder="Fermé en août"
            maxLength={NOTE_HORAIRES_MAX * 3}
            value={lieu.noteHoraires ?? ''}
            onChange={(e) => majLieu({ noteHoraires: e.target.value })}
            aria-describedby={`${idNote}-aide`}
          />
          <span id={`${idNote}-aide`} className="grid gap-0.5 text-xs text-neutral-500">
            Affichée sous les horaires. Congés, fermeture exceptionnelle… ({(lieu.noteHoraires ?? '').trim().length}/{NOTE_HORAIRES_MAX})
            {alertesNote.map((a) => <span key={a} className="text-amber-800">{a}</span>)}
          </span>
        </label>
        {domicile?.actif && onDomicileJours && (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Jours de visites à domicile</p>
            <div role="group" aria-label="Jours de visites à domicile" className="flex flex-wrap gap-2">
              {JOURS_SEMAINE.map((j) => {
                const actif = domicile.jours.includes(j);
                return (
                  <button key={j} type="button" aria-pressed={actif} onClick={() => onDomicileJours(actif ? domicile.jours.filter((x) => x !== j) : JOURS_SEMAINE.filter((x) => x === j || domicile.jours.includes(x)))} className={`min-h-11 min-w-11 rounded-full px-3 text-sm font-semibold ring-1 ${focus} ${actif ? 'bg-teal-800 text-white ring-teal-800' : 'bg-white text-neutral-700 ring-neutral-300'}`}>
                    <span aria-hidden="true">{court(j)}</span><span className="sr-only">{j}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </fieldset>

      <div className="grid gap-1 rounded-xl bg-neutral-100 p-3 text-sm" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sur le site</p>
        {groupes.some((g) => g.ouvert) ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {groupes.map((g) => (
              <div key={g.numeros} className="contents">
                <dt className={g.ouvert ? 'font-medium' : 'text-neutral-500'}>{libelleJours(g.jours)}</dt>
                <dd className={`tabular-nums ${g.ouvert ? '' : 'text-neutral-500'}`}>{g.texte}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>Sur rendez-vous</p>
        )}
        {mentions.map((m) => <p key={m} className="text-neutral-700">{m}</p>)}
        {domicile?.actif && domicile.jours.length > 0 && <p className="text-neutral-700">Visites à domicile : {phraseJoursDomicile(domicile.jours).toLowerCase()}</p>}
        {alertes.length > 0 && <p className="mt-1 text-xs text-amber-800">{alertes.length} plage{alertes.length > 1 ? 's' : ''} à vérifier ci-dessus (le site reste publiable).</p>}
      </div>
    </div>
  );
}
