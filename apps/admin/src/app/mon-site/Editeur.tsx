'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  COULEURS_SUGGEREES,
  MISES_EN_PAGE,
  STYLES_IMAGES,
  type SiteDraft,
} from '@plateforme/core';
import Apercu from '@/components/Apercu';
import type { SoinCatalogue } from '@/lib/sites';
import { enregistrerSite } from './actions';

const ETAPES = ['Vous', 'Le cabinet', 'Les soins', 'Horaires', 'Le style'] as const;

type Props = { siteId: string | null; initial: SiteDraft; catalogue: SoinCatalogue[] };

export default function Editeur({ siteId, initial, catalogue }: Props) {
  const [draft, setDraft] = useState(initial);
  const [id, setId] = useState(siteId);
  const [etape, setEtape] = useState(0);
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();

  const maj = <K extends keyof SiteDraft>(cle: K, valeur: Partial<SiteDraft[K]>) => {
    setDraft((d) => ({ ...d, [cle]: Array.isArray(valeur) ? valeur : { ...(d[cle] as object), ...valeur } }));
    setStatut(null);
  };

  const enregistrer = (suivante?: number) =>
    demarrer(async () => {
      const r = await enregistrerSite(id, draft);
      setStatut(r);
      if (r.ok && r.id) setId(r.id);
      if (r.ok && suivante !== undefined) setEtape(suivante);
    });

  const derniere = etape === ETAPES.length - 1;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <h1 className="text-2xl font-bold">Mon site</h1>
        <ol className="mt-5 flex flex-wrap gap-2" aria-label="Étapes">
          {ETAPES.map((e, i) => (
            <li key={e}>
              <button
                type="button"
                onClick={() => setEtape(i)}
                aria-current={i === etape ? 'step' : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  i === etape ? 'bg-teal-800 text-white' : 'bg-white text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-50'
                }`}
              >
                {i + 1}. {e}
              </button>
            </li>
          ))}
        </ol>

        <form
          className="mt-6 rounded-2xl border border-black/5 bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            enregistrer(derniere ? undefined : etape + 1);
          }}
        >
          {etape === 0 && (
            <Grille>
              <Champ label="Prénom" value={draft.praticien.prenom} onChange={(v) => maj('praticien', { prenom: v })} autoComplete="given-name" />
              <Champ label="Nom" value={draft.praticien.nom} onChange={(v) => maj('praticien', { nom: v })} autoComplete="family-name" />
              <Champ
                large
                label="Titre affiché"
                placeholder="Pédicure-podologue diplômé(e) d’État"
                value={draft.praticien.titre}
                onChange={(v) => maj('praticien', { titre: v })}
              />
              <Champ
                label="Numéro RPPS"
                aide="11 chiffres, sur votre carte CPS"
                inputMode="numeric"
                value={draft.praticien.rpps}
                onChange={(v) => maj('praticien', { rpps: v.replace(/\D/g, '').slice(0, 11) })}
              />
            </Grille>
          )}

          {etape === 1 && (
            <Grille>
              <Champ large label="Nom du cabinet" placeholder="Cabinet de podologie…" value={draft.cabinet.nom} onChange={(v) => maj('cabinet', { nom: v })} />
              <Champ large label="Adresse" value={draft.cabinet.adresse} onChange={(v) => maj('cabinet', { adresse: v })} autoComplete="street-address" />
              <Champ label="Code postal" inputMode="numeric" value={draft.cabinet.codePostal} onChange={(v) => maj('cabinet', { codePostal: v.replace(/\D/g, '').slice(0, 5) })} />
              <Champ label="Ville" value={draft.cabinet.ville} onChange={(v) => maj('cabinet', { ville: v })} />
              <Champ large label="Quartier (affiché sur le site)" placeholder="Lyon 6e, quartier des Brotteaux" value={draft.cabinet.quartier} onChange={(v) => maj('cabinet', { quartier: v })} />
              <Champ label="Téléphone" type="tel" value={draft.cabinet.telephone} onChange={(v) => maj('cabinet', { telephone: v })} />
              <Champ
                label="Lien de prise de RDV"
                placeholder="https://www.doctolib.fr/…"
                type="url"
                value={draft.rdv.url}
                onChange={(v) => maj('rdv', { url: v })}
              />
              <label className="col-span-full flex items-center gap-3 text-sm">
                <input type="checkbox" className="size-4 accent-teal-800" checked={draft.cabinet.pmr} onChange={(e) => maj('cabinet', { pmr: e.target.checked })} />
                Cabinet accessible aux personnes à mobilité réduite
              </label>
            </Grille>
          )}

          {etape === 2 && (
            <fieldset>
              <legend className="text-sm text-neutral-600">Chaque soin coché aura sa propre page, optimisée pour Google.</legend>
              <div className="mt-4 grid gap-3">
                {catalogue.length === 0 && <p className="text-sm text-red-700">Catalogue introuvable : la base métier n’est pas encore chargée.</p>}
                {catalogue.map((s) => {
                  const coche = draft.soins.includes(s.slug);
                  return (
                    <label
                      key={s.slug}
                      className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${coche ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 hover:bg-neutral-50'}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-teal-800"
                        checked={coche}
                        onChange={(e) =>
                          maj('soins', e.target.checked ? [...draft.soins, s.slug] : draft.soins.filter((x) => x !== s.slug))
                        }
                      />
                      <span>
                        <span className="block font-semibold">{s.titre_court}</span>
                        <span className="block text-sm text-neutral-600">{s.resume}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {etape === 3 && (
            <div className="grid gap-3">
              <p className="text-sm text-neutral-600">Exemple : « 9h00–12h30, 14h00–19h00 » ou « Fermé ».</p>
              {draft.cabinet.horaires.map((h, i) => (
                <label key={h.jour} className="grid grid-cols-[100px_1fr] items-center gap-3 text-sm">
                  <span className="font-medium">{h.jour}</span>
                  <input
                    className={champClasse}
                    value={h.heures}
                    onChange={(e) =>
                      maj('cabinet', {
                        horaires: draft.cabinet.horaires.map((x, j) => (j === i ? { ...x, heures: e.target.value } : x)),
                      })
                    }
                  />
                </label>
              ))}
            </div>
          )}

          {etape === 4 && (
            <div className="grid gap-6">
              <fieldset>
                <legend className="font-medium">Couleur principale</legend>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {COULEURS_SUGGEREES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Couleur ${c}`}
                      aria-pressed={draft.theme.couleur === c}
                      onClick={() => maj('theme', { couleur: c })}
                      className={`size-9 rounded-full ring-offset-2 ${draft.theme.couleur === c ? 'ring-2 ring-neutral-900' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                  <label className="ml-2 flex items-center gap-2 text-sm text-neutral-600">
                    Autre
                    <input type="color" value={draft.theme.couleur} onChange={(e) => maj('theme', { couleur: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-neutral-300" />
                  </label>
                </div>
                <p className="mt-2 text-xs text-neutral-500">Les contrastes sont ajustés automatiquement pour rester lisibles.</p>
              </fieldset>

              <Choix
                legende="Mise en page"
                options={MISES_EN_PAGE.map((m) => ({ value: m.value, label: m.label, description: m.description }))}
                valeur={draft.theme.mise_en_page}
                onChange={(v) => maj('theme', { mise_en_page: v as SiteDraft['theme']['mise_en_page'] })}
              />
              <Choix
                legende="Style des illustrations"
                options={STYLES_IMAGES.map((s) => ({ value: s.value, label: s.label }))}
                valeur={draft.theme.style_images}
                onChange={(v) => maj('theme', { style_images: v as SiteDraft['theme']['style_images'] })}
              />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
            <button
              type="button"
              disabled={etape === 0}
              onClick={() => setEtape((e) => e - 1)}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:invisible"
            >
              ← Précédent
            </button>
            <span role="status" className={`text-sm ${statut?.ok ? 'text-teal-800' : 'text-red-700'}`}>
              {enCours ? 'Enregistrement…' : statut?.message}
            </span>
            {derniere ? (
              <div className="flex gap-2">
                <button type="submit" disabled={enCours} className="rounded-lg border border-teal-800 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50">
                  Enregistrer
                </button>
                <Link href="/tableau-de-bord" className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900">
                  Terminer
                </Link>
              </div>
            ) : (
              <button type="submit" disabled={enCours} className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
                Enregistrer et continuer →
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-sm font-medium text-neutral-600">Aperçu en direct</p>
        <Apercu draft={draft} catalogue={catalogue} />
      </div>
    </div>
  );
}

const champClasse =
  'h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';

function Grille({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

type ChampProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  large?: boolean;
  aide?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

function Champ({ label, value, onChange, large, aide, ...rest }: ChampProps) {
  return (
    <label className={`grid gap-1.5 text-sm ${large ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium">{label}</span>
      <input className={champClasse} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {aide && <span className="text-xs text-neutral-500">{aide}</span>}
    </label>
  );
}

function Choix({
  legende,
  options,
  valeur,
  onChange,
}: {
  legende: string;
  options: { value: string; label: string; description?: string }[];
  valeur: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-medium">{legende}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-xl border p-3 text-sm ${valeur === o.value ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 hover:bg-neutral-50'}`}
          >
            <input type="radio" className="sr-only" name={legende} checked={valeur === o.value} onChange={() => onChange(o.value)} />
            <span className="block font-semibold">{o.label}</span>
            {o.description && <span className="block text-xs text-neutral-600">{o.description}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
