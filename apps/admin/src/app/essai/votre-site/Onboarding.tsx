'use client';

// Parcours client (/essai/votre-site, demande de Paul du 2026-10-08) : profession → vos informations (préremplies depuis
// l'Annuaire Santé si le praticien le souhaite, il confirme tout) → vos sujets → vos activités (si sport) → vos couleurs →
// « Choisissez votre style » (J'aime / Pas pour moi) → « Voir mon site ». L'aperçu se construit en direct à chaque réponse ;
// « Votre site est prêt à N % ». Mobile d'abord, rapide (≈ 3 min), mouvements réduits respectés.
// Tout ce qui dépend du métier vient du registre (onboarding-professions.ts). Rien n'est publié ; la fiche de l'annuaire
// ne quitte pas ce navigateur tant que le praticien ne l'a pas confirmée (seuls les champs confirmés vont dans le site).
// Mode test (super admin) : bandeau, personas, saut d'étape, « Recommencer » ; aucune écriture côté serveur.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  activitePratique, activitesProposees, appliquerRecette, basculerActivite, deplacerActivite, lotsPropositions, modeleDuSite, modeleIntegre, pratiqueDe,
  propositionDeRecette, recettesPourPraticien, themeParId, universDuParcours, ACTIVITES_MAX,
  type MarqueImportee, type ModeleManifeste, type PratiqueProfession, type Proposition, type PropositionRecette, type PublicationRecette, type Recette, type SiteDraft,
  type Univers, type Priorites,
} from '@plateforme/core';
import {
  avancementOnboarding, brouillonOnboarding, diplomesConfirmes, etapesOnboarding, grilleDuTour, identiteVide, phraseAvancement, themesDuMetier,
  propositionRetenue, propositionSuivante, TOURS_STYLE_MAX, type AvisStyle, type ChoixClient, type EtapeOnboarding, type IdentiteConfirmee, type Verdict,
} from '@plateforme/core/onboarding';
import { anglesDesDiplomes, professionDuCodeRpps, professionParcours, professionsProposees, type ProfessionParcours } from '@plateforme/core/onboarding-professions';
import {
  diplomeEtatPresent, diplomesUniversitairesDe, ficheDemo, mentionSource, type FicheAnnuaire, type ResumeAnnuaire,
} from '@plateforme/core/annuaire-sante';
import ChoixSujets from '@/components/ChoixSujets';
import { MARQUE } from '@/lib/marque';
import ApercuTheme from '@/components/ApercuTheme';
import { apercuProposition } from '@/lib/apercu-proposition';
import type { SoinCatalogue } from '@/lib/sites';
import type { ModeleDisponible } from '@/lib/modeles';
import type { ResultatAnnuaire } from '@/lib/annuaire-sante';
import { EtapeCouleursPreferees } from '@/app/creer/EtapeSite';
import PorteRendu from '@/app/creer/PorteRendu';
import type { EtatPorte } from '@/app/creer/actions';
import ChoixStyle, { type CandidatPropose } from './ChoixStyle';
import { ETAPES_SAUT_TEST, PERSONAS_TEST } from './personas';
import type { EtatCreation } from './actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const champ = 'h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';
const btnPrincipal = `min-h-12 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white hover:bg-teal-900 disabled:opacity-50 ${focus}`;
const btnSecondaire = `min-h-12 rounded-xl border border-teal-800 bg-white px-4 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50 ${focus}`;

const TITRES: Record<EtapeOnboarding, { titre: string; consigne: string }> = {
  profession: { titre: 'Votre profession', consigne: 'Votre site est préparé pour votre métier : textes, sujets et illustrations.' },
  identite: { titre: 'Vos informations', consigne: 'Elles apparaissent sur votre site. Vérifiez-les : vous gardez la main sur chaque ligne.' },
  sujets: { titre: 'Vos sujets', consigne: 'Jusqu’à 3 sujets principaux, dans l’ordre : ils structurent l’accueil et le menu.' },
  activites: { titre: 'Les activités que vous suivez', consigne: `Jusqu’à ${ACTIVITES_MAX}, dans l’ordre : elles sont citées sur votre site et orientent ses illustrations.` },
  couleurs: { titre: 'Vos couleurs', consigne: 'Jusqu’à 3 couleurs que vous aimez. Nous vérifions qu’elles restent lisibles.' },
  style: { titre: 'Choisissez votre style', consigne: 'Voici votre site sous plusieurs formes. Dites ce qui vous plaît : les propositions suivantes en tiennent compte.' },
  rendu: { titre: 'Votre site', consigne: '' },
};

type Etat = {
  v: 1;
  etape: EtapeOnboarding;
  faites: EtapeOnboarding[];
  profession: string | null;
  identite: IdentiteConfirmee;
  /** Lieu d'exercice retenu parmi ceux de la fiche */
  priorites: Priorites;
  /** Sujets proposés d'après un DU réel de l'annuaire (à confirmer), déjà appliqués une fois */
  angles: string[];
  anglesAppliques: boolean;
  activites: string[];
  couleurs: string[] | undefined;
  avis: AvisStyle;
  journal: { id: string; verdict: Verdict; tour: number }[];
  tour: number;
  grilles: string[][];
  retenue: string | null;
  contact: boolean;
  siteId: string | null;
  version: string | null;
};

const etatVide = (): Etat => ({
  v: 1, etape: 'profession', faites: [], profession: null, identite: identiteVide(), priorites: { principaux: [], secondaires: [] }, angles: [], anglesAppliques: false,
  activites: [], couleurs: undefined, avis: {}, journal: [], tour: 0, grilles: [], retenue: null, contact: false, siteId: null, version: null,
});

const CLE = (test: boolean) => (test ? 'onboarding-test:v1' : 'onboarding:v1');
function lireLocal(test: boolean): Etat | null {
  try {
    const x = JSON.parse(window.localStorage.getItem(CLE(test)) ?? 'null') as Etat | null;
    return x && x.v === 1 ? { ...etatVide(), ...x } : null;
  } catch { return null; }
}
function ecrireLocal(test: boolean, e: Etat) {
  try { window.localStorage.setItem(CLE(test), JSON.stringify(e)); } catch { /* stockage indisponible : le parcours continue */ }
}
export function effacerLocal() {
  try { window.localStorage.removeItem(CLE(true)); } catch { /* rien */ }
}

/** Identité depuis une fiche de l'annuaire (premier lieu, libéral d'abord) : le praticien corrige ensuite */
function identiteDepuisFiche(f: FicheAnnuaire, codesDE: readonly string[], lieu = 0): IdentiteConfirmee {
  const l = f.lieux[lieu] ?? f.lieux[0];
  return {
    ...identiteVide(),
    prenom: f.prenom, nom: f.nom, nomCabinet: l?.nom ?? '', adresse: l?.adresse ?? '', codePostal: l?.codePostal ?? '', ville: l?.ville ?? '', telephone: l?.telephone ?? '',
    rpps: f.source === 'annuaire' ? f.rpps : '',
    diplomeEtat: diplomeEtatPresent(f, codesDE),
    // DU : jamais coché d'office ; le praticien coche ceux qu'il veut afficher
    diplomesUniversitaires: [],
    source: f.source === 'annuaire' ? 'annuaire' : 'demonstration',
  };
}

const pratiqueDuMetier = (p: ProfessionParcours | undefined): PratiqueProfession | undefined => (p?.disponible ? pratiqueDe(p.id) : undefined);
const anglesDe = (f: FicheAnnuaire, p: ProfessionParcours | undefined) => anglesDesDiplomes(diplomesUniversitairesDe(f), p, themesDuMetier(pratiqueDuMetier(p)));
const libellesActivites = (ids: readonly string[], pratique: PratiqueProfession | undefined) =>
  pratique ? ids.map((id) => activitePratique(pratique, id)?.libelle).filter((x): x is string => Boolean(x)) : [];

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
const mouvementReduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = {
  /** Site déjà commencé (choisi) et aucun parcours en cours dans ce navigateur : suite dans /creer */
  siteCommence: boolean;
  test: { persona: string; etape: string; neuf: boolean } | null;
  annuaire: 'actif' | 'indisponible' | 'demonstration';
  catalogue: SoinCatalogue[];
  modeles: ModeleDisponible[];
  marquesImportees: MarqueImportee[];
  univers: Univers[];
  recettes: Recette[];
  /** Recettes publiées pour les profils de pratique (migration 0043) et leurs publications ; vides sans la migration */
  publiees: { recettes: Recette[]; publications: PublicationRecette[] };
  defautsMobile: string[];
  themesActives: string[];
  actions: {
    chercher: (d: { rpps?: string; nom?: string; ville?: string; id?: string; profession?: string }) => Promise<ResultatAnnuaire>;
    enregistrer: (draft: SiteDraft, universId: string, reglages: { gamme?: string; style?: Proposition['style']; animation?: Proposition['animation']; proposition?: string | null; recette?: string | null }, siteId: string | null, version: string | null) => Promise<EtatCreation>;
    capturer: (s: { email: string; telephone: string; recontact: boolean; conseils: boolean }) => Promise<EtatPorte>;
    listeAttente: (s: { profession: string; email: string; prenom: string; nom: string; ville: string; recontact: boolean }) => Promise<{ ok: boolean; message: string }>;
  };
};

export default function Onboarding({ siteCommence, test, annuaire, catalogue, modeles, marquesImportees, univers, recettes, publiees, defautsMobile, themesActives, actions }: Props) {
  const router = useRouter();
  const etroit = useEtroit();
  const [e, setE] = useState<Etat>(etatVide);
  const [pret, setPret] = useState(false);
  // Fiche de l'annuaire : en mémoire seulement (jamais enregistrée telle quelle)
  const [fiche, setFiche] = useState<FicheAnnuaire | null>(null);
  const [construction, setConstruction] = useState(false);
  const [porte, setPorte] = useState(false);
  const [rendu, setRendu] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const proposes = useMemo(() => universDuParcours(univers), [univers]);
  const slugs = useMemo(() => catalogue.map((c) => c.slug), [catalogue]);
  const maj = useCallback((patch: Partial<Etat>) => setE((x) => ({ ...x, ...patch })), []);

  // ---- Démarrage : état gardé dans ce navigateur, ou persona du mode test ----
  const demarre = useRef(false);
  useEffect(() => {
    if (demarre.current) return;
    demarre.current = true;
    const garde = test?.neuf ? null : lireLocal(Boolean(test));
    if (garde) { setE(garde); setPret(true); return; }
    if (siteCommence && !test) { router.replace('/creer'); return; }
    if (test) {
      const persona = PERSONAS_TEST.find((p) => p.id === test.persona) ?? PERSONAS_TEST[0];
      const p = professionParcours('podologue')!;
      const f = persona.fiche ? ficheDemo(persona.fiche) : null;
      setFiche(f);
      const base: Etat = { ...etatVide(), profession: 'podologue', identite: f ? { ...identiteDepuisFiche(f, p.codesDiplomeEtat), diplomesUniversitaires: diplomesUniversitairesDe(f) } : identiteVide(), angles: f ? anglesDe(f, p) : [] };
      const saut = ETAPES_SAUT_TEST.find((x) => x.id === test.etape)?.id;
      if (saut && persona.id !== 'vierge') {
        const remplie: Etat = { ...base, priorites: persona.sujets, anglesAppliques: true, activites: persona.activites, couleurs: persona.couleurs };
        const etapes = etapesOnboarding(pratiqueDuMetier(p), remplie.priorites);
        const cible = etapes.includes(saut) ? saut : 'couleurs';
        setE({ ...remplie, etape: cible, faites: etapes.slice(0, etapes.indexOf(cible)) });
      } else {
        setE({ ...base, etape: persona.id === 'vierge' ? 'profession' : 'identite', faites: persona.id === 'vierge' ? [] : ['profession'] });
      }
    }
    setPret(true);
    if (test?.neuf) window.history.replaceState(null, '', window.location.pathname + window.location.search.replace(/([?&])neuf=1&?/, '$1').replace(/[?&]$/, ''));
  }, [test, siteCommence, router]);
  useEffect(() => { if (pret) ecrireLocal(Boolean(test), e); }, [e, pret, test]);

  const profession = professionParcours(e.profession);
  const pratique = pratiqueDuMetier(profession);
  const etapes = useMemo(() => etapesOnboarding(pratique, e.priorites), [pratique, e.priorites]);
  const pourcent = avancementOnboarding(rendu ? [...e.faites, 'rendu'] : e.faites, etapes);

  // ---- Brouillon et propositions (recalculés à chaque réponse : l'aperçu se construit en direct) ----
  const base = useMemo(() => (profession && pratique ? brouillonOnboarding({ profession: profession.id, identite: e.identite, priorites: e.priorites, activites: e.activites, couleurs: e.couleurs }, profession, pratique) : null), [profession, pratique, e.identite, e.priorites, e.activites, e.couleurs]);
  const disponibles = useMemo(() => new Set(proposes.map((u) => u.id)), [proposes]);
  const pool = useMemo<CandidatPropose[]>(() => {
    if (!base) return [];
    // Recettes PUBLIÉES pour les profils de pratique les plus proches (badge « Conçu pour … »), puis les recettes bien notées
    // du même scénario (publication-recettes.ts : recettesPourPraticien), puis le générateur
    const toutes = [...publiees.recettes, ...recettes.filter((r) => !publiees.recettes.some((x) => x.id === r.id))];
    const ordre = recettesPourPraticien({
      reponses: { profession: e.profession, principaux: base.priorites.principaux, secondaires: base.priorites.secondaires, activites: base.praticiens[0]?.sports ?? [] },
      recettes: toutes, publications: publiees.publications,
      scenario: { principaux: base.priorites.principaux, secondaires: base.priorites.secondaires, couleurs: base.couleursPreferees ?? [], soins: [] },
      defautsMobile: new Set(defautsMobile), min: 4,
    }).slice(0, 8);
    const badges = new Map(ordre.map((x) => [`recette~${x.recette.id}`, x.badge]));
    const duStudio = ordre.map((x) => propositionDeRecette(x.recette));
    const lots = lotsPropositions({ priorites: base.priorites, couleursPreferees: base.couleursPreferees ?? [] }, 4).flat();
    const vus = new Set<string>();
    return [...duStudio, ...lots]
      .filter((p) => disponibles.has(p.univers) && !vus.has(p.id) && vus.add(p.id))
      .map((p) => ({ id: p.id, univers: p.univers, style: p.style, gamme: p.gamme, famille: p.famille, police: 'recette' in p ? (p as PropositionRecette).recette.composition.police ?? null : null, proposition: p, badge: badges.get(p.id) ?? null }));
  }, [base, recettes, publiees, defautsMobile, disponibles, e.profession]);
  const apercuDe = useCallback((p: Proposition): { draft: SiteDraft; modele: ModeleManifeste } | null => {
    if (!base) return null;
    const x = 'recette' in p
      ? appliquerRecette(base, (p as PropositionRecette).recette.composition, { id: (p as PropositionRecette).recette.id, proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: slugs, themesActives })
      : apercuProposition(base, p, { proposes, modeles, slugs, themesActives });
    if (!x) return null;
    return { draft: x.draft, modele: x.modele ?? modeleDuSite(modeles.find((m) => m.id === x.draft.theme.modele)?.manifeste ?? modeleIntegre(x.draft.theme.modele), x.draft.theme) };
  }, [base, proposes, modeles, slugs, themesActives]);
  const retenue = pool.find((c) => c.id === e.retenue) ?? propositionRetenue(pool, e.avis) ?? pool[0];
  const vignette = (p: Proposition, hauteur: number, mobile: boolean) => {
    const x = apercuDe(p);
    return x ? <ApercuTheme vignette={hauteur} appareil={mobile ? 'mobile' : 'bureau'} draft={x.draft} modele={x.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} /> : <div style={{ height: hauteur }} className="bg-neutral-100" />;
  };

  // ---- Grille du tour : figée à l'ouverture ----
  const grilleIds = e.grilles[e.tour];
  useEffect(() => {
    if (e.etape !== 'style' || grilleIds || !pool.length) return;
    const vus = new Set(e.grilles.flat());
    const g = grilleDuTour(pool, e.avis, e.tour, vus).map((c) => c.id);
    setE((x) => { const grilles = [...x.grilles]; grilles[x.tour] = g; return { ...x, grilles }; });
  }, [e.etape, e.tour, grilleIds, pool, e.avis, e.grilles]);
  const grille = (grilleIds ?? []).map((id) => pool.find((c) => c.id === id)).filter((c): c is CandidatPropose => Boolean(c));
  const dernierTour = e.tour >= TOURS_STYLE_MAX - 1 || grilleDuTour(pool, e.avis, e.tour + 1, new Set([...e.grilles.flat()])).length === 0;

  // ---- Navigation ----
  const titre = useRef<HTMLHeadingElement>(null);
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    titre.current?.focus();
    window.scrollTo({ top: 0, behavior: mouvementReduit() ? 'auto' : 'smooth' });
  }, [e.etape]);
  const aller = (cible: EtapeOnboarding) => {
    setMessage(null);
    setE((x) => {
      const i = etapes.indexOf(x.etape), j = etapes.indexOf(cible);
      const faites = j > i && !x.faites.includes(x.etape) ? [...x.faites, x.etape] : x.faites;
      // Sujets : DU réel de l'annuaire → sujet pré-coché une fois (le praticien confirme ou retire)
      if (cible === 'sujets' && !x.anglesAppliques && x.angles.length && !x.priorites.principaux.length) {
        return { ...x, faites, etape: cible, anglesAppliques: true, priorites: { principaux: x.angles.slice(0, 3), secondaires: [] } };
      }
      return { ...x, faites, etape: cible };
    });
  };
  const suivante = etapes[etapes.indexOf(e.etape) + 1];
  const precedente = etapes[etapes.indexOf(e.etape) - 1];

  // ---- « Voir mon site » : construction, enregistrement (sauf test), porte de l'e-mail, rendu ----
  const choixClient = (r: string | null): ChoixClient => ({
    version: 1, le: new Date().toISOString(), profession: e.profession ?? '', source: e.identite.source === 'annuaire' ? 'annuaire' : 'saisie',
    avis: e.journal, retenue: r, activites: e.activites, couleurs: e.couleurs ?? [],
  });
  const enregistrer = async (c: CandidatPropose) => {
    if (!base) return { ok: false, message: 'Profession à choisir.' } as EtatCreation;
    const p = c.proposition;
    const recette = 'recette' in p ? (p as PropositionRecette).recette.id : null;
    const r = await actions.enregistrer({ ...base, choixClient: choixClient(c.id) }, p.univers, { gamme: p.gamme, style: p.style, animation: p.animation, proposition: p.id, ...(recette ? { recette } : {}) }, e.siteId, e.version)
      .catch(() => ({ ok: false, message: 'Enregistrement impossible. Vérifiez la connexion.' }) as EtatCreation);
    if (r.ok && r.id) maj({ siteId: r.id, version: r.version ?? null });
    return r;
  };
  const voirMonSite = async () => {
    if (!retenue) return;
    maj({ retenue: retenue.id, faites: [...new Set([...e.faites, 'style' as const])] });
    setConstruction(true);
    const attente = new Promise((r) => setTimeout(r, mouvementReduit() ? 0 : 1800));
    const r = await enregistrer(retenue);
    await attente;
    setConstruction(false);
    if (!r.ok) { setMessage(r.message); return; }
    if (!e.contact) setPorte(true);
    else setRendu(true);
  };
  const autreProposition = () => {
    const s = propositionSuivante(pool, e.avis, retenue?.id ?? null);
    if (!s) return;
    maj({ retenue: s.id });
    // Site enregistré (hors test) : la nouvelle proposition y est appliquée, en arrière-plan
    if (!test && e.siteId) void enregistrer(s);
  };

  if (!pret) return <main className="min-h-screen bg-neutral-50" aria-busy="true" />;

  const infos = TITRES[e.etape];
  const apercuDirect = e.etape !== 'profession' && retenue ? apercuDe(retenue.proposition) : null;

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 sm:pb-8">
      {test && <BandeauTest persona={test.persona} />}
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto grid max-w-6xl gap-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/essai" className={`font-bold text-teal-900 ${focus}`}>{MARQUE.nom}</Link>
            <p className="text-sm font-semibold text-teal-900" aria-live="polite">{phraseAvancement(pourcent)}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-label="Avancement de votre site" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pourcent}>
            <div className="h-full rounded-full bg-teal-700 motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${Math.max(4, pourcent)}%` }} />
          </div>
        </div>
      </header>

      <main className={`mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:items-start ${e.etape === 'style' ? '' : 'lg:grid-cols-[minmax(0,1fr)_300px]'}`}>
        <section aria-labelledby="titre-onboarding" className="grid min-w-0 content-start gap-4">
          <div className="grid gap-1.5">
            <p className="text-sm text-neutral-600">Étape {etapes.indexOf(e.etape) + 1} sur {etapes.length - 1}</p>
            <h1 id="titre-onboarding" ref={titre} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">{infos.titre}</h1>
            {infos.consigne && <p className="max-w-2xl text-neutral-700">{infos.consigne}</p>}
          </div>
          {message && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{message}</p>}

          {/* Aperçu en direct, téléphone : bandeau compact au-dessus de l'étape */}
          {etroit && apercuDirect && e.etape !== 'style' && (
            <ApercuCompact>
              <ApercuTheme vignette={150} appareil="mobile" draft={apercuDirect.draft} modele={apercuDirect.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />
            </ApercuCompact>
          )}

          {e.etape === 'profession' && (
            <EtapeProfession
              valeur={e.profession}
              annuaire={annuaire}
              chercher={actions.chercher}
              listeAttente={actions.listeAttente}
              identite={e.identite}
              onChoisir={(id) => maj({ profession: id })}
              onFiche={(f) => {
                const p = professionDuCodeRpps(f.professionCode);
                setFiche(f);
                const prof = p ?? professionParcours(e.profession);
                setE((x) => ({ ...x, profession: prof?.id ?? x.profession, identite: identiteDepuisFiche(f, prof?.codesDiplomeEtat ?? []), angles: anglesDe(f, prof) }));
                if (prof?.disponible) aller('identite');
              }}
            />
          )}
          {e.etape === 'identite' && profession && (
            <EtapeIdentite
              identite={e.identite}
              fiche={fiche}
              profession={profession}
              annuaire={annuaire}
              chercher={actions.chercher}
              onFiche={(f) => { setFiche(f); maj({ identite: identiteDepuisFiche(f, profession.codesDiplomeEtat), angles: anglesDe(f, profession) }); }}
              onChange={(identite) => maj({ identite })}
            />
          )}
          {e.etape === 'sujets' && (
            <div className="grid gap-3">
              {e.angles.length > 0 && e.anglesAppliques && (
                <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-950">
                  Proposé d’après votre diplôme inscrit dans l’annuaire : <strong>{e.angles.map((s) => themeParId(s)?.court).join(', ')}</strong>. Confirmez ou modifiez.
                </p>
              )}
              <ChoixSujets priorites={e.priorites} onChange={(priorites) => maj({ priorites })} soins={[]} soinsConnus={slugs} themesActives={themesActives} masquerIndisponibles />
            </div>
          )}
          {e.etape === 'activites' && pratique && <EtapeActivites valeur={e.activites} pratique={pratique} themes={[...e.priorites.principaux, ...e.priorites.secondaires]} onChange={(activites) => maj({ activites })} />}
          {e.etape === 'couleurs' && <EtapeCouleursPreferees valeur={e.couleurs} onChange={(couleurs) => maj({ couleurs })} />}
          {e.etape === 'style' && (
            grille.length ? (
              <ChoixStyle
                grille={grille}
                avis={e.avis}
                tour={e.tour}
                dernierTour={dernierTour}
                etroit={etroit}
                apercu={vignette}
                onAvis={(id, verdict, tour) => setE((x) => ({ ...x, avis: { ...x.avis, [id]: verdict }, journal: [...x.journal.filter((a) => a.id !== id), { id, verdict, tour }] }))}
                onTourSuivant={() => maj({ tour: Math.min(TOURS_STYLE_MAX - 1, e.tour + 1) })}
                onTerminer={() => void voirMonSite()}
              />
            ) : <p className="text-sm text-neutral-600" role="status">Préparation des propositions…</p>
          )}
          {e.etape === 'style' && <p className="text-xs text-neutral-500">Vos choix servent à préparer votre site et à améliorer les propositions faites aux praticiens. Rien n’est publié.</p>}
        </section>

        {/* Aperçu en direct, ordinateur : colonne de droite */}
        {!etroit && e.etape !== 'style' && (
          <aside className="sticky top-4 hidden gap-2 lg:grid" aria-label="Aperçu de votre site">
            <p className="text-sm font-medium text-neutral-600">Votre site, en direct</p>
            <div className="mx-auto w-[260px] overflow-hidden rounded-[22px] ring-4 ring-neutral-800">
              {apercuDirect
                ? <ApercuTheme vignette={540} appareil="mobile" draft={apercuDirect.draft} modele={apercuDirect.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />
                : <div className="grid h-[540px] place-items-center bg-white p-6 text-center text-sm text-neutral-500">Votre site apparaît ici dès vos premières réponses.</div>}
            </div>
          </aside>
        )}
      </main>

      {/* Barre d'étapes */}
      {e.etape !== 'style' && (
        <nav aria-label="Navigation entre les étapes" className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/95 backdrop-blur sm:static sm:mx-auto sm:max-w-6xl sm:border-0 sm:bg-transparent sm:px-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-0">
            <button type="button" onClick={() => precedente && aller(precedente)} disabled={!precedente} className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:invisible ${focus}`}>← Retour</button>
            {suivante && (
              <button
                type="button"
                className={btnPrincipal}
                disabled={!peutContinuer(e, profession)}
                onClick={() => aller(suivante)}
              >
                {libelleSuivant(e)}
              </button>
            )}
          </div>
        </nav>
      )}
      {e.etape === 'style' && precedente && (
        <div className="mx-auto max-w-6xl px-4">
          <button type="button" onClick={() => aller(precedente)} className={`min-h-11 rounded-lg px-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 ${focus}`}>← Retour aux couleurs</button>
        </div>
      )}

      {construction && <Construction identite={e.identite} activites={libellesActivites(e.activites, pratique)} />}

      {porte && (
        <PorteRendu
          email=""
          telephone={e.identite.telephone}
          onCapturer={actions.capturer}
          onFermer={() => setPorte(false)}
          onOk={() => { setPorte(false); maj({ contact: true }); setRendu(true); }}
        />
      )}

      {rendu && retenue && (() => {
        const x = apercuDe(retenue.proposition);
        return x ? (
          <RenduClient
            draft={x.draft}
            modele={x.modele}
            nom={retenue.proposition.nom}
            catalogue={catalogue}
            marquesImportees={marquesImportees}
            appareil={etroit ? 'mobile' : 'bureau'}
            autres={pool.filter((c) => e.avis[c.id] !== 'non').length > 1}
            test={Boolean(test)}
            onAutre={autreProposition}
            onFermer={() => setRendu(false)}
            onContinuer={() => { if (!test) router.push('/creer'); else setMessage('Mode test : la suite du parcours (/creer) n’est pas ouverte, aucun site n’a été créé.'); setRendu(false); }}
          />
        ) : null;
      })()}
    </div>
  );
}

function peutContinuer(e: Etat, p: ReturnType<typeof professionParcours>): boolean {
  if (e.etape === 'profession') return Boolean(p?.disponible);
  if (e.etape === 'identite') return Boolean(e.identite.nom.trim() || e.identite.nomCabinet.trim());
  return true;
}
function libelleSuivant(e: Etat): string {
  if (e.etape === 'sujets') return e.priorites.principaux.length ? 'Continuer →' : 'Passer cette étape →';
  if (e.etape === 'activites') return e.activites.length ? 'Continuer →' : 'Passer cette étape →';
  if (e.etape === 'couleurs') return e.couleurs?.length ? 'Choisir mon style →' : 'Laissez-nous proposer →';
  return 'Continuer →';
}

// ---------------------------------------------------------------------------------------------------------------------

function ApercuCompact({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(true);
  return (
    <div className="grid gap-2 rounded-2xl border border-black/5 bg-white p-2">
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} className={`flex min-h-10 items-center justify-between rounded-lg px-2 text-sm font-medium text-neutral-700 ${focus}`}>
        Votre site, en direct <span aria-hidden="true">{ouvert ? '▴' : '▾'}</span>
      </button>
      {ouvert && <div aria-hidden="true" className="mx-auto w-[150px] overflow-hidden rounded-[14px] ring-[3px] ring-neutral-800">{children}</div>}
    </div>
  );
}

function BandeauTest({ persona }: { persona: string }) {
  const recommencer = (p = persona, etape = '') => { effacerLocal(); window.location.href = `/admin/tester-parcours?persona=${encodeURIComponent(p)}${etape ? `&etape=${etape}` : ''}`; };
  return (
    <div className="border-b border-amber-300 bg-amber-50 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <p className="font-semibold">Mode test : rien n’est envoyé ni publié</p>
        <label className="flex items-center gap-1.5">Persona
          <select className="min-h-9 rounded-md border border-amber-400 bg-white px-2" value={persona} onChange={(ev) => recommencer(ev.target.value)}>
            {PERSONAS_TEST.map((p) => <option key={p.id} value={p.id}>{p.titre}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5">Aller à
          <select className="min-h-9 rounded-md border border-amber-400 bg-white px-2" defaultValue="" onChange={(ev) => ev.target.value && recommencer(persona === 'vierge' ? 'sport-basket' : persona, ev.target.value)}>
            <option value="">une étape…</option>
            {ETAPES_SAUT_TEST.map((x) => <option key={x.id} value={x.id}>{x.titre}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => recommencer()} className={`min-h-9 rounded-md border border-amber-400 bg-white px-3 font-semibold ${focus}`}>Recommencer</button>
        <a href="/admin" className="ml-auto min-h-9 content-center font-semibold underline underline-offset-2">Retour à l’admin</a>
      </div>
    </div>
  );
}

function EtapeProfession({ valeur, annuaire, chercher, listeAttente, identite, onChoisir, onFiche }: {
  valeur: string | null;
  annuaire: Props['annuaire'];
  chercher: Props['actions']['chercher'];
  listeAttente: Props['actions']['listeAttente'];
  identite: IdentiteConfirmee;
  onChoisir: (id: string) => void;
  onFiche: (f: FicheAnnuaire) => void;
}) {
  const [rpps, setRpps] = useState('');
  const [etat, setEtat] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const choisie = professionParcours(valeur);
  const rechercher = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setEnCours(true);
    setEtat(null);
    const r = await chercher({ rpps }).catch(() => ({ etat: 'erreur' }) as ResultatAnnuaire);
    setEnCours(false);
    if (r.etat === 'fiche') {
      const p = professionDuCodeRpps(r.fiche.professionCode);
      if (!p) setEtat('Fiche trouvée, mais cette profession n’est pas encore proposée. Choisissez-la ci-dessous si elle y figure.');
      onFiche(r.fiche);
    } else setEtat(messageAnnuaire(r));
  };
  return (
    <div className="grid max-w-3xl gap-5">
      {annuaire !== 'indisponible' ? (
        <form onSubmit={rechercher} className="grid gap-2 rounded-2xl border border-black/10 bg-white p-4">
          <label htmlFor="rpps" className="font-semibold">Votre n° RPPS <span className="font-normal text-neutral-600">(facultatif, pour préremplir)</span></label>
          <div className="flex gap-2">
            <input id="rpps" inputMode="numeric" autoComplete="off" maxLength={14} value={rpps} onChange={(ev) => setRpps(ev.target.value)} placeholder="11 chiffres" className={champ} aria-describedby="rpps-aide" />
            <button type="submit" disabled={enCours || rpps.replace(/\s/g, '').length !== 11} className={`${btnSecondaire} shrink-0`}>{enCours ? 'Recherche…' : 'Préremplir'}</button>
          </div>
          <p id="rpps-aide" className="text-xs text-neutral-600">Nous reprenons votre profession, votre nom d’exercice et l’adresse de votre cabinet depuis l’annuaire public des professionnels de santé. Vous vérifiez tout à l’étape suivante.</p>
          {etat && <p role="status" className="text-sm text-amber-900">{etat}</p>}
        </form>
      ) : (
        <p className="text-sm text-neutral-600">Le préremplissage depuis l’annuaire n’est pas disponible pour le moment : vous saisirez vos informations à l’étape suivante.</p>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold">Ou choisissez votre profession</legend>
        <div role="radiogroup" aria-label="Profession" className="grid gap-2 sm:grid-cols-2">
          {professionsProposees().map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={valeur === p.id} onClick={() => onChoisir(p.id)}
              className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border px-4 text-left ${focus} ${valeur === p.id ? 'border-teal-700 bg-teal-50 font-semibold ring-1 ring-teal-700' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
              <span>{p.libelle}</span>
              {!p.disponible && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">Bientôt</span>}
            </button>
          ))}
        </div>
      </fieldset>
      {choisie && !choisie.disponible && <ListeAttente profession={choisie.id} libelle={choisie.libelle} identite={identite} inscrire={listeAttente} />}
    </div>
  );
}

function ListeAttente({ profession, libelle, identite, inscrire }: { profession: string; libelle: string; identite: IdentiteConfirmee; inscrire: Props['actions']['listeAttente'] }) {
  const [etat, setEtat] = useState<{ ok: boolean; message: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const envoyer = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    setEnvoi(true);
    const r = await inscrire({ profession, email: String(f.get('email') ?? ''), prenom: String(f.get('prenom') ?? ''), nom: String(f.get('nom') ?? ''), ville: String(f.get('ville') ?? ''), recontact: f.get('recontact') === 'on' })
      .catch(() => ({ ok: false, message: 'Envoi impossible. Vérifiez la connexion.' }));
    setEnvoi(false);
    setEtat(r);
  };
  if (etat?.ok) return <p role="status" className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-950">{etat.message}</p>;
  return (
    <form onSubmit={envoyer} className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4" aria-labelledby="titre-attente">
      <h2 id="titre-attente" className="text-lg font-semibold">Bientôt disponible : {libelle}</h2>
      <p className="text-sm text-neutral-700">Les sites pour votre profession sont en préparation (textes relus, illustrations). Laissez vos coordonnées : nous vous recontactons à l’ouverture. Aucun e-mail automatique n’est envoyé.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">Prénom<input name="prenom" autoComplete="given-name" defaultValue={identite.prenom} className={champ} required /></label>
        <label className="grid gap-1 text-sm font-medium">Nom<input name="nom" autoComplete="family-name" defaultValue={identite.nom} className={champ} required /></label>
        <label className="grid gap-1 text-sm font-medium">Ville<input name="ville" autoComplete="address-level2" defaultValue={identite.ville} className={champ} required /></label>
        <label className="grid gap-1 text-sm font-medium">E-mail<input name="email" type="email" autoComplete="email" className={champ} required /></label>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="recontact" className="mt-1 size-5" required /> J’accepte d’être recontacté(e) à l’ouverture pour ma profession.</label>
      {etat && <p role="alert" className="text-sm text-red-700">{etat.message}</p>}
      <button type="submit" disabled={envoi} className={`${btnPrincipal} justify-self-start`}>{envoi ? 'Envoi…' : 'Être prévenu(e)'}</button>
    </form>
  );
}

const messageAnnuaire = (r: ResultatAnnuaire) =>
  r.etat === 'introuvable' ? 'Aucune fiche trouvée. Vérifiez le numéro, ou saisissez vos informations à l’étape suivante.'
    : r.etat === 'limite' ? 'Trop de recherches : réessayez dans une minute, ou saisissez vos informations.'
      : r.etat === 'indisponible' ? 'Le préremplissage n’est pas disponible pour le moment : saisissez vos informations.'
        : 'L’annuaire ne répond pas pour le moment : saisissez vos informations, rien n’est perdu.';

function EtapeIdentite({ identite, fiche, profession, annuaire, chercher, onFiche, onChange }: {
  identite: IdentiteConfirmee;
  fiche: FicheAnnuaire | null;
  profession: NonNullable<ReturnType<typeof professionParcours>>;
  annuaire: Props['annuaire'];
  chercher: Props['actions']['chercher'];
  onFiche: (f: FicheAnnuaire) => void;
  onChange: (i: IdentiteConfirmee) => void;
}) {
  const [recherche, setRecherche] = useState({ nom: identite.nom, ville: identite.ville });
  const [resultats, setResultats] = useState<ResumeAnnuaire[] | null>(null);
  const [etat, setEtat] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const set = (k: keyof IdentiteConfirmee, v: string) => onChange({ ...identite, [k]: v });
  const dus = diplomesUniversitairesDe(fiche);
  const lancer = async (d: { nom?: string; ville?: string; id?: string }) => {
    setEnCours(true);
    setEtat(null);
    const r = await chercher({ ...d, profession: profession.id }).catch(() => ({ etat: 'erreur' }) as ResultatAnnuaire);
    setEnCours(false);
    if (r.etat === 'fiche') { setResultats(null); onFiche(r.fiche); }
    else if (r.etat === 'liste') setResultats(r.resultats);
    else { setResultats(null); setEtat(messageAnnuaire(r)); }
  };
  const champTexte = (k: keyof IdentiteConfirmee, libelle: string, o: { auto?: string; requis?: boolean; mode?: 'tel' | 'numeric'; plein?: boolean } = {}) => (
    <label className={`grid gap-1 text-sm font-medium text-neutral-800 ${o.plein ? 'sm:col-span-2' : ''}`}>
      <span>{libelle}{o.requis ? '' : <span className="font-normal text-neutral-500"> (facultatif)</span>}</span>
      <input value={String(identite[k] ?? '')} onChange={(ev) => set(k, ev.target.value)} autoComplete={o.auto} inputMode={o.mode} type={o.mode === 'tel' ? 'tel' : 'text'} className={champ} required={o.requis} />
    </label>
  );

  return (
    <div className="grid max-w-3xl gap-4">
      {fiche ? (
        <div className="grid gap-1 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-950">
          <p className="font-semibold">Informations reprises de l’annuaire : vérifiez-les et corrigez si besoin.</p>
          <p>{mentionSource(fiche)}</p>
        </div>
      ) : annuaire !== 'indisponible' && (
        <details className="rounded-2xl border border-black/10 bg-white p-4" open={!identite.nom}>
          <summary className={`cursor-pointer font-semibold ${focus}`}>Retrouver ma fiche dans l’annuaire <span className="font-normal text-neutral-600">(facultatif)</span></summary>
          <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(ev) => { ev.preventDefault(); void lancer(recherche); }}>
            <label className="grid gap-1 text-sm font-medium">Nom d’exercice<input value={recherche.nom} onChange={(ev) => setRecherche({ ...recherche, nom: ev.target.value })} autoComplete="family-name" className={champ} /></label>
            <label className="grid gap-1 text-sm font-medium">Ville<input value={recherche.ville} onChange={(ev) => setRecherche({ ...recherche, ville: ev.target.value })} autoComplete="address-level2" className={champ} /></label>
            <button type="submit" disabled={enCours || recherche.nom.trim().length < 2} className={btnSecondaire}>{enCours ? 'Recherche…' : 'Rechercher'}</button>
          </form>
          {etat && <p role="status" className="mt-2 text-sm text-amber-900">{etat}</p>}
          {resultats && (
            <ul className="mt-3 grid gap-2" aria-label="Fiches trouvées">
              {resultats.map((r) => (
                <li key={r.idFhir} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2">
                  <span><strong>{r.prenom} {r.nom}</strong><span className="block text-sm text-neutral-600">{[r.professionLibelle, ...r.villes].filter(Boolean).join(' · ')}</span></span>
                  <button type="button" onClick={() => void lancer({ id: r.idFhir })} className={`${btnSecondaire} min-h-11`}>C’est moi</button>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}

      {fiche && fiche.lieux.length > 1 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">Lieu d’exercice à afficher</legend>
          {fiche.lieux.map((l, i) => (
            <label key={`${l.adresse}-${i}`} className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm">
              <input type="radio" name="lieu" className="mt-1 size-5" checked={identite.adresse === l.adresse && identite.ville === l.ville} onChange={() => onChange({ ...identite, nomCabinet: l.nom, adresse: l.adresse, codePostal: l.codePostal, ville: l.ville, telephone: l.telephone })} />
              <span>{[l.nom, l.adresse, `${l.codePostal} ${l.ville}`.trim()].filter(Boolean).join(', ')}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 sm:grid-cols-2">
        {champTexte('prenom', 'Prénom', { auto: 'given-name', requis: true })}
        {champTexte('nom', 'Nom', { auto: 'family-name', requis: true })}
        {champTexte('nomCabinet', 'Nom du cabinet', { auto: 'organization', plein: true })}
        {champTexte('adresse', 'Adresse du cabinet', { auto: 'street-address', plein: true })}
        {champTexte('codePostal', 'Code postal', { auto: 'postal-code', mode: 'numeric' })}
        {champTexte('ville', 'Ville', { auto: 'address-level2', requis: true })}
        {champTexte('telephone', 'Téléphone du cabinet', { auto: 'tel', mode: 'tel', plein: true })}
      </div>

      {(profession.diplomeEtat || dus.length > 0) && (
        <fieldset className="grid gap-2 rounded-2xl border border-black/10 bg-white p-4">
          <legend className="sr-only">Diplômes affichés</legend>
          <p className="font-semibold">Diplômes affichés sur votre site</p>
          {profession.diplomeEtat && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-5" checked={identite.diplomeEtat} onChange={(ev) => onChange({ ...identite, diplomeEtat: ev.target.checked })} />
              <span>{profession.diplomeEtat}</span>
            </label>
          )}
          {dus.map((du) => (
            <label key={du} className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-5" checked={identite.diplomesUniversitaires.includes(du)}
                onChange={(ev) => onChange({ ...identite, diplomesUniversitaires: diplomesConfirmes(ev.target.checked ? [...identite.diplomesUniversitaires, du] : identite.diplomesUniversitaires.filter((x) => x !== du), dus) })} />
              <span>{du} <span className="text-neutral-500">(inscrit dans l’annuaire)</span></span>
            </label>
          ))}
          {!dus.length && fiche && <p className="text-xs text-neutral-500">Aucun diplôme universitaire n’est inscrit dans l’annuaire pour votre fiche. Vous pourrez en ajouter plus tard.</p>}
        </fieldset>
      )}

      <details className="text-sm text-neutral-600">
        <summary className={`cursor-pointer font-medium ${focus}`}>D’où viennent ces informations ?</summary>
        <p className="mt-2">Si vous le demandez, nous lisons votre fiche dans l’Annuaire Santé (RPPS, Agence du Numérique en Santé), un annuaire public. Seules les informations que vous confirmez ici sont gardées, pour préparer votre site ; rien n’est publié sans votre accord et la vérification de votre conseillère. Une erreur dans l’annuaire se corrige auprès de votre Ordre. Vous pouvez modifier ou supprimer ces informations à tout moment. Détails : <Link href="/essai/confidentialite" className="underline underline-offset-2">confidentialité</Link>.</p>
      </details>
    </div>
  );
}

function EtapeActivites({ valeur, pratique, themes, onChange }: { valeur: string[]; pratique: PratiqueProfession; themes: string[]; onChange: (v: string[]) => void }) {
  const plein = valeur.length >= ACTIVITES_MAX;
  return (
    <div className="grid max-w-3xl gap-4">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Activités">
        {activitesProposees(pratique, themes).map((a) => {
          const rang = valeur.indexOf(a.id);
          const actif = rang >= 0;
          return (
            <li key={a.id}>
              <button type="button" aria-pressed={actif} disabled={!actif && plein} onClick={() => onChange(basculerActivite(pratique, valeur, a.id, themes))}
                className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm ${focus} disabled:opacity-40 ${actif ? 'border-teal-700 bg-teal-50 font-semibold ring-1 ring-teal-700' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>
                <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${actif ? 'bg-teal-800 text-white' : 'bg-neutral-100 text-neutral-400'}`}>{actif ? rang + 1 : ''}</span>
                {a.libelle}{actif && <span className="sr-only">, choix n° {rang + 1}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {valeur.length > 1 && (
        <ol className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3" aria-label="Ordre des activités">
          {libellesActivites(valeur, pratique).map((l, i) => (
            <li key={valeur[i]} className="flex items-center justify-between gap-2 text-sm">
              <span><strong>{i + 1}.</strong> {l}</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => onChange(deplacerActivite(valeur, valeur[i], -1))} disabled={i === 0} aria-label={`Monter ${l}`} className={`size-11 rounded-lg border border-neutral-200 disabled:opacity-30 ${focus}`}>↑</button>
                <button type="button" onClick={() => onChange(deplacerActivite(valeur, valeur[i], 1))} disabled={i === valeur.length - 1} aria-label={`Descendre ${l}`} className={`size-11 rounded-lg border border-neutral-200 disabled:opacity-30 ${focus}`}>↓</button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Courte animation de « construction » (≈ 1,8 s ; aucune avec mouvements réduits) */
function Construction({ identite, activites }: { identite: IdentiteConfirmee; activites: string[] }) {
  const lignes = [
    `Vos informations${identite.ville ? ` à ${identite.ville}` : ''}`,
    'Vos sujets et vos soins',
    ...(activites.length ? [`Vos activités : ${activites.join(', ')}`] : []),
    'Vos couleurs et vos illustrations',
  ];
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-construction" className="fixed inset-0 z-50 grid place-items-center bg-white/95 p-6">
      <div className="grid w-full max-w-sm gap-4">
        <h2 id="titre-construction" className="text-xl font-bold">Préparation de votre site</h2>
        <ul className="grid gap-2" role="status">
          {lignes.map((l, i) => (
            <li key={l} className="flex items-center gap-2 text-neutral-800 motion-safe:animate-[apparition_.4s_ease-out_both]" style={{ animationDelay: `${i * 350}ms` }}>
              <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-teal-800 text-xs text-white">✓</span>{l}
            </li>
          ))}
        </ul>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true"><div className="h-full w-full origin-left rounded-full bg-teal-700 motion-safe:animate-[remplir_1.8s_ease-out_both]" /></div>
      </div>
      <style>{'@keyframes apparition{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes remplir{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>
    </div>
  );
}

function RenduClient({ draft, modele, nom, catalogue, marquesImportees, appareil, autres, test, onAutre, onFermer, onContinuer }: {
  draft: SiteDraft; modele: ModeleManifeste; nom: string; catalogue: SoinCatalogue[]; marquesImportees: MarqueImportee[]; appareil: 'mobile' | 'bureau';
  autres: boolean; test: boolean; onAutre: () => void; onFermer: () => void; onContinuer: () => void;
}) {
  const fermer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    fermer.current?.focus();
    const echap = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', echap);
    const ancien = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', echap); document.body.style.overflow = ancien; };
  }, [onFermer]);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-rendu-client" className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] bg-neutral-100">
      <header className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-2.5">
        <h2 id="titre-rendu-client" className="text-base font-semibold">Votre site : « {nom} »</h2>
        <button ref={fermer} type="button" onClick={onFermer} className={`min-h-11 rounded-lg px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 ${focus}`}>Fermer</button>
      </header>
      <div className="overflow-y-auto overscroll-contain px-2 py-3 sm:px-6">
        <div className="mx-auto max-w-6xl" role="region" aria-label="Rendu du site">
          <ApercuTheme key={`${draft.theme.proposition}-${appareil}`} plein appareil={appareil} draft={draft} modele={modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />
        </div>
        <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-neutral-600">Rendu préparé dans votre navigateur. Rien n’est publié.{test ? ' Mode test : rien n’est enregistré.' : ''}</p>
      </div>
      <footer className="grid gap-2 border-t border-black/10 bg-white px-4 py-3 sm:flex sm:items-center sm:justify-between">
        {autres ? <button type="button" onClick={onAutre} className={btnSecondaire}>Autre proposition</button> : <span />}
        <button type="button" onClick={onContinuer} className={btnPrincipal}>Continuer : horaires, soins, accès →</button>
      </footer>
    </div>
  );
}
