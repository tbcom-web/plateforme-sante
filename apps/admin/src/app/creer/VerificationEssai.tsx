'use client';

// Dernier écran du parcours pour un compte en essai : récapitulatif court et « Voir mon site », qui génère la version
// d'essai en APERÇU privé (https://apercu.<slug>.pages.dev, non indexé) avec le suivi de publication habituel.
// La mise en ligne publique se demande ensuite depuis le tableau de bord (validation par la conseillère).
// Site commencé en session anonyme (0025) : « Voir le rendu de mon site » (porte de capture puis rendu dans le
// navigateur), puis « Créez votre accès » (mot de passe + CGU) ; « Voir mon site » n'apparaît qu'avec l'accès.
import Link from 'next/link';
import CreerAcces from './CreerAcces';
import type { ResultatControle, SiteDraft, Univers } from '@plateforme/core';
import SuiviPublication from '@/components/SuiviPublication';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export type AccesEssai = {
  /** Session anonyme : aucun accès créé */
  anonyme: boolean;
  /** Coordonnées laissées à la porte du rendu */
  rendu: boolean;
  /** E-mail confirmé mais mot de passe pas encore choisi */
  mdpAChoisir: boolean;
  /** E-mail laissé à la porte du rendu (pré-remplit l'accès) */
  email: string;
};

export default function VerificationEssai({
  d, siteId, controle, univers, enCours, publication, onModifier, onPublier, acces, onVoirRendu, onFinaliser, onAccesCree,
}: {
  d: SiteDraft;
  siteId: string | null;
  controle: ResultatControle;
  univers?: Univers;
  enCours: boolean;
  publication: { ok: boolean; message: string } | null;
  onModifier: (etape: number) => void;
  onPublier: () => void | Promise<void>;
  acces: AccesEssai;
  onVoirRendu: () => void;
  onFinaliser: () => Promise<{ ok: boolean; message: string }>;
  onAccesCree: () => void;
}) {
  const noms = d.praticiens.map((p) => `${p.prenom} ${p.nom}`.trim()).filter(Boolean);
  const lieu = d.lieux[0];
  const lignes: [string, string, number][] = [
    ['Site', univers?.nom ?? '—', 2],
    ['Cabinet', [d.cabinet.nom, [lieu?.adresse, lieu?.codePostal, lieu?.ville].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || '—', 4],
    [d.praticiens.length > 1 ? 'Praticiens' : 'Praticien', noms.join(', ') || '—', 4],
    ['Soins', d.soins.length ? `${d.soins.length} soin${d.soins.length > 1 ? 's' : ''}` : 'Suggérés par le modèle', 5],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <section className="grid gap-3 rounded-2xl border border-black/5 bg-white p-5" aria-labelledby="titre-recap-essai">
        <h2 id="titre-recap-essai" className="text-lg font-semibold">Récapitulatif</h2>
        <dl className="grid divide-y divide-neutral-100">
          {lignes.map(([t, v, e]) => (
            <div key={t} className="grid grid-cols-[100px_minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm">
              <dt className="font-medium text-neutral-600">{t}</dt>
              <dd className="break-words">{v}</dd>
              <dd><button type="button" onClick={() => onModifier(e)} className={`min-h-11 rounded px-2 font-semibold text-teal-800 ${focus}`} aria-label={`Modifier : ${t}`}>Modifier</button></dd>
            </div>
          ))}
        </dl>
        {controle.remplacements.length > 0 && (
          <p className="text-sm text-neutral-600">
            {controle.remplacements.length > 1 ? `${controle.remplacements.length} informations pourront être complétées plus tard` : 'Une information pourra être complétée plus tard'} : la version d’essai affiche une mention sobre à la place.
          </p>
        )}
      </section>

      {acces.anonyme && !acces.rendu && (
        <section className="grid gap-3 rounded-2xl border border-black/5 bg-white p-5" aria-labelledby="titre-voir">
          <h2 id="titre-voir" className="text-lg font-semibold">Le rendu de votre site</h2>
          <p className="text-sm text-neutral-700">Votre site sur téléphone et sur ordinateur, avec vos informations. Il suffit de laisser votre adresse e-mail.</p>
          <button type="button" onClick={onVoirRendu} className={`min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 ${focus}`}>
            Voir le rendu de mon site
          </button>
        </section>
      )}

      {acces.anonyme && acces.rendu && (
        <section className="grid gap-3 rounded-2xl border border-teal-700/30 bg-white p-5" aria-labelledby="titre-acces">
          <h2 id="titre-acces" className="text-lg font-semibold">Créez votre accès pour voir et garder votre site</h2>
          <p className="text-sm text-neutral-700">Un mot de passe pour retrouver votre site sur n’importe quel appareil et l’ouvrir sur un lien privé, non indexé. Gratuit pendant 3 mois, sans carte bancaire.</p>
          <CreerAcces email={acces.email} mode="creer" onFinaliser={onFinaliser} onTermine={onAccesCree} />
          <button type="button" onClick={onVoirRendu} className={`min-h-11 justify-self-start rounded-lg px-1 text-sm font-semibold text-teal-800 underline ${focus}`}>Revoir le rendu</button>
        </section>
      )}

      {!acces.anonyme && acces.mdpAChoisir && (
        <section className="grid gap-3 rounded-2xl border border-teal-700/30 bg-white p-5" aria-labelledby="titre-mdp">
          <h2 id="titre-mdp" className="text-lg font-semibold">Adresse confirmée : choisissez votre mot de passe</h2>
          <CreerAcces email={acces.email} mode="mdp" onFinaliser={onFinaliser} onTermine={onAccesCree} />
        </section>
      )}

      {!acces.anonyme && !acces.mdpAChoisir && (
      <section className="grid gap-3 rounded-2xl border border-black/5 bg-white p-5" aria-labelledby="titre-voir">
        <h2 id="titre-voir" className="text-lg font-semibold">Votre version d’essai</h2>
        <p className="text-sm text-neutral-700">Un lien privé, non indexé par les moteurs de recherche. Vous pourrez le modifier et le régénérer autant que vous voulez pendant l’essai.</p>
        <button
          type="button"
          onClick={() => void onPublier()}
          disabled={enCours || Boolean(publication?.ok)}
          className={`min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 ${focus}`}
        >
          {enCours ? 'Préparation…' : 'Voir mon site'}
        </button>
        {publication?.ok && siteId ? (
          <SuiviPublication siteId={siteId} reessayer={async () => { await onPublier(); }} />
        ) : (
          <p role="status" aria-live="polite" className="text-sm text-red-700">{publication?.message ?? ''}</p>
        )}
        {publication?.ok && (
          <p className="text-sm text-neutral-700">
            Ensuite : depuis votre <Link href="/tableau-de-bord" className="font-semibold text-teal-800 underline">tableau de bord</Link>, demandez la mise en ligne quand votre site vous convient. Votre conseillère vérifie les informations avec vous avant toute publication sur votre nom de domaine.
          </p>
        )}
      </section>
      )}
    </div>
  );
}
