import type { Metadata } from 'next';
import Link from 'next/link';
import { universDuParcours } from '@plateforme/core';
import { EnteteEssai, EtapesEssai, PiedEssai } from './Cadre';
import CaptureProspect from './CaptureProspect';
import { MARQUE } from '@/lib/marque';

// Page d'essai gratuit (« Gratuit pendant 3 mois ») : page publique, rendue statique au build, mobile d'abord, sans
// traceur ni cookie. Funnel en 4 étapes (docs/onboarding-lead.md) :
//   1. ici, « Créer mon site gratuit » : prénom, nom, e-mail, téléphone facultatif, ville → prospect enregistré
//      (route /api/essai/prospect), même s'il s'arrête là ;
//   2. /essai/inscription : mot de passe et CGU ; 3. /creer : parcours guidé ; 4. aperçu privé puis mise en ligne
//      demandée, validée par la conseillère.
// Mesure : un signal au chargement (/api/essai/mesure), compté par jour côté serveur, sans identifiant.
export const dynamic = 'force-static';

const URL_ESSAI = (process.env.NEXT_PUBLIC_URL_ESSAI || 'https://admin.webpodologue.fr/essai').replace(/\/$/, '');
const TITRE = 'Site internet pour pédicure-podologue : essai gratuit 3 mois';
const DESCRIPTION = 'Créez le site de votre cabinet avec des textes rédigés pour la profession. Gratuit pendant 3 mois, sans carte bancaire, sans engagement.';

export const metadata: Metadata = {
  title: { absolute: `${TITRE} · ${MARQUE.nom}` },
  description: DESCRIPTION,
  alternates: { canonical: URL_ESSAI },
  robots: { index: true, follow: true },
  openGraph: { title: TITRE, description: DESCRIPTION, url: URL_ESSAI, siteName: MARQUE.nom, locale: 'fr_FR', type: 'website' },
};

const POINTS = [
  'Des textes écrits pour la profession, que vous relisez',
  'Adresse, horaires et rendez-vous visibles sur téléphone',
  'Une conseillère vérifie tout avec vous avant la mise en ligne',
];

const ETAPES = [
  { titre: 'Vos coordonnées', texte: 'Nom, e-mail et ville du cabinet, puis un mot de passe. Aucune carte bancaire.' },
  { titre: 'Questions guidées', texte: 'Vos sujets, le modèle, le cabinet, les horaires et les soins : une étape par écran, environ 10 minutes.' },
  { titre: 'Votre site en aperçu privé', texte: 'Sur un lien non indexé. Quand il vous convient, vous demandez la mise en ligne ; votre conseillère vérifie les informations avec vous.' },
];

const FAQ: { q: string; r: React.ReactNode }[] = [
  {
    q: 'Combien coûte le site après les 3 mois ?',
    r: 'Si vous souhaitez continuer, l’abonnement se fait au tarif indiqué par votre conseillère, avant tout paiement. Rien n’est prélevé pendant l’essai : aucun moyen de paiement n’est demandé.',
  },
  {
    q: 'Suis-je engagé ?',
    r: 'Non. L’essai ne se transforme pas en abonnement sans votre accord, et vous pouvez arrêter à tout moment. Sans suite de votre part, la version d’essai est suspendue à la fin des 3 mois.',
  },
  {
    q: 'Que deviennent mes données ?',
    r: <>Elles servent à créer votre site et à vous accompagner. Elles sont hébergées dans l’Union européenne, ne sont ni vendues ni utilisées à des fins publicitaires, et sont supprimées 6 mois après la fin d’un essai sans suite. Aucune donnée de patient n’est demandée. Détails dans la <Link className="font-semibold underline underline-offset-2" href="/essai/confidentialite">politique de confidentialité</Link>.</>,
  },
  {
    q: 'Pourquoi demander mon téléphone ?',
    r: 'Il est facultatif. Il permet à votre conseillère de vous aider si vous restez bloqué(e) pendant la création. Il n’est jamais transmis à des tiers.',
  },
  {
    q: 'Et mon nom de domaine ?',
    r: 'Pendant l’essai, votre site est visible sur un lien privé. La mise en ligne sur votre nom de domaine, existant ou à réserver, se fait avec votre conseillère, après vérification de vos informations et de votre inscription au tableau de l’Ordre.',
  },
  {
    q: 'Puis-je modifier le site ensuite ?',
    r: 'Oui. Textes, horaires, soins, couleurs et modèle se modifient depuis votre espace, pendant l’essai comme après.',
  },
];

const boutonSecondaire = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-6 text-base font-semibold text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function PageEssai() {
  const modeles = universDuParcours();
  // Turnstile pour la capture seulement si les deux clés existent (la clé secrète reste côté serveur).
  const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY : null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: TITRE,
    description: DESCRIPTION,
    url: URL_ESSAI,
    inLanguage: 'fr-FR',
    publisher: { '@type': 'Organization', name: MARQUE.nom, email: MARQUE.contact },
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: FAQ.filter((f) => typeof f.r === 'string').map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <EnteteEssai />
      <main className="flex-1">
        {/* Premier écran : promesse et formulaire de l'étape 1 */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-10 pt-6 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-12">
            <div className="grid gap-3 lg:pt-6">
              <p className="text-sm font-semibold text-teal-800">Pour les pédicures-podologues · gratuit pendant 3 mois</p>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-5xl">Le site de votre cabinet, créé avec vous</h1>
              <p className="text-base text-neutral-700 sm:text-lg">Sans carte bancaire, sans engagement. Votre site reste privé tant que vous ne demandez pas sa mise en ligne.</p>
              <ul className="hidden gap-2 pt-2 text-neutral-800 lg:grid">
                {POINTS.map((p) => (
                  <li key={p} className="flex gap-2"><span aria-hidden="true" className="text-teal-700">✓</span>{p}</li>
                ))}
              </ul>
            </div>
            <div id="creer" className="grid scroll-mt-4 gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
              <div className="grid gap-3">
                <h2 className="text-xl font-bold">Créer mon site gratuit</h2>
                <EtapesEssai active={1} />
              </div>
              <CaptureProspect turnstile={turnstile} />
            </div>
          </div>
        </section>

        <section aria-labelledby="titre-points" className="mx-auto max-w-5xl px-4 py-10 lg:hidden">
          <h2 id="titre-points" className="sr-only">Ce que vous obtenez</h2>
          <ul className="grid gap-2 text-neutral-800">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-2"><span aria-hidden="true" className="text-teal-700">✓</span>{p}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titre-modeles" className="bg-white">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
            <h2 id="titre-modeles" className="text-2xl font-bold">{modeles.length} modèles, à vos couleurs</h2>
            <p className="mt-2 max-w-2xl text-neutral-700">Premier écran sur téléphone d’un cabinet de démonstration. Vous choisissez le modèle pendant la création et pouvez en changer ensuite.</p>
            <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {modeles.map((u) => (
                <li key={u.id} className="overflow-hidden rounded-2xl border border-black/10 bg-neutral-50">
                  {/* Captures réelles du site de démonstration (WebP ~30 Ko, chargées à l'approche) */}
                  <img src={`/modeles-essai/${u.preReglage.modele}.webp`} width={600} height={1067} loading="lazy" decoding="async"
                    alt={`Modèle « ${u.nom} » : premier écran du site de démonstration sur téléphone`} className="block aspect-[600/1067] h-auto w-full bg-neutral-100 object-cover object-top" />
                  <div className="p-3 sm:p-4">
                    <h3 className="font-semibold">{u.nom}</h3>
                    <p className="mt-1 hidden text-sm text-neutral-700 sm:block">{u.pourQui}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="titre-etapes" className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
          <h2 id="titre-etapes" className="text-2xl font-bold">Comment ça marche</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-800 font-bold text-white" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{e.titre}</h3>
                  <p className="mt-1 text-neutral-700">{e.texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="titre-faq" className="bg-white">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
            <h2 id="titre-faq" className="text-2xl font-bold">Vos questions</h2>
            <div className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <span aria-hidden="true" className="text-teal-800 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-4 text-neutral-700">{f.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="titre-fin" className="mx-auto grid max-w-3xl justify-items-start gap-3 px-4 py-12">
          <h2 id="titre-fin" className="text-2xl font-bold">Prêt à commencer ?</h2>
          <p className="text-neutral-700">Gratuit pendant 3 mois, sans carte bancaire. Une conseillère reste disponible si vous avez besoin d’aide.</p>
          <a href="#creer" data-focus-capture className={boutonSecondaire}>Créer mon site gratuit</a>
        </section>
      </main>
      <PiedEssai />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {/* Bouton du bas : remonte au formulaire et place le curseur dans le premier champ. Signal de visite pour
          l'entonnoir (compteur du jour côté serveur ; ni cookie, ni identifiant, ni service tiers). */}
      <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-focus-capture]');if(a){var c=document.getElementById('prenom');if(c){e.preventDefault();document.getElementById('creer').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(function(){c.focus({preventScroll:true})},400);}}});try{navigator.sendBeacon&&navigator.sendBeacon('/api/essai/mesure')}catch(e){}" }} />
    </div>
  );
}
