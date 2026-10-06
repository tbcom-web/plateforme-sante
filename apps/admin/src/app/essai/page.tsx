import type { Metadata } from 'next';
import Link from 'next/link';
import { GAMMES, universDuParcours, type Univers } from '@plateforme/core';
import { EnteteEssai, PiedEssai } from './Cadre';
import { MARQUE } from '@/lib/marque';

// Page d'essai gratuit (« Gratuit pendant 3 mois ») : page publique, rendue statique au build, sans appel serveur ni
// traceur publicitaire, mobile d'abord. Le bouton enchaîne sur l'inscription en un écran (/essai/inscription), puis sur
// le parcours guidé de création. Prévue pour être servie aussi sur essai.webpodologue.fr (docs/onboarding-lead.md).
export const dynamic = 'force-static';

const URL_ESSAI = (process.env.NEXT_PUBLIC_URL_ESSAI || 'https://admin.webpodologue.fr/essai').replace(/\/$/, '');
const TITRE = 'Site internet pour pédicure-podologue : essai gratuit 3 mois';
const DESCRIPTION = 'Créez le site de votre cabinet en 10 minutes environ, avec des textes rédigés pour la profession. Gratuit pendant 3 mois, sans carte bancaire, sans engagement.';

export const metadata: Metadata = {
  title: { absolute: `${TITRE} · ${MARQUE.nom}` },
  description: DESCRIPTION,
  alternates: { canonical: URL_ESSAI },
  robots: { index: true, follow: true },
  openGraph: { title: TITRE, description: DESCRIPTION, url: URL_ESSAI, siteName: MARQUE.nom, locale: 'fr_FR', type: 'website' },
};

const BENEFICES = [
  {
    titre: 'Des textes écrits pour la profession',
    texte: 'Présentation des soins, fiches conseils, informations pratiques : des textes sobres, sans formulation publicitaire, que vous relisez et ajustez.',
  },
  {
    titre: 'Pensé pour le téléphone',
    texte: 'Adresse, horaires et prise de rendez-vous visibles dès l’ouverture du site, sur mobile comme sur ordinateur.',
  },
  {
    titre: 'Vous gardez la main',
    texte: 'Vous modifiez votre site depuis votre espace. Une conseillère vérifie vos informations avec vous avant toute mise en ligne publique.',
  },
];

const ETAPES = [
  { titre: 'Créez votre compte', texte: 'Nom, e-mail et mot de passe : une minute, sans carte bancaire.' },
  { titre: 'Répondez aux questions guidées', texte: 'Vos sujets, le modèle de site, le cabinet, les horaires et les soins, une étape par écran.' },
  { titre: 'Découvrez votre site', texte: 'Sur un lien privé, non indexé, que vous pouvez partager. Vous demandez la mise en ligne quand il vous convient.' },
];

const FAQ: { q: string; r: React.ReactNode }[] = [
  {
    q: 'Que deviennent mes données ?',
    r: <>Elles servent à créer votre site et à vous accompagner pendant l’essai. Elles sont hébergées dans l’Union européenne et ne sont ni vendues ni utilisées à des fins publicitaires. Aucune donnée de patient n’est demandée. Détails dans la <Link className="font-semibold underline underline-offset-2" href="/essai/confidentialite">politique de confidentialité</Link>.</>,
  },
  {
    q: 'Suis-je engagé ?',
    r: 'Non. Aucun moyen de paiement n’est demandé et l’essai ne se transforme pas en abonnement sans votre accord. Vous pouvez arrêter à tout moment.',
  },
  {
    q: 'Que se passe-t-il après 3 mois ?',
    r: 'Vous pouvez passer à l’abonnement, au tarif indiqué par votre conseillère. Sans suite de votre part, la version d’essai est suspendue, puis vos données sont supprimées 6 mois après la fin de l’essai.',
  },
  {
    q: 'Et mon nom de domaine ?',
    r: 'Pendant l’essai, votre site est visible sur un lien privé. La mise en ligne sur votre nom de domaine, existant ou à réserver, se fait avec votre conseillère, après vérification de vos informations et de votre inscription au tableau de l’Ordre.',
  },
];

type Couleurs = { fond: string; doux: string; accent: string; vif: string; encre: string; plan: string };

function couleursDe(u: Univers): Couleurs {
  const g = GAMMES.find((x) => x.id === u.preReglage.gamme) as (typeof GAMMES)[number] & { vif?: string; encre?: string };
  return { fond: g?.fond ?? '#ffffff', doux: g?.fondDoux ?? '#f2f4f5', accent: g?.accent ?? '#115e59', vif: g?.vif ?? g?.accent ?? '#115e59', encre: g?.encre ?? '#1c2731', plan: g?.plan ?? '#1c2731' };
}

/** Vignette schématique d'un modèle (SVG léger, dessiné d'après le gabarit et la gamme du modèle ; pas une capture). */
function Vignette({ u }: { u: Univers }) {
  const c = couleursDe(u);
  const gabarit = u.preReglage.modele;
  const ligne = (x: number, y: number, l: number, h = 6, f = c.encre, o = 0.18) => <rect x={x} y={y} width={l} height={h} rx={h / 2} fill={f} opacity={o} />;
  return (
    <svg viewBox="0 0 240 160" role="img" aria-label={`Aperçu schématique du modèle « ${u.nom} »`} className="block h-auto w-full">
      <rect width="240" height="160" fill={gabarit === 'technique' ? c.plan : c.fond} />
      {gabarit === 'technique' && (
        <g>
          {Array.from({ length: 8 }, (_, i) => Array.from({ length: 5 }, (_, j) => <circle key={`${i}-${j}`} cx={130 + i * 13} cy={50 + j * 18} r="1.6" fill="#ffffff" opacity={0.25 + ((i + j) % 3) * 0.2} />))}
          {ligne(16, 14, 50, 6, '#ffffff', 0.7)}
          {ligne(16, 48, 96, 10, '#ffffff', 0.9)}
          {ligne(16, 64, 80, 10, '#ffffff', 0.9)}
          {ligne(16, 86, 90, 5, '#ffffff', 0.4)}
          <rect x="16" y="104" width="62" height="18" rx="4" fill={c.vif} />
        </g>
      )}
      {gabarit === 'tableau' && (
        <g>
          {ligne(14, 12, 40, 6, c.encre, 0.6)}
          {[150, 178, 206].map((x) => <rect key={x} x={x} y="9" width="22" height="12" rx="6" fill={c.doux} />)}
          <rect x="12" y="32" width="128" height="74" rx="12" fill={c.doux} />
          {ligne(22, 46, 92, 9, c.encre, 0.8)}
          {ligne(22, 60, 70, 9, c.encre, 0.8)}
          <rect x="22" y="80" width="54" height="16" rx="8" fill={c.accent} />
          <rect x="148" y="32" width="80" height="34" rx="12" fill={c.vif} opacity="0.85" />
          <rect x="148" y="72" width="80" height="34" rx="12" fill={c.doux} />
          {[12, 88, 164].map((x) => <rect key={x} x={x} y="114" width="64" height="36" rx="12" fill={c.doux} />)}
        </g>
      )}
      {gabarit === 'village' && (
        <g>
          {ligne(70, 12, 100, 7, c.encre, 0.6)}
          {ligne(40, 36, 160, 11, c.encre, 0.85)}
          {ligne(60, 54, 120, 11, c.encre, 0.85)}
          <rect x="40" y="76" width="76" height="20" rx="10" fill={c.vif} />
          <rect x="124" y="76" width="76" height="20" rx="10" fill={c.accent} />
          <rect x="40" y="106" width="160" height="44" rx="10" fill={c.doux} />
          <path d="M52 140 L92 116 L140 132 L188 112" stroke={c.encre} strokeOpacity="0.25" strokeWidth="3" fill="none" />
          <circle cx="120" cy="128" r="5" fill={c.accent} />
        </g>
      )}
      {gabarit === 'revue' && (
        <g>
          <line x1="14" y1="24" x2="226" y2="24" stroke={c.encre} strokeWidth="1" opacity="0.6" />
          <line x1="14" y1="27" x2="226" y2="27" stroke={c.encre} strokeWidth="0.6" opacity="0.6" />
          {ligne(90, 10, 60, 6, c.encre, 0.6)}
          <rect x="128" y="38" width="98" height="76" fill={c.doux} />
          <path d="M150 100 C160 60, 200 60, 206 98" stroke={c.encre} strokeWidth="1.4" fill="none" opacity="0.7" />
          {ligne(14, 44, 100, 12, c.encre, 0.85)}
          {ligne(14, 62, 84, 12, c.encre, 0.85)}
          {ligne(14, 84, 96, 4, c.encre, 0.3)}
          {ligne(14, 92, 90, 4, c.encre, 0.3)}
          {ligne(14, 100, 70, 4, c.encre, 0.3)}
          <rect x="14" y="128" width="60" height="16" rx="8" fill="none" stroke={c.encre} strokeOpacity="0.5" />
          <rect x="82" y="128" width="60" height="16" rx="8" fill="none" stroke={c.encre} strokeOpacity="0.5" />
        </g>
      )}
    </svg>
  );
}

const boutonPrincipal = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-6 text-base font-semibold text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export default function PageEssai() {
  const modeles = universDuParcours();
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
        <section className="bg-white">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:py-16">
            <p className="text-sm font-semibold text-teal-800">Pour les pédicures-podologues</p>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Votre site de cabinet prêt en 10 minutes</h1>
            <p className="max-w-2xl text-lg text-neutral-700">Gratuit pendant 3 mois, sans carte bancaire. Votre site reste privé tant que vous ne demandez pas sa mise en ligne.</p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="/essai/inscription" data-suite className={boutonPrincipal}>Créer mon site d’essai</a>
              <span className="text-sm text-neutral-600">Sans engagement.</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="titre-benefices" className="mx-auto max-w-5xl px-4 py-12">
          <h2 id="titre-benefices" className="sr-only">Ce que vous obtenez</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {BENEFICES.map((b) => (
              <li key={b.titre} className="rounded-2xl border border-black/5 bg-white p-5">
                <h3 className="font-semibold">{b.titre}</h3>
                <p className="mt-2 text-neutral-700">{b.texte}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titre-modeles" className="bg-white">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 id="titre-modeles" className="text-2xl font-bold">{modeles.length} modèles, à vos couleurs</h2>
            <p className="mt-2 max-w-2xl text-neutral-700">Choisissez celui qui ressemble à votre cabinet ; vous pourrez en changer. Aperçus schématiques.</p>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {modeles.map((u) => (
                <li key={u.id} className="overflow-hidden rounded-2xl border border-black/10 bg-neutral-50">
                  <Vignette u={u} />
                  <div className="p-4">
                    <h3 className="font-semibold">{u.nom}</h3>
                    <p className="mt-1 text-sm text-neutral-700">{u.pourQui}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="titre-etapes" className="mx-auto max-w-5xl px-4 py-12">
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
          <div className="mt-8">
            <a href="/essai/inscription" data-suite className={boutonPrincipal}>Commencer l’essai gratuit</a>
          </div>
        </section>

        <section aria-labelledby="titre-faq" className="bg-white">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 id="titre-faq" className="text-2xl font-bold">Questions fréquentes</h2>
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
      </main>
      <PiedEssai />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {/* Paramètres de campagne (utm_*) transmis à l'inscription, pour la source du lead. Aucun traceur. */}
      <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-suite]');if(a&&location.search)a.href=a.getAttribute('href').split('?')[0]+location.search;},true);" }} />
    </div>
  );
}
