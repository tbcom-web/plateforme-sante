'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  controlerPublication,
  CATEGORIES_EQUIPEMENTS,
  EQUIPEMENTS,
  EQUIPEMENTS_AUTRES_MAX,
  GAMMES,
  modeleIntegre,
  effetModele,
  registreModele,
  gabaritModele,
  type ModeleManifeste,
  marquesLogo,
  svgMarque,
  couleursMarque,
  traitementLogo,
  initiales,
  DISPOSITIONS_LOGO,
  modeleDuSite,
  MODES_VISUELS,
  svgMarqueImportee,
  couleursImportee,
  type MarqueImportee,
  PAYS,
  praticienVide,
  SPECIALITES,
  LIBELLES_ANIMATIONS,
  universCatalogue,
  STATUTS,
  ficheConseil,
  THEMES_FLUX,
  TYPES_LIEU,
  VOIX,
  nomAffiche,
  type LieuDraft,
  type PraticienDraft,
  type JeuPhotos,
  type SiteDraft,
  appliquerPriorites,
} from '@plateforme/core';
import ChoixSujets from '@/components/ChoixSujets';
import Apercu from '@/components/Apercu';
import ApercuTheme from '@/components/ApercuTheme';
import Photo from '@/components/Photo';
import EditeurHoraires from '@/components/EditeurHoraires';
import PortraitPraticien from '@/components/PortraitPraticien';
import type { SoinCatalogue } from '@/lib/sites';
import type { ModeleDisponible } from '@/lib/modeles';
import SaisieGardee from '@/components/SaisieGardee';
import { garderLocalement, oublierLocalement } from '@/lib/brouillon-local';
import { enregistrerEtPublier, enregistrerSite, type EtatEnregistrement } from './actions';
import { publierApercuParcours } from '../creer/actions';
import ConfirmationPublication from '@/components/ConfirmationPublication';
import SuiviPublication from '@/components/SuiviPublication';
import SuggestionsVoisinage from '@/components/SuggestionsVoisinage';

const ETAPES = ['Profil', 'Praticiens', 'Cabinet', 'Horaires', 'Rendez-vous et infos', 'Compétences', 'Photos et style'] as const;

// version : date de modification du brouillon lue (verrou optimiste) ; titre : « Site de … » quand l'admin édite un client ;
// publicationEnCours : une publication est en cours à l'ouverture (son suivi reprend).
// essai : compte en essai gratuit non validé — pas de « publier » : « Enregistrer » et « Mettre à jour ma version d'essai »
// (aperçu privé), ou, sans accès créé (session anonyme), le lien pour créer son accès.
// masquerSujetsIndisponibles : praticien (pas l'admin) — sujets différés (faible niveau de preuve) non montrés.
type Props = { siteId: string | null; version?: string | null; titre?: string; publicationEnCours?: boolean; initial: SiteDraft; lienChangerModele: string; catalogue: SoinCatalogue[]; modeles: ModeleDisponible[]; marquesImportees: MarqueImportee[]; jeuPhotos?: JeuPhotos | null; themesActives?: string[]; essai?: { anonyme: boolean } | null; masquerSujetsIndisponibles?: boolean };

const versListe = (texte: string, sep = /[,;\n]/) => texte.split(sep).map((x) => x.trim()).filter(Boolean);

export default function Editeur({ siteId, version: versionInitiale = null, titre = 'Mon site', publicationEnCours = false, initial, lienChangerModele, catalogue, modeles, marquesImportees, jeuPhotos, themesActives = [], essai = null, masquerSujetsIndisponibles = false }: Props) {
  const [d, setD] = useState(initial);
  const [id, setId] = useState(siteId);
  const [etape, setEtape] = useState(0);
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const controle = useMemo(() => controlerPublication(d), [d]);
  // Fiche du modèle choisi (importée et active si elle existe, sinon intégrée)
  const modeleCourant = modeles.find((m) => m.id === d.theme.modele)?.manifeste ?? modeleIntegre(d.theme.modele);
  const gammesConseillees = modeleCourant.gammes ?? [];
  const [onglet, setOnglet] = useState<'theme' | 'contenu' | null>(null);
  const ongletAffiche = onglet ?? (etape === ETAPES.length - 1 || etape === 0 ? 'theme' : 'contenu');
  // Aperçu des logos : rendu identique au site (traitement du modèle, couleurs de la gamme ou du cabinet).
  const traitement = traitementLogo(modeleCourant);
  const couleursLogo = couleursMarque(modeleCourant, { couleur: d.theme.couleur, gamme: d.theme.gamme || null });
  const sigle = initiales(d.cabinet.nom || `${d.praticiens[0]?.prenom ?? ''} ${d.praticiens[0]?.nom ?? ''}`).replace(/[^\p{L}]/gu, '');
  const importee = (id: string) => marquesImportees.find((m) => m.id === id);
  const apercuMarque = (id: string) =>
    importee(id) ? svgMarqueImportee(importee(id)!, couleursImportee(traitement.marque, couleursLogo, traitement.rayon), 48) :
    svgMarque(id, couleursLogo, { traitement: traitement.marque, rayon: traitement.rayon, epais: traitement.epais, taille: 48, initiales: sigle, police: traitement.police, graisse: traitement.graisse });
  const pays = PAYS.find((p) => p.value === d.pays) ?? PAYS[0];

  // Modifications non enregistrées : alerte si l'on quitte la page
  const [modifie, setModifie] = useState(false);
  useEffect(() => {
    if (!modifie) return;
    const avant = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, [modifie]);
  const maj = (patch: Partial<SiteDraft>) => { setD((x) => ({ ...x, ...patch })); setStatut(null); setModifie(true); };
  const majCabinet = (patch: Partial<SiteDraft['cabinet']>) => maj({ cabinet: { ...d.cabinet, ...patch } });
  const majAcces = (patch: Partial<SiteDraft['acces']>) => maj({ acces: { ...d.acces, ...patch } });
  const majLieu = (i: number, patch: Partial<LieuDraft>) => maj({ lieux: d.lieux.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const majPraticien = (i: number, patch: Partial<PraticienDraft>) =>
    maj({ praticiens: d.praticiens.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  // Verrou optimiste : un enregistrement refusé (modifié ailleurs) garde la saisie dans ce navigateur.
  const [version, setVersion] = useState(versionInitiale);
  const apresEnregistrement = (r: EtatEnregistrement) => {
    setStatut(r);
    if (r.version) setVersion(r.version);
    if (r.conflit && id) garderLocalement('formulaire', id, d);
    if (r.version && r.id) { setModifie(false); setId(r.id); oublierLocalement('formulaire', r.id); }
  };
  const enregistrer = (suivante?: number) =>
    demarrer(async () => {
      const r = await enregistrerSite(id, d, version);
      apresEnregistrement(r);
      if (r.ok && suivante !== undefined) setEtape(suivante);
    });
  // Plus rien ne bloque la publication : avec des informations manquantes, une confirmation les liste (« Publier quand même »).
  const [confirmer, setConfirmer] = useState(false);
  // Suivi détaillé de la publication lancée (étapes réelles, « en ligne » une fois la nouvelle version servie).
  const [suivi, setSuivi] = useState<number | null>(publicationEnCours ? 0 : null);
  const enregistrerPuisPublier = async () => {
    const r = await enregistrerEtPublier(id, d, version);
    apresEnregistrement(r);
    if (r.ok && r.id) setSuivi((n) => (n ?? 0) + 1);
    return r;
  };
  const publierMaintenant = () => {
    setConfirmer(false);
    demarrer(async () => { await enregistrerPuisPublier(); });
  };
  const publier = () => (controle.remplacements.length ? setConfirmer(true) : publierMaintenant());
  // Essai : jamais de publication ; la version d'essai (aperçu privé, non indexé) est régénérée à la demande.
  const mettreAJourEssai = () =>
    demarrer(async () => {
      const r = await publierApercuParcours(id, d, version);
      apresEnregistrement(r);
      if (r.ok && r.id) setSuivi((n) => (n ?? 0) + 1);
    });
  const boutonEssai = (classe: string) =>
    essai?.anonyme ? (
      <Link href="/creer?etape=fin" className={classe}>Créer mon accès</Link>
    ) : (
      <button type="button" disabled={enCours} onClick={mettreAJourEssai} className={`${classe} disabled:opacity-60`}>Mettre à jour ma version d’essai</button>
    );

  const derniere = etape === ETAPES.length - 1;
  const lieu = d.lieux[0];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div>
        <SaisieGardee<SiteDraft> espace="formulaire" id={id} onReprendre={(x) => { setD(x); setModifie(true); setStatut({ ok: true, message: 'Saisie reprise : enregistrez pour la conserver.' }); }} />
        <h1 className="text-2xl font-bold">{titre}</h1>
        <ol className="mt-5 flex flex-wrap gap-2" aria-label="Étapes">
          {ETAPES.map((e, i) => (
            <li key={e}>
              <button
                type="button"
                onClick={() => setEtape(i)}
                aria-current={i === etape ? 'step' : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  i === etape ? 'bg-teal-800 text-white' : 'bg-white text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-50'
                }`}
              >
                {i + 1}. {e}
              </button>
            </li>
          ))}
        </ol>

        <form
          className="mt-6 rounded-2xl border border-black/5 bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            enregistrer(derniere ? undefined : etape + 1);
          }}
        >
          <FicheConseil etape={ETAPES[etape]} />

          {etape === 0 && (
            <div className="grid gap-7">
              <Choix
                legende="Pays d’exercice"
                options={PAYS.map((p) => ({ value: p.value, label: p.label, description: p.titre }))}
                valeur={d.pays}
                onChange={(v) => {
                  const p = PAYS.find((x) => x.value === v)!;
                  maj({ pays: v as SiteDraft['pays'], rdv: { ...d.rdv, outil: p.outilsRdv[0] }, paiements: p.paiements.slice(0, 3) });
                }}
              />
              {/* Plus de « profil du cabinet » : les sujets (étape « Compétences ») pilotent le modèle recommandé et les
                  spécialités. Le champ profil reste dans les brouillons (normaliserDraft), seule la voix se choisit ici. */}
              <Choix
                legende="Façon de s’exprimer sur le site"
                options={VOIX.map((v) => ({ value: v.value, label: v.label, description: v.value === 'tiers' ? `« ${nomAffiche(d.praticiens[0] ?? { prenom: '', nom: '' }) || 'Le praticien'}, ${pays.titre.toLowerCase()}, vous accueille… »` : v.exemple }))}
                valeur={d.voix}
                onChange={(v) => maj({ voix: v as SiteDraft['voix'] })}
              />
            </div>
          )}

          {etape === 1 && (
            <div className="grid gap-6">
              {d.praticiens.map((p, i) => (
                <fieldset key={p.id} className="grid gap-4 rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-center justify-between">
                    <legend className="font-semibold">Praticien {i + 1}</legend>
                    {d.praticiens.length > 1 && (
                      <button type="button" className="text-xs text-red-700" onClick={() => maj({ praticiens: d.praticiens.filter((_, j) => j !== i) })}>
                        Retirer
                      </button>
                    )}
                  </div>
                  <Grille>
                    <Champ label="Prénom" value={p.prenom} onChange={(v) => majPraticien(i, { prenom: v })} />
                    <Champ label="Nom" value={p.nom} onChange={(v) => majPraticien(i, { nom: v })} />
                    <Selection label="Statut" value={p.statut} options={STATUTS} onChange={(v) => majPraticien(i, { statut: v as PraticienDraft['statut'] })} />
                    {d.pays === 'FR' && (
                      <>
                        <Champ label="N° d’inscription au tableau de l’Ordre" aide="9 chiffres" inputMode="numeric" value={p.numeroOrdre} onChange={(v) => majPraticien(i, { numeroOrdre: v.replace(/\D/g, '').slice(0, 11) })} />
                        <Champ label="N° RPPS (facultatif)" aide="11 chiffres" inputMode="numeric" value={p.rpps} onChange={(v) => majPraticien(i, { rpps: v.replace(/\D/g, '').slice(0, 11) })} />
                      </>
                    )}
                    {d.pays === 'BE' && (
                      <Champ label="N° INAMI" placeholder="5-12345-12-123" value={p.inami} onChange={(v) => majPraticien(i, { inami: v })} />
                    )}
                    {d.pays === 'CH' && (
                      <>
                        <Champ label="N° RCC / ZSR" value={p.rcc} onChange={(v) => majPraticien(i, { rcc: v })} />
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="size-4 accent-teal-800" checked={p.membreSsp} onChange={(e) => majPraticien(i, { membreSsp: e.target.checked })} />
                          Membre de la SSP
                        </label>
                      </>
                    )}
                    <Champ label="Diplôme" placeholder="Diplôme d’État de pédicure-podologue" value={p.diplome} onChange={(v) => majPraticien(i, { diplome: v })} />
                    <Champ label="École" placeholder="IFPP, EEPP, IFM3R…" value={p.ecole} onChange={(v) => majPraticien(i, { ecole: v })} />
                    {d.praticiens.length > 1 && (
                      <>
                        <Champ label="Jours de présence" placeholder="Mercredi et vendredi" value={p.presence} onChange={(v) => majPraticien(i, { presence: v })} />
                        <Champ label="Lien de RDV personnel" placeholder="https://www.doctolib.fr/…" type="url" value={p.rdvUrl} onChange={(v) => majPraticien(i, { rdvUrl: v })} />
                      </>
                    )}
                  </Grille>
                  <PortraitPraticien siteId={id} praticien={p} label="Portrait (facultatif)" theme={d.theme} onChange={(m) => majPraticien(i, m)} />
                  <Zone label="Formations et DU (une par ligne)" value={p.formations.join('\n')} onChange={(v) => majPraticien(i, { formations: versListe(v, /\n/) })} />
                  {(d.profil === 'sport' || p.sports.length > 0) && (
                    <Champ large label="Sports suivis (séparés par des virgules)" value={p.sports.join(', ')} onChange={(v) => majPraticien(i, { sports: versListe(v) })} />
                  )}
                  <div>
                    <p className="mb-2 text-sm font-medium">Orientations mises en avant</p>
                    <div className="flex flex-wrap gap-2">
                      {catalogue.map((s) => {
                        const actif = p.orientations.includes(s.slug);
                        return (
                          <button
                            key={s.slug}
                            type="button"
                            aria-pressed={actif}
                            onClick={() => majPraticien(i, { orientations: actif ? p.orientations.filter((o) => o !== s.slug) : [...p.orientations, s.slug] })}
                            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${actif ? 'bg-teal-800 text-white ring-teal-800' : 'bg-white text-neutral-700 ring-neutral-300'}`}
                          >
                            {s.titre_court}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Zone label="Présentation (facultatif)" aide="Texte vérifié par le lexique de la profession." value={p.bio} onChange={(v) => majPraticien(i, { bio: v })} />
                </fieldset>
              ))}
              <button
                type="button"
                className="justify-self-start text-sm font-semibold text-teal-800"
                onClick={() => maj({ praticiens: [...d.praticiens, praticienVide('collaborateur')] })}
              >
                + Ajouter un praticien
              </button>
            </div>
          )}

          {etape === 2 && (
            <div className="grid gap-6">
              <Grille>
                <Champ large label="Nom du cabinet (facultatif)" aide="Affiché en tête du site. À défaut : « Cabinet de » suivi du nom des praticiens." value={d.cabinet.nom} onChange={(v) => majCabinet({ nom: v })} />
                <Champ label="Ville principale" value={d.cabinet.ville} onChange={(v) => majCabinet({ ville: v })} />
                <Champ label="Quartier (facultatif)" placeholder="Lyon 6e, Brotteaux" value={d.cabinet.quartier} onChange={(v) => majCabinet({ quartier: v })} />
                <Champ label="Téléphone" type="tel" value={d.cabinet.telephone} onChange={(v) => majCabinet({ telephone: v })} />
                <Champ label="E-mail (facultatif)" type="email" value={d.cabinet.email} onChange={(v) => majCabinet({ email: v })} />
                <Champ large label="Communes voisines (séparées par des virgules)" aide="Améliore le référencement local." value={d.cabinet.communes.join(', ')} onChange={(v) => majCabinet({ communes: versListe(v) })} />
              </Grille>
              <fieldset className="grid gap-4 rounded-xl border border-neutral-200 p-4">
                <legend className="px-1 font-semibold">Lieu d’exercice</legend>
                <Grille>
                  <Selection label="Type de lieu" value={lieu.type} options={TYPES_LIEU} onChange={(v) => majLieu(0, { type: v as LieuDraft['type'] })} />
                  <Champ label="Nom du lieu (facultatif)" placeholder="Maison de santé des Brotteaux" value={lieu.nom} onChange={(v) => majLieu(0, { nom: v })} />
                  <Champ large label="Adresse" value={lieu.adresse} onChange={(v) => majLieu(0, { adresse: v })} />
                  <Champ large label="Complément (entrée, étage, ascenseur)" value={lieu.complement} onChange={(v) => majLieu(0, { complement: v })} />
                  <Champ label="Code postal" value={lieu.codePostal} onChange={(v) => majLieu(0, { codePostal: v })} />
                  <Champ label="Ville" value={lieu.ville} onChange={(v) => majLieu(0, { ville: v })} />
                </Grille>
              </fieldset>
              <SuggestionsVoisinage d={d} maj={maj} />
              <fieldset className="grid gap-4 rounded-xl border border-neutral-200 p-4">
                <legend className="px-1 font-semibold">Accès</legend>
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="size-4 accent-teal-800" checked={d.acces.pmr} onChange={(e) => majAcces({ pmr: e.target.checked })} />
                  Accessible aux personnes à mobilité réduite
                </label>
                <Grille>
                  <Champ large label="Stationnement" placeholder="Parking gratuit sur place" value={d.acces.parking} onChange={(v) => majAcces({ parking: v })} />
                  <Champ large label="Transports en commun" placeholder="Bus ligne 3, arrêt Mairie" value={d.acces.transports} onChange={(v) => majAcces({ transports: v })} />
                </Grille>
              </fieldset>
              <fieldset className="grid gap-4 rounded-xl border border-neutral-200 p-4">
                <legend className="px-1 font-semibold">Matériel et hygiène</legend>
                <p className="text-sm text-neutral-600">Cochez seulement le matériel présent au cabinet. La phrase en gris est celle affichée aux patients, page « Le cabinet ».</p>
                {CATEGORIES_EQUIPEMENTS.map((c) => (
                  <fieldset key={c.value}>
                    <legend className="mb-2 text-sm font-medium">{c.label}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {EQUIPEMENTS.filter((e) => e.categorie === c.value).map((e) => (
                        <label key={e.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${d.equipements.includes(e.id) ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 shrink-0 accent-teal-800"
                            checked={d.equipements.includes(e.id)}
                            onChange={(ev) => maj({ equipements: ev.target.checked ? [...d.equipements, e.id] : d.equipements.filter((x) => x !== e.id) })}
                          />
                          <span className="grid gap-0.5">
                            <span className="font-medium">{e.libelle}</span>
                            <span className="text-xs text-neutral-500">{e.phrase}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Autre matériel (facultatif)</span>
                  <textarea
                    rows={2}
                    maxLength={EQUIPEMENTS_AUTRES_MAX}
                    placeholder="Bac à ultrasons pour le nettoyage des instruments"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                    value={d.equipementsAutres}
                    onChange={(ev) => maj({ equipementsAutres: ev.target.value })}
                  />
                  <span className="text-xs text-neutral-500">Un élément par ligne, nom du matériel seulement (pas de marque ni de formule commerciale).</span>
                </label>
              </fieldset>
            </div>
          )}

          {etape === 3 && (
            <EditeurHoraires lieux={d.lieux} onLieux={(lieux) => maj({ lieux })} domicile={d.domicile} onDomicileJours={(jours) => maj({ domicile: { ...d.domicile, jours } })} />
          )}

          {etape === 4 && (
            <div className="grid gap-6">
              <Choix
                legende="Prise de rendez-vous"
                options={[
                  { value: 'les_deux', label: 'En ligne et téléphone' },
                  { value: 'en_ligne', label: 'En ligne uniquement' },
                  { value: 'telephone', label: 'Téléphone uniquement' },
                ]}
                valeur={d.rdv.mode}
                onChange={(v) => maj({ rdv: { ...d.rdv, mode: v as SiteDraft['rdv']['mode'] } })}
              />
              {d.rdv.mode !== 'telephone' && (
                <Grille>
                  <Selection label="Outil" value={d.rdv.outil} options={pays.outilsRdv.map((o) => ({ value: o, label: o }))} onChange={(v) => maj({ rdv: { ...d.rdv, outil: v } })} />
                  <Champ label="Lien de prise de RDV du cabinet" type="url" placeholder="https://…" value={d.rdv.url} onChange={(v) => maj({ rdv: { ...d.rdv, url: v } })} />
                </Grille>
              )}
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Moyens de règlement acceptés</legend>
                <div className="flex flex-wrap gap-3">
                  {pays.paiements.map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-teal-800"
                        checked={d.paiements.includes(m)}
                        onChange={(e) => maj({ paiements: e.target.checked ? [...d.paiements, m] : d.paiements.filter((x) => x !== m) })}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="grid gap-3 rounded-xl border border-neutral-200 p-4">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input type="checkbox" className="size-4 accent-teal-800" checked={d.domicile.actif} onChange={(e) => maj({ domicile: { ...d.domicile, actif: e.target.checked } })} />
                  Visites à domicile
                </label>
                {d.domicile.actif && (
                  <Grille>
                    <Champ label="Créneaux" placeholder="Le jeudi matin" value={d.domicile.creneaux} onChange={(v) => maj({ domicile: { ...d.domicile, creneaux: v } })} />
                    <Champ label="Secteurs (séparés par des virgules)" placeholder="69100 Villeurbanne, 69500 Bron" value={d.domicile.secteurs.join(', ')} onChange={(v) => maj({ domicile: { ...d.domicile, secteurs: versListe(v) } })} />
                  </Grille>
                )}
              </fieldset>
              <Grille>
                <Champ large label="Conventionnement (facultatif)" placeholder="Conventionné avec l’Assurance Maladie" value={d.conventionnement} onChange={(v) => maj({ conventionnement: v })} />
                <Champ large label="Message important (facultatif)" placeholder="Cabinet fermé du 1er au 15 août" value={d.message.texte} onChange={(v) => maj({ message: { ...d.message, texte: v } })} />
                <Champ label="Afficher jusqu’au" type="date" value={d.message.jusquAu} onChange={(v) => maj({ message: { ...d.message, jusquAu: v } })} />
              </Grille>
            </div>
          )}

          {etape === 5 && (
            <div className="grid gap-8">
            <fieldset className="grid gap-3 rounded-xl border border-neutral-200 p-4">
              <legend className="px-1 font-semibold">Structure du site : vos sujets</legend>
              <p className="text-sm text-neutral-600">Ils ordonnent le menu et l’accueil, et choisissent la spécialité des illustrations (sujets n° 1 et 2).</p>
              <ChoixSujets
                priorites={d.priorites}
                onChange={(p) => { const x = appliquerPriorites(d, p, themesActives); maj({ priorites: x.priorites, theme: x.theme }); }}
                soins={d.soins}
                soinsConnus={catalogue.map((c) => c.slug)}
                themesActives={themesActives}
                masquerIndisponibles={masquerSujetsIndisponibles}
                conseils
              />
            </fieldset>
            <fieldset>
              <legend className="text-sm text-neutral-600">Chaque compétence cochée aura sa propre page, optimisée pour le référencement.</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {catalogue.length === 0 && <p className="text-sm text-red-700">Catalogue introuvable : la base métier n’est pas encore chargée.</p>}
                {catalogue.map((s) => {
                  const coche = d.soins.includes(s.slug);
                  return (
                    <label key={s.slug} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${coche ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-teal-800"
                        checked={coche}
                        onChange={(e) => maj({ soins: e.target.checked ? [...d.soins, s.slug] : d.soins.filter((x) => x !== s.slug) })}
                      />
                      <span>
                        <span className="block font-semibold">{s.titre_court}</span>
                        <span className="block text-sm text-neutral-600">{s.resume}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="grid gap-3 rounded-xl border border-neutral-200 p-4">
              <legend className="px-1 font-semibold">Actualités : articles proposés par la plateforme</legend>
              <Choix
                legende="Publication des articles"
                colonnes={2}
                options={[
                  { value: 'manuel', label: 'Je valide chaque article', description: 'Les articles vous sont proposés dans le tableau de bord.' },
                  { value: 'auto', label: 'Publication automatique', description: 'Les articles des thèmes choisis sont publiés directement.' },
                ]}
                valeur={d.flux.mode}
                onChange={(v) => maj({ flux: { ...d.flux, mode: v as SiteDraft['flux']['mode'] } })}
              />
              <div>
                <p className="mb-2 text-sm font-medium">Thèmes suivis (aucun coché = tous)</p>
                <div className="flex flex-wrap gap-2">
                  {THEMES_FLUX.map((th) => {
                    const actif = d.flux.themes.includes(th);
                    return (
                      <button
                        key={th}
                        type="button"
                        aria-pressed={actif}
                        onClick={() => maj({ flux: { ...d.flux, themes: actif ? d.flux.themes.filter((x) => x !== th) : [...d.flux.themes, th] } })}
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${actif ? 'bg-teal-800 text-white ring-teal-800' : 'bg-white text-neutral-700 ring-neutral-300'}`}
                      >
                        {th}
                      </button>
                    );
                  })}
                </div>
              </div>
            </fieldset>
            </div>
          )}

          {etape === 6 && (
            <div className="grid gap-6">
              <Photo siteId={id} type="accueil" label="Photo d’accueil (cabinet, salle de soins, façade)" valeur={d.photos.accueil} onChange={(u) => maj({ photos: { ...d.photos, accueil: u } })} />
              <Photo siteId={id} type="panorama" label="Photo panoramique (bandeau pleine largeur : façade, rue, salle d’attente)" valeur={d.photos.panorama} onChange={(u) => maj({ photos: { ...d.photos, panorama: u } })} />
              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium">Photos du cabinet (galerie, 6 au maximum)</legend>
                {[...d.photos.cabinet, ''].slice(0, 6).map((u, k) => (
                  <Photo
                    key={u || `nouvelle-${k}`}
                    siteId={id}
                    type="cabinet"
                    label={`Photo ${k + 1}`}
                    valeur={u}
                    onChange={(n) => {
                      const liste = [...d.photos.cabinet];
                      if (n) liste[k] = n; else liste.splice(k, 1);
                      maj({ photos: { ...d.photos, cabinet: liste.filter(Boolean) } });
                    }}
                  />
                ))}
              </fieldset>
              <fieldset>
                <legend className="font-medium">Gamme de couleurs</legend>
                <p className="mt-1 text-xs text-neutral-500">Palettes de la charte, contrastes vérifiés. Les gammes conseillées pour le modèle choisi sont en premier.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[...GAMMES].sort((a, b) => Number(gammesConseillees.includes(b.id)) - Number(gammesConseillees.includes(a.id))).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={d.theme.gamme === g.id}
                      onClick={() => maj({ theme: { ...d.theme, gamme: g.id, couleur: g.accent } })}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 text-left text-sm ${d.theme.gamme === g.id ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 hover:bg-neutral-50'}`}
                    >
                      <span className="flex overflow-hidden rounded-md ring-1 ring-black/10" aria-hidden="true">
                        {[g.plan, g.accent, g.fondDoux, g.signal].map((c) => <span key={c} className="h-8 w-4" style={{ background: c }} />)}
                      </span>
                      <span>
                        <span className="block font-semibold">{g.nom}</span>
                        {gammesConseillees.includes(g.id) && <span className="text-xs text-teal-800">Conseillée</span>}
                      </span>
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
                  <input type="radio" name="gamme-libre" checked={!d.theme.gamme} onChange={() => maj({ theme: { ...d.theme, gamme: '' } })} className="accent-teal-800" />
                  Couleur personnalisée
                  <input type="color" value={d.theme.couleur} disabled={Boolean(d.theme.gamme)} onChange={(e) => maj({ theme: { ...d.theme, gamme: '', couleur: e.target.value } })} className="h-8 w-11 cursor-pointer rounded border border-neutral-300 disabled:opacity-40" />
                </label>
              </fieldset>
              <Choix
                legende="Style visuel du site"
                options={MODES_VISUELS.map((m) => ({ value: m.value, label: m.label, description: m.description }))}
                valeur={d.theme.modeVisuel}
                onChange={(v) => maj({ theme: { ...d.theme, modeVisuel: v as SiteDraft['theme']['modeVisuel'] } })}
              />
              <fieldset>
                <legend className="font-medium">Logo</legend>
                <div className="mt-3 grid gap-2 rounded-xl border border-neutral-200 p-3">
                  <Photo
                    siteId={id}
                    type="logo"
                    largeurMax={800}
                    label="J’ai déjà un logo (PNG, JPG ou WebP ; fond transparent conseillé)"
                    valeur={d.theme.logoPerso.url}
                    onChange={(u) => maj({ theme: { ...d.theme, logoPerso: { ...d.theme.logoPerso, url: u } } })}
                  />
                  {d.theme.logoPerso.url && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4 accent-teal-800" checked={d.theme.logoPerso.complet} onChange={(e) => maj({ theme: { ...d.theme, logoPerso: { ...d.theme.logoPerso, complet: e.target.checked } } })} />
                      Mon logo contient déjà le nom du cabinet (sinon, le nom s’affiche à côté)
                    </label>
                  )}
                  {d.theme.logoPerso.url && <p className="text-xs text-neutral-500">Votre logo remplace la marque ci-dessous ; celle-ci reste utilisée pour l’icône de l’onglet du navigateur.</p>}
                </div>
                <p className="mt-3 text-xs text-neutral-500">{d.theme.logoPerso.url ? 'Marque pour l’icône de l’onglet' : 'Ou choisissez une marque'}, dessinée selon la charte et rendue avec le style du modèle et vos couleurs.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[...marquesLogo('podologie'), ...marquesImportees].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={m.sens}
                      aria-pressed={d.theme.logo.marque === m.id}
                      onClick={() => maj({ theme: { ...d.theme, logo: { ...d.theme.logo, marque: m.id } } })}
                      className={`grid justify-items-center gap-2 rounded-xl border p-3 text-xs ${d.theme.logo.marque === m.id ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 hover:bg-neutral-50'}`}
                    >
                      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: apercuMarque(m.id) }} />
                      <span className="font-semibold">{m.nom}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {DISPOSITIONS_LOGO.map((p) => (
                    <label key={p.id} title={p.sens} className={`cursor-pointer rounded-full border px-3 py-1.5 ${d.theme.logo.disposition === p.id ? 'border-teal-700 bg-teal-50 font-semibold' : 'border-neutral-200'}`}>
                      <input type="radio" className="sr-only" name="disposition-logo" checked={d.theme.logo.disposition === p.id} onChange={() => maj({ theme: { ...d.theme, logo: { ...d.theme.logo, disposition: p.id } } })} />
                      {p.nom}
                    </label>
                  ))}
                </div>
              </fieldset>
              {d.theme.univers ? (
                // Site créé par le parcours : modèle et univers changent ensemble, à l'étape 2 de /creer (jamais ici seul).
                <fieldset className="grid gap-3">
                  <legend className="font-medium">Style du site</legend>
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm">
                    <VignetteModele m={modeleCourant} />
                    <span className="grid content-start gap-0.5">
                      <span className="font-semibold">{universCatalogue(d.theme.univers)?.nom ?? effetModele(modeleCourant)}</span>
                      <span className="text-[11px] text-neutral-400">Modèle « {modeleCourant.nom} »</span>
                    </span>
                    <Link
                      href={lienChangerModele}
                      onClick={(e) => { if (modifie && !confirm('Des modifications ne sont pas enregistrées. Changer de modèle quand même ?')) e.preventDefault(); }}
                      className="ml-auto rounded-lg border border-teal-800 px-3 py-2 font-semibold text-teal-900 hover:bg-teal-50"
                    >
                      Changer de modèle
                    </Link>
                  </div>
                  <p className="text-xs text-neutral-500">Le modèle se change avec ses couleurs et son logo proposés, en comparant les sites prêts sur ordinateur et téléphone. Vos informations sont gardées.</p>
                </fieldset>
              ) : (
                <ChoixModele
                  modeles={modeles}
                  valeur={d.theme.modele}
                  onChange={(v) => maj({ theme: { ...d.theme, modele: v, couleur: modeles.find((m) => m.id === v)?.couleurConseillee ?? d.theme.couleur } })}
                />
              )}
              <div className="grid gap-1.5 rounded-xl border border-neutral-200 p-3 text-sm">
                <p className="font-medium">Spécialités mises en avant <span className="font-normal text-neutral-500">(photos, illustrations et animation)</span></p>
                <p className="text-xs text-neutral-500">Tirées de vos sujets</p>
                <dl className="grid gap-1 sm:grid-cols-2">
                  <div><dt className="text-xs text-neutral-500">Principale</dt><dd className="font-semibold">{SPECIALITES.find((s) => s.value === d.theme.specialite)?.label ?? 'Aucune'}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Secondaire</dt><dd className="font-semibold">{SPECIALITES.find((s) => s.value === d.theme.specialiteSecondaire)?.label ?? 'Aucune'}</dd></div>
                </dl>
                <button type="button" onClick={() => setEtape(ETAPES.indexOf('Compétences'))} className="justify-self-start text-sm font-semibold text-teal-800 underline-offset-4 hover:underline">
                  Régler vos sujets (étape « Compétences »)
                </button>
              </div>
              {SPECIALITES.find((s) => s.value === d.theme.specialite)?.animation && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-teal-800" checked={d.theme.animation} onChange={(e) => maj({ theme: { ...d.theme, animation: e.target.checked } })} />
                  Animation d’accueil ({LIBELLES_ANIMATIONS[SPECIALITES.find((s) => s.value === d.theme.specialite)!.animation!]}) à la place de la photo
                </label>
              )}
              <p className="text-xs text-neutral-500">Vos photos remplacent toujours les photos par défaut. Le style applique une teinte commune à toutes les images.</p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
            <button type="button" disabled={etape === 0} onClick={() => setEtape((e) => e - 1)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:invisible">
              ← Précédent
            </button>
            <span role="status" className={`text-sm ${statut?.ok ? 'text-teal-800' : statut ? 'text-red-700' : 'text-amber-700'}`}>
              {enCours ? 'Enregistrement…' : statut?.message ?? (modifie ? 'Modifications non enregistrées' : '')}
            </span>
            {derniere ? (
              <div className="flex gap-2">
                <button type="submit" disabled={enCours} className="rounded-lg border border-teal-800 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50">Enregistrer</button>
                {essai
                  ? boutonEssai('rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900')
                  : <button type="button" disabled={enCours} onClick={publier} className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60">Enregistrer et publier</button>}
                <Link href="/tableau-de-bord" onClick={(e) => { if (modifie && !confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) e.preventDefault(); }} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Terminer</Link>
              </div>
            ) : (
              <div className="flex gap-2">
                {id && (essai
                  ? boutonEssai('rounded-lg border border-teal-800 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50')
                  : (
                  <button type="button" disabled={enCours} onClick={publier} className="rounded-lg border border-teal-800 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-60">
                    Enregistrer et publier
                  </button>
                ))}
                <button type="submit" disabled={enCours} className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
                  Enregistrer et continuer →
                </button>
              </div>
            )}
          </div>
        </form>

        {confirmer && <div className="mt-4"><ConfirmationPublication remplacements={controle.remplacements} onConfirmer={publierMaintenant} onAnnuler={() => setConfirmer(false)} enCours={enCours} /></div>}
        {suivi !== null && id && <SuiviPublication key={suivi} siteId={id} reessayer={enregistrerPuisPublier} onFermer={() => setSuivi(null)} className="mt-4" />}
        <Verification remplacements={controle.remplacements} conseils={controle.conseils.filter((c) => !controle.remplacements.includes(c))} />
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="mr-auto font-medium text-neutral-600">Aperçu en direct</span>
          {(['theme', 'contenu'] as const).map((o) => (
            <button key={o} type="button" onClick={() => setOnglet(o)} aria-pressed={ongletAffiche === o} className={`rounded-md px-2.5 py-1 ${ongletAffiche === o ? 'bg-teal-800 font-semibold text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>
              {o === 'theme' ? 'Rendu du site' : 'Résumé du contenu'}
            </button>
          ))}
        </div>
        {ongletAffiche === 'theme'
          ? <ApercuTheme draft={d} modele={modeleDuSite(modeleCourant, d.theme)} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={jeuPhotos} />
          : <Apercu draft={d} catalogue={catalogue} />}
      </div>
    </div>
  );
}

/** Fiche conseil de l'étape : ce qu'elle produit sur le site et comment bien la remplir */
function FicheConseil({ etape }: { etape: string }) {
  const f = ficheConseil(etape);
  if (!f) return null;
  return (
    <details className="mb-6 rounded-xl border border-teal-900/10 bg-teal-50/60 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-teal-900">Conseils pour cette étape</summary>
      <p className="mt-2 text-xs text-teal-900/80">Sur le site : {f.surLeSite}</p>
      <dl className="mt-3 grid gap-3">
        {f.points.map((p) => (
          <div key={p.titre}>
            <dt className="font-medium text-neutral-900">{p.titre}</dt>
            <dd className="text-neutral-700">{p.conseil}</dd>
            {p.exemple && <dd className="mt-1 border-l-2 border-teal-700/30 pl-3 text-xs italic text-neutral-600">{p.exemple}</dd>}
          </div>
        ))}
      </dl>
    </details>
  );
}

function Verification({ remplacements, conseils }: { remplacements: string[]; conseils: string[] }) {
  if (!remplacements.length && !conseils.length) {
    return <p className="mt-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-900">Tout est prêt pour la publication.</p>;
  }
  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
      <p className="font-semibold">Vérification avant publication</p>
      {remplacements.length > 0 && (
        <>
          <p className="text-amber-900">Informations manquantes : la publication reste possible, le site affichera une mention sobre à la place.</p>
          <ul className="grid gap-1">
            {remplacements.map((m) => <li key={m} className="flex gap-2 text-amber-800"><span aria-hidden>●</span>{m}</li>)}
          </ul>
        </>
      )}
      {conseils.length > 0 && (
        <ul className="grid gap-1">
          {conseils.map((c) => <li key={c} className="flex gap-2 text-amber-800"><span aria-hidden>○</span>{c}</li>)}
        </ul>
      )}
    </div>
  );
}

const champClasse = 'h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';

function Grille({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

type ChampProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  large?: boolean;
  aide?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

function Champ({ label, value, onChange, large, aide, ...rest }: ChampProps) {
  return (
    <label className={`grid gap-1.5 text-sm ${large ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium">{label}</span>
      <input className={champClasse} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {aide && <span className="text-xs text-neutral-500">{aide}</span>}
    </label>
  );
}

function Zone({ label, value, onChange, aide }: { label: string; value: string; onChange: (v: string) => void; aide?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <textarea rows={3} className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20" value={value} onChange={(e) => onChange(e.target.value)} />
      {aide && <span className="text-xs text-neutral-500">{aide}</span>}
    </label>
  );
}

function Selection({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select className={champClasse} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/**
 * Choix du modèle par l'effet recherché (« Moderne et technique », « Simple et rassurant »…), avec une phrase et une
 * vignette schématique (type d'accueil, fond, couleur conseillée, registre des illustrations). Les identifiants des
 * modèles ne changent pas ; le nom exact du modèle reste lisible en petit.
 */
function ChoixModele({ modeles, valeur, onChange }: { modeles: ModeleDisponible[]; valeur: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="font-medium">Style du site : quel effet recherchez-vous ?</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {modeles.map((m) => (
          <label key={m.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${valeur === m.id ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
            <input type="radio" className="sr-only" name="modele" checked={valeur === m.id} onChange={() => onChange(m.id)} />
            <VignetteModele m={m.manifeste} />
            <span className="grid content-start gap-0.5">
              <span className="font-semibold">{effetModele(m.manifeste)}</span>
              <span className="text-xs text-neutral-600">{m.description}</span>
              <span className="text-[11px] text-neutral-400">Modèle « {m.nom} »</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Vignette d'un modèle : mise en page de l'accueil en aplats (titre, bouton, image, sections), à ses couleurs. */
function VignetteModele({ m }: { m: ModeleManifeste }) {
  const g = GAMMES.find((x) => x.id === m.gammes?.[0]);
  const accent = m.jetons.accent === 'encre' ? '#0b1c24' : g?.accent ?? m.couleurConseillee ?? '#1f6b64';
  const fond = m.jetons.fond;
  const doux = m.jetons.fondDoux ?? '#eef1f4';
  const plan = m.jetons.plan ?? g?.plan ?? '#0f3b3a';
  const pedago = registreModele(m) === 'pedagogique';
  const r = Math.min(m.jetons.rayon / 4, 6);
  const rb = { pilule: 4, arrondi: 2, carre: 0.5 }[m.jetons.boutons];
  const titre = (x: number, y: number, w: number, c = '#1b2a30') => <rect x={x} y={y} width={w} height={m.jetons.graisseTitres > 600 ? 5 : 3.6} rx={1} fill={c} />;
  // Image : photo évoquée (dégradé doux) ou relevé (plan sombre + points de pression)
  const image = (x: number, y: number, w: number, h: number) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={pedago ? doux : plan} />
      {pedago
        ? <path d={`M${x + w * 0.15} ${y + h * 0.75} L${x + w * 0.4} ${y + h * 0.4} L${x + w * 0.6} ${y + h * 0.62} L${x + w * 0.75} ${y + h * 0.48} L${x + w * 0.9} ${y + h * 0.75} Z`} fill={accent} opacity={0.35} />
        : [0.3, 0.45, 0.6, 0.38, 0.52].map((k, i) => <circle key={i} cx={x + w * (0.3 + i * 0.1)} cy={y + h * k} r={1.6} fill={['#3e7bfa', '#22c3a6', '#ffc23d', '#ff7a2f', '#22c3a6'][i]} />)}
    </g>
  );
  // Gabarits tableau, village et revue : vignette propre (cartes arrondies ; une colonne avec trois gros boutons et le plan ;
  // revue : filet double, bandeau pastel, titre à empattements et un dessin au trait légendé)
  const gabarit = gabaritModele(m);
  const hero = gabarit === 'classique' ? m.accueil.hero : gabarit;
  return (
    <svg viewBox="0 0 96 72" width="96" height="72" aria-hidden="true" className="shrink-0 rounded-md ring-1 ring-black/10" style={{ background: fond }}>
      {hero === 'scinde' && (<>{titre(8, 18, 34)}{titre(8, 26, 26)}<rect x={8} y={36} width={20} height={6} rx={rb} fill={accent} />{image(50, 10, 38, 40)}</>)}
      {(hero === 'plein' || hero === 'diaporama') && (<>{image(0, 0, 96, 50)}{titre(10, 22, 40, '#fff')}{titre(10, 30, 28, '#fff')}<rect x={10} y={38} width={20} height={6} rx={rb} fill="#fff" />{hero === 'diaporama' && [0, 1, 2].map((i) => <circle key={i} cx={78 + i * 5} cy={44} r={1.2} fill="#fff" opacity={i ? 0.5 : 1} />)}</>)}
      {hero === 'tableau' && (<><rect x={0} y={0} width={96} height={56} fill={doux} />{[[4, 4, 46, 46], [53, 4, 19, 21], [75, 4, 17, 21], [53, 29, 39, 21]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx={4} fill={i === 1 ? accent : '#fff'} stroke='#00000014' />)}{titre(9, 14, 30)}{titre(9, 22, 22)}<rect x={9} y={34} width={18} height={6} rx={3} fill={accent} /><rect x={29} y={34} width={14} height={6} rx={3} fill='none' stroke={accent} strokeWidth={0.8} /></>)}
      {hero === 'village' && (<>{titre(26, 6, 44)}{titre(32, 13, 32)}{[0, 1, 2].map((i) => <rect key={i} x={8 + i * 27.5} y={22} width={25} height={9} rx={2} fill={i === 1 ? accent : '#fff'} stroke='#1b2a30' strokeWidth={0.6} />)}<rect x={8} y={35} width={80} height={18} rx={2} fill={doux} /><path d='M8 44 H88 M30 35 V53 M62 35 V53' stroke='#fff' strokeWidth={2.2} /><circle cx={50} cy={44} r={2.4} fill={accent} /></>)}
      {hero === 'revue' && (<><path d='M0 9.2 H96 M0 10.6 H96' stroke='#1b2a30' strokeWidth={0.5} /><rect x={0} y={11} width={96} height={45} fill={doux} />{titre(8, 19, 36)}{titre(8, 25, 30)}<rect x={8} y={34} width={17} height={5.5} rx={2.75} fill={accent} /><rect x={27} y={34} width={14} height={5.5} rx={2.75} fill='none' stroke='#1b2a30' strokeWidth={0.5} /><path d='M60 16 V46' stroke='#1b2a30' strokeWidth={0.4} /><path d='M70 17 C70.5 26 71 32 69.5 36 C68.5 39 69.5 41 72 41 L84 41 C86 41 86 38.5 83.5 38 L77 36 C75 34.5 74.5 30 74.5 17' fill='none' stroke='#1b2a30' strokeWidth={0.7} /></>)}
      {hero === 'lieu' && (<>{image(6, 5, 84, 28)}<rect x={10} y={26} width={76} height={24} rx={r} fill={fond} stroke="#00000014" />{titre(15, 31, 34)}{titre(15, 39, 24)}<rect x={60} y={30} width={22} height={7} rx={rb} fill={accent} /><rect x={60} y={39.5} width={22} height={7} rx={rb} fill="none" stroke={accent} strokeWidth={0.8} /></>)}
      <rect x={0} y={56} width={96} height={16} fill={doux} />
      {pedago
        ? [0, 1, 2].map((i) => <g key={i}><circle cx={14 + i * 28} cy={64} r={3} fill={accent} /><rect x={20 + i * 28} y={62.5} width={14} height={3} rx={1} fill="#1b2a30" opacity={0.5} /></g>)
        : [0, 1, 2].map((i) => <g key={i}><text x={8 + i * 28} y={66} fontSize={5} fontFamily="monospace" fill={accent}>0{i + 1}</text><rect x={16 + i * 28} y={62.5} width={14} height={3} rx={1} fill="#1b2a30" opacity={0.5} /></g>)}
    </svg>
  );
}

function Choix({
  legende,
  options,
  valeur,
  onChange,
  colonnes = 3,
}: {
  legende: string;
  options: { value: string; label: string; description?: string }[];
  valeur: string;
  onChange: (v: string) => void;
  colonnes?: 2 | 3;
}) {
  return (
    <fieldset>
      <legend className="font-medium">{legende}</legend>
      <div className={`mt-3 grid gap-2 ${colonnes === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {options.map((o) => (
          <label key={o.value} className={`cursor-pointer rounded-xl border p-3 text-sm ${valeur === o.value ? 'border-teal-700 bg-teal-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
            <input type="radio" className="sr-only" name={legende} checked={valeur === o.value} onChange={() => onChange(o.value)} />
            <span className="block font-semibold">{o.label}</span>
            {o.description && <span className="block text-xs text-neutral-600">{o.description}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
