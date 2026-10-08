'use client';

// « Personnaliser mon site » : police et taille, couleurs, images, textes des pages de contenus. Mobile d'abord : un onglet de
// réglages OU l'aperçu sur téléphone, les deux côte à côte sur ordinateur. Aperçu en direct (ApercuTheme, ordinateur / téléphone),
// annuler / rétablir, historique des versions, « Publier les modifications » par le circuit de publication habituel.
// La couche du praticien est séparée de la recette (packages/core/src/personnalisations-site.ts) : « Revenir au modèle » par réglage.
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ajusterCouleurPrincipale, ajusterCouleurSecondaire, appliquerPersonnalisations, avertissementsTexte, blocsAStocker, blocsDuModele, blocsEffectifs,
  contraste, controlerPersonnalisations, estImageDemo, formatEmplacement, LIMITES_BLOCS, modeleDuSite, pageCommeLeModele, pagesPersonnalisees, pilePolice, remarqueCouleur,
  resumePersonnalisations, revenirAuModele, TAILLES_TEXTE, TYPES_BLOCS, type AlertePerso, type Bloc, type CleReglage, type ChoixImage, type JeuPhotos,
  type MarqueImportee, type ModeleManifeste, type PersonnalisationsSite, type PoliceProposee, type ReglagesPerso, type SiteDraft, type TypeBloc,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import SuiviPublication from '@/components/SuiviPublication';
import type { SoinCatalogue } from '@/lib/sites';
import type { EmplacementImage, VersionJournal } from '@/lib/personnalisations-site';
import { controleDimensions, envoyerImagePerso, lireImage, recadrerEnWebp, zoneRecadree, type ImageLue } from '@/lib/image-perso';
import { annulerPersonnalisations, enregistrerPersonnalisations, publierPersonnalisations, type ResultatPerso } from './actions';

type Gamme = { id: string; nom: string; accent: string; duo: string | null; fondDoux: string; famille: string };
type Props = {
  siteId: string; version: string | null; draft: SiteDraft; modele: ModeleManifeste; catalogue: SoinCatalogue[]; marquesImportees: MarqueImportee[];
  jeuPhotos: JeuPhotos | null; initial: PersonnalisationsSite; polices: PoliceProposee[]; gammes: Gamme[]; secondaires: string[];
  images: EmplacementImage[]; journal: VersionJournal[]; admin: boolean; lienFormulaire: string;
};
type Onglet = 'police' | 'couleurs' | 'images' | 'textes' | 'historique';
const ONGLETS: { id: Onglet; nom: string }[] = [
  { id: 'police', nom: 'Police' }, { id: 'couleurs', nom: 'Couleurs' }, { id: 'images', nom: 'Images' }, { id: 'textes', nom: 'Textes' }, { id: 'historique', nom: 'Historique' },
];
type LigneCatalogue = SoinCatalogue & { faq?: { q: string; r: string }[] };

const bouton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:opacity-50 sm:px-4';
const boutonPlein = `${bouton} bg-teal-800 text-white hover:bg-teal-900`;
const boutonLigne = `${bouton} min-w-11 border border-black/15 bg-white text-neutral-800 hover:bg-neutral-50`;
const lien = 'min-h-11 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline';
const dateFr = (iso: string) => { try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };

export default function Personnaliser(p: Props) {
  // Réglages et piles annuler / rétablir dans UN état (mises à jour pures : mode strict de React)
  const [pile, setPile] = useState<{ r: ReglagesPerso; passe: ReglagesPerso[]; futur: ReglagesPerso[] }>({ r: p.initial.reglages, passe: [], futur: [] });
  const { r, passe, futur } = pile;
  const [enregistre, setEnregistre] = useState(JSON.stringify(p.initial.reglages));
  const [version, setVersion] = useState(p.version);
  const [revision, setRevision] = useState(p.initial.revision);
  const [onglet, setOnglet] = useState<Onglet>('police');
  const [vueMobile, setVueMobile] = useState<'reglages' | 'apercu'>('reglages');
  const [message, setMessage] = useState<ResultatPerso | { ok: boolean; message: string } | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [suivi, setSuivi] = useState<number | null>(null);
  const [enCours, demarrer] = useTransition();
  const modifie = JSON.stringify(r) !== enregistre;

  const changer = useCallback((f: (x: ReglagesPerso) => ReglagesPerso) => setPile((x) => ({ r: f(x.r), passe: [...x.passe.slice(-49), x.r], futur: [] })), []);
  const annuler = useCallback(() => setPile((x) => (x.passe.length ? { r: x.passe[x.passe.length - 1], passe: x.passe.slice(0, -1), futur: [x.r, ...x.futur] } : x)), []);
  const retablir = useCallback(() => setPile((x) => (x.futur.length ? { r: x.futur[0], passe: [...x.passe, x.r], futur: x.futur.slice(1) } : x)), []);
  const modele = (cle: CleReglage) => changer((x) => revenirAuModele(x, cle));

  // Raccourcis Ctrl+Z / Ctrl+Maj+Z (hors champs de saisie : le navigateur y garde son propre annuler)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.closest('input, textarea')) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); annuler(); }
      if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); retablir(); }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [annuler, retablir]);
  // Modifications non enregistrées : avertissement avant de quitter la page
  useEffect(() => {
    if (!modifie) return;
    const avant = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    addEventListener('beforeunload', avant);
    return () => removeEventListener('beforeunload', avant);
  }, [modifie]);

  // Liens internes (menu, tableau de bord) : confirmation tant que des modifications ne sont pas enregistrées
  useEffect(() => {
    if (!modifie) return;
    const clic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || e.defaultPrevented) return;
      if (!confirm('Vos modifications ne sont pas enregistrées. Quitter quand même ? (« Annuler » pour rester et cliquer sur « Enregistrer »)')) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener('click', clic, true);
    return () => document.removeEventListener('click', clic, true);
  }, [modifie]);

  // Aperçu en direct : la couche appliquée en dernier, sur une copie du brouillon
  const [pageTextes, setPageTextes] = useState<string | null>(null);
  const draftA = useMemo(() => {
    const x = appliquerPersonnalisations(p.draft, { reglages: r });
    // Onglet Textes : la page modifiée est celle de « Une page soin » dans l'aperçu
    const slug = onglet === 'textes' && pageTextes ? pageTextes.slice(5) : null;
    return slug ? { ...x, soins: x.soins.length && !x.soins.includes(slug) ? [...x.soins, slug] : x.soins, theme: { ...x.theme, soinsEnAvant: [slug, ...(x.theme.soinsEnAvant ?? []).filter((y) => y !== slug)] } } : x;
  }, [p.draft, r, onglet, pageTextes]);
  const modeleA = useMemo(() => modeleDuSite(p.modele, draftA.theme), [p.modele, draftA.theme]);
  const catalogueA = useMemo(() => pagesPersonnalisees(p.catalogue as LigneCatalogue[], r), [p.catalogue, r]);
  const modelesPages = useMemo(() => Object.fromEntries((p.catalogue as LigneCatalogue[]).map((c) => [`soin:${c.slug}`, blocsDuModele(c.corps ?? '', c.faq ?? [])])), [p.catalogue]);
  const titres = useMemo(() => [...p.catalogue.filter((c) => p.draft.soins.includes(c.slug)).map((c) => c.titre_court), p.draft.cabinet.ville, p.draft.cabinet.nom].filter(Boolean), [p.catalogue, p.draft]);
  const nomsPages = useMemo(() => Object.fromEntries(p.catalogue.map((c) => [`soin:${c.slug}`, c.titre_court])), [p.catalogue]);
  const alertes = useMemo(() => controlerPersonnalisations(r, { titres, majuscules: p.draft.theme.typo?.casse === 'majuscules', modele: modelesPages, nomsPages }), [r, titres, p.draft.theme.typo, modelesPages, nomsPages]);

  const enregistrer = () => demarrer(async () => {
    const x = await enregistrerPersonnalisations(p.siteId, r, version);
    setMessage(x);
    if (x.ok) { setEnregistre(JSON.stringify(r)); setVersion(x.version ?? version); setRevision(x.revision ?? revision); }
  });
  const publier = () => demarrer(async () => {
    setConfirmer(false);
    const x = await publierPersonnalisations(p.siteId, r, version);
    setMessage(x);
    if (x.version) { setEnregistre(JSON.stringify(r)); setVersion(x.version); setRevision(x.revision ?? revision); }
    if (x.ok) setSuivi((n) => (n ?? 0) + 1);
  });
  const toutAnnuler = () => demarrer(async () => {
    const x = await annulerPersonnalisations(p.siteId, version);
    setMessage(x);
    if (x.ok) { changer(() => ({})); setEnregistre('{}'); setVersion(x.version ?? version); setRevision(x.revision ?? revision); }
  });

  const casse = alertes.filter((a) => a.niveau === 'casse-charte');
  const demos = alertes.filter((a) => a.domaine === 'images' && /Démo/.test(a.message));

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Personnaliser mon site</h1>
          <p className="mt-1 max-w-prose text-sm text-neutral-600">
            Police, couleurs, images et textes : vos choix s’ajoutent au modèle sans le remplacer. Chaque réglage peut revenir au modèle.
            {' '}<Link href={p.lienFormulaire} className="font-semibold text-teal-800 underline-offset-4 hover:underline">Informations du cabinet</Link>
          </p>
        </div>
        <p className="text-xs text-neutral-500" aria-live="polite">{modifie ? 'Modifications non enregistrées' : revision ? `Version ${revision} enregistrée` : 'Aucune personnalisation'}</p>
      </header>

      {/* Barre d'actions : collante en bas sur téléphone (pouce), en haut sur ordinateur */}
      <div className="sticky bottom-0 z-10 -mx-4 order-last flex flex-wrap items-center gap-2 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur sm:order-none sm:static sm:mx-0 sm:rounded-xl sm:border sm:px-3">
        <button type="button" className={boutonLigne} onClick={annuler} disabled={!passe.length} title="Annuler (Ctrl+Z)" aria-label="Annuler la dernière modification">↶ <span className="hidden sm:inline">Annuler</span></button>
        <button type="button" className={boutonLigne} onClick={retablir} disabled={!futur.length} title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir la modification annulée">↷ <span className="hidden sm:inline">Rétablir</span></button>
        <span className="min-w-0 flex-1" />
        <button type="button" className={boutonLigne} onClick={enregistrer} disabled={enCours || !modifie}>Enregistrer</button>
        <button type="button" className={boutonPlein} onClick={() => setConfirmer(true)} disabled={enCours} aria-label="Publier les modifications"><span className="sm:hidden">Publier</span><span className="hidden sm:inline">Publier les modifications</span></button>
      </div>

      {message && <p role="status" className={`rounded-lg px-4 py-3 text-sm ${message.ok ? 'bg-teal-50 text-teal-900' : 'bg-amber-50 text-amber-950'}`}>{message.message}</p>}
      {confirmer && (
        <div role="alertdialog" aria-labelledby="titre-publier-perso" className="grid gap-3 rounded-xl border border-teal-300 bg-teal-50 p-4 text-sm text-teal-950">
          <p id="titre-publier-perso" className="font-semibold">Publier les modifications sur votre site ?</p>
          <p>Vos réglages sont enregistrés puis le site est reconstruit (quelques minutes). Vous pourrez revenir à une version précédente dans l’historique.</p>
          {demos.length > 0 && <p className="text-amber-900">Les images « Démo » ne seront pas publiées : l’image du modèle reste à leur place.</p>}
          {casse.length > 0 && <p className="text-amber-900">{casse.length} point(s) à vérifier (voir « À vérifier ») : le site corrige automatiquement couleurs et tailles.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={boutonPlein} onClick={publier} disabled={enCours}>Publier</button>
            <button type="button" className={boutonLigne} onClick={() => setConfirmer(false)}>Pas maintenant</button>
          </div>
        </div>
      )}
      {suivi !== null && <SuiviPublication key={suivi} siteId={p.siteId} onFermer={() => setSuivi(null)} />}

      <Alertes alertes={alertes} admin={p.admin} />
      {p.admin && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm">
          <span className="font-semibold text-amber-950">Administration</span>
          <span className="text-amber-900">{resumePersonnalisations(r).length} réglage(s) personnalisé(s).</span>
          <button type="button" className={boutonLigne} onClick={toutAnnuler} disabled={enCours || !resumePersonnalisations(r).length}>Tout annuler (revenir au modèle)</button>
        </div>
      )}

      {/* Téléphone : réglages OU aperçu ; ordinateur : les deux */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1 lg:hidden" role="tablist" aria-label="Affichage">
        {(['reglages', 'apercu'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={vueMobile === v} onClick={() => setVueMobile(v)} className={`min-h-11 rounded-md text-sm font-semibold ${vueMobile === v ? 'bg-white shadow-sm' : 'text-neutral-600'}`}>{v === 'reglages' ? 'Réglages' : 'Aperçu'}</button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section className={`${vueMobile === 'reglages' ? 'grid' : 'hidden'} min-w-0 gap-4 lg:grid`} aria-label="Réglages">
          <nav className="flex flex-wrap gap-1.5" role="tablist" aria-label="Réglages du site">
            {ONGLETS.map((o) => (
              <button key={o.id} type="button" role="tab" aria-selected={onglet === o.id} onClick={() => setOnglet(o.id)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${onglet === o.id ? 'bg-teal-800 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>{o.nom}</button>
            ))}
          </nav>
          {onglet === 'police' && <OngletPolice r={r} polices={p.polices} changer={changer} modele={modele} />}
          {onglet === 'couleurs' && <OngletCouleurs r={r} gammes={p.gammes} secondaires={p.secondaires} changer={changer} modele={modele} actuelle={{ couleur: p.draft.theme.couleur, gamme: p.draft.theme.gamme }} />}
          {onglet === 'images' && <OngletImages r={r} images={p.images} siteId={p.siteId} changer={changer} modele={modele} />}
          {onglet === 'textes' && <OngletTextes r={r} catalogue={p.catalogue as LigneCatalogue[]} soins={p.draft.soins} modeles={modelesPages} changer={changer} onPage={setPageTextes} />}
          {onglet === 'historique' && <OngletHistorique nomsPages={nomsPages} p={p.initial} journal={p.journal} charger={(x, n) => { changer(() => x); setMessage({ ok: true, message: `Version ${n} chargée dans l’aperçu : enregistrez ou publiez pour la garder.` }); }} />}
        </section>
        <section className={`${vueMobile === 'apercu' ? 'block' : 'hidden'} min-w-0 lg:sticky lg:top-20 lg:block`} aria-label="Aperçu du site">
          <ApercuTheme draft={draftA} modele={modeleA} catalogue={catalogueA} marquesImportees={p.marquesImportees} jeuPhotos={p.jeuPhotos} appareil="mobile" />
          <p className="mt-2 text-xs text-neutral-500">Aperçu en direct, avant publication. Le site en ligne change après « Publier les modifications ».</p>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------

function Alertes({ alertes, admin }: { alertes: AlertePerso[]; admin: boolean }) {
  if (!alertes.length) return null;
  const style = (n: AlertePerso['niveau']) => (n === 'casse-charte' ? 'bg-red-50 text-red-900 ring-red-200' : n === 'attention' ? 'bg-amber-50 text-amber-950 ring-amber-200' : 'bg-neutral-50 text-neutral-700 ring-black/5');
  return (
    <details className="rounded-xl border border-black/10 bg-white p-3 text-sm" open={alertes.some((a) => a.niveau !== 'info')}>
      <summary className="min-h-8 cursor-pointer font-semibold">À vérifier ({alertes.length}){admin && alertes.some((a) => a.niveau === 'casse-charte') ? ' · casse la charte' : ''}</summary>
      <ul className="mt-2 grid gap-2">
        {alertes.map((a, i) => <li key={i} className={`rounded-lg px-3 py-2 ring-1 ${style(a.niveau)}`}>{a.niveau === 'casse-charte' && <strong>{admin ? 'Charte : ' : 'Lisibilité : '}</strong>}{a.message}</li>)}
      </ul>
    </details>
  );
}

function Revenir({ actif, onClick, libelle = 'Revenir au modèle' }: { actif: boolean; onClick: () => void; libelle?: string }) {
  return actif ? <button type="button" className={lien} onClick={onClick}>{libelle}</button> : <span className="text-xs text-neutral-500">Réglage du modèle</span>;
}

type Changer = (f: (x: ReglagesPerso) => ReglagesPerso) => void;

function OngletPolice({ r, polices, changer, modele }: { r: ReglagesPerso; polices: PoliceProposee[]; changer: Changer; modele: (c: CleReglage) => void }) {
  const choisie = r.police ?? polices.find((x) => x.modele)?.id;
  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <div className="flex items-center justify-between gap-2"><legend className="font-semibold">Police</legend><Revenir actif={Boolean(r.police)} onClick={() => modele('police')} /></div>
        <p className="text-xs text-neutral-600">Paires de polices choisies pour leur lisibilité et leur accord avec votre modèle.</p>
        <div className="grid gap-2">
          {polices.map((x) => (
            <label key={x.id} className={`grid cursor-pointer gap-1 rounded-xl border p-3 ${choisie === x.id ? 'border-teal-700 ring-2 ring-teal-700/30' : 'border-black/10 hover:border-black/25'}`}>
              <span className="flex items-center justify-between gap-2 text-xs text-neutral-600">
                <span className="flex items-center gap-2"><input type="radio" name="police" checked={choisie === x.id} onChange={() => changer((y) => (x.modele ? revenirAuModele(y, 'police') : { ...y, police: x.id }))} className="size-4 accent-teal-800" />{x.nom}</span>
                <span>{x.modele ? 'Police du modèle' : x.note ? `${x.note.toFixed(1).replace('.', ',')} ★` : ''}</span>
              </span>
              <span className="text-xl leading-tight" style={{ fontFamily: pilePolice(x.titres), hyphens: 'none' }}>Cabinet de <span className="whitespace-nowrap">pédicurie-podologie</span></span>
              <span className="text-sm text-neutral-700" style={{ fontFamily: pilePolice(x.texte) }}>Soins des pieds, semelles et conseils, sur rendez-vous.</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <div className="flex items-center justify-between gap-2"><legend className="font-semibold">Taille des textes</legend><Revenir actif={Boolean(r.taille)} onClick={() => modele('taille')} /></div>
        <p className="text-xs text-neutral-600">Tous les textes suivent, titres compris, en gardant leurs proportions. Sur téléphone, les textes ne descendent jamais sous la taille standard.</p>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-neutral-100 p-1" role="radiogroup" aria-label="Taille des textes">
          {TAILLES_TEXTE.map((t, i) => {
            const actif = (r.taille ?? 'standard') === t.id;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={actif} onClick={() => changer((y) => (t.id === 'standard' ? revenirAuModele(y, 'taille') : { ...y, taille: t.id }))} className={`grid min-h-14 place-items-center rounded-lg px-1 text-center ${actif ? 'bg-white font-semibold shadow-sm ring-1 ring-teal-700/40' : 'text-neutral-600'}`}>
                <span aria-hidden="true" style={{ fontSize: `${14 + i * 3}px`, lineHeight: 1 }}>Aa</span>
                <span className="text-[11px] leading-tight">{t.nom}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function Pastille({ couleur, actif, libelle, onClick }: { couleur: string; actif: boolean; libelle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif} title={libelle} aria-label={libelle} className={`grid size-11 place-items-center rounded-full ${actif ? 'ring-2 ring-teal-800 ring-offset-2' : 'ring-1 ring-black/10'}`} style={{ background: couleur }}>
      {actif && <span className="text-sm font-bold text-white" aria-hidden="true">✓</span>}
    </button>
  );
}

function OngletCouleurs({ r, gammes, secondaires, changer, modele, actuelle }: { r: ReglagesPerso; gammes: Gamme[]; secondaires: string[]; changer: Changer; modele: (c: CleReglage) => void; actuelle: { couleur: string; gamme: string } }) {
  const [avis, setAvis] = useState<string | null>(null);
  const [avis2, setAvis2] = useState<string | null>(null);
  const principale = r.couleurs?.gamme ? gammes.find((g) => g.id === r.couleurs!.gamme)!.accent : r.couleurs?.principale ?? (gammes.find((g) => g.id === actuelle.gamme)?.accent ?? actuelle.couleur);
  const libre = (c: string) => { const a = ajusterCouleurPrincipale(c); setAvis([a.message, remarqueCouleur(c)].filter(Boolean).join(' ') || null); changer((y) => ({ ...y, couleurs: { ...(y.couleurs?.secondaire ? { secondaire: y.couleurs.secondaire } : {}), principale: a.couleur } })); };
  const second = (c: string) => { const a = ajusterCouleurSecondaire(c); setAvis2([a.message, remarqueCouleur(c)].filter(Boolean).join(' ') || null); changer((y) => ({ ...y, couleurs: { ...(y.couleurs ?? {}), secondaire: a.couleur } })); };
  const ratio = contraste('#ffffff', principale);
  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <div className="flex items-center justify-between gap-2"><legend className="font-semibold">Couleur principale</legend><Revenir actif={Boolean(r.couleurs?.gamme || r.couleurs?.principale)} onClick={() => { setAvis(null); modele('couleurs.principale'); }} /></div>
        <p className="text-xs text-neutral-600">Boutons, liens et titres. Les gammes sont déjà réglées pour rester lisibles.</p>
        <div className="flex flex-wrap gap-2">
          {gammes.map((g) => <Pastille key={g.id} couleur={g.accent} libelle={`Gamme ${g.nom}`} actif={r.couleurs?.gamme === g.id || (!r.couleurs?.gamme && !r.couleurs?.principale && actuelle.gamme === g.id)} onClick={() => { setAvis(null); changer((y) => ({ ...y, couleurs: { ...(y.couleurs?.secondaire ? { secondaire: y.couleurs.secondaire } : {}), gamme: g.id } })); }} />)}
        </div>
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span>Couleur libre</span>
          <input type="color" value={principale} onChange={(e) => libre(e.target.value)} className="h-11 w-16 cursor-pointer rounded-lg border border-black/15 bg-white" aria-label="Choisir une couleur principale libre" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ratio >= 4.5 ? 'bg-teal-50 text-teal-900' : 'bg-red-50 text-red-900'}`}>{ratio >= 4.5 ? 'Bien lisible ✓' : 'Peu lisible'}</span>
        </label>
        {avis && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">{avis}</p>}
      </fieldset>
      <fieldset className="grid gap-2">
        <div className="flex items-center justify-between gap-2"><legend className="font-semibold">Couleur secondaire</legend><Revenir actif={Boolean(r.couleurs?.secondaire)} onClick={() => { setAvis2(null); modele('couleurs.secondaire'); }} /></div>
        <p className="text-xs text-neutral-600">Pastilles, pictogrammes et teinte très douce des sections alternées.</p>
        <div className="flex flex-wrap gap-2">
          {secondaires.map((c) => <Pastille key={c} couleur={c} libelle={`Couleur secondaire ${c}`} actif={r.couleurs?.secondaire === c} onClick={() => second(c)} />)}
        </div>
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span>Couleur libre</span>
          <input type="color" value={r.couleurs?.secondaire ?? '#3fd0a0'} onChange={(e) => second(e.target.value)} className="h-11 w-16 cursor-pointer rounded-lg border border-black/15 bg-white" aria-label="Choisir une couleur secondaire libre" />
        </label>
        {avis2 && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">{avis2}</p>}
      </fieldset>
    </div>
  );
}

function Vignette({ url, alt }: { url: string | null; alt: string }) {
  if (!url) return <span className="grid aspect-[4/3] w-28 shrink-0 place-items-center rounded-lg bg-neutral-100 text-center text-[11px] text-neutral-500">Illustration du modèle</span>;
  return (
    <span className="relative block aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="size-full object-cover" loading="lazy" />
      {estImageDemo(url) && <span className="absolute left-1 top-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">Démo</span>}
    </span>
  );
}

function OngletImages({ r, images, siteId, changer, modele }: { r: ReglagesPerso; images: EmplacementImage[]; siteId: string; changer: Changer; modele: (c: CleReglage) => void }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [recadrage, setRecadrage] = useState<{ cle: string; img: ImageLue; url: string; focal: { x: number; y: number }; avis: string | null } | null>(null);
  const [etat, setEtat] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const cible = useRef<string | null>(null);
  const poser = (cle: string, choix: ChoixImage) => changer((y) => ({ ...y, images: { ...(y.images ?? {}), [cle]: choix } }));

  async function lire(f: File) {
    const cle = cible.current;
    if (!cle) return;
    try {
      const img = await lireImage(f);
      const { ratio, min } = formatEmplacement(cle);
      setRecadrage({ cle, img, url: URL.createObjectURL(f), focal: { x: 50, y: 50 }, avis: controleDimensions(img.largeur, img.hauteur, ratio, min) });
      setEtat(null);
    } catch (e) { setEtat((e as Error).message); }
  }
  async function valider() {
    if (!recadrage) return;
    const { ratio } = formatEmplacement(recadrage.cle);
    setEtat('Optimisation et envoi de l’image…');
    try {
      const blob = await recadrerEnWebp(recadrage.img, ratio, recadrage.focal);
      const url = await envoyerImagePerso(siteId, recadrage.cle, blob);
      poser(recadrage.cle, { url, source: 'televersee', focal: recadrage.focal });
      setEtat('Image envoyée et allégée pour le web.');
      setRecadrage(null);
    } catch (e) { setEtat((e as Error).message); }
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs text-neutral-600">Choisissez une image validée de votre kit ou envoyez la vôtre (recadrée et allégée automatiquement). Les images « Démo » ne sont jamais publiées.</p>
      <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) lire(f); }} />
      {etat && <p role="status" className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">{etat}</p>}
      {recadrage && (
        <div className="grid gap-2 rounded-xl border border-teal-300 bg-teal-50/50 p-3" role="dialog" aria-label="Recadrer l’image">
          <p className="text-sm font-semibold">Touchez le centre d’intérêt de l’image</p>
          <Recadrage {...recadrage} onFocal={(focal) => setRecadrage({ ...recadrage, focal })} />
          {recadrage.avis && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">{recadrage.avis}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={boutonPlein} onClick={valider} disabled={Boolean(recadrage.avis?.startsWith('Image trop petite'))}>Utiliser cette image</button>
            <button type="button" className={boutonLigne} onClick={() => setRecadrage(null)}>Annuler</button>
          </div>
        </div>
      )}
      <ul className="grid gap-3">
        {images.map((e) => {
          const perso = r.images?.[e.cle];
          const url = perso?.url ?? e.actuelle;
          return (
            <li key={e.cle} className="grid gap-2 rounded-xl border border-black/10 p-3">
              <div className="flex gap-3">
                <Vignette url={url} alt={e.libelle} />
                <div className="grid min-w-0 content-start gap-1">
                  <p className="font-semibold leading-tight">{e.libelle}</p>
                  <p className="text-xs text-neutral-600">{perso ? (perso.source === 'televersee' ? 'Votre image' : 'Image du kit') : 'Image du modèle'}{url && estImageDemo(url) ? ' · Démo : remplacez-la, elle ne sera pas publiée' : ''}</p>
                  <div className="flex flex-wrap gap-x-3">
                    {e.options.length > 0 && <button type="button" className={lien} aria-expanded={ouvert === e.cle} onClick={() => setOuvert(ouvert === e.cle ? null : e.cle)}>Choisir dans le kit</button>}
                    <button type="button" className={lien} onClick={() => { cible.current = e.cle; fichier.current?.click(); }}>Envoyer une image</button>
                    {perso && <button type="button" className={lien} onClick={() => modele(`image:${e.cle}`)}>Revenir à l’image du modèle</button>}
                  </div>
                </div>
              </div>
              {ouvert === e.cle && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {e.options.map((u) => (
                    <button key={u} type="button" onClick={() => { poser(e.cle, { url: u, source: 'kit' }); setOuvert(null); }} aria-pressed={perso?.url === u} className={`overflow-hidden rounded-lg ${perso?.url === u ? 'ring-2 ring-teal-800' : 'ring-1 ring-black/10'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Recadrage({ cle, img, url, focal, onFocal }: { cle: string; img: ImageLue; url: string; focal: { x: number; y: number }; onFocal: (f: { x: number; y: number }) => void }) {
  const { ratio } = formatEmplacement(cle);
  const z = zoneRecadree(img.largeur, img.hauteur, ratio, focal);
  const pc = (v: number, t: number) => `${(v / t) * 100}%`;
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: `${img.largeur} / ${img.hauteur}` }}
      onClick={(e) => { const b = e.currentTarget.getBoundingClientRect(); onFocal({ x: Math.round(((e.clientX - b.left) / b.width) * 100), y: Math.round(((e.clientY - b.top) / b.height) * 100) }); }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Image à recadrer" className="size-full object-contain opacity-60" />
      <span className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,.35)]" style={{ left: pc(z.x, img.largeur), top: pc(z.y, img.hauteur), width: pc(z.l, img.largeur), height: pc(z.h, img.hauteur) }} />
      <span className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-teal-700" style={{ left: `${focal.x}%`, top: `${focal.y}%` }} aria-hidden="true" />
      <span className="sr-only">Point focal : {focal.x} % en largeur, {focal.y} % en hauteur</span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------

const nouvelId = () => `p${Date.now().toString(36)}${Math.floor(Math.random() * 36 ** 2).toString(36)}`.slice(0, 20);
const nouveauBloc = (type: TypeBloc): Bloc => ({ id: nouvelId(), type, texte: '', ...(type === 'liste' ? { items: [''] } : {}), ...(type === 'question' ? { reponse: '' } : {}), ...(type === 'intertitre' ? { niveau: 2 as const } : {}) });

function OngletTextes({ r, catalogue, soins, modeles, changer, onPage }: { r: ReglagesPerso; catalogue: LigneCatalogue[]; soins: string[]; modeles: Record<string, Bloc[]>; changer: Changer; onPage: (cle: string) => void }) {
  const pages = catalogue.filter((c) => soins.length ? soins.includes(c.slug) : true);
  const [cle, setCle] = useState(pages[0] ? `soin:${pages[0].slug}` : '');
  const soin = catalogue.find((c) => `soin:${c.slug}` === cle);
  useEffect(() => { if (cle) onPage(cle); }, [cle, onPage]);
  const modele = useMemo(() => modeles[cle] ?? [], [modeles, cle]);
  const blocs = useMemo(() => blocsEffectifs(modele, r.pages?.[cle]), [modele, r.pages, cle]);
  if (!soin) return <p className="text-sm text-neutral-600">Aucune page de soin à modifier pour l’instant.</p>;
  const ecrire = (l: Bloc[]) => changer((y) => {
    const stocke = blocsAStocker(modele, l);
    const pagesY = { ...(y.pages ?? {}) };
    if (pageCommeLeModele(modele, stocke)) delete pagesY[cle]; else pagesY[cle] = stocke;
    return { ...y, ...(Object.keys(pagesY).length ? { pages: pagesY } : { pages: undefined }) };
  });
  const maj = (i: number, b: Bloc) => ecrire(blocs.map((x, j) => (j === i ? b : x)));
  const deplacer = (i: number, d: -1 | 1) => { const l = [...blocs]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; ecrire(l); };
  const ajouter = (t: TypeBloc) => ecrire([...blocs, nouveauBloc(t)]);
  const mots = blocs.map((b) => [b.texte, b.reponse ?? '', ...(b.items ?? [])].join(' ')).join(' ').split(/\s+/).filter(Boolean).length;

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Page</span>
        <select value={cle} onChange={(e) => setCle(e.target.value)} className="min-h-11 rounded-lg border border-black/15 bg-white px-3">
          {pages.map((c) => <option key={c.slug} value={`soin:${c.slug}`}>{c.titre_court}{r.pages?.[`soin:${c.slug}`] ? ' (modifiée)' : ''}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
        <span>{mots} mots · {blocs.length} blocs</span>
        {r.pages?.[cle] && <button type="button" className={lien} onClick={() => changer((y) => revenirAuModele(y, `page:${cle}`))}>Revenir au texte du modèle</button>}
      </div>
      <div className="rounded-xl border border-black/10 bg-neutral-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Titre de la page (H1) · verrouillé</p>
        <p className="mt-1 font-semibold" style={{ hyphens: 'none' }}>{(soin.titre ?? soin.titre_court).replace('{ville}', 'votre ville')}</p>
        <p className="mt-1 text-xs text-neutral-600">Gardé tel quel : c’est le titre lu par les moteurs de recherche.</p>
      </div>
      <ol className="grid gap-2">
        {blocs.map((b, i) => <EditeurBloc key={b.id} b={b} modele={modele.find((m) => m.id === b.id)} premier={i === 0} dernier={i === blocs.length - 1} onMaj={(x) => maj(i, x)} onSupprimer={() => ecrire(blocs.filter((_, j) => j !== i))} onDeplacer={(d) => deplacer(i, d)} />)}
      </ol>
      <div className="grid gap-2 rounded-xl border border-dashed border-black/20 p-3">
        <p className="text-sm font-semibold">Ajouter un bloc</p>
        <div className="flex flex-wrap gap-2">
          {TYPES_BLOCS.map((t) => <button key={t.id} type="button" title={t.aide} className={boutonLigne} onClick={() => ajouter(t.id)}>+ {t.nom}</button>)}
        </div>
      </div>
    </div>
  );
}

function Champ({ valeur, max, ligne = false, label, onChange }: { valeur: string; max: number; ligne?: boolean; label: string; onChange: (v: string) => void }) {
  const commun = 'w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[16px] leading-snug';
  return (
    <label className="grid gap-1 text-sm">
      <span className="sr-only">{label}</span>
      {ligne ? <input value={valeur} maxLength={max} onChange={(e) => onChange(e.target.value)} className={`${commun} min-h-11`} placeholder={label} />
        : <textarea value={valeur} maxLength={max} onChange={(e) => onChange(e.target.value)} rows={Math.min(8, Math.max(3, Math.ceil(valeur.length / 60)))} className={commun} placeholder={label} />}
      <span className={`justify-self-end text-[11px] ${valeur.length > max * 0.9 ? 'text-amber-800' : 'text-neutral-500'}`}>{valeur.length} / {max}</span>
    </label>
  );
}

function EditeurBloc({ b, modele, premier, dernier, onMaj, onSupprimer, onDeplacer }: { b: Bloc; modele?: Bloc; premier: boolean; dernier: boolean; onMaj: (b: Bloc) => void; onSupprimer: () => void; onDeplacer: (d: -1 | 1) => void }) {
  const nom = TYPES_BLOCS.find((t) => t.id === b.type)?.nom ?? b.type;
  const avert = useMemo(() => (b.verrou ? [] : avertissementsTexte([b.texte, b.reponse ?? '', ...(b.items ?? [])].join('\n'))), [b]);
  const modifie = modele && !b.verrou && JSON.stringify({ ...modele, verrou: undefined }) !== JSON.stringify({ ...b, verrou: undefined });
  const vide = !b.texte.trim() && !(b.items ?? []).some((x) => x.trim());
  return (
    <li className={`grid gap-2 rounded-xl border p-3 ${b.verrou ? 'border-black/10 bg-neutral-50' : 'border-black/10 bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{b.verrou ? '🔒 ' : ''}{nom}{b.id.startsWith('p') ? ' · ajouté' : modifie ? ' · modifié' : ''}</span>
        <span className="flex gap-1">
          <button type="button" className="grid size-11 place-items-center rounded-lg hover:bg-neutral-100 disabled:opacity-30" onClick={() => onDeplacer(-1)} disabled={premier} aria-label={`Monter le bloc ${nom}`}>↑</button>
          <button type="button" className="grid size-11 place-items-center rounded-lg hover:bg-neutral-100 disabled:opacity-30" onClick={() => onDeplacer(1)} disabled={dernier} aria-label={`Descendre le bloc ${nom}`}>↓</button>
          <button type="button" className="grid size-11 place-items-center rounded-lg text-red-800 hover:bg-red-50 disabled:opacity-30" onClick={onSupprimer} disabled={Boolean(b.verrou)} aria-label={`Supprimer le bloc ${nom}`} title={b.verrou ? 'Bloc réglementaire : il ne peut pas être supprimé' : 'Supprimer'}>✕</button>
        </span>
      </div>
      {b.verrou ? (
        <div className="grid gap-1 text-sm">
          {b.type === 'liste' ? <ul className="list-disc pl-5">{(b.items ?? []).map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className={b.type === 'intertitre' ? 'font-semibold' : ''}>{b.texte}</p>}
          {b.reponse && <p className="text-neutral-700">{b.reponse}</p>}
          <p className="text-xs text-neutral-600">{b.verrou.raison}</p>
        </div>
      ) : b.type === 'liste' ? (
        <div className="grid gap-1">
          {(b.items ?? []).map((x, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="pt-3 text-neutral-400" aria-hidden="true">{b.ordonnee ? `${i + 1}.` : '•'}</span>
              <div className="min-w-0 flex-1"><Champ ligne valeur={x} max={LIMITES_BLOCS.item} label={`Point ${i + 1}`} onChange={(v) => onMaj({ ...b, items: (b.items ?? []).map((y, j) => (j === i ? v : y)) })} /></div>
              <button type="button" className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-neutral-100" onClick={() => onMaj({ ...b, items: (b.items ?? []).filter((_, j) => j !== i) })} aria-label={`Retirer le point ${i + 1}`}>−</button>
            </div>
          ))}
          {(b.items ?? []).length < LIMITES_BLOCS.items && <button type="button" className={lien} onClick={() => onMaj({ ...b, items: [...(b.items ?? []), ''] })}>+ Ajouter un point</button>}
        </div>
      ) : b.type === 'question' ? (
        <>
           <Champ valeur={b.texte} max={LIMITES_BLOCS.question} label="Question" onChange={(v) => onMaj({ ...b, texte: v })} />
          <Champ valeur={b.reponse ?? ''} max={LIMITES_BLOCS.reponse} label="Réponse" onChange={(v) => onMaj({ ...b, reponse: v })} />
        </>
      ) : (
        <Champ ligne={b.type === 'intertitre'} valeur={b.texte} max={b.type === 'intertitre' ? LIMITES_BLOCS.intertitre : b.type === 'encadre' ? LIMITES_BLOCS.encadre : LIMITES_BLOCS.paragraphe} label={b.type === 'intertitre' ? 'Intertitre' : 'Texte'} onChange={(v) => onMaj({ ...b, texte: v })} />
      )}
      {!b.verrou && /\*\*/.test([b.texte, ...(b.items ?? [])].join(' ')) && <p className="text-xs text-neutral-500">Les mots entre ** ** s’affichent en gras sur le site.</p>}
      {vide && !b.verrou && <p className="text-xs text-neutral-500">Bloc vide : il ne sera pas enregistré.</p>}
      {avert.length > 0 && (
        <div className="grid gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {[...new Map(avert.map((a) => [`${a.extrait}|${a.raison}`, a])).values()].slice(0, 4).map((a, i) => <p key={i}><strong>« {a.extrait} »</strong> : {a.raison.replace(/\.$/, '')}.{a.suggestion ? ` ${a.suggestion}` : ''}</p>)}
          {avert[0].reformulation && (b.type === 'paragraphe' || b.type === 'encadre' || b.type === 'intertitre') && <button type="button" className={`${lien} justify-self-start`} onClick={() => onMaj({ ...b, texte: avert[0].reformulation! })}>Utiliser la reformulation proposée</button>}
        </div>
      )}
      {modifie && <button type="button" className={`${lien} justify-self-start`} onClick={() => onMaj({ ...modele! })}>Revenir au texte du modèle</button>}
    </li>
  );
}

function OngletHistorique({ p, journal, charger, nomsPages }: { nomsPages: Record<string, string>; p: PersonnalisationsSite; journal: VersionJournal[]; charger: (r: ReglagesPerso, n: number) => void }) {
  const versions = [...p.historique].reverse();
  const actions: Record<string, string> = { enregistrement: 'Enregistrée', publication: 'Publiée', restauration: 'Restaurée', annulation: 'Annulée (administration)' };
  return (
    <div className="grid gap-3">
      {!versions.length && <p className="text-sm text-neutral-600">Aucune version enregistrée pour l’instant.</p>}
      <ol className="grid gap-2">
        {versions.map((v) => {
          const resume = resumePersonnalisations(v.reglages, nomsPages);
          const pub = journal.find((j) => j.revision === v.revision && j.action === 'publication');
          return (
            <li key={v.revision} className="grid gap-1 rounded-xl border border-black/10 p-3 text-sm">
              <p className="flex flex-wrap items-center justify-between gap-2"><strong>Version {v.revision}</strong><span className="text-xs text-neutral-500">{dateFr(v.le)} · {v.par === 'admin' ? 'conseiller' : 'vous'}{pub ? ' · publiée' : ''}</span></p>
              {v.note && <p className="text-xs text-neutral-600">{v.note}</p>}
              <p className="text-xs text-neutral-700">{resume.length ? resume.map((x) => `${x.libelle} : ${x.valeur}`).join(' · ') : 'Site du modèle, sans personnalisation'}</p>
              {v.revision !== p.revision && <button type="button" className={`${lien} justify-self-start`} onClick={() => charger(v.reglages, v.revision)}>Revenir à cette version</button>}
            </li>
          );
        })}
      </ol>
      {journal.length > 0 && <p className="text-xs text-neutral-500">Dernières actions : {journal.map((j) => `version ${j.revision} ${(actions[j.action] ?? j.action).toLowerCase()}`).slice(0, 6).join(', ')}.</p>}
    </div>
  );
}
