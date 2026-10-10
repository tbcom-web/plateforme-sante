import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { MARQUE } from '@/lib/marque';
import Testeur from './Testeur';

// PAGE DE CAMPAGNE « AUDIT GRATUIT » (demande de Paul du 2026-10-11) : accroche « Vos patients demandent à ChatGPT un
// podologue. Votre cabinet en fait-il partie ? ». Test immédiat du site (score lisible par ChatGPT), puis demande de l'audit
// complet et du site préparé (/admin/audits). Page statique, publique, sans traceur ; style éditorial clair de la vitrine.
// Les chiffres de l'exemple sont ceux d'un audit réel (10 octobre 2026), site anonymisé.
export const dynamic = 'force-static';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-titre' });

const TITRE = 'Audit gratuit de votre site de cabinet';
const DESCRIPTION = 'Vos patients demandent à ChatGPT un podologue. Votre cabinet en fait-il partie ? Testez gratuitement votre site : ChatGPT, Google, téléphone, sécurité, conformité.';
const URL_PAGE = `${new URL(process.env.NEXT_PUBLIC_URL_ESSAI || 'https://admin.webpodologue.fr/essai').origin}/audit-gratuit`;

export const metadata: Metadata = {
  title: { absolute: `${TITRE} · ${MARQUE.nom}` },
  description: DESCRIPTION,
  alternates: { canonical: URL_PAGE },
  robots: { index: true, follow: true },
  openGraph: { title: 'Vos patients demandent à ChatGPT un podologue. Votre cabinet en fait-il partie ?', description: DESCRIPTION, url: URL_PAGE, locale: 'fr_FR', type: 'website' },
};

const CONTROLES = [
  ['Visibilité dans ChatGPT', 'Ce que les assistants IA peuvent lire et citer de votre cabinet.'],
  ['Référencement Google', 'Titre, description, « podologue + ville », plan du site, liens cassés.'],
  ['Vitesse', 'Le temps d’affichage sur un téléphone en 4G, mesuré comme Google.'],
  ['Affichage sur téléphone', 'Lisibilité, boutons, appel en un geste.'],
  ['Lisibilité et accessibilité', 'Contrastes, textes alternatifs, critères WCAG.'],
  ['Sécurité et technologie', 'Versions de PHP, WordPress, bibliothèques, en-têtes de sécurité.'],
  ['Conformité', 'Mentions légales, cookies, recommandations de l’Ordre.'],
  ['Contact et rendez-vous', 'Téléphone, adresse, horaires, prise de rendez-vous en ligne.'],
] as const;

// Audit réel du 10 octobre 2026 (site d'un cabinet, anonymisé) et site webpodologue préparé, mêmes tests
const EXEMPLE = [
  ['Visibilité dans ChatGPT', 57, 100], ['Sécurité et technologie', 25, 100], ['Lisibilité et accessibilité', 50, 100],
  ['Contact et rendez-vous', 72, 100], ['Conformité', 73, 95], ['Référencement Google', 72, 89],
] as const;

const FAQ = [
  ['Est-ce vraiment gratuit ?', 'Oui. Le test, l’audit complet et le site préparé à votre nom sont offerts, sans engagement.'],
  ['Avez-vous besoin d’un accès à mon site ?', 'Non. Nous lisons uniquement ce qui est public, comme le font Google, ChatGPT et vos patients. Rien n’est modifié sur votre site.'],
  ['Pourquoi ChatGPT ?', 'De plus en plus de patients demandent à ChatGPT, Gemini ou Perplexity « un podologue près de chez moi ». Ces assistants ne recommandent que les cabinets dont ils comprennent le site.'],
  ['Que faites-vous de mes coordonnées ?', 'Elles servent uniquement à vous envoyer votre audit et à vous rappeler à son sujet. Elles ne sont ni revendues ni utilisées pour autre chose.'],
  ['Et si je veux changer de site ?', 'Nous nous occupons de tout, sans coupure, et vous gardez votre nom de domaine et vos e-mails. Les mois restants de votre contrat actuel vous sont offerts : vous ne payez pas deux fois.'],
] as const;

const couleur = (n: number) => (n >= 90 ? '#1f7a6a' : '#b86e00');

export default function PageAuditGratuit() {
  const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
  return (
    <div className={`${bricolage.variable} min-h-full bg-white text-[#111614]`}>
      <style>{`.ag-titre{font-family:var(--font-titre),Inter,sans-serif;font-weight:800;letter-spacing:-.03em;line-height:1.02}`}</style>
      <header className="border-b border-black/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <span className="ag-titre text-[22px]">web<span className="text-[#1f7a6a]">podologue</span></span>
          <a href="#tester" className="min-h-11 content-center text-sm font-semibold underline-offset-4 hover:underline">Tester mon site</a>
        </div>
      </header>

      <main>
        <section id="tester" className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:pt-16">
          <div>
            <p className="inline-block rounded-full bg-[#cfeee3] px-3 py-1 text-sm font-semibold">Audit gratuit · pédicures-podologues</p>
            <h1 className="ag-titre mt-4 text-[40px] sm:text-[58px]">Vos patients demandent à ChatGPT un podologue. <span className="text-[#1f7a6a]">Votre cabinet en fait-il partie ?</span></h1>
            <p className="mt-5 max-w-xl text-lg text-[#5c6461]">Testez votre site en 30 secondes : ce que ChatGPT, Google et vos patients en voient vraiment.</p>
            <div className="mt-7 max-w-2xl"><Testeur turnstile={turnstile} /></div>
          </div>
          <aside aria-label="Exemple de résultat" className="self-start rounded-[28px] bg-[#111614] p-6 text-white sm:p-8">
            <p className="text-sm font-semibold text-[#8fe0c9]">Exemple de résultat</p>
            <p className="ag-titre mt-2 text-3xl">ChatGPT peut lire <span className="text-[#ffc46b]">3 informations sur 7</span> de ce cabinet.</p>
            <ul className="mt-4 text-[15px]">
              {([['Votre profession', true], ['L’adresse du cabinet', false], ['Votre téléphone', true], ['Vos horaires', false], ['Les soins que vous proposez', false], ['Comment prendre rendez-vous', true], ['Une fiche d’identité structurée', false]] as const).map(([l, ok]) => (
                <li key={l} className="flex items-center gap-2.5 border-t border-[#2a3330] py-2">
                  <span aria-hidden className={`grid size-5 place-items-center rounded-full text-[11px] font-bold text-[#111614] ${ok ? 'bg-[#8fe0c9]' : 'bg-[#ffc46b]'}`}>{ok ? '✓' : '✕'}</span>{l}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[#8fa39c]">Site réel d’un cabinet, anonymisé, testé le 10 octobre 2026.</p>
          </aside>
        </section>

        <section className="bg-[#f4f4f1]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
            <h2 className="ag-titre text-[34px] sm:text-[46px]">L’audit complet : 49 contrôles, en clair.</h2>
            <p className="mt-3 max-w-2xl text-[#5c6461]">Un rapport lisible en cinq minutes, en lien web et en PDF, avec une note par thème et ce qu’il faut corriger en priorité.</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CONTROLES.map(([t, d], i) => (
                <li key={t} className="rounded-2xl bg-white p-5">
                  <span className="ag-titre text-sm text-[#1f7a6a]">{String(i + 1).padStart(2, '0')}</span>
                  <p className="mt-1 font-semibold">{t}</p>
                  <p className="mt-1 text-sm text-[#5c6461]">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="ag-titre text-[34px] sm:text-[46px]">Avec l’audit, votre futur site. <span className="text-[#1f7a6a]">Déjà prêt.</span></h2>
              <p className="mt-4 text-[#5c6461]">Nous préparons un site à votre nom à partir des informations publiques de votre cabinet, et nous le soumettons aux mêmes tests. Vous comparez, chiffres à l’appui. Il n’est pas publié : vous seul le voyez.</p>
              <div className="mt-6 flex items-center gap-6">
                <div><p className="ag-titre text-5xl text-[#b86e00]">68</p><p className="text-sm text-[#5c6461]">site actuel</p></div>
                <span aria-hidden className="text-2xl text-[#5c6461]">→</span>
                <div><p className="ag-titre text-5xl text-[#1f7a6a]">97</p><p className="text-sm text-[#5c6461]">site préparé</p></div>
              </div>
              <p className="mt-3 text-xs text-[#5c6461]">Audit réel du 10 octobre 2026, cabinet anonymisé. Notes sur 100.</p>
            </div>
            <div className="rounded-[28px] bg-[#cfeee3] p-6 sm:p-8">
              {EXEMPLE.map(([t, a, b]) => (
                <div key={t} className="border-b border-black/5 py-3 last:border-0">
                  <div className="flex items-baseline justify-between gap-3"><span className="font-semibold">{t}</span><span className="ag-titre text-lg"><span style={{ color: couleur(a) }}>{a}</span> <span className="text-[#5c6461]">→</span> <span style={{ color: couleur(b) }}>{b}</span></span></div>
                  <div className="relative mt-2 h-2 rounded-full bg-white">
                    <i className="absolute inset-y-0 left-0 rounded-full bg-[#1f7a6a]" style={{ width: `${b}%` }} />
                    <i className="absolute inset-y-0 left-0 rounded-full bg-[#e6a43a]" style={{ width: `${a}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-8">
          <div className="mx-auto max-w-6xl rounded-[32px] bg-[#111614] p-7 text-white sm:p-12">
            <p className="inline-block rounded-full bg-[#fbe7a6] px-3 py-1 text-sm font-semibold text-[#111614]">Si vous décidez de changer</p>
            <p className="ag-titre mt-4 max-w-3xl text-[32px] text-[#8fe0c9] sm:text-[46px]">Les mois restants de votre contrat actuel vous sont offerts.</p>
            <p className="mt-4 max-w-2xl text-[#c9d1cd]">Vous ne payez rien chez {MARQUE.nom} tant que votre contrat actuel court. Nous nous occupons de toute la migration, sans coupure.</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {['Nom de domaine conservé', 'E-mails intacts', 'Aucune coupure', 'Rien de technique à faire'].map((g) => <li key={g} className="rounded-full bg-[#1d2422] px-4 py-2 text-sm font-semibold">✓ {g}</li>)}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
          <h2 className="ag-titre text-[34px] sm:text-[42px]">Questions fréquentes</h2>
          <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
            {FAQ.map(([q, r]) => (
              <details key={q} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<span aria-hidden className="text-xl transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-[#5c6461]">{r}</p>
              </details>
            ))}
          </div>
          <p className="mt-10 text-center"><a href="#tester" className="inline-block min-h-12 content-center rounded-xl bg-[#111614] px-6 font-semibold text-white">Tester mon site gratuitement</a></p>
        </section>
      </main>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-[#5c6461] sm:px-8">
          <p>{MARQUE.nom} est un service de TBCOM pour les pédicures-podologues. Contact : <a className="underline underline-offset-2" href={`mailto:${MARQUE.contact}`}>{MARQUE.contact}</a></p>
          <a href="/essai/confidentialite" className="underline underline-offset-2">Confidentialité</a>
        </div>
      </footer>
    </div>
  );
}
