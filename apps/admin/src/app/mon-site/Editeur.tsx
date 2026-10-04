'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  controlerPublication,
  GAMMES,
  modeleIntegre,
  lieuVide,
  PAYS,
  praticienVide,
  PROFILS,
  SPECIALITES,
  LIBELLES_ANIMATIONS,
  specialiteDuProfil,
  STATUTS,
  THEMES_FLUX,
  TYPES_LIEU,
  VOIX,
  type LieuDraft,
  type PraticienDraft,
  type SiteDraft,
} from '@plateforme/core';
import Apercu from '@/components/Apercu';
import Photo from '@/components/Photo';
import type { SoinCatalogue } from '@/lib/sites';
import type { ModeleDisponible } from '@/lib/modeles';
import { enregistrerSite } from './actions';

const ETAPES = ['Profil', 'Praticiens', 'Cabinet', 'Horaires', 'Rendez-vous et infos', 'Compétences', 'Photos et style'] as const;

type Props = { siteId: string | null; initial: SiteDraft; catalogue: SoinCatalogue[]; modeles: ModeleDisponible[] };

const versListe = (texte: string, sep = /[,;\n]/) => texte.split(sep).map((x) => x.trim()).filter(Boolean);

export default function Editeur({ siteId, initial, catalogue, modeles }: Props) {
  const [d, setD] = useState(initial);
  const [id, setId] = useState(siteId);
  const [etape, setEtape] = useState(0);
  const [statut, setStatut] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const controle = useMemo(() => controlerPublication(d), [d]);
  const gammesConseillees = modeleIntegre(d.theme.modele).gammes ?? [];
  const pays = PAYS.find((p) => p.value === d.pays) ?? PAYS[0];

  const maj = (patch: Partial<SiteDraft>) => { setD((x) => ({ ...x, ...patch })); setStatut(null); };
  const majCabinet = (patch: Partial<SiteDraft['cabinet']>) => maj({ cabinet: { ...d.cabinet, ...patch } });
  const majAcces = (patch: Partial<SiteDraft['acces']>) => maj({ acces: { ...d.acces, ...patch } });
  const majLieu = (i: number, patch: Partial<LieuDraft>) => maj({ lieux: d.lieux.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const majPraticien = (i: number, patch: Partial<PraticienDraft>) =>
    maj({ praticiens: d.praticiens.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  const enregistrer = (suivante?: number) =>
    demarrer(async () => {
      const r = await enregistrerSite(id, d);
      setStatut(r);
      if (r.ok && r.id) setId(r.id);
      if (r.ok && suivante !== undefined) setEtape(suivante);
    });

  const derniere = etape === ETAPES.length - 1;
  const lieu = d.lieux[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <h1 className="text-2xl font-bold">Mon site</h1>
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
              <Choix
                legende="Profil du cabinet"
                colonnes={2}
                options={PROFILS.map((p) => ({ value: p.value, label: p.label, description: p.description }))}
                valeur={d.profil}
                onChange={(v) => {
                  const p = PROFILS.find((x) => x.value === v)!;
                  maj({ profil: p.value, voix: p.voix, theme: { ...d.theme, modele: p.modele, specialite: specialiteDuProfil(p.value) } });
                }}
              />
              <Choix
                legende="Façon de s’exprimer sur le site"
                options={VOIX.map((v) => ({ value: v.value, label: v.label, description: v.exemple }))}
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
                  <Photo siteId={id} type={`portrait-${p.id}`} carre label="Portrait (facultatif)" valeur={p.photo} onChange={(u) => majPraticien(i, { photo: u })} />
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
            </div>
          )}

          {etape === 3 && (
            <div className="grid gap-3">
              <p className="text-sm text-neutral-600">Exemple : « 9h00–12h30, 14h00–19h00 » ou « Fermé ».</p>
              {lieu.horaires.map((h, i) => (
                <label key={h.jour} className="grid grid-cols-[100px_1fr] items-center gap-3 text-sm">
                  <span className="font-medium">{h.jour}</span>
                  <input
                    className={champClasse}
                    value={h.heures}
                    onChange={(e) => majLieu(0, { horaires: lieu.horaires.map((x, j) => (j === i ? { ...x, heures: e.target.value } : x)) })}
                  />
                </label>
              ))}
            </div>
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
                legende="Modèle"
                options={modeles.map((m) => ({ value: m.id, label: m.nom, description: m.description }))}
                valeur={d.theme.modele}
                onChange={(v) => maj({ theme: { ...d.theme, modele: v, couleur: modeles.find((m) => m.id === v)?.couleurConseillee ?? d.theme.couleur } })}
              />
              <Choix
                legende="Spécialité mise en avant (photos et animation par défaut)"
                options={SPECIALITES.map((s) => ({ value: s.value, label: s.label, description: s.description }))}
                valeur={d.theme.specialite}
                onChange={(v) => maj({ theme: { ...d.theme, specialite: v } })}
              />
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Spécialité secondaire (facultatif)</span>
                <select
                  value={d.theme.specialiteSecondaire}
                  onChange={(e) => maj({ theme: { ...d.theme, specialiteSecondaire: e.target.value } })}
                  className="rounded-lg border border-neutral-300 px-3 py-2"
                >
                  <option value="">Aucune</option>
                  {SPECIALITES.filter((s) => s.value !== d.theme.specialite).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <span className="text-xs text-neutral-500">Complète les photos, illustrations et soins mis en avant ; l’accueil reste celui de la spécialité principale.</span>
              </label>
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
            <span role="status" className={`text-sm ${statut?.ok ? 'text-teal-800' : 'text-red-700'}`}>
              {enCours ? 'Enregistrement…' : statut?.message}
            </span>
            {derniere ? (
              <div className="flex gap-2">
                <button type="submit" disabled={enCours} className="rounded-lg border border-teal-800 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50">Enregistrer</button>
                <Link href="/tableau-de-bord" className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900">Terminer</Link>
              </div>
            ) : (
              <button type="submit" disabled={enCours} className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
                Enregistrer et continuer →
              </button>
            )}
          </div>
        </form>

        <Verification bloquants={controle.bloquants} conseils={controle.conseils} />
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-sm font-medium text-neutral-600">Aperçu en direct</p>
        <Apercu draft={d} catalogue={catalogue} />
      </div>
    </div>
  );
}

function Verification({ bloquants, conseils }: { bloquants: string[]; conseils: string[] }) {
  if (!bloquants.length && !conseils.length) {
    return <p className="mt-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-900">Tout est prêt pour la publication.</p>;
  }
  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
      <p className="font-semibold">Vérification avant publication</p>
      {bloquants.length > 0 && (
        <ul className="grid gap-1">
          {bloquants.map((b) => <li key={b} className="flex gap-2 text-red-800"><span aria-hidden>●</span>{b}</li>)}
        </ul>
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
