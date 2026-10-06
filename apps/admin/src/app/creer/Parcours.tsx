'use client';

// Parcours guidé de création du site : 6 étapes, une par écran, une recommandation par défaut à chaque étape.
// Le praticien dit d'abord ses SUJETS (3 principaux dans l'ordre, 3 traités aussi : menu, accueil, modèle recommandé),
// CHOISIT un modèle (3 sites prêts) puis AFFINE couleurs, cabinet, soins et image, contenus ; il vérifie
// puis publie. Sauvegarde automatique du brouillon (verrou optimiste : un enregistrement refusé garde la saisie dans ce
// navigateur). Fonctions pures dans packages/core/src/parcours.ts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  aideEtape,
  appliquerUniversParcours,
  controlerPublication,
  ETAPES_PARCOURS,
  etapeDeReprise,
  modeleDuSite,
  modeleIntegre,
  universDuParcours,
  universRecommande,
  type JeuPhotos,
  type MarqueImportee,
  type SiteDraft,
  type Univers,
  soinsSuggeresParcours,
  soinsEnAvantDesPriorites,
  avecPrioritesParcours,
  renduDisponible,
  type Priorites,
} from '@plateforme/core';
import ChoixSujets from '@/components/ChoixSujets';
import ApercuTheme, { type Appareil } from '@/components/ApercuTheme';
import SaisieGardee from '@/components/SaisieGardee';
import { garderLocalement, oublierLocalement } from '@/lib/brouillon-local';
import type { SoinCatalogue } from '@/lib/sites';
import type { ModeleDisponible } from '@/lib/modeles';
import type { EtatParcours, EtatPorte } from './actions';
import { EtapeCabinet, EtapeContenus, EtapeCouleurs, EtapeSoinsImage, Verification } from './Etapes';
import VerificationEssai from './VerificationEssai';
import PorteRendu from './PorteRendu';
import RenduPlein from './RenduPlein';

export type ActionEnregistrer = (id: string | null, draft: SiteDraft, version?: string | null) => Promise<EtatParcours>;
export type ActionChoisir = (id: string | null, draft: SiteDraft, version: string | null, universId: string) => Promise<EtatParcours>;

type Props = {
  siteId: string | null;
  /** Étape d'arrivée imposée (/creer?etape=2 : « Changer de modèle » depuis /mon-site) */
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

export default function Parcours({ siteId, etapeInitiale, version, initial, catalogue, modeles, marquesImportees, jeuPhotos, univers, client, admin, lienAvance, themesActives, actions, essai = null, verifInitiale = false, messageInitial = null }: Props) {
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
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    titre.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [etape, verif]);
  // Essai : étape atteinte (7 = vérification), pour la progression suivie par la conseillère
  const noterProgression = actions.progression;
  useEffect(() => {
    if (noterProgression) void noterProgression(verif ? 7 : etape).catch(() => undefined);
  }, [etape, verif, noterProgression]);
  // Soins suggérés (sujets, sinon modèle), affichés pré-cochés à l'étape 5 : « Continuer » vaut confirmation
  const [suggestion, setSuggestion] = useState<{ soins: string[]; enAvant: string[] } | null>(null);
  const aller = (n: number) => {
    if (etape === 5 && n > 5 && suggestion && dRef.current.soins.length === 0) {
      const s = suggestion;
      setD((x) => ({ ...x, soins: s.soins, theme: { ...x.theme, soinsEnAvant: s.enAvant } }));
      setSuggestion(null);
    }
    void sauvegarder();
    setVerif(false);
    setEtape(Math.max(1, Math.min(ETAPES_PARCOURS.length, n)));
  };

  // ---- Modèle choisi ----
  const universCourant = proposes.find((u) => u.id === d.theme.univers);
  const recommande = universRecommande(d, proposes);
  const modeleCourant = modeles.find((m) => m.id === d.theme.modele)?.manifeste ?? modeleIntegre(d.theme.modele);
  const modeleRendu = modeleDuSite(modeleCourant, d.theme);
  const manifestes = useMemo(() => modeles.map((m) => m.manifeste), [modeles]);
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);

  const choisir = async (u: Univers) => {
    if (d.theme.univers === u.id) return aller(3);
    if (d.theme.univers && !confirm(`Passer au site « ${u.nom} » ? Vos informations sont gardées ; les couleurs et le logo proposés changent.`)) return;
    setChoixEnCours(u.id);
    if (minuteur.current) clearTimeout(minuteur.current);
    await file.current;
    const r = await actions.choisir(idRef.current, dRef.current, versionRef.current, u.id);
    setChoixEnCours(null);
    if (!r.ok || !r.draft || !r.id) {
      if (r.conflit && idRef.current) { conflit.current = true; garderLocalement('parcours', idRef.current, dRef.current); }
      setEtat({ type: r.conflit ? 'conflit' : 'erreur', message: r.message });
      return;
    }
    idRef.current = r.id;
    versionRef.current = r.version ?? null;
    dernier.current = JSON.stringify(r.draft);
    setId(r.id);
    setD(r.draft);
    setEtat({ type: 'ok', message: 'Modèle appliqué, brouillon enregistré' });
    setVerif(false);
    setEtape(3);
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

  const controle = useMemo(() => controlerPublication(d), [d]);
  // Soins suggérés : ceux des sujets choisis (soin « pivot » de chaque sujet principal d'abord), sinon ceux du modèle
  const suggestionsSoins = useMemo(() => {
    const l = soinsSuggeresParcours(d, universCourant, slugs);
    return [...new Set([...soinsEnAvantDesPriorites(d.priorites, l), ...l])];
  }, [d, universCourant, slugs]);
  // Sujets modifiés après le choix du modèle : spécialités et soins en avant recalculés (mêmes règles que le serveur)
  const majPriorites = (p: Priorites) =>
    setD((x) => (x.theme.univers ? avecPrioritesParcours({ ...x, priorites: p }, { soinsConnus: slugs, themesActives }) : { ...x, priorites: p }));
  const infos = ETAPES_PARCOURS[etape - 1];
  const aide = aideEtape(etape);
  const pret = Boolean(universCourant);

  // Aperçu des étapes 3 à 6 : brouillon courant (l'étape 5 y injecte les soins suggérés à confirmer)
  // Sans soin confirmé, l'aperçu montre les soins suggérés par le modèle (jamais tout le catalogue)
  const suggeres = suggestionsSoins;
  const draftApercu = d.soins.length
    ? d
    : suggestion
      ? { ...d, soins: suggestion.soins, theme: { ...d.theme, soinsEnAvant: suggestion.enAvant } }
      : suggeres.length ? { ...d, soins: suggeres } : d;
  const libelleApercu = `Aperçu du site « ${universCourant?.nom ?? modeleCourant.nom} »${d.theme.gamme ? '' : ', couleur personnalisée'}`;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6">
      <SaisieGardee<SiteDraft> espace="parcours" id={id} onReprendre={(x) => { conflit.current = false; setD(x); }} />
      {client && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Vous préparez le site de <strong>{client}</strong> (super admin). Rien n’est mis en ligne sans « Publier ».
        </p>
      )}

      {essai && <BandeauEssai essai={essai} etape={etape} verif={verif} onVoirRendu={essai.anonyme && renduPossible && !verif ? voirRendu : null} />}

      <Progression etape={etape} pret={pret} onAller={aller} etat={etat} />

      <section aria-labelledby="titre-etape" className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="grid gap-2">
          <h1 id="titre-etape" ref={titre} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">
            {verif ? (essai ? 'Voir mon site' : 'Vérifier et publier') : infos.titre}
          </h1>
          <p className="max-w-2xl text-base text-neutral-700">{verif && essai?.anonyme ? 'Relisez le récapitulatif et voyez le rendu de votre site, puis créez votre accès pour le garder. Rien n’est publié sur internet.' : verif && essai ? 'Relisez le récapitulatif, puis générez votre version d’essai : un lien privé, non indexé, que vous pouvez partager. Rien n’est publié sur internet sans votre demande.' : verif ? 'Relisez le récapitulatif. Les informations manquantes ne bloquent pas la mise en ligne : le site affiche une mention sobre à la place, complétez-les quand vous voulez.' : infos.consigne}</p>
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
            <ChoixSujets priorites={d.priorites} onChange={majPriorites} soins={d.soins} soinsConnus={slugs} themesActives={themesActives} />
          </div>
        )}

        {etape === 2 && (
          <ChoixModeles
            proposes={proposes}
            d={d}
            recommande={recommande}
            choixEnCours={choixEnCours}
            onChoisir={choisir}
            apercu={(u) => {
              const r = appliquerUniversParcours(d, u, { modeles: manifestes, soinsConnus: slugs, themesActives });
              const soins = d.soins.length ? d.soins : soinsSuggeresParcours(d, u, slugs);
              const m = modeles.find((x) => x.id === r.draft.theme.modele)?.manifeste ?? modeleIntegre(r.draft.theme.modele);
              return { draft: { ...r.draft, soins }, modele: modeleDuSite(m, r.draft.theme) };
            }}
            catalogue={catalogue}
            marquesImportees={marquesImportees}
            jeuPhotos={jeuPhotos}
          />
        )}

        {etape > 2 && !verif && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
              {etape === 3 && <EtapeCouleurs d={d} modele={modeleCourant} univers={universCourant} onTheme={(theme) => maj({ theme })} />}
              {etape === 4 && <EtapeCabinet d={d} controle={controle} maj={maj} lienAvance={lienAvance} />}
              {etape === 5 && (
                <EtapeSoinsImage
                  d={d}
                  id={id}
                  catalogue={catalogue}
                  suggestions={suggestionsSoins}
                  modele={modeleCourant}
                  marquesImportees={marquesImportees}
                  maj={maj}
                  onSuggestion={setSuggestion}
                />
              )}
              {etape === 6 && <EtapeContenus d={d} univers={universCourant} maj={maj} />}
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
          pret && (
            <button type="button" onClick={() => aller(3)} className="min-h-11 rounded-lg bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
              Continuer avec « {universCourant!.nom} » →
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
function BandeauEssai({ essai, etape, verif, onVoirRendu }: { essai: NonNullable<Props['essai']>; etape: number; verif: boolean; onVoirRendu: (() => void) | null }) {
  const restantes = verif ? 0 : ETAPES_PARCOURS.length - etape + 1;
  const encouragement = verif
    ? 'Dernière étape : découvrez votre site.'
    : etape === 1
      ? `Bienvenue${essai.prenom ? ` ${essai.prenom}` : ''} : quelques questions courtes, environ 10 minutes. Tout est enregistré au fur et à mesure.`
      : restantes <= 2
        ? 'Presque terminé : encore une ou deux étapes.'
        : `Bien avancé : encore ${restantes} étapes.`;
  return (
    <div className="grid gap-1 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-950 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <p className="font-medium">{encouragement}</p>
      {essai.anonyme ? (
        <p className="text-teal-900/80">Enregistré dans ce navigateur : créez votre accès à la fin pour retrouver votre site.</p>
      ) : (
        <p className="text-teal-900/80">Version d’essai gratuite jusqu’au {essai.fin} · votre site reste privé</p>
      )}
      {onVoirRendu && (
        <button type="button" onClick={onVoirRendu} className="min-h-11 justify-self-start rounded-lg border border-teal-800 bg-white px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50 sm:shrink-0">
          Voir le rendu
        </button>
      )}
    </div>
  );
}

/** Barre de progression : 6 étapes, retour possible, état de la sauvegarde automatique */
function Progression({ etape, pret, onAller, etat }: { etape: number; pret: boolean; onAller: (n: number) => void; etat: Etat }) {
  const libelle = etat.type === 'enCours' ? 'Enregistrement…' : etat.type === 'ok' ? 'Brouillon enregistré' : etat.message ?? '';
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p className="font-semibold text-teal-900">Étape {etape} sur {ETAPES_PARCOURS.length}</p>
        <p role="status" className={etat.type === 'erreur' || etat.type === 'conflit' ? 'text-red-700' : 'text-neutral-500'}>{libelle}</p>
      </div>
      <ol className="grid grid-cols-6 gap-1.5" aria-label="Étapes de la création">
        {ETAPES_PARCOURS.map((e) => {
          const accessible = e.numero <= 2 || pret;
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

/** Étape 2 : les quatre sites en grandes cartes, avec vignettes réelles ordinateur et mobile */
function ChoixModeles({
  proposes, d, recommande, choixEnCours, onChoisir, apercu, catalogue, marquesImportees, jeuPhotos,
}: {
  proposes: Univers[];
  d: SiteDraft;
  recommande?: Univers;
  choixEnCours: string | null;
  onChoisir: (u: Univers) => void;
  apercu: (u: Univers) => { draft: SiteDraft; modele: ReturnType<typeof modeleDuSite> };
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  jeuPhotos: JeuPhotos | null;
}) {
  if (!proposes.length) return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Aucun modèle n’est disponible pour le moment. Contactez-nous.</p>;
  // Le site recommandé d'abord (mise en avant par défaut)
  const liste = recommande ? [recommande, ...proposes.filter((u) => u.id !== recommande.id)] : proposes;
  return (
    <>
    <p className="text-sm text-neutral-600">Chaque site est montré sur ordinateur et sur téléphone, avec vos informations.</p>
    <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
      {liste.map((u) => {
        const { draft, modele } = apercu(u);
        const estRecommande = u.id === recommande?.id;
        const actuel = d.theme.univers === u.id;
        return (
          <li key={u.id} className={`grid content-start gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${estRecommande ? 'border-teal-700 ring-2 ring-teal-700/20' : 'border-black/10'}`}>
            <div className="flex flex-wrap items-center gap-2">
              {estRecommande && <span className="rounded-full bg-teal-800 px-2.5 py-1 text-xs font-semibold text-white">Recommandé pour vous</span>}
              {actuel && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Votre choix actuel</span>}
            </div>
            <div>
              <h2 className="text-xl font-bold">{u.nom}</h2>
              <p className="mt-1 text-sm text-neutral-700"><span className="font-medium">Pour qui : </span>{u.pourQui}</p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_88px] items-start gap-3" aria-hidden="true">
              <div className="overflow-hidden rounded-lg ring-1 ring-black/10">
                <ApercuTheme vignette={190} appareil="bureau" draft={draft} modele={modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={jeuPhotos} />
              </div>
              <div className="overflow-hidden rounded-[14px] ring-4 ring-neutral-800">
                <ApercuTheme vignette={182} appareil="mobile" draft={draft} modele={modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={jeuPhotos} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChoisir(u)}
              disabled={choixEnCours !== null}
              aria-label={`Choisir le site « ${u.nom} »`}
              className={`min-h-12 rounded-xl px-5 text-base font-semibold focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:opacity-60 ${estRecommande || actuel ? 'bg-teal-800 text-white hover:bg-teal-900' : 'border border-teal-800 text-teal-900 hover:bg-teal-50'}`}
            >
              {choixEnCours === u.id ? 'Préparation du site…' : actuel ? 'Garder celui-là' : 'Celui-là'}
            </button>
          </li>
        );
      })}
    </ul>
    </>
  );
}
