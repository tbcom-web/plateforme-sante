'use client';

// Parcours guidé de création du site : 7 étapes, une par écran, une recommandation par défaut à chaque étape.
// Le praticien dit d'abord ses SUJETS (3 principaux dans l'ordre, 3 traités aussi : menu, accueil), ses COULEURS aimées
// (0 à 3), puis CHOISIT un site tout prêt parmi des propositions tirées de ses sujets et couleurs (propositions.ts,
// « Ajuster » : style d'illustration, couleurs, structure) et AFFINE cabinet, horaires, soins et image, contenus ; il
// vérifie puis publie. Sauvegarde automatique du brouillon (verrou optimiste : un enregistrement refusé garde la saisie dans ce
// navigateur). Fonctions pures dans packages/core/src/parcours.ts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  aideEtape,
  controlerPublication,
  ETAPES_PARCOURS,
  etapeDeReprise,
  modeleDuSite,
  modeleIntegre,
  universDuParcours,
  animationPour,
  styleDuTheme,
  stylesCompatibles,
  type JeuPhotos,
  type PoidsAtelier,
  type Proposition,
  type PropositionRecette,
  type Recette,
  type ReglagesSite,
  type Structure,
  type MarqueImportee,
  type SiteDraft,
  type Univers,
  soinsSuggeresParcours,
  soinsEnAvantDesPriorites,
  avecPrioritesParcours,
  renduDisponible,
  jalonProgressionEssai,
  encouragementParcours,
  soinsDeBaseParcours,
  soinsParDefaut,
  type Priorites,
} from '@plateforme/core';
import ChoixSujets from '@/components/ChoixSujets';
import ApercuTheme, { type Appareil } from '@/components/ApercuTheme';
import SaisieGardee from '@/components/SaisieGardee';
import { garderLocalement, oublierLocalement } from '@/lib/brouillon-local';
import type { SoinCatalogue } from '@/lib/sites';
import type { ModeleDisponible } from '@/lib/modeles';
import type { EtatParcours, EtatPorte } from './actions';
import { EtapeCabinet, EtapeContenus, EtapeHoraires, EtapeSoinsImage, Verification, nomProposition } from './Etapes';
import { EtapeCouleursPreferees, EtapeVotreSite } from './EtapeSite';
import VerificationEssai from './VerificationEssai';
import PorteRendu from './PorteRendu';
import RenduPlein from './RenduPlein';

export type ActionEnregistrer = (id: string | null, draft: SiteDraft, version?: string | null) => Promise<EtatParcours>;
export type ActionChoisir = (id: string | null, draft: SiteDraft, version: string | null, universId: string, reglages?: Partial<ReglagesSite> & { proposition?: string | null; recette?: string | null }) => Promise<EtatParcours>;

type Props = {
  siteId: string | null;
  /** Étape d'arrivée imposée (/creer?etape=3 : « Changer de modèle » ou « Revoir les propositions » depuis /mon-site) */
  etapeInitiale?: number;
  version: string | null;
  initial: SiteDraft;
  catalogue: SoinCatalogue[];
  modeles: ModeleDisponible[];
  marquesImportees: MarqueImportee[];
  jeuPhotos: JeuPhotos | null;
  /** Univers du catalogue avec les statuts enregistrés par l'admin */
  univers: Univers[];
  /** Super admin qui prépare le site d'un client : nom du client */
  client?: string | null;
  admin: boolean;
  /** Formulaire complet (réglages avancés) */
  lienAvance: string;
  /** Thèmes différés activés par le drapeau admin (THEMES_ACTIVES) */
  themesActives: string[];
  /** Poids appris des notes de l'atelier (/admin/atelier), null tant qu'il n'y en a pas */
  poidsAtelier?: PoidsAtelier | null;
  /** Recettes du studio bien notées (recettes_lecture) : proposées en premier pour les sujets du praticien */
  recettes?: Recette[];
  actions: {
    sauvegarder: ActionEnregistrer;
    choisir: ActionChoisir;
    publier: ActionEnregistrer;
    progression?: (etape: number) => Promise<void>;
    /** Essai : porte du rendu (e-mail, téléphone, accord de recontact) */
    capturer?: (s: { email: string; telephone: string; recontact: boolean; conseils: boolean }) => Promise<EtatPorte>;
    /** Essai : CGU enregistrées après la conversion du compte anonyme */
    finaliser?: () => Promise<{ ok: boolean; message: string }>;
  };
  /**
   * Compte en essai gratuit : bandeau d'accompagnement, « Voir mon site » en aperçu privé (jamais la production).
   * Session anonyme (0025) : rendu dans le navigateur après la porte de capture, puis « Créez votre accès ».
   */
  essai?: {
    prenom: string; fin: string; joursRestants: number; suspendu: boolean;
    anonyme: boolean; rendu: boolean; mdpAChoisir: boolean; email: string; telephone: string;
  } | null;
  /** Arrivée sur l'écran final (/creer?etape=fin : retour du lien de confirmation de l'accès) */
  verifInitiale?: boolean;
  /** Message à afficher à l'arrivée (ex. accès non finalisé) */
  messageInitial?: string | null;
};

type Etat = { type: 'repos' | 'enCours' | 'ok' | 'erreur' | 'conflit'; message?: string };

/** Écran étroit (téléphone, tablette) : aperçu en mobile */
function useEtroit() {
  const [etroit, setEtroit] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const f = () => setEtroit(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return etroit;
}

export default function Parcours({ siteId, etapeInitiale, version, initial, catalogue, modeles, marquesImportees, jeuPhotos, univers, client, admin, lienAvance, themesActives, poidsAtelier = null, recettes = [], actions, essai = null, verifInitiale = false, messageInitial = null }: Props) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [id, setId] = useState(siteId);
  const proposes = useMemo(() => universDuParcours(univers), [univers]);
  const [etape, setEtape] = useState<number>(() => etapeInitiale ?? (siteId ? etapeDeReprise(initial) : 1));
  const [verif, setVerif] = useState(verifInitiale && Boolean(siteId));
  const [etat, setEtat] = useState<Etat>(messageInitial ? { type: 'erreur', message: messageInitial } : { type: 'repos' });
  // Session anonyme : porte de capture puis rendu plein écran calculé dans le navigateur (aucune construction)
  const [porte, setPorte] = useState(false);
  const [rendu, setRendu] = useState(false);
  const [contact, setContact] = useState(() => ({ rendu: Boolean(essai?.rendu), email: essai?.email ?? '', telephone: essai?.telephone ?? '' }));
  const [choixEnCours, setChoixEnCours] = useState<string | null>(null);
  const [publication, setPublication] = useState<{ ok: boolean; message: string } | null>(null);
  const etroit = useEtroit();

  // ---- Sauvegarde automatique (file d'attente : jamais deux enregistrements en même temps) ----
  const dRef = useRef(d);
  dRef.current = d;
  const idRef = useRef(id);
  const versionRef = useRef(version);
  const dernier = useRef(JSON.stringify(initial));
  const conflit = useRef(false);
  const file = useRef<Promise<unknown>>(Promise.resolve());
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executer = useCallback(async () => {
    const siteCourant = idRef.current;
    if (!siteCourant || conflit.current) return;
    const brouillon = dRef.current;
    const json = JSON.stringify(brouillon);
    if (json === dernier.current) return;
    setEtat({ type: 'enCours' });
    const r = await actions.sauvegarder(siteCourant, brouillon, versionRef.current);
    if (r.ok && r.version) {
      versionRef.current = r.version;
      dernier.current = json;
      oublierLocalement('parcours', siteCourant);
      setEtat({ type: 'ok', message: 'Brouillon enregistré' });
    } else if (r.conflit) {
      conflit.current = true;
      garderLocalement('parcours', siteCourant, brouillon);
      setEtat({ type: 'conflit', message: r.message });
    } else {
      setEtat({ type: 'erreur', message: r.message });
    }
  }, [actions]);

  const sauvegarder = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    file.current = file.current.then(executer).catch(() => setEtat({ type: 'erreur', message: 'Enregistrement impossible. Vérifiez la connexion.' }));
    return file.current;
  }, [executer]);

  useEffect(() => {
    if (!id) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(sauvegarder, 1200);
    return () => { if (minuteur.current) clearTimeout(minuteur.current); };
  }, [d, id, sauvegarder]);

  // Quitter la page avec une saisie pas encore enregistrée
  useEffect(() => {
    const avant = (e: BeforeUnloadEvent) => { if (JSON.stringify(dRef.current) !== dernier.current && idRef.current) e.preventDefault(); };
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, []);

  const maj = (patch: Partial<SiteDraft>) => setD((x) => ({ ...x, ...patch }));

  // ---- Navigation : focus sur le titre de l'étape à chaque changement ----
  const titre = useRef<HTMLHeadingElement>(null);
  const premier = useRef(true);
  const accesAttendu = Boolean(verif && essai?.anonyme && contact.rendu);
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    // « Garder mon site » ou « Reprendre » : le formulaire d'accès, en tête de l'écran, reçoit le focus
    const champ = accesAttendu ? document.getElementById('acces-email') : null;
    if (champ) {
      champ.focus({ preventScroll: true });
      champ.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    titre.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [etape, verif, accesAttendu]);
  // Essai : jalon atteint, pour la progression suivie par la conseillère (7 écrans ramenés sur la borne 0..7 de la
  // migration 0023 : jalonProgressionEssai, le SQL n'est pas modifié)
  const noterProgression = actions.progression;
  useEffect(() => {
    if (noterProgression) void noterProgression(jalonProgressionEssai(etape, verif)).catch(() => undefined);
  }, [etape, verif, noterProgression]);
  // Soins de base cochés d'office à l'étape 6 (bien visibles) : quitter l'étape les enregistre. Si le praticien a tout
  // décoché, rien n'est remis d'office (ni dans l'étape, ni dans le rendu).
  const [suggestion, setSuggestion] = useState<{ soins: string[]; enAvant: string[] } | null>(null);
  const [toutDecoche, setToutDecoche] = useState(false);
  const aller = (n: number) => {
    if (etape === 6 && n !== 6 && suggestion && dRef.current.soins.length === 0) {
      const s = suggestion;
      setD((x) => ({ ...x, soins: s.soins, theme: { ...x.theme, soinsEnAvant: s.enAvant } }));
      setSuggestion(null);
    }
    // Étape « Vos couleurs » quittée sans choix : « laissez-nous proposer » (étape vue, reprise au choix du site)
    if (etape === 2 && n !== 2 && dRef.current.couleursPreferees === undefined) setD((x) => ({ ...x, couleursPreferees: [] }));
    void sauvegarder();
    setVerif(false);
    setEtape(Math.max(1, Math.min(ETAPES_PARCOURS.length, n)));
  };

  // ---- Site choisi (structure + réglages de la proposition) ----
  const universCourant = proposes.find((u) => u.id === d.theme.univers);
  const modeleCourant = modeles.find((m) => m.id === d.theme.modele)?.manifeste ?? modeleIntegre(d.theme.modele);
  const modeleRendu = modeleDuSite(modeleCourant, d.theme);
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);

  /** Applique une structure (serveur : préréglage du modèle, identité gardée) puis les réglages donnés */
  const appliquer = async (universId: string, reglages: Partial<ReglagesSite> & { proposition?: string | null; recette?: string | null }, cle: string, message: string) => {
    setChoixEnCours(cle);
    if (minuteur.current) clearTimeout(minuteur.current);
    await file.current;
    const r = await actions.choisir(idRef.current, dRef.current, versionRef.current, universId, reglages);
    setChoixEnCours(null);
    if (!r.ok || !r.draft || !r.id) {
      if (r.conflit && idRef.current) { conflit.current = true; garderLocalement('parcours', idRef.current, dRef.current); }
      setEtat({ type: r.conflit ? 'conflit' : 'erreur', message: r.message });
      return false;
    }
    idRef.current = r.id;
    versionRef.current = r.version ?? null;
    dernier.current = JSON.stringify(r.draft);
    setId(r.id);
    setD(r.draft);
    setEtat({ type: 'ok', message });
    setVerif(false);
    return true;
  };

  const choisir = async (p: Proposition) => {
    if (d.theme.proposition === p.id) return aller(4);
    if (d.theme.univers && !confirm(`Passer au site « ${p.nom} » ? Vos informations sont gardées ; la présentation, les couleurs et les illustrations changent.`)) return;
    // Recette du studio : le serveur relit la recette (recettes_lecture) et pose tous ses réglages (polices, sections, effets…)
    const recette = 'recette' in p ? (p as PropositionRecette).recette.id : null;
    await appliquer(p.univers, { gamme: p.gamme, style: p.style, animation: p.animation, proposition: p.id, ...(recette ? { recette } : {}) }, p.id, `Site « ${p.nom} » choisi, brouillon enregistré`);
  };

  // « Ajuster » : autre structure, en gardant la gamme et le style (ramené au relevé s'il ne convient pas à la structure)
  const changerStructure = async (u: Structure) => {
    const style = styleDuTheme(d.theme);
    const ok = stylesCompatibles(u).includes(style) ? style : 'releve';
    await appliquer(u, { gamme: d.theme.gamme || undefined, style: ok, animation: animationPour(d, u, ok), proposition: d.theme.proposition ?? null }, `structure-${u}`, 'Structure changée, brouillon enregistré');
  };

  const publier = async () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    await file.current;
    setEtat({ type: 'enCours' });
    const r = await actions.publier(idRef.current, dRef.current, versionRef.current);
    if (r.version) { versionRef.current = r.version; dernier.current = JSON.stringify(dRef.current); }
    if (r.id) { idRef.current = r.id; setId(r.id); }
    if (r.conflit) { conflit.current = true; if (idRef.current) garderLocalement('parcours', idRef.current, dRef.current); }
    setEtat({ type: r.ok ? 'ok' : r.conflit ? 'conflit' : 'repos', message: r.ok ? 'Brouillon enregistré' : r.conflit ? r.message : undefined });
    setPublication({ ok: r.ok, message: r.message });
  };

  // « Voir le rendu de mon site » : brouillon enregistré, puis porte de capture (session anonyme sans coordonnées) ou rendu
  const voirRendu = () => {
    void sauvegarder();
    if (essai?.anonyme && !contact.rendu && actions.capturer) setPorte(true);
    else setRendu(true);
  };
  const renduPossible = renduDisponible({ modele: d.theme.univers ? d.theme.modele : '', nomPraticien: d.praticiens[0]?.nom, nomCabinet: d.cabinet.nom });
  // Sans ville, le rendu reste possible mais le titre du site n'a pas de lieu : on le dit à côté du bouton
  const sansVille = !(d.cabinet.ville || d.lieux[0]?.ville || '').trim();

  // Contrôles sur le brouillon tel qu'il sera enregistré (soins cochés d'office compris : jamais « Aucune compétence
  // choisie » quand des soins sont cochés à l'écran)
  const dEffectif = useMemo(() => (suggestion && !d.soins.length ? { ...d, soins: suggestion.soins } : d), [d, suggestion]);
  const controle = useMemo(() => controlerPublication(dEffectif), [dEffectif]);
  // Soins des sujets choisis (soin « pivot » de chaque sujet principal d'abord), sinon ceux du modèle : montrés en premier
  const suggestionsSoins = useMemo(() => {
    const l = soinsSuggeresParcours(d, universCourant, slugs);
    return [...new Set([...soinsEnAvantDesPriorites(d.priorites, l), ...l])];
  }, [d, universCourant, slugs]);
  // Seuls 3 ou 4 soins de base sont cochés d'office (aucun acte spécialisé)
  const soinsDeBase = useMemo(() => soinsDeBaseParcours(d, universCourant, slugs), [d, universCourant, slugs]);
  // Sujets modifiés après le choix du modèle : spécialités et soins en avant recalculés (mêmes règles que le serveur)
  const majPriorites = (p: Priorites) =>
    setD((x) => (x.theme.univers ? avecPrioritesParcours({ ...x, priorites: p }, { soinsConnus: slugs, themesActives }) : { ...x, priorites: p }));
  const infos = ETAPES_PARCOURS[etape - 1];
  const aide = aideEtape(etape);
  const pret = Boolean(universCourant);
  const nomSite = nomProposition(d) || universCourant?.nom || '';

  // Aperçu des étapes 3 à 7 et rendu : brouillon courant (l'étape 6 y ajoute les soins cochés d'office, visibles à
  // l'écran). Sans soin coché, l'aperçu applique le repli du site (soinsParDefaut, dans ApercuTheme) : rien d'autre.
  const draftApercu = !d.soins.length && suggestion ? { ...d, soins: suggestion.soins, theme: { ...d.theme, soinsEnAvant: suggestion.enAvant } } : d;
  const libelleApercu = `Aperçu du site « ${nomSite || modeleCourant.nom} »${d.theme.gamme ? '' : ', couleur personnalisée'}`;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6">
      <SaisieGardee<SiteDraft> espace="parcours" id={id} onReprendre={(x) => { conflit.current = false; setD(x); }} />
      {client && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Vous préparez le site de <strong>{client}</strong> (super admin). Rien n’est mis en ligne sans « Publier ».
        </p>
      )}

      {essai && <BandeauEssai essai={essai} etape={etape} verif={verif} sansVille={sansVille} onVoirRendu={essai.anonyme && renduPossible && !verif ? voirRendu : null} />}

      {/* Reprise après abandon : rendu déjà vu, accès pas encore créé → l'action attendue en tête */}
      {essai?.anonyme && contact.rendu && !verif && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-700/30 bg-white px-4 py-3">
          <p className="text-sm text-neutral-800">Vous avez vu le rendu de votre site : créez votre accès pour le garder.</p>
          <button type="button" onClick={() => { void sauvegarder(); setEtape(ETAPES_PARCOURS.length); setVerif(true); }} className="min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            Reprendre : créer mon accès
          </button>
        </div>
      )}

      <Progression etape={etape} pret={pret} onAller={aller} etat={etat} />

      <section aria-labelledby="titre-etape" className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="grid gap-2">
          <h1 id="titre-etape" ref={titre} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">
            {verif ? (essai?.anonyme && contact.rendu ? 'Créez votre accès pour garder votre site' : essai ? 'Voir mon site' : 'Vérifier et publier') : infos.titre}
          </h1>
          <p className="max-w-2xl text-base text-neutral-700">{verif && essai?.anonyme && contact.rendu ? 'Une adresse e-mail et un mot de passe : vous retrouvez votre site sur n’importe quel appareil. Rien n’est publié sur internet.' : verif && essai?.anonyme ? 'Relisez le récapitulatif et voyez le rendu de votre site, puis créez votre accès pour le garder. Rien n’est publié sur internet.' : verif && essai ?'Relisez le récapitulatif, puis générez votre version d’essai : un lien privé, non indexé, que vous pouvez partager. Rien n’est publié sur internet sans votre demande.' : verif ? 'Relisez le récapitulatif. Les informations manquantes ne bloquent pas la mise en ligne : le site affiche une mention sobre à la place, complétez-les quand vous voulez.' : infos.consigne}</p>
          {!verif && aide.length > 0 && (
            <details className="max-w-2xl rounded-xl bg-teal-50/70 px-4 py-3 text-sm text-teal-950">
              <summary className="cursor-pointer font-semibold">Conseil : {aide[0].titre}</summary>
              <dl className="mt-2 grid gap-2">
                {aide.map((p) => (
                  <div key={p.titre}>
                    <dt className="font-medium">{p.titre}</dt>
                    <dd className="text-teal-950/80">{p.conseil}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>

        {etape === 1 && !verif && (
          <div className="max-w-3xl">
            <ChoixSujets priorites={d.priorites} onChange={majPriorites} soins={d.soins} soinsConnus={slugs} themesActives={themesActives} masquerIndisponibles={!admin} />
          </div>
        )}

        {etape === 2 && !verif && <EtapeCouleursPreferees valeur={d.couleursPreferees} onChange={(v) => maj({ couleursPreferees: v })} />}

        {etape === 3 && !verif && (
          proposes.length ? (
            <EtapeVotreSite
              d={d}
              proposes={proposes}
              modeles={modeles}
              catalogue={catalogue}
              marquesImportees={marquesImportees}
              jeuPhotos={jeuPhotos}
              slugs={slugs}
              themesActives={themesActives}
              poids={poidsAtelier}
              recettes={recettes}
              etroit={etroit}
              choixEnCours={choixEnCours}
              onChoisir={choisir}
              onMaj={(x) => setD(x)}
              onStructure={changerStructure}
            />
          ) : <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Aucun modèle n’est disponible pour le moment. Contactez-nous.</p>
        )}

        {etape > 3 && !verif && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
              {etape === 4 && <EtapeCabinet d={d} controle={controle} maj={maj} lienAvance={lienAvance} />}
              {etape === 5 && <EtapeHoraires d={d} controle={controle} maj={maj} />}
              {etape === 6 && (
                <EtapeSoinsImage
                  d={d}
                  id={id}
                  catalogue={catalogue}
                  suggestions={suggestionsSoins}
                  preCoches={soinsDeBase}
                  proposer={!toutDecoche}
                  parDefaut={soinsParDefaut({ ...d.theme, priorites: d.priorites }, slugs)}
                  modele={modeleCourant}
                  marquesImportees={marquesImportees}
                  maj={maj}
                  onSuggestion={setSuggestion}
                  onToutDecoche={setToutDecoche}
                />
              )}
              {etape === 7 && <EtapeContenus d={d} univers={universCourant} maj={maj} />}
            </div>
            <div className="grid gap-2 lg:sticky lg:top-24">
              <p className="text-sm font-medium text-neutral-600" aria-live="polite">{libelleApercu}</p>
              <div role="region" aria-label="Aperçu du site">
                <ApercuTheme key={etroit ? 'mobile' : 'bureau'} appareil={etroit ? 'mobile' as Appareil : 'bureau'} draft={draftApercu} modele={modeleRendu} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={jeuPhotos} />
              </div>
            </div>
          </div>
        )}

        {verif && essai && (
          <VerificationEssai
            d={d}
            siteId={id}
            controle={controle}
            univers={universCourant}
            catalogue={catalogue}
            enCours={etat.type === 'enCours'}
            publication={publication}
            onModifier={aller}
            onPublier={publier}
            acces={{ anonyme: essai.anonyme, rendu: contact.rendu, mdpAChoisir: essai.mdpAChoisir, email: contact.email }}
            onVoirRendu={voirRendu}
            onFinaliser={actions.finaliser ?? (async () => ({ ok: true, message: '' }))}
            onAccesCree={() => router.refresh()}
          />
        )}

        {porte && actions.capturer && (
          <PorteRendu
            email={contact.email}
            telephone={contact.telephone || d.cabinet.telephone}
            onCapturer={actions.capturer}
            onFermer={() => setPorte(false)}
            onOk={(email, telephone) => {
              setContact({ rendu: true, email, telephone });
              // Téléphone du cabinet saisi à la porte : repris dans le site s'il n'y était pas
              if (telephone && !dRef.current.cabinet.telephone) setD((x) => ({ ...x, cabinet: { ...x.cabinet, telephone } }));
              setPorte(false);
              setRendu(true);
            }}
          />
        )}

        {rendu && (
          <RenduPlein
            draft={draftApercu}
            modele={modeleRendu}
            catalogue={catalogue}
            marquesImportees={marquesImportees}
            jeuPhotos={jeuPhotos}
            appareil={etroit ? 'mobile' : 'bureau'}
            acces={!essai?.anonyme}
            onFermer={() => setRendu(false)}
            onGarder={() => { setRendu(false); void sauvegarder(); setEtape(ETAPES_PARCOURS.length); setVerif(true); }}
          />
        )}

        {verif && !essai && (
          <Verification
            d={d}
            siteId={id}
            controle={controle}
            catalogue={catalogue}
            univers={universCourant}
            admin={admin}
            enCours={etat.type === 'enCours'}
            publication={publication}
            onModifier={aller}
            onPublier={publier}
            lienAvance={lienAvance}
          />
        )}
      </section>

      {<nav aria-label="Navigation entre les étapes" className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-black/5 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <button
          type="button"
          onClick={() => (verif ? setVerif(false) : aller(etape - 1))}
          disabled={etape === 1 && !verif}
          className="min-h-11 rounded-lg px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-teal-700 disabled:invisible"
        >
          ← Retour
        </button>
        {etape === 1 ? (
          <button type="button" onClick={() => aller(2)} className="min-h-11 rounded-lg bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            {d.priorites.principaux.length ? 'Continuer →' : 'Passer cette étape →'}
          </button>
        ) : etape === 2 ? (
          <button type="button" onClick={() => aller(3)} className="min-h-11 rounded-lg bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            {d.couleursPreferees?.length ? 'Voir les sites proposés →' : 'Laissez-nous proposer →'}
          </button>
        ) : etape === 3 ? (
          pret && (
            <button type="button" onClick={() => aller(4)} className="min-h-11 rounded-lg bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
              Continuer avec « {nomSite} » →
            </button>
          )
        ) : etape < ETAPES_PARCOURS.length ? (
          <button type="button" onClick={() => aller(etape + 1)} className="min-h-11 rounded-lg bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            Continuer →
          </button>
        ) : !verif ? (
          <button type="button" onClick={() => { void sauvegarder(); setVerif(true); }} className="min-h-11 rounded-lg bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            Vérifier mon site →
          </button>
        ) : essai?.anonyme ? null : (
          <Link href="/tableau-de-bord" className="min-h-11 content-center rounded-lg px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">
            Tableau de bord
          </Link>
        )}
      </nav>}
    </div>
  );
}

/** Bandeau de l'essai gratuit : ton encourageant, jours restants, rappel « privé tant que vous ne demandez pas » */
function BandeauEssai({ essai, etape, verif, sansVille, onVoirRendu }: { essai: NonNullable<Props['essai']>; etape: number; verif: boolean; sansVille: boolean; onVoirRendu: (() => void) | null }) {
  const encouragement = encouragementParcours(etape, verif, essai.prenom);
  return (
    <div className="grid gap-1 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-950 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <p className="font-medium">{encouragement}</p>
      {essai.anonyme ? (
        <p className="text-teal-900/80">Enregistré dans ce navigateur : créez votre accès à la fin pour retrouver votre site.</p>
      ) : (
        <p className="text-teal-900/80">Version d’essai gratuite jusqu’au {essai.fin} · votre site reste privé</p>
      )}
      {onVoirRendu && (
        <span className="grid justify-items-start gap-1 sm:shrink-0 sm:justify-items-end">
          <button type="button" onClick={onVoirRendu} aria-describedby={sansVille ? 'rendu-sans-ville' : undefined} className="min-h-11 rounded-lg border border-teal-800 bg-white px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50">
            Voir le rendu
          </button>
          {sansVille && <span id="rendu-sans-ville" className="text-xs text-amber-900">Ajoutez votre ville pour un rendu fidèle</span>}
        </span>
      )}
    </div>
  );
}

/** Barre de progression : 7 étapes, retour possible, état de la sauvegarde automatique */
function Progression({ etape, pret, onAller, etat }: { etape: number; pret: boolean; onAller: (n: number) => void; etat: Etat }) {
  const libelle = etat.type === 'enCours' ? 'Enregistrement…' : etat.type === 'ok' ? 'Brouillon enregistré' : etat.message ?? '';
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p className="font-semibold text-teal-900">Étape {etape} sur {ETAPES_PARCOURS.length}</p>
        <p role="status" className={etat.type === 'erreur' || etat.type === 'conflit' ? 'text-red-700' : 'text-neutral-500'}>{libelle}</p>
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Étapes de la création">
        {ETAPES_PARCOURS.map((e) => {
          const accessible = e.numero <= 3 || pret;
          const fait = e.numero < etape;
          return (
            <li key={e.numero}>
              <button
                type="button"
                disabled={!accessible}
                onClick={() => onAller(e.numero)}
                aria-current={e.numero === etape ? 'step' : undefined}
                aria-label={`Étape ${e.numero} : ${e.titre}${fait ? ' (faite)' : ''}`}
                className="group grid w-full gap-1.5 text-left focus-visible:outline-none disabled:cursor-not-allowed"
              >
                <span className={`h-2 rounded-full ${e.numero <= etape ? 'bg-teal-700' : 'bg-neutral-200'} group-focus-visible:ring-2 group-focus-visible:ring-teal-700 group-focus-visible:ring-offset-2`} />
                <span className={`hidden text-xs sm:block ${e.numero === etape ? 'font-semibold text-neutral-900' : 'text-neutral-500'}`}>{e.titre}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
