'use client';

// Suggestions de voisinage pour l'adresse du cabinet : quartier, communes alentour (référencement local), transports
// en commun et stationnement. Les données viennent de la route serveur /api/geo/suggestions (OpenStreetMap et
// geo.api.gouv.fr, appelés côté serveur seulement). Branché dans /creer (étape cabinet) et /mon-site (bloc cabinet).
// - Déclenché une seule fois automatiquement, quand l'adresse est complète et qu'une information manque ; sinon au clic.
// - Quartier pré-rempli s'il est vide ; les 5 premières communes cochées si la liste est vide, toutes décochables.
// - Transports et stationnement : propositions à cocher et à corriger, écrites dans le brouillon seulement au clic
//   (jamais d'affirmation non vérifiée ajoutée d'office).
import { useEffect, useId, useRef, useState } from 'react';
import type { SiteDraft } from '@plateforme/core';
import { formaterDistance, formaterPopulation, normaliserNom } from '@plateforme/core/geo-voisinage';
import { composerTexteAcces, LONGUEUR_ACCES, type PropositionAcces } from '@plateforme/core/geo-acces';

type Commune = { nom: string; insee?: string; distanceKm: number; population?: number };
type Reponse = {
  ok: boolean;
  message?: string;
  partiel?: boolean;
  quartier: { propose: string; options: string[] } | null;
  communes: Commune[];
  transports: PropositionAcces[];
  stationnement: PropositionAcces[];
};
type Ligne = { id: string; texte: string; coche: boolean };

const INDISPONIBLE = 'Suggestions indisponibles pour le moment, vous pouvez saisir les communes à la main.';
const COCHEES_PAR_DEFAUT = 5;
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const champ = 'h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';
const bouton = `min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 ${focus}`;

/** Adresses déjà suggérées automatiquement pendant la session (l'étape peut être quittée puis rouverte). */
const dejaSuggerees = new Set<string>();

const adresseComplete = (adresse: string, cp: string, ville: string) =>
  adresse.trim().length >= 4 && /^\d{4,5}$/.test(cp.replace(/\s/g, '')) && ville.trim().length >= 2;

export default function SuggestionsVoisinage({
  d,
  maj,
  avecChamps = false,
}: {
  d: SiteDraft;
  maj: (patch: Partial<SiteDraft>) => void;
  /** Affiche aussi les champs Quartier, Transports et Stationnement (étape cabinet de /creer, qui ne les a pas) */
  avecChamps?: boolean;
}) {
  const id = useId();
  const lieu = d.lieux[0];
  const adresse = lieu?.adresse ?? '';
  const cp = lieu?.codePostal ?? '';
  const ville = lieu?.ville ?? '';
  const [etat, setEtat] = useState<'repos' | 'chargement' | 'fini'>('repos');
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [message, setMessage] = useState('');
  const [transports, setTransports] = useState<Ligne[]>([]);
  const [stationnement, setStationnement] = useState<Ligne[]>([]);
  const [ajout, setAjout] = useState('');

  // Dernière version du brouillon, pour appliquer une réponse arrivée après d'autres saisies.
  const dernier = useRef(d);
  dernier.current = d;
  const autoFait = useRef(false);
  const enCours = useRef<AbortController | null>(null);

  const majCabinet = (patch: Partial<SiteDraft['cabinet']>) => maj({ cabinet: { ...dernier.current.cabinet, ...patch } });
  const majAcces = (patch: Partial<SiteDraft['acces']>) => maj({ acces: { ...dernier.current.acces, ...patch } });

  async function suggerer() {
    if (!adresseComplete(adresse, cp, ville)) {
      setEtat('fini');
      setMessage('Renseignez d’abord l’adresse, le code postal et la ville du cabinet.');
      return;
    }
    enCours.current?.abort();
    const ctrl = new AbortController();
    enCours.current = ctrl;
    const minuterie = setTimeout(() => ctrl.abort(), 35000);
    setEtat('chargement');
    setMessage('');
    try {
      const qs = new URLSearchParams({ adresse, cp, ville, pays: dernier.current.pays });
      const rep = await fetch(`/api/geo/suggestions?${qs}`, { signal: ctrl.signal, cache: 'no-store' });
      const r = (await rep.json()) as Reponse;
      if (!rep.ok || !r || !Array.isArray(r.communes)) throw new Error();
      setReponse(r);
      setMessage(r.message ?? '');
      const actuel = dernier.current;
      const patch: Partial<SiteDraft['cabinet']> = {};
      if (r.quartier?.propose && !actuel.cabinet.quartier.trim()) patch.quartier = r.quartier.propose;
      if (actuel.cabinet.communes.length === 0 && r.communes.length) patch.communes = r.communes.slice(0, COCHEES_PAR_DEFAUT).map((c) => c.nom);
      if (Object.keys(patch).length) majCabinet(patch);
      setTransports(r.transports.map((p) => ({ id: p.id, texte: p.texte, coche: true })));
      setStationnement(r.stationnement.map((p) => ({ id: p.id, texte: p.texte, coche: true })));
    } catch {
      if (!ctrl.signal.aborted || enCours.current === ctrl) setMessage(INDISPONIBLE);
    } finally {
      clearTimeout(minuterie);
      if (enCours.current === ctrl) {
        enCours.current = null;
        setEtat('fini');
      }
    }
  }

  // Une seule fois, quand l'adresse est complète, après une pause de saisie, et seulement s'il manque quelque chose.
  const manque = !d.cabinet.quartier.trim() || d.cabinet.communes.length === 0 || !d.acces.transports.trim() || !d.acces.parking.trim();
  useEffect(() => {
    const cle = `${adresse}|${cp}|${ville}`.toLowerCase();
    if (autoFait.current || dejaSuggerees.has(cle) || !manque || !adresseComplete(adresse, cp, ville)) return;
    const t = setTimeout(() => {
      autoFait.current = true;
      dejaSuggerees.add(cle);
      void suggerer();
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adresse, cp, ville, manque]);

  useEffect(() => () => enCours.current?.abort(), []);

  const communes = d.cabinet.communes;
  const cles = new Set(communes.map(normaliserNom));
  const suggerees = reponse?.communes ?? [];
  const clesSuggerees = new Set(suggerees.map((c) => normaliserNom(c.nom)));
  const manuelles = communes.filter((c) => !clesSuggerees.has(normaliserNom(c)));
  const basculer = (nom: string) =>
    majCabinet({ communes: cles.has(normaliserNom(nom)) ? communes.filter((c) => normaliserNom(c) !== normaliserNom(nom)) : [...communes, nom] });
  const ajouter = () => {
    const nom = ajout.trim().replace(/\s+/g, ' ');
    if (nom && !cles.has(normaliserNom(nom))) majCabinet({ communes: [...communes, nom] });
    setAjout('');
  };

  const textes = (lignes: Ligne[]) => lignes.filter((l) => l.coche).map((l) => l.texte);
  const composeTransports = composerTexteAcces(textes(transports), LONGUEUR_ACCES.transports);
  const composeParking = composerTexteAcces(textes(stationnement), LONGUEUR_ACCES.parking);

  return (
    <section aria-labelledby={`${id}-titre`} className="grid gap-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
      <div className="grid gap-1">
        <h3 id={`${id}-titre`} className="font-semibold">
          Quartier, communes voisines et accès
        </h3>
        <p className="text-sm text-neutral-600">
          Proposés à partir de l’adresse du cabinet. Rien n’est imposé : cochez, corrigez ou complétez.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={bouton} onClick={() => void suggerer()} disabled={etat === 'chargement'}>
          {etat === 'chargement' ? 'Recherche en cours…' : 'Suggérer le quartier et les communes voisines'}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-neutral-600">
          {etat === 'chargement' ? 'Recherche autour de l’adresse (quelques secondes)…' : message}
        </p>
      </div>

      {(avecChamps || (reponse?.quartier?.options.length ?? 0) > 0) && (
        <div className="grid gap-2">
          {avecChamps && (
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Quartier (facultatif)</span>
              <input className={champ} value={d.cabinet.quartier} placeholder="Lyon 6e, Brotteaux" onChange={(e) => majCabinet({ quartier: e.target.value })} />
            </label>
          )}
          {reponse?.quartier && reponse.quartier.options.filter((o) => o !== d.cabinet.quartier).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-neutral-600">Quartier proposé :</span>
              {reponse.quartier.options
                .filter((o) => o !== d.cabinet.quartier)
                .map((o) => (
                  <button key={o} type="button" className={bouton} onClick={() => majCabinet({ quartier: o })}>
                    Utiliser « {o} »
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {(suggerees.length > 0 || manuelles.length > 0 || avecChamps) && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Communes voisines (référencement local)</legend>
          <div className="flex flex-wrap gap-2">
            {suggerees.map((c) => (
              <Puce key={c.insee ?? c.nom} coche={cles.has(normaliserNom(c.nom))} onChange={() => basculer(c.nom)}>
                <span className="font-medium">{c.nom}</span>
                <span className="text-xs text-neutral-600">
                  {formaterDistance(c.distanceKm)}
                  {c.population ? ` · ${formaterPopulation(c.population)}` : ''}
                </span>
              </Puce>
            ))}
            {manuelles.map((c) => (
              <Puce key={`m-${c}`} coche onChange={() => basculer(c)}>
                <span className="font-medium">{c}</span>
              </Puce>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor={`${id}-ajout`}>
              Ajouter une commune
            </label>
            <input
              id={`${id}-ajout`}
              className={`${champ} max-w-xs flex-1`}
              placeholder="Ajouter une commune"
              value={ajout}
              onChange={(e) => setAjout(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  ajouter();
                }
              }}
            />
            <button type="button" className={bouton} onClick={ajouter}>
              Ajouter
            </button>
          </div>
        </fieldset>
      )}

      {(transports.length > 0 || avecChamps) && (
        <GroupeAcces
          titre="Transports en commun"
          lignes={transports}
          setLignes={setTransports}
          compose={composeTransports}
          actuel={d.acces.transports}
          onUtiliser={() => majAcces({ transports: composeTransports })}
          avecChamp={avecChamps}
          onChamp={(v) => majAcces({ transports: v })}
          max={LONGUEUR_ACCES.transports}
        />
      )}
      {(stationnement.length > 0 || avecChamps) && (
        <GroupeAcces
          titre="Stationnement"
          lignes={stationnement}
          setLignes={setStationnement}
          compose={composeParking}
          actuel={d.acces.parking}
          onUtiliser={() => majAcces({ parking: composeParking })}
          avecChamp={avecChamps}
          onChamp={(v) => majAcces({ parking: v })}
          max={LONGUEUR_ACCES.parking}
        />
      )}

      <p className="text-xs text-neutral-500">
        Données ©{' '}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors
        </a>
        , geo.api.gouv.fr. Distances à vol d’oiseau, temps de marche estimés : à vérifier avant publication.
      </p>
    </section>
  );
}

function Puce({ coche, onChange, children }: { coche: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-700 ${
        coche ? 'border-teal-700 bg-teal-50' : 'border-neutral-300 bg-white'
      }`}
    >
      <input type="checkbox" className="size-4 accent-teal-800" checked={coche} onChange={onChange} />
      <span className="flex flex-wrap items-baseline gap-x-1.5">{children}</span>
    </label>
  );
}

function GroupeAcces({
  titre,
  lignes,
  setLignes,
  compose,
  actuel,
  onUtiliser,
  avecChamp,
  onChamp,
  max,
}: {
  titre: string;
  lignes: Ligne[];
  setLignes: (f: (l: Ligne[]) => Ligne[]) => void;
  compose: string;
  actuel: string;
  onUtiliser: () => void;
  avecChamp: boolean;
  onChamp: (v: string) => void;
  max: number;
}) {
  const id = useId();
  const maj = (i: number, patch: Partial<Ligne>) => setLignes((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const deja = compose !== '' && compose === actuel;
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{titre}</legend>
      {lignes.map((l, i) => (
        <div key={l.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            className={`size-5 shrink-0 accent-teal-800 ${focus}`}
            checked={l.coche}
            aria-label={`Retenir : ${l.texte}`}
            onChange={(e) => maj(i, { coche: e.target.checked })}
          />
          <input className={champ} value={l.texte} aria-label={`${titre} : proposition ${i + 1}`} onChange={(e) => maj(i, { texte: e.target.value })} />
        </div>
      ))}
      {lignes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={bouton} disabled={!compose || deja} onClick={onUtiliser}>
            {deja ? 'Texte repris' : actuel.trim() ? `Remplacer le texte « ${titre} »` : `Reprendre dans « ${titre} »`}
          </button>
          {!avecChamp && actuel.trim() && !deja && <span className="text-xs text-neutral-500">Texte actuel : {actuel}</span>}
        </div>
      )}
      {avecChamp && (
        <label className="grid gap-1.5 text-sm" htmlFor={`${id}-champ`}>
          <span className="text-neutral-600">Texte affiché sur le site</span>
          <input id={`${id}-champ`} className={champ} maxLength={max} value={actuel} onChange={(e) => onChamp(e.target.value)} />
        </label>
      )}
    </fieldset>
  );
}
