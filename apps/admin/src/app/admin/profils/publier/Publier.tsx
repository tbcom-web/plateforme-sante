'use client';

// Publication d'une recette (publication-recettes.ts) : profils cibles, ordre manuel facultatif, aperçu « ce que verra un praticien
// <profil> » (cabinet fictif aux sujets et à l'activité du profil, photos VALIDÉES de son kit), Publier / Dépublier. Si un élément
// n'est pas validé : la liste, chacun avec « Ouvrir », et aucun bouton Publier.
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  appliquerPriorites, appliquerRecette, avecPhotosActivite, badgeConcuPour, draftVide, soinsParDefautScenario, styleDuTheme,
  type MarqueImportee, type ProfilPratique, type PublicationRecette, type Recette, type Univers, type VerificationPublication, type VisuelsActivite,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import type { ModeleDisponible } from '@/lib/modeles';
import type { SoinCatalogue } from '@/lib/sites';
import { depublierRecette, publierRecette, type EtatPublication } from '../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
type Kit = VisuelsActivite & { compte: { photos: number; illustrations: number; icones: number; animations: number } };

/** Cabinet fictif d'un profil : ses thèmes, ses soins de base, son activité (l'apparence vient de la recette) */
function draftDuProfil(p: ProfilPratique, slugs: readonly string[]) {
  const d = draftVide();
  d.cabinet = { ...d.cabinet, nom: 'Cabinet de démonstration', ville: 'Lyon', telephone: '04 00 00 00 00' };
  d.lieux[0] = { ...d.lieux[0], adresse: '10 rue de la Démo', codePostal: '69006', ville: 'Lyon' };
  d.praticiens = [{ ...d.praticiens[0], prenom: 'Camille', nom: 'Rousseau' }];
  const principaux = p.principal ? [p.principal] : [];
  d.soins = soinsParDefautScenario({ principaux, secondaires: p.secondaires }, slugs);
  d.activites = p.activites.length ? [...p.activites] : undefined;
  return appliquerPriorites(d, { principaux, secondaires: p.secondaires });
}

export default function Publier({ recette, profils, parDefaut, profilApercu, publication, verification, kits, catalogue, modeles, marquesImportees, proposes, themesActives, migrationManquante }: {
  recette: Recette; profils: ProfilPratique[]; parDefaut: string[]; profilApercu: string; publication: PublicationRecette | null; verification: VerificationPublication;
  kits: Record<string, Kit>; catalogue: SoinCatalogue[]; modeles: ModeleDisponible[]; marquesImportees: MarqueImportee[]; proposes: Univers[]; themesActives: string[]; migrationManquante: boolean;
}) {
  const [coches, setCoches] = useState<string[]>(parDefaut);
  const [ordre, setOrdre] = useState<string>(publication?.ordre ? String(publication.ordre) : '');
  const [vue, setVue] = useState(profilApercu);
  const [etat, setEtat] = useState<EtatPublication | null>(null);
  const [enCours, demarrer] = useTransition();
  const publiee = Boolean(publication?.publiee);
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);
  const profil = profils.find((p) => p.id === vue) ?? profils[0];
  const kit = kits[profil.id];
  const apercu = useMemo(() => {
    const x = appliquerRecette(draftDuProfil(profil, slugs), recette.composition, { id: recette.id, proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives });
    return x ? { ...x, draft: avecPhotosActivite(x.draft, kit ?? null, styleDuTheme(x.draft.theme) === 'photos') } : null;
  }, [profil, slugs, recette, proposes, modeles, themesActives, kit]);
  const bloquants = etat?.bloquants ?? verification.bloquants;
  const basculer = (id: string) => setCoches((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const publier = () => demarrer(async () => setEtat(await publierRecette(recette.id, coches, ordre ? Number(ordre) : null)));
  const depublier = () => demarrer(async () => setEtat(await depublierRecette(recette.id)));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="grid min-w-0 gap-5">
        {bloquants.length > 0 && (
          <section aria-labelledby="titre-bloquants" className="grid gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <h2 id="titre-bloquants" className="font-semibold text-amber-950">À valider avant de publier ({bloquants.length})</h2>
            <p className="text-sm text-amber-950/80">Les praticiens ne voient que des éléments validés : rien n’est publié tant que ces éléments ne le sont pas.</p>
            <ul className="grid gap-1.5">
              {bloquants.map((b) => (
                <li key={b.cle} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-sm">
                  <span className="min-w-0 break-all"><span className="font-medium">{b.texte}</span> · <code className="text-xs">{b.cle.length > 70 ? `${b.cle.slice(0, 70)}…` : b.cle}</code></span>
                  <Link href={b.href} className={`inline-flex min-h-11 items-center rounded-lg border border-amber-800 px-3 font-semibold text-amber-950 hover:bg-amber-100 ${focus}`}>Ouvrir</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <fieldset className="grid gap-2 rounded-2xl border border-black/10 bg-white p-4">
          <legend className="float-left w-full font-semibold">Profils cibles</legend>
          <p className="text-sm text-neutral-600">Pré-cochés d’après le scénario de la recette.</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {profils.map((p) => (
              <li key={p.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-neutral-50">
                  <input type="checkbox" checked={coches.includes(p.id)} onChange={() => basculer(p.id)} className="size-5 accent-teal-800" />
                  <span className="text-sm">{p.court}</span>
                </label>
              </li>
            ))}
          </ul>
          <label className="mt-2 grid max-w-xs gap-1 text-sm">
            <span className="font-medium">Ordre manuel (facultatif)</span>
            <input type="number" min={1} max={999} inputMode="numeric" value={ordre} onChange={(e) => setOrdre(e.target.value)} placeholder="automatique" className="min-h-11 rounded-lg border border-neutral-300 px-3" />
            <span className="text-xs text-neutral-500">1 = en tête parmi les recettes publiées du profil.</span>
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          {verification.ok && (
            <button type="button" onClick={publier} disabled={enCours || !coches.length || migrationManquante} className={`min-h-12 rounded-xl bg-teal-800 px-5 font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`}>
              {enCours ? 'Publication…' : publiee ? 'Mettre à jour la publication' : 'Publier'}
            </button>
          )}
          {publiee && (
            <button type="button" onClick={depublier} disabled={enCours} className={`min-h-12 rounded-xl border border-neutral-400 px-5 font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 ${focus}`}>Dépublier</button>
          )}
          <p role="status" className={`text-sm ${etat && !etat.ok ? 'text-red-700' : 'text-neutral-700'}`}>{etat?.message ?? (publiee ? `Publiée pour : ${publication!.profils.join(', ')}` : 'Pas encore publiée.')}</p>
        </div>
      </div>

      <section aria-labelledby="titre-apercu" className="grid min-w-0 gap-3 lg:sticky lg:top-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titre-apercu" className="font-semibold">Ce que verra un praticien</h2>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Profil de l’aperçu</span>
            <select value={vue} onChange={(e) => setVue(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2">
              {profils.map((p) => <option key={p.id} value={p.id}>{p.court}</option>)}
            </select>
          </label>
        </div>
        <p><span className="rounded-full bg-teal-800 px-2.5 py-1 text-xs font-semibold text-white">{badgeConcuPour(profil)}</span></p>
        {kit && (
          <p className="text-xs text-neutral-600">
            Kit {profil.court} (éléments validés) : {kit.compte.photos} photo{kit.compte.photos > 1 ? 's' : ''}, {kit.compte.illustrations} illustration{kit.compte.illustrations > 1 ? 's' : ''}, {kit.compte.icones} icône{kit.compte.icones > 1 ? 's' : ''}, {kit.compte.animations} animation{kit.compte.animations > 1 ? 's' : ''}
            {kit.repli && profil.activites.length ? ' · aucun visuel validé de l’activité : repli sur le kit du thème.' : '.'}
          </p>
        )}
        <div aria-hidden="true" className="overflow-hidden rounded-lg ring-1 ring-black/10">
          {apercu ? <ApercuTheme vignette={520} appareil="bureau" draft={apercu.draft} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} /> : <p className="p-4 text-sm">Aperçu indisponible.</p>}
        </div>
      </section>
    </div>
  );
}
