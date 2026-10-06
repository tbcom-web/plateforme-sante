import {
  appliquerUnivers, draftVide, GAMMES, LIBELLES_STATUTS_UNIVERS, modeleDuSite, SPECIALITES, SUJETS_FICHES_CONSEILS, type SiteDraft, type Univers,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import { getModelesDisponibles } from '@/lib/modeles';
import { getMarquesImportees } from '@/lib/marques';
import { getCatalogue } from '@/lib/sites';
import { getUnivers, sitesParUnivers } from '@/lib/univers';
import { ActionsUnivers } from './ActionsUnivers';

export const metadata = { title: 'Super admin · Univers' };

const COULEURS_STATUT: Record<Univers['statut'], string> = {
  brouillon: 'bg-amber-100 text-amber-900',
  valide: 'bg-teal-100 text-teal-900',
  retire: 'bg-neutral-100 text-neutral-700',
  differe: 'bg-orange-100 text-orange-900',
};

/** Cabinet fictif de l'aperçu : seule l'apparence vient de l'univers */
function draftDemo(u: Univers): SiteDraft {
  const d = draftVide();
  d.cabinet = { ...d.cabinet, nom: 'Cabinet de podologie', ville: 'Lyon', quartier: 'Brotteaux', telephone: '04 00 00 00 00' };
  d.lieux[0] = { ...d.lieux[0], adresse: '10 rue de la Démo', codePostal: '69006', ville: 'Lyon' };
  d.praticiens[0] = { ...d.praticiens[0], prenom: 'Camille', nom: 'Rousseau' };
  d.soins = [...u.preReglage.soinsEnAvant];
  return appliquerUnivers(d, u, { autoriserNonValide: true }).draft;
}

export default async function PageUnivers() {
  const [{ univers, erreur }, compte, modeles, catalogue, marquesImportees] = await Promise.all([
    getUnivers(), sitesParUnivers(), getModelesDisponibles(), getCatalogue(), getMarquesImportees(),
  ]);
  const libelle = (v: string) => SPECIALITES.find((s) => s.value === v)?.label ?? v;
  const titreSoin = (s: string) => catalogue.find((c) => c.slug === s)?.titre_court ?? s;
  const titreFiche = (f: string) => SUJETS_FICHES_CONSEILS.find((x) => x.id === f)?.titre ?? f;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold">Univers du catalogue</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Un univers est un site prêt à l’emploi : modèle, couleurs, illustrations, logo, soins mis en avant et contenus proposés, réglés ensemble.
          Le praticien choisit « celui-là », puis affine quelques éléments ; son identité (nom, praticiens, adresse, horaires, photos, logo) n’est jamais modifiée.
          Seuls les univers validés sont proposés. Avant de valider, regarder l’aperçu local sur ordinateur et sur mobile.
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Aperçu local (dossier <code>apps/sites</code>) : <code>npm run univers:apercu -- &lt;id&gt;</code> · planche de tous les univers : <code>npm run univers:planche</code>. Principe et règles : <code>docs/univers.md</code>.
        </p>
      </div>
      {erreur && <p className="text-sm text-red-700">Statuts illisibles : la base de données n’est pas à jour (mise à jour 0018, univers, à installer). Les statuts affichés sont ceux du code.</p>}

      <ul className="grid gap-6 xl:grid-cols-2">
        {univers.map((u) => {
          const p = u.preReglage;
          const d = draftDemo(u);
          const fiche = modeles.find((m) => m.id === p.modele)?.manifeste;
          const gamme = GAMMES.find((g) => g.id === p.gamme);
          const masque = u.statut === 'differe' || u.statut === 'retire';
          return (
            <li key={u.id} className={`grid content-start gap-3 rounded-xl border border-black/5 bg-white p-4 text-sm ${masque ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="text-base font-semibold">{u.nom}</span>
                  <code className="ml-2 text-xs text-neutral-400">{u.id}</code>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COULEURS_STATUT[u.statut]}`}>{LIBELLES_STATUTS_UNIVERS[u.statut]}</span>
              </div>
              <p className="text-neutral-700">{u.pourQui}</p>
              {fiche && u.statut !== 'differe' && (
                <div className="overflow-hidden rounded-lg ring-1 ring-black/5">
                  <ApercuTheme technique draft={d} modele={modeleDuSite(fiche, d.theme)} catalogue={catalogue} marquesImportees={marquesImportees} />
                </div>
              )}
              <p className="text-xs text-neutral-600"><strong>Pourquoi :</strong> {u.justification}</p>
              {u.motif && <p className="text-xs text-amber-800">{u.motif}</p>}
              <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-neutral-500">Modèle · gamme</dt>
                <dd>{fiche?.nom ?? p.modele} · {gamme?.nom ?? p.gamme}</dd>
                <dt className="text-neutral-500">Spécialités</dt>
                <dd>{libelle(p.specialite)}{p.specialiteSecondaire ? ` + ${libelle(p.specialiteSecondaire)}` : ''}</dd>
                <dt className="text-neutral-500">Illustrations</dt>
                <dd>registre {p.registre === 'pedagogique' ? 'pédagogique' : 'relevé'} · {p.modeVisuel} · animation {p.animation ? 'oui' : 'non'} · logo {p.logo.marque}</dd>
                <dt className="text-neutral-500">Soins en avant</dt>
                <dd>{p.soinsEnAvant.map(titreSoin).join(' › ')}</dd>
                <dt className="text-neutral-500">Articles</dt>
                <dd>{p.themesFlux.join(', ')}</dd>
                <dt className="text-neutral-500">Fiches conseils</dt>
                <dd>{p.fichesConseils.map(titreFiche).join(' · ')}</dd>
                <dt className="text-neutral-500">Sites</dt>
                <dd>{compte[u.id] ?? 0} site(s) l’utilisent</dd>
                {u.validePar && (
                  <>
                    <dt className="text-neutral-500">Validé</dt>
                    <dd>par {u.validePar}{u.valideLe ? ` le ${new Date(u.valideLe).toLocaleDateString('fr-FR')}` : ''}</dd>
                  </>
                )}
              </dl>
              <code className="text-xs text-neutral-500">npm run univers:apercu -- {u.id}</code>
              <ActionsUnivers id={u.id} statut={u.statut} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
